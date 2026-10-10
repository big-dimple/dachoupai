import type {R2RunState} from '../domain/run';
import type {R2JokerInstance} from '../content/r2Schema';
import type {R2Offer} from '../domain/r2Shop';
import {r2PurchasePrice} from '../domain/r2Shop';
import {r2CreateJoker} from '../domain/r2Run';
import {r2JokerCapacity} from '../domain/r2Resources';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {currentBuildFocus} from './BuildDirectionPreferences';
import {shopRouteRelation,shopRouteAdvice,shopPurchaseConditionLosses} from './ShopRouteRelations';
const routes=['group','straight','flush'] as const;
const names={group:'同点',straight:'顺子',flush:'同花'};
/** Applicability of public effects, not activation or a recommendation. All three remain visible. */
export function jokerApplicableRoutes(state:R2RunState,j:R2JokerInstance){return routes.filter(f=>{const r=shopRouteRelation(state,j,f);return r.kind==='direct'||r.kind==='support';});}
export function jokerRouteCaption(state:R2RunState,j:R2JokerInstance,heldWidth?:number){
 const applicable=jokerApplicableRoutes(state,j),labels=applicable.map(f=>names[f]);
 if(heldWidth!==undefined&&heldWidth<64)return applicable.map(f=>({group:'同',straight:'顺',flush:'花'})[f]).join('/');
 if(heldWidth!==undefined&&applicable.length===3)return labels.slice(0,2).join('/')+'\n'+labels[2];
 return labels.join('/')||'核对条件';
}
/** Three transparent current-run advice levels. No rarity, score prediction or RNG input. */
export function shopOfferGuidance(state:R2RunState,offer:R2Offer){
 const focus=currentBuildFocus(state,state.openingRoute),j=r2CreateJoker(offer.definitionId,'guidance/'+offer.offerId,offer.price,offer.edition,state),d=r2JokerDefinitionFor(state,j.definitionId),price=r2PurchasePrice(state,offer);
 const result=(stars:0|1|2|3,reason:string,detail=reason)=>({stars,reason,detail,routes:jokerApplicableRoutes(state,j),routeCaption:jokerRouteCaption(state,j),label:stars?'本局'+'★'.repeat(stars):'本局待选'});
 if(offer.consumed)return result(1,'已购');
 if(state.jokers.some(h=>h.definitionId===j.definitionId))return result(1,'已持同名');
 if(price>state.gold)return result(1,`差${price-state.gold}金`);
 if(!focus)return result(0,'先选路线');
 const advice=shopRouteAdvice(state,focus).items.find(a=>a.offer.offerId===offer.offerId),losses=shopPurchaseConditionLosses(state,offer);
 if(losses.length)return result(1,'先留金币',losses.join('\n'));
 if(state.jokers.length>=r2JokerCapacity(state)&&advice?.verdict!=='compare')return result(1,'需先腾槽',advice?.reason);
 if(advice?.verdict==='compare')return result(2,'先比替换',advice.reason+(advice.loss?'\n'+advice.loss:''));
 if(shopRouteRelation(state,j,focus).kind==='other')return result(1,'非当前路');
 if(advice?.verdict==='consider')return result(3,'补缺口',advice.reason);
 const operations=d.hooks.flatMap(h=>h.condition.kind==='always'?h.operations:[]),heldRoles=new Set(state.jokers.flatMap(h=>r2JokerDefinitionFor(state,h.definitionId).hooks.flatMap(h=>h.operations.map(o=>o.kind))));
 const gap=operations.find(o=>(o.kind==='add-heat'||o.kind==='add-multiplier')&&!heldRoles.has(o.kind));
 if(gap)return result(3,gap.kind==='add-heat'?'补热度':'补倍率','无牌型限制的真实加成；当前持有缺少这一加成类型，实际仍按封禁/结算事件检查。');
 if(d.modifiers?.some(m=>m.kind==='first-purchase-discount'))return result(2,'后续省金','购买前未持有不减本笔；后续各店首次成功购买按原规则减1金，不保证回本。');
 const heldRank=d.hooks.find(h=>h.condition.kind==='held-rank-first');
 if(heldRank&&heldRank.condition.kind==='held-rank-first'){
  const c=heldRank.condition,possible=state.deckInstances.some(card=>!state.destroyedIds.includes(card.id)&&c.values.includes(card.rank));
  return possible?result(2,'须留低牌',`公开牌组有${c.values.join('/')}；须把它们留在前${c.limit}位才读收益，不保证下一手抽到。`):result(1,'缺所需点数');
 }
 return result(2,'先核条件',advice?.reason??d.description);
}
