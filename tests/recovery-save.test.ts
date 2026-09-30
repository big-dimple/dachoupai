import {describe,expect,it} from 'vitest';
import {createRun,applyCommand,stateHash,type Command} from '../src/domain/run';
import {makeCheckpoint,readCheckpoint,restoreSlots,MAX_JOURNAL} from '../src/application/checkpoint';
import {SavedRun,type SaveStore,type SaveSlots} from '../src/application/SavedRun';

// First searched natural 24-card fixture with the same pair-of-aces 514 golden; no state injection.
const initial=()=>createRun({seed:'r03-651',characterId:'erxiang',runId:'recovery-fixture',rulesVersion:'r2'});
const next=(state:ReturnType<typeof initial>,action:Command['action']):Command=>({runId:state.runId,commandId:`cmd-${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
class MemoryStore implements SaveStore {
  slots:SaveSlots={revision:0,current:null,previous:null};fail=false;writes=0;
  async read(){return structuredClone(this.slots);}
  async commit(expected:number,current:ReturnType<typeof makeCheckpoint>,previous:ReturnType<typeof makeCheckpoint>|null){
    this.writes++;if(this.fail)throw new DOMException('quota','QuotaExceededError');
    if(expected!==this.slots.revision)throw new Error('write-conflict');
    this.slots={revision:expected+1,current:structuredClone(current),previous:structuredClone(previous)};return this.slots.revision;
  }
}
describe('complete checkpoint validation and save-before-publish',()=>{
  it('round trips full state and bounds the journal without truncating the checkpoint',()=>{
    const state=initial(),checkpoint=makeCheckpoint(state,[]);
    const read=readCheckpoint(JSON.parse(JSON.stringify(checkpoint)));expect(read.ok).toBe(true);
    if(!read.ok)throw Error(read.code);expect(read.checkpoint.state).toEqual(state);
    expect(stateHash(read.checkpoint.state)).toBe(stateHash(state));expect(MAX_JOURNAL).toBeGreaterThan(0);
  });
  it('keeps only the newest bounded journal while preserving every card, RNG and receipt',()=>{
    let state=createRun({seed:'bounded',characterId:'touye',runId:'bounded',rulesVersion:'r2'});const journal:Command[]=[];
    for(const action of [{type:'LeaveShop'},{type:'EnterStage'},...Array.from({length:MAX_JOURNAL+5},(_,i)=>({type:'SetWager',enabled:i%2===0}))] as Command['action'][]){
      const command=next(state,action),result=applyCommand(state,command);if(!result.ok)throw Error(result.code);state=result.state;journal.push(command);
    }
    const checkpoint=makeCheckpoint(state,journal);expect(checkpoint.journal).toHaveLength(MAX_JOURNAL);expect(checkpoint.journalBaseSeq).toBe(state.commandSeq-MAX_JOURNAL);
    expect(checkpoint.state).toEqual(state);expect(readCheckpoint(JSON.parse(JSON.stringify(checkpoint))).ok).toBe(true);
  });
  it('rejects corrupt checksum, old versions and illegal imported values without deleting raw data',()=>{
    const checkpoint=makeCheckpoint(initial(),[]),corrupt=structuredClone(checkpoint);corrupt.state.gold=999;
    expect(readCheckpoint(corrupt).ok).toBe(false);
    for(const mutate of [(s:any)=>s.schemaVersion=1,(s:any)=>s.contentHash='old',(s:any)=>s.rng.rule.state=-1,(s:any)=>s.handOrder=['missing'],(s:any)=>s.gold=-1,(s:any)=>s.phase='presenting',(s:any)=>s.assetUrl='https://evil.invalid/a.js']){
      const state=initial();mutate(state);expect(()=>makeCheckpoint(state,[])).toThrow();
    }
    expect(readCheckpoint(JSON.parse('{"__proto__":{"polluted":true}}')).ok).toBe(false);
    expect(readCheckpoint({format:'dachoupai-checkpoint',state:null}).ok).toBe(false);
  });
  it('restores only the last valid backup and preserves incompatible raw saves for export',()=>{
    const backup=makeCheckpoint(initial(),[]),corrupt={...backup,checksum:'bad'};
    const restored=restoreSlots({revision:5,current:corrupt,previous:backup});
    expect(restored.status).toBe('backup');expect(restored.checkpoint?.state).toEqual(initial());
    const raw={...backup,state:{...backup.state,contentHash:'old'}};
    const blocked=restoreSlots({revision:6,current:raw,previous:null});expect(blocked.status).toBe('invalid');expect(blocked.raw).toEqual(raw);
  });
  it('keeps an unsaved result, blocks further commands and retries the exact receipt without double charge',async()=>{
    const store=new MemoryStore(),run=await SavedRun.start(store,initial(),{revision:0,current:null,previous:null});
    const before=run.state,offer=before.shop!.offers.find(o=>o.price===4)!;store.fail=true;
    const command=next(before,{type:'BuyOffer',offerId:offer.offerId});
    const failed=await run.submit(command);expect(failed.ok).toBe(false);expect(run.status).toBe('paused');expect(run.state).toBe(before);
    const blocked=await run.dispatch({type:'RerollShop'});expect(blocked.ok).toBe(false);expect(store.writes).toBe(2);
    const exported=readCheckpoint(JSON.parse(run.exportJSON()));expect(exported.ok).toBe(true);if(exported.ok)expect(exported.checkpoint.state.gold).toBe(2);
    store.fail=false;const retried=await run.retry();expect(retried.ok).toBe(true);expect(run.state.gold).toBe(2);expect(run.state.commandSeq).toBe(before.commandSeq+1);
    const again=await run.submit(command);expect(again.ok).toBe(true);if(again.ok)expect(again.duplicate).toBe(true);expect(run.state.gold).toBe(2);expect(store.writes).toBe(3);
  });
  it('compares revisions so a stale tab cannot overwrite a later save',async()=>{
    const store=new MemoryStore(),first=await SavedRun.start(store,initial(),{revision:0,current:null,previous:null});
    const second=SavedRun.restore(store,await store.read());await first.dispatch({type:'RerollShop'});
    const stale=await second.dispatch({type:'LeaveShop'});expect(stale.ok).toBe(false);expect(second.status).toBe('readonly');
    expect((await store.read()).current).toEqual(makeCheckpoint(first.state,first.journal));
  });
  it('rejects double clicks while the first storage transaction is pending',async()=>{
    const store=new MemoryStore(),run=await SavedRun.start(store,initial(),{revision:0,current:null,previous:null});
    let release!:()=>void;const commit=store.commit.bind(store);store.commit=async(...args)=>{await new Promise<void>(r=>release=r);return commit(...args);};
    const first=run.dispatch({type:'RerollShop'}),second=await run.dispatch({type:'RerollShop'});
    expect(second.ok).toBe(false);expect(run.state.gold).toBe(6);release();await first;expect(run.state.gold).toBe(4);expect(run.state.shop!.rerollCount).toBe(1);
  });
  it('recovers play/reward/checkpoint and continues the exact saved RNG and commands',async()=>{
    const store=new MemoryStore();let run=await SavedRun.start(store,initial(),{revision:0,current:null,previous:null});
    for(const action of [{type:'BuyOffer',offerId:run.state.shop!.offers.find(o=>o.definitionId==='mantangcai')!.offerId},{type:'LeaveShop'},{type:'EnterStage'}] as const){expect((await run.dispatch(action)).ok).toBe(true);}
    const before=run.state,command=next(before,{type:'PlayHand',selectedIds:['clubs-14','hearts-14']});
    const expected=applyCommand(before,command);expect(expected.ok).toBe(true);
    expect((await run.submit(command)).ok).toBe(true);expect(run.state.phase).toBe('stage-cleared');const saved=run.state;
    run=SavedRun.restore(store,await store.read());expect(run.state).toEqual(saved);
    expect((await run.submit(command)).ok).toBe(true);expect(run.state).toEqual(saved);expect(run.state.rng).toEqual(saved.rng);
  });
});
