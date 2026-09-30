import type { EvaluatedHand, HandType } from '../cards/handEvaluator';

export type JokerId = 'pengci' | 'mantangcai' | 'tiesuanpan' | 'huimaqiang' | 'jiedongfeng';
export type JokerRarity = 'common' | 'uncommon' | 'rare';

export type JokerCondition =
  | { kind: 'always' }
  | { kind: 'hand-type-in'; values: HandType[] }
  | { kind: 'face-card-at-least'; value: number }
  | { kind: 'play-number-divisible-by'; value: number };

export type JokerEffect =
  | { kind: 'heat-add'; value: number }
  | { kind: 'multiplier-add'; value: number }
  | { kind: 'final-multiplier'; value: number }
  | { kind: 'heat-per-face-card'; value: number };

export interface JokerDefinition {
  id: JokerId;
  name: string;
  rarity: JokerRarity;
  description: string;
  triggerText: string;
  condition: JokerCondition;
  effects: JokerEffect[];
}

export interface JokerContext {
  hand: EvaluatedHand;
  playIndex: number;
}

export interface JokerResolution {
  id: JokerId;
  name: string;
  triggered: boolean;
  note: string;
  heatBonus: number;
  multiplierBonus: number;
  finalMultiplier: number;
}
