import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import sharp from 'sharp';
const root=process.env.ATTACHMENT_OUT??'shots/liue-target-attachment/final',report=JSON.parse(await readFile(root+'/report.json','utf8')),results=[];
for(const name of ['pc','phone']){
 const spec=report.cases.find(c=>c.key===name);if(spec?.status!=='PASS')throw Error('No final PASS: '+name);
 const probe=JSON.parse(gunzipSync(await readFile(root+'/'+name+'/frames.json.gz'))),images=probe.images.filter(i=>i.key.startsWith('idle-')),met=await sharp(root+'/'+name+'/'+images[0].key+'.png').metadata(),ratio=met.width/spec.width;
 const raw=await Promise.all(images.map(async i=>({image:i,...await sharp(root+'/'+name+'/'+i.key+'.png').ensureAlpha().raw().toBuffer({resolveWithObject:true})}))),result={name,ratio,idleSamples:images.length,idleSpan:images.at(-1).at-images[0].at,indexChangedPixels:0,edgeChangedPixels:[],renderGapP95:0};
 for(let n=1;n<raw.length;n++){
  const a=raw[n-1],b=raw[n],index=a.image.indexBounds,card=a.image.targetBounds;let changed=0,indexChanged=0;
  for(let y=Math.max(0,Math.floor((card.y-6)*ratio));y<Math.min(met.height,Math.ceil((card.y+card.height+6)*ratio));y++)for(let x=Math.max(0,Math.floor((card.x-6)*ratio));x<Math.min(met.width,Math.ceil((card.x+card.width+6)*ratio));x++){
   const at=(y*met.width+x)*4,diff=Math.max(...[0,1,2].map(c=>Math.abs(a.data[at+c]-b.data[at+c])));if(diff<5)continue;
   const lx=x/ratio,ly=y/ratio;if(lx>=index.x&&lx<index.x+index.width&&ly>=index.y&&ly<index.y+index.height)indexChanged++;
   if(lx<card.x||lx>card.x+card.width||ly<card.y||ly>card.y+card.height)changed++;
  }
  result.indexChangedPixels+=indexChanged;result.edgeChangedPixels.push(changed);
 }
 const idle=probe.frames.filter(f=>f.phase==='idle'),gaps=idle.slice(1).map((f,i)=>f.at-idle[i].at).sort((a,b)=>a-b);result.renderGapP95=gaps[Math.floor(gaps.length*.95)];
 if(result.indexChangedPixels!==0||result.edgeChangedPixels.filter(n=>n>5).length<12)throw Error('Pixel motion/readability check failed '+JSON.stringify(result));
 const chosen=[0,4,9,images.length-1],tiles=[];for(let t=0;t<chosen.length;t++){
  const i=images[chosen[t]],c=i.targetBounds,left=Math.max(0,Math.floor((c.x-8)*ratio)),top=Math.max(0,Math.floor((c.y-9)*ratio)),width=Math.min(met.width-left,Math.ceil((c.width+30)*ratio)),height=Math.min(met.height-top,Math.ceil((c.height+34)*ratio));
  const tile=await sharp(root+'/'+name+'/'+i.key+'.png').extract({left,top,width,height}).resize(220,320,{fit:'contain',background:'#f5efdf'}).png().toBuffer();tiles.push({input:tile,left:t*220,top:32});
 }
 const heading='<svg width="880" height="32">'+chosen.map((n,t)=>'<text x="'+(t*220+8)+'" y="22" font-family="Arial" font-size="15" fill="#215f70">idle +'+Math.round(images[n].at-images[0].at)+'ms</text>').join('')+'</svg>';tiles.push({input:Buffer.from(heading),left:0,top:0});
 await sharp({create:{width:880,height:352,channels:3,background:'#f5efdf'}}).composite(tiles).png().toFile(root+'/'+name+'/idle-pixel-strip.png');results.push(result);
}
await writeFile(root+'/pixel-review.json',JSON.stringify({scope:'Actual native canvas pixels: neighbouring idle frames. Rank/suit index stays identical; exterior edge pixels move. Render-gap observation includes PNG/video capture overhead, not low-end device or incremental CPU certification.',results},null,2));console.log(JSON.stringify(results));
