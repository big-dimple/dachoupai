import {AMO_ASSIST_TYPES} from './r2QualifiedHands';
import {R2_ASSIST_JOKERS} from '../content/r2AssistJokers';
import {R2_PUBLISHED_CONTENT} from './r2PublishedContent';
import {stableHash} from './hash';

export const R2_ASSIST_VERSION='quality-r2-amo-assist-prototype-v1';
export const R2_ASSIST_CONTRACT=Object.freeze({qualifiedTypes:AMO_ASSIST_TYPES,pair:2,three:4,usesPerStage:1,ordinaryStartingLevels:true,phase:'after-joker',consumption:'not-main-not-held-not-discard',disabledAssist:'reject',B08:'reject',Q01:'reject'});
export const R2_ASSIST_HASH=stableHash({publishedV11:R2_PUBLISHED_CONTENT.v11.hash,amoAssist:R2_ASSIST_CONTRACT,jokers:R2_ASSIST_JOKERS});
