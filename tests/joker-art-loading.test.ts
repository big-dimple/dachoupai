import type Phaser from 'phaser';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {jokerArtLoadState,requestJokerArt,retryJokerArt} from '../src/game/JokerArtLoading';
import {JOKER_ART,jokerArtKey,jokerArtUrl} from '../src/game/jokerArt';
import {R2_JOKERS} from '../src/content/r2Schema';
import {prefetchDetailArt} from '../src/game/DetailArt';

vi.mock('../src/game/DetailArt',()=>({prefetchDetailArt:vi.fn()}));
// Choose actual legacy registrations; reviewed replacements must never stand in for legacy prefetch.
const ids=JOKER_ART.filter(art=>!art.detailOnDemand&&art.path.startsWith('assets/jokers-p07/')).slice(0,3).map(art=>art.id);
const unregistered=R2_JOKERS.find(definition=>!JOKER_ART.some(art=>art.id===definition.id))?.id??'fixture/never-registered';
const key=(id:string)=>jokerArtKey(id)!;
type Listener=(...args:any[])=>void;
class FakeEvents {
  private readonly listeners=new Map<string,{callback:Listener;once:boolean}[]>();
  on(event:string,callback:Listener):this {return this.add(event,callback,false);}
  once(event:string,callback:Listener):this {return this.add(event,callback,true);}
  private add(event:string,callback:Listener,once:boolean):this {
    this.listeners.set(event,[...this.listeners.get(event)??[],{callback,once}]);return this;
  }
  off(event:string,callback:Listener):this {
    const remaining=(this.listeners.get(event)??[]).filter(listener=>listener.callback!==callback);
    if(remaining.length)this.listeners.set(event,remaining);else this.listeners.delete(event);return this;
  }
  emit(event:string,...args:unknown[]):void {
    for(const listener of [...this.listeners.get(event)??[]]){if(listener.once)this.off(event,listener.callback);listener.callback(...args);}
  }
  removeAllListeners():void {this.listeners.clear();}
  eventNames():string[] {return [...this.listeners.keys()];}
  listenerCount(event:string):number {return this.listeners.get(event)?.length??0;}
}
type Handler=(()=>void)|null;
interface FakeFile {
  key:string;type:string;url:string;settings:{timeout:number;responseType:string};
  data:{onload:Handler;onerror:Handler;src?:string};
  xhrLoader:null|{status:number;onload:Handler;onerror:Handler;onprogress:Handler;ontimeout:Handler;abort:ReturnType<typeof vi.fn>};
  timeout?:ReturnType<typeof setTimeout>;
}
class FakeLoader extends FakeEvents {
  maxParallelDownloads=32;
  maxRetries=2;
  requests:FakeFile[]=[];
  pending:FakeFile[]=[];
  inflight=new Set<FakeFile>();
  running=false;
  peak=0;
  constructor(private readonly textures:Set<string>){super();}
  image(key:string,url:string,settings:FakeFile['settings']):this {
    if(this.textures.has(key)||[...this.pending,...this.inflight].some(file=>file.key===key))return this;
    const file:FakeFile={key,type:'image',url,settings,data:{onload:()=>{},onerror:()=>{}},xhrLoader:null};
    this.requests.push(file);this.pending.push(file);this.emit('addfile',key,'image',this,file);return this;
  }
  isLoading():boolean{return this.running;}
  start():void {this.running=true;this.pump();}
  private pump():void {
    while(this.running&&this.pending.length&&this.inflight.size<this.maxParallelDownloads){
      const file=this.pending.shift()!;this.inflight.add(file);this.peak=Math.max(this.peak,this.inflight.size);
      file.xhrLoader={status:0,onload:()=>{},onerror:()=>{},onprogress:()=>{},ontimeout:()=>{},abort:vi.fn(()=>clearTimeout(file.timeout))};
      file.timeout=setTimeout(()=>this.fail(file,0),file.settings.timeout);
    }
  }
  succeed(file:FakeFile):void {
    clearTimeout(file.timeout);this.inflight.delete(file);this.textures.add(file.key);
    this.emit('filecomplete',file.key,'image',file.data);this.finish();
  }
  fail(file:FakeFile,status:number):void {
    clearTimeout(file.timeout);this.inflight.delete(file);if(file.xhrLoader)file.xhrLoader.status=status;
    this.emit('loaderror',file);this.finish();
  }
  decodeFailure(file:FakeFile):void {
    clearTimeout(file.timeout);this.inflight.delete(file);this.finish();
  }
  private finish():void {
    this.pump();
    if(!this.pending.length&&!this.inflight.size){this.running=false;this.emit('complete',this,0,0);}
  }
  shutdown():void {
    // Match Phaser: its own shutdown removes listeners/queues without aborting XHRs.
    this.running=false;this.pending=[];this.inflight.clear();this.removeAllListeners();
  }
}
class FakeScene {
  active=true;
  readonly cached=new Set<string>();
  readonly textures={exists:(key:string)=>this.cached.has(key)};
  readonly load=new FakeLoader(this.cached);
  readonly events=new FakeEvents();
  readonly sys={settings:{active:true}};
  readonly scene={isActive:()=>this.active};
  constructor(){this.enter();scenes.push(this);}
  get phaser():Phaser.Scene{return this as unknown as Phaser.Scene;}
  enter():void {this.active=true;this.sys.settings.active=true;this.events.once('shutdown',()=>this.load.shutdown());}
  shutdown():void {this.active=false;this.sys.settings.active=false;this.events.emit('shutdown');}
}
const scenes:FakeScene[]=[];
beforeEach(()=>{vi.useFakeTimers();vi.mocked(prefetchDetailArt).mockClear();});
afterEach(()=>{for(const scene of scenes.splice(0))scene.shutdown();vi.clearAllTimers();vi.useRealTimers();});

describe('registered Joker thumbnail recovery',()=>{
  it('legacy prefetch fixtures are three distinct still-legacy registrations',()=>{expect(jokerArtKey(unregistered)).toBeUndefined();expect(ids).toHaveLength(3);expect(new Set(ids).size).toBe(3);for(const id of ids)expect(JOKER_ART.find(a=>a.id===id)).toMatchObject({path:expect.stringMatching(/^assets\/jokers-p07\//)});});
  it('starts exactly once during Scene.create before Phaser reports RUNNING',()=>{
    const scene=new FakeScene(),refresh=vi.fn();scene.active=false;
    expect(scene.sys.settings.active).toBe(true);expect(scene.scene.isActive()).toBe(false);
    requestJokerArt(scene.phaser,[ids[0]],refresh);requestJokerArt(scene.phaser,[ids[0]],refresh);
    expect(scene.load.requests).toHaveLength(1);expect(scene.load.inflight.size).toBe(1);
    expect(jokerArtLoadState(scene.phaser,ids[0])).toEqual({status:'loading',attempts:1});
    scene.active=true;scene.load.succeed(scene.load.requests[0]);vi.advanceTimersByTime(0);
    expect(jokerArtLoadState(scene.phaser,ids[0]).status).toBe('loaded');expect(refresh).toHaveBeenCalledOnce();
  });

  it('does not enqueue work or subscribe after the scene active flag is cleared',async()=>{
    const scene=new FakeScene();scene.shutdown();requestJokerArt(scene.phaser,[ids[0]],vi.fn());
    await expect(retryJokerArt(scene.phaser,[ids[0]],vi.fn())).resolves.toBe(false);
    expect(scene.load.requests).toEqual([]);expect(scene.load.eventNames()).toEqual([]);
  });

  it('distinguishes intentionally unregistered cards without loading or subscribing',()=>{
    const scene=new FakeScene(),refresh=vi.fn();
    expect(jokerArtLoadState(scene.phaser,unregistered)).toEqual({status:'unregistered',attempts:0});
    expect(jokerArtLoadState(scene.phaser,ids[0])).toEqual({status:'idle',attempts:0});
    requestJokerArt(scene.phaser,[unregistered],refresh);retryJokerArt(scene.phaser,[unregistered],refresh);
    expect(scene.load.requests).toEqual([]);expect(scene.load.eventNames()).toEqual([]);expect(prefetchDetailArt).not.toHaveBeenCalled();
  });

  it.each([0,503])('recovers a transient status %s once and reports loaded state',status=>{
    const scene=new FakeScene(),refresh=vi.fn();requestJokerArt(scene.phaser,[ids[0]],refresh);
    expect(jokerArtLoadState(scene.phaser,ids[0])).toEqual({status:'loading',attempts:1});
    scene.load.fail(scene.load.requests[0],status);
    expect(jokerArtLoadState(scene.phaser,ids[0])).toMatchObject({status:'failed',attempts:1});
    vi.advanceTimersByTime(300);expect(scene.load.requests).toHaveLength(2);
    scene.load.succeed(scene.load.requests[1]);vi.advanceTimersByTime(0);
    expect(jokerArtLoadState(scene.phaser,ids[0])).toEqual({status:'loaded',attempts:2});
    expect(refresh).toHaveBeenCalled();expect(prefetchDetailArt).toHaveBeenCalledWith([jokerArtUrl(ids[0])],expect.any(AbortSignal));
  });

  it('never re-arms automatic retry through repeated failed redraws',()=>{
    const scene=new FakeScene(),refresh=vi.fn();requestJokerArt(scene.phaser,[ids[0]],refresh);
    scene.load.fail(scene.load.requests[0],503);vi.advanceTimersByTime(300);scene.load.fail(scene.load.requests[1],503);
    for(let i=0;i<5;i++)requestJokerArt(scene.phaser,[ids[0]],refresh);
    vi.runAllTimers();expect(scene.load.requests).toHaveLength(2);
    expect(jokerArtLoadState(scene.phaser,ids[0])).toEqual({status:'failed',attempts:2,reason:'http-503'});
    expect(prefetchDetailArt).not.toHaveBeenCalled();
  });

  it.each([404,403])('does not automatically retry HTTP %s, but allows an explicit retry',status=>{
    const scene=new FakeScene(),refresh=vi.fn();requestJokerArt(scene.phaser,[ids[0]],refresh);
    scene.load.fail(scene.load.requests[0],status);
    for(let i=0;i<5;i++)requestJokerArt(scene.phaser,[ids[0]],refresh);
    vi.runAllTimers();expect(scene.load.requests).toHaveLength(1);
    expect(jokerArtLoadState(scene.phaser,ids[0])).toEqual({status:'failed',attempts:1,reason:`http-${status}`});
    retryJokerArt(scene.phaser,[ids[0]],refresh);retryJokerArt(scene.phaser,[ids[0]],refresh);
    expect(scene.load.requests).toHaveLength(2);scene.load.succeed(scene.load.requests[1]);
    expect(jokerArtLoadState(scene.phaser,ids[0])).toEqual({status:'loaded',attempts:2});
  });

  it('a manual retry replaces a scheduled retry without replenishing its automatic budget',()=>{
    const scene=new FakeScene(),refresh=vi.fn();requestJokerArt(scene.phaser,[ids[0]],refresh);
    scene.load.fail(scene.load.requests[0],0);retryJokerArt(scene.phaser,[ids[0]],refresh);
    vi.advanceTimersByTime(300);expect(scene.load.requests).toHaveLength(2);
    scene.load.fail(scene.load.requests[1],0);vi.runAllTimers();expect(scene.load.requests).toHaveLength(2);
    retryJokerArt(scene.phaser,[ids[0]],refresh);expect(scene.load.requests).toHaveLength(3);
  });

  it('uses the native five-second timeout and terminates after one recovery attempt',()=>{
    const scene=new FakeScene();requestJokerArt(scene.phaser,[ids[0]],vi.fn());
    expect(scene.load.requests[0].settings).toEqual({responseType:'blob',timeout:5000});expect(scene.load.maxRetries).toBe(0);
    vi.advanceTimersByTime(4999);expect(jokerArtLoadState(scene.phaser,ids[0]).status).toBe('loading');
    vi.advanceTimersByTime(1);expect(jokerArtLoadState(scene.phaser,ids[0]).reason).toBe('network-or-timeout');
    vi.advanceTimersByTime(5300);expect(jokerArtLoadState(scene.phaser,ids[0])).toEqual({status:'failed',attempts:2,reason:'network-or-timeout'});
    vi.runAllTimers();expect(scene.load.requests).toHaveLength(2);
  });

  it('never exceeds two thumbnail transfers and waits for all needed thumbnails before detail prefetch',()=>{
    const scene=new FakeScene();requestJokerArt(scene.phaser,[...ids,ids[0]],vi.fn());
    expect(scene.load.requests).toHaveLength(3);expect(scene.load.inflight.size).toBe(2);expect(scene.load.maxParallelDownloads).toBe(2);
    scene.load.succeed(scene.load.requests[0]);expect(prefetchDetailArt).not.toHaveBeenCalled();expect(scene.load.inflight.size).toBe(2);
    scene.load.succeed(scene.load.requests[1]);expect(prefetchDetailArt).not.toHaveBeenCalled();
    scene.load.succeed(scene.load.requests[2]);expect(scene.load.peak).toBe(2);
    expect(vi.mocked(prefetchDetailArt).mock.calls.map(call=>call[0])).toEqual(ids.slice(0,2).map(id=>[jokerArtUrl(id)]));
    requestJokerArt(scene.phaser,ids,vi.fn());expect(prefetchDetailArt).toHaveBeenCalledTimes(2);
  });

  it.each([{reviewed:['f09','f04']},...['pengci','mantangcai','huimaqiang','jiedongfeng'].map(id=>({reviewed:[id]})),...['b07','a09','d06','a04','e04','c05','c02','f03','a03','b02','b04','c04','d01','f02','d10','e01','b05','b10','b08','d05','e03','e06','f05','f11','b06','a11','d04','c07','d11','d08','d09','b12'].map(id=>({reviewed:[id]}))])('does not prefetch reviewed handdrawn HD before opening detail, including cached thumbnails: $reviewed',({reviewed})=>{
    for(const id of reviewed)expect(JOKER_ART.find(art=>art.id===id)?.detailOnDemand).toBe(true);
    const scene=new FakeScene();requestJokerArt(scene.phaser,reviewed,vi.fn());
    expect(scene.load.requests).toHaveLength(reviewed.length);
    for(const file of scene.load.requests)scene.load.succeed(file);
    expect(prefetchDetailArt).not.toHaveBeenCalled();
    requestJokerArt(scene.phaser,reviewed,vi.fn());
    expect(scene.load.requests).toHaveLength(reviewed.length);expect(prefetchDetailArt).not.toHaveBeenCalled();
  });

  it('retries one failed image while the same loader still has unrelated work',()=>{
    const scene=new FakeScene();scene.load.image('unrelated','/unrelated.webp',{responseType:'blob',timeout:5000});scene.load.start();
    requestJokerArt(scene.phaser,[ids[0]],vi.fn());
    // Phaser starts appended work on its next loader update.
    scene.load.start();scene.load.fail(scene.load.requests[1],503);vi.advanceTimersByTime(300);scene.load.start();
    expect(scene.load.requests).toHaveLength(3);expect(scene.load.isLoading()).toBe(true);expect(scene.load.peak).toBe(2);
    scene.load.succeed(scene.load.requests[2]);expect(jokerArtLoadState(scene.phaser,ids[0]).status).toBe('loaded');
  });

  it('marks decode failures terminal when Phaser only emits complete',()=>{
    const scene=new FakeScene();requestJokerArt(scene.phaser,[ids[0]],vi.fn());scene.load.decodeFailure(scene.load.requests[0]);
    expect(jokerArtLoadState(scene.phaser,ids[0])).toEqual({status:'failed',attempts:1,reason:'decode'});
    vi.runAllTimers();expect(scene.load.requests).toHaveLength(1);
    retryJokerArt(scene.phaser,[ids[0]],vi.fn());scene.load.succeed(scene.load.requests[1]);
    expect(jokerArtLoadState(scene.phaser,ids[0]).status).toBe('loaded');
  });

  it('cleans up pending retries/listeners and resets attempts on the same scene object',()=>{
    const scene=new FakeScene(),refresh=vi.fn();requestJokerArt(scene.phaser,[ids[0]],refresh);
    scene.load.fail(scene.load.requests[0],0);scene.shutdown();vi.runAllTimers();
    expect(scene.load.requests).toHaveLength(1);expect(refresh).not.toHaveBeenCalled();expect(scene.load.eventNames()).toEqual([]);
    expect(scene.events.listenerCount('destroy')).toBe(0);expect(jokerArtLoadState(scene.phaser,ids[0])).toEqual({status:'idle',attempts:0});
    scene.enter();requestJokerArt(scene.phaser,[ids[0]],refresh);expect(scene.load.requests).toHaveLength(2);
    expect(jokerArtLoadState(scene.phaser,ids[0])).toEqual({status:'loading',attempts:1});
    scene.load.succeed(scene.load.requests[1]);expect(jokerArtLoadState(scene.phaser,ids[0])).toEqual({status:'loaded',attempts:1});
  });

  it('aborts only owned requests and detaches old XHR/decode callbacks before reentry',()=>{
    const scene=new FakeScene(),refresh=vi.fn();scene.load.image('unrelated','/unrelated.webp',{responseType:'blob',timeout:5000});
    requestJokerArt(scene.phaser,[ids[0]],refresh);const [unrelated,old]=scene.load.requests;
    scene.shutdown();expect(old.xhrLoader!.abort).toHaveBeenCalledOnce();expect(unrelated.xhrLoader!.abort).not.toHaveBeenCalled();
    expect(old.xhrLoader).toMatchObject({onload:null,onerror:null,onprogress:null,ontimeout:null});expect(old.data).toMatchObject({onload:null,onerror:null});
    scene.enter();requestJokerArt(scene.phaser,[ids[0]],refresh);
    scene.load.emit('loaderror',old);scene.load.emit('filecomplete',old.key,'image',old.data);
    expect(jokerArtLoadState(scene.phaser,ids[0])).toEqual({status:'loading',attempts:1});
    scene.load.succeed(scene.load.requests[2]);vi.advanceTimersByTime(0);expect(refresh).toHaveBeenCalledOnce();
  });

  it('uses cached textures without a transfer and returns detached state snapshots',()=>{
    const scene=new FakeScene();scene.cached.add(key(ids[0]));
    expect(jokerArtLoadState(scene.phaser,ids[0])).toEqual({status:'loaded',attempts:0});
    requestJokerArt(scene.phaser,[ids[0]],vi.fn());retryJokerArt(scene.phaser,[ids[0]],vi.fn());expect(scene.load.requests).toEqual([]);
    const snapshot=jokerArtLoadState(scene.phaser,ids[0]);snapshot.status='failed';snapshot.attempts=99;
    expect(jokerArtLoadState(scene.phaser,ids[0])).toEqual({status:'loaded',attempts:0});
  });

  it('resolves explicit retry only after every requested thumbnail is cached',async()=>{
    const scene=new FakeScene(),resolved=vi.fn();
    const result=retryJokerArt(scene.phaser,ids.slice(0,2),vi.fn());void result.then(resolved);
    await Promise.resolve();expect(resolved).not.toHaveBeenCalled();
    scene.load.succeed(scene.load.requests[0]);await Promise.resolve();expect(resolved).not.toHaveBeenCalled();
    scene.load.succeed(scene.load.requests[1]);await expect(result).resolves.toBe(true);expect(resolved).toHaveBeenCalledWith(true);
  });

  it('keeps explicit retry pending through transient recovery but resolves false on terminal failure',async()=>{
    const scene=new FakeScene(),resolved=vi.fn();
    const result=retryJokerArt(scene.phaser,[ids[0]],vi.fn());void result.then(resolved);
    scene.load.fail(scene.load.requests[0],503);await Promise.resolve();expect(resolved).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);scene.load.fail(scene.load.requests[1],404);
    await expect(result).resolves.toBe(false);expect(scene.load.requests).toHaveLength(2);
  });

  it('settles concurrent retry consumers false on shutdown and revokes pending decode URLs',async()=>{
    const scene=new FakeScene(),revoke=vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
    try {
      const first=retryJokerArt(scene.phaser,[ids[0]],vi.fn()),second=retryJokerArt(scene.phaser,[ids[0]],vi.fn());
      expect(scene.load.requests).toHaveLength(1);scene.load.requests[0].data.src='blob:pending-decode';scene.shutdown();
      await expect(first).resolves.toBe(false);await expect(second).resolves.toBe(false);
      expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:pending-decode');
    } finally {revoke.mockRestore();}
  });

  it('settles cached, unregistered, and inactive explicit retries without starting work',async()=>{
    const scene=new FakeScene();scene.cached.add(key(ids[0]));
    await expect(retryJokerArt(scene.phaser,[ids[0]],vi.fn())).resolves.toBe(true);
    await expect(retryJokerArt(scene.phaser,[unregistered],vi.fn())).resolves.toBe(false);
    scene.shutdown();await expect(retryJokerArt(scene.phaser,[ids[0]],vi.fn())).resolves.toBe(false);
    expect(scene.load.requests).toHaveLength(0);
  });

  it('retries only requested failed ids without dropping the visible thumbnail prefetch gate',async()=>{
    const scene=new FakeScene();requestJokerArt(scene.phaser,ids.slice(0,2),vi.fn());
    scene.load.fail(scene.load.requests[0],404);scene.load.fail(scene.load.requests[1],404);
    const result=retryJokerArt(scene.phaser,[ids[0]],vi.fn());expect(scene.load.requests).toHaveLength(3);
    scene.load.succeed(scene.load.requests[2]);await expect(result).resolves.toBe(true);
    expect(jokerArtLoadState(scene.phaser,ids[1]).status).toBe('failed');expect(prefetchDetailArt).not.toHaveBeenCalled();
  });
});


it('releases only obsolete prefetch consumers on shelf changes and all of them on shutdown',()=>{
  const scene=new FakeScene();ids.forEach(id=>scene.cached.add(key(id)));requestJokerArt(scene.phaser,ids,vi.fn());
  const first=vi.mocked(prefetchDetailArt).mock.calls[0][1]!,second=vi.mocked(prefetchDetailArt).mock.calls[1][1]!;
  requestJokerArt(scene.phaser,[ids[1],ids[2]],vi.fn());
  expect(first.aborted).toBe(true);expect(second.aborted).toBe(false);expect(prefetchDetailArt).toHaveBeenCalledTimes(3);
  const third=vi.mocked(prefetchDetailArt).mock.calls[2][1]!;
  scene.shutdown();expect(second.aborted).toBe(true);expect(third.aborted).toBe(true);
});

it('cancels prefetch when the shelf has no registered cards and can revisit the same shelf',()=>{
  const scene=new FakeScene();scene.cached.add(key(ids[0]));requestJokerArt(scene.phaser,[ids[0]],vi.fn());
  const first=vi.mocked(prefetchDetailArt).mock.calls[0][1]!;
  requestJokerArt(scene.phaser,[],vi.fn());expect(first.aborted).toBe(true);
  requestJokerArt(scene.phaser,[ids[0]],vi.fn());expect(prefetchDetailArt).toHaveBeenCalledTimes(2);expect(vi.mocked(prefetchDetailArt).mock.calls[1][1]!.aborted).toBe(false);
});
