import {afterEach, beforeEach, describe, it, expect, vi} from 'vitest';
import {presentStageSelection} from '../src/game/BlindSelectPresentation';
import {DetailDialog} from '../src/game/DetailDialog';
import {applyCommand, createRun, type R2RunState} from '../src/domain/run';
import {R2_BOSSES} from '../src/domain/r2Chapter';
import {r2ConsumableCapacity} from '../src/domain/r2Resources';
import {dispatchRun,runController} from '../src/game/runAdapter';
import {paperSceneStart} from '../src/game/PaperFlow';
import {gameSession} from '../src/game/session';

vi.mock('../src/game/runAdapter',()=>({dispatchRun:vi.fn(),runController:vi.fn()}));
vi.mock('../src/game/PaperFlow',()=>({paperSceneStart:vi.fn()}));
vi.mock('../src/game/session',()=>({gameSession:vi.fn()}));

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
    if (!this.disabled) return this.onclick?.({ type: 'click' });
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
  vi.resetAllMocks();
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
  Object.assign(dom,{addEventListener:vi.fn(),removeEventListener:vi.fn()});
  vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());
});

describe('directory commands and settlement contract',()=>{
  const scene=()=>({audio:{select:vi.fn(),sourceCue:vi.fn()},scene:{isActive:()=>true}} as any);
  function commandRun(index=0){
    let run=createRun({seed:'blind-command-test',runId:'run/blind-command',characterId:'erxiang',rulesVersion:'r2'}) as R2RunState;
    const send=(type:'SkipStage'|'OpenShop'|'LeaveShop')=>{const r=applyCommand(run,{runId:run.runId,commandId:'test/'+run.commandSeq,expectedSeq:run.commandSeq,action:{type}});if(!r.ok)throw Error(r.code);run=r.state;};
    for(let i=0;i<index;i++){send('SkipStage');send('OpenShop');}send('LeaveShop');return run;
  }
  function savedSkip(run:R2RunState){
    const result=applyCommand(run,{runId:run.runId,commandId:run.runId+'/command/'+(run.commandSeq+1),expectedSeq:run.commandSeq,action:{type:'SkipStage'}});
    expect(result.ok).toBe(true);return result;
  }
  it.each([0,1])('passes the saved flat IntermissionResult for stage %s exactly once',async index=>{
    const run=commandRun(index),result=savedSkip(run),owner={state:run};
    vi.mocked(runController).mockReturnValue(owner as any);
    let finish!:(r:any)=>void;vi.mocked(dispatchRun).mockImplementation(()=>new Promise(resolve=>finish=resolve));
    const dialog=new DetailDialog(),s=scene(),done=presentStageSelection(dialog,run,s),host=dialog.current as unknown as MockElement;
    const skip=host.querySelector('.is-skip')!;skip.click();const first=skip.click();
    await skip.onclick?.({}); // A stale/programmatic second handler also cannot dispatch.
    expect(dispatchRun).toHaveBeenCalledTimes(1);expect(host.querySelectorAll('button').every(b=>b.disabled)).toBe(true);
    finish(result);await first;expect(await done).toBe(false);
    expect(dispatchRun).toHaveBeenCalledWith(s,{type:'SkipStage'},run.commandSeq);
    if(!result.ok)throw Error('skip failed');const stage=result.state.stage!;
    expect(paperSceneStart).toHaveBeenCalledExactlyOnceWith(s,'intermission',{cleared:true,stageIndex:stage.index,stageHeat:stage.heat,handsLeft:stage.handsLeft,goldEarned:stage.goldEarned});
  });
  it('a rejected command or thrown error restores controls and remains retryable',async()=>{
    const run=commandRun(),dialog=new DetailDialog();vi.mocked(dispatchRun).mockRejectedValueOnce(Error('transport')).mockResolvedValueOnce({ok:false,code:'command-busy',state:run});
    void presentStageSelection(dialog,run,scene());const host=dialog.current as unknown as MockElement,skip=host.querySelector('.is-skip')!;
    skip.click();await skip.click();expect(skip.disabled).toBe(false);expect(host.querySelector('.blind-operation-status')?.textContent).toContain('请重试');
    skip.click();await skip.click();expect(skip.disabled).toBe(false);expect(dispatchRun).toHaveBeenCalledTimes(2);expect(paperSceneStart).not.toHaveBeenCalled();dialog.close();
  });
  it('save retry persists the same candidate without sending another SkipStage',async()=>{
    const run=commandRun(),saved=savedSkip(run),owner={state:run},retry=vi.fn(async()=>{if(saved.ok)owner.state=saved.state;return true;});
    vi.mocked(runController).mockReturnValue(owner as any);vi.mocked(gameSession).mockReturnValue({retry} as any);vi.mocked(dispatchRun).mockResolvedValue({ok:false,code:'save-failed',state:run});
    const dialog=new DetailDialog(),done=presentStageSelection(dialog,run,scene()),host=dialog.current as unknown as MockElement,skip=host.querySelector('.is-skip')!;
    skip.click();await skip.click();expect(skip.textContent).toBe('重试保存并跳场');expect(skip.disabled).toBe(false);
    await skip.click();expect(await done).toBe(false);expect(retry).toHaveBeenCalledTimes(1);expect(dispatchRun).toHaveBeenCalledTimes(1);expect(paperSceneStart).toHaveBeenCalledTimes(1);
  });
  it('offers one later action; close and stale callbacks send no commands',async()=>{
    const dialog=new DetailDialog(),run=makeRun(0),done=presentStageSelection(dialog,run,scene()),host=dialog.current as unknown as MockElement;
    expect(host.querySelectorAll('button').filter(b=>b.textContent==='稍后开战')).toHaveLength(1);
    const skip=host.querySelector('.is-skip')!;host.querySelector('.dialog-close')!.click();expect(await done).toBe(false);await skip.onclick?.({});
    expect(dispatchRun).not.toHaveBeenCalled();expect(paperSceneStart).not.toHaveBeenCalled();
  });
  it('cancels local skip confirmation without changing the current run or dispatching',async()=>{
    const run=commandRun(),before=JSON.stringify(run),dialog=new DetailDialog();
    void presentStageSelection(dialog,run,scene());const host=dialog.current as unknown as MockElement,skip=host.querySelector('.is-skip')!;
    skip.click();expect(skip.textContent).toBe('确认跳场');expect(dispatchRun).not.toHaveBeenCalled();
    expect(host.querySelector('.blind-skip-confirm')?.textContent).toContain('放弃本场结算奖金、利息与过关效果');
    expect(host.querySelector('.dialog-primary')?.disabled).toBe(true);
    host.querySelector('.blind-skip-cancel')!.click();
    expect(skip.textContent).toBe('跳过此场');expect(host.querySelector('.dialog-primary')?.disabled).toBe(false);
    expect(JSON.stringify(run)).toBe(before);expect(dispatchRun).not.toHaveBeenCalled();dialog.close();
  });
  it('a late saved skip cannot navigate a replaced scene/controller',async()=>{
    const run=commandRun(),result=savedSkip(run);let owner:any={state:run},finish!:(r:any)=>void;
    vi.mocked(runController).mockImplementation(()=>owner);vi.mocked(dispatchRun).mockImplementation(()=>new Promise(resolve=>finish=resolve));
    const dialog=new DetailDialog();void presentStageSelection(dialog,run,scene());const host=dialog.current as unknown as MockElement,skip=host.querySelector('.is-skip')!;skip.click();const click=skip.click();
    owner=undefined;finish(result);await click;expect(dispatchRun).toHaveBeenCalledTimes(1);expect(paperSceneStart).not.toHaveBeenCalled();dialog.close();
  });
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

describe('three-stage confrontation presentation', () => {
  it('shows one current stage and the real Boss rule in advance, with one start action', async () => {
    const run = makeRun(0, 'B04'); // Chapter 1, stage 0 (暖场), Boss B04 (素颜场)
    const dialog = new DetailDialog();
    const mockScene = {audio: {select: vi.fn(), sourceCue: vi.fn()}} as any;

    const promise = presentStageSelection(dialog, run, mockScene);
    const host = dialog.current as unknown as MockElement;
    expect(host).toBeTruthy();

    expect(mockScene.audio.select).toHaveBeenCalled();
    expect(host.querySelector('.dialog-header')?.textContent).toContain('第 1 章');
    expect(host.querySelector('.blind-chapter-caption')?.textContent).toBe('三场对峙');
    expect(host.querySelectorAll('.dialog-primary')).toHaveLength(1);

    // Cards
    const cards = host.querySelectorAll('.blind-card');
    expect(cards).toHaveLength(3);
    expect(cards[0].classList.contains('is-active')).toBe(true);
    expect(cards[2].classList.contains('is-boss')).toBe(true);

    expect(cards.every(card => card.querySelectorAll('.dialog-primary').length === 0)).toBe(true);
    expect(cards[0].querySelector('.blind-target-value')?.textContent).toBe('400');
    expect(cards[1].querySelector('.blind-target-value')?.textContent).toBe('600');
    expect(cards[2].querySelector('.blind-target-value')?.textContent).toBe('800');
    const bossPlate = host.querySelector('.blind-boss-declaration');
    expect(bossPlate).toBeTruthy();
    expect(cards[2].textContent).toContain('素颜场');
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
    expect(host.querySelectorAll('.is-cleared')).toHaveLength(2);
    expect(host.querySelector('.is-skip')).toBeNull();

    // Enter boss button
    const enterBtn = host.querySelector('.dialog-primary');
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

    expect(host.querySelector('.is-active')?.textContent).toContain('正在商店筹备');
    expect(host.querySelector('.dialog-primary')).toBeNull();

    dialog.close();
    const result = await promise;
    expect(result).toBe(false);
  });

  it('shows the actual full-inventory skip alternative without promising a lost item', () => {
    const run = makeRun(1), dialog = new DetailDialog();
    run.consumables = Array.from({length: r2ConsumableCapacity(run)}, (_, i) => ({instanceId: 'held/' + i, definitionId: 'T01'}));
    void presentStageSelection(dialog, run);
    const host = dialog.current as unknown as MockElement;
    expect(host.querySelector('.is-active')?.textContent).toContain('道具栏已满，改得 1 金');
    dialog.close();
  });

  it('handles all 16 boss definitions smoothly without crash', () => {
    const dialog = new DetailDialog();
    for (const boss of R2_BOSSES) {
      const run = makeRun(2, boss.id);
      expect(() => presentStageSelection(dialog, run)).not.toThrow();
      const host = dialog.current as unknown as MockElement;
      expect(host.querySelector('.is-active')?.textContent).toContain(boss.name);
      expect(host.querySelector('.blind-boss-rule')?.textContent).toContain(boss.rule);
      expect(host.querySelector('.blind-boss-response')?.textContent).toContain(boss.response);
      dialog.close();
    }
  });
});
