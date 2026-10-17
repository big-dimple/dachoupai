/**
 * PentatonicSynth.ts
 * Real-time Web Audio Synthesizer for Pentatonic (宫商角徵羽) Card Scoring Triggers.
 * 
 * Formal AudioEngine Integration:
 * - Operates strictly via formal AudioEngine public methods (playPentatonicNote, playWarDrum, playTempleBell).
 * - Zero private property hacking, zero unmanaged AudioContexts connected straight to speakers.
 * - Fully governed by master mute, volume sliders, voice budget, compressor/limiter, and presentation cancellation.
 * - Frequency clamped between C4 (261Hz) and E6 (1318Hz).
 */

import { AudioEngine } from '../audio/AudioEngine';

export type PentatonicNoteName = 'gong' | 'shang' | 'jiao' | 'zhi' | 'yu';

export interface PentatonicNote {
  name: PentatonicNoteName;
  hanzi: string;
  baseFreq: number; // Hz (Octave 4)
}

// Traditional Chinese Pentatonic scale in C4
export const PENTATONIC_BASE_SCALE: PentatonicNote[] = [
  { name: 'gong',  hanzi: '宫', baseFreq: 261.63 }, // C4
  { name: 'shang', hanzi: '商', baseFreq: 293.66 }, // D4
  { name: 'jiao',  hanzi: '角', baseFreq: 329.63 }, // E4
  { name: 'zhi',   hanzi: '徵', baseFreq: 392.00 }, // G4
  { name: 'yu',    hanzi: '羽', baseFreq: 440.00 }, // A4
];

// Absolute frequency clamp to avoid piercing high frequencies
const MIN_FREQUENCY = 130.0;
const MAX_FREQUENCY = 1318.51; // E6 (pleasant musical upper bound)

export class PentatonicSynth {
  private engine: AudioEngine;
  private isDisposed: boolean = false;

  constructor(customEngine: AudioEngine = AudioEngine.shared) {
    this.engine = customEngine;
  }

  /**
   * Computes a musically pleasant frequency for a given sequential scoring step.
   * Maps 0..4 -> Octave 4, 5..9 -> Octave 5, 10..14 -> Octave 6, then gracefully loops.
   */
  public getFrequencyForStep(stepIndex: number): number {
    const scaleLen = PENTATONIC_BASE_SCALE.length;
    const noteIdx = Math.abs(stepIndex) % scaleLen;
    // Maximum 3 octave span: 0, 1, or 2 octaves up
    const octave = Math.min(2, Math.floor(Math.abs(stepIndex) / scaleLen));
    
    let freq = PENTATONIC_BASE_SCALE[noteIdx].baseFreq * Math.pow(2, octave);
    // Hard clamp within musical hearing comfort
    if (freq > MAX_FREQUENCY) freq = MAX_FREQUENCY;
    if (freq < MIN_FREQUENCY) freq = MIN_FREQUENCY;
    return freq;
  }

  /**
   * Returns the Hanzi representation for a given step.
   */
  public getHanziForStep(stepIndex: number): string {
    const scaleLen = PENTATONIC_BASE_SCALE.length;
    const noteIdx = Math.abs(stepIndex) % scaleLen;
    return PENTATONIC_BASE_SCALE[noteIdx].hanzi;
  }

  /**
   * Triggers an ascending pentatonic chime for a card scoring step.
   * @param stepIndex 0-based card sequence index (0 to 4+)
   * @param isMultiplier High multiplier or critical card trigger
   * @param speedRatio Fast-forward speed ratio (1.0 = normal, 2.0 = 2x speed)
   */
  public triggerCardScore(stepIndex: number, isMultiplier: boolean = false, speedRatio: number = 1.0): void {
    if (this.isDisposed) return;
    this.engine.playPentatonicNote(stepIndex, { isMultiplier, speedRatio });
  }

  /**
   * Deep Tang Dynasty War Drum Sub-Bass impact for Multipliers (X Mult)
   */
  public triggerWarDrum(speedRatio: number = 1.0): void {
    if (this.isDisposed) return;
    this.engine.playWarDrum({ speedRatio });
  }

  /**
   * Bronze Temple Bell victory chime.
   */
  public triggerVictoryBell(speedRatio: number = 1.0): void {
    if (this.isDisposed) return;
    this.engine.playTempleBell({ speedRatio });
  }

  /**
   * Instantly stops and cancels all currently playing voices.
   */
  public cancelAll(): void {
    this.engine.cancelPresentation();
  }

  /**
   * Complete teardown on scene shutdown.
   */
  public dispose(): void {
    this.isDisposed = true;
    this.cancelAll();
  }
}
