/**
 * ScoringRhythmOrchestrator.ts
 * Unified 4-Phase Scoring Rhythm Orchestrator (起势、连发、爆点、收束).
 * 
 * Strict Domain & Presentation Decoupling:
 * - Strictly consumes authentic ScoreTrace.events in their exact original order.
 * - Categorizes events to determine rhythm and animation intensity WITHOUT reordering.
 * - NEVER computes scores itself, never invents ×2 defaults, never assumes victory.
 * - Preserves Rational precision: decimal numbers like 1.5 are preserved, never floored.
 * - Drives visual spring physics and audio chimes using a shared presentation clock delta.
 * - Freezes physics during Hit-Stop, accelerates physics during fast-forward (1x..4x).
 * - Instant cancellation cleanly restores visual poses with zero orphaned callbacks.
 */

import { ScoreTrace, ScoreEvent } from '../domain/scoreR2';
import { Rational } from '../domain/rational';
import { SpringCardTransform, SPRING_PRESETS } from './SpringMotion';
import { PentatonicSynth } from './PentatonicSynth';
import { HitStopPresentationTimeline } from './HitStopPresentationTimeline';

export interface ScoringCardItem {
  id: string;
  name?: string;
  rank?: number;
  transform: SpringCardTransform;
}

export interface OrchestrationCallbacks {
  onCardStrike?: (cardIndex: number, card: ScoringCardItem, event: ScoreEvent) => void;
  onClimaxBurst?: (event: ScoreEvent, mult: string) => void;
  onScoreAccumulate?: (heat: string, mult: string, total: string) => void;
  onResolutionComplete?: (finalScore: string, isVictory: boolean) => void;
  onScreenShake?: (intensity: number) => void;
  onPhaseChange?: (phase: ScoringPhase) => void;
  onEventProcessed?: (eventIndex: number, event: ScoreEvent) => void;
}

export type ScoringPhase = 'idle' | 'windup' | 'striking' | 'climax' | 'resolution' | 'completed';

export interface ScoringSequenceOptions {
  speedRatio?: number;
  goalScore?: string;
  isStageCleared?: boolean;
}

/**
 * Formats a Fraction or Rational object to decimal string without losing precision.
 * e.g. 3/2 -> "1.5", 2/1 -> "2", 704/1 -> "704".
 */
export function formatRational(value: unknown): string {
  if (!value || typeof value !== 'object') return '0';
  try {
    const r = value instanceof Rational ? value : Rational.fromJSON(value);
    if (r.d === 1n) return r.n.toString();
    const num = Number(r.n) / Number(r.d);
    if (Number.isFinite(num)) {
      const rounded = Math.round(num * 100) / 100;
      return rounded.toString();
    }
    return `${r.n}/${r.d}`;
  } catch {
    return '0';
  }
}

export class ScoringRhythmOrchestrator {
  private synth: PentatonicSynth;
  private timeline: HitStopPresentationTimeline;
  private cards: ScoringCardItem[] = [];
  private callbacks: OrchestrationCallbacks;

  // Domain score data strictly preserved in original order
  private trace?: ScoreTrace;
  private events: ScoreEvent[] = [];
  private currentEventIndex: number = 0;
  private cardStrikeCount: number = 0;
  private currentEventDurationMs: number = 150;

  // State
  private phase: ScoringPhase = 'idle';
  private phaseTimeMs: number = 0;
  private speedRatio: number = 1.0;
  private goalScore?: string;
  private isStageCleared?: boolean;
  private sequenceGeneration: number = 0;
  private abortController?: AbortController;

  // Striking sub-state for settling
  private settlingCard?: ScoringCardItem;
  private settleTimerMs: number = 0;

  constructor(callbacks: OrchestrationCallbacks = {}, customSynth?: PentatonicSynth) {
    this.synth = customSynth ?? new PentatonicSynth();
    this.timeline = HitStopPresentationTimeline.shared;
    this.callbacks = callbacks;
  }

  /**
   * Begins a coordinated scoring sequence by strictly consuming an existing ScoreTrace in its exact event order.
   */
  public startScoringSequence(
    cards: ScoringCardItem[],
    trace: ScoreTrace,
    options: ScoringSequenceOptions = {}
  ): void {
    this.cancel(); // Cancel any prior sequence and reset state

    this.sequenceGeneration++;

    this.cards = cards;
    this.trace = trace;
    this.events = trace.events; // Strictly retain exact original order!
    this.speedRatio = Math.max(0.5, Math.min(4.0, options.speedRatio ?? 1.0));
    this.goalScore = options.goalScore;
    this.isStageCleared = options.isStageCleared;
    this.abortController = new AbortController();

    this.currentEventIndex = 0;
    this.cardStrikeCount = 0;
    this.currentEventDurationMs = 150;
    this.settlingCard = undefined;
    this.settleTimerMs = 0;

    // Phase 1: 起势 (Windup & Anticipation)
    this.setPhase('windup');
    this.phaseTimeMs = 0;

    // Visual: Selected scoring cards lift up into striking focus
    for (const card of this.cards) {
      card.transform.y.setConfig(SPRING_PRESETS.snappy);
      card.transform.y.setTarget(-18);
      card.transform.scaleX.setTarget(1.04);
      card.transform.scaleY.setTarget(1.04);
    }

    // Initial base accumulator display strictly from initial event before
    const baseEvent = trace.events[0];
    if (baseEvent) {
      const hStr = formatRational(baseEvent.before.H);
      const mStr = formatRational(baseEvent.before.M);
      const prodStr = Rational.fromJSON(baseEvent.before.H).multiply(Rational.fromJSON(baseEvent.before.M)).floor().toString();
      this.callbacks.onScoreAccumulate?.(hStr, mStr, prodStr);
    }
  }

  /**
   * Advances the orchestrator clock by dtSeconds. Call in scene update().
   * Synchronized with the presentation timeline (freezes during hit-stop, scales with speedRatio).
   */
  public update(dtSeconds: number): void {
    if (this.phase === 'idle' || this.phase === 'completed') return;

    // Advance timeline clock; returns 0 if hit-stop freeze is active
    const effectiveDeltaMs = this.timeline.update(dtSeconds * 1000);
    const effectiveDtSeconds = (effectiveDeltaMs / 1000) * this.speedRatio;

    // Advance spring physics on all cards strictly with effective delta!
    // When effectiveDtSeconds is 0 (during hit-stop freeze), springs hold completely still.
    for (const card of this.cards) {
      card.transform.step(effectiveDtSeconds);
    }

    if (effectiveDeltaMs <= 0) {
      return; // Frozen by hit-stop; progression paused
    }

    const scaledDeltaMs = effectiveDeltaMs * this.speedRatio;
    this.phaseTimeMs += scaledDeltaMs;

    // Handle card settle timer without unmanaged window.setTimeout
    if (this.settlingCard) {
      this.settleTimerMs += scaledDeltaMs;
      if (this.settleTimerMs >= 80) {
        this.settlingCard.transform.y.setTarget(-14);
        this.settlingCard.transform.scaleX.setTarget(1.03);
        this.settlingCard.transform.scaleY.setTarget(1.03);
        this.settlingCard = undefined;
        this.settleTimerMs = 0;
      }
    }

    switch (this.phase) {
      case 'windup':
        this.updateWindup();
        break;
      case 'striking':
      case 'climax':
        this.updateEventProgression();
        break;
      case 'resolution':
        this.updateResolution();
        break;
    }
  }

  // Phase 1: 起势 (Windup) - 120ms intentional pause for anticipation
  private updateWindup(): void {
    if (this.phaseTimeMs >= 120) {
      this.phaseTimeMs = 0;
      this.currentEventIndex = 0;
      if (this.events.length > 0) {
        this.processCurrentEvent();
      } else {
        this.resolveTotalScore();
      }
    }
  }

  // Phase 2: Sequential Event Progression strictly in ScoreTrace order
  private updateEventProgression(): void {
    if (this.phaseTimeMs >= this.currentEventDurationMs) {
      this.phaseTimeMs -= this.currentEventDurationMs;
      this.currentEventIndex++;
      if (this.currentEventIndex < this.events.length) {
        this.processCurrentEvent();
      } else {
        this.resolveTotalScore();
      }
    }
  }

  private processCurrentEvent(): void {
    const event = this.events[this.currentEventIndex];
    if (!event) {
      this.resolveTotalScore();
      return;
    }

    const currentGen = this.sequenceGeneration;
    const MULTIPLY_OPS = ['multiply-multiplier', 'multiply-coefficient', 'route-factor', 'rescue-multiplier'];
    const isMultiplier = MULTIPLY_OPS.includes(event.operation);

    if (isMultiplier) {
      // Climax multiplier hit: 50ms Hit-Stop micro-freeze + war drum
      this.setPhase('climax');
      this.currentEventDurationMs = 320;

      let targetCard = this.cards.find(c => c.id === event.targetCardId);
      if (!targetCard) {
        targetCard = this.cards[this.cards.length - 1];
      }

      this.timeline.triggerHitStop({
        durationMs: 50 / this.speedRatio,
        signal: this.abortController?.signal,
        onFreezeStart: () => {
          if (currentGen !== this.sequenceGeneration) return;
          if (targetCard) {
            targetCard.transform.y.setConfig(SPRING_PRESETS.bouncy);
            targetCard.transform.y.setTarget(-45);
            targetCard.transform.scaleX.setTarget(1.25);
            targetCard.transform.scaleY.setTarget(1.25);
          }
        },
        onFreezeEnd: () => {
          if (currentGen !== this.sequenceGeneration) return;
          this.synth.triggerWarDrum(this.speedRatio);
          this.callbacks.onScreenShake?.(1.0);
          this.callbacks.onClimaxBurst?.(event, formatRational(event.after.M));
        }
      });
    } else if (event.sourceType === 'card') {
      // Regular card strike: pentatonic ascending chime
      this.setPhase('striking');
      this.currentEventDurationMs = 160;

      let card = this.cards.find(c => c.id === event.targetCardId);
      if (!card) {
        card = this.cards[this.cardStrikeCount % this.cards.length];
      }

      if (card) {
        card.transform.y.setTarget(-32); // Pop forward
        card.transform.scaleX.setTarget(1.12);
        card.transform.scaleY.setTarget(1.12);
        this.settlingCard = card;
        this.settleTimerMs = 0;
      }

      this.synth.triggerCardScore(this.cardStrikeCount, false, this.speedRatio);
      if (card) {
        this.callbacks.onCardStrike?.(this.cardStrikeCount, card, event);
      }
      this.cardStrikeCount++;
    } else if (event.sourceType === 'character') {
      // Hero skill payoff
      this.setPhase('striking');
      this.currentEventDurationMs = 220;
      this.synth.triggerCardScore(this.cardStrikeCount, false, this.speedRatio);
      const leadCard = this.cards[0];
      if (leadCard) {
        leadCard.transform.y.setTarget(-28);
        leadCard.transform.scaleX.setTarget(1.08);
        leadCard.transform.scaleY.setTarget(1.08);
        this.settlingCard = leadCard;
        this.settleTimerMs = 0;
      }
    } else if (event.sourceType === 'joker') {
      // TangSong card Joker additive
      this.setPhase('striking');
      this.currentEventDurationMs = 180;
      this.synth.triggerCardScore(this.cardStrikeCount, false, this.speedRatio);
    } else {
      this.setPhase('striking');
      this.currentEventDurationMs = 140;
    }

    // Read score values strictly from domain event.after preserving decimal precision!
    const hStr = formatRational(event.after.H);
    const mStr = formatRational(event.after.M);
    const totalStr = Rational.fromJSON(event.after.H).multiply(Rational.fromJSON(event.after.M)).floor().toString();

    this.callbacks.onScoreAccumulate?.(hStr, mStr, totalStr);
    this.callbacks.onEventProcessed?.(this.currentEventIndex, event);
  }

  // Phase 4: 收束 (Resolution & Result)
  private resolveTotalScore(): void {
    if (!this.trace) return;

    this.setPhase('resolution');
    this.phaseTimeMs = 0;

    const finalScoreStr = this.trace.finalScore;

    // Victory check: only declare victory if explicitly cleared or goal reached
    let isVictory = false;
    if (this.isStageCleared !== undefined) {
      isVictory = this.isStageCleared;
    } else if (this.goalScore !== undefined) {
      try {
        isVictory = BigInt(finalScoreStr) >= BigInt(this.goalScore);
      } catch {
        isVictory = false;
      }
    }

    // Settle all cards back to baseline table plane
    for (const card of this.cards) {
      card.transform.y.setConfig(SPRING_PRESETS.gentle);
      card.transform.y.setTarget(0);
      card.transform.scaleX.setTarget(1.0);
      card.transform.scaleY.setTarget(1.0);
    }

    // Only play temple victory bell if genuine victory achieved
    if (isVictory) {
      this.synth.triggerVictoryBell(this.speedRatio);
    }

    this.callbacks.onResolutionComplete?.(finalScoreStr, isVictory);
  }

  private updateResolution(): void {
    // 350ms post-resolution breathing space (留白)
    if (this.phaseTimeMs >= 350) {
      this.setPhase('completed');
    }
  }

  private setPhase(newPhase: ScoringPhase): void {
    this.phase = newPhase;
    this.callbacks.onPhaseChange?.(newPhase);
  }

  /**
   * Cancels the active sequence immediately and completely resets all card visual transforms.
   */
  public cancel(): void {
    this.sequenceGeneration++;
    this.abortController?.abort();
    this.timeline.cancelHitStop();
    this.synth.cancelAll();

    // Restore all card visual poses to baseline
    for (const card of this.cards) {
      card.transform.reset(0, 0, 1.0, 0);
    }

    this.settlingCard = undefined;
    this.settleTimerMs = 0;
    this.setPhase('idle');
  }

  public getPhase(): ScoringPhase {
    return this.phase;
  }

  public isComplete(): boolean {
    return this.phase === 'completed';
  }

  public getTrace(): ScoreTrace | undefined {
    return this.trace;
  }
}
