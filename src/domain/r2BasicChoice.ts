import {r2RunModeConfig} from '../content/r2Modes';
import type {R2RunState} from './r2Run';
import {isR2BasicChoice,R2_BASIC_TOOL_IDS} from './r2GroupUpgrade';
import {stableHash} from './hash';

/** Receipt-bound shop entry and one purchase survive refresh/use/export, without migrating old shops. */
export function validR2BasicChoice(state:R2RunState):boolean {
 const shop=state.shop;if(!shop)return true;
 const choice=shop.basicChoice;
 if(!isR2BasicChoice(state))return choice===undefined;
 if(!choice||Object.keys(choice).sort().join(',')!=='purchase,shopSeq'||!Number.isSafeInteger(choice.shopSeq)||choice.shopSeq<1||choice.shopSeq>state.commandSeq)return false;
 const entry=state.receipts.find(r=>r.seq===choice.shopSeq);if(!entry)return false;
 if(choice.shopSeq!==1&&!['OpenShop','ContinueEndless'].some(type=>entry.fingerprint===stableHash({runId:state.runId,commandId:entry.commandId,expectedSeq:entry.seq-1,action:{type}})))return false;
 if(choice.shopSeq===1&&shop.visitIndex!==r2RunModeConfig(state).startingStageIndex)return false;
 const purchased=state.receipts.filter(r=>r.seq>choice.shopSeq&&R2_BASIC_TOOL_IDS.some(definitionId=>r.fingerprint===stableHash({runId:state.runId,commandId:r.commandId,expectedSeq:r.seq-1,action:{type:'BuyBasicTool',definitionId,shopSeq:choice.shopSeq}})));
 const p=choice.purchase;if(p===null)return purchased.length===0;
 if(!p||Object.keys(p).sort().join(',')!=='commandId,definitionId,paidPrice,seq'||!R2_BASIC_TOOL_IDS.includes(p.definitionId)||![1,2].includes(p.paidPrice)||shop.purchases<1||purchased.length!==1)return false;
 const receipt=purchased[0];if(receipt.seq!==p.seq||receipt.commandId!==p.commandId||receipt.fingerprint!==stableHash({runId:state.runId,commandId:p.commandId,expectedSeq:p.seq-1,action:{type:'BuyBasicTool',definitionId:p.definitionId,shopSeq:choice.shopSeq}}))return false;
 const item=state.consumables.find(c=>c.instanceId===`${state.runId}/tool/${p.commandId}`);
 return !item||item.definitionId===p.definitionId;
}
