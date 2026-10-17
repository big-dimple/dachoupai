import type Phaser from 'phaser';
import type {EffectContext} from '../core/EffectQueue';

export type ScoreAnimate=(config:Phaser.Types.Tweens.TweenBuilderConfig,context:EffectContext)=>Promise<void>;
interface PoseTarget {active:boolean;y:number;angle:number;scaleX:number;scaleY:number;setY(y:number):unknown;setAngle(angle:number):unknown;setScale(x:number,y:number):unknown}
interface Light {active:boolean;alpha:number;setAlpha(alpha:number):unknown}
export interface ScorePostureOptions {
  context:EffectContext;arrival:Promise<void>;duration:number;ordinal:number;reducedMotion:boolean;
  faceGlow?:Light;edgeGlow?:Light;
}

/** One rise, a small opposite rebound, then rest. Ordinal alternates adjacent sources. */
export function scoreCardPose(progress:number,ordinal:number){
  const t=Math.max(0,Math.min(1,progress)),direction=ordinal%2===0?1:-1;
  let lift:number,tilt:number,scale:number;
  if(t<.3){const p=1-(1-t/.3)**3;lift=-18*p;tilt=2.5*p;scale=1+.08*p;}
  else if(t<.76){const p=(t-.3)/.46,e=1-(1-p)**2;lift=-18+20*e;tilt=2.5-3.1*e;scale=1.08-.09*e;}
  else {const p=(t-.76)/.24,e=(1-p)**2;lift=2*e;tilt=-.6*e;scale=1-.01*e;}
  return {lift,angle:direction*tilt,scale};
}

/** Owns all pose writes for a card. Replace competing focusSource/illuminateCard transforms. */
export class ScorePosture {
  private owners=new WeakMap<PoseTarget,{cancel:()=>void}>();
  constructor(private readonly animate:ScoreAnimate){}

  cancel(target:PoseTarget):void {this.owners.get(target)?.cancel();}

  async play(target:PoseTarget,options:ScorePostureOptions):Promise<void>{
    if(options.context.signal.aborted||!target.active)return;
    this.cancel(target);
    const {faceGlow,edgeGlow}=options,rest={y:target.y,angle:target.angle,scaleX:target.scaleX,scaleY:target.scaleY,face:faceGlow?.alpha,edge:edgeGlow?.alpha};
    const controller=new AbortController(),context={generation:options.context.generation,signal:controller.signal};
    let wake!:()=>void;
    const canceled=new Promise<void>(resolve=>wake=resolve);
    const restore=()=>{
      if(target.active){target.setY(rest.y);target.setAngle(rest.angle);target.setScale(rest.scaleX,rest.scaleY);}
      if(faceGlow?.active)faceGlow.setAlpha(rest.face!);
      if(edgeGlow?.active)edgeGlow.setAlpha(rest.edge!);
    };
    const owner={cancel:()=>{controller.abort();wake();if(this.owners.get(target)===owner){restore();this.owners.delete(target);}}};
    this.owners.set(target,owner);
    options.context.signal.addEventListener('abort',owner.cancel,{once:true});
    faceGlow?.setAlpha(options.reducedMotion?.45:.8);edgeGlow?.setAlpha(1);
    try {
      await Promise.race([options.arrival,canceled]);
      if(controller.signal.aborted)return;
      const cursor={t:0};
      await this.animate({targets:cursor,t:1,duration:Math.max(0,options.duration),ease:'Linear',onUpdate:()=>{
        if(controller.signal.aborted||this.owners.get(target)!==owner||!target.active)return;
        if(!options.reducedMotion){const pose=scoreCardPose(cursor.t,options.ordinal);target.setY(rest.y+pose.lift);target.setAngle(rest.angle+pose.angle);target.setScale(rest.scaleX*pose.scale,rest.scaleY*pose.scale);}
        if(faceGlow?.active)faceGlow.setAlpha((options.reducedMotion?.45:.8)*(1-cursor.t));
      }},context);
    } finally {
      options.context.signal.removeEventListener('abort',owner.cancel);
      if(this.owners.get(target)===owner){restore();this.owners.delete(target);}
    }
  }
}
