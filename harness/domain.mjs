/** R01: real user inputs and an independent headless replay of the observed UI journal. */
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(root, process.env.DOMAIN_EVIDENCE_DIR || 'shots/domain');
const port = 5202;
const base = `http://localhost:${port}/?harness=1`;
await mkdir(output, { recursive: true });
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const report = { testedCommit: git('rev-parse', 'HEAD'), dirtyState: git('status', '--porcelain=v1'), rulesVersion: 'r1', runs: [], limitations: ['Automated headless browser and emulated touchscreen, not physical phones/human acceptance.', 'R04 persistence/cancellation and R05 layout remain outside this probe.'] };
const ssr = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
const domain = await ssr.ssrLoadModule('/src/domain/run.ts');
const bot = await ssr.ssrLoadModule('/src/testing/bot.ts');
const simulation = Array.from({ length: 10 }, (_, i) => bot.simulateRun(`balance-${i + 1}`, 'erxiang'));
const winner = simulation.find(result => result.state.phase === 'run-won');
assert.ok(winner, 'a fixed r1 three-stage fixture wins with public-information commands');
report.threeStageDomain = { seed: winner.state.seed, characterId: winner.state.characterId, stateHash: domain.stateHash(winner.state), finalState: winner.state, commands: winner.journal };

async function click(page, touch, x, y) {
  const point = await page.evaluate(({ x, y }) => {
    const rect = document.querySelector('canvas').getBoundingClientRect();
    return { x: rect.left + x * rect.width / 1280, y: rect.top + y * rect.height / 720 };
  }, { x, y });
  if (touch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
}

const activeScene = (page, key) => page.waitForFunction(key => window.__harness?.game.scene.getScene(key)?.scene.isActive(), key);
const read = page => page.evaluate(async () => {
  const { publicView } = await import('/src/testing/bot.ts');
  const controller = window.__harness.game.registry.get('runController');
  return { state: controller.state, journal: controller.journal, view: publicView(controller.state) };
});

async function runUi(browser, name, viewport) {
  const touch = name === 'mobile';
  const context = await browser.newContext({ viewport, hasTouch: touch });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  const result = { name, viewport, input: touch ? 'touchscreen.tap' : 'mouse.click', errors, checkpoints: [] };
  report.runs.push(result);
  let doubledPlay = false;
  try {
    await page.goto(`${base}&seed=${encodeURIComponent(winner.state.seed)}`);
    await activeScene(page, 'character-select');
    await click(page, touch, 248, 532); // 二响: fourth visible character card.
    await activeScene(page, 'shop');
    for (let steps = 0; steps < 100; steps++) {
      const observed = await read(page);
      result.checkpoints.push({ seq: observed.state.commandSeq, phase: observed.state.phase, stateHash: domain.stateHash(observed.state) });
      const action = bot.chooseAction(observed.view);
      if (!action) {
        assert.equal(observed.state.phase, 'run-won');
        result.commands = observed.journal;
        result.finalState = observed.state;
        let replay = domain.createRun({ seed: observed.state.seed, characterId: observed.state.characterId, runId: observed.state.runId });
        result.replay = [];
        for (const command of observed.journal) {
          const response = domain.applyCommand(replay, command);
          assert.ok(response.ok, `headless accepts UI command ${command.commandId}`);
          replay = response.state;
          result.replay.push({ seq: replay.commandSeq, stateHash: domain.stateHash(replay) });
        }
        assert.deepEqual(replay, observed.state);
        result.stateHash = domain.stateHash(replay);
        assert.equal(observed.journal.filter(command => command.action.type === 'EnterStage').length, 3);
        await page.screenshot({ path: path.join(output, `${name}-three-stage.png`) });
        result.status = 'PASS';
        console.log(`${name}: three stages + UI journal replay PASS (${result.stateHash})`);
        return;
      }
      switch (action.type) {
        case 'BuyOffer': {
          const index = observed.view.offers.findIndex(offer => offer.offerId === action.offerId);
          assert.ok(index >= 0);
          await click(page, touch, 167 + index * 274, 445);
          break;
        }
        case 'LeaveShop':
          await click(page, touch, 1108, 624);
          await activeScene(page, 'game'); // EnterStage is submitted by GameScene's adapter.
          break;
        case 'OpenShop':
          await activeScene(page, 'intermission');
          await page.screenshot({ path: path.join(output, `${name}-stage-${observed.state.stageIndex}-clear.png`) });
          await click(page, touch, 640, 570);
          await activeScene(page, 'shop');
          break;
        case 'PlayHand': {
          await activeScene(page, 'game');
          for (const id of action.selectedIds) {
            const point = await page.evaluate(id => {
              const scene = window.__harness.game.scene.getScene('game');
              const view = scene.cardViews.find(view => view.card.id === id);
              return { x: view.container.x, y: view.container.y };
            }, id);
            await click(page, touch, point.x, point.y);
          }
          await click(page, touch, 640, 650);
          if (!doubledPlay) {
            await click(page, touch, 640, 650); // Real rapid second input; the scene lock protects one intent.
            doubledPlay = true;
          }
          const after = await read(page);
          assert.equal(after.state.commandSeq, observed.state.commandSeq + 1, 'one hand command per displayed play intent');
          await page.waitForFunction(() => {
            const game = window.__harness.game;
            const scene = game.scene.getScene('game');
            return game.scene.getScene('intermission').scene.isActive() || (scene.scene.isActive() && !scene.playing);
          });
          break;
        }
        default:
          throw new Error(`UI flow did not settle at expected boundary: ${action.type}`);
      }
      const after = await read(page);
      assert.ok(after.state.commandSeq > observed.state.commandSeq, 'input submitted a domain command');
    }
    throw new Error('UI fixture exceeded bounded r1 length');
  } finally {
    assert.deepEqual(errors, [], `${name}: browser errors`);
    await context.close();
  }
}

const server = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--port', String(port), '--strictPort'], { cwd: root, stdio: 'ignore', windowsHide: true });
let browser;
try {
  const deadline = Date.now() + 30000;
  while (true) {
    try { if ((await fetch(base)).ok) break; } catch {}
    if (Date.now() > deadline) throw new Error('domain browser server timeout');
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  browser = await chromium.launch();
  report.browser = `Playwright Chromium ${browser.version()}`;
  await runUi(browser, 'desktop', { width: 1280, height: 800 });
  await runUi(browser, 'mobile', { width: 390, height: 844 });
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.error = String(error); process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
  await ssr.close();
  await writeFile(path.join(output, 'domain-replay.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`domain browser/replay: ${report.status}`);
}
