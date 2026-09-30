// R00 baseline probe for gameplay at 14be6d6. Observes defects; does not certify quality.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const output = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(output, '../../../..');
const port = 5201;
const base = `http://localhost:${port}/?harness=1&seed=r00-baseline`;
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const report = {
  testedCommit: git('rev-parse', 'HEAD'),
  branch: git('branch', '--show-current'),
  dirtyState: git('status', '--porcelain=v1'),
  captureHash: createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex'),
  node: process.version,
  viewports: [],
  limitation: 'Automated headless browser; mobile touchscreen emulation is not a physical phone or human acceptance.',
};

async function scene(page, key) {
  await page.waitForFunction(key => window.__harness?.game.scene.getScene(key)?.scene.isActive(), key);
}

async function input(page, touch, x, y) {
  const point = await page.evaluate(({ x, y }) => {
    const r = document.querySelector('canvas').getBoundingClientRect();
    return { x: r.left + x * r.width / 1280, y: r.top + y * r.height / 720 };
  }, { x, y });
  if (touch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const s = window.__harness.game.scene.getScene('game');
    const r = document.querySelector('canvas').getBoundingClientRect();
    return {
      active: s.scene.isActive(), playing: s.playing, heat: s.heat, handsLeft: s.handsLeft,
      hand: s.hand.map(c => c.id), deckCount: s.deck.length,
      queueRunning: s.effects.running, pendingEffects: s.effects.effects.length,
      result: s.resultText?.text, breakdown: s.breakdownText?.text,
      canvas: { width: r.width, height: r.height },
      playButtonCssHeight: 58 * r.height / 720,
      jokerDescriptionCssFontSize: 10 * r.height / 720,
      run: window.__harness.game.registry.get('runState'),
    };
  });
}

async function runViewport(browser, name, viewport) {
  const touch = name === 'mobile';
  const context = await browser.newContext({ viewport, hasTouch: touch });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  const result = { name, viewport, input: touch ? 'touchscreen.tap' : 'mouse.click', errors };
  const shot = suffix => page.screenshot({ path: path.join(output, `${name}-${suffix}.png`) });
  try {
    await page.goto(base);
    await scene(page, 'character-select');
    await page.waitForTimeout(200);
    await shot('select');
    await input(page, touch, 248, 256);
    await scene(page, 'shop');
    await shot('shop');
    await input(page, touch, 167, 445); // Buy first offer through the displayed card.
    result.afterBuy = await page.evaluate(() => window.__harness.game.registry.get('runState'));
    assert.equal(result.afterBuy.jokerIds.length, 1);
    assert.ok(result.afterBuy.gold < 6);
    await input(page, touch, 1108, 624);
    await scene(page, 'game');
    await shot('table');
    result.beforePlay = await snapshot(page);
    await input(page, touch, 143, 490);
    await input(page, touch, 640, 650);
    await page.waitForFunction(() => {
      const s = window.__harness.game.scene.getScene('game');
      return s.heat > 0 && !s.playing;
    });
    result.afterPlay = await snapshot(page);
    assert.equal(result.afterPlay.handsLeft, result.beforePlay.handsLeft - 1);
    assert.equal(result.afterPlay.hand.length, 8);
    await shot('one-hand');

    // Interrupt an actual user-submitted second hand before its first tween finishes.
    await input(page, touch, 143, 490);
    await input(page, touch, 640, 650);
    await page.waitForFunction(() => window.__harness.game.scene.getScene('game').playing);
    result.interruptSubmitted = await snapshot(page);
    await input(page, touch, 1180, 686);
    await scene(page, 'character-select');
    result.afterExit = await snapshot(page);
    await shot('interrupted');
    await input(page, touch, 248, 256);
    await scene(page, 'shop');
    await input(page, touch, 1108, 624);
    await scene(page, 'game');
    result.reentered = await snapshot(page);
    await input(page, touch, 143, 490);
    await input(page, touch, 640, 650);
    await page.waitForTimeout(700);
    result.afterReentryPlay = await snapshot(page);
    await shot('reentry');
    result.F07 = result.afterReentryPlay.queueRunning && result.afterReentryPlay.pendingEffects > 0
      ? 'FAIL: interrupted drain remains running; new hand bypasses animation with effects pending'
      : 'NOT_REPRODUCED: inspect snapshots before drawing a conclusion';
    assert.deepEqual(errors, []);
    console.log(`${name}: baseline reproduced; ${result.F07}`);
    return result;
  } finally {
    report.viewports.push(result);
    await context.close();
  }
}

async function previews(browser) {
  const ids = ['amo', 'touye', 'laohuan', 'erxiang', 'azao', 'xiemu'];
  const context = await browser.newContext({ viewport: { width: 1320, height: 820 } });
  const page = await context.newPage();
  try {
    const gallery = `<meta charset="utf-8"><style>body{margin:24px;font:16px sans-serif;background:#e9e8e3;color:#252525}main{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}figure{margin:0;text-align:center}img.original{width:190px;height:420px;object-fit:contain;background:#fff}img.avatar{width:80px;height:80px;object-fit:contain}h1{font-size:22px}</style><h1>R00 既有原图 / 头像对照 · 未经美术批准</h1><main>${ids.map(id => `<figure><p>${id}</p><img class="original" src="http://localhost:${port}/assets/characters/${id}.png"><p><img class="avatar" src="http://localhost:${port}/assets/characters/${id}.avatar.webp"></p><figcaption>原图等比展示 / 80 CSS px 头像</figcaption></figure>`).join('')}</main>`;
    await page.route(`http://localhost:${port}/r00-preview`, route => route.fulfill({ contentType: 'text/html', body: gallery }));
    await page.goto(`http://localhost:${port}/r00-preview`);
    await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0));
    await page.screenshot({ path: path.join(output, 'portraits-avatars.png') });
    report.portraits = await page.evaluate(() => [...document.images].map(i => ({ file: new URL(i.src).pathname, width: i.naturalWidth, height: i.naturalHeight })));
    await page.goto(`http://localhost:${port}/assets/renders/p0/contact-sheet.webp`);
    await page.screenshot({ path: path.join(output, 'asset-overview.png'), fullPage: true });
    const manifest = JSON.parse(await readFile(path.join(root, 'public/assets/models/asset-pack-v1.json'), 'utf8'));
    report.assets = { manifestEntries: manifest.assets.length, glbEntries: manifest.assets.filter(a => a.file.endsWith('.glb')).length, previewSource: 'public/assets/renders/p0/contact-sheet.webp', fullGlbReview: 'NOT_RUN: deferred to A00', artApproval: 'NOT_RUN' };
    report.assets.originalPortraitBytes = (await Promise.all(ids.map(id => stat(path.join(root, `public/assets/characters/${id}.png`))))).reduce((sum, s) => sum + s.size, 0);
  } finally {
    await context.close();
  }
}

const server = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore', windowsHide: true });
let browser;
try {
  const deadline = Date.now() + 30000;
  while (true) {
    try { if ((await fetch(base)).ok) break; } catch {}
    if (Date.now() > deadline) throw new Error('baseline server timeout');
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  try { browser = await chromium.launch({ channel: 'chrome' }); report.browserChannel = 'installed Chrome'; }
  catch { browser = await chromium.launch(); report.browserChannel = 'Playwright Chromium'; }
  report.browserVersion = browser.version();
  await runViewport(browser, 'desktop', { width: 1280, height: 800 });
  await runViewport(browser, 'mobile', { width: 390, height: 844 });
  await previews(browser);
  report.status = 'PASS: baseline captured, not product acceptance';
} catch (error) {
  report.status = 'FAIL';
  report.error = String(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
  await writeFile(path.join(output, 'browser-observations.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(report.status);
}
