import Phaser from 'phaser';
import {AudioEngine} from '../audio/AudioEngine';
import {getR2Joker,r2PaidRerollPrice,salePrice,r2Pool,r2PurchasePrice,r2PurchaseDiscount,r2ToolAcquisitionPool,type R2Offer} from '../domain/r2Shop';
import type {R2RunState,Action,DomainEvent} from '../domain/run';
import {getR2Stage,R2_LIMITS,r2InterestCap,r2ConsumableCapacity,r2CreateJoker} from '../domain/r2Run';
import {dispatchRun,runController} from './runAdapter';
import {heatText} from './scoreText';
import {toolInfo,itemInfo,editionLabel,editionEffectText,toolFamilyLabel} from './r2ToolInfo';
import {SceneView} from './SceneView';
import {DetailDialog} from './DetailDialog';
import {gameSession} from './session';
import {r2BossText} from '../domain/r2Chapter';
import {SKIP_ITEM_LABELS,showConsumables} from './ConsumableDialog';
import type {IntermissionResult} from './IntermissionScene';
import type {Box} from './layout';
import {jokerArtKey,jokerArtUrl} from './jokerArt';
import {UI_FONT} from './theme';
import {drawJokerMotif} from './JokerMotif';
import {R2_OFFER_USE as OFFER_USE,r2MechanismBadge as mechanismBadge,r2JokerValue,r2JokerStateText,r2JokerExtraHelp,r2TransactionText} from './r2Help';

const RARITY_LABEL={common:'普通',uncommon:'特别',rare:'稀有'} as const;
type ShelfKind='jokers'|'tools'|'items';
const SHELF_FIELDS={jokers:'offers',tools:'toolOffers',items:'itemOffers'} as const;
function shopLayout(width:number,height:number,top:number,bottom:number,cols:number){
  const portrait=width<700&&height>width,short=height<500,wideHeader=width>=1000&&!short,compact=portrait&&height-bottom-top<760,w=Math.min(1180,width-24),x=(width-w)/2;
  if(portrait){
    const slotY=top+78,slotHeight=compact?72:88,slotWidth=Math.min(64,(w-32)/5),groupWidth=slotWidth*5+32,slotX=x+(w-groupWidth)/2;
    const slots:Box[]=Array.from({length:5},(_,i)=>({x:slotX+i*(slotWidth+8),y:slotY,width:slotWidth,height:slotHeight}));
    const toolsY=slotY+slotHeight+18,toolWidth=(w-8)/2,shelfTop=toolsY+104,secondaryY=height-bottom-148,availableWidth=(w-10*(cols-1))/cols,cardWidth=cols<3?Math.min(340,availableWidth):availableWidth,cardHeight=Math.min(280,secondaryY-16-shelfTop),shelfX=x+(w-cardWidth*cols-10*(cols-1))/2;
    const shelf:Box[]=Array.from({length:cols},(_,i)=>({x:shelfX+i*(cardWidth+10),y:shelfTop,width:cardWidth,height:cardHeight}));
    return {x,w,top,short,compact,wideHeader,portrait,slots,chapter:{x,y:toolsY,width:toolWidth,height:44},items:{x:x+toolWidth+8,y:toolsY,width:toolWidth,height:44},shelf,tabs:{x,y:shelfTop-52,width:w,height:44},
      reroll:{x,y:secondaryY,width:toolWidth,height:44},build:{x:x+toolWidth+8,y:secondaryY,width:toolWidth,height:44},play:{x,y:secondaryY+52,width:w,height:48},noticeY:secondaryY+108};
  }
  const footerY=height-bottom-(short?84:104),slotY=top+(short?58:wideHeader?64:compact?88:112),slotHeight=short?72:compact?72:portrait||wideHeader?112:128,slotWidth=Math.min(short?48:86,(w-32)/5),slotGroupWidth=slotWidth*5+32;
  const slotX=short?x:wideHeader?x+w-slotGroupWidth:x+(w-slotGroupWidth)/2;
  const slots:Box[]=Array.from({length:5},(_,i)=>({x:slotX+i*(slotWidth+8),y:slotY,width:slotWidth,height:slotHeight}));
  const toolsY=slotY+slotHeight+26,toolWidth=short?(slotGroupWidth-8)/2:(w-8)/2;
  let chapter:Box={x,y:toolsY,width:toolWidth,height:44},items:Box={x:x+toolWidth+8,y:toolsY,width:toolWidth,height:44};
  if(wideHeader){const available=slotX-x-24,width=(available-8)/2;chapter={x,y:top+108,width,height:44};items={...chapter,x:x+width+8};}
  const shelfX=short?x+slotGroupWidth+24:x,shelfWidth=short?w-slotGroupWidth-24:w;
  const shelfTop=short?top+92:wideHeader?slotY+slotHeight+84:toolsY+104,gap=12;
  const availableWidth=(shelfWidth-gap*(cols-1))/cols,cardWidth=cols<3?Math.min(340,availableWidth):availableWidth,cardHeight=footerY-36-shelfTop,startX=shelfX+(shelfWidth-cardWidth*cols-gap*(cols-1))/2;
  const shelf:Box[]=Array.from({length:cols},(_,i)=>({x:startX+i*(cardWidth+gap),y:shelfTop,width:cardWidth,height:cardHeight}));
  const rerollWidth=Math.floor(w*.29),buildWidth=Math.floor(w*.25),playWidth=w-rerollWidth-buildWidth-16;
  return {x,w,top,short,compact,wideHeader,portrait,slots,chapter,items,shelf,tabs:{x:shelfX,y:shelfTop-52,width:shelfWidth,height:44},reroll:{x,y:footerY,width:rerollWidth,height:48},play:{x:x+rerollWidth+8,y:footerY,width:playWidth,height:48},build:{x:x+w-buildWidth,y:footerY,width:buildWidth,height:48},noticeY:footerY+56};
}

export class ShopScene extends Phaser.Scene {
  private run!:R2RunState;
  private busy=false;
  private lifecycle=0;
  private selectedOfferId?:string;
  private shelfKind:ShelfKind='jokers';
  private shelfPage=0;
  private artRefreshListeners=new Map<string,()=>void>();
  private artTargets=new Map<string,{holder:Phaser.GameObjects.Container;box:Box;alpha:number}>();
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
  private readonly dialog=new DetailDialog();
  private readonly audio=AudioEngine.shared;
  constructor(){super('shop');}
  private get ready():boolean {const session=gameSession();return this.run?.phase==='shop'&&!this.busy&&runController(this)?.status==='idle'&&session.lease.writable&&!session.pendingRun&&!session.working;}
  private shelfOffers(kind=this.shelfKind):R2Offer[]{return this.run.shop![SHELF_FIELDS[kind]];}
  private get pageSize():number{return this.view.layout.width<700?3:4;}
  private visibleOffers():R2Offer[]{return this.shelfOffers().slice(this.shelfPage*this.pageSize,(this.shelfPage+1)*this.pageSize);}
  private geometry(){const l=this.view.layout,bottom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom'))||0,cols=this.shelfKind==='jokers'?Math.max(3,Math.min(this.pageSize,this.shelfOffers().length)):Math.max(1,Math.min(2,this.shelfOffers().length));return shopLayout(l.width,l.height,l.hud.y,bottom,cols);}
  create():void {
    this.busy=false;this.selectedOfferId=undefined;this.shelfKind='jokers';this.shelfPage=0;this.notice='';this.lifecycle++;
    this.pendingGoldRoll=undefined;this.pendingRerollFlip=false;this.pendingPurchaseFlight=undefined;this.pendingToolCue=undefined;this.pendingTransactions=[];this.lastTransactionNotes=[];
    this.events.once('shutdown',()=>{this.lifecycle++;this.hideHoverPicture();this.dialog.close();for(const [key,listener] of this.artRefreshListeners)this.textures.off('addtexture-'+key,listener);this.artRefreshListeners.clear();this.artTargets.clear();});
    const run=runController(this)?.state;if(!run||run.phase!=='shop'){this.scene.start('character-select');return;}this.run=run;
    this.cameras.main.setBackgroundColor('#153c40');this.audio.setScene('shop');this.view=new SceneView(this,()=>this.render());this.render();
    if(!gameSession().reducedMotion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      this.view.root.setAlpha(.35);this.tweens.add({targets:this.view.root,alpha:1,duration:220,ease:'Cubic.easeOut'});
      this.offerArts.forEach((art,i)=>{const ty=art.y;art.setPosition(art.x,ty+26).setAlpha(0);this.tweens.add({targets:art,y:ty,alpha:1,duration:260,delay:110+i*70,ease:'Cubic.easeOut'});});
    }
  }
  private render():void {
    const selectedIndex=this.shelfOffers().findIndex(offer=>offer.offerId===this.selectedOfferId);if(selectedIndex>=0)this.shelfPage=Math.floor(selectedIndex/this.pageSize);
    this.shelfPage=Math.min(this.shelfPage,Math.max(0,Math.ceil(this.shelfOffers().length/this.pageSize)-1));
    const v=this.view,p=this.geometry(),stage=getR2Stage(this.run.stageIndex)!;this.hideHoverPicture();v.clear();v.paperBackground();this.offerArts=[];this.artTargets.clear();
    v.text(p.x,p.top,this.view.layout.width<350?'商店':'后台商店',p.short||p.portrait?24:28,'#fff2da').setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold');
    const purse={x:p.x+p.w-(this.view.layout.width<=700?96:136)-124,y:p.top-1,width:116,height:34},purseArt=this.add.graphics();
    v.add(this.add.graphics().fillStyle(0x213d45,.2).fillRoundedRect(purse.x+1,purse.y+3,purse.width,purse.height,7));
    v.material(purse,0xfbe1a6,0xc99455,7);
    purseArt.lineStyle(1,0x916738).strokeRoundedRect(purse.x+.5,purse.y+.5,purse.width-1,purse.height-1,7);v.add(purseArt);
    const gold=v.text(purse.x+10,purse.y+5,'金币 '+this.run.gold,22,'#614321').setName('shop/gold').setFontStyle('bold');
    for(let font=22;gold.width>purse.width-20&&font>14;)gold.setFontSize(--font);
    this.goldText=gold;
    v.text(p.x,p.top+37,`${stage.name} · 目标 ${heatText(stage.targetHeat)}`,14,'#d5ddc9',p.short?p.slots[4].x+p.slots[4].width-p.x:p.w-24);
    if(!p.short){
      if(!p.compact&&!p.portrait)v.text(p.x,p.top+64,this.run.stageIndex===0?'点卡牌看大图与效果，再确认购买。':'补一张、卖一张，或留着金币赚利息。',14,'#d5ddc9',p.wideHeader?p.slots[0].x-p.x-24:p.w);
      const ownedLabel=p.portrait?`随身牌 ${this.run.jokers.length} / ${R2_LIMITS.jokerSlots}`:`随身大丑牌 ${this.run.jokers.length} / ${R2_LIMITS.jokerSlots} · 点牌可出售或调序`;
      v.text(p.wideHeader?p.slots[0].x:p.x,p.slots[0].y-22,ownedLabel,14,'#d7ddc8',p.wideHeader?p.slots[4].x+p.slots[4].width-p.slots[0].x:p.w);
    }
    this.run.jokers.forEach((j,i)=>{
      const b=p.slots[i],d=getR2Joker(j.definitionId),first=v.root.length;
      this.drawSlot(b,true,d.rarity);
      const ownedName=v.text(b.x+(p.compact?2:5),b.y+5,d.name,14,'#203744',b.width-(p.compact?4:10)).setStyle({maxLines:2}).setFontStyle('bold');
      const pictureY=ownedName.y+ownedName.height+4,pictureSize=Math.max(6,Math.min(b.width-12,b.y+b.height-27-pictureY));
      this.drawJokerPicture(j.definitionId,{x:b.x+(b.width-pictureSize)/2,y:pictureY,width:pictureSize,height:pictureSize});
      if(j.edition&&j.edition!=='none')v.text(b.x+4,b.y+b.height-39,editionLabel(j.edition),14,'#ffe5b0').setFontStyle('bold').setShadow(0,1,'#17323c',2,true,true);
      const value=r2JokerValue(j,{gold:this.run.gold,jokerCount:this.run.jokers.length,jokerSlots:R2_LIMITS.jokerSlots,deckSize:this.run.deckInstances.length-this.run.destroyedIds.length});
      v.text(b.x+b.width/2,b.y+b.height-22,value.replace(' 金','金'),14,'#fff0d0').setOrigin(.5,0).setFontStyle('bold');
      v.text(b.x+b.width/2,b.y+b.height+4,`售${salePrice(j.paidPrice)}金`,14,'#ecd6a4').setOrigin(.5,0);
      v.add(this.add.circle(b.x+b.width-11,b.y+b.height-34,8,0xe8c180).setStrokeStyle(1,0x765532));
      v.text(b.x+b.width-11,b.y+b.height-34,String(i+1),14,'#4b3825').setOrigin(.5);
      const hover=this.hoverCard(first,b,j.definitionId),r=v.rect({...b,height:b.height+22}).setFillStyle(0,0).setStrokeStyle(0);
      v.target(r,`joker/${j.instanceId}`,{tap:()=>this.inspectJoker(j.instanceId),detail:()=>this.inspectJoker(j.instanceId),drag:(x)=>this.moveJoker(j.instanceId,x),holdToDrag:true,...hover});
    });
    for(let i=this.run.jokers.length;i<R2_LIMITS.jokerSlots;i++){
      const b=p.slots[i];this.drawSlot(b,false);v.text(b.x+b.width/2,b.y+b.height-21,p.portrait?String(i+1):`空槽 ${i+1}`,14,'#a6bab0').setOrigin(.5,0);
    }
    v.button(p.chapter,p.portrait?'本章':'本章节目','action/chapter',()=>this.inspectChapter());
    v.button(p.items,`物品 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)} · 道具${this.run.longTermItems.length}`,'action/items',()=>showConsumables(this.dialog,this.run,this.ready,(a,seq)=>this.send(a,seq)));
    this.drawShelfTabs(p.tabs);
    const offers=this.visibleOffers();
    offers.forEach((o,i)=>{
      if(this.shelfKind!=='jokers'){this.drawGoodsOffer(o,p.shelf[i],p.short,p.portrait);return;}
      const selected=this.selectedOfferId===o.offerId,raw=p.shelf[i],b=selected?{...raw,y:raw.y-4}:raw,d=getR2Joker(o.definitionId),first=v.root.length;
      const headerHeight=p.portrait?32:p.short?28:36,footerHeight=p.portrait?56:p.short?48:64;
      this.drawOfferCard(b,d.rarity,selected,o.consumed,p.short,headerHeight,footerHeight);
      const nameSize=p.portrait?18:p.short?20:22,name=v.text(b.x+(p.portrait?8:10),b.y+5,d.name,nameSize,o.consumed?'#c6c5af':'#fff2d4').setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold').setShadow(0,1,'#12282e',1,true,true);
      for(let font=nameSize;name.width>b.width-16&&font>(p.portrait?18:14);)name.setFontSize(--font);
      const hasEdition=o.edition&&o.edition!=='none',editionHeight=hasEdition?18:0,bodyTop=b.y+headerHeight+(p.short?4:8)+editionHeight,bodyHeight=b.height-headerHeight-footerHeight-(p.short?8:16)-editionHeight,reason=o.consumed?'':this.purchaseReason(o,true);
      if(hasEdition)v.text(b.x+b.width/2,b.y+headerHeight+3,editionLabel(o.edition),14,'#836136').setOrigin(.5,0).setFontStyle('bold');
      const use=p.portrait||p.short?OFFER_USE[d.id]??'查看用途详情':d.description;
      const description=v.text(b.x+(p.portrait?8:12),bodyTop,use+(p.portrait&&reason?'\n'+reason:''),14,o.consumed?'#686e65':'#203744',b.width-(p.portrait?16:24)).setLineSpacing(2);
      const aspect=this.jokerAspect(o.definitionId),pictureWidth=Math.max(0,Math.min(280,b.width-(p.portrait?12:24),Math.max(0,bodyHeight-description.height-10)*aspect)),pictureHeight=pictureWidth/aspect;
      if(pictureWidth>0)this.drawJokerPicture(o.definitionId,{x:b.x+(b.width-pictureWidth)/2,y:bodyTop,width:pictureWidth,height:pictureHeight},o.consumed ? .55 : 1);
      description.y=bodyTop+pictureHeight+(pictureHeight?8:0);
      const readableHeight=b.y+b.height-footerHeight-8-description.y;
      if(description.height>readableHeight)description.setStyle({maxLines:Math.max(1,Math.floor((readableHeight+2)/19))});
      this.drawRarityBadge({x:p.portrait?b.x+(b.width-64)/2:b.x+b.width-72,y:p.portrait?b.y+b.height-24:b.y+b.height-footerHeight+6,width:64,height:22},d.rarity);
      if(o.consumed){
        v.text(b.x+8,b.y+b.height-footerHeight+6,p.portrait||p.short?'✓ 已买':'✓ 已收入构筑',14,'#d3e9cb',b.width-(p.portrait?16:88)).setFontStyle('bold');return;
      }
      const price=r2PurchasePrice(this.run,o);
      const priceText=v.text(b.x+8,b.y+b.height-footerHeight+5,`${price} 金`,p.portrait?22:20,'#f6d28c',b.width-(p.portrait?16:80)).setFontStyle('bold').setShadow(0,1,'#132931',1,true,true);
      const availability=reason||'可购买',status=(selected?'✓ 已选 · ':'')+availability;
      if(!p.portrait)v.text(b.x+8,priceText.y+priceText.height+1,b.width<220?availability:status,14,reason?'#ffc6a4':'#d3e9cb',b.width-16).setStyle({maxLines:p.short?1:2});
      const hover=this.hoverCard(first,b,o.definitionId),r=v.rect(raw).setFillStyle(0,0).setStrokeStyle(0).setData('selected',selected);
      this.offerArts.push(hover.art);
      v.target(r,`offer/${o.offerId}`,{tap:()=>this.inspectOffer(o.offerId),detail:()=>this.inspectOffer(o.offerId),...hover});
    });
    if(!offers.length)v.text(p.shelf[0].x,p.shelf[0].y,this.shelfKind==='items'?'本店暂无可购道具；换牌会保留此货架。':'本货架暂无商品，可换一批或进入牌桌。',14,'#d5ddc9',p.w);
    const cost=r2PaidRerollPrice(this.run),canReroll=this.ready&&this.run.gold>=cost&&r2Pool(this.run.jokers.map(j=>j.definitionId),this.run.safetyNetUsed?['f07']:[]).length>0;
    v.button(p.reroll,`换牌 ${cost} 金`,'action/reroll',()=>void this.send({type:'RerollShop'}),canReroll);
    v.button(p.play,'进入牌桌','action/start-stage',()=>void this.send({type:'LeaveShop'}),this.ready,true);
    v.button(p.build,'构筑详情','action/build',()=>this.inspectBuild());
    const reason=!this.ready?'当前进度未保存或只读，请查看菜单。':this.run.gold<cost?`换牌还差 ${cost-this.run.gold} 金。可直接入场。`:this.shelfKind==='jokers'&&this.run.jokers.length===5?'五槽已满，点随身牌出售后再买。':this.shelfKind==='tools'?'购买后收入库存；查看详情，再确认使用。':this.shelfKind==='items'?'道具本局生效；换牌不重抽道具货架。':p.portrait?'点卡牌看详情，确认后扣款。':'点卡牌不会扣钱；点随身牌可出售或左移、右移。';
    v.text(p.x,p.noticeY,this.busy?'正在保存…':this.notice||reason,14,this.notice?'#f4da9e':'#d5ddc9',p.w).setStyle({maxLines:p.short?1:2});
  }
  private drawShelfTabs(b:Box):void {
    const v=this.view,pages=Math.ceil(this.shelfOffers().length/this.pageSize),pagerWidth=pages>1?44:0,gap=6,width=(b.width-pagerWidth-gap*(pagerWidth?3:2))/3;
    const labels:Record<ShelfKind,string>={jokers:'大丑牌',tools:'工具',items:'道具'};
    (['jokers','tools','items'] as const).forEach((kind,i)=>{
      const button=v.button({x:b.x+i*(width+gap),y:b.y,width,height:b.height},labels[kind]+' '+this.shelfOffers(kind).length,'action/shelf-'+kind,()=>{
        if(this.busy)return;this.shelfKind=kind;this.shelfPage=0;this.selectedOfferId=undefined;this.audio.select();this.render();
      },!this.busy,this.shelfKind===kind);
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
  private drawGoodsArt(id:string,url:string,b:Box,alpha=1):void {
    const key='goods-motif/'+id,holder=this.view.add(this.add.container(b.x+b.width/2,b.y+b.height/2));this.artTargets.set(key,{holder,box:b,alpha});
    if(this.textures.exists(key)){this.paintGoodsArt(key);return;}
    holder.add(this.view.text(0,0,this.shelfKind==='tools'?'工具':'道具',18,'#85784f').setOrigin(.5));
    if(this.artRefreshListeners.has(key))return;
    const lifecycle=this.lifecycle,loaded=()=>{this.artRefreshListeners.delete(key);if(lifecycle===this.lifecycle&&this.scene.isActive())this.paintGoodsArt(key);};
    this.artRefreshListeners.set(key,loaded);this.textures.once('addtexture-'+key,loaded);this.textures.addBase64(key,url);
  }
  private paintGoodsArt(key:string):void {
    const target=this.artTargets.get(key);if(!target?.holder.active)return;
    const image=this.add.image(0,0,key),scale=Math.min(target.box.width/image.width,target.box.height/image.height);
    target.holder.removeAll(true);target.holder.add(image.setScale(scale).setAlpha(target.alpha));
  }
  private drawGoodsOffer(o:R2Offer,raw:Box,short:boolean,portrait:boolean):void {
    const v=this.view,selected=this.selectedOfferId===o.offerId,b=selected?{...raw,y:raw.y-4}:raw,isTool=this.shelfKind==='tools',info=isTool?toolInfo(o.definitionId):itemInfo(o.definitionId),first=v.root.length;
    const family=isTool?toolFamilyLabel(toolInfo(o.definitionId).family):'长期道具',headerHeight=short?28:36,footerHeight=short?48:64;
    this.drawOfferCard(b,isTool?'uncommon':'common',selected,o.consumed,short,headerHeight,footerHeight);
    const name=v.text(b.x+10,b.y+5,info.name,short?20:22,o.consumed?'#c6c5af':'#fff2d4',b.width-20).setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold').setShadow(0,1,'#12282e',1,true,true);
    for(let font=short?20:22;name.width>b.width-20&&font>14;)name.setFontSize(--font);
    const bodyTop=b.y+headerHeight+8,bodyHeight=b.height-headerHeight-footerHeight-16;
    const description=v.text(b.x+12,bodyTop,info.description.split('\n')[0],14,o.consumed?'#686e65':'#203744',b.width-24).setLineSpacing(2).setStyle({maxLines:short?1:3});
    const pictureSize=Math.max(0,Math.min(180,b.width-24,bodyHeight-description.height-8));
    if(pictureSize>0)this.drawGoodsArt(o.definitionId,info.artUrl,{x:b.x+(b.width-pictureSize)/2,y:bodyTop,width:pictureSize,height:pictureSize},o.consumed ? .55 : 1);
    description.y=bodyTop+pictureSize+(pictureSize?8:0);
    const readableHeight=b.y+b.height-footerHeight-6-description.y;if(description.height>readableHeight)description.setStyle({maxLines:Math.max(1,Math.floor((readableHeight+2)/19))});
    v.text(b.x+b.width-10,b.y+b.height-footerHeight+8,family,14,'#ecd6a4').setOrigin(1,0).setFontStyle('bold');
    if(o.consumed){v.text(b.x+10,b.y+b.height-footerHeight+8,'✓ 已买',14,'#d3e9cb').setFontStyle('bold');return;}
    const reason=this.purchaseReason(o,true),price=r2PurchasePrice(this.run,o);
    const priceText=v.text(b.x+10,b.y+b.height-footerHeight+6,price+' 金',portrait?22:20,'#f6d28c').setFontStyle('bold');
    v.text(b.x+10,priceText.y+priceText.height+2,reason||(isTool?'购买后收入库存':'本局生效'),14,reason?'#ffc6a4':'#d3e9cb',b.width-20).setStyle({maxLines:1});
    const hover=this.hoverCard(first,b),r=v.rect(raw).setFillStyle(0,0).setStrokeStyle(0).setData('selected',selected);this.offerArts.push(hover.art);
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
    const glow=this.add.graphics().lineStyle(3,0xffe2a1,.92).strokeRoundedRect(-b.width/2-1,-b.height/2-1,b.width+2,b.height+2,6).setAlpha(0);art.add(glow);
    const reduced=()=>gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const leave=()=>{
      this.hideHoverPicture();if(!art.active)return;this.tweens.killTweensOf(art);glow.setAlpha(0);
      if(reduced())art.setPosition(cx,cy).setScale(1).setAngle(0);
      else this.tweens.add({targets:art,x:cx,y:cy,angle:0,scaleX:1,scaleY:1,duration:110,ease:'Sine.easeOut'});
    };
    art.once('destroy',()=>this.tweens.killTweensOf(art));
    return {enter:()=>{
      if(!art.active||!this.scene.isActive())return;this.hideHoverPicture();this.tweens.killTweensOf(art);glow.setAlpha(1);v.root.bringToTop(art);
      if(!reduced())this.tweens.add({targets:art,y:cy-6,angle:cx>this.view.layout.width/2?-1.6:1.6,scaleX:1.03,scaleY:1.03,duration:130,ease:'Sine.easeOut'});
      if(definitionId)this.hoverDelay=this.time.delayedCall(280,()=>{this.hoverDelay=undefined;if(art.active&&this.scene.isActive()&&!document.querySelector('dialog[open]'))this.showHoverPicture(definitionId,b);});
    },leave,art};
  }
  private hideHoverPicture():void {
    this.hoverDelay?.remove(false);this.hoverDelay=undefined;
    this.hoverPreview?.destroy();this.hoverPreview=undefined;
  }
  /** A mouse-only, read-only enlargement; it never owns a hit area or opens a modal. */
  private showHoverPicture(definitionId:string,source:Box):void {
    const v=this.view,p=this.geometry(),top=p.top+54,bottom=Math.min(p.reroll.y,p.build.y,p.play.y)-12,room=bottom-top;
    if(room<180)return;
    const aspect=this.jokerAspect(definitionId),artHeight=Math.min(360,room-64,(Math.min(304,v.layout.width-48)-24)/aspect),artWidth=artHeight*aspect,width=artWidth+24,height=artHeight+64;
    const preferred=source.x+source.width+16+width<=v.layout.width-12?source.x+source.width+16:source.x-width-16;
    const x=Phaser.Math.Clamp(preferred,12,v.layout.width-width-12),y=Phaser.Math.Clamp(source.y,top,bottom-height),first=v.root.length,d=getR2Joker(definitionId);
    v.add(this.add.graphics().fillStyle(0x061d27,.5).fillRoundedRect(x+3,y+7,width,height,8));
    v.material({x,y,width,height},0xfff7e4,0xe6d0a6,8);
    v.text(x+12,y+7,d.name,18,'#203744',width-24).setFontStyle('bold');
    this.drawJokerPicture(definitionId,{x:x+12,y:y+34,width:artWidth,height:artHeight});
    this.drawRarityBadge({x:x+(width-64)/2,y:y+height-26,width:64,height:22},d.rarity);
    const preview=this.add.container();
    for(const child of v.root.list.slice(first))preview.add(child);
    this.hoverPreview=v.add(preview);v.root.bringToTop(preview);
    preview.once('destroy',()=>{if(this.hoverPreview===preview)this.hoverPreview=undefined;});
  }
  private jokerAspect(definitionId:string):number {
    const key=jokerArtKey(definitionId);if(!key||!this.textures.exists(key))return 1;
    const source=this.textures.get(key).getSourceImage();return source.width/source.height;
  }
  /** Three real rarity tiers, distinguished by a printed circle, diamond or star. */
  private drawRarityBadge(b:Box,rarity:keyof typeof RARITY_LABEL):void {
    const ink=rarity==='rare'?0x7d3040:rarity==='uncommon'?0x205e54:0x58452b,paper=rarity==='rare'?0xefcccd:rarity==='uncommon'?0xdcebe1:0xeadebe,g=this.add.graphics(),cx=b.x+11,cy=b.y+b.height/2;
    this.view.material(b,paper,paper,3);
    g.lineStyle(1,ink,.8).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,3);
    if(rarity==='common'){
      g.lineStyle(1.5,ink).strokeCircle(cx,cy,4);
      g.lineStyle(1,ink).beginPath().moveTo(cx-3,cy).lineTo(cx+3,cy).strokePath();
    }else if(rarity==='uncommon'){
      g.fillStyle(ink).fillTriangle(cx-5,cy,cx,cy-5,cx+5,cy).fillTriangle(cx-5,cy,cx,cy+5,cx+5,cy);
      g.lineStyle(1,ink,.6).beginPath().moveTo(cx-7,cy+4).lineTo(cx-4,cy+7).moveTo(cx+4,cy-7).lineTo(cx+7,cy-4).strokePath();
    }else {
      const points=Array.from({length:10},(_,i)=>{const angle=-Math.PI/2+i*Math.PI/5,r=i%2?2.5:5.5;return {x:cx+Math.cos(angle)*r,y:cy+Math.sin(angle)*r};});
      g.fillStyle(ink).fillPoints(points,true);
    }
    this.view.add(g);this.view.text(b.x+23,b.y+(b.height-17)/2,RARITY_LABEL[rarity],14,'#'+ink.toString(16).padStart(6,'0')).setFontStyle('bold');
  }
  private jokerPortrait(definitionId:string):{url:string;alt:string;layout:'card'}|undefined {
    const key=jokerArtKey(definitionId),url=jokerArtUrl(definitionId);
    return key&&url&&this.textures.exists(key)?{url,alt:getR2Joker(definitionId).name+'的卡牌插画',layout:'card'}:undefined;
  }
  private attachJokerFallback(dialog:HTMLDialogElement,definitionId:string):void {
    if(this.jokerPortrait(definitionId))return;
    const face=this.add.container(),paper=this.add.graphics().fillStyle(0xfff7e5).fillRoundedRect(0,0,240,336,10).lineStyle(3,0xb69866).strokeRoundedRect(2,2,236,332,10);
    face.add([paper,this.add.text(120,14,getR2Joker(definitionId).name,{fontFamily:UI_FONT,fontSize:'20px',color:'#203744'}).setOrigin(.5,0),this.add.text(120,302,'机制示意',{fontFamily:UI_FONT,fontSize:'14px',color:'#48685f'}).setOrigin(.5,0)]);
    drawJokerMotif(this,face,definitionId,120,166,192);
    const image=this.add.renderTexture(0,0,240,336).setVisible(false);image.draw(face);face.destroy();
    image.snapshot(snapshot=>{if(snapshot instanceof HTMLImageElement)this.dialog.attachCardArt(dialog,snapshot.src,getR2Joker(definitionId).name+'机制示意卡面');image.destroy();});
  }
  private drawSlot(b:Box,occupied:boolean,rarity:keyof typeof RARITY_LABEL='common'):void {
    const v=this.view,g=this.add.graphics(),edge=rarity==='rare'?0x9e5661:rarity==='uncommon'?0x367f75:0xb39868;
    if(!occupied){
      v.material(b,0x28494c,0x193940,5);
      if(this.textures.exists('p00-card-back'))v.add(this.add.image(b.x+b.width/2,b.y+b.height/2,'p00-card-back').setDisplaySize(b.width-4,b.height-4).setTint(0x9fb8ad).setAlpha(.16));
      else g.lineStyle(1,0x6b8b80,.3).strokeRect(b.x+8,b.y+10,b.width-16,b.height-32);
      g.lineStyle(1,0x769487,.35).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,5);v.add(g);return;
    }
    v.add(this.add.graphics().fillStyle(0x263d40,.2).fillRoundedRect(b.x+2,b.y+4,b.width,b.height,5));
    v.material({...b,x:b.x-1,y:b.y-1},0xfaf1db,0xc8af85,5);
    v.material(b,0xfff6e2,0xe2cda6,5);
    v.material({x:b.x+2,y:b.y+b.height-25,width:b.width-4,height:23},0x426a62,0x203e49,3);
    g.lineStyle(1.5,edge).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,5);
    g.lineStyle(1,0xc5ab74).beginPath().moveTo(b.x+6,b.y+b.height-25).lineTo(b.x+b.width-6,b.y+b.height-25).strokePath();v.add(g);
  }
  private drawJokerPicture(definitionId:string,b:Box,alpha=1):void {
    const v=this.view,d=getR2Joker(definitionId),badge=mechanismBadge(d),key=jokerArtKey(definitionId),g=this.add.graphics();
    v.material(b,badge.paper,0xcbb591,3).setAlpha(alpha);
    if(key&&this.textures.exists(key)){
      const picture=this.add.image(b.x+b.width/2,b.y+b.height/2,key),scale=Math.min((b.width-4)/picture.width,(b.height-4)/picture.height);
      v.add(picture.setScale(scale).setAlpha(alpha));
    }else {
      const motif=this.add.container(b.x+b.width/2,b.y+b.height/2).setAlpha(alpha);v.add(motif);
      drawJokerMotif(this,motif,definitionId,0,0,Math.min(b.width,b.height)*.88);
    }
    g.lineStyle(1,0xa69778,.45).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,3);v.add(g.setAlpha(alpha));
  }
  private drawOfferCard(b:Box,rarity:keyof typeof RARITY_LABEL,selected:boolean,consumed:boolean,short:boolean,headerHeight=64,footerHeight=short?44:64):void {
    const g=this.add.graphics(),shadow=this.add.graphics(),edge=rarity==='rare'?0x8c394c:rarity==='uncommon'?0x32665e:0x335662,metal=rarity==='common'?0xbda171:0xe4c186;
    shadow.fillStyle(0x172e36,.16).fillRoundedRect(b.x+2,b.y+6,b.width,b.height,6);
    shadow.fillStyle(0x172e36,.12).fillRoundedRect(b.x+1,b.y+3,b.width,b.height,6);
    if(selected){
      shadow.lineStyle(6,0x367f75,.22).strokeRoundedRect(b.x-1,b.y-1,b.width+2,b.height+2,7);
      shadow.lineStyle(2,0xeac888,1).strokeRoundedRect(b.x-2,b.y-2,b.width+4,b.height+4,7);
    }
    this.view.add(shadow);
    this.view.material(b,consumed?0xe5dfcc:0xfff7e5,consumed?0xcfc9b5:0xeedbb8);
    this.view.material({x:b.x,y:b.y,width:b.width,height:headerHeight},consumed?0x607673:edge,consumed?0x435c59:rarity==='rare'?0x542936:0x1b3e48);
    this.view.material({x:b.x,y:b.y+b.height-footerHeight,width:b.width,height:footerHeight},consumed?0x607673:0x365d61,consumed?0x435c59:0x1c3542);
    g.lineStyle(selected?2:1,selected?0xf0d295:0xa99a79,.9).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,6);
    g.lineStyle(1,0xffedbf,.45).beginPath().moveTo(b.x+6,b.y+5).lineTo(b.x+b.width-6,b.y+5).moveTo(b.x+8,b.y+headerHeight).lineTo(b.x+b.width-8,b.y+headerHeight).strokePath();
    g.lineStyle(1,0xcdb784,.7).beginPath().moveTo(b.x+8,b.y+b.height-footerHeight).lineTo(b.x+b.width-8,b.y+b.height-footerHeight).strokePath();
    if(rarity==='rare')g.fillStyle(metal).fillTriangle(b.x+b.width/2-5,b.y+2,b.x+b.width/2+5,b.y+2,b.x+b.width/2,b.y+7);
    this.view.add(g);
  }
  private purchaseReason(o:R2Offer,short=false):string {
    if(!this.ready)return short?'暂不可购买':'当前只读或未保存，请查看菜单。';
    const kind=this.findOffer(o.offerId)?.kind;if(!kind)return '商品已变化，请重新查看';
    if(kind==='jokers'){
      if(this.run.jokers.length>=R2_LIMITS.jokerSlots)return short?'槽位已满':'五个槽位已满。请先关闭详情，点随身牌确认出售，再购买。';
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
    const body=this.run.jokers.map((j,i)=>`${i+1}. ${getR2Joker(j.definitionId).name} · ${editionEffectText(j.edition)} · 售价 ${salePrice(j.paidPrice)} 金\n${getR2Joker(j.definitionId).description}`).join('\n\n')||'尚无大丑牌。先看卡牌效果，也可以保留金币直接入场。';
    const items=this.run.longTermItems.map(id=>{const info=itemInfo(id);return info.name+'：'+info.description;}).join('\n')||'尚无长期道具。';
    this.dialog.open('当前构筑 · 从左至右触发',body+`\n\n有效牌组 ${this.run.deckInstances.length-this.run.destroyedIds.length} 张 · 消耗品 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)}\n长期道具 ${this.run.longTermItems.length}/${R2_LIMITS.longTermSlots}\n`+items+'\n\n点随身牌可移动顺序。出售需要再次确认；调序不花金币。'+(this.lastTransactionNotes.length?'\n\n上次交易的实际来源：\n'+this.lastTransactionNotes.join('\n'):''));
  }
  private inspectChapter():void {
    const s=this.run,seq=s.commandSeq,index=s.stageIndex,start=Math.floor(index/3)*3,normal=SKIP_ITEM_LABELS[s.chapterSkipConsumable];
    const stages=[0,1,2].map(i=>{const stage=getR2Stage(start+i)!;return stage.name+' · 目标 '+heatText(stage.targetHeat);}).join('\n');
    const body=stages+`\n\n压轴 ${s.boss.definitionId} · `+r2BossText(s.boss)+`\n\n暖场跳过：下一次买牌减2金，最低1金。现有 ${s.purchaseCoupons} 张券。\n正场跳过：${normal}；库存满时改为1金。\n跳过不获得过关奖励或利息，不触发过关效果；压轴不可跳过。`;
    this.dialog.open('本章节目',body,[{label:'跳过本场',disabled:!this.ready||index%3===2,run:()=>{
      const reward=index%3===0?'下一次买牌减2金券':s.consumables.length<r2ConsumableCapacity(s)?normal:'库存已满，获得1金';
      const d=this.dialog.open('跳场确认',`跳过「${getR2Stage(index)!.name}」获得 ${reward}。\n本场没有热度、过关奖金或利息，也不会触发过关效果。`,[{label:'确认跳场',primary:true,run:async()=>{if(await this.send({type:'SkipStage'},seq))this.dialog.close(d);}}],{closeLabel:'取消'});
    }}]);
  }
  private inspectOffer(id:string):void {
    const found=this.findOffer(id);if(!found||found.offer.consumed||this.busy)return;const {kind,offer:o}=found,seq=this.run.commandSeq;
    this.selectedOfferId=id;this.notice='';this.audio.select();this.render();
    const price=r2PurchasePrice(this.run,o),after=this.run.gold-price,reason=this.purchaseReason(o),d=kind==='jokers'?getR2Joker(o.definitionId):undefined,info=kind==='tools'?toolInfo(o.definitionId):kind==='items'?itemInfo(o.definitionId):undefined;
    const cap=r2InterestCap(this.run),afterState=kind==='jokers'?{...this.run,jokers:[...this.run.jokers,r2CreateJoker(o.definitionId,'preview/'+o.offerId,price,o.edition)]}:kind==='items'?{...this.run,longTermItems:[...this.run.longTermItems,o.definitionId]}:this.run,afterCap=r2InterestCap(afterState);
    const money=after<0?`现有 ${this.run.gold} 金，尚差 ${-after} 金。`:`余额 ${this.run.gold} → ${after} 金。\n过关利息档 ${Math.min(cap,Math.floor(this.run.gold/5))} → ${Math.min(afterCap,Math.floor(after/5))} 金。`;
    const discount=r2PurchaseDiscount(this.run),discountText=discount?`原价 ${o.price} 金，当前优惠 ${discount} 金，最低实付1金。\n${this.run.purchaseCoupons?'本次会使用1张减2金券。\n':''}`:'';
    const effect=d?d.description+r2JokerExtraHelp(d)+'\n版次：'+editionEffectText(o.edition):kind==='tools'?(()=>{const tool=toolInfo(o.definitionId);return [tool.description,tool.cost,tool.risk,'购买后收入消耗品库存，使用时另选目标并确认额外代价。'].filter(Boolean).join('\n\n');})():info!.description;
    const inventory=kind==='jokers'?'当前构筑：'+(this.run.jokers.map(j=>getR2Joker(j.definitionId).name).join('、')||'空'):kind==='tools'?`消耗品库存 ${this.run.consumables.length}/${r2ConsumableCapacity(this.run)}。购买不会自动使用或替换旧物。`:`长期道具 ${this.run.longTermItems.length}/${R2_LIMITS.longTermSlots}。同种不可重复、不可出售，持续到本局结束。`;
    const body=effect+`\n\n实际购买支付 ${price} 金\n`+discountText+money+'\n\n'+inventory+(reason?'\n\n无法购买：'+reason:'\n\n确认购买才会扣除金币。');
    const name=d?.name??(kind==='tools'?toolInfo(o.definitionId).label:info!.name),portrait=d?this.jokerPortrait(d.id):{url:info!.artUrl,alt:info!.name+'机制纹章',layout:'card' as const,caption:'机制纹章候选 · 正式插画待 A03 验收'};
    const dialog=this.dialog.open(name+' · 购买详情',body,[{label:'确认购买',primary:true,disabled:!!reason,run:async()=>{if(await this.send({type:'BuyOffer',offerId:id},seq))this.dialog.close(dialog);}}],{closeLabel:'取消',portrait,rarity:d?.rarity});
    if(d)this.attachJokerFallback(dialog,d.id);
  }
  private inspectJoker(id:string):void {
    const j=this.run.jokers.find(j=>j.instanceId===id);if(!j||this.busy)return;this.hideHoverPicture();const d=getR2Joker(j.definitionId),index=this.run.jokers.indexOf(j),seq=this.run.commandSeq;
    const growth=r2JokerStateText(j);
    const dialog=this.dialog.open(d.name+' · 第 '+(index+1)+' 槽',d.description+r2JokerExtraHelp(d)+'\n版次：'+editionEffectText(j.edition)+'\n\n当前实例：'+growth+`\n实际买价 ${j.paidPrice} 金；出售可得 ${salePrice(j.paidPrice)} 金。\n出售后余额 ${this.run.gold} → ${this.run.gold+salePrice(j.paidPrice)} 金。\n\n大丑牌按从左至右的顺序触发。`,[
      {label:'左移',disabled:!this.ready||index===0,run:async()=>{if(await this.reorder(index,index-1,seq)&&this.dialog.active(dialog))this.inspectJoker(id);}},
      {label:'右移',disabled:!this.ready||index===this.run.jokers.length-1,run:async()=>{if(await this.reorder(index,index+1,seq)&&this.dialog.active(dialog))this.inspectJoker(id);}},
      {label:'出售',disabled:!this.ready,run:()=>{const confirmation=this.dialog.open('出售确认',`出售第 ${index+1} 槽的「${d.name}」获得 ${salePrice(j.paidPrice)} 金币。\n余额 ${this.run.gold} → ${this.run.gold+salePrice(j.paidPrice)} 金。\n\n该牌成长将丢失，当前成长：${growth}。`,[{label:'确认出售',primary:true,run:async()=>{if(await this.send({type:'SellJoker',instanceId:id},seq))this.dialog.close(confirmation);}}],{closeLabel:'取消'});}},
    ],{portrait:this.jokerPortrait(d.id),rarity:d.rarity});
    this.attachJokerFallback(dialog,d.id);
  }
  private async reorder(from:number,to:number,expectedSeq?:number):Promise<boolean> {
    if(from<0||to<0||from>=this.run.jokers.length||to>=this.run.jokers.length)return false;
    const ids=this.run.jokers.map(j=>j.instanceId),[id]=ids.splice(from,1);ids.splice(to,0,id);return this.send({type:'ReorderJokers',ids},expectedSeq);
  }
  private moveJoker(id:string,x:number):void {
    const from=this.run.jokers.findIndex(j=>j.instanceId===id),to=this.geometry().slots.findIndex(b=>x>=b.x&&x<=b.x+b.width);
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
    if(this.pendingToolCue){
      const cue=this.pendingToolCue,box=this.geometry().items;this.pendingToolCue=undefined;if(!reduced)this.slotPop(box);
      const note=this.add.text(box.x+box.width/2,box.y-4,cue.label,{fontFamily:UI_FONT,fontSize:'14px',color:'#ffe3ae',resolution:Math.min(window.devicePixelRatio||1,3)}).setOrigin(.5,1).setDepth(60).setName('tool-use/'+cue.instanceId);
      this.tweens.add({targets:note,y:reduced?note.y:note.y-14,alpha:0,duration:reduced?500:1000,onComplete:()=>note.destroy()});
    }
    for(const event of this.pendingTransactions){
      const index=this.run.jokers.findIndex(joker=>joker.instanceId===event.instanceId),slot=this.geometry().slots[index];if(!slot)continue;
      if(!reduced)this.slotPop(slot);
      const note=this.add.text(slot.x+slot.width/2,slot.y+slot.height+24,r2TransactionText(event),{fontFamily:UI_FONT,fontSize:'14px',color:'#ffe3ae',resolution:Math.min(window.devicePixelRatio||1,3)}).setOrigin(.5).setName('transaction/'+event.instanceId);
      this.tweens.add({targets:note,y:reduced?note.y:note.y-14,alpha:0,duration:reduced?500:1000,onComplete:()=>note.destroy()});
    }this.pendingTransactions=[];
  }
  private async send(action:Action,expectedSeq?:number):Promise<boolean> {
    if(!this.ready)return false;
    const previous=this.run,oldGold=previous.gold;this.busy=true;const lifecycle=this.lifecycle;
    const purchase=action.type==='BuyOffer'?this.findOffer(action.offerId):undefined;
    const buyIndex=action.type==='BuyOffer'?this.visibleOffers().findIndex(o=>o.offerId===action.offerId):-1;
    const buyBox=buyIndex>=0?this.geometry().shelf[buyIndex]:undefined;
    const landSlot=purchase?.kind==='jokers'?this.geometry().slots[Math.min(previous.jokers.length,R2_LIMITS.jokerSlots-1)]:purchase?this.geometry().items:undefined;
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
      if(!result.duplicate&&transactions.length){this.pendingTransactions=transactions;this.lastTransactionNotes=transactions.map(r2TransactionText);}
      if(action.type==='BuyOffer'&&purchase&&!result.duplicate){
        const {kind,offer}=purchase,name=kind==='jokers'?getR2Joker(offer.definitionId).name:kind==='tools'?toolInfo(offer.definitionId).name:itemInfo(offer.definitionId).name;this.audio.purchase();
        this.notice=`已买 ${name} · 金币 ${oldGold} → ${this.run.gold}`;
        this.pendingGoldRoll=oldGold;
        if(buyBox&&landSlot)this.pendingPurchaseFlight={from:buyBox,to:landSlot,name};
      }else if(action.type==='SellJoker'&&!result.duplicate){
        const joker=previous.jokers.find(j=>j.instanceId===action.instanceId)!;this.audio.sale();
        this.notice=`已售 ${getR2Joker(joker.definitionId).name} · 金币 ${oldGold} → ${this.run.gold}`;
        this.pendingGoldRoll=oldGold;
      }else if(action.type==='RerollShop'&&!result.duplicate){this.selectedOfferId=undefined;this.audio.reroll();this.notice=`大丑牌与工具已更新 · 道具保留 · 金币 ${oldGold} → ${this.run.gold}`;this.pendingGoldRoll=oldGold;this.pendingRerollFlip=this.shelfKind!=='items';}
      else if(action.type==='ReorderJokers'){this.audio.select();this.notice='顺序已保存 · 从左至右触发';}
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
