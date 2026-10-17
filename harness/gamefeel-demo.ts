/**
 * harness/gamefeel-demo.ts
 * Authentic Phaser Game Harness for Game Feel & Audio Elevation Verification.
 * 
 * Complies with Dachoupai Table Architecture:
 * - 3-Layer Container Composition:
 *   1. Layout Layer (outer Container): owns table x/y coordinates and drag interactions.
 *   2. Spring Physics Layer (springLayer): owns spring displacement, pops, and rebounds.
 *   3. 2.5D Tilt Layer (tiltLayer): owns perspective foreshortening, glare, and art parallax.
 * - Zero fighting over scale/rotation properties.
 * - Preserves art original (baseArtX, baseArtY) coordinates without layout shift.
 * - Respects Hit-Stop presentation timeline: freezes spring and tilt during hit-stops.
 * - Consumes authentic domain ScoreTrace events in strict original order.
 */

import Phaser from 'phaser';
import { AudioEngine } from '../src/audio/AudioEngine';
import { AudioFilterTransition } from '../src/gamefeel/AudioFilterTransition';
import { PhaserCardTilt } from '../src/gamefeel/PhaserCardTilt';
import { SpringCardTransform } from '../src/gamefeel/SpringMotion';
import {
  ScoringRhythmOrchestrator,
  ScoringCardItem,
  ScoringPhase,
  formatRational
} from '../src/gamefeel/ScoringRhythmOrchestrator';
import { HitStopPresentationTimeline } from '../src/gamefeel/HitStopPresentationTimeline';
import { scoreR2Hand, type ScoreInput, type ScoreTrace } from '../src/domain/scoreR2';
import { R2_JOKERS } from '../src/content/r2Schema';
import { r2CreateJoker } from '../src/domain/r2Run';
import { SeededRng } from '../src/core/SeededRng';
import { PlayingCard } from '../src/cards/types';

export const DEMO_CARDS = [
  { id: 'c1', name: '苏轼·风起赤壁', rank: 14, suit: 'hearts', character: '苏轼' },
  { id: 'c2', name: '秦琼·踏破山河', rank: 14, suit: 'spades', character: '秦琼' },
  { id: 'c3', name: '辛弃疾·挑灯看剑', rank: 8, suit: 'diamonds', character: '辛弃疾' },
  { id: 'c4', name: '刘娥·大宋之母', rank: 8, suit: 'clubs', character: '刘娥' },
  { id: 'c5', name: '文成·藏地迎宾', rank: 10, suit: 'spades', character: '文成公主' },
];

export interface CardObjectItem {
  id: string;
  name: string;
  container: Phaser.GameObjects.Container;       // Layer 1: Layout & Drag
  springLayer: Phaser.GameObjects.Container;     // Layer 2: Spring Physics
  tiltLayer: Phaser.GameObjects.Container;       // Layer 3: 2.5D Tilt & Parallax
  innerVisual: Phaser.GameObjects.Container;     // Backwards-compatible alias to tiltLayer
  transform: SpringCardTransform;
  tilt: PhaserCardTilt;
}

export interface ProcessedEventRecord {
  index: number;
  eventId: string;
  sourceType: string;
  operation: string;
  beforeH: string;
  beforeM: string;
  afterH: string;
  afterM: string;
}

export class GameFeelScene extends Phaser.Scene {
  public cardItems: CardObjectItem[] = [];
  public orchestrator!: ScoringRhythmOrchestrator;
  public filterTransition!: AudioFilterTransition;
  public audioEngine!: AudioEngine;

  // Visual HUD elements
  public heatText!: Phaser.GameObjects.Text;
  public multText!: Phaser.GameObjects.Text;
  public totalText!: Phaser.GameObjects.Text;
  public phaseText!: Phaser.GameObjects.Text;
  public hitstopBanner!: Phaser.GameObjects.Container;
  public bannerText!: Phaser.GameObjects.Text;

  public currentTrace?: ScoreTrace;
  public currentSpeed: number = 1.0;
  public lastResult?: { finalScore: string; isVictory: boolean };
  public phaseHistory: ScoringPhase[] = [];
  public processedEvents: ProcessedEventRecord[] = [];
  public freezeSamples: Array<{ time: number; generation: number; y: number; scaleX: number; rot: number; isFrozen: boolean }> = [];

  constructor() {
    super('GameFeelScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.audioEngine = AudioEngine.shared;
    this.filterTransition = AudioFilterTransition.shared;

    // Draw Tang/Song table background
    const bg = this.add.graphics();
    bg.fillStyle(0x13212b, 1.0);
    bg.fillRect(0, 0, width, height);

    // Decorative inner table mat
    const mat = this.add.graphics();
    mat.fillStyle(0x1c2f3d, 0.9);
    mat.fillRoundedRect(30, 30, width - 60, height - 60, 16);
    mat.lineStyle(2, 0xd0af72, 0.85);
    mat.strokeRoundedRect(30, 30, width - 60, height - 60, 16);

    // Header
    this.add.text(width / 2, 54, '唐宋牌 · 视听打击感与节奏编排', {
      fontFamily: 'Noto Serif SC, SimSun, serif',
      fontSize: '22px',
      color: '#d0af72',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Table Score HUD Container
    const hudContainer = this.add.container(width / 2, 110);
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x0e1820, 0.85);
    hudBg.fillRoundedRect(-280, -32, 560, 64, 10);
    hudBg.lineStyle(1.5, 0x8a7447, 0.6);
    hudBg.strokeRoundedRect(-280, -32, 560, 64, 10);
    hudContainer.add(hudBg);

    const labelStyle = { fontFamily: 'sans-serif', fontSize: '13px', color: '#8fa4ae' };
    const heatLabel = this.add.text(-200, -22, '热度 (H)', labelStyle);
    this.heatText = this.add.text(-200, -2, '0', { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#5ec2a0', fontStyle: 'bold' });

    const multLabel = this.add.text(-60, -22, '倍率 (M)', labelStyle);
    this.multText = this.add.text(-60, -2, '1', { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#e86a53', fontStyle: 'bold' });

    const totalLabel = this.add.text(80, -22, '本手得分', labelStyle);
    this.totalText = this.add.text(80, -2, '0', { fontFamily: 'Georgia, serif', fontSize: '26px', color: '#ffde7a', fontStyle: 'bold' });

    hudContainer.add([heatLabel, this.heatText, multLabel, this.multText, totalLabel, this.totalText]);

    // Phase Indicator
    this.phaseText = this.add.text(width / 2, 168, '编排时钟: 牌桌就绪 (留白 留白)', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#a1b8c2'
    }).setOrigin(0.5);

    // Hit-stop Banner
    this.hitstopBanner = this.add.container(width / 2, 230);
    const bannerG = this.add.graphics();
    bannerG.fillStyle(0xa83226, 0.95);
    bannerG.fillRoundedRect(-180, -22, 360, 44, 8);
    bannerG.lineStyle(2, 0xffdea3, 0.9);
    bannerG.strokeRoundedRect(-180, -22, 360, 44, 8);
    this.bannerText = this.add.text(0, 0, '⚡ 50ms 冻结顿挫 · 战鼓爆点 ⚡', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#fff5df',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.hitstopBanner.add([bannerG, this.bannerText]);
    this.hitstopBanner.setAlpha(0);

    // Build 5 Interactive Phaser Cards with 3-layer architecture
    this.buildCards(width, height);

    // Initialize Scoring Rhythm Orchestrator
    this.orchestrator = new ScoringRhythmOrchestrator({
      onClimaxBurst: (event, mult) => {
        this.cameras.main.shake(160, 0.012);
        this.hitstopBanner.setAlpha(1.0).setScale(1.15);
        this.tweens.add({
          targets: this.hitstopBanner,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 180 / this.currentSpeed,
          ease: 'Back.easeOut'
        });
        this.bannerText.setText(`⚡ 战鼓爆点 · 倍率 ×${mult} ⚡`);
      },
      onScoreAccumulate: (heat, mult, total) => {
        this.heatText.setText(heat);
        this.multText.setText(mult);
        this.totalText.setText(total);
      },
      onResolutionComplete: (finalScore, isVictory) => {
        this.lastResult = { finalScore, isVictory };
        this.phaseText.setText(`编排时钟: 收束大捷 · 最终得分 ${finalScore} (${isVictory ? '通关大捷！' : '本场未过'})`);
        this.tweens.add({
          targets: this.hitstopBanner,
          alpha: 0,
          duration: 300 / this.currentSpeed
        });
      },
      onPhaseChange: (phase) => {
        this.phaseHistory.push(phase);
        const labels: Record<ScoringPhase, string> = {
          idle: '牌桌就绪 (留白)',
          windup: '阶段一: 起势 (留白 蓄势聚焦)',
          striking: '阶段二: 连发 (宫商角徵羽 连续打击)',
          climax: '阶段三: 爆点 (50ms 冻结顿挫 · 战鼓重拍)',
          resolution: '阶段四: 收束 (编钟大捷 · 回归基准)',
          completed: '结算完成 (呼吸留白)'
        };
        this.phaseText.setText(`编排时钟: ${labels[phase]}`);
      },
      onEventProcessed: (idx, event) => {
        this.processedEvents.push({
          index: idx,
          eventId: event.eventId,
          sourceType: event.sourceType,
          operation: event.operation,
          beforeH: formatRational(event.before.H),
          beforeM: formatRational(event.before.M),
          afterH: formatRational(event.after.H),
          afterM: formatRational(event.after.M)
        });
      }
    });

    // Try unlocking audio on first pointer down
    this.input.on('pointerdown', () => {
      void this.audioEngine.unlock();
      this.filterTransition.attachToAudioEngine(this.audioEngine);
    });
  }

  private buildCards(screenWidth: number, screenHeight: number): void {
    const cardWidth = 120;
    const cardHeight = 170;
    const startX = screenWidth / 2 - ((DEMO_CARDS.length - 1) * 140) / 2;
    const cardY = 360;

    DEMO_CARDS.forEach((cardData, idx) => {
      const cardX = startX + idx * 140;

      // Layer 1: Outer container (Table Layout & Drag interactions)
      const container = this.add.container(cardX, cardY);
      container.setSize(cardWidth, cardHeight);

      // Layer 2: Dedicated Spring Physics Layer
      const springLayer = this.add.container(0, 0);
      springLayer.setName('card-spring-layer');

      // Layer 3: Dedicated 2.5D Tilt & Parallax Layer
      const tiltLayer = this.add.container(0, 0);
      tiltLayer.setName('card-tilt-layer');

      // 1. Drop Shadow
      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.35);
      shadow.fillRoundedRect(-cardWidth / 2 + 3, -cardHeight / 2 + 5, cardWidth, cardHeight, 8);

      // 2. Card Paper Body
      const bg = this.add.graphics();
      bg.fillStyle(0xfffbf0, 1.0);
      bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 8);
      bg.lineStyle(1.5, 0xc2a66e, 0.95);
      bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 8);

      // 3. Card Art placeholder with preserved base coordinates
      const art = this.add.graphics();
      art.setName('card-art');
      art.fillStyle(0xecd9b5, 0.85);
      art.fillRoundedRect(-cardWidth / 2 + 10, -cardHeight / 2 + 10, cardWidth - 20, 80, 5);

      // 4. Suit & Rank Labels
      const suitSymbols: Record<string, string> = { spades: '♠', hearts: '♥', clubs: '♣', diamonds: '♦' };
      const suitColor = (cardData.suit === 'hearts' || cardData.suit === 'diamonds') ? '#b53b2a' : '#1e2b34';
      const rankText = cardData.rank === 14 ? 'A' : cardData.rank === 13 ? 'K' : cardData.rank === 12 ? 'Q' : cardData.rank === 11 ? 'J' : String(cardData.rank);

      const cornerText = this.add.text(-cardWidth / 2 + 14, -cardHeight / 2 + 12, `${rankText}\n${suitSymbols[cardData.suit]}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: suitColor,
        fontStyle: 'bold'
      });

      const heroName = this.add.text(0, -cardHeight / 2 + 50, cardData.character, {
        fontFamily: 'Noto Serif SC, SimSun, serif',
        fontSize: '18px',
        color: '#26343d',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const skillName = this.add.text(0, cardHeight / 2 - 28, cardData.name.split('·')[1] ?? '', {
        fontFamily: 'Noto Serif SC, sans-serif',
        fontSize: '12px',
        color: '#7a6237'
      }).setOrigin(0.5);

      tiltLayer.add([shadow, bg, art, cornerText, heroName, skillName]);
      springLayer.add(tiltLayer);
      container.add(springLayer);

      // Card Spring Physics
      const transform = new SpringCardTransform(0, 0, 1.0, 0);

      // 2.5D Perspective Tilt Component (modifies tiltLayer strictly)
      const tilt = new PhaserCardTilt(container, cardWidth, cardHeight, tiltLayer, {
        maxRotationDeg: 6.5,
        scaleModulation: 0.04,
        artParallaxPx: 6.0,
        dragLeanFactor: 0.08,
        lerpSpeed: 0.22
      });

      this.cardItems.push({
        id: cardData.id,
        name: cardData.name,
        container,
        springLayer,
        tiltLayer,
        innerVisual: tiltLayer,
        transform,
        tilt
      });
    });
  }

  update(time: number, delta: number): void {
    const dtSeconds = delta / 1000;

    // 1. Advance Scoring Rhythm Orchestrator
    this.orchestrator.update(dtSeconds);

    // 2. Calculate presentation effective delta (0 if Hit-Stop is active)
    const isFrozen = HitStopPresentationTimeline.shared.isFrozen();
    const effectiveDt = (isFrozen ? 0 : dtSeconds) * this.currentSpeed;

    // 3. Advance 2.5D Tilt and Spring Physics across dedicated layers without fighting
    for (const item of this.cardItems) {
      item.tilt.update(effectiveDt);

      // Apply spring motion strictly to springLayer (Layer 2)
      item.springLayer.y = item.transform.y.value;
      item.springLayer.scaleX = item.transform.scaleX.value;
      item.springLayer.scaleY = item.transform.scaleY.value;
      item.springLayer.rotation = item.transform.rotation.value;
    }

    if (isFrozen && this.cardItems.length > 0) {
      const c = this.cardItems[0];
      this.freezeSamples.push({
        time,
        generation: HitStopPresentationTimeline.shared.getGeneration(),
        y: c.springLayer.y,
        scaleX: c.springLayer.scaleX,
        rot: c.tiltLayer.rotation,
        isFrozen: true
      });
    }
  }

  // --- Real Scenario Triggers Using scoreR2Hand ---

  public playNormal(speedRatio: number = 1.0): void {
    this.currentSpeed = speedRatio;
    this.phaseHistory = [];
    this.processedEvents = [];
    const cards: PlayingCard[] = DEMO_CARDS.map(c => ({ id: c.id, rank: c.rank as any, suit: c.suit }));
    const trace = scoreR2Hand({
      rulesVersion: 'r2',
      runId: 'normal-run',
      rootId: 'normal-run/1',
      characterId: 'neutral',
      hand: cards,
      selectedIds: ['c1', 'c2', 'c3', 'c4', 'c5'],
      disabledIds: [],
      jokers: [],
      definitions: R2_JOKERS,
      handLevels: { 'two-pair': 1 },
      playIndex: 1,
      handsBeforePlay: 4,
      previousHandType: null,
      wager: false,
      rng: new SeededRng('normal-run').snapshot(),
      gold: 5,
      stageHeatBefore: '0',
      stageTargetHeat: '200'
    });

    this.currentTrace = trace;
    const scoringItems: ScoringCardItem[] = this.cardItems.map(c => ({
      id: c.id,
      name: c.name,
      transform: c.transform
    }));

    this.orchestrator.startScoringSequence(scoringItems, trace, {
      speedRatio,
      goalScore: '200',
      isStageCleared: true
    });
  }

  public playHighMult(speedRatio: number = 1.0): void {
    this.currentSpeed = speedRatio;
    this.phaseHistory = [];
    this.processedEvents = [];
    this.freezeSamples = [];
    const cards: PlayingCard[] = DEMO_CARDS.map(c => ({ id: c.id, rank: c.rank as any, suit: c.suit }));
    const trace = scoreR2Hand({
      rulesVersion: 'r2',
      runId: 'mult-run',
      rootId: 'mult-run/1',
      characterId: 'amo',
      amoScoreTiming: 'after-joker',
      hand: cards,
      selectedIds: ['c1', 'c2', 'c3', 'c4', 'c5'],
      disabledIds: [],
      jokers: [
        r2CreateJoker('f06', 'owned/0', 4, 'none'),
        r2CreateJoker('f09', 'owned/1', 4, 'none')
      ],
      definitions: R2_JOKERS,
      handLevels: { 'full-house': 2 },
      playIndex: 1,
      handsBeforePlay: 4,
      previousHandType: null,
      wager: false,
      rng: new SeededRng('mult-run').snapshot(),
      gold: 5,
      discardsUsed: 0,
      stageHeatBefore: '0',
      stageTargetHeat: '400'
    });

    this.currentTrace = trace;
    const scoringItems: ScoringCardItem[] = this.cardItems.map(c => ({
      id: c.id,
      name: c.name,
      transform: c.transform
    }));

    this.orchestrator.startScoringSequence(scoringItems, trace, {
      speedRatio,
      goalScore: '400',
      isStageCleared: true
    });
  }

  /**
   * Interleaved Scenario:
   * Combines poker card scoring chips, Tang/Song additive heat (e03), additive mult (f03),
   * fractional multiplier (f09 x1.5), and heavy multiplier (f06 x2).
   */
  public playInterleaved(speedRatio: number = 1.0): void {
    this.currentSpeed = speedRatio;
    this.phaseHistory = [];
    this.processedEvents = [];
    const cards: PlayingCard[] = DEMO_CARDS.map(c => ({ id: c.id, rank: c.rank as any, suit: c.suit }));
    const jokers = [
      r2CreateJoker('e03', 'owned/0', 4, 'none'), // +20 heat when gold > 0
      r2CreateJoker('f03', 'owned/1', 4, 'none'), // +4 mult on first play
      r2CreateJoker('f09', 'owned/2', 4, 'none'), // x1.5 mult when discardsUsed == 0
      r2CreateJoker('f06', 'owned/3', 4, 'none')  // x2 mult
    ];
    const trace = scoreR2Hand({
      rulesVersion: 'r2',
      runId: 'interleaved-run',
      rootId: 'interleaved-run/1',
      characterId: 'amo',
      amoScoreTiming: 'after-joker',
      hand: cards,
      selectedIds: ['c1'], // single card triggers sushi amo 3x multiplier
      disabledIds: [],
      jokers,
      definitions: R2_JOKERS,
      handLevels: { 'high-card': 1 },
      playIndex: 1,
      handsBeforePlay: 4,
      previousHandType: null,
      wager: false,
      rng: new SeededRng('interleaved-run').snapshot(),
      gold: 5,
      discardsUsed: 0,
      stageHeatBefore: '0',
      stageTargetHeat: '300'
    });

    this.currentTrace = trace;
    const scoringItems: ScoringCardItem[] = this.cardItems.map(c => ({
      id: c.id,
      name: c.name,
      transform: c.transform
    }));

    this.orchestrator.startScoringSequence(scoringItems, trace, {
      speedRatio,
      goalScore: '300',
      isStageCleared: true
    });
  }

  public playNoMult(speedRatio: number = 1.0): void {
    this.currentSpeed = speedRatio;
    this.phaseHistory = [];
    this.processedEvents = [];
    const cards: PlayingCard[] = DEMO_CARDS.map(c => ({ id: c.id, rank: c.rank as any, suit: c.suit }));
    const trace = scoreR2Hand({
      rulesVersion: 'r2',
      runId: 'nomult-run',
      rootId: 'nomult-run/1',
      characterId: 'neutral',
      hand: cards,
      selectedIds: ['c1'],
      disabledIds: [],
      jokers: [],
      definitions: R2_JOKERS,
      handLevels: { 'high-card': 1 },
      playIndex: 1,
      handsBeforePlay: 4,
      previousHandType: null,
      wager: false,
      rng: new SeededRng('nomult-run').snapshot(),
      gold: 2,
      stageHeatBefore: '0',
      stageTargetHeat: '100'
    });

    this.currentTrace = trace;
    const scoringItems: ScoringCardItem[] = this.cardItems.map(c => ({
      id: c.id,
      name: c.name,
      transform: c.transform
    }));

    this.orchestrator.startScoringSequence(scoringItems, trace, {
      speedRatio,
      goalScore: '100',
      isStageCleared: true
    });
  }

  public playDefeat(speedRatio: number = 1.0): void {
    this.currentSpeed = speedRatio;
    this.phaseHistory = [];
    this.processedEvents = [];
    const cards: PlayingCard[] = DEMO_CARDS.map(c => ({ id: c.id, rank: c.rank as any, suit: c.suit }));
    const trace = scoreR2Hand({
      rulesVersion: 'r2',
      runId: 'defeat-run',
      rootId: 'defeat-run/1',
      characterId: 'neutral',
      hand: cards,
      selectedIds: ['c1', 'c2'],
      disabledIds: [],
      jokers: [],
      definitions: R2_JOKERS,
      handLevels: { 'pair': 1 },
      playIndex: 1,
      handsBeforePlay: 4,
      previousHandType: null,
      wager: false,
      rng: new SeededRng('defeat-run').snapshot(),
      gold: 0,
      stageHeatBefore: '0',
      stageTargetHeat: '9000'
    });

    this.currentTrace = trace;
    const scoringItems: ScoringCardItem[] = this.cardItems.map(c => ({
      id: c.id,
      name: c.name,
      transform: c.transform
    }));

    this.orchestrator.startScoringSequence(scoringItems, trace, {
      speedRatio,
      goalScore: '9000',
      isStageCleared: false
    });
  }

  public playHeroSkill(heroKey: 'sushi' | 'liue' | 'qinqiong' | 'xinqiji' | 'wencheng' | 'huarui', speedRatio: number = 1.0): void {
    this.currentSpeed = speedRatio;
    this.phaseHistory = [];
    this.processedEvents = [];

    let playingCards: PlayingCard[] = [
      { id: 'c1', rank: 14, suit: 'spades' },
      { id: 'c2', rank: 14, suit: 'hearts' },
      { id: 'c3', rank: 10, suit: 'clubs' },
      { id: 'c4', rank: 8, suit: 'diamonds' },
      { id: 'c5', rank: 7, suit: 'spades' }
    ];

    let heroInput: Partial<ScoreInput> = {};
    let selectedIds = ['c1', 'c2'];
    let handLevels: any = { pair: 1 };

    if (heroKey === 'sushi') {
      heroInput = { characterId: 'amo', amoScoreTiming: 'after-joker' };
      selectedIds = ['c1'];
      handLevels = { 'high-card': 1 };
    } else if (heroKey === 'liue') {
      // erxiang: pair triggers +1.5 mult
      heroInput = { characterId: 'erxiang' };
      selectedIds = ['c1', 'c2'];
      handLevels = { pair: 1 };
    } else if (heroKey === 'qinqiong') {
      heroInput = { characterId: 'touye', wager: true };
      selectedIds = ['c1', 'c2'];
      handLevels = { pair: 1 };
    } else if (heroKey === 'xinqiji') {
      // laohuan: straight triggers +120 heat
      playingCards = [
        { id: 'c1', rank: 14, suit: 'spades' },
        { id: 'c2', rank: 13, suit: 'hearts' },
        { id: 'c3', rank: 12, suit: 'clubs' },
        { id: 'c4', rank: 11, suit: 'diamonds' },
        { id: 'c5', rank: 10, suit: 'spades' }
      ];
      heroInput = { characterId: 'laohuan' };
      selectedIds = ['c1', 'c2', 'c3', 'c4', 'c5'];
      handLevels = { straight: 1 };
    } else if (heroKey === 'wencheng') {
      // azao: previousHandType !== handType triggers +1 mult
      heroInput = { characterId: 'azao', previousHandType: 'high-card' };
      selectedIds = ['c1', 'c2'];
      handLevels = { pair: 1 };
    } else if (heroKey === 'huarui') {
      // xiemu: handsBeforePlay === 1 triggers x2 mult
      heroInput = { characterId: 'xiemu', handsBeforePlay: 1 };
      selectedIds = ['c1', 'c2'];
      handLevels = { pair: 1 };
    }

    const trace = scoreR2Hand({
      rulesVersion: 'r2',
      runId: `hero-${heroKey}`,
      rootId: `hero-${heroKey}/1`,
      characterId: heroInput.characterId ?? 'neutral',
      hand: playingCards,
      selectedIds,
      disabledIds: [],
      jokers: [],
      definitions: R2_JOKERS,
      handLevels,
      playIndex: 1,
      handsBeforePlay: heroInput.handsBeforePlay ?? 4,
      previousHandType: heroInput.previousHandType ?? null,
      wager: heroInput.wager ?? false,
      rng: new SeededRng(`hero-${heroKey}`).snapshot(),
      gold: 5,
      stageHeatBefore: '0',
      stageTargetHeat: '300',
      ...heroInput
    });

    this.currentTrace = trace;
    const scoringItems: ScoringCardItem[] = this.cardItems.map(c => ({
      id: c.id,
      name: c.name,
      transform: c.transform
    }));

    this.orchestrator.startScoringSequence(scoringItems, trace, {
      speedRatio,
      goalScore: '300',
      isStageCleared: true
    });
  }

  public cancel(): void {
    this.phaseHistory = [];
    this.processedEvents = [];
    this.orchestrator.cancel();
    for (const item of this.cardItems) {
      item.transform.reset(0, 0, 1.0, 0);
      item.tilt.reset();
      item.springLayer.y = 0;
      item.springLayer.scaleX = 1.0;
      item.springLayer.scaleY = 1.0;
      item.springLayer.rotation = 0;
      item.tiltLayer.rotation = 0;
      item.tiltLayer.scaleX = 1.0;
      item.tiltLayer.scaleY = 1.0;
    }
    this.hitstopBanner.setAlpha(0);
    this.phaseText.setText('编排时钟: 牌桌就绪 (已立即取消复位)');
  }

  public resetAllTransforms(): void {
    this.phaseHistory = [];
    this.processedEvents = [];
    this.freezeSamples = [];
    this.orchestrator.cancel();
    for (const item of this.cardItems) {
      item.transform.reset(0, 0, 1.0, 0);
      item.tilt.reset();
      item.springLayer.y = 0;
      item.springLayer.scaleX = 1.0;
      item.springLayer.scaleY = 1.0;
      item.springLayer.rotation = 0;
      item.tiltLayer.rotation = 0;
      item.tiltLayer.scaleX = 1.0;
      item.tiltLayer.scaleY = 1.0;
    }
    this.heatText.setText('0');
    this.multText.setText('1');
    this.totalText.setText('0');
    this.hitstopBanner.setAlpha(0);
    this.phaseText.setText('编排时钟: 牌桌就绪 (物理全量复位)');
  }
}

// Instantiate Phaser Game and mount window test state
export function initGameFeelHarness(): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'phaser-container',
    width: 960,
    height: 520,
    backgroundColor: '#13212b',
    scene: [GameFeelScene]
  };

  const game = new Phaser.Game(config);

  game.events.once('ready', () => {
    const scene = game.scene.getScene('GameFeelScene') as GameFeelScene;

    // Attach to global window object for test inspection
    (window as any).__GAMEFEEL_STATE__ = {
      ready: true,
      game,
      scene,
      orchestrator: scene.orchestrator,
      audioEngine: AudioEngine.shared,
      filterTransition: AudioFilterTransition.shared,
      cards: scene.cardItems,
      playNormal: (speed = 1.0) => scene.playNormal(speed),
      playHighMult: (speed = 1.0) => scene.playHighMult(speed),
      playInterleaved: (speed = 1.0) => scene.playInterleaved(speed),
      playNoMult: (speed = 1.0) => scene.playNoMult(speed),
      playDefeat: (speed = 1.0) => scene.playDefeat(speed),
      playHeroSkill: (hero: any, speed = 1.0) => scene.playHeroSkill(hero, speed),
      cancel: () => scene.cancel(),
      reset: () => scene.resetAllTransforms(),
      unlockAudio: () => AudioEngine.shared.unlock(),
      getActiveVoiceCount: () => AudioEngine.shared.getActiveVoiceCount(),
      isAudioContextRunning: () => AudioEngine.shared.isAudioContextRunning(),
      getProcessedEvents: () => [...scene.processedEvents],
      getPhaseHistory: () => [...scene.phaseHistory],
      getFreezeSamples: () => [...scene.freezeSamples],
      toggleMuffle: (sourceId: string, enter: boolean) => {
        if (enter) scene.filterTransition.enterMuffled(sourceId);
        else scene.filterTransition.exitMuffled(sourceId);
      },
      getReadout: () => ({
        phase: scene.orchestrator.getPhase(),
        heat: scene.heatText.text,
        mult: scene.multText.text,
        total: scene.totalText.text,
        isFrozen: HitStopPresentationTimeline.shared.isFrozen(),
        isMuffled: scene.filterTransition.isMuffled(),
        stackDepth: scene.filterTransition.getStackDepth(),
        isVictory: scene.lastResult?.isVictory,
        finalScore: scene.lastResult?.finalScore
      })
    };
  });

  return game;
}

// Auto-start harness on script load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initGameFeelHarness();
  });
}
