import { SeededRng } from '../core/SeededRng';
import type { CharacterId } from '../domain/characters';
import type { JokerId } from '../jokers/types';
import { getStage, stageClearGold, STAGES } from './stages';

/** 开局金币：够买任意一张牌（最贵 6）或普通牌 + 一次刷新 */
export const STARTING_GOLD = 6;

/**
 * r1 的计价/过关摘要，仅供纯函数复用。不是可恢复的一局。
 * 完整权威状态在 domain/run.ts；Scene 只能通过 RunController 提交命令。
 */
export interface RunSummary {
  /** 本局主种子：关卡内一切随机（洗牌、骰爷判定等）都由它派生 */
  seed: string;
  characterId: CharacterId;
  /** 0-based，指向 STAGES 中当前要打的关卡 */
  stageIndex: number;
  /** 已过各关的累计热度（不含当前关进行中的热度） */
  totalHeat: number;
  /** 金币：过关奖励所得，商店购买/刷新消耗 */
  gold: number;
  /** r1 已装备定义 ID；完整实例和顺序属于 domain/run.ts。 */
  jokerIds: readonly JokerId[];
}

export function createRunState(seed: string, characterId: CharacterId): RunSummary {
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
export function advanceStage(run: RunSummary, stageHeat: number, handsLeft = 0): RunSummary {
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

/** r1 摘要是否已过全部三场；终局权威判定属于领域 phase。 */
export function allStagesCleared(run: RunSummary): boolean {
  return run.stageIndex >= STAGES.length;
}
