import {build} from 'esbuild';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const destination='docs/production/evidence/core-build-preparation-2026-10-14/window.json';
const args=process.argv.slice(2);if(args.length!==1||!['--write','--check'].includes(args[0]))throw Error('usage: node analysis/core-build-window.mjs --write|--check');
const baseSha='f651a04e',runtimeSha='06ef9d5a33bb04444802aa20ff3a726489455aa1',tree=execFileSync('git',['rev-parse','HEAD:src'],{encoding:'utf8'}).trim();
if(tree!==execFileSync('git',['rev-parse',runtimeSha+':src'],{encoding:'utf8'}).trim()||execFileSync('git',['status','--porcelain','--','src'],{encoding:'utf8'}).trim())throw Error('runtime differs from explicit core-build product source');
const folder=await mkdtemp(join(tmpdir(),'dachoupai-core-window-'));
try{
 const result=await build({entryPoints:['analysis/core-build-window.ts'],bundle:true,platform:'node',format:'esm',write:false});
 const module=join(folder,'window.mjs');await writeFile(module,result.outputFiles[0].contents);
 const {naturalWindow,naturalFile,coreBuildCounterfactual}=await import(pathToFileURL(module).href),window=naturalWindow(),report=window.report,core=coreBuildCounterfactual(window);
 const proposedTargets=[9,10,13,20,30].map(chapter=>{
  const n=20475n*27n**BigInt(chapter-8),d=20n**BigInt(chapter-8);
  return {chapter,targets:[1n,3n,2n].map((m,i)=>{const denominator=d*(i===1?2n:1n);return ((n*m+denominator-1n)/denominator).toString();})};
 });
 if(JSON.stringify(core.targets)!==JSON.stringify(proposedTargets))throw Error('independent-core-target-mismatch');
 const output={baseSha,runtimeSha,runtimeTree:tree,inputSha256:createHash('sha256').update(await readFile(naturalFile)).digest('hex'),evidenceClass:'exact natural replay; transactions on cloned C10 shelf; frozen C9 B12 hand comparisons are counterfactual, not C10 deal predictions or win rates',...report,coreBuild:core};
 const json=JSON.stringify(output,null,2)+'\n';
 if(args[0]==='--write')await writeFile(destination,json);
 else if(json!==await readFile(destination,'utf8'))throw Error('report drift');
 console.log(args[0]==='--write'?'Window report written':'Exact window reproduction PASS');
}finally{await rm(folder,{recursive:true,force:true});}
