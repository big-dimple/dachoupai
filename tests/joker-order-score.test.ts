import {expect,it} from 'vitest';
import {createRun,assertRunInvariants,applyCommand} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {SavedRun,type SaveStore,type SaveSlots} from '../src/application/SavedRun';
import {makeCheckpoint,type Checkpoint} from '../src/application/checkpoint';

class MemoryStore implements SaveStore {
  slots:SaveSlots={revision:0,current:null,previous:null};
  async read(){return structuredClone(this.slots);}
  async commit(expected:number,current:Checkpoint,previous:Checkpoint|null){
    if(expected!==this.slots.revision)throw Error('write-conflict');
    this.slots={revision:expected+1,current:structuredClone(current),previous:structuredClone(previous)};
    return this.slots.revision;
  }
}

it('five saved current-identity slots change the same real hand trace and score in their committed order',async()=>{
  // Controlled owned inventory; this does not claim natural acquisition.
  let initial=createRun({seed:'five-order-score',runId:'five-order-score',characterId:'erxiang',rulesVersion:'r2',r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group'});
  initial.jokers=['pengci','f06','b03','b10','e01'].map((id,i)=>r2CreateJoker(id,'owned/'+i,4));
  // The current identity makes pengci conditional on three-kind. Its legal
  // holographic edition guarantees +2 on this high-card hand, before/after ×2.
  initial.jokers[0].edition='holographic';
  assertRunInvariants(initial);
  for(const type of ['LeaveShop','EnterStage'] as const){
    const result=applyCommand(initial,{runId:initial.runId,commandId:initial.runId+'/command/'+(initial.commandSeq+1),expectedSeq:initial.commandSeq,action:{type}});
    expect(result.ok).toBe(true);if(!result.ok)throw Error(result.code);initial=result.state;
  }
  const setupStore=new MemoryStore();await SavedRun.start(setupStore,initial,setupStore.slots);
  const slots=await setupStore.read(),normalStore=new MemoryStore(),movedStore=new MemoryStore();
  normalStore.slots=structuredClone(slots);movedStore.slots=structuredClone(slots);
  const normal=SavedRun.restore(normalStore,normalStore.slots),moved=SavedRun.restore(movedStore,movedStore.slots);
  const before=moved.state,ids=before.jokers.map(j=>j.instanceId);
  [ids[0],ids[1]]=[ids[1],ids[0]];
  expect((await moved.dispatch({type:'ReorderJokers',ids},before.commandSeq)).ok).toBe(true);
  expect(moved.state.jokers.map(j=>j.instanceId)).toEqual(ids);
  expect(moved.state.rng).toEqual(before.rng);expect(moved.state.gold).toBe(before.gold);
  expect(movedStore.slots.current).toEqual(makeCheckpoint(moved.state,moved.journal));
  const restored=SavedRun.restore(movedStore,await movedStore.read());
  expect(restored.state).toEqual(moved.state);
  const selectedIds=[before.handOrder[0]];
  for(const run of [normal,restored])expect((await run.dispatch({type:'PlayHand',selectedIds})).ok).toBe(true);
  const a=normal.state.lastTrace!,b=restored.state.lastTrace!;
  expect(a.sourceJokers.map(j=>j.instanceId)).toEqual(before.jokers.map(j=>j.instanceId));
  expect(b.sourceJokers.map(j=>j.instanceId)).toEqual(ids);
  const order=(trace:typeof a)=>trace.events.filter(e=>e.phase==='jokerScore'&&['pengci','f06'].includes(e.sourceDefinitionId??'')).map(e=>e.sourceDefinitionId);
  expect(order(a)).toEqual(['pengci','f06']);expect(order(b)).toEqual(['f06','pengci']);
  expect(BigInt(a.finalScore)).toBeGreaterThan(BigInt(b.finalScore));
  expect(restored.state.rng).toEqual(normal.state.rng);
  expect(movedStore.slots.current).toEqual(makeCheckpoint(restored.state,restored.journal));
  expect(SavedRun.restore(movedStore,await movedStore.read()).state.lastTrace).toEqual(b);
});
