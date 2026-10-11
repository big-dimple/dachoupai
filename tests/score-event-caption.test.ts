import {describe,it,expect} from 'vitest';
import {multiplierCaption,multiplierOverview} from '../src/game/ScoreEventCaption';
describe('saved multiplier source overview',()=>{
 it('keeps exact finite changes and the real source/factor',()=>{const c=multiplierCaption('多彩 · A♥',{n:'3',d:'2'},{n:'99',d:'1'},{n:'297',d:'2'});expect(c.text).toBe('多彩·A♥ ×1.5 99→148.5');expect(c.exact).toContain('99 → 148.5');});
 it('marks a non-terminating value approximate without altering the exact record',()=>{const before={n:'216513',d:'128'},after={n:'649539',d:'256'},c=multiplierCaption('多彩 · A♥',{n:'3',d:'2'},before,after);expect(c.text).toContain('≈1691.51→≈2537.26');expect(c.exact).toContain('216,513/128 → 649,539/256');expect(after).toEqual({n:'649539',d:'256'});});
 it('keeps the narrow source overview honest and preserves the precise event',()=>{const c=multiplierCaption('多彩 · A♥',{n:'3',d:'2'},{n:'216513',d:'128'},{n:'649539',d:'256'},true);expect(c.text).toBe('多彩·A♥ ×1.5 ≈1691.5→≈2537.3');expect(c.exact).toContain('216,513/128 → 649,539/256');expect(multiplierOverview({n:'40095',d:'80'},true)).toBe('≈501.2');expect(multiplierOverview({n:'297',d:'2'},true)).toBe('148.5');});
 it('retains exact small decimals, signed values and honest rounding',()=>{expect(multiplierOverview({n:'75',d:'8'})).toBe('≈9.38');expect(multiplierOverview({n:'-1',d:'3'})).toBe('≈-0.33');expect(multiplierOverview({n:'1999999',d:'2000000'})).toBe('≈1');});
});

it('uses the real saved coefficient as a readable event factor without changing numeric energy',async()=>{
 const {readableMultiplierFixture}=await import('../harness/fixtures/readable-multiplier'),{energySend}=await import('../harness/fixtures/score-energy'),{numberImpact}=await import('../src/game/ScoreEnergy');
 const f=readableMultiplierFixture('straight'),s=energySend(f.state,{type:'PlayHand',selectedIds:f.selectedIds}),e=s.lastTrace!.events.find(e=>e.operation==='read-coefficient'&&e.sourceDefinitionId==='a06')!,before=JSON.stringify(e);
 const impact=numberImpact(e,'400')!,caption=multiplierCaption('独家戏',impact.factorValue!,e.before.M,e.after.M);
 expect(impact.factor).toBe('839,523/320,000');expect(impact.factorValue).toEqual({n:'839523',d:'320000'});
 expect(impact.kind).toBe('multiply');expect(impact.tier).toBe(2);expect(impact.peak).toBeCloseTo(1.38);expect(impact.color).toBe('#b8473a');
 expect(caption.text).toBe('独家戏 ×≈2.62 4→≈10.49');expect(caption.exact).toBe('独家戏 · 实际 ×839,523/320,000 · 4 → 839,523/80,000');const {heroPayoffs}=await import('../src/game/HeroPayoff'),{heroClimaxValue}=await import('../src/game/HeroClimax');const key=heroPayoffs(s,s.lastTrace!).find(k=>k.eventId===e.eventId)!;
 expect(key.fact.effect).toBe('读取已有 ×839,523/320,000 倍率');expect(heroClimaxValue(s,s.lastTrace!,key)?.note).toBe('读取已有 ×≈2.62 倍率');expect(JSON.stringify(e)).toBe(before);
});
