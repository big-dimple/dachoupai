/** A00 read-only delivered-file audit. Never updates source assets or manifests.
 * node tools/blender/verify_assets.mjs [inventory.json]
 * Deliberately no minimum triangle count. Render/rights approval remain separate.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import validator from 'gltf-validator';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
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
  for (const expected of inventory.assets) {
    try {
      const measured = await inspectAsset(project, expected.path);
      const identity = expected.path.endsWith('.json') ? ['canonicalBytes', 'canonicalSha256'] : ['bytes', 'sha256'];
      for (const key of [...identity, 'width', 'height', 'alpha', 'clips']) {
        if (JSON.stringify(measured[key]) !== JSON.stringify(expected[key])) errors.push(`${expected.path}: ${key} mismatch`);
      }
    } catch (error) { errors.push(`${expected.path}: ${error.message}`); }
  }
  if (JSON.stringify(await sourceReferences(project)) !== JSON.stringify(inventory.sourceReferences))
    errors.push('sourceReferences changed: review added/removed runtime resource expressions');
  return errors;
}
export async function runAssetVerificationCLI(args, name = 'verify_assets.mjs') {
  let project = root, inventoryPath, hasRoot = false;
  try {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--root') {
        if (hasRoot || !args[i + 1] || args[i + 1].startsWith('-')) throw new Error('--root requires one directory value and cannot repeat');
        project = path.resolve(args[++i]);
        hasRoot = true;
      } else if (arg.startsWith('-') || !arg || inventoryPath) {
        throw new Error(`Unexpected argument: ${arg}`);
      } else inventoryPath = arg;
    }
  } catch (error) {
    console.error(`${error.message}\nUsage: node tools/blender/${name} [inventory.json] [--root directory]`);
    return 2;
  }
  let inventory, errors;
  try {
    inventory = JSON.parse(await fs.readFile(inventoryPath ?? path.join(project, 'docs/production/evidence/a00-2026-10-01/inventory.json'), 'utf8'));
    errors = await verifyAssets(project, inventory);
  } catch (error) { errors = [error.message]; }
  console.log(JSON.stringify({ status: errors.length ? 'FAIL' : 'PASS', assets: inventory?.assets?.length ?? 0,
    mode: 'read-only', visualApproval: 'NOT_GRANTED', rightsApproval: 'UNKNOWN', errors }, null, 2));
  return errors.length ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exitCode = await runAssetVerificationCLI(process.argv.slice(2));
