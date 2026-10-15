/** Offline controlled comparisons only. No runtime module imports this file. */
import assert from 'node:assert/strict';
import {createRun,applyCommand,type R2RunState,type Action,type Command} from '../src/domain/run';
import {assertR2Invariants,r2CreateJoker,r2ScoreContext,makeR2Shop} from '../src/domain/r2Run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {R2_BOUNDED_CLEAR_VERSION,R2_BOUNDED_CLEAR_HASH} from '../src/domain/r2GroupUpgrade';
import {r2ChapterBossIds,lockR2ChapterTargets,r2StageSpec,type R2BossId} from '../src/domain/r2Chapter';
import {r2HandLimit} from '../src/domain/r2Resources';
import {r2ToolAcquisitionPool,r2PurchasePrice} from '../src/domain/r2Shop';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {r2PracticeQuotes} from '../src/domain/r2Practice';
import {R2_TOOLS,R2_TOOL_CATALOG} from '../src/content/r2Tools';
import {previewR2Hand,scoreR2Hand,type ScoreInput} from '../src/domain/scoreR2';
import {R2_HAND_TYPES,type R2HandType} from '../src/domain/evaluateR2';
import {r2RouteFactor,type R2RouteFamily} from '../src/domain/r2RouteGrowth';
import {stableHash} from '../src/domain/hash';

export const probes=['s04-public-window/A','s04-public-window/B'] as const;
type Route='group'|'straight'|'flush';
type Policy='none'|'current-full'|'chapter3-full'|'chapter3-nine'|'chapter3-sixty';
const policies:Policy[]=['none','current-full','chapter3-full','chapter3-nine'];
const family:Record<Route,R2RouteFamily>={group:'G',straight:'S',flush:'F'};
export function send(s:R2RunState,action:Action){
 const command:Command={runId:s.runId,commandId:s.runId+'/s04/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action};
 const r=applyCommand(s,command);if(!r.ok)throw Error(action.type+':'+r.code);return r.state as R2RunState;
}
/** Paid objects/history/levels below are planted, never claimed naturally obtainable on this date. */
export function fixture(route:Route,index:number,seed:string,boss:R2BossId='B03'){
 const identity=newRunIdentity('laohuan',route);
 let s=createRun({rulesVersion:'r2',characterId:'laohuan',seed,runId:'s04/'+seed,...{r2Identity:identity},openingRoute:route,modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 s.stageIndex=index;s.chapter=Math.floor(index/3)+1;s.gold=index===0?6:24;
 s.handLevels=Object.fromEntries(R2_HAND_TYPES.map(t=>[t,index===0?1:3]));
 const ids=route==='group'?['mantangcai','b10']:route==='straight'?['c04']:['c06'];
 s.jokers=ids.map(id=>r2CreateJoker(id,'s04/owned/'+id, id==='mantangcai'?6:4,undefined,s));
 if(index>0){const j=s.jokers.at(-1)!;j.growth=route==='flush'?{multiplier:{n:'2',d:'1'}}:{heat:{n:'40',d:'1'}};}
 s.routeGrowth={clears:index,G:route==='group'?index:0,S:route==='straight'?index:0,F:route==='flush'?index:0,settlements:Array.from({length:index},(_,i)=>({stageIndex:i,families:[family[route]]}))};
 const previous:string[]=[];
 for(let chapter=1;chapter<s.chapter;chapter++)previous.push(r2ChapterBossIds(chapter)!.find(id=>id!==boss&&!previous.includes(id))!);
 s.seenBossIds=[...previous,boss];s.boss={definitionId:boss,disabledSuit:boss==='B03'?'hearts':null};
 s.chapterTargetPlan=lockR2ChapterTargets(s.chapter,s.tourMode,s.difficulty,s.boss);
 // makeR2Shop normally runs inside OpenShop, whose commit supplies this receipt.
 // This entire entry is a planted fixture, so bind its synthetic shop entry explicitly.
 const entry:Command={runId:s.runId,commandId:s.runId+'/planted-shop',expectedSeq:s.commandSeq,action:{type:'OpenShop'}};
 makeR2Shop(s,true);s.commandSeq++;s.receipts.push({commandId:entry.commandId,seq:s.commandSeq,fingerprint:stableHash(entry)});
 assertR2Invariants(s);return s;
}
function deckSummary(s:R2RunState){return {living:s.deckInstances.length-s.destroyedIds.length,hearts:s.deckInstances.filter(c=>!s.destroyedIds.includes(c.id)&&c.suit==='hearts').length,handLimit:r2HandLimit(s),handPenalty:s.spectralModifiers.handPenalty,gold:s.gold};}
/** Candidate is a SHADOW edit after the real paid S04 transaction, never new runtime behavior. */
export function acquire(input:R2RunState,policy:Policy){
 let s=structuredClone(input);const before=deckSummary(s),snapshot=stableHash(input);
 const thresholdMet=before.hearts*5>=before.living*3;
 const available=policy==='current-full'||policy!=='none'&&s.chapter>=3&&(policy!=='chapter3-sixty'||thresholdMet);
 if(!available)return {state:s,record:{policy,status:policy==='none'?'not-bought':s.chapter<3?'chapter-gated':'density-gated',paid:0,before,after:before,changedIds:[] as string[]}};
 const originals=structuredClone(s.deckInstances),offer={offerId:'s04/planted/tool/0',definitionId:'S04',price:6,consumed:false};
 s.shop!.toolOffers=[offer];const paid=r2PurchasePrice(s,offer);
 s=send(s,{type:'BuyOffer',offerId:offer.offerId});
 const item=s.consumables.find(c=>c.definitionId==='S04')!;
 s=send(s,{type:'UseConsumable',instanceId:item.instanceId,targetIds:[],suit:'hearts'});
 if(policy==='chapter3-nine'){
  // Public high-rank selection, fixed before deals; deliberately favorable rather than random targets.
  const selected=new Set(originals.filter(c=>c.suit!=='hearts').sort((a,b)=>b.rank-a.rank||a.id.localeCompare(b.id)).slice(0,9).map(c=>c.id));
  s.deckInstances.forEach(c=>{if(!selected.has(c.id))c.suit=originals.find(o=>o.id===c.id)!.suit;});
 }
 const changedIds=s.deckInstances.filter(c=>c.suit!==originals.find(o=>o.id===c.id)!.suit).map(c=>c.id);
 assert.equal(changedIds.length,policy==='chapter3-nine'?9:before.living-before.hearts);
 assert.equal(s.gold,before.gold-paid);assert.equal(r2HandLimit(s),before.handLimit-1);
 assert.deepEqual(s.drawPile,input.drawPile);assert.deepEqual(s.rng.rule,input.rng.rule);
 s.deckInstances.forEach(c=>assert.deepEqual({...c,suit:originals.find(o=>o.id===c.id)!.suit},originals.find(o=>o.id===c.id)));
 assert.equal(stableHash(input),snapshot);assertR2Invariants(s);
 return {state:s,record:{policy,status:policy==='chapter3-nine'?'shadow-nine-after-real-purchase':'real-current-command',paid,before,after:deckSummary(s),changedIds}};
}
function scoreInput(s:R2RunState):ScoreInput{
 const hand=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!);
 return {rulesVersion:'r2',runId:s.runId,rootId:'s04/probe',hand,selectedIds:[],disabledIds:s.stage!.disabledIds,jokers:s.jokers,definitions:r2JokerDefinitionsFor(s),handLevels:s.handLevels,playIndex:s.stage!.playIndex+1,handsBeforePlay:s.stage!.handsLeft,previousHandType:s.stage!.previousHandType,wager:false,rng:s.rng.rule,...r2ScoreContext(s,hand,[])};
}
/** Enumerates every 1..5 public selection. Never reads the draw pile when choosing. */
function choices(s:R2RunState){
 const input=scoreInput(s);let best=-1n,bestIds:string[]=[],bestType:R2HandType='high-card';
 const byType:Partial<Record<R2HandType,string>>={};
 const visit=(start:number,ids:string[])=>{
  if(ids.length){const preview=previewR2Hand({...input,selectedIds:ids});const value=BigInt(preview.scoreRange.minimum),type=preview.handType;
   if(!byType[type]||value>BigInt(byType[type]!))byType[type]=String(value);
   if(value>best){best=value;bestIds=[...ids];bestType=type;}
  }
  if(ids.length===5)return;
  for(let i=start;i<s.handOrder.length;i++)visit(i+1,[...ids,s.handOrder[i]]);
 };
 visit(0,[]);return {ids:bestIds,type:bestType,score:String(best),byType};
}
function playStage(input:R2RunState){
 let s=send(send(input,{type:'LeaveShop'}),{type:'EnterStage'});
 const entry={index:s.stageIndex,target:s.stage!.targetHeat,boss:s.stage!.boss,handLimit:s.stage!.handLimit,hands:s.stage!.handsLeft,discards:s.stage!.discardsLeft,routeBefore:structuredClone(s.routeGrowth)};
 const actions:unknown[]=[];
 while(s.phase==='await-input'){
  const pick=choices(s),remaining=BigInt(s.stage!.targetHeat)-BigInt(s.stage!.heat);
  // Fixed conservative policy: when current best cannot meet an equal remaining-hand share,
  // discard cards outside it (at most 5). No hidden-deck search, tricks, active hero, or rerolls.
  const discard=s.handOrder.filter(id=>!pick.ids.includes(id)).slice(0,5);
  if(BigInt(pick.score)*BigInt(s.stage!.handsLeft)<remaining&&s.stage!.discardsLeft>0&&discard.length){
   s=send(s,{type:'DiscardHand',selectedIds:discard});actions.push({kind:'discard',ids:discard,publicBest:pick.score});continue;
  }
  const selected=pick.ids;s=send(s,{type:'PlayHand',selectedIds:selected});const t=s.lastTrace!;
  assert.equal(t.finalScore,pick.score);
  actions.push({kind:'play',ids:selected,type:t.handType,score:t.finalScore,byType:pick.byType,disabledScoring:t.sets.scoringIds.length-t.sets.activeScoringIds.length,routeFactors:t.events.filter(e=>e.operation==='route-factor').map(e=>({family:e.routeFamily,factor:e.value})),bossEvents:t.events.filter(e=>['halve-base-heat','ordinary-points-suppressed','seal-joker'].includes(e.operation)).map(e=>({operation:e.operation,source:e.sourceDefinitionId}))});
 }
 return {state:s,record:{...entry,actions,phase:s.phase,heat:s.stage!.heat,gold:s.gold,routeAfter:structuredClone(s.routeGrowth),growthAfter:s.jokers.map(j=>({id:j.definitionId,growth:j.growth}))}};
}
function window(route:Route,index:number,seed:string,policy:Policy,boss:R2BossId='B03',length=3,preparation=0,level=3){
 let initial=fixture(route,index,seed,boss);
 const dyeCommands:unknown[]=[],practiceCommands:unknown[]=[];
 if(preparation){
  // Independent planted shop entries; NOT a replay of reaching these shops or earning this cash.
  // Both paired policies receive the identical budget and pay every real dye/practice.
  initial.gold=index===23?50:40;
  const targets=initial.deckInstances.filter(c=>c.suit!=='hearts').sort((a,b)=>b.rank-a.rank||a.id.localeCompare(b.id)).slice(0,preparation);
  for(let i=0;i<targets.length;i+=3){
   const entry:Command={runId:initial.runId,commandId:initial.runId+'/planted-dye-shop/'+i,expectedSeq:initial.commandSeq,action:{type:'OpenShop'}};
   initial.shop!.basicChoice={shopSeq:initial.commandSeq+1,purchase:null};initial.commandSeq++;
   initial.receipts.push({commandId:entry.commandId,seq:initial.commandSeq,fingerprint:stableHash(entry)});
   // A random occurrence of the same dye redirects the real UI; use a fixed different random offer.
   initial.shop!.toolOffers=[{offerId:'s04/planted/tool/0',definitionId:'T04',price:4,consumed:false}];
   const ids=targets.slice(i,i+3).map(c=>c.id),before=initial.gold;
   initial=send(initial,{type:'BuyBasicTool',definitionId:'T03',shopSeq:initial.shop!.basicChoice!.shopSeq});
   const item=initial.consumables.find(c=>c.definitionId==='T03')!;
   initial=send(initial,{type:'UseConsumable',instanceId:item.instanceId,targetIds:ids});
   dyeCommands.push({definitionId:'T03',paid:before-initial.gold,ids});
  }
  if(level>3){
   for(let l=3;l<level;l++){
    const entry:Command={runId:initial.runId,commandId:initial.runId+'/planted-practice-shop/'+l,expectedSeq:initial.commandSeq,action:{type:'OpenShop'}};
    initial.shop!.basicChoice={shopSeq:initial.commandSeq+1,purchase:null};initial.commandSeq++;
    initial.receipts.push({commandId:entry.commandId,seq:initial.commandSeq,fingerprint:stableHash(entry)});
    const quote=r2PracticeQuotes(initial).find(q=>q.handType==='flush')!;
    initial=send(initial,{type:'PracticeHand',handType:'flush',expectedLevel:l,shopSeq:quote.shopSeq});
    practiceCommands.push({handType:'flush',before:l,after:l+1,paid:quote.price,shopSeq:quote.shopSeq});
   }
  }
  assertR2Invariants(initial);
 }
 const bought=acquire(initial,policy);let s=bought.state;const stages=[];
 for(let i=0;i<length;i++){
  const result=playStage(s);stages.push(result.record);s=result.state;
  if(s.phase==='run-lost'||s.phase==='run-won'||i===length-1)break;
  s=send(s,{type:'OpenShop'}); // Actual clear rewards/history/instance growth carry forward. No more purchases.
 }
 return {route,acquisitionIndex:index,seed,policy,boss,preparation:{changes:preparation,level,budget:preparation?(index===23?50:40):null,dyeCommands,practiceCommands,goldBeforeS04:initial.gold,scope:preparation?'paid dye/practice commands across planted shops, no natural cash/visit attainment claim':'none'},acquisition:bought.record,stages};
}
/** Exact hypergeometric first-hand flush access. No seed frequencies or independence claim. */
function choose(n:number,k:number):bigint{if(k<0||k>n)return 0n;let r=1n;for(let i=1;i<=k;i++)r=r*BigInt(n-i+1)/BigInt(i);return r;}
function flushAccess(hearts:number,hand:number){const denominator=choose(52,hand);let numerator=0n;for(let k=5;k<=hand;k++)numerator+=choose(hearts,k)*choose(52-hearts,hand-k);return {hearts,hand,numerator:String(numerator),denominator:String(denominator),percent:Number(numerator)*100/Number(denominator)};}
function supply(s:R2RunState){
 const pool=r2ToolAcquisitionPool(s),families=Object.entries(R2_TOOL_CATALOG.acquisition.familyWeights).filter(([f])=>pool.some(t=>t.family===f));
 const spectral=pool.filter(t=>t.family==='spectral');
 return {eligible:pool.some(t=>t.id==='S04'),familyWeight:families.find(([f])=>f==='spectral')![1],allFamilyWeight:families.reduce((n,[,w])=>n+w,0),S04Weight:2,spectralWeight:spectral.reduce((n,t)=>n+t.shopWeight,0),poolIds:pool.map(t=>t.id),rawRandomShelf:s.shop!.toolOffers.map(o=>o.definitionId),practice:r2PracticeQuotes(s).filter(q=>['pair','straight','flush'].includes(q.handType))};
}
export function makeReport(){
 const identity=newRunIdentity('laohuan','group');
 const bounded={contentVersion:R2_BOUNDED_CLEAR_VERSION,contentHash:R2_BOUNDED_CLEAR_HASH};
 const openingSupply=(['group','straight','flush'] as const).flatMap(route=>probes.map(seed=>{
  const s=createRun({rulesVersion:'r2',characterId:'laohuan',seed,runId:'s04/opening/'+seed,r2Identity:identity,openingRoute:route,modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  return {route,seed,...supply(s),S04Appeared:s.shop!.toolOffers.some(o=>o.definitionId==='S04'),action:'observed-only-no-reroll-no-purchase'};
 }));
 const inheritedTargets=Array.from({length:24},(_,i)=>({index:i,bounded:r2StageSpec(i,'normal',0,true)!.targetHeat,core:r2StageSpec(i,'normal',0,true,true)!.targetHeat}));
 inheritedTargets.forEach(t=>assert.equal(t.bounded,t.core));
 const ruleChecks=[0,3,4,6,9,12,23].flatMap(n=>(['G','S','F'] as const).map(f=>{
  const [a,b]=f==='G'?[27n,20n]:f==='S'?[7n,5n]:[13n,10n];const e=BigInt(Math.max(n-3,0));
  const factor=r2RouteFactor(f,n,true).toJSON();assert.equal(BigInt(factor.n)*b**e,(a**e>4n*b**e?4n*b**e:a**e)*BigInt(factor.d));return {family:f,clears:n,factor};
 }));
 const base=fixture('group',0,probes[0]);
 let entered=send(send(base,{type:'LeaveShop'}),{type:'EnterStage'});const input=scoreInput(entered);input.selectedIds=entered.handOrder.slice(0,5);
 const boundedState={...entered,...bounded};delete boundedState.chapterTargetPlan;
 const hand=input.hand;
 assert.equal(scoreR2Hand(input).finalScore,scoreR2Hand({...input,definitions:r2JokerDefinitionsFor(boundedState),...r2ScoreContext(boundedState,hand,input.selectedIds)}).finalScore);
 const windows=([0,6,12]).flatMap(index=>(['group','straight','flush'] as const).flatMap(route=>probes.flatMap(seed=>policies.map(policy=>window(route,index,seed,policy)))));
 const bossPressure=(['B05','B10'] as const).flatMap(boss=>(['group','straight','flush'] as const).flatMap(route=>probes.flatMap(seed=>policies.filter(p=>p!=='chapter3-full').map(policy=>window(route,14,seed,policy,boss,1)))));
 const preparedWindows=([6,12]).flatMap(index=>(['group','straight','flush'] as const).flatMap(route=>probes.flatMap(seed=>(['none','chapter3-sixty'] as const).map(policy=>window(route,index,seed,policy,'B03',3,19)))));
 const finalPressure=(['B03','B05','B10'] as const).flatMap(boss=>probes.flatMap(seed=>(['none','chapter3-sixty'] as const).flatMap(policy=>[3,5].map(level=>window('flush',23,seed,policy,boss,1,19,level)))));
 return {schema:'s04-controlled-window-v1',identity,bounded,evidenceClass:'planted public inventories, two predeclared seeds, exact domain commands for subsequent stages; candidate nine-card transformation is shadow only; NOT natural acquisition, win rates, human strategy or challenge acceptance',
 assumptions:{probes,acquisitionIndices:[0,6,12],startingGold:{0:6,6:24,12:24},preparedBudget:{earlyLate:40,final:50},deck:'ordinary 52 distinct IDs, 13 of each suit; ranks preserved',levels:'all types discovered: 1 at index0, 3 at index6/12/23; planted, no earning claim. Final flush level5 is paid via two PracticeHand commands, 4+6 gold, separate planted quotas; other types remain3',owned:'G: mantangcai+b10; S:c04; F:c06; growth 0 initially, heat40 or multiplier2 later; planted and held constant across policies',policy:'maximum minimum-preview among every legal 1..5 selection; up to three actual discards when best*remainingHands<remainingTarget; discard up to five outside best; no trick/active/tool/reroll after acquisition',nineTargets:'top 9 non-heart ranks by rank descending then stable ID, all public before deals',carry:'within each three-stage window actual draw, budgets, rewards, clears and instance growth carry; loss ends window, no restart; each separate late snapshot explicitly planted',comparison:'no-S04 retains the purchase money, does not automatically spend it on an alternative; opportunity prices listed separately'},
 inheritedTargets,ruleChecks,openingSupply,supply:([0,6,12]).flatMap(index=>(['group','straight','flush'] as const).map(route=>({index,route,...supply(fixture(route,index,probes[0]))}))),
 flushAccess:[flushAccess(13,8),flushAccess(52,7),flushAccess(22,7),flushAccess(31,6),flushAccess(13,6),flushAccess(52,5),flushAccess(22,5),flushAccess(32,8)],
 thresholdCosts:[50,60].map(percent=>{const need=Math.ceil(52*percent/100),changes=need-13;return {percent,minimumTargetCards:need,changes,dyePurchases:Math.ceil(changes/3),fullPriceGold:Math.ceil(changes/3)*4,minimumSharedBasicQuotas:Math.ceil(changes/3),thenS04FullPriceGold:6,thenChangedByS04:52-need};}),
 cost:{full:{changes:39,S04Gold:6,dyeEquivalentGold:52,dyeEquivalentQuotas:13},nine:{changes:9,S04Gold:6,dyeEquivalentGold:12,dyeEquivalentQuotas:3,remainingChanges:30,remainingDyeGold:40,remainingDyeQuotas:10,totalCompletionGold:46,permanentHandLoss:1},twoNine:{changes:18,S04Gold:12,dyeEquivalentGold:24,dyeEquivalentQuotas:6,remainingChanges:21,remainingDyeGold:28,totalCompletionGold:40,permanentHandLoss:2},disclaimer:'undiscounted exact fills with maximum targets; random shelf access not guaranteed; small/deleted decks can finish sooner'},
 tool:R2_TOOLS.find(t=>t.id==='S04'),windows,bossPressure,preparedWindows,finalPressure};
}
