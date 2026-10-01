import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {runSteps} from './check-runner.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2);
const scope=args.length?args[0].replace(/^--scope=/,''):'all';
if(args.length>1||(args.length&&!args[0].startsWith('--scope='))||!['all','domain','browser','docs'].includes(scope))throw Error('usage: npm run verify:ci -- [--scope=all|domain|browser|docs]');
const npmCli=process.env.npm_execpath;if(!npmCli)throw Error('run via npm run verify:ci');
const npm=name=>({name,command:process.execPath,args:[npmCli,'run',name]});
const node=(name,...args)=>({name,command:process.execPath,args});
const gates={
  domain:[npm('test'),npm('verify:content')],
  browser:[npm('build'),npm('verify:smoke')],
  docs:[node('production-plan','scripts/check-production-plan.mjs')],
};
const selected=scope==='all'?Object.values(gates).flat():gates[scope],result=runSteps(root,selected);
const report={scope,testedCommit:result.before.head,...result,notIncluded:[{name:'extended browser/recovery/fault/asset/simulation diagnostics',status:'NOT_INCLUDED',reason:'run the existing specific command only when its domain changes; P00 removes repeated default execution'},{name:'balance/benchmark acceptance',status:'NOT_INCLUDED',reason:'later work packages; no gameplay approval inferred from checks'},{name:'physical devices / human / art approval',status:'NOT_RUN'}]};
fs.mkdirSync(path.join(root,'shots/ci'),{recursive:true});fs.writeFileSync(path.join(root,`shots/ci/${scope}.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));process.exitCode=result.exitCode;
