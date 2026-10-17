import type Phaser from 'phaser';
import type {CharacterId} from './characters';
import type {EffectContext} from '../core/EffectQueue';
import type {ScoreEvent,ScoreTrace} from '../domain/scoreR2';
import type {Box} from './layout';
import {scoreContributions} from './ScoreContribution';
import {scoreCardPose} from './ScorePosture';
import {fitHeroPortraitPose} from './HeroPortraitLayout';
import {Rational} from '../domain/rational';
import type {CommandResult,R2RunState} from '../domain/run';

export interface HeroPortraitScoreCue {eventId:string;positive:boolean}
/** Exact saved hero arithmetic, including a real penalty; drafts/growth/zero checks do not strike. */
export function heroPortraitScoreCue(trace:ScoreTrace,event:ScoreEvent,heroId:CharacterId):HeroPortraitScoreCue|undefined {
  if(event.sourceType!=='character'||event.sourceDefinitionId!==heroId||event.rootId!==trace.rootId||!trace.events.some(saved=>saved===event||saved.eventId===event.eventId&&JSON.stringify(saved)===JSON.stringify(event)))return;
  const contributions=scoreContributions(event);if(!contributions.length)return;
  return {eventId:event.eventId,positive:contributions.some(c=>Rational.fromJSON(c.after).compare(Rational.fromJSON(c.before))>0)};
}
/** A saved choice of real refill cards is a benefit, without inventing a scoring event. */
export function heroPortraitRefillCue(before:R2RunState,result:CommandResult<R2RunState>):HeroPortraitScoreCue|undefined {
  if(!result.ok||result.duplicate||before.characterId!=='laohuan'||before.phase!=='pending-refill'||!before.pendingRefill)return;
  const after=result.state,pending=before.pendingRefill,kept=after.handOrder.filter(id=>!before.handOrder.includes(id));
  if(after.runId!==before.runId||after.characterId!==before.characterId||after.commandSeq!==before.commandSeq+1||
    result.receipt.seq!==after.commandSeq||after.phase!=='await-input'||after.pendingRefill!==null||
    !kept.length||kept.length!==pending.required||kept.some(id=>!pending.candidateIds.includes(id))||
    before.handOrder.some(id=>!after.handOrder.includes(id)))return;
  return {eventId:result.receipt.commandId+'/saved-refill',positive:true};
}
export interface HeroPortraitMotionOptions {heroId:CharacterId;bounds:Box;reducedMotion:()=>boolean}
export interface HeroPortraitCuePlay {
  context:EffectContext;arrival:Promise<void>;duration:number;replay?:boolean;
  onPhase?:(phase:'waiting'|'impact'|'rebound'|'rest')=>void;
}
export interface HeroPortraitMotionPlay extends HeroPortraitCuePlay {trace:ScoreTrace;event:ScoreEvent}
type Job={key:string;cancel:()=>void;reduce:()=>void;promise:Promise<void>};
const tint=(base:number,light:number,amount:number)=>{
  const channel=(shift:number)=>Math.round(((base>>shift)&255)*(1-amount)+((light>>shift)&255)*amount);
  return channel(16)<<16|channel(8)<<8|channel(0);
};

/** Animates the existing portrait only. No overlay, new picture, eye strip, number or game command. */
export class HeroPortraitScoreMotion {
  private current?:Job;
  private disposed=false;
  private readonly media=typeof window!=='undefined'?window.matchMedia('(prefers-reduced-motion: reduce)'):undefined;
  private readonly hidden=()=>{if(document.hidden)this.reset();};
  private readonly preference=()=>{if(this.reduced())this.current?.reduce();};
  constructor(private readonly scene:Phaser.Scene,private readonly image:Phaser.GameObjects.Image,private readonly options:HeroPortraitMotionOptions){
    scene.events.on('pause',this.resetBound);scene.events.on('sleep',this.resetBound);
    scene.events.once('shutdown',this.destroyBound);scene.events.once('destroy',this.destroyBound);image.once('destroy',this.destroyBound);
    document.addEventListener('visibilitychange',this.hidden);window.addEventListener('blur',this.resetBound);
    window.addEventListener('dachoupai-presentation',this.preference);this.media?.addEventListener('change',this.preference);
  }
  private readonly resetBound=()=>this.reset();
  private readonly destroyBound=()=>this.destroy();
  private reduced():boolean {return this.options.reducedMotion()||this.media?.matches===true;}
  private visible():boolean {
    if(document.hidden||this.scene.sys.settings.visible===false||!this.image.active||!this.image.visible||this.image.alpha<=0)return false;
    for(let parent=this.image.parentContainer;parent;parent=parent.parentContainer)if(!parent.visible||!parent.active||parent.alpha<=0)return false;
    return true;
  }
  reset():void {this.current?.cancel();}
  play(options:HeroPortraitMotionPlay):Promise<void> {
    return this.playCue(heroPortraitScoreCue(options.trace,options.event,this.options.heroId),options);
  }
  playRefill(before:R2RunState,result:CommandResult<R2RunState>,options:HeroPortraitCuePlay):Promise<void> {
    return this.playCue(this.options.heroId==='laohuan'?heroPortraitRefillCue(before,result):undefined,options);
  }
  private playCue(cue:HeroPortraitScoreCue|undefined,options:HeroPortraitCuePlay):Promise<void> {
    if(this.disposed||options.context.signal.aborted)return Promise.resolve();
    if(options.replay){this.reset();return Promise.resolve();}
    if(!cue||!this.visible()||!Number.isFinite(options.duration))return Promise.resolve();
    const key=options.context.generation+'/'+cue.eventId;
    if(this.current?.key===key)return this.current.promise;
    this.reset();
    const image=this.image,rest={x:image.x,y:image.y,angle:image.angle,scaleX:image.scaleX,scaleY:image.scaleY,
      width:image.displayWidth,height:image.displayHeight,tints:[image.tintTopLeft,image.tintTopRight,image.tintBottomLeft,image.tintBottomRight],fill:image.tintFill};
    let stopped=false,struck=false,rebounded=false,tween:Phaser.Tweens.Tween|undefined,wake!:()=>void,settleTween:(()=>void)|undefined;
    const canceled=new Promise<void>(resolve=>wake=resolve);
    const phase=(value:Parameters<NonNullable<HeroPortraitMotionPlay['onPhase']>>[0])=>options.onPhase?.(value);
    const restorePose=()=>{if(image.active)image.setPosition(rest.x,rest.y).setAngle(rest.angle).setScale(rest.scaleX,rest.scaleY);};
    const setTints=(colors:readonly number[],fill=false)=>{if(image.active){const [a,b,c,d]=colors;if(fill)image.setTintFill(a,b,c,d);else image.setTint(a,b,c,d);}};
    const restore=()=>{restorePose();setTints(rest.tints,rest.fill);};
    const light=(amount:number)=>setTints(rest.tints.map(base=>tint(base,cue.positive?0xffe4ad:0xc9d8e2,amount)));
    const cancel=()=>{if(stopped)return;stopped=true;tween?.remove();settleTween?.();restore();wake();};
    const reduce=()=>{restorePose();if(struck)light(.18);};
    const owner:Job={key,cancel,reduce,promise:Promise.resolve()};this.current=owner;
    options.context.signal.addEventListener('abort',cancel,{once:true});
    owner.promise=(async()=>{
      try {
        // Preparing a saved event still waits for its actual packet/accumulator arrival.
        phase('waiting');await Promise.race([options.arrival,canceled]);
        if(stopped||options.context.signal.aborted||!this.visible())return;
        struck=true;phase('impact');
        const update=(progress:number)=>{
          if(stopped||this.current!==owner)return;
          if(!this.visible()){cancel();return;}
          const still=this.reduced();
          if(still)restorePose();else {
            const pose=fitHeroPortraitPose(this.options.bounds,rest,scoreCardPose(progress,0));
            image.setPosition(pose.x,pose.y).setAngle(rest.angle+pose.angle).setScale(rest.scaleX*pose.scale,rest.scaleY*pose.scale);
          }
          light(still?.18:(cue.positive?.24:.12)*(1-progress));
          if(!rebounded&&progress>=.4){rebounded=true;phase('rebound');}
        };
        update(0);
        await new Promise<void>(resolve=>{
          settleTween=resolve;
          if(stopped){resolve();return;}
          if(options.duration<=0){update(1);resolve();return;}
          const cursor={t:0};tween=this.scene.tweens.add({targets:cursor,t:1,duration:options.duration,ease:'Linear',onUpdate:()=>update(cursor.t),onComplete:()=>resolve()});
        });
      }finally{
        options.context.signal.removeEventListener('abort',cancel);tween?.remove();
        if(this.current===owner){restore();this.current=undefined;phase('rest');}
      }
    })();
    return owner.promise;
  }
  destroy():void {
    if(this.disposed)return;this.disposed=true;this.reset();
    this.scene.events.off('pause',this.resetBound);this.scene.events.off('sleep',this.resetBound);this.scene.events.off('shutdown',this.destroyBound);this.scene.events.off('destroy',this.destroyBound);this.image.off('destroy',this.destroyBound);
    document.removeEventListener('visibilitychange',this.hidden);window.removeEventListener('blur',this.resetBound);
    window.removeEventListener('dachoupai-presentation',this.preference);this.media?.removeEventListener('change',this.preference);
  }
}
export function mountHeroPortraitScoreMotion(scene:Phaser.Scene,image:Phaser.GameObjects.Image,options:HeroPortraitMotionOptions){return new HeroPortraitScoreMotion(scene,image,options);}
