import {describe,it,expect} from 'vitest';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {opponentHandBeat,opponentSavedStatus,opponentChoices,remainingScoreEvents,opponentOutcome} from '../src/game/OpponentFacts';
import {b05ChoicesReady,b05Entrance,b05Send,b05TerminalReady,B05_PAIR,B05_CHANGE} from './fixtures/b05-encounter';
import type {ScoreTrace} from '../src/domain/scoreR2';
describe('B05 encounter uses current saved commands and facts',()=>{
  it('validates entrance, actual prior hand and both actual results as native checkpoints',()=>{
    const state=b05ChoicesReady(),before=JSON.stringify(state);expect(readCheckpoint(makeCheckpoint(b05Entrance(),[])).ok).toBe(true);expect(readCheckpoint(makeCheckpoint(state,[])).ok).toBe(true);
    for(const [ids,expected,kind] of [[B05_PAIR,'43','repeat'],[B05_CHANGE,'31','changed']] as const){
      const result=b05Send(state,{type:'PlayHand',selectedIds:[...ids]}),trace=result.lastTrace!;
      expect(trace.finalScore).toBe(expected);expect(readCheckpoint(makeCheckpoint(result,[])).ok).toBe(true);
      expect(opponentHandBeat(trace)?.kind).toBe(kind);expect(opponentSavedStatus(trace)).toContain(expected+' 分');
      expect(remainingScoreEvents(trace)).toEqual(trace.events.slice(1));
      if(kind==='repeat'){const event=trace.events[1];expect(remainingScoreEvents(trace)).toContain(event);expect(event.operation).toBe('halve-base-heat');expect(opponentHandBeat(trace)?.effect).toBe('牌型基础 35 → 17.5');}
      else {expect(result.handOrder).toEqual(expect.arrayContaining(B05_PAIR));expect(trace.events.some(e=>e.operation==='halve-base-heat')).toBe(false);}
    }
    expect(JSON.stringify(state)).toBe(before);
  });
  it('provides two formed actionable choices without consuming cards or forecasting a win',()=>{
    const state=b05ChoicesReady(),before=JSON.stringify(state),choices=opponentChoices(state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!),{},'pair');
    expect(choices.map(c=>c.ids)).toEqual([B05_PAIR,B05_CHANGE]);expect(choices[0].detail).toContain('留7张');expect(choices[1].detail).toContain('未必得分更高');expect(JSON.stringify(state)).toBe(before);
  });
  it('distinguishes first hand, missing context, non-B05 and unconfirmed same type',()=>{
    const trace=b05ChoicesReady().lastTrace!;expect(opponentHandBeat(trace)?.kind).toBe('opening');expect(opponentHandBeat(null)).toBeUndefined();
    expect(opponentHandBeat({...trace,bossContext:undefined} as unknown as ScoreTrace)).toBeUndefined();
    expect(opponentHandBeat({...trace,bossContext:{...trace.bossContext,boss:{definitionId:'B12',disabledSuit:null}}})).toBeUndefined();
    expect(opponentHandBeat({...trace,bossContext:{...trace.bossContext,previousHandType:'pair'}})?.kind).toBe('unknown');
  });
  it('never calls first hands a break or treats a different hand plus reduction as avoided',()=>{
    const state=b05ChoicesReady(),repeat=b05Send(state,{type:'PlayHand',selectedIds:B05_PAIR}).lastTrace!;
    expect(opponentHandBeat({...repeat,bossContext:{...repeat.bossContext,previousHandType:'flush'}})?.kind).toBe('repeat');
    const first=opponentChoices(state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!),{},null);expect(first.every(c=>c.kind==='opening')).toBe(true);
  });
  it('does not offer an impossible repeat, respects four-card modifiers and keeps the public hand intact',()=>{
    const state=b05ChoicesReady(),hand=state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!);
    expect(opponentChoices(hand,{},'full-house').some(c=>c.kind==='repeat')).toBe(false);
    const four=[2,3,4,5].map((rank,i)=>({...hand[i],rank:rank as typeof hand[number]['rank'],suit:'clubs' as const}));
    expect(opponentChoices(four,{fourFlush:true},'flush')[0].type).toBe('flush');expect(opponentChoices(four,{},'flush').some(c=>c.kind==='repeat')).toBe(false);
  });
  it('uses the actual terminal phase and heat for the opponent result',()=>{
    for(const win of [true,false]){const f=b05TerminalReady(win),after=b05Send(f.state,f.action);expect(readCheckpoint(makeCheckpoint(f.state,[])).ok).toBe(true);expect(readCheckpoint(makeCheckpoint(after,[])).ok).toBe(true);expect(opponentOutcome(after,after.lastTrace!)?.kind).toBe(win?'won':'lost');}
  });
});
