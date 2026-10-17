/** Rebuild only the pixel-reviewed directory-3 batch. --check is read-only. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const check = process.argv.includes('--check');
const sourceDir = 'art/sources/handdrawn-runtime-tools-20261017';
const sourceManifestPath = sourceDir + '/manifest.json';
const runtimeDir = 'public/assets/handdrawn-tools';
const runtimeManifestPath = runtimeDir + '/manifest.json';
const batch = JSON.parse(fs.readFileSync(sourceManifestPath, 'utf8'));
const runtime = JSON.parse(fs.readFileSync(runtimeManifestPath, 'utf8'));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const write = (file, bytes) => {
  if (!check) fs.writeFileSync(file, bytes);
  else if (file.endsWith('.json')) assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), JSON.parse(bytes.toString()), file + ' differs');
  else assert.deepEqual(fs.readFileSync(file), Buffer.from(bytes), file + ' differs');
};
const obsolete = new Set();
const ids = new Set();
const catalog = JSON.parse(fs.readFileSync('src/content/r2-tools.json', 'utf8'));
const definitions = [...catalog.tools, ...catalog.longTermItems];
assert.deepEqual(fs.readdirSync(sourceDir).filter(f => /\.png$/i.test(f)).sort(), batch.assets.map(a => a.sourceFilename).sort());

for (const asset of batch.assets) {
  assert.ok(!ids.has(asset.domainId), 'duplicate mapping: ' + asset.domainId);
  ids.add(asset.domainId);
  const target = runtime.assets.find(a => a.domainId === asset.domainId);
  const definition = definitions.find(d => d.id === asset.domainId);
  assert.ok(target && definition, 'unregistered ID: ' + asset.domainId);
  assert.equal(asset.id, target.id);
  assert.equal(asset.category, target.category);
  assert.equal(asset.sourceFilename, asset.domainId + ' ' + definition.name + '.png');
  assert.ok(asset.pixelObservation, 'pixel review required');
  const bytes = fs.readFileSync(path.join(sourceDir, asset.sourceFilename));
  const meta = await sharp(bytes).metadata();
  assert.equal(sha256(bytes), asset.sourceSHA256, 'source bytes changed: ' + asset.domainId);
  assert.equal(bytes.length, asset.sourceBytes);
  assert.equal(meta.width, asset.sourceWidth);
  assert.equal(meta.height, asset.sourceHeight);
  const outputs = [];
  for (const [purpose, width, height, initialQuality, budgetBytes] of [
    ['thumbnail', 128, 160, 80, 10000], ['detail', 615, 768, 78, 100000],
  ]) {
    // Reuse the existing goods-card inset: the complete border stays clear of UI framing.
    const inset = purpose === 'thumbnail' ? {width: 120, height: 150, left: 4, top: 5, right: 4, bottom: 5}
      : {width: 576, height: 720, left: 19, top: 24, right: 20, bottom: 24};
    const encode = quality => sharp(bytes).resize(inset.width, inset.height, {fit: 'contain', background: '#F3EADB'})
      .extend({left: inset.left, top: inset.top, right: inset.right, bottom: inset.bottom, background: '#F3EADB'})
      .webp({quality, effort: 6}).toBuffer();
    let quality = initialQuality, encoded = await encode(quality);
    if (encoded.length > budgetBytes) {
      let low = 34, high = initialQuality - 1;
      quality = low; encoded = await encode(low);
      assert.ok(encoded.length <= budgetBytes, asset.domainId + '/' + purpose + ' minimum-quality budget exceeded');
      while (low <= high) {
        const candidate = Math.floor((low + high) / 2), result = await encode(candidate);
        if (result.length <= budgetBytes) {quality = candidate; encoded = result; low = candidate + 1;}
        else high = candidate - 1;
      }
    }
    assert.ok(encoded.length <= budgetBytes, asset.domainId + '/' + purpose + ' byte budget exceeded');
    const hash = sha256(encoded);
    const relative = `${asset.id}-v3-${hash.slice(0, 12)}.${purpose}.webp`;
    const previous = target.outputs.find(o => o.purpose === purpose);
    assert.ok(previous, 'missing variant: ' + asset.domainId + '/' + purpose);
    if (previous.path !== relative) obsolete.add(previous.path);
    outputs.push({purpose, path: relative, width, height, bytes: encoded.length, sha256: hash, quality});
    write(path.join(runtimeDir, relative), encoded);
  }
  asset.geometry = {fit: 'contain', entireSourceSampled: true, noStretch: true,
    sourceCropPixels: {left: 0, top: 0, width: meta.width, height: meta.height}, background: '#F3EADB',
    insetBoundingBoxes: {thumbnail: {left: 4, top: 5, width: 120, height: 150}, detail: {left: 19, top: 24, width: 576, height: 720}}};
  asset.outputs = outputs;
  target.outputs = outputs;
  target.sourceBatch = batch.batch;
}
batch.encoder.sharp = sharp.versions.sharp;
batch.encoder.libwebp = sharp.versions.webp;
batch.encoder.byteBudgets = {thumbnail: 10000, detail: 100000};
batch.encoder.qualityPolicy = 'Start at thumbnailQuality/detailQuality; only if over budget, binary-search the highest fitting integer quality from 34 to the initial quality.';
const sourceJSON = JSON.stringify(batch, null, 2) + '\n';
write(sourceManifestPath, sourceJSON);
// Original sourceCommit/additionalSources retain historical provenance. This
// explicit override identifies the active source bytes for these exact IDs.
const replacement = {batch: batch.batch, baseCommit: batch.baseCommit, sourceManifestPath,
  sourceManifestSHA256: sha256(sourceJSON), sourceManifestHashPolicy: 'UTF-8 JSON.stringify(data, null, 2) plus LF', domainIds: [...ids].sort()};
runtime.replacementSources = [...(runtime.replacementSources ?? []).filter(s => s.batch !== batch.batch), replacement];
runtime.runtimeBytes = runtime.assets.reduce((sum, a) => sum + a.outputs.reduce((s, o) => s + o.bytes, 0), 0);
runtime.runtimeFileCount = runtime.assets.reduce((sum, a) => sum + a.outputs.length, 0);
write(runtimeManifestPath, JSON.stringify(runtime, null, 2) + '\n');
if (!check) {
  const active = new Set(runtime.assets.flatMap(a => a.outputs.map(o => o.path)));
  // Retire superseded outputs and any interrupted encoding from this batch only.
  for (const file of fs.readdirSync(runtimeDir)) {
    if (batch.assets.some(a => file.startsWith(a.id + '-v3-')) && !active.has(file)) obsolete.add(file);
  }
  for (const file of obsolete) {
    assert.equal(path.basename(file), file, 'unexpected superseded resource path');
    if (!active.has(file)) fs.unlinkSync(path.join(runtimeDir, file));
  }
}
assert.equal(fs.readdirSync(runtimeDir).filter(f => f.endsWith('.webp')).length, runtime.runtimeFileCount);
console.log(JSON.stringify({mode: check ? 'CHECK' : 'WRITE', cards: ids.size,
  files: runtime.runtimeFileCount, bytes: runtime.runtimeBytes, sourceManifestSHA256: replacement.sourceManifestSHA256}));
