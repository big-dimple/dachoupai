export interface Box {x:number;y:number;width:number;height:number}
export interface Insets {top:number;right:number;bottom:number;left:number}
export type LayoutMode='portrait'|'landscape'|'desktop';
export interface HandWindow {count:number;start?:number}
// Shared edges are not overlaps; tolerate floating-point rounding below a CSS subpixel.
export const intersects=(a:Box,b:Box):boolean=>a.x<b.x+b.width-1e-6&&b.x<a.x+a.width-1e-6&&a.y<b.y+b.height-1e-6&&b.y<a.y+a.height-1e-6;
const box=(x:number,y:number,width:number,height:number):Box=>({x,y,width,height});

/** All coordinates and font sizes are CSS pixels, independent of texture DPR. */
export function layout(viewport:{width:number;height:number},safe:Insets,requested?:LayoutMode,handWindow:HandWindow={count:8}){
  const mode=requested??(viewport.width<700&&viewport.height>viewport.width?'portrait':viewport.height<500?'landscape':'desktop');
  const width=viewport.width,height=viewport.height,portrait=mode==='portrait',landscape=mode==='landscape';
  const compact=portrait&&(width<360||height-safe.top-safe.bottom<760);
  // Nine seats take priority over decorative table margins. 320px uses 31px exposed
  // columns (14px rank/suit), while 360px and up keep at least 36px per seat.
  const margin=portrait&&width<380?8:12;
  const x=safe.left+margin,y=safe.top+12,w=width-safe.left-safe.right-margin*2,h=height-safe.top-safe.bottom-24;
  const side=portrait?0:Math.min(landscape?160:184,w*.26),cx=portrait?x:x+side+16,cw=portrait?w:w-side-16;
  const centered=(max:number,top:number,tall:number)=>box(cx+(cw-Math.min(cw,max))/2,top,Math.min(cw,max),tall);
  const count=Number.isSafeInteger(handWindow.count)&&handWindow.count>=0?handWindow.count:8;
  const narrow=portrait&&h<580,gap=narrow||landscape?4:8;
  const status=portrait?box(cx,y+h-20,cw,20):box(x,y+h-28,side,28);
  const actions=centered(744,y+h-(portrait?76:landscape?52:56),portrait?54:landscape?52:56);
  // 44px browser/menu controls plus the measured 14px coin line and a 2px gap.
  const hud=portrait?box(x,y,w,60):box(x,y,side,h-32);
  const handWidth=Math.min(1100,cw),ninePitch=width<360?30:36;
  const preferredCardWidth=portrait?Math.min(72,handWidth-8*ninePitch):132;
  // Allocate the score's actual three text rows and a separate fire edge before
  // spending spare height on illustrations. Short screens move sorting into HUD.
  const minScoreHeight=landscape?80:narrow?76:88;
  const desiredHandHeight=portrait?Math.max(48,preferredCardWidth)*1.4+22:landscape?122:184;
  // One name row, up to two benefit rows and an independent 18px rarity footer.
  const desiredJokerHeight=portrait?80:landscape?72:112;
  const mainTop=portrait?hud.y+hud.height+gap:y;
  const mainHeight=actions.y-gap-mainTop;
  const toolsInHud=landscape&&mainHeight-desiredJokerHeight-desiredHandHeight-22-44-gap*4<minScoreHeight;
  const shortLandscape=landscape&&toolsInHud;
  const labelHeight=landscape&&mainHeight<300?0:portrait?0:22;
  const minPlayedHeight=portrait?(narrow?26:48):0;
  const toolsHeight=toolsInHud?0:44;
  const available=mainHeight-minScoreHeight-minPlayedHeight-toolsHeight-labelHeight-gap*(toolsInHud?2:4);
  const jokerHeight=Math.min(desiredJokerHeight,Math.max(landscape?44:portrait?80:56,available-desiredHandHeight));
  const handHeight=Math.min(desiredHandHeight,Math.max(landscape?64:78,available-jokerHeight));
  const jokers=landscape?box(cx,mainTop,cw-144,jokerHeight):centered(1100,mainTop,jokerHeight);
  const hand=centered(1100,actions.y-gap-handHeight,handHeight);
  const handLabel=box(hand.x,hand.y-labelHeight,Math.min(116,hand.width*.3),labelHeight||18);
  const piles=box(handLabel.x+handLabel.width,handLabel.y,hand.width-handLabel.width,labelHeight||18);
  const tools=toolsInHud?box(hud.x,hud.y+hud.height-44,side,44):centered(portrait?168:240,hand.y-labelHeight-gap-44,44);
  const previewBottom=toolsInHud?hand.y-labelHeight-gap:tools.y-gap;
  const preview=centered(1100,jokers.y+jokers.height+gap,previewBottom-jokers.y-jokers.height-gap);
  const scoreHeight=landscape?preview.height:Math.min(108,preview.height-minPlayedHeight-gap);
  const scoreBoard=landscape?box(preview.x,preview.y,preview.width*.5-4,scoreHeight):box(preview.x,preview.y,preview.width,scoreHeight);
  const playedArea=landscape?box(scoreBoard.x+scoreBoard.width+8,preview.y,preview.width-scoreBoard.width-8,preview.height):box(preview.x,scoreBoard.y+scoreBoard.height+gap,preview.width,preview.height-scoreBoard.height-gap);
  // Rendering also checks real font bounds; this footer is reserved, not a z-order trick.
  const scoreFire=box(scoreBoard.x+3,scoreBoard.y+scoreBoard.height-18,scoreBoard.width-6,16);
  const toolGap=4,toolWidth=(tools.width-toolGap)/2;
  const buttons={rank:box(tools.x,tools.y,toolWidth,44),suit:box(tools.x+toolWidth+toolGap,tools.y,toolWidth,44)};
  const seatPitch=portrait&&count<=9?ninePitch:36;
  const cardWidth=Math.min(portrait?Math.max(48,preferredCardWidth):132,(hand.height-22)/1.4,hand.width-7*36);
  const handOverflow=count>Math.floor((hand.width-cardWidth)/seatPitch)+1;
  const cardArea=handOverflow?box(hand.x+48,hand.y,hand.width-96,hand.height):hand;
  const visibleCardCount=Math.min(count,Math.max(1,Math.floor((cardArea.width-cardWidth)/seatPitch)+1));
  const handStart=Math.max(0,Math.min(count-visibleCardCount,Number.isSafeInteger(handWindow.start)?handWindow.start!:0));
  const pitch=visibleCardCount>1?(cardArea.width-cardWidth)/(visibleCardCount-1):0;
  const cardHeight=cardWidth*1.4;
  const cards=Array.from({length:count},(_,i)=>{
    const visible=i>=handStart&&i<handStart+visibleCardCount,cardX=cardArea.x+(visibleCardCount===1?(cardArea.width-cardWidth)/2:(i-handStart)*pitch);
    return {visible,visual:box(cardX,hand.y+22,cardWidth,cardHeight),hit:box(cardX,hand.y,Math.min(cardWidth,i===handStart+visibleCardCount-1?cardWidth:pitch||cardWidth),hand.height)};
  });
  const handNavigation={previous:box(hand.x,hand.y+(hand.height-44)/2,44,44),next:box(hand.x+hand.width-44,hand.y+(hand.height-44)/2,44,44)};
  const slotGap=portrait?8:14,slotWidth=Math.min(shortLandscape?34:landscape?48:portrait?90:104,(jokers.width-4*slotGap)/5),rackWidth=5*slotWidth+4*slotGap;
  const slots=Array.from({length:5},(_,i)=>box(landscape?jokers.x+i*jokers.width/5+2:jokers.x+(jokers.width-rackWidth)/2+i*(slotWidth+slotGap),jokers.y,slotWidth,jokers.height));
  // Short horizontal screens keep the illustration vertical and its readable labels beside it.
  const jokerLabels=landscape?slots.map((slot,i)=>box(slot.x+slot.width+6,jokers.y,jokers.width/5-slot.width-12,jokers.height)):slots;
  const discardWidth=Math.floor((actions.width-8)*.36);
  const tableActions={discard:box(actions.x,actions.y,discardWidth,actions.height),play:box(actions.x+discardWidth+8,actions.y,actions.width-discardWidth-8,actions.height)};
  return {mode,compact,shortLandscape,width,height,hud,jokers,preview,scoreBoard,playedArea,handLabel,piles,tools,hand,actions,status,scoreFire,toolsInHud,labelHeight,buttons,tableActions,cards,handOverflow,handStart,visibleCardCount,handNavigation,slots,jokerLabels};
}
export type TableLayout=ReturnType<typeof layout>;
