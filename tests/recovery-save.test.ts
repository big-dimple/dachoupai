import {R2_RULESETS} from '../src/domain/r2Run';
import {CHARACTER_IDS} from '../src/domain/characters';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {createRun,applyCommand,stateHash,type Command} from '../src/domain/run';
import {makeCheckpoint,readCheckpoint,restoreSlots,MAX_JOURNAL} from '../src/application/checkpoint';
import {SavedRun,type SaveStore,type SaveSlots} from '../src/application/SavedRun';
import {GameSession} from '../src/game/session';
import {enrollFirstChapterGuide,firstChapterGuide} from '../src/game/FirstChapterGuide';

let sessionStore:MemoryStore;
vi.mock('../src/platform/IndexedDbSave',()=>({IndexedDbSave:class {constructor(){return sessionStore;}}}));
vi.mock('../src/platform/WriteLease',()=>({WriteLease:class {writable=true;onChange=()=>{};async claim(){return true;}}}));
afterEach(()=>vi.unstubAllGlobals());

// Natural 72-card shop fixture; the original pair-of-aces 514 golden is unchanged.
const initial=()=>createRun({seed:'r03-1',characterId:'erxiang',runId:'recovery-fixture',rulesVersion:'r2'});
const next=(state:ReturnType<typeof initial>,action:Command['action']):Command=>({runId:state.runId,commandId:`cmd-${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
class MemoryStore implements SaveStore {
  slots:SaveSlots={revision:0,current:null,previous:null};fail=false;writes=0;
  async read(){return structuredClone(this.slots);}
  async readPartition(){return this.read();}
  async commit(expected:number,current:ReturnType<typeof makeCheckpoint>,previous:ReturnType<typeof makeCheckpoint>|null){
    this.writes++;if(this.fail)throw new DOMException('quota','QuotaExceededError');
    if(expected!==this.slots.revision)throw new Error('write-conflict');
    this.slots={revision:expected+1,current:structuredClone(current),previous:structuredClone(previous)};return this.slots.revision;
  }
}

async function existingSession(){
  sessionStore=new MemoryStore();
  vi.stubGlobal('document',{hidden:false,addEventListener:()=>{}});
  const session=new GameSession();
  await session.initialize();
  const run=await session.start('existing-session','erxiang');if(!run)throw Error('session setup failed');
  return {session,run,store:sessionStore};
}

function guideStorage(){const data=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)});}
describe('optional first-guide save boundaries',()=>{
  it('restoring the registered run keeps the hint, successful same-identity import clears it',async()=>{
    guideStorage();const {session,run}=await existingSession();enrollFirstChapterGuide(run.state);expect(firstChapterGuide(run.state)).toBeDefined();
    const restored=new GameSession();await restored.initialize();expect(firstChapterGuide(restored.state()!)).toBeDefined();
    const before=structuredClone(run.state);expect(await session.importJSON(run.exportJSON())).toBe(true);expect(session.state()).toEqual(before);expect(firstChapterGuide(session.state()!)).toBeUndefined();
  });
  it('failed replacement preserves the old hint, exact saved pending replacement clears it',async()=>{
    guideStorage();const {session,run,store}=await existingSession();enrollFirstChapterGuide(run.state);store.fail=true;
    expect(await session.start('replacement','erxiang')).toBeUndefined();expect(firstChapterGuide(run.state)).toBeDefined();store.fail=false;
    expect(await session.retry()).toBe(true);expect(firstChapterGuide(session.state()!)).toBeUndefined();
  });
  it('same-identity successful retry does not inherit the previous run tutorial marker',async()=>{
    guideStorage();const {session,run}=await existingSession();enrollFirstChapterGuide(run.state);
    const retry=await session.start(run.state.seed,run.state.characterId,undefined,{kind:'retry',run:run.state});expect(retry).toBeDefined();expect(firstChapterGuide(retry!.state)).toBeUndefined();
  });
});

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
  it('keeps a pending result readonly if the writer lease is lost before a failed write settles',async()=>{
    const store=new MemoryStore(),run=await SavedRun.start(store,initial(),{revision:0,current:null,previous:null}),before=run.state;
    let release!:()=>void;const commit=store.commit.bind(store);store.fail=true;
    store.commit=async(...args)=>{await new Promise<void>(resolve=>release=resolve);return commit(...args);};
    const submitted=run.dispatch({type:'RerollShop'}),candidate=run.exportJSON();run.setReadOnly();release();
    expect((await submitted).ok).toBe(false);expect(run.status).toBe('readonly');expect(run.state).toBe(before);
    expect(run.exportJSON()).toBe(candidate);const writes=store.writes;expect((await run.retry()).ok).toBe(false);expect(store.writes).toBe(writes);
  });
  it('rejects a consumable confirmed against an expired preview sequence while default dispatch uses the current sequence',async()=>{
    const store=new MemoryStore(),state=initial();state.consumables=[{instanceId:'preview-dye',definitionId:'T03'}];
    const run=await SavedRun.start(store,state,{revision:0,current:null,previous:null}),previewSeq=run.state.commandSeq;
    expect((await run.dispatch({type:'RerollShop'})).ok).toBe(true);
    const before=run.state,slots=await store.read(),writes=store.writes;
    const action={type:'UseConsumable' as const,instanceId:'preview-dye',targetIds:['clubs-2']};
    const stale=await run.dispatch(action,previewSeq);
    expect(stale.ok).toBe(false);if(!stale.ok)expect(stale.code).toBe('stale-sequence');
    expect(run.state).toBe(before);expect(await store.read()).toEqual(slots);expect(store.writes).toBe(writes);
    const fresh=await run.dispatch(action);expect(fresh.ok).toBe(true);
    expect(run.state.consumables).toEqual([]);expect(run.state.deckInstances.find(c=>c.id==='clubs-2')?.suit).toBe('hearts');
    expect(run.state.rng).toEqual(before.rng);
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
  it.each(['start','import'] as const)('keeps the published run after a failed %s, then retries the exact unpublished candidate once',async(kind)=>{
    const {session,run,store}=await existingSession(),before=run.state,oldJSON=run.exportJSON(),slots=await store.read();
    let imported=createRun({seed:'replacement-import',characterId:'touye',runId:'replacement-import',rulesVersion:'r2'});
    for(const action of [{type:'LeaveShop'},{type:'EnterStage'},{type:'SetWager',enabled:true}] as Command['action'][]){
      const result=applyCommand(imported,next(imported,action));if(!result.ok)throw Error(result.code);imported=result.state;
    }
    const scored=applyCommand(imported,next(imported,{type:'PlayHand',selectedIds:[imported.handOrder[0]]}));if(!scored.ok)throw Error(scored.code);imported=scored.state;
    const importedJSON=JSON.stringify(makeCheckpoint(imported,[]),null,2);store.fail=true;
    const result=kind==='start'?await session.start('replacement-start','amo'):await session.importJSON(importedJSON);
    expect(session.run===run).toBe(true);expect(run.state).toBe(before);expect(run.exportJSON()).toBe(oldJSON);
    expect(result).toBe(kind==='start'?undefined:false);expect(await store.read()).toEqual(slots);
    const candidate=session.pendingRun;expect(candidate).toBeDefined();if(!candidate)throw Error('missing retryable candidate');
    if(kind==='start')expect(candidate.state.contentHash).toBe('json-fnv-v1:5025cc23c013987f');
    const candidateJSON=candidate.exportJSON();expect(readCheckpoint(JSON.parse(candidateJSON)).ok).toBe(true);
    if(kind==='import')expect(candidateJSON).toBe(importedJSON);
    expect(await session.retry()).toBe(false);expect(session.run===run).toBe(true);
    expect(candidate.exportJSON()).toBe(candidateJSON);expect(await store.read()).toEqual(slots);
    store.fail=false;
    let release!:()=>void;const commit=store.commit.bind(store);
    store.commit=async(...args)=>{await new Promise<void>(resolve=>release=resolve);return commit(...args);};
    const first=session.retry(),second=await session.retry();expect(second).toBe(false);expect(session.cancelPending()).toBe(false);release();
    expect(await first).toBe(true);expect(session.run?.exportJSON()).toBe(candidateJSON);expect(session.pendingRun).toBeUndefined();
    expect(JSON.stringify(store.slots.current,null,2)).toBe(candidateJSON);expect(JSON.stringify(store.slots.previous,null,2)).toBe(oldJSON);
    const writes=store.writes;expect(await session.retry()).toBe(false);expect(store.writes).toBe(writes);
  });
  it('preserves a failed candidate through initialization and lease loss, then explicitly cancels without a storage write',async()=>{
    const {session,run,store}=await existingSession(),oldJSON=run.exportJSON();store.fail=true;
    expect(await session.start('pending-candidate','amo')).toBeUndefined();
    const candidate=session.pendingRun;expect(candidate).toBeDefined();if(!candidate)throw Error('missing retryable candidate');
    const exported=candidate.exportJSON(),slots=await store.read(),writes=store.writes;
    expect(await session.start('replacement-that-must-not-overwrite','erxiang')).toBeUndefined();
    expect(await session.importJSON(oldJSON)).toBe(false);expect(session.pendingRun===candidate).toBe(true);
    await session.initialize();expect(await session.takeOver()).toBe(false);
    expect(session.pendingRun===candidate).toBe(true);expect(session.run===run).toBe(true);
    session.lease.writable=false;session.lease.onChange();expect(candidate.status).toBe('readonly');
    expect(await session.retry()).toBe(false);expect(candidate.exportJSON()).toBe(exported);
    expect(session.cancelPending()).toBe(true);expect(session.pendingRun).toBeUndefined();expect(session.run===run).toBe(true);
    expect(run.exportJSON()).toBe(oldJSON);expect(await store.read()).toEqual(slots);expect(store.writes).toBe(writes);
    expect(session.cancelPending()).toBe(false);
  });
});


describe('normal session launch intent',()=>{
  it('launches all six characters with only Amo on assist',async()=>{
    const {session}=await existingSession();
    for(const id of CHARACTER_IDS){const run=await session.start('all-six',id);expect(run?.state.contentHash).toBe('json-fnv-v1:5025cc23c013987f');}
  });
  it.each(R2_RULESETS)('retries $contentVersion with exact seed, mode, role and fresh journal',async(profile)=>{
    const {session}=await existingSession();
    const modeConfig={mode:'standard' as const,difficulty:2 as const,challengeId:null,programsEnabled:false};
    let state=createRun({seed:'retry-original',runId:'old-retry',characterId:'amo',rulesVersion:'r2',modeConfig,r2Identity:{contentVersion:profile.contentVersion,contentHash:profile.contentHash}});
    for(const type of ['LeaveShop','EnterStage'] as const){const r=applyCommand(state,next(state,{type}));if(!r.ok)throw Error(r.code);state=r.state;}
    if(profile.amoScoreTiming==='assist-v1'){
      const main=['spades-9','hearts-9','clubs-13','diamonds-13'],side=['spades-12','hearts-12'];
      state.handOrder=[...main,...side,'clubs-6','diamonds-7'];state.drawPile=state.deckInstances.map(c=>c.id).filter(id=>!state.handOrder.includes(id));
      const r=applyCommand(state,next(state,{type:'PlayAssistedHand',selectedIds:main,assistIds:side}));if(!r.ok)throw Error(r.code);state=r.state;expect(state.stage?.assistUsed).toBe(true);
    }
    expect(await session.importJSON(JSON.stringify(makeCheckpoint(state,[])))).toBe(true);
    const source=session.run!.state,old=JSON.stringify(source);
    const retry=await session.start(source.seed,source.characterId,modeConfig,{kind:'retry',run:source});expect(retry).toBeDefined();
    expect(retry!.state.contentVersion).toBe(source.contentVersion);expect(retry!.state.contentHash).toBe(source.contentHash);
    expect(retry!.state.seed).toBe(source.seed);expect(retry!.state.characterId).toBe(source.characterId);
    for(const key of ['mode','difficulty','challengeId','programsEnabled'] as const)expect(retry!.state[key]).toBe(source[key]);
    expect(retry!.state.commandSeq).toBe(1);expect(retry!.journal).toEqual([]);expect(retry!.state.lastTrace).toBeNull();expect(retry!.state.receipts).toHaveLength(1);
    await retry!.dispatch({type:'LeaveShop'});await retry!.dispatch({type:'EnterStage'});
    expect(retry!.state.stage?.assistUsed).toBe(profile.amoScoreTiming==='assist-v1'?false:undefined);expect(JSON.stringify(source)).toBe(old);
  });
  it('rejects stale retry, read-only and double confirmation without replacing the old run',async()=>{
    const {session,run,store}=await existingSession(),slots=await store.read();
    expect(await session.start(run.state.seed,run.state.characterId,undefined,{kind:'retry',run:structuredClone(run.state)})).toBeUndefined();expect(await store.read()).toEqual(slots);
    session.lease.writable=false;expect(await session.start('readonly','amo')).toBeUndefined();expect(await store.read()).toEqual(slots);session.lease.writable=true;
    let release!:()=>void;const read=store.readPartition.bind(store);store.readPartition=async()=>{await new Promise<void>(r=>release=r);return read();};
    const first=session.start('double','amo');await Promise.resolve();await Promise.resolve();
    expect(await session.start('second','erxiang')).toBeUndefined();expect(session.run).toBe(run);release();
    const result=await first;expect(result?.state.seed).toBe('double');expect(store.writes).toBe(2);
  });
});
