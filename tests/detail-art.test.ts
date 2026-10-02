import {afterEach,it,expect,vi} from 'vitest';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();vi.resetModules();});
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
