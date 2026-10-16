import {GAME_NAME} from './Brand';
import {heroText} from './HeroIdentity';
import {warmOpeningImages,warmHeroImage} from './StageImageWarmup';
import {showHeroExplanation} from './HeroExplanation';
import {showHeroPortrait} from './HeroPortraitDialog';
import {paperSceneStart} from './PaperFlow';
import {inkSettlingEase} from './inkwaveSpring';
import {characterForNewRun} from './CharacterRunCopy';
import {HERO_OPENING,OPENING_ROUTES} from './HeroOpeningCopy';
import {BUILD_FOCUS,chooseBuildFocus,type BuildFocus} from './BuildJourney';
import {deferOpeningIntent} from './HeroOpeningIntent';
import Phaser from 'phaser';
import {AudioEngine} from '../audio/AudioEngine';
import {CHARACTERS,getCharacter,type CharacterId} from './characters';
import {addAvatar,selectionPortraitKey,portraitKey,avatarKey} from './portraits';
import {startRun} from './runAdapter';
import {gameSession} from './session';
import {routeSavedRun} from './RunMenu';
import {SceneView} from './SceneView';
import {DetailDialog} from './DetailDialog';
import {ModeSelectDialog,DEFAULT_MODE_SELECTION,selectionModeName,type ModeChoice} from './ModeSelectDialog';
import {R2_MODE_CATALOG,r2RunModeConfig,type R2ModeSelection} from '../content/r2Modes';
import {r2ModeUnlocked} from '../domain/r2Progress';
import {readRunProgress} from '../platform/RunProgress';
import type {Box} from './layout';
import {selectionLayout} from './SelectionLayout';
import {openingShowcaseLayout} from './OpeningShowcaseLayout';
import {SELECTION_PRESENTATION} from './SelectionPresentation';
import {showSelectionComparison} from './SelectionComparison';
import {showSelectionSample} from './SelectionSampleDialog';
import {heroPlaySample,routePlaySample} from './OpeningPlaySample';
import {PAPER_THEME} from './theme';

interface SelectionOptions {freshSeed?:boolean;seed?:string;characterId?:CharacterId;modeConfig?:R2ModeSelection}
/** The selector reserves its action row before sizing cards; it never borrows table space. */

export class CharacterSelectScene extends Phaser.Scene {
  private choosing=false;
  private lifecycle=0;
  private selectedId?:CharacterId;
  private step:'hero'|'route'='hero';
  private selectedRoute?:BuildFocus;
  private seed?:string;
  private modeConfig:R2ModeSelection=DEFAULT_MODE_SELECTION;
  private notice='';
  private animateChoice=false;
  private readonly openingMotion=new Map<Phaser.GameObjects.GameObject,()=>void>();
  private view!:SceneView;
  private readonly portraitTargets=new Map<Phaser.GameObjects.Container,{id:CharacterId;box:Box;hero:boolean;fill:boolean}>();
  private readonly dialog=new DetailDialog();
  private readonly modeDialog=new ModeSelectDialog();
  private readonly audio=AudioEngine.shared;
  constructor(){super('character-select');}
  init(data?:SelectionOptions):void {
    this.step='hero';this.selectedRoute=undefined;
    this.modeConfig=data?.modeConfig??DEFAULT_MODE_SELECTION;r2RunModeConfig(this.modeConfig);
    this.selectedId=this.modeConfig.mode==='tutorial'?'erxiang':data?.characterId;
    this.seed=this.modeConfig.mode==='tutorial'?R2_MODE_CATALOG.tutorial.config.seedPolicy.values[0]:data?.seed??(data?.freshSeed?String(Date.now()):undefined);
  }
  create():void {
    this.choosing=false;this.notice='';this.animateChoice=false;this.lifecycle++;
    this.cameras.main.setBackgroundColor('#F3EADB');this.audio.setScene('menu');
    this.view=new SceneView(this,()=>this.render());
    const refreshImage=(key:string)=>{
      if(!this.scene.isActive())return;
      for(const [holder,target] of this.portraitTargets)if(holder.active&&[selectionPortraitKey(target.id),avatarKey(target.id),...(target.hero?[portraitKey(target.id)]:[])].includes(key))this.paintPortrait(holder,target.id,target.box,target.hero,target.fill);
    };
    this.textures.on('addtexture',refreshImage);this.events.once('shutdown',()=>this.textures.off('addtexture',refreshImage));warmOpeningImages(this);
    const session=gameSession();let pending=session.pendingRun;
    const unsubscribe=session.subscribe(()=>{const prior=pending;pending=session.pendingRun;
      if(prior&&!pending&&!this.choosing&&this.scene.isActive()){this.notice=session.notice;this.render();}
    });
    const settle=()=>{for(const [target,finish] of this.openingMotion){this.tweens.killTweensOf(target);finish();}this.openingMotion.clear();};
    const hide=()=>{if(document.hidden)settle();};window.addEventListener('blur',settle);window.addEventListener('dachoupai-presentation',settle);document.addEventListener('visibilitychange',hide);
    this.events.once('shutdown',()=>{settle();window.removeEventListener('blur',settle);window.removeEventListener('dachoupai-presentation',settle);document.removeEventListener('visibilitychange',hide);unsubscribe();this.lifecycle++;this.dialog.close();this.modeDialog.close();});this.render();
  }
  private render():void {
    this.portraitTargets.clear();
    const v=this.view,l=v.layout,style=getComputedStyle(document.documentElement),bottom=parseFloat(style.getPropertyValue('--safe-bottom'))||0;
    const p=selectionLayout(l.width,l.height,l.hud.y,bottom,this.step,parseFloat(style.getPropertyValue('--safe-left'))||0,parseFloat(style.getPropertyValue('--safe-right'))||0),config=r2RunModeConfig(this.modeConfig);v.clear();this.game.canvas.setAttribute('aria-label',GAME_NAME+' · 选择人物'+(this.selectedId?' · 当前'+getCharacter(this.selectedId).name:''));v.paperBackground();
    v.text(p.x,p.top,this.step==='hero'?'英雄登场':'选一条路',p.short||p.portrait?24:30,'#26313A').setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold');
    const modeLabel=selectionModeName(this.modeConfig);
    const modeWidth=p.portrait?96:112,controlsRight=Math.max(12,parseFloat(style.getPropertyValue('--safe-right'))||0),menuWidth=l.width<=700?44:64;
    v.button({x:Math.min(p.x+p.w-modeWidth,l.width-controlsRight-menuWidth-8-modeWidth),y:(parseFloat(style.getPropertyValue('--safe-top'))||0)+12,width:modeWidth,height:44},`模式 · ${modeLabel}`,'action/select-mode',()=>this.selectMode(),!this.choosing);
    if(!p.short&&!p.portrait)v.text(p.x,p.top+40,this.step==='hero'?'先选英雄，再选路线':'先定方向，进店能换',14,'#3F606B',p.w);
    this.showHero(p,config.characterAbilityEnabled);
    if(this.step==='hero')CHARACTERS.forEach((character,i)=>{
      const b=p.cards[i],selected=character.id===this.selectedId,first=v.root.length;
      const accent=HERO_OPENING[character.id].accent,color=parseInt(accent.slice(1),16);
      v.material(b,selected?0xe2e8e5:0xfff9ee,0xfff9ee,6);
      const identity=SELECTION_PRESENTATION[character.id];
      const compact=p.portrait||p.short;
      const picture=compact?{x:b.x+4,y:b.y+3,width:Math.min(24,b.width*.24),height:b.height-25}:{x:b.x+6,y:b.y+5,width:b.width*.44,height:b.height-10};
      if(character.portrait&&!p.short)this.drawPortrait(character.id,picture);
      const tx=p.short?b.x+6:!character.portrait?b.x+8:compact?b.x+picture.width+7:b.x+b.width*.48,tw=b.x+b.width-tx-5;
      this.singleLine(tx,b.y+(compact?3:29),character.name,compact?16:20,selected?accent:'#26313A',tw,14,true).setName('opening/seat-name');
      this.singleLine(compact?b.x+b.width/2:tx,b.y+(compact?b.height-20:62),identity.tag,14,'#3F606B',compact?b.width-8:tw).setOrigin(compact?.5:0,0).setName('opening/seat-tag');
      if(selected)v.text(b.x+b.width-5,b.y+b.height-22,'✓',14,accent).setOrigin(1,0).setName('opening/selected-mark');
      v.add(this.add.graphics().lineStyle(selected?2:1,selected?color:0xc7b89d).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,6));
      const wrap=this.wrapCard(first,b),hit=v.rect(b).setFillStyle(0,0).setStrokeStyle(0);
      if(selected)hit.setData('selected',true);
      v.target(hit,`character/${character.id}`,{tap:()=>this.select(character.id),detail:()=>this.inspect(character.id),enter:wrap.enter,leave:wrap.leave});
    });
    else BUILD_FOCUS.forEach((focus,i)=>{
      const b=p.routes[i],copy=OPENING_ROUTES[focus],selected=this.selectedRoute===focus;
      v.material(b,selected?0xe2e8e5:0xfff9ee,0xfff9ee,6);
      v.add(this.add.graphics().lineStyle(selected?2:1,selected?0xb8473a:0xc7b89d).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,6));
      if(p.portrait&&b.width<200){
        this.singleLine(b.x+b.width/2,b.y+16,copy.title,16,selected?'#B8473A':'#26313A',b.width-12).setOrigin(.5,0).setFontStyle('bold');
      }else if(p.portrait){
        v.text(b.x+9,b.y+6,copy.title,18,selected?'#B8473A':'#26313A').setFontStyle('bold');
        v.text(b.x+100,b.y+6,copy.play,14,'#3F606B',b.width-108);
      }else{
        v.text(b.x+(p.short?8:14),b.y+(p.short?3:8),copy.title,p.short?16:22,selected?'#B8473A':'#26313A').setFontStyle('bold');
        if(!p.short)v.text(b.x+14,b.y+38,copy.example,16,'#386D65',b.width-28);
        if(!p.short||b.width>=220)v.text(b.x+(p.short?8:14),b.y+(p.short?24:62),copy.play,14,'#26313A',b.width-(p.short?16:28));
      }
      const hit=v.rect(b).setFillStyle(0,0).setStrokeStyle(0).setData('selected',selected);
      v.target(hit,'route/'+focus,{tap:()=>{if(!this.choosing){this.selectedRoute=focus;this.notice='';this.animateChoice=true;this.audio.select();this.render();}}});
    });
    this.animateChoice=false;
    const existing=gameSession().run,canReturn=!!existing&&!['run-won','run-lost'].includes(existing.state.phase);
    v.button(p.cancel,this.step==='route'?'返回':this.modeConfig.mode==='tutorial'?'跳过':this.selectedId?'取消':canReturn?'回本局':'返回','action/cancel-character',()=>void this.cancelChoice(),!this.choosing);
    v.button(p.details,p.short?'对比':'比一比','action/character-details',()=>this.compareHeroes(),!this.choosing);
    v.button(p.confirm,this.choosing?'正在开始…':this.step==='hero'?(p.short?'选路线':'选路线 →'):(p.short?'开始':'开始对局'),'action/confirm-character',()=>void this.confirmChoice(),!this.choosing&&!!this.selectedId&&(this.step==='hero'||!!this.selectedRoute),true);
    const status=this.selectedId?getCharacter(this.selectedId).name+(this.step==='route'?(this.selectedRoute?' · '+OPENING_ROUTES[this.selectedRoute].title+' · 确认才开局':' · 三条路线都能玩'):this.modeConfig.mode==='tutorial'?' · 教程固定角色':' · 下一步选路线'):'点一位英雄，决定谁来对局。';
    v.text(p.x,p.noticeY,this.notice||status,14,this.notice?'#B8473A':'#3F606B',p.w).setName('opening/status');
  }
  private showHero(p:ReturnType<typeof selectionLayout>,abilityEnabled:boolean):void {
    const v=this.view,c=characterForNewRun(this.selectedId??'amo'),copy=HERO_OPENING[c.id],b=p.hero,q=openingShowcaseLayout(b,p.portrait,p.short);
    const stacked=p.portrait&&b.height>=300;
    v.material(b,PAPER_THEME.jadeSoft,PAPER_THEME.jadeSoft,8);
    v.add(this.add.graphics().lineStyle(1,PAPER_THEME.jade,.25).strokeRoundedRect(b.x+4,b.y+4,b.width-8,b.height-8,6));
    if(c.portrait){
      this.queueHeroPortrait(c.id);this.drawPortrait(c.id,q.art,true,stacked);
      const artHit=v.rect(q.art).setFillStyle(0,0).setStrokeStyle(0);
      v.target(artHit,'opening/portrait-full',{tap:()=>this.inspectPortrait(c.id),detail:()=>this.inspectPortrait(c.id)});
      const hintWidth=Math.min(112,q.art.width);
      v.material({x:q.art.x+q.art.width-hintWidth,y:q.art.y+q.art.height-24,width:hintWidth,height:24},PAPER_THEME.paper,PAPER_THEME.paper,4);
      v.text(q.art.x+q.art.width-6,q.art.y+q.art.height-22,'点击查看全图',14,'#3F606B').setOrigin(1,0).setName('opening/portrait-hint');
    }
    const x=q.copy.x,w=q.copy.width,compact=p.portrait||p.short;
    const name=this.singleLine(x,q.copy.y,c.name,p.short?20:compact?24:44,copy.accent,w,20,true).setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setName('opening/name');
    const skill=this.singleLine(stacked?x+name.width+12:x,stacked?name.y+7:name.y+name.height+4,c.passiveName,compact?16:22,'#3F606B',stacked?w-name.width-12:w,14,true).setName('opening/skill-tag');
    const effectY=Math.max(name.y+name.height,skill.y+skill.height)+4;
    const effect=v.text(x,effectY,abilityEnabled?c.quickEffect:'此挑战关闭角色能力',compact?14:18,'#26313A',w).setName('opening/skill-hook');
    if(abilityEnabled&&c.skillTags.length)v.text(x,effect.y+effect.height+4,c.skillTags.join(' · '),14,'#3F606B',w).setName('opening/skill-conditions');
    const half=(q.demo.width-8)/2;
    v.button({...q.demo,width:half},'故事 · 技能','opening/hero-details',()=>this.inspect(c.id),!this.choosing);
    v.button({...q.demo,x:q.demo.x+half+8,width:half},this.step==='hero'?'技能例子':this.selectedRoute?'路线例子':'先选路线','action/opening-sample',()=>{this.audio.select();showSelectionSample(this.dialog,c.name+' · '+(this.step==='hero'?'技能例子':'路线例子'),this.step==='hero'?heroPlaySample(c.id):routePlaySample(this.selectedRoute!,c.id));},!this.choosing&&abilityEnabled&&(this.step==='hero'||!!this.selectedRoute));
    if(this.animateChoice&&!this.reducedMotion()){
      name.setAlpha(.65);this.trackOpening(name,()=>name.active&&name.setAlpha(1));this.tweens.add({targets:name,alpha:1,duration:180,ease:inkSettlingEase(.24)});name.once('destroy',()=>this.tweens.killTweensOf(name));
    }
  }
  private trackOpening(target:Phaser.GameObjects.GameObject,finish:()=>void):void {this.openingMotion.set(target,finish);target.once('destroy',()=>{this.tweens.killTweensOf(target);this.openingMotion.delete(target);});}
  private reducedMotion():boolean {return gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  private queueHeroPortrait(id:CharacterId):void {
    warmHeroImage(this,id);
  }
  private drawPortrait(id:CharacterId,b:Box,hero=false,fill=false):void {
    const holder=this.view.add(this.add.container(0,0));this.portraitTargets.set(holder,{id,box:b,hero,fill});this.paintPortrait(holder,id,b,hero,fill);
  }
  /** Replace only the picture; late previews must never destroy a pressed action target. */
  private paintPortrait(holder:Phaser.GameObjects.Container,id:CharacterId,b:Box,hero:boolean,fill:boolean):void {
    holder.removeAll(true);
    const key=hero&&this.textures.exists(portraitKey(id))?portraitKey(id):selectionPortraitKey(id);
    if(!this.textures.exists(key)){addAvatar(this,holder,getCharacter(id),b.x+b.width/2,b.y+b.height/2,Math.min(b.width,b.height));return;}
    const image=this.add.image(0,0,key),scale=fill?Math.min(1,b.width/image.width):Math.min(b.width/image.width,b.height/image.height);
    if(hero)image.setName('opening/portrait').setData('openingBounds',b);
    if(fill){const visibleHeight=Math.min(image.height,b.height/scale);image.setCrop(0,0,image.width,visibleHeight).setOrigin(.5,0).setScale(scale).setPosition(b.x+b.width/2,b.y);}
    else image.setScale(scale).setPosition(b.x+b.width/2,b.y+b.height/2);holder.add(image);
  }
  /** Card content drawn since `first` is wrapped into one hoverable, liftable container. */
  private wrapCard(first:number,b:Box):{art:Phaser.GameObjects.Container;enter:()=>void;leave:()=>void} {
    const v=this.view,cx=b.x+b.width/2,cy=b.y+b.height/2,art=this.add.container(cx,cy);
    for(const child of v.root.list.slice(first)){
      if(child instanceof Phaser.GameObjects.Image||child instanceof Phaser.GameObjects.Text||child instanceof Phaser.GameObjects.Graphics||child instanceof Phaser.GameObjects.Rectangle||child instanceof Phaser.GameObjects.Arc||child instanceof Phaser.GameObjects.Container){
        child.setPosition(child.x-cx,child.y-cy);art.add(child);
      }
    }
    v.add(art);
    const glow=this.add.graphics().lineStyle(3,0x3f606b,.92).strokeRoundedRect(-b.width/2-1,-b.height/2-1,b.width+2,b.height+2,8).setAlpha(0);art.add(glow);
    const reduced=()=>gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const leave=()=>{if(!art.active)return;this.tweens.killTweensOf(art);glow.setAlpha(0);if(reduced())art.setPosition(cx,cy).setScale(1);else this.tweens.add({targets:art,x:cx,y:cy,scaleX:1,scaleY:1,duration:120,ease:'Sine.easeOut'});};
    art.once('destroy',()=>this.tweens.killTweensOf(art));
    return {art,enter:()=>{if(!art.active||this.choosing)return;this.tweens.killTweensOf(art);glow.setAlpha(1);v.root.bringToTop(art);if(!reduced())this.tweens.add({targets:art,y:cy-5,scaleX:1.02,scaleY:1.02,duration:130,ease:'Sine.easeOut'});},leave};
  }
  private singleLine(x:number,y:number,value:string,size:number,color:string,width:number,minSize=14,bold=false):Phaser.GameObjects.Text {
    const text=this.view.text(x,y,value,size,color);if(bold)text.setFontStyle('bold');
    for(let font=size;text.width>width&&font>minSize;)text.setFontSize(--font);
    return text;
  }
  private select(id:CharacterId):void {
    if(this.choosing)return;
    if(this.modeConfig.mode==='tutorial'&&id!=='erxiang'){this.notice=heroText('教程固定二响；跳过教程后可自由选角。');this.audio.invalid();this.render();return;}
    this.selectedId=id;this.notice='';this.animateChoice=true;this.audio.select();this.render();
  }
  private compareHeroes():void {
    if(this.choosing)return;
    showSelectionComparison(this.dialog,{selectedId:this.selectedId,abilityEnabled:r2RunModeConfig(this.modeConfig).characterAbilityEnabled,tutorial:this.modeConfig.mode==='tutorial',select:id=>this.select(id),inspect:id=>this.inspect(id)});
  }

  private inspectPortrait(id:CharacterId):void {
    if(this.choosing)return;showHeroPortrait(this.dialog,id);
  }
  private inspect(id:CharacterId):void {
    if(this.choosing)return;
    const tutorialOther=this.modeConfig.mode==='tutorial'&&id!=='erxiang';
    showHeroExplanation(this.dialog,id,{abilityEnabled:r2RunModeConfig(this.modeConfig).characterAbilityEnabled,closeLabel:'回到选角',status:tutorialOther?heroText('教程固定二响；退出教程后可选择这位英雄。'):undefined,actions:this.selectedId===id||tutorialOther?[]:[{label:'选中角色',run:()=>{this.select(id);this.dialog.close();}}]});
  }
  private selectMode():void {
    if(this.choosing)return;this.dialog.close();this.modeDialog.open({initial:{modeConfig:this.modeConfig,seed:this.seed},chooseLabel:'使用此模式',choose:choice=>this.applyModeChoice(choice),
      resumed:()=>{if(this.scene.isActive())routeSavedRun(this.game);}});
  }
  private applyModeChoice(choice:ModeChoice):void {
    if(this.choosing||!this.scene.isActive())return;this.modeConfig=choice.modeConfig;this.seed=choice.seed;
    if(choice.modeConfig.mode==='tutorial'){this.selectedId='erxiang';this.seed=R2_MODE_CATALOG.tutorial.config.seedPolicy.values[0];}
    this.notice='';this.render();
  }
  private async cancelChoice():Promise<void> {
    if(this.choosing)return;
    if(this.step==='route'){this.step='hero';this.notice='';this.audio.cancel();this.render();return;}
    if(this.modeConfig.mode==='tutorial'){this.modeConfig=DEFAULT_MODE_SELECTION;this.selectedId=undefined;this.seed=undefined;this.notice='已跳过教程，可自由选择角色。';this.audio.cancel();this.render();return;}
    if(this.selectedId){this.selectedId=undefined;this.selectedRoute=undefined;this.notice='已取消选择，进度没有改变。';this.audio.cancel();this.render();return;}
    const existing=gameSession().run;if(!existing){this.audio.cancel();this.scene.start('title');return;}
    if(existing.status!=='readonly'&&!await existing.flush()){this.notice='本局未保存，请从菜单重试保存或导出。';this.render();return;}
    this.audio.cancel();routeSavedRun(this.game);
  }
  private async confirmChoice():Promise<void> {
    if(this.choosing||!this.selectedId)return;
    if(this.step==='hero'){this.step='route';this.notice='';this.audio.select();this.render();return;}
    if(!this.selectedRoute)return;
    const existing=gameSession().run;
    if(existing&&!['run-won','run-lost'].includes(existing.state.phase)){
      const d=this.dialog.open('开始新局？',getCharacter(this.selectedId).name+' · '+OPENING_ROUTES[this.selectedRoute].title+'\n确认后保存所选模式的新局，并将其设为当前局。旧进度保留为备份；取消保留当前进度。',[{label:'确认开始新局',primary:true,run:async()=>{if(await this.choose())this.dialog.close(d);}}],{closeLabel:'取消'});
      return;
    }
    await this.choose();
  }
  private async choose():Promise<boolean> {
    if(this.choosing||!this.selectedId||!this.selectedRoute)return false;
    if(gameSession().pendingRun){this.notice=gameSession().notice||'候选尚未保存，请先重试保存或取消候选。';this.audio.invalid();this.render();return false;}
    if(!r2ModeUnlocked(readRunProgress().progress,this.modeConfig)){this.notice='此模式尚未解锁，请先完成对应标准八章首通，或继续已有模式存档。';this.audio.invalid();this.render();return false;}
    this.choosing=true;this.notice='';const lifecycle=this.lifecycle,id=this.selectedId,focus=this.selectedRoute;this.render();
    const seed=this.seed??String(Date.now());
    try {
      const controller=await startRun(this,seed,id,this.modeConfig,{kind:'new',openingRoute:focus}),session=gameSession();
      if(controller&&controller.status==='idle'&&session.run===controller)chooseBuildFocus(controller.state,focus);
      else if(!controller&&session.pendingRun&&session.pendingRun.state.seed===seed&&session.pendingRun.state.characterId===id)deferOpeningIntent(session,session.pendingRun,focus);
      if(lifecycle!==this.lifecycle||!this.scene.isActive())return false;
      if(!controller||controller.status!=='idle'||session.run!==controller){this.notice=session.notice||'新局尚未保存，请从菜单重试保存。';this.audio.invalid();return false;}
      this.audio.titleConfirm();this.audio.curtainOpen();paperSceneStart(this,'shop',undefined,true);return true;
    }finally {if(lifecycle===this.lifecycle&&this.scene.isActive()){this.choosing=false;this.render();}}
  }
}
