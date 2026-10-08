import {R2_COMBO_GROWTH_HASH,isR2ComboGrowth} from './r2ComboGrowth';
import {R2_GROUP_UPGRADE_JOKERS} from '../content/r2GroupUpgradeJokers';
import {R2_GROUP_HAND_TYPES} from './r2GroupHands';
import {stableHash} from './hash';
export const R2_GROUP_UPGRADE_VERSION='quality-r2-group-upgrade-prototype-v1';
export const R2_GROUP_UPGRADE_CONTRACT=Object.freeze({inherits:R2_COMBO_GROWTH_HASH,allCharacters:true,groupTypes:R2_GROUP_HAND_TYPES,target:'largest-original-scoring-rank-group-first-main-position-before-disabled-filter',growth:'once-after-hand-next-hand-read-cross-stage-instance',reward:'successful-clear-once-common-principal',shop:'definition-rarity-paid-price-no-global-reweight'});
export const R2_GROUP_UPGRADE_HASH=stableHash({contract:R2_GROUP_UPGRADE_CONTRACT,jokers:R2_GROUP_UPGRADE_JOKERS});
export function isR2GroupUpgrade(identity:{contentVersion?:unknown;contentHash?:unknown}):boolean{return identity.contentVersion===R2_GROUP_UPGRADE_VERSION&&identity.contentHash===R2_GROUP_UPGRADE_HASH;}
export const R2_ROUTE_STARTERS=Object.freeze({group:'mantangcai',straight:'c04',flush:'c06'});
export type R2OpeningRoute=keyof typeof R2_ROUTE_STARTERS;
export const R2_ROUTE_STARTER_VERSION='quality-r2-route-starter-v1';
export const R2_ROUTE_STARTER_CONTRACT=Object.freeze({inherits:R2_GROUP_UPGRADE_HASH,starters:R2_ROUTE_STARTERS,scope:'initial-first-chapter-affordable-only',shelf:'replace-last-missing-preserve-rng-three-ordinary-original-price',reroll:'original-random',openingRoute:'immutable-saved-in-canonical-start-receipt',firstTrigger:'first-shelf-purchased-instance-positive-saved-event-once'});
export const R2_ROUTE_STARTER_HASH=stableHash(R2_ROUTE_STARTER_CONTRACT);
export const R2_ERXIANG_CORE_VERSION='quality-r2-erxiang-core-group-v1';
export const R2_ERXIANG_CORE_CONTRACT=Object.freeze({inherits:R2_ROUTE_STARTER_HASH,allCharacters:true,scope:'erxiang-only-other-five-unchanged',target:'all-active-scoring-core-cards-with-anchor-original-rank-two-pair-or-higher',extra:{first:1,sameRank:2},chain:'committed-untargeted-or-unqualified-clears-discard-preserves-stage-entry-resets',disabled:'B08-and-Q01-no-target-no-record',priority:'intrinsic-then-existing-on-card-jokers-then-role-remaining-budget',limits:{extraPerCard:4,depth:1,events:512},wholeJokerReplay:false});
export const R2_ERXIANG_CORE_HASH=stableHash(R2_ERXIANG_CORE_CONTRACT);
export function isR2ErxiangCore(identity:{contentVersion?:unknown;contentHash?:unknown}):boolean{return identity.contentVersion===R2_ERXIANG_CORE_VERSION&&identity.contentHash===R2_ERXIANG_CORE_HASH;}
export function usesR2ErxiangCore(identity:{contentVersion?:unknown;contentHash?:unknown;characterId?:unknown}):boolean{return identity.characterId==='erxiang'&&isR2ErxiangCore(identity);}
export function isR2RouteStarter(identity:{contentVersion?:unknown;contentHash?:unknown}):boolean{return isR2ErxiangCore(identity)||identity.contentVersion===R2_ROUTE_STARTER_VERSION&&identity.contentHash===R2_ROUTE_STARTER_HASH;}
export function hasR2GroupUpgradeContract(identity:{contentVersion?:unknown;contentHash?:unknown}):boolean{return isR2GroupUpgrade(identity)||isR2RouteStarter(identity);}
/** Explicit shared capability, never an alias that changes the frozen e7d identity. */
export function hasR2ComboGrowthContract(identity:{contentVersion?:unknown;contentHash?:unknown}):boolean{return hasR2GroupUpgradeContract(identity)||isR2ComboGrowth(identity);}
