import type {R2RunState} from '../domain/r2Run';
import type {ScoreEvent,ScoreTrace} from '../domain/scoreR2';
import {Rational} from '../domain/rational';
import {usesTouyeWager} from '../domain/r2TouyeWager';
import {characterForRun,usesCurrentHeroText} from './CharacterRunCopy';

/** A name belongs to the actual saved character event, never an equipped portrait. */
export function savedSkillName(run:R2RunState,trace:ScoreTrace,event:ScoreEvent):string|undefined {
 if(event.sourceType!=='character'||event.sourceDefinitionId!==run.characterId||!trace.events.includes(event)||
  ['base','finalScore','afterHand','onStageClear','beforeFailure'].includes(event.phase))return;
 const changed=['H','M'].some(metric=>Rational.fromJSON(event.after[metric as 'H'|'M']).compare(Rational.fromJSON(event.before[metric as 'H'|'M']))>0);
 if(!changed)return;
 const name=(legacy:string)=>usesCurrentHeroText(run)?characterForRun(run).passiveName:legacy;
 if(trace.xiemuBurn?.cost&&run.characterId==='xiemu')return name('燃金');
 if(trace.azaoCharge?.release&&run.characterId==='azao')return name('蓄势爆发');
 if(trace.erxiangHandoff&&event.reasonKey==='erxiang.handoff')return name('交棒');
 if(trace.assist&&event.reasonKey==='amo.assist.'+trace.assist.kind)return name('主手＋助攻');
 if(trace.touyeWager?.commit&&event.reasonKey.startsWith('touye.won.'))return name('赌约兑现');
 if(usesTouyeWager(run))return '常规倍率';
 return characterForRun(run).passiveName;
}

/** Largest local Joker factor, exact rational comparison with trace-order ties.
 * This selects a focus, not a counterfactual contribution or the hand's cumulative M. */
export function strongestJokerFactor(trace:ScoreTrace,events:readonly ScoreEvent[]):ScoreEvent|undefined {
 let selected:ScoreEvent|undefined,factor=new Rational(1n);
 for(const event of events){
  if(event.sourceType!=='joker')continue;
  if(!trace.events.includes(event)||['base','finalScore','afterHand','onStageClear','beforeFailure'].includes(event.phase))continue;
  const before=Rational.fromJSON(event.before.M);
  if(before.n===0n)continue;
  const local=Rational.fromJSON(event.after.M).multiply(new Rational(before.d,before.n));
  if(local.compare(factor)>0){selected=event;factor=local;}
 }
 return selected;
}

/** Wall-clock choreography. The exact receipt stays readable at every beat. */
export function settlementBeat(elapsedMs:number,tier:number,lost=false){
 const elapsed=Math.max(0,elapsedMs),strength=lost?0:Math.max(0,Math.min(3,tier));
 const phase=elapsed<120?'charge':elapsed<360?'impact':elapsed<780?'applause':elapsed<1000?'release':'settled';
 const initial=[.97,.94,.89,.82][strength],land=Math.max(0,Math.min(1,(elapsed-120)/240));
 const scale=phase==='charge'?initial:initial+(1-initial)*(1-(1-land)**3);
 const alpha=phase==='charge'?.12:phase==='impact'?land:phase==='applause'?1:phase==='release'?(1000-elapsed)/220:0;
 return {phase,scale,alpha,progress:Math.min(1,elapsed/1000)};
}
