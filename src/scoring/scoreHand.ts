import type { EvaluatedHand, HandType } from '../cards/handEvaluator';
import {
  resolveCharacterModifier,
  type CharacterContext,
  type CharacterId,
  type CharacterModifier,
} from '../game/characters';
import { DEFAULT_JOKER_IDS, resolveJokers } from '../jokers/JokerEngine';
import type { JokerId, JokerResolution } from '../jokers/types';

interface BaseScore {
  heat: number;
  multiplier: number;
}

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

export interface ScoreContext
  extends Omit<CharacterContext, 'cardCount' | 'handType'> {
  playIndex: number;
  jokerIds?: readonly JokerId[];
}

export interface ScoreResult {
  hand: EvaluatedHand;
  baseHeat: number;
  baseMultiplier: number;
  modifier: CharacterModifier;
  jokers: JokerResolution[];
  adjustedHeat: number;
  adjustedMultiplier: number;
  combinedFinalMultiplier: number;
  finalHeat: number;
}

export function scoreHand(
  hand: EvaluatedHand,
  characterId: CharacterId,
  context: ScoreContext,
): ScoreResult {
  const base = BASE_SCORES[hand.type];
  const modifier = resolveCharacterModifier(characterId, {
    previousHandType: context.previousHandType,
    handsBeforePlay: context.handsBeforePlay,
    luckRoll: context.luckRoll,
    cardCount: hand.cards.length,
    handType: hand.type,
  });

  const jokers = resolveJokers(context.jokerIds ?? DEFAULT_JOKER_IDS, {
    hand,
    playIndex: context.playIndex,
  });

  const adjustedHeat =
    base.heat +
    modifier.heatBonus +
    jokers.reduce((total, joker) => total + joker.heatBonus, 0);

  const adjustedMultiplier =
    base.multiplier +
    modifier.multiplierBonus +
    jokers.reduce((total, joker) => total + joker.multiplierBonus, 0);

  const jokerFinalMultiplier = jokers.reduce(
    (total, joker) => total * joker.finalMultiplier,
    1,
  );
  const combinedFinalMultiplier = modifier.finalMultiplier * jokerFinalMultiplier;

  return {
    hand,
    baseHeat: base.heat,
    baseMultiplier: base.multiplier,
    modifier,
    jokers,
    adjustedHeat,
    adjustedMultiplier,
    combinedFinalMultiplier,
    finalHeat: Math.max(
      0,
      Math.round(adjustedHeat * adjustedMultiplier * combinedFinalMultiplier),
    ),
  };
}
