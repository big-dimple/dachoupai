import type Phaser from 'phaser';
import {scoreCells,type Box} from './layout';
import {crispText} from './TextRaster';

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
  return value.replace(/(≈)?(-?)(\d[\d,]*(?:\.\d+)?)/g,(part,approx,sign,number:string)=>{
    const digits=number.replaceAll(',',''),[whole,decimal='']=digits.split('.');
    const lost=/[1-9]/.test(whole.slice(3)+decimal);
    return whole.length>5?(approx||lost?'≈':'')+sign+whole[0]+'.'+whole.slice(1,3)+'e'+(whole.length-1):part;
  });
}

type FittedLine={value:string;display:string;width:number;height:number;base:number;numeric:boolean;font:string;style:string;size:string|number;resolution:number;measuredWidth:number;measuredHeight:number};
const fittedLines=new WeakMap<Phaser.GameObjects.Text,FittedLine>();
/** Measure the real platform font; never rely on fontSize as the rendered height. */
export function fitScoreLine(text:Phaser.GameObjects.Text,area:Box,baseSize:number,numeric=false):void {
  const value=text.text===text.getData('fittedText')?String(text.getData('fullText')):text.text;
  const previous=fittedLines.get(text),style=text.style;
  // Pulses move an already fitted bitmap. Re-running the font-size search would
  // rasterize unchanged labels at every intermediate size on every frame.
  const unchanged=previous&&previous.value===value&&previous.display===text.text&&previous.width===area.width&&previous.height===area.height&&previous.base===baseSize&&previous.numeric===numeric&&previous.font===style?.fontFamily&&previous.style===style?.fontStyle&&previous.size===style?.fontSize&&previous.resolution===style?.resolution&&previous.measuredWidth===text.width&&previous.measuredHeight===text.height;
  if(unchanged){text.setScale(1).setPosition(area.x+area.width/2,area.y).setOrigin(.5,0);crispText(text);return;}
  text.setText(value).setWordWrapWidth(0).setFontSize(baseSize).setScale(1);
  if(baseSize>14&&(text.width>area.width||text.height>area.height)){
    // The current bitmap already measures this font. Binary probing needlessly
    // rasterized 101/145/...px even when a desktop 190px number only needed 188px.
    // Estimate from real bounds, then allow two corrections for rounded font metrics.
    const fits=()=>text.width<=area.width&&text.height<=area.height;
    const smaller=(size:number)=>Math.max(14,Math.min(size-1,Math.floor(size*Math.min(area.width/Math.max(1,text.width),area.height/Math.max(1,text.height)))));
    let size=smaller(baseSize);text.setFontSize(size);
    for(let correction=0;correction<2&&!fits()&&size>14;correction++){size=smaller(size);text.setFontSize(size);}
    if(!fits()&&size>14)text.setFontSize(14);
  }
  if(numeric&&text.width>area.width){
    text.setText(compactScoreText(value));
    if(text.width>area.width)text.setText(text.text.replace(/(≈)?(-?)(\d)\.(\d{2})e/g,(_,approx,sign,whole,tail)=>(approx||/[1-9]/.test(tail)?'≈':'')+sign+whole+'e'));
  }
  if(!numeric&&text.width>area.width){
    let end=value.length;
    do{text.setText(value.slice(0,--end)+'…');}while(text.width>area.width&&end>0);
  }
  // Rare long fractions/ranges remain legible on two lines, rather than crossing a neighbour.
  if(numeric&&text.width>area.width)text.setWordWrapWidth(area.width,true);
  text.setPosition(area.x+area.width/2,area.y).setOrigin(.5,0)
    .setData('fullText',value).setData('fittedText',text.text);
  crispText(text);
  fittedLines.set(text,{value,display:text.text,width:area.width,height:area.height,base:baseSize,numeric,font:style?.fontFamily,style:style?.fontStyle,size:style?.fontSize,resolution:style?.resolution,measuredWidth:text.width,measuredHeight:text.height});
}

/** Primary score gets the existing pedestal's vertical room; cards/actions never move. */
export function scoreImpactCell(board:Box):Box {
  const cell=scoreCells(board)[2],height=board.height>=108?65:Math.min(38,board.height-8);
  return {x:cell.x,y:board.y+board.height-height-3,width:cell.width,height};
}

/** Keep the pulse and its lift inside the numeric lane after measuring the fitted bitmap. */
export function scorePulseFrame(cell:Box,width:number,height:number,requested:number,lift:number){
  const scale=Math.min(requested,cell.width/Math.max(1,width),cell.height/Math.max(1,height)),room=Math.max(0,(cell.height-height*scale)/2);
  return {scale,lift:Math.max(-room,Math.min(room,lift))};
}
