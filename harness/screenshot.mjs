/**
 * 轻量冒烟与截图工具：真实浏览器跑通「选角 -> 开局」主流程。
 *
 * - 默认 `npm run shot`：桌面 + 竖屏手机各跑一遍，截图存 shots/（gitignore，人工目审）
 * - `npm run verify:smoke`（--verify-smoke）：同上但不落盘，断言失败即非零退出，作发布门禁
 *
 * 断言只覆盖真正的用户级契约：页面出 canvas、选角场景激活、六个角色可点、
 * 点击后能进入游戏场景。视觉好坏由人看截图判断，不写像素断言。
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
if (!existsSync(viteBin)) throw new Error(`vite bin not found: ${viteBin}`);
const port = Number(process.env.SHOT_PORT || 5199);
const base = `http://localhost:${port}/?harness=1`;
const verifySmoke = process.argv.includes('--verify-smoke');
const outDir = path.join(root, 'shots');

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  // H5 主战场：竖屏手机
  mobile: { width: 390, height: 844 },
};

// 逻辑分辨率（main.ts 的 Phaser 配置）与首卡中心（CharacterSelectScene 的网格公式）
const GAME_W = 1280;
const GAME_H = 720;
const FIRST_CARD = { x: 248, y: 256 };

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`dev server did not start: ${url}`);
}

/** 游戏逻辑坐标 -> 页面 CSS 像素（Phaser Scale.FIT 信箱外的换算）。 */
async function gameToPage(page, gameX, gameY) {
  const rect = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    const box = canvas.getBoundingClientRect();
    return { left: box.left, top: box.top, width: box.width, height: box.height };
  });
  assert.ok(rect, 'canvas exists');
  return {
    x: rect.left + (gameX / GAME_W) * rect.width,
    y: rect.top + (gameY / GAME_H) * rect.height,
  };
}

async function waitForScene(page, key, timeoutMs = 15000) {
  await page.waitForFunction(
    (sceneKey) => {
      const harness = window.__harness;
      if (!harness) return false;
      const scene = harness.game.scene.getScene(sceneKey);
      return scene && scene.scene.isActive();
    },
    key,
    { timeout: timeoutMs },
  );
}

async function runViewport(browser, name, viewport) {
  const context = await browser.newContext({ viewport, hasTouch: name === 'mobile' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  await page.goto(base, { waitUntil: 'load' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await waitForScene(page, 'character-select');

  // 六张角色卡都渲染出来了（每个角色一个 container，含背景、边框、立绘/占位、文本）
  const cardCount = await page.evaluate(() => {
    const scene = window.__harness.game.scene.getScene('character-select');
    return scene.children.list.filter((child) => child.type === 'Container').length;
  });
  assert.equal(cardCount, 6, `${name}: six character cards rendered`);

  if (!verifySmoke) mkdirSync(outDir, { recursive: true });
  const shot = (suffix) =>
    verifySmoke ? Promise.resolve() : page.screenshot({ path: path.join(outDir, `${name}-${suffix}.png`) });

  await page.waitForTimeout(400); // 等立绘裁切渲染稳定
  await shot('select');

  // 点第一张卡（阿默）-> 应进入游戏场景
  const point = await gameToPage(page, FIRST_CARD.x, FIRST_CARD.y);
  await page.mouse.click(point.x, point.y);
  await waitForScene(page, 'game');

  const chosen = await page.evaluate(() => window.__harness.game.registry.get('characterId'));
  assert.equal(chosen, 'amo', `${name}: clicking first card starts a run as amo`);
  await page.waitForTimeout(600); // 等 HUD 立绘与手牌发完
  await shot('game');

  assert.deepEqual(pageErrors, [], `${name}: no page errors`);
  await context.close();
  console.log(`${name}: ok`);
}

async function main() {
  const server = spawn(process.execPath, [viteBin, '--port', String(port), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  });
  try {
    await waitForServer(base);
    const browser = await chromium.launch();
    try {
      for (const [name, viewport] of Object.entries(VIEWPORTS)) {
        await runViewport(browser, name, viewport);
      }
    } finally {
      await browser.close();
    }
  } finally {
    server.kill();
  }
  console.log(verifySmoke ? 'smoke: ok' : `shots saved to ${path.relative(root, outDir)}/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
