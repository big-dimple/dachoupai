export const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
export type Rank = (typeof RANKS)[number];
export const ENHANCEMENTS=['heat-paper','multiplier-paper','glass-paper','voice-paper','gold-paper','encore-paper'] as const;
export type Enhancement=(typeof ENHANCEMENTS)[number];

export interface PlayingCard {
  id: string;
  suit: Suit;
  rank: Rank;
  enhancement?: Enhancement;
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
};

export function rankLabel(rank: Rank): string {
  if (rank <= 10) return String(rank);
  return ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' } as Record<number, string>)[rank];
}
