import {scoreEnergyFixture,energySend} from './score-energy';
import {createRun} from '../../src/domain/run';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {evaluateR2Hand} from '../../src/domain/evaluateR2';
export {energySend};
export function heroClimaxFixture(kind:'multiply'|'fifth'|'failure'|'growth') {
 if(kind==='multiply'||kind==='fifth')return scoreEnergyFixture(kind);
 if(kind==='failure'){
  let state=createRun({seed:'hero-climax/failure',runId:'hero-climax/failure',characterId:'erxiang',rulesVersion:'r2',r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  state=energySend(energySend(state,{type:'LeaveShop'}),{type:'EnterStage'});
  while(state.stage!.handsLeft>1)state=energySend(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
  return {state,selectedIds:[state.handOrder[0]],assistIds:[]};
 }
 let state=createRun({seed:'route-first-4',runId:'hero-climax/natural-flush',characterId:'erxiang',rulesVersion:'r2',r2Identity:newRunIdentity('erxiang','flush'),openingRoute:'flush',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 const offer=state.shop!.offers.find(o=>o.definitionId==='c06')!;
 state=energySend(state,{type:'BuyOffer',offerId:offer.offerId});state=energySend(energySend(state,{type:'LeaveShop'}),{type:'EnterStage'});
 const hand=state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!);
 const walk=(at:number,picked:typeof hand):string[]|undefined=>{if(picked.length&&['flush','straight-flush'].includes(evaluateR2Hand(picked,{}).type))return picked.map(c=>c.id);if(picked.length===5)return;for(let i=at;i<hand.length;i++){const out=walk(i+1,[...picked,hand[i]]);if(out)return out;}};
 const selectedIds=walk(0,[]);if(!selectedIds)throw Error('fixture has no natural flush');return {state,selectedIds,assistIds:[]};
}
