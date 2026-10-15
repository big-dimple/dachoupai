import type Phaser from 'phaser';
import type {Box} from './layout';
import {PointerIntent} from './PointerIntent';
import {modalBlocksCanvas} from './DetailDialog';

type OwnedCard=Box&{id:string};
interface Options {
  ready:()=>boolean;inspectable:()=>boolean;cards:()=>OwnedCard[];cancelCanvas:()=>void;
  tap:(id:string)=>void;lift:(id:string,x:number,y:number)=>void;
  move:(x:number,y:number)=>void;drop:(id:string,x:number,y:number)=>void;cancel:()=>void;
}
/** Native owned-card rail, with the same PointerIntent threshold as the table hand.
 * Only owned instances enter this surface; previews never mutate the saved order. */
export class OwnedJokerInput {
  readonly surface=document.createElement('div');
  private readonly intent=new PointerIntent();
  private owner?:{pointerId:number;id:string;x:number;y:number;touch:boolean;lifted:boolean;canceled:boolean;width:number;height:number;canDrag:boolean};
  private contacts=new Map<number,string>();
  private timer?:ReturnType<typeof setTimeout>;
  private savedInput=true;
  private bounds?:Box;
  private destroyed=false;
  private readonly canvasResize?:ResizeObserver;
  constructor(private readonly scene:Phaser.Scene,private readonly options:Options){
    this.surface.className='shop-owned-input';this.surface.setAttribute('aria-hidden','true');
    // pan-y lets the browser cancel a contact after it has already lifted a card.
    // This fixed shop rail has no scrolling content; pre-hold movement still cancels.
    Object.assign(this.surface.style,{position:'fixed',zIndex:'5',touchAction:'none',userSelect:'none',cursor:'grab',webkitTapHighlightColor:'transparent'});
    this.surface.addEventListener('pointerdown',this.down);
    // Keep Phaser's legacy mouse/touch listeners from owning this same contact.
    this.surface.addEventListener('mousedown',e=>e.stopPropagation());
    this.surface.addEventListener('touchstart',e=>e.stopPropagation(),{passive:true});
    this.surface.addEventListener('contextmenu',e=>e.preventDefault());
    this.surface.addEventListener('lostpointercapture',this.lost);
    window.addEventListener('pointerdown',this.contact,true);
    window.addEventListener('pointermove',this.move,true);
    window.addEventListener('pointerup',this.up,true);
    window.addEventListener('pointercancel',this.interrupt,true);
    window.addEventListener('pointerout',this.out,true);
    window.addEventListener('blur',this.blur);
    window.addEventListener('resize',this.resize);
    window.addEventListener('keydown',this.key);
    document.addEventListener('visibilitychange',this.visibility);
    document.addEventListener('focusin',this.focus);
    document.body.append(this.surface);
    // Canvas CSS can settle after the scene has laid out the owned-card rail.
    if(typeof ResizeObserver!=='undefined'){
      this.canvasResize=new ResizeObserver(()=>this.syncBounds());
      this.canvasResize.observe(this.scene.game.canvas);
    }
  }
  private coordinates(e:PointerEvent){const r=this.scene.game.canvas.getBoundingClientRect(),zoom=this.scene.scale.zoom;return{x:(e.clientX-r.left)*this.scene.scale.width*zoom/r.width,y:(e.clientY-r.top)*this.scene.scale.height*zoom/r.height};}
  private blocked(e:PointerEvent){return !!this.owner&&(this.owner.width!==innerWidth||this.owner.height!==innerHeight)||!this.options.inspectable()||modalBlocksCanvas(e.clientX,e.clientY)||e.clientX<0||e.clientY<0||e.clientX>=innerWidth||e.clientY>=innerHeight;}
  private readonly contact=(e:PointerEvent)=>{
    if(e.isPrimary){for(const [id,type] of this.contacts)if(type===e.pointerType){if(this.owner?.pointerId===id){this.cancel();this.finish();}this.contacts.delete(id);}}
    this.contacts.set(e.pointerId,e.pointerType);
    if(this.owner&&e.pointerId!==this.owner.pointerId)this.cancel();
  };
  private readonly down=(e:PointerEvent)=>{
    if(e.button!==0||!e.isPrimary||this.contacts.size!==1||this.owner||this.blocked(e))return;
    const {x,y}=this.coordinates(e),card=this.options.cards().find(b=>x>=b.x&&x<=b.x+b.width&&y>=b.y&&y<=b.y+b.height);if(!card)return;
    this.options.cancelCanvas();this.savedInput=this.scene.input.enabled;this.scene.input.enabled=false;
    this.owner={pointerId:e.pointerId,id:card.id,x,y,touch:e.pointerType==='touch',lifted:false,canceled:false,width:innerWidth,height:innerHeight,canDrag:this.options.ready()};
    this.intent.down(e.pointerId,x,y,performance.now());
    try{this.surface.setPointerCapture(e.pointerId);}catch{/* Window events still track the contact. */}
    if(e.pointerType!=='touch')e.preventDefault();
    this.timer=setTimeout(()=>{const o=this.owner;if(o&&!o.canceled&&this.options.inspectable()&&!document.querySelector('dialog[open]')&&this.intent.hold(performance.now())&&o.canDrag&&this.options.ready())this.lift(o);},355);
  };
  private lift(o:NonNullable<OwnedJokerInput['owner']>){if(o.lifted)return;o.lifted=true;this.surface.style.cursor='grabbing';this.options.lift(o.id,o.x,o.y);}
  private readonly move=(e:PointerEvent)=>{
    const o=this.owner;if(!o||e.pointerId!==o.pointerId)return;
    if(e.pointerType!=='touch'&&e.buttons===0){this.cancel();this.finish();return;}
    if(o.canceled)return;if(this.blocked(e)||o.lifted&&!this.options.ready()){this.cancel();return;}
    const {x,y}=this.coordinates(e);this.intent.move(e.pointerId,x,y);
    if(Math.hypot(x-o.x,y-o.y)>10){
      clearTimeout(this.timer);
      // Movement before the hold cannot turn into a drag or tap.
      if(!o.canDrag||!this.options.ready()){this.cancel();return;}
      if(o.touch&&!o.lifted){this.cancel();return;}
      this.lift(o);
    }
    if(o.lifted){this.options.move(x,y);e.preventDefault();}
  };
  private readonly up=(e:PointerEvent)=>{
    this.contacts.delete(e.pointerId);const o=this.owner;if(!o||e.pointerId!==o.pointerId)return;
    const {x,y}=this.coordinates(e),kind=this.intent.up(e.pointerId,x,y,performance.now()),valid=!o.canceled&&!this.blocked(e);
    this.finish();e.preventDefault();e.stopPropagation();
    if(valid&&o.canDrag&&this.options.ready()&&o.lifted&&kind==='drag')this.options.drop(o.id,x,y);
    else {this.options.cancel();if(valid&&(kind==='tap'||!o.canDrag&&kind==='none'))this.options.tap(o.id);}
  };
  private readonly interrupt=(e:PointerEvent)=>{this.contacts.delete(e.pointerId);if(this.owner?.pointerId===e.pointerId){this.cancel();this.finish();}};
  private readonly lost=(e:PointerEvent)=>{if(this.owner?.pointerId===e.pointerId){this.cancel();this.finish();}};
  private readonly out=(e:PointerEvent)=>{if(!e.relatedTarget&&this.owner?.pointerId===e.pointerId)this.cancel();};
  private readonly blur=()=>{this.cancel();this.finish();this.contacts.clear();};
  private readonly resize=()=>{this.cancel();this.finish();};
  private readonly visibility=()=>{if(document.hidden)this.blur();};
  private readonly focus=()=>{if(document.querySelector('dialog[open]'))this.cancel();};
  private readonly key=(e:KeyboardEvent)=>{if(e.key==='Escape')this.cancel();};
  cancel(){clearTimeout(this.timer);this.intent.cancel();if(this.owner)this.owner.canceled=true;this.options.cancel();}
  private finish(){clearTimeout(this.timer);const o=this.owner;this.owner=undefined;this.surface.style.cursor='grab';if(o){this.scene.input.enabled=this.savedInput;if(this.surface.hasPointerCapture(o.pointerId))this.surface.releasePointerCapture(o.pointerId);}}
  setBounds(b:Box|undefined){
    this.cancel();this.finish();this.bounds=b;this.surface.hidden=!b;this.syncBounds();
  }
  private syncBounds(){
    const b=this.bounds;if(this.destroyed||!b)return;
    const r=this.scene.game.canvas.getBoundingClientRect(),sx=r.width/(this.scene.scale.width*this.scene.scale.zoom),sy=r.height/(this.scene.scale.height*this.scene.scale.zoom);
    Object.assign(this.surface.style,{left:r.left+b.x*sx+'px',top:r.top+b.y*sy+'px',width:b.width*sx+'px',height:b.height*sy+'px'});
  }
  destroy(){if(this.destroyed)return;this.destroyed=true;this.canvasResize?.disconnect();this.cancel();this.finish();this.surface.remove();window.removeEventListener('pointerdown',this.contact,true);window.removeEventListener('pointermove',this.move,true);window.removeEventListener('pointerup',this.up,true);window.removeEventListener('pointercancel',this.interrupt,true);window.removeEventListener('pointerout',this.out,true);window.removeEventListener('blur',this.blur);window.removeEventListener('resize',this.resize);window.removeEventListener('keydown',this.key);document.removeEventListener('visibilitychange',this.visibility);document.removeEventListener('focusin',this.focus);}
}
