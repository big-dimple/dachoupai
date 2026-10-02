/** Bounded, read-only checks for the coin reward atlas and its isolated demo.
 * node art/sources/coin-reward/verify.mjs [--browser --chromium-executable /usr/bin/chromium]
 * Writes evidence only beneath shots/coin-reward; never builds or loads the game.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const assetDirectory = 'public/assets/effects/coin-reward';
const imagePath = `${assetDirectory}/coin-reward.webp`;
const atlasPath = `${assetDirectory}/atlas.json`;
const demoPath = 'art/sources/coin-reward/demo.html';
const evidenceDirectory = path.join(project, 'shots/coin-reward');
const frameCount = 16, cellSize = 256, atlasSize = 1024, byteBudget = 163840;
const frameNames = Array.from({ length: frameCount }, (_, index) => `coin-${String(index).padStart(3, '0')}`);
const digest = data => createHash('sha256').update(data).digest('hex');

export function validateAtlas(atlas) {
  assert.ok(atlas && typeof atlas === 'object' && !Array.isArray(atlas), 'atlas must be a JSON object');
  assert.ok(atlas.frames && typeof atlas.frames === 'object' && !Array.isArray(atlas.frames),
    'frames must use the Phaser JSON hash format');
  assert.deepEqual(Object.keys(atlas.frames).sort(), frameNames, 'exactly coin-000 through coin-015 are required');
  assert.equal(atlas.meta?.image, 'coin-reward.webp', 'meta.image must refer to the sibling WebP');
  assert.deepEqual(atlas.meta.size, { w: atlasSize, h: atlasSize }, 'meta.size must be 1024 × 1024');
  assert.equal(atlas.meta.frameRate, 20, 'meta.frameRate must be 20');
  assert.equal(atlas.meta.durationMs, 800, 'meta.durationMs must be 800');
  assert.equal(atlas.meta.repeat, 0, 'meta.repeat must be 0 (one playback)');
  for (const [index, name] of frameNames.entries()) {
    const frame = atlas.frames[name];
    assert.deepEqual(frame.frame, { x: index % 4 * cellSize, y: Math.floor(index / 4) * cellSize,
      w: cellSize, h: cellSize }, `${name}: expected its complete 256 × 256 row-major cell`);
    assert.equal(frame.rotated, false, `${name}: rotated must be false`);
    assert.equal(frame.trimmed, false, `${name}: trimmed must be false`);
    assert.deepEqual(frame.spriteSourceSize, { x: 0, y: 0, w: cellSize, h: cellSize }, `${name}: spriteSourceSize`);
    assert.deepEqual(frame.sourceSize, { w: cellSize, h: cellSize }, `${name}: sourceSize`);
  }
}

export function inspectPixels(data, info) {
  assert.equal(info.width, atlasSize, 'decoded atlas width must be 1024');
  assert.equal(info.height, atlasSize, 'decoded atlas height must be 1024');
  assert.equal(info.channels, 4, 'decoded atlas must have four RGBA channels');
  assert.equal(data.length, atlasSize * atlasSize * 4, 'decoded RGBA byte count');
  return frameNames.map((name, index) => {
    const cellX = index % 4 * cellSize, cellY = Math.floor(index / 4) * cellSize;
    const hash = createHash('sha256');
    let pixels = 0, partialAlphaPixels = 0, transparentPixels = 0;
    let minX = cellSize, minY = cellSize, maxX = -1, maxY = -1, maxAlpha = 0;
    for (let y = 0; y < cellSize; y++) {
      const row = ((cellY + y) * atlasSize + cellX) * 4;
      hash.update(data.subarray(row, row + cellSize * 4));
      for (let x = 0; x < cellSize; x++) {
        const alpha = data[row + x * 4 + 3];
        if (alpha === 0) { transparentPixels++; continue; }
        pixels++;
        if (alpha < 255) partialAlphaPixels++;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        maxAlpha = Math.max(maxAlpha, alpha);
      }
    }
    assert.ok(pixels > 0, `${name}: frame is entirely transparent`);
    assert.ok(minX > 0 && minY > 0 && maxX < cellSize - 1 && maxY < cellSize - 1,
      `${name}: nonzero alpha touches a 256px cell edge (${minX},${minY})–(${maxX},${maxY})`);
    return { name, nontransparentPixels: pixels, transparentPixels, partialAlphaPixels, maxAlpha,
      alphaBounds: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
      transparentPadding: { left: minX, top: minY, right: cellSize - 1 - maxX, bottom: cellSize - 1 - maxY },
      decodedSha256: hash.digest('hex') };
  });
}

async function checkStatic(report) {
  const [image, json] = await Promise.all([
    readFile(path.join(project, imagePath)), readFile(path.join(project, atlasPath)),
  ]);
  report.image = { path: imagePath, bytes: image.length, sha256: digest(image) };
  report.atlas = { path: atlasPath, bytes: json.length, sha256: digest(json) };
  report.budget = { combinedBytes: image.length + json.length, maximumBytes: byteBudget, includes: [imagePath, atlasPath] };
  assert.ok(report.budget.combinedBytes <= byteBudget,
    `Atlas + JSON budget exceeded: ${report.budget.combinedBytes} > ${byteBudget} bytes`);
  const atlas = JSON.parse(json);
  validateAtlas(atlas);
  report.atlas.meta = atlas.meta;
  const metadata = await sharp(image).metadata();
  Object.assign(report.image, { format: metadata.format, width: metadata.width,
    height: metadata.height, channels: metadata.channels, hasAlpha: metadata.hasAlpha });
  assert.equal(metadata.format, 'webp', 'image must be a real WebP');
  assert.equal(metadata.hasAlpha, true, 'WebP must retain alpha');
  assert.equal(metadata.channels, 4, 'WebP must be RGBA');
  assert.equal(metadata.pages ?? 1, 1, 'atlas must be one static image, not an animated WebP');
  const decoded = await sharp(image).raw().toBuffer({ resolveWithObject: true });
  report.frames = inspectPixels(decoded.data, decoded.info);
  report.uniqueDecodedFrames = new Set(report.frames.map(frame => frame.decodedSha256)).size;
  report.status = 'PASS';
}

// Executed in the page. Reads only the six demo canvases, never other image files.
function canvasSnapshot() {
  return { state: document.body.dataset.state, frame: Number(document.body.dataset.frame),
    canvases: [...document.querySelectorAll('canvas[data-size]')].map(canvas => {
      const bounds = canvas.getBoundingClientRect();
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let paintedBackground = null;
      for (let element = canvas; element; element = element.parentElement) {
        const style = getComputedStyle(element);
        if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' || style.backgroundImage !== 'none') {
          paintedBackground = { color: style.backgroundColor, image: style.backgroundImage }; break;
        }
      }
      let hash = 2166136261, nontransparentPixels = 0;
      for (let i = 0; i < pixels.length; i++) {
        hash = Math.imul(hash ^ pixels[i], 16777619);
        if (i % 4 === 3 && pixels[i] > 0) nontransparentPixels++;
      }
      return { size: Number(canvas.dataset.size), cssWidth: bounds.width, cssHeight: bounds.height,
        width: canvas.width, height: canvas.height,
        background: canvas.dataset.background ?? canvas.closest('[data-background]')?.dataset.background ?? null,
        paintedBackground, nontransparentPixels, pixelHash: (hash >>> 0).toString(16).padStart(8, '0') };
    }) };
}

function validateCanvases(snapshot) {
  assert.equal(snapshot.canvases.length, 6, 'demo must show exactly six size-labelled canvases');
  const pairs = [];
  for (const canvas of snapshot.canvases) {
    assert.ok([72, 96].includes(canvas.size), 'each canvas must use data-size 72 or 96');
    assert.equal(canvas.cssWidth, canvas.size, 'actual canvas CSS width matches its label');
    assert.equal(canvas.cssHeight, canvas.size, 'actual canvas CSS height matches its label');
    assert.ok(canvas.nontransparentPixels > 0, 'actual canvas contains drawn, nontransparent pixels');
    pairs.push(`${canvas.background}/${canvas.size}`);
  }
  assert.deepEqual(pairs.sort(), ['checker/72', 'checker/96', 'dark/72', 'dark/96', 'light/72', 'light/96'],
    '72px and 96px previews must each cover dark, light and checker backgrounds');
  const backgrounds = Object.fromEntries(snapshot.canvases.map(canvas => [canvas.background, canvas.paintedBackground]));
  assert.ok(backgrounds.checker?.image && backgrounds.checker.image !== 'none', 'checker background has a painted pattern');
  assert.ok(backgrounds.dark?.color && backgrounds.light?.color && backgrounds.dark.color !== backgrounds.light.color,
    'dark and light backgrounds have distinct painted colors');
}

async function checkBrowser(report, executablePath, runId) {
  const routes = new Map([
    [`/${demoPath}`, { path: demoPath, mime: 'text/html; charset=utf-8' }],
    ...[imagePath, atlasPath].flatMap(file => [file, file.replace(/^public\//, '')]
      .map(url => [`/${url}`, { path: file, mime: file.endsWith('.webp') ? 'image/webp' : 'application/json' }])),
  ]);
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
      const route = routes.get(url.pathname);
      if (!route || !['GET', 'HEAD'].includes(request.method)) { response.writeHead(404); response.end('not found'); return; }
      const absolute = path.join(project, route.path), info = await stat(absolute);
      response.writeHead(200, { 'Content-Type': route.mime, 'Content-Length': info.size, 'Cache-Control': 'no-store' });
      if (request.method === 'HEAD') response.end();
      else createReadStream(absolute).pipe(response);
    } catch { response.writeHead(404); response.end('not found'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  report.server = { host: '127.0.0.1', allowedPaths: [...routes.keys()], missingFiles: 'HTTP 404, no SPA fallback' };
  const requests = [], requestRows = new Map(), pageErrors = [], consoleErrors = [];
  let browser, context, page;
  try {
    const { chromium } = await import('playwright');
    report.launchOptions = executablePath ? { executablePath } : {};
    browser = await chromium.launch(report.launchOptions);
    report.browserVersion = browser.version();
    report.profile = { viewport: { width: 1000, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' };
    context = await browser.newContext(report.profile);
    await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort('blockedbyclient'));
    page = await context.newPage();
    page.on('request', request => {
      const row = { url: request.url(), type: request.resourceType() };
      requests.push(row); requestRows.set(request, row);
    });
    page.on('response', response => { const row = requestRows.get(response.request()); if (row) row.status = response.status(); });
    page.on('requestfinished', request => { const row = requestRows.get(request); if (row) row.complete = true; });
    page.on('requestfailed', request => { const row = requestRows.get(request); if (row) row.failure = request.failure()?.errorText; });
    page.on('pageerror', error => pageErrors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    await page.goto(`${origin}/${demoPath}`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.body.dataset.state === 'ready', { }, { timeout: 5000 });
    assert.equal((await page.locator('#play').innerText()).trim(), '播放一次', 'play button label');
    assert.equal((await page.locator('#replay').innerText()).trim(), '重播', 'replay button label');
    assert.equal(await page.locator('#reduced-motion').getAttribute('type'), 'checkbox', 'reduced-motion control');
    report.graphics = await page.evaluate(() => ({ renderer: 'Canvas2D', userAgent: navigator.userAgent,
      cssViewport: { width: innerWidth, height: innerHeight }, devicePixelRatio,
      prefersReducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }));
    report.ready = await page.evaluate(canvasSnapshot);
    assert.ok(Number.isInteger(report.ready.frame) && report.ready.frame >= 0 && report.ready.frame <= 15,
      'ready state displays a valid frame');
    validateCanvases(report.ready);
    await page.evaluate(() => {
      window.__coinVerification = [];
      new MutationObserver(() => window.__coinVerification.push({ atMs: performance.now(),
        state: document.body.dataset.state, frame: Number(document.body.dataset.frame) }))
        .observe(document.body, { attributes: true, attributeFilter: ['data-state', 'data-frame'] });
    });
    await page.locator('#play').click();
    await page.waitForFunction(() => document.body.dataset.state === 'playing' &&
      Number(document.body.dataset.frame) > 0 && Number(document.body.dataset.frame) < 15, {}, { polling: 'raf', timeout: 5000 });
    report.playing = await page.evaluate(canvasSnapshot);
    assert.equal(report.playing.state, 'playing', 'play displays an intermediate playing state');
    assert.ok(report.playing.frame > 0 && report.playing.frame < 15, 'play displays an intermediate frame');
    validateCanvases(report.playing);
    assert.notDeepEqual(report.playing.canvases.map(canvas => canvas.pixelHash), report.ready.canvases.map(canvas => canvas.pixelHash),
      'playback changes actual canvas pixels');
    await page.waitForFunction(() => document.body.dataset.state === 'finished' && document.body.dataset.frame === '15', {}, { timeout: 5000 });
    report.finished = await page.evaluate(canvasSnapshot);
    validateCanvases(report.finished);
    const finishedTimelineLength = await page.evaluate(() => window.__coinVerification.length);
    await page.waitForTimeout(1000);
    report.afterOneSecond = await page.evaluate(canvasSnapshot);
    assert.deepEqual(report.afterOneSecond, report.finished, 'one playback remains on frame 15 without looping for 1 second');
    assert.equal(await page.evaluate(() => window.__coinVerification.length), finishedTimelineLength,
      'finished playback produces no further frame/state updates for 1 second');
    await page.screenshot({ path: path.join(evidenceDirectory, 'demo.png'), fullPage: true });
    report.screenshot = 'shots/coin-reward/demo.png';
    await page.locator('#replay').click();
    await page.waitForFunction(() => document.body.dataset.state === 'playing' &&
      Number(document.body.dataset.frame) > 0 && Number(document.body.dataset.frame) < 15, {}, { polling: 'raf', timeout: 5000 });
    report.replaying = await page.evaluate(canvasSnapshot);
    assert.equal(report.replaying.state, 'playing', 'replay enters the playing state');
    assert.ok(report.replaying.frame > 0 && report.replaying.frame < 15, 'replay displays an intermediate frame');
    assert.notDeepEqual(report.replaying.canvases.map(canvas => canvas.pixelHash), report.finished.canvases.map(canvas => canvas.pixelHash),
      'replay changes actual canvas pixels from the final frame');
    await page.locator('#reduced-motion').check();
    report.reduced = await page.evaluate(canvasSnapshot);
    assert.equal(report.reduced.state, 'reduced', 'enabling reduced motion immediately cancels playback');
    assert.equal(report.reduced.frame, 15, 'reduced motion immediately displays the final frame');
    assert.deepEqual(report.reduced.canvases, report.finished.canvases, 'reduced motion draws the same final pixels');
    const reducedTimelineLength = await page.evaluate(() => window.__coinVerification.length);
    await page.waitForTimeout(1000);
    report.reducedAfterOneSecond = await page.evaluate(canvasSnapshot);
    assert.deepEqual(report.reducedAfterOneSecond, report.reduced, 'reduced motion remains still for 1 second');
    assert.equal(await page.evaluate(() => window.__coinVerification.length), reducedTimelineLength,
      'reduced motion produces no further frame/state updates for 1 second');
    report.timeline = await page.evaluate(() => window.__coinVerification);
    assert.deepEqual(requests.filter(row => row.failure || row.status === undefined || row.status >= 400 || !row.complete), [],
      'every demo resource finishes without failed requests or HTTP errors');
    assert.deepEqual(requests.filter(row => !row.url.startsWith(origin + '/') ||
      (!routes.has(new URL(row.url).pathname) && new URL(row.url).pathname !== '/favicon.ico')), [],
    'demo requests only its own HTML and the new coin atlas/WebP');
    assert.deepEqual(pageErrors, [], 'demo has no uncaught browser errors');
    assert.deepEqual(consoleErrors, [], 'demo has no console errors');
    report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL'; report.error = error.stack ?? String(error);
    if (page) {
      const file = `demo-failure-${runId}.png`;
      await page.screenshot({ path: path.join(evidenceDirectory, file), fullPage: true })
        .then(() => { report.failureScreenshot = `shots/coin-reward/${file}`; })
        .catch(captureError => { report.screenshotError = String(captureError); });
    }
    throw error;
  } finally {
    report.requests = requests; report.pageErrors = pageErrors; report.consoleErrors = consoleErrors;
    await context?.close();
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}

export async function run(args = process.argv.slice(2)) {
  const runId = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const report = { schemaVersion: 1, createdAt: new Date().toISOString(), status: 'IN_PROGRESS', node: process.version,
    scope: 'Only the new coin reward atlas, its Phaser hash metadata and isolated six-canvas demo; no game build or existing image reads.',
    static: { status: 'NOT_RUN' }, browser: { status: 'NOT_RUN' },
    limitations: ['Headless Linux Chromium Canvas2D checks do not establish physical-device performance or human visual approval.',
      'Static alpha checks establish transparent padding; color fringing and artistic quality require visual review.',
      '72/96 CSS pixels describe the entire sprite canvas; the visible coin silhouette is smaller.'] };
  await mkdir(evidenceDirectory, { recursive: true });
  try {
    let browserRequested = false, executablePath;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--browser' && !browserRequested) browserRequested = true;
      else if (args[i] === '--chromium-executable' && !executablePath && args[i + 1] && !args[i + 1].startsWith('-')) executablePath = args[++i];
      else throw new Error(`Unexpected or incomplete argument: ${args[i]}`);
    }
    assert.ok(!executablePath || browserRequested, '--chromium-executable requires --browser');
    await checkStatic(report.static);
    if (browserRequested) await checkBrowser(report.browser, executablePath, runId);
    report.status = 'PASS';
    console.log(`coin-reward: PASS (16 RGBA frames, ${report.static.budget.combinedBytes}/${byteBudget} atlas + JSON bytes; browser ${report.browser.status})`);
  } catch (error) {
    report.status = 'FAIL'; report.error = error.stack ?? String(error);
    if (report.static.status !== 'PASS') report.static.status = 'FAIL';
    console.error(`coin-reward: FAIL: ${error.message}`);
  } finally {
    report.completedAt = new Date().toISOString();
    const contents = JSON.stringify(report, null, 2) + '\n';
    if (report.status === 'FAIL') await writeFile(path.join(evidenceDirectory, `verify-failure-${runId}.json`), contents);
    await writeFile(path.join(evidenceDirectory, 'verify.json'), contents);
  }
  return report.status === 'PASS' ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await run();
