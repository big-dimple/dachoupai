import Phaser from 'phaser';
import { CHARACTERS } from './characters';
import { queueCharacterPreviewLoads } from './portraits';
import {gameSession} from './session';
import {P00_ASSETS,assetUrl} from './theme';

/**
 * 首屏预载独立头像、选角缩略和轻量纸桌素材；原始立绘及 GLB 不进入纹理缓存。
 * 单张加载失败只记录告警，不影响其余资源与后续 Scene 启动。
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    // File-local settings are required: Phaser's image defaults otherwise override loader.timeout with 0.
    const imageXHR:Phaser.Types.Loader.XHRSettingsObject={responseType:'blob',timeout:5000};
    const svgXHR:Phaser.Types.Loader.XHRSettingsObject={responseType:'text',timeout:5000};
    this.load.maxRetries=0;
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[boot] 资源加载失败（已跳过，不阻断游戏）: ${file.key} -> ${file.url}`);
    });
    queueCharacterPreviewLoads(this, CHARACTERS,imageXHR);
    for(const asset of P00_ASSETS)this.load.svg(asset.key,assetUrl(asset.path),{width:asset.width,height:asset.height},svgXHR);
    // D44: the paper stage is procedural; the former heavy timber backdrop is not preloaded.
  }

  async create(): Promise<void> {
    await Promise.all([gameSession().initialize(),Promise.race([document.fonts.load('800 36px "Dachoupai Score"').catch(()=>[]),new Promise(resolve=>setTimeout(resolve,800))])]);
    if(!this.scene.isActive())return;
    const query=new URLSearchParams(location.search),seed=query.get('seed')??undefined;
    this.scene.start('title',{seed});
  }
}
