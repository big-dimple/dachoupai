import {createRun,type R2RunState} from '../../src/domain/run';
import {r2Price} from '../../src/domain/r2Shop';
import {journeySend} from './build-journey';
/** Controlled shelf source only; initial cash, deal, rules and rewards stay real. Not normal acquisition evidence. */
export function growthPlan(id:'a05'|'d03',legacy=false,characterId:'erxiang'|'amo'='erxiang'){
 let s=createRun({seed:'group-natural-17',runId:'controlled/growth/'+id,characterId,rulesVersion:'r2',r2Profile:legacy?undefined:'group-upgrade-v1',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 const offer=s.shop!.offers[0];Object.assign(offer,{definitionId:id,price:r2Price(id,'none',s),edition:'none'});
 s=journeySend(s,{type:'BuyOffer',offerId:offer.offerId});s=journeySend(journeySend(s,{type:'LeaveShop'}),{type:'EnterStage'});return s;
}
export const firstGrowthIds=['hearts-2','spades-2','clubs-14','diamonds-14'];
export const secondGrowthIds=['diamonds-5','diamonds-4','spades-4','clubs-5'];
/** Only real public discards to expose an assist scenario; no extra cards or cash. */
export function growthAssistPlan(){
 let s=growthPlan('d03',false,'amo');
 const singles=s.handOrder.filter(id=>{const rank=s.deckInstances.find(c=>c.id===id)!.rank;return s.handOrder.filter(other=>s.deckInstances.find(c=>c.id===other)!.rank===rank).length===1;}).slice(0,3);
 return journeySend(s,{type:'DiscardHand',selectedIds:singles});
}
