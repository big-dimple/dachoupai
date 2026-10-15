import {afterEach,expect,it,vi} from 'vitest';
import type Phaser from 'phaser';
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();vi.resetModules();vi.useRealTimers();});
const tick=async()=>{for(let n=0;n<30;n++)await Promise.resolve();};
function setup(){
 const textures=new Map<string,unknown>(),images:{src:string;removeAttribute:ReturnType<typeof vi.fn>}[]=[];
 vi.stubGlobal('Image',class {src='';naturalWidth=128;naturalHeight=160;decoding='async';removeAttribute=vi.fn();constructor(){images.push(this);}async decode(){}});
 const game={textures:{exists:(key:string)=>textures.has(key),addImage:vi.fn((key:string,image:unknown)=>textures.set(key,image))}} as unknown as Phaser.Game;
 return {game,textures,images};
}
it('shares warmup and visible requests, uses two slots, promotes queued visible work and releases URLs',async()=>{
 const {game,textures}=setup(),fetch=vi.fn(async()=>new Response(new Blob(['art']),{headers:{'content-type':'image/webp'}}));vi.stubGlobal('fetch',fetch);
 const revoke=vi.spyOn(URL,'revokeObjectURL'),{loadArtTexture}=await import('../src/game/ArtTextureLoading'),a=new AbortController(),b=new AbortController();
 const warm=loadArtTexture(game,'held','/held.webp',a.signal,false),visible=loadArtTexture(game,'held','/held.webp',b.signal,true);a.abort();await expect(warm).rejects.toThrow('art-aborted');await visible;
 expect(fetch).toHaveBeenCalledOnce();expect(textures.has('held')).toBe(true);expect(revoke).toHaveBeenCalledOnce();await loadArtTexture(game,'held','/held.webp',b.signal);expect(fetch).toHaveBeenCalledOnce();
});
it('runs visible work before queued background work without increasing the two transfer budget',async()=>{
 const {artTransfer}=await import('../src/game/ArtTextureLoading'),started:string[]=[],done=new Map<string,()=>void>();
 const start=(id:string,priority:number)=>artTransfer(async()=>{started.push(id);await new Promise<void>(resolve=>done.set(id,resolve));},priority);
 const a=start('a',0),b=start('b',0),c=start('c',0),d=start('visible',2);expect(started).toEqual(['a','b']);done.get('a')!();await a;await tick();expect(started).toEqual(['a','b','visible']);done.get('visible')!();await d;await tick();expect(started.at(-1)).toBe('c');done.get('b')!();done.get('c')!();await Promise.all([b,c]);
});
it('makes optional HD yield its slots and resumes it after visible textures',async()=>{
 const {artTransfer}=await import('../src/game/ArtTextureLoading'),events:string[]=[],done=new Map<string,()=>void>();let calls=0;
 const hd=artTransfer(async signal=>{const id='hd'+(++calls);events.push(id);await new Promise<void>(resolve=>{done.set(id,resolve);signal.addEventListener('abort',()=>events.push('yield'));});return id;},1);
 const bg=artTransfer(async()=>new Promise<void>(resolve=>done.set('bg',resolve)),0);
 const face=artTransfer(async()=>{events.push('face');},2);await face;await tick();expect(events.slice(0,3)).toEqual(['hd1','yield','face']);expect(events.at(-1)).toBe('hd2');done.get('hd2')!();expect(await hd).toBe('hd2');done.get('hd1')!();done.get('bg')!();await bg;
});
it('404 and decode failures remain explicit and cannot install fake or stale textures',async()=>{
 const {game,textures}=setup(),{loadArtTexture}=await import('../src/game/ArtTextureLoading'),signal=new AbortController().signal;
 vi.stubGlobal('fetch',async()=>new Response('missing',{status:404}));await expect(loadArtTexture(game,'missing','/404',signal)).rejects.toMatchObject({retryable:false});
 vi.stubGlobal('fetch',async()=>new Response(new Blob(['broken'])));vi.stubGlobal('Image',class {src='';removeAttribute(){}decode(){return Promise.reject(Error('decode'));}});
 await expect(loadArtTexture(game,'broken','/broken',signal)).rejects.toMatchObject({retryable:false});expect(textures.size).toBe(0);
});
it('last consumer cancellation frees the slot even if fetch ignores abort, and rapid reentry cannot publish late data',async()=>{
 const {game}=setup();let finish!:(response:Response)=>void;const fetch=vi.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>finish=resolve)).mockResolvedValue(new Response(new Blob(['current'])));vi.stubGlobal('fetch',fetch);
 const {loadArtTexture}=await import('../src/game/ArtTextureLoading'),old=new AbortController();const abandoned=expect(loadArtTexture(game,'same','/same',old.signal)).rejects.toThrow('art-aborted');old.abort();await abandoned;
 await loadArtTexture(game,'same','/same',new AbortController().signal);finish(new Response(new Blob(['late'])));await tick();expect(game.textures.addImage).toHaveBeenCalledOnce();expect(fetch).toHaveBeenCalledTimes(2);
});
it('stream and decoded pixel budgets preserve the thumbnail cap',async()=>{
 const {game}=setup(),{loadArtTexture}=await import('../src/game/ArtTextureLoading'),signal=new AbortController().signal;
 vi.stubGlobal('fetch',async()=>new Response(new Uint8Array(128*1024+1)));await expect(loadArtTexture(game,'large','/large',signal)).rejects.toMatchObject({retryable:false});
 vi.stubGlobal('fetch',async()=>new Response(new Blob(['art'])));vi.stubGlobal('Image',class {src='';naturalWidth=4096;naturalHeight=4096;async decode(){}removeAttribute(){}});
 await expect(loadArtTexture(game,'pixels','/pixels',signal)).rejects.toMatchObject({retryable:false});expect(game.textures.addImage).not.toHaveBeenCalled();
});
it('decode deadline aborts and revokes temporary URLs without late publication',async()=>{
 vi.useFakeTimers();const {game}=setup();let finish!:()=>void;vi.stubGlobal('fetch',async()=>new Response(new Blob(['art'])));vi.stubGlobal('Image',class {src='';removeAttribute=vi.fn();decode(){return new Promise<void>(resolve=>finish=resolve);}});
 const revoke=vi.spyOn(URL,'revokeObjectURL'),{loadArtTexture}=await import('../src/game/ArtTextureLoading');const failed=expect(loadArtTexture(game,'stall','/stall',new AbortController().signal)).rejects.toThrow('art-aborted');await tick();await vi.advanceTimersByTimeAsync(4501);await failed;expect(revoke).toHaveBeenCalledOnce();finish();await tick();expect(game.textures.addImage).not.toHaveBeenCalled();
});

/** Real detail + thumbnail consumers fill all four slots; fetch deliberately ignores abort. */
async function saturatedTransfers(keys=['goods-art/block-0','goods-art/block-1']){
 const {game}=setup(),requests:{url:string;signal:AbortSignal;finish:(response:Response)=>void;aborted:ReturnType<typeof vi.fn>}[]=[];
 vi.stubGlobal('createImageBitmap',async()=>({width:615,height:768,close(){}}));
 const fetch=vi.fn((url:string,options:RequestInit)=>new Promise<Response>(finish=>{
  const aborted=vi.fn();options.signal!.addEventListener('abort',aborted);
  requests.push({url,signal:options.signal!,finish,aborted});
 }));vi.stubGlobal('fetch',fetch);
 const {artTransfer,loadArtTexture}=await import('../src/game/ArtTextureLoading'),{detailArt}=await import('../src/game/DetailArt');
 const goods=[new AbortController(),new AbortController()],hd=[new AbortController(),new AbortController()];
 const goodsDone=goods.map((owner,i)=>loadArtTexture(game,keys[i],'/goods-'+i,owner.signal));
 const hdDone=hd.map((owner,i)=>detailArt('/hd-'+i,true,owner.signal));
 expect(requests.map(r=>r.url)).toEqual(['/goods-0','/goods-1','/hd-0','/hd-1']);
 const reply=(request:typeof requests[number])=>request.finish(new Response(new Blob([request.url]),{headers:{'content-type':'image/webp'}}));
 return {game,requests,fetch,goodsDone,hdDone,goods,hd,reply,loadArtTexture,artTransfer};
}
it('promotes a shared queued warmup at four-slot saturation, yields each HD once and fetches the texture once',async()=>{
 const f=await saturatedTransfers(),warm=new AbortController(),visible=new AbortController(),duplicate=new AbortController();
 const warming=f.loadArtTexture(f.game,'p08-joker-shared','/shared',warm.signal,false);
 expect(f.requests).toHaveLength(4);
 const showing=f.loadArtTexture(f.game,'p08-joker-shared','/shared',visible.signal);
 expect(f.requests.slice(2).map(r=>r.signal.aborted)).toEqual([true,true]);
 const repeated=f.loadArtTexture(f.game,'p08-joker-shared','/shared',duplicate.signal);await tick();
 expect(f.requests.filter(r=>r.url==='/shared')).toHaveLength(1);
 expect(f.requests.slice(2,4).map(r=>r.aborted.mock.calls.length)).toEqual([1,1]);
 // Once promoted, redraw/shared consumers must not interrupt the resumed HD again.
 const again=f.loadArtTexture(f.game,'p08-joker-shared','/shared',duplicate.signal);await tick();
 expect(f.requests.filter(r=>r.url.startsWith('/hd-')&&!r.signal.aborted)).toHaveLength(1);
 f.reply(f.requests.find(r=>r.url==='/shared')!);await Promise.all([warming,showing,repeated,again]);await tick();
 for(const request of f.requests.filter(r=>r.url.startsWith('/goods-')||r.url.startsWith('/hd-')&&!r.signal.aborted))f.reply(request);
 await Promise.all([...f.goodsDone,...f.hdDone]);
 expect(f.requests.filter(r=>r.url==='/hd-0')).toHaveLength(2);expect(f.requests.filter(r=>r.url==='/hd-1')).toHaveLength(2);
 expect(f.requests.filter(r=>r.url==='/shared')).toHaveLength(1);
 expect(f.game.textures.addImage).toHaveBeenCalledWith('p08-joker-shared',expect.anything());
 const oldHD=f.requests.slice(2,4);oldHD.forEach(f.reply);await tick();
 expect(oldHD.map(r=>r.aborted.mock.calls.length)).toEqual([1,1]);
});
it.each(['fetch','decode'] as const)('cancels promoted shared %s work on leave and never publishes its late result on rapid reentry',async stage=>{
 const f=await saturatedTransfers(),warm=new AbortController(),visible=new AbortController();let finishDecode!:()=>void;
 if(stage==='decode'){
  let decodes=0;vi.stubGlobal('Image',class {src='';naturalWidth=128;naturalHeight=160;removeAttribute=vi.fn();decode(){return ++decodes===1?new Promise<void>(resolve=>finishDecode=resolve):Promise.resolve();}});
 }
 const warming=f.loadArtTexture(f.game,'p08-joker-shared','/shared',warm.signal,false),showing=f.loadArtTexture(f.game,'p08-joker-shared','/shared',visible.signal);
 const stopped=Promise.all([expect(warming).rejects.toThrow('art-aborted'),expect(showing).rejects.toThrow('art-aborted')]);await tick();
 const old=f.requests.find(r=>r.url==='/shared')!;expect(old).toBeDefined();
 if(stage==='decode'){f.reply(old);await vi.waitFor(()=>expect(finishDecode).toBeTypeOf('function'));}
 warm.abort();expect(old.signal.aborted).toBe(false);visible.abort();await stopped;expect(old.signal.aborted).toBe(true);
 const current=f.loadArtTexture(f.game,'p08-joker-shared','/shared',new AbortController().signal);await tick();
 const fresh=f.requests.filter(r=>r.url==='/shared').at(-1)!;expect(fresh).not.toBe(old);f.reply(fresh);await current;
 if(stage==='fetch')f.reply(old);else finishDecode();await tick();
 expect(f.game.textures.addImage).toHaveBeenCalledTimes(1);
 expect(f.requests.filter(r=>r.url==='/shared')).toHaveLength(2); // one canceled entry, one new entry
 const hdStopped=f.hdDone.map(p=>p.catch(()=>{}));f.hd.forEach(owner=>owner.abort());await Promise.all(hdStopped);
 f.requests.filter(r=>r.url.startsWith('/goods-')||r.url.startsWith('/hd-')).forEach(f.reply);await Promise.all(f.goodsDone);await tick();
});

it('promotes a loading Goods card through the real redraw API before HD with four slots occupied',async()=>{
 const f=await saturatedTransfers(['goods-art/block-0','p08-joker-block']),{requestGoodsArt,goodsArtLoadState}=await import('../src/game/GoodsArtLoading');
 let primary=false;const callbacks=new Map<string,Set<()=>void>>(),refresh=vi.fn();
 const scene={game:f.game,textures:f.game.textures,children:{list:[{name:'shop/goods-art/T09',getData:(key:string)=>key==='basicChoiceArt'||key==='primary'&&primary}]},events:{once:(key:string,fn:()=>void)=>{if(!callbacks.has(key))callbacks.set(key,new Set());callbacks.get(key)!.add(fn);},off:(key:string,fn:()=>void)=>callbacks.get(key)?.delete(fn)}} as unknown as Phaser.Scene;
 requestGoodsArt(scene,'T09','/top',refresh);await tick();expect(f.requests).toHaveLength(4);
 primary=true;requestGoodsArt(scene,'T09','/top',refresh);requestGoodsArt(scene,'T09','/top',refresh);await tick();
 expect(f.requests.slice(2,4).map(r=>r.aborted.mock.calls.length)).toEqual([1,1]);
 const top=f.requests.filter(r=>r.url==='/top');expect(top).toHaveLength(1);expect(f.requests[4]).toBe(top[0]);
 requestGoodsArt(scene,'T09','/top',refresh);await tick();expect(f.requests.filter(r=>r.url.startsWith('/hd-')&&!r.signal.aborted)).toHaveLength(1);
 f.reply(top[0]);await vi.waitFor(()=>expect(goodsArtLoadState(scene,'T09')).toEqual({status:'loaded',attempts:1}));expect(refresh).toHaveBeenCalledOnce();expect(f.requests.filter(r=>r.url==='/top')).toHaveLength(1);
 const stopped=f.hdDone.map(p=>p.catch(()=>{}));f.hd.forEach(owner=>owner.abort());await Promise.all(stopped);f.requests.filter(r=>r.url.startsWith('/goods-')||r.url.startsWith('/hd-')).forEach(f.reply);await Promise.all(f.goodsDone);await tick();
 for(const fn of [...callbacks.get('shutdown')??[]])fn();
});
