import type {PointerIntent} from './PointerIntent';

/** Map native press duration to the intent clock so delayed handlers cannot turn a tap into a hold. */
export function pointerReleaseTime(startedAt:number,nativeDown:number,nativeUp:number,handledAt:number):number {
  if(!Number.isFinite(nativeDown)||!Number.isFinite(nativeUp)||nativeDown<0||nativeUp<nativeDown)return handledAt;
  const releasedAt=startedAt+(nativeUp-nativeDown);
  return Number.isFinite(releasedAt)?releasedAt:handledAt;
}

/** Finish the owning pointer, recognizing a real hold even if its timer was delayed. */
export function releasePointerIntent(intent:PointerIntent,id:number,x:number,y:number,at:number):{kind:'tap'|'drag'|'none';newlyHeld:boolean} {
  intent.move(id,x,y);
  const newlyHeld=intent.hold(at);
  return {kind:intent.up(id,x,y,at),newlyHeld};
}
