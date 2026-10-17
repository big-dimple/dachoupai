/**
 * ScoringRhythmOrchestrator.ts
 * Unified 4-Phase Scoring Rhythm Orchestrator (起势、连发、爆点、收束).
 * 
 * Strict Domain & Presentation Decoupling:
 * - Strictly consumes domain ScoreTrace and final results.
 * - NEVER computes scores itself, never invents ×2 defaults, never assumes victory.
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
}

export type ScoringPhase = 'idle' | 'windup' | 'striking' | 'climax' | 'resolution' | 'completed';

export interface ScoringSequenceOptions {
  speedRatio?: number;
  goalScore?: string;
  isStageCleared?: boolean;
}

export class ScoringRhythmOrchestrator {
  private synth: PentatonicSynth;
  private timeline: HitStopPresentationTimeline;
  private cards: ScoringCardItem[] = [];
  private callbacks: OrchestrationCallbacks;

  // Domain score data
  private trace?: ScoreTrace;
  private cardEvents: ScoreEvent[] = [];
  private multEvents: ScoreEvent[] = [];
  private currentEventIndex: number = 0;
  private currentMultEventIndex: number = 0;
  private currentCardIndex: number = 0;

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
   * Begins a coordinated scoring sequence by strictly consuming an existing ScoreTrace.
   */
  public startScoringSequence(
    cards: ScoringCardItem[],
    trace: ScoreTrace,
    options: ScoringSequenceOptions = {}
  ): void {
    this.cancel(); // Cancel any prior sequence and reset state

    this.sequenceGeneration++;
    const currentGen = this.sequenceGeneration;

    this.cards = cards;
    this.trace = trace;
    this.speedRatio = Math.max(0.5, Math.min(4.0, options.speedRatio ?? 1.0));
    this.goalScore = options.goalScore;
    this.isStageCleared = options.isStageCleared;
    this.abortController = new AbortController();

    // Extract real card scoring events and multiplier events from trace
    this.cardEvents = trace.events.filter(e => e.sourceType === 'card' && e.phase === 'onCardScore');
    // If no phase === 'onCardScore' filter matched, fallback to all card events
    if (this.cardEvents.length === 0) {
      this.cardEvents = trace.events.filter(e => e.sourceType === 'card');
    }

    // Climax multiplier events: only genuine multiply operations
    const MULTIPLY_OPS = ['multiply-multiplier', 'multiply-coefficient', 'route-factor', 'rescue-multiplier'];
    this.multEvents = trace.events.filter(e => MULTIPLY_OPS.includes(e.operation));

    this.currentEventIndex = 0;
    this.currentCardIndex = 0;
    this.currentMultEventIndex = 0;
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

    // Initial base accumulator display
    const baseEvent = trace.events[0];
    if (baseEvent) {
      const hStr = Rational.fromJSON(baseEvent.after.H).floor().toString();
      const mStr = Rational.fromJSON(baseEvent.after.M).floor().toString();
      const prodStr = Rational.fromJSON(baseEvent.after.H).multiply(Rational.fromJSON(baseEvent.after.M)).floor().toString();
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
      this.setPhase('striking');
      this.phaseTimeMs = 0;
      this.currentCardIndex = 0;
      if (this.cardEvents.length > 0) {
        this.strikeCard(0);
      } else {
        // No card strike events; transition directly
        this.transitionToClimaxOrResolution();
      }
    }
  }

  // Phase 2: 连发 (Rapid Card Strikes) - Step-by-step ascending pentatonic cadence
  private updateStriking(): void {
    const strikeInterval = 160;
    if (this.phaseTimeMs >= strikeInterval) {
      this.phaseTimeMs -= strikeInterval;
      this.currentCardIndex++;

      if (this.currentCardIndex < this.cardEvents.length) {
        this.strikeCard(this.currentCardIndex);
      } else {
        // All card strikes completed; move to Phase 3: 爆点 or Phase 4: 收束
        this.transitionToClimaxOrResolution();
      }
    }
  }

  private strikeCard(idx: number): void {
    const event = this.cardEvents[idx];
    if (!event) return;

    // Find corresponding card transform
    let card = this.cards.find(c => c.id === event.targetCardId);
    if (!card) {
      card = this.cards[idx] ?? this.cards[0];
    }

    if (card) {
      card.transform.y.setTarget(-32); // Pop forward
      card.transform.scaleX.setTarget(1.12);
      card.transform.scaleY.setTarget(1.12);
      this.settlingCard = card;
      this.settleTimerMs = 0;
    }

    // Audio: Pentatonic chime note
    this.synth.triggerCardScore(idx, false, this.speedRatio);

    // Read score values strictly from domain event.after
    const hStr = Rational.fromJSON(event.after.H).floor().toString();
    const mStr = Rational.fromJSON(event.after.M).floor().toString();
    const totalStr = Rational.fromJSON(event.after.H).multiply(Rational.fromJSON(event.after.M)).floor().toString();

    if (card) {
      this.callbacks.onCardStrike?.(idx, card, event);
    }
    this.callbacks.onScoreAccumulate?.(hStr, mStr, totalStr);
  }

  private transitionToClimaxOrResolution(): void {
    if (this.multEvents.length > 0) {
      this.setPhase('climax');
      this.phaseTimeMs = 0;
      this.currentMultEventIndex = 0;
      this.triggerClimaxEvent(0);
    } else {
      // No multiplier events in this hand: smoothly transition to Phase 4 without fake mult
      this.setPhase('resolution');
      this.phaseTimeMs = 0;
      this.resolveTotalScore();
    }
  }

  // Phase 3: 爆点 (Climax) - Heavy Beat with 50ms Hit-Stop Micro-freeze for real mult events
  private triggerClimaxEvent(idx: number): void {
    const event = this.multEvents[idx];
    if (!event) {
      this.setPhase('resolution');
      this.phaseTimeMs = 0;
      this.resolveTotalScore();
      return;
    }

    const currentGen = this.sequenceGeneration;
    const multCard = this.cards.find(c => c.id === event.targetCardId) ?? this.cards[this.cards.length - 1];

    // Trigger 50ms Hit-Stop micro-freeze on the presentation clock
    this.timeline.triggerHitStop({
      durationMs: 50 / this.speedRatio,
      signal: this.abortController?.signal,
      onFreezeStart: () => {
        if (currentGen !== this.sequenceGeneration) return;
        if (multCard) {
          multCard.transform.y.setConfig(SPRING_PRESETS.bouncy);
          multCard.transform.y.setTarget(-45);
          multCard.transform.scaleX.setTarget(1.25);
          multCard.transform.scaleY.setTarget(1.25);
        }
      },
      onFreezeEnd: () => {
        if (currentGen !== this.sequenceGeneration) return;
        // Unfreeze: Audio explosion (Tang Dynasty War Drum Sub-Bass)
        this.synth.triggerWarDrum(this.speedRatio);
        this.callbacks.onScreenShake?.(1.0);

        // Update score strictly from event.after
        const hStr = Rational.fromJSON(event.after.H).floor().toString();
        const mStr = Rational.fromJSON(event.after.M).floor().toString();
        const totalStr = Rational.fromJSON(event.after.H).multiply(Rational.fromJSON(event.after.M)).floor().toString();

        this.callbacks.onClimaxBurst?.(event, mStr);
        this.callbacks.onScoreAccumulate?.(hStr, mStr, totalStr);
      }
    });
  }

  private updateClimax(): void {
    // Hold climax impact for 360ms before next mult or resolution
    if (this.phaseTimeMs >= 360) {
      this.phaseTimeMs = 0;
      this.currentMultEventIndex++;
      if (this.currentMultEventIndex < this.multEvents.length) {
        this.triggerClimaxEvent(this.currentMultEventIndex);
      } else {
        this.setPhase('resolution');
        this.resolveTotalScore();
      }
    }
  }

  // Phase 4: 收束 (Resolution & Result)
  private resolveTotalScore(): void {
    if (!this.trace) return;

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
    // 400ms post-resolution breathing space (留白)
    if (this.phaseTimeMs >= 400) {
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
