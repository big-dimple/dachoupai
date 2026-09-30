export interface Fraction { n: string; d: string }
export const MAX_INTEGER_DIGITS = 4096;

const digits = (value: bigint): number => value.toString().replace('-', '').length;
const gcd = (a: bigint, b: bigint): bigint => {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
};

/** Exact domain arithmetic; decimal strings are the only persisted representation. */
export class Rational {
  readonly n: bigint;
  readonly d: bigint;

  constructor(n: bigint, d = 1n) {
    if (typeof n !== 'bigint' || typeof d !== 'bigint' || d === 0n) throw new Error('invalid-rational');
    if (d < 0n) { n = -n; d = -d; }
    const divisor = gcd(n, d);
    this.n = n / divisor;
    this.d = d / divisor;
    if (digits(this.n) > MAX_INTEGER_DIGITS || digits(this.d) > MAX_INTEGER_DIGITS) throw new Error('numeric-length-limit');
    Object.freeze(this);
  }

  static fromJSON(value: unknown): Rational {
    if (!value || typeof value !== 'object') throw new Error('invalid-rational');
    const { n, d } = value as Fraction;
    if (typeof n !== 'string' || typeof d !== 'string' || !/^-?(0|[1-9]\d*)$/.test(n) || !/^[1-9]\d*$/.test(d) || n.length > MAX_INTEGER_DIGITS + 1 || d.length > MAX_INTEGER_DIGITS) throw new Error('invalid-rational');
    return new Rational(BigInt(n), BigInt(d));
  }

  add(other: Rational): Rational {
    const common = gcd(this.d, other.d);
    return new Rational(this.n * (other.d / common) + other.n * (this.d / common), this.d * (other.d / common));
  }

  multiply(other: Rational): Rational {
    const a = gcd(this.n, other.d), b = gcd(other.n, this.d);
    return new Rational((this.n / a) * (other.n / b), (this.d / b) * (other.d / a));
  }

  compare(other: Rational): number {
    const delta = this.n * other.d - other.n * this.d;
    return delta < 0n ? -1 : delta > 0n ? 1 : 0;
  }

  floor(): bigint { return this.n < 0n ? (this.n - this.d + 1n) / this.d : this.n / this.d; }
  toJSON(): Fraction { return { n: this.n.toString(), d: this.d.toString() }; }
}
