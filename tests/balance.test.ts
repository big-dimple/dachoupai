/**
 * 平衡性回归门禁：贪心机器人在真实计分/商店逻辑下跑完整一局。
 * 关卡目标热度与商店经济就是用它定的初值（700/1500/2200，起始 4 金）；
 * 断言留了宽余量，只在后续改动把难度大幅拉出区间时报红。
 */
import { describe, expect, it } from 'vitest';
import { createShuffledDeck } from '../src/cards/deck';
import { evaluateHand } from '../src/cards/handEvaluator';
import type { PlayingCard } from '../src/cards/types';
import type { CharacterId } from '../src/game/characters';
import { scoreHand } from '../src/scoring/scoreHand';
import { advanceStage, createRunState, stageRng, type RunState } from '../src/run/runState';
import { buyJoker, drawShelf, jokerPrice, shopPool, shopRng } from '../src/run/shop';
import { getStage, STAGES } from '../src/run/stages';
import type { JokerId } from '../src/jokers/types';

const HAND_SIZE = 8;
const MAX_SELECTED = 5;

/** 机器人购物优先级（粗略强度排序，买得起就买，不刷新） */
const BUY_PRIORITY: JokerId[] = ['huimaqiang', 'tiesuanpan', 'jiedongfeng', 'mantangcai', 'pengci'];

function bitCount(mask: number): number {
  let count = 0;
  let m = mask;
  while (m) {
    m &= m - 1;
    count += 1;
  }
  return count;
}

function subsets(cards: PlayingCard[]): PlayingCard[][] {
  const result: PlayingCard[][] = [];
  for (let mask = 1; mask < 1 << cards.length; mask += 1) {
    if (bitCount(mask) > MAX_SELECTED) continue;
    result.push(cards.filter((_, i) => mask & (1 << i)));
  }
  return result;
}

interface StageOutcome {
  cleared: boolean;
  heat: number;
  handsLeft: number;
}

function playStage(run: RunState, character: CharacterId): StageOutcome {
  const stage = getStage(run.stageIndex);
  if (!stage) throw new Error('no stage');
  const rng = stageRng(run.seed, run.stageIndex);
  const deck = createShuffledDeck(rng);
  let hand = deck.splice(0, HAND_SIZE);
  let heat = 0;
  let handsLeft = stage.hands;
  let previousHandType: Parameters<typeof scoreHand>[2]['previousHandType'];
  let playIndex = 0;

  while (handsLeft > 0 && heat < stage.targetHeat && hand.length > 0) {
    playIndex += 1;
    let best: { cards: PlayingCard[]; finalHeat: number } | null = null;
    for (const picked of subsets(hand)) {
      const score = scoreHand(evaluateHand(picked), character, {
        previousHandType,
        handsBeforePlay: handsLeft,
        luckRoll: 0.5, // 探测用固定值；与 GameScene 一致每次出牌只消耗一次真实 luckRoll
        playIndex,
        jokerIds: run.jokerIds,
      });
      if (!best || score.finalHeat > best.finalHeat) best = { cards: picked, finalHeat: score.finalHeat };
    }
    if (!best) break;
    rng.next();
    previousHandType = evaluateHand(best.cards).type;
    heat += best.finalHeat;
    handsLeft -= 1;
    const chosenIds = new Set(best.cards.map((card) => card.id));
    hand = hand.filter((card) => !chosenIds.has(card.id));
    while (hand.length < HAND_SIZE && deck.length > 0) hand.push(deck.shift()!);
  }

  return { cleared: heat >= stage.targetHeat, heat, handsLeft };
}

export function simulateRun(seed: string, character: CharacterId): number {
  let run = createRunState(seed, character);
  let clearedStages = 0;
  // 每关开打前先逛一次店（含开局）：从真实抽到的货架里按优先级买得起就买，不刷新
  while (run.stageIndex < STAGES.length) {
    const shelf = drawShelf(shopRng(run.seed, run.stageIndex), shopPool(run));
    for (const id of BUY_PRIORITY) {
      if (shelf.includes(id) && run.jokerIds.length < 5 && run.gold >= jokerPrice(id)) {
        run = buyJoker(run, id);
      }
    }
    const outcome = playStage(run, character);
    if (!outcome.cleared) break;
    clearedStages += 1;
    run = advanceStage(run, outcome.heat, outcome.handsLeft);
  }
  return clearedStages;
}

describe('balance gate (greedy bot, real scoring)', () => {
  const seeds = Array.from({ length: 10 }, (_, i) => `balance-${i + 1}`);

  const clearedBy = (character: CharacterId) => seeds.map((seed) => simulateRun(seed, character));

  it('stage 1 stays tutorial-grade: greedy fails it on at most 3/10 seeds', () => {
    for (const character of ['erxiang', 'azao'] as CharacterId[]) {
      const failedAtFirst = clearedBy(character).filter((cleared) => cleared === 0).length;
      expect(failedAtFirst).toBeLessThanOrEqual(3);
    }
  });

  it('full run stays achievable: greedy clears all 3 stages on at least 3/10 seeds', () => {
    for (const character of ['erxiang', 'azao'] as CharacterId[]) {
      const fullClears = clearedBy(character).filter((cleared) => cleared === STAGES.length).length;
      expect(fullClears).toBeGreaterThanOrEqual(3);
    }
  });
});
