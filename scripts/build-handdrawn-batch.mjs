/** Archived batch reproduction. Default/--check is read-only and never encodes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {readJSON, receiptHash, receiptOutputs, runtimeManifestPath, verifyOriginal, verifyProvenance, sha256} from './handdrawn-provenance.mjs';

export async function buildHanddrawnBatch(batch) {
  const args = process.argv.slice(2);
  assert.ok(args.every(a => ['--check', '--write'].includes(a)) && !(args.includes('--check') && args.includes('--write')), 'use --check (default) or --write');
  const write = args.includes('--write'), manifest = readJSON(runtimeManifestPath);
  await verifyProvenance(manifest);
  const sourceManifestPath = 'art/sources/' + batch + '/manifest.json';
  const receipt = readJSON(sourceManifestPath), pending = [];
  assert.equal(receipt.assets.length, 36, batch + ': incomplete batch');
  for (const item of receipt.assets) {
    const asset = manifest.assets.find(a => a.id === item.id);
    assert.ok(asset, item.id + ': unregistered asset');
    // A later receipt owns C06. Never overwrite that replacement or its source.
    if (asset.currentSource.sourceManifestPath !== sourceManifestPath) {
      assert.ok(asset.historicalSources.some(s => s.sourceManifestPath === sourceManifestPath && s.sourceManifestSHA256 === receiptHash(receipt)), item.id + ': batch is neither active nor archived');
      continue;
    }
    assert.equal(asset.currentSource.sourceManifestSHA256, receiptHash(receipt));
    if (!write) continue;
    const source = fs.readFileSync(path.posix.dirname(sourceManifestPath) + '/' + item.sourceFile);
    verifyOriginal(item, source);
    for (const output of receiptOutputs(item)) {
      const bytes = await sharp(source, {failOn: 'none'})
        .resize(output.width, output.height, {fit: item.id === 'a11' ? 'contain' : 'cover', position: 'center', background: '#000'})
        .webp({quality: output.purpose === 'thumbnail' ? 80 : 78, effort: 6}).toBuffer();
      assert.equal(sha256(bytes), output.sha256, item.id + ': encoder differs from archived receipt; stop before writing');
      assert.equal(bytes.length, output.bytes);
      pending.push(['public/assets/handdrawn-p08/' + output.path, bytes]);
    }
  }
  // Validate all results first; receipts, source metadata and obsolete URLs are immutable.
  for (const [file, bytes] of pending) fs.writeFileSync(file, bytes);
  console.log(JSON.stringify({mode: write ? 'WRITE' : 'CHECK', batch, sourceCards: receipt.assets.length, activeCards: receipt.assets.filter(item => manifest.assets.find(a => a.id === item.id).currentSource.sourceManifestPath === sourceManifestPath).length}));
}
