import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {auditCurrent, verifyIncoming, template, renderOutput} from './verify-hero-art.mjs';

const digest = data => createHash('sha256').update(data).digest('hex');
test('current 18 images fully decode and match metadata, but do not grant final art acceptance', async () => {
  const result = await auditCurrent();
  assert.equal(result.outputs, 18);
  assert.equal(result.finalYoungAdultArt, false);
  assert.equal(result.missingOriginals.length, 6);
  assert.ok(result.files.every(f => f.fullDecode && f.format === 'webp'));
});

test('incoming contract accepts reproducible fixtures and rejects invalid handoffs', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hero-art-validator-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  await fs.mkdir(path.join(root, 'originals')); await fs.mkdir(path.join(root, 'outputs'));
  const good = template();
  // Synthetic color fields are validator data only; no deliverable artwork is generated.
  for (const [i, hero] of good.characters.entries()) {
    const buffers = {};
    for (const [purpose, entry] of Object.entries(hero.sources)) {
      const data = await sharp({create: {width: entry.width, height: entry.height, channels: 3, background: {r: 25 + i * 27, g: purpose === 'eyes' ? 120 : 70, b: 40}}}).png().toBuffer();
      Object.assign(entry, {bytes: data.length, sha256: digest(data), version: 'fixture-v1', provenance: {origin: 'synthetic validator fixture', license: 'test-only generated data', licenseEvidence: 'this test'}});
      await fs.writeFile(path.join(root, entry.path), data); buffers[purpose] = data;
    }
    hero.review = {status: 'approved', reviewer: 'fixture reviewer', reviewedAt: '2026-10-15T00:00:00Z', youngAdult: true, distinctIdentity: true, samePersonEyes: true, evidence: 'synthetic fixture attestation; not real art review', sourceHashes: Object.fromEntries(Object.entries(hero.sources).map(([k, v]) => [k, v.sha256]))};
    hero.review.outputApprovals = {};
    for (const output of hero.outputs) {
      const data = await renderOutput(buffers[output.sourcePurpose], output);
      Object.assign(output, {bytes: data.length, sha256: digest(data)});
      await fs.writeFile(path.join(root, output.path), data);
      hero.review.outputApprovals[output.purpose] = {sha256: output.sha256, cropPixels: structuredClone(output.cropPixels), safeAreaPixels: structuredClone(output.safeAreaPixels)};
    }
  }
  const manifestFile = path.join(root, 'manifest.json');
  const save = m => fs.writeFile(manifestFile, JSON.stringify(m));
  await save(good);
  assert.equal((await verifyIncoming(manifestFile)).outputs, 24);
  const rejects = async (name, mutate, pattern) => t.test(name, async () => {
    const bad = structuredClone(good); mutate(bad); await save(bad);
    await assert.rejects(verifyIncoming(manifestFile), pattern);
  });
  await rejects('missing role', m => m.characters.pop(), /exact set/);
  await rejects('duplicate role', m => m.characters[1].id = m.characters[0].id, /exact set/);
  await rejects('wrong role mapping', m => m.characters[0].outputs[0].characterId = 'amo', /mapping/);
  await rejects('missing original', m => delete m.characters[0].sources.eyes, /exact set/);
  await rejects('missing license', m => m.characters[0].sources.portrait.provenance.license = '', /license/);
  await rejects('unreviewed old age', m => m.characters[0].review.youngAdult = false, /review required/);
  await rejects('review hash detached', m => m.characters[0].review.sourceHashes.portrait = 'a'.repeat(64), /bind/);
  await rejects('missing output approvals', m => delete m.characters[0].review.outputApprovals, /exact set/);
  await rejects('stale output hash approval', m => m.characters[0].review.outputApprovals.avatar.sha256 = '0'.repeat(64), /review must bind exact output/);
  await rejects('safe area changed after review', m => m.characters[0].outputs[0].safeAreaPixels.left++, /review must bind exact output/);
  await t.test('valid crop re-export cannot reuse old review', async () => {
    const bad = structuredClone(good), hero = bad.characters[0], entry = hero.outputs[0], file = path.join(root, entry.path), original = await fs.readFile(file);
    entry.cropPixels.top = 1;
    const source = await fs.readFile(path.join(root, hero.sources.portrait.path));
    const data = await renderOutput(source, entry);
    Object.assign(entry, {bytes: data.length, sha256: digest(data)}); await fs.writeFile(file, data); await save(bad);
    await assert.rejects(verifyIncoming(manifestFile), /review must bind exact output/); await fs.writeFile(file, original);
  });
  await t.test('new valid output hash cannot reuse prior output approval', async () => {
    const bad = structuredClone(good), hero = bad.characters[0], source = hero.sources.portrait, entry = hero.outputs[0];
    const sourceFile = path.join(root, source.path), file = path.join(root, entry.path);
    const originalSource = await fs.readFile(sourceFile), originalOutput = await fs.readFile(file);
    const sourceData = await sharp(originalSource).negate().png().toBuffer();
    Object.assign(source, {bytes: sourceData.length, sha256: digest(sourceData)});
    hero.review.sourceHashes.portrait = source.sha256;
    const data = await renderOutput(sourceData, entry);
    Object.assign(entry, {bytes: data.length, sha256: digest(data)});
    await fs.writeFile(sourceFile, sourceData); await fs.writeFile(file, data); await save(bad);
    await assert.rejects(verifyIncoming(manifestFile), /review must bind exact output/);
    await fs.writeFile(sourceFile, originalSource); await fs.writeFile(file, originalOutput);
  });
  await rejects('crop out of image', m => m.characters[0].outputs[0].cropPixels.left = 9999, /out of bounds/);
  await rejects('safe area clipped', m => m.characters[0].outputs[0].safeAreaPixels.top = 1700, /clipped/);
  await rejects('wrong declared size', m => m.characters[0].outputs[0].width = 255, /dimensions mismatch/);
  await rejects('wrong bytes', m => m.characters[0].outputs[0].bytes++, /bytes\/hash/);
  await rejects('wrong hash', m => m.characters[0].outputs[0].sha256 = '0'.repeat(64), /bytes\/hash/);
  await t.test('missing actual file', async () => {
    const file = path.join(root, good.characters[0].outputs[0].path), data = await fs.readFile(file);
    await fs.unlink(file); await save(good);
    await assert.rejects(verifyIncoming(manifestFile), /ENOENT/); await fs.writeFile(file, data);
  });
  await t.test('actual wrong size despite self-consistent metadata', async () => {
    const bad = structuredClone(good), entry = bad.characters[0].outputs[0], file = path.join(root, entry.path), original = await fs.readFile(file);
    const data = await sharp(original).resize(255, 256).webp().toBuffer();
    Object.assign(entry, {width: 255, bytes: data.length, sha256: digest(data)}); await fs.writeFile(file, data); await save(bad);
    await assert.rejects(verifyIncoming(manifestFile), /wrong dimensions/); await fs.writeFile(file, original);
  });
  await t.test('actual wrong format with matching dimensions/hash is rejected', async () => {
    const bad = structuredClone(good), entry = bad.characters[0].outputs[0], file = path.join(root, entry.path), original = await fs.readFile(file);
    const data = await sharp(original).png().toBuffer();
    Object.assign(entry, {bytes: data.length, sha256: digest(data)}); await fs.writeFile(file, data); await save(bad);
    await assert.rejects(verifyIncoming(manifestFile), /wrong format/); await fs.writeFile(file, original);
  });
  await t.test('corrupt full image with matching hash is rejected', async () => {
    const bad = structuredClone(good), entry = bad.characters[0].sources.portrait, file = path.join(root, entry.path), original = await fs.readFile(file);
    const data = original.subarray(0, Math.floor(original.length / 2));
    Object.assign(entry, {bytes: data.length, sha256: digest(data)}); await fs.writeFile(file, data); await save(bad);
    await assert.rejects(verifyIncoming(manifestFile)); await fs.writeFile(file, original);
  });
  await t.test('wrong pixels with correct size/hash cannot pose as a source-derived output', async () => {
    const bad = structuredClone(good), entry = bad.characters[0].outputs[0], file = path.join(root, entry.path), original = await fs.readFile(file);
    const data = await sharp(original).negate().webp({quality: 88, effort: 6}).toBuffer();
    Object.assign(entry, {bytes: data.length, sha256: digest(data)}); await fs.writeFile(file, data); await save(bad);
    await assert.rejects(verifyIncoming(manifestFile), /non-stretched/); await fs.writeFile(file, original);
  });
  await t.test('legacy hash cannot be relabelled as replacement', async () => {
    const bad = structuredClone(good), entry = bad.characters[0].outputs[0], file = path.join(root, entry.path), original = await fs.readFile(file);
    const current = await auditCurrent(), old = current.files.find(f => f.id === 'azao' && f.purpose === 'avatar');
    const data = await fs.readFile(new URL(`../public/assets/handdrawn-p08/${old.path}`, import.meta.url));
    Object.assign(entry, {bytes: data.length, sha256: digest(data)}); await fs.writeFile(file, data); await save(bad);
    await assert.rejects(verifyIncoming(manifestFile), /legacy/); await fs.writeFile(file, original);
  });
});
