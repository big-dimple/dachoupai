import type {R2RunState} from '../domain/r2Run';
import type {ScoreTrace} from '../domain/scoreR2';
import type {JokerKeyHighlight} from './JokerKeyHighlight';
import {hasActualBenefit,savedBenefit} from './JokerExperience';
import {Rational} from '../domain/rational';
import {multiplierOverview} from './ScoreEventCaption';
import type {ScoreBeat} from './scorePresentation';
/** Ordered committed contributions. Each distinct event can speak; no first-hand/global source gate. */
export function heroPayoffs(state:R2RunState,trace:ScoreTrace,replay=false):JokerKeyHighlight[] {
 if(replay)return [];
 const seen=new Set<string>(),keys:JokerKeyHighlight[]=[];
 for(const e of trace.events){
  if(seen.has(e.eventId)||!hasActualBenefit(e))continue;
  const character=e.sourceType==='character'&&e.sourceDefinitionId===state.characterId&&(
   !!trace.assist&&e.reasonKey==='amo.assist.'+trace.assist.kind||
   !!trace.erxiangHandoff&&e.reasonKey==='erxiang.handoff'||
   !!trace.azaoCharge?.release&&e.sourceDefinitionId==='azao'&&e.phase==='characterScore'||
   !!trace.xiemuBurn?.cost&&e.sourceDefinitionId==='xiemu'&&e.phase==='characterScore'||
   trace.touyeWager?.outcome==='won'&&!!trace.touyeWager.commit&&!!e.reasonKey?.startsWith('touye.won.'));
  const multiply=e.sourceType==='joker'&&['multiply-multiplier','read-coefficient','rescue-multiplier'].includes(e.operation)&&Rational.fromJSON(e.value).compare(new Rational(1n))>0&&Rational.fromJSON(e.after.M).compare(Rational.fromJSON(e.before.M))>0;
  if(!character&&!multiply)continue;
  const fact=savedBenefit(state,trace,e);if(!fact)continue;
  seen.add(e.eventId);keys.push({eventId:e.eventId,fact,kind:character?'payoff':'burst',heroId:state.characterId,cause:character?'能力实际兑现':'实际乘法生效',landing:'倍率 '+multiplierOverview(e.before.M,true)+' → '+multiplierOverview(e.after.M,true)});
 }
 return keys;
}
/** The readable subject hold replaces the old short impact plus extra wait; entry/exit stay separate. */
export function heroPayoffBeat(base:ScoreBeat,reduced=false):ScoreBeat {return {...base,windup:reduced?0:250,flight:reduced?0:base.flight?100:0,impact:1000,rest:0};}
