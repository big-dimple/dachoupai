import { describe, expect, it } from 'vitest';
import { evaluateHand } from '../src/cards/handEvaluator';
import type { PlayingCard, Rank, Suit } from '../src/cards/types';

const c = (rank: Rank, suit: Suit): PlayingCard => ({ id: `${suit}-${rank}`, rank, suit });

describe('evaluateHand', () => {
  it('recognizes pair', () => {
    expect(evaluateHand([c(8, 'spades'), c(8, 'hearts')]).type).toBe('pair');
  });
  it('recognizes full house', () => {
    expect(evaluateHand([c(7, 'spades'), c(7, 'hearts'), c(7, 'clubs'), c(10, 'spades'), c(10, 'hearts')]).type).toBe('full-house');
  });
  it('recognizes four of a kind', () => {
    expect(evaluateHand([c(12, 'spades'), c(12, 'hearts'), c(12, 'clubs'), c(12, 'diamonds'), c(2, 'hearts')]).type).toBe('four-kind');
  });
  it('recognizes ace-low straight', () => {
    expect(evaluateHand([c(14, 'spades'), c(2, 'hearts'), c(3, 'clubs'), c(4, 'diamonds'), c(5, 'spades')]).type).toBe('straight');
  });
  it('recognizes straight flush', () => {
    expect(evaluateHand([c(9, 'hearts'), c(10, 'hearts'), c(11, 'hearts'), c(12, 'hearts'), c(13, 'hearts')]).type).toBe('straight-flush');
  });
});
