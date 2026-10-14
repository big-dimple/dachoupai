import {lockR2ChapterTargets} from '../src/domain/r2Chapter';
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
import {r2ScoringDisabledJokerIds,scoreR2Hand} from '../src/domain/scoreR2';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
const send=(s:R2RunState,action:Action)=>{const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/test/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;};
const risk=(s:R2RunState,i=2)=>{const o=s.shop!.offers[0],sold=s.jokers[i],cash=shopPurchaseCashFacts(s,o,sold);if(cash.status!=='assessed')return;return shopDeferredGrowthCashRisk(cash.afterSale,o);};
it('rates the real selected trade lower when a zero-growth buy disables retained Baochang',()=>{
 const s=replacementCashRiskFixture(),o=s.shop!.offers[0],sold=s.jokers[2],before=structuredClone(s);
 expect(readCheckpoint(makeCheckpoint(s,[]))).toMatchObject({ok:true});expect(risk(s)).toMatchObject({basis:'current-purchase',goldBeforePurchase:23,goldAfterPurchase:19});
 expect(shopRecommendation(s,o,'group',sold)).toMatchObject({stars:2,reason:'购款将停用包场',combinationHint:'',condition:expect.stringContaining('购买前23→19金')});
 expect(shopOfferGuidance(s,o,sold)).toMatchObject({stars:2,label:'推荐指数 ★★☆☆☆'});
 const scoreBefore=shopC2Score(s,['spades-7','hearts-7']).trace,afterSale=send(s,{type:'SellJoker',instanceId:sold.instanceId}),after=send(afterSale,{type:'BuyOffer',offerId:o.offerId}),scoreAfter=shopC2Score(after,['spades-7','hearts-7']).trace;
 expect([s.gold,afterSale.gold,after.gold]).toEqual([22,23,19]);expect([scoreBefore.finalScore,scoreAfter.finalScore]).toEqual(['418','217']);expect(after.jokers.find(j=>j.definitionId==='b10')!.growth).toEqual({});
 expect(scoreBefore.events.some(e=>e.sourceDefinitionId==='e08'&&e.operation==='multiply-multiplier')).toBe(true);expect(scoreAfter.events.some(e=>e.sourceDefinitionId==='e08')).toBe(false);expect(s).toEqual(before);
});
it.each([[22,0,2,19],[23,0,4,20],[22,8,4,22]] as const)('uses actual original cash %i and sold paid price %i at the 20-gold boundary', (gold,paidPrice,stars,after)=>{
 const s=replacementCashRiskFixture(gold);s.jokers[2].paidPrice=paidPrice;const o=s.shop!.offers[0],before=structuredClone(s);
 expect(shopRecommendation(s,o,'group',s.jokers[2]).stars).toBe(stars);expect(shopReplacementTransactionFacts(s,o,s.jokers[2])).toMatchObject({status:'ready',goldAfterPurchase:after});expect(s).toEqual(before);
});
it('uses the same authoritative purchase baseline after a sale, after checkpoint read and without sale history',()=>{
 const s=replacementCashRiskFixture(),o=s.shop!.offers[0],sold=send(s,{type:'SellJoker',instanceId:s.jokers[2].instanceId});
 expect(sold).toMatchObject({gold:23,shop:{soldJoker:true}});expect(sold.jokers).toHaveLength(4);expect(readCheckpoint(makeCheckpoint(sold,[]))).toMatchObject({ok:true});
 expect(shopOfferGuidance(sold,o)).toMatchObject({stars:2,label:'推荐指数 ★★☆☆☆',condition:expect.stringContaining('购买前23→19金')});
 const ordinary=structuredClone(sold);ordinary.shop!.soldJoker=false;expect(shopOfferGuidance(ordinary,o).stars).toBe(2);
});
it.each(['initial-cash-19','sold-hand-rule','sale-growth'] as const)('%s: preview and actual continuation share the post-sale buy baseline',key=>{
 const s=replacementCashRiskFixture(key==='initial-cash-19'?19:22),o=s.shop!.offers[0];
 if(key==='initial-cash-19')s.jokers[2].paidPrice=8;
 if(key==='sold-hand-rule')s.jokers[2]=r2CreateJoker('c08','held/rule',0,'none',s);
 if(key==='sale-growth')s.jokers[3]=r2CreateJoker('e06','held/sale-growth',8,'none',s);
 assertRunInvariants(s);const before=structuredClone(s);
 const preview=shopOfferGuidance(s,o,s.jokers[2]);expect(preview.stars).toBe(2);
 const sale=send(s,{type:'SellJoker',instanceId:s.jokers[2].instanceId});expect(sale.gold).toBe(23);
 if(key==='sale-growth')expect(sale.jokers.find(j=>j.definitionId==='e06')!.growth).toEqual({multiplier:{n:'1',d:'2'}});
 const continuation=shopOfferGuidance(sale,o);expect(continuation).toMatchObject({stars:2,label:'推荐指数 ★★☆☆☆'});expect(continuation.recommendation).toEqual(preview.recommendation);expect(preview.purchaseConditionLosses).toEqual(continuation.purchaseConditionLosses);expect(preview.purchaseConditionLosses.join('\n')).toContain('购款金币23→19');expect(s).toEqual(before);
});
it.each(['growth','edition'] as const)('B06 sale-enabled retained %s is already in the purchase baseline, not a buy reward',kind=>{
 const s=replacementCashRiskFixture();s.chapter=3;s.stageIndex=8;s.shop!.visitIndex=8;s.boss={definitionId:'B06',disabledSuit:null};s.chapterTargetPlan=lockR2ChapterTargets(s.chapter,s.tourMode,s.difficulty,s.boss);s.seenBossIds.push('B06');s.routeGrowth!.settlements.push({stageIndex:5,families:[]});s.routeGrowth!.clears++;
 const j=r2CreateJoker(kind==='growth'?'a05':'e03','held/newly-live',8,kind==='edition'?'foil':'none',s);if(kind==='growth')j.growth.heat={n:'40',d:'1'};s.jokers[3]=j;assertRunInvariants(s);
 const sale=send(s,{type:'SellJoker',instanceId:s.jokers[2].instanceId}),bought=send(sale,{type:'BuyOffer',offerId:s.shop!.offers[0].offerId});
 expect(sale.jokers.find(next=>next.instanceId===j.instanceId)).toEqual(j);expect(bought.jokers.find(next=>next.instanceId===j.instanceId)).toEqual(j);
 expect(r2ScoringDisabledJokerIds(s.boss,s.jokers,r2JokerDefinitionsFor(s))).toContain(j.instanceId);expect(r2ScoringDisabledJokerIds(sale.boss,sale.jokers,r2JokerDefinitionsFor(sale))).not.toContain(j.instanceId);
 const ids=['spades-7','hearts-7'],a=scoreR2Hand({...shopC2Score(s,ids).input,boss:s.boss}),b=scoreR2Hand({...shopC2Score(bought,ids).input,boss:bought.boss});
 expect(a.events.some(e=>e.sourceInstanceId===j.instanceId&&e.phase==='jokerScore')).toBe(false);expect(b.events.some(e=>e.sourceInstanceId===j.instanceId&&e.phase==='jokerScore'&&['read-growth','add-heat'].includes(e.operation))).toBe(true);
 expect(risk(s)).toBeDefined();const preview=shopOfferGuidance(s,s.shop!.offers[0],s.jokers[2]),continuation=shopOfferGuidance(sale,sale.shop!.offers[0]);expect(preview.stars).toBe(2);expect(continuation.recommendation).toEqual(preview.recommendation);
});
it('coupons and removed discounts are evaluated by the real sale and buy commands',()=>{
 const s=replacementCashRiskFixture();s.purchaseCoupons=1;expect(risk(s)).toBeUndefined();expect(shopRecommendation(s,s.shop!.offers[0],'group',s.jokers[2]).stars).toBe(4);
 s.purchaseCoupons=0;s.jokers[2]=r2CreateJoker('e02','held/discount',0,'none',s);assertRunInvariants(s);
 expect(risk(s)).toMatchObject({goldAfterPurchase:19});expect(shopReplacementTransactionFacts(s,s.shop!.offers[0],s.jokers[2])).toMatchObject({price:4,goldAfterPurchase:19});expect(shopRecommendation(s,s.shop!.offers[0],'group',s.jokers[2]).stars).toBe(2);
});
it('does not project an unspecified full shop, and only checks the authoritative buy baseline cash',()=>{
 const s=replacementCashRiskFixture(),o=s.shop!.offers[0];expect(shopRecommendation(s,o,'group').stars).toBe(4);s.gold=18;expect(risk(s)).toBeUndefined();expect(shopRecommendation(s,o,'group',s.jokers[2]).stars).toBe(4);
});
it('removed Baochang and positive purchase-growth hooks remain outside the downgrade',()=>{
 let s=replacementCashRiskFixture();expect(risk(s,0)).toBeUndefined();
 s=replacementCashRiskFixture();s.jokers[3]=r2CreateJoker('e05','held/buy-growth',8,'none',s);expect(risk(s)).toBeUndefined();expect(shopRecommendation(s,s.shop!.offers[0],'group',s.jokers[2]).stars).toBe(4);
});
it('a purchase hook on a still-disabled B06 receiver is not a current scoring compensation',()=>{
 const s=replacementCashRiskFixture();s.chapter=3;s.stageIndex=8;s.shop!.visitIndex=8;s.boss={definitionId:'B06',disabledSuit:null};s.chapterTargetPlan=lockR2ChapterTargets(s.chapter,s.tourMode,s.difficulty,s.boss);s.seenBossIds.push('B06');s.routeGrowth!.settlements.push({stageIndex:5,families:[]});s.routeGrowth!.clears++;
 s.jokers[1]=r2CreateJoker('e05','held/disabled-buy-growth',8,'none',s);assertRunInvariants(s);
 const sale=send(s,{type:'SellJoker',instanceId:s.jokers[2].instanceId}),buy=send(sale,{type:'BuyOffer',offerId:s.shop!.offers[0].offerId}),j=buy.jokers.find(j=>j.definitionId==='e05')!;
 expect(j.growth.heat).toEqual({n:'8',d:'1'});expect(r2ScoringDisabledJokerIds(buy.boss,buy.jokers,r2JokerDefinitionsFor(buy))).toContain(j.instanceId);
 expect(shopOfferGuidance(s,s.shop!.offers[0],s.jokers[2]).stars).toBe(2);expect(shopOfferGuidance(sale,sale.shop!.offers[0]).stars).toBe(2);
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
 const modifiers=replacementCashRiskFixture();modifiers.jokers[2]=r2CreateJoker('c08','held/rule',0,'none',modifiers);expect(risk(modifiers)).toBeDefined();
});
it('invalid purchase projections are not promoted to evidence and queries leave state/RNG untouched',()=>{
 const s=replacementCashRiskFixture(),before=structuredClone(s);s.shop!.offers[0].consumed=true;expect(risk(s)).toBeUndefined();s.shop!.offers[0].consumed=false;expect(s).toEqual(before);
 for(let n=0;n<3;n++)risk(s);expect(s).toEqual(before);
});
it('preserves the launched f06 rule and all three old five-star paths',()=>{
 const f=f06RecommendationFixture();expect(shopOfferGuidance(f,f.shop!.offers[0])).toMatchObject({stars:2,reason:'限4次'});
 const s=recommendationFiveStarFixture();for(const o of s.shop!.offers)expect(shopOfferGuidance(s,o).stars).toBe(5);
});
