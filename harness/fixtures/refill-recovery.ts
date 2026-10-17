import {applyCommand,createRun,type Action,type R2RunState} from '../../src/domain/run';
import {newRunIdentity} from '../../src/game/RunLaunch';
export function refillSend(state:R2RunState,action:Action):R2RunState {
  const r=applyCommand(state,{runId:state.runId,commandId:state.runId+'/command/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;
}
/** Current identity, original difficulty2 target600; public deterministic cards and explicit 3-gold fixture. */
export function refillRecoveryFixture(discardCount=5){
  let state=createRun({seed:'xin-refill-entry',runId:'fixture/xin-refill-entry',characterId:'laohuan',rulesVersion:'r2',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:2,challengeId:null,programsEnabled:false}});
  state=refillSend(refillSend(state,{type:'LeaveShop'}),{type:'EnterStage'});state=structuredClone(state);
  state.gold=3;
  const hand=['spades-2','clubs-3','diamonds-4','clubs-5','spades-6','clubs-7','spades-8','clubs-9'];
  const candidates=['hearts-12','diamonds-13','hearts-10','clubs-11','spades-12','hearts-13','diamonds-14'];
  state.handOrder=hand;state.drawPile=[...state.deckInstances.map(c=>c.id).filter(id=>!hand.includes(id)&&!candidates.includes(id)),...candidates.slice().reverse()];
  const discard=hand.slice(-discardCount),pending=refillSend(state,{type:'DiscardHand',selectedIds:discard,laohuanTrick:true});
  return {state,discard,pending};
}
