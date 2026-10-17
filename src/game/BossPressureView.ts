import type Phaser from 'phaser';
import type {BossPressure} from './BossPressure';
import {UI_FONT} from './theme';

/** Gray veil, actual chain links and a red scope stamp; does not capture input or tint rank text. */
export function mountBossPressure(scene:Phaser.Scene,source:Phaser.GameObjects.Container,width:number,height:number,pressure:BossPressure):()=>void {
  (source.getData('bossPressureCleanup') as (()=>void)|undefined)?.();
  const group=scene.add.container(0,0).setName('boss/pressure'),ink=scene.add.graphics();
  ink.fillStyle(0x383b3c,pressure.kind==='scoring'?.38:.18).fillRoundedRect(-width/2+1,-height/2+1,width-2,height-2,5);
  // Keep corner ranks and the footer stamp clear. Ellipses are chain links, not emoji glyphs.
  for(const direction of [-1,1])for(let i=0;i<7;i++){
    const t=i/6,x=(t-.5)*width*.72,y=(t-.5)*height*.38*direction-height*.06;
    ink.lineStyle(3,0x222629,.9).strokeEllipse(x,y,width*.14,Math.max(5,height*.038));
    ink.lineStyle(1.2,0xb1aaa0,.95).strokeEllipse(x,y,width*.14,Math.max(5,height*.038));
  }
  const stampWidth=Math.min(width-8,86),stampHeight=Math.min(22,Math.max(16,height*.16)),stampY=height*.28;
  ink.fillStyle(0x982e28,.97).fillRoundedRect(-stampWidth/2,stampY-stampHeight/2,stampWidth,stampHeight,2);
  ink.lineStyle(1,0xf7c4aa,.9).strokeRoundedRect(-stampWidth/2+2,stampY-stampHeight/2+2,stampWidth-4,stampHeight-4,1);
  const label=scene.add.text(0,stampY,pressure.label,{fontFamily:UI_FONT,fontSize:Math.min(14,stampWidth/4.6)+'px',fontStyle:'bold',color:'#fff0df',resolution:Math.max(1.5,1/scene.scale.zoom)}).setOrigin(.5);
  group.add([ink,label]);source.add(group);source.setData('bossPressure',pressure);
  let disposed=false;const cleanup=()=>{if(disposed)return;disposed=true;group.destroy();if(source.active&&source.getData('bossPressureCleanup')===cleanup)source.setData('bossPressure',undefined).setData('bossPressureCleanup',undefined);};
  source.setData('bossPressureCleanup',cleanup);return cleanup;
}
