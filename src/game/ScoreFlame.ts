import Phaser from 'phaser';
import type {Box} from './layout';

const NOISE_SIZE=64,NOISE_MASK=NOISE_SIZE-1,FRAME_MS=50;
const LARGE_ANCHORS=[.026,1/3,2/3,.974] as const;
const SMALL_ANCHORS=[.035,.965] as const;
const COLORS=[
  [0,58,68,75,0],[.12,84,88,91,8],[.23,134,46,28,30],
  [.38,231,70,20,112],[.57,255,142,36,186],
  [.78,255,212,100,222],[1,255,248,188,244],
] as const;
const clamp=(value:number,minimum=0,maximum=1)=>Math.max(minimum,Math.min(maximum,value));
let flameId=0;

/** Cached, bounded 2D heat advection. Its cosmetic noise never accesses rule RNG. */
export class ScoreFlame {
  readonly graphic:Phaser.GameObjects.Graphics;
  private readonly flame?:Phaser.GameObjects.Image;
  private readonly material?:Phaser.Textures.CanvasTexture;
  private readonly textureKey:string;
  private readonly noise=new Float32Array(NOISE_SIZE*NOISE_SIZE);
  private readonly palette=new Uint8ClampedArray(256*4);
  private heat=new Float32Array(0);
  private nextHeat=new Float32Array(0);
  private smallFuel=new Float32Array(0);
  private largeFuel=new Float32Array(0);
  private smallMask=new Float32Array(0);
  private largeMask=new Float32Array(0);
  private pixels?:ImageData;
  private width=0;
  private height=0;
  private level:0|1|2=0;
  private elapsed=0;
  private redrawAfter=0;
  private step=0;
  private surge=0;
  private reduced=false;
  private destroyed=false;

  constructor(private readonly scene:Phaser.Scene,root:Phaser.GameObjects.Container,private readonly box:Box){
    this.textureKey='score-flame-heat-'+flameId++;
    this.cacheNoiseAndPalette();
    const w=Math.min(224,Math.max(64,Math.ceil(box.width*.5))),h=Math.min(72,Math.max(32,Math.ceil(box.height)));
    const texture=scene.textures.createCanvas(this.textureKey,w,h);
    if(texture){
      this.material=texture;this.width=w;this.height=h;
      this.heat=new Float32Array(w*h);this.nextHeat=new Float32Array(w*h);
      this.smallFuel=new Float32Array(w);this.largeFuel=new Float32Array(w);
      this.smallMask=new Float32Array(w*h);this.largeMask=new Float32Array(w*h);
      this.pixels=texture.context.createImageData(w,h);
      this.cacheFuelAndMasks();
      texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      this.flame=scene.add.image(box.x+box.width/2,box.y+box.height/2,this.textureKey)
        .setName('score/fire-heat').setDisplaySize(box.width,box.height).setVisible(false);
      root.add(this.flame);
    }
    this.graphic=scene.add.graphics().setName('score/fire').setVisible(false).setData('intensity',0);
    root.add(this.graphic);
    scene.events.on(Phaser.Scenes.Events.UPDATE,this.update,this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);
    scene.events.once(Phaser.Scenes.Events.DESTROY,this.destroy,this);
  }

  set(level:0|1|2|3,reduced=false):void {
    const next=level===3?2:level;
    if(this.destroyed||(next===this.level&&reduced===this.reduced))return;
    const previous=this.level;
    this.surge=!reduced&&next>previous ? (next===2 ? .42 : .10) : 0;
    this.level=next;this.reduced=reduced;this.redrawAfter=0;
    this.graphic.setData('intensity',next).setVisible(next>0);
    this.flame?.setVisible(next>0&&!reduced);
    if(!next){this.elapsed=0;this.step=0;this.heat.fill(0);this.nextHeat.fill(0);}
    else if(!reduced){
      // A bounded warm-up produces a continuous plume immediately, not a flash.
      if(next!==previous){this.heat.fill(0);this.nextHeat.fill(0);}
      for(let i=0;i<(next===2?24:12);i++)this.advanceHeat();
    }
    this.draw();
  }

  private update(_time:number,delta:number):void {
    if(this.destroyed||!this.graphic.active||!this.level||this.reduced)return;
    const dt=clamp(delta,0,50);
    this.elapsed+=dt*.001;this.surge=Math.max(0,this.surge-dt*.0015);
    this.redrawAfter+=dt;
    if(this.redrawAfter<FRAME_MS)return;
    this.redrawAfter%=FRAME_MS;
    this.advanceHeat();this.draw();
  }

  private cacheNoiseAndPalette():void {
    let seed=0x48a3c19d;
    for(let i=0;i<this.noise.length;i++){
      seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
      this.noise[i]=(seed>>>0)/4294967296;
    }
    let stop=0;
    for(let i=0;i<256;i++){
      const temperature=i/255;
      while(stop<COLORS.length-2&&temperature>COLORS[stop+1][0])stop++;
      const a=COLORS[stop],b=COLORS[stop+1],mix=(temperature-a[0])/(b[0]-a[0]);
      for(let channel=0;channel<4;channel++)this.palette[i*4+channel]=a[channel+1]+(b[channel+1]-a[channel+1])*mix;
    }
  }

  private cacheFuelAndMasks():void {
    const w=this.width,h=this.height;
    for(let x=0;x<w;x++){
      const u=x/(w-1);
      const smallDistance=Math.min(...SMALL_ANCHORS.map(anchor=>Math.abs(u-anchor)));
      const largeDistance=Math.min(...LARGE_ANCHORS.map(anchor=>Math.abs(u-anchor)));
      this.smallFuel[x]=Math.pow(clamp(1-smallDistance/.075),2);
      this.largeFuel[x]=.27+.73*Math.pow(clamp(1-largeDistance/.092),1.4);
      const digitDistance=Math.min(Math.abs(u-1/6),Math.abs(u-.5),Math.abs(u-5/6));
      const digitClear=clamp(digitDistance/.12);
      for(let y=0;y<h;y++){
        const rise=(h-1-y)/(h-1),index=y*w+x;
        // Quiet columns leave labels and all three numbers legible before bringToTop.
        const numberGuard=rise>.13&&rise<.93 ? .10+.90*digitClear*digitClear : 1;
        const edge=clamp(Math.min(x,w-1-x,y,h-1-y)/1.5);
        this.smallMask[index]=edge*numberGuard*clamp((.34-rise)/.12)*.60;
        this.largeMask[index]=edge*numberGuard*clamp((.94-rise)/.20)*.92;
      }
    }
  }

  private advanceHeat():void {
    if(!this.width||!this.level)return;
    const w=this.width,h=this.height,field=this.heat,next=this.nextHeat;
    const small=this.level===1,fuel=small?this.smallFuel:this.largeFuel,cooling=small?.105:.039;
    const frame=this.step++;
    for(let y=0;y<h-3;y++){
      const row=y*w,below=(y+2)*w,farther=(y+3)*w;
      const wind=Math.sin(y*.115-this.elapsed*1.4)*(small?.45:1.25);
      const noiseRow=((y+frame*2)&NOISE_MASK)*NOISE_SIZE;
      for(let x=0;x<w;x++){
        const noise=this.noise[noiseRow+((x+frame)&NOISE_MASK)];
        const drift=clamp(x+wind+(noise-.5)*(small?.7:2.5),0,w-1);
        const left=Math.floor(drift),right=Math.min(w-1,left+1),mix=drift-left;
        const carried=field[below+left]*(1-mix)+field[below+right]*mix;
        const diffused=(field[farther+left]+field[farther+right])*.5;
        next[row+x]=Math.max(0,carried*.70+diffused*.30-cooling*(.72+noise*.55));
      }
    }
    for(let y=h-3;y<h;y++)for(let x=0;x<w;x++){
      const noise=this.noise[((frame*3+y)&NOISE_MASK)*NOISE_SIZE+((x+frame)&NOISE_MASK)];
      next[y*w+x]=fuel[x]*(small ? .58+noise*.22 : .60+noise*.31)+this.surge*fuel[x]*.08;
    }
    this.heat=next;this.nextHeat=field;
  }

  private draw():void {
    const g=this.graphic,b=this.box;
    g.clear();if(!this.level)return;
    if(this.reduced){
      // Reduced motion is a static thin warm edge, with no heat uploads or sparks.
      g.lineStyle(1,0xeab472,this.level===1?.35:.62)
        .beginPath().moveTo(b.x+5,b.y+b.height-2).lineTo(b.x+b.width-5,b.y+b.height-2).strokePath();
      return;
    }
    this.drawMaterial();
    const base=b.y+b.height-3;
    g.lineStyle(1,0xffc46d,this.level===1?.12:.30)
      .beginPath().moveTo(b.x+5,base).lineTo(b.x+b.width-5,base).strokePath();
    this.drawEmbers(base);
  }

  private drawMaterial():void {
    const texture=this.material,pixels=this.pixels;
    if(!texture||!pixels)return;
    const data=pixels.data,mask=this.level===1?this.smallMask:this.largeMask;
    for(let i=0;i<this.heat.length;i++){
      const color=Math.round(clamp(this.heat[i])*255)*4,pixel=i*4;
      data[pixel]=this.palette[color];data[pixel+1]=this.palette[color+1];data[pixel+2]=this.palette[color+2];
      data[pixel+3]=this.palette[color+3]*mask[i];
    }
    texture.context.putImageData(pixels,0,0);texture.refresh();
  }

  private drawEmbers(base:number):void {
    const b=this.box,g=this.graphic,small=this.level===1,anchors=small?SMALL_ANCHORS:LARGE_ANCHORS;
    const height=b.height*(small?.28:.88),count=small?2:6;
    for(let i=0;i<count;i++){
      const cycle=(this.elapsed*(.23+(i%3)*.047)+i*.618)%1,life=Math.sin(cycle*Math.PI);
      const x=clamp(b.x+b.width*anchors[i%anchors.length]+Math.sin(cycle*5+i*2.2)*(small?2:6),b.x+4,b.x+b.width-4);
      const y=clamp(base-cycle*height,b.y+4,base),alpha=life*(small?.22:.62);
      const radius=small?.45:.55+(i%3)*.17;
      g.lineStyle(.6,0xfa9841,alpha*.18).beginPath().moveTo(x,y+Math.min(3,cycle*4)).lineTo(x,y).strokePath();
      g.fillStyle(0xff9b35,alpha*.10).fillCircle(x,y,radius*2.2);
      g.fillStyle(0xffdfa0,alpha).fillCircle(x,y,radius);
    }
  }

  destroy():void {
    if(this.destroyed)return;this.destroyed=true;
    this.scene.events.off(Phaser.Scenes.Events.UPDATE,this.update,this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);
    this.scene.events.off(Phaser.Scenes.Events.DESTROY,this.destroy,this);
    this.flame?.destroy();this.graphic.destroy();
    if(this.scene.textures.exists(this.textureKey))this.scene.textures.remove(this.textureKey);
    this.heat=new Float32Array(0);this.nextHeat=new Float32Array(0);
    this.smallFuel=new Float32Array(0);this.largeFuel=new Float32Array(0);
    this.smallMask=new Float32Array(0);this.largeMask=new Float32Array(0);this.pixels=undefined;
  }
}
