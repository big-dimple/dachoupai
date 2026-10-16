import type Phaser from 'phaser';
import type {R2RunState} from '../domain/r2Run';
import {basicChoiceRows} from './BasicToolChoice';
import {toolInfo} from './r2ToolInfo';
import {decodeArtImage,detailArt} from './DetailArt';
import {ImageWarmupQueue,type WarmImage} from './ImageWarmupQueue';

const MAX_THUMBNAILS=16,MAX_DETAILS=4;
const thumbs=new Map<string,HTMLImageElement>(),details=new Map<string,HTMLImageElement>();
const owners=new WeakMap<Phaser.Scene,Owner>();
interface Owner {identity:string;queue:ImageWarmupQueue;stop:()=>void;lastInput:()=>number;panels:number;panelStop?:()=>void}
const allowed=()=>{const c=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection;return !c?.saveData&&!c?.effectiveType?.includes('2g');};
const real=(url:string|undefined):url is string=>!!url&&!url.startsWith('data:');
function keep(cache:Map<string,HTMLImageElement>,key:string,image:HTMLImageElement,limit:number):void {cache.delete(key);cache.set(key,image);while(cache.size>limit)cache.delete(cache.keys().next().value!);}
/** Same actual tool catalog used by the shop, never future stock or the whole asset pack. */
export function shopToolImagePlan(run:R2RunState){
 if(run.phase!=='shop'||!run.shop)return {thumbnails:[] as string[],details:[] as string[]};
 const held=run.consumables.map(c=>toolInfo(c.definitionId,run)),stock=run.shop.toolOffers.map(o=>toolInfo(o.definitionId,run)),basic=basicChoiceRows(run).filter(r=>!r.duplicate).map(r=>r.info);
 return {thumbnails:[...new Set([...held,...stock,...basic].map(i=>i.artUrl).filter(real))].slice(0,MAX_THUMBNAILS),details:[...new Set([...held,...stock].map(i=>i.detailArtUrl).filter(real))].slice(0,2)};
}
/** Idle and input quiet time apply to every decode/transfer, including the single automatic retry. */
export function waitForToolImageIdle(signal:AbortSignal,lastInput:()=>number):Promise<void>{
 return new Promise((resolve,reject)=>{
  let cancel=()=>{};const finish=(error?:Error)=>{cancel();signal.removeEventListener('abort',abort);error?reject(error):resolve();},abort=()=>finish(Error('tool-image-aborted'));
  const schedule=()=>{if(signal.aborted){abort();return;}const work=()=>{if(document.hidden||performance.now()-lastInput()<160){const timer=setTimeout(schedule,document.hidden?180:Math.max(20,160-(performance.now()-lastInput())));cancel=()=>clearTimeout(timer);return;}finish();};if('requestIdleCallback'in window){const id=window.requestIdleCallback(work,{timeout:1200});cancel=()=>window.cancelIdleCallback(id);}else{const timer=setTimeout(work,200);cancel=()=>clearTimeout(timer);}};
  signal.addEventListener('abort',abort,{once:true});schedule();
 });
}
async function prepare(asset:WarmImage,signal:AbortSignal,lastInput:()=>number):Promise<void>{
 const scoped=asset.scope?AbortSignal.any([signal,asset.scope]):signal;
 try{
  await waitForToolImageIdle(scoped,lastInput);
  if(asset.key.startsWith('thumb/')){if(thumbs.has(asset.url))return;const image=await decodeArtImage(asset.url,scoped);if(!scoped.aborted)keep(thumbs,asset.url,image,MAX_THUMBNAILS);}
  else {const src=await detailArt(asset.url,false,scoped);if(scoped.aborted)return;const cached=details.get(asset.url);if(cached?.src===src&&cached.complete)return;const image=await decodeArtImage(src,scoped);if(!scoped.aborted)keep(details,asset.url,image,MAX_DETAILS);}
 }catch(error){if(scoped.aborted)throw Object.assign(Error('tool-image-retired'),{canceled:true,retryable:false});throw error;}
}
/** One two-slot queue per current shop. Scene/stock retirement also releases optional subscribers. */
export function warmShopToolImages(scene:Phaser.Scene,run:R2RunState):void{
 if(!allowed()||run.phase!=='shop'||!run.shop)return;
 const identity=run.runId+'/'+run.shop.visitIndex+'/'+run.shop.rerollCount;let owner=owners.get(scene);
 if(owner?.identity!==identity){owner?.stop();let input=performance.now(),stopped=false;const note=()=>{input=performance.now();};const queue=new ImageWarmupQueue((a,s)=>prepare(a,s,()=>input),()=>{},24);const current:Owner={identity,queue,lastInput:()=>input,panels:0,stop:()=>{if(stopped)return;stopped=true;current.panelStop?.();queue.dispose();window.removeEventListener('pointerdown',note,true);window.removeEventListener('keydown',note,true);scene.events.off('shutdown',current.stop);scene.events.off('destroy',current.stop);if(owners.get(scene)===current)owners.delete(scene);}};owner=current;owners.set(scene,owner);window.addEventListener('pointerdown',note,true);window.addEventListener('keydown',note,true);scene.events.once('shutdown',owner.stop);scene.events.once('destroy',owner.stop);}
 const plan=shopToolImagePlan(run);owner.queue.request(plan.thumbnails.map(url=>({key:'thumb/'+url,url})));owner.queue.request(plan.details.map(url=>({key:'detail/shop/'+url,url})));
}
/** Prepare at most four visible/nearby detail cards; a new viewport retires stale optional work. */
export function warmShopToolPanel(scene:Phaser.Scene,panel:HTMLDialogElement):void{
 const owner=owners.get(scene);if(!owner||!allowed())return;owner.panelStop?.();
 const root=panel.querySelector<HTMLElement>('.dialog-scroll');if(!root)return;const panelId=++owner.panels;let stopped=false,current='',generation=0,scope:AbortController|undefined,hovered:string|undefined,timer:ReturnType<typeof setTimeout>|undefined;
 const update=()=>{clearTimeout(timer);if(stopped||!panel.open||!panel.isConnected)return;const box=root.getBoundingClientRect(),tiles=[...panel.querySelectorAll<HTMLElement>('[data-tool-detail]')].filter(e=>{const r=e.getBoundingClientRect();return e.getClientRects().length&&r.bottom>=box.top-32&&r.top<=box.bottom+32;}).sort((a,b)=>{const center=box.top+box.height/2,one=a.getBoundingClientRect(),two=b.getBoundingClientRect();return Math.abs(one.top+one.height/2-center)-Math.abs(two.top+two.height/2-center);});const urls=[...new Set(tiles.map(e=>e.dataset.toolDetail!).filter(real))];if(hovered&&urls.includes(hovered)){const i=urls.indexOf(hovered);if(i>=0)urls.splice(i,1);urls.unshift(hovered);}const wanted=urls.slice(0,MAX_DETAILS),key=wanted.join('|');if(key===current)return;current=key;scope?.abort();scope=new AbortController();generation++;const signal=scope.signal;owner.queue.request([...wanted].reverse().map(url=>({key:'detail/panel/'+panelId+'/'+generation+'/'+url,url,scope:signal})),true);};
 const changed=()=>{clearTimeout(timer);timer=setTimeout(update,100);};const focus=(event:Event)=>{const tile=(event.target as HTMLElement)?.closest<HTMLElement>('[data-tool-detail]');hovered=tile?.dataset.toolDetail;changed();};
 const observer=new IntersectionObserver(changed,{root,rootMargin:'32px'});for(const tile of panel.querySelectorAll('[data-tool-detail]'))observer.observe(tile);
 const stop=()=>{if(stopped)return;stopped=true;clearTimeout(timer);scope?.abort();observer.disconnect();root.removeEventListener('scroll',changed);panel.removeEventListener('pointerover',focus);panel.removeEventListener('focusin',focus);panel.removeEventListener('close',stop);if(owner.panelStop===stop)owner.panelStop=undefined;};owner.panelStop=stop;
 root.addEventListener('scroll',changed,{passive:true});panel.addEventListener('pointerover',focus);panel.addEventListener('focusin',focus);panel.addEventListener('close',stop,{once:true});changed();
}
