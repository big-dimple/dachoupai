import type {R2RunState} from '../domain/r2Run';
import type {R2Offer} from '../domain/r2Shop';
import {r2BasicChoicePool,r2PurchasePrice,r2ToolAcquisitionPool} from '../domain/r2Shop';
import {isR2BasicChoice,R2_BASIC_TOOL_IDS} from '../domain/r2GroupUpgrade';
import {R2_TOOL_CATALOG} from '../content/r2Tools';
import {r2ConsumableCapacity} from '../domain/r2Resources';
import {rankLabel,SUIT_SYMBOL,type Rank} from '../cards/types';
import {currentBuildFocus,BUILD_LABEL} from './BuildJourney';
import {toolInfo} from './r2ToolInfo';

/** A UI seat only; never inserted into authoritative offers or used as a BuyOffer target. */
export function basicChoiceSeat(s:R2RunState):R2Offer|undefined {
 if(!isR2BasicChoice(s)||!s.shop?.basicChoice)return;
 return {offerId:`basic-choice/${s.shop.basicChoice.shopSeq}`,definitionId:'T02',price:2,consumed:!!s.shop.basicChoice.purchase};
}
export const isBasicChoiceSeat=(o:R2Offer)=>/^basic-choice\/[1-9]\d*$/.test(o.offerId);
export function basicChoiceRows(s:R2RunState){
 const seat=basicChoiceSeat(s);if(!seat)return [];
 const eligible=r2BasicChoicePool(s),legal=r2ToolAcquisitionPool(s),live=s.deckInstances.filter(c=>!s.destroyedIds.includes(c.id)),focus=currentBuildFocus(s,s.openingRoute),route=focus?BUILD_LABEL[focus]:'当前路线';
 const price=r2PurchasePrice(s,seat),floor=s.longTermItems.includes('U08')?R2_TOOL_CATALOG.limits.minimalDeckFloor:R2_TOOL_CATALOG.limits.deckDeletionFloor;
 return R2_BASIC_TOOL_IDS.map(id=>{
  const info=toolInfo(id,s),duplicate=s.shop!.toolOffers.find(o=>o.definitionId===id);
  let purpose=id==='T02'?`删去自己不准备保留的非核心牌，集中${route}；永久删除，至少保留${floor}张。`:info.description.split('\n')[0];
  if(id==='T08'||id==='T09'){
   const delta=id==='T08'?1:-1,card=live.find(c=>c.rank+delta>=2&&c.rank+delta<=14);
   if(card)purpose=`例如${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]} → ${rankLabel((card.rank+delta) as Rank)}${SUIT_SYMBOL[card.suit]}；${focus==='group'?'把点数移到想凑的同点组':focus==='straight'?'调整点数接相邻缺口':'点数变化保留花色'}，对象由你选。`;
  }
  const reason=seat.consumed?'本店选择已购，刷新不补货':!legal.some(t=>t.id===id)?'当前没有合法且有效的公开牌组目标':duplicate?duplicate.consumed?'同名随机位已售罄':'同名在随机位，查看现货与实付价':!eligible.some(t=>t.id===id)?'当前不可选':s.consumables.length>=r2ConsumableCapacity(s)?'道具箱已满，请先使用或销毁':s.gold<price?`实付${price}金，当前还差${price-s.gold}金`:undefined;
  return {id,info,purpose,duplicate,price:duplicate?r2PurchasePrice(s,duplicate):price,reason};
 });
}
