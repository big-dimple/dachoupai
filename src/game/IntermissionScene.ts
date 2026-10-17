import {warmNextSceneImages} from './StageImageWarmup';
import {heroText} from './HeroIdentity';
import {formatScoreReview} from './ScoreReview';
import {heroStageContinuity} from './HeroStageContinuity';
import {drawSettlement,mountSettlementMotion,settlementFacts,settlementContentHeight} from './SettlementPresentation';
import {loadResultSourceArt} from './ResultStageArt';
import {jokerArtPreviewUrl} from './jokerArt';
import {paperSceneStart} from './PaperFlow';
import {savedTouyeWager} from './TouyeWagerCopy';
import {savedBossImpact} from './SavedBossImpact';
import {stageIdentity} from './StageIdentity';
import {jokerArtKey} from './jokerArt';
import {showBuildJourney} from './BuildJourneyDialog';
import {showDeckInspection} from './DeckInspector';
import {stageGiftReceipt} from './StageGiftReceipt';
import {toolInfo,goodsArtPortrait} from './r2ToolInfo';
import {savedGrowthDiscovery} from './JokerGrowthCausality';
import Phaser from 'phaser';
import {R2_MODE_CATALOG} from '../content/r2Modes';
import {readRunProgress} from '../platform/RunProgress';
import {AudioEngine,type FailureCue} from '../audio/AudioEngine';
import {getR2Stage} from '../domain/r2Run';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {r2BossText} from '../domain/r2Chapter';
import {HAND_LABELS} from '../content/handLabels';
import type {ScoreTrace} from '../domain/scoreR2';
import {heatText} from './scoreText';
import {runController,dispatchRun,startRun} from './runAdapter';
import {gameSession} from './session';
import {getCharacter} from './characters';
import {stageOutcome} from './stageOutcome';
import {failureSummary,failureGuidance} from './FailureSummary';
import {finaleKeepsake} from './FinaleKeepsake';
import {endlessContinuationCopy} from './EndlessContinuationCopy';
import {selectionPortraitKey,selectionPortraitURL} from './portraits';
import {showHeroExplanation} from './HeroExplanation';
import {EffectQueue} from '../core/EffectQueue';
import {REWARD_COIN,RewardCoinCue,loadRewardCoin,addRewardCoin,animateRewardCoin} from './RewardCoin';
import {SceneView} from './SceneView';
import {DetailDialog} from './DetailDialog';
import {SKIP_ITEM_LABELS} from './ConsumableDialog';
import type {Box} from './layout';
import {PAPER_CSS,PAPER_THEME as T} from './theme';

export interface IntermissionResult {cleared:boolean;stageIndex:number;stageHeat:string;handsLeft:number;goldEarned:number;failureCue?:FailureCue;rewardClearId?:string}
function resultLayout(width:number,height:number,top:number,bottom:number,heroCaption=false,highScore=false,failure=false){
  const short=height<500,portrait=width<700&&height>width,tight=portrait&&height<=700,w=Math.min(900,width-24),x=(width-w)/2;
  const bodyY=top+(short?54:portrait?64:88),nextHeight=short?Math.min(94,height-bottom-bodyY-126):portrait?(tight?60:86):116;
  const available=height-bottom-bodyY-(portrait?nextHeight+128:short?16:nextHeight+44);
  const preferredHeight=failure?(short?192:portrait?180:212):short?240:settlementContentHeight(w,heroCaption,highScore);
  const score:Box={x,y:bodyY,width:short?w*.64-12:w,height:Math.min(available,preferredHeight)};
  const next:Box=short?{x:x+w*.64,y:bodyY,width:w*.36,height:nextHeight}:{x,y:score.y+score.height+12,width:w,height:nextHeight};
  const actionX=short?next.x:portrait?x:x+w-288,actionWidth=short?next.width:portrait?w:288;
  const actionY=short?next.y+next.height+8:portrait?next.y+next.height+8:next.y+8;
  const primary:Box={x:actionX,y:actionY,width:actionWidth,height:portrait&&tight||short?48:56};
  const auxY=primary.y+primary.height+4,auxWidth=(actionWidth-8)/2;
  const nextText:Box={...next,width:short||portrait?next.width:next.width-actionWidth-28};
  return {x,w,top,short,portrait,tight,score,next,nextText,primary,left:{x:actionX,y:auxY,width:auxWidth,height:44},right:{x:actionX+auxWidth+8,y:auxY,width:auxWidth,height:44},noticeY:Math.max(next.y+next.height,auxY+44)+4};
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
    // Optional transport belongs to a mounted result view, independent of ending audio.
    if(!this.paintSourceArt)return;
    const controller=runController(this),run=controller?.state;if(!controller||!run?.stage||run.stage.skipResult)return;
    const source=this.result.cleared?settlementFacts(run,true,!!run.stage.skipResult).card:undefined;
    const candidates=[{key:selectionPortraitKey(run.characterId),url:selectionPortraitURL(run.characterId)},...(source?[{key:jokerArtKey(source.id),url:jokerArtPreviewUrl(source.id)}]:[])].filter((item):item is {key:string;url:string}=>!!item.key&&!!item.url&&!this.textures.exists(item.key));
    if(!candidates.length)return;
    this.stopSourceArt();const request=this.sourceArtRequest=new AbortController(),lifecycle=this.lifecycle;
    const current=()=>this.sourceArtRequest===request&&!request.signal.aborted&&lifecycle===this.lifecycle&&this.sys.settings.active&&!this.busy&&runController(this)===controller&&controller.state===run;
    for(const item of candidates)void loadResultSourceArt(this,item.key,item.url,request.signal,current).then(loaded=>{
      if(loaded&&current())this.paintSourceArt?.();
    });
  }
  create():void {
    warmNextSceneImages(this,'shop');
    this.lifecycle++;this.busy=false;this.notice='';this.firstRender=true;
    const motion=typeof window==='undefined'?undefined:window.matchMedia('(prefers-reduced-motion: reduce)');
    const preference=()=>{if((gameSession().reducedMotion||motion?.matches)&&this.scene.isActive()){this.firstRender=false;this.render();}};
    const suspend=()=>{if(this.scene.isActive()){this.firstRender=false;this.audio.cancelPresentation();this.render();}};
    const visibility=()=>{if(document.hidden)suspend();};
    if(typeof window!=='undefined')window.addEventListener('dachoupai-presentation',preference);
    motion?.addEventListener('change',preference);
    if(typeof window!=='undefined')window.addEventListener('blur',suspend);
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',visibility);
    const retire=()=>{if(typeof window!=='undefined'){window.removeEventListener('dachoupai-presentation',preference);window.removeEventListener('blur',suspend);}if(typeof document!=='undefined')document.removeEventListener('visibilitychange',visibility);motion?.removeEventListener('change',preference);this.events.off('shutdown',retire);this.events.off('destroy',retire);this.lifecycle++;this.stopSourceArt();this.paintSourceArt=undefined;this.sourceArtLayer=undefined;this.dialog.close();this.stopCelebration();};
    this.events.once('shutdown',retire);this.events.once('destroy',retire);
    const run=runController(this)?.state;if(!run?.stage){this.scene.start('character-select');return;}
    this.cameras.main.setBackgroundColor('#F3EADB');
    const skipped=run.phase==='run-lost'?false:!!run.stage.skipResult;this.audio.setScene(this.result.cleared?'success':'failure');
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
    const run=runController(this)!.state,resultFacts=settlementFacts(run,this.result.cleared,!!run.stage?.skipResult),p=resultLayout(l.width,l.height,l.hud.y,bottom,!!resultFacts.hero,resultFacts.tier>=2,!this.result.cleared&&run.phase==='run-lost'),stage={...getR2Stage(this.result.stageIndex,run.tourMode,run.difficulty,run)!,targetHeat:run.stage!.targetHeat},character=getCharacter(run.characterId);
    const nextStage=this.result.cleared&&run.phase==='stage-cleared'?getR2Stage(run.stageIndex,run.tourMode,run.difficulty,run):undefined,skipped=run.phase==='run-lost'?null:run.stage?.skipResult,won=run.phase==='run-won',capped=this.result.cleared&&run.phase==='stage-cleared'&&!nextStage,lost=!this.result.cleared&&!skipped&&!won;
    const animateIn=this.firstRender&&!gameSession().reducedMotion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.stopCelebration();v.clear();this.paintSourceArt=undefined;this.sourceArtLayer=undefined;v.paperBackground();
    const identity=stageIdentity(stage.index,run.stage!.boss,run.tourMode,run.difficulty,run)!;
    v.text(p.x,p.top,(run.tourMode==='endless'?'无尽 · ':'')+stage.name+' · '+character.name,14,identity.isBoss?PAPER_CSS.red:PAPER_CSS.jade,p.w-116).setName('stage-identity/result');
    const guidance=lost?failureGuidance(run):undefined;
    const title=capped?'本局暂止于此':skipped?'换一场，再对局':won?(run.mode==='tutorial'?'教学对局完成！':run.mode==='challenge'?'挑战完成！':'八章通关'):this.result.cleared?(identity.isBoss?'压轴过关 · '+identity.title:'本场获胜'):guidance?.title??'此局结束，再来一局';
    v.text(p.x,p.top+(p.short?22:28),title,p.short||p.portrait&&identity.isBoss?22:p.portrait?26:34,identity.isBoss&&this.result.cleared?PAPER_CSS.red:PAPER_CSS.ink,p.w).setName('result/title').setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold');
    this.drawResultHero(p.score,!!skipped,lost,animateIn);
    const trace=run.lastTrace;
    const n=p.nextText;
    let heading='下一步',body='';
    if(skipped){
      const reward=skipped.kind==='coupon'?'下次买牌减2金券':skipped.kind==='gold'?'库存已满，+1金币':SKIP_ITEM_LABELS[skipped.definitionId];
      heading='跳场所得';body=reward+'。没有过关奖金或利息。'+(nextStage?'\n下一场：'+nextStage.name+' · 目标 '+heatText(nextStage.targetHeat):'');
    }else if(nextStage){
      const nextIdentity=stageIdentity(nextStage.index,nextStage.index%3===2?run.boss:null,run.tourMode,run.difficulty,run)!;
      heading=nextIdentity.isBoss?'下一场压轴 · '+nextIdentity.title:'准备下一场';const hero=heroStageContinuity(run);
      body=nextIdentity.isBoss?'目标 '+heatText(nextStage.targetHeat)+' · '+nextIdentity.scope:`${nextStage.name} · 目标 ${heatText(nextStage.targetHeat)}\n筹备后，出牌与弃牌次数补满。`+(!p.short&&hero?'\n'+hero.next:'');
    }else if(won){
      const progress=readRunProgress(),qualified=run.mode==='standard'&&!!run.normalCompletion;
      heading=run.mode==='challenge'?R2_MODE_CATALOG.challenges.find(row=>row.id===run.challengeId)!.name+' · 通关':run.mode==='tutorial'?'教学对局通关':'八章通关';
      body=`${character.name} · 已过关场次累计热度 ${heatText(run.totalHeat)}\n`+(qualified?'构筑与金币已保留，可自愿继续无尽对局。':'本模式结果已保存，可同种子再试或选择下一次对局。');
      if(qualified&&progress.ok&&progress.progress.standardWins[run.difficulty])body+='\n'+(run.difficulty<3?`D${run.difficulty+1} 与挑战已解锁。`:'四档难度已达最高档；挑战已解锁。');
    }else if(capped){
      heading='已达数值上限';body='进度已保存。可查看本场、在菜单导出，或返回选角。';
    }else if(lost){
      heading='再来一局';
      body=p.tight?'同局重试从开局，构筑不继承。':`${failureSummary(run).resources}\n已过关场次累计热度 ${heatText(run.totalHeat)} · 余额 ${run.gold} 金\n同局重试从开局重新开始，构筑不继承。`;
    }
    const touye=savedTouyeWager(trace);if(touye&&!nextStage&&!p.short)body=touye+'\n'+body;
    const xiemuInterest=trace?.events.find(e=>e.sourceType==='character'&&e.sourceDefinitionId==='xiemu'&&e.phase==='onStageClear');
    if(!p.short&&!skipped&&this.result.cleared&&xiemuInterest)heading+=' · 额外关末息+'+xiemuInterest.value.n+'金';
    if(lost){
      const prompt=run.outcome?.reason==='abandoned'?'主动结束，可以重新选择':run.outcome?.reason==='no-legal-cards'?'先查牌组，再准备开局':'先看末手，再选下一步';
      this.auxiliary(n,'再战建议 ›\n'+prompt,'action/failure-guidance',()=>this.inspectFailure(),!this.busy);
    }else {
      v.add(this.add.graphics().lineStyle(1,T.divider,.75).beginPath().moveTo(p.next.x,p.next.y-2).lineTo(p.next.x+p.next.width,p.next.y-2).strokePath());
      const nextHeading=v.text(n.x,n.y+2,heading,p.portrait&&p.tight?16:18,PAPER_CSS.ink,n.width).setFontStyle('bold').setName('result/next-heading');
      const bodyY=nextHeading.y+nextHeading.height+3;
      v.text(n.x,bodyY,body,14,PAPER_CSS.jade,n.width).setLineSpacing(1).setStyle({maxLines:Math.max(1,Math.floor((n.y+n.height-bodyY)/17))}).setName('result/next-body');
    }
    if(nextStage){
      const gift=this.ready?stageGiftReceipt(run):undefined;
      this.auxiliary(p.left,gift?'赠品去向':'本场详情','action/result-details',()=>gift?this.inspectGift():this.inspectResult());
      v.button(p.primary,'前往筹备商店','action/continue-stage',()=>void this.next(),this.ready,true);
    }else if(won){
      this.auxiliary(p.left,'返回选角','action/return-select',()=>this.returnToSelect(),!this.busy);
      if(run.mode==='standard'&&run.normalCompletion)v.button(p.primary,'继续无尽','action/continue-endless',()=>this.confirmEndless(),this.ready,true);
      else v.button(p.primary,run.mode==='tutorial'?'重温教程':'再挑战一次','action/retry-seed',()=>void this.retrySeed(),this.ready,true);
    }else if(capped){
      this.auxiliary(p.left,'本场详情','action/result-details',()=>this.inspectResult(),!this.busy);
      v.button(p.primary,'返回选角','action/return-select',()=>this.returnToSelect(),!this.busy,true);
    }else {
      this.auxiliary(p.left,'返回选角','action/continue-stage',()=>void this.next(),!this.busy);
      v.button(p.primary,this.busy?'正在开局…':'同局重试','action/retry-seed',()=>void this.retrySeed(),this.ready,true);
    }
    this.auxiliary(p.right,won||lost?'对局回顾':'回看上手','action/last-hand',()=>{if(won||lost)this.inspectFinale();else this.inspectLastHand();},!this.busy&&(won||lost||!!trace));
    const discovery=this.ready&&!this.notice&&!lost&&!skipped?savedGrowthDiscovery(run):undefined,gift=this.ready&&!this.notice&&!lost&&!skipped?stageGiftReceipt(run):undefined;
    v.text(p.short?p.next.x:p.x,p.noticeY,this.busy?'正在保存…':this.notice||(!this.ready?'当前进度未保存或只读，请查看菜单。':capped?'已达数值上限，进度已保存':won?run.mode==='standard'?'八章通关已保存，继续无尽由你决定。':'本模式结果已保存，可重试或返回选角。':nextStage?gift?.banner||discovery?.full||'':lost?'重试从开局开始，金币与构筑不继承。':''),14,this.notice?'#ffd0b1':'#3F606B',p.short?p.next.width:p.w).setStyle(p.short?{maxLines:1}:{}).setName(gift&&nextStage?'gift/discovery':discovery&&nextStage?'growth/discovery':'');
    this.firstRender=false;
  }
  private auxiliary(b:Box,label:string,name:string,action:()=>void,enabled=true):void {
    const v=this.view,text=v.text(b.x+b.width/2,b.y+b.height/2,label,14,PAPER_CSS.jade,b.width-4).setOrigin(.5).setAlpha(enabled?1:.55);
    const hit=v.rect(b).setFillStyle(0,0).setStrokeStyle().setData('label',text);
    v.target(hit,name,{tap:()=>{if(enabled){this.audio.select();action();}}});
    if(!enabled)hit.disableInteractive();
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
  private drawResultHero(b:Box,skipped:boolean,lost:boolean,animate:boolean):void {
    const v=this.view,run=runController(this)!.state;
    const presentation=drawSettlement(this,v,b,run,this.result.cleared,skipped);
    const explainHero=(image:Phaser.GameObjects.Image|undefined)=>{
      if(!image)return;
      const hit=v.rect(image.getData('bounds')).setFillStyle(0,0).setStrokeStyle();image.parentContainer.add(hit);
      v.target(hit,'result/hero-details',{tap:()=>showHeroExplanation(this.dialog,run.characterId,{run,closeLabel:'返回结算'}),detail:()=>showHeroExplanation(this.dialog,run.characterId,{run,closeLabel:'返回结算'})});
    };
    if(lost&&run.outcome?.reason==='abandoned'){
      const formula=v.root.list.find(o=>o.name==='result/formula') as Phaser.GameObjects.Text|undefined;
      formula?.setText(run.stage?.skipResult?'上一场已跳过 · 没有计分记录':run.outcome.stageIndex!==run.stage?.index?'上一场已结束 · 本局主动结束':'本局主动结束 · 目标 '+heatText(run.stage!.targetHeat));
    }
    explainHero(presentation.hero);this.paintSourceArt=()=>{explainHero(presentation.paint());};
    if(animate&&!skipped)this.outcomeMotion=mountSettlementMotion(this,v.root,b,presentation.score,presentation.hero,presentation.facts.tier,lost);
    if(this.result.cleared&&!skipped){
      const band=presentation.reward,center=band.x+band.width/2;
      v.add(this.add.graphics().lineStyle(1,T.divider,.7).beginPath().moveTo(band.x,band.y-5).lineTo(band.x+band.width,band.y-5).strokePath());
      const reward=v.text(center,band.y+7,'奖励  +'+this.result.goldEarned+' 金',band.height<30?14:band.width<220?16:20,PAPER_CSS.ink).setOrigin(.5,0).setFontStyle('bold').setName('result/reward');
      const cue=this.firstRender&&this.rewardCue.claim(run,this.result),size=band.height<30?24:32,diameter=size*.7,gap=6;
      const x=center-(reward.width+diameter+gap)/2+diameter/2,coinY=reward.y+reward.height/2-size*.04;
      const show=()=>{reward.x=center+(diameter+gap)/2;return addRewardCoin(this,v.root,x,coinY,size,run.stage!.clearId!);};
      if(this.result.goldEarned>0&&run.stage?.clearId){
        if(this.textures.exists(REWARD_COIN.key)){const coin=show();if(cue)this.rewardEffects.enqueue(context=>animateRewardCoin(this,coin,context.signal,!animate));}
        else if(cue)this.rewardEffects.enqueue(async context=>{if(!await loadRewardCoin(this,context.signal)||context.signal.aborted)return;const coin=show();await animateRewardCoin(this,coin,context.signal,!animate);});
      }
      if(cue)void this.rewardEffects.drain().catch(()=>{});
    }
  }
  private inspectFailure():void {
    const run=runController(this)!.state,facts=failureGuidance(run);if(!facts||this.busy)return;
    this.dialog.open(facts.title,facts.shopOptions,[
      {label:'回看最后一手',disabled:!facts.canReview,run:()=>this.inspectLastHand()},
      {label:'返回选角',run:()=>this.returnToSelect()},
      {label:'同局重试',primary:true,disabled:!this.ready,run:()=>{this.dialog.close();return this.retrySeed();}},
    ],{closeLabel:'返回失败页',effectBody:facts.reason+' · '+facts.gap+'\n'+facts.lastHand+'\n'+facts.resources,
      summaryBody:'重试从开局开始；金币、构筑、工具与成长不继承，建议不保证过关。',
      cards:facts.advice.map((row,index)=>({title:(index+1)+'. '+row.title,body:row.body})),
      collapseRules:true,rulesLabel:'升级与做牌的实际规则',secondaryActions:[{label:'对局回顾',run:()=>this.inspectFinale()}]});
  }
  private inspectFinale():void {
    const run=runController(this)!.state,facts=finaleKeepsake(run);if(!facts||this.busy)return;
    this.dialog.open(run.phase==='run-won'?'通关回顾 · 最终构筑':'本局回顾 · 最终构筑',facts.summary+'\n\n'+facts.continuation,[
      {label:'回看最后一手',disabled:!stageOutcome(run.stage!,run.lastTrace).last,run:()=>this.inspectLastHand()},
      {label:'查看最终牌组',run:()=>showDeckInspection(this.dialog,run)},
      {label:'本场详情',run:()=>this.inspectResult()},
      ...(run.phase==='run-lost'?[{label:'再战建议',run:()=>this.inspectFailure()}]:[]),
    ],{heroRun:run,keepsake:facts.keepsake,cards:facts.cards,summaryBody:facts.summary+'\n'+facts.continuation,collapseRules:true,rulesLabel:'最终持有与成长记录'});
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
    const run=runController(this)!.state,stage={...getR2Stage(this.result.stageIndex,run.tourMode,run.difficulty,run)!,targetHeat:run.stage!.targetHeat};
    const last=stageOutcome(run.stage!,run.lastTrace).last,impact=last?savedBossImpact(run,last):'';
    this.dialog.open('本场详情',`${run.tourMode==='endless'?'无尽 · ':''}${stage.name}\n热度 ${heatText(this.result.stageHeat)} / ${heatText(stage.targetHeat)}\n${this.result.cleared?'过关收益':'本场收益'} ${this.result.goldEarned} 金 · 余额 ${run.gold} 金\n剩余出牌 ${this.result.handsLeft} · 剩余弃牌 ${run.stage?.discardsLeft??0}\n\n当前构筑：`+(run.jokers.map(j=>this.jokerDefinition(j.definitionId).name).join('、')||'空')+'\n\n'+(run.stage?.boss?'本场压轴：'+heroText(r2BossText(run.stage.boss)):'本场为普通场。')+(impact?'\n\n'+impact:''),[...(last?[{label:'回看最后一手',run:()=>this.inspectLastHand()}]:[]),...(run.phase==='run-lost'?[{label:'再战建议',run:()=>this.inspectFailure()}]:[])]);
  }
  private inspectLastHand():void {
    const run=runController(this)!.state,trace=stageOutcome(run.stage!,run.lastTrace).last;if(!trace)return;
    const review=formatScoreReview(run,trace);
    this.dialog.open('最后一手 · 已保存的结算',review.diagnostics,run.phase==='stage-cleared'?[{label:'查看培养路线',disabled:!this.ready,run:()=>this.inspectJourney()},{label:'前往筹备商店继续培养',primary:true,disabled:!this.ready,run:()=>this.next()}]:run.phase==='run-lost'?[{label:'返回再战建议',run:()=>this.inspectFailure()}]:[],{cards:review.cards,effectBody:review.summary,collapseRules:true,rulesLabel:'诊断：精确分数与原始事件'});
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
    const dialog=this.dialog.open('继续无尽 · 自愿对局',endlessContinuationCopy(run),[
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
      this.notice=run.phase==='run-lost'?(gameSession().pendingRun?'新局未保存；菜单重试，原局保留。':'未开新局；请看菜单，原局保留。'):gameSession().notice||'新局未保存，请在菜单重试保存。';this.audio.invalid();
    }finally {if(lifecycle===this.lifecycle&&this.scene.isActive()){this.busy=false;this.render();}}
  }
  private async next():Promise<void> {
    if(this.busy)return;this.busy=true;const lifecycle=this.lifecycle,run=runController(this)!.state;this.render();
    try {
      if(this.result.cleared&&run.phase==='stage-cleared'&&getR2Stage(run.stageIndex,run.tourMode,run.difficulty,run)){
        const result=await dispatchRun(this,{type:'OpenShop'},run.commandSeq);if(lifecycle!==this.lifecycle||!this.scene.isActive())return;
        if(result.ok){this.exitResult('shop');return;}
        this.notice='商店尚未保存，请在菜单重试保存。';this.audio.invalid();
      }else {this.exitResult('character-select',{freshSeed:true});return;}
    }finally {if(lifecycle===this.lifecycle&&this.scene.isActive()){this.busy=false;this.render();}}
  }
}
