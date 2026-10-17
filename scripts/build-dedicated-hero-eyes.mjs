import sharp from 'sharp';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const sourceDir='art/sources/tangsong-eyes-20261017',outDir='public/assets/tangsong-eyes',hash=b=>createHash('sha256').update(b).digest('hex');
const source=JSON.parse(await readFile(sourceDir+'/manifest.json','utf8')),check=process.argv.includes('--check');
assert.deepEqual(source.entries.map(e=>e.heroId),['amo','touye','laohuan','erxiang','azao','xiemu']);
const manifest={schemaVersion:1,sourceDirectory:sourceDir,scope:'Six user-provided independent 8:3 eye originals; full image, original alpha and pencil edges preserved. No crop, repaint, background removal or enlargement.',assets:[]};
await mkdir(outDir,{recursive:true});
for(const hero of source.entries){
 const bytes=await readFile(sourceDir+'/'+hero.file),m=await sharp(bytes).metadata();assert.equal(hash(bytes),hero.sha256);assert.equal(bytes.length,hero.bytes);assert.equal(m.width,2048);assert.equal(m.height,768);assert.equal(m.hasAlpha,true);assert.equal((await sharp(bytes).stats()).isOpaque,false);
 let quality=90,data;
 do{data=await sharp(bytes).resize({width:768,height:288,fit:'inside',withoutEnlargement:true,kernel:'lanczos3'}).webp({quality,alphaQuality:100,effort:6}).toBuffer();if(data.length<=128*1024)break;quality-=3;}while(quality>=72);
 assert.ok(data.length<=128*1024,hero.heroId+' byte budget');const meta=await sharp(data).metadata();assert.equal(meta.width,768);assert.equal(meta.height,288);assert.equal(meta.hasAlpha,true);await sharp(data).raw().toBuffer();
 const sha256=hash(data),path=`assets/tangsong-eyes/${hero.heroId}.eyes-${sha256.slice(0,12)}.webp`;
 if(check)assert.equal(hash(await readFile('public/'+path)),sha256);else await writeFile('public/'+path,data);
 manifest.assets.push({id:hero.heroId,person:hero.person,purpose:'eyes',key:'hero-eyes-'+hero.heroId,path,width:meta.width,height:meta.height,bytes:data.length,sha256,format:'webp',sourceFile:hero.file,sourceSHA256:hero.sha256,cropPixels:{x:0,y:0,width:m.width,height:m.height},quality,alphaQuality:100,independentEyeArtwork:true});
}
if(check)assert.deepEqual(JSON.parse(await readFile(outDir+'/manifest.json','utf8')),manifest);else await writeFile(outDir+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',mode:check?'check':'build',files:manifest.assets.length,bytes:manifest.assets.reduce((n,a)=>n+a.bytes,0),perSelectedHeroDecodedRGBA:768*288*4}));
