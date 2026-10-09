import {savedBenefit} from './JokerExperience';
import type {R2RunState} from '../domain/run';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {r2ConsumableCapacity} from '../domain/r2Run';
import {toolInfo} from './r2ToolInfo';
export interface StageGiftReceipt {banner:string;title:string;body:string;toolId?:string}
/** Saved C12 source facts only. Current ownership or qualification alone never implies a new gift. */
export function stageGiftReceipt(state:R2RunState):StageGiftReceipt|undefined {
 if(!state.stage?.clearId||state.stage.skipResult||!state.lastTrace)return;
 const gifts=state.lastTrace.events.filter(e=>e.phase==='onStageClear'&&(e.operation==='reward-consumable'||e.operation==='add-gold'&&!!e.rewardDefinitionId)).map(e=>savedBenefit(state,state.lastTrace!,e)).filter(e=>e!==undefined);
 if(gifts.length&&(gifts.length>1||gifts[0].definitionId!=='c12')){const first=gifts.find(g=>g.toolId);return {banner:gifts[0].title+' · '+gifts[0].effect+(gifts.length>1?' · 共'+gifts.length+'笔':''),title:'过关赠品 · 已保存的来源',toolId:first?.toolId,body:gifts.map(g=>g.title+' · '+g.effect+'\n原因：'+g.condition+'\n去向：'+g.destination+'\n'+g.next).join('\n\n')+'\n\n当前余额 '+state.gold+' 金；查看不重复领奖。'};}
 const event=state.lastTrace.events.find(e=>e.phase==='onStageClear'&&e.sourceType==='joker'&&e.sourceDefinitionId==='c12'&&['reward-consumable','add-gold'].includes(e.operation)&&e.rewardDefinitionId&&['T03','T04','T05','T06'].includes(e.rewardDefinitionId)&&BigInt(e.value.n)>0n&&e.resourceBefore!==undefined&&e.resourceAfter!==undefined&&e.resourceAfter>e.resourceBefore);
 if(!event)return;const source=r2JokerDefinitionFor(state,'c12').name,tool=toolInfo(event.rewardDefinitionId!),condition=`${source}：本场打过普通顺子和普通同花，成功过关；该次奖励已保存。`,delta=event.resourceAfter!-event.resourceBefore!;
 if(event.operation==='reward-consumable')return {banner:`${source}赠${tool.name}×${delta} · 已入道具箱`,title:source+' · 过关赠品已保存',toolId:event.rewardDefinitionId,body:`${condition}\n\n实际赠品：${tool.name} ×${delta}。结算时已放入道具箱。\n当前道具箱 ${state.consumables.length}/${r2ConsumableCapacity(state)}。\n\n下一步：前往商店，打开道具箱，选择${tool.name}→目标牌→确认使用。查看或取消不消耗工具。`};
 return {banner:`${source} · 包满改收+${delta}金`,title:source+' · 满包替代已保存',body:`${condition}\n\n结算时道具箱已满，${tool.name}未入包。\n实际替代：+${delta} 金，该笔入账 ${event.resourceBefore}→${event.resourceAfter}；当前余额 ${state.gold} 金。已计入本场收益，不会再领取一次。\n\n下一步：前往商店继续构筑，或查看已有工具再决定使用。`};
}
