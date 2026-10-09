import type {R2RunState} from '../domain/r2Run';
import type {ScoreTrace,ScoreEvent} from '../domain/scoreR2';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {Rational} from '../domain/rational';
import {buildGrowthProgress} from './BuildGrowthProgress';
import {fractionText} from './scoreText';
export interface GrowthPayoff {instanceId:string;definitionId:string;name:string;unit:string;key:string;rootId:string;readLabel:string;readValue:string;readCount:number;before:string;after:string;caption:string;change:'gain'|'loss'|'same';delta:string}
/** Last committed hand only. An absent read is not zero, and a replacement/current later balance cannot borrow this receipt. */
export function growthPayoffs(state:R2RunState,trace:ScoreTrace|undefined=state.lastTrace??undefined):GrowthPayoff[]{
 if(!trace)return [];
 return buildGrowthProgress(state).flatMap(row=>{
  const held=state.jokers.find(j=>j.instanceId===row.instanceId&&j.definitionId===row.definitionId),source=trace.sourceJokers.find(j=>j.instanceId===row.instanceId&&j.definitionId===row.definitionId),saved=trace.jokers.find(j=>j.instanceId===row.instanceId&&j.definitionId===row.definitionId);if(!held||!source||!saved)return [];
  const ops=r2JokerDefinitionFor(state,row.definitionId).hooks.flatMap(h=>h.operations).filter(o=>o.kind==='read-growth'||o.kind==='read-coefficient'||o.kind==='consume-growth');
  if(new Set(ops.map(o=>'key' in o?o.key:'')).size!==1||new Set(ops.map(o=>o.kind+('target' in o?o.target:''))).size!==1)return [];
  const op=ops.find(o=>'key' in o&&o.key===row.key);if(!op||!('key' in op))return [];
  const zero={n:'0',d:'1'},a=saved.growth[row.key]??zero,b=source.growth[row.key]??zero,current=held.growth[row.key]??zero;
  if(Rational.fromJSON(a).compare(Rational.fromJSON(current))!==0)return [];
  const own=trace.events.filter(e=>e.sourceType==='joker'&&e.sourceInstanceId===row.instanceId&&e.sourceDefinitionId===row.definitionId),reads=own.filter(e=>e.operation===op.kind),values=[...new Set(reads.map(e=>fractionText(e.value)))];if(values.length>1)return [];
  const delta=Rational.fromJSON(a).add(Rational.fromJSON(b).multiply(new Rational(-1n))),change=delta.n>0n?'gain':delta.n<0n?'loss':'same',consumed=own.some(e=>e.operation==='consume-growth'),prefix=op.kind==='read-coefficient'?'×':'+';
  const before=fractionText(b),after=fractionText(a),caption=change==='gain'?`新增+${fractionText(delta.toJSON())} · 下手生效`:change==='loss'?consumed?'本手已消耗 · 下手重新蓄':'已归零 · 下手重新养':reads.length?`未新增 · 已存${after}`:'未读取 · 未新增';
  return [{instanceId:row.instanceId,definitionId:row.definitionId,name:row.name,unit:op.kind==='read-coefficient'?'系数':'target' in op&&op.target==='heat'?'热度':'倍率',key:row.key,rootId:trace.rootId,readLabel:reads.length>1?`每次 · ${reads.length}次`:reads.length?'上手读取':'未读取',readValue:reads.length?prefix+values[0]:'—',readCount:reads.length,before,after,caption,change,delta:fractionText(delta.toJSON())}];
 });
}
/** One actual post-hand gain may stamp its original source, without extending the score timeline. */
export function growthEventPayoff(state:R2RunState,trace:ScoreTrace,event:ScoreEvent):GrowthPayoff|undefined {
 if(event.growthBefore&&event.growthAfter&&Rational.fromJSON(event.growthAfter).compare(Rational.fromJSON(event.growthBefore))<=0)return;
 if(!['afterHand','onStageClear'].includes(event.phase)||!['add-growth','add-coefficient','multiply-coefficient'].includes(event.operation))return;
 const row=growthPayoffs(state,trace).find(r=>r.instanceId===event.sourceInstanceId&&r.definitionId===event.sourceDefinitionId&&r.change==='gain');if(!row)return;
 const last=trace.events.filter(e=>e.sourceInstanceId===row.instanceId&&e.sourceDefinitionId===row.definitionId&&['afterHand','onStageClear'].includes(e.phase)&&['add-growth','add-coefficient','multiply-coefficient'].includes(e.operation)).at(-1);
 return last?.eventId===event.eventId?row:undefined;
}
