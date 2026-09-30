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
});
