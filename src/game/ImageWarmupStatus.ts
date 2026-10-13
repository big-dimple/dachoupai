import type {ImageWarmupQueue} from './ImageWarmupQueue';
/** Separate, nonmodal progress surface. No canvas layout or input changes. */
export function imageWarmupStatus(queue:ImageWarmupQueue,visibleInScene:()=>boolean):{refresh:()=>void;destroy:()=>void} {
  const host=document.createElement('div'),label=document.createElement('span'),retry=document.createElement('button');
  host.dataset.imageWarmup='';host.setAttribute('role','status');host.setAttribute('aria-live','polite');
  host.style.cssText='position:fixed;top:calc(env(safe-area-inset-top,0px) + 2px);left:calc(50% + 6px);transform:translateX(-50%);max-width:calc(100vw - 110px);z-index:40;color:#3f606b;background:#fff9eef2;border:1px solid #c7b89d;border-radius:4px;padding:2px 6px;font:12px sans-serif;display:none;white-space:nowrap;pointer-events:none';
  retry.type='button';retry.textContent='重试';retry.setAttribute('aria-label','重试图片');retry.style.cssText='color:#3f606b;background:#fff9ee;border:1px solid #c7b89d;border-radius:3px;min-height:44px;min-width:44px;pointer-events:auto;margin-left:6px';retry.onclick=()=>queue.retry();host.append(label,retry);document.body.append(host);
  let timer:ReturnType<typeof setTimeout>|undefined,visible=false,destroyed=false;
  const refresh=()=>{
    if(destroyed)return;
    if(!visibleInScene()){host.style.display='none';return;}
    const states=queue.snapshot(),loaded=states.filter(s=>s.status==='loaded').length,failed=states.filter(s=>s.status==='failed').length,pending=states.length-loaded-failed;
    if(!visible&&pending&&!timer)timer=setTimeout(()=>{timer=undefined;visible=true;refresh();},700);
    if(!pending&&!failed){clearTimeout(timer);timer=undefined;host.style.display='none';return;}
    host.style.display=visible||failed?'flex':'none';host.style.alignItems='center';retry.hidden=!failed;
    host.setAttribute('aria-label',failed?`${failed}张图暂用简图${pending?' · 其余加载中':''}`:`图片预热 ${loaded}/${states.length}`);
    label.textContent=failed?`简图×${failed}`:`图片预热 ${loaded}/${states.length}`;
  };
  return {refresh,destroy:()=>{destroyed=true;clearTimeout(timer);retry.onclick=null;host.remove();}};
}
