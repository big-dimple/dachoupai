import type Phaser from 'phaser';
import type {ScoreTrace} from '../domain/scoreR2';
import {playedFootprint,type Box,type TableLayout} from './layout';
import {toolInventoryPlayedArea} from './ToolInventoryEntry';
import {HAND_LABELS} from '../content/handLabels';
import {fractionText,heatText} from './scoreText';
import {fitScoreLine} from './ScoreTextLayout';
import {PAPER_THEME as T,PAPER_CSS as C,SCORE_FONT,UI_FONT} from './theme';

/** The saved final hand owns the existing played-card workplane, never another timer. */
export function scoreLandingBox(layout:TableLayout):Box {
 const area=playedFootprint(toolInventoryPlayedArea(layout),layout.mode==='portrait');
 const width=Math.min(area.width-8,layout.mode==='desktop'?520:460),height=Math.min(area.height-4,layout.shortLandscape?100:136);
 return {x:area.x+(area.width-width)/2,y:area.y+(area.height-height)/2,width,height};
}
export interface ScoreLandingView {total:Phaser.GameObjects.Text;dispose:()=>void}
export function mountScoreLanding(scene:Phaser.Scene,parent:Phaser.GameObjects.Container,layout:TableLayout,trace:ScoreTrace,replay:boolean,signal:AbortSignal,color:string=C.ink):ScoreLandingView|undefined {
 if(signal.aborted)return;
 const box=scoreLandingBox(layout);if(box.width<160||box.height<74)return;
 const group=scene.add.container(0,0).setName('score/landing').setData('rootId',trace.rootId).setData('bounds',box);
 parent.add(group);
 const paper=scene.add.graphics().fillStyle(T.ink,.09).fillRoundedRect(box.x,box.y+3,box.width,box.height,6)
  .fillStyle(T.paperLight).fillRoundedRect(box.x,box.y,box.width,box.height,6).lineStyle(1,T.brass,.55).strokeRoundedRect(box.x+.5,box.y+.5,box.width-1,box.height-1,6);
 group.add(paper);
 if(scene.textures.exists('p00-paper'))group.add(scene.add.tileSprite(box.x+4,box.y+4,box.width-8,box.height-8,'p00-paper').setOrigin(0).setAlpha(.18));
 const compact=box.height<120,numberY=box.y+(compact?22:27),numberHeight=box.height-(compact?52:62);
 const label=scene.add.text(box.x+14,box.y+7,(replay?'回看 · ':'')+HAND_LABELS[trace.handType]+' · 本手得分',{fontFamily:UI_FONT,fontSize:'14px',color:C.mutedInk}).setName('score/landing-label');
 const total=scene.add.text(0,0,heatText(trace.finalScore),{fontFamily:SCORE_FONT,fontSize:'54px',fontStyle:'bold',color}).setName('score/landing-total');
 fitScoreLine(total,{x:box.x+14,y:numberY,width:box.width-28,height:numberHeight},compact?40:54,true);
 total.setData('exactScore',trace.finalScore);
 const formula=scene.add.text(0,0,fractionText(trace.accumulator.H)+' × '+fractionText(trace.accumulator.M),{fontFamily:UI_FONT,fontSize:'14px',color:C.jade}).setName('score/landing-formula');
 fitScoreLine(formula,{x:box.x+14,y:box.y+box.height-24,width:box.width-28,height:20},14,true);
 group.add([label,total,formula]);
 let disposed=false;const dispose=()=>{if(disposed)return;disposed=true;signal.removeEventListener('abort',dispose);group.destroy();};signal.addEventListener('abort',dispose,{once:true});return {total,dispose};
}
