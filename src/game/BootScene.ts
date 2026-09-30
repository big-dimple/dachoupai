import Phaser from 'phaser';
import { CHARACTERS } from './characters';
import { queuePortraitLoads } from './portraits';
import {gameSession} from './session';

/**
 * 资源预加载层：只负责把六张立绘拉进纹理缓存。
 * 单张加载失败只记录告警，不影响其余资源与后续 Scene 启动。
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[boot] 资源加载失败（已跳过，不阻断游戏）: ${file.key} -> ${file.url}`);
    });
    queuePortraitLoads(this, CHARACTERS);
  }

  async create(): Promise<void> {
    await gameSession().initialize();
    this.scene.start('character-select');
  }
}
