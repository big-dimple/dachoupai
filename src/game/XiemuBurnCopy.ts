import {usesXiemuBurn,xiemuInterest,type XiemuBurnCost} from '../domain/r2XiemuBurn';
import {AMO_ASSIST_TYPES} from '../domain/r2QualifiedHands';
import {r2RunModeConfig} from '../content/r2Modes';
import {r2InterestCap,type R2RunState} from '../domain/r2Run';
import type {R2HandType} from '../domain/evaluateR2';
export function xiemuChoice(run:R2RunState,type?:R2HandType,cost:XiemuBurnCost=0){
 const enabled=usesXiemuBurn(run)&&run.phase==='await-input'&&r2RunModeConfig(run).characterAbilityEnabled&&run.stage?.boss?.definitionId!=='B08',used=run.stage?.xiemuBurnUsed??false,qualified=!!type&&AMO_ASSIST_TYPES.includes(type);
 const choices=([10,20,30] as const).map(amount=>{const after=run.gold-amount,interest=(g:number)=>Math.min(r2InterestCap(run),Math.floor(g/5)),loss=after>=0?interest(run.gold)-interest(after):0,extraLoss=after>=0?xiemuInterest(run.gold)-xiemuInterest(after):0,reason=!enabled?'本场不能燃':used?'本场已用':!qualified?'先选两对及以上':after<0?'金币不足，不降档':'';return {cost:amount,multiplier:amount/10+1,after,available:!reason,reason,label:'燃'+amount+'金 ×'+(amount/10+1),details:after<0?'不足'+(amount-run.gold)+'金，整档拒绝':`花后${after}金；按当前本金，常规息少${loss}、角色息少${extraLoss}金`};});
 return {enabled,used,qualified,choices,compact:used?'本场已燃':!enabled?'本场不能燃':cost?'已选燃'+cost+'金':'可燃10／20／30 · 点英雄',mobile:used?'谢幕·燃金已用':!enabled?'谢幕·不能燃':cost?'谢幕·燃'+cost+'↗':'谢幕·燃金↗',details:`当前${run.gold}金；${used?'本场燃金已用，入场才重置':'每场一次，默认不燃；选档不扣，出牌才扣'}。\n`+choices.map(c=>c.label+'：'+c.details+(c.reason?'；'+c.reason:'')).join('\n')+'\n息损只按当前本金说明；关末按实际扣燃后、奖励前余额结算。其它持币效果也读余金。'};
}
export function savedXiemuBurn(run:R2RunState):string {const t=run.lastTrace?.xiemuBurn;if(!t)return '';const interest=run.lastTrace!.events.find(e=>e.sourceType==='character'&&e.sourceDefinitionId==='xiemu'&&e.phase==='onStageClear');return (t.cost?`上手已燃${t.cost}金，${t.goldBefore}→${t.goldAfter}；角色时点实际×${t.multiplier}`:'上手未燃，保留金币')+(interest?'\n额外关末息+'+interest.value.n+'金；奖励前本金'+interest.goldBeforeRewards+'，不含本次奖励':'');}
