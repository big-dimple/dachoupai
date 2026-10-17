/**
 * PentatonicSynth.ts
 * Real-time Web Audio Synthesizer for Pentatonic (宫商角徵羽) Card Scoring Triggers.
 * 
 * Integrated into AudioEngine:
 * - Routes strictly through AudioEngine SFX bus (obeys master volume, sfx slider, mute).
 * - Hard frequency ceiling: clamped between 261Hz and 1318Hz (no infinite doubling).
 * - Voice budget: max 6 polyphonic voices with automatic voice-stealing.
 * - Supports fast-forward (compressed decay) and instant cancellation on skip/abort.
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
const MAX_POLYPHONY = 6;

interface ActiveVoice {
  oscillators: OscillatorNode[];
  gainNode: GainNode;
  stopTime: number;
}

export class PentatonicSynth {
  private ctx?: AudioContext;
  private outputNode?: AudioNode;
  private activeVoices: Set<ActiveVoice> = new Set();
  private isDisposed: boolean = false;

  constructor(customContext?: AudioContext, customDestination?: AudioNode) {
    if (customContext) {
      this.ctx = customContext;
      this.outputNode = customDestination ?? customContext.destination;
    }
  }

  /**
   * Lazily resolves or connects to the shared AudioContext and SFX bus.
   */
  private ensureAudioContext(): boolean {
    if (this.isDisposed) return false;
    
    // Check if AudioEngine is muted or sfx volume is 0
    if (AudioEngine.shared.muted || AudioEngine.shared.getVolume('sfx') <= 0) {
      return false;
    }

    if (!this.ctx) {
      // Access AudioContext from AudioEngine private or instantiate shared fallback
      const engineCtx = (AudioEngine.shared as unknown as { context?: AudioContext }).context;
      if (engineCtx && engineCtx.state !== 'closed') {
        this.ctx = engineCtx;
        // Connect to AudioEngine sfx gain bus if available
        const gains = (AudioEngine.shared as unknown as { gains?: { sfx: GainNode } }).gains;
        this.outputNode = gains?.sfx ?? this.ctx.destination;
      } else {
        // Fallback for standalone test harnesses
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtxClass) {
          this.ctx = new AudioCtxClass();
          this.outputNode = this.ctx.destination;
        }
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    return !!this.ctx && !!this.outputNode;
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
   * Triggers an ascending pentatonic chime for a card scoring step.
   * @param stepIndex 0-based card sequence index (0 to 4+)
   * @param isMultiplier High multiplier or critical card trigger
   * @param speedRatio Fast-forward speed ratio (1.0 = normal, 2.0 = 2x speed)
   */
  public triggerCardScore(stepIndex: number, isMultiplier: boolean = false, speedRatio: number = 1.0): void {
    if (!this.ensureAudioContext() || !this.ctx || !this.outputNode) return;

    const now = this.ctx.currentTime;
    const speed = Math.max(0.5, Math.min(5.0, speedRatio));
    const freq = this.getFrequencyForStep(stepIndex);

    // Voice budget management: steal oldest voice if limit exceeded
    if (this.activeVoices.size >= MAX_POLYPHONY) {
      this.stealOldestVoice();
    }

    // 1. Triple Oscillator Setup (Fundamental + Harmonic Shimmer + Ceramic overtone)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc3.type = 'sine';

    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2.008, now); // slight analog detune for shimmer
    osc3.frequency.setValueAtTime(freq * 3.42, now); // bronze bell overtone

    // 2. Bandpass filter for resonant bell-like timbre
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.4, now);
    filter.Q.setValueAtTime(isMultiplier ? 4.5 : 2.5, now);

    // 3. Amplitude Envelope (Snappy attack, musical decay scaled by speed)
    const noteGain = this.ctx.createGain();
    const baseVolume = isMultiplier ? 0.85 : 0.55;
    // Scale volume with AudioEngine SFX level
    const sfxVol = AudioEngine.shared.getVolume('sfx');
    const finalVolume = baseVolume * Math.min(1.0, sfxVol);

    const attackTime = 0.006 / speed;
    const decayDuration = (isMultiplier ? 0.65 : 0.40) / speed;
    const stopTime = now + attackTime + decayDuration;

    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.linearRampToValueAtTime(finalVolume, now + attackTime);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

    // 4. Connect routing graph
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(noteGain);
    osc3.connect(noteGain); // mix overtone subtly
    noteGain.connect(this.outputNode);

    // 5. Track voice for budget & cancellation
    const voice: ActiveVoice = {
      oscillators: [osc1, osc2, osc3],
      gainNode: noteGain,
      stopTime
    };
    this.activeVoices.add(voice);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    osc1.stop(stopTime);
    osc2.stop(stopTime);
    osc3.stop(stopTime);

    // Clean up voice after finish
    window.setTimeout(() => {
      this.activeVoices.delete(voice);
      try {
        noteGain.disconnect();
        filter.disconnect();
      } catch { /* Node already collected */ }
    }, (decayDuration + 0.05) * 1000);
  }

  /**
   * Deep Tang Dynasty War Drum Sub-Bass impact for Multipliers (X Mult)
   */
  public triggerWarDrum(speedRatio: number = 1.0): void {
    if (!this.ensureAudioContext() || !this.ctx || !this.outputNode) return;
    const now = this.ctx.currentTime;
    const speed = Math.max(0.5, Math.min(5.0, speedRatio));

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Heavy pitch drop from 140Hz down to 36Hz
    const duration = 0.65 / speed;
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.22 / speed);

    const sfxVol = AudioEngine.shared.getVolume('sfx');
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.95 * sfxVol, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.outputNode);

    osc.start(now);
    osc.stop(now + duration);

    const voice: ActiveVoice = { oscillators: [osc], gainNode: gain, stopTime: now + duration };
    this.activeVoices.add(voice);
    window.setTimeout(() => {
      this.activeVoices.delete(voice);
      try { gain.disconnect(); } catch { /* ok */ }
    }, duration * 1000);
  }

  private stealOldestVoice(): void {
    let oldest: ActiveVoice | undefined;
    let earliestStop = Infinity;
    for (const v of this.activeVoices) {
      if (v.stopTime < earliestStop) {
        earliestStop = v.stopTime;
        oldest = v;
      }
    }
    if (oldest && this.ctx) {
      const now = this.ctx.currentTime;
      // Fade out in 5ms to avoid click/pop
      oldest.gainNode.gain.cancelScheduledValues(now);
      oldest.gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.005);
      for (const osc of oldest.oscillators) {
        try { osc.stop(now + 0.006); } catch { /* already stopped */ }
      }
      this.activeVoices.delete(oldest);
    }
  }

  /**
   * Instantly stops and cancels all currently playing voices (on fast-skip, scene exit, or clear).
   */
  public cancelAll(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const voice of this.activeVoices) {
      try {
        voice.gainNode.gain.cancelScheduledValues(now);
        voice.gainNode.gain.setValueAtTime(0.0001, now);
        for (const osc of voice.oscillators) {
          osc.stop(now);
          osc.disconnect();
        }
        voice.gainNode.disconnect();
      } catch { /* already cleaned */ }
    }
    this.activeVoices.clear();
  }

  /**
   * Complete teardown on scene shutdown.
   */
  public dispose(): void {
    this.isDisposed = true;
    this.cancelAll();
    this.ctx = undefined;
    this.outputNode = undefined;
  }
}
