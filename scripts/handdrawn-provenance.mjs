/** Read-only checks. A receipt binding proves bytes, not authorship or approval. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

export const HASH_POLICY = 'UTF-8 JSON.stringify(parsed, null, 2) plus LF';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const receiptHash = receipt => sha256(JSON.stringify(receipt, null, 2) + '\n');
export const runtimeManifestPath = 'public/assets/handdrawn-p08/manifest.json';
export const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export const receiptRecord = (receipt, id) => (receipt.assets ?? [receipt]).find(a => a.id === id);
export const receiptOutputs = record => record.outputs
  ? record.outputs.map(o => ({purpose: o.purpose ?? o.kind, path: o.path,
    width: o.width, height: o.height, bytes: o.bytes, sha256: o.sha256}))
  : ['thumbnail', 'detail'].map(purpose => ({purpose, ...record[purpose]}));

function localPath(root, relative) {
  assert.equal(typeof relative, 'string', 'missing provenance path');
  assert.ok(!path.isAbsolute(relative) && !relative.includes('\\'), 'invalid relative path: ' + relative);
  const resolved = path.resolve(root, relative);
  assert.ok(resolved.startsWith(path.resolve(root) + path.sep), 'path escapes checkout: ' + relative);
  return resolved;
}

export function verifyOriginal(record, bytes) {
  assert.match(record.sourceSHA256, /^[a-f0-9]{64}$/, record.id + ': missing original hash');
  assert.equal(bytes.length, record.sourceBytes, record.id + ': original bytes');
  assert.equal(sha256(bytes), record.sourceSHA256, record.id + ': original SHA256');
}

function verifyOutput(root, base, output, commit) {
  assert.match(output.sha256, /^[a-f0-9]{64}$/, 'invalid output hash');
  assert.ok(Number.isInteger(output.width) && output.width > 0, 'invalid output width');
  assert.ok(Number.isInteger(output.height) && output.height > 0, 'invalid output height');
  const relative = base + '/' + output.path, file = localPath(root, relative);
  const bytes = commit
    ? execFileSync('git', ['show', commit + ':' + relative], {cwd:root,maxBuffer:4*1024*1024})
    : fs.readFileSync(file);
  assert.equal(bytes.length, output.bytes, file + ': bytes');
  assert.equal(sha256(bytes), output.sha256, file + ': SHA256');
  return bytes;
}

export async function verifyProvenance(manifest, {root = process.cwd(), gitHistory = false} = {}) {
  assert.equal(manifest.schemaVersion, 2, 'handdrawn manifest schema');
  assert.equal(manifest.provenancePolicy.sourceManifestHashPolicy, HASH_POLICY);
  assert.equal(manifest.provenancePolicy.sourceCommitScope, 'initial-delivery-only');
  assert.equal(manifest.originalArtworkCount, manifest.assets.length);
  assert.equal(new Set(manifest.assets.map(a => a.id)).size, manifest.assets.length, 'duplicate asset ID');
  const receipts = new Map(), originals = new Set(), runtimeFiles = new Set(), derivativeOnlyIds = [];
  const readReceipt = ref => {
    assert.match(ref.receiptCommit, /^[a-f0-9]{40}$/, 'missing receipt commit');
    const cacheKey = ref.sourceManifestPath + ':' + ref.receiptCommit;
    let receipt = receipts.get(cacheKey);
    if (!receipt) {
      assert.ok(ref.sourceManifestPath.startsWith('art/sources/'), 'receipt outside source archive');
      receipt = readJSON(localPath(root, ref.sourceManifestPath));
      if (gitHistory) {
        const committed = JSON.parse(execFileSync('git', ['show', ref.receiptCommit + ':' + ref.sourceManifestPath], {cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024}));
        assert.equal(receiptHash(committed), receiptHash(receipt), ref.sourceManifestPath + ': receipt commit');
      }
      receipts.set(cacheKey, receipt);
    }
    assert.equal(receiptHash(receipt), ref.sourceManifestSHA256, ref.sourceManifestPath + ': receipt SHA256');
    return receipt;
  };
  let total = 0, sourceVerified = 0, historicalGitOutputsVerified = 0, historicalGitOutputsPending = 0;
  for (const asset of manifest.assets) {
    assert.ok(!('sourceCommit' in asset) && !('sourceManifestSHA256' in asset) && !('replacementSource' in asset), asset.id + ': ambiguous legacy provenance');
    const ref = asset.currentSource;
    assert.ok(ref, asset.id + ': missing current source');
    const receipt = readReceipt(ref), record = receiptRecord(receipt, asset.id);
    assert.ok(record, asset.id + ': missing receipt record');
    assert.deepEqual(asset.outputs.map(o => ({purpose:o.purpose,path:o.path,width:o.width,height:o.height,bytes:o.bytes,sha256:o.sha256})), receiptOutputs(record), asset.id + ': active outputs do not match current receipt');
    assert.equal(new Set(asset.outputs.map(o => o.purpose)).size, asset.outputs.length, asset.id + ': duplicate purpose');
    if (ref.status === 'source-verified') {
      assert.equal(asset.category, 'functional-card');
      // Verify the entire active batch, including a superseded record such as C06.
      const records = receipt.assets ?? [receipt];
      assert.equal(new Set(records.map(a => a.id)).size, records.length, 'duplicate source ID');
      for (const item of records) {
        const relative = path.posix.dirname(ref.sourceManifestPath) + '/' + (item.sourceFile ?? item.sourceFilename);
        if (originals.has(relative)) continue;
        const bytes = fs.readFileSync(localPath(root, relative));
        verifyOriginal(item, bytes);
        const meta = await sharp(bytes).metadata();
        assert.deepEqual([meta.width, meta.height], [item.sourceWidth, item.sourceHeight], item.id + ': original dimensions');
        if (gitHistory) assert.equal(sha256(execFileSync('git', ['show', ref.receiptCommit + ':' + relative], {cwd: root, maxBuffer: 16 * 1024 * 1024})), item.sourceSHA256, item.id + ': committed original');
        originals.add(relative);
      }
      sourceVerified++;
    } else {
      assert.equal(ref.status, 'derivatives-only', asset.id + ': unknown source status');
      assert.ok(['character', 'court'].includes(asset.category), asset.id + ': functional source evidence missing');
      assert.equal(ref.missingEvidence, 'original bytes and per-original filename/SHA256 binding');
      derivativeOnlyIds.push(asset.id);
    }
    for (const output of asset.outputs) {
      assert.ok(!runtimeFiles.has(output.path), 'duplicate runtime path: ' + output.path);
      runtimeFiles.add(output.path);
      const bytes = verifyOutput(root, 'public/assets/handdrawn-p08', output);
      const meta = await sharp(bytes).metadata();
      assert.deepEqual([meta.width, meta.height], [output.width, output.height], output.path + ': dimensions');
      total += bytes.length;
    }
    for (const historical of asset.historicalSources ?? []) {
      const archived = receiptRecord(readReceipt(historical), asset.id);
      assert.ok(archived, asset.id + ': missing historical record');
      assert.notEqual(historical.sourceManifestPath, ref.sourceManifestPath, asset.id + ': current receipt also labelled historical');
      if (historical.outputsCommit) assert.match(historical.outputsCommit, /^[a-f0-9]{40}$/, 'invalid historical output commit');
      for (const output of receiptOutputs(archived)) {
        // Retired publication copies live in Git, not in a second project backup.
        // Plain checks report this unperformed scope; --git-history verifies the actual bytes.
        if (historical.outputsCommit && !gitHistory) { historicalGitOutputsPending++; continue; }
        verifyOutput(root, historical.outputsRoot ?? path.posix.dirname(historical.sourceManifestPath), output, historical.outputsCommit);
        if (historical.outputsCommit) historicalGitOutputsVerified++;
      }
    }
  }
  assert.equal(runtimeFiles.size, manifest.runtimeFileCount, 'runtime file count');
  assert.equal(total, manifest.runtimeBytes, 'runtime byte total');
  return {sourceVerified, originalsVerified: originals.size, derivativeOnlyIds, runtimeFiles: runtimeFiles.size, runtimeBytes: total, receiptsVerified: receipts.size, gitHistory, historicalGitOutputsVerified, historicalGitOutputsPending};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.slice(2).every(a => ['--check', '--git-history'].includes(a)), 'read-only checker accepts --check and --git-history');
  console.log(JSON.stringify(await verifyProvenance(readJSON(runtimeManifestPath), {gitHistory: process.argv.includes('--git-history')})));
}
