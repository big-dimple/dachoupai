import { describe, expect, it } from 'vitest';
import { evaluateHand } from '../src/cards/handEvaluator';
import type { PlayingCard, Rank, Suit } from '../src/cards/types';
import { resolveJoker } from '../src/jokers/JokerEngine';

const c = (rank: Rank, suit: Suit): PlayingCard => ({
  id: `${suit}-${rank}`,
  rank,
  suit,
});

describe('JokerEngine', () => {
  it('碰瓷只在高牌触发并增加倍率', () => {
    const hand = evaluateHand([
      c(2, 'spades'),
      c(5, 'hearts'),
      c(8, 'clubs'),
      c(10, 'diamonds'),
      c(13, 'spades'),
    ]);
    const result = resolveJoker('pengci', { hand, playIndex: 1 });
    expect(result.triggered).toBe(true);
    expect(result.multiplierBonus).toBe(2);
  });

  it('满堂彩在成组牌触发', () => {
    const hand = evaluateHand([c(7, 'spades'), c(7, 'hearts')]);
    const result = resolveJoker('mantangcai', { hand, playIndex: 1 });
    expect(result.triggered).toBe(true);
    expect(result.heatBonus).toBe(90);
  });

  it('铁算盘按 JQKA 数量加热度', () => {
    const hand = evaluateHand([
      c(11, 'spades'),
      c(12, 'hearts'),
      c(14, 'clubs'),
    ]);
    const result = resolveJoker('tiesuanpan', { hand, playIndex: 1 });
    expect(result.heatBonus).toBe(75);
  });

  it('回马枪仅每第三手触发', () => {
    const hand = evaluateHand([c(2, 'spades')]);
    expect(resolveJoker('huimaqiang', { hand, playIndex: 2 }).triggered).toBe(false);
    expect(resolveJoker('huimaqiang', { hand, playIndex: 3 }).finalMultiplier).toBe(2);
  });

  it('借东风在顺子触发', () => {
    const hand = evaluateHand([
      c(3, 'spades'),
      c(4, 'hearts'),
      c(5, 'clubs'),
      c(6, 'diamonds'),
      c(7, 'spades'),
    ]);
    const result = resolveJoker('jiedongfeng', { hand, playIndex: 1 });
    expect(result.triggered).toBe(true);
    expect(result.multiplierBonus).toBe(1.5);
  });
});
