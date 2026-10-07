import {createRun,applyCommand,type R2RunState,type Action} from '../../src/domain/run';
export function journeySend(state:R2RunState,action:Action):R2RunState {const r=applyCommand(state,{runId:state.runId,commandId:state.runId+'/command/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;}
/** Controlled cash, existing growth and tools. Normal shop/deck/profile rules stay unchanged. */
export function buildJourneyPlan(missing=false){
 let state=createRun({seed:'group-natural-17',runId:'fixture/build-journey'+(missing?'/missing':''),characterId:'erxiang',rulesVersion:'r2',r2Profile:'group-upgrade-v1',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 if(!missing){const offer=state.shop!.offers.find(o=>o.definitionId==='b10');if(!offer)throw Error('known seed missing b10');state=journeySend(state,{type:'BuyOffer',offerId:offer.offerId});state.gold=15;state.jokers[0].growth={heat:{n:'20',d:'1'}};state.consumables=[{instanceId:'controlled/T01',definitionId:'T01'},{instanceId:'controlled/T04',definitionId:'T04'}];state.handLevels.pair=1;}else{state.gold=0;state.consumables=[];state.jokers=[];}
 return state;
}
/** Controlled revealed hand for transfer semantics. Never reads a future draw order. */
export function buildTransitionPlan(focus:'straight'|'flush'){
 let state=buildJourneyPlan();state=journeySend(journeySend(state,{type:'LeaveShop'}),{type:'EnterStage'});
 const selected=state.handOrder.slice(0,5);for(const [i,id] of selected.entries()){const card=state.deckInstances.find(c=>c.id===id)!;Object.assign(card,{rank:focus==='straight'?i+3:[2,4,7,9,12][i],suit:focus==='flush'?'clubs':i%2?'hearts':'spades'});}
 return {state,selected};
}
