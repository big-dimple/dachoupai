/** Bounded, same-origin detail upgrade queue. Thumbnails remain visible on every failure. */
const MAX_ACTIVE=2,MAX_CACHED=4,MAX_BYTES=2*1024*1024,DEADLINE_MS=6000;
type Work={url:string;resolve:(value:string)=>void;reject:(reason:Error)=>void};
const cache=new Map<string,string>(),pending=new Map<string,Promise<string>>(),queue:Work[]=[];
let active=0;
function pump():void {
  while(active<MAX_ACTIVE&&queue.length){
    const work=queue.shift()!;active++;const controller=new AbortController();
    let timer:ReturnType<typeof setTimeout>;
    const timeout=new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('detail-image-timeout'));},DEADLINE_MS);});
    const transfer=async()=>{
      const response=await fetch(work.url,{signal:controller.signal,credentials:'same-origin',priority:'low'});
      if(!response.ok)throw new Error('detail-image-http');const blob=await response.blob();if(blob.size>MAX_BYTES)throw new Error('detail-image-budget');
      if(controller.signal.aborted)throw new Error('detail-image-timeout');
      const bitmap=await createImageBitmap(blob);const pixels=bitmap.width*bitmap.height;bitmap.close();
      if(controller.signal.aborted)throw new Error('detail-image-timeout');
      if(pixels>1_600_000)throw new Error('detail-image-pixels');return blob;
    };
    // The deadline also covers body/bitmap decoding, which AbortController cannot cancel.
    // Only the race winner may cache a URL; a late bitmap is closed and discarded.
    void (async()=>{
      let result:string|undefined;
      try {
        const blob=await Promise.race([transfer(),timeout]);result=URL.createObjectURL(blob);cache.set(work.url,result);
        while(cache.size>MAX_CACHED){const oldest=cache.keys().next().value!;URL.revokeObjectURL(cache.get(oldest)!);cache.delete(oldest);}
      }catch { /* A failed attempt remains retryable, including synchronous fetch failures. */ }
      finally {clearTimeout(timer!);pending.delete(work.url);active--;pump();}
      if(result)work.resolve(result);else work.reject(new Error('detail-image-unavailable'));
    })();
  }
}
/** Decode offscreen so failed/retried upgrades never replace an available card face. */
export function decodeArtImage(src:string,signal?:AbortSignal):Promise<void> {
  return new Promise<void>((resolve,reject)=>{
    if(signal?.aborted){reject(new Error('detail-image-aborted'));return;}
    const decoded=new Image();let settled=false;
    const finish=(error?:Error)=>{
      if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);decoded.onerror=null;
      if(error){decoded.removeAttribute('src');reject(error);}else resolve();
    };
    const abort=()=>finish(new Error('detail-image-aborted'));
    const timer=setTimeout(()=>finish(new Error('detail-image-timeout')),DEADLINE_MS);
    signal?.addEventListener('abort',abort,{once:true});decoded.onerror=()=>finish(new Error('detail-image-decode'));
    try {decoded.src=src;void decoded.decode().then(()=>finish(),()=>finish(new Error('detail-image-decode')));}
    catch {finish(new Error('detail-image-decode'));}
  });
}
export function detailArt(url:string,foreground=true):Promise<string> {
  const ready=cache.get(url);if(ready){cache.delete(url);cache.set(url,ready);return Promise.resolve(ready);}
  const existing=pending.get(url);if(existing){if(foreground){const index=queue.findIndex(work=>work.url===url);if(index>0)queue.unshift(...queue.splice(index,1));}return existing;}
  if(!foreground&&queue.length>=4)return Promise.reject(new Error('detail-prefetch-budget'));
  const promise=new Promise<string>((resolve,reject)=>{const work={url,resolve,reject};if(foreground)queue.unshift(work);else queue.push(work);});pending.set(url,promise);pump();return promise;
}
export function prefetchDetailArt(urls:readonly string[]):void {
  const connection=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection;
  if(connection?.saveData||connection?.effectiveType?.includes('2g'))return;
  const schedule=()=>{for(const url of urls.slice(0,2))void detailArt(url,false).catch(()=>{});};
  if('requestIdleCallback' in window)window.requestIdleCallback(schedule,{timeout:1200});else setTimeout(schedule,400);
}
export function progressiveArt(frame:HTMLElement,image:HTMLImageElement,url:string,onReady:()=>void):()=>void {
  let closed=false,attempt=0,decode:AbortController|undefined;const status=document.createElement('div'),retry=document.createElement('button');status.className='detail-art-status';status.setAttribute('role','status');retry.type='button';retry.textContent='重试高清';retry.hidden=true;frame.append(status,retry);
  const load=()=>{
    if(closed)return;const id=++attempt;decode?.abort();decode=new AbortController();const signal=decode.signal;
    status.hidden=false;status.textContent='高清细节加载中…';retry.hidden=true;
    void detailArt(url).then(async src=>{
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
