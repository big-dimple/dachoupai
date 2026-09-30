import Phaser from 'phaser';
import { CHARACTERS, type CharacterId } from './characters';
import { addPortraitInBox } from './portraits';
import { startRun } from './runAdapter';

const GRID_COLS = 3;

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('character-select');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#090711');

    this.add.text(width / 2, 46, '大 丑 牌', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '44px', fontStyle: 'bold', color: '#fff5df',
    }).setOrigin(0.5);

    this.add.text(width / 2, 88, '今晚，你是哪一种丑？', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '18px', color: '#bcb3cc',
    }).setOrigin(0.5);

    const cardWidth = 368;
    const cardHeight = 256;
    const gapX = 24;
    const gapY = 20;
    const gridW = GRID_COLS * cardWidth + (GRID_COLS - 1) * gapX;
    const startX = width / 2 - gridW / 2 + cardWidth / 2;
    const startY = 128 + cardHeight / 2;

    CHARACTERS.forEach((character, index) => {
      const col = index % GRID_COLS;
      const row = Math.floor(index / GRID_COLS);
      const x = startX + col * (cardWidth + gapX);
      const y = startY + row * (cardHeight + gapY);
      const container = this.add.container(x, y);

      const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x17131f, 0.98)
        .setStrokeStyle(2, character.accent, 0.72)
        .setInteractive({ useHandCursor: true });

      // 上半：立绘展示框（cover 裁切，不挡下方文字）
      const boxW = cardWidth - 16;
      const boxH = 158;
      const boxY = -cardHeight / 2 + 8 + boxH / 2;
      const frame = this.add.rectangle(0, boxY, boxW, boxH, 0x0d0a14, 1)
        .setStrokeStyle(1, character.accent, 0.35);
      container.add([bg, frame]);
      addPortraitInBox(this, container, character, 0, boxY, boxW, boxH);

      // 下半：称号 / 角色名 / 被动
      const infoY = -cardHeight / 2 + 8 + boxH + 18;
      const title = this.add.text(-boxW / 2 + 4, infoY - 14, character.title, {
        fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '14px', color: '#aaa1b7',
      });
      const name = this.add.text(-boxW / 2 + 4, infoY + 6, character.name, {
        fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '23px', fontStyle: 'bold', color: '#fff9ef',
      });
      const passive = this.add.text(-boxW / 2 + 110, infoY + 2, character.passiveName, {
        fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '15px', fontStyle: 'bold', color: `#${character.accent.toString(16).padStart(6, '0')}`,
      });
      const desc = this.add.text(-boxW / 2 + 110, infoY + 26, character.passiveDescription, {
        fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '12px', color: '#ddd4e5', wordWrap: { width: boxW - 110 },
      });
      container.add([title, name, passive, desc]);

      bg.on('pointerover', () => {
        this.tweens.add({ targets: container, scale: 1.04, duration: 120, ease: 'Quad.easeOut' });
        bg.setFillStyle(0x211a2c, 1);
        bg.setStrokeStyle(2, character.accent, 1);
      });
      bg.on('pointerout', () => {
        this.tweens.add({ targets: container, scale: 1, duration: 120, ease: 'Quad.easeOut' });
        bg.setFillStyle(0x17131f, 0.98);
        bg.setStrokeStyle(2, character.accent, 0.72);
      });
      bg.on('pointerdown', () => {
        this.tweens.add({ targets: container, scale: 0.97, duration: 70, ease: 'Quad.easeIn' });
        this.time.delayedCall(95, () => this.choose(character.id));
      });
    });

    this.add.text(width / 2, height - 20, '点选角色开局 · 六个身份，六种活法', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '13px', color: '#665f70',
    }).setOrigin(0.5);
  }

  private choose(characterId: CharacterId): void {
    const seed = new URLSearchParams(window.location.search).get('seed') ?? String(Date.now());
    this.registry.set('characterId', characterId);
    this.registry.set('seed', seed);
    startRun(this, seed, characterId);
    // 每局从货摊开始：起手金币先淘一张大丑牌，再进第一关
    this.scene.start('shop');
  }
}
