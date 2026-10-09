import type Phaser from 'phaser';
import type {Box} from './layout';
import type {SceneView} from './SceneView';
import {PAPER_THEME as T} from './theme';
import {selectionPortraitKey} from './portraits';
import {jokerArtKey} from './jokerArt';
import type {resultStageFacts} from './ResultStage';

/** Optional source art starts only after text/controls exist; never uses the scene preload queue. */
export async function loadResultSourceArt(scene:Phaser.Scene,key:string,url:string,signal:AbortSignal,current:()=>boolean):Promise<boolean> {
 if(signal.aborted||!current())return false;
 if(scene.textures.exists(key))return true;
 const transfer=new AbortController(),abort=()=>transfer.abort(),image=new Image();let objectUrl:string|undefined,loaded=false,rejectAbort!:()=>void;
 signal.addEventListener('abort',abort,{once:true});
 const canceled=new Promise<never>((_,reject)=>{rejectAbort=()=>reject(Error('result-source-canceled'));transfer.signal.addEventListener('abort',rejectAbort,{once:true});});
 const timer=setTimeout(abort,5000);
 const receive=async()=>{
  const response=await fetch(url,{signal:transfer.signal,credentials:'same-origin',priority:'low'});
  if(!response.ok||transfer.signal.aborted||!current())return false;
  const blob=await response.blob();if(transfer.signal.aborted||!current())return false;
  objectUrl=URL.createObjectURL(blob);image.decoding='async';image.src=objectUrl;await image.decode();
  if(transfer.signal.aborted||!current()||!scene.sys.settings.active||!image.naturalWidth||!image.naturalHeight)return false;
  if(!scene.textures.exists(key))scene.textures.addImage(key,image);
  return true;
 };
 try {loaded=await Promise.race([receive(),canceled]);return loaded;}
 catch {transfer.abort();return false;}
 finally {clearTimeout(timer);signal.removeEventListener('abort',abort);transfer.signal.removeEventListener('abort',rejectAbort);if(!loaded)image.removeAttribute('src');if(objectUrl)URL.revokeObjectURL(objectUrl);}
}

/** Sparse paper stage and existing contained source art; decorative layers never own input. */
export function resultStagePaper(scene:Phaser.Scene,view:SceneView,b:Box,lost=false):void {
 const g=scene.add.graphics().setName('result-art/stage').setData('bounds',b);
 g.fillStyle(T.ink,.055).fillRoundedRect(b.x,b.y+3,b.width,b.height,10);
 g.fillStyle(lost?T.paperLight:T.jadeSoft).fillRoundedRect(b.x,b.y,b.width,b.height,10).lineStyle(1,T.jade,.3).strokeRoundedRect(b.x,b.y,b.width,b.height,10);view.add(g);
 if(scene.textures.exists('p00-paper'))view.add(scene.add.tileSprite(b.x+6,b.y+6,b.width-12,b.height-12,'p00-paper').setOrigin(0).setAlpha(.1).setName('result-art/paper'));
 const seam=scene.add.graphics().lineStyle(2,lost?T.brass:T.jade,.45).beginPath().moveTo(b.x+12,b.y+26).lineTo(b.x+12,b.y+12).lineTo(b.x+34,b.y+12).strokePath().setName('result-art/ink');view.add(seam);
}
export function resultStageSources(scene:Phaser.Scene,view:SceneView,b:Box,facts:ReturnType<typeof resultStageFacts>,short:boolean):{text:Box;art:Phaser.GameObjects.Image[]} {
 const small=b.height<200,side=small&&!short&&b.width>=230,art:Phaser.GameObjects.Image[]=[];
 const reserved=facts.growth?132:facts.source?88:0;
 const height=Math.min(short?70:small?88:156,side?b.height:Math.max(0,b.height-reserved-10)),cardWidth=height*5/7,charWidth=height*.67;
 const char=facts.character&&selectionPortraitKey(facts.character),card=facts.source&&jokerArtKey(facts.source.definitionId);
 const keys=[...(char&&scene.textures.exists(char)?[{key:char,width:charWidth,id:facts.character+'.selection'}]:[]),...(card&&scene.textures.exists(card)?[{key:card,width:cardWidth,id:facts.source!.definitionId+'.thumbnail'}]:[])];
 const total=keys.reduce((n,k)=>n+k.width,0)+Math.max(0,keys.length-1)*8,available=side?Math.min(total,b.width*.48):b.width;
 const scale=Math.min(1,available/Math.max(1,total)),imageHeight=height*scale;
 let x=side?b.x:b.x+(b.width-total*scale)/2;
 for(const k of keys){const box={x,y:b.y,width:k.width*scale,height:imageHeight};const image=scene.add.image(box.x+box.width/2,box.y+box.height/2,k.key);image.setScale(Math.min(box.width/image.width,box.height/image.height)).setName('result-art/source').setData('assetId',k.id).setData('bounds',box);view.add(image);art.push(image);x+=box.width+8*scale;}
 const text:Box=side&&keys.length?{x:b.x+total*scale+12,y:b.y,width:b.width-total*scale-12,height:b.height}:{x:b.x,y:b.y+(keys.length?imageHeight+10:0),width:b.width,height:b.height-(keys.length?imageHeight+10:0)};
 return {text,art};
}
