import {cardDefinitionName} from './tangsongCardNames';
import type {R2RunState} from '../domain/run';
import type {R2JokerInstance} from '../content/r2Schema';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {Rational} from '../domain/rational';
import {fractionText} from './scoreText';
import {HAND_LABELS} from '../content/handLabels';
import {hasR2GroupUpgradeContract} from '../domain/r2GroupUpgrade';

/** Saved ledger and current holdings only; this is never a selection preview or a persisted history extension. */
export function groupGrowthCausality(state:R2RunState,joker:R2JokerInstance):{title:string;body:string}|undefined {
 if(!hasR2GroupUpgradeContract(state)||!['b10','b03'].includes(joker.definitionId))return;
 const d=r2JokerDefinitionFor(state,joker.definitionId),unit=joker.definitionId==='b10'?'热度':'倍率',key=joker.definitionId==='b10'?'heat':'multiplier',zero={n:'0',d:'1'},current=state.jokers.find(j=>j.instanceId===joker.instanceId&&j.definitionId===joker.definitionId);if(!current)return;
 const lines=[`这张牌已攒${unit}加成：+${fractionText(current.growth[key]??zero)}。`],trace=state.lastTrace;
 const source=trace?.sourceJokers.find(j=>j.instanceId===current.instanceId&&j.definitionId===current.definitionId),saved=trace?.jokers.find(j=>j.instanceId===current.instanceId&&j.definitionId===current.definitionId);
 if(trace&&source&&saved){
  const own=trace.events.filter(e=>e.sourceType==='joker'&&e.sourceInstanceId===current.instanceId&&e.sourceDefinitionId===current.definitionId),reads=own.filter(e=>e.operation==='read-growth'),gains=own.filter(e=>e.operation==='add-growth'&&e.phase==='afterHand');
  const total=(events:typeof own)=>events.reduce((sum,e)=>sum.add(Rational.fromJSON(e.value)),new Rational(0n)).toJSON();
  lines.push(`最近一手：${HAND_LABELS[trace.handType]}。`,`出牌前已攒${unit}加成：+${fractionText(source.growth[key]??zero)}。`,reads.length?`这手实际用到${unit}加成：+${fractionText(total(reads))}。`:'这手没有用到这张牌的成长加成。',gains.length?`打完后新攒${unit}加成：+${fractionText(total(gains))}。`:'这手没有新攒的成长加成。',`打完后累计加成：+${fractionText(saved.growth[key]??zero)}。`);
 }else lines.push('还没有这张牌的出牌记录；这里只显示已攒加成。');
 lines.push('新攒的加成不补算到刚打完的这手；以后出牌满足条件时才会算入，计分被禁用时不计入。','已攒加成能带到下一场，换场或重新进入不会重复增加。下手是否用到，还要看当时的条件。');
 return {title:cardDefinitionName(d)+' · 加成从哪来',body:lines.join('\n\n')};
}

/** One saved increment or current saved balance, visible without details; never anticipates a trigger. */
export function savedGrowthDiscovery(state:R2RunState,surface:'table'|'shop'='table'):{full:string;compact:string}|undefined {
 if(surface==='shop'&&state.contentVersion!=='quality-r2-group-upgrade-prototype-v1'&&hasR2GroupUpgradeContract(state))return currentShopGrowth(state);
 if(state.contentVersion!=='quality-r2-group-upgrade-prototype-v1')return;
 for(const j of state.jokers){
  if(!['b10','b03'].includes(j.definitionId))continue;
  const trace=state.lastTrace,saved=trace?.jokers.find(s=>s.instanceId===j.instanceId&&s.definitionId===j.definitionId);if(!trace||!saved)continue;
  const gain=trace.events.filter(e=>e.sourceType==='joker'&&e.sourceInstanceId===j.instanceId&&e.sourceDefinitionId===j.definitionId&&e.phase==='afterHand'&&e.operation==='add-growth').reduce((sum,e)=>sum.add(Rational.fromJSON(e.value)),new Rational(0n));if(gain.compare(new Rational(0n))<=0)continue;
  const name=cardDefinitionName(r2JokerDefinitionFor(state,j.definitionId)),key=j.definitionId==='b10'?'heat':'multiplier',value=fractionText(gain.toJSON()),total=fractionText(saved.growth[key]??{n:'0',d:'1'});
  return {full:`${name}成长+${value}→${total} · 下手按条件读`,compact:`${name}+${value}→${total}\n下手按条件读`};
 }
 for(const j of state.jokers){if(!['b10','b03'].includes(j.definitionId))continue;const key=j.definitionId==='b10'?'heat':'multiplier',stored=j.growth[key];if(!stored||Rational.fromJSON(stored).compare(new Rational(0n))<=0)continue;const name=cardDefinitionName(r2JokerDefinitionFor(state,j.definitionId)),total=fractionText(stored),timing=state.phase==='await-input'?'本手':'出牌';return {full:`${name}已存成长${total} · ${timing}按条件读`,compact:`${name}已存${total}\n${timing}按条件读`};}
}

/** Current shop continuity uses held saved values and its own prior-hand increment only. */
function currentShopGrowth(state:R2RunState):{full:string;compact:string}|undefined {
 for(const j of state.jokers){
  if(!['b10','b03'].includes(j.definitionId))continue;const key=j.definitionId==='b10'?'heat':'multiplier',zero={n:'0',d:'1'},value=Rational.fromJSON(j.growth[key]??zero);if(value.n<=0n)continue;
  const trace=state.lastTrace,source=trace?.sourceJokers.find(x=>x.instanceId===j.instanceId&&x.definitionId===j.definitionId),saved=trace?.jokers.find(x=>x.instanceId===j.instanceId&&x.definitionId===j.definitionId);
  const gain=source&&saved&&Rational.fromJSON(saved.growth[key]??zero).compare(value)===0?trace!.events.filter(e=>e.sourceType==='joker'&&e.sourceInstanceId===j.instanceId&&e.sourceDefinitionId===j.definitionId&&e.phase==='afterHand'&&e.operation==='add-growth').reduce((sum,e)=>sum.add(Rational.fromJSON(e.value)),new Rational(0n)):new Rational(0n);
  const text=cardDefinitionName(r2JokerDefinitionFor(state,j.definitionId))+'已攒+'+fractionText(value.toJSON())+(gain.n>0n?' · 上手+'+fractionText(gain.toJSON()):'');return {full:text,compact:text};
 }
}
