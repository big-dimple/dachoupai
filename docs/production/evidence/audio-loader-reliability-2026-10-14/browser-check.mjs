import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';

const root = new URL('.', import.meta.url);
const origin = process.env.AUDIO_TEST_ORIGIN || 'http://127.0.0.1:4173';
const browser = await chromium.launch({executablePath: process.env.SMOKE_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
const report = {browser: await browser.version(), origin, heard: false, physicalDevice: false, checks: []};
try {
  const page = await browser.newPage();
  await page.route('**/audio-loader-fixture', route => route.fulfill({contentType: 'text/html', body: '<button id="unlock">解锁录音</button>'}));
  await page.goto(`${origin}/audio-loader-fixture`);
  await page.evaluate(async () => {
    const {AudioEngine} = await import('/src/audio/AudioEngine.ts');
    const {FOLEY_SAMPLES} = await import('/src/audio/foley.ts');
    window.samples = [...FOLEY_SAMPLES, {name: 'cloth2', runtimePath: 'assets/audio/score-impact/cloth2.ogg'}];
    window.engine = new AudioEngine(); window.engine.musicMuted = true;
    window.requestLog = []; window.active = 0; window.maxActive = 0;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      window.active++; window.maxActive = Math.max(window.maxActive, window.active);
      window.requestLog.push({path: new URL(args[0]).pathname, at: performance.now()});
      try { return await nativeFetch(...args); } finally { window.active--; }
    };
    document.querySelector('#unlock').addEventListener('pointerdown', () => { window.unlockTask = window.engine.unlock(); });
  });
  const samples = await page.evaluate(() => window.samples);
  const counts = new Map();
  await page.route('**/assets/audio/**/*.ogg', async route => {
    const path = new URL(route.request().url()).pathname.slice(1);
    const count = (counts.get(path) || 0) + 1; counts.set(path, count);
    if (path === samples[1].runtimePath) return; // Never respond; the real fetch must abort.
    if (path === samples[0].runtimePath && count === 1) return route.abort('failed');
    if (path === samples[2].runtimePath) return route.fulfill({status: 404, body: 'missing'});
    if (path === samples[3].runtimePath && count === 1) return route.fulfill({body: 'invalid ogg', contentType: 'audio/ogg'});
    return route.continue();
  });
  assert.equal(await page.evaluate(() => window.requestLog.length), 0);
  assert.equal(await page.evaluate(() => !!window.engine.context), false);
  await page.click('#unlock');
  await page.evaluate(() => window.unlockTask);
  assert.equal(await page.evaluate(() => window.engine.context.state), 'running');
  await page.waitForFunction(() => window.engine.scoreSamples.size >= window.samples.length - 2, null, {timeout: 25000});
  await page.waitForFunction(() => !window.engine.scoreSampleTask, null, {timeout: 25000});
  const transport = await page.evaluate(async () => {
    const before = window.requestLog.length;
    await Promise.all([window.engine.unlock(), window.engine.unlock(), window.engine.unlock()]);
    return {cached: window.engine.scoreSamples.size, bodies: window.engine.sampleBodies.size,
      requests: window.requestLog.length, before, maxActive: window.maxActive,
      contextState: window.engine.context.state, requestLog: window.requestLog};
  });
  assert.equal(transport.cached, samples.length - 2);
  assert.equal(transport.bodies, transport.cached);
  assert.equal(transport.requests, transport.before);
  assert.ok(transport.maxActive <= 3);
  assert.equal(counts.get(samples[0].runtimePath), 2);
  assert.equal(counts.get(samples[1].runtimePath), 3);
  assert.equal(counts.get(samples[2].runtimePath), 3);
  assert.equal(counts.get(samples[3].runtimePath), 2);
  assert.ok([...counts.values()].every(n => n <= 3));
  report.checks.push({name: 'real pointer unlock / abort / transient network+decode / permanent 404 / cache', status: 'PASS',
    ...transport, attempts: Object.fromEntries(counts)});
  await page.close();

  const latePage = await browser.newPage();
  await latePage.route('**/audio-loader-fixture', route => route.fulfill({contentType: 'text/html', body: '<button id="unlock">解锁录音</button>'}));
  await latePage.goto(`${origin}/audio-loader-fixture`);
  await latePage.evaluate(async () => {
    const {AudioEngine} = await import('/src/audio/AudioEngine.ts');
    const {FOLEY_SAMPLES} = await import('/src/audio/foley.ts');
    window.name = FOLEY_SAMPLES[0].name;
    window.engine = new AudioEngine(); window.engine.musicMuted = true;
    const nativeFetch = window.fetch.bind(window);
    window.requests = 0;
    window.fetch = async (...args) => {
      window.requests++;
      if (window.requests === 1) return new Promise(resolve => {
        // Deliberately ignore AbortSignal and deliver a valid late response.
        setTimeout(async () => { resolve(await nativeFetch(args[0])); window.lateResolved = true; }, 6000);
      });
      return nativeFetch(...args);
    };
    document.querySelector('#unlock').addEventListener('pointerdown', () => { window.unlockTask = window.engine.unlock(); });
  });
  await latePage.click('#unlock');
  await latePage.evaluate(async () => {
    await window.unlockTask;
    let sources = 0;
    const nativeSource = window.engine.context.createBufferSource.bind(window.engine.context);
    window.engine.context.createBufferSource = () => { sources++; return nativeSource(); };
    const show = {};
    if (window.engine.scoreSamples.has(window.name)) throw new Error('late fixture clip already loaded');
    window.engine.scoreImpact(show, 'missing', 'flight');
    await window.engine.scoreSampleTask;
    window.cacheIdentity = window.engine.scoreSamples.get(window.name);
    window.bodyIdentity = window.engine.sampleBodies.get(window.name);
    window.engine.scoreImpact(show, 'missing', 'flight');
    if (sources !== 0) throw new Error('missed cue replayed');
    window.engine.muted = true; window.engine.scoreImpact(show, 'muted', 'flight');
    window.engine.muted = false; await window.engine.unlock();
    window.engine.setSuspended(true); window.engine.scoreImpact(show, 'background', 'flight');
    window.engine.setSuspended(false); await window.engine.unlock();
    for (const id of ['missing', 'muted', 'background']) window.engine.scoreImpact(show, id, 'flight');
    if (sources !== 0) throw new Error('muted/background cue replayed');
    window.engine.scoreImpact(show, 'fresh', 'flight');
    if (sources !== 1) throw new Error('fresh recorded cue unavailable');
    window.engine.setSuspended(true);
    if (window.engine.voices.size !== 0) throw new Error('background did not cancel voice');
    window.sources = sources;
  });
  await latePage.waitForFunction(() => window.lateResolved, null, {timeout: 10000});
  const late = await latePage.evaluate(() => ({sameBuffer: window.engine.scoreSamples.get(window.name) === window.cacheIdentity,
    sameBody: window.engine.sampleBodies.get(window.name) === window.bodyIdentity,
    cached: window.engine.scoreSamples.size, requests: window.requests, freshSources: window.sources, voices: window.engine.voices.size}));
  assert.equal(late.sameBuffer, true); assert.equal(late.sameBody, true); assert.equal(late.cached, 23);
  assert.equal(late.requests, 24); assert.equal(late.freshSources, 1); assert.equal(late.voices, 0);
  report.checks.push({name: 'late success ignored / mute+background / missed cues consumed / fresh recording plays', status: 'PASS', ...late});
  await latePage.close();
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.error = String(error?.stack || error); process.exitCode = 1;
} finally {
  await browser.close();
  await fs.writeFile(new URL('browser-report.json', root), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({status: report.status, checks: report.checks.map(c => ({name: c.name, status: c.status})), error: report.error}));
}
