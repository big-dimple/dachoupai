import {describe,expect,it} from 'vitest';
import {RunController} from '../src/application/RunController';
import {makeCheckpoint,readCheckpoint,type Checkpoint} from '../src/application/checkpoint';
import {SavedRun,type SaveSlots,type SaveStore} from '../src/application/SavedRun';
import {createRun,stateHash,type Command,type R2RunState} from '../src/domain/run';
import {makeC02MaxChainFixture,C02_MAX_CHAIN_EXPECTED} from './fixtures/c02-max-chain';

class MemoryStore implements SaveStore {
  slots:SaveSlots={revision:0,current:null,previous:null};fail=false;attempts:Checkpoint[]=[];gate?:Promise<void>;
  async read(){return structuredClone(this.slots);}
  async commit(expected:number,current:Checkpoint,previous:Checkpoint|null){
    this.attempts.push(structuredClone(current));if(this.gate)await this.gate;
    if(this.fail)throw new DOMException('quota','QuotaExceededError');
    if(expected!==this.slots.revision)throw Error('write-conflict');
    this.slots={revision:expected+1,current:structuredClone(current),previous:structuredClone(previous)};return this.slots.revision;
  }
}
const peakCommand=(state:R2RunState,selectedIds:string[]):Command=>({runId:state.runId,commandId:`${state.runId}/command/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action:{type:'PlayHand',selectedIds}});
const read=(value:unknown):Checkpoint=>{const parsed=readCheckpoint(value);if(!parsed.ok)throw Error(parsed.code);return parsed.checkpoint;};

describe('C02 shared-command snapshot and dense-chain recovery',()=>{
  it('protects the saved rule cursor when a caller has frozen only the outer state',()=>{
    const checkpoint=makeCheckpoint(createRun({rulesVersion:'r2',seed:'c02-controller-boundary',runId:'c02-controller-boundary',characterId:'erxiang'}),[]);
    // A valid checkpoint may be shallow-frozen by its consumer before handing it over.
    const callerCursor=checkpoint.state.rng.rule;
    Object.freeze(checkpoint.state);
    const controller=new RunController(checkpoint.state),before=stateHash(controller.state);
    const modified=Reflect.set(callerCursor,'state',callerCursor.state^1);
    expect({modified,stateHash:stateHash(controller.state)}).toEqual({modified:false,stateHash:before});
  });

  it('commits all 91 dense sources once and rejects a reused command ID with different selected cards',()=>{
    const fixture=makeC02MaxChainFixture(),controller=new RunController(fixture.state),command=peakCommand(fixture.state,fixture.selectedIds);
    const scored=controller.submit(command);expect(scored.ok).toBe(true);
    const determined=controller.state,journal=[...fixture.journal,...controller.journal],trace=determined.lastTrace!;
    expect({score:trace.finalScore,events:trace.events.length,gold:determined.gold,rng:determined.rng.rule})
      .toEqual({score:C02_MAX_CHAIN_EXPECTED.score,events:91,gold:136,rng:C02_MAX_CHAIN_EXPECTED.rule});
    const checkpoint=read(JSON.parse(JSON.stringify(makeCheckpoint(determined,journal))));expect(checkpoint.state).toEqual(determined);
    const duplicate=controller.submit(command);expect(duplicate.ok&&duplicate.duplicate).toBe(true);
    expect(duplicate.ok?duplicate.events:undefined).toEqual([]);expect(controller.state).toBe(determined);expect(controller.journal).toHaveLength(1);
    const conflict=controller.submit({...command,action:{type:'PlayHand',selectedIds:[fixture.selectedIds[0]]}});
    expect(conflict).toMatchObject({ok:false,code:'command-id-conflict'});expect(controller.state).toBe(determined);expect(controller.journal).toHaveLength(1);
    expect(trace.sourceJokers).toEqual(fixture.state.jokers);expect(trace.cards.map(card=>card.id)).toEqual(fixture.state.handOrder);
  });

  it('rejects an expired dense-hand confirmation without publishing, awarding or advancing any of the four cursors',()=>{
    const fixture=makeC02MaxChainFixture(),controller=new RunController(fixture.state),stale={...peakCommand(fixture.state,fixture.selectedIds),commandId:`${fixture.state.runId}/expired-preview`};
    expect(controller.dispatch({type:'ReorderHand',ids:[...fixture.state.handOrder].reverse()}).ok).toBe(true);
    const before=controller.state,hash=stateHash(before),journal=controller.journal;
    expect(controller.submit(stale)).toMatchObject({ok:false,code:'stale-sequence'});
    expect(controller.state).toBe(before);expect(stateHash(controller.state)).toBe(hash);expect(controller.journal).toEqual(journal);
  });

  it('keeps the 20-gold lucky result and first-Boss prize as one unchanged unsaved candidate through quota failure and concurrent retry',async()=>{
    const fixture=makeC02MaxChainFixture(),store=new MemoryStore();
    const run=await SavedRun.import(store,makeCheckpoint(fixture.state,fixture.journal),await store.read());
    const before=run.state,published=await store.read(),command=peakCommand(before,fixture.selectedIds);store.fail=true;
    expect(await run.submit(command)).toMatchObject({ok:false,code:'save-failed'});expect(run.status).toBe('paused');expect(run.state).toBe(before);
    expect(await store.read()).toEqual(published);
    const candidateJSON=run.exportJSON(),candidate=read(JSON.parse(candidateJSON));
    expect(candidate.state.lastTrace).toMatchObject({finalScore:'1334525',goldDelta:20});expect(candidate.state.lastTrace!.events).toHaveLength(91);
    expect(candidate.state.gold).toBe(136);expect(candidate.state.rng.rule).toEqual(C02_MAX_CHAIN_EXPECTED.rule);
    expect(candidate.state.consumables.filter(tool=>tool.definitionId==='T16')).toHaveLength(1);
    expect(await run.submit(command)).toMatchObject({ok:false,code:'save-paused'});expect(store.attempts).toHaveLength(2);
    store.fail=false;let release!:()=>void;store.gate=new Promise(resolve=>{release=resolve;});
    const first=run.retry();expect(await run.retry()).toMatchObject({ok:false,code:'nothing-to-retry'});expect(run.state).toBe(before);release();
    expect((await first).ok).toBe(true);store.gate=undefined;
    expect(run.state).toEqual(candidate.state);expect(run.exportJSON()).toBe(candidateJSON);
    expect(JSON.stringify(store.attempts[1],null,2)).toBe(candidateJSON);expect(JSON.stringify(store.attempts[2],null,2)).toBe(candidateJSON);
    const writes=store.attempts.length;const duplicate=await run.submit(command);expect(duplicate.ok&&duplicate.duplicate).toBe(true);
    expect(duplicate.ok?duplicate.events:undefined).toEqual([]);expect(store.attempts).toHaveLength(writes);expect(run.exportJSON()).toBe(candidateJSON);
  });

  it('restores the dense result, ignores its duplicate and continues the same next chapter, shelf, deck and rule draw',async()=>{
    const fixture=makeC02MaxChainFixture(),store=new MemoryStore();
    const saved=await SavedRun.import(store,makeCheckpoint(fixture.state,fixture.journal),await store.read()),command=peakCommand(saved.state,fixture.selectedIds);
    expect((await saved.submit(command)).ok).toBe(true);
    const determined=saved.state,slots=await store.read(),recovered=SavedRun.restore(store,slots),live=new RunController(determined);
    expect(recovered.state).toEqual(determined);const writes=store.attempts.length;
    const duplicate=await recovered.submit(command);expect(duplicate.ok&&duplicate.duplicate).toBe(true);expect(duplicate.ok?duplicate.events:undefined).toEqual([]);expect(store.attempts).toHaveLength(writes);
    const recoveredController=new RunController(recovered.state),ruleBefore=determined.rng.rule;
    for(const type of ['OpenShop','RerollShop','LeaveShop','EnterStage'] as const){
      expect(live.dispatch({type}).ok).toBe(true);expect(recoveredController.dispatch({type}).ok).toBe(true);
      expect(recoveredController.state).toEqual(live.state);
    }
    // The next chapter actually consumes the saved rule cursor to choose its public Boss.
    expect(live.state.rng.rule).not.toEqual(ruleBefore);
    for(const domain of ['deck','shop','reward'] as const)expect(live.state.rng[domain]).not.toEqual(determined.rng[domain]);
    const selectedIds=[live.state.handOrder.find(id=>!live.state.stage!.disabledIds.includes(id))!];
    expect(live.dispatch({type:'PlayHand',selectedIds}).ok).toBe(true);expect(recoveredController.dispatch({type:'PlayHand',selectedIds}).ok).toBe(true);
    expect(recoveredController.state).toEqual(live.state);expect(stateHash(recoveredController.state)).toBe(stateHash(live.state));
    const continuation=makeCheckpoint(recoveredController.state,[...recovered.journal,...recoveredController.journal]);
    expect(read(JSON.parse(JSON.stringify(continuation))).state).toEqual(live.state);
    expect(slots.current).toEqual(makeCheckpoint(determined,saved.journal));
  });
});
