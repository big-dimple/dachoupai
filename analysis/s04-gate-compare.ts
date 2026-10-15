/** Controlled same-budget follow-up to 94f8f74. No production imports. */
import assert from 'node:assert/strict';
import {fixture,send,probes} from './s04-window';
import {makeR2Shop,r2ScoreContext,assertR2Invariants} from '../src/domain/r2Run';
import type {R2RunState,Command} from '../src/domain/run';
import type {PlayingCard} from '../src/cards/types';
import {r2ToolAcquisitionPool,r2PaidRerollPrice,r2PurchasePrice} from '../src/domain/r2Shop';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {r2PracticeQuotes} from '../src/domain/r2Practice';
import {previewR2Hand} from '../src/domain/scoreR2';
import {r2RouteFamilies} from '../src/domain/r2RouteGrowth';
import {stableHash} from '../src/domain/hash';

type Route='group'|'straight'|'flush';
type Layout='high-cluster'|'low-cluster'|'rank-spread';
type Gate=50|60;
type Investment='hold'|'practice';
type Arrival='one-refresh'|'wait-next';
const layouts:Layout[]=['high-cluster','low-cluster','rank-spread'];
const routes:Route[]=['group','straight','flush'];
const key=(s:R2RunState)=>s.deckInstances.filter(c=>!s.destroyedIds.includes(c.id));
const hearts=(s:R2RunState)=>key(s).filter(c=>c.suit==='hearts').length;
const offers=(s:R2RunState)=>s.shop!.toolOffers.map(o=>({id:o.offerId,tool:o.definitionId,price:o.price,consumed:o.consumed}));
const qualified=(s:R2RunState,gate:Gate)=>s.chapter>=3&&hearts(s)*100>=gate*key(s).length&&hearts(s)<key(s).length;

/** Public ranks/suits only; fixed before any deal or shelf is inspected. */
export function dyeOrder(deck:PlayingCard[],layout:Layout){
 const suitOrder=['clubs','diamonds','spades'];
 return deck.filter(c=>c.suit!=='hearts').sort((a,b)=>{
  if(layout==='rank-spread')return suitOrder.indexOf(a.suit)-suitOrder.indexOf(b.suit)||a.rank-b.rank;
  return (layout==='high-cluster'?b.rank-a.rank:a.rank-b.rank)||a.id.localeCompare(b.id);
 }).map(c=>c.id);
}
/** A preparation visit is planted. Its shelf itself is genuinely generated, never selected/injected. */
function visit(previous:R2RunState,route:Route,index:number,seed:string){
 const s=fixture(route,index,seed);
 for(const field of ['deckInstances','destroyedIds','gold','jokers','handLevels','consumables','longTermItems','spectralModifiers'] as const)(s[field] as unknown)=structuredClone(previous[field]);
 s.drawPile=key(s).map(c=>c.id);s.handOrder=[];s.playedPile=[];s.discardPile=[];
 // Preserve unique real purchase/use command IDs across planted visits.
 s.commandSeq=previous.commandSeq;s.receipts=structuredClone(previous.receipts);
 const entry:Command={runId:s.runId,commandId:s.runId+'/comparison-shop/'+index,expectedSeq:s.commandSeq,action:{type:'OpenShop'}};
 makeR2Shop(s,true);s.commandSeq++;s.receipts.push({commandId:entry.commandId,seq:s.commandSeq,fingerprint:stableHash(entry)});
 assertR2Invariants(s);return s;
}
function buyVisible(s:R2RunState,gate:Gate,log:unknown[],source:'generated-shelf'|'injected-control'='generated-shelf'){
 const offer=s.shop!.toolOffers.find(o=>o.definitionId==='S04'&&!o.consumed);
 if(!offer){log.push({kind:'S04-not-offered',index:s.stageIndex,offers:offers(s),gold:s.gold,qualified:qualified(s,gate)});return s;}
 assert.ok(qualified(s,gate));const price=r2PurchasePrice(s,offer);
 if(s.gold<price){log.push({kind:'S04-unaffordable',index:s.stageIndex,price,gold:s.gold});return s;}
 const before=s.gold,heartsBefore=hearts(s);
 s=send(s,{type:'BuyOffer',offerId:offer.offerId});const item=s.consumables.find(c=>c.definitionId==='S04')!;
 s=send(s,{type:'UseConsumable',instanceId:item.instanceId,targetIds:[],suit:'hearts'});
 log.push({kind:'S04-bought-from-'+source,offerId:offer.offerId,index:s.stageIndex,paid:before-s.gold,gold:s.gold,heartsBefore,heartsAfter:hearts(s)});
 return s;
}
function dye(s:R2RunState,ids:string[]){
 const beforeGold=s.gold,beforeShelf=offers(s),beforeRng=stableHash(s.rng.shop);
 const random=s.shop!.toolOffers.find(o=>o.definitionId==='T03'&&!o.consumed);
 if(random)s=send(s,{type:'BuyOffer',offerId:random.offerId});
 else s=send(s,{type:'BuyBasicTool',definitionId:'T03',shopSeq:s.shop!.basicChoice!.shopSeq});
 const item=s.consumables.find(c=>c.definitionId==='T03')!;
 s=send(s,{type:'UseConsumable',instanceId:item.instanceId,targetIds:ids});
 assert.equal(stableHash(s.rng.shop),beforeRng);
 assert.deepEqual(offers(s).map(o=>({id:o.id,tool:o.tool,price:o.price})),beforeShelf.map(o=>({id:o.id,tool:o.tool,price:o.price})));
 return {state:s,paid:beforeGold-s.gold,source:random?'generated-random-offer':'basic-choice',shelfUnchangedApartFromConsumed:true,shopRngUnchanged:true};
}
function practice(s:R2RunState,route:Route){
 const type=route==='group'?'two-pair':route==='straight'?'straight':'flush';
 const quote=r2PracticeQuotes(s).find(q=>q.handType===type)!;
 assert.ok(quote?.available);
 const next=send(s,{type:'PracticeHand',handType:type,expectedLevel:quote.levelBefore,shopSeq:quote.shopSeq});
 return {state:next,quote};
}
function prepare(route:Route,index:number,seed:string,layout:Layout,gate:Gate,investment:Investment,minimumOnly=false){
 let s=fixture(route,index,seed);s.gold=40;
 const targets=dyeOrder(s.deckInstances,layout),dyeCount=gate===50?5:7,logs:unknown[]=[];
 const visits: {index:number;entryHearts:number;entryEligible:boolean;entryOffers:ReturnType<typeof offers>;afterHearts:number;gold:number;operation:string;paid:number}[]=[];
 let spent=0;
 // Seven calendar slots for both policies. No clearing or income is fabricated between these visits.
 for(let day=0;day<7;day++){
  s=visit(s,route,index-6+day,seed);
  const entryHearts=hearts(s),entryEligible=r2ToolAcquisitionPool(s).some(t=>t.id==='S04'),entryOffers=offers(s);
  let operation='hold',paid=0;
  if(day<dyeCount){
   const ids=targets.slice(day*3,day*3+(minimumOnly&&day===dyeCount-1?1:3));
   const result=dye(s,ids);s=result.state;paid=result.paid;operation='dye';
   logs.push({kind:'dye',index:s.stageIndex,ids,paid,source:result.source,shelfUnchangedApartFromConsumed:result.shelfUnchangedApartFromConsumed,shopRngUnchanged:result.shopRngUnchanged});
  }else if(investment==='practice'){
   const result=practice(s,route);s=result.state;paid=result.quote.price;operation='practice';logs.push({kind:'practice',index:s.stageIndex,quote:result.quote});
  }
  spent+=paid;
  // Buy only after the scheduled preparation, while preserving all 7 planned slots.
  // Record prior eligible offers as explicit forgone opportunities, never secretly consume them.
  if(day<6&&entryOffers.some(o=>o.tool==='S04'))logs.push({kind:'S04-declined-during-preparation',index:s.stageIndex,offers:entryOffers});
  visits.push({index:s.stageIndex,entryHearts,entryEligible,entryOffers,afterHearts:hearts(s),gold:s.gold,operation,paid});
 }
 assert.equal(s.gold,40-spent);assert.equal(hearts(s),minimumOnly?(gate===50?26:32):(gate===50?28:34));
 return {state:s,record:{route,index,seed,layout,gate,investment,budget:40,spent,remaining:s.gold,hearts:hearts(s),minimumOnly,visits,logs,handLevels:s.handLevels,rankHistogram:Array.from({length:13},(_,i)=>({rank:i+2,hearts:key(s).filter(c=>c.rank===i+2&&c.suit==='hearts').length}))}};
}
function best(s:R2RunState){
 const hand=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!);
 let score=-1n,selected:string[]=[],type='';
 const visit=(start:number,ids:string[])=>{
  if(ids.length){const p=previewR2Hand({rulesVersion:'r2',runId:s.runId,rootId:'s04/gate-preview',hand,selectedIds:ids,disabledIds:s.stage!.disabledIds,jokers:s.jokers,definitions:r2JokerDefinitionsFor(s),handLevels:s.handLevels,playIndex:s.stage!.playIndex+1,handsBeforePlay:s.stage!.handsLeft,previousHandType:s.stage!.previousHandType,wager:false,...r2ScoreContext(s,hand,ids)});
   const value=BigInt(p.scoreRange.minimum);if(value>score){score=value;selected=[...ids];type=p.handType;}
  }
  if(ids.length===5)return;
  for(let i=start;i<hand.length;i++)visit(i+1,[...ids,hand[i].id]);
 };visit(0,[]);return {score,selected,type};
}
function play(s:R2RunState){
 s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});
 const entry={index:s.stageIndex,target:s.stage!.targetHeat,boss:s.stage!.boss,gold:s.gold,handLimit:s.stage!.handLimit,route:structuredClone(s.routeGrowth)};
 const actions:unknown[]=[];
 while(s.phase==='await-input'){
  const choice=best(s),discard=s.handOrder.filter(id=>!choice.selected.includes(id)).slice(0,5);
  if(choice.score*BigInt(s.stage!.handsLeft)<BigInt(s.stage!.targetHeat)-BigInt(s.stage!.heat)&&s.stage!.discardsLeft>0&&discard.length){
   s=send(s,{type:'DiscardHand',selectedIds:discard});actions.push({type:'discard',ids:discard});continue;
  }
  s=send(s,{type:'PlayHand',selectedIds:choice.selected});const t=s.lastTrace!;
  assert.equal(t.finalScore,String(choice.score));
  actions.push({type:'play',ids:choice.selected,handType:t.handType,score:t.finalScore,families:r2RouteFamilies(t.handType)});
 }
 return {state:s,record:{entry,actions,phase:s.phase,heat:s.stage!.heat,discards:s.stage!.discardsUsed,plays:s.stage!.playIndex,reward:s.stage!.goldEarned,gold:s.gold,route:structuredClone(s.routeGrowth),jokers:s.jokers.map(j=>({id:j.definitionId,growth:j.growth}))}};
}
function actualWindow(prepared:ReturnType<typeof prepare>,gate:Gate,arrival:Arrival){
 let s=structuredClone(prepared.state);const log:unknown[]=[],stages=[];
 const initial={gold:s.gold,offers:offers(s),eligible:qualified(s,gate)};
 s=buyVisible(s,gate,log);
 if(!s.spectralModifiers.handPenalty&&arrival==='one-refresh'){
  const price=r2PaidRerollPrice(s),before=s.gold,quota=structuredClone(s.shop!.basicChoice);
  if(s.gold>=price+6){s=send(s,{type:'RerollShop'});assert.equal(before-s.gold,price);assert.deepEqual(s.shop!.basicChoice,quota);
   log.push({kind:'paid-refresh',paid:price,gold:s.gold,offers:offers(s),quotaPreserved:true});s=buyVisible(s,gate,log);
  }else log.push({kind:'refresh-declined-reserve-S04',price,gold:s.gold});
 }
 for(let i=0;i<3;i++){
  const result=play(s);stages.push(result.record);s=result.state;
  if(s.phase==='run-lost'||i===2)break;
  s=send(s,{type:'OpenShop'});log.push({kind:'next-generated-shop',index:s.stageIndex,gold:s.gold,offers:offers(s),eligible:qualified(s,gate)});
  if(!s.spectralModifiers.handPenalty)s=buyVisible(s,gate,log);
 }
 return {arrival,initial,log,stages,final:{phase:s.phase,gold:s.gold,hearts:hearts(s),handPenalty:s.spectralModifiers.handPenalty}};
}
/** Conditional benefit control, kept separate from every generated-shelf window. */
function conditionalInStock(prepared:ReturnType<typeof prepare>,gate:Gate){
 let s=structuredClone(prepared.state);assert.ok(qualified(s,gate));const before=s.gold,quote=r2PaidRerollPrice(s);
 // If entry was not eligible, pay the real first refresh before the explicitly forced positive stock.
 const entryEligible=prepared.record.visits.at(-1)!.entryEligible;
 if(!entryEligible)s=send(s,{type:'RerollShop'});
 s.shop!.toolOffers=[{offerId:'s04/CONDITIONAL/tool/0',definitionId:'S04',price:6,consumed:false}];
 const log:unknown[]=[];s=buyVisible(s,gate,log,'injected-control');
 assert.equal(before-s.gold,6+(entryEligible?0:quote));
 const after={gold:s.gold,hearts:hearts(s),handPenalty:s.spectralModifiers.handPenalty,level:s.handLevels};
 const result=play(s);
 return {evidence:'CONDITIONAL INJECTED S04 STOCK after required real refresh; not observed supply',requiredRefresh:entryEligible?0:quote,paid:before-s.gold,log,after,firstStage:result.record};
}
export function makeGateReport(gate:Gate){
 const boundary=fixture('flush',6,probes[0]);
 for(const c of boundary.deckInstances.filter(c=>c.suit!=='hearts').slice(0,13))c.suit='hearts';
 assert.equal(r2ToolAcquisitionPool(boundary).some(t=>t.id==='S04'),gate===50);
 const rows=[];
 for(const index of [6,12])for(const route of routes)for(const seed of probes)for(const layout of layouts){
  for(const investment of gate===50?(['hold','practice'] as const):(['hold'] as const)){
   const p=prepare(route,index,seed,layout,gate,investment);
   rows.push({preparation:p.record,actual:(['wait-next','one-refresh'] as const).map(a=>actualWindow(p,gate,a)),conditional:conditionalInStock(p,gate)});
  }
 }
 const minimum=prepare('flush',6,probes[0],'high-cluster',gate,'hold',true).record;
 return {gate,protocol:{base:'94f8f74',seeds:probes,indices:[6,12],layouts,budget:40,preparation:'seven planted calendar visits, no intervening wins/income; real generated shelves, one dye per planned dye visit, use all 3 targets in main matrix',dyeVisits:gate===50?5:7,distribution:'high/low rank clusters and one new copy per rank before a second; chosen before draws',investment:'50% either keeps the last two preparation visits/cash or pays actual 4+6 training; 60% spends both visits dyeing',supply:'candidate gate changes only two transient build branches; production makeR2Shop RNG order, BuyOffer, RerollShop and prices are real; no S04 insertion in actual windows',strategy:'same public maximum-minimum-score and limited discard policy as previous review; three subsequent stages maximum, stop on loss',scope:'all initial ranks, levels, prior clears, jokers and preparation visits/budget are controlled fixtures. Never natural play, attainment or win-rate evidence'},minimumBoundary:minimum,rows};
}
