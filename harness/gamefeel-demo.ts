/**
 * harness/gamefeel-demo.ts
 * Real Phaser 3 Application Harness for Tang/Song Game Feel & Audio Elevation.
 * 
 * Formal Integration Architecture:
 * - Runs authentic Phaser.Game and Phaser.Scene instance.
 * - Uses real PhaserCardTilt on innerVisual layers (preserving container transforms).
 * - Uses real ScoringRhythmOrchestrator consuming real domain ScoreTrace from scoreR2Hand.
 * - Routes all audio through formal AudioEngine public methods (playPentatonicNote, playWarDrum, playTempleBell).
 * - Low-pass filter cleanly attached to AudioEngine music bus with nested modal stack support.
 * - Exposes window.__GAMEFEEL_STATE__ for automated Playwright & Vitest assertions.
 */

import Phaser from 'phaser';
import { AudioEngine } from '../src/audio/AudioEngine';
import { AudioFilterTransition } from '../src/gamefeel/AudioFilterTransition';
import { PhaserCardTilt } from '../src/gamefeel/PhaserCardTilt';
import { ScoringRhythmOrchestrator, ScoringCardItem, ScoringPhase } from '../src/gamefeel/ScoringRhythmOrchestrator';
import { SpringCardTransform, SPRING_PRESETS } from '../src/gamefeel/SpringMotion';
import { HitStopPresentationTimeline } from '../src/gamefeel/HitStopPresentationTimeline';
import { scoreR2Hand, type ScoreInput, type ScoreTrace } from '../src/domain/scoreR2';
import { R2_JOKERS } from '../src/content/r2Schema';
import { r2CreateJoker } from '../src/domain/r2Run';
import { SeededRng } from '../src/core/SeededRng';
import { PlayingCard } from '../src/cards/types';

export interface DemoCardData {
  id: string;
  name: string;
  rank: number;
  suit: 'spades' | 'hearts' | 'clubs' | 'diamonds';
  character: string;
}

const DEMO_CARDS: DemoCardData[] = [
  { id: 'c1', name: '苏轼·风起赤壁', rank: 14, suit: 'spades', character: '苏轼' },
  { id: 'c2', name: '秦琼·踏破山河', rank: 13, suit: 'hearts', character: '秦琼' },
  { id: 'c3', name: '辛弃疾·挑灯看剑', rank: 12, suit: 'clubs', character: '辛弃疾' },
  { id: 'c4', name: '刘娥·大宋之母', rank: 11, suit: 'diamonds', character: '刘娥' },
  { id: 'c5', name: '文成·藏地迎宾', rank: 10, suit: 'spades', character: '文成公主' },
];

export interface CardObjectItem {
  id: string;
  name: string;
  container: Phaser.GameObjects.Container;
  innerVisual: Phaser.GameObjects.Container;
  transform: SpringCardTransform;
  tilt: PhaserCardTilt;
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

    // Decorative inner table mat (paper parchment with brass border)
    const mat = this.add.graphics();
    mat.fillStyle(0x1c2f3d, 0.9);
    mat.fillRoundedRect(30, 30, width - 60, height - 60, 16);
    mat.lineStyle(2, 0xd0af72, 0.85);
    mat.strokeRoundedRect(30, 30, width - 60, height - 60, 16);

    // Subtle table header
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

    // Hit-stop Banner (Explosive multiplier burst visual)
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

    // Build 5 Interactive Phaser Cards
    this.buildCards(width, height);

    // Initialize Scoring Rhythm Orchestrator with real callbacks
    this.orchestrator = new ScoringRhythmOrchestrator({
      onCardStrike: (idx, card, event) => {
        // Visual indicator on card
        const item = this.cardItems.find(c => c.id === card.id);
        if (item) {
          this.tweens.add({
            targets: item.innerVisual,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 90 / this.currentSpeed,
            yoyo: true
          });
        }
      },
      onClimaxBurst: (event, mult) => {
        // Screen shake and banner punch
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

      // Outer container strictly owned by layout / GameScene
      const container = this.add.container(cardX, cardY);
      container.setSize(cardWidth, cardHeight);

      // Inner visual layer that receives 2.5D tilt & spring animations
      const innerVisual = this.add.container(0, 0);
      innerVisual.setName('card-visual');

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

      // 3. Card Art placeholder / motif
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

      innerVisual.add([shadow, bg, art, cornerText, heroName, skillName]);
      container.add(innerVisual);

      // Card Spring Physics
      const transform = new SpringCardTransform(0, 0, 1.0, 0);

      // 2.5D Perspective Tilt Component (modifies innerVisual only, never hijacking drag)
      const tilt = new PhaserCardTilt(container, cardWidth, cardHeight, innerVisual, {
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
        innerVisual,
        transform,
        tilt
      });
    });
  }

  update(time: number, delta: number): void {
    const dtSeconds = delta / 1000;

    // 1. Advance Scoring Rhythm Orchestrator
    this.orchestrator.update(dtSeconds);

    // 2. Advance 2.5D Card Tilt and Spring Physics
    for (const item of this.cardItems) {
      item.tilt.update();

      // Apply spring motion to innerVisual
      item.innerVisual.y = item.transform.y.value;
      item.innerVisual.scaleX = item.transform.scaleX.value;
      item.innerVisual.scaleY = item.transform.scaleY.value;
    }
  }

  // --- Real Scenario Triggers Using scoreR2Hand ---

  public playNormal(speedRatio: number = 1.0): void {
    this.currentSpeed = speedRatio;
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

  public playNoMult(speedRatio: number = 1.0): void {
    this.currentSpeed = speedRatio;
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

    // Final score is far below 9000 goal -> isStageCleared is FALSE
    this.orchestrator.startScoringSequence(scoringItems, trace, {
      speedRatio,
      goalScore: '9000',
      isStageCleared: false
    });
  }

  public playHeroSkill(heroKey: 'sushi' | 'liue' | 'qinqiong' | 'xinqiji' | 'wencheng' | 'huarui', speedRatio: number = 1.0): void {
    this.currentSpeed = speedRatio;
    const cards: PlayingCard[] = [
      { id: 'c1', rank: 14, suit: 'spades' },
      { id: 'c2', rank: 14, suit: 'hearts' },
      { id: 'c3', rank: 10, suit: 'clubs' },
      { id: 'c4', rank: 8, suit: 'diamonds' },
      { id: 'c5', rank: 7, suit: 'spades' }
    ];

    let heroInput: Partial<ScoreInput> = {};
    if (heroKey === 'sushi') {
      heroInput = { characterId: 'amo', amoScoreTiming: 'after-joker' };
    } else if (heroKey === 'liue') {
      heroInput = { characterId: 'erxiang', erxiangHandoff: { targetId: 'c1', beforeUsed: false } };
    } else if (heroKey === 'qinqiong') {
      heroInput = { characterId: 'touye', wager: true };
    } else if (heroKey === 'xinqiji') {
      heroInput = { characterId: 'laohuan', laohuanTrick: true };
    } else if (heroKey === 'wencheng') {
      heroInput = { characterId: 'azao', azaoCharge: { before: { charge: 0, previousQualifiedType: null }, release: false } };
    } else if (heroKey === 'huarui') {
      heroInput = { characterId: 'xiemu', xiemuBurn: { cost: 0, goldBefore: 5, beforeUsed: false } };
    }

    const trace = scoreR2Hand({
      rulesVersion: 'r2',
      runId: `hero-${heroKey}`,
      rootId: `hero-${heroKey}/1`,
      characterId: heroInput.characterId ?? 'neutral',
      hand: cards,
      selectedIds: ['c1', 'c2', 'c3'],
      disabledIds: [],
      jokers: [],
      definitions: R2_JOKERS,
      handLevels: { 'three-kind': 1 },
      playIndex: 1,
      handsBeforePlay: 4,
      previousHandType: null,
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
    this.orchestrator.cancel();
    this.hitstopBanner.setAlpha(0);
    this.phaseText.setText('编排时钟: 牌桌就绪 (已立即取消复位)');
  }

  public resetAllTransforms(): void {
    this.phaseHistory = [];
    this.orchestrator.cancel();
    for (const item of this.cardItems) {
      item.transform.reset(0, 0, 1.0, 0);
      item.innerVisual.y = 0;
      item.innerVisual.scaleX = 1.0;
      item.innerVisual.scaleY = 1.0;
      item.innerVisual.rotation = 0;
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
      playNoMult: (speed = 1.0) => scene.playNoMult(speed),
      playDefeat: (speed = 1.0) => scene.playDefeat(speed),
      playHeroSkill: (hero: any, speed = 1.0) => scene.playHeroSkill(hero, speed),
      cancel: () => scene.cancel(),
      reset: () => scene.resetAllTransforms(),
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
