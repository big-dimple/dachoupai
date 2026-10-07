import type {R2RunState} from '../domain/run';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {r2ConsumableCapacity} from '../domain/r2Run';
import {toolInfo} from './r2ToolInfo';
export interface StageGiftReceipt {banner:string;title:string;body:string;toolId?:string}
/** Saved C12 source facts only. Current ownership or qualification alone never implies a new gift. */
export function stageGiftReceipt(state:R2RunState):StageGiftReceipt|undefined {
 if(!state.stage?.clearId||state.stage.skipResult||!state.lastTrace)return;
 const event=state.lastTrace.events.find(e=>e.phase==='onStageClear'&&e.sourceType==='joker'&&e.sourceDefinitionId==='c12'&&['reward-consumable','add-gold'].includes(e.operation)&&e.rewardDefinitionId&&['T03','T04','T05','T06'].includes(e.rewardDefinitionId)&&BigInt(e.value.n)>0n&&e.resourceBefore!==undefined&&e.resourceAfter!==undefined&&e.resourceAfter>e.resourceBefore);
 if(!event)return;const source=r2JokerDefinitionFor(state,'c12').name,tool=toolInfo(event.rewardDefinitionId!),condition=`${source}：本场打过普通顺子和普通同花，成功过关；该次奖励已保存。`,delta=event.resourceAfter!-event.resourceBefore!;
 if(event.operation==='reward-consumable')return {banner:`${source}赠${tool.name}×${delta} · 已入工具包`,title:source+' · 过关赠品已保存',toolId:event.rewardDefinitionId,body:`${condition}\n\n实际赠品：${tool.name} ×${delta}。结算时已放入工具包。\n当前工具包 ${state.consumables.length}/${r2ConsumableCapacity(state)}。\n\n下一步：前往商店，打开工具包，选择${tool.name}→目标牌→确认使用。查看或取消不消耗工具。`};
 return {banner:`${source} · 包满改收+${delta}金`,title:source+' · 满包替代已保存',body:`${condition}\n\n结算时工具包已满，${tool.name}未入包。\n实际替代：+${delta} 金，该笔入账 ${event.resourceBefore}→${event.resourceAfter}；当前余额 ${state.gold} 金。已计入本场收益，不会再领取一次。\n\n下一步：前往商店继续构筑，或查看已有工具再决定使用。`};
}
