import type {R2RunState,DomainEvent} from '../domain/run';
import type {ScoreTrace} from '../domain/scoreR2';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {Rational} from '../domain/rational';
import {fractionText} from './scoreText';
import {isGrowthWrite} from './GrowthOpportunity';

type Transaction=Extract<DomainEvent,{type:'joker-transaction'}>;
const phaseName={onBuyOffer:'购买后',onSellJoker:'出售后',onReroll:'刷新后',onDiscard:'弃牌后',onStageClear:'过关后'};
/** Called only with a successful committed transaction and its exact before/after states. */
export function transactionGrowthChange(before:R2RunState,after:R2RunState,event:Transaction,compact=false):string|undefined {
 if(!['add-growth','add-coefficient','reset-coefficient'].includes(event.operation))return;
 const source=before.jokers.find(j=>j.instanceId===event.instanceId&&j.definitionId===event.definitionId),saved=after.jokers.find(j=>j.instanceId===event.instanceId&&j.definitionId===event.definitionId);if(!source||!saved)return;
 const d=r2JokerDefinitionFor(after,event.definitionId),op=d.hooks.filter(h=>h.phase===event.phase).flatMap(h=>h.operations).find(o=>(isGrowthWrite(o)||o.kind==='reset-coefficient')&&(o.kind===event.operation));
 if(!op||!('key' in op))return;
 const a=saved.growth[op.key]??{n:'0',d:'1'},b=source.growth[op.key]??{n:'0',d:'1'},prefix=op.key==='coefficient'?'×':'+';
 const delta=Rational.fromJSON(a).add(Rational.fromJSON(b).multiply(new Rational(-1n))),tail=event.operation==='reset-coefficient'?'已重置':delta.n>0n?'实际新增+'+fractionText(delta.toJSON()):'实际未新增';
 return d.name+(compact?' 已保存 ':' · '+phaseName[event.phase as keyof typeof phaseName]+'已保存 ')+prefix+fractionText(b)+'→'+prefix+fractionText(a)+(compact?'':' · '+tail);
}
/** A prior hand record, labelled as such; never claims the current holding was read. */
export function handGrowthChanges(state:R2RunState,trace:ScoreTrace=state.lastTrace!):{instanceId:string;line:string}[]{
 if(!trace)return [];
 return trace.sourceJokers.flatMap(source=>{
  const saved=trace.jokers.find(j=>j.instanceId===source.instanceId&&j.definitionId===source.definitionId);if(!saved)return [];
  const d=r2JokerDefinitionFor(state,source.definitionId),keys=[...new Set(d.hooks.flatMap(h=>h.operations).filter(isGrowthWrite).map(o=>o.key))];
  return keys.flatMap(key=>{
   const own=trace.events.filter(e=>e.sourceType==='joker'&&e.sourceInstanceId===source.instanceId&&e.sourceDefinitionId===source.definitionId&&['add-growth','add-coefficient','multiply-coefficient','reset-growth','reset-coefficient','consume-growth'].includes(e.operation));if(!own.length)return [];
   const b=source.growth[key]??{n:'0',d:'1'},a=saved.growth[key]??{n:'0',d:'1'},prefix=key==='coefficient'?'×':'+';
   const delta=Rational.fromJSON(a).add(Rational.fromJSON(b).multiply(new Rational(-1n))),change=delta.n>0n?'实际新增+'+fractionText(delta.toJSON()):delta.n<0n?'实际减少'+fractionText(delta.multiply(new Rational(-1n)).toJSON()):'实际未新增';
   return [{instanceId:source.instanceId,line:d.name+' · 上手已保存 '+prefix+fractionText(b)+'→'+prefix+fractionText(a)+' · '+change}];
  });
 });
}
