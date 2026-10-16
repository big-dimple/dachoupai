import {afterEach,expect,it,vi} from 'vitest';
import {ResourceRecovery,RESOURCE_RECOVERY_INTERVAL} from '../src/game/ResourceRecovery';
import type {PreparationProgress} from '../src/game/SceneResources';
const initial:PreparationProgress={total:1,loaded:0,failed:0,pending:1,states:[{key:'a',url:'a',status:'queued',attempts:0}]};
const failed=(retryable=true):PreparationProgress=>({...initial,failed:1,pending:0,states:[{key:'a',url:'a',status:'failed',attempts:1,retryable}]});
const ready:PreparationProgress={...initial,loaded:1,pending:0,states:[{key:'a',url:'a',status:'loaded',attempts:1}]};
const tick=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
afterEach(()=>vi.useRealTimers());
it('uses finite backoff then low-frequency recovery, with only one attempt at a time',async()=>{
 vi.useFakeTimers();let attempts=0;const control=new AbortController(),statuses:string[]=[];
 const recovery=new ResourceRecovery(async()=>++attempts===6?ready:failed(),initial,p=>statuses.push(p.status),control.signal,new EventTarget(),()=>true);
 const done=recovery.run();await tick();expect(attempts).toBe(1);
 for(const [delay,count] of [[500,2],[1500,3],[3500,4],[30000,5],[60000,6]]){await vi.advanceTimersByTimeAsync(delay-1);expect(attempts).toBe(count-1);await vi.advanceTimersByTimeAsync(1);expect(attempts).toBe(count);}
 expect(await done).toBe(true);expect(statuses.at(-1)).toBe('ready');
});
it('permanent 404 waits for the low-frequency recovery instead of consuming rapid retries',async()=>{
 vi.useFakeTimers();const owner=new AbortController(),attempt=vi.fn(async()=>failed(false));
 const recovery=new ResourceRecovery(attempt,initial,()=>{},owner.signal,new EventTarget(),()=>true),done=recovery.run();await tick();
 await vi.advanceTimersByTimeAsync(RESOURCE_RECOVERY_INTERVAL-1);expect(attempt).toHaveBeenCalledOnce();await vi.advanceTimersByTimeAsync(1);expect(attempt).toHaveBeenCalledTimes(2);
 owner.abort();expect(await done).toBe(false);await vi.advanceTimersByTimeAsync(120000);expect(attempt).toHaveBeenCalledTimes(2);
});
it('offline aborts the active batch, duplicate events do not fork work, online resumes automatically',async()=>{
 vi.useFakeTimers();const events=new EventTarget(),owner=new AbortController();let online=true,active=0,maxActive=0,calls=0;
 const attempt=vi.fn((signal:AbortSignal)=>{calls++;active++;maxActive=Math.max(active,maxActive);if(calls>1){active--;return Promise.resolve(ready);}return new Promise<PreparationProgress>(resolve=>signal.addEventListener('abort',()=>{active--;resolve(initial);},{once:true}));});
 const recovery=new ResourceRecovery(attempt,initial,()=>{},owner.signal,events,()=>online),done=recovery.run();await tick();
 online=false;events.dispatchEvent(new Event('offline'));await tick();await vi.advanceTimersByTimeAsync(120000);expect(calls).toBe(1);
 online=true;for(let i=0;i<8;i++)events.dispatchEvent(new Event('online'));expect(await done).toBe(true);expect(calls).toBe(2);expect(maxActive).toBe(1);
});
it('explicit pause cancels pending work, resume keeps the same owner, cancellation clears all waits',async()=>{
 vi.useFakeTimers();const owner=new AbortController(),attempt=vi.fn(async()=>failed()),statuses:string[]=[];
 const recovery=new ResourceRecovery(attempt,initial,p=>statuses.push(p.status),owner.signal,new EventTarget(),()=>true),done=recovery.run();await tick();
 recovery.pause();await tick();expect(statuses.at(-1)).toBe('paused');await vi.advanceTimersByTimeAsync(120000);expect(attempt).toHaveBeenCalledOnce();
 recovery.resume();recovery.resume();await tick();expect(attempt).toHaveBeenCalledTimes(2);owner.abort();expect(await done).toBe(false);await vi.advanceTimersByTimeAsync(120000);expect(attempt).toHaveBeenCalledTimes(2);
});
