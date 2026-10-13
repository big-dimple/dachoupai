import type Phaser from 'phaser';
import {ImageWarmupQueue,type WarmImage} from './ImageWarmupQueue';
import {imageWarmupStatus} from './ImageWarmupStatus';
import {CHARACTERS,type CharacterId} from './characters';
import {avatarKey,avatarURL,selectionPortraitKey,selectionPortraitURL,portraitURL} from './portraits';
import {COURT_ART} from './HanddrawnArt';
import {JOKER_ART} from './jokerArt';
import {assetUrl} from './theme';
const queues=new WeakMap<Phaser.Game,ImageWarmupQueue>();
const speculative=()=>{const c=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection;return !c?.saveData&&!c?.effectiveType?.includes('2g');};
/** One deadline covers response, bounded body and decode. Late work never publishes a texture. */
async function loadImage(game:Phaser.Game,asset:WarmImage,signal:AbortSignal):Promise<void> {
  if(game.textures.exists(asset.key))return;
  const controller=new AbortController(),abort=()=>controller.abort(),image=new Image();let url:string|undefined;
  signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  const deadline=setTimeout(abort,4500);let cancel!:()=>void;
  const canceled=new Promise<never>((_,reject)=>{cancel=()=>reject(Error('warmup-canceled'));controller.signal.addEventListener('abort',cancel,{once:true});if(controller.signal.aborted)cancel();});
  const transfer=async()=>{
    const response=await fetch(asset.url,{signal:controller.signal,credentials:'same-origin',priority:'low'});
    if(!response.ok)throw Object.assign(Error('warmup-http'),{retryable:response.status===408||response.status===429||response.status>=500});
    if(Number(response.headers.get('content-length'))>128*1024)throw Error('warmup-budget');
    const reader=response.body?.getReader();if(!reader)throw Error('warmup-body');
    const chunks:Uint8Array[]=[];let bytes=0;
    try{while(true){const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(bytes>128*1024){await reader.cancel();throw Error('warmup-budget');}chunks.push(next.value);}}finally{reader.releaseLock();}
    if(controller.signal.aborted)throw Error('warmup-canceled');
    url=URL.createObjectURL(new Blob(chunks as BlobPart[],{type:'image/webp'}));image.decoding='async';image.src=url;await image.decode();
    if(controller.signal.aborted||image.naturalWidth*image.naturalHeight>600000)throw Error('warmup-decode');
    if(!game.textures.exists(asset.key))game.textures.addImage(asset.key,image);
  };
  try{await Promise.race([transfer(),canceled]);}catch(error){controller.abort();throw error;}
  finally{clearTimeout(deadline);signal.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',cancel);if(url)URL.revokeObjectURL(url);}
}
function queue(scene:Phaser.Scene):ImageWarmupQueue {
  const game=scene.game;let q=queues.get(game);if(q)return q;
  let status:ReturnType<typeof imageWarmupStatus>|undefined;
  q=new ImageWarmupQueue((asset,signal)=>loadImage(game,asset,signal),()=>status?.refresh());queues.set(game,q);status=imageWarmupStatus(q);
  game.events.once('destroy',()=>{q!.dispose();status?.destroy();queues.delete(game);});return q;
}
/** Fixed 24-texture catalog: 12 previews, 6 chosen portraits, 3 starters, 3 court faces. */
export function warmOpeningImages(scene:Phaser.Scene):void {
  queue(scene).request(CHARACTERS.flatMap(c=>[{key:selectionPortraitKey(c.id),url:selectionPortraitURL(c.id)},{key:avatarKey(c.id),url:avatarURL(c.id)}]));
  if(speculative())queue(scene).request(JOKER_ART.filter(a=>['mantangcai','c04','c06'].includes(a.id)).map(a=>({key:a.key,url:assetUrl(a.path)})));
}
export function warmHeroImage(scene:Phaser.Scene,id:CharacterId):void {queue(scene).request([{key:'opening-portrait-'+id,url:portraitURL(id)}],true);}
export function warmTableImages(scene:Phaser.Scene,id:CharacterId):void {
  queue(scene).request(COURT_ART.map(a=>({key:a.key,url:assetUrl(a.path)})),true);
  warmHeroImage(scene,id);
}
