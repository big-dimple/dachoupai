import type {Box} from './layout';
import {JOKER_RARITY,type JokerRarity} from './JokerRarity';
import type {Edition} from '../cards/types';

export const SHOP_CATEGORIES={
  jokers:{title:'唐宋牌',summary:'加入随身牌，按条件触发'},
  tools:{title:'消耗工具',summary:'买入工具包，使用前确认'},
  items:{title:'长期物品',summary:'买入后本局持续生效'},
} as const;

export interface ShopOfferGeometry {art:Box;title:Box;summary:Box;price:Box;reason:Box;identity?:Box}

/** A repeated category is not a second effect; full rules remain in details. */
export function shopOfferSynopsis(now:string,later:string):string {
  const first=now.trim().replace(/^每手一次，/,'每手1次 '),second=later.trim();
  return !second||first===second||first.startsWith(second+' · ')?first:first+'\n'+second;
}

/** The saved rarity and edition remain visible outside artwork. */
export function shopIdentityText(rarity:JokerRarity,edition:Edition='none',compact=false):string {
  const editions={none:'普通版',foil:'闪箔版',holographic:'全息版',polychrome:'多彩版'};
  return JOKER_RARITY[rarity].label+(compact&&edition==='none'?'':' · '+(compact?editions[edition].replace('版',''):editions[edition]));
}

/** Keep both axes on narrow shelves; the purchase detail spells out the edition. */
export function shopShelfIdentityText(rarity:JokerRarity,edition:Edition='none'):string {
  return shopIdentityText(rarity,edition,true).replaceAll(' ','')+(edition==='none'?'·原版':'');
}

/** Held cards use their real image ratio; their identity never overlays the picture. */
export function shopHeldGeometry(card:Box,portrait:boolean){
  const aspect=4/5,artHeight=Math.min(card.width/aspect,card.height-(portrait?36:18)),artWidth=artHeight*aspect;
  const art={x:card.x+(card.width-artWidth)/2,y:card.y,width:artWidth,height:artHeight};
  const name={x:card.x,y:portrait?art.y+art.height+2:card.y-18,width:card.width,height:16};
  const identity={x:card.x,y:portrait?name.y+18:art.y+art.height+2,width:card.width,height:16};
  return {art,name,identity};
}

/** A complete, low-opacity image under the shop, with no source cropping or image edits. */
export function shopHeroBackground(width:number,height:number,top:number,bottom:number,aspect:number,portrait:boolean){
  const y=top+(portrait?44:0),availableHeight=Math.max(0,height-bottom-y),artHeight=Math.min(availableHeight,width/aspect),artWidth=artHeight*aspect;
  return {x:portrait?(width-artWidth)/2:Math.min(24,(width-artWidth)/2),y:y+(availableHeight-artHeight)/2,width:artWidth,height:artHeight,alpha:.18};
}

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
