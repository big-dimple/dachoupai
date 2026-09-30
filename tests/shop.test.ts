import { describe, expect, it } from 'vitest';
import { JOKERS } from '../src/jokers/JokerEngine';
import { createRunState } from '../src/run/runState';
import {
  buyJoker,
  canBuyJoker,
  drawShelf,
  jokerPrice,
  MAX_JOKER_SLOTS,
  payReroll,
  REROLL_COST,
  SHOP_SHELF_SIZE,
  shopPool,
  shopRng,
} from '../src/run/shop';
import type { JokerId } from '../src/jokers/types';

describe('shop pricing', () => {
  it('prices jokers by rarity', () => {
    expect(jokerPrice('pengci')).toBe(4); // common
    expect(jokerPrice('tiesuanpan')).toBe(5); // uncommon
    expect(jokerPrice('huimaqiang')).toBe(6); // rare
  });
});

describe('shopPool', () => {
  it('starts with every joker and excludes equipped ones', () => {
    const run = createRunState('s', 'amo');
    expect(shopPool(run)).toHaveLength(JOKERS.length);
    const bought = buyJoker({ ...run, gold: 99 }, 'pengci');
    expect(shopPool(bought)).not.toContain('pengci');
    expect(shopPool(bought)).toHaveLength(JOKERS.length - 1);
  });
});

describe('drawShelf', () => {
  it('is deterministic for the same shop rng derivation', () => {
    const run = createRunState('shop-seed', 'amo');
    const pool = shopPool(run);
    expect(drawShelf(shopRng('shop-seed', 1), pool)).toEqual(drawShelf(shopRng('shop-seed', 1), pool));
  });

  it('draws 3 distinct jokers without replacement', () => {
    const shelf = drawShelf(shopRng('shop-seed', 1), shopPool(createRunState('shop-seed', 'amo')));
    expect(shelf).toHaveLength(SHOP_SHELF_SIZE);
    expect(new Set(shelf).size).toBe(SHOP_SHELF_SIZE);
  });

  it('returns what is left when the pool is smaller than the shelf', () => {
    const shelf = drawShelf(shopRng('x', 1), ['pengci', 'huimaqiang'] as JokerId[]);
    expect(shelf).toHaveLength(2);
  });
});

describe('buyJoker', () => {
  it('deducts gold and equips the joker', () => {
    const run = { ...createRunState('s', 'amo'), gold: 10 };
    const next = buyJoker(run, 'pengci');
    expect(next.gold).toBe(10 - 4);
    expect(next.jokerIds).toEqual(['pengci']);
    expect(run.jokerIds).toEqual([]); // 不改旧对象
  });

  it('rejects when gold is short, slots are full, or already owned', () => {
    const base = createRunState('s', 'amo');
    expect(canBuyJoker({ ...base, gold: 3 }, 'pengci')).toBe('not-enough-gold');
    expect(canBuyJoker({ ...base, gold: 99, jokerIds: ['pengci'] }, 'pengci')).toBe('already-owned');

    // 2B 池子恰好 5 张 = 槽位数，slots-full 暂时不可达；
    // 用一个不在池里的 id 防御性验证槽位检查（未来加新牌即生效）。
    const full: JokerId[] = ['pengci', 'mantangcai', 'tiesuanpan', 'huimaqiang', 'jiedongfeng'];
    expect(full).toHaveLength(MAX_JOKER_SLOTS);
    expect(canBuyJoker({ ...base, gold: 99, jokerIds: full }, 'future-joker' as JokerId)).toBe('slots-full');

    expect(canBuyJoker({ ...base, gold: 99 }, 'pengci')).toBeNull();
    expect(() => buyJoker({ ...base, gold: 2 }, 'huimaqiang')).toThrow('not-enough-gold');
  });
});

describe('payReroll', () => {
  it('deducts the reroll cost and rejects when unaffordable', () => {
    const run = { ...createRunState('s', 'amo'), gold: REROLL_COST };
    expect(payReroll(run).gold).toBe(0);
    expect(() => payReroll(payReroll(run))).toThrow();
  });
});
