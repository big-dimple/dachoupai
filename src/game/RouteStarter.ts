import type {R2RunState} from '../domain/r2Run';
import {isR2RouteStarter,R2_ROUTE_STARTERS} from '../domain/r2GroupUpgrade';
import type {R2Offer} from '../domain/r2Shop';
import {r2PurchasePrice} from '../domain/r2Shop';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {r2RunModeConfig} from '../content/r2Modes';
export const STARTER_ROUTE_LABEL={group:'成组',straight:'顺子',flush:'同花'} as const;
export function starterOffer(s:R2RunState,o:R2Offer){
 if(!isR2RouteStarter(s)||!s.openingRoute||s.stageIndex!==0||s.shop?.rerollCount!==0||o.consumed||o.definitionId!==R2_ROUTE_STARTERS[s.openingRoute])return;
 return {label:STARTER_ROUTE_LABEL[s.openingRoute]+'起手',price:r2PurchasePrice(s,o),name:r2JokerDefinitionFor(s,o.definitionId).name};
}
export function starterShopCue(s:R2RunState){
 if(!isR2RouteStarter(s)||!s.openingRoute||s.phase!=='shop'||s.stageIndex!==0)return;
 const owned=s.jokers.find(j=>j.instanceId===s.routeStarter?.instanceId);
 if(owned)return owned.definitionId==='c06'?'已收入越染越深：凑同花后存成长，下手起加倍率。':'已收入'+r2JokerDefinitionFor(s,owned.definitionId).name+'：到牌桌点怎么凑牌，满足条件后自己出牌。';
 const offer=s.shop?.offers.find(o=>starterOffer(s,o));if(offer){const fact=starterOffer(s,offer)!;return fact.label+' · '+fact.name+' '+fact.price+'金'+(fact.price<=s.gold?'可买；不买也可入场。':'，还差'+(fact.price-s.gold)+'金；可留金入场。');}
 const config=r2RunModeConfig(s),price=s.openingRoute==='flush'?6:4;
 if(config.initialGold<price)return '此模式起始'+config.initialGold+'金，不保障'+STARTER_ROUTE_LABEL[s.openingRoute]+'起手牌；保留原模式经济。';
}
/** Preview uses public hand type and actual source restrictions, never forecast totals. */
export function starterSelection(s:R2RunState,instanceId:string,type:string|undefined,limited=false){
 if(!s.openingRoute||s.routeStarter?.instanceId!==instanceId)return;
 if(limited)return {ready:false,label:'路线牌停用'};
 if(!type)return {ready:false,label:STARTER_ROUTE_LABEL[s.openingRoute]+'起手 · 待选'};
 const definition=r2JokerDefinitionFor(s,R2_ROUTE_STARTERS[s.openingRoute]);
 const ready=definition.hooks.some(h=>h.condition.kind==='hand-type-in'&&h.condition.values.includes(type as never));
 return {ready,label:ready?s.openingRoute==='flush'?'同花后存成长':STARTER_ROUTE_LABEL[s.openingRoute]+'待发动':'需要'+STARTER_ROUTE_LABEL[s.openingRoute]};
}
