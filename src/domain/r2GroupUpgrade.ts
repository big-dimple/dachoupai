import {TOUYE_ACCEPTED} from './r2TouyeTargets';
import {R2_COMBO_GROWTH_HASH,isR2ComboGrowth} from './r2ComboGrowth';
import {R2_GROUP_UPGRADE_JOKERS} from '../content/r2GroupUpgradeJokers';
import {R2_GROUP_HAND_TYPES} from './r2GroupHands';
import {AMO_ASSIST_TYPES} from './r2QualifiedHands';
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
export const R2_AZAO_CHARGE_VERSION='quality-r2-azao-charge-v1';
export const R2_AZAO_CHARGE_CONTRACT=Object.freeze({inherits:R2_ROUTE_STARTER_HASH,allCharacters:true,qualified:AMO_ASSIST_TYPES,tiers:['1.5','2.5','4'],first:1,cap:3,hold:'different-increments-repeat-or-unqualified-clears-both',discard:'preserve',release:'any-qualified-pre-play-charge-consumed-once-no-gain',clock:'characterScore-before-jokerScore-replaces-old-add1',reset:'entry-end-abandon',disabled:'B08-Q01-no-gain-no-release'});
export const R2_AZAO_CHARGE_HASH=stableHash(R2_AZAO_CHARGE_CONTRACT);
export const R2_XIEMU_BURN_VERSION='quality-r2-xiemu-burn-v1';
export const R2_XIEMU_BURN_CONTRACT=Object.freeze({inherits:R2_AZAO_CHARGE_HASH,allCharacters:true,costs:[10,20,30],multipliers:[2,3,4],qualified:AMO_ASSIST_TYPES,uses:1,clock:'pay-before-score-characterScore-before-jokerScore-replace-old-last-hand-and-clear-gold',interest:'min2-floor-common-reward-before-capital-div5-once-clearId',reset:'entry-only-no-refund-on-end-abandon',disabled:'B08-no-burn-keep-interest-Q01-disable-all'});
export const R2_XIEMU_BURN_HASH=stableHash(R2_XIEMU_BURN_CONTRACT);
export const R2_LAOHUAN_REFILL_VERSION='quality-r2-laohuan-refill-v1';
export const R2_LAOHUAN_REFILL_CONTRACT=Object.freeze({inherits:R2_XIEMU_BURN_HASH,allCharacters:true,uses:1,extra:2,replace:'old-straight-flush-add120',consume:'saved-real-discard-before-reveal',pending:'fixed-ids-choose-gap-close-preserves',unselected:'played-no-discard-hooks',short:'all-if-candidates-not-above-gap',disabled:'Q01-only-B08-allowed',reset:'entry-no-refund'});
export const R2_LAOHUAN_REFILL_HASH=stableHash(R2_LAOHUAN_REFILL_CONTRACT);
export const R2_TOUYE_WAGER_VERSION='quality-r2-touye-wager-v1';
export const R2_TOUYE_WAGER_CONTRACT=Object.freeze({inherits:R2_LAOHUAN_REFILL_HASH,allCharacters:true,uses:1,accepted:TOUYE_ACCEPTED,ordinary:'1.15',success:'2',failure:'0.85',clock:'replace-characterScore-before-jokerScore-no-role-rng',commit:'same-real-discard-public-whole-hand-unreachable-snapshot',due:'next-real-play',locked:'no-discard-tools-joker-changes',disabled:'B08-Q01',reset:'entry-no-refund'});
export const R2_TOUYE_WAGER_HASH=stableHash(R2_TOUYE_WAGER_CONTRACT);
export function isR2TouyeWager(identity:{contentVersion?:unknown;contentHash?:unknown}):boolean{return identity.contentVersion===R2_TOUYE_WAGER_VERSION&&identity.contentHash===R2_TOUYE_WAGER_HASH;}
export function isR2LaohuanRefill(identity:{contentVersion?:unknown;contentHash?:unknown}):boolean{return identity.contentVersion===R2_LAOHUAN_REFILL_VERSION&&identity.contentHash===R2_LAOHUAN_REFILL_HASH||isR2TouyeWager(identity);}
export function isR2XiemuBurn(identity:{contentVersion?:unknown;contentHash?:unknown}):boolean{return identity.contentVersion===R2_XIEMU_BURN_VERSION&&identity.contentHash===R2_XIEMU_BURN_HASH||isR2LaohuanRefill(identity);}
export function isR2AzaoCharge(identity:{contentVersion?:unknown;contentHash?:unknown}):boolean{return identity.contentVersion===R2_AZAO_CHARGE_VERSION&&identity.contentHash===R2_AZAO_CHARGE_HASH||isR2XiemuBurn(identity);}
export function isR2RouteStarter(identity:{contentVersion?:unknown;contentHash?:unknown}):boolean{return identity.contentVersion===R2_ROUTE_STARTER_VERSION&&identity.contentHash===R2_ROUTE_STARTER_HASH||isR2AzaoCharge(identity);}
export function hasR2GroupUpgradeContract(identity:{contentVersion?:unknown;contentHash?:unknown}):boolean{return isR2GroupUpgrade(identity)||isR2RouteStarter(identity);}
/** Explicit shared capability, never an alias that changes the frozen e7d identity. */
export function hasR2ComboGrowthContract(identity:{contentVersion?:unknown;contentHash?:unknown}):boolean{return hasR2GroupUpgradeContract(identity)||isR2ComboGrowth(identity);}
