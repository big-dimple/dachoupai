import type {R2RunState} from '../domain/r2Run';
import type {R2Offer} from '../domain/r2Shop';
import {r2BasicChoicePool,r2PurchasePrice,r2ToolAcquisitionPool} from '../domain/r2Shop';
import {isR2BasicChoice,r2BasicChoiceIds,r2BasicChoiceBasePrice} from '../domain/r2GroupUpgrade';
import {getR2Tool} from '../content/r2Tools';
import {r2ConsumableCapacity} from '../domain/r2Resources';
import {toolInfo} from './r2ToolInfo';

/** A UI seat only; never inserted into authoritative offers or used as a BuyOffer target. */
export function basicChoiceSeat(s:R2RunState):R2Offer|undefined {
 if(!isR2BasicChoice(s)||!s.shop?.basicChoice)return;
 return {offerId:`basic-choice/${s.shop.basicChoice.shopSeq}`,definitionId:'T02',price:2,consumed:!!s.shop.basicChoice.purchase};
}
export const isBasicChoiceSeat=(o:R2Offer)=>/^basic-choice\/[1-9]\d*$/.test(o.offerId);
export function basicChoiceRows(s:R2RunState){
 const seat=basicChoiceSeat(s);if(!seat)return [];
 const eligible=r2BasicChoicePool(s),legal=r2ToolAcquisitionPool(s);
 return r2BasicChoiceIds(s).map(id=>{
  const price=r2PurchasePrice(s,{...seat,definitionId:id,price:r2BasicChoiceBasePrice(id)});
  const info=toolInfo(id,s),duplicate=s.shop!.toolOffers.find(o=>o.definitionId===id);
  const tool=getR2Tool(id),target=tool.target,count=target.kind==='cards'?(target.minimum===target.maximum?String(target.maximum):`${target.minimum}–${target.maximum}`):'';
  const purpose=tool.operation.kind==='set-suit'?`选${count}张改花色，点数保留`:tool.operation.kind==='delete-cards'?`永久删除${count}张牌`:tool.operation.kind==='shift-rank'?`选${count}张牌，点数${tool.operation.delta>0?'+':'−'}${Math.abs(tool.operation.delta)}`:`选${count}张牌，${info.summary.replace(/^选中牌每次计分/,'计分时')}`;
  const reason=seat.consumed?'本店选择已购，刷新不补货':!legal.some(t=>t.id===id)?'当前没有合法且有效的公开牌组目标':duplicate?duplicate.consumed?'同名随机位已售罄':'同名在随机位，查看现货与实付价':!eligible.some(t=>t.id===id)?'当前不可选':s.consumables.length>=r2ConsumableCapacity(s)?'道具箱已满，请先使用或销毁':s.gold<price?`实付${price}金，当前还差${price-s.gold}金`:undefined;
  return {id,info,purpose,duplicate,price:duplicate?r2PurchasePrice(s,duplicate):price,reason};
 });
}
