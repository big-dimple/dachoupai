import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { Document, NodeIO } from '@gltf-transform/core';
import { root, inspectAsset, currentInventoryPath } from './verify_assets.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function fixture(run) {
  const parent = path.join(root, 'shots');
  await fs.mkdir(parent, { recursive: true });
  const dir = await fs.mkdtemp(path.join(parent, 'a00-inspector-'));
  try {
    await fs.mkdir(path.join(dir, 'tools/blender'), { recursive: true });
    await fs.mkdir(path.join(dir, 'public/assets/models'), { recursive: true });
    await fs.mkdir(path.join(dir, 'src'));
    await fs.mkdir(path.dirname(path.join(dir, currentInventoryPath)), { recursive: true });
    for (const script of ['inspect_asset_pack.mjs', 'verify_assets.mjs'])
      await fs.copyFile(path.join(root, 'tools/blender', script), path.join(dir, 'tools/blender', script));
    const manifest = path.join(dir, 'public/assets/models/asset-pack-v1.json');
    await fs.writeFile(manifest, '{"assets":[]}\n');
    const snapshot = path.join(dir, currentInventoryPath);
    await fs.writeFile(snapshot, JSON.stringify({ assets: [await inspectAsset(dir, 'public/assets/models/asset-pack-v1.json')], sourceReferences: [] }));
    const invoke = (script, args = []) => spawnSync(process.execPath, [path.join(dir, 'tools/blender', script), ...args],
      { cwd: dir, encoding: 'utf8', windowsHide: true });
    await run({ dir, manifest, snapshot, invoke });
  } finally {
    assert.equal(path.dirname(dir), parent);
    assert(path.basename(dir).startsWith('a00-inspector-'));
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test('legacy inspector defaults to read-only; writing requires explicit optimize', async t => fixture(async ({ dir, manifest, snapshot, invoke }) => {
  const before = await fs.readFile(manifest);
  const result = invoke('inspect_asset_pack.mjs');
  const after = await fs.readFile(manifest);
  t.diagnostic(JSON.stringify({ command: 'node tools/blender/inspect_asset_pack.mjs', exit: result.status, before: sha(before), after: sha(after), unchanged: before.equals(after) }));
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(sha(after), sha(before), 'default inspector must not rewrite manifest');
  await assert.rejects(fs.access(path.join(dir, 'shots')), { code: 'ENOENT' });
  const document = new Document(), buffer = document.createBuffer();
  const accessor = (type, values) => document.createAccessor().setBuffer(buffer).setType(type).setArray(new Float32Array(values));
  const primitive = document.createPrimitive()
    .setAttribute('POSITION', accessor('VEC3', [0, 0, 0, 1, 0, 0, 0, 1, 0]))
    .setAttribute('NORMAL', accessor('VEC3', [0, 0, 1, 0, 0, 1, 0, 0, 1]))
    .setAttribute('TEXCOORD_0', accessor('VEC2', [0, 0, 1, 0, 0, 1]));
  document.createScene().addChild(document.createNode().setMesh(document.createMesh().addPrimitive(primitive)));
  const glb = Buffer.from(await new NodeIO().writeBinary(document));
  const glbPath = path.join(dir, 'public/assets/models/low-poly.glb');
  await fs.writeFile(glbPath, glb);
  const inventory = JSON.parse(await fs.readFile(snapshot, 'utf8'));
  inventory.assets.push(await inspectAsset(dir, 'public/assets/models/low-poly.glb'));
  await fs.writeFile(snapshot, JSON.stringify(inventory));
  const lowPoly = invoke('inspect_asset_pack.mjs');
  assert.equal(lowPoly.status, 0, lowPoly.stdout + lowPoly.stderr);
  assert.equal(sha(await fs.readFile(glbPath)), sha(glb));
  t.diagnostic('one-triangle GLB: default exit 0, bytes unchanged; no minimum triangle padding');
  await fs.writeFile(manifest, '{"assets":[],"unexpected":true}\n');
  const invalidBefore = await fs.readFile(manifest);
  const invalid = invoke('inspect_asset_pack.mjs');
  assert.equal(invalid.status, 1, invalid.stdout + invalid.stderr);
  assert.deepEqual(await fs.readFile(manifest), invalidBefore, 'failing validation must not repair the input');
  assert.equal(sha(await fs.readFile(glbPath)), sha(glb));
  t.diagnostic('corrupt contract: default exit 1; manifest and GLB bytes unchanged');
  const explicit = invoke('inspect_asset_pack.mjs', ['--optimize']);
  assert.equal(explicit.status, 0, explicit.stdout + explicit.stderr);
  assert.notDeepEqual(await fs.readFile(manifest), invalidBefore, 'explicit producer mode must retain manifest generation');
  t.diagnostic('explicit --optimize fixture: exit 0, manifest deliberately written');
}));

test('both asset CLIs reject unknown, ambiguous and incomplete arguments without writes', async t => fixture(async ({ dir, manifest, snapshot, invoke }) => {
  const before = await fs.readFile(manifest);
  for (const script of ['verify_assets.mjs', 'inspect_asset_pack.mjs']) {
    for (const args of [[snapshot, '--unknown'], [snapshot, '--root'], [snapshot, '--root', '--unknown'],
      [snapshot, '--root', dir, '--root', dir], [snapshot, 'extra.json'], ['--optimize', '--unknown'],
      [snapshot, '--write-inventory'], ['--write-inventory', '--write-inventory']]) {
      const result = invoke(script, args);
      t.diagnostic(`${script} ${JSON.stringify(args.map(x => x.replaceAll(dir, '<fixture>')))}: exit ${result.status}`);
      assert.equal(result.status, 2, result.stdout + result.stderr);
      assert.match(result.stderr, /Usage:/);
      assert.deepEqual(await fs.readFile(manifest), before);
    }
  }
}));

test('optimization refuses review pollution and missing manifest entries before writing', async () => fixture(async ({ dir, manifest, invoke }) => {
  const preview = path.join(dir, 'public/assets/renders/p0/prop-dice.webp');
  await fs.mkdir(path.dirname(preview), { recursive: true });
  await fs.writeFile(preview, 'review only');
  const before = await fs.readFile(manifest);
  let result = invoke('inspect_asset_pack.mjs', ['--optimize']);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /review-only P0 preview/);
  assert.deepEqual(await fs.readFile(manifest), before);
  await fs.rm(preview);
  await fs.writeFile(manifest, JSON.stringify({ assets: [{ file: 'renders/p0/prop-dice.webp' }] }));
  const stale = await fs.readFile(manifest);
  result = invoke('inspect_asset_pack.mjs', ['--optimize']);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /missing manifest asset/);
  assert.deepEqual(await fs.readFile(manifest), stale);
}));
