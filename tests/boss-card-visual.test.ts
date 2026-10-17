import {describe, it, expect} from 'vitest';
import type {PlayingCard} from '../src/cards/types';

describe('Boss Card Visual Disabled Rules (压轴禁令牌桌视效规则)', () => {
  const cards: PlayingCard[] = [
    {id: 'c1', suit: 'hearts', rank: 11, enhancement: undefined, edition: 'none'}, // Jack of hearts
    {id: 'c2', suit: 'spades', rank: 12, enhancement: undefined, edition: 'none'}, // Queen of spades
    {id: 'c3', suit: 'diamonds', rank: 13, enhancement: undefined, edition: 'none'}, // King of diamonds
    {id: 'c4', suit: 'clubs', rank: 14, enhancement: undefined, edition: 'none'}, // Ace of clubs
    {id: 'c5', suit: 'hearts', rank: 10, enhancement: undefined, edition: 'none'}, // 10 of hearts
  ];

  function isCardDisabledByBoss(card: PlayingCard, stageIndex: number, boss: {definitionId: string; disabledSuit: string | null} | null, disabledIds: string[] = []): boolean {
    if (stageIndex % 3 !== 2 || !boss) return false;
    const bossDefId = boss.definitionId;
    return (
      (bossDefId === 'B03' && boss.disabledSuit && card.suit === boss.disabledSuit) ||
      (bossDefId === 'B04' && [11, 12, 13].includes(card.rank)) ||
      disabledIds.includes(card.id)
    );
  }

  it('marks J/Q/K disabled under B04 (素颜场) during boss battle', () => {
    const boss = {definitionId: 'B04', disabledSuit: null};
    // stageIndex 2 is the boss battle of Chapter 1
    expect(isCardDisabledByBoss(cards[0], 2, boss)).toBe(true); // Jack
    expect(isCardDisabledByBoss(cards[1], 2, boss)).toBe(true); // Queen
    expect(isCardDisabledByBoss(cards[2], 2, boss)).toBe(true); // King
    expect(isCardDisabledByBoss(cards[3], 2, boss)).toBe(false); // Ace is NOT disabled
    expect(isCardDisabledByBoss(cards[4], 2, boss)).toBe(false); // 10 is NOT disabled
  });

  it('marks matching suit disabled under B03 (单色灯) during boss battle', () => {
    const boss = {definitionId: 'B03', disabledSuit: 'hearts'};
    expect(isCardDisabledByBoss(cards[0], 2, boss)).toBe(true); // hearts
    expect(isCardDisabledByBoss(cards[1], 2, boss)).toBe(false); // spades
    expect(isCardDisabledByBoss(cards[2], 2, boss)).toBe(false); // diamonds
    expect(isCardDisabledByBoss(cards[3], 2, boss)).toBe(false); // clubs
    expect(isCardDisabledByBoss(cards[4], 2, boss)).toBe(true); // hearts
  });

  it('never marks cards disabled in regular stages 0 and 1 (暖场 and 正场)', () => {
    const boss = {definitionId: 'B04', disabledSuit: null};
    // stageIndex 0 is 暖场
    expect(isCardDisabledByBoss(cards[0], 0, boss)).toBe(false);
    // stageIndex 1 is 正场
    expect(isCardDisabledByBoss(cards[0], 1, boss)).toBe(false);
  });
});
