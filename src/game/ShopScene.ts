import Phaser from 'phaser';
import { getJoker } from '../jokers/JokerEngine';
import type { JokerId, JokerRarity } from '../jokers/types';
import type { RunState } from '../run/runState';
import { getStage, stageOrderLabel } from '../run/stages';
import {
  buyJoker,
  canBuyJoker,
  drawShelf,
  jokerPrice,
  MAX_JOKER_SLOTS,
  payReroll,
  REROLL_COST,
  shopPool,
  shopRng,
} from '../run/shop';

const RARITY_COLOR: Record<JokerRarity, number> = {
  common: 0xb88b3d,
  uncommon: 0x4f8f6f,
  rare: 0xc84b31,
};

const BUY_ERROR_TEXT = {
  'already-owned': '已装备',
  'slots-full': '槽位已满',
  'not-enough-gold': '金币不足',
} as const;

/**
 * 后台货摊（Batch 2B）：过关后进店，买大丑牌 / 刷新货架 / 进入下一关。
 * 规则全部走 src/run/shop.ts 纯函数；本场景只做展示与点击。
 */
export class ShopScene extends Phaser.Scene {
  private run!: RunState;
  private rng!: import('../core/SeededRng').SeededRng;
  private shelf: JokerId[] = [];

  private goldText!: Phaser.GameObjects.Text;
  private slotContainer!: Phaser.GameObjects.Container;
  private shelfContainer!: Phaser.GameObjects.Container;
  private rerollButton!: Phaser.GameObjects.Rectangle;
  private rerollLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('shop');
  }

  create(): void {
    const run = this.registry.get('runState') as RunState | undefined;
    if (!run || !getStage(run.stageIndex)) {
      // 没有进行中的局，或普通关已打完（落幕/冷场后不该进店）
      this.scene.start('character-select');
      return;
    }
    this.run = run;
    // 货架随机与关卡随机隔离；同一次进店内刷新消耗同一序列
    this.rng = shopRng(run.seed, run.stageIndex);
    this.shelf = drawShelf(this.rng, shopPool(run));

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#14120d');

    this.add.text(42, 30, '后台货摊', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#fff1c8',
    });
    const nextStage = getStage(this.run.stageIndex)!;
    this.add.text(42, 76, `下一关：${stageOrderLabel(this.run.stageIndex)} · ${nextStage.name}（目标 ${nextStage.targetHeat.toLocaleString()} 热度）`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '15px',
      color: '#b9aa8a',
    });
    this.goldText = this.add.text(width - 42, 36, '', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#f3cf7c',
    }).setOrigin(1, 0);

    // 装备槽（最多 5 格）
    this.slotContainer = this.add.container(0, 0);
    this.add.text(42, 132, `装备槽（${MAX_JOKER_SLOTS}）`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '16px',
      color: '#bdb197',
    });

    // 货架
    this.shelfContainer = this.add.container(0, 0);
    this.add.text(42, 306, '今日货品', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '16px',
      color: '#bdb197',
    });

    // 刷新 + 进入下一关
    this.rerollButton = this.add
      .rectangle(42 + 110, height - 96, 220, 54, 0x2b3a4a, 1)
      .setStrokeStyle(2, 0x7fb3d5, 0.7)
      .setInteractive({ useHandCursor: true });
    this.rerollLabel = this.add.text(42 + 110, height - 96, '', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#dceefb',
    }).setOrigin(0.5);
    this.rerollButton.on('pointerdown', () => this.reroll());

    const isRunStart = this.run.stageIndex === 0;
    const nextButton = this.add
      .rectangle(width - 42 - 130, height - 96, 260, 58, 0xa43d2f, 1)
      .setStrokeStyle(2, 0xf1bd68, 0.8)
      .setInteractive({ useHandCursor: true });
    this.add.text(width - 42 - 130, height - 96, isRunStart ? '开 局' : '进入下一关', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#fff8e9',
    }).setOrigin(0.5).setDepth(2);
    nextButton.on('pointerdown', () => this.scene.start('game'));

    this.renderAll();
  }

  private renderAll(): void {
    this.goldText.setText(`金币  ${this.run.gold}`);
    this.renderSlots();
    this.renderShelf();
    this.renderReroll();
  }

  private renderSlots(): void {
    this.slotContainer.removeAll(true);
    const slotW = 150;
    const gap = 14;
    const startX = 42 + slotW / 2;
    const y = 206;
    for (let i = 0; i < MAX_JOKER_SLOTS; i += 1) {
      const x = startX + i * (slotW + gap);
      const equipped = this.run.jokerIds[i];
      const box = this.add.rectangle(x, y, slotW, 96, 0x1d1810, 1);
      if (equipped) {
        const joker = getJoker(equipped);
        box.setStrokeStyle(2, RARITY_COLOR[joker.rarity], 0.9);
        this.slotContainer.add([
          box,
          this.add.text(x, y - 20, joker.name, {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#fff4d7',
          }).setOrigin(0.5),
          this.add.text(x, y + 14, joker.description, {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '11px', color: '#c9bb9c',
            align: 'center', wordWrap: { width: slotW - 14 },
          }).setOrigin(0.5),
        ]);
      } else {
        box.setStrokeStyle(1, 0x5a4d38, 0.6);
        this.slotContainer.add([
          box,
          this.add.text(x, y, '空', {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '15px', color: '#5a4d38',
          }).setOrigin(0.5),
        ]);
      }
    }
  }

  private renderShelf(): void {
    this.shelfContainer.removeAll(true);
    if (this.shelf.length === 0) {
      this.shelfContainer.add(
        this.add.text(42, 356, '货摊空了——牌都卖完了。', {
          fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '16px', color: '#8f8267',
        }),
      );
      return;
    }
    const cardW = 250;
    const cardH = 210;
    const gap = 24;
    const startX = 42 + cardW / 2;
    const y = 340 + cardH / 2;

    this.shelf.forEach((id, index) => {
      const joker = getJoker(id);
      const price = jokerPrice(id);
      const error = canBuyJoker(this.run, id);
      const x = startX + index * (cardW + gap);
      const accent = RARITY_COLOR[joker.rarity];

      const bg = this.add.rectangle(x, y, cardW, cardH, 0xf3e5bd, error ? 0.55 : 1)
        .setStrokeStyle(2, accent, 0.9);
      const children: Phaser.GameObjects.GameObject[] = [
        bg,
        this.add.text(x, y - cardH / 2 + 24, joker.name, {
          fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#3e2c1e',
        }).setOrigin(0.5),
        this.add.text(x, y - 20, joker.description, {
          fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '13px', color: '#6b5840',
          align: 'center', wordWrap: { width: cardW - 28 },
        }).setOrigin(0.5),
      ];

      const priceText = error
        ? `${price} 金币 · ${BUY_ERROR_TEXT[error]}`
        : `${price} 金币`;
      children.push(
        this.add.text(x, y + cardH / 2 - 30, priceText, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '16px',
          fontStyle: 'bold',
          color: error ? '#9a8a70' : '#a43d2f',
        }).setOrigin(0.5),
      );

      if (!error) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.buy(id));
      }
      this.shelfContainer.add(children);
    });
  }

  private renderReroll(): void {
    const affordable = this.run.gold >= REROLL_COST;
    const hasGoods = shopPool(this.run).length > 0;
    const enabled = affordable && hasGoods;
    this.rerollLabel.setText(
      !hasGoods ? '已无货可换' : affordable ? `换一批（${REROLL_COST} 金币）` : `换一批需 ${REROLL_COST} 金币`,
    );
    this.rerollButton.setFillStyle(0x2b3a4a, enabled ? 1 : 0.45);
    if (enabled) {
      this.rerollButton.setInteractive({ useHandCursor: true });
    } else {
      this.rerollButton.disableInteractive();
    }
  }

  private buy(id: JokerId): void {
    if (canBuyJoker(this.run, id)) return;
    this.run = buyJoker(this.run, id);
    this.registry.set('runState', this.run);
    this.shelf = this.shelf.filter((item) => item !== id);
    this.renderAll();
  }

  private reroll(): void {
    if (this.run.gold < REROLL_COST || shopPool(this.run).length === 0) return;
    this.run = payReroll(this.run);
    this.registry.set('runState', this.run);
    this.shelf = drawShelf(this.rng, shopPool(this.run));
    this.renderAll();
  }
}
