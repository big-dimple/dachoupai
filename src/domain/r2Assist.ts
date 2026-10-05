import {r2RunModeConfig} from '../content/r2Modes';
import type {R2RunState} from './r2Run';
import {AMO_ASSIST_TYPES} from './r2QualifiedHands';
import {R2_ASSIST_JOKERS} from '../content/r2AssistJokers';
export {AMO_ASSIST_TYPES} from './r2QualifiedHands';
import {r2SelectionFacts,type R2SelectionInput,type R2SelectionFacts} from './r2SelectionFacts';
import {R2_PUBLISHED_CONTENT} from './r2PublishedContent';
import {stableHash} from './hash';

export const R2_ASSIST_VERSION='quality-r2-amo-assist-prototype-v1';
export const R2_ASSIST_CONTRACT=Object.freeze({qualifiedTypes:AMO_ASSIST_TYPES,pair:2,three:4,usesPerStage:1,ordinaryStartingLevels:true,phase:'after-joker',consumption:'not-main-not-held-not-discard',disabledAssist:'reject',B08:'reject',Q01:'reject'});
export const R2_ASSIST_HASH=stableHash({publishedV11:R2_PUBLISHED_CONTENT.v11.hash,amoAssist:R2_ASSIST_CONTRACT,jokers:R2_ASSIST_JOKERS});
export interface R2AssistFacts extends R2SelectionFacts {
  assistIds:string[];assistKind:'pair'|'three-kind';assistMultiplier:2|4;
  assistConsumedIds:string[];
  /** Main and assist instances, in original hand order, to move to the used zone. */
  consumedIds:string[];
}
/** Selection-only DTO: no score preview, RNG, future draw pile, journal or commands. */
export function r2AssistFacts(input:R2SelectionInput&{assistIds:readonly string[]}):R2AssistFacts {
  const main=r2SelectionFacts(input),ids=input.assistIds;
  if(!AMO_ASSIST_TYPES.includes(main.type))throw Error('assist-unqualified-main');
  if(!Array.isArray(ids)||![2,3].includes(ids.length)||new Set(ids).size!==ids.length)throw Error('invalid-assist-group');
  if(ids.some(id=>input.selectedIds.includes(id)||!input.hand.some(c=>c.id===id)))throw Error('assist-overlap-or-unknown');
  const cards=input.hand.filter(c=>ids.includes(c.id));
  if(cards.some(c=>input.disabledIds.includes(c.id)))throw Error('assist-disabled-card');
  if(cards.some(c=>c.rank!==cards[0].rank))throw Error('assist-not-matching-rank');
  const consumedIds=input.hand.filter(c=>input.selectedIds.includes(c.id)||ids.includes(c.id)).map(c=>c.id);
  return {...main,heldIds:main.heldIds.filter(id=>!ids.includes(id)),assistIds:cards.map(c=>c.id),assistConsumedIds:cards.map(c=>c.id),assistKind:ids.length===2?'pair':'three-kind',assistMultiplier:ids.length===2?2:4,consumedIds};
}

/** Only public current-run facts; UI may use this before drafting a group. No score or future cards. */
export function r2AssistAvailability(state:Pick<R2RunState,'contentVersion'|'contentHash'|'characterId'|'phase'|'stage'|'mode'|'difficulty'|'challengeId'|'programsEnabled'>):
  {available:true;remaining:1}|{available:false;remaining:0;reason:'profile'|'character'|'phase'|'disabled'|'used'} {
  if(state.contentVersion!==R2_ASSIST_VERSION||state.contentHash!==R2_ASSIST_HASH)return {available:false,remaining:0,reason:'profile'};
  if(state.characterId!=='amo')return {available:false,remaining:0,reason:'character'};
  if(state.phase!=='await-input'||!state.stage)return {available:false,remaining:0,reason:'phase'};
  if(!r2RunModeConfig(state).characterAbilityEnabled||state.stage.boss?.definitionId==='B08')return {available:false,remaining:0,reason:'disabled'};
  if(state.stage.assistUsed!==false)return {available:false,remaining:0,reason:'used'};
  return {available:true,remaining:1};
}
