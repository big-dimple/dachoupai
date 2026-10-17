import type {FoleyKind} from './foley';
import {MAX_INTEGER_DIGITS,Rational} from '../domain/rational';
import type {ScoreTrace} from '../domain/scoreR2';
/** Voices overlapping in time, including already scheduled tails. Future deal
 * trains retain their beats; the existing 32-node retention limit is a backstop. */
export const EFFECT_VOICE_BUDGET = 16;
export const ACCENT_TAIL_FLOOR = .38;
// The octave step multiplies each recipe's original pitch (up to 1.15x).
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
/** Eight finite pitch steps, chain 0..7; the last step is one octave (2x).
 * Recipe layer rates retain their timbre within MAX_RECORDED_RATE. */
export function chainRate(chain:number):number {
  const c = Math.max(0, Math.min(7, Number.isFinite(chain) ? Math.floor(chain) : 0));
  const rates = [1.0, 1.12, 1.25, 1.35, 1.5, 1.68, 1.88, 2.0];
  return rates[c];
}

/** One major scale for the numeric arrival route. Material/UI chainRate above
 * remains compatible; a fixed recorded bell gives these intervals a stable root. */
export const SCORE_NOTE_SEMITONES = [0,2,4,5,7,9,11,12] as const;
const noteStep=(value:number)=>Math.max(0,Math.min(7,Number.isFinite(value)?Math.floor(value):0));

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
 return 2**(SCORE_NOTE_SEMITONES[scoreStrikeStep(presentation,eventId,chain)]/12);
}
