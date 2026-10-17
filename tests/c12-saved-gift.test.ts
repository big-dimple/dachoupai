import {describe,expect,it} from 'vitest';
import {applyCommand,type Command,type R2RunState} from '../src/domain/run';
import {SavedRun,type SaveSlots,type SaveStore} from '../src/application/SavedRun';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {r2JokerDefinitionFor} from '../src/domain/r2ContentProfiles';
import {stageGiftPlan,giftSend} from '../harness/fixtures/stage-gift';
import {savedC12Gifts,StageGiftDeliveryCue} from '../src/game/SavedStageGift';

class Store implements SaveStore {
  slots:SaveSlots={revision:0,current:null,previous:null};fail=false;writes=0;
  async read(){return structuredClone(this.slots);}
  async commit(revision:number,current:ReturnType<typeof makeCheckpoint>,previous:ReturnType<typeof makeCheckpoint>|null){
    this.writes++;if(this.fail)throw Error('controlled-quota');if(revision!==this.slots.revision)throw Error('write-conflict');
    this.slots={revision:revision+1,current:structuredClone(current),previous:structuredClone(previous)};return revision+1;
  }
}
const command=(s:R2RunState,ids:string[]):Command=>({runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action:{type:'PlayHand',selectedIds:ids}});
const prepared=(full=false,special=false)=>{const p=stageGiftPlan(full,special);return {...p,state:giftSend(p.state,{type:'PlayHand',selectedIds:p.first})};};

describe('C12 gifts from actual persisted rule results',()=>{
  it.each([false,true])('persists the ordinary flush + ordinary straight prize; full=%s',async full=>{
    const p=prepared(full),store=new Store(),run=await SavedRun.start(store,p.state,await store.read()),before=run.state,cmd=command(before,p.second);
    const result=await run.submit(cmd),facts=savedC12Gifts(before,result);
    expect(result.ok).toBe(true);expect(before.stage).toMatchObject({ordinaryFlushSeen:true,ordinaryStraightSeen:false});
    expect(run.state.stage).toMatchObject({ordinaryStraightSeen:true,ordinaryFlushSeen:true,heat:'1280'});
    expect(run.state.lastTrace).toMatchObject({handType:'straight',finalScore:'580'});expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({sourceInstanceId:'owned/c12',rewardDefinitionId:'T04',rewardName:'方片染',destination:full?'gold':'tools',amount:full?2:1,before:full?30:0,after:full?32:1});
    expect(run.state.gold).toBe(full?32:30);expect(run.state.consumables.map(i=>i.definitionId)).toEqual(full?['T01','T17']:['T04']);
    expect(full?facts[0].itemInstanceId:run.state.consumables[0].instanceId).toBe(full?undefined:facts[0].itemInstanceId);
    expect(run.state.rng.reward).toEqual({algorithm:'fnv1a-mulberry32-v1',state:1831565813});
    expect(readCheckpoint(store.slots.current).ok).toBe(true);
    const saved=JSON.stringify(store.slots),snapshot=structuredClone(run.state),writes=store.writes;
    const duplicate=await run.submit(cmd);expect(duplicate.ok&&duplicate.duplicate).toBe(true);expect(savedC12Gifts(before,duplicate)).toEqual([]);
    const restored=SavedRun.restore(store,await store.read());expect(restored.state).toEqual(snapshot);
    const again=await restored.submit(cmd);expect(again.ok&&again.duplicate).toBe(true);expect(savedC12Gifts(before,again)).toEqual([]);
    expect(store.writes).toBe(writes);expect(JSON.stringify(store.slots)).toBe(saved);
  });
  it('does not expose or animate the candidate until persistence succeeds; retry does not redraw',async()=>{
    const p=prepared(),store=new Store(),run=await SavedRun.start(store,p.state,await store.read()),before=run.state,cmd=command(before,p.second),slots=await store.read();
    store.fail=true;const failed=await run.submit(cmd);expect(failed.ok).toBe(false);expect(savedC12Gifts(before,failed)).toEqual([]);expect(run.state).toBe(before);expect(await store.read()).toEqual(slots);
    const pending=JSON.parse(run.exportJSON()).state;expect(pending.consumables.map((i:{definitionId:string})=>i.definitionId)).toEqual(['T04']);
    store.fail=false;const result=await run.retry();expect(savedC12Gifts(before,result)).toHaveLength(1);expect(run.state).toEqual(pending);
  });
  it('ordinary flush + straight flush wins without satisfying an ordinary straight',async()=>{
    const p=prepared(false,true),store=new Store(),run=await SavedRun.start(store,p.state,await store.read()),before=run.state;
    const result=await run.submit(command(before,p.second));expect(run.state.phase).toBe('stage-cleared');
    expect(run.state.stage).toMatchObject({ordinaryFlushSeen:true,ordinaryStraightSeen:false});
    expect(savedC12Gifts(before,result)).toEqual([]);expect(run.state.consumables).toEqual([]);expect(run.state.rng.reward).toEqual(before.rng.reward);
  });
  it('an actual failed stage never emits a prize',async()=>{
    const p=prepared(),store=new Store(),run=await SavedRun.start(store,p.state,await store.read());
    while(run.state.phase==='await-input'){
      const before=run.state,result=await run.submit(command(before,[before.handOrder[0]]));
      expect(result.ok).toBe(true);expect(savedC12Gifts(before,result)).toEqual([]);
    }
    expect(run.state.phase).toBe('run-lost');expect(run.state.consumables).toEqual([]);expect(run.state.stage?.ordinaryStraightSeen).toBe(false);
    expect(SavedRun.restore(store,await store.read()).state).toEqual(run.state);
  });
  it('the actual published reward hook has four equal slots and live draws reach every dye',()=>{
    const rewards=new Set<string>();
    for(let cursor=0;cursor<40&&rewards.size<4;cursor++){
      const p=prepared();p.state.rng.reward.state=cursor;
      const result=applyCommand(p.state,command(p.state,p.second));expect(result.ok).toBe(true);
      if(result.ok)rewards.add(savedC12Gifts(p.state,result)[0].rewardDefinitionId);
    }
    expect([...rewards].sort()).toEqual(['T03','T04','T05','T06']);
    const hook=r2JokerDefinitionFor(prepared().state,'c12').hooks.find(h=>h.phase==='onStageClear')!;
    expect(hook.operations).toEqual([{kind:'reward-consumable-pool',definitionIds:['T03','T04','T05','T06'],fallbackGold:2}]);
  });
  it('presentation claims cannot replay after cancellation or on an already aborted generation',()=>{
    const p=prepared(),result=applyCommand(p.state,command(p.state,p.second)),fact=savedC12Gifts(p.state,result)[0],cue=new StageGiftDeliveryCue(),a=new AbortController();
    expect(cue.claim(fact,a.signal)).toBe(true);a.abort();expect(cue.claim(fact,new AbortController().signal)).toBe(false);
    const aborted=new AbortController();aborted.abort();expect(new StageGiftDeliveryCue().claim(fact,aborted.signal)).toBe(false);
  });
});
