import type Phaser from 'phaser';
import type {R2RunState} from '../domain/r2Run';
import {JOKER_ART,jokerArtKey} from './jokerArt';
import {COURT_ART,HANDDRAWN_ART} from './HanddrawnArt';
import {GOODS_ART,goodsArtUrl} from './GoodsArt';
import {goodsArtKey} from './GoodsArtLoading';
import {CHARACTER_ART} from './CharacterArt';
import {assetUrl,P00_ASSETS} from './theme';
import {ImageWarmupQueue,type WarmImageState} from './ImageWarmupQueue';
import {loadArtTexture} from './ArtTextureLoading';
export interface SceneResource {key:string;url:string;pixels:number}
export const PRELOAD_PIXEL_BUDGET=4*1024*1024; // <=16MiB decoded RGBA; no HD detail or music in this catalog.
const paper=P00_ASSETS.map(a=>({key:a.key,url:assetUrl(a.path),pixels:a.width*a.height}));
const joker=JOKER_ART.map(a=>{const out=HANDDRAWN_ART.find(d=>d.id===a.id)?.outputs.find(o=>o.purpose==='thumbnail');return {key:a.key,url:assetUrl(a.path),pixels:(out?.width??128)*(out?.height??160)};});
const goods=GOODS_ART.flatMap(a=>{const out=a.outputs.find(o=>o.purpose==='thumbnail'),url=goodsArtUrl(a.domainId,a.category as 'tool-card'|'item-card','thumbnail');return out&&url?[{key:goodsArtKey(a.domainId),url,pixels:out.width*out.height}]:[];});
const court=COURT_ART.map(a=>({key:a.key,url:assetUrl(a.path),pixels:256*384}));
const heroes=CHARACTER_ART.map(a=>({key:a.key,url:a.url,pixels:a.width*a.height}));
export function boundedResources(assets:readonly SceneResource[],budget=PRELOAD_PIXEL_BUDGET):SceneResource[]{
 const seen=new Set<string>(),rows:SceneResource[]=[];let pixels=0;
 for(const a of assets){if(!a.url||seen.has(a.key)||a.pixels<=0||pixels+a.pixels>budget)continue;seen.add(a.key);pixels+=a.pixels;rows.push(a);}return rows;
}
/** Fixed public catalog or actual saved holdings/offers only; no future deals, RNG or domain actions. */
export function sceneResources(target:string,run?:R2RunState,startup=false):SceneResource[]{
 const starter=['mantangcai','b10','b03','c04','c06','jiedongfeng'],priority=joker.filter(a=>starter.some(id=>jokerArtKey(id)===a.key));
 if(startup)return boundedResources([...paper,...heroes,...court,...priority,...joker,...goods]);
 if(target==='character-select'||target==='title')return boundedResources(heroes);
 const ids=new Set([...(run?.jokers.map(j=>j.definitionId)??[]),...(target==='shop'?run?.shop?.offers.map(o=>o.definitionId)??[]:[]),...(run?.lastTrace?.sourceJokers.map(j=>j.definitionId)??[])]);
 const goodsIds=new Set([...(run?.consumables.map(j=>j.definitionId)??[]),...(run?.longTermItems??[]),...(target==='shop'?run?.shop?[...run.shop.toolOffers,...run.shop.itemOffers].map(o=>o.definitionId):[]:[])]);
 return boundedResources([...heroes,...court,...joker.filter(a=>[...ids].some(id=>jokerArtKey(id)===a.key)),...goods.filter(a=>goodsIds.has(a.key.slice('goods-art/'.length))),...(target==='shop'&&!run?.shop?priority:[])]);
}
export interface PreparationProgress {total:number;loaded:number;failed:number;pending:number;states:WarmImageState[]}
export function prepareSceneResources(game:Phaser.Game,assets:readonly SceneResource[],changed:(p:PreparationProgress)=>void,signal:AbortSignal,deadline=12000):Promise<PreparationProgress>{
 return new Promise(resolve=>{
  let queue:ImageWarmupQueue|undefined,done=false,timer:ReturnType<typeof setTimeout>|undefined;
  const snapshot=()=>{const states=queue?.snapshot()??[];const loaded=states.filter(s=>s.status==='loaded').length,failed=states.filter(s=>s.status==='failed').length;return {total:assets.length,loaded,failed,pending:assets.length-loaded-failed,states};};
  const finish=()=>{if(done)return;done=true;const p=snapshot();clearTimeout(timer);signal.removeEventListener('abort',finish);queue?.dispose();resolve(p);};
  const refresh=()=>{if(done||!queue)return;const p=snapshot();changed(p);if(!p.pending)finish();};
  queue=new ImageWarmupQueue((a,s)=>loadArtTexture(game,a.key,a.url,s,false),refresh,Math.max(1,assets.length));
  signal.addEventListener('abort',finish,{once:true});if(signal.aborted){finish();return;}
  timer=setTimeout(finish,deadline);queue.request(assets);refresh();
 });
}
