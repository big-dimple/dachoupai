import {victorySourceFact} from './JokerKeyHighlight';
import {jokerArtKey} from './jokerArt';
import {showBuildJourney} from './BuildJourneyDialog';
import {showDeckInspection} from './DeckInspector';
import {savedExperienceCards} from './JokerExperience';
import {stageGiftReceipt} from './StageGiftReceipt';
import {toolInfo,goodsArtPortrait} from './r2ToolInfo';
import {savedGrowthDiscovery} from './JokerGrowthCausality';
import Phaser from 'phaser';
import {R2_MODE_CATALOG} from '../content/r2Modes';
import {readRunProgress} from '../platform/RunProgress';
import {AudioEngine,type FailureCue} from '../audio/AudioEngine';
import {getR2Stage} from '../domain/r2Run';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {r2JokerCapacity} from '../domain/r2Resources';
import {jokerAbilityCopyForRun,publicJokerMemoryContext,recordedJokerMemoryContext} from './JokerMemory';
import {savedAssistCopy,savedAssistSummary} from './AssistSelection';
import {r2BossText} from '../domain/r2Chapter';
import {HAND_LABELS} from '../content/handLabels';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import type {ScoreTrace} from '../domain/scoreR2';
import {heatText,fractionText} from './scoreText';
import {r2ScoreOperationText} from './r2Help';
import {runController,dispatchRun,startRun} from './runAdapter';
import {gameSession} from './session';
import {getCharacter} from './characters';
import {stageOutcome} from './stageOutcome';
import {failureSummary} from './FailureSummary';
import {ScoreFlame} from './ScoreFlame';
import {EffectQueue} from '../core/EffectQueue';
import {REWARD_COIN,RewardCoinCue,loadRewardCoin,addRewardCoin,animateRewardCoin} from './RewardCoin';
import {SceneView} from './SceneView';
import {DetailDialog} from './DetailDialog';
import {SKIP_ITEM_LABELS} from './ConsumableDialog';
import type {Box} from './layout';
import {PAPER_CSS} from './theme';

export interface IntermissionResult {cleared:boolean;stageIndex:number;stageHeat:string;handsLeft:number;goldEarned:number;failureCue?:FailureCue;rewardClearId?:string}
function resultLayout(width:number,height:number,top:number,bottom:number){
  const short=height<500,portrait=width<700&&height>width,w=Math.min(980,width-24),x=(width-w)/2;
  const footerY=height-bottom-(portrait?148:104),bodyY=top+(short?64:portrait?108:94),available=footerY-16-bodyY;
  const nextHeight=short?available:Math.min(portrait?100:112,available*.26);
  const score:Box=short?{x,y:bodyY,width:w*.64-12,height:available}:{x,y:bodyY,width:w,height:available-nextHeight-12};
  const next:Box=short?{x:x+w*.64,y:bodyY,width:w*.36,height:available}:{x,y:score.y+score.height+12,width:w,height:nextHeight};
  const sideWidth=Math.floor(w*.28),primaryWidth=Math.floor(w*.43),rightWidth=w-sideWidth-primaryWidth-16;
  return {x,w,top,short,portrait,score,next,left:{x,y:footerY,width:portrait?w/2-4:sideWidth,height:44},primary:portrait?{x,y:footerY+52,width:w,height:56}:{x:x+sideWidth+8,y:footerY,width:primaryWidth,height:56},right:portrait?{x:x+w/2+4,y:footerY,width:w/2-4,height:44}:{x:x+sideWidth+primaryWidth+16,y:footerY,width:rightWidth,height:44},noticeY:footerY+(portrait?116:64)};
}

export class IntermissionScene extends Phaser.Scene {
  private result!:IntermissionResult;
  private view!:SceneView;
  private lifecycle=0;
  private busy=false;
  private notice='';
  private firstRender=true;
  private celebration?:ScoreFlame;
  private readonly rewardCue=new RewardCoinCue();
  private readonly rewardEffects=new EffectQueue();
  private celebrationTimer?:Phaser.Time.TimerEvent;
  private readonly dialog=new DetailDialog();
  private readonly audio=AudioEngine.shared;
  constructor(){super('intermission');}
  init(data:IntermissionResult):void {this.result=data;}
  private get ready():boolean {const session=gameSession();return !this.busy&&runController(this)?.status==='idle'&&session.lease.writable&&!session.pendingRun&&!session.working;}
  create():void {
    this.lifecycle++;this.busy=false;this.notice='';this.firstRender=true;this.events.once('shutdown',()=>{this.lifecycle++;this.dialog.close();this.stopCelebration();});
    const run=runController(this)?.state;if(!run?.stage){this.scene.start('character-select');return;}
    this.cameras.main.setBackgroundColor('#F3EADB');
    const skipped=!!run.stage.skipResult;this.audio.setScene(this.result.cleared?'success':'failure');
    if(!skipped){
      if(this.result.cleared){const outcome=stageOutcome(run.stage,run.lastTrace);if(outcome.intensity>1)this.audio.overkill(outcome.intensity);else this.audio.success();}
      else {
        const cue=this.result.failureCue;
        if(run.phase==='run-lost'&&run.outcome?.reason!=='abandoned'&&cue?.runId===run.runId&&cue.commandSeq===run.commandSeq)this.audio.failure(cue);
      }
    }
    this.view=new SceneView(this,()=>this.render());this.render();
  }
  private render():void {
    const v=this.view,l=v.layout,bottom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom'))||0;
    const p=resultLayout(l.width,l.height,l.hud.y,bottom),run=runController(this)!.state,stage={...getR2Stage(this.result.stageIndex,run.tourMode,run.difficulty)!,targetHeat:run.stage!.targetHeat},character=getCharacter(run.characterId);
    const nextStage=this.result.cleared&&run.phase==='stage-cleared'?getR2Stage(run.stageIndex,run.tourMode,run.difficulty):undefined,skipped=run.stage?.skipResult,won=run.phase==='run-won',capped=this.result.cleared&&run.phase==='stage-cleared'&&!nextStage,lost=!this.result.cleared&&!skipped&&!won;
    const outcome=stageOutcome(run.stage!,run.lastTrace),animateIn=this.firstRender&&!gameSession().reducedMotion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.stopCelebration();v.clear();v.paperBackground();
    v.text(p.x,p.top,(run.tourMode==='endless'?'无尽 · ':'')+stage.name+' · '+character.name,14,'#3F606B',p.w-116);
    const title=capped?'巡演，暂歇于此':skipped?'换一场，再登台':won?'八章好戏，满堂喝彩！':this.result.cleared?outcome.title:'演出失败';
    v.text(lost?l.width/2:p.x,lost?Math.max(p.top+34,l.height*.18):p.top+(p.short?23:p.portrait?52:34),title,p.short?22:p.portrait?26:34,'#26313A',p.w).setOrigin(lost?.5:0,0).setName('result/title').setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold');
    if(lost){
      const groupWidth=Math.min(p.w,420),groupX=(l.width-groupWidth)/2;
      Object.assign(p.score,{x:(l.width-Math.min(p.w,680))/2,y:Math.max(p.top+34,l.height*.18)+46,width:Math.min(p.w,680),height:Math.min(190,l.height*.25)});
      Object.assign(p.primary,{x:groupX,y:p.score.y+p.score.height+12,width:groupWidth,height:56});
      Object.assign(p.left,{x:groupX,y:p.primary.y+64,width:(groupWidth-8)/2,height:44});
      Object.assign(p.right,{x:groupX+(groupWidth+8)/2,y:p.left.y,width:(groupWidth-8)/2,height:44});p.noticeY=p.left.y+54;
    }
    this.drawResultHero(p.score,outcome,!!skipped,lost,animateIn);
    const trace=run.lastTrace;
    const n=p.next;
    let heading='下一步',body='';
    if(skipped){
      const reward=skipped.kind==='coupon'?'下次买牌减2金券':skipped.kind==='gold'?'库存已满，+1金币':SKIP_ITEM_LABELS[skipped.definitionId];
      heading='跳场所得';body=reward+'。没有过关奖金或利息。'+(nextStage?'\n下一场：'+nextStage.name+' · 目标 '+heatText(nextStage.targetHeat):'');
    }else if(nextStage){
      heading='准备下一场';
      body=`${nextStage.name} · 目标 ${heatText(nextStage.targetHeat)}\n后台补牌后，出牌与弃牌次数补满。`+(nextStage.index%3===2?'\n压轴规则：'+r2BossText(run.boss):'');
    }else if(won){
      const progress=readRunProgress(),qualified=run.mode==='standard'&&!!run.normalCompletion;
      heading=run.mode==='challenge'?R2_MODE_CATALOG.challenges.find(row=>row.id===run.challengeId)!.name+' · 通关':run.mode==='tutorial'?'教学巡演通关':'八章通关';
      body=`${character.name} · 累计 ${heatText(run.totalHeat)} 热度\n`+(qualified?'构筑与金币已保留，可自愿继续无尽巡演。':'本模式结果已保存，可同种子再试或选择下一次巡演。');
      if(qualified&&progress.ok&&progress.progress.standardWins[run.difficulty])body+='\n'+(run.difficulty<3?`D${run.difficulty+1} 与挑战已解锁。`:'四档难度已达最高档；挑战已解锁。');
    }else if(capped){
      heading='已达数值上限';body='进度已保存。可查看本场、在菜单导出，或返回选角。';
    }
    if(p.short&&trace&&!skipped&&this.result.cleared){const fact=victorySourceFact(run,trace);if(fact)body=fact.title+' · '+fact.effect+'\n'+body;}
    if(!lost){
      v.material(n,0x21474a,0x21474a,4);
      const nextHeading=v.text(n.x+14,n.y+10,heading,18,'#26313A',n.width-28).setFontStyle('bold');
      const bodyY=nextHeading.y+nextHeading.height+8;
      v.text(n.x+14,bodyY,body,14,'#26313A',n.width-28).setLineSpacing(2).setStyle({maxLines:Math.max(1,Math.floor((n.y+n.height-12-bodyY)/19))});
    }
    if(nextStage){
      const gift=this.ready?stageGiftReceipt(run):undefined;
      v.button(p.left,gift?'赠品去向':'本场详情','action/result-details',()=>gift?this.inspectGift():this.inspectResult());
      v.button(p.primary,'前往商店','action/continue-stage',()=>void this.next(),this.ready,true);
    }else if(won){
      v.button(p.left,'返回选角','action/return-select',()=>this.returnToSelect(),!this.busy);
      if(run.mode==='standard'&&run.normalCompletion)v.button(p.primary,'继续无尽','action/continue-endless',()=>this.confirmEndless(),this.ready,true);
      else v.button(p.primary,run.mode==='tutorial'?'重温教程':'再挑战一次','action/retry-seed',()=>void this.retrySeed(),this.ready,true);
    }else if(capped){
      v.button(p.left,'本场详情','action/result-details',()=>this.inspectResult(),!this.busy);
      v.button(p.primary,'返回选角','action/return-select',()=>this.returnToSelect(),!this.busy,true);
    }else {
      v.button(p.left,'返回选角','action/continue-stage',()=>void this.next(),!this.busy);
      v.button(p.primary,this.busy?'正在开局…':'同局重试','action/retry-seed',()=>void this.retrySeed(),this.ready,true);
    }
    v.button(p.right,lost?'本场详情':'回看上手','action/last-hand',()=>lost?this.inspectResult():this.inspectLastHand(),!this.busy&&(lost||!!trace));
    const discovery=this.ready&&!this.notice&&!lost&&!skipped?savedGrowthDiscovery(run):undefined,gift=this.ready&&!this.notice&&!lost&&!skipped?stageGiftReceipt(run):undefined;
    v.text(p.x,p.noticeY,this.busy?'正在保存…':this.notice||(!this.ready?'当前进度未保存或只读，请查看菜单。':capped?'已达数值上限，进度已保存':won?run.mode==='standard'?'八章通关已保存，继续无尽由你决定。':'本模式结果已保存，可重试或返回选角。':nextStage?gift?.banner||discovery?.full||'':lost?'同局重试沿用角色与开局种子。':''),14,this.notice?'#ffd0b1':'#3F606B',p.w).setName(gift&&nextStage?'gift/discovery':discovery&&nextStage?'growth/discovery':'');
    this.firstRender=false;
  }
  private jokerDefinition(id:string){return r2JokerDefinitionFor(runController(this)!.state,id);}
  private traceSources(trace:ScoreTrace):string[] {
    const character=getCharacter(runController(this)!.state.characterId);
    return [...new Set(trace.events.filter(e=>(e.sourceType==='joker'||e.sourceType==='character')&&e.phase!=='afterHand'&&(e.before.H.n!==e.after.H.n||e.before.H.d!==e.after.H.d||e.before.M.n!==e.after.M.n||e.before.M.d!==e.after.M.d||e.operation==='retrigger-card'&&BigInt(e.value.n)>0n)).map(e=>e.sourceType==='character'?character.name:this.jokerDefinition(e.sourceDefinitionId).name))];
  }
  private stopCelebration():void {
    this.rewardEffects.clear();
    this.celebrationTimer?.remove();this.celebrationTimer=undefined;this.celebration?.destroy();this.celebration=undefined;
    this.tweens.killAll();
  }
  private drawResultHero(b:Box,outcome:ReturnType<typeof stageOutcome>,skipped:boolean,lost:boolean,animate:boolean):void {
    const v=this.view,run=runController(this)!.state,compact=b.height<220,cx=b.x+b.width/2,cy=b.y+b.height/2;
    if(lost){
      const summary=failureSummary(run);
      v.text(cx,b.y+8,summary.reason,16,PAPER_CSS.ink,b.width-24).setOrigin(.5,0).setName('result/failure-reason');
      if(b.height>=132){
        v.text(cx,b.y+40,summary.lastHand,14,PAPER_CSS.jade,b.width-24).setOrigin(.5,0).setName('result/last-hand');
        v.text(cx,b.y+66,summary.resources,14,PAPER_CSS.jade,b.width-24).setOrigin(.5,0).setName('result/resources');
      }
      const gap=(BigInt(run.stage!.targetHeat)-BigInt(this.result.stageHeat)).toString();
      v.text(cx,b.y+b.height*.68,`${heatText(this.result.stageHeat)} / ${heatText(run.stage!.targetHeat)} · 差 ${heatText(gap)}`,b.width<420?16:22,'#eadbbd',b.width-24).setOrigin(.5,0).setName('result/gap');
      if(animate){const curtain=v.add(this.add.rectangle(cx,b.y+b.height*.3,b.width,b.height*.6,0xe2e8e5,.45));this.tweens.add({targets:curtain,alpha:0,duration:280,ease:'Cubic.easeOut',onComplete:()=>curtain.destroy()});}
      return;
    }
    const trace=!skipped&&this.result.cleared?outcome.last:null,top=b.y+(compact?6:18);
    const hand=trace?HAND_LABELS[trace.handType]:'本场热度';
    v.text(cx,top,hand,compact?18:24,'#f3d899').setOrigin(.5,0).setFontStyle('bold');
    if(trace)v.text(cx,top+(compact?24:34),`${fractionText(trace.accumulator.H)} 热度 × ${fractionText(trace.accumulator.M)}`,compact?18:22,'#ffdca0').setOrigin(.5,0).setName('result/formula');
    const scoreY=top+(trace?(compact?46:68):(compact?24:42)),scoreSize=compact?32:Math.min(68,Math.max(42,b.height*.19));
    const score=v.text(cx,scoreY,(trace?'+':'')+heatText(trace?.finalScore??this.result.stageHeat),scoreSize,'#fff2c7').setOrigin(.5,0).setName('result/score').setFontStyle('bold');
    for(let font=scoreSize;score.width>b.width-28&&font>24;)score.setFontSize(--font);
    // Reserve visible coin height above the reward row; transparent cell padding is not a text gap.
    const coinRow=this.result.cleared&&!skipped&&this.result.goldEarned>0,coinSize=compact?(b.height<190?56:72):96;
    const totalY=b.y+b.height-(coinRow?(compact?(coinSize===56?70:88):120):(compact?46:85)),target=run.stage!.targetHeat;
    if(trace&&totalY-scoreY-score.height>=25){
      const fact=victorySourceFact(run,trace),sources=this.traceSources(trace).slice(0,3),assist=savedAssistSummary(trace);
      let y=scoreY+score.height+(compact?4:12);
      if(assist){const line=v.text(cx,y,assist,14,PAPER_CSS.jade,b.width-24).setOrigin(.5,0).setName('result/assist-source');y+=line.height+4;}
      const copy=fact?fact.title+' · '+fact.effect:sources.length?sources.join(' · '):'牌型与计分牌共同结算';
      const line=v.text(cx+18,y,copy,14,PAPER_CSS.jade,b.width-72).setOrigin(.5,0).setName('result/source-continuity');
      // Measured text must fit above the real total; compact screens keep the assist identity first.
      if(y+line.height+4>totalY)line.destroy();
      else {
        const art=fact&&jokerArtKey(fact.definitionId);if(art&&this.textures.exists(art))v.add(this.add.image(Math.max(b.x+18,line.x-line.width/2-22),y+8,art).setDisplaySize(compact?16:28,compact?20:35).setName('result/source-art'));
        if(animate){line.setAlpha(0);this.tweens.add({targets:line,alpha:1,duration:280,delay:180,ease:'Cubic.easeOut'});}
      }
    }
    const gap=BigInt(target)>BigInt(this.result.stageHeat)?(BigInt(target)-BigInt(this.result.stageHeat)).toString():'0';
    v.text(cx,totalY,skipped?'本场跳过':lost?`目标 ${heatText(target)} · 差 ${heatText(gap)}`:`全场 ${heatText(this.result.stageHeat)} / ${heatText(target)}`,compact?14:20,'#e3e9d9').setOrigin(.5,0).setName('result/gap');
    if(this.result.cleared&&!skipped){
      const reward=v.text(cx,b.y+b.height-(compact?(coinSize===56?32:40):52),'过关奖励  +'+this.result.goldEarned+' 金',compact?16:22,'#ffdc91').setOrigin(.5,0).setFontStyle('bold').setName('result/reward');
      const cue=this.firstRender&&this.rewardCue.claim(run,this.result),size=coinSize,diameter=size*.7,gap=8;
      const x=cx-(reward.width+diameter+gap)/2+diameter/2,y=reward.y+reward.height/2-size*.04;
      const show=()=>{reward.x=cx+(diameter+gap)/2;return addRewardCoin(this,v.root,x,y,size,run.stage!.clearId!);};
      if(this.result.goldEarned>0&&this.textures.exists(REWARD_COIN.key)&&run.stage?.clearId){
        const coin=show();if(cue)this.rewardEffects.enqueue(context=>animateRewardCoin(this,coin,context.signal,gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches));
      }else if(cue){
        this.rewardEffects.enqueue(async context=>{
          if(!await loadRewardCoin(this,context.signal)||context.signal.aborted)return;
          const coin=show();await animateRewardCoin(this,coin,context.signal,gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        });
      }
      if(cue)void this.rewardEffects.drain().catch(()=>{});
    }
    if(animate&&this.result.cleared&&!skipped){
      const centerY=scoreY+score.height*.55,flare=v.add(this.add.graphics().lineStyle(outcome.intensity,0xffd588,.55).strokeEllipse(0,0,Math.min(320,b.width-20),68).setPosition(cx,centerY));
      this.tweens.add({targets:flare,scaleX:{from:.3,to:1.1},scaleY:{from:.5,to:1.4},alpha:{from:.8,to:0},duration:550,ease:'Cubic.easeOut',onComplete:()=>flare.destroy()});
      score.setScale(.72);this.tweens.add({targets:score,scale:1,duration:480,ease:'Back.easeOut'});
      if(outcome.intensity>1){this.celebration=new ScoreFlame(this,v.root,{x:cx-Math.min(160,b.width*.4),y:scoreY+score.height-22,width:Math.min(320,b.width*.8),height:40});this.celebration.set(outcome.intensity);}
      const skip=v.button({x:b.x+b.width-94,y:b.y+2,width:88,height:44},'跳过动效','action/skip-celebration',()=>{this.firstRender=false;this.audio.cancelPresentation();this.render();});
      (skip.getData('label') as Phaser.GameObjects.Text).setFontSize(14);
      const skipLabel=skip.getData('label') as Phaser.GameObjects.Text,skipArt=skip.getData('buttonArt') as Phaser.GameObjects.Container;
      this.celebrationTimer=this.time.delayedCall(1000,()=>{this.celebration?.destroy();this.celebration=undefined;skipLabel.destroy();skipArt.destroy();skip.destroy();});
    }
  }
  private inspectJourney():void {
    const run=runController(this)!.state;
    const go=()=>this.next();
    showBuildJourney(this.dialog,run,{ready:this.ready&&run.phase==='stage-cleared',source:()=>this.inspectLastHand(),deck:()=>showDeckInspection(this.dialog,run),tools:()=>this.dialog.open('工具包 · 过关只读',run.consumables.map(c=>toolInfo(c.definitionId).name).join('、')+'\n过关页只查看；前往商店后再选择工具和对象。',[{label:'前往商店继续培养',run:go}]),tool:id=>{const item=run.consumables.find(c=>c.instanceId===id);if(!item)return;const info=toolInfo(item.definitionId);this.dialog.open(info.name+' · 过关只读',info.description+'\n'+info.cost+'\n前往商店后自己选择目标并确认。',[{label:'前往商店继续培养',run:go}],{portrait:goodsArtPortrait(info)});},continueLabel:'前往商店继续培养',continue:go});
  }
  private inspectGift():void {
    const gift=stageGiftReceipt(runController(this)!.state);if(!gift)return;
    this.dialog.open(gift.title,gift.body,[{label:'前往商店',primary:true,disabled:!this.ready,run:()=>this.next()},{label:'本场详情',run:()=>this.inspectResult()}],{...(gift.toolId?{portrait:goodsArtPortrait(toolInfo(gift.toolId))}:{})});
  }
  private inspectResult():void {
    const run=runController(this)!.state,stage={...getR2Stage(this.result.stageIndex,run.tourMode,run.difficulty)!,targetHeat:run.stage!.targetHeat};
    this.dialog.open('本场详情',`${run.tourMode==='endless'?'无尽 · ':''}${stage.name}\n热度 ${heatText(this.result.stageHeat)} / ${heatText(stage.targetHeat)}\n${this.result.cleared?'过关收益':'本场收益'} ${this.result.goldEarned} 金 · 余额 ${run.gold} 金\n剩余出牌 ${this.result.handsLeft} · 剩余弃牌 ${run.stage?.discardsLeft??0}\n\n当前构筑：`+(run.jokers.map(j=>this.jokerDefinition(j.definitionId).name).join('、')||'空')+'\n\n'+(run.stage?.boss?'本场压轴：'+r2BossText(run.stage.boss):'本场为普通场。'),run.lastTrace?[{label:'回看最后一手',run:()=>this.inspectLastHand()}]:[]);
  }
  private inspectLastHand():void {
    const run=runController(this)!.state,trace=run.lastTrace;if(!trace)return;
    const cardName=(id:string)=>{const c=trace.cards.find(c=>c.id===id);return c?rankLabel(c.rank)+SUIT_SYMBOL[c.suit]:'已移除的牌';};
    const lines=trace.events.map(e=>{
      const source=e.sourceType==='joker'?this.jokerDefinition(e.sourceDefinitionId).name:e.sourceType==='character'?getCharacter(run.characterId).name:e.sourceType==='card'?cardName(e.targetCardId??e.sourceInstanceId):e.sourceDefinitionId===trace.bossContext.boss?.definitionId?r2BossText(trace.bossContext.boss).split('：')[0]:R2_MODE_CATALOG.programs.find(program=>program.id===e.sourceDefinitionId)?.name??'牌型';
      if(e.phase==='base')return `${source} · 基础 ${fractionText(e.after.H)} 热度 × ${fractionText(e.after.M)} 倍率`;
      if(e.phase==='finalScore')return `最终得分 ${heatText(trace.finalScore)} 热度`;
      const operation=r2ScoreOperationText(e,e.sourceType==='joker'?this.jokerDefinition(e.sourceDefinitionId):undefined),status=['afterHand','beforeFailure','onStageClear'].includes(e.phase);
      return `${source} · ${operation}`+(status?'':` → ${fractionText(e.after.H)} 热度 × ${fractionText(e.after.M)} 倍率`);
    });
    const summary=`${HAND_LABELS[trace.handType]} Lv.${trace.level} · ${heatText(trace.finalScore)} 热度\n打出：${trace.sets.playedIds.map(cardName).join('、')}\n实际计分：${trace.sets.activeScoringIds.map(cardName).join('、')||'无'}${trace.assist?'\n'+savedAssistCopy(trace):''}\n\n${fractionText(trace.accumulator.H)} × ${fractionText(trace.accumulator.M)} = ${heatText(trace.finalScore)}`;
    // Read saved activity only; current gold and next-hand eligibility cannot explain this hand.
    const benefits=trace.sourceJokers.flatMap(joker=>{
      const copy=jokerAbilityCopyForRun(run,joker.definitionId,joker,recordedJokerMemoryContext(publicJokerMemoryContext(run,{hand:trace.cards,scoringLimited:false,deckSize:run.deckInstances.length-run.destroyedIds.length,jokerSlots:r2JokerCapacity(run),jokerCount:trace.sourceJokers.length}),trace.bossContext),trace.events);
      const edition=trace.events.filter(event=>event.sourceType==='joker'&&event.sourceInstanceId===joker.instanceId&&event.reasonKey.startsWith('edition.')).map(event=>r2ScoreOperationText(event,this.jokerDefinition(event.sourceDefinitionId))).join('、');
      return [this.jokerDefinition(joker.definitionId).name+'：'+copy.state+(edition?'；版次 '+edition:'')];
    });
    this.dialog.open('最后一手 · 已保存的结算',summary+'\n\n'+lines.join('\n'),run.phase==='stage-cleared'?[{label:'查看培养路线',disabled:!this.ready,run:()=>this.inspectJourney()},{label:'前往商店继续培养',primary:true,disabled:!this.ready,run:()=>this.next()}]:[],benefits.length?{cards:savedExperienceCards(run,trace),effectBody:summary,collapseRules:true,rulesLabel:'完整计分明细'}:{cards:savedExperienceCards(run,trace)});
  }
  private returnToSelect():void {
    if(this.busy)return;this.exitResult('character-select',{freshSeed:true});
  }
  private exitResult(destination:'shop'|'character-select',data?:{freshSeed:true}):void {
    // Phaser queues the switch; retire this view before async finally can repaint a new run.
    this.lifecycle++;this.rewardEffects.clear();this.dialog.close();this.audio.select();
    if(data)this.scene.start(destination,data);else this.scene.start(destination);
  }
  private confirmEndless():void {
    const controller=runController(this);if(!this.ready||!controller)return;
    const run=controller.state;if(run.phase!=='run-won'||run.tourMode!=='normal'||!run.normalCompletion)return;
    const seq=run.commandSeq,runId=run.runId,lifecycle=this.lifecycle;
    const dialog=this.dialog.open('继续无尽 · 自愿巡演','八章通关已保存。\n\n继续无尽会保留当前牌组、大丑牌、成长、道具与金币，从第九章商店接续。\n\n后续每章目标递增为上一章的 2.4 倍，新的压轴规则仍会公开。\n\n是否继续由你决定；取消可留在胜利页。',[
      {label:'确认继续',primary:true,run:async()=>{
        if(!this.dialog.active(dialog)||!this.ready||lifecycle!==this.lifecycle)return;
        const current=runController(this);
        if(!current||current!==controller||current.state.runId!==runId||current.state.phase!=='run-won'||current.state.tourMode!=='normal'){
          this.notice='本局状态已变化，请在菜单继续已保存的进度。';this.dialog.close(dialog);this.render();return;
        }
        this.busy=true;this.notice='';this.render();
        try {
          const result=await dispatchRun(this,{type:'ContinueEndless'},seq);
          if(lifecycle!==this.lifecycle||!this.scene.isActive())return;
          if(result.ok&&result.state.phase==='shop'&&result.state.tourMode==='endless'){
            this.exitResult('shop');return;
          }
          this.notice=!result.ok&&result.code==='stale-sequence'?'胜利进度已变化，请重新确认继续。':!result.ok&&result.code==='save-failed'?'接续未保存，胜利进度仍保留；请在菜单重试保存。':'接续未完成，胜利进度仍保留；请查看菜单后重试。';
          this.dialog.close(dialog);this.audio.invalid();
        }catch {
          if(lifecycle===this.lifecycle&&this.scene.isActive()){this.notice='接续未保存，胜利进度仍保留；请在菜单重试保存。';this.dialog.close(dialog);this.audio.invalid();}
        }finally {if(lifecycle===this.lifecycle&&this.scene.isActive()){this.busy=false;this.render();}}
      }},
    ],{closeLabel:'取消'});
  }
  private async retrySeed():Promise<void> {
    if(!this.ready)return;const run=runController(this)!.state,lifecycle=this.lifecycle;this.busy=true;this.notice='';this.render();
    try {
      const controller=await startRun(this,run.seed,run.characterId,{mode:run.mode,difficulty:run.difficulty,challengeId:run.challengeId,programsEnabled:run.programsEnabled},{kind:'retry',run});if(lifecycle!==this.lifecycle||!this.scene.isActive())return;
      if(controller?.status==='idle'){this.exitResult('shop');return;}
      this.notice=gameSession().notice||'新局未保存，请在菜单重试保存。';this.audio.invalid();
    }finally {if(lifecycle===this.lifecycle&&this.scene.isActive()){this.busy=false;this.render();}}
  }
  private async next():Promise<void> {
    if(this.busy)return;this.busy=true;const lifecycle=this.lifecycle,run=runController(this)!.state;this.render();
    try {
      if(this.result.cleared&&run.phase==='stage-cleared'&&getR2Stage(run.stageIndex,run.tourMode,run.difficulty)){
        const result=await dispatchRun(this,{type:'OpenShop'},run.commandSeq);if(lifecycle!==this.lifecycle||!this.scene.isActive())return;
        if(result.ok){this.exitResult('shop');return;}
        this.notice='商店尚未保存，请在菜单重试保存。';this.audio.invalid();
      }else {this.exitResult('character-select',{freshSeed:true});return;}
    }finally {if(lifecycle===this.lifecycle&&this.scene.isActive()){this.busy=false;this.render();}}
  }
}
