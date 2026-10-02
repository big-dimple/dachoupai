import {R2_JOKERS,readR2Modifiers} from '../content/r2Schema';
import {R2_TOOL_CATALOG,R2_LONG_TERM_ITEMS,type R2LongTermOperation} from '../content/r2Tools';
import type {R2RunState} from './r2Run';

export const R2_LIMITS = {handSize:8,maxSelected:5,hands:4,discards:3,jokerSlots:5,consumableSlots:2,longTermSlots:4} as const;
export const R2_RESOURCE_CONTRACT={handMinimum:R2_TOOL_CATALOG.limits.handMinimum,handMaximum:R2_TOOL_CATALOG.limits.handMaximum,handsMinimum:R2_TOOL_CATALOG.limits.handsMinimum,handsMaximum:5,discardsMaximum:4,discardGainMaximum:R2_TOOL_CATALOG.limits.consumableSlotsMaximum+1,deckMaximum:R2_TOOL_CATALOG.limits.deckMaximum,discardLedger:'spent-plus-left-equals-entry-plus-gained',handLedger:'plays-plus-left-equals-entry-plus-quad-and-rescue',scoreSources:'start-of-hand-deep-copies',newGame:'explicit-v8'} as const;
type BossResourceContext=Partial<Pick<R2RunState,'boss'|'stageIndex'>>;
const bossReduction=(state:BossResourceContext,bossId:'B09'|'B10',amount:number):number=>state.stageIndex!==undefined&&state.stageIndex%3===2&&state.boss?.definitionId===bossId?amount:0;
export function r2ItemAmount(state:Pick<R2RunState,'longTermItems'>,kind:R2LongTermOperation['kind']):number {
  return R2_LONG_TERM_ITEMS.filter(item=>state.longTermItems.includes(item.id)&&item.operation.kind===kind).reduce((sum,item)=>sum+('amount' in item.operation?item.operation.amount:0),0);
}
export const r2HandLimit=(state:Pick<R2RunState,'jokers'|'deckInstances'|'destroyedIds'|'longTermItems'|'spectralModifiers'>&BossResourceContext):number=>Math.max(R2_RESOURCE_CONTRACT.handMinimum,Math.min(R2_RESOURCE_CONTRACT.handMaximum,R2_LIMITS.handSize+readR2Modifiers(state.jokers,R2_JOKERS,{deckSize:state.deckInstances.length-state.destroyedIds.length}).handLimitBonus+r2ItemAmount(state,'hand-limit')+state.spectralModifiers.cleanSlateBonus-state.spectralModifiers.handPenalty-bossReduction(state,'B10',2)));
export const r2HandsBudget=(state:Pick<R2RunState,'longTermItems'|'spectralModifiers'>&BossResourceContext):number=>Math.max(R2_RESOURCE_CONTRACT.handsMinimum,R2_LIMITS.hands+r2ItemAmount(state,'hands-limit')-state.spectralModifiers.handsPenalty-bossReduction(state,'B09',1));
export const r2DiscardBudget=(state:Pick<R2RunState,'longTermItems'>):number=>R2_LIMITS.discards+r2ItemAmount(state,'discard-limit');
export const r2ConsumableCapacity=(state:Pick<R2RunState,'longTermItems'|'jokers'>):number=>Math.min(R2_TOOL_CATALOG.limits.consumableSlotsMaximum,R2_LIMITS.consumableSlots+readR2Modifiers(state.jokers,R2_JOKERS).consumableCapacityBonus+r2ItemAmount(state,'consumable-slots'));
export const r2InterestCap=(state:Pick<R2RunState,'jokers'|'longTermItems'>):number=>5+readR2Modifiers(state.jokers,R2_JOKERS).interestCapBonus+r2ItemAmount(state,'interest-cap');
