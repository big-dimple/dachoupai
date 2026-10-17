import {gameSession} from './session';
import './ForgetTechniqueAttention.css';

/** Native inventory counterpart to the warm S05 canvas cue. Caller owns non-dialog cleanup. */
export function mountForgetTechniqueAttentionElement(host:HTMLElement,toolId:string):()=>void {
  if(toolId!=='S05')return ()=>{};
  let stopped=false,intersecting=true;
  const dialog=host.closest('dialog'),media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const refresh=()=>{
    if(stopped)return;
    host.dataset.attentionMotion=document.hidden||!intersecting?'paused':gameSession().reducedMotion||media.matches?'static':'flowing';
  };
  const observer=typeof IntersectionObserver==='undefined'?undefined:new IntersectionObserver(entries=>{intersecting=entries.some(e=>e.isIntersecting);refresh();});
  const unsubscribe=gameSession().subscribe(refresh);
  const stop=()=>{
    if(stopped)return;stopped=true;observer?.disconnect();unsubscribe();
    document.removeEventListener('visibilitychange',refresh);media.removeEventListener('change',refresh);dialog?.removeEventListener('close',stop);window.removeEventListener('pagehide',stop);
    host.classList.remove('forget-technique-attention');delete host.dataset.attentionMotion;
  };
  host.classList.add('forget-technique-attention');observer?.observe(host);
  document.addEventListener('visibilitychange',refresh);media.addEventListener('change',refresh);dialog?.addEventListener('close',stop,{once:true});window.addEventListener('pagehide',stop,{once:true});refresh();
  return stop;
}
