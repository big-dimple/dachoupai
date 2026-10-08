import {isR2LaohuanRefill} from './r2GroupUpgrade';
export interface PendingRefill {discardCommandId:string;candidateIds:string[];required:number;gap:number}
export function usesLaohuanRefill(s:{characterId?:unknown;contentVersion?:unknown;contentHash?:unknown}):boolean{return s.characterId==='laohuan'&&isR2LaohuanRefill(s);}
