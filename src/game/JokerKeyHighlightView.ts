import type Phaser from 'phaser';
import type {Box,LayoutMode} from './layout';
import {jokerArtKey} from './jokerArt';
import {SCORE_FONT,PAPER_THEME as T,PAPER_CSS as C,UI_FONT} from './theme';
import type {JokerKeyHighlight} from './JokerKeyHighlight';
import {avatarKey,selectionPortraitKey} from './portraits';
import {getCharacter} from './characters';
import {STARTER_ROUTE_LABEL} from './RouteStarter';
/** Three exclusive regions: side, stacked played area, or the actual source slot. */
export function keyFocusPlacement(mode:LayoutMode,short:boolean,area:Box,mat:Box,bottom:number,cardHeight:number,slot:Box):{box:Box;compact:boolean;cardY?:number}{
 const side=area.x+area.width-mat.x-mat.width-16,vertical=bottom-area.y-cardHeight-12;
 if(mode==='desktop'&&side>=180){const width=Math.min(220,side);return {box:{x:area.x+area.width-width-8,y:area.y+Math.max(8,(area.height-240)/2),width,height:Math.min(240,area.height-16)},compact:false};}
 if(!short&&vertical>=72)return {box:{x:area.x+4,y:area.y+4,width:area.width-8,height:vertical},compact:false,cardY:bottom-cardHeight/2-2};
 return {box:short?{x:slot.x+slot.width/2-30,y:slot.y,width:60,height:72}:slot,compact:true};
}
/** Bounded card portrait; no input capture and no score/reward commands. */
export function mountKeyHighlight(scene:Phaser.Scene,root:Phaser.GameObjects.Container,box:Box,key:JokerKeyHighlight,compact=false){
 if(key.heroId)return mountStarterHighlight(scene,root,box,key,compact);
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
/** First committed route cue reuses cached portraits; no loader, video, texture creation or input. */
function mountStarterHighlight(scene:Phaser.Scene,root:Phaser.GameObjects.Container,box:Box,key:JokerKeyHighlight,compact:boolean){
 const hero=key.heroId!,route=key.route,group=scene.add.container(box.x,box.y).setName('joker/key-focus').setData('eventId',key.eventId).setData('benefit',key.fact).setData('bounds',box).setData('route',route).setData('starter',key.kind==='starter'||key.kind==='opening');
 root.add(group);group.add(scene.add.rectangle(box.width/2+3,box.height/2+4,box.width,box.height,T.ink,.16));group.add(scene.add.rectangle(box.width/2,box.height/2,box.width,box.height,T.paperLight,1).setStrokeStyle(2,T.ink));group.add(scene.add.rectangle(3,box.height/2,6,box.height,T.red));const hatch=scene.add.graphics().lineStyle(1,T.red,.55);for(let i=0;i<5;i++)hatch.lineBetween(box.width-10-i*7,6,box.width-4-i*7,2);group.add(hatch);
 const horizontal=box.width>box.height*1.6,small=compact||box.height<92;
 const text=(x:number,y:number,value:string,size:number,width:number,name:string)=>{const t=scene.add.text(x,y,value,{fontFamily:UI_FONT,fontSize:size+'px',color:C.ink,resolution:Math.max(1.5,1/scene.scale.zoom),wordWrap:{width,useAdvancedWrap:true}}).setName(name);group.add(t);return t;};
 const image=(key:string|undefined,b:Box,name:string)=>{if(!key||!scene.textures.exists(key))return;const source=scene.textures.get(key).getSourceImage() as HTMLImageElement;group.add(scene.add.image(b.x+b.width/2,b.y+b.height/2,key).setScale(Math.min(b.width/source.width,b.height/source.height)).setName(name));};
 const heroKey=['opening-portrait-'+hero,selectionPortraitKey(hero),avatarKey(hero)].find(k=>scene.textures.exists(k));
 const h=small?Math.max(22,box.height-42):horizontal?box.height-16:Math.min(96,box.height*.4),w=small?Math.min(26,(box.width-12)/2):h*.65;
 const start=horizontal?6:Math.max(6,(box.width-w*2-8)/2),top=small?22:horizontal?8:10;
 image(heroKey,{x:start,y:top,width:w,height:h},'joker/starter-hero');image(jokerArtKey(key.fact.definitionId),{x:start+w+8,y:top,width:w,height:h},'joker/key-art');
 if(!key.fact.definitionId&&!small){const value=key.fact.effect.match(/[\d,.]+$/)?.[0]??'×';group.add(scene.add.text(start+w+12,top+h*.25,value,{fontFamily:SCORE_FONT,fontSize:Math.min(40,h*.6)+'px',fontStyle:'800',color:C.red}).setName('joker/opening-number'));}
 if(small){text(4,3,key.fact.title,14,box.width-8,'joker/key-title');return group;}
 const x=horizontal?start+w*2+18:8,y=horizontal?6:top+h+8,width=box.width-x-8;
 text(x,y,getCharacter(hero).name+' · '+(route?STARTER_ROUTE_LABEL[route]+'首发':key.kind==='opening'?(key.cause==='实际乘法生效'?'倍率爆发':'开场得分'):'倍率冲击'),16,width,'joker/starter-title').setFontStyle('bold');
 text(x,y+22,key.fact.title+' · '+key.fact.effect,16,width,'joker/key-effect');
 text(x,y+62,key.landing,14,width,'joker/key-landing');
 const marks=[0,1,2].map(i=>{const m=scene.add.graphics({x:horizontal?10+i*10:box.width-34+i*10,y:horizontal?box.height-4:8}).setName('joker/starter-mark');m.lineStyle(1.5,T.red,.9);if(route==='flush')m.strokePoints([{x:0,y:-4},{x:4,y:0},{x:0,y:4},{x:-4,y:0}],true);else if(route==='group')m.strokeRoundedRect(-3,-4,6,8,1);else m.lineBetween(-3,2,3,-2);group.add(m);return m;});
 group.setData('routeMarks',marks);return group;
}
