import {sourceImpact} from './SourceImpact';
import {mountSourceImpact} from './SourceImpactView';
import {growthPayoffs,growthEventPayoff} from './GrowthPayoff';
import {showGrowthPayoff} from './GrowthPayoffView';
import {routeFrame} from './RouteFrame';
import {routeFitCue,markRouteDetail} from './RouteFitCue';
import {inventoryFeedback} from './InventoryFeedback';
import {showSavedToolResult} from './SavedToolResult';
import {ENHANCEMENT_BRIEF} from './CardSpecialLabels';
import {fitStatusSummary} from './StatusSummary';
import {transactionGrowthChange,handGrowthChanges} from './SavedGrowthChange';
import {heroAbilityCue,savedHeroResult} from './HeroAbilityCue';
import {usesErxiangHandoff} from '../domain/r2ErxiangHandoff';
import {erxiangChoice,savedErxiangHandoff} from './ErxiangHandoffCopy';
import {drawStageTableArt,playedCaptionBox} from './StageTableArt';
import {paperSceneStart} from './PaperFlow';
import {usesTouyeWager,type TouyeBet,type TouyeTarget} from '../domain/r2TouyeWager';
import {touyeChoice,TOUYE_RISK} from './TouyeWagerCopy';
import {usesLaohuanRefill} from '../domain/r2LaohuanRefill';
import {savedBossImpact} from './SavedBossImpact';
import {numberImpact,impactBeat,numberPulse,type NumberImpact} from './ScoreEnergy';
import {starterSelection} from './RouteStarter';
import {firstChapterGuide,attachFirstChapterGuide} from './FirstChapterGuide';
import {buildGrowthProgress} from './BuildGrowthProgress';
import {showBuildGrowth} from './BuildGrowthView';
import {keyHighlight,keyHighlightBeat,starterRepeatBeat,savedGrowthStamp,type JokerKeyHighlight} from './JokerKeyHighlight';
import {mountKeyHighlight,keyFocusPlacement} from './JokerKeyHighlightView';
import {renderCandidateCards} from './CandidateCardPreview';
import {growthOpportunity} from './GrowthOpportunity';
import {showBuildJourney} from './BuildJourneyDialog';
import {BUILD_LABEL,buildDirectionCaption,buildHandTypes,currentBuildFocus,chooseBuildFocus,type BuildFocus} from './BuildJourney';
import {handRouteTransitions,handRouteTransitionDraft,handRoutePlayBudget} from './HandRouteTransition';
import {handRouteReferences} from './HandRouteGuidance';
import {mountHandRouteReferences} from './HandRouteGuidanceView';
import {selectionExperience,hasActualBenefit,savedBenefit,savedExperienceCards,experienceBeat} from './JokerExperience';
import {groupGrowthCausality,savedGrowthDiscovery} from './JokerGrowthCausality';
import {courtArtKey,queueCourtArtLoads} from './HanddrawnArt';
import {R2HandCandidateCache,r2CandidateKey,r2HandRevision,type R2CandidateInput,type R2CandidateResult} from '../domain/r2HandCandidates';
import {AI_HAND_POLICY,AiHandCandidateCache,aiHandKey,nextAiHand,type AiHandInput,type AiHandCursor} from './AiHandCandidates';
import {jokerMemory,jokerAbilityCopyForRun,publicJokerMemoryContext,recordedJokerMemoryContext} from './JokerMemory';
import {fitJokerLabel,jokerLabelRoom} from './JokerLabel';
import {r2AssistAvailability} from '../domain/r2Assist';
import {assistCandidates,validAssistDraft,savedAssistCopy,ASSIST_EXPLANATION,ASSIST_AI_EXPLANATION} from './AssistSelection';
import {r2SelectionFacts,type R2SelectionFacts} from '../domain/r2SelectionFacts';
import {selectionCopy,selectionCardCopy,fitConditionEntry,fourCardRuleCopy,selectionCandidateEntryBox} from './SelectionCopy';
import {handRuleReference} from './HandRuleReference';
import {subtractBoxes} from './ScoreGeometry';
import {jokerArtAlignedLayers} from './jokerArt';
import {jokerArtLoadState,requestJokerArt,retryJokerArt} from './JokerArtLoading';
import {JOKER_RARITY,createJokerRarityBadge} from './JokerRarity';
import {mountF09Art} from './F09Art';
import Phaser from 'phaser';
import {handActionContent,handActionCountColor} from './HandActionArt';
import {r2JokerCapacity} from '../domain/r2Resources';
import {r2RunModeConfig,R2_MODE_CATALOG} from '../content/r2Modes';
import {showPrograms} from './ProgramDialog';
import { AudioEngine } from '../audio/AudioEngine';
import { rankLabel, SUIT_SYMBOL, SUITS, type Suit, type PlayingCard } from '../cards/types';
import {EffectQueue,type EffectContext} from '../core/EffectQueue';
import {r2JokerDefinitionsFor,r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {readR2Modifiers,type R2JokerInstance} from '../content/r2Schema';
import {HAND_LABELS} from '../content/handLabels';
import {heatText,fractionText} from './scoreText';
import {scoreCelebration} from './scoreCelebration';
import {scoreBeat,scoreFireLevel,fourCardFormation,scorePacketSymbol,scoreImpactScale,type ScoreBeat} from './scorePresentation';
import {ScoreFlame,orderScoreBrushLayers} from './ScoreFlame';
import {stageNotice,discardReferenceCopy} from './stageNotice';
import type {R2RunState as RunState,DomainEvent} from '../domain/run';
import {r2UsesAssist,R2_LIMITS,getR2Stage as getStage,r2ScoreContext,r2DiscardCost} from '../domain/r2Run';
import {r2ScoringDisabledJokerIds,type Accumulator,type ScoreTrace,type ScoreEvent} from '../domain/scoreR2';
import {Rational} from '../domain/rational';

import {usesAzaoCharge} from '../domain/r2AzaoCharge';
import {usesXiemuBurn,type XiemuBurnCost} from '../domain/r2XiemuBurn';
import {xiemuChoice,savedXiemuBurn} from './XiemuBurnCopy';
import {azaoChoice,savedAzaoCharge} from './AzaoChargeCopy';
import {characterForRun} from './CharacterRunCopy';
import { getCharacter, type CharacterId } from './characters';
import type { IntermissionResult } from './IntermissionScene';
import {addAvatar,avatarKey,portraitURL} from './portraits';
import {SceneView} from './SceneView';
import {HandSelectionInput} from './HandSelectionInput';
import {paintCardFeedback} from './CardFeedback';
import {HandSweepHint} from './HandSweepHint';
import type {HandSelectionUpdate} from './HandSelectionGesture';
import {DetailDialog} from './DetailDialog';
import {showDeckInspection} from './DeckInspector';
import {dispatchRun,runController} from './runAdapter';
import {reorderJokerIds} from './JokerReorder';
import {gameSession} from './session';
import type {RunMenuActions} from './RunMenu';
import {R2_BOSSES,r2BossText,r2DisabledCards} from '../domain/r2Chapter';
import {showConsumables} from './ConsumableDialog';
import {gameToolInventoryBox,toolInventoryLabel,toolInventoryPlayedArea,toolInventoryProgressY} from './ToolInventoryEntry';
import {fitScoreLine,scoreImpactCell,scoreFlightLanding} from './ScoreTextLayout';
import {SCORE_FONT,PAPER_THEME as T,PAPER_CSS as C,UI_FONT,P00_ASSETS,assetUrl} from './theme';
import {cardPipRowOffset} from './CardPipLayout';
import {scoreCells,scorePedestal,playedFootprint} from './layout';
import type {Box} from './layout';
import {jokerArtKey,jokerArtUrl,jokerArtPreviewUrl} from './jokerArt';
import {drawJokerMotif} from './JokerMotif';
import {R2_OFFER_USE,r2JokerStateText,r2JokerExtraHelp,r2ScoreOperationText,r2TransactionText} from './r2Help';
import {R2_TOOLS,R2_LONG_TERM_ITEMS} from '../content/r2Tools';
import {cardSpecialText,editionLabel,editionEffectText,toolInfo} from './r2ToolInfo';

import {mountHeroClimax,heroClimaxValue,type HeroClimaxView} from './HeroClimax';
import {cssViewport} from '../platform/Viewport';
type KeyCueCleanup=(()=>void)&{hero?:boolean;strike?:()=>void;release?:()=>Promise<void>};

const MAX_SELECTED = R2_LIMITS.maxSelected;

/** Each suit owns an enamel identity colour, not just red vs black. */
const SUIT_INK: Record<Suit,number> = {spades:0x27374d,hearts:0xb8473a,clubs:0x3f606b,diamonds:0xb8473a};
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
type HandPreview=R2SelectionFacts;

export class GameScene extends Phaser.Scene {
  private refillHidden=false;
  private get pendingTouye(){return usesTouyeWager(this.run)&&this.run.stage?.touyeWager?.resolution==='pending';}
  private get pendingRefill(){return this.run?.pendingRefill;}
  private get selectionLimit(){return this.pendingRefill?.required??MAX_SELECTED;}
  private reopenRefill():void {if(!this.pendingRefill)return;this.refillHidden=false;this.selectedIds.clear();this.statusMessage='';this.render();}
  private get deck(): string[] { return this.run.drawPile; }
  private get hand(): readonly PlayingCard[] { return this.presentation?.hand??this.toolHand??(this.pendingRefill&&!this.refillHidden?this.pendingRefill.candidateIds:this.run.handOrder).map(id => this.run.deckInstances.find(card => card.id === id)!); }
  private toolHand?:readonly PlayingCard[];
  private selectedIds = new Set<string>();
  private assistIds:string[]=[];
  private assistPage=0;
  private assistGestureStart?:string[];
  private readonly candidates=new R2HandCandidateCache();
  private readonly aiCandidates=new AiHandCandidateCache();
  private aiCursor?:AiHandCursor;
  private candidateGhost?:{key:string;facts:HandPreview;assistIds?:string[]};
  private candidateUndo?:{revision:string;ids:string[];assistIds?:string[]};
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
  private erxiangTargetId:string|null=null;
  private azaoRelease=false;
  private xiemuBurn:XiemuBurnCost=0;
  private readonly effects = new EffectQueue();
  private readonly audio = AudioEngine.shared;

  private view!:SceneView;
  private handInput?:HandSelectionInput;
  private readonly dialog=new DetailDialog();
  private focusIndex=0;
  private keyboardFocus=false;
  private readonly sweepHint=new HandSweepHint();
  private handHint=false;
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
  private aiButton!: Phaser.GameObjects.Rectangle;
  private inventoryButton?:Phaser.GameObjects.Rectangle;
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
  private displayedScoreProduct='0';
  private controlsLive=false;

  constructor() {
    super('game');
  }
  private heroClimax?:HeroClimaxView;
  preload():void {
    const xhr:Phaser.Types.Loader.XHRSettingsObject={responseType:'text',timeout:5000};this.load.maxRetries=0;
    queueCourtArtLoads(this);
    const hero=runController(this)?.state.characterId;if(hero&&!this.textures.exists('opening-portrait-'+hero))this.load.image('opening-portrait-'+hero,portraitURL(hero),{responseType:'blob',timeout:1800});
    for(const asset of P00_ASSETS)if(!this.textures.exists(asset.key))this.load.svg(asset.key,assetUrl(asset.path),{width:asset.width,height:asset.height},xhr);
  }
  private get reducedMotion():boolean {return gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;}

  async create(): Promise<void> {
    // Phaser reuses this Scene instance. Its former controls were destroyed on shutdown.
    this.controlsLive=false;this.candidates.dispose();this.aiCandidates.dispose();this.aiCursor=undefined;this.candidateGhost=undefined;this.candidateUndo=undefined;
    // Default Phaser lag smoothing turns every >500ms frame into only 33ms.
    // Keep committed score playback moving on slow renderers; bound background gaps to 1s.
    this.tweens.setLagSmooth(1000,1000);
    const lifecycle=++this.lifecycle;this.intent++;
    this.refillHidden=false;this.effects.clear();this.erxiangTargetId=null;this.azaoRelease=false;this.xiemuBurn=0;this.jokerViews.clear();this.cardViews=[];this.selectedIds.clear();this.assistIds=[];this.assistPage=0;this.assistGestureStart=undefined;this.hoveredCardId=undefined;this.hoveredJokerId=undefined;this.playing=false;this.presentation=undefined;this.toolHand=undefined;this.statusMessage='';this.focusIndex=0;this.keyboardFocus=false;this.handStart=0;this.handNavigationButtons=[];
    const settings=()=>{
      const hintVisible=!!this.handHint;this.stopHandHint();if(hintVisible&&this.reducedMotion)this.showHandHint(false);
      this.tweens.timeScale=gameSession().speed;this.time.timeScale=gameSession().speed;
      if(this.reducedMotion){
        if(this.toolHand){this.effects.clear();this.toolHand=undefined;this.render();}
        this.heroClimax?.reduce();this.stopJokerIdle();this.playAuraPulse?.remove();this.playAuraPulse=undefined;this.cameras.main.resetFX();
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
      this.candidates.dispose();this.aiCandidates.dispose();this.aiCursor=undefined;this.candidateGhost=undefined;this.candidateUndo=undefined;this.handInput?.destroy();this.handInput=undefined;this.assistIds=[];this.assistGestureStart=undefined;this.controlsLive=false;this.stopScoreFire();
      if(this.registry.get('runMenuActions')===this.menuActions)this.registry.remove('runMenuActions');
      this.menuActions=undefined;
      this.lifecycle++;this.intent++;this.effects.clear();this.audio.cancelPresentation();this.stopJokerIdle();this.tweens.killAll();this.time.removeAllEvents();this.jokerViews.clear();this.settledCards.clear();this.cardViews=[];this.selectedIds.clear();this.assistIds=[];this.assistPage=0;this.assistGestureStart=undefined;this.hoveredCardId=undefined;this.hoveredJokerId=undefined;this.jokerHoverPreview=undefined;this.previewCards=undefined;this.presentation=undefined;this.playAuraPulse=undefined;this.playing=false;this.rollingHeat=false;this.dialog.close();
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
    if(!['await-input','pending-refill'].includes(this.run.phase)||!this.run.stage){this.scene.start('character-select');return;}
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
      ready:()=>this.ready&&!this.refillHidden,selectionLimit:()=>this.selectionLimit,cards:()=>this.hand.map((card,i)=>({id:card.id,...this.view.layout.cards[i].hit,visible:this.view.layout.cards[i].visible})),selected:()=>this.selectedIds,
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
    const v=this.view,l=v.layout;this.hoveredCardId=undefined;this.hoveredJokerId=undefined;this.jokerHoverPreview=undefined;v.clear();this.handNavigationButtons=[];v.paperBackground();drawStageTableArt(this,v,this.characterId);this.settledCards.clear();this.previewCards=undefined;
    this.stopJokerIdle();
    this.playAuraPulse?.remove();this.playAuraPulse=undefined;this.playAura=undefined;
    if(this.progressBar)this.tweens.killTweensOf(this.progressBar);this.progressTarget=Number.NaN;
    const h=l.hud,c=getCharacter(this.characterId),portrait=l.mode==='portrait',short=l.mode==='landscape';
    if(!portrait)v.add(this.add.graphics().lineStyle(1,T.jade,.22).lineBetween(h.x+h.width+8,h.y,h.x+h.width+8,h.y+h.height));

    const avatarSize=portrait?30:44,avatarY=h.y+(portrait?6:short?34:42);
    this.roleAvatar=v.add(this.add.container(h.x+12+avatarSize/2,avatarY+avatarSize/2)).setData('baseY',avatarY+avatarSize/2);
    addAvatar(this,this.roleAvatar,c,0,0,avatarSize);
    {const hit=v.add(this.add.rectangle(h.x+12+avatarSize/2,avatarY+avatarSize/2,Math.max(44,avatarSize+8),Math.max(44,avatarSize+8),0,0));v.target(hit,usesErxiangHandoff(this.run)?'hero/erxiang-handoff':usesTouyeWager(this.run)?'hero/touye-wager':usesLaohuanRefill(this.run)?'hero/laohuan-trick':usesXiemuBurn(this.run)?'hero/xiemu-burn':usesAzaoCharge(this.run)?'hero/azao-charge':'hero/details',{tap:()=>this.inspectRole(),detail:()=>this.inspectRole()});}
    this.roleFrame=this.add.rectangle(0,0,avatarSize+4,avatarSize+4,T.brass).setFillStyle(T.brass,0).setStrokeStyle(1,T.brass,.6);this.roleAvatar.add(this.roleFrame);
    const bossName=r2BossText(this.run.boss).split('：')[0];
    if(!portrait)v.text(h.x+12,h.y+8,this.run.tourMode==='endless'?'无尽巡演':'大 丑 牌',short?20:28,C.paper);
    if(!portrait||!usesErxiangHandoff(this.run)&&!usesAzaoCharge(this.run)&&!usesXiemuBurn(this.run)&&!usesLaohuanRefill(this.run)&&!usesTouyeWager(this.run))v.text(h.x+(portrait?64:76),avatarY,(portrait&&this.run.tourMode==='endless'?'无尽 · ':'')+c.name,portrait?18:short?20:22,C.paper,portrait?h.width-160:h.width-88);
    this.roleText=v.text(h.x+(portrait?64:76),avatarY+(portrait?23:28),this.roleCaption(),14,C.mutedInk,portrait?h.width-160:h.width-88);
    if(!portrait&&!l.shortLandscape)v.text(h.x+12,h.y+(short?96:96),this.stage.index%3===2?'压轴 · '+bossName:this.stage.name,14,C.paper,h.width-24);
    this.heatText=v.text(h.x+12,h.y+(portrait?27:l.shortLandscape?94:short?108:118),'',portrait?20:short?28:24,C.paper,h.width-24).setFontStyle('bold');
    const goldY=h.y+(portrait?31:l.shortLandscape?11:180);
    this.goldText=l.shortLandscape?v.text(h.x+h.width-12,goldY,'',14,C.brass).setOrigin(1,0):v.text(h.x+12,goldY,'',14,C.brass,h.width-24);
    if(!portrait){

      v.text(h.x+12,h.y+(l.shortLandscape?130:short?146:156),'目标 '+heatText(this.stage.targetHeat),14,C.jade,h.width-24).setName('hud/target');
      const progressY=toolInventoryProgressY(l,h.y+(l.shortLandscape?152:short?168:238));v.rect({x:h.x+12,y:progressY,width:h.width-24,height:5},0x45595b).setStrokeStyle();
      this.progressBar=v.rect({x:h.x+12,y:progressY,width:1,height:5},T.jade).setOrigin(0,.5).setPosition(h.x+12,progressY+2.5).setStrokeStyle();
    }
    if(portrait){this.roleText.setVisible(false);this.goldText.setFontSize(14).setOrigin(0,0).setPosition(h.x+144,h.y+6);this.heatText.setPosition(h.x+64,h.y+28).setFontSize(16).setWordWrapWidth(h.width-168);}
    if(usesErxiangHandoff(this.run)||usesAzaoCharge(this.run)||usesXiemuBurn(this.run)||usesLaohuanRefill(this.run)||usesTouyeWager(this.run)){
      if(portrait){this.roleText.setVisible(true).setPosition(h.x+64,avatarY).setFontSize(13).setColor(C.jade).setWordWrapWidth(108);this.goldText.setPosition(h.x+166,h.y+6).setFontSize(12);}
      const hit=v.add(this.add.rectangle(this.roleText.x+54,this.roleText.y+9,108,30,0,0));v.target(hit,usesErxiangHandoff(this.run)?'hero/erxiang-handoff-label':usesTouyeWager(this.run)?'hero/touye-wager-label':usesLaohuanRefill(this.run)?'hero/laohuan-trick-label':usesXiemuBurn(this.run)?'hero/xiemu-burn-label':'hero/azao-charge-label',{tap:()=>this.inspectRole(),detail:()=>this.inspectRole()});
    }
    this.renderJokerRack();
    const s=l.scoreBoard;
    v.material(s,T.paperLight,T.paperLight,4).setName('score/board-paper');
    v.add(this.add.graphics().lineStyle(1,T.ink,.26).strokeRoundedRect(s.x,s.y,s.width,s.height,4)).setName('score/board-border');
    this.resultText=v.text(s.x+8,s.y+6,'选牌，准备开演',17,C.ink).setName('score/source');
    const pedestal=scorePedestal(s);
    if(pedestal){
      const base=this.add.graphics().setName('score/total-pedestal').setData('bounds',pedestal);
      base.fillStyle(T.ink,.08).fillRoundedRect(pedestal.x,pedestal.y+2,pedestal.width,pedestal.height,5);
      base.fillStyle(0xfff9ee,1).fillRoundedRect(pedestal.x,pedestal.y,pedestal.width,pedestal.height,5);
      base.lineStyle(1,0xb8473a,.55).strokeRoundedRect(pedestal.x,pedestal.y,pedestal.width,pedestal.height,5);v.add(base);
    }
    this.scoreLabels=['热度','倍率','本手得分'].map(label=>v.text(0,0,label,14,C.mutedInk).setOrigin(.5,0));
    this.scoreHeat=v.text(0,0,'—',26,C.jade).setOrigin(.5,0).setName('score/heat');
    this.scoreMult=v.text(0,0,'—',26,C.red).setOrigin(.5,0).setName('score/multiplier');
    this.scoreTotal=v.text(0,0,'—',44,C.ink).setOrigin(.5,0).setName('score/total');
    this.breakdownText=v.text(0,0,'',14,C.mutedInk).setVisible(false);
    this.fitScoreReadouts();
    const p=playedFootprint(toolInventoryPlayedArea(l),portrait);
    v.rect(p,T.paperLight).setFillStyle(0,0).setStrokeStyle(1,T.jade,.22).setName('table/played-workplane');
    const caption=playedCaptionBox(l,p);if(caption)v.text(caption.x,caption.y,'待出牌',14,C.jade).setName('table/played-label');
    this.previousHandText=v.text(portrait?p.x+10:h.x+12,portrait?p.y+p.height-20:h.y+(short?301:510),'',14,portrait?'#eddfbf':C.brass,portrait?p.width-20:h.width-24).setVisible(!portrait&&!l.shortLandscape);
    this.handCountText=v.text(l.handLabel.x,l.handLabel.y,'',14,'#f0e6cb').setVisible(!portrait&&l.labelHeight>0);
    this.pileText=v.text(l.piles.x+l.piles.width,l.piles.y,'',14,'#c8d4c7').setOrigin(1,0).setVisible(!portrait&&l.labelHeight>0);
    const brief=portrait||l.shortLandscape||l.buttons.rank.width<80;
    const sort=l.tools;
    const sortArt=this.add.graphics().fillStyle(T.jadeSoft).fillRoundedRect(sort.x,sort.y,sort.width,sort.height,6).lineStyle(1,T.jade,.9).strokeRoundedRect(sort.x+.5,sort.y+.5,sort.width-1,sort.height-1,6).lineStyle(1,T.jade,.35);
    if(sort.height>sort.width){for(const offset of [52,108])sortArt.beginPath().moveTo(sort.x+8,sort.y+offset).lineTo(sort.x+sort.width-8,sort.y+offset).strokePath();}else for(const offset of [44,88])sortArt.beginPath().moveTo(sort.x+offset,sort.y+10).lineTo(sort.x+offset,sort.y+sort.height-10).strokePath();
    v.add(sortArt.setName('action/sort-group').setData('bounds',sort));
    this.rankButton=v.button(l.buttons.rank,brief?'点数':'点数排序','action/sort-rank',()=>void this.sortHand('rank'),this.ready,false,'sort');
    this.suitButton=v.button(l.buttons.suit,brief?'花色':'花色排序','action/sort-suit',()=>void this.sortHand('suit'),this.ready,false,'sort');
    this.aiButton=v.button(l.buttons.ai,this.assistProfile?'AI\n主手':'AI 切','selection/switch-type',()=>this.switchHandType(),false,false,'sort');
    for(const button of [this.rankButton,this.suitButton,this.aiButton])(button.getData('label') as Phaser.GameObjects.Text).setFontSize(14);
    this.discardButton=v.button(l.tableActions.discard,'弃牌','action/discard',()=>void this.discardSelected(),this.ready&&this.selectedIds.size>0&&this.run.stage!.discardsLeft>=r2DiscardCost(this.run),false,'discard');
    this.playButton=v.button(l.tableActions.play,'出牌','action/play',()=>void this.playSelected(),this.ready&&this.selectedIds.size>0&&this.handsLeft>0,true,'play');
    this.resourceCounts={} as Record<'play'|'discard',Phaser.GameObjects.Text>;
    for(const kind of ['play','discard'] as const){
      const b=l.tableActions[kind],button=kind==='play'?this.playButton:this.discardButton;
      const content=handActionContent(b);
      const label=button.getData('label') as Phaser.GameObjects.Text;
      label.setFontSize(kind==='play'?16:14).setPosition(content.centerX,content.labelY).setData('restY',content.labelY);
      this.resourceCounts[kind]=v.text(content.centerX,content.countY,'',14,kind==='play'?C.paperLight:C.jade).setOrigin(.5).setName('button/'+kind+'-left');
    }
    const play=l.tableActions.play;
    this.playAura=v.add(this.add.graphics().lineStyle(2,T.red,.7).strokeRoundedRect(play.x-3,play.y-3,play.width+6,play.height+6,9).setAlpha(0));
    this.statusText=v.text(l.status.x,l.status.y,'',14,'#f3d5ab',l.status.width);
    this.inventoryButton=v.button(gameToolInventoryBox(l),toolInventoryLabel(this.run),'action/tool-inventory',()=>showConsumables(this.dialog,this.run,this.ready&&!this.pendingRefill&&!this.pendingTouye,(a,seq)=>this.command(a,seq)));
    inventoryFeedback(this,this.inventoryButton,this.run,this.ready,this.reducedMotion);
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
    const disabled=new Set(r2ScoringDisabledJokerIds(boss,jokers,this.jokerDefinitions,context?.sealedJokerIds??this.run.stage?.sealedJokerIds??[],context?.challengeDisabledJokerId??this.run.stage?.challengeDisabledJokerId??null));
    this.stopJokerIdle();
    l.slots.forEach((b,i)=>{
      if(i>=r2JokerCapacity(this.run))return;
      const j=jokers[i],shadow=v.add(this.add.graphics());
      shadow.fillStyle(T.ink,.08).fillRoundedRect(b.x+1,b.y+3,b.width,b.height,5);
      if(!j){
        v.material(b,T.paperLight,T.paperLight,5);
        if(this.textures.exists('p00-card-back')){
          v.add(this.add.image(b.x+b.width/2,b.y+b.height/2,'p00-card-back').setDisplaySize(b.width-6,b.height-6).setAlpha(.18));
        }
        v.add(this.add.graphics().lineStyle(1,0x8da498,.5).strokeRoundedRect(b.x,b.y,b.width,b.height,6));
        return;
      }
      const d=this.jokerDefinition(j.definitionId),rarityStyle=JOKER_RARITY[d.rarity],sideLabels=l.mode==='landscape',labelBox=l.jokerLabels[i];
      const marker=v.add(this.add.container(b.x+b.width/2,b.y+b.height/2)).setData('baseX',b.x+b.width/2).setData('baseY',b.y+b.height/2);
      const route=routeFitCue(this.run,'jokers',j.definitionId,j.instanceId);const r=this.add.rectangle(0,0,b.width,b.height,T.paperLight).setStrokeStyle(1,T.ink,.5);
      marker.add(r);if(route)marker.add(routeFrame(this,{x:-b.width/2,y:-b.height/2,width:b.width,height:b.height},route,d.rarity==='rare').setName('held/route-fit'));
      const resolution=Math.max(1.5,1/this.scale.zoom),labelX=sideLabels?labelBox.x-b.x-b.width/2:-b.width/2+3;
      const name=this.add.text(labelX,-b.height/2+1,d.name,{fontFamily:UI_FONT,fontSize:'14px',color:C.ink,resolution});
      const current=this.add.text(labelX,b.height/2-16,disabled.has(j.instanceId)?'封禁':this.jokerValue(j),{fontFamily:UI_FONT,fontSize:'14px',color:C.red,resolution});
      const room=jokerLabelRoom(l,i);
      name.setData('fullText',name.text);let nameCopy=name.text;while(name.width>room&&nameCopy.length){nameCopy=nameCopy.slice(0,-1);name.setText(nameCopy+'…');}
      this.fitOwnedJokerLabel(current,j,i);
      const artTop=-b.height/2+18,artHeight=Math.max(8,b.height-35),key=jokerArtKey(j.definitionId);
      if(key&&this.textures.exists(key)){
        const art=this.add.container(0,artTop+artHeight/2),artWidth=Math.min(b.width-6,artHeight*.8);
        if(j.definitionId==='f09'){mountF09Art(this,art,artWidth,artWidth/.8,()=>this.reducedMotion,key,jokerArtAlignedLayers(j.definitionId));marker.setData('f09-art',art);}
        else{const image=this.add.image(0,0,key);image.setScale(Math.min((b.width-6)/image.width,artHeight/image.height));art.add(image);}
        art.setData('f09-active',(this.run.stage?.discardsUsed??0)===0&&!disabled.has(j.instanceId)).setData('f09-sealed',disabled.has(j.instanceId));marker.add(art);
      }else this.jokerMechanism(marker,0,artTop+artHeight/2,Math.min(b.width-8,artHeight),j);
      // A small rarity symbol stays separate from the name/state; full rarity is in details.
      marker.add(createJokerRarityBadge(this,d.rarity,{x:b.width/2-31,y:artTop+artHeight-18,compact:true,resolution}).setData('definitionId',d.id).setData('surface','table'));
      current.setBackgroundColor(C.paperLight);marker.add([name,current]).setData('frame',r).setData('frameColor',disabled.has(j.instanceId)?T.red:rarityStyle.edge).setData('nameLabel',name).setData('valueLabel',current).setData('slotIndex',i);
      if(disabled.has(j.instanceId)){r.setStrokeStyle(2,T.red);marker.setData('bossDisabled',true);}
      this.jokerViews.set(j.instanceId,marker);
      this.armJokerIdle(marker,i);
      const hit=v.rect({x:b.x,y:b.y,width:b.width+(sideLabels?labelBox.width+6:0),height:b.height},T.ink).setFillStyle(T.ink,.001).setStrokeStyle();marker.setData('hit',hit);
      v.target(hit,'joker/'+j.instanceId,{tap:()=>this.inspectJoker(j.instanceId),detail:()=>this.inspectJoker(j.instanceId),drag:x=>void this.reorderJoker(j.instanceId,x),holdToDrag:true,enter:()=>this.hoverJoker(j.instanceId,true),leave:()=>this.hoverJoker(j.instanceId,false)});
    });
  }
  private jokerMechanism(marker:Phaser.GameObjects.Container,x:number,y:number,size:number,joker:R2JokerInstance):void {
    drawJokerMotif(this,marker,joker.definitionId,x,y,size,this.jokerDefinition(joker.definitionId));
  }
  private jokerRestriction(j:R2JokerInstance):string|undefined {
    const score=this.presentation?.score,context=score?.bossContext;
    if(score&&context)return r2ScoringDisabledJokerIds(context.boss,score.sourceJokers,this.jokerDefinitions,context.sealedJokerIds,context.challengeDisabledJokerId).includes(j.instanceId)?'本手计分与版次停用；静态规则与其他阶段效果另按条件执行':undefined;
    const notice=stageNotice(this.run);return notice?.disabledJokerIds.includes(j.instanceId)?'当前计分与版次停用：'+notice.title+'；静态规则与其他阶段效果另按条件执行':undefined;
  }
  private memoryContext(j:R2JokerInstance,facts?:HandPreview){const ctx=publicJokerMemoryContext(this.run,{hand:this.hand,facts,scoringLimited:!!this.jokerRestriction(j),deckSize:this.run.deckInstances.length-this.run.destroyedIds.length,jokerSlots:r2JokerCapacity(this.run),jokerCount:this.run.jokers.length});return this.presentation?recordedJokerMemoryContext(ctx,this.presentation.score.bossContext):ctx;}
  private jokerAbility(j:R2JokerInstance,preview?:HandPreview) {
    const source=this.presentation?.score.sourceJokers.find(source=>source.instanceId===j.instanceId)??j;
    return jokerAbilityCopyForRun(this.run,j.definitionId,source,this.memoryContext(source,preview),this.presentation?.score.events);
  }
  private jokerValue(j:R2JokerInstance,preview?:HandPreview):string {
    if(!this.presentation)return jokerMemory(this.jokerDefinition(j.definitionId),j,this.memoryContext(j,preview)).short;
    return this.jokerAbility(j,preview).compact;
  }
  private fitOwnedJokerLabel(label:Phaser.GameObjects.Text,j:R2JokerInstance,index:number,preview?:HandPreview):void {
    const room=jokerLabelRoom(this.view.layout,index),fits=(text:string)=>{label.setText(text);return label.width<=room;};
    if(this.presentation){const full=label.text;label.setData('fullText',full).setData('labelRoom',room).setText(fitConditionEntry(full,fits,true));return;}
    const memory=jokerMemory(this.jokerDefinition(j.definitionId),j,this.memoryContext(j,preview));
    const limited=!!this.jokerRestriction(j),candidates=limited?['计分停用','停用 ›']:memory.labelCandidates;
    label.setData('fullText',candidates[0]).setData('mechanismCandidates',memory.labelCandidates).setData('labelRoom',room)
      .setText(fitJokerLabel(candidates,fits,limited||memory.stateLabel));
  }
  private refreshJokerLabels(preview?:HandPreview):void {
    for(const joker of this.run.jokers){const view=this.jokerViews.get(joker.instanceId),label=view?.getData('valueLabel') as Phaser.GameObjects.Text|undefined;
      label?.setText(view?.getData('bossDisabled')?(this.view.layout.mode==='landscape'?'计分封禁':'封禁'):this.jokerValue(joker,preview));
      if(label)this.fitOwnedJokerLabel(label,joker,Number(view?.getData('slotIndex')),preview);
      const readiness=selectionExperience(this.run,joker,this.memoryContext(joker,preview));
      view?.setData('selectionReadiness',readiness.readiness).setData('selectionLabel',readiness.label);
      const frame=view?.getData('frame') as Phaser.GameObjects.Rectangle|undefined;
      frame?.setStrokeStyle(preview?2:1,readiness.readiness==='limited'?T.red:preview&&readiness.readiness==='ready'?T.brass:preview&&readiness.readiness==='pending'?T.jade:Number(view?.getData('frameColor')),.9);
      if(label&&preview&&!view?.getData('bossDisabled')){label.setData('savedLabel',label.text);const room=jokerLabelRoom(this.view.layout,Number(view?.getData('slotIndex')));label.setText(fitConditionEntry(readiness.label,text=>{label.setText(text);return label.width<=room;},true));}
      const starter=starterSelection(this.run,joker.instanceId,preview?.type,!!this.jokerRestriction(joker));
      if(starter){view?.setData('starterReady',starter.ready).setData('starterLabel',starter.label);frame?.setStrokeStyle(starter.ready?3:2,starter.ready?T.red:T.jade,.95);if(label){const room=jokerLabelRoom(this.view.layout,Number(view?.getData('slotIndex')));label.setText(fitConditionEntry(starter.label,text=>{label.setText(text);return label.width<=room;},true));}}
      const art=view?.getData('f09-art') as Phaser.GameObjects.Container|undefined;art?.setData('f09-active',!view?.getData('bossDisabled')&&(this.run.stage?.discardsUsed??0)===0);
    }
  }
  private roleCaption():string {const notice=stageNotice(this.run);return usesErxiangHandoff(this.run)?erxiangChoice(this.run).compact:usesTouyeWager(this.run)?touyeChoice(this.run).compact:usesLaohuanRefill(this.run)?this.pendingRefill?'老幻·选补牌↗':!r2RunModeConfig(this.run).characterAbilityEnabled?'老幻·戏法停用':this.run.stage?.laohuanTrickUsed?'老幻·戏法已用':'老幻·戏法弃↗':usesXiemuBurn(this.run)?xiemuChoice(this.run).compact:usesAzaoCharge(this.run)?azaoChoice(this.run).compact:notice?.warning?notice.title:characterForRun(this.run).passiveName;}
  private cardPiece(card:PlayingCard,b:Box):CardView {
    const c=this.view.add(this.add.container(b.x+b.width/2,b.y+b.height/2)).setData('width',b.width).setData('height',b.height).setData('cardFace',true).setData('cardId',card.id);
    const radius=Math.min(7,b.width*.09),shadow=this.add.graphics(),edgeGlow=this.add.graphics();
    shadow.fillStyle(T.ink,.07).fillRoundedRect(-b.width/2+1,-b.height/2+3,b.width,b.height,radius);
    edgeGlow.setName('card/feedback').lineStyle(3,T.focus,.9).strokeRoundedRect(-b.width/2-1,-b.height/2-1,b.width+2,b.height+2,radius).setAlpha(0);
    const bg=this.add.rectangle(0,0,b.width,b.height,T.paper).setStrokeStyle(1,T.brass);
    const face=this.view.material({x:-b.width/2+1,y:-b.height/2+1,width:b.width-2,height:b.height-2},0xfff8e8,0xe8d6b9,radius).setAlpha(.72);
    c.add([shadow,edgeGlow,bg,face]);
    const edgeLines=this.add.graphics();
    edgeLines.lineStyle(1,T.ink,.08).strokeRoundedRect(-b.width/2+2,-b.height/2+2,b.width-4,b.height-4,radius-1);
    edgeLines.lineStyle(1,T.ink,.18).beginPath().moveTo(-b.width/2+5,b.height/2-3).lineTo(b.width/2-5,b.height/2-3).strokePath();
    const faceGlow=this.add.graphics().fillStyle(0xffedb6,.28).fillRoundedRect(-b.width/2+2,-b.height/2+2,b.width-4,b.height-4,radius).lineStyle(3,0xffe7a2,.95).strokeRoundedRect(-b.width/2+3,-b.height/2+3,b.width-6,b.height-6,radius-1).setAlpha(0);
    faceGlow.lineStyle(1,0xfffbdf,.85);for(let i=0;i<3;i++)faceGlow.beginPath().moveTo(-b.width*.3,-b.height*.3+i*4).lineTo(b.width*.28,-b.height*.15+i*4).strokePath();
    c.add([edgeLines,faceGlow]);

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
        const rows=new Map<number,Phaser.GameObjects.Text[]>();
        for(const [ux,uy] of PIP_LAYOUTS[card.rank]??[]){
          const pip=this.add.text(ux*pipWidth,uy*b.height*.72,SUIT_SYMBOL[card.suit],{fontFamily:'Georgia,serif',fontSize:`${pipSize}px`,color:ink,resolution}).setOrigin(.5).setName('card-pip');
          if(uy>0)pip.setAngle(180);
          const row=rows.get(uy)??[];row.push(pip);rows.set(uy,row);
          faceArt.push(pip);
        }
        for(const row of rows.values()){
          const offset=cardPipRowOffset(label.getBounds(),row.map(p=>p.getBounds()));
          for(const pip of row)pip.x+=offset;
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
      // Reviewed J/Q/K are independent full illustrations; indices/suits remain programmatic.
      const key=courtArtKey(card.rank);
      const fw=Math.min(b.width*.62,b.width-2*(label.width+edge+4)),fh=b.height*.6,fy=b.height*.02,frame=this.add.graphics();
      frame.fillStyle(T.paperEdge,1).fillRoundedRect(-fw/2,fy-fh/2,fw,fh,4);
      frame.lineStyle(1,T.jade,1).strokeRoundedRect(-fw/2,fy-fh/2,fw,fh,4);
      frame.lineStyle(1,0xfff3d6,.8).strokeRoundedRect(-fw/2+3,fy-fh/2+3,fw-6,fh-6,3);
      faceArt.push(frame);
      if(key&&this.textures.exists(key)){
        const source=this.textures.get(key).getSourceImage() as HTMLImageElement;
        faceArt.push(this.add.image(0,fy,key).setScale(Math.min((fw-2)/source.width,(fh-2)/source.height)));
      }else faceArt.push(this.add.text(0,fy,SUIT_SYMBOL[card.suit],{fontFamily:'Georgia,serif',fontSize:`${Math.min(b.width*.4,b.height*.28)}px`,color:ink,resolution}).setOrigin(.5));

    }
    const scoringMark=this.add.text(-b.width/2+edge,b.height/2-21,'★',{fontFamily:UI_FONT,fontSize:'14px',fontStyle:'bold',color:C.jade,resolution}).setVisible(false);
    c.add([...faceArt,label,corner,scoringMark]);
    const selectionMark=this.add.text(-b.width/2+edge+9,-b.height/2+edge+label.height+11,'✓',{fontFamily:UI_FONT,fontSize:'14px',fontStyle:'bold',color:C.ink,backgroundColor:C.jadeSoft,padding:{x:4,y:1},resolution}).setOrigin(.5).setVisible(false);c.add(selectionMark);
    if(card.enhancement){
      const enhancement=ENHANCEMENT_UI[card.enhancement],bx=0,by=b.height/2-36,bw=Math.min(52,b.width-8);
      const badge=this.add.graphics().fillStyle(enhancement.ink).fillRoundedRect(bx-bw/2,by-10,bw,20,4).lineStyle(1,0xffe4ad).strokeRoundedRect(bx-bw/2,by-10,bw,20,4);
      c.add([badge,this.add.text(bx,by,ENHANCEMENT_BRIEF[card.enhancement],{fontFamily:UI_FONT,fontSize:'14px',color:'#fff8e5',resolution}).setOrigin(.5)]);
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
    const visibleSeats=l.cards.filter(card=>card.visible),left=Math.min(...visibleSeats.map(card=>card.hit.x)),right=Math.max(...visibleSeats.map(card=>card.hit.x+card.hit.width));
    this.handInput?.setBounds(visibleSeats.length?{x:left,y:l.hand.y,width:right-left,height:l.hand.height}:undefined,l.handRows>1);
  }
  private scrollHand(delta:number):void {if(!this.ready)return;const l=this.view.layout,next=Math.max(0,Math.min(this.hand.length-l.visibleCardCount,l.handStart+delta));if(next===this.handStart)return;this.handStart=next;this.renderHand();}
  private showFocusedCard():void {const l=this.view.layout;if(this.focusIndex>=l.handStart&&this.focusIndex<l.handStart+l.visibleCardCount)return;this.handStart=this.focusIndex<l.handStart?this.focusIndex:this.focusIndex-l.visibleCardCount+1;if(!this.playing)this.renderHand();}
  private updateHandCount():void {
    const l=this.view.layout,limit=this.run.stage!.handLimit;
    const portraitWindow=l.mode==='portrait'&&l.handOverflow;
    this.handCountText.setText('手牌 '+this.run.handOrder.length+' / '+limit+(l.handOverflow?(portraitWindow?'\n':' · ')+(l.handStart+1)+'–'+(l.handStart+l.visibleCardCount):'')).setVisible((l.mode!=='portrait'&&l.labelHeight>0)||l.handOverflow);
    // The vacated bottom sorting seat keeps window counts clear of lifted cards.
    this.handCountText.setPosition(portraitWindow?l.actions.x+2:l.mode==='portrait'?l.hand.x+48:l.handLabel.x,portraitWindow?l.actions.y+(l.actions.height-this.handCountText.height)/2:l.mode==='portrait'?l.hand.y+2:l.handLabel.y);
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
    const selected=this.selectedIds.has(view.card.id)||this.assistIds.includes(view.card.id),hovered=this.hoveredCardId===view.card.id;
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
    const x=Phaser.Math.Clamp(slot.x+slot.width/2-width/2,l.preview.x,l.preview.x+l.preview.width-width),d=this.jokerDefinition(j.definitionId);
    const panel=this.view.add(this.add.container(x,top));this.jokerHoverPreview=panel;
    const g=this.add.graphics().fillStyle(0x071e29,.65).fillRoundedRect(3,7,width,height,9).fillStyle(0xf4e8d3).fillRoundedRect(0,0,width,height,9).lineStyle(1,0xd0af72).strokeRoundedRect(0,0,width,height,9);
    const size=Math.min(168,height-24,width*.44),key=jokerArtKey(j.definitionId);panel.add(g);
    if(key&&this.textures.exists(key)){
      const image=this.add.image(12+size/2,12+size/2,key);image.setScale(Math.min(size/image.width,size/image.height));panel.add(image);
    }
    else drawJokerMotif(this,panel,j.definitionId,12+size/2,12+size/2,size,this.jokerDefinition(j.definitionId));
    panel.add(createJokerRarityBadge(this,d.rarity,{x:12+size-61,y:12+size-25,resolution:1.5}).setData('definitionId',d.id).setData('surface','hover'));
    const tx=24+size,tw=width-tx-12,style={fontFamily:UI_FONT,resolution:1.5,wordWrap:{width:tw,useAdvancedWrap:true}};
    panel.add(this.add.text(tx,14,d.name,{...style,fontSize:'20px',fontStyle:'bold',color:'#203744'}));
    const copy=this.jokerAbility(j,this.selectionPreview());
    panel.add(this.add.text(tx,46,copy?.compact??this.jokerValue(j),{...style,fontSize:'20px',fontStyle:'bold',color:'#a14b38'}));
    const summary=this.add.text(tx,80,copy?.plain?.line??copy?.summary??d.description,{...style,fontSize:'14px',color:'#314a50'}).setLineSpacing(3).setName('joker/hover-purpose'),full=summary.text;
    if(summary.height>height-118||summary.width>tw)summary.setText('条件与效果\n点击查看');summary.setData('fullText',full).setData('availableWidth',tw).setData('availableHeight',height-118);panel.add(summary);
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
    if(!this.presentation&&!this.playing&&this.run.phase==='await-input'){this.validateAssistSelection();this.ensureCandidates();}
    const preview=this.selectionPreview();
    if(usesErxiangHandoff(this.run)&&!this.presentation&&!this.playing&&this.erxiangTargetId&&!erxiangChoice(this.run,preview,this.erxiangTargetId).selected)this.erxiangTargetId=null;
    const active=this.presentation?.score.sets.activeScoringIds??preview?.activeScoringIds??[];
    const disabledIds=r2DisabledCards(this.run.boss,this.stage.index,this.hand),suppressed=this.presentation?.score.events.filter(e=>e.operation==='ordinary-points-suppressed').map(e=>e.targetCardId)??r2ScoreContext(this.run,this.hand,[...this.selectedIds]).ordinaryPointsSuppressedIds;
    this.cardViews.forEach((v,i)=>{
      const selected=this.selectedIds.has(v.card.id),scoring=active.includes(v.card.id);
      v.container.setData('selected',selected).setData('activeScoring',scoring);
      const assisted=(this.presentation?.score.sets.assistConsumedIds??this.assistIds).includes(v.card.id);
      v.selectionMark?.setText(assisted?'助':this.erxiangTargetId===v.card.id?'交':this.assistProfile?'主':'✓').setVisible(selected||assisted);
      if(this.assistProfile&&v.selectionMark)v.selectionMark.setPosition(-Number(v.container.getData('width'))/2+12,Number(v.container.getData('height'))/2+10).setBackgroundColor(assisted?C.paperLight:C.jadeSoft).setName('selection/draft-role').setData('cardId',v.card.id);
      const disabled=disabledIds.includes(v.card.id),pointsZero=suppressed.includes(v.card.id);v.background.setFillStyle(disabled?0xd2d0cb:T.paper);
      this.restingCard(v,i,animateId===v.card.id);
      if(assisted)v.background.setStrokeStyle(3,T.brass);
      v.scoringMark.setText(disabled?'失效':pointsZero?'点数0':'★').setVisible(disabled||pointsZero||scoring);
      if(v.hit)v.hit.input!.enabled=this.ready&&!this.refillHidden&&this.view.layout.cards[i].visible;
    });
    this.orderSelectedCards();
    if(!this.presentation){this.refreshJokerLabels(preview);this.previewSelection(preview);this.renderSelectedCards(preview);}
    this.updateControls();
  }
  private landingBoxes(count:number,reserved=0):Box[] {
    const area=toolInventoryPlayedArea(this.view.layout),p={...area,y:area.y+reserved,height:area.height-reserved},bottomNote=0,h=Math.max(24,p.height-bottomNote-14),gap=8;
    const width=Math.min(this.view.layout.mode==='portrait'?52:96,h/1.4,(p.width-24-gap*(count-1))/Math.max(count,1)),height=width*1.4,total=count*width+(count-1)*gap;
    return Array.from({length:count},(_,i)=>({x:p.x+(p.width-total)/2+i*(width+gap),y:p.y+(p.height-bottomNote-height)/2,width,height}));
  }
  private renderSelectedCards(preview?:HandPreview):void {
    this.previewCards?.destroy();this.previewCards=this.view.add(this.add.container(0,0));this.resultText.setVisible(true);(this.view.root.list.find(o=>o.name==='table/played-label') as Phaser.GameObjects.Text|undefined)?.setText('待出牌');const p=toolInventoryPlayedArea(this.view.layout);
    if(this.pendingRefill){const pending=this.pendingRefill,held=this.run.handOrder.map(id=>this.run.deckInstances.find(c=>c.id===id)!).map(c=>rankLabel(c.rank)+SUIT_SYMBOL[c.suit]).join(' '),score=this.view.layout.scoreBoard;
      (this.view.root.list.find(o=>o.name==='table/played-label') as Phaser.GameObjects.Text|undefined)?.setText('戏法补牌');this.resultText.setVisible(false);
      const text=this.add.text(p.x+p.width/2,p.y+p.height/2,this.refillHidden?'候选已收起 · 点英雄继续选择':`留 ${pending.required} 张 · 已选 ${this.selectedIds.size} / ${pending.required}\n确认后其余 ${pending.candidateIds.length-pending.required} 张进已用区`,{fontFamily:UI_FONT,fontSize:'16px',color:C.jade,align:'center',wordWrap:{width:p.width-16,useAdvancedWrap:true}}).setOrigin(.5).setName('refill/instruction');this.previewCards.add(text);
      const note=this.add.text(score.x+10,score.y+28,'原保留：'+held,{fontFamily:UI_FONT,fontSize:'14px',color:C.mutedInk,wordWrap:{width:score.width-20,useAdvancedWrap:true}}).setName('refill/held');this.previewCards.add(note);return;}
    if(this.assistProfile){const growth=!preview&&p.height>=94&&p.width>=250?buildGrowthProgress(this.run)[0]:undefined,payoffs=growth?growthPayoffs(this.run):[],payoff=payoffs.find(p=>p.change!=='same')??payoffs[0];const shown=payoff&&showGrowthPayoff(this.view,this,this.previewCards,p,payoff)||growth&&showBuildGrowth(this.view,this,this.previewCards,p,growth);this.renderAssistSelection(preview,p,!!shown);return;}
    if(!preview){
      const notice=stageNotice(this.run),hint=notice?.warning?notice.title+(p.height>=90?'\n'+notice.description:''):this.run.stage!.playIndex===0?'选 1–5 张，凑牌型出牌\n不合适？弃牌换新牌':'选牌，准备下一手';
      const payoffs=notice?.warning?[]:growthPayoffs(this.run),payoff=payoffs.find(p=>p.change!=='same')??payoffs[0],shown=payoff&&showGrowthPayoff(this.view,this,this.previewCards,p,payoff);
      const text=!shown?this.add.text(p.x+p.width/2,p.y+p.height/2,hint,{fontFamily:UI_FONT,fontSize:p.height<90||notice?.warning?'14px':'18px',color:notice?.warning?C.red:C.mutedInk,align:'center',lineSpacing:4,wordWrap:{width:p.width-24,useAdvancedWrap:true},resolution:Math.max(1.5,1/this.scale.zoom)}).setOrigin(.5):undefined;
      if(text)this.previewCards.add(text);
      const score=this.view.layout.scoreBoard,mods=readR2Modifiers(this.run.jokers,this.jokerDefinitions),handRules=r2ScoreContext(this.run,this.hand,[]).handRules;
      const rule=fourCardRuleCopy({fourStraight:mods.fourStraight||handRules?.fourStraight,fourFlush:mods.fourFlush||handRules?.fourFlush});
      const idleRows=score.height>=90?['按全部所选牌判型，最多5张',...(rule?[rule]:[])]:rule?[rule]:[];
      idleRows.forEach((line,i)=>{const area={x:score.x+10,y:score.y+(score.height>=130?38:score.height>=90?34:24)+i*18,width:score.width-20-(this.selectionQuickInScore(score)?104:0),height:18};const lineText=this.add.text(area.x,area.y,line,{fontFamily:UI_FONT,fontSize:'14px',color:C.jade,resolution:Math.max(1.5,1/this.scale.zoom)}).setName('selection/fact-line');fitScoreLine(lineText,area,14);this.previewCards!.add(lineText);});
      this.renderCandidateEntry(score);
      const hit=this.view.rect(score).setFillStyle(0,0).setStrokeStyle();this.previewCards.add(hit);this.view.target(hit,'selection/facts',{tap:()=>this.inspectCandidates(),detail:()=>this.inspectCandidates()});
      this.renderSelectionQuickButtons(score);return;
    }
    const facts=selectionCopy(preview),score=this.view.layout.scoreBoard,compact=score.height<90;
    let rows:string[],start:number,step:number;
    if(compact){
      rows=[facts.membership+(preview.scoringIds.length!==preview.activeScoringIds.length?' · '+(preview.scoringIds.length-preview.activeScoringIds.length)+'张停用':preview.ordinaryPointsSuppressedIds.length?' · '+preview.ordinaryPointsSuppressedIds.length+'张点数0':''),facts.rules||facts.restrictions.join('；')].filter(Boolean);start=24;step=18;
    }else{
      rows=[...(score.height>=130?[facts.pattern]:[]),facts.membership,...facts.restrictions,...(facts.rules?[facts.rules]:[])];
      step=rows.length>3||score.height<120?18:20;start=score.height>=130?38:34;
    }
    rows.forEach((copy,i)=>{const text=this.add.text(score.x+10,score.y+start+i*step,copy,{fontFamily:UI_FONT,fontSize:'14px',color:copy.includes('停用')||copy.includes('点数0')?C.red:C.jade,resolution:Math.max(1.5,1/this.scale.zoom)}).setName('selection/fact-line').setData('fullText',copy);this.previewCards!.add(text);fitScoreLine(text,{x:score.x+10,y:score.y+start+i*step,width:score.width-20-(this.selectionQuickInScore(score)?104:0),height:step},14);});
    this.renderCandidateEntry(score);
    const hit=this.view.rect(score).setFillStyle(0,0).setStrokeStyle();this.previewCards.add(hit);
    this.view.target(hit,'selection/facts',{tap:()=>this.inspectCandidates(),detail:()=>this.inspectSelection(preview)});
    this.renderSelectionQuickButtons(score);
    const cards=this.hand.filter(card=>this.selectedIds.has(card.id)),boxes=this.landingBoxes(cards.length);
    cards.forEach((card,i)=>{const cv=this.cardPiece(card,boxes[i]);this.previewCards!.add(cv.container);cv.container.setAlpha(1);paintCardFeedback(cv,{scoring:preview.activeScoringIds.includes(card.id)});cv.scoringMark.setVisible(false);});
  }
  private get assistProfile():boolean {return r2UsesAssist(this.run);}
  private get jokerDefinitions(){return r2JokerDefinitionsFor(this.run);}
  private jokerDefinition(id:string){return r2JokerDefinitionFor(this.run,id);}
  private draftRevision():string {return JSON.stringify([this.run.contentVersion,this.run.contentHash,r2HandRevision(this.candidateInput())]);}
  private assistInput(){return{...this.candidateInput(),selectedIds:[...this.selectedIds]};}
  private validateAssistSelection():void {
    if(!this.assistIds?.length)return;
    if(!validAssistDraft(this.assistInput(),r2AssistAvailability(this.run).available,this.assistIds)){this.assistIds=[];this.assistPage=0;this.statusMessage='主手或可用条件已变化，助攻已取消';}
  }
  private chooseAssist(ids:readonly string[]):void {
    if(!this.ready||this.presentation||!this.assistProfile)return;
    const facts=validAssistDraft(this.assistInput(),r2AssistAvailability(this.run).available,ids);if(!facts)return;
    this.handInput?.cancel();this.view.cancelInteraction();
    this.candidateUndo={revision:this.draftRevision(),ids:[...this.selectedIds],assistIds:[...this.assistIds]};
    this.assistIds=this.assistIds.length===facts.assistIds.length&&facts.assistIds.every(id=>this.assistIds.includes(id))?[]:[...facts.assistIds];
    this.statusMessage=this.assistIds.length?'助攻已选 ×'+facts.assistMultiplier:'助攻已取消，主手保持';this.refreshSelection();
  }
  private renderAssistSelection(preview:HandPreview|undefined,p:Box,growthIdle=false):void {
    const score=this.view.layout.scoreBoard,portrait=this.view.layout.mode==='portrait',desktop=this.view.layout.mode==='desktop',room=portrait&&score.height>=100;
    const availability=r2AssistAvailability(this.run),candidates=assistCandidates(this.assistInput(),availability.available);
    const current=validAssistDraft(this.assistInput(),availability.available,this.assistIds);
    const status=availability.available?'本场助攻 1/1':availability.reason==='used'?'本场助攻已用':availability.reason==='disabled'?'本场助攻停用':'助攻暂不可用';
    const label=(ids:readonly string[])=>this.hand.filter(c=>ids.includes(c.id)).map(c=>rankLabel(c.rank)+SUIT_SYMBOL[c.suit]).join(' ');
    const text=(x:number,y:number,value:string,width:number)=>{const t=this.add.text(x,y,value,{fontFamily:UI_FONT,fontSize:'14px',color:C.jade,resolution:Math.max(1.5,1/this.scale.zoom)}).setName('selection/assist-copy').setData('fullText',value);this.previewCards!.add(t);fitScoreLine(t,{x,y,width,height:18},14);return t;};
    text(score.x+10,score.y+(desktop?52:score.height<90?24:34),preview?'主手 '+preview.playedIds.length+' · 计分 '+preview.activeScoringIds.length+' · 留手 '+preview.heldIds.length:'主手：先选1–5张',score.width-20);
    const railWidth=Math.min(194,p.width-8),rail:Box=room?{x:score.x+10,y:score.y+Math.min(60,score.height-66),width:score.width-20,height:44}:{x:p.x+p.width-railWidth-4,y:p.y,width:railWidth,height:44};
    const pageSize=Math.min(Math.max(1,candidates.length),Math.max(1,Math.floor((rail.width-88)/94))),pages=Math.max(1,Math.ceil(candidates.length/pageSize));this.assistPage=Math.max(0,Math.min(this.assistPage,pages-1));
    const pageCopy=candidates.length>1?' · '+candidates.length+'组 · 第'+(this.assistPage+1)+'/'+pages+'页':'';
    if(room||!growthIdle)text(room?score.x+10:rail.x,room?score.y+score.height-18:rail.y+46,status+pageCopy+(current&&room?' · 已选×'+current.assistMultiplier:''),room?score.width-20:rail.width);
    if(candidates.length){
      const paged=pages>1,gap=6,side=paged?44:0,usable=rail.width-side*2,width=(usable-gap*(pageSize-1))/pageSize;
      const button=(b:Box,value:string,name:string,action:()=>void,enabled:boolean,selected=false)=>{const first=this.view.root.length,r=this.view.button(b,value,name,action,enabled);(r.getData('label') as Phaser.GameObjects.Text).setFontSize(14);if(selected)(r.getData('label') as Phaser.GameObjects.Text).setColor(C.red);this.previewCards!.add(this.view.root.list.slice(first));return r;};
      if(paged){button({...rail,width:44},'上页','selection/assist-prev',()=>{this.assistPage--;this.refreshSelection();},this.ready&&this.assistPage>0);button({...rail,x:rail.x+rail.width-44,width:44},'下页','selection/assist-next',()=>{this.assistPage++;this.refreshSelection();},this.ready&&this.assistPage<pages-1);}
      candidates.slice(this.assistPage*pageSize,(this.assistPage+1)*pageSize).forEach((facts,i)=>{const selected=current?.assistIds.join('|')===facts.assistIds.join('|');button({...rail,x:rail.x+side+i*(width+gap),width},label(facts.assistIds)+'\n'+(selected?'取消助攻':'助攻 ×'+facts.assistMultiplier),'selection/assist-'+facts.assistIds.join('+'),()=>this.chooseAssist(facts.assistIds),this.ready,selected);});
    }else if(!growthIdle){text(rail.x,rail.y+8,availability.available?(preview?'剩余牌无合法助攻':'先组成两对、三条或更高'):status,rail.width);}
    const compact=room&&p.height<110;
    if(room&&!growthIdle){
      if(compact){
        text(p.x+8,p.y+2,'主手：'+label([...this.selectedIds]),p.width-16);
        text(p.x+8,p.y+20,'助攻：'+(current?label(current.assistIds)+' ×'+current.assistMultiplier:'未选'),p.width-16);
        text(p.x+8,p.y+40,ASSIST_EXPLANATION,p.width-16);
      }else {text(p.x+8,p.y+2,ASSIST_EXPLANATION,p.width-16);text(p.x+8,p.y+22,ASSIST_AI_EXPLANATION,p.width-16);}
    }else if(desktop){
      text(score.x+10,score.y+76,current?'助攻 '+current.assistIds.length+'张 ×'+current.assistMultiplier+' · 一同用掉':'助攻会一同用掉',score.width-20);
      text(score.x+10,score.y+94,'不算主手或留手牌',score.width-20);
      text(score.x+10,score.y+118,ASSIST_AI_EXPLANATION,score.width-20);
    }else if(!room){
      text(score.x+10,score.y+42,ASSIST_EXPLANATION,score.width-72);
      if(score.height>=76)text(score.x+10,score.y+60,ASSIST_AI_EXPLANATION,score.width-20);
    }
    const hit=this.view.rect({x:score.x,y:score.y,width:score.width,height:room?56:score.height}).setFillStyle(0,0).setStrokeStyle();this.previewCards!.add(hit);this.view.target(hit,'selection/facts',{tap:()=>this.inspectCandidates(),detail:()=>preview?this.inspectSelection(preview):this.inspectCandidates()});
    this.renderSelectionQuickButtons(score);
    if(!compact){
      const cards=this.hand.filter(card=>this.selectedIds.has(card.id)),area=room?{...p,y:p.y+38,height:p.height-38}:{...p,width:Math.max(0,rail.x-p.x-8)};
      const h=Math.max(24,area.height-12),w=Math.min(52,h/1.4,(area.width-12-5*Math.max(0,cards.length-1))/Math.max(cards.length,1)),total=cards.length*w+Math.max(0,cards.length-1)*5;
      cards.forEach((card,i)=>{const cv=this.cardPiece(card,{x:area.x+(area.width-total)/2+i*(w+5),y:area.y+(area.height-w*1.4)/2,width:w,height:w*1.4});this.previewCards!.add(cv.container);cv.scoringMark.setVisible(false);});
    }
  }
  private renderCandidateEntry(score:Box):void {
    if(score.height<78)return;
    const footer=this.add.text(score.x+10,score.y+score.height-20,this.candidateEntry(),{fontFamily:UI_FONT,fontSize:'14px',color:C.jade,resolution:Math.max(1.5,1/this.scale.zoom)}).setName('selection/rules-entry');this.previewCards!.add(footer);
  }
  private selectionQuickInScore(score:Box):boolean {return this.assistProfile||this.view.layout.mode!=='desktop'||score.width>=300;}
  private renderSelectionQuickButtons(score:Box):void {
    const area=this.selectionQuickInScore(score)?selectionCandidateEntryBox(score):{x:this.view.layout.playedArea.x+8,y:score.y+2,width:92,height:44},first=this.view.root.length;
    const buttons=[this.view.button({...area,width:44},this.selectedIds.size?'所选\n条件':this.run.lastTrace?'上手\n结果':'来源\n条件','selection/source-benefits',()=>{const facts=this.selectionPreview();if(facts)this.inspectSelection(facts);else if(this.run.lastTrace)this.inspectLastTrace();else this.inspectHeldConditions();},this.ready),this.view.button({...area,x:area.x+48,width:44},'怎么\n凑牌','selection/hand-rules',()=>this.inspectCandidates(),this.ready)];
    buttons.forEach(button=>(button.getData('label') as Phaser.GameObjects.Text).setFontSize(14).setName('selection/quick-label'));
    this.previewCards!.add(this.view.root.list.slice(first));
  }
  private switchHandType():void {
    if(!this.ready||this.presentation||this.run.phase!=='await-input'||document.hidden)return;
    const input=this.aiInput(),next=nextAiHand(this.aiCandidates.result,aiHandKey(input),[...this.selectedIds],this.aiCursor);
    if(!next)return;const facts=next.facts;
    this.handInput?.cancel();this.view.cancelInteraction();this.candidateGhost=undefined;
    this.candidateUndo={revision:this.draftRevision(),ids:[...this.selectedIds],assistIds:[...this.assistIds]};
    this.erxiangTargetId=null;this.azaoRelease=false;this.xiemuBurn=0;this.aiCursor=next.cursor;this.selectedIds=new Set(facts.playedIds);this.assistIds=[];this.assistPage=0;this.statusMessage=this.assistProfile?'已换主手，助攻请重新选':'AI已选'+HAND_LABELS[facts.type]+' · 查看牌型可撤销';this.refreshSelection();
  }
  private inspectHandRules():void {
    if(!this.ready||this.presentation||this.run.phase!=='await-input')return;
    this.handInput?.cancel();this.view.cancelInteraction();this.candidateGhost=undefined;
    const context=r2ScoreContext(this.run,this.hand,[]),mods=readR2Modifiers(this.run.jokers,this.jokerDefinitions);
    this.dialog.open('牌型规则',(this.assistProfile?ASSIST_AI_EXPLANATION+'\n'+ASSIST_EXPLANATION+'\n\n':'')+AI_HAND_POLICY+'\n\n'+handRuleReference(this.run.handLevels,{fourStraight:!!(context.handRules?.fourStraight||mods.fourStraight),fourFlush:!!(context.handRules?.fourFlush||mods.fourFlush)}),[{label:'看当前手牌怎么凑',primary:true,run:()=>this.inspectCandidates()}]);attachFirstChapterGuide(this.run,()=>this.render());
  }
  private updateControls():void {
    if(!this.controlsLive)return;
    this.view.setEnabled(this.rankButton,this.ready&&!this.pendingRefill);this.view.setEnabled(this.suitButton,this.ready&&!this.pendingRefill);
    const aiInput=this.aiInput(),aiResult=this.aiCandidates.result;
    this.view.setEnabled(this.aiButton,this.ready&&!this.pendingRefill&&!this.presentation&&aiResult?.status==='ready'&&aiResult.key===aiHandKey(aiInput)&&aiResult.ordered.length>0);
    const handWindow=this.view.layout;this.handNavigationButtons.forEach((button,i)=>this.view.setEnabled(button,this.ready&&(i===0?handWindow.handStart>0:handWindow.handStart+handWindow.visibleCardCount<this.hand.length)));
    const notice=stageNotice(this.run),discardGoldCost=notice?.discardGoldCost??0;
    (this.playButton.getData('label') as Phaser.GameObjects.Text).setText('出牌');
    (this.discardButton.getData('label') as Phaser.GameObjects.Text).setText(discardGoldCost?'弃 -1金':r2DiscardCost(this.run)===2?'弃 ×2':'弃牌');
    this.view.setEnabled(this.discardButton,this.ready&&!this.pendingTouye&&this.selectedIds.size>0&&this.run.stage!.discardsLeft>=r2DiscardCost(this.run)&&this.run.gold>=discardGoldCost);
    this.view.setEnabled(this.playButton,this.ready&&this.selectedIds.size>0&&this.handsLeft>0);
    if(usesErxiangHandoff(this.run)){const choice=erxiangChoice(this.run,this.selectionPreview(),this.erxiangTargetId);if(this.ready&&!this.playing&&!this.presentation&&this.erxiangTargetId&&!choice.selected)this.erxiangTargetId=null;this.roleText.setText(choice.compact);(this.playButton.getData('label') as Phaser.GameObjects.Text).setText(choice.selected?'交棒·出牌':'出牌');}
    const xiemu=usesXiemuBurn(this.run)?xiemuChoice(this.run,this.selectionPreview()?.type,this.xiemuBurn):undefined;
    const azao=usesAzaoCharge(this.run)?azaoChoice(this.run,this.selectionPreview()?.type):undefined;
    if(azao&&!azao.available&&this.ready&&!this.playing&&!this.presentation)this.azaoRelease=false;
    if(azao){(this.playButton.getData('label') as Phaser.GameObjects.Text).setText(this.azaoRelease?'爆发×'+azao.multiplier:'出牌');this.roleText.setText(this.view.layout.mode==='portrait'?(azao.enabled?'阿燥·蓄'+azao.charge+'·'+(this.azaoRelease?'已选×'+azao.multiplier:azao.charge?'放×'+azao.multiplier:'点英雄'):'蓄势停用'):azao.compact);}
    if(xiemu){if(this.ready&&!this.playing&&!this.presentation&&this.xiemuBurn&&!xiemu.choices.find(c=>c.cost===this.xiemuBurn)?.available)this.xiemuBurn=0;const copy=xiemuChoice(this.run,this.selectionPreview()?.type,this.xiemuBurn);this.roleText.setText(this.view.layout.mode==='portrait'?copy.mobile:copy.compact);(this.playButton.getData('label') as Phaser.GameObjects.Text).setText(this.xiemuBurn?'燃'+this.xiemuBurn+'·出牌':'出牌');}
    this.resourceCounts.play.setColor(handActionCountColor('play',!!this.playButton.input?.enabled));
    this.resourceCounts.discard.setColor(handActionCountColor('discard',!!this.discardButton.input?.enabled,this.run.stage!.discardsLeft<2*r2DiscardCost(this.run)));
    const portrait=this.view.layout.mode==='portrait';
    const reason=this.playing?this.presentation?'正在结算 · 可快进':'正在换牌':this.handsLeft===1?'最后 1 次出牌 · 达到目标才能过关':!this.selectedIds.size?(handWindow.handOverflow?'‹ › 翻页 · 按住横滑选牌':portrait?'按住横滑选牌 · 长按看详情':'按住横滑选牌 · 最多 5 张'):this.run.gold<discardGoldCost?'弃牌需1金币 · 仍可出牌':this.run.stage!.discardsLeft<r2DiscardCost(this.run)?'弃牌次数已用完':this.handsLeft<=0?'出牌次数已用完':'已选 '+this.selectedIds.size+' / 5';
    const reminders=!this.presentation&&this.ready?this.run.jokers.map(j=>jokerMemory(this.jokerDefinition(j.definitionId),j,this.memoryContext(j,this.selectionPreview()))).filter(m=>m.scoreLimited||m.status==='当前未满足'||m.status==='部分条件满足').slice(0,1).map(m=>m.name+' · '+m.status).join('；'):'';
    const selectionStates=!this.presentation&&this.ready&&this.selectedIds.size?this.run.jokers.map(j=>selectionExperience(this.run,j,this.memoryContext(j,this.selectionPreview()))):[];
    const selectedReminder=selectionStates.length?'满足'+selectionStates.filter(s=>s.readiness==='ready').length+' · 待检查'+selectionStates.filter(s=>s.readiness==='pending').length+' · 未满足'+selectionStates.filter(s=>s.readiness==='unmet'||s.readiness==='limited').length+' · 点所选条件':'';
    const savedReminder=!this.presentation?this.run.jokers.map(j=>jokerMemory(this.jokerDefinition(j.definitionId),j,this.memoryContext(j,this.selectionPreview()))).find(m=>m.saved!=='无成长或使用计数'):undefined;
    const entryReminder=!this.selectedIds.size&&this.run.stage?.playIndex===0?this.run.jokers.slice(0,1).map(j=>this.jokerDefinition(j.definitionId).name+' · '+this.jokerValue(j)+' · 长按条件').join(''):'';
    const memoryReminder=savedReminder?(savedReminder.name+' · '+savedReminder.savedShort)+' · 条件见详情':'';
    const sweepReminder=this.handHint?(handWindow.status.width<250?'横滑选牌 · 已选可取消':'横滑选牌 · 从已选牌开始可取消'):'';
    const latestBenefit=!this.presentation&&this.run.lastTrace&&!this.selectedIds.size?[...this.run.lastTrace.events].reverse().map(e=>savedBenefit(this.run,this.run.lastTrace!,e)).find(Boolean):undefined;
    const benefitReminder=latestBenefit?latestBenefit.title+' · '+latestBenefit.effect+' · 上手详情':'';
    const discovery=this.ready&&!this.presentation&&!this.selectedIds.size&&!this.statusMessage&&!reminders?savedGrowthDiscovery(this.run):undefined;
    const guideCue=this.ready&&!this.presentation&&!this.selectedIds.size&&this.handsLeft>1?firstChapterGuide(this.run)?.cue:undefined;
    const criticalStatus=this.statusMessage||(this.pendingRefill?this.refillHidden?'候选已保存 · 点英雄继续':`留 ${this.pendingRefill.required} 张 · 已选 ${this.selectedIds.size}/${this.pendingRefill.required} · 确认后补入`:'')||(!this.playing&&!this.presentation&&this.handsLeft===1?reason:'');
    this.statusText.setName(discovery&&!criticalStatus?'growth/discovery':'').setText(criticalStatus||discovery?.full||sweepReminder||selectedReminder||guideCue||reminders||entryReminder||benefitReminder||memoryReminder||reason);
    if(!criticalStatus){
    if(!discovery&&benefitReminder&&!sweepReminder&&!this.statusMessage&&!selectedReminder&&!reminders&&!entryReminder&&this.statusText.width>handWindow.status.width)this.statusText.setText('已保存结果 · 菜单查看上手');
    if(selectedReminder&&this.statusText.width>handWindow.status.width)this.statusText.setText('点所选条件 · 查看来源');
    // Short landscape has an existing 12px bottom table margin: two normal 16px rows fit without moving controls.
    if(discovery)for(const text of [discovery.full,discovery.compact]){this.statusText.setText(text);if(this.statusText.width<=handWindow.status.width&&this.statusText.height<=handWindow.status.height+(handWindow.mode==='landscape'?12:0))break;}
    if(!discovery&&this.statusText.width>this.view.layout.status.width&&memoryReminder&&!sweepReminder&&!this.statusMessage&&!reminders&&!entryReminder)this.statusText.setText(savedReminder!.name+' · 保存状态见详情');
    if(azao&&!this.presentation&&!this.playing&&!discovery&&!sweepReminder&&!selectedReminder&&!guideCue&&!reminders&&!entryReminder&&!benefitReminder&&!memoryReminder)this.statusText.setText(azao.compact+' · '+(this.azaoRelease?'本手释放，消耗全部层':azao.hold)).setName('hero/azao-charge-status');
    }
    if(usesTouyeWager(this.run)){const copy=touyeChoice(this.run,[...this.selectedIds]);this.roleText.setText(copy.compact);if(!criticalStatus&&!this.playing&&!this.presentation&&copy.status)this.statusText.setText(copy.status);if(this.pendingTouye){this.view.setEnabled(this.discardButton,false);if(this.inventoryButton)this.view.setEnabled(this.inventoryButton,false);}}
    const safeBottom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom'))||0;
    fitStatusSummary(this.statusText,{...handWindow.status,height:Math.max(0,Math.min(handWindow.status.height+(handWindow.mode==='landscape'?12:0),handWindow.height-safeBottom-handWindow.status.y))},!criticalStatus&&selectedReminder?'点所选条件':undefined);
    if(usesLaohuanRefill(this.run))this.roleText.setText(this.roleCaption());
    const heroCue=heroAbilityCue(this.run,this.selectionPreview(),[...this.selectedIds],this.assistProfile&&assistCandidates(this.assistInput(),r2AssistAvailability(this.run).available).length>0);
    const heroChosen=!!(this.erxiangTargetId||this.azaoRelease||this.xiemuBurn||this.assistIds.length);
    if(heroCue&&!this.presentation&&!this.playing&&!heroChosen)this.roleText.setText(heroCue.label);
    // Every update clears the readiness accent while saving, paused or presenting.
    const heroAvailable=!!heroCue?.available&&this.ready&&!this.presentation&&!this.playing&&!heroChosen;
    this.roleText.setColor(heroAvailable?C.jade:C.mutedInk).setData('abilityAvailable',heroAvailable);
    this.roleFrame.setStrokeStyle(heroAvailable?2:1,heroAvailable?T.jade:T.brass,heroAvailable?1:.6);
    this.resourceCounts.play.setVisible(!this.pendingRefill);this.resourceCounts.discard.setVisible(!this.pendingRefill);
    if(this.pendingRefill){this.view.setEnabled(this.aiButton,false);this.view.setEnabled(this.playButton,this.ready&&!this.refillHidden&&this.selectedIds.size===this.pendingRefill.required);(this.playButton.getData('label') as Phaser.GameObjects.Text).setText('确认留'+this.pendingRefill.required);this.view.setEnabled(this.discardButton,this.ready);(this.discardButton.getData('label') as Phaser.GameObjects.Text).setText(this.refillHidden?'继续选牌':'收起候选');if(this.inventoryButton)this.view.setEnabled(this.inventoryButton,false);}
    // Balatro-style call-to-action: the playable state breathes a warm aura.
    const auraOn=!!this.playButton.input?.enabled&&this.selectedIds.size>0&&!this.presentation&&!this.playing;
    if(this.playAura){
      if(this.reducedMotion){this.playAuraPulse?.remove();this.playAuraPulse=undefined;this.playAura.setAlpha(auraOn ? .5 : 0);return;}
      if(auraOn&&!this.playAuraPulse&&!this.reducedMotion)this.playAuraPulse=this.tweens.add({targets:this.playAura,alpha:.8,duration:640,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      if(!auraOn&&this.playAuraPulse){this.playAuraPulse.remove();this.playAuraPulse=undefined;this.playAura.setAlpha(0);}
    }
  }
  /** This public selection boundary cannot carry a score trace or RNG. */
  private candidateInput():R2CandidateInput {
    const stage=this.run.stage!,context=r2ScoreContext(this.run,this.hand,[]);
    return{hand:this.hand,jokers:this.run.jokers,definitions:this.jokerDefinitions,handRules:context.handRules,disabledIds:stage.disabledIds,ordinaryPointsSuppressedIds:[],boss:this.run.boss,stageIndex:stage.index,sealedJokerIds:stage.sealedJokerIds,challengeDisabledJokerId:stage.challengeDisabledJokerId,resources:{gold:this.run.gold,handsLeft:stage.handsLeft,playIndex:stage.playIndex,discardsUsed:stage.discardsUsed,stageHeat:stage.heat,target:stage.targetHeat},contentVersion:this.run.contentVersion+'/'+this.run.contentHash};
  }
  /** Enumeration changes availability and footer copy, never the active selection hit targets. */
  private refreshCandidateStatus():void {
    this.updateControls();
    const entry=this.previewCards?.getByName('selection/rules-entry') as Phaser.GameObjects.Text|undefined;
    entry?.setText(this.candidateEntry());
  }
  private ensureCandidates():void {
    const input=this.candidateInput(),key=r2CandidateKey(input);
    if(this.candidateGhost?.key!==key)this.candidateGhost=undefined;
    if(this.candidateUndo?.revision!==this.draftRevision())this.candidateUndo=undefined;
    const lifecycle=this.lifecycle;
    this.candidates.update(input,result=>{if(lifecycle===this.lifecycle&&this.scene.isActive()&&!this.presentation&&!this.playing&&r2CandidateKey(this.candidateInput())===result.key)this.view.afterInteraction(()=>{if(lifecycle===this.lifecycle&&this.scene.isActive()&&!this.presentation&&!this.playing)this.refreshCandidateStatus();});});
    const ai=this.aiInput(),aiKey=aiHandKey(ai);if(this.aiCursor?.key!==aiKey)this.aiCursor=undefined;
    this.aiCandidates.update(ai,result=>{if(lifecycle===this.lifecycle&&this.scene.isActive()&&!this.presentation&&!this.playing&&aiHandKey(this.aiInput())===result.key)this.view.afterInteraction(()=>{if(lifecycle===this.lifecycle&&this.scene.isActive()&&!this.presentation&&!this.playing)this.refreshCandidateStatus();});});
  }
  private aiInput():AiHandInput {
    const stage=this.run.stage!,context=r2ScoreContext(this.run,this.hand,[]);
    return{...this.candidateInput(),boss:context.boss,sealedJokerIds:context.sealedJokerIds,challengeDisabledJokerId:context.challengeDisabledJokerId,score:{...(context.erxiangHandoff?{erxiangHandoff:context.erxiangHandoff}:{}),...(context.touyeWager?{touyeWager:context.touyeWager}:{}),...(context.laohuanTrick?{laohuanTrick:context.laohuanTrick}:{}),...(context.xiemuBurn?{xiemuBurn:context.xiemuBurn}:{}),...(context.azaoCharge?{azaoCharge:context.azaoCharge}:{}),characterId:context.characterId,amoScoreTiming:context.amoScoreTiming,jokerSlots:context.jokerSlots,handLevels:this.run.handLevels,previousHandType:stage.previousHandType,previousHandScore:context.previousHandScore,wager:stage.wagerSelected}};
  }
  private cancelAiCandidates():void {this.aiCandidates.dispose();this.aiCursor=undefined;}
  private candidateEntry():string {
    const result=this.candidates.result;
    return result?.status==='ready'?'本轮可成'+result.groups.length+'种 · 查看':result?.status==='working'?'本轮牌型整理中 · 选牌照常':'选择说明 · 完整规则 ›';
  }
  private inspectCandidates(growthOnly=false,focus:BuildFocus|null=currentBuildFocus(this.run,this.run.openingRoute)??null):void {
    if(!this.ready||this.presentation||this.run.phase!=='await-input')return;
    this.handInput?.cancel();this.view.cancelInteraction();this.ensureCandidates();this.candidateGhost=undefined;
    const result=this.candidates.result!,key=result.key,assistKey=this.assistIds.join('|');
    const isCurrent=()=>this.dialog.active(dialog)&&!document.hidden&&this.ready&&this.run.phase==='await-input'&&!this.presentation&&r2CandidateKey(this.candidateInput())===key&&this.assistIds.join('|')===assistKey;
    const facts=this.selectionPreview(),initial=facts?selectionCopy(facts).title+'\n'+selectionCopy(facts).membership:'尚未选择牌';
    const opportunity=(j:R2JokerInstance,example:HandPreview)=>{const context=r2ScoreContext(this.run,this.hand,example.playedIds);const resolved=validAssistDraft({hand:this.hand,selectedIds:example.playedIds,disabledIds:this.run.stage!.disabledIds,jokers:this.run.jokers,definitions:this.jokerDefinitions,handRules:context.handRules,ordinaryPointsSuppressedIds:context.ordinaryPointsSuppressedIds},this.assistProfile&&r2AssistAvailability(this.run).available,this.assistIds)??example;return growthOpportunity(this.run,j,this.memoryContext(j,resolved));};
    let groups=result.groups.map(g=>({...g,examples:growthOnly?g.examples.filter(example=>this.run.jokers.some(j=>{const g=opportunity(j,example);return g?.action==='play'&&g.status==='ready';})):g.examples})).filter(g=>g.examples.length);if(growthOnly)groups.sort((a,b)=>Number(['high-card','pair'].includes(a.type))-Number(['high-card','pair'].includes(b.type)));
    if(focus&&!growthOnly)groups=groups.filter(g=>buildHandTypes(focus).includes(g.type));
    if(!growthOnly){const order=['high-card','pair','two-pair','three-kind','straight','flush','full-house','four-kind','straight-flush','five-kind','flush-house','flush-five'];groups.sort((a,b)=>order.indexOf(b.type)-order.indexOf(a.type));}
    const references=focus&&!growthOnly&&result.status==='ready'&&!groups.length?handRouteReferences({hand:this.hand,effectiveDeck:this.run.deckInstances.filter(c=>!this.run.destroyedIds.includes(c.id)),rules:r2SelectionFacts({...this.candidateInput(),selectedIds:[this.hand[0].id]}).rules},focus):[];
    const label=(ids:readonly string[])=>this.hand.filter(c=>ids.includes(c.id)).map(c=>rankLabel(c.rank)+SUIT_SYMBOL[c.suit]).join(' ');
    const suggestion=references[0]?'可尝试留 '+label(references[0].keepIds)+'；其余可尝试换。\n'+references[0].gap:groups[0]?'可先试'+HAND_LABELS[groups[0].type]+'：'+label(groups[0].examples[0].playedIds)+'\n点“换为这组”只选牌，再由你出牌。':initial;
    const dialog=this.dialog.open(growthOnly?'本轮成长机会':'当前手牌怎么凑',initial+'\n'+(result.status==='ready'?'共'+groups.length+'种：'+groups.map(g=>HAND_LABELS[g.type]).join(' · '):'本轮牌型整理中')+'\n★代表计分牌。已成型示例只用当前手牌；未成型参考标“留”，不是计分牌型。\n点示例不改选择；换组后仍需自己出牌。成长不是通关必选，不必为成长强留场。'+(growthOnly?'出牌、弃牌、交易与关末成长分开看；只亮公开可判断的出牌成长。':''),[
      {label:'换为这组',primary:true,disabled:true,run:()=>{
        const ghost=this.candidateGhost;if(!isCurrent()||!ghost||ghost.key!==key){message.textContent=isCurrent()?'先点一个示例，只查看不会改选择。':'手牌或规则已变化，请关闭后重新查看。';return;}
        this.candidateUndo={revision:this.draftRevision(),ids:[...this.selectedIds],assistIds:[...this.assistIds]};
        this.erxiangTargetId=null;this.azaoRelease=false;this.xiemuBurn=0;this.aiCursor=undefined;this.selectedIds=new Set(ghost.facts.playedIds);if(ghost.assistIds!==undefined){this.assistIds=[...ghost.assistIds];this.assistPage=0;}this.validateAssistSelection();this.candidateGhost=undefined;this.dialog.close(dialog);this.refreshSelection();this.statusMessage='已换组，仍需自己出牌；查看牌型可撤销';this.updateControls();
      }},
      {label:'撤销换组',disabled:!this.candidateUndo,run:()=>{
        const undo=this.candidateUndo;if(!isCurrent()||!undo||undo.revision!==this.draftRevision()){message.textContent='手牌或选择已变化，旧换组不能撤销。';return;}
        this.erxiangTargetId=null;this.azaoRelease=false;this.xiemuBurn=0;this.aiCursor=undefined;this.selectedIds=new Set(undo.ids);this.assistIds=[...(undo.assistIds??[])];this.candidateUndo=undefined;this.candidateGhost=undefined;this.dialog.close(dialog);this.statusMessage='已撤销换组，恢复原选择';this.refreshSelection();
      }},
      {label:growthOnly?'全部可成牌型':'查看成长机会',run:()=>this.inspectCandidates(!growthOnly,focus)},
      {label:toolInventoryLabel(this.run),run:()=>showConsumables(this.dialog,this.run,this.ready&&!this.pendingRefill&&!this.pendingTouye,(a,seq)=>this.command(a,seq))},
      {label:'构筑条件',run:()=>{const selected=this.selectionPreview();if(selected)this.inspectSelection(selected);else this.inspectHeldConditions();}},
      {label:'完整牌型规则',run:()=>this.inspectHandRules()},
    ],{summaryBody:!growthOnly?suggestion:initial+'\n'+(result.status==='ready'?'本轮成长机会':'本轮整理中'),collapseRules:true,rulesLabel:'牌型与成长说明',onClose:()=>{this.candidateGhost=undefined;},cards:growthOnly?this.run.jokers.flatMap(j=>{const g=growthOpportunity(this.run,j,this.memoryContext(j,facts));return g?[{title:g.name,url:selectionExperience(this.run,j,this.memoryContext(j,facts)).url,body:g.body,action:{label:'查看来源与成长',run:()=>this.inspectJoker(j.instanceId)}}]:[]}):undefined});
    dialog.classList.add('hand-candidate-dialog');
    const scroll=dialog.querySelector('.dialog-scroll')!,list=document.createElement('section'),message=document.createElement('p');list.className='hand-candidates';message.className='candidate-example';message.setAttribute('role','status');message.textContent='示例尚未选择；手牌选择保持原样。';scroll.append(list,message);const gallery=dialog.querySelector('.experience-cards');if(gallery){const sources=document.createElement('details'),heading=document.createElement('summary');sources.className='candidate-source-details';heading.textContent='成长来源与时点';sources.append(heading,gallery);scroll.append(sources);}
    const route=document.createElement('label'),routeTitle=document.createElement('span'),select=document.createElement('select');route.className='candidate-route-control';routeTitle.textContent='想尝试的组合';select.setAttribute('aria-label','想尝试的组合');
    for(const [value,name] of [['','全部已成型'],['group','同点成组'],['straight','顺子'],['flush','同花']]){const option=document.createElement('option');option.value=value;option.textContent=name;select.append(option);}select.value=focus??'';select.onchange=()=>{if(!isCurrent())return;const choice=select.value as BuildFocus|'';if(choice)chooseBuildFocus(this.run,choice);this.inspectCandidates(false,choice||null);};route.append(routeTitle,select);if(!growthOnly){list.append(route);const direction=document.createElement('p');direction.className='candidate-example';direction.textContent=buildDirectionCaption(this.run)+'；选择方向可换，查看全部不改变培养方向。';list.append(direction);}
    if(!growthOnly&&this.run.stage!.handsLeft<=1){const budget=document.createElement('p');budget.className='candidate-example';budget.dataset.playBudget='true';budget.textContent=handRoutePlayBudget(this.run.stage!.handsLeft);list.append(budget);}
    const chooseExample=(shown:HandPreview,button:HTMLButtonElement,assistOverride?:readonly string[])=>{
      if(!isCurrent()){message.textContent='手牌或规则已变化，请重新查看。';return;}
      const copy=selectionCopy(shown);this.candidateGhost={key,facts:shown,...(assistOverride!==undefined?{assistIds:[...assistOverride]}:{})};const apply=dialog.querySelector<HTMLButtonElement>('.dialog-primary');if(apply)apply.disabled=false;list.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));button.setAttribute('aria-pressed','true');
      const sources=shown.ruleSources.filter(source=>source.used).map(source=>this.jokerDefinition(source.definitionId).name).join('、');
      message.textContent='仅示例 · '+copy.title+'\n'+[...copy.restrictions,...(copy.disabledAccompanyingIds.length?['停用附带：'+label(copy.disabledAccompanyingIds)+' · '+copy.accompanyingNote]:[])].join('\n')+(sources?'\n四牌规则来自：'+sources:'')+'\n当前手牌选择未改变。';
    };
    if(references.length){mountHandRouteReferences(list,this.hand,references,this.run.stage!.disabledIds,discardReferenceCopy(this.run),()=>{if(!isCurrent())return;this.dialog.close(dialog);this.statusMessage='参考已查看 · 自己选牌，出弃由你决定';this.updateControls();},()=>{if(isCurrent())showDeckInspection(this.dialog,this.run);},{budget:handRoutePlayBudget(this.run.stage!.handsLeft),examples:keepIds=>{const input=this.candidateInput();return handRouteTransitions(input,keepIds).map(facts=>handRouteTransitionDraft(input,facts,keepIds,this.assistIds,this.assistProfile&&r2AssistAvailability(this.run).available));},choose:(draft,button)=>chooseExample(draft.facts,button,draft.assistIds),all:()=>{if(isCurrent())this.inspectCandidates(false,null);}});message.textContent='参考只查看，不改当前选择；换牌仍由你决定，不保证补齐。';}
    if(growthOnly&&result.status==='ready'&&!groups.length){message.textContent='当前这些来源没有可新增成长的示例；下方仍可看弃牌、交易或结果时条件，也可正常出牌。成长不是通关必选。';}
    attachFirstChapterGuide(this.run,()=>this.render());
    if(result.status!=='ready'){const pending=document.createElement('p');pending.textContent=result.status==='working'?'正在分片整理，可关闭继续选牌；稍后再查看。':'本轮仅显示可核验的当前选择；完整规则在构筑条件。';list.append(pending);return;}
    for(const group of groups){const section=document.createElement('details'),heading=document.createElement('summary');section.className='candidate-group';section.open=group.type===facts?.type||!!focus&&!growthOnly&&group===groups[0];heading.textContent=HAND_LABELS[group.type]+' · 可选'+[...new Set(group.examples.map(e=>e.playedIds.length))].join('／')+'张';section.append(heading);list.append(section);
      const variants=document.createElement('div'),button=document.createElement('button');variants.className='candidate-variants';button.type='button';button.className='candidate-choice';button.dataset.type=group.type;button.setAttribute('aria-pressed','false');let shown=group.examples[0];
      const display=(example:HandPreview)=>{shown=example;const copy=selectionCopy(example);renderCandidateCards(button,this.hand,example);const caption=document.createElement('span');caption.className='candidate-caption';caption.textContent=copy.membership+(copy.disabledAccompanyingIds.length?'\n停用附带：'+label(copy.disabledAccompanyingIds)+' · 本场计分效果停用':'');const growth=this.run.jokers.map(j=>opportunity(j,example)).filter(g=>g?.status==='ready'&&g.action==='play');if(growth.length)caption.textContent+='\n'+growth.map(g=>g!.name+' · '+g!.label).join('；');button.append(caption);button.setAttribute('aria-label',HAND_LABELS[example.type]+' · '+label(example.playedIds)+' · '+copy.membership);button.dataset.ids=JSON.stringify(example.playedIds);};
      const choose=()=>{chooseExample(shown,button);variants.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.count)===shown.playedIds.length)));};
      for(const example of group.examples){const variant=document.createElement('button');variant.type='button';variant.textContent=example.playedIds.length+'张示例';variant.dataset.count=String(example.playedIds.length);variant.setAttribute('aria-pressed','false');variant.onclick=()=>{display(example);choose();button.scrollIntoView({block:'nearest'});};variants.append(variant);}
      display(shown);button.onclick=choose;section.append(variants,button);
      if(!growthOnly&&group===groups[0])choose();
    }
  }
  private inspectJourney():void {
    showBuildJourney(this.dialog,this.run,{ready:this.ready,onFocus:()=>this.updateControls(),source:id=>this.inspectJoker(id),tools:()=>showConsumables(this.dialog,this.run,this.ready&&!this.pendingRefill&&!this.pendingTouye,(a,seq)=>this.command(a,seq)),tool:id=>showConsumables(this.dialog,this.run,this.ready&&!this.pendingRefill&&!this.pendingTouye,(a,seq)=>this.command(a,seq),id),deck:()=>showDeckInspection(this.dialog,this.run),publicHands:()=>this.inspectCandidates(),continueLabel:'回到牌桌自己选牌',continue:()=>this.dialog.close()});
  }
  private inspectHeldConditions():void {
    const preview=this.selectionPreview();
    this.dialog.open('持有构筑 · '+(preview?'所选条件':'选牌与培养'),this.run.jokers.length?'先看每张来源的条件，选牌后描边和状态随所选更新；实际收益在保存成功后显示。':'尚未持有大丑牌。先选1–5张成型牌，过关后在商店按牌组购买来源。',[{label:'查看成长机会',primary:true,run:()=>this.inspectCandidates(true)},{label:'选择培养方向',run:()=>this.inspectJourney()}],{cards:this.run.jokers.map(j=>({...selectionExperience(this.run,j,this.memoryContext(j,preview)),action:{label:'查看来源与成长',run:()=>this.inspectJoker(j.instanceId)}}))});
  }
  private selectionPreview():HandPreview|undefined {
    if(this.playing||this.presentation||this.run.phase!=='await-input'||this.handsLeft<=0||!this.selectedIds.size||[...this.selectedIds].some(id=>!this.hand.some(card=>card.id===id)))return undefined;
    const context=r2ScoreContext(this.run,this.hand,[...this.selectedIds]);
    const input={hand:this.hand,selectedIds:[...this.selectedIds],disabledIds:this.run.stage!.disabledIds,jokers:this.run.jokers,definitions:this.jokerDefinitions,handRules:context.handRules,ordinaryPointsSuppressedIds:context.ordinaryPointsSuppressedIds};
    return validAssistDraft(input,this.assistProfile&&r2AssistAvailability(this.run).available,this.assistIds)??r2SelectionFacts(input);
  }
  private inspectSelection(facts:HandPreview):void {
    const copy=selectionCopy(facts),label=(ids:string[])=>this.hand.filter(c=>ids.includes(c.id)).map(c=>rankLabel(c.rank)+SUIT_SYMBOL[c.suit]).join('、')||'无';
    this.dialog.open(copy.title,copy.pattern+'\n'+copy.membership+'\n★代表当前计分牌；附带也随本手打出。\n成型：'+label(facts.scoringIds)+'\n附带：'+label(facts.accompanyingIds)+'（随本手打出，仍可参与其他规则）\n'+copy.restrictions.join('\n')+'\n'+copy.fullRules+'\n\n选1–5张；按全部所选牌判型。三条可选3／4／5张，但补成另一对子会转葫芦，第四张同点会转四条。失效牌仍参与判型，其效果停用；点数0只停普通点数。',[{label:'本轮可成牌型',run:()=>this.inspectCandidates()},...(this.run.lastTrace?[{label:'回看上手',run:()=>this.inspectLastTrace()}]:[])],{effectBody:this.run.jokers.length?'所选条件 · 满足不代表已发动':'尚未持有大丑牌；购买后条件列在这里。',cards:this.run.jokers.map(j=>({...selectionExperience(this.run,j,this.memoryContext(j,facts)),action:{label:'查看来源与成长',run:()=>this.inspectJoker(j.instanceId)}})),collapseRules:false});
  }
  private inspectCard(id:string):void {
    const c=this.hand.find(c=>c.id===id);if(!c)return;
    const notice=stageNotice(this.run,[...this.selectedIds]);
    const limitation=notice?.disabledCardIds.includes(id)||notice?.ordinarySuppressedIds.includes(id)?'\n本场限制：'+notice.title+'。'+notice.description:'';
    const index=this.run.handOrder.indexOf(id),facts=this.selectionPreview();
    const assist=validAssistDraft(this.assistInput(),r2AssistAvailability(this.run).available,this.assistIds),group=assist?.assistIds.includes(id)?[...assist.assistIds]:undefined,revision=this.draftRevision();
    const current=()=>this.ready&&!this.presentation&&revision===this.draftRevision()&&(!group||group.length===this.assistIds.length&&group.every(id=>this.assistIds.includes(id)));
    const cancelAssist=()=>{if(!current()){this.dialog.close();this.statusMessage='选择已变化，请重新查看';this.updateControls();return;}this.chooseAssist(group!);this.dialog.close();};
    const role=group?'已选为助攻 · '+(assist!.assistKind==='pair'?'对子':'三条')+' ×'+assist!.assistMultiplier+'\n'+ASSIST_EXPLANATION+'\n不计主手、计分牌或留手效果。':selectionCardCopy(facts,id);
    const dialog=this.dialog.open(rankLabel(c.rank)+SUIT_SYMBOL[c.suit]+' · 手牌详情',role+limitation+'\n★代表当前计分牌；附带牌也随本手打出。停用牌仍参与判型。\n'+cardSpecialText(c)+'\n横滑连续选择；从已选牌开始则连续取消。长按只查看，调序使用下方按钮。',group?[{label:'取消这组助攻',primary:true,disabled:!this.ready,run:cancelAssist}]:[{label:'左移',disabled:!this.ready||index<=0,run:async()=>{await this.moveHandCard(id,-1);if(this.dialog.active(dialog))this.inspectCard(id);}},{label:'右移',disabled:!this.ready||index>=this.hand.length-1,run:async()=>{await this.moveHandCard(id,1);if(this.dialog.active(dialog))this.inspectCard(id);}},{label:this.selectedIds.has(id)?'取消选择':'选择此牌',disabled:!this.ready,run:()=>{if(!current()){this.dialog.close();this.statusMessage='选择已变化，请重新查看';this.updateControls();return;}this.toggleCard(id);this.dialog.close();}}]);
    const face=this.cardPiece(c,{x:0,y:0,width:240,height:336}),image=this.add.renderTexture(0,0,240,336).setVisible(false);
    image.draw(face.container,120,168);face.container.destroy();
    image.snapshot(snapshot=>{
      if(snapshot instanceof HTMLImageElement)this.dialog.attachCardArt(dialog,snapshot.src,rankLabel(c.rank)+SUIT_SYMBOL[c.suit]+' 完整牌面');
      image.destroy();
    });
  }
  private inspectTouye():void {
    const copy=touyeChoice(this.run,[...this.selectedIds]),seq=this.run.commandSeq,ids=[...this.selectedIds];
    const body=TOUYE_RISK+'。\n成型×2；不押普通×1.15。仅付原弃牌成本，不另收金币。\n'+copy.details+(copy.pending?'':'\n先选要弃的牌，再自主选目标；已可达目标不能押。');
    this.dialog.open('骰爷 · '+(copy.pending?'已承诺下一手':'弃前选目标'),body,[{label:'培养手记',run:()=>this.inspectJourney()},...(!copy.pending?copy.choices.map(c=>({label:'押'+c.label+(c.reason?' · '+c.reason:''),disabled:!this.ready||!c.available,run:()=>this.confirmTouye(c.target,copy.snapshotToken,seq,ids,c.accepted)})):[]),{label:'查看物品',run:()=>showConsumables(this.dialog,this.run,this.ready&&!this.pendingTouye,(a,seq)=>this.command(a,seq))},{label:'上一手详情',disabled:!this.run.lastTrace,run:()=>this.inspectLastTrace()}]);
  }
  private confirmTouye(target:TouyeTarget,snapshotToken:string,seq:number,ids:string[],accepted:string):void {
    const cost=r2DiscardCost(this.run),gold=stageNotice(this.run)?.discardGoldCost??0;
    this.dialog.open('押'+HAND_LABELS[target]+' · 弃'+ids.length+'张',TOUYE_RISK+'。\n达成×2，替代普通×1.15。\n当前整手尚未达到；接受：'+accepted+'。\n本次实际弃牌：'+ids.map(id=>{const c=this.hand.find(c=>c.id===id)!;return rankLabel(c.rank)+SUIT_SYMBOL[c.suit];}).join(' ')+'。\n花'+cost+'次弃牌'+(gold?'＋'+gold+'金币':'，不另收金币')+'；确认保存后才补牌，不能取消重抽。',[{label:'押'+HAND_LABELS[target]+'并弃'+ids.length+'张',primary:true,run:()=>{this.dialog.close();void this.discardSelected(false,{target,snapshotToken},seq,ids);}}],{closeLabel:'取消 · 不弃牌'});
  }
  private inspectErxiang():void {
    const seq=this.run.commandSeq,choice=erxiangChoice(this.run,this.selectionPreview(),this.erxiangTargetId);
    this.dialog.open('二响 · 交棒',choice.sentence+(savedErxiangHandoff(this.run)?'\n'+savedErxiangHandoff(this.run):''),[
      ...choice.candidates.map(({card,points})=>({label:(this.erxiangTargetId===card.id?'已选 ':'')+rankLabel(card.rank)+SUIT_SYMBOL[card.suit]+' · '+points+'点改加倍率',primary:this.erxiangTargetId===card.id,disabled:!this.ready,run:()=>{if(!this.ready||this.run.commandSeq!==seq||!erxiangChoice(this.run,this.selectionPreview()).candidates.some(c=>c.card.id===card.id))return;this.erxiangTargetId=card.id;this.dialog.close();this.refreshSelection();}})),
      ...(this.erxiangTargetId?[{label:'取消本手交棒',run:()=>{this.erxiangTargetId=null;this.dialog.close();this.refreshSelection();}}]:[]),
      {label:'上一手详情',disabled:!this.run.lastTrace,run:()=>this.inspectLastTrace()},
    ]);
  }
  private inspectRole():void {
    if(usesErxiangHandoff(this.run)){this.inspectErxiang();return;}
    if(usesTouyeWager(this.run)){this.inspectTouye();return;}
    if(this.pendingRefill){this.dialog.close();this.reopenRefill();return;}
    const c=characterForRun(this.run),stage=this.run.stage!,notice=stageNotice(this.run),ability=r2RunModeConfig(this.run).characterAbilityEnabled;
    const challenge=R2_MODE_CATALOG.challenges.find(row=>row.id===this.run.challengeId);
    const xiemu=usesXiemuBurn(this.run)?xiemuChoice(this.run,this.selectionPreview()?.type,this.xiemuBurn):undefined;
    const azao=usesAzaoCharge(this.run)?azaoChoice(this.run,this.selectionPreview()?.type):undefined;
    const roleState=xiemu?xiemu.details:azao?azao.compact+'\n'+azao.hold+'\n默认不释放；在确认出牌前选择，取消不消耗。':!ability?'本次挑战关闭角色被动、初始赠送与押注。':notice?.wagerDisabled?'静场：本场角色计分与押注停用；非计分过关奖励保留。':this.characterId==='xiemu'?(stage.handsLeft===1?'当前为最后一手：倍率 ×2，过关额外 +2 金。':'距离最后一手还有 '+(stage.handsLeft-1)+' 次。'):this.characterId==='touye'?(stage.wagerUsed?'本场押注已用。':stage.wagerSelected?'本手已押注：50% ×2 / 50% ×0.75。':'本场押注未用；默认倍率 ×1.15。'):'';
    const body=(savedXiemuBurn(this.run)?savedXiemuBurn(this.run)+'\n\n':'')+(savedAzaoCharge(this.run)?savedAzaoCharge(this.run)+'\n\n':'')+(challenge?challenge.name+'：'+challenge.description+'\n\n':'')+(xiemu?roleState+'\n'+(ability?c.passiveDescription:''):(ability?c.passiveDescription+'\n':'')+roleState)+'\n'+this.stage.name+'：'+this.stage.intro+'\n'+(notice?.warning?notice.details+'\n':'')+(stage.boss?'本场压轴':'本章压轴预告')+' '+r2BossText(stage.boss??this.run.boss)+'\n弃牌成本：'+r2DiscardCost(this.run)+(notice?.discardGoldCost?' 次 +1金币':' 次')+'；本场已弃 '+stage.discardsUsed+' 次。\n当前手牌上限 '+stage.handLimit+'，扩容修正后的硬上限14。\n'+(this.run.jokers.some(joker=>joker.definitionId==='c08')?'少一级：普通顺子可用4张，A234合法；同花顺仍须5张。\n':'')+(this.run.safetyNetUsed?'安全网本局已经使用，不会再次触发。':this.run.jokers.some(joker=>joker.definitionId==='f07')?'安全网：耗尽出牌且仍有可用手牌时救场一次，成功过关不触发。':'');
    const dialog=this.dialog.open(c.name+' · 角色与本场规则',body,[{label:'培养手记',run:()=>this.inspectJourney()},...(usesLaohuanRefill(this.run)?[{label:this.run.stage?.laohuanTrickUsed?'本场戏法已用':!r2RunModeConfig(this.run).characterAbilityEnabled?'本场戏法停用':'戏法弃'+this.selectedIds.size+'张 · 留应补数',primary:true,disabled:!this.ready||this.run.phase!=='await-input'||!this.selectedIds.size||this.selectedIds.size>5||!!this.run.stage?.laohuanTrickUsed||!r2RunModeConfig(this.run).characterAbilityEnabled||this.run.stage!.discardsLeft<r2DiscardCost(this.run)||this.run.gold<(stageNotice(this.run)?.discardGoldCost??0),run:()=>{this.dialog.close();void this.discardSelected(true);}}]:[]),...(xiemu?[...xiemu.choices.map(choice=>({label:this.xiemuBurn===choice.cost?'已选'+choice.label:choice.label,primary:this.xiemuBurn===choice.cost,disabled:!this.ready||!choice.available,run:()=>{if(!this.ready||!xiemuChoice(this.run,this.selectionPreview()?.type).choices.find(c=>c.cost===choice.cost)?.available)return;this.xiemuBurn=choice.cost;this.dialog.close();this.updateControls();}})),...(this.xiemuBurn?[{label:'取消本手燃金',run:()=>{this.xiemuBurn=0;this.dialog.close();this.updateControls();}}]:[])]:[]),...(azao?[{label:this.azaoRelease?'取消本手释放':azao.available?'本手释放 ×'+azao.multiplier:'先选两对及以上，才能释放',primary:true,disabled:!this.ready||(!this.azaoRelease&&!azao.available),run:()=>{if(!this.ready||!azaoChoice(this.run,this.selectionPreview()?.type).available){this.erxiangTargetId=null;this.azaoRelease=false;this.xiemuBurn=0;this.dialog.close();this.updateControls();return;}this.azaoRelease=!this.azaoRelease;this.dialog.close();this.updateControls();}}]:[]),{label:'查看物品',run:()=>showConsumables(this.dialog,this.run,this.ready&&!this.pendingRefill&&!this.pendingTouye,(a,seq)=>this.command(a,seq))},{label:'上一手详情',disabled:!this.run.lastTrace,run:()=>this.inspectLastTrace()},...(this.run.program?[{label:'本章节目单',run:()=>showPrograms(this.dialog,this.run,this.ready&&!this.pendingTouye,(a,seq)=>this.command(a,seq))}]:[]),...(this.characterId==='touye'?[{label:notice?.wagerDisabled?'本场不能押注':stage.wagerSelected?'取消本手押注':'押注本手',disabled:!this.ready||stage.wagerUsed||notice?.wagerDisabled,run:async()=>{await this.command({type:'SetWager',enabled:!stage.wagerSelected});if(this.dialog.active(dialog))this.inspectRole();}}]:[])],{portrait:{url:portraitURL(c.id),alt:c.name+'完整立绘'}});
  }
  private inspectJoker(id:string):void {
    const j=this.run.jokers.find(j=>j.instanceId===id);if(!j)return;const d=this.jokerDefinition(j.definitionId),index=this.run.jokers.indexOf(j),art=jokerArtUrl(d.id),artKey=jokerArtKey(d.id),rarity=JOKER_RARITY[d.rarity];
    const move=async(delta:number)=>{const current=this.run.jokers.map(j=>j.instanceId),ids=reorderJokerIds(current,id,current.indexOf(id)+delta);if(ids===current)return;await this.command({type:'ReorderJokers',ids});if(this.dialog.active(dialog))this.inspectJoker(id);};
    const notice=stageNotice(this.run),reason=this.jokerRestriction(j),restriction=reason?'\n'+reason:'';
    const ability=this.jokerAbility(j,this.selectionPreview()),growth=groupGrowthCausality(this.run,j);
    const body=ability?rarity.label+restriction+'\n版次：'+editionEffectText(j.edition)+'\n第 '+(index+1)+' 槽'+(notice?.jokerScoreDirection==='right-to-left'?' · 从右向左结算':' · 从左向右结算')+'。\n用下方按钮调序；出售须在商店确认。':rarity.symbol+' '+rarity.label+' · 当前 '+this.jokerValue(j)+restriction+'\n'+editionEffectText(j.edition)+'\n'+d.description+r2JokerExtraHelp(d)+'\n当前实例：'+r2JokerStateText(j,d)+'\n第 '+(index+1)+' 槽'+(notice?.jokerScoreDirection==='right-to-left'?' · 整手计分从右向左':' · 整手计分从左向右')+'；长按后拖动可调序，出售只在商店确认。';
    const dialog=this.dialog.open(d.name,body,[
      ...(growth?[{label:'成长因果',disabled:!this.ready,run:()=>{const saved=groupGrowthCausality(this.run,j);if(saved)this.dialog.open(saved.title,saved.body);}}]:[]),
      {label:'左移',disabled:!this.ready||!!this.pendingTouye||index===0,run:()=>move(-1)},{label:'右移',disabled:!this.ready||!!this.pendingTouye||index===this.run.jokers.length-1,run:()=>move(1)},
    ],{rarity:d.rarity,artLoad:{status:jokerArtLoadState(this,d.id).status,readStatus:()=>jokerArtLoadState(this,d.id).status,retry:()=>retryJokerArt(this,[d.id],()=>{this.dialog.refreshArtLoad();if(!this.presentation&&!this.playing)this.render();})},ability,collapseRules:!!ability,...(ability?{editionBody:'版次：'+editionEffectText(j.edition).split('。')[0]+(restriction?' · '+(this.presentation?'本手暂停':'当前暂停'):'')} :{}),...(j.definitionId==='f09'?{f09:{inactive:!!restriction,bodyInactive:this.presentation?ability?.bodyActive===false:(this.run.stage?.discardsUsed??0)>0,reduced:this.reducedMotion,alignedLayers:jokerArtAlignedLayers(j.definitionId),reason:restriction||undefined}}:{}),...(art?{portrait:{url:art,thumbnailUrl:jokerArtPreviewUrl(d.id),alt:d.name+'完整卡面',layout:'card' as const,caption:d.name}}:{})});
    markRouteDetail(dialog,routeFitCue(this.run,'jokers',d.id,j.instanceId));
    if(!artKey||!this.textures.exists(artKey))this.attachJokerFallback(dialog,d.id);
  }
  private attachJokerFallback(dialog:HTMLDialogElement,definitionId:string):void {
    const face=this.add.container(),paper=this.add.graphics().fillStyle(0xfff7e5).fillRoundedRect(0,0,240,336,10).lineStyle(3,0xb69866).strokeRoundedRect(2,2,236,332,10);
    face.add([paper,this.add.text(120,14,this.jokerDefinition(definitionId).name,{fontFamily:UI_FONT,fontSize:'20px',color:'#203744'}).setOrigin(.5,0)]);
    drawJokerMotif(this,face,definitionId,120,166,192,this.jokerDefinition(definitionId));
    const image=this.add.renderTexture(0,0,240,336).setVisible(false);image.draw(face);face.destroy();
    image.snapshot(snapshot=>{if(snapshot instanceof HTMLImageElement)this.dialog.attachCardArt(dialog,snapshot.src,this.jokerDefinition(definitionId).name+'机制示意卡面','mechanism');image.destroy();});
  }
  private inspectDeck():void {
    if(this.scene.isActive())showDeckInspection(this.dialog,this.run);
  }
  private async command(action:import('../domain/run').Action,expectedSeq?:number):Promise<boolean> {
    if(!this.ready)return false;this.clearHover();this.cancelAiCandidates();this.playing=true;const lifecycle=this.lifecycle,intent=++this.intent;this.updateControls();
    const focusedId=this.hand[this.focusIndex]?.id,beforeTool=this.run,toolOwner=action.type==='UseConsumable'?this.dialog.current:undefined;
    const beforeGold=this.run.gold,beforeDiscards=this.run.stage?.discardsLeft,beforeHand=this.hand,used=action.type==='UseConsumable'?this.run.consumables.find(item=>item.instanceId===action.instanceId):undefined;
    try {
      const result=await dispatchRun(this,action,expectedSeq);if(!this.alive(lifecycle,intent))return false;
      if(!result.ok){this.statusMessage=result.code==='stale-sequence'?'预览已过期，请重新打开；本次没有消耗物品或资源。':'操作未提交：'+result.code;return false;}
      this.run=result.state;this.refreshToolInventory();this.statusMessage='';
      if(action.type==='ReorderHand'){if(focusedId)this.focusIndex=Math.max(0,this.run.handOrder.indexOf(focusedId));this.showFocusedCard();this.renderHand();}
      else if(action.type==='ReorderJokers'||action.type==='DestroyConsumable')this.render();
      if(used){
        this.toolHand=beforeHand;
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
        if(this.alive(lifecycle,intent)){this.toolHand=undefined;this.render();if(action.type==='UseConsumable'&&!result.duplicate&&toolOwner&&this.dialog.active(toolOwner))showSavedToolResult(this.dialog,beforeTool,this.run,action,this.reducedMotion);}
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
    if(!this.ready||this.presentation||this.run.phase!=='await-input')return;
    this.handInput?.cancel();this.view.cancelInteraction();
    this.erxiangTargetId=null;this.azaoRelease=false;this.xiemuBurn=0;this.selectedIds.clear();this.assistIds=[];this.assistPage=0;this.candidateGhost=undefined;this.candidateUndo=undefined;this.aiCursor=undefined;this.statusMessage='';
    this.refreshSelection();
    const cards=[...this.hand].sort((a,b)=>mode==='rank'?b.rank-a.rank||SUITS.indexOf(a.suit)-SUITS.indexOf(b.suit):SUITS.indexOf(a.suit)-SUITS.indexOf(b.suit)||b.rank-a.rank);
    const before=this.handPositions();
    if(await this.command({type:'ReorderHand',ids:cards.map(c=>c.id)})){this.statusMessage=(mode==='rank'?'点数':'花色')+'已排序';this.slideHandFrom(before);this.updateControls();this.showHandHint();}
  }
  private readonly stopHandHint=():void=>{
    this.handHintTimer?.remove();this.handHintTimer=undefined;
    if(!this.handHint)return;this.handHint=false;
    if(this.controlsLive&&this.statusText?.active&&this.scene.isActive())this.updateControls();
  };
  private readonly hintVisibility=()=>{if(document.hidden){if(this.presentation)this.fastForward();this.stopHandHint();this.handInput?.cancel('blur');this.candidateGhost=undefined;this.candidates.dispose();this.aiCandidates.dispose();this.aiCursor=undefined;}else if(this.run?.phase==='await-input'&&!this.playing&&!this.presentation&&this.scene.isActive())this.refreshSelection();};
  private showHandHint(claim=true):void {
    if(!this.view||!this.ready||this.handHint)return;
    const cards=this.view.layout.cards.filter(card=>card.visible);if(cards.length<2||claim&&!this.sweepHint.claim())return;
    this.handHint=true;this.updateControls();
    this.handHintTimer=this.time.delayedCall((this.reducedMotion?3000:1860)*gameSession().speed,this.stopHandHint);
  }
  private async moveHandCard(id:string,delta:-1|1):Promise<void> {const ids=[...this.run.handOrder],from=ids.indexOf(id),to=from+delta;if(from<0||to<0||to>=ids.length)return;const before=this.handPositions();ids.splice(from,1);ids.splice(to,0,id);if(await this.command({type:'ReorderHand',ids}))this.slideHandFrom(before);}
  private async reorderJoker(id:string,x:number):Promise<void> {if(this.pendingTouye)return;const current=this.run.jokers.map(j=>j.instanceId),l=this.view.layout,to=l.slots.findIndex((b,i)=>x>=b.x&&x<=b.x+b.width+(l.mode==='landscape'?l.jokerLabels[i].width+6:0)),ids=reorderJokerIds(current,id,to);if(ids===current)return;await this.command({type:'ReorderJokers',ids});}

  /** Denied actions shake the offending card instead of only showing text. */
  private wiggleCard(view:CardView,index:number):void {
    if(this.reducedMotion||!view.container.active)return;
    const base=view.container.angle;
    this.tweens.killTweensOf(view.container);
    this.tweens.add({targets:view.container,angle:base+3.4,duration:52,yoyo:true,repeat:3,ease:'Sine.easeInOut',onComplete:()=>this.restingCard(view,index,true)});
  }

  private applyHandSelection(update:HandSelectionUpdate):void {
    this.sweepHint.observe(update);
    if(update.phase==='pending'&&!this.assistGestureStart)this.assistGestureStart=[...this.assistIds];
    if(update.phase==='cancelled'&&this.assistGestureStart)this.assistIds=[...this.assistGestureStart];
    if(['committed','interrupted','cancelled'].includes(update.phase))this.assistGestureStart=undefined;
    const previous=this.selectedIds,next=new Set(update.selectedIds),changed=previous.size!==next.size||[...previous].some(id=>!next.has(id));
    this.statusMessage=update.limitReached?'每手最多选择 5 张牌':'';
    if(!changed){if(update.limitReached)this.updateControls();return;}
    const endedUndo=!!this.candidateUndo;this.aiCursor=undefined;this.candidateUndo=undefined;this.candidateGhost=undefined;this.azaoRelease=false;this.xiemuBurn=0;this.selectedIds=next;this.validateAssistSelection();if(endedUndo&&!update.limitReached&&this.statusMessage!=='主手或可用条件已变化，助攻已取消')this.statusMessage='已手动改选，换组撤销已结束';
    const changedViews=this.cardViews.filter(view=>previous.has(view.card.id)!==next.has(view.card.id));changedViews.forEach(view=>this.revealCard(view));
    if(update.phase!=='cancelled'){if(update.mode==='select')this.audio.select();else this.audio.deselect();}
    // Batch a fast crossing into one preview; no rules command, RNG or save is touched.
    this.refreshSelection(update.phase==='committed'&&changedViews.length===1?changedViews[0].card.id:undefined);
  }

  private toggleCard(id: string): void {
    if (!this.ready||this.refillHidden) return;
    this.erxiangTargetId=null;this.azaoRelease=false;this.xiemuBurn=0;
    const view=this.cardViews.find(view=>view.card.id===id);if(view)this.revealCard(view);
    this.statusMessage='';
    if(!this.selectedIds.has(id)&&this.selectedIds.size>=this.selectionLimit){this.statusMessage='每手最多选择 5 张牌';this.audio.invalid();if(view)this.wiggleCard(view,this.cardViews.indexOf(view));this.updateControls();return;}
    if(this.candidateUndo)this.statusMessage='已手动改选，换组撤销已结束';this.aiCursor=undefined;this.candidateUndo=undefined;this.candidateGhost=undefined;
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);this.audio.deselect();
    } else {
      if (this.selectedIds.size >= this.selectionLimit) {this.statusMessage='每手最多选择 5 张牌';this.audio.invalid();if(view)this.wiggleCard(view,this.cardViews.indexOf(view));this.updateControls();return;}
      this.selectedIds.add(id);this.audio.select();
    }
    this.selectedIds=new Set(this.hand.filter(card=>this.selectedIds.has(card.id)).map(card=>card.id));
    this.validateAssistSelection();this.refreshSelection(id);
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
    const frame=this.roleFrame;if(this.view.layout.mode!=='portrait'||!usesErxiangHandoff(this.run)&&!usesAzaoCharge(this.run)&&!usesXiemuBurn(this.run)&&!usesLaohuanRefill(this.run))this.roleText.setText(note);frame.setFillStyle(T.brass,.16).setStrokeStyle(4,T.brass);
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
    const rest={y:source.y,angle:source.angle,scaleX:source.scaleX,scaleY:source.scaleY},width=frame.width,height=frame.height,top=frame.getBounds().y,slotLocked=[...this.jokerViews.values()].includes(source),lift=slotLocked?0:Math.min(strong?16:12,height*.14,Math.max(0,top-8)*.5),factor=slotLocked?1:top<24?1.035:strong?1.1:1.055,glow=this.add.graphics();
    glow.fillStyle(color,.2).fillRoundedRect(-width/2-5,-height/2-5,width+10,height+10,7);
    glow.lineStyle(strong?3:2,0x80551f,.85).strokeRoundedRect(-width/2-3,-height/2-3,width+6,height+6,6);source.addAt(glow,0);
    try {
      if(beat){
        const rise=Math.min(180,beat.windup);
        await this.animate({targets:source,y:rest.y-lift*.6,angle:rest.angle,scaleX:rest.scaleX*factor,scaleY:rest.scaleY*factor,duration:rise,ease:'Sine.easeOut'},context);
        await (impact??this.wait(Math.max(0,beat.windup+beat.flight-rise),context));
        if(context.signal.aborted)return;
        // Source impact happens at the same point as the incoming packet / number / sound.
        await this.animate({targets:source,angle:rest.angle+(slotLocked?0:strong?5:3),duration:beat.impact/5,yoyo:true,repeat:1,ease:'Sine.easeInOut'},context);
        await this.animate({targets:source,...rest,duration:beat.impact/5,ease:'Sine.easeOut'},context);
        return;
      }
      await this.animate({targets:source,y:rest.y-lift,angle:slotLocked?rest.angle:strong?-5:-3,scaleX:rest.scaleX*factor,scaleY:rest.scaleY*factor,duration:duration*.2,ease:'Back.easeOut'},context);
      if(context.signal.aborted)return;
      await this.animate({targets:source,angle:slotLocked?rest.angle:strong?4:2,duration:duration*.075,yoyo:true,ease:'Sine.easeInOut'},context);
      await this.wait(duration*.4,context);
      await this.animate({targets:source,...rest,duration:duration*.25,ease:'Sine.easeOut'},context);
    } finally {glow.destroy();if(source.active)source.setY(rest.y).setAngle(rest.angle).setScale(rest.scaleX,rest.scaleY);}
  }

  private formatBreakdown(score: ScoreTrace): string {
    const first=score.events[0].after,impact=savedBossImpact(this.run,score);
    return '牌型 '+fractionText(first.H)+' 热度 × '+fractionText(first.M)+' 倍率\n'
      +'计分 '+score.sets.activeScoringIds.length+' 张 / '+(this.assistProfile?'主手':'打出')+' '+score.sets.playedIds.length+' 张\n'
      +(score.assist?savedAssistCopy(score)+'\n':'')
      +(impact?impact+'\n':'')
      +'结算 '+fractionText(score.accumulator.H)+' × '+fractionText(score.accumulator.M)+' = '+heatText(score.finalScore);
  }

  private previewSelection(preview?:HandPreview):void {
    this.stopScoreFire();this.breakdownText.setText('').setVisible(false);
    this.scoreLabels.forEach(label=>label.setVisible(false));
    [this.scoreHeat,this.scoreMult,this.scoreTotal].forEach(text=>text.setText('').setData('fullText','').setData('eventId',undefined).setData('eventPhase',undefined).setVisible(false));
    (this.view.root.list.find(o=>o.name==='score/total-pedestal') as Phaser.GameObjects.Graphics|undefined)?.setVisible(false);
    const score=this.view.layout.scoreBoard;
    this.resultText.setVisible(true).setText(preview?selectionCopy(preview).title:'当前选择 · 选1–5张');
    fitScoreLine(this.resultText,{x:score.x+10,y:score.y+(score.height<90?4:7),width:score.width-20-(this.selectionQuickInScore(score)?104:0),height:score.height<90?18:30},score.height<90?18:24);
  }
  /** Reflow real text bounds inside the reserved score/body/fire lanes. */
  private fitScoreReadouts():void {
    if(!this.scoreHeat?.active)return;
    const l=this.view.layout,s=l.scoreBoard;
    const caption={x:s.x+8,y:s.y+(s.height>=108?4:1),width:s.height>=108?s.width-16:s.width*.52-16,height:s.height>=108?20:17};
    fitScoreLine(this.resultText,caption,14);
    const cells=scoreCells(s),impactCell=scoreImpactCell(s),texts=[this.scoreHeat,this.scoreMult,this.scoreTotal];
    this.scoreLabels.forEach((text,i)=>{text.setVisible(i!==2||s.height>=108);fitScoreLine(text,{x:cells[i].x,y:i===2?impactCell.y-34:cells[i].y-18,width:cells[i].width,height:18},14);});
    texts.forEach((text,i)=>{
      const cell=i===2?impactCell:cells[i];
      text.setFontFamily(SCORE_FONT).setFontStyle('800');
      fitScoreLine(text,cell,i===2?(s.height>=108?44:28):22,true);
      const pulse=Number(text.getData('scorePulseScale')??1);
      text.setOrigin(.5).setPosition(cell.x+cell.width/2,cell.y+cell.height/2+Number(text.getData('scorePulseY')??0));
      text.setScale(Math.min(pulse,cell.width/Math.max(1,text.width),cell.height/Math.max(1,text.height)));
    });
    const guarded=[this.resultText,...this.scoreLabels,...texts,this.breakdownText,this.previousHandText].filter(t=>t?.active&&t.visible);
    const bodies=[...this.cardViews.map(v=>v.container),...[...this.settledCards.values()].map(v=>v.container),
      ...this.jokerViews.values(),this.roleFrame,this.playButton,this.discardButton,this.rankButton,this.suitButton,...(this.inventoryButton?[this.inventoryButton]:[])];
    const guards=[caption,...guarded.map(t=>{const b=t.getBounds();return {x:b.x-5-b.width*.04,y:b.y-3,width:b.width*1.08+10,height:b.height*1.08+6};}),
      ...bodies.filter(o=>o?.active&&o.visible).map(o=>{const b=o.getBounds();return {x:b.x-3,y:b.y-3,width:b.width+6,height:b.height+6};}),
      ...Object.values(l.buttons),...Object.values(l.tableActions)];
    this.scoreFlame?.setGuards(guards);
  }

  private async showJokerTransaction(event:Extract<DomainEvent,{type:'joker-transaction'}>,context:EffectContext,savedGrowth?:string):Promise<void> {
    if(context.signal.aborted)return;
    const note=savedGrowth??r2TransactionText(event,this.jokerDefinition(event.definitionId)),view=this.jokerViews.get(event.instanceId),frame=view?.getData('frame') as Phaser.GameObjects.Rectangle|undefined;
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

  private async discardSelected(trick=false,bet?:TouyeBet,seq?:number,committedIds?:string[]):Promise<void> {
    if(this.pendingTouye)return;
    if(this.pendingRefill){if(!this.ready)return;this.refillHidden=!this.refillHidden;this.selectedIds.clear();this.statusMessage='';this.render();return;}
    if(!this.ready||!this.selectedIds.size||this.run.stage!.discardsLeft<r2DiscardCost(this.run))return;this.clearHover();this.cancelAiCandidates();this.playing=true;this.statusMessage='';this.updateControls();const lifecycle=this.lifecycle,intent=++this.intent,previousRun=this.run,selectedIds=committedIds??[...this.selectedIds],previousIds=[...this.run.handOrder],beforeDiscards=this.run.stage!.discardsLeft,spentDiscards=beforeDiscards-r2DiscardCost(this.run);
    try {
      const result=await dispatchRun(this,{type:'DiscardHand',selectedIds,...(trick?{laohuanTrick:true}:{}),...(bet?{touyeBet:bet}:{})},seq);
      if(!this.alive(lifecycle,intent))return;
      if(!result.ok||result.duplicate){if(!result.ok)this.statusMessage=result.code==='touye-stale-snapshot'||result.code==='stale-sequence'?'赌约预览已过期，请重新选择；本次未弃牌':result.code==='touye-target-already-reachable'?'当前整手已可达这个目标，不能押':result.code==='touye-next-hand-locked'?'已押下一手，不能再弃牌':result.code==='touye-disabled'?'本场能力停用':result.code==='not-enough-gold'?'弃牌需要1金币；本次未扣费，仍可出牌':result.code==='no-discards-left'?'本场弃牌次数已用完':result.code==='save-failed'?'未保存，请在菜单中重试或导出':'请选择 1～5 张牌再弃牌';return;}
      const discarded=this.cardViews.filter(view=>selectedIds.includes(view.card.id));
      this.run=result.state;this.audio.discard();this.effects.clear();this.updateHud();
      const handArea=this.view.layout.hand;
      this.effects.enqueue(context=>Promise.all([this.pulseResource('discard',beforeDiscards,context,spentDiscards),...discarded.map((view,i)=>this.animate({targets:view.container,x:view.container.x-64-i*14,y:handArea.y+handArea.height+190,angle:-26,scaleX:.82,scaleY:.82,alpha:0,duration:this.reducedMotion?20:210,delay:this.reducedMotion?0:i*38,ease:'Cubic.easeIn'},context))]).then(()=>undefined));
      if(trick&&result.events.some(event=>event.type==='cards-discarded'))this.effects.enqueue(context=>this.animateRole(this.pendingRefill?'老幻·候选已存，待留牌':'老幻·候选不足，已全留',this.reducedMotion?120:180,context));
      for(const event of result.events)if(event.type==='joker-transaction')this.effects.enqueue(context=>this.showJokerTransaction(event,context,transactionGrowthChange(previousRun,result.state,event,true)));
      for(const event of result.events)if(event.type==='boss-transaction')this.effects.enqueue(async context=>{
        const target=event.operation==='charge-discard'?this.goldText:this.heatText,b=target.getBounds();
        this.audio.sourceCue('boss');await Promise.all([this.floatNote(event.operation==='charge-discard'?'-1 金币':'目标 +'+heatText(event.amount),b.x+b.width/2,b.y+b.height,'#ffd0a2',this.reducedMotion?180:460,context),this.reducedMotion?this.wait(180,context):this.animate({targets:target,scale:{from:1.14,to:1},duration:360,ease:'Back.easeOut'},context)]);
      });
      await this.effects.drain();if(!this.alive(lifecycle,intent))return;
      this.erxiangTargetId=null;this.azaoRelease=false;this.xiemuBurn=0;this.selectedIds.clear();this.assistIds=[];this.assistGestureStart=undefined;this.statusMessage=bet||this.pendingRefill?'':result.events.flatMap(event=>event.type==='joker-transaction'?[transactionGrowthChange(previousRun,result.state,event,true)].filter(Boolean):[])[0]??(trick?'老幻·戏法已保存 · 候选不足，全留':'已弃 '+selectedIds.length+' 张 · '+(this.deck.length?'补抽完成':'牌堆已空'));this.updateHud();this.renderHand();this.revealDrawnCards(previousIds);
      if(this.run.phase==='run-lost')this.finishStage(false);
    } finally {if(this.alive(lifecycle,intent)&&['await-input','pending-refill'].includes(this.run.phase)){this.playing=false;this.refreshSelection();}}
  }

  private async chooseRefill():Promise<void> {
    const pending=this.pendingRefill;if(!pending||!this.ready||this.refillHidden||this.selectedIds.size!==pending.required)return;const ids=[...this.selectedIds],lifecycle=this.lifecycle,intent=++this.intent;this.playing=true;this.updateControls();try{const result=await dispatchRun(this,{type:'ChooseRefill',selectedIds:ids});if(!this.alive(lifecycle,intent))return;if(!result.ok){this.statusMessage=result.code==='save-failed'?'补牌未保存 · 菜单重试同一选择':'请留够指定张数';return;}this.run=result.state;this.selectedIds.clear();this.refillHidden=false;this.statusMessage='老幻·已保存留'+ids.length+'张 · 其余本场不再抽';this.renderHand();this.updateHud();}finally{if(this.alive(lifecycle,intent)){this.playing=false;this.refreshSelection();}}
  }
  private async playSelected():Promise<void> {
    if(this.pendingRefill){await this.chooseRefill();return;}
    if(!this.ready||this.selectedIds.size===0||this.handsLeft<=0)return;
    const erxiangTargetId=this.erxiangTargetId,xiemuBurn=this.xiemuBurn,azaoRelease=this.azaoRelease,selectedIds=[...this.selectedIds],assistIds=[...this.assistIds],lifecycle=this.lifecycle,intent=++this.intent,beforeHeat=this.heat,previousTrace=this.run.lastTrace,beforeHands=this.handsLeft,beforeGold=this.run.gold;
    this.clearHover();this.cancelAiCandidates();this.playing=true;this.statusMessage='';this.updateControls();
    const selectedViews=this.cardViews.filter(v=>selectedIds.includes(v.card.id)||assistIds.includes(v.card.id));
    try {
      const result=await dispatchRun(this,assistIds.length?{type:'PlayAssistedHand',selectedIds,assistIds}:{type:'PlayHand',selectedIds,...(usesErxiangHandoff(this.run)&&erxiangTargetId?{erxiangTargetId}:{}),...(usesAzaoCharge(this.run)?{azaoRelease}:{}),...(usesXiemuBurn(this.run)&&xiemuBurn?{xiemuBurn:xiemuBurn as 10|20|30}:{})});
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
    if(event.reasonKey==='erxiang.handoff')return fractionText(event.value)+'点热度 → 倍率（首次普通计分）';
    return r2ScoreOperationText(event,event.sourceType==='joker'?this.jokerDefinition(event.sourceDefinitionId):undefined);
  }
  private eventSource(event:ScoreEvent):string {
    const edition=event.reasonKey.startsWith('edition.')?editionLabel(event.reasonKey.split('.')[1] as PlayingCard['edition'])+' · ':'';
    if(event.sourceType==='joker')return edition+this.jokerDefinition(event.sourceDefinitionId).name;
    if(event.sourceType==='character'&&(event.reasonKey.startsWith('touye.won.')||event.reasonKey.startsWith('touye.lost.')))return '骰爷 · 押'+HAND_LABELS[event.reasonKey.split('.')[2] as TouyeTarget]+(event.reasonKey.startsWith('touye.won.')?'达成':'未成');
    if(event.sourceType==='character')return getCharacter(this.characterId).name+(event.reasonKey.startsWith('amo.assist.')?' · 助攻':'');
    const card=(this.presentation?.score??this.run.lastTrace)?.cards.find(card=>card.id===event.targetCardId);
    const item=R2_LONG_TERM_ITEMS.find(item=>item.id===event.sourceDefinitionId),tool=R2_TOOLS.find(tool=>tool.id===event.sourceDefinitionId),program=R2_MODE_CATALOG.programs.find(program=>program.id===event.sourceDefinitionId);
    const boss=R2_BOSSES.find(boss=>boss.id===event.sourceDefinitionId),sealed=(this.presentation?.score??this.run.lastTrace)?.sourceJokers.find(joker=>joker.instanceId===event.targetJokerInstanceId);
    return item?.name??tool?.name??program?.name??(boss?boss.name+(sealed?' · '+this.jokerDefinition(sealed.definitionId).name:''):card?edition+rankLabel(card.rank)+SUIT_SYMBOL[card.suit]:HAND_LABELS[event.sourceDefinitionId as keyof typeof HAND_LABELS]??'计分牌');
  }
  private setAccumulator(value:Accumulator):void {
    this.scoreHeat.setText(fractionText(value.H));this.scoreMult.setText('× '+fractionText(value.M));
    this.setDisplayedProduct(Rational.fromJSON(value.H).multiply(Rational.fromJSON(value.M)).floor().toString());
  }
  private setDisplayedProduct(product:string):void {
    this.displayedScoreProduct=product;this.scoreTotal.setText(heatText(product));this.fitScoreReadouts();this.refreshScoreFire(product);
  }
  private ensureScoreFlame():ScoreFlame {
    if(!this.scoreFlame){const l=this.view.layout;this.scoreFlame=new ScoreFlame(this,this.view.root,l.scoreBoard,{x:4,y:4,width:l.width-8,height:l.height-8});}
    return this.scoreFlame;
  }
  private refreshScoreFire(product:string):void {
    const presentation=this.presentation;if(!presentation)return;
    const level=scoreFireLevel(presentation.originHeat,product,this.stage.targetHeat);
    if(level)this.ensureScoreFlame();
    this.scoreFlame?.set(level,this.reducedMotion||presentation.replay);
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
  private pulseAccumulator(event:ScoreEvent,duration:number,context:EffectContext,impact?:NumberImpact):Promise<void> {
    if(this.reducedMotion)return Promise.resolve();
    const targets=[];
    if(event.before.H.n!==event.after.H.n||event.before.H.d!==event.after.H.d)targets.push(this.scoreHeat);
    if(event.before.M.n!==event.after.M.n||event.before.M.d!==event.after.M.d)targets.push(this.scoreMult);
    if(targets.length)targets.push(this.scoreTotal);
    const strength=scoreBeat(event).strength,level=this.presentation?scoreFireLevel(this.presentation.originHeat,this.displayedScoreProduct,this.stage.targetHeat):0,scale=Math.min(1.4,(strength==='multiply'?1.34:strength==='role'?1.3:1.28)+level*.02);
    return Promise.all(targets.map(target=>this.pulseScoreNumber(target,impact?.peak??scale,duration,context,impact?.kind??'add'))).then(()=>undefined);
  }
  private async pulseScoreNumber(text:Phaser.GameObjects.Text,requested:number,duration:number,context:EffectContext,kind:NumberImpact['kind']='key'):Promise<void> {
    if(this.reducedMotion||context.signal.aborted||this.presentation?.replay)return;
    const pulse={t:0};
    text.setData('scorePulseScale',numberPulse(0,kind,requested).scale);this.fitScoreReadouts();
    try {
      await this.animate({targets:pulse,t:1,duration:Math.min(260,duration),ease:'Linear',onUpdate:()=>{
        if(!text.active||context.signal.aborted)return;
        const pose=numberPulse(pulse.t,kind,requested);text.setData('scorePulseScale',pose.scale).setData('scorePulseY',pose.lift);this.fitScoreReadouts();
      }},context);
    } finally {if(text.active){text.setData('scorePulseScale',1).setData('scorePulseY',0).setScale(1);this.fitScoreReadouts();}}
  }
  private impactAccumulator(event:ScoreEvent,_duration:number,context:EffectContext,impact?:NumberImpact):Promise<void> {
    if(context.signal.aborted||!this.presentation)return Promise.resolve();
    const positive=Rational.fromJSON(event.after.H).compare(Rational.fromJSON(event.before.H))>0||Rational.fromJSON(event.after.M).compare(Rational.fromJSON(event.before.M))>0;
    if(positive&&!this.presentation.replay){
      const flame=this.ensureScoreFlame();
      flame.set(scoreFireLevel(this.presentation.originHeat,this.displayedScoreProduct,this.stage.targetHeat),this.reducedMotion);
      flame.impact(event.eventId,scoreBeat(event).strength==='multiply'?1:event.sourceType==='character'?.75:.5);
      this.audio.scoreImpact(this.presentation,event.eventId,impact?.kind??'add',impact?.tier??0,impact?.chain??0);
      this.keepScoreReadable();
    }
    return Promise.resolve();
  }
  private keepScoreReadable():void {
    this.fitScoreReadouts();
    const controls=this.view.root.list.filter(o=>o.name.startsWith('action/'));
    const foreground=[this.roleAvatar,...this.cardViews.map(v=>v.container),...[...this.settledCards.values()].map(v=>v.container),...this.jokerViews.values(),
      ...this.view.root.list.filter(o=>o.name==='joker/key-focus'),...controls.flatMap(o=>[o,o.getData('buttonArt'),o.getData('label')])].filter(o=>o?.active);
    orderScoreBrushLayers(this.view.root,foreground,[this.resultText,...this.scoreLabels,this.scoreHeat,this.scoreMult,this.scoreTotal,this.breakdownText,this.previousHandText]);
    if(this.heroClimax?.group.active)this.view.root.bringToTop(this.heroClimax.group);
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
    const bounds=target.getBounds(),cell={x:bounds.x-6,y:bounds.y-4,width:bounds.width+12,height:bounds.height+8},end=scoreFlightLanding(start,cell);

    const multiply=packetSymbol==='×M',color=multiply?T.red:multChanged?T.jade:T.brass,light=multiply?0xffb995:multChanged?0xc4f0d8:0xffdf9d;
    const mid={x:(start.x+end.x)/2+(start.x<end.x?-22:22),y:(start.y+end.y)/2-22},trail=this.view.add(this.add.graphics()).setName('score/source-flight-line');
    trail.setData('landing',end).setData('cell',cell);
    trail.lineStyle(multiply?4:2,color,.72).beginPath().moveTo(start.x,start.y);
    for(let i=1;i<=16;i++){const t=i/16,u=1-t;trail.lineTo(u*u*start.x+2*u*t*mid.x+t*t*end.x,u*u*start.y+2*u*t*mid.y+t*t*end.y);}trail.strokePath();
    const packet=this.view.add(this.add.container(start.x,start.y)).setName('score/source-flight-packet'),shape=this.add.graphics();
    // Subtract every measured numeric cell from both trail and packet. The curved
    // path may pass the other columns but cannot paint over their digits.
    const safety=this.add.graphics().setVisible(false),guard=[this.scoreHeat,this.scoreMult,this.scoreTotal].map(text=>{const b=text.getBounds();return {x:b.x-6,y:b.y-4,width:b.width+12,height:b.height+8};});
    const {width,height}=this.view.layout; safety.fillStyle(0xffffff);
    for(const b of subtractBoxes({x:0,y:0,width,height},guard))safety.fillRect(b.x,b.y,b.width,b.height);
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
  private showKeyHighlight(key:JokerKeyHighlight,context:EffectContext):KeyCueCleanup {
    const presentation=this.presentation,value=presentation&&heroClimaxValue(presentation.state,presentation.score,key,presentation.replay);
    if(value){
      this.handInput?.cancel();this.view.cancelInteraction();
      const viewport=cssViewport(this),stage=mountHeroClimax(this,this.view.root,{x:0,y:0,...viewport},key,value,this.reducedMotion);
      if(stage){
        this.heroClimax=stage;let cleaned=false;const cleanup:KeyCueCleanup=()=>{if(cleaned)return;cleaned=true;context.signal.removeEventListener('abort',cleanup);if(this.heroClimax===stage)this.heroClimax=undefined;stage.dispose();};
        cleanup.hero=true;cleanup.strike=stage.strike;cleanup.release=stage.release;context.signal.addEventListener('abort',cleanup,{once:true});return cleanup;
      }
    }
    const l=this.view.layout,area=toolInventoryPlayedArea(l),mat=playedFootprint(area,l.mode==='portrait'),source=this.jokerViews.get(key.fact.sourceInstanceId);
    const poses=[...this.settledCards.values()].map(v=>({c:v.container,x:v.container.x,y:v.container.y}));
    const bottom=l.mode==='portrait'?Math.min(area.y+area.height,gameToolInventoryBox(l).y-4):area.y+area.height,cardHeight=Math.max(...poses.map(p=>Number(p.c.getData('height'))*p.c.scaleY),0);
    const frame=source?.getData('frame') as Phaser.GameObjects.Rectangle|undefined,bounds=frame?.getBounds(),slot=bounds?{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height}:l.slots[0];
    const {box,compact,cardY}=keyFocusPlacement(l.mode,l.shortLandscape,area,mat,bottom,cardHeight,slot);
    if(cardY!==undefined)for(const p of poses)p.c.setY(cardY);
    const oldVisible=source?.visible;if(compact)source?.setVisible(false);
    const group=mountKeyHighlight(this,this.view.root,box,key,compact);
    if(key.kind==='starter'&&!this.reducedMotion){
      const marks=group.getData('routeMarks') as Phaser.GameObjects.Graphics[]|undefined;
      for(const [i,mark] of (marks??[]).entries())void this.animate(key.route==='group'?{targets:mark,x:mark.x+(i-1)*2,duration:140,delay:i*40}:key.route==='straight'?{targets:mark,alpha:{from:.4,to:1},duration:90,delay:i*70}:{targets:mark,scale:{from:.75,to:1},duration:180,delay:i*35,ease:'Sine.easeOut'},context);
    }
    this.statusText.setText(key.fact.title+' · '+key.cause).setData('keyCause',key.fact.condition);
    let cleaned=false;
    const cleanup=()=>{if(cleaned)return;cleaned=true;context.signal.removeEventListener('abort',cleanup);for(const p of poses)if(p.c.active)p.c.setPosition(p.x,p.y);if(compact&&source?.active)source.setVisible(oldVisible!);group.destroy();};
    context.signal.addEventListener('abort',cleanup,{once:true});return cleanup;
  }
  private async showScoreEvent(event:ScoreEvent,index:number,beat:ScoreBeat,context:EffectContext,key?:JokerKeyHighlight,number?:NumberImpact):Promise<void> {
    if(context.signal.aborted)return;
    this.ensureTraceSource(event);
    const benefit=this.presentation?savedBenefit(this.run,this.presentation.score,event):undefined;
    const sourceBenefit=hasActualBenefit(event);
    if(sourceBenefit&&event.sourceInstanceId===this.presentation?.state.routeStarter?.instanceId){const label=this.jokerViews.get(event.sourceInstanceId)?.getData('valueLabel') as Phaser.GameObjects.Text|undefined;label?.setText(event.operation==='add-growth'?'已存成长':'实际生效').setColor(C.red);}
    if(benefit){this.statusText.setName('benefit/live').setText(benefit.effect);this.statusText.setData('benefit',benefit);if(this.statusText.width>this.view.layout.status.width)this.statusText.setText(benefit.title+' · 结果见上手详情');}

    const restoreKey=key?this.showKeyHighlight(key,context):undefined;
    if(event.targetCardId)this.showTraceHeldCard(event.targetCardId);
    const timing=key?.kind==='starter'||key?.kind==='opening'?keyHighlightBeat(beat,this.reducedMotion,key.kind):this.reducedMotion?{...beat,windup:0,flight:0,impact:Math.min(180,beat.impact),rest:80}:beat,duration=timing.windup+timing.flight+timing.impact;
    if(number&&this.presentation&&!this.presentation.replay&&number.kind!=='add'&&!this.reducedMotion)this.audio.scoreImpact(this.presentation,event.eventId,'flight',number.tier,number.chain);
    const note=event.sourceType==='character'&&benefit?benefit.effect:this.operationText(event),source=this.eventSource(event),card=this.settledCards.get(event.targetCardId??'')??this.cardViews.find(view=>view.card.id===event.targetCardId);
    this.resultText.setVisible(true).setText(source+' · '+note);this.breakdownText.setText((event.phase==='onStageClear'?'过关收益':event.phase==='beforeFailure'?'失败前救场':event.phase==='afterHand'?'结算后状态':event.sourceType==='joker'?'大丑牌连锁':'逐项计分')+' · '+source+' '+note);this.setAccumulator(event.before);
    this.scoreTotal.setData('eventId',event.eventId).setData('eventPhase','windup');
    const sourceEffects:Promise<void>[]=[];
    // All source reactions wait for the actual packet arrival, including slow frames.
    let arrive!:()=>void;
    const impact=new Promise<void>(resolve=>{arrive=()=>{context.signal.removeEventListener('abort',arrive);resolve();};context.signal.addEventListener('abort',arrive,{once:true});});
    const cardResponds=!!card&&this.cardRespondsTo(event,card);
    if(cardResponds&&card)sourceEffects.push(this.illuminateCard(card,event,timing,context,impact));
    if(event.sourceType==='character'){
      sourceEffects.push(this.animateRole(note,duration,context,timing,impact));
    }else if(event.sourceType==='joker'&&sourceBenefit){
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
    const impactCue=this.presentation?sourceImpact(this.presentation.score,event):undefined,impactSource=impactCue?this.jokerViews.get(impactCue.instanceId):undefined;
    const releaseSourceImpact=impactCue&&impactSource?mountSourceImpact(this,impactSource,impactCue,context.signal):undefined;
    restoreKey?.strike?.();
    if(restoreKey?.strike&&number)number={...number,tier:number.tier===3?3:2,peak:1.48};
    if(number||(sourceBenefit&&benefit)){if(!number&&sourceBenefit&&benefit&&this.presentation&&!this.presentation.replay)this.audio.scoreImpact(this.presentation,event.eventId,restoreKey?.strike?'key':'add',restoreKey?.strike?2:0);}
    else if(event.sourceType==='character')this.audio.sourceCue('character');
    else if(key?.kind==='multiply')this.audio.multiplier('multiply',index);
    else if(event.sourceType==='joker'&&sourceBenefit)this.audio.sourceCue(event.phase==='onHeldCard'?'held':'joker',index);
    else if(event.sourceType==='card'&&event.value.n!=='0')this.audio.sourceCue('card',index);
    else if(event.sourceType==='rule')this.audio.sourceCue(event.phase==='onStageClear'?'held':'boss');
    if(!number&&(event.operation==='add-multiplier'||event.operation==='read-growth'&&(event.before.M.n!==event.after.M.n||event.before.M.d!==event.after.M.d)))this.audio.multiplier('add',index);
    else if(event.operation==='retrigger-card')this.audio.retrigger(index);
    if(['lucky-multiplier-check','lucky-gold-check','glass-check'].includes(event.operation))this.audio.chanceRoll(event.operation==='glass-check'?'glass':'lucky',event.value.n==='1');
    if(event.operation==='chance-heat-check')this.audio.chanceRoll('joker',event.value.n==='1');
    if(event.operation==='destroy-card')this.audio.glassBreak();
    if(event.operation==='upgrade-hand')this.audio.toolUse('planet');
    if(event.operation==='reward-consumable')this.audio.rareReveal();
    if(event.operation==='reward-free-reroll')this.audio.rareReveal();
    const impactDuration=timing.impact;
    // Positive committed values land on arrival; the existing impact slot supplies
    // the brief compressed hold and rebound, without extending the trace timeline.
    const positive=Rational.fromJSON(event.after.H).compare(Rational.fromJSON(event.before.H))>0||Rational.fromJSON(event.after.M).compare(Rational.fromJSON(event.before.M))>0;
    const accumulator=positive?(this.setAccumulator(event.after),Promise.resolve()):this.rollAccumulator(event,impactDuration,context);
    if(number){this.scoreTotal.setColor(number.color).setData('numberImpact',number);if(event.before.M.n!==event.after.M.n||event.before.M.d!==event.after.M.d)this.scoreMult.setColor(number.color);if(event.before.H.n!==event.after.H.n||event.before.H.d!==event.after.H.d)this.scoreHeat.setColor(number.color);if(number.factor)this.resultText.setText(source+' · 实际 ×'+number.factor+' · '+fractionText(event.before.M)+' → '+fractionText(event.after.M));}
    const effects=[...sourceEffects,accumulator,this.pulseAccumulator(event,impactDuration,context,number),this.impactAccumulator(event,impactDuration,context,number),this.wait(impactDuration,context)],notes:Promise<void>[]=[];
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
    if(event.sourceType==='joker'&&sourceBenefit&&!key){
      const jv=this.jokerViews.get(event.sourceInstanceId);
      if(!releaseSourceImpact&&jv&&this.view.layout.mode!=='portrait'){const frame=jv.getData('frame') as Phaser.GameObjects.Rectangle;notes.push(this.floatNote(note,Number(jv.getData('baseX')),Number(jv.getData('baseY'))-frame.height/2-8,event.operation==='multiply-multiplier'||event.operation==='read-coefficient'?'#f6c0a4':'#ffe3ae',impactDuration+timing.rest,context));}
    }else if(event.sourceType==='character'){
      if(this.view.layout.mode!=='portrait')notes.push(this.floatNote(note,this.roleAvatar.x,this.roleAvatar.y-this.roleFrame.height/2-8,'#ffe3ae',impactDuration+timing.rest,context));
    }else if(card&&this.view.layout.mode!=='portrait')effects.push(this.floatNote(note,card.container.x,card.container.y,'#d3f0d3',impactDuration,context));
    if(cardResponds&&card&&event.sourceType==='joker'&&!this.reducedMotion){
      const angle=card.container.angle;
      effects.push(this.animate({targets:card.container,angle:angle+(event.operation==='retrigger-card'?3:2),duration:impactDuration/4,yoyo:true,repeat:1,ease:'Sine.easeInOut'},context).then(()=>{if(card.container.active)card.container.setAngle(angle);}));
    }
    await Promise.all(effects);
    if(context.signal.aborted)return;
    this.setAccumulator(event.after);
    if(restoreKey?.hero&&!this.reducedMotion)await this.wait(500,context);
    this.scoreTotal.setData('eventPhase','rest');
    const growth=this.presentation?savedGrowthStamp(this.run,this.presentation.score,event):undefined;
    if(growth){this.statusText.setText(benefit!.title+' · 已存成长，下手生效').setData('growthStamp',growth);this.resultText.setText(benefit!.title+' · 成长已保存');}
    const earned=this.presentation&&!this.presentation.replay?growthEventPayoff(this.presentation.state,this.presentation.score,event):undefined;
    if(earned){const label=this.jokerViews.get(earned.instanceId)?.getData('valueLabel') as Phaser.GameObjects.Text|undefined;
      if(label){const value='↑'+earned.delta,previous=label.text;label.setText(value);const room=label.getData('labelRoom') as number|undefined;if(room&&label.width*1.08>room)label.setText(previous);else label.setColor(C.red).setData('growthPayoff',earned);if(!this.reducedMotion)notes.push(this.animate({targets:label,scaleX:{from:1.08,to:1},scaleY:{from:1.08,to:1},duration:Math.min(160,timing.rest),ease:'Sine.easeOut'},context));}
    }
    await Promise.all([this.wait(timing.rest,context),restoreKey?.release?.()??Promise.resolve(),...notes]);
    releaseSourceImpact?.();
    if(context.signal.aborted)return;
    restoreKey?.();
    if(event.operation==='destroy-card'&&card){
      await this.breakGlass(card,context);
    }
    const joker=(this.presentation?.score.jokers??this.run.jokers).find(joker=>joker.instanceId===event.sourceInstanceId),jokerView=this.jokerViews.get(event.sourceInstanceId),label=jokerView?.getData('valueLabel') as Phaser.GameObjects.Text|undefined;
    if(event.operation==='increment-hands-scored'){
      const lifetime=this.jokerDefinition(event.sourceDefinitionId).hooks.flatMap(hook=>hook.operations).find(operation=>operation.kind==='expire-after-hands');
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
    const definition=this.jokerDefinition(event.sourceDefinitionId),rarityStyle=JOKER_RARITY[definition.rarity],l=this.view.layout,index=Math.min(this.jokerViews.size,R2_LIMITS.jokerSlots-1),b=l.slots[index],sideLabels=l.mode==='landscape',labelBox=l.jokerLabels[index],labelX=sideLabels?labelBox.x-b.x-b.width/2:-b.width/2+5;
    const marker=this.view.add(this.add.container(b.x+b.width/2,b.y+b.height/2)),frame=this.add.rectangle(0,0,b.width,b.height,rarityStyle.paper).setStrokeStyle(2,rarityStyle.edge);
    marker.add(frame);drawJokerMotif(this,marker,definition.id,0,0,Math.min(b.width,b.height)*.75,definition);
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
  private showOpeningScore(score:ScoreTrace,context:EffectContext):KeyCueCleanup {
    const event=score.events.find(e=>e.phase==='finalScore')!;
    const key:JokerKeyHighlight={eventId:event.eventId,kind:'opening',heroId:this.run.characterId,cause:'本局前五手内真实结算',landing:fractionText(score.accumulator.H)+' × '+fractionText(score.accumulator.M)+' = '+heatText(score.finalScore),fact:{eventId:event.eventId,sourceInstanceId:event.sourceInstanceId,definitionId:'',title:(this.run.phase==='run-lost'?'本局结束 · 实际得分 · ':'开场得分 · ')+HAND_LABELS[score.handType],effect:'已结算 '+heatText(score.finalScore),condition:'真实已保存得分',destination:'本手实际得分',next:'继续自主选牌'}};
    return this.showKeyHighlight(key,context);
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
    this.scoreTotal.setData('eventId',score.events.find(event=>event.phase==='finalScore')?.eventId).setData('eventPhase','award');
    this.scoreTotal.setColor(celebration.cleared&&celebration.tier>=2?'#80551f':tier?C.red:C.ink);
    const opening= !presentation.replay&&presentation.state.openingShow?.rootId===score.rootId&&presentation.state.openingShow.reason==='score';
    const closeOpening=opening?this.showOpeningScore(score,context):undefined;
    if(closeOpening?.strike&&!this.reducedMotion)await this.wait(180,context);
    if(context.signal.aborted)return;
    closeOpening?.strike?.();
    if(!presentation.replay){const level=presentation.state.phase==='run-lost'?0:scoreFireLevel(presentation.originHeat,score.finalScore,this.stage.targetHeat);this.ensureScoreFlame().impact('award',level===3?1:level===2?.85:.65);this.audio.scoreImpact(presentation,'award','award',closeOpening?.strike&&level<2?2:level,score.events.filter(e=>numberImpact(e,this.stage.targetHeat)?.kind==='multiply').length);this.keepScoreReadable();}
    const effects:Promise<void>[]=[];
    // The credited heat rolls up in the HUD; the exact saved value always lands last.
    const heatFrom=BigInt(presentation.displayHeat),heatTo=BigInt(presentation.state.stage!.heat);
    if(!this.reducedMotion&&heatTo>heatFrom&&heatTo-heatFrom<10000000000n){
      // Recorded final landing replaces the former synthesized rolling tone.
      const roll={t:0};this.rollingHeat=true;
      effects.push(this.animate({targets:roll,t:1,duration:celebration.cleared?560:400,ease:'Cubic.easeOut',onUpdate:()=>{
        presentation.displayHeat=(heatFrom+BigInt(Math.floor(Number(heatTo-heatFrom)*roll.t))).toString();this.updateHud();
      }},context).then(()=>{this.rollingHeat=false;presentation.displayHeat=presentation.state.stage!.heat;if(!context.signal.aborted)this.updateHud();}));
    }else {presentation.displayHeat=presentation.state.stage!.heat;this.updateHud();}
    if(!this.reducedMotion){
      effects.push(this.pulseScoreNumber(this.scoreTotal,1.28+scoreFireLevel(presentation.originHeat,score.finalScore,this.stage.targetHeat)*.04,260,context));
      effects.push(this.animate({targets:this.heatText,scale:{from:celebration.cleared?1.1:1.04,to:1},duration:celebration.cleared?620:310,ease:'Back.easeOut'},context));
    }
    effects.push(this.wait(this.reducedMotion?360:opening?(closeOpening?.strike?590:900):presentation.state.openingShow?.rootId===score.rootId?420:celebration.cleared?700:tier>=2?500:320,context));await Promise.all(effects);if(closeOpening?.hero&&!this.reducedMotion)await this.wait(500,context);await closeOpening?.release?.();closeOpening?.();if(context.signal.aborted)return;this.scoreTotal.setColor(C.ink);this.scoreHeat.setColor(C.jade);this.scoreMult.setColor(C.red);
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
    this.refreshSelection();this.updateHud();this.previewCards?.destroy();this.previewCards=undefined;(this.view.root.list.find(o=>o.name==='table/played-label') as Phaser.GameObjects.Text|undefined)?.setText('已出牌');
    [this.scoreHeat,this.scoreMult,this.scoreTotal,...this.scoreLabels].forEach(text=>text.setVisible(true));
    (this.view.root.list.find(o=>o.name==='score/total-pedestal') as Phaser.GameObjects.Graphics|undefined)?.setVisible(true);
    this.scoreLabels.forEach((label,i)=>label.setText(['累计热度','当前倍率','本手得分'][i]));this.resultText.setText((replay?'回看 · ':'打出 · ')+HAND_LABELS[score.handType]);
    this.settledCards.clear();const consumedIds=[...score.sets.playedIds,...(score.sets.assistConsumedIds??[])],boxes=this.landingBoxes(consumedIds.length);
    const landing=consumedIds.map((id,i)=>{
      const view=views.find(view=>view.card.id===id)??this.cardViews.find(view=>view.card.id===id)??this.cardPiece(score.cards.find(card=>card.id===id)!,boxes[i]);
      this.settledCards.set(id,view);view.container.setVisible(true);view.selectionMark?.setText('助').setVisible(score.sets.assistConsumedIds?.includes(id)??false);if(score.sets.assistConsumedIds?.includes(id))view.background.setStrokeStyle(3,T.brass);view.hit?.disableInteractive();return {view,box:boxes[i]};
    });
    const base=score.events[0],baseProduct=Rational.fromJSON(base.after.H).multiply(Rational.fromJSON(base.after.M)).floor().toString();
    const baseCue=!replay&&BigInt(baseProduct)>0n&&scoreFireLevel(originHeat,baseProduct,this.stage.targetHeat)>0;
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
      if(context.signal.aborted)return;this.setAccumulator(base.after);this.breakdownText.setText('牌型 '+HAND_LABELS[score.handType]+' · ★ '+score.sets.activeScoringIds.length+' 张计分');
      // A strong saved base is the first arrival too. Reuse 260ms of the existing
      // 460ms landing rest, so the new accent never adds a second waiting slot.
      const baseEffects:Promise<void>[]=[];
      if(baseCue){this.scoreTotal.setData('eventId',base.eventId).setData('eventPhase','base-impact');baseEffects.push(this.pulseAccumulator(base,260,context),this.impactAccumulator(base,260,context));}
      const formation=fourCardFormation(score);
      if(formation){
        const view=this.jokerViews.get(formation.instanceId),frame=view?.getData('frame') as Phaser.GameObjects.Rectangle|undefined;
        const type=HAND_LABELS[formation.handType],name=this.jokerDefinition(formation.definitionId).name;
        this.resultText.setText(name+' · 四张普通'+type);this.breakdownText.setText(name+'允许4张普通'+type+'；同花顺仍须5张。');
        if(view&&frame){this.audio.sourceCue('joker');await Promise.all([this.focusSource(view,frame,T.brass,false,380,context),this.floatNote('四张'+type,view.x,view.y-frame.height/2-8,'#ffe3ae',380,context)]);}
      }
      await Promise.all(baseEffects);
    });
    this.effects.enqueue(context=>this.wait(this.reducedMotion?120:baseCue&&!fourCardFormation(score)?200:460,context));
    const key=keyHighlight(state,score,originHeat,this.stage.targetHeat,!replay);
    let jokerIndex=0,scoreOrdinal=0,multiplyOrdinal=0,previousSource:string|undefined;
    for(const event of score.events){
      if(event.phase==='base')continue;
      if(event.phase==='finalScore'){this.effects.enqueue(context=>this.award(score,presentation,context));continue;}
      const index=event.sourceType==='joker'?jokerIndex++:event.sourceType==='character'?0:score.sets.activeScoringIds.indexOf(event.targetCardId??'');
      let number=numberImpact(event,this.stage.targetHeat,multiplyOrdinal+1);if(number?.kind==='multiply')multiplyOrdinal++;let beat=impactBeat(experienceBeat(event,previousSource,scoreBeat(event,scoreOrdinal++)),number);if(event.sourceInstanceId===state.routeStarter?.instanceId&&key?.eventId!==event.eventId)beat=starterRepeatBeat(beat,this.reducedMotion);if(event.sourceType==='joker'&&hasActualBenefit(event))previousSource=event.sourceInstanceId;else previousSource=undefined;this.effects.enqueue(context=>this.showScoreEvent(event,Math.max(0,index),beat,context,key?.eventId===event.eventId?key:undefined,number));
    }
    let failed=false;
    try {await this.effects.drain();}
    catch {failed=true;if(this.alive(lifecycle,intent))this.resultText.setText('演出已停止，确定结果已保存。');}
    if(this.alive(lifecycle,intent)&&this.presentation===presentation&&(failed||this.effects.isCurrent(generation)))this.completePresentation(presentation);
  }

  private completePresentation(presentation:NonNullable<GameScene['presentation']>):void {
    if(!this.alive(presentation.lifecycle,presentation.intent))return;
    this.stopScoreFire();
    this.erxiangTargetId=null;this.azaoRelease=false;this.xiemuBurn=0;this.presentation=undefined;this.run=presentation.state;this.selectedIds.clear();this.assistIds=[];this.assistGestureStart=undefined;this.statusMessage=savedHeroResult(this.run)||handGrowthChanges(this.run)[0]?.line||'';this.updateHud();
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
      const copy=jokerAbilityCopyForRun(this.run,joker.definitionId,joker,recordedJokerMemoryContext(publicJokerMemoryContext(this.run,{hand:score.cards,scoringLimited:false,deckSize:this.run.deckInstances.length-this.run.destroyedIds.length,jokerSlots:r2JokerCapacity(this.run),jokerCount:score.sourceJokers.length}),score.bossContext),score.events);
      const edition=score.events.filter(event=>event.sourceType==='joker'&&event.sourceInstanceId===joker.instanceId&&event.reasonKey.startsWith('edition.')).map(event=>this.operationText(event)).join('、');
      return [this.jokerDefinition(joker.definitionId).name+'：'+copy.state+(edition?'；版次 '+edition:'')];
    });
    this.dialog.open('上手已入账 · '+HAND_LABELS[score.handType]+' +'+heatText(score.finalScore),this.formatBreakdown(score)+'\n\n'+score.events.filter(event=>event.phase!=='base'&&event.phase!=='finalScore').map(event=>this.eventSource(event)+' '+this.operationText(event)+(['afterHand','beforeFailure','onStageClear'].includes(event.phase)?'':' → 热度 '+fractionText(event.after.H)+' / 倍率 '+fractionText(event.after.M))).join('\n'),[{label:'继续培养',primary:true,disabled:!this.ready,run:()=>this.inspectJourney()},...(this.run.consumables.length?[{label:'打开道具箱',disabled:!this.ready,primary:true,run:()=>showConsumables(this.dialog,this.run,this.ready&&!this.pendingRefill&&!this.pendingTouye,(a,seq)=>this.command(a,seq))}]:[]),{label:'回看演出',disabled:!this.ready,run:()=>{this.dialog.close();this.replayLastTrace();}}],benefits.length?{cards:savedExperienceCards(this.run,score),effectBody:this.formatBreakdown(score),collapseRules:true,rulesLabel:'完整计分明细'}:{cards:savedExperienceCards(this.run,score)});
    attachFirstChapterGuide(this.run,()=>this.render());
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
      paperSceneStart(this,'intermission', {
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

  private refreshToolInventory():void {
    if(this.inventoryButton?.active)(this.inventoryButton.getData('label') as Phaser.GameObjects.Text).setText(toolInventoryLabel(this.run));
  }
  private updateHud(): void {
    this.refreshToolInventory();
    this.stage={...this.stage,targetHeat:this.run.stage!.targetHeat};
    (this.view.root.getByName('hud/target') as Phaser.GameObjects.Text|undefined)?.setText('目标 '+heatText(this.stage.targetHeat));
    const l=this.view.layout,displayHeat=this.presentation?.displayHeat??this.heat,remaining=(BigInt(this.stage.targetHeat)>BigInt(displayHeat)?BigInt(this.stage.targetHeat)-BigInt(displayHeat):0n).toString();
    this.heatText.setText(l.mode==='portrait'?'目标 '+heatText(displayHeat)+' / '+heatText(this.stage.targetHeat):heatText(displayHeat));
    const discardCost=r2DiscardCost(this.run),discards=this.run.stage!.discardsLeft,plays=this.presentation?.resourcePlayLeft??this.handsLeft;
    this.resourceCounts.play.setText(plays+' 次');this.resourceCounts.discard.setText(discards+' 次');
    if(this.menuActions)this.menuActions.viewLastHand=!this.presentation&&this.run.lastTrace?()=>this.inspectLastTrace():undefined;
    const playColor=handActionCountColor('play',!!this.playButton.input?.enabled),discardColor=handActionCountColor('discard',!!this.discardButton.input?.enabled,discards<2*discardCost);
    if(this.resourceCounts.play.style.color!==playColor)this.resourceCounts.play.setColor(playColor);
    if(this.resourceCounts.discard.style.color!==discardColor)this.resourceCounts.discard.setColor(discardColor);
    const gold=this.presentation?.resourceGold??this.run.gold;
    this.goldText.setText(l.shortLandscape?gold+' 金':'金币 '+gold+(l.mode==='desktop'?'\n还需 '+heatText(remaining)+' 热度':''));
    if(l.mode==='desktop'){
      // Keep the two actual text rows within the HUD's dedicated gold region.
      fitScoreLine(this.goldText,{x:l.hud.x+12,y:l.hud.y+180,width:l.hud.width-24,height:48},14);
      const progressY=Math.max(l.hud.y+238,this.goldText.getBounds().bottom+6);
      this.progressBar.setY(progressY+2.5);
    }
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
