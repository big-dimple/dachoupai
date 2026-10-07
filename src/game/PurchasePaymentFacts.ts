import type {R2RunState} from '../domain/run';
import {r2PurchasePrice,type R2Offer} from '../domain/r2Shop';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {R2_LONG_TERM_ITEMS} from '../content/r2Tools';
export interface DiscountSource {name:string;nominal:number;scope:'first-purchase'|'coupon';available:boolean}
export interface PurchasePaymentFacts {original:number;paid:number;saved:number;sources:DiscountSource[];summary:string;body:string}
/** Read declared current-profile modifiers; a nominal source is never an allocated actual saving. */
export function purchaseDiscountSources(state:R2RunState):DiscountSource[]{
 const first=state.shop?.purchases===0,sources:DiscountSource[]=[];
 for(const j of state.jokers){const d=r2JokerDefinitionFor(state,j.definitionId);for(const m of d.modifiers??[])if(m.kind==='first-purchase-discount')sources.push({name:d.name,nominal:m.amount,scope:'first-purchase',available:first});}
 for(const item of R2_LONG_TERM_ITEMS)if(state.longTermItems.includes(item.id)&&item.operation.kind==='first-purchase-discount')sources.push({name:item.name,nominal:item.operation.amount,scope:'first-purchase',available:first});
 if(state.purchaseCoupons>0)sources.push({name:'暖场跳场券',nominal:2,scope:'coupon',available:true});return sources;
}
export function purchaseDiscountStatus(state:R2RunState):string{
 if(!state.shop)return '';
 const sources=purchaseDiscountSources(state),first=sources.filter(s=>s.scope==='first-purchase');return [first.length?`${first.map(s=>s.name).join('、')}：本店首购资格${first[0].available?'可用':'已用'}；下店恢复。`:'',state.purchaseCoupons>0?`暖场跳场券 ${state.purchaseCoupons} 张，每笔最多用1张。`:''].filter(Boolean).join('\n');
}
/** Only a newly committed consumed offer in the same shop. Acquisition remains the receipt's separate guard. */
export function purchasePaymentFacts(before:R2RunState,after:R2RunState,offer:R2Offer):PurchasePaymentFacts|undefined{
 if(!before.shop||!after.shop||after.commandSeq!==before.commandSeq+1||after.shop.visitIndex!==before.shop.visitIndex||after.shop.purchases!==before.shop.purchases+1||offer.consumed)return;
 const held=before.shop.offers.concat(before.shop.toolOffers,before.shop.itemOffers).find(o=>o.offerId===offer.offerId),bought=after.shop.offers.concat(after.shop.toolOffers,after.shop.itemOffers).find(o=>o.offerId===offer.offerId);if(!held||held.consumed||!bought?.consumed||held.definitionId!==offer.definitionId||bought.definitionId!==held.definitionId)return;
 const original=held.price,paid=r2PurchasePrice(before,held),saved=original-paid,sources=purchaseDiscountSources(before).filter(s=>s.available),summary=`支付 · 原${original}→付${paid} · 共省${saved}金`;
 const nominal=sources.length?'购前可用名义额度：'+sources.map(s=>`${s.name} ${s.nominal}金`).join('、')+'。\n实际只按上面的总省额计算；最低付1金，未记录逐来源实际分摊。':'购前没有可用优惠额度。';
 return {original,paid,saved,sources,summary,body:`已保存支付：原价${original}金→实付${paid}金，实际共省${saved}金。${saved===0?'没有实际折扣收益。':''}\n${nominal}\n${purchaseDiscountStatus(after)}${before.purchaseCoupons>after.purchaseCoupons?`\n本次使用暖场券1张，剩余${after.purchaseCoupons}张。`:''}`};
}
