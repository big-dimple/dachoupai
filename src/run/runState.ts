import { SeededRng } from '../core/SeededRng';
import type { CharacterId } from '../game/characters';
import { DEFAULT_JOKER_IDS } from '../jokers/JokerEngine';
import type { JokerId } from '../jokers/types';
import { STAGES } from './stages';

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
  /** 已装备大丑牌（Phase 2B 商店接手管理；此前默认五张全装） */
  jokerIds: readonly JokerId[];
}

export function createRunState(seed: string, characterId: CharacterId): RunState {
  return {
    seed,
    characterId,
    stageIndex: 0,
    totalHeat: 0,
    jokerIds: [...DEFAULT_JOKER_IDS],
  };
}

/**
 * 当前关结束后推进关卡：累计热度，stageIndex + 1。
 * stageIndex 可能因此等于 STAGES.length（普通关全部打完），由过场决定下一步。
 */
export function advanceStage(run: RunState, stageHeat: number): RunState {
  return {
    ...run,
    stageIndex: run.stageIndex + 1,
    totalHeat: run.totalHeat + stageHeat,
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
