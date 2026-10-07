import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {applyCommand,type R2RunState} from '../src/domain/run';
import {shopPurchaseReceipt} from '../src/game/ShopPurchaseReceipt';
const initial=()=>{const state=JSON.parse(readFileSync('docs/production/evidence/w1-inputs-2026-10-07/controlled-shop.json','utf8')).state as R2RunState;state.gold=30;state.jokers[0].definitionId='b03';state.jokers[0].growth={multiplier:{n:'2',d:'1'}};return state;};
for(const kind of ['jokers','tools','items'] as const)it(kind+' receipt reflects a real command acquisition and leaves its state untouched',()=>{
 const before=initial(),offer=before.shop![kind==='jokers'?'offers':kind==='tools'?'toolOffers':'itemOffers'][0];
 const result=applyCommand(before,{runId:before.runId,commandId:'receipt-test',expectedSeq:before.commandSeq,action:{type:'BuyOffer',offerId:offer.offerId}});expect(result.ok).toBe(true);if(!result.ok)throw Error(result.code);
 const snapshot=JSON.stringify(result.state),receipt=shopPurchaseReceipt(before,result.state,kind,offer)!;expect(receipt).toBeDefined();expect(receipt.body).toContain(`金币 ${before.gold} → ${result.state.gold}`);expect(JSON.stringify(result.state)).toBe(snapshot);expect(result.state.rng).toEqual(before.rng);
 if(kind==='jokers'){expect(receipt.id).toBe(result.state.jokers[2].instanceId);expect(receipt.body).toContain('第 3 槽');expect(receipt.body).toContain('热度成长 0');expect(receipt.body).toContain('从下一手起生效');}
 if(kind==='tools'){expect(receipt.id).toBe(result.state.consumables[1].instanceId);expect(receipt.body).toContain('尚未使用');expect(receipt.body).toContain('打开工具包');}
 if(kind==='items'){expect(receipt.body).toContain('无需手动使用');expect(receipt.body).toContain('后续开店');}
 expect(shopPurchaseReceipt(result.state,result.state,kind,offer)).toBeUndefined();expect(shopPurchaseReceipt(before,{...before,commandSeq:before.commandSeq+1},kind,offer)).toBeUndefined();
});
it('existing unrelated growth cannot be presented as newly acquired growth',()=>{const before=initial();const offer=before.shop!.offers[0];const result=applyCommand(before,{runId:before.runId,commandId:'growth-receipt',expectedSeq:before.commandSeq,action:{type:'BuyOffer',offerId:offer.offerId}});if(!result.ok)throw Error(result.code);expect(shopPurchaseReceipt(before,result.state,'jokers',offer)!.body).toContain('热度成长 0');expect(result.state.jokers[0].growth.multiplier).toEqual({n:'2',d:'1'});});
