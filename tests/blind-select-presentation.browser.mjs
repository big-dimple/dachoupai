/** Finite chapter view audit: ordinary inputs first; labelled visual fixtures only for Boss coverage. */
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build, preview} from 'vite';
import {chromium} from 'playwright';
import {chooseCharacter, tapUI, waitScene} from '../harness/ui.mjs';

const out = 'shots/chapter-confrontation';
await mkdir(out, {recursive: true});
const report = {base: 'f81724b5', head: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(),
  sourceHashes: Object.fromEntries(await Promise.all(['src/game/BlindSelectPresentation.ts', 'src/game/BlindSelectPresentation.css', 'tests/blind-select-presentation.browser.mjs'].map(async file =>
    [file, createHash('sha256').update(await readFile(file)).digest('hex')]))),
  cases: [], screenshots: [], physicalDevice: 'NOT_RUN', humanAcceptance: 'NOT_RUN'};
const buildDir = `${out}/build`;
await build({mode: 'e2e', logLevel: 'error', build: {outDir: buildDir, emptyOutDir: true},
  plugins: [{name: 'chapter-visual-fixtures', enforce: 'pre', transform(code, id) {
    if (!id.replaceAll('\\', '/').endsWith('/src/main.ts')) return;
    return {code: code + `
      import {presentStageSelection as fixtureView} from './game/BlindSelectPresentation';
      import {DetailDialog as FixtureDialog} from './game/DetailDialog';
      import {createRun as fixtureRun} from './domain/run';
      window.__chapterVisualFixture = ({index, boss}) => {
        const run = fixtureRun({seed: 'chapter-display-fixture', runId: 'view-only/chapter', characterId: 'erxiang', rulesVersion: 'r2'});
        run.stageIndex = index;run.phase = 'stage-ready';
        run.boss = {definitionId: boss, disabledSuit: boss === 'B03' ? 'spades' : null};
        window.__chapterFixtureDialog?.close();window.__chapterFixtureDialog = new FixtureDialog();
        void fixtureView(window.__chapterFixtureDialog, run);
      };`, map: null};
  }}]});
const server = await preview({logLevel: 'error', build: {outDir: buildDir}, preview: {host: '127.0.0.1', port: 5681, strictPort: true}});
const browser = await chromium.launch();
report.browser = browser.version();
const context = await browser.newContext({viewport: {width: 1366, height: 900}, hasTouch: true});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.game.registry.get('runController').state);
const modal = () => page.locator('dialog.blind-select-dialog[open]');
const shot = async name => {
  await page.screenshot({path: `${out}/${name}.png`, scale: 'css'});
  report.screenshots.push(`${out}/${name}.png`);
};
const bounds = async () => {
  const result = await modal().evaluate(d => {
    const content = d.querySelector('.dialog-content');
    const b = d.getBoundingClientRect();
    const target = d.querySelector('.is-active .blind-target-value').getBoundingClientRect();
    const viewport = content.getBoundingClientRect();
    const heading = d.querySelector('.dialog-header').getBoundingClientRect();
    return {overflow: content.scrollWidth > content.clientWidth + 1, width: b.width, x: b.x,
      headerVisible: heading.top >= b.top && heading.bottom <= viewport.top + 1,
      currentTargetVisible: target.top >= viewport.top && target.bottom <= viewport.bottom,
      buttons: [...d.querySelectorAll('.dialog-actions button')].map(button => {
        const r = button.getBoundingClientRect();
        return {label: button.textContent, width: r.width, height: r.height, visible: r.top >= 0 && r.bottom <= innerHeight};
      })};
  });
  assert.equal(result.overflow, false, 'chapter has no horizontal content overflow');
  assert.ok(result.x >= 0, 'dialog stays within viewport');
  assert.ok(result.headerVisible, 'initial focus never scrolls the chapter heading out of its shell');
  assert.ok(result.currentTargetVisible, 'the current target is readable in the initial scroll position');
  assert.ok(result.buttons.every(b => b.height >= 44 && b.width >= 44 && b.visible), 'footer actions remain reachable at 44px or larger');
  return result;
};
try {
  console.log('chapter audit: opening local game');
  await page.goto('http://127.0.0.1:5681/?harness=1&seed=chapter-confrontation-short', {waitUntil: 'domcontentloaded', timeout: 30000});
  console.log('chapter audit: selecting hero through ordinary UI');
  await chooseCharacter(page, 'laohuan', true);
  console.log('chapter audit: shop reached');
  await page.waitForFunction(() => window.__harness.game.scene.getScene('shop').ready);
  const shopping = await state();
  await tapUI(page, 'shop', 'action/chapter', true);
  assert.equal(await modal().locator('.dialog-primary').count(), 0, 'shopping preview cannot start a stage');
  await modal().getByRole('button', {name: '返回商店', exact: true}).tap();
  assert.deepEqual(await state(), shopping, 'opening and closing chapter preview preserves shopping');
  report.cases.push({name: 'ordinary shop chapter open/close', status: 'PASS'});

  await tapUI(page, 'shop', 'action/start-stage', true);
  await waitScene(page, 'game');
  await modal().waitFor();
  const ready = await state();
  assert.equal(ready.phase, 'stage-ready');
  assert.equal(await modal().locator('.dialog-primary').count(), 1);
  for (const [name, viewport] of Object.entries({pc: {width: 1366, height: 900}, portrait390: {width: 390, height: 740}, portrait320: {width: 320, height: 640}, shortLandscape: {width: 740, height: 320}})) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(180);
    await modal().locator('.dialog-content').evaluate(e => e.scrollTop = 0);
    await modal().locator('.blind-hero-image').evaluate(image => image.decode().catch(() => {}));
    const geometry = await bounds();
    await shot(name);
    assert.deepEqual(await state(), ready, 'responsive presentation never changes run state');
    report.cases.push({name, status: 'PASS', viewport, geometry});
  }
  await page.setViewportSize({width: 390, height: 740});
  await modal().getByRole('button', {name: '跳过此场', exact: true}).tap();
  assert.deepEqual(await state(), ready);
  assert.equal(await modal().locator('.dialog-primary').isDisabled(), true);
  await shot('skip-confirm390');
  await page.keyboard.press('Escape');
  assert.equal(await modal().count(), 1, 'Escape cancels confirmation before dismissing chapter');
  assert.equal(await modal().getByRole('button', {name: '跳过此场', exact: true}).count(), 1);
  assert.deepEqual(await state(), ready);
  await page.keyboard.press('Escape');
  assert.equal(await modal().count(), 0);
  assert.deepEqual(await state(), ready, 'closing stage entrance keeps the current run');
  await tapUI(page, 'game', 'action/stage-directory', true);
  await modal().waitFor();
  assert.deepEqual(await state(), ready);
  report.cases.push({name: 'ordinary skip confirmation/Escape cancellation and directory reopen', status: 'PASS'});

  await modal().locator('.dialog-primary').tap();
  await page.waitForFunction(() => {
    const s = window.__harness.game.scene.getScene('game');
    return s.ready && !s.playing && s.cardViews.length > 0 && s.cardViews.every(v => !v.dealing);
  });
  const entered = await state();
  const first = entered.handOrder[0];
  await tapUI(page, 'game', 'card/' + first, true);
  assert.equal(await page.evaluate(() => window.__harness.game.scene.getScene('game').selectedIds.size), 1);
  await tapUI(page, 'game', 'card/' + first, true);
  assert.equal(await page.evaluate(() => window.__harness.game.scene.getScene('game').selectedIds.size), 0);
  assert.deepEqual(await state(), entered, 'card selection still stays outside the save');
  report.cases.push({name: 'ordinary unique enter action and card select/deselect', status: 'PASS'});

  // Visual-only fixtures use the actual view and live Boss definitions, outside the active controller.
  for (const [name, viewport, index, boss] of [
    ['boss-pc', {width: 1366, height: 900}, 2, 'B05'],
    ['boss390', {width: 390, height: 740}, 2, 'B05'],
    ['boss320', {width: 320, height: 640}, 2, 'B05'],
    ['boss-shortLandscape', {width: 740, height: 320}, 2, 'B05'],
    ['middle390', {width: 390, height: 740}, 1, 'B03'],
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(data => window.__chapterVisualFixture(data), {index, boss});
    await page.waitForTimeout(150);
    await modal().locator('.blind-hero-image').evaluate(image => image.decode().catch(() => {}));
    const geometry = await bounds();
    if (index === 2) assert.equal(await modal().locator('.is-skip').count(), 0);
    await shot(name);
    report.cases.push({name, kind: 'display-only fixture', status: 'PASS', viewport, geometry});
    await modal().getByRole('button', {name: '稍后开战', exact: true}).tap();
  }
  assert.deepEqual(await state(), entered, 'display fixtures never mutate the real run');
  // A finite first-stage loss uses ordinary low-card inputs, then the real same-seed retry.
  await page.setViewportSize({width: 390, height: 740});
  // The real modal dismissal guard deliberately blocks a rapid tap at its former button position.
  await page.waitForTimeout(370);
  for (let hand = 0; hand < 4 && (await state()).phase === 'await-input'; hand++) {
    const live = await state();
    const card = live.handOrder.map(id => live.deckInstances.find(c => c.id === id)).sort((a, b) => a.rank - b.rank)[0];
    await tapUI(page, 'game', 'card/' + card.id, true);
    await tapUI(page, 'game', 'action/play', true);
    await page.waitForFunction(seq => window.__harness.game.registry.get('runController').state.commandSeq > seq ||
      !![...document.querySelectorAll('dialog[open] button')].find(b => b.textContent === '继续出牌'), live.commandSeq);
    const continuePlay = page.getByRole('button', {name: '继续出牌', exact: true});
    if (await continuePlay.count()) await continuePlay.tap();
    await page.waitForFunction(seq => {
      const game = window.__harness.game, controller = game.registry.get('runController'), scene = game.scene.getScene('game');
      return controller.state.commandSeq > seq && (game.scene.isActive('intermission') || scene.ready && !scene.playing && scene.cardViews.every(v => !v.dealing));
    }, live.commandSeq);
  }
  const lost = await state();
  assert.equal(lost.phase, 'run-lost', 'finite low-card first stage reaches the ordinary loss route');
  await waitScene(page, 'intermission');
  await tapUI(page, 'intermission', 'action/retry-seed', true);
  await waitScene(page, 'shop');
  await page.waitForFunction(() => window.__harness.game.scene.getScene('shop').ready);
  const retried = await state();
  assert.equal(retried.seed, entered.seed);assert.equal(retried.characterId, entered.characterId);
  assert.equal(retried.runId, entered.runId);assert.equal(retried.stageIndex, 0);assert.equal(retried.phase, 'shop');
  assert.equal(retried.stage, null);assert.equal(retried.gold, shopping.gold);assert.deepEqual(retried.jokers, shopping.jokers);
  report.cases.push({name: 'ordinary four low-card hands, failure and same-seed retry', status: 'PASS', hands: lost.stage.playIndex});
  await tapUI(page, 'shop', 'action/chapter', true);
  await modal().getByRole('button', {name: '跳过此场', exact: true}).tap();
  assert.deepEqual(await state(), retried);
  await modal().getByRole('button', {name: '确认跳场', exact: true}).tap();
  await waitScene(page, 'intermission');
  const skipped = await state();
  assert.equal(skipped.commandSeq, retried.commandSeq + 1);assert.equal(skipped.stageIndex, 1);
  assert.equal(skipped.gold, retried.gold);assert.deepEqual(skipped.stage.skipResult, {kind: 'coupon', amount: 2});
  assert.equal(skipped.stage.goldEarned, 0);
  report.cases.push({name: 'ordinary confirmed skip saves one result and reaches intermission', status: 'PASS'});
  assert.deepEqual(errors, []);
  report.status = 'PASS';
} catch (e) {
  report.status = 'FAIL';report.error = String(e.stack);
  await shot('failure').catch(() => {});process.exitCode = 1;
} finally {
  report.errors = errors;
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await context.close();await browser.close();await new Promise(resolve => server.httpServer.close(resolve));
}
