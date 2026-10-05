import {r2AssistFacts,type R2AssistFacts} from '../domain/r2Assist';
import type {R2SelectionInput} from '../domain/r2SelectionFacts';
import type {ScoreTrace} from '../domain/scoreR2';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';

/** Only the visible remainder is enumerated. The domain validates every group. */
export function assistCandidates(input:R2SelectionInput,available:boolean):R2AssistFacts[] {
  if(!available||!input.selectedIds.length)return [];
  const remainder=input.hand.filter(card=>!input.selectedIds.includes(card.id)),groups:R2AssistFacts[]=[];
  for(let i=0;i<remainder.length;i++)for(let j=i+1;j<remainder.length;j++){
    if(remainder[i].rank!==remainder[j].rank)continue;
    const offer=(ids:string[])=>{try{groups.push(r2AssistFacts({...input,assistIds:ids}));}catch{/* Domain rejection is not a selectable candidate. */}};
    offer([remainder[i].id,remainder[j].id]);
    for(let k=j+1;k<remainder.length;k++)if(remainder[k].rank===remainder[i].rank)offer([remainder[i].id,remainder[j].id,remainder[k].id]);
  }
  return groups;
}
export function validAssistDraft(input:R2SelectionInput,available:boolean,ids:readonly string[]):R2AssistFacts|undefined {
  if(!available||!ids.length)return;
  try{return r2AssistFacts({...input,assistIds:ids});}catch{return;}
}
export const ASSIST_EXPLANATION='助攻会一同用掉，不算主手或留手牌';
export const ASSIST_AI_EXPLANATION='AI只整理主手，助攻自己选';
/** Recaps only use the persisted ledger and its complete card snapshots. */
export function savedAssistCopy(trace:ScoreTrace):string {
 if(!trace.assist)return '';
 const label=trace.assist.ids.map(id=>{const card=trace.cards.find(card=>card.id===id)!;return rankLabel(card.rank)+SUIT_SYMBOL[card.suit];}).join(' ');
 return '助攻 '+label+' · ×'+trace.assist.multiplier+'（已一同用掉，不计主手或留手）';
}
