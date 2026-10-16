import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {makeReport} from './model.mjs';
const root=new URL('../../',import.meta.url);
const here=new URL('./',import.meta.url);
const args=process.argv.slice(2);
if(args.length!==1||!['--check','--write','--stdout'].includes(args[0]))throw Error('usage: node analysis/endless-shadow/run.mjs --check|--write|--stdout');
const inputs=JSON.parse(await readFile(new URL('inputs.json',here),'utf8'));
for(const [path,expected] of Object.entries(inputs.kernelBlobs)){
  const bytes=await readFile(new URL(path,root));
  const actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(actual!==expected)throw Error('frozen kernel changed: '+path+'; use a new explicit baseline');
}
const output=JSON.stringify(makeReport(inputs),null,2)+'\n';
const reportPath=new URL('report.json',here);
if(args[0]==='--write')await writeFile(reportPath,output);
else if(args[0]==='--check'){
  if(await readFile(reportPath,'utf8')!==output)throw Error('report-drift');
  process.stdout.write('EXACT_SHADOW_REPORT_PASS '+inputs.baseSha+'\n');
}else process.stdout.write(output);
