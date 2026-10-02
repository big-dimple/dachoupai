import {afterEach,it,expect,vi} from 'vitest';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();vi.resetModules();});
const bitmap=()=>vi.stubGlobal('createImageBitmap',async()=>({width:615,height:768,close(){}}));
it('limits in-flight detail transfers to two and shares duplicate requests',async()=>{
 bitmap();const finish:((r:Response)=>void)[]=[];const fetch=vi.fn(()=>new Promise<Response>(resolve=>finish.push(resolve)));vi.stubGlobal('fetch',fetch);
 const {detailArt}=await import('../src/game/DetailArt');
 const a=detailArt('/a'),b=detailArt('/b'),c=detailArt('/c');expect(detailArt('/a')).toBe(a);expect(fetch).toHaveBeenCalledTimes(2);
 finish[0](new Response(new Blob(['a'])));await a;await vi.waitFor(()=>expect(fetch).toHaveBeenCalledTimes(3));
 finish[1](new Response(new Blob(['b'])));finish[2](new Response(new Blob(['c'])));await Promise.all([b,c]);
});
it('rejects oversized images instead of retaining unbounded decoded memory',async()=>{
 vi.stubGlobal('fetch',async()=>new Response(new Blob(['x'])));vi.stubGlobal('createImageBitmap',async()=>({width:4096,height:4096,close(){}}));
 const {detailArt}=await import('../src/game/DetailArt');await expect(detailArt('/large')).rejects.toThrow('detail-image-unavailable');
});
it('aborts a stalled fetch and lets the user retry the same URL',async()=>{
 vi.useFakeTimers();bitmap();let calls=0;
 vi.stubGlobal('fetch',(_url:string,options:RequestInit)=>{calls++;return calls===1?new Promise<Response>((_resolve,reject)=>options.signal!.addEventListener('abort',()=>reject(new Error('aborted')))):Promise.resolve(new Response(new Blob(['ok'])));});
 const {detailArt}=await import('../src/game/DetailArt');const pending=expect(detailArt('/retry')).rejects.toThrow('detail-image-unavailable');await vi.advanceTimersByTimeAsync(6001);await pending;await expect(detailArt('/retry')).resolves.toMatch(/^blob:/);expect(calls).toBe(2);
});

it.each(['fetch','body','bitmap'] as const)('bounds a stalled %s even when it ignores abort, and discards late completion',async stage=>{
 vi.useFakeTimers();
 let finish!:()=>void,calls=0;
 const close=vi.fn(),blob=new Blob(['art']);
 const stalled=new Promise<void>(resolve=>{finish=resolve;});
 const response={ok:true,blob:()=>stage==='body'&&calls===1?stalled.then(()=>blob):Promise.resolve(blob)} as Response;
 vi.stubGlobal('fetch',()=>{calls++;return stage==='fetch'&&calls===1?stalled.then(()=>response):Promise.resolve(response);});
 let bitmaps=0;
 vi.stubGlobal('createImageBitmap',()=>{bitmaps++;return stage==='bitmap'&&bitmaps===1?stalled.then(()=>({width:615,height:768,close})):Promise.resolve({width:615,height:768,close:vi.fn()});});
 const create=vi.spyOn(URL,'createObjectURL'),revoke=vi.spyOn(URL,'revokeObjectURL');
 const {detailArt}=await import('../src/game/DetailArt');
 const failed=expect(detailArt('/stalled')).rejects.toThrow('detail-image-unavailable');
 await vi.advanceTimersByTimeAsync(6001);await failed;
 const recovered=await detailArt('/stalled');expect(calls).toBe(2);expect(create).toHaveBeenCalledTimes(1);
 finish();await vi.advanceTimersByTimeAsync(0);
 expect(await detailArt('/stalled')).toBe(recovered);expect(create).toHaveBeenCalledTimes(1);expect(revoke).not.toHaveBeenCalled();
 if(stage==='bitmap')expect(close).toHaveBeenCalledTimes(1);
});

it('bounds encoded bytes and retains only the four most recently used URLs',async()=>{
 bitmap();vi.stubGlobal('fetch',async(url:string)=>new Response(new Blob([url==='/large'?new Uint8Array(2*1024*1024+1):url])));
 const create=vi.spyOn(URL,'createObjectURL'),revoke=vi.spyOn(URL,'revokeObjectURL');
 const {detailArt}=await import('../src/game/DetailArt');await expect(detailArt('/large')).rejects.toThrow('detail-image-unavailable');expect(create).not.toHaveBeenCalled();
 const a=await detailArt('/a');await detailArt('/b');await detailArt('/c');const d=await detailArt('/d');
 expect(await detailArt('/a')).toBe(a);await detailArt('/e');expect(revoke).toHaveBeenCalledTimes(1);expect(revoke).not.toHaveBeenCalledWith(a);
 expect(await detailArt('/d')).toBe(d);expect(create).toHaveBeenCalledTimes(5);
});

type ArtNode={className:string;textContent:string;hidden:boolean;onclick:(()=>void)|null;setAttribute:ReturnType<typeof vi.fn>};
function artUI(){
 const controls:ArtNode[]=[];
 vi.stubGlobal('document',{createElement:()=>({className:'',textContent:'',hidden:false,onclick:null,setAttribute:vi.fn()})});
 const frame={dataset:{} as Record<string,string>,classList:{contains:()=>false},append:(...nodes:ArtNode[])=>controls.push(...nodes)};
 const image={src:'/thumbnail.webp'};
 return {frame:frame as unknown as HTMLElement,image:image as HTMLImageElement,controls};
}
function decoder(decode:()=>Promise<void>){
 const images:{src:string;onerror:(()=>void)|null;removeAttribute:ReturnType<typeof vi.fn>}[]=[];
 vi.stubGlobal('Image',class {
  src='';onerror:(()=>void)|null=null;removeAttribute=vi.fn(()=>{this.src='';});
  constructor(){images.push(this);}
  decode(){return decode();}
 });return images;
}
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};

it('keeps the thumbnail on decode failure, refetches on retry and restores loading status until ready',async()=>{
 bitmap();const fetch=vi.fn(async()=>new Response(new Blob(['art'])));vi.stubGlobal('fetch',fetch);
 let recover!:()=>void;
 const decode=vi.fn().mockRejectedValueOnce(new Error('decode')).mockImplementationOnce(()=>new Promise<void>(resolve=>{recover=resolve;}));decoder(decode);
 const {frame,image,controls}=artUI(),{progressiveArt}=await import('../src/game/DetailArt'),ready=vi.fn();const stop=progressiveArt(frame,image,'/hd',ready);
 await vi.waitFor(()=>expect(controls[1].hidden).toBe(false));expect(image.src).toBe('/thumbnail.webp');expect(ready).not.toHaveBeenCalled();
 controls[1].onclick!();expect(controls[0].hidden).toBe(false);expect(controls[0].textContent).toBe('高清细节加载中…');expect(controls[1].hidden).toBe(true);
 await vi.waitFor(()=>expect(decode).toHaveBeenCalledTimes(2));expect(fetch).toHaveBeenCalledTimes(2);expect(image.src).toBe('/thumbnail.webp');recover();await flush();
 expect(image.src).toMatch(/^blob:/);expect(ready).toHaveBeenCalledTimes(1);expect(controls[0].hidden).toBe(true);expect(controls[1].hidden).toBe(true);stop();
});

it('bounds a stalled display decode and preserves the available mechanism fallback',async()=>{
 vi.useFakeTimers();bitmap();vi.stubGlobal('fetch',async()=>new Response(new Blob(['art'])));decoder(()=>new Promise<void>(()=>{}));
 const {frame,image,controls}=artUI();frame.dataset.artFallback='mechanism';image.src='data:image/png;base64,fallback';
 const {progressiveArt}=await import('../src/game/DetailArt');const stop=progressiveArt(frame,image,'/hd',vi.fn());
 await vi.advanceTimersByTimeAsync(0);await vi.advanceTimersByTimeAsync(6001);
 expect(image.src).toBe('data:image/png;base64,fallback');expect(controls[1].hidden).toBe(false);expect(controls[0].textContent).toBe('高清暂未加载，可重试');stop();
});

it('cancels display handlers on close and ignores retained retry callbacks and late decode results',async()=>{
 bitmap();vi.stubGlobal('fetch',async()=>new Response(new Blob(['art'])));
 let finish!:()=>void;const decode=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve;})),images=decoder(decode);
 const {frame,image,controls}=artUI(),ready=vi.fn(),{progressiveArt}=await import('../src/game/DetailArt');const stop=progressiveArt(frame,image,'/close',ready);
 const oldRetry=controls[1].onclick!;await vi.waitFor(()=>expect(decode).toHaveBeenCalledOnce());stop();
 expect(controls[1].onclick).toBeNull();expect(images[0].onerror).toBeNull();expect(images[0].removeAttribute).toHaveBeenCalledWith('src');
 finish();oldRetry();await flush();expect(image.src).toBe('/thumbnail.webp');expect(ready).not.toHaveBeenCalled();expect(decode).toHaveBeenCalledOnce();
});

it('closing before transfer finishes does not cancel the shared request or decode into the old dialog',async()=>{
 bitmap();let finish!:(response:Response)=>void;vi.stubGlobal('fetch',()=>new Promise<Response>(resolve=>{finish=resolve;}));const decode=vi.fn(async()=>{});decoder(decode);
 const {frame,image}=artUI(),ready=vi.fn(),{detailArt,progressiveArt}=await import('../src/game/DetailArt');const stop=progressiveArt(frame,image,'/shared',ready),shared=detailArt('/shared');stop();
 finish(new Response(new Blob(['art'])));await expect(shared).resolves.toMatch(/^blob:/);await flush();
 expect(decode).not.toHaveBeenCalled();expect(ready).not.toHaveBeenCalled();expect(image.src).toBe('/thumbnail.webp');
});
