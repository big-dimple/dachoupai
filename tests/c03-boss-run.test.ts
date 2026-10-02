import {describe,expect,it} from 'vitest';
import {applyCommand,assertRunInvariants,createRun,stateHash,type Action,type Command,type R2RunState} from '../src/domain/run';
import {r2CreateJoker,r2HandLimit,r2HandsBudget} from '../src/domain/r2Run';
import {R2_BOSSES,type R2NominalBossId} from '../src/domain/r2Chapter';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';

const command=(state:R2RunState,action:Action):Command=>({runId:state.runId,commandId:`c03-run/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
const send=(state:R2RunState,action:Action):R2RunState=>{
  const result=applyCommand(state,command(state,action));
  expect(result.ok,result.ok?'':result.code).toBe(true);if(!result.ok)throw Error(result.code);
  assertRunInvariants(result.state);return result.state;
};

function beforeBoss(id:R2NominalBossId,jokerIds:readonly string[]=[],characterId:R2RunState['characterId']='erxiang'):R2RunState {
  const boss=R2_BOSSES.find(definition=>definition.id===id);if(!boss)throw Error(`missing-boss:${id}`);
  const state=createRun({seed:`c03/${id}`,runId:`c03/${id}`,characterId,rulesVersion:'r2'});
  // Explicit valid late-chapter checkpoint boundary, not a natural acquisition or balance result.
  state.chapter=Number(id.slice(1))>=13?7:3;state.stageIndex=state.chapter*3-1;
  state.seenBossIds=state.chapter===7?['B01','B02','B03','B04','B05','B06',id]:['B01','B02',id];
  state.boss={definitionId:boss.id,disabledSuit:null};state.shop!.visitIndex=state.stageIndex;
  state.phase='stage-ready';state.stage=null;state.handOrder=[];state.playedPile=[];state.discardPile=[];
  state.deckInstances=Array.from({length:20},(_,i)=>({id:`card/${i}`,rank:2 as const,suit:'spades' as const}));
  state.drawPile=state.deckInstances.map(card=>card.id);state.jokers=jokerIds.map(id=>r2CreateJoker(id,`owned/${id}`,4));
  return state;
}
const table=(id:R2NominalBossId,jokerIds:readonly string[]=[],characterId:R2RunState['characterId']='erxiang')=>send(beforeBoss(id,jokerIds,characterId),{type:'EnterStage'});

function rejected(state:R2RunState,action:Action,code:string):void {
  const hash=stateHash(state),rng=structuredClone(state.rng),result=applyCommand(state,command(state,action));
  expect(result.ok).toBe(false);if(result.ok)return;expect(result.code).toBe(code);
  expect(result.state).toBe(state);expect(stateHash(state)).toBe(hash);expect(state.rng).toEqual(rng);
}

describe('C03 Boss resources use the same atomic command path',()=>{
  it.each(['B03','B04'] as const)('%s keeps legally playable all-disabled cards eligible for F07 rescue',id=>{
    const ready=beforeBoss(id,['f07']);
    if(id==='B03')ready.boss.disabledSuit='spades';
    else for(const card of ready.deckInstances)card.rank=12;
    let state=send(ready,{type:'EnterStage'});
    for(let play=0;play<4;play++){
      expect(state.stage!.disabledIds).toEqual(state.handOrder);
      const rule=structuredClone(state.rng.rule);
      state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
      expect(state.lastTrace!.finalScore).toBe('20');expect(state.rng.rule).toEqual(rule);
    }
    expect(state.phase).toBe('await-input');expect(state.stage).toMatchObject({playIndex:4,handsLeft:1,rescueUsed:true});
    expect(state.safetyNetUsed).toBe(true);expect(state.jokers).toEqual([]);
    expect(state.lastTrace!.events.filter(event=>event.operation==='rescue-hand')).toHaveLength(1);
    expect(readCheckpoint(makeCheckpoint(state,[])).ok).toBe(true);
    state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
    expect(state.phase).toBe('run-lost');expect(state.stage!.playIndex).toBe(5);expect(state.lastTrace!.finalScore).toBe('20');
  });
  it('B07 cannot borrow an A07 future refund to pay its discard fee',()=>{
    const state=table('B07',['a07']);state.gold=0;
    rejected(state,{type:'DiscardHand',selectedIds:[state.handOrder[0]]},'not-enough-gold');
  });
  it('B07 charges once before A07 refund; a repeated command never charges again',()=>{
    const state=table('B07',['a07']);state.gold=1;
    const cmd=command(state,{type:'DiscardHand',selectedIds:[state.handOrder[0]]}),result=applyCommand(state,cmd);
    expect(result.ok,result.ok?'':result.code).toBe(true);if(!result.ok)return;
    assertRunInvariants(result.state);expect(result.state.gold).toBe(1);
    expect(result.state.stage).toMatchObject({discardsLeft:2,discardsUsed:1,handsLeft:4});
    const charge=result.events.findIndex(event=>event.type==='boss-transaction');
    const refund=result.events.findIndex(event=>event.type==='joker-transaction'&&event.definitionId==='a07');
    expect(charge).toBeGreaterThanOrEqual(0);expect(charge).toBeLessThan(refund);
    const retry=applyCommand(result.state,cmd);expect(retry.ok&&retry.duplicate).toBe(true);expect(retry.state).toBe(result.state);
  });
  it('B08 refuses both enabling and bypassing the character wager without a rule draw',()=>{
    const state=table('B08',[],'touye');
    rejected(state,{type:'SetWager',enabled:true},'wager-disabled-by-boss');
    const next=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
    expect(next.lastTrace!.events.some(event=>event.sourceType==='character')).toBe(false);
    expect(next.lastTrace!.finalScore).toBe('22');expect(next.rng.rule).toEqual(state.rng.rule);
  });
  it.each([[[],0,6],[['U01'],0,7],[[],2,5]] as const)('B10 applies -2 before the hand clamp, items=%j penalty=%i',(items,penalty,expected)=>{
    const state=beforeBoss('B10');state.longTermItems=[...items];state.spectralModifiers.handPenalty=penalty;
    expect(r2HandLimit(state)).toBe(expected);
    const entered=send(state,{type:'EnterStage'});expect(entered.stage).toMatchObject({initialHandLimit:expected,handLimit:expected});
    expect(entered.handOrder).toHaveLength(expected);
  });
  it('B10 preserves static Joker capacity, and ordinary stages ignore the chapter Boss',()=>{
    const state=beforeBoss('B10',['d06']);state.longTermItems=['U01'];expect(r2HandLimit(state)).toBe(8);
    state.stageIndex=6;state.shop!.visitIndex=6;expect(r2HandLimit(state)).toBe(10);
    const entered=send(state,{type:'EnterStage'});expect(entered.stage!.boss).toBeNull();expect(entered.handOrder).toHaveLength(10);
  });
  it.each([[[],0,3],[['U03'],0,4],[['U03'],1,3],[[],2,2]] as const)('B09 applies -1 with the existing floor, items=%j penalty=%i',(items,penalty,expected)=>{
    const state=beforeBoss('B09');state.longTermItems=[...items];state.spectralModifiers.handsPenalty=penalty;
    expect(r2HandsBudget(state)).toBe(expected);
    const entered=send(state,{type:'EnterStage'});expect(entered.stage).toMatchObject({initialHands:expected,handsLeft:expected});
  });
  it('B11 reduces only later refills and never deletes a held card',()=>{
    let state=table('B11');
    for(const expected of [7,6,5]){
      const held=state.handOrder.slice(1),beforeIds=state.deckInstances.map(card=>card.id);
      state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
      expect(state.stage).toMatchObject({initialHandLimit:8,handLimit:expected});
      expect(state.handOrder).toEqual(held);expect(state.handOrder).toHaveLength(expected);
      expect(state.deckInstances.map(card=>card.id)).toEqual(beforeIds);
    }
    const ids=state.handOrder.slice(0,2);state=send(state,{type:'DiscardHand',selectedIds:ids});
    expect(state.handOrder).toHaveLength(5);expect(state.stage!.handLimit).toBe(5);
  });
  it('B14 adds a fixed initial-target 5% for each successful discard, including a refund',()=>{
    let state=table('B14',['d05']);expect(state.stage!.targetHeat).toBe('140000');
    const cmd=command(state,{type:'DiscardHand',selectedIds:state.handOrder.slice(0,2)}),first=applyCommand(state,cmd);
    expect(first.ok,first.ok?'':first.code).toBe(true);if(!first.ok)return;state=first.state;assertRunInvariants(state);
    expect(state.stage).toMatchObject({initialTargetHeat:'140000',targetHeat:'147000',discardsUsed:1,discardsLeft:3,discardGained:1});
    const retry=applyCommand(state,cmd);expect(retry.ok&&retry.duplicate).toBe(true);expect(retry.state).toBe(state);
    rejected(state,{type:'DiscardHand',selectedIds:['missing']},'unknown-card');
    state=send(state,{type:'DiscardHand',selectedIds:[state.handOrder[0]]});expect(state.stage!.targetHeat).toBe('154000');
    expect(state.rng.rule).toEqual(first.state.rng.rule);
  });
  it('B15 seals instance identities for the next hand, even after a reorder',()=>{
    let state=table('B15',['pengci','e04']);const initialIds=state.jokers.map(joker=>joker.instanceId);
    state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
    expect(state.lastTrace!.finalScore).toBe('66');expect(state.lastTrace!.bossContext.sealedJokerIds).toEqual([]);
    expect(state.stage!.sealedJokerIds).toEqual(['owned/pengci']);
    state=send(state,{type:'ReorderJokers',ids:['owned/e04','owned/pengci']});
    state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
    expect(state.lastTrace!.finalScore).toBe('22');expect(state.lastTrace!.bossContext.sealedJokerIds).toEqual(['owned/pengci']);
    expect(state.stage!.sealedJokerIds).toEqual(['owned/pengci','owned/e04']);expect(state.stage!.initialJokerIds).toEqual(initialIds);
  });
  it('B15 does not seal an expired left Joker and includes a legal Shop S06 newcomer',()=>{
    let state=beforeBoss('B15',['f06']);state.phase='shop';state.jokers[0].counters={handsScored:3};
    state.consumables=[{instanceId:'reward-tool',definitionId:'S06'}];
    state=send(state,{type:'UseConsumable',instanceId:'reward-tool',targetIds:[]});const newcomer=state.jokers[1].instanceId;
    state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
    expect(state.stage!.initialJokerIds).toEqual(['owned/f06',newcomer]);
    state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
    expect(state.jokers.some(joker=>joker.instanceId==='owned/f06')).toBe(false);
    expect(state.stage!.sealedJokerIds).toEqual([newcomer]);
    const seal=state.lastTrace!.events.find(event=>event.operation==='seal-joker');expect(seal?.targetJokerInstanceId).toBe(newcomer);
    expect(state.lastTrace!.events.findIndex(event=>event.operation==='destroy-joker')).toBeLessThan(state.lastTrace!.events.findIndex(event=>event.operation==='seal-joker'));
  });
  it('B15 records a real winning-hand seal before clear rewards and resets it next stage',()=>{
    let state=table('B15',['pengci']);state.stage!.heat='139999';
    state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});expect(state.phase).toBe('stage-cleared');
    expect(state.stage!.sealedJokerIds).toEqual(['owned/pengci']);
    const seal=state.lastTrace!.events.findIndex(event=>event.operation==='seal-joker');
    expect(seal).toBeGreaterThanOrEqual(0);expect(seal).toBeLessThan(state.lastTrace!.events.findIndex(event=>event.phase==='onStageClear'));
    const trace=structuredClone(state.lastTrace),boss=structuredClone(state.stage!.boss);
    state=send(state,{type:'OpenShop'});expect(state.lastTrace).toEqual(trace);expect(state.stage!.boss).toEqual(boss);
    state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});expect(state.stage!.boss).toBeNull();expect(state.stage!.sealedJokerIds).toEqual([]);
  });
  it('sealed F07 still rescues failure once and is never sealed again after its destruction',()=>{
    let state=table('B15',['f07','pengci']);
    for(let n=0;n<4;n++)state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
    expect(state.phase).toBe('await-input');expect(state.stage).toMatchObject({handsLeft:1,rescueUsed:true});
    expect(state.safetyNetUsed).toBe(true);expect(state.jokers.some(joker=>joker.definitionId==='f07')).toBe(false);
    expect(state.stage!.sealedJokerIds).toEqual(['owned/f07','owned/pengci']);
    expect(state.lastTrace!.events.filter(event=>event.operation==='seal-joker')).toEqual([]);
  });
});
