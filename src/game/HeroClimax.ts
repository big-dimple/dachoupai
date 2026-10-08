import type Phaser from 'phaser';
import type {Box} from './layout';
import type {JokerKeyHighlight} from './JokerKeyHighlight';
import type {R2RunState} from '../domain/r2Run';
import type {ScoreTrace} from '../domain/scoreR2';
import {fractionText} from './scoreText';
import {selectionPortraitKey,avatarKey} from './portraits';
import {jokerArtKey} from './jokerArt';
import {getCharacter} from './characters';
import {SCORE_FONT,UI_FONT,PAPER_THEME as T,PAPER_CSS as C} from './theme';
export interface HeroClimaxValue {label:string;before:string;after:string;note:string}
/** Only this run's saved first opening event can own a foreground stage. */
export function heroClimaxValue(state:R2RunState,trace:ScoreTrace,key:JokerKeyHighlight,replay=false):HeroClimaxValue|undefined {
 if(replay||state.phase==='run-lost'||!key.heroId)return;
 const stamp=state.openingShow;
 if(!stamp||stamp.rootId!==trace.rootId||stamp.eventId!==key.eventId||stamp.handsScored>5)return;
 if(key.kind==='starter') {if(stamp.reason!=='starter'||state.routeStarter?.eventId!==key.eventId)return;}
 else if(key.kind!=='opening'||!['multiply','score'].includes(stamp.reason??''))return;
 const event=trace.events.find(e=>e.eventId===key.eventId);if(!event)return;
 if(event.phase==='finalScore')return {label:'实际得分',before:trace.finalScore,after:trace.finalScore,note:'这一手已结算'};
 if(event.operation==='add-growth'){
  const before=trace.sourceJokers.find(j=>j.instanceId===event.sourceInstanceId)?.growth.multiplier??{n:'0',d:'1'},after=trace.jokers.find(j=>j.instanceId===event.sourceInstanceId)?.growth.multiplier;
  if(!before||!after)return;
  return {label:'成长已保存',before:fractionText(before),after:fractionText(after),note:'下手生效 · 不加本手分'};
 }
 if(event.before.M.n!==event.after.M.n||event.before.M.d!==event.after.M.d)return {label:'实际倍率',before:'×'+fractionText(event.before.M),after:'×'+fractionText(event.after.M),note:key.fact.effect};
 return {label:'实际热度',before:fractionText(event.before.H),after:fractionText(event.after.H),note:key.fact.effect};
}
export interface HeroClimaxView {group:Phaser.GameObjects.Container;strike:()=>void;release:()=>Promise<void>;reduce:()=>void;dispose:()=>void}
/** Big committed-event cut-in; no input handlers, camera shake or gameplay callbacks. */
export function mountHeroClimax(scene:Phaser.Scene,root:Phaser.GameObjects.Container,viewport:Box,key:JokerKeyHighlight,value:HeroClimaxValue,reduced:boolean):HeroClimaxView|undefined {
 const id=key.heroId;if(!id)return;
 const heroKey=['opening-portrait-'+id,selectionPortraitKey(id),avatarKey(id)].find(k=>scene.textures.exists(k));if(!heroKey)return;
 const {width:w,height:h}=viewport,portrait=w<h,short=h<450,panelY=portrait?h*.105:h*.13,panelH=portrait?h*.72:h*.72;
 const group=scene.add.container(0,0).setName('joker/key-focus').setData('eventId',key.eventId).setData('benefit',key.fact).setData('heroClimax',true).setData('phase',reduced?'still':'charge').setData('bounds',viewport);root.add(group);
 const dim=scene.add.rectangle(w/2,h/2,w,h,T.ink,.66);group.add(dim);
 const board=scene.add.container(0,0),shapes=scene.add.graphics();group.add(board);board.add(shapes);
 shapes.fillStyle(T.red,1).fillPoints([{x:-w*.04,y:panelY+24},{x:w*1.04,y:panelY-10},{x:w*1.04,y:panelY+panelH-12},{x:-w*.04,y:panelY+panelH+26}],true);
 shapes.fillStyle(T.ink,1).fillPoints([{x:-w*.03,y:panelY+8},{x:w*1.04,y:panelY-18},{x:w*1.02,y:panelY+panelH-30},{x:-w*.04,y:panelY+panelH+8}],true);
 shapes.fillStyle(T.paperLight,1).fillPoints([{x:-w*.02,y:panelY+20},{x:w*1.01,y:panelY-3},{x:w*1.02,y:panelY+panelH-43},{x:-w*.03,y:panelY+panelH-7}],true);
 // Substantial ink/red wedges make the portrait a foreground cut-in, not a boxed sidebar.
 shapes.fillStyle(T.jade,.15).fillPoints([{x:0,y:panelY+panelH*.6},{x:w*.42,y:panelY+panelH*.02},{x:w*.72,y:panelY+panelH*.62},{x:w*.28,y:panelY+panelH*.94}],true);
 shapes.fillStyle(T.red,.9).fillPoints([{x:w*.02,y:panelY+panelH-34},{x:w*.62,y:panelY+panelH-72},{x:w*.55,y:panelY+panelH-32},{x:-20,y:panelY+panelH-5}],true);
 const source=scene.textures.get(heroKey).getSourceImage() as HTMLImageElement;
 const heroH=portrait?panelH*.69:panelH*.94,heroScale=Math.min(heroH/source.height,(portrait?w*.66:w*.4)/source.width),heroX=portrait?w*.34:w*.28,heroY=portrait?panelY+panelH*.44:panelY+panelH*.48;
 const hero=scene.add.image(heroX,heroY,heroKey).setScale(heroScale).setAngle(-5).setName('hero/climax-portrait');board.add(hero);
 const nameX=portrait?20:w*.52,nameY=portrait?panelY+12:panelY+panelH*.09,contentX=portrait?w*.59:w*.52,contentW=portrait?w*.36:w*.42;
 const text=(x:number,y:number,s:string,size:number,color=C.ink,width?:number)=>{const t=scene.add.text(x,y,s,{fontFamily:UI_FONT,fontSize:size+'px',fontStyle:'bold',color,resolution:Math.max(1.5,1/scene.scale.zoom),...(width?{wordWrap:{width,useAdvancedWrap:true}}:{})});board.add(t);return t;};
 text(nameX,nameY,getCharacter(id).name,short?36:portrait?44:68).setName('hero/climax-name');
 text(portrait?w*.51:nameX,portrait?nameY+12:nameY+(short?44:78),key.kind==='starter'?'路线首发':key.cause==='实际乘法生效'?'倍率爆发':'开场得分',short?18:22,C.red,portrait?w*.4:contentW);
 const labelY=portrait?panelY+panelH*.36:panelY+panelH*.36;
 text(contentX,labelY,value.label,short?16:18,C.jade,contentW);
 const readout=scene.add.text(contentX+contentW/2,labelY+(short?27:42),value.before,{fontFamily:SCORE_FONT,fontSize:(short?42:portrait?58:92)+'px',fontStyle:'800',color:C.red,resolution:Math.max(1.5,1/scene.scale.zoom)}).setOrigin(.5,0).setName('hero/climax-value');board.add(readout);
 const fitValue=()=>{readout.setScale(Math.min(1,contentW/readout.width));};fitValue();
 const note=text(contentX,labelY+(short?83:portrait?120:162),value.note,short?14:16,C.ink,contentW).setName('hero/climax-note');
 const sourceY=panelY+panelH-(short?66:104),sourceX=portrait?20:w*.52,sourceW=portrait?w-40:w*.44,art=jokerArtKey(key.fact.definitionId),artSize=short?40:60;
 board.add(scene.add.rectangle(sourceX+sourceW/2,sourceY+(short?24:42),sourceW+12,short?56:92,T.paperLight,1).setStrokeStyle(1,T.ink,.45));
 if(art&&scene.textures.exists(art)){const im=scene.add.image(sourceX+artSize*.4,sourceY+artSize*.5,art).setDisplaySize(artSize*.8,artSize).setName('hero/climax-source');board.add(im);}
 const offset=art&&scene.textures.exists(art)?artSize+8:0;
 text(sourceX+offset,sourceY,(key.fact.definitionId?'实际来源 · ':'')+key.fact.title,short?14:18,C.ink,sourceW-offset).setName('hero/climax-source-title');
 text(sourceX+offset,sourceY+(short?22:30),key.landing,short?14:16,C.jade,sourceW-offset).setName('hero/climax-landing');
 const burst=scene.add.graphics().setAlpha(0);board.addAt(burst,1);burst.fillStyle(T.red,.28);for(let i=0;i<9;i++){const a=i*Math.PI*2/9,x=heroX,y=heroY,len=Math.min(w,h)*(.38+(i%3)*.09);burst.fillPoints([{x:x+Math.cos(a)*40,y:y+Math.sin(a)*40},{x:x+Math.cos(a-.035)*len,y:y+Math.sin(a-.035)*len},{x:x+Math.cos(a+.035)*len,y:y+Math.sin(a+.035)*len}],true);}
 const owned=new Set<Phaser.Tweens.Tween>();let disposed=false,still=reduced,releaseDone:(()=>void)|undefined;
 const tween=(config:Phaser.Types.Tweens.TweenBuilderConfig)=>{if(disposed)return;const t=scene.tweens.add(config);owned.add(t);return t;};
 const neutral=()=>{board.setPosition(0,0).setAlpha(1);hero.setPosition(heroX,heroY).setScale(heroScale).setAngle(-5);fitValue();burst.setAlpha(0);};
 if(!still){board.setX(-w*.2).setAlpha(.4);hero.setScale(heroScale*.86);readout.setScale(readout.scaleX*.88);tween({targets:board,x:0,alpha:1,duration:180,ease:'Cubic.easeOut'});tween({targets:hero,scaleX:heroScale*.96,scaleY:heroScale*.96,x:heroX-12,duration:230,ease:'Cubic.easeIn'});}
 const dispose=(destroyGroup=true)=>{if(disposed)return;disposed=true;for(const t of owned)t.remove();owned.clear();releaseDone?.();releaseDone=undefined;if(destroyGroup&&group.active)group.destroy();};
 group.once('destroy',()=>dispose(false));
 return {group,dispose,
  reduce:()=>{still=true;for(const t of owned)t.remove();owned.clear();neutral();releaseDone?.();releaseDone=undefined;},
  strike:()=>{if(disposed)return;group.setData('phase','strike');readout.setText(value.after);fitValue();note.setText(value.note);if(still)return;
   for(const t of owned)t.remove();owned.clear();board.setPosition(0,0).setAlpha(1);hero.setPosition(heroX+12,heroY-9).setScale(heroScale*1.14).setAngle(-8);burst.setAlpha(1);readout.setScale(readout.scaleX*1.12);
   tween({targets:hero,x:heroX,y:heroY,scaleX:heroScale,scaleY:heroScale,angle:-5,duration:240,ease:'Cubic.easeOut'});tween({targets:burst,alpha:0,duration:300,ease:'Cubic.easeOut'});tween({targets:readout,scaleX:Math.min(1,contentW/readout.width),scaleY:Math.min(1,contentW/readout.width),duration:220,ease:'Quad.easeOut'});
  },
  release:()=>new Promise<void>(resolve=>{if(disposed||still){resolve();return;}group.setData('phase','release');releaseDone=resolve;tween({targets:board,x:w*.13,alpha:0,duration:130,ease:'Cubic.easeIn',onComplete:()=>{releaseDone=undefined;resolve();}});tween({targets:dim,alpha:0,duration:130});}),
 };
}
