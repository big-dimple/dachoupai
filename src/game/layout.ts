export interface Box {x:number;y:number;width:number;height:number}
export interface Insets {top:number;right:number;bottom:number;left:number}
export type LayoutMode='portrait'|'landscape'|'desktop';
// Shared edges are not overlaps; tolerate floating-point rounding below a CSS subpixel.
export const intersects=(a:Box,b:Box):boolean=>a.x<b.x+b.width-1e-6&&b.x<a.x+a.width-1e-6&&a.y<b.y+b.height-1e-6&&b.y<a.y+a.height-1e-6;
const box=(x:number,y:number,width:number,height:number):Box=>({x,y,width,height});

/** All coordinates and font sizes are CSS pixels, independent of texture DPR. */
export function layout(viewport:{width:number;height:number},safe:Insets,requested?:LayoutMode){
  const mode=requested??(viewport.width<700&&viewport.height>viewport.width?'portrait':viewport.height<500?'landscape':'desktop');
  const compact=mode==='portrait'&&(viewport.width<360||viewport.height-safe.top-safe.bottom<640);
  const width=viewport.width,height=viewport.height;
  const x=safe.left+12,y=safe.top+12,w=width-safe.left-safe.right-24,h=height-safe.top-safe.bottom-24;
  const portrait=mode==='portrait',side=portrait?0:Math.min(220,w*.26),cx=portrait?x:x+side+12,cw=portrait?w:w-side-12;
  const hud=portrait?box(x,y,w,compact?96:128):box(x,y,side,h-32);
  const jokers=box(cx,portrait?y+(compact?104:136):y,portrait?cw:cw-76,portrait?(compact?60:68):mode==='landscape'?68:88);
  const toolsY=y+h-(portrait?296:mode==='landscape'?212:296);
  const preview=box(cx,jokers.y+jokers.height+12,cw,Math.max(64,toolsY-jokers.y-jokers.height-24));
  const tools=box(cx,toolsY,cw,44),hand=box(cx,toolsY+56,cw,portrait?144:mode==='landscape'?96:144);
  const actions=box(cx,y+h-88,cw,56),status=portrait?box(cx,y+h-24,cw,24):box(x,y+h-28,side,28);
  // Landscape has a compact toolbar/card rail above its fixed action row.
  if(mode==='landscape'){tools.y=y+156;hand.y=y+212;actions.y=y+h-52;actions.height=52;preview.height=64;}
  const gap=8,toolWidth=(cw-3*gap)/4,actionWidth=(cw-2*gap)/3;
  const buttons={rank:box(cx,tools.y,toolWidth,44),suit:box(cx+toolWidth+gap,tools.y,toolWidth,44),deck:box(cx+2*(toolWidth+gap),tools.y,toolWidth,44),details:box(cx+3*(toolWidth+gap),tools.y,toolWidth,44),discard:box(cx,actions.y,actionWidth,actions.height),play:box(cx+actionWidth+gap,actions.y,actionWidth,actions.height),forward:box(cx+2*(actionWidth+gap),actions.y,actionWidth,actions.height)};
  const cardWidth=Math.min(112,hand.width-7*36),pitch=(hand.width-cardWidth)/7;
  const cards=Array.from({length:8},(_,i)=>({visual:box(hand.x+i*pitch,hand.y+18,cardWidth,hand.height-18),hit:box(hand.x+i*pitch,hand.y,Math.min(cardWidth,i===7?cardWidth:pitch),hand.height)}));
  const cols=portrait?2:3,rows=6/cols,cgap=12,ch=(h-68-(rows-1)*cgap)/rows,cwidth=(w-(cols-1)*cgap)/cols;
  const characterCards=Array.from({length:6},(_,i)=>box(x+(i%cols)*(cwidth+cgap),y+56+Math.floor(i/cols)*(ch+cgap),cwidth,ch));
  const slotWidth=(jokers.width-4*8)/5,slots=Array.from({length:5},(_,i)=>box(cx+i*(slotWidth+8),jokers.y,slotWidth,jokers.height));
  const shopToolsY=jokers.y+jokers.height+8,shopToolWidth=(cw-8)/2;
  const shopTools={chapter:box(cx,shopToolsY,shopToolWidth,44),items:box(cx+shopToolWidth+8,shopToolsY,shopToolWidth,44)};
  const shelfTop=shopToolsY+56,shelfHeight=Math.max(80,actions.y-shelfTop-24),shelfWidth=(cw-2*12)/3;
  const shelf=Array.from({length:3},(_,i)=>box(cx+i*(shelfWidth+12),shelfTop,shelfWidth,shelfHeight));
  return {mode,compact,width,height,bodyFont:14,numberFont:22,hud,jokers,preview,tools,hand,actions,status,buttons,shopTools,cards,characterCards,slots,shelf};
}
export type TableLayout=ReturnType<typeof layout>;
