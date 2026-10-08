import {evaluateR2Hand,validateCardInstances,type R2HandType,type HandRules} from './evaluateR2';
import type {PlayingCard} from '../cards/types';
export const TOUYE_TARGETS=['two-pair','three-kind','full-house','straight','flush'] as const;
export type TouyeTarget=typeof TOUYE_TARGETS[number];
export const TOUYE_ACCEPTED:Readonly<Record<TouyeTarget,readonly R2HandType[]>>=Object.freeze({
 'two-pair':['two-pair','full-house','flush-house'],
 'three-kind':['three-kind','full-house','four-kind','five-kind','flush-house','flush-five'],
 'full-house':['full-house','flush-house'],straight:['straight','straight-flush'],flush:['flush','straight-flush','flush-house','flush-five'],
});
/** Public classification only: no score, draw order, RNG or automatic choice. */
export function touyeReachableTypes(hand:readonly PlayingCard[],rules:HandRules):R2HandType[]{
 validateCardInstances(hand);if(hand.length>14)throw Error('invalid-touye-hand');
 const found=new Set<R2HandType>(),chosen:PlayingCard[]=[];
 const visit=(start:number)=>{if(chosen.length)found.add(evaluateR2Hand(chosen,rules).type);if(chosen.length===5)return;for(let i=start;i<hand.length;i++){chosen.push(hand[i]);visit(i+1);chosen.pop();}};visit(0);return [...found];
}
export function touyeTargetReached(target:TouyeTarget,type:R2HandType):boolean{return TOUYE_ACCEPTED[target].includes(type);}
