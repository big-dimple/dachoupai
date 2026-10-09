import {paperSceneStart} from './PaperFlow';
import {inkSettlingEase} from './inkwaveSpring';
import {characterForNewRun} from './CharacterRunCopy';
import {HERO_OPENING,OPENING_ROUTES} from './HeroOpeningCopy';
import {BUILD_FOCUS,chooseBuildFocus,type BuildFocus} from './BuildJourney';
import {deferOpeningIntent} from './HeroOpeningIntent';
import Phaser from 'phaser';
import {AudioEngine} from '../audio/AudioEngine';
import {CHARACTERS,getCharacter,type CharacterId} from './characters';
import {addAvatar,selectionPortraitKey,selectionPortraitURL,portraitURL} from './portraits';
import {startRun} from './runAdapter';
import {gameSession} from './session';
import {routeSavedRun} from './RunMenu';
import {SceneView} from './SceneView';
import {DetailDialog} from './DetailDialog';
import {ModeSelectDialog,DEFAULT_MODE_SELECTION,type ModeChoice} from './ModeSelectDialog';
import {R2_MODE_CATALOG,r2RunModeConfig,type R2ModeSelection} from '../content/r2Modes';
import {r2ModeUnlocked} from '../domain/r2Progress';
import {readRunProgress} from '../platform/RunProgress';
import type {Box} from './layout';
import {selectionLayout} from './SelectionLayout';
import {openingShowcaseLayout} from './OpeningShowcaseLayout';
import {heroSignature} from './HeroSignature';
import {openingRouteDemo} from './OpeningRouteDemo';
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
  private readonly portraitRequests=new Set<CharacterId>();
  private view!:SceneView;
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
    const session=gameSession();let pending=session.pendingRun;
    const unsubscribe=session.subscribe(()=>{const prior=pending;pending=session.pendingRun;
      if(prior&&!pending&&!this.choosing&&this.scene.isActive()){this.notice=session.notice;this.render();}
    });
    const settle=()=>{for(const [target,finish] of this.openingMotion){this.tweens.killTweensOf(target);finish();}this.openingMotion.clear();};
    const hide=()=>{if(document.hidden)settle();};window.addEventListener('blur',settle);window.addEventListener('dachoupai-presentation',settle);document.addEventListener('visibilitychange',hide);
    this.events.once('shutdown',()=>{settle();window.removeEventListener('blur',settle);window.removeEventListener('dachoupai-presentation',settle);document.removeEventListener('visibilitychange',hide);unsubscribe();this.lifecycle++;this.portraitRequests.clear();this.dialog.close();this.modeDialog.close();});this.render();
  }
  private render():void {
    const v=this.view,l=v.layout,style=getComputedStyle(document.documentElement),bottom=parseFloat(style.getPropertyValue('--safe-bottom'))||0;
    const p=selectionLayout(l.width,l.height,l.hud.y,bottom,this.step),config=r2RunModeConfig(this.modeConfig);v.clear();v.paperBackground();
    v.text(p.x,p.top,this.step==='hero'?'英雄登场':'选一条路',p.short||p.portrait?24:30,'#26313A').setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold');
    const modeLabel=this.modeConfig.mode==='standard'?`普通 D${this.modeConfig.difficulty}`:this.modeConfig.mode==='tutorial'?'教程':this.modeConfig.challengeId!;
    const modeWidth=p.portrait?84:132,controlsRight=Math.max(12,parseFloat(style.getPropertyValue('--safe-right'))||0);
    v.button({x:p.portrait?p.x+p.w-modeWidth:Math.min(p.x+p.w-modeWidth,l.width-controlsRight-148-modeWidth),y:p.portrait?p.top+45:p.top-3,width:modeWidth,height:44},p.portrait?`模式·${this.modeConfig.mode==='standard'?`D${this.modeConfig.difficulty}`:modeLabel}`:`模式 · ${modeLabel}`,'action/select-mode',()=>this.selectMode(),!this.choosing);
    if(!p.short)v.text(p.x,p.top+(p.portrait?49:44),this.step==='hero'?'先选英雄，再选路线':'先定方向，进店能换',14,'#3F606B',p.portrait?p.w-modeWidth-8:p.w);
    this.showHero(p,config.characterAbilityEnabled);
    if(this.step==='hero')CHARACTERS.forEach((character,i)=>{
      const b=p.cards[i],selected=character.id===this.selectedId,first=v.root.length;
      const accent=HERO_OPENING[character.id].accent,color=parseInt(accent.slice(1),16);
      v.material(b,selected?0xe2e8e5:0xfff9ee,0xfff9ee,6);
      const picture={x:b.x+4,y:b.y+3,width:b.width-8,height:b.height-27};this.drawPortrait(character.id,picture);
      this.singleLine(b.x+b.width/2,b.y+b.height-24,character.name,16,selected?accent:'#26313A',b.width-8,14,true).setOrigin(.5,0);
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
        v.text(b.x+14,b.y+8,copy.title,22,selected?'#B8473A':'#26313A').setFontStyle('bold');
        v.text(b.x+14,b.y+38,copy.example,16,'#386D65',b.width-28);
        v.text(b.x+14,b.y+62,copy.play,14,'#26313A',b.width-28);
      }
      const hit=v.rect(b).setFillStyle(0,0).setStrokeStyle(0).setData('selected',selected);
      v.target(hit,'route/'+focus,{tap:()=>{if(!this.choosing){this.selectedRoute=focus;this.notice='';this.audio.select();this.render();}}});
    });
    this.animateChoice=false;
    const existing=gameSession().run,canReturn=!!existing&&!['run-won','run-lost'].includes(existing.state.phase);
    v.button(p.cancel,this.step==='route'?'返回':this.modeConfig.mode==='tutorial'?'跳过':this.selectedId?'取消':canReturn?'回本局':'返回','action/cancel-character',()=>void this.cancelChoice(),!this.choosing);
    v.button(p.details,'比较','action/character-details',()=>this.compareHeroes(),!this.choosing&&!!this.selectedId);
    v.button(p.confirm,this.choosing?'正在登台…':this.step==='hero'?'选路线 →':'一起登台','action/confirm-character',()=>void this.confirmChoice(),!this.choosing&&!!this.selectedId&&(this.step==='hero'||!!this.selectedRoute),true);
    const status=this.selectedId?getCharacter(this.selectedId).name+(this.step==='route'?(this.selectedRoute?' · '+OPENING_ROUTES[this.selectedRoute].title+' · 确认才开局':' · 三条路线都能玩'):this.modeConfig.mode==='tutorial'?' · 教程固定角色':' · 下一步选路线'):'点一位英雄，决定谁来撑场。';
    v.text(p.x,p.noticeY,this.notice||status,14,this.notice?'#B8473A':'#3F606B',p.w).setName('opening/status');
  }
  private showHero(p:ReturnType<typeof selectionLayout>,abilityEnabled:boolean):void {
    const v=this.view,c=characterForNewRun(this.selectedId??'amo'),copy=HERO_OPENING[c.id],b=p.hero,q=openingShowcaseLayout(b,p.portrait,p.short);
    v.material(b,PAPER_THEME.jadeSoft,PAPER_THEME.jadeSoft,8);
    const trim=this.add.graphics().lineStyle(1,PAPER_THEME.jade,.25).strokeRoundedRect(b.x+4,b.y+4,b.width-8,b.height-8,6);v.add(trim);
    this.queueHeroPortrait(c.id);this.drawPortrait(c.id,q.art,true);
    const x=q.copy.x,w=q.copy.width;
    const name=v.text(x,q.copy.y,c.name,p.short?30:p.portrait?34:p.w>=1280?66:52,copy.accent).setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold').setName('opening/name');
    const title=v.text(x,name.y+name.height+2,c.title,14,'#3F606B').setName('opening/title');
    const quote=v.text(x,title.y+title.height+7,copy.taunt,p.short?16:p.portrait?18:24,copy.accent,w).setFontStyle('bold').setName('opening/taunt');
    if(p.short){title.setPosition(x+name.width+10,name.y+14);quote.setPosition(x+name.width+title.width+24,name.y+12).setWordWrapWidth(Math.max(100,w-name.width-title.width-24),true);}
    if(!abilityEnabled){v.text(q.demo.x,q.demo.y,'此挑战关闭角色能力',18,'#26313A',q.demo.width).setName('opening/play');v.text(q.demo.x,q.demo.y+28,'示例仅在普通局可用；原模式经济保持。',14,'#3F606B',q.demo.width);}
    else if(this.step==='route')this.showRouteDemo(q.demo,c.id,p.short);
    else this.showSignature(q.demo,c.id,p.short);
    if(this.animateChoice&&!this.reducedMotion()){
      for(const [target,delay] of [[name,0],[quote,60]] as const){target.setAlpha(.65);this.trackOpening(target,()=>target.active&&target.setAlpha(1));this.tweens.add({targets:target,alpha:1,delay,duration:180,ease:inkSettlingEase(.24)});target.once('destroy',()=>this.tweens.killTweensOf(target));}
    }
  }
  private miniCards(values:string[],x:number,y:number,width:number,height=32):void {
    const size=Math.min(height>40?40:28,(width-Math.max(0,values.length-1)*3)/Math.max(1,values.length));
    const sameSuit=values.length>1&&values.every(v=>v.endsWith('♥'));values.forEach((value,i)=>{const bx=x+i*(size+3);this.view.material({x:bx,y,width:size,height},PAPER_THEME.paperLight,PAPER_THEME.paperLight,3);this.view.text(bx+size/2,y+height/2,size<22?(sameSuit?'♥':value.replace(/[♠♥♣♦]/g,'')):value,height>40?18:14,/[♥♦]/.test(value)?'#B8473A':'#26313A').setOrigin(.5);});
  }
  private trackOpening(target:Phaser.GameObjects.GameObject,finish:()=>void):void {this.openingMotion.set(target,finish);target.once('destroy',()=>{this.tweens.killTweensOf(target);this.openingMotion.delete(target);});}
  private showSignature(b:Box,id:CharacterId,short:boolean,example?:Pick<ReturnType<typeof heroSignature>,'tag'|'cost'|'beats'>):void {
    const v=this.view,signature=example??heroSignature(id),compact=b.height<110,foot=compact?0:20;
    const narrowCompact=compact&&b.width<500,heading=compact&&!narrowCompact?signature.tag+' · 示例 · '+signature.cost:signature.tag+' · 玩法示例';
    v.text(b.x,b.y,heading,14,'#3F606B').setName('opening/play');
    const large=b.width>600,gap=large?10:6,seat=(b.width-gap*2)/3,y=b.y+(large?28:narrowCompact?40:22),beatHeight=Math.min(large?164:120,b.height-(large?28:narrowCompact?40:22)-foot);
    if(narrowCompact)v.text(b.x,b.y+18,signature.cost,14,'#3F606B',b.width).setName('opening/compact-cost');
    signature.beats.forEach((beat,i)=>{
      const first=v.root.length,box={x:b.x+i*(seat+gap),y,width:seat,height:Math.max(45,beatHeight)};v.material(box,PAPER_THEME.paperLight,PAPER_THEME.paperLight,5);
      const label=v.text(box.x+6,box.y+4,beat.label,large?18:14,'#3F606B',seat-12).setName('opening/beat-label');
      const cardHeight=compact?0:large?56:24;if(cardHeight&&beat.cards.length)this.miniCards(beat.cards,box.x+6,box.y+label.height+10,seat-12,cardHeight);
      const ry=compact?box.y+22:box.y+label.height+cardHeight+8;
      v.text(box.x+6,ry,beat.result,large?22:14,i===2?'#B8473A':'#26313A',seat-12).setFontStyle('bold').setName('opening/beat-result');
      if(this.animateChoice&&!this.reducedMotion()){
        const art=this.add.container(0,0);for(const child of v.root.list.slice(first))art.add(child);v.add(art);art.setY(7).setAlpha(.6);
        this.trackOpening(art,()=>{if(art.active)art.setY(0).setAlpha(1);});this.tweens.add({targets:art,y:0,alpha:1,delay:i*100,duration:280,ease:inkSettlingEase(.25)});art.once('destroy',()=>this.tweens.killTweensOf(art));
      }
    });
    if(!compact)v.text(b.x,y+beatHeight+5,signature.cost,large?16:14,'#3F606B',b.width).setName('opening/cost');
  }
  private showRouteDemo(b:Box,id:CharacterId,short:boolean):void {
    const v=this.view,focus=this.selectedRoute;
    if(!focus){v.text(b.x,b.y,'选一条路，看第一步怎么变强',16,'#26313A',b.width).setName('opening/play');v.text(b.x,b.y+28,'每位英雄都能玩三路，进店还能换。',14,'#3F606B',b.width);return;}
    const d=openingRouteDemo(focus,id),method={group:'改点／升型',straight:'补点／升型',flush:'染色／升型'}[focus];
    this.showSignature(b,id,short,{tag:OPENING_ROUTES[focus].title,cost:d.payoff,beats:[{label:'留住核心',cards:d.shape,result:focus==='group'?'两对／三条':focus==='straight'?'连续5点':'同花色5张'},{label:'工具做牌',cards:[],result:method},{label:'首店看起手',cards:[],result:d.starter}]});
  }
  private reducedMotion():boolean {return gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  private queueHeroPortrait(id:CharacterId):void {
    const key='opening-portrait-'+id;if(this.textures.exists(key)||this.portraitRequests.has(id))return;
    this.portraitRequests.add(id);const event='filecomplete-image-'+key;
    const done=()=>{
      this.load.off('loaderror',failed);
      if(!this.scene.isActive()||(this.selectedId??'amo')!==id)return;
      const image=this.view.root.getByName('opening/portrait') as Phaser.GameObjects.Image|undefined;
      if(image){const b=image.getData('openingBounds') as Box;image.setTexture(key).setScale(Math.min(b.width/image.width,b.height/image.height)).setPosition(b.x+b.width/2,b.y+b.height/2);}
    };
    const failed=(file:Phaser.Loader.File)=>{if(file.key===key){this.portraitRequests.delete(id);this.load.off(event,done);}};
    this.load.once(event,done);this.load.on('loaderror',failed);
    this.events.once('shutdown',()=>{this.load.off(event,done);this.load.off('loaderror',failed);});
    this.load.image(key,portraitURL(id));if(!this.load.isLoading())this.load.start();
  }
  private drawPortrait(id:CharacterId,b:Box,hero=false):void {
    const key=hero&&this.textures.exists('opening-portrait-'+id)?'opening-portrait-'+id:selectionPortraitKey(id);if(!this.textures.exists(key)){addAvatar(this,this.view.root,getCharacter(id),b.x+b.width/2,b.y+b.height/2,Math.min(b.width,b.height));return;}
    const image=this.add.image(0,0,key),sourceWidth=image.width,sourceHeight=image.height,scale=Math.min(b.width/sourceWidth,b.height/sourceHeight);
    if(hero)image.setName('opening/portrait').setData('openingBounds',b);
    image.setScale(scale).setPosition(b.x+b.width/2,b.y+b.height/2);this.view.add(image);
  }
  /** Card content drawn since `first` is wrapped into one hoverable, liftable container. */
  private wrapCard(first:number,b:Box):{art:Phaser.GameObjects.Container;enter:()=>void;leave:()=>void} {
    const v=this.view,cx=b.x+b.width/2,cy=b.y+b.height/2,art=this.add.container(cx,cy);
    for(const child of v.root.list.slice(first)){
      if(child instanceof Phaser.GameObjects.Image||child instanceof Phaser.GameObjects.Text||child instanceof Phaser.GameObjects.Graphics||child instanceof Phaser.GameObjects.Rectangle||child instanceof Phaser.GameObjects.Arc){
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
    this.selectedId=id;this.notice='';this.animateChoice=true;this.audio.select();this.render();
  }
  private compareHeroes():void {
    if(this.choosing)return;
    const enabled=r2RunModeConfig(this.modeConfig).characterAbilityEnabled;
    const d=this.dialog.open('谁来撑这场戏？',enabled?'每位英雄都能玩三路，差别在操作与代价。':'普通局玩法参考；当前挑战关闭角色能力。',[{label:'所选英雄完整能力',run:()=>{if(this.selectedId)this.inspect(this.selectedId);}}],{closeLabel:'回到选角'});
    const grid=document.createElement('section');grid.className='hero-comparison';
    for(const c of CHARACTERS){const s=heroSignature(c.id),button=document.createElement('button'),title=document.createElement('strong'),claim=document.createElement('span'),cost=document.createElement('small');button.type='button';button.disabled=this.modeConfig.mode==='tutorial'&&c.id!=='erxiang';button.dataset.hero=c.id;button.setAttribute('aria-pressed',String(c.id===this.selectedId));title.textContent=c.name+' · '+s.tag;claim.textContent=s.beats.map(b=>b.result).join(' → ');cost.textContent=s.cost;button.append(title,claim,cost);button.onclick=()=>{this.select(c.id);this.dialog.close(d);};grid.append(button);}
    d.querySelector('.dialog-copy')!.append(grid);
  }

  private inspect(id:CharacterId):void {
    if(this.choosing)return;const c=characterForNewRun(id);
    const body=[HERO_OPENING[id].story,c.passiveName+'\n'+c.passiveDescription,'构筑思路\n'+c.buildTip,'“'+c.quote+'”'];
    if(!r2RunModeConfig(this.modeConfig).characterAbilityEnabled)body.unshift('当前挑战关闭角色被动与初始赠送，以下能力供普通局参考。');
    const tutorialOther=this.modeConfig.mode==='tutorial'&&id!=='erxiang';if(tutorialOther)body.push('教程固定二响；跳过教程后可选用此角色。');
    if(this.selectedId===id)body.push('该角色已选中。关闭详情后，选择路线并一起确认登台。');
    this.dialog.open(c.name+' · '+c.title,body.join('\n\n'),this.selectedId===id||tutorialOther?[]:[{label:'选中角色',run:()=>{this.select(id);this.dialog.close();}}],{portrait:{url:portraitURL(id),thumbnailUrl:selectionPortraitURL(id),alt:c.name+'的完整巡演立绘'}});
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
