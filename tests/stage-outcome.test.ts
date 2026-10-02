import {describe,it,expect} from 'vitest';
import type {ScoreTrace} from '../src/domain/scoreR2';
import {stageOutcome} from '../src/game/stageOutcome';

const trace=(score='9703')=>({finalScore:score,handType:'straight-flush',accumulator:{H:{n:'599',d:'1'},M:{n:'81',d:'5'}}}) as ScoreTrace;
const stage={heat:'12632',targetHeat:'3600',handsLeft:0,playIndex:4,previousHandScore:'9703'};
describe('saved stage outcome presentation',()=>{
  it('the reported 599 × 16.2 finishing straight flush proves the last-hand comeback',()=>{
    const result=stageOutcome(stage,trace());
    expect(result).toMatchObject({kind:'comeback',beforeHeat:'2929',crossed:true,highMultiplier:true,intensity:3,title:'最后一手，掀翻全场！'});
    expect(result.last?.finalScore).toBe('9703');
    expect(599n*81n/5n).toBe(9703n);
  });
  it('zero remaining hands alone cannot invent a comeback',()=>{
    expect(stageOutcome(stage,null)).toMatchObject({kind:'overwhelming',beforeHeat:null,crossed:false,last:null});
    expect(stageOutcome({...stage,heat:'3650'},null).kind).toBe('narrow');
  });
  it('rejects a stale trace and already-cleared prior totals',()=>{
    expect(stageOutcome({...stage,previousHandScore:'5'},trace()).last).toBeNull();
    expect(stageOutcome({...stage,previousHandScore:'100'},trace('100'))).toMatchObject({kind:'overwhelming',crossed:false});
  });
  it('distinguishes an ordinary clear, a narrow clear and an early overkill',()=>{
    expect(stageOutcome({...stage,heat:'4800',handsLeft:2},null).kind).toBe('steady');
    expect(stageOutcome({...stage,heat:'3800',handsLeft:2},null).kind).toBe('narrow');
    expect(stageOutcome({...stage,handsLeft:2},trace()).kind).toBe('overwhelming');
  });
  it('does not call a lost stage or a one-hand opening a comeback',()=>{
    expect(stageOutcome({...stage,heat:'3000',previousHandScore:'100'},trace('100')).crossed).toBe(false);
    expect(stageOutcome({...stage,playIndex:1},trace()).kind).toBe('overwhelming');
  });
  it('keeps exact integer comparisons beyond Number precision',()=>{
    const target='900719925474099300000';
    expect(stageOutcome({...stage,heat:target,targetHeat:target,previousHandScore:'1'},trace('1'))).toMatchObject({kind:'comeback',beforeHeat:'900719925474099299999'});
  });
});
