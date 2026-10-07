import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const root=process.cwd(),text=p=>fs.readFileSync(path.join(root,p),'utf8');
const runner=()=>import(pathToFileURL(path.join(root,'scripts/check-runner.mjs')).href);
async function fixture(run){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dachoupai-checks-'));
  try{
    execFileSync('git',['init','-q','-b','fixture'],{cwd:dir});fs.writeFileSync(path.join(dir,'source.txt'),'original');execFileSync('git',['add','source.txt'],{cwd:dir});
    await run(dir);
  }finally{
    const absolute=path.resolve(dir),parent=path.resolve(os.tmpdir());
    if(path.dirname(absolute)!==parent||!path.basename(absolute).startsWith('dachoupai-checks-'))throw Error('unsafe fixture cleanup');
    fs.rmSync(absolute,{recursive:true,force:true});
  }
}
const step=(name,code)=>({name,command:process.execPath,args:['-e',code]});

describe('executable CI and read-only gates',()=>{
  it('has real E2E and CI entry points, rather than placeholder success',()=>{
    const p=JSON.parse(text('package.json'));
    for(const script of ['test:e2e','verify:ci']){expect(p.scripts[script]).toBeTruthy();expect(p.scripts[script]).not.toMatch(/echo|exit 0/);}
    for(const file of ['harness/e2e.mjs','scripts/verify-ci.mjs'])expect(fs.existsSync(path.join(root,file))).toBe(true);
  });
  it('CI uses locked packages and verified preinstalled engines, runs gates and retains failed browser artifacts',()=>{
    const workflow=text('.github/workflows/ci.yml');
    expect(workflow).toMatch(/npm ci/);expect(workflow).not.toMatch(/npm install\s*$/m);
    const browser=workflow.split('  browser:\n')[1]?.split('  docs:\n')[0];expect(browser).toBeTruthy();
    const version=JSON.parse(text('package-lock.json')).packages['node_modules/playwright'].version;
    expect(browser).toContain('image: mcr.microsoft.com/playwright:v'+version+'-noble@sha256:');
    expect(browser).toMatch(/-noble@sha256:[a-f0-9]{64}/);
    expect(browser).toContain('options: --user 1001 --ipc=host');
    expect(browser).toContain("if (version !== '"+version+"') throw new Error");
    expect(browser).toContain('for (const browser of [chromium, firefox, webkit])');
    expect(browser).toContain('fs.accessSync(executable, fs.constants.X_OK)');
    expect(browser).toContain('npm run verify:ci -- --scope=browser');
    expect(browser).toContain('SMOKE_BROWSERS: chromium,firefox,webkit');
    expect(browser).not.toMatch(/continue-on-error:\s*true|playwright install --with-deps|SHOT_PROFILES:/);
    expect(workflow).toMatch(/verify:ci/);expect(workflow).toMatch(/upload-artifact/);expect(workflow).toMatch(/always\(\)/);
  });
  it('release checking cannot automatically commit or push any branch',()=>{
    const script=text('scripts/release-checked.mjs');
    expect(script).not.toMatch(/git\(['"](?:commit|push)['"]/);expect(script).toMatch(/verify:ci/);
  });
  it('an ordinary successful child keeps source and index unchanged',async()=>{
    const {runSteps,snapshotSource}=await runner();
    await fixture(async dir=>{const before=snapshotSource(dir),result=runSteps(dir,[step('read','require("node:fs").readFileSync("source.txt")')]);expect(result.status).toBe('PASS');expect(result.exitCode).toBe(0);expect(snapshotSource(dir)).toEqual(before);});
  },20000);
  it('a zero-exit checker which writes source is rejected without hiding its write',async()=>{
    const {runSteps}=await runner();
    await fixture(async dir=>{const result=runSteps(dir,[step('write','require("node:fs").writeFileSync("source.txt","changed")')]);expect(result.status).toBe('FAIL');expect(result.exitCode).not.toBe(0);expect(result.steps[0].reason).toMatch(/source|index/);expect(fs.readFileSync(path.join(dir,'source.txt'),'utf8')).toBe('changed');});
  },20000);
  it('a failing child stops the gate and cannot run a later false-success step',async()=>{
    const {runSteps}=await runner();
    await fixture(async dir=>{const result=runSteps(dir,[step('fail','process.exit(9)'),step('must-not-run','require("node:fs").writeFileSync("source.txt","bad")')]);expect(result.status).toBe('FAIL');expect(result.exitCode).not.toBe(0);expect(result.steps).toHaveLength(1);expect(result.steps[0].childExitCode).toBe(9);expect(fs.readFileSync(path.join(dir,'source.txt'),'utf8')).toBe('original');});
  },20000);
  it('a zero-exit checker which changes only the index is also rejected',async()=>{
    const {runSteps}=await runner();
    await fixture(async dir=>{const result=runSteps(dir,[step('index-write','require("node:child_process").execFileSync("git",["rm","--cached","source.txt"])')]);expect(result.status).toBe('FAIL');expect(result.exitCode).not.toBe(0);expect(result.steps[0].reason).toMatch(/index/);expect(fs.readFileSync(path.join(dir,'source.txt'),'utf8')).toBe('original');});
  },20000);
});
