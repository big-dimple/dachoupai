import {purchasePaymentFacts} from './PurchasePaymentFacts';
import type {R2RunState} from '../domain/run';
import type {R2Offer} from '../domain/r2Shop';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {r2GrowthMinimums} from '../content/r2Schema';
import {r2JokerStateText} from './r2Help';
import {itemInfo,toolInfo} from './r2ToolInfo';

export interface ShopPurchaseReceipt {kind:'jokers'|'tools'|'items';id:string;definitionId:string;name:string;body:string;commandSeq:number;payment?:ReturnType<typeof purchasePaymentFacts>}
/** Call only after a successful durable, nonduplicate purchase. Never infer acquisition from an offer alone. */
export function shopPurchaseReceipt(before:R2RunState,after:R2RunState,kind:ShopPurchaseReceipt['kind'],offer:R2Offer):ShopPurchaseReceipt|undefined {
 if(after.commandSeq!==before.commandSeq+1)return;
 let id:string,name:string,destination:string;
 if(kind==='jokers'){
  const j=after.jokers.find(j=>j.definitionId===offer.definitionId&&!before.jokers.some(old=>old.instanceId===j.instanceId));if(!j)return;
  const d=r2JokerDefinitionFor(after,j.definitionId);id=j.instanceId;name=d.name;
  destination=`购入时放入持有牌第 ${after.jokers.indexOf(j)+1} 槽。\n购入时已存状态：${r2JokerStateText({...j,growth:{...r2GrowthMinimums(d),...j.growth}},d)}。\n下一步：查看新牌的条件和状态；进入牌桌后按真实条件结算，购入不等于已发动。`;
  if(after.contentVersion==='quality-r2-group-upgrade-prototype-v1'&&['b10','b03'].includes(j.definitionId))destination+='\n成组成长：本手读取已保存值；成组手结算后新增的成长，从下一手起生效，不补加到本手。';
 }else if(kind==='tools'){
  const t=after.consumables.find(t=>t.definitionId===offer.definitionId&&!before.consumables.some(old=>old.instanceId===t.instanceId));if(!t)return;
  id=t.instanceId;name=toolInfo(t.definitionId).name;destination=`购入时收入工具包第 ${after.consumables.indexOf(t)+1} 件，尚未使用。\n下一步：打开工具包查看可用时点；需要目标时先选择，再确认使用。查看或取消不会消耗。`;
 }else{
  if(before.longTermItems.includes(offer.definitionId)||!after.longTermItems.includes(offer.definitionId))return;
  const info=itemInfo(offer.definitionId);id=offer.definitionId;name=info.name;destination=`已加入长期道具，本局持续持有，不能出售。\n实际作用与时机：${info.description}\n下一步：在物品与道具中查看，无需手动使用。`;
 }
 const payment=purchasePaymentFacts(before,after,offer);
 return {kind,id,definitionId:offer.definitionId,name,commandSeq:after.commandSeq,payment,body:`已购 ${name} · 已保存\n金币 ${before.gold} → ${after.gold}\n\n${payment?payment.body+'\n\n':''}${destination}`};
}

/** Evaluate against the committed state, including indirect removal such as S07 sacrifice. */
export function shopPurchaseReceiptExists(receipt:ShopPurchaseReceipt,state:R2RunState):boolean {
 return receipt.kind==='jokers'?state.jokers.some(j=>j.instanceId===receipt.id):receipt.kind==='tools'?state.consumables.some(t=>t.instanceId===receipt.id):state.longTermItems.includes(receipt.id);
}
