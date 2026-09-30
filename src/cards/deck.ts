import { RANKS, SUITS, type PlayingCard } from './types';
import type { SeededRng } from '../core/SeededRng';

export function createDeck(): PlayingCard[] {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      id: `${suit}-${rank}`,
      suit,
      rank,
    })),
  );
}

export function createShuffledDeck(rng: SeededRng): PlayingCard[] {
  return rng.shuffle(createDeck());
}
