import type {Box} from './layout';
import {shopOfferGeometry} from './ShopOfferLayout';
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
  if(collapsed){
    // One header for purse/categories/menu and one footer for actions. A
    // full-width entry button below a second toolbar covered the price row.
    const shelf:Box[]=Array.from({length:cols},(_,i)=>({x:x+i*(seat+8),y:top+50,width:88,height:123.2}));
    const actionY=height-bottom-68,auxWidth=Math.min(120,(w-160)/2);
    return {x,w,top,pc:null,desktop:false,short:true,compact:true,wideHeader:false,portrait:false,copyBeside:true,inventoryCollapsed:true,slots:[],shelf,
      tabs:{x:x+124,y:top,width:w-200,height:44},chapter:{x,y:actionY,width:0,height:44},items:{x,y:actionY,width:0,height:44},
      reroll:{x,y:actionY,width:auxWidth,height:44},build:{x:x+auxWidth+8,y:actionY,width:auxWidth,height:44},
      play:{x:x+2*(auxWidth+8),y:actionY,width:w-2*(auxWidth+8),height:44},noticeY:actionY+48};
  }
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
    play:{x:collapsed||height<600?x:width-156,y:playY,width:collapsed?w:height<600?inventoryWidth:144,height:56},noticeY:playY+60};
}

/** Left state, upper owned resources, lower sale panel. Short PC reuses the short branch. */
function desktopShopLayout(width:number,height:number,top:number,bottom:number,_cols:number,ownedCount:number){
  const w=Math.min(1480,width-48),x=(width-w)/2,leftWidth=width>=1600?248:224,gap=width>=1600?32:24,rightX=x+leftWidth+gap,rightWidth=w-leftWidth-gap;
  const usableHeight=height-top-bottom;
  const compactRail=usableHeight<800,railGap=compactRail?24:40;
  const ownedWidth=compactRail?64:width>=1600&&usableHeight>=800?96:80,ownedHeight=ownedWidth*1.4,slotY=top+56;
  const slots:Box[]=Array.from({length:5},(_,i)=>({x:rightX+i*(ownedWidth+12),y:slotY,width:ownedWidth,height:ownedHeight}));
  const empty=ownedCount===0;
  const ownedRail={x:rightX,y:top,width:rightWidth,height:empty?52:56+ownedHeight+railGap-20};
  const inventoryEntry={x:rightX+rightWidth-168,y:top+(empty?4:64),width:168,height:44};
  const panelY=empty?top+64:slotY+ownedHeight+railGap;
  const shopPanel={x:rightX,y:panelY,width:rightWidth,height:height-bottom-8-panelY};
  const goodsX=shopPanel.x+12,goodsWidth=shopPanel.width-24;
  const play={x:shopPanel.x+shopPanel.width-252,y:shopPanel.y+shopPanel.height-68,width:240,height:56};
  const shared={x:goodsX,y:shopPanel.y+64,width:goodsWidth,height:play.y-16-shopPanel.y-64};
  const seat=(goodsWidth-24)/3,jokerOffers:Box[]=Array.from({length:3},(_,i)=>({x:goodsX+i*(seat+12),y:shared.y,width:seat,height:shared.height}));
  const shelf=jokerOffers.map(b=>shopOfferGeometry(b,'jokers')!.art);
  const groupY=shared.y,toolOffers=shared,workshop=shared,itemOffers=shared;
  const feedback={x:goodsX,y:play.y+12,width:Math.max(160,play.x-goodsX-16),height:40};
  const reroll={x:empty?inventoryEntry.x-116:inventoryEntry.x,y:empty?top+4:top+116,width:104,height:44};
  const build={x:empty?reroll.x-144:Math.min(rightX+5*(ownedWidth+12)+12,inventoryEntry.x-144),y:top+6,width:132,height:44};
  const chapter={x,y:top+176,width:leftWidth,height:44};
  const pc={left:{x,y:top,width:leftWidth,height:shopPanel.y+shopPanel.height-top},ownedRail,inventoryEntry,shopPanel,actionRail:play,shared,jokerOffers,toolOffers,itemOffers,workshop,feedback,groupY,guidanceHeight:0};
  return {x,w,top,pc,desktop:true,short:false,copyBeside:false,inventoryCollapsed:false,compact:false,wideHeader:false,portrait:false,slots,shelf,
    tabs:{x:goodsX,y:shopPanel.y+8,width:goodsWidth,height:44},chapter,items:inventoryEntry,build,reroll,play,noticeY:feedback.y};
}

export function shopLayout(width:number,height:number,top:number,bottom:number,cols:number,ownedCopy=false,guideActions=false,left=0,right=0,ownedCount=5,menu?:Box){
  const p=shiftLayout(shopContentLayout(width-left-right,height,top,bottom,cols,ownedCopy,guideActions,ownedCount),left);
  const headerRows=p.portrait&&width-left-right<380?2:1;
  if(headerRows===2){p.tabs={...p.tabs,y:p.tabs.y+44};p.shelf=p.shelf.map(b=>({...b,y:b.y+44}));}
  if(p.portrait&&!p.inventoryCollapsed){
    const width=Math.min(64,(p.w-24)/5),height=width*1.25+36,stockEnd=Math.max(...p.shelf.map(b=>b.y+b.height)),y=Math.max(p.slots[0].y,stockEnd+174);
    if(y+height+64>p.play.y)p.inventoryCollapsed=true;
    else p.slots=p.slots.map((b,i)=>({...b,x:p.x+(p.w-(width*5+24))/2+i*(width+6),y,width,height}));
  }
  if(p.portrait)p.build={x:p.x+p.w-104,y:p.inventoryCollapsed||ownedCount===0?p.play.y-52:p.slots[0].y+p.slots[0].height+8,width:104,height:44};
  if(p.pc&&menu){
    const bag=p.pc.inventoryEntry;
    if(bag.y<menu.y+menu.height&&bag.y+bag.height>menu.y){
      const shift=Math.max(0,bag.x+bag.width-menu.x+8);
      p.pc.inventoryEntry={...bag,x:bag.x-shift};p.items={...p.items,x:bag.x-shift};
      p.reroll={...p.reroll,x:p.reroll.x-shift};p.build={...p.build,x:p.build.x-shift};
    }
  }
  const result={...p,menu,headerRows};
  if(p.portrait)result.reroll=shopPortraitHeader(result).reroll;
  return result;
}
/** Translate every nested box together; safe insets must not change relative hit geometry. */
function shiftLayout<T>(value:T,left:number):T {
  if(!left)return value;
  if(Array.isArray(value))return value.map(v=>shiftLayout(v,left)) as T;
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='x'&&typeof v==='number'?v+left:shiftLayout(v,left)])) as T;
  return value;
}
function shopContentLayout(width:number,height:number,top:number,bottom:number,cols:number,ownedCopy=false,guideActions=false,ownedCount=5){
  if(width>=1000){if(height-top-bottom<712)return shortShopLayout(width,height,top,bottom,cols);return desktopShopLayout(width,height,top,bottom,cols,ownedCount);}
  if(height<=width&&height-top-bottom<500)return shortShopLayout(width,height,top,bottom,cols);
  const portrait=width<700&&height>width,x=12,w=width-24,seat=(Math.min(w,420)-8*(cols-1))/cols;
  // Browser toolbar height changes keep the same three-card gallery.
  const slotGap=6,slotWidth=Math.min(portrait&&height-top-bottom>=650?52:64,(w-4*slotGap)/5),slotHeight=portrait?slotWidth*1.25+36:slotWidth*1.4;
  // Fit the visible owned rail before the fixed action row; only art shrinks.
  const portraitFaceBudget=(height-top-bottom-564)/1.4;
  const inventoryCollapsed=portrait&&height-top-bottom<650;
  const cardWidth=Math.min(Math.max(88,Math.min(108,seat-8)),portrait&&!inventoryCollapsed?Math.max(76,portraitFaceBudget):Infinity),cardHeight=cardWidth*(portrait?1.25:1.4);
  const shelfWidth=cols*seat+8*(cols-1),shelfX=x+(w-shelfWidth)/2,shelfTop=top+104;
  const shelf:Box[]=Array.from({length:cols},(_,i)=>({x:shelfX+i*(seat+8)+(seat-cardWidth)/2,y:shelfTop,width:cardWidth,height:cardHeight}));
  const ownedGap=portrait?Math.min(24,Math.max(0,height-top-bottom-352-slotHeight-cardHeight)):24;
  const rackWidth=5*slotWidth+4*slotGap,slotX=x+(w-rackWidth)/2,originalSlotY=shelfTop+cardHeight+(portrait&&!inventoryCollapsed?196:100+ownedGap);
  const guidanceBelow=false;
  const slotY=portrait?Math.min(originalSlotY,height-bottom-144-78-slotHeight):originalSlotY+(guidanceBelow?54:0);
  const slots:Box[]=Array.from({length:5},(_,i)=>({x:slotX+i*(slotWidth+slotGap),y:slotY,width:slotWidth,height:slotHeight}));
  const secondaryY=portrait?height-bottom-144:Math.min(height-bottom-144,slotY+slotHeight+20),toolWidth=(Math.min(w,420)-8)/2,actionX=x+(w-Math.min(w,420))/2,inventoryY=slotY+slotHeight+(portrait?24:8);
  return {x,w,top,pc:null,desktop:false,short:false,copyBeside:false,inventoryCollapsed,compact:portrait,wideHeader:false,portrait,guidanceBelow,slots,shelf,tabs:{x:actionX,y:top+52,width:Math.min(w,420),height:44},
    chapter:{x:portrait?actionX:x,y:portrait?inventoryY:top+104,width:portrait?toolWidth:200,height:44},items:{x:portrait?actionX+toolWidth+8:x,y:portrait?inventoryY:top+156,width:portrait?toolWidth:200,height:44},
    reroll:{x:actionX,y:secondaryY,width:toolWidth,height:44},build:{x:actionX+toolWidth+8,y:secondaryY,width:toolWidth,height:44},play:{x:actionX,y:secondaryY+52,width:Math.min(w,420),height:56},noticeY:secondaryY+116};
}

/** Use existing empty inventory/rail space, never goods, live owned cards or primary actions. */
export function shopFirstGuideLayout(p:ReturnType<typeof shopLayout>,height:number,emptyOwned:boolean){
 if(p.portrait)return;
 let x=p.x,width=p.w,y:number,limit:number,replacesEmptySlots=false;
 if(p.pc){x=p.x+12;width=p.pc.left.width-24;y=p.chapter.y+p.chapter.height+12;limit=p.pc.left.y+p.pc.left.height-8;}
 else if(p.short){
  if(!p.inventoryCollapsed&&emptyOwned){width=p.chapter.width;y=p.slots[0].y;limit=p.chapter.y-6;replacesEmptySlots=true;}
  else{x=p.tabs.x;width=p.tabs.width;y=Math.max(...p.shelf.map(b=>b.y+b.height))+4;limit=p.play.y-4;}
 }else if(p.portrait){y=emptyOwned?p.slots[0].y:Math.max(...p.slots.map(b=>b.y+b.height))+26;limit=p.reroll.y-8;replacesEmptySlots=emptyOwned;}
 else{y=p.noticeY+28;limit=height-12;}
 const columns=2,padding=p.short?4:6,headingHeight=p.short||p.portrait?0:20,textHeight=p.short?18:p.portrait?28:width<284?56:40,gap=p.short?2:4;
 const boxHeight=padding*2+headingHeight+textHeight+gap+44;
 if(y+boxHeight>limit){
  if(!p.portrait||emptyOwned)return;
  const compactY=Math.max(...p.slots.map(b=>b.y+b.height))+22,compactHeight=74;
  if(compactY+compactHeight>p.reroll.y-8)return;
  const compactBox={x:p.x,y:compactY,width:p.w,height:compactHeight},buttonWidth=(p.w-18)/2;
  return {box:compactBox,padding:6,headingHeight:0,textHeight:20,replacesEmptySlots:false,buttons:[{x:p.x+6,y:compactY+26,width:buttonWidth,height:44},{x:p.x+12+buttonWidth,y:compactY+26,width:buttonWidth,height:44}]};
 }
 const box={x,y,width,height:boxHeight},buttonWidth=(width-padding*2-(columns-1)*6)/columns;
 const buttons:Array<Box>=Array.from({length:2},(_,i)=>({x:x+padding+(i%columns)*(buttonWidth+6),y:y+padding+headingHeight+textHeight+gap+Math.floor(i/columns)*50,width:buttonWidth,height:44}));
 return {box,buttons,padding,headingHeight,textHeight,replacesEmptySlots};
}

/** Text uses the goods seat on desktop, independently of the bounded card face. */
export function shopOfferCopy(p:ReturnType<typeof shopLayout>,b:Box,plainJoker=false){
  if(p.portrait&&p.copyBeside)return {x:b.x+b.width+14,y:b.y,width:p.x+p.w-(b.x+b.width+14)-4,priceY:b.y+b.height-20,lines:3,tile:{x:p.x,y:b.y,width:p.w,height:b.height}};
  if(p.pc){const seat=p.pc.jokerOffers.find(t=>b.x>=t.x&&b.x<t.x+t.width)!;return {x:seat.x+10,y:b.y+b.height+2,width:seat.width-20,priceY:seat.y+b.height+98+p.pc.guidanceHeight,lines:4,tile:seat};}
  const seat=((p.short&&p.inventoryCollapsed?p.w:p.tabs.width)-8*(p.shelf.length-1))/p.shelf.length;
  const x=p.copyBeside?b.x+b.width+6:b.x,y=p.copyBeside?b.y:b.y+b.height,width=p.copyBeside?seat-b.width-8:b.width+6;
  if(p.short&&p.inventoryCollapsed)return {x,y,width,priceY:y+(plainJoker?92:58),lines:plainJoker?3:2,tile:{...b,width:b.width+6+width}};
  if(p.portrait&&plainJoker)return {x,y,width,priceY:y+80,lines:3,tile:{...b,height:b.height+104}};
  const extra=plainJoker?(p.copyBeside?36:'guidanceBelow' in p&&p.guidanceBelow?54:0):0;
  return {x,y,width,priceY:y+(plainJoker?76:58)+extra,lines:plainJoker?3:2,tile:{...b,width:p.copyBeside?b.width+6+width:b.width,height:p.copyBeside?Math.max(b.height,plainJoker?136:0):b.height+(plainJoker?94:76)+extra}};
}

/** One stable mobile explanation replaces the former oversized starter prompt. */
export function shopDecisionBox(p:ReturnType<typeof shopLayout>):Box|undefined {
 if(!p.portrait)return;
 const y=Math.max(...p.shelf.map(b=>b.y+b.height))+108;
 const height=Math.min(40,p.reroll.y-y-8,p.slots[0].y-y-24);
 return height>=32?{x:p.x,y,width:p.w,height}:undefined;
}

/** Wrapped desktop racks need both axes; horizontal legacy racks retain their drop rule. */
export function shopOwnedDropIndex(p:ReturnType<typeof shopLayout>,x:number,y:number):number {
  return p.slots.findIndex(b=>x>=b.x&&x<=b.x+b.width&&(!p.desktop||(y>=b.y&&y<=b.y+b.height)));
}

/** Actual PC goods cells own capacity; complete rules remain in purchase details. */
export function shopGoodsGrid(group:Box,count:number){
 const columns=Math.min(Math.max(1,count),Math.max(1,Math.floor((group.width+8)/208)));
 const rowCapacity=Math.max(1,Math.floor((group.height+8)/136)),capacity=columns*rowCapacity;
 const visible=Math.min(count,capacity),rows=Math.max(1,Math.ceil(visible/columns));
 return {capacity,columns,boxes:Array.from({length:visible},(_,i)=>({x:group.x+(i%columns)*(group.width+8)/columns,y:group.y+Math.floor(i/columns)*(group.height+8)/rows,width:(group.width-8*(columns-1))/columns,height:(group.height-8*(rows-1))/rows}))};
}

/** Keep numeric gains/caps together while wrapping Chinese desktop summaries. */
export function shopSummaryWrap(text:string,width:number,measure:(text:string)=>number,maxLines=Infinity):string {
  const lines:string[]=[];let line='';
  for(const token of text.match(/[+×−-]?\d+(?:\.\d+)?(?:\/\d+)*|[^\d]/gu)??[]){
    if(token==='\n'){lines.push(line);line='';continue;}
    if(line&&measure(line+token)>width){lines.push(line);line=token;}else line+=token;
  }
  lines.push(line);
  if(lines.length>maxLines){
    lines.length=Math.max(1,Math.floor(maxLines));
    const tail=lines.at(-1)!.match(/[+×−-]?\d+(?:\.\d+)?(?:\/\d+)*|[^\d]/gu)??[];
    while(tail.length&&measure(tail.join('')+'…')>width)tail.pop();
    lines[lines.length-1]=tail.join('')+'…';
  }
  return lines.join('\n');
}

/** Reserve a separate row for a distinct trigger instead of letting the effect consume both rows. */
export function shopOfferSummary(text:string,width:number,measure:(text:string)=>number):string {
  const rows=text.split('\n').filter(Boolean);
  return rows.length===2?rows.map(row=>shopSummaryWrap(row,width,measure,1)).join('\n'):shopSummaryWrap(text,width,measure,2);
}

/** Four equal category targets; inventory and paid refresh belong to the header. */
export function shopPortraitHeader(p:{x:number;w:number;top:number;headerRows:number;menu?:Box}){
 const right=Math.min(p.x+p.w,p.menu?.x??p.x+p.w-44)-8,y=Math.max(p.top,p.menu?.y??p.top);
 const purse={x:right-92,y,width:92,height:44};
 const reroll={x:p.headerRows===2?p.x+78:purse.x-78,y:y+(p.headerRows===2?44:0),width:72,height:44};
 const inventory={x:p.headerRows===2?p.x:reroll.x-76,y:reroll.y,width:70,height:44};
 return {purse,reroll,inventory};
}
/** A clear full-color hero composition replaces an empty held-card rail. */
export function shopEmptyPortrait(p:ReturnType<typeof shopLayout>,hasExtra=false,extraRows=1){
 if(!p.portrait)return;
 const y=p.shelf[0].y+p.shelf[0].height+130+(hasExtra?24*extraRows:0),height=p.build.y-y-10;
 return height>=60?{x:p.x,y,width:p.w,height}:undefined;
}
