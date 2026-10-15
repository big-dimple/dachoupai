import {describe,it,expect} from 'vitest';
import {opponentCuePlan,opponentHandBeat,opponentOutcome} from '../src/game/OpponentFacts';
import {b05ChoicesReady,b05Send,b05TerminalReady,B05_PAIR,B05_CHANGE} from './fixtures/b05-encounter';

describe('B05 view cue protocol',()=>{
  const played=(ids:string[])=>b05Send(b05ChoicesReady(),{type:'PlayHand',selectedIds:ids});
  it('anchors the focused move before its real reduction and the respectful response after its final result',()=>{
    const repeat=played(B05_PAIR),changed=played(B05_CHANGE);
    expect(opponentCuePlan(repeat,repeat.lastTrace!,new Set())).toEqual([expect.objectContaining({opponentId:'B05',kind:'repeat',phase:'telegraph',attitude:'focused',placement:'before-event',eventId:repeat.lastTrace!.events.find(e=>e.operation==='halve-base-heat')!.eventId})]);
    expect(opponentCuePlan(changed,changed.lastTrace!,new Set())).toEqual([expect.objectContaining({opponentId:'B05',kind:'changed',phase:'reaction',attitude:'respectful',placement:'after-result',eventId:changed.lastTrace!.events.find(e=>e.phase==='finalScore')!.eventId})]);
  });
  it('does not invent a result anchor from changed type, terminal phase or an unrelated final operation',()=>{
    const changed=played(B05_CHANGE),trace=changed.lastTrace!;
    for(const events of [trace.events.filter(e=>e.phase!=='finalScore'),trace.events.map(e=>e.phase==='finalScore'?{...e,operation:'unknown-final'}:e)]){
      const incomplete={...trace,events};
      expect(opponentHandBeat(incomplete)).toBeUndefined();
      expect(opponentOutcome({...changed,phase:'stage-cleared'},incomplete)).toBeUndefined();
      expect(opponentCuePlan({...changed,phase:'run-lost'},incomplete,new Set())).toEqual([]);
    }
  });
  it('uses terminal facts for conceding or confident outcomes, after the result, without mutating saved state',()=>{
    for(const win of [true,false]){
      const f=b05TerminalReady(win),state=b05Send(f.state,f.action),before=JSON.stringify(state),trace=state.lastTrace!;
      const plan=opponentCuePlan(state,trace,new Set()),outcome=plan.at(-1)!;
      expect(outcome).toMatchObject({phase:'outcome',placement:'after-result',kind:win?'won':'lost',attitude:win?'conceding':'confident',eventId:trace.events.find(e=>e.phase==='finalScore')!.eventId});
      expect(JSON.stringify(state)).toBe(before);
    }
  });
  it('keeps reaction before outcome when a changed hand also clears, anchored to the same actual result',()=>{
    const state=played(B05_CHANGE),trace=state.lastTrace!;
    // Pure presentation boundary: an actual changed trace with a terminal-view phase.
    const plan=opponentCuePlan({...state,phase:'stage-cleared'},trace,new Set());
    expect(plan.map(c=>c.phase)).toEqual(['reaction','outcome']);
    expect(plan[0].eventId).toBe(plan[1].eventId);
  });
  it('adds no opening, unknown or ordinary repeated cue, while explicit replay can show the saved key cue',()=>{
    const state=b05ChoicesReady(),opening=state.lastTrace!;
    expect(opponentCuePlan(state,opening,new Set())).toEqual([]);
    expect(opponentCuePlan(state,{...opening,bossContext:{...opening.bossContext,previousHandType:opening.handType}},new Set())).toEqual([]);
    for(const [ids,kind] of [[B05_PAIR,'repeat'],[B05_CHANGE,'changed']] as const){
      const playedState=played(ids),trace=playedState.lastTrace!,shown=new Set([kind]);
      expect(opponentCuePlan(playedState,trace,shown)).toEqual([]);
      expect(opponentCuePlan(playedState,trace,shown,true)).toHaveLength(1);
      expect([...shown]).toEqual([kind]);
    }
    expect(opponentCuePlan(state,{...opening,bossContext:{...opening.bossContext,boss:{definitionId:'B12',disabledSuit:null}}},new Set())).toEqual([]);
  });
});
