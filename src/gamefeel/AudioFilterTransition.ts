/**
 * AudioFilterTransition.ts
 * Dynamic Low-Pass Audio Filter for Seamless Scene Mood Transitions (Balatro-style).
 * 
 * Instead of abruptly stopping or hard-crossfading background music:
 * - Entering Shop / Pause: smoothly ramps low-pass cutoff down from 20,000Hz to 450Hz (muffled underwater club vibe).
 * - Returning to Play: smoothly opens cutoff back to 20,000Hz.
 */

export class AudioFilterTransition {
  private filterNode: BiquadFilterNode;
  private ctx: AudioContext;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(20000, ctx.currentTime);
    this.filterNode.Q.setValueAtTime(1.0, ctx.currentTime);
  }

  public getNode(): BiquadFilterNode {
    return this.filterNode;
  }

  /**
   * Muffles the audio track (Shop / Inventory / Inspection mode).
   * @param duration Transition time in seconds (e.g. 0.4s)
   * @param targetFreq Target cutoff frequency in Hz (e.g. 420Hz)
   */
  public muffle(duration: number = 0.4, targetFreq: number = 420): void {
    const now = this.ctx.currentTime;
    this.filterNode.frequency.cancelScheduledValues(now);
    this.filterNode.frequency.setValueAtTime(this.filterNode.frequency.value, now);
    this.filterNode.frequency.exponentialRampToValueAtTime(targetFreq, now + duration);
  }

  /**
   * Restores full brilliance and clarity (Battle / Main play mode).
   * @param duration Transition time in seconds (e.g. 0.3s)
   */
  public unmuffle(duration: number = 0.3): void {
    const now = this.ctx.currentTime;
    this.filterNode.frequency.cancelScheduledValues(now);
    this.filterNode.frequency.setValueAtTime(Math.max(this.filterNode.frequency.value, 100), now);
    this.filterNode.frequency.exponentialRampToValueAtTime(20000, now + duration);
  }
}
