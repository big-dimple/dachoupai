import Phaser from 'phaser';
import { CHARACTERS, type CharacterId } from './characters';

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('character-select');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#090711');

    this.add.text(width / 2, 54, '大 丑 牌', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '52px', fontStyle: 'bold', color: '#fff5df',
    }).setOrigin(0.5);

    this.add.text(width / 2, 104, '今晚，你是哪一种丑？', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '20px', color: '#bcb3cc',
    }).setOrigin(0.5);

    const cardWidth = 340;
    const cardHeight = 220;
    const gapX = 28;
    const gapY = 28;
    const startX = width / 2 - cardWidth - gapX;
    const startY = 250;

    CHARACTERS.forEach((character, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = startX + col * (cardWidth + gapX);
      const y = startY + row * (cardHeight + gapY);
      const container = this.add.container(x, y);

      const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x17131f, 0.98)
        .setStrokeStyle(2, character.accent, 0.72)
        .setInteractive({ useHandCursor: true });

      const badge = this.add.circle(-132, -66, 38, character.accent, 0.18).setStrokeStyle(2, character.accent);
      const initial = this.add.text(-132, -67, character.name.slice(0, 1), {
        fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '30px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5);
      const title = this.add.text(-78, -91, character.title, {
        fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '15px', color: '#aaa1b7',
      });
      const name = this.add.text(-78, -66, character.name, {
        fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '28px', fontStyle: 'bold', color: '#fff9ef',
      });
      const passive = this.add.text(-145, -16, character.passiveName, {
        fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '19px', fontStyle: 'bold', color: '#ffffff',
      });
      const desc = this.add.text(-145, 14, character.passiveDescription, {
        fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '15px', color: '#ddd4e5', wordWrap: { width: 290 },
      });
      const quote = this.add.text(-145, 72, `“${character.quote}”`, {
        fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '13px', fontStyle: 'italic', color: '#8c8495', wordWrap: { width: 290 },
      });

      container.add([bg, badge, initial, title, name, passive, desc, quote]);

      bg.on('pointerover', () => {
        this.tweens.add({ targets: container, scale: 1.035, duration: 120, ease: 'Quad.easeOut' });
        bg.setFillStyle(0x211a2c, 1);
      });
      bg.on('pointerout', () => {
        this.tweens.add({ targets: container, scale: 1, duration: 120, ease: 'Quad.easeOut' });
        bg.setFillStyle(0x17131f, 0.98);
      });
      bg.on('pointerdown', () => this.choose(character.id));
    });

    this.add.text(width / 2, height - 24, '首版角色立绘为程序占位；玩法能力已真实生效', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '13px', color: '#665f70',
    }).setOrigin(0.5);
  }

  private choose(characterId: CharacterId): void {
    this.registry.set('characterId', characterId);
    this.registry.set('seed', new URLSearchParams(window.location.search).get('seed') ?? String(Date.now()));
    this.scene.start('game');
  }
}
