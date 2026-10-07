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
  return {x,w,top,desktop:false,short:true,compact:true,wideHeader:false,portrait:false,copyBeside:true,inventoryCollapsed:collapsed,slots,shelf,
    tabs:{x:goodsX,y:tabsY,width:goodsWidth,height:44},chapter:{x,y:secondaryY,width:inventoryWidth,height:44},items:{x,y:secondaryY,width:inventoryWidth,height:44},
    reroll:{x:collapsed?x+60:x,y:collapsed?top:secondaryY,width:collapsed?104:122,height:44},build:{x:collapsed?x+172:x+130,y:collapsed?top:secondaryY,width:120,height:44},
    play:{x,y:playY,width:collapsed?w:inventoryWidth,height:56},noticeY:playY+60};
}

/** Wide shops reserve separate goods and inventory regions; cards stay modest. */
function desktopShopLayout(width:number,height:number,top:number,bottom:number,cols:number){
  const w=Math.min(1480,width-48),x=(width-w)/2,inventoryWidth=Math.min(360,Math.max(300,w*.26)),goodsX=x+inventoryWidth+32,goodsWidth=w-inventoryWidth-32;
  const gap=24,seat=(goodsWidth-gap*(cols-1))/cols,cardWidth=Math.min(144,Math.max(112,seat*.55)),cardHeight=cardWidth*1.4,shelfTop=top+104;
  const shelf:Box[]=Array.from({length:cols},(_,i)=>({x:goodsX+i*(seat+gap)+(seat-cardWidth)/2,y:shelfTop,width:cardWidth,height:cardHeight}));
  const slotWidth=Math.min(96,(inventoryWidth-24)/3),slotHeight=slotWidth*1.4,slotY=top+110;
  const slots:Box[]=Array.from({length:5},(_,i)=>({x:x+(i%3)*(slotWidth+12),y:slotY+Math.floor(i/3)*(slotHeight+32),width:slotWidth,height:slotHeight}));
  const inventoryY=slotY+slotHeight*2+60,secondaryY=height-bottom-104,playWidth=Math.min(420,goodsWidth-152);
  return {x,w,top,desktop:true,short:false,copyBeside:false,inventoryCollapsed:false,compact:false,wideHeader:false,portrait:false,slots,shelf,
    tabs:{x:goodsX,y:top+52,width:goodsWidth,height:44},chapter:{x,y:inventoryY,width:inventoryWidth,height:44},items:{x,y:inventoryY+52,width:inventoryWidth,height:44},
    build:{x,y:secondaryY,width:inventoryWidth,height:56},reroll:{x:goodsX,y:secondaryY,width:144,height:56},play:{x:goodsX+goodsWidth-playWidth,y:secondaryY,width:playWidth,height:56},noticeY:secondaryY+64};
}

export function shopLayout(width:number,height:number,top:number,bottom:number,cols:number,ownedCopy=false){
  if(height-top-bottom<500)return shortShopLayout(width,height,top,bottom,cols);
  if(width>=1000&&height-top-bottom>=640)return desktopShopLayout(width,height,top,bottom,cols);
  const portrait=width<700&&height>width,x=12,w=width-24,seat=(Math.min(w,420)-8*(cols-1))/cols,cardWidth=Math.max(88,Math.min(108,seat-8)),cardHeight=cardWidth*1.4;
  const shelfWidth=cols*seat+8*(cols-1),shelfX=x+(w-shelfWidth)/2,shelfTop=top+104;
  const shelf:Box[]=Array.from({length:cols},(_,i)=>({x:shelfX+i*(seat+8)+(seat-cardWidth)/2,y:shelfTop,width:cardWidth,height:cardHeight}));
  const slotGap=6,slotWidth=Math.min(64,(w-4*slotGap)/5),slotHeight=slotWidth*1.4,rackWidth=5*slotWidth+4*slotGap,slotX=x+(w-rackWidth)/2,slotY=shelfTop+cardHeight+100;
  const slots:Box[]=Array.from({length:5},(_,i)=>({x:slotX+i*(slotWidth+slotGap),y:slotY,width:slotWidth,height:slotHeight}));
  const secondaryY=portrait?height-bottom-144:Math.min(height-bottom-144,slotY+slotHeight+20),toolWidth=(Math.min(w,420)-8)/2,actionX=x+(w-Math.min(w,420))/2,inventoryY=slotY+slotHeight+8;
  return {x,w,top,desktop:false,short:false,copyBeside:false,inventoryCollapsed:false,compact:portrait,wideHeader:false,portrait,slots,shelf,tabs:{x:actionX,y:top+52,width:Math.min(w,420),height:44},
    chapter:{x:portrait?actionX:x,y:portrait?inventoryY:top+104,width:portrait?toolWidth:200,height:44},items:{x:portrait?actionX+toolWidth+8:x,y:portrait?inventoryY:top+156,width:portrait?toolWidth:200,height:44},
    reroll:{x:actionX,y:secondaryY,width:toolWidth,height:44},build:{x:actionX+toolWidth+8,y:secondaryY,width:toolWidth,height:44},play:{x:actionX,y:secondaryY+52,width:Math.min(w,420),height:56},noticeY:secondaryY+116};
}

/** Text uses the goods seat on desktop, independently of the bounded card face. */
export function shopOfferCopy(p:ReturnType<typeof shopLayout>,b:Box){
  const seat=(p.tabs.width-(p.desktop?24:8)*(p.shelf.length-1))/p.shelf.length;
  const x=p.desktop?b.x-(seat-b.width)/2+8:p.copyBeside?b.x+b.width+6:b.x;
  const y=p.copyBeside?b.y:b.y+b.height,width=p.desktop?seat-16:p.copyBeside?seat-b.width-8:b.width+6;
  const priceY=y+(p.desktop?100:58);
  return {x,y,width,priceY,lines:p.desktop?4:2,tile:{x:Math.min(b.x,x),y:b.y,width:p.desktop?seat-16:p.copyBeside?b.width+6+width:b.width,height:p.copyBeside?b.height:p.desktop?priceY+22-b.y:b.height+76}};
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
