import {AMO_ASSIST_TYPES} from './r2QualifiedHands';
import type {R2HandType} from './evaluateR2';
import {isR2AzaoCharge} from './r2GroupUpgrade';
export interface AzaoCharge {charge:0|1|2|3;previousQualifiedType:R2HandType|null}
export interface AzaoChargeIntent {before:AzaoCharge;release:boolean}
export interface AzaoChargeTrace extends AzaoChargeIntent {after:AzaoCharge;multiplier:'1.5'|'2.5'|'4'|null}
export const emptyAzaoCharge=():AzaoCharge=>({charge:0,previousQualifiedType:null});
export function usesAzaoCharge(s:{contentVersion?:unknown;contentHash?:unknown;characterId?:unknown}):boolean{return s.characterId==='azao'&&isR2AzaoCharge(s);}
export function validAzaoCharge(v:unknown):v is AzaoCharge {
 if(!v||typeof v!=='object'||Array.isArray(v))return false;const p=v as AzaoCharge;
 return Object.keys(p).length===2&&Object.hasOwn(p,'charge')&&Object.hasOwn(p,'previousQualifiedType')&&[0,1,2,3].includes(p.charge)&&(p.charge===0?p.previousQualifiedType===null:AMO_ASSIST_TYPES.includes(p.previousQualifiedType!));
}
export function azaoChargeStep(type:R2HandType,intent:AzaoChargeIntent,enabled:boolean):AzaoChargeTrace {
 if(!validAzaoCharge(intent.before)||typeof intent.release!=='boolean')throw Error('invalid-azao-charge');
 const qualified=AMO_ASSIST_TYPES.includes(type),before={...intent.before};
 if(intent.release&&(!enabled||!qualified||before.charge===0))throw Error('azao-release-unavailable');
 if(!enabled&&before.charge!==0)throw Error('invalid-disabled-azao-charge');
 const after=!enabled||intent.release||!qualified||before.previousQualifiedType===type?emptyAzaoCharge():{charge:Math.min(3,before.charge+1) as AzaoCharge['charge'],previousQualifiedType:type};
 return {before,release:intent.release,after,multiplier:intent.release?(['1.5','2.5','4'] as const)[before.charge-1]:null};
}
