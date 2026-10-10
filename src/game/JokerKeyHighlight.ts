import type {R2RunState} from '../domain/r2Run';
import type {ScoreEvent,ScoreTrace} from '../domain/scoreR2';
import {Rational} from '../domain/rational';
import {hasActualBenefit,savedBenefit,type SavedBenefit} from './JokerExperience';
import {fractionText} from './scoreText';
import {HAND_LABELS} from '../content/handLabels';
import type {ScoreBeat} from './scorePresentation';
import type {R2OpeningRoute} from '../domain/r2GroupUpgrade';
import type {CharacterId} from '../domain/characters';
export interface JokerKeyHighlight {eventId:string;fact:SavedBenefit;kind:'multiply'|'crossing'|'starter'|'opening'|'payoff'|'burst';landing:string;cause:string;route?:R2OpeningRoute;heroId?:CharacterId}
const product=(a:ScoreEvent['after'])=>Rational.fromJSON(a.H).multiply(Rational.fromJSON(a.M)).floor();
/** Select from committed events only, never selection forecasts. Stable tie keeps trace order. */
export function keyHighlight(state:R2RunState,trace:ScoreTrace,originHeat='0',target=state.stage?.targetHeat,includeOpening=true):JokerKeyHighlight|undefined {
 const stamp=state.routeStarter;
 if(includeOpening&&state.openingShow?.rootId===trace.rootId&&state.openingShow.reason==='score')return;
 if(includeOpening&&state.openingShow?.rootId===trace.rootId&&state.openingShow.reason==='multiply'){const event=trace.events.find(e=>e.eventId===state.openingShow!.eventId),fact=event&&(savedBenefit(state,trace,event)??{eventId:event.eventId,sourceInstanceId:event.sourceInstanceId,definitionId:'',title:event.sourceType==='character'?'角色实际收益':'计分牌实际收益',effect:'倍率 '+fractionText(event.before.M)+' → '+fractionText(event.after.M),condition:'真实已保存乘法',destination:'本手实际计分',next:'自主继续选牌'});if(event&&fact)return {eventId:event.eventId,fact,kind:'opening',heroId:state.characterId,cause:'实际乘法生效',landing:'倍率 '+fractionText(event.before.M)+' → '+fractionText(event.after.M)};}
 if(includeOpening&&state.openingRoute&&stamp?.rootId===trace.rootId&&(!state.openingShow||state.openingShow.rootId===trace.rootId)){
  const event=trace.events.find(e=>e.eventId===stamp.eventId&&e.sourceInstanceId===stamp.instanceId),fact=event&&savedBenefit(state,trace,event);
  if(event&&fact){
   const growthBefore=trace.sourceJokers.find(j=>j.instanceId===event.sourceInstanceId)?.growth.multiplier??{n:'0',d:'1'},growthAfter=trace.jokers.find(j=>j.instanceId===event.sourceInstanceId)?.growth.multiplier;
   const shown=event.operation==='add-growth'&&growthAfter?{...fact,effect:'保存成长 '+fractionText(growthBefore)+' → '+fractionText(growthAfter)}:fact;
   return {eventId:event.eventId,fact:shown,kind:'starter',route:state.openingRoute,heroId:state.characterId,cause:HAND_LABELS[trace.handType]+'已成型',landing:event.operation==='add-growth'?'已存成长 · 下手生效，本手分数不变':'热度 '+fractionText(event.before.H)+' → '+fractionText(event.after.H)};
  }
 }
 let selected:JokerKeyHighlight|undefined,priority=0;
 for(const e of trace.events){
  // This purchased source has already earned its one first cue; crossings still use its short source feedback.
  if(stamp?.eventId&&e.sourceInstanceId===stamp.instanceId)continue;
  if((e.sourceType!=='joker'&&!((trace.azaoCharge?.release&&e.sourceDefinitionId==='azao'||trace.xiemuBurn?.cost&&e.sourceDefinitionId==='xiemu')&&e.sourceType==='character'))||!hasActualBenefit(e)||['base','finalScore','afterHand','onStageClear','beforeFailure'].includes(e.phase))continue;
  const multiply=['multiply-multiplier','read-coefficient'].includes(e.operation)&&Rational.fromJSON(e.after.M).compare(Rational.fromJSON(e.before.M))>0;
  const crossing=target!==undefined&&BigInt(originHeat)+product(e.before)<BigInt(target)&&BigInt(originHeat)+product(e.after)>=BigInt(target);
  const rank=multiply?2:crossing?1:0,fact=savedBenefit(state,trace,e);
  if(rank>priority&&fact){priority=rank;selected={eventId:e.eventId,fact,kind:multiply?'multiply':'crossing',heroId:state.characterId,cause:e.visibleCondition.kind==='hand-type-in'?HAND_LABELS[trace.handType]+'已成型':e.visibleCondition.kind==='resource'&&e.visibleCondition.resource==='discards-used'?'本场弃牌 '+e.visibleCondition.equals+' 次':e.visibleCondition.kind==='resource'&&e.visibleCondition.resource==='play-index'?'本场第 '+e.visibleCondition.equals+' 手':e.operation==='read-coefficient'?'读取已存倍率':'真实条件已满足',landing:multiply?'倍率 '+fractionText(e.before.M)+' → '+fractionText(e.after.M):'本手贡献到达本场目标'};}
 }
 return selected;
}
export function keyHighlightBeat(base:ScoreBeat,reduced=false,kind?:JokerKeyHighlight['kind']):ScoreBeat {
 if(kind==='starter'||kind==='opening')return {...base,windup:reduced?0:120,flight:reduced?0:base.flight?140:0,impact:reduced?320:600,rest:reduced?80:base.flight?140:280};
 return {...base,windup:reduced?0:100,flight:reduced?0:base.flight?140:0,impact:reduced?280:220,rest:120};
}
export function starterRepeatBeat(base:ScoreBeat,reduced=false):ScoreBeat{return {...base,windup:reduced?0:40,flight:reduced?0:base.flight?70:0,impact:reduced?120:120,rest:reduced?80:base.flight?60:130};}
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
