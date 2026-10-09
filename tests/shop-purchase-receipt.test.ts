import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {applyCommand,type R2RunState} from '../src/domain/run';
import {shopPurchaseReceipt,shopPurchaseReceiptExists} from '../src/game/ShopPurchaseReceipt';
const initial=()=>{const state=JSON.parse(readFileSync('docs/production/evidence/w1-inputs-2026-10-07/controlled-shop.json','utf8')).state as R2RunState;state.gold=30;state.jokers[0].definitionId='b03';state.jokers[0].growth={multiplier:{n:'2',d:'1'}};return state;};
for(const kind of ['jokers','tools','items'] as const)it(kind+' receipt reflects a real command acquisition and leaves its state untouched',()=>{
 const before=initial(),offer=before.shop![kind==='jokers'?'offers':kind==='tools'?'toolOffers':'itemOffers'][0];
 const result=applyCommand(before,{runId:before.runId,commandId:'receipt-test',expectedSeq:before.commandSeq,action:{type:'BuyOffer',offerId:offer.offerId}});expect(result.ok).toBe(true);if(!result.ok)throw Error(result.code);
 const snapshot=JSON.stringify(result.state),receipt=shopPurchaseReceipt(before,result.state,kind,offer)!;expect(receipt).toBeDefined();expect(receipt.body).toContain(`金币 ${before.gold} → ${result.state.gold}`);expect(JSON.stringify(result.state)).toBe(snapshot);expect(result.state.rng).toEqual(before.rng);
 if(kind==='jokers'){expect(receipt.id).toBe(result.state.jokers[2].instanceId);expect(receipt.body).toContain('第 3 槽');expect(receipt.body).toContain('热度成长 0');expect(receipt.body).toContain('从下一手起生效');}
 if(kind==='tools'){expect(receipt.id).toBe(result.state.consumables[1].instanceId);expect(receipt.body).toContain('尚未使用');expect(receipt.body).toContain('打开道具箱');}
 if(kind==='items'){expect(receipt.body).toContain('无需手动使用');expect(receipt.body).toContain('后续开店');}
 expect(shopPurchaseReceipt(result.state,result.state,kind,offer)).toBeUndefined();expect(shopPurchaseReceipt(before,{...before,commandSeq:before.commandSeq+1},kind,offer)).toBeUndefined();
});
it('existing unrelated growth cannot be presented as newly acquired growth',()=>{const before=initial();const offer=before.shop!.offers[0];const result=applyCommand(before,{runId:before.runId,commandId:'growth-receipt',expectedSeq:before.commandSeq,action:{type:'BuyOffer',offerId:offer.offerId}});if(!result.ok)throw Error(result.code);expect(shopPurchaseReceipt(before,result.state,'jokers',offer)!.body).toContain('热度成长 0');expect(result.state.jokers[0].growth.multiplier).toEqual({n:'2',d:'1'});});

it('targetless tools are not described as requiring a target to consume',()=>{const before=initial(),offer=before.shop!.toolOffers[0];offer.definitionId='T17';const result=applyCommand(before,{runId:before.runId,commandId:'targetless-receipt',expectedSeq:before.commandSeq,action:{type:'BuyOffer',offerId:offer.offerId}});if(!result.ok)throw Error(result.code);const receipt=shopPurchaseReceipt(before,result.state,'tools',offer)!;expect(receipt.body).toContain('需要目标时先选择');expect(receipt.body).not.toContain('不选目标');});

it('S07 sacrifice invalidates only an absent acquisition, using committed state',()=>{
 const before=initial();before.consumables[0].definitionId='S07';const offer=before.shop!.offers[0];const bought=applyCommand(before,{runId:before.runId,commandId:'s07-buy',expectedSeq:before.commandSeq,action:{type:'BuyOffer',offerId:offer.offerId}});if(!bought.ok)throw Error(bought.code);
 const receipt=shopPurchaseReceipt(before,bought.state,'jokers',offer)!;expect(shopPurchaseReceiptExists(receipt,bought.state)).toBe(true);
 const sacrificed=applyCommand(bought.state,{runId:before.runId,commandId:'s07-use',expectedSeq:bought.state.commandSeq,action:{type:'UseConsumable',instanceId:before.consumables[0].instanceId,sacrificeId:receipt.id,targetIds:[before.jokers[0].instanceId]}});if(!sacrificed.ok)throw Error(sacrificed.code);
 expect(sacrificed.state.commandSeq).toBe(bought.state.commandSeq+1);expect(sacrificed.state.gold).toBe(bought.state.gold);expect(sacrificed.state.rng).toEqual(bought.state.rng);expect(shopPurchaseReceiptExists(receipt,sacrificed.state)).toBe(false);expect(shopPurchaseReceiptExists(receipt,bought.state)).toBe(true);
 expect(shopPurchaseReceiptExists({...receipt,id:before.jokers[0].instanceId},sacrificed.state)).toBe(true);
 expect(shopPurchaseReceiptExists({...receipt,kind:'items',id:before.longTermItems[0]},sacrificed.state)).toBe(true);
 expect(shopPurchaseReceiptExists({...receipt,kind:'tools',id:before.consumables[0].instanceId},sacrificed.state)).toBe(false);
});
