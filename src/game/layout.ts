export interface Box {x:number;y:number;width:number;height:number}
export interface Insets {top:number;right:number;bottom:number;left:number}
export type LayoutMode='portrait'|'landscape'|'desktop';
// Shared edges are not overlaps; tolerate floating-point rounding below a CSS subpixel.
export const intersects=(a:Box,b:Box):boolean=>a.x<b.x+b.width-1e-6&&b.x<a.x+a.width-1e-6&&a.y<b.y+b.height-1e-6&&b.y<a.y+a.height-1e-6;
const box=(x:number,y:number,width:number,height:number):Box=>({x,y,width,height});

/** All coordinates and font sizes are CSS pixels, independent of texture DPR. */
export function layout(viewport:{width:number;height:number},safe:Insets,requested?:LayoutMode){
  const mode=requested??(viewport.width<700&&viewport.height>viewport.width?'portrait':viewport.height<500?'landscape':'desktop');
  const compact=mode==='portrait'&&(viewport.width<360||viewport.height-safe.top-safe.bottom<760);
  const width=viewport.width,height=viewport.height;
  const x=safe.left+12,y=safe.top+12,w=width-safe.left-safe.right-24,h=height-safe.top-safe.bottom-24;
  const portrait=mode==='portrait',landscape=mode==='landscape',side=portrait?0:Math.min(landscape?200:244,w*.26),cx=portrait?x:x+side+16,cw=portrait?w:w-side-16;
  const centered=(max:number,top:number,tall:number)=>box(cx+(cw-Math.min(cw,max))/2,top,Math.min(cw,max),tall);
  const shortLandscape=landscape&&h<336;
  const hud=portrait?box(x,y,w,104):box(x,y,side,h-32);
  const jokers=landscape?box(cx,y,cw-144,shortLandscape?48:72):centered(1100,portrait?hud.y+hud.height+8:y,portrait?(width<360?48:82):148);
  const status=portrait?box(cx,y+h-20,cw,20):box(x,y+h-28,side,28);
  const actions=centered(744,y+h-(portrait?76:landscape?52:56),portrait?54:landscape?52:56);
  const handHeight=landscape?(shortLandscape?80:100):portrait?(h<600?112:h<700?144:166):Math.min(184,Math.max(158,h*.23));
  const hand=centered(1100,actions.y-(landscape?8:12)-handHeight,handHeight);
  const handLabel=box(hand.x,hand.y-22,Math.min(116,hand.width*.3),18);
  const piles=box(handLabel.x+handLabel.width,handLabel.y,hand.width-handLabel.width,18);
  const tools=shortLandscape?box(hud.x,hud.y+hud.height-44,side,44):centered(744,hand.y-(portrait?52:landscape?66:74),44);
  const preview=centered(1100,jokers.y+jokers.height+8,(shortLandscape?handLabel.y:tools.y)-jokers.y-jokers.height-16);
  // Short horizontal screens keep the score and landing cards beside one another.
  const scoreBoard=landscape?box(preview.x,preview.y,preview.width*.5-4,preview.height):box(preview.x,preview.y,preview.width,portrait?Math.min(92,preview.height-56):preview.height>=180?108:Math.min(108,Math.max(50,preview.height*.4)));
  const playedArea=landscape?box(scoreBoard.x+scoreBoard.width+8,preview.y,preview.width-scoreBoard.width-8,preview.height):box(preview.x,scoreBoard.y+scoreBoard.height+8,preview.width,preview.height-scoreBoard.height-8);
  const gap=shortLandscape?4:8,toolWidth=(tools.width-3*gap)/4,actionWidth=(actions.width-2*8)/3;
  const buttons={rank:box(tools.x,tools.y,toolWidth,44),suit:box(tools.x+toolWidth+gap,tools.y,toolWidth,44),deck:box(tools.x+2*(toolWidth+gap),tools.y,toolWidth,44),details:box(tools.x+3*(toolWidth+gap),tools.y,toolWidth,44),discard:box(actions.x,actions.y,actionWidth,actions.height),play:box(actions.x+actionWidth+gap,actions.y,actionWidth,actions.height),forward:box(actions.x+2*(actionWidth+gap),actions.y,actionWidth,actions.height)};
  // Keep poker faces vertical even when the hand row has little height.
  const cardWidth=Math.min(portrait?112:132,(hand.height-22)/1.4,hand.width-7*36),pitch=(hand.width-cardWidth)/7;
  const cards=Array.from({length:8},(_,i)=>({visual:box(hand.x+i*pitch,hand.y+22,cardWidth,hand.height-22),hit:box(hand.x+i*pitch,hand.y,Math.min(cardWidth,i===7?cardWidth:pitch),hand.height)}));
  const slotGap=portrait?8:14,slotWidth=Math.min(shortLandscape?34:landscape?48:portrait?90:104,(jokers.width-4*slotGap)/5),rackWidth=5*slotWidth+4*slotGap;
  const slots=Array.from({length:5},(_,i)=>box(landscape?jokers.x+i*jokers.width/5+2:jokers.x+(jokers.width-rackWidth)/2+i*(slotWidth+slotGap),jokers.y,slotWidth,jokers.height));
  // Short horizontal screens keep the illustration vertical and its readable labels beside it.
  const jokerLabels=landscape?slots.map((slot,i)=>box(slot.x+slot.width+6,jokers.y,jokers.width/5-slot.width-12,jokers.height)):slots;
  const tableActions=portrait?{discard:box(actions.x,actions.y,Math.floor((actions.width-8)*.36),actions.height),play:box(actions.x+Math.floor((actions.width-8)*.36)+8,actions.y,actions.width-Math.floor((actions.width-8)*.36)-8,actions.height)}:{discard:buttons.discard,play:buttons.play};
  return {mode,compact,shortLandscape,width,height,hud,jokers,preview,scoreBoard,playedArea,handLabel,piles,tools,hand,actions,status,buttons,tableActions,cards,slots,jokerLabels};
}
export type TableLayout=ReturnType<typeof layout>;
