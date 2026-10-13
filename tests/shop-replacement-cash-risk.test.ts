import {it,expect} from 'vitest';
import {replacementCashRiskFixture} from '../harness/fixtures/replacement-cash-risk';
import {shopDeferredGrowthCashRisk} from '../src/game/ShopReplacementCashRisk';
import {shopRecommendation} from '../src/game/ShopRecommendation';
import {shopOfferGuidance} from '../src/game/ShopOfferGuidance';
import {shopPurchaseCashFacts,shopReplacementTransactionFacts} from '../src/game/ShopRouteRelations';
import {applyCommand,assertRunInvariants,type R2RunState,type Action} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {shopC2Score} from '../harness/fixtures/shop-c2-align';
import {recommendationFiveStarFixture} from '../harness/fixtures/recommendation-evidence';
import {f06RecommendationFixture} from '../harness/fixtures/f06-recommendation';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
const send=(s:R2RunState,action:Action)=>{const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/test/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;};
const risk=(s:R2RunState,i=2)=>{const o=s.shop!.offers[0],sold=s.jokers[i],cash=shopPurchaseCashFacts(s,o,sold);if(cash.status!=='assessed')return;return shopDeferredGrowthCashRisk(s,o,sold,cash.afterSale);};
it('rates the real selected trade lower when a zero-growth buy disables retained Baochang',()=>{
 const s=replacementCashRiskFixture(),o=s.shop!.offers[0],sold=s.jokers[2],before=structuredClone(s);
 expect(readCheckpoint(makeCheckpoint(s,[]))).toMatchObject({ok:true});expect(risk(s)).toMatchObject({goldBefore:22,goldAfterPurchase:19});
 expect(shopRecommendation(s,o,'group',sold)).toMatchObject({stars:2,reason:'购后组合受损',combinationHint:'',condition:expect.stringContaining('买后19金')});
 expect(shopOfferGuidance(s,o,sold)).toMatchObject({stars:2,label:'推荐指数 ★★☆☆☆'});
 const scoreBefore=shopC2Score(s,['spades-7','hearts-7']).trace,afterSale=send(s,{type:'SellJoker',instanceId:sold.instanceId}),after=send(afterSale,{type:'BuyOffer',offerId:o.offerId}),scoreAfter=shopC2Score(after,['spades-7','hearts-7']).trace;
 expect([s.gold,afterSale.gold,after.gold]).toEqual([22,23,19]);expect([scoreBefore.finalScore,scoreAfter.finalScore]).toEqual(['418','217']);expect(after.jokers.find(j=>j.definitionId==='b10')!.growth).toEqual({});
 expect(scoreBefore.events.some(e=>e.sourceDefinitionId==='e08'&&e.operation==='multiply-multiplier')).toBe(true);expect(scoreAfter.events.some(e=>e.sourceDefinitionId==='e08')).toBe(false);expect(s).toEqual(before);
});
it.each([[22,0,2,19],[23,0,4,20],[22,8,4,22]] as const)('uses actual original cash %i and sold paid price %i at the 20-gold boundary', (gold,paidPrice,stars,after)=>{
 const s=replacementCashRiskFixture(gold);s.jokers[2].paidPrice=paidPrice;const o=s.shop!.offers[0],before=structuredClone(s);
 expect(shopRecommendation(s,o,'group',s.jokers[2]).stars).toBe(stars);expect(shopReplacementTransactionFacts(s,o,s.jokers[2])).toMatchObject({status:'ready',goldAfterPurchase:after});expect(s).toEqual(before);
});
it('keeps the same conservative rating after the actual sale, through a cold-readable one-slot purchase',()=>{
 const s=replacementCashRiskFixture(),o=s.shop!.offers[0],sold=send(s,{type:'SellJoker',instanceId:s.jokers[2].instanceId});
 expect(sold).toMatchObject({gold:23,shop:{soldJoker:true}});expect(sold.jokers).toHaveLength(4);expect(readCheckpoint(makeCheckpoint(sold,[]))).toMatchObject({ok:true});
 expect(shopOfferGuidance(sold,o)).toMatchObject({stars:2,condition:expect.stringContaining('买后19金')});
 const ordinary=structuredClone(sold);ordinary.shop!.soldJoker=false;expect(shopOfferGuidance(ordinary,o).stars).toBe(4);
});
it('coupons and removed discounts are evaluated by the real sale and buy commands',()=>{
 const s=replacementCashRiskFixture();s.purchaseCoupons=1;expect(risk(s)).toBeUndefined();expect(shopRecommendation(s,s.shop!.offers[0],'group',s.jokers[2]).stars).toBe(4);
 s.purchaseCoupons=0;s.jokers[2]=r2CreateJoker('e02','held/discount',0,'none',s);assertRunInvariants(s);
 expect(risk(s)).toMatchObject({goldAfterPurchase:19});expect(shopReplacementTransactionFacts(s,s.shop!.offers[0],s.jokers[2])).toMatchObject({price:4,goldAfterPurchase:19});expect(shopRecommendation(s,s.shop!.offers[0],'group',s.jokers[2]).stars).toBe(2);
});
it('does not treat an unspecified full shop or an already-poor build as a newly broken trade',()=>{
 const s=replacementCashRiskFixture(),o=s.shop!.offers[0];expect(shopRecommendation(s,o,'group').stars).toBe(4);s.gold=19;expect(risk(s)).toBeUndefined();expect(shopRecommendation(s,o,'group',s.jokers[2]).stars).toBe(4);
});
it('removed Baochang and positive purchase-growth hooks remain outside the downgrade',()=>{
 let s=replacementCashRiskFixture();expect(risk(s,0)).toBeUndefined();
 s=replacementCashRiskFixture();s.jokers[3]=r2CreateJoker('e05','held/buy-growth',8,'none',s);expect(risk(s)).toBeUndefined();expect(shopRecommendation(s,s.shop!.offers[0],'group',s.jokers[2]).stars).toBe(4);
});
it('ordinary zero-growth readers are eligible, while immediate heat, retrigger and edition benefits are not',()=>{
 for(const id of ['b03','c06','d09']){const s=replacementCashRiskFixture(22,id);if(id==='d09')s.jokers[3]=r2CreateJoker('d11','held/retrigger',8,'none',s);expect(risk(s)).toBeDefined();expect(shopRecommendation(s,s.shop!.offers[0],'group',s.jokers[2]).stars).toBeLessThanOrEqual(2);}
 for(const id of ['c04','b06','a06','f06']){const s=replacementCashRiskFixture(22,id);expect(risk(s)).toBeUndefined();}
 expect(risk(replacementCashRiskFixture(22,'b10','foil'))).toBeUndefined();
});
it('a live edition is a real source, while a banned edition does not exempt the same zero-growth reader',()=>{
 const s=replacementCashRiskFixture(22,'b10','foil'),o=s.shop!.offers[0],sold=s.jokers[2];
 const after=send(send(s,{type:'SellJoker',instanceId:sold.instanceId}),{type:'BuyOffer',offerId:o.offerId}),fresh=after.jokers.find(j=>j.definitionId==='b10')!;
 expect(shopC2Score(after,['spades-7','hearts-7']).trace.events.some(e=>e.sourceInstanceId===fresh.instanceId&&e.operation==='add-heat'&&e.value?.n==='25')).toBe(true);
 const banned=f06RecommendationFixture(2,{disabled:true});banned.jokers=s.jokers;banned.gold=22;banned.shop!.offers=s.shop!.offers;banned.chapterDisabledJokerId='b10';assertRunInvariants(banned);
 expect(risk(banned)).toBeDefined();expect(shopRecommendation(banned,o,'group',banned.jokers[2]).stars).toBe(1);
});
it('one actual retrigger compensation improves the fixed hand, without claiming every retrigger trade pays',()=>{
 const s=replacementCashRiskFixture(22,'b06'),o=s.shop!.offers[0],sold=s.jokers[2];
 for(const id of ['spades-7','hearts-7']){const c=s.deckInstances.find(c=>c.id===id)!;c.enhancement='multiplier-paper';c.edition='holographic';}assertRunInvariants(s);
 const before=shopC2Score(s,['spades-7','hearts-7']).trace,after=send(send(s,{type:'SellJoker',instanceId:sold.instanceId}),{type:'BuyOffer',offerId:o.offerId}),t=shopC2Score(after,['spades-7','hearts-7']).trace;
 expect(t.events.some(e=>e.sourceDefinitionId==='b06'&&e.operation==='retrigger-card')).toBe(true);expect(BigInt(t.finalScore)).toBeGreaterThan(BigInt(before.finalScore));expect(risk(s)).toBeUndefined();
});
it('a currently banned retained cash source and a changed hand-rule donor are not assumed to supply lost strength',()=>{
 const prepared=replacementCashRiskFixture(),s=f06RecommendationFixture(2,{disabled:true});s.jokers=prepared.jokers;s.gold=22;s.shop!.offers=prepared.shop!.offers;s.chapterDisabledJokerId='e08';assertRunInvariants(s);
 expect(risk(s)).toBeUndefined();expect(shopRecommendation(s,s.shop!.offers[0],'group',s.jokers[2]).stars).toBe(4);
 const boss=f06RecommendationFixture(8,{boss:true});boss.jokers=prepared.jokers;boss.gold=22;boss.shop!.offers=prepared.shop!.offers;assertRunInvariants(boss);expect(risk(boss)).toBeUndefined();
 const modifiers=replacementCashRiskFixture();modifiers.jokers[2]=r2CreateJoker('c08','held/rule',0,'none',modifiers);expect(risk(modifiers)).toBeUndefined();
});
it('invalid purchase projections are not promoted to evidence and queries leave state/RNG untouched',()=>{
 const s=replacementCashRiskFixture(),before=structuredClone(s);s.shop!.offers[0].consumed=true;expect(risk(s)).toBeUndefined();s.shop!.offers[0].consumed=false;expect(s).toEqual(before);
 for(let n=0;n<3;n++)risk(s);expect(s).toEqual(before);
});
it('preserves the launched f06 rule and all three old five-star paths',()=>{
 const f=f06RecommendationFixture();expect(shopOfferGuidance(f,f.shop!.offers[0])).toMatchObject({stars:2,reason:'限4次'});
 const s=recommendationFiveStarFixture();for(const o of s.shop!.offers)expect(shopOfferGuidance(s,o).stars).toBe(5);
});
