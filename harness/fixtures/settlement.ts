import {createRun,type R2RunState} from '../../src/domain/run';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {r2CreateJoker} from '../../src/domain/r2Run';
import {energySend} from './hero-climax';

/** Controlled public inventory, levels and prior clear ledger; no natural acquisition claim.
 * Only the resulting real PlayHand trace supplies the presentation numbers. */
export function settlementReady(kind:'ordinary'|'chain'|'million'|'billion'|'long'|'boss-win'|'boss-loss'){
 let state=createRun({seed:'settlement-controlled/'+kind,runId:'controlled/settlement/'+kind,characterId:'xiemu',rulesVersion:'r2',r2Identity:newRunIdentity('xiemu','straight'),openingRoute:'straight',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 state=energySend(state,{type:'LeaveShop'});
 const big=['million','billion','long'].includes(kind),boss=kind.startsWith('boss');
 if(big){
  Object.assign(state,{chapter:8,stageIndex:23,totalHeat:'1000',boss:{definitionId:'B12',disabledSuit:null},seenBossIds:['B01','B02','B05','B06','B07','B08','B13','B12']});
  const count=kind==='million'?12:kind==='long'?23:21;
  state.routeGrowth={clears:count,G:0,S:count,F:0,settlements:Array.from({length:23},(_,stageIndex)=>stageIndex).filter(index=>index<count||index%3===2).map(stageIndex=>({stageIndex,families:['S'] as ['S']}))};
  state.routeGrowth.clears=state.routeGrowth.S=state.routeGrowth.settlements.length;
  state.handLevels={'straight':kind==='long'?30:18};
 }
 if(boss){Object.assign(state,{chapter:1,stageIndex:2,totalHeat:'1000',boss:{definitionId:'B03',disabledSuit:'clubs'},seenBossIds:['B03']});state.routeGrowth={clears:2,G:0,S:2,F:0,settlements:[{stageIndex:0,families:['S']},{stageIndex:1,families:['S']}]};}
 state.deckInstances.forEach((card,index)=>{card.rank=(index%5+9) as typeof card.rank;card.suit=index%2?'hearts':'spades';if(big)card.edition='polychrome';});
 state.gold=80;
 const ids=kind==='ordinary'||kind==='boss-loss'?['c04']:['c04','f10','e08','a06'];
 state.jokers=ids.map((id,index)=>r2CreateJoker(id,'controlled/settlement/source/'+index,8,'none',state));
 state.jokers[0].growth.heat={n:'100',d:'1'};
 if(kind==='long'){state.jokers[3].growth.coefficient={n:'1000000',d:'1'};}
 state=energySend(state,{type:'EnterStage'});
 if(kind==='boss-loss'){while(state.stage!.handsLeft>1)state=energySend(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});return {state,action:{type:'PlayHand' as const,selectedIds:[state.handOrder[0]]}};}
 // A controlled public hand before discard; the real command owns both zone movement and rescue.
 const hand=state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!);
 hand.forEach((card,index)=>{card.rank=([8,9,10,11,12,13,2,3][index]) as typeof card.rank;card.suit=index%2?'hearts':'spades';});
 const selectedIds=state.handOrder.slice(1,6);
 if(kind!=='ordinary')state=energySend(state,{type:'DiscardHand',selectedIds:[state.handOrder[0]]});
 return {state,action:{type:'PlayHand' as const,selectedIds,...(kind!=='ordinary'?{xiemuBurn:30 as const}:{})}};
}

/** Five face cards with their own encore-paper: ten actual same-source triggers. */
export function repeatedSettlementReady(){
 const f=settlementReady('ordinary');f.state.jokers[0]=r2CreateJoker('tiesuanpan',f.state.jokers[0].instanceId,4,'none',f.state);
 for(const id of f.action.selectedIds){const card=f.state.deckInstances.find(c=>c.id===id)!;card.rank=13;card.enhancement='encore-paper';}
 return {...f,action:{...f.action,xiemuBurn:30 as const}};
}
