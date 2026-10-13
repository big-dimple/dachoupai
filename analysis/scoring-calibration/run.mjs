import {build} from 'esbuild';
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root=fileURLToPath(new URL('../../',import.meta.url));
const args=process.argv.slice(2);
if(args.length>2||args.length===1||args.length===2&&!['--write','--check'].includes(args[0]))throw Error('usage: node analysis/scoring-calibration/run.mjs [--write|--check report.json]');
const dir=await mkdtemp(join(tmpdir(),'dachoupai-calibration-'));
try {
  const output=await build({entryPoints:[resolve(root,'analysis/scoring-calibration/report.ts')],bundle:true,platform:'node',format:'esm',write:false});
  const module=join(dir,'report.mjs');await writeFile(module,output.outputFiles[0].contents);
  const {makeReport}=await import(pathToFileURL(module).href);
  const report=makeReport();
  const runtimeTree=execFileSync('git',['rev-parse','HEAD:src'],{cwd:root,encoding:'utf8'}).trim();
  const baselineTree=execFileSync('git',['rev-parse',report.baseSha+':src'],{cwd:root,encoding:'utf8'}).trim();
  if(runtimeTree!==baselineTree||execFileSync('git',['status','--porcelain','--','src'],{cwd:root,encoding:'utf8'}).trim())throw Error('runtime differs from frozen baseline; recalibrate with a new explicit base SHA');
  // Hash all runtime inputs and analysis code, not the generated output or this eventual commit SHA.
  report.provenance={runtimeTree,
    analysisHash:createHash('sha256').update(await readFile(resolve(root,'analysis/scoring-calibration/model.ts'))).update(await readFile(resolve(root,'analysis/scoring-calibration/report.ts'))).digest('hex')};
  const json=JSON.stringify(report,null,2)+'\n';
  if(args[0]==='--write')await writeFile(resolve(args[1]),json);
  else if(args[0]==='--check'){if(await readFile(resolve(args[1]),'utf8')!==json)throw Error('report-drift');console.log('Exact report reproduction PASS');}
  else process.stdout.write(json);
} finally {await rm(dir,{recursive:true,force:true});}
