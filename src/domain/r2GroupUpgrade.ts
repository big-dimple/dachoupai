import {R2_COMBO_GROWTH_HASH,isR2ComboGrowth} from './r2ComboGrowth';
import {R2_GROUP_UPGRADE_JOKERS} from '../content/r2GroupUpgradeJokers';
import {R2_GROUP_HAND_TYPES} from './r2GroupHands';
import {stableHash} from './hash';
export const R2_GROUP_UPGRADE_VERSION='quality-r2-group-upgrade-prototype-v1';
export const R2_GROUP_UPGRADE_CONTRACT=Object.freeze({inherits:R2_COMBO_GROWTH_HASH,allCharacters:true,groupTypes:R2_GROUP_HAND_TYPES,target:'largest-original-scoring-rank-group-first-main-position-before-disabled-filter',growth:'once-after-hand-next-hand-read-cross-stage-instance',reward:'successful-clear-once-common-principal',shop:'definition-rarity-paid-price-no-global-reweight'});
export const R2_GROUP_UPGRADE_HASH=stableHash({contract:R2_GROUP_UPGRADE_CONTRACT,jokers:R2_GROUP_UPGRADE_JOKERS});
export function isR2GroupUpgrade(identity:{contentVersion?:unknown;contentHash?:unknown}):boolean{return identity.contentVersion===R2_GROUP_UPGRADE_VERSION&&identity.contentHash===R2_GROUP_UPGRADE_HASH;}
/** Explicit shared capability, never an alias that changes the frozen e7d identity. */
export function hasR2ComboGrowthContract(identity:{contentVersion?:unknown;contentHash?:unknown}):boolean{return isR2GroupUpgrade(identity)||isR2ComboGrowth(identity);}
