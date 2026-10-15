import {sceneResources} from './SceneResources';
import type Phaser from 'phaser';
import type {R2RunState} from '../domain/r2Run';
import {ImageWarmupQueue,type WarmImage} from './ImageWarmupQueue';
import {imageWarmupStatus} from './ImageWarmupStatus';
import {CHARACTERS,type CharacterId} from './characters';
import {avatarKey,avatarURL,selectionPortraitKey,selectionPortraitURL,portraitURL,portraitKey,portraitFocusKey,portraitFocusURL} from './portraits';
import {COURT_ART} from './HanddrawnArt';
import {JOKER_ART} from './jokerArt';
import {assetUrl} from './theme';
import {loadArtTexture} from './ArtTextureLoading';
import {goodsArtKey} from './GoodsArtLoading';
import {goodsArtUrl} from './GoodsArt';
const queues=new WeakMap<Phaser.Game,ImageWarmupQueue>();
const shops=new WeakMap<Phaser.Game,{identity:string;controller:AbortController}>();
function shopIdentity(game:Phaser.Game):string|undefined {
  const run=game.registry.get('runController')?.state as R2RunState|undefined;
  return run?.phase==='shop'&&run.shop?`${run.runId}/${run.shop.visitIndex}/${run.shop.rerollCount}`:undefined;
}
function retireShop(game:Phaser.Game):void {const old=shops.get(game);if(old&&old.identity!==shopIdentity(game)){old.controller.abort();shops.delete(game);}}

const speculative=()=>{const c=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection;return !c?.saveData&&!c?.effectiveType?.includes('2g');};
/** Shares each texture transfer with visible scene demand, including cold restore. */
async function loadImage(game:Phaser.Game,asset:WarmImage,signal:AbortSignal):Promise<void> {
  try{await loadArtTexture(game,asset.key,asset.url,asset.scope?AbortSignal.any([signal,asset.scope]):signal,asset.visible??false);}
  catch(error){if(asset.scope?.aborted)throw Object.assign(Error('warmup-retired-shop'),{canceled:true,retryable:false});throw error;}
}
function queue(scene:Phaser.Scene):ImageWarmupQueue {
  const game=scene.game;let q=queues.get(game);if(q)return q;
  let status:ReturnType<typeof imageWarmupStatus>|undefined;
  q=new ImageWarmupQueue((asset,signal)=>loadImage(game,asset,signal),()=>status?.refresh());queues.set(game,q);const lowLoad=()=>['title','character-select','shop'].some(key=>game.scene.isActive(key));status=imageWarmupStatus(q,lowLoad);
  const recovered=(key:string)=>q!.markLoaded(key);game.textures.on('addtexture',recovered);
  let visible=lowLoad();const stageChanged=()=>{retireShop(game);const next=lowLoad();if(next!==visible){visible=next;status?.refresh();}};game.events.on('poststep',stageChanged);
  game.events.once('destroy',()=>{game.events.off('poststep',stageChanged);game.textures.off('addtexture',recovered);shops.get(game)?.controller.abort();shops.delete(game);q!.dispose();status?.destroy();queues.delete(game);});return q;
}
/** Fixed portrait/table catalog plus only the actual saved shop and held assets. */
function warmRunImages(scene:Phaser.Scene):void {
  const run=scene.game.registry.get('runController')?.state as R2RunState|undefined;
  if(!run||run.phase!=='shop')return;
  retireShop(scene.game);let current=shops.get(scene.game);if(!current){current={identity:shopIdentity(scene.game)!,controller:new AbortController()};shops.set(scene.game,current);}const scope=current.controller.signal;
  const jokerIds=new Set<string>([...run.jokers.map((j:{definitionId:string})=>j.definitionId),...(run.phase==='shop'?run.shop?.offers.map((o:{definitionId:string})=>o.definitionId)??[]:[])]);
  const jokers=JOKER_ART.filter(art=>jokerIds.has(art.id)).map(art=>({key:art.key,url:assetUrl(art.path)}));
  const goods=[...run.consumables,...run.longTermItems,...(run.phase==='shop'?[...run.shop!.toolOffers,...run.shop!.itemOffers]:[])].flatMap(entry=>{
    const id=typeof entry==='string'?entry:entry.definitionId,url=goodsArtUrl(id,id.startsWith('U')?'item-card':'tool-card','thumbnail');return url?[{key:goodsArtKey(id),url}]:[];
  });
  queue(scene).request([...jokers,...goods].map(asset=>({...asset,visible:true,scope})),true);
}

export function warmOpeningImages(scene:Phaser.Scene):void {
  queue(scene).request(CHARACTERS.flatMap(c=>[{key:selectionPortraitKey(c.id),url:selectionPortraitURL(c.id)},{key:avatarKey(c.id),url:avatarURL(c.id)}]).filter(a=>!!a.url));
  if(speculative())warmRunImages(scene);warmNextSceneImages(scene,'character-select');
}
export function warmHeroImage(scene:Phaser.Scene,id:CharacterId):void {if(!portraitURL(id))return;queue(scene).request([{key:portraitKey(id),url:portraitURL(id),visible:true},{key:portraitFocusKey(id),url:portraitFocusURL(id),visible:true}].filter(a=>!!a.url),true);}
export function warmTableImages(scene:Phaser.Scene,id:CharacterId):void {
  warmRunImages(scene);
  queue(scene).request(COURT_ART.map(a=>({key:a.key,url:assetUrl(a.path)})),true);
  warmHeroImage(scene,id);warmNextSceneImages(scene,'game');
}

export function warmNextSceneImages(scene:Phaser.Scene,target:string):void {
 if(!speculative())return;const run=scene.game.registry.get('runController')?.state as R2RunState|undefined;
 queue(scene).request(sceneResources(target,run).map(a=>({key:a.key,url:a.url})),true);
}
