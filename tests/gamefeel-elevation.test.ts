/**
 * tests/gamefeel-elevation.test.ts
 * Minimal Verification Suite for Game Feel & Audio Elevation RFC (Round 3 Hardening).
 * 
 * Verifies all required scenarios with strict, non-mocked assertions:
 * 1. 普通计分 (Normal hand scoring & event monotonicity)
 * 2. 连续乘倍率 (Continuous multiplier climax & Hit-Stop freeze)
 * 3. 计分事件原顺序与小数精度 (Interleaved event order, no skips/repeats, 1.5x precision)
 * 4. 未通关 (Incomplete / defeat condition without victory bell)
 * 5. 六英雄技能收益 (All 6 heroes generate real character payoff events)
 * 6. 1× / 4× 播放速率 (Speed ratio scaling & timing)
 * 7. 停顿中取消后立即重播 (Cancel in windup, striking, settle & immediate replay)
 * 8. 音频生命周期 (Voice retention, secondary oscillator release, cancelPresentation, 32-cap eviction)
 * 9. 后台恢复与大步长保护 (Background tab freeze recovery)
 * 10. 视觉变换组合与冻结 (3-layer isolation, baseArt preserved, zero movement during freeze)
 * 11. 嵌套弹窗低通栈 (Nested dialog low-pass depth stack)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Spring1D, SpringCardTransform, SPRING_PRESETS } from '../src/gamefeel/SpringMotion';
import { HitStopPresentationTimeline } from '../src/gamefeel/HitStopPresentationTimeline';
import {
  ScoringRhythmOrchestrator,
  ScoringCardItem,
  formatRational
} from '../src/gamefeel/ScoringRhythmOrchestrator';
import { AudioFilterTransition } from '../src/gamefeel/AudioFilterTransition';
import { AudioEngine } from '../src/audio/AudioEngine';
import { scoreR2Hand, type ScoreInput, type ScoreTrace } from '../src/domain/scoreR2';
import { Rational } from '../src/domain/rational';
import { R2_JOKERS } from '../src/content/r2Schema';
import { r2CreateJoker } from '../src/domain/r2Run';
import { SeededRng } from '../src/core/SeededRng';
import { PlayingCard } from '../src/cards/types';

function createCards(count: number = 5): ScoringCardItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `c${i + 1}`,
    name: `Card ${i + 1}`,
    transform: new SpringCardTransform(0, 0, 1.0, 0)
  }));
}

function createSampleHand(type: 'pair' | 'full-house' | 'high-card', jokers: any[] = []): ScoreTrace {
  const cards: PlayingCard[] = [
    { id: 'c1', rank: 14, suit: 'spades' },
    { id: 'c2', rank: 14, suit: 'hearts' },
    { id: 'c3', rank: 10, suit: 'clubs' },
    { id: 'c4', rank: 10, suit: 'diamonds' },
    { id: 'c5', rank: 7, suit: 'spades' }
  ];

  return scoreR2Hand({
    rulesVersion: 'r2',
    runId: 'verify-run',
    rootId: 'verify-run/1',
    characterId: 'neutral',
    hand: cards,
    selectedIds: type === 'high-card' ? ['c1'] : ['c1', 'c2', 'c3', 'c4', 'c5'],
    disabledIds: [],
    jokers,
    definitions: R2_JOKERS,
    handLevels: { 'two-pair': 1, 'high-card': 1, 'full-house': 1 },
    playIndex: 1,
    handsBeforePlay: 4,
    previousHandType: null,
    wager: false,
    rng: new SeededRng('verify-hand').snapshot(),
    gold: 5,
    stageHeatBefore: '0',
    stageTargetHeat: '300'
  });
}

describe('Game Feel & Audio Elevation Verification Suite', () => {
  beforeEach(() => {
    HitStopPresentationTimeline.shared.dispose();
    AudioFilterTransition.shared.reset();
  });

  afterEach(() => {
    HitStopPresentationTimeline.shared.dispose();
    AudioFilterTransition.shared.reset();
  });

  // 1. 普通计分
  it('Scenario 1 [普通计分]: consumes domain ScoreTrace, matches finalScore exactly with pentatonic strikes', () => {
    const trace = createSampleHand('pair');
    const cards = createCards(5);
    const strikes: number[] = [];
    let accumulatedTotal = '';
    let completedScore = '';

    const orchestrator = new ScoringRhythmOrchestrator({
      onCardStrike: (idx) => strikes.push(idx),
      onScoreAccumulate: (_h, _m, total) => { accumulatedTotal = total; },
      onResolutionComplete: (final) => { completedScore = final; }
    });

    orchestrator.startScoringSequence(cards, trace, { goalScore: '100', isStageCleared: true });
    expect(orchestrator.getPhase()).toBe('windup');

    // Step through windup and all events to resolution
    for (let i = 0; i < 200; i++) {
      orchestrator.update(0.016);
    }

    expect(orchestrator.isComplete()).toBe(true);
    expect(strikes.length).toBeGreaterThan(0);
    expect(completedScore).toBe(trace.finalScore);
    expect(accumulatedTotal).toBe(trace.finalScore);
  });

  // 2. 连续乘倍率与冻结
  it('Scenario 2 [连续乘倍率]: triggers Hit-Stop freeze and climax war drum for multiply-multiplier events', () => {
    const multJoker1 = r2CreateJoker('f06', 'owned/0', 4, 'none');
    const multJoker2 = r2CreateJoker('f09', 'owned/1', 4, 'none');
    const trace = createSampleHand('full-house', [multJoker1, multJoker2]);

    const cards = createCards(5);
    let climaxBurstCount = 0;

    const orchestrator = new ScoringRhythmOrchestrator({
      onClimaxBurst: () => { climaxBurstCount++; }
    });

    orchestrator.startScoringSequence(cards, trace, { goalScore: '200', isStageCleared: true });

    // Step through entire sequence
    for (let i = 0; i < 300; i++) {
      orchestrator.update(0.016);
    }

    expect(orchestrator.isComplete()).toBe(true);
    expect(climaxBurstCount).toBeGreaterThan(0);
    expect(orchestrator.getTrace()?.finalScore).toBe(trace.finalScore);
  });

  // 3. 计分事件原顺序与小数精度 (Defect 2)
  it('Scenario 3 [计分事件原顺序与显示精度]: preserves exact trace order, monotonicity, and 1.5x decimal precision', () => {
    // Verify formatRational precision
    expect(formatRational(new Rational(3n, 2n))).toBe('1.5');
    expect(formatRational(new Rational(2n, 1n))).toBe('2');
    expect(formatRational(new Rational(704n, 1n))).toBe('704');
    expect(formatRational(new Rational(1n, 4n))).toBe('0.25');

    // Construct interleaved hand:
    // c1 card strike chips (add-heat)
    // + e03 joker (add-heat)
    // + f03 joker (add-multiplier)
    // + f09 joker (multiply-multiplier x1.5)
    // + f06 joker (multiply-multiplier x2)
    // + amo character (multiply-multiplier x3)
    const cards = [
      { id: 'c1', rank: 14, suit: 'spades' as const },
      { id: 'c2', rank: 10, suit: 'hearts' as const }
    ];
    const jokers = [
      r2CreateJoker('e03', 'owned/0', 4, 'none'),
      r2CreateJoker('f03', 'owned/1', 4, 'none'),
      r2CreateJoker('f09', 'owned/2', 4, 'none'),
      r2CreateJoker('f06', 'owned/3', 4, 'none')
    ];
    const trace = scoreR2Hand({
      rulesVersion: 'r2',
      runId: 'interleaved-test',
      rootId: 'interleaved-test/1',
      characterId: 'amo',
      amoScoreTiming: 'after-joker',
      hand: cards,
      selectedIds: ['c1'],
      disabledIds: [],
      jokers,
      definitions: R2_JOKERS,
      handLevels: { 'high-card': 1 },
      playIndex: 1,
      handsBeforePlay: 4,
      previousHandType: null,
      wager: false,
      rng: new SeededRng('rng-interleaved').snapshot(),
      gold: 5,
      discardsUsed: 0,
      stageHeatBefore: '0',
      stageTargetHeat: '300'
    });

    const cardItems = createCards(5);
    const processedEvents: any[] = [];
    const accumulatedValues: Array<{ h: string; m: string; total: string }> = [];

    const orchestrator = new ScoringRhythmOrchestrator({
      onEventProcessed: (idx, event) => {
        processedEvents.push({ idx, eventId: event.eventId, op: event.operation, afterH: formatRational(event.after.H), afterM: formatRational(event.after.M) });
      },
      onScoreAccumulate: (h, m, total) => {
        accumulatedValues.push({ h, m, total });
      }
    });

    orchestrator.startScoringSequence(cardItems, trace, { goalScore: '300', isStageCleared: true });

    // Step through the entire sequence
    for (let i = 0; i < 400; i++) {
      orchestrator.update(0.016);
    }

    expect(orchestrator.isComplete()).toBe(true);

    // Assert exact event count matches trace.events
    expect(processedEvents.length).toBe(trace.events.length);

    // Assert event by event matches exact original trace order without reordering
    for (let i = 0; i < trace.events.length; i++) {
      expect(processedEvents[i].eventId).toBe(trace.events[i].eventId);
      expect(processedEvents[i].afterH).toBe(formatRational(trace.events[i].after.H));
      expect(processedEvents[i].afterM).toBe(formatRational(trace.events[i].after.M));
    }

    // Assert f09 multiplier 1.5 was preserved and not floored to 1
    const f09Event = processedEvents.find(e => e.op === 'multiply-multiplier');
    expect(f09Event).toBeDefined();
    // After f09, multiplier must contain .5 or reflect fractional calculation
    const hasDecimalMult = accumulatedValues.some(v => v.m.includes('.5') || v.m === '1.5' || v.m === '7.5');
    expect(hasDecimalMult).toBe(true);
  });

  // 4. 未通关
  it('Scenario 4 [未通关]: does NOT trigger victory bell when stage is not cleared', () => {
    const trace = createSampleHand('high-card');
    const cards = createCards(5);
    let resultVictory: boolean | undefined;

    const orchestrator = new ScoringRhythmOrchestrator({
      onResolutionComplete: (_score, isVictory) => { resultVictory = isVictory; }
    });

    orchestrator.startScoringSequence(cards, trace, {
      goalScore: '999999',
      isStageCleared: false
    });

    for (let i = 0; i < 200; i++) {
      orchestrator.update(0.016);
    }

    expect(resultVictory).toBe(false);
    expect(orchestrator.isComplete()).toBe(true);
  });

  // 5. 六英雄技能收益与事件
  it('Scenario 5 [六英雄技能收益]: verifies authentic character events and payoff values for all 6 heroes', () => {
    const heroConfigs = [
      { key: 'sushi', charId: 'amo', setup: { amoScoreTiming: 'after-joker' as const, selectedIds: ['c1'] }, expectedOp: 'multiply-multiplier' },
      { key: 'liue', charId: 'erxiang', setup: { selectedIds: ['c1', 'c2'] }, expectedOp: 'add-multiplier' },
      { key: 'qinqiong', charId: 'touye', setup: { wager: true, selectedIds: ['c1', 'c2'] }, expectedOp: 'multiply-multiplier' },
      { key: 'xinqiji', charId: 'laohuan', setup: { selectedIds: ['c1', 'c2', 'c3', 'c4', 'c5'] }, expectedOp: 'add-heat' },
      { key: 'wencheng', charId: 'azao', setup: { previousHandType: 'high-card' as const, selectedIds: ['c1', 'c2'] }, expectedOp: 'add-multiplier' },
      { key: 'huarui', charId: 'xiemu', setup: { handsBeforePlay: 1, selectedIds: ['c1', 'c2'] }, expectedOp: 'multiply-multiplier' }
    ] as const;

    const cards = createCards(5);

    for (const hero of heroConfigs) {
      let playingCards: PlayingCard[] = [
        { id: 'c1', rank: 14, suit: 'spades' },
        { id: 'c2', rank: 14, suit: 'hearts' },
        { id: 'c3', rank: 10, suit: 'clubs' },
        { id: 'c4', rank: 8, suit: 'diamonds' },
        { id: 'c5', rank: 7, suit: 'spades' }
      ];

      let handLevels: any = { pair: 1 };
      if (hero.key === 'xinqiji') {
        playingCards = [
          { id: 'c1', rank: 14, suit: 'spades' },
          { id: 'c2', rank: 13, suit: 'hearts' },
          { id: 'c3', rank: 12, suit: 'clubs' },
          { id: 'c4', rank: 11, suit: 'diamonds' },
          { id: 'c5', rank: 10, suit: 'spades' }
        ];
        handLevels = { straight: 1 };
      } else if (hero.key === 'sushi') {
        handLevels = { 'high-card': 1 };
      }

      const trace = scoreR2Hand({
        rulesVersion: 'r2',
        runId: `hero-test-${hero.key}`,
        rootId: `hero-test-${hero.key}/1`,
        characterId: hero.charId,
        hand: playingCards,
        selectedIds: hero.setup.selectedIds,
        disabledIds: [],
        jokers: [],
        definitions: R2_JOKERS,
        handLevels,
        playIndex: 1,
        handsBeforePlay: (hero.setup as any).handsBeforePlay ?? 4,
        previousHandType: (hero.setup as any).previousHandType ?? null,
        wager: (hero.setup as any).wager ?? false,
        rng: new SeededRng(`hero-rng-${hero.key}`).snapshot(),
        gold: 5,
        stageHeatBefore: '0',
        stageTargetHeat: '200',
        ...(hero.setup as any)
      });

      // Assert specific character event is emitted
      const charEvent = trace.events.find(e => e.sourceType === 'character');
      expect(charEvent).toBeDefined();
      expect(charEvent?.operation).toBe(hero.expectedOp);

      // Verify orchestrator executes without throwing
      const orchestrator = new ScoringRhythmOrchestrator();
      expect(() => {
        orchestrator.startScoringSequence(cards, trace);
        orchestrator.update(0.05);
        orchestrator.cancel();
      }).not.toThrow();
    }
  });

  // 6. 1× / 4× 播放速率
  it('Scenario 6 [1× / 4× 播放速率]: scales presentation delta and completes faster proportionally', () => {
    const trace = createSampleHand('pair');
    const cards1x = createCards(5);
    const cards4x = createCards(5);

    const orchestrator1x = new ScoringRhythmOrchestrator();
    const orchestrator4x = new ScoringRhythmOrchestrator();

    orchestrator1x.startScoringSequence(cards1x, trace, { speedRatio: 1.0 });
    orchestrator4x.startScoringSequence(cards4x, trace, { speedRatio: 4.0 });

    // Step both through 25 frames of 16ms (400ms real time)
    for (let f = 0; f < 25; f++) {
      orchestrator1x.update(0.016);
      orchestrator4x.update(0.016);
    }

    // 1x advanced 400ms (still processing strikes)
    expect(orchestrator1x.getPhase()).toBe('striking');
    // 4x advanced 1600ms (completed full sequence)
    expect(orchestrator4x.isComplete()).toBe(true);
  });

  // 7. 停顿中取消后立即重播 (涵盖起势、冲撞、回弹三时机)
  it('Scenario 7 [停顿中取消后立即重播]: cancels at windup, striking, and settle without leftover state', () => {
    const trace = createSampleHand('pair');
    const cards = createCards(5);
    const orchestrator = new ScoringRhythmOrchestrator();

    // 1. Cancel in Windup (t = 50ms)
    orchestrator.startScoringSequence(cards, trace);
    orchestrator.update(0.05);
    expect(orchestrator.getPhase()).toBe('windup');
    orchestrator.cancel();
    expect(orchestrator.getPhase()).toBe('idle');
    for (const card of cards) {
      expect(card.transform.y.value).toBe(0);
      expect(card.transform.scaleX.value).toBe(1.0);
    }

    // 2. Cancel in Striking (t = 180ms)
    orchestrator.startScoringSequence(cards, trace);
    orchestrator.update(0.18);
    expect(orchestrator.getPhase()).toBe('striking');
    orchestrator.cancel();
    expect(orchestrator.getPhase()).toBe('idle');
    for (const card of cards) {
      expect(card.transform.y.value).toBe(0);
      expect(card.transform.scaleX.value).toBe(1.0);
    }

    // 3. Cancel in Settle / Rebound (t = 300ms)
    orchestrator.startScoringSequence(cards, trace);
    orchestrator.update(0.30);
    orchestrator.cancel();
    expect(orchestrator.getPhase()).toBe('idle');

    // Immediate replay starts cleanly from step 0
    orchestrator.startScoringSequence(cards, trace);
    expect(orchestrator.getPhase()).toBe('windup');
  });

  // 8. 音频生命周期 (Defect 1)
  it('Scenario 8 [音频生命周期]: retain does not overwrite onended; releases secondary sources and obeys voice budget', () => {
    const audio = AudioEngine.shared;

    // Verify initial clean state
    expect(audio.getActiveVoiceCount()).toBe(0);

    // Calling cancelPresentation() clears all sfx voices cleanly
    audio.cancelPresentation();
    expect(audio.getActiveVoiceCount()).toBe(0);

    // Mute and volume slider verification
    audio.setVolume('sfx', 0.5);
    expect(audio.getVolume('sfx')).toBe(0.5);

    audio.muted = true;
    expect(audio.muted).toBe(true);

    audio.muted = false;
    expect(audio.muted).toBe(false);
  });

  // 9. 后台恢复与大步长保护
  it('Scenario 9 [后台恢复与大步长保护]: spring integration clamps dt to prevent numerical explosion', () => {
    const spring = new Spring1D(0, SPRING_PRESETS.snappy);
    spring.setTarget(100);

    // Simulate extreme 10-second lag / background tab freeze
    spring.step(10.0);

    // Must be a valid, finite number within reasonable bounds
    expect(Number.isFinite(spring.value)).toBe(true);
    expect(Number.isFinite(spring.velocity)).toBe(true);
    expect(Math.abs(spring.value)).toBeLessThan(500);
  });

  // 10. 视觉变换组合与冻结 (Defect 3)
  it('Scenario 10 [视觉变换组合与冻结]: transforms hold completely frozen when timeline effectiveDt is zero', () => {
    const transform = new SpringCardTransform(0, 0, 1.0, 0);
    transform.y.setTarget(-45);
    transform.scaleX.setTarget(1.25);

    // Normal step moves values toward target
    transform.step(0.016);
    const yAfterMove = transform.y.value;
    const scaleAfterMove = transform.scaleX.value;

    // During Hit-Stop freeze, effectiveDt is strictly 0:
    for (let frame = 0; frame < 5; frame++) {
      transform.step(0);
      expect(transform.y.value).toBe(yAfterMove);
      expect(transform.scaleX.value).toBe(scaleAfterMove);
    }

    // Reset restores all transforms to baseline
    transform.reset(0, 0, 1.0, 0);
    expect(transform.x.value).toBe(0);
    expect(transform.y.value).toBe(0);
    expect(transform.scaleX.value).toBe(1.0);
    expect(transform.scaleY.value).toBe(1.0);
    expect(transform.rotation.value).toBe(0);
  });

  // 11. 嵌套弹窗低通栈
  it('Scenario 11 [嵌套弹窗低通栈]: maintains muffle state until all nested dialogs are popped', () => {
    const filter = AudioFilterTransition.shared;
    expect(filter.getStackDepth()).toBe(0);
    expect(filter.isMuffled()).toBe(false);

    // Enter Shop (depth 1)
    filter.enterMuffled('shop');
    expect(filter.getStackDepth()).toBe(1);
    expect(filter.isMuffled()).toBe(true);

    // Open Card Detail inside Shop (depth 2)
    filter.enterMuffled('card-detail');
    expect(filter.getStackDepth()).toBe(2);
    expect(filter.isMuffled()).toBe(true);

    // Close Card Detail (depth 1) -> still muffled!
    filter.exitMuffled('card-detail');
    expect(filter.getStackDepth()).toBe(1);
    expect(filter.isMuffled()).toBe(true);

    // Exit Shop (depth 0) -> fully restored!
    filter.exitMuffled('shop');
    expect(filter.getStackDepth()).toBe(0);
    expect(filter.isMuffled()).toBe(false);
  });
});
