/** PR147 8a4852c6 model adapted to the explicit 4d2ff4ca baseline.
 * Controlled evaluation only. No product code imports this file. */
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
import {r2ChapterBossIds,lockR2ChapterTargets} from '../../src/domain/r2Chapter';

export const BASE_SHA='4d2ff4ca8487f2f00b55516822d1a28ac3c1751f';
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
 s.seenBossIds=[];
 for(let c=1;c<=chapter;c++){
  const pool=r2ChapterBossIds(c,s.tourMode)!;
  s.seenBossIds.push(pool.find(id=>!s.seenBossIds.includes(id)&&id!=='B16')??pool[0]);
 }
 s.boss={definitionId:s.seenBossIds.at(-1)! as R2RunState['boss']['definitionId'],disabledSuit:s.seenBossIds.at(-1)==='B03'?'spades':null};
 s.shop!.visitIndex=s.stageIndex;
 s.chapterTargetPlan=lockR2ChapterTargets(s.chapter,s.tourMode,s.difficulty,s.boss);
 assertRunInvariants(s);return s;
}
export function held(s:R2RunState,ids:string[]){s.jokers=ids.map((id,i)=>r2CreateJoker(id,'held/'+i,r2Price(id,'none',s),'none',s));assertRunInvariants(s);return s;}
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

/** Fixed-card conditional sums, never expected lifetime income. */
function windowDelta(keep:ReturnType<typeof sequence>,change:ReturnType<typeof sequence>,n:number){
 const sum=(rows:typeof keep)=>rows.slice(0,n).reduce((v,t)=>v+BigInt(t.score),0n);
 return {hands:n,keep:sum(keep).toString(),change:sum(change).toString(),delta:(sum(change)-sum(keep)).toString()};
}
function choose(n:number,k:number):bigint {
 if(k<0||k>n)return 0n;
 let v=1n;for(let i=1;i<=k;i++)v=v*BigInt(n-i+1)/BigInt(i);return v;
}
/** Uniform fresh sample only; no prediction from current hidden piles. */
export function atLeast(N:number,K:number,h:number,min:number){
 if(![N,K,h,min].every(Number.isSafeInteger)||N<0||K<0||K>N||h<0||h>N||min<0)throw Error('invalid-sample');
 let favorable=0n;for(let k=min;k<=Math.min(K,h);k++)favorable+=choose(K,k)*choose(N-K,h-k);
 return {favorable:favorable.toString(),total:choose(N,h).toString()};
}
function lifetimeWindows(){
 return (['group','straight','flush'] as const).map(route=>{
  const s=fixture(route),o=stock(s,'f06'),before=JSON.stringify(s);
  const bought=send(s,{type:'BuyOffer',offerId:o.offerId});
  const keep=sequence(s,route,5),change=sequence(bought,route,5);
  // An existing +50 source is a marginal-score diagnostic, never a new
  // offer with mature growth. Its purchase/survival is not predicted.
  const heatSource=held(structuredClone(s),['b10']);heatSource.jokers[0].growth={heat:{n:'50',d:'1'}};
  const plus50=sequence(heatSource,route,1)[0];
  if(JSON.stringify(s)!==before)throw Error('window-mutated-input');
  return {route,chapter:s.chapter,stageIndex:s.stageIndex,
   cost:{goldBefore:s.gold,paid:s.gold-bought.gold,useFee:0,refund:0,goldAfter:bought.gold,slotDelta:1,newUses:4},
   fixedCards:hand(s,route),baselineHeat:keep[0].heat,baselineMultiplier:keep[0].multiplier,keep,change,
   windows:[1,4,5].map(n=>windowDelta(keep,change,n)),
   plus50:{source:'existing b10 heat=50, ordinary edition; not new-purchase growth',score:plus50.score,
    delta:(BigInt(plus50.score)-BigInt(keep[0].score)).toString(),f06FirstDelta:(BigInt(change[0].score)-BigInt(keep[0].score)).toString()},
   unknown:['future legal hand count','formation odds','clear rewards','future supply','resale','slot replacement','liquidity value'],sourceUnchanged:true};
 });
}

export function makeReport(){
 const early=fixture(),late=fixture('group',8),f=stock(early,'f06'),fl=stock(late,'f06');
 const fresh=held(fixture(),['f06']),used=structuredClone(fresh);used.jokers[0].counters={handsScored:3};
 const sealed=fixture('group',8);sealed.stageIndex=23;sealed.shop!.visitIndex=23;sealed.boss={definitionId:'B16',disabledSuit:null};sealed.seenBossIds[7]='B16';sealed.chapterTargetPlan=lockR2ChapterTargets(8,sealed.tourMode,sealed.difficulty,sealed.boss);assertRunInvariants(sealed);
 const lifetime={early:rating(early,f,'group'),late:rating(late,fl,'group'),suppressedRating:rating(sealed,stock(sealed,'f06'),'group'),fresh:sequence(fresh,'group',5),usedThree:sequence(used,'group',2),suppressed:sequence(fresh,'group',5,{boss:{definitionId:'B16',disabledSuit:null}})};
 const growth=(['group','straight','flush'] as const).map(route=>{
  const id=route==='group'?'b03':route==='straight'?'c04':'c06',s=fixture(route,8),o=stock(s,id),newState=send(s,{type:'BuyOffer',offerId:o.offerId});
  const mature=structuredClone(newState);mature.jokers[0].growth=route==='straight'?{heat:{n:'100',d:'1'}}:{multiplier:{n:route==='group'?'3':'6',d:'1'}};
  const noCondition=fixture(route,8);noCondition.deckInstances=noCondition.deckInstances.filter(c=>route==='group'?c.suit==='spades':route==='straight'?c.rank===7||c.rank===8:c.rank===7);noCondition.drawPile=noCondition.deckInstances.map(c=>c.id);assertRunInvariants(noCondition);
  const earlyState=fixture(route),eo=stock(earlyState,id);
  const midState=fixture(route,3),mo=stock(midState,id);
  return {route,id,mid:rating(midState,mo,route),lastKnownHand:sequence(newState,route,1),late:rating(s,o,route),early:rating(earlyState,eo,route),missing:rating(noCondition,stock(noCondition,id),route),cost:{goldBefore:s.gold,paid:s.gold-newState.gold,useFee:0,refund:0},new:sequence(newState,route,2),mature:sequence(mature,route,2)};
 });
 const s=held(fixture('straight',8),['c04','jiedongfeng','e11','e01','e04']);s.jokers[0].growth={heat:{n:'100',d:'1'}};s.jokers[0].edition='foil';s.jokers[0].paidPrice=r2Price('c04','foil',s);s.jokers[2].growth={coefficient:{n:'3',d:'2'}};const o=stock(s,'f06');
 const replacement=observation(s,()=>({before:sequence(s,'straight',5),choices:[s.jokers[0],s.jokers[3]].map(sold=>{const tx=shopReplacementTransactionFacts(s,o,sold),after=replace(s,o,sold);return {sold:sold.definitionId,rating:rating(s,o,'straight',sold),transaction:tx,compact:shopReplacementCompactFacts(s,sold,tx),gold:after.gold,retainedE11:after.jokers.find(j=>j.definitionId==='e11')?.growth,soldFlag:after.shop?.soldJoker,after:sequence(after,'straight',5),windows:[1,4,5].map(n=>windowDelta(sequence(s,'straight',5),sequence(after,'straight',5),n))};})}));
 const cash=[26,28].map(gold=>{const s=held(fixture(),['b02']);s.gold=gold;const o=stock(s,'e08'),after=send(s,{type:'BuyOffer',offerId:o.offerId});return {before:gold,rating:rating(s,o,'group'),after:after.gold,score:sequence(after,'group',1)};});
 const threshold=held(fixture(),['b02','e02','e06','e05','e11']);threshold.gold=24;threshold.jokers[1].paidPrice=2;threshold.jokers[4].growth={coefficient:{n:'3',d:'2'}};threshold.purchaseCoupons=1;const bo=stock(threshold,'e08');
 const specified=observation(threshold,()=>({unselected:shopPurchaseCashFacts(threshold,bo),choices:[threshold.jokers[1],threshold.jokers[4]].map(sold=>({sold:sold.definitionId,rating:rating(threshold,bo,'group',sold),transaction:shopReplacementTransactionFacts(threshold,bo,sold),after:sequence(replace(threshold,bo,sold),'group',1)}))}));
 const retained=held(fixture(),['b02','e08']);retained.gold=23;const ro=stock(retained,'b10'),retainedAfter=send(retained,{type:'BuyOffer',offerId:ro.offerId});
 const retainedCash=observation(retained,()=>({rating:rating(retained,ro,'group'),losses:shopPurchaseConditionLosses(retained,ro),before:sequence(retained,'group',1),after:sequence(retainedAfter,'group',1),gold:retainedAfter.gold}));
 const tools=(['S03','S04','S07'] as const).map(id=>{
  const s=held(fixture('straight'),['c04','e06','e11']);s.jokers[0].growth={heat:{n:'100',d:'1'}};s.jokers[0].edition='foil';s.jokers[0].paidPrice=r2Price('c04','foil',s);s.jokers[2].growth={coefficient:{n:'3',d:'2'}};
  const toolOffer={offerId:'contract/'+id+'/tool/0',definitionId:id,price:id==='S07'?8:6,consumed:false};s.shop!.toolOffers=[toolOffer];assertRunInvariants(s);const bought=send(s,{type:'BuyOffer',offerId:toolOffer.offerId}),t=bought.consumables.find(t=>t.definitionId===id)!;
  const action:Action={type:'UseConsumable',instanceId:t.instanceId,targetIds:id==='S03'?[s.deckInstances.find(c=>c.id==='spades-7')!.id]:id==='S07'?[s.jokers[1].instanceId]:[],...(id==='S04'?{suit:'hearts' as const}:{}),...(id==='S07'?{sacrificeId:s.jokers[0].instanceId}:{})};
  const after=send(bought,action),entered=send(send(after,{type:'LeaveShop'}),{type:'EnterStage'});
  const bad=structuredClone(bought);if(id==='S03')bad.spectralModifiers.handsPenalty=2;else if(id==='S04')bad.deckInstances.forEach(c=>c.suit='hearts');else bad.jokers[1].edition='polychrome';assertRunInvariants(bad);const before=JSON.stringify(bad),failure=command(bad,action);if(failure.ok)throw Error('expected-tool-failure');if(before!==JSON.stringify(bad))throw Error('failed-tool-mutated-input');
  const sample=(state:R2RunState)=>{const cards=state.deckInstances.filter(c=>!state.destroyedIds.includes(c.id)),h=r2HandLimit(state);return {N:cards.length,h,K:cards.filter(c=>id==='S03'?c.rank===7:c.suit==='hearts').length};};
  const [a,b]=[sample(bought),sample(after)];
  const formation=id==='S07'?null:{event:id==='S03'?'at least three rank-7 cards in fresh hand':'at least five hearts in fresh hand',assumption:'uniform without replacement, fresh stage hand, no disabled cards or hero manipulation; existence only, no score/clear probability',before:{...a,...atLeast(a.N,a.K,a.h,id==='S03'?3:5)},after:{...b,...atLeast(b.N,b.K,b.h,id==='S03'?3:5)}};
  return {id,formation,purchaseGold:[s.gold,bought.gold],useGold:[bought.gold,after.gold],beforeResources:{hands:r2HandsBudget(bought),hand:r2HandLimit(bought),cards:bought.deckInstances.length},afterResources:{hands:r2HandsBudget(after),hand:r2HandLimit(after),cards:after.deckInstances.length},entry:{hands:entered.stage!.initialHands,hand:entered.stage!.handLimit},beforeJokers:bought.jokers,afterJokers:after.jokers,soldFlag:after.shop?.soldJoker,beforeScore:sequence(bought,'straight',1),afterScore:sequence(after,'straight',1),failure:{code:failure.code,unchanged:true},rngUnchanged:JSON.stringify(after.rng)===JSON.stringify(bought.rng)};
 });
 return {baseSha:BASE_SHA,scope:'Controlled scorer sequences and clone-only current domain transactions. Not natural play, acquisition, predictive formation probability, lifetime EV or product calibration; formation fractions are conditional uniform fresh-sample calculations only.',fixtureContract:'Chapter-8 state is an invariant-valid projection with seven mandatory Boss ledger entries and zero family qualifications, not a proven acquisition/clear history. Fixed public cards repeat across scorer calls; budgets reset for the fifth call, no draw or clear reward simulation. Gold and owned equipment are explicit controlled inputs.',scoreCards:Object.fromEntries((['group','straight','flush'] as const).map(route=>[route,hand(fixture(route),route)])),identity:newRunIdentity('laohuan','group'),lifetimeWindows:lifetimeWindows(),lifetime,growth,replacement,cash,specified,retainedCash,tools};
}
