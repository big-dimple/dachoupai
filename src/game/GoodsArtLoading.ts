import type Phaser from 'phaser';
import {detailArt,decodeArtImage,invalidateArt} from './DetailArt';

type Status='idle'|'loading'|'loaded'|'failed';
interface Entry {status:Status;attempts:number;controller?:AbortController;promise?:Promise<boolean>}
const loaders=new WeakMap<Phaser.Scene,GoodsLoads>();
export const goodsArtKey=(id:string)=>'goods-art/'+id;
/** Reuses the bounded fetch/decode queue; no HD prefetch or scene loader listeners. */
class GoodsLoads {
  readonly entries=new Map<string,Entry>();
  private disposed=false;
  constructor(private readonly scene:Phaser.Scene){scene.events.once('shutdown',this.dispose);scene.events.once('destroy',this.dispose);}
  request(id:string,url:string,refresh:()=>void,retry=false):Promise<boolean> {
    if(this.disposed)return Promise.resolve(false);
    const key=goodsArtKey(id);
    if(this.scene.textures.exists(key))return Promise.resolve(true);
    let entry=this.entries.get(id);if(!entry){entry={status:'idle',attempts:0};this.entries.set(id,entry);}
    if(entry.status==='loading')return entry.promise!;
    if(entry.status==='failed'&&!retry)return Promise.resolve(false);
    const controller=new AbortController();entry.controller=controller;entry.status='loading';entry.attempts++;
    const current=entry;let cachedSource:string|undefined;
    return entry.promise=detailArt(url,true,controller.signal).then(src=>{cachedSource=src;return decodeArtImage(src,controller.signal);}).then(image=>{
      if(this.disposed||controller.signal.aborted)return false;
      if(!this.scene.textures.exists(key))this.scene.textures.addImage(key,image);
      current.status=this.scene.textures.exists(key)?'loaded':'failed';refresh();return current.status==='loaded';
    }).catch(()=>{if(!this.disposed&&!controller.signal.aborted){if(cachedSource)invalidateArt(url,cachedSource);current.status='failed';refresh();}return false;});
  }
  private readonly dispose=()=>{
    if(this.disposed)return;this.disposed=true;
    for(const entry of this.entries.values())entry.controller?.abort();this.entries.clear();
    this.scene.events.off('shutdown',this.dispose);this.scene.events.off('destroy',this.dispose);loaders.delete(this.scene);
  };
}
function loader(scene:Phaser.Scene):GoodsLoads {let value=loaders.get(scene);if(!value){value=new GoodsLoads(scene);loaders.set(scene,value);}return value;}
export function requestGoodsArt(scene:Phaser.Scene,id:string,url:string,refresh:()=>void):void {void loader(scene).request(id,url,refresh);}
export function retryGoodsArt(scene:Phaser.Scene,id:string,url:string,refresh:()=>void):Promise<boolean>{return loader(scene).request(id,url,refresh,true);}
export function goodsArtLoadState(scene:Phaser.Scene,id:string):{status:Status;attempts:number}{
  if(scene.textures.exists(goodsArtKey(id)))return {status:'loaded',attempts:loaders.get(scene)?.entries.get(id)?.attempts??0};
  const entry=loaders.get(scene)?.entries.get(id);return {status:entry?.status??'idle',attempts:entry?.attempts??0};
}
