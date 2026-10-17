import {WORKSHOP_GOALS,type WorkshopIntent,type WorkshopTab} from './WorkshopModel';
import {shopBossPreparation,currentShopNotice} from './ShopBossPreparation';
import {canCarryTool,type ToolCarryIntent} from './ToolCarryIntent';
import {heroText} from './HeroIdentity';
import {showShopComparison,type ShopComparisonView} from './ShopComparisonDialog';
import {createShopOfferValue,createShopIdentityTags} from './ShopJokerPresentation';
import {warmTableImages} from './StageImageWarmup';
import {warmShopToolImages,warmShopToolPanel} from './ShopToolImageWarmup';
import {showHeroExplanation} from './HeroExplanation';
import {bossRulesSeen,presentBossPreparation} from './BossPreparationPresentation';
import {isR2CoreBuild,isR2SuitChoice,R2_SUIT_DYE_IDS,r2BasicChoiceBasePrice} from '../domain/r2GroupUpgrade';
import type {R2PracticeQuote} from '../domain/r2Practice';
import {shopPracticeServices,shopPracticeQuota,shopPracticeConfirmation,shopPracticeAction,shopPracticeSavedReceipt,shopPracticeEffect,type ShopPracticeReceipt} from './ShopPracticeService';
import {showShopServiceConfirmation} from './ShopServiceDialog';
import {HAND_LABELS} from '../content/handLabels';
import {routeFrame} from './RouteFrame';
import {routeFitCue,markRouteDetail,toolPurpose} from './RouteFitCue';
import {toolPermanentValue} from './ToolPermanentValue';
import {showMakeCards,type MakeCardsView} from './MakeCardsDialog';
import {inventoryFeedback} from './InventoryFeedback';
import {showSavedToolResult} from './SavedToolResult';
import {transactionGrowthChange} from './SavedGrowthChange';
import {paperSceneStart} from './PaperFlow';
import {drawShopArt,drawShopBackdrop,shopSheet} from './ShopArt';
import {r2BasicToolShelfStatus} from '../domain/r2Shop';
import {starterShopCue} from './RouteStarter';
import {firstChapterGuide,firstChapterShopPrompt,dismissFirstChapterGuide,attachFirstChapterGuide} from './FirstChapterGuide';
import {shopRouteRelation,shopOfferRelation,shopSaleConsequences,shopPurchaseConditionLosses} from './ShopRouteRelations';
import {buildGrowthProgress} from './BuildGrowthProgress';
import {shopInvestment} from './ShopInvestment';
import {currentBuildFocus,BUILD_LABEL,toolSupportsFocus,cashDecision} from './BuildJourney';
import {showBuildJourney} from './BuildJourneyDialog';
import {groupGrowthCausality,savedGrowthDiscovery} from './JokerGrowthCausality';
import {purchaseDiscountStatus} from './PurchasePaymentFacts';
import {shopPurchaseReceipt,shopPurchaseReceiptExists,type ShopPurchaseReceipt} from './ShopPurchaseReceipt';
import {SHOP_CATEGORIES,shopOfferGeometry,shopHeldGeometry,shopIdentityText,shopShelfIdentityText,shopOfferSynopsis} from './ShopOfferLayout';
import {mountPolychromeCardIridescence,mountForgetTechniqueAttention} from './PolychromeCardIridescence';
import {shopAnchoredTip} from './ShopAnchoredTip';
import {shopToolContinuation} from './ShopPurchaseFlow';
import {r2ScoringDisabledJokerIds} from '../domain/scoreR2';
import {r2JokerDefinitionsFor,r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {jokerAbilityCopyForRun,publicJokerMemoryContext} from './JokerMemory';
import type {R2JokerInstance} from '../content/r2Schema';
import {shopLayout,shopFirstGuideLayout,shopSummaryWrap,shopOfferSummary,shopOfferCopy,shopOwnedHitBox,shopOwnedNameArea,shopGoodsGrid,shopDecisionBox,shopPortraitHeader,shopEmptyPortrait} from './ShopLayout';
import {shopOfferGuidance,jokerRouteCaption,jokerApplicableRoutes} from './ShopOfferGuidance';
import {goodsArtKey,goodsArtLoadState,requestGoodsArt,retryGoodsArt} from './GoodsArtLoading';
import {ShopResultFeedback,shopResultBox,shopResultPages,type ShopResultLine} from './ShopResultFeedback';
import {requestJokerArt,jokerArtLoadState,retryJokerArt} from './JokerArtLoading';
import {JOKER_RARITY,createJokerRarityBadge,type JokerRarity} from './JokerRarity';
import {findShopSynergy,shopCandidateTradeoff} from './ShopSynergy';
import {ShopSynergyPreview} from './ShopSynergyPreview';
import {cardDisplayName} from './tangsongCardNames';
import Phaser from 'phaser';
import {r2JokerCapacity} from '../domain/r2Resources';
import {r2RunModeConfig,R2_MODE_CATALOG} from '../content/r2Modes';
import {programEntryLabel,programStatus,showPrograms} from './ProgramDialog';
import {AudioEngine} from '../audio/AudioEngine';
import {r2PaidRerollPrice,salePrice,r2Pool,r2PurchasePrice,r2PurchaseDiscount,r2ToolAcquisitionPool,type R2Offer} from '../domain/r2Shop';
import {s04IssueText,s04QualificationText} from './S04Qualification';
import type {R2RunState,Action,DomainEvent} from '../domain/run';
import {getR2Stage,R2_LIMITS,r2InterestCap,r2ConsumableCapacity,r2CreateJoker} from '../domain/r2Run';
import {dispatchRun,runController} from './runAdapter';
import {Haptics,type HapticScope} from '../haptics/Haptics';
import {reorderJokerIds,ownedJokerDropIndex} from './JokerReorder';
import {OwnedJokerInput} from './OwnedJokerInput';
import {OwnedJokerDragVisual,ownedOrderHint,ownedOrderReversed} from './OwnedJokerDragVisual';
import {heatText,fractionText} from './scoreText';
import {toolInfo,itemInfo,goodsArtPortrait,editionEffectText,jokerExtraBonusCopy,toolFamilyLabel} from './r2ToolInfo';
import {SceneView} from './SceneView';
import {getCharacter} from './characters';
import {selectionPortraitKey,avatarKey} from './portraits';
import {DetailDialog} from './DetailDialog';
import {showDeckInspection} from './DeckInspector';
import type {RunMenuActions} from './RunMenu';
import {gameSession} from './session';
import {r2BossText} from '../domain/r2Chapter';
import {SKIP_ITEM_LABELS,showConsumables} from './ConsumableDialog';
import {presentStageSelection} from './BlindSelectPresentation';
import {shopToolInventoryRow} from './ToolInventoryEntry';
import type {IntermissionResult} from './IntermissionScene';
import type {Box} from './layout';
import {jokerArtKey,jokerArtUrl,jokerArtPreviewUrl} from './jokerArt';
import {UI_FONT,PAPER_THEME,PAPER_CSS} from './theme';
import {fitJokerLabel} from './JokerLabel';
import {drawJokerMotif} from './JokerMotif';
import {r2MechanismBadge as mechanismBadge,r2JokerStateText,r2JokerExtraHelp,r2TransactionText} from './r2Help';

type ShelfKind='jokers'|'tools'|'items';
type JourneyPracticeOrigin={all:boolean;scrollTop:number;handType:R2PracticeQuote['handType']};
const SHELF_FIELDS={jokers:'offers',tools:'toolOffers',items:'itemOffers'} as const;

export class ShopScene extends Phaser.Scene {
  private run!:R2RunState;
  private ownedInput?:OwnedJokerInput;
  private ownedArts=new Map<string,Phaser.GameObjects.Container>();
  private ownedDrag?:OwnedJokerDragVisual;
  private ownedHint?:Phaser.GameObjects.Text;
  private get jokerDefinitions(){return r2JokerDefinitionsFor(this.run);}
  private jokerDefinition(id:string){const d=r2JokerDefinitionFor(this.run,id);return {...d,name:cardDisplayName(d.id,d.name)};}
  private busy=false;
  private lifecycle=0;
  private selectedOfferId?:string;
  private shelfKind:ShelfKind='jokers';
  private shelfPage=0;
  private makeCardsView:MakeCardsView={pane:'purchase',positions:{owned:0,purchase:0}};
  private comparisonView:ShopComparisonView={scrollTop:0};
  private savedPractice?:ShopPracticeReceipt;
  private practiceOrigin?:JourneyPracticeOrigin;
  private pcPages={jokers:0,tools:0,items:0};
  private pcOfferBoxes=new Map<string,Box>();
  private artRefreshListeners=new Map<string,()=>void>();
  private artTargets=new Map<string,{holder:Phaser.GameObjects.Container;box:Box;alpha:number}[]>();
  private jokerArtTargets=new Map<Phaser.GameObjects.Container,{definitionId:string;box:Box;alpha:number}>();
  private notice='';
  private get shopNotice(){return currentShopNotice(this.run,this.notice);}
  private view!:SceneView;
  private offerArts:Phaser.GameObjects.Container[]=[];
  private hoverPreview?:Phaser.GameObjects.Container;
  private hoverDelay?:Phaser.Time.TimerEvent;
  private goldText?:Phaser.GameObjects.Text;
  private pendingTransactions:Extract<DomainEvent,{type:'joker-transaction'}>[]=[];
  private lastTransactionNotes:string[]=[];
  private transactionGrowthLines=new WeakMap<Extract<DomainEvent,{type:'joker-transaction'}>,string>();
  private pendingPayment?:string;
  private lastPurchaseReceipt?:ShopPurchaseReceipt;

  private pendingRerollFlip=false;
  private pendingPurchaseFlight?:{from:Box;to:Box;name:string};
  private pendingToolCue?:{instanceId:string;label:string};
  private resultFeedback=new ShopResultFeedback();
  private resultNote?:Phaser.GameObjects.Text;
  private resultPlate?:Phaser.GameObjects.Graphics;
  private resultLayer?:Phaser.GameObjects.Container;
  private noticeLabel?:Phaser.GameObjects.Text;
  private starterMarkers:Phaser.GameObjects.Graphics[]=[];
  private resultKey?:string;
  private readonly dialog=new DetailDialog();
  private menuActions?:RunMenuActions;
  private readonly audio=AudioEngine.shared;
  private hapticLife?:AbortController;
  private transactionHaptic?:HapticScope;
  private readonly synergyPreview=new ShopSynergyPreview();
  private synergyOfferId?:string;

  private clearSynergyHighlights(): void {
    this.synergyPreview.clear();this.synergyOfferId=undefined;
  }

  private highlightSynergies(offerId:string,touch=false):void {
    this.clearSynergyHighlights();
    const found=this.findOffer(offerId);if(!found||found.kind!=='jokers'||found.offer.consumed||this.busy)return;
    const p=this.geometry(),held=new Map(this.run.jokers.flatMap((j,i)=>p.slots[i]&&!p.inventoryCollapsed?[[j.instanceId,p.slots[i]] as const]:[]));
    const index=this.visibleOffers().findIndex(o=>o.offerId===offerId),source=p.pc?this.pcOfferBoxes.get(offerId):p.shelf[index];
    if(!source)return;
    const region=p.pc?{x:p.pc.ownedRail.x,y:p.top+4,width:p.pc.ownedRail.width,height:this.view.layout.height-p.top-20}
      :{x:p.x,y:p.top+48,width:p.w,height:p.reroll.y-p.top-56};
    const placed=shopAnchoredTip(source,{width:Math.min(300,region.width),height:112},region,p.pc?[p.pc.actionRail]:[]);
    const bubble=placed?.box;
    this.synergyOfferId=offerId;
    this.synergyPreview.show(this,offerId,this.jokerDefinition(found.offer.definitionId).name,findShopSynergy(this.run,found.offer.definitionId),held,bubble,this.resultReduced,touch,{view:this.view,details:()=>this.inspectOffer(offerId),copy:shopOfferGuidance(this.run,found.offer).decision,anchor:source});
  }
  private selectOffer(offerId:string):void {
    const found=this.findOffer(offerId);if(!found||found.offer.consumed||this.busy)return;
    if(found.kind==='jokers'&&this.input.activePointer.wasTouch&&this.synergyOfferId!==offerId){
      this.selectedOfferId=offerId;this.render();this.highlightSynergies(offerId,true);return;
    }
    if(found.kind==='jokers'&&this.run.jokers.length>=r2JokerCapacity(this.run))this.inspectReplacement(offerId);
    else this.inspectOffer(offerId);
  }
  constructor(){super('shop');}
  private get ready():boolean {const session=gameSession();return this.run?.phase==='shop'&&!this.busy&&runController(this)?.status==='idle'&&session.lease.writable&&!session.pendingRun&&!session.working;}
  private shelfOffers(kind=this.shelfKind):R2Offer[]{return this.run.shop![SHELF_FIELDS[kind]];}
  private get pageSize():number{
    const l=this.view.layout,style=getComputedStyle(document.documentElement),width=l.width-(parseFloat(style.getPropertyValue('--safe-left'))||0)-(parseFloat(style.getPropertyValue('--safe-right'))||0);
    return l.height<500&&width<640?2:3;
  }
  private visibleOffers():R2Offer[]{return this.shelfOffers().slice(this.shelfPage*this.pageSize,(this.shelfPage+1)*this.pageSize);}
  private geometry(){
    const l=this.view.layout,style=getComputedStyle(document.documentElement),inset=(side:string)=>parseFloat(style.getPropertyValue('--safe-'+side))||0;
    const cols=this.shelfKind==='jokers'?this.pageSize:Math.max(1,Math.min(2,this.shelfOffers().length));
    const menu=document.querySelector('.run-menu-toggle')?.getBoundingClientRect(),app=document.getElementById('app')!.getBoundingClientRect();
    const menuBox=menu&&menu.width&&menu.height?{x:(menu.x-app.x)*l.width/app.width,y:(menu.y-app.y)*l.height/app.height,width:menu.width*l.width/app.width,height:menu.height*l.height/app.height}:undefined;
    return shopLayout(l.width,l.height,l.hud.y,inset('bottom'),cols,this.run.jokers.some(j=>!!this.jokerCopy(j.definitionId)),!!firstChapterShopPrompt(this.run)&&this.ready,inset('left'),inset('right'),this.run.jokers.length,menuBox);
  }
  create():void {
    this.hapticLife?.abort();this.hapticLife=new AbortController();
    const stopHaptics=()=>{this.hapticLife?.abort();this.transactionHaptic?.cancel();};
    const cancelHaptics=()=>this.transactionHaptic?.cancel(),cancelHapticKey=(event:KeyboardEvent)=>{if(event.key==='Escape')cancelHaptics();};
    window.addEventListener('keydown',cancelHapticKey,true);this.game.canvas.addEventListener('pointercancel',cancelHaptics);
    this.events.once('destroy',stopHaptics);
    this.events.once('shutdown',()=>{stopHaptics();this.events.off('destroy',stopHaptics);window.removeEventListener('keydown',cancelHapticKey,true);this.game.canvas.removeEventListener('pointercancel',cancelHaptics);});
    this.makeCardsView={pane:'purchase',positions:{owned:0,purchase:0}};
    this.comparisonView={scrollTop:0};
    this.savedPractice=undefined;this.practiceOrigin=undefined;
    this.busy=false;this.selectedOfferId=undefined;this.shelfKind='jokers';this.shelfPage=0;this.pcPages={jokers:0,tools:0,items:0};this.notice='';this.lifecycle++;
    this.pendingRerollFlip=false;this.pendingPurchaseFlight=undefined;this.pendingToolCue=undefined;this.pendingTransactions=[];this.lastTransactionNotes=[];this.lastPurchaseReceipt=undefined;this.pendingPayment=undefined;
    this.resultFeedback=new ShopResultFeedback();this.resultKey=undefined;this.resultNote=undefined;this.resultPlate=undefined;
    this.events.once('shutdown',()=>{this.resultFeedback.dispose();this.resultLayer?.destroy(true);this.resultLayer=undefined;this.resultNote=undefined;this.resultPlate=undefined;this.resultKey=undefined;});
    this.events.once('shutdown',()=>{this.lifecycle++;this.clearSynergyHighlights();this.hideHoverPicture();this.dialog.close();for(const [key,listener] of this.artRefreshListeners)this.textures.off('addtexture-'+key,listener);this.artRefreshListeners.clear();this.artTargets.clear();this.jokerArtTargets.clear();});
    this.events.once('shutdown',()=>{if(this.registry.get('runMenuActions')===this.menuActions)this.registry.remove('runMenuActions');this.menuActions=undefined;});
    const owner=runController(this),run=owner?.state;if(!owner||!run||run.phase!=='shop'){this.scene.start('character-select');return;}this.run=run;
    this.menuActions={viewDeck:()=>this.inspectDeck()};this.registry.set('runMenuActions',this.menuActions);
    this.cameras.main.setBackgroundColor('#F3EADB');this.view=new SceneView(this,()=>this.render());
    const clearPreview=()=>this.clearSynergyHighlights(),outside=(event:PointerEvent)=>{if(event.target!==this.game.canvas)clearPreview();},visibility=()=>{if(document.hidden)clearPreview();};
    const otherTarget=(_pointer:Phaser.Input.Pointer,over:Phaser.GameObjects.GameObject[])=>{if(!over.some(o=>o.name==='offer/'+this.synergyOfferId||o.name==='shop/selected-details'))clearPreview();};
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');motion.addEventListener('change',clearPreview);
    document.addEventListener('pointerdown',outside,true);document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',clearPreview);this.input.on('pointerdown',otherTarget);this.input.keyboard?.on('keydown-ESC',clearPreview);this.game.canvas.addEventListener('pointercancel',clearPreview);
    this.events.once('shutdown',()=>{motion.removeEventListener('change',clearPreview);document.removeEventListener('pointerdown',outside,true);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',clearPreview);this.input.off('pointerdown',otherTarget);this.input.keyboard?.off('keydown-ESC',clearPreview);this.game.canvas.removeEventListener('pointercancel',clearPreview);});
    const canvasLabel=this.game.canvas.getAttribute('aria-label');this.events.once('shutdown',()=>{if(canvasLabel===null)this.game.canvas.removeAttribute('aria-label');else this.game.canvas.setAttribute('aria-label',canvasLabel);});
    this.ownedInput=new OwnedJokerInput(this,{ready:()=>this.ready,inspectable:()=>!this.busy&&this.run?.phase==='shop',cards:()=>{const p=this.geometry();return p.inventoryCollapsed?[]:this.run.jokers.map((j,i)=>({...p.slots[i],id:j.instanceId}));},cancelCanvas:()=>this.view.cancelInteraction(),tap:id=>this.inspectJoker(id),lift:(id,x,y)=>this.liftOwned(id,x,y),move:(x,y)=>this.previewOwned(x,y),drop:(id,x,y)=>this.moveJoker(id,x,y),cancel:()=>this.cancelOwned()});
    this.events.once('shutdown',()=>{this.ownedInput?.destroy();this.ownedInput=undefined;if(this.ownedDrag?.saving)this.input.enabled=true;this.ownedDrag?.destroy();this.ownedDrag=undefined;});this.render();this.prepareBossEntrance(owner,run,this.lifecycle);warmTableImages(this,this.run.characterId);
    if(!gameSession().reducedMotion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      this.view.root.setAlpha(.35);this.tweens.add({targets:this.view.root,alpha:1,duration:220,ease:'Cubic.easeOut'});
    }
  }
  /** Present only the saved owner snapshot; defer across existing modals without changing music. */
  private prepareBossEntrance(owner:NonNullable<ReturnType<typeof runController>>,run:R2RunState,lifecycle:number):void {
    let stopped=false,observer:MutationObserver|undefined;
    const stop=():void=>{stopped=true;observer?.disconnect();observer=undefined;this.events.off('create',attempt);};
    const valid=()=>!stopped&&this.scene.isActive()&&this.lifecycle===lifecycle&&runController(this)===owner&&owner.state===run&&this.run===run&&run.phase==='shop';
    const resume=()=>{if(valid())this.resumeMakeCards();};
    const attempt=()=>{
      if(!valid()){stop();return;}
      if(!shopBossPreparation(run)){this.audio.setScene('shop');resume();return;}
      const status=presentBossPreparation(this.dialog,run,{valid,onReveal:()=>{if(valid()){this.audio.setScene('boss');this.audio.sourceCue('boss');}},onFinish:()=>queueMicrotask(resume)});
      if(status!=='deferred'){observer?.disconnect();observer=undefined;}
      if(status==='not-applicable'){this.audio.setScene('shop');resume();}
      else if(status==='seen'){this.audio.setScene('boss');resume();}
      else if(status==='deferred'&&!observer){observer=new MutationObserver(()=>{if(!valid())stop();else if(!document.querySelector('dialog[open]'))attempt();});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});}
    };
    this.events.once('shutdown',stop);
    if(this.scene.isActive())attempt();else this.events.once('create',attempt);
  }
  private render():void {
    this.clearSynergyHighlights();
    this.dialog.refreshArtLoad();
    requestJokerArt(this,[...this.run.jokers.map(j=>j.definitionId),...this.run.shop!.offers.map(o=>o.definitionId)],()=>this.refreshJokerPictures());
    warmShopToolImages(this,this.run);
    const selectedIndex=this.shelfOffers().findIndex(offer=>offer.offerId===this.selectedOfferId);if(selectedIndex>=0)this.shelfPage=Math.floor(selectedIndex/this.pageSize);
    this.shelfPage=Math.min(this.shelfPage,Math.max(0,Math.ceil(this.shelfOffers().length/this.pageSize)-1));
    const v=this.view,p=this.geometry(),stage=getR2Stage(this.run.stageIndex,this.run.tourMode,this.run.difficulty,this.run)!;this.hideHoverPicture();this.ownedInput?.setBounds(undefined);this.ownedArts.clear();this.ownedHint=undefined;v.clear();v.paperBackground();drawShopBackdrop(this,v,p,this.run.characterId);this.offerArts=[];this.artTargets.clear();this.jokerArtTargets.clear();
    const isBossNext=!!shopBossPreparation(this.run);
    if(!isBossNext&&this.run.phase==='shop')this.audio.setScene('shop');
    this.game.canvas.setAttribute('aria-label',getCharacter(this.run.characterId).name+(isBossNext?'压轴备战':'的商店')+'，金币'+this.run.gold+'。'+this.run.shop!.offers.map(o=>{const g=shopOfferGuidance(this.run,o);return this.jokerDefinition(o.definitionId).name+'，'+g.decision.full;}).join('。'));
    this.pcOfferBoxes.clear();if(p.pc){this.renderPC(p);return;}
    const headerTabs=p.short&&p.inventoryCollapsed;
    const portraitHeader=p.portrait?shopPortraitHeader(p):undefined;
    const purse=portraitHeader?.purse??{x:headerTabs?p.x:p.x+p.w-(this.view.layout.width<=700?44:64)-124,y:p.top-1,width:116,height:34},purseArt=this.add.graphics();
    const character=getCharacter(this.run.characterId),titleRight=Math.min(...[purse,portraitHeader?.inventory,portraitHeader?.reroll,p.reroll,p.build].filter((b):b is Box=>!!b).filter(b=>b.y<p.top+32&&b.y+b.height>p.top&&b.x>=p.x).map(b=>b.x),p.x+p.w)-6;
    const avatar=avatarKey(character.id),withAvatar=p.portrait&&titleRight-p.x>=Math.max(68,38+character.name.length*14)&&this.textures.exists(avatar),titleX=p.x+(withAvatar?38:0);
    if(withAvatar){const image=this.add.image(p.x+16,p.top+16,avatar);image.setScale(32/image.width).setName('shop/hero-avatar').setData('assetId',character.id+'.avatar');v.add(image);const hit=v.rect({x:p.x-6,y:p.top-6,width:44,height:44}).setFillStyle(0,0).setStrokeStyle(0);v.target(hit,'shop/hero-details',{tap:()=>showHeroExplanation(this.dialog,character.id,{run:this.run,closeLabel:'返回商店'}),detail:()=>showHeroExplanation(this.dialog,character.id,{run:this.run,closeLabel:'返回商店'})});}
    const title=v.text(titleX,p.top+3,character.name+(this.run.tourMode==='endless'?' · 无尽筹备':isBossNext?' · 压轴备战':' · 筹备'),18).setColor('#f7f1df').setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold').setName('shop/title');
    if(title.x+title.width>titleRight)title.setText(character.name);
    for(let font=18;title.x+title.width>titleRight&&font>14;)title.setFontSize(--font);
    if(headerTabs)title.setVisible(false);
    v.material(purse,0xfff9ee,0xfff9ee,7);
    purseArt.lineStyle(1,0x916738).strokeRoundedRect(purse.x+.5,purse.y+.5,purse.width-1,purse.height-1,7);v.add(purseArt);
    const gold=v.text(purse.x+10,purse.y+5,(p.portrait?'':'金币 ')+this.run.gold,16,'#26313A').setName('shop/gold').setFontStyle('bold');
    for(let font=22;gold.width>purse.width-20&&font>14;)gold.setFontSize(--font);
    this.goldText=gold;
    drawShopArt(this,v,p);
    if(!p.portrait&&!p.short)v.text(p.x,p.top+37,`${stage.name} · 目标 ${heatText(stage.targetHeat)}`,14,'#3F606B',p.short?p.slots[4].x+p.slots[4].width-p.x:p.w-24);
    if(!p.short&&!p.inventoryCollapsed&&this.run.jokers.length>0){
      const savedGrowth=buildGrowthProgress(this.run)[0];
      const ownedLabel=this.run.jokers.length&&!p.inventoryCollapsed?this.ownedDragHint():savedGrowth?savedGrowth.name+' · '+savedGrowth.metric:p.portrait?`当前持有 ${this.run.jokers.length}/${r2JokerCapacity(this.run)}`:`随身 ${this.run.jokers.length}/${r2JokerCapacity(this.run)} · 点牌出售／调序`;
      const inline=p.portrait&&!p.copyBeside&&p.slots[0].y-p.shelf[0].y-p.shelf[0].height<122;
      v.text(inline?p.x:p.slots[0].x,inline?p.top+27:p.slots[0].y-20,ownedLabel,14,'#26313A',p.slots[4].x+p.slots[4].width-p.slots[0].x).setName('shop/owned-heading');
    }
    this.drawOwned(p);
    if(!p.portrait&&!p.short)v.button(p.chapter,p.portrait?(this.run.program&&!this.run.program.choiceMade?'接节目单':'本章'):'本章节目','action/chapter',()=>this.inspectChapter());
    if(!p.portrait&&!p.short)v.button(p.items,`物品 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)} · 道具${this.run.longTermItems.length}`,'action/items',()=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq)));
    const inventoryRow=shopToolInventoryRow(p.tabs);
    this.drawShelfTabs(p.portrait?p.tabs:inventoryRow.shelves);
    this.drawInventoryBag(portraitHeader?.inventory??inventoryRow.inventory);
    if(p.portrait&&this.run.jokers.length===0)this.drawEmptyShop(p);
    const offers=this.visibleOffers(),stockExtra=this.shelfKind==='jokers'&&offers.some(o=>(o.edition??'none')!=='none'),extraRows=offers.some(o=>(o.edition??'none')!=='none'&&this.run.chapterDisabledJokerId===o.definitionId)?2:1,phoneSummaryHeight=p.portrait?this.measureShopTextBox('同点\n顺子').height:0;
    offers.forEach((o,i)=>{
      if(this.shelfKind!=='jokers'){this.drawGoodsOffer(o,p.shelf[i],p.short,p.portrait);return;}
      const selected=this.selectedOfferId===o.offerId,b=p.shelf[i],d=this.jokerDefinition(o.definitionId),ability=this.jokerCopy(o.definitionId),first=v.root.length;
      this.drawOfferCard(b,d.rarity,selected,o.consumed,p.short).setData('offerId',o.offerId);
      this.drawJokerPicture(o.definitionId,p.portrait?b:{x:b.x+4,y:b.y+4,width:b.width-8,height:b.height-8},o.consumed?.35:1);
      const copy=shopOfferCopy(p,b,true),copyX=copy.x,copyY=copy.y,copyWidth=copy.width;
      const name=v.text(copyX,copyY+4,d.name,15,'#26313A').setFontStyle('bold').setName('shop/offer-name').setData('offerId',o.offerId);this.ellipsis(name,copyWidth);
      const plain=ability?.plain,full=plain?.line??ability?.summary??d.description;
      const decision=shopOfferGuidance(this.run,o).decision,purposeCopy=shopCandidateTradeoff(this.run,d.id)?'不弃牌可用；弃牌技停用':shopOfferSynopsis(decision.now,decision.later);
      const purpose=v.text(copyX,copyY+(p.portrait&&p.copyBeside?28:23),p.portrait&&p.copyBeside?purposeCopy.replaceAll('\n',' · '):purposeCopy,14,'#3F606B',copyWidth).setStyle({maxLines:0}).setName('shop/offer-purpose').setData('offerId',o.offerId).setData('definitionId',d.id).setData('fullText',full);
      purpose.setWordWrapWidth(copyWidth,true);
      if(p.portrait&&!p.copyBeside)purpose.setWordWrapWidth(0).setText(shopSummaryWrap(purposeCopy,copyWidth,s=>this.measureShopText(s)));
      if(purpose.height>(p.desktop?76:54))this.twoLines(purpose,copyWidth);

      const identity=v.text(copyX,copyY+24,p.portrait?shopShelfIdentityText(d.rarity,o.edition):shopIdentityText(d.rarity,o.edition),14,'#596B69',copyWidth).setName('shop/offer-identity').setData('offerId',o.offerId);
      purpose.setY(copyY+43).setWordWrapWidth(0).setText(shopOfferSummary(purposeCopy,copyWidth,s=>this.measureShopText(s)));
      if(p.portrait){identity.setY(name.y+name.height+4);purpose.setY(identity.y+identity.height+4);}
      const extraY=purpose.y+Math.max(purpose.height,phoneSummaryHeight)+4;
      this.drawOfferExtra(o,{x:copyX,y:extraY,width:copyWidth,height:20});
      const price=r2PurchasePrice(this.run,o),priceY=stockExtra?Math.max(copy.priceY,extraY+this.measureShopTextBox('倍率×1.5').height*extraRows+6):p.portrait?Math.max(copy.priceY,purpose.y+Math.max(purpose.height,phoneSummaryHeight)+6):copy.priceY;
      const priceInk=this.offerPricePlate(o,{x:copyX-2,y:priceY-2,width:copyWidth+2,height:24});
      const priceText=v.text(copyX,priceY,o.consumed?'已收入':p.portrait?price+'金 · '+(price>this.run.gold?'差'+(price-this.run.gold):selected?'详情':'选择'):price+' 金 · '+(this.run.jokers.length>=r2JokerCapacity(this.run)?'比较替换':'查看'),16,priceInk).setFontStyle('bold').setName('shop/offer-price').setData('offerId',o.offerId);
      if(!p.portrait&&!headerTabs&&!stockExtra)this.drawOfferGuidance(o,{x:copyX,y:copy.priceY-(p.copyBeside?36:54),width:copyWidth,height:p.copyBeside?34:52});
      this.markBuildOffer(o,'jokers',b);
      const tile=p.portrait||stockExtra?{...copy.tile,height:Math.max(copy.tile.height,priceY+priceText.height+4-copy.tile.y)}:copy.tile,hover=this.hoverCard(first,tile,o.definitionId,o.offerId),r=v.rect(tile).setFillStyle(0,0).setStrokeStyle().setData('selected',selected);
      const artBox=p.portrait?b:{x:b.x+4,y:b.y+4,width:b.width-8,height:b.height-8};
      mountPolychromeCardIridescence(this,hover.art,{...artBox,x:artBox.x-hover.art.x,y:artBox.y-hover.art.y},o.edition);
      this.offerArts.push(hover.art);v.target(r,`offer/${o.offerId}`,{tap:()=>this.selectOffer(o.offerId),detail:()=>this.inspectOffer(o.offerId),...hover});

    });
    if(!offers.length)v.text(p.shelf[0].x,p.shelf[0].y,this.shelfKind==='items'?'本店暂无可购道具；换牌会保留此货架。':'本货架暂无商品，可换一批或进入牌桌。',14,'#3F606B',p.w);
    const allowed=r2RunModeConfig(this.run).reroll.allowed,cost=this.run.shop?.freeRerolls?0:r2PaidRerollPrice(this.run),canReroll=this.ready&&allowed&&this.run.gold>=cost&&r2Pool(this.run.jokers.map(j=>j.definitionId),this.run.safetyNetUsed?['f07']:[]).length>0;
    if(portraitHeader)this.drawRefresh(portraitHeader.reroll);else this.shopButton(p.reroll,!allowed?'禁止换牌':this.run.shop?.freeRerolls?'免费换牌':`换牌 ${cost} 金`,'action/reroll',()=>void this.send({type:'RerollShop'}),canReroll);
    this.shopButton(p.play,'进入牌桌','action/start-stage',()=>void this.send({type:'LeaveShop'}),this.ready,true);
    if(p.portrait)this.shopButton({...p.reroll,width:p.w},this.lastPurchaseReceipt?'购物结果':this.buildLabel(),'action/build',()=>this.lastPurchaseReceipt?this.openPurchaseReceipt():this.inspectJourney());
    else this.shopButton(p.build,this.lastPurchaseReceipt?'购物结果':p.portrait&&p.copyBeside?'培养':p.inventoryCollapsed?`培养 ${this.run.jokers.length}/${r2JokerCapacity(this.run)}`:this.buildLabel(),'action/build',()=>this.lastPurchaseReceipt?this.openPurchaseReceipt():this.inspectJourney());
    const reason=!this.ready?'当前进度未保存或只读，请查看菜单。':allowed&&this.run.gold<cost?`换牌还差 ${cost-this.run.gold} 金。可直接入场。`:this.shelfKind==='jokers'&&this.run.jokers.length===r2JokerCapacity(this.run)?`${r2JokerCapacity(this.run)}槽已满，点随身牌出售后再买。`:this.shelfKind==='tools'?'购买后收入库存；查看详情，再确认使用。':this.shelfKind==='items'?'道具本局生效；换牌不重抽道具货架。':p.portrait?'点商品看配合，再点看详情；确认后扣款。':'点卡牌不会扣钱；点随身牌可出售或左移、右移。';
    const discovery=this.ready&&!this.notice?savedGrowthDiscovery(this.run,'shop'):undefined;
    this.noticeLabel=v.text(p.short?p.x:p.tabs.x,p.noticeY,this.busy?'正在保存…':this.shopNotice||(this.shelfKind==='tools'?r2BasicToolShelfStatus(this.run):undefined)||discovery?.full||(!p.portrait?(starterShopCue(this.run)||firstChapterGuide(this.run)?.cue):undefined)||reason,14,this.shopNotice?'#B8473A':'#3F606B',p.short?p.w:p.tabs.width).setStyle({maxLines:p.short?1:2}).setName(discovery?'growth/discovery':'');
    this.drawDecisionIdle(p);this.drawFirstGuide(p);
    this.drawResultCue();
  }
  private drawShopPortrait(p:ReturnType<typeof shopLayout>):void {
    const pc=p.pc;if(!pc)return;const character=getCharacter(this.run.characterId),key=selectionPortraitKey(character.id);
    if(!this.textures.exists(key))return;
    const b=pc.left,guide=firstChapterShopPrompt(this.run)&&this.ready?shopFirstGuideLayout(p,this.view.layout.height,this.run.jokers.length===0):undefined;
    const artY=b.y+236,artHeight=Math.max(80,b.height-280),image=this.add.image(b.x+b.width/2,artY+artHeight/2,key);
    image.setScale(Math.min((b.width-8)/image.width,artHeight/image.height)).setName('shop/hero-portrait');this.view.add(image);
    if(guide)this.view.add(this.add.graphics().fillStyle(PAPER_THEME.paperLight,.96).fillRoundedRect(guide.box.x-4,guide.box.y-4,guide.box.width+8,guide.box.height+8,6));
    const hit=this.view.add(this.add.rectangle(b.x+b.width/2,b.y+b.height/2,b.width,b.height,0,0));
    this.view.target(hit,'shop/hero-preparation',{tap:()=>showHeroExplanation(this.dialog,character.id,{run:this.run,closeLabel:'返回商店'}),detail:()=>showHeroExplanation(this.dialog,character.id,{run:this.run,closeLabel:'返回商店'})});
    this.view.text(b.x+b.width/2,b.y+b.height-31,character.name+' · 原画与技能 ↗',14,'#3F606B').setOrigin(.5,0).setName('shop/hero-caption');
  }
  private drawOwned(p:ReturnType<typeof shopLayout>):void {
    const v=this.view;
    if(!p.inventoryCollapsed)this.run.jokers.forEach((j,i)=>{
      const b=p.slots[i],d=this.jokerDefinition(j.definitionId),ability=this.jokerCopy(j.definitionId,j),first=v.root.length;
      const modern=!!p.pc||p.portrait,held=modern?shopHeldGeometry(b,p.portrait):undefined;
      if(!modern)this.drawSlot(b,true,d.rarity);const cue=routeFitCue(this.run,'jokers',j.definitionId,j.instanceId);if(cue)v.add(routeFrame(this,b,cue,d.rarity==='rare').setName('shop/held-route-fit'));
      this.drawJokerPicture(j.definitionId,held?.art??{x:b.x+3,y:b.y+22,width:b.width-6,height:b.height-25});
      const nameArea=held?.name??{...shopOwnedNameArea(b,p.slots[i+1]?.x,v.layout.width),y:b.y+3};
      const ownedName=v.text(nameArea.x,nameArea.y,d.name,modern?12:14,'#26313A').setName('shop/owned-name').setData('instanceId',j.instanceId);this.ellipsis(ownedName,nameArea.width);
      if(held){const label=v.text(held.identity.x,held.identity.y,shopIdentityText(d.rarity,j.edition,true),11,'#596B69').setName('shop/owned-identity').setData('instanceId',j.instanceId);this.ellipsis(label,held.identity.width);}
      else v.add(createJokerRarityBadge(this,d.rarity,{x:b.x+b.width-31,y:b.y+b.height-21,compact:true}).setData('definitionId',j.definitionId).setData('surface','owned'));

      if(p.pc){const caption=v.text(b.x,b.y+b.height+2,jokerRouteCaption(this.run,j,b.width,s=>this.measureShopText(s)),14,'#3F606B').setName('shop/owned-state').setData('instanceId',j.instanceId).setData('fullText',jokerRouteCaption(this.run,j));this.ellipsis(caption,b.width);}
      if(!p.pc&&b.y+b.height+20<=p.reroll.y-4){const roomy='guidanceBelow' in p&&p.guidanceBelow,copy=roomy?jokerApplicableRoutes(this.run,j).map(f=>({group:'同点',straight:'顺子',flush:'同花'})[f]).join('\n'):jokerRouteCaption(this.run,j,b.width);v.text(b.x+b.width/2,b.y+b.height+3,copy,14,'#3F606B').setOrigin(.5,0).setName('shop/owned-route');}
      const hover=this.hoverCard(first,b,j.definitionId),r=v.rect(p.pc?b:shopOwnedHitBox(b,p.reroll.y,!!ability||!p.portrait)).setFillStyle(0,0).setStrokeStyle();
      const artBox=held?.art??{x:b.x+3,y:b.y+22,width:b.width-6,height:b.height-25};
      mountPolychromeCardIridescence(this,hover.art,{...artBox,x:artBox.x-hover.art.x,y:artBox.y-hover.art.y},j.edition);
      this.ownedArts.set(j.instanceId,hover.art);
      // Native surface owns mouse/touch; named canvas geometry remains for keyboard/detail fallback and harness observation.
      v.target(r,`joker/${j.instanceId}`,{tap:()=>this.inspectJoker(j.instanceId),detail:()=>this.inspectJoker(j.instanceId),...hover});
    });
    const last=p.slots[this.run.jokers.length-1];
    if(last&&!p.inventoryCollapsed){
      const first=p.slots[0];this.ownedInput?.setBounds({x:first.x,y:first.y,width:last.x+last.width-first.x,height:first.height});
      const heading=v.root.list.find(o=>o.name==='shop/owned-heading') as Phaser.GameObjects.Text|undefined;
      const railEnd=p.slots[p.slots.length-1];
      this.ownedHint=p.pc&&heading?heading.setText(`持有 ${this.run.jokers.length}/${r2JokerCapacity(this.run)} · `+this.ownedDragHint()):p.short?v.text(first.x,first.y-24,this.ownedDragHint(),14,PAPER_CSS.jade,railEnd.x+railEnd.width-first.x).setName('shop/owned-drag-hint'):heading;
      if(this.ownedHint&&this.ownedHint.y>first.y-30)this.ownedHint.setY(first.y-24);
      this.ownedDrag?.rebind();
    }
    if(!p.short&&this.run.jokers.length&&!firstChapterShopPrompt(this.run)){
      const first=this.run.jokers[0],plain=this.jokerCopy(first.definitionId,first)?.plain;
      const x=p.pc?p.build.x:p.x,y=p.pc?p.slots[0].y:Math.max(p.chapter.y+p.chapter.height,p.items.y+p.items.height)+8,limit=p.pc?p.slots[0].y+p.slots[0].height:p.reroll.y-8,width=p.pc?p.pc.inventoryEntry.x-x-12:p.w;
      if(plain&&width>=160&&limit-y>=56){const text=v.text(x,y,this.jokerDefinition(first.definitionId).name+' · '+plain.line+'\n'+plain.status,14,'#3F606B',width).setName('shop/held-purpose').setData('instanceId',first.instanceId);if(text.height>limit-y)text.setText(this.jokerDefinition(first.definitionId).name+' · '+plain.tile);}
    }
    const guide=!p.portrait&&firstChapterShopPrompt(this.run)&&this.ready?shopFirstGuideLayout(p,this.view.layout.height,this.run.jokers.length===0):undefined;
    for(let i=this.run.jokers.length;!p.inventoryCollapsed&&this.run.jokers.length>0&&!guide?.replacesEmptySlots&&i<r2JokerCapacity(this.run);i++){
      const b=p.slots[i];this.drawSlot(b,false);v.text(b.x+b.width/2,b.y+b.height-21,p.portrait?String(i+1):`空槽 ${i+1}`,14,'#a6bab0').setOrigin(.5,0);
    }
  }
  private renderPC(p:ReturnType<typeof shopLayout>):void {
    const pc=p.pc!;const v=this.view,stage=getR2Stage(this.run.stageIndex,this.run.tourMode,this.run.difficulty,this.run)!;
    drawShopArt(this,v,p);this.drawShopPortrait(p);
    v.text(p.x+16,p.top+16,getCharacter(this.run.characterId).name+(this.run.tourMode==='endless'?' · 无尽筹备':' · 筹备'),this.run.tourMode==='endless'?20:24,'#26313A',pc.left.width-32).setFontStyle('bold').setName('shop/title');
    v.text(p.x+16,p.top+58,stage.name,16,'#3F606B',pc.left.width-32);
    v.text(p.x+16,p.top+84,'目标',14,'#596B69',pc.left.width-32);
    v.text(p.x+16,p.top+104,heatText(stage.targetHeat),30,'#A33E2E',pc.left.width-32).setFontStyle('bold').setName('shop/target');
    this.goldText=v.text(p.x+16,p.top+146,'金币 '+this.run.gold,24,'#26313A',pc.left.width-32).setName('shop/gold').setFontStyle('bold');
    v.button({...p.chapter,x:p.chapter.x+12,width:p.chapter.width-24},programEntryLabel(this.run),'action/chapter',()=>this.inspectChapter());
    const headingWidth=Math.max(160,p.build.x-pc.ownedRail.x-8);
    v.text(pc.ownedRail.x,p.top+12,`已持唐宋牌 ${this.run.jokers.length}/${r2JokerCapacity(this.run)} · 从左向右结算`,16,'#26313A',headingWidth).setName('shop/owned-heading');
    this.shopButton(p.build,this.lastPurchaseReceipt?'购物结果':this.buildLabel(),'action/build',()=>this.lastPurchaseReceipt?this.openPurchaseReceipt():this.inspectJourney());this.drawOwned(p);
    this.drawInventoryBag(pc.inventoryEntry);this.drawRefresh(p.reroll);
    this.shopButton(p.play,'进入牌桌  →','action/start-stage',()=>void this.send({type:'LeaveShop'}),this.ready,true);
    v.text(p.tabs.x,pc.shopPanel.y+6,`购买唐宋牌 · 现货 ${this.run.shop!.offers.filter(o=>!o.consumed).length}`,16,'#26313A').setFontStyle('bold').setName('shop/category-jokers');
    const jokerPages=Math.max(1,Math.ceil(this.run.shop!.offers.length/3));this.pcPages.jokers=Math.min(this.pcPages.jokers,jokerPages-1);
    if(jokerPages>1)this.shopButton({x:pc.shopPanel.x+pc.shopPanel.width-64,y:pc.shopPanel.y,width:52,height:44},`${this.pcPages.jokers+1}/${jokerPages} ›`,'action/pc-page-jokers',()=>{this.pcPages.jokers=(this.pcPages.jokers+1)%jokerPages;this.render();});
    this.run.shop!.offers.slice(this.pcPages.jokers*3,(this.pcPages.jokers+1)*3).forEach((o,i)=>this.drawPCOffer(o,'jokers',pc.jokerOffers[i]));
    for(const kind of ['tools','items'] as const){
      const offers=this.shelfOffers(kind),group=kind==='tools'?pc.toolOffers:pc.itemOffers,capacity=this.pcGroupCapacity(kind,p),pages=Math.max(1,Math.ceil(offers.length/capacity));this.pcPages[kind]=Math.min(this.pcPages[kind],pages-1);
      v.text(group.x,pc.groupY,SHOP_CATEGORIES[kind].title+` · ${offers.filter(o=>!o.consumed).length}`,16,'#26313A').setFontStyle('bold').setName('shop/category-'+kind);
      if(pages>1){const b={x:group.x+group.width-44,y:pc.groupY-10,width:44,height:44};this.shopButton(b,`${this.pcPages[kind]+1}/${pages} ›`,'action/pc-page-'+kind,()=>{this.pcPages[kind]=(this.pcPages[kind]+1)%pages;this.render();});}
      const visible=offers.slice(this.pcPages[kind]*capacity,this.pcPages[kind]*capacity+capacity),grid=shopGoodsGrid(group,visible.length);
      if(!visible.length)v.text(group.x+10,group.y+18,'暂无待售'+(kind==='tools'?'工具':'长期物品'),14,'#7B7365',group.width-20);
      visible.forEach((o,i)=>this.drawPCOffer(o,kind,grid.boxes[i]));
    }
    v.text(pc.workshop.x,pc.groupY,'自选做牌',16,'#26313A').setFontStyle('bold').setName('shop/category-workshop');
    this.drawWorkshopActions(pc.workshop);
    const discovery=this.ready&&!this.notice?savedGrowthDiscovery(this.run,'shop'):undefined;
    this.noticeLabel=v.text(pc.feedback.x+6,pc.feedback.y,this.busy?'正在保存…':this.shopNotice||discovery?.full||shopPracticeQuota(this.run)||r2BasicToolShelfStatus(this.run)||starterShopCue(this.run)||firstChapterGuide(this.run)?.cue||'点商品只看详情，确认才扣款；购买工具不会自动使用。',14,this.shopNotice?'#B8473A':'#3F606B',pc.feedback.width-12).setStyle({maxLines:2}).setName(discovery?'growth/discovery':'');this.drawResultCue();
    this.drawFirstGuide(p);
  }
  private firstGuideOptions():void {
    this.dialog.open('首章提示选项','提示是可选帮助；关闭提示不修改牌组、金币或进度。',(['step','run','forever'] as const).map((scope,i)=>({label:['略过此提示','本局关闭提示','不再显示提示'][i],run:()=>{dismissFirstChapterGuide(this.run,scope);this.dialog.close();this.render();}})),{closeLabel:'回到筹备'});
  }
  private drawDecisionIdle(p:ReturnType<typeof shopLayout>):void {
    const b=shopDecisionBox(p);if(!b||this.shelfKind!=='jokers'||this.run.jokers.length===0||this.visibleOffers().some(o=>(o.edition??'none')!=='none'))return;
    this.view.text(b.x+4,b.y+8,'点商品看配合，再点看详情；确认后扣款。',14,'#3f606b',b.width-8).setName('shop/decision-idle');
  }
  private drawFirstGuide(p:ReturnType<typeof shopLayout>):void {
    if(p.portrait)return;
    const hint=firstChapterShopPrompt(this.run),g=hint&&this.ready?shopFirstGuideLayout(p,this.view.layout.height,this.run.jokers.length===0):undefined;if(!hint||!this.ready)return;
    const list=p.portrait&&p.copyBeside;
    const openStep=()=>{const step=hint.opening;if(step?.kind==='basic-tools')this.inspectBasicChoice();else if(step?.kind==='jokers'||step?.kind==='tools'){this.shelfKind=step.kind;this.inspectOffer(step.offerId);}else if(step?.kind==='inventory')showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq),step.instanceId);else this.inspectJourney();};
    if(list){const x=p.build.x+p.build.width+6;this.shopButton({x,y:p.build.y,width:p.build.width,height:44},hint.action,'first-guide/shop-open',openStep);this.shopButton({x:x+p.build.width+6,y:p.build.y,width:p.build.width,height:44},'提示','first-guide/shop-options',()=>this.firstGuideOptions());}
    if(!g)return;
    const v=this.view;if(!p.portrait)v.material(g.box,0xe2e8e5,0xe2e8e5,6);
    if(g.headingHeight){const focus=currentBuildFocus(this.run,this.run.openingRoute);v.text(g.box.x+g.padding,g.box.y+g.padding,(focus?BUILD_LABEL[focus]+' · ':'')+'可选筹备',14,'#3F606B',g.box.width-g.padding*2).setName('first-guide/shop-heading');}
    v.text(g.box.x+g.padding,g.box.y+g.padding+g.headingHeight,hint.text,14,'#26313A',g.box.width-g.padding*2).setFontStyle('bold').setName('first-guide/shop-copy');
    if(!list)this.shopButton(g.buttons[0],hint.action,'first-guide/shop-open',openStep);
    if(!list)this.shopButton(g.buttons[1],'提示选项','first-guide/shop-options',()=>this.firstGuideOptions());
  }
  /** Long real rules may need a whole group; paging must use the same final capacity. */
  private pcGroupCapacity(kind:'tools'|'items',p:ReturnType<typeof shopLayout>):number {
    const group=kind==='tools'?p.pc!.toolOffers:p.pc!.itemOffers;
    return shopGoodsGrid(group,kind==='tools'?this.run.shop!.toolOffers.length:this.shelfOffers(kind).length).capacity;
  }
  private shopJokerSummary(id:string):string {
    const d=this.jokerDefinition(id);
    if(this.run.contentVersion==='quality-r2-group-upgrade-prototype-v1'&&(id==='b10'||id==='b03')){
      const growth=d.hooks.flatMap(h=>h.operations).find(op=>op.kind==='add-growth');
      if(growth?.kind==='add-growth')return `本手读已存${id==='b10'?'热度':'倍率'}；成组手后+${fractionText(growth.value)}，上限+${fractionText(growth.cap)}，下手起生效。`;
    }
    return this.jokerCopy(id)?.plain?.line??this.jokerCopy(id)?.summary??d.description;
  }
  private drawPCOffer(o:R2Offer,kind:ShelfKind,tile:Box):void {
    const v=this.view,first=v.root.length,d=kind==='jokers'?this.jokerDefinition(o.definitionId):undefined,info=kind==='tools'?toolInfo(o.definitionId,this.run):kind==='items'?itemInfo(o.definitionId):undefined;
    const g=shopOfferGeometry(tile,kind,kind==='jokers'&&(o.edition??'none')!=='none',this.run.chapterDisabledJokerId===o.definitionId?2:1);if(!g){this.shopButton(tile,'查看 '+(d?.name??info!.name),'offer/'+o.offerId,()=>this.inspectOffer(o.offerId));return;}
    shopSheet(this,v,'offer',tile,this.selectedOfferId===o.offerId?PAPER_THEME.jadeSoft:PAPER_THEME.paperLight);
    let summary=d?this.shopJokerSummary(d.id):info!.summary;
    if(d){const decision=shopOfferGuidance(this.run,o).decision;summary=shopOfferSynopsis(decision.now,decision.later);}
    const heroTradeoff=d?shopCandidateTradeoff(this.run,d.id):undefined;if(heroTradeoff)summary=heroTradeoff;
    if(d)this.drawJokerPicture(d.id,g.art);else this.drawGoodsArt(o.definitionId,info!.artUrl,g.art,1,info!.fallbackArtUrl);
    const name=v.text(g.title.x,g.title.y,d?.name??info!.name,15,'#26313A').setFontStyle('bold').setName('shop/offer-name').setData('offerId',o.offerId);this.ellipsis(name,g.title.width);
    if(d&&g.identity)v.text(g.identity.x,g.identity.y,shopIdentityText(d.rarity,o.edition),14,'#596B69',g.identity.width).setName('shop/offer-identity').setData('offerId',o.offerId);
    const purpose=v.text(g.summary.x,g.summary.y,summary,14,'#3F606B',g.summary.width).setName('shop/offer-purpose').setData('offerId',o.offerId);purpose.setWordWrapWidth(0).setText(d?shopOfferSummary(summary,g.summary.width,s=>this.measureShopText(s)):shopSummaryWrap(summary,g.summary.width,s=>this.measureShopText(s),2)).setData('fullText',summary);
    if(g.extra)this.drawOfferExtra(o,g.extra);
    const priceInk=this.offerPricePlate(o,g.price);
    v.text(g.price.x,g.price.y,o.consumed?'已购':g.price.width<126?`${r2PurchasePrice(this.run,o)} 金`:`${r2PurchasePrice(this.run,o)} 金 · ${d&&this.run.jokers.length>=r2JokerCapacity(this.run)?'比较替换':'查看'}`,16,priceInk).setFontStyle('bold').setName('shop/offer-price').setData('offerId',o.offerId);
    const reason=o.consumed?'':this.purchaseReason(o,true);if(reason){const note=v.text(g.reason.x,g.reason.y,reason,14,'#B8473A').setName('shop/offer-reason').setData('offerId',o.offerId);this.ellipsis(note,g.reason.width);}
    const hover=this.hoverCard(first,tile,d?.id,d?o.offerId:undefined),hit=v.rect(tile).setFillStyle(0,0).setStrokeStyle().setData('selected',this.selectedOfferId===o.offerId);
    const artBox={...g.art,x:g.art.x-hover.art.x,y:g.art.y-hover.art.y};
    if(d)mountPolychromeCardIridescence(this,hover.art,artBox,o.edition);
    else if(kind==='tools')mountForgetTechniqueAttention(this,hover.art,artBox,o.definitionId);
    this.pcOfferBoxes.set(o.offerId,tile);this.offerArts.push(hover.art);v.target(hit,'offer/'+o.offerId,{tap:()=>this.selectOffer(o.offerId),detail:()=>this.inspectOffer(o.offerId),...hover});
  }
  private get resultReduced():boolean{return gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  private drawResultCue():void {
    const result=this.resultFeedback.snapshot(performance.now(),this.resultReduced);this.resultKey=result?.key;
    this.resultLayer?.destroy(true);this.resultLayer=undefined;this.resultNote=undefined;this.resultPlate=undefined;
    this.noticeLabel?.setVisible(!result);if(!result)return;
    const p=this.geometry(),bottom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom'))||0,b=shopResultBox(p,this.view.layout.height,bottom);
    const layer=this.add.container(0,0).setName('shop/result-layer');this.resultLayer=layer;
    this.resultPlate=this.add.graphics().fillStyle(PAPER_THEME.paperLight,1).fillRoundedRect(b.x,b.y,b.width,b.height,4).lineStyle(1,PAPER_THEME.divider,.7).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,4).setAlpha(result.alpha).setName('shop/result-plate').setData('bounds',b);
    // Use the shared text constructor; detach only the feedback from full-table
    // redraw so expiry cannot cancel an in-progress press on a shop action.
    this.resultNote=this.view.text(b.x+6,b.y+2,result.text,14,PAPER_CSS.ink).setName(result.name).setAlpha(result.alpha).setData('resultKey',result.key);
    if(this.resultNote.width>b.width-12)this.resultNote.setText(result.text.split(' · ')[0]+' · 完整结果见构筑详情');
    layer.add([this.resultPlate,this.resultNote]);
  }
  update():void {
    if(!this.scene.isActive()||!this.view)return;const result=this.resultFeedback.snapshot(performance.now(),this.resultReduced);
    if(result?.key!==this.resultKey){this.drawResultCue();return;}
    if(result){this.resultNote?.setAlpha(result.alpha);this.resultPlate?.setAlpha(result.alpha);}
  }
  private shopButton(b:Box,label:string,name:string,action:()=>void,enabled=true,primary=false):Phaser.GameObjects.Rectangle {
    const button=this.view.button(b,label,name,action,enabled,primary);
    if(!primary){const art=button.getData('buttonArt') as Phaser.GameObjects.Container;(art.list[0] as Phaser.GameObjects.Graphics).clear().fillStyle(0xfff9ee,1).fillRoundedRect(0,0,b.width,b.height,8);(art.list[1] as Phaser.GameObjects.Graphics).clear();}
    if(primary&&enabled){const art=button.getData('buttonArt') as Phaser.GameObjects.Container;
      (art.list[0] as Phaser.GameObjects.Graphics).clear().fillStyle(0x203f3b,1).fillRoundedRect(0,0,b.width,b.height,6);
      (art.list[1] as Phaser.GameObjects.Graphics).clear().lineStyle(1,0x203f3b,1).strokeRoundedRect(.5,.5,b.width-1,b.height-1,6);
    }
    if(this.geometry().portrait&&!primary&&!['action/reroll','action/build'].includes(name)){const art=button.getData('buttonArt') as Phaser.GameObjects.Container;
      (art.list[0] as Phaser.GameObjects.Graphics).clear();(art.list[1] as Phaser.GameObjects.Graphics).clear();
      (button.getData('label') as Phaser.GameObjects.Text).setFontStyle('normal');
    }
    return button;
  }
  private drawShelfTabs(b:Box):void {
    const gap=2,pages=Math.ceil(this.shelfOffers().length/this.pageSize),pagerWidth=pages>1?44:0,width=(b.width-pagerWidth-gap*(pagerWidth?4:3))/4;
    const categories=[{id:'jokers',title:'唐宋牌'},{id:'workshop',title:'自选做牌'},{id:'tools',title:'消耗工具'},{id:'items',title:'长期物品'}] as const;
    categories.forEach((category,i)=>{
      const workshop=category.id==='workshop',active=!workshop&&this.shelfKind===category.id;
      const count=workshop?(this.run.shop?.basicChoice?.purchase?'本店已用':'共用1次'):String(this.shelfOffers(category.id).filter(o=>!o.consumed).length);
      const title=width<60?{jokers:'唐宋牌',workshop:'自选',tools:'工具',items:'长期'}[category.id]:category.title;
      const button=this.shopButton({x:b.x+i*(width+gap),y:b.y,width,height:44},title+'\n'+count,'action/shelf-'+category.id,()=>{if(this.busy)return;if(workshop){this.openWorkshop();return;}this.shelfKind=category.id;this.shelfPage=0;this.selectedOfferId=undefined;this.audio.select();this.render();},!this.busy);
      const label=button.getData('label') as Phaser.GameObjects.Text;label.setFontSize(14).setAlign('center').setFontStyle(active||workshop?'bold':'normal').setColor(active?'#B8473A':'#3F606B');
      if(active)(button.getData('buttonArt') as Phaser.GameObjects.Container).add(this.add.graphics().lineStyle(2,0xb8473a).lineBetween(6,42,width-6,42));
    });
    if(pages>1)this.shopButton({x:b.x+b.width-44,y:b.y,width:44,height:44},`${this.shelfPage+1}/${pages} ›`,'action/shelf-page',()=>{if(this.busy)return;this.shelfPage=(this.shelfPage+1)%pages;this.selectedOfferId=undefined;this.audio.select();this.render();},!this.busy);
  }
  private findOffer(id:string):{kind:ShelfKind;offer:R2Offer}|undefined {
    for(const kind of ['jokers','tools','items'] as const){const offer=this.shelfOffers(kind).find(row=>row.offerId===id);if(offer)return {kind,offer};}
  }
  private drawGoodsArt(id:string,url:string,b:Box,alpha=1,fallbackUrl=url):Phaser.GameObjects.Container {
    const external=!url.startsWith('data:'),key=external?goodsArtKey(id):'goods-motif/'+id;
    const holder=this.view.add(this.add.container(b.x+b.width/2,b.y+b.height/2).setName('shop/goods-art/'+id).setData('artUrl',url).setData('bounds',b));
    const target={holder,box:b,alpha},register=(artKey:string)=>{const targets=this.artTargets.get(artKey)??[];if(!targets.includes(target))targets.push(target);this.artTargets.set(artKey,targets);};register(key);
    if(this.textures.exists(key)){this.paintGoodsArt(key);return holder;}
    holder.add(this.view.text(0,0,this.shelfKind==='tools'?'工具':'道具',18,'#85784f').setOrigin(.5));
    const fallbackKey='goods-motif/'+id;register(fallbackKey);
    if(this.textures.exists(fallbackKey))this.paintGoodsArt(fallbackKey);
    else if(!this.artRefreshListeners.has(fallbackKey)){
      const lifecycle=this.lifecycle,loaded=()=>{this.artRefreshListeners.delete(fallbackKey);if(lifecycle===this.lifecycle&&this.scene.isActive())this.paintGoodsArt(this.textures.exists(key)?key:fallbackKey);};
      this.artRefreshListeners.set(fallbackKey,loaded);this.textures.once('addtexture-'+fallbackKey,loaded);this.textures.addBase64(fallbackKey,fallbackUrl);
    }
    if(external)requestGoodsArt(this,id,url,()=>{this.paintGoodsArt(key);this.dialog.refreshArtLoad();});
    return holder;
  }
  private paintGoodsArt(key:string):void {
    if(!this.textures.exists(key))return;
    for(const target of this.artTargets.get(key)??[]){
      if(!target.holder.active)continue;
      const image=this.add.image(0,0,key),scale=Math.min(target.box.width/image.width,target.box.height/image.height);
      target.holder.removeAll(true);target.holder.add(image.setScale(scale).setAlpha(target.alpha));
    }
  }

  private ellipsis(text:Phaser.GameObjects.Text,width:number):void {text.setData('fullText',text.text);let copy=text.text;while(text.width>width&&copy.length){copy=copy.slice(0,-1);text.setText(copy+'…');}}
  private twoLines(text:Phaser.GameObjects.Text,width:number):void {
    const full=text.text;let line='',lines:string[]=[];text.setWordWrapWidth(0);
    for(const char of full.replaceAll('\n',' ')){text.setText(line+char);if(text.width>width&&line){lines.push(line);line=char;if(lines.length===2)break;}else line+=char;}
    if(lines.length<2)lines.push(line);else{let last=lines[1];text.setText(last+'…');while(text.width>width&&last.length){last=last.slice(0,-1);text.setText(last+'…');}lines[1]=last+'…';}
    text.setText(lines.join('\n')).setData('fullText',full);
  }
  private openWorkshop(goal?:WorkshopTab):void {this.makeCardsView.workshopTab=goal;this.makeCardsView.intent=undefined;this.inspectMakeCards();}
  private drawOfferExtra(offer:R2Offer,b:Box):void {
    if((offer.edition??'none')==='none')return;
    const bonus=jokerExtraBonusCopy(offer.edition,{definitionId:offer.definitionId,chapterDisabled:this.run.chapterDisabledJokerId===offer.definitionId});
    // The identity row already carries the label; narrow columns keep the remainder of the canonical shelf copy.
    const prefix=bonus.label+' · ',copy=b.width>=180?bonus.shelf:bonus.shelf.startsWith(prefix)?bonus.shelf.slice(prefix.length):bonus.shelf;
    this.view.text(b.x,b.y,copy,14,copy.includes('×')?'#783D7F':'#8A5B2D',b.width).setFontStyle('bold').setName('shop/offer-extra').setData('offerId',offer.offerId).setData('edition',offer.edition);
  }
  private drawWorkshopActions(b:Box):void {
    for(const [i,goal] of WORKSHOP_GOALS.entries())this.shopButton({x:b.x,y:b.y+i*48,width:b.width,height:44},goal.title+'  ›','action/workshop-'+goal.id,()=>this.openWorkshop(goal.id),!this.busy);
    this.view.text(b.x+4,b.y+148,this.run.shop?.basicChoice?.purchase?'本店已用 · 下一店恢复':'每店共用1次 · 查看费用',14,'#596B69',b.width-8).setName('shop/workshop-quota');
  }
  private drawInventoryBag(b:Box):void {
    const compact=b.width<132,onInk=this.geometry().portrait,button=this.shopButton(b,compact?String(this.run.consumables.length):`工具包 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)}`,'action/tool-inventory',()=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq)),!this.busy);
    button.setData('chest',true);inventoryFeedback(this,button,this.run,this.ready,this.resultReduced);
    const art=button.getData('buttonArt') as Phaser.GameObjects.Container,g=this.add.graphics().lineStyle(1.7,onInk?0xf7f1df:0x42665d,1).strokeRoundedRect(8,13,22,25,5).strokeRoundedRect(13,7,12,10,4).lineBetween(9,23,29,23).strokeRoundedRect(13,27,12,7,2);art.add(g);
    const label=button.getData('label') as Phaser.GameObjects.Text;label.setText(compact?String(this.run.consumables.length):`工具包 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)}`).setFontSize(14).setX(b.x+(compact?39:b.width/2+13));
    if(onInk)label.setColor(this.run.consumables.length?'#f3c885':'#f7f1df');
  }
  private drawRefresh(b:Box):void {
    const allowed=r2RunModeConfig(this.run).reroll.allowed,cost=this.run.shop?.freeRerolls?0:r2PaidRerollPrice(this.run),enabled=this.ready&&allowed&&this.run.gold>=cost&&r2Pool(this.run.jokers.map(j=>j.definitionId),this.run.safetyNetUsed?['f07']:[]).length>0;
    const button=this.shopButton(b,'↻ '+(allowed?cost+'金':'禁用'),'action/reroll',()=>void this.send({type:'RerollShop'}),enabled),art=button.getData('buttonArt') as Phaser.GameObjects.Container;
    (art.list[0] as Phaser.GameObjects.Graphics).clear().fillStyle(0xe2e8df,1).fillRoundedRect(0,0,b.width,b.height,22);(art.list[1] as Phaser.GameObjects.Graphics).clear();
    (button.getData('label') as Phaser.GameObjects.Text).setFontSize(b.width<80?14:16).setColor('#36594f');
  }
  private drawEmptyShop(p:ReturnType<typeof shopLayout>):void {
    const b=shopEmptyPortrait(p,this.shelfKind==='jokers'&&this.visibleOffers().some(o=>(o.edition??'none')!=='none'));if(!b)return;const key=selectionPortraitKey(this.run.characterId),textWidth=Math.max(136,b.width*.48),buttonOffset=Math.min(58,b.height-44);
    if(this.textures.exists(key)){const image=this.add.image(b.x+textWidth+(b.width-textWidth)/2,b.y+b.height/2,key);image.setScale(Math.min((b.width-textWidth)/image.width,b.height/image.height)).setName('shop/hero-portrait');this.view.add(image);}
    if(buttonOffset>=24)this.view.text(b.x+4,b.y,'自选做牌',16,'#26313A').setFontStyle('bold').setName('shop/empty-workshop-heading');
    if(buttonOffset>=46)this.view.text(b.x+4,b.y+24,'升级牌型 · 点数 · 花色',14,'#596B69',textWidth-8);
    this.shopButton({x:b.x,y:b.y+buttonOffset,width:textWidth-8,height:44},'查看目标与费用 ›','action/basic-choice',()=>this.openWorkshop(),!this.busy);
  }
  private inspectMakeCards():void {
    if(this.busy||this.run.phase!=='shop')return;
    const seq=this.run.commandSeq,shopSeq=this.run.shop!.basicChoice?.shopSeq;
    showMakeCards(this.dialog,this.run,()=>this.ready&&this.run.commandSeq===seq,o=>this.purchaseReason(o),
      id=>this.openMakeTool(id),(id,intent)=>{if(shopSeq!==undefined)this.confirmBasicChoice(id,seq,shopSeq,true,intent);},
      (id,intent)=>this.inspectOffer(id,true,intent),()=>showConsumables(this.dialog,this.run,this.ready,(a,s)=>this.send(a,s)),this.makeCardsView,shopPracticeServices(this.run,q=>this.confirmPractice(q)),shopPracticeQuota(this.run),panel=>warmShopToolPanel(this,panel));
  }
  private confirmPractice(q:R2PracticeQuote,origin?:JourneyPracticeOrigin):void {
    this.practiceOrigin=origin;
    const action=shopPracticeAction(q);
    const dialog=showShopServiceConfirmation(this.dialog,shopPracticeConfirmation(this.run,q),()=>this.ready&&this.run.commandSeq===q.expectedSeq,async()=>{
      if(await this.send(action,q.expectedSeq)&&this.dialog.active(dialog)&&this.savedPractice)this.showPracticeResult(this.savedPractice,origin);
    },()=>this.returnPractice(origin));
    dialog.classList.add('make-cards-practice');
    const cash=cashDecision(this.run,q.price),summary=dialog.querySelector('.dialog-purchase-summary');
    summary?.append(document.createTextNode(cash.afterTier===undefined?'\n金币不足，不能确认升级。':`\n当前利息档 ${cash.beforeTier}→${cash.afterTier} 金；仅过关按届时余额结算。`));
    if(origin){dialog.classList.add('build-journey-practice');dialog.dataset.practiceSource='journey';dialog.querySelector<HTMLButtonElement>('.dialog-close')!.textContent='返回培养路线';}
  }
  private showPracticeResult(receipt:ShopPracticeReceipt,origin?:JourneyPracticeOrigin):void {
    const name=HAND_LABELS[receipt.handType],summary=`${name} Lv.${receipt.levelBefore} → Lv.${receipt.levelAfter}`;
    this.makeCardsView.receipt={seq:this.run.commandSeq,text:summary+' · 实付 '+receipt.paidPrice+' 金 · 已保存'};
    const d=this.dialog.open(name+' · 升级已保存',`金币 ${receipt.goldBefore} → ${receipt.goldAfter} 金\n本店升级 / 改牌 / 染色机会已用，刷新不恢复；下一店恢复。\n牌型已当场升级，不收入道具箱。`,[],{effectBody:shopPracticeEffect(receipt),summaryBody:'实付 '+receipt.paidPrice+' 金 · 已保存',collapseRules:true});
    d.classList.add('shop-practice-result');
    if(origin){
      d.dataset.practiceSource='journey';const close=d.querySelector<HTMLButtonElement>('.dialog-close')!;close.textContent='返回培养路线';
      const back=()=>{if(!this.busy)this.returnPractice(origin);};close.onclick=back;d.addEventListener('cancel',back);
    }else this.makeCardsReturn(d,'继续做牌');
  }
  private returnPractice(origin?:JourneyPracticeOrigin):void {
    if(!origin){this.inspectMakeCards();return;}
    this.inspectJourney(false,origin.all);
    const d=this.dialog.current,scroll=d?.querySelector<HTMLElement>('.dialog-scroll');
    if(scroll)scroll.scrollTop=origin.scrollTop;
    d?.querySelector<HTMLButtonElement>(`[data-practice-hand="${origin.handType}"] button`)?.focus({preventScroll:true});
  }
  private makeCardsReturn(d:HTMLDialogElement,label:string):void {
    const close=d.querySelector<HTMLButtonElement>('.dialog-close')!;close.textContent=label;
    const back=()=>{if(this.busy)return;this.dialog.close(d);this.inspectMakeCards();};close.onclick=()=>{this.audio.cancel();back();};
    d.addEventListener('click',()=>{if(this.busy){close.disabled=true;close.textContent='保存中 · 请稍候';}});
    d.addEventListener('cancel',event=>{if(this.busy){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
    d.addEventListener('cancel',back);
  }
  private openMakeTool(id:string,purchase?:string,owner?:HTMLDialogElement,intent?:WorkshopIntent):void {
    const continuation=shopToolContinuation(this.run,id);if(!continuation)return;
    showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq),id,owner,intent?.filter);
    const d=this.dialog.current;if(!d?.classList.contains('tool-detail'))return;
    d.classList.add('make-cards-tool');d.dataset.instanceId=id;d.dataset.purchaseStep=continuation.next;
    if(canCarryTool(this.run,id)){const later=document.createElement('details'),title=document.createElement('summary'),button=document.createElement('button');title.textContent='到牌桌再选手牌';button.type='button';button.textContent='进入牌桌后选择';button.onclick=()=>void this.carryMakeTool(id,continuation.expectedSeq,d);later.className='shop-tool-later';later.append(title,button);d.querySelector('.dialog-scroll')!.append(later);}
    const scroll=d.querySelector('.dialog-scroll')!,targets=scroll.querySelector('.tool-target-panel');
    if(targets&&!d.classList.contains('tool-targetless')){const notes=document.createElement('details'),title=document.createElement('summary');notes.className='make-cards-notes';title.textContent='工具卡与用途';notes.append(title);for(const node of scroll.querySelectorAll(':scope > .dialog-card-art,:scope > .dialog-intro'))notes.append(node);scroll.prepend(targets);scroll.append(notes);}
    if(purchase){
      const receipt=document.createElement('p');receipt.className='make-cards-receipt';receipt.textContent=purchase;d.querySelector('.dialog-header')!.append(receipt);
      const paid=document.createElement('p'),amount=purchase.match(/实付 (\d+) 金/)?.[1];paid.className='shop-tool-paid-note';paid.textContent=amount?'实付 '+amount+' 金 · 已入库存，未使用':purchase;d.querySelector('.tool-short-instruction')?.after(paid);
    }
  }
  private continueMakeCards():void {
    const d=this.dialog.current;if(d?.classList.contains('tool-saved-result'))this.makeCardsReturn(d,'继续查看道具');
  }
  /** Resume a saved purchase at explicit target selection; opening never consumes it. */
  private purchasedMakeTool(instanceId:string,purchase:string):void {
    const definitionId=this.run.consumables.find(c=>c.instanceId===instanceId)?.definitionId;this.openMakeTool(instanceId,purchase,undefined,this.makeCardsView.intent?.definitionId===definitionId?this.makeCardsView.intent:undefined);
  }
  private async carryMakeTool(instanceId:string,seq:number,owner:HTMLDialogElement):Promise<void> {
    if(!this.dialog.active(owner)||!this.ready||this.run.commandSeq!==seq||!canCarryTool(this.run,instanceId))return;
    await this.send({type:'LeaveShop'},seq,{runId:this.run.runId,stageIndex:this.run.stageIndex,shopSeq:seq,instanceId});
  }
  private storedMakeTool(name:string,price:number):void {
    this.makeCardsView.receipt={seq:this.run.commandSeq,text:name+' · 实付 '+price+' 金 · 已入道具箱，未使用'};
    this.inspectMakeCards();
  }
  private resumeMakeCards():void {
    const pending=this.registry.get('makeCardsPending') as {before:R2RunState;action:Action;purchaseIntent?:string;practiceOrigin?:JourneyPracticeOrigin;view?:MakeCardsView}|undefined;
    if(!pending)return;
    const command=runController(this)?.journal.at(-1);
    if(this.run.runId!==pending.before.runId||this.run.commandSeq!==pending.before.commandSeq+1||command?.expectedSeq!==pending.before.commandSeq||JSON.stringify(command.action)!==JSON.stringify(pending.action)){this.registry.remove('makeCardsPending');return;}
    this.registry.remove('makeCardsPending');
    // Restore only the UI context paired with this exact durable command; never replay it.
    if(pending.view)this.makeCardsView=structuredClone(pending.view);
    if(pending.action.type==='PracticeHand'){const receipt=shopPracticeSavedReceipt(pending.before,this.run);if(receipt)this.showPracticeResult(receipt,pending.practiceOrigin);}
    else if(pending.action.type==='UseConsumable'){showSavedToolResult(this.dialog,pending.before,this.run,pending.action,this.resultReduced);this.continueMakeCards();}
    else if(pending.action.type==='BuyBasicTool'||pending.action.type==='BuyOffer'){
      const gained=this.run.consumables.find(c=>!pending.before.consumables.some(b=>b.instanceId===c.instanceId));
      if(gained){if(pending.purchaseIntent==='store'){this.notice='购买已恢复保存 · 已入道具箱，未使用';this.render();this.storedMakeTool(toolInfo(gained.definitionId,this.run).name,pending.before.gold-this.run.gold);}else this.purchasedMakeTool(gained.instanceId,'购买已恢复保存 · 实付 '+(pending.before.gold-this.run.gold)+' 金 · 未使用');}
    }
  }
  private inspectBasicChoice():void {
    if(isR2CoreBuild(this.run)){this.makeCardsView.pane='purchase';this.inspectMakeCards();return;}
    const seat=basicChoiceSeat(this.run);if(!seat||this.busy)return;
    const rows=basicChoiceRows(this.run),seq=this.run.commandSeq,shopSeq=this.run.shop!.basicChoice!.shopSeq,purchase=this.run.shop!.basicChoice!.purchase;
    this.audio.select();
    const dialog=this.dialog.open('改牌工具 · 选1件',purchase?'本店已购，刷新不重开；下一店恢复。':'本店选购1件，刷新不补货。购买后进入道具箱，使用时再选择目标牌。',[],{
      summaryBody:purchase?'已购 '+toolInfo(purchase.definitionId,this.run).name+' · 下店恢复':`金币 ${this.run.gold} · 道具箱 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)} · 本店选1件`,collapseRules:true,rulesLabel:'选购规则',closeLabel:'回到经营',
      cards:rows.map(row=>({title:(({'T03':'♥ ','T04':'♦ ','T05':'♣ ','T06':'♠ '} as Record<string,string>)[row.id]??'')+row.info.name,url:row.info.artUrl,body:row.purpose+(row.reason&&!purchase?'\n'+(row.duplicate&&!row.duplicate.consumed?(isR2SuitChoice(this.run)?'同名现货':'同名随机现货'):row.reason.replace(/^实付\d+金，/,'')):''),action:purchase&&!row.duplicate?undefined:{label:row.duplicate?`${isR2SuitChoice(this.run)?'现货':'查看现货'} · ${row.duplicate.consumed?'已售':row.price+'金'}`:`选择 · ${row.price}金`,disabled:!this.ready||!!row.reason&&!row.duplicate,run:()=>{
        if(row.duplicate){if(row.duplicate.consumed)this.dialog.open(row.info.name+' · 现货已购','同名商品本店已售。仍可选其它合法基础操作。',[{label:'返回基础选择',run:()=>this.inspectBasicChoice()}]);else this.inspectOffer(row.duplicate.offerId);return;}
        this.confirmBasicChoice(row.id,seq,shopSeq);
      }}})),
    });dialog.classList.add('basic-choice-dialog');
    if(isR2SuitChoice(this.run)){
      dialog.classList.add('basic-suit-choice-dialog');dialog.dataset.choiceGroup=R2_SUIT_DYE_IDS.includes(purchase?.definitionId??'')?'dyes':'basic';
      const cards=dialog.querySelectorAll<HTMLElement>('.experience-card');
      rows.forEach((row,i)=>{const card=cards[i];card.dataset.choiceGroup=R2_SUIT_DYE_IDS.includes(row.id)?'dyes':'basic';const cue=routeFitCue(this.run,'tools',row.id);if(cue){card.dataset.routeFit=cue.focus;card.style.setProperty('--route-fit',cue.css);const copy=card.querySelector('p');if(copy&&R2_SUIT_DYE_IDS.includes(row.id))copy.textContent+=' · '+cue.label;}});
      const tabs=document.createElement('div');tabs.className='basic-choice-groups';tabs.setAttribute('aria-label','工具分组');
      for(const [group,label] of [['basic','改牌 · 5项'],['dyes','染色 · 4项']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-pressed',String(dialog.dataset.choiceGroup===group));button.onclick=()=>{dialog.dataset.choiceGroup=group;for(const tab of tabs.querySelectorAll('button'))tab.setAttribute('aria-pressed',String(tab===button));};tabs.append(button);}
      dialog.querySelector('.experience-cards')?.before(tabs);
    }

    if(purchase)dialog.querySelectorAll('.experience-card')[rows.findIndex(row=>row.id===purchase.definitionId)]?.classList.add('is-purchased');
  }
  private confirmBasicChoice(definitionId:string,seq:number,shopSeq:number,makeCards=false,intent?:WorkshopIntent):void {
    const row=basicChoiceRows(this.run).find(r=>r.id===definitionId);if(!row||row.reason)return;
    const info=row.info,price=row.price,purchaseBefore=new Set(this.run.consumables.map(c=>c.instanceId));
    const buy=async(now:boolean)=>{
      if(!this.dialog.active(dialog)||!this.ready)return;
      dialog.dataset.purchaseIntent=now?'use':'store';
      if(await this.send({type:'BuyBasicTool',definitionId,shopSeq},seq)){
        if(!this.dialog.active(dialog))return;
        const gained=this.run.consumables.find(c=>!purchaseBefore.has(c.instanceId)&&c.definitionId===definitionId);if(!gained){this.dialog.close(dialog);return;}
        this.openMakeTool(gained.instanceId,'已购 '+info.name+' · 实付 '+price+' 金 · 未使用',dialog,intent);
      }
    };
    const dialog=this.dialog.open(info.name+' · 基础选购',info.description+'\n'+info.cost+'\n'+info.risk+'\n购买后在这里选目标，再确认使用；也可稍后使用。',[{label:`购买 · ${price} 金`,primary:true,disabled:!this.ready,run:()=>buy(true)}],{artBackground:{},shopContext:'purchase',closeLabel:'取消',portrait:goodsArtPortrait(info),effectBody:info.summary,summaryBody:`实付 ${price} 金 · 余额 ${this.run.gold} → ${this.run.gold-price} 金`,collapseRules:true});
    dialog.classList.add('shop-tool-purchase');
    dialog.classList.add('make-cards-purchase');
    markRouteDetail(dialog,routeFitCue(this.run,'tools',definitionId));
    if(makeCards)this.makeCardsReturn(dialog,'返回自选做牌');
  }
  private drawGoodsOffer(o:R2Offer,raw:Box,short:boolean,portrait:boolean):void {
    const v=this.view,selected=this.selectedOfferId===o.offerId,b=raw,isTool=this.shelfKind==='tools',info=isTool?toolInfo(o.definitionId,this.run):itemInfo(o.definitionId),first=v.root.length;
    const p=this.geometry(),copy={...shopOfferCopy(p,b)},summary=info.summary,probe=v.text(0,0,'',14,'#3F606B');
    const wrapped=shopSummaryWrap(summary,copy.width,text=>{probe.setText(text);return probe.width;},2);probe.setText(wrapped);const purposeHeight=probe.height;probe.destroy();
    if(!p.copyBeside)copy.y=Math.min(copy.y,copy.priceY-27-purposeHeight);
    else copy.priceY=Math.min(b.y+b.height-24,Math.max(copy.priceY,copy.y+27+purposeHeight));
    const copyX=copy.x,copyY=copy.y,copyWidth=copy.width,artHeight=p.copyBeside?b.height-10:Math.max(36,copyY-b.y-8);
    const artBox={...b,height:artHeight+10};this.drawOfferCard(artBox,isTool?'uncommon':'common',selected,o.consumed,short);this.markBuildOffer(o,this.shelfKind,artBox);
    this.drawGoodsArt(o.definitionId,info.artUrl,{x:b.x+5,y:b.y+5,width:b.width-10,height:artHeight},o.consumed?.55:1,info.fallbackArtUrl);
    const name=v.text(copyX,copyY+4,info.name,14,'#26313A');this.ellipsis(name,copyWidth);
    v.text(copyX,copyY+23,wrapped,14,'#3F606B').setName('shop/offer-purpose').setData('offerId',o.offerId).setData('fullText',summary);
    const priceInk=this.offerPricePlate(o,{x:copyX-2,y:copy.priceY-2,width:copyWidth+2,height:24});
    v.text(copyX,copy.priceY,o.consumed?'已收入':r2PurchasePrice(this.run,o)+' 金',16,priceInk).setFontStyle('bold').setName('shop/offer-price').setData('offerId',o.offerId);
    const tile=copy.tile,hover=this.hoverCard(first,tile),r=v.rect(tile).setFillStyle(0,0).setStrokeStyle().setData('selected',selected);this.offerArts.push(hover.art);
    if(isTool)mountForgetTechniqueAttention(this,hover.art,{x:b.x+5-hover.art.x,y:b.y+5-hover.art.y,width:b.width-10,height:artHeight},o.definitionId);
    v.target(r,'offer/'+o.offerId,{tap:()=>this.inspectOffer(o.offerId),detail:()=>this.inspectOffer(o.offerId),...hover});
  }

  private hoverCard(first:number,b:Box,definitionId?:string,offerId?:string):{enter:()=>void;leave:()=>void;art:Phaser.GameObjects.Container} {
    const v=this.view,cx=b.x+b.width/2,cy=b.y+b.height/2,members=v.root.list.slice(first),art=this.add.container(cx,cy);
    for(const child of members){
      if(child instanceof Phaser.GameObjects.Image||child instanceof Phaser.GameObjects.Text||child instanceof Phaser.GameObjects.Graphics||child instanceof Phaser.GameObjects.Rectangle||child instanceof Phaser.GameObjects.Arc||child instanceof Phaser.GameObjects.Container){
        child.setPosition(child.x-cx,child.y-cy);art.add(child);
      }
    }
    v.add(art);
    const glow=this.add.graphics().fillStyle(0x6d998c,.10).fillRoundedRect(-b.width/2-3,-b.height/2-3,b.width+6,b.height+6,8).setAlpha(0);art.addAt(glow,0);
    const reduced=()=>gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const leave=()=>{
      if(!this.input.activePointer.wasTouch&&offerId===this.synergyOfferId)this.clearSynergyHighlights();
      this.hideHoverPicture();if(!art.active)return;this.tweens.killTweensOf(art);art.setAlpha(1);glow.setAlpha(0);
      if(reduced())art.setPosition(cx,cy).setScale(1).setAngle(0);
      else this.tweens.add({targets:art,x:cx,y:cy,angle:0,scaleX:1,scaleY:1,duration:110,ease:'Sine.easeOut'});
    };
    art.once('destroy',()=>this.tweens.killTweensOf(art));
    return {enter:()=>{
      if(!art.active||!this.scene.isActive())return;this.hideHoverPicture();this.tweens.killTweensOf(art);art.setAlpha(1);glow.setAlpha(1);v.root.bringToTop(art);
      if(!reduced())this.tweens.add({targets:art,y:cy-2,angle:0,scaleX:1,scaleY:1,duration:130,ease:'Sine.easeOut'});
      if(offerId)this.highlightSynergies(offerId);else this.clearSynergyHighlights();
      if(definitionId&&!offerId)this.hoverDelay=this.time.delayedCall(280,()=>{this.hoverDelay=undefined;if(art.active&&this.scene.isActive()&&!document.querySelector('dialog[open]'))this.showHoverPicture(definitionId,b);});
    },leave,art};
  }
  private hideHoverPicture():void {
    this.hoverDelay?.remove(false);this.hoverDelay=undefined;
    this.hoverPreview?.destroy();this.hoverPreview=undefined;
  }
  /** A mouse-only, read-only enlargement; it never owns a hit area or opens a modal. */
  private showHoverPicture(definitionId:string,source:Box):void {
    if(this.geometry().pc)return;
    const v=this.view,p=this.geometry(),top=p.top+54,bottom=Math.min(p.reroll.y,p.build.y,p.play.y)-12,room=bottom-top;
    if(room<180)return;
    const aspect=this.jokerAspect(definitionId),artHeight=Math.min(360,room-64,(Math.min(304,v.layout.width-48)-24)/aspect),artWidth=artHeight*aspect,width=artWidth+24,height=artHeight+64;
    const preferred=source.x+source.width+16+width<=v.layout.width-12?source.x+source.width+16:source.x-width-16;
    const x=Phaser.Math.Clamp(preferred,12,v.layout.width-width-12),y=Phaser.Math.Clamp(source.y,top,bottom-height),first=v.root.length,d=this.jokerDefinition(definitionId);
    v.add(this.add.graphics().fillStyle(0x061d27,.5).fillRoundedRect(x+3,y+7,width,height,8));
    v.material({x,y,width,height},0xfff7e4,0xe6d0a6,8);
    v.text(x+12,y+7,d.name,18,'#203744',width-24).setFontStyle('bold');
    this.drawJokerPicture(definitionId,{x:x+12,y:y+34,width:artWidth,height:artHeight});
    v.add(createJokerRarityBadge(this,d.rarity,{x:x+width-70,y:y+height-26}).setData('definitionId',definitionId).setData('surface','hover'));
    const preview=this.add.container();
    for(const child of v.root.list.slice(first))preview.add(child);
    this.hoverPreview=v.add(preview);v.root.bringToTop(preview);
    preview.once('destroy',()=>{if(this.hoverPreview===preview)this.hoverPreview=undefined;});
  }
  private jokerAspect(definitionId:string):number {
    const key=jokerArtKey(definitionId);if(!key||!this.textures.exists(key))return 1;
    const source=this.textures.get(key).getSourceImage();return source.width/source.height;
  }
  private jokerArtStatus(definitionId:string) {
    return {status:jokerArtLoadState(this,definitionId).status,readStatus:()=>jokerArtLoadState(this,definitionId).status,retry:()=>retryJokerArt(this,[definitionId],()=>this.refreshJokerPictures())};
  }
  private jokerCopy(definitionId:string,instance?:R2JokerInstance) {
    const subject=instance??r2CreateJoker(definitionId,'offer-condition/'+definitionId,0,undefined,this.run),inventory=instance?this.run.jokers:[...this.run.jokers,subject];
    const knownBoss=this.run.stageIndex%3===2?this.run.boss:null,limited=r2ScoringDisabledJokerIds(knownBoss,inventory,this.jokerDefinitions,[],this.run.chapterDisabledJokerId).includes(subject.instanceId);
    return jokerAbilityCopyForRun(this.run,definitionId,instance,publicJokerMemoryContext(this.run,{hand:[],scoringLimited:limited,deckSize:this.run.deckInstances.length-this.run.destroyedIds.length,jokerSlots:r2JokerCapacity(this.run),jokerCount:this.run.jokers.length}));
  }
  private jokerAbilityLine(definitionId:string,surface:'offer'|'owned',x:number,y:number,width:number,copy:string,compact:string):Phaser.GameObjects.Text {
    const label=this.view.text(x,y,copy,14,'#f4e5bc').setName('joker-ability').setData('definitionId',definitionId).setData('surface',surface);
    const fits=(text:string)=>{label.setText(text);return label.width<=width;};
    label.setData('fullText',copy).setText(fitJokerLabel([copy,compact],fits));
    return label;
  }
  private jokerEditionSummary(edition:R2Offer['edition'],definitionId:string):string {
    return jokerExtraBonusCopy(edition,{definitionId,chapterDisabled:this.run.chapterDisabledJokerId===definitionId}).detail;
  }
  private jokerPortrait(definitionId:string):{url:string;thumbnailUrl?:string;alt:string;layout:'card'}|undefined {
    const key=jokerArtKey(definitionId),url=jokerArtUrl(definitionId);
    return key&&url?{url,thumbnailUrl:jokerArtPreviewUrl(definitionId),alt:this.jokerDefinition(definitionId).name+'的卡牌插画',layout:'card'}:undefined;
  }
  private attachJokerFallback(dialog:HTMLDialogElement,definitionId:string):void {
    const key=jokerArtKey(definitionId);if(key&&this.textures.exists(key))return;
    const face=this.add.container(),paper=this.add.graphics().fillStyle(0xfff7e5).fillRoundedRect(0,0,240,336,10).lineStyle(3,0xb69866).strokeRoundedRect(2,2,236,332,10);
    face.add([paper,this.add.text(120,14,this.jokerDefinition(definitionId).name,{fontFamily:UI_FONT,fontSize:'20px',color:'#203744'}).setOrigin(.5,0)]);
    drawJokerMotif(this,face,definitionId,120,166,192,this.jokerDefinition(definitionId));
    const image=this.add.renderTexture(0,0,240,336).setVisible(false);image.draw(face);face.destroy();
    image.snapshot(snapshot=>{if(snapshot instanceof HTMLImageElement)this.dialog.attachCardArt(dialog,snapshot.src,this.jokerDefinition(definitionId).name+'机制示意卡面','mechanism');image.destroy();});
  }
  private drawSlot(b:Box,occupied:boolean,rarity:JokerRarity='common'):void {
    const v=this.view;v.add(this.add.graphics().fillStyle(0x26313a,.08).fillRoundedRect(b.x+1,b.y+3,b.width,b.height,5));
    v.material(b,occupied?PAPER_THEME.paperLight:PAPER_THEME.jadeSoft,0xfff9ee,5);v.add(this.add.graphics().lineStyle(occupied?1.5:1,0x3f606b,occupied?.6:.2).strokeRoundedRect(b.x,b.y,b.width,b.height,5));
    if(!occupied&&this.textures.exists('p00-card-back'))v.add(this.add.image(b.x+b.width/2,b.y+b.height/2,'p00-card-back').setDisplaySize(b.width-6,b.height-6).setAlpha(.14));
  }
  private offerPricePlate(o:R2Offer,b:Box):string {
    const unavailable=!o.consumed&&!!this.purchaseReason(o,true),tone=o.consumed?PAPER_THEME.paper:unavailable?0xf0ddd2:PAPER_THEME.jadeSoft;
    this.view.material(b,tone,tone,3).setAlpha(this.geometry().portrait?0:1).setName('shop/price-plate').setData('offerId',o.offerId).setData('availability',o.consumed?'owned':unavailable?'unavailable':'available');
    return unavailable?'#9f3228':o.consumed?'#736b5e':'#3F606B';
  }

  private drawJokerPicture(definitionId:string,b:Box,alpha=1):void {
    const holder=this.view.add(this.add.container());
    this.jokerArtTargets.set(holder,{definitionId,box:b,alpha});
    this.paintJokerPicture(holder,definitionId,b,alpha);
  }
  /** Loading changes the face only: rebuilding hit targets would cancel a native press. */
  private refreshJokerPictures():void {
    this.dialog.refreshArtLoad();
    for(const [holder,target] of this.jokerArtTargets){
      if(holder.active)this.paintJokerPicture(holder,target.definitionId,target.box,target.alpha);
      else this.jokerArtTargets.delete(holder);
    }
  }
  private paintJokerPicture(holder:Phaser.GameObjects.Container,definitionId:string,b:Box,alpha:number):void {
    holder.removeAll(true);
    const first=this.view.root.length;
    const v=this.view,d=this.jokerDefinition(definitionId),badge=mechanismBadge(d),key=jokerArtKey(definitionId),g=this.add.graphics();
    if(key&&this.textures.exists(key)){
      const picture=this.add.image(b.x+b.width/2,b.y+b.height/2,key),scale=Math.min(b.width/picture.width,b.height/picture.height);
      v.add(picture.setScale(scale).setAlpha(alpha));
    }else {
      v.material(b,badge.paper,0xcbb591,3).setAlpha(alpha);
      const motif=this.add.container(b.x+b.width/2,b.y+b.height/2).setAlpha(alpha);v.add(motif);
      drawJokerMotif(this,motif,definitionId,0,0,Math.min(b.width,b.height)*.88,this.jokerDefinition(definitionId));
      if(b.width>=88&&b.height>=70){
        const state=jokerArtLoadState(this,definitionId).status,label=state==='unregistered'?'机制示意':state==='failed'?'插画未加载':'插画加载中';
        v.add(this.add.rectangle(b.x+b.width/2,b.y+b.height-10,b.width-4,18,0xf4ead4,.96));
        v.text(b.x+b.width/2,b.y+b.height-17,label,11,'#3c5954').setOrigin(.5,0);
      }
    }
    v.add(g.setAlpha(alpha));
    holder.add(v.root.list.slice(first));
  }
  private drawOfferCard(b:Box,rarity:JokerRarity,selected:boolean,consumed:boolean,short:boolean,headerHeight=64,footerHeight=short?44:64):Phaser.GameObjects.Graphics {
    const frame=this.view.add(this.add.graphics());
    if(selected)frame.fillStyle(0x6d998c,.12).fillRoundedRect(b.x-3,b.y-3,b.width+6,b.height+6,7);
    return frame;
  }

  private purchaseReason(o:R2Offer,short=false):string {
    if(!this.ready)return short?'暂不可购买':'当前只读或未保存，请查看菜单。';
    const kind=this.findOffer(o.offerId)?.kind;if(!kind)return '商品已变化，请重新查看';
    if(kind==='jokers'){
      if(this.run.jokers.length>=r2JokerCapacity(this.run))return short?'槽位已满':`${r2JokerCapacity(this.run)}个槽位已满。请先关闭详情，点随身牌确认出售，再购买。`;
      if(this.run.jokers.some(j=>j.definitionId===o.definitionId))return '已装备同名牌';
    }else if(kind==='tools'){
      if(o.definitionId==='S04'){const issue=s04IssueText(this.run);if(issue)return issue;}
      if(this.run.consumables.length>=r2ConsumableCapacity(this.run))return short?'库存已满':'消耗品库存已满。购买不会自动使用或替换已有物品。';
      if(!r2ToolAcquisitionPool(this.run).some(row=>row.id===o.definitionId))return '当前没有合法目标或资源条件';
    }else {
      if(this.run.longTermItems.includes(o.definitionId))return '已持有同名道具';
      if(this.run.longTermItems.length>=R2_LIMITS.longTermSlots)return '四种道具已满';
    }
    const deficit=r2PurchasePrice(this.run,o)-this.run.gold;
    return deficit>0?(short?`差 ${deficit} 金`:`金币不足，还差 ${deficit} 金币。`):'';
  }
  private buildLabel():string {const focus=currentBuildFocus(this.run,this.run.openingRoute);return focus?'培养 · '+BUILD_LABEL[focus]:'培养与构筑';}
  private ownedDragHint():string {return ownedOrderHint(this.sys.game.device.input.touch,ownedOrderReversed(this.run));}
  /** Outline real existing faces without hiding alternatives or changing the shelf hit rectangles. */
  private measureShopTextBox(copy:string):{width:number;height:number} {const probe=this.add.text(0,0,copy,{fontFamily:UI_FONT,fontSize:'14px'});const box={width:probe.width,height:probe.height};probe.destroy();return box;}
  private measureShopText(copy:string):number {return this.measureShopTextBox(copy).width;}
  private drawOfferGuidance(o:R2Offer,b:Box):void {
    const g=shopOfferGuidance(this.run,o),v=this.view;
    const note=g.operation!=='可购买'?g.operationShort:g.decision.transaction;
    v.text(b.x,b.y,note,14,g.purchaseConditionLosses.length?'#B8473A':'#3F606B',b.width).setName('shop/offer-operation').setData('offerId',o.offerId);
  }
  private markBuildOffer(o:R2Offer,kind:ShelfKind,b:Box):void {
    if(this.selectedOfferId===o.offerId)this.view.add(this.add.graphics().fillStyle(0x6d998c,.10).fillRoundedRect(b.x-3,b.y-3,b.width+6,b.height+6,7).setName('shop/offer-selected').setData('offerId',o.offerId));
  }
  private inspectJourney(heroFocus=false,all=false):void {
    showBuildJourney(this.dialog,this.run,{ready:this.ready,practice:(q,all=false)=>this.confirmPractice(q,{all,handType:q.handType,scrollTop:this.dialog.current?.querySelector('.dialog-scroll')?.scrollTop??0}),basicTool:id=>{const row=id?basicChoiceRows(this.run).find(r=>r.id===id):undefined;if(!row||row.reason){this.inspectBasicChoice();return;}this.confirmBasicChoice(row.id,this.run.commandSeq,this.run.shop!.basicChoice!.shopSeq);},onFocus:()=>this.render(),chapter:()=>this.inspectChapter(),manage:()=>this.inspectBuild(),source:id=>this.inspectJoker(id),compare:(o,j)=>this.inspectJoker(j,o),tools:()=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq)),tool:id=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq),id),deck:()=>this.inspectDeck(),offers:(id,kind)=>{this.shelfKind=kind;this.inspectOffer(id);},continueLabel:'保留金币进入牌桌',continue:()=>{this.dialog.close();void this.send({type:'LeaveShop'});}},false,all);
    if(heroFocus){const panel=this.dialog.current,fold=panel?.querySelector<HTMLDetailsElement>('.build-keepsake-compact');if(panel&&fold){fold.addEventListener('toggle',()=>{if(this.dialog.active(panel))fold.querySelector('.build-keepsake-hero')?.scrollIntoView({block:'nearest'});},{once:true});fold.open=true;}}
  }
  private inspectBuild():void {
    const body=this.run.jokers.map((j,i)=>`${i+1}. ${this.jokerDefinition(j.definitionId).name} · ${editionEffectText(j.edition)} · 售价 ${salePrice(j.paidPrice)} 金\n${this.jokerCopy(j.definitionId,j)?.plain?.line??this.jokerCopy(j.definitionId,j)?.summary??this.jokerDefinition(j.definitionId).description}`).join('\n\n')||'尚无唐宋牌。先看卡牌效果，也可以保留金币直接入场。';
    const items=this.run.longTermItems.map(id=>{const info=itemInfo(id);return info.name+'：'+info.description;}).join('\n')||'尚无长期道具。';
    const comparison=this.run.shop!.offers.slice(0,3).map(o=>`${this.jokerDefinition(o.definitionId).name} · ${r2PurchasePrice(this.run,o)} 金\n${this.shopJokerSummary(o.definitionId)}`).join('\n\n');
    const dialog=this.dialog.open('当前构筑 · 从左至右触发',body+'\n\n持有牌（按槽位顺序）：\n'+this.run.jokers.map(j=>this.jokerDefinition(j.definitionId).name+' · '+shopRouteRelation(this.run,j,currentBuildFocus(this.run,this.run.openingRoute)).body).join('\n\n')+(purchaseDiscountStatus(this.run)?'\n\n当前优惠状态\n'+purchaseDiscountStatus(this.run):'')+`\n\n有效牌组 ${this.run.deckInstances.length-this.run.destroyedIds.length} 张 · 消耗品 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)}\n长期道具 ${this.run.longTermItems.length}/${R2_LIMITS.longTermSlots}\n`+items+(this.lastPurchaseReceipt?'\n\n上次购物 · 购入时记录\n'+this.lastPurchaseReceipt.body:'')+'\n\n本店现货 · 点商品看规则\n'+comparison+'\n\n点随身牌可移动顺序。出售需要再次确认；调序不花金币。'+(this.lastTransactionNotes.length?'\n\n上次交易的实际来源：\n'+this.lastTransactionNotes.join('\n'):''),[{label:'选择培养方向',primary:true,run:()=>this.inspectJourney()},{label:'本章节目',run:()=>this.inspectChapter()},{label:'物品与道具',run:()=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq))}]);
    if(this.geometry().inventoryCollapsed){
      const list=document.createElement('section'),heading=document.createElement('h3');list.className='shop-held-manager';heading.textContent='持有牌管理 · 点开调序或出售';list.append(heading);
      for(const [i,j] of this.run.jokers.entries()){const button=document.createElement('button');button.textContent=`${i+1}. ${this.jokerDefinition(j.definitionId).name} · 管理`;button.onclick=()=>this.inspectJoker(j.instanceId);list.append(button);}
      dialog.querySelector('.dialog-copy')!.prepend(list);
    }
  }
  private inspectDeck():void {
    if(this.scene.isActive())showDeckInspection(this.dialog,this.run);
  }
  private inspectChapter():void {
    const owner=runController(this),run=this.run,lifecycle=this.lifecycle;
    const valid=()=>this.scene.isActive()&&this.lifecycle===lifecycle&&runController(this)===owner&&owner?.state===run&&this.run===run&&run.phase==='shop';
    showPrograms(this.dialog,run,this.ready,(action,seq)=>this.send(action,seq),{valid,directory:()=>{if(valid())void presentStageSelection(this.dialog,run,this);}});
  }
  private inspectOffer(id:string,makeCards=false,intent?:WorkshopIntent):void {
    if(id===basicChoiceSeat(this.run)?.offerId){this.inspectBasicChoice();return;}
    const found=this.findOffer(id);if(!found||found.offer.consumed||this.busy)return;const {kind,offer:o}=found,seq=this.run.commandSeq;
    if(kind==='jokers')this.pcPages.jokers=Math.floor(this.run.shop!.offers.findIndex(o=>o.offerId===id)/3);
    if(kind==='tools'||kind==='items'){const pc=this.geometry().pc,group=kind==='tools'?pc?.toolOffers:pc?.itemOffers,capacity=pc?this.pcGroupCapacity(kind,this.geometry()):1;this.pcPages[kind]=Math.floor(this.shelfOffers(kind).findIndex(o=>o.offerId===id)/capacity);}
    this.selectedOfferId=id;this.notice='';this.audio.select();this.render();
    const price=r2PurchasePrice(this.run,o),after=this.run.gold-price,reason=this.purchaseReason(o),d=kind==='jokers'?this.jokerDefinition(o.definitionId):undefined,info=kind==='tools'?toolInfo(o.definitionId,this.run):kind==='items'?itemInfo(o.definitionId):undefined;
    const guidance=d?shopOfferGuidance(this.run,o):undefined,ability=d?(guidance?.decision.purchaseAbility??this.jokerCopy(d.id)):undefined;
    const cap=r2InterestCap(this.run),afterState=kind==='jokers'?{...this.run,jokers:[...this.run.jokers,r2CreateJoker(o.definitionId,'preview/'+o.offerId,price,o.edition,this.run)]}:kind==='items'?{...this.run,longTermItems:[...this.run.longTermItems,o.definitionId]}:this.run,afterCap=r2InterestCap(afterState);
    const money=after<0?`现有 ${this.run.gold} 金，尚差 ${-after} 金。`:`余额 ${this.run.gold} → ${after} 金。\n过关利息档 ${Math.min(cap,Math.floor(this.run.gold/5))} → ${Math.min(afterCap,Math.floor(after/5))} 金。`;
    const discount=r2PurchaseDiscount(this.run),discountText=discount?`原价 ${o.price} 金，当前优惠 ${discount} 金，最低实付1金。\n${this.run.purchaseCoupons?'本次会使用1张减2金券。\n':''}`:'';
    const effect=d?(ability?'':d.description+r2JokerExtraHelp(d)+'\n')+'版次：'+editionEffectText(o.edition):kind==='tools'?(()=>{const tool=toolInfo(o.definitionId,this.run);return [o.definitionId==='S04'?s04QualificationText(this.run):undefined,tool.description,tool.cost,tool.risk].filter(Boolean).join('\n\n');})():info!.description;
    const inventory=kind==='jokers'?'当前构筑：'+(this.run.jokers.map(j=>this.jokerDefinition(j.definitionId).name).join('、')||'空'):kind==='tools'?`消耗品库存 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)}。购买不会自动使用或替换旧物。`:`长期道具 ${this.run.longTermItems.length}/${R2_LIMITS.longTermSlots}。同种不可重复、不可出售，持续到本局结束。`;
    const investment=shopInvestment(this.run,o,kind),tierBefore=Math.min(cap,Math.floor(this.run.gold/5)),tierAfter=after>=0?Math.min(afterCap,Math.floor(after/5)):undefined;
    const trade=tierAfter===undefined?'':`利息档 ${tierBefore}→${tierAfter} 金`+(tierBefore===tierAfter?'（当前余额不降档）':'（按购后余额重算）')+'；仅过关按届时余额结算。';
    const synergy=d?findShopSynergy(this.run,d.id):undefined;
    const body=d?(ability?'':d.description):effect+`\n\n实际购买支付 ${price} 金\n`+discountText+money+'\n\n'+inventory+(reason?'\n\n无法购买：'+reason:'\n\n确认购买才会扣除金币。');
    const purchaseBefore=new Set(this.run.consumables.map(c=>c.instanceId));
    const name=d?.name??info!.name,portrait=d?this.jokerPortrait(d.id):goodsArtPortrait(info!);
    const plainSummary=(d||info)?`实付 ${price} 金 · `+(after<0?`现有 ${this.run.gold} 金，差 ${-after} 金`:`余额 ${this.run.gold} → ${after} 金`)+(reason&&after>=0?'\n'+reason:'')+(discount?`\n优惠 ${discount} 金${this.run.purchaseCoupons?' · 使用1张减2金券':''}`:'')+shopPurchaseConditionLosses(this.run,o).map(loss=>'\n'+loss).join('')+(kind==='tools'&&toolPermanentValue(this.run,o.definitionId)?'\n'+toolPermanentValue(this.run,o.definitionId):''):undefined;
    const buy=async(now:boolean)=>{
      if(!this.dialog.active(dialog)||!this.ready)return;dialog.dataset.purchaseIntent='use';
      if(!await this.send({type:'BuyOffer',offerId:id},seq)||!this.dialog.active(dialog))return;
      if(kind==='tools'){
        const gained=this.run.consumables.find(c=>!purchaseBefore.has(c.instanceId)&&c.definitionId===o.definitionId);
        if(gained){this.openMakeTool(gained.instanceId,'已购 '+info!.name+' · 实付 '+price+' 金 · 未使用',dialog,intent);return;}
      }
      this.dialog.close(dialog);
    };
    const dialog=this.dialog.open(name+' · 购买详情',body,[...(d&&this.run.jokers.length?[{label:'比较替换',run:()=>this.inspectReplacement(id)}]:[]),{label:`购买 · ${price} 金`,primary:true,disabled:!!reason,run:()=>buy(true)}],{artBackground:{},shopContext:'purchase',closeLabel:'取消',portrait,rarity:d?.rarity,...(d?{artLoad:this.jokerArtStatus(d.id)}:info?.detailArtUrl?{artLoad:{status:goodsArtLoadState(this,o.definitionId).status,readStatus:()=>goodsArtLoadState(this,o.definitionId).status,retry:()=>retryGoodsArt(this,o.definitionId,info.artUrl,()=>{this.paintGoodsArt(goodsArtKey(o.definitionId));this.dialog.refreshArtLoad();})}}:{}),summaryBody:plainSummary??(d?shopOfferRelation(this.run,o,currentBuildFocus(this.run,this.run.openingRoute)).label+' · ':'')+`实付 ${price} 金 · `+(after<0?`现有 ${this.run.gold} 金，差 ${-after} 金`:`余额 ${this.run.gold} → ${after} 金`)+'\n'+trade+(investment?'\n'+investment.next:'')+(d?.id==='f04'&&after>=0?'\n购后余额仅供参考；+3 条件在每手开始时检查。':'')+(reason?'\n'+reason:''),effectBody:d?shopOfferRelation(this.run,o,currentBuildFocus(this.run,this.run.openingRoute)).body:[info!.summary,o.definitionId==='S04'?s04QualificationText(this.run):undefined].filter(Boolean).join('\n'),editionBody:ability?this.jokerEditionSummary(o.edition,d!.id):undefined,ability,collapseRules:true});
    if(kind==='tools')dialog.classList.add('shop-tool-purchase');
    if(guidance){dialog.classList.add('shop-joker-purchase');const intro=dialog.querySelector('.dialog-intro');dialog.querySelector('.dialog-header')?.append(createShopIdentityTags(d!.rarity,o.edition));if(synergy&&(synergy.tradeoff||synergy.matches.length)&&!guidance.purchaseConditionLosses.length){const connection=document.createElement('p');connection.className='shop-purchase-connection';connection.textContent=guidance.decision.connection;intro?.querySelector('.card-ability')?.after(connection);}}
    if(kind==='tools')dialog.classList.add('make-cards-purchase');
    if(makeCards)this.makeCardsReturn(dialog,'返回自选做牌');
    if(!d)markRouteDetail(dialog,routeFitCue(this.run,kind,o.definitionId));
    attachFirstChapterGuide(this.run,()=>this.render());
    if(d)this.attachJokerFallback(dialog,d.id);
  }
  private inspectReplacement(offerId:string):void {
    const found=this.findOffer(offerId);if(!found||found.kind!=='jokers'||found.offer.consumed||this.busy)return;
    this.selectedOfferId=offerId;this.shelfKind='jokers';this.pcPages.jokers=Math.floor(this.run.shop!.offers.findIndex(o=>o.offerId===offerId)/3);this.render();
    showShopComparison(this.dialog,this.run,found.offer,this.comparisonView,id=>this.inspectJoker(id,offerId),()=>this.inspectOffer(offerId),()=>this.inspectJourney());attachFirstChapterGuide(this.run,()=>this.render());
  }
  private openPurchaseReceipt():void {
    const receipt=this.lastPurchaseReceipt;if(!receipt)return;
    if(receipt.kind==='tools'){this.openMakeTool(receipt.id,receipt.body);return;}
    const joker=receipt.kind==='jokers',info=joker?undefined:itemInfo(receipt.definitionId);
    const url=joker?jokerArtUrl(receipt.definitionId):undefined,portrait=joker?(url?{url,thumbnailUrl:jokerArtPreviewUrl(receipt.definitionId),alt:receipt.name,layout:'card' as const}:undefined):goodsArtPortrait(info!);
    const detail=this.dialog.open(receipt.name+' · 购物已保存',receipt.body,[{label:joker?'查看新牌':'查看物品',primary:true,run:()=>joker?this.inspectJoker(receipt.id):showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq))}],{artBackground:{},portrait,closeLabel:'返回商店'});
    if(joker)this.attachJokerFallback(detail,receipt.definitionId);
  }
  private inspectJoker(id:string,offerId?:string):void {
    const j=this.run.jokers.find(j=>j.instanceId===id);if(!j||this.busy)return;this.hideHoverPicture();const d=this.jokerDefinition(j.definitionId),index=this.run.jokers.indexOf(j),seq=this.run.commandSeq;
    const relation=shopRouteRelation(this.run,j,currentBuildFocus(this.run,this.run.openingRoute));
    const saleEffects=shopSaleConsequences(this.run,j);
    const growth=r2JokerStateText(j,d),ability=this.jokerCopy(d.id,j),causality=groupGrowthCausality(this.run,j);
    const dialog=this.dialog.open(d.name+' · 第 '+(index+1)+' 槽',(ability?'':d.description+r2JokerExtraHelp(d)+'\n')+'版次：'+editionEffectText(j.edition)+'\n\n'+growth+`\n实际买价 ${j.paidPrice} 金；基础卖价 ${salePrice(j.paidPrice)} 金。\n当前余额 ${this.run.gold} 金；出售、购买分别确认。\n\n唐宋牌按从左至右的顺序触发。`,[
      ...(offerId?[{label:'返回现货比较',run:()=>this.inspectReplacement(offerId)}]:[]),
      ...(causality?[{label:'加成从哪来',run:()=>{const saved=groupGrowthCausality(this.run,j);if(saved)this.dialog.open(saved.title,saved.body);}}]:[]),
      {label:'左移',disabled:!this.ready||index===0,run:async()=>{if(await this.reorder(index,index-1,seq)&&this.dialog.active(dialog))this.inspectJoker(id,offerId);}},
      {label:'右移',disabled:!this.ready||index===this.run.jokers.length-1,run:async()=>{if(await this.reorder(index,index+1,seq)&&this.dialog.active(dialog))this.inspectJoker(id,offerId);}},
      {label:'出售',disabled:!this.ready,run:()=>{const confirmation=this.dialog.open('出售确认',`出售第 ${index+1} 槽的「${d.name}」基础卖价 ${salePrice(j.paidPrice)} 金币。\n当前余额 ${this.run.gold} 金；出售后再按新余额购买。\n\n该牌成长将丢失，当前成长：${growth}。`+(saleEffects.length?'\n\n成功出售后保留牌的确定影响：\n'+saleEffects.join('\n'):''),[{label:'确认出售',primary:true,run:async()=>{if(await this.send({type:'SellJoker',instanceId:id},seq)&&this.dialog.active(confirmation)){this.dialog.close(confirmation);if(offerId)this.inspectOffer(offerId);}}}],{shopContext:'sale',closeLabel:'取消',portrait:this.jokerPortrait(d.id),rarity:d.rarity,summaryBody:`出售「${d.name}」 · 基础返还 ${salePrice(j.paidPrice)} 金\n失去当前成长：${growth}`});if(offerId){confirmation.querySelector<HTMLButtonElement>('.dialog-close')!.onclick=()=>this.inspectJoker(id,offerId);confirmation.addEventListener('cancel',()=>this.inspectJoker(id,offerId));}}},
    ],{artBackground:{},shopContext:'held',summaryBody:relation.label+' · 卖价 '+salePrice(j.paidPrice)+' 金',portrait:this.jokerPortrait(d.id),rarity:d.rarity,artLoad:this.jokerArtStatus(d.id),editionBody:ability?this.jokerEditionSummary(j.edition,d.id):undefined,ability,collapseRules:!!ability});
    dialog.classList.add('shop-joker-held');dialog.querySelector('.dialog-header')?.append(createShopIdentityTags(d.rarity,j.edition));
    const candidate=offerId?this.findOffer(offerId)?.offer:undefined;
    if(candidate)dialog.querySelector('.dialog-intro')?.append(createShopOfferValue(shopOfferGuidance(this.run,candidate,j),'换入「'+this.jokerDefinition(candidate.definitionId).name+'」的条件'));
    if(offerId){const back=()=>this.inspectReplacement(offerId);dialog.querySelector<HTMLButtonElement>('.dialog-close')!.onclick=back;dialog.addEventListener('cancel',back);}
    markRouteDetail(dialog,routeFitCue(this.run,'jokers',d.id,j.instanceId));this.attachJokerFallback(dialog,d.id);
  }
  private async reorder(from:number,to:number,expectedSeq?:number):Promise<boolean> {
    const current=this.run.jokers.map(j=>j.instanceId);
    if(!Number.isInteger(from)||from<0||from>=current.length)return false;
    const ids=reorderJokerIds(current,current[from],to);if(ids===current)return false;
    return this.send({type:'ReorderJokers',ids},expectedSeq);
  }
  private liftOwned(id:string,x:number,y:number):void {
    if(!this.ready)return;this.hideHoverPicture();
    for(const art of this.ownedArts.values())this.tweens.killTweensOf(art);
    this.ownedDrag=new OwnedJokerDragVisual(this,id,this.run.commandSeq,{x,y},()=>({root:this.view.root,arts:this.ownedArts,slots:this.geometry().slots,ids:this.run.jokers.map(j=>j.instanceId),hint:this.ownedHint}),()=>this.resultReduced);
  }
  private previewOwned(x:number,y:number):void {this.ownedDrag?.preview(x,y);}
  private cancelOwned():void {
    const drag=this.ownedDrag;if(!drag||drag.saving)return;
    this.ownedDrag=undefined;drag.cancel();this.ownedHint?.setText(this.ownedDragHint());
  }
  private moveJoker(id:string,x:number,y:number):void {
    const drag=this.ownedDrag,to=ownedJokerDropIndex(this.geometry().slots,this.run.jokers.length,x,y),from=this.run.jokers.findIndex(j=>j.instanceId===id);
    if(!this.ready||drag?.id!==id||from<0||to<0||from===to){this.cancelOwned();return;}
    drag.preview(x,y);drag.pending();void this.reorder(from,to,drag.seq);
  }
  /** Purchased card visibly flies from its shelf seat into the new joker slot. */
  private flyPurchase(from:Box,to:Box,name:string):void {
    const cx=from.x+from.width/2,cy=from.y+from.height/2,card=this.add.container(cx,cy).setDepth(60);
    const g=this.add.graphics();
    g.fillStyle(0x172e36,.22).fillRoundedRect(-49,-63,98,126,7);
    g.fillStyle(0xfff7e5).fillRoundedRect(-50,-66,100,132,7);
    g.fillStyle(0x365d61).fillRoundedRect(-50,-66,100,30,{tl:7,tr:7,bl:0,br:0});
    g.lineStyle(2,0xe4c186).strokeRoundedRect(-50,-66,100,132,7);
    card.add([g,this.add.text(0,-51,name,{fontFamily:UI_FONT,fontSize:'15px',fontStyle:'bold',color:'#fff2d4',resolution:Math.min(window.devicePixelRatio||1,3)}).setOrigin(.5),this.add.text(0,8,'✓',{fontFamily:UI_FONT,fontSize:'34px',fontStyle:'bold',color:'#367f75',resolution:Math.min(window.devicePixelRatio||1,3)}).setOrigin(.5)]);
    const tx=to.x+to.width/2,ty=to.y+to.height/2,mx=(cx+tx)/2,my=Math.min(cy,ty)-80,flight={t:0};
    this.audio.coin();
    this.tweens.add({targets:flight,t:1,duration:340,ease:'Cubic.easeIn',onUpdate:()=>{
      if(!card.active)return;const t=flight.t,u=1-t;
      card.setPosition(u*u*cx+2*u*t*mx+t*t*tx,u*u*cy+2*u*t*my+t*t*ty).setScale(1-t*.6).setAngle(t*9);
    },onComplete:()=>{card.destroy();this.slotPop(to);}});
  }
  private slotPop(slot:Box):void {
    if(!this.scene.isActive())return;
    const ring=this.add.graphics().setDepth(59);
    ring.lineStyle(3,0xffd98e,.95).strokeRoundedRect(slot.x-3,slot.y-3,slot.width+6,slot.height+6,8);
    ring.fillStyle(0xffe2a1,.2).fillRoundedRect(slot.x-3,slot.y-3,slot.width+6,slot.height+6,8);
    this.tweens.add({targets:ring,alpha:0,duration:420,ease:'Cubic.easeOut',onComplete:()=>ring.destroy()});
  }
  private afterRenderFx():void {
    const reduced=gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(this.pendingRerollFlip){this.pendingRerollFlip=false;if(!reduced)this.offerArts.forEach((art,i)=>{if(!art.active)return;art.setScale(0,1);this.tweens.add({targets:art,scaleX:1,duration:160,delay:i*70,ease:'Sine.easeOut'});});}
    if(this.pendingPurchaseFlight){const flight=this.pendingPurchaseFlight;this.pendingPurchaseFlight=undefined;if(!reduced)this.flyPurchase(flight.from,flight.to,flight.name);}
    const lines:ShopResultLine[]=[];
    if(this.pendingPayment){lines.push({name:'purchase/payment',text:this.pendingPayment});this.pendingPayment=undefined;}
    if(this.pendingToolCue){
      const cue=this.pendingToolCue,box=this.geometry().items;this.pendingToolCue=undefined;if(!reduced)this.slotPop(box);
      lines.push({name:'tool-use/'+cue.instanceId,text:'已用 '+cue.label});
    }
    for(const event of this.pendingTransactions){
      const index=this.run.jokers.findIndex(joker=>joker.instanceId===event.instanceId),slot=this.geometry().slots[index];
      if(!reduced&&slot)this.slotPop(slot);
      lines.push({name:'transaction/'+event.instanceId,text:this.transactionGrowthLines.get(event)??r2TransactionText(event,this.jokerDefinition(event.definitionId))});
    }this.pendingTransactions=[];
    if(lines.length){
      const p=this.geometry(),bottom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom'))||0,box=shopResultBox(p,this.view.layout.height,bottom),probe=this.view.text(0,0,'',14,PAPER_CSS.ink).setVisible(false);
      const pages=lines.flatMap(line=>shopResultPages(line.text,text=>{probe.setText(text);return probe.width<=box.width-12;}).map(text=>({...line,text})));probe.destroy();
      if(this.resultFeedback.enqueue(this.run.commandSeq,pages,performance.now()))this.drawResultCue();
    }
  }
  private async send(action:Action,expectedSeq?:number,carriedTool?:ToolCarryIntent):Promise<boolean> {
    if(!this.ready)return false;
    const previous=this.run,oldGold=previous.gold,owner=this.dialog.current;this.busy=true;const lifecycle=this.lifecycle;
    this.transactionHaptic?.cancel();const haptic=this.transactionHaptic=Haptics.shared.createScope(this.hapticLife?.signal);
    const cancelHaptic=()=>haptic.cancel();owner?.addEventListener('close',cancelHaptic,{once:true});owner?.addEventListener('cancel',cancelHaptic,{once:true});
    const purchase=action.type==='BuyOffer'?this.findOffer(action.offerId):undefined;
    const buyIndex=action.type==='BuyOffer'?this.visibleOffers().findIndex(o=>o.offerId===action.offerId):-1;
    const buyBox=this.geometry().pc?this.pcOfferBoxes.get(action.type==='BuyOffer'?action.offerId:''):buyIndex>=0?this.geometry().shelf[buyIndex]:undefined;
    const landSlot=purchase?.kind==='jokers'?this.geometry().slots[Math.min(previous.jokers.length,r2JokerCapacity(previous)-1)]:purchase?this.geometry().items:undefined;
    const pendingDrag=action.type==='ReorderJokers'&&this.ownedDrag?.saving?this.ownedDrag:undefined,inputEnabled=this.input.enabled;
    if(pendingDrag)this.input.enabled=false;else this.render();
    let reorderSaved=false,savedCue:'placement'|'purchase'|undefined,receiptId='';
    try {
      const result=await dispatchRun(this,action,expectedSeq);if(lifecycle!==this.lifecycle||!this.scene.isActive())return false;
      owner?.removeEventListener('close',cancelHaptic);owner?.removeEventListener('cancel',cancelHaptic);
      if(owner&&!this.dialog.active(owner))haptic.cancel();
      if(!result.ok){
        this.audio.invalid();
        if(pendingDrag)this.notice=result.code==='save-failed'?'排序未保存 · 已恢复保存顺序 · 菜单重试': '排序未提交 · 已恢复保存顺序';
        if(result.code==='save-failed'){if(owner?.classList.contains('make-cards-tool')||owner?.classList.contains('make-cards-purchase')||owner?.classList.contains('make-cards-practice'))this.registry.set('makeCardsPending',{before:previous,action,view:structuredClone(this.makeCardsView),purchaseIntent:owner.dataset.purchaseIntent,...(action.type==='PracticeHand'?{practiceOrigin:this.practiceOrigin}:{})});this.dialog.close();}
        else this.dialog.open('操作未提交',({'slots-full':'五个槽位已满，请先出售一张。','stale-shop':'商店已变化，请重新打开基础选择；本次没有扣款。','basic-choice-consumed':'本店自选已用；升级、改牌、染色共用1次，刷新不恢复，下一店恢复。','stale-practice-level':'牌型等级已变化，请重新查看服务报价；本次没有扣款。','undiscovered-hand-type':'该牌型尚未发现，不能升级；本次没有扣款。','hand-level-cap':'该牌型已达30级；本次没有扣款。','basic-choice-not-legal':'合法目标或随机位现货已变化，请重新打开选择；本次没有扣款。','consumable-slots-full':'道具箱已满，本次没有扣款。','not-enough-gold':'金币不足；本次操作没有扣款。','already-owned':'已装备同名牌。','no-reroll-candidates':'没有可换入的卡牌。','stale-sequence':'本局在预览后已变化，请重新打开详情确认；没有消耗物品或金币。','replacement-pending':'新局或导入尚未保存，请在菜单重试、导出或取消候选。'} as Record<string,string>)[result.code]??'本次操作未提交，原选择和资源仍然保留。');
        return false;
      }
      this.run=result.state;reorderSaved=!!pendingDrag;
      if(!result.duplicate){
        receiptId=result.receipt.commandId;
        if(action.type==='ReorderJokers')savedCue='placement';
        else if(action.type==='BuyOffer'||action.type==='BuyBasicTool')savedCue='purchase';
      }
      if(!result.duplicate&&this.lastPurchaseReceipt&&!shopPurchaseReceiptExists(this.lastPurchaseReceipt,this.run))this.lastPurchaseReceipt=undefined;
      const transactions=result.events.filter((event):event is Extract<DomainEvent,{type:'joker-transaction'}>=>event.type==='joker-transaction');
      if(!result.duplicate&&transactions.length){this.pendingTransactions=transactions;this.lastTransactionNotes=transactions.map(event=>{const growth=transactionGrowthChange(previous,this.run,event);if(growth)this.transactionGrowthLines.set(event,transactionGrowthChange(previous,this.run,event,true)!);return growth??r2TransactionText(event,this.jokerDefinition(event.definitionId));});}
      if(action.type==='BuyOffer'&&purchase&&!result.duplicate){
        const {kind,offer}=purchase,name=kind==='jokers'?this.jokerDefinition(offer.definitionId).name:kind==='tools'?toolInfo(offer.definitionId,this.run).name:itemInfo(offer.definitionId).name;this.audio.purchase();
        this.lastPurchaseReceipt=shopPurchaseReceipt(previous,this.run,kind,offer);
        if(this.lastPurchaseReceipt?.payment?.saved)this.pendingPayment=this.lastPurchaseReceipt.payment.summary;
        this.notice=(kind==='jokers'?`已入第 ${this.run.jokers.length} 槽`:kind==='tools'?'已入道具箱，未使用':'已持有长期道具')+' · 点购物结果查看';

        if(buyBox&&landSlot)this.pendingPurchaseFlight={from:buyBox,to:landSlot,name};
      }else if(action.type==='BuyBasicTool'&&!result.duplicate){
        this.audio.purchase();
        this.lastPurchaseReceipt=shopPurchaseReceipt(previous,this.run,'tools',{offerId:'basic-choice/'+action.shopSeq,definitionId:action.definitionId,price:r2BasicChoiceBasePrice(action.definitionId),consumed:false});
        this.notice='基础选择已入道具箱，尚未使用 · 刷新不重开';
      }else if(action.type==='PracticeHand'&&!result.duplicate){
        const event=result.events.find((e):e is Extract<DomainEvent,{type:'hand-practiced'}>=>e.type==='hand-practiced');
        if(event){this.savedPractice=event;this.audio.purchase();this.notice=HAND_LABELS[event.handType]+` Lv.${event.levelBefore} → Lv.${event.levelAfter} · 实付 ${event.paidPrice} 金 · 已保存`;}
      }else if(action.type==='SellJoker'&&!result.duplicate){
        const joker=previous.jokers.find(j=>j.instanceId===action.instanceId)!;this.audio.sale();
        this.notice=`已售 ${this.jokerDefinition(joker.definitionId).name} · 金币 ${oldGold} → ${this.run.gold}`;

      }else if(action.type==='RerollShop'&&!result.duplicate){this.makeCardsView={pane:'purchase',positions:{...this.makeCardsView.positions,purchase:0}};this.selectedOfferId=undefined;this.audio.reroll();this.notice=`唐宋牌与工具已更新 · 道具保留 · 金币 ${oldGold} → ${this.run.gold}`;this.pendingRerollFlip=this.shelfKind!=='items';}
      else if(action.type==='ReorderJokers'){this.audio.select();this.notice='顺序已保存 · '+(ownedOrderReversed(this.run)?'本关整手从右至左结算':'通常从左至右结算');}
      else if(action.type==='ChooseProgram'||action.type==='AbandonProgram'){this.audio.select();this.notice=programStatus(this.run);}
      else if((action.type==='UseConsumable'||action.type==='DestroyConsumable')&&!result.duplicate){
        const item=previous.consumables.find(row=>row.instanceId===action.instanceId),used=result.events.find((event):event is Extract<DomainEvent,{type:'consumable-used'}>=>event.type==='consumable-used');
        if(used){const info=toolInfo(used.definitionId,this.run);this.audio.toolUse(info.family);this.pendingToolCue={instanceId:used.instanceId,label:info.label};}else this.audio.select();
        this.notice=(action.type==='UseConsumable'?'已使用 ':'已销毁 ')+(item?toolInfo(item.definitionId,this.run).name:'物品')+` · 库存 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)}`+(oldGold!==this.run.gold?` · 金币 ${oldGold} → ${this.run.gold}`:'');

        if(previous.shop!.rerollCount!==this.run.shop!.rerollCount){this.selectedOfferId=undefined;this.audio.reroll();this.pendingRerollFlip=this.shelfKind!=='items';}
      }
      if(action.type==='LeaveShop'){this.audio.select();const entry={...(carriedTool?{carriedTool}:{}),...(bossRulesSeen(this.run)?{preparedBossOwner:runController(this)}:{})};paperSceneStart(this,'game',Object.keys(entry).length?entry:undefined);}
      else if(action.type==='SkipStage'){
        const s=this.run.stage!;paperSceneStart(this,'intermission',{cleared:true,stageIndex:s.index,stageHeat:s.heat,handsLeft:s.handsLeft,goldEarned:s.goldEarned} satisfies IntermissionResult);
      }
      if(action.type==='UseConsumable'&&!result.duplicate&&owner&&this.dialog.active(owner)){showSavedToolResult(this.dialog,previous,this.run,action,this.resultReduced);if(owner.classList.contains('make-cards-tool'))this.continueMakeCards();}
      return true;
    }finally {
      owner?.removeEventListener('close',cancelHaptic);owner?.removeEventListener('cancel',cancelHaptic);
      if(!savedCue)haptic.cancel();
      if(lifecycle===this.lifecycle){
        this.busy=false;if(pendingDrag){pendingDrag.capture();this.ownedDrag=undefined;this.input.enabled=inputEnabled;}
        if(this.scene.isActive()&&this.run.phase==='shop'){
          this.render();pendingDrag?.settle(reorderSaved,()=>haptic.saved('placement',receiptId));this.afterRenderFx();
          if(savedCue&&!pendingDrag)haptic.saved(savedCue,receiptId);
        }else{haptic.cancel();pendingDrag?.destroy();}
      }else haptic.cancel();
    }
  }
}
import {basicChoiceSeat,basicChoiceRows} from './BasicToolChoice';
