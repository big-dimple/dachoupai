import { describe, expect, it } from 'vitest';
import { resolveCharacterModifier } from '../src/game/characters';

describe('character passives', () => {
  it('阿默 triples one-card plays', () => {
    const result = resolveCharacterModifier('amo', {
      cardCount: 1, handType: 'high-card', handsBeforePlay: 4, luckRoll: 0.9,
    });
    expect(result.finalMultiplier).toBe(3);
  });
  it('骰爷 uses the supplied deterministic roll', () => {
    expect(resolveCharacterModifier('touye', {
      cardCount: 5, handType: 'straight', handsBeforePlay: 4, luckRoll: 0.2,
    }).finalMultiplier).toBe(2);
  });
  it('阿燥 rewards changing hand type after the first play', () => {
    const result = resolveCharacterModifier('azao', {
      cardCount: 2, handType: 'pair', previousHandType: 'straight', handsBeforePlay: 3, luckRoll: 0.1,
    });
    expect(result.multiplierBonus).toBe(1);
  });
  it('谢幕人在最后一手翻倍', () => {
    const result = resolveCharacterModifier('xiemu', {
      cardCount: 5, handType: 'flush', handsBeforePlay: 1, luckRoll: 0.1,
    });
    expect(result.finalMultiplier).toBe(2);
  });
});
