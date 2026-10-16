import sharp from 'sharp';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const sourceDir='art/sources/tangsong-portraits-20261015',outDir='public/assets/tangsong-portraits';
const source=JSON.parse(await readFile(sourceDir+'/manifest.json','utf8'));
// Reviewed against the actual 1122×1402 source pixels. Square head crops exclude baked name panels.
const crops={amo:{left:350,top:0,width:480,height:480},touye:{left:215,top:0,width:600,height:600},laohuan:{left:340,top:0,width:520,height:520},erxiang:{left:285,top:0,width:550,height:550},azao:{left:160,top:0,width:650,height:650},xiemu:{left:260,top:0,width:640,height:640}};
const prefixes={avatar:'avatar-',selection:'selection-portrait-',portrait:'opening-portrait-',focus:'portrait-focus-'};
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest={schemaVersion:1,sourceCommit:'e6922f8d56cf42b9dedd4eab00d772591a7b79ad',sourceDirectory:sourceDir,scope:'Six user-approved originals. Focus is a reviewed head crop from the portrait, not separate eye artwork. No source upscaling.',sourceRevisions:source.revisions??[],assets:[]};
await mkdir(outDir,{recursive:true});
for(const hero of source.entries){
 const bytes=await readFile(sourceDir+'/'+hero.file);assert.equal(hash(bytes),hero.sha256);const m=await sharp(bytes).metadata();assert.equal(m.width,1122);assert.equal(m.height,1402);await sharp(bytes).raw().toBuffer();
 for(const purpose of ['avatar','selection','portrait','focus']){
  const crop=['avatar','focus'].includes(purpose)?crops[hero.heroId]:{left:0,top:0,width:m.width,height:m.height};
  const size={avatar:[256,256],selection:[256,320],portrait:[615,768],focus:[600,600]}[purpose];
  let quality=88,data;const maxBytes=128*1024;
  do {data=await sharp(bytes).extract(crop).resize({width:size[0],height:size[1],fit:'inside',withoutEnlargement:true,kernel:'lanczos3'}).webp({quality,effort:6}).toBuffer();if(data.length<=maxBytes)break;quality-=3;}while(quality>=40);
  assert.ok(data.length<=maxBytes,hero.heroId+'/'+purpose+' budget');const meta=await sharp(data).metadata();assert.ok(meta.width*meta.height<=600000);assert.ok(meta.width<=crop.width&&meta.height<=crop.height);
  const path=`assets/tangsong-portraits/${hero.heroId}.${purpose}.webp`;await writeFile('public/'+path,data);
  manifest.assets.push({id:hero.heroId,person:hero.person,theme:hero.title,purpose,key:prefixes[purpose]+hero.heroId,path,width:meta.width,height:meta.height,bytes:data.length,sha256:hash(data),format:'webp',sourceFile:hero.file,sourceSHA256:hero.sha256,cropPixels:{x:crop.left,y:crop.top,width:crop.width,height:crop.height},quality,independentEyeArtwork:false});
 }
}
manifest.decodedPixels={startup:manifest.assets.filter(a=>['avatar','selection'].includes(a.purpose)).reduce((n,a)=>n+a.width*a.height,0),all:manifest.assets.reduce((n,a)=>n+a.width*a.height,0)};
await writeFile(outDir+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({files:manifest.assets.length,bytes:manifest.assets.reduce((n,a)=>n+a.bytes,0),decodedPixels:manifest.decodedPixels}));
