import {createRun} from '../../src/domain/run';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {energySend} from './score-energy';

/** Legal current-identity refill; controlled checkpoint, no altered targets or rules. */
export function heroRefillFixture(){
  let state=createRun({seed:'hero-gift-scene-refill',runId:'controlled/hero-gift-scene-refill',characterId:'laohuan',
    rulesVersion:'r2',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group',
    modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  state=energySend(energySend(state,{type:'LeaveShop'}),{type:'EnterStage'});
  state=energySend(state,{type:'DiscardHand',selectedIds:state.handOrder.slice(0,2),laohuanTrick:true});
  if(!state.pendingRefill)throw Error('Controlled refill did not open a choice');
  return {state,selectedIds:state.pendingRefill.candidateIds.slice(0,state.pendingRefill.required)};
}
