import { it, expect, describe } from 'vitest';
import { readFileSync } from 'node:fs';
import { TANGSONG_CARD_NAMES, cardDisplayName } from '../src/game/tangsongCardNames';

describe('Tang-Song 72 Card Names', () => {
  it('covers exactly 72 functional card IDs', () => {
    const keys = Object.keys(TANGSONG_CARD_NAMES);
    expect(keys).toHaveLength(72);
  });

  it('1:1 matches half1 image manifest naming (36 cards)', () => {
    const half1 = JSON.parse(readFileSync(new URL('../art/sources/handdrawn-runtime-20261017-half1/manifest.json', import.meta.url), 'utf8'));
    expect(half1.assets).toHaveLength(36);
    for (const card of half1.assets) {
      expect(TANGSONG_CARD_NAMES[card.id], `Mismatch for ID ${card.id}`).toBe(card.name);
      expect(cardDisplayName(card.id)).toBe(card.name);
    }
  });

  it('1:1 matches half2 image manifest naming (36 cards)', () => {
    const half2 = JSON.parse(readFileSync(new URL('../art/sources/handdrawn-runtime-20261017-half2/manifest.json', import.meta.url), 'utf8'));
    expect(half2.assets).toHaveLength(36);
    for (const card of half2.assets) {
      expect(TANGSONG_CARD_NAMES[card.id], `Mismatch for ID ${card.id}`).toBe(card.name);
      expect(cardDisplayName(card.id)).toBe(card.name);
    }
  });

  it('provides safe fallback for unknown IDs', () => {
    expect(cardDisplayName('unknown-card', '默认名字')).toBe('默认名字');
    expect(cardDisplayName('unknown-card')).toBe('unknown-card');
  });
});
