import {LoadingScreen,prepareDestination,cancelDestinationPreparation} from './LoadingScreen';
import Phaser from 'phaser';
import {gameSession} from './session';
import {P00_ASSETS,assetUrl} from './theme';

/** Paper first, then bounded decoded thumbnails; large detail art and music never gate entry. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  private loading?:LoadingScreen;
  private generation=0;
  preload(): void {
    this.generation++;this.loading=new LoadingScreen();const loading=this.loading,loaded=new Set<string>(),failed=new Set<string>();const refresh=()=>loading.base(loaded.size,P00_ASSETS.length,failed.size);
    const complete=(key:string)=>{loaded.add(key);failed.delete(key);refresh();},failure=(file:Phaser.Loader.File)=>{if(!loaded.has(file.key))failed.add(file.key);refresh();console.warn(`[boot] 资源暂未就绪，将自动恢复: ${file.key} -> ${file.url}`);};
    this.load.on('filecomplete',complete);this.load.on('loaderror',failure);refresh();
    this.events.once('shutdown',()=>{this.generation++;this.load.off('filecomplete',complete);this.load.off('loaderror',failure);cancelDestinationPreparation(this.game,'title');loading.close();if(this.loading===loading)this.loading=undefined;});
    // File-local settings are required: Phaser's image defaults otherwise override loader.timeout with 0.
    const svgXHR:Phaser.Types.Loader.XHRSettingsObject={responseType:'text',timeout:5000};
    this.load.maxRetries=0;
    for(const asset of P00_ASSETS)this.load.svg(asset.key,assetUrl(asset.path),{width:asset.width,height:asset.height},svgXHR);
    // D44: the paper stage is procedural; the former heavy timber backdrop is not preloaded.
  }

  async create(): Promise<void> {
    const generation=this.generation,loading=this.loading;
    await Promise.all([gameSession().initialize(),Promise.race([document.fonts.load('800 36px "Dachoupai Score"').catch(()=>[]),new Promise(resolve=>setTimeout(resolve,800))])]);
    if(!this.scene.isActive()||generation!==this.generation)return;
    const query=new URLSearchParams(location.search),seed=query.get('seed')??undefined;
    const prepared=await prepareDestination(this.game,'title',true,loading);if(generation!==this.generation)return;this.loading=undefined;if(!prepared)return;
    if(this.scene.isActive())this.scene.start('title',{seed});
  }
}
