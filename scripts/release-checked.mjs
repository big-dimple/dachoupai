#!/usr/bin/env node
/** Read-only candidate checks. Publishing and merging require the normal PR review. */
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {runSteps} from './check-runner.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2);
if(args.length>1||(args.length&&args[0]!=='--plan'))throw Error('usage: npm run release:checked -- [--plan]; this command never commits, pushes or merges');
if(args[0]==='--plan')console.log(JSON.stringify({status:'NOT_RUN',command:'npm run verify:ci',publishing:'PR review required; no Git mutation performed'},null,2));
else{
  const npmCli=process.env.npm_execpath;if(!npmCli)throw Error('run via npm run release:checked');
  const result=runSteps(root,[{name:'verify:ci',command:process.execPath,args:[npmCli,'run','verify:ci']}]);
  console.log(JSON.stringify(result,null,2));process.exitCode=result.exitCode;
}
