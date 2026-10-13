/** Controlled current-rule contracts only. No product code imports this file. */
import {createRun,applyCommand,assertRunInvariants,type R2RunState,type Action} from '../../src/domain/run';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {r2CreateJoker,r2ScoreContext} from '../../src/domain/r2Run';
import {r2JokerDefinitionsFor} from '../../src/domain/r2ContentProfiles';
import {r2Price,type R2Offer} from '../../src/domain/r2Shop';
import {r2HandLimit,r2HandsBudget} from '../../src/domain/r2Resources';
import {scoreR2Hand,type ScoreInput} from '../../src/domain/scoreR2';
import {shopRecommendation} from '../../src/game/ShopRecommendation';
import {shopPurchaseCashFacts,shopPurchaseConditionLosses,shopReplacementTransactionFacts,shopReplacementCompactFacts} from '../../src/game/ShopRouteRelations';
import type {BuildFocus} from '../../src/game/BuildDirectionPreferences';
import type {PlayingCard} from '../../src/cards/types';
import {exactScore} from '../scoring-calibration/model';

export const BASE_SHA='ee59f1ed295c64b390de9f786c4ceca2ba40b715';
export function command(s:R2RunState,action:Action){return applyCommand(s,{runId:s.runId,commandId:s.runId+'/contract/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});}
export function send(s:R2RunState,action:Action){const r=command(s,action);if(!r.ok)throw Error(r.code);assertRunInvariants(r.state);return r.state;}
export function fixture(route:BuildFocus='group',chapter=1){
 let s=createRun({seed:'cost-contract-fixed',runId:'cost-contract',characterId:'laohuan',rulesVersion:'r2',r2Identity:newRunIdentity('laohuan',route),openingRoute:route,modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 for(const type of ['LeaveShop','SkipStage','OpenShop'] as const)s=send(s,{type});
 // Explicit late-stage projection with mandatory Boss clear ledger, no family
 // qualifications. Invariant-valid controlled input, not proof of reachable history.
 s.chapter=chapter;s.stageIndex=Math.max(1,(chapter-1)*3);s.gold=40;s.purchaseCoupons=0;s.jokers=[];s.stage=null;
 const settlements=Array.from({length:chapter-1},(_,i)=>({stageIndex:i*3+2,families:[]}));
 s.routeGrowth={clears:settlements.length,G:0,S:0,F:0,settlements};
 s.seenBossIds=[s.boss.definitionId,...['B01','B02','B05','B06','B07','B08','B09','B10'].filter(id=>id!==s.boss.definitionId)].slice(0,chapter);
 s.boss={definitionId:s.seenBossIds.at(-1)! as R2RunState['boss']['definitionId'],disabledSuit:null};
 s.shop!.visitIndex=s.stageIndex;
 assertRunInvariants(s);return s;
}
export function held(s:R2RunState,ids:string[]){s.jokers=ids.map((id,i)=>r2CreateJoker(id,'held/'+i,8,'none',s));assertRunInvariants(s);return s;}
export function stock(s:R2RunState,id:string):R2Offer{const o={offerId:'stock/'+id,definitionId:id,price:r2Price(id,'none',s),edition:'none' as const,consumed:false};s.shop!.offers=[o];assertRunInvariants(s);return o;}
export function hand(s:R2RunState,route:BuildFocus):PlayingCard[]{const ids=route==='group'?['spades-7','hearts-7']:route==='straight'?['spades-6','hearts-7','clubs-8','diamonds-9','spades-10']:['hearts-2','hearts-5','hearts-8','hearts-10','hearts-13'];return ids.map(id=>structuredClone(s.deckInstances.find(c=>c.id===id)!));}
export function scoreInput(s:R2RunState,route:BuildFocus,extra:Partial<ScoreInput>={}):ScoreInput{
 const cards=hand(s,route),ids=cards.map(c=>c.id);
 return {rulesVersion:'r2',runId:s.runId,rootId:'controlled-cost-hand',hand:cards,selectedIds:ids,disabledIds:[],jokers:s.jokers,definitions:r2JokerDefinitionsFor(s),handLevels:s.handLevels,playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:s.rng.rule,...r2ScoreContext(s,cards,ids),...extra};
}
export function sequence(s:R2RunState,route:BuildFocus,n:number,extra:Partial<ScoreInput>={}){
 let jokers=structuredClone(s.jokers),rng=s.rng.rule;return Array.from({length:n},(_,i)=>{
  const t=scoreR2Hand(scoreInput(s,route,{...extra,jokers,rng,playIndex:i%4+1,handsBeforePlay:4-i%4}));jokers=structuredClone(t.jokers);rng=t.rng;
  if(exactScore(t.accumulator.H,t.accumulator.M)!==t.finalScore)throw Error('final-floor-mismatch');
  return {score:t.finalScore,heat:t.accumulator.H,multiplier:t.accumulator.M,handType:t.handType,jokers:jokers.map(j=>({id:j.definitionId,growth:j.growth,...(j.counters?{counters:j.counters}:{})})),
   relevantEvents:t.events.filter(e=>['increment-hands-scored','destroy-joker','add-growth','read-growth','multiply-multiplier','read-coefficient'].includes(e.operation)).map(e=>({id:e.sourceDefinitionId,phase:e.phase,operation:e.operation,value:e.value}))};
 });
}
function rating(s:R2RunState,o:R2Offer,route:BuildFocus,sold?:R2RunState['jokers'][number]){const r=shopRecommendation(s,o,route,sold);return {stars:r.stars,reason:r.reason,condition:r.condition,basis:{potentialStages:r.facts.potentialStages,growthWindow:r.facts.growthWindow,initialGrowth:r.facts.initialGrowth,additiveSource:r.facts.additiveSource}};}
export function replace(s:R2RunState,o:R2Offer,sold:R2RunState['jokers'][number]){return send(send(s,{type:'SellJoker',instanceId:sold.instanceId}),{type:'BuyOffer',offerId:o.offerId});}
function observation<T>(s:R2RunState,read:()=>T){const old=JSON.stringify(s),r=read();if(JSON.stringify(s)!==old)throw Error('analysis-mutated-input');return r;}

export function makeReport(){
 const early=fixture(),late=fixture('group',8),f=stock(early,'f06'),fl=stock(late,'f06');
 const fresh=held(fixture(),['f06']),used=structuredClone(fresh);used.jokers[0].counters={handsScored:3};
 const sealed=fixture('group',8);sealed.stageIndex=23;sealed.shop!.visitIndex=23;sealed.boss={definitionId:'B16',disabledSuit:null};sealed.seenBossIds[7]='B16';assertRunInvariants(sealed);
 const lifetime={early:rating(early,f,'group'),late:rating(late,fl,'group'),suppressedRating:rating(sealed,stock(sealed,'f06'),'group'),fresh:sequence(fresh,'group',5),usedThree:sequence(used,'group',2),suppressed:sequence(fresh,'group',5,{boss:{definitionId:'B16',disabledSuit:null}})};
 const growth=(['straight','flush'] as const).map(route=>{
  const id=route==='straight'?'c04':'c06',s=fixture(route,8),o=stock(s,id),newState=send(s,{type:'BuyOffer',offerId:o.offerId});
  const mature=structuredClone(newState);mature.jokers[0].growth=route==='straight'?{heat:{n:'100',d:'1'}}:{multiplier:{n:'6',d:'1'}};
  const noCondition=fixture(route,8);noCondition.deckInstances=noCondition.deckInstances.filter(c=>route==='straight'?c.rank===7||c.rank===8:c.rank===7);noCondition.drawPile=noCondition.deckInstances.map(c=>c.id);assertRunInvariants(noCondition);
  const earlyState=fixture(route),eo=stock(earlyState,id);
  return {route,id,late:rating(s,o,route),early:rating(earlyState,eo,route),missing:rating(noCondition,stock(noCondition,id),route),gold:newState.gold,new:sequence(newState,route,2),mature:sequence(mature,route,2)};
 });
 const s=held(fixture('straight',8),['c04','jiedongfeng','e11','e01','e04']);s.jokers[0].growth={heat:{n:'100',d:'1'}};s.jokers[0].edition='foil';s.jokers[2].growth={coefficient:{n:'3',d:'2'}};const o=stock(s,'f06');
 const replacement=observation(s,()=>({before:sequence(s,'straight',5),choices:[s.jokers[0],s.jokers[3]].map(sold=>{const tx=shopReplacementTransactionFacts(s,o,sold),after=replace(s,o,sold);return {sold:sold.definitionId,rating:rating(s,o,'straight',sold),transaction:tx,compact:shopReplacementCompactFacts(s,sold,tx),gold:after.gold,retainedE11:after.jokers.find(j=>j.definitionId==='e11')?.growth,soldFlag:after.shop?.soldJoker,after:sequence(after,'straight',5)};})}));
 const cash=[26,28].map(gold=>{const s=held(fixture(),['b02']);s.gold=gold;const o=stock(s,'e08'),after=send(s,{type:'BuyOffer',offerId:o.offerId});return {before:gold,rating:rating(s,o,'group'),after:after.gold,score:sequence(after,'group',1)};});
 const threshold=held(fixture(),['b02','e02','e06','e05','e11']);threshold.gold=24;threshold.jokers[1].paidPrice=2;threshold.jokers[4].growth={coefficient:{n:'3',d:'2'}};threshold.purchaseCoupons=1;const bo=stock(threshold,'e08');
 const specified=observation(threshold,()=>({unselected:shopPurchaseCashFacts(threshold,bo),choices:[threshold.jokers[1],threshold.jokers[4]].map(sold=>({sold:sold.definitionId,rating:rating(threshold,bo,'group',sold),transaction:shopReplacementTransactionFacts(threshold,bo,sold),after:sequence(replace(threshold,bo,sold),'group',1)}))}));
 const retained=held(fixture(),['b02','e08']);retained.gold=23;const ro=stock(retained,'b10'),retainedAfter=send(retained,{type:'BuyOffer',offerId:ro.offerId});
 const retainedCash=observation(retained,()=>({rating:rating(retained,ro,'group'),losses:shopPurchaseConditionLosses(retained,ro),before:sequence(retained,'group',1),after:sequence(retainedAfter,'group',1),gold:retainedAfter.gold}));
 const tools=(['S03','S04','S07'] as const).map(id=>{
  const s=held(fixture('straight'),['c04','e06','e11']);s.jokers[0].growth={heat:{n:'100',d:'1'}};s.jokers[0].edition='foil';s.jokers[2].growth={coefficient:{n:'3',d:'2'}};
  const toolOffer={offerId:'contract/'+id+'/tool/0',definitionId:id,price:id==='S07'?8:6,consumed:false};s.shop!.toolOffers=[toolOffer];assertRunInvariants(s);const bought=send(s,{type:'BuyOffer',offerId:toolOffer.offerId}),t=bought.consumables.find(t=>t.definitionId===id)!;
  const action:Action={type:'UseConsumable',instanceId:t.instanceId,targetIds:id==='S03'?[s.deckInstances.find(c=>c.id==='spades-7')!.id]:id==='S07'?[s.jokers[1].instanceId]:[],...(id==='S04'?{suit:'hearts' as const}:{}),...(id==='S07'?{sacrificeId:s.jokers[0].instanceId}:{})};
  const after=send(bought,action),entered=send(send(after,{type:'LeaveShop'}),{type:'EnterStage'});
  const bad=structuredClone(bought);if(id==='S03')bad.spectralModifiers.handsPenalty=2;else if(id==='S04')bad.deckInstances.forEach(c=>c.suit='hearts');else bad.jokers[1].edition='polychrome';assertRunInvariants(bad);const before=JSON.stringify(bad),failure=command(bad,action);if(failure.ok)throw Error('expected-tool-failure');if(before!==JSON.stringify(bad))throw Error('failed-tool-mutated-input');
  return {id,purchaseGold:[s.gold,bought.gold],useGold:[bought.gold,after.gold],beforeResources:{hands:r2HandsBudget(bought),hand:r2HandLimit(bought),cards:bought.deckInstances.length},afterResources:{hands:r2HandsBudget(after),hand:r2HandLimit(after),cards:after.deckInstances.length},entry:{hands:entered.stage!.initialHands,hand:entered.stage!.handLimit},beforeJokers:bought.jokers,afterJokers:after.jokers,soldFlag:after.shop?.soldJoker,beforeScore:sequence(bought,'straight',1),afterScore:sequence(after,'straight',1),failure:{code:failure.code,unchanged:true},rngUnchanged:JSON.stringify(after.rng)===JSON.stringify(bought.rng)};
 });
 return {baseSha:BASE_SHA,scope:'Controlled scorer sequences and clone-only current domain transactions. Not natural play, acquisition, probability, lifetime EV or product calibration.',fixtureContract:'Chapter-8 state is an invariant-valid projection with seven mandatory Boss ledger entries and zero family qualifications, not a proven acquisition/clear history. Fixed public cards repeat across scorer calls; budgets reset for the fifth call, no draw or clear reward simulation. Gold and owned equipment are explicit controlled inputs.',scoreCards:Object.fromEntries((['group','straight','flush'] as const).map(route=>[route,hand(fixture(route),route)])),identity:newRunIdentity('laohuan','group'),lifetime,growth,replacement,cash,specified,retainedCash,tools};
}
