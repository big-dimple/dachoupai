import jokerData from '../content/jokers.json';
import type {
  JokerCondition,
  JokerContext,
  JokerDefinition,
  JokerEffect,
  JokerId,
  JokerResolution,
} from './types';

export const JOKERS = jokerData as unknown as JokerDefinition[];

function countFaceCards(context: JokerContext): number {
  return context.hand.cards.filter((card) => card.rank >= 11).length;
}

function matches(condition: JokerCondition, context: JokerContext): boolean {
  switch (condition.kind) {
    case 'always':
      return true;
    case 'hand-type-in':
      return condition.values.includes(context.hand.type);
    case 'face-card-at-least':
      return countFaceCards(context) >= condition.value;
    case 'play-number-divisible-by':
      return context.playIndex > 0 && context.playIndex % condition.value === 0;
  }
}

function applyEffect(
  resolution: JokerResolution,
  effect: JokerEffect,
  context: JokerContext,
): void {
  switch (effect.kind) {
    case 'heat-add':
      resolution.heatBonus += effect.value;
      break;
    case 'multiplier-add':
      resolution.multiplierBonus += effect.value;
      break;
    case 'final-multiplier':
      resolution.finalMultiplier *= effect.value;
      break;
    case 'heat-per-face-card':
      resolution.heatBonus += effect.value * countFaceCards(context);
      break;
  }
}

export function getJoker(id: JokerId): JokerDefinition {
  const joker = JOKERS.find((candidate) => candidate.id === id);
  if (!joker) throw new Error(`Unknown joker: ${id}`);
  return joker;
}

export function resolveJoker(id: JokerId, context: JokerContext): JokerResolution {
  const definition = getJoker(id);
  const resolution: JokerResolution = {
    id,
    name: definition.name,
    triggered: false,
    note: definition.triggerText,
    heatBonus: 0,
    multiplierBonus: 0,
    finalMultiplier: 1,
  };

  if (!matches(definition.condition, context)) return resolution;

  resolution.triggered = true;
  definition.effects.forEach((effect) => applyEffect(resolution, effect, context));
  return resolution;
}

export function resolveJokers(
  ids: readonly JokerId[],
  context: JokerContext,
): JokerResolution[] {
  return ids.map((id) => resolveJoker(id, context));
}
