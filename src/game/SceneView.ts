import Phaser from 'phaser';
import {layout,type Box,type TableLayout} from './layout';
import {PointerIntent} from './PointerIntent';
import {modalBlocksCanvas} from './DetailDialog';
import {PAPER_THEME,PAPER_CSS,UI_FONT} from './theme';

type TouchActions={tap:()=>void;detail?:()=>void;drag?:(x:number,y:number)=>void;dragMove?:(x:number,y:number)=>void;cancel?:()=>void;press?:()=>void;release?:()=>void;holdToDrag?:boolean};
export class SceneView {
  readonly root:Phaser.GameObjects.Container;
  private gestures=new Map<Phaser.GameObjects.GameObject,TouchActions>();
  private intent=new PointerIntent();
  private pressed?:{object:Phaser.GameObjects.GameObject;actions:TouchActions;id:number;held:boolean;touch:boolean;x:number;y:number;dragging:boolean};
  private timer?:ReturnType<typeof setTimeout>;
  private reset(canceled:boolean):void {const pressed=this.pressed;this.intent.cancel();this.pressed=undefined;clearTimeout(this.timer);pressed?.actions.release?.();if(canceled)pressed?.actions.cancel?.();}
  private readonly cancel=()=>this.reset(true);
  private readonly down=(p:Phaser.Input.Pointer,over:Phaser.GameObjects.GameObject[])=>{
    const canvas=this.scene.game.canvas.getBoundingClientRect();
    if(modalBlocksCanvas(canvas.left+p.x*canvas.width/this.scene.scale.width,canvas.top+p.y*canvas.height/this.scene.scale.height)){this.cancel();return;}
    const object=over.find(o=>this.gestures.has(o));if(!object)return;this.cancel();
    const actions=this.gestures.get(object)!;this.pressed={object,actions,id:p.id,held:false,touch:p.wasTouch,x:p.x,y:p.y,dragging:false};this.intent.down(p.id,p.x,p.y,performance.now());actions.press?.();
    this.timer=setTimeout(()=>{if(this.intent.hold(performance.now())){if(this.pressed)this.pressed.held=true;if(!actions.holdToDrag)actions.detail?.();}},355);
  };
  private readonly move=(p:Phaser.Input.Pointer)=>{
    this.intent.move(p.id,p.x,p.y);const pressed=this.pressed;
    if(!pressed||pressed.id!==p.id||!p.isDown)return;
    if(Math.hypot(p.x-pressed.x,p.y-pressed.y)>10)pressed.dragging=true;
    if(pressed.dragging&&(!pressed.actions.holdToDrag||!pressed.touch||pressed.held))pressed.actions.dragMove?.(p.x,p.y);
  };
  private readonly up=(p:Phaser.Input.Pointer)=>{
    if(this.pressed?.id!==p.id)return;
    const pressed=this.pressed,kind=this.intent.up(p.id,p.x,p.y,performance.now());this.reset(false);if(!pressed)return;
    if(kind==='drag'&&(!pressed.actions.holdToDrag||!pressed.touch||pressed.held))pressed.actions.drag?.(p.x,p.y);
    else if(kind==='tap'&&(pressed.object as Phaser.GameObjects.Rectangle).getBounds().contains(p.x,p.y))pressed.actions.tap();
    else if(kind==='none'&&pressed.held&&pressed.actions.holdToDrag)pressed.actions.detail?.();
    else pressed.actions.cancel?.();
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
  /** A cached continuous material gradient avoids Graphics' triangulated rounded fills. */
  material(b:Box,top:number,bottom:number,radius=6):Phaser.GameObjects.Image {
    const rx=Math.min(24,radius*256/b.width),ry=Math.min(24,radius*128/b.height);
    const key=`p00-material-${top}-${bottom}-${rx.toFixed(1)}-${ry.toFixed(1)}`;
    if(!this.scene.textures.exists(key)){
      const texture=this.scene.textures.createCanvas(key,256,128)!;const c=texture.getContext();
      c.beginPath();c.moveTo(rx,0);c.lineTo(256-rx,0);c.quadraticCurveTo(256,0,256,ry);c.lineTo(256,128-ry);c.quadraticCurveTo(256,128,256-rx,128);c.lineTo(rx,128);c.quadraticCurveTo(0,128,0,128-ry);c.lineTo(0,ry);c.quadraticCurveTo(0,0,rx,0);c.closePath();c.clip();
      const hex=(color:number)=>`#${color.toString(16).padStart(6,'0')}`,gradient=c.createLinearGradient(0,0,0,128);
      gradient.addColorStop(0,hex(top));gradient.addColorStop(1,hex(bottom));c.fillStyle=gradient;c.fillRect(0,0,256,128);
      for(let y=2;y<128;y+=4){c.fillStyle=y%8===2?'rgba(255,255,255,.025)':'rgba(0,0,0,.018)';c.fillRect(0,y,256,1);}
      c.fillStyle='rgba(255,245,216,.18)';c.fillRect(rx,1,256-rx*2,1);texture.refresh();
    }
    return this.add(this.scene.add.image(b.x,b.y,key).setOrigin(0).setDisplaySize(b.width,b.height));
  }
  paperBackground():void {
    const {width,height}=this.layout;
    this.add(this.scene.add.rectangle(width/2,height/2,width,height,0x192c32));
    const board=this.scene.add.graphics();
    this.material({x:6,y:6,width:width-12,height:height-12},0xf7ecd7,0xe1ccaa,9);
    board.lineStyle(3,0x756046).strokeRoundedRect(5,5,width-10,height-10,9);
    board.lineStyle(1,0xfff5da,.85).strokeRoundedRect(9,9,width-18,height-18,6);this.add(board);
    if(this.scene.textures.exists('p00-paper'))this.add(this.scene.add.tileSprite(8,8,width-16,height-16,'p00-paper').setOrigin(0).setAlpha(.22));
    const corners=this.scene.add.graphics().lineStyle(2,PAPER_THEME.brass,.75);
    for(const [cx,cy,sx,sy] of [[14,14,1,1],[width-14,14,-1,1],[14,height-14,1,-1],[width-14,height-14,-1,-1]])corners.beginPath().moveTo(cx,cy+18*sy).lineTo(cx,cy).lineTo(cx+18*sx,cy).strokePath();
    this.add(corners);
  }
  text(x:number,y:number,value:string,size=14,color=PAPER_CSS.ink,wrap?:number):Phaser.GameObjects.Text {
    return this.add(this.scene.add.text(x,y,value,{fontFamily:UI_FONT,fontSize:`${size}px`,color,resolution:Math.min(window.devicePixelRatio||1,2),wordWrap:wrap?{width:wrap,useAdvancedWrap:true}:undefined}));
  }
  rect(b:Box,color:number=PAPER_THEME.paper):Phaser.GameObjects.Rectangle {return this.add(this.scene.add.rectangle(b.x+b.width/2,b.y+b.height/2,b.width,b.height,color).setStrokeStyle(1,PAPER_THEME.jade,.65));}
  target(object:Phaser.GameObjects.Rectangle,name:string,actions:TouchActions):void {
    object.setName(name).setInteractive({useHandCursor:true});this.gestures.set(object,actions);
    object.once('destroy',()=>{this.gestures.delete(object);if(this.pressed?.object===object)this.cancel();});
  }
  button(b:Box,label:string,name:string,action:()=>void,enabled=true,primary=false):Phaser.GameObjects.Rectangle {
    const art=this.add(this.scene.add.container(b.x,b.y)),g=this.scene.add.graphics(),radius=Math.min(7,b.height/5);
    g.fillStyle(0x192b30,.3).fillRoundedRect(1,4,b.width-2,b.height-1,radius);
    g.fillStyle(0x6c4b2c).fillRoundedRect(0,0,b.width,b.height,radius);
    const fill=this.material({x:2,y:2,width:b.width-4,height:b.height-6},primary?0xd77554:0x487b7c,primary?0x923b30:0x234550,radius-1),edge=this.scene.add.graphics();
    edge.lineStyle(1,0xf5d69b,.95).strokeRoundedRect(.5,.5,b.width-1,b.height-1,radius);
    edge.lineStyle(1,primary?0xefa87a:0x7fa6a0,.6).strokeRoundedRect(5,5,b.width-10,b.height-12,3);
    edge.lineStyle(1,0x102b32,.55).beginPath().moveTo(7,b.height-7).lineTo(b.width-7,b.height-7).strokePath();
    const glow=this.scene.add.graphics().lineStyle(2,0xffedb8,.8).strokeRoundedRect(1,1,b.width-2,b.height-3,radius).setAlpha(0);
    art.add([g,fill,edge,glow]);
    const t=this.text(b.x+b.width/2,b.y+b.height/2-1,label,primary?22:14,'#fff2d4').setOrigin(.5).setFontStyle('bold').setShadow(0,2,'#10232b',2,true,true);
    const r=this.rect(b).setFillStyle(0,0).setStrokeStyle(0);
    r.setData('label',t).setData('buttonArt',art);
    const rest=()=>{art.y=b.y;t.y=b.y+b.height/2-1;glow.setAlpha(0);};
    this.target(r,name,{tap:action,press:()=>{art.y=b.y+2;t.y=b.y+b.height/2+1;glow.setAlpha(.6);},release:rest,cancel:rest});
    r.on('pointerover',()=>{if(r.input?.enabled)glow.setAlpha(.8);});r.on('pointerout',rest);
    this.setEnabled(r,enabled);return r;
  }
  setEnabled(object:Phaser.GameObjects.Rectangle,enabled:boolean):void {
    object.input!.enabled=enabled;object.setAlpha(enabled?1:.45);
    const label=object.getData('label') as Phaser.GameObjects.Text|undefined;label?.setAlpha(enabled?1:.65);
    const art=object.getData('buttonArt') as Phaser.GameObjects.Container|undefined;art?.setAlpha(enabled?1:.42);
  }
}
