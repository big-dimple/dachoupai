// Read-only portable final-file verification. Node built-ins only; no source PNGs.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
async function requireEntry(relative, directory = false) {
  const stat = await fs.lstat(path.join(root, relative));
  if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile())) throw new Error(`Unsafe bundle entry: ${relative}`);
}
for (const name of ['README.md', 'manifest.json', 'verify-runtime.mjs']) await requireEntry(name);
await requireEntry('runtime', true);
const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
if (manifest.schemaVersion !== 1 || manifest.batch !== 'handdrawn-runtime-tools-20261004-t06-t11') throw new Error('Unexpected bundle schema');
if (manifest.encoder.format !== 'WEBP' || manifest.encoder.quality !== 82 || manifest.encoder.method !== 6 || manifest.encoder.lossless !== false) throw new Error('Unexpected encoder contract');
if (manifest.containPolicy.fit !== 'contain' || manifest.containPolicy.sourceCrop !== 'entire original' || manifest.containPolicy.backgroundHex !== '#F3EADB' || !manifest.containPolicy.noStretch || !manifest.containPolicy.noReconstruction) throw new Error('Unexpected source contract');
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
const selected = ["tool-t06", "tool-t07", "tool-t08", "tool-t09", "tool-t10", "tool-t11"];
const approvedSources = {
  "tool-t06": [
    "tool-t06-v1-original.png",
    "a9139eba620d6ebaabd9d6c13fd5c557be277ec6a8c44f3d9d7bfb192cae0193",
    1122,
    1402
  ],
  "tool-t07": [
    "tool-t07-v1-original.png",
    "a44e334882ae96eb38920a8d55b81d7448f03a5863074c8cda5fb54f7598c7a1",
    1122,
    1402
  ],
  "tool-t08": [
    "tool-t08-v1-original.png",
    "d4e36d0ba085a5950b5c9b9d0908ab4b8ba78c196404deab4ae9abc38d6ad509",
    1122,
    1402
  ],
  "tool-t09": [
    "tool-t09-v1-original.png",
    "636a089de9050e469bef5dd9f7fb577dd1e3bd4d8b95e9647bc6da65bbb6e603",
    1122,
    1402
  ],
  "tool-t10": [
    "tool-t10-v1-original.png",
    "609acccad9e3cbf7ee4f777d14df1da18228aab03dc3cf340d4c55aeaba8b7d8",
    1122,
    1402
  ],
  "tool-t11": [
    "tool-t11-v1-original.png",
    "21eaa126a7ba4da75fffa816ef605605ee01ad806d45d8446b0c49ea953c2a54",
    1122,
    1402
  ]
};
if (JSON.stringify(manifest.runtime_selection) !== JSON.stringify(selected) || manifest.assets.length !== selected.length) throw new Error('Unexpected runtime selection');
const expected = new Set(selected.flatMap(id => ['thumbnail', 'detail'].map(kind => `${id}.${kind}.webp`)));
const found = await fs.readdir(path.join(root, 'runtime'));
if (found.length !== expected.size || found.some(file => !expected.has(file))) throw new Error('Unexpected runtime files');
for (const file of found) await requireEntry(`runtime/${file}`);
if (JSON.stringify(manifest.assets.map(asset => asset.id)) !== JSON.stringify(selected)) throw new Error('Unexpected asset order');
const seen = new Set();
let count = 0, bytes = 0, thumbnailBytes = 0, detailBytes = 0;
for (const asset of manifest.assets) {
  if (asset.category !== (asset.id.startsWith('item-') ? 'item-card' : 'tool-card') || asset.domainId !== asset.id.split('-')[1].toUpperCase()) throw new Error('Source category or domain identity mismatch');
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
    if (output.mode !== 'RGB' || output.quality !== 82 || output.width !== spec[0] || output.height !== spec[1] || output.budgetBytes !== spec[2] || output.bytes >= spec[2] || !output.withinBudget) throw new Error('Runtime size/quality/budget contract mismatch');
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
if (count !== 12 || count !== manifest.totals.runtimeFiles || bytes !== manifest.totals.runtimeBytes || thumbnailBytes !== manifest.totals.thumbnailBytes || detailBytes !== manifest.totals.detailBytes) throw new Error('Unexpected runtime total');
console.log(JSON.stringify({status:'PASS',runtimeFiles:count,runtimeBytes:bytes,sourcePngsRequired:false,externalPackagesRequired:false}));
