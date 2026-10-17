/**
 * ScoringRhythmOrchestrator.ts
 * Unified 4-Phase Scoring Rhythm Orchestrator (起势、连发、爆点、收束).
 * 
 * Synchronizes Visual Springs and Audio Synthesizer on a shared cancellable presentation clock.
 * Explicitly structures musical silences (留白) and high-impact beats (重拍).
 */

import { Spring1D, SpringCardTransform, SPRING_PRESETS } from './SpringMotion';
import { PentatonicSynth } from './PentatonicSynth';
import { HitStopPresentationTimeline } from './HitStopPresentationTimeline';

export interface ScoringCardItem {
  id: string;
  name: string;
  rank: number;
  chips: number;
  isMultiplier?: boolean;
  multValue?: number;
  transform: SpringCardTransform;
}

export interface OrchestrationCallbacks {
  onCardStrike?: (cardIndex: number, card: ScoringCardItem) => void;
  onClimaxBurst?: (cardIndex: number, mult: number) => void;
  onScoreAccumulate?: (addedChips: number, currentTotal: number) => void;
  onResolutionComplete?: (finalScore: number, isVictory: boolean) => void;
  onScreenShake?: (intensity: number) => void;
}

export type ScoringPhase = 'idle' | 'windup' | 'striking' | 'climax' | 'resolution' | 'completed';

export class ScoringRhythmOrchestrator {
  private synth: PentatonicSynth;
  private timeline: HitStopPresentationTimeline;
  private cards: ScoringCardItem[] = [];
  private callbacks: OrchestrationCallbacks;

  // State
  private phase: ScoringPhase = 'idle';
  private phaseTimeMs: number = 0;
  private currentStrikeIdx: number = 0;
  private strikeIntervalMs: number = 160;
  private targetGoalScore: number = 300;
  private currentScore: number = 0;
  private currentMult: number = 1;
  private isVictory: boolean = false;
  private speedRatio: number = 1.0;
  private abortController?: AbortController;

  constructor(callbacks: OrchestrationCallbacks = {}) {
    this.synth = new PentatonicSynth();
    this.timeline = HitStopPresentationTimeline.shared;
    this.callbacks = callbacks;
  }

  /**
   * Begins a coordinated multi-card scoring sequence.
   * @param cards Scoring cards to evaluate sequentially
   * @param goalScore Target threshold to trigger victory bell
   * @param speedRatio Playback speed (1.0 = normal, 2.0 = fast-forward)
   */
  public startScoringSequence(cards: ScoringCardItem[], goalScore: number = 300, speedRatio: number = 1.0): void {
    this.cancel(); // Cancel any running sequence

    this.cards = cards;
    this.targetGoalScore = goalScore;
    this.speedRatio = Math.max(0.5, Math.min(4.0, speedRatio));
    this.currentScore = 0;
    this.currentMult = 1;
    this.currentStrikeIdx = 0;
    this.isVictory = false;
    this.abortController = new AbortController();

    // 1. Phase 1: 起势 (Windup & Anticipation)
    this.phase = 'windup';
    this.phaseTimeMs = 0;

    // Visual: Selected cards lift up into striking focus
    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      card.transform.y.setConfig(SPRING_PRESETS.snappy);
      card.transform.y.setTarget(-18); // Lift 18px towards table center
      card.transform.scaleX.setTarget(1.04);
      card.transform.scaleY.setTarget(1.04);
    }
  }

  /**
   * Advances the orchestrator clock by dtSeconds. Call in scene update().
   * Synchronized with the presentation timeline (pauses automatically during hit-stop).
   */
  public update(dtSeconds: number): void {
    if (this.phase === 'idle' || this.phase === 'completed') return;

    // Advance spring physics on all cards
    for (const card of this.cards) {
      card.transform.step(dtSeconds);
    }

    // Advance presentation clock; returns 0 if hit-stop freeze is active
    const effectiveDeltaMs = this.timeline.update(dtSeconds * 1000) * this.speedRatio;
    if (effectiveDeltaMs <= 0) {
      return; // Frozen by hit-stop; visual & audio progression holds
    }

    this.phaseTimeMs += effectiveDeltaMs;

    switch (this.phase) {
      case 'windup':
        this.updateWindup();
        break;
      case 'striking':
        this.updateStriking();
        break;
      case 'climax':
        this.updateClimax();
        break;
      case 'resolution':
        this.updateResolution();
        break;
    }
  }

  // Phase 1: 起势 (Windup) - 120ms intentional pause for anticipation
  private updateWindup(): void {
    if (this.phaseTimeMs >= 120) {
      this.phase = 'striking';
      this.phaseTimeMs = 0;
      this.currentStrikeIdx = 0;
      this.strikeCard(0);
    }
  }

  // Phase 2: 连发 (Rapid Card Strikes) - Step-by-step ascending pentatonic cadence
  private updateStriking(): void {
    const interval = this.strikeIntervalMs;
    if (this.phaseTimeMs >= interval) {
      this.phaseTimeMs -= interval;
      this.currentStrikeIdx++;

      if (this.currentStrikeIdx < this.cards.length) {
        this.strikeCard(this.currentStrikeIdx);
      } else {
        // All primary cards scored; transition to Phase 3: 爆点
        this.phase = 'climax';
        this.phaseTimeMs = 0;
        this.triggerClimax();
      }
    }
  }

  private strikeCard(idx: number): void {
    const card = this.cards[idx];
    if (!card) return;

    // Visual: Sharp spring pop forward
    card.transform.y.setTarget(-32); // Jump forward
    card.transform.scaleX.setTarget(1.12);
    card.transform.scaleY.setTarget(1.12);

    // Audio: Musical pentatonic chime (宫商角徵羽)
    this.synth.triggerCardScore(idx, false, this.speedRatio);

    // Score accumulation
    this.currentScore += card.chips;
    this.callbacks.onCardStrike?.(idx, card);
    this.callbacks.onScoreAccumulate?.(card.chips, this.currentScore * this.currentMult);

    // Gentle settle back to focus row after 80ms
    window.setTimeout(() => {
      if (this.phase !== 'idle' && this.phase !== 'completed') {
        card.transform.y.setTarget(-14);
        card.transform.scaleX.setTarget(1.03);
        card.transform.scaleY.setTarget(1.03);
      }
    }, 80 / this.speedRatio);
  }

  // Phase 3: 爆点 (Climax) - Heavy Beat with 50ms Hit-Stop Micro-freeze
  private triggerClimax(): void {
    // Find multiplier card or synthesize high multiplier burst
    const multCard = this.cards.find(c => c.isMultiplier) ?? this.cards[this.cards.length - 1];
    const multVal = multCard?.multValue ?? 2;
    this.currentMult = multVal;

    // 1. Heavy Beat: Trigger 50ms Hit-Stop Micro-freeze on the presentation clock
    this.timeline.triggerHitStop({
      durationMs: 50 / this.speedRatio,
      signal: this.abortController?.signal,
      onFreezeStart: () => {
        // Freeze frame visually: card leaps forward, glows
        if (multCard) {
          multCard.transform.y.setConfig(SPRING_PRESETS.bouncy);
          multCard.transform.y.setTarget(-45);
          multCard.transform.scaleX.setTarget(1.25);
          multCard.transform.scaleY.setTarget(1.25);
        }
      },
      onFreezeEnd: () => {
        // Unfreeze: Audio explosion (Tang Dynasty War Drum Sub-Bass)
        this.synth.triggerWarDrum(this.speedRatio);
        // Visual Punch: Camera shake & explosive score expansion
        this.callbacks.onScreenShake?.(1.0);
        this.callbacks.onClimaxBurst?.(this.cards.indexOf(multCard), multVal);
        this.callbacks.onScoreAccumulate?.(0, this.currentScore * this.currentMult);
      }
    });
  }

  private updateClimax(): void {
    // Hold climax impact for 380ms before resolution
    if (this.phaseTimeMs >= 380) {
      this.phase = 'resolution';
      this.phaseTimeMs = 0;
      this.resolveTotalScore();
    }
  }

  // Phase 4: 收束 (Resolution & Victory Bell)
  private resolveTotalScore(): void {
    const finalScore = this.currentScore * this.currentMult;
    this.isVictory = finalScore >= this.targetGoalScore;

    // Settle all cards back to baseline table plane
    for (const card of this.cards) {
      card.transform.y.setConfig(SPRING_PRESETS.gentle);
      card.transform.y.setTarget(0);
      card.transform.scaleX.setTarget(1.0);
      card.transform.scaleY.setTarget(1.0);
    }

    if (this.isVictory) {
      // Bell victory resonance (Chime overtones)
      this.synth.triggerCardScore(4, true, this.speedRatio);
    }

    this.callbacks.onResolutionComplete?.(finalScore, this.isVictory);
  }

  private updateResolution(): void {
    // 500ms post-victory breathing space (留白)
    if (this.phaseTimeMs >= 500) {
      this.phase = 'completed';
    }
  }

  /**
   * Cancels the active sequence immediately (e.g. fast-skip button or exit).
   */
  public cancel(): void {
    this.abortController?.abort();
    this.timeline.cancelHitStop();
    this.synth.cancelAll();
    this.phase = 'idle';
  }

  public getPhase(): ScoringPhase {
    return this.phase;
  }

  public getCurrentScore(): number {
    return this.currentScore * this.currentMult;
  }

  public isComplete(): boolean {
    return this.phase === 'completed';
  }
}
