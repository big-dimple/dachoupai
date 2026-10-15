import type {R2RunState} from '../domain/r2Run';
import {HAND_LABELS} from '../content/handLabels';
import {heatText} from './scoreText';
import {stageOutcome} from './stageOutcome';
import {isR2BasicChoice,isR2CoreBuild,isR2SuitChoice,r2BasicChoiceBasePrice,R2_CORE_BUILD_CONTRACT,R2_BASIC_TOOL_IDS,R2_SUIT_DYE_IDS} from '../domain/r2GroupUpgrade';
import {r2PracticeBasePrice} from '../domain/r2Practice';
import {savedBossImpact} from './SavedBossImpact';

/** Explain only committed terminal facts, never infer a strategy or replay a score. */
export function failureSummary(run:Pick<R2RunState,'stage'|'outcome'|'lastTrace'>){
  const stage=run.stage;
  const reason=run.outcome?.reason==='hands-exhausted'?'出牌次数已用完':run.outcome?.reason==='no-legal-cards'?'已无可出牌':run.outcome?.reason==='abandoned'?'已结束本局':'本局已结束';
  const trace=stage?stageOutcome(stage,run.lastTrace).last:null;
  return {
    reason,
    lastHand:trace?'最后一手：'+HAND_LABELS[trace.handType]+' · '+heatText(trace.finalScore)+' 热度':'最后一手记录不可用',
    resources:stage?'剩余出牌 '+stage.handsLeft+' 次 · 弃牌 '+stage.discardsLeft+' 次':'本场资源记录不可用',
  };
}

const routeSteps={
  group:'若摸到同点对子，先留对子、换散牌；例如留两张7，再找第三张7。出牌前核对实际牌型。',
  straight:'先留连续点数、换掉无关牌；例如留5、6、7、8，再找4或9。用“怎么凑牌”查看当前手牌能补哪一张。',
  flush:'先留数量最多的同花色、换掉其他花色；例如四张红桃再找第五张。用“怎么凑牌”核对实际手牌。',
} as const;

/** Eligibility and base prices describe the next shop's rules, never an offer against terminal cash. */
export function failureShopOptions(run:R2RunState):string {
  const parts:string[]=[];
  if(isR2CoreBuild(run))parts.push(`筹备店升级只选已发现且未${R2_CORE_BUILD_CONTRACT.practice.maximumLevel}级的牌型；Lv.1原价${r2PracticeBasePrice(1)}金，之后按等级报价，确认后当场升一级。`);
  if(isR2BasicChoice(run))parts.push(`基础改牌原价${r2BasicChoiceBasePrice(R2_BASIC_TOOL_IDS[0])}金`+(isR2SuitChoice(run)?`、染色原价${r2BasicChoiceBasePrice(R2_SUIT_DYE_IDS[0])}金`:'')+(isR2CoreBuild(run)?'；升级与改牌/染色共用每店一次。':'；基础自选每店一次。'));
  return parts.join('\n')+(parts.length?'\n实付、现货同名入口、可用目标与库存容量以当店确认页为准；买不起或没有合适目标时可以留钱。':'下一局到筹备店查看实际现货、价格和可用目标；没有合适选择时可以留钱。');
}

export interface FailureAdvice {title:string;body:string}
/** Read saved terminal facts only. Suggestions are conditional actions, not a diagnosis or a predicted win. */
export function failureGuidance(run:R2RunState){
  if(run.phase!=='run-lost')return undefined;
  const summary=failureSummary(run),stage=run.stage,reason=run.outcome?.reason;
  const last=stage&&run.outcome?.stageIndex===stage.index?stageOutcome(stage,run.lastTrace).last:null;
  const remaining=stage?BigInt(stage.targetHeat)-BigInt(stage.heat):null;
  const gap=reason==='abandoned'&&stage?.skipResult?'最近一场已跳过，没有计分结果':reason==='abandoned'&&stage&&run.outcome?.stageIndex!==stage.index?'最近一场已结束；本局主动结束':remaining===null?'本场差额记录不可用':remaining>0n?'本场还差 '+heatText(remaining.toString())+' 热度':'本场热度已达目标';
  const title=reason==='hands-exhausted'?'出牌用尽，准备再战':reason==='no-legal-cards'?'已无可出牌，准备再战':reason==='abandoned'?'已结束本局，重新选择':'本局已结束，准备再战';
  const advice:FailureAdvice[]=[];
  if(reason==='abandoned')advice.push({title:'先决定这次想怎么打',body:'这是主动结束本局，不据此判定构筑强弱。可回看已保存的末手，再返回选角换英雄或开局方向。'});
  else if(reason==='no-legal-cards')advice.push({title:'先保住可出的牌',body:`${summary.resources}，但本局已无可出牌。下一局用删牌、破碎或改牌工具前，先查看牌组与工具代价，再确认目标；留钱也可以。`});
  else if(last){
    const route=last.handType==='straight'||last.handType==='straight-flush'?'straight':last.handType==='flush'?'flush':run.openingRoute??'group';
    advice.push({title:'先把一手凑完整',body:`末手是${HAND_LABELS[last.handType]}，保存热度${heatText(last.finalScore)}；这是记录，不代表它一定是失败原因。\n`+routeSteps[route]});
  }else advice.push({title:'先看实际手牌再决定',body:'末手记录不可用，不推断是哪张牌或哪项能力导致结束。下一局先用“怎么凑牌”查看实际候选，再决定留牌、弃牌或出牌。'});
  const impact=last?savedBossImpact(run,last):'';
  if(impact){
    const boss=last!.bossContext!.boss!.definitionId;
    const response=boss==='B02'?'下一局遇到此压轴时，把要读取普通点数的牌放在出牌顺序前三张；第4、5张仍能成型和触发大丑牌。':boss==='B03'?'下一局入场前看清被限制的花色，优先用其他花色作计分牌；受限牌仍可参与成型。':boss==='B04'?'下一局遇到此压轴时，先比较非人头牌能否成型，再选择出牌。':boss==='B05'?'下一局若再次遇到重复牌型限制，先在手牌中查看另一种实际可出的牌型，再决定是否换招。':boss==='B12'?'下一局遇到基础热度减半时，对照仍有效的普通点数与大丑牌来源，再决定怎么凑这一手。':boss==='B08'?'下一局遇到此压轴时，先按牌型与大丑牌安排这一手，不把角色计分能力算进去。':'下一局入场前展开压轴限制，对照能生效的牌型与来源再选择；不要按被停用的来源估算收益。';
    advice.push({title:'按压轴实际影响换招',body:impact+'\n'+response});
  }
  if(advice.length<3&&reason!=='abandoned')advice.push({title:reason==='no-legal-cards'?'重新开局再培养':'升级、做牌或留钱',body:failureShopOptions(run)});
  if(reason==='abandoned')advice.push({title:'重试或换个开局',body:'同局重试沿用种子、英雄、模式与本局规则；返回选角可以重新选择。两种开局都从初始资源开始。'});
  return {title,reason:summary.reason,gap,lastHand:last?summary.lastHand:'最后一手记录不可用',resources:summary.resources,canReview:!!last,advice,
    restart:'同局重试从开局开始，沿用种子、英雄、模式和本局规则；金币、构筑、工具与成长不继承。建议不保证下一局过关。',shopOptions:failureShopOptions(run)};
}
