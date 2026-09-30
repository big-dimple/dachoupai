import { describe, expect, it } from 'vitest';
import { createShuffledDeck } from '../src/cards/deck';
import {
  advanceStage,
  allStagesCleared,
  createRunState,
  stageRng,
  STARTING_GOLD,
} from '../src/run/runState';
import { getStage, isFinalStage, STAGES, stageOrderLabel } from '../src/run/stages';

describe('stages definition', () => {
  it('has exactly 3 normal stages with strictly increasing target heat', () => {
    expect(STAGES).toHaveLength(3);
    expect(STAGES[1].targetHeat).toBeGreaterThan(STAGES[0].targetHeat);
    expect(STAGES[2].targetHeat).toBeGreaterThan(STAGES[1].targetHeat);
    STAGES.forEach((stage) => expect(stage.hands).toBeGreaterThan(0));
  });

  it('resolves stages by index and labels them', () => {
    expect(getStage(0)?.id).toBe('stage-1');
    expect(getStage(3)).toBeUndefined();
    expect(stageOrderLabel(0)).toBe('第一关');
    expect(isFinalStage(2)).toBe(true);
    expect(isFinalStage(1)).toBe(false);
  });
});

describe('RunState', () => {
  it('starts at stage 0 with starter gold and no jokers (shop batch: buy-to-equip)', () => {
    const run = createRunState('seed-1', 'amo');
    expect(run.stageIndex).toBe(0);
    expect(run.totalHeat).toBe(0);
    expect(run.gold).toBe(STARTING_GOLD);
    expect(run.jokerIds).toEqual([]);
  });

  it('advanceStage accumulates heat and clear gold without mutating the old state', () => {
    const run = createRunState('seed-1', 'amo');
    const next = advanceStage(run, 1500, 2);
    expect(next.stageIndex).toBe(1);
    expect(next.totalHeat).toBe(1500);
    // 第一关 clearGold 6 + 剩余 2 手 × 2 = 10
    expect(next.gold).toBe(STARTING_GOLD + 10);
    expect(run.stageIndex).toBe(0);
    expect(run.totalHeat).toBe(0);
    expect(run.gold).toBe(STARTING_GOLD);
    expect(allStagesCleared(next)).toBe(false);
    expect(allStagesCleared(advanceStage(advanceStage(next, 1), 1))).toBe(true);
  });
});

describe('stageRng', () => {
  it('makes stage randomness fully determined by seed + stage index', () => {
    const a = createShuffledDeck(stageRng('tour-42', 0));
    const b = createShuffledDeck(stageRng('tour-42', 0));
    expect(a.map((card) => card.id)).toEqual(b.map((card) => card.id));
  });

  it('gives different stages different decks under the same seed', () => {
    const stage1 = createShuffledDeck(stageRng('tour-42', 0)).map((card) => card.id);
    const stage2 = createShuffledDeck(stageRng('tour-42', 1)).map((card) => card.id);
    expect(stage1).not.toEqual(stage2);
  });

  it('gives different seeds different decks on the same stage', () => {
    const a = createShuffledDeck(stageRng('tour-42', 0)).map((card) => card.id);
    const b = createShuffledDeck(stageRng('tour-43', 0)).map((card) => card.id);
    expect(a).not.toEqual(b);
  });
});
