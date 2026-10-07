import type {R2RunState} from '../domain/r2Run';
import type {ScoreEvent,ScoreTrace} from '../domain/scoreR2';
import {Rational} from '../domain/rational';
import {hasActualBenefit,savedBenefit,type SavedBenefit} from './JokerExperience';
import {fractionText} from './scoreText';
import {HAND_LABELS} from '../content/handLabels';
import type {ScoreBeat} from './scorePresentation';
export interface JokerKeyHighlight {eventId:string;fact:SavedBenefit;kind:'multiply'|'crossing';landing:string;cause:string}
const product=(a:ScoreEvent['after'])=>Rational.fromJSON(a.H).multiply(Rational.fromJSON(a.M)).floor();
/** Select from committed events only, never selection forecasts. Stable tie keeps trace order. */
export function keyHighlight(state:R2RunState,trace:ScoreTrace,originHeat='0',target=state.stage?.targetHeat):JokerKeyHighlight|undefined {
 let selected:JokerKeyHighlight|undefined,priority=0;
 for(const e of trace.events){
  if(e.sourceType!=='joker'||!hasActualBenefit(e)||['base','finalScore','afterHand','onStageClear','beforeFailure'].includes(e.phase))continue;
  const multiply=['multiply-multiplier','read-coefficient'].includes(e.operation)&&Rational.fromJSON(e.after.M).compare(Rational.fromJSON(e.before.M))>0;
  const crossing=target!==undefined&&BigInt(originHeat)+product(e.before)<BigInt(target)&&BigInt(originHeat)+product(e.after)>=BigInt(target);
  const rank=multiply?2:crossing?1:0,fact=savedBenefit(state,trace,e);
  if(rank>priority&&fact){priority=rank;selected={eventId:e.eventId,fact,kind:multiply?'multiply':'crossing',cause:e.visibleCondition.kind==='hand-type-in'?HAND_LABELS[trace.handType]+'已成型':e.visibleCondition.kind==='resource'&&e.visibleCondition.resource==='discards-used'?'本场弃牌 '+e.visibleCondition.equals+' 次':e.visibleCondition.kind==='resource'&&e.visibleCondition.resource==='play-index'?'本场第 '+e.visibleCondition.equals+' 手':e.operation==='read-coefficient'?'读取已存倍率':'真实条件已满足',landing:multiply?'倍率 '+fractionText(e.before.M)+' → '+fractionText(e.after.M):'本手贡献到达本场目标'};}
 }
 return selected;
}
export function keyHighlightBeat(base:ScoreBeat,reduced=false):ScoreBeat {return {...base,windup:reduced?0:100,flight:reduced?0:base.flight?140:0,impact:reduced?280:220,rest:120};}
/** Growth stamp reports the saved destination, never adds this growth to the current score. */
export function savedGrowthStamp(state:R2RunState,trace:ScoreTrace,e:ScoreEvent):string|undefined {
 if(!['afterHand','onStageClear'].includes(e.phase)||!['add-growth','add-coefficient','multiply-coefficient'].includes(e.operation))return;
 const fact=savedBenefit(state,trace,e);if(!fact)return;
 return fact.title+' · '+fact.effect+'\n'+fact.destination;
}
export function victorySourceFact(state:R2RunState,trace:ScoreTrace):SavedBenefit|undefined {
 const key=keyHighlight(state,trace,'0','0');if(key)return key.fact;
 return trace.events.map(e=>savedBenefit(state,trace,e)).find(f=>f?.destination.includes('结算后新增'))??trace.events.map(e=>savedBenefit(state,trace,e)).find(Boolean);
}
