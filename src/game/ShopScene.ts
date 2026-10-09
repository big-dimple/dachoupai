import {routeFrame} from './RouteFrame';
import {routeFitCue,markRouteDetail,toolPurpose} from './RouteFitCue';
import {inventoryFeedback} from './InventoryFeedback';
import {showSavedToolResult} from './SavedToolResult';
import {transactionGrowthChange} from './SavedGrowthChange';
import {paperSceneStart} from './PaperFlow';
import {drawShopArt,shopSheet} from './ShopArt';
import {r2BasicToolShelfStatus} from '../domain/r2Shop';
import {starterOffer,starterShopCue} from './RouteStarter';
import {firstChapterGuide,firstChapterShopPrompt,dismissFirstChapterGuide,attachFirstChapterGuide} from './FirstChapterGuide';
import {shopRouteRelation,shopOfferRelation,shopReplacementFacts,shopSaleConsequences,shopPurchaseConditionLosses} from './ShopRouteRelations';
import {buildGrowthProgress} from './BuildGrowthProgress';
import {shopInvestment} from './ShopInvestment';
import {currentBuildFocus,BUILD_LABEL,toolSupportsFocus} from './BuildJourney';
import {showBuildJourney} from './BuildJourneyDialog';
import {groupGrowthCausality,savedGrowthDiscovery} from './JokerGrowthCausality';
import {purchaseDiscountStatus} from './PurchasePaymentFacts';
import {shopPurchaseReceipt,shopPurchaseReceiptExists,type ShopPurchaseReceipt} from './ShopPurchaseReceipt';
import {r2ScoringDisabledJokerIds} from '../domain/scoreR2';
import {r2JokerDefinitionsFor,r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {jokerAbilityCopyForRun,publicJokerMemoryContext} from './JokerMemory';
import type {R2JokerInstance} from '../content/r2Schema';
import {shopLayout,shopFirstGuideLayout,shopSummaryWrap,shopOfferCopy,shopOwnedDropIndex,shopOwnedHitBox,shopOwnedNameArea} from './ShopLayout';
import {goodsArtKey,goodsArtLoadState,requestGoodsArt,retryGoodsArt} from './GoodsArtLoading';
import {ShopResultFeedback,shopResultBox,shopResultPages,type ShopResultLine} from './ShopResultFeedback';
import {requestJokerArt,jokerArtLoadState,retryJokerArt} from './JokerArtLoading';
import {JOKER_RARITY,createJokerRarityBadge,type JokerRarity} from './JokerRarity';
import Phaser from 'phaser';
import {r2JokerCapacity} from '../domain/r2Resources';
import {r2RunModeConfig,R2_MODE_CATALOG} from '../content/r2Modes';
import {programStatus,showPrograms} from './ProgramDialog';
import {AudioEngine} from '../audio/AudioEngine';
import {r2PaidRerollPrice,salePrice,r2Pool,r2PurchasePrice,r2PurchaseDiscount,r2ToolAcquisitionPool,type R2Offer} from '../domain/r2Shop';
import type {R2RunState,Action,DomainEvent} from '../domain/run';
import {getR2Stage,R2_LIMITS,r2InterestCap,r2ConsumableCapacity,r2CreateJoker} from '../domain/r2Run';
import {dispatchRun,runController} from './runAdapter';
import {reorderJokerIds} from './JokerReorder';
import {heatText,fractionText} from './scoreText';
import {toolInfo,itemInfo,goodsArtPortrait,editionLabel,editionEffectText,toolFamilyLabel} from './r2ToolInfo';
import {SceneView} from './SceneView';
import {getCharacter} from './characters';
import {selectionPortraitKey} from './portraits';
import {DetailDialog} from './DetailDialog';
import {showDeckInspection} from './DeckInspector';
import type {RunMenuActions} from './RunMenu';
import {gameSession} from './session';
import {r2BossText} from '../domain/r2Chapter';
import {SKIP_ITEM_LABELS,showConsumables} from './ConsumableDialog';
import {shopToolInventoryRow,shopInventoryEntry,toolInventoryLabel} from './ToolInventoryEntry';
import type {IntermissionResult} from './IntermissionScene';
import type {Box} from './layout';
import {jokerArtKey,jokerArtUrl,jokerArtPreviewUrl} from './jokerArt';
import {UI_FONT,PAPER_THEME,PAPER_CSS} from './theme';
import {fitJokerLabel} from './JokerLabel';
import {drawJokerMotif} from './JokerMotif';
import {r2MechanismBadge as mechanismBadge,r2JokerStateText,r2JokerExtraHelp,r2TransactionText} from './r2Help';

type ShelfKind='jokers'|'tools'|'items';
const SHELF_FIELDS={jokers:'offers',tools:'toolOffers',items:'itemOffers'} as const;

export class ShopScene extends Phaser.Scene {
  private run!:R2RunState;
  private get jokerDefinitions(){return r2JokerDefinitionsFor(this.run);}
  private jokerDefinition(id:string){return r2JokerDefinitionFor(this.run,id);}
  private busy=false;
  private lifecycle=0;
  private selectedOfferId?:string;
  private shelfKind:ShelfKind='jokers';
  private shelfPage=0;
  private pcPages={jokers:0,tools:0,items:0};
  private pcOfferBoxes=new Map<string,Box>();
  private artRefreshListeners=new Map<string,()=>void>();
  private artTargets=new Map<string,{holder:Phaser.GameObjects.Container;box:Box;alpha:number}>();
  private jokerArtTargets=new Map<Phaser.GameObjects.Container,{definitionId:string;box:Box;alpha:number}>();
  private notice='';
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

  private pendingGoldRoll?:number;
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
  constructor(){super('shop');}
  private get ready():boolean {const session=gameSession();return this.run?.phase==='shop'&&!this.busy&&runController(this)?.status==='idle'&&session.lease.writable&&!session.pendingRun&&!session.working;}
  private shelfOffers(kind=this.shelfKind):R2Offer[]{const offers=this.run.shop![SHELF_FIELDS[kind]],seat=kind==='tools'?basicChoiceSeat(this.run):undefined;return seat?[...offers,seat]:offers;}
  private get pageSize():number{return 3;}
  private visibleOffers():R2Offer[]{return this.shelfOffers().slice(this.shelfPage*this.pageSize,(this.shelfPage+1)*this.pageSize);}
  private geometry(){const l=this.view.layout,bottom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom'))||0,cols=this.shelfKind==='jokers'?Math.max(3,Math.min(this.pageSize,this.shelfOffers().length)):Math.max(1,Math.min(2,this.shelfOffers().length));return shopLayout(l.width,l.height,l.hud.y,bottom,cols,this.run.jokers.some(j=>!!this.jokerCopy(j.definitionId)));}
  create():void {
    this.busy=false;this.selectedOfferId=undefined;this.shelfKind='jokers';this.shelfPage=0;this.pcPages={jokers:0,tools:0,items:0};this.notice='';this.lifecycle++;
    this.pendingGoldRoll=undefined;this.pendingRerollFlip=false;this.pendingPurchaseFlight=undefined;this.pendingToolCue=undefined;this.pendingTransactions=[];this.lastTransactionNotes=[];this.lastPurchaseReceipt=undefined;this.pendingPayment=undefined;
    this.resultFeedback=new ShopResultFeedback();this.resultKey=undefined;this.resultNote=undefined;this.resultPlate=undefined;
    this.events.once('shutdown',()=>{this.resultFeedback.dispose();this.resultLayer?.destroy(true);this.resultLayer=undefined;this.resultNote=undefined;this.resultPlate=undefined;this.resultKey=undefined;});
    this.events.once('shutdown',()=>{this.lifecycle++;this.hideHoverPicture();this.dialog.close();for(const [key,listener] of this.artRefreshListeners)this.textures.off('addtexture-'+key,listener);this.artRefreshListeners.clear();this.artTargets.clear();this.jokerArtTargets.clear();});
    this.events.once('shutdown',()=>{if(this.registry.get('runMenuActions')===this.menuActions)this.registry.remove('runMenuActions');this.menuActions=undefined;});
    const run=runController(this)?.state;if(!run||run.phase!=='shop'){this.scene.start('character-select');return;}this.run=run;
    this.menuActions={viewDeck:()=>this.inspectDeck()};this.registry.set('runMenuActions',this.menuActions);
    this.cameras.main.setBackgroundColor('#F3EADB');this.audio.setScene('shop');this.view=new SceneView(this,()=>this.render());this.render();
    if(!gameSession().reducedMotion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      this.view.root.setAlpha(.35);this.tweens.add({targets:this.view.root,alpha:1,duration:220,ease:'Cubic.easeOut'});
      this.offerArts.forEach((art,i)=>{const ty=art.y;art.setPosition(art.x,ty+26).setAlpha(0);this.tweens.add({targets:art,y:ty,alpha:1,duration:260,delay:110+i*70,ease:'Cubic.easeOut'});});
    }
  }
  private render():void {
    this.dialog.refreshArtLoad();
    requestJokerArt(this,[...this.run.jokers.map(j=>j.definitionId),...this.run.shop!.offers.map(o=>o.definitionId)],()=>this.refreshJokerPictures());
    const selectedIndex=this.shelfOffers().findIndex(offer=>offer.offerId===this.selectedOfferId);if(selectedIndex>=0)this.shelfPage=Math.floor(selectedIndex/this.pageSize);
    this.shelfPage=Math.min(this.shelfPage,Math.max(0,Math.ceil(this.shelfOffers().length/this.pageSize)-1));
    const v=this.view,p=this.geometry(),stage=getR2Stage(this.run.stageIndex,this.run.tourMode,this.run.difficulty)!;this.hideHoverPicture();v.clear();this.starterMarkers=[];v.paperBackground();this.offerArts=[];this.artTargets.clear();this.jokerArtTargets.clear();
    this.pcOfferBoxes.clear();if(p.pc){this.renderPC(p);return;}
    const purse={x:p.x+p.w-(this.view.layout.width<=700?96:136)-124,y:p.top-1,width:116,height:34},purseArt=this.add.graphics();
    const title=v.text(p.x,p.top,this.run.tourMode==='endless'?'无尽演出筹备':'演出筹备',20,'#26313A').setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold').setName('shop/title');
    const titleRight=Math.min(...[purse,p.reroll,p.build].filter(b=>b.y<title.y+title.height&&b.y+b.height>title.y&&b.x>=title.x).map(b=>b.x),p.x+p.w)-6;
    if(title.x+title.width>titleRight){
      title.setText(this.run.tourMode==='endless'?'无尽筹备':'筹备');
      if(title.x+title.width>titleRight)title.setText('筹备');
    }
    v.add(this.add.graphics().fillStyle(0x213d45,.2).fillRoundedRect(purse.x+1,purse.y+3,purse.width,purse.height,7));
    v.material(purse,0xfff9ee,0xfff9ee,7);
    purseArt.lineStyle(1,0x916738).strokeRoundedRect(purse.x+.5,purse.y+.5,purse.width-1,purse.height-1,7);v.add(purseArt);
    const gold=v.text(purse.x+10,purse.y+5,'金币 '+this.run.gold,16,'#26313A').setName('shop/gold').setFontStyle('bold');
    for(let font=22;gold.width>purse.width-20&&font>14;)gold.setFontSize(--font);
    this.goldText=gold;
    drawShopArt(this,v,p);
    if(!p.portrait&&!p.short)v.text(p.x,p.top+37,`${stage.name} · 目标 ${heatText(stage.targetHeat)}`,14,'#3F606B',p.short?p.slots[4].x+p.slots[4].width-p.x:p.w-24);
    if(!p.short){
      const savedGrowth=buildGrowthProgress(this.run)[0];
      const ownedLabel=savedGrowth?savedGrowth.name+' · '+savedGrowth.metric:p.portrait?`当前持有 ${this.run.jokers.length}/${r2JokerCapacity(this.run)}`:`随身 ${this.run.jokers.length}/${r2JokerCapacity(this.run)} · 点牌出售／调序`;
      const inline=p.portrait&&p.slots[0].y-p.shelf[0].y-p.shelf[0].height<122;
      v.text(inline?p.x:p.slots[0].x,inline?p.top+27:p.slots[0].y-20,ownedLabel,14,'#26313A',p.slots[4].x+p.slots[4].width-p.slots[0].x).setName('shop/owned-heading');
    }
    this.drawOwned(p);
    if(!p.portrait&&!p.short)v.button(p.chapter,p.portrait?(this.run.program&&!this.run.program.choiceMade?'接节目单':'本章'):'本章节目','action/chapter',()=>this.inspectChapter());
    if(!p.portrait&&!p.short)v.button(p.items,`物品 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)} · 道具${this.run.longTermItems.length}`,'action/items',()=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq)));
    const inventoryRow=shopToolInventoryRow(p.tabs);
    this.drawShelfTabs(inventoryRow.shelves);
    inventoryFeedback(this,v.button(inventoryRow.inventory,toolInventoryLabel(this.run),'action/tool-inventory',()=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq))),this.run,this.ready,this.resultReduced);
    const offers=this.visibleOffers();
    offers.forEach((o,i)=>{
      if(this.shelfKind!=='jokers'){this.drawGoodsOffer(o,p.shelf[i],p.short,p.portrait);return;}
      const selected=this.selectedOfferId===o.offerId,b=p.shelf[i],d=this.jokerDefinition(o.definitionId),ability=this.jokerCopy(o.definitionId),first=v.root.length;
      this.drawOfferCard(b,d.rarity,selected,o.consumed,p.short);
      this.drawJokerPicture(o.definitionId,{x:b.x+4,y:b.y+4,width:b.width-8,height:b.height-8},o.consumed?.35:1);
      const copy=shopOfferCopy(p,b,true),copyX=copy.x,copyY=copy.y,copyWidth=copy.width;
      const name=v.text(copyX,copyY+4,d.name,15,'#26313A').setFontStyle('bold').setName('shop/offer-name');this.ellipsis(name,copyWidth);
      const plain=ability?.plain,full=plain?.line??ability?.summary??d.description;
      const purpose=v.text(copyX,copyY+23,p.desktop?full:plain?.tile??full,14,'#3F606B',copyWidth).setStyle({maxLines:0}).setName('shop/offer-purpose').setData('offerId',o.offerId).setData('definitionId',d.id).setData('fullText',full);
      purpose.setWordWrapWidth(copyWidth,true);
      if(purpose.height>(p.desktop?76:54))this.twoLines(purpose,copyWidth);

      const price=r2PurchasePrice(this.run,o);
      const priceInk=this.offerPricePlate(o,{x:copyX-2,y:copy.priceY-2,width:copyWidth+2,height:24});
      v.text(copyX,copy.priceY,o.consumed?'已收入':price+' 金 · 查看',16,priceInk).setFontStyle('bold').setName('shop/offer-price').setData('offerId',o.offerId);
      v.add(createJokerRarityBadge(this,d.rarity,{x:b.x+b.width-31,y:b.y+b.height-21,compact:true}).setData('definitionId',o.definitionId).setData('surface','offer'));
      this.markBuildOffer(o,'jokers',b);
      const tile=copy.tile,hover=this.hoverCard(first,tile,o.definitionId),r=v.rect(tile).setFillStyle(0,0).setStrokeStyle().setData('selected',selected);
      this.offerArts.push(hover.art);v.target(r,`offer/${o.offerId}`,{tap:()=>this.inspectOffer(o.offerId),detail:()=>this.inspectOffer(o.offerId),...hover});

    });
    if(!offers.length)v.text(p.shelf[0].x,p.shelf[0].y,this.shelfKind==='items'?'本店暂无可购道具；换牌会保留此货架。':'本货架暂无商品，可换一批或进入牌桌。',14,'#3F606B',p.w);
    const allowed=r2RunModeConfig(this.run).reroll.allowed,cost=this.run.shop?.freeRerolls?0:r2PaidRerollPrice(this.run),canReroll=this.ready&&allowed&&this.run.gold>=cost&&r2Pool(this.run.jokers.map(j=>j.definitionId),this.run.safetyNetUsed?['f07']:[]).length>0;
    v.button(p.reroll,!allowed?'禁止换牌':this.run.shop?.freeRerolls?'免费换牌':`换牌 ${cost} 金`,'action/reroll',()=>void this.send({type:'RerollShop'}),canReroll);
    v.button(p.play,'进入牌桌','action/start-stage',()=>void this.send({type:'LeaveShop'}),this.ready,true);
    v.button(p.build,this.lastPurchaseReceipt?'购物结果':p.inventoryCollapsed?`培养 ${this.run.jokers.length}/${r2JokerCapacity(this.run)}`:this.buildLabel(),'action/build',()=>this.lastPurchaseReceipt?this.openPurchaseReceipt():this.inspectJourney());
    const reason=!this.ready?'当前进度未保存或只读，请查看菜单。':allowed&&this.run.gold<cost?`换牌还差 ${cost-this.run.gold} 金。可直接入场。`:this.shelfKind==='jokers'&&this.run.jokers.length===r2JokerCapacity(this.run)?`${r2JokerCapacity(this.run)}槽已满，点随身牌出售后再买。`:this.shelfKind==='tools'?'购买后收入库存；查看详情，再确认使用。':this.shelfKind==='items'?'道具本局生效；换牌不重抽道具货架。':p.portrait?'点卡牌看详情，确认后扣款。':'点卡牌不会扣钱；点随身牌可出售或左移、右移。';
    const discovery=this.ready&&!this.notice?savedGrowthDiscovery(this.run):undefined;
    this.noticeLabel=v.text(p.short?p.x:p.tabs.x,p.noticeY,this.busy?'正在保存…':this.notice||(this.shelfKind==='tools'?r2BasicToolShelfStatus(this.run):undefined)||discovery?.full||starterShopCue(this.run)||firstChapterGuide(this.run)?.cue||reason,14,this.notice?'#B8473A':'#3F606B',p.short?p.w:p.tabs.width).setStyle({maxLines:p.short?1:2}).setName(discovery?'growth/discovery':'');
    this.drawFirstGuide(p);
    this.drawResultCue();
  }
  private drawShopPortrait(p:ReturnType<typeof shopLayout>):void {
    const pc=p.pc;if(!pc)return;const character=getCharacter(this.run.characterId),key=selectionPortraitKey(character.id);
    if(!this.textures.exists(key))return;
    const guide=firstChapterShopPrompt(this.run)&&this.ready?shopFirstGuideLayout(p,this.view.layout.height,this.run.jokers.length===0):undefined;
    const y=(guide?guide.box.y+guide.box.height:p.chapter.y+p.chapter.height)+20;
    const height=Math.min(280,pc.left.y+pc.left.height-y-48),width=Math.min(pc.left.width-32,height/1.4);
    if(height<96)return;
    const source=this.textures.get(key).getSourceImage() as HTMLImageElement;
    const scale=Math.min(width/source.width,height/source.height),x=p.x+pc.left.width/2;
    this.view.add(this.add.image(x,y+height/2,key).setScale(scale).setName('shop/hero-art'));
    const hit=this.view.add(this.add.rectangle(x,y+height/2,width,height,0,0));
    this.view.target(hit,'shop/hero-preparation',{tap:()=>this.inspectJourney(true),detail:()=>this.inspectJourney(true)});
    this.view.text(x,y+height+8,character.name+' · 下场准备↗',16,'#3F606B').setOrigin(.5,0).setName('shop/hero-caption');
  }
  private drawOwned(p:ReturnType<typeof shopLayout>):void {
    const v=this.view;
    if(!p.inventoryCollapsed)this.run.jokers.forEach((j,i)=>{
      const b=p.slots[i],d=this.jokerDefinition(j.definitionId),ability=this.jokerCopy(j.definitionId,j),first=v.root.length;
      this.drawSlot(b,true,d.rarity);const cue=routeFitCue(this.run,'jokers',j.definitionId,j.instanceId);if(cue)v.add(routeFrame(this,b,cue,d.rarity==='rare').setName('shop/held-route-fit'));
      this.drawJokerPicture(j.definitionId,{x:b.x+3,y:b.y+22,width:b.width-6,height:b.height-25});
      const nameArea=shopOwnedNameArea(b,p.slots[i+1]?.x,v.layout.width);
      const ownedName=v.text(nameArea.x,b.y+3,d.name,14,'#26313A');this.ellipsis(ownedName,nameArea.width);
      v.add(createJokerRarityBadge(this,d.rarity,{x:b.x+b.width-31,y:b.y+b.height-21,compact:true}).setData('definitionId',j.definitionId).setData('surface','owned'));

      if(p.pc){const state=v.text(b.x,b.y+b.height+3,`${shopRouteRelation(this.run,j,currentBuildFocus(this.run,this.run.openingRoute)).tag}·${j.definitionId==='b10'?'热度'+fractionText(j.growth.heat??{n:'0',d:'1'}):ability?.compact||'查看'}`,14,'#3F606B').setName('shop/owned-state');this.ellipsis(state,b.width);}
      if(!p.pc&&b.y+b.height+20<=p.reroll.y-4)v.text(b.x+b.width/2,b.y+b.height+3,shopRouteRelation(this.run,j,currentBuildFocus(this.run,this.run.openingRoute)).tag,14,'#3F606B').setOrigin(.5,0).setName('shop/owned-route');
      const hover=this.hoverCard(first,b,j.definitionId),r=v.rect(p.pc?b:shopOwnedHitBox(b,p.reroll.y,!!ability||!p.portrait)).setFillStyle(0,0).setStrokeStyle();
      v.target(r,`joker/${j.instanceId}`,{tap:()=>this.inspectJoker(j.instanceId),detail:()=>this.inspectJoker(j.instanceId),drag:(x,y)=>this.moveJoker(j.instanceId,x,y),holdToDrag:true,...hover});
    });
    if(!p.short&&this.run.jokers.length&&!firstChapterShopPrompt(this.run)){
      const first=this.run.jokers[0],plain=this.jokerCopy(first.definitionId,first)?.plain;
      const x=p.pc?p.build.x:p.x,y=p.pc?p.slots[0].y:Math.max(p.chapter.y+p.chapter.height,p.items.y+p.items.height)+8,limit=p.pc?p.slots[0].y+p.slots[0].height:p.reroll.y-8,width=p.pc?p.pc.inventoryEntry.x-x-12:p.w;
      if(plain&&width>=160&&limit-y>=56){const text=v.text(x,y,this.jokerDefinition(first.definitionId).name+' · '+plain.line+'\n'+plain.status,14,'#3F606B',width).setName('shop/held-purpose').setData('instanceId',first.instanceId);if(text.height>limit-y)text.setText(this.jokerDefinition(first.definitionId).name+' · '+plain.tile);}
    }
    const guide=firstChapterShopPrompt(this.run)&&this.ready?shopFirstGuideLayout(p,this.view.layout.height,this.run.jokers.length===0):undefined;
    for(let i=this.run.jokers.length;!p.inventoryCollapsed&&!guide?.replacesEmptySlots&&i<r2JokerCapacity(this.run);i++){
      const b=p.slots[i];this.drawSlot(b,false);v.text(b.x+b.width/2,b.y+b.height-21,p.portrait?String(i+1):`空槽 ${i+1}`,14,'#a6bab0').setOrigin(.5,0);
    }
  }
  private renderPC(p:ReturnType<typeof shopLayout>):void {
    const pc=p.pc!;const v=this.view,stage=getR2Stage(this.run.stageIndex,this.run.tourMode,this.run.difficulty)!;
    drawShopArt(this,v,p);
    v.text(p.x+16,p.top+16,this.run.tourMode==='endless'?'无尽演出筹备':'演出筹备',24,'#26313A').setFontStyle('bold');
    v.text(p.x+16,p.top+58,stage.name,16,'#3F606B',pc.left.width-32);
    v.text(p.x+16,p.top+86,'目标 '+heatText(stage.targetHeat),18,'#26313A',pc.left.width-32);
    this.goldText=v.text(p.x+16,p.top+124,'金币 '+this.run.gold,28,'#26313A',pc.left.width-32).setName('shop/gold').setFontStyle('bold');
    v.button({...p.chapter,x:p.chapter.x+12,width:p.chapter.width-24},this.run.program&&!this.run.program.choiceMade?'本章节目 · 待选':'本章节目','action/chapter',()=>this.inspectChapter());
    v.text(pc.ownedRail.x,p.top+12,(buildGrowthProgress(this.run)[0]?.metric??`当前构筑 ${this.run.jokers.length}/${r2JokerCapacity(this.run)} · 从左至右触发`),16,'#26313A').setName('shop/owned-heading');
    v.button(p.build,this.lastPurchaseReceipt?'购物结果':this.buildLabel(),'action/build',()=>this.lastPurchaseReceipt?this.openPurchaseReceipt():this.inspectJourney());this.drawOwned(p);
    const entry=shopInventoryEntry(p.tabs,pc.inventoryEntry);
    inventoryFeedback(this,v.button(entry,toolInventoryLabel(this.run),'action/tool-inventory',()=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq))),this.run,this.ready,this.resultReduced);
    v.text(entry.x,entry.y+52,`长期物品 ${this.run.longTermItems.length}/${R2_LIMITS.longTermSlots}`,14,'#3F606B',entry.width);
    const allowed=r2RunModeConfig(this.run).reroll.allowed,cost=this.run.shop?.freeRerolls?0:r2PaidRerollPrice(this.run),canReroll=this.ready&&allowed&&this.run.gold>=cost&&r2Pool(this.run.jokers.map(j=>j.definitionId),this.run.safetyNetUsed?['f07']:[]).length>0;
    v.button(p.play,'进入牌桌','action/start-stage',()=>void this.send({type:'LeaveShop'}),this.ready,true);
    v.button(p.reroll,!allowed?'禁止换牌':this.run.shop?.freeRerolls?'免费换牌':`换牌 ${cost} 金`,'action/reroll',()=>void this.send({type:'RerollShop'}),canReroll);
    v.text(p.reroll.x,p.reroll.y+56,!allowed?'本模式禁止换牌。':this.run.gold<cost?`还差 ${cost-this.run.gold} 金；可直接入场。`:'换牌更新大丑牌与工具；长期物品货架保留。',14,'#3F606B',p.reroll.width);
    v.text(p.tabs.x,pc.shopPanel.y+6,`邀请助演 · 待售 ${this.run.shop!.offers.filter(o=>!o.consumed).length}`,14,'#3F606B');
    this.drawShopPortrait(p);
    const jokerPages=Math.max(1,Math.ceil(this.run.shop!.offers.length/3));this.pcPages.jokers=Math.min(this.pcPages.jokers,jokerPages-1);
    if(jokerPages>1)v.button({x:p.play.x,y:p.reroll.y+144,width:p.reroll.width,height:44},`大丑牌 ${this.pcPages.jokers+1}/${jokerPages} ›`,'action/pc-page-jokers',()=>{this.pcPages.jokers=(this.pcPages.jokers+1)%jokerPages;this.render();});
    this.run.shop!.offers.slice(this.pcPages.jokers*3,(this.pcPages.jokers+1)*3).forEach((o,i)=>this.drawPCOffer(o,'jokers',pc.jokerOffers[i],p.shelf[i]));
    for(const kind of ['tools','items'] as const){
      const offers=this.shelfOffers(kind),group=kind==='tools'?pc.toolOffers:pc.itemOffers,capacity=this.pcGroupCapacity(kind,p),pages=Math.max(1,Math.ceil(offers.length/capacity));this.pcPages[kind]=Math.min(this.pcPages[kind],pages-1);
      v.text(group.x,pc.groupY,(kind==='tools'?'购买道具':'长期道具')+` · 待售 ${offers.filter(o=>!o.consumed).length}`,14,'#3F606B');
      if(pages>1){const b={x:group.x+group.width-100,y:pc.groupY-20,width:100,height:44};v.button(b,`${this.pcPages[kind]+1}/${pages} ›`,'action/pc-page-'+kind,()=>{this.pcPages[kind]=(this.pcPages[kind]+1)%pages;this.render();});}
      const visible=offers.slice(this.pcPages[kind]*capacity,this.pcPages[kind]*capacity+capacity),seat=(group.width-8*Math.max(0,visible.length-1))/Math.max(1,visible.length);
      if(!visible.length)v.text(group.x+10,group.y+18,'暂无待售'+(kind==='tools'?'工具':'长期物品'),14,'#7B7365',group.width-20);
      visible.forEach((o,i)=>{const b={x:group.x+i*(seat+8),y:group.y,width:seat,height:group.height};const artWidth=Math.min(72,(b.height-16)/1.4);this.drawPCOffer(o,kind,b,{x:b.x+8,y:b.y+8,width:artWidth,height:artWidth*1.4});});
    }
    const discovery=this.ready&&!this.notice?savedGrowthDiscovery(this.run):undefined;
    this.noticeLabel=v.text(pc.feedback.x+6,pc.feedback.y,this.busy?'正在保存…':this.notice||r2BasicToolShelfStatus(this.run)||discovery?.full||starterShopCue(this.run)||firstChapterGuide(this.run)?.cue||'点商品只看详情，确认才扣款；购买工具不会自动使用。',14,this.notice?'#B8473A':'#3F606B',pc.feedback.width-12).setStyle({maxLines:1}).setName(discovery?'growth/discovery':'');this.drawResultCue();
    this.drawFirstGuide(p);
  }
  private drawFirstGuide(p:ReturnType<typeof shopLayout>):void {
    const hint=firstChapterShopPrompt(this.run),g=hint&&this.ready?shopFirstGuideLayout(p,this.view.layout.height,this.run.jokers.length===0):undefined;if(!hint||!g)return;
    const v=this.view;v.material(g.box,0xe2e8e5,0xe2e8e5,6);
    v.text(g.box.x+g.padding,g.box.y+g.padding,hint.text,14,'#26313A',g.box.width-g.padding*2).setFontStyle('bold').setName('first-guide/shop-copy');
    v.button(g.buttons[0],hint.action,'first-guide/shop-open',()=>{const step=hint.opening;if(step?.kind==='basic-tools')this.inspectBasicChoice();else if(step?.kind==='jokers'||step?.kind==='tools'){this.shelfKind=step.kind;this.inspectOffer(step.offerId);}else if(step?.kind==='inventory')showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq),step.instanceId);else this.inspectJourney();});
    for(const [i,scope,label] of [[1,'step','略过'],[2,'run','本局关闭'],[3,'forever','不再显示']] as const)if(g.buttons[i])v.button(g.buttons[i],label,'first-guide/shop-'+scope,()=>{dismissFirstChapterGuide(this.run,scope);this.render();});
  }
  /** Long real rules may need a whole group; paging must use the same final capacity. */
  private pcGroupCapacity(kind:'tools'|'items',p:ReturnType<typeof shopLayout>):number {
    const group=kind==='tools'?p.pc!.toolOffers:p.pc!.itemOffers;
    const budget=Math.floor((group.width/2-88)/14)*Math.floor((group.height-64)/16);
    return group.width>=440&&this.shelfOffers(kind).every(o=>(kind==='tools'?toolInfo(o.definitionId,this.run):itemInfo(o.definitionId)).description.length<=budget)?2:1;
  }
  private shopJokerSummary(id:string):string {
    const d=this.jokerDefinition(id);
    if(this.run.contentVersion==='quality-r2-group-upgrade-prototype-v1'&&(id==='b10'||id==='b03')){
      const growth=d.hooks.flatMap(h=>h.operations).find(op=>op.kind==='add-growth');
      if(growth?.kind==='add-growth')return `本手读已存${id==='b10'?'热度':'倍率'}；成组手后+${fractionText(growth.value)}，上限+${fractionText(growth.cap)}，下手起生效。`;
    }
    return this.jokerCopy(id)?.plain?.line??this.jokerCopy(id)?.summary??d.description;
  }
  private drawPCOffer(o:R2Offer,kind:ShelfKind,tile:Box,face:Box):void {
    if(isBasicChoiceSeat(o)){this.drawBasicChoiceSeat(o,tile);return;}
    const v=this.view,first=v.root.length,d=kind==='jokers'?this.jokerDefinition(o.definitionId):undefined,info=kind==='tools'?toolInfo(o.definitionId,this.run):kind==='items'?itemInfo(o.definitionId):undefined;
    shopSheet(this,v,'offer',tile,o.consumed?PAPER_THEME.jadeSoft:PAPER_THEME.paperLight,true);
    if(d)shopSheet(this,v,'offer-stage',{x:tile.x+4,y:tile.y+4,width:tile.width-8,height:face.height+10},PAPER_THEME.jadeSoft);
    
    const investment=shopInvestment(this.run,o,kind);
    let summary=investment&&(kind==='tools'&&['升型','改牌'].includes(investment.role)||investment.role==='倍率'&&investment.effect!==d?.description)?investment.short+'；'+investment.next:d?this.shopJokerSummary(d.id):info!.description;
    if(!investment&&!d&&/^T0[3-6]$/.test(o.definitionId)){const suit=info!.description.match(/改为(.+?)，/)?.[1];summary=`商店/待出牌：选1–3张永久改${suit}；成功消耗，保留其余属性。`;}
    if(!d&&o.definitionId==='U11')summary='后续开店长期货位1→2；当前不补，刷新不重抽。同种限一件，不可售。';
    if(!d&&o.definitionId==='U01')summary='下场手牌上限+1，最多14；当前不补。同种限一件，不可售。';
    if(d){const plain=this.jokerCopy(d.id)?.plain;summary=plain?(plain.fallback?plain.tile:plain.line)+(plain.status.startsWith('现在')?'\n'+plain.status:''):this.shopJokerSummary(d.id);}
    const initialX=d?tile.x+10:face.x+face.width+10,initialY=d?face.y+face.height+2:tile.y+2,width=tile.x+tile.width-initialX-10;
    const priceY=d?tile.y+face.height+98:tile.y+tile.height-36;
    const probe=v.text(0,0,'',14,'#3F606B');
    const wrapped=shopSummaryWrap(summary,width,text=>{probe.setText(text);return probe.width;});probe.setText(wrapped);
    const column=!d&&probe.height>priceY-(initialY+22)-4;probe.destroy();
    const columnArtHeight=Math.min(face.height,Math.max(0,priceY-(tile.y+24)-4));
    const artFace=column?{...face,y:tile.y+24,width:columnArtHeight/1.4,height:columnArtHeight}:face;
    if(d){this.drawJokerPicture(d.id,artFace,o.consumed?.35:1);v.add(createJokerRarityBadge(this,d.rarity,{x:artFace.x+artFace.width-31,y:artFace.y+artFace.height-21,compact:true}).setData('definitionId',d.id).setData('surface','offer'));}
    else this.drawGoodsArt(o.definitionId,info!.artUrl,artFace,o.consumed?.55:1,info!.fallbackArtUrl);
    const name=v.text(column?tile.x+8:initialX,column?tile.y+2:initialY,d?.name??info!.name,15,'#26313A').setFontStyle('bold').setName('shop/offer-name').setData('offerId',o.offerId);this.ellipsis(name,column?64:width);
    v.text(initialX,column?tile.y+2:initialY+22,wrapped,14,'#3F606B').setName('shop/offer-purpose').setData('fullText',summary).setData('offerId',o.offerId);
    // A long full rule owns the right column; the price stays below the art on the left.
    const priceX=column?tile.x+8:initialX;
    const priceInk=this.offerPricePlate(o,{x:priceX-2,y:priceY-2,width:column?66:tile.x+tile.width-priceX-8,height:24});
    v.text(priceX,priceY,o.consumed?'已购':`${r2PurchasePrice(this.run,o)} 金${column?'':` · ${d?editionLabel(o.edition):'查看'}`}`,16,priceInk).setFontStyle('bold').setName('shop/offer-price').setData('offerId',o.offerId);
    this.markBuildOffer(o,kind,tile);
    const reason=o.consumed?'':this.purchaseReason(o,true);if(reason){const note=v.text(priceX,priceY+20,reason,14,'#B8473A').setName('shop/offer-reason').setData('offerId',o.offerId);this.ellipsis(note,column?64:width);}
    const hover=this.hoverCard(first,tile,d?.id),hit=v.rect(tile).setFillStyle(0,0).setStrokeStyle().setData('selected',this.selectedOfferId===o.offerId);
    this.pcOfferBoxes.set(o.offerId,tile);this.offerArts.push(hover.art);v.target(hit,'offer/'+o.offerId,{tap:()=>this.inspectOffer(o.offerId),detail:()=>this.inspectOffer(o.offerId),...hover});
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
    if(!this.scene.isActive()||!this.view)return;for(const marker of this.starterMarkers)if(marker.active)marker.setAlpha(this.resultReduced?.95:.78+.22*Math.sin(performance.now()/320));const result=this.resultFeedback.snapshot(performance.now(),this.resultReduced);
    if(result?.key!==this.resultKey){this.drawResultCue();return;}
    if(result){this.resultNote?.setAlpha(result.alpha);this.resultPlate?.setAlpha(result.alpha);}
  }
  private drawShelfTabs(b:Box):void {
    const v=this.view,pages=Math.ceil(this.shelfOffers().length/this.pageSize),pagerWidth=pages>1?44:0,gap=6,width=(b.width-pagerWidth-gap*(pagerWidth?3:2))/3;
    const labels:Record<ShelfKind,string>={jokers:'邀请助演',tools:'购买道具',items:'长期道具'};
    (['jokers','tools','items'] as const).forEach((kind,i)=>{
      const button=v.button({x:b.x+i*(width+gap),y:b.y,width,height:b.height},width<72?labels[kind]:labels[kind]+' '+this.shelfOffers(kind).length,'action/shelf-'+kind,()=>{
        if(this.busy)return;this.shelfKind=kind;this.shelfPage=0;this.selectedOfferId=undefined;this.audio.select();this.render();
      },!this.busy,false);
      if(this.shelfKind===kind)(button.getData('buttonArt') as Phaser.GameObjects.Container).add(this.add.graphics().lineStyle(2,0x3f606b).strokeRoundedRect(1,1,width-2,b.height-2,6));
      (button.getData('label') as Phaser.GameObjects.Text).setFontSize(width<72?12:14);
    });
    if(pages>1){
      const button=v.button({x:b.x+b.width-44,y:b.y,width:44,height:b.height},this.shelfPage+1<pages?'›':'‹','action/shelf-page',()=>{
        if(this.busy)return;this.shelfPage=(this.shelfPage+1)%pages;this.selectedOfferId=undefined;this.audio.select();this.render();
      },!this.busy);(button.getData('label') as Phaser.GameObjects.Text).setFontSize(24);
    }
  }
  private findOffer(id:string):{kind:ShelfKind;offer:R2Offer}|undefined {
    for(const kind of ['jokers','tools','items'] as const){const offer=this.shelfOffers(kind).find(row=>row.offerId===id);if(offer)return {kind,offer};}
  }
  private drawGoodsArt(id:string,url:string,b:Box,alpha=1,fallbackUrl=url):void {
    const external=!url.startsWith('data:'),key=external?goodsArtKey(id):'goods-motif/'+id;
    const holder=this.view.add(this.add.container(b.x+b.width/2,b.y+b.height/2).setName('shop/goods-art/'+id).setData('artUrl',url).setData('bounds',b));
    const target={holder,box:b,alpha};this.artTargets.set(key,target);
    if(this.textures.exists(key)){this.paintGoodsArt(key);return;}
    holder.add(this.view.text(0,0,this.shelfKind==='tools'?'工具':'道具',18,'#85784f').setOrigin(.5));
    const fallbackKey='goods-motif/'+id;this.artTargets.set(fallbackKey,target);
    if(this.textures.exists(fallbackKey))this.paintGoodsArt(fallbackKey);
    else if(!this.artRefreshListeners.has(fallbackKey)){
      const lifecycle=this.lifecycle,loaded=()=>{this.artRefreshListeners.delete(fallbackKey);if(lifecycle===this.lifecycle&&this.scene.isActive())this.paintGoodsArt(this.textures.exists(key)?key:fallbackKey);};
      this.artRefreshListeners.set(fallbackKey,loaded);this.textures.once('addtexture-'+fallbackKey,loaded);this.textures.addBase64(fallbackKey,fallbackUrl);
    }
    if(external)requestGoodsArt(this,id,url,()=>{this.paintGoodsArt(key);this.dialog.refreshArtLoad();});
  }
  private paintGoodsArt(key:string):void {
    const target=this.artTargets.get(key);
    // Failed fetch/decode still notifies detail status. It must never replace
    // an already valid fallback with Phaser's missing-texture placeholder.
    if(!target?.holder.active||!this.textures.exists(key))return;
    const image=this.add.image(0,0,key),scale=Math.min(target.box.width/image.width,target.box.height/image.height);
    target.holder.removeAll(true);target.holder.add(image.setScale(scale).setAlpha(target.alpha));
  }
  private ellipsis(text:Phaser.GameObjects.Text,width:number):void {text.setData('fullText',text.text);let copy=text.text;while(text.width>width&&copy.length){copy=copy.slice(0,-1);text.setText(copy+'…');}}
  private twoLines(text:Phaser.GameObjects.Text,width:number):void {
    const full=text.text;let line='',lines:string[]=[];text.setWordWrapWidth(0);
    for(const char of full.replaceAll('\n',' ')){text.setText(line+char);if(text.width>width&&line){lines.push(line);line=char;if(lines.length===2)break;}else line+=char;}
    if(lines.length<2)lines.push(line);else{let last=lines[1];text.setText(last+'…');while(text.width>width&&last.length){last=last.slice(0,-1);text.setText(last+'…');}lines[1]=last+'…';}
    text.setText(lines.join('\n')).setData('fullText',full);
  }
  private drawBasicChoiceSeat(o:R2Offer,raw:Box):void {
    const v=this.view,p=this.geometry(),copy=p.pc?{tile:raw,x:raw.x+10,y:raw.y+8,width:raw.width-20,priceY:raw.y+raw.height-30}:shopOfferCopy(p,raw),first=v.root.length;
    shopSheet(this,v,'offer',copy.tile,o.consumed?PAPER_THEME.jadeSoft:PAPER_THEME.paperLight,true);
    if(!p.pc&&p.copyBeside){
      v.text(raw.x+raw.width/2,raw.y+18,'基础\n自选1件',16,PAPER_CSS.ink,raw.width-12).setOrigin(.5,0).setFontStyle('bold');
      v.text(raw.x+raw.width/2,raw.y+66,'升 降 删\n热 倍',14,PAPER_CSS.jade,raw.width-12).setOrigin(.5,0);
    }
    v.text(copy.x,copy.y+4,p.pc?'基础改牌 · 自选1件':'基础自选1件',14,PAPER_CSS.ink,copy.width).setFontStyle('bold').setName('shop/basic-choice-title');
    v.text(copy.x,copy.y+27,o.consumed?(p.pc?'本店已购，下一店恢复':'已购 · 下店恢复'):(p.pc?'升点／降点／删牌／热度／倍率\n每店一次，刷新不补货':'升 降 删 热 倍\n本店一次'),p.pc?14:12,PAPER_CSS.jade,copy.width).setStyle({maxLines:p.pc?3:2}).setName('shop/basic-choice-purpose');
    v.text(copy.x,copy.priceY,o.consumed?'已选购':p.pc?`标价2 · 实付${r2PurchasePrice(this.run,o)}金`:`实付${r2PurchasePrice(this.run,o)}金`,14,PAPER_CSS.ink,copy.width).setFontStyle('bold').setName('shop/basic-choice-price');
    const hover=this.hoverCard(first,copy.tile),r=v.rect(copy.tile).setFillStyle(0,0).setStrokeStyle();v.target(r,'offer/'+o.offerId,{tap:()=>this.inspectBasicChoice(),detail:()=>this.inspectBasicChoice(),...hover});this.offerArts.push(hover.art);
  }
  private inspectBasicChoice():void {
    const seat=basicChoiceSeat(this.run);if(!seat||this.busy)return;
    const rows=basicChoiceRows(this.run),seq=this.run.commandSeq,shopSeq=this.run.shop!.basicChoice!.shopSeq;
    this.audio.select();
    this.dialog.open('基础改牌 · 本店自选1件',`标价2金，优惠沿既有合同；最低实付1金。\n${seat.consumed?'本店选择已购，刷新不能重开；下一店恢复。':'确认购买才扣款，买后仍由你选择目标使用。'}\n\n${rows.map(r=>r.info.name+'：'+r.purpose+(r.reason?'\n'+r.reason:'')).join('\n\n')}\n\n改牌不保证下一手发到目标或过关；也可以留钱入场。`,[],{
      summaryBody:`当前 ${this.run.gold} 金 · 道具箱 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)}\n每店只选购1件，刷新不补货；复制与献纸不在基础位。`,collapseRules:true,rulesLabel:'路线用途与使用边界',closeLabel:'回到经营',
      cards:rows.map(row=>({title:row.info.name,url:row.info.artUrl,body:row.purpose+'\n'+(row.reason??`实付 ${row.price} 金 · 买后余额 ${this.run.gold-row.price} 金`),action:!this.ready||!!row.reason&&!row.duplicate?undefined:{label:row.duplicate?`看随机位 · ${row.duplicate.consumed?'已售':row.price+'金'}`:`选择 · ${row.price}金`,run:()=>{
        if(row.duplicate){if(row.duplicate.consumed)this.dialog.open(row.info.name+' · 随机位已购','同名商品本店已售。基础位不能另选同名，但仍可选其它合法基础操作。',[{label:'返回基础选择',run:()=>this.inspectBasicChoice()}]);else this.inspectOffer(row.duplicate.offerId);return;}
        this.confirmBasicChoice(row.id,seq,shopSeq);
      }}})),
    });
  }
  private confirmBasicChoice(definitionId:string,seq:number,shopSeq:number):void {
    const row=basicChoiceRows(this.run).find(r=>r.id===definitionId);if(!row||row.reason)return;
    const info=row.info,price=row.price,purchaseBefore=new Set(this.run.consumables.map(c=>c.instanceId));
    const dialog=this.dialog.open(info.name+' · 基础选购',info.description+'\n'+info.cost+'\n'+info.risk+'\n购买不会立即改牌；使用时自行选目标。',[{label:`购买 · ${price} 金`,primary:true,disabled:!this.ready,run:async()=>{
      if(!this.dialog.active(dialog))return;
      if(await this.send({type:'BuyBasicTool',definitionId,shopSeq},seq)){
        if(!this.dialog.active(dialog))return;
        const gained=this.run.consumables.find(c=>!purchaseBefore.has(c.instanceId)&&c.definitionId===definitionId);if(!gained){this.dialog.close(dialog);return;}
        const result=this.dialog.open(info.name+' · 已购入',`购买已保存 · 实付 ${price} 金 · 余额 ${this.run.gold} 金\n本店基础选择已售罄；刷新不重开。\n尚未使用，目标仍由你选择。`,[{label:'立即使用',primary:true,run:()=>showConsumables(this.dialog,this.run,this.ready,(a,s)=>this.send(a,s),gained.instanceId)},{label:'查看道具箱',run:()=>showConsumables(this.dialog,this.run,this.ready,(a,s)=>this.send(a,s))}],{closeLabel:'回到经营'});result.classList.add('tool-purchased-result');
      }
    }}],{shopContext:'purchase',closeLabel:'取消',portrait:goodsArtPortrait(info),summaryBody:`实付 ${price} 金 · 余额 ${this.run.gold} → ${this.run.gold-price} 金\n${row.purpose}\n本店一次；先留钱或取消不消费次数。`,collapseRules:true});
  }
  private drawGoodsOffer(o:R2Offer,raw:Box,short:boolean,portrait:boolean):void {
    if(isBasicChoiceSeat(o)){this.drawBasicChoiceSeat(o,raw);return;}
    const v=this.view,selected=this.selectedOfferId===o.offerId,b=raw,isTool=this.shelfKind==='tools',info=isTool?toolInfo(o.definitionId,this.run):itemInfo(o.definitionId),first=v.root.length;
    this.drawOfferCard(b,isTool?'uncommon':'common',selected,o.consumed,short);this.markBuildOffer(o,this.shelfKind,b);
    this.drawGoodsArt(o.definitionId,info.artUrl,{x:b.x+5,y:b.y+5,width:b.width-10,height:b.height-10},o.consumed?.55:1,info.fallbackArtUrl);
    const p=this.geometry(),copy=shopOfferCopy(p,b),copyX=copy.x,copyY=copy.y,copyWidth=copy.width;
    const name=v.text(copyX,copyY+4,info.name,14,'#26313A');this.ellipsis(name,copyWidth);
    const investment=shopInvestment(this.run,o,this.shelfKind),summary=investment&&['升型','改牌'].includes(investment.role)?investment.short+'；'+investment.next:info.description.split('\n')[0];
    const purpose=v.text(copyX,copyY+23,summary,14,'#3F606B').setName('shop/offer-purpose').setData('offerId',o.offerId).setData('fullText',summary);if(p.desktop)purpose.setWordWrapWidth(copyWidth,true).setStyle({maxLines:4});else this.twoLines(purpose,copyWidth);
    const priceInk=this.offerPricePlate(o,{x:copyX-2,y:copy.priceY-2,width:copyWidth+2,height:24});
    v.text(copyX,copy.priceY,o.consumed?'已收入':r2PurchasePrice(this.run,o)+' 金',16,priceInk).setFontStyle('bold').setName('shop/offer-price').setData('offerId',o.offerId);
    const tile=copy.tile,hover=this.hoverCard(first,tile),r=v.rect(tile).setFillStyle(0,0).setStrokeStyle().setData('selected',selected);this.offerArts.push(hover.art);
    v.target(r,'offer/'+o.offerId,{tap:()=>this.inspectOffer(o.offerId),detail:()=>this.inspectOffer(o.offerId),...hover});
  }

  private hoverCard(first:number,b:Box,definitionId?:string):{enter:()=>void;leave:()=>void;art:Phaser.GameObjects.Container} {
    const v=this.view,cx=b.x+b.width/2,cy=b.y+b.height/2,members=v.root.list.slice(first),art=this.add.container(cx,cy);
    for(const child of members){
      if(child instanceof Phaser.GameObjects.Image||child instanceof Phaser.GameObjects.Text||child instanceof Phaser.GameObjects.Graphics||child instanceof Phaser.GameObjects.Rectangle||child instanceof Phaser.GameObjects.Arc||child instanceof Phaser.GameObjects.Container){
        child.setPosition(child.x-cx,child.y-cy);art.add(child);
      }
    }
    v.add(art);
    const glow=this.add.graphics().lineStyle(3,0x3f606b,.7).strokeRoundedRect(-b.width/2-1,-b.height/2-1,b.width+2,b.height+2,6).setAlpha(0);art.add(glow);
    const reduced=()=>gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const leave=()=>{
      this.hideHoverPicture();if(!art.active)return;this.tweens.killTweensOf(art);glow.setAlpha(0);
      if(reduced())art.setPosition(cx,cy).setScale(1).setAngle(0);
      else this.tweens.add({targets:art,x:cx,y:cy,angle:0,scaleX:1,scaleY:1,duration:110,ease:'Sine.easeOut'});
    };
    art.once('destroy',()=>this.tweens.killTweensOf(art));
    return {enter:()=>{
      if(!art.active||!this.scene.isActive())return;this.hideHoverPicture();this.tweens.killTweensOf(art);glow.setAlpha(1);v.root.bringToTop(art);
      if(!reduced())this.tweens.add({targets:art,y:cy-2,angle:0,scaleX:1,scaleY:1,duration:130,ease:'Sine.easeOut'});
      if(definitionId)this.hoverDelay=this.time.delayedCall(280,()=>{this.hoverDelay=undefined;if(art.active&&this.scene.isActive()&&!document.querySelector('dialog[open]'))this.showHoverPicture(definitionId,b);});
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
    return '版次：'+editionEffectText(edition).split('。')[0]+(this.run.chapterDisabledJokerId===definitionId?' · 本章封角暂停':(edition??'none')!=='none'?' · 独立于本体条件':'');
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
    this.view.material(b,tone,tone,3).setName('shop/price-plate').setData('offerId',o.offerId).setData('availability',o.consumed?'owned':unavailable?'unavailable':'available');
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
    v.material(b,badge.paper,0xcbb591,3).setAlpha(alpha);
    if(key&&this.textures.exists(key)){
      const picture=this.add.image(b.x+b.width/2,b.y+b.height/2,key),scale=Math.min((b.width-4)/picture.width,(b.height-4)/picture.height);
      v.add(picture.setScale(scale).setAlpha(alpha));
    }else {
      const motif=this.add.container(b.x+b.width/2,b.y+b.height/2).setAlpha(alpha);v.add(motif);
      drawJokerMotif(this,motif,definitionId,0,0,Math.min(b.width,b.height)*.88,this.jokerDefinition(definitionId));
      if(b.width>=88&&b.height>=70){
        const state=jokerArtLoadState(this,definitionId).status,label=state==='unregistered'?'机制示意':state==='failed'?'插画未加载':'插画加载中';
        v.add(this.add.rectangle(b.x+b.width/2,b.y+b.height-10,b.width-4,18,0xf4ead4,.96));
        v.text(b.x+b.width/2,b.y+b.height-17,label,11,'#3c5954').setOrigin(.5,0);
      }
    }
    g.lineStyle(1,0xa69778,.45).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,3);v.add(g.setAlpha(alpha));
    holder.add(v.root.list.slice(first));
  }
  private drawOfferCard(b:Box,rarity:JokerRarity,selected:boolean,consumed:boolean,short:boolean,headerHeight=64,footerHeight=short?44:64):void {
    const shadow=this.add.graphics().fillStyle(0x26313a,.08).fillRoundedRect(b.x+1,b.y+3,b.width,b.height,5);
    this.view.add(shadow);this.view.material(b,consumed?0xe2e8e5:0xfff9ee,0xfff9ee,5);
    this.view.add(this.add.graphics().lineStyle(selected?2:1,0x26313a,.55).strokeRoundedRect(b.x,b.y,b.width,b.height,5));
  }

  private purchaseReason(o:R2Offer,short=false):string {
    if(!this.ready)return short?'暂不可购买':'当前只读或未保存，请查看菜单。';
    const kind=this.findOffer(o.offerId)?.kind;if(!kind)return '商品已变化，请重新查看';
    if(kind==='jokers'){
      if(this.run.jokers.length>=r2JokerCapacity(this.run))return short?'槽位已满':`${r2JokerCapacity(this.run)}个槽位已满。请先关闭详情，点随身牌确认出售，再购买。`;
      if(this.run.jokers.some(j=>j.definitionId===o.definitionId))return '已装备同名牌';
    }else if(kind==='tools'){
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
  /** Outline real existing faces without hiding alternatives or changing the shelf hit rectangles. */
  private markBuildOffer(o:R2Offer,kind:ShelfKind,b:Box):void {
    const cue=routeFitCue(this.run,kind,o.definitionId);if(cue&&!o.consumed)this.view.add(routeFrame(this,b,cue,kind==='jokers'&&this.jokerDefinition(o.definitionId).rarity==='rare').setName('shop/build-match').setData('offerId',o.offerId));
    if(kind==='jokers'&&starterOffer(this.run,o)){this.view.material({x:b.x+4,y:b.y+4,width:76,height:22},0xfff9ee,0xfff9ee,3);this.view.text(b.x+8,b.y+6,'起手 · 可选',14,'#26313A').setFontStyle('bold').setName('shop/route-starter-label').setData('offerId',o.offerId);}
    if(this.selectedOfferId===o.offerId)this.view.text(b.x+b.width-20,b.y+b.height-25,'✓',18,'#26313A').setName('shop/offer-selected');
  }
  private inspectJourney(heroFocus=false):void {
    showBuildJourney(this.dialog,this.run,{ready:this.ready,basicTool:id=>{const row=id?basicChoiceRows(this.run).find(r=>r.id===id):undefined;if(!row||row.reason){this.inspectBasicChoice();return;}this.confirmBasicChoice(row.id,this.run.commandSeq,this.run.shop!.basicChoice!.shopSeq);},onFocus:()=>this.render(),chapter:()=>this.inspectChapter(),manage:()=>this.inspectBuild(),source:id=>this.inspectJoker(id),compare:(o,j)=>this.inspectJoker(j,o),tools:()=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq)),tool:id=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq),id),deck:()=>this.inspectDeck(),offers:(id,kind)=>{this.shelfKind=kind;this.inspectOffer(id);},continueLabel:'保留金币进入牌桌',continue:()=>{this.dialog.close();void this.send({type:'LeaveShop'});}});
    if(heroFocus){const panel=this.dialog.current,fold=panel?.querySelector<HTMLDetailsElement>('.build-keepsake-compact');if(panel&&fold){fold.addEventListener('toggle',()=>{if(this.dialog.active(panel))fold.querySelector('.build-keepsake-hero')?.scrollIntoView({block:'nearest'});},{once:true});fold.open=true;}}
  }
  private inspectBuild():void {
    const body=this.run.jokers.map((j,i)=>`${i+1}. ${this.jokerDefinition(j.definitionId).name} · ${editionEffectText(j.edition)} · 售价 ${salePrice(j.paidPrice)} 金\n${this.jokerCopy(j.definitionId,j)?.plain?.line??this.jokerCopy(j.definitionId,j)?.summary??this.jokerDefinition(j.definitionId).description}`).join('\n\n')||'尚无大丑牌。先看卡牌效果，也可以保留金币直接入场。';
    const items=this.run.longTermItems.map(id=>{const info=itemInfo(id);return info.name+'：'+info.description;}).join('\n')||'尚无长期道具。';
    const comparison=this.run.shop!.offers.slice(0,3).map(o=>`${this.jokerDefinition(o.definitionId).name} · ${r2PurchasePrice(this.run,o)} 金\n${this.shopJokerSummary(o.definitionId)}`).join('\n\n');
    const dialog=this.dialog.open('当前构筑 · 从左至右触发',body+'\n\n持有用途（按槽位，不代表强弱排名）：\n'+this.run.jokers.map(j=>this.jokerDefinition(j.definitionId).name+' · '+shopRouteRelation(this.run,j,currentBuildFocus(this.run,this.run.openingRoute)).body).join('\n\n')+(purchaseDiscountStatus(this.run)?'\n\n当前优惠状态\n'+purchaseDiscountStatus(this.run):'')+`\n\n有效牌组 ${this.run.deckInstances.length-this.run.destroyedIds.length} 张 · 消耗品 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)}\n长期道具 ${this.run.longTermItems.length}/${R2_LIMITS.longTermSlots}\n`+items+(this.lastPurchaseReceipt?'\n\n上次购物 · 购入时记录\n'+this.lastPurchaseReceipt.body:'')+'\n\n本店三货对比 · 完整规则点商品\n'+comparison+'\n\n点随身牌可移动顺序。出售需要再次确认；调序不花金币。'+(this.lastTransactionNotes.length?'\n\n上次交易的实际来源：\n'+this.lastTransactionNotes.join('\n'):''),[{label:'选择培养方向',primary:true,run:()=>this.inspectJourney()},{label:'本章节目',run:()=>this.inspectChapter()},{label:'物品与道具',run:()=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq))}]);
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
    const s=this.run,seq=s.commandSeq,index=s.stageIndex,start=Math.floor(index/3)*3,normal=SKIP_ITEM_LABELS[s.chapterSkipConsumable];
    const stages=[0,1,2].map(i=>{const stage=getR2Stage(start+i,s.tourMode,s.difficulty)!;return stage.name+' · 目标 '+heatText(stage.targetHeat);}).join('\n');
    const challenge=R2_MODE_CATALOG.challenges.find(row=>row.id===s.challengeId),ban=s.chapterDisabledJokerId?`\n本章封角：${this.jokerDefinition(s.chapterDisabledJokerId).name}。计分和版次暂停，静态与经济照常。`:'';
    const body=(challenge?challenge.name+'：'+challenge.description+'\n\n':'')+stages+`\n\n压轴 ${s.boss.definitionId} · `+r2BossText(s.boss)+ban+'\n\n'+programStatus(s)+`\n\n暖场跳过：下一次买牌减2金，最低1金。现有 ${s.purchaseCoupons} 张券。\n正场跳过：${normal}；库存满时改为1金。\n跳过不获得过关奖励或利息，不触发过关效果；压轴不可跳过。`;
    this.dialog.open(s.tourMode==='endless'?'无尽 · 本章节目':'本章节目',body,[...(s.program?[{label:s.program.choiceMade?'查看节目单':'选择节目单',run:()=>showPrograms(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq))}]:[]),{label:'跳过本场',disabled:!this.ready||index%3===2,run:()=>{
      const reward=index%3===0?'下一次买牌减2金券':s.consumables.length<r2ConsumableCapacity(s)?normal:'库存已满，获得1金';
      const d=this.dialog.open('跳场确认',`跳过「${getR2Stage(index,s.tourMode,s.difficulty)!.name}」获得 ${reward}。\n本场没有热度、过关奖金或利息，也不会触发过关效果。`,[{label:'确认跳场',primary:true,run:async()=>{if(await this.send({type:'SkipStage'},seq))this.dialog.close(d);}}],{closeLabel:'取消'});
    }}]);
  }
  private inspectOffer(id:string):void {
    if(id===basicChoiceSeat(this.run)?.offerId){this.inspectBasicChoice();return;}
    const found=this.findOffer(id);if(!found||found.offer.consumed||this.busy)return;const {kind,offer:o}=found,seq=this.run.commandSeq;
    if(kind==='jokers')this.pcPages.jokers=Math.floor(this.run.shop!.offers.findIndex(o=>o.offerId===id)/3);
    if(kind==='tools'||kind==='items'){const pc=this.geometry().pc,group=kind==='tools'?pc?.toolOffers:pc?.itemOffers,capacity=pc?this.pcGroupCapacity(kind,this.geometry()):1;this.pcPages[kind]=Math.floor(this.shelfOffers(kind).findIndex(o=>o.offerId===id)/capacity);}
    this.selectedOfferId=id;this.notice='';this.audio.select();this.render();
    const price=r2PurchasePrice(this.run,o),after=this.run.gold-price,reason=this.purchaseReason(o),d=kind==='jokers'?this.jokerDefinition(o.definitionId):undefined,info=kind==='tools'?toolInfo(o.definitionId,this.run):kind==='items'?itemInfo(o.definitionId):undefined,ability=d?this.jokerCopy(d.id):undefined;
    const cap=r2InterestCap(this.run),afterState=kind==='jokers'?{...this.run,jokers:[...this.run.jokers,r2CreateJoker(o.definitionId,'preview/'+o.offerId,price,o.edition,this.run)]}:kind==='items'?{...this.run,longTermItems:[...this.run.longTermItems,o.definitionId]}:this.run,afterCap=r2InterestCap(afterState);
    const money=after<0?`现有 ${this.run.gold} 金，尚差 ${-after} 金。`:`余额 ${this.run.gold} → ${after} 金。\n过关利息档 ${Math.min(cap,Math.floor(this.run.gold/5))} → ${Math.min(afterCap,Math.floor(after/5))} 金。`;
    const discount=r2PurchaseDiscount(this.run),discountText=discount?`原价 ${o.price} 金，当前优惠 ${discount} 金，最低实付1金。\n${this.run.purchaseCoupons?'本次会使用1张减2金券。\n':''}`:'';
    const effect=d?(ability?'':d.description+r2JokerExtraHelp(d)+'\n')+'版次：'+editionEffectText(o.edition):kind==='tools'?(()=>{const tool=toolInfo(o.definitionId,this.run);return [toolPurpose(this.run,o.definitionId),tool.description,tool.cost,tool.risk,'购买后收入消耗品库存，使用时另选目标并确认额外代价。'].filter(Boolean).join('\n\n');})():info!.description;
    const inventory=kind==='jokers'?'当前构筑：'+(this.run.jokers.map(j=>this.jokerDefinition(j.definitionId).name).join('、')||'空'):kind==='tools'?`消耗品库存 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)}。购买不会自动使用或替换旧物。`:`长期道具 ${this.run.longTermItems.length}/${R2_LIMITS.longTermSlots}。同种不可重复、不可出售，持续到本局结束。`;
    const investment=shopInvestment(this.run,o,kind),tierBefore=Math.min(cap,Math.floor(this.run.gold/5)),tierAfter=after>=0?Math.min(afterCap,Math.floor(after/5)):undefined;
    const trade=tierAfter===undefined?'':`利息档 ${tierBefore}→${tierAfter} 金`+(tierBefore===tierAfter?'（当前余额不降档）':'（按购后余额重算）')+'；仅过关按届时余额结算。';
    const body=effect+`\n\n实际购买支付 ${price} 金\n`+discountText+money+'\n\n'+inventory+(reason?'\n\n无法购买：'+reason:'\n\n确认购买才会扣除金币。');
    const purchaseBefore=new Set(this.run.consumables.map(c=>c.instanceId));
    const name=d?.name??(kind==='tools'?toolInfo(o.definitionId,this.run).label:info!.name),portrait=d?this.jokerPortrait(d.id):goodsArtPortrait(info!);
    const plainSummary=d?`实付 ${price} 金 · `+(after<0?`现有 ${this.run.gold} 金，差 ${-after} 金`:`余额 ${this.run.gold} → ${after} 金`)+(reason&&after>=0?'\n'+reason:'')+shopPurchaseConditionLosses(this.run,o).map(loss=>'\n'+loss).join(''):undefined;
    const dialog=this.dialog.open(name+' · 购买详情',body,[...(d&&this.run.jokers.length?[{label:'与持有牌比较',run:()=>this.inspectReplacement(id)}]:[]),{label:d?`邀请 · ${price} 金`:`购买 · ${price} 金`,primary:true,disabled:!!reason,run:async()=>{if(await this.send({type:'BuyOffer',offerId:id},seq)){if(kind==='tools'&&this.dialog.active(dialog)){const gained=this.run.consumables.find(c=>!purchaseBefore.has(c.instanceId)&&c.definitionId===o.definitionId);if(gained){const purchased=this.dialog.open(info!.name+' · 已购入',`购买已保存 · 余额 ${this.run.gold} 金\n道具箱 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)} · 尚未使用\n${toolPurpose(this.run,o.definitionId)}`, [{label:'立即使用',primary:true,run:()=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq),gained.instanceId)},{label:'查看道具箱',run:()=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq))}],{closeLabel:'回到经营'});purchased.classList.add('tool-purchased-result');}else this.dialog.close(dialog);}else this.dialog.close(dialog);}}}],{shopContext:'purchase',closeLabel:'取消',portrait,rarity:d?.rarity,...(d?{artLoad:this.jokerArtStatus(d.id)}:info?.detailArtUrl?{artLoad:{status:goodsArtLoadState(this,o.definitionId).status,readStatus:()=>goodsArtLoadState(this,o.definitionId).status,retry:()=>retryGoodsArt(this,o.definitionId,info.artUrl,()=>{this.paintGoodsArt(goodsArtKey(o.definitionId));this.dialog.refreshArtLoad();})}}:{}),summaryBody:plainSummary??(d?shopOfferRelation(this.run,o,currentBuildFocus(this.run,this.run.openingRoute)).label+' · ':'')+`实付 ${price} 金 · `+(after<0?`现有 ${this.run.gold} 金，差 ${-after} 金`:`余额 ${this.run.gold} → ${after} 金`)+'\n'+trade+(investment?'\n'+investment.next:'')+(d?.id==='f04'&&after>=0?'\n购后余额仅供参考；+3 条件在每手开始时检查。':'')+(reason?'\n'+reason:''),effectBody:d?shopOfferRelation(this.run,o,currentBuildFocus(this.run,this.run.openingRoute)).body:(investment&&['升型','改牌'].includes(investment.role)?investment.effect:effect),editionBody:ability?this.jokerEditionSummary(o.edition,d!.id):undefined,ability,collapseRules:true});
    markRouteDetail(dialog,routeFitCue(this.run,kind,o.definitionId));
    attachFirstChapterGuide(this.run,()=>this.render());
    if(d)this.attachJokerFallback(dialog,d.id);
  }
  private inspectReplacement(offerId:string):void {
    const found=this.findOffer(offerId);if(!found||found.kind!=='jokers'||found.offer.consumed||this.busy)return;
    const o=found.offer,focus=currentBuildFocus(this.run,this.run.openingRoute),d=this.jokerDefinition(o.definitionId);
    const cards=this.run.jokers.map((j,i)=>{const f=shopReplacementFacts(this.run,o,j,focus),held=this.jokerDefinition(j.definitionId);return {title:`第 ${i+1} 槽 · ${held.name}`,url:jokerArtPreviewUrl(held.id),body:(this.jokerCopy(held.id,j)?.plain?.line??held.description)+'\n出售失去：'+r2JokerStateText(j,held)+'；基础卖价 '+salePrice(j.paidPrice)+' 金。\n同名新购不继承成长。'+(f.saleEffects.length?'\n成功出售后的联动：\n'+f.saleEffects.join('\n'):''),details:f.loss+'\n'+f.connections+'\n'+f.money+'\n'+f.held.body,action:{label:'保留或管理这张',run:()=>this.inspectJoker(j.instanceId,offerId)}};});
    this.dialog.open(d.name+' · 持有与现货比较','按现持槽位逐张比较。保留、换方向或留金入场都可以；这里不排序推荐，也不自动卖买。',[{label:'返回购买详情',run:()=>this.inspectOffer(offerId)},{label:'更换培养方向',run:()=>this.inspectJourney()}],{shopContext:'compare',summaryBody:'现货 · '+shopOfferRelation(this.run,o,focus).label+' · '+d.name+' · 实付'+r2PurchasePrice(this.run,o)+'金\n'+d.description,cards});attachFirstChapterGuide(this.run,()=>this.render());
  }
  private openPurchaseReceipt():void {
    const receipt=this.lastPurchaseReceipt;if(!receipt)return;
    const joker=receipt.kind==='jokers',info=joker?undefined:receipt.kind==='tools'?toolInfo(receipt.definitionId,this.run):itemInfo(receipt.definitionId);
    const url=joker?jokerArtUrl(receipt.definitionId):undefined,portrait=joker?(url?{url,thumbnailUrl:jokerArtPreviewUrl(receipt.definitionId),alt:receipt.name,layout:'card' as const}:undefined):goodsArtPortrait(info!);
    const role=shopInvestment(this.run,{offerId:'receipt',definitionId:receipt.definitionId,price:0,consumed:true},receipt.kind)?.role;
    const detail=this.dialog.open(receipt.name+' · 购物已保存',receipt.body,[{label:joker?'查看新牌':receipt.kind==='tools'?(role==='升型'?'选择升级目标':role==='改牌'?'选择改牌目标':'选择工具与目标'):'物品与道具',run:()=>joker?this.inspectJoker(receipt.id):showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq),receipt.kind==='tools'?receipt.id:undefined)},{label:'继续培养',primary:true,run:()=>this.inspectJourney()},{label:'构筑详情',run:()=>this.inspectBuild()}],{portrait});
    if(joker)this.attachJokerFallback(detail,receipt.definitionId);
  }
  private inspectJoker(id:string,offerId?:string):void {
    const j=this.run.jokers.find(j=>j.instanceId===id);if(!j||this.busy)return;this.hideHoverPicture();const d=this.jokerDefinition(j.definitionId),index=this.run.jokers.indexOf(j),seq=this.run.commandSeq;
    const relation=shopRouteRelation(this.run,j,currentBuildFocus(this.run,this.run.openingRoute));
    const saleEffects=shopSaleConsequences(this.run,j);
    const growth=r2JokerStateText(j,d),ability=this.jokerCopy(d.id,j),causality=groupGrowthCausality(this.run,j);
    const dialog=this.dialog.open(d.name+' · 第 '+(index+1)+' 槽',(ability?'':d.description+r2JokerExtraHelp(d)+'\n')+'版次：'+editionEffectText(j.edition)+'\n\n当前实例：'+growth+`\n实际买价 ${j.paidPrice} 金；基础卖价 ${salePrice(j.paidPrice)} 金。\n当前余额 ${this.run.gold} 金；交易来源与售后余额按实际保存结果显示。\n\n大丑牌按从左至右的顺序触发。`,[
      ...(offerId?[{label:'返回现货比较',run:()=>this.inspectReplacement(offerId)}]:[]),
      ...(causality?[{label:'成长因果',run:()=>{const saved=groupGrowthCausality(this.run,j);if(saved)this.dialog.open(saved.title,saved.body);}}]:[]),
      {label:'左移',disabled:!this.ready||index===0,run:async()=>{if(await this.reorder(index,index-1,seq)&&this.dialog.active(dialog))this.inspectJoker(id,offerId);}},
      {label:'右移',disabled:!this.ready||index===this.run.jokers.length-1,run:async()=>{if(await this.reorder(index,index+1,seq)&&this.dialog.active(dialog))this.inspectJoker(id,offerId);}},
      {label:'出售',disabled:!this.ready,run:()=>{const confirmation=this.dialog.open('出售确认',`出售第 ${index+1} 槽的「${d.name}」基础卖价 ${salePrice(j.paidPrice)} 金币。\n当前余额 ${this.run.gold} 金；交易来源与售后余额以实际保存结果为准。\n\n该牌成长将丢失，当前成长：${growth}。`+(saleEffects.length?'\n\n成功出售后保留牌的确定影响：\n'+saleEffects.join('\n'):''),[{label:'确认出售',primary:true,run:async()=>{if(await this.send({type:'SellJoker',instanceId:id},seq)&&this.dialog.active(confirmation)){this.dialog.close(confirmation);if(offerId)this.inspectOffer(offerId);}}}],{shopContext:'sale',closeLabel:'取消',portrait:this.jokerPortrait(d.id),rarity:d.rarity,summaryBody:`出售「${d.name}」 · 基础返还 ${salePrice(j.paidPrice)} 金\n失去当前成长：${growth}`});}},
    ],{shopContext:'held',summaryBody:relation.body+'\n现存：'+growth,portrait:this.jokerPortrait(d.id),rarity:d.rarity,artLoad:this.jokerArtStatus(d.id),editionBody:ability?this.jokerEditionSummary(j.edition,d.id):undefined,ability,collapseRules:!!ability});
    markRouteDetail(dialog,routeFitCue(this.run,'jokers',d.id,j.instanceId));this.attachJokerFallback(dialog,d.id);
  }
  private async reorder(from:number,to:number,expectedSeq?:number):Promise<boolean> {
    const current=this.run.jokers.map(j=>j.instanceId);
    if(!Number.isInteger(from)||from<0||from>=current.length)return false;
    const ids=reorderJokerIds(current,current[from],to);if(ids===current)return false;
    return this.send({type:'ReorderJokers',ids},expectedSeq);
  }
  private moveJoker(id:string,x:number,y:number):void {
    const from=this.run.jokers.findIndex(j=>j.instanceId===id),to=shopOwnedDropIndex(this.geometry(),x,y);
    if(from>=0&&to>=0&&to<this.run.jokers.length&&from!==to)void this.reorder(from,to);
  }
  private rollGold(from:number):void {
    const text=this.goldText,to=this.run.gold,reduced=gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!text?.active||reduced||from===to)return;
    const roll={t:0};
    this.tweens.add({targets:roll,t:1,duration:320,ease:'Cubic.easeOut',onUpdate:()=>{if(text.active)text.setText('金币 '+Math.round(from+(to-from)*roll.t));},onComplete:()=>{if(text.active){text.setText('金币 '+to);for(let font=22;text.width>96&&font>14;)text.setFontSize(--font);}}});
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
    if(this.pendingGoldRoll!==undefined){const from=this.pendingGoldRoll;this.pendingGoldRoll=undefined;this.rollGold(from);}
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
  private async send(action:Action,expectedSeq?:number):Promise<boolean> {
    if(!this.ready)return false;
    const previous=this.run,oldGold=previous.gold,owner=this.dialog.current;this.busy=true;const lifecycle=this.lifecycle;
    const purchase=action.type==='BuyOffer'?this.findOffer(action.offerId):undefined;
    const buyIndex=action.type==='BuyOffer'?this.visibleOffers().findIndex(o=>o.offerId===action.offerId):-1;
    const buyBox=this.geometry().pc?this.pcOfferBoxes.get(action.type==='BuyOffer'?action.offerId:''):buyIndex>=0?this.geometry().shelf[buyIndex]:undefined;
    const landSlot=purchase?.kind==='jokers'?this.geometry().slots[Math.min(previous.jokers.length,r2JokerCapacity(previous)-1)]:purchase?this.geometry().items:undefined;
    this.render();
    try {
      const result=await dispatchRun(this,action,expectedSeq);if(lifecycle!==this.lifecycle||!this.scene.isActive())return false;
      if(!result.ok){
        this.audio.invalid();
        if(result.code==='save-failed')this.dialog.close();
        else this.dialog.open('操作未提交',({'slots-full':'五个槽位已满，请先出售一张。','stale-shop':'商店已变化，请重新打开基础选择；本次没有扣款。','basic-choice-consumed':'本店基础选择已购；刷新不重开，下一店恢复。','basic-choice-not-legal':'合法目标或随机位现货已变化，请重新打开选择；本次没有扣款。','consumable-slots-full':'道具箱已满，本次没有扣款。','not-enough-gold':'金币不足；本次操作没有扣款。','already-owned':'已装备同名牌。','no-reroll-candidates':'没有可换入的卡牌。','stale-sequence':'本局在预览后已变化，请重新打开详情确认；没有消耗物品或金币。','replacement-pending':'新局或导入尚未保存，请在菜单重试、导出或取消候选。'} as Record<string,string>)[result.code]??'本次操作未提交，原选择和资源仍然保留。');
        return false;
      }
      this.run=result.state;
      if(!result.duplicate&&this.lastPurchaseReceipt&&!shopPurchaseReceiptExists(this.lastPurchaseReceipt,this.run))this.lastPurchaseReceipt=undefined;
      const transactions=result.events.filter((event):event is Extract<DomainEvent,{type:'joker-transaction'}>=>event.type==='joker-transaction');
      if(!result.duplicate&&transactions.length){this.pendingTransactions=transactions;this.lastTransactionNotes=transactions.map(event=>{const growth=transactionGrowthChange(previous,this.run,event);if(growth)this.transactionGrowthLines.set(event,transactionGrowthChange(previous,this.run,event,true)!);return growth??r2TransactionText(event,this.jokerDefinition(event.definitionId));});}
      if(action.type==='BuyOffer'&&purchase&&!result.duplicate){
        const {kind,offer}=purchase,name=kind==='jokers'?this.jokerDefinition(offer.definitionId).name:kind==='tools'?toolInfo(offer.definitionId,this.run).name:itemInfo(offer.definitionId).name;this.audio.purchase();
        this.lastPurchaseReceipt=shopPurchaseReceipt(previous,this.run,kind,offer);
        if(this.lastPurchaseReceipt?.payment?.saved)this.pendingPayment=this.lastPurchaseReceipt.payment.summary;
        this.notice=(kind==='jokers'?`已入第 ${this.run.jokers.length} 槽`:kind==='tools'?'已入道具箱，未使用':'已持有长期道具')+' · 点购物结果查看';
        this.pendingGoldRoll=oldGold;
        if(buyBox&&landSlot)this.pendingPurchaseFlight={from:buyBox,to:landSlot,name};
      }else if(action.type==='BuyBasicTool'&&!result.duplicate){
        this.audio.purchase();this.pendingGoldRoll=oldGold;
        this.lastPurchaseReceipt=shopPurchaseReceipt(previous,this.run,'tools',{offerId:'basic-choice/'+action.shopSeq,definitionId:action.definitionId,price:2,consumed:false});
        this.notice='基础选择已入道具箱，尚未使用 · 刷新不重开';
      }else if(action.type==='SellJoker'&&!result.duplicate){
        const joker=previous.jokers.find(j=>j.instanceId===action.instanceId)!;this.audio.sale();
        this.notice=`已售 ${this.jokerDefinition(joker.definitionId).name} · 金币 ${oldGold} → ${this.run.gold}`;
        this.pendingGoldRoll=oldGold;
      }else if(action.type==='RerollShop'&&!result.duplicate){this.selectedOfferId=undefined;this.audio.reroll();this.notice=`大丑牌与工具已更新 · 道具保留 · 金币 ${oldGold} → ${this.run.gold}`;this.pendingGoldRoll=oldGold;this.pendingRerollFlip=this.shelfKind!=='items';}
      else if(action.type==='ReorderJokers'){this.audio.select();this.notice='顺序已保存 · 从左至右触发';}
      else if(action.type==='ChooseProgram'||action.type==='AbandonProgram'){this.audio.select();this.notice=programStatus(this.run);}
      else if((action.type==='UseConsumable'||action.type==='DestroyConsumable')&&!result.duplicate){
        const item=previous.consumables.find(row=>row.instanceId===action.instanceId),used=result.events.find((event):event is Extract<DomainEvent,{type:'consumable-used'}>=>event.type==='consumable-used');
        if(used){const info=toolInfo(used.definitionId,this.run);this.audio.toolUse(info.family);this.pendingToolCue={instanceId:used.instanceId,label:info.label};}else this.audio.select();
        this.notice=(action.type==='UseConsumable'?'已使用 ':'已销毁 ')+(item?toolInfo(item.definitionId,this.run).name:'物品')+` · 库存 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)}`+(oldGold!==this.run.gold?` · 金币 ${oldGold} → ${this.run.gold}`:'');
        if(oldGold!==this.run.gold)this.pendingGoldRoll=oldGold;
        if(previous.shop!.rerollCount!==this.run.shop!.rerollCount){this.selectedOfferId=undefined;this.audio.reroll();this.pendingRerollFlip=this.shelfKind!=='items';}
      }
      if(action.type==='LeaveShop'){this.audio.select();paperSceneStart(this,'game');}
      else if(action.type==='SkipStage'){
        const s=this.run.stage!;paperSceneStart(this,'intermission',{cleared:true,stageIndex:s.index,stageHeat:s.heat,handsLeft:s.handsLeft,goldEarned:s.goldEarned} satisfies IntermissionResult);
      }
      if(action.type==='UseConsumable'&&!result.duplicate&&owner&&this.dialog.active(owner))showSavedToolResult(this.dialog,previous,this.run,action,this.resultReduced);
      return true;
    }finally {if(lifecycle===this.lifecycle){this.busy=false;if(this.scene.isActive()&&this.run.phase==='shop'){this.render();this.afterRenderFx();}}}
  }
}
import {basicChoiceSeat,isBasicChoiceSeat,basicChoiceRows} from './BasicToolChoice';
