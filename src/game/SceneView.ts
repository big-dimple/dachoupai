import Phaser from 'phaser';
import {layout,type Box,type TableLayout} from './layout';
import {PointerIntent} from './PointerIntent';
import {modalBlocksCanvas} from './DetailDialog';

type TouchActions={tap:()=>void;detail?:()=>void;drag?:(x:number,y:number)=>void;holdToDrag?:boolean};
export class SceneView {
  readonly root:Phaser.GameObjects.Container;
  private gestures=new Map<Phaser.GameObjects.GameObject,TouchActions>();
  private intent=new PointerIntent();
  private pressed?:{object:Phaser.GameObjects.GameObject;actions:TouchActions;held:boolean;touch:boolean};
  private timer?:ReturnType<typeof setTimeout>;
  private readonly cancel=()=>{this.intent.cancel();this.pressed=undefined;clearTimeout(this.timer);};
  private readonly down=(p:Phaser.Input.Pointer,over:Phaser.GameObjects.GameObject[])=>{
    const canvas=this.scene.game.canvas.getBoundingClientRect();
    if(modalBlocksCanvas(canvas.left+p.x*canvas.width/this.scene.scale.width,canvas.top+p.y*canvas.height/this.scene.scale.height)){this.cancel();return;}
    const object=over.find(o=>this.gestures.has(o));if(!object)return;this.cancel();
    const actions=this.gestures.get(object)!;this.pressed={object,actions,held:false,touch:p.wasTouch};this.intent.down(p.id,p.x,p.y,performance.now());
    this.timer=setTimeout(()=>{if(this.intent.hold(performance.now())){if(this.pressed)this.pressed.held=true;if(!actions.holdToDrag)actions.detail?.();}},355);
  };
  private readonly move=(p:Phaser.Input.Pointer)=>this.intent.move(p.id,p.x,p.y);
  private readonly up=(p:Phaser.Input.Pointer)=>{
    const pressed=this.pressed,kind=this.intent.up(p.id,p.x,p.y,performance.now());this.cancel();if(!pressed)return;
    if(kind==='drag'&&(!pressed.actions.holdToDrag||!pressed.touch||pressed.held))pressed.actions.drag?.(p.x,p.y);
    else if(kind==='tap'&&(pressed.object as Phaser.GameObjects.Rectangle).getBounds().contains(p.x,p.y))pressed.actions.tap();
    else if(kind==='none'&&pressed.held&&pressed.actions.holdToDrag)pressed.actions.detail?.();
  };
  private readonly resize=()=>{if(this.scene.scene.isActive())this.redraw();};
  constructor(private readonly scene:Phaser.Scene,private readonly redraw:()=>void){
    this.root=scene.add.container(0,0).setName('view');
    scene.input.on('pointerdown',this.down);scene.input.on('pointermove',this.move);scene.input.on('pointerup',this.up);scene.input.on('pointerupoutside',this.cancel);
    scene.game.canvas.addEventListener('pointercancel',this.cancel);scene.scale.on('resize',this.resize);
    scene.events.once('shutdown',()=>{this.cancel();scene.input.off('pointerdown',this.down);scene.input.off('pointermove',this.move);scene.input.off('pointerup',this.up);scene.input.off('pointerupoutside',this.cancel);scene.game.canvas.removeEventListener('pointercancel',this.cancel);scene.scale.off('resize',this.resize);this.gestures.clear();});
  }
  get layout():TableLayout {
    const style=getComputedStyle(document.documentElement),n=(key:string)=>parseFloat(style.getPropertyValue(key))||0;
    return layout({width:this.scene.scale.width,height:this.scene.scale.height},{top:n('--safe-top'),right:n('--safe-right'),bottom:n('--safe-bottom'),left:n('--safe-left')});
  }
  clear():void {this.cancel();this.gestures.clear();this.root.removeAll(true);}
  add<T extends Phaser.GameObjects.GameObject>(object:T):T {this.root.add(object);return object;}
  text(x:number,y:number,value:string,size=14,color='#f1e6cc',wrap?:number):Phaser.GameObjects.Text {
    return this.add(this.scene.add.text(x,y,value,{fontFamily:'"Microsoft YaHei",sans-serif',fontSize:`${size}px`,color,resolution:Math.min(window.devicePixelRatio||1,2),wordWrap:wrap?{width:wrap,useAdvancedWrap:true}:undefined}));
  }
  rect(b:Box,color=0x24313b):Phaser.GameObjects.Rectangle {return this.add(this.scene.add.rectangle(b.x+b.width/2,b.y+b.height/2,b.width,b.height,color).setStrokeStyle(1,0x5d9184));}
  target(object:Phaser.GameObjects.Rectangle,name:string,actions:TouchActions):void {
    object.setName(name).setInteractive({useHandCursor:true});this.gestures.set(object,actions);
    object.once('destroy',()=>{this.gestures.delete(object);if(this.pressed?.object===object)this.cancel();});
  }
  button(b:Box,label:string,name:string,action:()=>void,enabled=true,primary=false):Phaser.GameObjects.Rectangle {
    const r=this.rect(b,primary?0xc84e42:0x24313b);this.target(r,name,{tap:action});this.setEnabled(r,enabled);
    r.setData('label',this.text(b.x+b.width/2,b.y+b.height/2,label,primary?22:14).setOrigin(.5));return r;
  }
  setEnabled(object:Phaser.GameObjects.Rectangle,enabled:boolean):void {
    object.input!.enabled=enabled;object.setAlpha(enabled?1:.45);
  }
}
