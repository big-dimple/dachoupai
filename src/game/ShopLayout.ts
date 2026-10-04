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
  return {x,w,top,short:true,compact:true,wideHeader:false,portrait:false,copyBeside:true,inventoryCollapsed:collapsed,slots,shelf,
    tabs:{x:goodsX,y:tabsY,width:goodsWidth,height:44},chapter:{x,y:secondaryY,width:inventoryWidth,height:44},items:{x,y:secondaryY,width:inventoryWidth,height:44},
    reroll:{x:collapsed?x+60:x,y:collapsed?top:secondaryY,width:collapsed?104:122,height:44},build:{x:collapsed?x+172:x+130,y:collapsed?top:secondaryY,width:120,height:44},
    play:{x,y:playY,width:collapsed?w:inventoryWidth,height:56},noticeY:playY+60};
}

export function shopLayout(width:number,height:number,top:number,bottom:number,cols:number,ownedCopy=false){
  if(height<500)return shortShopLayout(width,height,top,bottom,cols);
  const portrait=width<700&&height>width,x=12,w=width-24,seat=(Math.min(w,420)-8*(cols-1))/cols,cardWidth=Math.max(88,Math.min(108,seat-8)),cardHeight=cardWidth*1.4;
  const shelfWidth=cols*seat+8*(cols-1),shelfX=x+(w-shelfWidth)/2,shelfTop=top+104;
  const shelf:Box[]=Array.from({length:cols},(_,i)=>({x:shelfX+i*(seat+8)+(seat-cardWidth)/2,y:shelfTop,width:cardWidth,height:cardHeight}));
  const slotGap=6,slotWidth=Math.min(64,(w-4*slotGap)/5),slotHeight=slotWidth*1.4,rackWidth=5*slotWidth+4*slotGap,slotX=x+(w-rackWidth)/2,slotY=shelfTop+cardHeight+100;
  const slots:Box[]=Array.from({length:5},(_,i)=>({x:slotX+i*(slotWidth+slotGap),y:slotY,width:slotWidth,height:slotHeight}));
  const secondaryY=portrait?height-bottom-144:Math.min(height-bottom-144,slotY+slotHeight+20),toolWidth=(Math.min(w,420)-8)/2,actionX=x+(w-Math.min(w,420))/2,inventoryY=slotY+slotHeight+8;
  return {x,w,top,short:false,copyBeside:false,inventoryCollapsed:false,compact:portrait,wideHeader:false,portrait,slots,shelf,tabs:{x:actionX,y:top+52,width:Math.min(w,420),height:44},
    chapter:{x:portrait?actionX:x,y:portrait?inventoryY:top+104,width:portrait?toolWidth:200,height:44},items:{x:portrait?actionX+toolWidth+8:x,y:portrait?inventoryY:top+156,width:portrait?toolWidth:200,height:44},
    reroll:{x:actionX,y:secondaryY,width:toolWidth,height:44},build:{x:actionX+toolWidth+8,y:secondaryY,width:toolWidth,height:44},play:{x:actionX,y:secondaryY+52,width:Math.min(w,420),height:56},noticeY:secondaryY+116};
}
