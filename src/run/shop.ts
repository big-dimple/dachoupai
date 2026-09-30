import { SeededRng } from '../core/SeededRng';
import { getJoker, JOKERS } from '../jokers/JokerEngine';
import type { JokerId, JokerRarity } from '../jokers/types';
import type { RunSummary } from './runState';

/**
 * 商店规则（Batch 2B）：全部纯函数，UI 只读结果。
 * 货架随机走 shopRng 派生源，与关卡随机（stageRng）隔离，互不污染序列。
 */
export const MAX_JOKER_SLOTS = 5;
export const SHOP_SHELF_SIZE = 3;
export const REROLL_COST = 2;

export const JOKER_PRICES: Record<JokerRarity, number> = {
  common: 4,
  uncommon: 5,
  rare: 6,
};

/** 稀有度抽牌权重：普通常见、传说难遇 */
const RARITY_WEIGHTS: Record<JokerRarity, number> = {
  common: 5,
  uncommon: 3,
  rare: 2,
};

export function jokerPrice(id: JokerId): number {
  return JOKER_PRICES[getJoker(id).rarity];
}

/** 商店随机源：由主种子 + 过关后的关卡序号派生；同一次进店内刷新消耗同一序列 */
export function shopRng(seed: string, afterStageIndex: number): SeededRng {
  return new SeededRng(`${seed}/shop/${afterStageIndex}`);
}

/** 可售池：全部大丑牌中尚未装备的 */
export function shopPool(run: Pick<RunSummary, 'jokerIds'>): JokerId[] {
  return JOKERS.map((joker) => joker.id).filter((id) => !run.jokerIds.includes(id));
}

/** 按稀有度加权、不放回抽取货架；池子不足时有多少给多少 */
export function drawShelf(
  rng: SeededRng,
  pool: readonly JokerId[],
  size = SHOP_SHELF_SIZE,
): JokerId[] {
  const remaining = [...pool];
  const shelf: JokerId[] = [];
  while (shelf.length < size && remaining.length > 0) {
    const totalWeight = remaining.reduce((total, id) => total + RARITY_WEIGHTS[getJoker(id).rarity], 0);
    let roll = rng.next() * totalWeight;
    let picked = remaining.length - 1;
    for (let i = 0; i < remaining.length; i += 1) {
      roll -= RARITY_WEIGHTS[getJoker(remaining[i]).rarity];
      if (roll < 0) {
        picked = i;
        break;
      }
    }
    shelf.push(remaining.splice(picked, 1)[0]);
  }
  return shelf;
}

export type BuyError = 'already-owned' | 'slots-full' | 'not-enough-gold';

/** 返回 null 表示可购买；否则给出原因，供 UI 置灰与提示 */
export function canBuyJoker(run: Pick<RunSummary, 'jokerIds' | 'gold'>, id: JokerId): BuyError | null {
  if (run.jokerIds.includes(id)) return 'already-owned';
  if (run.jokerIds.length >= MAX_JOKER_SLOTS) return 'slots-full';
  if (run.gold < jokerPrice(id)) return 'not-enough-gold';
  return null;
}

/** 购买：扣金币、装入装备槽。不可购买时抛错——UI 应先走 canBuyJoker 置灰。 */
export function buyJoker(run: RunSummary, id: JokerId): RunSummary {
  const error = canBuyJoker(run, id);
  if (error) throw new Error(`cannot buy joker ${id}: ${error}`);
  return {
    ...run,
    gold: run.gold - jokerPrice(id),
    jokerIds: [...run.jokerIds, id],
  };
}

/** 刷新货架：扣金币，货架由调用方用同一 shopRng 序列重抽 */
export function payReroll(run: RunSummary): RunSummary {
  if (run.gold < REROLL_COST) throw new Error(`cannot reroll: need ${REROLL_COST} gold, have ${run.gold}`);
  return { ...run, gold: run.gold - REROLL_COST };
}
