import {describe,expect,it} from 'vitest';
import {createRun,applyCommand} from '../src/domain/run';
import {validateCardInstances} from '../src/domain/evaluateR2';
import type {PlayingCard} from '../src/cards/types';
describe('reserved card enhancement schema',()=>{
  it('refuses unknown enhancements and reports a known but not-yet-enabled enhancement atomically',()=>{
    expect(()=>validateCardInstances([{id:'x',rank:2,suit:'spades',enhancement:'unknown'}] as unknown as PlayingCard[])).toThrow();
    let run=createRun({seed:'boundary',characterId:'amo',runId:'boundary',rulesVersion:'r2'});
    for(const type of ['LeaveShop','EnterStage'] as const){const response=applyCommand(run,{runId:run.runId,commandId:type,expectedSeq:run.commandSeq,action:{type}});if(!response.ok)throw new Error(response.code);run=response.state;}
    run.deckInstances.find(c=>c.id===run.handOrder[0])!.enhancement='glass-paper';
    const before=JSON.stringify(run),response=applyCommand(run,{runId:run.runId,commandId:'enhanced-play',expectedSeq:run.commandSeq,action:{type:'PlayHand',selectedIds:[run.handOrder[0]]}});
    expect(response.ok).toBe(false);expect(response.state).toBe(run);
    if(!response.ok)expect(response.diagnostic?.code).toBe('enhancement-not-enabled');expect(JSON.stringify(run)).toBe(before);
  });
});
