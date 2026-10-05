import type {R2HandType} from './evaluateR2';
import {r2SelectionFacts,type R2SelectionInput,type R2SelectionFacts} from './r2SelectionFacts';
import {R2_PUBLISHED_CONTENT} from './r2PublishedContent';
import {stableHash} from './hash';

export const AMO_ASSIST_TYPES:readonly R2HandType[]=['two-pair','three-kind','straight','flush','full-house','four-kind','straight-flush','five-kind','flush-house','flush-five'];
export const R2_ASSIST_VERSION='quality-r2-amo-assist-prototype-v1';
export const R2_ASSIST_CONTRACT=Object.freeze({qualifiedTypes:AMO_ASSIST_TYPES,pair:2,three:4,usesPerStage:1,ordinaryStartingLevels:true,phase:'after-joker',consumption:'not-main-not-held-not-discard',disabledAssist:'reject',B08:'reject',Q01:'reject'});
export const R2_ASSIST_HASH=stableHash({publishedV11:R2_PUBLISHED_CONTENT.v11.hash,amoAssist:R2_ASSIST_CONTRACT});
export interface R2AssistFacts extends R2SelectionFacts {
  assistIds:string[];assistKind:'pair'|'three-kind';assistMultiplier:2|4;
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
  return {...main,heldIds:main.heldIds.filter(id=>!ids.includes(id)),assistIds:cards.map(c=>c.id),assistKind:ids.length===2?'pair':'three-kind',assistMultiplier:ids.length===2?2:4,consumedIds};
}
