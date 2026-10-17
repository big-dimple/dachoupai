/** Isolated optional stage variants; never rewrite a source image or detail file. */
import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const directory='public/assets/handdrawn-climax',check=process.argv.includes('--check');
const idIndex=process.argv.indexOf('--id'),selectedId=idIndex<0?undefined:process.argv[idIndex+1];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=JSON.parse(await readFile('public/assets/handdrawn-p08/manifest.json','utf8'));
const manifest=selectedId?JSON.parse(await readFile(directory+'/manifest.json','utf8')):{schemaVersion:1,purpose:'climax-source',maxBytes:96*1024,maxDimension:768,derivedMaxWidth:320,derivedMaxHeight:400,quality:86,assets:[]};
if(idIndex>=0)assert.ok(selectedId&&source.assets.some(a=>a.id===selectedId&&a.category==='functional-card'),'known --id required');
if(!check)await mkdir(directory,{recursive:true});
for(const card of source.assets.filter(a=>a.category==='functional-card'&&(!selectedId||a.id===selectedId))){
 const detail=card.outputs.find(o=>o.purpose==='detail'),sourcePath='assets/handdrawn-p08/'+detail.path,original=await readFile('public/'+sourcePath);
 assert.equal(hash(original),detail.sha256,'detail bytes must match the current artwork registry');
 const input=await sharp(original).metadata();assert.deepEqual([input.width,input.height],[detail.width,detail.height]);
 let bytes=original,width=detail.width,height=detail.height,path=sourcePath,kind='reuse-detail';
 if(original.length>manifest.maxBytes||width>manifest.maxDimension||height>manifest.maxDimension){
  const resized=await sharp(original).resize({width:manifest.derivedMaxWidth,height:manifest.derivedMaxHeight,fit:'inside',withoutEnlargement:true}).webp({quality:manifest.quality,effort:6}).toBuffer({resolveWithObject:true});
  bytes=resized.data;width=resized.info.width;height=resized.info.height;kind='stage-derivative';
  path=`assets/handdrawn-climax/${card.id}-${hash(bytes).slice(0,12)}.webp`;
  if(check)assert.deepEqual(await readFile('public/'+path),bytes,'stage file must reproduce without touching detail art');
  else await writeFile('public/'+path,bytes);
 }
 assert.ok(bytes.length<=manifest.maxBytes&&width<=manifest.maxDimension&&height<=manifest.maxDimension,'keep the existing stage transfer/pixel ceilings');
 const record={id:card.id,kind,sourcePath,sourceSHA256:detail.sha256,path,width,height,bytes:bytes.length,sha256:hash(bytes),geometry:{fit:'inside',entireSourceSampled:true,noUpscale:true,sourceCropPixels:{left:0,top:0,width:detail.width,height:detail.height}}};
 if(selectedId){const index=manifest.assets.findIndex(a=>a.id===selectedId);assert.ok(index>=0,'existing stage ID required');manifest.assets[index]=record;}
 else manifest.assets.push(record);
}
assert.equal(manifest.assets.length,72);
if(check)assert.deepEqual(JSON.parse(await readFile(directory+'/manifest.json','utf8')),manifest);
else await writeFile(directory+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
const derived=manifest.assets.filter(a=>a.kind==='stage-derivative');
console.log(JSON.stringify({status:'PASS',mode:check?'CHECK':'WRITE',cards:manifest.assets.length,reused:manifest.assets.length-derived.length,derived:derived.length,addedBytes:derived.reduce((n,a)=>n+a.bytes,0),maxSelectedBytes:Math.max(...manifest.assets.map(a=>a.bytes)),maxDerivedBytes:Math.max(...derived.map(a=>a.bytes)),maxDerivedPixels:Math.max(...derived.map(a=>a.width*a.height)),f09:manifest.assets.find(a=>a.id==='f09')}));
