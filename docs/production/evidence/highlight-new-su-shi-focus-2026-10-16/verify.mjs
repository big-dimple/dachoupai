import fs from 'node:fs';
import z from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=name=>JSON.parse(z.gunzipSync(fs.readFileSync(path.join(root,name+'-report.json.gz'))));
const before=read('before'),after=read('final'),dpr=read('dpr2'),asset=read('asset-proof');
for(const r of [before,after,dpr,asset]){assert.equal(r.status,'PASS');assert.equal(r.buildInfo.modified,false);}
const same=after.cases.find(c=>c.key===before.cases[0].key);for(const field of ['initial','saved','after','cold'])assert.deepEqual(before.cases[0][field],same[field]);
let count=0,frames=0;const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
for(const r of [after,dpr,asset])for(const row of r.cases){count++;assert.equal(row.status,'PASS');assert.deepEqual(row.errors,[]);assert.ok(row.focusGeometry.length>1);for(const f of row.focusGeometry){frames++;const first=row.focusGeometry.find(x=>x.eventId===f.eventId);for(const k of ['x','y','scaleX','scaleY','angle'])assert.equal(f[k],first[k]);assert.deepEqual(f.crop,{x:150,y:91,width:245,height:106});assert.equal(f.scaleX,f.scaleY);assert.ok(f.scaleX*row.dpr<=1.001);}for(const shot of row.shots)for(let i=0;i<shot.texts.length;i++)for(let j=i+1;j<shot.texts.length;j++)assert.equal(overlap(shot.texts[i].bounds,shot.texts[j].bounds),false);}
const focus=asset.cases[0].assetResponses.find(a=>a.url.includes('/amo.focus.webp'));assert.equal(focus.sha256,'f158579f7e055d16a4f2d9c2f36609fcbb5d8980469e31e063517f1e6fea02ad');assert.equal(new URL(focus.url).searchParams.get('v'),'f158579f7e05');assert.equal(count,7);
console.log(JSON.stringify({status:'PASS',nativeCases:count,eyeFrames:frames,sourceFocusSHA:focus.sha256,fullBeforeAfterEqual:true,textCollisions:0}));
