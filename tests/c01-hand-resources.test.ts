import {describe,expect,it} from 'vitest';
import {applyCommand,createRun,stateHash,type Action,type R2RunState} from '../src/domain/run';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import type {ScoreTrace} from '../src/domain/scoreR2';

const command=(state:R2RunState,action:Action)=>({runId:state.runId,commandId:`resources/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
function send(state:R2RunState,action:Action):R2RunState {
  const result=applyCommand(state,command(state,action));if(!result.ok)throw Error(result.code);return result.state;
}
function table():R2RunState {
  return send(send(createRun({seed:'c01-resource-entry',runId:'c01-resources',characterId:'erxiang',rulesVersion:'r2'}),{type:'LeaveShop'}),{type:'EnterStage'});
}
// Explicit domain fixtures after natural phase entry. Scores and RNG vectors are independent D24 goldens.
function lucky():R2RunState {
  const state=table(),id=state.handOrder[0],card=state.deckInstances.find(c=>c.id===id)!;
  card.rank=2;card.enhancement='lucky-paper';state.gold=19;
  state.rng.rule={algorithm:'fnv1a-mulberry32-v1',state:2068216773};return state;
}
const play=(state:R2RunState)=>({type:'PlayHand',selectedIds:[state.handOrder[0]]} as const);

describe('C01 committed hand resource and permanent lifecycle integration',()=>{
  it('pays lucky gold exactly once in a losing hand and restores the committed result',()=>{
    const before=lucky();before.stage!.handsLeft=1;before.stage!.playIndex=3;
    const cmd=command(before,play(before)),result=applyCommand(before,cmd);expect(result.ok).toBe(true);if(!result.ok)return;
    const state=result.state,trace=state.lastTrace as ScoreTrace&{goldDelta:number};
    expect(state.phase).toBe('run-lost');expect(trace.finalScore).toBe('110');expect(trace.goldDelta).toBe(10);
    expect(state.gold).toBe(29);expect(state.stage!.goldEarned).toBe(0);expect(state.rng.rule.state).toBe(1436381103);
    const restored=readCheckpoint(makeCheckpoint(state,[cmd]));expect(restored.ok&&restored.checkpoint.state).toEqual(state);
    const duplicate=applyCommand(state,cmd);expect(duplicate.ok&&duplicate.duplicate).toBe(true);expect(duplicate.state).toBe(state);
    expect(duplicate.ok&&duplicate.events).toEqual([]);expect(state.gold).toBe(29);
  });
  it('includes lucky income in clear interest in the same committed hand',()=>{
    const before=lucky();before.stage!.heat='290';
    const state=send(before,play(before));expect(state.lastTrace!.finalScore).toBe('110');
    expect(state.stage!.heat).toBe('400');expect(state.phase).toBe('stage-cleared');
    expect(state.gold).toBe(41);expect(state.stage!.goldEarned).toBe(12);
    expect(before.gold).toBe(19);expect(before.stage!.heat).toBe('290');
  });
  it('awards at most five active held gold papers after calculating clear interest',()=>{
    const before=table(),selected=before.deckInstances.find(c=>c.id===before.handOrder[0])!;selected.rank=2;
    for(const id of before.handOrder.slice(1))before.deckInstances.find(c=>c.id===id)!.enhancement='gold-paper';
    before.stage!.heat='379';before.gold=19;
    const state=send(before,play(before));expect(state.lastTrace!.finalScore).toBe('22');
    expect(state.phase).toBe('stage-cleared');expect(state.gold).toBe(34);expect(state.stage!.goldEarned).toBe(15);
    const grants=state.lastTrace!.events.filter(e=>e.phase==='onStageClear'&&e.sourceType==='card'&&e.operation==='add-gold');
    expect(grants).toHaveLength(5);expect(grants.map(e=>e.targetCardId)).toEqual(before.handOrder.slice(1,6));
    expect(grants.every(e=>JSON.stringify(e.before)===JSON.stringify(e.after))).toBe(true);
    expect(readCheckpoint(makeCheckpoint(state,[])).ok).toBe(true);
  });
  it('breaks the original glass instance after score, removes its played zone and preserves start sources',()=>{
    const before=table(),id=before.handOrder[0],card=before.deckInstances.find(c=>c.id===id)!;
    card.rank=2;card.enhancement='glass-paper';before.rng.rule={algorithm:'fnv1a-mulberry32-v1',state:1413661181};
    const state=send(before,play(before)),trace=state.lastTrace as ScoreTrace&{destroyedCardIds:string[];cards:typeof state.deckInstances};
    expect(trace.finalScore).toBe('33');expect(trace.destroyedCardIds).toEqual([id]);expect(state.destroyedIds).toEqual([id]);
    expect(state.playedPile).not.toContain(id);expect([...state.handOrder,...state.drawPile,...state.discardPile]).not.toContain(id);
    expect(state.handOrder).toHaveLength(8);expect(state.deckInstances.length-state.destroyedIds.length).toBe(51);
    expect(trace.cards.find(c=>c.id===id)?.enhancement).toBe('glass-paper');expect(state.rng.rule.state).toBe(3245226994);
    expect(readCheckpoint(makeCheckpoint(state,[])).ok).toBe(true);expect(before.destroyedIds).toEqual([]);
  });
  it('allows post-hand glass destruction below the manual deletion floor without hidden immunity',()=>{
    const before=table(),active=new Set([...before.handOrder,...before.drawPile.slice(0,12)]);
    before.destroyedIds=before.deckInstances.filter(c=>!active.has(c.id)).map(c=>c.id);
    before.drawPile=before.drawPile.filter(id=>active.has(id));
    const id=before.handOrder[0],card=before.deckInstances.find(c=>c.id===id)!;card.rank=2;card.enhancement='glass-paper';
    before.rng.rule={algorithm:'fnv1a-mulberry32-v1',state:1413661181};const hash=stateHash(before);
    const state=send(before,play(before));expect(state.deckInstances.length-state.destroyedIds.length).toBe(19);
    expect(state.lastTrace!.finalScore).toBe('33');expect(stateHash(before)).toBe(hash);
    expect(readCheckpoint(makeCheckpoint(state,[])).ok).toBe(true);
  });
});
