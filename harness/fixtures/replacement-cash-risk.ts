import {f06RecommendationFixture} from './f06-recommendation';
import {r2CreateJoker} from '../../src/domain/r2Run';
import {r2Price} from '../../src/domain/r2Shop';
import {assertRunInvariants} from '../../src/domain/run';
import {applyCommand} from '../../src/domain/run';
import {shopOfferGuidance} from '../../src/game/ShopOfferGuidance';
import {shopC2Score} from './shop-c2-align';

/** Current invariant-valid controlled shop, not natural acquisition or play. */
export function replacementCashRiskFixture(gold=22,id='b10',edition:'none'|'foil'='none'){
 const s=f06RecommendationFixture(2);s.gold=gold;
 s.jokers=['e08','b02','e01','e03','e04'].map((id,i)=>r2CreateJoker(id,'held/'+id,i===2?0:8,'none',s));
 s.shop!.offers=[{offerId:'public/'+id,definitionId:id,price:r2Price(id,edition,s),edition,consumed:false}];
 assertRunInvariants(s);return s;
}

/** Same-input arithmetic evidence only; no draw, growth trajectory or natural claim. */
export function replacementCashRiskVectors(){
 return ['loss','threshold-preserved','actual-compensation','unknown-future'].map(key=>{
  const s=replacementCashRiskFixture(22,key==='actual-compensation'?'b06':'b10'),o=s.shop!.offers[0],ids=['spades-7','hearts-7'];
  if(key==='threshold-preserved')s.jokers[2].paidPrice=8;
  if(key==='unknown-future')s.jokers[3]=r2CreateJoker('e05','held/buy-growth',8,'none',s);
  if(key==='actual-compensation')for(const id of ids){const c=s.deckInstances.find(c=>c.id===id)!;c.enhancement='multiplier-paper';c.edition='holographic';}
  assertRunInvariants(s);const before=structuredClone(s),a=shopC2Score(s,ids).trace,g=shopOfferGuidance(s,o,s.jokers[2]);
  let after=s,purchaseBase=s;for(const action of [{type:'SellJoker' as const,instanceId:s.jokers[2].instanceId},{type:'BuyOffer' as const,offerId:o.offerId}]){const r=applyCommand(after,{runId:after.runId,commandId:after.runId+'/vector/'+(after.commandSeq+1),expectedSeq:after.commandSeq,action});if(!r.ok)throw Error(r.code);after=r.state;if(action.type==='SellJoker')purchaseBase=after;}
  const b=shopC2Score(after,ids).trace;if(JSON.stringify(s)!==JSON.stringify(before))throw Error('vector-mutated-input');
  const relevant=(t:ReturnType<typeof shopC2Score>['trace'])=>t.events.filter(e=>['e08','b06','e05'].includes(e.sourceDefinitionId)).map(e=>({source:e.sourceDefinitionId,instanceId:e.sourceInstanceId,operation:e.operation,value:e.value}));
  return {key,identity:{contentVersion:s.contentVersion,contentHash:s.contentHash},cards:ids.map(id=>s.deckInstances.find(c=>c.id===id)),stars:g.stars,ratingReason:g.recommendation.reason,ratingCondition:g.condition,ratingBasis:'authoritative-current-purchase',purchaseGold:[purchaseBase.gold,after.gold],purchaseScores:[shopC2Score(purchaseBase,ids).trace.finalScore,b.finalScore],wholeTradeGold:[s.gold,after.gold],wholeTradeScores:[a.finalScore,b.finalScore],beforeJokers:s.jokers,purchaseBaseJokers:purchaseBase.jokers,afterJokers:after.jokers,afterScoreJokers:b.jokers,beforeEvents:relevant(a),afterEvents:relevant(b),inputUnchanged:true};
 });
}
