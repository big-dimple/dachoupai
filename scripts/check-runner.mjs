/** Execute real checks without allowing them to change source, the index or HEAD. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function git(root,args,optional=false){
  const result=spawnSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true});
  if(result.status!==0&&!optional)throw Error(`git ${args.join(' ')}: ${result.stderr||result.error}`);
  return result.status===0?result.stdout:null;
}
export function snapshotSource(root){
  const names=[...new Set(git(root,['ls-files','-z','--cached','--others','--exclude-standard']).split('\0').filter(Boolean))].sort();
  const files=names.map(name=>{
    const file=path.join(root,name);
    try{const stat=fs.lstatSync(file),bytes=stat.isSymbolicLink()?Buffer.from(fs.readlinkSync(file)):fs.readFileSync(file);return {name,kind:stat.isSymbolicLink()?'link':'file',mode:stat.mode,mtimeMs:stat.mtimeMs,bytes:bytes.length,sha256:hash(bytes)};}
    catch(error){if(error.code==='ENOENT')return {name,missing:true};throw error;}
  });
  return {source:hash(JSON.stringify(files)),index:hash(git(root,['ls-files','--stage','-z'])),head:git(root,['rev-parse','--verify','HEAD'],true)?.trim()??null,branch:git(root,['symbolic-ref','--quiet','HEAD'],true)?.trim()??null};
}
export function runSteps(root,steps){
  const before=snapshotSource(root),results=[];
  for(const step of steps){
    console.log(`CHECK ${step.name}: ${step.command} ${(step.args??[]).join(' ')}`);
    const started=Date.now(),child=spawnSync(step.command,step.args??[],{cwd:root,env:{...process.env,...step.env},stdio:'inherit',windowsHide:true});
    const after=snapshotSource(root),changed=Object.keys(before).filter(key=>before[key]!==after[key]);
    const childExitCode=child.status??1,reason=changed.length?`checker changed ${changed.join(', ')}; changes retained for inspection`:child.error?String(child.error):child.signal?`terminated by ${child.signal}`:childExitCode?`child exited ${childExitCode}`:null;
    const result={name:step.name,status:reason?'FAIL':'PASS',childExitCode,elapsedMs:Date.now()-started,...(reason?{reason}:{})};results.push(result);
    console.log(`${step.name}: ${result.status}`);
    if(reason)return {status:'FAIL',exitCode:childExitCode||1,before,after,steps:results};
  }
  return {status:'PASS',exitCode:0,before,after:snapshotSource(root),steps:results};
}
