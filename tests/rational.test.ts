import { describe, expect, it } from 'vitest';
import { Rational } from '../src/domain/rational';

describe('exact serialized rational arithmetic', () => {
  it('normalizes signs and fractions and floors only at the end (G15)', () => {
    expect(new Rational(9n, 6n).toJSON()).toEqual({ n: '3', d: '2' });
    expect(new Rational(-3n, -2n).toJSON()).toEqual({ n: '3', d: '2' });
    expect(new Rational(21n).multiply(new Rational(3n, 2n)).floor()).toBe(31n);
    expect(new Rational(-3n, 2n).floor()).toBe(-2n);
  });

  it('survives 10^1000 and JSON round trips without floating point', () => {
    const large = new Rational(10n ** 1000n);
    const chained = large.multiply(new Rational(3n, 2n)).multiply(new Rational(3n, 4n));
    expect(chained.floor()).toBe(10n ** 1000n * 9n / 8n);
    expect(Rational.fromJSON(JSON.parse(JSON.stringify(chained)))).toEqual(chained);
    expect(JSON.stringify(chained)).not.toMatch(/Infinity|NaN/);
  });

  it('matches an independent common-denominator oracle on fixed generated fractions', () => {
    for (let i = 1n; i <= 1000n; i++) {
      const a = new Rational(i, 7n);
      const b = new Rational(i + 3n, 11n);
      const sum = a.add(b);
      const product = a.multiply(b);
      // Independent unnormalized integer identities, not an expected computed by Rational.
      expect(sum.n * 77n).toBe((i * 11n + (i + 3n) * 7n) * sum.d);
      expect(product.n * 77n).toBe((i * (i + 3n)) * product.d);
    }
  });

  it('rejects zero denominators, unsafe inputs and invalid serialized values', () => {
    expect(() => new Rational(1n, 0n)).toThrow();
    for (const value of [{ n: '1', d: '0' }, { n: 'NaN', d: '1' }, { n: '1.5', d: '1' }, { n: '1', d: '-2' }]) {
      expect(() => Rational.fromJSON(value)).toThrow();
    }
    expect(() => Rational.fromJSON({n:'9'.repeat(4096),d:'1'})).not.toThrow();
    expect(() => Rational.fromJSON({n:'9'.repeat(4097),d:'1'})).toThrow();
    expect(() => new Rational(10n**4095n).multiply(new Rational(100n))).toThrow('numeric-length-limit');
  });
});
