import type {PlayingCard,Rank} from '../cards/types';
import {R2_TOOL_CATALOG,R2_TOOLS} from '../content/r2Tools';
import {r2DisabledCards} from './r2Chapter';
import type {R2HandType} from './evaluateR2';
import {makeR2Shop,R2_RESOURCE_CONTRACT,type R2RunState} from './r2Run';
import {r2Pool,r2ToolAcquisitionPool} from './r2Shop';
import {r2ToolSupported} from './r2ToolRuntime';
import {applyR2SpectralTool} from './r2SpectralTools';
import type {Command,DomainEvent} from './run';

const refreshDisabled=(state:R2RunState):void=>{
  if(state.stage)state.stage.disabledIds=r2DisabledCards(state.boss,state.stage.index,state.handOrder.map(id=>state.deckInstances.find(card=>card.id===id)!));
};

/** Mutates only the caller's transaction copy. A rejection discards that entire transaction. */
export function applyR2Tool(state:R2RunState,command:Command,events:DomainEvent[]):string|undefined {
  const action=command.action;
  if(action.type!=='UseConsumable')return 'invalid-command';
  if(state.phase!=='shop'&&state.phase!=='await-input'||state.phase==='await-input'&&!state.stage)return 'wrong-phase';
  const itemIndex=state.consumables.findIndex(item=>item.instanceId===action.instanceId);
  if(itemIndex<0)return 'unknown-consumable';
  const item=state.consumables[itemIndex],tool=R2_TOOLS.find(definition=>definition.id===item.definitionId);
  if(!tool||!r2ToolSupported(tool.id))return 'consumable-not-enabled';
  if(tool.family==='spectral')return applyR2SpectralTool(state,command,events);
  if(tool.costs.length)return 'consumable-not-enabled';
  if(!tool.phases.includes(state.phase))return 'wrong-consumable-target';
  if(action.secondaryHandType!==undefined||action.suit!==undefined||action.sacrificeId!==undefined||action.targetKind!==undefined)return 'wrong-consumable-target';
  const ids=action.targetIds;
  if(!Array.isArray(ids)||ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)return 'invalid-targets';
  const operation=tool.operation;
  let targets:PlayingCard[]=[],handType:R2HandType|undefined;
  switch(tool.target.kind){
    case 'cards': {
      if(action.handType!==undefined||ids.length<tool.target.minimum||ids.length>tool.target.maximum)return 'invalid-targets';
      const eligible=state.phase==='shop'?state.deckInstances.map(card=>card.id).filter(id=>!state.destroyedIds.includes(id)):state.handOrder;
      if(ids.some(id=>!eligible.includes(id)))return 'unavailable-target';
      targets=ids.map(id=>state.deckInstances.find(card=>card.id===id)!);break;
    }
    case 'discovered-hand':
      if(ids.length||operation.kind!=='upgrade-hand')return 'wrong-consumable-target';
      handType=tool.target.selection==='fixed'?operation.handType:action.handType;
      if(tool.target.selection==='fixed'&&action.handType!==undefined&&action.handType!==handType)return 'wrong-hand-type';
      if(!handType||!Object.hasOwn(state.handLevels,handType))return 'undiscovered-hand-type';
      break;
    case 'none':
      if(ids.length||action.handType!==undefined)return 'wrong-consumable-target';
      break;
    default:return 'consumable-not-enabled';
  }
  const createdCardIds:string[]=[],destroyedCardIds:string[]=[];
  switch(operation.kind){
    case 'upgrade-hand': {
      if(tool.target.kind!=='discovered-hand'||!handType)return 'wrong-consumable-target';
      const level=state.handLevels[handType]!;
      if(level+operation.levels>R2_TOOL_CATALOG.limits.handLevelMaximum)return 'hand-level-cap';
      state.handLevels[handType]=level+operation.levels;break;
    }
    case 'restore-discard': {
      if(!state.stage||state.phase!=='await-input')return 'wrong-consumable-target';
      if(state.stage.discardsLeft>=state.stage.initialDiscards)return 'no-effect';
      if(state.stage.discardGained+operation.amount>R2_RESOURCE_CONTRACT.discardGainMaximum)return 'resource-cap';
      state.stage.discardsLeft+=operation.amount;state.stage.discardGained+=operation.amount;break;
    }
    case 'add-gold':
      if(!Number.isSafeInteger(state.gold+operation.amount))return 'resource-overflow';
      state.gold+=operation.amount;break;
    case 'free-reroll':
      if(state.phase!=='shop'||!state.shop)return 'wrong-consumable-target';
      if(!r2Pool(state.jokers.map(j=>j.definitionId),state.safetyNetUsed?['f07']:[]).length&&!r2ToolAcquisitionPool(state).length)return 'no-reroll-candidates';
      makeR2Shop(state,false);break;
    case 'delete-cards': {
      const floor=state.longTermItems.includes('U08')?R2_TOOL_CATALOG.limits.minimalDeckFloor:R2_TOOL_CATALOG.limits.deckDeletionFloor;
      if(state.deckInstances.length-state.destroyedIds.length-ids.length<floor)return 'deck-floor';
      if(state.phase==='await-input'&&state.handOrder.every(id=>ids.includes(id)))return 'no-legal-cards';
      state.destroyedIds.push(...ids);destroyedCardIds.push(...ids);
      state.drawPile=state.drawPile.filter(id=>!ids.includes(id));state.handOrder=state.handOrder.filter(id=>!ids.includes(id));
      state.playedPile=state.playedPile.filter(id=>!ids.includes(id));state.discardPile=state.discardPile.filter(id=>!ids.includes(id));
      refreshDisabled(state);break;
    }
    case 'copy-card': {
      if(state.deckInstances.length-state.destroyedIds.length+operation.copies>R2_TOOL_CATALOG.limits.deckMaximum)return 'deck-maximum';
      const source=targets[0];
      for(let copy=0;copy<operation.copies;copy++)createdCardIds.push(`${state.runId}/card/${command.commandId}/${copy}`);
      if(createdCardIds.some(id=>state.deckInstances.some(card=>card.id===id)))return 'duplicate-card-id';
      for(const id of createdCardIds){
        state.deckInstances.push({id,rank:source.rank,suit:source.suit,...(source.enhancement===undefined?{}:{enhancement:source.enhancement}),...(source.edition===undefined?{}:{edition:source.edition})});
        state.drawPile.unshift(id);
      }
      break;
    }
    case 'set-suit':
      if(targets.every(card=>card.suit===operation.suit))return 'no-effect';
      for(const card of targets)card.suit=operation.suit;refreshDisabled(state);break;
    case 'set-enhancement':
      if(targets.every(card=>card.enhancement===operation.enhancement))return 'no-effect';
      for(const card of targets)card.enhancement=operation.enhancement;break;
    case 'shift-rank': {
      const ranks=targets.map(card=>Math.min(operation.maximum,Math.max(operation.minimum,card.rank+operation.delta)) as Rank);
      if(targets.every((card,index)=>card.rank===ranks[index]))return 'no-effect';
      targets.forEach((card,index)=>card.rank=ranks[index]);refreshDisabled(state);break;
    }
    default:return 'consumable-not-enabled';
  }
  state.consumables.splice(itemIndex,1);
  events.push({type:'consumable-used',definitionId:item.definitionId,instanceId:item.instanceId,targetIds:[...ids],createdCardIds,destroyedCardIds});
}
