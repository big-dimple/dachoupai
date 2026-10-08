import type {R2JokerDefinition} from '../content/r2Schema';
import {fractionText} from './scoreText';

export interface JokerDetailSteps {
 steps:{when:string;effect:string}[];
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
 return {steps,limits:[...new Set(limits)],status};
}
