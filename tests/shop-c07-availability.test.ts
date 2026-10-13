import {it,expect} from 'vitest';
import {shopC2Fixture,shopC2PublicDeck,shopC2Score} from '../harness/fixtures/shop-c2-align';
import {shopRecommendation} from '../src/game/ShopRecommendation';
import {r2Price} from '../src/domain/r2Shop';
import {assertRunInvariants,type R2RunState} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {scoreR2Hand} from '../src/domain/scoreR2';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {f06RecommendationFixture} from '../harness/fixtures/f06-recommendation';

// Legal controlled card instances: duplicate rank/suit instances have distinct
// IDs. These public-deck witnesses are not natural acquisition or future draws.
const setup=(counts:Record<number,number>,held:string[]=[])=>{
 const s=shopC2PublicDeck(shopC2Fixture(['c07',...held]),counts);
 s.deckInstances.forEach(c=>c.enhancement='multiplier-paper');assertRunInvariants(s);return s;
};
const offer=(s:R2RunState)=>({offerId:'check/c07',definitionId:'c07',price:r2Price('c07','none',s),edition:'none' as const,consumed:false});
const rec=(s:R2RunState)=>shopRecommendation(s,offer(s),'flush');
const retriggers=(s:R2RunState,ids:string[])=>shopC2Score(s,ids).trace.events.filter(e=>e.sourceDefinitionId==='c07'&&e.operation==='retrigger-card');

it.each([false,true])('pure same-rank/suit cards cannot justify four stars (body payoff=%s)',bodyPayoff=>{
 const s=setup({2:6},bodyPayoff?['b02']:[]);if(bodyPayoff)s.deckInstances.forEach(c=>delete c.enhancement);
 assertRunInvariants(s);const before=structuredClone(s),ids=s.deckInstances.slice(0,5).map(c=>c.id),t=shopC2Score(s,ids).trace;
 expect(t.handType).toBe('flush-five');expect(retriggers(s,ids)).toHaveLength(0);
 expect(rec(s)).toMatchObject({stars:1,facts:{ordinaryFlushPossible:false,flushFivePossible:true},combinationHint:''});expect(s).toEqual(before);expect(s.rng).toEqual(before.rng);
});

it('pure five-card flush house is outside c07 even though it belongs to the F family',()=>{
 const s=setup({2:3,7:2}),ids=s.deckInstances.map(c=>c.id),before=structuredClone(s);
 expect(shopC2Score(s,ids).trace.handType).toBe('flush-house');expect(retriggers(s,ids)).toHaveLength(0);
 expect(rec(s)).toMatchObject({stars:1,facts:{ordinaryFlushPossible:false,flushHousePossible:true}});expect(s).toEqual(before);
});

const ordinaryCases:Record<number,number>[]=[{2:1,4:1,6:1,8:1,10:1,12:1},{2:1,3:1,4:1,5:1,6:1,7:1}];
it.each(ordinaryCases)('ordinary flush/SF witnesses retain four stars: %j',counts=>{
 const s=setup(counts),ids=s.deckInstances.slice(0,5).map(c=>c.id),before=structuredClone(s);
 expect(shopC2Score(s,ids).trace.handType).toBe(Object.hasOwn(counts,3)?'straight-flush':'flush');expect(retriggers(s,ids)).toHaveLength(1);expect(rec(s).stars).toBe(4);expect(s).toEqual(before);
});

it('a five-card SF-only pool is executable even without an ordinary-flush witness',()=>{
 const s=setup({2:1,3:1,4:1,5:1,6:1}),ids=s.deckInstances.map(c=>c.id),t=shopC2Score(s,ids).trace;
 expect(t.handType).toBe('straight-flush');expect(retriggers(s,ids)).toHaveLength(1);
 expect(rec(s)).toMatchObject({stars:3,facts:{ordinaryFlushPossible:false}});
 // A controlled actual scorer trace supplies the existing saved-type readiness;
 // it is not a natural play or acquisition record.
 s.lastTrace=t;assertRunInvariants(s);const before=structuredClone(s);
 expect(rec(s)).toMatchObject({stars:4,facts:{ordinaryFlushPossible:false}});expect(s).toEqual(before);
});

it('four hearts require the actual four-flush modifier, never a four-card SF',()=>{
 const s=setup({2:1,3:1,4:1,5:1}),ids=s.deckInstances.map(c=>c.id);
 expect(rec(s).stars).toBe(1);expect(shopC2Score(s,ids).trace.handType).toBe('high-card');expect(retriggers(s,ids)).toHaveLength(0);
 s.jokers.push(r2CreateJoker('c08','held/four-straight',8,'none',s));assertRunInvariants(s);
 expect(shopC2Score(s,ids).trace.handType).toBe('straight');expect(rec(s).stars).toBe(1);expect(retriggers(s,ids)).toHaveLength(0);
 s.jokers.push(r2CreateJoker('c09','held/four-flush',8,'none',s));assertRunInvariants(s);const before=structuredClone(s);
 expect(shopC2Score(s,ids).trace.handType).toBe('flush');expect(retriggers(s,ids)).toHaveLength(1);expect(rec(s)).toMatchObject({stars:3,facts:{ordinaryFlushPossible:true}});expect(s).toEqual(before);
});

it('four identical hearts remain four-kind even with four-flush',()=>{
 const s=setup({2:6},['c09']),ids=s.deckInstances.slice(0,4).map(c=>c.id);
 expect(shopC2Score(s,ids).trace.handType).toBe('four-kind');expect(retriggers(s,ids)).toHaveLength(0);expect(rec(s).stars).toBe(1);
});

it('B16 rare ban stays ahead of a usable flush witness',()=>{
 const s=shopC2PublicDeck(f06RecommendationFixture(7,{boss:true}),{2:1,4:1,6:1,8:1,10:1,12:1});
 s.jokers=[r2CreateJoker('c07','held/c07',8,'none',s)];s.deckInstances.forEach(c=>c.enhancement='multiplier-paper');assertRunInvariants(s);const before=structuredClone(s);
 expect(rec(s)).toMatchObject({stars:1,reason:'本场稀有计分停用'});
 const {input}=shopC2Score(s,s.deckInstances.slice(0,5).map(c=>c.id)),t=scoreR2Hand({...input,boss:s.boss,definitions:r2JokerDefinitionsFor(s)});
 expect(t.events.some(e=>e.sourceDefinitionId==='c07'&&e.operation==='retrigger-card')).toBe(false);expect(s).toEqual(before);
});
