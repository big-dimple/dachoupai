import {describe,expect,it} from 'vitest';
import {EffectQueue} from '../src/core/EffectQueue';

const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(r=>resolve=r);return {promise,resolve};};
const deadline=(promise:Promise<void>)=>Promise.race([promise.then(()=>true),new Promise<boolean>(r=>setTimeout(()=>r(false),80))]);

describe('source EffectQueue generation contract',()=>{
  it('drains later work after an initially empty drain has settled',async()=>{
    const queue=new EffectQueue(),seen:string[]=[];await queue.drain();queue.enqueue(()=>{seen.push('later');});await queue.drain();expect(seen).toEqual(['later']);
  });
  it('returns the same unfinished promise to every concurrent drain caller',async()=>{
    const queue=new EffectQueue(),gate=deferred();queue.enqueue(()=>gate.promise);
    const first=queue.drain(),second=queue.drain();
    try {expect(second).toBe(first);} finally {gate.resolve();await first;}
  });
  it('clear settles a stopped tween and allows a fresh generation to drain',async()=>{
    const queue=new EffectQueue(),gate=deferred(),played:string[]=[];
    queue.enqueue(()=>gate.promise);queue.enqueue(()=>{played.push('old-tail');});
    const old=queue.drain();await Promise.resolve();queue.clear();
    queue.enqueue(()=>{played.push('new');});const fresh=queue.drain();
    try {expect(await deadline(old)).toBe(true);await fresh;expect(played).toEqual(['new']);}
    finally {gate.resolve();await old;}
  });
  it('supplies an abort signal and never lets an old drain consume a new tail',async()=>{
    const queue=new EffectQueue(),gate=deferred(),seen:number[]=[];let signal:AbortSignal|undefined;
    queue.enqueue(context=>{signal=context.signal;return gate.promise;});const old=queue.drain();
    await Promise.resolve();queue.clear();queue.enqueue(context=>{seen.push(context.generation);});
    const fresh=queue.drain();gate.resolve();await Promise.all([old,fresh]);
    expect(signal?.aborted).toBe(true);expect(seen).toHaveLength(1);
  });
  it('rejects an effect error, discards its tail and unlocks subsequent work',async()=>{
    const queue=new EffectQueue(),played:string[]=[];
    queue.enqueue(()=>{throw new Error('broken presentation');});queue.enqueue(()=>{played.push('stale');});
    await expect(queue.drain()).rejects.toThrow('broken presentation');
    queue.enqueue(()=>{played.push('new');});await queue.drain();expect(played).toEqual(['new']);
  });
});
