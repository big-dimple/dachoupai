import {it,expect,vi,afterEach} from 'vitest';
import {heroClimaxLayout} from '../src/game/HeroClimaxLayout';
import {CLIMAX_SOURCE_BYTES,CLIMAX_SOURCE_ART,climaxSourceAsset,loadClimaxSourceArt} from '../src/game/ClimaxSourceArt';
import {HANDDRAWN_ART} from '../src/game/HanddrawnArt';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {readFileSync} from 'node:fs';
afterEach(()=>vi.unstubAllGlobals());
it('same-ID complete stage variant is bounded and has no legacy/background/unknown substitution',()=>{
 const a=climaxSourceAsset('f09')!;expect(a.url).toContain('/handdrawn-climax/f09-');expect(a.bytes).toBe(57192);expect(a.width).toBe(320);expect(a.height).toBe(400);expect(a.bytes).toBeLessThanOrEqual(CLIMAX_SOURCE_BYTES);for(const id of ['unknown','amo','','p03-stage'])expect(climaxSourceAsset(id)).toBeUndefined();
});
it('all 72 real stage files preserve their current same-ID source and exact decoded metadata within the unchanged budget',async()=>{
 const cards=HANDDRAWN_ART.filter(a=>a.category==='functional-card');expect(CLIMAX_SOURCE_ART.map(a=>a.id).sort()).toEqual(cards.map(a=>a.id).sort());
 expect(CLIMAX_SOURCE_ART.filter(a=>a.kind==='stage-derivative')).toHaveLength(52);expect(CLIMAX_SOURCE_ART.filter(a=>a.kind==='reuse-detail')).toHaveLength(20);
 for(const card of cards){
  const detail=card.outputs.find(o=>o.purpose==='detail')!,record=CLIMAX_SOURCE_ART.find(a=>a.id===card.id)!,asset=climaxSourceAsset(card.id)!;
  const bytes=readFileSync('public/'+record.path),metadata=await sharp(bytes).metadata();
  expect(record.sourceSHA256).toBe(detail.sha256);expect(record.sourcePath).toBe('assets/handdrawn-p08/'+detail.path);expect(bytes.length).toBe(record.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(record.sha256);
  expect([metadata.width,metadata.height]).toEqual([asset.width,asset.height]);expect(bytes.length).toBeLessThanOrEqual(CLIMAX_SOURCE_BYTES);expect(Math.max(asset.width,asset.height)).toBeLessThanOrEqual(768);expect(asset.url).toContain(record.path+'?v='+record.sha256);
  expect(record.geometry).toEqual({fit:'inside',entireSourceSampled:true,noUpscale:true,sourceCropPixels:{left:0,top:0,width:detail.width,height:detail.height}});
  if(record.kind==='reuse-detail')expect(record.path).toBe(record.sourcePath);else expect([record.width,record.height]).toEqual([320,400]);
 }
});
it('falls back instead of publishing a stale stage derivative after its same-ID detail revision changes',()=>{
 const detail=HANDDRAWN_ART.find(a=>a.id==='f09')!.outputs.find(o=>o.purpose==='detail')!,sha=detail.sha256;
 try{detail.sha256='0'.repeat(64);expect(climaxSourceAsset('f09')).toBeUndefined();}finally{detail.sha256=sha;}
 expect(climaxSourceAsset('f09')?.bytes).toBe(57192);
});
it.each([[1280,720],[1366,768],[1920,1080],[390,740],[320,740],[740,390]])('foreground source and saved fact lanes are contained at %i×%i',(w,h)=>{
 const l=heroClimaxLayout(w,h);for(const b of [l.source,l.readout,l.sourceCaption])expect(b.x>=0&&b.y>=0&&b.x+b.width<=w&&b.y+b.height<=h).toBe(true);expect(l.source.x+l.source.width<=l.readout.x||l.source.y+l.source.height<=l.readout.y).toBe(true);expect(l.valueY<l.noteY&&l.noteY<l.sourceCaption.y).toBe(true);
});
function fixture(){const publish=vi.fn(),scene:any={sys:{settings:{active:true}},textures:{exists:()=>false,addImage:publish}},asset=climaxSourceAsset('f09')!,bytes=readFileSync('public/'+CLIMAX_SOURCE_ART.find(a=>a.id==='f09')!.path);let image:any,decode:()=>Promise<void>=async()=>{};const clear=vi.fn();vi.stubGlobal('Image',class{constructor(){image=this;}naturalWidth=asset.width;naturalHeight=asset.height;decoding='';src='';decode(){return decode();}removeAttribute=clear;});return {scene,publish,asset,bytes,clear,get image(){return image;},setDecode:(fn:()=>Promise<void>)=>decode=fn};}
it('publishes the existing exact-size image only after decode and current generation checks',async()=>{
 const f=fixture(),fetch=vi.fn(async(_url:unknown,_options:unknown)=>new Response(f.bytes,{headers:{'content-length':String(f.bytes.length)}}));vi.stubGlobal('fetch',fetch);expect(await loadClimaxSourceArt(f.scene,'f09',new AbortController().signal,()=>true)).toBe(true);expect(f.publish).toHaveBeenCalledOnce();expect(fetch.mock.calls[0][1]).toMatchObject({priority:'low',credentials:'same-origin'});
});
it('a stale decode cannot publish, and cancellation resolves before a blocked decode',async()=>{
 const f=fixture();let finish!:()=>void,current=true;f.setDecode(()=>new Promise(r=>finish=r));vi.stubGlobal('fetch',async()=>new Response(f.bytes));const abort=new AbortController(),task=loadClimaxSourceArt(f.scene,'f09',abort.signal,()=>current);await vi.waitFor(()=>expect(finish).toBeDefined());current=false;abort.abort();expect(await task).toBe(false);finish();await Promise.resolve();expect(f.publish).not.toHaveBeenCalled();expect(f.clear).toHaveBeenCalled();
});
it('response header and streamed byte ceilings reject oversized input before image decoding',async()=>{
 const f=fixture();vi.stubGlobal('fetch',async()=>new Response('x',{headers:{'content-length':String(CLIMAX_SOURCE_BYTES+1)}}));expect(await loadClimaxSourceArt(f.scene,'f09',new AbortController().signal,()=>true)).toBe(false);vi.stubGlobal('fetch',async()=>new Response(new Uint8Array(CLIMAX_SOURCE_BYTES+1)));expect(await loadClimaxSourceArt(f.scene,'f09',new AbortController().signal,()=>true)).toBe(false);expect(f.publish).not.toHaveBeenCalled();
});
it('wrong actual byte count, decoder dimensions and HTTP failure retain the same-name fallback',async()=>{
 const f=fixture();vi.stubGlobal('fetch',async()=>new Response('short'));expect(await loadClimaxSourceArt(f.scene,'f09',new AbortController().signal,()=>true)).toBe(false);vi.stubGlobal('fetch',async()=>new Response(f.bytes));f.setDecode(async()=>{f.image.naturalWidth=1;});expect(await loadClimaxSourceArt(f.scene,'f09',new AbortController().signal,()=>true)).toBe(false);vi.stubGlobal('fetch',async()=>new Response('',{status:404}));expect(await loadClimaxSourceArt(f.scene,'f09',new AbortController().signal,()=>true)).toBe(false);expect(f.publish).not.toHaveBeenCalled();
});

it('no-source uses one larger hero lane and a readable contained accumulator without inventing a card',()=>{const plain=heroClimaxLayout(1366,768,false),withSource=heroClimaxLayout(1366,768);expect(plain.readout.width).toBeGreaterThan(250);expect(withSource.readout.width).toBeGreaterThan(250);expect(plain.heroW).toBeGreaterThan(withSource.heroW);});
