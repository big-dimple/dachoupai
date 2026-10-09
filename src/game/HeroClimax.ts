import type Phaser from 'phaser';
import {heroClimaxLayout} from './HeroClimaxLayout';
import {climaxSourceKey} from './ClimaxSourceArt';
import {inkSettlingEase} from './inkwaveSpring';
import {mountInkBurst,type InkBurstView} from './InkBurst';
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
 const {width:w,height:h}=viewport,layout=heroClimaxLayout(w,h,!!key.fact.definitionId),{portrait,short,panelY,panelH}=layout;
 const group=scene.add.container(0,0).setName('joker/key-focus').setData('eventId',key.eventId).setData('benefit',key.fact).setData('heroClimax',true).setData('starter',key.kind==='starter').setData('phase',reduced?'still':'charge').setData('bounds',viewport);root.add(group);
 const dim=scene.add.rectangle(w/2,h/2,w,h,T.ink,.66);group.add(dim);
 const board=scene.add.container(0,0),shapes=scene.add.graphics();group.add(board);board.add(shapes);
 shapes.fillStyle(T.red,1).fillPoints([{x:-w*.04,y:panelY+24},{x:w*1.04,y:panelY-10},{x:w*1.04,y:panelY+panelH-12},{x:-w*.04,y:panelY+panelH+26}],true);
 shapes.fillStyle(T.ink,1).fillPoints([{x:-w*.03,y:panelY+8},{x:w*1.04,y:panelY-18},{x:w*1.02,y:panelY+panelH-30},{x:-w*.04,y:panelY+panelH+8}],true);
 shapes.fillStyle(T.paperLight,1).fillPoints([{x:-w*.02,y:panelY+20},{x:w*1.01,y:panelY-3},{x:w*1.02,y:panelY+panelH-43},{x:-w*.03,y:panelY+panelH-7}],true);
 if(scene.textures.exists('p00-paper'))board.add(scene.add.tileSprite(0,panelY+24,w,panelH-68,'p00-paper').setOrigin(0).setAlpha(.18).setName('hero/climax-paper'));
 // Substantial ink/red wedges make the portrait a foreground cut-in, not a boxed sidebar.
 shapes.fillStyle(T.jade,.15).fillPoints([{x:0,y:panelY+panelH*.6},{x:w*.42,y:panelY+panelH*.02},{x:w*.72,y:panelY+panelH*.62},{x:w*.28,y:panelY+panelH*.94}],true);
 shapes.fillStyle(T.red,.9).fillPoints([{x:w*.02,y:panelY+panelH-34},{x:w*.62,y:panelY+panelH-72},{x:w*.55,y:panelY+panelH-32},{x:-20,y:panelY+panelH-5}],true);
 const source=scene.textures.get(heroKey).getSourceImage() as HTMLImageElement;
 const {heroH,heroX,heroY}=layout,heroScale=Math.min(heroH/source.height,layout.heroW/source.width);
 const hero=scene.add.image(heroX,heroY,heroKey).setScale(heroScale).setAngle(-5).setName('hero/climax-portrait');board.add(hero);
 const {nameX,nameY}=layout,contentX=layout.readout.x,contentW=layout.readout.width;
 const text=(x:number,y:number,s:string,size:number,color=C.ink,width?:number)=>{const t=scene.add.text(x,y,s,{fontFamily:UI_FONT,fontSize:size+'px',fontStyle:'bold',color,resolution:Math.max(1.5,1/scene.scale.zoom),...(width?{wordWrap:{width,useAdvancedWrap:true}}:{})});board.add(t);return t;};
 text(nameX,nameY,getCharacter(id).name,short?36:portrait?44:68).setName('hero/climax-name');
 text(portrait?w*.51:nameX,portrait?nameY+12:nameY+(short?44:78),key.kind==='starter'?'路线首发':key.cause==='实际乘法生效'?'倍率爆发':'开场得分',short?18:22,C.red,portrait?w*.4:contentW);
 const labelY=layout.readout.y;
 // Portrait recoil can cross the number column; keep its saved facts on opaque paper.
 board.add(scene.add.rectangle(contentX+contentW/2,labelY+layout.readout.height/2-8,contentW+16,layout.readout.height+16,T.paperLight,.97).setName('hero/climax-readout-paper'));
 text(contentX,labelY,value.label,short?16:18,C.jade,contentW);
 const readout=scene.add.text(contentX+contentW/2,layout.valueY,value.before,{fontFamily:SCORE_FONT,fontSize:(short?42:portrait?64:92)+'px',fontStyle:'800',color:C.red,resolution:Math.max(1.5,1/scene.scale.zoom)}).setOrigin(.5,0).setName('hero/climax-value');board.add(readout);
 const fitValue=()=>{readout.setScale(Math.min(1,contentW/readout.width));};fitValue();
 const note=text(contentX,layout.noteY,value.note,short?14:16,C.ink,contentW).setName('hero/climax-note');
 const sourceY=layout.sourceCaption.y,sourceX=layout.sourceCaption.x,sourceW=layout.sourceCaption.width;
 board.add(scene.add.rectangle(sourceX+sourceW/2,sourceY+layout.sourceCaption.height/2,sourceW+12,layout.sourceCaption.height,T.paperLight,1).setStrokeStyle(1,T.ink,.45));
 const art=[climaxSourceKey(key.fact.definitionId),jokerArtKey(key.fact.definitionId)].find(k=>k&&scene.textures.exists(k));
 let sourceCard:Phaser.GameObjects.Container|undefined;
 if(key.fact.definitionId&&art){
  const b=layout.source,original=scene.textures.get(art).getSourceImage() as HTMLImageElement;
  sourceCard=scene.add.container(b.x+b.width/2,b.y+b.height/2).setName('hero/climax-source-card');board.add(sourceCard);
  const cardW=Math.min(b.width,b.height*.8),cardH=cardW/ .8;
  sourceCard.add(scene.add.rectangle(3,4,cardW+14,cardH+14,T.ink,.16));sourceCard.add(scene.add.rectangle(0,0,cardW+14,cardH+14,T.paperLight,1).setStrokeStyle(2,T.jade));
  sourceCard.add(scene.add.image(0,0,art).setScale(Math.min(cardW/original.width,cardH/original.height)).setName('hero/climax-source').setData('definitionId',key.fact.definitionId));
  sourceCard.setAngle(3);
 }
 text(sourceX,sourceY,(key.fact.definitionId?'实际来源 · ':'')+key.fact.title,short?14:18,C.ink,sourceW).setName('hero/climax-source-title');
 text(sourceX,sourceY+(short?22:30),key.landing,short?14:16,C.jade,sourceW).setName('hero/climax-landing');
 const brush=scene.add.graphics().setName('hero/climax-ink-brush');board.addAt(brush,1);
 for(let i=0;i<7;i++){const y=panelY+panelH*(.12+i*.11);brush.fillStyle(i%2?T.jade:T.ink,i%2?.16:.11).fillPoints([{x:-w*.2,y:y+14},{x:w*(.42+(i%3)*.09),y:y-22},{x:w*.56,y:y+25},{x:-w*.08,y:y+40}],true);}
 const foreground=scene.add.container(0,0);board.addAt(foreground,board.list.indexOf(hero)+1);
 const owned=new Set<Phaser.Tweens.Tween>();let disposed=false,still=reduced,struck=false,burst:InkBurstView|undefined,releaseDone:(()=>void)|undefined;
 const tween=(config:Phaser.Types.Tweens.TweenBuilderConfig)=>{if(disposed)return;const t=scene.tweens.add(config);owned.add(t);return t;};
 const neutral=()=>{burst?.dispose();burst=undefined;brush.setPosition(0,0).setAlpha(1).setScale(1);board.setPosition(0,0).setAlpha(1);hero.setPosition(heroX,heroY).setScale(heroScale).setAngle(-5);readout.setY(layout.valueY);fitValue();sourceCard?.setPosition(layout.source.x+layout.source.width/2,layout.source.y+layout.source.height/2).setScale(1).setAngle(3);};
 if(!still){board.setX(-w*.72).setAlpha(.25);hero.setPosition(heroX-w*.18,heroY+28).setScale(heroScale*.84).setAngle(-12);brush.setX(-w*.6);readout.setScale(readout.scaleX*.88);tween({targets:board,x:0,alpha:1,duration:200,ease:'Cubic.easeOut'});tween({targets:brush,x:0,duration:260,ease:'Cubic.easeOut'});tween({targets:hero,scaleX:heroScale*.96,scaleY:heroScale*.96,x:heroX-8,y:heroY,angle:-5,duration:250,ease:inkSettlingEase(.28)});}
 const dispose=(destroyGroup=true)=>{if(disposed)return;disposed=true;burst?.dispose();burst=undefined;for(const t of owned)t.remove();owned.clear();releaseDone?.();releaseDone=undefined;if(destroyGroup&&group.active)group.destroy();};
 group.once('destroy',()=>dispose(false));
 return {group,dispose,
  reduce:()=>{still=true;for(const t of owned)t.remove();owned.clear();neutral();releaseDone?.();releaseDone=undefined;},
  strike:()=>{if(disposed||struck)return;struck=true;group.setData('phase','strike');readout.setText(value.after);fitValue();note.setText(value.note);if(still)return;
   for(const t of owned)t.remove();owned.clear();board.setPosition(0,0).setAlpha(1);sourceCard?.setScale(1.06).setAngle(-2);if(sourceCard)tween({targets:sourceCard,scaleX:1,scaleY:1,angle:3,duration:340,ease:inkSettlingEase(.32)});hero.setPosition(heroX+18,heroY+(portrait?32:-18)).setScale(heroScale*1.16).setAngle(-9);brush.setPosition(-w*.05,0).setScale(1.16,1);
   burst=mountInkBurst(scene,foreground,heroX,heroY+heroH*.12,Math.min(w,h)*.48,T.red,820,24);
   const readoutY=layout.valueY,fit=Math.min(1,contentW/readout.width);readout.setY(readoutY+8).setScale(fit,fit*1.23);
   tween({targets:hero,x:heroX,y:heroY,scaleX:heroScale,scaleY:heroScale,angle:-5,duration:420,ease:inkSettlingEase(.30)});tween({targets:brush,x:0,scaleX:1,duration:520,ease:'Cubic.easeOut'});tween({targets:readout,y:readoutY,scaleX:fit,scaleY:fit,duration:340,ease:inkSettlingEase(.32)});
  },
  release:()=>new Promise<void>(resolve=>{if(disposed||still){resolve();return;}group.setData('phase','release');burst?.dispose();burst=undefined;releaseDone=resolve;tween({targets:brush,x:w*.3,alpha:0,duration:180,ease:'Cubic.easeIn'});tween({targets:board,x:w*.16,alpha:0,duration:180,ease:'Cubic.easeIn',onComplete:()=>{releaseDone=undefined;resolve();}});tween({targets:dim,alpha:0,duration:180});}),
 };
}
