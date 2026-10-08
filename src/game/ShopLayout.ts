import type {Box} from './layout';
/** The old copy allowance is not a licence to place invisible targets over shop actions. */
export function shopOwnedHitBox(card:Box,actionTop:number,expanded:boolean):Box {
  return {...card,height:Math.min(card.height+(expanded?22:0),Math.max(card.height,actionTop-card.y-4))};
}
/** Compact names may use the paper gap, without touching the next card or screen edge. */
export function shopOwnedNameArea(card:Box,nextX:number|undefined,viewportWidth:number){
  if(card.width>=64)return {x:card.x+3,width:card.width-6};
  const x=card.x+1;
  return {x,width:Math.min((nextX??card.x+card.width+6)-x-1,viewportWidth-8-x)};
}
function shortShopLayout(width:number,height:number,top:number,bottom:number,cols:number){
  const x=12,w=width-24,collapsed=width<760,inventoryWidth=collapsed?0:252,goodsX=x+(collapsed?0:268),goodsWidth=w-(collapsed?0:268),seat=(goodsWidth-8*(cols-1))/cols;
  // `top` is the shared HUD/DOM toolbar top. Keep the 44px tools clear
  // before tabs, then leave 2px between the 44px tabs and the goods.
  const tabsY=top+44+4;
  const cardWidth=88,cardHeight=123.2,shelf:Box[]=Array.from({length:cols},(_,i)=>({x:goodsX+i*(seat+8),y:tabsY+44+2,width:cardWidth,height:cardHeight}));
  const playY=height-bottom-80,secondaryY=playY-52;
  const slotY=Math.min(top+52,secondaryY-61.6-4);
  const slots:Box[]=Array.from({length:5},(_,i)=>({x:x+i*52,y:slotY,width:44,height:61.6}));
  return {x,w,top,pc:null,desktop:false,short:true,compact:true,wideHeader:false,portrait:false,copyBeside:true,inventoryCollapsed:collapsed,slots,shelf,
    tabs:{x:goodsX,y:tabsY,width:goodsWidth,height:44},chapter:{x,y:secondaryY,width:inventoryWidth,height:44},items:{x,y:secondaryY,width:inventoryWidth,height:44},
    reroll:{x:collapsed?x+60:x,y:collapsed?top:secondaryY,width:collapsed?104:122,height:44},build:{x:collapsed?x+172:x+130,y:collapsed?top:secondaryY,width:120,height:44},
    play:{x,y:playY,width:collapsed?w:inventoryWidth,height:56},noticeY:playY+60};
}

/** Left state, upper owned resources, lower sale panel. Short PC reuses the short branch. */
function desktopShopLayout(width:number,height:number,top:number,bottom:number,_cols:number){
  const w=Math.min(1480,width-48),x=(width-w)/2,leftWidth=width>=1600?248:224,gap=width>=1600?32:24,rightX=x+leftWidth+gap,rightWidth=w-leftWidth-gap;
  const usableHeight=height-top-bottom;
  const ownedWidth=width>=1600&&usableHeight>=800?96:80,ownedHeight=ownedWidth*1.4,slotY=top+56;
  const slots:Box[]=Array.from({length:5},(_,i)=>({x:rightX+i*(ownedWidth+12),y:slotY,width:ownedWidth,height:ownedHeight}));
  const ownedRail={x:rightX,y:top,width:rightWidth,height:56+ownedHeight};
  const inventoryEntry={x:rightX+rightWidth-168,y:top+64,width:168,height:44};
  const shopPanel={x:rightX,y:slotY+ownedHeight+24,width:rightWidth,height:height-bottom-8-(slotY+ownedHeight+24)};
  const actionWidth=width>=1600?144:128,goodsX=shopPanel.x+actionWidth+32,goodsWidth=shopPanel.width-actionWidth-48;
  // Reserve the lower 128px goods row, its headings and the feedback gap first.
  const faceHeightBudget=usableHeight-332-ownedHeight-128;
  const seat=(goodsWidth-24)/3,cardWidth=width>=1600?Math.min(144,faceHeightBudget/1.4):Math.min(128,faceHeightBudget/1.4),cardHeight=cardWidth*1.4;
  const upperY=shopPanel.y+28,upperHeight=cardHeight+136;
  const jokerOffers:Box[]=Array.from({length:3},(_,i)=>({x:goodsX+i*(seat+12),y:upperY,width:seat,height:upperHeight}));
  const shelf=jokerOffers.map(b=>({x:b.x+(b.width-cardWidth)/2,y:b.y+6,width:cardWidth,height:cardHeight}));
  const groupY=upperY+upperHeight+24,groupWidth=(goodsWidth-16)/2,lowerY=groupY+24,lowerHeight=Math.max(96,Math.min(width>=1600?128:160,shopPanel.y+shopPanel.height-32-lowerY));
  const toolOffers={x:goodsX,y:lowerY,width:groupWidth,height:lowerHeight},itemOffers={x:goodsX+groupWidth+16,y:lowerY,width:groupWidth,height:lowerHeight};
  const feedback={x:shopPanel.x+12,y:shopPanel.y+shopPanel.height-24,width:shopPanel.width-24,height:20};
  const play={x:shopPanel.x+12,y:shopPanel.y+28,width:actionWidth,height:56},reroll={x:play.x,y:play.y+68,width:actionWidth,height:44};
  const build={x:Math.min(rightX+5*(ownedWidth+12)+12,width-292),y:top+6,width:132,height:44};
  const chapter={x,y:top+176,width:leftWidth,height:44};
  const pc={left:{x,y:top,width:leftWidth,height:shopPanel.y+shopPanel.height-top},ownedRail,inventoryEntry,shopPanel,actionRail:{x:play.x,y:play.y,width:actionWidth,height:shopPanel.height-52},jokerOffers,toolOffers,itemOffers,feedback,groupY};
  return {x,w,top,pc,desktop:true,short:false,copyBeside:false,inventoryCollapsed:false,compact:false,wideHeader:false,portrait:false,slots,shelf,
    tabs:{x:goodsX,y:shopPanel.y+4,width:goodsWidth,height:20},chapter,items:inventoryEntry,build,reroll,play,noticeY:feedback.y};
}

export function shopLayout(width:number,height:number,top:number,bottom:number,cols:number,ownedCopy=false){
  if(width>=1000){if(height-top-bottom<712)return shortShopLayout(width,height,top,bottom,cols);return desktopShopLayout(width,height,top,bottom,cols);}
  if(height-top-bottom<500)return shortShopLayout(width,height,top,bottom,cols);
  const portrait=width<700&&height>width,x=12,w=width-24,seat=(Math.min(w,420)-8*(cols-1))/cols;
  const slotGap=6,slotWidth=Math.min(64,(w-4*slotGap)/5),slotHeight=slotWidth*1.4;
  // Fit the visible owned rail before the fixed action row; only art shrinks.
  const portraitFaceBudget=(height-top-bottom-352-slotHeight)/1.4;
  const cardWidth=Math.min(Math.max(88,Math.min(108,seat-8)),portrait?portraitFaceBudget:Infinity),cardHeight=cardWidth*1.4;
  const shelfWidth=cols*seat+8*(cols-1),shelfX=x+(w-shelfWidth)/2,shelfTop=top+104;
  const shelf:Box[]=Array.from({length:cols},(_,i)=>({x:shelfX+i*(seat+8)+(seat-cardWidth)/2,y:shelfTop,width:cardWidth,height:cardHeight}));
  const rackWidth=5*slotWidth+4*slotGap,slotX=x+(w-rackWidth)/2,slotY=shelfTop+cardHeight+100;
  const slots:Box[]=Array.from({length:5},(_,i)=>({x:slotX+i*(slotWidth+slotGap),y:slotY,width:slotWidth,height:slotHeight}));
  const secondaryY=portrait?height-bottom-144:Math.min(height-bottom-144,slotY+slotHeight+20),toolWidth=(Math.min(w,420)-8)/2,actionX=x+(w-Math.min(w,420))/2,inventoryY=slotY+slotHeight+8;
  return {x,w,top,pc:null,desktop:false,short:false,copyBeside:false,inventoryCollapsed:false,compact:portrait,wideHeader:false,portrait,slots,shelf,tabs:{x:actionX,y:top+52,width:Math.min(w,420),height:44},
    chapter:{x:portrait?actionX:x,y:portrait?inventoryY:top+104,width:portrait?toolWidth:200,height:44},items:{x:portrait?actionX+toolWidth+8:x,y:portrait?inventoryY:top+156,width:portrait?toolWidth:200,height:44},
    reroll:{x:actionX,y:secondaryY,width:toolWidth,height:44},build:{x:actionX+toolWidth+8,y:secondaryY,width:toolWidth,height:44},play:{x:actionX,y:secondaryY+52,width:Math.min(w,420),height:56},noticeY:secondaryY+116};
}

/** Use existing empty inventory/rail space, never goods, live owned cards or primary actions. */
export function shopFirstGuideLayout(p:ReturnType<typeof shopLayout>,height:number,emptyOwned:boolean){
 let x=p.x,width=p.w,y:number,limit:number,replacesEmptySlots=false;
 if(p.pc){x=p.x+12;width=p.pc.left.width-24;y=p.chapter.y+p.chapter.height+12;limit=p.pc.left.y+p.pc.left.height-8;}
 else if(p.short){
  if(!p.inventoryCollapsed&&emptyOwned){width=p.chapter.width;y=p.slots[0].y;limit=p.chapter.y-6;replacesEmptySlots=true;}
  else{x=p.tabs.x;width=p.tabs.width;y=Math.max(...p.shelf.map(b=>b.y+b.height))+4;limit=p.play.y-4;}
 }else if(p.portrait){y=emptyOwned?p.slots[0].y:Math.max(...p.slots.map(b=>b.y+b.height))+26;limit=p.reroll.y-8;replacesEmptySlots=emptyOwned;}
 else{y=p.noticeY+28;limit=height-12;}
 const columns=width<284?2:4,padding=p.short&&columns===4?4:6,textHeight=p.short&&columns===4?18:columns===2?56:40,gap=columns===4&&p.short?2:4;
 const rows=4/columns,boxHeight=padding*2+textHeight+gap+rows*44+(rows-1)*6;if(y+boxHeight>limit)return;
 const box={x,y,width,height:boxHeight},buttonWidth=(width-padding*2-(columns-1)*6)/columns;
 const buttons:Array<Box>=Array.from({length:4},(_,i)=>({x:x+padding+(i%columns)*(buttonWidth+6),y:y+padding+textHeight+gap+Math.floor(i/columns)*50,width:buttonWidth,height:44}));
 return {box,buttons,padding,textHeight,replacesEmptySlots};
}

/** Text uses the goods seat on desktop, independently of the bounded card face. */
export function shopOfferCopy(p:ReturnType<typeof shopLayout>,b:Box){
  if(p.pc){const seat=p.pc.jokerOffers.find(t=>b.x>=t.x&&b.x<t.x+t.width)!;return {x:seat.x+10,y:b.y+b.height+2,width:seat.width-20,priceY:seat.y+b.height+98,lines:4,tile:seat};}
  const seat=(p.tabs.width-8*(p.shelf.length-1))/p.shelf.length;
  const x=p.copyBeside?b.x+b.width+6:b.x,y=p.copyBeside?b.y:b.y+b.height,width=p.copyBeside?seat-b.width-8:b.width+6;
  return {x,y,width,priceY:y+58,lines:2,tile:{...b,width:p.copyBeside?b.width+6+width:b.width,height:p.copyBeside?b.height:b.height+76}};
}

/** Wrapped desktop racks need both axes; horizontal legacy racks retain their drop rule. */
export function shopOwnedDropIndex(p:ReturnType<typeof shopLayout>,x:number,y:number):number {
  return p.slots.findIndex(b=>x>=b.x&&x<=b.x+b.width&&(!p.desktop||(y>=b.y&&y<=b.y+b.height)));
}

/** Keep numeric gains/caps together while wrapping Chinese desktop summaries. */
export function shopSummaryWrap(text:string,width:number,measure:(text:string)=>number):string {
  const lines:string[]=[];let line='';
  for(const token of text.match(/\d+(?:\.\d+)?|[^\d]/gu)??[]){
    if(token==='\n'){lines.push(line);line='';continue;}
    if(line&&measure(line+token)>width){lines.push(line);line=token;}else line+=token;
  }
  lines.push(line);return lines.join('\n');
}
