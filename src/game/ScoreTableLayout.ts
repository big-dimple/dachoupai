import type {Box,LayoutMode} from './layout';
interface ScoreTableInput {mode:LayoutMode;playedArea:Box;scoreBoard:Box;hud:Box;heroAction?:Box}

/** Idle cards use the hidden readout band. Saved scoring restores the separate landing lane. */
export function idlePlayedArea(l:ScoreTableInput):Box {
 if(l.mode!=='portrait')return l.playedArea;
 const y=l.scoreBoard.y+60,bottom=l.heroAction?.y??l.playedArea.y+l.playedArea.height;
 return {x:l.playedArea.x,y,width:l.playedArea.width,height:Math.min(112,Math.max(24,bottom-y-8))};
}

/** Score and played cards stay on one table; the sidebar remains context. */
export function continuousScoreAreas(l:ScoreTableInput){
 const original=l.playedArea;
 if(l.mode==='desktop'){
  const width=Math.min(760,original.width),scoreBoard={x:original.x+(original.width-width)/2,y:original.y,width,height:Math.min(128,Math.max(80,original.height-116))};
  const playedArea={...original,y:scoreBoard.y+scoreBoard.height+8,height:Math.max(0,original.y+original.height-scoreBoard.y-scoreBoard.height-8)};
  const eyeWidth=Math.min(208,l.hud.width-16),eyes={x:l.hud.x+(l.hud.width-eyeWidth)/2,y:l.hud.y+l.hud.height+12,width:eyeWidth,height:eyeWidth*3/8};
  return {scoreBoard,playedArea,eyes};
 }
 // The phone's real played cards and the two entries below them need 168px.
 const eyeHeight=l.mode==='portrait'&&original.height>=240?Math.min(64,original.height-176):0;
 const eyes=eyeHeight>=42?{x:original.x+(original.width-eyeHeight*8/3)/2,y:original.y,width:eyeHeight*8/3,height:eyeHeight}:undefined;
 const playedArea=eyes?{...original,y:original.y+eyeHeight+8,height:original.height-eyeHeight-8}:original;
 return {scoreBoard:l.scoreBoard,playedArea,eyes};
}

/** The factors and the running product have equal vertical status, never tiny stacked H/M. */
export function tableScoreCells(s:Box):Box[]{
 const pad=10,gap=s.width<420?14:24,available=s.width-pad*2-gap*2,factor=available*.28,total=available-factor*2,y=s.y+46,height=Math.max(20,s.height-54);
 return [{x:s.x+pad,y,width:factor,height},{x:s.x+pad+factor+gap,y,width:factor,height},{x:s.x+pad+factor*2+gap*2,y,width:total,height}];
}
export const tableScoreCaption=(s:Box):Box=>({x:s.x+10,y:s.y+4,width:s.width-20,height:18});
export const tableScoreLabelY=(s:Box)=>s.y+26;

/** Browser chrome can shorten a phone. Use actual spare space, never hide a source. */
export function localHeroEyeSlot(l:ScoreTableInput&{scoreEyes?:Box;slots:Box[]},area:Box,occupied:number):Box|undefined {
 if(l.scoreEyes)return l.scoreEyes;
 if(l.mode==='portrait'){
  if(l.heroAction){const height=Math.min(48,l.heroAction.height),width=Math.min(l.heroAction.width,height*8/3);return {x:l.heroAction.x+(l.heroAction.width-width)/2,y:l.heroAction.y+(l.heroAction.height-height)/2,width,height};}
  const y=Math.max(l.scoreBoard.y+l.scoreBoard.height+4,area.y-14),captionTop=area.y+(area.height-Math.min(100,area.height))/2-18,cardApex=area.y+(area.height-52*1.4)/2-18;
  const height=Math.min(48,captionTop-4-y,cardApex-4-y);
  if(height>=32)return {x:area.x+(area.width-height*8/3)/2,y,width:height*8/3,height};
 }
 const empty=l.slots.slice(occupied);if(empty.length<2)return;
 const a=empty.at(-2)!,b=empty.at(-1)!,width=Math.min(160,b.x+b.width-a.x),height=width*3/8;
 return {x:(a.x+b.x+b.width-width)/2,y:a.y+(Math.min(a.height,b.height)-height)/2,width,height};
}
