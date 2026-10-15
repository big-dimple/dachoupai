import type Phaser from 'phaser';
import {heroPayoffs} from './HeroPayoff';
import {heroClimaxLayout} from './HeroClimaxLayout';
import {mountHeroClimaxCaption} from './HeroClimaxCaption';
import {climaxSourceKey} from './ClimaxSourceArt';
import {crispText,textDensity} from './TextRaster';
import {fitScoreLine} from './ScoreTextLayout';
import type {Box} from './layout';
import type {JokerKeyHighlight} from './JokerKeyHighlight';
import type {R2RunState} from '../domain/r2Run';
import type {ScoreTrace} from '../domain/scoreR2';
import {readableFractionText,heatText} from './scoreText';
import {readableMultiplierEffect} from './ScoreEventCaption';
import {scoreSourceProcess,scoreSourceClimaxValue} from './ScoreSourceProcess';
import {selectionPortraitKey,avatarKey} from './portraits';
import {jokerArtKey} from './jokerArt';
import {getCharacter} from './characters';
import {savedSkillName} from './SettlementHighlights';
import {SCORE_FONT,UI_FONT,PAPER_THEME as T,PAPER_CSS as C} from './theme';
export interface HeroClimaxValue {label:string;before:string;after:string;note:string;accumulated?:string;skillName?:string;landingValue?:string;landingLabel?:string}
/** Saved capability payoffs and actual bursts; legacy opening keys retain their receipt checks. */
export function heroClimaxValue(state:R2RunState,trace:ScoreTrace,key:JokerKeyHighlight,replay=false):HeroClimaxValue|undefined {
 if(replay||!key.heroId||key.heroId!==state.characterId)return;
 if(key.kind==='payoff'||key.kind==='burst'){const actual=heroPayoffs(state,trace).find(k=>k.eventId===key.eventId&&k.kind===key.kind);const event=trace.events.find(e=>e.eventId===key.eventId);if(!actual||!event)return;const cue=scoreSourceProcess(trace,event,actual.fact.title),value=cue&&scoreSourceClimaxValue(cue,readableMultiplierEffect(actual.fact.effect,event.value));return value&&{...value,skillName:savedSkillName(state,trace,event),landingValue:readableFractionText(cue!.kind==='heat'?event.after.H:event.after.M),landingLabel:cue!.kind==='heat'?'累计热度落位':'累计倍率落位'};}
 if(state.phase==='run-lost')return;
 const stamp=state.openingShow;
 if(!stamp||stamp.rootId!==trace.rootId||stamp.eventId!==key.eventId||stamp.handsScored>5)return;
 if(key.kind==='starter') {if(stamp.reason!=='starter'||state.routeStarter?.eventId!==key.eventId)return;}
 else if(key.kind!=='opening'||!['multiply','score'].includes(stamp.reason??''))return;
 const event=trace.events.find(e=>e.eventId===key.eventId);if(!event)return;
 if(event.phase==='finalScore')return {label:'实际得分',before:trace.finalScore,after:trace.finalScore,note:'这一手已结算'};
 if(event.operation==='add-growth'){
  const before=trace.sourceJokers.find(j=>j.instanceId===event.sourceInstanceId)?.growth.multiplier??{n:'0',d:'1'},after=trace.jokers.find(j=>j.instanceId===event.sourceInstanceId)?.growth.multiplier;
  if(!before||!after)return;
  return {label:'成长已保存',before:readableFractionText(before),after:readableFractionText(after),note:'下手生效 · 不加本手分'};
 }
 const cue=scoreSourceProcess(trace,event,key.fact.title);
 if(cue){const value=scoreSourceClimaxValue(cue,readableMultiplierEffect(key.fact.effect,event.value));return value&&{...value,landingValue:readableFractionText(cue.kind==='heat'?event.after.H:event.after.M),landingLabel:cue.kind==='heat'?'累计热度落位':'累计倍率落位'};}
 return {label:'实际热度',before:readableFractionText(event.before.H),after:readableFractionText(event.after.H),note:readableMultiplierEffect(key.fact.effect,event.value)};
}
export interface HeroClimaxView {group:Phaser.GameObjects.Container;strike:()=>void;release:()=>Promise<void>;reduce:()=>void;dispose:()=>void}
/** Three shots inside the existing queue slot. Owns no input, command or extra hold. */
export function mountHeroClimax(scene:Phaser.Scene,root:Phaser.GameObjects.Container,viewport:Box,key:JokerKeyHighlight,value:HeroClimaxValue,reduced:boolean):HeroClimaxView|undefined {
 const id=key.heroId;if(!id)return;
 const heroKey=['opening-portrait-'+id,selectionPortraitKey(id),avatarKey(id)].find(k=>scene.textures.exists(k));if(!heroKey)return;
 const {width:w,height:h}=viewport,l=heroClimaxLayout(w,h,!!key.fact.definitionId),p=l.panel;
 const group=scene.add.container(0,0).setName('joker/key-focus').setData('eventId',key.eventId).setData('benefit',key.fact).setData('heroClimax',true).setData('starter',key.kind==='starter').setData('phase',reduced?'still':'charge').setData('bounds',viewport).setData('panel',p).setData('headlineWidth',l.nameW);root.add(group);
 const board=scene.add.container(0,0).setName('hero/climax-board');group.add(board);
 const shapes=scene.add.graphics();board.add(shapes);
 shapes.fillStyle(T.ink,.08).fillPoints([{x:p.x,y:p.y+8},{x:p.x+p.width,y:p.y+3},{x:p.x+p.width,y:p.y+p.height+5},{x:p.x,y:p.y+p.height+8}],true);
 shapes.fillStyle(T.paperLight,1).fillPoints([{x:p.x,y:p.y+5},{x:p.x+p.width,y:p.y},{x:p.x+p.width,y:p.y+p.height-4},{x:p.x,y:p.y+p.height}],true);
 shapes.lineStyle(2,T.ink,.85).lineBetween(p.x,p.y+5,p.x+p.width,p.y);
 shapes.lineStyle(3,T.red,.8).lineBetween(p.x,p.y+p.height,p.x+p.width,p.y+p.height-4);
 if(scene.textures.exists('p00-paper'))board.add(scene.add.tileSprite(p.x+3,p.y+7,p.width-6,p.height-12,'p00-paper').setOrigin(0).setAlpha(.07));
 const text=(parent:Phaser.GameObjects.Container,x:number,y:number,s:string,size:number,color=C.ink,width?:number)=>{const t=scene.add.text(x,y,s,{fontFamily:UI_FONT,fontSize:size+'px',fontStyle:'bold',color,resolution:textDensity(scene),...(width?{wordWrap:{width,useAdvancedWrap:true}}:{})});parent.add(t);crispText(t);return t;};
 const actualSource=!!key.fact.definitionId,title=actualSource?key.fact.title:value.skillName??getCharacter(id).name;
 mountHeroClimaxCaption(scene,board,l,{title,owner:actualSource?getCharacter(id).name+' · 来源兑现':value.skillName?getCharacter(id).name+' · 技能兑现':'这一手 · 实际兑现',effect:value.note});
 const eyesLayer=scene.add.container(0,0).setName('hero/shot-eyes'),skillLayer=scene.add.container(0,0).setName('hero/shot-skill'),landingLayer=scene.add.container(0,0).setName('hero/shot-landing');board.add([eyesLayer,skillLayer,landingLayer]);
 // Existing 615×768 artwork supports an honest portrait focus, not a panoramic eye strip.
 // A dedicated eye painting is absent. Never enlarge any sampled pixel on the framebuffer.
 const density=textDensity(scene),portraitSource=scene.textures.get(heroKey).getSourceImage() as HTMLImageElement;
 const addCrop=(parent:Phaser.GameObjects.Container,key:string,b:Box,crop:{x:number;y:number;width:number;height:number},name:string)=>{
  const source=scene.textures.get(key).getSourceImage() as HTMLImageElement,scale=Math.min(b.width/crop.width,b.height/crop.height,1/density);
  const image=scene.add.image(b.x+b.width/2+(source.width/2-crop.x-crop.width/2)*scale,b.y+b.height/2+(source.height/2-crop.y-crop.height/2)*scale,key).setOrigin(.5).setCrop(crop.x,crop.y,crop.width,crop.height).setScale(scale).setName(name).setData('visibleBounds',b);parent.add(image);return image;
 };
 const character=getCharacter(id),cropW=Math.round(portraitSource.width*.90),cropH=Math.round(portraitSource.height*.50);
 const cropX=Math.round(Math.max(0,Math.min(portraitSource.width-cropW,portraitSource.width*character.portraitFocusX-cropW/2))),cropY=Math.round(Math.max(0,Math.min(portraitSource.height-cropH,portraitSource.height*character.portraitFocusY-cropH/2)));
 const hasFocus=portraitSource.width>=600&&portraitSource.height>=700;
 if(hasFocus)addCrop(eyesLayer,heroKey,l.portrait?l.eyes:l.source,{x:cropX,y:cropY,width:cropW,height:cropH},'hero/climax-eyes').setData('assetId',id+'.portrait').setData('camera','portrait-focus');
 text(eyesLayer,l.portrait?l.nameX:l.readout.x,l.portrait?l.eyes.y+l.eyes.height+20:l.readout.y,character.quote,l.short?16:20,C.jade,l.portrait?l.nameW:l.readout.width).setName('hero/climax-eye-quote');
 if(!l.portrait)text(eyesLayer,l.readout.x,l.readout.y+(l.short?40:74),value.label+' '+value.after,l.short?18:28,C.red,l.readout.width).setName('hero/climax-focus-effect');
 // Contain the full subject and source painting rather than cutting off most of the picture.
 const hero=addCrop(skillLayer,heroKey,l.source,{x:0,y:0,width:portraitSource.width,height:portraitSource.height},'hero/climax-portrait');
 const sourceDetail=actualSource&&scene.textures.exists(climaxSourceKey(key.fact.definitionId)),art=[climaxSourceKey(key.fact.definitionId),jokerArtKey(key.fact.definitionId)].find(k=>k&&scene.textures.exists(k));
 let sourceCard:Phaser.GameObjects.Container|undefined;
 if(actualSource&&art){
  const b=l.source,source=scene.textures.get(art).getSourceImage() as HTMLImageElement,scale=Math.min(b.width/source.width,b.height/source.height,1/density);
  sourceCard=scene.add.container(b.x+b.width/2,b.y+b.height/2).setName('hero/climax-source-card').setData('detail',sourceDetail);skillLayer.add(sourceCard);
  sourceCard.add(scene.add.image(0,0,art).setScale(scale).setName('hero/climax-source').setData('definitionId',key.fact.definitionId).setData('visibleBounds',b));hero.setVisible(false);
 }
 text(skillLayer,l.readout.x,l.readout.y,value.label,l.short?14:18,C.jade,l.readout.width).setName('hero/climax-value-label');
 const format=(s:string)=>/^\d{16,}$/.test(s)?'≈'+heatText(s):s;
 const number=(parent:Phaser.GameObjects.Container,x:number,y:number,s:string,size:number,width:number,height:number,name:string)=>{const t=scene.add.text(x,y,format(s),{fontFamily:SCORE_FONT,fontSize:size+'px',fontStyle:'800',color:C.red,resolution:density}).setName(name).setData('exactValue',s);parent.add(t);fitScoreLine(t,{x:x-width/2,y,width,height},size,true);return t;};
 const readout=number(skillLayer,l.readout.x+l.readout.width/2,l.valueY,value.after,l.short?48:l.portrait?82:112,l.readout.width,l.short?70:120,'hero/climax-value');
 if(value.accumulated)text(skillLayer,l.readout.x,l.valueY+readout.displayHeight+18,value.accumulated,l.short?14:18,C.jade,l.readout.width).setName('hero/climax-landing');
 text(skillLayer,l.sourceCaption.x,l.sourceCaption.y,(actualSource?'实际来源 · ':'')+key.fact.title,l.short?14:16,C.jade,l.sourceCaption.width).setName('hero/climax-source-title');
 // Last shot places the actual after-accumulator, never a future hand forecast.
 const landingY=l.landing.y+(l.short?20:52),landingValue=value.landingValue??value.after;
 text(landingLayer,l.nameX,l.landing.y,value.landingLabel??value.label,l.short?16:20,C.jade,l.nameW).setName('hero/climax-value-label');
 const landed=number(landingLayer,p.x+p.width/2,landingY,landingValue,l.short?74:l.portrait?138:190,l.nameW,l.landing.height*.63,'hero/climax-value');
 text(landingLayer,l.nameX,landingY+landed.displayHeight+16,value.landingValue?value.label+' '+value.after:value.note,l.short?14:20,C.red,l.nameW).setName('hero/climax-local-effect');
 text(landingLayer,l.sourceCaption.x,l.sourceCaption.y,value.accumulated??key.landing,l.short?14:18,C.jade,l.sourceCaption.width).setName('hero/climax-landing');
 const owned=new Set<Phaser.Tweens.Tween>();let disposed=false,still=reduced,struck=false,strikeAt=0,shotAt=performance.now(),shot='',releaseDone:(()=>void)|undefined;
 const started=performance.now();
 const show=(next:string)=>{if(next===shot)return;shot=next;shotAt=performance.now();eyesLayer.setVisible(next==='eyes');skillLayer.setVisible(next==='skill');landingLayer.setVisible(next==='landing');group.setData('shot',next).setData('shotAt',shotAt);};
 const update=()=>{
  if(disposed||group.getData('phase')==='release')return;
  const now=performance.now();show(still?'landing':(!struck||now-started<180)?(hasFocus?'eyes':'skill'):now-strikeAt<600?'skill':'landing');
 };
 const settle=()=>{board.setPosition(0,0).setAlpha(1);show('landing');};
 const dispose=(destroy=true)=>{if(disposed)return;disposed=true;scene.events?.off('update',update);for(const t of owned)t.remove();owned.clear();releaseDone?.();releaseDone=undefined;if(destroy&&group.active)group.destroy();};
 group.once('destroy',()=>dispose(false));scene.events?.on('update',update);update();
 return {group,dispose,
  reduce:()=>{still=true;for(const t of owned)t.remove();owned.clear();settle();releaseDone?.();releaseDone=undefined;},
  strike:()=>{if(disposed||struck)return;struck=true;strikeAt=performance.now();group.setData('phase','strike').setData('strikeAt',strikeAt);update();},
  release:()=>new Promise<void>(resolve=>{if(disposed||still){resolve();return;}group.setData('phase','release').setData('releaseAt',performance.now());releaseDone=resolve;const t=scene.tweens.add({targets:board,alpha:0,duration:150,ease:'Cubic.easeIn',onComplete:()=>{releaseDone=undefined;resolve();}});owned.add(t);}),
 };
}
