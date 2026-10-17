import {isR2AmoExile} from './r2GroupUpgrade';
import {r2RunModeConfig} from '../content/r2Modes';
import type {R2RunState} from './r2Run';
import {r2SelectionFacts,type R2SelectionInput} from './r2SelectionFacts';

export const usesAmoExile=(s:{characterId?:unknown;contentVersion?:unknown;contentHash?:unknown})=>s.characterId==='amo'&&isR2AmoExile(s);
export interface AmoExileIntent {use:boolean;beforeUsed:boolean}
export interface AmoExileTrace extends AmoExileIntent {afterUsed:boolean;discardedIds:string[];beforeScore:string|null;afterScore:string|null}
/** Actual visible remainder; this is sacrifice, not an ordinary discard command or an assist group. */
export function amoExileFacts(input:R2SelectionInput){
 const main=r2SelectionFacts(input),discardedIds=[...main.heldIds];
 if(!discardedIds.length)throw Error('amo-exile-empty-cost');
 return {...main,heldIds:[] as string[],discardedIds};
}
export function amoExileChoice(state:Pick<R2RunState,'characterId'|'contentVersion'|'contentHash'|'mode'|'difficulty'|'challengeId'|'programsEnabled'|'phase'|'stage'|'handOrder'>,ids:readonly string[]=[]){
 const enabled=usesAmoExile(state)&&r2RunModeConfig(state).characterAbilityEnabled&&state.stage?.boss?.definitionId!=='B08',used=state.stage?.amoExileUsed===true;
 const discardedIds=state.handOrder.filter(id=>!ids.includes(id)),legal=ids.length>0&&ids.length<=5&&new Set(ids).size===ids.length&&ids.every(id=>state.handOrder.includes(id))&&discardedIds.length>0;
 return {enabled,used,discardedIds,available:enabled&&!used&&state.phase==='await-input'&&!!state.stage?.handsLeft&&legal};
}
