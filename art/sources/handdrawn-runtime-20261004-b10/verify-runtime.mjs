// Read-only portable final-file verification. Node built-ins only; no source PNGs.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
const rootFiles = await fs.readdir(root);
if (rootFiles.length !== 4 || rootFiles.some(file => !['README.md', 'manifest.json', 'verify-runtime.mjs', 'runtime'].includes(file))) throw new Error('Unexpected bundle inventory');
const dimensions = data => {
  if (data.length < 20 || data.readUInt32LE(4) + 8 !== data.length) throw new Error('Invalid WebP RIFF size');
  if (data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WEBP') throw new Error('Invalid WebP header');
  for (let offset = 12; offset + 8 <= data.length;) {
    const type = data.toString('ascii', offset, offset + 4), length = data.readUInt32LE(offset + 4), start = offset + 8;
    if (start + length > data.length) throw new Error('Truncated WebP chunk');
    if (type === 'VP8X' && length >= 10) return [1 + data.readUIntLE(start + 4, 3), 1 + data.readUIntLE(start + 7, 3)];
    if (type === 'VP8 ' && length >= 10 && data.toString('hex', start + 3, start + 6) === '9d012a') return [data.readUInt16LE(start + 6) & 0x3fff, data.readUInt16LE(start + 8) & 0x3fff];
    if (type === 'VP8L' && length >= 5 && data[start] === 0x2f) {
      const bits = data.readUInt32LE(start + 1);
      return [1 + (bits & 0x3fff), 1 + ((bits >>> 14) & 0x3fff)];
    }
    offset = start + length + (length % 2);
  }
  throw new Error('No WebP dimensions found');
};
const selected = ["a06", "a12", "b09", "c11", "c12", "e10", "e12", "e05"];
const approvedSources = {
  "a06": [
    "a06-v1-original.png",
    "f2cbc3c7376ef887398cab1efa088805e05688e67e4f51242cbdb7a1ebf1e0c7",
    1122,
    1402
  ],
  "a12": [
    "a12-v1-original.png",
    "89177b2b8c2fa7ea5d01e7bbb1b67cf762ae2ff307ffd4bfb5dccedbb54a16e7",
    1122,
    1402
  ],
  "b09": [
    "b09-v1-original.png",
    "cc9e54b6f0ba6175d3e85f7739adb140b87bbcac09f9be418c2f5494cb4198f7",
    1122,
    1402
  ],
  "c11": [
    "c11-v1-original.png",
    "77f494dd6fdfe109e0f88b7ffaccfe24e201bcd3943a4e7096fa388f38a4e940",
    1122,
    1402
  ],
  "c12": [
    "c12-v1-original.png",
    "8d0a7cd008bc3114cd3acbdbe27a9f5aeebaf8162f5c19a8c0418d07fbc7178b",
    1122,
    1402
  ],
  "e10": [
    "e10-v1-original.png",
    "195f26322f25cbb55653a5f02f51b293558efe628aba62e913641f2d403bc5f5",
    1073,
    1466
  ],
  "e12": [
    "e12-v1-original.png",
    "d44eff4e59326e5c4c6ef361263e59478e2acf7e948a2216206cf2952a3188b9",
    1073,
    1466
  ],
  "e05": [
    "e05-v1-original.png",
    "b4c571fc76f485d4cdf461cff5b2893d8bc90fd6005f530fd0a4290319e0254c",
    1122,
    1402
  ]
};
if (JSON.stringify(manifest.runtime_selection) !== JSON.stringify(selected) || manifest.assets.length !== selected.length) throw new Error('Unexpected runtime selection');
const expected = new Set(selected.flatMap(id => ['thumbnail', 'detail'].map(kind => `${id}.${kind}.webp`)));
const found = await fs.readdir(path.join(root, 'runtime'));
if (found.length !== expected.size || found.some(file => !expected.has(file))) throw new Error('Unexpected runtime files');
const seen = new Set();
let count = 0, bytes = 0, thumbnailBytes = 0, detailBytes = 0;
for (const asset of manifest.assets) {
  if (!selected.includes(asset.id) || asset.outputs.length !== 2 || !/^[a-f0-9]{64}$/.test(asset.sourceSHA256)) throw new Error('Invalid asset metadata');
  if (asset.sourceFilename !== approvedSources[asset.id][0] || asset.sourceSHA256 !== approvedSources[asset.id][1] || asset.sourceWidth !== approvedSources[asset.id][2] || asset.sourceHeight !== approvedSources[asset.id][3] || !asset.sourceUnchanged || asset.sourceExactFourFive !== (asset.sourceWidth * 5 === asset.sourceHeight * 4)) throw new Error('Unexpected approved source');
  for (const output of asset.outputs) {
    const spec = output.kind === 'thumbnail' ? [128, 160, 10000, 120, 150] : output.kind === 'detail' ? [615, 768, 100000, 576, 720] : null;
    if (!spec || output.path !== `runtime/${asset.id}.${output.kind}.webp` || seen.has(output.path)) throw new Error('Unexpected or repeated runtime path');
    seen.add(output.path);
    const geometry = output.geometry;
    const rect = geometry.contentRectPixels, padding = geometry.paddingPixels, inset = geometry.insetBoundingBoxPixels;
    const scale = Math.min(spec[3] / asset.sourceWidth, spec[4] / asset.sourceHeight);
    const fitWidth = Math.round(asset.sourceWidth * scale), fitHeight = Math.round(asset.sourceHeight * scale);
    if (inset.width !== spec[3] || inset.height !== spec[4] || inset.left !== Math.floor((spec[0] - spec[3]) / 2) || inset.top !== Math.floor((spec[1] - spec[4]) / 2)) throw new Error('Inset bounding box mismatch');
    if (geometry.canvasWidth !== spec[0] || geometry.canvasHeight !== spec[1] || rect.left !== Math.floor((spec[0] - fitWidth) / 2) || rect.top !== Math.floor((spec[1] - fitHeight) / 2) || padding.left !== rect.left || padding.top !== rect.top || padding.right !== spec[0] - rect.left - rect.width || padding.bottom !== spec[1] - rect.top - rect.height) throw new Error('Contain inset geometry mismatch');
    if (output.quality !== 82 || output.width !== spec[0] || output.height !== spec[1] || output.budgetBytes !== spec[2] || output.bytes >= spec[2] || !output.withinBudget) throw new Error('Runtime size/quality/budget contract mismatch');
    if (geometry.fit !== 'contain' || !geometry.entireSourceSampled || !geometry.noStretch || geometry.backgroundHex !== '#F3EADB' || geometry.contentRectPixels.width !== fitWidth || geometry.contentRectPixels.height !== fitHeight || geometry.sourceCropPixels.left !== 0 || geometry.sourceCropPixels.top !== 0 || geometry.sourceCropPixels.width !== asset.sourceWidth || geometry.sourceCropPixels.height !== asset.sourceHeight) throw new Error('Contain contract mismatch');
    if (path.isAbsolute(output.path) || !output.path.startsWith('runtime/') || output.path.split(/[\\/]/).includes('..')) throw new Error(`Unsafe output path: ${output.path}`);
    const file = path.resolve(root, output.path);
    if (!file.startsWith(root + path.sep)) throw new Error('Output outside bundle');
    const data = await fs.readFile(file);
    const actual = dimensions(data);
    if (data.length !== output.bytes || createHash('sha256').update(data).digest('hex') !== output.sha256 || actual[0] !== output.width || actual[1] !== output.height) throw new Error(`Verification failed: ${output.path}`);
    count++; bytes += data.length;
    if (output.kind === 'thumbnail') thumbnailBytes += data.length; else detailBytes += data.length;
  }
}
if (count !== 16 || count !== manifest.totals.runtimeFiles || bytes !== manifest.totals.runtimeBytes || thumbnailBytes !== manifest.totals.thumbnailBytes || detailBytes !== manifest.totals.detailBytes) throw new Error('Unexpected runtime total');
console.log(JSON.stringify({status:'PASS',runtimeFiles:count,runtimeBytes:bytes,sourcePngsRequired:false,externalPackagesRequired:false}));
