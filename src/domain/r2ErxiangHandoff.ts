import {isR2ErxiangHandoff} from './r2GroupUpgrade';
import type {PlayingCard} from '../cards/types';
import type {R2HandType} from './evaluateR2';
export interface ErxiangHandoffIntent {targetId:string|null;beforeUsed:boolean}
export interface ErxiangHandoffTrace extends ErxiangHandoffIntent {points:number;afterUsed:boolean}
export function usesErxiangHandoff(s:{characterId?:unknown;contentVersion?:unknown;contentHash?:unknown}):boolean{return s.characterId==='erxiang'&&isR2ErxiangHandoff(s);}
export function ordinaryCardPoints(card:PlayingCard):number{return card.rank===14?11:Math.min(card.rank,10);}
export function erxiangHandoffStep(type:R2HandType,cards:readonly PlayingCard[],activeIds:readonly string[],suppressedIds:readonly string[],intent:ErxiangHandoffIntent,enabled:boolean):ErxiangHandoffTrace {
 if(!intent||Object.keys(intent).sort().join(',')!=='beforeUsed,targetId'||typeof intent.beforeUsed!=='boolean'||intent.targetId!==null&&(typeof intent.targetId!=='string'||!intent.targetId))throw Error('invalid-erxiang-handoff');
 let points=0;
 if(intent.targetId!==null){
  if(!enabled)throw Error('erxiang-disabled');
  if(intent.beforeUsed)throw Error('erxiang-already-used');
  const card=cards.find(c=>c.id===intent.targetId);
  if(type==='high-card'||!card||!activeIds.includes(intent.targetId))throw Error('erxiang-invalid-core');
  points=suppressedIds.includes(intent.targetId)?0:ordinaryCardPoints(card);
  if(points===0)throw Error('erxiang-zero-points');
 }
 return {...intent,points,afterUsed:intent.beforeUsed||intent.targetId!==null};
}
