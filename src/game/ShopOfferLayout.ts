import type {Box} from './layout';

export const SHOP_CATEGORIES={
  jokers:{title:'唐宋牌',summary:'加入随身牌，按条件触发'},
  tools:{title:'消耗工具',summary:'买入工具包，使用前确认'},
  items:{title:'长期物品',summary:'买入后本局持续生效'},
} as const;

export interface ShopOfferGeometry {art:Box;title:Box;summary:Box;price:Box;reason:Box}

/** One top-aligned grid per goods row; text length never moves the picture or price. */
export function shopOfferGeometry(tile:Box,kind:keyof typeof SHOP_CATEGORIES):ShopOfferGeometry|undefined {
  const padding=12,gap=12,titleHeight=22,priceHeight=24,reasonHeight=20;
  if(kind==='jokers'){
    const copyHeight=titleHeight+8+42+8+priceHeight+reasonHeight;
    const width=Math.min(168,tile.width-padding*2,(tile.height-padding*2-copyHeight)/1.4);
    if(width<64)return;
    const art={x:tile.x+(tile.width-width)/2,y:tile.y+padding,width,height:width*1.4};
    const x=tile.x+padding,copyWidth=tile.width-padding*2,titleY=art.y+art.height+8,priceY=tile.y+tile.height-padding-reasonHeight-priceHeight;
    return {art,title:{x,y:titleY,width:copyWidth,height:titleHeight},summary:{x,y:titleY+titleHeight+8,width:copyWidth,height:priceY-titleY-titleHeight-16},price:{x,y:priceY,width:copyWidth,height:priceHeight},reason:{x,y:priceY+priceHeight,width:copyWidth,height:reasonHeight}};
  }
  const width=Math.min(112,(tile.height-padding*2)/1.4,Math.max(0,(tile.width-padding*2-gap)*.44));
  const x=tile.x+padding+width+gap,copyWidth=tile.x+tile.width-padding-x;
  if(width<64||copyWidth<88||tile.height<138)return;
  const priceY=tile.y+tile.height-padding-reasonHeight-priceHeight;
  return {art:{x:tile.x+padding,y:tile.y+padding,width,height:width*1.4},title:{x,y:tile.y+padding,width:copyWidth,height:titleHeight},summary:{x,y:tile.y+padding+titleHeight+8,width:copyWidth,height:priceY-tile.y-padding-titleHeight-16},price:{x,y:priceY,width:copyWidth,height:priceHeight},reason:{x,y:priceY+priceHeight,width:copyWidth,height:reasonHeight}};
}
