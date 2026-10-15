import {LoadingScreen,prepareDestination} from './LoadingScreen';
import Phaser from 'phaser';
import {gameSession} from './session';
import {P00_ASSETS,assetUrl} from './theme';

/** Paper first, then bounded decoded thumbnails; large detail art and music never gate entry. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  private loading?:LoadingScreen;
  preload(): void {
    this.loading=new LoadingScreen();let loaded=0,failed=0;const refresh=()=>this.loading?.update({loaded,failed,total:P00_ASSETS.length,pending:P00_ASSETS.length-loaded-failed,states:[]},'铺好纸面与纹样');this.load.on('filecomplete',()=>{loaded++;refresh();});this.load.on('loaderror',()=>{failed++;refresh();});refresh();
    // File-local settings are required: Phaser's image defaults otherwise override loader.timeout with 0.
    const svgXHR:Phaser.Types.Loader.XHRSettingsObject={responseType:'text',timeout:5000};
    this.load.maxRetries=0;
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[boot] 资源加载失败（已跳过，不阻断游戏）: ${file.key} -> ${file.url}`);
    });
    for(const asset of P00_ASSETS)this.load.svg(asset.key,assetUrl(asset.path),{width:asset.width,height:asset.height},svgXHR);
    // D44: the paper stage is procedural; the former heavy timber backdrop is not preloaded.
  }

  async create(): Promise<void> {
    await Promise.all([gameSession().initialize(),Promise.race([document.fonts.load('800 36px "Dachoupai Score"').catch(()=>[]),new Promise(resolve=>setTimeout(resolve,800))])]);
    if(!this.scene.isActive())return;
    const query=new URLSearchParams(location.search),seed=query.get('seed')??undefined;
    const prepared=await prepareDestination(this.game,'title',true,this.loading);this.loading=undefined;if(!prepared)return;
    if(this.scene.isActive())this.scene.start('title',{seed});
  }
}
