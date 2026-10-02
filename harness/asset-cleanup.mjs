/** Short, real input path against an existing e2e build; no builds or source writes.
 * node harness/asset-cleanup.mjs --build-dir dist --chromium-executable /usr/bin/chromium
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { chooseCharacter, tapUI, waitScene } from './ui.mjs';
import { isRemovedPreview, verifyPublication } from '../tools/blender/verify_publication.mjs';

const option = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
};
const root = process.cwd(), buildDir = option('--build-dir'), output = option('--output', 'shots/asset-cleanup');
assert.ok(buildDir, 'Pass --build-dir for an already built --mode e2e bundle. This check never builds.');
const absolute = path.resolve(root, buildDir);
const executablePath = option('--chromium-executable');
const launchOptions = { ...(executablePath ? { executablePath } : {}), args: ['--disable-gpu', '--disable-software-rasterizer'] };
await mkdir(output, { recursive: true });
const publication = await verifyPublication(root, buildDir);
assert.deepEqual(publication.errors, [], 'static publication checks must pass before browser checks');
const report = {
  testedHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  buildInfo: JSON.parse(await readFile(path.join(absolute, 'build-info.json'), 'utf8')),
  publication, node: process.version, launchOptions, checks: [],
  scope: 'Title → character selection → confirm → shop → enter stage; no purchase/details/long run.',
  server: { mount: '/dachoupai/', missingFiles: 'HTTP 404, no SPA fallback', cacheControl: 'no-store' },
  limitations: ['Linux headless Chromium; physical devices, listening, WebGL performance and visual acceptance NOT_RUN.',
    'Canvas requested with GPU and software rasterizer disabled; actual renderer is recorded per profile.',
    'Long music streams need successful response headers, not transfer completion; all other observed resources must finish.',
    'Only requests from this bounded route are runtime evidence; literal source scanning is recorded separately.'],
};
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!pathname.startsWith('/dachoupai/')) { response.writeHead(404); response.end('not found'); return; }
    let relative = pathname.slice('/dachoupai/'.length);
    if (!relative) relative = 'index.html';
    const full = path.resolve(absolute, relative), info = await stat(full).catch(() => null);
    if (!full.startsWith(absolute + path.sep) || !info?.isFile()) { response.writeHead(404); response.end('not found'); return; }
    response.writeHead(200, { 'Content-Type': mime[path.extname(full)] || 'application/octet-stream',
      'Content-Length': info.size, 'Cache-Control': 'no-store' });
    createReadStream(full).pipe(response);
  } catch { response.writeHead(400); response.end('bad request'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch(launchOptions);
  report.browser = browser.version();
  for (const profile of [
    { name: 'desktop', viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, hasTouch: false },
    { name: 'mobile', viewport: { width: 412, height: 820 }, deviceScaleFactor: 3, hasTouch: true },
  ]) {
    const { name, ...options } = profile, context = await browser.newContext(options), page = await context.newPage();
    const requests = new Map(), errors = [], warnings = [];
    let lastRequestEvent = Date.now();
    const check = { profile, status: 'IN_PROGRESS' }; report.checks.push(check);
    page.on('request', request => {
      if (request.url().startsWith(origin + '/')) {
        requests.set(request, { path: new URL(request.url()).pathname, type: request.resourceType() });
        lastRequestEvent = Date.now();
      }
    });
    page.on('response', response => { const row = requests.get(response.request()); if (row) row.status = response.status(); });
    page.on('requestfinished', request => { const row = requests.get(request); if (row) { row.complete = true; lastRequestEvent = Date.now(); } });
    page.on('requestfailed', request => { const row = requests.get(request); if (row) row.failure = request.failure()?.errorText; });
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
    try {
      await page.goto(origin + '/dachoupai/?harness=1&seed=p00-core-ui', { waitUntil: 'domcontentloaded' });
      await waitScene(page, 'title');
      await chooseCharacter(page, 'amo', profile.hasTouch);
      await tapUI(page, 'shop', 'action/start-stage', profile.hasTouch);
      await waitScene(page, 'game');
      await page.waitForFunction(() => {
        const scene = window.__harness.game.scene.getScene('game');
        return scene.cardViews.length > 0 && !scene.playing && scene.cardViews.every(card => !card.back?.visible && card.container.alpha === 1);
      });
      check.graphics = await page.evaluate(() => {
        const game = window.__harness.game, gl = game.renderer.gl, debug = gl?.getExtension('WEBGL_debug_renderer_info');
        return { renderer: gl ? 'WebGL' : 'Canvas2D', gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
          framebuffer: { width: game.canvas.width, height: game.canvas.height }, userAgent: navigator.userAgent };
      });
      check.screenshot = `${name}-stage.png`;
      await page.screenshot({ path: path.join(output, check.screenshot) });
      // Music is streamed after the first input; waiting for networkidle wrongly waits for the whole recording.
      // Finish screenshots before observing settled requests, including any deferred image upgrade.
      const deadline = Date.now() + 5000;
      const pending = () => [...requests.values()].filter(row => !row.failure &&
        (row.status === undefined || (row.type !== 'media' && !row.complete)));
      while ((pending().length || Date.now() - lastRequestEvent < 500) && Date.now() < deadline) await delay(50);
      assert.deepEqual(pending(), [], 'all non-media resource requests finish; streamed music has response headers');
      check.requests = [...requests.values()];
      check.httpErrors = check.requests.filter(row => row.status >= 400 && !row.path.endsWith('/favicon.ico'));
      check.failedRequests = check.requests.filter(row => (row.failure || row.status === undefined) && !row.path.endsWith('/favicon.ico'));
      check.removedPreviewRequests = check.requests.filter(row => isRemovedPreview(row.path));
      check.glbRequests = check.requests.filter(row => /\.glb$/i.test(row.path));
      assert.deepEqual(check.httpErrors, [], 'actual runtime resources resolve without 404 or other HTTP errors');
      assert.deepEqual(check.failedRequests, [], 'no failed asset requests or missing response status');
      assert.deepEqual(check.removedPreviewRequests, [], 'removed P0 review previews are never requested');
      assert.deepEqual(check.glbRequests, [], 'offline GLB is never requested');
      assert.deepEqual(errors, [], 'no browser execution errors');
      check.status = 'PASS';
      console.log(`${name}: PASS (${check.graphics.renderer}, ${check.requests.length} requests, no missing or removed assets)`);
    } catch (error) {
      check.status = 'FAIL'; check.error = String(error); throw error;
    } finally {
      check.requests = [...requests.values()].map(row => ({ ...row })); check.pageErrors = errors; check.warnings = warnings;
      // End the observation before closing the context cancels its long audio stream.
      for (const event of ['request', 'response', 'requestfinished', 'requestfailed']) page.removeAllListeners(event);
      await context.close();
    }
  }
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.error = String(error); throw error;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  await writeFile(path.join(output, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
}
