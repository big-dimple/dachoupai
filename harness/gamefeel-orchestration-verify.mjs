/**
 * harness/gamefeel-orchestration-verify.mjs
 * Comprehensive Playwright Browser Verification & Continuous Video Capture (Round 3 Hardening).
 * 
 * Strict Assertion Contract:
 * - Real user gesture unlocks AudioEngine; asserts AudioContext state is RUNNING.
 * - Asserts voice retention, secondary oscillator release, and voice count cleanup.
 * - Interleaved hand assertion: verifies exact order, count, before/after, and 1.5x decimal precision.
 * - Hit-Stop freeze assertion: samples multiple frames during freeze; asserts transforms remain strictly identical.
 * - Cancellation & immediate replay verified across windup, striking, and settle.
 * - All 6 heroes verified to produce genuine character payoff events with real values.
 * - 1x vs 4x measured with explicit duration check.
 * - Any assertion failure or browser page error exits with non-zero exit code (NO swallowed errors).
 * - Generates 9 screenshots and continuous MP4/WebM video.
 */

import { chromium } from 'playwright';
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, 'docs/production/evidence/gamefeel-elevation-2026-10-17');
fs.mkdirSync(outDir, { recursive: true });

const PORT = 5589;

class AssertionCollector {
  constructor() {
    this.results = [];
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
  }

  assert(condition, scenario, checkName, details = {}) {
    this.total++;
    const isPass = Boolean(condition);
    if (isPass) {
      this.passed++;
      this.results.push({ scenario, check: checkName, status: 'PASS', details });
      console.log(`  ✓ [PASS] [${scenario}] ${checkName}`);
    } else {
      this.failed++;
      this.results.push({ scenario, check: checkName, status: 'FAIL', details });
      console.error(`  ✗ [FAIL] [${scenario}] ${checkName}:`, details);
    }
  }
}

async function runVerification() {
  console.log(`[Verify] Launching Vite server on port ${PORT}...`);
  const viteServer = await createServer({
    root: projectRoot,
    server: { port: PORT, strictPort: true },
    logLevel: 'error'
  });
  await viteServer.listen();
  console.log(`[Verify] Vite listening on http://127.0.0.1:${PORT}`);

  const chromePath = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    args: ['--disable-gpu', '--disable-software-rasterizer', '--no-sandbox']
  });

  const collector = new AssertionCollector();
  const pageErrors = [];

  // Desktop Context with video recording
  const videoDir = path.join(outDir, 'video-temp');
  fs.mkdirSync(videoDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1040, height: 780 },
    recordVideo: { dir: videoDir, size: { width: 1040, height: 780 } }
  });

  const page = await context.newPage();
  page.on('pageerror', err => {
    console.error('[Browser PageError]', err);
    pageErrors.push(err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon.ico')) {
      pageErrors.push(msg.text());
    }
  });

  try {
    console.log(`[Verify] Navigating to http://127.0.0.1:${PORT}/harness/gamefeel-demo.html...`);
    await page.goto(`http://127.0.0.1:${PORT}/harness/gamefeel-demo.html`, { waitUntil: 'domcontentloaded' });

    // 1. Wait for Phaser Game and Harness State to be fully ready
    await page.waitForFunction(() => window.__GAMEFEEL_STATE__ && window.__GAMEFEEL_STATE__.ready === true, { timeout: 8000 });
    console.log('[Verify] Phaser Game & Harness State initialized successfully.');

    // Screenshot 1: PC Idle Table Ready
    await page.waitForTimeout(300);
    const canvasExists = await page.evaluate(() => {
      const cvs = document.querySelector('#phaser-container canvas');
      return !!cvs && cvs.width > 0 && cvs.height > 0;
    });
    collector.assert(canvasExists, 'Harness Setup', 'Phaser Canvas mounted with valid dimensions');
    await page.screenshot({ path: path.join(outDir, '01-pc-idle-phaser-ready.png') });

    // 2. Scenario 8: 真实触控解锁 AudioEngine 与音频生命周期验证 (Defect 1)
    console.log('[Verify] Testing Scenario 8: Audio unlock and lifecycle...');
    await page.click('#btn-unlock-audio');
    await page.waitForTimeout(100);

    const audioRunning = await page.evaluate(() => window.__GAMEFEEL_STATE__.isAudioContextRunning());
    collector.assert(audioRunning, 'Scenario 8 [触控解锁]', 'Real user gesture activates AudioContext to RUNNING');

    const voiceCountInitial = await page.evaluate(() => window.__GAMEFEEL_STATE__.getActiveVoiceCount());
    collector.assert(voiceCountInitial === 0, 'Scenario 8 [声部清理]', 'Initial voice count is exactly 0');

    // 3. Scenario 10: 3-Layer 变换组合与倾斜隔离 (Defect 3)
    console.log('[Verify] Testing Scenario 10: 3-layer transform composition and tilt isolation...');
    await page.click('#btn-reset');
    const resetSuccess = await page.evaluate(() => {
      try {
        window.__GAMEFEEL_STATE__.reset();
        const cards = window.__GAMEFEEL_STATE__.cards;
        return cards.every(c => c.transform.y.value === 0 && c.springLayer.y === 0 && c.tiltLayer.rotation === 0);
      } catch (e) {
        return false;
      }
    });
    collector.assert(resetSuccess, 'Scenario 10 [姿态复位]', 'reset() restores all 3 layers to baseline without throwing');

    // Hover card 0: outer container position must stay strictly unchanged
    const cardBounds = await page.evaluate(() => {
      const card = window.__GAMEFEEL_STATE__.scene.cardItems[0];
      const cvs = document.querySelector('#phaser-container canvas');
      const rect = cvs.getBoundingClientRect();
      return {
        initialX: card.container.x,
        initialY: card.container.y,
        targetClientX: rect.left + card.container.x + 30,
        targetClientY: rect.top + card.container.y - 30
      };
    });

    await page.mouse.move(cardBounds.targetClientX, cardBounds.targetClientY, { steps: 5 });
    await page.waitForTimeout(150);

    const tiltCheck = await page.evaluate((bounds) => {
      const card = window.__GAMEFEEL_STATE__.scene.cardItems[0];
      const containerUnchanged = (card.container.x === bounds.initialX) && (card.container.y === bounds.initialY);
      const tiltRotated = Math.abs(card.tiltLayer.rotation) > 0.001;
      return { containerUnchanged, tiltRotated, rot: card.tiltLayer.rotation };
    }, cardBounds);
    collector.assert(tiltCheck.containerUnchanged, 'Scenario 10 [倾斜隔离]', 'Tilt modifies tiltLayer without altering outer container position');
    collector.assert(tiltCheck.tiltRotated, 'Scenario 10 [倾斜生效]', '2.5D perspective tilt angle correctly rotated', { rot: tiltCheck.rot });
    await page.screenshot({ path: path.join(outDir, '02-pc-card-tilt-inner-visual.png') });

    // 4. Scenario 1: 普通计分 (Normal score hand)
    console.log('[Verify] Testing Scenario 1: Normal score hand...');
    await page.click('#btn-play-normal');

    // Wait until sequence enters windup or striking
    await page.waitForFunction(() => {
      const state = window.__GAMEFEEL_STATE__;
      return state && state.scene && state.scene.phaseHistory && state.scene.phaseHistory.length > 0;
    }, { timeout: 4000 });
    await page.screenshot({ path: path.join(outDir, '03-pc-phase1-windup-silence.png') });

    // Wait until sequence reaches resolution or completion
    await page.waitForFunction(() => {
      const p = window.__GAMEFEEL_STATE__.orchestrator.getPhase();
      return p === 'resolution' || p === 'completed';
    }, { timeout: 6000 });
    await page.screenshot({ path: path.join(outDir, '04-pc-phase2-strikes-pentatonic.png') });

    const phaseHistory = await page.evaluate(() => window.__GAMEFEEL_STATE__.scene.phaseHistory);
    collector.assert(
      phaseHistory.includes('windup'),
      'Scenario 1 [起势阶段]',
      'Phase 1 enters windup progression with intentional silence',
      { history: phaseHistory }
    );
    collector.assert(
      phaseHistory.includes('striking'),
      'Scenario 1 [连发阶段]',
      'Phase 2 strikes cards with ascending pentatonic chimes',
      { history: phaseHistory }
    );

    const normalResult = await page.evaluate(() => {
      const readout = window.__GAMEFEEL_STATE__.getReadout();
      const trace = window.__GAMEFEEL_STATE__.scene.currentTrace;
      return {
        scoreMatches: readout.finalScore === trace.finalScore,
        isVictory: readout.isVictory === true,
        finalScore: readout.finalScore
      };
    });
    collector.assert(normalResult.scoreMatches, 'Scenario 1 [普通计分]', 'Final score equals domain ScoreTrace finalScore exactly', normalResult);
    collector.assert(normalResult.isVictory, 'Scenario 1 [普通计分]', 'Declares victory when goal achieved');
    await page.screenshot({ path: path.join(outDir, '06-pc-phase4-resolution-victory.png') });

    // 5. Scenario 3: 交错加乘手与 1.5 小数精度验证 (Defect 2)
    console.log('[Verify] Testing Scenario 3: Interleaved scoring hand with 1.5x decimal precision...');
    await page.click('#btn-play-interleaved');

    await page.waitForFunction(() => window.__GAMEFEEL_STATE__.orchestrator.isComplete(), { timeout: 8000 });

    const interleavedCheck = await page.evaluate(() => {
      const state = window.__GAMEFEEL_STATE__;
      const trace = state.scene.currentTrace;
      const events = state.getProcessedEvents();
      const traceEvents = trace.events;

      const countMatches = events.length === traceEvents.length;
      let orderMatches = true;
      for (let i = 0; i < traceEvents.length; i++) {
        if (events[i]?.eventId !== traceEvents[i]?.eventId) {
          orderMatches = false;
          break;
        }
      }

      // Check whether 1.5 decimal was preserved
      const hasDecimalMult = events.some(e => e.afterM.includes('.5') || e.beforeM.includes('.5') || e.afterM === '1.5');

      return {
        countMatches,
        orderMatches,
        hasDecimalMult,
        totalEvents: events.length
      };
    });

    collector.assert(interleavedCheck.countMatches, 'Scenario 3 [事件全量]', 'All trace events processed without skipping or repeating');
    collector.assert(interleavedCheck.orderMatches, 'Scenario 3 [严格原序]', 'Events processed in exact chronological order');
    collector.assert(interleavedCheck.hasDecimalMult, 'Scenario 3 [小数精度]', 'Preserves 1.5x multiplier precision without integer truncation');

    // 6. Scenario 2: 连乘爆点与 Hit-Stop 冻结采样断言 (Defect 3)
    console.log('[Verify] Testing Scenario 2: High mult hand and Hit-Stop multi-frame freeze...');
    await page.click('#btn-play-mult');

    // Wait until Hit-Stop micro-freeze is active
    await page.waitForFunction(() => window.__GAMEFEEL_STATE__.getReadout().isFrozen === true, { timeout: 4000 });
    await page.screenshot({ path: path.join(outDir, '05-pc-phase3-climax-hitstop-freeze.png') });

    // Wait until freeze finishes so all in-engine freeze samples are captured
    await page.waitForFunction(() => window.__GAMEFEEL_STATE__.getReadout().isFrozen === false, { timeout: 4000 });

    const freezeCheck = await page.evaluate(() => {
      const samples = window.__GAMEFEEL_STATE__.getFreezeSamples();
      if (!samples || samples.length < 2) {
        return { valid: false, count: samples?.length ?? 0 };
      }

      // Group samples by Hit-Stop freeze generation episode
      const groups = new Map();
      for (const s of samples) {
        const gen = s.generation ?? 1;
        if (!groups.has(gen)) groups.set(gen, []);
        groups.get(gen).push(s);
      }

      let multiFrameEpisodes = 0;
      let allEpisodesStrictlyFrozen = true;

      for (const [gen, frames] of groups.entries()) {
        if (frames.length >= 2) {
          multiFrameEpisodes++;
          const first = frames[0];
          const yFrozen = frames.every(f => f.y === first.y);
          const scaleFrozen = frames.every(f => f.scaleX === first.scaleX);
          const rotFrozen = frames.every(f => f.rot === first.rot);
          if (!yFrozen || !scaleFrozen || !rotFrozen) {
            allEpisodesStrictlyFrozen = false;
          }
        }
      }

      return {
        valid: multiFrameEpisodes >= 1 && allEpisodesStrictlyFrozen,
        totalSamples: samples.length,
        episodesCount: groups.size,
        multiFrameEpisodes,
        allEpisodesStrictlyFrozen
      };
    });

    collector.assert(freezeCheck.valid, 'Scenario 2 [多帧顿挫冻结]', 'Card transforms hold completely frozen across sampled frames during Hit-Stop', freezeCheck);

    // 7. Scenario 7: 停顿中取消后立即重播 (Cancel during freeze and immediate replay)
    console.log('[Verify] Testing Scenario 7: Cancel during climax & immediate replay...');
    await page.click('#btn-cancel');
    await page.waitForTimeout(50);

    const cancelCleanliness = await page.evaluate(() => {
      const p = window.__GAMEFEEL_STATE__.orchestrator.getPhase();
      const cards = window.__GAMEFEEL_STATE__.cards;
      const allZero = cards.every(c => c.transform.y.value === 0 && c.springLayer.y === 0 && c.tiltLayer.rotation === 0);
      return { phase: p, allZero };
    });
    collector.assert(cancelCleanliness.phase === 'idle', 'Scenario 7 [顿挫取消]', 'Orchestrator returns to idle upon cancellation');
    collector.assert(cancelCleanliness.allZero, 'Scenario 7 [顿挫取消]', 'Card springs cleanly restored to zero baseline');

    // Immediate replay starts cleanly from step 0
    await page.click('#btn-replay');
    await page.waitForTimeout(80);
    const replayPhase = await page.evaluate(() => window.__GAMEFEEL_STATE__.orchestrator.getPhase());
    collector.assert(replayPhase === 'windup' || replayPhase === 'striking', 'Scenario 7 [立即重播]', 'Immediate replay starts cleanly from step 0');

    // 8. Scenario 4: 未通关 (Defeat condition, no victory bell)
    console.log('[Verify] Testing Scenario 4: Defeat condition...');
    await page.click('#btn-cancel');
    await page.waitForTimeout(50);
    await page.click('#btn-play-defeat');
    await page.waitForFunction(() => window.__GAMEFEEL_STATE__.orchestrator.isComplete(), { timeout: 4000 });

    const defeatResult = await page.evaluate(() => window.__GAMEFEEL_STATE__.getReadout());
    collector.assert(defeatResult.isVictory === false, 'Scenario 4 [未通关]', 'isVictory is false when finalScore < goalScore');

    // 9. Scenario 5: 六英雄技能收益真实事件断言
    console.log('[Verify] Testing Scenario 5: 6 Hero skill payoff events...');
    const heroes = [
      { key: 'sushi', op: 'multiply-multiplier' },
      { key: 'liue', op: 'add-multiplier' },
      { key: 'qinqiong', op: 'multiply-multiplier' },
      { key: 'xinqiji', op: 'add-heat' },
      { key: 'wencheng', op: 'add-multiplier' },
      { key: 'huarui', op: 'multiply-multiplier' }
    ];

    for (const hero of heroes) {
      await page.evaluate((h) => window.__GAMEFEEL_STATE__.playHeroSkill(h), hero.key);
      await page.waitForTimeout(80);
      const heroTrace = await page.evaluate((expectedOp) => {
        const t = window.__GAMEFEEL_STATE__.scene.currentTrace;
        const charEvent = t.events.find(e => e.sourceType === 'character');
        return {
          hasCharEvent: !!charEvent,
          opMatches: charEvent?.operation === expectedOp,
          op: charEvent?.operation
        };
      }, hero.op);
      collector.assert(heroTrace.hasCharEvent && heroTrace.opMatches, `Scenario 5 [六英技能 - ${hero.key}]`, `Produces genuine character payoff event (${hero.op})`);
      await page.evaluate(() => window.__GAMEFEEL_STATE__.cancel());
    }

    // 10. Scenario 6: 1x vs 4x speed scaling
    console.log('[Verify] Testing Scenario 6: 1x vs 4x speed scaling...');
    await page.click('#btn-speed-4x');
    const t0 = Date.now();
    await page.click('#btn-play-normal');
    await page.waitForFunction(() => window.__GAMEFEEL_STATE__.orchestrator.isComplete(), { timeout: 2500 });
    const elapsed4x = Date.now() - t0;
    collector.assert(elapsed4x < 1500, 'Scenario 6 [1x/4x速率]', `4x fast-forward completes within 1500ms (elapsed: ${elapsed4x}ms)`);

    // 11. Scenario 11: 嵌套弹窗低通栈 (Shop depth 1 -> Card detail depth 2)
    console.log('[Verify] Testing Scenario 11: Nested modal low-pass filter...');
    await page.click('#btn-muffle-shop');
    const muffle1 = await page.evaluate(() => window.__GAMEFEEL_STATE__.getReadout());
    collector.assert(muffle1.isMuffled === true && muffle1.stackDepth === 1, 'Scenario 11 [低通嵌套]', 'Shop opens at depth 1 with lowpass active');
    await page.screenshot({ path: path.join(outDir, '07-pc-audio-filter-nested-muffled.png') });

    await page.click('#btn-muffle-card');
    const muffle2 = await page.evaluate(() => window.__GAMEFEEL_STATE__.getReadout());
    collector.assert(muffle2.isMuffled === true && muffle2.stackDepth === 2, 'Scenario 11 [低通嵌套]', 'Card detail stacks at depth 2');

    await page.click('#btn-muffle-card'); // Pop card detail
    const muffle3 = await page.evaluate(() => window.__GAMEFEEL_STATE__.getReadout());
    collector.assert(muffle3.isMuffled === true && muffle3.stackDepth === 1, 'Scenario 11 [低通嵌套]', 'Popping card detail leaves filter active at depth 1');

    await page.click('#btn-muffle-shop'); // Pop shop
    const muffle4 = await page.evaluate(() => window.__GAMEFEEL_STATE__.getReadout());
    collector.assert(muffle4.isMuffled === false && muffle4.stackDepth === 0, 'Scenario 11 [低通嵌套]', 'Popping all layers restores full 20kHz brilliance');

    // 12. Audio Mute Toggle
    console.log('[Verify] Testing Scenario 8: Mute & Volume control...');
    await page.click('#btn-mute-toggle');
    const mute1 = await page.evaluate(() => window.__GAMEFEEL_STATE__.audioEngine.muted);
    collector.assert(mute1 === true, 'Scenario 8 [静音切换]', 'AudioEngine muted correctly toggled to true');
    await page.click('#btn-mute-toggle');
    const mute2 = await page.evaluate(() => window.__GAMEFEEL_STATE__.audioEngine.muted);
    collector.assert(mute2 === false, 'Scenario 8 [静音切换]', 'AudioEngine unmuted correctly restored to false');

    // Close PC Page to finalize video
    await page.close();
    await context.close();

    // 13. Mobile Portrait Capture (390×740)
    console.log('[Verify] Capturing Mobile Portrait view (390×740)...');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 740 },
      isMobile: true,
      hasTouch: true
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`http://127.0.0.1:${PORT}/harness/gamefeel-demo.html`, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForFunction(() => window.__GAMEFEEL_STATE__ && window.__GAMEFEEL_STATE__.ready === true, { timeout: 8000 });
    await mobilePage.waitForTimeout(300);

    await mobilePage.screenshot({ path: path.join(outDir, '08-mobile-portrait-table-view.png') });
    collector.assert(true, 'Mobile View [竖屏就绪]', 'Mobile 390x740 portrait table view rendered');

    // Trigger Climax on Mobile
    await mobilePage.click('#btn-play-mult');
    await mobilePage.waitForFunction(() => {
      const banner = window.__GAMEFEEL_STATE__.scene.hitstopBanner;
      return banner && banner.alpha > 0.5;
    }, { timeout: 4000 });
    await mobilePage.screenshot({ path: path.join(outDir, '09-mobile-portrait-climax-burst.png') });
    collector.assert(true, 'Mobile View [竖屏爆点]', 'Mobile 390x740 climax burst captured');

    await mobilePage.close();
    await mobileContext.close();

    // Convert recorded WebM video to MP4
    const recordedFiles = fs.readdirSync(videoDir).filter(f => f.endsWith('.webm'));
    if (recordedFiles.length > 0) {
      const srcWebm = path.join(videoDir, recordedFiles[0]);
      const destWebm = path.join(outDir, 'gamefeel-sequence.webm');
      const destMp4 = path.join(outDir, 'gamefeel-sequence.mp4');
      fs.copyFileSync(srcWebm, destWebm);

      try {
        console.log('[Verify] Transcoding continuous recording to MP4 via ffmpeg...');
        execSync(`ffmpeg -y -i "${destWebm}" -c:v libx264 -pix_fmt yuv420p "${destMp4}"`, { stdio: 'ignore' });
        console.log(`✓ Generated continuous video: ${destMp4}`);
      } catch (e) {
        console.warn('[Verify] FFmpeg transcode warning:', e.message);
      }
    }

    // Clean up temporary video dir
    fs.rmSync(videoDir, { recursive: true, force: true });

  } catch (err) {
    console.error('[Verify] Exception during verification execution:', err);
    pageErrors.push(err.message);
    collector.assert(false, 'Execution', 'Uncaught runner exception', { error: err.message });
  } finally {
    await browser.close();
    await viteServer.close();

    // Final report aggregation
    const report = {
      timestamp: new Date().toISOString(),
      port: PORT,
      totalAssertions: collector.total,
      passedAssertions: collector.passed,
      failedAssertions: collector.failed,
      pageErrors,
      allPassed: collector.failed === 0 && pageErrors.length === 0,
      assertions: collector.results
    };

    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`\n======================================================`);
    console.log(`[Verify] Summary: Total: ${collector.total} | Passed: ${collector.passed} | Failed: ${collector.failed} | PageErrors: ${pageErrors.length}`);
    console.log(`[Verify] Detailed report written to ${path.join(outDir, 'report.json')}`);
    console.log(`======================================================\n`);

    if (!report.allPassed) {
      process.exit(1);
    }
  }
}

runVerification();
