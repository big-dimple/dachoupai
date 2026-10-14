import {readFileSync} from 'node:fs';
import {readCheckpoint} from '../src/application/checkpoint';
import {applyCommand,type R2RunState,type Action,type Command} from '../src/domain/run';
import {routeStarterStartCommand} from '../src/domain/r2RouteStarter';
import {r2ScoreContext,getR2Stage,r2CreateJoker} from '../src/domain/r2Run';
import {scoreR2Hand,type ScoreInput} from '../src/domain/scoreR2';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {r2PurchasePrice,salePrice} from '../src/domain/r2Shop';
import {stableHash} from '../src/domain/hash';
import {R2_CORE_BUILD_VERSION,R2_CORE_BUILD_HASH} from '../src/domain/r2GroupUpgrade';
import {r2PracticeQuotes} from '../src/domain/r2Practice';

export const naturalFile='docs/production/evidence/core-build-preparation-2026-10-14/laohuan-c9-natural-save-20261014.json';
export function send(s:R2RunState,action:Action){const c:Command={runId:s.runId,commandId:s.runId+'/window/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action};const r=applyCommand(s,c);if(!r.ok)throw Error(r.code);return r.state;}
export function naturalWindow(){
 const raw=JSON.parse(readFileSync(naturalFile,'utf8')),read=readCheckpoint(raw);
 if(!read.ok)throw Error('natural-checkpoint:'+read.code);
 const saved=read.checkpoint.state as R2RunState;
 const start=applyCommand(null,routeStarterStartCommand(saved));if(!start.ok)throw Error(start.code);
 let s=start.state as R2RunState,preBoss:R2RunState|undefined;
 for(const command of read.checkpoint.journal){
  if(command.expectedSeq===saved.commandSeq-1&&command.action.type==='PlayHand')preBoss=structuredClone(s);
  const r=applyCommand(s,command);if(!r.ok)throw Error('natural-replay:'+command.commandId+':'+r.code);s=r.state;
 }
 if(stableHash(s)!==stableHash(saved))throw Error('natural-state-replay-drift');
 if(!preBoss)throw Error('missing-boss-command');
 const hand=preBoss.handOrder.map(id=>preBoss.deckInstances.find(c=>c.id===id)!);
 const selectedIds=saved.lastTrace!.sets.playedIds;
 const input:ScoreInput={rulesVersion:'r2',runId:s.runId,rootId:saved.lastTrace!.rootId,hand,selectedIds,jokers:preBoss.jokers,definitions:r2JokerDefinitionsFor(s),handLevels:preBoss.handLevels,playIndex:1,handsBeforePlay:preBoss.stage!.handsLeft,previousHandType:null,wager:false,rng:preBoss.rng.rule,disabledIds:preBoss.stage!.disabledIds,...r2ScoreContext(preBoss,hand,selectedIds)};
 const trace=scoreR2Hand(input);
 if(trace.finalScore!==saved.lastTrace!.finalScore||stableHash(trace.accumulator)!==stableHash(saved.lastTrace!.accumulator))throw Error('natural-score-replay-drift');
 const shop=send(saved,{type:'OpenShop'});
 const sameHand=(state:R2RunState)=>scoreR2Hand({...input,jokers:state.jokers,handLevels:state.handLevels,hand:hand.map(c=>state.deckInstances.find(d=>d.id===c.id)!),...r2ScoreContext({...state,stage:preBoss!.stage,stageIndex:preBoss!.stageIndex},hand,selectedIds)});
 // Frozen C9 hand under the same B12, at current post-clear levels. This is
 // a purchase comparison, never a prediction of the C10 draw or its Boss.
 const keep=sameHand(shop);
 const swaps=shop.shop!.offers.flatMap(offer=>shop.jokers.map(owned=>{
  const sold=send(shop,{type:'SellJoker',instanceId:owned.instanceId});
  const bought=send(sold,{type:'BuyOffer',offerId:offer.offerId});
  const result=sameHand(bought);
  return {sold:owned.definitionId,refund:salePrice(owned.paidPrice),bought:offer.definitionId,edition:offer.edition,price:r2PurchasePrice(sold,offer),gold:bought.gold,score:result.finalScore,accumulator:result.accumulator,scoreDelta:String(BigInt(result.finalScore)-BigInt(keep.finalScore))};
 }));
 const voiceOffer=shop.shop!.toolOffers.find(o=>o.definitionId==='T13')!;
 const voiceBought=send(shop,{type:'BuyOffer',offerId:voiceOffer.offerId});
 const voiceItem=voiceBought.consumables.find(c=>c.definitionId==='T13')!;
 const heldFaces=hand.filter(c=>!selectedIds.includes(c.id)&&[11,12,13].includes(c.rank)).slice(0,2).map(c=>c.id);
 const voiceUsed=send(voiceBought,{type:'UseConsumable',instanceId:voiceItem.instanceId,targetIds:heldFaces});
 const voiceScore=sameHand(voiceUsed);
 const ablations={noRoute:scoreR2Hand({...input,routeGrowth:{clears:0,G:0,S:0,F:0}}).finalScore,noJokers:scoreR2Hand({...input,jokers:[]}).finalScore,noGrowth:scoreR2Hand({...input,jokers:input.jokers.map(j=>r2CreateJoker(j.definitionId,j.instanceId,j.paidPrice,j.edition,s))}).finalScore,level1:scoreR2Hand({...input,handLevels:{...input.handLevels,straight:1}}).finalScore};
 return {saved,preBoss,input,trace,shop,keep,voiceUsed,report:{replayedCommands:read.checkpoint.journal.length+1,exactStateReplay:true,natural:{score:trace.finalScore,accumulator:trace.accumulator,target:saved.stage!.targetHeat,goldBefore:preBoss.gold,goldAfter:saved.gold,levelBefore:input.handLevels.straight,levelAfter:saved.handLevels.straight},ablations,shop:{gold:shop.gold,boss:shop.boss,offers:shop.shop!.offers,tools:shop.shop!.toolOffers,items:shop.shop!.itemOffers,targets:[0,1,2].map(i=>getR2Stage(shop.stageIndex+i,'endless',shop.difficulty,shop)!.targetHeat)},keep:{score:keep.finalScore,gold:shop.gold},swaps,voicePaper:{price:r2PurchasePrice(shop,voiceOffer),targets:heldFaces,gold:voiceUsed.gold,score:voiceScore.finalScore,scoreDelta:String(BigInt(voiceScore.finalScore)-BigInt(keep.finalScore))}}};
}

/** The same fixed actual commands under the new policy, never a save migration. */
export function coreBuildCounterfactual(w:ReturnType<typeof naturalWindow>){
 const identity={contentVersion:R2_CORE_BUILD_VERSION,contentHash:R2_CORE_BUILD_HASH},start=applyCommand(null,routeStarterStartCommand({...w.saved,...identity}));if(!start.ok)throw Error(start.code);
 let s=start.state as R2RunState;
 for(const command of JSON.parse(readFileSync(naturalFile,'utf8')).journal as Command[]){const r=applyCommand(s,command);if(!r.ok)throw Error(r.code);s=r.state;}
 const shop=send(s,{type:'OpenShop'}),quote=r2PracticeQuotes(shop).find(q=>q.handType==='straight')!;
 const upgraded=send(shop,{type:'PracticeHand',handType:quote.handType,expectedLevel:quote.levelBefore,shopSeq:quote.shopSeq});
 const frozen=(state:R2RunState)=>scoreR2Hand({...w.input,handLevels:state.handLevels,jokers:state.jokers,gold:state.gold});
 return {scope:'same fixed natural command policy replayed offline under core-build; frozen C9 B12 hand; not a new natural sample or C10 draw prediction',identity,c9:{score:s.lastTrace!.finalScore,target:s.stage!.targetHeat,gold:s.gold},c10Plan:shop.chapterTargetPlan,quote,practice:{goldBefore:shop.gold,goldAfter:upgraded.gold,levelBefore:shop.handLevels.straight,levelAfter:upgraded.handLevels.straight,keptScore:frozen(shop).finalScore,upgradedScore:frozen(upgraded).finalScore,inventoryUnchanged:stableHash(shop.consumables)===stableHash(upgraded.consumables),targetsUnchanged:stableHash(shop.chapterTargetPlan)===stableHash(upgraded.chapterTargetPlan)},targets:[9,10,13,20,30].map(chapter=>({chapter,targets:[0,1,2].map(i=>getR2Stage((chapter-1)*3+i,'endless',0,identity)!.targetHeat)}))};
}
