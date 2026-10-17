import type Phaser from 'phaser';
import type {R2RunState} from '../domain/r2Run';
import {getR2Stage, r2ConsumableCapacity} from '../domain/r2Run';
import {R2_BOSSES} from '../domain/r2Chapter';
import {SUIT_SYMBOL} from '../cards/types';
import {SKIP_ITEM_LABELS} from './ConsumableDialog';
import {heatText} from './scoreText';
import {getCharacter} from './characters';
import {characterArt} from './CharacterArt';
import {DetailDialog} from './DetailDialog';
import {dispatchRun, runController} from './runAdapter';
import {paperSceneStart} from './PaperFlow';
import {gameSession} from './session';
import type {IntermissionResult} from './IntermissionScene';
import './BlindSelectPresentation.css';
import {trackBossRulesVisible} from './BossPreparationPresentation';
import {programEntryLabel} from './ProgramDialog';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function presentStageSelection(dialog: DetailDialog, run: R2RunState, scene?: Phaser.Scene,program?:()=>void): Promise<boolean> {
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
  const bossDef = R2_BOSSES.find(b => b.id === boss.definitionId)!;
  const disabledSuitText = boss.disabledSuit ? ` · 失效花色【${SUIT_SYMBOL[boss.disabledSuit]}】` : '';
  const normalSkipReward = run.consumables.length >= r2ConsumableCapacity(run)
    ? '道具栏已满，改得 1 金'
    : SKIP_ITEM_LABELS[run.chapterSkipConsumable] ?? '本章消耗道具';
  const skipRewards = ['买牌减2金券', normalSkipReward];
  const inShop = run.phase === 'shop';

  if (scene) {
    const audio = (scene as unknown as {audio?: {sourceCue: (k: string) => void; select: () => void}}).audio;
    if (isBoss) audio?.sourceCue('boss');
    else audio?.select();
  }

  return new Promise(resolve => {
    let entered = false;
    let closed = false;
    let busy = false;
    let retryPending = false;
    let stopRules=()=>{};
    const owner = scene && runController(scene);
    const stageNames = ['暖场', '正场', '压轴'];
    const currentName = stageNames[currentInChapter];
    const d = dialog.open(
      `第 ${chapter} 章`,
      '',
      [...(inShop ? [] : [{
        label: isBoss ? '迎战强敌 ›' : `进入${currentName} ›`,
        primary: true,
        run: () => {
          if (!busy && !closed) {entered = true;dialog.close();}
        },
      }]),...(program?[{label:programEntryLabel(run),run:()=>{if(!busy&&!closed){dialog.close(d);queueMicrotask(program);}}}]:[])],
      {closeLabel: inShop ? '返回商店' : '稍后开战', onClose: () => {closed = true;stopRules();resolve(entered);}}
    );
    d.classList.add('blind-select-dialog');
    d.dataset.currentStage = String(currentInChapter);
    d.dataset.context = inShop ? 'shop' : 'entrance';
    const header = d.querySelector('.dialog-header');
    header?.append(element('span', 'blind-chapter-caption', '三场对峙'),
      element('span', 'blind-wallet', `${character.name} · ${run.gold} 金`));

    const wrap = element('div', 'blind-dialog-inner');
    const status = element('p', 'blind-operation-status');
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


    const grid = element('section', 'blind-confrontation');
    grid.setAttribute('aria-label', '本章三场，按暖场、正场、压轴递进');
    for (const [index, stage] of [stage0, stage1, stage2].entries()) {
      const active = index === currentInChapter;
      const cleared = index < currentInChapter;
      const bossStage = index === 2;
      const card = element('article', 'blind-card' + (active ? ' is-active' : '') + (bossStage ? ' is-boss' : '') + (cleared ? ' is-cleared' : ''));
      card.setAttribute('aria-label', `${stageNames[index]} · ${active ? '当前场' : cleared ? '已过关' : '后续场'}`);
      if (active) card.setAttribute('aria-current', 'step');
      const heading = element('header', 'blind-stage-heading');
      const number = element('span', 'blind-stage-number', ['壹', '贰', '叁'][index]);
      number.setAttribute('aria-hidden', 'true');
      const identity = element('div', 'blind-stage-identity');
      identity.append(element('p', 'blind-stage-state', active ? (inShop ? '当前场 · 正在商店筹备' : '当前可战') : cleared ? '已过关' : '后续对局'),
        element('h3', 'blind-card-title', bossStage ? bossDef.name : stageNames[index]));
      heading.append(number, identity);
      if (bossStage) identity.append(element('span', 'blind-boss-label', '压轴 · 不可跳过'));
      card.append(heading);

      if (active) {
        const art = characterArt(run.characterId, 'selection') ?? characterArt(run.characterId, 'portrait');
        if (art) {
          const figure = element('figure', 'blind-hero');
          const portrait = element('img', 'blind-hero-image');
          portrait.src = art.url;portrait.alt = '';
          portrait.width = art.width;portrait.height = art.height;
          // Existing approved art is this run's hero, never an invented Boss portrait.
          portrait.decoding = 'async';
          portrait.onerror = () => {figure.classList.add('art-unavailable');};
          figure.append(portrait, element('figcaption', 'blind-hero-name', character.name));
          card.append(figure);
        }
      }

      const info = element('div', 'blind-stage-info');
      const target = element('p', 'blind-target');
      target.append(element('span', 'blind-target-label', bossStage ? '决战目标' : '目标热度'),
        element('strong', 'blind-target-value', heatText(stage.targetHeat)));
      info.append(target);
      if (bossStage) {
        const rule = element('section', 'blind-boss-declaration');
        rule.setAttribute('aria-label', `${bossDef.name}的本场规则`);
        rule.append(element('p', 'blind-boss-rule', bossDef.rule + disabledSuitText),
          element('p', 'blind-boss-response', '应对 · ' + bossDef.response));
        info.append(rule);
      }
      info.append(element('p', 'blind-clear-reward', '过关 · 结算奖金 + 利息'));
      if (!bossStage) {
        info.append(element('p', 'blind-skip-reward', '跳场 · ' + skipRewards[index]));
        if (active) info.append(element('p', 'blind-skip-cost', '代价 · 放弃本场结算奖金、利息与过关效果'));
      }
      card.append(info);
      grid.append(card);
    }

    wrap.append(grid, status);
    const targetContainer = d.querySelector('.dialog-intro') ?? d.querySelector('.dialog-copy');
    targetContainer?.replaceChildren(wrap);
    // One start action lives in the persistent footer; preview cards never duplicate it.
    if (!isBoss) {
      const skip = element('button', 'blind-skip-action is-skip', '跳过此场');
      skip.type = 'button';skip.disabled = !scene;
      // Confirmation is local view intent. Cancellation never dispatches or writes a save.
      const confirmation = element('section', 'blind-skip-confirm');
      confirmation.hidden = true;
      confirmation.setAttribute('aria-label', '跳场确认');
      const cancel = element('button', 'blind-skip-cancel', '保留此场');
      cancel.type = 'button';
      confirmation.append(element('strong', '', `跳过${currentName}？`),
        element('p', '', `获得${skipRewards[currentInChapter]}；放弃本场结算奖金、利息与过关效果。`), cancel);
      grid.querySelector('.is-active')?.append(confirmation);
      const primary = d.querySelector<HTMLButtonElement>('.dialog-primary');
      const resetConfirmation = () => {
        confirmation.hidden = true;skip.textContent = '跳过此场';
        if (primary) primary.disabled = false;
      };
      cancel.onclick = () => {if (!busy) {resetConfirmation();skip.focus();}};
      skip.onclick = () => {
        if (!scene || busy || closed || !dialog.active(d)) return;
        if (retryPending || !confirmation.hidden) {resetConfirmation();return skipStage(skip);}
        confirmation.hidden = false;skip.textContent = '确认跳场';
        if (primary) primary.disabled = true;
        confirmation.scrollIntoView?.({block: 'nearest'});cancel.focus();
      };
      d.addEventListener('cancel', event => {
        if (!busy && !confirmation.hidden) {
          event.preventDefault();event.stopImmediatePropagation();resetConfirmation();skip.focus();
        }
      }, true);
      const actions = d.querySelector('.dialog-actions');
      const close = d.querySelector('.dialog-close');
      if (actions && close) {close.remove();actions.append(skip, close);}
    }
    // The shell's initial close-button focus must not scroll the newly populated chapter header away.
    d.scrollTop = 0;
    if(isBoss)stopRules=trackBossRulesVisible(run,d,()=>!closed&&dialog.active(d)&&(!scene||scene.scene.isActive()&&runController(scene)===owner&&owner?.state===run));
  });
}
