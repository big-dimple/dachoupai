import type {EffectContext} from '../core/EffectQueue';

export type AttachmentMotion='full'|'reduced'|'off';
export interface AttachmentDraft {key:string;targetId:string}
export interface AttachmentState extends AttachmentDraft {
  generation:number;phase:'travel'|'idle'|'committed'|'release';elapsed:number;clock:number;eventId?:string;
}
export const ATTACHMENT_TRAVEL_MS=190,ATTACHMENT_RELEASE_MS=220;

/** UI ownership only. Qualification and saved outcomes come from the existing domain. */
export class HeroTargetAttachmentState {
  private current?:AttachmentState;
  private generation=0;
  private unbind?:()=>void;
  constructor(private motion:AttachmentMotion='full'){}
  get value():Readonly<AttachmentState>|undefined {return this.current;}

  preview(draft:AttachmentDraft|undefined):void {
    if(!draft){this.clear();return;}
    if(this.current?.key===draft.key&&this.current.targetId===draft.targetId)return;
    this.clear();
    this.current={...draft,generation:++this.generation,phase:this.motion==='full'?'travel':'idle',elapsed:0,clock:0};
  }

  /** Saving never waits for travel or an idle hold. Only the selected instance can transfer. */
  consume(targetId:string,eventId:string,context:EffectContext):boolean {
    const state=this.current;
    if(!state||state.targetId!==targetId||context.signal.aborted)return false;
    if(state.eventId)return state.eventId===eventId;
    state.phase='committed';state.elapsed=0;state.eventId=eventId;
    const generation=state.generation,cancel=()=>{if(this.current?.generation===generation)this.clear();};
    context.signal.addEventListener('abort',cancel,{once:true});
    this.unbind=()=>context.signal.removeEventListener('abort',cancel);
    return true;
  }

  release(event:{eventId:string;targetCardId?:string;reasonKey?:string},context:EffectContext):boolean {
    const state=this.current;
    if(context.signal.aborted||!state||state.phase!=='committed'||state.eventId!==event.eventId||state.targetId!==event.targetCardId||event.reasonKey!=='erxiang.handoff')return false;
    if(this.motion!=='full'){this.clear();return true;}
    state.phase='release';state.elapsed=0;return true;
  }

  setMotion(motion:AttachmentMotion):void {
    if(this.motion===motion)return;this.motion=motion;
    if(motion!=='full'&&this.current?.phase==='travel'){this.current.phase='idle';this.current.elapsed=0;}
    if(motion!=='full'&&this.current?.phase==='release')this.clear();
  }

  /** Hide removes travel permanently; return may show current idle, never a late arrival. */
  suspend():void {
    if(this.current?.phase==='travel'){this.current.phase='idle';this.current.elapsed=0;}
    if(this.current?.phase==='release')this.clear();
  }

  advance(delta:number):void {
    const state=this.current;if(!state)return;
    const dt=Math.max(0,Math.min(50,delta));state.elapsed+=dt;
    if(this.motion==='full')state.clock+=dt;
    if(state.phase==='travel'&&state.elapsed>=ATTACHMENT_TRAVEL_MS){state.phase='idle';state.elapsed=0;}
    if(state.phase==='release'&&state.elapsed>=ATTACHMENT_RELEASE_MS)this.clear();
  }

  clear():void {this.unbind?.();this.unbind=undefined;this.current=undefined;}
}

/** A short exterior ribbon; no point falls inside the printed card face. */
export function attachmentEdgePoint(width:number,height:number,progress:number):{x:number;y:number} {
  const w=width+6,h=height+6,p=((progress%1)+1)%1*2*(w+h),left=-w/2,top=-h/2;
  if(p<w)return {x:left+p,y:top};
  if(p<w+h)return {x:left+w,y:top+p-w};
  if(p<2*w+h)return {x:left+w-(p-w-h),y:top+h};
  return {x:left,y:top+h-(p-2*w-h)};
}
