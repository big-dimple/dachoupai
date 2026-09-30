import type { PlayingCard, Rank } from './types';

export type HandType =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-kind'
  | 'straight-flush';

export interface EvaluatedHand {
  type: HandType;
  label: string;
  cards: PlayingCard[];
}

export const HAND_LABELS: Record<HandType, string> = {
  'high-card': '高牌',
  pair: '对子',
  'two-pair': '两对',
  'three-kind': '三条',
  straight: '顺子',
  flush: '同花',
  'full-house': '葫芦',
  'four-kind': '四条',
  'straight-flush': '同花顺',
};

function isStraight(ranks: Rank[]): boolean {
  if (ranks.length !== 5) return false;
  const unique = [...new Set(ranks)].sort((a, b) => a - b);
  if (unique.length !== 5) return false;
  if (unique.join(',') === '2,3,4,5,14') return true;
  return unique.every((rank, index) => index === 0 || rank === unique[index - 1] + 1);
}

export function evaluateHand(cards: PlayingCard[]): EvaluatedHand {
  if (cards.length === 0 || cards.length > 5) {
    throw new Error('evaluateHand expects between 1 and 5 cards');
  }

  const counts = new Map<Rank, number>();
  cards.forEach((card) => counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1));
  const groups = [...counts.values()].sort((a, b) => b - a);
  const flush = cards.length === 5 && cards.every((card) => card.suit === cards[0].suit);
  const straight = isStraight(cards.map((card) => card.rank));

  let type: HandType = 'high-card';
  if (straight && flush) type = 'straight-flush';
  else if (groups[0] === 4) type = 'four-kind';
  else if (groups[0] === 3 && groups[1] === 2) type = 'full-house';
  else if (flush) type = 'flush';
  else if (straight) type = 'straight';
  else if (groups[0] === 3) type = 'three-kind';
  else if (groups[0] === 2 && groups[1] === 2) type = 'two-pair';
  else if (groups[0] === 2) type = 'pair';

  return { type, label: HAND_LABELS[type], cards: [...cards] };
}
