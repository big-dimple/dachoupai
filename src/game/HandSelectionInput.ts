import type Phaser from 'phaser';
import type {Box} from './layout';
import {HandSelectionGesture,type HandSelectionHitBox,type HandSelectionUpdate} from './HandSelectionGesture';
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
  private pointers=new Set<number>();
  private contacts=new Set<number>();
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
    window.addEventListener('pointerup',this.up,true);
    window.addEventListener('pointercancel',this.cancelPointer,true);
    window.addEventListener('blur',this.blur);
    document.addEventListener('visibilitychange',this.visibility);
    document.addEventListener('focusin',this.focus);
    document.body.append(this.surface);
  }
  get active():boolean{return this.owner!==undefined;}
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
    this.surface.setPointerCapture(event.pointerId);
    this.apply(this.gesture.begin(event.pointerId,x,y,card.id,this.options.selected(),this.options.cards(),5));
    // Stationary hold still inspects. A moved pointer clears this timer before it can open.
    this.timer=setTimeout(()=>{if(this.gesture.state?.phase==='pending'){this.apply(this.gesture.cancel());if(this.options.ready()&&!document.querySelector('dialog[open]'))this.options.detail(card.id);}},355);
    if(event.pointerType==='mouse')event.preventDefault();
  };
  private readonly otherDown=(event:PointerEvent)=>{
    this.contacts.add(event.pointerId);
    if(!this.active||event.pointerId===this.owner)return;
    this.pointers.add(event.pointerId);clearTimeout(this.timer);this.apply(this.gesture.cancel('multitouch'));
    event.preventDefault();event.stopPropagation();
  };
  private readonly move=(event:PointerEvent)=>{
    if(event.pointerId!==this.owner)return;
    const {x,y}=this.coordinates(event),b=this.bounds;
    if(!b||!this.options.ready()||x<b.x||x>b.x+b.width||y<b.y||y>b.y+b.height||modalBlocksCanvas(event.clientX,event.clientY)){
      clearTimeout(this.timer);this.apply(this.gesture.cancel('outside'));return;
    }
    const update=this.gesture.move(event.pointerId,x,y);this.apply(update);
    if(update?.phase!=='pending')clearTimeout(this.timer);
    if(update?.phase==='sweeping')event.preventDefault();
  };
  private readonly up=(event:PointerEvent)=>{
    this.contacts.delete(event.pointerId);
    if(!this.pointers.has(event.pointerId))return;
    if(event.pointerId===this.owner){
      const {x,y}=this.coordinates(event),b=this.bounds;
      if(!b||!this.options.ready()||x<b.x||x>b.x+b.width||y<b.y||y>b.y+b.height||modalBlocksCanvas(event.clientX,event.clientY))this.apply(this.gesture.cancel('outside'));
      else this.apply(this.gesture.up(event.pointerId,x,y));
    }
    this.release(event.pointerId);
  };
  private readonly cancelPointer=(event:PointerEvent)=>{this.contacts.delete(event.pointerId);if(this.pointers.has(event.pointerId)){this.apply(this.gesture.cancel());this.release(event.pointerId);}};
  private readonly lostCapture=(event:PointerEvent)=>{if(this.pointers.has(event.pointerId)){this.apply(this.gesture.cancel());this.release(event.pointerId);}};
  private release(pointerId:number):void {
    clearTimeout(this.timer);this.pointers.delete(pointerId);
    if(this.surface.hasPointerCapture(pointerId))this.surface.releasePointerCapture(pointerId);
    if(!this.pointers.size){this.owner=undefined;this.scene.input.enabled=this.savedInput;}
  }
  private readonly hover=(event:PointerEvent)=>{if(event.pointerType!=='mouse'||this.active||!this.options.ready())return;const {x,y}=this.coordinates(event);this.options.hover(this.cardAt(x,y)?.id);};
  private readonly leave=()=>{if(!this.active)this.options.hover(undefined);};
  private readonly context=(event:MouseEvent)=>{event.preventDefault();if(this.active||!this.options.ready())return;const {x,y}=this.coordinates(event),card=this.cardAt(x,y);if(card)this.options.detail(card.id);};
  private readonly blur=()=>{this.contacts.clear();this.cancel();};
  private readonly visibility=()=>{if(document.hidden)this.blur();};
  private readonly focus=()=>{if(this.active&&document.querySelector('dialog[open]')){clearTimeout(this.timer);this.apply(this.gesture.cancel());}};
  cancel():void {
    clearTimeout(this.timer);this.apply(this.gesture.cancel());
    for(const id of [...this.pointers])this.release(id);
  }
  setBounds(bounds:Box|undefined):void {
    this.cancel();this.bounds=bounds;this.surface.hidden=!bounds;
    if(!bounds)return;
    const canvas=this.scene.game.canvas.getBoundingClientRect(),sx=canvas.width/(this.scene.scale.width*this.scene.scale.zoom),sy=canvas.height/(this.scene.scale.height*this.scene.scale.zoom);
    Object.assign(this.surface.style,{left:canvas.left+bounds.x*sx+'px',top:canvas.top+bounds.y*sy+'px',width:bounds.width*sx+'px',height:bounds.height*sy+'px'});
  }
  destroy():void {
    if(this.destroyed)return;this.destroyed=true;this.cancel();this.surface.remove();
    window.removeEventListener('pointerdown',this.otherDown,true);window.removeEventListener('pointermove',this.move,true);window.removeEventListener('pointerup',this.up,true);window.removeEventListener('pointercancel',this.cancelPointer,true);window.removeEventListener('blur',this.blur);document.removeEventListener('visibilitychange',this.visibility);document.removeEventListener('focusin',this.focus);
  }
}
