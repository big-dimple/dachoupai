import type Phaser from 'phaser';
import {JOKER_ART,jokerArtUrl} from './jokerArt';
import {assetUrl} from './theme';
import {prefetchDetailArt} from './DetailArt';

export interface JokerArtLoadState {
  status:'unregistered'|'idle'|'loading'|'loaded'|'failed';
  attempts:number;
  reason?:string;
}
type Art=typeof JOKER_ART[number];
interface Entry extends JokerArtLoadState {
  retried:boolean;
  file?:Phaser.Loader.File;
  retryTimer?:ReturnType<typeof setTimeout>;
}
interface Completion {ids:string[];resolve:(loaded:boolean)=>void}
const loaders=new WeakMap<Phaser.Scene,ThumbnailLoads>();
const registered=(id:string)=>JOKER_ART.find(art=>art.id===id);
const transient=(status:number)=>status===0||status===408||status===429||status>=500&&status<=599;

/** One loader lifecycle per scene entry, including when Phaser reuses the same Scene. */
class ThumbnailLoads {
  readonly entries=new Map<string,Entry>();
  private wanted:string[]=[];
  private prefetched=new Map<string,AbortController>();
  private readonly completions=new Set<Completion>();
  private refresh:()=>void=()=>{};
  private refreshTimer?:ReturnType<typeof setTimeout>;
  private disposed=false;
  constructor(private readonly scene:Phaser.Scene){
    scene.load.on('addfile',this.added);
    scene.load.on('filecomplete',this.loaded);
    scene.load.on('loaderror',this.failed);
    scene.load.on('complete',this.complete);
    scene.events.once('shutdown',this.shutdown);
    scene.events.once('destroy',this.shutdown);
  }
  request(ids:readonly string[],refresh:()=>void,manual=false):void {
    const requested=[...new Set(ids)].filter(id=>registered(id));
    this.wanted=manual?[...new Set([...this.wanted,...requested])]:requested;this.refresh=refresh;
    for(const id of this.wanted){
      const art=registered(id)!;
      let entry=this.entries.get(id);
      if(!entry){entry={status:'idle',attempts:0,retried:false};this.entries.set(id,entry);}
      if(this.scene.textures.exists(art.key)){this.markLoaded(entry);continue;}
      if(entry.status==='loaded')entry.status='idle';
      if(entry.status==='idle'||manual&&requested.includes(id)&&entry.status==='failed')this.enqueue(art,entry);
    }
    this.start();this.prefetch();this.settle();
  }
  completion(ids:readonly string[]):Promise<boolean> {
    const registeredIds=[...new Set(ids)].filter(id=>registered(id));
    if(this.disposed||!registeredIds.length)return Promise.resolve(false);
    return new Promise(resolve=>{this.completions.add({ids:registeredIds,resolve});this.settle();});
  }
  private settle():void {
    for(const completion of this.completions){
      const loaded=completion.ids.every(id=>this.scene.textures.exists(registered(id)!.key));
      const failed=completion.ids.some(id=>{const entry=this.entries.get(id);return entry?.status==='failed'&&entry.retryTimer===undefined;});
      if(this.disposed||loaded||failed){this.completions.delete(completion);completion.resolve(!this.disposed&&loaded);}
    }
  }
  private enqueue(art:Art,entry:Entry):void {
    clearTimeout(entry.retryTimer);entry.retryTimer=undefined;
    entry.status='loading';entry.reason=undefined;entry.file=undefined;entry.attempts++;
    this.scene.load.maxParallelDownloads=2;this.scene.load.maxRetries=0;
    this.scene.load.image(art.key,assetUrl(art.path),{responseType:'blob',timeout:5000});
  }
  private start():void {
    if([...this.entries.values()].some(entry=>entry.status==='loading')&&!this.scene.load.isLoading())this.scene.load.start();
  }
  private readonly added=(key:string,type:string,_loader:Phaser.Loader.LoaderPlugin,file:Phaser.Loader.File)=>{
    if(this.disposed||type!=='image')return;
    const art=JOKER_ART.find(candidate=>candidate.key===key),entry=art&&this.entries.get(art.id);
    if(entry?.status==='loading'&&!entry.file)entry.file=file;
  };
  private readonly loaded=(key:string,type:string,data:unknown)=>{
    if(this.disposed||type!=='image')return;
    const art=JOKER_ART.find(candidate=>candidate.key===key),entry=art&&this.entries.get(art.id);
    if(!entry||entry.status!=='loading'||entry.file&&entry.file.data!==data)return;
    if(this.scene.textures.exists(key)){this.markLoaded(entry);this.notify();this.prefetch();}
  };
  private readonly failed=(file:Phaser.Loader.File)=>{
    if(this.disposed)return;
    const art=JOKER_ART.find(candidate=>candidate.key===file.key),entry=art&&this.entries.get(art.id);
    if(!art||!entry||entry.status!=='loading'||entry.file!==file)return;
    const status=file.xhrLoader?.status??0;
    // Phaser discards the original error event, so status 0 cannot distinguish timeout/network.
    this.markFailed(art,entry,status?`http-${status}`:'network-or-timeout',transient(status));
  };
  private readonly complete=()=>{
    if(this.disposed)return;
    // Image decoding errors emit no loaderror/filecomplete; cache presence is authoritative.
    for(const [id,entry] of this.entries)if(entry.status==='loading'){
      const art=registered(id)!;
      if(this.scene.textures.exists(art.key))this.markLoaded(entry);
      else this.markFailed(art,entry,'decode',false);
    }
    this.notify();this.prefetch();
  };
  private markLoaded(entry:Entry):void {
    clearTimeout(entry.retryTimer);entry.retryTimer=undefined;
    entry.status='loaded';entry.reason=undefined;entry.file=undefined;this.settle();
  }
  private markFailed(art:Art,entry:Entry,reason:string,retry:boolean):void {
    entry.status='failed';entry.reason=reason;
    if(retry&&!entry.retried&&this.wanted.includes(art.id)){
      entry.retried=true;
      entry.retryTimer=setTimeout(()=>{
        entry.retryTimer=undefined;
        if(this.disposed||!this.scene.scene.isActive()||!this.wanted.includes(art.id)){this.settle();return;}
        if(this.scene.textures.exists(art.key))this.markLoaded(entry);
        else if(entry.status==='failed'){this.enqueue(art,entry);this.start();}
        this.notify();this.prefetch();
      },300);
    }
    this.notify();this.settle();
  }
  private notify():void {
    if(this.refreshTimer!==undefined)return;
    this.refreshTimer=setTimeout(()=>{this.refreshTimer=undefined;if(!this.disposed&&this.scene.scene.isActive())this.refresh();},0);
  }
  private prefetch():void {
    const needed=this.wanted.map(id=>registered(id)!),desired=needed.slice(0,2).flatMap(art=>jokerArtUrl(art.id)??[]);
    for(const [url,controller] of this.prefetched)if(!desired.includes(url)){controller.abort();this.prefetched.delete(url);}
    if(!needed.length||needed.some(art=>!this.scene.textures.exists(art.key)))return;
    const urls=needed.slice(0,2).flatMap(art=>{const url=jokerArtUrl(art.id);return url&&!this.prefetched.has(url)?[url]:[];});
    for(const url of urls){const controller=new AbortController();this.prefetched.set(url,controller);prefetchDetailArt([url],controller.signal);}
  }
  private readonly shutdown=()=>{
    if(this.disposed)return;this.disposed=true;clearTimeout(this.refreshTimer);
    for(const controller of this.prefetched.values())controller.abort();this.prefetched.clear();
    this.scene.load.off('addfile',this.added);this.scene.load.off('filecomplete',this.loaded);this.scene.load.off('loaderror',this.failed);this.scene.load.off('complete',this.complete);
    this.scene.events.off('shutdown',this.shutdown);this.scene.events.off('destroy',this.shutdown);
    for(const entry of this.entries.values()){
      clearTimeout(entry.retryTimer);
      const file=entry.file;if(!file)continue;
      // Phaser reset clears its queues but leaves XHR and image-decode callbacks alive.
      const xhr=file.xhrLoader;if(xhr){xhr.onload=null;xhr.onerror=null;xhr.onprogress=null;xhr.ontimeout=null;xhr.abort();}
      const image=file.data as HTMLImageElement|undefined;
      if(image){image.onload=null;image.onerror=null;if(image.src?.startsWith('blob:'))URL.revokeObjectURL(image.src);}
    }
    this.settle();this.entries.clear();loaders.delete(this.scene);
  };
}

/** Read-only state: unregistered cards intentionally use the mechanism illustration. */
export function jokerArtLoadState(scene:Phaser.Scene,id:string):JokerArtLoadState {
  const art=registered(id);if(!art)return {status:'unregistered',attempts:0};
  const entry=loaders.get(scene)?.entries.get(id),attempts=entry?.attempts??0;
  if(scene.textures.exists(art.key))return {status:'loaded',attempts};
  return {status:entry?.status==='loaded'?'idle':entry?.status??'idle',attempts,...(entry?.reason?{reason:entry.reason}:{})};
}
/** Visible shelf / owned rack only; one automatic transient retry per card and scene entry. */
export function requestJokerArt(scene:Phaser.Scene,ids:readonly string[],refresh:()=>void):void {
  // Scene.create runs before isActive() becomes true; settings.active already tracks entry/shutdown.
  if(!scene.sys.settings.active)return;
  let loader=loaders.get(scene);
  if(!loader){if(!ids.some(id=>registered(id)))return;loader=new ThumbnailLoads(scene);loaders.set(scene,loader);}
  loader.request(ids,refresh);
}
/** Settles after recovery/terminal failure/shutdown; redraws never reset the retry budget. */
export function retryJokerArt(scene:Phaser.Scene,ids:readonly string[],refresh:()=>void):Promise<boolean> {
  if(!scene.sys.settings.active)return Promise.resolve(false);
  let loader=loaders.get(scene);
  if(loader)loader.request(ids,refresh,true);else {requestJokerArt(scene,ids,refresh);loader=loaders.get(scene);}
  return loader?.completion(ids)??Promise.resolve(false);
}
