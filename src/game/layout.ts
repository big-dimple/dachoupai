export interface Box {x:number;y:number;width:number;height:number}
export interface Insets {top:number;right:number;bottom:number;left:number}
export type LayoutMode='portrait'|'landscape'|'desktop';
export interface HandWindow {count:number;start?:number}
// Shared edges are not overlaps; tolerate floating-point rounding below a CSS subpixel.
export const intersects=(a:Box,b:Box):boolean=>a.x<b.x+b.width-1e-6&&b.x<a.x+a.width-1e-6&&a.y<b.y+b.height-1e-6&&b.y<a.y+a.height-1e-6;
const box=(x:number,y:number,width:number,height:number):Box=>({x,y,width,height});

/** All coordinates and font sizes are CSS pixels, independent of texture DPR. */
function capacityLayout(viewport:{width:number;height:number},safe:Insets,requested?:LayoutMode,handWindow:HandWindow={count:8}){
  // The full sidebar needs room for its history as well as HUD/score/inventory.
  // Reuse the existing short layout when safe insets leave less than that budget.
  const usableHeight=viewport.height-safe.top-safe.bottom;
  const mode=requested??(viewport.width<700&&viewport.height>viewport.width?'portrait':usableHeight<560?'landscape':'desktop');
  const width=viewport.width,height=viewport.height,portrait=mode==='portrait',landscape=mode==='landscape';
  const compact=portrait&&(width<360||height-safe.top-safe.bottom<760);
  // Nine seats take priority over decorative table margins. 320px uses 31px exposed
  // columns (14px rank/suit), while 360px and up keep at least 36px per seat.
  const margin=portrait&&width<380?8:12;
  const x=safe.left+margin,y=safe.top+12,w=width-safe.left-safe.right-margin*2,h=height-safe.top-safe.bottom-24;
  const side=portrait?0:Math.min(landscape?160:184,w*.26),cx=portrait?x:x+side+16,cw=portrait?w:w-side-16;
  const centered=(max:number,top:number,tall:number)=>box(cx+(cw-Math.min(cw,max))/2,top,Math.min(cw,max),tall);
  const count=Number.isSafeInteger(handWindow.count)&&handWindow.count>=0?handWindow.count:8;
  const expanded=portrait&&count>=10&&count<=14;
  const narrow=portrait&&h<580,gap=narrow||landscape||expanded?4:8;
  const status=portrait?box(cx,y+h-20,cw,20):box(x,y+h-28,side,28);
  const actions=centered(744,y+h-(portrait?76:landscape?52:56),portrait?54:landscape?52:56);
  // 44px browser/menu controls plus the measured 14px coin line and a 2px gap.
  const hud=portrait?box(x,y,w,60):box(x,y,side,h-32);
  const handWidth=Math.min(1100,cw),ninePitch=width<360?30:36;
  const preferredCardWidth=portrait?Math.min(72,handWidth-8*ninePitch):132;
  // Allocate the score's actual three text rows and a separate fire edge before
  // spending spare height on illustrations. Short screens move sorting into HUD.
  const minScoreHeight=landscape?80:narrow?76:88;
  const singleHandHeight=portrait?Math.max(48,preferredCardWidth)*1.4+22:landscape?122:184;
  const twoRowCardWidth=Math.min(64,handWidth-6*36);
  const desiredHandHeight=expanded?2*(twoRowCardWidth*1.4+22):singleHandHeight;
  // One name row, up to two benefit rows and an independent 18px rarity footer.
  const desiredJokerHeight=portrait?80:landscape?72:112;
  const mainTop=portrait?hud.y+hud.height+gap:y;
  const mainHeight=actions.y-gap-mainTop;
  const toolsInHud=landscape&&mainHeight-desiredJokerHeight-desiredHandHeight-22-44-gap*4<minScoreHeight;
  const shortLandscape=landscape&&toolsInHud;
  const labelHeight=landscape&&mainHeight<300?0:portrait?0:22;
  const minPlayedHeight=portrait?(narrow||expanded?26:48):0;
  const toolsHeight=toolsInHud?0:44;
  const available=mainHeight-minScoreHeight-minPlayedHeight-toolsHeight-labelHeight-gap*(toolsInHud?2:4);
  // Keep two complete 52px faces plus each row's independent 22px lift reserve.
  // Very short viewports retain a reachable window instead of clipping either row.
  const handRows=expanded&&available-desiredJokerHeight>=2*(52*1.4+22)?2:1;
  const jokerHeight=Math.min(desiredJokerHeight,Math.max(landscape?44:portrait?80:56,available-desiredHandHeight));
  const handHeight=Math.min(handRows===2?desiredHandHeight:singleHandHeight,Math.max(landscape?64:78,available-jokerHeight));
  const jokers=landscape?box(cx,mainTop,cw-144,jokerHeight):centered(1100,mainTop,jokerHeight);
  const hand=centered(1100,actions.y-gap-handHeight,handHeight);
  const handLabel=box(hand.x,hand.y-labelHeight,Math.min(116,hand.width*.3),labelHeight||18);
  const piles=box(handLabel.x+handLabel.width,handLabel.y,hand.width-handLabel.width,labelHeight||18);
  const tools=toolsInHud?box(hud.x,hud.y+hud.height-44,side,44):centered(portrait?168:240,hand.y-labelHeight-gap-44,44);
  const previewBottom=toolsInHud?hand.y-labelHeight-gap:tools.y-gap;
  const preview=centered(1100,jokers.y+jokers.height+gap,previewBottom-jokers.y-jokers.height-gap);
  // A complete five-card preview also needs its source row (36px) and padding.
  // Spend only spare preview height on fire, never the existing hand geometry.
  const scoreHeight=landscape?preview.height:Math.min(132,preview.height-minPlayedHeight-gap,Math.max(minScoreHeight,preview.height-104-gap));
  const scoreBoard=landscape?box(preview.x,preview.y,preview.width*.5-4,scoreHeight):box(preview.x,preview.y,preview.width,scoreHeight);
  const playedArea=landscape?box(scoreBoard.x+scoreBoard.width+8,preview.y,preview.width-scoreBoard.width-8,preview.height):box(preview.x,scoreBoard.y+scoreBoard.height+gap,preview.width,preview.height-scoreBoard.height-gap);
  // Rendering also checks real font bounds; this footer is reserved, not a z-order trick.
  const fireHeight=scoreBoard.height>=124?40:scoreBoard.height>=116?32:24;
  const scoreFire=box(scoreBoard.x+3,scoreBoard.y+scoreBoard.height-fireHeight-2,scoreBoard.width-6,fireHeight);
  const toolGap=4,toolWidth=(tools.width-toolGap)/2;
  const buttons={rank:box(tools.x,tools.y,toolWidth,44),suit:box(tools.x+toolWidth+toolGap,tools.y,toolWidth,44)};
  const seatPitch=portrait&&count<=9?ninePitch:36;
  const rowHeight=hand.height/handRows,columns=handRows===2?Math.ceil(count/2):count;
  const cardWidth=Math.min(handRows===2?twoRowCardWidth:portrait?Math.max(48,preferredCardWidth):132,(rowHeight-22)/1.4,hand.width-(handRows===2?6:7)*36);
  const handOverflow=handRows===1&&count>Math.floor((hand.width-cardWidth)/seatPitch)+1;
  const cardArea=handOverflow?box(hand.x+48,hand.y,hand.width-96,hand.height):hand;
  const visibleCardCount=handRows===2?count:Math.min(count,Math.max(1,Math.floor((cardArea.width-cardWidth)/seatPitch)+1));
  const handStart=Math.max(0,Math.min(count-visibleCardCount,Number.isSafeInteger(handWindow.start)?handWindow.start!:0));
  const pitch=(handRows===2?columns:visibleCardCount)>1?(cardArea.width-cardWidth)/((handRows===2?columns:visibleCardCount)-1):0;
  const cardHeight=cardWidth*1.4;
  const cards=Array.from({length:count},(_,i)=>{
    const row=handRows===2?Math.floor(i/columns):0,column=handRows===2?i%columns:i-handStart;
    const visible=i>=handStart&&i<handStart+visibleCardCount,cardX=cardArea.x+(visibleCardCount===1?(cardArea.width-cardWidth)/2:column*pitch),rowY=hand.y+row*rowHeight;
    const rowLast=handRows===2?column===columns-1||i===count-1:i===handStart+visibleCardCount-1;
    return {visible,visual:box(cardX,rowY+22,cardWidth,cardHeight),hit:box(cardX,rowY,Math.min(cardWidth,rowLast?cardWidth:pitch||cardWidth),rowHeight)};
  });
  const handNavigation={previous:box(hand.x,hand.y+(hand.height-44)/2,44,44),next:box(hand.x+hand.width-44,hand.y+(hand.height-44)/2,44,44)};
  const slotGap=portrait?8:14,slotWidth=Math.min(shortLandscape?34:landscape?48:portrait?90:104,(jokers.width-4*slotGap)/5),rackWidth=5*slotWidth+4*slotGap;
  const slots=Array.from({length:5},(_,i)=>box(landscape?jokers.x+i*jokers.width/5+2:jokers.x+(jokers.width-rackWidth)/2+i*(slotWidth+slotGap),jokers.y,slotWidth,jokers.height));
  // Short horizontal screens keep the illustration vertical and its readable labels beside it.
  const jokerLabels=landscape?slots.map((slot,i)=>box(slot.x+slot.width+6,jokers.y,jokers.width/5-slot.width-12,jokers.height)):slots;
  const discardWidth=Math.floor((actions.width-8)*.36);
  const tableActions={discard:box(actions.x,actions.y,discardWidth,actions.height),play:box(actions.x+discardWidth+8,actions.y,actions.width-discardWidth-8,actions.height)};
  return {mode,compact,shortLandscape,width,height,hud,jokers,preview,scoreBoard,playedArea,handLabel,piles,tools,hand,actions,status,scoreFire,toolsInHud,labelHeight,buttons,tableActions,cards,handRows,handOverflow,handStart,visibleCardCount,handNavigation,slots,jokerLabels};
}
/** Numeric cells share the total's fire base, rather than an equal-width table. */
export function scoreCells(s:Box){
  if(s.height<108){const secondary=s.width*.52;return [box(s.x+6,s.y+36,secondary/2-10,24),box(s.x+secondary/2+2,s.y+36,secondary/2-8,24),box(s.x+secondary+6,s.y+s.height-35,s.width-secondary-12,32)];}
  const narrow=s.width<260,split=narrow?.43:.38,secondary=s.width*split;
  return [box(s.x+8,s.y+43,secondary-12,24),box(s.x+8,s.y+Math.min(88,s.height-25),secondary-12,24),box(s.x+secondary+4,s.y+s.height-49,s.width-secondary-12,43)];
}
/** Opaque foreground protects the total; the fire is a continuous background. */
export function scorePedestal(s:Box):Box|undefined {
  const total=scoreCells(s)[2];return s.height<108?box(total.x-4,total.y-3,total.width+8,36):box(total.x-4,total.y-22,total.width+8,69);
}
export function layout(viewport:{width:number;height:number},safe:Insets,requested?:LayoutMode,handWindow:HandWindow={count:8}){
  const l=capacityLayout(viewport,safe,requested,handWindow),{width,height}=viewport,count=l.cards.length;
  const portrait=l.mode==='portrait',desktop=l.mode==='desktop';
  const cardWidth=portrait?(count>=10?64:width<380?52:64):Math.min(104,Math.max(88,(height-safe.top-safe.bottom)*.13));
  const rows=portrait&&count>=10&&count<=14?2:1,handHeight=rows*(cardWidth*1.4+22);
  const net=height-safe.top-safe.bottom;
  const scoreBudget=net-(52+89.6+18+88+handHeight+56+20+16+18)-.01;
  if((portrait&&width>=360&&count<=14&&scoreBudget>=108)||desktop){
    const x=safe.left+(portrait?(width<380?8:12):12),w=width-safe.left-safe.right-2*(portrait?(width<380?8:12):12);
    const railWidth=desktop&&width>=1180&&height>=600?148:0;
    const mainW=portrait?w:Math.min(1100,w-240-railWidth),mainX=portrait?x:x+240+(w-240-railWidth-mainW)/2;
    l.hud=box(x,safe.top+8,portrait?w:224,portrait?52:250);
    l.status=box(mainX,height-safe.bottom-28,mainW,20);
    const actionW=portrait?mainW:Math.min(480,mainW),actionX=mainX+(mainW-actionW)/2;
    l.actions=box(actionX,l.status.y-60,actionW,56);
    l.hand=box(mainX,l.actions.y-4-handHeight,mainW,handHeight);
    const rackWidthLimit=portrait?64:80;
    l.jokers=box(mainX,portrait?l.hud.y+54:safe.top+64,mainW,rackWidthLimit*1.4);
    const slotGap=6,slotWidth=Math.min(rackWidthLimit,(mainW-4*slotGap)/5),rackWidth=5*slotWidth+4*slotGap;
    l.slots=Array.from({length:5},(_,i)=>box(mainX+(mainW-rackWidth)/2+i*(slotWidth+slotGap),l.jokers.y,slotWidth,slotWidth*1.4));l.jokerLabels=l.slots;
    l.scoreBoard=portrait?box(mainX,l.jokers.y+91.6,mainW,Math.min(rows===2?120:132,scoreBudget)):box(x,l.hud.y+l.hud.height+12,224,164);
    const playedTop=portrait?l.scoreBoard.y+l.scoreBoard.height+20:l.jokers.y+l.jokers.height+22.4;
    l.playedArea=box(mainX,playedTop,mainW,l.hand.y-4-playedTop);
    l.preview=portrait?box(mainX,l.scoreBoard.y,mainW,l.hand.y-4-l.scoreBoard.y):l.playedArea;
    const sortX=l.actions.x+76;
    l.buttons={rank:box(sortX,l.actions.y,44,56),suit:box(sortX+50,l.actions.y,44,56)};
    l.tableActions={discard:box(l.actions.x,l.actions.y,70,56),play:box(sortX+100,l.actions.y,l.actions.width-176,56)};
    l.tools=box(sortX,l.actions.y,94,56);l.toolsInHud=false;l.labelHeight=0;
    l.handLabel=box(mainX,l.hand.y-18,116,18);l.piles=box(mainX+116,l.hand.y-18,mainW-116,18);
    const columns=rows===2?Math.ceil(count/2):count;
    // Compute capacity from the final hand, including the two arrow gutters.
    l.handRows=rows;l.handOverflow=rows===1&&count>Math.floor((mainW-cardWidth)/36)+1;
    const cardArea=l.handOverflow?box(mainX+48,l.hand.y,mainW-96,handHeight):l.hand;
    l.visibleCardCount=rows===2?count:Math.min(count,Math.max(1,Math.floor((cardArea.width-cardWidth)/36)+1));
    l.handStart=Math.max(0,Math.min(count-l.visibleCardCount,Number.isSafeInteger(handWindow.start)?handWindow.start!:0));
    const visibleColumns=rows===2?columns:l.visibleCardCount;
    const bandWidth=portrait?cardArea.width:Math.min(cardArea.width,cardWidth*visibleColumns+8*Math.max(0,visibleColumns-1)),bandX=cardArea.x+(cardArea.width-bandWidth)/2,pitch=visibleColumns>1?(bandWidth-cardWidth)/(visibleColumns-1):0,rowHeight=handHeight/rows;
    l.cards=Array.from({length:count},(_,i)=>{const row=rows===2?Math.floor(i/columns):0,col=rows===2?i%columns:i-l.handStart,last=col===visibleColumns-1||i===count-1,seatX=bandX+(visibleColumns===1?(bandWidth-cardWidth)/2:col*pitch),seatY=l.hand.y+row*rowHeight;return {visible:i>=l.handStart&&i<l.handStart+l.visibleCardCount,visual:box(seatX,seatY+22,cardWidth,cardWidth*1.4),hit:box(seatX,seatY,last?cardWidth:Math.min(cardWidth,pitch),rowHeight)};});
    if(desktop)l.handNavigation={previous:box(l.hand.x,l.hand.y+(l.hand.height-44)/2,44,44),next:box(l.hand.x+l.hand.width-44,l.hand.y+(l.hand.height-44)/2,44,44)};
  }
  // On capacity-limited short screens retain the established readable window.
  // Every troupe exterior still has the same 5:7 proportion.
  if(!(portrait&&scoreBudget>=108)&&!desktop)l.slots=l.slots.map(b=>({...b,height:Math.min(b.height,b.width*1.4)}));
  const s=l.scoreBoard,primary=scoreCells(s)[2];
  const pedestal=scorePedestal(s);
  const fireTop=s.y+(s.height>=108?26:2);
  l.scoreFire=pedestal?box(pedestal.x,fireTop,pedestal.width,pedestal.y+1-fireTop):box(primary.x-3,s.y+28,primary.width+6,s.height-32);
  // Reuse the existing action row. Capacity/hand/score budgets above stay exact.
  const sortWidth=88,gap=6,remaining=l.actions.width-sortWidth-2*gap;
  const discardWidth=Math.min(remaining-44,Math.max(l.tableActions.discard.width+8,Math.min(112,Math.floor(remaining*.4))));
  const {x,y,height:actionHeight}=l.actions;
  const originalActions={discard:box(x+sortWidth+gap,y,discardWidth,actionHeight),play:box(x+sortWidth+2*gap+discardWidth,y,remaining-discardWidth,actionHeight)};
  // Sorting uses the existing utility row on phones. Wider tables extend its
  // former bottom group leftward; neither submit nor discard loses any width.
  const tools=portrait?box(l.hand.x,l.hand.y-48,132,44):box(x-44,y,132,actionHeight);
  const buttons={rank:box(tools.x,tools.y,44,tools.height),suit:box(tools.x+44,tools.y,44,tools.height),ai:box(tools.x+88,tools.y,44,tools.height)};
  const actionStart=portrait&&!l.handOverflow?x+(sortWidth+gap)/2:x+sortWidth+gap;
  const tableActions=portrait&&!l.handOverflow?{discard:box(actionStart,y,discardWidth,actionHeight),play:box(actionStart+discardWidth+gap,y,remaining-discardWidth,actionHeight)}:originalActions;
  const status=l.mode==='landscape'?{...l.status,width:Math.min(l.status.width,tools.x-l.status.x-6)}:l.status;
  if(desktop&&width>=1180&&height>=600){const rail=box(l.hand.x+l.hand.width+12,l.hand.y,132,168);return {...l,buttons:{rank:box(rail.x,rail.y,132,48),suit:box(rail.x,rail.y+56,132,48),ai:box(rail.x,rail.y+112,132,48)},tools:rail,toolsInHud:false,tableActions:{discard:box(x,y,Math.max(112,discardWidth),actionHeight),play:box(x+Math.max(112,discardWidth)+gap,y,l.actions.width-Math.max(112,discardWidth)-gap,actionHeight)},status};}
  return {...l,buttons,tools,toolsInHud:false,tableActions,status};
}
export type TableLayout=ReturnType<typeof layout>;

/** Visual mat follows the five-card footprint; logical played area stays unchanged. */
export function playedFootprint(area:Box,portrait:boolean):Box {
 const scale=portrait?1:Math.min(1.25,Math.max(1,area.width/900),Math.max(1,area.height/500));
 const width=Math.min(area.width,portrait?316:Math.min(600,540*scale)),height=Math.min(area.height,portrait?100:160*scale);return box(area.x+(area.width-width)/2,area.y+(area.height-height)/2,width,height);
}
