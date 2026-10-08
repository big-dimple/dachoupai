import {createRun,applyCommand,type R2RunState,type Action} from '../../src/domain/run';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {r2CreateJoker} from '../../src/domain/r2Run';
export function scoreEnergyFixture(kind:'ordinary'|'key'|'multiply'|'fifth'){
 let state=createRun({seed:'score-energy-controlled',runId:'controlled/score-energy/'+kind,characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 state=energySend(energySend(state,{type:'LeaveShop'}),{type:'EnterStage'});
 // Explicit controlled inventory and public hand; no natural acquisition/probability claim.
 const cards=[[7,'clubs'],[7,'hearts'],[9,'spades'],[9,'diamonds'],[2,'clubs'],[2,'spades'],[11,'hearts'],[12,'diamonds']] as const;cards.forEach(([rank,suit],i)=>Object.assign(state.deckInstances[i],{rank,suit}));state.handOrder=state.deckInstances.slice(0,8).map(c=>c.id);state.drawPile=state.deckInstances.slice(8).map(c=>c.id);state.gold=20;
 const definitions=kind==='key'?['mantangcai']:kind==='multiply'?['f09','f06','e08']:[];state.jokers=definitions.map((id,i)=>r2CreateJoker(id,'controlled/source/'+i,8,'none',state));state.stage!.initialJokerIds=state.jokers.map(j=>j.instanceId);
 if(kind==='fifth')state.openingShow!.handsScored=4; // Controlled pre-fifth public snapshot, not four simulated plays.
 return {state,selectedIds:kind==='ordinary'||kind==='fifth'?[state.handOrder[0]]:state.handOrder.slice(0,4),assistIds:kind==='ordinary'||kind==='fifth'?[]:state.handOrder.slice(4,6)};
}
export function energySend(s:R2RunState,action:Action){const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;}
