import type {FoleyKind} from './foley';
/** Voices overlapping in time, including already scheduled tails. Future deal
 * trains retain their beats; the existing 32-node retention limit is a backstop. */
export const EFFECT_VOICE_BUDGET = 16;
export const ACCENT_TAIL_FLOOR = .38;
/** Only called at the committed final award. Never infer an amount from tier,
 * accumulated heat, a target, or provisional multiplication. */
export function awardForScore(presentation:object):FoleyKind {
  const score=(presentation as {score?:{finalScore?:unknown}}).score?.finalScore;
  if(typeof score!=='string'||!/^\d{1,309}$/.test(score))return 'award';
  const digits=score.replace(/^0+/, '').length;
  return digits>=13?'awardTrillion':digits>=9?'awardHundredMillion':digits>=7?'awardMillion':'award';
}
/** Gentle bounded brightening, then a plateau; no stochastic/gameplay RNG. */
export function chainRate(chain:number):number {
  return 1+Math.max(0,Math.min(4,Number.isFinite(chain)?chain:0))*.025;
}
