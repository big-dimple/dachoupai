import {isR2XiemuBurn} from './r2GroupUpgrade';
import {AMO_ASSIST_TYPES} from './r2QualifiedHands';
import type {R2HandType} from './evaluateR2';
export type XiemuBurnCost=0|10|20|30;
export interface XiemuBurnIntent {cost:XiemuBurnCost;goldBefore:number;beforeUsed:boolean}
export interface XiemuBurnTrace extends XiemuBurnIntent {goldAfter:number;afterUsed:boolean;multiplier:2|3|4|null}
export function usesXiemuBurn(s:{characterId?:unknown;contentVersion?:unknown;contentHash?:unknown}):boolean{return s.characterId==='xiemu'&&isR2XiemuBurn(s);}
export const xiemuInterest=(gold:number)=>Math.min(2,Math.floor(gold/5));
export function xiemuBurnStep(type:R2HandType,intent:XiemuBurnIntent,enabled:boolean):XiemuBurnTrace {
 if(![0,10,20,30].includes(intent.cost)||!Number.isSafeInteger(intent.goldBefore)||intent.goldBefore<0||typeof intent.beforeUsed!=='boolean')throw Error('invalid-xiemu-burn');
 if(intent.cost){if(!enabled)throw Error('xiemu-disabled');if(intent.beforeUsed)throw Error('xiemu-already-used');if(!AMO_ASSIST_TYPES.includes(type))throw Error('xiemu-unqualified');if(intent.goldBefore<intent.cost)throw Error('insufficient-gold');}
 return {...intent,goldAfter:intent.goldBefore-intent.cost,afterUsed:intent.beforeUsed||intent.cost>0,multiplier:intent.cost?(intent.cost/10+1) as 2|3|4:null};
}
