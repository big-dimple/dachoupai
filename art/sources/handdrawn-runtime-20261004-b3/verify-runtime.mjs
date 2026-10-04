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
const selected = ['c08', 'c09'];
const approvedSources = {
  c08: ['c08-four-rung-candidate.png', 'b8812aa031a8079bea91d3c0a86bd725594eec1d24480de7bfbe79bf446bace4'],
  c09: ['c09-candidate-original.png', 'a52593646c08c2c93370165865c3f855f20c5c9b4ec4b54bc0f1648c0392109f'],
};
if (JSON.stringify(manifest.runtime_selection) !== JSON.stringify(selected) || manifest.assets.length !== selected.length) throw new Error('Unexpected runtime selection');
const expected = new Set(selected.flatMap(id => ['thumbnail', 'detail'].map(kind => `${id}.${kind}.webp`)));
const found = await fs.readdir(path.join(root, 'runtime'));
if (found.length !== expected.size || found.some(file => !expected.has(file))) throw new Error('Unexpected runtime files');
const seen = new Set();
let count = 0, bytes = 0, thumbnailBytes = 0, detailBytes = 0;
for (const asset of manifest.assets) {
  if (!selected.includes(asset.id) || asset.outputs.length !== 2 || !/^[a-f0-9]{64}$/.test(asset.sourceSHA256)) throw new Error('Invalid asset metadata');
  if (asset.sourceFilename !== approvedSources[asset.id][0] || asset.sourceSHA256 !== approvedSources[asset.id][1] || asset.sourceWidth !== 1122 || asset.sourceHeight !== 1402 || !asset.sourceUnchanged) throw new Error('Unexpected approved source');
  for (const output of asset.outputs) {
    const spec = output.kind === 'thumbnail' ? [128, 160, 10000, 120, 150] : output.kind === 'detail' ? [615, 768, 100000, 576, 720] : null;
    if (!spec || output.path !== `runtime/${asset.id}.${output.kind}.webp` || seen.has(output.path)) throw new Error('Unexpected or repeated runtime path');
    seen.add(output.path);
    const geometry = output.geometry;
    const rect = geometry.contentRectPixels, padding = geometry.paddingPixels;
    if (geometry.canvasWidth !== spec[0] || geometry.canvasHeight !== spec[1] || rect.left !== Math.floor((spec[0] - spec[3]) / 2) || rect.top !== Math.floor((spec[1] - spec[4]) / 2) || padding.left !== rect.left || padding.top !== rect.top || padding.right !== spec[0] - rect.left - rect.width || padding.bottom !== spec[1] - rect.top - rect.height) throw new Error('Contain inset geometry mismatch');
    if (output.quality !== 82 || output.width !== spec[0] || output.height !== spec[1] || output.budgetBytes !== spec[2] || output.bytes > spec[2] || !output.withinBudget) throw new Error('Runtime size/quality/budget contract mismatch');
    if (geometry.fit !== 'contain' || !geometry.entireSourceSampled || !geometry.noStretch || geometry.backgroundHex !== '#F3EADB' || geometry.contentRectPixels.width !== spec[3] || geometry.contentRectPixels.height !== spec[4] || geometry.sourceCropPixels.left !== 0 || geometry.sourceCropPixels.top !== 0 || geometry.sourceCropPixels.width !== asset.sourceWidth || geometry.sourceCropPixels.height !== asset.sourceHeight) throw new Error('Contain contract mismatch');
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
if (count !== 4 || count !== manifest.totals.runtimeFiles || bytes !== manifest.totals.runtimeBytes || thumbnailBytes !== manifest.totals.thumbnailBytes || detailBytes !== manifest.totals.detailBytes) throw new Error('Unexpected runtime total');
console.log(JSON.stringify({status:'PASS',runtimeFiles:count,runtimeBytes:bytes,sourcePngsRequired:false,externalPackagesRequired:false}));
