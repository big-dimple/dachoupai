import {isR2TouyeWager,isR2TouyeNewCore} from './r2GroupUpgrade';
import {TOUYE_TARGETS,touyeReachableTypes,touyeTargetReached,type TouyeTarget} from './r2TouyeTargets';
import {validateCardInstances,type R2HandType} from './evaluateR2';
import type {PlayingCard} from '../cards/types';
import {stableHash} from './hash';
import type {Command} from './run';
export {TOUYE_TARGETS,TOUYE_ACCEPTED,touyeReachableTypes,touyeTargetReached,type TouyeTarget} from './r2TouyeTargets';
export interface TouyeBet {target:TouyeTarget;snapshotToken:string}
export interface TouyeRefill {handLimit:number;handAfter:string[];refilledIds:string[]}
export interface TouyeRefillProof {drawBefore:string[];drawAfter:string[];discardBefore:string[];playedBefore:string[]}
export interface TouyeCorePlay {command:Command;hand:PlayingCard[];disabledIds:string[]}
export interface TouyeCommit extends TouyeBet {stageIndex:number;duePlayIndex:number;discardCommandId:string;expectedSeq:number;handBefore:PlayingCard[];rules:{fourStraight:boolean;fourFlush:boolean};selectedIds:string[];refill?:TouyeRefill}
export interface TouyeWager {commit:TouyeCommit|null;resolution:'unused'|'pending'|'played'|'abandoned';corePlay?:TouyeCorePlay|null;refillProof?:TouyeRefillProof|null}
export interface TouyeWagerTrace {commit:TouyeCommit|null;outcome:'ordinary'|'won'|'lost'|'disabled';multiplier:'1.15'|'2'|'0.85'|null;core?:{contract:'new-core-v1';activeNewIds:string[];lossReason:'target'|'new-core'|null}}
export const emptyTouyeWager=(newCore=false):TouyeWager=>({commit:null,resolution:'unused',...(newCore?{corePlay:null,refillProof:null}:{})});
export function usesTouyeWager(s:{characterId?:unknown;contentVersion?:unknown;contentHash?:unknown}):boolean{return s.characterId==='touye'&&isR2TouyeWager(s);}
export function usesTouyeNewCore(s:{characterId?:unknown;contentVersion?:unknown;contentHash?:unknown}):boolean{return s.characterId==='touye'&&isR2TouyeNewCore(s);}
export function touyeSnapshotToken(hand:readonly PlayingCard[],rules:TouyeCommit['rules'],stageIndex:number,duePlayIndex:number,expectedSeq:number):string{return stableHash({hand:[...hand].sort((a,b)=>a.id.localeCompare(b.id)),rules,stageIndex,duePlayIndex,expectedSeq});}
export function validTouyeCommit(c:TouyeCommit,newCore=false):boolean {
 try{validateCardInstances(c.handBefore);return TOUYE_TARGETS.includes(c.target)&&c.handBefore.length>0&&c.handBefore.length<=14&&Number.isSafeInteger(c.stageIndex)&&c.stageIndex>=0&&Number.isSafeInteger(c.duePlayIndex)&&c.duePlayIndex>=1&&Number.isSafeInteger(c.expectedSeq)&&c.expectedSeq>=1&&typeof c.discardCommandId==='string'&&!!c.discardCommandId&&typeof c.rules.fourStraight==='boolean'&&typeof c.rules.fourFlush==='boolean'&&c.selectedIds.length>0&&c.selectedIds.length<=5&&new Set(c.selectedIds).size===c.selectedIds.length&&c.selectedIds.every(id=>c.handBefore.some(card=>card.id===id))&&c.snapshotToken===touyeSnapshotToken(c.handBefore,c.rules,c.stageIndex,c.duePlayIndex,c.expectedSeq)&&(newCore?validTouyePublicRefill(c):!Object.hasOwn(c,'refill')&&!touyeReachableTypes(c.handBefore,c.rules).some(type=>touyeTargetReached(c.target,type)));}catch{return false;}
}
const ids=(a:unknown):a is string[]=>Array.isArray(a)&&a.every(id=>typeof id==='string'&&id.length>0)&&new Set(a).size===a.length;
export function validTouyePublicRefill(c:TouyeCommit):boolean {
 const p=c.refill;if(!p||Object.keys(p).sort().join(',')!=='handAfter,handLimit,refilledIds'||!Number.isSafeInteger(p.handLimit)||p.handLimit<1||p.handLimit>14||!ids(p.handAfter)||!ids(p.refilledIds))return false;
 const retained=c.handBefore.filter(card=>!c.selectedIds.includes(card.id)).map(card=>card.id);
 return p.refilledIds.length>0&&p.refilledIds.length<=p.handLimit-retained.length&&p.refilledIds.every(id=>!c.handBefore.some(card=>card.id===id))&&stableHash(p.handAfter)===stableHash([...retained,...p.refilledIds]);
}
export function validTouyeRefill(c:TouyeCommit,proof:TouyeRefillProof|null|undefined):boolean {
 if(!validTouyePublicRefill(c)||!proof||Object.keys(proof).sort().join(',')!=='discardBefore,drawAfter,drawBefore,playedBefore'||![proof.drawBefore,proof.drawAfter,proof.discardBefore,proof.playedBefore].every(ids))return false;
 const p=c.refill!,retained=c.handBefore.filter(card=>!c.selectedIds.includes(card.id)),count=Math.min(p.handLimit-retained.length,proof.drawBefore.length);
 const before=[...c.handBefore.map(card=>card.id),...proof.drawBefore,...proof.discardBefore,...proof.playedBefore];
 return count>0&&new Set(before).size===before.length&&stableHash(p.refilledIds)===stableHash(proof.drawBefore.slice(-count).reverse())&&stableHash(proof.drawAfter)===stableHash(proof.drawBefore.slice(0,proof.drawBefore.length-count));
}
export function touyeWagerStep(type:R2HandType,commit:TouyeCommit|null,enabled:boolean,activeScoringIds:readonly string[]=[],newCore=false):TouyeWagerTrace {
 if(commit&&!validTouyeCommit(commit,newCore))throw Error('invalid-touye-commit');if(commit&&!enabled)throw Error('touye-disabled');
 const activeNewIds=commit&&newCore?commit.refill!.refilledIds.filter(id=>activeScoringIds.includes(id)):[],target=!!commit&&touyeTargetReached(commit.target,type);
 const core=newCore?{core:{contract:'new-core-v1' as const,activeNewIds,lossReason:commit?(!target?'target' as const:!activeNewIds.length?'new-core' as const:null):null}}:{};
 if(!enabled)return{commit:null,outcome:'disabled',multiplier:null,...core};if(!commit)return{commit:null,outcome:'ordinary',multiplier:'1.15',...core};
 const won=target&&(!newCore||activeNewIds.length>0);return{commit,outcome:won?'won':'lost',multiplier:won?'2':'0.85',...core};
}
