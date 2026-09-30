import { SeededRng } from '../core/SeededRng';
import type { CharacterId } from '../game/characters';
import type { JokerId } from '../jokers/types';
import { getStage, stageClearGold, STAGES } from './stages';

/** 开局金币：够买任意一张牌（最贵 6）或普通牌 + 一次刷新 */
export const STARTING_GOLD = 6;

/**
 * 一局（Run）的可变状态。跨 Scene 存放于 Phaser registry，键名 `runState`。
 * 更新一律走纯函数返回新对象，UI 不直接改字段。
 */
export interface RunState {
  /** 本局主种子：关卡内一切随机（洗牌、骰爷判定等）都由它派生 */
  seed: string;
  characterId: CharacterId;
  /** 0-based，指向 STAGES 中当前要打的关卡 */
  stageIndex: number;
  /** 已过各关的累计热度（不含当前关进行中的热度） */
  totalHeat: number;
  /** 金币：过关奖励所得，商店购买/刷新消耗 */
  gold: number;
  /** 已装备大丑牌，最多 5 张（商店购买进入，Batch 2C 前暂无卸下/售出） */
  jokerIds: readonly JokerId[];
}

export function createRunState(seed: string, characterId: CharacterId): RunState {
  return {
    seed,
    characterId,
    stageIndex: 0,
    totalHeat: 0,
    gold: STARTING_GOLD,
    jokerIds: [],
  };
}

/**
 * 当前关过关后推进关卡：累计热度与过关金币奖励，stageIndex + 1。
 * stageIndex 可能因此等于 STAGES.length（普通关全部打完），由过场决定下一步。
 */
export function advanceStage(run: RunState, stageHeat: number, handsLeft = 0): RunState {
  const cleared = getStage(run.stageIndex);
  return {
    ...run,
    stageIndex: run.stageIndex + 1,
    totalHeat: run.totalHeat + stageHeat,
    gold: run.gold + (cleared ? stageClearGold(cleared, handsLeft) : 0),
  };
}

/**
 * 关卡级随机源：由主种子 + 关卡序号派生。
 * 同一 seed 重开同一关，洗牌与骰爷判定序列完全一致；换关、换 seed 都会变。
 */
export function stageRng(seed: string, stageIndex: number): SeededRng {
  return new SeededRng(`${seed}/stage/${stageIndex}`);
}

/** 普通关是否已全部打完（Boss 关属 Batch 2C，打完后 stageIndex === STAGES.length）。 */
export function allStagesCleared(run: RunState): boolean {
  return run.stageIndex >= STAGES.length;
}
