import type {CommandResult,R2RunState} from '../domain/run';
import {r2ConsumableCapacity} from '../domain/r2Resources';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {cardDefinitionName} from './tangsongCardNames';
import {toolInfo} from './r2ToolInfo';

export interface SavedStageGift {
  key:string;eventId:string;commandId:string;clearId:string;sourceInstanceId:string;sourceName:string;
  rewardDefinitionId:string;rewardName:string;destination:'tools'|'gold';amount:number;
  before:number;after:number;inventoryBefore:number;inventoryAfter:number;capacity:number;itemInstanceId?:string;
}

/** Call only with the awaited SavedRun success. Trace inspection/restoration never starts a delivery. */
export function savedC12Gifts(before:R2RunState,result:CommandResult<R2RunState>):SavedStageGift[] {
  if(!result.ok||result.duplicate)return [];
  const after=result.state,stage=after.stage,trace=after.lastTrace;
  if(before.runId!==after.runId||after.commandSeq!==before.commandSeq+1||result.receipt.seq!==after.commandSeq||
    before.phase!=='await-input'||before.stage?.clearId||!stage?.clearId||stage.skipResult||
    before.stage?.index!==stage.index||!['stage-cleared','run-won'].includes(after.phase)||!trace||
    !result.events.some(e=>e.type==='hand-scored-r2'&&e.score.rootId===trace.rootId))return [];
  const clearId=stage.clearId,remaining=after.consumables.filter(item=>!before.consumables.some(old=>old.instanceId===item.instanceId));
  return trace.events.flatMap(event=>{
    if(event.phase!=='onStageClear'||event.sourceType!=='joker'||event.sourceDefinitionId!=='c12'||
      !['T03','T04','T05','T06'].includes(event.rewardDefinitionId??'')||
      !['reward-consumable','add-gold'].includes(event.operation)||event.resourceBefore===undefined||
      event.resourceAfter===undefined||event.resourceAfter<=event.resourceBefore)return [];
    const destination=event.operation==='reward-consumable'?'tools':'gold',definitionId=event.rewardDefinitionId!;
    const index=remaining.findIndex(item=>item.definitionId===definitionId),item=index>=0?remaining[index]:undefined;
    if(destination==='tools'&&!item)return [];
    if(destination==='tools')remaining.splice(index,1);
    return [{key:after.runId+'/'+clearId+'/'+event.eventId,eventId:event.eventId,commandId:result.receipt.commandId,
      clearId,sourceInstanceId:event.sourceInstanceId,sourceName:cardDefinitionName(r2JokerDefinitionFor(after,'c12')),
      rewardDefinitionId:definitionId,rewardName:toolInfo(definitionId).name,destination,
      amount:event.resourceAfter-event.resourceBefore,before:event.resourceBefore,after:event.resourceAfter,
      inventoryBefore:before.consumables.length,inventoryAfter:after.consumables.length,capacity:r2ConsumableCapacity(after),
      ...(destination==='tools'?{itemInstanceId:item!.instanceId}:{})}];
  });
}

/** Per mounted scene. Claimed identities stay consumed after skip/cancel; they never queue a late replay. */
export class StageGiftDeliveryCue {
  private readonly seen=new Set<string>();
  claim(fact:SavedStageGift,signal:AbortSignal):boolean {
    if(signal.aborted||this.seen.has(fact.key))return false;
    this.seen.add(fact.key);return true;
  }
}
