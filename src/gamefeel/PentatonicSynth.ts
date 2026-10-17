/**
 * PentatonicSynth.ts
 * Real-time Web Audio API Synthesizer for Pentatonic (宫商角徵羽) Card Scoring Triggers.
 * 
 * Generates resonant Chinese chime/plucked string tones on the fly.
 * Eliminates network latency, audio sample loading failures, and repetitive sample fatigue.
 * 
 * Supports musical pitch stepping: as cards score from 1 to N, pitch ascends harmonically.
 */

export type PentatonicNoteName = 'gong' | 'shang' | 'jiao' | 'zhi' | 'yu';

export interface PentatonicNote {
  name: PentatonicNoteName;
  hanzi: string;
  frequency: number; // Hz (Base Octave 4/5)
}

// Traditional Chinese Pentatonic scale frequencies in C / D
export const PENTATONIC_SCALE: PentatonicNote[] = [
  { name: 'gong',  hanzi: '宫', frequency: 523.25 }, // C5
  { name: 'shang', hanzi: '商', frequency: 587.33 }, // D5
  { name: 'jiao',  hanzi: '角', frequency: 659.25 }, // E5
  { name: 'zhi',   hanzi: '徵', frequency: 783.99 }, // G5
  { name: 'yu',    hanzi: '羽', frequency: 880.00 }, // A5
];

export class PentatonicSynth {
  private ctx: AudioContext;
  private masterGain: GainNode;

  constructor(audioContext?: AudioContext) {
    this.ctx = audioContext ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.ctx.destination);
  }

  /**
   * Triggers a musical pentatonic chime for a card scoring index.
   * @param stepIndex The 0-based card index in the current scoring hand (0 to 4+)
   * @param isMultiplier Whether this trigger is a high-value multiplier (amplifies resonance)
   */
  public triggerCardScore(stepIndex: number, isMultiplier: boolean = false): void {
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const noteCount = PENTATONIC_SCALE.length;
    // Ascend through the scale; wrap to next octave after 5 cards
    const octaveShift = Math.floor(stepIndex / noteCount);
    const scaleIndex = stepIndex % noteCount;
    const baseFreq = PENTATONIC_SCALE[scaleIndex].frequency;
    const freq = baseFreq * Math.pow(2, octaveShift);

    // 1. Dual oscillator for bell/chime metallic richness
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const osc3 = this.ctx.createOscillator(); // harmonic overtone

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc3.type = 'sine';

    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2.01, now); // slight detune for shimmer
    osc3.frequency.setValueAtTime(freq * 3.42, now); // non-harmonic bell ratio

    // 2. High-pass & low-pass shaping filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, now);
    filter.Q.setValueAtTime(isMultiplier ? 4.0 : 2.5, now);

    // 3. Amplitude Envelope (Snappy attack, musical exponential decay)
    const noteGain = this.ctx.createGain();
    const peakVolume = isMultiplier ? 0.9 : 0.6;
    const decayDuration = isMultiplier ? 0.75 : 0.45;

    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.linearRampToValueAtTime(peakVolume, now + 0.008); // 8ms instant strike
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + decayDuration);

    // Connect audio routing graph
    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(noteGain); // mix overtones directly
    filter.connect(noteGain);
    noteGain.connect(this.masterGain);

    // Schedule stop and cleanup
    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + decayDuration);
    osc2.stop(now + decayDuration);
    osc3.stop(now + decayDuration);
  }

  /**
   * Deep Tang Dynasty War Drum Sub-Bass impact for Multipliers (X Mult)
   */
  public triggerWarDrum(): void {
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Pitch drop from 140Hz down to 36Hz (heavy sub-bass thud)
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.25);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(1.0, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.65);
  }
}
