import { RANKS, SUITS, type PlayingCard } from '../cards/types';

export const R2_HAND_TYPES = ['high-card', 'pair', 'two-pair', 'three-kind', 'straight', 'flush', 'full-house', 'four-kind', 'straight-flush', 'five-kind', 'flush-house', 'flush-five'] as const;
export type R2HandType = typeof R2_HAND_TYPES[number];
export interface HandRules { fourStraight?: boolean; fourFlush?: boolean }
export interface R2Hand { type: R2HandType; scoringIds: string[] }

export function validateCardInstances(cards: readonly PlayingCard[]): void {
  if (new Set(cards.map(c => c.id)).size !== cards.length || cards.some(c => !c.id || !RANKS.includes(c.rank) || !SUITS.includes(c.suit))) throw new Error('invalid-card-instances');
}

export function evaluateR2Hand(cards: readonly PlayingCard[], rules: HandRules): R2Hand {
  validateCardInstances(cards);
  if (!cards.length || cards.length > 5) throw new Error('invalid-selection-size');
  const groups = [...new Set(cards.map(c => c.rank))].map(rank => cards.filter(c => c.rank === rank)).sort((a, b) => b.length - a.length || b[0].rank - a[0].rank);
  const ranks = groups.map(g => g[0].rank).sort((a, b) => a - b);
  const consecutive = ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1);
  const lowAce = ranks.at(-1) === 14 && ranks.slice(0, -1).every((r, i) => r === i + 2);
  const straight = groups.length === cards.length && (consecutive || lowAce);
  const flush = cards.every(c => c.suit === cards[0].suit);
  const five = cards.length === 5;
  const house = groups[0].length === 3 && groups[1]?.length === 2;
  let type: R2HandType;
  let scoring: readonly PlayingCard[] = cards;
  if (five && flush && groups[0].length === 5) type = 'flush-five';
  else if (five && flush && house) type = 'flush-house';
  else if (groups[0].length === 5) type = 'five-kind';
  else if (five && flush && straight) type = 'straight-flush';
  else if (groups[0].length === 4) { type = 'four-kind'; scoring = groups[0]; }
  else if (house) type = 'full-house';
  else if (flush && (five || (cards.length === 4 && rules.fourFlush))) type = 'flush';
  else if (straight && (five || (cards.length === 4 && rules.fourStraight))) type = 'straight';
  else if (groups[0].length === 3) { type = 'three-kind'; scoring = groups[0]; }
  else if (groups[0].length === 2 && groups[1]?.length === 2) { type = 'two-pair'; scoring = [...groups[0], ...groups[1]]; }
  else if (groups[0].length === 2) { type = 'pair'; scoring = groups[0]; }
  else { type = 'high-card'; scoring = [cards.reduce((best, card) => card.rank > best.rank ? card : best)]; }
  const ids = new Set(scoring.map(c => c.id));
  return { type, scoringIds: cards.filter(c => ids.has(c.id)).map(c => c.id) };
}
