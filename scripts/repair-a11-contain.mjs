/** Re-derive only the supplied A11 source; --check is read-only. */
import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const root='art/sources/handdrawn-runtime-20261017-half1',manifestPath='public/assets/handdrawn-p08/manifest.json';
const receipt=JSON.parse(await readFile(root+'/manifest.json','utf8')),manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const entry=receipt.assets.find(a=>a.id==='a11'),asset=manifest.assets.find(a=>a.id==='a11'),source=await readFile(root+'/'+entry.sourceFile);
assert.equal(hash(source),entry.sourceSHA256);const meta=await sharp(source).metadata();assert.deepEqual([meta.width,meta.height],[1696,2528]);
for(const [purpose,width,height,quality] of [['thumbnail',128,160,80],['detail',615,768,78]]){
 const bytes=await sharp(source,{failOn:'none'}).resize(width,height,{fit:'contain',background:'#000'}).webp({quality,effort:6}).toBuffer();
 const sha256=hash(bytes),path=`cards/a11-v3-${sha256.slice(0,12)}.${purpose}.webp`,record={path,width,height,bytes:bytes.length,sha256};
 if(process.argv.includes('--check')){
  assert.deepEqual(asset.outputs.find(o=>o.purpose===purpose),{...record,purpose});assert.equal(hash(await readFile('public/assets/handdrawn-p08/'+path)),sha256);assert.deepEqual(entry[purpose],record);
 }else{
  await writeFile('public/assets/handdrawn-p08/'+path,bytes);Object.assign(asset.outputs.find(o=>o.purpose===purpose),record);entry[purpose]=record;
 }
}
const geometry={fit:'contain',entireSourceSampled:true,noStretch:true,sourceCropPixels:{left:0,top:0,width:1696,height:2528},background:'#000'};
if(process.argv.includes('--check'))assert.deepEqual(entry.geometry,geometry);
else{
 entry.geometry=geometry;
 manifest.runtimeBytes=manifest.assets.reduce((sum,a)=>sum+a.outputs.reduce((total,o)=>total+o.bytes,0),0);
 await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');await writeFile(root+'/manifest.json',JSON.stringify(receipt,null,2)+'\n');
}
console.log(JSON.stringify({id:'a11',sourceSHA256:entry.sourceSHA256,geometry,outputs:asset.outputs,runtimeBytes:manifest.runtimeBytes,mode:process.argv.includes('--check')?'CHECK':'WRITE'}));
