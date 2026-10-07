import {stageGiftPlan} from './stage-gift';
/** Controlled shared rules, public hand and existing growth; no claim of natural acquisition. */
export function experiencePlan(capped=false){
 const {state}=stageGiftPlan();
 state.jokers=[{instanceId:'owned/b10',definitionId:'b10',paidPrice:4,growth:{heat:{n:capped?'100':'10',d:'1'}}},{instanceId:'owned/b03',definitionId:'b03',paidPrice:6,growth:{multiplier:{n:capped?'3':'1',d:capped?'1':'4'}}},{instanceId:'owned/b06',definitionId:'b06',paidPrice:8,growth:{}},{instanceId:'owned/b08',definitionId:'b08',paidPrice:6,growth:{}}];
 state.stage!.initialJokerIds=state.jokers.map(j=>j.instanceId);
 Object.assign(state.deckInstances[0],{rank:7,suit:'clubs'});Object.assign(state.deckInstances[1],{rank:7,suit:'hearts'});Object.assign(state.deckInstances[2],{rank:9,suit:'spades'});Object.assign(state.deckInstances[3],{rank:9,suit:'diamonds'});
 return {state,first:state.handOrder.slice(0,2),twoPairs:state.handOrder.slice(0,4)};
}
