import type {R2RunState} from '../domain/run';
import type {Condition,R2JokerDefinition,R2JokerInstance} from '../content/r2Schema';
import {r2JokerDefinitionsFor} from '../domain/r2ContentProfiles';
import {r2CreateJoker} from '../domain/r2Run';
import {r2ScoringDisabledJokerIds} from '../domain/scoreR2';
import {R2_HAND_TYPES,type R2HandType} from '../domain/evaluateR2';
import {Rational} from '../domain/rational';
import {HAND_LABELS} from '../content/handLabels';
import {shopGoldConditionMatches,shopPurchaseCashFacts,shopPurchaseConditionLosses} from './ShopRouteRelations';
import {cardDefinitionName} from './tangsongCardNames';
export interface ShopSynergyResult {hasSynergy:boolean;heldInstanceIds:string[];heroSynergy:boolean;tag:string;reason:string}
function conditionTypes(c:Condition,gold:number):readonly R2HandType[]|undefined {
 if(c.kind==='always')return R2_HAND_TYPES;
 if(c.kind==='hand-type-in')return c.values;
 const cash=shopGoldConditionMatches(c,gold);if(cash!==undefined)return cash?R2_HAND_TYPES:[];
}
/** Deliberately limited to effects whose public current value and simple condition are known. */
function supportedConditions(d:R2JokerDefinition,j:R2JokerInstance,gold:number){
 return d.hooks.filter(h=>['jokerScore','afterHand'].includes(h.phase)&&h.operations.some(o=>{
  if(o.kind==='add-heat'||o.kind==='add-multiplier')return Rational.fromJSON(o.value).n>0n;
  if(o.kind==='multiply-multiplier')return Rational.fromJSON(o.value).compare(new Rational(1n))>0;
  if(o.kind==='read-growth'||o.kind==='consume-growth')return Rational.fromJSON(j.growth[o.key]??{n:'0',d:'1'}).n>0n;
  if(o.kind==='read-coefficient')return Rational.fromJSON(j.growth[o.key]??{n:'1',d:'1'}).compare(new Rational(1n))>0;
  if(o.kind==='add-growth')return Rational.fromJSON(o.value).n>0n&&Rational.fromJSON(j.growth[o.key]??{n:'0',d:'1'}).compare(Rational.fromJSON(o.cap))<0;
  return false;
 })).flatMap(h=>{const types=conditionTypes(h.condition,gold);return types?[types]:[];});
}
/** Condition intersection at the real purchase price, never a strength or activation promise. */
export function findShopSynergy(run:R2RunState,candidateDefId:string):ShopSynergyResult {
 const result:ShopSynergyResult={hasSynergy:false,heldInstanceIds:[],heroSynergy:false,tag:'条件交集',reason:''};
 if(run?.phase!=='shop'||!run.shop||!candidateDefId)return result;
 let definitions;try{definitions=r2JokerDefinitionsFor(run);}catch{return result;}
 const d=definitions.find(d=>d.id===candidateDefId),offer=run.shop.offers.find(o=>o.definitionId===candidateDefId&&!o.consumed);
 if(!d||!offer)return result;
 if(run.jokers.some(j=>j.definitionId===candidateDefId))return {...result,reason:'已持同名牌；不能按重复买入推断配合。'};
 const cash=shopPurchaseCashFacts(run,offer);
 if(cash.status!=='assessed')return {...result,reason:'先指定替换对象，再核对出售与购买后的条件。'};
 if(cash.goldAfterPurchase<0)return {...result,reason:'当前金币不足；不把暂不可买的牌标成联动。'};
 const fresh=r2CreateJoker(d.id,'synergy/'+offer.offerId,cash.price,offer.edition,run),jokers=[...run.jokers,fresh];
 const disabled=new Set(r2ScoringDisabledJokerIds(run.stageIndex%3===2?run.boss:null,jokers,definitions,[],run.chapterDisabledJokerId));
 const conditions=disabled.has(fresh.instanceId)?[]:supportedConditions(d,fresh,cash.goldAfterPurchase),reasons:string[]=[];
 for(const j of run.jokers){
  if(disabled.has(j.instanceId))continue;const held=definitions.find(d=>d.id===j.definitionId);if(!held)continue;
  const common=[...new Set(supportedConditions(held,j,cash.goldAfterPurchase).flatMap(a=>conditions.flatMap(b=>a.filter(t=>b.includes(t)))))];
  if(!common.length)continue;result.heldInstanceIds.push(j.instanceId);
  reasons.push('与已持「'+cardDefinitionName(held)+'」的条件'+(common.length===R2_HAND_TYPES.length?'可同时满足': '交集含'+common.map(t=>HAND_LABELS[t]).join('／'))+'；仍须按各自时点触发，不代表额外加成。');
 }
 result.hasSynergy=!!result.heldInstanceIds.length;
 const losses=shopPurchaseConditionLosses(run,offer);
 result.reason='按实际购款'+run.gold+'→'+cash.goldAfterPurchase+'金核对；'+(reasons.length?reasons.join(' '):'未核实可共同满足的条件，各自查看规则。')+(losses.length?'\n'+losses.join('\n'):'');
 return result;
}
