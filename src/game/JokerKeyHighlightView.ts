import type Phaser from 'phaser';
import type {Box,LayoutMode} from './layout';
import {jokerArtKey} from './jokerArt';
import {PAPER_THEME as T,PAPER_CSS as C,UI_FONT} from './theme';
import type {JokerKeyHighlight} from './JokerKeyHighlight';
/** Three exclusive regions: side, stacked played area, or the actual source slot. */
export function keyFocusPlacement(mode:LayoutMode,short:boolean,area:Box,mat:Box,bottom:number,cardHeight:number,slot:Box):{box:Box;compact:boolean;cardY?:number}{
 const side=area.x+area.width-mat.x-mat.width-16,vertical=bottom-area.y-cardHeight-12;
 if(mode==='desktop'&&side>=180){const width=Math.min(220,side);return {box:{x:area.x+area.width-width-8,y:area.y+Math.max(8,(area.height-240)/2),width,height:Math.min(240,area.height-16)},compact:false};}
 if(!short&&vertical>=72)return {box:{x:area.x+4,y:area.y+4,width:area.width-8,height:vertical},compact:false,cardY:bottom-cardHeight/2-2};
 return {box:short?{x:slot.x+slot.width/2-30,y:slot.y,width:60,height:72}:slot,compact:true};
}
/** Bounded card portrait; no input capture and no score/reward commands. */
export function mountKeyHighlight(scene:Phaser.Scene,root:Phaser.GameObjects.Container,box:Box,key:JokerKeyHighlight,compact=false){
 const group=scene.add.container(box.x,box.y).setName('joker/key-focus').setData('eventId',key.eventId).setData('benefit',key.fact).setData('bounds',box);
 root.add(group);
 group.add(scene.add.rectangle(box.width/2,box.height/2,box.width,box.height,T.paperLight,.98).setStrokeStyle(2,T.brass));
 const art= jokerArtKey(key.fact.definitionId),horizontal=box.width>box.height*1.6;
 const text=(x:number,y:number,value:string,size:number,width:number)=>{const t=scene.add.text(x,y,value,{fontFamily:UI_FONT,fontSize:size+'px',color:C.ink,wordWrap:{width,useAdvancedWrap:true}});group.add(t);return t;};
 const artHeight=compact?Math.max(24,box.height-24):horizontal?box.height-12:Math.min(110,box.height*.43),artWidth=artHeight*.8;
 if(art&&scene.textures.exists(art))group.add(scene.add.image(horizontal?artWidth/2+6:box.width/2,compact?24+artHeight/2:horizontal?box.height/2:12+artHeight/2,art).setDisplaySize(artWidth,artHeight).setName('joker/key-art'));
 if(compact){text(3,3,key.fact.title,14,box.width-6).setMaxLines(1);return group;}
 const x=horizontal?artWidth+14:8,y=horizontal?6:artHeight+18,w=box.width-x-8;
 text(x,y,key.fact.title,18,w).setFontStyle('bold');
 text(x,y+24,key.fact.effect,16,w).setName('joker/key-effect');
 // Compact mobile frame carries the cause in the normal status rail, preserving readable card ranks.
 if(!horizontal){text(x,y+64,key.cause,14,w).setName('joker/key-cause');text(x,y+84,key.landing,14,w).setName('joker/key-landing');}else text(x,y+box.height-26,key.cause,14,w).setName('joker/key-cause');
 return group;
}
