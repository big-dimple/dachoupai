import {r2RunModeConfig} from '../content/r2Modes';
import type {R2RunState} from './r2Run';
import {isR2BasicChoice,isR2CoreBuild,r2BasicChoiceIds,r2BasicChoiceBasePrice} from './r2GroupUpgrade';
import {R2_HAND_TYPES} from './evaluateR2';
import {r2PracticeBasePrice} from './r2Practice';
import {stableHash} from './hash';
const practiceReceipts=new Map<string,boolean>();
/** Bounded validation cache: all immutable fingerprint inputs form the key. */
function isPracticeReceipt(state:R2RunState,r:R2RunState['receipts'][number],shopSeq:number):boolean {
 const key=JSON.stringify([state.runId,r.commandId,r.seq,r.fingerprint,shopSeq]);
 const known=practiceReceipts.get(key);if(known!==undefined)return known;
 const result=R2_HAND_TYPES.some(handType=>Array.from({length:29},(_,i)=>i+1).some(expectedLevel=>r.fingerprint===stableHash({runId:state.runId,commandId:r.commandId,expectedSeq:r.seq-1,action:{type:'PracticeHand',handType,expectedLevel,shopSeq}})));
 if(practiceReceipts.size>=512)practiceReceipts.delete(practiceReceipts.keys().next().value!);
 practiceReceipts.set(key,result);return result;
}

/** Receipt-bound shop entry and one purchase survive refresh/use/export, without migrating old shops. */
export function validR2BasicChoice(state:R2RunState):boolean {
 const shop=state.shop;if(!shop)return true;
 const choice=shop.basicChoice;
 if(!isR2BasicChoice(state))return choice===undefined;
 if(!choice||Object.keys(choice).sort().join(',')!=='purchase,shopSeq'||!Number.isSafeInteger(choice.shopSeq)||choice.shopSeq<1||choice.shopSeq>state.commandSeq)return false;
 const entry=state.receipts.find(r=>r.seq===choice.shopSeq);if(!entry)return false;
 if(choice.shopSeq!==1&&!['OpenShop','ContinueEndless'].some(type=>entry.fingerprint===stableHash({runId:state.runId,commandId:entry.commandId,expectedSeq:entry.seq-1,action:{type}})))return false;
 if(choice.shopSeq===1&&shop.visitIndex!==r2RunModeConfig(state).startingStageIndex)return false;
 const purchased=state.receipts.filter(r=>r.seq>choice.shopSeq&&(r2BasicChoiceIds(state).some(definitionId=>r.fingerprint===stableHash({runId:state.runId,commandId:r.commandId,expectedSeq:r.seq-1,action:{type:'BuyBasicTool',definitionId,shopSeq:choice.shopSeq}}))||isR2CoreBuild(state)&&isPracticeReceipt(state,r,choice.shopSeq)));
 const p=choice.purchase;if(p===null)return purchased.length===0;
 if(p.handType!==undefined){
  if(!isR2CoreBuild(state)||p.definitionId!=='T01'||Object.keys(p).sort().join(',')!=='commandId,definitionId,handType,levelBefore,paidPrice,seq'||!R2_HAND_TYPES.includes(p.handType)||!Number.isSafeInteger(p.levelBefore)||p.levelBefore<1||p.levelBefore>=30||!Number.isSafeInteger(p.paidPrice)||p.paidPrice<1||p.paidPrice>r2PracticeBasePrice(p.levelBefore)||shop.purchases<1||purchased.length!==1)return false;
  const r=purchased[0];return r.seq===p.seq&&r.commandId===p.commandId&&r.fingerprint===stableHash({runId:state.runId,commandId:p.commandId,expectedSeq:p.seq-1,action:{type:'PracticeHand',handType:p.handType,expectedLevel:p.levelBefore,shopSeq:choice.shopSeq}});
 }
 if(!p||Object.keys(p).sort().join(',')!=='commandId,definitionId,paidPrice,seq'||!r2BasicChoiceIds(state).includes(p.definitionId)||!(Number.isInteger(p.paidPrice)&&p.paidPrice>=1&&p.paidPrice<=r2BasicChoiceBasePrice(p.definitionId))||shop.purchases<1||purchased.length!==1)return false;
 const receipt=purchased[0];if(receipt.seq!==p.seq||receipt.commandId!==p.commandId||receipt.fingerprint!==stableHash({runId:state.runId,commandId:p.commandId,expectedSeq:p.seq-1,action:{type:'BuyBasicTool',definitionId:p.definitionId,shopSeq:choice.shopSeq}}))return false;
 const item=state.consumables.find(c=>c.instanceId===`${state.runId}/tool/${p.commandId}`);
 return !item||item.definitionId===p.definitionId;
}
