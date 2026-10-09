import type {ScoreEvent,ScoreTrace} from '../domain/scoreR2';
import {Rational} from '../domain/rational';
import {fractionText} from './scoreText';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
export interface SourceImpact {eventId:string;rootId:string;instanceId:string;definitionId:string;kind:'heat'|'multiplier'|'multiply'|'read-heat'|'read-multiplier'|'retrigger';copies:string[];targetId?:string}
const delta=(a:ScoreEvent['value'],b:ScoreEvent['value'])=>Rational.fromJSON(a).add(Rational.fromJSON(b).multiply(new Rational(-1n)));
/** Exact committed scoring arrival, not the nominal amount or a new gain in saved growth. */
export function sourceImpact(trace:ScoreTrace,event:ScoreEvent):SourceImpact|undefined {
 if(event.sourceType!=='joker'||!['onCardScore','onHeldCard','jokerScore'].includes(event.phase)||!trace.events.some(e=>e===event||e.eventId===event.eventId&&JSON.stringify(e)===JSON.stringify(event))||!trace.sourceJokers.some(j=>j.instanceId===event.sourceInstanceId&&j.definitionId===event.sourceDefinitionId))return;
 const base={eventId:event.eventId,rootId:trace.rootId,instanceId:event.sourceInstanceId,definitionId:event.sourceDefinitionId};
 if(event.operation==='retrigger-card'){
  const target=trace.cards.find(c=>c.id===event.targetCardId);if(!target||!trace.sets.activeScoringIds.includes(target.id)||Rational.fromJSON(event.value).compare(new Rational(1n))!==0)return;
  return {...base,kind:'retrigger',targetId:target.id,copies:['再'+rankLabel(target.rank)+SUIT_SYMBOL[target.suit]]};
 }
 const heat=delta(event.after.H,event.before.H),multiplier=delta(event.after.M,event.before.M),reads=['read-growth','consume-growth','read-coefficient'].includes(event.operation);
 if(heat.n>0n&&multiplier.n>0n)return; // A compound operation keeps the existing complete summary.
 if(multiplier.n>0n&&['multiply-multiplier','read-coefficient'].includes(event.operation)){
  const before=Rational.fromJSON(event.before.M);if(before.n<=0n)return;
  const factor=Rational.fromJSON(event.after.M).multiply(new Rational(before.d,before.n)),v=fractionText(factor.toJSON());return {...base,kind:reads?'read-multiplier':'multiply',copies:reads?['读×'+v,'×'+v]:['×'+v]};
 }
 if(heat.n>0n){const v=fractionText(heat.toJSON());return {...base,kind:reads?'read-heat':'heat',copies:reads?['读热'+v,'读+'+v,'读'+v]:['热+'+v,'+'+v]};}
 if(multiplier.n>0n){const v=fractionText(multiplier.toJSON());return {...base,kind:reads?'read-multiplier':'multiplier',copies:reads?['读倍'+v,'读+'+v,'读'+v]:['倍+'+v,'+'+v]};}
}
