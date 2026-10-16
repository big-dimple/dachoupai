import fs from 'node:fs';
import z from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=name=>JSON.parse(z.gunzipSync(fs.readFileSync(path.join(root,name+'-report.json.gz'))));
const before=read('before'),normal=read('final'),held=read('held-final'),dpr=read('dpr2-final');
for(const r of [before,normal,held,dpr]){assert.equal(r.status,'PASS');assert.equal(r.buildInfo.modified,false);}
for(const row of before.cases){const after=held.cases.find(c=>c.key===row.key);assert.ok(after);for(const field of ['initial','saved','after','cold'])assert.deepEqual(row[field],after[field]);assert.ok(row.orphanChrome.length);assert.deepEqual(after.orphanChrome,[]);}
let cases=0,frames=0;
const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
for(const r of [normal,held,dpr])for(const row of r.cases){
 cases++;assert.equal(row.status,'PASS');assert.deepEqual(row.errors,[]);assert.deepEqual(row.orphanChrome,[]);assert.ok(row.focusGeometry.length>1);
 for(const f of row.focusGeometry){frames++;const first=row.focusGeometry.find(p=>p.eventId===f.eventId);for(const key of ['x','y','scaleX','scaleY','angle'])assert.equal(f[key],first[key]);assert.equal(f.scaleX,f.scaleY);assert.ok(f.scaleX*row.dpr<=1.001);}
 for(const shot of row.shots)for(let i=0;i<shot.texts.length;i++)for(let j=i+1;j<shot.texts.length;j++)assert.equal(overlaps(shot.texts[i].bounds,shot.texts[j].bounds),false,row.key+'/'+shot.shot);
}
assert.equal(cases,18);assert.ok(held.cases.find(c=>c.restoredInventory));
console.log(JSON.stringify({status:'PASS',nativeCases:cases,fixedEyeFrames:frames,fullBeforeAfterPairs:before.cases.length,orphanGraphicsAfter:0,textCollisions:0}));
