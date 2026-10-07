import {r2ScoringDisabledJokerIds} from '../domain/scoreR2';
import {r2JokerDefinitionsFor,r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {jokerAbilityCopyForRun,publicJokerMemoryContext} from './JokerMemory';
import type {R2JokerInstance} from '../content/r2Schema';
import {shopLayout,shopSummaryWrap,shopOfferCopy,shopOwnedDropIndex,shopOwnedHitBox,shopOwnedNameArea} from './ShopLayout';
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
  private pendingGoldRoll?:number;
  private pendingRerollFlip=false;
  private pendingPurchaseFlight?:{from:Box;to:Box;name:string};
  private pendingToolCue?:{instanceId:string;label:string};
  private resultFeedback=new ShopResultFeedback();
  private resultNote?:Phaser.GameObjects.Text;
  private resultPlate?:Phaser.GameObjects.Graphics;
  private resultLayer?:Phaser.GameObjects.Container;
  private noticeLabel?:Phaser.GameObjects.Text;
  private resultKey?:string;
  private readonly dialog=new DetailDialog();
  private menuActions?:RunMenuActions;
  private readonly audio=AudioEngine.shared;
  constructor(){super('shop');}
  private get ready():boolean {const session=gameSession();return this.run?.phase==='shop'&&!this.busy&&runController(this)?.status==='idle'&&session.lease.writable&&!session.pendingRun&&!session.working;}
  private shelfOffers(kind=this.shelfKind):R2Offer[]{return this.run.shop![SHELF_FIELDS[kind]];}
  private get pageSize():number{return 3;}
  private visibleOffers():R2Offer[]{return this.shelfOffers().slice(this.shelfPage*this.pageSize,(this.shelfPage+1)*this.pageSize);}
  private geometry(){const l=this.view.layout,bottom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom'))||0,cols=this.shelfKind==='jokers'?Math.max(3,Math.min(this.pageSize,this.shelfOffers().length)):Math.max(1,Math.min(2,this.shelfOffers().length));return shopLayout(l.width,l.height,l.hud.y,bottom,cols,this.run.jokers.some(j=>!!this.jokerCopy(j.definitionId)));}
  create():void {
    this.busy=false;this.selectedOfferId=undefined;this.shelfKind='jokers';this.shelfPage=0;this.pcPages={jokers:0,tools:0,items:0};this.notice='';this.lifecycle++;
    this.pendingGoldRoll=undefined;this.pendingRerollFlip=false;this.pendingPurchaseFlight=undefined;this.pendingToolCue=undefined;this.pendingTransactions=[];this.lastTransactionNotes=[];
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
    const v=this.view,p=this.geometry(),stage=getR2Stage(this.run.stageIndex,this.run.tourMode,this.run.difficulty)!;this.hideHoverPicture();v.clear();v.paperBackground();this.offerArts=[];this.artTargets.clear();this.jokerArtTargets.clear();
    this.pcOfferBoxes.clear();if(p.pc){this.renderPC(p);return;}
    v.text(p.x,p.top,this.run.tourMode==='endless'?'无尽后台':'后台',20,'#26313A').setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold');
    const purse={x:p.x+p.w-(this.view.layout.width<=700?96:136)-124,y:p.top-1,width:116,height:34},purseArt=this.add.graphics();
    v.add(this.add.graphics().fillStyle(0x213d45,.2).fillRoundedRect(purse.x+1,purse.y+3,purse.width,purse.height,7));
    v.material(purse,0xfff9ee,0xfff9ee,7);
    purseArt.lineStyle(1,0x916738).strokeRoundedRect(purse.x+.5,purse.y+.5,purse.width-1,purse.height-1,7);v.add(purseArt);
    const gold=v.text(purse.x+10,purse.y+5,'金币 '+this.run.gold,16,'#26313A').setName('shop/gold').setFontStyle('bold');
    for(let font=22;gold.width>purse.width-20&&font>14;)gold.setFontSize(--font);
    this.goldText=gold;
    if(!p.portrait&&!p.short)v.text(p.x,p.top+37,`${stage.name} · 目标 ${heatText(stage.targetHeat)}`,14,'#3F606B',p.short?p.slots[4].x+p.slots[4].width-p.x:p.w-24);
    if(!p.short){
      const ownedLabel=p.portrait?`${stage.name} · 随身 ${this.run.jokers.length}/${r2JokerCapacity(this.run)}`:`随身 ${this.run.jokers.length}/${r2JokerCapacity(this.run)} · 点牌出售／调序`;
      v.text(p.slots[0].x,p.slots[0].y-22,ownedLabel,14,'#3F606B',p.slots[4].x+p.slots[4].width-p.slots[0].x);
    }
    this.drawOwned(p);
    if(!p.portrait&&!p.short)v.button(p.chapter,p.portrait?(this.run.program&&!this.run.program.choiceMade?'接节目单':'本章'):'本章节目','action/chapter',()=>this.inspectChapter());
    if(!p.portrait&&!p.short)v.button(p.items,`物品 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)} · 道具${this.run.longTermItems.length}`,'action/items',()=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq)));
    const inventoryRow=shopToolInventoryRow(p.tabs);
    this.drawShelfTabs(inventoryRow.shelves);
    v.button(inventoryRow.inventory,toolInventoryLabel(this.run),'action/tool-inventory',()=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq)));
    const offers=this.visibleOffers();
    offers.forEach((o,i)=>{
      if(this.shelfKind!=='jokers'){this.drawGoodsOffer(o,p.shelf[i],p.short,p.portrait);return;}
      const selected=this.selectedOfferId===o.offerId,b=p.shelf[i],d=this.jokerDefinition(o.definitionId),ability=this.jokerCopy(o.definitionId),first=v.root.length;
      this.drawOfferCard(b,d.rarity,selected,o.consumed,p.short);
      this.drawJokerPicture(o.definitionId,{x:b.x+4,y:b.y+4,width:b.width-8,height:b.height-8},o.consumed?.35:1);
      const copy=shopOfferCopy(p,b),copyX=copy.x,copyY=copy.y,copyWidth=copy.width;
      const name=v.text(copyX,copyY+4,d.name,14,'#26313A').setName('shop/offer-name');this.ellipsis(name,copyWidth);
      const purpose=v.text(copyX,copyY+23,ability?.summary??this.jokerDefinition(o.definitionId).description,14,'#3F606B',p.desktop?copyWidth:b.width+8).setStyle({maxLines:copy.lines}).setName('shop/offer-purpose');if(ability?.playerCopy){const full=purpose.text;if(p.desktop){purpose.setWordWrapWidth(0).setStyle({maxLines:0});purpose.setText(shopSummaryWrap(full,copyWidth,text=>{purpose.setText(text);return purpose.width;}));}else purpose.setWordWrapWidth(copyWidth,true).setStyle({maxLines:0});if(purpose.height>(p.desktop?76:40)||purpose.width>copyWidth){if(p.desktop)this.twoLines(purpose,copyWidth);else purpose.setText('条件与效果\n点击查看');}purpose.setData('fullText',full);}else this.twoLines(purpose,copyWidth);
      const price=r2PurchasePrice(this.run,o);v.text(copyX,copy.priceY,o.consumed?'已收入':price+' 金 · 查看',16,'#26313A').setName('shop/offer-price');
      v.add(createJokerRarityBadge(this,d.rarity,{x:b.x+b.width-31,y:b.y+b.height-21,compact:true}).setData('definitionId',o.definitionId).setData('surface','offer'));
      const tile=copy.tile,hover=this.hoverCard(first,tile,o.definitionId),r=v.rect(tile).setFillStyle(0,0).setStrokeStyle().setData('selected',selected);
      this.offerArts.push(hover.art);v.target(r,`offer/${o.offerId}`,{tap:()=>this.inspectOffer(o.offerId),detail:()=>this.inspectOffer(o.offerId),...hover});

    });
    if(!offers.length)v.text(p.shelf[0].x,p.shelf[0].y,this.shelfKind==='items'?'本店暂无可购道具；换牌会保留此货架。':'本货架暂无商品，可换一批或进入牌桌。',14,'#3F606B',p.w);
    const allowed=r2RunModeConfig(this.run).reroll.allowed,cost=this.run.shop?.freeRerolls?0:r2PaidRerollPrice(this.run),canReroll=this.ready&&allowed&&this.run.gold>=cost&&r2Pool(this.run.jokers.map(j=>j.definitionId),this.run.safetyNetUsed?['f07']:[]).length>0;
    v.button(p.reroll,!allowed?'禁止换牌':this.run.shop?.freeRerolls?'免费换牌':`换牌 ${cost} 金`,'action/reroll',()=>void this.send({type:'RerollShop'}),canReroll);
    v.button(p.play,'进入牌桌','action/start-stage',()=>void this.send({type:'LeaveShop'}),this.ready,true);
    v.button(p.build,p.inventoryCollapsed?`构筑 ${this.run.jokers.length}/${r2JokerCapacity(this.run)}`:'构筑详情','action/build',()=>this.inspectBuild());
    const reason=!this.ready?'当前进度未保存或只读，请查看菜单。':allowed&&this.run.gold<cost?`换牌还差 ${cost-this.run.gold} 金。可直接入场。`:this.shelfKind==='jokers'&&this.run.jokers.length===r2JokerCapacity(this.run)?`${r2JokerCapacity(this.run)}槽已满，点随身牌出售后再买。`:this.shelfKind==='tools'?'购买后收入库存；查看详情，再确认使用。':this.shelfKind==='items'?'道具本局生效；换牌不重抽道具货架。':p.portrait?'点卡牌看详情，确认后扣款。':'点卡牌不会扣钱；点随身牌可出售或左移、右移。';
    this.noticeLabel=v.text(p.short?p.x:p.tabs.x,p.noticeY,this.busy?'正在保存…':this.notice||reason,14,this.notice?'#B8473A':'#3F606B',p.short?p.w:p.tabs.width).setStyle({maxLines:p.short?1:2});
    this.drawResultCue();
  }
  private drawOwned(p:ReturnType<typeof shopLayout>):void {
    const v=this.view;
    if(!p.inventoryCollapsed)this.run.jokers.forEach((j,i)=>{
      const b=p.slots[i],d=this.jokerDefinition(j.definitionId),ability=this.jokerCopy(j.definitionId,j),first=v.root.length;
      this.drawSlot(b,true,d.rarity);
      this.drawJokerPicture(j.definitionId,{x:b.x+3,y:b.y+22,width:b.width-6,height:b.height-25});
      const nameArea=shopOwnedNameArea(b,p.slots[i+1]?.x,v.layout.width);
      const ownedName=v.text(nameArea.x,b.y+3,d.name,14,'#26313A');this.ellipsis(ownedName,nameArea.width);
      v.add(createJokerRarityBadge(this,d.rarity,{x:b.x+b.width-31,y:b.y+b.height-21,compact:true}).setData('definitionId',j.definitionId).setData('surface','owned'));

      if(p.pc){const state=v.text(b.x,b.y+b.height+3,`${i+1}·${j.definitionId==='b10'?'热度'+fractionText(j.growth.heat??{n:'0',d:'1'}):ability?.compact||'查看'}`,14,'#3F606B').setName('shop/owned-state');this.ellipsis(state,b.width);}
      const hover=this.hoverCard(first,b,j.definitionId),r=v.rect(p.pc?b:shopOwnedHitBox(b,p.reroll.y,!!ability||!p.portrait)).setFillStyle(0,0).setStrokeStyle();
      v.target(r,`joker/${j.instanceId}`,{tap:()=>this.inspectJoker(j.instanceId),detail:()=>this.inspectJoker(j.instanceId),drag:(x,y)=>this.moveJoker(j.instanceId,x,y),holdToDrag:true,...hover});
    });
    for(let i=this.run.jokers.length;!p.inventoryCollapsed&&i<r2JokerCapacity(this.run);i++){
      const b=p.slots[i];this.drawSlot(b,false);v.text(b.x+b.width/2,b.y+b.height-21,p.portrait?String(i+1):`空槽 ${i+1}`,14,'#a6bab0').setOrigin(.5,0);
    }
  }
  private renderPC(p:ReturnType<typeof shopLayout>):void {
    const pc=p.pc!;const v=this.view,stage=getR2Stage(this.run.stageIndex,this.run.tourMode,this.run.difficulty)!;
    v.material(pc.left,0xe2e8e5,0xe2e8e5,6);
    v.text(p.x+16,p.top+16,this.run.tourMode==='endless'?'无尽后台':'后台',24,'#26313A').setFontStyle('bold');
    v.text(p.x+16,p.top+58,stage.name,16,'#3F606B',pc.left.width-32);
    v.text(p.x+16,p.top+86,'目标 '+heatText(stage.targetHeat),18,'#26313A',pc.left.width-32);
    this.goldText=v.text(p.x+16,p.top+124,'金币 '+this.run.gold,24,'#26313A',pc.left.width-32).setName('shop/gold').setFontStyle('bold');
    v.button({...p.chapter,x:p.chapter.x+12,width:p.chapter.width-24},this.run.program&&!this.run.program.choiceMade?'本章节目 · 待选':'本章节目','action/chapter',()=>this.inspectChapter());
    v.text(pc.ownedRail.x,p.top+12,`当前构筑 ${this.run.jokers.length}/${r2JokerCapacity(this.run)} · 从左至右触发`,16,'#26313A').setName('shop/owned-heading');
    v.button(p.build,'构筑详情','action/build',()=>this.inspectBuild());this.drawOwned(p);
    const entry=shopInventoryEntry(p.tabs,pc.inventoryEntry);
    v.button(entry,toolInventoryLabel(this.run),'action/tool-inventory',()=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq)));
    v.text(entry.x,entry.y+52,`长期物品 ${this.run.longTermItems.length}/${R2_LIMITS.longTermSlots}`,14,'#3F606B',entry.width);
    v.material(pc.shopPanel,0xfff9ee,0xfff9ee,8);v.add(this.add.graphics().lineStyle(1,0x3f606b,.45).strokeRoundedRect(pc.shopPanel.x,pc.shopPanel.y,pc.shopPanel.width,pc.shopPanel.height,8));
    const allowed=r2RunModeConfig(this.run).reroll.allowed,cost=this.run.shop?.freeRerolls?0:r2PaidRerollPrice(this.run),canReroll=this.ready&&allowed&&this.run.gold>=cost&&r2Pool(this.run.jokers.map(j=>j.definitionId),this.run.safetyNetUsed?['f07']:[]).length>0;
    v.button(p.play,'进入牌桌','action/start-stage',()=>void this.send({type:'LeaveShop'}),this.ready,true);
    v.button(p.reroll,!allowed?'禁止换牌':this.run.shop?.freeRerolls?'免费换牌':`换牌 ${cost} 金`,'action/reroll',()=>void this.send({type:'RerollShop'}),canReroll);
    v.text(p.reroll.x,p.reroll.y+56,!allowed?'本模式禁止换牌。':this.run.gold<cost?`还差 ${cost-this.run.gold} 金；可直接入场。`:'换牌更新大丑牌与工具；长期物品货架保留。',14,'#3F606B',p.reroll.width);
    v.text(p.tabs.x,pc.shopPanel.y+6,`大丑牌 · 待售 ${this.run.shop!.offers.filter(o=>!o.consumed).length}`,14,'#3F606B');
    const jokerPages=Math.max(1,Math.ceil(this.run.shop!.offers.length/3));this.pcPages.jokers=Math.min(this.pcPages.jokers,jokerPages-1);
    if(jokerPages>1)v.button({x:p.play.x,y:p.reroll.y+144,width:p.reroll.width,height:44},`大丑牌 ${this.pcPages.jokers+1}/${jokerPages} ›`,'action/pc-page-jokers',()=>{this.pcPages.jokers=(this.pcPages.jokers+1)%jokerPages;this.render();});
    this.run.shop!.offers.slice(this.pcPages.jokers*3,(this.pcPages.jokers+1)*3).forEach((o,i)=>this.drawPCOffer(o,'jokers',pc.jokerOffers[i],p.shelf[i]));
    for(const kind of ['tools','items'] as const){
      const offers=this.shelfOffers(kind),group=kind==='tools'?pc.toolOffers:pc.itemOffers,capacity=this.pcGroupCapacity(kind,p),pages=Math.max(1,Math.ceil(offers.length/capacity));this.pcPages[kind]=Math.min(this.pcPages[kind],pages-1);
      v.text(group.x,pc.groupY,(kind==='tools'?'工具':'长期物品')+` · 待售 ${offers.filter(o=>!o.consumed).length}`,14,'#3F606B');
      if(pages>1){const b={x:group.x+group.width-100,y:pc.groupY-20,width:100,height:44};v.button(b,`${this.pcPages[kind]+1}/${pages} ›`,'action/pc-page-'+kind,()=>{this.pcPages[kind]=(this.pcPages[kind]+1)%pages;this.render();});}
      const visible=offers.slice(this.pcPages[kind]*capacity,this.pcPages[kind]*capacity+capacity),seat=(group.width-8*Math.max(0,visible.length-1))/Math.max(1,visible.length);
      if(!visible.length)v.text(group.x+10,group.y+18,'暂无待售'+(kind==='tools'?'工具':'长期物品'),14,'#7B7365',group.width-20);
      visible.forEach((o,i)=>{const b={x:group.x+i*(seat+8),y:group.y,width:seat,height:group.height};this.drawPCOffer(o,kind,b,{x:b.x+8,y:b.y+8,width:52,height:72.8});});
    }
    this.noticeLabel=v.text(pc.feedback.x+6,pc.feedback.y,this.busy?'正在保存…':this.notice||'点商品只看详情，确认才扣款；购买工具不会自动使用。',14,this.notice?'#B8473A':'#3F606B',pc.feedback.width-12).setStyle({maxLines:1});this.drawResultCue();
  }
  /** Long real rules may need a whole group; paging must use the same final capacity. */
  private pcGroupCapacity(kind:'tools'|'items',p:ReturnType<typeof shopLayout>):number {
    const group=kind==='tools'?p.pc!.toolOffers:p.pc!.itemOffers;
    const budget=Math.floor((group.width/2-88)/14)*Math.floor((group.height-64)/16);
    return group.width>=440&&this.shelfOffers(kind).every(o=>(kind==='tools'?toolInfo(o.definitionId):itemInfo(o.definitionId)).description.length<=budget)?2:1;
  }
  private drawPCOffer(o:R2Offer,kind:ShelfKind,tile:Box,face:Box):void {
    const v=this.view,first=v.root.length,d=kind==='jokers'?this.jokerDefinition(o.definitionId):undefined,info=kind==='tools'?toolInfo(o.definitionId):kind==='items'?itemInfo(o.definitionId):undefined;
    v.material(tile,0xf3eadb,0xf3eadb,5);v.add(this.add.graphics().lineStyle(1,this.selectedOfferId===o.offerId?0x3f606b:0xa69778,.5).strokeRoundedRect(tile.x,tile.y,tile.width,tile.height,5));
    if(d){this.drawJokerPicture(d.id,face,o.consumed?.35:1);v.add(createJokerRarityBadge(this,d.rarity,{x:face.x+face.width-31,y:face.y+face.height-21,compact:true}).setData('definitionId',d.id).setData('surface','offer'));}
    else this.drawGoodsArt(o.definitionId,info!.artUrl,face,o.consumed?.55:1,info!.fallbackArtUrl);
    const copyX=d?tile.x+10:face.x+face.width+10,copyY=d?face.y+face.height+2:tile.y+2,width=tile.x+tile.width-copyX-10;
    const name=v.text(copyX,copyY,d?.name??info!.name,14,'#26313A').setName('shop/offer-name');this.ellipsis(name,width);
    const ability=d?this.jokerCopy(d.id):undefined;
    let summary=ability?.summary??info!.description;
    if(d&&this.run.contentVersion==='quality-r2-group-upgrade-prototype-v1'&&(d.id==='b10'||d.id==='b03')){
      const growth=d.hooks.flatMap(h=>h.operations).find(op=>op.kind==='add-growth');
      if(growth?.kind==='add-growth')summary=`本手读已存${d.id==='b10'?'热度':'倍率'}；成组手后+${fractionText(growth.value)}，上限+${fractionText(growth.cap)}，下手起生效。`;
    }
    if(!d&&/^T0[3-6]$/.test(o.definitionId)){const suit=info!.description.match(/改为(.+?)，/)?.[1];summary=`商店/待出牌：选1–3张永久改${suit}；成功消耗，保留其余属性。`;}
    if(!d&&o.definitionId==='U11')summary='后续开店长期货位1→2；当前不补，刷新不重抽。同种限一件，不可售。';
    if(!d&&o.definitionId==='U01')summary='下场手牌上限+1，最多14；当前不补。同种限一件，不可售。';
    const purpose=v.text(copyX,copyY+22,'',14,'#3F606B').setName('shop/offer-purpose');purpose.setText(shopSummaryWrap(summary,width,text=>{purpose.setText(text);return purpose.width;})).setData('fullText',summary);
    // Keep the entire comparative rule visible; overflow is evidence to fix, never a silent line clamp.
    const priceY=d?tile.y+face.height+98:tile.y+tile.height-36;
    v.text(copyX,priceY,o.consumed?'已购':`${r2PurchasePrice(this.run,o)} 金 · ${d?editionLabel(o.edition):'查看'}`,16,'#26313A').setName('shop/offer-price');
    const reason=o.consumed?'':this.purchaseReason(o,true);if(reason){const note=v.text(copyX,priceY+20,reason,14,'#B8473A').setName('shop/offer-reason');this.ellipsis(note,width);}
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
    if(!this.scene.isActive()||!this.view)return;const result=this.resultFeedback.snapshot(performance.now(),this.resultReduced);
    if(result?.key!==this.resultKey){this.drawResultCue();return;}
    if(result){this.resultNote?.setAlpha(result.alpha);this.resultPlate?.setAlpha(result.alpha);}
  }
  private drawShelfTabs(b:Box):void {
    const v=this.view,pages=Math.ceil(this.shelfOffers().length/this.pageSize),pagerWidth=pages>1?44:0,gap=6,width=(b.width-pagerWidth-gap*(pagerWidth?3:2))/3;
    const labels:Record<ShelfKind,string>={jokers:'大丑牌',tools:'工具',items:'道具'};
    (['jokers','tools','items'] as const).forEach((kind,i)=>{
      const button=v.button({x:b.x+i*(width+gap),y:b.y,width,height:b.height},width<72?labels[kind]:labels[kind]+' '+this.shelfOffers(kind).length,'action/shelf-'+kind,()=>{
        if(this.busy)return;this.shelfKind=kind;this.shelfPage=0;this.selectedOfferId=undefined;this.audio.select();this.render();
      },!this.busy,false);
      if(this.shelfKind===kind)(button.getData('buttonArt') as Phaser.GameObjects.Container).add(this.add.graphics().lineStyle(2,0x3f606b).strokeRoundedRect(1,1,width-2,b.height-2,6));
      (button.getData('label') as Phaser.GameObjects.Text).setFontSize(14);
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
  private drawGoodsOffer(o:R2Offer,raw:Box,short:boolean,portrait:boolean):void {
    const v=this.view,selected=this.selectedOfferId===o.offerId,b=raw,isTool=this.shelfKind==='tools',info=isTool?toolInfo(o.definitionId):itemInfo(o.definitionId),first=v.root.length;
    this.drawOfferCard(b,isTool?'uncommon':'common',selected,o.consumed,short);
    this.drawGoodsArt(o.definitionId,info.artUrl,{x:b.x+5,y:b.y+5,width:b.width-10,height:b.height-10},o.consumed?.55:1,info.fallbackArtUrl);
    const p=this.geometry(),copy=shopOfferCopy(p,b),copyX=copy.x,copyY=copy.y,copyWidth=copy.width;
    const name=v.text(copyX,copyY+4,info.name,14,'#26313A');this.ellipsis(name,copyWidth);
    const purpose=v.text(copyX,copyY+23,info.description.split('\n')[0],14,'#3F606B');if(p.desktop)purpose.setWordWrapWidth(copyWidth,true).setStyle({maxLines:4});else this.twoLines(purpose,copyWidth);
    v.text(copyX,copy.priceY,o.consumed?'已收入':r2PurchasePrice(this.run,o)+' 金',16,'#26313A');
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
    v.material(b,0xfff9ee,0xfff9ee,5);v.add(this.add.graphics().lineStyle(1,0x3f606b,.5).strokeRoundedRect(b.x,b.y,b.width,b.height,5));
    if(!occupied&&this.textures.exists('p00-card-back'))v.add(this.add.image(b.x+b.width/2,b.y+b.height/2,'p00-card-back').setDisplaySize(b.width-6,b.height-6).setAlpha(.14));
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
    this.view.add(this.add.graphics().lineStyle(selected?2:1,selected?0x3f606b:0x26313a,.55).strokeRoundedRect(b.x,b.y,b.width,b.height,5));
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
  private inspectBuild():void {
    const body=this.run.jokers.map((j,i)=>`${i+1}. ${this.jokerDefinition(j.definitionId).name} · ${editionEffectText(j.edition)} · 售价 ${salePrice(j.paidPrice)} 金\n${this.jokerCopy(j.definitionId)?.summary??this.jokerDefinition(j.definitionId).description}`).join('\n\n')||'尚无大丑牌。先看卡牌效果，也可以保留金币直接入场。';
    const items=this.run.longTermItems.map(id=>{const info=itemInfo(id);return info.name+'：'+info.description;}).join('\n')||'尚无长期道具。';
    this.dialog.open('当前构筑 · 从左至右触发',body+`\n\n有效牌组 ${this.run.deckInstances.length-this.run.destroyedIds.length} 张 · 消耗品 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)}\n长期道具 ${this.run.longTermItems.length}/${R2_LIMITS.longTermSlots}\n`+items+'\n\n点随身牌可移动顺序。出售需要再次确认；调序不花金币。'+(this.lastTransactionNotes.length?'\n\n上次交易的实际来源：\n'+this.lastTransactionNotes.join('\n'):''),[{label:'本章节目',run:()=>this.inspectChapter()},{label:'物品与道具',run:()=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq))}]);
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
    const found=this.findOffer(id);if(!found||found.offer.consumed||this.busy)return;const {kind,offer:o}=found,seq=this.run.commandSeq;
    if(kind==='jokers')this.pcPages.jokers=Math.floor(this.run.shop!.offers.findIndex(o=>o.offerId===id)/3);
    if(kind==='tools'||kind==='items'){const pc=this.geometry().pc,group=kind==='tools'?pc?.toolOffers:pc?.itemOffers,capacity=pc?this.pcGroupCapacity(kind,this.geometry()):1;this.pcPages[kind]=Math.floor(this.shelfOffers(kind).findIndex(o=>o.offerId===id)/capacity);}
    this.selectedOfferId=id;this.notice='';this.audio.select();this.render();
    const price=r2PurchasePrice(this.run,o),after=this.run.gold-price,reason=this.purchaseReason(o),d=kind==='jokers'?this.jokerDefinition(o.definitionId):undefined,info=kind==='tools'?toolInfo(o.definitionId):kind==='items'?itemInfo(o.definitionId):undefined,ability=d?this.jokerCopy(d.id):undefined;
    const cap=r2InterestCap(this.run),afterState=kind==='jokers'?{...this.run,jokers:[...this.run.jokers,r2CreateJoker(o.definitionId,'preview/'+o.offerId,price,o.edition,this.run)]}:kind==='items'?{...this.run,longTermItems:[...this.run.longTermItems,o.definitionId]}:this.run,afterCap=r2InterestCap(afterState);
    const money=after<0?`现有 ${this.run.gold} 金，尚差 ${-after} 金。`:`余额 ${this.run.gold} → ${after} 金。\n过关利息档 ${Math.min(cap,Math.floor(this.run.gold/5))} → ${Math.min(afterCap,Math.floor(after/5))} 金。`;
    const discount=r2PurchaseDiscount(this.run),discountText=discount?`原价 ${o.price} 金，当前优惠 ${discount} 金，最低实付1金。\n${this.run.purchaseCoupons?'本次会使用1张减2金券。\n':''}`:'';
    const effect=d?(ability?'':d.description+r2JokerExtraHelp(d)+'\n')+'版次：'+editionEffectText(o.edition):kind==='tools'?(()=>{const tool=toolInfo(o.definitionId);return [tool.description,tool.cost,tool.risk,'购买后收入消耗品库存，使用时另选目标并确认额外代价。'].filter(Boolean).join('\n\n');})():info!.description;
    const inventory=kind==='jokers'?'当前构筑：'+(this.run.jokers.map(j=>this.jokerDefinition(j.definitionId).name).join('、')||'空'):kind==='tools'?`消耗品库存 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)}。购买不会自动使用或替换旧物。`:`长期道具 ${this.run.longTermItems.length}/${R2_LIMITS.longTermSlots}。同种不可重复、不可出售，持续到本局结束。`;
    const body=effect+`\n\n实际购买支付 ${price} 金\n`+discountText+money+'\n\n'+inventory+(reason?'\n\n无法购买：'+reason:'\n\n确认购买才会扣除金币。');
    const name=d?.name??(kind==='tools'?toolInfo(o.definitionId).label:info!.name),portrait=d?this.jokerPortrait(d.id):goodsArtPortrait(info!);
    const dialog=this.dialog.open(name+' · 购买详情',body,[{label:'确认购买',primary:true,disabled:!!reason,run:async()=>{if(await this.send({type:'BuyOffer',offerId:id},seq))this.dialog.close(dialog);}}],{closeLabel:'取消',portrait,rarity:d?.rarity,...(d?{artLoad:this.jokerArtStatus(d.id)}:info?.detailArtUrl?{artLoad:{status:goodsArtLoadState(this,o.definitionId).status,readStatus:()=>goodsArtLoadState(this,o.definitionId).status,retry:()=>retryGoodsArt(this,o.definitionId,info.artUrl,()=>{this.paintGoodsArt(goodsArtKey(o.definitionId));this.dialog.refreshArtLoad();})}}:{}),summaryBody:`实付 ${price} 金 · `+(after<0?`现有 ${this.run.gold} 金，差 ${-after} 金`:`余额 ${this.run.gold} → ${after} 金`)+(d?.id==='f04'&&after>=0?'\n购后余额仅供参考；+3 条件在每手开始时检查。':'')+(reason?'\n'+reason:''),effectBody:d?.description??effect,editionBody:ability?this.jokerEditionSummary(o.edition,d!.id):undefined,ability,collapseRules:true});
    if(d)this.attachJokerFallback(dialog,d.id);
  }
  private inspectJoker(id:string):void {
    const j=this.run.jokers.find(j=>j.instanceId===id);if(!j||this.busy)return;this.hideHoverPicture();const d=this.jokerDefinition(j.definitionId),index=this.run.jokers.indexOf(j),seq=this.run.commandSeq;
    const growth=r2JokerStateText(j,d),ability=this.jokerCopy(d.id,j);
    const dialog=this.dialog.open(d.name+' · 第 '+(index+1)+' 槽',(ability?'':d.description+r2JokerExtraHelp(d)+'\n')+'版次：'+editionEffectText(j.edition)+'\n\n当前实例：'+growth+`\n实际买价 ${j.paidPrice} 金；出售可得 ${salePrice(j.paidPrice)} 金。\n出售后余额 ${this.run.gold} → ${this.run.gold+salePrice(j.paidPrice)} 金。\n\n大丑牌按从左至右的顺序触发。`,[
      {label:'左移',disabled:!this.ready||index===0,run:async()=>{if(await this.reorder(index,index-1,seq)&&this.dialog.active(dialog))this.inspectJoker(id);}},
      {label:'右移',disabled:!this.ready||index===this.run.jokers.length-1,run:async()=>{if(await this.reorder(index,index+1,seq)&&this.dialog.active(dialog))this.inspectJoker(id);}},
      {label:'出售',disabled:!this.ready,run:()=>{const confirmation=this.dialog.open('出售确认',`出售第 ${index+1} 槽的「${d.name}」获得 ${salePrice(j.paidPrice)} 金币。\n余额 ${this.run.gold} → ${this.run.gold+salePrice(j.paidPrice)} 金。\n\n该牌成长将丢失，当前成长：${growth}。`,[{label:'确认出售',primary:true,run:async()=>{if(await this.send({type:'SellJoker',instanceId:id},seq))this.dialog.close(confirmation);}}],{closeLabel:'取消'});}},
    ],{portrait:this.jokerPortrait(d.id),rarity:d.rarity,artLoad:this.jokerArtStatus(d.id),editionBody:ability?this.jokerEditionSummary(j.edition,d.id):undefined,ability,collapseRules:!!ability});
    this.attachJokerFallback(dialog,d.id);
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
    if(this.pendingToolCue){
      const cue=this.pendingToolCue,box=this.geometry().items;this.pendingToolCue=undefined;if(!reduced)this.slotPop(box);
      lines.push({name:'tool-use/'+cue.instanceId,text:'已用 '+cue.label});
    }
    for(const event of this.pendingTransactions){
      const index=this.run.jokers.findIndex(joker=>joker.instanceId===event.instanceId),slot=this.geometry().slots[index];
      if(!reduced&&slot)this.slotPop(slot);
      lines.push({name:'transaction/'+event.instanceId,text:r2TransactionText(event,this.jokerDefinition(event.definitionId))});
    }this.pendingTransactions=[];
    if(lines.length){
      const p=this.geometry(),bottom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom'))||0,box=shopResultBox(p,this.view.layout.height,bottom),probe=this.view.text(0,0,'',14,PAPER_CSS.ink).setVisible(false);
      const pages=lines.flatMap(line=>shopResultPages(line.text,text=>{probe.setText(text);return probe.width<=box.width-12;}).map(text=>({...line,text})));probe.destroy();
      if(this.resultFeedback.enqueue(this.run.commandSeq,pages,performance.now()))this.drawResultCue();
    }
  }
  private async send(action:Action,expectedSeq?:number):Promise<boolean> {
    if(!this.ready)return false;
    const previous=this.run,oldGold=previous.gold;this.busy=true;const lifecycle=this.lifecycle;
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
        else this.dialog.open('操作未提交',({'slots-full':'五个槽位已满，请先出售一张。','not-enough-gold':'金币不足；本次操作没有扣款。','already-owned':'已装备同名牌。','no-reroll-candidates':'没有可换入的卡牌。','stale-sequence':'本局在预览后已变化，请重新打开详情确认；没有消耗物品或金币。','replacement-pending':'新局或导入尚未保存，请在菜单重试、导出或取消候选。'} as Record<string,string>)[result.code]??'本次操作未提交，原选择和资源仍然保留。');
        return false;
      }
      this.run=result.state;
      const transactions=result.events.filter((event):event is Extract<DomainEvent,{type:'joker-transaction'}>=>event.type==='joker-transaction');
      if(!result.duplicate&&transactions.length){this.pendingTransactions=transactions;this.lastTransactionNotes=transactions.map(event=>r2TransactionText(event,this.jokerDefinition(event.definitionId)));}
      if(action.type==='BuyOffer'&&purchase&&!result.duplicate){
        const {kind,offer}=purchase,name=kind==='jokers'?this.jokerDefinition(offer.definitionId).name:kind==='tools'?toolInfo(offer.definitionId).name:itemInfo(offer.definitionId).name;this.audio.purchase();
        this.notice=`已买 ${name} · 金币 ${oldGold} → ${this.run.gold}`;
        this.pendingGoldRoll=oldGold;
        if(buyBox&&landSlot)this.pendingPurchaseFlight={from:buyBox,to:landSlot,name};
      }else if(action.type==='SellJoker'&&!result.duplicate){
        const joker=previous.jokers.find(j=>j.instanceId===action.instanceId)!;this.audio.sale();
        this.notice=`已售 ${this.jokerDefinition(joker.definitionId).name} · 金币 ${oldGold} → ${this.run.gold}`;
        this.pendingGoldRoll=oldGold;
      }else if(action.type==='RerollShop'&&!result.duplicate){this.selectedOfferId=undefined;this.audio.reroll();this.notice=`大丑牌与工具已更新 · 道具保留 · 金币 ${oldGold} → ${this.run.gold}`;this.pendingGoldRoll=oldGold;this.pendingRerollFlip=this.shelfKind!=='items';}
      else if(action.type==='ReorderJokers'){this.audio.select();this.notice='顺序已保存 · 从左至右触发';}
      else if(action.type==='ChooseProgram'||action.type==='AbandonProgram'){this.audio.select();this.notice=programStatus(this.run);}
      else if((action.type==='UseConsumable'||action.type==='DestroyConsumable')&&!result.duplicate){
        const item=previous.consumables.find(row=>row.instanceId===action.instanceId),used=result.events.find((event):event is Extract<DomainEvent,{type:'consumable-used'}>=>event.type==='consumable-used');
        if(used){const info=toolInfo(used.definitionId);this.audio.toolUse(info.family);this.pendingToolCue={instanceId:used.instanceId,label:info.label};}else this.audio.select();
        this.notice=(action.type==='UseConsumable'?'已使用 ':'已销毁 ')+(item?toolInfo(item.definitionId).name:'物品')+` · 库存 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)}`+(oldGold!==this.run.gold?` · 金币 ${oldGold} → ${this.run.gold}`:'');
        if(oldGold!==this.run.gold)this.pendingGoldRoll=oldGold;
        if(previous.shop!.rerollCount!==this.run.shop!.rerollCount){this.selectedOfferId=undefined;this.audio.reroll();this.pendingRerollFlip=this.shelfKind!=='items';}
      }
      if(action.type==='LeaveShop'){this.audio.select();this.scene.start('game');}
      else if(action.type==='SkipStage'){
        const s=this.run.stage!;this.scene.start('intermission',{cleared:true,stageIndex:s.index,stageHeat:s.heat,handsLeft:s.handsLeft,goldEarned:s.goldEarned} satisfies IntermissionResult);
      }
      return true;
    }finally {if(lifecycle===this.lifecycle){this.busy=false;if(this.scene.isActive()&&this.run.phase==='shop'){this.render();this.afterRenderFx();}}}
  }
}
