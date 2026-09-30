import Phaser from 'phaser';
import { getCharacter } from './characters';
import { getStage, stageOrderLabel, type StageDefinition } from '../run/stages';
import { allStagesCleared, type RunState } from '../run/runState';

export interface IntermissionResult {
  /** 本关是否达成目标热度 */
  cleared: boolean;
  /** 刚打完的关卡序号（0-based） */
  stageIndex: number;
  stageHeat: number;
  handsLeft: number;
}

/**
 * 关与关之间的过场状态：展示本关结果，由玩家决定进入下一关或结束本局。
 * 胜利/失败的正式结算与台词属 Batch 2C，这里只放骨架流转。
 */
export class IntermissionScene extends Phaser.Scene {
  private result!: IntermissionResult;

  constructor() {
    super('intermission');
  }

  init(data: IntermissionResult): void {
    this.result = data;
  }

  create(): void {
    const run = this.registry.get('runState') as RunState | undefined;
    if (!run) {
      this.scene.start('character-select');
      return;
    }

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#14120d');

    const stage = getStage(this.result.stageIndex) as StageDefinition;
    const character = getCharacter(run.characterId);

    const title = this.result.cleared
      ? allStagesCleared(run)
        ? '今日巡演落幕'
        : `${stageOrderLabel(this.result.stageIndex)} · ${stage.name}，过！`
      : '冷场了';

    this.add.text(width / 2, 150, title, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '44px',
      fontStyle: 'bold',
      color: this.result.cleared ? '#ffe7b5' : '#b9aa8a',
      align: 'center',
    }).setOrigin(0.5);

    const lines = this.result.cleared
      ? [
          `达成热度  ${this.result.stageHeat.toLocaleString()} / ${stage.targetHeat.toLocaleString()}`,
          `剩余出牌  ${this.result.handsLeft}`,
          `巡演累计  ${run.totalHeat.toLocaleString()} 热度`,
        ]
      : [
          `${stageOrderLabel(this.result.stageIndex)} · ${stage.name} 差 ${Math.max(0, stage.targetHeat - this.result.stageHeat).toLocaleString()} 热度`,
          `巡演止步于此，累计 ${(run.totalHeat + this.result.stageHeat).toLocaleString()} 热度`,
        ];

    this.add.text(width / 2, 252, lines.join('\n'), {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '20px',
      color: '#f1e6cc',
      align: 'center',
      lineSpacing: 12,
    }).setOrigin(0.5, 0);

    const nextStage = this.result.cleared && !allStagesCleared(run) ? getStage(run.stageIndex) : undefined;
    if (nextStage) {
      this.add.text(width / 2, 390, `下一关：${stageOrderLabel(run.stageIndex)} · ${nextStage.name}\n${nextStage.intro}`, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '16px',
        color: '#f3cf7c',
        align: 'center',
        lineSpacing: 8,
      }).setOrigin(0.5, 0);
    }

    const buttonLabel = this.result.cleared
      ? nextStage
        ? '进入下一关'
        : '回到选角'
      : '重新开局';
    this.addButton(width / 2, height - 150, buttonLabel, () => {
      if (this.result.cleared && nextStage) {
        this.scene.start('game');
      } else {
        // 巡演落幕或冷场：本局结束，回到选角开始新的一局
        this.registry.remove('runState');
        this.scene.start('character-select');
      }
    });

    this.add.text(width / 2, height - 84, `${character.title} · ${character.name}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#8f8267',
    }).setOrigin(0.5);
  }

  private addButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add
      .rectangle(x, y, 240, 60, 0xa43d2f, 1)
      .setStrokeStyle(2, 0xf1bd68, 0.8)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#fff8e9',
    }).setOrigin(0.5).setDepth(2);
    button.on('pointerdown', onClick);
  }
}
