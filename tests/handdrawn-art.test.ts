import {it, expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import manifest from '../public/assets/handdrawn-p08/manifest.json';
import {HANDDRAWN_ART, HANDDRAWN_SOURCE, handdrawnPath, COURT_ART, courtArtKey} from '../src/game/HanddrawnArt';
import {JOKER_ART, jokerArtAlignedLayers, jokerArtKey, reviewedCardPath} from '../src/game/jokerArt';
import {CHARACTERS} from '../src/game/characters';

it('pins all 165 runtime bytes and purpose paths independently of provenance status', () => {
  expect(HANDDRAWN_SOURCE).toBe('c618cee93089bb2e556f16567709b0ea23abbcb9');
  expect(HANDDRAWN_ART).toHaveLength(81);
  let count = 0, total = 0;
  for (const asset of manifest.assets) for (const output of asset.outputs) {
    const bytes = readFileSync(new URL('../public/assets/handdrawn-p08/' + output.path, import.meta.url));
    expect(bytes.length).toBe(output.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(output.sha256);
    expect(handdrawnPath(asset.id, output.purpose)).toBe('assets/handdrawn-p08/' + output.path);
    count++; total += bytes.length;
  }
  expect(count).toBe(165); expect(total).toBe(10112306); expect(manifest.runtimeBytes).toBe(total);
});

it('preserves six role mappings and independent rank-specific JQK faces', () => {
  for (const character of CHARACTERS) {
    expect(character.portrait).toContain('/assets/tangsong-portraits/');
    for (const purpose of ['avatar', 'selection', 'portrait']) expect(handdrawnPath(character.id, purpose)).toBeTruthy();
  }
  expect(COURT_ART.map(a => a.rank)).toEqual([11, 12, 13]);
  for (const rank of [11, 12, 13]) expect(courtArtKey(rank)).toBe('p08-court-' + ['j', 'q', 'k'][rank - 11]);
  expect(courtArtKey(10)).toBeUndefined();
});

it('maps the complete 72-card pool to flat on-demand derivatives', () => {
  const cards = HANDDRAWN_ART.filter(a => a.category === 'functional-card');
  expect(cards).toHaveLength(72); expect(JOKER_ART).toHaveLength(72);
  expect(cards.map(a => a.id).sort()).toEqual(JOKER_ART.map(a => a.id).sort());
  for (const asset of cards) {
    const entry = JOKER_ART.find(a => a.id === asset.id)!;
    expect(entry.path).toBe(reviewedCardPath(asset.id, 'thumbnail'));
    expect(entry.detailPath).toBe(reviewedCardPath(asset.id, 'detail'));
    expect(entry.detailOnDemand).toBe(true);
    expect(jokerArtKey(asset.id)).toBe('p08-joker-' + asset.id);
    expect(jokerArtAlignedLayers(asset.id)).toBe(false);
    expect(asset.outputs.map(o => [o.purpose, o.width, o.height])).toEqual([['thumbnail', 128, 160], ['detail', 615, 768]]);
  }
});
