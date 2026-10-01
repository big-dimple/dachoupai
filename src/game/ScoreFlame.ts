import Phaser from 'phaser';
import type {Box} from './layout';

/** Original bounded 2D flame. Decorative time never touches rule RNG or saved scores. */
export class ScoreFlame {
  readonly graphic:Phaser.GameObjects.Graphics;
  private level:0|1|2|3=0;
  private elapsed=0;
  private reduced=false;
  constructor(private readonly scene:Phaser.Scene,root:Phaser.GameObjects.Container,private readonly box:Box){
    this.graphic=scene.add.graphics().setName('score/fire').setVisible(false).setData('intensity',0);
    root.add(this.graphic);scene.events.on('update',this.update,this);
  }
  set(level:0|1|2|3,reduced=false):void {
    this.level=level;this.reduced=reduced;this.graphic.setData('intensity',level).setVisible(level>0);
    this.draw();
  }
  private update(_time:number,delta:number):void {
    if(!this.graphic.active||!this.level||this.reduced)return;
    this.elapsed+=Math.min(delta,50)*.001;this.draw();
  }
  private draw():void {
    const g=this.graphic;g.clear();if(!this.level)return;
    const b=this.box,cx=b.x+b.width/2,base=b.y+b.height-2,height=Math.min(42,b.height*.78)*(0.7+this.level*.1);
    g.fillStyle(0xff6d25,.08+this.level*.035).fillRoundedRect(b.x,b.y,b.width,b.height,7);
    g.lineStyle(2,0xffbb56,.75).strokeRoundedRect(b.x+1,b.y+1,b.width-2,b.height-2,6);
    if(this.reduced)return;
    const count=10+this.level*3,step=(b.width-8)/count;
    g.fillStyle(0xffb852,.15+this.level*.04).fillRoundedRect(b.x+3,base-7,b.width-6,7,3);
    for(let i=0;i<count;i++){
      const phase=this.elapsed*(3.8+(i%3)*.3)+i*1.71,x=b.x+4+step*(i+.5),h=height*(.52+.28*Math.sin(phase)+.15*Math.sin(phase*.63)),tip=x+Math.sin(phase*.9)*step*.5;
      g.fillStyle(0xff7433,.055).fillEllipse(x,base-h*.35,step*1.6,h*1.1);
      g.fillStyle(i%2?0xf85b21:0xff9236,.38+this.level*.07).fillPoints(this.tongue(x,base,step*.65,h,tip-x),true);
      g.fillStyle(0xffe69a,.6).fillPoints(this.tongue(x,base,step*.3,h*.6,(tip-x)*.65),true);
    }
    // Embers stay inside the score tile; the rest of the table remains unobscured.
    for(let i=0;i<5+this.level*2;i++){
      const cycle=(this.elapsed*.6+i*.173)%1,x=cx+Math.sin(i*2.3+cycle)*b.width*.43,y=base-cycle*height;
      g.fillStyle(0xffdc83,(1-cycle)*.8).fillCircle(x,y,1+this.level*.3);
    }
  }
  /** Two sampled curves keep each tongue organic without a shader, texture or timer. */
  private tongue(x:number,y:number,w:number,h:number,bend:number):{x:number;y:number}[] {
    const points:{x:number;y:number}[]=[],tip={x:x+bend,y:y-h};
    const curve=(a:{x:number;y:number},b:{x:number;y:number},c:{x:number;y:number},d:{x:number;y:number})=>{
      for(let i=0;i<=6;i++){const t=i/6,u=1-t;points.push({x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y});}
    };
    curve({x:x-w,y},{x:x-w*1.1,y:y-h*.4},{x:tip.x+w*.25,y:y-h*.62},tip);
    curve(tip,{x:tip.x+w*.6,y:y-h*.7},{x:x+w*1.1,y:y-h*.26},{x:x+w,y});
    return points;
  }
  destroy():void {this.scene.events.off('update',this.update,this);this.graphic.destroy();}
}
