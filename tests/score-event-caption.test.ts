import {describe,it,expect} from 'vitest';
import {multiplierCaption,multiplierOverview} from '../src/game/ScoreEventCaption';
describe('saved multiplier source overview',()=>{
 it('keeps exact finite changes and the real source/factor',()=>{const c=multiplierCaption('多彩 · A♥','1.5',{n:'99',d:'1'},{n:'297',d:'2'});expect(c.text).toBe('多彩·A♥ ×1.5 99→148.5');expect(c.exact).toContain('99 → 148.5');});
 it('marks a non-terminating value approximate without altering the exact record',()=>{const before={n:'216513',d:'128'},after={n:'649539',d:'256'},c=multiplierCaption('多彩 · A♥','1.5',before,after);expect(c.text).toContain('≈1691.51→≈2537.26');expect(c.exact).toContain('216,513/128 → 649,539/256');expect(after).toEqual({n:'649539',d:'256'});});
 it('retains exact small decimals, signed values and honest rounding',()=>{expect(multiplierOverview({n:'75',d:'8'})).toBe('9.375');expect(multiplierOverview({n:'-1',d:'3'})).toBe('≈-0.33');expect(multiplierOverview({n:'1999999',d:'2000000'})).toBe('≈1');});
});
