import type Phaser from 'phaser';
import type {Box} from './layout';
import {tableScoreCells,tableScoreCaption,tableScoreLabelY} from './ScoreTableLayout';
import {fitScoreLine,scorePulseFrame} from './ScoreTextLayout';
import {crispText,prepareTextScale,textDensity} from './TextRaster';
import {SCORE_CHANNEL} from './ScoreTableMotion';
import {SCORE_FONT,PAPER_CSS as C} from './theme';

export function mountTableScoreMarks(scene:Phaser.Scene,root:Phaser.GameObjects.Container,board:Box):void {
 const cells=tableScoreCells(board);
 for(const [i,mark] of ['×','='].entries()){
  const a=cells[i],b=cells[i+1],text=scene.add.text((a.x+a.width+b.x)/2,a.y+a.height/2,mark,{fontFamily:SCORE_FONT,fontSize:'24px',color:C.mutedInk,resolution:textDensity(scene)}).setOrigin(.5).setName('score/formula-'+i);root.add(text);crispText(text);
 }
}

/** One set of committed readouts remains the focal point through every event. */
export function fitTableScoreReadouts(board:Box,refs:{caption:Phaser.GameObjects.Text;labels:Phaser.GameObjects.Text[];heat:Phaser.GameObjects.Text;mult:Phaser.GameObjects.Text;total:Phaser.GameObjects.Text},reduced:boolean):void {
 const cells=tableScoreCells(board);if(!refs.caption.getData('scoreSourceProcess'))fitScoreLine(refs.caption,tableScoreCaption(board),16);
 refs.labels.forEach((label,i)=>{label.setVisible(!label.getData('landingSuppressed'));fitScoreLine(label,{x:cells[i].x,y:tableScoreLabelY(board),width:cells[i].width,height:18},14);});
 [refs.heat,refs.mult,refs.total].forEach((text,i)=>{
  // Keep two logical pixels for Canvas rounding at the full original peak.
  const lane=cells[i],cell={x:lane.x+2,y:lane.y+2,width:Math.max(1,lane.width-4),height:Math.max(1,lane.height-4)},reserve=reduced?1:1.54;prepareTextScale(text,1.54);if(text.style.fontFamily!==SCORE_FONT)text.setFontFamily(SCORE_FONT);if(text.style.fontStyle!=='800')text.setFontStyle('800');
  fitScoreLine(text,{x:cell.x,y:cell.y,width:cell.width/reserve,height:cell.height/reserve},i===2?54:44,true);
  const pose=scorePulseFrame(cell,text.width,text.height,Number(text.getData('scorePulseScale')??1),Number(text.getData('scorePulseY')??0));
  text.setOrigin(.5).setPosition(cell.x+cell.width/2,cell.y+cell.height/2+pose.lift).setScale(pose.scale);crispText(text);
 });
 if((!refs.heat.getData('scorePulseScale')||refs.heat.getData('scorePulseScale')===1)&&refs.heat.style.color!==SCORE_CHANNEL.heat.css)refs.heat.setColor(SCORE_CHANNEL.heat.css);
 if((!refs.mult.getData('scorePulseScale')||refs.mult.getData('scorePulseScale')===1)&&refs.mult.style.color!==SCORE_CHANNEL['mult-add'].css)refs.mult.setColor(SCORE_CHANNEL['mult-add'].css);
}
