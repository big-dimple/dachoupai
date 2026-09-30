import { describe, expect, it } from 'vitest';
import { SeededRng } from '../src/core/SeededRng';

describe('SeededRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = new SeededRng('big-joker');
    const b = new SeededRng('big-joker');
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });
  it('produces deterministic shuffles', () => {
    const a = new SeededRng('stage-1');
    const b = new SeededRng('stage-1');
    expect(a.shuffle([1, 2, 3, 4, 5, 6])).toEqual(b.shuffle([1, 2, 3, 4, 5, 6]));
  });
  it('continues the baseline sequence after serializing the cursor', () => {
    const rng = new SeededRng('r01-vector');
    expect([rng.next(), rng.next()].map(value => value * 4294967296)).toEqual([1171121472, 711762313]);
    const restored = SeededRng.restore(JSON.parse(JSON.stringify(rng.snapshot())));
    expect(restored.next() * 4294967296).toBe(361259361);
  });
});
