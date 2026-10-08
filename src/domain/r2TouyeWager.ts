import {isR2TouyeWager} from './r2GroupUpgrade';
import {TOUYE_TARGETS,touyeReachableTypes,touyeTargetReached,type TouyeTarget} from './r2TouyeTargets';
import {validateCardInstances,type R2HandType} from './evaluateR2';
import type {PlayingCard} from '../cards/types';
import {stableHash} from './hash';
export {TOUYE_TARGETS,TOUYE_ACCEPTED,touyeReachableTypes,touyeTargetReached,type TouyeTarget} from './r2TouyeTargets';
export interface TouyeBet {target:TouyeTarget;snapshotToken:string}
export interface TouyeCommit extends TouyeBet {stageIndex:number;duePlayIndex:number;discardCommandId:string;expectedSeq:number;handBefore:PlayingCard[];rules:{fourStraight:boolean;fourFlush:boolean};selectedIds:string[]}
export interface TouyeWager {commit:TouyeCommit|null;resolution:'unused'|'pending'|'played'|'abandoned'}
export interface TouyeWagerTrace {commit:TouyeCommit|null;outcome:'ordinary'|'won'|'lost'|'disabled';multiplier:'1.15'|'2'|'0.85'|null}
export const emptyTouyeWager=():TouyeWager=>({commit:null,resolution:'unused'});
export function usesTouyeWager(s:{characterId?:unknown;contentVersion?:unknown;contentHash?:unknown}):boolean{return s.characterId==='touye'&&isR2TouyeWager(s);}
export function touyeSnapshotToken(hand:readonly PlayingCard[],rules:TouyeCommit['rules'],stageIndex:number,duePlayIndex:number,expectedSeq:number):string{return stableHash({hand:[...hand].sort((a,b)=>a.id.localeCompare(b.id)),rules,stageIndex,duePlayIndex,expectedSeq});}
export function validTouyeCommit(c:TouyeCommit):boolean {
 try{validateCardInstances(c.handBefore);return TOUYE_TARGETS.includes(c.target)&&c.handBefore.length>0&&c.handBefore.length<=14&&Number.isSafeInteger(c.stageIndex)&&c.stageIndex>=0&&Number.isSafeInteger(c.duePlayIndex)&&c.duePlayIndex>=1&&Number.isSafeInteger(c.expectedSeq)&&c.expectedSeq>=1&&typeof c.discardCommandId==='string'&&!!c.discardCommandId&&typeof c.rules.fourStraight==='boolean'&&typeof c.rules.fourFlush==='boolean'&&c.selectedIds.length>0&&c.selectedIds.length<=5&&new Set(c.selectedIds).size===c.selectedIds.length&&c.selectedIds.every(id=>c.handBefore.some(card=>card.id===id))&&c.snapshotToken===touyeSnapshotToken(c.handBefore,c.rules,c.stageIndex,c.duePlayIndex,c.expectedSeq)&&!touyeReachableTypes(c.handBefore,c.rules).some(type=>touyeTargetReached(c.target,type));}catch{return false;}
}
export function touyeWagerStep(type:R2HandType,commit:TouyeCommit|null,enabled:boolean):TouyeWagerTrace {
 if(commit&&!validTouyeCommit(commit))throw Error('invalid-touye-commit');if(commit&&!enabled)throw Error('touye-disabled');
 if(!enabled)return{commit:null,outcome:'disabled',multiplier:null};if(!commit)return{commit:null,outcome:'ordinary',multiplier:'1.15'};
 const won=touyeTargetReached(commit.target,type);return{commit,outcome:won?'won':'lost',multiplier:won?'2':'0.85'};
}
