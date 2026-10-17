import {afterEach, beforeEach, describe, it, expect, vi} from 'vitest';
import {presentStageSelection} from '../src/game/BlindSelectPresentation';
import {DetailDialog} from '../src/game/DetailDialog';
import {createRun, type R2RunState} from '../src/domain/run';
import {R2_BOSSES} from '../src/domain/r2Chapter';

class MockElement {
  readonly children: MockElement[] = [];
  parentElement: MockElement | null = null;
  className = '';
  dataset: Record<string, string> = {};
  disabled = false;
  private _innerHTML = '';
  get innerHTML(): string { return this._innerHTML; }
  set innerHTML(val: string) {
    this._innerHTML = val;
    this.text = val.replace(/<[^>]*>/g, '');
  }
  onclick: ((event: any) => unknown) | null = null;
  private text = '';
  private readonly attributes = new Map<string, string>();
  readonly style = { setProperty: vi.fn(), removeProperty: vi.fn() };
  readonly classList = {
    contains: (name: string) => this.className.split(/\s+/).includes(name),
    add: (...names: string[]) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(' '); },
    remove: (...names: string[]) => { this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); },
  };

  constructor(readonly tagName: string) {}

  get isConnected(): boolean { return true; }
  get textContent(): string { return this.text + this.children.map(c => c.textContent).join(''); }
  set textContent(value: string) { this.text = value; this.replaceChildren(); }

  append(...nodes: MockElement[]) {
    for (const node of nodes) {
      node.remove();
      node.parentElement = this;
      this.children.push(node);
    }
  }

  replaceChildren(...nodes: MockElement[]) {
    for (const child of [...this.children]) child.remove();
    this.append(...nodes);
  }

  remove() {
    if (!this.parentElement) return;
    const s = this.parentElement.children;
    s.splice(s.indexOf(this), 1);
    this.parentElement = null;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
    if (name === 'class') this.className = value;
  }

  getAttribute(name: string) {
    if (name === 'class') return this.className;
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name: string) { this.attributes.delete(name); }

  matches(selector: string): boolean {
    const tag = selector.match(/^[a-z]+/i)?.[0];
    return (!tag || this.tagName === tag.toUpperCase()) &&
      [...selector.matchAll(/\.([\w-]+)/g)].every(([, name]) => this.classList.contains(name)) &&
      [...selector.matchAll(/\[([\w-]+)(?:=["']?([^"'\]]+)["']?)?\]/g)].every(([, name, value]) => value === undefined ? this.getAttribute(name) !== null : this.getAttribute(name) === value);
  }

  querySelectorAll(selector: string): MockElement[] {
    return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }

  querySelector(selector: string): MockElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  click() {
    if (!this.disabled) this.onclick?.({ type: 'click' });
  }

  showModal() { this.setAttribute('open', ''); }
  close() { this.removeAttribute('open'); }
  focus() {}

  private listeners: Record<string, ((event: any) => void)[]> = {};
  addEventListener(event: string, fn: any) {
    (this.listeners[event] = this.listeners[event] || []).push(fn);
  }
  removeEventListener(event: string, fn: any) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== fn);
    }
  }
  dispatchEvent(event: any) {
    const list = this.listeners[event.type || event] || [];
    for (const fn of list) fn(event);
    return true;
  }
}

let dom: { body: MockElement; activeElement: MockElement | null; createElement: (t: string) => MockElement; querySelector: (s: string) => MockElement | null };

beforeEach(() => {
  const body = new MockElement('BODY');
  dom = {
    body,
    activeElement: body,
    createElement: tag => new MockElement(tag.toUpperCase()),
    querySelector: selector => body.querySelector(selector),
  };
  vi.stubGlobal('document', dom);
  vi.stubGlobal('HTMLElement', MockElement);
  vi.stubGlobal('HTMLDialogElement', MockElement);
  vi.stubGlobal('HTMLButtonElement', MockElement);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeRun(stageIndex: number, bossId: string = 'B04', phase: 'stage-ready' | 'shop' = 'stage-ready'): R2RunState {
  const run = createRun({
    seed: 'blind-select-test',
    runId: 'run/blind-test',
    characterId: 'erxiang',
    rulesVersion: 'r2',
    modeConfig: {mode: 'standard', difficulty: 0, challengeId: null, programsEnabled: false},
  }) as R2RunState;
  run.stageIndex = stageIndex;
  run.phase = phase;
  run.boss = {definitionId: bossId as any, disabledSuit: bossId === 'B03' ? 'spades' : null};
  return run;
}

describe('Three-fold Blind Selection & Boss Alert Presentation', () => {
  it('displays the three stages, highlights active stage, and shows boss danger plate in warm-up', async () => {
    const run = makeRun(0, 'B04'); // Chapter 1, stage 0 (暖场), Boss B04 (素颜场)
    const dialog = new DetailDialog();
    const mockScene = {audio: {select: vi.fn(), sourceCue: vi.fn()}} as any;

    const promise = presentStageSelection(dialog, run, mockScene);
    const host = dialog.current as unknown as MockElement;
    expect(host).toBeTruthy();

    expect(mockScene.audio.select).toHaveBeenCalled();
    expect(host.querySelector('.blind-header-tag')?.textContent).toContain('第 1 章 · 节目录');

    // Cards
    const cards = host.querySelectorAll('.blind-card');
    expect(cards).toHaveLength(3);
    expect(cards[0].classList.contains('is-active')).toBe(true);
    expect(cards[2].classList.contains('is-boss')).toBe(true);

    // Boss warning plate is already visible in advance!
    const bossPlate = host.querySelector('.boss-danger-plate');
    expect(bossPlate).toBeTruthy();
    expect(bossPlate!.textContent).toContain('素颜场');
    expect(bossPlate!.textContent).toContain('J/Q/K本场失效');

    dialog.close();
    const result = await promise;
    expect(result).toBe(false);
  });

  it('triggers boss audio and highlights boss card with 迎战强敌 in boss stage', async () => {
    const run = makeRun(2, 'B03'); // Chapter 1, stage 2 (压轴), Boss B03 (单色灯 ♠)
    const dialog = new DetailDialog();
    const mockScene = {audio: {select: vi.fn(), sourceCue: vi.fn()}} as any;

    const promise = presentStageSelection(dialog, run, mockScene);
    const host = dialog.current as unknown as MockElement;
    expect(host).toBeTruthy();

    expect(mockScene.audio.sourceCue).toHaveBeenCalledWith('boss');

    const cards = host.querySelectorAll('.blind-card');
    expect(cards[2].classList.contains('is-active')).toBe(true);
    expect(cards[2].classList.contains('is-boss')).toBe(true);

    // Boss title and suit callout
    expect(cards[2].textContent).toContain('单色灯');
    expect(cards[2].textContent).toContain('♠');

    // Previous stages marked cleared
    const stamps = host.querySelectorAll('.blind-stamp-cleared');
    expect(stamps.length).toBeGreaterThanOrEqual(1);

    // Enter boss button
    const enterBtn = cards[2].querySelector('.is-boss-primary');
    expect(enterBtn).toBeTruthy();
    expect(enterBtn!.textContent).toContain('迎战强敌');

    // Click enter
    enterBtn!.click();
    const result = await promise;
    expect(result).toBe(true);
  });

  it('supports in-shop preview without breaking current shopping', async () => {
    const run = makeRun(0, 'B04', 'shop');
    const dialog = new DetailDialog();

    const promise = presentStageSelection(dialog, run);
    const host = dialog.current as unknown as MockElement;
    expect(host).toBeTruthy();

    expect(host.querySelector('.blind-header-subtitle')?.textContent).toContain('正在商店筹备');

    dialog.close();
    const result = await promise;
    expect(result).toBe(false);
  });

  it('handles all 16 boss definitions smoothly without crash', () => {
    const dialog = new DetailDialog();
    for (const boss of R2_BOSSES) {
      const run = makeRun(2, boss.id);
      expect(() => presentStageSelection(dialog, run)).not.toThrow();
      const host = dialog.current as unknown as MockElement;
      expect(host.querySelector('.boss-danger-plate')?.textContent).toContain(boss.name);
      dialog.close();
    }
  });
});
