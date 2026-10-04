import {describe,expect,it} from 'vitest';
import {reorderJokerIds} from '../src/game/JokerReorder';
import {createRun} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {SavedRun,type SaveSlots,type SaveStore} from '../src/application/SavedRun';
import {makeCheckpoint,type Checkpoint} from '../src/application/checkpoint';

const moves=Array.from({length:5},(_,i)=>i+1).flatMap(length=>
  Array.from({length},(_,from)=>Array.from({length},(_,to)=>({length,from,to}))).flat());

describe('owned Joker final-slot adapter',()=>{
  it.each(moves)('$length Jokers: $from → $to matches the existing splice order',({length,from,to})=>{
    const ids=Object.freeze(Array.from({length},(_,i)=>'owned/'+i));
    const expected=[...ids],[id]=expected.splice(from,1);expected.splice(to,0,id);
    const result=reorderJokerIds(ids,ids[from],to);
    expect(result).toEqual(expected);
    expect(ids).toEqual(Array.from({length},(_,i)=>'owned/'+i));
    if(from===to)expect(result).toBe(ids);else expect(result).not.toBe(ids);
  });

  it.each([-1,3,1.5,NaN,Infinity,-Infinity])('rejects invalid destination %s without changing the array',to=>{
    const ids=Object.freeze(['first','middle','last']);
    expect(reorderJokerIds(ids,'first',to)).toBe(ids);
  });

  it('keeps the same reference for a missing instance, empty row and same-slot drop',()=>{
    const ids=Object.freeze(['one','two']),empty=Object.freeze([] as string[]);
    expect(reorderJokerIds(ids,'missing',0)).toBe(ids);
    expect(reorderJokerIds(empty,'missing',0)).toBe(empty);
    expect(reorderJokerIds(ids,'two',1)).toBe(ids);
  });

  it('moves the exact instance even when two instances share a definition',()=>{
    const ids=Object.freeze(['a01/instance-1','a01/instance-2','d03/instance-3']);
    expect(reorderJokerIds(ids,'a01/instance-2',0)).toEqual(['a01/instance-2','a01/instance-1','d03/instance-3']);
  });
});

class MemoryStore implements SaveStore {
  slots:SaveSlots={revision:0,current:null,previous:null};
  writes=0;
  beforeCommit?:()=>Promise<void>;
  async read(){return structuredClone(this.slots);}
  async commit(expected:number,current:Checkpoint,previous:Checkpoint|null){
    this.writes++;await this.beforeCommit?.();
    if(expected!==this.slots.revision)throw Error('write-conflict');
    this.slots={revision:expected+1,current:structuredClone(current),previous:structuredClone(previous)};
    return this.slots.revision;
  }
}

async function savedRow(){
  const state=createRun({seed:'joker-reorder',runId:'joker-reorder',characterId:'amo',rulesVersion:'r2'});
  state.jokers=['e11','pengci','f12'].map((definitionId,i)=>r2CreateJoker(definitionId,'owned/'+i,4));
  state.jokers[0].growth.coefficient={n:'7',d:'5'};
  state.jokers[2].growth.coefficient={n:'3',d:'2'};
  const store=new MemoryStore(),run=await SavedRun.start(store,state,store.slots);
  return {store,run};
}

describe('adapted order uses the existing saved command',()=>{
  it('publishes only after saving, increments once and keeps resources, RNG and instance state',async()=>{
    const {run,store}=await savedRow(),before=run.state,slots=await store.read(),writes=store.writes;
    const current=before.jokers.map(j=>j.instanceId),ids=reorderJokerIds(current,current[0],2);
    let finish!:()=>void;store.beforeCommit=()=>new Promise<void>(resolve=>finish=resolve);
    const submitted=run.dispatch({type:'ReorderJokers',ids},before.commandSeq);
    expect(run.state).toBe(before);expect(await store.read()).toEqual(slots);
    expect(run.status).toBe('saving');finish();
    expect((await submitted).ok).toBe(true);
    expect(store.writes).toBe(writes+1);expect(run.state.commandSeq).toBe(before.commandSeq+1);
    expect(run.state.jokers.map(j=>j.instanceId)).toEqual(ids);
    expect(run.state.jokers).toEqual([before.jokers[1],before.jokers[2],before.jokers[0]]);
    expect(run.state.gold).toBe(before.gold);expect(run.state.rng).toEqual(before.rng);
    expect(store.slots.current).toEqual(makeCheckpoint(run.state,run.journal));
    expect(SavedRun.restore(store,await store.read()).state).toEqual(run.state);
    const committed=run.state,duplicate=await run.submit(run.journal.at(-1)!);
    expect(duplicate.ok&&duplicate.duplicate).toBe(true);
    expect(run.state).toBe(committed);expect(store.writes).toBe(writes+1);
  });

  it('rejects a stale expectedSeq and invalid permutations without writes or side effects',async()=>{
    const {run,store}=await savedRow(),before=run.state,writes=store.writes,slots=await store.read();
    const current=before.jokers.map(j=>j.instanceId),ids=reorderJokerIds(current,current[2],0);
    const stale=await run.dispatch({type:'ReorderJokers',ids},before.commandSeq-1);
    expect(stale.ok).toBe(false);if(!stale.ok)expect(stale.code).toBe('stale-sequence');
    for(const invalid of [[current[0],current[0],current[2]],['missing',current[1],current[2]],current.slice(1)]){
      const result=await run.dispatch({type:'ReorderJokers',ids:invalid},before.commandSeq);
      expect(result.ok).toBe(false);if(!result.ok)expect(result.code).toBe('invalid-order');
    }
    expect(run.state).toBe(before);expect(store.writes).toBe(writes);expect(await store.read()).toEqual(slots);
  });

  it('keeps the published order on a failed save and retries the exact candidate once',async()=>{
    const {run,store}=await savedRow(),before=run.state,slots=await store.read();
    const current=before.jokers.map(j=>j.instanceId),ids=reorderJokerIds(current,current[0],1);
    store.beforeCommit=async()=>{throw Error('controlled-save-failure');};
    const failed=await run.dispatch({type:'ReorderJokers',ids},before.commandSeq);
    expect(failed.ok).toBe(false);if(!failed.ok)expect(failed.code).toBe('save-failed');
    expect(run.state).toBe(before);expect(await store.read()).toEqual(slots);
    store.beforeCommit=undefined;expect((await run.retry()).ok).toBe(true);
    expect(run.state.commandSeq).toBe(before.commandSeq+1);
    expect(run.state.jokers).toEqual([before.jokers[1],before.jokers[0],before.jokers[2]]);
    expect(run.state.rng).toEqual(before.rng);expect(run.state.gold).toBe(before.gold);
    expect((await run.retry()).ok).toBe(false);
  });
});
