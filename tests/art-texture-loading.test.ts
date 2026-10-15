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
