import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { inspectAsset, verifyAssets } from './verify_assets.mjs';

test('asset verification rejects broken contracts and leaves inputs unchanged', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'a00-assets-'));
  try {
    await mkdir(path.join(root, 'public/assets'), { recursive: true });
    await mkdir(path.join(root, 'src'));
    await sharp({ create: { width: 2, height: 3, channels: 4, background: '#ff000080' } })
      .png().toFile(path.join(root, 'public/assets/test.png'));
    const json = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, scenes: [{}], scene: 0 }).padEnd(100, ' '));
    const glb = Buffer.alloc(20 + json.length);
    glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
    glb.writeUInt32LE(json.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); json.copy(glb, 20);
    await writeFile(path.join(root, 'public/assets/test.glb'), glb);
    const assets = await Promise.all(['test.png', 'test.glb'].map(file => inspectAsset(root, `public/assets/${file}`)));
    await writeFile(path.join(root, 'public/assets/meta.json'), '{\n  "version": 1\n}\n');
    assets.push(await inspectAsset(root, 'public/assets/meta.json'));
    const baseline = { assets, sourceReferences: [] };
    assert.deepEqual(await verifyAssets(root, baseline), []);
    await writeFile(path.join(root, 'public/assets/meta.json'), '{\r\n  "version": 1\r\n}\r\n');
    assert.deepEqual(await verifyAssets(root, baseline), [], 'Git CRLF checkout must not break content integrity');
    const cli = async (inventory, status) => {
      const snapshot = path.join(root, 'inventory.json');
      await writeFile(snapshot, JSON.stringify(inventory));
      const result = spawnSync(process.execPath, [fileURLToPath(new URL('./verify_assets.mjs', import.meta.url)), snapshot, '--root', root], { encoding: 'utf8', windowsHide: true });
      assert.equal(result.status, status, result.stdout + result.stderr);
      assert.equal(JSON.parse(result.stdout).status, status ? 'FAIL' : 'PASS');
    };
    await cli(baseline, 0);
    await writeFile(path.join(root, 'public/assets/meta.json'), '{\r\n  "version": 2\r\n}\r\n');
    assert((await verifyAssets(root, baseline)).some(e => e.includes('canonicalSha256')));
    await cli(baseline, 1);
    t.diagnostic('JSON content changed after LF normalization: expected CLI exit 1 observed');
    await writeFile(path.join(root, 'public/assets/meta.json'), '{\r\n  "version": 1\r\n}\r\n');
    const before = await readFile(path.join(root, 'public/assets/test.png'));
    for (const [field, value] of [['width', 99], ['height', 99], ['alpha', false], ['sha256', '0'.repeat(64)]]) {
      const changed = structuredClone(baseline); changed.assets[0][field] = value;
      assert((await verifyAssets(root, changed)).some(e => e.includes(field)), field);
      await cli(changed, 1);
      t.diagnostic(`${field}: expected CLI exit 1 observed`);
    }
    const clips = structuredClone(baseline); clips.assets[1].clips = ['flip'];
    assert((await verifyAssets(root, clips)).some(e => e.includes('clips')));
    await cli(clips, 1);
    t.diagnostic('wrong animation clip: expected CLI exit 1 observed');
    const missing = structuredClone(baseline); missing.assets.push({ path: 'public/assets/missing.png' });
    assert((await verifyAssets(root, missing)).some(e => e.includes('missing')));
    await cli(missing, 1);
    t.diagnostic('missing file: expected CLI exit 1 observed');
    const unapproved = structuredClone(baseline); unapproved.publicationAllowlist = ['public/assets/test.png'];
    assert((await verifyAssets(root, unapproved)).some(e => e.includes('publicationAllowlist')));
    await cli(unapproved, 1);
    t.diagnostic('unapproved publication allowlist entry: expected CLI exit 1 observed');
    await writeFile(path.join(root, 'src/extra.ts'), "const url = '/assets/extra.webp';\n");
    assert((await verifyAssets(root, baseline)).some(e => e.includes('sourceReferences')));
    await cli(baseline, 1);
    t.diagnostic('extra runtime resource expression: expected CLI exit 1 observed');
    await writeFile(path.join(root, 'public/assets/unlisted.txt'), 'unlisted');
    assert((await verifyAssets(root, baseline)).some(e => e.includes('unlisted')));
    await cli(baseline, 1);
    t.diagnostic('unlisted asset: expected CLI exit 1 observed');
    const unsafe = structuredClone(baseline); unsafe.assets.push({ path: '../outside.png' });
    assert((await verifyAssets(root, unsafe)).some(e => e.includes('unsafe')));
    await cli(unsafe, 1);
    t.diagnostic('escaping asset path: expected CLI exit 1 observed');
    assert.deepEqual(await readFile(path.join(root, 'public/assets/test.png')), before);
  } finally {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert(path.basename(root).startsWith('a00-assets-'));
    await rm(root, { recursive: true, force: true });
  }
});
