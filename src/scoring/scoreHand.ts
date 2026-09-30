import type { EvaluatedHand, HandType } from '../cards/handEvaluator';
import { resolveCharacterModifier, type CharacterContext, type CharacterId, type CharacterModifier } from '../game/characters';

interface BaseScore { heat: number; multiplier: number }

const BASE_SCORES: Record<HandType, BaseScore> = {
  'high-card': { heat: 20, multiplier: 1 },
  pair: { heat: 40, multiplier: 2 },
  'two-pair': { heat: 70, multiplier: 2 },
  'three-kind': { heat: 100, multiplier: 3 },
  straight: { heat: 150, multiplier: 4 },
  flush: { heat: 180, multiplier: 4 },
  'full-house': { heat: 240, multiplier: 5 },
  'four-kind': { heat: 360, multiplier: 7 },
  'straight-flush': { heat: 520, multiplier: 10 },
};

export interface ScoreResult {
  hand: EvaluatedHand;
  baseHeat: number;
  baseMultiplier: number;
  modifier: CharacterModifier;
  finalHeat: number;
}

export function scoreHand(
  hand: EvaluatedHand,
  characterId: CharacterId,
  context: Omit<CharacterContext, 'cardCount' | 'handType'>,
): ScoreResult {
  const base = BASE_SCORES[hand.type];
  const modifier = resolveCharacterModifier(characterId, {
    ...context,
    cardCount: hand.cards.length,
    handType: hand.type,
  });
  const heat = base.heat + modifier.heatBonus;
  const multiplier = base.multiplier + modifier.multiplierBonus;
  return {
    hand,
    baseHeat: base.heat,
    baseMultiplier: base.multiplier,
    modifier,
    finalHeat: Math.max(0, Math.round(heat * multiplier * modifier.finalMultiplier)),
  };
}
