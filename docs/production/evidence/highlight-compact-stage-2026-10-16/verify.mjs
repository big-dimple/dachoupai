import fs from 'node:fs';
import z from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url)),read=n=>JSON.parse(z.gunzipSync(fs.readFileSync(path.join(root,n+'-report.json.gz'))));
const before=read('before'),after=read('final'),dpr=read('dpr2'),validation=JSON.parse(fs.readFileSync(path.join(root,'validation.json')));
for(const r of [before,after,dpr])assert.equal(r.status,'PASS');
for(const a of before.cases){const b=after.cases.find(c=>c.key===a.key);for(const k of ['initial','saved','after','cold'])assert.deepEqual(a[k],b[k]);}
let cases=0,frames=0;const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
for(const r of [after,dpr]){assert.equal(r.buildInfo.modified,false);for(const row of r.cases){cases++;assert.equal(row.status,'PASS');assert.deepEqual(row.errors,[]);for(const f of row.focusGeometry){frames++;const first=row.focusGeometry.find(p=>p.eventId===f.eventId);for(const k of ['x','y','scaleX','scaleY','angle'])assert.equal(f[k],first[k]);assert.equal(f.scaleX,f.scaleY);assert.ok(f.scaleX*row.dpr<=1.001);}for(const shot of row.shots){assert.ok(shot.backdrop);assert.ok(shot.texts.some(t=>t.name==='hero/climax-value'));assert.ok(shot.pixelEvidence.value>80);for(let i=0;i<shot.texts.length;i++)for(let j=i+1;j<shot.texts.length;j++)assert.equal(overlap(shot.texts[i].bounds,shot.texts[j].bounds),false);}}}
assert.equal(cases,10);assert.equal(validation.beforePhone.chargeNumberVisible,false);assert.equal(validation.metrics.find(m=>m.key==='e11-390-normal'&&m.dpr===1).panel.height,358);for(const image of validation.backdropPixels)for(const p of image.pixels)assert.deepEqual(p,[23,37,42,255]);
console.log(JSON.stringify({status:'PASS',cases,fixedEyeFrames:frames,fullBeforeAfterPairs:before.cases.length,chargeNumberAlwaysVisible:true,textCollisions:0}));
