import Phaser from 'phaser';
import { getCharacter } from './characters';
import {getR2Stage as getStage} from '../domain/r2Run';
import {heatText} from './scoreText';
import { runController, dispatchRun } from './runAdapter';

export interface IntermissionResult {
  /** 本关是否达成目标热度 */
  cleared: boolean;
  /** 刚打完的关卡序号（0-based） */
  stageIndex: number;
  stageHeat: string;
  handsLeft: number;
  /** 本关过关金币奖励（冷场为 0） */
  goldEarned: number;
}

/**
 * 关与关之间的过场状态：展示本关结果，由玩家决定进入下一关或结束本局。
 * 胜负与奖励已经由领域提交；本场景只显示确定结果和下一步入口。
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
    const run = runController(this)?.state;
    if (!run) {
      this.scene.start('character-select');
      return;
    }

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#14120d');

    const stage = getStage(this.result.stageIndex) !;
    const character = getCharacter(run.characterId);

    const title = this.result.cleared
      ? run.phase === 'run-won'
        ? '今日巡演落幕'
        : `${stage.name}，过！`
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
          `达成热度  ${heatText(this.result.stageHeat)} / ${heatText(stage.targetHeat)}`,
          `剩余出牌  ${this.result.handsLeft}    ·    过关奖励  +${this.result.goldEarned} 金币`,
          `巡演累计  ${heatText(run.totalHeat)} 热度    ·    现有金币  ${run.gold}`,
        ]
      : [
          `${stage.name} 差 ${heatText((BigInt(stage.targetHeat)>BigInt(this.result.stageHeat)?BigInt(stage.targetHeat)-BigInt(this.result.stageHeat):0n).toString())} 热度`,
          `巡演止步于此，累计 ${heatText((BigInt(run.totalHeat)+BigInt(this.result.stageHeat)).toString())} 热度`,
        ];

    this.add.text(width / 2, 252, lines.join('\n'), {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '20px',
      color: '#f1e6cc',
      align: 'center',
      lineSpacing: 12,
    }).setOrigin(0.5, 0);

    const nextStage = this.result.cleared && run.phase === 'stage-cleared' ? getStage(run.stageIndex) : undefined;
    if (nextStage) {
      this.add.text(width / 2, 390, `下一关：${nextStage.name}\n${nextStage.intro}`, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '16px',
        color: '#f3cf7c',
        align: 'center',
        lineSpacing: 8,
      }).setOrigin(0.5, 0);
    }

    const buttonLabel = this.result.cleared
      ? nextStage
        ? '去货摊看看'
        : '回到选角'
      : '重新开局';
    this.addButton(width / 2, height - 150, buttonLabel, () => {
      if (this.result.cleared && nextStage) {
        if (dispatchRun(this, { type: 'OpenShop' }).ok) this.scene.start('shop');
      } else {
        // 巡演落幕或冷场：本局结束，回到选角开始新的一局
        this.registry.remove('runState');
        this.registry.remove('runController');
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
