import {describe,expect,it} from 'vitest';
import {applyCommand,createRun,stateHash,type Action,type R2RunState} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {CHARACTER_IDS} from '../src/domain/characters';
import {R2_JOKERS} from '../src/content/r2Schema';
import {r2RunModeConfig,type R2Difficulty,type R2ModeSelection} from '../src/content/r2Modes';
import {lockR2ProgramChapter} from '../src/domain/r2Programs';
import {SavedRun,type SaveSlots,type SaveStore} from '../src/application/SavedRun';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {r2EmptyProgress,readR2Progress,r2DifficultyUnlocked,r2ModeUnlocked,r2ProgressAfterSavedRun} from '../src/domain/r2Progress';
import {RUN_PROGRESS_KEY,readRunProgress,recordSavedRunProgress} from '../src/platform/RunProgress';

const mode=(patch:Partial<R2ModeSelection>={}):R2ModeSelection=>({mode:'standard',difficulty:0,challengeId:null,programsEnabled:false,...patch});
const empty=()=>({version:1 as const,standardWins:[false,false,false,false] as const});
const send=(state:R2RunState,action:Action):R2RunState=>{
  const result=applyCommand(state,{runId:state.runId,commandId:`progress/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
  if(!result.ok)throw Error(result.code);return result.state;
};
function finalBoss(selection=mode()):R2RunState {
  const seed=selection.mode==='tutorial'?'r2/tutorial/core-v1':selection.mode==='challenge'?'challenge/q01/0':'c04-progress-final';
  const state=createRun({seed,runId:'c04-progress',characterId:'erxiang',rulesVersion:'r2',modeConfig:selection});
  // Controlled legal final-stage ownership/card fixture; final score and win use real commands.
  // This is save/progression evidence, not natural acquisition or a balance sample.
  state.chapter=8;state.stageIndex=23;state.phase='stage-ready';state.shop!.visitIndex=23;
  state.seenBossIds=['B01','B02','B03','B04','B05','B06','B07','B15'];state.boss={definitionId:'B15',disabledSuit:null};
  const suits=['spades','hearts','clubs','diamonds'] as const;
  state.deckInstances=Array.from({length:24},(_,i)=>({id:`ace/${i}`,rank:14 as const,suit:suits[i%4]}));
  state.drawPile=state.deckInstances.map(card=>card.id);state.handLevels={'five-kind':30,'flush-five':30};
  state.jokers=['pengci','f06','e11','e10','f12'].map(id=>r2CreateJoker(id,`owned/${id}`,9,'polychrome'));
  state.jokers.find(joker=>joker.definitionId==='e10')!.counters={stageClears:1};
  if(selection.programsEnabled){const locked=lockR2ProgramChapter(r2RunModeConfig(state),8,state.rng.program);state.program=locked.program;state.rng.program=locked.cursor;}
  return send(state,{type:'EnterStage'});
}
const win=(selection=mode())=>{const state=finalBoss(selection);return send(state,{type:'PlayHand',selectedIds:state.handOrder.slice(0,5)});};
class ProgressStore {
  raw:string|null=null;writes=0;failRead=false;failWrite=false;
  getItem(key:string){expect(key).toBe(RUN_PROGRESS_KEY);if(this.failRead)throw Error('blocked');return this.raw;}
  setItem(key:string,value:string){expect(key).toBe(RUN_PROGRESS_KEY);if(this.failWrite)throw Error('quota');this.raw=value;this.writes++;}
}
class RunStore implements SaveStore {
  slots:SaveSlots={revision:0,current:null,previous:null};fail=false;
  async read(){return structuredClone(this.slots);}
  async commit(expected:number,current:ReturnType<typeof makeCheckpoint>,previous:ReturnType<typeof makeCheckpoint>|null){
    if(this.fail)throw new DOMException('quota','QuotaExceededError');
    if(expected!==this.slots.revision)throw Error('write-conflict');
    this.slots={revision:expected+1,current:structuredClone(current),previous:structuredClone(previous)};return this.slots.revision;
  }
}

describe('C04.2 saved standard completion grants finite real progress',()=>{
  it('starts with D0 and tutorial available, higher difficulties and challenges locked, all six roles and 72 definitions present',()=>{
    const progress=r2EmptyProgress();expect(progress).toEqual(empty());
    expect([0,1,2,3].map(d=>r2DifficultyUnlocked(progress,d))).toEqual([true,false,false,false]);
    expect(r2ModeUnlocked(progress,mode({mode:'tutorial',programsEnabled:false}))).toBe(true);
    expect(r2ModeUnlocked(progress,mode({mode:'challenge',challengeId:'Q01'}))).toBe(false);
    expect(CHARACTER_IDS).toEqual(['amo','touye','laohuan','erxiang','azao','xiemu']);expect(R2_JOKERS).toHaveLength(72);
  });
  it.each([
    [0,[true,false,false,false],[true,true,false,false]],
    [1,[false,true,false,false],[true,false,true,false]],
    [2,[false,false,true,false],[true,false,false,true]],
    [3,[false,false,false,true],[true,false,false,false]],
  ] as const)('records only an actually completed D%s and unlocks only its successor',(difficulty,flags,unlocks)=>{
    const state=win(mode({difficulty}));expect(state.phase).toBe('run-won');
    const result=r2ProgressAfterSavedRun(empty(),state);expect(result.changed).toBe(true);
    expect(result.progress).toEqual({version:1,standardWins:flags});
    expect([0,1,2,3].map(d=>r2DifficultyUnlocked(result.progress,d))).toEqual(unlocks);
    expect(r2ModeUnlocked(result.progress,mode({mode:'challenge',challengeId:'Q12'}))).toBe(true);
  });
  it('uses separate difficulty flags when deterministic runId and clearId are identical across modes',()=>{
    let progress=r2EmptyProgress();const clearIds:string[]=[];
    for(const difficulty of [0,1,2,3] as const){const state=win(mode({difficulty}));clearIds.push(state.stage!.clearId!);progress=r2ProgressAfterSavedRun(progress,state).progress;}
    expect(new Set(clearIds).size).toBe(1);expect(progress.standardWins).toEqual([true,true,true,true]);
  });
  it('grants the same standard first-clear qualification with the optional program flag enabled or disabled',()=>{
    for(const programsEnabled of [false,true])expect(r2ProgressAfterSavedRun(empty(),win(mode({programsEnabled})))).toMatchObject({changed:true,progress:{version:1,standardWins:[true,false,false,false]}});
  });
  it('persists one first-clear flag and no further write for the same or another winning run at that difficulty',()=>{
    const store=new ProgressStore(),state=win(),before=stateHash(state),rng=structuredClone(state.rng);
    expect(recordSavedRunProgress(state,store)).toMatchObject({ok:true,changed:true,progress:{version:1,standardWins:[true,false,false,false]}});
    const saved=store.raw;expect(recordSavedRunProgress(state,store)).toMatchObject({ok:true,changed:false});
    const other=structuredClone(state);other.runId='other-real-run';other.stage!.clearId='other-real-run/clear/23';other.normalCompletion!.clearId=other.stage!.clearId;
    expect(recordSavedRunProgress(other,store)).toMatchObject({ok:true,changed:false});
    expect(store.writes).toBe(1);expect(store.raw).toBe(saved);expect(stateHash(state)).toBe(before);expect(state.rng).toEqual(rng);
  });
  it.each(['tutorial','challenge'] as const)('%s victory cannot grant standard qualifications',id=>{
    const state=win(mode({mode:id,...(id==='challenge'?{challengeId:'Q01' as const}:{})}));
    expect(state.phase).toBe('run-won');expect(state.normalCompletion).toBeNull();
    const store=new ProgressStore();expect(recordSavedRunProgress(state,store)).toMatchObject({ok:true,changed:false,progress:empty()});expect(store.raw).toBeNull();
  });
  it('does not grant the retained normal qualification while continuing or losing endless',()=>{
    const won=win(),endless=send(won,{type:'ContinueEndless'});expect(endless.normalCompletion).toEqual(won.normalCompletion);
    const store=new ProgressStore();expect(recordSavedRunProgress(endless,store).changed).toBe(false);
    expect(recordSavedRunProgress(send(endless,{type:'AbandonRun'}),store).changed).toBe(false);expect(store.writes).toBe(0);
  });
  it.each([
    ['wrong phase',(s:R2RunState)=>{s.phase='stage-cleared';}],
    ['early chapter',(s:R2RunState)=>{s.chapter=7;}],
    ['missing qualification',(s:R2RunState)=>{s.normalCompletion=null;}],
    ['mismatched clear',(s:R2RunState)=>{s.normalCompletion!.clearId='invented';}],
    ['mismatched total',(s:R2RunState)=>{s.normalCompletion!.totalHeat='1';}],
    ['uncleared stage',(s:R2RunState)=>{s.stage!.heat='0';}],
  ] as const)('refuses a terminal-looking state with %s',(label,mutate)=>{
    const state=win();mutate(state);const store=new ProgressStore();
    expect(recordSavedRunProgress(state,store).changed,label).toBe(false);expect(store.writes).toBe(0);
  });
  it('waits for the genuine final-play commit, retries the same candidate, and grants once after save success',async()=>{
    const store=new RunStore(),progressStore=new ProgressStore(),state=finalBoss();
    const run=await SavedRun.start(store,state,await store.read());store.fail=true;
    const action:Action={type:'PlayHand',selectedIds:run.state.handOrder.slice(0,5)},failed=await run.dispatch(action);
    expect(failed.ok).toBe(false);expect(run.status).toBe('paused');expect(run.state.phase).toBe('await-input');
    const candidate=readCheckpoint(JSON.parse(run.exportJSON()));expect(candidate.ok&&candidate.checkpoint.state.phase).toBe('run-won');
    expect(recordSavedRunProgress(run.state,progressStore).changed).toBe(false);expect(progressStore.writes).toBe(0);
    store.fail=false;expect((await run.retry()).ok).toBe(true);expect(run.status).toBe('idle');expect(await run.flush()).toBe(true);
    expect(recordSavedRunProgress(run.state,progressStore).changed).toBe(true);
    expect(recordSavedRunProgress(SavedRun.restore(store,await store.read()).state,progressStore).changed).toBe(false);expect(progressStore.writes).toBe(1);
  });
  it('preserves existing progress bytes and qualifications if writing the next saved win fails',()=>{
    const store=new ProgressStore();recordSavedRunProgress(win(),store);const before=store.raw;store.failWrite=true;
    expect(recordSavedRunProgress(win(mode({difficulty:1})),store)).toMatchObject({ok:false,changed:false,code:'progress-storage-error',progress:{version:1,standardWins:[true,false,false,false]}});
    expect(store.raw).toBe(before);store.failWrite=false;expect(recordSavedRunProgress(win(mode({difficulty:1})),store).changed).toBe(true);
  });
  it('preserves unreadable/corrupt progress rather than replacing it with fabricated defaults',()=>{
    const store=new ProgressStore();store.raw='{"version":0,"standardWins":[true,true,true,true]}';const before=store.raw;
    expect(recordSavedRunProgress(win(),store)).toMatchObject({ok:false,changed:false,code:'invalid-progress'});expect(store.raw).toBe(before);expect(store.writes).toBe(0);
    store.failRead=true;expect(readRunProgress(store)).toMatchObject({ok:false,code:'progress-storage-error'});expect(store.raw).toBe(before);
  });
  it('reads only a finite versioned four-boolean progress record and rejects illegal difficulty queries',()=>{
    expect(readR2Progress({version:1,standardWins:[true,false,true,false]})).toEqual({version:1,standardWins:[true,false,true,false]});
    for(const value of [null,{}, {...empty(),version:2},{...empty(),standardWins:[true]}, {...empty(),standardWins:[true,1,false,false]}, {...empty(),runIds:['unbounded']}])expect(readR2Progress(value)).toBeUndefined();
    for(const difficulty of [-1,4,0.5,'D0',NaN,Infinity])expect(r2DifficultyUnlocked(empty(),difficulty)).toBe(false);
    expect(r2ModeUnlocked(empty(),mode({difficulty:4 as R2Difficulty}))).toBe(false);
  });
});
