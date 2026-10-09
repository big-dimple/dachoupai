import {enumerateR2HandCandidates,type R2CandidateInput} from '../domain/r2HandCandidates';
import {r2SelectionFacts,type R2SelectionFacts} from '../domain/r2SelectionFacts';
import {r2OrdinarySuppression} from '../domain/r2Chapter';

/** Current public cards only. Preserve retained cards; never rank by score or inspect future draws. */
export function handRouteTransitions(input:R2CandidateInput,keepIds:readonly string[]):R2SelectionFacts[]{
 if(!input.hand.length||input.hand.length>14||!keepIds.length||keepIds.some(id=>!input.hand.some(c=>c.id===id)))return [];
 const outside=input.hand.filter(c=>!keepIds.includes(c.id));
 if(!outside.length)return [];
 const groups=enumerateR2HandCandidates({...input,hand:outside}).groups;
 // Same pattern order as the existing gallery. First example is minimal count, then seat order.
 const candidates=groups.slice().reverse().flatMap(g=>g.examples.slice(0,1));
 const widest=groups.flatMap(g=>g.examples).sort((a,b)=>b.playedIds.length-a.playedIds.length)[0];
 const selected=candidates[0]?[candidates[0]]:[];
 if(widest&&!selected.some(f=>f.playedIds.join('|')===widest.playedIds.join('|')))selected.push(widest);
 return selected.map(example=>{
  const suppression=input.boss?r2OrdinarySuppression(input.boss,input.stageIndex,input.hand,example.playedIds):[];
  return r2SelectionFacts({...input,selectedIds:example.playedIds,ordinaryPointsSuppressedIds:[...new Set([...(input.ordinaryPointsSuppressedIds??[]),...suppression])]});
 });
}
export function handRoutePlayBudget(handsLeft:number):string {
 const effects='返手或救场按实际效果结算；补牌不保证补齐。';
 return handsLeft<=1?'常规最后一手：通常出牌后没有剩余次数；未达目标有败局风险。'+effects+'可放弃留牌，看全部已成型。':
  '本场剩余出牌 '+handsLeft+' 次；过渡常规消耗1次，常规剩余 '+(handsLeft-1)+' 次。'+effects;
}
