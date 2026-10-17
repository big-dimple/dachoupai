import type {R2RunState} from '../domain/r2Run';
import {getR2Stage} from '../domain/r2Run';
import {R2_BOSSES} from '../domain/r2Chapter';
import type {DetailDialog} from './DetailDialog';
import {bossScope, stageSuitLabel} from './StageIdentity';
import {heatText} from './scoreText';
import './BossPreparationPresentation.css';

export interface BossPreparationFacts {
  readonly key: string;
  readonly chapter: number;
  readonly stageIndex: number;
  readonly name: string;
  readonly scope: string;
  readonly rule: string;
  readonly advice: string;
  readonly targetHeat: string;
  readonly suit: string | null;
}

/** Only an already-saved preparation shop is eligible; no stage or reward is entered here. */
export function bossPreparationFacts(run: R2RunState): BossPreparationFacts | undefined {
  if (run.phase !== 'shop' || !run.shop || run.stageIndex % 3 !== 2) return;
  const stage = getR2Stage(run.stageIndex, run.tourMode, run.difficulty, run);
  const definition = R2_BOSSES.find(boss => boss.id === run.boss.definitionId);
  if (!stage || !definition || definition.id === 'B03' && !run.boss.disabledSuit) return;
  return {
    key: JSON.stringify([run.runId, run.characterId, run.contentVersion, run.contentHash, run.mode,
      run.challengeId, run.difficulty, run.programsEnabled, run.tourMode, run.stageIndex, run.boss.definitionId, run.boss.disabledSuit]),
    chapter: Math.floor(run.stageIndex / 3) + 1,
    stageIndex: run.stageIndex,
    name: definition.name,
    scope: bossScope(run.boss),
    rule: definition.rule,
    advice: definition.response,
    targetHeat: stage.targetHeat,
    suit: run.boss.disabledSuit ? stageSuitLabel(run.boss.disabledSuit) : null,
  };
}

export const BOSS_PREPARATION_SEEN_KEY = 'dachoupai.boss-preparation-seen.v1';
interface SeenStorage {getItem(key: string): string | null; setItem(key: string, value: string): void}
export interface BossPreparationHistory {has(key: string): boolean; mark(key: string): void}

/** Optional session UI history, separate from checkpoints, commands and RNG. */
export function createBossPreparationHistory(storage: () => SeenStorage): BossPreparationHistory {
  let seen: string[] = [];
  let memoryOnly = false;
  const read = () => {
    if (!memoryOnly) try {
      const raw = storage().getItem(BOSS_PREPARATION_SEEN_KEY);
      const value: unknown = raw && raw.length <= 131072 ? JSON.parse(raw) : [];
      seen = Array.isArray(value) && value.length <= 64 && value.every(key => typeof key === 'string' && key.length <= 2048)
        ? [...new Set<string>(value)] : [];
    } catch { /* Keep session memory if optional storage is unavailable. */ }
    return seen;
  };
  return {
    has: key => read().includes(key),
    mark: key => {
      if (key.length > 2048) return;
      seen = [...read().filter(previous => previous !== key), key].slice(-64);
      try {storage().setItem(BOSS_PREPARATION_SEEN_KEY, JSON.stringify(seen));}
      catch {memoryOnly = true;}
    },
  };
}
const sessionHistory = createBossPreparationHistory(() => globalThis.sessionStorage);

export type BossPreparationStatus = 'shown' | 'seen' | 'not-applicable' | 'deferred';
export interface BossPreparationOptions {
  /** The owner checks the original scene lifecycle, controller and saved snapshot. */
  valid: () => boolean;
  /** Start the audio owner's bounded Boss transition here, never before this visible signal. */
  onReveal: (facts: BossPreparationFacts) => void;
  onFinish?: (choice: 'prepare' | 'dismissed') => void;
  history?: BossPreparationHistory;
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** Render before shop music changes. The owner still owns the shop, audio and all saved actions. */
export function presentBossPreparation(dialog: DetailDialog, run: R2RunState, options: BossPreparationOptions): BossPreparationStatus {
  const facts = bossPreparationFacts(run);
  if (!facts) return 'not-applicable';
  if (!options.valid()) return 'deferred';
  const history = options.history ?? sessionHistory;
  if (history.has(facts.key)) return 'seen';
  if (dialog.current || document.querySelector('dialog[open]')) return 'deferred';

  let closed = false, revealed = false;
  let frame: number | undefined;
  let choice: 'prepare' | 'dismissed' = 'dismissed';
  const finish = (next: typeof choice) => {
    if (closed || !dialog.active(modal)) return;
    if (options.valid()) {
      // A user can enter immediately; the intro never waits for an animation timer.
      reveal();choice = next;
    }
    dialog.close(modal);
  };
  const modal = dialog.open(facts.name, '', [{label: '进入备战商店', primary: true, run: () => finish('prepare')}], {
    closeLabel: '收起预告',
    onClose: () => {
      closed = true;
      if (frame !== undefined) cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visible);
      // Let the shared dialog finish restoring focus before a caller opens its next panel.
      if (options.onFinish) queueMicrotask(() => {if (options.valid()) options.onFinish?.(choice);});
    },
  });
  modal.classList.add('boss-preparation-dialog');
  modal.dataset.bossPreparation = String(facts.stageIndex);
  const header = modal.querySelector('.dialog-header');
  header?.append(node('span', 'boss-preparation-chapter', `第 ${facts.chapter} 章 · 压轴将至`));
  const page = node('section', 'boss-preparation-page');
  page.setAttribute('aria-label', '强敌将至，先备战再入场');
  const seal = node('div', 'boss-preparation-seal', '压轴');
  seal.setAttribute('aria-hidden', 'true');
  const challenge = node('div', 'boss-preparation-challenge');
  challenge.append(node('p', 'boss-preparation-scope', facts.scope));
  const target = node('p', 'boss-preparation-target');
  target.append(node('span', '', '决战目标'), node('strong', '', heatText(facts.targetHeat)));
  challenge.append(target);
  const rule = node('section', 'boss-preparation-rule');
  rule.setAttribute('aria-label', '本场限制');
  rule.append(node('h3', '', '本场限制'), node('p', '', facts.rule));
  if (facts.suit) rule.append(node('p', 'boss-preparation-suit', '失效花色 · ' + facts.suit));
  const advice = node('section', 'boss-preparation-advice');
  advice.setAttribute('aria-label', '备战建议');
  advice.append(node('h3', '', '先这样准备'), node('p', '', facts.advice));
  page.append(seal, challenge, rule, advice);
  (modal.querySelector('.dialog-intro') ?? modal.querySelector('.dialog-copy'))?.replaceChildren(page);
  modal.scrollTop = 0;

  function reveal(): void {
    if (closed || revealed || !dialog.active(modal)) return;
    if (!options.valid()) {dialog.close(modal);return;}
    if (document.hidden || !modal.open || !modal.isConnected || !modal.getClientRects().length) return;
    revealed = true;
    history.mark(facts!.key);
    // An unavailable audio signal must not prevent preparing or dismissing the page.
    try {options.onReveal(facts!);} catch { /* Audio remains the caller's optional presentation. */ }
  }
  function visible(): void {
    if (closed || revealed || document.hidden || frame !== undefined) return;
    frame = requestAnimationFrame(() => {frame = undefined;reveal();});
  }
  document.addEventListener('visibilitychange', visible);
  visible();
  return 'shown';
}
