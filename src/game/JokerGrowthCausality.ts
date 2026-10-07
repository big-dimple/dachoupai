import type {R2RunState} from '../domain/run';
import type {R2JokerInstance} from '../content/r2Schema';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {Rational} from '../domain/rational';
import {fractionText} from './scoreText';
import {HAND_LABELS} from '../content/handLabels';

/** Saved ledger and current holdings only; this is never a selection preview or a persisted history extension. */
export function groupGrowthCausality(state:R2RunState,joker:R2JokerInstance):{title:string;body:string}|undefined {
 if(state.contentVersion!=='quality-r2-group-upgrade-prototype-v1'||!['b10','b03'].includes(joker.definitionId))return;
 const d=r2JokerDefinitionFor(state,joker.definitionId),unit=joker.definitionId==='b10'?'热度':'倍率',key=joker.definitionId==='b10'?'heat':'multiplier',zero={n:'0',d:'1'},current=state.jokers.find(j=>j.instanceId===joker.instanceId&&j.definitionId===joker.definitionId);if(!current)return;
 const lines=[`当前持有已保存${unit}成长：+${fractionText(current.growth[key]??zero)}。`],trace=state.lastTrace;
 const source=trace?.sourceJokers.find(j=>j.instanceId===current.instanceId&&j.definitionId===current.definitionId),saved=trace?.jokers.find(j=>j.instanceId===current.instanceId&&j.definitionId===current.definitionId);
 if(trace&&source&&saved){
  const own=trace.events.filter(e=>e.sourceType==='joker'&&e.sourceInstanceId===current.instanceId&&e.sourceDefinitionId===current.definitionId),reads=own.filter(e=>e.operation==='read-growth'),gains=own.filter(e=>e.operation==='add-growth'&&e.phase==='afterHand');
  const total=(events:typeof own)=>events.reduce((sum,e)=>sum.add(Rational.fromJSON(e.value)),new Rational(0n)).toJSON();
  lines.push(`最近一次已保存出牌：${HAND_LABELS[trace.handType]}。`,`结算前已存${unit}成长：+${fractionText(source.growth[key]??zero)}。`,reads.length?`本次实际读取${unit}成长：+${fractionText(total(reads))}。`:'本次没有该实例读取成长的事件；不能算作已读入。',gains.length?`结算后实际新增${unit}成长：+${fractionText(total(gains))}。`:'本次没有新增成长事件。',`该次结算后累计保存：+${fractionText(saved.growth[key]??zero)}。`);
 }else lines.push('没有保留该实例的已保存出牌记录；只展示当前保存值，不补造触发历史。');
 lines.push('新增成长不补加到刚结算的本手；后续出牌按当时条件读取，计分封禁时不读加成。','成长跨场保留；进入新场或重入不会凭空再次增长。下一次是否实际读入，以成功保存后的事件为准。');
 return {title:d.name+' · 成长因果',body:lines.join('\n\n')};
}
