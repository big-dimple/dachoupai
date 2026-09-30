import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import {runSteps} from './check-runner.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2);
const scope=args.length?args[0].replace(/^--scope=/,''):'all';
if(args.length>1||(args.length&&!args[0].startsWith('--scope='))||!['all','domain','browser','docs'].includes(scope))throw Error('usage: npm run verify:ci -- [--scope=all|domain|browser|docs]');
const npmCli=process.env.npm_execpath;if(!npmCli)throw Error('run via npm run verify:ci');
const npm=name=>({name,command:process.execPath,args:[npmCli,'run',name],...(name==='test:e2e'?{env:{E2E_BROWSERS:'chromium,firefox,webkit',E2E_SCENARIO:'all'}}:{})});
const node=(name,...args)=>({name,command:process.execPath,args});
const gates={
  domain:[npm('typecheck'),npm('test'),npm('verify:content'),node('rules-goldens','harness/rules-goldens.mjs','shots/ci/rules')],
  browser:[npm('build'),npm('verify:smoke'),npm('test:domain:browser'),npm('test:layout:browser'),npm('test:recovery:browser'),npm('test:e2e'),npm('test:gate-faults')],
  docs:[node('plan-counterexamples','scripts/check-production-plan.mjs','--self-test'),node('production-plan','scripts/check-production-plan.mjs')],
};
const selected=scope==='all'?Object.values(gates).flat():gates[scope],result=runSteps(root,selected);
const report={scope,testedCommit:result.before.head,...result,notIncluded:[{name:'verify:assets',status:'NOT_INCLUDED',reason:'A00 not yet adopted; no placeholder gate'},{name:'balance/benchmark acceptance',status:'NOT_INCLUDED',reason:'later work packages; legacy r1 seeds are regressions only'},{name:'physical devices / human / art approval',status:'NOT_RUN'}]};
fs.mkdirSync(path.join(root,'shots/ci'),{recursive:true});fs.writeFileSync(path.join(root,`shots/ci/${scope}.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));process.exitCode=result.exitCode;
