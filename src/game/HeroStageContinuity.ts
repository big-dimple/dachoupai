import type {R2RunState} from '../domain/r2Run';
import {getR2Stage,r2UsesAssist} from '../domain/r2Run';
import {r2RunModeConfig} from '../content/r2Modes';
import {usesAzaoCharge} from '../domain/r2AzaoCharge';
import {usesXiemuBurn,xiemuInterest} from '../domain/r2XiemuBurn';
import {usesErxiangHandoff} from '../domain/r2ErxiangHandoff';
import {usesTouyeWager} from '../domain/r2TouyeWager';
import {usesLaohuanRefill} from '../domain/r2LaohuanRefill';
import {savedHeroResult} from './HeroAbilityCue';
import {savedXiemuBurn} from './XiemuBurnCopy';

export interface HeroStageContinuity {last?:string;next:string;decision:string}
/** A completed stage may remain attached in the shop. It is history, never next-stage availability. */
export function heroStageContinuity(run:R2RunState):HeroStageContinuity|undefined {
 if(!['stage-cleared','shop','stage-ready'].includes(run.phase)||!getR2Stage(run.stageIndex,run.tourMode,run.difficulty))return;
 const azao=usesAzaoCharge(run),xiemu=usesXiemuBurn(run),erxiang=usesErxiangHandoff(run),touye=usesTouyeWager(run),laohuan=usesLaohuanRefill(run),amo=r2UsesAssist(run);
 if(!azao&&!xiemu&&!erxiang&&!touye&&!laohuan&&!amo)return;
 const old=run.stage&&run.stage.index<run.stageIndex?run.stage:undefined;
 let last:string|undefined;
 if(old?.skipResult)last='上一场已跳过，没有出牌或角色发动结果。';
 else if(old){
  const result=run.lastTrace?savedHeroResult(run):'';
  if(azao){const t=run.lastTrace?.azaoCharge;last=t?result+'；本场结束已清层。':'上一场蓄势已清；没有可读取的上手蓄势记录。';}
  else if(xiemu)last=run.lastTrace?.xiemuBurn?savedXiemuBurn(run):'上一场没有可读取的燃金结算记录。';
  else if(laohuan)last=old.laohuanTrickUsed?'上一场戏法已用；留牌已经保存，下一场不重抽旧候选。':'上一场未用戏法。';
  else last=result||((erxiang?old.erxiangHandoffUsed:touye?!!old.touyeWager?.commit:old.assistUsed)?'上一场能力已用；最后一手没有对应角色收益记录。':'上一场未用主动能力。');
 }
 const enabled=r2RunModeConfig(run).characterAbilityEnabled;
 const sealed=run.stageIndex%3===2&&run.boss.definitionId==='B08'&&!laohuan;
 if(!enabled)return {last,next:'本模式角色能力停用',decision:'下一场仍可正常选牌出弃；不要为停用能力预留专用代价。'};
 if(sealed)return {last,next:'下一场静场：角色计分能力停用',decision:xiemu?'下一场不能燃金；额外关末息仍按真实本金结算。':'下一场仍可正常出弃；本场已用与否不改变静场限制。'};
 if(azao)return {last,next:'下场从0层重新蓄势',decision:'两对及以上先蓄，换牌型可续蓄；有层后自己决定释放。弃牌保层，过场不保层。'};
 if(xiemu)return {last,next:'下场燃金次数恢复为1次',decision:`当前${run.gold}金；`+(run.gold<10?`距最低10金燃档还差${10-run.gold}金。`:'可自行留钱，或入场选两对及以上再选燃档。')+`按当前本金，角色关末息最多${xiemuInterest(run.gold)}金；购买/燃金后要按余钱重算，未到账。`};
 if(erxiang)return {last,next:'下场交棒次数恢复为1次',decision:'先凑对子及以上，再选有效核心把一次普通点数改加倍率；可以留到后手，改牌工具与增强仍由你选择。'};
 if(touye)return {last,next:'下场赌约次数恢复为1次',decision:'先看整手哪些目标尚未成型，再选弃牌与赌约；只赌下一手，成型×2、未成×0.85，可不押。'};
 if(laohuan)return {last,next:'下场戏法次数恢复为1次',decision:'先决定保留哪些牌，再自行戏法弃并从真实补牌候选留牌；照付弃牌成本，不能预知补牌。'};
 return {last,next:'下场助攻次数恢复为1次',decision:'两对及以上主手之外留同点对子或三条，可自己选择助攻；副组真消耗，不算留牌，可留到关键手。'};
}
