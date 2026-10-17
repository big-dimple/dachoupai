import {SavedRun,type SaveSlots,type SaveStore} from '../../src/application/SavedRun';
import {makeCheckpoint} from '../../src/application/checkpoint';
import type {Command,R2RunState} from '../../src/domain/run';
import {savedC12Gifts} from '../../src/game/SavedStageGift';
import {stageGiftPlan} from './stage-gift';

/** Controlled pre-owned c12 and public hand; actual reducer + save-before-publish, no economic patching. */
export class C12EvidenceStore implements SaveStore {
  slots:SaveSlots={revision:0,current:null,previous:null};fail=false;writes=0;
  async read(){return structuredClone(this.slots);}
  async commit(revision:number,current:ReturnType<typeof makeCheckpoint>,previous:ReturnType<typeof makeCheckpoint>|null){
    this.writes++;if(this.fail)throw Error('controlled-save-failure');if(this.slots.revision!==revision)throw Error('write-conflict');
    this.slots={revision:revision+1,current:structuredClone(current),previous:structuredClone(previous)};return revision+1;
  }
}
export const c12Command=(state:R2RunState,selectedIds:string[]):Command=>({runId:state.runId,commandId:state.runId+'/command/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action:{type:'PlayHand',selectedIds}});
export async function c12GiftEvidence(full=false,special=false,cursor=0){
  const plan=stageGiftPlan(full,special);plan.state.rng.reward.state=cursor;
  const store=new C12EvidenceStore(),run=await SavedRun.start(store,plan.state,await store.read()),initial=run.state;
  const firstResult=await run.submit(c12Command(run.state,plan.first));if(!firstResult.ok)throw Error(firstResult.code);
  const before=run.state,command=c12Command(before,plan.second),result=await run.submit(command);if(!result.ok)throw Error(result.code);
  const after=run.state,facts=savedC12Gifts(before,result),saved=JSON.stringify(await store.read()),writes=store.writes;
  const duplicate=await run.submit(command),restored=SavedRun.restore(store,await store.read()),restoredDuplicate=await restored.submit(command);
  return {initial,firstResult,before,command,result,after,facts,checkpoint:store.slots.current,duplicate,restoredDuplicate,
    restored:restored.state,noDuplicateWrite:writes===store.writes&&saved===JSON.stringify(await store.read())};
}
