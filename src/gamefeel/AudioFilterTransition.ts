/**
 * AudioFilterTransition.ts
 * Dynamic Low-Pass Filter specifically for the Music Bus Pipeline (Balatro-style).
 * 
 * Strict Audio Pipeline Isolation:
 * - Inserted ONLY into the Music branch:
 *   [Music Sources / Slots] -> [MusicLowPassFilter] -> [Gains.Music] -> [Gains.Master] -> [Destination]
 * - SFX and UI buses completely bypass this filter, keeping scoring chimes, war drums, and clicks crisp!
 * 
 * Multi-layer Modal Stack:
 * - Handles nested dialogs (e.g. entering Shop -> opening Card Detail -> closing Card Detail -> exiting Shop).
 * - Only restores full brightness when all modal layers are popped.
 * - Cancels pending ramps safely to avoid popping on rapid toggles.
 */

import { AudioEngine } from '../audio/AudioEngine';

export class AudioFilterTransition {
  private static instance?: AudioFilterTransition;
  public static get shared(): AudioFilterTransition {
    if (!this.instance) this.instance = new AudioFilterTransition();
    return this.instance;
  }

  private filterNode?: BiquadFilterNode;
  private ctx?: AudioContext;
  private activeStack: Set<string> = new Set();
  private currentFrequency: number = 20000;
  private isWired: boolean = false;

  public static readonly MUFFLE_FREQ = 450;    // Deep, warm indoor/underwater club vibe
  public static readonly BRIGHT_FREQ = 20000;  // Full spectrum clarity

  /**
   * Wires the filter node into the Music bus of the given AudioContext or AudioEngine.
   * Can be inserted between a Music source/submix and gains.music.
   */
  public wireIntoMusicPipeline(ctx: AudioContext, musicInputNode: AudioNode, musicBusGain: GainNode): BiquadFilterNode {
    this.ctx = ctx;
    if (!this.filterNode) {
      this.filterNode = ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(AudioFilterTransition.BRIGHT_FREQ, ctx.currentTime);
      this.filterNode.Q.setValueAtTime(1.0, ctx.currentTime);
      this.currentFrequency = AudioFilterTransition.BRIGHT_FREQ;
    }

    try {
      // Disconnect direct route and insert filter in-between
      musicInputNode.disconnect();
      musicInputNode.connect(this.filterNode);
      this.filterNode.connect(musicBusGain);
      this.isWired = true;
    } catch {
      // Node already connected or graph handled
    }

    return this.filterNode;
  }

  /**
   * Enters muffled mode for a specific UI source (e.g. 'shop', 'card-detail', 'pause-menu').
   * @param sourceId Identifier for this layer in the stack
   * @param durationSeconds Transition time (default 0.35s)
   */
  public enterMuffled(sourceId: string, durationSeconds: number = 0.35): void {
    this.activeStack.add(sourceId);
    this.rampTo(AudioFilterTransition.MUFFLE_FREQ, durationSeconds);
  }

  /**
   * Exits muffled mode for a specific UI source.
   * Only returns to full 20kHz brilliance if all registered sources have exited.
   * @param sourceId Identifier to remove from the stack
   * @param durationSeconds Transition time (default 0.28s)
   */
  public exitMuffled(sourceId: string, durationSeconds: number = 0.28): void {
    this.activeStack.delete(sourceId);
    if (this.activeStack.size === 0) {
      this.rampTo(AudioFilterTransition.BRIGHT_FREQ, durationSeconds);
    }
  }

  /**
   * Clear all active modal layers (e.g. on scene shutdown or hard reset).
   */
  public reset(durationSeconds: number = 0.1): void {
    this.activeStack.clear();
    this.rampTo(AudioFilterTransition.BRIGHT_FREQ, durationSeconds);
  }

  private rampTo(targetFreq: number, duration: number): void {
    if (!this.filterNode || !this.ctx || this.ctx.state === 'closed') {
      this.currentFrequency = targetFreq;
      return;
    }

    const now = this.ctx.currentTime;
    const param = this.filterNode.frequency;

    try {
      // Smoothly cancel pending ramps without audio glitch
      param.cancelScheduledValues(now);
      param.setValueAtTime(Math.max(100, param.value), now);
      param.exponentialRampToValueAtTime(Math.max(100, targetFreq), now + duration);
      this.currentFrequency = targetFreq;
    } catch {
      param.setValueAtTime(targetFreq, now);
      this.currentFrequency = targetFreq;
    }
  }

  public getFilterNode(): BiquadFilterNode | undefined {
    return this.filterNode;
  }

  public getStackDepth(): number {
    return this.activeStack.size;
  }

  public isMuffled(): boolean {
    return this.currentFrequency < 1000;
  }
}
