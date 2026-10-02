import {describe,expect,it} from 'vitest';
import {applyCommand,createRun,stateHash,type Action,type Command,type R2RunState} from '../src/domain/run';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import type {R2HandType} from '../src/domain/evaluateR2';

// Independent, handwritten contract goldens. Do not derive expectations from the catalog or enum order.
const PLANETS=[
  ['P01','high-card','高牌'],['P02','pair','对子'],['P03','two-pair','两对'],['P04','three-kind','三条'],
  ['P05','straight','顺子'],['P06','flush','同花'],['P07','full-house','葫芦'],['P08','four-kind','四条'],
  ['P09','straight-flush','同花顺'],['P10','five-kind','五条'],['P11','flush-house','同花葫芦'],['P12','flush-five','同花五条'],
] as const;
const DISCOVERED:Record<R2HandType,number>={
  'high-card':3,pair:4,'two-pair':5,'three-kind':6,straight:7,flush:8,'full-house':9,
  'four-kind':10,'straight-flush':11,'five-kind':12,'flush-house':13,'flush-five':14,
};
const command=(state:R2RunState,action:Action):Command=>({runId:state.runId,commandId:`planet/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
const send=(state:R2RunState,action:Action):R2RunState=>{
  const result=applyCommand(state,command(state,action));if(!result.ok)throw Error(result.code);return result.state;
};
type Phase='shop'|'await-input';
function fixture(phase:Phase,id:string):R2RunState {
  let state=createRun({seed:'c01-planet-goldens',runId:`c01-planet/${phase}/${id}`,characterId:'amo',rulesVersion:'r2'});
  if(phase==='await-input'){
    state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
    state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
    expect(state.phase).toBe('await-input');expect(state.lastTrace).not.toBeNull();
  }
  // Explicit domain fixtures for discovered levels and inventory; this does not claim natural acquisition.
  // Add the not-yet-enabled planet after normal phase entry, so setup cannot fail an inventory invariant.
  state.handLevels={...DISCOVERED};state.consumables=[{instanceId:'fixture/planet',definitionId:id}];
  return state;
}
const use=(patch:Partial<Extract<Action,{type:'UseConsumable'}>>={}):Extract<Action,{type:'UseConsumable'}>=>({type:'UseConsumable',instanceId:'fixture/planet',targetIds:[],...patch});
function rejected(state:R2RunState,action:Action,expectedSeq=state.commandSeq):void {
  const before=structuredClone(state),hash=stateHash(state),result=applyCommand(state,{...command(state,action),expectedSeq});
  expect(result.ok).toBe(false);if(result.ok)return;
  // Reaching the target/level/sequence boundary is required; an unavailable family is not its proof.
  expect(result.code).not.toBe('consumable-not-enabled');
  expect(result.state).toBe(state);expect(stateHash(state)).toBe(hash);expect(state).toEqual(before);
  expect(state.rng).toEqual(before.rng);expect(state.consumables).toEqual(before.consumables);expect(state.lastTrace).toEqual(before.lastTrace);
}

describe.each(['shop','await-input'] as const)('C01 twelve dedicated planet command goldens in %s',phase=>{
  it.each(PLANETS)('%s upgrades only fixed discovered %s / %s by one and survives restoration',(id,handType)=>{
    const state=fixture(phase,id),before=structuredClone(state),cmd=command(state,use()),result=applyCommand(state,cmd);
    expect(result.ok).toBe(true);if(!result.ok)return;
    const next=result.state,expected=structuredClone(before);
    expected.handLevels[handType]=DISCOVERED[handType]+1;expected.consumables=[];
    expected.commandSeq=next.commandSeq;expected.receipts=structuredClone(next.receipts);
    expect(next.handLevels[handType]).toBe(DISCOVERED[handType]+1);expect(next).toEqual(expected);
    expect(Object.keys(next.rng).sort()).toEqual(['challenge','deck','program','reward','rule','shop']);expect(next.rng).toEqual(before.rng);
    expect(next.lastTrace).toEqual(before.lastTrace);expect(state).toEqual(before);
    const restored=readCheckpoint(JSON.parse(JSON.stringify(makeCheckpoint(next,[cmd]))));
    expect(restored.ok&&restored.checkpoint.state).toEqual(next);expect(restored.ok&&restored.checkpoint.journal).toEqual([cmd]);
    if(restored.ok){
      const duplicate=applyCommand(restored.checkpoint.state,cmd);
      expect(duplicate.ok&&duplicate.duplicate).toBe(true);expect(duplicate.state).toBe(restored.checkpoint.state);
    }
  });
  it.each(PLANETS)('%s rejects capped, undiscovered, conflicting, targeted and stale use of %s / %s',(id,handType)=>{
    const capped=fixture(phase,id);capped.handLevels[handType]=30;rejected(capped,use());
    const undiscovered=fixture(phase,id);delete undiscovered.handLevels[handType];delete undiscovered.chapterHandUsage[handType];rejected(undiscovered,use());
    const conflict=handType==='high-card'?'pair':'high-card';rejected(fixture(phase,id),use({handType:conflict}));
    const targeted=fixture(phase,id),target=phase==='shop'?targeted.deckInstances[0].id:targeted.handOrder[0];rejected(targeted,use({targetIds:[target]}));
    const stale=fixture(phase,id);rejected(stale,use(),stale.commandSeq-1);
  });
});
