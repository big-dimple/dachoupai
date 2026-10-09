import {AudioEngine} from '../audio/AudioEngine';
import {gameSession} from './session';
/** Short saved-card changes. Never dispatches, delays close, or creates a replay. */
export function mountSavedCardMotion(dialog:HTMLElement,grid:HTMLElement,reduced:boolean):()=>void {
 const animations:Animation[]=[],removed:Array<{face:HTMLElement;name:string}>=[];
 let stopped=false,timer:ReturnType<typeof setTimeout>|undefined;
 const settle=()=>{if(stopped)return;stopped=true;if(animations.length)AudioEngine.shared.cancelPresentation();clearTimeout(timer);for(const a of animations)a.cancel();
  for(const {face,name} of removed){face.replaceChildren();const label=document.createElement('strong');label.textContent=name+' · 已移除';face.append(label);face.dataset.removed='true';}
  dialog.dataset.animationState='settled';unsubscribe();window.removeEventListener('resize',settle);window.removeEventListener('blur',settle);document.removeEventListener('visibilitychange',hide);media.removeEventListener('change',preference);
 };
 const hide=()=>{if(document.hidden)settle();},media=window.matchMedia('(prefers-reduced-motion: reduce)'),preference=()=>{if(gameSession().reducedMotion||media.matches)settle();},unsubscribe=gameSession().subscribe(preference);
 window.addEventListener('resize',settle);window.addEventListener('blur',settle);document.addEventListener('visibilitychange',hide);media.addEventListener('change',preference);
 for(const pair of grid.querySelectorAll<HTMLElement>('.tool-change-pair')){
  const before=pair.children[0].querySelector<HTMLElement>('.candidate-card-face'),after=pair.querySelector<HTMLElement>('.tool-change-after .candidate-card-face');
  if(!before)continue;
  if(pair.querySelector('.tool-change-removed'))removed.push({face:before,name:before.querySelector('strong')?.textContent||'此牌'});
  if(reduced||media.matches)continue;
  if(typeof before.animate==='function')animations.push(before.animate(after?[{opacity:1,transform:'translateX(0)'},{opacity:.35,transform:'translateX(-5px)'},{opacity:1,transform:'translateX(0)'}]:[{opacity:1,transform:'translateY(0) rotate(0)'},{opacity:.2,transform:'translateY(8px) rotate(-6deg)'},{opacity:0,transform:'translateY(14px) rotate(-10deg)'}],{duration:360,fill:'forwards'}));
  if(after&&typeof after.animate==='function')animations.push(after.animate([{opacity:0,transform:'translateX(-8px) scale(.92)'},{opacity:1,transform:'translateX(0) scale(1.05)'},{opacity:1,transform:'translateX(0) scale(1)'}],{duration:420,fill:'both'}));
 }
 if(reduced||media.matches||!animations.length)settle();else {dialog.dataset.animationState='playing';timer=setTimeout(settle,440);}
 return settle;
}
