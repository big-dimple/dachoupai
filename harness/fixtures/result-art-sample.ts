import {r2CreateJoker} from '../../src/domain/r2Run';
import {createRun} from '../../src/domain/run';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {energySend} from './score-energy';
/** Disclosed controlled public cards/level and chapter boundary; not dot's natural save. */
export function resultArtSample(strong:boolean){
 let state=createRun({seed:'result-art-sample',runId:'controlled/result-art/'+(strong?'strong':'ordinary'),characterId:'erxiang',rulesVersion:'r2',r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 state=energySend(state,{type:'LeaveShop'});
 if(strong){
  Object.assign(state,{chapter:7,stageIndex:20,boss:{definitionId:'B13',disabledSuit:null},seenBossIds:['B01','B02','B05','B06','B07','B08','B13'],handLevels:{'high-card':1,'flush-five':3}});
  state.deckInstances=Array.from({length:20},(_,i)=>({id:`result-art/card/${i}`,rank:14,suit:'hearts' as const,enhancement:'encore-paper' as const,edition:'polychrome' as const}));
  state.drawPile=state.deckInstances.map(c=>c.id);
 }
 state=energySend(state,{type:'EnterStage'});
 if(strong){
  const last=state.deckInstances.find(c=>c.id===state.handOrder[4])!;delete last.edition;
  state.jokers=[r2CreateJoker('b10','result-art/growth',7,'none',state)];state.stage!.initialJokerIds=state.jokers.map(j=>j.instanceId);
 }
 if(!strong){
  const ids=['spades-13','hearts-13','clubs-13','spades-12','hearts-12'];
  state.handOrder=[...ids,...state.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id)).slice(0,state.handOrder.length-ids.length)];
  state.drawPile=state.deckInstances.map(c=>c.id).filter(id=>!state.handOrder.includes(id));
 }
 const selectedIds=state.handOrder.slice(0,5),action={type:'PlayHand' as const,selectedIds},cleared=energySend(state,action);
 return {state,action,cleared};
}
