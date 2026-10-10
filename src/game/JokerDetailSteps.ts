import type {R2JokerDefinition} from '../content/r2Schema';
import {fractionText} from './scoreText';

export interface JokerDetailSteps {
 steps:{when:string;effect:string}[];
 timings:string[];
 limits:string[];
 status:string;
}
/** Reflows existing player sentences without removing condition/effect words. */
export function jokerDetailSteps(definition:R2JokerDefinition,line:string,essential:string,status:string,rules:string):JokerDetailSteps {
 const steps=line.split(/[；。]\s*/).filter(Boolean).map(sentence=>{
  const boundary=sentence.lastIndexOf('，');
  return boundary<0?{when:'',effect:sentence}:{when:sentence.slice(0,boundary),effect:sentence.slice(boundary+1)};
 });
 const limits=essential.split(/\n|；/).filter(Boolean);
 // These are immediate coefficient/growth ceilings, not an inferred scoring result.
 for(const operation of definition.hooks.flatMap(h=>h.operations)){
  if(operation.kind==='add-coefficient'||operation.kind==='multiply-coefficient-once'){
   const cap='系数上限×'+fractionText(operation.cap);
   if(!limits.includes(cap))limits.push(cap);
  }
 }
 // Keep the qualification exception visible; the complete exact list stays in rules.
 if(rules.includes('对子和高牌不算。'))limits.unshift('两对及以上：不含对子、高牌。');
 const labels={onCardScore:'计分牌逐张生效',onHeldCard:'留手牌逐张生效',jokerScore:'出牌时生效',afterHand:'出牌结算后更新',onDiscard:'成功弃牌后生效',onStageClear:'过关时生效',onBuyOffer:'购买成功后生效',onSellJoker:'卖牌成功后生效',onReroll:'换货成功后生效',beforeFailure:'出牌机会耗尽时检查'};
 const timings=[...new Set(definition.hooks.map(h=>labels[h.phase]))];
 return {steps,timings,limits:[...new Set(limits)],status};
}
