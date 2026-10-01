/** Prove the real browser gate rejects semantic faults in an isolated, owned checkout. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {snapshotSource} from '../scripts/check-runner.mjs';

const root=process.cwd(),before=snapshotSource(root),output=path.join(root,'shots/gate-faults');fs.mkdirSync(output,{recursive:true});
assert.equal(execFileSync('git',['status','--porcelain=v1'],{cwd:root,encoding:'utf8'}).trim(),'','fault proof requires a committed, clean candidate');
const owned=fs.mkdtempSync(path.join(os.tmpdir(),'dachoupai-gate-faults-')),fixture=path.join(owned,'candidate'),modules=path.join(fixture,'node_modules');
const report={testedCommit:before.head,environment:{node:process.version,os:process.platform},checks:[],limitations:['Chromium focused counterexamples, not a second full cross-browser acceptance.','Mutation and restoration occur only in an isolated local clone; the shared source is checked unchanged.']};
const cases=[
  {name:'reward',file:'src/domain/r2Run.ts',from:'const reward=[4,5,7]',to:'const reward=1+[4,5,7]',scenario:'workflow-amo',error:/independent contractual reward/},
  {name:'touch',file:'src/game/SceneView.ts',from:'const canvas=this.scene.game.canvas.getBoundingClientRect();',to:'if(p.wasTouch)return;const canvas=this.scene.game.canvas.getBoundingClientRect();',scenario:'touch-entry'},
  {name:'assets',file:'src/game/portraits.ts',from:'${import.meta.env.BASE_URL}assets/p00/characters/',to:'${import.meta.env.BASE_URL}missing-assets/characters/',scenario:'production-observer-hidden'},
];
function run(test,phase){
  const dir=path.join(output,test.name,phase);fs.mkdirSync(dir,{recursive:true});const log=fs.openSync(path.join(dir,'command.txt'),'w');
  let result;
  try{result=spawnSync(process.execPath,['harness/e2e.mjs'],{cwd:fixture,env:{...process.env,E2E_BROWSERS:'chromium',E2E_SCENARIO:test.name,E2E_EVIDENCE_DIR:dir},stdio:['ignore',log,log],windowsHide:true});}
  finally{fs.closeSync(log);}
  assert.equal(result.signal,null,'child must return a real exit status');assert.equal(result.error,undefined);
  const observed=JSON.parse(fs.readFileSync(path.join(dir,'e2e.json'),'utf8'));
  if(phase==='broken'){
    assert.notEqual(result.status,0,`${test.name}: intentional fault must fail`);assert.equal(observed.status,'FAIL');
    const failure=observed.checks.find(c=>c.status==='FAIL');assert.equal(failure?.name,test.scenario,'fault must be caught by its actual semantic browser check, not a build error');
    if(test.error)assert.match(failure.error,test.error);
  }else{assert.equal(result.status,0,`${test.name}: restored gate must pass; see ${dir}`);assert.equal(observed.status,'PASS');}
  return {status:observed.status,exitCode:result.status,evidence:path.relative(root,path.join(dir,'e2e.json')).replaceAll('\\','/')};
}
try{
  execFileSync('git',['clone','--quiet','--shared','--no-hardlinks',root,fixture],{stdio:'inherit'});
  assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:fixture,encoding:'utf8'}).trim(),before.head);
  fs.symlinkSync(path.join(root,'node_modules'),modules,process.platform==='win32'?'junction':'dir');
  for(const test of cases){
    const file=path.join(fixture,test.file),original=fs.readFileSync(file),text=original.toString('utf8');assert.equal(text.split(test.from).length,2,'unique mutation anchor');
    fs.writeFileSync(file,text.replace(test.from,test.to));console.log(`${test.name}: running intentionally broken gate`);const broken=run(test,'broken');
    fs.writeFileSync(file,original);assert.deepEqual(fs.readFileSync(file),original);console.log(`${test.name}: running restored gate`);const restored=run(test,'restored');
    report.checks.push({name:test.name,status:'PASS',file:test.file,mutation:{from:test.from,to:test.to},broken,restored});
  }
  assert.deepEqual(snapshotSource(root),before,'original source and index remain unchanged');report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);console.error(error);process.exitCode=1;}
finally{
  report.sourceBefore=before;report.sourceAfter=snapshotSource(root);fs.writeFileSync(path.join(output,'faults.json'),JSON.stringify(report,null,2)+'\n');
  // Unlink the dependency junction first, never traverse the shared node_modules.
  if(fs.existsSync(modules))fs.unlinkSync(modules);
  const absolute=path.resolve(owned);assert.equal(path.dirname(absolute),path.resolve(os.tmpdir()));assert.ok(path.basename(absolute).startsWith('dachoupai-gate-faults-'));fs.rmSync(absolute,{recursive:true,force:true});
}
