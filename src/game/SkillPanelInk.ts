import type Phaser from 'phaser';
import type {Box} from './layout';
import {PAPER_THEME as T} from './theme';

/** Sparse panel-edge speed marks; no full-screen dim, rings, droplets or rule callbacks. */
export function mountSkillPanelInk(scene:Phaser.Scene,root:Phaser.GameObjects.Container,area:Box){
 const graphic=scene.add.graphics().setName('hero/panel-strike');root.add(graphic);
 const clock={progress:0};let disposed=false,tween:Phaser.Tweens.Tween|undefined;
 const dispose=(destroy=true)=>{if(disposed)return;disposed=true;tween?.remove();if(destroy&&graphic.active)graphic.destroy();};
 graphic.once('destroy',()=>dispose(false));
 const draw=()=>{
  const t=clock.progress;graphic.clear().setAlpha((1-t)*.72);
  for(let i=0;i<5;i++){
   const y=area.y+area.height*(.16+i*.14),length=area.width*(.08+(i%3)*.035)*(1-t*.5);
   graphic.lineStyle(i%2?1:2,i%2?T.jade:T.ink).lineBetween(area.x,y,area.x+length,y-8);
   graphic.lineStyle(i%2?2:1,T.red).lineBetween(area.x+area.width-length,y+area.height*.04,area.x+area.width,y-4);
  }
 };
 draw();tween=scene.tweens.add({targets:clock,progress:1,duration:620,ease:'Cubic.easeOut',onUpdate:draw,onComplete:()=>dispose()});
 return {graphic,dispose:()=>dispose()};
}
