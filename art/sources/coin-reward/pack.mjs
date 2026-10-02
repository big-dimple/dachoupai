/** Pack the existing-GLB render into one offline animation atlas. No game/source edits. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const input = path.resolve(root, option('--frames-dir', 'shots/coin-reward/frames'));
const output = path.resolve(root, option('--output-dir', 'public/assets/effects/coin-reward'));
const review = path.resolve(root, option('--review-dir', 'art/sources/coin-reward'));
const diagnostics = path.resolve(root, 'shots/coin-reward/pack-candidates');
const frameCount = 16, cell = 256, columns = 4, side = cell * columns, fps = 20, budget = 160 * 1024;
const qualities = [80, 85, 90, 95], requestedQuality = option('--quality');
if (requestedQuality) assert.ok(qualities.includes(Number(requestedQuality)), '--quality must be 80, 85, 90 or 95');
const hash = data => createHash('sha256').update(data).digest('hex');
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const names = Array.from({ length: frameCount }, (_, index) => `coin-${String(index).padStart(3, '0')}`);
assert.deepEqual((await readdir(input)).filter(name => /^coin-\d+\.png$/.test(name)).sort(), names.map(name => name + '.png'),
  'Exactly sixteen sequential raw renders are required; no missing or stale extra frame');

function alphaBounds(data, width, height) {
  let left = width, top = height, right = -1, bottom = -1, visiblePixels = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 0) {
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); visiblePixels++;
    }
  }
  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1, visiblePixels,
    padding: Math.min(left, top, width - 1 - right, height - 1 - bottom) };
}
const frames = [];
for (const name of names) {
  const filename = path.join(input, name + '.png'), bytes = await readFile(filename), meta = await sharp(bytes).metadata();
  assert.ok(meta.hasAlpha && meta.width === meta.height && [384, 512].includes(meta.width), `${name}: expected square 384/512 RGBA PNG`);
  if (frames.length) assert.equal(meta.width, frames[0].sourceSize, 'All source frames use one render size');
  const raw = await sharp(bytes).ensureAlpha().raw().toBuffer();
  const resized = await sharp(bytes).resize(cell, cell, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
  const sourceBounds = alphaBounds(raw, meta.width, meta.height), bounds = alphaBounds(resized, cell, cell);
  assert.ok(sourceBounds.visiblePixels > 0 && sourceBounds.padding > 0, `${name}: raw render empty or touches edge`);
  assert.ok(bounds.visiblePixels > 0 && bounds.padding >= 2, `${name}: packed frame needs at least 2px transparent padding`);
  frames.push({ name, raw: resized, sourceSize: meta.width, sourcePath: relative(filename), sourceSha256: hash(bytes), sourceBounds, bounds });
}
const atlas = await sharp({ create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(frames.map((frame, index) => ({ input: frame.raw, raw: { width: cell, height: cell, channels: 4 },
    left: index % columns * cell, top: Math.floor(index / columns) * cell }))).raw().toBuffer();
const atlasJson = {
  frames: Object.fromEntries(frames.map((frame, index) => [frame.name, {
    frame: { x: index % columns * cell, y: Math.floor(index / columns) * cell, w: cell, h: cell },
    rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: cell, h: cell }, sourceSize: { w: cell, h: cell },
  }])),
  meta: { app: 'dachoupai offline Blender coin reward', version: '1', image: 'coin-reward.webp', format: 'RGBA8888',
    size: { w: side, h: side }, scale: '1', frameRate: fps, durationMs: frameCount / fps * 1000, repeat: 0, alphaMode: 'straight' },
};
const atlasJsonBytes = Buffer.from(JSON.stringify(atlasJson, null, 2) + '\n');
await mkdir(diagnostics, { recursive: true });
const candidates = [];
const encoding = { alphaQuality: 100, effort: 6, smartSubsample: true, lossless: false };
for (const quality of qualities) {
  const bytes = await sharp(atlas, { raw: { width: side, height: side, channels: 4 } }).webp({ ...encoding, quality }).toBuffer();
  const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer();
  let squaredError = 0, channels = 0, alphaMaxError = 0;
  for (let offset = 0; offset < atlas.length; offset += 4) {
    alphaMaxError = Math.max(alphaMaxError, Math.abs(atlas[offset + 3] - decoded[offset + 3]));
    if (atlas[offset + 3] >= 8) for (let c = 0; c < 3; c++) {
      squaredError += (atlas[offset + c] - decoded[offset + c]) ** 2; channels++;
    }
  }
  assert.equal(alphaMaxError, 0, `quality ${quality}: exact alpha must be preserved`);
  const filename = path.join(diagnostics, `coin-reward-q${quality}.webp`);
  await writeFile(filename, bytes);
  candidates.push({ quality, bytes: bytes.length, sha256: hash(bytes), visibleRgbRmse: Number(Math.sqrt(squaredError / channels).toFixed(4)),
    alphaMaxError, publicationBytes: bytes.length + atlasJsonBytes.length, withinBudget: bytes.length + atlasJsonBytes.length <= budget, diagnosticPath: relative(filename), data: bytes });
}
const selected = requestedQuality ? candidates.find(row => row.quality === Number(requestedQuality)) : candidates.findLast(row => row.withinBudget);
if (!selected) {
  console.error(JSON.stringify(candidates.map(({ data, ...row }) => row), null, 2));
  throw new Error('No quality candidate fits 160KiB. Review actual compression before changing the budget or source.');
}
assert.ok(selected.withinBudget, 'Requested quality exceeds the reviewed 160KiB budget');
await mkdir(output, { recursive: true }); await mkdir(review, { recursive: true });
await writeFile(path.join(output, 'coin-reward.webp'), selected.data);
await writeFile(path.join(output, 'atlas.json'), atlasJsonBytes);

// Review every frame at 96px on the three demo backgrounds. The contact sheet stays outside public.
const tile = 96, groupWidth = tile * 3, groupHeight = tile + 24, contactWidth = groupWidth * 4, contactHeight = groupHeight * 4;
const checker = Buffer.from(`<svg width="${tile}" height="${tile}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="c" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#d5d8d6"/><path d="M0 0h8v8H0zM8 8h8v8H8z" fill="#87948e"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`);
const backgrounds = [await sharp({ create: { width: tile, height: tile, channels: 4, background: '#143b3e' } }).png().toBuffer(),
  await sharp({ create: { width: tile, height: tile, channels: 4, background: '#f3eadb' } }).png().toBuffer(), checker];
const composites = [];
for (let index = 0; index < frameCount; index++) {
  const left = index % 4 * groupWidth, top = Math.floor(index / 4) * groupHeight;
  const small = await sharp(selected.data).extract({ left: index % columns * cell, top: Math.floor(index / columns) * cell, width: cell, height: cell })
    .resize(tile, tile, { kernel: 'lanczos3' }).png().toBuffer();
  for (let bg = 0; bg < 3; bg++) {
    composites.push({ input: backgrounds[bg], left: left + bg * tile, top });
    composites.push({ input: small, left: left + bg * tile, top });
  }
  const label = Buffer.from(`<svg width="${groupWidth}" height="24" xmlns="http://www.w3.org/2000/svg"><text x="8" y="17" fill="#f3eadb" font-family="sans-serif" font-size="12">Frame ${String(index).padStart(2, '0')} / ${index * 50} ms / 96 px</text></svg>`);
  composites.push({ input: label, left, top: top + tile });
}
const contact = await sharp({ create: { width: contactWidth, height: contactHeight, channels: 4, background: '#24313b' } })
  .composite(composites).webp({ quality: 92, effort: 6 }).toBuffer();
await writeFile(path.join(review, 'review-contact.webp'), contact);
const report = {
  status: 'PASS', tools: { node: process.version, sharp: sharp.versions },
  inputDirectory: relative(input), frameCount, fps, durationMs: 800, repeat: 0, cell, atlasSize: { width: side, height: side },
  decodedRgbaBytes: side * side * 4, publicationBudgetBytes: budget, publicationBytes: selected.publicationBytes, alphaMode: 'straight', resize: { kernel: 'lanczos3', width: cell, height: cell },
  encoding, candidates: candidates.map(({ data, ...row }) => row), selectedQuality: selected.quality,
  outputs: { atlas: { path: relative(path.join(output, 'coin-reward.webp')), bytes: selected.bytes, sha256: selected.sha256 },
    metadata: { path: relative(path.join(output, 'atlas.json')), bytes: atlasJsonBytes.length, sha256: hash(atlasJsonBytes) },
    contact: { path: relative(path.join(review, 'review-contact.webp')), bytes: contact.length, sha256: hash(contact) } },
  frames: frames.map(({ raw, ...frame }) => frame),
  limitations: ['Offline candidate only; no game code, reward amount, trigger binding or runtime loading is added.',
    'Pixel padding and exact alpha are technical checks; visual acceptance and physical-device performance remain separate.'],
};
await writeFile(path.join(review, 'pack-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, selectedQuality: selected.quality, bytes: selected.bytes, publicationBytes: selected.publicationBytes, decodedRgbaBytes: report.decodedRgbaBytes,
  candidates: report.candidates.map(({ diagnosticPath, sha256, ...row }) => row), minPadding: Math.min(...frames.map(frame => frame.bounds.padding)) }, null, 2));
