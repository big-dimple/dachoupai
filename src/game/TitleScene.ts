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
    const v=this.view,l=v.layout,{width:w,height:h}=l,short=h<500,style=getComputedStyle(document.documentElement),bottom=parseFloat(style.getPropertyValue('--safe-bottom'))||0,right=parseFloat(style.getPropertyValue('--safe-right'))||0,left=parseFloat(style.getPropertyValue('--safe-left'))||0;
    const session=gameSession(),saved=session.run,canContinue=!!saved&&['idle','readonly'].includes(saved.status);
    const buttonWidth=short?Math.min(340,(w-left-right-64)*.44):Math.min(360,w-48),x=short?w-right-24-buttonWidth:(w-buttonWidth)/2,visualX=short?(left+x)/2:w/2;
    v.clear();v.paperBackground();
    if(this.textures.exists('p03-stage')){
      const stage=this.add.image(w/2,h/2,'p03-stage'),scale=Math.max(w/stage.width,h/stage.height);
      v.add(stage.setScale(scale).setAlpha(.85));
    }
    const titleSize=short?Math.max(32,Math.min(50,(h-l.hud.y-bottom)*.2)):Math.max(38,Math.min(w<700?56:94,w*.18,h*.15)),titleY=short?l.hud.y+titleSize*.6+4:h*.23;
    const title=v.text(visualX,titleY,'大丑牌',titleSize,'#203944').setOrigin(.5).setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold').setShadow(0,2,'#fff3d9',4,true,true);
    const hasStage=this.textures.exists('p03-stage'),textColor=hasStage?'#345057':'#e8cf9e';
    if(!hasStage)title.setColor('#fff0ce').setShadow(0,3,'#122331',7,true,true);
    v.text(visualX,titleY+titleSize*.75,'一出戏 · 一副牌',16,textColor).setOrigin(.5);
    const fanTop=titleY+titleSize*.75+28,fanRoom=Math.max(24,h-bottom-18-fanTop),fanY=short?fanTop+fanRoom/2:h*.56,cardWidth=short?Math.min(82,(x-left-48)/3.5,fanRoom/1.9):Math.min(112,w*.2),cardHeight=cardWidth*1.42;
    const fan=v.add(this.add.container(visualX,fanY));
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
    const primaryY=short?l.hud.y+(h-l.hud.y-bottom-(saved?112:52))/2:h-bottom-168,primary={x,y:primaryY,width:buttonWidth,height:52};
    if(saved){
      v.button(primary,'继续本局','action/title-continue',()=>this.continueRun(),canContinue,true);
      v.button({x,y:primaryY+62,width:buttonWidth,height:48},'选角，开始新局','action/title-start',()=>this.enterNew(),!session.working);
      const modeLabel=saved.state.mode==='standard'?`普通 D${saved.state.difficulty}`:saved.state.mode==='tutorial'?'教程':`挑战 ${saved.state.challengeId}`;
      v.text(short?x+buttonWidth/2:w/2,short?primaryY+128:primaryY-28,modeLabel+' · '+(saved.state.tourMode==='endless'?'无尽 · ':'')+'第 '+saved.state.chapter+' 章 · 金币 '+saved.state.gold,14,textColor,buttonWidth).setOrigin(.5).setAlign('center');
    }else {
      v.button(primary,'点触开场','action/title-start',()=>this.enterNew(),!session.working,true);
      if(!short)v.text(w/2,primaryY+66,'选角色即可开场，模式可在选角页调整。',14,'#fff0d2').setOrigin(.5).setShadow(0,1,'#172d36',3,true,true);
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
