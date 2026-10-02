import Phaser from 'phaser';
import {layout,type Box,type TableLayout,type HandWindow} from './layout';
import {PointerIntent} from './PointerIntent';
import {modalBlocksCanvas} from './DetailDialog';
import {PAPER_THEME,PAPER_CSS,UI_FONT} from './theme';
import {alignViewportCamera,cssViewport} from '../platform/Viewport';

type TouchActions={tap:()=>void;detail?:()=>void;drag?:(x:number,y:number)=>void;dragMove?:(x:number,y:number)=>void;swipe?:(dx:number,dy:number)=>void;cancel?:()=>void;press?:()=>void;release?:()=>void;enter?:()=>void;leave?:()=>void;holdToDrag?:boolean};
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
    const {x,y}=p.positionToCamera(this.scene.cameras.main) as Phaser.Math.Vector2;
    const actions=this.gestures.get(object)!,inspectable=!!actions.detail||!!actions.holdToDrag;this.pressed={object,actions,id:p.id,held:false,touch:p.wasTouch,x,y,dragging:false};this.intent.down(p.id,x,y,performance.now(),inspectable);actions.press?.();
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
    const pressed=this.pressed,kind=this.intent.up(p.id,x,y,performance.now());this.reset(false);if(!pressed)return;
    if(kind==='drag'&&pressed.actions.holdToDrag&&pressed.touch&&!pressed.held&&pressed.actions.swipe)pressed.actions.swipe(x-pressed.x,y-pressed.y);
    else if(kind==='drag'&&(!pressed.actions.holdToDrag||!pressed.touch||pressed.held))pressed.actions.drag?.(x,y);
    else if(kind==='tap'&&(pressed.object as Phaser.GameObjects.Rectangle).getBounds().contains(x,y))pressed.actions.tap();
    else if(kind==='none'&&pressed.held&&pressed.actions.holdToDrag)pressed.actions.detail?.();
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
  /** A cached continuous material gradient avoids Graphics' triangulated rounded fills. */
  material(b:Box,top:number,bottom:number,radius=6):Phaser.GameObjects.Image {
    const rx=Math.min(24,radius*256/b.width),ry=Math.min(24,radius*128/b.height);
    const key=`p00-material-${top}-${bottom}-${rx.toFixed(1)}-${ry.toFixed(1)}`;
    if(!this.scene.textures.exists(key)){
      const texture=this.scene.textures.createCanvas(key,256,128)!;const c=texture.getContext();
      c.beginPath();c.moveTo(rx,0);c.lineTo(256-rx,0);c.quadraticCurveTo(256,0,256,ry);c.lineTo(256,128-ry);c.quadraticCurveTo(256,128,256-rx,128);c.lineTo(rx,128);c.quadraticCurveTo(0,128,0,128-ry);c.lineTo(0,ry);c.quadraticCurveTo(0,0,rx,0);c.closePath();c.clip();
      const hex=(color:number)=>`#${color.toString(16).padStart(6,'0')}`,gradient=c.createLinearGradient(0,0,0,128);
      gradient.addColorStop(0,hex(top));gradient.addColorStop(1,hex(bottom));c.fillStyle=gradient;c.fillRect(0,0,256,128);
      c.fillStyle='rgba(255,245,216,.18)';c.fillRect(rx,1,256-rx*2,1);texture.refresh();
    }
    return this.add(this.scene.add.image(b.x,b.y,key).setOrigin(0).setDisplaySize(b.width,b.height));
  }
  paperBackground():void {
    const {width,height}=this.layout;
    this.material({x:0,y:0,width,height},0x254f52,0x0d252e,0);
    if(this.scene.textures.exists('p03-stage')){
      const backdrop=this.add(this.scene.add.image(width/2,height/2,'p03-stage'));
      backdrop.setScale(Math.max(width/backdrop.width,height/backdrop.height)).setAlpha(.2);
    }
    if(this.scene.textures.exists('p00-paper'))this.add(this.scene.add.tileSprite(0,0,width,height,'p00-paper').setOrigin(0).setAlpha(.035).setTint(0x79a89b));
    // Dark timber rail frames the felt; card faces carry the bright paper material.
    const rail=this.scene.add.graphics();
    rail.lineStyle(8,0x111f29,.9).strokeRoundedRect(4,4,width-8,height-8,16);
    rail.lineStyle(1,0xbda473,.6).strokeRoundedRect(7,7,width-14,height-14,12);
    rail.lineStyle(1,0x9cc7ae,.12).strokeRoundedRect(10,10,width-20,height-20,10);
    for(const [cx,cy,sx,sy] of [[19,19,1,1],[width-19,19,-1,1],[19,height-19,1,-1],[width-19,height-19,-1,-1]]){
      rail.lineStyle(1,0xc9ac78,.6).beginPath().moveTo(cx,cy+12*sy).lineTo(cx,cy).lineTo(cx+12*sx,cy).strokePath();
    }
    this.add(rail);
  }
  text(x:number,y:number,value:string,size=14,color=PAPER_CSS.ink,wrap?:number):Phaser.GameObjects.Text {
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
  button(b:Box,label:string,name:string,action:()=>void,enabled=true,primary=false):Phaser.GameObjects.Rectangle {
    const art=this.add(this.scene.add.container(b.x,b.y)),g=this.scene.add.graphics(),radius=Math.min(9,b.height/5);
    g.fillStyle(0x061b24,.65).fillRoundedRect(0,4,b.width,b.height,radius);
    g.fillStyle(primary?0x71452f:0x233b42).fillRoundedRect(0,0,b.width,b.height,radius);
    const fill=this.material({x:1,y:1,width:b.width-2,height:b.height-5},primary?0xc9694a:0x37646b,primary?0x983d32:0x213f49,radius-1),edge=this.scene.add.graphics();
    edge.lineStyle(1,primary?0xf0c18a:0x8aa59f,.85).strokeRoundedRect(.5,.5,b.width-1,b.height-3,radius);
    edge.lineStyle(1,primary?0xefa87a:0x87b2aa,.45).beginPath().moveTo(10,3).lineTo(b.width-10,3).strokePath();
    edge.lineStyle(1,0x09222a,.6).beginPath().moveTo(10,b.height-6).lineTo(b.width-10,b.height-6).strokePath();
    if(primary)for(const px of [10,b.width-10])edge.fillStyle(0xf0cc94,.75).fillCircle(px,b.height/2,1.5);
    const glow=this.scene.add.graphics().lineStyle(2,0xffedb8,.8).strokeRoundedRect(1,1,b.width-2,b.height-3,radius).setAlpha(0);
    art.add([g,fill,edge,glow]);
    const t=this.text(b.x+b.width/2,b.y+b.height/2-1,label,primary?22:15,'#fff4de').setOrigin(.5).setFontStyle('bold').setShadow(0,1,'#10232b',2,true,false);
    const r=this.rect(b).setFillStyle(0,0).setStrokeStyle();
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
