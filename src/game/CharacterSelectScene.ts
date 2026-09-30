import Phaser from 'phaser';
import { CHARACTERS, type CharacterId } from './characters';
import { addPortraitInBox } from './portraits';
import { startRun } from './runAdapter';
import {gameSession} from './session';

const GRID_COLS = 3;

export class CharacterSelectScene extends Phaser.Scene {
  private choosing=false;
  private lifecycle=0;
  constructor() {
    super('character-select');
  }

  create(): void {
    this.choosing=false;this.lifecycle++;
    this.events.once('shutdown',()=>{this.lifecycle++;this.time.removeAllEvents();this.tweens.killAll();});
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
        if(this.choosing)return;
        this.choosing=true;
        this.tweens.add({ targets: container, scale: 0.97, duration: 70, ease: 'Quad.easeIn' });
        this.time.delayedCall(95, () => this.choose(character.id));
      });
    });

    this.add.text(width / 2, height - 20, '点选角色开局 · 六个身份，六种活法', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '13px', color: '#665f70',
    }).setOrigin(0.5);
  }

  private async choose(characterId: CharacterId): Promise<void> {
    const lifecycle=this.lifecycle;
    const existing=gameSession().run;
    if(existing&&!['run-won','run-lost'].includes(existing.state.phase)&&!window.confirm('开始新局将替换当前进度。当前有效存档会保留为备份，是否继续？')){this.choosing=false;return;}
    const seed = new URLSearchParams(window.location.search).get('seed') ?? String(Date.now());
    this.registry.set('characterId', characterId);
    this.registry.set('seed', seed);
    const controller=await startRun(this,seed,characterId);
    if(lifecycle!==this.lifecycle||!this.scene.isActive())return;
    if(!controller||controller.status!=='idle'){this.choosing=false;return;}
    // 每局从货摊开始：起手金币先淘一张大丑牌，再进第一关
    this.scene.start('shop');
  }
}
