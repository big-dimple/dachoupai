import {build} from 'esbuild';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';

const baseSha='4d2ff4ca8487f2f00b55516822d1a28ac3c1751f';
const destination='docs/production/evidence/s04-window-2026-10-15/results.json.gz';
const args=process.argv.slice(2);
if(args.length!==1||!['--write','--check'].includes(args[0]))throw Error('usage: node analysis/s04-window-run.mjs --write|--check');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const runtimeTree=git('rev-parse','HEAD:src');
if(runtimeTree!==git('rev-parse',baseSha+':src')||git('status','--porcelain','--','src'))throw Error('runtime differs from explicit S04 baseline');
const folder=await mkdtemp(join(tmpdir(),'dachoupai-s04-'));
try{
 const result=await build({entryPoints:['analysis/s04-window.ts'],bundle:true,platform:'node',format:'esm',write:false});
 const module=join(folder,'window.mjs');await writeFile(module,result.outputFiles[0].contents);
 const {makeReport}=await import(pathToFileURL(module).href);
 const report={baseSha,runtimeTree,analysisHash:createHash('sha256').update(await readFile('analysis/s04-window.ts')).update(await readFile('analysis/s04-window-run.mjs')).digest('hex'),...makeReport()};
 const json=JSON.stringify(report,null,2)+'\n';
 if(args[0]==='--write')await writeFile(destination,gzipSync(json));
 else if(json!==gunzipSync(await readFile(destination)).toString('utf8'))throw Error('report drift');
 console.log(args[0]==='--write'?'S04 controlled report written':'Exact S04 report reproduction PASS');
}finally{await rm(folder,{recursive:true,force:true});}
