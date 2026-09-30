import stageData from '../content/stages.json';

/** 普通关卡定义：数据驱动，与计分/演出分离。Boss 关（Batch 2C）另立定义，不混进本表。 */
export interface StageDefinition {
  id: string;
  /** 关卡名，如「开台锣鼓」 */
  name: string;
  /** 过场文案 */
  intro: string;
  /** 本关目标热度 */
  targetHeat: number;
  /** 本关可出牌次数 */
  hands: number;
  /** 过关基础金币奖励（另加每张剩余出牌的 HAND_BONUS_GOLD） */
  clearGold: number;
}

export const STAGES = stageData as StageDefinition[];

const ORDER_LABELS = ['一', '二', '三', '四', '五', '六'];

/** 0-based 关卡序号；越界返回 undefined，由调用方决定走向（过场/结算）。 */
export function getStage(index: number): StageDefinition | undefined {
  return STAGES[index];
}

export function stageOrderLabel(index: number): string {
  return `第${ORDER_LABELS[index] ?? index + 1}关`;
}

export function isFinalStage(index: number): boolean {
  return index === STAGES.length - 1;
}

/** 每剩余 1 张出牌额外奖励的金币 */
export const HAND_BONUS_GOLD = 2;

/** 过关金币 = 关卡基础奖励 + 剩余出牌 × HAND_BONUS_GOLD */
export function stageClearGold(stage: StageDefinition, handsLeft: number): number {
  return stage.clearGold + Math.max(0, handsLeft) * HAND_BONUS_GOLD;
}
