import type {FoleyKind} from './foley';
import {MAX_INTEGER_DIGITS} from '../domain/rational';
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

/** The numeric scene route supplies the multiplier ordinal even for ordinary
 * cards. Resolve a card's pitch from its saved scoring order, so add/key hits
 * and that card's enhancement/character hooks share the same ascending step.
 * No counter, future score inference, domain mutation or replay scheduling. */
export function scoreStrikeRate(presentation:object,eventId:string,kind:'add'|'key'|'multiply'|'award'|'flight',chain=0):number {
  if(kind==='award'||kind==='flight')return 1;
  if(kind==='add'||kind==='key'){
    const score=(presentation as {score?:Partial<Pick<ScoreTrace,'sets'|'events'>>}).score;
    const event=Array.isArray(score?.events)?score.events.find(e=>e.eventId===eventId):undefined;
    const ids=score?.sets?.activeScoringIds;
    const card=event?.targetCardId??(event?.sourceType==='card'?event.sourceInstanceId:undefined);
    const ordinal=card&&Array.isArray(ids)?ids.indexOf(card):-1;
    if(ordinal>=0)return chainRate(ordinal);
  }
  return chainRate(chain);
}
