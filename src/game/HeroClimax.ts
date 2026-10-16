import {readableFractionText} from './scoreText';
import type Phaser from 'phaser';
import {heroPayoffs} from './HeroPayoff';
import type {JokerKeyHighlight} from './JokerKeyHighlight';
import type {R2RunState} from '../domain/r2Run';
import type {ScoreTrace} from '../domain/scoreR2';
import {readableMultiplierEffect} from './ScoreEventCaption';
import {scoreSourceProcess,scoreSourceClimaxValue} from './ScoreSourceProcess';
import {savedSkillName} from './SettlementHighlights';
export interface HeroClimaxValue {label:string;before:string;after:string;note:string;accumulated?:string;skillName?:string;landingValue?:string;landingLabel?:string}
/** Saved capability payoffs and actual bursts; legacy opening keys retain their receipt checks. */
export function heroClimaxValue(state:R2RunState,trace:ScoreTrace,key:JokerKeyHighlight,replay=false):HeroClimaxValue|undefined {
 if(replay||!key.heroId||key.heroId!==state.characterId)return;
 if(key.kind==='payoff'||key.kind==='burst'){const actual=heroPayoffs(state,trace).find(k=>k.eventId===key.eventId&&k.kind===key.kind);const event=trace.events.find(e=>e.eventId===key.eventId);if(!actual||!event)return;const cue=scoreSourceProcess(trace,event,actual.fact.title),value=cue&&scoreSourceClimaxValue(cue,readableMultiplierEffect(actual.fact.effect,event.value));return value&&{...value,skillName:savedSkillName(state,trace,event),landingValue:readableFractionText(cue!.kind==='heat'?event.after.H:event.after.M),landingLabel:cue!.kind==='heat'?'累计热度落位':'累计倍率落位'};}
 if(state.phase==='run-lost')return;
 const stamp=state.openingShow;
 if(!stamp||stamp.rootId!==trace.rootId||stamp.eventId!==key.eventId||stamp.handsScored>5)return;
 if(key.kind==='starter') {if(stamp.reason!=='starter'||state.routeStarter?.eventId!==key.eventId)return;}
 else if(key.kind!=='opening'||!['multiply','score'].includes(stamp.reason??''))return;
 const event=trace.events.find(e=>e.eventId===key.eventId);if(!event)return;
 if(event.phase==='finalScore')return {label:'实际得分',before:trace.finalScore,after:trace.finalScore,note:'这一手已结算'};
 if(event.operation==='add-growth'){
  const before=trace.sourceJokers.find(j=>j.instanceId===event.sourceInstanceId)?.growth.multiplier??{n:'0',d:'1'},after=trace.jokers.find(j=>j.instanceId===event.sourceInstanceId)?.growth.multiplier;
  if(!before||!after)return;
  return {label:'成长已保存',before:readableFractionText(before),after:readableFractionText(after),note:'下手生效 · 不加本手分'};
 }
 const cue=scoreSourceProcess(trace,event,key.fact.title);
 if(cue){const value=scoreSourceClimaxValue(cue,readableMultiplierEffect(key.fact.effect,event.value));return value&&{...value,landingValue:readableFractionText(cue.kind==='heat'?event.after.H:event.after.M),landingLabel:cue.kind==='heat'?'累计热度落位':'累计倍率落位'};}
 return {label:'实际热度',before:readableFractionText(event.before.H),after:readableFractionText(event.after.H),note:readableMultiplierEffect(key.fact.effect,event.value)};
}
export interface HeroClimaxView {group:Phaser.GameObjects.Container;strike:()=>void;release:()=>Promise<void>;reduce:()=>void;dispose:()=>void}
export {mountHeroClimax} from './HeroClimaxStage';
