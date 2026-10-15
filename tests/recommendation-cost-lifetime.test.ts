import {describe,it,expect} from 'vitest';
import {makeReport,fixture,held,stock,sequence,scoreInput,atLeast} from '../analysis/recommendation-cost-lifetime/model';
import {assertRunInvariants} from '../src/domain/run';
import {scoreR2Hand} from '../src/domain/scoreR2';
import {exactScore} from '../analysis/scoring-calibration/model';

describe('five-mechanism cost contract — controlled evidence, not natural play',()=>{
 const r=makeReport(),scores=(s:ReturnType<typeof sequence>)=>s.map(t=>t.score);
 it('reproduces the entire same-input report and retains the historical domain baseline; product ratings follow the new policy',()=>{
  expect(makeReport()).toEqual(r);expect(r.baseSha).toBe('4d2ff4ca8487f2f00b55516822d1a28ac3c1751f');
 });
 it('keeps late fixtures invariant-valid and explicitly does not invent family qualifications',()=>{
  const s=fixture('straight',8);expect(()=>assertRunInvariants(s)).not.toThrow();expect(s.routeGrowth).toMatchObject({clears:7,G:0,S:0,F:0});
 });
 it('f06 fourth hand still doubles, then disappears even across the next budget',()=>{
  expect(scores(r.lifetime.fresh)).toEqual(['196','196','196','196','98']);expect(scores(r.lifetime.usedThree)).toEqual(['196','98']);
  expect(r.lifetime.fresh[3].jokers).toEqual([]);expect(r.lifetime.fresh[3].relevantEvents.some(e=>e.operation==='destroy-joker')).toBe(true);
  expect([r.lifetime.early.stars,r.lifetime.late.stars]).toEqual([2,2]);
 });
 it('rare-score suppression does not pause f06 afterHand lifetime consumption',()=>{
  expect(scores(r.lifetime.suppressed)).toEqual(['98','98','98','98','98']);expect(r.lifetime.suppressed[3].jokers).toEqual([]);
  expect(r.lifetime.suppressedRating.stars).toBe(1);
 });
 it.each([['c04',['860','900'],['1260','1260']],['c06',['700','787'],['1750','1750']]] as const)('%s new growth is read only next hand, not mature value on purchase', (id,newScores,matureScores)=>{
  const g=r.growth.find(g=>g.id===id)!;expect(scores(g.new)).toEqual(newScores);expect(scores(g.mature)).toEqual(matureScores);
  expect([g.early.stars,g.late.stars,g.missing.stars]).toEqual([id==='c04'?3:2,2,1]);
 });
 it('same offer now distinguishes a negative mature replacement and is worse on every probe when replacing mature c04, and stronger when replacing e01',()=>{
  const [bad,better]=r.replacement.choices,before=r.replacement.before;
  expect([bad.rating.stars,better.rating.stars]).toEqual([1,2]);
  bad.after.forEach((t,i)=>expect(BigInt(t.score)).toBeLessThan(BigInt(before[i].score)));
  expect(scores(bad.after)).toEqual(['2722','2722','2722','2722','1361']);expect(scores(better.after)).toEqual(['5610','5610','5610','5610','2805']);
  expect(bad.compact.join('\n')).toContain('热度+100');expect(bad.compact.join('\n')).toContain('闪箔');
 });
 it('sale preserves current e11 coefficient but records next-clear eligibility loss on both choices',()=>{
  for(const c of r.replacement.choices){expect(c.retainedE11).toEqual({coefficient:{n:'3',d:'2'}});expect(c.soldFlag).toBe(true);expect(c.compact.join('\n')).toContain('下一场未售成长失效');}
 });
 it('cash thresholds are tested on paid post-purchase gold with coupons explicitly zero',()=>{
  expect(r.cash.map(c=>[c.before,c.after,c.rating.stars,c.score[0].score])).toEqual([[26,18,2,'122'],[28,20,3,'220']]);
  expect(r.specified.unselected).toEqual({status:'needs-selection'});
  expect(r.specified.choices.map(c=>[c.sold,c.transaction.price,c.transaction.goldAfterPurchase,c.rating.stars])).toEqual([['e02',6,19,2],['e11',5,23,2]]);
 });
 it('retained e08 cash loss now constrains new-purchase value',()=>{
  expect(r.retainedCash.rating.stars).toBe(1);expect(r.retainedCash.gold).toBe(19);expect(scores(r.retainedCash.before)).toEqual(['220']);expect(scores(r.retainedCash.after)).toEqual(['122']);expect(r.retainedCash.losses.join('\n')).toContain('暂不触发');
 });
 it('S03 pays purchase price, adds two cards and permanently loses one next-stage hand',()=>{
  const t=r.tools[0];expect(t.purchaseGold).toEqual([40,34]);expect(t.afterResources).toEqual({hands:3,hand:8,cards:54});expect(t.entry).toEqual({hands:3,hand:8});expect(t.failure.code).toBe('resource-floor');
 });
 it('S04 changes the actual hand type while permanently shrinking the next-stage hand',()=>{
  const t=r.tools[1];expect(t.afterResources).toEqual({hands:4,hand:7,cards:52});expect(t.entry).toEqual({hands:4,hand:7});expect(t.beforeScore[0].handType).toBe('straight');expect(t.afterScore[0].handType).toBe('straight-flush');expect(t.afterScore[0].score).toBe('8977');expect(t.failure.code).toBe('no-effect');
 });
 it('S07 sacrifice removes mature donor without cash refund or sale growth; a stronger edition need not increase score',()=>{
  const t=r.tools[2];expect(t.purchaseGold).toEqual([40,32]);expect(t.useGold).toEqual([32,32]);expect(t.soldFlag).toBe(false);expect(t.afterJokers).toEqual([{...t.beforeJokers[1],edition:'polychrome'},t.beforeJokers[2]]);expect([t.beforeScore[0].score,t.afterScore[0].score]).toEqual(['2040','1485']);
 });
 it('tool failures reject atomically, successes preserve unrelated RNG',()=>{
  for(const t of r.tools){expect(t.failure.unchanged).toBe(true);expect(t.rngUnchanged).toBe(true);}
 });
 it('query sequences consume no source state and verify exact accumulator final floor',()=>{
  const s=held(fixture('flush'),['c06']),o=stock(s,'f06'),before=structuredClone(s),t=scoreR2Hand(scoreInput(s,'flush'));
  sequence(s,'flush',2);expect(s).toEqual(before);expect(o.definitionId).toBe('f06');expect(exactScore(t.accumulator.H,t.accumulator.M)).toBe(t.finalScore);
 });
});

it('fresh-sample counting agrees with all 20 subsets of a six-card toy deck',()=>{
 const subsets:number[][]=[];for(let a=0;a<6;a++)for(let b=a+1;b<6;b++)for(let c=b+1;c<6;c++)subsets.push([a,b,c]);
 expect(atLeast(6,2,3,2)).toEqual({favorable:String(subsets.filter(s=>s.filter(i=>i<2).length>=2).length),total:String(subsets.length)});
 expect(()=>atLeast(5,6,3,2)).toThrow('invalid-sample');
});
it('f06 conditional lifetime gains stop after four calls on all three routes; +50 can beat x2',()=>{
 for(const w of makeReport().lifetimeWindows){expect(w.sourceUnchanged).toBe(true);expect(w.windows[1].delta).toBe(w.windows[2].delta);expect(w.change[3].jokers).toEqual([]);expect(w.cost).toMatchObject({paid:8,useFee:0,newUses:4});}
 const w=makeReport().lifetimeWindows[0];expect(BigInt(w.plus50.delta)).toBeGreaterThan(BigInt(w.plus50.f06FirstDelta));
});
it('a last known hand cannot read its own newly earned growth; three routes use identical timing',()=>{
 for(const g of makeReport().growth){expect(g.lastKnownHand[0].score).toBe(g.new[0].score);expect(g.lastKnownHand[0].relevantEvents.some(e=>e.operation==='add-growth')).toBe(true);expect(BigInt(g.new[0].score)).toBeLessThan(BigInt(g.mature[0].score));expect([g.early.stars,g.mid.stars,g.late.stars,g.missing.stars]).toEqual([g.id==='c04'?3:2,g.id==='c04'?3:2,2,1]);}
});
it('formation witnesses expose a uniform fresh-hand assumption and permanent resource reduction',()=>{
 const [copy,dye]=makeReport().tools;expect(copy.formation!.after.K).toBe(6);expect(copy.formation!.before.K).toBe(4);
 expect(BigInt(dye.formation!.after.favorable)).toBe(BigInt(dye.formation!.after.total));expect(dye.formation!.after.h).toBe(7);
});
