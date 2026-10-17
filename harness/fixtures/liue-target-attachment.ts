import {createRun} from '../../src/domain/run';
import {r2CreateJoker} from '../../src/domain/r2Run';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {energySend} from './score-energy';

/** Controlled public checkpoint, not natural acquisition, economics or difficulty evidence. */
export function liueAttachmentFixture(withMantang=true){
  let state=createRun({seed:'liue-target-attachment',runId:'controlled/liue-target-attachment',characterId:'erxiang',rulesVersion:'r2',r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  state=energySend(energySend(state,{type:'LeaveShop'}),{type:'EnterStage'});
  const selectedIds=['clubs-6','hearts-6'];
  state.handOrder=[...selectedIds,'spades-2','hearts-3','diamonds-4','clubs-5','diamonds-8','spades-10'];
  state.drawPile=state.deckInstances.map(c=>c.id).filter(id=>!state.handOrder.includes(id));
  state.handLevels.pair=withMantang?2:1;
  state.jokers=(withMantang?['mantangcai','b10']:['b10']).map((id,i)=>r2CreateJoker(id,'controlled/liue-attachment/'+i,8,'none',state));
  state.stage!.initialJokerIds=state.jokers.map(j=>j.instanceId);
  return {state,selectedIds,targetId:'hearts-6',otherId:'clubs-6'};
}
