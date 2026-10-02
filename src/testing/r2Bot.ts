import type {Action,R2RunState} from '../domain/run';
import {previewR2Hand} from '../domain/scoreR2';
import {R2_JOKERS} from '../content/r2Schema';
import {r2ScoreContext} from '../domain/r2Run';
import {r2PurchasePrice,r2PaidRerollPrice} from '../domain/r2Shop';
import {r2JokerCapacity} from '../domain/r2Resources';
import {r2RunModeConfig} from '../content/r2Modes';

export function publicR2View(state:R2RunState){
  return {phase:state.phase,characterId:state.characterId,mode:state.mode,difficulty:state.difficulty,challengeId:state.challengeId,programsEnabled:state.programsEnabled,gold:state.gold,stageIndex:state.stageIndex,boss:{...state.boss},chapter:state.chapter,purchaseCoupons:state.purchaseCoupons,chapterSkipConsumable:state.chapterSkipConsumable,
    hand:state.handOrder.map(id=>({...state.deckInstances.find(c=>c.id===id)!})),
    stage:state.stage?structuredClone(state.stage):null,jokers:structuredClone(state.jokers),handLevels:{...state.handLevels},
    consumables:state.consumables.map(c=>({...c})),longTermItems:[...state.longTermItems],rerollCost:state.shop&&r2RunModeConfig(state).reroll.allowed?(state.shop.freeRerolls?0:r2PaidRerollPrice(state)):null,rerollCount:state.shop?.rerollCount??0,offers:state.shop?.offers.filter(o=>!o.consumed).map(o=>({...o,price:r2PurchasePrice(state,o)}))??[],toolOffers:state.shop?.toolOffers.filter(o=>!o.consumed).map(o=>({...o,price:r2PurchasePrice(state,o)}))??[],itemOffers:state.shop?.itemOffers.filter(o=>!o.consumed).map(o=>({...o,price:r2PurchasePrice(state,o)}))??[]};
}
export function chooseR2Action(view:ReturnType<typeof publicR2View>):Action|null {
  if(view.phase==='shop'){
    const priority=view.characterId==='amo'?['pengci','tiesuanpan','huimaqiang','mantangcai','jiedongfeng']:['mantangcai','jiedongfeng','tiesuanpan','pengci','huimaqiang'];
    const offer=priority.map(id=>view.offers.find(o=>o.definitionId===id&&o.price<=view.gold&&!view.jokers.some(j=>j.definitionId===id))).find(Boolean);
    return offer&&view.jokers.length<r2JokerCapacity(view)?{type:'BuyOffer',offerId:offer.offerId}:{type:'LeaveShop'};
  }
  if(view.phase==='stage-ready')return {type:'EnterStage'};
  if(view.phase==='stage-cleared')return {type:'OpenShop'};
  if(view.phase!=='await-input'||!view.stage)return null;
  let best:{ids:string[];score:bigint}|null=null;
  for(let mask=1;mask<1<<view.hand.length;mask++){
    const selected=view.hand.filter((_,i)=>mask&(1<<i));if(selected.length>5)continue;
    const preview=previewR2Hand({rulesVersion:'r2',runId:'public-bot',rootId:'preview',hand:view.hand,selectedIds:selected.map(c=>c.id),disabledIds:view.stage.disabledIds,jokers:view.jokers,definitions:R2_JOKERS,handLevels:view.handLevels,playIndex:view.stage.playIndex+1,handsBeforePlay:view.stage.handsLeft,previousHandType:view.stage.previousHandType,wager:view.stage.wagerSelected,...r2ScoreContext(view,view.hand,selected.map(c=>c.id))});
    const score=preview.possibleScores.map(BigInt).reduce((a,b)=>a<b?a:b);
    if(!best||score>best.score)best={ids:selected.map(c=>c.id),score};
  }
  return best?{type:'PlayHand',selectedIds:best.ids}:{type:'AbandonRun'};
}
