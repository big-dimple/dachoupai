import Phaser from 'phaser';
import { createShuffledDeck } from '../cards/deck';
import { evaluateHand, type HandType } from '../cards/handEvaluator';
import { rankLabel, SUIT_SYMBOL, type PlayingCard } from '../cards/types';
import { EffectQueue } from '../core/EffectQueue';
import { SeededRng } from '../core/SeededRng';
import { TriggerEngine } from '../core/TriggerEngine';
import { AudioEngine } from '../audio/AudioEngine';
import { getCharacter, type CharacterId } from './characters';
import { scoreHand } from '../scoring/scoreHand';

const HAND_SIZE = 8;
const MAX_SELECTED = 5;
const STARTING_HANDS = 4;
const TARGET_HEAT = 1600;

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
  private handsLeft = STARTING_HANDS;
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
  private roleText!: Phaser.GameObjects.Text;
  private playButton!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('game');
  }

  create(): void {
    const savedCharacter = this.registry.get('characterId') as CharacterId | undefined;
    if (!savedCharacter) {
      this.scene.start('character-select');
      return;
    }

    this.characterId = savedCharacter;
    const seed = String(this.registry.get('seed') ?? Date.now());
    this.rng = new SeededRng(seed);
    this.deck = createShuffledDeck(this.rng);
    this.hand = this.draw(HAND_SIZE);

    const { width } = this.scale;
    const character = getCharacter(this.characterId);
    this.cameras.main.setBackgroundColor('#090711');

    this.add.text(42, 28, '大丑牌', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '34px', fontStyle: 'bold', color: '#fff3df',
    });
    this.add.text(42, 70, `SEED  ${seed}`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#655e70',
    });

    const roleBg = this.add.rectangle(width - 190, 58, 320, 72, 0x17131f, 1)
      .setStrokeStyle(2, character.accent, 0.7);
    this.add.text(roleBg.x - 138, roleBg.y - 22, `${character.title} · ${character.name}`, {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#fff7eb',
    });
    this.roleText = this.add.text(roleBg.x - 138, roleBg.y + 5, character.passiveName, {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '14px', color: '#ffffff',
    });

    this.heatText = this.add.text(42, 132, '', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '32px', fontStyle: 'bold', color: '#fff7ec',
    });
    this.handsText = this.add.text(42, 177, '', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '16px', color: '#a9a0b4',
    });

    this.resultText = this.add.text(width / 2, 245, '选 1～5 张牌，开始你的第一个包袱。', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '28px', fontStyle: 'bold', color: '#dcd4e8', align: 'center',
    }).setOrigin(0.5);

    this.playButton = this.add.rectangle(width / 2, 645, 220, 62, 0x8d284c, 1)
      .setStrokeStyle(2, 0xff7aa8, 0.7)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, 645, '出 牌', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(2);
    this.playButton.on('pointerdown', () => void this.playSelected());

    this.add.text(width - 42, 682, '重新选角色', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '14px', color: '#8e8597',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('character-select'));

    this.triggers.on<{ note?: string }>('role:triggered', ({ note }) => {
      if (!note) return;
      this.roleText.setText(note);
      this.audio.role();
      this.tweens.add({ targets: this.roleText, scale: { from: 1.25, to: 1 }, duration: 240, ease: 'Back.easeOut' });
    });

    this.updateHud();
    this.renderHand();
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
      const y = 475;
      const container = this.add.container(x, y);
      const red = card.suit === 'hearts' || card.suit === 'diamonds';
      const bg = this.add.rectangle(0, 0, cardWidth, 174, 0xf3eadb, 1)
        .setStrokeStyle(2, 0x5e5369, 0.65)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(-46, -69, `${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]}`, {
        fontFamily: 'Georgia, serif', fontSize: '25px', fontStyle: 'bold', color: red ? '#bb274c' : '#201b26',
      });
      const suit = this.add.text(0, 8, SUIT_SYMBOL[card.suit], {
        fontFamily: 'Georgia, serif', fontSize: '62px', color: red ? '#c42d50' : '#241d29',
      }).setOrigin(0.5);

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

  private async playSelected(): Promise<void> {
    if (this.playing || this.selectedIds.size === 0 || this.handsLeft <= 0) return;
    this.playing = true;
    this.playButton.disableInteractive();

    const chosen = this.hand.filter((card) => this.selectedIds.has(card.id));
    const evaluated = evaluateHand(chosen);
    const score = scoreHand(evaluated, this.characterId, {
      previousHandType: this.previousHandType,
      handsBeforePlay: this.handsLeft,
      luckRoll: this.rng.next(),
    });

    this.triggers.emit('hand:played', { cards: chosen, hand: evaluated });
    if (score.modifier.triggered) this.triggers.emit('role:triggered', score.modifier);

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

    this.effects.enqueue(() => {
      this.resultText.setText(`${evaluated.label}   +${score.finalHeat} 热度${score.modifier.note ? `\n${score.modifier.note}` : ''}`);
      this.audio.score(Math.min(4, score.baseMultiplier));
      this.tweens.add({ targets: this.resultText, scale: { from: 1.22, to: 1 }, duration: 300, ease: 'Back.easeOut' });
    });

    await this.effects.drain();

    this.hand = this.hand.filter((card) => !this.selectedIds.has(card.id));
    this.selectedIds.clear();
    this.hand.push(...this.draw(HAND_SIZE - this.hand.length));
    this.updateHud();

    if (this.heat >= TARGET_HEAT) {
      this.resultText.setText(`全场失控！\n${this.heat.toLocaleString()} 热度`);
      this.cameras.main.flash(420, 255, 230, 180, false);
      this.playing = false;
      return;
    }

    if (this.handsLeft <= 0) {
      this.resultText.setText(`冷场了。\n差 ${Math.max(0, TARGET_HEAT - this.heat).toLocaleString()} 热度`);
      this.playing = false;
      return;
    }

    this.renderHand();
    this.playButton.setInteractive({ useHandCursor: true });
    this.playing = false;
  }

  private updateHud(): void {
    this.heatText.setText(`热度  ${this.heat.toLocaleString()} / ${TARGET_HEAT.toLocaleString()}`);
    this.handsText.setText(`剩余出牌  ${this.handsLeft}    ·    牌堆  ${this.deck.length}`);
  }
}
