import { describe, expect, it } from 'vitest';
import { evaluateHand } from '../src/cards/handEvaluator';
import type { PlayingCard, Rank, Suit } from '../src/cards/types';
import { scoreHand } from '../src/scoring/scoreHand';

const c = (rank: Rank, suit: Suit): PlayingCard => ({
  id: `${suit}-${rank}`,
  rank,
  suit,
});

describe('scoreHand with jokers', () => {
  it('stacks heat and additive multiplier before final multiplier', () => {
    const hand = evaluateHand([
      c(2, 'spades'),
      c(5, 'hearts'),
      c(8, 'clubs'),
      c(11, 'diamonds'),
      c(13, 'spades'),
    ]);

    const score = scoreHand(hand, 'erxiang', {
      previousHandType: undefined,
      handsBeforePlay: 4,
      luckRoll: 0.9,
      playIndex: 1,
      jokerIds: ['pengci', 'tiesuanpan'],
    });

    expect(score.adjustedHeat).toBe(70);
    expect(score.adjustedMultiplier).toBe(3);
    expect(score.finalHeat).toBe(210);
  });

  it('applies joker final multiplier after additive score changes', () => {
    const hand = evaluateHand([c(2, 'spades')]);
    const score = scoreHand(hand, 'erxiang', {
      previousHandType: undefined,
      handsBeforePlay: 2,
      luckRoll: 0.9,
      playIndex: 3,
      jokerIds: ['pengci', 'huimaqiang'],
    });

    expect(score.adjustedHeat).toBe(20);
    expect(score.adjustedMultiplier).toBe(3);
    expect(score.combinedFinalMultiplier).toBe(2);
    expect(score.finalHeat).toBe(120);
  });
});
