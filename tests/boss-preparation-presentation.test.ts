import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {DetailDialog} from '../src/game/DetailDialog';
import {applyCommand, createRun, type R2RunState} from '../src/domain/run';
import {R2_BOSSES} from '../src/domain/r2Chapter';
import {newRunIdentity} from '../src/game/RunLaunch';
import {bossPreparationFacts,bossRulesKey,bossRulesSeen,trackBossRulesVisible,createBossPreparationHistory,presentBossPreparation,BOSS_PREPARATION_SEEN_KEY} from '../src/game/BossPreparationPresentation';

/** DOM tree and native-dialog boundary only; browser layout and listening are separate checks. */
class Element {
  children: Element[] = [];
  parent: Element | undefined;
  className = '';
  dataset: Record<string, string> = {};
  open = false;
  scrollTop = 0;
  connected = false;
  onclick: (() => unknown) | undefined;
  private listeners=new Map<string,Set<()=>void>>();
  addEventListener(type:string,listener:()=>void){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type)!.add(listener);}
  removeEventListener(type:string,listener:()=>void){this.listeners.get(type)?.delete(listener);}
  dispatch(type:string){for(const listener of this.listeners.get(type)??[])listener();}
  private text = '';
  constructor(readonly tag: string) {}
  classList = {add: (name: string) => {this.className += ' ' + name;}};
  get textContent(): string {return this.text + this.children.map(child => child.textContent).join('');}
  set textContent(value: string) {this.text = value;this.children = [];}
  get isConnected(): boolean {return this.connected || !!this.parent?.isConnected;}
  setAttribute() {}
  append(...children: Element[]) {for (const child of children) {child.parent = this;this.children.push(child);}}
  replaceChildren(...children: Element[]) {for (const child of this.children) child.parent = undefined;this.children = [];this.append(...children);}
  querySelector(selector: string): Element | undefined {
    const matches = (element: Element) => selector === 'dialog[open]' ? element.tag === 'dialog' && element.open
      : element.className.split(/\s+/).includes(selector.slice(1));
    for (const child of this.children) {if (matches(child)) return child;const nested = child.querySelector(selector);if (nested) return nested;}
  }
  getClientRects() {return this.isConnected && this.open ? [{}] : [];}
}

class Dialog {
  current: Element | undefined;
  private onClose: (() => void) | undefined;
  active(element: Element) {return this.current === element;}
  open(title: string, _body: string, actions: {label: string; primary?: boolean; run: () => void}[], options: {closeLabel: string; onClose: () => void}) {
    const modal = new Element('dialog'), header = new Element('header'), heading = new Element('h2'), copy = new Element('div'), footer = new Element('footer');
    modal.open = true;header.className = 'dialog-header';heading.textContent = title;header.append(heading);copy.className = 'dialog-copy';footer.className = 'dialog-actions';
    for (const action of actions) {const button = new Element('button');button.className = action.primary ? 'dialog-primary' : '';button.textContent = action.label;button.onclick = action.run;footer.append(button);}
    const close = new Element('button');close.className = 'dialog-close';close.textContent = options.closeLabel;close.onclick = () => this.close(modal);footer.append(close);
    modal.append(header, copy, footer);body.append(modal);this.current = modal;this.onClose = options.onClose;return modal;
  }
  close(expected?: Element) {
    if (!this.current || expected && !this.active(expected)) return;
    this.current.open = false;this.current.parent = undefined;
    this.current.dispatch('close');
    const after = this.onClose;this.current = undefined;this.onClose = undefined;after?.();
  }
}

let body: Element;
let documentState: {hidden: boolean; createElement: (tag: string) => Element; querySelector: (selector: string) => Element | undefined; addEventListener: (type: string, listener: () => void) => void; removeEventListener: (type: string, listener: () => void) => void};
let frames: Map<number, FrameRequestCallback>;
let listeners: Set<() => void>;
let storage: Map<string, string>;
const flush = () => {const batch = [...frames.values()];frames.clear();for (const callback of batch) callback(1);};
const asDialog = (dialog: Dialog) => dialog as unknown as DetailDialog;
const history = () => createBossPreparationHistory(() => ({getItem: key => storage.get(key) ?? null, setItem: (key, value) => {storage.set(key, value);}}));

beforeEach(() => {
  body = new Element('body');body.connected = true;frames = new Map();listeners = new Set();storage = new Map();let frameId = 0;
  documentState = {hidden: false, createElement: tag => new Element(tag), querySelector: selector => body.querySelector(selector),
    addEventListener: (_type, listener) => {listeners.add(listener);}, removeEventListener: (_type, listener) => {listeners.delete(listener);}};
  vi.stubGlobal('document', documentState);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {frames.set(++frameId, callback);return frameId;});
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => vi.unstubAllGlobals());

function bossShop(): R2RunState {
  let run = createRun({seed: 'boss-preparation', runId: 'run/boss-preparation', characterId: 'erxiang', rulesVersion: 'r2', r2Identity: newRunIdentity('erxiang')}) as R2RunState;
  for (const type of ['SkipStage', 'OpenShop', 'SkipStage', 'OpenShop'] as const) {
    const result = applyCommand(run, {runId: run.runId, commandId: 'prep/' + run.commandSeq, expectedSeq: run.commandSeq, action: {type}});
    if (!result.ok) throw Error(result.code);run = result.state;
  }
  return run;
}

describe('public Boss preparation facts', () => {
  it('reads the locked saved target without mutating the run and rejects other phases', () => {
    const run = bossShop();run.chapterTargetPlan!.targets[2] = '1379';const before = structuredClone(run);
    expect(bossPreparationFacts(run)?.targetHeat).toBe('1379');expect(run).toEqual(before);
    expect(bossPreparationFacts({...run, phase: 'stage-ready'})).toBeUndefined();
    expect(bossPreparationFacts({...run, stageIndex: 1})).toBeUndefined();
    expect(bossPreparationFacts({...run, shop: null})).toBeUndefined();
  });
  it.each(R2_BOSSES)('$id keeps the existing name, complete rule and one actionable response', definition => {
    const run = bossShop();run.boss = {definitionId: definition.id, disabledSuit: definition.id === 'B03' ? 'hearts' : null};
    const facts = bossPreparationFacts(run)!;
    expect(facts.name).toBe(definition.name);expect(facts.rule).toBe(definition.rule);expect(facts.advice).toBe(definition.response);
    if (definition.id === 'B03') {expect(facts.scope).toContain('红桃');expect(facts.suit).toContain('♥');}
  });
});

describe('one visible announcement per complete run identity and Boss stage', () => {
  it('shares the exact identity across preparation, stage-ready and resumed battle without touching the run',()=>{
    let run=bossShop();const seen=history(),key=bossRulesKey(run)!;seen.mark(key);
    for(const type of ['LeaveShop','EnterStage'] as const){const result=applyCommand(run,{runId:run.runId,commandId:'rules/'+run.commandSeq,expectedSeq:run.commandSeq,action:{type}});if(!result.ok)throw Error(result.code);run=result.state;expect(bossRulesKey(run)).toBe(key);expect(bossRulesSeen(run,seen)).toBe(true);}
    const before=structuredClone(run);expect(bossRulesSeen(structuredClone(run),history())).toBe(true);expect(run).toEqual(before);
    expect(bossRulesSeen({...run,contentHash:'another-profile'},seen)).toBe(false);expect(bossRulesSeen({...run,stage:{...run.stage!,boss:{definitionId:'B01',disabledSuit:null}}},seen)).toBe(run.stage?.boss?.definitionId==='B01');
  });
  it('an unseen restored rule is recorded only while its live dialog is visible, and closing cancels the late mark',()=>{
    const run=bossShop(),seen=history(),dialog=new Dialog();let valid=true;
    const modal=dialog.open('rules','',[],{closeLabel:'close',onClose:()=>{}});
    documentState.hidden=true;trackBossRulesVisible(run,modal as unknown as HTMLDialogElement,()=>valid,seen);flush();expect(bossRulesSeen(run,seen)).toBe(false);
    documentState.hidden=false;for(const listener of listeners)listener();valid=false;flush();expect(bossRulesSeen(run,seen)).toBe(false);
    valid=true;trackBossRulesVisible(run,modal as unknown as HTMLDialogElement,()=>valid,seen);dialog.close();flush();expect(bossRulesSeen(run,seen)).toBe(false);
    const visible=dialog.open('rules','',[],{closeLabel:'close',onClose:()=>{}});trackBossRulesVisible(run,visible as unknown as HTMLDialogElement,()=>true,seen);flush();expect(bossRulesSeen(run,seen)).toBe(true);
  });
  it('persists optional UI history across reload/retry and separates later Bosses and profiles', () => {
    const run = bossShop(), key = bossPreparationFacts(run)!.key;
    history().mark(key);expect(history().has(bossPreparationFacts(structuredClone(run))!.key)).toBe(true);
    expect(history().has(bossPreparationFacts({...run, stageIndex: 5})!.key)).toBe(false);
    expect(history().has(bossPreparationFacts({...run, difficulty: 1})!.key)).toBe(false);
    expect(history().has(bossPreparationFacts({...run, contentHash: 'another-profile'})!.key)).toBe(false);
  });
  it('tolerates corrupt optional storage and retains session memory after denied access', () => {
    storage.set(BOSS_PREPARATION_SEEN_KEY, '{broken');expect(history().has('one')).toBe(false);
    const denied = createBossPreparationHistory(() => {throw Error('storage denied');});
    denied.mark('one');expect(denied.has('one')).toBe(true);
  });
  it('bounds history without modifying any checkpoint keys', () => {
    const seen = history();for (let i = 0; i < 70; i++) seen.mark('stage/' + i);
    expect(JSON.parse(storage.get(BOSS_PREPARATION_SEEN_KEY)!)).toHaveLength(64);
    expect(seen.has('stage/69')).toBe(true);expect([...storage.keys()]).toEqual([BOSS_PREPARATION_SEEN_KEY]);
  });
});

describe('Boss page lifecycle and reveal signal', () => {
  it('signals audio only on the visible frame, then repeated opening is seen without another cue', async () => {
    const dialog = new Dialog(), run = bossShop(), before = structuredClone(run), onReveal = vi.fn(), onFinish = vi.fn(), seen = history();
    expect(presentBossPreparation(asDialog(dialog), run, {valid: () => true, onReveal, onFinish, history: seen})).toBe('shown');
    expect(onReveal).not.toHaveBeenCalled();expect(seen.has(bossPreparationFacts(run)!.key)).toBe(false);
    expect(dialog.current?.textContent).toContain('进入备战商店');expect(dialog.current?.textContent).toContain('本场限制');
    expect(dialog.current?.textContent).toContain(bossPreparationFacts(run)!.advice);
    expect(dialog.current?.textContent.split(bossPreparationFacts(run)!.rule)).toHaveLength(2);
    expect(dialog.current?.querySelector('.boss-preparation-scope')).toBeUndefined();
    flush();expect(onReveal).toHaveBeenCalledTimes(1);expect(seen.has(bossPreparationFacts(run)!.key)).toBe(true);
    dialog.current!.querySelector('.dialog-primary')!.onclick!();
    await Promise.resolve();
    expect(onFinish).toHaveBeenCalledExactlyOnceWith('prepare');expect(listeners.size).toBe(0);expect(frames.size).toBe(0);
    expect(presentBossPreparation(asDialog(dialog), run, {valid: () => true, onReveal, history: seen})).toBe('seen');
    expect(onReveal).toHaveBeenCalledTimes(1);expect(run).toEqual(before);
  });
  it('enter is immediately available without waiting for animation or changing saved resources', async () => {
    const dialog = new Dialog(), run = bossShop(), before = JSON.stringify(run), onReveal = vi.fn(), onFinish = vi.fn();
    presentBossPreparation(asDialog(dialog), run, {valid: () => true, onReveal, onFinish, history: history()});
    dialog.current!.querySelector('.dialog-primary')!.onclick!();flush();
    await Promise.resolve();
    expect(onReveal).toHaveBeenCalledTimes(1);expect(onFinish).toHaveBeenCalledWith('prepare');expect(JSON.stringify(run)).toBe(before);
  });
  it('dismissal/Escape has no saved action and no repeated intro after a visible reveal', async () => {
    const dialog = new Dialog(), run = bossShop(), before = JSON.stringify(run), onReveal = vi.fn(), onFinish = vi.fn(), seen = history();
    presentBossPreparation(asDialog(dialog), run, {valid: () => true, onReveal, onFinish, history: seen});flush();
    dialog.close();flush();await Promise.resolve();expect(onFinish).toHaveBeenCalledExactlyOnceWith('dismissed');expect(JSON.stringify(run)).toBe(before);
    expect(presentBossPreparation(asDialog(dialog), run, {valid: () => true, onReveal, history: seen})).toBe('seen');
  });
  it('a replaced scene cancels the late frame, cue and continuation without marking seen', async () => {
    const dialog = new Dialog(), run = bossShop(), onReveal = vi.fn(), onFinish = vi.fn(), seen = history();let valid = true;
    presentBossPreparation(asDialog(dialog), run, {valid: () => valid, onReveal, onFinish, history: seen});
    valid = false;flush();await Promise.resolve();expect(dialog.current).toBeUndefined();expect(onReveal).not.toHaveBeenCalled();expect(onFinish).not.toHaveBeenCalled();
    expect(seen.has(bossPreparationFacts(run)!.key)).toBe(false);expect(listeners.size).toBe(0);
  });
  it('closing before first visibility cancels the scheduled audio and leaves eligibility intact', () => {
    const dialog = new Dialog(), run = bossShop(), onReveal = vi.fn(), seen = history();
    presentBossPreparation(asDialog(dialog), run, {valid: () => true, onReveal, history: seen});dialog.close();flush();
    expect(onReveal).not.toHaveBeenCalled();expect(seen.has(bossPreparationFacts(run)!.key)).toBe(false);expect(frames.size).toBe(0);
  });
  it('hidden documents wait for foreground before claiming the once-only signal', () => {
    const dialog = new Dialog(), run = bossShop(), onReveal = vi.fn(), seen = history();documentState.hidden = true;
    presentBossPreparation(asDialog(dialog), run, {valid: () => true, onReveal, history: seen});flush();expect(onReveal).not.toHaveBeenCalled();
    documentState.hidden = false;for (const listener of listeners) listener();flush();expect(onReveal).toHaveBeenCalledTimes(1);dialog.close();
  });
  it('defers rather than stealing another modal or presenting from a stale owner', () => {
    const run = bossShop(), dialog = new Dialog(), onReveal = vi.fn();
    expect(presentBossPreparation(asDialog(dialog), run, {valid: () => false, onReveal, history: history()})).toBe('deferred');
    const other = new Element('dialog');other.open = true;body.append(other);
    expect(presentBossPreparation(asDialog(dialog), run, {valid: () => true, onReveal, history: history()})).toBe('deferred');
    expect(dialog.current).toBeUndefined();expect(other.open).toBe(true);expect(onReveal).not.toHaveBeenCalled();
  });
  it('an unavailable audio callback does not block the preparation action', async () => {
    const dialog = new Dialog(), run = bossShop(), onFinish = vi.fn();
    presentBossPreparation(asDialog(dialog), run, {valid: () => true, onReveal: () => {throw Error('audio unavailable');}, onFinish, history: history()});
    expect(flush).not.toThrow();dialog.current!.querySelector('.dialog-primary')!.onclick!();await Promise.resolve();expect(onFinish).toHaveBeenCalledWith('prepare');
  });
  it('continues only after native close cleanup and ignores an owner replaced in between', async () => {
    const run = bossShop();let nativeClosed = false, valid = true;
    class ClosingDialog extends Dialog {override close(expected?: Element) {super.close(expected);nativeClosed = true;}}
    const dialog = new ClosingDialog(), onFinish = vi.fn(() => {expect(nativeClosed).toBe(true);});
    presentBossPreparation(asDialog(dialog), run, {valid: () => valid, onReveal: () => {}, onFinish, history: history()});
    dialog.current!.querySelector('.dialog-primary')!.onclick!();expect(onFinish).not.toHaveBeenCalled();
    await Promise.resolve();expect(onFinish).toHaveBeenCalledTimes(1);
    const next = new Dialog(), staleFinish = vi.fn();
    presentBossPreparation(asDialog(next), {...run, stageIndex: 5}, {valid: () => valid, onReveal: () => {}, onFinish: staleFinish, history: history()});
    next.close();valid = false;await Promise.resolve();expect(staleFinish).not.toHaveBeenCalled();
  });
});
