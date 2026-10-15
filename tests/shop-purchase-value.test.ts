import {it,expect} from 'vitest';
import {fixture,held,stock,send} from '../analysis/recommendation-cost-lifetime/model';
import {shopPurchaseValue,purchaseValueWindow} from '../src/game/ShopPurchaseValue';
import {shopRecommendation} from '../src/game/ShopRecommendation';
import {toolPermanentValue} from '../src/game/ToolPermanentValue';
import {r2CreateJoker} from '../src/domain/r2Run';
import {r2Price} from '../src/domain/r2Shop';
import {recommendationFiveStarFixture} from '../harness/fixtures/recommendation-evidence';

it.each([1,3,8])('chapter %i does not give a new zero-growth body mature or future value',chapter=>{
 for(const [id,route] of [['b03','group'],['c06','flush']] as const){const s=fixture(route,chapter),o=stock(s,id),before=structuredClone(s),v=shopPurchaseValue(s,o,route)!;
  expect(v.status).toBe('assessed');if(v.status!=='assessed')throw Error('transaction');
  expect(v.rows.map(r=>r.delta)).toEqual([{minimum:'0',maximum:'0'},{minimum:'0',maximum:'0'}]);expect(shopRecommendation(s,o,route).stars).toBe(2);expect(s).toEqual(before);
 }
});
it('new c04 retains its immediate +50 body while future growth stays outside the window',()=>{
 const s=fixture('straight'),o=stock(s,'c04'),v=shopPurchaseValue(s,o,'straight')!;if(v.status!=='assessed')throw Error('transaction');
 expect(v.rows[1]).toMatchObject({keep:{minimum:'660'},change:{minimum:'860'},delta:{minimum:'200',maximum:'200'}});expect(shopRecommendation(s,o,'straight').stars).toBe(3);
});
it('f06 counts four available consumptions without forecasting four successful triggers',()=>{
 const s=fixture(),o=stock(s,'f06'),v=shopPurchaseValue(s,o,'group')!;expect(v).toMatchObject({status:'assessed',paid:8,net:8,remaining:4,ceiling:3});expect(shopRecommendation(s,o,'group').stars).toBe(2);expect(v.detail).toContain('不预支全部次数');
});
it('selected mature sale compares against keeping it, and a business sale separately loses future eligibility',()=>{
 const s=held(fixture('straight',8),['c04','jiedongfeng','e11','e01','e04']);s.jokers[0].growth={heat:{n:'100',d:'1'}};s.jokers[0].edition='foil';s.jokers[0].paidPrice=6;s.jokers[2].growth={coefficient:{n:'3',d:'2'}};const o=stock(s,'f06'),before=structuredClone(s);
 const bad=shopPurchaseValue(s,o,'straight',s.jokers[0])!,better=shopPurchaseValue(s,o,'straight',s.jokers[3])!;
 if(bad.status!=='assessed'||better.status!=='assessed')throw Error('transaction');
 expect(bad.rows[1]).toMatchObject({keep:{minimum:'2805'},change:{minimum:'2722'},delta:{minimum:'-83'}});expect(bad).toMatchObject({refund:3,paid:8,net:5,goldAfter:35,ceiling:1});expect(shopRecommendation(s,o,'straight',s.jokers[0]).stars).toBe(1);
 expect(better.rows[1]).toMatchObject({keep:{minimum:'2805'},change:{minimum:'5610'}});expect(better).toMatchObject({ceiling:2,lostInvestment:true});expect(better.detail).toContain('未出售');expect(s).toEqual(before);
});
it('full unspecific stock is conditional and each selected target recomputes cash and losses',()=>{
 const s=held(fixture(),['b02','e02','e06','e05','e11']);s.gold=24;s.purchaseCoupons=1;s.jokers[1].paidPrice=2;s.jokers[4].growth={coefficient:{n:'3',d:'2'}};const o=stock(s,'e08');
 expect(shopPurchaseValue(s,o,'group')).toMatchObject({status:'needs-selection'});expect(shopRecommendation(s,o,'group').condition).toContain('先指定替换对象');
 expect(shopPurchaseValue(s,o,'group',s.jokers[1])).toMatchObject({paid:6,goldAfter:19});expect(shopPurchaseValue(s,o,'group',s.jokers[4])).toMatchObject({paid:5,goldAfter:23});
});
it.each([[26,18,2],[28,20,3],[40,32,4]])('e08 cash %i pays down to %i and scores %i stars with its interest cost', (gold,after,stars)=>{
 const s=held(fixture(),['b02']);s.gold=gold;const o=stock(s,'e08');expect(shopPurchaseValue(s,o,'group')).toMatchObject({paid:8,goldAfter:after});expect(shopRecommendation(s,o,'group').stars).toBe(stars);
});
it('b10 cannot buy away a retained e08 cash gate even with a free slot',()=>{
 const s=held(fixture(),['b02','e08']);s.gold=23;const o=stock(s,'b10'),v=shopPurchaseValue(s,o,'group')!;
 expect(v).toMatchObject({cashLoss:true,negative:true,ceiling:1});expect(shopRecommendation(s,o,'group').stars).toBe(1);
});
it('selling fresh ordinary e05 loses its onBuyOffer business source despite positive e08 samples',()=>{
 const s=held(fixture(),['b02','e05']);s.gold=40;const o=stock(s,'e08'),before=structuredClone(s),sold=s.jokers[1];
 expect(sold).toMatchObject({edition:'none',growth:{}});
 const value=shopPurchaseValue(s,o,'group',sold);if(value?.status!=='assessed')throw Error('transaction');
 expect(value).toMatchObject({refund:3,paid:8,net:5,goldAfter:35,allPositive:true,interestLoss:false,unmeasuredLoss:false});
 expect(value.lostInvestment).toBe(true);expect(value.ceiling).toBe(2);
 expect(shopRecommendation(s,o,'group',sold).stars).toBe(2);
 expect(send(s,{type:'BuyOffer',offerId:o.offerId}).jokers.find(j=>j.definitionId==='e05')!.growth).toEqual({heat:{n:'8',d:'1'}});
 expect(s).toEqual(before);
});
it('public random intervals are conservative and ignore hidden draw order and rule cursor',()=>{
 const s=held(fixture(),['f08']),o=stock(s,'f06'),before=structuredClone(s),a=shopPurchaseValue(s,o,'group');
 s.drawPile.reverse();s.rng.rule={...s.rng.rule,state:123};const b=shopPurchaseValue(s,o,'group');expect(b).toEqual(a);
 if(a?.status!=='assessed')throw Error('transaction');expect(a.rows.some(r=>BigInt(r.delta.minimum)<=0n&&BigInt(r.delta.maximum)>0n)).toBe(true);expect(a.allPositive).toBe(false);expect(before.gold).toBe(s.gold);
});
it('fresh coefficient is not mislabeled as accumulated growth, and omitted held/slot benefits prevent promotion',()=>{
 const s=held(fixture(),['a06','d01']),o=stock(s,'e08');const a=shopPurchaseValue(s,o,'group',s.jokers[0]);expect(a).toMatchObject({lostInvestment:false});const b=shopPurchaseValue(s,o,'group',s.jokers[1]);expect(b).toMatchObject({unmeasuredLoss:true,ceiling:2});expect(b?.detail).toContain('不能据此认定净补强');
});
it('stale shop stage and lastTrace are not treated as the next opening hand',()=>{
 const s=fixture(),o=stock(s,'f06'),a=shopPurchaseValue(s,o,'group');
 const playing=send(send(fixture(),{type:'LeaveShop'}),{type:'EnterStage'});s.stage=playing.stage;s.stage!.discardsUsed=2;s.stage!.playIndex=3;
 // Only the public scoring projection is compared; this intentionally stale
 // synthetic stage is not sent through transaction invariants.
 const after={...s,jokers:[r2CreateJoker('f06','window',8,'none',s)]};
 expect(purchaseValueWindow(s,after,'group')).toEqual(a?.status==='assessed'?a.rows:[]);
});
it('keeps all three original five-star branches outside this limited calibration',()=>{
 const s=recommendationFiveStarFixture();for(const o of s.shop!.offers){expect(shopRecommendation(s,o,'group').stars).toBe(5);expect(shopRecommendation(s,o,'group').condition).toContain('先指定替换对象');expect(shopPurchaseValue(s,o,'group')).toMatchObject({calibrated:false,status:'needs-selection'});}
});
it.each(['S03','S04','S07'])('%s shows permanent cost and actual selected use without changing source state',id=>{
 const s=held(fixture('straight'),['c04','e06','e11']);s.jokers[0].growth={heat:{n:'100',d:'1'}};s.jokers[0].edition='foil';s.jokers[0].paidPrice=r2Price('c04','foil',s);s.consumables=[{instanceId:'tool',definitionId:id}];const before=structuredClone(s);
 const action={type:'UseConsumable' as const,instanceId:'tool',targetIds:id==='S03'?['spades-7']:id==='S07'?[s.jokers[1].instanceId]:[],...(id==='S04'?{suit:'hearts' as const}:{}),...(id==='S07'?{sacrificeId:s.jokers[0].instanceId}:{})};
 const text=toolPermanentValue(s,id,action);expect(text).toContain('使用净支出0金');expect(text).toContain('以保留不用为基线');expect(text).toContain('非下一手预测');expect(s).toEqual(before);
 if(id==='S07'){expect(text).toContain('不返出售金币');expect(text).toContain('热度成长 100');s.jokers[1].edition='polychrome';expect(toolPermanentValue(s,id,action)).toContain('target-already-polychrome');}
});
it('uses an owned four-straight prerequisite and removes it for a selected sale',()=>{
 const s=held(fixture('straight'),['c08']);s.deckInstances=s.deckInstances.filter(c=>c.rank>=6&&c.rank<=9);s.drawPile=s.deckInstances.map(c=>c.id);const o=stock(s,'c04'),v=shopPurchaseValue(s,o,'straight');
 if(v?.status!=='assessed')throw Error('transaction');expect(v.rows[1].ids).toHaveLength(4);expect(BigInt(v.rows[1].delta.minimum)).toBeGreaterThan(0n);
 const sold=shopPurchaseValue(s,o,'straight',s.jokers[0]);if(sold?.status!=='assessed')throw Error('transaction');expect(sold.unmeasuredLoss).toBe(true);expect(sold.ceiling).toBeLessThanOrEqual(2);
});
