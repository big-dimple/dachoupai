import type Phaser from 'phaser';
import type {EffectContext} from '../core/EffectQueue';
import type {ScoreEvent,ScoreTrace} from '../domain/scoreR2';
import type {ScoreBeat} from './scorePresentation';
import {hasActualBenefit} from './JokerExperience';
import {scoreContributions} from './ScoreContribution';
import {readableFractionText} from './scoreText';
import {UI_FONT} from './theme';

export type OwnedJokerMotionTier='ordinary'|'multiplier'|'multiply';
export interface OwnedJokerMotionCue {eventId:string;sourceInstanceId:string;tier:OwnedJokerMotionTier;label:string}
export interface OwnedJokerPose {x:number;y:number;angle:number;scale:number}
type Marker=Phaser.GameObjects.Container;
const owners=new WeakMap<Marker,{eventId:string;cancel:()=>void;promise:Promise<void>}>();

/** Only an exact saved, beneficial owned-source event can request this accent. */
export function ownedJokerMotionCue(trace:ScoreTrace,candidate:unknown):OwnedJokerMotionCue|undefined {
 const event=candidate as ScoreEvent;
 if(!event?.eventId||event.sourceType!=='joker'||!trace.sourceJokers.some(j=>j.instanceId===event.sourceInstanceId&&j.definitionId===event.sourceDefinitionId))return;
 if(!trace.events.some(saved=>saved===event||saved.eventId===event.eventId&&JSON.stringify(saved)===JSON.stringify(event))||!hasActualBenefit(event))return;
 const contributions=scoreContributions(event),numeric=contributions.find(c=>c.kind==='multiply')??contributions.find(c=>c.target==='M')??contributions[0];
 const tier:OwnedJokerMotionTier=numeric?.kind==='multiply'?'multiply':numeric?.target==='M'?'multiplier':'ordinary';
 return {eventId:event.eventId,sourceInstanceId:event.sourceInstanceId,tier,label:numeric?.label??(event.operation==='retrigger-card'?'再触发':event.operation.includes('coefficient')||event.operation==='add-growth'?'↑'+readableFractionText(event.value):'+'+readableFractionText(event.value))};
}

/** Slot position, drag and external hit rectangle belong to marker, never this layer. */
export function ownedJokerScoreLayer(scene:Phaser.Scene,marker:Marker):Marker {
 let visual=marker.getData('scorePoseRoot') as Marker|undefined;
 if(!visual?.active){visual=scene.add.container(0,0).setName('owned-joker/score-pose');marker.add(visual);marker.setData('scorePoseRoot',visual);}
 const children=marker.list.filter(child=>child!==visual&&!child.getData('scoreMotionFixed'));
 if(children.length){marker.remove(children);visual.add(children);}
 return visual;
}

export function ownedJokerMotionDuration(tier:OwnedJokerMotionTier,beat?:ScoreBeat,speed=1):number {
 // The first opposite landing is at .24; even fast-forward speed keeps two beats distinct.
 return Math.max(beat?.impact??0,tier==='multiply'?400:tier==='multiplier'?290:230,50/.24*speed);
}

/** Deliberate alternating sway, one rebound, then rest; no looping random shake. */
export function ownedJokerScorePose(t:number,tier:OwnedJokerMotionTier,ordinal=0):OwnedJokerPose {
 const p=Math.max(0,Math.min(1,t)),power=tier==='multiply'?1.7:tier==='multiplier'?1.3:1,dir=ordinal%2?-1:1;
 if(p===1)return {x:0,y:0,angle:0,scale:1};
 const knots=[[0,1],[.24,-.76],[.48,.38],[.72,-.12],[1,0]];
 const index=Math.max(0,knots.findIndex((k,i)=>i<knots.length-1&&p>=k[0]&&p<=knots[i+1][0]));
 const a=knots[index],b=knots[index+1],u=(p-a[0])/(b[0]-a[0]),ease=u*u*(3-2*u),sway=a[1]+(b[1]-a[1])*ease;
 return {x:dir*4.5*power*sway,y:-7*power*(1-p)**2,angle:dir*3.6*power*sway,scale:1+.025*power*(1-p)**2};
}

/** Rotation is fitted to its own safe lane, including the very tight phone rack. */
export function fitOwnedJokerPose(pose:OwnedJokerPose,width:number,height:number,portrait:boolean):OwnedJokerPose {
 const rad=Math.abs(pose.angle)*Math.PI/180,c=Math.cos(rad),s=Math.sin(rad),padY=portrait?1:12,padX=portrait?3:9;
 const rotatedW=width*c+height*s,rotatedH=height*c+width*s;
 const scale=Math.min(pose.scale,(width+padX*2)/rotatedW,(height+padY*2)/rotatedH),roomX=(width+padX*2-rotatedW*scale)/2,roomY=(height+padY*2-rotatedH*scale)/2;
 return {...pose,scale,x:Math.max(-roomX,Math.min(roomX,pose.x)),y:Math.max(-roomY,Math.min(roomY,pose.y))};
}

export interface OwnedJokerMotionOptions {
 context:EffectContext;arrival:Promise<void>;beat?:ScoreBeat;portrait:boolean;reducedMotion:boolean;speed?:number;
 onPhase?:(phase:'windup'|'impact'|'rebound'|'rest')=>void;
}
export function cancelOwnedJokerScoreMotion(marker:Marker):void {owners.get(marker)?.cancel();}

/** Quiet 15fps float yields the pose to score/drag. The fixed slot never moves. */
export function mountOwnedJokerIdle(scene:Phaser.Scene,marker:Marker,options:{reducedMotion:()=>boolean;canFloat:()=>boolean;ordinal:number}):void {
 const visual=ownedJokerScoreLayer(scene,marker),frame=marker.getData('frame') as Phaser.GameObjects.Rectangle;
 const shadow=scene.add.ellipse(0,(frame?.height??90)/2+1,(frame?.width??64)*.78,5,0x26313a,.12).setName('owned-joker/float-shadow').setData('scoreMotionFixed',true);marker.addAt(shadow,0);let last=-Infinity,wasFloating=false;
 const update=(time:number)=>{
  if(time-last<66||!visual.active||!marker.active)return;last=time;
  if(owners.has(marker))return;
  const enabled=!options.reducedMotion()&&options.canFloat()&&(typeof document==='undefined'||!document.hidden);
  if(enabled){const p=time/1700+options.ordinal*1.17;visual.setPosition(Math.sin(p*.51)*.8,Math.sin(p)*2.8).setAngle(Math.sin(p*.73)*1.6).setScale(.97+Math.cos(p*.61)*.012,.985+Math.cos(p*.61)*.006);shadow.setScale(.9+Math.sin(p)*.1,1).setAlpha(.8+Math.sin(p)*.15);wasFloating=true;}
  else if(wasFloating){visual.setPosition(0,0).setAngle(0).setScale(1);shadow.setScale(1).setAlpha(1);wasFloating=false;}
 };
 const dispose=()=>{scene.events.off('update',update);scene.events.off('shutdown',dispose);scene.events.off('destroy',dispose);marker.off('destroy',dispose);};
 scene.events.on('update',update);scene.events.once('shutdown',dispose);scene.events.once('destroy',dispose);marker.once('destroy',dispose);
}

/** One arrival Promise owns card peak, local burst and the caller's numeric/audio impact. */
export function playOwnedJokerScoreMotion(scene:Phaser.Scene,marker:Marker,cue:OwnedJokerMotionCue,options:OwnedJokerMotionOptions):Promise<void> {
 if(options.context.signal.aborted||!marker.active||typeof document!=='undefined'&&document.hidden)return Promise.resolve();
 const previous=owners.get(marker);if(previous?.eventId===cue.eventId)return previous.promise;
 previous?.cancel();
 const visual=ownedJokerScoreLayer(scene,marker),frame=marker.getData('frame') as Phaser.GameObjects.Rectangle;
 visual.setPosition(0,0).setAngle(0).setScale(1);
 const width=frame?.width??64,height=frame?.height??90,rest={x:visual.x,y:visual.y,angle:visual.angle,scaleX:visual.scaleX,scaleY:visual.scaleY},ordinal=Number(marker.getData('slotIndex')??0);
 const fx=scene.add.graphics().setName('owned-joker/score-rays').setData('scoreMotionFixed',true);marker.addAt(fx,0);
 const color=cue.tier==='multiply'?0xc98a39:cue.tier==='multiplier'?0xb8473a:0x397965,rays=options.reducedMotion?0:cue.tier==='multiply'?12:cue.tier==='multiplier'?9:6;
 const bounds={x:width/2+(options.portrait?3:9),y:height/2+(options.portrait?1:12)},history:OwnedJokerPose[]=[];
 let stopped=false,cleaned=false,wake!:()=>void,tween:Phaser.Tweens.Tween|undefined,label:Phaser.GameObjects.Text|undefined,original:Phaser.GameObjects.Text|undefined,wasVisible=false,rebounded=false;
 const canceled=new Promise<void>(resolve=>wake=resolve);
 const restore=()=>{if(cleaned)return;cleaned=true;if(visual.active)visual.setPosition(rest.x,rest.y).setAngle(rest.angle).setScale(rest.scaleX,rest.scaleY);if(original?.active)original.setVisible(wasVisible);label?.destroy();fx.destroy();};
 const cancel=()=>{if(stopped)return;stopped=true;tween?.remove();restore();wake();};
 const phase=(value:'windup'|'impact'|'rebound'|'rest')=>{marker.setData('scoreMotionEventId',cue.eventId).setData('scoreMotionPhase',value).setData('scoreMotionTier',cue.tier);options.onPhase?.(value);};
 const pose=(value:OwnedJokerPose)=>{if(!visual.active)return;const p=fitOwnedJokerPose(value,width,height,options.portrait);visual.setPosition(rest.x+p.x,rest.y+p.y).setAngle(rest.angle+p.angle).setScale(rest.scaleX*p.scale,rest.scaleY*p.scale);return p;};
 const draw=(progress:number,p?:OwnedJokerPose)=>{
  if(!fx.active)return;fx.clear();const alpha=(options.reducedMotion?.45:.75)*(1-progress);
  fx.lineStyle(cue.tier==='multiply'?2:1,color,alpha).strokeRoundedRect(-width/2,-height/2,width,height,4);
  if(p){history.unshift(p);history.length=Math.min(history.length,3);}
  history.slice(1).forEach((h,i)=>{fx.lineStyle(1,color,alpha*.2/(i+1));for(const side of [-1,1]){const x=Math.max(-bounds.x,Math.min(bounds.x,side*width/2+h.x));fx.lineBetween(x,-height*.28,x,height*.28);}});
  for(let i=0;i<rays;i++){const a=i/rays*Math.PI*2,start=.78+progress*.12,end=.9+progress*.1,rx=width/2+3,ry=height/2+4;fx.lineStyle(i%3===0?2:1,color,alpha*(1-i%3*.12));fx.lineBetween(Math.max(-bounds.x,Math.min(bounds.x,Math.cos(a)*rx*start)),Math.max(-bounds.y,Math.min(bounds.y,Math.sin(a)*ry*start)),Math.max(-bounds.x,Math.min(bounds.x,Math.cos(a)*rx*end)),Math.max(-bounds.y,Math.min(bounds.y,Math.sin(a)*ry*end)));}
 };
 const runTween=(duration:number,update:(t:number)=>void)=>new Promise<void>(resolve=>{const cursor={t:0};tween=scene.tweens.add({targets:cursor,t:1,duration,ease:'Linear',onUpdate:()=>{if(!stopped&&visual.active)update(cursor.t);},onComplete:()=>resolve()});});
 const hidden=()=>{if(document.hidden)cancel();};
 const owner={eventId:cue.eventId,cancel,promise:Promise.resolve()};owners.set(marker,owner);
 options.context.signal.addEventListener('abort',cancel,{once:true});marker.once('destroy',cancel);scene.events.once('shutdown',cancel);scene.events.once('destroy',cancel);if(typeof document!=='undefined')document.addEventListener('visibilitychange',hidden);
 owner.promise=(async()=>{
  try{
   phase('windup');
   if(!options.reducedMotion)void runTween(Math.max(30,(options.beat?.windup??55)+(options.beat?.flight??110)),t=>pose({x:0,y:0,angle:-1.4*t,scale:1-.035*t}));
   draw(.65);
   await Promise.race([options.arrival,canceled]);if(stopped||options.context.signal.aborted||!visual.active)return;
   tween?.remove();ownedJokerScoreLayer(scene,marker);phase('impact');
   // Existing source receipts, when present, share this same visual layer.
   if(!visual.getByName('source/impact')){
    original=marker.getData('valueLabel') as Phaser.GameObjects.Text|undefined;
    if(original?.active){label=scene.add.text(original.x,original.y,cue.label,{fontFamily:UI_FONT,fontSize:'14px',color:cue.tier==='ordinary'?'#397965':'#b8473a',backgroundColor:'#fff9e9',resolution:Math.max(1,1/scene.scale.zoom)}).setOrigin(original.originX,original.originY).setName('owned-joker/score-value');
     if(label.width<=Number(original.getData('labelRoom')??width-6)&&label.height<=20){wasVisible=original.visible;original.setVisible(false);visual.add(label);}else {label.destroy();label=undefined;original=undefined;}}
   }
   const update=(t:number)=>{const p=options.reducedMotion?undefined:pose(ownedJokerScorePose(t,cue.tier,ordinal));draw(t,p);if(!rebounded&&t>=.24){rebounded=true;phase('rebound');}if(label?.active)label.setAlpha(1-t*.25);};
   update(0);await Promise.race([runTween(options.reducedMotion?Math.min(180,options.beat?.impact??180):ownedJokerMotionDuration(cue.tier,options.beat,options.speed),update),canceled]);
  }finally{
   options.context.signal.removeEventListener('abort',cancel);marker.off('destroy',cancel);scene.events.off('shutdown',cancel);scene.events.off('destroy',cancel);if(typeof document!=='undefined')document.removeEventListener('visibilitychange',hidden);
   tween?.remove();restore();if(owners.get(marker)===owner){owners.delete(marker);if(marker.active)phase('rest');}
  }
 })();return owner.promise;
}
