import type {Box} from './layout';

export const SHOP_CATEGORIES={
  jokers:{title:'唐宋牌',summary:'加入随身牌，按条件触发'},
  tools:{title:'消耗工具',summary:'买入工具包，使用前确认'},
  items:{title:'长期物品',summary:'买入后本局持续生效'},
} as const;

export interface ShopOfferGeometry {art:Box;title:Box;summary:Box;price:Box;reason:Box;identity?:Box}

/** One top-aligned grid per goods row; text length never moves the picture or price. */
export function shopOfferGeometry(tile:Box,kind:keyof typeof SHOP_CATEGORIES):ShopOfferGeometry|undefined {
  const padding=8,gap=12,titleHeight=22,priceHeight=24,reasonHeight=18,aspect=4/5;
  if(kind==='jokers'){
    const copyHeight=124;
    const width=Math.min(224,tile.width-padding*2,(tile.height-padding*2-copyHeight)*aspect);
    if(width<64)return;
    const art={x:tile.x+(tile.width-width)/2,y:tile.y+padding,width,height:width/aspect};
    const x=tile.x+padding,copyWidth=tile.width-padding*2,titleY=art.y+art.height+4,priceY=tile.y+tile.height-padding-reasonHeight-priceHeight;
    return {art,title:{x,y:titleY,width:copyWidth,height:titleHeight},identity:{x,y:titleY+titleHeight,width:copyWidth,height:16},summary:{x,y:titleY+titleHeight+18,width:copyWidth,height:priceY-titleY-titleHeight-20},price:{x,y:priceY,width:copyWidth,height:priceHeight},reason:{x,y:priceY+priceHeight,width:copyWidth,height:reasonHeight}};
  }
  const width=Math.min(128,(tile.height-padding*2)*aspect,Math.max(0,(tile.width-padding*2-gap)*.44));
  const x=tile.x+padding+width+gap,copyWidth=tile.x+tile.width-padding-x;
  if(width<64||copyWidth<80||tile.height<128)return;
  const priceY=tile.y+tile.height-padding-reasonHeight-priceHeight;
  return {art:{x:tile.x+padding,y:tile.y+padding,width,height:width/aspect},title:{x,y:tile.y+padding,width:copyWidth,height:titleHeight},summary:{x,y:tile.y+padding+titleHeight+6,width:copyWidth,height:priceY-tile.y-padding-titleHeight-10},price:{x,y:priceY,width:copyWidth,height:priceHeight},reason:{x,y:priceY+priceHeight,width:copyWidth,height:reasonHeight}};
}
