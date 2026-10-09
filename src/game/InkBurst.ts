import type Phaser from 'phaser';
/** Motion adapted from Inkwave menu-art.js209–226 + ui.css778–785,
 * 679d2db, MIT (c)2026 Jayden Davis. Pure visual seed; never uses run RNG. */
export function inkBurstFrame(progress:number,radius:number,count=18){
 const t=Math.max(0,Math.min(1,progress)),travel=1-Math.pow(1-t,3),n=Math.max(0,Math.min(24,Math.floor(count)));
 return Array.from({length:n},(_,i)=>{const angle=i/n*Math.PI*2+Math.sin(i*7919)*.28,distance=radius*(.42+(i%7)*.08)*travel;
  return {x:Math.cos(angle)*distance,y:Math.sin(angle)*distance+radius*t*t*.13,r:radius*(.010+(i%4)*.005)*(1-t*.7),alpha:Math.max(0,(1-t)*(i%3===0?.72:.44)),angle};
 });
}
export interface InkBurstView {graphic:Phaser.GameObjects.Graphics;dispose:()=>void}
/** One graphic and one owned tween, bounded droplets/expanding ring, no input or business callback. */
export function mountInkBurst(scene:Phaser.Scene,root:Phaser.GameObjects.Container,x:number,y:number,radius:number,color:number,life=760,count=18):InkBurstView {
 const graphic=scene.add.graphics().setPosition(x,y).setName('ink/motion').setData('particleCap',Math.min(24,count));root.add(graphic);
 const clock={t:0};let disposed=false,tween:Phaser.Tweens.Tween|undefined;
 const dispose=(destroy=true)=>{if(disposed)return;disposed=true;tween?.remove();tween=undefined;if(destroy&&graphic.active)graphic.destroy();};
 graphic.once('destroy',()=>dispose(false));
 const draw=()=>{if(disposed)return;const t=clock.t;graphic.clear().setData('progress',t);
  const rings=[.12,.29];for(const [i,delay] of rings.entries()){const p=Math.max(0,(t-delay)/(1-delay));if(t>=delay)graphic.lineStyle(Math.max(1,radius*.021*(1-p)),i?0x3f606b:color,(1-p)*.52).strokeCircle(0,0,radius*(.14+.88*(1-Math.pow(1-p,3))));}
  for(const d of inkBurstFrame(t,radius,count)){graphic.lineStyle(Math.max(1,d.r*.62),color,d.alpha*.55).lineBetween(d.x-Math.cos(d.angle)*d.r*3,d.y-Math.sin(d.angle)*d.r*3,d.x,d.y);graphic.fillStyle(color,d.alpha).fillEllipse(d.x,d.y,d.r*2.2,d.r*1.45);}
 };
 draw();tween=scene.tweens.add({targets:clock,t:1,duration:life,ease:'Linear',onUpdate:draw,onComplete:()=>dispose()});
 return {graphic,dispose:()=>dispose()};
}
