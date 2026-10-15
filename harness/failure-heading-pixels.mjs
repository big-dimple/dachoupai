/** Read-only audit for the exact 320/390 short-screen title 已结束本局，重新选择.
 * Region x36..259 contains the complete title glyphs in these recorded viewports.
 * No image is transformed or rewritten; JSON includes the decoded-region digest. */
import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const files=process.argv.slice(2);if(!files.length)throw Error('usage: node harness/failure-heading-pixels.mjs <original.png> [capture.png ...]');
const rows=[];
for(const file of files){
 const png=await readFile(file),{data,info}=await sharp(png).removeAlpha().raw().toBuffer({resolveWithObject:true});
 if(![320,390].includes(info.width)||info.height!==568)throw Error('audit expects exact recorded short-screen dimensions');
 let upperInk=0,count=0,minY=Infinity,maxY=-1,minX=Infinity,maxX=-1;const region=[];
 for(let y=0;y<65;y++)for(let x=36;x<260;x++){
  const i=(y*info.width+x)*info.channels;
  // Hash full RGB bytes, independently of the dark-ink diagnostic threshold.
  if(y>=15)region.push(data[i],data[i+1],data[i+2]);
  if(data[i]<100&&data[i+1]<110&&data[i+2]<120){
   if(y<11)upperInk++;
   if(y>=15){count++;minY=Math.min(minY,y);maxY=Math.max(maxY,y);minX=Math.min(minX,x);maxX=Math.max(maxX,x);}
  }
 }
 rows.push({file,sha256:createHash('sha256').update(png).digest('hex'),width:info.width,height:info.height,
  region:{x:36,y:15,width:224,height:50,rgbSha256:createHash('sha256').update(Buffer.from(region)).digest('hex')},
  inkAboveHeaderY0to10:upperInk,headingAreaInk:{count,minX,maxX,minY,maxY}});
}
console.log(JSON.stringify({scope:'Exact recorded title/regions only; corroborate with h2/header clipping geometry and original PNG, not a general visual-acceptance threshold.',rows},null,2));
