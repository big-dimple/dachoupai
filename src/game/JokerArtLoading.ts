import type Phaser from 'phaser';
import {JOKER_ART} from './jokerArt';
import {assetUrl} from './theme';
import {loadArtTexture} from './ArtTextureLoading';

export interface JokerArtLoadState {status:'unregistered'|'idle'|'loading'|'loaded'|'failed';attempts:number;reason?:string}
interface Entry extends JokerArtLoadState {retried:boolean;controller?:AbortController;promise?:Promise<boolean>;timer?:ReturnType<typeof setTimeout>}
const loaders=new WeakMap<Phaser.Scene,ThumbnailLoads>();
const registered=(id:string)=>JOKER_ART.find(art=>art.id===id);
class ThumbnailLoads {
  readonly entries=new Map<string,Entry>();
  private wanted=new Set<string>();
  private disposed=false;
  private refresh=()=>{};
  private refreshTimer?:ReturnType<typeof setTimeout>;
  constructor(private readonly scene:Phaser.Scene){scene.events.once('shutdown',this.shutdown);scene.events.once('destroy',this.shutdown);}
  request(ids:readonly string[],refresh:()=>void,manual=false):Promise<boolean> {
    this.refresh=refresh;const wanted=[...new Set(ids)].filter(id=>registered(id));
    if(!manual)this.wanted=new Set(wanted);else wanted.forEach(id=>this.wanted.add(id));
    // Old rerolled offers release their request; a shared warmup/other scene lease survives.
    for(const [id,entry] of this.entries)if(!this.wanted.has(id)&&(entry.status==='loading'||entry.timer!==undefined)){entry.controller?.abort();clearTimeout(entry.timer);this.entries.delete(id);}
    return Promise.all(wanted.map(id=>this.requestOne(id,manual))).then(values=>!!values.length&&values.every(Boolean));
  }
  private requestOne(id:string,manual=false):Promise<boolean> {
    if(this.disposed)return Promise.resolve(false);
    const art=registered(id)!;
    let entry=this.entries.get(id);if(!entry){entry={status:'idle',attempts:0,retried:false};this.entries.set(id,entry);}
    if(this.scene.textures.exists(art.key)){entry.status='loaded';entry.reason=undefined;return Promise.resolve(true);}
    if(entry.status==='loading'||entry.timer!==undefined)return entry.promise!;
    if(entry.status==='failed'&&!manual)return Promise.resolve(false);
    clearTimeout(entry.timer);entry.timer=undefined;entry.status='loading';entry.reason=undefined;entry.attempts++;
    const controller=new AbortController();entry.controller=controller;const current=entry;
    return entry.promise=loadArtTexture(this.scene.game,art.key,assetUrl(art.path),controller.signal).then(()=>{
      if(this.disposed||controller.signal.aborted)return false;
      current.status='loaded';current.reason=undefined;this.notify();return true;
    },error=>{
      if(this.disposed||controller.signal.aborted)return false;
      current.status='failed';current.reason=String(error?.message??'network');this.notify();
      if(!current.retried&&error?.retryable!==false&&this.wanted.has(id)){
        current.retried=true;
        return new Promise<boolean>(resolve=>{
          const abort=()=>{clearTimeout(current.timer);current.timer=undefined;resolve(false);};controller.signal.addEventListener('abort',abort,{once:true});
          current.timer=setTimeout(()=>{current.timer=undefined;controller.signal.removeEventListener('abort',abort);
            if(this.disposed||!this.wanted.has(id)){resolve(false);return;}
            current.status='idle';resolve(this.requestOne(id));
          },300);
        });
      }
      this.notify();return false;
    });
  }
  private notify():void {
    if(this.refreshTimer!==undefined)return;
    this.refreshTimer=setTimeout(()=>{this.refreshTimer=undefined;if(!this.disposed&&this.scene.scene.isActive())this.refresh();},0);
  }
  private readonly shutdown=()=>{
    if(this.disposed)return;this.disposed=true;clearTimeout(this.refreshTimer);
    for(const entry of this.entries.values()){entry.controller?.abort();clearTimeout(entry.timer);}
    this.entries.clear();this.scene.events.off('shutdown',this.shutdown);this.scene.events.off('destroy',this.shutdown);loaders.delete(this.scene);
  };
}
export function jokerArtLoadState(scene:Phaser.Scene,id:string):JokerArtLoadState {
  const art=registered(id);if(!art)return {status:'unregistered',attempts:0};
  const entry=loaders.get(scene)?.entries.get(id),attempts=entry?.attempts??0;
  if(scene.textures.exists(art.key))return {status:'loaded',attempts};
  return {status:entry?.status==='loaded'?'idle':entry?.status??'idle',attempts,...(entry?.reason?{reason:entry.reason}:{})};
}
function loader(scene:Phaser.Scene):ThumbnailLoads {let value=loaders.get(scene);if(!value){value=new ThumbnailLoads(scene);loaders.set(scene,value);}return value;}
export function requestJokerArt(scene:Phaser.Scene,ids:readonly string[],refresh:()=>void):void {
  if(!scene.sys.settings.active||!ids.some(id=>registered(id)))return;
  void loader(scene).request(ids,refresh);
}
export function retryJokerArt(scene:Phaser.Scene,ids:readonly string[],refresh:()=>void):Promise<boolean> {
  if(!scene.sys.settings.active)return Promise.resolve(false);return loader(scene).request(ids,refresh,true);
}
