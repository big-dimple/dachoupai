import Phaser from 'phaser';
import {AudioEngine} from '../audio/AudioEngine';
import {gameSession} from './session';
import {routeSavedRun} from './RunMenu';
import {SceneView} from './SceneView';

/** A short, immediately usable stage entrance; its animation never starts a run. */
export class TitleScene extends Phaser.Scene {
  private leaving=false;
  private seed?:string;
  private view!:SceneView;
  private firstRender=true;
  private readonly audio=AudioEngine.shared;
  constructor(){super('title');}
  init(data?:{seed?:string}):void {this.seed=data?.seed??new URLSearchParams(location.search).get('seed')??undefined;}
  create():void {
    this.leaving=false;this.firstRender=true;this.audio.setScene('menu');
    this.cameras.main.setBackgroundColor('#153b40');this.view=new SceneView(this,()=>this.render());this.render();
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
      siblings.forEach(scene=>scene.events.off(Phaser.Scenes.Events.START,stopTitle));
    });
  }
  private reducedMotion():boolean {return gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  private render():void {
    if(this.leaving)return;
    const v=this.view,{width:w,height:h}=v.layout,short=h<500,bottom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom'))||0;
    v.clear();v.paperBackground();
    if(this.textures.exists('p03-stage')){
      const stage=this.add.image(w/2,h/2,'p03-stage'),scale=Math.max(w/stage.width,h/stage.height);
      v.add(stage.setScale(scale).setAlpha(.85));
    }
    const titleY=h*(short?.2:.23),titleSize=Math.max(38,Math.min(94,w*.18,h*.15));
    const title=v.text(w/2,titleY,'大丑牌',titleSize,'#203944').setOrigin(.5).setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold').setShadow(0,2,'#fff3d9',4,true,true);
    const hasStage=this.textures.exists('p03-stage'),textColor=hasStage?'#345057':'#e8cf9e';
    if(!hasStage)title.setColor('#fff0ce').setShadow(0,3,'#122331',7,true,true);
    v.text(w/2,titleY+titleSize*.75,'一出戏 · 一副牌',16,textColor).setOrigin(.5);
    if(!short)v.text(w/2,titleY+titleSize*.75+32,'选一位巡演者，把这一手演漂亮。',14,textColor).setOrigin(.5);
    const fanY=short?h*.54:h*.59,cardWidth=Math.min(short?68:112,w*.2),cardHeight=cardWidth*1.42;
    const fan=v.add(this.add.container(w/2,fanY));
    [-1,0,1].forEach((side,i)=>{
      const card=this.add.container(side*cardWidth*.69,Math.abs(side)*9).setAngle(side*13),g=this.add.graphics();
      g.fillStyle(0x071b24,.4).fillRoundedRect(-cardWidth/2+3,-cardHeight/2+6,cardWidth,cardHeight,7);
      g.fillStyle(i===1?0xf2e4c9:0x315f60).fillRoundedRect(-cardWidth/2,-cardHeight/2,cardWidth,cardHeight,7);
      g.lineStyle(1.5,0xc6ad78).strokeRoundedRect(-cardWidth/2,-cardHeight/2,cardWidth,cardHeight,7);card.add(g);
      if(i!==1&&this.textures.exists('p00-card-back'))card.add(this.add.image(0,0,'p00-card-back').setDisplaySize(cardWidth-6,cardHeight-6).setAlpha(.9));
      else {
        const mark=this.add.graphics().fillStyle(0xa24843);
        mark.fillCircle(-cardWidth*.13,-cardHeight*.07,cardWidth*.15).fillCircle(cardWidth*.13,-cardHeight*.07,cardWidth*.15);
        mark.fillTriangle(-cardWidth*.28,-cardHeight*.04,cardWidth*.28,-cardHeight*.04,0,cardHeight*.22);card.add(mark);
      }
      fan.add(card);
    });
    const entrance=this.firstRender&&!this.reducedMotion();this.firstRender=false;
    if(entrance){fan.y+=12;fan.setAlpha(.6);this.tweens.add({targets:fan,y:fanY,alpha:1,duration:360,ease:'Cubic.easeOut'});}
    fan.once('destroy',()=>this.tweens.killTweensOf(fan));
    const session=gameSession(),saved=session.run,canContinue=!!saved&&['idle','readonly'].includes(saved.status),buttonWidth=Math.min(360,w-48),x=(w-buttonWidth)/2;
    const primaryY=h-bottom-(short?86:168),primary={x,y:primaryY,width:buttonWidth,height:52};
    if(saved){
      if(short){
        const rowWidth=Math.min(720,w-48),half=(rowWidth-12)/2,left=(w-rowWidth)/2;
        v.button({...primary,x:left,width:half},'继续本局','action/title-continue',()=>this.continueRun(),canContinue,true);
        v.button({...primary,x:left+half+12,width:half},'选角，开始新局','action/title-start',()=>this.enterNew(),!session.working);
      }else {
        v.button(primary,'继续本局','action/title-continue',()=>this.continueRun(),canContinue,true);
        v.button({x,y:primaryY+62,width:buttonWidth,height:48},'选角，开始新局','action/title-start',()=>this.enterNew(),!session.working);
        v.text(w/2,primaryY-28,'第 '+saved.state.chapter+' 章 · 金币 '+saved.state.gold,14,textColor).setOrigin(.5);
      }
    }else {
      v.button(primary,'点触开场','action/title-start',()=>this.enterNew(),!session.working,true);
      if(!short)v.text(w/2,primaryY+66,'进入选角，确认后才建立新局。',14,'#fff0d2').setOrigin(.5).setShadow(0,1,'#172d36',3,true,true);
    }
    if(session.notice)v.text(24,h-bottom-38,'存档提示请查看右上菜单。',14,'#ffd3b4',w-48).setShadow(0,1,'#172d36',3,true,true);
    title.setName('title/name');
  }
  private enterNew():void {
    if(this.leaving||gameSession().working)return;
    this.leaving=true;this.audio.curtainOpen();this.scene.start('character-select',{seed:this.seed});
  }
  private continueRun():void {
    const saved=gameSession().run;if(this.leaving||!saved||!['idle','readonly'].includes(saved.status))return;
    this.leaving=true;this.audio.titleBell();this.scene.stop();routeSavedRun(this.game);
  }
}
