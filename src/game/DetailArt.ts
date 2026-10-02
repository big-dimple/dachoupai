/** Bounded, same-origin detail upgrade queue. Thumbnails remain visible on every failure. */
const MAX_ACTIVE=2,MAX_CACHED=4,MAX_BYTES=2*1024*1024;
type Work={url:string;resolve:(value:string)=>void;reject:(reason:Error)=>void};
const cache=new Map<string,string>(),pending=new Map<string,Promise<string>>(),queue:Work[]=[];
let active=0;
function pump():void {
  while(active<MAX_ACTIVE&&queue.length){
    const work=queue.shift()!;active++;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
    void fetch(work.url,{signal:controller.signal,credentials:'same-origin',priority:'low'}).then(async response=>{
      if(!response.ok)throw new Error('detail-image-http');const blob=await response.blob();if(blob.size>MAX_BYTES)throw new Error('detail-image-budget');
      const bitmap=await createImageBitmap(blob);const pixels=bitmap.width*bitmap.height;bitmap.close();if(pixels>1_600_000)throw new Error('detail-image-pixels');
      const url=URL.createObjectURL(blob);cache.set(work.url,url);
      while(cache.size>MAX_CACHED){const oldest=cache.keys().next().value!;URL.revokeObjectURL(cache.get(oldest)!);cache.delete(oldest);}
      work.resolve(url);
    }).catch(()=>work.reject(new Error('detail-image-unavailable'))).finally(()=>{clearTimeout(timer);pending.delete(work.url);active--;pump();});
  }
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
  let closed=false,attempt=0;const status=document.createElement('div'),retry=document.createElement('button');status.className='detail-art-status';status.setAttribute('role','status');retry.type='button';retry.textContent='重试高清';retry.hidden=true;frame.append(status,retry);
  const load=()=>{const id=++attempt;status.textContent='高清细节加载中…';retry.hidden=true;void detailArt(url).then(async src=>{const decoded=new Image();decoded.src=src;await decoded.decode();if(closed||id!==attempt)return;image.src=src;onReady();status.textContent='';status.hidden=true;}).catch(()=>{if(closed||id!==attempt)return;status.hidden=false;status.textContent='先看小图，高清暂未加载';retry.hidden=false;});};
  retry.className='detail-art-retry';retry.onclick=load;load();return ()=>{closed=true;};
}
