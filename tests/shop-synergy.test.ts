import {describe, it, expect} from 'vitest';
import {findShopSynergy} from '../src/game/ShopSynergy';
import {createRun} from '../src/domain/run';

describe('Shop Synergy Detection (构筑微光联动)', () => {
  it('detects hero synergy when candidate matches hero playstyle', () => {
    // Su Shi (sushi / erxiang) specializes in pairs / groups
    const run = createRun({
      rulesVersion: 'r2',
      r2Profile: 'group-upgrade-v1',
      seed: 'test-synergy-1',
      runId: 'run/synergy-1',
      characterId: 'erxiang',
    });

    // b10 is group / pair focused
    const syn = findShopSynergy(run, 'b10');
    expect(syn.hasSynergy).toBe(true);
    expect(syn.heroSynergy).toBe(true);
  });

  it('detects synergy between candidate and currently held jokers', () => {
    const run = createRun({
      rulesVersion: 'r2',
      r2Profile: 'group-upgrade-v1',
      seed: 'test-synergy-2',
      runId: 'run/synergy-2',
      characterId: 'erxiang',
    });

    // Add a held joker that gives chips/heat
    const modifiedRun = {
      ...run,
      jokers: [
        {
          instanceId: 'joker/held-1',
          definitionId: 'b10',
          paidPrice: 4,
          edition: 'none' as const,
          growth: {},
        },
      ],
    };

    // Candidate b03 or multiplier
    const syn = findShopSynergy(modifiedRun, 'b03');
    expect(syn.hasSynergy).toBe(true);
    expect(syn.heldInstanceIds).toContain('joker/held-1');
    expect(syn.tag).toContain('联动');
  });

  it('returns clean negative synergy when items do not match', () => {
    const run = createRun({
      rulesVersion: 'r2',
      r2Profile: 'group-upgrade-v1',
      seed: 'test-synergy-3',
      runId: 'run/synergy-3',
      characterId: 'erxiang',
    });

    const modifiedRun = {
      ...run,
      jokers: [],
    };

    // A card unrelated to erxiang's pairs
    const syn = findShopSynergy(modifiedRun, 'nonexistent-card');
    expect(syn.hasSynergy).toBe(false);
    expect(syn.heldInstanceIds).toHaveLength(0);
  });
});
