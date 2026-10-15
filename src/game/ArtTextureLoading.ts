import type Phaser from 'phaser';

/** At most four transfers (original separate pools allowed six), two per lane: visible faces > optional detail > speculative stage images.
 * Preempted optional work keeps its subscribers and resumes after the visible faces.
 */
type Transfer<T>={lane:string;priority:number;run:(signal:AbortSignal)=>Promise<T>;resolve:(value:T)=>void;reject:(reason:unknown)=>void;signal?:AbortSignal;controller?:AbortController;preempted?:boolean;cancel:()=>void};
const waiting:Transfer<any>[]=[],running=new Set<Transfer<any>>();
export function artTransfer<T>(run:(signal:AbortSignal)=>Promise<T>,priority:number,signal?:AbortSignal,lane='optional'):Promise<T> {
  if(signal?.aborted)return Promise.reject(Error('art-aborted'));
  return new Promise((resolve,reject)=>{
    const work:Transfer<T>={run,priority,lane,signal,resolve,reject,cancel:()=>{
      const index=waiting.indexOf(work);if(index>=0){waiting.splice(index,1);signal?.removeEventListener('abort',work.cancel);reject(Error('art-aborted'));}
      work.controller?.abort();
    }};
    signal?.addEventListener('abort',work.cancel,{once:true});waiting.push(work);
    // Only detail (priority 1) is interrupted. Background thumbnails finish once,
    // avoiding duplicate requests when the next stage needs the same texture.
    if(priority===2)for(const active of running)if(active.priority===1){active.preempted=true;active.controller?.abort();}
    pump();
  });
}
function pump():void {
  waiting.sort((a,b)=>b.priority-a.priority);
  while(running.size<4&&waiting.length){
    const index=waiting.findIndex(candidate=>[...running].filter(work=>work.lane===candidate.lane).length<2);
    if(index<0)break;
    const work=waiting.splice(index,1)[0],controller=new AbortController();work.controller=controller;work.preempted=false;running.add(work);
    let abort!:()=>void;
    const canceled=new Promise<never>((_,reject)=>{abort=()=>reject(Error('art-aborted'));controller.signal.addEventListener('abort',abort,{once:true});});
    void Promise.race([work.run(controller.signal),canceled]).then(value=>{
      if(controller.signal.aborted)throw Error('art-aborted');work.resolve(value);
    }).catch(error=>{
      if(work.preempted&&!work.signal?.aborted)waiting.push(work);else work.reject(error);
    }).finally(()=>{
      controller.signal.removeEventListener('abort',abort);running.delete(work);
      if(!waiting.includes(work))work.signal?.removeEventListener('abort',work.cancel);pump();
    });
  }
}

type TextureWork={url:string;controller:AbortController;consumers:number;promise?:Promise<void>;priority:{value:number}};
const games=new WeakMap<Phaser.Game,Map<string,TextureWork>>();
/** Texture manager is the only thumbnail cache. Jobs are shared across scene/warmup owners. */
export function loadArtTexture(game:Phaser.Game,key:string,url:string,signal:AbortSignal,visible=true):Promise<void> {
  if(signal.aborted)return Promise.reject(Error('art-aborted'));
  if(game.textures.exists(key))return Promise.resolve();
  let jobs=games.get(game);if(!jobs){jobs=new Map();games.set(game,jobs);}
  let work=jobs.get(key);
  if(work&&work.url!==url)return Promise.reject(Error('art-key-url-mismatch'));
  if(!work){
    const controller=new AbortController(),priority={value:visible?2:0};
    work={url,controller,consumers:0,priority,promise:undefined};jobs.set(key,work);
    const current=work;
    work.promise=artTransfer(async transferSignal=>{
      const deadline=setTimeout(()=>controller.abort(),4500);let source:string|undefined;let image:HTMLImageElement|undefined;
      const cleanup=()=>{image?.removeAttribute('src');if(source){URL.revokeObjectURL(source);source=undefined;}};
      transferSignal.addEventListener('abort',cleanup,{once:true});
      try {
        const response=await fetch(url,{signal:transferSignal,credentials:'same-origin',priority:priority.value===2?'high':'low'});
        if(!response.ok)throw Object.assign(Error('art-http-'+response.status),{retryable:response.status===408||response.status===429||response.status>=500});
        if(Number(response.headers.get('content-length'))>128*1024)throw Object.assign(Error('art-budget'),{retryable:false});
        const reader=response.body?.getReader();if(!reader)throw Error('art-body');
        const chunks:Uint8Array[]=[];let bytes=0;
        try{while(true){const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(bytes>128*1024){await reader.cancel();throw Object.assign(Error('art-budget'),{retryable:false});}chunks.push(next.value);}}finally{reader.releaseLock();}
        if(transferSignal.aborted)throw Error('art-aborted');
        source=URL.createObjectURL(new Blob(chunks as BlobPart[],{type:response.headers.get('content-type')??'image/webp'}));
        image=new Image();image.decoding='async';image.src=source;
        try{await image.decode();}catch{throw Object.assign(Error('art-decode'),{retryable:false});}
        if(transferSignal.aborted)throw Error('art-aborted');
        if(image.naturalWidth*image.naturalHeight>600000)throw Object.assign(Error('art-pixels'),{retryable:false});
        if(!game.textures.exists(key))game.textures.addImage(key,image);
      }finally{clearTimeout(deadline);transferSignal.removeEventListener('abort',cleanup);if(source)URL.revokeObjectURL(source);}
    },priority.value,controller.signal,key.startsWith('goods-art/')?'goods':key.includes('joker-')?'joker':'optional').finally(()=>{if(jobs!.get(key)===current)jobs!.delete(key);});
  }else if(visible){
    work.priority.value=2;
    // Promote the queued shared job without creating another request.
    const queued=waiting.find(candidate=>candidate.signal===work!.controller.signal);if(queued)queued.priority=2;
    pump();
  }
  const current=work;current.consumers++;
  return new Promise((resolve,reject)=>{
    let settled=false;
    const finish=()=>{if(settled)return false;settled=true;signal.removeEventListener('abort',abort);current.consumers--;return true;};
    const abort=()=>{if(finish()){if(!current.consumers){if(jobs!.get(key)===current)jobs!.delete(key);current.controller.abort();}reject(Error('art-aborted'));}};
    signal.addEventListener('abort',abort,{once:true});
    current.promise!.then(()=>{if(finish())resolve();},error=>{if(finish())reject(error);});
  });
}
