import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import v9 from './fixtures/c04-v9-checkpoint.json';
import legacyAmo from './fixtures/r2-v10-amo-checkpoints.json';
import {R2_LEGACY_CONTENT_HASH} from '../src/domain/r2Run';
import {SavedRun} from '../src/application/SavedRun';
import {r2ModeStorageKey} from '../src/content/r2Modes';
import {createRun,applyCommand,stateHash,type R2RunState,type Action} from '../src/domain/run';
import {R2_CONTENT_HASH,r2CreateJoker} from '../src/domain/r2Run';
import {makeCheckpoint,readCheckpoint,restoreSlots,type Checkpoint} from '../src/application/checkpoint';
import {stableHash} from '../src/domain/hash';
import {IndexedDbSave} from '../src/platform/IndexedDbSave';
import {GameSession} from '../src/game/session';
import type {R2ModeSelection} from '../src/content/r2Modes';
import * as RunProgress from '../src/platform/RunProgress';

vi.mock('../src/platform/WriteLease',()=>({WriteLease:class {writable=true;onChange=()=>{};async claim(){return true;}}}));

const STANDARD:R2ModeSelection={mode:'standard',difficulty:0,challengeId:null,programsEnabled:true};
const HARD:R2ModeSelection={mode:'standard',difficulty:3,challengeId:null,programsEnabled:true};
const OFF:R2ModeSelection={mode:'standard',difficulty:0,challengeId:null,programsEnabled:false};
const TUTORIAL:R2ModeSelection={mode:'tutorial',difficulty:0,challengeId:null,programsEnabled:false};
const challenge=(id:R2ModeSelection['challengeId']):R2ModeSelection=>({mode:'challenge',difficulty:0,challengeId:id,programsEnabled:true});
const seedFor=(selection:R2ModeSelection)=>selection.mode==='tutorial'?'r2/tutorial/core-v1':selection.mode==='challenge'?`challenge/${selection.challengeId!.toLowerCase()}/0`:'mode-save-free';
function start(selection=STANDARD):R2RunState {
  return createRun({seed:seedFor(selection),characterId:selection.mode==='tutorial'?'erxiang':'amo',
    runId:`save/${selection.mode}/${selection.challengeId??selection.difficulty}/${selection.programsEnabled}`,rulesVersion:'r2',modeConfig:selection});
}
function send(state:R2RunState,action:Action):R2RunState {
  const result=applyCommand(state,{runId:state.runId,commandId:`save-command/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
  if(!result.ok)throw Error(result.code);return result.state;
}
const enter=(state:R2RunState)=>send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
function roundTrip(state:R2RunState):Checkpoint {
  const checkpoint=makeCheckpoint(state,[]),read=readCheckpoint(JSON.parse(JSON.stringify(checkpoint)));
  expect(read.ok).toBe(true);if(!read.ok)throw Error(read.code);
  expect(read.checkpoint.state).toEqual(state);return read.checkpoint;
}
function corrupt(checkpoint:Checkpoint,change:(draft:any)=>void):unknown {
  // Unknown imported JSON is deliberately mutable adversarial data, never used to bypass live-state types.
  const draft=JSON.parse(JSON.stringify(checkpoint));change(draft.state);
  const {checksum:unused,...payload}=draft;draft.checksum=stableHash(payload);return draft;
}
const rejected=(checkpoint:Checkpoint,change:(draft:any)=>void)=>expect(readCheckpoint(corrupt(checkpoint,change)).ok).toBe(false);

// A small IndexedDB API double executes the production adapter, with atomic transaction publication and requests.
// It contains no mode-key, validation or session logic, and does not stand in for browser/device evidence.
class Request<T> {result!:T;onsuccess?:()=>void;onerror?:()=>void;onupgradeneeded?:()=>void;onblocked?:()=>void;error:Error|null=null;}
class MemoryDatabase {
  records=new Map<IDBValidKey,unknown>();failWrites=false;onversionchange?:()=>void;
  objectStoreNames={contains:(_name:string)=>true};
  createObjectStore(_name:string):void {}close():void {}
  transaction(_name:string,mode:'readonly'|'readwrite') {
    const local=new Map(this.records),database=this;
    let pending=0,aborted=false,completed=false;
    const tx={error:null as Error|null,oncomplete:undefined as (()=>void)|undefined,onabort:undefined as (()=>void)|undefined,
      onerror:undefined as (()=>void)|undefined,abort:()=>{if(aborted||completed)return;aborted=true;queueMicrotask(()=>tx.onabort?.());},
      objectStore:(_store:string)=>store};
    function request<T>(produce:()=>T):Request<T> {
      const result=new Request<T>();pending++;
      queueMicrotask(()=>{
        if(aborted)return;
        try {result.result=produce();result.onsuccess?.();}
        catch(error){tx.error=error instanceof Error?error:Error('memory-request');tx.abort();}
        pending--;
        queueMicrotask(()=>{
          if(pending||aborted||completed)return;
          if(mode==='readwrite'&&database.failWrites){tx.error=new DOMException('quota','QuotaExceededError');tx.abort();return;}
          completed=true;if(mode==='readwrite')database.records=local;tx.oncomplete?.();
        });
      });return result;
    }
    const store={get:(key:IDBValidKey)=>request(()=>structuredClone(local.get(key))),
      put:(value:unknown,key:IDBValidKey)=>request(()=>{local.set(key,structuredClone(value));return key;}),
      openCursor:()=>{
        const entries=[...local.entries()];let index=0;
        const result=new Request<{key:IDBValidKey;value:unknown;continue:()=>void}|null>();
        const next=()=>{const scheduled=request(()=>index<entries.length?{key:entries[index][0],value:structuredClone(entries[index++][1]),continue:next}:null);
          scheduled.onsuccess=()=>{result.result=scheduled.result;result.onsuccess?.();};};next();return result;
      }};
    return tx;
  }
}
let database:MemoryDatabase;
let preferenceValues:Map<string,string>;
beforeEach(()=>{
  database=new MemoryDatabase();preferenceValues=new Map();
  vi.stubGlobal('indexedDB',{open:()=>{const request=new Request<MemoryDatabase>();queueMicrotask(()=>{request.result=database;request.onsuccess?.();});return request;}});
  vi.stubGlobal('document',{hidden:false,addEventListener:()=>{}});
  vi.stubGlobal('localStorage',{getItem:(key:string)=>preferenceValues.get(key)??null,setItem:vi.fn((key:string,value:string)=>{preferenceValues.set(key,value);})});
  vi.stubGlobal('window',{dispatchEvent:()=>true});
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const keyFor=(selection:R2ModeSelection)=>`r2:${R2_CONTENT_HASH}:${selection.mode}:${selection.challengeId??'none'}:d${selection.difficulty}:program-${selection.programsEnabled?'on':'off'}`;
function programFixture(id:'PG01'|'PG02'|'PG03'|'PG04',capped=false):R2RunState {
  for(let index=0;index<128;index++){
    let state=createRun({seed:`program-save/${id}/${index}`,characterId:'erxiang',runId:`program-save/${id}`,rulesVersion:'r2',modeConfig:STANDARD});
    if(!state.program!.offerIds.includes(id))continue;
    state=send(state,{type:'ChooseProgram',programId:id});state.gold=100;
    // Controlled legal construction; actual commands produce every clear/reward, with no natural-acquisition claim.
    state.handLevels=id==='PG04'?{'high-card':1,'straight-flush':30}:
      {'high-card':id==='PG03'&&!capped?29:30,pair:30,'three-kind':30};
    return state;
  }
  throw Error(`fixture seed not found: ${id}`);
}
function fixedHand(state:R2RunState,selected:readonly string[]):R2RunState {
  const available=[...state.handOrder,...state.drawPile];
  if(selected.some(id=>!available.includes(id)))throw Error('unavailable fixture card');
  const hand=[...selected,...available.filter(id=>!selected.includes(id))].slice(0,state.stage!.handLimit);
  state.handOrder=hand;state.drawPile=available.filter(id=>!hand.includes(id));return state;
}
function clearProgramChapter(id:'PG01'|'PG02'|'PG03'|'PG04',capped=false):R2RunState {
  let state=programFixture(id,capped);
  const royal=['hearts-10','hearts-11','hearts-12','hearts-13','hearts-14'];
  for(let index=0;index<3;index++){
    state=enter(state);
    if(id==='PG04'&&index===0){
      state=fixedHand(state,['spades-2','hearts-2','clubs-2',...royal]);
      for(const card of ['spades-2','hearts-2','clubs-2'])state=send(state,{type:'PlayHand',selectedIds:[card]});
      expect(state.phase).toBe('await-input');expect(state.stage?.handsLeft).toBe(1);
      state=send(state,{type:'PlayHand',selectedIds:royal});
    }else{
      const selected=id==='PG04'?royal:id==='PG02'?['spades-13','hearts-13']:id==='PG01'&&index===1?
        ['spades-13','hearts-13']:id==='PG01'&&index===2?['spades-13','hearts-13','clubs-13']:['spades-13'];
      state=send(fixedHand(state,selected),{type:'PlayHand',selectedIds:selected});
    }
    expect(state.phase).toBe('stage-cleared');if(index<2)state=send(state,{type:'OpenShop'});
  }
  return state;
}
async function sessionWithStandard() {
  const session=new GameSession();await session.initialize();const run=await session.start(seedFor(STANDARD),'amo',STANDARD);
  if(!run)throw Error('failed session setup');return {session,run};
}
function finalStageReady(selection=OFF):R2RunState {
  let state=createRun({seed:seedFor(selection),characterId:'erxiang',runId:`save/final/${selection.mode}/${selection.difficulty}`,rulesVersion:'r2',modeConfig:selection});
  state=send(state,{type:'LeaveShop'});
  // Controlled late-chapter deck/level boundary; the final entry and win are real shared commands.
  // This is save/qualification evidence, not a naturally acquired eight-chapter or balance result.
  Object.assign(state,{chapter:8,stageIndex:23,shop:null,totalHeat:'1000',boss:{definitionId:'B12',disabledSuit:null},
    seenBossIds:['B01','B02','B05','B06','B07','B08','B13','B12'],handLevels:{'high-card':1,'flush-five':30}});
  state.deckInstances=Array.from({length:20},(_,index)=>({id:`save/final/card/${index}`,rank:14,suit:'hearts',enhancement:'encore-paper',edition:'polychrome'}));
  state.drawPile=state.deckInstances.map(card=>card.id);
  return send(state,{type:'EnterStage'});
}
const finalStageWon=(selection=OFF)=>{const state=finalStageReady(selection);return send(state,{type:'PlayHand',selectedIds:state.handOrder.slice(0,5)});};

describe('C04.2 strict v10 checkpoints and preserved genuine v9',()=>{
  it('rejects the genuine untouched v9 while retaining its exact raw bytes and checksum for export',()=>{
    const raw=JSON.stringify(v9);
    expect(v9.checksum).toBe('json-fnv-v1:25a4956536aab449');
    expect(v9.state.contentHash).toBe('json-fnv-v1:0d551eb0a2218704');
    expect(readCheckpoint(v9)).toEqual({ok:false,code:'incompatible-version'});
    const slots=restoreSlots({revision:4,current:v9,previous:null});expect(slots.status).toBe('invalid');expect(slots.raw).toBe(v9);
    expect(JSON.stringify(v9)).toBe(raw);
  });
  it('round trips all four difficulty and switch partitions with all six RNG streams unchanged',()=>{
    for(const difficulty of [0,1,2,3] as const)for(const programsEnabled of [true,false]){
      const selection={...STANDARD,difficulty,programsEnabled},state=start(selection),before=stateHash(state),checkpoint=roundTrip(state);
      expect(checkpoint.state.contentVersion).toBe('quality-r2-content-v11');
      expect({mode:state.mode,difficulty:state.difficulty,challengeId:state.challengeId,programsEnabled:state.programsEnabled}).toEqual(selection);
      expect(Object.keys(state.rng).sort()).toEqual(['challenge','deck','program','reward','rule','shop']);
      expect(stateHash(state)).toBe(before);
    }
  });
  it('round trips every isolated challenge with the exact fixed seed and no accidental high difficulty',()=>{
    for(const id of ['Q01','Q02','Q03','Q04','Q05','Q06','Q07','Q08','Q09','Q10','Q11','Q12'] as const){
      const state=start(challenge(id)),checkpoint=roundTrip(state);
      expect(checkpoint.state.mode).toBe('challenge');expect(checkpoint.state.challengeId).toBe(id);expect(checkpoint.state.difficulty).toBe(0);
      expect(checkpoint.state.seed).toBe(`challenge/${id.toLowerCase()}/0`);
    }
  });
  it('round trips the fixed tutorial independently from ordinary and challenge partitions',()=>{
    const state=start(TUTORIAL),restored=roundTrip(state).state;
    expect(restored.mode).toBe('tutorial');expect(restored.characterId).toBe('erxiang');expect(restored.seed).toBe('r2/tutorial/core-v1');
    expect(restored.program).toBeNull();expect(restored.programsEnabled).toBe(false);
  });
  it('uses a valid backup only from the exact same partition and preserves mixed raw data',()=>{
    const current=roundTrip(start()),broken={...current,checksum:'broken'},other=roundTrip(start(HARD));
    expect(restoreSlots({revision:3,current:broken,previous:current}).status).toBe('backup');
    const mixed=restoreSlots({revision:3,current:broken,previous:other});expect(mixed.status).toBe('invalid');expect(mixed.raw).toBe(broken);
    expect(restoreSlots({revision:3,current:v9,previous:current}).status).toBe('invalid');
    for(const field of ['mode','difficulty','challengeId','programsEnabled','schemaVersion']){
      const incomplete=JSON.parse(JSON.stringify(broken));delete incomplete.state[field];
      const restored=restoreSlots({revision:3,current:incomplete,previous:current});
      expect(restored.status,`missing explicit partition field: ${field}`).toBe('invalid');expect(restored.raw).toBe(incomplete);
    }
  });
  it('preserves actual Q11 score trace and stage ban snapshots without consuming a cursor',()=>{
    let state=enter(start(challenge('Q11')));state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
    const restored=roundTrip(state).state;
    expect(typeof restored.chapterDisabledJokerId).toBe('string');
    expect(restored.stage?.challengeDisabledJokerId).toBe(restored.chapterDisabledJokerId);
    expect(restored.lastTrace?.bossContext.challengeDisabledJokerId).toBe(restored.stage?.challengeDisabledJokerId);
    expect(restored.rng).toEqual(state.rng);
  });
  it('retains real ChooseProgram and AbandonProgram command journals and receipts',()=>{
    let state=start(),journal:Parameters<typeof makeCheckpoint>[1]=[];
    for(const action of [{type:'ChooseProgram',programId:state.program!.offerIds[0]},{type:'AbandonProgram'}] as const){
      const command={runId:state.runId,commandId:`choice/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action};
      const result=applyCommand(state,command);if(!result.ok)throw Error(result.code);state=result.state;journal=[...journal,command];
    }
    const saved=makeCheckpoint(state,journal);expect(readCheckpoint(saved).ok).toBe(true);
    expect(saved.state.program?.abandoned).toBe(true);expect(saved.journal.map(command=>command.action.type)).toEqual(['ChooseProgram','AbandonProgram']);
  });
  it.each(['PG01','PG02','PG03','PG04'] as const)('saves actual %s Boss awards with their exact finite source and rejects forged reward metadata',id=>{
    const state=clearProgramChapter(id),checkpoint=roundTrip(state),event=state.lastTrace!.events.find(event=>event.sourceDefinitionId===id)!;
    expect(state.program?.claimed).toBe(true);expect(event.phase).toBe('onStageClear');expect(event.sourceType).toBe('rule');
    expect(event.value).toEqual({n:id==='PG01'||id==='PG02'?'4':'1',d:'1'});
    expect(event.operation).toBe(id==='PG03'?'upgrade-hand':id==='PG04'?'reward-free-reroll':'add-gold');
    expect(Number.isSafeInteger(event.programGoldBeforeReward)).toBe(true);
    rejected(checkpoint,draft=>{draft.lastTrace.events.find((event:any)=>event.sourceDefinitionId===id).value={n:'2',d:'1'};});
    rejected(checkpoint,draft=>{delete draft.lastTrace.events.find((event:any)=>event.sourceDefinitionId===id).programGoldBeforeReward;});
    if(id==='PG03'){
      expect([event.resourceBefore,event.resourceAfter]).toEqual([29,30]);expect(event.targetHandType).toBe('high-card');
      rejected(checkpoint,draft=>{draft.lastTrace.events.find((event:any)=>event.sourceDefinitionId===id).programGoldBeforeReward=14;});
      const capped=clearProgramChapter(id,true),skipped=capped.lastTrace!.events.find(event=>event.sourceDefinitionId===id)!;
      expect(skipped.operation).toBe('program-reward-skipped');expect(skipped.value).toEqual({n:'0',d:'1'});expect(capped.program?.claimed).toBe(true);
      expect(roundTrip(capped).state).toEqual(capped);
    }
    if(id==='PG04'){
      expect([event.resourceBefore,event.resourceAfter]).toEqual([0,1]);expect(state.programRerollCoupon).toBe(true);
      const shop=send(state,{type:'OpenShop'});expect(shop.programRerollCoupon).toBe(false);expect(shop.shop?.freeRerolls).toBe(1);roundTrip(shop);
      expect(roundTrip(send(shop,{type:'LeaveShop'})).state.shop?.freeRerolls).toBe(0);
    }
  });
  it('rejects missing/unknown mode fields, illegal difficulty and layered challenge imports',()=>{
    const checkpoint=roundTrip(start());
    for(const [key,bad] of [['mode','daily'],['mode','normal'],['difficulty',4],['difficulty','0'],['challengeId','Q01'],['programsEnabled',1]] as const)
      rejected(checkpoint,draft=>draft[key]=bad);
    for(const key of ['mode','challengeId','programsEnabled'])rejected(checkpoint,draft=>delete draft[key]);
    rejected(roundTrip(start(challenge('Q01'))),draft=>draft.difficulty=1);
  });
  it('rejects wrong fixed seeds and mismatched tutorial character/config without falling back',()=>{
    rejected(roundTrip(start(challenge('Q04'))),draft=>draft.seed='challenge/q05/0');
    rejected(roundTrip(start(TUTORIAL)),draft=>draft.seed='custom');
    rejected(roundTrip(start(TUTORIAL)),draft=>draft.characterId='amo');
    rejected(roundTrip(start(TUTORIAL)),draft=>draft.programsEnabled=true);
  });
  it('rejects duplicate/unknown offers and impossible choice or claimed program state',()=>{
    const checkpoint=roundTrip(start());
    rejected(checkpoint,draft=>draft.program.offerIds=['PG01','PG01']);
    rejected(checkpoint,draft=>draft.program.offerIds=['PG01','PG99']);
    rejected(checkpoint,draft=>draft.program.selectedId='PG99');
    rejected(checkpoint,draft=>draft.program.claimed=true);
    rejected(checkpoint,draft=>draft.program.script='award()');
    rejected(roundTrip(start(challenge('Q06'))),draft=>draft.program.offerIds=['PG01','PG04']);
  });
  it('rejects invalid chapter bans, non-Q11 bans and corrupted trace ban snapshots',()=>{
    const checkpoint=roundTrip(start(challenge('Q11')));rejected(checkpoint,draft=>draft.chapterDisabledJokerId='missing');
    rejected(checkpoint,draft=>draft.chapterDisabledJokerId=null);
    rejected(roundTrip(start()),draft=>draft.chapterDisabledJokerId='pengci');
    let state=enter(start(challenge('Q11')));state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
    rejected(roundTrip(state),draft=>draft.lastTrace.bossContext.challengeDisabledJokerId='missing');
    rejected(roundTrip(state),draft=>delete draft.lastTrace.bossContext.challengeDisabledJokerId);
  });
  it('rejects invalid ranks and Q10 enhancements while preserving independent legal editions',()=>{
    const ranks=roundTrip(start(challenge('Q04')));
    rejected(ranks,draft=>draft.deckInstances[0].rank=15);
    // Non-finite input cannot be canonically rehashed; exercise the parser directly without a fabricated checksum.
    const nonFinite=JSON.parse(JSON.stringify(ranks));nonFinite.state.deckInstances[0].rank=NaN;
    expect(readCheckpoint(nonFinite)).toEqual({ok:false,code:'non-finite-save'});
    const base=roundTrip(start(challenge('Q10')));rejected(base,draft=>draft.deckInstances[0].enhancement='heat-paper');
    const edition=start(challenge('Q10'));edition.deckInstances[0].edition='foil';expect(roundTrip(edition).state.deckInstances[0].edition).toBe('foil');
  });
  it('keeps real three-slot scoring and rejects ordinary slot rewards or a fourth owned Joker',()=>{
    // Controlled ownership boundary; the entered hand and its score trace use actual shared commands.
    let scored=createRun({seed:'challenge/q02/0',characterId:'erxiang',runId:'save/q02/three-slots',rulesVersion:'r2',modeConfig:challenge('Q02')});
    scored.jokers=[r2CreateJoker('d10','save/q02/empty-slot-joker',4)];scored=enter(scored);
    const cardId=scored.handOrder[0];Object.assign(scored.deckInstances.find(card=>card.id===cardId)!,{rank:2,suit:'clubs'});
    scored=send(scored,{type:'PlayHand',selectedIds:[cardId]});
    expect(scored.lastTrace?.finalScore).toBe('46');
    expect(scored.lastTrace?.events.find(event=>event.operation==='add-heat-per-empty-slot')?.value).toEqual({n:'24',d:'1'});
    rejected(roundTrip(scored),draft=>{draft.lastTrace.events.find((event:any)=>event.operation==='add-heat-per-empty-slot').value={n:'48',d:'1'};});
    const state=start(challenge('Q02'));
    state.jokers=['pengci','huimaqiang','mantangcai','e08'].map((id,index)=>({instanceId:`four/${index}`,definitionId:id,paidPrice:0,growth:{},edition:'none'}));
    expect(()=>makeCheckpoint(state,[])).toThrow();
  });
  it('rejects invented hand/discard budgets and keeps the exact remaining-plus-spent ledger',()=>{
    const state=enter(start(challenge('Q08'))),checkpoint=roundTrip(state);
    expect(state.stage?.initialDiscards).toBe(1);
    rejected(checkpoint,draft=>{draft.stage.initialDiscards=2;draft.stage.discardsLeft=2;});
    rejected(checkpoint,draft=>draft.stage.discardsLeft=2);
    rejected(checkpoint,draft=>{draft.stage.initialHands=9;draft.stage.handsLeft=9;});
  });
  it('validates precise difficulty targets rather than accepting the old D0 stage base',()=>{
    const checkpoint=roundTrip(enter(start({...STANDARD,difficulty:1})));
    expect(checkpoint.state.stage?.initialTargetHeat).toBe('480');
    rejected(checkpoint,draft=>{draft.stage.initialTargetHeat='400';draft.stage.targetHeat='400';});
  });
  it('rejects malformed or impossible program reroll coupons and shop counters',()=>{
    const checkpoint=roundTrip(start());rejected(checkpoint,draft=>draft.programRerollCoupon=1);
    rejected(checkpoint,draft=>draft.shop.freeRerolls=2);
    rejected(roundTrip(start(challenge('Q06'))),draft=>draft.shop.freeRerolls=1);
    rejected(roundTrip(start(OFF)),draft=>draft.programRerollCoupon=true);
  });
  it('saves the real one-discard action in Q08 without raising its minimum to ordinary D0',()=>{
    let state=enter(start(challenge('Q08')));state=send(state,{type:'DiscardHand',selectedIds:[state.handOrder[0]]});
    const saved=roundTrip(state).state;expect(saved.stage?.discardsLeft).toBe(0);expect(saved.stage?.discardSpent).toBe(1);
  });
  it('preserves zero-paid Q09 starting rarities and Q12 chapter-three preparation without prior rewards',()=>{
    const poor=roundTrip(start(challenge('Q09'))).state;
    expect(poor.gold).toBe(0);expect(poor.jokers.map(joker=>[joker.definitionId,joker.paidPrice,joker.edition])).toEqual([['huimaqiang',0,'none'],['e08',0,'none']]);
    const late=roundTrip(start(challenge('Q12'))).state;
    expect([late.chapter,late.stageIndex,late.gold]).toEqual([3,6,20]);expect(late.normalClearClaimed).toBe(false);expect(late.chapterHandUsage).toEqual({});
  });
});

describe('C04.2 production IndexedDbSave partitioning and GameSession persistence',()=>{
  it('writes the complete explicit partition key rather than the old shared content hash slot',async()=>{
    const storage=new IndexedDbSave(),checkpoint=roundTrip(start(HARD));await storage.commit(0,checkpoint,null);
    expect(database.records.has(keyFor(HARD))).toBe(true);expect(database.records.has(`r2:${R2_CONTENT_HASH}`)).toBe(false);
    expect(await storage.read()).toEqual({revision:1,current:checkpoint,previous:null});
  });
  it('keeps backups only inside the same complete mode/challenge/difficulty/switch partition',async()=>{
    const storage=new IndexedDbSave(),normal=roundTrip(start()),hard=roundTrip(start(HARD));
    await storage.commit(0,normal,null);await storage.commit(1,hard,normal);
    expect((await storage.read()).previous).toBeNull();
    const second=roundTrip(send(hard.state,{type:'LeaveShop'}));await storage.commit(2,second,hard);
    expect((await storage.read()).previous).toEqual(hard);
    const off=roundTrip(start(OFF));await storage.commit(3,off,second);expect((await storage.read()).previous).toBeNull();
  });
  it('reads any target partition with global revision while leaving the active meta pointer unchanged',async()=>{
    const storage=new IndexedDbSave(),normal=roundTrip(start()),hard=roundTrip(start(HARD));
    await storage.commit(0,normal,null);await storage.commit(1,hard,null);const before=structuredClone(database.records.get('meta'));
    expect(await storage.readPartition(STANDARD)).toEqual({revision:2,current:normal,previous:null});
    expect(await storage.readPartition(TUTORIAL)).toEqual({revision:2,current:null,previous:null});
    expect(database.records.get('meta')).toEqual(before);expect((await storage.read()).current).toEqual(hard);
  });
  it('retains every genuine old hash key and exports its original v9 contents after a new v10 commit',async()=>{
    const oldKey='r2:json-fnv-v1:0d551eb0a2218704',old={current:v9,previous:null};database.records.set(oldKey,old);
    database.records.set('meta',{revision:4,slotKey:oldKey});const storage=new IndexedDbSave();
    await storage.commit(4,roundTrip(start()),null);
    expect(database.records.get(oldKey)).toEqual(old);
    const exported=JSON.parse(await storage.exportRetained());expect(exported.records).toContainEqual({key:oldKey,value:old});
  });
  it('preserves compare-and-swap revision across mode switches and rejects stale writes atomically',async()=>{
    const storage=new IndexedDbSave();await storage.commit(0,roundTrip(start()),null);const before=structuredClone([...database.records]);
    await expect(storage.commit(0,roundTrip(start(HARD)),null)).rejects.toThrow('write-conflict');
    expect([...database.records]).toEqual(before);
  });
  it('publishes new standard/challenge/tutorial sessions only after their target partition commits',async()=>{
    const {session}=await sessionWithStandard();
    for(const selection of [HARD,challenge('Q04'),TUTORIAL,OFF]){
      const run=await session.start(seedFor(selection),selection.mode==='tutorial'?'erxiang':'amo',selection);expect(run).toBeDefined();
      expect(run?.state.mode).toBe(selection.mode);expect((await session.storage.readPartition(selection)).current).toEqual(JSON.parse(run!.exportJSON()));
    }
    expect(vi.mocked(localStorage.setItem)).not.toHaveBeenCalled();
  });
  it('resumes a saved mode by importing its exact state without restarting, drawing or changing sequence',async()=>{
    const {session,run}=await sessionWithStandard();expect((await run.dispatch({type:'LeaveShop'})).ok).toBe(true);
    const saved=run.exportJSON(),state=run.state;await session.start(seedFor(HARD),'amo',HARD);
    expect(await session.resumeMode(STANDARD)).toBe(true);expect(session.run?.exportJSON()).toBe(saved);
    expect(session.run?.state.commandSeq).toBe(state.commandSeq);expect(session.run?.state.rng).toEqual(state.rng);
    expect((await session.storage.read()).current).toEqual(JSON.parse(saved));
  });
  it('imports by the validated checkpoint own partition, not the currently selected one',async()=>{
    const {session}=await sessionWithStandard(),imported=roundTrip(enter(start(challenge('Q07'))));
    expect(await session.importJSON(JSON.stringify(imported))).toBe(true);expect(session.state()).toEqual(imported.state);
    expect((await session.storage.readPartition(challenge('Q07'))).current).toEqual(imported);
    expect((await session.storage.readPartition(challenge('Q07'))).previous).toBeNull();
    expect((await session.storage.readPartition(STANDARD)).current).not.toBeNull();
    const recorder=vi.spyOn(RunProgress,'recordSavedRunProgress');
    for(const selection of [{...challenge('Q01'),programsEnabled:false},TUTORIAL,OFF]){
      recorder.mockClear();
      const completed=roundTrip(finalStageWon(selection));expect(completed.state.phase).toBe('run-won');
      expect(completed.state.normalCompletion===null).toBe(selection.mode!=='standard');
      expect(await session.importJSON(JSON.stringify(completed))).toBe(true);expect(session.state()).toEqual(completed.state);
      expect((await session.storage.readPartition(selection)).current).toEqual(completed);
      if(selection.mode==='standard')expect(recorder).toHaveBeenLastCalledWith(session.run!.state);
      else expect(recorder).not.toHaveBeenCalled();
      expect(RunProgress.readRunProgress().progress).toEqual({version:1,standardWins:[selection.mode==='standard',false,false,false]});
    }
    expect(vi.mocked(localStorage.setItem)).toHaveBeenCalledTimes(1);
    expect(await session.resumeMode(OFF)).toBe(true);expect(vi.mocked(localStorage.setItem)).toHaveBeenCalledTimes(1);
    const higher={...OFF,difficulty:1 as const},won=roundTrip(finalStageWon(higher));
    vi.mocked(localStorage.setItem).mockImplementationOnce(()=>{throw new DOMException('quota','QuotaExceededError');});
    expect(await session.importJSON(JSON.stringify(won))).toBe(true);expect(session.state()).toEqual(won.state);
    expect((await session.storage.read()).current).toEqual(won);expect(session.notice).toContain('解锁');
    expect(RunProgress.readRunProgress().progress).toEqual({version:1,standardWins:[true,false,false,false]});
    expect(await session.resumeMode(higher)).toBe(true);expect(session.state()).toEqual(won.state);
    expect(RunProgress.readRunProgress().progress).toEqual({version:1,standardWins:[true,true,false,false]});
  });
  it('leaves the published run and pointer unchanged if the requested partition is empty or invalid',async()=>{
    const {session,run}=await sessionWithStandard(),before=run.exportJSON(),meta=structuredClone(database.records.get('meta'));
    expect(await session.resumeMode(TUTORIAL)).toBe(false);expect(session.run).toBe(run);
    database.records.set(keyFor(HARD),{current:{broken:true},previous:null});
    expect(await session.resumeMode(HARD)).toBe(false);expect(session.run?.exportJSON()).toBe(before);expect(database.records.get('meta')).toEqual(meta);
    database.records.set(keyFor(HARD),{current:JSON.parse(before),previous:null});
    expect(await session.resumeMode(HARD)).toBe(false);expect(session.run).toBe(run);expect(database.records.get('meta')).toEqual(meta);
  });
  it('keeps a failed resume candidate retryable while the old mode remains published',async()=>{
    const {session}=await sessionWithStandard(),ready=roundTrip(finalStageReady());
    expect(await session.importJSON(JSON.stringify(ready))).toBe(true);const finalRun=session.run!,recorder=vi.spyOn(RunProgress,'recordSavedRunProgress');
    database.failWrites=true;
    expect((await finalRun.dispatch({type:'PlayHand',selectedIds:finalRun.state.handOrder.slice(0,5)})).ok).toBe(false);
    expect(finalRun.status).toBe('paused');expect(finalRun.state.phase).toBe('await-input');expect(JSON.parse(finalRun.exportJSON()).state.phase).toBe('run-won');
    expect((await session.storage.read()).current).toEqual(ready);expect(recorder).not.toHaveBeenCalled();
    expect(RunProgress.readRunProgress().progress).toEqual({version:1,standardWins:[false,false,false,false]});
    expect(await session.retry()).toBe(false);expect(recorder).not.toHaveBeenCalled();
    database.failWrites=false;expect(await session.retry()).toBe(true);expect(finalRun.state.phase).toBe('run-won');
    expect(recorder).toHaveBeenLastCalledWith(finalRun.state);
    expect(RunProgress.readRunProgress().progress).toEqual({version:1,standardWins:[true,false,false,false]});
    await session.start(seedFor(HARD),'amo',HARD);const original=session.run!,before=original.exportJSON();recorder.mockClear();
    database.failWrites=true;expect(await session.resumeMode(OFF)).toBe(false);expect(session.run).toBe(original);expect(session.run?.exportJSON()).toBe(before);
    const candidate=session.pendingRun;expect(candidate).toBeDefined();const exact=candidate!.exportJSON(),seq=candidate!.state.commandSeq;
    expect(await session.retry()).toBe(false);expect(candidate!.exportJSON()).toBe(exact);expect(recorder).not.toHaveBeenCalled();
    database.failWrites=false;expect(await session.retry()).toBe(true);expect(session.run?.exportJSON()).toBe(exact);expect(session.run?.state.commandSeq).toBe(seq);
    expect(recorder).toHaveBeenLastCalledWith(session.run!.state);
  });
  it('keeps a failed cross-mode start unpublished and retries its exact candidate without repeating StartRun',async()=>{
    const {session,run}=await sessionWithStandard(),meta=structuredClone(database.records.get('meta'));
    database.failWrites=true;expect(await session.start(seedFor(challenge('Q09')),'amo',challenge('Q09'))).toBeUndefined();expect(session.run).toBe(run);
    const candidate=session.pendingRun;expect(candidate?.state.mode).toBe('challenge');const exact=candidate!.exportJSON();
    expect(database.records.get('meta')).toEqual(meta);database.failWrites=false;expect(await session.retry()).toBe(true);expect(session.run?.exportJSON()).toBe(exact);
  });
  it('blocks another mode replacement while pending, then cancels a lease-lost candidate without a write',async()=>{
    const {session,run}=await sessionWithStandard();database.failWrites=true;await session.start(seedFor(HARD),'amo',HARD);
    const pending=session.pendingRun,before=structuredClone([...database.records]);expect(pending).toBeDefined();
    expect(await session.resumeMode(TUTORIAL)).toBe(false);expect(session.pendingRun).toBe(pending);
    session.lease.writable=false;session.lease.onChange();expect(pending?.status).toBe('readonly');expect(await session.retry()).toBe(false);
    expect(session.cancelPending()).toBe(true);expect(session.run).toBe(run);expect([...database.records]).toEqual(before);
    database.failWrites=false;const winner=roundTrip(finalStageWon()),storage=new IndexedDbSave();
    await storage.commit((await storage.read()).revision,winner,null);
    const recorder=vi.spyOn(RunProgress,'recordSavedRunProgress'),readonly=new GameSession();readonly.lease.writable=false;
    await readonly.initialize();expect(readonly.run?.status).toBe('readonly');expect(readonly.run?.state).toEqual(winner.state);
    expect(recorder).not.toHaveBeenCalled();expect(RunProgress.readRunProgress().progress).toEqual({version:1,standardWins:[false,false,false,false]});
  });
  it('refuses an invalid checkpoint commit before it can replace any complete partition',async()=>{
    const storage=new IndexedDbSave(),checkpoint=roundTrip(start());await storage.commit(0,checkpoint,null);const before=structuredClone([...database.records]);
    const invalid={...checkpoint,checksum:'corrupt'};
    await expect(storage.commit(1,invalid,null)).rejects.toThrow();expect([...database.records]).toEqual(before);
  });
});


describe('Amo v10/v11 production storage partition compatibility',()=>{
  const legacyCheckpoint=()=>{const read=readCheckpoint(legacyAmo.after);if(!read.ok)throw Error(read.code);return read.checkpoint;};
  it('keeps both same-mode partitions; exact import targets its own identity and mode resume prefers active',async()=>{
    const old=legacyCheckpoint(),current=makeCheckpoint(start(),[]),storage=new IndexedDbSave();
    const oldKey=r2ModeStorageKey(old.state,old.state.contentHash),newKey=keyFor(STANDARD);
    await storage.commit(0,old,null);await storage.commit(1,current,old);
    expect(database.records.get(oldKey)).toEqual({current:old,previous:null});expect(database.records.get(newKey)).toEqual({current,previous:null});
    expect((await storage.readPartition(STANDARD)).current).toEqual(current);
    expect((await storage.readPartition(old.state)).current).toEqual(old);
    await storage.commit(2,old,null);expect((await storage.read()).current).toEqual(old);
    expect((await storage.readPartition(STANDARD)).current).toEqual(old);
    expect((await storage.readPartition(current.state)).current).toEqual(current);
    // Another mode becomes active: missing new standard partition still discovers the legacy standard one.
    database.records.delete(newKey);const hard=makeCheckpoint(start(HARD),[]);await storage.commit(3,hard,null);
    expect((await storage.readPartition(STANDARD)).current).toEqual(old);
    expect(JSON.parse(await storage.exportRetained()).records.some((r:{key:string})=>r.key===oldKey)).toBe(true);
  });
  it('reads a corrupt active legacy pair and recovers its legacy previous without using a new-profile backup',async()=>{
    const read=readCheckpoint(legacyAmo.before);if(!read.ok)throw Error(read.code);
    const old=legacyCheckpoint(),storage=new IndexedDbSave(),key=r2ModeStorageKey(old.state,old.state.contentHash);
    const corrupt=structuredClone(old);corrupt.checksum='damaged';
    database.records.set(key,{current:corrupt,previous:read.checkpoint});database.records.set('meta',{revision:7,slotKey:key});
    const slots=await storage.readPartition(STANDARD);expect(slots.revision).toBe(7);expect(slots.current).toEqual(corrupt);
    expect(restoreSlots(slots)).toMatchObject({status:'backup',checkpoint:read.checkpoint});
    await expect(storage.readPartition({...old.state,contentHash:R2_CONTENT_HASH})).rejects.toThrow('incompatible-version');
  });
  it('session load, takeover, import and mode resume retain old identity without replaying a reward',async()=>{
    const old=legacyCheckpoint(),storage=new IndexedDbSave();await storage.commit(0,old,null);
    const session=new GameSession();await session.initialize();expect(session.state()).toEqual(old.state);
    expect(await session.takeOver()).toBe(true);expect(session.state()).toEqual(old.state);
    expect(await session.importJSON(JSON.stringify(old))).toBe(true);expect(session.state()).toEqual(old.state);
    expect(await session.resumeMode(STANDARD)).toBe(true);expect(session.state()).toEqual(old.state);
    expect(session.state()?.contentHash).toBe(R2_LEGACY_CONTENT_HASH);
    // Starting creates the new profile while retaining the original old partition.
    await session.start('new-after-old','amo',STANDARD);expect(session.state()?.contentHash).toBe('json-fnv-v1:5025cc23c013987f');
    expect((await storage.readPartition(old.state)).current).toEqual(old);
  });
  it('legacy failed persistence retries the exact pending candidate once, duplicate command has no events',async()=>{
    const read=readCheckpoint(legacyAmo.before);if(!read.ok)throw Error(read.code);
    const storage=new IndexedDbSave();await storage.commit(0,read.checkpoint,null);
    const run=SavedRun.restore(storage,await storage.read()),before=run.exportJSON();database.failWrites=true;
    const failed=await run.submit(legacyAmo.command as Parameters<SavedRun['submit']>[0]);expect(failed.ok).toBe(false);
    expect(run.state).toEqual(read.checkpoint.state);expect(run.status).toBe('paused');
    expect(JSON.parse(run.exportJSON())).toEqual(legacyAmo.after);database.failWrites=false;
    const saved=await run.retry();expect(saved.ok).toBe(true);expect(run.state).toEqual(legacyAmo.after.state);
    expect(before).not.toBe(run.exportJSON());const after=run.exportJSON();
    const duplicate=await run.submit(legacyAmo.command as Parameters<SavedRun['submit']>[0]);expect(duplicate.ok&&duplicate.duplicate).toBe(true);
    if(duplicate.ok)expect(duplicate.events).toEqual([]);expect(run.exportJSON()).toBe(after);
  });
});

describe('explicit Amo prototype shares discovery while preserving published partitions',()=>{
  it('selects all three complete profile identities, preferring the active same-mode slot even when damaged',async()=>{
    const storage=new IndexedDbSave(),oldRead=readCheckpoint(legacyAmo.before);if(!oldRead.ok)throw Error(oldRead.code);
    const current=roundTrip(start()),prototype=roundTrip(createRun({seed:'assist-partition',characterId:'amo',runId:'assist-partition',rulesVersion:'r2',r2Profile:'amo-assist-v1',modeConfig:STANDARD}));
    for(const cp of [oldRead.checkpoint,current,prototype,oldRead.checkpoint,prototype]){
      await storage.commit((await storage.read()).revision,cp,null);expect((await storage.readPartition(STANDARD)).current).toEqual(cp);
    }
    for(const cp of [oldRead.checkpoint,current,prototype])expect((await storage.readPartition(cp.state)).current).toEqual(cp);
    const key=r2ModeStorageKey(prototype.state,prototype.state.contentHash),damaged={...prototype,checksum:'broken'};
    database.records.set(key,{current:damaged,previous:prototype});expect(restoreSlots(await storage.readPartition(STANDARD)).status).toBe('backup');
    database.records.set(key,{current:damaged,previous:{...prototype,checksum:'also-broken'}});expect(restoreSlots(await storage.readPartition(STANDARD)).status).toBe('invalid');
    await expect(storage.readPartition({...prototype.state,contentHash:current.state.contentHash})).rejects.toThrow('incompatible-version');
  });
});
