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
if (manifest.schemaVersion !== 1 || manifest.batch !== 'handdrawn-runtime-tools-20261004-s03-s08') throw new Error('Unexpected bundle schema');
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
const selected = ["tool-s03", "tool-s04", "tool-s05", "tool-s06", "tool-s07", "tool-s08"];
const approvedSources = {
  "tool-s03": [
    "tool-s03-v1-original.png",
    "ba55d90762ae5181800bb16ed7aee132532a05a141b578a6a48f9a93e7cfe8f7",
    1122,
    1402
  ],
  "tool-s04": [
    "tool-s04-v2-original.png",
    "07a29c1ba41170147cb82966927e42b6e0dc6175e3d1f26d8b90060868c3af39",
    1122,
    1402
  ],
  "tool-s05": [
    "tool-s05-v1-original.png",
    "c918a6f0512bd35514fe15a98aa9c5667e02c4fcdb9c97d7ed9afacb2105a0f2",
    1122,
    1402
  ],
  "tool-s06": [
    "tool-s06-v1-original.png",
    "a8986c3101a4136f6c040f188ffa54ceaac45687faa659f5d9ca62907f0010e0",
    1122,
    1402
  ],
  "tool-s07": [
    "tool-s07-v1-original.png",
    "b524de8956af81e644e7c8e9d06c83a403bb8915551ea4b8e021ad443350fb32",
    1122,
    1402
  ],
  "tool-s08": [
    "tool-s08-v1-original.png",
    "ebf39b8516e03604dcd693ea1f98458a908d929d0293c47e678a7996a0e2d996",
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
  if (asset.domain !== 'tool' || asset.sourceCategory !== 'consumable-tool' || asset.family !== 'spectral' || asset.sourceAspectExceptionApproved !== false) throw new Error('Source classification mismatch');
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
