import type Phaser from 'phaser';
import type {EffectContext} from '../core/EffectQueue';
import type {ScoreEvent,ScoreTrace} from '../domain/scoreR2';
import {Rational} from '../domain/rational';
import type {Box} from './layout';
import type {ScoreAnimate} from './ScorePosture';
import type {ScoreBeat} from './scorePresentation';
import {scoreContributions,type ScoreContribution} from './ScoreContribution';
import {ownedJokerMotionCue,ownedJokerScoreLayer,cancelOwnedJokerScoreMotion} from './OwnedJokerScoreMotion';
import {OWNED_SCORE_SPRING} from './inkwaveSpring';

type Point={x:number;y:number};
export const STRIKE_RETURN_LANDING=OWNED_SCORE_SPRING.firstCrossAt*2;
export interface JokerScoreStrikeCue {eventId:string;sourceInstanceId:string;contributions:ScoreContribution[]}
export function jokerScoreStrikeCue(trace:ScoreTrace,event:ScoreEvent):JokerScoreStrikeCue|undefined {
 if(!ownedJokerMotionCue(trace,event))return;
 const contributions=scoreContributions(event).filter(c=>Rational.fromJSON(c.after).compare(Rational.fromJSON(c.before))>0);
 if(contributions.length)return {eventId:event.eventId,sourceInstanceId:event.sourceInstanceId,contributions};
}

/** All four slots, hit hold and real-time visibility floors are composed once. */
export function jokerStrikeBeat(base:ScoreBeat,multiply:boolean,speed=1):ScoreBeat {
 const rate=[1,2,4].includes(speed)?speed:1,key=base.phrase?.role==='accent',pulse=base.phrase?.pulse??0;
 const windup=Math.max(key?160:multiply?130-Math.min(20,pulse):110-Math.min(30,pulse),40*rate),flight=Math.max(key?130:multiply?115:100,60*rate);
 const hold=Math.max(key?45:35,35*rate);let recovery=key?220:multiply?200:180;
 recovery=Math.max(recovery,96*rate-hold);
 if(base.phrase?.paired)recovery=Math.max(recovery,Math.ceil(Math.max(0,50*rate-hold)/STRIKE_RETURN_LANDING));
 return {...base,windup,flight,impact:hold+recovery,rest:key?55:30,strike:{hold,recovery}};
}

/** Projection always advances from the real source to the destination. */
export function strikeFlightPoint(from:Point,to:Point,t:number,arc=12):Point {
 const p=Math.max(0,Math.min(1,t)),u=p*p*p,dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy)||1,bend=Math.sin(Math.PI*p)*arc;
 return {x:from.x+dx*u-dy/length*bend,y:from.y+dy*u+dx/length*bend};
}
/** Preserve the damped spring, bounding the post-crossing excursion to a local lane. */
export function strikeReturnFraction(t:number,distance:number,overshoot=8):number {
 const s=OWNED_SCORE_SPRING.value(t*.5),tail=t>.65?((1-t)/.35)**2:1;return t<STRIKE_RETURN_LANDING?s:Math.tanh(s*Math.max(1,distance)/overshoot)*overshoot/Math.max(1,distance)*tail;
}

let snapshotOrdinal=0;
interface StrikeOptions {
 context:EffectContext;beat:ScoreBeat;textureKey:string;artBounds:Box;portrait:boolean;
 targets:Record<'H'|'M',Phaser.GameObjects.Text>;cells:Record<'H'|'M',Box>;animate:ScoreAnimate;refresh:()=>void;
 onRebound?:(remainingMs:number)=>void;
}
/** Visual copies only: source slot, hit target and saved card instance never move. */
export function prepareJokerScoreStrike(scene:Phaser.Scene,parent:Phaser.GameObjects.Container,marker:Phaser.GameObjects.Container,cue:JokerScoreStrikeCue,options:StrikeOptions){
 if(options.context.signal.aborted||!marker.active||!scene.textures.exists(options.textureKey)||!options.beat.strike)return;
 cancelOwnedJokerScoreMotion(marker);
 const visual=ownedJokerScoreLayer(scene,marker),rest={x:visual.x,y:visual.y,angle:visual.angle,sx:visual.scaleX,sy:visual.scaleY,alpha:visual.alpha};
 const abort=new AbortController(),context={generation:options.context.generation,signal:abort.signal},weight=options.beat.phrase?.accentWeight??1;
 const group=scene.add.container(0,0).setName('score/strike').setData('eventId',cue.eventId);parent.add(group);
 const local=(p:Point)=>parent.getWorldTransformMatrix().applyInverse(p.x,p.y),world=(p:Point)=>visual.getWorldTransformMatrix().transformPoint(p.x,p.y);
 const localBox=(box:Box):Box=>{const a=local(box),b=local({x:box.x+box.width,y:box.y+box.height});return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(b.x-a.x),height:Math.abs(b.y-a.y)};};
 const artCenter={x:options.artBounds.x+options.artBounds.width/2,y:options.artBounds.y+options.artBounds.height/2},home=local(world(artCenter));
 const targets=cue.contributions.map(c=>({contribution:c,text:options.targets[c.target],alpha:options.targets[c.target].alpha,cell:{...options.cells[c.target]},copy:undefined as Phaser.GameObjects.Image|undefined,from:{x:0,y:0},to:{x:0,y:0},hit:{x:0,y:0},startWidth:0,startHeight:0,endWidth:0,endHeight:0}));
 const fragments:{image:Phaser.GameObjects.Image;x:number;y:number;dx:number;dy:number}[]=[],textures:string[]=[];
 const sparks=scene.add.graphics().setName('score/strike-hit').setData('eventId',cue.eventId);group.add(sparks);
 let disposed=false,rebounded=false;
 const phase=(value:'windup'|'flight'|'impact'|'rebound'|'rest')=>{if(marker.active)marker.setData('scoreMotionEventId',cue.eventId).setData('scoreMotionPhase',value);group.setData('phase',value);};
 const dispose=()=>{if(disposed)return;disposed=true;abort.abort();options.context.signal.removeEventListener('abort',dispose);marker.off('destroy',dispose);scene.events.off('shutdown',dispose);scene.events.off('destroy',dispose);if(typeof document!=='undefined')document.removeEventListener('visibilitychange',hidden);
  if(visual.active)visual.setPosition(rest.x,rest.y).setAngle(rest.angle).setScale(rest.sx,rest.sy).setAlpha(rest.alpha);
  for(const target of targets)if(target.text.active)target.text.setAlpha(target.alpha).setData('scorePulseScale',1).setData('scorePulseY',0);
  if(marker.active&&marker.getData('scoreMotionEventId')===cue.eventId)phase('rest');group.destroy();for(const key of textures)if(scene.textures.exists(key))scene.textures.remove(key);
 };
 const hidden=()=>{if(document.hidden)dispose();};
 options.context.signal.addEventListener('abort',dispose,{once:true});marker.once('destroy',dispose);scene.events.once('shutdown',dispose);scene.events.once('destroy',dispose);if(typeof document!=='undefined')document.addEventListener('visibilitychange',hidden);
 const tween=(duration:number,update:(t:number)=>void)=>{const p={t:0};return options.animate({targets:p,t:1,duration,ease:'Linear',onUpdate:()=>{if(!disposed)update(p.t);}},context);};
 const multiply=cue.contributions.some(c=>c.kind==='multiply'),rise=Math.min(multiply?22:15,Math.max(0,visual.getBounds().y-4));
 phase('windup');marker.setData('scoreMotionTier',multiply?'multiply':cue.contributions.some(c=>c.target==='M')?'multiplier':'ordinary');
 const windup=tween(options.beat.windup,t=>{const u=1-(1-t)**3;visual.setPosition(rest.x,rest.y-rise*u).setAngle(rest.angle-(multiply?5:3)*u).setScale(rest.sx*(1+.035*u),rest.sy*(1+.035*u));});
 const fly=async()=>{
  if(disposed)return;phase('flight');
  const art=options.artBounds,center=local(world({x:art.x+art.width/2,y:art.y+art.height/2})),left=local(world({x:art.x,y:art.y+art.height/2})),top=local(world({x:art.x+art.width/2,y:art.y}));
  const startAngle=visual.angle;visual.setAlpha(rest.alpha*.18);
  for(const target of targets){
   const b=target.text.getBounds(),hit=local({x:b.centerX,y:b.centerY}),dx=hit.x-center.x,dy=hit.y-center.y,length=Math.hypot(dx,dy)||1;
   target.from=center;target.hit=hit;target.startWidth=Math.hypot(center.x-left.x,center.y-left.y)*2;target.startHeight=Math.hypot(center.x-top.x,center.y-top.y)*2;
   target.endWidth=Math.min(target.startWidth*.72,options.portrait?(multiply?30:24):(multiply?48:38));target.endHeight=target.endWidth*target.startHeight/target.startWidth;
   target.to={x:hit.x-dx/length*target.endHeight*.38,y:hit.y-dy/length*target.endHeight*.38};
   target.copy=scene.add.image(center.x,center.y,options.textureKey).setDisplaySize(target.startWidth,target.startHeight).setAngle(startAngle).setName('score/strike-card').setData('eventId',cue.eventId).setData('strike',{sourceInstanceId:cue.sourceInstanceId,target:target.contribution.target,from:center,to:target.to,hit,cell:target.cell,kind:target.contribution.kind});group.add(target.copy);
  }
  await tween(options.beat.flight,t=>{for(const target of targets){const p=strikeFlightPoint(target.from,target.to,t,multiply?16:9),u=t*t*t;target.copy?.setPosition(p.x,p.y).setDisplaySize(target.startWidth+(target.endWidth-target.startWidth)*u,target.startHeight+(target.endHeight-target.startHeight)*u).setAngle(startAngle*(1-u)+(multiply?12:7)*Math.sin(Math.PI*t)).setData('phase','flight').setData('progress',u);}});
 };
 const land=()=>{
  if(disposed)return Promise.resolve();phase('impact');
  visual.setPosition(rest.x,rest.y).setAngle(rest.angle).setScale(rest.sx,rest.sy);
  for(const target of targets){
   const text=target.text,box=localBox(text.getBounds()),width=Math.max(1,Math.min(1024,text.canvas.width)),height=Math.max(1,Math.min(256,text.canvas.height)),key='score-strike-old-'+(++snapshotOrdinal),snapshot=scene.textures.createCanvas(key,width,height);
   if(snapshot){snapshot.getContext().drawImage(text.canvas,0,0,width,height);snapshot.refresh();textures.push(key);
    for(let row=0;row<2;row++)for(let col=0;col<3;col++){const image=scene.add.image(box.x,box.y,key).setOrigin(0).setDisplaySize(box.width,box.height).setCrop(col*width/3,row*height/2,width/3,height/2).setName('score/strike-fragment').setData('eventId',cue.eventId);group.add(image);fragments.push({image,x:box.x,y:box.y,dx:(col-1)*(multiply?12:8),dy:(row-.5)*(multiply?16:10)});}
   }
   text.setAlpha(0).setData('strikeEventId',cue.eventId).setData('strikeTarget',target.contribution.target);
  }
  const {hold,recovery}=options.beat.strike!;
  return tween(options.beat.impact,t=>{
   const elapsed=t*options.beat.impact,settle=Math.max(0,Math.min(1,(elapsed-hold)/recovery));sparks.clear();
   for(const target of targets){const color=target.contribution.target==='H'?0x247b93:multiply?0x8c561f:0xb8473a,hit=target.hit,alpha=Math.max(0,1-elapsed/Math.max(90,hold*2));
    sparks.lineStyle(multiply?3:2,color,alpha*.8);for(let i=0;i<(multiply?8:5);i++){const a=i*Math.PI*2/(multiply?8:5),r=4+elapsed*.06;sparks.lineBetween(hit.x+Math.cos(a)*r,hit.y+Math.sin(a)*r,hit.x+Math.cos(a)*(r+5),hit.y+Math.sin(a)*(r+5));}
    if(elapsed>=hold){target.text.setAlpha(target.alpha).setData('scorePulseScale',1+(.18+(multiply?.26:0))*weight*OWNED_SCORE_SPRING.value(settle)).setData('scorePulseY',-3*OWNED_SCORE_SPRING.value(settle));const distance=Math.hypot(target.to.x-home.x,target.to.y-home.y),s=strikeReturnFraction(settle,distance,options.portrait?4:8),homeW=target.startWidth/1.035,homeH=target.startHeight/1.035;target.copy?.setPosition(home.x+(target.to.x-home.x)*s,home.y+(target.to.y-home.y)*s).setDisplaySize(homeW+(target.endWidth-homeW)*Math.max(0,s),homeH+(target.endHeight-homeH)*Math.max(0,s)).setAngle(4*s).setData('phase','return').setData('progress',settle);}
    else target.copy?.setData('phase','impact').setData('progress',0);
   }
   const fracture=Math.min(1,elapsed/Math.max(95,hold*2));for(const part of fragments)part.image.setPosition(part.x+part.dx*fracture,part.y+part.dy*fracture).setAlpha((1-fracture)**2);
   if(!rebounded&&settle>=STRIKE_RETURN_LANDING){rebounded=true;phase('rebound');if(options.beat.phrase?.paired)options.onRebound?.(options.beat.impact-elapsed);}
   options.refresh();
  }).finally(dispose);
 };
 return {windup,fly,land,dispose};
}
