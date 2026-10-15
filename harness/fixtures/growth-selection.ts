import {createRun,applyCommand,type Action} from '../../src/domain/run';
import {r2CreateJoker} from '../../src/domain/r2Run';
import {lockR2ChapterTargets} from '../../src/domain/r2Chapter';
import {newRunIdentity} from '../../src/game/RunLaunch';
/** Controlled existing growth and public hand. No natural acquisition/play claim. */
export function growthSelectionPlan(limited=false){
 let state=createRun({seed:'growth-selection',runId:'controlled/growth-selection',characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo','flush'),openingRoute:'flush',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 const send=(action:Action)=>{const r=applyCommand(state,{runId:state.runId,commandId:state.runId+'/command/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action});if(!r.ok)throw Error(r.code);state=r.state;};
 send({type:'BuyOffer',offerId:state.shop!.offers.find(o=>o.definitionId==='c06')!.offerId});send({type:'LeaveShop'});
 if(limited){state.shop=null;state.chapter=3;state.stageIndex=8;state.boss={definitionId:'B06',disabledSuit:null};state.seenBossIds=['B01','B02','B06'];state.chapterTargetPlan=lockR2ChapterTargets(3,state.tourMode,state.difficulty,state.boss);for(const stageIndex of [2,5]){state.routeGrowth!.settlements.push({stageIndex,families:[]});state.routeGrowth!.clears++;}state.jokers.unshift(r2CreateJoker('mantangcai','controlled/filler',4,'none',state));}
 send({type:'EnterStage'});
 state.jokers.find(j=>j.definitionId==='c06')!.growth.multiplier={n:'1',d:'1'};
 const fullHouse=['hearts-7','spades-7','clubs-7','hearts-9','spades-9'];
 const flush=['hearts-7','hearts-9','hearts-2','hearts-4','hearts-11'];
 state.handOrder=[...new Set([...fullHouse,...flush])];
 state.drawPile=state.deckInstances.map(c=>c.id).filter(id=>!state.handOrder.includes(id));
 return {state,fullHouse,flush};
}
