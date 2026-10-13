import {it,expect} from 'vitest';
import {holographicRecommendationFixture,holographicSend} from '../harness/fixtures/holographic-recommendation';
import {shopOfferGuidance} from '../src/game/ShopOfferGuidance';
import {shopRecommendation} from '../src/game/ShopRecommendation';
import {shopC2Score,shopC2PublicDeck} from '../harness/fixtures/shop-c2-align';
import {r2CreateJoker} from '../src/domain/r2Run';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {r2ScoringDisabledJokerIds,scoreR2Hand} from '../src/domain/scoreR2';
import {assertRunInvariants,type R2RunState} from '../src/domain/run';

const withoutBodySource=(s=holographicRecommendationFixture())=>holographicSend(s,{type:'SellJoker',instanceId:'held/b04'});
const guidance=(s:R2RunState)=>shopOfferGuidance(s,s.shop!.offers[0]);
const pairIds=['spades-2','hearts-2'];
const score=(s:R2RunState)=>{const {input}=shopC2Score(s,pairIds);return scoreR2Hand({...input,boss:s.stageIndex%3===2?s.boss:null,challengeDisabledJokerId:s.chapterDisabledJokerId});};

it('controlled five-slot counterexample keeps holographic +2 after the specified sale',()=>{
 const s=holographicRecommendationFixture(),before=structuredClone(s),o=s.shop!.offers[0];
 // All five comparisons retain either the enabled edition or a body additive source.
 for(const sold of s.jokers)expect(shopOfferGuidance(s,o,sold).stars).toBe(4);
 const preview=shopOfferGuidance(s,o,s.jokers[2]),sold=withoutBodySource(s),continuation=guidance(sold),bought=holographicSend(sold,{type:'BuyOffer',offerId:o.offerId});
 expect([s.gold,sold.gold,bought.gold]).toEqual([38,40,32]);
 expect(preview.recommendation).toMatchObject({stars:4,facts:{additiveSource:true}});expect(continuation.recommendation).toEqual(preview.recommendation);
 expect(bought.jokers.find(j=>j.definitionId==='e11')!.growth.coefficient).toEqual({n:'7',d:'5'});
 const t=score(bought);expect(t.events.find(e=>e.sourceInstanceId==='held/b07'&&e.reasonKey==='edition.holographic.add-multiplier')).toMatchObject({operation:'add-multiplier',value:{n:'2',d:'1'}});
 expect(t.finalScore).toBe('12474');expect(t.accumulator.H).toEqual({n:'184',d:'1'});expect(t.accumulator.M).toEqual({n:'2711943423',d:'40000000'});
 expect(s).toEqual(before);expect(s.rng).toEqual(before.rng);
});

it('enabled holographic scores +2 even when its own conditional body cannot hit',()=>{
 const s=withoutBodySource();s.jokers[1]=r2CreateJoker('b04','held/unmet-body',8,'holographic',s);shopC2PublicDeck(s,{2:4});
 const before=structuredClone(s),g=guidance(s),ids=s.deckInstances.slice(0,2).map(c=>c.id),t=shopC2Score(s,ids).trace;
 expect(g.recommendation).toMatchObject({stars:4,facts:{additiveSource:true}});
 const events=t.events.filter(e=>e.sourceInstanceId==='held/unmet-body'&&e.operation==='add-multiplier');
 expect(events).toHaveLength(1);expect(events[0]).toMatchObject({reasonKey:'edition.holographic.add-multiplier',value:{n:'2',d:'1'}});expect(s).toEqual(before);
});

it.each(['none',undefined,'foil','polychrome'] as const)('%s edition is not an additive multiplier source',edition=>{
 const s=withoutBodySource();s.jokers[1].edition=edition;assertRunInvariants(s);
 expect(guidance(s).recommendation).toMatchObject({stars:2,facts:{additiveSource:false}});
});

it('selling the only holographic instance removes its additive source',()=>{
 const s=withoutBodySource(),before=structuredClone(s),o=s.shop!.offers[0],j=s.jokers[1];
 const preview=shopOfferGuidance(s,o,j),sold=holographicSend(s,{type:'SellJoker',instanceId:j.instanceId});
 expect(preview.recommendation).toMatchObject({stars:2,facts:{additiveSource:false}});expect(guidance(sold).recommendation).toEqual(preview.recommendation);expect(s).toEqual(before);
});

it.each([[false,2],[true,4]] as const)('B06 uses the actual post-sale position (unseal=%s)',(unseal,stars)=>{
 const s=holographicRecommendationFixture();s.boss={definitionId:'B06',disabledSuit:null};s.seenBossIds[2]='B06';
 const ids=unseal?['mantangcai','f09','b04','b07','e11']:['b04','mantangcai','b07','f09','e11'];
 s.jokers=ids.map(id=>s.jokers.find(j=>j.definitionId===id)!);assertRunInvariants(s);const before=structuredClone(s),j=s.jokers.find(j=>j.definitionId==='b04')!;
 const preview=shopOfferGuidance(s,s.shop!.offers[0],j),sold=holographicSend(s,{type:'SellJoker',instanceId:j.instanceId}),disabled=r2ScoringDisabledJokerIds(sold.boss,sold.jokers,r2JokerDefinitionsFor(sold));
 expect(disabled.includes('held/b07')).toBe(!unseal);expect(preview.recommendation).toMatchObject({stars,facts:{additiveSource:unseal}});
 expect(guidance(sold).recommendation).toEqual(preview.recommendation);expect(score(sold).events.some(e=>e.reasonKey==='edition.holographic.add-multiplier')).toBe(unseal);expect(s).toEqual(before);
});

it('challenge disables the whole holographic instance, including its edition',()=>{
 const s=withoutBodySource(holographicRecommendationFixture(true)),before=structuredClone(s);
 expect(guidance(s).recommendation).toMatchObject({stars:2,facts:{additiveSource:false}});expect(score(s).events.some(e=>e.reasonKey==='edition.holographic.add-multiplier')).toBe(false);expect(s).toEqual(before);
});

const lateBoss=(s:R2RunState,id:'B15'|'B16')=>{
 s.chapter=7;s.stageIndex=20;s.shop!.visitIndex=20;s.boss={definitionId:id,disabledSuit:null};s.seenBossIds=['B01','B02','B09','B04','B05','B06',id];
 s.routeGrowth={clears:20,G:8,S:0,F:0,settlements:Array.from({length:20},(_,stageIndex)=>({stageIndex,families:stageIndex<8?['G']:[]}))};assertRunInvariants(s);return s;
};
it('B16 stops a rare holographic source but keeps a common holographic source',()=>{
 const s=lateBoss(withoutBodySource(),'B16');s.jokers[1].edition='none';s.jokers[3].edition='holographic';assertRunInvariants(s);
 expect(shopRecommendation(s,s.shop!.offers[0],'group').facts.additiveSource).toBe(false);
 expect(score(s).events.some(e=>e.reasonKey==='edition.holographic.add-multiplier')).toBe(false);
 s.jokers[1].edition='holographic';expect(shopRecommendation(s,s.shop!.offers[0],'group').facts.additiveSource).toBe(true);
 expect(score(s).events.some(e=>e.sourceInstanceId==='held/b07'&&e.reasonKey==='edition.holographic.add-multiplier')).toBe(true);
});
it('B15 real seal follows the holographic instance after reordering',()=>{
 let s=lateBoss(withoutBodySource(),'B15');s.jokers=[s.jokers[1],s.jokers[0],s.jokers[2],s.jokers[3]];
 s=holographicSend(holographicSend(s,{type:'LeaveShop'}),{type:'EnterStage'});
 const o={offerId:'check/e08',definitionId:'e08',price:8,edition:'none' as const,consumed:false};
 expect(shopRecommendation(s,o,'group')).toMatchObject({stars:4,facts:{additiveSource:true}});
 s=holographicSend(s,{type:'PlayHand',selectedIds:[s.handOrder[0]]});expect(s.phase).toBe('await-input');expect(s.stage!.sealedJokerIds).toContain('held/b07');
 const before=structuredClone(s);
 expect(shopRecommendation(s,o,'group')).toMatchObject({stars:2,facts:{additiveSource:false}});
 expect(shopC2Score(s,[s.handOrder[0]]).trace.events.some(e=>e.reasonKey==='edition.holographic.add-multiplier')).toBe(false);
 expect(s).toEqual(before);
 s=holographicSend(s,{type:'ReorderJokers',ids:[...s.jokers].reverse().map(j=>j.instanceId)});
 expect(shopRecommendation(s,o,'group')).toMatchObject({stars:2,facts:{additiveSource:false}});
 expect(before.stage!.sealedJokerIds).toEqual(s.stage!.sealedJokerIds);
});

it.each([[27,2,19],[28,4,20]] as const)('holographic does not override actual purchase cash (before=%i stars=%i after=%i)', (gold,stars,after)=>{
 const s=withoutBodySource();s.gold=gold;assertRunInvariants(s);const g=guidance(s),bought=holographicSend(s,{type:'BuyOffer',offerId:s.shop!.offers[0].offerId});
 expect(bought.gold).toBe(after);expect(g.recommendation).toMatchObject({stars,facts:{additiveSource:true}});expect(g.condition).toContain(`买后${after}金`);
});
