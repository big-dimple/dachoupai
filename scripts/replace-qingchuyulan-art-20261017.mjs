/** Replace only user-supplied C06 art; --check reproduces it without writes. */
import sharp from 'sharp';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {HASH_POLICY} from './handdrawn-provenance.mjs';
const root='art/sources/qingchuyulan-art-20261017',receiptPath=root+'/manifest.json';
const runtimePath='public/assets/handdrawn-p08/manifest.json',check=!process.argv.includes('--write');
assert.ok(process.argv.slice(2).every(a=>['--check','--write'].includes(a))&&!(process.argv.includes('--check')&&process.argv.includes('--write')),'use --check (default) or --write');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const runtime=JSON.parse(fs.readFileSync(runtimePath,'utf8')),asset=runtime.assets.find(a=>a.id==='c06');
const source=fs.readFileSync(root+'/c06-qingchuyulan-original.png'),meta=await sharp(source).metadata();
assert.equal(hash(source),'7b530adb5ede95719ad37f4813e90f0ad42faa657763b7f5c60152a3f3b963e9');
assert.deepEqual([meta.width,meta.height],[1122,1402]);
const previous=fs.existsSync(receiptPath)?JSON.parse(fs.readFileSync(receiptPath,'utf8')).previous:
  {outputs:asset.outputs,sourceReceiptPath:'art/sources/handdrawn-runtime-20261017-half1/manifest.json'};
const pending=[];
const receipt={schemaVersion:1,batch:'qingchuyulan-art-20261017',baseCommit:'f81724b57736c7d4f299cf1d95705a7ba3ef9497',
 id:'c06',displayName:'青出于蓝',domainName:'越染越深',sourceOriginalName:'青出于蓝.png',sourceFilename:'c06-qingchuyulan-original.png',
 sourceSHA256:hash(source),sourceBytes:source.length,sourceWidth:meta.width,sourceHeight:meta.height,
 pixelReview:'Viewed original pixels: blue-dye apprentice displays a deep-blue patterned cloth beside his teacher, with indigo plants, vats and complete gold border; mapped by current display-name ID and prior source receipt.',
 geometry:{fit:'contain',entireSourceSampled:true,noStretch:true,sourceCropPixels:{left:0,top:0,width:meta.width,height:meta.height},background:'#F3EADB'},
 encoder:{sharp:sharp.versions.sharp,libwebp:sharp.versions.webp,effort:6},previous,outputs:[]};
for(const [purpose,width,height,quality] of [['thumbnail',128,160,80],['detail',615,768,78]]){
 const bytes=await sharp(source).resize(width,height,{fit:'contain',background:'#F3EADB'}).webp({quality,effort:6}).toBuffer();
 const sha256=hash(bytes),path=`cards/c06-v3-${sha256.slice(0,12)}.${purpose}.webp`;
 const record={purpose,path,width,height,bytes:bytes.length,sha256};receipt.outputs.push(record);
 if(check)assert.deepEqual(fs.readFileSync('public/assets/handdrawn-p08/'+path),bytes);
 else pending.push(['public/assets/handdrawn-p08/'+path,bytes]);
}
const receiptJSON=JSON.stringify(receipt,null,2)+'\n';
const replacement={receiptCommit:'3897abbc80f71d760fa41a9a8330f9fb606e72ab',sourceManifestPath:receiptPath,sourceManifestSHA256:hash(receiptJSON),status:'source-verified'};
assert.equal(runtime.provenancePolicy.sourceManifestHashPolicy,HASH_POLICY);
if(check){
 assert.deepEqual(JSON.parse(fs.readFileSync(receiptPath,'utf8')),receipt);
 assert.deepEqual(asset.outputs,receipt.outputs);assert.deepEqual(asset.currentSource,replacement);
 assert.equal(runtime.runtimeBytes,runtime.assets.reduce((sum,a)=>sum+a.outputs.reduce((n,o)=>n+o.bytes,0),0));
}else{
 assert.deepEqual(asset.currentSource,replacement,'archived replacement source changed');
 for(const [file,bytes]of pending)fs.writeFileSync(file,bytes);
 asset.outputs=receipt.outputs;asset.currentSource=replacement;
 runtime.runtimeBytes=runtime.assets.reduce((sum,a)=>sum+a.outputs.reduce((n,o)=>n+o.bytes,0),0);
 fs.writeFileSync(receiptPath,receiptJSON);fs.writeFileSync(runtimePath,JSON.stringify(runtime,null,2)+'\n');
}
console.log(JSON.stringify({mode:check?'CHECK':'WRITE',id:receipt.id,sourceSHA256:receipt.sourceSHA256,outputs:receipt.outputs,runtimeBytes:runtime.runtimeBytes}));
