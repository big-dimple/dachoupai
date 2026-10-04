import type Phaser from 'phaser';
import {scoreCells,type Box} from './layout';

/** A source lands outside the numeric cell; its centre never aims through the digits. */
export function scoreFlightLanding(source:{x:number;y:number},cell:Box,outset=14):{x:number;y:number} {
  const center={x:cell.x+cell.width/2,y:cell.y+cell.height/2},dx=source.x-center.x,dy=source.y-center.y;
  if(!dx&&!dy)return{x:center.x,y:cell.y-outset};
  const extentX=cell.width/2+outset,extentY=cell.height/2+outset;
  const t=Math.min(dx?extentX/Math.abs(dx):Infinity,dy?extentY/Math.abs(dy):Infinity);
  return{x:center.x+dx*t,y:center.y+dy*t};
}

/** Display precision only. Full exact values remain in trace/save and on the text's data. */
export function compactScoreText(value:string):string {
  return value.replace(/\d[\d,]*(?:\.\d+)?/g,part=>{
    const digits=part.replaceAll(',',''),whole=digits.split('.')[0];
    return whole.length>5?whole[0]+'.'+whole.slice(1,3)+'e'+(whole.length-1):part;
  });
}

/** Measure the real platform font; never rely on fontSize as the rendered height. */
export function fitScoreLine(text:Phaser.GameObjects.Text,area:Box,baseSize:number,numeric=false):void {
  const value=text.text===text.getData('fittedText')?String(text.getData('fullText')):text.text;
  text.setText(value).setWordWrapWidth(0).setFontSize(baseSize).setScale(1);
  for(let size=baseSize;(text.width>area.width||text.height>area.height)&&size>14;)text.setFontSize(--size);
  if(numeric&&text.width>area.width){
    text.setText(compactScoreText(value));
    if(text.width>area.width)text.setText(text.text.replace(/(\d)\.\d{2}e/g,'$1e'));
  }
  if(!numeric&&text.width>area.width){
    let end=value.length;
    do{text.setText(value.slice(0,--end)+'…');}while(text.width>area.width&&end>0);
  }
  // Rare long fractions/ranges remain legible on two lines, rather than crossing a neighbour.
  if(numeric&&text.width>area.width)text.setWordWrapWidth(area.width,true);
  text.setPosition(area.x+area.width/2,area.y).setOrigin(.5,0)
    .setData('fullText',value).setData('fittedText',text.text);
}

/** Primary score gets the existing pedestal's vertical room; cards/actions never move. */
export function scoreImpactCell(board:Box):Box {
  const cell=scoreCells(board)[2],height=board.height>=108?65:Math.min(38,board.height-8);
  return {x:cell.x,y:board.y+board.height-height-3,width:cell.width,height};
}
