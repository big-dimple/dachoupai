import Phaser from 'phaser';
import { AudioEngine } from '../audio/AudioEngine';
import { rankLabel, SUIT_SYMBOL, type PlayingCard } from '../cards/types';
import {EffectQueue,type EffectContext} from '../core/EffectQueue';
import { TriggerEngine } from '../core/TriggerEngine';
import { getR2Joker as getJoker } from '../domain/r2Shop';
import {R2_JOKERS,type R2JokerInstance} from '../content/r2Schema';
import {HAND_LABELS} from '../content/handLabels';
import {heatText,fractionText} from './scoreText';
import type {R2RunState as RunState} from '../domain/run';
import {R2_LIMITS,getR2Stage as getStage,r2ScoreContext,r2DiscardCost} from '../domain/r2Run';
import {previewR2Hand,type Accumulator,type ScoreTrace,type ScoreEvent} from '../domain/scoreR2';
import {Rational} from '../domain/rational';

import { getCharacter, type CharacterId } from './characters';
import type { IntermissionResult } from './IntermissionScene';
import {addAvatar} from './portraits';
import {SceneView} from './SceneView';
import {DetailDialog} from './DetailDialog';
import {SUITS} from '../cards/types';
import {dispatchRun,runController} from './runAdapter';
import {gameSession} from './session';
import {r2BossText,r2DisabledCards} from '../domain/r2Chapter';
import {showConsumables} from './ConsumableDialog';
import {PAPER_THEME as T,PAPER_CSS as C,UI_FONT,P00_ASSETS,assetUrl} from './theme';
import type {Box} from './layout';
import {jokerArtKey} from './jokerArt';

const MAX_SELECTED = R2_LIMITS.maxSelected;

interface CardView {
  card: PlayingCard;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  scoringMark: Phaser.GameObjects.Text;
  hit?:Phaser.GameObjects.Rectangle;
  back?:Phaser.GameObjects.Image;
  edgeGlow?:Phaser.GameObjects.Graphics;
}
type HandPreview=ReturnType<typeof previewR2Hand>;

export class GameScene extends Phaser.Scene {
  private get deck(): string[] { return this.run.drawPile; }
  private get hand(): readonly PlayingCard[] { return this.presentation?.hand??this.run.handOrder.map(id => this.run.deckInstances.find(card => card.id === id)!); }
  private selectedIds = new Set<string>();
  private cardViews: CardView[] = [];
  private jokerViews = new Map<string, Phaser.GameObjects.Container>();
  private run!: RunState;
  private stage!: NonNullable<ReturnType<typeof getStage>>;
  private get handsLeft(): number { return this.run.stage?.handsLeft ?? 0; }
  private get heat(): string { return this.run.stage?.heat ?? '0'; }
  private playing = false;
  private lifecycle=0;
  private intent=0;
  private presentation?:{generation:number;lifecycle:number;intent:number;state:RunState;score:ScoreTrace;hand:readonly PlayingCard[];displayHeat:string;replay:boolean;previousTrace:ScoreTrace|null;credited:boolean};
  private characterId!: CharacterId;
  private readonly effects = new EffectQueue();
  private readonly triggers = new TriggerEngine();
  private readonly audio = AudioEngine.shared;

  private view!:SceneView;
  private readonly dialog=new DetailDialog();
  private focusIndex=0;
  private statusMessage='';
  private heatText!: Phaser.GameObjects.Text;
  private handsText!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private breakdownText!: Phaser.GameObjects.Text;
  private roleText!: Phaser.GameObjects.Text;
  private playButton!: Phaser.GameObjects.Rectangle;
  private discardButton!: Phaser.GameObjects.Rectangle;
  private rankButton!: Phaser.GameObjects.Rectangle;
  private suitButton!: Phaser.GameObjects.Rectangle;
  private forwardButton!: Phaser.GameObjects.Rectangle;
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
  private dropMarker?:Phaser.GameObjects.Rectangle;
  private settledCards=new Map<string,CardView>();

  constructor() {
    super('game');
  }
  preload():void {
    for(const asset of P00_ASSETS)if(!this.textures.exists(asset.key))this.load.svg(asset.key,assetUrl(asset.path),{width:asset.width,height:asset.height});
  }
  private get reducedMotion():boolean {return gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;}

  async create(): Promise<void> {
    const lifecycle=++this.lifecycle;this.intent++;
    this.effects.clear();this.triggers.clear();this.jokerViews.clear();this.cardViews=[];this.selectedIds.clear();this.playing=false;this.presentation=undefined;this.statusMessage='';this.focusIndex=0;
    const settings=()=>{this.tweens.timeScale=gameSession().speed;this.time.timeScale=gameSession().speed;this.audio.muted=gameSession().muted;if(this.reducedMotion){this.cameras.main.resetFX();if(this.presentation)this.fastForward();this.cardViews.forEach(view=>this.revealCard(view));}};
    window.addEventListener('dachoupai-presentation',settings);
    this.events.once('shutdown',()=>{
      this.lifecycle++;this.intent++;this.effects.clear();this.audio.cancelPresentation();this.tweens.killAll();this.time.removeAllEvents();this.triggers.clear();this.jokerViews.clear();this.settledCards.clear();this.cardViews=[];this.selectedIds.clear();this.previewCards=undefined;this.dropMarker=undefined;this.presentation=undefined;this.playing=false;this.dialog.close();
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
    this.stage=getStage(this.run.stage.index)!;this.characterId=this.run.characterId;settings();this.audio.setScene('table');
    this.cameras.main.setBackgroundColor(C.paper);
    this.view=new SceneView(this,()=>{
      if(this.presentation)this.fastForward();
      this.render();
    });
    window.addEventListener('keydown',this.keyboard);
    this.render();
    if(enteredStage)this.revealDrawnCards([]);
  }

  private readonly keyboard=(event:KeyboardEvent)=>{
    if(this.playing||document.querySelector('dialog[open]')||!this.scene.isActive()||document.activeElement?.matches('input,select,textarea,button'))return;
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();this.focusIndex=(this.focusIndex+(event.key==='ArrowRight'?1:this.hand.length-1))%this.hand.length;this.refreshSelection();}
    else if(event.key===' '&&this.hand[this.focusIndex]){event.preventDefault();this.toggleCard(this.hand[this.focusIndex].id);}
    else if(event.key==='Enter'&&this.hand[this.focusIndex]){event.preventDefault();this.inspectCard(this.hand[this.focusIndex].id);}
  };
  private get ready():boolean {return !this.playing&&runController(this)?.status==='idle'&&gameSession().lease.writable;}
  private render():void {
    const v=this.view,l=v.layout;v.clear();v.paperBackground();this.settledCards.clear();this.previewCards=undefined;this.dropMarker=undefined;
    const h=l.hud,c=getCharacter(this.characterId),portrait=l.mode==='portrait',short=l.mode==='landscape';
    v.rect(h,T.ink).setStrokeStyle(2,T.jade);
    const avatarSize=portrait||short?48:64,avatarY=h.y+(portrait?8:short?34:66);
    this.roleAvatar=v.add(this.add.container(h.x+12+avatarSize/2,avatarY+avatarSize/2)).setData('baseY',avatarY+avatarSize/2);
    addAvatar(this,this.roleAvatar,c,0,0,avatarSize);
    this.roleFrame=this.add.rectangle(0,0,avatarSize+4,avatarSize+4,T.brass).setFillStyle(T.brass,0).setStrokeStyle(1,T.brass,.6);this.roleAvatar.add(this.roleFrame);
    const bossName=r2BossText(this.run.boss).split('：')[0];
    if(!portrait)v.text(h.x+12,h.y+8,'大 丑 牌',short?20:28,C.paper);
    v.text(h.x+76,avatarY,c.name,portrait||short?20:22,C.paper);
    this.roleText=v.text(h.x+76,avatarY+28,this.roleCaption(),14,C.brass,h.width-88);
    if(!l.compact)v.text(h.x+12,h.y+(portrait?60:short?96:154),this.stage.index%3===2?'压轴 · '+bossName:this.stage.name,14,C.paper,h.width-24);
    this.heatText=v.text(h.x+12,h.y+(portrait?(l.compact?52:82):short?120:214),'',portrait?22:short?30:42,C.paper,h.width-24);
    this.handsText=v.text(h.x+12,h.y+(portrait?(l.compact?78:112):short?195:328),'',portrait?14:short?16:18,C.paper,h.width-24);
    if(!portrait){
      if(!short)v.text(h.x+12,h.y+191,'本场热度',14,C.paper);
      v.text(h.x+12,h.y+(short?159:274),'目标 '+heatText(this.stage.targetHeat),short?14:22,C.brass,h.width-24);
      const progressY=h.y+(short?184:311);v.rect({x:h.x+12,y:progressY,width:h.width-24,height:5},0x45595b).setStrokeStyle(0);
      this.progressBar=v.rect({x:h.x+12,y:progressY,width:1,height:5},T.jade).setOrigin(0,.5).setPosition(h.x+12,progressY+2.5).setStrokeStyle(0);
      v.button({x:h.x+12,y:h.y+(short?250:432),width:h.width-24,height:44},'角色 / 本场规则','action/role',()=>this.inspectRole());
    }
    this.renderJokerRack();
    const s=l.scoreBoard,roomy=s.height>=92;
    v.rect(s,T.paper).setStrokeStyle(1,T.brass,.65);
    this.resultText=v.text(s.x+12,s.y+4,'当前选择 · 选 1～5 张牌',roomy?24:18,C.ink,s.width-24);
    const metricY=s.y+(roomy?52:short?26:28),metricSize=roomy?30:22,metricWidth=s.width/3;
    const tileY=s.y+(roomy?30:25),tileHeight=roomy?58:Math.min(36,s.height-26);
    [0,1].forEach(i=>{const tile={x:s.x+metricWidth*i+7,y:tileY,width:metricWidth-14,height:tileHeight};v.material(tile,i===0?0x438d7e:0xc16c50,i===0?0x245955:0x85372f,5);v.rect(tile).setFillStyle(0,0).setStrokeStyle(1,i===0?0xa6cab0:0xe9b089,.9);});
    this.scoreLabels=['基础热度','基础倍率','预计本手'].map((label,i)=>v.text(s.x+metricWidth*(i+.5),s.y+32,label,14,i===0?'#ddedd5':i===1?'#ffe0bc':C.jade).setOrigin(.5,0).setVisible(roomy));
    this.scoreHeat=v.text(s.x+metricWidth*.5,metricY,'—',metricSize,'#fff3d3').setOrigin(.5,0).setShadow(0,1,'#163a3b',2,true,true);
    this.scoreMult=v.text(s.x+metricWidth*1.5,metricY,'—',metricSize,'#fff0ca').setOrigin(.5,0).setShadow(0,1,'#632a28',2,true,true);
    this.scoreTotal=v.text(s.x+metricWidth*2.5,metricY,'—',metricSize,C.ink).setOrigin(.5,0);
    this.breakdownText=v.text(s.x+12,s.y+88,'',14,C.ink,s.width-24).setVisible(roomy);
    const p=l.playedArea;v.rect({...p,x:p.x+2,y:p.y+3},T.ink).setStrokeStyle(0);
    v.rect(p,0x244c50).setStrokeStyle(2,T.brass,.75);
    v.material({x:p.x+3,y:p.y+3,width:p.width-6,height:p.height-6},0x32585a,0x193941,0);
    v.add(this.add.graphics().lineStyle(1,0x9cae90,.45).strokeRect(p.x+8,p.y+8,p.width-16,p.height-16));
    this.previousHandText=v.text(portrait?p.x+10:h.x+12,portrait?p.y+p.height-20:h.y+(short?301:510),'',14,portrait?'#eddfbf':C.brass,portrait?p.width-20:h.width-24);
    this.handCountText=v.text(l.handLabel.x,l.handLabel.y,'',14,C.ink);
    this.pileText=v.text(l.piles.x+l.piles.width,l.piles.y,'',14,C.ink).setOrigin(1,0);
    this.rankButton=v.button(l.buttons.rank,'点数排序','action/sort-rank',()=>void this.sortHand('rank'),this.ready);
    this.suitButton=v.button(l.buttons.suit,'花色排序','action/sort-suit',()=>void this.sortHand('suit'),this.ready);
    v.button(l.buttons.deck,'查看牌组','action/deck',()=>this.inspectDeck());
    v.button(l.buttons.details,'规则 / 物品','action/details',()=>this.inspectRole());
    this.discardButton=v.button(l.buttons.discard,r2DiscardCost(this.run)===2?'弃牌 ×2':'弃牌','action/discard',()=>void this.discardSelected(),this.ready&&this.selectedIds.size>0&&this.run.stage!.discardsLeft>=r2DiscardCost(this.run));
    this.playButton=v.button(l.buttons.play,'出牌','action/play',()=>void this.playSelected(),this.ready&&this.selectedIds.size>0&&this.handsLeft>0,true);
    this.forwardButton=v.button(l.buttons.forward,'快进','action/forward',()=>this.presentation?this.fastForward():this.inspectLastTrace(),!!this.presentation);
    this.statusText=v.text(l.status.x,l.status.y,'',14,C.red,l.status.width);
    this.updateHud();this.renderHand();
  }
  private renderJokerRack():void {
    const v=this.view,l=v.layout;this.jokerViews.clear();
    l.slots.forEach((b,i)=>{
      const j=this.run.jokers[i],shadow=v.add(this.add.graphics());
      shadow.fillStyle(T.ink,.18).fillRoundedRect(b.x+2,b.y+4,b.width,b.height,5);
      if(!j){
        v.material(b,0xfff1d8,0xc8b38f,5);
        if(this.textures.exists('p00-card-back'))v.add(this.add.image(b.x+b.width/2,b.y+b.height/2,'p00-card-back').setDisplaySize(b.width-6,b.height-6).setAlpha(.64));
        v.add(this.add.graphics().lineStyle(1,0xfff2ce,.9).strokeRoundedRect(b.x+2,b.y+2,b.width-4,b.height-4,4).lineStyle(1,0x8b785c,.8).strokeRoundedRect(b.x,b.y,b.width,b.height,5));
        v.material({x:b.x+4,y:b.y+b.height-25,width:b.width-8,height:21},0xe7d4b1,0xc5b28e,3);
        v.text(b.x+b.width/2,b.y+b.height-23,'空槽 '+(i+1),14,'#3e5b59').setOrigin(.5,0);return;
      }
      const d=getJoker(j.definitionId),symbol=d.rarity==='rare'?'★':d.rarity==='uncommon'?'◇':'□',sideLabels=l.mode==='landscape',labelBox=l.jokerLabels[i],labelX=sideLabels?labelBox.x-b.x-b.width/2:-b.width/2+5;
      const marker=v.add(this.add.container(b.x+b.width/2,b.y+b.height/2)).setData('baseY',b.y+b.height/2);
      const r=this.add.rectangle(0,0,b.width,b.height,T.paper).setFillStyle(0,0).setStrokeStyle(2,d.rarity==='rare'?T.brass:T.jade);
      const paper=v.material({x:-b.width/2,y:-b.height/2,width:b.width,height:b.height},0xfff6df,0xd9c29f,5),resolution=Math.min(devicePixelRatio||1,2);
      const name=this.add.text(labelX,-b.height/2+(sideLabels?2:5),d.name,{fontFamily:UI_FONT,fontSize:'14px',fontStyle:'bold',color:sideLabels?C.ink:'#fff0cf',wordWrap:{width:sideLabels?labelBox.width:b.width-10,useAdvancedWrap:true},resolution});
      const current=this.add.text(labelX,sideLabels?-b.height/2+38:b.height/2-23,this.jokerValue(j),{fontFamily:UI_FONT,fontSize:sideLabels||b.width<80?'14px':'20px',fontStyle:'bold',color:C.red,resolution});
      const rarity=this.add.text(sideLabels?labelX:b.width/2-6,sideLabels?-b.height/2+56:b.height/2-22,sideLabels?symbol+(d.rarity==='rare'?'稀有':d.rarity==='uncommon'?'罕见':'普通'):symbol,{fontFamily:UI_FONT,fontSize:'14px',fontStyle:'bold',color:C.ink,resolution}).setOrigin(sideLabels?0:1,0);
      const headHeight=Math.max(26,name.height+8),head=sideLabels?undefined:v.material({x:-b.width/2+2,y:-b.height/2+2,width:b.width-4,height:headHeight},d.rarity==='rare'?0x854f53:0x46776e,0x213f49,3);
      marker.add([paper,...(head?[head]:[])]);
      const artTop=sideLabels?-b.height/2+5:-b.height/2+headHeight+4,artHeight=sideLabels?b.height-10:Math.max(14,b.height-headHeight-30),artSize=Math.min(b.width-10,artHeight),key=jokerArtKey(j.definitionId);
      if(key&&this.textures.exists(key)){const art=this.add.image(0,artTop+artHeight/2,key);art.setScale(Math.min((b.width-10)/art.width,artHeight/art.height));marker.add(art);}
      else this.jokerMechanism(marker,0,artTop+artHeight/2,artSize,j);
      const trim=this.textures.exists('p00-frame-'+d.rarity)?this.add.image(0,0,'p00-frame-'+d.rarity).setDisplaySize(b.width,b.height).setAlpha(.58):undefined;
      marker.add([...(trim?[trim]:[]),r,name,current,rarity]).setData('frame',r).setData('nameLabel',name).setData('valueLabel',current);this.jokerViews.set(j.instanceId,marker);
      const hit=sideLabels?this.add.rectangle((labelBox.width+6)/2,0,b.width+labelBox.width+6,b.height,T.ink,.001):r;if(hit!==r)marker.add(hit);
      v.target(hit,'joker/'+j.instanceId,{tap:()=>this.inspectJoker(j.instanceId),detail:()=>this.inspectJoker(j.instanceId),drag:x=>void this.reorderJoker(j.instanceId,x),holdToDrag:true});
    });
  }
  private jokerMechanism(marker:Phaser.GameObjects.Container,x:number,y:number,size:number,joker:R2JokerInstance):void {
    const ops=getJoker(joker.definitionId).hooks.flatMap(h=>h.operations),multiply=ops.some(o=>o.kind==='multiply-multiplier'),growth=ops.some(o=>o.kind==='add-growth'),retrigger=ops.some(o=>o.kind==='retrigger-card'),gold=ops.some(o=>o.kind==='add-gold'||o.kind==='add-heat-per-gold');
    const motif=this.add.graphics().setPosition(x,y),radius=size*.42;motif.fillStyle(multiply?0x7f3836:gold?0x8b693a:0x285c57,.96).fillCircle(0,0,radius).lineStyle(2,T.brass,.9).strokeCircle(0,0,radius);
    marker.add(motif);
    const asset=multiply?'p00-mark-times':growth||retrigger||gold?undefined:'p00-mark-plus';
    if(asset&&this.textures.exists(asset))marker.add(this.add.image(x,y,asset).setDisplaySize(size*.67,size*.67));
    else marker.add(this.add.text(x,y,growth?'↗':retrigger?'↻':gold?'金':'＋',{fontFamily:UI_FONT,fontSize:`${Math.max(14,size*.55)}px`,fontStyle:'bold',color:'#f8e3af',resolution:Math.min(devicePixelRatio||1,2)}).setOrigin(.5));
  }
  private jokerValue(j:R2JokerInstance):string {
    const ops=getJoker(j.definitionId).hooks.flatMap(h=>h.operations),growth=ops.find(o=>o.kind==='read-growth'),op=ops.find(o=>o.kind!=='add-growth'&&'value' in o);
    if(growth?.kind==='read-growth')return '+'+fractionText(j.growth[growth.key]??{n:'0',d:'1'});
    if(op?.kind==='add-heat-per-gold'||op?.kind==='add-heat-per-empty-slot'){const count=op.kind==='add-heat-per-gold'?this.run.gold:Math.max(0,R2_LIMITS.jokerSlots-this.run.jokers.length),raw=Rational.fromJSON(op.value).multiply(new Rational(BigInt(count))),cap=Rational.fromJSON(op.cap);return '+'+fractionText((raw.compare(cap)>0?cap:raw).toJSON());}
    if(op&&'value' in op)return (op.kind==='multiply-multiplier'?'×':'+')+fractionText(op.value);
    const transaction=ops.find(o=>['add-gold','refund-discard'].includes(o.kind));if(transaction&&'amount' in transaction)return transaction.kind==='add-gold'?'+'+transaction.amount+'金':'返'+transaction.amount;
    const retrigger=ops.find(o=>o.kind==='retrigger-card');return retrigger?.kind==='retrigger-card'?'重触'+retrigger.count:'';
  }
  private roleCaption():string {return this.view.layout.compact&&this.stage.index%3===2?this.run.boss.definitionId+' '+r2BossText(this.run.boss).split('：')[0]:getCharacter(this.characterId).passiveName;}
  private cardPiece(card:PlayingCard,b:Box):CardView {
    const c=this.view.add(this.add.container(b.x+b.width/2,b.y+b.height/2)).setData('width',b.width).setData('height',b.height);
    const radius=Math.min(7,b.width*.09),shadow=this.add.graphics(),edgeGlow=this.add.graphics();
    shadow.fillStyle(0x10262e,.12).fillRoundedRect(-b.width/2+2,-b.height/2+6,b.width,b.height,radius);
    shadow.fillStyle(0x10262e,.2).fillRoundedRect(-b.width/2+1,-b.height/2+3,b.width,b.height,radius);
    edgeGlow.lineStyle(3,0xffe0a2,.95).strokeRoundedRect(-b.width/2-1,-b.height/2-1,b.width+2,b.height+2,radius).setAlpha(0);
    const bg=this.add.rectangle(0,0,b.width,b.height,T.paper).setStrokeStyle(1,T.brass);
    const face=this.view.material({x:-b.width/2+1,y:-b.height/2+1,width:b.width-2,height:b.height-2},0xfff8e8,0xe8d6b9,radius).setAlpha(.72);
    c.add([shadow,edgeGlow,bg,face]);
    if(this.textures.exists('p00-paper'))c.add(this.add.tileSprite(0,0,Math.max(1,b.width-10),Math.max(1,b.height-10),'p00-paper').setTilePosition(card.rank*17,SUITS.indexOf(card.suit)*37).setAlpha(.16));
    const edgeLines=this.add.graphics();
    edgeLines.lineStyle(1,0xfffdf1,.92).strokeRoundedRect(-b.width/2+2,-b.height/2+2,b.width-4,b.height-4,radius-1);
    edgeLines.lineStyle(1,0x967c5b,.48).beginPath().moveTo(-b.width/2+5,b.height/2-3).lineTo(b.width/2-5,b.height/2-3).strokePath();
    c.add(edgeLines);
    if(this.textures.exists('p00-frame-common'))c.add(this.add.image(0,0,'p00-frame-common').setDisplaySize(b.width,b.height).setAlpha(.32));
    const red=card.suit==='hearts'||card.suit==='diamonds',color=red?C.red:C.ink,small=b.width<90,edge=small?5:10,resolution=Math.min(devicePixelRatio||1,2);
    const pointSize=Math.min(small?17:26,b.width*.24,b.height*.19),label=this.add.text(-b.width/2+edge,-b.height/2+edge,rankLabel(card.rank)+'\n'+SUIT_SYMBOL[card.suit],{fontFamily:'Georgia,serif',fontSize:`${pointSize}px`,fontStyle:'bold',color,lineSpacing:-4,resolution});
    const suit=this.add.text(b.width*.08,b.height*.08,SUIT_SYMBOL[card.suit],{fontFamily:'Georgia,serif',fontSize:`${Math.min(54,b.width*.43,b.height*.3)}px`,color,resolution}).setOrigin(.5).setShadow(0,1,'#d9c6a7',1,true,false);
    const corner=this.add.text(b.width/2-edge,b.height/2-edge,rankLabel(card.rank)+(small?'':'\n'+SUIT_SYMBOL[card.suit]),{fontFamily:'Georgia,serif',fontSize:`${Math.min(small?13:20,b.width*.2,b.height*.14)}px`,fontStyle:'bold',color,lineSpacing:-4,resolution}).setOrigin(0,0).setAngle(180);
    const scoringMark=this.add.text(-b.width/2+edge,b.height/2-21,'★',{fontFamily:UI_FONT,fontSize:'14px',fontStyle:'bold',color:C.jade,resolution}).setVisible(false);
    c.add([label,suit,corner,scoringMark]);
    const back=this.textures.exists('p00-card-back')?this.add.image(0,0,'p00-card-back').setDisplaySize(b.width,b.height).setVisible(false):undefined;if(back)c.add(back);
    return {card,container:c,background:bg,scoringMark,back,edgeGlow};
  }
  private revealCard(view:CardView):void {
    if(!view.back?.visible)return;this.tweens.killTweensOf(view.back);view.back.setVisible(false);
    if(!this.presentation){this.tweens.killTweensOf(view.container);view.container.setScale(1);}
  }
  private revealDrawnCards(previousIds:readonly string[]):void {
    if(this.reducedMotion)return;
    this.cardViews.filter(view=>!previousIds.includes(view.card.id)&&view.back).forEach((view,i)=>{
      const back=view.back!,baseScale=back.scaleX;back.setVisible(true);
      this.tweens.add({targets:back,scaleX:0,duration:95,delay:i*28,ease:'Sine.easeIn',onComplete:()=>{
        if(!view.container.active||!this.cardViews.includes(view))return;back.setVisible(false).setScale(baseScale,back.scaleY);
        if(this.presentation||this.reducedMotion)return;
        this.tweens.add({targets:view.container,scaleX:{from:.2,to:1},duration:95,ease:'Sine.easeOut'});
      }});
    });
  }
  private renderHand():void {
    this.cardViews.forEach(v=>{v.hit?.destroy();v.container.destroy();});this.cardViews=[];const v=this.view,l=v.layout;
    this.hand.forEach((card,i)=>{
      const b=l.cards[i].visual,hit=l.cards[i].hit,cv=this.cardPiece(card,b);
      const target=v.rect(hit,T.ink).setFillStyle(T.ink,.001).setStrokeStyle(0);cv.hit=target;
      v.target(target,'card/'+card.id,{tap:()=>this.toggleCard(card.id),detail:()=>this.inspectCard(card.id),drag:x=>{this.endCardDrag();void this.reorderCard(card.id,x);},dragMove:(x,y)=>{
        if(!this.ready)return;v.root.bringToTop(cv.container);cv.container.setPosition(Phaser.Math.Clamp(x,l.hand.x+b.width/2,l.hand.x+l.hand.width-b.width/2),Phaser.Math.Clamp(y,l.hand.y,l.hand.y+l.hand.height)).setAngle(-3);
        const drop=l.cards.find(area=>x>=area.hit.x&&x<=area.hit.x+area.hit.width);
        this.dropMarker?.destroy();this.dropMarker=drop?v.rect({x:drop.hit.x-2,y:l.hand.y+2,width:4,height:l.hand.height-4},T.red).setStrokeStyle(0):undefined;
      },cancel:()=>this.endCardDrag()});this.cardViews.push(cv);
    });
    this.refreshSelection();
  }
  private endCardDrag():void {this.dropMarker?.destroy();this.dropMarker=undefined;if(!this.presentation)this.refreshSelection();}
  private refreshSelection(animateId?:string):void {
    const preview=!this.presentation&&this.selectedIds.size?this.preview():undefined;
    const active=this.presentation?.score.sets.activeScoringIds??preview?.sets.activeScoringIds??[],l=this.view.layout;
    const disabledIds=r2DisabledCards(this.run.boss,this.stage.index,this.hand),suppressed=this.presentation?.score.events.filter(e=>e.operation==='ordinary-points-suppressed').map(e=>e.targetCardId)??r2ScoreContext(this.run,this.hand,[...this.selectedIds]).ordinaryPointsSuppressedIds;
    this.cardViews.forEach((v,i)=>{
      const selected=this.selectedIds.has(v.card.id),scoring=active.includes(v.card.id),focused=document.activeElement===this.game.canvas&&i===this.focusIndex,b=l.cards[i].visual;
      if(!this.presentation){
        this.tweens.killTweensOf(v.container);v.container.setAngle(0).setAlpha(1).setScale(1);const y=b.y+b.height/2-(selected?20:0);
        if(animateId===v.card.id&&!this.reducedMotion)this.tweens.add({targets:v.container,x:b.x+b.width/2,y,duration:135,ease:'Back.easeOut'});else v.container.setPosition(b.x+b.width/2,y);
      }
      v.container.setData('selected',selected).setData('activeScoring',scoring);
      const disabled=disabledIds.includes(v.card.id),pointsZero=suppressed.includes(v.card.id);v.background.setFillStyle(disabled?0xd2d0cb:T.paper);
      v.background.setStrokeStyle(focused||selected||scoring?4:1,focused?T.brass:scoring?T.jade:selected?T.red:T.brass);
      v.edgeGlow?.setAlpha(focused?1:selected?0.85:0);
      v.scoringMark.setText(disabled?'失效':pointsZero?'点数0':'★').setVisible(disabled||pointsZero||scoring);
      if(v.hit)v.hit.input!.enabled=this.ready;
    });
    if(!this.presentation){this.previewSelection(preview);this.renderSelectedCards(preview);}
    this.updateControls();
  }
  private landingBoxes(count:number):Box[] {
    const p=this.view.layout.playedArea,bottomNote=this.view.layout.mode==='portrait'?22:0,h=Math.max(24,p.height-bottomNote-14),gap=8;
    const width=Math.min(106,h/1.4,(p.width-24-gap*(count-1))/Math.max(count,1)),height=width*1.4,total=count*width+(count-1)*gap;
    return Array.from({length:count},(_,i)=>({x:p.x+(p.width-total)/2+i*(width+gap),y:p.y+(p.height-bottomNote-height)/2,width,height}));
  }
  private renderSelectedCards(preview?:HandPreview):void {
    this.previewCards?.destroy();this.previewCards=this.view.add(this.add.container(0,0));const p=this.view.layout.playedArea;
    if(!preview){
      const text=this.add.text(p.x+p.width/2,p.y+(p.height-(this.view.layout.mode==='portrait'?22:0))/2,this.run.stage!.playIndex===0?'轻触选牌 · 最多 5 张\n弃牌换牌，出牌赚热度':'选择下一手\n排序与弃牌帮你凑牌型',{fontFamily:UI_FONT,fontSize:this.view.layout.mode==='landscape'?'14px':'18px',color:'#c5d6c0',align:'center',lineSpacing:8,resolution:Math.min(devicePixelRatio||1,2)}).setOrigin(.5);
      this.previewCards.add(text);return;
    }
    const cards=this.hand.filter(card=>this.selectedIds.has(card.id)),boxes=this.landingBoxes(cards.length);
    cards.forEach((card,i)=>{const cv=this.cardPiece(card,boxes[i]);this.previewCards!.add(cv.container);cv.container.setAlpha(.86);cv.background.setStrokeStyle(2,preview.sets.activeScoringIds.includes(card.id)?T.jade:T.brass);cv.scoringMark.setVisible(preview.sets.activeScoringIds.includes(card.id));});
  }
  private updateControls():void {
    this.view.setEnabled(this.rankButton,this.ready);this.view.setEnabled(this.suitButton,this.ready);
    (this.discardButton.getData('label') as Phaser.GameObjects.Text).setText(r2DiscardCost(this.run)===2?'弃牌 ×2':'弃牌');
    this.view.setEnabled(this.discardButton,this.ready&&this.selectedIds.size>0&&this.run.stage!.discardsLeft>=r2DiscardCost(this.run));
    this.view.setEnabled(this.playButton,this.ready&&this.selectedIds.size>0&&this.handsLeft>0);
    const forwardLabel=this.forwardButton.getData('label') as Phaser.GameObjects.Text;forwardLabel.setText(this.presentation?'快进结算':'上手详情');
    this.view.setEnabled(this.forwardButton,!!this.presentation||this.ready&&!!this.run.lastTrace);
    const reason=this.playing?'正在结算 · 可快进':!this.selectedIds.size?'选 1～5 张牌后出牌 / 弃牌':this.run.stage!.discardsLeft<r2DiscardCost(this.run)?'弃牌次数已用完':this.handsLeft<=0?'出牌次数已用完':'已选 '+this.selectedIds.size+' / 5';
    this.statusText.setText(this.statusMessage||reason);
  }
  private preview(){
    const stage=this.run.stage!;
    return previewR2Hand({rulesVersion:'r2',runId:this.run.runId,rootId:'preview',characterId:this.characterId,hand:this.hand,selectedIds:[...this.selectedIds],disabledIds:stage.disabledIds,jokers:this.run.jokers,definitions:R2_JOKERS,handLevels:this.run.handLevels,playIndex:stage.playIndex+1,handsBeforePlay:stage.handsLeft,previousHandType:stage.previousHandType,wager:stage.wagerSelected,...r2ScoreContext(this.run,this.hand,[...this.selectedIds])});
  }
  private inspectCard(id:string):void {
    const c=this.hand.find(c=>c.id===id);if(!c)return;
    this.dialog.open(rankLabel(c.rank)+SUIT_SYMBOL[c.suit]+' · 手牌详情',(this.selectedIds.has(id)?'已选中':'未选中')+'；'+(this.cardViews.find(v=>v.card.id===id)?.container.getData('activeScoring')?'本手计分牌':'本手不计分或尚未预览')+'\n增强：'+(c.enhancement??'无')+'\n长按只查看，不会选牌或出牌。',[{label:this.selectedIds.has(id)?'取消选择':'选择此牌',disabled:!this.ready,run:()=>{this.toggleCard(id);this.dialog.close();}}]);
  }
  private inspectRole():void {
    const c=getCharacter(this.characterId),stage=this.run.stage!,body=c.passiveDescription+'\n'+(this.characterId==='xiemu'?(stage.handsLeft===1?'当前为最后一手：倍率 ×2，过关额外 +2 金。':'距离最后一手还有 '+(stage.handsLeft-1)+' 次。'):this.characterId==='touye'?(stage.wagerUsed?'本场押注已用。':stage.wagerSelected?'本手已押注：50% ×2 / 50% ×0.75。':'本场押注未用；默认倍率 ×1.15。'):'')+'\n'+this.stage.name+'：'+this.stage.intro+'\n'+(stage.index%3===2?'本场压轴':'本章压轴预告')+' '+this.run.boss.definitionId+' · '+r2BossText(this.run.boss)+'\n失效牌仍参与牌型。弃牌成本：'+r2DiscardCost(this.run)+'；本场已弃 '+stage.discardsUsed+' 次。';
    const dialog=this.dialog.open(c.name+' · 角色与本场规则',body,[{label:'查看物品',run:()=>showConsumables(this.dialog,this.run,this.ready,a=>this.command(a))},...(this.characterId==='touye'?[{label:stage.wagerSelected?'取消本手押注':'押注本手',disabled:!this.ready||stage.wagerUsed,run:async()=>{await this.command({type:'SetWager',enabled:!stage.wagerSelected});if(this.dialog.active(dialog))this.inspectRole();}}]:[])]);
  }
  private inspectJoker(id:string):void {
    const j=this.run.jokers.find(j=>j.instanceId===id);if(!j)return;const d=getJoker(j.definitionId),index=this.run.jokers.indexOf(j);
    const move=async(delta:number)=>{const ids=this.run.jokers.map(j=>j.instanceId);ids.splice(index,1);ids.splice(index+delta,0,id);await this.command({type:'ReorderJokers',ids});if(this.dialog.active(dialog))this.inspectJoker(id);};
    const dialog=this.dialog.open(d.name,(d.rarity==='rare'?'★ 稀有':d.rarity==='uncommon'?'◇ 罕见':'□ 普通')+' · 当前 '+this.jokerValue(j)+'\n'+d.description+'\n当前成长：'+(Object.entries(j.growth).map(([k,value])=>k+' '+fractionText(value)).join('、')||'无')+'\n第 '+(index+1)+' 个结算；长按后拖动可调序，出售只在商店确认。',[
      {label:'左移',disabled:!this.ready||index===0,run:()=>move(-1)},{label:'右移',disabled:!this.ready||index===this.run.jokers.length-1,run:()=>move(1)},
    ]);
  }
  private inspectDeck():void {
    const state=this.run,dialog=this.dialog.open('牌组查看',''),content=dialog.querySelector('p')!,controls=document.createElement('div');
    const scope=document.createElement('select'),enhancement=document.createElement('select');
    for(const [value,label] of [['remaining','剩余牌堆'],['all','全部牌组']]){const o=document.createElement('option');o.value=value;o.textContent=label;scope.append(o);}
    for(const [value,label] of [['all','所有增强'],['none','无增强'],['enhanced','有增强']]){const o=document.createElement('option');o.value=value;o.textContent=label;enhancement.append(o);}
    scope.setAttribute('aria-label','牌组范围');enhancement.setAttribute('aria-label','增强筛选');controls.append(scope,enhancement);content.before(controls);
    const render=()=>{
      const cards=state.deckInstances.filter(c=>(scope.value==='all'||state.drawPile.includes(c.id))&&(enhancement.value==='all'||(enhancement.value==='none'?!c.enhancement:!!c.enhancement))).sort((a,b)=>SUITS.indexOf(a.suit)-SUITS.indexOf(b.suit)||a.rank-b.rank);
      content.textContent='按花色与点数统计，不展示抽牌顺序。\n'+SUITS.map(s=>SUIT_SYMBOL[s]+' '+cards.filter(c=>c.suit===s).length).join(' · ')+'\n'+cards.map(c=>rankLabel(c.rank)+SUIT_SYMBOL[c.suit]+(state.playedPile.includes(c.id)?' 已打出':state.discardPile.includes(c.id)?' 已弃':state.handOrder.includes(c.id)?' 手牌':'' )+(c.enhancement?' '+c.enhancement:'')).join('、');
    };scope.onchange=render;enhancement.onchange=render;render();
  }
  private async command(action:import('../domain/run').Action):Promise<boolean> {
    if(!this.ready)return false;this.playing=true;const lifecycle=this.lifecycle,intent=++this.intent;this.updateControls();
    try{const result=await dispatchRun(this,action);if(!this.alive(lifecycle,intent))return false;if(result.ok){this.run=result.state;this.statusMessage='';if(action.type==='ReorderHand')this.renderHand();else if(action.type==='ReorderJokers')this.render();else if(action.type==='UseConsumable'){this.updateHud();this.renderHand();}return true;}else{this.statusMessage='操作未提交：'+result.code;return false;}}
    finally{if(this.alive(lifecycle,intent)){this.playing=false;this.refreshSelection();}}
  }
  private async sortHand(mode:'rank'|'suit'):Promise<void> {
    const cards=[...this.hand].sort((a,b)=>mode==='rank'?b.rank-a.rank||SUITS.indexOf(a.suit)-SUITS.indexOf(b.suit):SUITS.indexOf(a.suit)-SUITS.indexOf(b.suit)||b.rank-a.rank);
    if(await this.command({type:'ReorderHand',ids:cards.map(c=>c.id)})){this.statusMessage=(mode==='rank'?'点数':'花色')+'已排序 · 选择已保留';this.updateControls();}
  }
  private async reorderCard(id:string,x:number):Promise<void> {const ids=[...this.run.handOrder],from=ids.indexOf(id),to=this.view.layout.cards.findIndex(b=>x>=b.hit.x&&x<=b.hit.x+b.hit.width);if(from<0||to<0||to>=ids.length||from===to)return;ids.splice(from,1);ids.splice(to,0,id);await this.command({type:'ReorderHand',ids});}
  private async reorderJoker(id:string,x:number):Promise<void> {const ids=this.run.jokers.map(j=>j.instanceId),from=ids.indexOf(id),l=this.view.layout,to=l.slots.findIndex((b,i)=>x>=b.x&&x<=b.x+b.width+(l.mode==='landscape'?l.jokerLabels[i].width+6:0));if(to<0||to>=ids.length||from===to)return;ids.splice(from,1);ids.splice(to,0,id);await this.command({type:'ReorderJokers',ids});}

  private toggleCard(id: string): void {
    if (!this.ready) return;
    const view=this.cardViews.find(view=>view.card.id===id);if(view)this.revealCard(view);
    this.statusMessage='';
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);this.audio.deselect();
    } else {
      if (this.selectedIds.size >= MAX_SELECTED) {this.statusMessage='每手最多选择 5 张牌';this.audio.invalid();this.updateControls();return;}
      this.selectedIds.add(id);this.audio.select();
    }
    this.refreshSelection(id);
  }

  private alive(lifecycle:number,intent:number):boolean {return lifecycle===this.lifecycle&&intent===this.intent&&this.scene.isActive();}

  private wait(ms:number,context:EffectContext):Promise<void> {
    return new Promise(resolve=>{
      if(context.signal.aborted){resolve();return;}
      const finish=()=>{context.signal.removeEventListener('abort',cancel);resolve();};
      const timer=this.time.delayedCall(ms,finish),cancel=()=>{timer.remove(false);finish();};
      context.signal.addEventListener('abort',cancel,{once:true});
    });
  }

  private animate(config:Phaser.Types.Tweens.TweenBuilderConfig,context:EffectContext):Promise<void> {
    return new Promise(resolve=>{
      if(context.signal.aborted){resolve();return;}
      const finish=()=>{context.signal.removeEventListener('abort',cancel);resolve();};
      const tween=this.tweens.add({...config,onComplete:finish}),cancel=()=>{tween.remove();finish();};
      context.signal.addEventListener('abort',cancel,{once:true});
    });
  }

  private animateRole(note:string,duration:number,context:EffectContext):Promise<void> {
    const frame=this.roleFrame;this.roleText.setText(note);frame.setFillStyle(T.brass,.16).setStrokeStyle(4,T.brass);
    return this.focusSource(this.roleAvatar,frame,T.brass,false,duration,context).then(()=>{if(frame.active)frame.setFillStyle(T.brass,0).setStrokeStyle(1,T.brass,.6);});
  }

  private animateJoker(joker:ScoreEvent,duration:number,context:EffectContext):Promise<void> {
    const view=this.jokerViews.get(joker.sourceInstanceId);if(!view)return this.wait(duration,context);
    const frame=view.getData('frame') as Phaser.GameObjects.Rectangle,multiply=joker.operation==='multiply-multiplier';frame.setStrokeStyle(4,multiply?T.red:T.brass);
    return this.focusSource(view,frame,multiply?T.red:T.brass,multiply,duration,context).then(()=>{if(frame.active)frame.setStrokeStyle(2,T.jade);});
  }
  private async focusSource(source:Phaser.GameObjects.Container,frame:Phaser.GameObjects.Rectangle,color:number,strong:boolean,duration:number,context:EffectContext):Promise<void> {
    if(context.signal.aborted)return;
    if(this.reducedMotion){await this.wait(duration,context);return;}
    const rest={y:source.y,angle:source.angle,scaleX:source.scaleX,scaleY:source.scaleY},width=frame.width,height=frame.height,top=frame.getBounds().y,lift=Math.min(strong?16:12,height*.14,Math.max(0,top-8)*.5),factor=top<24?1.035:strong?1.1:1.055,glow=this.add.graphics();
    glow.fillStyle(color,.2).fillRoundedRect(-width/2-5,-height/2-5,width+10,height+10,7);
    glow.lineStyle(strong?4:3,0xffdc9e,.95).strokeRoundedRect(-width/2-3,-height/2-3,width+6,height+6,6);source.addAt(glow,0);
    try {
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
    this.scoreLabels.forEach((label,i)=>label.setText(['基础热度','基础倍率','预计本手'][i]));
    if(!preview){
      this.resultText.setText('当前选择 · 选 1～5 张牌');this.scoreHeat.setText('—');this.scoreMult.setText('× —');this.scoreTotal.setText('—');
      this.breakdownText.setText('距目标还需 '+heatText((BigInt(this.stage.targetHeat)>BigInt(this.heat)?BigInt(this.stage.targetHeat)-BigInt(this.heat):0n).toString())+' 热度 · ★ 为计分牌');
      return;
    }
    this.resultText.setText('当前选择 · '+HAND_LABELS[preview.handType]+' Lv.'+preview.level);
    this.scoreHeat.setText(fractionText(preview.base.H));this.scoreMult.setText('× '+fractionText(preview.base.M));
    this.scoreTotal.setText(preview.possibleScores.length===2?'押注':heatText(preview.possibleScores[0]));
    this.breakdownText.setText(preview.possibleScores.length===2?'50% '+heatText(preview.possibleScores[0])+' / 50% '+heatText(preview.possibleScores[1]):'★ '+preview.sets.activeScoringIds.length+' 张计分 · 共选 '+this.selectedIds.size+' / 5 张');
  }

  private async discardSelected():Promise<void> {
    if(!this.ready||!this.selectedIds.size||this.run.stage!.discardsLeft<r2DiscardCost(this.run))return;this.playing=true;this.statusMessage='';this.updateControls();const lifecycle=this.lifecycle,intent=++this.intent,selectedIds=[...this.selectedIds],previousIds=[...this.run.handOrder];
    try {
      const result=await dispatchRun(this,{type:'DiscardHand',selectedIds});
      if(!this.alive(lifecycle,intent))return;
      if(!result.ok){this.statusMessage=result.code==='no-discards-left'?'本场弃牌次数已用完':result.code==='save-failed'?'未保存，请在菜单中重试或导出':'请选择 1～5 张牌再弃牌';return;}
      const discarded=this.cardViews.filter(view=>selectedIds.includes(view.card.id));
      this.run=result.state;this.audio.discard();this.effects.clear();
      this.effects.enqueue(context=>Promise.all(discarded.map((view,i)=>this.animate({targets:view.container,x:view.container.x+24,y:view.container.y-32,angle:8,alpha:0,duration:this.reducedMotion?20:170,delay:this.reducedMotion?0:i*15,ease:'Sine.easeIn'},context))).then(()=>undefined));
      await this.effects.drain();if(!this.alive(lifecycle,intent))return;
      this.selectedIds.clear();this.statusMessage='已弃 '+selectedIds.length+' 张 · '+(this.deck.length?'补抽完成':'牌堆已空');this.updateHud();this.renderHand();this.revealDrawnCards(previousIds);
      if(this.run.phase==='run-lost')this.finishStage(false);
    } finally {if(this.alive(lifecycle,intent)&&this.run.phase==='await-input'){this.playing=false;this.refreshSelection();}}
  }

  private async playSelected():Promise<void> {
    if(!this.ready||this.selectedIds.size===0||this.handsLeft<=0)return;
    const selectedIds=[...this.selectedIds],lifecycle=this.lifecycle,intent=++this.intent,beforeHeat=this.heat,previousTrace=this.run.lastTrace;
    this.playing=true;this.statusMessage='';this.updateControls();
    const selectedViews=this.cardViews.filter(v=>selectedIds.includes(v.card.id));
    try {
      const result=await dispatchRun(this,{type:'PlayHand',selectedIds});
      if(!this.alive(lifecycle,intent))return;
      if(!result.ok||result.duplicate){if(!result.ok)this.statusMessage=result.code==='save-failed'?'未保存，请在菜单中重试或导出':result.code==='score-diagnostic'?'本手无法结算，资源与原状态已保留':'出牌未提交，请查看菜单或选择。';return;}
      this.run=result.state;
      const event=result.events.find(e=>e.type==='hand-scored-r2');if(!event||event.type!=='hand-scored-r2')throw Error('Successful play missing score event');
      this.triggers.emit('hand:played',event.score.sets);
      await this.presentTrace(event.score,result.state,selectedViews,lifecycle,intent,beforeHeat,false,previousTrace);
    } finally {
      if(this.alive(lifecycle,intent)&&this.run.phase==='await-input'&&!this.presentation){this.playing=false;this.refreshSelection();}
    }
  }

  private operationText(event:ScoreEvent):string {
    const value=fractionText(event.value);
    if(event.operation==='ordinary-points-suppressed')return '普通点数归零';
    if(event.operation==='retrigger-card')return '返场 ×'+value;
    if(event.operation==='retrigger-cap')return '返场达到上限';
    if(event.operation==='add-growth')return '成长 +'+value+' · 下手生效';
    if(event.operation==='multiply-multiplier')return '×'+value+' 倍率';
    const heatChanged=event.before.H.n!==event.after.H.n||event.before.H.d!==event.after.H.d;
    return '+'+value+(heatChanged||event.operation==='add-heat'?' 热度':' 倍率');
  }
  private eventSource(event:ScoreEvent):string {
    if(event.sourceType==='joker')return getJoker(event.sourceDefinitionId).name;
    if(event.sourceType==='character')return getCharacter(this.characterId).name;
    const card=this.run.deckInstances.find(card=>card.id===event.targetCardId);
    return event.sourceDefinitionId==='B02'?'低调点':card?rankLabel(card.rank)+SUIT_SYMBOL[card.suit]:'计分牌';
  }
  private setAccumulator(value:Accumulator):void {
    this.scoreHeat.setText(fractionText(value.H));this.scoreMult.setText('× '+fractionText(value.M));
    this.scoreTotal.setText(heatText(Rational.fromJSON(value.H).multiply(Rational.fromJSON(value.M)).floor().toString()));
  }
  private floatNote(note:string,x:number,y:number,color:string,duration:number,context:EffectContext):Promise<void> {
    const group=this.view.add(this.add.container(x,y)),text=this.add.text(0,0,note,{fontFamily:UI_FONT,fontSize:this.view.layout.mode==='desktop'?'22px':'18px',fontStyle:'bold',color,resolution:Math.min(devicePixelRatio||1,2)}).setOrigin(.5).setShadow(0,1,'#071d24',2,true,true);
    const width=text.width+16,height=text.height+8,plate=this.view.material({x:-width/2,y:-height/2,width,height},0x30545a,0x17323c,5).setAlpha(.94);
    const edge=this.add.graphics().lineStyle(1,0xc9d1b0,.65).strokeRoundedRect(-width/2,-height/2,width,height,5);
    group.add([plate,edge,text]);this.keepScoreReadable();
    return this.animate({targets:group,y:y-(this.reducedMotion?0:22),alpha:{from:1,to:0},duration,ease:'Sine.easeOut'},context).then(()=>group.destroy());
  }
  private pulseAccumulator(event:ScoreEvent,duration:number,context:EffectContext):Promise<void> {
    if(this.reducedMotion)return Promise.resolve();
    const targets=[];
    if(event.before.H.n!==event.after.H.n||event.before.H.d!==event.after.H.d)targets.push(this.scoreHeat);
    if(event.before.M.n!==event.after.M.n||event.before.M.d!==event.after.M.d)targets.push(this.scoreMult);
    return targets.length?this.animate({targets,scale:{from:event.operation==='multiply-multiplier'?1.3:1.15,to:1},duration,ease:'Back.easeOut'},context):Promise.resolve();
  }
  private impactAccumulator(event:ScoreEvent,duration:number,context:EffectContext):Promise<void> {
    if(this.reducedMotion||context.signal.aborted)return Promise.resolve();
    const multChanged=event.before.M.n!==event.after.M.n||event.before.M.d!==event.after.M.d,heatChanged=event.before.H.n!==event.after.H.n||event.before.H.d!==event.after.H.d;
    if(!multChanged&&!heatChanged)return Promise.resolve();
    const target=multChanged?this.scoreMult:this.scoreHeat,b=target.getBounds(),strong=event.operation==='multiply-multiplier',width=Math.min(this.view.layout.scoreBoard.width/3-18,Math.max(42,b.width+16)),height=b.height+8;
    const impact=this.view.add(this.add.graphics().setPosition(b.centerX,b.centerY));
    impact.fillStyle(strong?T.red:multChanged?T.jade:T.brass,.18).fillRoundedRect(-width/2,-height/2,width,height,5);
    impact.lineStyle(strong?3:2,strong?0xffd3a6:0xc7f1d8,.95).strokeRoundedRect(-width/2,-height/2,width,height,5);
    if(strong)for(const [x,y] of [[-1,-1],[1,-1],[-1,1],[1,1]])impact.lineStyle(2,T.brass,.9).beginPath().moveTo(x*width*.54,y*height*.54).lineTo(x*width*.65,y*height*.72).strokePath();
    this.keepScoreReadable();return this.animate({targets:impact,scale:{from:.75,to:strong?1.18:1.06},alpha:{from:1,to:0},duration,ease:'Cubic.easeOut'},context).then(()=>impact.destroy());
  }
  private keepScoreReadable():void {
    for(const text of [this.resultText,...this.scoreLabels,this.scoreHeat,this.scoreMult,this.scoreTotal,this.breakdownText,this.previousHandText])if(text.active)this.view.root.bringToTop(text);
  }
  private transferToAccumulator(event:ScoreEvent,card:CardView|undefined,duration:number,context:EffectContext):Promise<void> {
    if(this.reducedMotion||context.signal.aborted)return Promise.resolve();
    const heatChanged=event.before.H.n!==event.after.H.n||event.before.H.d!==event.after.H.d,multChanged=event.before.M.n!==event.after.M.n||event.before.M.d!==event.after.M.d;
    if(!heatChanged&&!multChanged)return Promise.resolve();
    const jokerFrame=this.jokerViews.get(event.sourceInstanceId)?.getData('frame') as Phaser.GameObjects.Rectangle|undefined;
    const source=event.sourceType==='joker'?jokerFrame:event.sourceType==='character'?this.roleFrame:card?.background;
    if(!source)return Promise.resolve();
    const b=source.getBounds(),target=multChanged?this.scoreMult:this.scoreHeat,start={x:b.centerX,y:b.centerY},end={x:target.x,y:target.y-7};
    const multiply=event.operation==='multiply-multiplier',color=multiply?T.red:multChanged?T.jade:T.brass,light=multiply?0xffb995:multChanged?0xc4f0d8:0xffdf9d;
    const mid={x:(start.x+end.x)/2+(start.x<end.x?-22:22),y:(start.y+end.y)/2-22},trail=this.view.add(this.add.graphics());
    trail.lineStyle(multiply?4:2,color,.72).beginPath().moveTo(start.x,start.y);
    for(let i=1;i<=16;i++){const t=i/16,u=1-t;trail.lineTo(u*u*start.x+2*u*t*mid.x+t*t*end.x,u*u*start.y+2*u*t*mid.y+t*t*end.y);}trail.strokePath();
    const packet=this.view.add(this.add.container(start.x,start.y)),shape=this.add.graphics();
    if(multiply){shape.fillStyle(0x762f32,.96).fillPoints([{x:0,y:-15},{x:20,y:0},{x:0,y:15},{x:-20,y:0}],true);shape.lineStyle(2,T.brass,.9).strokePoints([{x:0,y:-15},{x:20,y:0},{x:0,y:15},{x:-20,y:0}],true);}
    else shape.fillStyle(multChanged?0x285a54:0x715736,.96).fillRoundedRect(-18,-13,36,26,10).lineStyle(1,light,.85).strokeRoundedRect(-18,-13,36,26,10);
    const symbol=this.add.text(0,-1,multiply?'×M':multChanged?'+M':'+H',{fontFamily:UI_FONT,fontSize:multiply?'18px':'16px',fontStyle:'bold',color:'#fff3d0',resolution:Math.min(devicePixelRatio||1,2)}).setOrigin(.5);
    packet.add([shape,symbol]);this.keepScoreReadable();
    const flight={t:0};
    return Promise.all([
      this.animate({targets:flight,t:1,duration,ease:multiply?'Cubic.easeIn':'Sine.easeInOut',onUpdate:()=>{const t=flight.t,u=1-t;packet.setPosition(u*u*start.x+2*u*t*mid.x+t*t*end.x,u*u*start.y+2*u*t*mid.y+t*t*end.y).setScale(1-t*.4).setAlpha(1-t*.55);}},context),
      this.animate({targets:trail,alpha:{from:1,to:0},duration,ease:'Sine.easeIn'},context),
    ]).then(()=>{packet.destroy();trail.destroy();});
  }
  private async showScoreEvent(event:ScoreEvent,index:number,duration:number,context:EffectContext):Promise<void> {
    if(context.signal.aborted)return;
    const note=this.operationText(event),source=this.eventSource(event),card=this.settledCards.get(event.targetCardId??'')??this.cardViews.find(view=>view.card.id===event.targetCardId);
    this.resultText.setText(source+' · '+note);this.breakdownText.setText((event.phase==='afterHand'?'下手成长':event.sourceType==='joker'?'连锁 '+(index+1):'逐项计分')+' · '+source+' '+note);this.setAccumulator(event.before);
    const sourceEffects:Promise<void>[]=[];
    if(event.sourceType==='character'){
      this.triggers.emit('role:triggered',event);sourceEffects.push(this.animateRole(note,duration,context));
    }else if(event.sourceType==='joker'){
      this.triggers.emit('joker:triggered',event);sourceEffects.push(this.animateJoker(event,duration,context));
    }else if(card){
      card.background.setStrokeStyle(4,event.retriggerDepth?T.brass:T.jade);
      sourceEffects.push(this.focusSource(card.container,card.background,event.retriggerDepth?T.brass:T.jade,false,duration,context));
    }
    if(!this.reducedMotion)await this.wait(duration*.24,context);
    if(context.signal.aborted)return;
    await this.transferToAccumulator(event,card,duration*.42,context);
    if(context.signal.aborted)return;
    // The domain result is already saved. Only the display and SFX arrive with this hit.
    this.setAccumulator(event.after);
    if(event.sourceType==='character')this.audio.role();
    else if(event.sourceType==='joker')this.audio.joker(index);
    else if(event.sourceType==='card'&&event.value.n!=='0')this.audio.cardScore(index);
    if(event.operation==='multiply-multiplier')this.audio.multiplier('multiply',index);
    else if(event.operation==='add-multiplier'||event.operation==='read-growth'&&(event.before.M.n!==event.after.M.n||event.before.M.d!==event.after.M.d))this.audio.multiplier('add',index);
    else if(event.operation==='retrigger-card')this.audio.retrigger(index);
    const impactDuration=this.reducedMotion?Math.min(110,duration):duration*.34;
    const effects=[...sourceEffects,this.pulseAccumulator(event,impactDuration,context),this.impactAccumulator(event,impactDuration,context),this.wait(impactDuration,context)];
    if(card&&event.sourceType!=='joker'&&event.sourceType!=='character')effects.push(this.floatNote(note,card.container.x,card.container.y,'#d3f0d3',impactDuration,context));
    await Promise.all(effects);
  }
  private burst(tier:number,context:EffectContext):Promise<void> {
    if(this.reducedMotion||tier===0)return Promise.resolve();
    const p=this.view.layout.playedArea,count=tier===3?24:tier===2?16:8;
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
    const target=BigInt(this.stage.targetHeat),points=BigInt(score.finalScore),chain=score.events.filter(event=>event.sourceType==='joker'&&event.phase!=='afterHand').length;
    const previous=BigInt(presentation.previousTrace?.finalScore??'0'),grew=previous===0n||points>=previous*2n;
    const tier=points>=target&&chain>=3&&grew?3:points*3n>=target*2n?2:points*3n>=target?1:0;
    await this.convergeScore(context);if(context.signal.aborted)return;
    this.triggers.emit('score:resolved',score);this.setAccumulator(score.accumulator);this.scoreTotal.setText(heatText(score.finalScore));
    this.resultText.setText((presentation.replay?'回看 · ':tier>=2?'爆场！ ':HAND_LABELS[score.handType]+' · ')+'+'+heatText(score.finalScore)+' 热度');
    this.breakdownText.setText(fractionText(score.accumulator.H)+' 热度 × '+fractionText(score.accumulator.M)+' 倍率 = '+heatText(score.finalScore));
    presentation.displayHeat=presentation.state.stage!.heat;presentation.credited=true;this.updateHud();this.audio.score(Math.min(tier,2));
    if(!this.reducedMotion&&tier>=2){this.cameras.main.shake(150,tier===3?.0025:.0015);try{navigator.vibrate?.(tier===3?[15,25,15]:15);}catch{/* Optional haptics never block presentation. */}}
    const effects:Promise<void>[]=[this.burst(tier,context),this.shockwave(tier,context)];
    if(!this.reducedMotion)effects.push(this.animate({targets:this.scoreTotal,scale:{from:tier>=2?1.18:1.06,to:1},duration:310,ease:'Back.easeOut'},context));
    const p=this.view.layout.playedArea;
    if(tier>0&&p.height>=110&&!this.reducedMotion){
      const width=Math.min(280,p.width-28),stamp=this.view.add(this.add.container(p.x+p.width/2,p.y+p.height/2+14));
      const face=this.view.material({x:-width/2,y:-34,width,height:68},0x344e53,0x172c34,7),edge=this.add.graphics();
      edge.lineStyle(2,0xe6c58b,.95).strokeRoundedRect(-width/2,-34,width,68,7);
      edge.lineStyle(1,0x92744c,.75).strokeRoundedRect(-width/2+4,-30,width-8,60,4);
      const caption=this.add.text(0,-26,presentation.replay?'已入账 · 回看':'热度入账',{fontFamily:UI_FONT,fontSize:'14px',color:'#e5c88f',resolution:Math.min(devicePixelRatio||1,2)}).setOrigin(.5,0);
      const number=this.add.text(0,-5,'+'+heatText(score.finalScore),{fontFamily:UI_FONT,fontSize:'36px',fontStyle:'bold',color:'#fff0cf',resolution:Math.min(devicePixelRatio||1,2)}).setOrigin(.5,0).setShadow(0,2,'#091c24',2,true,true);
      if(number.width>width-20)number.setScale((width-20)/number.width);
      stamp.add([face,edge,caption,number]);this.keepScoreReadable();
      effects.push((async()=>{await this.animate({targets:stamp,scale:{from:.86,to:1},duration:130,ease:'Back.easeOut'},context);await this.wait(180,context);await this.animate({targets:stamp,alpha:0,y:stamp.y-8,duration:140},context);stamp.destroy();})());
    }
    effects.push(this.wait(tier>=2?450:240,context));await Promise.all(effects);
  }
  private convergeScore(context:EffectContext):Promise<void> {
    if(this.reducedMotion||context.signal.aborted)return Promise.resolve();
    const target=this.scoreTotal.getBounds(),end={x:target.centerX,y:target.centerY};
    const effects=[this.scoreHeat,this.scoreMult].map((source,i)=>{
      const b=source.getBounds(),color=i===0?0x95d9bb:0xf1ad86,line=this.view.add(this.add.graphics().lineStyle(1,color,.65).beginPath().moveTo(b.centerX,b.centerY).lineTo(end.x,end.y).strokePath()),spark=this.view.add(this.add.circle(b.centerX,b.centerY,4,color).setStrokeStyle(1,0xffebc4));
      return this.animate({targets:spark,x:end.x,y:end.y,scale:{from:1,to:.55},duration:140,ease:'Sine.easeIn'},context).then(()=>{spark.destroy();line.destroy();});
    });this.keepScoreReadable();return Promise.all(effects).then(()=>undefined);
  }
  private async presentTrace(score:ScoreTrace,state:RunState,views:readonly CardView[],lifecycle:number,intent:number,beforeHeat=this.heat,replay=false,previousTrace:ScoreTrace|null=this.run.lastTrace):Promise<void> {
    this.effects.clear();const generation=this.effects.generation;
    const hand=this.cardViews.map(view=>view.card),presentation={generation,lifecycle,intent,state,score,hand,displayHeat:beforeHeat,replay,previousTrace,credited:replay};this.presentation=presentation;
    this.refreshSelection();this.updateHud();this.previewCards?.destroy();this.previewCards=undefined;
    this.scoreLabels.forEach((label,i)=>label.setText(['累计热度','当前倍率','本手得分'][i]));this.resultText.setText((replay?'回看 · ':'打出 · ')+HAND_LABELS[score.handType]);
    this.settledCards.clear();const boxes=this.landingBoxes(score.sets.playedIds.length);
    const landing=score.sets.playedIds.map((id,i)=>{
      const view=views.find(view=>view.card.id===id)??this.cardPiece(state.deckInstances.find(card=>card.id===id)!,boxes[i]);
      this.settledCards.set(id,view);view.hit?.disableInteractive();return {view,box:boxes[i]};
    });
    this.effects.enqueue(async context=>{
      this.audio.playHand();
      await Promise.all(landing.map(async({view,box},i)=>{
        const sx=box.width/Number(view.container.getData('width')),sy=box.height/Number(view.container.getData('height'));
        if(this.reducedMotion){view.container.setPosition(box.x+box.width/2,box.y+box.height/2).setScale(sx,sy);return;}
        await this.animate({targets:view.container,x:box.x+box.width/2,y:box.y+box.height/2,scaleX:sx,scaleY:sy,angle:0,duration:220,delay:i*20,ease:'Cubic.easeOut'},context);
        if(!context.signal.aborted)await this.animate({targets:view.container,scaleX:{from:sx*.1,to:sx},duration:80,ease:'Sine.easeOut'},context);
      }));
      if(context.signal.aborted)return;this.setAccumulator(score.events[0].after);this.breakdownText.setText('牌型 '+HAND_LABELS[score.handType]+' · ★ '+score.sets.activeScoringIds.length+' 张计分');
    });
    const duration=Math.max(160,Math.min(300,3600/Math.max(1,score.events.length-2)));let jokerIndex=0;
    for(const event of score.events){
      if(event.phase==='base')continue;
      if(event.phase==='finalScore'){this.effects.enqueue(context=>this.award(score,presentation,context));continue;}
      const index=event.sourceType==='joker'?jokerIndex++:event.sourceType==='character'?0:score.sets.activeScoringIds.indexOf(event.targetCardId??'');
      const beat=duration*(event.operation==='multiply-multiplier'?1.4:event.sourceType==='joker'?1.25:event.sourceType==='character'?1.15:1);
      this.effects.enqueue(context=>this.showScoreEvent(event,Math.max(0,index),beat,context));
    }
    let failed=false;
    try {await this.effects.drain();}
    catch {failed=true;if(this.alive(lifecycle,intent))this.resultText.setText('演出已停止，确定结果已保存。');}
    if(this.alive(lifecycle,intent)&&this.presentation===presentation&&(failed||this.effects.isCurrent(generation)))this.completePresentation(presentation);
  }

  private completePresentation(presentation:NonNullable<GameScene['presentation']>):void {
    if(!this.alive(presentation.lifecycle,presentation.intent))return;
    this.presentation=undefined;this.run=presentation.state;this.selectedIds.clear();this.updateHud();
    if(this.run.phase==='stage-cleared'||this.run.phase==='run-won'){this.finishStage(true);return;}
    if(this.run.phase==='run-lost'){this.finishStage(false);return;}
    this.playing=false;this.render();this.revealDrawnCards(presentation.hand.map(card=>card.id));
  }

  fastForward():void {const presentation=this.presentation;if(!presentation)return;this.effects.clear();this.audio.cancelPresentation();this.completePresentation(presentation);}
  replayLastTrace():void {
    if(this.playing||!this.run.lastTrace)return;
    this.playing=true;this.playButton.disableInteractive();const intent=++this.intent;
    void this.presentTrace(this.run.lastTrace,this.run,[],this.lifecycle,intent,this.heat,true);
  }
  private inspectLastTrace():void {
    const score=this.run.lastTrace;if(!score)return;
    this.dialog.open('上手已入账 · '+HAND_LABELS[score.handType]+' +'+heatText(score.finalScore),this.formatBreakdown(score)+'\n\n'+score.events.filter(event=>event.phase!=='base'&&event.phase!=='finalScore').map(event=>this.eventSource(event)+' '+this.operationText(event)+' → 热度 '+fractionText(event.after.H)+' / 倍率 '+fractionText(event.after.M)).join('\n'),[{label:'回看演出',disabled:!this.ready,run:()=>{this.dialog.close();this.replayLastTrace();}}]);
  }

  /** 本关结束：先让玩家看清结果，再进入明确的过场状态 */
  private finishStage(cleared: boolean): void {
    this.playing=true;this.playButton.disableInteractive();
    const lifecycle=this.lifecycle,handsLeft=this.handsLeft;
    const completedIndex = this.run.stage!.index;
    const stageHeat = this.heat;
    const goldEarned = this.run.stage!.goldEarned;

    if (cleared) {
      this.resultText.setText(`过关 · ${heatText(stageHeat)} 热度`);

    } else {
      this.resultText.setText(
        `冷场 · 差 ${heatText((BigInt(this.stage.targetHeat)>BigInt(stageHeat)?BigInt(this.stage.targetHeat)-BigInt(stageHeat):0n).toString())} 热度`,
      );
    }

    this.time.delayedCall(1000, () => {
      if(lifecycle!==this.lifecycle||!this.scene.isActive())return;
      this.scene.start('intermission', {
        cleared,
        stageIndex: completedIndex,
        stageHeat,
        handsLeft,
        goldEarned,
      } satisfies IntermissionResult);
    });
  }

  private updateHud(): void {
    const l=this.view.layout,displayHeat=this.presentation?.displayHeat??this.heat,remaining=(BigInt(this.stage.targetHeat)>BigInt(displayHeat)?BigInt(this.stage.targetHeat)-BigInt(displayHeat):0n).toString();
    this.heatText.setText(l.mode==='portrait'?'热度 '+heatText(displayHeat)+' / '+heatText(this.stage.targetHeat):heatText(displayHeat));
    this.handsText.setText(l.mode==='portrait'?'出牌 '+this.handsLeft+' · 弃牌 '+this.run.stage!.discardsLeft+' · 金币 '+this.run.gold:l.mode==='landscape'?'出牌 '+this.handsLeft+' · 弃牌 '+this.run.stage!.discardsLeft+'\n金币 '+this.run.gold+' · 还需 '+heatText(remaining):'出牌 '+this.handsLeft+' · 弃牌 '+this.run.stage!.discardsLeft+'\n金币 '+this.run.gold+'\n还需 '+heatText(remaining)+' 热度');
    this.handCountText.setText('手牌 '+this.run.handOrder.length+' / '+R2_LIMITS.handSize);
    this.pileText.setText('抽牌 '+this.deck.length+' · 已打 '+this.run.playedPile.length+' · 已弃 '+this.run.discardPile.length);
    const last=this.presentation?(this.presentation.credited?this.presentation.score:this.presentation.previousTrace):this.run.lastTrace;
    this.previousHandText.setText(last?'上手已入账：'+HAND_LABELS[last.handType]+' +'+heatText(last.finalScore):'上手记录：本场第一手');
    if(l.mode!=='portrait'){const filled=BigInt(displayHeat)>=BigInt(this.stage.targetHeat)?1000n:BigInt(displayHeat)*1000n/BigInt(this.stage.targetHeat);this.progressBar.setDisplaySize(Math.max(.5,(l.hud.width-24)*Number(filled)/1000),5);}
    for(const joker of this.run.jokers){const label=this.jokerViews.get(joker.instanceId)?.getData('valueLabel') as Phaser.GameObjects.Text|undefined;label?.setText(this.jokerValue(joker));}
  }
}
