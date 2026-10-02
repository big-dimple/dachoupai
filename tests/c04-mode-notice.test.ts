import {describe,expect,it} from 'vitest';
import {applyCommand,createRun,type Action,type R2RunState} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {R2_JOKERS} from '../src/content/r2Schema';
import {stageNotice} from '../src/game/stageNotice';

function send(state:R2RunState,action:Action):R2RunState {
  const result=applyCommand(state,{runId:state.runId,commandId:'notice/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action});
  if(!result.ok)throw Error(result.code);return result.state;
}
function q11():R2RunState {
  let state=createRun({rulesVersion:'r2',runId:'q11-notice',characterId:'erxiang',seed:'challenge/q11/0',
    modeConfig:{mode:'challenge',difficulty:0,challengeId:'Q11',programsEnabled:false}});
  state.jokers=[r2CreateJoker(state.chapterDisabledJokerId!,'notice/banned',4)];
  return send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
}
describe('C04 public challenge restrictions at the actual table',()=>{
  it('names the locked Q11 source and marks its actual instance even on an ordinary warmup',()=>{
    const state=q11(),notice=stageNotice(state)!;
    const name=R2_JOKERS.find(row=>row.id===state.stage!.challengeDisabledJokerId)!.name;
    expect(notice.warning).toBe(true);expect(notice.title).toContain(name);
    expect(notice.disabledJokerIds).toEqual(['notice/banned']);
    expect(notice.details).toContain('版次');expect(notice.details).toContain('经济');
  });
  it('retains Q11 entry identity when a later chapter forecast changes and combines it with Boss reversal',()=>{
    const state=q11(),entry=state.stage!.challengeDisabledJokerId!;
    // Public-view boundary fixture: the old entered-stage context remains authoritative.
    state.chapterDisabledJokerId=R2_JOKERS.find(row=>row.id!==entry)!.id;
    state.stage!.index=20;state.stage!.boss={definitionId:'B13',disabledSuit:null};
    const notice=stageNotice(state)!;
    expect(notice.jokerScoreDirection).toBe('right-to-left');expect(notice.disabledJokerIds).toEqual(['notice/banned']);
    expect(notice.details).toContain(R2_JOKERS.find(row=>row.id===entry)!.name);
  });
  it('states Q01 passive disablement and disables wager controls while retaining the chosen identity',()=>{
    let state=createRun({rulesVersion:'r2',runId:'q01-notice',characterId:'touye',seed:'challenge/q01/0',
      modeConfig:{mode:'challenge',difficulty:0,challengeId:'Q01',programsEnabled:false}});
    state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
    const notice=stageNotice(state)!;
    expect(state.characterId).toBe('touye');expect(notice.wagerDisabled).toBe(true);
    expect(notice.description).toContain('角色被动');expect(notice.details).toContain('押注');
  });
});
