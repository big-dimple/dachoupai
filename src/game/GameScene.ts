import Phaser from 'phaser';
import { AudioEngine } from '../audio/AudioEngine';
import { createShuffledDeck } from '../cards/deck';
import { evaluateHand, type HandType } from '../cards/handEvaluator';
import { rankLabel, SUIT_SYMBOL, type PlayingCard } from '../cards/types';
import { EffectQueue } from '../core/EffectQueue';
import { SeededRng } from '../core/SeededRng';
import { TriggerEngine } from '../core/TriggerEngine';
import { getJoker } from '../jokers/JokerEngine';
import type { JokerId, JokerResolution } from '../jokers/types';
import { advanceStage, createRunState, stageRng, type RunState } from '../run/runState';
import { getStage, stageOrderLabel, type StageDefinition } from '../run/stages';
import { scoreHand, type ScoreResult } from '../scoring/scoreHand';
import { getCharacter, type CharacterId } from './characters';
import type { IntermissionResult } from './IntermissionScene';
import { portraitSquareCrop } from './portraitCrop';

const HAND_SIZE = 8;
const MAX_SELECTED = 5;

interface CardView {
  card: PlayingCard;
  container: Phaser.GameObjects.Container;
}

export class GameScene extends Phaser.Scene {
  private rng!: SeededRng;
  private deck: PlayingCard[] = [];
  private hand: PlayingCard[] = [];
  private selectedIds = new Set<string>();
  private cardViews: CardView[] = [];
  private jokerViews = new Map<JokerId, Phaser.GameObjects.Container>();
  private jokerIds: readonly JokerId[] = [];
  private run!: RunState;
  private stage!: StageDefinition;
  private handsLeft = 0;
  private heat = 0;
  private previousHandType?: HandType;
  private playing = false;
  private characterId!: CharacterId;
  private readonly effects = new EffectQueue();
  private readonly triggers = new TriggerEngine();
  private readonly audio = new AudioEngine();

  private heatText!: Phaser.GameObjects.Text;
  private handsText!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private breakdownText!: Phaser.GameObjects.Text;
  private roleText!: Phaser.GameObjects.Text;
  private playButton!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('game');
  }

  create(): void {
    // 正常路径由选角页建好 runState；深链/冒烟只有 characterId+seed 时现场补建
    const savedRun = this.registry.get('runState') as RunState | undefined;
    const savedCharacter = (savedRun?.characterId ?? this.registry.get('characterId')) as CharacterId | undefined;
    if (!savedCharacter) {
      this.scene.start('character-select');
      return;
    }

    this.run = savedRun ?? createRunState(String(this.registry.get('seed') ?? Date.now()), savedCharacter);
    this.registry.set('runState', this.run);

    const stage = getStage(this.run.stageIndex);
    if (!stage) {
      // 普通关已全部打完，游戏场景无关可打（Boss 关属 Batch 2C）
      this.scene.start('character-select');
      return;
    }
    this.stage = stage;
    this.characterId = this.run.characterId;
    this.jokerIds = this.run.jokerIds;

    // 每关都是全新一场：热度、出牌数、上次牌型、选牌与演出队列全部重置
    this.handsLeft = stage.hands;
    this.heat = 0;
    this.previousHandType = undefined;
    this.selectedIds.clear();
    this.playing = false;
    this.effects.clear();

    const seed = this.run.seed;
    this.rng = stageRng(seed, this.run.stageIndex);
    this.deck = createShuffledDeck(this.rng);
    this.hand = this.draw(HAND_SIZE);

    const { width } = this.scale;
    const character = getCharacter(this.characterId);
    this.cameras.main.setBackgroundColor('#14120d');

    this.add.text(42, 24, '大丑牌', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#fff1c8',
    });
    this.add.text(42, 66, `SEED  ${seed}`, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#8f8267',
    });
    this.add.text(42, 88, `${stageOrderLabel(this.run.stageIndex)} · ${this.stage.name}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#f3cf7c',
    });

    const roleBg = this.add
      .rectangle(width - 200, 56, 344, 76, 0x2b2317, 0.98)
      .setStrokeStyle(2, character.accent, 0.72);

    // HUD 角色区：小型立绘（按 focal 点正方裁切，保住脸）+ 称号 · 名称 + 当前被动
    const portraitSize = 58;
    const portraitX = roleBg.x - roleBg.width / 2 + portraitSize / 2 + 8;
    const portraitKey = `portrait-${character.id}`;
    if (this.textures.exists(portraitKey)) {
      const frame = this.textures.get(portraitKey).getSourceImage() as HTMLImageElement;
      const crop = portraitSquareCrop(frame.width, frame.height, character.portraitFocusX, character.portraitFocusY);
      this.add.image(portraitX, roleBg.y, portraitKey)
        .setCrop(crop.x, crop.y, crop.width, crop.height)
        .setDisplaySize(portraitSize, portraitSize);
    } else {
      this.add.rectangle(portraitX, roleBg.y, portraitSize, portraitSize, character.accent, 0.28)
        .setStrokeStyle(2, character.accent, 0.8);
      this.add.text(portraitX, roleBg.y, character.name.slice(0, 1), {
        fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5);
    }
    this.add.rectangle(portraitX, roleBg.y, portraitSize, portraitSize, 0x000000, 0)
      .setStrokeStyle(2, character.accent, 0.9);

    this.add.text(roleBg.x - 96, roleBg.y - 22, `${character.title} · ${character.name}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fff4d7',
    });
    this.roleText = this.add.text(roleBg.x - 96, roleBg.y + 5, character.passiveName, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#f3cf7c',
    });

    this.heatText = this.add.text(42, 118, '', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#fff7df',
    });
    this.handsText = this.add.text(42, 160, '', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '16px',
      color: '#bdb197',
    });

    this.renderJokerRack();

    this.resultText = this.add
      .text(width / 2, 254, '选 1～5 张牌，开始你的第一个包袱。', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '27px',
        fontStyle: 'bold',
        color: '#f1e6cc',
        align: 'center',
      })
      .setOrigin(0.5);

    this.breakdownText = this.add
      .text(width / 2, 314, '计分来源会在这里逐项展开', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '15px',
        color: '#b9aa8a',
        align: 'center',
        lineSpacing: 5,
      })
      .setOrigin(0.5, 0);

    this.playButton = this.add
      .rectangle(width / 2, 650, 220, 58, 0xa43d2f, 1)
      .setStrokeStyle(2, 0xf1bd68, 0.8)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2, 650, '出 牌', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#fff8e9',
      })
      .setOrigin(0.5)
      .setDepth(2);
    this.playButton.on('pointerdown', () => void this.playSelected());

    this.add
      .text(width - 42, 686, '重新选角色', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#a99c82',
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('character-select'));

    this.updateHud();
    this.renderHand();
  }

  private renderJokerRack(): void {
    const startX = 390;
    const y = 145;
    const cardWidth = 132;
    const gap = 12;

    this.jokerIds.forEach((id, index) => {
      const joker = getJoker(id);
      const x = startX + index * (cardWidth + gap);
      const container = this.add.container(x, y);
      const bg = this.add
        .rectangle(0, 0, cardWidth, 74, 0xf3e5bd, 1)
        .setStrokeStyle(2, joker.rarity === 'rare' ? 0xc84b31 : 0xb88b3d, 0.85);
      const name = this.add
        .text(0, -18, joker.name, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#3e2c1e',
        })
        .setOrigin(0.5);
      const desc = this.add
        .text(0, 12, joker.description, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '10px',
          color: '#6b5840',
          align: 'center',
          wordWrap: { width: cardWidth - 16 },
        })
        .setOrigin(0.5);
      container.add([bg, name, desc]);
      this.jokerViews.set(id, container);
    });
  }

  private draw(count: number): PlayingCard[] {
    const result: PlayingCard[] = [];
    for (let i = 0; i < count && this.deck.length > 0; i += 1) {
      const card = this.deck.pop();
      if (card) result.push(card);
    }
    return result;
  }

  private renderHand(): void {
    this.cardViews.forEach((view) => view.container.destroy());
    this.cardViews = [];

    const { width } = this.scale;
    const cardWidth = 126;
    const gap = 16;
    const total = this.hand.length * cardWidth + Math.max(0, this.hand.length - 1) * gap;
    const startX = (width - total) / 2 + cardWidth / 2;

    this.hand.forEach((card, index) => {
      const x = startX + index * (cardWidth + gap);
      const y = 490;
      const container = this.add.container(x, y);
      const red = card.suit === 'hearts' || card.suit === 'diamonds';
      const bg = this.add
        .rectangle(0, 0, cardWidth, 174, 0xf6eedf, 1)
        .setStrokeStyle(2, 0x8b7455, 0.72)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(-46, -69, `${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '25px',
        fontStyle: 'bold',
        color: red ? '#b83132' : '#252019',
      });
      const suit = this.add
        .text(0, 8, SUIT_SYMBOL[card.suit], {
          fontFamily: 'Georgia, serif',
          fontSize: '62px',
          color: red ? '#bd3435' : '#292219',
        })
        .setOrigin(0.5);

      container.add([bg, label, suit]);
      bg.on('pointerdown', () => this.toggleCard(card.id));
      this.cardViews.push({ card, container });
      if (this.selectedIds.has(card.id)) container.y -= 30;
    });
  }

  private toggleCard(id: string): void {
    if (this.playing) return;
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      if (this.selectedIds.size >= MAX_SELECTED) return;
      this.selectedIds.add(id);
    }
    this.audio.select();
    this.renderHand();
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, resolve);
    });
  }

  private animateRole(note?: string): Promise<void> {
    if (!note) return Promise.resolve();
    this.roleText.setText(note);
    this.audio.role();
    return new Promise((resolve) => {
      this.tweens.add({
        targets: this.roleText,
        scale: { from: 1.28, to: 1 },
        duration: 230,
        ease: 'Back.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  private animateJoker(joker: JokerResolution, chainIndex: number): Promise<void> {
    const view = this.jokerViews.get(joker.id);
    if (!view) return Promise.resolve();
    this.audio.joker(chainIndex);
    return new Promise((resolve) => {
      this.tweens.add({
        targets: view,
        y: view.y - 14,
        scale: 1.12,
        duration: 120,
        yoyo: true,
        hold: 70,
        ease: 'Back.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  private formatBreakdown(score: ScoreResult): string {
    const lines = [
      `牌型：${score.baseHeat} 热度 × ${score.baseMultiplier} 倍率`,
    ];

    if (score.modifier.triggered && score.modifier.note) {
      lines.push(`角色：${score.modifier.note}`);
    }

    score.jokers
      .filter((joker) => joker.triggered)
      .forEach((joker) => lines.push(`大丑牌「${joker.name}」：${joker.note}`));

    lines.push(
      `结算：${score.adjustedHeat} × ${score.adjustedMultiplier.toFixed(1)} × ${score.combinedFinalMultiplier.toFixed(2)} = ${score.finalHeat}`,
    );
    return lines.join('\n');
  }

  private async playSelected(): Promise<void> {
    if (this.playing || this.selectedIds.size === 0 || this.handsLeft <= 0) return;
    this.playing = true;
    this.playButton.disableInteractive();

    const chosen = this.hand.filter((card) => this.selectedIds.has(card.id));
    const evaluated = evaluateHand(chosen);
    const playIndex = this.stage.hands - this.handsLeft + 1;
    const score = scoreHand(evaluated, this.characterId, {
      previousHandType: this.previousHandType,
      handsBeforePlay: this.handsLeft,
      luckRoll: this.rng.next(),
      playIndex,
      jokerIds: this.jokerIds,
    });

    this.triggers.emit('hand:played', { cards: chosen, hand: evaluated });

    this.handsLeft -= 1;
    this.heat += score.finalHeat;
    this.previousHandType = evaluated.type;

    const selectedViews = this.cardViews.filter((view) => this.selectedIds.has(view.card.id));
    this.effects.enqueue(() => {
      this.audio.playHand();
      return Promise.all(
        selectedViews.map(
          (view, index) =>
            new Promise<void>((resolve) => {
              this.tweens.add({
                targets: view.container,
                y: view.container.y - 70,
                angle: index % 2 === 0 ? -4 : 4,
                alpha: 0.25,
                duration: 210,
                delay: index * 30,
                ease: 'Cubic.easeIn',
                onComplete: () => resolve(),
              });
            }),
        ),
      ).then(() => undefined);
    });

    if (score.modifier.triggered) {
      this.effects.enqueue(async () => {
        this.triggers.emit('role:triggered', score.modifier);
        await this.animateRole(score.modifier.note);
        await this.wait(70);
      });
    }

    score.jokers
      .filter((joker) => joker.triggered)
      .forEach((joker, index) => {
        this.effects.enqueue(async () => {
          this.triggers.emit('joker:triggered', joker);
          this.resultText.setText(`大丑牌「${joker.name}」触发！\n${joker.note}`);
          await this.animateJoker(joker, index);
          await this.wait(90);
        });
      });

    this.effects.enqueue(() => {
      this.triggers.emit('score:resolved', score);
      this.resultText.setText(`${evaluated.label}   +${score.finalHeat} 热度`);
      this.breakdownText.setText(this.formatBreakdown(score));
      this.audio.score(Math.min(4, score.adjustedMultiplier));
      this.tweens.add({
        targets: this.resultText,
        scale: { from: 1.22, to: 1 },
        duration: 300,
        ease: 'Back.easeOut',
      });
    });

    await this.effects.drain();

    this.hand = this.hand.filter((card) => !this.selectedIds.has(card.id));
    this.selectedIds.clear();
    this.hand.push(...this.draw(HAND_SIZE - this.hand.length));
    this.updateHud();

    if (this.heat >= this.stage.targetHeat) {
      this.finishStage(true);
      return;
    }

    if (this.handsLeft <= 0) {
      this.finishStage(false);
      return;
    }

    this.renderHand();
    this.playButton.setInteractive({ useHandCursor: true });
    this.playing = false;
  }

  /** 本关结束：先让玩家看清结果，再进入明确的过场状态 */
  private finishStage(cleared: boolean): void {
    const completedIndex = this.run.stageIndex;
    const stageHeat = this.heat;

    if (cleared) {
      this.resultText.setText(`全场失控！\n${stageHeat.toLocaleString()} 热度`);
      this.cameras.main.flash(420, 255, 231, 181, false);
      this.run = advanceStage(this.run, stageHeat);
      this.registry.set('runState', this.run);
    } else {
      this.resultText.setText(
        `冷场了。\n差 ${Math.max(0, this.stage.targetHeat - stageHeat).toLocaleString()} 热度`,
      );
    }

    this.time.delayedCall(1000, () => {
      this.scene.start('intermission', {
        cleared,
        stageIndex: completedIndex,
        stageHeat,
        handsLeft: this.handsLeft,
      } satisfies IntermissionResult);
    });
  }

  private updateHud(): void {
    this.heatText.setText(`热度  ${this.heat.toLocaleString()} / ${this.stage.targetHeat.toLocaleString()}`);
    this.handsText.setText(`剩余出牌  ${this.handsLeft}    ·    牌堆  ${this.deck.length}`);
  }
}
