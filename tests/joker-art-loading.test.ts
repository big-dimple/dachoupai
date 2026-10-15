import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type Phaser from 'phaser';
const shared=vi.hoisted(()=>({load:vi.fn()}));
vi.mock('../src/game/ArtTextureLoading',()=>({loadArtTexture:shared.load}));
import {requestJokerArt,retryJokerArt,jokerArtLoadState} from '../src/game/JokerArtLoading';
import {jokerArtKey} from '../src/game/jokerArt';
function fixture(){
 const textures=new Set<string>(),listeners=new Map<string,Set<()=>void>>();let active=true;
 const scene={game:{textures},textures:{exists:(key:string)=>textures.has(key)},sys:{settings:{active:true}},scene:{isActive:()=>active},events:{once:(name:string,fn:()=>void)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name)!.add(fn);},off:(name:string,fn:()=>void)=>listeners.get(name)?.delete(fn)}};
 const shutdown=()=>{active=false;scene.sys.settings.active=false;for(const fn of [...listeners.get('shutdown')??[]])fn();};
 return {scene:scene as unknown as Phaser.Scene,textures,shutdown,listeners};
}
const tick=async()=>{for(let n=0;n<15;n++)await Promise.resolve();};
beforeEach(()=>{vi.useFakeTimers();shared.load.mockReset().mockResolvedValue(undefined);});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();});
describe('scene Joker leases on the shared thumbnail queue',()=>{
 it('deduplicates redraws, never starts the Phaser loader or prefetches HD, and paints without resetting scene input',async()=>{
  const f=fixture(),refresh=vi.fn();requestJokerArt(f.scene,['b07','b07'],refresh);requestJokerArt(f.scene,['b07'],refresh);expect(shared.load).toHaveBeenCalledOnce();
  f.textures.add(jokerArtKey('b07')!);await tick();vi.advanceTimersByTime(0);expect(refresh).toHaveBeenCalledOnce();expect(jokerArtLoadState(f.scene,'b07')).toEqual({status:'loaded',attempts:1});
  requestJokerArt(f.scene,['b07'],refresh);expect(shared.load).toHaveBeenCalledOnce();f.shutdown();
 });
 it('ignores unregistered IDs and inactive scene entries',async()=>{
  const f=fixture();requestJokerArt(f.scene,['unknown'],vi.fn());expect(jokerArtLoadState(f.scene,'unknown').status).toBe('unregistered');f.shutdown();requestJokerArt(f.scene,['b07'],vi.fn());expect(await retryJokerArt(f.scene,['b07'],vi.fn())).toBe(false);expect(shared.load).not.toHaveBeenCalled();
 });
 it.each(['art-http-404','art-decode'])('does not repeat %s and allows one explicit shared retry',async reason=>{
  const f=fixture(),refresh=vi.fn();shared.load.mockRejectedValueOnce(Object.assign(Error(reason),{retryable:false}));requestJokerArt(f.scene,['b07'],refresh);await tick();
  for(let n=0;n<5;n++)requestJokerArt(f.scene,['b07'],refresh);expect(shared.load).toHaveBeenCalledOnce();expect(jokerArtLoadState(f.scene,'b07')).toMatchObject({status:'failed',attempts:1,reason});
  const a=retryJokerArt(f.scene,['b07'],refresh),b=retryJokerArt(f.scene,['b07'],refresh);await expect(a).resolves.toBe(true);await expect(b).resolves.toBe(true);expect(shared.load).toHaveBeenCalledTimes(2);f.shutdown();
 });
 it('recovers one transient failure and never re-arms that budget through redraws',async()=>{
  const f=fixture();shared.load.mockRejectedValue(Error('network'));requestJokerArt(f.scene,['b07'],vi.fn());await tick();await vi.advanceTimersByTimeAsync(300);await tick();
  expect(jokerArtLoadState(f.scene,'b07')).toMatchObject({status:'failed',attempts:2});for(let n=0;n<5;n++)requestJokerArt(f.scene,['b07'],vi.fn());await vi.runAllTimersAsync();expect(shared.load).toHaveBeenCalledTimes(2);f.shutdown();
 });
 it('settles retries on shutdown and suppresses late completion on rapid reentry',async()=>{
  const f=fixture(),refresh=vi.fn();let finish!:()=>void;shared.load.mockImplementationOnce(()=>new Promise<void>(resolve=>finish=resolve));requestJokerArt(f.scene,['b07'],refresh);const signal=shared.load.mock.calls[0][3] as AbortSignal;
  f.shutdown();expect(signal.aborted).toBe(true);finish();await tick();vi.advanceTimersByTime(0);expect(refresh).not.toHaveBeenCalled();expect([...f.listeners.values()].every(s=>!s.size)).toBe(true);
  const g=fixture();expect(await retryJokerArt(g.scene,['b07'],refresh)).toBe(true);g.shutdown();
 });
 it('aborts removed reroll offers but retains currently owned/requested IDs',async()=>{
  const f=fixture();shared.load.mockImplementation(()=>new Promise(()=>{}));requestJokerArt(f.scene,['b07','c05'],vi.fn());const signals=shared.load.mock.calls.map(c=>c[3] as AbortSignal);requestJokerArt(f.scene,['c05','mantangcai'],vi.fn());expect(signals[0].aborted).toBe(true);expect(signals[1].aborted).toBe(false);f.shutdown();
 });
 it('shares the automatic retry promise with explicit retries and settles all owners on shutdown',async()=>{
  const f=fixture();shared.load.mockRejectedValue(Error('network'));requestJokerArt(f.scene,['b07'],vi.fn());await tick();
  const retry=retryJokerArt(f.scene,['b07'],vi.fn());f.shutdown();await expect(retry).resolves.toBe(false);await vi.runAllTimersAsync();expect(shared.load).toHaveBeenCalledOnce();
 });

});
