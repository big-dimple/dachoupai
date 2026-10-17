import {applyCommand,type Action,type R2RunState} from '../domain/run';
import {r2HandLimit,r2HandsBudget} from '../domain/r2Resources';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {r2JokerStateText} from './r2Help';
import {editionLabel} from './r2ToolInfo';
import {currentBuildFocus} from './BuildDirectionPreferences';
import {purchaseValueWindow,purchaseValueWindowText} from './ShopPurchaseValue';

/** Three deterministic permanent-cost tools only. Purchasing is not using;
 * owned purchase prices are sunk, and sacrificed Jokers yield no sale refund. */
export function toolPermanentValue(state:R2RunState,id:string,action?:Extract<Action,{type:'UseConsumable'}>){
 if(!['S03','S04','S07'].includes(id))return '';
 const cost=id==='S03'?`当前每场${r2HandsBudget(state)}次出牌；使用后从下场起永久少1次。`:
  id==='S04'?`当前手牌上限${r2HandLimit(state)}；使用后从下场起永久少1张。`:'牺牲所选唐宋牌，永久失去其本体、已有成长与版次；不返出售金币，不触发出售成长。';
 const summary=cost+'未来可活场数、抽到改造牌与回本未知；永久效果不按无限收益计价。';
 if(!action)return summary+'选定对象后核对；当前可保留不买／不用。';
 const result=applyCommand(state,{runId:state.runId,commandId:state.runId+'/tool-value/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action});
 if(!result.ok)return summary+'当前使用不可执行：'+result.code+'。';
 const after=result.state,donor=state.jokers.find(j=>j.instanceId===action.sacrificeId);
 const rows=state.phase==='shop'?purchaseValueWindow(state,after,currentBuildFocus(state,state.openingRoute)):[];
 return summary+`\n以保留不用为基线；使用净支出${state.gold-after.gold}金；已持工具不重复扣购价。\n下场出牌${r2HandsBudget(state)}→${r2HandsBudget(after)}；手牌上限${r2HandLimit(state)}→${r2HandLimit(after)}。`+
  (donor?'\n失去来源：'+r2JokerDefinitionFor(state,donor.definitionId).name+'；'+r2JokerStateText(donor,r2JokerDefinitionFor(state,donor.definitionId))+'；版次 '+editionLabel(donor.edition):'')+
  (rows.length?'\n'+purchaseValueWindowText(rows):'');
}
