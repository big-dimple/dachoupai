import type Phaser from 'phaser';
import type {Box} from './layout';
import {HandSelectionGesture,type HandSelectionHitBox,type HandSelectionInterruptReason,type HandSelectionUpdate} from './HandSelectionGesture';
import {modalBlocksCanvas} from './DetailDialog';

interface HandInputOptions {
  ready:()=>boolean;
  cards:()=>HandSelectionHitBox[];
  selected:()=>ReadonlySet<string>;
  update:(update:HandSelectionUpdate)=>void;
  hover:(id:string|undefined)=>void;
  detail:(id:string)=>void;
  cancelCanvas:()=>void;
}
/** A hand-only surface lets the browser own vertical pan and pointer cancellation. */
export class HandSelectionInput {
  readonly surface=document.createElement('div');
  private readonly gesture=new HandSelectionGesture();
  // Suppressed physical contacts outlive the selection gesture after an interruption.
  private pointers=new Set<number>();
  private contacts=new Map<number,string>();
  private owner?:number;
  private timer?:ReturnType<typeof setTimeout>;
  private savedInput=true;
  private bounds?:Box;
  private destroyed=false;
  constructor(private readonly scene:Phaser.Scene,private readonly options:HandInputOptions){
    this.surface.className='hand-input-surface';this.surface.setAttribute('aria-hidden','true');
    this.surface.addEventListener('pointerdown',this.down);
    this.surface.addEventListener('pointermove',this.hover);
    this.surface.addEventListener('pointerleave',this.leave);
    this.surface.addEventListener('contextmenu',this.context);
    this.surface.addEventListener('lostpointercapture',this.lostCapture);
    // Phaser also listens for legacy starts on window; this surface owns hand input.
    this.surface.addEventListener('mousedown',event=>event.stopPropagation());
    this.surface.addEventListener('touchstart',event=>event.stopPropagation(),{passive:true});
    window.addEventListener('pointerdown',this.otherDown,true);
    window.addEventListener('pointermove',this.move,true);
    window.addEventListener('pointerout',this.viewportLeave,true);
    window.addEventListener('pointerup',this.up,true);
    window.addEventListener('pointercancel',this.cancelPointer,true);
    window.addEventListener('blur',this.blur);
    document.addEventListener('visibilitychange',this.visibility);
    document.addEventListener('focusin',this.focus);
    document.body.append(this.surface);
  }
  get active():boolean{return this.pointers.size>0;}
  private coordinates(event:PointerEvent|MouseEvent):{x:number;y:number}{
    const rect=this.scene.game.canvas.getBoundingClientRect(),zoom=this.scene.scale.zoom;
    return {x:(event.clientX-rect.left)*this.scene.scale.width*zoom/rect.width,y:(event.clientY-rect.top)*this.scene.scale.height*zoom/rect.height};
  }
  private cardAt(x:number,y:number):HandSelectionHitBox|undefined {return this.options.cards().find(b=>b.visible!==false&&x>=b.x&&x<=b.x+b.width&&y>=b.y&&y<=b.y+b.height);}
  private apply(update:HandSelectionUpdate|undefined):void {if(update&&!this.destroyed)this.options.update(update);}
  private readonly down=(event:PointerEvent)=>{
    if(this.contacts.size!==1||!event.isPrimary){this.options.cancelCanvas();return;}
    if(event.button!==0||this.active||!this.options.ready()||modalBlocksCanvas(event.clientX,event.clientY))return;
    const {x,y}=this.coordinates(event),card=this.cardAt(x,y);if(!card)return;
    this.options.cancelCanvas();
    this.owner=event.pointerId;this.pointers.add(event.pointerId);this.savedInput=this.scene.input.enabled;this.scene.input.enabled=false;
    this.options.hover(undefined);this.scene.game.canvas.focus({preventScroll:true});
    try {this.surface.setPointerCapture(event.pointerId);}catch {/* Window events still own this contact. */}
    this.apply(this.gesture.begin(event.pointerId,x,y,card.id,this.options.selected(),this.options.cards(),5));
    // Stationary hold still inspects. A moved pointer clears this timer before it can open.
    this.timer=setTimeout(()=>{if(this.gesture.state?.phase==='pending'){this.cancel('hold');if(this.options.ready()&&!document.querySelector('dialog[open]'))this.options.detail(card.id);}},355);
    if(event.pointerType==='mouse')event.preventDefault();
  };
  /** A new primary press of the same type, or a zero-button hover, proves an old release was missed. */
  private recover(pointerType:string,pointerId?:number):void {
    const stale=[...this.contacts].filter(([id,type])=>type===pointerType&&(pointerId===undefined||id===pointerId)).map(([id])=>id);
    if(stale.some(id=>this.pointers.has(id)))this.cancel();
    for(const id of stale){this.contacts.delete(id);this.release(id);}
  }
  private readonly otherDown=(event:PointerEvent)=>{
    if(event.isPrimary&&event.button===0)this.recover(event.pointerType);
    this.contacts.set(event.pointerId,event.pointerType);
    if(!this.active||event.pointerId===this.owner)return;
    this.pointers.add(event.pointerId);this.cancel('multitouch');
    event.preventDefault();event.stopPropagation();
  };
  private outsideReason(event:PointerEvent,x:number,y:number):HandSelectionInterruptReason|undefined {
    if(modalBlocksCanvas(event.clientX,event.clientY))return 'modal';
    if(!this.options.ready())return 'reset';
    if(event.clientX<0||event.clientY<0||event.clientX>=window.innerWidth||event.clientY>=window.innerHeight)return 'viewport';
    const b=this.bounds;
    if(!b||x<b.x||x>b.x+b.width||y<b.y||y>b.y+b.height)return 'outside';
    return undefined;
  }
  private readonly move=(event:PointerEvent)=>{
    if((event.pointerType==='mouse'||event.pointerType==='pen')&&event.buttons===0)this.recover(event.pointerType,event.pointerId);
    if(event.pointerId!==this.owner)return;
    const {x,y}=this.coordinates(event),reason=this.outsideReason(event,x,y);
    if(reason){this.cancel(reason);return;}
    const update=this.gesture.move(event.pointerId,x,y);this.apply(update);
    if(update?.phase!=='pending')clearTimeout(this.timer);
    if(update?.phase==='sweeping')event.preventDefault();
  };
  private readonly up=(event:PointerEvent)=>{
    this.contacts.delete(event.pointerId);
    if(!this.pointers.has(event.pointerId))return;
    event.preventDefault();event.stopPropagation();
    if(event.pointerId===this.owner){
      const {x,y}=this.coordinates(event),reason=this.outsideReason(event,x,y);
      if(reason)this.cancel(reason);
      else this.apply(this.gesture.up(event.pointerId,x,y));
    }
    this.release(event.pointerId);
  };
  private readonly cancelPointer=(event:PointerEvent)=>{this.contacts.delete(event.pointerId);if(this.pointers.has(event.pointerId)){event.preventDefault();event.stopPropagation();this.cancel('pointercancel');this.release(event.pointerId);}};
  private readonly lostCapture=(event:PointerEvent)=>{if(this.pointers.has(event.pointerId))this.cancel('capture');};
  private release(pointerId:number):void {
    if(!this.pointers.delete(pointerId))return;
    clearTimeout(this.timer);this.options.cancelCanvas();
    if(this.surface.hasPointerCapture(pointerId))this.surface.releasePointerCapture(pointerId);
    if(!this.pointers.size){this.owner=undefined;this.scene.input.enabled=this.savedInput;}
  }
  private readonly hover=(event:PointerEvent)=>{if(event.pointerType!=='mouse'||this.active||!this.options.ready())return;const {x,y}=this.coordinates(event);this.options.hover(this.cardAt(x,y)?.id);};
  private readonly leave=(event:PointerEvent)=>{this.options.hover(undefined);if(event.pointerId===this.owner)this.cancel('outside');};
  private readonly viewportLeave=(event:PointerEvent)=>{if(!event.relatedTarget&&event.pointerId===this.owner)this.cancel('viewport');};
  private readonly context=(event:MouseEvent)=>{event.preventDefault();if(this.active||!this.options.ready())return;const {x,y}=this.coordinates(event),card=this.cardAt(x,y);if(card)this.options.detail(card.id);};
  private stopCapture(reason:'blur'|'hidden'):void {
    this.cancel(reason);
    for(const id of this.pointers)if(this.surface.hasPointerCapture(id))this.surface.releasePointerCapture(id);
  }
  private readonly blur=()=>{this.stopCapture('blur');};
  private readonly visibility=()=>{if(document.hidden)this.stopCapture('hidden');};
  private readonly focus=()=>{if(this.active&&document.querySelector('dialog[open]'))this.cancel('modal');};
  cancel(reason:HandSelectionInterruptReason|'escape'='reset'):void {
    clearTimeout(this.timer);this.options.cancelCanvas();this.options.hover(undefined);
    this.apply(reason==='escape'?this.gesture.cancel('escape'):this.gesture.interrupt(reason));
  }
  setBounds(bounds:Box|undefined):void {
    this.cancel('resize');this.bounds=bounds;this.surface.hidden=!bounds;
    if(!bounds)return;
    const canvas=this.scene.game.canvas.getBoundingClientRect(),sx=canvas.width/(this.scene.scale.width*this.scene.scale.zoom),sy=canvas.height/(this.scene.scale.height*this.scene.scale.zoom);
    Object.assign(this.surface.style,{left:canvas.left+bounds.x*sx+'px',top:canvas.top+bounds.y*sy+'px',width:bounds.width*sx+'px',height:bounds.height*sy+'px'});
  }
  destroy():void {
    if(this.destroyed)return;this.destroyed=true;this.cancel();for(const id of [...this.pointers])this.release(id);this.contacts.clear();this.surface.remove();
    window.removeEventListener('pointerdown',this.otherDown,true);window.removeEventListener('pointermove',this.move,true);window.removeEventListener('pointerout',this.viewportLeave,true);window.removeEventListener('pointerup',this.up,true);window.removeEventListener('pointercancel',this.cancelPointer,true);window.removeEventListener('blur',this.blur);document.removeEventListener('visibilitychange',this.visibility);document.removeEventListener('focusin',this.focus);
  }
}
