import {usesAzaoCharge} from '../domain/r2AzaoCharge';
import {AMO_ASSIST_TYPES} from '../domain/r2QualifiedHands';
import {r2RunModeConfig} from '../content/r2Modes';
import type {R2RunState} from '../domain/r2Run';
import type {R2HandType} from '../domain/evaluateR2';
export function azaoChoice(run:R2RunState,type?:R2HandType){
 const enabled=usesAzaoCharge(run)&&run.phase==='await-input'&&r2RunModeConfig(run).characterAbilityEnabled&&run.stage?.boss?.definitionId!=='B08',charge=run.stage?.azaoCharge?.charge??0,previous=run.stage?.azaoCharge?.previousQualifiedType,multiplier=['','1.5','2.5','4'][charge];
 const qualified=!!type&&AMO_ASSIST_TYPES.includes(type),available=enabled&&charge>0&&qualified;
 const hold=!enabled?'本场停用，不蓄不放':!type?'两对及以上蓄势 · 点英雄选释放':!qualified?'本手不合格，出牌清空蓄势':previous===type?'重复牌型，不释放则清空':`不释放：结算后蓄 ${Math.min(3,charge+1)} 层`;
 return {enabled,charge,multiplier,available,hold,compact:enabled?`蓄${charge}层${charge?' · 可放×'+multiplier:''}`:'蓄势停用'};
}
export function savedAzaoCharge(run:R2RunState):string {
 const trace=run.lastTrace?.azaoCharge;if(!trace)return '';
 return (trace.release?`阿燥 · 已释放${trace.before.charge}层，实际 ×${trace.multiplier}`:`阿燥 · 本手蓄势 ${trace.before.charge} → ${trace.after.charge}层`)+(run.phase==='await-input'?`\n当前蓄势${run.stage?.azaoCharge?.charge??0}层；弃牌保留，场间清空。`:'\n本场已结束，蓄势已清；再次入场从0层开始。');
}
