import {warmOpeningImages,warmHeroImage} from './StageImageWarmup';
import {showHeroExplanation} from './HeroExplanation';
import {paperSceneStart} from './PaperFlow';
import {inkSettlingEase} from './inkwaveSpring';
import {characterForNewRun} from './CharacterRunCopy';
import {HERO_OPENING,OPENING_ROUTES} from './HeroOpeningCopy';
import {BUILD_FOCUS,chooseBuildFocus,type BuildFocus} from './BuildJourney';
import {deferOpeningIntent} from './HeroOpeningIntent';
import Phaser from 'phaser';
import {AudioEngine} from '../audio/AudioEngine';
import {CHARACTERS,getCharacter,type CharacterId} from './characters';
import {addAvatar,selectionPortraitKey} from './portraits';
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
import {heroPlaySample,routePlaySample,type OpeningPlaySample} from './OpeningPlaySample';
import {drawOpeningPlayTable} from './OpeningPlayTable';
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
  private sampleAfter=false;
  private sampleExpanded=false;
  private view!:SceneView;
  private readonly portraitTargets=new Map<Phaser.GameObjects.Container,{id:CharacterId;box:Box;hero:boolean}>();
  private readonly dialog=new DetailDialog();
  private readonly modeDialog=new ModeSelectDialog();
  private readonly audio=AudioEngine.shared;
  constructor(){super('character-select');}
  init(data?:SelectionOptions):void {
    this.step='hero';this.selectedRoute=undefined;this.sampleExpanded=false;
    this.modeConfig=data?.modeConfig??DEFAULT_MODE_SELECTION;r2RunModeConfig(this.modeConfig);
    this.selectedId=this.modeConfig.mode==='tutorial'?'erxiang':data?.characterId;
    this.seed=this.modeConfig.mode==='tutorial'?R2_MODE_CATALOG.tutorial.config.seedPolicy.values[0]:data?.seed??(data?.freshSeed?String(Date.now()):undefined);
  }
  create():void {
    this.choosing=false;this.notice='';this.animateChoice=false;this.sampleAfter=false;this.lifecycle++;
    this.cameras.main.setBackgroundColor('#F3EADB');this.audio.setScene('menu');
    this.view=new SceneView(this,()=>this.render());
    const refreshImage=(key:string)=>{
      if(!this.scene.isActive())return;
      for(const [holder,target] of this.portraitTargets)if(holder.active&&[selectionPortraitKey(target.id),'avatar-'+target.id,...(target.hero?['opening-portrait-'+target.id]:[])].includes(key))this.paintPortrait(holder,target.id,target.box,target.hero);
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
    const p=selectionLayout(l.width,l.height,l.hud.y,bottom,this.step),config=r2RunModeConfig(this.modeConfig);v.clear();v.paperBackground();
    v.text(p.x,p.top,this.step==='hero'?'英雄登场':'选一条路',p.short||p.portrait?24:30,'#26313A').setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold');
    const modeLabel=selectionModeName(this.modeConfig);
    const modeWidth=p.portrait?104:132,controlsRight=Math.max(12,parseFloat(style.getPropertyValue('--safe-right'))||0);
    v.button({x:p.portrait?p.x+p.w-modeWidth:Math.min(p.x+p.w-modeWidth,l.width-controlsRight-148-modeWidth),y:p.portrait?p.top+45:p.top-3,width:modeWidth,height:44},`模式 · ${modeLabel}`,'action/select-mode',()=>this.selectMode(),!this.choosing);
    if(!p.short)v.text(p.x,p.top+(p.portrait?49:44),this.step==='hero'?'先选英雄，再选路线':'先定方向，进店能换',14,'#3F606B',p.portrait?p.w-modeWidth-8:p.w);
    this.showHero(p,config.characterAbilityEnabled);
    if(this.step==='hero')CHARACTERS.forEach((character,i)=>{
      const b=p.cards[i],selected=character.id===this.selectedId,first=v.root.length;
      const accent=HERO_OPENING[character.id].accent,color=parseInt(accent.slice(1),16);
      v.material(b,selected?0xe2e8e5:0xfff9ee,0xfff9ee,6);
      const identity=SELECTION_PRESENTATION[character.id];
      const compact=p.portrait||p.short;
      const picture=compact?{x:b.x+4,y:b.y+3,width:Math.min(36,b.width*.32),height:b.height-25}:{x:b.x+6,y:b.y+5,width:b.width*.44,height:b.height-10};
      this.drawPortrait(character.id,picture);
      const tx=compact?b.x+picture.width+7:b.x+b.width*.48,tw=b.x+b.width-tx-5;
      this.singleLine(tx,b.y+(compact?7:29),character.name,compact?16:20,selected?accent:'#26313A',tw,14,true).setName('opening/seat-name');
      this.singleLine(compact?b.x+b.width/2:tx,b.y+(compact?b.height-23:62),identity.tag,14,'#3F606B',compact?b.width-8:tw).setOrigin(compact?.5:0,0).setName('opening/seat-tag');
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
      if(p.portrait){
        v.text(b.x+9,b.y+6,copy.title,18,selected?'#B8473A':'#26313A').setFontStyle('bold');
        v.text(b.x+100,b.y+6,copy.play,14,'#3F606B',b.width-108);
      }else{
        v.text(b.x+14,b.y+8,copy.title,p.short?18:22,selected?'#B8473A':'#26313A').setFontStyle('bold');
        if(!p.short)v.text(b.x+14,b.y+38,copy.example,16,'#386D65',b.width-28);
        v.text(b.x+14,b.y+(p.short?32:62),copy.play,14,'#26313A',b.width-28);
      }
      const hit=v.rect(b).setFillStyle(0,0).setStrokeStyle(0).setData('selected',selected);
      v.target(hit,'route/'+focus,{tap:()=>{if(!this.choosing){this.selectedRoute=focus;this.sampleAfter=false;this.sampleExpanded=false;this.notice='';this.animateChoice=true;this.audio.select();this.render();}}});
    });
    this.animateChoice=false;
    const existing=gameSession().run,canReturn=!!existing&&!['run-won','run-lost'].includes(existing.state.phase);
    v.button(p.cancel,this.step==='route'?'返回':this.modeConfig.mode==='tutorial'?'跳过':this.selectedId?'取消':canReturn?'回本局':'返回','action/cancel-character',()=>void this.cancelChoice(),!this.choosing);
    v.button(p.details,'比一比','action/character-details',()=>this.compareHeroes(),!this.choosing);
    v.button(p.confirm,this.choosing?'正在登台…':this.step==='hero'?'选路线 →':'一起登台','action/confirm-character',()=>void this.confirmChoice(),!this.choosing&&!!this.selectedId&&(this.step==='hero'||!!this.selectedRoute),true);
    const status=this.selectedId?getCharacter(this.selectedId).name+(this.step==='route'?(this.selectedRoute?' · '+OPENING_ROUTES[this.selectedRoute].title+' · 确认才开局':' · 三条路线都能玩'):this.modeConfig.mode==='tutorial'?' · 教程固定角色':' · 下一步选路线'):'点一位英雄，决定谁来撑场。';
    v.text(p.x,p.noticeY,this.notice||status,14,this.notice?'#B8473A':'#3F606B',p.w).setName('opening/status');
  }
  private showHero(p:ReturnType<typeof selectionLayout>,abilityEnabled:boolean):void {
    const v=this.view,c=characterForNewRun(this.selectedId??'amo'),copy=HERO_OPENING[c.id],b=p.hero,q=openingShowcaseLayout(b,p.portrait,p.short,true);
    v.material(b,PAPER_THEME.jadeSoft,PAPER_THEME.jadeSoft,8);
    const trim=this.add.graphics().lineStyle(1,PAPER_THEME.jade,.25).strokeRoundedRect(b.x+4,b.y+4,b.width-8,b.height-8,6);v.add(trim);
    if(this.sampleExpanded&&abilityEnabled&&b.height<300){
      this.sampleExpanded=false;
      showSelectionSample(this.dialog,c.name+' · '+(this.step==='hero'?'技能例子':'路线例子'),this.step==='hero'?heroPlaySample(c.id):routePlaySample(this.selectedRoute!,c.id),this.sampleAfter);
    }
    if(this.sampleExpanded&&abilityEnabled){
      this.singleLine(b.x+10,b.y+10,c.name+' · '+(this.step==='hero'?'技能示例':'路线示例'),18,copy.accent,b.width-102).setName('opening/demo-title');
      v.button({x:b.x+b.width-80,y:b.y+6,width:70,height:44},'收起','action/close-opening-sample',()=>{this.sampleExpanded=false;this.sampleAfter=false;this.audio.cancel();this.render();},!this.choosing);
      const demo={x:b.x+10,y:b.y+56,width:b.width-20,height:b.height-66};
      if(this.step==='route')this.showRouteDemo(demo,c.id,p.short);else this.showSignature(demo,c.id,p.short);
      return;
    }
    this.queueHeroPortrait(c.id);this.drawPortrait(c.id,q.art,true);
    const portraitHit=v.rect({...q.art,height:q.art.height+(p.short?0:24)}).setFillStyle(0,0).setStrokeStyle(0);v.target(portraitHit,'opening/hero-details',{tap:()=>this.inspect(c.id),detail:()=>this.inspect(c.id)});
    if(!p.short)v.text(q.art.x+q.art.width/2,q.art.y+q.art.height+4,'点立绘 · 技能说明',14,'#3F606B').setOrigin(.5,0).setName('opening/portrait-hint');
    const x=q.copy.x,w=q.copy.width,tightPortrait=p.portrait&&q.copy.height<150;
    const name=v.text(x,q.copy.y,c.name,p.short?30:tightPortrait?28:p.portrait?34:p.w>=1280?66:52,copy.accent).setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold').setName('opening/name');
    const title=v.text(x,name.y+name.height+2,c.title,14,'#3F606B').setName('opening/title');
    const quote=v.text(x,tightPortrait?name.y+name.height+4:title.y+title.height+7,copy.taunt,tightPortrait?14:p.short?16:p.portrait?16:24,copy.accent,w).setFontStyle('bold').setName('opening/taunt');
    if(p.portrait){quote.setWordWrapWidth(0);if(quote.width>w)quote.setText(copy.taunt.replace(/([，？])/,'$1\n'));if(quote.width>w)quote.setFontSize(14);quote.setWordWrapWidth(w,true);}
    if(tightPortrait)title.setVisible(false);
    if(p.short){title.setPosition(x+name.width+10,name.y+14);quote.setPosition(x+name.width+title.width+24,name.y+12).setWordWrapWidth(Math.max(100,w-name.width-title.width-24),true);}
    if(abilityEnabled&&!p.short){
      const identity=SELECTION_PRESENTATION[c.id],space=q.copy.y+q.copy.height-(quote.y+quote.height),compact=p.portrait||space<145;
      // Keep a short operation promise on phones; reserve full facts for PC and comparison.
      const y=quote.y+quote.height+(compact?10:20);
      if(space>=64){
        const tag=v.text(x,y,identity.tag,16,'#3F606B',w).setFontStyle('bold').setName('opening/skill-tag');
        const hook=v.text(x,tag.y+tag.height+5,identity.hook,14,'#26313A',w).setName('opening/skill-hook');
        if(!compact){
          const entry=v.text(x,hook.y+hook.height+16,identity.entry,16,'#26313A',w).setName('opening/entry');
          const when=v.text(x,entry.y+entry.height+8,'可用 · '+identity.when,14,'#3F606B',w).setName('opening/when');
          v.text(x,when.y+when.height+6,'代价 · '+identity.cost,14,'#3F606B',w).setName('opening/selection-cost');
        }
      }
    }
    if(!abilityEnabled)v.text(q.demo.x,q.demo.y,'此挑战关闭角色能力',14,'#3F606B',q.demo.width).setName('opening/play');
    else v.button(q.demo,this.step==='hero'?'看技能例子 ›':this.selectedRoute?'看路线怎么做牌':'先选一条路线','action/opening-sample',()=>{this.audio.select();if(b.height<300)showSelectionSample(this.dialog,c.name+' · '+(this.step==='hero'?'技能例子':'路线例子'),this.step==='hero'?heroPlaySample(c.id):routePlaySample(this.selectedRoute!,c.id));else {this.sampleExpanded=true;this.sampleAfter=false;this.animateChoice=true;this.render();}},!this.choosing&&(this.step==='hero'||!!this.selectedRoute));
    if(this.animateChoice&&!this.reducedMotion()){
      for(const [target,delay] of [[name,0],[quote,60]] as const){target.setAlpha(.65);this.trackOpening(target,()=>target.active&&target.setAlpha(1));this.tweens.add({targets:target,alpha:1,delay,duration:180,ease:inkSettlingEase(.24)});target.once('destroy',()=>this.tweens.killTweensOf(target));}
    }
  }
  private trackOpening(target:Phaser.GameObjects.GameObject,finish:()=>void):void {this.openingMotion.set(target,finish);target.once('destroy',()=>{this.tweens.killTweensOf(target);this.openingMotion.delete(target);});}
  private showSample(b:Box,sample:OpeningPlaySample):void {
    const cards=drawOpeningPlayTable(this,this.view,b,sample,()=>{if(!this.choosing){this.sampleAfter=!this.sampleAfter;this.animateChoice=true;this.render();}},this.sampleAfter,!this.reducedMotion());
    if(this.animateChoice&&!this.reducedMotion())cards.forEach((art,i)=>{
      const finish=()=>{if(art.active)art.setPosition(0,0).setAlpha(1);};
      art.setPosition(-8,5).setAlpha(.45);this.trackOpening(art,finish);
      this.tweens.add({targets:art,x:0,y:0,alpha:1,delay:i*45,duration:320,ease:inkSettlingEase(.30),onComplete:()=>this.openingMotion.delete(art)});
    });
  }
  private showSignature(b:Box,id:CharacterId,_short:boolean):void {this.showSample(b,heroPlaySample(id));}
  private showRouteDemo(b:Box,id:CharacterId,_short:boolean):void {
    const focus=this.selectedRoute;
    if(!focus){this.view.text(b.x,b.y,'选一条路，看牌怎么变',18,'#26313A',b.width).setName('opening/play');this.view.text(b.x,b.y+30,'每位英雄都能玩三路，进店还能换。',14,'#3F606B',b.width);return;}
    this.showSample(b,routePlaySample(focus,id));
  }
  private reducedMotion():boolean {return gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  private queueHeroPortrait(id:CharacterId):void {
    warmHeroImage(this,id);
  }
  private drawPortrait(id:CharacterId,b:Box,hero=false):void {
    const holder=this.view.add(this.add.container(0,0));this.portraitTargets.set(holder,{id,box:b,hero});this.paintPortrait(holder,id,b,hero);
  }
  /** Replace only the picture; late previews must never destroy a pressed action target. */
  private paintPortrait(holder:Phaser.GameObjects.Container,id:CharacterId,b:Box,hero:boolean):void {
    holder.removeAll(true);
    const key=hero&&this.textures.exists('opening-portrait-'+id)?'opening-portrait-'+id:selectionPortraitKey(id);
    if(!this.textures.exists(key)){addAvatar(this,holder,getCharacter(id),b.x+b.width/2,b.y+b.height/2,Math.min(b.width,b.height));return;}
    const image=this.add.image(0,0,key),scale=Math.min(b.width/image.width,b.height/image.height);
    if(hero)image.setName('opening/portrait').setData('openingBounds',b);
    image.setScale(scale).setPosition(b.x+b.width/2,b.y+b.height/2);holder.add(image);
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
    if(this.modeConfig.mode==='tutorial'&&id!=='erxiang'){this.notice='教程固定二响；跳过教程后可自由选角。';this.audio.invalid();this.render();return;}
    this.selectedId=id;this.sampleAfter=false;this.sampleExpanded=false;this.notice='';this.animateChoice=true;this.audio.select();this.render();
  }
  private compareHeroes():void {
    if(this.choosing)return;
    showSelectionComparison(this.dialog,{selectedId:this.selectedId,abilityEnabled:r2RunModeConfig(this.modeConfig).characterAbilityEnabled,tutorial:this.modeConfig.mode==='tutorial',select:id=>this.select(id),inspect:id=>this.inspect(id)});
  }

  private inspect(id:CharacterId):void {
    if(this.choosing)return;
    const tutorialOther=this.modeConfig.mode==='tutorial'&&id!=='erxiang';
    showHeroExplanation(this.dialog,id,{abilityEnabled:r2RunModeConfig(this.modeConfig).characterAbilityEnabled,closeLabel:'回到选角',status:tutorialOther?'教程固定二响；退出教程后可选择这位英雄。':undefined,actions:this.selectedId===id||tutorialOther?[]:[{label:'选中角色',run:()=>{this.select(id);this.dialog.close();}}]});
  }
  private selectMode():void {
    if(this.choosing)return;this.dialog.close();this.modeDialog.open({initial:{modeConfig:this.modeConfig,seed:this.seed},chooseLabel:'使用此模式',choose:choice=>this.applyModeChoice(choice),
      resumed:()=>{if(this.scene.isActive())routeSavedRun(this.game);}});
  }
  private applyModeChoice(choice:ModeChoice):void {
    if(this.choosing||!this.scene.isActive())return;this.sampleAfter=false;this.sampleExpanded=false;this.modeConfig=choice.modeConfig;this.seed=choice.seed;
    if(choice.modeConfig.mode==='tutorial'){this.selectedId='erxiang';this.seed=R2_MODE_CATALOG.tutorial.config.seedPolicy.values[0];}
    this.notice='';this.render();
  }
  private async cancelChoice():Promise<void> {
    if(this.choosing)return;
    this.sampleAfter=false;this.sampleExpanded=false;
    if(this.step==='route'){this.step='hero';this.notice='';this.audio.cancel();this.render();return;}
    if(this.modeConfig.mode==='tutorial'){this.modeConfig=DEFAULT_MODE_SELECTION;this.selectedId=undefined;this.seed=undefined;this.notice='已跳过教程，可自由选择角色。';this.audio.cancel();this.render();return;}
    if(this.selectedId){this.selectedId=undefined;this.selectedRoute=undefined;this.notice='已取消选择，进度没有改变。';this.audio.cancel();this.render();return;}
    const existing=gameSession().run;if(!existing){this.audio.cancel();this.scene.start('title');return;}
    if(existing.status!=='readonly'&&!await existing.flush()){this.notice='本局未保存，请从菜单重试保存或导出。';this.render();return;}
    this.audio.cancel();routeSavedRun(this.game);
  }
  private async confirmChoice():Promise<void> {
    if(this.choosing||!this.selectedId)return;
    if(this.step==='hero'){this.sampleAfter=false;this.sampleExpanded=false;this.step='route';this.notice='';this.audio.select();this.render();return;}
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
