import {AMO_ASSIST_TYPES} from './r2QualifiedHands';
import type {PlayingCard} from '../cards/types';
import {readR2Modifiers,type R2JokerDefinition,type R2JokerInstance} from '../content/r2Schema';
import {evaluateR2Hand,validateCardInstances,type HandRules,type R2HandType} from './evaluateR2';

/** Visible selection only: no score policy, RNG, future deck, resources or event chain. */
export interface R2SelectionInput {
  hand:readonly PlayingCard[];selectedIds:readonly string[];
  jokers:readonly R2JokerInstance[];definitions:readonly R2JokerDefinition[];
  handRules?:HandRules;disabledIds:readonly string[];ordinaryPointsSuppressedIds?:readonly string[];
}
export interface R2SelectionFacts {
  type:R2HandType;playedIds:string[];scoringIds:string[];activeScoringIds:string[];
  heldIds:string[];accompanyingIds:string[];disabledIds:string[];ordinaryPointsSuppressedIds:string[];
  rules:{fourStraight:boolean;fourFlush:boolean};
  ruleSources:{instanceId:string;definitionId:string;kind:'four-straight'|'four-flush';used:boolean}[];
}
export function r2SelectionFacts(input:R2SelectionInput):R2SelectionFacts {
  validateCardInstances(input.hand);
  if(!input.selectedIds.length||input.selectedIds.length>5||new Set(input.selectedIds).size!==input.selectedIds.length||input.selectedIds.some(id=>!input.hand.some(c=>c.id===id)))throw Error('invalid-selection');
  const played=input.hand.filter(c=>input.selectedIds.includes(c.id));
  // Scoring-hook bans never remove inventory modifiers, including B06/B15/B16.
  const modifiers=readR2Modifiers(input.jokers,input.definitions);
  const rules={fourStraight:!!input.handRules?.fourStraight||modifiers.fourStraight,fourFlush:!!input.handRules?.fourFlush||modifiers.fourFlush};
  const evaluated=evaluateR2Hand(played,rules),scoringIds=evaluated.scoringIds;
  const ruleSources=input.jokers.flatMap(j=>input.definitions.find(d=>d.id===j.definitionId)!.modifiers?.flatMap(m=>m.kind==='four-straight'||m.kind==='four-flush'?[{instanceId:j.instanceId,definitionId:j.definitionId,kind:m.kind,used:played.length===4&&evaluated.type===(m.kind==='four-straight'?'straight':'flush')}]:[])??[]);
  return {type:evaluated.type,playedIds:played.map(c=>c.id),scoringIds,
    activeScoringIds:scoringIds.filter(id=>!input.disabledIds.includes(id)),heldIds:input.hand.filter(c=>!input.selectedIds.includes(c.id)).map(c=>c.id),
    accompanyingIds:played.filter(c=>!scoringIds.includes(c.id)).map(c=>c.id),disabledIds:played.filter(c=>input.disabledIds.includes(c.id)).map(c=>c.id),
    ordinaryPointsSuppressedIds:played.filter(c=>input.ordinaryPointsSuppressedIds?.includes(c.id)).map(c=>c.id),rules,ruleSources};
}

/** Bounded public classification only. Disabled cards still participate in the unique evaluator. */
export function r2HasQualifiedHand(input:Pick<R2SelectionInput,'hand'|'jokers'|'definitions'>):boolean {
 validateCardInstances(input.hand);
 const modifiers=readR2Modifiers(input.jokers,input.definitions),rules={fourStraight:modifiers.fourStraight,fourFlush:modifiers.fourFlush};
 const chosen:PlayingCard[]=[];
 const visit=(start:number):boolean=>{
  if(chosen.length>=3&&AMO_ASSIST_TYPES.includes(evaluateR2Hand(chosen,rules).type))return true;
  if(chosen.length===5)return false;
  for(let i=start;i<input.hand.length;i++){chosen.push(input.hand[i]);if(visit(i+1))return true;chosen.pop();}
  return false;
 };
 return visit(0);
}
