// r1 regression only. The bot now proposes public-information actions to the same
// controller/reducer used by scenes. These ten seeds are not a balance acceptance.
import { describe, expect, it } from 'vitest';
import type { CharacterId } from '../src/domain/characters';
import { STAGES } from '../src/run/stages';
import { simulateRun } from '../src/testing/bot';

describe('balance gate (greedy bot, real scoring)', () => {
  const seeds = Array.from({ length: 10 }, (_, i) => `balance-${i + 1}`);

  const clearedBy = (character: CharacterId) => seeds.map((seed) => simulateRun(seed, character).state.stageIndex);

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
