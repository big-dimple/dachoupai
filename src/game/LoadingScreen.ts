import type Phaser from 'phaser';
import {prepareSceneResources,sceneResources,type PreparationProgress} from './SceneResources';
import type {R2RunState} from '../domain/r2Run';
import {inkSettlingEase} from './inkwaveSpring';
let template:HTMLElement|undefined;
/** Initial HTML is already visible before the application bundle. Native dialog owns keyboard/focus during preparation. */
export class LoadingScreen {
 readonly host:HTMLDialogElement;
 private progress:HTMLProgressElement;
 private caption:HTMLElement;
 private counter:HTMLElement;
 private next:HTMLButtonElement;
 private retry:HTMLButtonElement;
 private motion=matchMedia('(prefers-reduced-motion: reduce)');
 private flourishes:Animation[]=[];
 private lastTotal=-1;
 private lastBeat=0;
 private syncMotion=()=>{
  let reduced=this.motion.matches;
  try{reduced ||= JSON.parse(localStorage.getItem('dachoupai-presentation-v1')??'null')?.reducedMotion===true;}catch{/* Optional preference cannot block preparation. */}
  this.host.dataset.loadMotion=reduced?'reduce':'full';
  if(reduced||document.hidden)this.cancelFlourishes();
  this.host.toggleAttribute('data-load-paused',document.hidden);
 };
 private cancelFlourishes(){for(const a of this.flourishes)a.cancel();this.flourishes=[];}
 constructor(title='为你铺开这一局'){
  let host=document.querySelector<HTMLDialogElement>('#resource-loading');
  if(!template&&host)template=host.cloneNode(true) as HTMLElement;
  if(!host){host=template?.cloneNode(true) as HTMLDialogElement;if(!host){host=document.createElement('dialog');host.id='resource-loading';host.innerHTML='<h1>唐宋牌</h1><h2 data-load-title></h2><progress></progress><p data-load-caption></p><p data-load-counter></p><button data-load-retry>重试缺图</button><button data-load-next>继续</button>'; }document.body.append(host);}
  this.host=host;this.progress=host.querySelector('progress')!;this.caption=host.querySelector('[data-load-caption]')!;this.counter=host.querySelector('[data-load-counter]')!;this.next=host.querySelector('[data-load-next]')!;this.retry=host.querySelector('[data-load-retry]')!;
  host.querySelector('[data-load-title]')!.textContent=title;this.next.hidden=true;this.retry.hidden=true;
  this.syncMotion();this.motion.addEventListener('change',this.syncMotion);document.addEventListener('visibilitychange',this.syncMotion);
  if(host.open)host.close();host.showModal();host.addEventListener('cancel',e=>e.preventDefault());
 }
 update(p:PreparationProgress,label='准备常用牌面'){
  this.progress.max=Math.max(1,p.total);this.progress.value=p.loaded;this.caption.textContent=label;this.counter.textContent=`已解码 ${p.loaded} / ${p.total}`+(p.failed?` · ${p.failed} 张暂未就绪`:'');this.host.dataset.loaded=String(p.loaded);this.host.dataset.total=String(p.total);
  // Three decorative beats follow decoded counts only. No elapsed-time progress or entrance gate.
  const ratio=p.total?Math.min(1,p.loaded/p.total):0,beat=ratio===1?3:ratio>=.5?2:ratio>0?1:0;
  this.host.style.setProperty('--load-ratio',String(ratio));
  if(p.total!==this.lastTotal){this.lastBeat=0;this.lastTotal=p.total;this.cancelFlourishes();}
  const cards=this.host.querySelectorAll<HTMLElement>('.load-card-seat');
  this.host.querySelectorAll('.load-chapters span').forEach((e,i)=>e.classList.toggle('is-inked',i<beat));
  cards.forEach((card,i)=>card.classList.toggle('is-inked',i<beat));
  if(beat>this.lastBeat&&this.host.dataset.loadMotion!=='reduce'&&!document.hidden){
   this.cancelFlourishes();
   // Reuse the attributed Inkwave spring lookup on ornaments only; DOM lettering stays unscaled.
   const ease=inkSettlingEase(.5);
   for(let i=this.lastBeat;i<beat;i++){
    const echo=cards[i]?.querySelector('.load-card-echo');
    if(echo?.animate)this.flourishes.push(echo.animate(Array.from({length:31},(_,n)=>({offset:n/30,transform:`scale(${1+.35*ease(n/30)})`,opacity:.65*(1-n/30)})),{duration:650,easing:'linear'}));
   }
  }
  this.lastBeat=beat;
 }
 base(loaded:number,total:number){this.update({loaded,total,failed:0,pending:total-loaded,states:[]},'铺好纸面与纹样');}
 allowContinue(run:()=>void){this.next.hidden=false;this.next.textContent='先用文字牌面进入';this.next.onclick=run;}
 choice(p:PreparationProgress,signal:AbortSignal):Promise<'retry'|'continue'>{
  this.update(p,'部分卡面尚未就绪，规则和文字牌面仍可使用');this.retry.hidden=false;this.next.hidden=false;this.next.textContent='使用文字牌面继续';
  return new Promise(resolve=>{const finish=(v:'retry'|'continue')=>{signal.removeEventListener('abort',abort);resolve(v);},abort=()=>finish('continue');signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}this.retry.onclick=()=>finish('retry');this.next.onclick=()=>finish('continue');});
 }
 busy(){this.retry.hidden=true;this.next.hidden=true;this.retry.onclick=null;this.next.onclick=null;}
 close(){this.cancelFlourishes();this.motion.removeEventListener('change',this.syncMotion);document.removeEventListener('visibilitychange',this.syncMotion);this.retry.onclick=null;this.next.onclick=null;if(this.host.isConnected)this.host.close();this.host.remove();}
}
type Preparation={key:string;cancel:()=>void;promise:Promise<boolean>};
const pending=new WeakMap<Phaser.Game,Preparation>();
const textOnly=new WeakMap<Phaser.Game,Set<string>>();
/** Shared decoded texture cache; stale navigation and game destruction release only this batch's leases. */
export function prepareDestination(game:Phaser.Game,key:string,startup=false,existing?:LoadingScreen):Promise<boolean>{
 const old=pending.get(game);if(old?.key===key)return old.promise;old?.cancel();
 const run=game.registry.get('runController')?.state as R2RunState|undefined;
 const omitted=textOnly.get(game)??new Set<string>();textOnly.set(game,omitted);
 const assets=sceneResources(key,run,startup).filter(a=>!omitted.has(a.key)||game.textures.exists(a.key));
 const degrade=(p:PreparationProgress)=>{for(const s of p.states)if(s.status!=='loaded')omitted.add(s.key);};
 if(!existing&&assets.every(a=>game.textures.exists(a.key)))return Promise.resolve(true);
 const view=existing??new LoadingScreen(key==='game'?'牌桌已铺好，准备入场':key==='shop'?'备好这一场的现货':'为你铺开这一局');
 const owner=new AbortController(),cancel=()=>{owner.abort();view.close();};
 let skipped=false;const record={key,total:assets.length,loaded:0,failed:0,pending:assets.length,keys:assets.map(a=>a.key),status:'loading'};
 game.registry.set('resourcePreparation',record);game.events.once('destroy',cancel);
 const entry:Preparation={key,cancel,promise:Promise.resolve(false)};
 entry.promise=(async()=>{try{for(;;){view.busy();const controller=new AbortController(),abort=()=>controller.abort();owner.signal.addEventListener('abort',abort,{once:true});
  view.allowContinue(()=>{skipped=true;controller.abort();});
  const result=await prepareSceneResources(game,assets,p=>{Object.assign(record,{loaded:p.loaded,failed:p.failed,pending:p.pending});view.update(p);},controller.signal);
  owner.signal.removeEventListener('abort',abort);if(owner.signal.aborted)return false;
  if(skipped||!result.failed&&!result.pending){record.status=skipped?'text-mode':'ready';if(skipped)degrade(result);return true;}
  record.status='needs-choice';const choice=await view.choice(result,owner.signal);if(owner.signal.aborted)return false;if(choice==='continue'){record.status='text-mode';degrade(result);return true;}
 }}finally{view.close();game.events.off('destroy',cancel);if(pending.get(game)===entry)pending.delete(game);}})();
 pending.set(game,entry);return entry.promise;
}
