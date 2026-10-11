import {it,expect} from 'vitest';
import {resultFraction,resultInteger} from '../src/game/ResultScoreNumber';
it('distinguishes exact decimal from truncated multiplier without large fractions',()=>{
 expect(resultFraction({n:'36639',d:'64'})).toBe('≈572.48');
 expect(resultFraction({n:'3',d:'2'})).toBe('1.5');
 expect(resultFraction({n:'-1',d:'3'})).toBe('≈-0.33');
});
it('marks loss of integer precision in scientific notation',()=>{
 expect(resultInteger('447110')).toBe('447,110');
 expect(resultInteger('1230000000000000')).toBe('1.23e15');
 expect(resultInteger('1230000000000001')).toBe('≈1.23e15');
 expect(resultFraction({n:'12300000000000001',d:'10'})).toBe('≈1.23e15');
});
