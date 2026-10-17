import {it, expect} from 'vitest';
import fs from 'node:fs';
import {readJSON, receiptHash, receiptOutputs, receiptRecord, runtimeManifestPath, sha256, verifyOriginal, verifyProvenance} from '../scripts/handdrawn-provenance.mjs';

const manifest = readJSON(runtimeManifestPath);
const half1 = 'art/sources/handdrawn-runtime-20261017-half1/manifest.json';
const half2 = 'art/sources/handdrawn-runtime-20261017-half2/manifest.json';
const c06 = 'art/sources/qingchuyulan-art-20261017/manifest.json';
const currentReceipts = [
  [half1, 'fddb7378112304ead60d67a676e73bb4a3fe2ec0', 'a5a703a20c18ab3b9dca29b9a10cda15b50a22c37c7c804c07aaa8e09f8039b6', 35],
  [half2, 'c374c7aa31ec75f3a02b27b6d1bb0b6a5f8ea77e', '854b8f1d29a8aa511c7764c7f527eec8457c694d164c07f3a01f3920e73bb891', 36],
  [c06, '3897abbc80f71d760fa41a9a8330f9fb606e72ab', 'a248d6f72527d6e60c2ab9e01d1ede2b3eaf57ae6be562988c75d2a4ae62d863', 1],
];

it('verifies all active source bindings, 73 original files, 165 runtime files and historical derivatives', async () => {
  expect(await verifyProvenance(manifest)).toEqual({sourceVerified:72, originalsVerified:73,
    derivativeOnlyIds:['azao','amo','touye','laohuan','erxiang','xiemu','j','q','k'],
    runtimeFiles:165, runtimeBytes:10112306, receiptsVerified:15, gitHistory:false});
}, 30000);

it.each(currentReceipts)('pins current receipt %s independently of its outputs', (file, commit, hash, count) => {
  expect(receiptHash(readJSON(file))).toBe(hash);
  const active = manifest.assets.filter(a => a.currentSource.sourceManifestPath === file);
  expect(active).toHaveLength(count);
  for (const asset of active) expect(asset.currentSource).toEqual({receiptCommit:commit, sourceManifestPath:file, sourceManifestSHA256:hash, status:'source-verified'});
});

it('distinguishes A11 v3 and the C06 override from their archived sources', () => {
  const a11 = manifest.assets.find(a => a.id === 'a11'), blue = manifest.assets.find(a => a.id === 'c06');
  expect(a11.currentSource.sourceManifestPath).toBe(half1);
  expect(a11.historicalSources[0].sourceManifestPath).toBe('art/sources/handdrawn-runtime-a11-fix-20261004/manifest.json');
  for (const output of a11.outputs) expect(output.path).toBe('cards/a11-v3-' + output.sha256.slice(0,12) + '.' + output.purpose + '.webp');
  expect(blue.currentSource.sourceManifestPath).toBe(c06);
  expect(blue.historicalSources.map(s => s.sourceManifestPath)).toEqual(['art/sources/handdrawn-runtime-20261004-b9/manifest.json', half1]);
  const replacement = readJSON(c06), original = fs.readFileSync('art/sources/qingchuyulan-art-20261017/' + replacement.sourceFilename);
  expect(sha256(original)).toBe('7b530adb5ede95719ad37f4813e90f0ad42faa657763b7f5c60152a3f3b963e9');
  expect(original.length).toBe(3937366);
  expect(replacement.previous.outputs).toEqual(receiptOutputs(receiptRecord(readJSON(half1), 'c06')));
});

it('restores the exact nine-asset fingerprint and explicitly preserves their missing-original status', () => {
  const nine = manifest.assets.filter(a => a.category !== 'functional-card');
  expect(sha256(JSON.stringify(nine.map(({id,category,outputs}) => ({id,category,outputs}))))).toBe('dd9a9b78683af5f592a9108230611ae7941f551d4c477f80c4fa9ea5de8ed69d');
  expect(nine.reduce((n,a) => n+a.outputs.length,0)).toBe(21);
  expect(nine.reduce((n,a) => n+a.outputs.reduce((s,o) => s+o.bytes,0),0)).toBe(566958);
  for (const asset of nine) {
    expect(asset.currentSource.status).toBe('derivatives-only');
    expect(asset.currentSource.missingEvidence).toBe('original bytes and per-original filename/SHA256 binding');
  }
});

it('retains the original 60-record/123-file fingerprint as history, with no claims about current 72-card bytes', () => {
  const finalIDs = new Set(['a05','b03','c06','d03','a10','b11','c10','d12','a06','a12','b09','c11','c12','e10','e12','e05','e08','e11','f06','f08','f12']);
  const prior = manifest.assets.filter(a => !finalIDs.has(a.id)).map(asset => {
    if (asset.category !== 'functional-card') return {id:asset.id,category:asset.category,outputs:asset.outputs};
    const ref = asset.id === 'a11'
      ? {receiptCommit:'030508fb4dca8af276094dd5bc3eb6a9774d8375',sourceManifestPath:'art/sources/handdrawn-runtime-20261004-b8/manifest.json',sourceManifestSHA256:'3c8a1e74038f5d934f6a8025c1cc541c8d9af3bc1240d3c9707bb97ebbc48003'}
      : asset.historicalSources[0];
    const outputs = receiptOutputs(receiptRecord(readJSON(ref.sourceManifestPath), asset.id));
    if (ref.sourceManifestPath === 'art/sources/handdrawn-runtime-20261004/manifest.json') return {id:asset.id,category:asset.category,outputs};
    // The pre-b4 registry serialized purpose/path first; preserve that historical fingerprint's key order.
    const purposeFirst = /-b[23]\/manifest\.json$/.test(ref.sourceManifestPath);
    return {id:asset.id,category:asset.category,sourceCommit:ref.receiptCommit,sourceManifestSHA256:ref.sourceManifestSHA256,
      outputs:purposeFirst ? outputs.map(o => ({purpose:o.purpose,path:'cards/'+asset.id+'.'+o.purpose+'.webp',width:o.width,height:o.height,bytes:o.bytes,sha256:o.sha256}))
        : outputs.map(o => ({width:o.width,height:o.height,bytes:o.bytes,sha256:o.sha256,purpose:o.purpose,path:'cards/'+asset.id+'.'+o.purpose+'.webp'}))};
  });
  expect(prior).toHaveLength(60);
  expect(sha256(JSON.stringify(prior))).toBe('6ea3ed5a2054145ab25a812232cd8e391d4cfac67c64e6bff0ccf64ba1ddcad7');
  expect(prior.reduce((n,a) => n+a.outputs.length,0)).toBe(123);
  expect(prior.reduce((n,a) => n+a.outputs.reduce((s,o) => s+o.bytes,0),0)).toBe(3461406);
});

it('rejects stale receipt binding even when all current runtime hashes remain correct', async () => {
  const changed = structuredClone(manifest), asset = changed.assets.find(a => a.id === 'pengci');
  asset.currentSource = {...asset.historicalSources[0], status:'source-verified'};
  await expect(verifyProvenance(changed)).rejects.toThrow('active outputs do not match current receipt');
});

it('rejects forged receipt hashes, hidden legacy fields and missing functional source evidence', async () => {
  const badHash = structuredClone(manifest); badHash.assets[0].currentSource.sourceManifestSHA256 = '0'.repeat(64);
  await expect(verifyProvenance(badHash)).rejects.toThrow('receipt SHA256');
  const legacy = structuredClone(manifest); legacy.assets[0].sourceCommit = manifest.sourceCommit;
  await expect(verifyProvenance(legacy)).rejects.toThrow('ambiguous legacy provenance');
  const missing = structuredClone(manifest), card = missing.assets.find(a => a.id === 'pengci');
  card.currentSource.status = 'derivatives-only';
  await expect(verifyProvenance(missing)).rejects.toThrow('functional source evidence missing');
});

it('rejects an original-byte substitution of identical length', () => {
  const record = readJSON(half1).assets[0], bytes = fs.readFileSync('art/sources/handdrawn-runtime-20261017-half1/' + record.sourceFile);
  const changed = Buffer.from(bytes); changed[changed.length-1] ^= 1;
  expect(() => verifyOriginal(record, changed)).toThrow('original SHA256');
});

it('uses one declared receipt hash policy across LF/CRLF checkouts', () => {
  const text = JSON.stringify(readJSON(half1), null, 2) + '\n';
  expect(receiptHash(JSON.parse(text.replaceAll('\n','\r\n')))).toBe(receiptHash(JSON.parse(text)));
});
