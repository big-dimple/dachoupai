import Phaser from 'phaser';
import type {Box} from './layout';
import {subtractBoxes} from './ScoreGeometry';
import {propagateDoomFire} from './DoomFireHeat';

const NOISE_SIZE=64,NOISE_MASK=NOISE_SIZE-1,FRAME_MS=1000/30;
const FRAME_WIDTH=256,FRAME_HEIGHT=64;
const LARGE_ANCHORS=[.18,.39,.79] as const;
const SMALL_ANCHORS=LARGE_ANCHORS;
const COLORS=[
  [0,184,71,58,0],[.28,184,71,58,244],[.46,217,119,66,247],
  [.68,232,142,72,249],[.86,255,234,192,250],[1,255,249,238,250],
] as const;
const clamp=(value:number,minimum=0,maximum=1)=>Math.max(minimum,Math.min(maximum,value));
let flameId=0;

/** D44: eight pixels of protected outer margin, including the 360px hand seats. */
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

/** Bounded procedural heat silhouettes. Cosmetic noise never accesses rule RNG. */
export class ScoreFlame {
  readonly graphic:Phaser.GameObjects.Graphics;
  private readonly flame?:Phaser.GameObjects.Image;
  private readonly material?:Phaser.Textures.CanvasTexture;
  private readonly textureKey:string;
  private readonly frameTextureKey:string;
  private readonly frameFlames:Phaser.GameObjects.Image[]=[];
  private readonly frameGraphic?:Phaser.GameObjects.Graphics;
  private readonly frameMaterial?:Phaser.Textures.CanvasTexture;
  private readonly frameBands?:ReturnType<typeof scoreFlameFrameBands>;
  private readonly noise=new Float32Array(NOISE_SIZE*NOISE_SIZE);
  private readonly palette=new Uint8ClampedArray(256*4);
  private heat=new Float32Array(0);
  private nextHeat=new Float32Array(0);
  private smallMask=new Float32Array(0);
  private largeMask=new Float32Array(0);
  private fuel=new Float32Array(0);
  private pixels?:ImageData;
  private frameHeat=new Float32Array(0);
  private nextFrameHeat=new Float32Array(0);
  private frameFuel=new Float32Array(0);
  private frameMask=new Float32Array(0);
  private framePixels?:ImageData;
  private width=0;
  private height=0;
  private level:0|1|2|3=0;
  private elapsed=0;
  private lastWall?:number;
  private redrawAfter=0;
  private step=0;
  private surge=0;
  private frameFlash=0;
  private readonly hitIds=new Set<string>();
  private reduced=false;
  private destroyed=false;
  private readonly safetyGraphic:Phaser.GameObjects.Graphics;
  private readonly safetyMask:Phaser.Display.Masks.GeometryMask;

  constructor(private readonly scene:Phaser.Scene,root:Phaser.GameObjects.Container,private readonly box:Box,private readonly frameBox?:Box){
    this.textureKey='score-flame-heat-'+flameId++;
    this.frameTextureKey=this.textureKey+'-frame';
    this.cacheNoiseAndPalette();
    const w=Math.min(224,Math.max(64,Math.ceil(box.width))),h=Math.min(72,Math.max(16,Math.ceil(box.height)));
    const texture=scene.textures.createCanvas(this.textureKey,w,h);
    if(texture){
      this.material=texture;this.width=w;this.height=h;
      this.heat=new Float32Array(w*h);this.nextHeat=new Float32Array(w*h);
      this.smallMask=new Float32Array(w*h);this.largeMask=new Float32Array(w*h);
      this.fuel=new Float32Array(w);
      this.pixels=texture.context.createImageData(w,h);
      this.cacheMasks();
      texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      this.flame=scene.add.image(box.x+box.width/2,box.y+box.height/2,this.textureKey)
        .setName('score/fire-heat').setDisplaySize(box.width,box.height).setVisible(false);
      root.add(this.flame);
    }
    this.frameBands=frameBox?scoreFlameFrameBands(frameBox):undefined;
    if(this.frameBands){
      const texture=scene.textures.createCanvas(this.frameTextureKey,FRAME_WIDTH,FRAME_HEIGHT);
      if(texture){
        this.frameMaterial=texture;
        this.frameHeat=new Float32Array(FRAME_WIDTH*FRAME_HEIGHT);this.nextFrameHeat=new Float32Array(FRAME_WIDTH*FRAME_HEIGHT);
        this.frameFuel=new Float32Array(FRAME_WIDTH);this.frameMask=new Float32Array(FRAME_WIDTH*FRAME_HEIGHT);
        this.framePixels=texture.context.createImageData(FRAME_WIDTH,FRAME_HEIGHT);
        this.cacheFrameFuelAndMask();texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
        for(const [i,band] of this.frameBands.bands.entries()){
          const vertical=i%2===1;
          const image=scene.add.image(band.x+band.width/2,band.y+band.height/2,this.frameTextureKey)
            .setName('score/fire-frame-'+['top','right','bottom','left'][i])
            .setDisplaySize(vertical?band.height:band.width,vertical?band.width:band.height)
            .setAngle(i===1?90:i===3?-90:0).setFlipX(i>=2).setVisible(false);
          // Foreground flame stays in the gutter; it has no input component.
          root.add(image);this.frameFlames.push(image);
        }
      }
      this.frameGraphic=scene.add.graphics().setName('score/fire-frame').setVisible(false);
      root.add(this.frameGraphic);
    }
    this.graphic=scene.add.graphics().setName('score/fire').setVisible(false).setData('intensity',0);
    root.add(this.graphic);
    // One CSS-world-space mask protects numbers/buttons from textures, halos AND embers.
    // Never multiply these layout coordinates by devicePixelRatio or scale.zoom.
    this.safetyGraphic=scene.add.graphics().setName('score/fire-safe-area').setVisible(false);
    this.safetyGraphic.fillStyle(0xffffff).fillRect(box.x,box.y,box.width,box.height);
    for(const band of this.frameBands?.bands??[])this.safetyGraphic.fillRect(band.x,band.y,band.width,band.height);
    this.safetyMask=this.safetyGraphic.createGeometryMask();
    for(const object of [this.graphic,this.flame,this.frameGraphic,...this.frameFlames])object?.setMask(this.safetyMask);
    scene.events.on(Phaser.Scenes.Events.UPDATE,this.update,this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);
    scene.events.once(Phaser.Scenes.Events.DESTROY,this.destroy,this);
  }

  set(level:0|1|2|3,reduced=false):void {
    const next=level;
    if(this.destroyed||(next===this.level&&reduced===this.reduced))return;
    const previous=this.level;
    this.surge=!reduced&&next>previous ? (next>=2 ? .42 : .10) : 0;
    this.frameFlash=!reduced&&next>previous&&next>=2?1:0;
    this.level=next;this.reduced=reduced;this.redrawAfter=0;this.lastWall=this.scene.sys?.game?.loop.now;
    this.graphic.setData('intensity',next).setVisible(next>0);
    this.flame?.setVisible(next>0);
    if(next<2||next!==previous){this.frameHeat.fill(0);this.nextFrameHeat.fill(0);}
    if(!next){this.elapsed=0;this.step=0;this.heat.fill(0);this.nextHeat.fill(0);this.fuel.fill(0);}
    else{
      // A bounded deterministic warm start avoids waiting for fuel to climb.
      if(reduced||!previous){this.heat.fill(0);this.nextHeat.fill(0);this.step=0;}
      for(let i=0;i<Math.min(96,this.height*2);i++)this.advanceHeat();
      if(this.frameFlash)for(let i=0;i<24;i++)this.advanceFrameHeat();
    }
    this.draw();
  }

  /** One positive source landing, owned by this presentation; never a tier change. */
  impact(eventId:string,strength=.5):void {
    if(this.destroyed||!this.level||this.reduced||this.hitIds.has(eventId)||this.hitIds.size>=512)return;
    this.hitIds.add(eventId);
    this.surge=Math.max(this.surge,.12+.12*clamp(strength));
    this.graphic.setData('lastImpact',eventId).setData('impactCount',this.hitIds.size);
    this.advanceHeat();this.draw();
  }

  private update(_time:number,delta:number):void {
    if(this.destroyed||!this.graphic.active||!this.level||this.reduced)return;
    const lifetime=Number.isFinite(_time)&&this.lastWall!==undefined&&_time>this.lastWall?_time-this.lastWall:Number.isFinite(delta)?Math.max(0,delta):0,dt=clamp(delta,0,50);
    if(Number.isFinite(_time))this.lastWall=_time;
    const previousFlash=this.frameFlash;
    this.elapsed+=dt*.001;this.surge=Math.max(0,this.surge-lifetime*.0012);this.frameFlash=Math.max(0,this.frameFlash-lifetime/260);
    if(previousFlash>0&&!this.frameFlash)this.drawFrame();
    this.redrawAfter+=dt;
    if(this.redrawAfter<FRAME_MS)return;
    this.redrawAfter%=FRAME_MS;
    this.advanceHeat();if(this.frameFlash>0)this.advanceFrameHeat();this.draw();
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

  private cacheMasks():void {
    const w=this.width,h=this.height;
    for(let x=0;x<w;x++){
      for(let y=0;y<h;y++){
        const index=y*w+x;
        // Text protection is geometric. Preserve the full allocated silhouette.
        const edge=clamp(Math.min(x,w-1-x,y,h-1-y)/1.5);
        this.smallMask[index]=edge*.90;
        this.largeMask[index]=edge;
      }
    }
  }

  /** Subtract actual text/button rectangles from every owned fire layer. */
  setGuards(guards:readonly Box[]):void {
    if(this.destroyed)return;
    const pieces=[this.box,...(this.frameBands?.bands??[])].flatMap(b=>subtractBoxes(b,guards));
    this.safetyGraphic.clear().fillStyle(0xffffff);
    for(const b of pieces)this.safetyGraphic.fillRect(b.x,b.y,b.width,b.height);
    this.graphic.setData('safePieces',pieces).setData('textGuards',guards);
  }

  private advanceHeat():void {
    if(!this.width||!this.level)return;
    const w=this.width,h=this.height,small=this.level===1,t=this.reduced?0:this.elapsed;
    for(let x=0;x<w;x++){
      const u=x/(w-1),wave=(1+Math.sin(u*21+Math.sin(u*13)*1.7+t*.9))/2;
      // Low fire stays a visible connected root with sparse hotter fuel patches.
      // Large/extreme broaden and strengthen real heat, never a fixed silhouette.
      this.fuel[x]=clamp((small?.09+.61*Math.pow(wave,8):this.level===2?.48+.51*wave:.58+.42*wave)+this.surge*.14);
    }
    propagateDoomFire(this.heat,this.nextHeat,w,h,this.noise,this.step,small?.10:this.level===2?.30:.20,this.fuel,small?1.3:this.level===2?1.10:.92,.65);
    const previous=this.heat;this.heat=this.nextHeat;this.nextHeat=previous;this.step++;
  }

  private cacheFrameFuelAndMask():void {
    for(let x=0;x<FRAME_WIDTH;x++){
      const u=x/(FRAME_WIDTH-1);
      this.frameFuel[x]=.69+.18*Math.sin(u*37+Math.sin(u*13)*1.8)+.11*Math.sin(u*79+.6);
      for(let y=0;y<FRAME_HEIGHT;y++){
        const rise=(FRAME_HEIGHT-1-y)/(FRAME_HEIGHT-1),edge=clamp(Math.min(x,FRAME_WIDTH-1-x,y,FRAME_HEIGHT-1-y)/2);
        this.frameMask[y*FRAME_WIDTH+x]=edge*clamp((1-rise)/.30);
      }
    }
  }

  private advanceFrameHeat():void {
    if(!this.frameHeat.length)return;
    const w=FRAME_WIDTH,h=FRAME_HEIGHT,field=this.frameHeat,next=this.nextFrameHeat,frame=this.step;
    for(let y=0;y<h-3;y++){
      const below=(y+2)*w,farther=(y+3)*w,wind=Math.sin(y*.17-this.elapsed*2.4)*2.2;
      const noiseRow=((y+frame*2)&NOISE_MASK)*NOISE_SIZE;
      for(let x=0;x<w;x++){
        const noise=this.noise[noiseRow+((x+frame)&NOISE_MASK)],drift=clamp(x+wind+(noise-.5)*3,0,w-1);
        const left=Math.floor(drift),right=Math.min(w-1,left+1),mix=drift-left;
        const carried=field[below+left]*(1-mix)+field[below+right]*mix;
        next[y*w+x]=Math.max(0,carried*.72+(field[farther+left]+field[farther+right])*.14-(this.level===3?.014:.019)*(.72+noise*.55));
      }
    }
    for(let y=h-3;y<h;y++)for(let x=0;x<w;x++){
      const noise=this.noise[((frame*3+y)&NOISE_MASK)*NOISE_SIZE+((x+frame)&NOISE_MASK)];
      // The fuel scroll makes both side strips climb, rather than pulse in place.
      const fuel=this.frameFuel[(x+Math.floor(frame*.7))%w];
      next[y*w+x]=fuel*(.75+noise*.25)+this.surge*.04;
    }
    this.frameHeat=next;this.nextFrameHeat=field;
  }

  private draw():void {
    const g=this.graphic,b=this.box;
    this.drawFrame();
    g.clear();if(!this.level)return;
    this.drawMaterial();
    if(this.reduced)return;
    const base=b.y+b.height-3;
    this.drawEmbers(base);
  }

  private drawMaterial():void {
    const texture=this.material,pixels=this.pixels;
    if(!texture||!pixels)return;
    this.uploadHeat(texture,pixels,this.heat,this.level===1?this.smallMask:this.largeMask);
  }

  private uploadHeat(texture:Phaser.Textures.CanvasTexture,pixels:ImageData,heat:Float32Array,mask:Float32Array):void {
    const data=pixels.data;
    for(let i=0;i<heat.length;i++){
      const temperature=clamp(heat[i]),alphaColor=Math.round(temperature*255)*4,pixel=i*4,local=texture===this.material;
      const rise=local?(this.height-1-Math.floor(i/this.width))/(this.height-1):1;
      // P08 has a red root, not Doom's opaque white fuel floor. Thermal alpha
      // remains unchanged, so cold regions cannot become a painted rectangle.
      const color=Math.round((local&&rise<.18?.28:temperature)*255)*4;
      data[pixel]=this.palette[color];data[pixel+1]=this.palette[color+1];data[pixel+2]=this.palette[color+2];
      // Heat itself controls transparency; no polygon/tongue coverage can crop it.
      data[pixel+3]=this.palette[alphaColor+3]*mask[i]*(local?clamp(temperature*10):1);
    }
    texture.context.putImageData(pixels,0,0);texture.refresh();
  }

  private drawFrame():void {
    const g=this.frameGraphic,b=this.frameBox;
    const visible=this.level>=2&&!this.reduced&&this.frameFlash>0;
    for(const image of this.frameFlames)image.setVisible(visible).setAlpha(this.frameFlash*.12);
    g?.clear();g?.setVisible(visible);if(!g||!b||!visible)return;
    this.graphic.setData('frameFlash',this.frameFlash);
    g.lineStyle(2,0xf47e2b,this.frameFlash*.08).strokeRect(b.x,b.y,b.width,b.height);
    g.lineStyle(1,0xffba59,this.frameFlash*.18).strokeRect(b.x,b.y,b.width,b.height);
    if(this.frameMaterial&&this.framePixels)this.uploadHeat(this.frameMaterial,this.framePixels,this.frameHeat,this.frameMask);
    const outer=this.frameBands!.outer,depth=this.frameBands!.depth;
    for(let i=0;i<12;i++){
      const cycle=(this.elapsed*(.17+(i%3)*.04)+i*.618)%1,life=Math.sin(cycle*Math.PI);
      let x:number,y:number;
      if(i<8){
        const drift=3+Math.sin(cycle*6+i)*Math.min(2,depth/6);
        x=i%2?outer.x+outer.width-drift:outer.x+drift;
        y=outer.y+3+(1-cycle)*(outer.height-6);
      }else{
        x=outer.x+3+cycle*(outer.width-6);
        y=i%2?outer.y+outer.height-3-cycle*3:outer.y+3+cycle*3;
      }
      g.lineStyle(.7,0xffab46,life*.20).beginPath().moveTo(x,y+Math.min(2,cycle*3)).lineTo(x,y).strokePath();
      g.fillStyle(0xff963a,life*.14).fillCircle(x,y,1.8);
      g.fillStyle(0xffedbb,life*.62).fillCircle(x,y,.65);
    }
  }

  private drawEmbers(base:number):void {
    const b=this.box,g=this.graphic,small=this.level===1,anchors=small?SMALL_ANCHORS:LARGE_ANCHORS;
    const height=b.height*(small?.52:.88),count=small?2:4;
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
    this.safetyMask.destroy();this.safetyGraphic.destroy();
    for(const image of this.frameFlames)image.destroy();this.frameFlames.length=0;this.frameGraphic?.destroy();
    if(this.scene.textures.exists(this.textureKey))this.scene.textures.remove(this.textureKey);
    if(this.scene.textures.exists(this.frameTextureKey))this.scene.textures.remove(this.frameTextureKey);
    this.heat=new Float32Array(0);this.nextHeat=new Float32Array(0);
    this.smallMask=new Float32Array(0);this.largeMask=new Float32Array(0);this.fuel=new Float32Array(0);this.pixels=undefined;
    this.hitIds.clear();
    this.frameHeat=new Float32Array(0);this.nextFrameHeat=new Float32Array(0);
    this.frameFuel=new Float32Array(0);this.frameMask=new Float32Array(0);this.framePixels=undefined;
  }
}
