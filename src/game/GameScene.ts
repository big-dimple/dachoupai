import {jokerArtLoadState,requestJokerArt,retryJokerArt} from './JokerArtLoading';
import {JOKER_RARITY,createJokerRarityBadge} from './JokerRarity';
import {cardAbilityCopy} from './CardCopy';
import {mountF09Art} from './F09Art';
import Phaser from 'phaser';
import {r2JokerCapacity} from '../domain/r2Resources';
import {r2RunModeConfig,R2_MODE_CATALOG} from '../content/r2Modes';
import {showPrograms} from './ProgramDialog';
import { AudioEngine } from '../audio/AudioEngine';
import { rankLabel, SUIT_SYMBOL, SUITS, type Suit, type PlayingCard } from '../cards/types';
import {EffectQueue,type EffectContext} from '../core/EffectQueue';
import { getR2Joker as getJoker } from '../domain/r2Shop';
import {R2_JOKERS,type R2JokerInstance} from '../content/r2Schema';
import {HAND_LABELS} from '../content/handLabels';
import {heatText,fractionText} from './scoreText';
import {scoreCelebration} from './scoreCelebration';
import {scoreBeat,scoreFireLevel,fourCardFormation,scorePacketSymbol,type ScoreBeat} from './scorePresentation';
import {ScoreFlame} from './ScoreFlame';
import {stageNotice} from './stageNotice';
import type {R2RunState as RunState,DomainEvent} from '../domain/run';
import {R2_LIMITS,getR2Stage as getStage,r2ScoreContext,r2DiscardCost} from '../domain/r2Run';
import {previewR2Hand,r2ScoringDisabledJokerIds,type Accumulator,type ScoreTrace,type ScoreEvent} from '../domain/scoreR2';
import {Rational} from '../domain/rational';

import { getCharacter, type CharacterId } from './characters';
import type { IntermissionResult } from './IntermissionScene';
import {addAvatar,avatarKey,portraitURL} from './portraits';
import {SceneView} from './SceneView';
import {HandSelectionInput} from './HandSelectionInput';
import {paintCardFeedback} from './CardFeedback';
import {HandSweepHint} from './HandSweepHint';
import type {HandSelectionUpdate} from './HandSelectionGesture';
import {DetailDialog} from './DetailDialog';
import {dispatchRun,runController} from './runAdapter';
import {gameSession} from './session';
import type {RunMenuActions} from './RunMenu';
import {R2_BOSSES,r2BossText,r2DisabledCards} from '../domain/r2Chapter';
import {showConsumables} from './ConsumableDialog';
import {fitScoreLine,scoreFlightLanding} from './ScoreTextLayout';
import {PAPER_THEME as T,PAPER_CSS as C,UI_FONT,P00_ASSETS,assetUrl} from './theme';
import type {Box} from './layout';
import {jokerArtKey,jokerArtUrl,jokerArtPreviewUrl} from './jokerArt';
import {drawJokerMotif} from './JokerMotif';
import {r2JokerValue,r2JokerStateText,r2JokerExtraHelp,r2ScoreOperationText,r2TransactionText} from './r2Help';
import {R2_TOOLS,R2_LONG_TERM_ITEMS} from '../content/r2Tools';
import {cardSpecialText,editionLabel,editionEffectText,toolInfo} from './r2ToolInfo';

const MAX_SELECTED = R2_LIMITS.maxSelected;

/** Each suit owns an enamel identity colour, not just red vs black. */
const SUIT_INK: Record<Suit,number> = {spades:0x27374d,hearts:0xb43a34,clubs:0x246b60,diamonds:0x956225};
/** Classic symmetric pip layouts in unit card space; pips with y>0 are drawn inverted. */
const PIP_LAYOUTS: Record<number,ReadonlyArray<readonly [number,number]>> = {
  2:[[0,-.46],[0,.46]],
  3:[[0,-.46],[0,0],[0,.46]],
  4:[[-.34,-.46],[.34,-.46],[-.34,.46],[.34,.46]],
  5:[[-.34,-.46],[.34,-.46],[0,0],[-.34,.46],[.34,.46]],
  6:[[-.34,-.46],[.34,-.46],[-.34,0],[.34,0],[-.34,.46],[.34,.46]],
  7:[[-.34,-.46],[.34,-.46],[0,-.23],[-.34,0],[.34,0],[-.34,.46],[.34,.46]],
  8:[[-.34,-.46],[.34,-.46],[0,-.23],[-.34,0],[.34,0],[0,.23],[-.34,.46],[.34,.46]],
  9:[[-.34,-.5],[.34,-.5],[-.34,-.17],[.34,-.17],[0,0],[-.34,.17],[.34,.17],[-.34,.5],[.34,.5]],
  10:[[-.34,-.5],[.34,-.5],[0,-.335],[-.34,-.17],[.34,-.17],[-.34,.17],[.34,.17],[0,.335],[-.34,.5],[.34,.5]],
};
/** Every court card is a troupe member; each of the six appears on exactly two courts. */
const COURT_CHARACTER: Record<string,CharacterId> = {
  '11-spades':'amo','11-hearts':'azao','11-diamonds':'touye','11-clubs':'erxiang',
  '12-spades':'laohuan','12-hearts':'xiemu','12-diamonds':'amo','12-clubs':'touye',
  '13-spades':'xiemu','13-hearts':'erxiang','13-diamonds':'laohuan','13-clubs':'azao',
};
const ENHANCEMENT_UI={
  'heat-paper':{name:'热度纸',mark:'热',ink:0xa34c31,text:'本牌计分时，热度 +20。'},
  'multiplier-paper':{name:'倍率纸',mark:'倍',ink:0xa63d39,text:'本牌计分时，倍率 +2。'},
  'glass-paper':{name:'玻璃纸',mark:'玻',ink:0x287687,text:'本牌计分时，倍率 ×1.5；整手后有 1/4 概率销毁。'},
  'voice-paper':{name:'留声纸',mark:'声',ink:0x47627d,text:'本牌留在手中时，倍率 +1。'},
  'gold-paper':{name:'金纸',mark:'金',ink:0x86602c,text:'本牌留到过关时，金币 +1；每场最多 5 金。'},
  'encore-paper':{name:'返场纸',mark:'返',ink:0x725783,text:'本牌计分时，自重触发一次；不会再次自触发。'},
  'lucky-paper':{name:'幸运纸',mark:'运',ink:0xb68238,text:'每次计分独立判定：1/5 倍率 +4，1/15 金币 +10；整手幸运金币最多 20。'},
} as const;

interface CardView {
  card: PlayingCard;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  scoringMark: Phaser.GameObjects.Text;
  selectionMark?:Phaser.GameObjects.Text;
  hit?:Phaser.GameObjects.Rectangle;
  back?:Phaser.GameObjects.Image;
  edgeGlow?:Phaser.GameObjects.Graphics;
  faceGlow?:Phaser.GameObjects.Graphics;
  sheen?:Phaser.GameObjects.Image;
  dealing?:boolean;
  sheenTween?:Phaser.Tweens.Tween;
}
type HandPreview=ReturnType<typeof previewR2Hand>;

export class GameScene extends Phaser.Scene {
  private get deck(): string[] { return this.run.drawPile; }
  private get hand(): readonly PlayingCard[] { return this.presentation?.hand??this.toolHand??this.run.handOrder.map(id => this.run.deckInstances.find(card => card.id === id)!); }
  private toolHand?:readonly PlayingCard[];
  private selectedIds = new Set<string>();
  private hoveredCardId?:string;
  private hoveredJokerId?:string;
  private jokerHoverPreview?:Phaser.GameObjects.Container;
  private cardViews: CardView[] = [];
  private jokerViews = new Map<string, Phaser.GameObjects.Container>();
  private run!: RunState;
  private stage!: NonNullable<ReturnType<typeof getStage>>;
  private get handsLeft(): number { return this.run.stage?.handsLeft ?? 0; }
  private get heat(): string { return this.run.stage?.heat ?? '0'; }
  private playing = false;
  private lifecycle=0;
  private intent=0;
  private presentation?:{generation:number;lifecycle:number;intent:number;state:RunState;score:ScoreTrace;hand:readonly PlayingCard[];displayHeat:string;originHeat:string;replay:boolean;previousTrace:ScoreTrace|null;credited:boolean;resourcePlayLeft?:number;resourceGold?:number};
  private characterId!: CharacterId;
  private readonly effects = new EffectQueue();
  private readonly audio = AudioEngine.shared;

  private view!:SceneView;
  private handInput?:HandSelectionInput;
  private readonly dialog=new DetailDialog();
  private focusIndex=0;
  private keyboardFocus=false;
  private readonly sweepHint=new HandSweepHint();
  private handHint?:Phaser.GameObjects.Container;
  private handHintTimer?:Phaser.Time.TimerEvent;
  private handStart=0;
  private handNavigationButtons:Phaser.GameObjects.Rectangle[]=[];
  private statusMessage='';
  private heatText!: Phaser.GameObjects.Text;
  private resourceCounts!:Record<'play'|'discard',Phaser.GameObjects.Text>;
  private goldText!:Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private breakdownText!: Phaser.GameObjects.Text;
  private roleText!: Phaser.GameObjects.Text;
  private playButton!: Phaser.GameObjects.Rectangle;
  private discardButton!: Phaser.GameObjects.Rectangle;
  private rankButton!: Phaser.GameObjects.Rectangle;
  private suitButton!: Phaser.GameObjects.Rectangle;
  private menuActions?:RunMenuActions;
  private statusText!: Phaser.GameObjects.Text;
  private scoreHeat!:Phaser.GameObjects.Text;
  private scoreMult!:Phaser.GameObjects.Text;
  private scoreTotal!:Phaser.GameObjects.Text;
  private scoreLabels:Phaser.GameObjects.Text[]=[];
  private previousHandText!:Phaser.GameObjects.Text;
  private handCountText!:Phaser.GameObjects.Text;
  private pileText!:Phaser.GameObjects.Text;
  private progressBar!:Phaser.GameObjects.Rectangle;
  private roleFrame!:Phaser.GameObjects.Rectangle;
  private roleAvatar!:Phaser.GameObjects.Container;
  private previewCards?:Phaser.GameObjects.Container;
  private settledCards=new Map<string,CardView>();
  private rollingHeat=false;
  private progressTarget=Number.NaN;
  private playAura?:Phaser.GameObjects.Graphics;
  private playAuraPulse?:Phaser.Tweens.Tween;
  private jokerIdle=new Map<Phaser.GameObjects.Container,Phaser.Tweens.Tween>();
  private scoreFlame?:ScoreFlame;
  private controlsLive=false;

  constructor() {
    super('game');
  }
  preload():void {
    const xhr:Phaser.Types.Loader.XHRSettingsObject={responseType:'text',timeout:5000};this.load.maxRetries=0;
    for(const asset of P00_ASSETS)if(!this.textures.exists(asset.key))this.load.svg(asset.key,assetUrl(asset.path),{width:asset.width,height:asset.height},xhr);
  }
  private get reducedMotion():boolean {return gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;}

  async create(): Promise<void> {
    // Phaser reuses this Scene instance. Its former controls were destroyed on shutdown.
    this.controlsLive=false;
    // Default Phaser lag smoothing turns every >500ms frame into only 33ms.
    // Keep committed score playback moving on slow renderers; bound background gaps to 1s.
    this.tweens.setLagSmooth(1000,1000);
    const lifecycle=++this.lifecycle;this.intent++;
    this.effects.clear();this.jokerViews.clear();this.cardViews=[];this.selectedIds.clear();this.hoveredCardId=undefined;this.hoveredJokerId=undefined;this.playing=false;this.presentation=undefined;this.toolHand=undefined;this.statusMessage='';this.focusIndex=0;this.keyboardFocus=false;this.handStart=0;this.handNavigationButtons=[];
    const settings=()=>{
      const hintVisible=!!this.handHint;this.stopHandHint();if(hintVisible&&this.reducedMotion)this.showHandHint(false);
      this.tweens.timeScale=gameSession().speed;this.time.timeScale=gameSession().speed;
      if(this.reducedMotion){
        if(this.toolHand){this.effects.clear();this.toolHand=undefined;this.render();}
        this.stopJokerIdle();this.playAuraPulse?.remove();this.playAuraPulse=undefined;this.cameras.main.resetFX();
        this.cardViews.forEach(view=>{view.sheenTween?.remove();view.sheen?.setAlpha(0);this.revealCard(view);});
        for(const container of [...this.cardViews.map(view=>view.container),...this.jokerViews.values()]){
          const rim=container.getData('editionRim') as Phaser.GameObjects.Graphics|undefined;
          (rim?.getData('editionTween') as Phaser.Tweens.Tween|undefined)?.remove();rim?.setData('editionTween',undefined).setAlpha(.9);
        }
        if(this.presentation)this.fastForward();
        if(this.run?.phase==='await-input'&&this.view){this.cardViews.forEach((view,i)=>this.restingCard(view,i,false));this.jokerViews.forEach(view=>this.restingJoker(view,false));this.updateControls();}
      }else if(this.ready&&this.controlsLive){this.jokerViews.forEach(view=>this.restingJoker(view,false));this.updateControls();}
    };
    window.addEventListener('dachoupai-presentation',settings);
    this.events.once('shutdown',()=>{
      this.game.canvas.removeAttribute('data-hand-input');this.stopHandHint();window.removeEventListener('pointerdown',this.pointerFocus,true);document.removeEventListener('focusin',this.focusFeedback);document.removeEventListener('focusout',this.focusFeedback);window.removeEventListener('blur',this.stopHandHint);document.removeEventListener('visibilitychange',this.hintVisibility);
      this.handInput?.destroy();this.handInput=undefined;this.controlsLive=false;this.stopScoreFire();
      if(this.registry.get('runMenuActions')===this.menuActions)this.registry.remove('runMenuActions');
      this.menuActions=undefined;
      this.lifecycle++;this.intent++;this.effects.clear();this.audio.cancelPresentation();this.stopJokerIdle();this.tweens.killAll();this.time.removeAllEvents();this.jokerViews.clear();this.settledCards.clear();this.cardViews=[];this.selectedIds.clear();this.hoveredCardId=undefined;this.hoveredJokerId=undefined;this.jokerHoverPreview=undefined;this.previewCards=undefined;this.presentation=undefined;this.playAuraPulse=undefined;this.playing=false;this.rollingHeat=false;this.dialog.close();
      window.removeEventListener('keydown',this.keyboard);
      window.removeEventListener('dachoupai-presentation',settings);
    });
    const controller=runController(this);
    if(!controller){this.scene.start('character-select');return;}
    let enteredStage=false;
    if(controller.state.phase==='stage-ready'){
      const entered=await dispatchRun(this,{type:'EnterStage'});
      if(lifecycle!==this.lifecycle||!this.scene.isActive())return;
      if(!entered.ok){this.scene.start('character-select');return;}
      enteredStage=true;
    }
    this.run=controller.state;
    if(this.run.phase!=='await-input'||!this.run.stage){this.scene.start('character-select');return;}
    this.stage=getStage(this.run.stage.index,this.run.tourMode,this.run.difficulty)!;this.characterId=this.run.characterId;settings();this.audio.setScene(this.stage.index%3===2?'boss':'table');
    this.cameras.main.setBackgroundColor(C.paper);
    this.view=new SceneView(this,()=>{
      if(this.presentation)this.fastForward();
      if(this.toolHand){this.effects.clear();this.toolHand=undefined;}
      this.render();
    },()=>({count:this.hand.length,start:this.handStart}));
    this.handInput=new HandSelectionInput(this,{
      cancelCanvas:()=>this.view.cancelInteraction(),
      pointerCard:id=>{const index=this.hand.findIndex(card=>card.id===id);if(index>=0)this.focusIndex=index;},
      ready:()=>this.ready,cards:()=>this.hand.map((card,i)=>({id:card.id,...this.view.layout.cards[i].hit,visible:this.view.layout.cards[i].visible})),selected:()=>this.selectedIds,
      update:update=>this.applyHandSelection(update),detail:id=>this.inspectCard(id),hover:id=>{
        if(this.hoveredCardId===id)return;
        const previous=this.hoveredCardId;if(previous)this.hoverCard(previous,false);if(id)this.hoverCard(id,true);
      },
    });
    this.menuActions={viewDeck:()=>this.inspectDeck(),viewRules:()=>this.inspectRole()};
    this.registry.set('runMenuActions',this.menuActions);
    window.addEventListener('keydown',this.keyboard);
    this.game.canvas.setAttribute('data-hand-input','pointer');
    window.addEventListener('pointerdown',this.pointerFocus,true);document.addEventListener('focusin',this.focusFeedback);document.addEventListener('focusout',this.focusFeedback);window.addEventListener('blur',this.stopHandHint);document.addEventListener('visibilitychange',this.hintVisibility);
    this.render();
    if(enteredStage)this.revealDrawnCards([]);
    const notice=stageNotice(this.run);
    if(enteredStage&&notice?.warning)this.dialog.open('压轴规则 · '+notice.title,notice.details,[{label:'开始出牌',primary:true,run:()=>this.dialog.close()}]);
  }

  private readonly keyboard=(event:KeyboardEvent)=>{
    if(!this.scene.isActive())return;
    if(event.key==='Tab'){this.keyboardFocus=true;this.game.canvas.setAttribute('data-hand-input','keyboard');this.hoveredCardId=undefined;this.stopHandHint();this.focusFeedback();return;}
    if(this.handInput?.active){if(event.key==='Escape'){event.preventDefault();this.handInput.cancel('escape');}return;}
    if(this.playing||document.querySelector('dialog[open]')||!this.scene.isActive()||document.activeElement?.matches('input,select,textarea,button'))return;
    if(['ArrowRight','ArrowLeft',' ','Enter'].includes(event.key)){this.keyboardFocus=true;this.game.canvas.setAttribute('data-hand-input','keyboard');this.hoveredCardId=undefined;this.stopHandHint();this.game.canvas.focus({preventScroll:true});this.focusFeedback();}
    if((event.key==='ArrowRight'||event.key==='ArrowLeft')&&this.hand.length){event.preventDefault();this.focusIndex=(this.focusIndex+(event.key==='ArrowRight'?1:this.hand.length-1))%this.hand.length;this.showFocusedCard();this.refreshSelection();}
    else if(event.key===' '&&this.hand[this.focusIndex]){event.preventDefault();this.toggleCard(this.hand[this.focusIndex].id);}
    else if(event.key==='Enter'&&this.hand[this.focusIndex]){event.preventDefault();this.inspectCard(this.hand[this.focusIndex].id);}
  };
  private readonly pointerFocus=()=>{this.keyboardFocus=false;this.game.canvas.setAttribute('data-hand-input','pointer');this.hoveredCardId=undefined;this.stopHandHint();this.focusFeedback();};
  private readonly focusFeedback=()=>{this.cardViews.forEach((view,i)=>this.paintHandFeedback(view,i));};
  private paintHandFeedback(view:CardView,index:number):void {
    if(!view.container.active)return;
    paintCardFeedback(view,{selected:this.selectedIds.has(view.card.id),scoring:!!view.container.getData('activeScoring'),hovered:this.hoveredCardId===view.card.id,focused:this.keyboardFocus&&document.activeElement===this.game.canvas&&index===this.focusIndex});
  }
  private get ready():boolean {const session=gameSession();return !this.playing&&runController(this)?.status==='idle'&&session.lease.writable&&!session.pendingRun&&!session.working;}
  get isPresenting():boolean {return !!this.presentation;}
  private render():void {
    this.stopHandHint();
    this.dialog.refreshArtLoad();
    this.handInput?.cancel();
    requestJokerArt(this,this.run.jokers.map(j=>j.definitionId),()=>{this.dialog.refreshArtLoad();if(!this.presentation&&!this.playing)this.render();});
    this.stage={...this.stage,targetHeat:this.run.stage!.targetHeat};
    this.controlsLive=false;this.stopScoreFire();
    const v=this.view,l=v.layout;this.hoveredCardId=undefined;this.hoveredJokerId=undefined;this.jokerHoverPreview=undefined;v.clear();this.handNavigationButtons=[];v.paperBackground();this.settledCards.clear();this.previewCards=undefined;
    this.stopJokerIdle();
    this.playAuraPulse?.remove();this.playAuraPulse=undefined;this.playAura=undefined;
    if(this.progressBar)this.tweens.killTweensOf(this.progressBar);this.progressTarget=Number.NaN;
    const h=l.hud,c=getCharacter(this.characterId),portrait=l.mode==='portrait',short=l.mode==='landscape';
    if(!portrait)v.add(this.add.graphics().lineStyle(1,T.jade,.22).lineBetween(h.x+h.width+8,h.y,h.x+h.width+8,h.y+h.height));

    const avatarSize=portrait?30:short?44:64,avatarY=h.y+(portrait?6:short?34:66);
    this.roleAvatar=v.add(this.add.container(h.x+12+avatarSize/2,avatarY+avatarSize/2)).setData('baseY',avatarY+avatarSize/2);
    addAvatar(this,this.roleAvatar,c,0,0,avatarSize);
    this.roleFrame=this.add.rectangle(0,0,avatarSize+4,avatarSize+4,T.brass).setFillStyle(T.brass,0).setStrokeStyle(1,T.brass,.6);this.roleAvatar.add(this.roleFrame);
    const bossName=r2BossText(this.run.boss).split('：')[0];
    if(!portrait)v.text(h.x+12,h.y+8,this.run.tourMode==='endless'?'无尽巡演':'大 丑 牌',short?20:28,C.paper);
    v.text(h.x+(portrait?64:76),avatarY,(portrait&&this.run.tourMode==='endless'?'无尽 · ':'')+c.name,portrait?18:short?20:22,C.paper,portrait?h.width-160:h.width-88);
    this.roleText=v.text(h.x+(portrait?64:76),avatarY+(portrait?23:28),this.roleCaption(),14,C.mutedInk,portrait?h.width-160:h.width-88);
    if(!portrait&&!l.shortLandscape)v.text(h.x+12,h.y+(short?96:154),this.stage.index%3===2?'压轴 · '+bossName:this.stage.name,14,C.paper,h.width-24);
    this.heatText=v.text(h.x+12,h.y+(portrait?27:l.shortLandscape?94:short?108:214),'',portrait?20:short?28:36,C.paper,h.width-24).setFontStyle('bold');
    const goldY=h.y+(portrait?31:l.shortLandscape?11:short?180:336);
    this.goldText=l.shortLandscape?v.text(h.x+h.width-12,goldY,'',14,C.brass).setOrigin(1,0):v.text(h.x+12,goldY,'',14,C.brass,h.width-24);
    if(!portrait){
      if(!short)v.text(h.x+12,h.y+191,'本场热度',14,C.paper);
      v.text(h.x+12,h.y+(l.shortLandscape?130:short?146:274),'目标 '+heatText(this.stage.targetHeat),short?14:22,C.brass,h.width-24).setName('hud/target');
      const progressY=h.y+(l.shortLandscape?152:short?168:311);v.rect({x:h.x+12,y:progressY,width:h.width-24,height:5},0x45595b).setStrokeStyle();
      this.progressBar=v.rect({x:h.x+12,y:progressY,width:1,height:5},T.jade).setOrigin(0,.5).setPosition(h.x+12,progressY+2.5).setStrokeStyle();
    }
    if(portrait){this.roleText.setVisible(false);this.goldText.setFontSize(12).setOrigin(1,0).setPosition(h.x+h.width-4,h.y+h.height-this.goldText.height);this.heatText.setPosition(h.x+64,h.y+28).setFontSize(16).setWordWrapWidth(h.width-168);}
    this.renderJokerRack();
    const s=l.scoreBoard;
    v.material(s,T.paperLight,T.paperLight,4);
    v.add(this.add.graphics().lineStyle(1,T.ink,.26).strokeRoundedRect(s.x,s.y,s.width,s.height,4));
    this.resultText=v.text(s.x+8,s.y+6,'选牌，准备开演',17,C.ink).setName('score/source');
    this.scoreLabels=['热度','倍率','预计本手'].map(label=>v.text(0,0,label,14,C.mutedInk).setOrigin(.5,0));
    this.scoreHeat=v.text(0,0,'—',26,C.jade).setOrigin(.5,0).setName('score/heat');
    this.scoreMult=v.text(0,0,'—',26,C.red).setOrigin(.5,0).setName('score/multiplier');
    this.scoreTotal=v.text(0,0,'—',26,C.ink).setOrigin(.5,0).setName('score/total');
    this.breakdownText=v.text(0,0,'',14,C.mutedInk).setVisible(false);
    this.fitScoreReadouts();
    const p=l.playedArea;
    // The landing area uses the table paper; no redundant full-area panel.

    if(p.height>130&&this.textures.exists('p00-mark-joker'))v.add(this.add.image(p.x+p.width/2,p.y+p.height/2,'p00-mark-joker').setDisplaySize(100,100).setAlpha(.055));
    this.previousHandText=v.text(portrait?p.x+10:h.x+12,portrait?p.y+p.height-20:h.y+(short?301:510),'',14,portrait?'#eddfbf':C.brass,portrait?p.width-20:h.width-24).setVisible(!portrait&&!l.shortLandscape);
    this.handCountText=v.text(l.handLabel.x,l.handLabel.y,'',14,'#f0e6cb').setVisible(!portrait&&l.labelHeight>0);
    this.pileText=v.text(l.piles.x+l.piles.width,l.piles.y,'',14,'#c8d4c7').setOrigin(1,0).setVisible(!portrait&&l.labelHeight>0);
    const brief=portrait||l.shortLandscape;
    this.rankButton=v.button(l.buttons.rank,brief?'点数':'点数排序','action/sort-rank',()=>void this.sortHand('rank'),this.ready);
    this.suitButton=v.button(l.buttons.suit,brief?'花色':'花色排序','action/sort-suit',()=>void this.sortHand('suit'),this.ready);
    this.discardButton=v.button(l.tableActions.discard,'弃牌','action/discard',()=>void this.discardSelected(),this.ready&&this.selectedIds.size>0&&this.run.stage!.discardsLeft>=r2DiscardCost(this.run));
    this.playButton=v.button(l.tableActions.play,'出牌','action/play',()=>void this.playSelected(),this.ready&&this.selectedIds.size>0&&this.handsLeft>0,true);
    this.resourceCounts={} as Record<'play'|'discard',Phaser.GameObjects.Text>;
    for(const kind of ['play','discard'] as const){
      const b=l.tableActions[kind],button=kind==='play'?this.playButton:this.discardButton;
      (button.getData('label') as Phaser.GameObjects.Text).setX(b.x+(b.width-62)/2);
      const badgeX=b.x+b.width-31,badgeY=b.y+b.height/2-1;
      v.add(this.add.graphics().fillStyle(T.paper,.16).fillRoundedRect(badgeX-26,badgeY-16,52,32,8).lineStyle(1,kind==='play'?T.paperLight:T.jade,.55).strokeRoundedRect(badgeX-26,badgeY-16,52,32,8));
      this.resourceCounts[kind]=v.text(badgeX,badgeY,'',kind==='play'?21:18,kind==='play'?C.paperLight:C.jade).setOrigin(.5).setFontStyle('bold').setName('button/'+kind+'-left');
    }
    const play=l.tableActions.play;
    this.playAura=v.add(this.add.graphics().lineStyle(2,T.red,.7).strokeRoundedRect(play.x-3,play.y-3,play.width+6,play.height+6,9).setAlpha(0));
    this.statusText=v.text(l.status.x,l.status.y,'',14,'#f3d5ab',l.status.width);
    this.controlsLive=true;
    this.updateHud();this.renderHand();
  }
  /** Owned jokers breathe gently between plays; the idle motion is re-armed after hovers. */
  private armJokerIdle(view:Phaser.GameObjects.Container,index:number):void {
    this.stopJokerIdle(view);
    if(view.getData('f09-art')||this.reducedMotion||!view.active||!this.ready||this.presentation||this.jokerViews.get(this.hoveredJokerId??'')===view)return;
    this.jokerIdle.set(view,this.tweens.add({targets:view,y:Number(view.getData('baseY'))-1.2,duration:2100+index*130,delay:index*170,yoyo:true,repeat:-1,ease:'Sine.easeInOut'}));
  }
  private stopJokerIdle(view?:Phaser.GameObjects.Container):void {
    if(view){this.jokerIdle.get(view)?.remove();this.jokerIdle.delete(view);return;}
    this.jokerIdle.forEach(tween=>tween.remove());this.jokerIdle.clear();
  }
  private renderJokerRack(jokers:readonly R2JokerInstance[]=this.run.jokers):void {
    const v=this.view,l=v.layout;this.jokerViews.clear();
    const context=this.presentation?.score.bossContext,boss=context?context.boss:this.run.stage?.boss;
    const disabled=new Set(r2ScoringDisabledJokerIds(boss,jokers,R2_JOKERS,context?.sealedJokerIds??this.run.stage?.sealedJokerIds??[],context?.challengeDisabledJokerId??this.run.stage?.challengeDisabledJokerId??null));
    this.stopJokerIdle();
    l.slots.forEach((b,i)=>{
      if(i>=r2JokerCapacity(this.run))return;
      const j=jokers[i],shadow=v.add(this.add.graphics());
      shadow.fillStyle(T.ink,.18).fillRoundedRect(b.x+2,b.y+4,b.width,b.height,5);
      if(!j){
        v.material(b,0x224b4c,0x19353f,6);
        if(this.textures.exists('p00-card-back')){
          v.add(this.add.image(b.x+b.width/2,b.y+b.height/2,'p00-card-back').setDisplaySize(b.width-6,b.height-6).setAlpha(.32));
        }
        v.add(this.add.graphics().lineStyle(1,0x8da498,.5).strokeRoundedRect(b.x,b.y,b.width,b.height,6));
        return;
      }
      const d=getJoker(j.definitionId),rarityStyle=JOKER_RARITY[d.rarity],sideLabels=l.mode==='landscape',labelBox=l.jokerLabels[i],labelX=sideLabels?labelBox.x-b.x-b.width/2:-b.width/2+5;
      const stackValue=!sideLabels&&(b.width<64||!!cardAbilityCopy(j.definitionId,{gold:this.run.gold})),valueWidth=sideLabels?labelBox.width:stackValue?b.width-8:b.width-40;
      const marker=v.add(this.add.container(b.x+b.width/2,b.y+b.height/2)).setData('baseX',b.x+b.width/2).setData('baseY',b.y+b.height/2);
      const r=this.add.rectangle(0,0,b.width,b.height,T.paper).setFillStyle(0,0).setStrokeStyle(1,rarityStyle.edge);
      const paper=v.material({x:-b.width/2,y:-b.height/2,width:b.width,height:b.height},0xfff6df,0xd9c29f,5),resolution=1/this.scale.zoom;
      const nameText=(b.height<70&&!sideLabels||l.shortLandscape)&&d.name.length>2?d.name.slice(0,2)+'…':d.name;
      const name=this.add.text(labelX,-b.height/2+(sideLabels?2:5),nameText,{fontFamily:UI_FONT,fontSize:'14px',fontStyle:'bold',color:C.ink,wordWrap:{width:sideLabels?labelBox.width:b.width-((j.edition??'none')!=='none'?30:10),useAdvancedWrap:true},resolution,maxLines:l.shortLandscape?1:2});
      const fitCompactName=()=>{
        if(sideLabels||!stackValue)return;
        name.setWordWrapWidth(0).setFontSize(14);let copy=d.name;
        const room=b.width-((j.edition??'none')!=='none'?30:10);name.setText(copy);
        while(name.width>room&&copy.length){copy=copy.slice(0,-1);name.setText(copy+'…');}
        if(name.width>room)name.setFontSize(12);
      };
      fitCompactName();
      const current=this.add.text(labelX,sideLabels?-b.height/2+(l.shortLandscape?26:38):b.height/2-(stackValue?24:3),this.jokerValue(j),{fontFamily:UI_FONT,fontSize:sideLabels?(l.shortLandscape?'12px':'14px'):b.width<80?'12px':'20px',fontStyle:'bold',color:C.red,resolution,wordWrap:{width:valueWidth,useAdvancedWrap:true},maxLines:l.shortLandscape?1:2}).setOrigin(0,sideLabels?0:1);
      const headHeight=Math.max(26,name.height+8),head=sideLabels?undefined:v.material({x:-b.width/2+2,y:-b.height/2+2,width:b.width-4,height:headHeight},rarityStyle.ink,rarityStyle.edge,3);
      marker.add([paper,...(head?[head]:[])]);
      const artTop=sideLabels?-b.height/2+5:-b.height/2+headHeight+4,artHeight=sideLabels?b.height-10:Math.max(14,b.height-headHeight-(stackValue?54:30)),artSize=Math.min(b.width-10,artHeight),key=jokerArtKey(j.definitionId);
      if(key&&this.textures.exists(key)){
        const art=this.add.container(0,0);
        if(j.definitionId==='f09'){
          const artWidth=Math.min(b.width-6,(b.height-6)*.8);mountF09Art(this,art,artWidth,artWidth/.8,()=>this.reducedMotion);
        }else{const image=this.add.image(0,0,key);image.setScale(Math.min((b.width-6)/image.width,(b.height-6)/image.height));art.add(image);}
        marker.add(art);if(j.definitionId==='f09')marker.setData('f09-art',art);
        art.setData('f09-active',(this.run.stage?.discardsUsed??0)===0&&!disabled.has(j.instanceId)).setData('f09-sealed',disabled.has(j.instanceId));
        if(!sideLabels){
          const bandHeight=stackValue?42:b.width<80?48:30;
          marker.add(this.add.rectangle(0,b.height/2-bandHeight/2-1,b.width-6,bandHeight,T.paperLight,.94));
          if(stackValue)marker.add(this.add.rectangle(0,-b.height/2+12,b.width-6,20,T.paperLight,.94));
          name.setY(stackValue?-b.height/2+5:b.height/2-(b.width<80?48:30)).setFontSize(12).setText(d.name.length>4?d.name.slice(0,3)+'…':d.name);
          if(!stackValue)name.setWordWrapWidth(b.width-10,true);
          current.setColor(C.red).setFontSize(12);
        }
      }else if(!sideLabels&&stackValue){
        // A decorative motif only uses genuine spare room between text rows.
        const top=name.y+name.height+2,bottom=current.y-current.height-2,size=Math.min(artSize,bottom-top);
        if(size>=8)this.jokerMechanism(marker,0,(top+bottom)/2,size,j);
      }else this.jokerMechanism(marker,0,artTop+artHeight/2,artSize,j);
      fitCompactName();
      const trim=this.textures.exists('p00-frame-'+d.rarity)?this.add.image(0,0,'p00-frame-'+d.rarity).setDisplaySize(b.width,b.height).setAlpha(.58):undefined;
      marker.add([...(trim?[trim]:[]),r,name,current]).setData('frame',r).setData('frameColor',rarityStyle.edge).setData('nameLabel',name).setData('valueLabel',current).setData('slotIndex',i);this.jokerViews.set(j.instanceId,marker);
      this.editionTrim(marker,b.width,b.height,j.edition,true);
      if(disabled.has(j.instanceId)){
        r.setStrokeStyle(2,T.red);marker.setData('frameColor',T.red).setData('bossDisabled',true);
        current.setText(sideLabels?'计分封禁':'封禁').setColor(C.red);
        marker.add(this.add.graphics().fillStyle(T.ink,.2).fillRoundedRect(-b.width/2+3,artTop,b.width-6,artHeight,3).lineStyle(2,T.red,.7).lineBetween(-b.width/2+6,artTop+artHeight-3,b.width/2-6,artTop+3));
      }
      marker.add(createJokerRarityBadge(this,d.rarity,{x:b.width/2-31,y:b.height/2-21,compact:true,resolution}).setData('definitionId',d.id).setData('surface','table'));
      this.armJokerIdle(marker,i);
      const hit=v.rect({x:b.x,y:b.y,width:b.width+(sideLabels?labelBox.width+6:0),height:b.height},T.ink).setFillStyle(T.ink,.001).setStrokeStyle();marker.setData('hit',hit);
      v.target(hit,'joker/'+j.instanceId,{tap:()=>this.inspectJoker(j.instanceId),detail:()=>this.inspectJoker(j.instanceId),drag:x=>void this.reorderJoker(j.instanceId,x),holdToDrag:true,enter:()=>this.hoverJoker(j.instanceId,true),leave:()=>this.hoverJoker(j.instanceId,false)});
    });
  }
  private jokerMechanism(marker:Phaser.GameObjects.Container,x:number,y:number,size:number,joker:R2JokerInstance):void {
    drawJokerMotif(this,marker,joker.definitionId,x,y,size);
  }
  private jokerRestriction(j:R2JokerInstance):string|undefined {
    const score=this.presentation?.score,context=score?.bossContext;
    if(score&&context)return r2ScoringDisabledJokerIds(context.boss,score.sourceJokers,R2_JOKERS,context.sealedJokerIds,context.challengeDisabledJokerId).includes(j.instanceId)?'本手计分封禁：本体与版次均暂停':undefined;
    const notice=stageNotice(this.run);return notice?.disabledJokerIds.includes(j.instanceId)?'本场计分封禁：'+notice.title+'；本体与版次均暂停':undefined;
  }
  private jokerAbility(j:R2JokerInstance,preview?:HandPreview) {
    return cardAbilityCopy(j.definitionId,{gold:this.run.gold,inStage:true,discardsUsed:this.run.stage?.discardsUsed,playIndex:this.run.stage?.playIndex,
      selectedCount:preview?.sets.playedIds.length,instanceId:j.instanceId,preview,events:this.presentation?.score.events,disabledReason:this.jokerRestriction(j)});
  }
  private jokerValue(j:R2JokerInstance,preview?:HandPreview):string {
    if(!this.presentation){const copy=this.jokerAbility(j,preview);if(copy)return this.view.layout.mode==='landscape'&&this.view.layout.jokerLabels[0]?.width<60?copy.narrow:copy.compact;}
    return r2JokerValue(j,{gold:this.run.gold,jokerCount:this.run.jokers.length,jokerSlots:r2JokerCapacity(this.run),deckSize:this.run.deckInstances.length-this.run.destroyedIds.length,discardsUsed:this.run.stage?.discardsUsed,quadRefundUsed:this.run.stage?.quadRefundUsed});
  }
  private refreshJokerLabels(preview?:HandPreview):void {
    for(const joker of this.run.jokers){const view=this.jokerViews.get(joker.instanceId),label=view?.getData('valueLabel') as Phaser.GameObjects.Text|undefined;
      label?.setText(view?.getData('bossDisabled')?(this.view.layout.mode==='landscape'?'计分封禁':'封禁'):this.jokerValue(joker,preview));
      const art=view?.getData('f09-art') as Phaser.GameObjects.Container|undefined;art?.setData('f09-active',!view?.getData('bossDisabled')&&(this.run.stage?.discardsUsed??0)===0);
    }
  }
  private roleCaption():string {const notice=stageNotice(this.run);return notice?.warning?notice.title:getCharacter(this.characterId).passiveName;}
  private cardPiece(card:PlayingCard,b:Box):CardView {
    const c=this.view.add(this.add.container(b.x+b.width/2,b.y+b.height/2)).setData('width',b.width).setData('height',b.height).setData('cardFace',true).setData('cardId',card.id);
    const radius=Math.min(7,b.width*.09),shadow=this.add.graphics(),edgeGlow=this.add.graphics();
    shadow.fillStyle(T.ink,.05).fillRoundedRect(-b.width/2+2,-b.height/2+6,b.width,b.height,radius);
    shadow.fillStyle(T.ink,.07).fillRoundedRect(-b.width/2+1,-b.height/2+3,b.width,b.height,radius);
    edgeGlow.setName('card/feedback').lineStyle(3,T.focus,.9).strokeRoundedRect(-b.width/2-1,-b.height/2-1,b.width+2,b.height+2,radius).setAlpha(0);
    const bg=this.add.rectangle(0,0,b.width,b.height,T.paper).setStrokeStyle(1,T.brass);
    const face=this.view.material({x:-b.width/2+1,y:-b.height/2+1,width:b.width-2,height:b.height-2},0xfff8e8,0xe8d6b9,radius).setAlpha(.72);
    c.add([shadow,edgeGlow,bg,face]);
    if(this.textures.exists('p00-paper'))c.add(this.add.tileSprite(0,0,Math.max(1,b.width-10),Math.max(1,b.height-10),'p00-paper').setTilePosition(card.rank*17,SUITS.indexOf(card.suit)*37).setAlpha(.16));
    const edgeLines=this.add.graphics();
    edgeLines.lineStyle(1,T.ink,.08).strokeRoundedRect(-b.width/2+2,-b.height/2+2,b.width-4,b.height-4,radius-1);
    edgeLines.lineStyle(1,T.ink,.18).beginPath().moveTo(-b.width/2+5,b.height/2-3).lineTo(b.width/2-5,b.height/2-3).strokePath();
    const faceGlow=this.add.graphics().fillStyle(0xffedb6,.28).fillRoundedRect(-b.width/2+2,-b.height/2+2,b.width-4,b.height-4,radius).lineStyle(3,0xffe7a2,.95).strokeRoundedRect(-b.width/2+3,-b.height/2+3,b.width-6,b.height-6,radius-1).setAlpha(0);
    faceGlow.lineStyle(1,0xfffbdf,.85);for(let i=0;i<3;i++)faceGlow.beginPath().moveTo(-b.width*.3,-b.height*.3+i*4).lineTo(b.width*.28,-b.height*.15+i*4).strokePath();
    c.add([edgeLines,faceGlow]);
    if(this.textures.exists('p00-frame-common'))c.add(this.add.image(0,0,'p00-frame-common').setDisplaySize(b.width,b.height).setAlpha(.32));
    const small=b.width<90,tiny=b.width<64,edge=Math.max(4,Math.min(9,b.width*.055)),resolution=Math.max(1.5,1/this.scale.zoom);
    const inkHex=SUIT_INK[card.suit],ink='#'+inkHex.toString(16).padStart(6,'0');
    // Reserve the exposed index column before arranging any pip / court art.
    const pointSize=Math.max(14,Math.min(small?19:b.width<=112?22:30,b.width*.23,b.height*.19)),label=this.add.text(-b.width/2+edge,-b.height/2+edge,rankLabel(card.rank)+'\n'+SUIT_SYMBOL[card.suit],{fontFamily:'Georgia,serif',fontSize:`${pointSize}px`,fontStyle:'bold',color:ink,lineSpacing:-4,resolution}).setName('rank-index');
    const corner=this.add.text(b.width/2-edge,b.height/2-edge,rankLabel(card.rank)+(small?'':'\n'+SUIT_SYMBOL[card.suit]),{fontFamily:'Georgia,serif',fontSize:`${Math.min(small?14:22,b.width*.2,b.height*.15)}px`,fontStyle:'bold',color:ink,lineSpacing:-4,resolution}).setOrigin(0,0).setAngle(180).setShadow(0,0,'#fff9ea',3,true,true);
    const faceArt:Phaser.GameObjects.GameObject[]=[],pipWidth=Math.max(16,b.width-2*(label.width+edge+6));
    if(card.rank<=10){
      if(tiny){
        faceArt.push(this.add.text(0,b.height*.04,SUIT_SYMBOL[card.suit],{fontFamily:'Georgia,serif',fontSize:`${Math.min(54,b.width*.46,b.height*.3)}px`,color:ink,resolution}).setOrigin(.5).setShadow(0,1,'#d9c6a7',1,true,false));
      }else{
        // Classic symmetric pip layouts; lower-half pips draw inverted like a printed deck.
        const pipSize=Math.min(b.width*(card.rank>=7?.24:.3),b.height*.21,pipWidth*.42);
        for(const [ux,uy] of PIP_LAYOUTS[card.rank]??[]){
          const pip=this.add.text(ux*pipWidth,uy*b.height*.72,SUIT_SYMBOL[card.suit],{fontFamily:'Georgia,serif',fontSize:`${pipSize}px`,color:ink,resolution}).setOrigin(.5).setName('card-pip');
          if(uy>0)pip.setAngle(180);
          faceArt.push(pip);
        }
      }
    }else if(card.rank===14){
      const ring=this.add.graphics();
      ring.lineStyle(2,T.brass,.85).strokeCircle(0,b.height*.02,b.width*.33);
      ring.lineStyle(1,T.brass,.5).strokeCircle(0,b.height*.02,b.width*.385);
      for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;ring.fillStyle(T.brass,.9).fillCircle(Math.cos(a)*b.width*.355,b.height*.02+Math.sin(a)*b.width*.355,2.2);}
      const ace=this.add.text(0,b.height*.02,SUIT_SYMBOL[card.suit],{fontFamily:'Georgia,serif',fontSize:`${Math.min(b.width*.56,b.height*.38)}px`,color:ink,resolution}).setOrigin(.5).setShadow(0,2,'#d9c6a7',2,true,false);
      faceArt.push(ring,ace);
    }else if(tiny){
      faceArt.push(this.add.text(0,b.height*.08,SUIT_SYMBOL[card.suit],{fontFamily:'Georgia,serif',fontSize:`${Math.min(54,b.width*.42)}px`,color:ink,resolution}).setOrigin(.5));
    }else{
      // Every court card is a troupe member in an enamel frame with a suit ribbon.
      const characterId=COURT_CHARACTER[card.rank+'-'+card.suit],key=characterId?avatarKey(characterId):undefined;
      const fw=Math.min(b.width*.62,b.width-2*(label.width+edge+4)),fh=b.height*.6,fy=b.height*.02,frame=this.add.graphics();
      frame.fillStyle(T.paperEdge,1).fillRoundedRect(-fw/2,fy-fh/2,fw,fh,4);
      frame.lineStyle(1,T.jade,1).strokeRoundedRect(-fw/2,fy-fh/2,fw,fh,4);
      frame.lineStyle(1,0xfff3d6,.8).strokeRoundedRect(-fw/2+3,fy-fh/2+3,fw-6,fh-6,3);
      faceArt.push(frame);
      if(key&&this.textures.exists(key)){
        const source=this.textures.get(key).getSourceImage() as HTMLImageElement,courtKey='p03-court-'+characterId;
        if(!this.textures.exists(courtKey)){
          const court=this.textures.createCanvas(courtKey,256,320)!;
          const aspect=256/320,cw=Math.min(source.width,source.height*aspect),ch=cw/aspect;
          court.getContext().drawImage(source,(source.width-cw)/2,Math.max(0,(source.height-ch)/2),cw,ch,0,0,256,320);court.refresh();
        }
        faceArt.push(this.add.image(0,fy,courtKey).setDisplaySize(fw-8,fh-8));
      }else faceArt.push(this.add.text(0,fy,SUIT_SYMBOL[card.suit],{fontFamily:'Georgia,serif',fontSize:`${Math.min(b.width*.4,b.height*.28)}px`,color:ink,resolution}).setOrigin(.5));
      const ribbon=this.add.graphics();
      ribbon.fillStyle(inkHex,.92).fillRect(-fw/2+2,fy+fh/2-16,fw-4,14);
      ribbon.lineStyle(1,0xfff3d6,.6).lineBetween(-fw/2+2,fy+fh/2-16,fw/2-2,fy+fh/2-16);
      faceArt.push(ribbon,this.add.text(0,fy+fh/2-9,SUIT_SYMBOL[card.suit],{fontFamily:'Georgia,serif',fontSize:'12px',fontStyle:'bold',color:'#fff6dd',resolution}).setOrigin(.5));
    }
    const scoringMark=this.add.text(-b.width/2+edge,b.height/2-21,'★',{fontFamily:UI_FONT,fontSize:'14px',fontStyle:'bold',color:C.jade,resolution}).setVisible(false);
    c.add([...faceArt,label,corner,scoringMark]);
    const selectionMark=this.add.text(-b.width/2+edge+9,-b.height/2+edge+label.height+11,'✓',{fontFamily:UI_FONT,fontSize:'14px',fontStyle:'bold',color:C.ink,backgroundColor:C.jadeSoft,padding:{x:4,y:1},resolution}).setOrigin(.5).setVisible(false);c.add(selectionMark);
    if(card.enhancement){
      const enhancement=ENHANCEMENT_UI[card.enhancement],bx=b.width/2-14,by=-b.height/2+16;
      const badge=this.add.graphics().fillStyle(enhancement.ink).fillRoundedRect(bx-10,by-10,20,20,4).lineStyle(1,0xffe4ad).strokeRoundedRect(bx-10,by-10,20,20,4);
      c.add([badge,this.add.text(bx,by,enhancement.mark,{fontFamily:UI_FONT,fontSize:'12px',color:'#fff8e5',resolution}).setOrigin(.5)]);
    }
    this.editionTrim(c,b.width,b.height,card.edition);
    const back=this.textures.exists('p00-card-back')?this.add.image(0,0,'p00-card-back').setDisplaySize(b.width,b.height).setVisible(false):undefined;if(back)c.add(back);
    // Keep sheen entirely inside the face; container masks use world coordinates in Phaser.
    let sheen:Phaser.GameObjects.Image|undefined;
    if(!this.textures.exists('p03-sheen')){
      const foil=this.textures.createCanvas('p03-sheen',1536,192)!,fc=foil.getContext();
      for(let frame=0;frame<12;frame++){
        fc.save();fc.translate(frame*128,0);fc.beginPath();fc.roundRect(0,0,128,192,8);fc.clip();
        const x=-180+frame*34,grad=fc.createLinearGradient(x,192,x+110,0);
        grad.addColorStop(0,'rgba(255,246,220,0)');grad.addColorStop(.4,'rgba(255,246,220,0)');grad.addColorStop(.5,'rgba(255,250,232,.8)');grad.addColorStop(.6,'rgba(255,246,220,0)');grad.addColorStop(1,'rgba(255,246,220,0)');
        fc.fillStyle=grad;fc.fillRect(0,0,128,192);fc.restore();foil.add(String(frame),0,frame*128,0,128,192);
      }
      foil.refresh();
    }
    if(this.textures.exists('p03-sheen')){
      sheen=this.add.image(0,0,'p03-sheen','0').setDisplaySize(b.width-4,b.height-4).setAlpha(0);c.add(sheen);
    }
    return {card,container:c,background:bg,scoringMark,selectionMark,back,edgeGlow,faceGlow,sheen};
  }
  /** Edition light stays on the rim so rank, pips and character art remain readable. */
  private editionTrim(container:Phaser.GameObjects.Container,width:number,height:number,edition:PlayingCard['edition'],joker=false):void {
    if(!edition||edition==='none')return;
    const rim=this.add.graphics(),colors=edition==='foil'?[0xc0e9f5]:edition==='holographic'?[0xc8a8f5,0x8fe5d9]:[0xf3bc79,0xe390c7,0x93d9e5,0xbce09f];
    colors.forEach((color,i)=>{rim.lineStyle(edition==='polychrome'?2:1.5,color,.9).strokeRoundedRect(-width/2+3+i*1.7,-height/2+3+i*1.7,width-6-i*3.4,height-6-i*3.4,5);});
    const label=edition==='foil'?'箔':edition==='holographic'?'虹':'彩',labelY=joker?-height/2+12:height/2-12;
    rim.fillStyle(colors[0],.9).fillCircle(width/2-12,labelY,8);container.add(rim);container.setData('editionRim',rim);
    container.add(this.add.text(width/2-12,labelY,label,{fontFamily:UI_FONT,fontSize:'11px',fontStyle:'bold',color:'#17383c',resolution:Math.max(1.5,1/this.scale.zoom)}).setOrigin(.5).setName('edition-badge'));
    if(!this.reducedMotion){const shimmer=this.tweens.add({targets:rim,alpha:{from:.55,to:1},duration:1100,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});rim.setData('editionTween',shimmer);rim.once('destroy',()=>shimmer.remove());}
  }
  private revealCard(view:CardView):void {
    if(!view.dealing&&!view.back?.visible)return;
    view.dealing=false;this.tweens.killTweensOf(view.container);
    if(view.back){this.tweens.killTweensOf(view.back);view.back.setVisible(false);}
    if(!this.presentation){const index=this.cardViews.indexOf(view);if(index>=0)this.restingCard(view,index,false);}
  }
  /** New cards fly face-down from the deck edge with a stagger, then flip face-up. */
  private revealDrawnCards(previousIds:readonly string[]):void {
    if(this.reducedMotion)return;
    const l=this.view.layout,deckX=l.hand.x+l.hand.width+46,deckY=l.hand.y+l.hand.height*.62;
    this.cardViews.filter(view=>view.container.visible&&!previousIds.includes(view.card.id)&&view.back).forEach((view,i)=>{
      const back=view.back!,baseScale=back.scaleX,container=view.container;
      const rest={x:container.x,y:container.y,angle:container.angle,scaleX:container.scaleX,scaleY:container.scaleY};
      view.dealing=true;back.setVisible(true);
      container.setPosition(deckX,deckY).setScale(.42).setAngle(16).setAlpha(0);
      this.audio.deal(i);
      this.tweens.add({targets:container,x:rest.x,y:rest.y,angle:rest.angle,alpha:1,scaleX:rest.scaleX,scaleY:rest.scaleY,duration:240,delay:i*55,ease:'Cubic.easeOut',onComplete:()=>{
        if(!container.active||!this.cardViews.includes(view))return;
        if(this.presentation||this.reducedMotion){this.revealCard(view);return;}
        this.tweens.add({targets:back,scaleX:0,duration:95,ease:'Sine.easeIn',onComplete:()=>{
          if(!view.container.active||!this.cardViews.includes(view))return;back.setVisible(false).setScale(baseScale,back.scaleY);
          if(this.presentation||this.reducedMotion)return;
          this.tweens.add({targets:view.container,scaleX:{from:Math.max(.2,rest.scaleX*.2),to:rest.scaleX},duration:95,ease:'Sine.easeOut',onComplete:()=>{view.dealing=false;if(view.container.active)this.restingCard(view,this.cardViews.indexOf(view),true);}});
        }});
      }});
    });
  }
  private renderHand():void {
    this.handInput?.cancel();
    this.hoveredCardId=undefined;this.cardViews.forEach(v=>{v.sheenTween?.remove();this.tweens.killTweensOf(v.container);v.hit?.destroy();v.container.destroy();});this.cardViews=[];const v=this.view,l=v.layout;
    this.handStart=l.handStart;this.focusIndex=Math.max(0,Math.min(this.focusIndex,this.hand.length-1));
    for(const button of this.handNavigationButtons){(button.getData('label') as Phaser.GameObjects.Text)?.destroy();(button.getData('buttonArt') as Phaser.GameObjects.Container)?.destroy();button.destroy();}this.handNavigationButtons=[];
    this.hand.forEach((card,i)=>{
      const area=l.cards[i],b=area.visual,hit=area.hit,cv=this.cardPiece(card,b);cv.container.setVisible(area.visible);
      const target=v.rect(hit,T.ink).setFillStyle(T.ink,.001).setStrokeStyle().setVisible(area.visible);cv.hit=target;
      v.target(target,'card/'+card.id,{tap:()=>this.toggleCard(card.id),detail:()=>this.inspectCard(card.id),enter:()=>this.hoverCard(card.id,true),leave:()=>this.hoverCard(card.id,false)});this.cardViews.push(cv);
    });
    if(l.handOverflow){
      this.handNavigationButtons=[v.button(l.handNavigation.previous,'‹','action/hand-previous',()=>this.scrollHand(-1),this.ready&&l.handStart>0),v.button(l.handNavigation.next,'›','action/hand-next',()=>this.scrollHand(1),this.ready&&l.handStart+l.visibleCardCount<this.hand.length)];
    }
    this.updateHandCount();
    this.refreshSelection();
    const visible=l.cards.filter(card=>card.visible),first=visible[0],last=visible.at(-1);
    this.handInput?.setBounds(first&&last?{x:first.hit.x,y:l.hand.y,width:last.hit.x+last.hit.width-first.hit.x,height:l.hand.height}:undefined);
  }
  private scrollHand(delta:number):void {if(!this.ready)return;const l=this.view.layout,next=Math.max(0,Math.min(this.hand.length-l.visibleCardCount,l.handStart+delta));if(next===this.handStart)return;this.handStart=next;this.renderHand();}
  private showFocusedCard():void {const l=this.view.layout;if(this.focusIndex>=l.handStart&&this.focusIndex<l.handStart+l.visibleCardCount)return;this.handStart=this.focusIndex<l.handStart?this.focusIndex:this.focusIndex-l.visibleCardCount+1;if(!this.playing)this.renderHand();}
  private updateHandCount():void {
    const l=this.view.layout,limit=this.run.stage!.handLimit;
    this.handCountText.setText('手牌 '+this.run.handOrder.length+' / '+limit+(l.handOverflow?' · '+(l.handStart+1)+'–'+(l.handStart+l.visibleCardCount):'')).setVisible((l.mode!=='portrait'&&l.labelHeight>0)||l.handOverflow);
    this.handCountText.setPosition(l.mode==='portrait'?l.hand.x+48:l.handLabel.x,l.mode==='portrait'?l.hand.y+2:l.handLabel.y);
  }
  private sweepSheen(view:CardView):void {
    const sheen=view.sheen;if(!sheen||this.reducedMotion||this.presentation||this.playing)return;
    view.sheenTween?.remove();
    sheen.setX(0).setAlpha(0);
    const sweep={t:0};
    view.sheenTween=this.tweens.add({targets:sweep,t:1,duration:280,ease:'Sine.easeIn',onUpdate:()=>{if(sheen.active)sheen.setFrame(String(Math.min(11,Math.floor(sweep.t*12)))).setAlpha(Math.sin(sweep.t*Math.PI)*.34);},onComplete:()=>{if(sheen.active)sheen.setAlpha(0);view.sheenTween=undefined;}});
  }
  private hoverCard(id:string,enter:boolean):void {
    if(enter&&!this.ready)return;
    const index=this.cardViews.findIndex(view=>view.card.id===id),view=this.cardViews[index];if(!view)return;
    if(enter){const previous=this.cardViews.find(card=>card.card.id===this.hoveredCardId);this.hoveredCardId=id;if(previous&&previous!==view)this.restingCard(previous,this.cardViews.indexOf(previous),true);this.revealCard(view);this.sweepSheen(view);this.audio.hoverTick();}else if(this.hoveredCardId===id)this.hoveredCardId=undefined;
    this.restingCard(view,index,true);
    this.orderSelectedCards();
  }
  /** Stable seats and left-to-right layers keep every exposed index reachable. */
  private restingCard(view:CardView,index:number,animate:boolean):void {
    this.paintHandFeedback(view,index);
    if(!view.container.active||view.dealing||this.playing||this.presentation)return;
    const b=this.view.layout.cards[index]?.visual;if(!b)return;
    const selected=this.selectedIds.has(view.card.id),hovered=this.hoveredCardId===view.card.id;
    const angle=0,y=b.y+b.height/2-(selected?16:0)-(hovered&&!this.reducedMotion?4:0),scale=1;
    this.tweens.killTweensOf(view.container);view.container.setAlpha(1);view.faceGlow?.setAlpha(0);
    if(animate&&!this.reducedMotion)this.tweens.add({targets:view.container,x:b.x+b.width/2,y,angle,scaleX:scale,scaleY:scale,duration:selected?150:115,ease:selected?'Back.easeOut':'Sine.easeOut'});else view.container.setPosition(b.x+b.width/2,y).setScale(scale).setAngle(angle);
    this.view.root.bringToTop(this.handCountText);this.view.root.bringToTop(this.pileText);
  }
  private hoverJoker(id:string,enter:boolean):void {
    if(enter&&!this.ready)return;
    if(enter){const previous=this.jokerViews.get(this.hoveredJokerId??'');this.hoveredJokerId=id;if(previous)this.restingJoker(previous,true);}else if(this.hoveredJokerId===id)this.hoveredJokerId=undefined;
    const view=this.jokerViews.get(id);if(view)this.restingJoker(view,true);
    if(enter)this.showJokerHover(id);else if(!this.hoveredJokerId){this.jokerHoverPreview?.destroy();this.jokerHoverPreview=undefined;}
  }
  private showJokerHover(id:string):void {
    this.jokerHoverPreview?.destroy();this.jokerHoverPreview=undefined;
    const j=this.run.jokers.find(joker=>joker.instanceId===id),l=this.view.layout;if(!j||l.mode==='portrait'||!this.ready)return;
    const slot=l.slots[this.run.jokers.indexOf(j)],top=slot.y+slot.height+12;
    const width=Math.min(410,l.preview.width),height=Math.min(234,l.tools.y-top-10);if(width<250||height<160)return;
    const x=Phaser.Math.Clamp(slot.x+slot.width/2-width/2,l.preview.x,l.preview.x+l.preview.width-width),d=getJoker(j.definitionId);
    const panel=this.view.add(this.add.container(x,top));this.jokerHoverPreview=panel;
    const g=this.add.graphics().fillStyle(0x071e29,.65).fillRoundedRect(3,7,width,height,9).fillStyle(0xf4e8d3).fillRoundedRect(0,0,width,height,9).lineStyle(1,0xd0af72).strokeRoundedRect(0,0,width,height,9);
    const size=Math.min(168,height-24,width*.44),key=jokerArtKey(j.definitionId);panel.add(g);
    if(key&&this.textures.exists(key)){
      const image=this.add.image(12+size/2,12+size/2,key);image.setScale(Math.min(size/image.width,size/image.height));panel.add(image);
    }
    else drawJokerMotif(this,panel,j.definitionId,12+size/2,12+size/2,size);
    panel.add(createJokerRarityBadge(this,d.rarity,{x:12+size-61,y:12+size-25,resolution:1.5}).setData('definitionId',d.id).setData('surface','hover'));
    const tx=24+size,tw=width-tx-12,style={fontFamily:UI_FONT,resolution:1.5,wordWrap:{width:tw,useAdvancedWrap:true}};
    panel.add(this.add.text(tx,14,d.name,{...style,fontSize:'20px',fontStyle:'bold',color:'#203744'}));
    const copy=this.jokerAbility(j,this.selectionPreview());
    panel.add(this.add.text(tx,46,copy?.compact??this.jokerValue(j),{...style,fontSize:'20px',fontStyle:'bold',color:'#a14b38'}));
    panel.add(this.add.text(tx,80,copy?.summary??d.description,{...style,fontSize:'14px',color:'#314a50',maxLines:Math.max(1,Math.floor((height-118)/19))}).setLineSpacing(3));
    panel.add(this.add.text(tx,height-30,'点击看完整卡面',{...style,fontSize:'14px',color:'#486a63'}));
    this.view.root.bringToTop(panel);panel.once('destroy',()=>this.tweens.killTweensOf(panel));
    if(!this.reducedMotion){panel.setAlpha(0).setY(top+5);this.tweens.add({targets:panel,alpha:1,y:top,duration:130,ease:'Sine.easeOut'});}
  }
  private restingJoker(view:Phaser.GameObjects.Container,animate:boolean,allowIdle=true):void {
    if(!view.active||this.playing||this.presentation)return;
    const frame=view.getData('frame') as Phaser.GameObjects.Rectangle,hit=view.getData('hit') as Phaser.GameObjects.Rectangle,hovered=this.jokerViews.get(this.hoveredJokerId??'')===view,x=Number(view.getData('baseX')),baseY=Number(view.getData('baseY')),lift=Math.min(6,Math.max(0,baseY-frame.height/2-6)*.5),y=baseY-(hovered&&!this.reducedMotion?lift:0),scale=hovered&&!this.reducedMotion?1.045:1;
    this.stopJokerIdle(view);this.tweens.killTweensOf(view);frame.setStrokeStyle(hovered?4:2,hovered?0xffdea3:Number(view.getData('frameColor')));
    const idle=()=>{if(allowIdle&&!hovered)this.armJokerIdle(view,Number(view.getData('slotIndex'))||0);};
    if(animate&&!this.reducedMotion)this.tweens.add({targets:view,x,y,angle:0,scaleX:scale,scaleY:scale,duration:120,ease:'Sine.easeOut',onComplete:idle});else {view.setPosition(x,y).setAngle(0).setScale(scale);idle();}
    if(hovered)this.view.root.bringToTop(view);else if(hit?.active)this.view.root.moveBelow<Phaser.GameObjects.GameObject>(view,hit);
  }
  private clearHover():void {this.hoveredCardId=undefined;this.hoveredJokerId=undefined;this.jokerHoverPreview?.destroy();this.jokerHoverPreview=undefined;this.cardViews.forEach((view,i)=>{this.revealCard(view);this.restingCard(view,i,false);});this.orderSelectedCards();this.stopJokerIdle();this.jokerViews.forEach(view=>this.restingJoker(view,false,false));}
  /** Rebuild every card layer from hand order, independent of clicks, selection and hover. */
  private orderSelectedCards():void {
    if(this.presentation)return;
    this.cardViews.forEach(view=>this.view.root.bringToTop(view.container));
    this.view.root.bringToTop(this.handCountText);this.view.root.bringToTop(this.pileText);
  }
  private refreshSelection(animateId?:string):void {
    const preview=this.selectionPreview();
    const active=this.presentation?.score.sets.activeScoringIds??preview?.sets.activeScoringIds??[];
    const disabledIds=r2DisabledCards(this.run.boss,this.stage.index,this.hand),suppressed=this.presentation?.score.events.filter(e=>e.operation==='ordinary-points-suppressed').map(e=>e.targetCardId)??r2ScoreContext(this.run,this.hand,[...this.selectedIds]).ordinaryPointsSuppressedIds;
    this.cardViews.forEach((v,i)=>{
      const selected=this.selectedIds.has(v.card.id),scoring=active.includes(v.card.id);
      v.container.setData('selected',selected).setData('activeScoring',scoring);
      v.selectionMark?.setVisible(selected);
      const disabled=disabledIds.includes(v.card.id),pointsZero=suppressed.includes(v.card.id);v.background.setFillStyle(disabled?0xd2d0cb:T.paper);
      this.restingCard(v,i,animateId===v.card.id);
      v.scoringMark.setText(disabled?'失效':pointsZero?'点数0':'★').setVisible(disabled||pointsZero||scoring);
      if(v.hit)v.hit.input!.enabled=this.ready&&this.view.layout.cards[i].visible;
    });
    this.orderSelectedCards();
    if(!this.presentation){this.refreshJokerLabels(preview);this.previewSelection(preview);this.renderSelectedCards(preview);}
    this.updateControls();
  }
  private landingBoxes(count:number,reserved=0):Box[] {
    const area=this.view.layout.playedArea,p={...area,y:area.y+reserved,height:area.height-reserved},bottomNote=0,h=Math.max(24,p.height-bottomNote-14),gap=8;
    const width=Math.min(106,h/1.4,(p.width-24-gap*(count-1))/Math.max(count,1)),height=width*1.4,total=count*width+(count-1)*gap;
    return Array.from({length:count},(_,i)=>({x:p.x+(p.width-total)/2+i*(width+gap),y:p.y+(p.height-bottomNote-height)/2,width,height}));
  }
  private renderSelectedCards(preview?:HandPreview):void {
    this.previewCards?.destroy();this.previewCards=this.view.add(this.add.container(0,0));const p=this.view.layout.playedArea;
    if(!preview){
      const notice=stageNotice(this.run),hint=notice?.warning?notice.title+(p.height>=90?'\n'+notice.description:''):this.run.stage!.playIndex===0?'选 1–5 张，凑牌型出牌\n不合适？弃牌换新牌':'选牌，准备下一手';
      const text=this.add.text(p.x+p.width/2,p.y+p.height/2,hint,{fontFamily:UI_FONT,fontSize:p.height<90||notice?.warning?'14px':'18px',color:notice?.warning?C.red:C.mutedInk,align:'center',lineSpacing:4,wordWrap:{width:p.width-24,useAdvancedWrap:true},resolution:Math.max(1.5,1/this.scale.zoom)}).setOrigin(.5);
      this.previewCards.add(text);return;
    }
    const entries=preview.breakdown.events.filter(e=>e.phase!=='base'&&e.phase!=='finalScore'&&e.phase!=='afterHand');
    const source=(e:ScoreEvent)=>e.sourceType==='joker'?getJoker(e.sourceDefinitionId).name:e.sourceType==='character'?getCharacter(this.characterId).name:this.hand.some(c=>c.id===e.targetCardId)?(()=>{const c=this.hand.find(c=>c.id===e.targetCardId)!;return rankLabel(c.rank)+SUIT_SYMBOL[c.suit];})():HAND_LABELS[e.sourceDefinitionId as keyof typeof HAND_LABELS]??'牌型';
    const summary='牌型 '+fractionText(preview.base.H)+' × '+fractionText(preview.base.M)+'  →  '+entries.map(e=>source(e)+' '+this.operationText(e)).join('  →  ');
    const samples=this.run.jokers.flatMap(joker=>{const copy=this.jokerAbility(joker,preview);return copy?[{joker,copy,name:getJoker(joker.definitionId).name}]:[];});
    const benefits=[...samples].sort((a,b)=>Number(!!b.copy.bodyActive)-Number(!!a.copy.bodyActive)).map(({name,copy})=>name+' '+(copy.bodyActive?copy.benefit:copy.editionActive?'仅版次加成':'未触发'));
    const ledger=this.add.text(p.x+12,p.y+8,benefits.length?'本手：'+benefits.join(' · ')+'  ›':'计分来源  ›',{fontFamily:UI_FONT,fontSize:'14px',color:C.ink,lineSpacing:4,wordWrap:{width:p.width-24,useAdvancedWrap:true},resolution:Math.max(1.5,1/this.scale.zoom)}).setName('selection-joker-benefits');
    // Keep at most two lines on the table; all conditions and sources stay one tap away.
    const maxHeight=Math.min(44,Math.max(22,p.height-28));let shown=benefits.length;
    while(ledger.height>maxHeight&&shown>1){shown--;ledger.setText('本手：'+benefits.slice(0,shown).join(' · ')+` · 另${benefits.length-shown}项  ›`);}
    if(ledger.height>maxHeight)ledger.setText('本手加成与条件  ›');
    this.previewCards.add(ledger);
    const hit=this.view.rect({x:p.x,y:p.y,width:p.width,height:Math.max(44,ledger.height+16)},T.ink).setFillStyle(T.ink,.001).setStrokeStyle();this.previewCards.add(hit);
    const sampleDetails=samples.map(({joker,name,copy})=>name+' · '+(copy.bodyActive?copy.benefit:'本体未触发')+'\n'+(copy.state??copy.summary)+(joker.edition!=='none'?'\n版次：'+editionEffectText(joker.edition).split('。')[0]+(copy.editionActive?' · 本手生效':' · 本手未生效'):'')).join('\n\n');
    this.view.target(hit,'score/sources',{tap:()=>this.dialog.open('本手计分来源',summary.replaceAll('  →  ','\n→ ')+(preview.scoreRange.minimum!==preview.scoreRange.maximum?'\n概率分支显示上下界，不预知随机结果。':'\n最终向下取整 = '+heatText(preview.scoreRange.minimum)),[],samples.length?{effectBody:sampleDetails,collapseRules:true,rulesLabel:'完整计分明细'}:{})});
    const reserved=Math.max(36,ledger.height+16);
    if(p.height-reserved<52)return;
    const cards=this.hand.filter(card=>this.selectedIds.has(card.id)),boxes=this.landingBoxes(cards.length,reserved);
    cards.forEach((card,i)=>{const cv=this.cardPiece(card,boxes[i]);this.previewCards!.add(cv.container);cv.container.setAlpha(.86);paintCardFeedback(cv,{scoring:preview.sets.activeScoringIds.includes(card.id)});cv.scoringMark.setVisible(preview.sets.activeScoringIds.includes(card.id));});
  }
  private updateControls():void {
    if(!this.controlsLive)return;
    this.view.setEnabled(this.rankButton,this.ready);this.view.setEnabled(this.suitButton,this.ready);
    const handWindow=this.view.layout;this.handNavigationButtons.forEach((button,i)=>this.view.setEnabled(button,this.ready&&(i===0?handWindow.handStart>0:handWindow.handStart+handWindow.visibleCardCount<this.hand.length)));
    const notice=stageNotice(this.run),discardGoldCost=notice?.discardGoldCost??0;
    (this.discardButton.getData('label') as Phaser.GameObjects.Text).setText(discardGoldCost?'弃牌 -1金':r2DiscardCost(this.run)===2?'弃牌 ×2':'弃牌');
    this.view.setEnabled(this.discardButton,this.ready&&this.selectedIds.size>0&&this.run.stage!.discardsLeft>=r2DiscardCost(this.run)&&this.run.gold>=discardGoldCost);
    this.view.setEnabled(this.playButton,this.ready&&this.selectedIds.size>0&&this.handsLeft>0);
    const portrait=this.view.layout.mode==='portrait';
    const reason=this.playing?this.presentation?'正在结算 · 可快进':'正在换牌':this.handsLeft===1?'最后 1 次出牌 · 达到目标才能过关':!this.selectedIds.size?(handWindow.handOverflow?'‹ › 翻页 · 按住横滑选牌':portrait?'按住横滑选牌 · 长按看详情':'按住横滑选牌 · 最多 5 张'):this.run.gold<discardGoldCost?'弃牌需1金币 · 仍可出牌':this.run.stage!.discardsLeft<r2DiscardCost(this.run)?'弃牌次数已用完':this.handsLeft<=0?'出牌次数已用完':'已选 '+this.selectedIds.size+' / 5';
    this.statusText.setText(this.statusMessage||reason);
    // Balatro-style call-to-action: the playable state breathes a warm aura.
    const auraOn=!!this.playButton.input?.enabled&&this.selectedIds.size>0&&!this.presentation&&!this.playing;
    if(this.playAura){
      if(this.reducedMotion){this.playAuraPulse?.remove();this.playAuraPulse=undefined;this.playAura.setAlpha(auraOn ? .5 : 0);return;}
      if(auraOn&&!this.playAuraPulse&&!this.reducedMotion)this.playAuraPulse=this.tweens.add({targets:this.playAura,alpha:.8,duration:640,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      if(!auraOn&&this.playAuraPulse){this.playAuraPulse.remove();this.playAuraPulse=undefined;this.playAura.setAlpha(0);}
    }
  }
  private preview(){
    const stage=this.run.stage!;
    return previewR2Hand({rulesVersion:'r2',runId:this.run.runId,rootId:'preview',hand:this.hand,selectedIds:[...this.selectedIds],disabledIds:stage.disabledIds,jokers:this.run.jokers,definitions:R2_JOKERS,handLevels:this.run.handLevels,playIndex:stage.playIndex+1,handsBeforePlay:stage.handsLeft,previousHandType:stage.previousHandType,wager:stage.wagerSelected,...r2ScoreContext(this.run,this.hand,[...this.selectedIds])});
  }
  /** A committed play/discard can replace the hand before its visible selection is cleared. */
  private selectionPreview():HandPreview|undefined {
    if(this.playing||this.presentation||this.run.phase!=='await-input'||this.handsLeft<=0||!this.selectedIds.size||[...this.selectedIds].some(id=>!this.hand.some(card=>card.id===id)))return undefined;
    return this.preview();
  }
  private inspectCard(id:string):void {
    const c=this.hand.find(c=>c.id===id);if(!c)return;
    const notice=stageNotice(this.run,[...this.selectedIds]);
    const limitation=notice?.disabledCardIds.includes(id)||notice?.ordinarySuppressedIds.includes(id)?'\n本场限制：'+notice.title+'。'+notice.description:'';
    const index=this.run.handOrder.indexOf(id);
    const dialog=this.dialog.open(rankLabel(c.rank)+SUIT_SYMBOL[c.suit]+' · 手牌详情',(this.selectedIds.has(id)?'已选中':'未选中')+'；'+(this.cardViews.find(v=>v.card.id===id)?.container.getData('activeScoring')?'本手计分牌':'本手不计分或尚未预览')+limitation+'\n'+cardSpecialText(c)+'\n横滑连续选择；从已选牌开始则连续取消。长按只查看，调序使用下方按钮。',[{label:'左移',disabled:!this.ready||index<=0,run:async()=>{await this.moveHandCard(id,-1);if(this.dialog.active(dialog))this.inspectCard(id);}},{label:'右移',disabled:!this.ready||index>=this.hand.length-1,run:async()=>{await this.moveHandCard(id,1);if(this.dialog.active(dialog))this.inspectCard(id);}},{label:this.selectedIds.has(id)?'取消选择':'选择此牌',disabled:!this.ready,run:()=>{this.toggleCard(id);this.dialog.close();}}]);
    const face=this.cardPiece(c,{x:0,y:0,width:240,height:336}),image=this.add.renderTexture(0,0,240,336).setVisible(false);
    image.draw(face.container,120,168);face.container.destroy();
    image.snapshot(snapshot=>{
      if(snapshot instanceof HTMLImageElement)this.dialog.attachCardArt(dialog,snapshot.src,rankLabel(c.rank)+SUIT_SYMBOL[c.suit]+' 完整牌面');
      image.destroy();
    });
  }
  private inspectRole():void {
    const c=getCharacter(this.characterId),stage=this.run.stage!,notice=stageNotice(this.run),ability=r2RunModeConfig(this.run).characterAbilityEnabled;
    const challenge=R2_MODE_CATALOG.challenges.find(row=>row.id===this.run.challengeId);
    const roleState=!ability?'本次挑战关闭角色被动、初始赠送与押注。':notice?.wagerDisabled?'静场：本场角色计分与押注停用；非计分过关奖励保留。':this.characterId==='xiemu'?(stage.handsLeft===1?'当前为最后一手：倍率 ×2，过关额外 +2 金。':'距离最后一手还有 '+(stage.handsLeft-1)+' 次。'):this.characterId==='touye'?(stage.wagerUsed?'本场押注已用。':stage.wagerSelected?'本手已押注：50% ×2 / 50% ×0.75。':'本场押注未用；默认倍率 ×1.15。'):'';
    const body=(challenge?challenge.name+'：'+challenge.description+'\n\n':'')+(ability?c.passiveDescription+'\n':'')+roleState+'\n'+this.stage.name+'：'+this.stage.intro+'\n'+(notice?.warning?notice.details+'\n':'')+(stage.boss?'本场压轴':'本章压轴预告')+' '+r2BossText(stage.boss??this.run.boss)+'\n弃牌成本：'+r2DiscardCost(this.run)+(notice?.discardGoldCost?' 次 +1金币':' 次')+'；本场已弃 '+stage.discardsUsed+' 次。\n当前手牌上限 '+stage.handLimit+'，扩容修正后的硬上限14。\n'+(this.run.jokers.some(joker=>joker.definitionId==='c08')?'少一级：普通顺子可用4张，A234合法；同花顺仍须5张。\n':'')+(this.run.safetyNetUsed?'安全网本局已经使用，不会再次触发。':this.run.jokers.some(joker=>joker.definitionId==='f07')?'安全网：耗尽出牌且仍有可用手牌时救场一次，成功过关不触发。':'');
    const dialog=this.dialog.open(c.name+' · 角色与本场规则',body,[{label:'查看物品',run:()=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.command(a,seq))},{label:'上一手详情',disabled:!this.run.lastTrace,run:()=>this.inspectLastTrace()},...(this.run.program?[{label:'本章节目单',run:()=>showPrograms(this.dialog,this.run,this.ready,(a,seq)=>this.command(a,seq))}]:[]),...(this.characterId==='touye'?[{label:notice?.wagerDisabled?'本场不能押注':stage.wagerSelected?'取消本手押注':'押注本手',disabled:!this.ready||stage.wagerUsed||notice?.wagerDisabled,run:async()=>{await this.command({type:'SetWager',enabled:!stage.wagerSelected});if(this.dialog.active(dialog))this.inspectRole();}}]:[])],{portrait:{url:portraitURL(c.id),alt:c.name+'完整立绘'}});
  }
  private inspectJoker(id:string):void {
    const j=this.run.jokers.find(j=>j.instanceId===id);if(!j)return;const d=getJoker(j.definitionId),index=this.run.jokers.indexOf(j),art=jokerArtUrl(d.id),artKey=jokerArtKey(d.id),rarity=JOKER_RARITY[d.rarity];
    const move=async(delta:number)=>{const ids=this.run.jokers.map(j=>j.instanceId);ids.splice(index,1);ids.splice(index+delta,0,id);await this.command({type:'ReorderJokers',ids});if(this.dialog.active(dialog))this.inspectJoker(id);};
    const notice=stageNotice(this.run),reason=this.jokerRestriction(j),restriction=reason?'\n'+reason:'';
    const ability=this.jokerAbility(j,this.selectionPreview());
    const body=ability?rarity.label+restriction+'\n版次：'+editionEffectText(j.edition)+'\n第 '+(index+1)+' 槽'+(notice?.jokerScoreDirection==='right-to-left'?' · 从右向左结算':' · 从左向右结算')+'。\n用下方按钮调序；出售须在商店确认。':rarity.symbol+' '+rarity.label+' · 当前 '+this.jokerValue(j)+restriction+'\n'+editionEffectText(j.edition)+'\n'+d.description+r2JokerExtraHelp(d)+'\n当前实例：'+r2JokerStateText(j)+'\n第 '+(index+1)+' 槽'+(notice?.jokerScoreDirection==='right-to-left'?' · 整手计分从右向左':' · 整手计分从左向右')+'；长按后拖动可调序，出售只在商店确认。';
    const dialog=this.dialog.open(d.name,body,[
      {label:'左移',disabled:!this.ready||index===0,run:()=>move(-1)},{label:'右移',disabled:!this.ready||index===this.run.jokers.length-1,run:()=>move(1)},
    ],{rarity:d.rarity,artLoad:{status:jokerArtLoadState(this,d.id).status,readStatus:()=>jokerArtLoadState(this,d.id).status,retry:()=>retryJokerArt(this,[d.id],()=>{this.dialog.refreshArtLoad();if(!this.presentation&&!this.playing)this.render();})},ability,collapseRules:!!ability,...(ability?{editionBody:'版次：'+editionEffectText(j.edition).split('。')[0]+(restriction?' · 本场暂停':'')} :{}),...(j.definitionId==='f09'?{f09:{inactive:!!restriction,bodyInactive:this.presentation?ability?.bodyActive===false:(this.run.stage?.discardsUsed??0)>0,reduced:this.reducedMotion,reason:restriction||undefined}}:{}),...(art?{portrait:{url:art,thumbnailUrl:jokerArtPreviewUrl(d.id),alt:d.name+'完整卡面',layout:'card' as const,caption:d.name}}:{})});
    if(!artKey||!this.textures.exists(artKey))this.attachJokerFallback(dialog,d.id);
  }
  private attachJokerFallback(dialog:HTMLDialogElement,definitionId:string):void {
    const face=this.add.container(),paper=this.add.graphics().fillStyle(0xfff7e5).fillRoundedRect(0,0,240,336,10).lineStyle(3,0xb69866).strokeRoundedRect(2,2,236,332,10);
    face.add([paper,this.add.text(120,14,getJoker(definitionId).name,{fontFamily:UI_FONT,fontSize:'20px',color:'#203744'}).setOrigin(.5,0)]);
    drawJokerMotif(this,face,definitionId,120,166,192);
    const image=this.add.renderTexture(0,0,240,336).setVisible(false);image.draw(face);face.destroy();
    image.snapshot(snapshot=>{if(snapshot instanceof HTMLImageElement)this.dialog.attachCardArt(dialog,snapshot.src,getJoker(definitionId).name+'机制示意卡面','mechanism');image.destroy();});
  }
  private inspectDeck():void {
    const state=this.run,dialog=this.dialog.open('牌组查看',''),content=dialog.querySelector('p')!,controls=document.createElement('div');
    const scope=document.createElement('select'),enhancement=document.createElement('select');
    for(const [value,label] of [['remaining','剩余牌堆'],['all','全部牌组']]){const o=document.createElement('option');o.value=value;o.textContent=label;scope.append(o);}
    for(const [value,label] of [['all','所有增强'],['none','无增强'],['enhanced','有增强']]){const o=document.createElement('option');o.value=value;o.textContent=label;enhancement.append(o);}
    scope.setAttribute('aria-label','牌组范围');enhancement.setAttribute('aria-label','增强筛选');controls.append(scope,enhancement);content.before(controls);
    const render=()=>{
      const cards=state.deckInstances.filter(c=>!state.destroyedIds.includes(c.id)&&(scope.value==='all'||state.drawPile.includes(c.id))&&(enhancement.value==='all'||(enhancement.value==='none'?!c.enhancement:!!c.enhancement))).sort((a,b)=>SUITS.indexOf(a.suit)-SUITS.indexOf(b.suit)||a.rank-b.rank);
      content.textContent='按花色与点数统计，不展示抽牌顺序。\n'+SUITS.map(s=>SUIT_SYMBOL[s]+' '+cards.filter(c=>c.suit===s).length).join(' · ')+'\n'+cards.map(c=>rankLabel(c.rank)+SUIT_SYMBOL[c.suit]+(state.playedPile.includes(c.id)?' 已打出':state.discardPile.includes(c.id)?' 已弃':state.handOrder.includes(c.id)?' 手牌':'' )+(c.enhancement?' '+ENHANCEMENT_UI[c.enhancement].name:'')+((c.edition??'none')!=='none'?' '+editionLabel(c.edition):'')).join('、');
    };scope.onchange=render;enhancement.onchange=render;render();
  }
  private async command(action:import('../domain/run').Action,expectedSeq?:number):Promise<boolean> {
    if(!this.ready)return false;this.clearHover();this.playing=true;const lifecycle=this.lifecycle,intent=++this.intent;this.updateControls();
    const focusedId=this.hand[this.focusIndex]?.id;
    const beforeGold=this.run.gold,beforeDiscards=this.run.stage?.discardsLeft,beforeHand=this.hand,used=action.type==='UseConsumable'?this.run.consumables.find(item=>item.instanceId===action.instanceId):undefined;
    try {
      const result=await dispatchRun(this,action,expectedSeq);if(!this.alive(lifecycle,intent))return false;
      if(!result.ok){this.statusMessage=result.code==='stale-sequence'?'预览已过期，请重新打开；本次没有消耗物品或资源。':'操作未提交：'+result.code;return false;}
      this.run=result.state;this.statusMessage='';
      if(action.type==='ReorderHand'){if(focusedId)this.focusIndex=Math.max(0,this.run.handOrder.indexOf(focusedId));this.showFocusedCard();this.renderHand();}
      else if(action.type==='ReorderJokers'||action.type==='DestroyConsumable')this.render();
      if(used){
        this.toolHand=beforeHand;this.dialog.close();
        const info=toolInfo(used.definitionId);this.audio.toolUse(info.family);this.effects.clear();
        this.effects.enqueue(async context=>{
          const p=this.view.layout.scoreBoard,effects=[this.floatNote(info.name,p.x+p.width/2,p.y+p.height/2,'#ffe3ae',400,context)];
          const usedEvent=result.events.find((event):event is Extract<DomainEvent,{type:'consumable-used'}>=>event.type==='consumable-used');
          const sourceIds=new Set([...(usedEvent?.targetIds??[]),...(usedEvent?.destroyedCardIds??[]),...(usedEvent?.destroyedJokerIds??[])]);
          for(const id of sourceIds){const card=this.cardViews.find(view=>view.card.id===id);if(card)effects.push(this.focusSource(card.container,card.background,T.brass,false,380,context));const joker=this.jokerViews.get(id),frame=joker?.getData('frame') as Phaser.GameObjects.Rectangle|undefined;if(joker&&frame)effects.push(this.focusSource(joker,frame,T.brass,false,380,context));}
          await Promise.all(effects);
        });
        this.effects.enqueue(async context=>{
          this.toolHand=undefined;this.render();const effects:Promise<void>[]=[];
          if(this.run.gold!==beforeGold)effects.push(this.rollGold(beforeGold,this.run.gold,350,context));
          if(beforeDiscards!==undefined&&this.run.stage?.discardsLeft!==beforeDiscards)effects.push(this.pulseResource('discard',beforeDiscards,context,this.run.stage?.discardsLeft));
          await Promise.all(effects);
        });
        try{await this.effects.drain();}catch{this.statusMessage='效果已保存，演出已停止。';}
        if(this.alive(lifecycle,intent)){this.toolHand=undefined;this.render();}
      }
      return true;
    }
    finally{if(this.alive(lifecycle,intent)){this.playing=false;this.refreshSelection();}}
  }
  /** FLIP slide: after a committed reorder, cards glide from their old seats to the new order. */
  private slideHandFrom(previous:Map<string,{x:number;y:number}>):void {
    if(this.reducedMotion||this.presentation)return;
    this.cardViews.forEach((view,i)=>{
      const from=previous.get(view.card.id);if(!from)return;
      const rest={x:view.container.x,y:view.container.y};
      if(Math.hypot(from.x-rest.x,from.y-rest.y)<3)return;
      this.tweens.killTweensOf(view.container);
      view.container.setPosition(from.x,from.y);
      this.tweens.add({targets:view.container,x:rest.x,y:rest.y,duration:190,delay:i*14,ease:'Sine.easeInOut'});
    });
  }
  private handPositions():Map<string,{x:number;y:number}> {
    return new Map(this.cardViews.map(view=>[view.card.id,{x:view.container.x,y:view.container.y}]));
  }
  private async sortHand(mode:'rank'|'suit'):Promise<void> {
    const cards=[...this.hand].sort((a,b)=>mode==='rank'?b.rank-a.rank||SUITS.indexOf(a.suit)-SUITS.indexOf(b.suit):SUITS.indexOf(a.suit)-SUITS.indexOf(b.suit)||b.rank-a.rank);
    const before=this.handPositions();
    if(await this.command({type:'ReorderHand',ids:cards.map(c=>c.id)})){this.statusMessage=(mode==='rank'?'点数':'花色')+'已排序 · 选择已保留';this.slideHandFrom(before);this.updateControls();this.showHandHint();}
  }
  private readonly stopHandHint=():void=>{
    this.handHintTimer?.remove();this.handHintTimer=undefined;
    if(this.handHint){const cursor=this.handHint.getData('cursor');if(cursor)this.tweens.killTweensOf(cursor);this.tweens.killTweensOf(this.handHint);this.handHint.destroy();this.handHint=undefined;}
  };
  private readonly hintVisibility=()=>{if(document.hidden)this.stopHandHint();};
  private showHandHint(claim=true):void {
    if(!this.view||!this.ready||this.handHint)return;
    const l=this.view.layout,cards=l.cards.filter(card=>card.visible);if(cards.length<2||claim&&!this.sweepHint.claim())return;
    const root=this.view.add(this.add.container(0,0)).setName('hand/sweep-hint');this.handHint=root;
    const cx=l.hand.x+l.hand.width/2,y=l.hand.y+l.hand.height-19,w=Math.min(l.hand.width-8,360);
    root.add(this.add.graphics().fillStyle(0x102f35,.86).fillRoundedRect(cx-w/2,y-23,w,20,6));
    root.add(this.add.text(cx,y-13,'按住横滑选牌 ↔ 从已选牌开始可取消',{fontFamily:UI_FONT,fontSize:'12px',color:'#fff1cc',resolution:1.5}).setOrigin(.5));
    if(this.reducedMotion){this.handHintTimer=this.time.delayedCall(3000*gameSession().speed,this.stopHandHint);return;}
    const from=cards[0].hit.x+cards[0].hit.width/2,last=cards[Math.min(4,cards.length-1)],to=last.hit.x+last.hit.width/2;
    root.add(this.add.graphics().lineStyle(1,0xe9d59a,.4).beginPath().moveTo(from,y).lineTo(to,y).strokePath());
    const cursor=this.add.graphics().fillStyle(0xffe9b4,.8).fillCircle(0,0,4).lineStyle(2,0xffe9b4,.9).strokeCircle(0,0,7).setPosition(from,y);root.add(cursor);root.setData('cursor',cursor);
    this.tweens.add({targets:cursor,x:to,duration:650,delay:280,hold:100,yoyo:true,ease:'Sine.easeInOut',onComplete:()=>{if(root.active)this.tweens.add({targets:root,alpha:0,duration:180,onComplete:this.stopHandHint}).setTimeScale(1/gameSession().speed);}}).setTimeScale(1/gameSession().speed);
  }
  private async moveHandCard(id:string,delta:-1|1):Promise<void> {const ids=[...this.run.handOrder],from=ids.indexOf(id),to=from+delta;if(from<0||to<0||to>=ids.length)return;const before=this.handPositions();ids.splice(from,1);ids.splice(to,0,id);if(await this.command({type:'ReorderHand',ids}))this.slideHandFrom(before);}
  private async reorderJoker(id:string,x:number):Promise<void> {const ids=this.run.jokers.map(j=>j.instanceId),from=ids.indexOf(id),l=this.view.layout,to=l.slots.findIndex((b,i)=>x>=b.x&&x<=b.x+b.width+(l.mode==='landscape'?l.jokerLabels[i].width+6:0));if(to<0||to>=ids.length||from===to)return;ids.splice(from,1);ids.splice(to,0,id);await this.command({type:'ReorderJokers',ids});}

  /** Denied actions shake the offending card instead of only showing text. */
  private wiggleCard(view:CardView,index:number):void {
    if(this.reducedMotion||!view.container.active)return;
    const base=view.container.angle;
    this.tweens.killTweensOf(view.container);
    this.tweens.add({targets:view.container,angle:base+3.4,duration:52,yoyo:true,repeat:3,ease:'Sine.easeInOut',onComplete:()=>this.restingCard(view,index,true)});
  }

  private applyHandSelection(update:HandSelectionUpdate):void {
    this.sweepHint.observe(update);
    const previous=this.selectedIds,next=new Set(update.selectedIds),changed=previous.size!==next.size||[...previous].some(id=>!next.has(id));
    this.statusMessage=update.limitReached?'每手最多选择 5 张牌':'';
    if(!changed){if(update.limitReached)this.updateControls();return;}
    this.selectedIds=next;
    const changedViews=this.cardViews.filter(view=>previous.has(view.card.id)!==next.has(view.card.id));changedViews.forEach(view=>this.revealCard(view));
    if(update.phase!=='cancelled'){if(update.mode==='select')this.audio.select();else this.audio.deselect();}
    // Batch a fast crossing into one preview; no rules command, RNG or save is touched.
    this.refreshSelection(update.phase==='committed'&&changedViews.length===1?changedViews[0].card.id:undefined);
  }

  private toggleCard(id: string): void {
    if (!this.ready) return;
    const view=this.cardViews.find(view=>view.card.id===id);if(view)this.revealCard(view);
    this.statusMessage='';
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);this.audio.deselect();
    } else {
      if (this.selectedIds.size >= MAX_SELECTED) {this.statusMessage='每手最多选择 5 张牌';this.audio.invalid();if(view)this.wiggleCard(view,this.cardViews.indexOf(view));this.updateControls();return;}
      this.selectedIds.add(id);this.audio.select();
    }
    this.selectedIds=new Set(this.hand.filter(card=>this.selectedIds.has(card.id)).map(card=>card.id));
    this.refreshSelection(id);
  }

  private alive(lifecycle:number,intent:number):boolean {return lifecycle===this.lifecycle&&intent===this.intent&&this.scene.isActive();}

  private wait(ms:number,context:EffectContext):Promise<void> {
    if(ms<=0||context.signal.aborted)return Promise.resolve();
    // Scene Clock clamps low-FPS deltas; presentation waits share the animation clock.
    return this.animate({targets:{t:0},t:1,duration:ms},context);
  }

  private animate(config:Phaser.Types.Tweens.TweenBuilderConfig,context:EffectContext):Promise<void> {
    return new Promise(resolve=>{
      if(context.signal.aborted){resolve();return;}
      const finish=()=>{context.signal.removeEventListener('abort',cancel);resolve();};
      const tween=this.tweens.add({...config,onComplete:finish}),cancel=()=>{tween.remove();finish();};
      context.signal.addEventListener('abort',cancel,{once:true});
    });
  }

  private animateRole(note:string,duration:number,context:EffectContext,beat?:ScoreBeat,impact?:Promise<void>):Promise<void> {
    const frame=this.roleFrame;this.roleText.setText(note);frame.setFillStyle(T.brass,.16).setStrokeStyle(4,T.brass);
    return this.focusSource(this.roleAvatar,frame,T.brass,true,duration,context,beat,impact).then(()=>{if(frame.active)frame.setFillStyle(T.brass,0).setStrokeStyle(1,T.brass,.6);});
  }

  private animateJoker(joker:Pick<ScoreEvent,'sourceInstanceId'|'operation'>,duration:number,context:EffectContext,beat?:ScoreBeat,impact?:Promise<void>):Promise<void> {
    const view=this.jokerViews.get(joker.sourceInstanceId);if(!view)return this.wait(duration,context);
    const art=view.getData('f09-art') as Phaser.GameObjects.Container|undefined;art?.setData('f09-trigger',true);if(art)(view.getData('valueLabel') as Phaser.GameObjects.Text).setText('触发 ×1.5');
    const frame=view.getData('frame') as Phaser.GameObjects.Rectangle,multiply=joker.operation==='multiply-multiplier'||joker.operation==='read-coefficient';frame.setStrokeStyle(4,multiply?T.red:T.brass);
    return this.focusSource(view,frame,multiply?T.red:T.brass,multiply,duration,context,beat,impact).then(()=>{art?.setData('f09-trigger',false);if(art&&view.active)(view.getData('valueLabel') as Phaser.GameObjects.Text).setText('×1.5');if(frame.active)frame.setStrokeStyle(2,Number(view.getData('frameColor')));});
  }
  private async focusSource(source:Phaser.GameObjects.Container,frame:Phaser.GameObjects.Rectangle,color:number,strong:boolean,duration:number,context:EffectContext,beat?:ScoreBeat,impact?:Promise<void>):Promise<void> {
    if(context.signal.aborted)return;
    this.stopJokerIdle(source);this.tweens.killTweensOf(source);
    if(this.reducedMotion){
      if(source.getData('cardFace')){
        const width=frame.width,height=frame.height,glow=this.add.graphics().lineStyle(2,color,.95).strokeRoundedRect(-width/2-1,-height/2-1,width+2,height+2,Math.min(7,width*.09));source.addAt(glow,1);
        try{if(impact)await impact;await this.wait(beat?.impact??duration,context);}finally{glow.destroy();}return;
      }
      const line={width:frame.lineWidth,color:frame.strokeColor,alpha:frame.strokeAlpha};frame.setStrokeStyle(4,color,1);
      try{if(impact)await impact;await this.wait(beat?.impact??duration,context);}finally{if(frame.active)frame.setStrokeStyle(line.width,line.color,line.alpha);}return;
    }
    const rest={y:source.y,angle:source.angle,scaleX:source.scaleX,scaleY:source.scaleY},width=frame.width,height=frame.height,top=frame.getBounds().y,lift=Math.min(strong?16:12,height*.14,Math.max(0,top-8)*.5),factor=top<24?1.035:strong?1.1:1.055,glow=this.add.graphics();
    glow.fillStyle(color,.2).fillRoundedRect(-width/2-5,-height/2-5,width+10,height+10,7);
    glow.lineStyle(strong?4:3,0xffdc9e,.95).strokeRoundedRect(-width/2-3,-height/2-3,width+6,height+6,6);source.addAt(glow,0);
    try {
      if(beat){
        const rise=Math.min(180,beat.windup);
        await this.animate({targets:source,y:rest.y-lift*.6,angle:rest.angle,scaleX:rest.scaleX*factor,scaleY:rest.scaleY*factor,duration:rise,ease:'Sine.easeOut'},context);
        await (impact??this.wait(Math.max(0,beat.windup+beat.flight-rise),context));
        if(context.signal.aborted)return;
        // Source impact happens at the same point as the incoming packet / number / sound.
        await this.animate({targets:source,angle:rest.angle+(strong?5:3),duration:beat.impact/5,yoyo:true,repeat:1,ease:'Sine.easeInOut'},context);
        await this.animate({targets:source,...rest,duration:beat.impact/5,ease:'Sine.easeOut'},context);
        return;
      }
      await this.animate({targets:source,y:rest.y-lift,angle:strong?-5:-3,scaleX:rest.scaleX*factor,scaleY:rest.scaleY*factor,duration:duration*.2,ease:'Back.easeOut'},context);
      if(context.signal.aborted)return;
      await this.animate({targets:source,angle:strong?4:2,duration:duration*.075,yoyo:true,ease:'Sine.easeInOut'},context);
      await this.wait(duration*.4,context);
      await this.animate({targets:source,...rest,duration:duration*.25,ease:'Sine.easeOut'},context);
    } finally {glow.destroy();if(source.active)source.setY(rest.y).setAngle(rest.angle).setScale(rest.scaleX,rest.scaleY);}
  }

  private formatBreakdown(score: ScoreTrace): string {
    const first=score.events[0].after;
    return '牌型 '+fractionText(first.H)+' 热度 × '+fractionText(first.M)+' 倍率\n'
      +'计分 '+score.sets.activeScoringIds.length+' 张 / 打出 '+score.sets.playedIds.length+' 张\n'
      +'结算 '+fractionText(score.accumulator.H)+' × '+fractionText(score.accumulator.M)+' = '+heatText(score.finalScore);
  }

  private previewSelection(preview?:HandPreview):void {
    this.scoreLabels.forEach((label,i)=>label.setText(['合计热度','合计倍率','预计本手'][i]));
    if(!preview){
      this.resultText.setText('当前选择 · 选 1～5 张牌');this.scoreHeat.setText('—');this.scoreMult.setText('× —');this.scoreTotal.setText('—');
      this.breakdownText.setText('距目标还需 '+heatText((BigInt(this.stage.targetHeat)>BigInt(this.heat)?BigInt(this.stage.targetHeat)-BigInt(this.heat):0n).toString())+' 热度 · ★ 为计分牌');
      this.fitScoreReadouts();return;
    }
    const fourStraight=preview.handType==='straight'&&preview.sets.scoringIds.length===4;
    const fourFlush=preview.handType==='flush'&&preview.sets.scoringIds.length===4;
    this.resultText.setText('当前选择 · '+(fourStraight?'四张普通顺子':fourFlush?'四张普通同花':HAND_LABELS[preview.handType])+' Lv.'+preview.level);
    const low=preview.breakdown.minimum,high=preview.breakdown.maximum;
    this.scoreHeat.setText(fractionText(low.H)+(JSON.stringify(low.H)!==JSON.stringify(high.H)?'–'+fractionText(high.H):''));this.scoreMult.setText('× '+fractionText(low.M)+(JSON.stringify(low.M)!==JSON.stringify(high.M)?'–'+fractionText(high.M):''));
    const lucky=preview.randomEffects.some(effect=>effect.kind==='lucky-paper'),wager=preview.randomEffects.some(effect=>effect.kind==='wager'),glass=preview.randomEffects.some(effect=>effect.kind==='glass-paper'),jokerChance=preview.randomEffects.some(effect=>effect.kind==='joker-heat');
    this.scoreTotal.setText(preview.scoreRange.minimum===preview.scoreRange.maximum?heatText(preview.scoreRange.minimum):heatText(preview.scoreRange.minimum)+'–'+heatText(preview.scoreRange.maximum));
    this.breakdownText.setText(jokerChance?'试试手气 · 每手 1/3 +90 热度'+(lucky?' · 含幸运范围':wager?' · 含押注范围':' · 显示可能范围'):lucky?'含幸运概率 · 显示分数范围，长按牌看概率':wager?'押注各50%：'+preview.possibleScores.map(heatText).join(' / '):(fourStraight?'少一级 · ':fourFlush?'少一块布 · ':'')+'★ '+preview.sets.activeScoringIds.length+' 张计分'+(glass?' · 玻璃有碎裂风险':' · 共选 '+this.selectedIds.size+' / 5 张'));
    this.fitScoreReadouts();
  }
  /** Reflow real text bounds inside the reserved score/body/fire lanes. */
  private fitScoreReadouts():void {
    if(!this.scoreHeat?.active)return;
    const l=this.view.layout,s=l.scoreBoard,columns=s.width/3;
    fitScoreLine(this.resultText,{x:s.x+8,y:s.y+5,width:s.width-16,height:24},17);
    const labeled=s.height>=96,labelY=this.resultText.getBounds().bottom+3;
    this.scoreLabels.forEach((text,i)=>{
      text.setVisible(labeled);fitScoreLine(text,{x:s.x+columns*i+5,y:labelY,width:columns-10,height:18},14);
    });
    const numberY=labeled?Math.max(...this.scoreLabels.map(text=>text.getBounds().bottom))+3:this.resultText.getBounds().bottom+4;
    const numberHeight=l.scoreFire.y-numberY-4;
    [this.scoreHeat,this.scoreMult,this.scoreTotal].forEach((text,i)=>fitScoreLine(text,{x:s.x+columns*i+6,y:numberY,width:columns-12,height:numberHeight},26,true));
  }
  private async showJokerTransaction(event:Extract<DomainEvent,{type:'joker-transaction'}>,context:EffectContext):Promise<void> {
    if(context.signal.aborted)return;
    const note=r2TransactionText(event),view=this.jokerViews.get(event.instanceId),frame=view?.getData('frame') as Phaser.GameObjects.Rectangle|undefined;
    this.statusMessage=note;this.updateControls();
    if(event.operation==='add-gold'||event.operation==='add-gold-limited'){
      this.audio.coin();
    }else this.audio.sourceCue('joker');
    const effects=[this.animateJoker({sourceInstanceId:event.instanceId,operation:event.operation},360,context)];
    if(view&&frame)effects.push(this.floatNote(note,view.x,view.y-frame.height/2-8,'#ffe3ae',500,context));
    if(event.operation==='refund-discard'&&event.resourceBefore!==undefined&&event.resourceAfter!==undefined)effects.push(this.pulseResource('discard',event.resourceBefore,context,event.resourceAfter));
    if(!this.reducedMotion&&(event.operation==='add-gold'||event.operation==='add-gold-limited'))effects.push(this.animate({targets:this.goldText,scale:{from:1.25,to:1},duration:360,ease:'Back.easeOut'},context));
    await Promise.all(effects);
    if(!context.signal.aborted){const joker=this.run.jokers.find(joker=>joker.instanceId===event.instanceId);if(joker)(view?.getData('valueLabel') as Phaser.GameObjects.Text|undefined)?.setText(this.jokerValue(joker));}
  }

  private async discardSelected():Promise<void> {
    if(!this.ready||!this.selectedIds.size||this.run.stage!.discardsLeft<r2DiscardCost(this.run))return;this.clearHover();this.playing=true;this.statusMessage='';this.updateControls();const lifecycle=this.lifecycle,intent=++this.intent,selectedIds=[...this.selectedIds],previousIds=[...this.run.handOrder],beforeDiscards=this.run.stage!.discardsLeft,spentDiscards=beforeDiscards-r2DiscardCost(this.run);
    try {
      const result=await dispatchRun(this,{type:'DiscardHand',selectedIds});
      if(!this.alive(lifecycle,intent))return;
      if(!result.ok||result.duplicate){if(!result.ok)this.statusMessage=result.code==='not-enough-gold'?'弃牌需要1金币；本次未扣费，仍可出牌':result.code==='no-discards-left'?'本场弃牌次数已用完':result.code==='save-failed'?'未保存，请在菜单中重试或导出':'请选择 1～5 张牌再弃牌';return;}
      const discarded=this.cardViews.filter(view=>selectedIds.includes(view.card.id));
      this.run=result.state;this.audio.discard();this.effects.clear();this.updateHud();
      const handArea=this.view.layout.hand;
      this.effects.enqueue(context=>Promise.all([this.pulseResource('discard',beforeDiscards,context,spentDiscards),...discarded.map((view,i)=>this.animate({targets:view.container,x:view.container.x-64-i*14,y:handArea.y+handArea.height+190,angle:-26,scaleX:.82,scaleY:.82,alpha:0,duration:this.reducedMotion?20:210,delay:this.reducedMotion?0:i*38,ease:'Cubic.easeIn'},context))]).then(()=>undefined));
      for(const event of result.events)if(event.type==='joker-transaction')this.effects.enqueue(context=>this.showJokerTransaction(event,context));
      for(const event of result.events)if(event.type==='boss-transaction')this.effects.enqueue(async context=>{
        const target=event.operation==='charge-discard'?this.goldText:this.heatText,b=target.getBounds();
        this.audio.sourceCue('boss');await Promise.all([this.floatNote(event.operation==='charge-discard'?'-1 金币':'目标 +'+heatText(event.amount),b.x+b.width/2,b.y+b.height,'#ffd0a2',this.reducedMotion?180:460,context),this.reducedMotion?this.wait(180,context):this.animate({targets:target,scale:{from:1.14,to:1},duration:360,ease:'Back.easeOut'},context)]);
      });
      await this.effects.drain();if(!this.alive(lifecycle,intent))return;
      this.selectedIds.clear();this.statusMessage='已弃 '+selectedIds.length+' 张 · '+(this.deck.length?'补抽完成':'牌堆已空');this.updateHud();this.renderHand();this.revealDrawnCards(previousIds);
      if(this.run.phase==='run-lost')this.finishStage(false);
    } finally {if(this.alive(lifecycle,intent)&&this.run.phase==='await-input'){this.playing=false;this.refreshSelection();}}
  }

  private async playSelected():Promise<void> {
    if(!this.ready||this.selectedIds.size===0||this.handsLeft<=0)return;
    const selectedIds=[...this.selectedIds],lifecycle=this.lifecycle,intent=++this.intent,beforeHeat=this.heat,previousTrace=this.run.lastTrace,beforeHands=this.handsLeft,beforeGold=this.run.gold;
    this.clearHover();this.playing=true;this.statusMessage='';this.updateControls();
    const selectedViews=this.cardViews.filter(v=>selectedIds.includes(v.card.id));
    try {
      const result=await dispatchRun(this,{type:'PlayHand',selectedIds});
      if(!this.alive(lifecycle,intent))return;
      if(!result.ok||result.duplicate){if(!result.ok)this.statusMessage=result.code==='save-failed'?'未保存，请在菜单中重试或导出':result.code==='score-diagnostic'?'本手无法结算，资源与原状态已保留':'出牌未提交，请查看菜单或选择。';return;}
      this.run=result.state;
      const event=result.events.find(e=>e.type==='hand-scored-r2');if(!event||event.type!=='hand-scored-r2')throw Error('Successful play missing score event');
      await this.presentTrace(event.score,result.state,selectedViews,lifecycle,intent,beforeHeat,false,previousTrace,beforeHands,beforeGold);
    } finally {
      if(this.alive(lifecycle,intent)&&this.run.phase==='await-input'&&!this.presentation){this.playing=false;this.refreshSelection();}
    }
  }

  private operationText(event:ScoreEvent):string {
    return r2ScoreOperationText(event);
  }
  private eventSource(event:ScoreEvent):string {
    const edition=event.reasonKey.startsWith('edition.')?editionLabel(event.reasonKey.split('.')[1] as PlayingCard['edition'])+' · ':'';
    if(event.sourceType==='joker')return edition+getJoker(event.sourceDefinitionId).name;
    if(event.sourceType==='character')return getCharacter(this.characterId).name;
    const card=(this.presentation?.score??this.run.lastTrace)?.cards.find(card=>card.id===event.targetCardId);
    const item=R2_LONG_TERM_ITEMS.find(item=>item.id===event.sourceDefinitionId),tool=R2_TOOLS.find(tool=>tool.id===event.sourceDefinitionId),program=R2_MODE_CATALOG.programs.find(program=>program.id===event.sourceDefinitionId);
    const boss=R2_BOSSES.find(boss=>boss.id===event.sourceDefinitionId),sealed=(this.presentation?.score??this.run.lastTrace)?.sourceJokers.find(joker=>joker.instanceId===event.targetJokerInstanceId);
    return item?.name??tool?.name??program?.name??(boss?boss.name+(sealed?' · '+getJoker(sealed.definitionId).name:''):card?edition+rankLabel(card.rank)+SUIT_SYMBOL[card.suit]:HAND_LABELS[event.sourceDefinitionId as keyof typeof HAND_LABELS]??'计分牌');
  }
  private setAccumulator(value:Accumulator):void {
    this.scoreHeat.setText(fractionText(value.H));this.scoreMult.setText('× '+fractionText(value.M));
    this.setDisplayedProduct(Rational.fromJSON(value.H).multiply(Rational.fromJSON(value.M)).floor().toString());
  }
  private setDisplayedProduct(product:string):void {
    this.scoreTotal.setText(heatText(product));this.fitScoreReadouts();this.refreshScoreFire(product);
  }
  private refreshScoreFire(product:string):void {
    const presentation=this.presentation;if(!presentation)return;
    const level=scoreFireLevel(presentation.originHeat,product,this.stage.targetHeat),b=this.view.layout.scoreBoard;
    if(level&&!this.scoreFlame){const l=this.view.layout;this.scoreFlame=new ScoreFlame(this,this.view.root,l.scoreFire,{x:4,y:4,width:l.width-8,height:l.height-8});}
    this.scoreFlame?.set(level,this.reducedMotion);
    // Same ephemeral presentation identity: no ignition on redraw, repeated final
    // accumulator updates, or replay. Restored results never create a presentation.
    this.audio.setScoreFire(presentation.replay?0:level,presentation);
    this.scoreTotal.setColor(level?C.red:C.ink);this.keepScoreReadable();
  }
  private stopScoreFire():void {this.scoreFlame?.destroy();this.scoreFlame=undefined;this.audio.stopScoreFire();}
  private cardRespondsTo(event:ScoreEvent,card:CardView):boolean {
    const sets=this.presentation?.score.sets;
    if(!sets||event.targetCardId!==card.card.id||event.sourceType!=='card'&&event.sourceType!=='joker')return false;
    const risk=['lucky-multiplier-check','lucky-gold-check','lucky-gold-cap','glass-check','destroy-card'].includes(event.operation);
    if(event.value.n==='0'&&!risk)return false;
    return sets.activeScoringIds.includes(card.card.id)||['onHeldCard','onStageClear'].includes(event.phase)&&sets.heldIds.includes(card.card.id);
  }
  private async illuminateCard(card:CardView,event:ScoreEvent,beat:ScoreBeat,context:EffectContext,impact:Promise<void>):Promise<void> {
    const glow=card.faceGlow,edge=card.edgeGlow;if(!glow||!this.cardRespondsTo(event,card)||context.signal.aborted)return;
    const edgeAlpha=edge?.alpha??0;glow.setAlpha(this.reducedMotion?0.5:0.85);edge?.setAlpha(1);
    try {
      await impact;if(context.signal.aborted)return;
      if(this.reducedMotion){await this.wait(beat.impact,context);return;}
      if(event.retriggerDepth>0||event.operation==='retrigger-card'){
        await this.animate({targets:glow,alpha:.2,duration:beat.impact/3},context);
        await this.animate({targets:glow,alpha:1,duration:beat.impact/3},context);
      }
      await this.animate({targets:glow,alpha:0,duration:event.retriggerDepth>0||event.operation==='retrigger-card'?beat.impact/3:beat.impact,ease:'Sine.easeOut'},context);
    } finally {if(glow.active)glow.setAlpha(0);if(edge?.active)edge.setAlpha(edgeAlpha);}
  }
  private floatNote(note:string,x:number,y:number,color:string,duration:number,context:EffectContext):Promise<void> {
    const group=this.view.add(this.add.container(x,y)),text=this.add.text(0,0,note,{fontFamily:UI_FONT,fontSize:this.view.layout.mode==='desktop'?'22px':'18px',fontStyle:'bold',color:C.ink,resolution:Math.max(1.5,1/this.scale.zoom)}).setOrigin(.5);
    const width=text.width+16,height=text.height+8,plate=this.view.material({x:-width/2,y:-height/2,width,height},0x30545a,0x17323c,5).setAlpha(.94);
    x=Phaser.Math.Clamp(x,width/2+6,this.view.layout.width-width/2-6);y=Math.max(y,height/2+28);group.setPosition(x,y);
    const edge=this.add.graphics().lineStyle(1,0xc9d1b0,.65).strokeRoundedRect(-width/2,-height/2,width,height,5);
    group.add([plate,edge,text]);this.keepScoreReadable();
    return this.animate({targets:group,y:y-(this.reducedMotion?0:22),alpha:{from:1,to:0},duration,ease:'Sine.easeOut'},context).then(()=>group.destroy());
  }
  private pulseAccumulator(event:ScoreEvent,duration:number,context:EffectContext):Promise<void> {
    if(this.reducedMotion)return Promise.resolve();
    const targets=[];
    if(event.before.H.n!==event.after.H.n||event.before.H.d!==event.after.H.d)targets.push(this.scoreHeat);
    if(event.before.M.n!==event.after.M.n||event.before.M.d!==event.after.M.d)targets.push(this.scoreMult);
    if(targets.length)targets.push(this.scoreTotal);
    const strength=scoreBeat(event).strength,scale=strength==='multiply'?1.08:strength==='role'?1.06:1.04;
    return Promise.all(targets.map(target=>this.pulseScoreNumber(target,scale,duration,context))).then(()=>undefined);
  }
  private pulseScoreNumber(text:Phaser.GameObjects.Text,requested:number,duration:number,context:EffectContext):Promise<void> {
    const l=this.view.layout,scale=Math.max(1,Math.min(requested,1.08,(l.scoreBoard.width/3-12)/text.width,(l.scoreFire.y-text.y-4)/text.height));
    return this.animate({targets:text,scale:{from:scale,to:1},duration,ease:'Sine.easeOut'},context);
  }
  private impactAccumulator(event:ScoreEvent,duration:number,context:EffectContext):Promise<void> {
    if(this.reducedMotion||context.signal.aborted)return Promise.resolve();
    const multChanged=event.before.M.n!==event.after.M.n||event.before.M.d!==event.after.M.d,heatChanged=event.before.H.n!==event.after.H.n||event.before.H.d!==event.after.H.d;
    if(!multChanged&&!heatChanged)return Promise.resolve();
    const target=multChanged?this.scoreMult:this.scoreHeat,b=target.getBounds(),strong=event.operation==='multiply-multiplier'||event.operation==='read-coefficient',width=Math.min(this.view.layout.scoreBoard.width/3-18,Math.max(42,b.width+16)),height=b.height+8;
    const impact=this.view.add(this.add.graphics().setPosition(b.centerX,b.centerY));
    impact.fillStyle(strong?T.red:multChanged?T.jade:T.brass,.18).fillRoundedRect(-width/2,-height/2,width,height,5);
    impact.lineStyle(strong?4:event.sourceType==='card'?1:2,strong?0xffd3a6:0xc7f1d8,.95).strokeRoundedRect(-width/2,-height/2,width,height,5);
    if(strong)for(const [x,y] of [[-1,-1],[1,-1],[-1,1],[1,1]])impact.lineStyle(2,T.brass,.9).beginPath().moveTo(x*width*.54,y*height*.54).lineTo(x*width*.65,y*height*.72).strokePath();
    this.keepScoreReadable();return this.animate({targets:impact,scale:{from:.75,to:strong?1.18:1.06},alpha:{from:1,to:0},duration,ease:'Cubic.easeOut'},context).then(()=>impact.destroy());
  }
  private keepScoreReadable():void {
    this.fitScoreReadouts();
    for(const text of [this.resultText,...this.scoreLabels,this.scoreHeat,this.scoreMult,this.scoreTotal,this.breakdownText,this.previousHandText])if(text.active)this.view.root.bringToTop(text);
  }
  private transferToAccumulator(event:ScoreEvent,card:CardView|undefined,duration:number,context:EffectContext):Promise<void> {
    if(this.reducedMotion||context.signal.aborted)return Promise.resolve();
    const packetSymbol=scorePacketSymbol(event);if(!packetSymbol)return Promise.resolve();
    const multChanged=packetSymbol!=='+H';
    const jokerFrame=this.jokerViews.get(event.sourceInstanceId)?.getData('frame') as Phaser.GameObjects.Rectangle|undefined;
    const source=event.sourceType==='joker'?jokerFrame:event.sourceType==='character'?this.roleFrame:card?.background;
    if(!source)return Promise.resolve();
    const b=source.getBounds(),target=multChanged?this.scoreMult:this.scoreHeat,start={x:b.centerX,y:b.centerY};
    const s=this.view.layout.scoreBoard,column=s.width/3,index=multChanged?1:0;
    const cell={x:s.x+column*index+6,y:target.y-3,width:column-12,height:target.height+6},end=scoreFlightLanding(start,cell);

    const multiply=packetSymbol==='×M',color=multiply?T.red:multChanged?T.jade:T.brass,light=multiply?0xffb995:multChanged?0xc4f0d8:0xffdf9d;
    const mid={x:(start.x+end.x)/2+(start.x<end.x?-22:22),y:(start.y+end.y)/2-22},trail=this.view.add(this.add.graphics()).setName('score/source-flight-line');
    trail.setData('landing',end).setData('cell',cell);
    trail.lineStyle(multiply?4:2,color,.72).beginPath().moveTo(start.x,start.y);
    for(let i=1;i<=16;i++){const t=i/16,u=1-t;trail.lineTo(u*u*start.x+2*u*t*mid.x+t*t*end.x,u*u*start.y+2*u*t*mid.y+t*t*end.y);}trail.strokePath();
    const packet=this.view.add(this.add.container(start.x,start.y)).setName('score/source-flight-packet'),shape=this.add.graphics();
    // Subtract every measured numeric cell from both trail and packet. The curved
    // path may pass the other columns but cannot paint over their digits.
    const safety=this.add.graphics().setVisible(false),guard=[this.scoreHeat,this.scoreMult,this.scoreTotal].map((text,i)=>({x:s.x+column*i+4,y:text.y-3,width:column-8,height:text.height+6}));
    const {width,height}=this.view.layout; safety.fillStyle(0xffffff);
    const cuts=[0,height,...guard.flatMap(b=>[b.y,b.y+b.height])].sort((a,b)=>a-b);
    for(let i=0;i<cuts.length-1;i++){
      const top=cuts[i],bottom=cuts[i+1],excluded=guard.filter(b=>b.y<bottom&&b.y+b.height>top).sort((a,b)=>a.x-b.x);let left=0;
      for(const b of excluded){if(b.x>left)safety.fillRect(left,top,b.x-left,bottom-top);left=Math.max(left,b.x+b.width);}
      if(left<width)safety.fillRect(left,top,width-left,bottom-top);
    }
    const mask=safety.createGeometryMask();trail.setMask(mask);packet.setMask(mask).setData('landing',end).setData('cell',cell);
    if(multiply){shape.fillStyle(0x762f32,.96).fillPoints([{x:0,y:-15},{x:20,y:0},{x:0,y:15},{x:-20,y:0}],true);shape.lineStyle(2,T.brass,.9).strokePoints([{x:0,y:-15},{x:20,y:0},{x:0,y:15},{x:-20,y:0}],true);}
    else shape.fillStyle(multChanged?0x285a54:0x715736,.96).fillRoundedRect(-18,-13,36,26,10).lineStyle(1,light,.85).strokeRoundedRect(-18,-13,36,26,10);
    const symbol=this.add.text(0,-1,packetSymbol,{fontFamily:UI_FONT,fontSize:multiply?'18px':'16px',fontStyle:'bold',color:'#fff3d0',resolution:Math.max(1.5,1/this.scale.zoom)}).setOrigin(.5);
    packet.add([shape,symbol]);this.keepScoreReadable();
    const flight={t:0};
    return Promise.all([
      this.animate({targets:flight,t:1,duration,ease:multiply?'Cubic.easeIn':'Sine.easeInOut',onUpdate:()=>{const t=flight.t,u=1-t;packet.setPosition(u*u*start.x+2*u*t*mid.x+t*t*end.x,u*u*start.y+2*u*t*mid.y+t*t*end.y).setScale(1-t*.4).setAlpha(1-t*.55);}},context),
      this.animate({targets:trail,alpha:{from:1,to:0},duration,ease:'Sine.easeIn'},context),
    ]).then(()=>{packet.destroy();trail.destroy();mask.destroy();safety.destroy();});
  }
  /** Accumulator numbers roll between committed values; the exact fraction text always lands last. */
  private rollAccumulator(event:ScoreEvent,duration:number,context:EffectContext):Promise<void> {
    const h0=Number(event.before.H.n)/Number(event.before.H.d),h1=Number(event.after.H.n)/Number(event.after.H.d);
    const m0=Number(event.before.M.n)/Number(event.before.M.d),m1=Number(event.after.M.n)/Number(event.after.M.d);
    if(this.reducedMotion||duration<90||![h0,h1,m0,m1,h0*m0,h1*m1].every(Number.isFinite)||Math.max(h0,h1)*Math.max(m0,m1)>Number.MAX_SAFE_INTEGER){this.setAccumulator(event.after);return Promise.resolve();}
    if(!context.signal.aborted&&(h0!==h1||m0!==m1))this.audio.scoreRoll(duration/gameSession().speed,m0!==m1?'mult':'heat',event.operation==='multiply-multiplier'?2:1);
    const trim=(value:number)=>String(Number(value.toFixed(2)));
    const roll={t:0};
    return this.animate({targets:roll,t:1,duration,ease:'Sine.easeOut',onUpdate:()=>{
      if(roll.t>=1){this.setAccumulator(event.after);return;}
      const hv=h0+(h1-h0)*roll.t,mv=m0+(m1-m0)*roll.t;
      this.scoreHeat.setText(trim(hv));this.scoreMult.setText('× '+trim(mv));
      this.setDisplayedProduct(Math.max(0,Math.floor(hv*mv)).toString());
    }},context).then(()=>{if(!context.signal.aborted)this.setAccumulator(event.after);});
  }
  private async showScoreEvent(event:ScoreEvent,index:number,beat:ScoreBeat,context:EffectContext):Promise<void> {
    if(context.signal.aborted)return;
    this.ensureTraceSource(event);
    if(event.targetCardId)this.showTraceHeldCard(event.targetCardId);
    const timing=this.reducedMotion?{...beat,windup:0,flight:0,impact:Math.min(180,beat.impact),rest:120}:beat,duration=timing.windup+timing.flight+timing.impact;
    const note=this.operationText(event),source=this.eventSource(event),card=this.settledCards.get(event.targetCardId??'')??this.cardViews.find(view=>view.card.id===event.targetCardId);
    this.resultText.setText(source+' · '+note);this.breakdownText.setText((event.phase==='onStageClear'?'过关收益':event.phase==='beforeFailure'?'失败前救场':event.phase==='afterHand'?'结算后状态':event.sourceType==='joker'?'大丑牌连锁':'逐项计分')+' · '+source+' '+note);this.setAccumulator(event.before);
    this.scoreTotal.setData('eventId',event.eventId).setData('eventPhase','windup');
    const sourceEffects:Promise<void>[]=[];
    // All source reactions wait for the actual packet arrival, including slow frames.
    let arrive!:()=>void;
    const impact=new Promise<void>(resolve=>{arrive=()=>{context.signal.removeEventListener('abort',arrive);resolve();};context.signal.addEventListener('abort',arrive,{once:true});});
    const cardResponds=!!card&&this.cardRespondsTo(event,card);
    if(cardResponds&&card)sourceEffects.push(this.illuminateCard(card,event,timing,context,impact));
    if(event.sourceType==='character'){
      sourceEffects.push(this.animateRole(note,duration,context,timing,impact));
    }else if(event.sourceType==='joker'){
      sourceEffects.push(this.animateJoker(event,duration,context,timing,impact));
    }else if(event.operation==='seal-joker'&&event.targetJokerInstanceId){
      sourceEffects.push(this.animateJoker({sourceInstanceId:event.targetJokerInstanceId,operation:'seal-joker'},duration,context,timing,impact).then(()=>{
        const view=this.jokerViews.get(event.targetJokerInstanceId!);if(!view||context.signal.aborted)return;
        view.setData('bossDisabled',true).setData('frameColor',T.red);(view.getData('frame') as Phaser.GameObjects.Rectangle).setStrokeStyle(2,T.red);
        (view.getData('valueLabel') as Phaser.GameObjects.Text).setText(this.view.layout.mode==='landscape'?'计分封禁':'封禁').setColor(C.red);
      }));
    }else if(card&&cardResponds){
      sourceEffects.push(this.focusSource(card.container,card.background,event.retriggerDepth?T.brass:T.jade,false,duration,context,timing,impact));
    }else if(card&&event.sourceType==='rule'){
      sourceEffects.push(this.focusSource(card.container,card.background,T.red,false,duration,context,timing,impact));
    }else if(event.sourceType==='rule'&&(R2_LONG_TERM_ITEMS.some(item=>item.id===event.sourceDefinitionId)||R2_TOOLS.some(tool=>tool.id===event.sourceDefinitionId)||R2_MODE_CATALOG.programs.some(program=>program.id===event.sourceDefinitionId))){
      const b=this.goldText.getBounds(),halo=this.view.add(this.add.graphics().lineStyle(3,T.brass,.9).strokeRoundedRect(b.x-4,b.y-4,b.width+8,b.height+8,8));
      sourceEffects.push(impact.then(()=>this.animate({targets:halo,alpha:{from:1,to:.15},duration:timing.impact,ease:'Sine.easeOut'},context)).then(()=>halo.destroy()));
      sourceEffects.push(this.floatNote(source,b.x+b.width/2,b.y-12,'#ffdda3',duration,context));
    }
    await this.wait(timing.windup,context);
    if(context.signal.aborted){arrive();return;}
    await this.transferToAccumulator(event,card,timing.flight,context);
    arrive();
    if(context.signal.aborted)return;
    // The domain result is already saved. Only the display and SFX arrive with this hit.
    this.scoreTotal.setData('eventPhase','impact');
    if(event.sourceType==='character')this.audio.sourceCue('character');
    else if(event.sourceType==='joker')this.audio.sourceCue(event.phase==='onHeldCard'?'held':'joker',index);
    else if(event.sourceType==='card'&&event.value.n!=='0')this.audio.sourceCue('card',index);
    else if(event.sourceType==='rule')this.audio.sourceCue(event.phase==='onStageClear'?'held':'boss');
    if(event.operation==='multiply-multiplier'||event.operation==='read-coefficient'){this.audio.multiplier('multiply',index);if(!this.reducedMotion)this.cameras.main.shake(70,.0008);}
    else if(event.operation==='add-multiplier'||event.operation==='read-growth'&&(event.before.M.n!==event.after.M.n||event.before.M.d!==event.after.M.d))this.audio.multiplier('add',index);
    else if(event.operation==='retrigger-card')this.audio.retrigger(index);
    if(['lucky-multiplier-check','lucky-gold-check','glass-check'].includes(event.operation))this.audio.chanceRoll(event.operation==='glass-check'?'glass':'lucky',event.value.n==='1');
    if(event.operation==='chance-heat-check')this.audio.chanceRoll('joker',event.value.n==='1');
    if(event.operation==='destroy-card')this.audio.glassBreak();
    if(event.operation==='upgrade-hand')this.audio.toolUse('planet');
    if(event.operation==='reward-consumable')this.audio.rareReveal();
    if(event.operation==='reward-free-reroll')this.audio.rareReveal();
    const impactDuration=timing.impact;
    const effects=[...sourceEffects,this.rollAccumulator(event,impactDuration,context),this.pulseAccumulator(event,impactDuration,context),this.impactAccumulator(event,impactDuration,context),this.wait(impactDuration,context)],notes:Promise<void>[]=[];
    if((event.operation==='rescue-hand'||event.operation==='refund-hand')&&this.presentation&&!this.presentation.replay&&event.resourceBefore!==undefined&&event.resourceAfter!==undefined){
      this.presentation.resourcePlayLeft=event.resourceAfter;
      effects.push(this.pulseResource('play',event.resourceBefore,context,event.resourceAfter));this.audio.select();
    }
    if(event.operation==='add-gold'){
      if(this.presentation&&!this.presentation.replay&&event.resourceAfter!==undefined){
        effects.push(this.rollGold(event.resourceBefore??event.resourceAfter,event.resourceAfter,impactDuration,context));
      }
      this.audio.coin();
    }
    if(event.sourceType==='joker'){
      const jv=this.jokerViews.get(event.sourceInstanceId);
      if(jv){const frame=jv.getData('frame') as Phaser.GameObjects.Rectangle;notes.push(this.floatNote(note,Number(jv.getData('baseX')),Number(jv.getData('baseY'))-frame.height/2-8,event.operation==='multiply-multiplier'||event.operation==='read-coefficient'?'#f6c0a4':'#ffe3ae',impactDuration+timing.rest,context));}
    }else if(event.sourceType==='character'){
      notes.push(this.floatNote(note,this.roleAvatar.x,this.roleAvatar.y-this.roleFrame.height/2-8,'#ffe3ae',impactDuration+timing.rest,context));
    }else if(card)effects.push(this.floatNote(note,card.container.x,card.container.y,'#d3f0d3',impactDuration,context));
    if(cardResponds&&card&&event.sourceType==='joker'&&!this.reducedMotion){
      const angle=card.container.angle;
      effects.push(this.animate({targets:card.container,angle:angle+(event.operation==='retrigger-card'?3:2),duration:impactDuration/4,yoyo:true,repeat:1,ease:'Sine.easeInOut'},context).then(()=>{if(card.container.active)card.container.setAngle(angle);}));
    }
    await Promise.all(effects);
    if(context.signal.aborted)return;
    this.setAccumulator(event.after);
    this.scoreTotal.setData('eventPhase','rest');
    await Promise.all([this.wait(timing.rest,context),...notes]);
    if(context.signal.aborted)return;
    if(event.operation==='destroy-card'&&card){
      await this.breakGlass(card,context);
    }
    const joker=(this.presentation?.score.jokers??this.run.jokers).find(joker=>joker.instanceId===event.sourceInstanceId),jokerView=this.jokerViews.get(event.sourceInstanceId),label=jokerView?.getData('valueLabel') as Phaser.GameObjects.Text|undefined;
    if(event.operation==='increment-hands-scored'){
      const lifetime=getJoker(event.sourceDefinitionId).hooks.flatMap(hook=>hook.operations).find(operation=>operation.kind==='expire-after-hands');
      if(lifetime?.kind==='expire-after-hands')label?.setText('余'+Math.max(0,lifetime.limit-Number(event.value.n)/Number(event.value.d))+'手');
    }else if(joker&&['consume-growth','add-growth','reset-growth','add-coefficient','reset-coefficient','increment-clear-cycle'].includes(event.operation))label?.setText(this.jokerValue(joker));
    if(event.operation==='destroy-joker'&&jokerView){
      label?.setText('已销毁');
      await this.animate({targets:jokerView,alpha:0,scale:{from:1,to:.8},duration:this.reducedMotion?40:180},context);
      if(!context.signal.aborted){(jokerView.getData('hit') as Phaser.GameObjects.Rectangle|undefined)?.destroy();jokerView.destroy();this.jokerViews.delete(event.sourceInstanceId);}
    }
  }
  private async rollGold(before:number,after:number,duration:number,context:EffectContext):Promise<void> {
    const show=(value:number)=>{if(this.presentation)this.presentation.resourceGold=value;this.goldText.setText((this.view.layout.shortLandscape?'':'金币 ')+value+(this.view.layout.shortLandscape?' 金':''));};
    if(this.reducedMotion||Math.max(before,after)>1000000000){show(after);this.updateHud();return;}
    show(before);
    const counter={value:before};this.audio.scoreRoll(duration/gameSession().speed,'total',1);
    await Promise.all([this.animate({targets:counter,value:after,duration,ease:'Cubic.easeOut',onUpdate:()=>show(Math.round(counter.value))},context),this.animate({targets:this.goldText,scale:{from:1.35,to:1},duration,ease:'Back.easeOut'},context)]);
    if(!context.signal.aborted){show(after);this.updateHud();}
  }
  private async breakGlass(card:CardView,context:EffectContext):Promise<void> {
    const c=card.container,b=card.background;
    if(this.reducedMotion){c.setAlpha(.25);card.scoringMark.setText('已碎').setVisible(true);return;}
    const shards=Array.from({length:7},(_,i)=>this.view.add(this.add.triangle(c.x,c.y,-4,-6,5,-2,0,7,i%2?0xb7e9ed:0xf5faf0,.9).setAngle(i*47)));
    await Promise.all([this.animate({targets:c,alpha:0,scaleX:c.scaleX*.85,scaleY:c.scaleY*.85,duration:220},context),...shards.map((shard,i)=>this.animate({targets:shard,x:shard.x+Math.cos(i*2.39996)*b.width*.6,y:shard.y+Math.sin(i*2.39996)*b.height*.45,angle:shard.angle+80,alpha:0,duration:300,ease:'Cubic.easeOut'},context).then(()=>shard.destroy()))]);
  }
  private ensureTraceSource(event:ScoreEvent):void {
    if(event.sourceType!=='joker'||this.jokerViews.has(event.sourceInstanceId))return;
    const definition=getJoker(event.sourceDefinitionId),rarityStyle=JOKER_RARITY[definition.rarity],l=this.view.layout,index=Math.min(this.jokerViews.size,R2_LIMITS.jokerSlots-1),b=l.slots[index],sideLabels=l.mode==='landscape',labelBox=l.jokerLabels[index],labelX=sideLabels?labelBox.x-b.x-b.width/2:-b.width/2+5;
    const marker=this.view.add(this.add.container(b.x+b.width/2,b.y+b.height/2)),frame=this.add.rectangle(0,0,b.width,b.height,rarityStyle.paper).setStrokeStyle(2,rarityStyle.edge);
    marker.add(frame);drawJokerMotif(this,marker,definition.id,0,0,Math.min(b.width,b.height)*.75);
    marker.add(this.add.text(labelX,-b.height/2+5,definition.name,{fontFamily:UI_FONT,fontSize:'14px',fontStyle:'bold',color:sideLabels?'#fff0cf':rarityStyle.css.ink,wordWrap:{width:sideLabels?labelBox.width:b.width-10,useAdvancedWrap:true},maxLines:l.shortLandscape?1:2}));
    const stackValue=!sideLabels&&b.width<64,label=this.add.text(labelX,sideLabels?-b.height/2+26:b.height/2-(stackValue?24:3),'回看来源',{fontFamily:UI_FONT,fontSize:'12px',color:sideLabels?'#ffd0af':rarityStyle.css.ink,wordWrap:{width:sideLabels?labelBox.width:stackValue?b.width-10:b.width-40,useAdvancedWrap:true},maxLines:l.shortLandscape?1:2}).setOrigin(0,sideLabels?0:1);marker.add(label);
    marker.add(createJokerRarityBadge(this,definition.rarity,{x:b.width/2-31,y:b.height/2-21,compact:true,resolution:Math.max(1.5,1/this.scale.zoom)}).setData('definitionId',definition.id).setData('surface','trace'));
    marker.setData('frame',frame).setData('frameColor',rarityStyle.edge).setData('valueLabel',label).setData('baseX',marker.x).setData('baseY',marker.y);this.jokerViews.set(event.sourceInstanceId,marker);
  }
  private showTraceHeldCard(id:string):void {
    if(!this.presentation||this.settledCards.has(id))return;
    const index=this.cardViews.findIndex(view=>view.card.id===id);if(index<0||this.view.layout.cards[index]?.visible)return;
    const current=this.view.layout;this.handStart=index<current.handStart?index:index-current.visibleCardCount+1;
    const l=this.view.layout;
    this.cardViews.forEach((view,i)=>{if(this.settledCards.has(view.card.id))return;const area=l.cards[i];view.container.setVisible(area.visible).setPosition(area.visual.x+area.visual.width/2,area.visual.y+area.visual.height/2).setAngle(0);view.hit?.setVisible(false);});
    this.updateHandCount();
  }
  private async pulseResource(kind:'play'|'discard',before:number,context:EffectContext,after?:number):Promise<void> {
    if(context.signal.aborted)return;
    const count=this.resourceCounts[kind],remaining=after??(kind==='play'?this.handsLeft:this.run.stage!.discardsLeft),amount=before-remaining,cost=kind==='play'?1:r2DiscardCost(this.run);count.setText(remaining+' 次');
    this.audio.resourceSpend(kind,remaining,amount,cost);
    const critical=remaining<2*cost,color=critical?0xf7a281:0xbfe4b7;
    const note=(kind==='play'?'出牌':'弃牌')+(amount>0?' −'+amount+' 次':amount===0?'次数已返还':' +'+(-amount)+' 次')+(remaining<cost?' · 次数已用完':critical?' · 只剩最后一次':'');
    this.statusMessage=note;this.updateControls();
    const halo=this.view.add(this.add.graphics().setPosition(count.x,count.y));
    halo.fillStyle(color,.18).fillRoundedRect(-26,-16,52,32,8).lineStyle(2,color,.85).strokeRoundedRect(-26,-16,52,32,8);
    this.view.root.bringToTop(count);
    try {
      if(this.reducedMotion){halo.setVisible(false);await this.wait(180,context);return;}
      await Promise.all([
        this.animate({targets:count,scaleX:{from:critical?1.85:1.6,to:1},duration:critical?520:420,ease:'Back.easeOut'},context),
        this.animate({targets:halo,scaleX:{from:.75,to:1.45},alpha:{from:1,to:0},duration:critical?520:420,ease:'Cubic.easeOut'},context),
      ]);
    } finally {if(count.active){count.setScale(1);if(this.statusMessage===note){this.statusMessage='';this.updateControls();}}halo.destroy();}
  }
  private burst(tier:number,context:EffectContext):Promise<void> {
    if(this.reducedMotion||tier===0)return Promise.resolve();
    const p=this.view.layout.playedArea,count=tier===3?32:tier===2?20:10;
    const particles=Array.from({length:count},(_,i)=>{
      const angle=i*2.39996,radius=Math.min(p.width*.44,170)*(0.55+(i%4)*.15);
      const part=this.view.add(this.add.rectangle(p.x+p.width/2,p.y+p.height/2,3+(i%3),7+(i%2)*4,i%3===0?T.red:i%3===1?T.brass:T.jade)).setAngle(i*47);
      const x=Phaser.Math.Clamp(part.x+Math.cos(angle)*radius,p.x+8,p.x+p.width-8),y=Phaser.Math.Clamp(part.y+Math.sin(angle)*radius*.6,p.y+8,p.y+p.height-8);
      return this.animate({targets:part,x,y,angle:part.angle+120,alpha:0,duration:360,ease:'Cubic.easeOut'},context).then(()=>part.destroy());
    });return Promise.all(particles).then(()=>undefined);
  }
  private shockwave(tier:number,context:EffectContext):Promise<void> {
    if(this.reducedMotion||tier<2||context.signal.aborted)return Promise.resolve();
    const p=this.view.layout.playedArea,cx=p.x+p.width/2,cy=p.y+p.height/2,width=Math.min(p.width-24,tier===3?540:420),height=Math.min(p.height-24,tier===3?230:180);
    if(width<40||height<30)return Promise.resolve();
    const anchor=this.settledCards.values().next().value?.container;
    const rings=[this.view.add(this.add.ellipse(cx,cy,width,height).setFillStyle(T.brass,0).setStrokeStyle(3,0xf7d49b,.9)),this.view.add(this.add.ellipse(cx,cy,width*.82,height*.76).setFillStyle(T.jade,0).setStrokeStyle(2,0x92c4ae,.75))];
    const rays=this.view.add(this.add.graphics().setPosition(cx,cy));
    for(let i=0;i<6;i++){const a=i*Math.PI/3,r0=.35,r1=.48;rays.lineStyle(tier===3?3:2,T.red,.8).beginPath().moveTo(Math.cos(a)*width*r0,Math.sin(a)*height*r0).lineTo(Math.cos(a)*width*r1,Math.sin(a)*height*r1).strokePath();}
    if(anchor)for(const effect of [...rings,rays])this.view.root.moveBelow<Phaser.GameObjects.GameObject>(effect,anchor);
    this.keepScoreReadable();
    return Promise.all([
      this.animate({targets:rings[0],scale:{from:.25,to:1},alpha:{from:1,to:0},duration:430,ease:'Cubic.easeOut'},context),
      this.animate({targets:rings[1],scale:{from:.18,to:1},alpha:{from:.8,to:0},delay:40,duration:360,ease:'Cubic.easeOut'},context),
      this.animate({targets:rays,scale:{from:.5,to:1},alpha:{from:1,to:0},duration:280,ease:'Cubic.easeOut'},context),
    ]).then(()=>{rings.forEach(ring=>ring.destroy());rays.destroy();});
  }
  private async award(score:ScoreTrace,presentation:NonNullable<GameScene['presentation']>,context:EffectContext):Promise<void> {
    if(context.signal.aborted)return;
    const target=BigInt(this.stage.targetHeat),points=BigInt(score.finalScore);
    if(!presentation.replay)presentation.resourceGold=score.events.find(event=>event.phase==='onStageClear'&&event.operation==='add-gold'&&event.resourceBefore!==undefined)?.resourceBefore??presentation.state.gold;
    const celebration=scoreCelebration(presentation.displayHeat,presentation.state.stage!.heat,this.stage.targetHeat);
    const tier=celebration.cleared?Math.min(3,celebration.tier+1):points*3n>=target?1:0;
    await this.convergeScore(context);if(context.signal.aborted)return;
    this.setAccumulator(score.accumulator);this.setDisplayedProduct(score.finalScore);
    this.resultText.setText((presentation.replay?'回看 · ':celebration.cleared?celebration.label+' · ':HAND_LABELS[score.handType]+' · ')+'+'+heatText(score.finalScore));
    this.breakdownText.setText(fractionText(score.accumulator.H)+' 热度 × '+fractionText(score.accumulator.M)+' 倍率 = '+heatText(score.finalScore));
    presentation.credited=true;this.updateHud();
    if(!presentation.replay){if(celebration.cleared&&celebration.tier!==0)this.audio.overkill(celebration.tier);else this.audio.score(celebration.cleared?1:0);}
    if(!this.reducedMotion&&celebration.tier>0){this.cameras.main.shake(150+celebration.tier*35,.0015+celebration.tier*.0006);try{navigator.vibrate?.(celebration.tier>=2?[20,25,20]:20);}catch{/* Optional haptics never block presentation. */}}
    const effects:Promise<void>[]=[this.burst(tier,context),this.shockwave(tier,context)];
    // The credited heat rolls up in the HUD; the exact saved value always lands last.
    const heatFrom=BigInt(presentation.displayHeat),heatTo=BigInt(presentation.state.stage!.heat);
    if(!this.reducedMotion&&heatTo>heatFrom&&heatTo-heatFrom<10000000000n){
      this.audio.scoreRoll((celebration.cleared?560:400)/gameSession().speed,'total',celebration.tier>=2?2:1);
      const roll={t:0};this.rollingHeat=true;
      effects.push(this.animate({targets:roll,t:1,duration:celebration.cleared?560:400,ease:'Cubic.easeOut',onUpdate:()=>{
        presentation.displayHeat=(heatFrom+BigInt(Math.floor(Number(heatTo-heatFrom)*roll.t))).toString();this.updateHud();
      }},context).then(()=>{this.rollingHeat=false;presentation.displayHeat=presentation.state.stage!.heat;if(!context.signal.aborted)this.updateHud();}));
    }else {presentation.displayHeat=presentation.state.stage!.heat;this.updateHud();}
    if(!this.reducedMotion){
      effects.push(this.pulseScoreNumber(this.scoreTotal,1.08,celebration.cleared?620:310,context));
      effects.push(this.animate({targets:this.heatText,scale:{from:celebration.cleared?1.1:1.04,to:1},duration:celebration.cleared?620:310,ease:'Back.easeOut'},context));
    }
    const p=this.view.layout.playedArea;
    if(celebration.cleared){
      const width=Math.min(340,p.width-16),height=p.height>=104?90:p.height>=64?50:38,rich=height===90;
      const stamp=this.view.add(this.add.container(p.x+p.width/2,p.y+p.height/2)).setName('score/celebration');
      const face=this.view.material({x:-width/2,y:-height/2,width,height},celebration.tier>0?0x744c36:0x344e53,0x172c34,7),edge=this.add.graphics();
      edge.lineStyle(2,0xffd79c,.95).strokeRoundedRect(-width/2,-height/2,width,height,7);
      edge.lineStyle(1,0xb69866,.75).strokeRoundedRect(-width/2+4,-height/2+4,width-8,height-8,4);
      const ratio=celebration.ratio.length<10?celebration.ratio:heatText(celebration.ratio.split('.')[0]);
      const caption=this.add.text(0,rich?-height/2+7:0,celebration.label+' · '+ratio+'×目标',{fontFamily:UI_FONT,fontSize:rich?'16px':'14px',fontStyle:'bold',color:C.ink,resolution:Math.max(1.5,1/this.scale.zoom)}).setOrigin(.5,rich?0:.5);
      stamp.add([face,edge,caption]);
      if(rich){
        const number=this.add.text(0,-17,'+'+heatText(score.finalScore),{fontFamily:UI_FONT,fontSize:'34px',fontStyle:'bold',color:C.ink,resolution:Math.max(1.5,1/this.scale.zoom)}).setOrigin(.5,0);
        if(number.width>width-20)number.setScale((width-20)/number.width);
        const excess=this.add.text(0,25,'本场超额 +'+heatText(celebration.excess),{fontFamily:UI_FONT,fontSize:'14px',color:C.mutedInk,resolution:Math.max(1.5,1/this.scale.zoom)}).setOrigin(.5,0);
        stamp.add([number,excess]);
      }
      this.keepScoreReadable();
      effects.push((async()=>{try{
        if(!this.reducedMotion)await this.animate({targets:stamp,scale:{from:.65,to:1},duration:180,ease:'Back.easeOut'},context);
        await this.wait(420+celebration.tier*100,context);
        if(!this.reducedMotion)await this.animate({targets:stamp,alpha:0,y:stamp.y-8,duration:200},context);
      }finally{stamp.destroy();}})());
    }
    effects.push(this.wait(celebration.cleared&&!this.reducedMotion?1400:tier>=2?600:360,context));await Promise.all(effects);
  }
  private convergeScore(context:EffectContext):Promise<void> {
    if(this.reducedMotion||context.signal.aborted)return Promise.resolve();
    const target=this.scoreTotal.getBounds(),base=Math.max(...[this.scoreHeat,this.scoreMult,this.scoreTotal].map(text=>text.getBounds().bottom))+6,end={x:target.centerX,y:base};
    const effects=[this.scoreHeat,this.scoreMult].map((source,i)=>{
      const b=source.getBounds(),color=i===0?T.jade:T.red,start={x:b.centerX,y:base};
      const line=this.view.add(this.add.graphics().lineStyle(1,color,.5).beginPath().moveTo(start.x,start.y).lineTo(end.x,end.y).strokePath()).setName('score/total-flight-line').setData('landing',end);
      const spark=this.view.add(this.add.circle(start.x,start.y,2,color)).setName('score/total-flight-dot');
      return this.animate({targets:spark,x:end.x,y:end.y,scale:{from:1,to:.55},duration:140,ease:'Sine.easeIn'},context).then(()=>{spark.destroy();line.destroy();});
    });this.keepScoreReadable();return Promise.all(effects).then(()=>undefined);
  }
  private async presentTrace(score:ScoreTrace,state:RunState,views:readonly CardView[],lifecycle:number,intent:number,beforeHeat=this.heat,replay=false,previousTrace:ScoreTrace|null=this.run.lastTrace,beforeHands?:number,beforeGold?:number):Promise<void> {
    this.effects.clear();const generation=this.effects.generation;
    const originHeat=replay?(BigInt(beforeHeat)>BigInt(score.finalScore)?BigInt(beforeHeat)-BigInt(score.finalScore):0n).toString():beforeHeat;
    const hand=score.cards,presentation={generation,lifecycle,intent,state,score,hand,displayHeat:beforeHeat,originHeat,replay,previousTrace,credited:replay,resourcePlayLeft:!replay&&beforeHands!==undefined?beforeHands-1:undefined,resourceGold:!replay?beforeGold:undefined};this.presentation=presentation;
    if(replay){
      this.handStart=0;
      this.cardViews.forEach(view=>{view.hit?.destroy();view.sheenTween?.remove();this.tweens.killTweensOf(view.container);view.container.destroy();});
      this.cardViews=score.cards.map((card,i)=>{const box=this.view.layout.cards[i],view=this.cardPiece(card,box.visual);this.view.add(view.container);view.container.setVisible(box.visible);return view;});
      this.jokerViews.forEach(view=>{(view.getData('hit') as Phaser.GameObjects.GameObject|undefined)?.destroy();view.destroy();});this.renderJokerRack(score.sourceJokers);
    }
    this.refreshSelection();this.updateHud();this.previewCards?.destroy();this.previewCards=undefined;
    this.scoreLabels.forEach((label,i)=>label.setText(['累计热度','当前倍率','本手得分'][i]));this.resultText.setText((replay?'回看 · ':'打出 · ')+HAND_LABELS[score.handType]);
    this.settledCards.clear();const boxes=this.landingBoxes(score.sets.playedIds.length);
    const landing=score.sets.playedIds.map((id,i)=>{
      const view=views.find(view=>view.card.id===id)??this.cardViews.find(view=>view.card.id===id)??this.cardPiece(score.cards.find(card=>card.id===id)!,boxes[i]);
      this.settledCards.set(id,view);view.container.setVisible(true);view.selectionMark?.setVisible(false);view.hit?.disableInteractive();return {view,box:boxes[i]};
    });
    this.effects.enqueue(async context=>{
      this.audio.playHand();
      await Promise.all([...(beforeHands!==undefined&&!replay?[this.pulseResource('play',beforeHands,context,beforeHands-1)]:[]),...landing.map(async({view,box},i)=>{
        const sx=box.width/Number(view.container.getData('width')),sy=box.height/Number(view.container.getData('height'));
        const tx=box.x+box.width/2,ty=box.y+box.height/2;
        if(this.reducedMotion){view.container.setPosition(tx,ty).setScale(sx,sy).setAngle(0);return;}
        const start={x:view.container.x,y:view.container.y,scaleX:view.container.scaleX,scaleY:view.container.scaleY,angle:view.container.angle},mid={x:(start.x+tx)/2,y:Math.min(start.y,ty)-64},flight={t:0};
        await this.animate({targets:flight,t:1,duration:230,delay:i*55,ease:'Sine.easeInOut',onUpdate:()=>{
          if(!view.container.active)return;const t=flight.t,u=1-t;
          view.container.setPosition(u*u*start.x+2*u*t*mid.x+t*t*tx,u*u*start.y+2*u*t*mid.y+t*t*ty)
            .setScale(start.scaleX+(sx-start.scaleX)*t,start.scaleY+(sy-start.scaleY)*t)
            .setAngle(start.angle*(1-t)+(i%2===0?-3:3)*Math.sin(t*Math.PI));
        }},context);
        if(!view.container.active||context.signal.aborted)return;
        this.audio.cardLand();
        view.container.setScale(sx*1.07,sy*.9).setAngle(0);
        await this.animate({targets:view.container,scaleX:sx,scaleY:sy,duration:110,ease:'Back.easeOut'},context);
      })]);
      if(context.signal.aborted)return;this.setAccumulator(score.events[0].after);this.breakdownText.setText('牌型 '+HAND_LABELS[score.handType]+' · ★ '+score.sets.activeScoringIds.length+' 张计分');
      const formation=fourCardFormation(score);
      if(formation){
        const view=this.jokerViews.get(formation.instanceId),frame=view?.getData('frame') as Phaser.GameObjects.Rectangle|undefined;
        const type=HAND_LABELS[formation.handType],name=getJoker(formation.definitionId).name;
        this.resultText.setText(name+' · 四张普通'+type);this.breakdownText.setText(name+'允许4张普通'+type+'；同花顺仍须5张。');
        if(view&&frame){this.audio.sourceCue('joker');await Promise.all([this.focusSource(view,frame,T.brass,false,380,context),this.floatNote('四张'+type,view.x,view.y-frame.height/2-8,'#ffe3ae',380,context)]);}
      }
    });
    this.effects.enqueue(context=>this.wait(this.reducedMotion?120:460,context));
    let jokerIndex=0,scoreOrdinal=0;
    for(const event of score.events){
      if(event.phase==='base')continue;
      if(event.phase==='finalScore'){this.effects.enqueue(context=>this.award(score,presentation,context));continue;}
      const index=event.sourceType==='joker'?jokerIndex++:event.sourceType==='character'?0:score.sets.activeScoringIds.indexOf(event.targetCardId??'');
      const beat=scoreBeat(event,scoreOrdinal++);this.effects.enqueue(context=>this.showScoreEvent(event,Math.max(0,index),beat,context));
    }
    let failed=false;
    try {await this.effects.drain();}
    catch {failed=true;if(this.alive(lifecycle,intent))this.resultText.setText('演出已停止，确定结果已保存。');}
    if(this.alive(lifecycle,intent)&&this.presentation===presentation&&(failed||this.effects.isCurrent(generation)))this.completePresentation(presentation);
  }

  private completePresentation(presentation:NonNullable<GameScene['presentation']>):void {
    if(!this.alive(presentation.lifecycle,presentation.intent))return;
    this.stopScoreFire();
    this.presentation=undefined;this.run=presentation.state;this.selectedIds.clear();this.statusMessage='';this.updateHud();
    if(this.run.phase==='stage-cleared'||this.run.phase==='run-won'){this.finishStage(true,true,!presentation.replay);return;}
    if(this.run.phase==='run-lost'){this.finishStage(false,!presentation.replay);return;}
    this.playing=false;this.render();this.revealDrawnCards(presentation.hand.map(card=>card.id));
  }

  fastForward():void {const presentation=this.presentation;if(!presentation)return;this.effects.clear();this.audio.cancelPresentation();this.cameras.main.resetFX();this.heatText.setScale(1);this.scoreTotal.setScale(1);this.completePresentation(presentation);}
  replayLastTrace():void {
    if(this.playing||!this.run.lastTrace)return;
    this.clearHover();this.playing=true;this.playButton.disableInteractive();const intent=++this.intent;
    void this.presentTrace(this.run.lastTrace,this.run,[],this.lifecycle,intent,this.heat,true);
  }
  private inspectLastTrace():void {
    const score=this.run.lastTrace;if(!score)return;
    // The recap reads the saved ledger, never today's gold or next-hand eligibility.
    const benefits=score.sourceJokers.flatMap(joker=>{
      const copy=cardAbilityCopy(joker.definitionId,{gold:this.run.gold,instanceId:joker.instanceId,events:score.events});if(!copy)return [];
      const edition=score.events.filter(event=>event.sourceType==='joker'&&event.sourceInstanceId===joker.instanceId&&event.reasonKey.startsWith('edition.')).map(event=>this.operationText(event)).join('、');
      return [getJoker(joker.definitionId).name+'：'+(copy.bodyActive?copy.benefit:'本体未触发')+(edition?'；版次 '+edition:'')];
    });
    this.dialog.open('上手已入账 · '+HAND_LABELS[score.handType]+' +'+heatText(score.finalScore),this.formatBreakdown(score)+'\n\n'+score.events.filter(event=>event.phase!=='base'&&event.phase!=='finalScore').map(event=>this.eventSource(event)+' '+this.operationText(event)+(['afterHand','beforeFailure','onStageClear'].includes(event.phase)?'':' → 热度 '+fractionText(event.after.H)+' / 倍率 '+fractionText(event.after.M))).join('\n'),[{label:'回看演出',disabled:!this.ready,run:()=>{this.dialog.close();this.replayLastTrace();}}],benefits.length?{effectBody:this.formatBreakdown(score)+'\n\n'+benefits.join('\n'),collapseRules:true,rulesLabel:'完整计分明细'}:{});
  }

  /** 本关结束：先让玩家看清结果，再进入明确的过场状态 */
  private finishStage(cleared: boolean,cueFailure=true,cueReward=false): void {
    this.playing=true;this.playButton.disableInteractive();
    const lifecycle=this.lifecycle,handsLeft=this.handsLeft;
    const completedIndex = this.run.stage!.index;
    const stageHeat = this.heat;
    const goldEarned = this.run.stage!.goldEarned, rewardClearId=cleared&&cueReward?this.run.stage!.clearId:undefined;

    if (cleared) {
      this.resultText.setText(`过关 · ${heatText(stageHeat)} 热度`);

    } else {
      this.resultText.setText(
        `冷场 · 差 ${heatText((BigInt(this.stage.targetHeat)>BigInt(stageHeat)?BigInt(this.stage.targetHeat)-BigInt(stageHeat):0n).toString())} 热度`,
      );
    }

    this.tweens.add({targets:{t:0},t:1,duration:1000,onComplete:() => {
      if(lifecycle!==this.lifecycle||!this.scene.isActive())return;
      this.scene.start('intermission', {
        cleared,
        stageIndex: completedIndex,
        stageHeat,
        handsLeft,
        goldEarned,
        ...(rewardClearId?{rewardClearId}:{}),
        ...(!cleared&&cueFailure?{failureCue:{runId:this.run.runId,commandSeq:this.run.commandSeq}}:{})
      } satisfies IntermissionResult);
    }});
  }

  private updateHud(): void {
    this.stage={...this.stage,targetHeat:this.run.stage!.targetHeat};
    (this.view.root.getByName('hud/target') as Phaser.GameObjects.Text|undefined)?.setText('目标 '+heatText(this.stage.targetHeat));
    const l=this.view.layout,displayHeat=this.presentation?.displayHeat??this.heat,remaining=(BigInt(this.stage.targetHeat)>BigInt(displayHeat)?BigInt(this.stage.targetHeat)-BigInt(displayHeat):0n).toString();
    this.heatText.setText(l.mode==='portrait'?'目标 '+heatText(displayHeat)+' / '+heatText(this.stage.targetHeat):heatText(displayHeat));
    const discardCost=r2DiscardCost(this.run),discards=this.run.stage!.discardsLeft,plays=this.presentation?.resourcePlayLeft??this.handsLeft;
    this.resourceCounts.play.setText(plays+' 次');this.resourceCounts.discard.setText(discards+' 次');
    if(this.menuActions)this.menuActions.viewLastHand=!this.presentation&&this.run.lastTrace?()=>this.inspectLastTrace():undefined;
    const playColor=C.paperLight,discardColor=discards<2*discardCost?C.red:C.jade;
    if(this.resourceCounts.play.style.color!==playColor)this.resourceCounts.play.setColor(playColor);
    if(this.resourceCounts.discard.style.color!==discardColor)this.resourceCounts.discard.setColor(discardColor);
    const gold=this.presentation?.resourceGold??this.run.gold;
    this.goldText.setText(l.shortLandscape?gold+' 金':'金币 '+gold+(l.mode==='desktop'?'\n还需 '+heatText(remaining)+' 热度':''));
    this.updateHandCount();
    this.pileText.setText('抽牌 '+this.deck.length+' · 已打 '+this.run.playedPile.length+' · 已弃 '+this.run.discardPile.length);
    const last=this.presentation?(this.presentation.credited?this.presentation.score:this.presentation.previousTrace):this.run.lastTrace;
    this.previousHandText.setText(last?'上手已入账：'+HAND_LABELS[last.handType]+' +'+heatText(last.finalScore):'上手记录：本场第一手');
    if(l.mode!=='portrait'){
      const filled=BigInt(displayHeat)>=BigInt(this.stage.targetHeat)?1000n:BigInt(displayHeat)*1000n/BigInt(this.stage.targetHeat);
      const widthPx=Math.max(.5,(l.hud.width-24)*Number(filled)/1000);
      if(this.reducedMotion||this.rollingHeat){this.tweens.killTweensOf(this.progressBar);this.progressBar.setDisplaySize(widthPx,5);this.progressTarget=widthPx;}
      else if(this.progressTarget!==widthPx){this.progressTarget=widthPx;this.tweens.killTweensOf(this.progressBar);this.tweens.add({targets:this.progressBar,displayWidth:widthPx,duration:340,ease:'Cubic.easeOut'});}
    }
    if(!this.presentation)this.refreshJokerLabels(this.selectionPreview());
  }
}
