import {SUITS,type PlayingCard} from '../cards/types';
import {R2_LONG_TERM_ITEMS,R2_TOOL_CATALOG,R2_TOOLS} from '../content/r2Tools';
import {SeededRng} from '../core/SeededRng';
import {R2_HAND_TYPES} from './evaluateR2';
import {getR2Stage,r2ConsumableCapacity,r2HandLimit,r2HandsBudget,type R2RunState} from './r2Run';
import {r2Pool} from './r2Shop';
import {r2ToolSupported} from './r2ToolRuntime';
import type {Command,DomainEvent} from './run';

function weightedChoice<T extends string>(rng:SeededRng,choices:readonly {id:T;weight:number}[]):T {
  let ticket=rng.integer(0,choices.reduce((sum,choice)=>sum+choice.weight,0)-1);
  for(const choice of choices){if(ticket<choice.weight)return choice.id;ticket-=choice.weight;}
  throw Error('invalid-spectral-pool');
}

/** All guards precede changes to the caller's transaction copy or its rule/reward cursor. */
export function applyR2SpectralTool(state:R2RunState,command:Command,events:DomainEvent[]):string|undefined {
  const action=command.action;
  if(action.type!=='UseConsumable')return 'invalid-command';
  if(state.phase!=='shop'&&state.phase!=='await-input'||state.phase==='await-input'&&!state.stage)return 'wrong-phase';
  const itemIndex=state.consumables.findIndex(item=>item.instanceId===action.instanceId);
  if(itemIndex<0)return 'unknown-consumable';
  const item=state.consumables[itemIndex],tool=R2_TOOLS.find(tool=>tool.id===item.definitionId);
  if(!tool||tool.family!=='spectral'||!r2ToolSupported(tool.id))return 'consumable-not-enabled';
  if(!tool.phases.includes(state.phase))return 'wrong-phase';

  const parameters:Record<string,readonly string[]>={
    'card-sacrifice':['sacrificeId'],'card-or-joker':['targetKind'],cards:[],suit:['suit'],
    'hand-exchange':['handType','secondaryHandType'],none:[],'joker-sacrifice':['sacrificeId'],'whole-deck':[],
  };
  const allowed=['type','instanceId','targetIds',...(parameters[tool.target.kind]??[])];
  if(Object.keys(action).some(key=>!allowed.includes(key)))return 'wrong-consumable-target';
  const ids=action.targetIds;
  if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)return 'invalid-targets';
  const living=state.deckInstances.filter(card=>!state.destroyedIds.includes(card.id));
  const known=state.phase==='shop'?living:state.handOrder.map(id=>living.find(card=>card.id===id)!);
  const selected=():PlayingCard[]=>known.filter(card=>ids.includes(card.id));
  const knownTargets=():boolean=>ids.every(id=>known.some(card=>card.id===id));
  const limits=R2_TOOL_CATALOG.limits,operation=tool.operation,cost=tool.costs[0];
  if(cost?.kind==='gold'&&state.gold<cost.amount||cost?.kind==='all-gold'&&state.gold<cost.minimum)return 'not-enough-gold';
  const createdCardIds:string[]=[],destroyedCardIds:string[]=[],createdJokerIds:string[]=[],destroyedJokerIds:string[]=[];
  let eventTargets=[...ids];

  switch(operation.kind){
    case 'random-enhancement': {
      if(tool.target.kind!=='card-sacrifice'||cost?.kind!=='sacrifice-card')return 'invalid-spectral-contract';
      if(ids.length<tool.target.minimum||ids.length>tool.target.maximum)return 'invalid-targets';
      if(!knownTargets()||!known.some(card=>card.id===action.sacrificeId))return 'unavailable-target';
      if(ids.includes(action.sacrificeId!))return 'donor-is-recipient';
      const targets=selected();
      if(targets.some(card=>card.enhancement!==undefined))return 'nonordinary-target';
      const floor=R2_LONG_TERM_ITEMS.reduce((floor,item)=>state.longTermItems.includes(item.id)&&item.operation.kind==='deletion-floor'
        ?Math.min(floor,item.operation.floor):floor,limits.deckDeletionFloor);
      if(living.length-cost.count<floor)return 'deck-floor';
      if(state.phase==='await-input'&&!state.handOrder.some(id=>id!==action.sacrificeId))return 'no-legal-cards';
      const rng=SeededRng.restore(state.rng.rule);
      const assignments=targets.map(card=>({card,enhancement:weightedChoice(rng,operation.choices)}));
      for(const assignment of assignments)assignment.card.enhancement=assignment.enhancement;
      const donor=action.sacrificeId!;
      state.destroyedIds.push(donor);destroyedCardIds.push(donor);
      for(const zone of ['drawPile','handOrder','playedPile','discardPile'] as const)state[zone]=state[zone].filter(id=>id!==donor);
      if(state.stage)state.stage.disabledIds=state.stage.disabledIds.filter(id=>id!==donor);
      state.rng.rule=rng.snapshot();eventTargets=targets.map(card=>card.id);break;
    }
    case 'random-edition': {
      if(tool.target.kind!=='card-or-joker'||cost?.kind!=='gold')return 'invalid-spectral-contract';
      if(ids.length!==1||action.targetKind!=='card'&&action.targetKind!=='joker')return 'invalid-targets';
      const target=action.targetKind==='card'?(knownTargets()?selected()[0]:undefined):state.jokers.find(joker=>joker.instanceId===ids[0]);
      if(!target)return 'unavailable-target';
      if((target.edition??'none')!==tool.target.edition)return 'nonordinary-target';
      const rng=SeededRng.restore(state.rng.rule),edition=weightedChoice(rng,operation.choices);
      target.edition=edition;state.rng.rule=rng.snapshot();break;
    }
    case 'copy-card': {
      if(tool.target.kind!=='cards'||cost?.kind!=='permanent-hands-penalty')return 'invalid-spectral-contract';
      if(ids.length<tool.target.minimum||ids.length>tool.target.maximum)return 'invalid-targets';
      if(!knownTargets())return 'unavailable-target';
      if(!getR2Stage(state.stageIndex))return 'no-next-stage';
      if(living.length+operation.copies>limits.deckMaximum)return 'deck-maximum';
      const modifiers={...state.spectralModifiers,handsPenalty:state.spectralModifiers.handsPenalty+cost.amount};
      if(modifiers.handsPenalty>limits.spectralHandsPenaltyMaximum)return 'resource-floor';
      const before=r2HandsBudget(state),after=r2HandsBudget({...state,spectralModifiers:modifiers});
      if(after<limits.handsMinimum||before-after!==cost.amount)return 'resource-floor';
      for(let copy=0;copy<operation.copies;copy++)createdCardIds.push(`${state.runId}/card/${command.commandId}/${copy}`);
      if(createdCardIds.some(id=>state.deckInstances.some(card=>card.id===id)))return 'duplicate-card-id';
      const source=selected()[0];
      for(const id of createdCardIds)state.deckInstances.push({id,rank:source.rank,suit:source.suit,
        ...(source.enhancement===undefined?{}:{enhancement:source.enhancement}),...(source.edition===undefined?{}:{edition:source.edition})});
      state.drawPile.unshift(...createdCardIds);state.spectralModifiers=modifiers;break;
    }
    case 'set-deck-suit': {
      if(tool.target.kind!=='suit'||cost?.kind!=='permanent-hand-penalty')return 'invalid-spectral-contract';
      if(ids.length||!action.suit||!SUITS.includes(action.suit))return 'invalid-targets';
      if(living.every(card=>card.suit===action.suit))return 'no-effect';
      if(!getR2Stage(state.stageIndex))return 'no-next-stage';
      const modifiers={...state.spectralModifiers,handPenalty:state.spectralModifiers.handPenalty+cost.amount};
      if(modifiers.handPenalty>limits.spectralHandPenaltyMaximum)return 'resource-floor';
      const before=r2HandLimit(state),after=r2HandLimit({...state,spectralModifiers:modifiers});
      if(after<limits.handMinimum||before-after!==cost.amount)return 'resource-floor';
      for(const card of living)card.suit=action.suit;
      state.spectralModifiers=modifiers;break;
    }
    case 'exchange-hand-levels': {
      if(tool.target.kind!=='hand-exchange'||cost?.kind!=='gold')return 'invalid-spectral-contract';
      const gain=action.handType,loss=action.secondaryHandType;
      if(ids.length||!gain||!loss||gain===loss||!R2_HAND_TYPES.includes(gain)||!R2_HAND_TYPES.includes(loss))return 'invalid-hand-exchange';
      if(!Object.hasOwn(state.handLevels,gain)||!Object.hasOwn(state.handLevels,loss))return 'undiscovered-hand-type';
      const beforeGain=state.handLevels[gain]!,beforeLoss=state.handLevels[loss]!;
      if(beforeGain>operation.targetMaximumBefore||beforeGain+operation.gain>limits.handLevelMaximum)return 'hand-level-cap';
      if(beforeLoss<operation.donorMinimumBefore||beforeLoss-operation.loss<1)return 'invalid-hand-exchange';
      state.handLevels[gain]=beforeGain+operation.gain;state.handLevels[loss]=beforeLoss-operation.loss;break;
    }
    case 'rare-joker-reward': {
      if(tool.target.kind!=='none'||cost?.kind!=='all-gold')return 'invalid-spectral-contract';
      if(ids.length)return 'invalid-targets';
      if(state.jokers.length>=limits.jokerMaximum)return 'joker-slots-full';
      const pool=r2Pool(state.jokers.map(joker=>joker.definitionId),state.safetyNetUsed?['f07']:[]).filter(definition=>definition.rarity==='rare');
      if(!pool.length)return 'empty-reward-pool';
      const instanceId=`${state.runId}/joker/${command.commandId}`;
      if(state.jokers.some(joker=>joker.instanceId===instanceId))return 'duplicate-joker-id';
      const rng=SeededRng.restore(state.rng.reward),definition=pool[rng.integer(0,pool.length-1)];
      state.jokers.push({instanceId,definitionId:definition.id,paidPrice:operation.paidPrice,growth:{},edition:operation.edition});
      createdJokerIds.push(instanceId);state.rng.reward=rng.snapshot();break;
    }
    case 'set-joker-edition': {
      if(tool.target.kind!=='joker-sacrifice'||cost?.kind!=='sacrifice-joker')return 'invalid-spectral-contract';
      if(ids.length!==tool.target.recipients)return 'invalid-targets';
      if(ids.includes(action.sacrificeId!))return 'donor-is-recipient';
      const donor=state.jokers.find(joker=>joker.instanceId===action.sacrificeId),target=state.jokers.find(joker=>joker.instanceId===ids[0]);
      if(!donor||!target)return 'unavailable-target';
      if(target.edition===tool.target.excludedEdition)return 'target-already-polychrome';
      const remaining=state.jokers.filter(joker=>joker.instanceId!==donor.instanceId);
      if(state.consumables.length-1>r2ConsumableCapacity({...state,jokers:remaining}))return 'over-capacity-after-sacrifice';
      target.edition=operation.edition;state.jokers=remaining;destroyedJokerIds.push(donor.instanceId);break;
    }
    case 'clear-deck-specials': {
      if(tool.target.kind!=='whole-deck'||cost)return 'invalid-spectral-contract';
      if(ids.length)return 'invalid-targets';
      if(state.spectralModifiers.cleanSlateBonus)return 'already-claimed';
      if(living.filter(card=>card.enhancement!==undefined||(card.edition??'none')!=='none').length<operation.minimumModifiedCards)return 'too-few-special-cards';
      if(!getR2Stage(state.stageIndex))return 'no-next-stage';
      const modifiers={...state.spectralModifiers,cleanSlateBonus:state.spectralModifiers.cleanSlateBonus+operation.handBonus};
      const before=r2HandLimit(state),after=r2HandLimit({...state,spectralModifiers:modifiers});
      if(after>limits.handMaximum||after-before!==operation.handBonus)return 'resource-cap';
      for(const card of living){delete card.enhancement;delete card.edition;}
      state.spectralModifiers=modifiers;break;
    }
    default:return 'consumable-not-enabled';
  }

  if(cost?.kind==='gold')state.gold-=cost.amount;
  else if(cost?.kind==='all-gold')state.gold=0;
  state.consumables.splice(itemIndex,1);
  events.push({type:'consumable-used',definitionId:item.definitionId,instanceId:item.instanceId,targetIds:eventTargets,
    createdCardIds,destroyedCardIds,...(createdJokerIds.length?{createdJokerIds}:{}),...(destroyedJokerIds.length?{destroyedJokerIds}:{})});
}
