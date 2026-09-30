export class SeededRng {
  private state: number;

  constructor(seed: string | number) {
    const text = String(seed);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    this.state = hash >>> 0;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  integer(min: number, maxInclusive: number): number {
    return Math.floor(this.next() * (maxInclusive - min + 1)) + min;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = this.integer(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
