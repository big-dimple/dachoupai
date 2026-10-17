import type {R2SelectionInput} from '../domain/r2SelectionFacts';
import {r2AssistFacts,r2AssistAvailability} from '../domain/r2Assist';
import {r2ScoreContext,type R2RunState} from '../domain/r2Run';
import {r2JokerDefinitionsFor} from '../domain/r2ContentProfiles';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import {assistCandidates} from './AssistSelection';

/** Explain the actual domain's disabled-assist rejection, without changing its qualifications. */
export function assistRestrictionCopy(input:R2SelectionInput,available:boolean){
  if(!available||!input.disabledIds.length||assistCandidates(input,true).length)return;
  const blocked=new Set<string>();
  // The existing enumerator finds same-rank remainder groups; the actual rule decides why each fails.
  for(const candidate of assistCandidates({...input,disabledIds:[]},true)){
    try{r2AssistFacts({...input,assistIds:candidate.assistIds});}
    catch(error){if(error instanceof Error&&error.message==='assist-disabled-card')for(const id of candidate.assistIds)if(input.disabledIds.includes(id))blocked.add(id);}
  }
  if(!blocked.size)return;
  const cards=input.hand.filter(c=>blocked.has(c.id)),names=cards.map(c=>rankLabel(c.rank)+SUIT_SYMBOL[c.suit]);
  return {blockedIds:cards.map(c=>c.id),compact:names[0]+'失效',detail:names.join('、')+'计分失效，不能作副牌；换一组未失效的同点牌。'};
}
export function assistRestrictionForRun(run:R2RunState,selectedIds:readonly string[]){
  if(!run.stage?.disabledIds.length||!selectedIds.length||!r2AssistAvailability(run).available)return;
  const hand=run.handOrder.map(id=>run.deckInstances.find(c=>c.id===id)!);
  return assistRestrictionCopy({hand,selectedIds,disabledIds:run.stage.disabledIds,jokers:run.jokers,definitions:r2JokerDefinitionsFor(run),handRules:r2ScoreContext(run,hand,selectedIds).handRules},true);
}
