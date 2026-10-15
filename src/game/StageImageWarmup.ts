import type Phaser from 'phaser';
import type {R2RunState} from '../domain/r2Run';
import {ImageWarmupQueue,type WarmImage} from './ImageWarmupQueue';
import {imageWarmupStatus} from './ImageWarmupStatus';
import {CHARACTERS,type CharacterId} from './characters';
import {avatarKey,avatarURL,selectionPortraitKey,selectionPortraitURL,portraitURL} from './portraits';
import {COURT_ART} from './HanddrawnArt';
import {JOKER_ART} from './jokerArt';
import {assetUrl} from './theme';
import {loadArtTexture} from './ArtTextureLoading';
import {goodsArtKey} from './GoodsArtLoading';
import {goodsArtUrl} from './GoodsArt';
const queues=new WeakMap<Phaser.Game,ImageWarmupQueue>();
const speculative=()=>{const c=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection;return !c?.saveData&&!c?.effectiveType?.includes('2g');};
/** Shares each texture transfer with visible scene demand, including cold restore. */
const loadImage=(game:Phaser.Game,asset:WarmImage,signal:AbortSignal)=>loadArtTexture(game,asset.key,asset.url,signal,asset.visible??false);
function queue(scene:Phaser.Scene):ImageWarmupQueue {
  const game=scene.game;let q=queues.get(game);if(q)return q;
  let status:ReturnType<typeof imageWarmupStatus>|undefined;
  q=new ImageWarmupQueue((asset,signal)=>loadImage(game,asset,signal),()=>status?.refresh());queues.set(game,q);const lowLoad=()=>['title','character-select','shop'].some(key=>game.scene.isActive(key));status=imageWarmupStatus(q,lowLoad);
  let visible=lowLoad();const stageChanged=()=>{const next=lowLoad();if(next!==visible){visible=next;status?.refresh();}};game.events.on('poststep',stageChanged);
  game.events.once('destroy',()=>{game.events.off('poststep',stageChanged);q!.dispose();status?.destroy();queues.delete(game);});return q;
}
/** Fixed portrait/table catalog plus only the actual saved shop and held assets. */
function warmRunImages(scene:Phaser.Scene):void {
  const run=scene.game.registry.get('runController')?.state as R2RunState|undefined;
  if(!run)return;
  const jokerIds=new Set<string>([...run.jokers.map((j:{definitionId:string})=>j.definitionId),...(run.phase==='shop'?run.shop?.offers.map((o:{definitionId:string})=>o.definitionId)??[]:[])]);
  const jokers=JOKER_ART.filter(art=>jokerIds.has(art.id)).map(art=>({key:art.key,url:assetUrl(art.path)}));
  const goods=[...run.consumables,...run.longTermItems,...(run.phase==='shop'?[...run.shop!.toolOffers,...run.shop!.itemOffers]:[])].flatMap(entry=>{
    const id=typeof entry==='string'?entry:entry.definitionId,url=goodsArtUrl(id,id.startsWith('U')?'item-card':'tool-card','thumbnail');return url?[{key:goodsArtKey(id),url}]:[];
  });
  queue(scene).request([...jokers,...goods].map(asset=>({...asset,visible:true})),true);
}

export function warmOpeningImages(scene:Phaser.Scene):void {
  queue(scene).request(CHARACTERS.flatMap(c=>[{key:selectionPortraitKey(c.id),url:selectionPortraitURL(c.id)},{key:avatarKey(c.id),url:avatarURL(c.id)}]));
  if(speculative())warmRunImages(scene);
}
export function warmHeroImage(scene:Phaser.Scene,id:CharacterId):void {queue(scene).request([{key:'opening-portrait-'+id,url:portraitURL(id),visible:true}],true);}
export function warmTableImages(scene:Phaser.Scene,id:CharacterId):void {
  warmRunImages(scene);
  queue(scene).request(COURT_ART.map(a=>({key:a.key,url:assetUrl(a.path)})),true);
  warmHeroImage(scene,id);
}
