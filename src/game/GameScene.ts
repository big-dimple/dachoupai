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
import {previewR2Hand,type ScoreTrace,type ScoreEvent} from '../domain/scoreR2';
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

const MAX_SELECTED = R2_LIMITS.maxSelected;

interface CardView {
  card: PlayingCard;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  scoringMark: Phaser.GameObjects.Text;
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
  private presentation?:{generation:number;lifecycle:number;intent:number;state:RunState;score:ScoreTrace;hand:readonly PlayingCard[]};
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

  constructor() {
    super('game');
  }

  async create(): Promise<void> {
    const lifecycle=++this.lifecycle;this.intent++;
    this.effects.clear();this.triggers.clear();this.jokerViews.clear();this.cardViews=[];this.selectedIds.clear();this.playing=false;this.presentation=undefined;this.statusMessage='';this.focusIndex=0;
    const settings=()=>{this.tweens.timeScale=gameSession().speed;this.time.timeScale=gameSession().speed;this.audio.muted=gameSession().muted;};
    window.addEventListener('dachoupai-presentation',settings);
    this.events.once('shutdown',()=>{
      this.lifecycle++;this.intent++;this.effects.clear();this.tweens.killAll();this.time.removeAllEvents();this.triggers.clear();this.jokerViews.clear();this.cardViews=[];this.selectedIds.clear();this.presentation=undefined;this.playing=false;this.dialog.close();
      window.removeEventListener('keydown',this.keyboard);
      window.removeEventListener('dachoupai-presentation',settings);
    });
    const controller=runController(this);
    if(!controller){this.scene.start('character-select');return;}
    if(controller.state.phase==='stage-ready'){
      const entered=await dispatchRun(this,{type:'EnterStage'});
      if(lifecycle!==this.lifecycle||!this.scene.isActive())return;
      if(!entered.ok){this.scene.start('character-select');return;}
    }
    this.run=controller.state;
    if(this.run.phase!=='await-input'||!this.run.stage){this.scene.start('character-select');return;}
    this.stage=getStage(this.run.stage.index)!;this.characterId=this.run.characterId;settings();
    this.cameras.main.setBackgroundColor('#182b2a');
    this.view=new SceneView(this,()=>{
      if(this.presentation)this.fastForward();
      this.render();
    });
    window.addEventListener('keydown',this.keyboard);
    this.render();
  }

  private readonly keyboard=(event:KeyboardEvent)=>{
    if(this.playing||document.querySelector('dialog[open]')||!this.scene.isActive()||document.activeElement?.matches('input,select,textarea,button'))return;
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();this.focusIndex=(this.focusIndex+(event.key==='ArrowRight'?1:this.hand.length-1))%this.hand.length;this.refreshSelection();}
    else if(event.key===' '&&this.hand[this.focusIndex]){event.preventDefault();this.toggleCard(this.hand[this.focusIndex].id);}
    else if(event.key==='Enter'&&this.hand[this.focusIndex]){event.preventDefault();this.inspectCard(this.hand[this.focusIndex].id);}
  };
  private get ready():boolean {return !this.playing&&runController(this)?.status==='idle'&&gameSession().lease.writable;}
  private render():void {
    const v=this.view,l=v.layout;v.clear();const h=l.hud,c=getCharacter(this.characterId),portrait=l.mode==='portrait';
    const avatarSize=l.compact?48:64;addAvatar(this,v.root,c,h.x+avatarSize/2,h.y+avatarSize/2,avatarSize);
    const bossName=r2BossText(this.run.boss).split('：')[0];
    v.text(h.x+76,h.y,c.name,22);this.roleText=v.text(h.x+76,h.y+30,this.roleCaption(),14,'#f1c575',h.width-152);
    if(!l.compact)v.text(portrait?h.x+76:h.x,h.y+(portrait?52:76),this.stage.index%3===2?'压轴 · '+bossName:this.stage.name,14,'#dddacb',portrait?h.width-152:h.width);
    this.heatText=v.text(h.x,h.y+(portrait?(l.compact?52:76):100),'',22);
    this.handsText=v.text(h.x,h.y+(portrait?(l.compact?78:108):140),'',14,undefined,h.width);
    if(!portrait)v.button({x:h.x,y:h.y+232,width:h.width,height:44},'角色 / 本场规则','action/role',()=>this.inspectRole());
    this.renderJokerRack();
    this.resultText=v.text(l.preview.x,l.preview.y,'选择 1～5 张牌',22,undefined,l.preview.width);
    this.breakdownText=v.text(l.preview.x,l.preview.y+32,'',14,'#dddacb',l.preview.width);
    this.rankButton=v.button(l.buttons.rank,'点数排序','action/sort-rank',()=>void this.sortHand('rank'),this.ready);
    this.suitButton=v.button(l.buttons.suit,'花色排序','action/sort-suit',()=>void this.sortHand('suit'),this.ready);
    v.button(l.buttons.deck,'查看牌组','action/deck',()=>this.inspectDeck());
    v.button(l.buttons.details,'规则 / 物品','action/details',()=>this.inspectRole());
    this.discardButton=v.button(l.buttons.discard,r2DiscardCost(this.run)===2?'弃牌 ×2':'弃牌','action/discard',()=>void this.discardSelected(),this.ready&&this.selectedIds.size>0&&this.run.stage!.discardsLeft>=r2DiscardCost(this.run));
    this.playButton=v.button(l.buttons.play,'出牌','action/play',()=>void this.playSelected(),this.ready&&this.selectedIds.size>0&&this.handsLeft>0,true);
    this.forwardButton=v.button(l.buttons.forward,'快进','action/forward',()=>this.fastForward(),!!this.presentation);
    this.statusText=v.text(l.status.x,l.status.y,'',14,'#f1c575',l.status.width);
    this.updateHud();this.renderHand();
  }
  private renderJokerRack():void {
    const v=this.view,l=v.layout;this.jokerViews.clear();
    l.slots.forEach((b,i)=>{
      const j=this.run.jokers[i],r=v.rect(b,j?0xf3eadb:0x24313b);
      if(!j){v.text(b.x+6,b.y+12,'空槽',14);return;}
      const d=getJoker(j.definitionId),symbol=d.rarity==='rare'?'★':d.rarity==='uncommon'?'◇':'□',name=v.text(b.x+5,b.y+5,symbol+d.name,14,'#24313b',b.width-10);
      const current=v.text(b.x+5,b.y+b.height-20,this.jokerValue(j),14,'#24313b');
      const marker=this.add.container(0,0,[r,name,current]);v.add(marker);this.jokerViews.set(j.definitionId,marker);
      v.target(r,'joker/'+j.instanceId,{tap:()=>this.inspectJoker(j.instanceId),detail:()=>this.inspectJoker(j.instanceId),drag:x=>void this.reorderJoker(j.instanceId,x),holdToDrag:true});
    });
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
  private renderHand():void {
    this.cardViews.forEach(v=>v.container.destroy());this.cardViews=[];const v=this.view,l=v.layout;
    this.hand.forEach((card,i)=>{
      const b=l.cards[i].visual,hit=l.cards[i].hit,selected=this.selectedIds.has(card.id),c=this.add.container(b.x+b.width/2,b.y+b.height/2-(selected?16:0));v.add(c);
      const bg=this.add.rectangle(0,0,b.width,b.height,0xf3eadb);
      const red=card.suit==='hearts'||card.suit==='diamonds',color=red?'#b83132':'#24313b';
      const label=this.add.text(-b.width/2+5,-b.height/2+5,rankLabel(card.rank)+'\n'+SUIT_SYMBOL[card.suit],{fontFamily:'Georgia,serif',fontSize:'22px',fontStyle:'bold',color,resolution:Math.min(devicePixelRatio||1,2)});
      const suit=this.add.text(b.width/2-16,b.height/2-18,SUIT_SYMBOL[card.suit],{fontSize:'26px',color}).setOrigin(.5);
      const scoringMark=this.add.text(-b.width/2+5,b.height/2-24,'★',{fontSize:'14px',color:'#24313b'});
      c.add([bg,label,suit,scoringMark]);
      v.target(bg,'card/'+card.id,{tap:()=>this.toggleCard(card.id),detail:()=>this.inspectCard(card.id),drag:x=>void this.reorderCard(card.id,x)});
      (bg.input!.hitArea as Phaser.Geom.Rectangle).width=hit.width;
      this.cardViews.push({card,container:c,background:bg,scoringMark});
    });
    this.refreshSelection();
  }
  private refreshSelection():void {
    const preview=!this.presentation&&this.selectedIds.size?this.preview():undefined;
    const active=this.presentation?.score.sets.activeScoringIds??preview?.sets.activeScoringIds??[],l=this.view.layout;
    const disabledIds=r2DisabledCards(this.run.boss,this.stage.index,this.hand),suppressed=this.presentation?.score.events.filter(e=>e.operation==='ordinary-points-suppressed').map(e=>e.targetCardId)??r2ScoreContext(this.run,this.hand,[...this.selectedIds]).ordinaryPointsSuppressedIds;
    this.cardViews.forEach((v,i)=>{
      const selected=this.selectedIds.has(v.card.id),scoring=active.includes(v.card.id),focused=document.activeElement===this.game.canvas&&i===this.focusIndex,b=l.cards[i].visual;
      v.container.y=b.y+b.height/2-(selected?16:0);v.container.setData('selected',selected).setData('activeScoring',scoring);
      const disabled=disabledIds.includes(v.card.id),pointsZero=suppressed.includes(v.card.id);v.background.setFillStyle(disabled?0xd2d0cb:0xf3eadb);
      v.background.setStrokeStyle(focused?3:scoring?4:2,focused?0x7fb3d5:scoring?0x5d9184:selected?0xc84e42:0x879486);v.scoringMark.setText(disabled?'失效':pointsZero?'点数0':'★').setVisible(disabled||pointsZero||scoring);
    });
    if(this.presentation)this.resultText.setText('正在结算 · 可快进');else this.previewSelection(preview);
    this.updateControls();
  }
  private updateControls():void {
    this.view.setEnabled(this.rankButton,this.ready);this.view.setEnabled(this.suitButton,this.ready);
    (this.discardButton.getData('label') as Phaser.GameObjects.Text).setText(r2DiscardCost(this.run)===2?'弃牌 ×2':'弃牌');
    this.view.setEnabled(this.discardButton,this.ready&&this.selectedIds.size>0&&this.run.stage!.discardsLeft>=r2DiscardCost(this.run));
    this.view.setEnabled(this.playButton,this.ready&&this.selectedIds.size>0&&this.handsLeft>0);
    this.view.setEnabled(this.forwardButton,!!this.presentation);
    this.statusText.setText(this.statusMessage||(this.playing?'结算中，不接受下一手':this.selectedIds.size?'已选 '+this.selectedIds.size+' / 5':'先选择牌，出牌和弃牌才可用'));
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
    const dialog=this.dialog.open(d.name,d.description+'\n当前成长：'+(Object.entries(j.growth).map(([k,value])=>k+' '+fractionText(value)).join('、')||'无')+'\n第 '+(index+1)+' 个结算；长按后拖动可调序，出售只在商店确认。',[
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
    await this.command({type:'ReorderHand',ids:cards.map(c=>c.id)});
  }
  private async reorderCard(id:string,x:number):Promise<void> {const ids=[...this.run.handOrder],from=ids.indexOf(id),to=this.view.layout.cards.findIndex(b=>x>=b.hit.x&&x<=b.hit.x+b.hit.width);if(from<0||to<0||to>=ids.length||from===to)return;ids.splice(from,1);ids.splice(to,0,id);await this.command({type:'ReorderHand',ids});}
  private async reorderJoker(id:string,x:number):Promise<void> {const ids=this.run.jokers.map(j=>j.instanceId),from=ids.indexOf(id),to=this.view.layout.slots.findIndex(b=>x>=b.x&&x<=b.x+b.width);if(to<0||to>=ids.length||from===to)return;ids.splice(from,1);ids.splice(to,0,id);await this.command({type:'ReorderJokers',ids});}

  private toggleCard(id: string): void {
    if (!this.ready) return;
    this.statusMessage='';
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      if (this.selectedIds.size >= MAX_SELECTED) {this.statusMessage='每手最多选择 5 张牌';this.updateControls();return;}
      this.selectedIds.add(id);
    }
    this.audio.select();
    this.refreshSelection();
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

  private animateRole(note:string,context:EffectContext):Promise<void> {
    this.roleText.setText(note);this.audio.role();
    return this.animate({targets:this.roleText,scale:{from:1.28,to:1},duration:230,ease:'Back.easeOut'},context);
  }

  private animateJoker(joker:ScoreEvent,chainIndex:number,context:EffectContext):Promise<void> {
    const view=this.jokerViews.get(joker.sourceDefinitionId);if(!view)return Promise.resolve();
    this.audio.joker(chainIndex);
    return this.animate({targets:view,y:view.y-14,scale:1.12,duration:120,yoyo:true,hold:70,ease:'Back.easeOut'},context);
  }

  private formatBreakdown(score: ScoreTrace): string {
    const first=score.events[0].after;
    return '牌型 '+fractionText(first.H)+' 热度 × '+fractionText(first.M)+' 倍率\n'
      +'计分 '+score.sets.activeScoringIds.length+' 张 / 打出 '+score.sets.playedIds.length+' 张\n'
      +'结算 '+fractionText(score.accumulator.H)+' × '+fractionText(score.accumulator.M)+' = '+heatText(score.finalScore);
  }

  private previewSelection(preview?:HandPreview):void {
    if(!preview){
      if(this.run.lastTrace){this.resultText.setText('上手 '+HAND_LABELS[this.run.lastTrace.handType]+' +'+heatText(this.run.lastTrace.finalScore));this.breakdownText.setText(this.formatBreakdown(this.run.lastTrace));}
      else{this.resultText.setText('选择 1～5 张牌');this.breakdownText.setText('距目标还需 '+heatText((BigInt(this.stage.targetHeat)>BigInt(this.heat)?BigInt(this.stage.targetHeat)-BigInt(this.heat):0n).toString())+' 热度');}
      return;
    }
    this.resultText.setText(HAND_LABELS[preview.handType]+' Lv.'+preview.level+' · '+this.selectedIds.size+'/5');
    this.breakdownText.setText('基础热度 '+fractionText(preview.base.H)+' × 倍率 '+fractionText(preview.base.M)+'\n'+(preview.possibleScores.length===2?'押注：50% '+heatText(preview.possibleScores[0])+' / 50% '+heatText(preview.possibleScores[1]):'本手预览 '+heatText(preview.possibleScores[0])+' 热度'));
  }

  private async discardSelected():Promise<void> {
    if(!this.ready||!this.selectedIds.size||this.run.stage!.discardsLeft<r2DiscardCost(this.run))return;this.playing=true;this.statusMessage='';this.updateControls();const lifecycle=this.lifecycle,intent=++this.intent,selectedIds=[...this.selectedIds];
    try {
      const result=await dispatchRun(this,{type:'DiscardHand',selectedIds});
      if(!this.alive(lifecycle,intent))return;
      if(!result.ok){this.statusMessage=result.code==='no-discards-left'?'本场弃牌次数已用完':result.code==='save-failed'?'未保存，请在菜单中重试或导出':'请选择 1～5 张牌再弃牌';return;}
      this.run=result.state;this.selectedIds.clear();this.updateHud();this.renderHand();
      if(this.run.phase==='run-lost')this.finishStage(false);
    } finally {if(this.alive(lifecycle,intent)&&this.run.phase==='await-input'){this.playing=false;this.refreshSelection();}}
  }

  private async playSelected():Promise<void> {
    if(!this.ready||this.selectedIds.size===0||this.handsLeft<=0)return;
    const selectedIds=[...this.selectedIds],lifecycle=this.lifecycle,intent=++this.intent;
    this.playing=true;this.statusMessage='';this.updateControls();
    const selectedViews=this.cardViews.filter(v=>selectedIds.includes(v.card.id));
    try {
      const result=await dispatchRun(this,{type:'PlayHand',selectedIds});
      if(!this.alive(lifecycle,intent))return;
      if(!result.ok||result.duplicate){if(!result.ok)this.statusMessage=result.code==='save-failed'?'未保存，请在菜单中重试或导出':result.code==='score-diagnostic'?'本手无法结算，资源与原状态已保留':'出牌未提交，请查看菜单或选择。';return;}
      this.run=result.state;
      const event=result.events.find(e=>e.type==='hand-scored-r2');if(!event||event.type!=='hand-scored-r2')throw Error('Successful play missing score event');
      this.triggers.emit('hand:played',event.score.sets);
      await this.presentTrace(event.score,result.state,selectedViews,lifecycle,intent);
    } finally {
      if(this.alive(lifecycle,intent)&&this.run.phase==='await-input'&&!this.presentation){this.playing=false;this.refreshSelection();}
    }
  }

  private async presentTrace(score:ScoreTrace,state:RunState,views:readonly CardView[],lifecycle:number,intent:number):Promise<void> {
    this.effects.clear();const generation=this.effects.generation;
    const hand=this.cardViews.map(v=>v.card),presentation={generation,lifecycle,intent,state,score,hand};this.presentation=presentation;this.refreshSelection();this.updateHud();
    const currentViews=this.cardViews.filter(v=>score.sets.playedIds.includes(v.card.id));
    if(views.length)this.effects.enqueue(context=>{
      this.audio.playHand();return Promise.all(currentViews.map((view,index)=>this.animate({targets:view.container,y:view.container.y-70,angle:index%2===0?-4:4,alpha:.25,duration:210,delay:index*30,ease:'Cubic.easeIn'},context))).then(()=>undefined);
    });
    for(const [index,event] of score.events.entries()){
      if(['base','finalScore','afterHand'].includes(event.phase))continue;
      this.effects.enqueue(async context=>{
        if(!this.alive(lifecycle,intent)||context.signal.aborted)return;
        const operation=event.operation==='ordinary-points-suppressed'?'普通点数归零':event.operation==='multiply-multiplier'?'×倍率':event.operation==='add-multiplier'?'+倍率':'+热度';
        const source=event.sourceType==='joker'?getJoker(event.sourceDefinitionId).name:event.sourceType==='character'?getCharacter(state.characterId).name:event.sourceDefinitionId==='B02'?'低调点':'计分牌';
        this.resultText.setText(source+' '+operation+' '+fractionText(event.value));this.breakdownText.setText('热度 '+fractionText(event.after.H)+' · 倍率 '+fractionText(event.after.M));
        if(event.sourceType==='character'){this.triggers.emit('role:triggered',event);await this.animateRole(operation+' '+fractionText(event.value),context);}
        else if(event.sourceType==='joker'){this.triggers.emit('joker:triggered',event);await this.animateJoker(event,index,context);}
        else await this.wait(50,context);
        if(!context.signal.aborted)await this.wait(60,context);
      });
    }
    this.effects.enqueue(context=>{
      if(context.signal.aborted||!this.alive(lifecycle,intent))return;
      this.triggers.emit('score:resolved',score);this.resultText.setText(HAND_LABELS[score.handType]+'   +'+heatText(score.finalScore)+' 热度');this.breakdownText.setText(this.formatBreakdown(score));this.audio.score(2);
    });
    let failed=false;
    try {await this.effects.drain();}
    catch {failed=true;if(this.alive(lifecycle,intent))this.resultText.setText('演出已停止，确定结果已保存。');}
    if(this.alive(lifecycle,intent)&&this.presentation===presentation&&(failed||this.effects.isCurrent(generation)))this.completePresentation(presentation);
  }

  private completePresentation(presentation:NonNullable<GameScene['presentation']>):void {
    if(!this.alive(presentation.lifecycle,presentation.intent))return;
    this.presentation=undefined;this.run=presentation.state;this.selectedIds.clear();this.updateHud();
    this.resultText.setText(HAND_LABELS[presentation.score.handType]+'   +'+heatText(presentation.score.finalScore)+' 热度');this.breakdownText.setText(this.formatBreakdown(presentation.score));
    if(this.run.phase==='stage-cleared'||this.run.phase==='run-won'){this.finishStage(true);return;}
    if(this.run.phase==='run-lost'){this.finishStage(false);return;}
    this.playing=false;this.roleText.setText(this.roleCaption()).setScale(1);
    this.jokerViews.forEach(v=>v.setPosition(0,0).setScale(1));this.renderHand();
  }

  fastForward():void {const presentation=this.presentation;if(!presentation)return;this.effects.clear();this.completePresentation(presentation);}
  replayLastTrace():void {
    if(this.playing||!this.run.lastTrace)return;
    this.playing=true;this.playButton.disableInteractive();const intent=++this.intent;
    void this.presentTrace(this.run.lastTrace,this.run,[],this.lifecycle,intent);
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
    this.heatText.setText('热度 '+heatText(this.heat)+' / '+heatText(this.stage.targetHeat));
    const l=this.view.layout;this.handsText.setText(l.mode==='portrait'?'出牌 '+this.handsLeft+' · 弃牌 '+this.run.stage!.discardsLeft+' · 金币 '+this.run.gold:'出牌 '+this.handsLeft+' · 弃牌 '+this.run.stage!.discardsLeft+'\n金币 '+this.run.gold+' · 牌堆 '+this.deck.length+'\n还需 '+heatText((BigInt(this.stage.targetHeat)>BigInt(this.heat)?BigInt(this.stage.targetHeat)-BigInt(this.heat):0n).toString()));
    for(const j of this.run.jokers){const label=this.jokerViews.get(j.definitionId)?.list[2] as Phaser.GameObjects.Text|undefined;label?.setText(this.jokerValue(j));}
  }
}
