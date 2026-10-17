/** Real media/AudioContext; native new-run input plus explicitly labelled media faults. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {build, preview} from 'vite';
import {chromium} from 'playwright';
import {waitScene, openSelector, confirmHeroRoute, tapUI} from '../harness/ui.mjs';

const out = process.env.AUDIO_OUT ?? 'shots/audio-lifecycle/after';
const port = Number(process.env.AUDIO_PORT ?? 5607);
await mkdir(out, {recursive: true});
const files = ['src/audio/AudioEngine.ts', 'src/audio/mixPolicy.ts', 'src/main.ts', 'src/game/GameScene.ts',
  'src/game/ShopScene.ts', 'src/game/CharacterSelectScene.ts', 'tests/audio-lifecycle.browser.mjs'];
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async f => [f,
  createHash('sha256').update(await readFile(f)).digest('hex')])));
const report = {head: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(),
  sourceHashes: await hashes(), cases: [], heard: false,
  limits: ['Chromium software browser, not physical hardware or listening approval.',
    'Only observer export added in test build; actual new-run actions use native UI.',
    'Network abort/delay, rapid engine requests and near-end seek are labelled controlled cases.']};
const buildDir = path.resolve(out, 'build');
await build({mode: 'e2e', plugins: [{name: 'audio-lifecycle-observer', enforce: 'pre', transform(code, id) {
  if (id.split('?')[0].replaceAll('\\', '/').endsWith('/src/main.ts'))
    return {code: code + '\n;globalThis.__audioAudit = audio;', map: null};
}}], build: {outDir: buildDir, emptyOutDir: true}, logLevel: 'error'});
const server = await preview({build: {outDir: buildDir}, preview: {host: '127.0.0.1', port, strictPort: true}, logLevel: 'error'});
const executablePath = process.env.AUDIO_CHROMIUM ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({executablePath, args: ['--autoplay-policy=user-gesture-required']});
report.browser = browser.version();
const snapshot = p => p.evaluate(() => {
  const e = window.__audioAudit;
  return {scene: e.scene, context: e.context?.state, paused: e.musicElement?.paused ?? true,
    src: e.musicElement?.currentSrc || e.musicElement?.src, time: e.musicElement?.currentTime,
    title: e.musicTitle, failed: e.musicFailed, retryNeeded: e.musicRetryNeeded, slots: e.musicSlots?.length,
    music: e.getVolume('music'), sfx: e.getVolume('sfx'), voices: e.voices.size};
});
const playing = p => p.waitForFunction(() => {
  const e = window.__audioAudit;
  return e?.musicElement && !e.musicElement.paused && e.musicElement.currentTime > .05;
}, null, {timeout: 6000});
const choose = async (p, touch = false, hero = 'laohuan') => {
  await openSelector(p, touch);
  await tapUI(p, 'character-select', 'character/' + hero, touch);
  await confirmHeroRoute(p, touch, 'group');
  const confirm = p.getByRole('button', {name: '确认开始新局', exact: true});
  if (await confirm.count()) { if (touch) await confirm.tap(); else await confirm.click(); }
  await waitScene(p, 'shop');
  await p.waitForFunction(() => window.__harness.game.scene.getScene('shop').ready);
};
const restart = async (p, touch = false) => {
  const tap = locator => touch ? locator.tap() : locator.click();
  await tap(p.locator('.run-menu-toggle'));
  const details = p.locator('details').filter({has: p.locator('summary', {hasText: '进度与存档'})});
  if (!await details.evaluate(e => e.open)) await tap(details.locator('summary'));
  p.once('dialog', d => d.accept());
  await tap(p.getByRole('button', {name: '开始新局', exact: true}));
  await choose(p, touch, 'amo');
};
const table = async (p, touch = false) => {
  await tapUI(p, 'shop', 'action/start-stage', touch);
  await waitScene(p, 'game');
  const enter = p.locator('dialog.blind-select-dialog[open]').getByRole('button', {name: /^进入第/});
  if (touch) await enter.tap(); else await enter.click();
  await p.waitForFunction(() => {const s = window.__harness.game.scene.getScene('game'); return s.ready && !s.playing && s.cardViews.length > 0 && s.cardViews.every(v => !v.dealing);});
};
async function run(name, body, {touch = false} = {}) {
  const ctx = await browser.newContext({viewport: touch ? {width: 390, height: 740} : {width: 1366, height: 900}, hasTouch: touch});
  const p = await ctx.newPage(), row = {name, errors: [], events: []};
  p.setDefaultTimeout(10000);
  report.cases.push(row);
  p.on('pageerror', e => row.errors.push(String(e)));
  await p.addInitScript(() => {
    window.__mediaEvents = [];
    const Native = window.Audio;
    window.Audio = function(...args) {
      const e = new Native(...args);
      for (const name of ['playing', 'pause', 'ended', 'error', 'abort', 'loadstart'])
        e.addEventListener(name, () => window.__mediaEvents.push({name, src: e.currentSrc || e.src, at: performance.now()}));
      return e;
    };
    window.Audio.prototype = Native.prototype;
  });
  try {
    await body(p, row);
    assert.deepEqual(row.errors, []);
    row.status = 'PASS';
  } catch (e) { row.status = 'FAIL'; row.error = String(e.stack); process.exitCode = 1; }
  row.final = await snapshot(p).catch(() => null);
  row.events = await p.evaluate(() => window.__mediaEvents).catch(() => []);
  await p.screenshot({path: `${out}/${name}.png`, scale: 'css'}).catch(() => {});
  console.log(row.status, name, row.error?.split('\n')[0] ?? '');
  await ctx.close();
}
const goto = p => p.goto(`http://127.0.0.1:${port}/?harness=1&seed=audio-lifecycle`);
try {
  for (const touch of [false, true]) await run(`native-restart-${touch ? '390' : '1366'}`, async (p, row) => {
    await goto(p); await waitScene(p, 'title'); await choose(p, touch); await playing(p); await table(p, touch); await playing(p);
    row.before = await snapshot(p);
    const oldId = await p.evaluate(() => window.__harness.game.registry.get('runController').state.runId);
    await restart(p, touch); await playing(p); await table(p, touch); await playing(p);
    row.after = await snapshot(p);
    row.newRun = await p.evaluate(() => window.__harness.game.registry.get('runController').state.runId);
    assert.notEqual(row.newRun, oldId);
    await p.waitForFunction(() => window.__audioAudit.scoreSamples.size > 10);
    await p.evaluate(() => {
      const e = window.__audioAudit, original = e.scoreImpact;
      window.__newRunCues = [];
      e.scoreImpact = function(...args) {
        const voices = new Set(this.voices), result = original.apply(this, args);
        window.__newRunCues.push({eventId: args[1], kind: args[2], added: [...this.voices].filter(v => !voices.has(v)).length});
        return result;
      };
    });
    const hand = await p.evaluate(() => {const s = window.__harness.game.registry.get('runController').state; return {seq: s.commandSeq, ids: s.handOrder.slice(0, 5)};});
    for (const id of hand.ids) await tapUI(p, 'game', 'card/' + id, touch);
    await tapUI(p, 'game', 'action/play', touch);
    await p.waitForFunction(seq => document.querySelector('.hero-play-reminder[open]') || window.__harness.game.registry.get('runController').state.commandSeq > seq, hand.seq);
    const reminder = p.getByRole('button', {name: '继续出牌', exact: true});
    if (await reminder.count()) { if (touch) await reminder.tap(); else await reminder.click(); }
    await p.waitForFunction(seq => window.__harness.game.registry.get('runController').state.commandSeq === seq + 1, hand.seq);
    await p.waitForFunction(() => {const s = window.__harness.game.scene.getScene('game'); return !s.playing && !s.presentation;}, null, {timeout: 30000});
    row.actualNewRunCues = await p.evaluate(() => window.__newRunCues);
    assert.ok(row.actualNewRunCues.some(e => e.added > 0));
  }, {touch});

  await run('slow-first-track-native-start', async (p, row) => {
    row.fault = 'Hold menu MP3 response while native hero/route confirmation enters shop; release after shop entry.';
    let release;
    const held = new Promise(resolve => {release = resolve;});
    await p.route('**/menu-chinese-yangguan.mp3', async route => {await held; await route.continue().catch(() => {});});
    try {
      await goto(p); await waitScene(p, 'title');
      await p.keyboard.press('Shift');
      await p.waitForFunction(() => !!window.__audioAudit.musicElement);
      await choose(p); release(); await playing(p);
      assert.match((await snapshot(p)).src, /serenade-schubert/);
    } finally {release();}
  });

  await run('media-error-next-scene', async (p, row) => {
    row.fault = 'Abort menu recording request, then enter a different scene through native inputs.';
    await p.route('**/menu-chinese-yangguan.mp3', route => route.abort('failed'));
    await goto(p); await waitScene(p, 'title'); await p.keyboard.press('Shift');
    await p.waitForFunction(() => window.__audioAudit.musicFailed || window.__audioAudit.musicRetryNeeded);
    row.failed = await snapshot(p); await choose(p); await playing(p);
    assert.match((await snapshot(p)).src, /serenade-schubert/);
  });

  await run('media-error-same-scene-gesture', async (p, row) => {
    row.fault = 'Abort menu requests until the engine reports playback failure, then remove fault and retry with a real keyboard gesture.';
    let attempts = 0;
    let fail = true;
    await p.route('**/menu-chinese-yangguan.mp3', route => {attempts++; return fail ? route.abort('failed') : route.continue();});
    await goto(p); await waitScene(p, 'title'); await p.keyboard.press('Shift');
    await p.waitForFunction(() => window.__audioAudit.musicFailed || window.__audioAudit.musicRetryNeeded);
    row.failed = await snapshot(p); const before = attempts; fail = false;
    await p.keyboard.press('Shift'); await playing(p);
    row.attempts = attempts; row.retryRequests = attempts - before; assert.ok(row.retryRequests > 0);
  });

  await run('slow-next-track-keeps-old-performance', async (p, row) => {
    row.fault = 'Hold shop MP3 while native selection enters shop; old menu performance must keep advancing.';
    let release;
    const held = new Promise(resolve => {release = resolve;});
    await p.route('**/serenade-schubert-216755.mp3', async route => {await held; await route.continue().catch(() => {});});
    try {
      await goto(p); await waitScene(p, 'title'); await p.keyboard.press('Shift'); await playing(p);
      row.before = await p.evaluate(() => {window.__oldMusic = window.__audioAudit.musicElement; return window.__oldMusic.currentTime;});
      await choose(p);
      row.during = await p.evaluate(() => ({src: window.__oldMusic.src, paused: window.__oldMusic.paused, time: window.__oldMusic.currentTime}));
      assert.match(row.during.src, /menu-chinese-yangguan/); assert.equal(row.during.paused, false); assert.ok(row.during.time > row.before);
      release(); await playing(p); assert.match((await snapshot(p)).src, /serenade-schubert/);
    } finally {release();}
  });

  await run('playlist-natural-ended', async (p, row) => {
    await goto(p); await waitScene(p, 'title'); await choose(p); await playing(p); await table(p); await playing(p);
    row.before = await snapshot(p);
    row.fault = 'Seek actual table recording to 80ms before its natural end; no synthetic ended event.';
    await p.evaluate(() => {const e = window.__audioAudit.musicElement; e.currentTime = e.duration - .08;});
    await p.waitForFunction(() => window.__audioAudit.musicElement?.src.includes('table-tango') && !window.__audioAudit.musicElement.paused, null, {timeout: 6000});
    row.after = await snapshot(p);
    assert.ok(await p.evaluate(() => window.__mediaEvents.some(e => e.name === 'ended')));
  });

  await run('rapid-switch-gates-and-output', async (p, row) => {
    await goto(p); await waitScene(p, 'title'); await choose(p); await playing(p);
    row.fault = 'Controlled rapid service requests (not native scene coverage); real media, context and buses.';
    await p.evaluate(() => {
      const e = window.__audioAudit;
      for (let i = 0; i < 30; i++) e.setScene(['menu', 'table', 'shop', 'boss'][i % 4]);
      e.setScene('table');
    });
    await playing(p); await p.waitForTimeout(350);
    row.afterSwitches = await snapshot(p);
    assert.match(row.afterSwitches.src, /table-chinese-zuiyu/);
    assert.ok(row.afterSwitches.slots <= 2, 'at most two reusable music elements');
    await p.evaluate(() => {
      const e = window.__audioAudit;
      const a = e.context.createAnalyser(); a.fftSize = 2048; e.gains.music.connect(a); window.__musicAnalyser = a;
      e.setVolume('music', .07); e.setVolume('sfx', 1);
    });
    row.output = await p.evaluate(async () => {
      let peak = 0;
      for (let i = 0; i < 12; i++) {
        const a = window.__musicAnalyser, data = new Float32Array(a.fftSize); a.getFloatTimeDomainData(data);
        peak = Math.max(peak, ...data.map(Math.abs)); await new Promise(r => setTimeout(r, 50));
      }
      return {peak, music: window.__audioAudit.getVolume('music'), sfx: window.__audioAudit.getVolume('sfx')};
    });
    assert.ok(row.output.peak > 0); assert.equal(row.output.music, .07); assert.equal(row.output.sfx, 1);
    await p.evaluate(() => {const e = window.__audioAudit; e.setVolume('music', 0);});
    assert.equal((await snapshot(p)).paused, true);
    await p.evaluate(() => window.__audioAudit.setVolume('music', .3)); await playing(p);
    await p.evaluate(() => {Object.defineProperty(document, 'hidden', {configurable: true, value: true}); document.dispatchEvent(new Event('visibilitychange'));});
    await p.waitForFunction(() => window.__audioAudit.context.state === 'suspended');
    assert.equal((await snapshot(p)).paused, true);
    await p.evaluate(() => {delete document.hidden; document.dispatchEvent(new Event('visibilitychange'));}); await playing(p);
  });
} finally {
  report.sourceUnchanged = JSON.stringify(await hashes()) === JSON.stringify(report.sourceHashes);
  report.status = report.cases.every(c => c.status === 'PASS') && report.sourceUnchanged ? 'PASS' : 'FAIL';
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close(); await server.close();
}
