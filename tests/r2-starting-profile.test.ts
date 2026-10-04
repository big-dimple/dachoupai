import {describe,expect,it} from 'vitest';
import {applyCommand,assertRunInvariants,createRun,stateHash,type Action,type R2RunState} from '../src/domain/run';
import {CHARACTER_IDS,type CharacterId} from '../src/domain/characters';
import {R2_HAND_TYPES} from '../src/domain/evaluateR2';
import {previewR2Hand} from '../src/domain/scoreR2';
import {r2ScoreContext,R2_LEGACY_CONTENT_VERSION,R2_LEGACY_CONTENT_HASH} from '../src/domain/r2Run';
import {r2Price} from '../src/domain/r2Shop';
import {R2_JOKERS} from '../src/content/r2Schema';
import {makeCheckpoint,readCheckpoint,restoreSlots} from '../src/application/checkpoint';
import {stableHash} from '../src/domain/hash';

const K_HAND=['spades-13','clubs-2','diamonds-4','hearts-6','clubs-8','diamonds-10','spades-3','hearts-5'];
const HELD_FACES=['spades-13','clubs-11','diamonds-12','hearts-13','spades-11','hearts-2','clubs-4','diamonds-6'];
const start=(characterId:CharacterId='amo')=>createRun({seed:'p02-starting-profile',characterId,runId:`p02/${characterId}`,rulesVersion:'r2'});
function send(state:R2RunState,action:Action):R2RunState {
  const result=applyCommand(state,{runId:state.runId,commandId:`c-${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
  if(!result.ok)throw new Error(result.code);
  assertRunInvariants(result.state);return result.state;
}
function enter(state=start(),ids:readonly string[]=K_HAND,joker?:'pengci'|'d01'):R2RunState {
  if(joker)state.jokers=[{instanceId:`owned/${joker}`,definitionId:joker,paidPrice:r2Price(joker),growth:{}}];
  const table=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
  // An invariant-valid card/equipment checkpoint, not a shop availability or balance claim.
  table.handOrder=[...ids];table.drawPile=table.deckInstances.filter(card=>!ids.includes(card.id)).map(card=>card.id);
  assertRunInvariants(table);return table;
}
function restore(state:R2RunState):R2RunState {
  const result=readCheckpoint(JSON.parse(JSON.stringify(makeCheckpoint(state,[]))));
  if(!result.ok)throw new Error(result.code);
  expect(result.checkpoint.state).toEqual(state);return result.checkpoint.state;
}
function previewAndSubmit(state:R2RunState,selectedIds:readonly string[]):R2RunState {
  const hand=state.handOrder.map(id=>state.deckInstances.find(card=>card.id===id)!);
  const before=stateHash(state),stage=state.stage!;
  const preview=previewR2Hand({rulesVersion:'r2',runId:state.runId,rootId:'public-preview',
    hand,selectedIds,disabledIds:stage.disabledIds,jokers:state.jokers,definitions:R2_JOKERS,handLevels:state.handLevels,
    playIndex:stage.playIndex+1,handsBeforePlay:stage.handsLeft,previousHandType:stage.previousHandType,wager:stage.wagerSelected,
    ...r2ScoreContext(state,hand,selectedIds)});
  expect(stateHash(state)).toBe(before);
  const submitted=send(state,{type:'PlayHand',selectedIds}),trace=submitted.lastTrace!;
  expect(preview.possibleScores).toEqual([trace.finalScore]);expect(preview.level).toBe(trace.level);expect(preview.sets).toEqual(trace.sets);
  expect(stateHash(state)).toBe(before);return submitted;
}

describe('P02 starting profile: independent D14 goldens through public commands',()=>{
  it('keeps Amo at discovered high-card Lv3 in explicit v7, with every other hand at Lv1',()=>{
    const run=start();assertRunInvariants(run);
    expect(run.handLevels['high-card']).toBe(3);
    for(const type of R2_HAND_TYPES.filter(type=>type!=='high-card'))expect(run.handLevels[type]??1).toBe(1);
    expect(Object.hasOwn(run.handLevels,'high-card')).toBe(true);
    expect(run.contentVersion).toBe('quality-r2-content-v11');
    expect(run.contentHash).not.toBe('json-fnv-v1:a1f6f62ddd627819');
  });

  it('keeps all five other characters and all their hand types at effective Lv1',()=>{
    for(const characterId of CHARACTER_IDS.filter(id=>id!=='amo')){
      const run=start(characterId);assertRunInvariants(run);
      for(const type of R2_HAND_TYPES)expect(run.handLevels[type]??1,`${characterId}/${type}`).toBe(1);
    }
  });

  it.each([
    {name:'single K',ids:K_HAND,joker:undefined,score:'225',multiplier:{n:'9',d:'2'}},
    {name:'single K with Pengci',ids:K_HAND,joker:'pengci' as const,score:'525',multiplier:{n:'21',d:'2'}},
    {name:'single K with four held faces and D01',ids:HELD_FACES,joker:'d01' as const,score:'525',multiplier:{n:'21',d:'2'}},
  ])('$name: preview equals submitted $score, with held effects before the character',({ids,joker,score,multiplier})=>{
    const result=previewAndSubmit(enter(start(),ids,joker),['spades-13']),trace=result.lastTrace!;
    // Lv3: base 40H / 3/2M; K adds 10H. D01 adds four 1/2M before Amo multiplies by 3; New-rule Pengci adds 2M before Amo; legacy behavior is frozen separately.
    expect(trace.finalScore).toBe(score);expect(trace.level).toBe(3);
    expect(trace.events[0].after).toEqual({H:{n:'40',d:'1'},M:{n:'3',d:'2'}});
    expect(trace.accumulator).toEqual({H:{n:'50',d:'1'},M:multiplier});
    const roleIndex=trace.events.findIndex(event=>event.sourceType==='character');
    expect(roleIndex).toBeGreaterThan(0);
    if(joker==='d01'){
      const held=trace.events.filter(event=>event.sourceDefinitionId==='d01');
      expect(held.map(event=>event.targetCardId)).toEqual(HELD_FACES.slice(1,5));
      expect(held.every(event=>event.phase==='onHeldCard'&&trace.events.indexOf(event)<roleIndex)).toBe(true);
      expect(trace.events[roleIndex].before.M).toEqual({n:'7',d:'2'});
    }else if(joker==='pengci')expect(trace.events.findIndex(event=>event.sourceDefinitionId==='pengci')).toBeLessThan(roleIndex);
  });

  it('preserves explicit Lv1 G07/G08 at 90 and 150, with the global level curve unchanged',()=>{
    for(const [joker,score,multiplier] of [[undefined,'90','3'],['pengci','150','5']] as const){
      const state=enter(start(),K_HAND,joker);state.contentVersion=R2_LEGACY_CONTENT_VERSION;state.contentHash=R2_LEGACY_CONTENT_HASH;state.handLevels['high-card']=1;
      const trace=previewAndSubmit(state,['spades-13']).lastTrace!;
      expect(trace.finalScore).toBe(score);expect(trace.level).toBe(1);
      expect(trace.events[0].after).toEqual({H:{n:'20',d:'1'},M:{n:'1',d:'1'}});
      expect(trace.accumulator).toEqual({H:{n:'30',d:'1'},M:{n:multiplier,d:'1'}});
    }
  });

  it('never grants Amo ×3 for two played cards even when only K scores',()=>{
    const trace=previewAndSubmit(enter(),['spades-13','clubs-2']).lastTrace!;
    expect(trace.sets.playedIds).toEqual(['spades-13','clubs-2']);expect(trace.sets.activeScoringIds).toEqual(['spades-13']);
    expect(trace.events.filter(event=>event.sourceType==='character')).toEqual([]);
    expect(trace.finalScore).toBe('75');
  });

  it('keeps the Lv3 starting profile through a command-driven fixture clear, next stage and checkpoint restore',()=>{
    const flush=['hearts-10','hearts-11','hearts-12','hearts-13','hearts-14','clubs-2','diamonds-4','spades-6'];
    let run=previewAndSubmit(enter(start(),flush),flush.slice(0,5));expect(run.phase).toBe('stage-cleared');
    run=send(send(send(restore(run),{type:'OpenShop'}),{type:'LeaveShop'}),{type:'EnterStage'});
    run=restore(run);expect(run.stageIndex).toBe(1);expect(run.phase).toBe('await-input');
    expect(run.handLevels['high-card']).toBe(3);expect(run.handLevels['straight-flush']).toBe(1);
  });

  it('allows T01 before the first play to upgrade the discovered high-card from Lv3 to Lv4, surviving restore and entry',()=>{
    let run=start();run.consumables=[{instanceId:'level-up',definitionId:'T01'}];
    const rng=structuredClone(run.rng);
    run=send(run,{type:'UseConsumable',instanceId:'level-up',targetIds:[],handType:'high-card'});
    expect(run.handLevels['high-card']).toBe(4);expect(run.consumables).toEqual([]);expect(run.rng).toEqual(rng);
    run=previewAndSubmit(enter(restore(run)),['spades-13']);
    expect(run.lastTrace!.level).toBe(4);expect(run.lastTrace!.finalScore).toBe('315');
    expect(run.lastTrace!.events[0].after).toEqual({H:{n:'50',d:'1'},M:{n:'7',d:'4'}});
    expect(restore(run).handLevels['high-card']).toBe(4);
  });

  it('rejects a reconstructed v3 checkpoint with its fixed historical hash, retaining the exact raw input',()=>{
    // Reconstructed empty-level v3 checkpoint with the pinned P00/P01 hash; not an exported historical save or a replay promise.
    const legacy=structuredClone(makeCheckpoint(start(),[]));
    legacy.state.contentVersion='quality-r2-graybox-v3';legacy.state.contentHash='json-fnv-v1:a1f6f62ddd627819';legacy.state.handLevels={};
    const {checksum:unusedChecksum,...payload}=legacy;legacy.checksum=stableHash(payload);
    const raw=JSON.parse(JSON.stringify(legacy)),before=JSON.stringify(raw);
    const read=readCheckpoint(raw),restored=restoreSlots({revision:1,current:raw,previous:null});
    expect(read.ok).toBe(false);if(!read.ok)expect(read.code).toBe('incompatible-version');
    expect(restored.status).toBe('invalid');expect(restored.code).toBe('incompatible-version');
    expect(restored.raw).toBe(raw);expect(JSON.stringify(raw)).toBe(before);
  });
});
