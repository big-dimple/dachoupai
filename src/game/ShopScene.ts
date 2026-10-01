import Phaser from 'phaser';
import {AudioEngine} from '../audio/AudioEngine';
import {getR2Joker,rerollPrice,salePrice,r2Pool,r2PurchasePrice,type R2Offer} from '../domain/r2Shop';
import type {R2RunState,Action} from '../domain/run';
import {getR2Stage,R2_LIMITS} from '../domain/r2Run';
import {dispatchRun,runController} from './runAdapter';
import {heatText,fractionText} from './scoreText';
import {SceneView} from './SceneView';
import {DetailDialog} from './DetailDialog';
import {gameSession} from './session';
import {r2BossText} from '../domain/r2Chapter';
import {SKIP_ITEM_LABELS,showConsumables} from './ConsumableDialog';
import type {IntermissionResult} from './IntermissionScene';
import type {Box} from './layout';
import {jokerArtKey} from './jokerArt';

const RARITY_LABEL={common:'普通',uncommon:'特别',rare:'稀有'} as const;
/** The badge describes declared operations; conditions remain in the readable effect text. */
function mechanismBadge(d:ReturnType<typeof getR2Joker>){
  const operations=d.hooks.flatMap(h=>h.operations),growth=operations.find(o=>o.kind==='add-growth');
  if(growth?.kind==='add-growth')return {label:'成长',value:'+'+fractionText(growth.value),key:'p00-mark-plus',glyph:'↑',ink:0x367f75,paper:0xdce9df};
  const times=operations.find(o=>o.kind==='multiply-multiplier');
  if(times?.kind==='multiply-multiplier')return {label:'×倍率',value:'×'+fractionText(times.value),key:'p00-mark-times',glyph:'×',ink:0xbf493d,paper:0xf0d3c7};
  const plus=operations.find(o=>o.kind==='add-multiplier');
  if(plus?.kind==='add-multiplier')return {label:'+倍率',value:'+'+fractionText(plus.value),key:'p00-mark-plus',glyph:'+',ink:0x367f75,paper:0xdce9df};
  const heat=operations.find(o=>o.kind==='add-heat');
  if(heat?.kind==='add-heat')return {label:'计分热度',value:'+'+fractionText(heat.value),key:'p00-mark-plus',glyph:'+',ink:0x3f7978,paper:0xd8e9e3};
  const economy=operations.find(o=>o.kind==='add-heat-per-gold'||o.kind==='add-heat-per-empty-slot');
  if(economy?.kind==='add-heat-per-gold'||economy?.kind==='add-heat-per-empty-slot')return {label:economy.kind==='add-heat-per-gold'?'金币计分':'空槽计分',value:'+'+fractionText(economy.value),key:'p00-mark-joker',glyph:'✦',ink:0x9b693d,paper:0xf2dfbc};
  const gold=operations.find(o=>o.kind==='add-gold');
  if(gold?.kind==='add-gold')return {label:'过关金币',value:'+'+gold.amount+' 金',key:'p00-mark-joker',glyph:'金',ink:0x9b693d,paper:0xf2dfbc};
  if(operations.some(o=>o.kind==='refund-discard'))return {label:'弃牌救场',value:'返还弃牌',key:'p00-mark-joker',glyph:'↺',ink:0x64708c,paper:0xe2e3ed};
  return {label:'构筑计分',value:'+热度',key:'p00-mark-joker',glyph:'✦',ink:0x9b693d,paper:0xf2dfbc};
}
function shopLayout(width:number,height:number,top:number,bottom:number){
  const portrait=width<700&&height>width,short=height<500,compact=portrait&&height-bottom-top<760,w=Math.min(1180,width-24),x=(width-w)/2;
  const footerY=height-bottom-104,slotY=top+(short?64:compact?88:112),slotHeight=short?90:compact?72:portrait?112:128,slotWidth=Math.min(short?48:86,(w-32)/5),slotGroupWidth=slotWidth*5+32;
  const slotX=short?x:x+(w-slotGroupWidth)/2;
  const slots:Box[]=Array.from({length:5},(_,i)=>({x:slotX+i*(slotWidth+8),y:slotY,width:slotWidth,height:slotHeight}));
  const toolsY=short?slotY+slotHeight+44:slotY+slotHeight+26,toolWidth=short?(slotGroupWidth-8)/2:(w-8)/2;
  let chapter:Box={x,y:toolsY,width:toolWidth,height:44},items:Box={x:x+toolWidth+8,y:toolsY,width:toolWidth,height:44};
  const shelfX=short?x+slotGroupWidth+24:x,shelfWidth=short?w-slotGroupWidth-24:w;
  let shelfTop=short?top+64:portrait?slotY+slotHeight+(compact?50:54):toolsY+80,cols=portrait?2:3,rows=portrait?2:1;
  const tight=compact&&(footerY-36-shelfTop-12)/2<120,gap=12;
  // A very short usable viewport keeps both 44px utilities in one row above three cards.
  if(tight){shelfTop=toolsY+66;cols=3;rows=1;}
  const cardWidth=(shelfWidth-gap*(cols-1))/cols,cardHeight=(footerY-36-shelfTop-gap*(rows-1))/rows;
  const shelf:Box[]=Array.from({length:3},(_,i)=>({x:shelfX+(i%cols)*(cardWidth+gap),y:shelfTop+Math.floor(i/cols)*(cardHeight+gap),width:cardWidth,height:cardHeight}));
  const utility=portrait&&!tight?{x:shelfX+cardWidth+gap,y:shelfTop+cardHeight+gap,width:cardWidth,height:cardHeight}:undefined;
  if(utility){const padding=compact?8:12;chapter={x:utility.x+8,y:utility.y+padding,width:utility.width-16,height:44};items={...chapter,y:chapter.y+52};}
  const rerollWidth=Math.floor(w*.29),buildWidth=Math.floor(w*.25),playWidth=w-rerollWidth-buildWidth-16;
  return {x,w,top,short,compact,tight,portrait,slots,chapter,items,shelf,utility,shelfLabelY:shelfTop-25,reroll:{x,y:footerY,width:rerollWidth,height:48},play:{x:x+rerollWidth+8,y:footerY,width:playWidth,height:48},build:{x:x+w-buildWidth,y:footerY,width:buildWidth,height:48},noticeY:footerY+56};
}

export class ShopScene extends Phaser.Scene {
  private run!:R2RunState;
  private busy=false;
  private lifecycle=0;
  private selectedOfferId?:string;
  private notice='';
  private view!:SceneView;
  private readonly dialog=new DetailDialog();
  private readonly audio=AudioEngine.shared;
  constructor(){super('shop');}
  private get ready():boolean {return !this.busy&&runController(this)?.status==='idle'&&gameSession().lease.writable;}
  private geometry(){const l=this.view.layout,bottom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom'))||0;return shopLayout(l.width,l.height,l.hud.y,bottom);}
  create():void {
    this.busy=false;this.selectedOfferId=undefined;this.notice='';this.lifecycle++;
    this.events.once('shutdown',()=>{this.lifecycle++;this.dialog.close();});
    const run=runController(this)?.state;if(!run||run.phase!=='shop'){this.scene.start('character-select');return;}this.run=run;
    this.cameras.main.setBackgroundColor('#e4dac7');this.audio.setScene('shop');this.view=new SceneView(this,()=>this.render());this.render();
    if(!gameSession().reducedMotion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      this.view.root.setAlpha(.35);this.tweens.add({targets:this.view.root,alpha:1,duration:220,ease:'Cubic.easeOut'});
    }
  }
  private render():void {
    const v=this.view,p=this.geometry(),stage=getR2Stage(this.run.stageIndex)!;v.clear();v.paperBackground();
    v.text(p.x,p.top,'后台商店',p.short?24:28,'#203744');
    const purse={x:p.x+p.w-182,y:p.top-1,width:116,height:34},purseArt=this.add.graphics();
    v.add(this.add.graphics().fillStyle(0x213d45,.2).fillRoundedRect(purse.x+1,purse.y+3,purse.width,purse.height,7));
    v.material(purse,0xfbe1a6,0xc99455,7);
    purseArt.lineStyle(1,0x916738).strokeRoundedRect(purse.x+.5,purse.y+.5,purse.width-1,purse.height-1,7);v.add(purseArt);
    const gold=v.text(purse.x+10,purse.y+5,'金币 '+this.run.gold,20,'#614321').setName('shop/gold').setFontStyle('bold');
    for(let font=20;gold.width>purse.width-20&&font>14;)gold.setFontSize(--font);
    v.text(p.x,p.top+37,`${stage.name} · 目标 ${heatText(stage.targetHeat)}`,14,'#48685f',p.short?380:p.w-24);
    if(!p.short){
      if(!p.compact)v.text(p.x,p.top+64,this.run.stageIndex===0?'点卡牌看效果，再确认购买。准备好就进入牌桌。':'补一张、卖一张，或留着金币赚利息。',14,'#48685f',p.w);
      v.text(p.x,p.slots[0].y-24,`随身大丑牌 ${this.run.jokers.length} / ${R2_LIMITS.jokerSlots} · 点牌可出售或调序`,14,'#203744',p.w);
    }
    this.run.jokers.forEach((j,i)=>{
      const b=p.slots[i],d=getR2Joker(j.definitionId),badge=mechanismBadge(d);
      this.drawSlot(b,true,d.rarity);
      const r=v.rect({...b,height:b.height+22}).setFillStyle(0,0).setStrokeStyle(0);
      const ownedName=v.text(b.x+(p.compact?2:5),b.y+5,d.name,14,'#203744',b.width-(p.compact?4:10)).setStyle({maxLines:2}).setFontStyle('bold');
      const pictureY=ownedName.y+ownedName.height+4,pictureSize=Math.max(6,Math.min(b.width-12,b.y+b.height-27-pictureY));
      this.drawJokerPicture(j.definitionId,{x:b.x+(b.width-pictureSize)/2,y:pictureY,width:pictureSize,height:pictureSize});
      const growth=d.hooks.flatMap(h=>h.operations).find(o=>o.kind==='read-growth');
      const value=growth?.kind==='read-growth'?'+'+fractionText(j.growth[growth.key]??{n:'0',d:'1'}):badge.value==='返还弃牌'?'↺1':badge.value;
      v.text(b.x+b.width/2,b.y+b.height-22,value.replace(' 金','金'),14,'#fff0d0').setOrigin(.5,0).setFontStyle('bold');
      v.text(b.x+b.width/2,b.y+b.height+4,`售${salePrice(j.paidPrice)}金`,14,'#714c29').setOrigin(.5,0);
      v.add(this.add.circle(b.x+b.width-11,b.y+b.height-34,8,0xe8c180).setStrokeStyle(1,0x765532));
      v.text(b.x+b.width-11,b.y+b.height-34,String(i+1),14,'#4b3825').setOrigin(.5);
      v.target(r,`joker/${j.instanceId}`,{tap:()=>this.inspectJoker(j.instanceId),detail:()=>this.inspectJoker(j.instanceId),drag:(x)=>this.moveJoker(j.instanceId,x),holdToDrag:true});
    });
    for(let i=this.run.jokers.length;i<R2_LIMITS.jokerSlots;i++){
      const b=p.slots[i];this.drawSlot(b,false);v.text(b.x+b.width/2,b.y+b.height-22,`空槽 ${i+1}`,14,'#fff0d0').setOrigin(.5,0).setFontStyle('bold');
    }
    if(p.utility){v.material(p.utility,0xe6d6b8,0xcab493);if(p.utility.height>=166)v.text(p.utility.x+12,p.utility.y+122,'不买牌也可入场\n保留金币可赚利息',14,'#48685f',p.utility.width-24).setLineSpacing(3);}
    v.button(p.chapter,'本章节目','action/chapter',()=>this.inspectChapter());
    v.button(p.items,`物品 ${this.run.consumables.length}/2`,'action/items',()=>showConsumables(this.dialog,this.run,this.ready,a=>this.send(a)));
    v.text(p.shelf[0].x,p.shelfLabelY,'今日卡牌 · 点选查看完整效果',14,'#203744',p.short?p.w-p.shelf[0].x+p.x:p.w);
    const offers=this.run.shop!.offers;
    offers.forEach((o,i)=>{
      const selected=this.selectedOfferId===o.offerId,raw=p.shelf[i],b=selected?{...raw,y:raw.y-4}:raw,d=getR2Joker(o.definitionId),badge=mechanismBadge(d),wide=!p.compact&&b.width>=270;
      const footerHeight=p.tight?64:p.short||p.compact?44:64;
      this.drawOfferCard(b,d.rarity,selected,o.consumed,p.short||p.compact,p.tight?44:p.compact?34:64,footerHeight);
      const r=v.rect(b).setFillStyle(0,0).setStrokeStyle(0).setData('selected',selected);
      const name=v.text(b.x+12,b.y+(p.compact?5:10),d.name,p.short||p.compact?20:22,o.consumed?'#c6c5af':'#fff2d4').setFontStyle('bold').setShadow(0,1,'#12282e',1,true,true);
      for(let font=p.short||p.compact?20:22;name.width>b.width-(p.tight?44:wide?62:80)&&font>14;)name.setFontSize(--font);
      if(p.tight)name.setWordWrapWidth(b.width-44,true).setStyle({maxLines:2});
      if(wide)this.drawMechanismMark(badge.key,badge.glyph,b.x+b.width-28,b.y+24,32,o.consumed?0.45:1);
      else this.drawJokerPicture(o.definitionId,p.tight?{x:b.x+b.width-30,y:b.y+6,width:22,height:30}:p.compact?{x:b.x+b.width-38,y:b.y+3,width:28,height:28}:{x:b.x+b.width-59,y:b.y+2,width:50,height:60},o.consumed ? .55 : 1);
      if(!p.compact)v.text(b.x+12,b.y+42,({common:'○ ',uncommon:'◆ ',rare:'✦ '} as const)[d.rarity]+RARITY_LABEL[d.rarity],14,'#efcf8f',b.width-24);
      if(wide)v.text(b.x+b.width-12,b.y+42,badge.label,14,'#f7e8c9').setOrigin(1,0);
      const bodyY=p.tight?52:p.compact?42:72,bodyHeight=b.height-footerHeight-bodyY-8,pictureHeight=wide?Math.max(40,Math.min(172,bodyHeight)):0,pictureWidth=wide?Math.min(120,pictureHeight*.7):0;
      if(wide)this.drawJokerPicture(o.definitionId,{x:b.x+14,y:b.y+72,width:pictureWidth,height:pictureHeight},o.consumed ? .55 : 1);
      const descriptionX=b.x+14+(wide?pictureWidth+14:0),descriptionWidth=b.width-28-(wide?pictureWidth+14:0),descriptionLines=Math.max(1,Math.floor((bodyHeight+2)/19));
      v.text(descriptionX,b.y+bodyY,d.description,14,o.consumed?'#686e65':'#203744',descriptionWidth).setLineSpacing(2).setStyle({maxLines:descriptionLines});
      if(o.consumed){
        v.text(b.x+12,b.y+b.height-36,'✓ 已收入构筑',16,'#d3e9cb',b.width-24).setFontStyle('bold');return;
      }
      const price=r2PurchasePrice(this.run,o),reason=this.purchaseReason(o,true);
      const priceText=v.text(b.x+12,b.y+b.height-(p.tight?60:p.short||p.compact?44:52),`${price} 金币`,p.short||p.compact?20:22,'#f6d28c',b.width-24).setFontStyle('bold').setShadow(0,1,'#132931',1,true,true);
      if(!p.short&&!p.compact&&!wide)v.text(b.x+b.width-12,b.y+b.height-47,badge.label,14,'#fff0d0').setOrigin(1,0);
      const availability=reason||'可购买',status=(selected?'✓ 已选 · ':'')+availability;
      if(p.short||p.compact)v.text(b.x+12,priceText.y+priceText.height+1,availability,14,reason?'#ffc6a4':'#d3e9cb',b.width-24).setStyle({maxLines:p.tight?2:1});
      else v.text(b.x+12,b.y+b.height-24,status,14,reason?'#ffc6a4':'#d3e9cb',b.width-24);
      v.target(r,`offer/${o.offerId}`,{tap:()=>this.inspectOffer(o.offerId),detail:()=>this.inspectOffer(o.offerId)});
    });
    if(!offers.length)v.text(p.shelf[0].x,p.shelf[0].y,'卡牌售罄，可换一批或进入牌桌。',14,'#48685f',p.w);
    const cost=rerollPrice(this.run.shop!.rerollCount),canReroll=this.ready&&this.run.gold>=cost&&r2Pool(this.run.jokers.map(j=>j.definitionId)).length>0;
    v.button(p.reroll,`换牌 ${cost} 金`,'action/reroll',()=>void this.send({type:'RerollShop'}),canReroll);
    v.button(p.play,'进入牌桌','action/start-stage',()=>void this.send({type:'LeaveShop'}),this.ready,true);
    v.button(p.build,'构筑详情','action/build',()=>this.inspectBuild());
    const reason=!this.ready?'当前进度未保存或只读，请查看菜单。':this.run.gold<cost?`换牌需 ${cost} 金，还差 ${cost-this.run.gold} 金。可直接入场。`:this.run.jokers.length===5?'五个槽位已满；点随身牌出售后再买。':'点卡牌不会扣钱；点随身牌可出售或左移、右移。';
    v.text(p.x,p.noticeY,this.busy?'正在保存…':this.notice||reason,14,this.notice?'#367f75':'#48685f',p.w);
  }
  private drawSlot(b:Box,occupied:boolean,rarity:keyof typeof RARITY_LABEL='common'):void {
    const v=this.view,g=this.add.graphics(),edge=rarity==='rare'?0x9e5661:rarity==='uncommon'?0x367f75:0xb39868;
    v.add(this.add.graphics().fillStyle(0x263d40,.2).fillRoundedRect(b.x+2,b.y+4,b.width,b.height,5));
    v.material({...b,x:b.x-1,y:b.y-1},0xfaf1db,0xc8af85,5);
    v.material(b,occupied?0xfff6e2:0x5a7e70,occupied?0xe2cda6:0x213f49,5);
    if(!occupied&&this.textures.exists('p00-card-back'))v.add(this.add.image(b.x+b.width/2,b.y+b.height/2,'p00-card-back').setDisplaySize(b.width,b.height).setAlpha(.75));
    else if(!occupied){
      for(let yy=b.y+10;yy<b.y+b.height-26;yy+=12)for(let xx=b.x+10;xx<b.x+b.width-6;xx+=12)g.lineStyle(1,0xd9c38d,.28).strokeRect(xx-3,yy-3,6,6);
      this.drawMechanismMark('p00-mark-joker','✦',b.x+b.width/2,b.y+b.height*.47,b.width*.6,.7);
    }
    v.material({x:b.x+2,y:b.y+b.height-25,width:b.width-4,height:23},occupied?0x426a62:0x385c5a,0x203e49,3);
    g.lineStyle(1.5,occupied?edge:0xc5ad79).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,5);
    g.lineStyle(1,0xffecc2,.55).strokeRoundedRect(b.x+3,b.y+3,b.width-6,b.height-6,3);
    g.lineStyle(1,0xc5ab74).beginPath().moveTo(b.x+6,b.y+b.height-25).lineTo(b.x+b.width-6,b.y+b.height-25).strokePath();v.add(g);
    const frame='p00-frame-'+rarity;
    if(occupied&&this.textures.exists(frame))v.add(this.add.image(b.x+b.width/2,b.y+b.height/2,frame).setDisplaySize(b.width,b.height).setAlpha(.55));
  }
  private drawJokerPicture(definitionId:string,b:Box,alpha=1):void {
    const v=this.view,d=getR2Joker(definitionId),badge=mechanismBadge(d),key=jokerArtKey(definitionId),g=this.add.graphics();
    v.material(b,badge.paper,0xcbb591,3).setAlpha(alpha);
    if(key&&this.textures.exists(key)){
      const picture=this.add.image(b.x+b.width/2,b.y+b.height/2,key),size=Math.min(b.width-4,b.height-4);
      v.add(picture.setScale(size/Math.max(picture.width,picture.height)).setAlpha(alpha));
    }else {
      const cx=b.x+b.width/2,cy=b.y+b.height/2;
      g.lineStyle(1,badge.ink,.25).beginPath().moveTo(cx,b.y+4).lineTo(b.x+b.width-4,cy).lineTo(cx,b.y+b.height-4).lineTo(b.x+4,cy).closePath().strokePath();
      this.drawMechanismMark(badge.key,badge.glyph,cx,cy,Math.min(b.width,b.height)*.7,alpha);
    }
    g.lineStyle(1,0xb39868).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,3);v.add(g.setAlpha(alpha));
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
    g.lineStyle(selected?2:1,selected?0x226c66:metal).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,6);
    g.lineStyle(1,0xffedbf,.45).beginPath().moveTo(b.x+6,b.y+5).lineTo(b.x+b.width-6,b.y+5).moveTo(b.x+8,b.y+headerHeight).lineTo(b.x+b.width-8,b.y+headerHeight).strokePath();
    g.lineStyle(1,0xcdb784,.7).beginPath().moveTo(b.x+8,b.y+b.height-footerHeight).lineTo(b.x+b.width-8,b.y+b.height-footerHeight).strokePath();
    for(const [cx,cy,sx,sy] of [[b.x+5,b.y+5,1,1],[b.x+b.width-5,b.y+5,-1,1],[b.x+5,b.y+b.height-5,1,-1],[b.x+b.width-5,b.y+b.height-5,-1,-1]]){
      g.lineStyle(rarity==='rare'?2:1,metal).beginPath().moveTo(cx,cy+7*sy).lineTo(cx,cy).lineTo(cx+7*sx,cy).strokePath();
    }
    if(rarity==='rare')g.fillStyle(metal).fillTriangle(b.x+b.width/2-5,b.y+2,b.x+b.width/2+5,b.y+2,b.x+b.width/2,b.y+7);
    this.view.add(g);
    const frameKey='p00-frame-'+rarity;
    if(this.textures.exists(frameKey))this.view.add(this.add.image(b.x+b.width/2,b.y+b.height/2,frameKey).setDisplaySize(b.width,b.height).setAlpha(consumed?.3:.5));
  }
  private drawMechanismMark(key:string,glyph:string,x:number,y:number,size:number,alpha:number):void {
    if(this.textures.exists(key))this.view.add(this.add.image(x,y,key).setDisplaySize(size,size).setAlpha(alpha));
    else this.view.text(x,y,glyph,size*.7,'#367f75').setOrigin(.5).setAlpha(alpha);
  }
  private purchaseReason(o:R2Offer,short=false):string {
    if(!this.ready)return short?'暂不可购买':'当前只读或未保存，请查看菜单。';
    if(this.run.jokers.length>=R2_LIMITS.jokerSlots)return short?'槽位已满':'五个槽位已满。请先关闭详情，点随身牌确认出售，再购买。';
    if(this.run.jokers.some(j=>j.definitionId===o.definitionId))return '已装备同名牌';
    const deficit=r2PurchasePrice(this.run,o)-this.run.gold;
    return deficit>0?(short?`差 ${deficit} 金`:`金币不足，还差 ${deficit} 金币。`):'';
  }
  private inspectBuild():void {
    const body=this.run.jokers.map((j,i)=>`${i+1}. ${getR2Joker(j.definitionId).name} · 售价 ${salePrice(j.paidPrice)} 金\n${getR2Joker(j.definitionId).description}`).join('\n\n')||'尚无大丑牌。先看卡牌效果，也可以保留金币直接入场。';
    this.dialog.open('当前构筑 · 从左至右触发',body+'\n\n点随身牌可移动顺序。出售需要再次确认；调序不花金币。');
  }
  private inspectChapter():void {
    const s=this.run,index=s.stageIndex,start=Math.floor(index/3)*3,normal=SKIP_ITEM_LABELS[s.chapterSkipConsumable];
    const stages=[0,1,2].map(i=>{const stage=getR2Stage(start+i)!;return stage.name+' · 目标 '+heatText(stage.targetHeat);}).join('\n');
    const body=stages+`\n\n压轴 ${s.boss.definitionId} · `+r2BossText(s.boss)+`\n\n暖场跳过：下一次买牌减2金，最低1金。现有 ${s.purchaseCoupons} 张券。\n正场跳过：${normal}；库存满时改为1金。\n跳过不获得过关奖励或利息，不触发过关效果；压轴不可跳过。`;
    this.dialog.open('本章节目',body,[{label:'跳过本场',disabled:!this.ready||index%3===2,run:()=>{
      const reward=index%3===0?'下一次买牌减2金券':s.consumables.length<2?normal:'库存已满，获得1金';
      const d=this.dialog.open('跳场确认',`跳过「${getR2Stage(index)!.name}」获得 ${reward}。\n本场没有热度、过关奖金或利息，也不会触发过关效果。`,[{label:'确认跳场',primary:true,run:async()=>{if(await this.send({type:'SkipStage'}))this.dialog.close(d);}}],{closeLabel:'取消'});
    }}]);
  }
  private inspectOffer(id:string):void {
    const o=this.run.shop!.offers.find(o=>o.offerId===id);if(!o||o.consumed||this.busy)return;
    this.selectedOfferId=id;this.notice='';this.audio.select();this.render();
    const d=getR2Joker(o.definitionId),price=r2PurchasePrice(this.run,o),after=this.run.gold-price,reason=this.purchaseReason(o);
    const money=after<0?`现有 ${this.run.gold} 金，尚差 ${-after} 金。`:`余额 ${this.run.gold} → ${after} 金。\n过关利息档 ${Math.min(5,Math.floor(this.run.gold/5))} → ${Math.min(5,Math.floor(after/5))} 金。`;
    const body=d.description+`\n\n价格 ${price} 金币${this.run.purchaseCoupons?'（原价 '+o.price+'，使用1张减2金券）':''}\n`+money+'\n\n当前构筑：'+(this.run.jokers.map(j=>getR2Joker(j.definitionId).name).join('、')||'空')+(reason?'\n\n无法购买：'+reason:'\n\n确认购买才会扣除金币。');
    const dialog=this.dialog.open(d.name+' · 购买详情',body,[{label:'确认购买',primary:true,disabled:!!reason,run:async()=>{if(await this.send({type:'BuyOffer',offerId:id}))this.dialog.close(dialog);}}],{closeLabel:'取消'});
  }
  private inspectJoker(id:string):void {
    const j=this.run.jokers.find(j=>j.instanceId===id);if(!j||this.busy)return;const d=getR2Joker(j.definitionId),index=this.run.jokers.indexOf(j);
    const growth=Object.entries(j.growth).map(([k,v])=>k+' '+fractionText(v)).join('、')||'无';
    const dialog=this.dialog.open(d.name+' · 第 '+(index+1)+' 槽',RARITY_LABEL[d.rarity]+'大丑牌\n'+d.description+'\n\n当前成长：'+growth+`\n实际买价 ${j.paidPrice} 金；出售可得 ${salePrice(j.paidPrice)} 金。\n出售后余额 ${this.run.gold} → ${this.run.gold+salePrice(j.paidPrice)} 金。\n\n大丑牌按从左至右的顺序触发。`,[
      {label:'左移',disabled:!this.ready||index===0,run:async()=>{if(await this.reorder(index,index-1)&&this.dialog.active(dialog))this.inspectJoker(id);}},
      {label:'右移',disabled:!this.ready||index===this.run.jokers.length-1,run:async()=>{if(await this.reorder(index,index+1)&&this.dialog.active(dialog))this.inspectJoker(id);}},
      {label:'出售',disabled:!this.ready,run:()=>{const confirmation=this.dialog.open('出售确认',`出售第 ${index+1} 槽的「${d.name}」获得 ${salePrice(j.paidPrice)} 金币。\n余额 ${this.run.gold} → ${this.run.gold+salePrice(j.paidPrice)} 金。\n\n该牌成长将丢失，当前成长：${growth}。`,[{label:'确认出售',primary:true,run:async()=>{if(await this.send({type:'SellJoker',instanceId:id}))this.dialog.close(confirmation);}}],{closeLabel:'取消'});}},
    ]);
  }
  private async reorder(from:number,to:number):Promise<boolean> {
    if(from<0||to<0||from>=this.run.jokers.length||to>=this.run.jokers.length)return false;
    const ids=this.run.jokers.map(j=>j.instanceId),[id]=ids.splice(from,1);ids.splice(to,0,id);return this.send({type:'ReorderJokers',ids});
  }
  private moveJoker(id:string,x:number):void {
    const from=this.run.jokers.findIndex(j=>j.instanceId===id),to=this.geometry().slots.findIndex(b=>x>=b.x&&x<=b.x+b.width);
    if(from>=0&&to>=0&&to<this.run.jokers.length&&from!==to)void this.reorder(from,to);
  }
  private async send(action:Action):Promise<boolean> {
    if(!this.ready)return false;
    const previous=this.run,oldGold=previous.gold;this.busy=true;const lifecycle=this.lifecycle;this.render();
    try {
      const result=await dispatchRun(this,action);if(lifecycle!==this.lifecycle||!this.scene.isActive())return false;
      if(!result.ok){
        this.audio.invalid();
        if(result.code==='save-failed')this.dialog.close();
        else this.dialog.open('操作未提交',({'slots-full':'五个槽位已满，请先出售一张。','not-enough-gold':'金币不足；本次操作没有扣款。','already-owned':'已装备同名牌。','no-reroll-candidates':'没有可换入的卡牌。'} as Record<string,string>)[result.code]??'本次操作未提交，原选择和资源仍然保留。');
        return false;
      }
      this.run=result.state;
      if(action.type==='BuyOffer'){
        const offer=previous.shop!.offers.find(o=>o.offerId===action.offerId)!;this.audio.purchase();
        this.notice=`已买 ${getR2Joker(offer.definitionId).name} · 金币 ${oldGold} → ${this.run.gold}`;
      }else if(action.type==='SellJoker'){
        const joker=previous.jokers.find(j=>j.instanceId===action.instanceId)!;this.audio.sale();
        this.notice=`已售 ${getR2Joker(joker.definitionId).name} · 金币 ${oldGold} → ${this.run.gold}`;
      }else if(action.type==='RerollShop'){this.selectedOfferId=undefined;this.audio.reroll();this.notice=`卡牌已更新 · 金币 ${oldGold} → ${this.run.gold}`;}
      else if(action.type==='ReorderJokers'){this.audio.select();this.notice='顺序已保存 · 从左至右触发';}
      if(action.type==='LeaveShop'){this.audio.select();this.scene.start('game');}
      else if(action.type==='SkipStage'){
        const s=this.run.stage!;this.scene.start('intermission',{cleared:true,stageIndex:s.index,stageHeat:s.heat,handsLeft:s.handsLeft,goldEarned:s.goldEarned} satisfies IntermissionResult);
      }
      return true;
    }finally {if(lifecycle===this.lifecycle){this.busy=false;if(this.scene.isActive()&&this.run.phase==='shop')this.render();}}
  }
}
