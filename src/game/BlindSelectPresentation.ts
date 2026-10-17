import type Phaser from 'phaser';
import type {R2RunState} from '../domain/r2Run';
import {getR2Stage} from '../domain/r2Run';
import {R2_BOSSES, type R2BossPlan} from '../domain/r2Chapter';
import {SUIT_SYMBOL} from '../cards/types';
import {SKIP_ITEM_LABELS} from './ConsumableDialog';
import {heatText} from './scoreText';
import {getCharacter} from './characters';
import {PAPER_CSS as C} from './theme';
import {DetailDialog} from './DetailDialog';
import {dispatchRun,runController} from './runAdapter';
import {paperSceneStart} from './PaperFlow';
import {gameSession} from './session';
import type {IntermissionResult} from './IntermissionScene';

function style(host: HTMLElement): void {
  const sheet = document.createElement('style');
  sheet.textContent = `
  .detail-dialog.blind-select-dialog[open] {
    border-color: ${C.divider};
    width: min(960px, calc(100vw - var(--safe-left, 0px) - var(--safe-right, 0px) - 20px));
    max-height: 92vh;
    height: auto;
    top: calc(50% + (var(--safe-top, 0px) - var(--safe-bottom, 0px)) / 2);
    bottom: auto;
    transform: translateY(-50%);
    background: #f4ecdf;
    padding: 0;
    border-radius: 8px;
    box-shadow: 0 20px 50px rgba(38,49,58,0.42);
    overflow: hidden;
  }
  .blind-select-dialog .dialog-content {
    overflow: auto;
    max-height: calc(92vh - 24px);
    padding: 20px 22px 24px;
  }
  .blind-select-dialog .dialog-scroll {
    overflow: visible;
  }
  .blind-header {
    text-align: center;
    margin-bottom: 18px;
    padding-bottom: 14px;
    border-bottom: 1px solid #d4c7b4;
    position: relative;
  }
  .blind-header-tag {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: #8c5b36;
    border: 1px solid #8c5b36;
    padding: 2px 10px;
    border-radius: 2px;
    margin-bottom: 6px;
    background: #fff8ee;
  }
  .blind-header-title {
    font-family: Georgia, 'Noto Serif SC', SimSun, serif;
    font-size: clamp(22px, 3.5vw, 28px);
    font-weight: bold;
    color: #26313a;
    margin: 4px 0 6px;
    letter-spacing: 0.05em;
  }
  .blind-header-subtitle {
    font-size: 13px;
    color: #59646a;
  }
  .blind-cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-top: 14px;
  }
  @media(max-width: 720px) {
    .blind-cards-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }
  }
  .blind-card {
    position: relative;
    background: #fffbf3;
    border: 1px solid #d8cbba;
    border-radius: 6px;
    padding: 18px 14px 16px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 14px rgba(38,49,58,0.06);
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }
  .blind-card.is-active {
    border-color: #b99a61;
    box-shadow: 0 0 0 2px #b99a61, 0 8px 24px rgba(38,49,58,0.14);
    transform: translateY(-2px);
    background: #ffffff;
  }
  .blind-card.is-boss {
    background: #fff6f4;
    border-color: #d6877c;
  }
  .blind-card.is-boss.is-active {
    border-color: #b8473a;
    box-shadow: 0 0 0 3px #b8473a, 0 10px 30px rgba(184,71,58,0.32);
    animation: blind-boss-pulse 2s ease-in-out infinite alternate;
    background: #ffffff;
  }
  @keyframes blind-boss-pulse {
    0% { box-shadow: 0 0 0 2px #b8473a, 0 8px 20px rgba(184,71,58,0.22); }
    100% { box-shadow: 0 0 0 4px #b8473a, 0 14px 34px rgba(184,71,58,0.45); }
  }
  .blind-tag-pill {
    align-self: flex-start;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    padding: 3px 9px;
    border-radius: 3px;
    margin-bottom: 10px;
  }
  .blind-tag-small { background: #e3edea; color: #2e555e; border: 1px solid #b6d4ce; }
  .blind-tag-big { background: #dfebf4; color: #23486c; border: 1px solid #b2cde3; }
  .blind-tag-boss { background: #fde8e5; color: #b8473a; border: 1px solid #e89e95; }
  .blind-card-title {
    font-family: Georgia, 'Noto Serif SC', SimSun, serif;
    font-size: 20px;
    font-weight: bold;
    color: #26313a;
    margin: 0 0 12px;
  }
  .blind-card-title.boss-title {
    color: #b8473a;
    font-size: 22px;
  }
  .blind-stat-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 7px 0;
    border-top: 1px dashed #e4d8c8;
    font-size: 13px;
  }
  .blind-stat-label {
    color: #70685c;
  }
  .blind-stat-val {
    font-family: Georgia, serif;
    font-size: 17px;
    font-weight: bold;
    color: #26313a;
  }
  .blind-stat-val.boss-val {
    color: #b8473a;
    font-size: 19px;
  }
  .boss-danger-plate {
    margin: 12px 0 10px;
    padding: 12px;
    border-radius: 4px;
    background: #fce8e6;
    border-left: 5px solid #b8473a;
  }
  .boss-danger-heading {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: bold;
    color: #a32b1e;
    margin-bottom: 5px;
    letter-spacing: 0.05em;
  }
  .boss-danger-rule {
    font-size: 13px;
    line-height: 1.5;
    color: #26313a;
    font-weight: 700;
    margin: 0 0 6px;
  }
  .boss-danger-hint {
    font-size: 12px;
    line-height: 1.45;
    color: #634f4b;
    margin: 0;
  }
  .blind-skip-box {
    background: #f5eedf;
    padding: 7px 10px;
    border-radius: 4px;
    font-size: 12px;
    color: #59646a;
    margin-top: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .blind-skip-box.is-locked {
    background: #fbf2f0;
    color: #9c6059;
    font-weight: 600;
  }
  .blind-card-actions {
    margin-top: auto;
    padding-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .blind-btn {
    width: 100%;
    min-height: 42px;
    padding: 8px 12px;
    border: 1px solid #3f606b;
    background: #fff9ee;
    color: #3f606b;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .blind-btn.is-primary {
    background: #3f606b;
    color: #ffffff;
    border-color: #3f606b;
  }
  .blind-btn.is-boss-primary {
    background: #b8473a;
    color: #ffffff;
    border-color: #b8473a;
    font-size: 16px;
    min-height: 46px;
    letter-spacing: 0.06em;
    box-shadow: 0 4px 14px rgba(184,71,58,0.32);
  }
  .blind-btn.is-skip {
    border-color: #9c8e7b;
    color: #6b5e4c;
    background: transparent;
    font-size: 13px;
  }
  .blind-btn:hover:not(:disabled) {
    filter: brightness(1.08);
  }
  .blind-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  .blind-stamp-cleared {
    position: absolute;
    top: 36%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-12deg);
    border: 3px solid #b8473a;
    color: #b8473a;
    font-family: Georgia, 'Noto Serif SC', SimSun, serif;
    font-size: 21px;
    font-weight: bold;
    padding: 5px 16px;
    letter-spacing: 0.22em;
    opacity: 0.88;
    pointer-events: none;
    background: rgba(255, 251, 243, 0.9);
    border-radius: 4px;
    z-index: 2;
  }
  .blind-stamp-boss-cleared {
    position: absolute;
    top: 36%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-8deg);
    border: 3px solid #b8473a;
    color: #b8473a;
    font-family: Georgia, 'Noto Serif SC', SimSun, serif;
    font-size: 22px;
    font-weight: bold;
    padding: 6px 18px;
    letter-spacing: 0.2em;
    opacity: 0.92;
    pointer-events: none;
    background: rgba(255, 246, 244, 0.92);
    border-radius: 4px;
    z-index: 2;
  }
  `;
  host.append(sheet);
}

function createStatRow(label: string, val: string, isBossVal = false): HTMLElement {
  const row = document.createElement('div');
  row.className = 'blind-stat-row';
  const l = document.createElement('span');
  l.className = 'blind-stat-label';
  l.textContent = label;
  const v = document.createElement('span');
  v.className = isBossVal ? 'blind-stat-val boss-val' : 'blind-stat-val';
  v.textContent = val;
  row.append(l, v);
  return row;
}

export function presentStageSelection(dialog: DetailDialog, run: R2RunState, scene?: Phaser.Scene): Promise<boolean> {
  const chapter = Math.floor(run.stageIndex / 3) + 1;
  const start = Math.floor(run.stageIndex / 3) * 3;
  const stage0 = getR2Stage(start, run.tourMode, run.difficulty, run);
  const stage1 = getR2Stage(start + 1, run.tourMode, run.difficulty, run);
  const stage2 = getR2Stage(start + 2, run.tourMode, run.difficulty, run);

  if (!stage0 || !stage1 || !stage2) return Promise.resolve(true);

  const currentInChapter = run.stageIndex % 3;
  const isBoss = currentInChapter === 2;
  const character = getCharacter(run.characterId);
  const boss = run.boss;
  const bossDef = R2_BOSSES.find(b => b.id === boss.definitionId) ?? {
    id: boss.definitionId,
    name: '压轴强敌',
    rule: '强敌压制全场规则',
    response: '用高点数与成型牌型迎战',
  };
  const disabledSuitText = boss.disabledSuit ? ` · 封禁【${SUIT_SYMBOL[boss.disabledSuit]}】` : '';
  const normalSkipReward = SKIP_ITEM_LABELS[run.chapterSkipConsumable] ?? '本章消耗道具';
  const inShop = run.phase === 'shop';

  // Sound cues
  if (scene) {
    const audio = (scene as unknown as { audio?: { sourceCue: (k: string) => void; select: () => void } }).audio;
    if (isBoss) audio?.sourceCue('boss');
    else audio?.select();
  }

  return new Promise(resolve => {
    let entered = false;
    let closed = false;
    let busy = false;
    let retryPending = false;
    const owner = scene && runController(scene);
    const currentStage = currentInChapter === 0 ? stage0 : currentInChapter === 1 ? stage1 : stage2;
    const dialogTitle = `第 ${chapter} 章 · 节目录`;

    const actions = inShop
      ? []
      : [
          {
            label: isBoss ? '迎战强敌 ›' : `进入${currentStage.name} ›`,
            primary: true,
            run: () => {
              if (!busy && !closed) {entered = true;dialog.close();}
            },
          },
        ];

    const d = dialog.open(
      dialogTitle,
      '',
      actions,
      {
        closeLabel: inShop ? '返回商店' : '稍后开战',
        onClose: () => {closed = true;resolve(entered);},
        summaryBody: isBoss ? `⚠️ 压轴决战 · 目标 ${heatText(stage2.targetHeat)}` : `${currentStage.name} · 目标 ${heatText(currentStage.targetHeat)}`,
      }
    );

    d.classList.add('blind-select-dialog');
    style(d);

    // Build the visual Three-Blind cards layout
    const wrap = document.createElement('div');
    wrap.className = 'blind-dialog-inner';
    const status = document.createElement('p');
    status.className = 'blind-operation-status';
    status.setAttribute('role', 'status');
    status.hidden = true;
    // Escape must not dismiss the only retry surface while its save is in flight.
    d.addEventListener('cancel', event => {if (busy) {event.preventDefault();event.stopImmediatePropagation();}}, true);
    const skipStage = async (button: HTMLButtonElement) => {
      if (!scene || busy || closed || !dialog.active(d) || !scene.scene.isActive() || runController(scene) !== owner) return;
      busy = true;
      const buttons = [...d.querySelectorAll<HTMLButtonElement>('button')];
      const disabled = buttons.map(b => b.disabled);
      buttons.forEach(b => b.disabled = true);
      const label = button.textContent;
      button.textContent = '正在跳场…';status.hidden = true;
      try {
        const result = retryPending
          ? {ok: await gameSession().retry(), state: owner!.state}
          : await dispatchRun(scene, {type: 'SkipStage'}, run.commandSeq);
        if (!result.ok) {
          retryPending = retryPending || ('code' in result && result.code === 'save-failed');
          status.textContent = retryPending ? '跳场尚未保存，重试将保存同一次结果。' : '跳场未完成，请重试；如存档暂停，请在菜单重试保存。';
          status.hidden = false;
          return;
        }
        // A late save may finish after this scene has been replaced.
        if (runController(scene) !== owner || !scene.scene.isActive() || !result.state.stage?.skipResult) return;
        const stage = result.state.stage;
        dialog.close(d);
        paperSceneStart(scene, 'intermission', {
          cleared: true, stageIndex: stage.index, stageHeat: stage.heat,
          handsLeft: stage.handsLeft, goldEarned: stage.goldEarned,
        } satisfies IntermissionResult);
      } catch {
        status.textContent = '跳场未完成，请重试。';status.hidden = false;
      } finally {
        busy = false;
        if (dialog.active(d)) {
          buttons.forEach((b, i) => b.disabled = disabled[i]);
          button.textContent = retryPending ? '重试保存并跳场' : label;
        }
      }
    };

    const header = document.createElement('header');
    header.className = 'blind-header';
    const tag = document.createElement('span');
    tag.className = 'blind-header-tag';
    tag.textContent = `第 ${chapter} 章 · 节目录`;
    const title = document.createElement('h2');
    title.className = 'blind-header-title';
    title.textContent = '三场对局 · 步步为营';
    const subtitle = document.createElement('div');
    subtitle.className = 'blind-header-subtitle';
    subtitle.textContent = `${character.name} 同席 · 当前金币 ${run.gold} 金 · ${inShop ? '正在商店筹备，可查验本章所有场次' : '筹备妥当即可入场'}`;
    header.append(tag, title, subtitle);
    wrap.append(header, status);

    const grid = document.createElement('div');
    grid.className = 'blind-cards-grid';

    // --- Card 1: 暖场 ---
    const card0 = document.createElement('div');
    card0.className = 'blind-card' + (currentInChapter === 0 ? ' is-active' : '');
    if (run.stageIndex > start) {
      const stamp = document.createElement('div');
      stamp.className = 'blind-stamp-cleared';
      stamp.textContent = '已过关';
      card0.append(stamp);
    }
    const pill0 = document.createElement('span');
    pill0.className = 'blind-tag-pill blind-tag-small';
    pill0.textContent = '暖场 · 基础盲注';
    const title0 = document.createElement('h3');
    title0.className = 'blind-card-title';
    title0.textContent = stage0.name;
    card0.append(pill0, title0);
    card0.append(createStatRow('目标热度', heatText(stage0.targetHeat)));
    card0.append(createStatRow('过关奖励', '结算奖金 + 利息'));

    const skipBox0 = document.createElement('div');
    skipBox0.className = 'blind-skip-box';
    const skipLabel0 = document.createElement('span');
    skipLabel0.textContent = '跳场奖励';
    const skipVal0 = document.createElement('strong');
    skipVal0.textContent = '买牌减2金券';
    skipBox0.append(skipLabel0, skipVal0);
    card0.append(skipBox0);

    const actions0 = document.createElement('div');
    actions0.className = 'blind-card-actions';
    if (currentInChapter === 0) {
      if (inShop) {
        const btnClose = document.createElement('button');
        btnClose.className = 'blind-btn is-primary';
        btnClose.type = 'button';
        btnClose.textContent = '已在筹备中 · 返回商店';
        btnClose.onclick = () => dialog.close();
        actions0.append(btnClose);
      } else {
        const btnEnter = document.createElement('button');
        btnEnter.className = 'blind-btn is-primary';
        btnEnter.type = 'button';
        btnEnter.textContent = '进入暖场 ›';
        btnEnter.onclick = () => {
          if (!busy && !closed) {entered = true;dialog.close();}
        };
        actions0.append(btnEnter);
      }
      const btnSkip = document.createElement('button');
      btnSkip.className = 'blind-btn is-skip';
      btnSkip.type = 'button';
      btnSkip.textContent = '跳过此场（得券）';
      btnSkip.disabled = !scene;
      btnSkip.onclick = () => skipStage(btnSkip);
      actions0.append(btnSkip);
    } else {
      const btnDone = document.createElement('button');
      btnDone.className = 'blind-btn';
      btnDone.disabled = true;
      btnDone.textContent = run.stageIndex > start ? '已顺利过关' : '未入场';
      actions0.append(btnDone);
    }
    card0.append(actions0);
    grid.append(card0);

    // --- Card 2: 正场 ---
    const card1 = document.createElement('div');
    card1.className = 'blind-card' + (currentInChapter === 1 ? ' is-active' : '');
    if (run.stageIndex > start + 1) {
      const stamp = document.createElement('div');
      stamp.className = 'blind-stamp-cleared';
      stamp.textContent = '已过关';
      card1.append(stamp);
    }
    const pill1 = document.createElement('span');
    pill1.className = 'blind-tag-pill blind-tag-big';
    pill1.textContent = '正场 · 高额盲注';
    const title1 = document.createElement('h3');
    title1.className = 'blind-card-title';
    title1.textContent = stage1.name;
    card1.append(pill1, title1);
    card1.append(createStatRow('目标热度', heatText(stage1.targetHeat)));
    card1.append(createStatRow('过关奖励', '结算奖金 + 利息'));

    const skipBox1 = document.createElement('div');
    skipBox1.className = 'blind-skip-box';
    const skipLabel1 = document.createElement('span');
    skipLabel1.textContent = '跳场奖励';
    const skipVal1 = document.createElement('strong');
    skipVal1.textContent = normalSkipReward;
    skipBox1.append(skipLabel1, skipVal1);
    card1.append(skipBox1);

    const actions1 = document.createElement('div');
    actions1.className = 'blind-card-actions';
    if (currentInChapter === 1) {
      if (inShop) {
        const btnClose = document.createElement('button');
        btnClose.className = 'blind-btn is-primary';
        btnClose.type = 'button';
        btnClose.textContent = '已在筹备中 · 返回商店';
        btnClose.onclick = () => dialog.close();
        actions1.append(btnClose);
      } else {
        const btnEnter = document.createElement('button');
        btnEnter.className = 'blind-btn is-primary';
        btnEnter.type = 'button';
        btnEnter.textContent = '进入正场 ›';
        btnEnter.onclick = () => {
          if (!busy && !closed) {entered = true;dialog.close();}
        };
        actions1.append(btnEnter);
      }
      const btnSkip = document.createElement('button');
      btnSkip.className = 'blind-btn is-skip';
      btnSkip.type = 'button';
      btnSkip.textContent = '跳过此场（得道具）';
      btnSkip.disabled = !scene;
      btnSkip.onclick = () => skipStage(btnSkip);
      actions1.append(btnSkip);
    } else {
      const btnDone = document.createElement('button');
      btnDone.className = 'blind-btn';
      btnDone.disabled = true;
      btnDone.textContent = run.stageIndex > start + 1 ? '已顺利过关' : '未到此场';
      actions1.append(btnDone);
    }
    card1.append(actions1);
    grid.append(card1);

    // --- Card 3: 压轴 · 强敌 ---
    const card2 = document.createElement('div');
    card2.className = 'blind-card is-boss' + (currentInChapter === 2 ? ' is-active' : '');
    if (run.stageIndex > start + 2) {
      const stamp = document.createElement('div');
      stamp.className = 'blind-stamp-boss-cleared';
      stamp.textContent = '压轴大捷';
      card2.append(stamp);
    }
    const pill2 = document.createElement('span');
    pill2.className = 'blind-tag-pill blind-tag-boss';
    pill2.textContent = '压轴 · Boss盲注';
    const title2 = document.createElement('h3');
    title2.className = 'blind-card-title boss-title';
    title2.textContent = bossDef.name;
    card2.append(pill2, title2);
    card2.append(createStatRow('决战目标', heatText(stage2.targetHeat), true));

    const dangerPlate = document.createElement('div');
    dangerPlate.className = 'boss-danger-plate';
    const dangerHead = document.createElement('div');
    dangerHead.className = 'boss-danger-heading';
    const dangerIcon = document.createElement('span');
    dangerIcon.textContent = '⚠️';
    const dangerTitle = document.createElement('strong');
    dangerTitle.textContent = `【${bossDef.name} · 致命禁令】`;
    dangerHead.append(dangerIcon, dangerTitle);
    const dangerRule = document.createElement('p');
    dangerRule.className = 'boss-danger-rule';
    dangerRule.textContent = `${bossDef.rule}${disabledSuitText}`;
    const dangerHint = document.createElement('p');
    dangerHint.className = 'boss-danger-hint';
    dangerHint.textContent = `应对：${bossDef.response}`;
    dangerPlate.append(dangerHead, dangerRule, dangerHint);
    card2.append(dangerPlate);

    const skipBox2 = document.createElement('div');
    skipBox2.className = 'blind-skip-box is-locked';
    const skipLabel2 = document.createElement('span');
    skipLabel2.textContent = '跳场限制';
    const skipVal2 = document.createElement('strong');
    skipVal2.textContent = '🔒 压轴强敌 · 不可跳过';
    skipBox2.append(skipLabel2, skipVal2);
    card2.append(skipBox2);

    const actions2 = document.createElement('div');
    actions2.className = 'blind-card-actions';
    if (currentInChapter === 2) {
      const btnBoss = document.createElement('button');
      btnBoss.className = 'blind-btn is-boss-primary';
      btnBoss.type = 'button';
      btnBoss.textContent = inShop ? '返回商店备战 ›' : '迎战强敌 ›';
      btnBoss.onclick = () => {
        if (inShop) {
          dialog.close();
        } else {
        if (!busy && !closed) {entered = true;dialog.close();}
        }
      };
      actions2.append(btnBoss);
    } else {
      const btnDone = document.createElement('button');
      btnDone.className = 'blind-btn';
      btnDone.disabled = true;
      btnDone.textContent = run.stageIndex > start + 2 ? '强敌已击败' : '强敌在后 · 提前备战';
      actions2.append(btnDone);
    }
    card2.append(actions2);
    grid.append(card2);

    wrap.append(grid);
    const targetContainer = d.querySelector('.dialog-intro') ?? d.querySelector('.dialog-copy');
    targetContainer?.replaceChildren(wrap);
  });
}
