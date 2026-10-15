import {describe,it,expect,vi} from 'vitest';
import {ImageWarmupQueue,type WarmImage} from '../src/game/ImageWarmupQueue';
const asset=(key:string)=>({key,url:'/assets/'+key+'.webp'});
const tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
describe('staged image queue',()=>{
  it('deduplicates, caps catalog and promotes next stage without exceeding two transfers',async()=>{
    const work=new Map<string,()=>void>(),started:string[]=[];
    const load=vi.fn((a:WarmImage)=>new Promise<void>(resolve=>{started.push(a.key);work.set(a.key,resolve);}));
    const queue=new ImageWarmupQueue(load,()=>{},4);queue.request(['a','b','c','d','e'].map(asset));queue.request([asset('d')],true);
    expect(started).toEqual(['a','b']);expect(queue.snapshot()).toHaveLength(4);work.get('a')!();await tick();expect(started).toEqual(['a','b','d']);
    queue.request([asset('a')]);expect(load).toHaveBeenCalledTimes(3);queue.dispose();
  });
  it('automatically recovers one transient failure but never loops permanent failure',async()=>{
    const counts=new Map<string,number>();const load=vi.fn(async(a:WarmImage)=>{const n=(counts.get(a.key)??0)+1;counts.set(a.key,n);if(a.key==='missing')throw Object.assign(Error('404'),{retryable:false});if(n===1)throw Error('network');});
    const queue=new ImageWarmupQueue(load,()=>{});queue.request(['network','missing'].map(asset));await tick();
    expect(queue.snapshot()).toMatchObject([{status:'loaded',attempts:2},{status:'failed',attempts:1}]);queue.request([asset('missing')]);await tick();expect(counts.get('missing')).toBe(1);queue.dispose();
  });
  it('settles failed retry budget and explicit recovery without reloading ready images',async()=>{
    let online=false;const load=vi.fn(async()=>{if(!online)throw Error('offline');});const queue=new ImageWarmupQueue(load,()=>{});queue.request([asset('hero')]);await tick();
    expect(queue.snapshot()[0]).toMatchObject({status:'failed',attempts:2});online=true;queue.retry();await tick();expect(queue.snapshot()[0]).toMatchObject({status:'loaded',attempts:3});queue.retry();queue.request([asset('hero')]);expect(load).toHaveBeenCalledTimes(3);queue.dispose();
  });
  it('aborts pending transfers on destroy and suppresses late notifications',async()=>{
    let finish!:()=>void,signal!:AbortSignal;const changed=vi.fn();const queue=new ImageWarmupQueue((_a,s)=>{signal=s;return new Promise<void>(resolve=>finish=resolve);},changed);
    queue.request(['hero','court','next'].map(asset));queue.dispose();expect(signal.aborted).toBe(true);const calls=changed.mock.calls.length;finish();await tick();expect(changed).toHaveBeenCalledTimes(calls);expect(queue.snapshot()).toEqual([]);
  });
  it('retires obsolete shop warmup without recording a failed image or re-arming a retry',async()=>{
    const owner=new AbortController();let fail!:(error:Error)=>void;
    const load=vi.fn(()=>new Promise<void>((_resolve,reject)=>fail=reject));
    const queue=new ImageWarmupQueue(load,()=>{});queue.request([{...asset('old-shop'),scope:owner.signal}]);owner.abort();fail(Object.assign(Error('retired'),{canceled:true,retryable:false}));await tick();
    expect(queue.snapshot()).toEqual([]);queue.retry();expect(load).toHaveBeenCalledOnce();queue.dispose();
  });

  it('reconciles a failed speculative image recovered by a visible owner without another request',async()=>{
    const load=vi.fn(async()=>{throw Object.assign(Error('404'),{retryable:false});});const changed=vi.fn(),queue=new ImageWarmupQueue(load,changed);queue.request([asset('tool')]);await tick();
    expect(queue.snapshot()[0].status).toBe('failed');queue.markLoaded('tool');expect(queue.snapshot()[0].status).toBe('loaded');queue.retry();expect(load).toHaveBeenCalledOnce();queue.dispose();
  });

});
