import {it,expect} from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {auditPublicArtPrivacy,inspectPublicArtText,formatPublicArtPrivacy} from '../scripts/public-art-privacy.mjs';

const root=process.cwd(),libraryId='libfile_'+'a'.repeat(32),backingId='file_'+'b'.repeat(32);
const chat='https://chatgpt.com/c/'+'00000000-0000-4000-8000-000000000000';
async function fixture(run){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'dachoupai-public-art-privacy-'));
  const put=async(file,text)=>{await fs.mkdir(path.dirname(path.join(dir,file)),{recursive:true});await fs.writeFile(path.join(dir,file),text);};
  try{await put('public/assets/handdrawn-p08/manifest.json','{"schemaVersion":1}');await run(dir,put);}
  finally{await fs.rm(dir,{recursive:true,force:true});}
}
it('current scoped public receipts/verifiers pass, including explanatory mentions',async()=>{
  const report=await auditPublicArtPrivacy(root);expect(report.filesScanned).toBeGreaterThan(0);expect(report.issues).toEqual([]);
});
it('allows public delivery commits, source basenames/dimensions/hashes/schema and bare prohibited-field mentions',()=>{
  const data={schemaVersion:1,sourceFilename:'fixture-v1-original.png',sourceWidth:1122,sourceSHA256:'1'.repeat(64),deliveryCommitURL:'https://github.com/example/fixture/commit/'+'2'.repeat(40),policy:'Do not publish sourceLibraryId, library_file_id, libfile_ or file_ identity fields.'};
  expect(inspectPublicArtText(JSON.stringify(data),true)).toEqual({});
  expect(inspectPublicArtText('const blocked=["sourceLibraryId","library_file_id"]; const schemaVersion=1;')).toEqual({});
  expect(inspectPublicArtText('https://github.com/example/fixture/tree/main/workspace/public-file')).toEqual({});
});
it.each([
  {type:'private-file-identity',text:libraryId},
  {type:'private-file-identity',text:backingId},
  {type:'private-file-identity',text:'file-'+'SYNTHETIC'.repeat(3)},
  {type:'private-chat-link',text:chat},
  {type:'private-chat-link',text:'https://chatgpt.com/local/synthetic-reference'},
  {type:'signed-download-url',text:'https://example.invalid/asset?X-Amz-Signature=synthetic-only&X-Amz-Credential=fixture'},
  {type:'signed-download-url',text:'https://example.invalid/asset?sig=synthetic-only'},
  {type:'signed-download-url',text:'https://example.invalid/asset?X%2DAmz%2DSignature=synthetic-only'},
  {type:'private-workspace-path',text:'/workspace/private-fixture/input.png'},
  {type:'private-workspace-path',text:'/mnt/data/synthetic-input.png'},
  {type:'private-workspace-path',text:'C:\\Users\\Synthetic\\input.png'},
])('rejects synthetic $type and emits counts without the input',({type,text})=>{
  const counts=inspectPublicArtText(text);expect(counts[type]).toBeGreaterThan(0);
  const output=formatPublicArtPrivacy({filesScanned:1,issues:Object.entries(counts).map(([type,count])=>({file:'art/sources/handdrawn-runtime-fixture/README.md',type,count}))});
  expect(output.includes(text)).toBe(false);expect(JSON.parse(output).issues.every(issue=>Object.keys(issue).sort().join(',')==='count,file,type')).toBe(true);
});
it('rejects actual structured Library identity/version fields, including escaped keys, without banning descriptions',()=>{
  for(const key of ['sourceLibraryId','library_file_id','backingFileId','libraryVersion','user.library-file-id'])expect(inspectPublicArtText(JSON.stringify({[key]:0}),true)['library-identity-field']).toBe(1);
  expect(inspectPublicArtText('{"source\\u004cibraryId":"synthetic"}',true)['library-identity-field']).toBe(1);
  expect(inspectPublicArtText('const source={libraryVersion:0};')['library-identity-field']).toBe(1);
  expect(inspectPublicArtText('const libraryVersion=0;')['library-identity-field']).toBe(1);
  expect(inspectPublicArtText(JSON.stringify({policy:'sourceLibraryId: not permitted'}),true)).toEqual({});
});
it('invalid JSON is rejected without echoing a token or parser excerpt',()=>{
  const counts=inspectPublicArtText('{"source": "'+libraryId,true);
  const output=formatPublicArtPrivacy({filesScanned:1,issues:[{file:'manifest.json',type:'invalid-json',count:counts['invalid-json']}]});
  expect(counts).toEqual({'invalid-json':1});expect(output.includes(libraryId)).toBe(false);
});
it('only reads allowed current metadata, including nested metadata, and leaves binaries/history/other folders alone',async()=>{
  await fixture(async(dir,put)=>{
    await put('art/sources/handdrawn-runtime-fixture/README.md','safe description');
    await put('art/sources/handdrawn-runtime-fixture/nested/manifest.json',JSON.stringify({source:libraryId}));
    for(const file of ['art/sources/handdrawn-runtime-fixture/runtime/image.webp','art/sources/handdrawn-runtime-fixture/.git/manifest.json','art/sources/other/manifest.json','.git/old-manifest.json','docs/private-note.md'])await put(file,backingId);
    const report=await auditPublicArtPrivacy(dir);expect(report.filesScanned).toBe(3);expect(report.issues).toEqual([{file:'art/sources/handdrawn-runtime-fixture/nested/manifest.json',type:'private-file-identity',count:1}]);
  });
});
it('does not follow a metadata symlink into an external private folder',async()=>{
  await fixture(async(dir,put)=>{
    await put('external/synthetic.txt',libraryId);await fs.mkdir(path.join(dir,'art/sources'),{recursive:true});await fs.symlink(path.join(dir,'external'),'art/sources/handdrawn-runtime-link'.split('/').reduce((p,n)=>path.join(p,n),dir));
    const report=await auditPublicArtPrivacy(dir);expect(report.issues).toEqual([{file:'art/sources/handdrawn-runtime-link',type:'unsafe-symlink',count:1}]);expect(formatPublicArtPrivacy(report).includes(libraryId)).toBe(false);
  });
});
it('the actual content entry fails before domain validation/SSR server creation and prints only a safe diagnostic',async()=>{
  await fixture(async(dir,put)=>{
    await put('public/assets/handdrawn-p08/manifest.json',JSON.stringify({sourceLibraryId:libraryId}));
    for(const file of ['scripts/verify-content.mjs','scripts/public-art-privacy.mjs'])await put(file,await fs.readFile(path.join(root,file),'utf8'));
    await fs.symlink(path.join(root,'node_modules'),path.join(dir,'node_modules'));
    const result=spawnSync(process.execPath,[path.join(dir,'scripts/verify-content.mjs')],{cwd:dir,encoding:'utf8'});
    expect(result.status).toBe(1);expect(result.stdout).toBe('');expect(result.stderr.includes(libraryId)).toBe(false);
    const diagnostic=JSON.parse(result.stderr);expect(diagnostic.status).toBe('FAIL');expect(diagnostic.issues.map(issue=>issue.type).sort()).toEqual(['library-identity-field','private-file-identity']);
  });
});

it('detects a JSON-escaped Windows private path without treating a relative source filename as absolute',()=>{
 expect(inspectPublicArtText(JSON.stringify({path:'C:\\Users\\Synthetic\\input.png'}),true)['private-workspace-path']).toBe(1);
 expect(inspectPublicArtText(JSON.stringify({sourceFilename:'art/tmp/fixture-original.png'}),true)).toEqual({});
});
