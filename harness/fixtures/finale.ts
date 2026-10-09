import {createRun,type R2RunState} from '../../src/domain/run';
import {energySend} from './hero-climax';

/** Existing C04 final-stage save boundary: one real final command, no natural campaign claim. */
export function finaleReady():R2RunState {
 let state=createRun({seed:'mode-save-free',characterId:'erxiang',runId:'save/final/standard/0',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 state=energySend(state,{type:'LeaveShop'});
 Object.assign(state,{chapter:8,stageIndex:23,shop:null,totalHeat:'1000',boss:{definitionId:'B12',disabledSuit:null},seenBossIds:['B01','B02','B05','B06','B07','B08','B13','B12'],handLevels:{'high-card':1,'flush-five':30}});
 state.deckInstances=Array.from({length:20},(_,index)=>({id:`save/final/card/${index}`,rank:14,suit:'hearts',enhancement:'encore-paper',edition:'polychrome'}));
 state.drawPile=state.deckInstances.map(card=>card.id);
 return energySend(state,{type:'EnterStage'});
}
