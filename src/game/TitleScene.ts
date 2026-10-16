import {GAME_NAME} from './Brand';
import {warmOpeningImages} from './StageImageWarmup';
import {paperSceneStart} from './PaperFlow';
import Phaser from 'phaser';
import {AudioEngine} from '../audio/AudioEngine';
import {gameSession} from './session';
import {routeSavedRun} from './RunMenu';
import {selectionModeName} from './ModeSelectDialog';
import {characterForRun} from './CharacterRunCopy';
import {HomePage} from './HomePage';

/** The paper home shares loading artwork; native actions keep the original new/continue routes. */
export class TitleScene extends Phaser.Scene {
  private leaving=false;
  private seed?:string;
  private home?:HomePage;
  private confirmation?:Phaser.Time.TimerEvent;
  private readonly audio=AudioEngine.shared;
  constructor(){super('title');}
  init(data?:{seed?:string}):void {this.seed=data?.seed??new URLSearchParams(location.search).get('seed')??undefined;}
  create():void {
    this.leaving=false;this.audio.setScene('menu');this.cameras.main.setBackgroundColor('#F3EADB');
    this.home?.destroy();this.home=new HomePage({start:()=>this.enterNew(),resume:()=>this.continueRun()});this.render();warmOpeningImages(this);
    this.game.canvas.setAttribute('aria-label',GAME_NAME+' · 首页');this.game.canvas.setAttribute('aria-hidden','true');
    const keyboardOpen=(event:KeyboardEvent)=>{
      const element=document.activeElement;
      if(element!==document.body&&element!==this.game.canvas||document.querySelector('dialog[open]'))return;
      event.preventDefault();const saved=gameSession().run;
      if(saved&&['idle','readonly'].includes(saved.status))this.continueRun();else this.enterNew();
    };
    this.input.keyboard?.on('keydown-ENTER',keyboardOpen);this.input.keyboard?.on('keydown-SPACE',keyboardOpen);
    const stopTitle=()=>{if(this.scene.isActive())this.scene.stop();};
    const siblings=['character-select','shop','game','intermission'].map(key=>this.scene.get(key));
    siblings.forEach(scene=>scene.events.on(Phaser.Scenes.Events.START,stopTitle));
    const unsubscribe=gameSession().subscribe(()=>{if(this.scene.isActive()&&!this.leaving)this.render();});
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.leaving=true;unsubscribe();this.input.keyboard?.off('keydown-ENTER',keyboardOpen);this.input.keyboard?.off('keydown-SPACE',keyboardOpen);
      this.confirmation?.remove();this.confirmation=undefined;this.home?.destroy();this.home=undefined;this.game.canvas.removeAttribute('aria-hidden');
      siblings.forEach(scene=>scene.events.off(Phaser.Scenes.Events.START,stopTitle));
    });
  }
  private reducedMotion():boolean {return gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  private render():void {
    if(this.leaving)return;
    const session=gameSession(),saved=session.run;
    this.home?.update({summary:saved?[characterForRun(saved.state).name,selectionModeName(saved.state)+'模式',...(saved.state.tourMode==='endless'?['无尽']:[]),'第 '+saved.state.chapter.toLocaleString('zh-CN')+' 章','金币 '+saved.state.gold.toLocaleString('zh-CN')]:undefined,canContinue:!!saved&&['idle','readonly'].includes(saved.status),canStart:!session.working,notice:!!session.notice,reduced:this.reducedMotion()});
  }
  private enterNew():void {
    if(this.leaving||gameSession().working)return;
    this.confirmTitle(()=>{this.audio.curtainOpen();paperSceneStart(this,'character-select',{seed:this.seed},true);});
  }
  private continueRun():void {
    const saved=gameSession().run;if(this.leaving||!saved||!['idle','readonly'].includes(saved.status))return;
    this.confirmTitle(()=>{this.audio.titleBell();this.scene.stop();routeSavedRun(this.game);});
  }
  private confirmTitle(leave:()=>void):void {
    this.leaving=true;this.home?.confirm();this.audio.titleConfirm();
    if(this.reducedMotion()){leave();return;}
    this.confirmation=this.time.delayedCall(200,()=>{this.confirmation=undefined;if(this.scene.isActive())leave();});
  }
}
