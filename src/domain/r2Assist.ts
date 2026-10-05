import {r2RunModeConfig} from '../content/r2Modes';
import type {R2RunState} from './r2Run';
import {AMO_ASSIST_TYPES} from './r2QualifiedHands';
export {AMO_ASSIST_TYPES} from './r2QualifiedHands';
import {r2SelectionFacts,type R2SelectionInput,type R2SelectionFacts} from './r2SelectionFacts';
import {R2_ASSIST_VERSION,R2_ASSIST_HASH} from './r2AssistIdentity';
import {isR2ComboGrowth} from './r2ComboGrowth';

export {R2_ASSIST_VERSION,R2_ASSIST_HASH,R2_ASSIST_CONTRACT} from './r2AssistIdentity';
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
  if(!isR2ComboGrowth(state)&&(state.contentVersion!==R2_ASSIST_VERSION||state.contentHash!==R2_ASSIST_HASH))return {available:false,remaining:0,reason:'profile'};
  if(state.characterId!=='amo')return {available:false,remaining:0,reason:'character'};
  if(state.phase!=='await-input'||!state.stage)return {available:false,remaining:0,reason:'phase'};
  if(!r2RunModeConfig(state).characterAbilityEnabled||state.stage.boss?.definitionId==='B08')return {available:false,remaining:0,reason:'disabled'};
  if(state.stage.assistUsed!==false)return {available:false,remaining:0,reason:'used'};
  return {available:true,remaining:1};
}
