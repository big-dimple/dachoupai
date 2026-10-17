import {HAPTIC_PREFERENCE_KEY,readHapticPreference} from './preferences';

export interface HapticState {
  enabled:boolean;
  /** API presence only; browsers do not expose whether hardware actually vibrated. */
  apiSupported:boolean;
  availability:'unsupported'|'disabled'|'hidden'|'activation-unavailable'|'needs-activation'|'ready';
  preferenceSaved:boolean;
}
export interface HapticScope {
  selectionChanged(touch:boolean):void;
  pickup(touch:boolean):void;
  /** Call only after a nonduplicate command has actually committed its save. */
  saved(kind:'placement'|'purchase',receiptId:string):void;
  /** Call at a positive multiply-multiplier event's impact, never its enqueue. */
  multiplierArrived(eventId:string):void;
  /** The final score's actual arrival, once per live presentation. */
  settlementArrived(eventId:string):void;
  /** Permanent: late callbacks from this interaction cannot restart vibration. */
  cancel():void;
}
type Cue='selection'|'pickup'|'placement'|'purchase'|'multiplier'|'settlement';
const CUES:Record<Cue,{pattern:number[];priority:number;quiet:number}>={
  selection:{pattern:[6],priority:1,quiet:90},
  pickup:{pattern:[12],priority:1,quiet:90},
  placement:{pattern:[16],priority:2,quiet:180},
  purchase:{pattern:[12,30,18],priority:2,quiet:180},
  multiplier:{pattern:[22],priority:3,quiet:600},
  settlement:{pattern:[28,45,36],priority:4,quiet:850},
};

/** One app-scoped Vibration API owner. No timers, backlog or catch-up vibration.
 * Durations distinguish rhythm, not hardware intensity (the API cannot set it).
 * https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate
 * https://www.w3.org/TR/vibration/ — visibility + sticky activation are required.
 */
export class Haptics {
  private static instance:Haptics|undefined;
  static get shared():Haptics {return this.instance??=new Haptics();}
  private enabled=true;
  private preferenceSaved=true;
  private disposed=false;
  private epoch=0;
  private active?:{owner:object;until:number;priority:number;quietUntil:number};
  private multiplierAt=-Infinity;
  private savedReceipts=new Set<string>();
  private listeners=new Set<(state:HapticState)=>void>();
  private readonly doc=typeof document==='undefined'?undefined:document;
  private readonly win=typeof window==='undefined'?undefined:window;
  constructor(){
    this.enabled=this.loadPreference();
    this.doc?.addEventListener('visibilitychange',this.visibility);
    this.win?.addEventListener('pagehide',this.interrupt);
    this.win?.addEventListener('blur',this.interrupt);
    this.win?.addEventListener('storage',this.storage);
    // Activation is always read from the browser; pointerdown is never treated as proof.
    this.doc?.addEventListener('pointerup',this.refresh,true);
    this.doc?.addEventListener('touchend',this.refresh,true);
    this.doc?.addEventListener('keydown',this.refresh,true);
  }
  private loadPreference():boolean {
    try{return readHapticPreference(JSON.parse(localStorage.getItem(HAPTIC_PREFERENCE_KEY)??'null'));}catch{return true;}
  }
  getState():HapticState {
    const nav=typeof navigator==='undefined'?undefined:navigator;
    const apiSupported=typeof nav?.vibrate==='function';
    const availability=!apiSupported?'unsupported':!this.enabled?'disabled':this.doc?.visibilityState!=='visible'?'hidden':
      !nav?.userActivation?'activation-unavailable':!nav.userActivation.hasBeenActive?'needs-activation':'ready';
    return {enabled:this.enabled,apiSupported,availability,preferenceSaved:this.preferenceSaved};
  }
  setEnabled(enabled:boolean):void {
    if(this.disposed)return;
    this.enabled=enabled;
    if(!enabled)this.stop();
    try{localStorage.setItem(HAPTIC_PREFERENCE_KEY,JSON.stringify({version:1,enabled}));this.preferenceSaved=true;}catch{this.preferenceSaved=false;}
    this.publish();
  }
  subscribe(listener:(state:HapticState)=>void):()=>void {
    this.listeners.add(listener);listener(this.getState());return ()=>this.listeners.delete(listener);
  }
  createScope(signal?:AbortSignal):HapticScope {
    const owner={},epoch=this.epoch,seen=new Set<string>();
    let canceled=false,multipliers=0,settled=false;
    const live=()=>!canceled&&!signal?.aborted&&!this.disposed&&epoch===this.epoch;
    const once=(key:string)=>{if(!key||seen.has(key)||seen.size>=512)return false;seen.add(key);return true;};
    const cancel=()=>{
      if(canceled)return;canceled=true;signal?.removeEventListener('abort',cancel);
      // A stale interaction must not stop a newer owner's critical beat.
      if(this.active?.owner===owner)this.halt();
    };
    const scope:HapticScope={
      selectionChanged:touch=>{if(touch&&live()&&!settled)this.request('selection',owner);},
      pickup:touch=>{if(touch&&live()&&!settled&&once('pickup'))this.request('pickup',owner);},
      saved:(kind,receiptId)=>{
        if(!live()||settled||!receiptId)return;
        const key=kind+'/'+receiptId;if(this.savedReceipts.has(key))return;
        this.savedReceipts.add(key);if(this.savedReceipts.size>128)this.savedReceipts.delete(this.savedReceipts.values().next().value!);
        this.request(kind,owner);
      },
      multiplierArrived:eventId=>{
        if(!live()||settled||multipliers>=3||!eventId||!once('multiply/'+eventId))return;
        if(this.request('multiplier',owner))multipliers++;
      },
      settlementArrived:eventId=>{
        if(!live()||settled||!eventId)return;settled=true;this.request('settlement',owner);
      },
      cancel,
    };
    if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
    return scope;
  }
  private request(cue:Cue,owner:object):boolean {
    if(this.disposed||this.getState().availability!=='ready')return false;
    const now=performance.now(),next=CUES[cue],active=this.active;
    // A leading beat represents its burst. Drop the rest; never play a delayed tail.
    if(active&&now<active.quietUntil&&next.priority<=active.priority)return false;
    if(active&&now<active.until&&next.priority<=active.priority)return false;
    if(cue==='multiplier'&&now-this.multiplierAt<600)return false;
    try{
      // A true return means only that the browser accepted the request.
      if(!navigator.vibrate([...next.pattern]))return false;
      this.active={owner,until:now+next.pattern.reduce((a,b)=>a+b,0),priority:next.priority,quietUntil:now+next.quiet};
      if(cue==='multiplier')this.multiplierAt=now;
      return true;
    }catch{return false;}
  }
  private halt():void {
    const active=this.active;this.active=undefined;
    if(active)try{navigator.vibrate(0);}catch{/* Optional hardware must not interrupt the game. */}
  }
  /** Invalidate all old scopes as well as stopping the currently requested pattern. */
  stop():void {this.epoch++;this.halt();}
  private readonly refresh=()=>this.publish();
  private readonly interrupt=()=>{this.stop();this.publish();};
  private readonly visibility=()=>{if(this.doc?.visibilityState!=='visible')this.stop();this.publish();};
  private readonly storage=(event:StorageEvent)=>{
    if(event.key!==HAPTIC_PREFERENCE_KEY&&event.key!==null)return;
    this.enabled=this.loadPreference();if(!this.enabled)this.stop();this.publish();
  };
  private publish(){if(!this.disposed){const state=this.getState();this.listeners.forEach(listener=>listener(state));}}
  dispose():void {
    if(this.disposed)return;this.stop();this.disposed=true;
    this.doc?.removeEventListener('visibilitychange',this.visibility);
    this.win?.removeEventListener('pagehide',this.interrupt);this.win?.removeEventListener('blur',this.interrupt);this.win?.removeEventListener('storage',this.storage);
    this.doc?.removeEventListener('pointerup',this.refresh,true);this.doc?.removeEventListener('touchend',this.refresh,true);this.doc?.removeEventListener('keydown',this.refresh,true);
    this.listeners.clear();if(Haptics.instance===this)Haptics.instance=undefined;
  }
}
