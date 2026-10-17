import type Phaser from 'phaser';
import {prepareSceneResources,sceneResources,type PreparationProgress} from './SceneResources';
import type {R2RunState} from '../domain/r2Run';
import {inkSettlingEase} from './inkwaveSpring';
import {ResourceRecovery,type RecoveryProgress} from './ResourceRecovery';
import {LoadingProgress} from './LoadingProgress';
let template:HTMLElement|undefined;
/** Initial HTML is already visible before the application bundle. Native dialog owns keyboard/focus during preparation. */
export class LoadingScreen {
 readonly host:HTMLDialogElement;
 private progress:HTMLProgressElement;
 private caption:HTMLElement;
 private counter:HTMLElement;
 private next:HTMLButtonElement;
 private exit:HTMLButtonElement;
 private motion=matchMedia('(prefers-reduced-motion: reduce)');
 private flourishes:Animation[]=[];
 private lastTotal=-1;
 private lastBeat=0;
 private reduced=false;
 private ready=false;
 private actualRatio=0;
 private frame=0;
 private visual=new LoadingProgress(performance.now());
 private finishResolve?:()=>void;
 private pauseAction?:()=>void;
 private resumeAction?:()=>void;
 private cancelEvent=(e:Event)=>{e.preventDefault();this.pauseAction?.();};
 private animate=()=>{
  if(!document.hidden&&this.host.dataset.loadStatus!=='paused'){const ratio=this.visual.sample(performance.now(),this.actualRatio,1,this.ready,this.reduced);this.progress.value=ratio;this.host.style.setProperty('--load-ratio',String(ratio));this.host.dataset.visualProgress=String(ratio);}
  this.frame=requestAnimationFrame(this.animate);
 };
 private syncMotion=()=>{
  let reduced=this.motion.matches;
  try{reduced ||= JSON.parse(localStorage.getItem('dachoupai-presentation-v1')??'null')?.reducedMotion===true;}catch{/* Optional preference cannot block preparation. */}
  this.host.dataset.loadMotion=reduced?'reduce':'full';
  this.reduced=reduced;
  if(reduced||document.hidden)this.cancelFlourishes();
  this.host.toggleAttribute('data-load-paused',document.hidden||this.host.dataset.loadStatus==='paused');
 };
 private cancelFlourishes(){for(const a of this.flourishes)a.cancel();this.flourishes=[];}
 constructor(title='为你铺开这一局'){
  let host=document.querySelector<HTMLDialogElement>('#resource-loading');
  if(!template&&host)template=host.cloneNode(true) as HTMLElement;
  if(!host){host=template?.cloneNode(true) as HTMLDialogElement;if(!host){host=document.createElement('dialog');host.id='resource-loading';host.innerHTML='<h1>唐宋牌</h1><h2 data-load-title></h2><div class="load-track"><progress></progress><div class="load-goldfish" aria-hidden="true"><svg viewBox="0 0 44 24" width="44" height="24"><g class="goldfish-tail-group"><path class="goldfish-tail" d="M14 12 C8 6 1 9 3 12 C1 15 8 18 14 12 Z" fill="#cf4a38" opacity="0.82"/><path class="goldfish-tail-upper" d="M13 11 C7 4 2 6 5 10 C8 11 11 11 13 11 Z" fill="#e8735c" opacity="0.75"/><path class="goldfish-tail-lower" d="M13 13 C7 20 2 18 5 14 C8 13 11 13 13 13 Z" fill="#e8735c" opacity="0.75"/></g><path d="M12 12 C14 7 22 6 28 9 C33 11 35 12 35 12 C35 12 33 13 28 15 C22 18 14 17 12 12 Z" fill="#c43f2e"/><path d="M19 7 C23 4 26 6 28 8 C25 7 22 7 19 7 Z" fill="#df6550" opacity="0.85"/><path d="M16 12 C20 15 26 15 30 12 C26 13 20 13 16 12 Z" fill="#fde8c8" opacity="0.65"/><path class="goldfish-fin" d="M23 13 C20 17 17 15 21 13 Z" fill="#df6550" opacity="0.9"/><circle cx="31" cy="10.5" r="1.6" fill="#fff9ee"/><circle cx="31.4" cy="10.5" r="1" fill="#26313a"/><circle cx="31.8" cy="10.1" r="0.4" fill="#ffffff"/><circle cx="32" cy="12" r="0.8" fill="#e8735c" opacity="0.7"/></svg></div></div><p data-load-caption></p><p data-load-counter></p><button data-load-next>暂停加载</button>'; }document.body.append(host);}
  this.host=host;this.progress=host.querySelector('progress')!;this.caption=host.querySelector('[data-load-caption]')!;this.counter=host.querySelector('[data-load-counter]')!;this.next=host.querySelector('[data-load-next]')!;
  if(!host.querySelector('.load-goldfish')){const track=host.querySelector('.load-track');if(track){const fish=document.createElement('div');fish.className='load-goldfish';fish.setAttribute('aria-hidden','true');fish.innerHTML='<svg viewBox="0 0 44 24" width="44" height="24"><g class="goldfish-tail-group"><path class="goldfish-tail" d="M14 12 C8 6 1 9 3 12 C1 15 8 18 14 12 Z" fill="#cf4a38" opacity="0.82"/><path class="goldfish-tail-upper" d="M13 11 C7 4 2 6 5 10 C8 11 11 11 13 11 Z" fill="#e8735c" opacity="0.75"/><path class="goldfish-tail-lower" d="M13 13 C7 20 2 18 5 14 C8 13 11 13 13 13 Z" fill="#e8735c" opacity="0.75"/></g><path d="M12 12 C14 7 22 6 28 9 C33 11 35 12 35 12 C35 12 33 13 28 15 C22 18 14 17 12 12 Z" fill="#c43f2e"/><path d="M19 7 C23 4 26 6 28 8 C25 7 22 7 19 7 Z" fill="#df6550" opacity="0.85"/><path d="M16 12 C20 15 26 15 30 12 C26 13 20 13 16 12 Z" fill="#fde8c8" opacity="0.65"/><path class="goldfish-fin" d="M23 13 C20 17 17 15 21 13 Z" fill="#df6550" opacity="0.9"/><circle cx="31" cy="10.5" r="1.6" fill="#fff9ee"/><circle cx="31.4" cy="10.5" r="1" fill="#26313a"/><circle cx="31.8" cy="10.1" r="0.4" fill="#ffffff"/><circle cx="32" cy="12" r="0.8" fill="#e8735c" opacity="0.7"/></svg>';track.append(fish);}}
  host.querySelector('[data-load-title]')!.textContent=title;this.next.hidden=true;
  this.exit=host.querySelector<HTMLButtonElement>('[data-load-exit]')??document.createElement('button');this.exit.type='button';this.exit.dataset.loadExit='';this.exit.textContent='返回上一页';this.exit.hidden=history.length<=1;this.exit.onclick=()=>{this.pauseAction?.();history.back();};this.next.parentElement!.append(this.exit);
  this.syncMotion();this.motion.addEventListener('change',this.syncMotion);document.addEventListener('visibilitychange',this.syncMotion);
  if(host.open)host.close();host.showModal();host.addEventListener('cancel',this.cancelEvent);this.progress.max=1;this.progress.value=0;this.frame=requestAnimationFrame(this.animate);
 }
 update(p:PreparationProgress,label='准备常用牌面',base=false){
  this.caption.textContent=label;this.counter.textContent='';this.host.dataset.loaded=String(p.loaded);this.host.dataset.total=String(p.total);
  // Decorative beats use decoded counts; the smoothed progress is cosmetic and never opens the gate.
  const ratio=(p.total?Math.min(1,p.loaded/p.total):0)*(base ? .08 : 1),beat=this.ready?3:ratio>=.5?2:ratio>0?1:0;this.actualRatio=ratio;
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
 base(loaded:number,total:number,failed=0){this.update({loaded,total,failed,pending:total-loaded-failed,states:[]},'铺好纸面与纹样',true);}
 controls(pause:()=>void,resume:()=>void){this.pauseAction=pause;this.resumeAction=resume;this.next.hidden=false;this.next.textContent='暂停加载';this.next.onclick=pause;}
 recovery(p:RecoveryProgress){
  const label=p.status==='offline'?'网络已断开，连接后自动继续':p.status==='paused'?'已暂停，已准备的牌面会保留':p.status==='retrying'?'正在自动重试，已准备的牌面会保留':p.status==='waiting'?'牌面暂未就绪，正在自动恢复':p.status==='ready'?'牌面已就绪':'准备常用牌面';
  this.ready=p.status==='ready';this.host.dataset.loadStatus=p.status;this.host.toggleAttribute('data-load-paused',document.hidden||p.status==='paused');this.update(p,label);
  this.next.textContent=p.status==='paused'?'继续准备':'暂停加载';this.next.onclick=p.status==='paused'?this.resumeAction??null:this.pauseAction??null;
 }
 finish(signal:AbortSignal):Promise<void>{
  return new Promise(resolve=>{let timer:ReturnType<typeof setTimeout>|undefined;const done=()=>{clearTimeout(timer);signal.removeEventListener('abort',done);this.finishResolve=undefined;if(!signal.aborted){this.progress.value=this.visual.complete();this.host.style.setProperty('--load-ratio','1');}resolve();};this.finishResolve=done;signal.addEventListener('abort',done,{once:true});if(signal.aborted||this.reduced)done();else timer=setTimeout(done,420);});
 }
 close(){this.finishResolve?.();cancelAnimationFrame(this.frame);this.cancelFlourishes();this.motion.removeEventListener('change',this.syncMotion);document.removeEventListener('visibilitychange',this.syncMotion);this.host.removeEventListener('cancel',this.cancelEvent);this.next.onclick=null;this.exit.onclick=null;if(this.host.isConnected)this.host.close();this.host.remove();}
}
type Preparation={key:string;cancel:()=>void;promise:Promise<boolean>};
const pending=new WeakMap<Phaser.Game,Preparation>();
/** Shared decoded texture cache; stale navigation and game destruction release only this batch's leases. */
export function prepareDestination(game:Phaser.Game,key:string,startup=false,existing?:LoadingScreen):Promise<boolean>{
 const old=pending.get(game);if(old?.key===key)return old.promise;old?.cancel();
 const run=game.registry.get('runController')?.state as R2RunState|undefined;
 const assets=sceneResources(key,run,startup);
 if(!existing&&assets.every(a=>game.textures.exists(a.key)))return Promise.resolve(true);
 const view=existing??new LoadingScreen(key==='game'?'牌桌已铺好，准备入场':key==='shop'?'备好这一场的现货':'为你铺开这一局');
 const owner=new AbortController(),cancel=()=>{if(pending.get(game)?.cancel===cancel)pending.delete(game);owner.abort();view.close();};
 const record={key,total:assets.length,loaded:0,failed:0,pending:assets.length,keys:assets.map(a=>a.key),status:'loading',round:0,retryInMs:0};
 game.registry.set('resourcePreparation',record);game.events.once('destroy',cancel);
 const entry:Preparation={key,cancel,promise:Promise.resolve(false)};
 const states=assets.map(a=>({...a,status:game.textures.exists(a.key)?'loaded' as const:'queued' as const,attempts:0})),cached=states.filter(s=>s.status==='loaded').length;
 let last:PreparationProgress={total:assets.length,loaded:cached,failed:0,pending:assets.length-cached,states};
 const recovery=new ResourceRecovery((signal,changed)=>{
  // Unattempted tail entries go first after a deadline, so a bad first asset cannot starve the catalog.
  const ranks=new Map(last.states.map(s=>[s.key,s.status==='queued'?0:s.status==='loading'?1:s.status==='failed'?2:3]));
  const ordered=[...assets].sort((a,b)=>(ranks.get(a.key)??0)-(ranks.get(b.key)??0));
  return prepareSceneResources(game,ordered,p=>{last=p;changed(p);},signal).then(p=>{last=p;return p;});
 },last,p=>{Object.assign(record,{loaded:p.loaded,failed:p.failed,pending:p.pending,status:p.status,round:p.round,retryInMs:p.retryInMs});view.recovery(p);},owner.signal);
 view.controls(()=>recovery.pause(),()=>recovery.resume());
 entry.promise=(async()=>{try{const ready=await recovery.run();if(!ready||owner.signal.aborted)return false;await view.finish(owner.signal);return !owner.signal.aborted;}finally{view.close();game.events.off('destroy',cancel);if(pending.get(game)===entry)pending.delete(game);}})();
 pending.set(game,entry);return entry.promise;
}
export function cancelDestinationPreparation(game:Phaser.Game,key?:string):void {const current=pending.get(game);if(current&&(!key||current.key===key))current.cancel();}
