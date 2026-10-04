import Phaser from 'phaser';
import type {Box} from './layout';
import {subtractBoxes} from './ScoreGeometry';

const RED=0xb8473a,INK=0x26313a;
const clamp=(v:number,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
type Level=0|1|2|3;
type Point={x:number;y:number};
type Stroke={points:readonly Point[];length:number};
const stroke=(points:readonly Point[]):Stroke=>({points,length:points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-points[i].x,p.y-points[i].y),0)});

/** Keep the paper/ink stack below actual foreground objects, even after text was lifted. */
export function orderScoreBrushLayers(root:Phaser.GameObjects.Container,foreground:readonly Phaser.GameObjects.GameObject[],readouts:readonly Phaser.GameObjects.GameObject[]):void {
  const anchor=root.list.find(object=>foreground.includes(object));
  if(anchor)for(const name of ['score/fire-frame','score/board-paper','score/board-border','score/total-pedestal','score/fire']){
    const object=root.list.find(o=>o.name===name);if(object)root.moveBelow(object,anchor);
  }
  for(const text of readouts)if(text?.active)root.bringToTop(text);
}

/** The existing eight-pixel exterior gutter, in CSS world coordinates. */
export function scoreFlameFrameBands(frame:Box):{outer:Box;depth:number;bands:Box[]}|undefined {
  if(![frame.x,frame.y,frame.width,frame.height].every(Number.isFinite)||frame.width<=0||frame.height<=0)return;
  const outset=clamp(Math.min(frame.x,frame.y),0,8);
  const outer={x:frame.x-outset,y:frame.y-outset,width:frame.width+outset*2,height:frame.height+outset*2};
  const depth=Math.min(8,outset+4,outer.width/2,outer.height/2);
  return {outer,depth,bands:[
    {x:outer.x,y:outer.y,width:outer.width,height:depth},
    {x:outer.x+outer.width-depth,y:outer.y,width:depth,height:outer.height},
    {x:outer.x,y:outer.y+outer.height-depth,width:outer.width,height:depth},
    {x:outer.x,y:outer.y,width:depth,height:outer.height},
  ]};
}

/** Fixed cinnabar paths: local hits, then corners / half frame / double frame. */
export class ScoreFlame {
  readonly graphic:Phaser.GameObjects.Graphics;
  private readonly frameGraphic:Phaser.GameObjects.Graphics;
  private readonly safetyGraphic:Phaser.GameObjects.Graphics;
  private readonly safetyMask:Phaser.Display.Masks.GeometryMask;
  private readonly frameBands?:ReturnType<typeof scoreFlameFrameBands>;
  private readonly localBands:Box[];
  private readonly paths:Stroke[][]=[[],[],[],[]];
  private readonly inner:Stroke[]=[];
  private readonly hitIds=new Set<string>();
  private readonly entered=new Set<Level>();
  private level:Level=0;
  private reduced=false;
  private destroyed=false;
  private updating=false;
  private frameAge=900;
  private hitAge=320;
  private hitStrength=.5;
  private lastWall?:number;

  constructor(private readonly scene:Phaser.Scene,root:Phaser.GameObjects.Container,private readonly box:Box,frameBox?:Box){
    const d=Math.min(10,box.width/2,box.height/2);
    this.localBands=[{x:box.x,y:box.y,width:box.width,height:d},{x:box.x,y:box.y+box.height-d,width:box.width,height:d},
      {x:box.x,y:box.y,width:d,height:box.height},{x:box.x+box.width-d,y:box.y,width:d,height:box.height}];
    this.frameBands=frameBox?scoreFlameFrameBands(frameBox):undefined;
    const outer=this.frameBands?.outer;
    if(outer){
      for(const tier of [1,2,3] as const){
        const inset=3.5,x=outer.x+inset,y=outer.y+inset,w=outer.width-2*inset,h=outer.height-2*inset;
        const horizontal=tier===1?Math.min(56,w/4):w*(tier===2?.25:.5),vertical=tier===1?Math.min(48,h/4):h*(tier===2?.25:.5);
        for(const [sx,sy] of [[1,1],[-1,1],[-1,-1],[1,-1]]){
          const cx=sx===1?x:x+w,cy=sy===1?y:y+h;
          // Fixed offsets give the brush a human edge, without random geometry.
          this.paths[tier].push(stroke([{x:cx,y:cy+sy*vertical},{x:cx+.25*sx,y:cy+sy*9},{x:cx+.5*sx,y:cy+sy*.6},
            {x:cx+sx*9,y:cy+sy*.25},{x:cx+sx*horizontal,y:cy}]));
        }
      }
      const inset=7,x=outer.x+inset,y=outer.y+inset,w=outer.width-inset*2,h=outer.height-inset*2;
      this.inner.push(stroke([{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h},{x,y}]));
    }
    this.frameGraphic=scene.add.graphics().setName('score/fire-frame').setVisible(false);
    this.graphic=scene.add.graphics().setName('score/fire').setVisible(false).setData('intensity',0);
    root.add([this.frameGraphic,this.graphic]);
    // Exterior strokes stay behind the score/card planes. GameScene places only
    // the local hit above the opaque score pedestal and below measured text.
    const paper=root.list?.find(object=>object.name==='score/board-paper'),base=root.list?.find(object=>object.name==='score/total-pedestal');
    if(paper)root.moveBelow(this.frameGraphic,paper);
    if(base)root.moveAbove(this.graphic,base);
    this.safetyGraphic=scene.add.graphics().setName('score/fire-safe-area').setVisible(false);
    this.safetyMask=this.safetyGraphic.createGeometryMask();
    this.graphic.setMask(this.safetyMask);this.frameGraphic.setMask(this.safetyMask);
    this.setGuards([]);this.draw();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);
    scene.events.once(Phaser.Scenes.Events.DESTROY,this.destroy,this);
  }

  set(level:Level,reduced=false):void {
    if(this.destroyed||level===this.level&&reduced===this.reduced)return;
    const previous=this.level,first=level>previous&&!this.entered.has(level);
    for(let tier=1;tier<=level;tier++)this.entered.add(tier as Level);
    this.level=level;this.reduced=reduced;
    this.frameAge=first&&!reduced?0:900;
    if(level<previous||reduced)this.hitAge=320;
    this.graphic.setData('intensity',level);
    this.syncUpdate();this.draw();
  }

  /** Consume before reduced-motion handling: settings changes cannot replay an old hit. */
  impact(eventId:string,strength=.5):void {
    if(this.destroyed||this.hitIds.has(eventId)||this.hitIds.size>=512)return;
    this.hitIds.add(eventId);this.hitStrength=Number.isFinite(strength)?clamp(strength):.5;
    this.graphic.setData('lastImpact',eventId).setData('impactCount',this.hitIds.size);
    this.hitAge=this.reduced?320:0;
    this.syncUpdate();this.draw();
  }

  /** Only perimeter bands may paint, minus actual text, card and control guards. */
  setGuards(guards:readonly Box[]):void {
    if(this.destroyed)return;
    const valid=guards.filter(b=>[b.x,b.y,b.width,b.height].every(Number.isFinite)&&b.width>0&&b.height>0);
    const pieces=[...this.localBands,...(this.frameBands?.bands??[])].flatMap(b=>subtractBoxes(b,valid));
    this.safetyGraphic.clear().fillStyle(0xffffff);
    for(const b of pieces)this.safetyGraphic.fillRect(b.x,b.y,b.width,b.height);
    this.graphic.setData('safePieces',pieces).setData('textGuards',valid).setData('frameBands',this.frameBands?.bands??[]).setData('localBands',this.localBands);
  }

  private syncUpdate():void {
    const active=!this.reduced&&(this.hitAge<320||this.level>0&&!!this.frameBands&&this.frameAge<900);
    if(active&&!this.updating){this.scene.events.on(Phaser.Scenes.Events.UPDATE,this.update,this);this.lastWall=this.scene.sys?.game?.loop.now;}
    else if(!active&&this.updating)this.scene.events.off(Phaser.Scenes.Events.UPDATE,this.update,this);
    this.updating=active;
  }
  private update(time:number,delta:number):void {
    if(this.destroyed)return;
    const elapsed=Number.isFinite(time)&&this.lastWall!==undefined&&time>this.lastWall?time-this.lastWall:Number.isFinite(delta)?Math.max(0,delta):0;
    if(Number.isFinite(time))this.lastWall=time;
    this.hitAge=Math.min(320,this.hitAge+elapsed);this.frameAge=Math.min(900,this.frameAge+elapsed);
    this.syncUpdate();this.draw();
  }

  private paint(g:Phaser.GameObjects.Graphics,path:Stroke,progress:number,width:number,color:number,alpha:number):void {
    if(progress<=0||alpha<=0)return;
    let remaining=path.length*clamp(progress);const points=path.points;
    g.lineStyle(width,color,alpha).beginPath().moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length&&remaining>0;i++){
      const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y),t=Math.min(1,remaining/length);
      g.lineTo(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);remaining-=length;
    }
    g.strokePath();
  }
  private draw():void {
    const peak=[0,64,80,96][this.level],settleWidth=[3.5,3.5,4.5,5.5][this.level];
    const shock=this.frameAge<peak?this.frameAge/Math.max(1,peak):Math.max(0,1-(this.frameAge-peak)/180);
    const width=settleWidth+(7.5-settleWidth)*shock;
    const writing=this.frameAge<peak,progress=writing?clamp(this.frameAge/peak):1;
    const base=[0,.56,.66,.76][this.level],frameAlpha=this.frameAge<900?base+(1-base)*(writing?progress:1-clamp((this.frameAge-peak)/(900-peak))):base;
    this.frameGraphic.clear().setVisible(this.level>0);
    for(const path of this.paths[this.level]){
      this.paint(this.frameGraphic,path,progress,width,RED,frameAlpha);
      this.paint(this.frameGraphic,path,progress,.7,INK,frameAlpha*.28);
    }
    if(this.level===3)for(const path of this.inner)this.paint(this.frameGraphic,path,progress,1,RED,frameAlpha*.82);
    const staticHit=this.reduced&&this.hitIds.size>0||!this.frameBands&&this.level>0,hitVisible=staticHit||this.hitAge<320;
    const phase=staticHit?'static':this.hitAge<36?'gather':this.hitAge<90?'unfold':this.hitAge<320?'fade':'idle';
    const spread=staticHit?1:this.hitAge<36?.66:this.hitAge<90?.66+.6*(1-(1-(this.hitAge-36)/54)**3):1.26;
    const alpha=staticHit?.78:this.hitAge<=90?1:1-(this.hitAge-90)/230;
    this.graphic.clear().setVisible(hitVisible);
    if(hitVisible){
      const reach=(.8+this.hitStrength*.2)*spread,horizontal=Math.min(this.box.width*.42,this.box.height<90?68:104)*reach,vertical=Math.min(32,this.box.height*.38)*reach;
      const y=this.box.y+this.box.height-3.2,localStrokes=[];
      for(const side of [1,-1]){
        const x=side===1?this.box.x+3.2:this.box.x+this.box.width-3.2;
        const path=stroke([{x,y:y-vertical},{x:x+.25*side,y:y-.5},{x:x+horizontal*side,y}]);
        localStrokes.push(path.points);this.paint(this.graphic,path,1,staticHit?4.5:6.5,RED,alpha);
      }
      this.graphic.setData('localStrokes',localStrokes);
    }
    this.graphic.setData('strokeState',{level:this.level,reduced:this.reduced,localPhase:phase,localAge:this.hitAge,localAlpha:hitVisible?alpha:0,
      localLineWidth:staticHit?4.5:6.5,framePhase:this.level===0?'idle':this.frameAge>=900?'static':writing?'write':'fade',frameAge:this.frameAge,frameProgress:progress,frameAlpha,lineWidth:width,entered:[...this.entered],updating:this.updating});
  }

  destroy():void {
    if(this.destroyed)return;this.destroyed=true;
    this.scene.events.off(Phaser.Scenes.Events.UPDATE,this.update,this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);
    this.scene.events.off(Phaser.Scenes.Events.DESTROY,this.destroy,this);
    this.graphic.clear().destroy();this.frameGraphic.clear().destroy();
    this.safetyMask.destroy();this.safetyGraphic.clear().destroy();this.hitIds.clear();this.entered.clear();this.updating=false;
  }
}
