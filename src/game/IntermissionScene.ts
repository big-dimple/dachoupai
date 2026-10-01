import Phaser from 'phaser';
import {AudioEngine} from '../audio/AudioEngine';
import {getR2Stage} from '../domain/r2Run';
import {getR2Joker} from '../domain/r2Shop';
import {r2BossText} from '../domain/r2Chapter';
import {HAND_LABELS} from '../content/handLabels';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import {heatText,fractionText} from './scoreText';
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
  private readonly dialog=new DetailDialog();
  private readonly audio=AudioEngine.shared;
  constructor(){super('intermission');}
  init(data:IntermissionResult):void {this.result=data;}
  private get ready():boolean {return !this.busy&&runController(this)?.status==='idle'&&gameSession().lease.writable;}
  create():void {
    this.lifecycle++;this.busy=false;this.notice='';this.events.once('shutdown',()=>{this.lifecycle++;this.dialog.close();});
    const run=runController(this)?.state;if(!run?.stage){this.scene.start('character-select');return;}
    this.cameras.main.setBackgroundColor('#e4dac7');
    const skipped=!!run.stage.skipResult;this.audio.setScene(this.result.cleared?'success':'failure');
    if(!skipped){if(this.result.cleared)this.audio.success();else this.audio.failure();}
    this.view=new SceneView(this,()=>this.render());this.render();
    if(!gameSession().reducedMotion&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){this.view.root.setAlpha(.35);this.tweens.add({targets:this.view.root,alpha:1,duration:260,ease:'Cubic.easeOut'});}
  }
  private render():void {
    const v=this.view,l=v.layout,bottom=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom'))||0;
    const p=resultLayout(l.width,l.height,l.hud.y,bottom),run=runController(this)!.state,stage=getR2Stage(this.result.stageIndex)!,character=getCharacter(run.characterId);
    const nextStage=this.result.cleared&&run.phase==='stage-cleared'?getR2Stage(run.stageIndex):undefined,skipped=run.stage?.skipResult,won=run.phase==='run-won';
    const gap=(BigInt(stage.targetHeat)>BigInt(this.result.stageHeat)?BigInt(stage.targetHeat)-BigInt(this.result.stageHeat):0n).toString(),accent=this.result.cleared?0x367f75:0xbf493d,accentText=this.result.cleared?'#367f75':'#aa3f35';
    v.clear();v.paperBackground();
    v.text(p.x,p.top,skipped?'换一场，再登台':won?'两章演完了':this.result.cleared?'这场，撑住了':'冷场了，再试一次',p.short?24:30,'#203744',p.w-72);
    v.text(p.x,p.top+42,stage.name+' · '+character.name,14,'#48685f',p.w);
    const s=p.score,lightAccent=this.result.cleared?'#b5dec8':'#ffc7a7';
    this.panel(s,this.result.cleared?0x3b716d:0x7c4a48,this.result.cleared?0x183944:0x3e2836,0xcda96e,true);
    v.text(s.x+16,s.y+11,'本场热度',14,'#f1dbaa').setFontStyle('bold');
    const scoreSize=Math.max(24,Math.min(p.short?42:56,(s.height-78)/1.2));
    const score=v.text(s.x+16,s.y+31,heatText(this.result.stageHeat),scoreSize,'#fff3d4').setName('result/score').setFontStyle('bold').setShadow(0,2,'#142b34',2,true,true);
    for(let font=scoreSize;score.width>s.width-96&&font>24;)score.setFontSize(--font);
    const seal={x:s.x+s.width-66,y:s.y+14,width:48,height:48};
    this.panel(seal,0xffe6a5,0xbc8f51,0xf0cc8f);
    v.text(seal.x+24,seal.y+24,skipped?'跳':this.result.cleared?'过':'冷',28,accentText).setOrigin(.5).setAngle(-6).setFontStyle('bold');
    if(this.result.cleared&&!skipped&&s.height>=150){
      v.text(seal.x+24,s.y+68,'过关奖励',14,'#e4c894').setOrigin(.5,0);
      const reward=v.text(seal.x+24,s.y+87,'+'+this.result.goldEarned+' 金',24,'#ffdf92').setOrigin(.5,0).setFontStyle('bold').setShadow(0,1,'#142b34',1,true,true);
      for(let font=24;reward.width>80&&font>18;)reward.setFontSize(--font);
    }
    v.text(s.x+16,s.y+s.height-46,`目标 ${heatText(stage.targetHeat)} · `+(skipped?'本场跳过':this.result.cleared?'已达标':`差 ${heatText(gap)}`),14,lightAccent,s.width-32).setName('result/gap');
    const bar={x:s.x+16,y:s.y+s.height-18,width:s.width-32,height:7};v.rect(bar,0x142f38).setStrokeStyle(1,0x7f7c66,.65);
    const target=BigInt(stage.targetHeat),current=BigInt(this.result.stageHeat),progress=current>=target?1:Number(current*1000n/target)/1000;
    if(progress>0)v.material({...bar,width:Math.max(1,bar.width*progress)},this.result.cleared?0xb5dcb9:0xf2b68e,this.result.cleared?0x65a895:0xc77765,2);
    const values=[['金币',run.gold],['剩余出牌',this.result.handsLeft],['剩余弃牌',run.stage?.discardsLeft??0],['本场出牌',run.stage?.playIndex??0]] as const;
    const resourceWidth=(p.resources.width-24)/4;
    values.forEach(([label,value],i)=>{
      const b={x:p.resources.x+i*(resourceWidth+8),y:p.resources.y,width:resourceWidth,height:p.resources.height};
      this.panel(b,i===0?0xf9dfa6:0xfaf0d9,i===0?0xd4ac6d:0xdfceb0,i===0?0xb38b50:0xb8aa8d);
      v.text(b.x+8,b.y+7,label,14,i===0?'#664a2a':'#48685f',b.width-16);v.text(b.x+8,b.y+30,String(value),22,i===0?'#694623':'#203744').setFontStyle('bold');
    });
    const trace=run.lastTrace,a=p.last;this.panel(a,0xfff8e6,0xead7b5,0xbca578);v.text(a.x+14,a.y+10,'最后一手',14,'#48685f').setFontStyle('bold');
    if(trace){
      v.text(a.x+14,a.y+35,HAND_LABELS[trace.handType]+' · +'+heatText(trace.finalScore),p.short?20:22,'#203744',a.width-28);
      const sources=[...new Set(trace.events.filter(e=>e.sourceType==='joker'||e.sourceType==='character').map(e=>e.sourceType==='character'?character.name:getR2Joker(e.sourceDefinitionId).name))];
      v.text(a.x+14,a.y+66,`${fractionText(trace.accumulator.H)} 热度 × ${fractionText(trace.accumulator.M)} 倍率\n`+(sources.length?'实际触发：'+sources.join('、'):'本手来源：牌型与计分牌'),14,'#48685f',a.width-28).setStyle({maxLines:Math.max(1,Math.floor((a.height-72)/18))});
    }else v.text(a.x+14,a.y+38,skipped?'本场跳过，没有出牌结算。':'本场尚未打出一手。',14,'#203744',a.width-28);
    const n=p.next;this.panel(n,this.result.cleared?0x446f67:0x805249,this.result.cleared?0x26484f:0x4c2e39,accent);
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
      heading='这次哪里没撑住';const discards=run.stage?.discardsLeft??0;
      body=(run.outcome?.reason==='no-legal-cards'?'手牌和抽牌堆已耗尽，目标尚未达到。':'出牌次数用尽，目标尚未达到。')+'\n'+(discards>0?`还有 ${discards} 次弃牌未使用；下局可以更早换牌。`:'弃牌已用完；回看最后一手，再调整构筑和出牌。');
    }
    const nextHeading=v.text(n.x+14,n.y+10,heading,!p.short&&nextStage&&!skipped?26:18,this.result.cleared?'#ffdf9e':'#ffc4a5',n.width-28).setFontStyle('bold');
    const bodyY=nextHeading.y+nextHeading.height+8;
    v.text(n.x+14,bodyY,body,14,'#fff0d0',n.width-28).setLineSpacing(2).setStyle({maxLines:Math.max(1,Math.floor((n.y+n.height-12-bodyY)/19))});
    if(nextStage){
      v.button(p.left,'本场详情','action/result-details',()=>this.inspectResult());
      v.button(p.primary,'前往商店','action/continue-stage',()=>void this.next(),this.ready,true);
    }else {
      v.button(p.left,won?'返回选角':'新局选角','action/continue-stage',()=>void this.next(),!this.busy);
      v.button(p.primary,this.busy?'正在开局…':'同局重试','action/retry-seed',()=>void this.retrySeed(),this.ready,true);
    }
    v.button(p.right,'回看上手','action/last-hand',()=>this.inspectLastHand(),!!trace&&!this.busy);
    v.text(p.x,p.noticeY,this.busy?'正在保存…':this.notice||(!this.ready?'当前进度未保存或只读，请查看菜单。':nextStage?'结果已保存，进入商店准备下一场。':'同局重试保留角色与 seed，从第一章开始。'),14,this.notice?'#aa3f35':'#48685f',p.w);
  }
  private panel(b:Box,top:number,bottom:number,edge:number,heavy=false):void {
    const v=this.view,g=this.add.graphics(),radius=heavy?8:5;
    v.add(this.add.graphics().fillStyle(0x18353d,.17).fillRoundedRect(b.x+1,b.y+4,b.width,b.height,radius));
    v.material(b,top,bottom,radius);
    g.lineStyle(heavy?2:1,edge).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,radius);
    g.lineStyle(1,0xffecc3,heavy ? .45 : .35).beginPath().moveTo(b.x+8,b.y+5).lineTo(b.x+b.width-8,b.y+5).strokePath();
    if(heavy){
      g.lineStyle(1,0x94ada1,.45).strokeRoundedRect(b.x+5,b.y+5,b.width-10,b.height-10,4);
      for(const [cx,cy,sx,sy] of [[b.x+8,b.y+8,1,1],[b.x+b.width-8,b.y+8,-1,1],[b.x+8,b.y+b.height-8,1,-1],[b.x+b.width-8,b.y+b.height-8,-1,-1]]){
        g.lineStyle(2,0xe5bd7c).beginPath().moveTo(cx,cy+8*sy).lineTo(cx,cy).lineTo(cx+8*sx,cy).strokePath();
      }
    }
    v.add(g);
  }
  private inspectResult():void {
    const run=runController(this)!.state,stage=getR2Stage(this.result.stageIndex)!;
    this.dialog.open('本场详情',`${stage.name}\n热度 ${heatText(this.result.stageHeat)} / ${heatText(stage.targetHeat)}\n过关收益 ${this.result.goldEarned} 金 · 余额 ${run.gold} 金\n剩余出牌 ${this.result.handsLeft} · 剩余弃牌 ${run.stage?.discardsLeft??0}\n\n当前构筑：`+(run.jokers.map(j=>getR2Joker(j.definitionId).name).join('、')||'空')+'\n\n本章压轴：'+r2BossText(run.boss));
  }
  private inspectLastHand():void {
    const run=runController(this)!.state,trace=run.lastTrace;if(!trace)return;
    const cardName=(id:string)=>{const c=run.deckInstances.find(c=>c.id===id);return c?rankLabel(c.rank)+SUIT_SYMBOL[c.suit]:'已移除的牌';};
    const lines=trace.events.filter(e=>e.phase!=='afterHand').map(e=>{
      const source=e.sourceType==='joker'?getR2Joker(e.sourceDefinitionId).name:e.sourceType==='character'?getCharacter(run.characterId).name:e.sourceType==='card'?cardName(e.targetCardId??e.sourceInstanceId):e.sourceDefinitionId==='B02'?'压轴规则':'牌型';
      const operation=({'base':'基础','add-heat':'+热度','add-multiplier':'+倍率','multiply-multiplier':'×倍率','ordinary-points-suppressed':'普通点数归零','final-score':'最终得分','add-growth':'成长','retrigger-card':'重触发','retrigger-cap':'重触发上限'} as Record<string,string>)[e.operation]??'触发';
      return `${source} · ${operation} ${fractionText(e.value)} → ${fractionText(e.after.H)} 热度 × ${fractionText(e.after.M)} 倍率`;
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
