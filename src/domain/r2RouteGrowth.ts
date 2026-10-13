import {R2_GROUP_HAND_TYPES} from './r2GroupHands';
import {evaluateR2Hand,type R2HandType} from './evaluateR2';
import {Rational,type Fraction} from './rational';
import {stableHash} from './hash';
import type {PlayingCard} from '../cards/types';
import type {Command} from './run';

export const R2_ROUTE_FAMILIES=Object.freeze(['G','S','F'] as const);
export type R2RouteFamily=typeof R2_ROUTE_FAMILIES[number];
export const R2_STRAIGHT_HAND_TYPES=Object.freeze(['straight','straight-flush'] as const);
export const R2_FLUSH_HAND_TYPES=Object.freeze(['flush','straight-flush','flush-house','flush-five'] as const);
export const R2_ROUTE_HAND_TYPES=Object.freeze({G:R2_GROUP_HAND_TYPES,S:R2_STRAIGHT_HAND_TYPES,F:R2_FLUSH_HAND_TYPES});
export const R2_ROUTE_GROWTH_RULE=Object.freeze({
  rates:{G:{n:'27',d:'20'},S:{n:'7',d:'5'},F:{n:'13',d:'10'}},
  graceClears:3,cap:{n:'1000000000000',d:'1'},
  ownership:'run-not-joker-or-opening-route',qualification:'actual-main-hand-before-disabled-filter-no-assist',
  settlement:'all-played-families-on-real-clear-once-no-skip',snapshot:'before-hand-no-clear-backfeed',
  clock:'after-all-whole-joker-hooks-and-editions-before-amo-post',
  capScope:'each-family-before-product-no-product-cap',
  stageProof:'bounded-main-card-and-rule-snapshots-bound-to-receipts-after-latest-stage-entry',
});
export const R2_BOUNDED_ROUTE_RULE=Object.freeze({...R2_ROUTE_GROWTH_RULE,cap:{n:'4',d:'1'},capScope:'max-once-among-actual-hand-families-tie-G-S-F'});
export interface R2RouteProgress {clears:number;G:number;S:number;F:number}
export interface R2RouteSettlement {stageIndex:number;families:R2RouteFamily[]}
export interface R2RouteHistory extends R2RouteProgress {settlements:R2RouteSettlement[]}
export interface R2RouteHandSource {command:Command;cards:PlayingCard[];rules:{fourStraight:boolean;fourFlush:boolean}}
export interface R2RouteStageEntry {commandId:string;seq:number;type:'EnterStage'|'SkipStage'}
export interface R2RouteStage {entry:R2RouteStageEntry;handTypes:R2HandType[];eligible:R2RouteFamily[];sources:R2RouteHandSource[]}
export interface R2RouteGrowthTrace {before:R2RouteProgress;factors:Partial<Record<R2RouteFamily,Fraction>>}
const exact=(value:unknown,keys:readonly string[]):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
const natural=(value:unknown):value is number=>Number.isSafeInteger(value)&&(value as number)>=0;
export function validR2RouteProgress(value:unknown):value is R2RouteProgress {
  return exact(value,['clears',...R2_ROUTE_FAMILIES])&&natural(value.clears)&&R2_ROUTE_FAMILIES.every(f=>natural(value[f])&&value[f]<=(value.clears as number));
}
export function r2RouteFamilies(type:R2HandType):R2RouteFamily[] {
  return R2_ROUTE_FAMILIES.filter(f=>(R2_ROUTE_HAND_TYPES[f] as readonly string[]).includes(type));
}
export function r2RouteSnapshot(history:R2RouteProgress|undefined):R2RouteProgress {
  if(!history)throw Error('missing-route-growth-history');
  const before={clears:history.clears,G:history.G,S:history.S,F:history.F};
  if(!validR2RouteProgress(before))throw Error('invalid-route-growth-history');
  return before;
}
export const freshR2RouteHistory=():R2RouteHistory=>({clears:0,G:0,S:0,F:0,settlements:[]});
export function freshR2RouteStage(command:Command):R2RouteStage {
  if(command.action.type!=='EnterStage'&&command.action.type!=='SkipStage')throw Error('invalid-route-stage-entry');
  return {entry:{commandId:command.commandId,seq:command.expectedSeq+1,type:command.action.type},handTypes:[],eligible:[],sources:[]};
}

// At most 106 exact multiplications reach a cap. A huge valid N never creates
// an enormous intermediate power or converts the rational to floating point.
const cap=Rational.fromJSON(R2_ROUTE_GROWTH_RULE.cap);
const factors=Object.fromEntries(R2_ROUTE_FAMILIES.map(f=>{
  const rate=Rational.fromJSON(R2_ROUTE_GROWTH_RULE.rates[f]),values=[new Rational(1n)];
  while(values.at(-1)!.compare(cap)<0){const next=values.at(-1)!.multiply(rate);values.push(next.compare(cap)>=0?cap:next);}
  return [f,Object.freeze(values)];
})) as Record<R2RouteFamily,readonly Rational[]>;
export function r2RouteFactor(family:R2RouteFamily,clears:number,boundedClear=false):Rational {
  if(!R2_ROUTE_FAMILIES.includes(family)||!natural(clears))throw Error('invalid-route-growth-count');
  const values=factors[family],exponent=Math.max(clears-R2_ROUTE_GROWTH_RULE.graceClears,0);
  const value=values[Math.min(exponent,values.length-1)];
  return boundedClear&&value.compare(new Rational(4n))>0?new Rational(4n):value;
}
export function r2RouteGrowthTrace(before:R2RouteProgress,type:R2HandType,boundedClear=false):R2RouteGrowthTrace {
  if(!validR2RouteProgress(before))throw Error('invalid-route-growth-snapshot');
  let families=r2RouteFamilies(type);
  if(boundedClear&&families.length)families=[families.reduce((best,f)=>r2RouteFactor(f,before[f],true).compare(r2RouteFactor(best,before[best],true))>0?f:best)];
  return {before:structuredClone(before),factors:Object.fromEntries(families.map(f=>[f,r2RouteFactor(f,before[f],boundedClear).toJSON()]))};
}
export function recordR2RouteHand(stage:R2RouteStage,type:R2HandType,source:R2RouteHandSource):void {
  if(evaluateR2Hand(source.cards,source.rules).type!==type)throw Error('invalid-route-main-source');
  stage.sources.push(structuredClone(source));
  stage.handTypes.push(type);
  stage.eligible=R2_ROUTE_FAMILIES.filter(f=>stage.handTypes.some(t=>r2RouteFamilies(t).includes(f)));
}
/** Reclassify every actual main selection; a self-consistent type/eligible edit is insufficient. */
export function validR2RouteStage(value:unknown,playIndex:number,runId:string,commandSeq:number,receipts:readonly {commandId:string;seq:number;fingerprint:string}[]):value is R2RouteStage {
  try {
    if(!exact(value,['entry','handTypes','eligible','sources'])||!exact(value.entry,['commandId','seq','type'])||!natural(value.entry.seq)||value.entry.seq<1||!Array.isArray(value.handTypes)||!Array.isArray(value.eligible)||!Array.isArray(value.sources)||value.sources.length!==playIndex||playIndex>7||value.handTypes.length!==playIndex)return false;
    // EnterStage/SkipStage have exact, parameter-free actions. Reuse their
    // existing receipt fingerprints to find the latest boundary even when
    // the bounded journal no longer includes it; no second hash scheme.
    let boundary=false;
    for(let i=receipts.length-1;i>=0;i--){
      const receipt=receipts[i];if(receipt.seq<value.entry.seq)return false;
      const type=(['EnterStage','SkipStage'] as const).find(type=>receipt.fingerprint===stableHash({runId,commandId:receipt.commandId,expectedSeq:receipt.seq-1,action:{type}}));
      if(type){boundary=receipt.seq===value.entry.seq&&receipt.commandId===value.entry.commandId&&type===value.entry.type;break;}
    }
    if(!boundary||value.entry.type==='SkipStage'&&playIndex!==0)return false;
    const types:R2HandType[]=[];let previous=(value.entry.seq as number)-1;
    for(const source of value.sources){
      if(!exact(source,['command','cards','rules'])||!exact(source.command,['runId','commandId','expectedSeq','action'])||!exact(source.rules,['fourStraight','fourFlush'])||typeof source.rules.fourStraight!=='boolean'||typeof source.rules.fourFlush!=='boolean'||!Array.isArray(source.cards))return false;
      const command=source.command as unknown as Command;
      if(command.runId!==runId||!natural(command.expectedSeq)||command.expectedSeq<=previous||command.expectedSeq>=commandSeq||!command.action||!['PlayHand','PlayAssistedHand'].includes(command.action.type))return false;
      const selected=(command.action as Extract<Command['action'],{type:'PlayHand'|'PlayAssistedHand'}>).selectedIds;
      if(!Array.isArray(selected)||new Set(selected).size!==selected.length||selected.length!==source.cards.length||source.cards.some(c=>!selected.includes(c.id)))return false;
      const receipt=receipts.find(r=>r.commandId===command.commandId);
      if(!receipt||receipt.seq!==command.expectedSeq+1||receipt.fingerprint!==stableHash(command))return false;
      types.push(evaluateR2Hand(source.cards,source.rules as R2RouteHandSource['rules']).type);previous=command.expectedSeq;
    }
    return stableHash(value.handTypes)===stableHash(types)&&stableHash(value.eligible)===stableHash(R2_ROUTE_FAMILIES.filter(f=>types.some(t=>r2RouteFamilies(t).includes(f))));
  } catch {return false;}
}
export function settleR2RouteGrowth(history:R2RouteHistory,stageIndex:number,stage:R2RouteStage):void {
  if(!natural(stageIndex)||history.settlements.some(s=>s.stageIndex>=stageIndex))throw Error('duplicate-route-clear');
  history.clears++;
  for(const f of stage.eligible)history[f]++;
  history.settlements.push({stageIndex,families:[...stage.eligible]});
}
/** The compact clear ledger excludes skipped stages and closes duplicated awards. */
export function validR2RouteHistory(value:unknown,startingStage:number,stageIndex:number):value is R2RouteHistory {
  if(!exact(value,['clears',...R2_ROUTE_FAMILIES,'settlements'])||!Array.isArray(value.settlements)||value.settlements.length>stageIndex-startingStage)return false;
  const progress={clears:value.clears,G:value.G,S:value.S,F:value.F};
  if(!validR2RouteProgress(progress)||value.clears!==value.settlements.length)return false;
  const counts={G:0,S:0,F:0},settled=new Set<number>();let previous=startingStage-1;
  for(const s of value.settlements){
    if(!exact(s,['stageIndex','families'])||!natural(s.stageIndex)||s.stageIndex<=previous||s.stageIndex>=stageIndex||!Array.isArray(s.families))return false;
    const canonical=R2_ROUTE_FAMILIES.filter(f=>(s.families as unknown[]).includes(f));
    if(JSON.stringify(s.families)!==JSON.stringify(canonical))return false;
    previous=s.stageIndex;settled.add(s.stageIndex);for(const f of canonical)counts[f]++;
  }
  for(let index=startingStage;index<stageIndex;index++)if(index%3===2&&!settled.has(index))return false;
  return R2_ROUTE_FAMILIES.every(f=>counts[f]===value[f]);
}
