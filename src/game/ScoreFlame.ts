import Phaser from 'phaser';
import type {Box} from './layout';

type Point={x:number;y:number};
const points=(count:number):Point[]=>Array.from({length:count},()=>({x:0,y:0}));
// Broad, uneven lobes rise beside the numbers and between the three score columns.
const LOBES=[
  [.018,.95,.72],[.087,.54,-.40],[.270,.50,.60],[.335,.79,-.67],
  [.440,.25,.45],[.560,.28,-.32],[.655,.83,.63],[.735,.47,-.55],
  [.912,.58,.36],[.982,.98,-.75],
] as const;
const WAVE_ANCHORS=[.04,.325,.665,.96] as const;
const EMBER_ANCHORS=[.025,.325,.665,.975] as const;
const FLAME_COLORS=[
  ['rgba(196,45,22,0)','rgba(220,67,24,.30)','rgba(249,104,31,.70)','rgba(255,168,65,.90)'],
  ['rgba(235,74,20,0)','rgba(251,109,31,.24)','rgba(255,171,63,.82)','rgba(255,224,149,.96)'],
  ['rgba(255,177,68,0)','rgba(255,184,69,.20)','rgba(255,221,139,.78)','rgba(255,245,203,.97)'],
] as const;
let flameId=0;

/** Original bounded 2D flame. Decorative time never touches rule RNG or saved scores. */
export class ScoreFlame {
  readonly graphic:Phaser.GameObjects.Graphics;
  private readonly glow?:Phaser.GameObjects.Image;
  private readonly material?:Phaser.Textures.CanvasTexture;
  private readonly lights:CanvasGradient[]=[];
  private readonly glowKey:string;
  private readonly tonguePoints=points(26);
  private readonly ribbonPoints=points(35);
  private readonly wavePoints=points(12);
  private level:0|1|2|3=0;
  private elapsed=0;
  private redrawAfter=0;
  private surge=0;
  private reduced=false;
  private destroyed=false;

  constructor(private readonly scene:Phaser.Scene,root:Phaser.GameObjects.Container,private readonly box:Box){
    this.glowKey='score-flame-light-'+flameId++;
    const texture=scene.textures.createCanvas(this.glowKey,Math.min(512,Math.max(16,Math.ceil(box.width))),Math.min(96,Math.max(16,Math.ceil(box.height))));
    if(texture){
      this.material=texture;
      const ctx=texture.context,w=texture.width,h=texture.height;
      const base=ctx.createLinearGradient(0,h*.45,0,h);
      base.addColorStop(0,'rgba(195,57,17,0)');base.addColorStop(.58,'rgba(224,77,22,.12)');base.addColorStop(1,'rgba(255,173,60,.72)');
      this.lights.push(base);
      for(const x of [0,w]){
        const light=ctx.createRadialGradient(x,h*.8,0,x,h*.8,Math.min(w*.27,h*1.7));
        light.addColorStop(0,'rgba(255,153,46,.60)');light.addColorStop(.35,'rgba(246,81,24,.25)');light.addColorStop(1,'rgba(176,40,20,0)');
        this.lights.push(light);
      }
      this.glow=scene.add.image(box.x+box.width/2,box.y+box.height/2,this.glowKey).setDisplaySize(box.width,box.height).setVisible(false);
      root.add(this.glow);
    }
    this.graphic=scene.add.graphics().setName('score/fire').setVisible(false).setData('intensity',0);
    root.add(this.graphic);
    scene.events.on(Phaser.Scenes.Events.UPDATE,this.update,this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);
    scene.events.once(Phaser.Scenes.Events.DESTROY,this.destroy,this);
  }

  set(level:0|1|2|3,reduced=false):void {
    if(this.destroyed||(level===this.level&&reduced===this.reduced))return;
    // A brief heating crest belongs to a real upward threshold crossing only.
    this.surge=!reduced&&level>this.level?Math.min(1,.65+(level-this.level)*.15):0;
    this.level=level;this.reduced=reduced;this.redrawAfter=0;
    if(!level)this.elapsed=0;
    this.graphic.setData('intensity',level).setVisible(level>0);
    this.glow?.setVisible(level>0&&!reduced);
    this.draw();
  }

  private update(_time:number,delta:number):void {
    if(this.destroyed||!this.graphic.active||!this.level||this.reduced)return;
    const dt=Math.max(0,Math.min(delta,50));
    this.elapsed+=dt*.001;this.surge=Math.max(0,this.surge-dt*.0024);
    // Bound decorative geometry work to 30Hz; the scene and score still run at their own cadence.
    this.redrawAfter+=dt;
    if(this.redrawAfter<32)return;
    this.redrawAfter%=32;this.draw();
  }

  private draw():void {
    const g=this.graphic;g.clear();if(!this.level)return;
    const b=this.box,base=b.y+b.height-2,heat=.62+this.level*.13;
    g.lineStyle(3,0xe35d28,.10+this.level*.025).strokeRoundedRect(b.x+2,b.y+2,b.width-4,b.height-4,6);
    g.lineStyle(1.2,0xffbb63,.48+this.level*.09+this.surge*.16).strokeRoundedRect(b.x+1.5,b.y+1.5,b.width-3,b.height-3,6);
    if(this.reduced)return;
    this.glow?.setAlpha(.82+this.level*.035+this.surge*.06+Math.sin(this.elapsed*2.3)*.02);
    const height=Math.min(66,b.height*.88)*(heat+this.surge*.15);
    const width=Math.min(46,b.width*.057);
    this.drawMaterial(base,height,width);
    this.drawRibbon(base,Math.min(13,b.height*.18)*(heat+this.surge*.18),0xa92e21,.31);
    this.drawHeatWaves(base,height);
    this.drawRibbon(base,Math.min(7,b.height*.10)*(heat+this.surge*.2),0xffab49,.59);
    this.drawRibbon(base,Math.min(3.2,b.height*.05),0xffe1a0,.81);
    this.drawEmbers(base,height);
    // The crest brightens the existing edge for <0.5s; no screen flash or extra emitter.
    if(this.surge>0)g.lineStyle(1.6,0xffe7b0,this.surge*.55).beginPath().moveTo(b.x+7,base).lineTo(b.x+b.width-7,base).strokePath();
  }

  private drawMaterial(base:number,height:number,width:number):void {
    const texture=this.material;if(!texture)return;
    const ctx=texture.context,b=this.box;
    ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,texture.width,texture.height);
    ctx.globalAlpha=.56+this.level*.09+this.surge*.16;
    for(const light of this.lights){ctx.fillStyle=light;ctx.fillRect(0,0,texture.width,texture.height);}
    ctx.globalCompositeOperation='lighter';
    ctx.setTransform(texture.width/b.width,0,0,texture.height/b.height,-b.x*texture.width/b.width,-b.y*texture.height/b.height);
    for(let i=0;i<LOBES.length;i++){
      const [position,size,lean]=LOBES[i],phase=this.elapsed*(2.1+(i%3)*.22)+i*2.17;
      const x=b.x+b.width*position,h=height*size*(.88+.10*Math.sin(phase)+.07*Math.sin(phase*.57));
      const w=width*(.72+.17*Math.sin(phase*.73+i)),bend=w*(lean+Math.sin(phase*.82)*.38);
      // Gradients dissolve the curling tips; the hotter, shorter folds leave the digits calm.
      this.paintTongue(ctx,x,base,w*1.2,h,bend,0,.70);
      this.paintTongue(ctx,x-w*.10,base,w*.72,h*.83,bend*.82,1,.74+this.surge*.10);
      this.paintTongue(ctx,x+w*.07,base,w*.35,h*.48,bend*.44,2,.82);
    }
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.setTransform(1,0,0,1,0,0);texture.refresh();
  }

  private paintTongue(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,bend:number,layer:number,alpha:number):void {
    const p=this.tongue(x,y,w,h,bend),colors=FLAME_COLORS[layer],fill=ctx.createLinearGradient(0,y-h,0,y);
    fill.addColorStop(0,colors[0]);fill.addColorStop(.25,colors[1]);fill.addColorStop(.70,colors[2]);fill.addColorStop(1,colors[3]);
    ctx.globalAlpha=alpha;ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);
    for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);
    ctx.closePath();ctx.fill();
  }

  private drawRibbon(base:number,height:number,color:number,alpha:number):void {
    const b=this.box,p=this.ribbonPoints;
    for(let i=0;i<33;i++){
      const t=i/32;
      p[i].x=b.x+2+t*(b.width-4);
      p[i].y=base-height*(.78+.16*Math.sin(t*19-this.elapsed*3.1)+.09*Math.sin(t*37+this.elapsed*2.4));
    }
    p[33].x=b.x+b.width-2;p[33].y=base;p[34].x=b.x+2;p[34].y=base;
    this.graphic.fillStyle(color,alpha).fillPoints(p,true);
  }

  /** Reuse sampled S-curves; clamp every vertex to this score tile without a mask. */
  private tongue(x:number,y:number,w:number,h:number,bend:number):Point[] {
    this.curve(0,x-w,y,x-w*.94,y-h*.25,x+bend+w*.70,y-h*.65,x+bend,y-h);
    this.curve(13,x+bend,y-h,x+bend+w*.62,y-h*.83,x-w*.16,y-h*.35,x+w,y);
    return this.tonguePoints;
  }

  private curve(offset:number,ax:number,ay:number,bx:number,by:number,cx:number,cy:number,dx:number,dy:number):void {
    const b=this.box;
    for(let i=0;i<=12;i++){
      const t=i/12,u=1-t,p=this.tonguePoints[offset+i];
      p.x=Math.max(b.x+2,Math.min(b.x+b.width-2,u*u*u*ax+3*u*u*t*bx+3*u*t*t*cx+t*t*t*dx));
      p.y=Math.max(b.y+2,Math.min(b.y+b.height-2,u*u*u*ay+3*u*u*t*by+3*u*t*t*cy+t*t*t*dy));
    }
  }

  private drawHeatWaves(base:number,height:number):void {
    const b=this.box,p=this.wavePoints;
    for(let i=0;i<4;i++){
      const x=b.x+b.width*WAVE_ANCHORS[i],cycle=(this.elapsed*.22+i*.27)%1;
      const drift=Math.sin(cycle*Math.PI),rise=height*(.32+cycle*.64),span=Math.min(14,b.width*.026);
      for(let j=0;j<p.length;j++){
        const t=j/(p.length-1);
        p[j].x=Math.max(b.x+3,Math.min(b.x+b.width-3,x+Math.sin(t*Math.PI*1.7+this.elapsed*1.1+i)*span*drift));
        p[j].y=Math.max(b.y+3,base-rise+t*height*.28);
      }
      this.graphic.lineStyle(.9,0xf8bb78,.10*drift).strokePoints(p,false);
    }
  }

  private drawEmbers(base:number,height:number):void {
    const b=this.box,g=this.graphic,count=6+this.level*4;
    for(let i=0;i<count;i++){
      const cycle=(this.elapsed*(.34+(i%4)*.037)+i*.618)%1,alpha=Math.sin(cycle*Math.PI)*(.45+this.level*.10);
      const anchor=EMBER_ANCHORS[i%4],drift=Math.sin(cycle*5.3+i*2.4)*Math.min(12,b.width*.024);
      const x=Math.max(b.x+4,Math.min(b.x+b.width-4,b.x+b.width*anchor+drift));
      const y=Math.max(b.y+4,base-3-cycle*height*(.75+(i%3)*.09)),radius=.65+(i%3)*.26;
      g.lineStyle(.75,0xfaa849,alpha*.30).beginPath().moveTo(x,y+Math.min(5,cycle*7)).lineTo(x,y).strokePath();
      g.fillStyle(0xffab49,alpha*.14).fillCircle(x,y,radius*2.3);
      g.fillStyle(i%3===0?0xffefba:0xffca6a,alpha).fillCircle(x,y,radius);
    }
  }

  destroy():void {
    if(this.destroyed)return;this.destroyed=true;
    this.scene.events.off(Phaser.Scenes.Events.UPDATE,this.update,this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);
    this.scene.events.off(Phaser.Scenes.Events.DESTROY,this.destroy,this);
    this.glow?.destroy();this.graphic.destroy();
    if(this.scene.textures.exists(this.glowKey))this.scene.textures.remove(this.glowKey);
  }
}
