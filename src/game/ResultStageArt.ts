import type Phaser from 'phaser';
import type {Box} from './layout';
import type {SceneView} from './SceneView';
import {PAPER_THEME as T} from './theme';
import {selectionPortraitKey} from './portraits';
import {jokerArtKey} from './jokerArt';
import type {resultStageFacts} from './ResultStage';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import {HAND_LABELS} from '../content/handLabels';

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
 // A real played hand is already available locally. It is a result keepsake,
 // not a loading placeholder or a claim that an unrelated joker/hero triggered.
 if(!keys.length&&facts.trace&&height>=66){
   const played=facts.trace.sets.playedIds.map(id=>facts.trace!.cards.find(c=>c.id===id)).filter(c=>!!c);
   const cards=played.slice(0,b.width<160&&height<110?3:5);
   const cols=b.width<160&&height>=110?3:Math.max(1,cards.length),rows=Math.ceil(cards.length/cols),labelHeight=22;
   const cardHeight=Math.min(72,(height-labelHeight-(rows-1)*6)/Math.max(1,rows)),cardWidth=Math.min(cardHeight*.72,(b.width-(cols-1)*4)/cols);
   const total=cols*cardWidth+(cols-1)*4,left=b.x+(b.width-total)/2;
   const label=view.text(b.x+b.width/2,b.y,height<110?'本手落牌':HAND_LABELS[facts.trace.handType]+' · 留影',14,'#3F606B',b.width).setOrigin(.5,0).setName('result-art/hand-fallback');
   for(const [i,card] of cards.entries()){
     const row=Math.floor(i/cols),rowCount=Math.min(cols,cards.length-row*cols),x=left+(cols-rowCount)*(cardWidth+4)/2+i%cols*(cardWidth+4),y=b.y+labelHeight+row*(cardHeight+6);
     view.material({x,y,width:cardWidth,height:cardHeight},T.paperLight,T.paperLight,3).setName('result-art/played-card').setData('cardId',card.id);
     view.add(scene.add.graphics().lineStyle(1,T.divider).strokeRoundedRect(x,y,cardWidth,cardHeight,3));
     const color=card.suit==='hearts'||card.suit==='diamonds'?'#B8473A':'#26313A';
     view.text(x+cardWidth/2,y+2,rankLabel(card.rank),16,color).setOrigin(.5,0).setFontStyle('bold');
     view.text(x+cardWidth/2,y+cardHeight-2,SUIT_SYMBOL[card.suit],18,color).setOrigin(.5,1);
   }
   label.setData('playedIds',played.map(c=>c.id)).setData('shownIds',cards.map(c=>c.id));
 }
 const hasFallback=!keys.length&&facts.trace&&height>=66;
 const text:Box=side&&keys.length?{x:b.x+total*scale+12,y:b.y,width:b.width-total*scale-12,height:b.height}:{x:b.x,y:b.y+(keys.length||hasFallback?imageHeight+10:0),width:b.width,height:b.height-(keys.length||hasFallback?imageHeight+10:0)};
 return {text,art};
}
