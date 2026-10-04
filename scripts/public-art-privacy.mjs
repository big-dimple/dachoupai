import {lstat,readdir,readFile} from 'node:fs/promises';
import path from 'node:path';

// Actual identifiers need a payload; bare policy words and schemaVersion are safe.
const idPattern=/\b(?:libfile[_-][a-z0-9][a-z0-9_-]{15,}|file_[a-f0-9]{16,}|file-[a-z0-9]{16,})\b/gi;
const privateUrlPattern=/https?:\/\/(?:chatgpt\.com|chat\.openai\.com)\/(?:c|local)\/[^\s"'<>`]+/gi;
const urlPattern=/https?:\/\/[^\s"'<>`]+/gi;
const privatePathPattern=/(?<![\w.])\/(?:mnt\/data|home\/[^/\s"'<>`]+|Users\/[^/\s"'<>`]+|root|tmp|private\/var|workspace|workspaces)\/[^\s"'<>`]+|\b[a-z]:[\\/]+(?:Users|Documents and Settings|Temp)[\\/]+[^\r\n"'<>`]+/gi;
const identityNames=['sourceLibraryId','source_library_id','library_id','library_file_id','libraryFileId','backing_file_id','backingFileId','file_id','sourceFileId','libraryVersion','library_version','libraryVersionId','library_file_version','fileVersion','user.library-file-id'];
const identitySet=new Set(identityNames.map(name=>name.replace(/[^a-z0-9]/gi,'').toLowerCase()));
const identityAssignment=new RegExp(String.raw`(?<![\w])["']?(?:${identityNames.map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})["']?\s*[:=]\s*(?:["'][^"'\r\n]+["']|\d+|null|true|false)`, 'gi');
const metadataName=name=>/^(?:README(?:[.-][\w-]+)?\.md|manifest\.json|verify(?:[.-][\w-]+)?\.(?:mjs|js))$/i.test(name);
const count=(text,pattern)=>[...text.matchAll(pattern)].length;
const normalized=text=>text.replace(/&amp;/g,'&');
function decodedUrl(value){try{return decodeURIComponent(value);}catch{return value;}}
function identityFields(value){
  if(!value||typeof value!=='object')return 0;
  let total=0;
  for(const [key,child] of Object.entries(value)){
    if(identitySet.has(key.replace(/[^a-z0-9]/gi,'').toLowerCase()))total++;
    total+=identityFields(child);
  }
  if(value.name==='user.library-file-id'&&Object.hasOwn(value,'value'))total++;
  return total;
}
/** Pure inspection returns counts only: never retain offending values. */
export function inspectPublicArtText(text,json=false){
  const counts={};let data,source=normalized(text);
  if(json){try{data=JSON.parse(text);source=normalized(JSON.stringify(data));}catch{return {'invalid-json':1};}}
  const add=(kind,total)=>{if(total)counts[kind]=total;};
  add('private-file-identity',count(source,idPattern));
  add('library-identity-field',json?identityFields(data):count(source,identityAssignment));
  const urls=[...source.matchAll(urlPattern)].map(match=>decodedUrl(match[0]));
  add('private-chat-link',urls.reduce((total,url)=>total+count(url,privateUrlPattern),0));
  add('signed-download-url',urls.filter(value=>{
    try{return [...new URL(value).searchParams].some(([key,value])=>value&&/^(?:x-amz-(?:signature|credential|security-token)|x-goog-(?:signature|credential)|signature|sig|token|key-pair-id|awsaccesskeyid|googleaccessid)$/i.test(key));}catch{return false;}
  }).length);
  // URL paths are not local workspace paths (e.g. a public GitHub tree named workspace).
  add('private-workspace-path',count(source.replace(urlPattern,''),privatePathPattern));
  return counts;
}
function safeName(value){return value.replace(idPattern,'[private-id]');}
/** No values or raw exception messages reach CI, including on malformed JSON. */
export function formatPublicArtPrivacy(report){
  return JSON.stringify({check:'public-art-privacy',status:report.issues.length?'FAIL':'PASS',filesScanned:report.filesScanned,issues:report.issues.map(issue=>({file:safeName(issue.file),type:issue.type,count:issue.count}))});
}
/** Bounded current-tree reader. No .git/history/home traversal or binary inspection. */
export async function auditPublicArtPrivacy(root){
  const issues=[],files=[];
  const issue=(file,type)=>issues.push({file,type,count:1});
  async function stat(relative,optional=false){
    // Check every ancestor before readdir/readFile; never follow a symlink outside scope.
    const parts=relative.split('/');let current='';let result;
    for(const part of parts){current=current?current+'/'+part:part;
      try{result=await lstat(path.join(root,current));}catch(error){if(optional&&error.code==='ENOENT')return;issue(relative,'unreadable-path');return;}
      if(result.isSymbolicLink()){issue(relative,'unsafe-symlink');return;}
    }
    return result;
  }
  async function walk(relative){
    let entries;try{entries=await readdir(path.join(root,relative),{withFileTypes:true});}catch{issue(relative,'unreadable-path');return;}
    for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){const child=relative+'/'+entry.name;
      if(entry.isSymbolicLink()){issue(child,'unsafe-symlink');continue;}
      if(entry.isDirectory())await walk(child);
      else if(entry.isFile()&&metadataName(entry.name))files.push(child);
    }
  }
  const sources='art/sources',sourceStat=await stat(sources,true);
  if(sourceStat?.isDirectory()){
    let entries;try{entries=await readdir(path.join(root,sources),{withFileTypes:true});}catch{issue(sources,'unreadable-path');entries=[];}
    for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
      if(!entry.name.startsWith('handdrawn-runtime-'))continue;
      const relative=sources+'/'+entry.name;if(entry.isSymbolicLink())issue(relative,'unsafe-symlink');else if(entry.isDirectory())await walk(relative);
    }
  }
  const runtime='public/assets/handdrawn-p08/manifest.json';
  if((await stat(runtime))?.isFile())files.push(runtime);
  for(const file of files){
    try{const counts=inspectPublicArtText(await readFile(path.join(root,file),'utf8'),file.endsWith('.json'));for(const [type,count] of Object.entries(counts))issues.push({file,type,count});}
    catch{issue(file,'unreadable-file');}
  }
  return {filesScanned:files.length,issues};
}
