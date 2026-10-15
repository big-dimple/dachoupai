import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const contract = JSON.parse(await fs.readFile(path.join(project, 'art/hero-replacement-contract.json'), 'utf8'));
const legacyFile = path.join(project, 'public/assets/handdrawn-p08/manifest.json');
const hash = data => createHash('sha256').update(data).digest('hex');
const requireThat = (ok, message) => { if (!ok) throw new Error(message); };
const text = value => typeof value === 'string' && value.trim().length > 0 && !/TODO|REPLACE|PENDING/i.test(value);
const exactKeys = (values, wanted, label) => requireThat(Array.isArray(values) && values.length === wanted.length && new Set(values).size === wanted.length && wanted.every(x => values.includes(x)), `${label}: exact set required`);

async function readImage(root, entry, expected, used) {
  requireThat(entry && typeof entry.path === 'string' && !path.isAbsolute(entry.path) && !entry.path.split(/[\\/]/).includes('..'), 'unsafe/missing path');
  const resolved = await fs.realpath(path.resolve(root, entry.path));
  const realRoot = await fs.realpath(root);
  requireThat(resolved.startsWith(realRoot + path.sep), 'path escapes manifest directory');
  requireThat(!used.has(resolved), `duplicate path: ${entry.path}`); used.add(resolved);
  const data = await fs.readFile(resolved);
  const metadata = await sharp(data, {failOn: 'warning', limitInputPixels: 4000000}).metadata();
  await sharp(data, {failOn: 'warning', limitInputPixels: 4000000}).raw().toBuffer();
  requireThat(!metadata.pages || metadata.pages === 1, 'animated/multipage images forbidden');
  requireThat(metadata.width === expected.width && metadata.height === expected.height, `${entry.path}: wrong dimensions`);
  requireThat(metadata.format === expected.format, `${entry.path}: wrong format`);
  requireThat(entry.width === metadata.width && entry.height === metadata.height, `${entry.path}: declared dimensions mismatch`);
  requireThat(entry.bytes === data.length && entry.sha256 === hash(data), `${entry.path}: bytes/hash mismatch`);
  requireThat(data.length <= expected.maxBytes, `${entry.path}: byte budget exceeded`);
  if (expected.maxPixels) requireThat(metadata.width * metadata.height <= expected.maxPixels, 'pixel budget exceeded');
  return {data, metadata, sha256: hash(data)};
}

export async function auditCurrent(manifestFile = legacyFile) {
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
  const heroes = manifest.assets.filter(a => a.category === 'character');
  exactKeys(heroes.map(a => a.id), contract.characterIds, 'characters');
  const used = new Set(), files = [];
  for (const hero of heroes) {
    exactKeys(hero.outputs.map(o => o.purpose), ['avatar', 'selection', 'portrait'], hero.id);
    for (const output of hero.outputs) {
      requireThat(output.path === `characters/${hero.id}.${output.purpose}.webp`, 'wrong character mapping');
      const checked = await readImage(path.dirname(manifestFile), output, contract.outputs[output.purpose], used);
      files.push({id: hero.id, purpose: output.purpose, path: output.path, width: checked.metadata.width, height: checked.metadata.height, format: checked.metadata.format, bytes: output.bytes, sha256: checked.sha256, fullDecode: true});
    }
  }
  return {status: 'PASS_CURRENT_TECHNICAL_ONLY', finalYoungAdultArt: false, outputs: files.length, files,
    missingOriginals: heroes.map(h => ({id: h.id, reason: 'Current runtime manifest contains no original source file/hash, version, license or young-adult approval; original provenance cannot be verified.'})),
    blockers: ['Six reviewed young-adult portrait originals and six matching independent eyes originals are not delivered by this manifest.', 'Legacy artwork is not final approval; eyes are not runtime integrated.']};
}

function rectangle(rect, width, height, label) {
  requireThat(rect && ['left', 'top', 'width', 'height'].every(k => Number.isInteger(rect[k])) && rect.left >= 0 && rect.top >= 0 && rect.width > 0 && rect.height > 0 && rect.left + rect.width <= width && rect.top + rect.height <= height, `${label}: crop/safe area out of bounds`);
}
export async function renderOutput(data, output) {
  const spec = contract.outputs[output.purpose];
  return sharp(data, {failOn: 'warning'}).extract(output.cropPixels).resize(spec.width, spec.height, {fit: 'cover', position: 'centre', kernel: 'lanczos3', withoutEnlargement: true}).webp({quality: 88, effort: 6}).toBuffer();
}

export async function verifyIncoming(manifestFile) {
  const manifest = JSON.parse(await fs.readFile(manifestFile, 'utf8'));
  requireThat(manifest.schemaVersion === 1 && manifest.contractId === contract.id, 'wrong contract/schema');
  exactKeys(manifest.characters?.map(c => c.id), contract.characterIds, 'characters');
  const legacy = JSON.parse(await fs.readFile(legacyFile, 'utf8'));
  const oldHashes = new Set(legacy.assets.filter(a => a.category === 'character').flatMap(a => a.outputs.map(o => o.sha256)));
  const used = new Set(), newHashes = new Set();
  for (const hero of manifest.characters) {
    exactKeys(Object.keys(hero.sources ?? {}), ['portrait', 'eyes'], `${hero.id} sources`);
    const sources = {};
    for (const purpose of ['portrait', 'eyes']) {
      const source = hero.sources[purpose];
      requireThat(source.characterId === hero.id && source.purpose === purpose && source.path === `originals/${hero.id}.${purpose}.png`, 'wrong source character mapping');
      requireThat(source.original === true && text(source.version) && ['origin', 'license', 'licenseEvidence'].every(k => text(source.provenance?.[k])), 'original/version/provenance/license required');
      const checked = await readImage(path.dirname(manifestFile), source, contract.sources[purpose], used);
      requireThat(source.format === 'png' && source.alpha === checked.metadata.hasAlpha, 'source format/alpha declaration mismatch');
      requireThat(!oldHashes.has(checked.sha256) && !newHashes.has(checked.sha256), 'legacy/duplicate image hash'); newHashes.add(checked.sha256);
      sources[purpose] = checked;
    }
    const review = hero.review;
    requireThat(review?.status === 'approved' && review.youngAdult === true && review.distinctIdentity === true && review.samePersonEyes === true && text(review.reviewer) && text(review.evidence) && text(review.reviewedAt) && Number.isFinite(Date.parse(review.reviewedAt)), 'young-adult/identity/eyes human review required');
    requireThat(['portrait', 'eyes'].every(p => review.sourceHashes?.[p] === sources[p].sha256), 'review must bind exact source hashes');
    exactKeys(hero.outputs?.map(o => o.purpose), Object.keys(contract.outputs), `${hero.id} outputs`);
    for (const output of hero.outputs) {
      const spec = contract.outputs[output.purpose];
      requireThat(output.characterId === hero.id && output.path === `outputs/${hero.id}.${output.purpose}.webp` && output.sourcePurpose === spec.sourcePurpose, 'wrong output character mapping');
      const source = sources[spec.sourcePurpose], crop = output.cropPixels, safe = output.safeAreaPixels;
      rectangle(crop, source.metadata.width, source.metadata.height, 'crop');
      rectangle(safe, source.metadata.width, source.metadata.height, 'safe');
      requireThat(crop.width >= spec.width && crop.height >= spec.height, 'upscaling forbidden');
      const scale = Math.max(spec.width / crop.width, spec.height / crop.height);
      const visibleW = spec.width / scale, visibleH = spec.height / scale;
      const left = crop.left + (crop.width - visibleW) / 2, top = crop.top + (crop.height - visibleH) / 2;
      requireThat(safe.left >= left && safe.top >= top && safe.left + safe.width <= left + visibleW && safe.top + safe.height <= top + visibleH, 'safe area clipped by crop/cover');
      const checked = await readImage(path.dirname(manifestFile), output, spec, used);
      requireThat(!oldHashes.has(checked.sha256) && !newHashes.has(checked.sha256), 'legacy/duplicate image hash'); newHashes.add(checked.sha256);
      requireThat(checked.data.equals(await renderOutput(source.data, output)), 'output is not exact non-stretched source crop/resize (fixed sharp recipe)');
    }
  }
  return {status: 'PASS_INCOMING_TECHNICAL_ONLY', characters: 6, originals: 12, outputs: 24, runtimeIntegrated: false, automaticPublication: false, visualReview: 'Recorded human attestation checked; image semantics are not machine certified.'};
}

export function template() {
  return {schemaVersion: 1, contractId: contract.id, characters: contract.characterIds.map(id => ({id,
    sources: Object.fromEntries(Object.entries(contract.sources).map(([purpose, spec]) => [purpose, {characterId: id, purpose, path: `originals/${id}.${purpose}.png`, width: spec.width, height: spec.height, format: 'png', alpha: false, bytes: 0, sha256: 'REPLACE', original: true, version: 'REPLACE', provenance: {origin: 'REPLACE original download URL/reference', license: 'REPLACE applicable rights', licenseEvidence: 'REPLACE source/permission reference'}}])),
    review: {status: 'pending', reviewer: 'REPLACE', reviewedAt: 'REPLACE ISO timestamp', youngAdult: false, distinctIdentity: false, samePersonEyes: false, evidence: 'REPLACE review record including face/crop safety', sourceHashes: {portrait: 'REPLACE', eyes: 'REPLACE'}},
    outputs: Object.entries(contract.outputs).map(([purpose, spec]) => ({characterId: id, purpose, sourcePurpose: spec.sourcePurpose, path: `outputs/${id}.${purpose}.webp`, width: spec.width, height: spec.height, bytes: 0, sha256: 'REPLACE', cropPixels: {left: 0, top: 0, width: 1536, height: purpose === 'eyes' ? 768 : purpose === 'avatar' ? 1536 : 1920}, safeAreaPixels: {left: 100, top: 100, width: 100, height: 100}}))}))};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    requireThat(args.length === 0 || (args.length === 1 && args[0] === '--template') || (args.length === 2 && args[0] === '--incoming'), 'Usage: node scripts/verify-hero-art.mjs [--template | --incoming manifest.json]');
    console.log(JSON.stringify(args[0] === '--template' ? template() : args[0] === '--incoming' ? await verifyIncoming(path.resolve(args[1])) : await auditCurrent(), null, 2));
  } catch (error) { console.error(JSON.stringify({status: 'FAIL', error: error.message})); process.exitCode = 1; }
}
