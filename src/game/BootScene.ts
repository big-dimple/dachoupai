import Phaser from 'phaser';
import { CHARACTERS } from './characters';
import { queueAvatarLoads } from './portraits';
import {gameSession} from './session';
import {P00_ASSETS,p00AssetUrl} from './theme';

/**
 * 首屏预载小头像和轻量纸桌素材；原始立绘及 GLB 不进入纹理缓存。
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
    queueAvatarLoads(this, CHARACTERS);
    for(const asset of P00_ASSETS)this.load.svg(asset.key,p00AssetUrl(asset.path),{width:asset.width,height:asset.height});
  }

  async create(): Promise<void> {
    await gameSession().initialize();
    this.scene.start('character-select');
  }
}
