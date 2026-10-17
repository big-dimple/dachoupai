import type {FoleyKind} from './foley';
import {MAX_INTEGER_DIGITS} from '../domain/rational';
/** Voices overlapping in time, including already scheduled tails. Future deal
 * trains retain their beats; the existing 32-node retention limit is a backstop. */
export const EFFECT_VOICE_BUDGET = 16;
export const ACCENT_TAIL_FLOOR = .38;
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
 * Recipe layer rates retain their timbre; recordedCue admits the full 2x range. */
export function chainRate(chain:number):number {
  const c = Math.max(0, Math.min(7, Number.isFinite(chain) ? Math.floor(chain) : 0));
  const rates = [1.0, 1.12, 1.25, 1.35, 1.5, 1.68, 1.88, 2.0];
  return rates[c];
}
