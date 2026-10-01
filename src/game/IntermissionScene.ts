import Phaser from 'phaser';
import {AudioEngine} from '../audio/AudioEngine';
import {getR2Stage} from '../domain/r2Run';
import {getR2Joker} from '../domain/r2Shop';
import {r2BossText} from '../domain/r2Chapter';
import {HAND_LABELS} from '../content/handLabels';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import type {ScoreTrace} from '../domain/scoreR2';
import {heatText,fractionText} from './scoreText';
import {r2ScoreOperationText} from './r2Help';
import {runController,dispatchRun,startRun} from './runAdapter';
import {gameSession} from './session';
import {getCharacter} from './characters';
import {SceneView} from './SceneView';
import {DetailDialog} from './DetailDialog';
import {SKIP_ITEM_LABELS} from './ConsumableDialog';
import type {Box} from './layout';

export interface IntermissionResult {cleared:boolean;stageIndex:number;stageHeat:string;handsLeft:number;goldEarned:number}
function resultLayout(width:number,height:number,top:number,bottom:number){
  const short=height<500,w=Math.min(980,width-24),x=(width-w)/2,footerY=height-bottom-104;
  const bodyY=top+(short?62:82),available=footerY-18-bodyY;
  let score:Box,resources:Box,last:Box,next:Box;
  if(short){
    const leftWidth=(w-12)*.54,rightX=x+leftWidth+12,rightWidth=w-leftWidth-12,scoreHeight=available-70;
    score={x,y:bodyY,width:leftWidth,height:scoreHeight};resources={x,y:bodyY+scoreHeight+10,width:leftWidth,height:60};
    const lastHeight=Math.floor((available-12)*.55);last={x:rightX,y:bodyY,width:rightWidth,height:lastHeight};next={x:rightX,y:bodyY+lastHeight+12,width:rightWidth,height:available-lastHeight-12};
  }else {
    const resourceHeight=62,flex=available-resourceHeight-36,scoreHeight=Math.min(174,flex*.4),lastHeight=Math.min(126,flex*.3);
    score={x,y:bodyY,width:w,height:scoreHeight};resources={x,y:bodyY+scoreHeight+12,width:w,height:resourceHeight};
    last={x,y:resources.y+resourceHeight+12,width:w,height:lastHeight};next={x,y:last.y+lastHeight+12,width:w,height:flex-scoreHeight-lastHeight};
  }
  const sideWidth=Math.floor(w*.28),primaryWidth=Math.floor(w*.43),rightWidth=w-sideWidth-primaryWidth-16;
  return {x,w,top,short,score,resources,last,next,left:{x,y:footerY,width:sideWidth,height:48},primary:{x:x+sideWidth+8,y:footerY,width:primaryWidth,height:48},right:{x:x+sideWidth+primaryWidth+16,y:footerY,width:rightWidth,height:48},noticeY:footerY+56};
}

export class IntermissionScene extends Phaser.Scene {
  private result!:IntermissionResult;
  private view!:SceneView;
  private lifecycle=0;
  private busy=false;
  private notice='';
  private firstRender=true;
  private readonly dialog=new DetailDialog();
  private readonly audio=AudioEngine.shared;
  constructor(){super('intermission');}
  init(data:IntermissionResult):void {this.result=data;}
  private get ready():boolean {return !this.busy&&runController(this)?.status==='idle'&&gameSession().lease.writable;}
  create():void {
    this.lifecycle++;this.busy=false;this.notice='';this.firstRender=true;this.events.once('shutdown',()=>{this.lifecycle++;this.dialog.close();});
    const run=runController(this)?.state;if(!run?.stage){this.scene.start('character-select');return;}
    this.cameras.main.setBackgroundColor('#153c40');
    const skipped=!!run.stage.skipResult;this.audio.setScene(this.result.cleared?'success':'failure');
    if(!skipped){if(this.result.cleared)this.audio.success();else this.audio.failure();}
    this.view=new SceneView(this,()=>this.render());this.render();
    if(!gameSession().reducedMotion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){this.view.root.setAlpha(.35);this.tweens.add({targets:this.view.root,alpha:1,duration:260,ease:'Cubic.easeOut'});}
  }
  private render():void {
    const v=this.view,l=v.layout,bottom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom'))||0;
    const p=resultLayout(l.width,l.height,l.hud.y,bottom),run=runController(this)!.state,stage=getR2Stage(this.result.stageIndex)!,character=getCharacter(run.characterId);
    const nextStage=this.result.cleared&&run.phase==='stage-cleared'?getR2Stage(run.stageIndex):undefined,skipped=run.stage?.skipResult,won=run.phase==='run-won',lost=!this.result.cleared&&!skipped&&!won;
    const gap=(BigInt(stage.targetHeat)>BigInt(this.result.stageHeat)?BigInt(stage.targetHeat)-BigInt(this.result.stageHeat):0n).toString(),accent=this.result.cleared?0x367f75:0xc6a46e,accentText=this.result.cleared?'#367f75':'#72532d';
    v.clear();v.paperBackground();
    if(lost)v.add(this.add.graphics().fillStyle(0xe7c38c,.1).fillEllipse(l.width/2,p.score.y+p.score.height/2,Math.min(l.width+120,1000),p.score.height+170));
    v.text(p.x,p.top,skipped?'换一场，再登台':won?'两章演完了':this.result.cleared?'这场，撑住了':'好戏，可以再来',p.short?24:30,'#fff2da',p.w-72).setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold');
    v.text(p.x,p.top+42,stage.name+' · '+character.name,14,'#d5ddc9',p.w);
    const s=p.score,lightAccent=this.result.cleared?'#b5dec8':'#f2dfb5';
    const animateIn=this.firstRender&&!gameSession().reducedMotion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.panel(s,this.result.cleared?0x3b716d:0x55766b,this.result.cleared?0x183944:0x28484d,0xcda96e,true);
    v.text(s.x+16,s.y+11,lost?'这一轮的积累':'本场热度',14,'#f1dbaa').setFontStyle('bold');
    const scoreSize=Math.max(24,Math.min(p.short?42:56,(s.height-78)/1.2));
    const score=v.text(s.x+16,s.y+31,heatText(this.result.stageHeat),scoreSize,'#fff3d4').setName('result/score').setFontStyle('bold').setShadow(0,2,'#142b34',2,true,true);
    for(let font=scoreSize;score.width>s.width-96&&font>24;)score.setFontSize(--font);
    if(animateIn){
      const target=BigInt(this.result.stageHeat),roll={t:0};
      if(target>0n&&target<10000000000n)this.tweens.add({targets:roll,t:1,duration:560,ease:'Cubic.easeOut',onUpdate:()=>{if(score.active)score.setText(heatText(BigInt(Math.floor(Number(target)*roll.t)).toString()));},onComplete:()=>{if(score.active){score.setText(heatText(this.result.stageHeat));}}});
    }
    const seal={x:s.x+s.width-66,y:s.y+14,width:48,height:48};
    this.panel(seal,0xffe6a5,0xbc8f51,0xf0cc8f);
    const sealStamp=v.text(seal.x+24,seal.y+24,skipped?'跳':this.result.cleared?'过':'再',28,accentText).setOrigin(.5).setAngle(-6).setFontStyle('bold');
    if(animateIn){
      sealStamp.setScale(1.8).setAngle(-28).setAlpha(0);
      this.tweens.add({targets:sealStamp,scale:1,angle:-6,alpha:1,duration:290,delay:240,ease:'Back.easeOut',onComplete:()=>{if(sealStamp.active&&this.scene.isActive())this.audio.cardLand();}});
    }
    if(this.result.cleared&&!skipped&&s.height>=150){
      v.text(seal.x+24,s.y+68,'过关奖励',14,'#e4c894').setOrigin(.5,0);
      const reward=v.text(seal.x+24,s.y+87,'+'+this.result.goldEarned+' 金',24,'#ffdf92').setOrigin(.5,0).setFontStyle('bold').setShadow(0,1,'#142b34',1,true,true);
      for(let font=24;reward.width>80&&font>18;)reward.setFontSize(--font);
      if(animateIn)this.tweens.add({targets:reward,scale:{from:.3,to:1},duration:260,delay:380,ease:'Back.easeOut'});
    }
    v.text(s.x+16,s.y+s.height-46,`目标 ${heatText(stage.targetHeat)} · `+(skipped?'本场跳过':this.result.cleared?'已达标':`差 ${heatText(gap)}`),14,lightAccent,s.width-32).setName('result/gap');
    const bar={x:s.x+16,y:s.y+s.height-18,width:s.width-32,height:7};v.rect(bar,0x142f38).setStrokeStyle(1,0x7f7c66,.65);
    const target=BigInt(stage.targetHeat),current=BigInt(this.result.stageHeat),progress=current>=target?1:Number(current*1000n/target)/1000;
    if(progress>0){
      const fill=v.material({...bar,width:Math.max(1,bar.width*progress)},this.result.cleared?0xb5dcb9:0xf0d79e,this.result.cleared?0x65a895:0xc29a59,2);
      if(animateIn){const full=fill.displayWidth;fill.displayWidth=1;this.tweens.add({targets:fill,displayWidth:full,duration:520,delay:260,ease:'Cubic.easeOut'});}
    }
    const values=[['金币',run.gold],['剩余出牌',this.result.handsLeft],['剩余弃牌',run.stage?.discardsLeft??0],['本场出牌',run.stage?.playIndex??0]] as const;
    v.material(p.resources,0x2a4c52,0x1a323d,6);
    const resourceWidth=(p.resources.width-24)/4;
    values.forEach(([label,value],i)=>{
      const b={x:p.resources.x+i*(resourceWidth+8),y:p.resources.y,width:resourceWidth,height:p.resources.height};
      if(i>0)v.add(this.add.graphics().lineStyle(1,0x809a93,.4).lineBetween(b.x-4,b.y+12,b.x-4,b.y+b.height-12));
      v.text(b.x+8,b.y+7,label,14,i===0?'#f3d59a':'#d1dccb');v.text(b.x+8,b.y+30,String(value),22,i===0?'#ffe4a8':'#fff0d3').setFontStyle('bold');
    });
    const trace=run.lastTrace,a=p.last;this.panel(a,0xfff8e6,0xead7b5,0xbca578);v.text(a.x+14,a.y+10,lost?'这手的亮点 · 最后一手':'最后一手',14,'#48685f').setFontStyle('bold');
    if(trace&&lost&&!p.short&&a.height>=86)this.drawHighlights(trace,a,animateIn);
    else if(trace){
      v.text(a.x+14,a.y+35,HAND_LABELS[trace.handType]+' · +'+heatText(trace.finalScore),p.short?20:22,'#203744',a.width-28);
      const sources=this.traceSources(trace);
      v.text(a.x+14,a.y+66,`${fractionText(trace.accumulator.H)} 热度 × ${fractionText(trace.accumulator.M)} 倍率\n`+(sources.length?'实际触发：'+sources.join('、'):'本手来源：牌型与计分牌'),14,'#48685f',a.width-28).setStyle({maxLines:Math.max(1,Math.floor((a.height-72)/18))});
    }else v.text(a.x+14,a.y+38,skipped?'本场跳过，没有出牌结算。':'本场尚未打出一手。',14,'#203744',a.width-28);
    const n=p.next;this.panel(n,this.result.cleared?0x446f67:0x73634c,this.result.cleared?0x26484f:0x3d4e49,accent);
    let heading='下一步',body='';
    if(skipped){
      const reward=skipped.kind==='coupon'?'下次买牌减2金券':skipped.kind==='gold'?'库存已满，+1金币':SKIP_ITEM_LABELS[skipped.definitionId];
      heading='跳场所得';body=reward+'。没有过关奖金或利息。'+(nextStage?'\n下一场：'+nextStage.name+' · 目标 '+heatText(nextStage.targetHeat):'');
    }else if(nextStage){
      heading=`过关 +${this.result.goldEarned} 金`;
      body=`下一场：${nextStage.name} · 目标 ${heatText(nextStage.targetHeat)}\n去商店补构筑。出牌和弃牌次数会补满。`+(nextStage.index%3===2?'\n压轴规则：'+r2BossText(run.boss):'');
    }else if(won){
      heading='两章试玩完成';body=`${character.name} · 累计 ${heatText(run.totalHeat)} 热度\n当前可玩内容为两章。返回选角，再换一位角色试试。`;
    }else {
      heading='带着这一手，再登台';const discards=run.stage?.discardsLeft??0;
      body=run.outcome?.reason==='no-legal-cards'?'这次牌堆已耗尽；下局留意牌组余量，再找一次成型机会。':discards>0?`这次还留着 ${discards} 次弃牌；下局可以更早找牌。`:'回看最后一手，调整选牌或大丑牌顺序，再试一次。';
      const sources=trace?this.traceSources(trace):[];
      if(sources.length)body+='\n这一手实际触发：'+sources.slice(0,2).join('、')+(sources.length>2?'等'+sources.length+'个来源。':'。');
      else body+='\n同局再试会保留角色与开局种子。';
    }
    const nextHeading=v.text(n.x+14,n.y+10,heading,!p.short&&nextStage&&!skipped?26:18,this.result.cleared?'#ffdf9e':'#ffe2ae',n.width-28).setFontStyle('bold');
    const bodyY=nextHeading.y+nextHeading.height+8;
    v.text(n.x+14,bodyY,body,14,'#fff0d0',n.width-28).setLineSpacing(2).setStyle({maxLines:Math.max(1,Math.floor((n.y+n.height-12-bodyY)/19))});
    if(nextStage){
      v.button(p.left,'本场详情','action/result-details',()=>this.inspectResult());
      v.button(p.primary,'前往商店','action/continue-stage',()=>void this.next(),this.ready,true);
    }else {
      v.button(p.left,won?'返回选角':'新局选角','action/continue-stage',()=>void this.next(),!this.busy);
      v.button(p.primary,this.busy?'正在开局…':lost?'同局再试':'同局重试','action/retry-seed',()=>void this.retrySeed(),this.ready,true);
    }
    v.button(p.right,lost?'本场详情':'回看上手','action/last-hand',()=>lost?this.inspectResult():this.inspectLastHand(),!this.busy&&(lost||!!trace));
    v.text(p.x,p.noticeY,this.busy?'正在保存…':this.notice||(!this.ready?'当前进度未保存或只读，请查看菜单。':nextStage?'结果已保存，进入商店准备下一场。':'同局重试保留角色与 seed，从第一章开始。'),14,this.notice?'#ffd0b1':'#d5ddc9',p.w);
    this.firstRender=false;
  }
  private traceSources(trace:ScoreTrace):string[] {
    const character=getCharacter(runController(this)!.state.characterId);
    return [...new Set(trace.events.filter(e=>(e.sourceType==='joker'||e.sourceType==='character')&&e.phase!=='afterHand'&&(e.before.H.n!==e.after.H.n||e.before.H.d!==e.after.H.d||e.before.M.n!==e.after.M.n||e.before.M.d!==e.after.M.d||e.operation==='retrigger-card'&&BigInt(e.value.n)>0n)).map(e=>e.sourceType==='character'?character.name:getR2Joker(e.sourceDefinitionId).name))];
  }
  /** Highlight facts from the saved last trace, without inventing a best-score history. */
  private drawHighlights(trace:ScoreTrace,b:Box,animate:boolean):void {
    const v=this.view,sources=this.traceSources(trace),facts=[['牌型',HAND_LABELS[trace.handType]],['这一手得分',heatText(trace.finalScore)],[sources.length?'触发来源':'实际计分',sources.length?sources.length+' 个':trace.sets.activeScoringIds.length+' 张']],width=(b.width-40)/3,height=Math.min(74,b.height-40);
    facts.forEach(([label,value],i)=>{
      const x=b.x+12+i*(width+8),y=b.y+34,first=v.root.length;
      v.material({x,y,width,height},i===1?0xffedba:0xf3e9d1,i===1?0xe9ca87:0xe1d6b7,4);
      v.text(x+8,y+4,label,14,'#5a6b5c',width-16).setStyle({maxLines:1});
      const number=v.text(x+width/2,y+25,value,i===1?24:20,'#624e30').setOrigin(.5,0).setFontStyle('bold');
      for(let font=i===1?24:20;number.width>width-12&&font>14;)number.setFontSize(--font);
      const badge=this.add.container();for(const child of v.root.list.slice(first))badge.add(child);v.add(badge);
      badge.once('destroy',()=>this.tweens.killTweensOf([badge,number]));
      if(animate){badge.setY(9).setAlpha(0);this.tweens.add({targets:badge,y:0,alpha:1,duration:260,delay:170+i*100,ease:'Cubic.easeOut',onStart:()=>{if(i===1&&this.scene.isActive())this.audio.cardLand();}});number.setScale(.88);this.tweens.add({targets:number,scale:1,duration:240,delay:230+i*100,ease:'Back.easeOut'});}
    });
  }
  private panel(b:Box,top:number,bottom:number,edge:number,heavy=false):void {
    const v=this.view,g=this.add.graphics(),radius=heavy?8:5;
    v.add(this.add.graphics().fillStyle(0x18353d,.17).fillRoundedRect(b.x+1,b.y+4,b.width,b.height,radius));
    v.material(b,top,bottom,radius);
    g.lineStyle(heavy?1.5:1,edge,heavy?.8:.45).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,radius);
    v.add(g);
  }
  private inspectResult():void {
    const run=runController(this)!.state,stage=getR2Stage(this.result.stageIndex)!;
    this.dialog.open('本场详情',`${stage.name}\n热度 ${heatText(this.result.stageHeat)} / ${heatText(stage.targetHeat)}\n${this.result.cleared?'过关收益':'本场收益'} ${this.result.goldEarned} 金 · 余额 ${run.gold} 金\n剩余出牌 ${this.result.handsLeft} · 剩余弃牌 ${run.stage?.discardsLeft??0}\n\n当前构筑：`+(run.jokers.map(j=>getR2Joker(j.definitionId).name).join('、')||'空')+'\n\n'+(this.result.stageIndex%3===2?'本场压轴：':'本章压轴预告：')+r2BossText(run.boss),run.lastTrace?[{label:'回看最后一手',run:()=>this.inspectLastHand()}]:[]);
  }
  private inspectLastHand():void {
    const run=runController(this)!.state,trace=run.lastTrace;if(!trace)return;
    const cardName=(id:string)=>{const c=run.deckInstances.find(c=>c.id===id);return c?rankLabel(c.rank)+SUIT_SYMBOL[c.suit]:'已移除的牌';};
    const lines=trace.events.map(e=>{
      const source=e.sourceType==='joker'?getR2Joker(e.sourceDefinitionId).name:e.sourceType==='character'?getCharacter(run.characterId).name:e.sourceType==='card'?cardName(e.targetCardId??e.sourceInstanceId):e.sourceDefinitionId==='B02'?'压轴规则':'牌型';
      if(e.phase==='base')return `${source} · 基础 ${fractionText(e.after.H)} 热度 × ${fractionText(e.after.M)} 倍率`;
      if(e.phase==='finalScore')return `最终得分 ${heatText(trace.finalScore)} 热度`;
      const operation=r2ScoreOperationText(e),status=['afterHand','beforeFailure','onStageClear'].includes(e.phase);
      return `${source} · ${operation}`+(status?'':` → ${fractionText(e.after.H)} 热度 × ${fractionText(e.after.M)} 倍率`);
    });
    const body=`${HAND_LABELS[trace.handType]} Lv.${trace.level} · ${heatText(trace.finalScore)} 热度\n打出：${trace.sets.playedIds.map(cardName).join('、')}\n实际计分：${trace.sets.activeScoringIds.map(cardName).join('、')||'无'}\n\n${fractionText(trace.accumulator.H)} × ${fractionText(trace.accumulator.M)} = ${heatText(trace.finalScore)}\n\n`+lines.join('\n');
    this.dialog.open('最后一手 · 已保存的结算',body);
  }
  private async retrySeed():Promise<void> {
    if(!this.ready)return;const run=runController(this)!.state,lifecycle=this.lifecycle;this.busy=true;this.notice='';this.render();
    try {
      const controller=await startRun(this,run.seed,run.characterId);if(lifecycle!==this.lifecycle||!this.scene.isActive())return;
      if(controller?.status==='idle'){this.audio.select();this.scene.start('shop');return;}
      this.notice=gameSession().notice||'新局未保存，请在菜单重试保存。';this.audio.invalid();
    }finally {if(lifecycle===this.lifecycle&&this.scene.isActive()){this.busy=false;this.render();}}
  }
  private async next():Promise<void> {
    if(this.busy)return;this.busy=true;const lifecycle=this.lifecycle,run=runController(this)!.state;this.render();
    try {
      if(this.result.cleared&&run.phase==='stage-cleared'){
        const result=await dispatchRun(this,{type:'OpenShop'});if(lifecycle!==this.lifecycle||!this.scene.isActive())return;
        if(result.ok){this.audio.select();this.scene.start('shop');return;}
        this.notice='商店尚未保存，请在菜单重试保存。';this.audio.invalid();
      }else {this.audio.select();this.scene.start('character-select',{freshSeed:true});return;}
    }finally {if(lifecycle===this.lifecycle&&this.scene.isActive()){this.busy=false;this.render();}}
  }
}
