import type Phaser from 'phaser';
import {HANDDRAWN_ART,handdrawnPath} from './HanddrawnArt';
import {assetUrl} from './theme';
export const CLIMAX_SOURCE_BYTES=96*1024;
export const climaxSourceKey=(id:string)=>'climax-source/'+id;
/** Only one already mapped same-ID detail, bounded independently of its artwork provenance. */
export function climaxSourceAsset(id:string){
 const a=HANDDRAWN_ART.find(a=>a.id===id&&a.category==='functional-card'),o=a?.outputs.find(o=>o.purpose==='detail'),path=handdrawnPath(id,'detail');
 if(!o||!path||o.bytes>CLIMAX_SOURCE_BYTES||o.width>768||o.height>768)return;
 return {id,key:climaxSourceKey(id),url:assetUrl(path),bytes:o.bytes,width:o.width,height:o.height};
}
/** Optional saved-event fetch. Never awaited by scoring; abort/dimension/byte guards precede texture publication. */
export async function loadClimaxSourceArt(scene:Phaser.Scene,id:string,signal:AbortSignal,current:()=>boolean):Promise<boolean>{
 const asset=climaxSourceAsset(id);if(!asset||signal.aborted||!current())return false;if(scene.textures.exists(asset.key))return true;
 const transfer=new AbortController(),abort=()=>transfer.abort(),image=new Image();let objectUrl:string|undefined,loaded=false,rejectAbort!:(reason:Error)=>void;
 signal.addEventListener('abort',abort,{once:true});const canceled=new Promise<never>((_,reject)=>{rejectAbort=reject;transfer.signal.addEventListener('abort',onAbort,{once:true});});
 function onAbort(){rejectAbort(Error('climax-source-canceled'));}
 const timer=setTimeout(abort,1800);
 const receive=async()=>{
  const response=await fetch(asset.url,{signal:transfer.signal,credentials:'same-origin',priority:'low'});if(!response.ok||transfer.signal.aborted||!current())return false;
  const size=Number(response.headers.get('content-length'));if(size>CLIMAX_SOURCE_BYTES){transfer.abort();return false;}
  const reader=response.body?.getReader();if(!reader)return false;const chunks:Uint8Array[]=[];let bytes=0;
  try{while(true){const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(bytes>CLIMAX_SOURCE_BYTES){await reader.cancel();return false;}chunks.push(next.value);}}finally{reader.releaseLock();}
  if(bytes!==asset.bytes||transfer.signal.aborted||!current())return false;
  objectUrl=URL.createObjectURL(new Blob(chunks as BlobPart[],{type:'image/webp'}));image.decoding='async';image.src=objectUrl;await image.decode();
  if(transfer.signal.aborted||!current()||!scene.sys.settings.active||image.naturalWidth!==asset.width||image.naturalHeight!==asset.height)return false;
  if(!scene.textures.exists(asset.key))scene.textures.addImage(asset.key,image);loaded=true;return true;
 };
 try{return await Promise.race([receive(),canceled]);}catch{transfer.abort();return false;}
 finally{clearTimeout(timer);signal.removeEventListener('abort',abort);transfer.signal.removeEventListener('abort',onAbort);if(!loaded)image.removeAttribute('src');if(objectUrl)URL.revokeObjectURL(objectUrl);}
}
