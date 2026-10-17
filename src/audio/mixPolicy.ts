import type {FoleyKind} from './foley';
import {MAX_INTEGER_DIGITS,Rational} from '../domain/rational';
import type {ScoreTrace} from '../domain/scoreR2';
import {actualMultiplier} from '../domain/openingShow';
/** Voices overlapping in time, including already scheduled tails. Future deal
 * trains retain their beats; the existing 32-node retention limit is a backstop. */
export const EFFECT_VOICE_BUDGET = 16;
export const ACCENT_TAIL_FLOOR = .38;
// Numeric arrivals share this cap across all three materials and multiplication.
export const SCORE_VOICE_BUDGET = 6;
export const SCORE_GAIN_BUDGET = .12; // Sum of admitted pre-bus layer gains.
// Decoder safety ceiling for all material/UI callers; numeric rates stay below1.14.
export const MAX_RECORDED_RATE = 2.3;
/** Only called at the committed final award. Never infer an amount from tier,
 * accumulated heat, a target, or provisional multiplication. */
export function awardForScore(presentation:object):FoleyKind {
  const score=(presentation as {score?:{finalScore?:unknown}}).score?.finalScore;
  // Match the persisted bigint contract, not Number's finite decimal range.
  // String validation/counting never converts the score to floating point.
  if(typeof score!=='string'||score.length===0||score.length>MAX_INTEGER_DIGITS||/\D/.test(score))return 'award';
  const digits=score.replace(/^0+/, '').length;
  return digits>=13?'awardTrillion':digits>=9?'awardHundredMillion':digits>=7?'awardMillion':'award';
}
/** Legacy material callers also stay in a narrow register, never a high octave. */
export function chainRate(chain:number):number {
  const c = Math.max(0, Math.min(2, Number.isFinite(chain) ? Math.floor(chain) : 0));
  const rates = [.94, 1, 1.06];
  return rates[c];
}

/** Three short rising pulses repeat; a long hand cannot park at a high octave. */
export const SCORE_NOTE_SEMITONES = [0,2,4] as const;
const noteStep=(value:number)=>Math.max(0,Number.isFinite(value)?Math.floor(value):0)%3;

/** The saved positive accumulator events form one phrase for the whole hand.
 * Do not restart when cards give way to a joker or the first multiplication.
 * This reads committed before/after values, never final score or mutable counters. */
export function scoreStrikeStep(presentation:object,eventId:string,chain=0):number {
 const score=(presentation as {score?:Partial<Pick<ScoreTrace,'sets'|'events'>>}).score;
 const events=Array.isArray(score?.events)?score.events:[];
 const event=events.find(e=>e.eventId===eventId);
 if(event?.before&&event.after){
  let ordinal=0;
  for(const e of events){
   if(['base','afterHand','onStageClear','beforeFailure','finalScore'].includes(e.phase)||!e.before?.H||!e.before.M||!e.after?.H||!e.after.M)continue;
   if(Rational.fromJSON(e.after.H).compare(Rational.fromJSON(e.before.H))<=0&&Rational.fromJSON(e.after.M).compare(Rational.fromJSON(e.before.M))<=0)continue;
   if(e.eventId===eventId)return noteStep(ordinal);
   ordinal++;
  }
 }
 // Compatibility for small public callers without full accumulator snapshots.
 const card=event?.targetCardId??(event?.sourceType==='card'?event.sourceInstanceId:undefined),ids=score?.sets?.activeScoringIds;
 const ordinal=card&&Array.isArray(ids)?ids.indexOf(card):-1;
 return noteStep(ordinal>=0?ordinal:chain);
}
export function scoreStrikeRate(presentation:object,eventId:string,kind:'add'|'key'|'multiply'|'award'|'flight',chain=0):number {
 if(kind==='award'||kind==='flight')return 1;
 return .9*2**(SCORE_NOTE_SEMITONES[scoreStrikeStep(presentation,eventId,chain)]/12);
}

/** Saved arithmetic owns the accent, even if a visual caller labels it a key.
 * Small compatibility callers without snapshots retain their explicit kind. */
export function scoreArrivalKind(presentation:object,eventId:string,kind:'add'|'key'|'multiply'):'add'|'key'|'multiply' {
 const events=(presentation as {score?:Partial<ScoreTrace>}).score?.events;
 const event=Array.isArray(events)?events.find(e=>e.eventId===eventId):undefined;
 if(!event?.before?.M||!event.after?.M)return kind;
 if(actualMultiplier(event))return 'multiply';
 return kind==='multiply'?'key':kind;
}
