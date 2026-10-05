import {R2_ASSIST_HASH} from './r2AssistIdentity';
import {R2_COMBO_GROWTH_JOKERS} from '../content/r2ComboGrowthJokers';
import type {PlayingCard} from '../cards/types';
import type {R2JokerInstance} from '../content/r2Schema';
import {r2HasQualifiedHand} from './r2SelectionFacts';
import {stableHash} from './hash';
export const R2_COMBO_GROWTH_VERSION='quality-r2-combo-growth-prototype-v1';
export const R2_COMBO_GROWTH_CONTRACT=Object.freeze({allCharacters:true,amo:R2_ASSIST_HASH,otherRoles:'published-v11',a06Reset:'entry-only',f10Arming:'first-discard-before-first-play-public-no-qualified-selection',f10Consumption:'next-play-even-disabled',clearCapital:'gold-before-all-clear-rewards',counters:'required-per-definition-v1',trace:'required-combo-clear-capital-v1',openingDiscard:'saved-public-hand-and-inventory-v1'});
export const R2_COMBO_GROWTH_HASH=stableHash({contract:R2_COMBO_GROWTH_CONTRACT,jokers:R2_COMBO_GROWTH_JOKERS});
export function isR2ComboGrowth(identity:{contentVersion?:unknown;contentHash?:unknown}):boolean {
 return identity.contentVersion===R2_COMBO_GROWTH_VERSION&&identity.contentHash===R2_COMBO_GROWTH_HASH;
}

export interface R2OpeningDiscard {hand:PlayingCard[];discardedIds:string[];jokers:R2JokerInstance[]}
export function r2ColdOpening(snapshot:R2OpeningDiscard|null|undefined):boolean {
 return !!snapshot&&snapshot.jokers.some(j=>j.definitionId==='f10')&&!r2HasQualifiedHand({hand:snapshot.hand,jokers:snapshot.jokers,definitions:R2_COMBO_GROWTH_JOKERS});
}
