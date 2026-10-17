import type Phaser from 'phaser';
import type {Box} from './layout';
import type {ScoreContribution} from './ScoreContribution';
import {readableFractionText} from './scoreText';
import {numberPulse} from './ScoreEnergy';
import {fitScoreLine} from './ScoreTextLayout';
import {scoreLineSegments} from './ScoreGeometry';
import {crispText,prepareTextScale} from './TextRaster';
import {UI_FONT} from './theme';

/** A visible local route above the opaque backdrop: source → local effect → accumulator.
 * The flight stays outside measured labels and digits, and ends on arrival. */
export function mountClimaxContribution(scene:Phaser.Scene,skill:Phaser.GameObjects.Container,landing:Phaser.GameObjects.Container,
  source:Box,local:Box,total:Box,readout:Phaser.GameObjects.Text,cue:ScoreContribution,localReadout?:Phaser.GameObjects.Text,labelBounds:readonly Box[]=[],photoBounds:readonly Box[]=[]){
  const ink=scene.add.graphics().setName('hero/contribution-route'),ring=scene.add.graphics().setName('hero/contribution-arrival');
  const packet=scene.add.text(0,0,cue.label,{fontFamily:UI_FONT,fontSize:'14px',fontStyle:'bold',color:cue.kind==='multiply'?'#982e28':'#285a54',backgroundColor:'#f7efd9',resolution:Math.max(1.5,1/scene.scale.zoom)}).setOrigin(.5).setName('hero/contribution-packet');
  skill.add([ink,packet]);landing.add(ring);
  // Use the measured label row, then the column gutter. A nominal art box can
  // extend below the actual strip and put its baseline through the title row.
  const routeY=labelBounds.length?Math.min(...labelBounds.map(b=>b.y))-8:source.y+source.height+4,gutter=(local.x+local.width+total.x)/2;
  const from={x:source.x+source.width/2,y:routeY},via={x:gutter,y:routeY},to={x:gutter,y:total.y+total.height/2},tip={x:total.x-3,y:to.y};
  const guards=[source,...photoBounds.map(b=>({x:b.x-2,y:b.y-2,width:b.width+4,height:b.height+4})),...labelBounds.map(b=>({x:b.x-7,y:b.y-7,width:b.width+14,height:b.height+14})),local,total];
  const segments=[...scoreLineSegments(from,via,guards),...scoreLineSegments(via,to,guards),...scoreLineSegments({x:to.x,y:to.y-4},tip,guards),...scoreLineSegments({x:to.x,y:to.y+4},tip,guards)];
  ink.setData('segments',segments).setData('guards',guards);
  const color=cue.kind==='multiply'?0x982e28:0x285a54;
  const peak=cue.kind==='multiply'?1.54:1.28;
  prepareTextScale(readout,peak);if(localReadout)prepareTextScale(localReadout,1.12);
  const localPosition=localReadout&&{x:localReadout.x,y:localReadout.y};
  const fit=(value:string)=>{
    readout.setText(value);fitScoreLine(readout,{x:total.x+(total.width-total.width/peak)/2,y:total.y,width:total.width/peak,height:(total.height-8)/peak},64,true);
    readout.setOrigin(.5).setPosition(total.x+total.width/2,total.y+total.height/2);
  };
  fit(readableFractionText(cue.before));
  let arrived=false;
  const frame=(age:number,reduced=false,landed=true)=>{
    const progress=reduced?1:Math.max(0,Math.min(1,age/160));
    if(!arrived&&landed&&(reduced||progress===1)){arrived=true;fit(readableFractionText(cue.after));readout.setData('exactValue',cue.after).setData('contributionArrived',true);}
    ink.clear();ring.clear();
    if(!reduced&&age>0&&age<160){
      ink.lineStyle(1,color,.7*Math.sin(Math.PI*progress));for(const [a,b] of segments)ink.lineBetween(a.x,a.y,b.x,b.y);
    }
    packet.setVisible(!reduced&&progress<1);
    const segment=progress<.5?progress*2:(progress-.5)*2,a=progress<.5?from:via,b=progress<.5?via:to;
    packet.setPosition(a.x+(b.x-a.x)*segment,a.y+(b.y-a.y)*segment);
    if(guards.some(b=>packet.x+packet.width/2>b.x&&packet.x-packet.width/2<b.x+b.width&&packet.y+packet.height/2>b.y&&packet.y-packet.height/2<b.y+b.height))packet.setVisible(false);
    if(!reduced&&progress<1&&!guards.some(b=>packet.x>b.x&&packet.x<b.x+b.width&&packet.y>b.y&&packet.y<b.y+b.height))ink.fillStyle(color,1).fillEllipse(packet.x,packet.y,4,4);
    if(localReadout?.active&&localPosition){localReadout.setPosition(localPosition.x,localPosition.y).setScale(reduced||age>=160?1:Math.min(1+.12*Math.sin(Math.PI*age/160),local.width/Math.max(1,localReadout.width),local.height/Math.max(1,localReadout.height)));crispText(localReadout);}
    const pulse=reduced||!landed||age<160?{scale:1,lift:0}:numberPulse(Math.min(1,(age-160)/300),cue.kind==='multiply'?'multiply':'key',peak);
    readout.setScale(Math.min(pulse.scale,total.width/Math.max(1,readout.width),(total.height-8)/Math.max(1,readout.height))).setPosition(total.x+total.width/2,total.y+total.height/2+pulse.lift);crispText(readout);
    if(!reduced&&age>=420&&age<600)ring.lineStyle(2,color,(600-age)/180).lineBetween(total.x+4,total.y+total.height+2,total.x+total.width-4,total.y+total.height+2);
  };
  frame(0);
  return {frame,settle:()=>frame(600,true),dispose:()=>{ink.destroy();ring.destroy();packet.destroy();}};
}
