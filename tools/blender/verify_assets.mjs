/** Read-only delivered-file audit; an explicit --write-inventory refreshes only
 * docs/assets/inventory.json. Historical A00 evidence is never updated.
 * node tools/blender/verify_assets.mjs [inventory.json] [--root directory]
 * Deliberately no minimum triangle count. Render/rights approval remain separate.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import validator from 'gltf-validator';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const currentInventoryPath = 'docs/assets/inventory.json';
export const retainedP0Renders = ['background-far.webp', 'background-mid.webp', 'background-near.webp'];
export function p0PublicationErrors(paths) {
  return paths.filter(file => file.startsWith('public/assets/renders/p0/') &&
    !retainedP0Renders.includes(file.slice('public/assets/renders/p0/'.length)))
    .map(file => `review-only P0 preview in public assets: ${file}`);
}
export async function filesIn(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? filesIn(path.join(dir, e.name)) : path.join(dir, e.name)))).flat().sort();
}
export async function sourceReferences(project) {
  const refs = [];
  for (const file of await filesIn(path.join(project, 'src'))) {
    if (!/\.(ts|js|css|html)$/.test(file)) continue;
    const source = await fs.readFile(file, 'utf8');
    for (const match of source.matchAll(/(['"`])([^'"`\r\n]*assets\/[^'"`\r\n]*)\1/g)) {
      refs.push({ source: path.relative(project, file).replaceAll('\\', '/'), expression: match[2] });
    }
  }
  return refs;
}
export function summarizeAssets(assets) {
  const totals = { files: assets.length, bytes: 0, decodedRgbaBytes: 0, groups: {} };
  for (const asset of assets) {
    const bytes = asset.canonicalBytes ?? asset.bytes;
    const decoded = asset.decodedRgbaBytes ?? 0;
    const group = asset.path.split('/')[2];
    const subtotal = totals.groups[group] ??= { count: 0, bytes: 0, decodedRgbaBytes: 0 };
    totals.bytes += bytes; totals.decodedRgbaBytes += decoded;
    subtotal.count++; subtotal.bytes += bytes; subtotal.decodedRgbaBytes += decoded;
  }
  return totals;
}
/** Literal paths are source evidence, not proof of an executed network request.
 * Template matches are deliberately kept separate: file existence cannot prove
 * that a parameter value is reachable. Imported JSON runtimePath is also tracked.
 */
export async function runtimeReferenceReport(project, refs, paths) {
  const staticRuntimePaths = new Set(), parameterizedSourceReferences = [], indirectRuntimePaths = [];
  for (const ref of refs) {
    const resource = ref.expression.slice(ref.expression.indexOf('assets/')).split(/[?#]/)[0];
    if (resource.includes('${')) {
      const pattern = resource.split(/\$\{[^}]+\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]+');
      const matches = paths.filter(file => new RegExp(`^public/${pattern}$`).test(file));
      parameterizedSourceReferences.push({ ...ref, matchingPaths: matches, evidence: 'filename-match-only' });
    } else {
      const file = `public/${resource}`;
      staticRuntimePaths.add(file);
      if (file.endsWith('.json') && paths.includes(file)) {
        const json = JSON.parse(await fs.readFile(path.join(project, file), 'utf8'));
        if (typeof json.runtimePath === 'string') indirectRuntimePaths.push({ source: file, field: 'runtimePath', path: `public/${json.runtimePath.replace(/^\/+/, '')}` });
      }
    }
  }
  return { staticRuntimePaths: [...staticRuntimePaths].sort(), parameterizedSourceReferences, indirectRuntimePaths };
}
export async function packManifestErrors(project, paths, { checkBytes = true } = {}) {
  const relative = 'public/assets/models/asset-pack-v1.json';
  if (!paths.includes(relative)) return [];
  const source = await fs.readFile(path.join(project, relative), 'utf8');
  const manifest = JSON.parse(source);
  const errors = [], listed = new Set();
  let totalBytes = Buffer.byteLength(source.replaceAll('\r\n', '\n'));
  for (const entry of manifest.assets) {
    const file = `public/assets/${entry.file}`;
    if (typeof entry.file !== 'string' || path.posix.normalize(entry.file) !== entry.file || entry.file.startsWith('/') || entry.file.startsWith('../') || entry.file.includes('\\')) {
      errors.push(`unsafe manifest path: ${entry.file}`); continue;
    }
    if (listed.has(file)) errors.push(`duplicate manifest path: ${entry.file}`);
    listed.add(file);
    if (!paths.includes(file)) errors.push(`missing manifest asset: ${entry.file}`);
    else if (checkBytes) {
      const data = await fs.readFile(path.join(project, file));
      const bytes = file.endsWith('.json') ? Buffer.byteLength(data.toString().replaceAll('\r\n', '\n')) : data.length;
      totalBytes += bytes;
      if (entry.bytes !== undefined && entry.bytes !== bytes) errors.push(`manifest bytes mismatch: ${entry.file}`);
    }
  }
  errors.push(...p0PublicationErrors([...listed]));
  // reviewPath is metadata outside the publication tree, never a runtime asset.
  for (const entry of manifest.assets) if (entry.reviewPath &&
    (entry.reviewPath.startsWith('public/') || path.isAbsolute(entry.reviewPath) || entry.reviewPath.split(/[\\/]/).includes('..')))
    errors.push(`unsafe reviewPath: ${entry.reviewPath}`);
  if (checkBytes && manifest.validation) {
    if (manifest.validation.models !== manifest.assets.filter(entry => entry.file.endsWith('.glb')).length)
      errors.push('manifest model count mismatch');
    if (manifest.validation.totalAssetBytes !== totalBytes) errors.push('manifest totalAssetBytes mismatch');
  }
  return errors;
}
export async function inspectAsset(project, relative) {
  const absolute = path.resolve(project, relative);
  const assetRoot = path.resolve(project, 'public/assets');
  if (!absolute.startsWith(assetRoot + path.sep)) throw new Error(`unsafe path: ${relative}`);
  const data = await fs.readFile(absolute);
  const info = { path: relative, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
  if (/\.(png|webp)$/.test(relative)) {
    const m = await sharp(data).metadata();
    // Decode pixels, not only the container header.
    await sharp(data).raw().toBuffer();
    Object.assign(info, { width: m.width, height: m.height, alpha: m.hasAlpha,
      decodedRgbaBytes: m.width * m.height * 4, format: m.format });
  } else if (relative.endsWith('.glb')) {
    const result = await validator.validateBytes(new Uint8Array(data), { maxIssues: 100 });
    if (result.issues.numErrors) throw new Error(`GLB validation: ${relative}: ${result.issues.numErrors} errors`);
    const gltf = JSON.parse(data.subarray(20, 20 + data.readUInt32LE(12)).toString());
    const binOffset = 20 + data.readUInt32LE(12) + 8;
    const embeddedTextures = [];
    for (const image of gltf.images ?? []) {
      const view = gltf.bufferViews[image.bufferView];
      const bytes = data.subarray(binOffset + (view.byteOffset ?? 0), binOffset + (view.byteOffset ?? 0) + view.byteLength);
      const meta = await sharp(bytes).metadata();
      embeddedTextures.push({ name: image.name ?? null, width: meta.width, height: meta.height, alpha: meta.hasAlpha, bytes: bytes.length });
    }
    let triangles = 0;
    for (const mesh of gltf.meshes ?? []) for (const primitive of mesh.primitives) {
      if ((primitive.mode ?? 4) !== 4) throw new Error(`non-triangle primitive: ${relative}`);
      if (primitive.attributes.NORMAL === undefined || primitive.attributes.TEXCOORD_0 === undefined)
        throw new Error(`missing NORMAL/UV0: ${relative}`);
      triangles += gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3;
    }
    if (triangles > 20000) throw new Error(`triangle upper budget: ${relative}: ${triangles}`);
    Object.assign(info, { width: null, height: null, alpha: null, triangles,
      clips: (gltf.animations ?? []).map(a => a.name).sort(),
      embeddedTextures, materialAlphaModes: [...new Set((gltf.materials ?? []).map(m => m.alphaMode ?? 'OPAQUE'))],
      khronosErrors: result.issues.numErrors, khronosWarnings: result.issues.numWarnings });
  } else if (relative.endsWith('.json')) {
    const json = JSON.parse(data.toString());
    // Git may check text out as CRLF on Windows. Retain physical measurements,
    // but compare LF-normalized bytes for cross-platform JSON integrity.
    const canonical = Buffer.from(data.toString('utf8').replaceAll('\r\n', '\n'));
    Object.assign(info, { textNormalization: 'LF', canonicalBytes: canonical.length,
      canonicalSha256: createHash('sha256').update(canonical).digest('hex') });
    if (relative.includes('/sprites/')) {
      const atlas = await sharp(path.join(path.dirname(absolute), json.meta.image)).metadata();
      if (!atlas.hasAlpha || json.meta.alpha !== 'straight') throw new Error(`atlas alpha contract: ${relative}`);
      if (atlas.width !== json.meta.size.w || atlas.height !== json.meta.size.h) throw new Error(`atlas size contract: ${relative}`);
      for (const { frame: f } of Object.values(json.frames))
        if (f.x < 0 || f.y < 0 || f.w <= 0 || f.h <= 0 || f.x + f.w > atlas.width || f.y + f.h > atlas.height)
          throw new Error(`atlas frame outside image: ${relative}`);
      Object.assign(info, { frameCount: Object.keys(json.frames).length, frameRate: json.meta.frameRate, alphaConvention: json.meta.alpha });
    }
  }
  return info;
}
export async function verifyAssets(project, inventory) {
  const errors = [];
  const paths = inventory.assets.map(a => a.path);
  if (new Set(paths).size !== paths.length) errors.push('duplicate inventory paths');
  for (const file of inventory.publicationAllowlist ?? []) {
    const entry = inventory.assets.find(a => a.path === file);
    if (!entry || entry.visualApproval !== 'APPROVED' || entry.rightsStatus !== 'VERIFIED' || entry.releaseEligible !== true)
      errors.push(`unapproved publicationAllowlist entry: ${file}`);
  }
  const actual = (await filesIn(path.join(project, 'public/assets'))).map(p => path.relative(project, p).replaceAll('\\', '/'));
  for (const file of actual) if (!paths.includes(file)) errors.push(`unlisted asset: ${file}`);
  const measuredAssets = [];
  for (const expected of inventory.assets) {
    try {
      const measured = await inspectAsset(project, expected.path);
      measuredAssets.push(measured);
      const identity = expected.path.endsWith('.json') ? ['canonicalBytes', 'canonicalSha256'] : ['bytes', 'sha256'];
      for (const key of [...identity, 'width', 'height', 'alpha', 'clips']) {
        if (JSON.stringify(measured[key]) !== JSON.stringify(expected[key])) errors.push(`${expected.path}: ${key} mismatch`);
      }
    } catch (error) { errors.push(`${expected.path}: ${error.message}`); }
  }
  const refs = await sourceReferences(project);
  if (JSON.stringify(refs) !== JSON.stringify(inventory.sourceReferences))
    errors.push('sourceReferences changed: review added/removed runtime resource expressions');
  errors.push(...p0PublicationErrors(actual), ...await packManifestErrors(project, actual));
  const runtime = await runtimeReferenceReport(project, refs, actual);
  for (const file of [...runtime.staticRuntimePaths, ...runtime.indirectRuntimePaths.map(ref => ref.path)])
    if (!actual.includes(file)) errors.push(`missing source-referenced asset: ${file}`);
  if (inventory.schemaVersion === 2) {
    if (JSON.stringify(summarizeAssets(measuredAssets)) !== JSON.stringify(inventory.totals)) errors.push('totals mismatch');
    for (const [field, value] of Object.entries(runtime))
      if (JSON.stringify(value) !== JSON.stringify(inventory[field])) errors.push(`${field} changed`);
    if (inventory.runtimeObservationStatus !== 'NOT_OBSERVED' || !Array.isArray(inventory.runtimeCurrentlyLoaded) || inventory.runtimeCurrentlyLoaded.length)
      errors.push('runtimeCurrentlyLoaded requires separate runtime observation; static inventory must remain NOT_OBSERVED with an empty list');
  }
  return errors;
}
export async function createCurrentInventory(project) {
  const paths = (await filesIn(path.join(project, 'public/assets'))).map(file => path.relative(project, file).replaceAll('\\', '/'));
  const errors = [...p0PublicationErrors(paths), ...await packManifestErrors(project, paths)];
  if (errors.length) throw new Error(errors.join('\n'));
  const assets = [];
  for (const file of paths) assets.push(await inspectAsset(project, file));
  const refs = await sourceReferences(project);
  const runtime = await runtimeReferenceReport(project, refs, paths);
  for (const file of [...runtime.staticRuntimePaths, ...runtime.indirectRuntimePaths.map(ref => ref.path)])
    if (!paths.includes(file)) throw new Error(`missing source-referenced asset: ${file}`);
  return { schemaVersion: 2, scope: 'Current repository asset tree and static source evidence; not a runtime or visual approval',
    historicalEvidence: 'docs/production/evidence/a00-2026-10-01/inventory.json',
    byteAccounting: 'JSON byte totals use LF normalization; all other files use physical bytes',
    sourceReferences: refs, ...runtime, runtimeObservationStatus: 'NOT_OBSERVED', runtimeCurrentlyLoaded: [],
    publicationAllowlist: [],
    limitations: ['Static literals, imported JSON runtimePath and template filename matches are not whole-program dataflow or executed requests.',
      'Manifest registration does not prove runtime use. Offline GLB/texture/sprite sources and the three P0 layers are retained independently of runtime use.',
      'No new visual or rights approval. Decoded RGBA sizes are estimates, not measured GPU memory.'],
    totals: summarizeAssets(assets), assets };
}
export async function runAssetVerificationCLI(args, name = 'verify_assets.mjs') {
  let project = root, inventoryPath, hasRoot = false, writeInventory = false;
  try {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--write-inventory') {
        if (writeInventory) throw new Error('--write-inventory cannot repeat');
        writeInventory = true;
      } else if (arg === '--root') {
        if (hasRoot || !args[i + 1] || args[i + 1].startsWith('-')) throw new Error('--root requires one directory value and cannot repeat');
        project = path.resolve(args[++i]);
        hasRoot = true;
      } else if (arg.startsWith('-') || !arg || inventoryPath) {
        throw new Error(`Unexpected argument: ${arg}`);
      } else inventoryPath = arg;
    }
    if (writeInventory && inventoryPath) throw new Error('--write-inventory writes only docs/assets/inventory.json; cannot combine with an inventory path');
  } catch (error) {
    console.error(`${error.message}\nUsage: node tools/blender/${name} [inventory.json | --write-inventory] [--root directory]`);
    return 2;
  }
  let inventory, errors;
  try {
    const current = path.join(project, currentInventoryPath);
    if (writeInventory) {
      inventory = await createCurrentInventory(project);
      await fs.mkdir(path.dirname(current), { recursive: true });
      await fs.writeFile(current, JSON.stringify(inventory, null, 2) + '\n');
    } else inventory = JSON.parse(await fs.readFile(inventoryPath ?? current, 'utf8'));
    errors = await verifyAssets(project, inventory);
  } catch (error) { errors = [error.message]; }
  console.log(JSON.stringify({ status: errors.length ? 'FAIL' : 'PASS', assets: inventory?.assets?.length ?? 0,
    mode: writeInventory ? 'write-current-inventory' : 'read-only', visualApproval: 'NOT_GRANTED', rightsApproval: 'UNKNOWN', errors }, null, 2));
  return errors.length ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exitCode = await runAssetVerificationCLI(process.argv.slice(2));
