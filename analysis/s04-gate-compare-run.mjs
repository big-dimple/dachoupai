import {build} from 'esbuild';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';

const baseSha='94f8f74d17d1d4acdbd990980187b2404104fc01';
const destination='docs/production/evidence/s04-window-2026-10-15/gate-comparison.json.gz';
const args=process.argv.slice(2);
if(args.length!==1||!['--write','--check'].includes(args[0]))throw Error('usage: node analysis/s04-gate-compare-run.mjs --write|--check');
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim(),sha=b=>createHash('sha256').update(b).digest('hex');
const runtimeTree=git('rev-parse','HEAD:src');
if(runtimeTree!==git('rev-parse',baseSha+':src')||git('status','--porcelain','--','src'))throw Error('runtime differs from explicit S04 comparison baseline');
const folder=await mkdtemp(join(tmpdir(),'s04-gates-'));
try {
 const cases=[],patches=[];
 for(const gate of [50,60]){
  // Ephemeral analysis build only. Use the actual generation/payment/RNG order;
  // the only domain differences are the explicitly recorded candidate gates.
  const changes={
   'r2Shop.ts':{from:"case 'set-deck-suit':return live.length>0&&",to:`case 'set-deck-suit':return state.chapter>=3&&['hearts','diamonds','clubs','spades'].some(suit=>{const n=live.filter(c=>c.suit===suit).length;return n<live.length&&100*n>=${gate}*live.length;})&&live.length>0&&`},
   'r2SpectralTools.ts':{from:"if(living.every(card=>card.suit===action.suit))return 'no-effect';",to:`if(state.chapter<3||100*living.filter(card=>card.suit===action.suit).length<${gate}*living.length)return 's04-candidate-gate';\n      if(living.every(card=>card.suit===action.suit))return 'no-effect';`},
  };
  const seen=new Set();
  const result=await build({entryPoints:['analysis/s04-gate-compare.ts'],bundle:true,platform:'node',format:'esm',write:false,
   plugins:[{name:'offline-s04-gate-only',setup(b){b.onLoad({filter:/[/\\](r2Shop|r2SpectralTools)\.ts$/},async({path})=>{
    const name=path.split(/[/\\]/).at(-1),source=await readFile(path,'utf8'),change=changes[name];
    if(source.split(change.from).length!==2)throw Error('gate patch source drift: '+name);
    const contents=source.replace(change.from,change.to);seen.add(name);
    patches.push({gate,path:'src/domain/'+name,originalSha256:sha(source),shadowSha256:sha(contents),...change});
    return {contents,loader:'ts'};
   });}}]});
  if(seen.size!==2)throw Error('missing shadow patch');
  const module=join(folder,`gate-${gate}.mjs`);await writeFile(module,result.outputFiles[0].contents);
  const {makeGateReport}=await import(pathToFileURL(module).href);cases.push(makeGateReport(gate));
 }
 patches.sort((a,b)=>a.gate-b.gate||a.path.localeCompare(b.path));
 const analysisFiles=['analysis/s04-gate-compare-run.mjs','analysis/s04-gate-compare.ts','analysis/s04-window.ts'];
 const analysisHash=sha(Buffer.concat(await Promise.all(analysisFiles.map(f=>readFile(f)))));
 const report={baseSha,runtimeTree,analysisHash,analysisFiles,patches,cases};
 const json=JSON.stringify(report,null,2)+'\n';
 if(args[0]==='--write')await writeFile(destination,gzipSync(json));
 else if(json!==gunzipSync(await readFile(destination)).toString('utf8'))throw Error('comparison report drift');
 if(git('rev-parse','HEAD:src')!==runtimeTree||git('status','--porcelain','--','src'))throw Error('runtime changed during comparison');
 console.log(args[0]==='--write'?'S04 gate comparison written':'Exact S04 gate comparison reproduction PASS');
}finally{await rm(folder,{recursive:true,force:true});}
