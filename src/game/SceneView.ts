import Phaser from 'phaser';
import {layout,type Box,type TableLayout,type HandWindow} from './layout';
import {PointerIntent} from './PointerIntent';
import {pointerReleaseTime,releasePointerIntent} from './PointerReleaseTime';
import {modalBlocksCanvas} from './DetailDialog';
import {PAPER_THEME,PAPER_CSS,UI_FONT} from './theme';
import {alignViewportCamera,cssViewport} from '../platform/Viewport';
import {drawHandActionGlyph,type HandButtonSkin} from './HandActionArt';

type TouchActions={tap:()=>void;detail?:()=>void;drag?:(x:number,y:number)=>void;dragMove?:(x:number,y:number)=>void;swipe?:(dx:number,dy:number)=>void;cancel?:()=>void;press?:()=>void;release?:()=>void;enter?:()=>void;leave?:()=>void;holdToDrag?:boolean};
export class SceneView {
  readonly root:Phaser.GameObjects.Container;
  private gestures=new Map<Phaser.GameObjects.GameObject,TouchActions>();
  private intent=new PointerIntent();
  private pressed?:{object:Phaser.GameObjects.GameObject;actions:TouchActions;id:number;held:boolean;touch:boolean;x:number;y:number;dragging:boolean;at:number;downTime:number};
  private timer?:ReturnType<typeof setTimeout>;
  private reset(canceled:boolean):void {const pressed=this.pressed;this.intent.cancel();this.pressed=undefined;clearTimeout(this.timer);pressed?.actions.release?.();if(canceled)pressed?.actions.cancel?.();}
  private readonly cancel=()=>this.reset(true);
  cancelInteraction():void {this.reset(true);}
  private readonly down=(p:Phaser.Input.Pointer,over:Phaser.GameObjects.GameObject[])=>{
    const canvas=this.scene.game.canvas.getBoundingClientRect();
    if(modalBlocksCanvas(canvas.left+p.x*canvas.width/this.scene.scale.width,canvas.top+p.y*canvas.height/this.scene.scale.height)){this.cancel();return;}
    const object=over.find(o=>this.gestures.has(o));if(!object)return;this.cancel();
    const {x,y}=p.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    const actions=this.gestures.get(object)!,inspectable=!!actions.detail||!!actions.holdToDrag,at=performance.now();this.pressed={object,actions,id:p.id,held:false,touch:p.wasTouch,x,y,dragging:false,at,downTime:p.downTime};this.intent.down(p.id,x,y,at,inspectable);actions.press?.();
    if(inspectable)this.timer=setTimeout(()=>{if(this.intent.hold(performance.now())){if(this.pressed)this.pressed.held=true;if(!actions.holdToDrag)actions.detail?.();}},355);
  };
  private readonly move=(p:Phaser.Input.Pointer)=>{
    const {x,y}=p.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    this.intent.move(p.id,x,y);const pressed=this.pressed;
    if(!pressed||pressed.id!==p.id||!p.isDown)return;
    if(Math.hypot(x-pressed.x,y-pressed.y)>10)pressed.dragging=true;
    if(pressed.dragging&&(!pressed.actions.holdToDrag||!pressed.touch||pressed.held))pressed.actions.dragMove?.(x,y);
  };
  private readonly up=(p:Phaser.Input.Pointer)=>{
    if(this.pressed?.id!==p.id)return;
    const {x,y}=p.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    const pressed=this.pressed,at=pointerReleaseTime(pressed.at,pressed.downTime,p.upTime,performance.now());
    const {kind,newlyHeld}=releasePointerIntent(this.intent,p.id,x,y,at);pressed.held||=newlyHeld;this.reset(false);
    if(kind==='drag'&&pressed.actions.holdToDrag&&pressed.touch&&!pressed.held&&pressed.actions.swipe)pressed.actions.swipe(x-pressed.x,y-pressed.y);
    else if(kind==='drag'&&(!pressed.actions.holdToDrag||!pressed.touch||pressed.held))pressed.actions.drag?.(x,y);
    else if(kind==='tap'&&(pressed.object as Phaser.GameObjects.Rectangle).getBounds().contains(x,y))pressed.actions.tap();
    else if(kind==='none'&&pressed.held&&(pressed.actions.holdToDrag||newlyHeld))pressed.actions.detail?.();
    else pressed.actions.cancel?.();
  };
  private readonly resize=()=>{if(this.scene.scene.isActive()){alignViewportCamera(this.scene);this.redraw();}};
  constructor(private readonly scene:Phaser.Scene,private readonly redraw:()=>void,private readonly handWindow?:()=>HandWindow){
    alignViewportCamera(scene);
    this.root=scene.add.container(0,0).setName('view');
    scene.input.on('pointerdown',this.down);scene.input.on('pointermove',this.move);scene.input.on('pointerup',this.up);scene.input.on('pointerupoutside',this.cancel);
    scene.game.canvas.addEventListener('pointercancel',this.cancel);scene.scale.on('resize',this.resize);
    scene.events.once('shutdown',()=>{this.cancel();scene.input.off('pointerdown',this.down);scene.input.off('pointermove',this.move);scene.input.off('pointerup',this.up);scene.input.off('pointerupoutside',this.cancel);scene.game.canvas.removeEventListener('pointercancel',this.cancel);scene.scale.off('resize',this.resize);this.gestures.clear();});
  }
  get layout():TableLayout {
    const style=getComputedStyle(document.documentElement),n=(key:string)=>parseFloat(style.getPropertyValue(key))||0;
    return layout(cssViewport(this.scene),{top:n('--safe-top'),right:n('--safe-right'),bottom:n('--safe-bottom'),left:n('--safe-left')},undefined,this.handWindow?.());
  }
  clear():void {this.cancel();this.gestures.clear();this.root.removeAll(true);}
  add<T extends Phaser.GameObjects.GameObject>(object:T):T {this.root.add(object);return object;}
  /** Cache a handful of flat paper tones; historical scene palettes share this language. */
  material(b:Box,top:number,_bottom:number,radius=6):Phaser.GameObjects.Image {
    const r=top>>16&255,g=top>>8&255,blue=top&255;
    const light=(r+g+blue)/3;
    const knownPaper=top===PAPER_THEME.paper||top===PAPER_THEME.paperLight||top===PAPER_THEME.jadeSoft||top===PAPER_THEME.redSoft;
    const tone=knownPaper?top:light>200?PAPER_THEME.paperLight:r>g*1.25&&r>blue*1.25?PAPER_THEME.redSoft:light<150?PAPER_THEME.jadeSoft:PAPER_THEME.paper;
    const rx=Math.min(24,radius*256/b.width),ry=Math.min(24,radius*128/b.height),key=`d44-paper-${tone}-${rx.toFixed(1)}-${ry.toFixed(1)}`;
    if(!this.scene.textures.exists(key)){
      const texture=this.scene.textures.createCanvas(key,256,128)!,c=texture.getContext();
      c.beginPath();c.moveTo(rx,0);c.lineTo(256-rx,0);c.quadraticCurveTo(256,0,256,ry);c.lineTo(256,128-ry);c.quadraticCurveTo(256,128,256-rx,128);c.lineTo(rx,128);c.quadraticCurveTo(0,128,0,128-ry);c.lineTo(0,ry);c.quadraticCurveTo(0,0,rx,0);c.closePath();
      c.fillStyle='#'+tone.toString(16).padStart(6,'0');c.fill();texture.refresh();
    }
    return this.add(this.scene.add.image(b.x,b.y,key).setOrigin(0).setDisplaySize(b.width,b.height));
  }
  paperBackground():void {
    const {width,height}=this.layout;
    this.add(this.scene.add.rectangle(0,0,width,height,PAPER_THEME.paper).setOrigin(0));
    this.add(this.scene.add.graphics().lineStyle(1,PAPER_THEME.ink,.16).beginPath().moveTo(8,4).lineTo(width-8,4).strokePath());
  }
  text(x:number,y:number,value:string,size=14,color=PAPER_CSS.ink,wrap?:number):Phaser.GameObjects.Text {
    const rgb=parseInt(color.replace('#',''),16);if(color.startsWith('#')&&((rgb>>16&255)+(rgb>>8&255)+(rgb&255))/3>150)color=PAPER_CSS.ink;
    return this.add(this.scene.add.text(Math.round(x),Math.round(y),value,{fontFamily:UI_FONT,fontSize:`${size}px`,color,resolution:Math.max(1.5,1/this.scene.scale.zoom),wordWrap:wrap?{width:wrap,useAdvancedWrap:true}:undefined}));
  }
  rect(b:Box,color:number=PAPER_THEME.paper):Phaser.GameObjects.Rectangle {return this.add(this.scene.add.rectangle(b.x+b.width/2,b.y+b.height/2,b.width,b.height,color).setStrokeStyle(1,PAPER_THEME.jade,.65));}
  target(object:Phaser.GameObjects.Rectangle,name:string,actions:TouchActions):void {
    object.setName(name).setInteractive({useHandCursor:true});this.gestures.set(object,actions);
    if(actions.enter){
      object.on('pointerover',(pointer:Phaser.Input.Pointer)=>{
        const canvas=this.scene.game.canvas.getBoundingClientRect();
        if(!pointer.wasTouch&&!modalBlocksCanvas(canvas.left+pointer.x*canvas.width/this.scene.scale.width,canvas.top+pointer.y*canvas.height/this.scene.scale.height))actions.enter?.();
      });
      object.on('pointerout',()=>actions.leave?.());
    }
    object.once('destroy',()=>{this.gestures.delete(object);if(this.pressed?.object===object)this.cancel();});
  }
  button(b:Box,label:string,name:string,action:()=>void,enabled=true,primary=false,skin?:HandButtonSkin):Phaser.GameObjects.Rectangle {
    const art=this.add(this.scene.add.container(b.x,b.y)),g=this.scene.add.graphics(),radius=6;
    g.fillStyle(PAPER_THEME.ink,.08).fillRoundedRect(0,2,b.width,b.height,radius);
    g.fillStyle(primary?PAPER_THEME.red:PAPER_THEME.paperLight).fillRoundedRect(0,0,b.width,b.height,radius);
    const edge=this.scene.add.graphics();if(skin!=='sort')edge.lineStyle(skin?1.5:1,primary?PAPER_THEME.red:PAPER_THEME.jade,.9).strokeRoundedRect(.5,.5,b.width-1,b.height-1,radius);
    const glow=this.scene.add.graphics().lineStyle(2,PAPER_THEME.jade,.75).strokeRoundedRect(1,1,b.width-2,b.height-2,radius).setAlpha(0);
    art.add([g,edge,glow]);
    const glyph=skin&&skin!=='sort'?this.scene.add.graphics().setPosition(6,(b.height-36)/2).setName('button/'+skin+'-glyph'):undefined;
    if(glyph)art.add(glyph);
    const t=this.text(b.x+b.width/2,b.y+b.height/2-1,label,primary?22:15).setOrigin(.5).setFontStyle('bold').setColor(primary?PAPER_CSS.paperLight:PAPER_CSS.jade);
    const r=this.rect(b).setFillStyle(0,0).setStrokeStyle();
    r.setData('label',t).setData('buttonArt',art).setData('buttonFace',g).setData('buttonBounds',b).setData('buttonPrimary',primary).setData('buttonSkin',skin).setData('buttonGlyph',glyph);
    const rest=()=>{art.y=b.y;t.y=Number(t.getData('restY')??b.y+b.height/2-1);glow.setAlpha(0);};
    this.target(r,name,{tap:action,press:()=>{art.y=b.y+2;t.y=Number(t.getData('restY')??b.y+b.height/2-1)+2;glow.setAlpha(.6);},release:rest,cancel:rest});
    r.on('pointerover',()=>{if(r.input?.enabled)glow.setAlpha(.8);});r.on('pointerout',rest);
    this.setEnabled(r,enabled);return r;
  }
  setEnabled(object:Phaser.GameObjects.Rectangle,enabled:boolean):void {
    object.input!.enabled=enabled;object.setAlpha(1);
    const primary=!!object.getData('buttonPrimary'),label=object.getData('label') as Phaser.GameObjects.Text|undefined;
    label?.setAlpha(1).setColor(enabled?(primary?PAPER_CSS.paperLight:PAPER_CSS.jade):PAPER_CSS.disabledInk);
    const art=object.getData('buttonArt') as Phaser.GameObjects.Container|undefined;art?.setAlpha(1);
    const face=object.getData('buttonFace') as Phaser.GameObjects.Graphics|undefined,b=object.getData('buttonBounds') as Box|undefined;
    const skin=object.getData('buttonSkin') as HandButtonSkin|undefined,glyph=object.getData('buttonGlyph') as Phaser.GameObjects.Graphics|undefined;
    if(face&&b){face.clear();if(skin!=='sort'){face.fillStyle(PAPER_THEME.ink,.08).fillRoundedRect(0,2,b.width,b.height,6);face.fillStyle(enabled?(primary?PAPER_THEME.red:PAPER_THEME.paperLight):PAPER_THEME.disabled).fillRoundedRect(0,0,b.width,b.height,6);}}
    if(glyph&&skin&&skin!=='sort')drawHandActionGlyph(glyph,skin,enabled?(primary?PAPER_THEME.paperLight:PAPER_THEME.jade):PAPER_THEME.disabledInk);
  }
}
