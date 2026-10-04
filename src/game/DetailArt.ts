/** Bounded, same-origin detail upgrade queue. Thumbnails remain visible on every failure. */
const MAX_ACTIVE=2,MAX_CACHED=4,MAX_BYTES=2*1024*1024,DEADLINE_MS=6000;
type Work={url:string;promise:Promise<string>;resolve:(value:string)=>void;reject:(reason:Error)=>void;controller:AbortController;consumers:number;retained:boolean};
const cache=new Map<string,string>(),pending=new Map<string,Work>(),queue:Work[]=[];
let active=0;
function abandon(work:Work):void {
  if(work.retained||work.consumers||pending.get(work.url)!==work)return;
  pending.delete(work.url);work.controller.abort();
  const index=queue.indexOf(work);if(index>=0){queue.splice(index,1);work.reject(new Error('detail-image-aborted'));}
}
function subscribe(work:Work,signal?:AbortSignal):Promise<string> {
  if(!signal){work.retained=true;return work.promise;}
  work.consumers++;
  return new Promise((resolve,reject)=>{
    let settled=false;
    const finish=()=>{if(settled)return false;settled=true;signal.removeEventListener('abort',abort);work.consumers--;return true;};
    const abort=()=>{if(finish()){abandon(work);reject(new Error('detail-image-aborted'));}};
    signal.addEventListener('abort',abort,{once:true});
    work.promise.then(value=>{if(finish())resolve(value);},error=>{if(finish())reject(error);});
  });
}
function pump():void {
  while(active<MAX_ACTIVE&&queue.length){
    const work=queue.shift()!,controller=work.controller;active++;
    let abort!:()=>void;
    const canceled=new Promise<never>((_resolve,reject)=>{abort=()=>reject(new Error('detail-image-aborted'));controller.signal.addEventListener('abort',abort,{once:true});});
    const timer=setTimeout(()=>controller.abort(),DEADLINE_MS);
    const transfer=async()=>{
      const response=await fetch(work.url,{signal:controller.signal,credentials:'same-origin',priority:'low'});
      if(!response.ok)throw new Error('detail-image-http');const blob=await response.blob();if(blob.size>MAX_BYTES)throw new Error('detail-image-budget');
      if(controller.signal.aborted)throw new Error('detail-image-aborted');
      const bitmap=await createImageBitmap(blob);const pixels=bitmap.width*bitmap.height;bitmap.close();
      if(controller.signal.aborted)throw new Error('detail-image-aborted');
      if(pixels>1_600_000)throw new Error('detail-image-pixels');return blob;
    };
    // Abort/deadline also settle uncancelable body/bitmap work. Late results never enter the cache.
    void (async()=>{
      let result:string|undefined;
      try {
        const blob=await Promise.race([transfer(),canceled]);
        if(!controller.signal.aborted){result=URL.createObjectURL(blob);cache.set(work.url,result);
          while(cache.size>MAX_CACHED){const oldest=cache.keys().next().value!;URL.revokeObjectURL(cache.get(oldest)!);cache.delete(oldest);}}
      }catch { /* A failed attempt remains retryable, including synchronous fetch failures. */ }
      finally {clearTimeout(timer);controller.signal.removeEventListener('abort',abort);if(pending.get(work.url)===work)pending.delete(work.url);active--;pump();}
      if(result)work.resolve(result);else work.reject(new Error('detail-image-unavailable'));
    })();
  }
}
/** Decode offscreen so failed/retried upgrades never replace an available card face. */
export function decodeArtImage(src:string,signal?:AbortSignal):Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve,reject)=>{
    if(signal?.aborted){reject(new Error('detail-image-aborted'));return;}
    const decoded=new Image();let settled=false;
    const finish=(error?:Error)=>{
      if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);decoded.onerror=null;
      if(error){decoded.removeAttribute('src');reject(error);}else resolve(decoded);
    };
    const abort=()=>finish(new Error('detail-image-aborted'));
    const timer=setTimeout(()=>finish(new Error('detail-image-timeout')),DEADLINE_MS);
    signal?.addEventListener('abort',abort,{once:true});decoded.onerror=()=>finish(new Error('detail-image-decode'));
    try {decoded.src=src;void decoded.decode().then(()=>finish(),()=>finish(new Error('detail-image-decode')));}
    catch {finish(new Error('detail-image-decode'));}
  });
}
export function detailArt(url:string,foreground=true,signal?:AbortSignal):Promise<string> {
  if(signal?.aborted)return Promise.reject(new Error('detail-image-aborted'));
  const ready=cache.get(url);if(ready){cache.delete(url);cache.set(url,ready);return Promise.resolve(ready);}
  const existing=pending.get(url);if(existing){if(foreground){const index=queue.indexOf(existing);if(index>0)queue.unshift(...queue.splice(index,1));}return subscribe(existing,signal);}
  if(!foreground&&queue.length>=4)return Promise.reject(new Error('detail-prefetch-budget'));
  let resolve!:(value:string)=>void,reject!:(reason:Error)=>void;
  const promise=new Promise<string>((yes,no)=>{resolve=yes;reject=no;});
  const work:Work={url,promise,resolve,reject,controller:new AbortController(),consumers:0,retained:false};
  pending.set(url,work);if(foreground)queue.unshift(work);else queue.push(work);
  const subscribed=subscribe(work,signal);pump();return subscribed;
}
/** A consumer-side decode failure must not poison a later explicit retry. */
export function invalidateArt(url:string,src:string):void {
  if(cache.get(url)===src){cache.delete(url);URL.revokeObjectURL(src);}
}
export function prefetchDetailArt(urls:readonly string[],signal?:AbortSignal):void {
  const connection=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection;
  if(signal?.aborted||connection?.saveData||connection?.effectiveType?.includes('2g'))return;
  let cancelSchedule:()=>void;
  const abort=()=>cancelSchedule();
  const schedule=()=>{signal?.removeEventListener('abort',abort);if(!signal?.aborted)for(const url of urls.slice(0,2))void detailArt(url,false,signal).catch(()=>{});};
  if('requestIdleCallback' in window){const id=window.requestIdleCallback(schedule,{timeout:1200});cancelSchedule=()=>window.cancelIdleCallback(id);}
  else {const id=setTimeout(schedule,400);cancelSchedule=()=>clearTimeout(id);}
  signal?.addEventListener('abort',abort,{once:true});
}
export function progressiveArt(frame:HTMLElement,image:HTMLImageElement,url:string,onReady:()=>void):()=>void {
  let closed=false,attempt=0,decode:AbortController|undefined;const status=document.createElement('div'),retry=document.createElement('button');status.className='detail-art-status';status.setAttribute('role','status');retry.type='button';retry.textContent='重试高清';retry.hidden=true;frame.append(status,retry);
  const load=()=>{
    if(closed)return;const id=++attempt;decode?.abort();decode=new AbortController();const signal=decode.signal;
    status.hidden=false;status.textContent='高清细节加载中…';retry.hidden=true;
    void detailArt(url,true,signal).then(async src=>{
      if(closed||id!==attempt)return;
      try {await decodeArtImage(src,signal);}
      catch(error){
        if(!signal.aborted&&cache.get(url)===src){cache.delete(url);URL.revokeObjectURL(src);}throw error;
      }
      if(closed||id!==attempt)return;image.src=src;onReady();status.textContent='';status.hidden=true;
    }).catch(()=>{
      if(closed||id!==attempt)return;status.hidden=false;
      status.textContent='高清暂未加载，可重试';retry.hidden=false;
    });
  };
  retry.className='detail-art-retry';retry.onclick=load;load();return ()=>{closed=true;++attempt;decode?.abort();retry.onclick=null;};
}
