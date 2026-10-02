import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { RETAINED_P0_RENDERS, verifyPublication } from './verify_publication.mjs';

test('publication check rejects returned previews, missing layers, leaked GLB and stale runtime references', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'p0-publication-'));
  const put = async (file, text = 'fixture') => {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), text);
  };
  try {
    for (const tree of ['public', 'dist']) {
      for (const file of RETAINED_P0_RENDERS) await put(`${tree}/assets/renders/p0/${file}`);
    }
    await put('dist/index.html', '<html></html>');
    await put('src/assets.ts', "const retained = 'assets/renders/p0/background-far.webp';");
    await put('public/assets/models/prop-dice.glb', 'offline source');
    assert.equal((await verifyPublication(root)).status, 'PASS');
    assert.equal((await verifyPublication(root)).sourceModelCount, 1);

    for (const file of ['public/assets/renders/p0/prop-dice.webp', 'dist/assets/renders/p0/word-combo.webp', 'dist/assets/models/prop-dice.glb']) {
      await put(file);
      const report = await verifyPublication(root);
      assert.equal(report.status, 'FAIL', file);
      assert.ok(report.errors.some(error => error.includes(file.replace(/^(public|dist)\//, ''))), file);
      await rm(path.join(root, file));
    }
    const layer = 'dist/assets/renders/p0/background-mid.webp';
    await rm(path.join(root, layer));
    assert.ok((await verifyPublication(root)).errors.some(error => error.includes('missing retained')));
    await put(layer);

    for (const [file, text] of [
      ['src/assets.ts', "const deleted = 'assets/renders/p0/prop-dice.webp';"],
      ['src/assets.ts', 'const computed = `assets/renders/p0/${name}.webp`;'],
      ['dist/assets/main.js', "fetch('assets/renders/p0/material-kit.webp');"],
    ]) {
      await put(file, text);
      assert.ok((await verifyPublication(root)).errors.some(error => error.includes('render reference')), file);
      assert.equal(await readFile(path.join(root, file), 'utf8'), text, 'verification never modifies input');
      await put(file, '');
    }
    assert.equal((await verifyPublication(root)).status, 'PASS');
    assert.equal(await readFile(path.join(root, 'public/assets/models/prop-dice.glb'), 'utf8'), 'offline source');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
