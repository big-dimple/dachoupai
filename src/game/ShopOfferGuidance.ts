import type {R2RunState} from '../domain/run';
import type {R2JokerInstance} from '../content/r2Schema';
import type {R2Offer} from '../domain/r2Shop';
import {r2PurchasePrice} from '../domain/r2Shop';
import {r2CreateJoker} from '../domain/r2Run';
import {r2JokerCapacity} from '../domain/r2Resources';
import {currentBuildFocus} from './BuildDirectionPreferences';
import {shopRecommendation} from './ShopRecommendation';
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
/** Recommendation value and transaction feasibility are separate public results. */
export function shopOfferGuidance(state:R2RunState,offer:R2Offer){
 const focus=currentBuildFocus(state,state.openingRoute),j=r2CreateJoker(offer.definitionId,'guidance/'+offer.offerId,offer.price,offer.edition,state),price=r2PurchasePrice(state,offer),recommendation=shopRecommendation(state,offer,focus);
 const full=state.jokers.length>=r2JokerCapacity(state),same=state.jokers.some(h=>h.definitionId===j.definitionId);
 // Preserve PR118's evaluated replacement facts, including a deliberately empty list.
 const advice=focus?shopRouteAdvice(state,focus).items.find(a=>a.offer.offerId===offer.offerId):undefined,losses=advice?.purchaseConditionLosses??shopPurchaseConditionLosses(state,offer);
 const operation=offer.consumed?'已购':same?'已持同名':full?'需替换':price>state.gold?`差${price-state.gold}金`:'可购买';
 const cashBasis=advice?.replaceId?'拟换第'+(state.jokers.findIndex(j=>j.instanceId===advice.replaceId)+1)+'槽':full?'未选替换：以下仅为直接买入现金':'直接买入';
 const stars=recommendation.stars,label=stars?'推荐指数 '+'★'.repeat(stars)+'☆'.repeat(5-stars):'推荐指数 待核';
 return {stars,label,reason:recommendation.reason,condition:recommendation.condition,recommendation,operation,operationShort:losses.length?'现金风险':operation,
  purchaseConditionLosses:losses,cashBasis,replaceId:advice?.replaceId,
  detail:recommendation.detail+'\n'+operation+(price>state.gold?` · 直接买入差${price-state.gold}金`:'')+(losses.length?'\n'+cashBasis+'\n'+losses.join('\n'):''),
  routes:jokerApplicableRoutes(state,j),routeCaption:jokerRouteCaption(state,j)};
}
