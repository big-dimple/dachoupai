import {describe,expect,it} from 'vitest';
import {makeCheckpoint,readCheckpoint,restoreSlots,type Checkpoint} from '../src/application/checkpoint';
import {SavedRun,type SaveSlots,type SaveStore} from '../src/application/SavedRun';
import {applyCommand,createRun,stateHash,type Action,type Command,type R2RunState} from '../src/domain/run';
import {stableHash} from '../src/domain/hash';
import rawV8 from './fixtures/c03-v8-checkpoint.json';

interface Fixture {state:R2RunState;journal:Command[]}
const object=(value:unknown)=>value as Record<string,unknown>;
const command=(state:R2RunState,action:Action):Command=>({runId:state.runId,commandId:`${state.runId}/command/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
function send(fixture:Fixture,action:Action):Fixture {
  const cmd=command(fixture.state,action),result=applyCommand(fixture.state,cmd);
  expect(result.ok,result.ok?'':result.code).toBe(true);if(!result.ok)throw Error(result.code);
  return {state:result.state,journal:result.duplicate?fixture.journal:[...fixture.journal,cmd]};
}
function start():Fixture {return {state:createRun({seed:'c03-endless-save',runId:'c03-endless-save',characterId:'erxiang',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}}),journal:[]};}
function readyForNormalFinal():Fixture {
  const fixture=send(start(),{type:'LeaveShop'});
  // Artificial legal late-chapter deck/level boundary, not a naturally acquired eight-chapter run.
  // Entry, winning PlayHand, ContinueEndless and every following transaction use real shared commands.
  Object.assign(fixture.state,{chapter:8,stageIndex:23,shop:null,totalHeat:'1000',boss:{definitionId:'B12',disabledSuit:null},
    seenBossIds:['B01','B02','B05','B06','B07','B08','B13','B12'],handLevels:{'high-card':1,'flush-five':30}});
  fixture.state.deckInstances=Array.from({length:20},(_,index)=>({id:`c03/card/${index}`,rank:14,suit:'hearts',enhancement:'encore-paper',edition:'polychrome'}));
  fixture.state.drawPile=fixture.state.deckInstances.map(card=>card.id);
  return fixture;
}
function won():Fixture {
  const fixture=send(readyForNormalFinal(),{type:'EnterStage'});
  return send(fixture,{type:'PlayHand',selectedIds:fixture.state.handOrder.slice(0,5)});
}
const continued=()=>send(won(),{type:'ContinueEndless'});
function raw(fixture:Fixture):Checkpoint {
  const payload={format:'dachoupai-checkpoint' as const,formatVersion:1 as const,state:structuredClone(fixture.state),journalBaseSeq:fixture.state.commandSeq-fixture.journal.length,journal:structuredClone(fixture.journal)};
  return {...payload,checksum:stableHash(payload)};
}
function damaged(fixture:Fixture,change:(state:R2RunState)=>void):Checkpoint {
  const checkpoint=raw(fixture);change(checkpoint.state);const {checksum,...payload}=checkpoint;return {...payload,checksum:stableHash(payload)};
}
function roundTrip(fixture:Fixture):Checkpoint {
  const before=stateHash(fixture.state),checkpoint=makeCheckpoint(fixture.state,fixture.journal),parsed=readCheckpoint(JSON.parse(JSON.stringify(checkpoint)));
  expect(parsed.ok).toBe(true);if(!parsed.ok)throw Error(parsed.code);
  expect(parsed.checkpoint.state).toEqual(fixture.state);expect(stateHash(fixture.state)).toBe(before);return parsed.checkpoint;
}
class MemoryStore implements SaveStore {
  slots:SaveSlots={revision:0,current:null,previous:null};fail=false;attempts:Checkpoint[]=[];
  async read(){return structuredClone(this.slots);}
  async commit(revision:number,current:Checkpoint,previous:Checkpoint|null){
    this.attempts.push(structuredClone(current));if(this.fail)throw new DOMException('quota','QuotaExceededError');
    if(revision!==this.slots.revision)throw Error('write-conflict');
    this.slots={revision:revision+1,current:structuredClone(current),previous:structuredClone(previous)};return this.slots.revision;
  }
}

describe('C03 D30 explicit v9 endless qualification and checkpoint boundary',()=>{
  it('keeps the exact genuine v8 raw export and refuses to fill its new eligibility fields',()=>{
    expect(rawV8.state.contentVersion).toBe('quality-r2-content-v8');expect(rawV8.checksum).toBe('json-fnv-v1:a403a45173486bad');expect(rawV8.state.commandSeq).toBe(3);
    const before=JSON.stringify(rawV8);expect(readCheckpoint(rawV8)).toEqual({ok:false,code:'incompatible-version'});
    const slots=restoreSlots({revision:4,current:rawV8,previous:null});expect(slots.status).toBe('invalid');expect(slots.raw).toBe(rawV8);expect(JSON.stringify(rawV8)).toBe(before);
  });
  it('starts explicitly normal with no completion and requires both persisted fields',()=>{
    const fixture=start();expect(fixture.state.contentVersion).toBe('quality-r2-content-v10');expect(fixture.state).toMatchObject({tourMode:'normal',normalCompletion:null});roundTrip(fixture);
    for(const field of ['tourMode','normalCompletion'])expect(readCheckpoint(damaged(fixture,state=>{delete object(state)[field];})).ok).toBe(false);
  });
  it('captures qualification from a real final normal Play and preserves the independent literal score',()=>{
    const fixture=won();
    // Lv30 flush-five: H4100/2 + ten Ace passes*11 = 2160; M44*(3/2)^10. No rule draws.
    expect(fixture.state.lastTrace!.finalScore).toBe('5480485');
    expect(fixture.state).toMatchObject({tourMode:'normal',phase:'run-won',stageIndex:24,chapter:8,totalHeat:'5481485',gold:17,
      normalCompletion:{clearId:'c03-endless-save/clear/23',totalHeat:'5481485'}});roundTrip(fixture);
  });
  it('exporting, inspecting and recovering normal victory does not implicitly continue or award again',()=>{
    const fixture=won(),before=stateHash(fixture.state),checkpoint=roundTrip(fixture),restored=restoreSlots({revision:1,current:checkpoint,previous:null});
    expect(restored.status).toBe('current');expect(restored.checkpoint!.state.phase).toBe('run-won');expect(stateHash(fixture.state)).toBe(before);
  });
  it.each(['missing','wrong-run','wrong-stage','wrong-total','extra-field'] as const)('rejects normal victory completion %s',kind=>{
    const fixture=won();
    expect(readCheckpoint(damaged(fixture,state=>{
      if(kind==='missing')state.normalCompletion=null;
      else if(kind==='wrong-run')state.normalCompletion!.clearId='another-run/clear/23';
      else if(kind==='wrong-stage')state.normalCompletion!.clearId=`${state.runId}/clear/22`;
      else if(kind==='wrong-total')state.normalCompletion!.totalHeat='5481484';
      else object(state.normalCompletion).once=true;
    })).ok).toBe(false);
  });
  it('rejects qualification added before real normal victory and mixed normal chapter nine',()=>{
    const fixture=start();roundTrip(fixture);
    for(const change of [(state:R2RunState)=>{state.normalCompletion={clearId:`${state.runId}/clear/23`,totalHeat:'0'};},(state:R2RunState)=>{object(state).tourMode='challenge';},(state:R2RunState)=>{state.chapter=9;state.stageIndex=24;state.seenBossIds.push('B05');}])expect(readCheckpoint(damaged(fixture,change)).ok).toBe(false);
  });
  it('continues through one real command while retaining old stage/trace, resources and normal completion',()=>{
    const normal=won(),stage=structuredClone(normal.state.stage),trace=structuredClone(normal.state.lastTrace),rng=structuredClone(normal.state.rng),next=send(normal,{type:'ContinueEndless'});
    expect(next.state).toMatchObject({tourMode:'endless',phase:'shop',stageIndex:24,chapter:9,gold:17,totalHeat:'5481485',normalCompletion:normal.state.normalCompletion});
    expect(next.state.stage).toEqual(stage);expect(next.state.lastTrace).toEqual(trace);expect(next.state.deckInstances).toEqual(normal.state.deckInstances);
    expect(next.state.rng.deck).toEqual(rng.deck);expect(next.state.boss.definitionId).not.toBe(stage!.boss!.definitionId);expect(next.state.seenBossIds).toHaveLength(9);roundTrip(next);
    expect(readCheckpoint(damaged(next,state=>{state.lastTrace!.bossContext.boss={...state.boss};})).ok).toBe(false);
  });
  it('does not re-lock a chapter or consume resources for duplicate/new-ID second continuation',()=>{
    const fixture=won(),cmd=command(fixture.state,{type:'ContinueEndless'}),first=applyCommand(fixture.state,cmd);expect(first.ok).toBe(true);if(!first.ok)return;
    const before=stateHash(first.state),duplicate=applyCommand(first.state,cmd);
    expect(duplicate).toMatchObject({ok:true,duplicate:true,events:[]});expect(duplicate.state).toBe(first.state);
    const second=applyCommand(first.state,{...cmd,commandId:'c03/continue-again',expectedSeq:first.state.commandSeq});
    expect(second.ok).toBe(false);expect(second.state).toBe(first.state);expect(stateHash(first.state)).toBe(before);
  });
  it('restores the same locked shelf/Boss/RNG and begins stage24 with its explicit 384000 target',()=>{
    const fixture=continued(),checkpoint=roundTrip(fixture),restored={state:checkpoint.state,journal:checkpoint.journal};
    const direct=send(send(fixture,{type:'LeaveShop'}),{type:'EnterStage'}),resumed=send(send(restored,{type:'LeaveShop'}),{type:'EnterStage'});
    expect(resumed.state).toEqual(direct.state);expect(resumed.state.stage).toMatchObject({index:24,targetHeat:'384000',initialTargetHeat:'384000',boss:null});expect(resumed.state.lastTrace).toBeNull();roundTrip(resumed);
    expect(readCheckpoint(damaged(resumed,state=>{state.stage!.initialTargetHeat='384001';state.stage!.targetHeat='384001';})).ok).toBe(false);
  });
  it.each(['missing','future-total','wrong-run','early-index','early-chapter','extra-field'] as const)('rejects endless qualification %s',kind=>{
    const fixture=continued();
    expect(readCheckpoint(damaged(fixture,state=>{
      if(kind==='missing')state.normalCompletion=null;
      else if(kind==='future-total')state.normalCompletion!.totalHeat='5481486';
      else if(kind==='wrong-run')state.normalCompletion!.clearId='another-run/clear/23';
      else if(kind==='early-index')state.stageIndex=23;
      else if(kind==='early-chapter')state.chapter=8;
      else object(state).endlessEligible=true;
    })).ok).toBe(false);
  });
  it('keeps normal qualification after an actual endless failure without increasing total heat',()=>{
    let fixture=send(send(continued(),{type:'LeaveShop'}),{type:'EnterStage'});const completion=structuredClone(fixture.state.normalCompletion);
    for(let hand=0;hand<4;hand++){
      const id=fixture.state.handOrder[0],card=fixture.state.deckInstances.find(card=>card.id===id)!;card.rank=2;delete card.enhancement;card.edition='none';
      fixture=send(fixture,{type:'PlayHand',selectedIds:[id]});
    }
    expect(fixture.state).toMatchObject({tourMode:'endless',phase:'run-lost',totalHeat:'5481485',normalCompletion:completion});roundTrip(fixture);
  });
  it('accepts finite chapter/coupon/history/shop/stage maximums only in explicit endless mode',()=>{
    let fixture=send(continued(),{type:'LeaveShop'});
    Object.assign(fixture.state,{chapter:10766,stageIndex:32297,stage:null,lastTrace:null,shop:null,boss:{definitionId:'B01',disabledSuit:null},purchaseCoupons:10766,
      seenBossIds:['B01','B02','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12','B13','B14','B15','B16',...Array<string>(10750).fill('B01')]});
    fixture=send(fixture,{type:'EnterStage'});expect(fixture.state.stage!.initialTargetHeat).toHaveLength(4096);roundTrip(fixture);
    for(const change of [(state:R2RunState)=>{state.chapter++;},(state:R2RunState)=>{state.stageIndex=32299;},(state:R2RunState)=>{state.purchaseCoupons++;},(state:R2RunState)=>{state.tourMode='normal';}])expect(readCheckpoint(damaged(fixture,change)).ok).toBe(false);
    const withShop=continued();withShop.state.purchaseCoupons=9;roundTrip(withShop);
  });
  it('retries an unsaved continuation as exactly the same candidate without re-drawing or awarding',async()=>{
    const fixture=won(),store=new MemoryStore(),run=await SavedRun.import(store,makeCheckpoint(fixture.state,fixture.journal),await store.read());
    const original=stateHash(run.state),slots=await store.read(),cmd=command(run.state,{type:'ContinueEndless'});store.fail=true;
    expect(await run.submit(cmd)).toMatchObject({ok:false,code:'save-failed'});expect(stateHash(run.state)).toBe(original);expect(await store.read()).toEqual(slots);
    const candidate=JSON.parse(run.exportJSON()) as Checkpoint;expect(readCheckpoint(candidate).ok).toBe(true);expect(candidate.state.tourMode).toBe('endless');
    const attempts=store.attempts.length;store.fail=false;const retries=await Promise.all([run.retry(),run.retry()]);
    expect(retries.filter(result=>result.ok)).toHaveLength(1);expect(store.attempts).toHaveLength(attempts+1);expect(store.attempts.at(-1)).toEqual(candidate);expect(run.state).toEqual(candidate.state);
    const restored=SavedRun.restore(store,await store.read()),hash=stateHash(restored.state);
    expect(await restored.submit(cmd)).toMatchObject({ok:true,duplicate:true,events:[]});expect(stateHash(restored.state)).toBe(hash);expect(restored.state.normalCompletion).toEqual(fixture.state.normalCompletion);
  });
});
