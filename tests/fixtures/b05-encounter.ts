import {createRun,applyCommand,type R2RunState,type Action} from '../../src/domain/run';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {lockR2ChapterTargets} from '../../src/domain/r2Chapter';
import {assertR2Invariants} from '../../src/domain/r2Run';

export function b05Send(state:R2RunState,action:Action):R2RunState {
  const result=applyCommand(state,{runId:state.runId,commandId:state.runId+'/command/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action});
  if(!result.ok)throw Error(result.code);return result.state;
}
/** Controlled chapter/budget and already-owned U01; not a natural Boss or acquisition claim. */
export function b05Entrance():R2RunState {
  let state=createRun({seed:'b05-controlled',runId:'controlled/b05',characterId:'xiemu',rulesVersion:'r2',r2Identity:newRunIdentity('xiemu','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  state=b05Send(state,{type:'LeaveShop'});
  Object.assign(state,{shop:null,chapter:3,stageIndex:8,boss:{definitionId:'B05',disabledSuit:null},seenBossIds:['B01','B02','B05'],longTermItems:['U01'],totalHeat:'0'});
  state.routeGrowth={clears:8,G:0,S:0,F:0,settlements:Array.from({length:8},(_,stageIndex)=>({stageIndex,families:[]}))};
  state.chapterTargetPlan=lockR2ChapterTargets(3,state.tourMode,state.difficulty,state.boss);
  assertR2Invariants(state);return state;
}
export function b05Arrange(input:R2RunState,ids:string[]):R2RunState {
  const state=structuredClone(input),used=new Set([...state.playedPile,...state.discardPile,...state.destroyedIds]),available=state.deckInstances.filter(c=>!used.has(c.id));
  if(ids.some(id=>!available.some(c=>c.id===id)))throw Error('used sample card');
  state.handOrder=[...ids,...available.filter(c=>!ids.includes(c.id)).slice(0,state.stage!.handLimit-ids.length).map(c=>c.id)];
  state.drawPile=available.filter(c=>!state.handOrder.includes(c.id)).map(c=>c.id);assertR2Invariants(state);return state;
}
export const B05_PAIR=['spades-2','hearts-2'];
export const B05_CHANGE=['clubs-14'];
export function b05ChoicesReady():R2RunState {
  let state=b05Arrange(b05Send(b05Entrance(),{type:'EnterStage'}),['spades-3','hearts-3']);
  // This previous type and trace are produced by a real PlayHand, never patched.
  state=b05Send(state,{type:'PlayHand',selectedIds:['spades-3','hearts-3']});
  return b05Arrange(state,[...B05_PAIR,...B05_CHANGE,'diamonds-5','clubs-7','hearts-9','spades-11','diamonds-12','clubs-13']);
}
export function b05TerminalReady(win:boolean):{state:R2RunState;action:Action} {
  if(win){const ready=b05Entrance();ready.handLevels.flush=30;const state=b05Arrange(b05Send(ready,{type:'EnterStage'}),['clubs-4','clubs-6','clubs-8','clubs-10','clubs-12']);return {state,action:{type:'PlayHand',selectedIds:state.handOrder.slice(0,5)}};}
  let state=b05ChoicesReady();while(state.stage!.handsLeft>1)state=b05Send(state,{type:'PlayHand',selectedIds:[state.handOrder.at(-1)!]});
  return {state,action:{type:'PlayHand',selectedIds:[state.handOrder[0]]}};
}
