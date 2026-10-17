import {expect, it} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import receipt from '../art/sources/fengmingchaoyang-art-20261017/manifest.json';
import {TANGSONG_CARD_NAMES} from '../src/game/tangsongCardNames';
import {R2_JOKERS} from '../src/content/r2Schema';
import {HANDDRAWN_ART} from '../src/game/HanddrawnArt';
import {JOKER_ART, jokerArtUrl, jokerArtPreviewUrl} from '../src/game/jokerArt';
import {PRELOAD_PIXEL_BUDGET, sceneResources} from '../src/game/SceneResources';

it('binds the user filename 风鸣朝阳.png to the actual B05 凤鸣朝阳 display ID and preserves the complete PNG', async () => {
  expect(receipt.id).toBe('b05'); expect(receipt.sourceOriginalName).toBe('风鸣朝阳.png');
  expect(TANGSONG_CARD_NAMES[receipt.id]).toBe('凤鸣朝阳');
  expect(R2_JOKERS.find(a => a.id === receipt.id)?.name).toBe('合唱班');
  const original = fs.readFileSync(new URL('../art/sources/fengmingchaoyang-art-20261017/' + receipt.sourceFilename, import.meta.url));
  expect(original.length).toBe(3737032);
  expect(createHash('sha256').update(original).digest('hex')).toBe('11055d52940eecf33d815a82b23f51171480723aaa2983e15edd37e68a6b1e45');
  // Metadata alone accepted the truncated old JPEG. Require a full strict decode of this new original.
  const decoded = await sharp(original, {failOn:'warning'}).raw().toBuffer({resolveWithObject:true});
  expect([decoded.info.width, decoded.info.height]).toEqual([1122, 1402]);
  expect(receipt.geometry).toMatchObject({fit:'contain',entireSourceSampled:true,noStretch:true,sourceCropPixels:{left:0,top:0,width:1122,height:1402}});
});

it('routes B05 thumbnails and the shared detail/zoom URL to new content paths with exact cache hashes', () => {
  const active = HANDDRAWN_ART.find(a => a.id === 'b05')!, mapping = JOKER_ART.find(a => a.id === 'b05')!;
  expect(active.outputs).toEqual(receipt.outputs);
  expect(active.currentSource.receiptCommit).toBe('70340cc590a22882948490e6276808b9d12cca70');
  expect(active.historicalSources?.at(-1)?.sourceManifestPath).toBe(receipt.previous.currentSource.sourceManifestPath);
  for (const output of active.outputs) {
    expect(output.path).toBe('cards/b05-v3-' + output.sha256.slice(0,12) + '.' + output.purpose + '.webp');
    const url = 'assets/handdrawn-p08/' + output.path + '?v=' + output.sha256;
    expect(output.purpose === 'thumbnail' ? mapping.path : mapping.detailPath).toBe(url);
    expect(output.purpose === 'thumbnail' ? jokerArtPreviewUrl('b05') : jokerArtUrl('b05')).toContain(url);
    expect(receipt.previous.outputs.some(old => old.path === output.path)).toBe(false);
  }
  expect(mapping.detailOnDemand).toBe(true);
});

it('keeps B05 within the existing 146-resource startup texture budget and leaves its detail on demand', () => {
  const startup = sceneResources('title', undefined, true), item = startup.find(a => a.key === 'p08-joker-b05')!;
  expect(startup).toHaveLength(146); expect(item.pixels).toBe(128 * 160);
  expect(item.url).toContain('b05-v3-ee1848ebb107.thumbnail.webp?v=');
  expect(startup.reduce((n,a) => n+a.pixels,0)).toBeLessThanOrEqual(PRELOAD_PIXEL_BUDGET);
  expect(startup.some(a => a.url.includes('b05-v3-808bf2fbfd26.detail.webp'))).toBe(false);
});
