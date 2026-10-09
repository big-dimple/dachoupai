import type Phaser from 'phaser';
import type {Box} from './layout';
import {mountInkBurst} from './InkBurst';
import {inkSettlingEase} from './inkwaveSpring';
/** Saved outcome presentation only; finite owned motion behind readable result facts. */
export function mountResultEntrance(scene:Phaser.Scene,root:Phaser.GameObjects.Container,b:Box,won:boolean){
 const group=scene.add.container(0,0).setName(won?'result/victory-motion':'result/failure-motion');root.add(group);
 const ink=scene.add.graphics();group.add(ink);for(let i=0;i<5;i++){const y=b.y-24+i*b.height*.18;ink.fillStyle(won?0xb8473a:0x26313a,won?.10:.12).fillPoints([{x:b.x-b.width*.3,y:y+20},{x:b.x+b.width*.92,y:y-6},{x:b.x+b.width*1.1,y:y+26},{x:b.x-b.width*.12,y:y+42}],true);}
 ink.setX(-b.width*.6).setAlpha(.35);const owned:Phaser.Tweens.Tween[]=[];let disposed=false;const burst=won?mountInkBurst(scene,group,b.x+b.width/2,b.y+b.height*.40,Math.min(b.width,b.height)*.8,0xb8473a,850,24):undefined;
 const dispose=(destroy=true)=>{if(disposed)return;disposed=true;burst?.dispose();for(const t of owned)t.remove();if(destroy&&group.active)group.destroy();};group.once('destroy',()=>dispose(false));
 owned.push(scene.tweens.add({targets:ink,x:0,alpha:1,duration:won?280:420,ease:inkSettlingEase(.3)}));owned.push(scene.tweens.add({targets:ink,y:won?-12:28,alpha:0,delay:won?600:380,duration:won?350:540,ease:'Cubic.easeOut',onComplete:()=>dispose()}));return {dispose:()=>dispose()};
}
