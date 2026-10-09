import {mountResultEntrance} from './ResultEntrance';
import {resultStageFacts,resultStagePlan} from './ResultStage';
import {resultStagePaper,resultStageSources,loadResultSourceArt} from './ResultStageArt';
import {jokerArtPreviewUrl} from './jokerArt';
import {paperSceneStart} from './PaperFlow';
import {savedTouyeWager} from './TouyeWagerCopy';
import {savedBossImpact} from './SavedBossImpact';
import {buildGrowthProgress} from './BuildGrowthProgress';
import {showBuildGrowth} from './BuildGrowthView';
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
import {finaleKeepsake} from './FinaleKeepsake';
import {selectionPortraitKey} from './portraits';
import {EffectQueue} from '../core/EffectQueue';
import {REWARD_COIN,RewardCoinCue,loadRewardCoin,addRewardCoin,animateRewardCoin} from './RewardCoin';
import {SceneView} from './SceneView';
import {DetailDialog} from './DetailDialog';
import {SKIP_ITEM_LABELS} from './ConsumableDialog';
import type {Box} from './layout';
import {PAPER_CSS,PAPER_THEME as T,SCORE_FONT} from './theme';

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
  private sourceArtRequest?:AbortController;
  private sourceArtLayer?:Phaser.GameObjects.Container;
  private paintSourceArt?:()=>void;
  private busy=false;
  private notice='';
  private firstRender=true;
  private readonly rewardCue=new RewardCoinCue();
  private readonly rewardEffects=new EffectQueue();
  private outcomeMotion?:{dispose:()=>void};
  private celebrationTimer?:Phaser.Time.TimerEvent;
  private readonly dialog=new DetailDialog();
  private readonly audio=AudioEngine.shared;
  constructor(){super('intermission');}
  init(data:IntermissionResult):void {this.result=data;}
  private get ready():boolean {const session=gameSession();return !this.busy&&runController(this)?.status==='idle'&&session.lease.writable&&!session.pendingRun&&!session.working;}
  private stopSourceArt():void {this.sourceArtRequest?.abort();this.sourceArtRequest=undefined;}
  private requestSourceArt():void {
    const controller=runController(this),run=controller?.state;if(!controller||!run?.stage||!this.result.cleared||run.stage.skipResult)return;
    const source=resultStageFacts(run,this.result.cleared,!!run.stage.skipResult).source,key=source&&jokerArtKey(source.definitionId),url=source&&jokerArtPreviewUrl(source.definitionId);
    if(!key||!url||this.textures.exists(key))return;
    this.stopSourceArt();const request=this.sourceArtRequest=new AbortController(),lifecycle=this.lifecycle;
    const current=()=>this.sourceArtRequest===request&&!request.signal.aborted&&lifecycle===this.lifecycle&&this.sys.settings.active&&!this.busy&&runController(this)===controller&&controller.state===run;
    void loadResultSourceArt(this,key,url,request.signal,current).then(loaded=>{
      if(loaded&&current())this.paintSourceArt?.();
    });
  }
  create():void {
    this.lifecycle++;this.busy=false;this.notice='';this.firstRender=true;
    const preference=()=>{if(gameSession().reducedMotion&&this.scene.isActive()){this.firstRender=false;this.render();}};
    const suspend=()=>{if(this.scene.isActive()){this.firstRender=false;this.stopCelebration();this.audio.cancelPresentation();}};
    const visibility=()=>{if(document.hidden)suspend();};
    if(typeof window!=='undefined')window.addEventListener('dachoupai-presentation',preference);
    if(typeof window!=='undefined')window.addEventListener('blur',suspend);
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',visibility);
    const retire=()=>{if(typeof window!=='undefined'){window.removeEventListener('dachoupai-presentation',preference);window.removeEventListener('blur',suspend);}if(typeof document!=='undefined')document.removeEventListener('visibilitychange',visibility);this.events.off('shutdown',retire);this.events.off('destroy',retire);this.lifecycle++;this.stopSourceArt();this.paintSourceArt=undefined;this.sourceArtLayer=undefined;this.dialog.close();this.stopCelebration();};
    this.events.once('shutdown',retire);this.events.once('destroy',retire);
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
    this.view=new SceneView(this,()=>this.render());this.render();this.requestSourceArt();
  }
  private render():void {
    if(this.busy)this.stopSourceArt();
    const v=this.view,l=v.layout,bottom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom'))||0;
    const p=resultLayout(l.width,l.height,l.hud.y,bottom),run=runController(this)!.state,stage={...getR2Stage(this.result.stageIndex,run.tourMode,run.difficulty)!,targetHeat:run.stage!.targetHeat},character=getCharacter(run.characterId);
    const nextStage=this.result.cleared&&run.phase==='stage-cleared'?getR2Stage(run.stageIndex,run.tourMode,run.difficulty):undefined,skipped=run.stage?.skipResult,won=run.phase==='run-won',capped=this.result.cleared&&run.phase==='stage-cleared'&&!nextStage,lost=!this.result.cleared&&!skipped&&!won;
    const outcome=stageOutcome(run.stage!,run.lastTrace),animateIn=this.firstRender&&!gameSession().reducedMotion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.stopCelebration();v.clear();this.paintSourceArt=undefined;this.sourceArtLayer=undefined;v.paperBackground();
    v.text(p.x,p.top,(run.tourMode==='endless'?'无尽 · ':'')+stage.name+' · '+character.name,14,'#3F606B',p.w-116);
    const title=capped?'巡演，暂歇于此':skipped?'换一场，再登台':won?(run.mode==='tutorial'?'教学巡演，谢幕！':run.mode==='challenge'?'挑战完成，谢幕！':'八章好戏，满堂喝彩！'):this.result.cleared?outcome.title:'此番落幕，再登台';
    v.text(p.x,p.top+(p.short?23:p.portrait?52:34),title,p.short?22:p.portrait?26:34,'#26313A',p.w).setName('result/title').setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold');
    this.drawResultHero(p.score,outcome,!!skipped,lost,animateIn);
    const trace=run.lastTrace;
    const n=p.next;
    let heading='下一步',body='';
    if(skipped){
      const reward=skipped.kind==='coupon'?'下次买牌减2金券':skipped.kind==='gold'?'库存已满，+1金币':SKIP_ITEM_LABELS[skipped.definitionId];
      heading='跳场所得';body=reward+'。没有过关奖金或利息。'+(nextStage?'\n下一场：'+nextStage.name+' · 目标 '+heatText(nextStage.targetHeat):'');
    }else if(nextStage){
      heading='准备下一场';
      body=`${nextStage.name} · 目标 ${heatText(nextStage.targetHeat)}\n筹备后，出牌与弃牌次数补满。`+(nextStage.index%3===2?'\n压轴规则：'+r2BossText(run.boss):'');
    }else if(won){
      const progress=readRunProgress(),qualified=run.mode==='standard'&&!!run.normalCompletion;
      heading=run.mode==='challenge'?R2_MODE_CATALOG.challenges.find(row=>row.id===run.challengeId)!.name+' · 通关':run.mode==='tutorial'?'教学巡演通关':'八章通关';
      body=`${character.name} · 累计 ${heatText(run.totalHeat)} 热度\n`+(qualified?'构筑与金币已保留，可自愿继续无尽巡演。':'本模式结果已保存，可同种子再试或选择下一次巡演。');
      if(qualified&&progress.ok&&progress.progress.standardWins[run.difficulty])body+='\n'+(run.difficulty<3?`D${run.difficulty+1} 与挑战已解锁。`:'四档难度已达最高档；挑战已解锁。');
    }else if(capped){
      heading='已达数值上限';body='进度已保存。可查看本场、在菜单导出，或返回选角。';
    }else if(lost){
      heading=failureSummary(run).reason;
      body=`${failureSummary(run).resources}\n累计 ${heatText(run.totalHeat)} 热度 · 余额 ${run.gold} 金\n同局重试从开局重新开始，构筑不继承。`;
    }
    const touye=savedTouyeWager(trace);if(touye)body=touye+'\n'+body;
    const xiemuInterest=trace?.events.find(e=>e.sourceType==='character'&&e.sourceDefinitionId==='xiemu'&&e.phase==='onStageClear');
    if(!p.short&&!skipped&&this.result.cleared&&xiemuInterest)heading+=' · 额外关末息+'+xiemuInterest.value.n+'金';
    if(p.short&&trace&&!skipped&&this.result.cleared){const assist=savedAssistSummary(trace);if(assist)body=assist+'\n'+body;const fact=victorySourceFact(run,trace);if(fact)body=fact.title+' · '+fact.effect+'\n'+body;}
    {
      v.material(n,0x21474a,0x21474a,4).setName('result/next-panel');
      const nextHeading=v.text(n.x+14,n.y+10,heading,18,'#26313A',n.width-28).setFontStyle('bold');
      const bodyY=nextHeading.y+nextHeading.height+8;
      v.text(n.x+14,bodyY,body,14,'#26313A',n.width-28).setLineSpacing(2).setStyle({maxLines:Math.max(1,Math.floor((n.y+n.height-12-bodyY)/19))});
    }
    if(nextStage){
      const gift=this.ready?stageGiftReceipt(run):undefined;
      v.button(p.left,gift?'赠品去向':'本场详情','action/result-details',()=>gift?this.inspectGift():this.inspectResult());
      v.button(p.primary,'前往筹备商店','action/continue-stage',()=>void this.next(),this.ready,true);
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
    const canSkip=animateIn&&!skipped;
    v.button(p.right,canSkip?'跳过动效':won||lost?'巡演留影':'回看上手',canSkip?'action/skip-celebration':'action/last-hand',()=>{if(canSkip){this.firstRender=false;this.audio.cancelPresentation();this.render();}else if(won||lost)this.inspectFinale();else this.inspectLastHand();},!this.busy&&(canSkip||won||lost||!!trace));
    const discovery=this.ready&&!this.notice&&!lost&&!skipped?savedGrowthDiscovery(run):undefined,gift=this.ready&&!this.notice&&!lost&&!skipped?stageGiftReceipt(run):undefined;
    v.text(p.x,p.noticeY,this.busy?'正在保存…':this.notice||(!this.ready?'当前进度未保存或只读，请查看菜单。':capped?'已达数值上限，进度已保存':won?run.mode==='standard'?'八章通关已保存，继续无尽由你决定。':'本模式结果已保存，可重试或返回选角。':nextStage?gift?.banner||discovery?.full||'':lost?'同局重试沿用角色与开局种子。':''),14,this.notice?'#ffd0b1':'#3F606B',p.w).setName(gift&&nextStage?'gift/discovery':discovery&&nextStage?'growth/discovery':'');
    this.firstRender=false;
  }
  private jokerDefinition(id:string){return r2JokerDefinitionFor(runController(this)!.state,id);}
  private traceSources(trace:ScoreTrace):string[] {
    const character=getCharacter(runController(this)!.state.characterId);
    return [...new Set(trace.events.filter(e=>(e.sourceType==='joker'||e.sourceType==='character')&&e.phase!=='afterHand'&&(e.before.H.n!==e.after.H.n||e.before.H.d!==e.after.H.d||e.before.M.n!==e.after.M.n||e.before.M.d!==e.after.M.d||e.operation==='retrigger-card'&&BigInt(e.value.n)>0n)).map(e=>e.sourceType==='character'?(savedTouyeWager(trace)||character.name):this.jokerDefinition(e.sourceDefinitionId).name))];
  }
  private stopCelebration():void {
    this.outcomeMotion?.dispose();this.outcomeMotion=undefined;
    this.rewardEffects.clear();
    this.celebrationTimer?.remove();this.celebrationTimer=undefined;
    this.tweens.killAll();
  }
  private drawResultHero(b:Box,outcome:ReturnType<typeof stageOutcome>,skipped:boolean,lost:boolean,animate:boolean):void {
    const v=this.view,run=runController(this)!.state;
    resultStagePaper(this,v,b,lost);
    if(animate&&!skipped)this.outcomeMotion=mountResultEntrance(this,v.root,b,!lost);
    if(lost){
      const summary=failureSummary(run),plan=resultStagePlan(b,v.layout.height<500),source=plan.source,main=plan.score,center=main.x+main.width/2;
      const key=selectionPortraitKey(run.characterId),portraitHeight=Math.min(156,Math.max(0,source.height-70)),portraitWidth=portraitHeight*.67;
      if(portraitHeight>=40&&this.textures.exists(key)){
        const image=this.add.image(source.x+source.width/2,source.y+portraitHeight/2,key).setName('result-art/hero');image.setScale(Math.min(portraitWidth/image.width,portraitHeight/image.height));v.add(image);
      }
      v.text(source.x,source.y+portraitHeight+8,getCharacter(run.characterId).name,16,PAPER_CSS.ink,source.width).setFontStyle('bold').setName('result/source-continuity');
      v.text(source.x,source.y+portraitHeight+34,'本局构筑已留影',14,PAPER_CSS.jade,source.width);
      v.text(center,main.y,summary.reason,16,PAPER_CSS.ink,main.width).setOrigin(.5,0).setName('result/failure-reason');
      const last=v.text(center,main.y+28,summary.lastHand,14,PAPER_CSS.jade,main.width).setOrigin(.5,0).setName('result/last-hand');
      const gap=(BigInt(run.stage!.targetHeat)-BigInt(this.result.stageHeat)).toString();
      const scoreY=last.y+last.height+8,compact=main.width<220||v.layout.height<500;
      v.text(center,scoreY,heatText(this.result.stageHeat),compact?32:54,PAPER_CSS.ink,main.width).setOrigin(.5,0).setFontFamily(SCORE_FONT).setFontStyle('bold').setName('result/score');
      v.text(center,scoreY+(compact?44:68),`目标 ${heatText(run.stage!.targetHeat)}\n差 ${heatText(gap)} 热度`,14,PAPER_CSS.jade,main.width).setOrigin(.5,0).setName('result/gap');
      if(animate)this.celebrationTimer=this.time.delayedCall(1000,()=>{if(this.scene.isActive()){this.firstRender=false;this.render();}});
      return;
    }
    const facts=resultStageFacts(run,this.result.cleared,skipped),plan=resultStagePlan(b,v.layout.height<500),main=plan.score,center=main.x+main.width/2,short=v.layout.height<500;
    const small=main.height<200;
    const paint=()=>{
      this.sourceArtLayer?.destroy();const start=v.root.length;
      const sourceView=resultStageSources(this,v,plan.source,facts,short),text=sourceView.text;
      const source=facts.source,growth=facts.growth;
      let y=text.y;
      if(source){const name=v.text(text.x,y,growth?.name??source.title,14,PAPER_CSS.jade,text.width).setFontStyle('bold').setName('result/source-continuity');y+=name.height+6;}
      if(growth){
        const prefix=growth.metric.includes('×')?'×':'+',read=v.text(text.x,y,'本手读取 '+prefix+growth.before,14,PAPER_CSS.jade,text.width).setName('result/growth-read');y+=read.height+4;
        const saved=v.text(text.x,y,prefix+growth.before+' → '+prefix+growth.after,text.width<150?22:24,PAPER_CSS.ink,text.width).setFontStyle('bold').setName('result/growth-saved');y+=saved.height+4;
        v.text(text.x,y,run.phase==='run-won'?'保存成长 · 本局留影':'保存成长 · 下手生效',14,PAPER_CSS.jade,text.width).setName('result/growth-next');
      }else if(source){v.text(text.x,y,source.effect,14,PAPER_CSS.jade,text.width).setStyle({maxLines:short?3:4}).setName('result/source-effect');}
      this.sourceArtLayer=this.add.container(0,0,v.root.list.slice(start)).setName('result-art/source-layer');v.add(this.sourceArtLayer);
      return sourceView;
    };
    this.paintSourceArt=()=>{paint();};const sourceView=paint();
    const hand=facts.trace?HAND_LABELS[facts.trace.handType]:'本场热度';
    v.text(center,main.y,hand,16,PAPER_CSS.jade,main.width-16).setOrigin(.5,0).setName('result/hand');
    const formula=facts.trace?v.text(center,main.y+24,`${fractionText(facts.trace.accumulator.H)} 热度 × ${fractionText(facts.trace.accumulator.M)}`,14,PAPER_CSS.jade,main.width-8).setOrigin(.5,0).setName('result/formula'):undefined;
    const scoreY=formula?formula.y+formula.height+6:main.y+26,scoreSize=short?38:main.width<220?32:small?48:68;
    const score=v.text(center,scoreY,(facts.trace?'+':'')+heatText(facts.trace?.finalScore??this.result.stageHeat),scoreSize,facts.intensity>1?PAPER_CSS.red:PAPER_CSS.ink,main.width-8).setOrigin(.5,0).setFontFamily(SCORE_FONT).setFontStyle('bold').setName('result/score');
    for(let font=scoreSize;score.width>main.width-8&&font>24;)score.setFontSize(--font);
    const totalY=scoreY+score.height+8;
    v.text(center,totalY,skipped?'本场跳过':`全场 ${heatText(this.result.stageHeat)} / ${heatText(run.stage!.targetHeat)}`,14,PAPER_CSS.jade,main.width).setOrigin(.5,0).setName('result/gap');
    const assist=facts.trace&&savedAssistSummary(facts.trace);
    const compact=main.width<220,rewardHeight=short?40:compact?(assist?78:58):assist?54:48;
    const rewardY=short?main.y+main.height-42:compact?main.y+main.height-rewardHeight-8:small?main.y+136:main.y+main.height-70;
    if(this.result.cleared&&!skipped){
      const band={x:main.x,y:rewardY,width:main.width,height:rewardHeight};v.material(band,T.paperLight,T.paperLight,6);
      const reward=v.text(center,band.y+10,(compact?'奖励  +':'过关奖励  +')+this.result.goldEarned+' 金',short||compact?16:20,PAPER_CSS.ink,main.width-12).setOrigin(.5,0).setFontStyle('bold').setName('result/reward');
      if(assist&&!short)v.text(center,band.y+34,assist,14,PAPER_CSS.jade,main.width-12).setOrigin(.5,0).setName('result/assist-source');
      const cue=this.firstRender&&this.rewardCue.claim(run,this.result),size=40,diameter=size*.7,gap=8;
      const x=center-(reward.width+diameter+gap)/2+diameter/2,coinY=reward.y+reward.height/2-size*.04;
      const show=()=>{reward.x=center+(diameter+gap)/2;return addRewardCoin(this,v.root,x,coinY,size,run.stage!.clearId!);};
      if(this.result.goldEarned>0&&run.stage?.clearId){
        if(this.textures.exists(REWARD_COIN.key)){const coin=show();if(cue)this.rewardEffects.enqueue(context=>animateRewardCoin(this,coin,context.signal,!animate));}
        else if(cue)this.rewardEffects.enqueue(async context=>{if(!await loadRewardCoin(this,context.signal)||context.signal.aborted)return;const coin=show();await animateRewardCoin(this,coin,context.signal,!animate);});
      }
      if(cue)void this.rewardEffects.drain().catch(()=>{});
    }
    if(animate&&!skipped&&this.result.cleared){
      // Short settling accents never own a command callback or delay the primary action.
      const accented=[score,...sourceView.art];for(const item of accented){const sx=item.scaleX,sy=item.scaleY;item.setScale(sx*.98,sy*.98);this.tweens.add({targets:item,scaleX:sx,scaleY:sy,duration:facts.intensity>1?260:180,ease:'Cubic.easeOut'});}
      this.celebrationTimer=this.time.delayedCall(1000,()=>{if(this.scene.isActive()){this.firstRender=false;this.render();}});
    }
  }
  private inspectFinale():void {
    const run=runController(this)!.state,facts=finaleKeepsake(run);if(!facts||this.busy)return;
    this.dialog.open(run.phase==='run-won'?'谢幕留影 · 最终构筑':'落幕留影 · 最终构筑',facts.summary+'\n\n'+facts.continuation,[
      {label:'回看最后一手',disabled:!stageOutcome(run.stage!,run.lastTrace).last,run:()=>this.inspectLastHand()},
      {label:'查看最终牌组',run:()=>showDeckInspection(this.dialog,run)},
      {label:'本场详情',run:()=>this.inspectResult()},
    ],{keepsake:facts.keepsake,cards:facts.cards,summaryBody:facts.summary+'\n'+facts.continuation,collapseRules:true,rulesLabel:'最终持有与成长记录'});
  }
  private inspectJourney():void {
    const run=runController(this)!.state;
    const go=()=>this.next();
    showBuildJourney(this.dialog,run,{ready:this.ready&&run.phase==='stage-cleared',source:()=>this.inspectLastHand(),deck:()=>showDeckInspection(this.dialog,run),tools:()=>this.dialog.open('道具箱 · 过关只读',run.consumables.map(c=>toolInfo(c.definitionId).name).join('、')+'\n过关页只查看；前往筹备商店后再选择工具和对象。',[{label:'前往筹备商店继续培养',run:go}]),tool:id=>{const item=run.consumables.find(c=>c.instanceId===id);if(!item)return;const info=toolInfo(item.definitionId,run);this.dialog.open(info.name+' · 过关只读',info.description+'\n'+info.cost+'\n前往筹备商店后自己选择目标并确认。',[{label:'前往筹备商店继续培养',run:go}],{portrait:goodsArtPortrait(info)});},continueLabel:'前往筹备商店继续培养',continue:go});
  }
  private inspectGift():void {
    const gift=stageGiftReceipt(runController(this)!.state);if(!gift)return;
    this.dialog.open(gift.title,gift.body,[{label:'前往筹备商店',primary:true,disabled:!this.ready,run:()=>this.next()},{label:'本场详情',run:()=>this.inspectResult()}],{...(gift.toolId?{portrait:goodsArtPortrait(toolInfo(gift.toolId))}:{})});
  }
  private inspectResult():void {
    const run=runController(this)!.state,stage={...getR2Stage(this.result.stageIndex,run.tourMode,run.difficulty)!,targetHeat:run.stage!.targetHeat};
    const last=stageOutcome(run.stage!,run.lastTrace).last,impact=last?savedBossImpact(run,last):'';
    this.dialog.open('本场详情',`${run.tourMode==='endless'?'无尽 · ':''}${stage.name}\n热度 ${heatText(this.result.stageHeat)} / ${heatText(stage.targetHeat)}\n${this.result.cleared?'过关收益':'本场收益'} ${this.result.goldEarned} 金 · 余额 ${run.gold} 金\n剩余出牌 ${this.result.handsLeft} · 剩余弃牌 ${run.stage?.discardsLeft??0}\n\n当前构筑：`+(run.jokers.map(j=>this.jokerDefinition(j.definitionId).name).join('、')||'空')+'\n\n'+(run.stage?.boss?'本场压轴：'+r2BossText(run.stage.boss):'本场为普通场。')+(impact?'\n\n'+impact:''),last?[{label:'回看最后一手',run:()=>this.inspectLastHand()}]:[]);
  }
  private inspectLastHand():void {
    const run=runController(this)!.state,trace=stageOutcome(run.stage!,run.lastTrace).last;if(!trace)return;
    const impact=savedBossImpact(run,trace);
    const cardName=(id:string)=>{const c=trace.cards.find(c=>c.id===id);return c?rankLabel(c.rank)+SUIT_SYMBOL[c.suit]:'已移除的牌';};
    const lines=trace.events.map(e=>{
      const source=e.sourceType==='joker'?this.jokerDefinition(e.sourceDefinitionId).name:e.sourceType==='character'?getCharacter(run.characterId).name:e.sourceType==='card'?cardName(e.targetCardId??e.sourceInstanceId):e.sourceDefinitionId===trace.bossContext.boss?.definitionId?r2BossText(trace.bossContext.boss).split('：')[0]:R2_MODE_CATALOG.programs.find(program=>program.id===e.sourceDefinitionId)?.name??'牌型';
      if(e.phase==='base')return `${source} · 基础 ${fractionText(e.after.H)} 热度 × ${fractionText(e.after.M)} 倍率`;
      if(e.phase==='finalScore')return `最终得分 ${heatText(trace.finalScore)} 热度`;
      const operation=r2ScoreOperationText(e,e.sourceType==='joker'?this.jokerDefinition(e.sourceDefinitionId):undefined),status=['afterHand','beforeFailure','onStageClear'].includes(e.phase);
      return `${source} · ${operation}`+(status?'':` → ${fractionText(e.after.H)} 热度 × ${fractionText(e.after.M)} 倍率`);
    });
    const summary=`${HAND_LABELS[trace.handType]} Lv.${trace.level} · ${heatText(trace.finalScore)} 热度\n打出：${trace.sets.playedIds.map(cardName).join('、')}\n实际计分：${trace.sets.activeScoringIds.map(cardName).join('、')||'无'}${trace.assist?'\n'+savedAssistCopy(trace):''}${impact?'\n\n'+impact:''}\n\n${fractionText(trace.accumulator.H)} × ${fractionText(trace.accumulator.M)} = ${heatText(trace.finalScore)}`;
    // Read saved activity only; current gold and next-hand eligibility cannot explain this hand.
    const benefits=trace.sourceJokers.flatMap(joker=>{
      const copy=jokerAbilityCopyForRun(run,joker.definitionId,joker,recordedJokerMemoryContext(publicJokerMemoryContext(run,{hand:trace.cards,scoringLimited:false,deckSize:run.deckInstances.length-run.destroyedIds.length,jokerSlots:r2JokerCapacity(run),jokerCount:trace.sourceJokers.length}),trace.bossContext),trace.events);
      const edition=trace.events.filter(event=>event.sourceType==='joker'&&event.sourceInstanceId===joker.instanceId&&event.reasonKey.startsWith('edition.')).map(event=>r2ScoreOperationText(event,this.jokerDefinition(event.sourceDefinitionId))).join('、');
      return [this.jokerDefinition(joker.definitionId).name+'：'+copy.state+(edition?'；版次 '+edition:'')];
    });
    this.dialog.open('最后一手 · 已保存的结算',summary+'\n\n'+lines.join('\n'),run.phase==='stage-cleared'?[{label:'查看培养路线',disabled:!this.ready,run:()=>this.inspectJourney()},{label:'前往筹备商店继续培养',primary:true,disabled:!this.ready,run:()=>this.next()}]:[],benefits.length?{cards:savedExperienceCards(run,trace),effectBody:summary,collapseRules:true,rulesLabel:'完整计分明细'}:{cards:savedExperienceCards(run,trace)});
  }
  private returnToSelect():void {
    if(this.busy)return;this.exitResult('character-select',{freshSeed:true});
  }
  private exitResult(destination:'shop'|'character-select',data?:{freshSeed:true}):void {
    // Phaser queues the switch; retire this view before async finally can repaint a new run.
    this.lifecycle++;this.stopSourceArt();this.rewardEffects.clear();this.dialog.close();this.audio.select();
    paperSceneStart(this,destination,data);
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
