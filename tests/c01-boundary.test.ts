import {describe,expect,it} from 'vitest';
import {applyCommand,createRun,type Action,type R2RunState} from '../src/domain/run';
import {makeCheckpoint,readCheckpoint,restoreSlots} from '../src/application/checkpoint';
import {stableHash} from '../src/domain/hash';
import {validateCardInstances} from '../src/domain/evaluateR2';
import type {PlayingCard} from '../src/cards/types';

const start=()=>createRun({seed:'c01-boundary',runId:'c01-boundary',characterId:'amo',rulesVersion:'r2'});
const send=(state:R2RunState,action:Action)=>{
  const result=applyCommand(state,{runId:state.runId,commandId:`boundary/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
  if(!result.ok)throw Error(result.code);return result.state;
};
const resign=(value:ReturnType<typeof makeCheckpoint>)=>{const {checksum,...payload}=value;return {...payload,checksum:stableHash(payload)};};

describe('C01 explicit new-game boundary and saved stage budgets',()=>{
  it('starts the current version with explicit empty modifier, reward and chapter counters',()=>{
    const state=start() as R2RunState&Record<string,unknown>;
    expect(state.contentVersion).toBe('quality-r2-content-v10');
    expect(state.spectralModifiers).toEqual({handsPenalty:0,handPenalty:0,cleanSlateBonus:0});
    expect(state.supplyRewardClaimed).toBe(false);expect(state.normalClearClaimed).toBe(false);
    expect(state.chapterHandUsage).toEqual({});expect(state.deckInstances).toHaveLength(52);
    expect(readCheckpoint(makeCheckpoint(state,[])).ok).toBe(true);
  });
  it.each(['entered','skipped'] as const)('freezes entry budgets for an %s stage and restores them',kind=>{
    const state=kind==='entered'?send(send(start(),{type:'LeaveShop'}),{type:'EnterStage'}):send(start(),{type:'SkipStage'});
    const stage=state.stage as unknown as Record<string,unknown>;
    expect(stage.initialHands).toBe(4);expect(stage.initialDiscards).toBe(3);expect(stage.handLimit).toBe(8);
    expect(stage.discardSpent).toBe(0);expect(stage.discardGained).toBe(0);
    const read=readCheckpoint(makeCheckpoint(state,[]));expect(read.ok&&read.checkpoint.state).toEqual(state);
  });
  // Synthetic opaque old tags exercise raw retention, not historical replay or a claimed migration.
  it.each(['quality-r2-score-v1','quality-r2-run-v2','quality-r2-graybox-v3','quality-r2-graybox-v4','quality-r2-content-v5'])('retains %s raw text and refuses silent continuation',contentVersion=>{
    const current=makeCheckpoint(start(),[]),raw=resign({...current,state:{...current.state,contentVersion}});
    const text=JSON.stringify(raw);expect(readCheckpoint(raw)).toEqual({ok:false,code:'incompatible-version'});
    const slots=restoreSlots({revision:5,current:raw,previous:null});
    expect(slots.status).toBe('invalid');expect(slots.raw).toBe(raw);expect(JSON.stringify(raw)).toBe(text);
  });
  it('rejects an unrecognized edition before it can influence evaluation or presentation',()=>{
    const card={...start().deckInstances[0],edition:'glitter-hack'} as unknown as PlayingCard;
    expect(()=>validateCardInstances([card])).toThrow('invalid-card-instances');
  });
});
