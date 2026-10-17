import type Phaser from 'phaser';
import {decodeArtImage,detailArt,invalidateArt} from './DetailArt';
import {jokerArtKey,jokerArtUrl} from './jokerArt';
import {HANDDRAWN_ART} from './HanddrawnArt';

const keyFor=(id:string)=>'shop-joker-detail/'+id;
interface Entry {controller:AbortController;status:'loading'|'loaded'|'failed'}
const owners=new WeakMap<Phaser.Scene,GalleryArt>();
/** Only the currently visible PC gallery leases detail textures. The normal thumbnail path stays immediate. */
class GalleryArt {
 private readonly entries=new Map<string,Entry>();
 private disposed=false;
 private refresh=()=>{};
 constructor(private readonly scene:Phaser.Scene){scene.events.once('shutdown',this.dispose);scene.events.once('destroy',this.dispose);}
 request(ids:readonly string[],refresh:()=>void):void {
  this.refresh=refresh;const wanted=new Set(ids.filter(id=>jokerArtUrl(id)));
  for(const [id,entry] of this.entries)if(!wanted.has(id)){entry.controller.abort();this.entries.delete(id);this.scene.textures.remove(keyFor(id));}
  for(const id of wanted){
   if(this.disposed||this.entries.has(id))continue;
   const controller=new AbortController(),entry:Entry={controller,status:'loading'},url=jokerArtUrl(id)!;this.entries.set(id,entry);
   void detailArt(url,true,controller.signal).then(async src=>{
    let image:HTMLImageElement;
    try{image=await decodeArtImage(src,controller.signal);}catch(error){if(!controller.signal.aborted)invalidateArt(url,src);throw error;}
    if(this.disposed||controller.signal.aborted||this.entries.get(id)!==entry||!this.scene.sys.settings.active)return;
    const expected=HANDDRAWN_ART.find(a=>a.id===id&&a.category==='functional-card')?.outputs.find(o=>o.purpose==='detail');
    if(!expected||image.naturalWidth!==expected.width||image.naturalHeight!==expected.height){invalidateArt(url,src);throw Error('gallery-detail-dimensions');}
    if(!this.scene.textures.exists(keyFor(id)))this.scene.textures.addImage(keyFor(id),image);
    entry.status='loaded';this.refresh();
   }).catch(()=>{if(!controller.signal.aborted)entry.status='failed';});
  }
 }
 private readonly dispose=()=>{
  if(this.disposed)return;this.disposed=true;
  for(const [id,entry] of this.entries){entry.controller.abort();this.scene.textures.remove(keyFor(id));}
  this.entries.clear();this.scene.events.off('shutdown',this.dispose);this.scene.events.off('destroy',this.dispose);owners.delete(this.scene);
 };
}
export function requestShopJokerGalleryArt(scene:Phaser.Scene,ids:readonly string[],refresh:()=>void):void {
 let owner=owners.get(scene);if(!scene.sys.settings.active)return;if(!owner){if(!ids.length)return;owner=new GalleryArt(scene);owners.set(scene,owner);}owner.request(ids,refresh);
}
export function shopJokerPictureKey(scene:Phaser.Scene,id:string,box:{width:number;height:number}):string|undefined {
 const detail=keyFor(id);return (box.width>128||box.height>160)&&scene.textures.exists(detail)?detail:jokerArtKey(id);
}
