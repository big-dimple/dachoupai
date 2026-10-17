import type Phaser from 'phaser';
import type {Box} from './layout';
import type {ScoreContribution} from './ScoreContribution';
import {readableFractionText} from './scoreText';
import {numberPulse} from './ScoreEnergy';
import {fitScoreLine} from './ScoreTextLayout';
import {scoreLineSegments} from './ScoreGeometry';
import {UI_FONT} from './theme';

/** A visible local route above the opaque backdrop: source → local effect → accumulator.
 * All marks stay in the gaps above numeric boxes. No full-screen sweep or photo motion. */
export function mountClimaxContribution(scene:Phaser.Scene,skill:Phaser.GameObjects.Container,landing:Phaser.GameObjects.Container,
  source:Box,local:Box,total:Box,readout:Phaser.GameObjects.Text,cue:ScoreContribution,localReadout?:Phaser.GameObjects.Text){
  const ink=scene.add.graphics().setName('hero/contribution-route'),ring=scene.add.graphics().setName('hero/contribution-arrival');
  const packet=scene.add.text(0,0,cue.label,{fontFamily:UI_FONT,fontSize:'14px',fontStyle:'bold',color:cue.kind==='multiply'?'#982e28':'#285a54',backgroundColor:'#f7efd9',resolution:Math.max(1.5,1/scene.scale.zoom)}).setOrigin(.5).setName('hero/contribution-packet');
  skill.add([ink,packet]);landing.add(ring);
  // Route to the gap between the labels and the digits; never through an eye strip.
  const from={x:source.x+source.width/2,y:source.y+source.height+4},via={x:local.x+local.width/2,y:source.y+source.height+4},to={x:total.x+total.width/2,y:total.y-3};
  const guards=[source,{...local,y:local.y-28,height:22},{...total,y:total.y-28,height:22},local,total];
  const segments=[...scoreLineSegments(from,via,guards),...scoreLineSegments(via,to,guards)];
  const color=cue.kind==='multiply'?0x982e28:0x285a54;
  const peak=cue.kind==='multiply'?1.54:1.28;
  const fit=(value:string)=>{
    readout.setText(value);fitScoreLine(readout,{x:total.x+(total.width-total.width/peak)/2,y:total.y,width:total.width/peak,height:(total.height-8)/peak},64,true);
    readout.setOrigin(.5).setPosition(total.x+total.width/2,total.y+total.height/2);
  };
  fit(readableFractionText(cue.before));
  let arrived=false;
  const frame=(age:number,reduced=false)=>{
    const progress=reduced?1:Math.max(0,Math.min(1,age/160));
    if(!arrived&&(reduced||progress===1)){arrived=true;fit(readableFractionText(cue.after));readout.setData('exactValue',cue.after).setData('contributionArrived',true);}
    ink.clear();ring.clear();
    if(!reduced&&age<420){
      ink.lineStyle(2,color,.85);for(const [a,b] of segments)ink.lineBetween(a.x,a.y,b.x,b.y);
      ink.lineBetween(to.x-5,to.y-4,to.x,to.y).lineBetween(to.x-5,to.y+4,to.x,to.y);
    }
    packet.setVisible(!reduced&&progress<1);
    const segment=progress<.5?progress*2:(progress-.5)*2,a=progress<.5?from:via,b=progress<.5?via:to;
    packet.setPosition(a.x+(b.x-a.x)*segment,a.y+(b.y-a.y)*segment);
    if(guards.some(b=>packet.x+packet.width/2>b.x&&packet.x-packet.width/2<b.x+b.width&&packet.y+packet.height/2>b.y&&packet.y-packet.height/2<b.y+b.height))packet.setVisible(false);
    if(!reduced&&progress<1&&!guards.some(b=>packet.x>b.x&&packet.x<b.x+b.width&&packet.y>b.y&&packet.y<b.y+b.height))ink.fillStyle(color,1).fillEllipse(packet.x,packet.y,4,4);
    if(localReadout?.active)localReadout.setScale(reduced||age>=160?1:Math.min(1+.12*Math.sin(Math.PI*age/160),local.width/Math.max(1,localReadout.width),local.height/Math.max(1,localReadout.height)));
    const pulse=reduced||age<160?{scale:1,lift:0}:numberPulse(Math.min(1,(age-160)/300),cue.kind==='multiply'?'multiply':'key',peak);
    readout.setScale(Math.min(pulse.scale,total.width/Math.max(1,readout.width),(total.height-8)/Math.max(1,readout.height))).setY(total.y+total.height/2+pulse.lift);
    if(!reduced&&age>=420&&age<600)ring.lineStyle(2,color,(600-age)/180).lineBetween(total.x+4,total.y+total.height+2,total.x+total.width-4,total.y+total.height+2);
  };
  frame(0);
  return {frame,settle:()=>frame(600,true),dispose:()=>{ink.destroy();ring.destroy();packet.destroy();}};
}
