import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {AudioEngine} from '../src/audio/AudioEngine';
import {chainRate} from '../src/audio/mixPolicy';
import bgmManifest from '../public/assets/audio/bgm/manifest.json';
const savedTracks=[...bgmManifest.tracks];
const tablePlaylist=()=>bgmManifest.tracks.push({...savedTracks.find(t=>t.id==='table-zuiyu')!,id:'test/table-fallback',scenes:['table']});

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const deferred = () => {
  let resolve!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
};
const fixture = () => {
  const media: any[] = [];
  const param = () => ({value: 0, cancelAndHoldAtTime: vi.fn(), cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), linearRampToValueAtTime: vi.fn()});
  const gain = () => ({gain: param(), connect: vi.fn(), disconnect: vi.fn()});
  class Media {
    src = ''; loop = false; paused = true; ended = false; currentTime = 0;
    error: any = null; onerror: any; onended: any; attempts: ReturnType<typeof deferred>[] = [];
    constructor() { media.push(this); }
    play = vi.fn(() => { this.paused = false; this.ended = false; const d = deferred(); this.attempts.push(d); return d.promise; });
    // Deliberately permit late success after pause: obsolete continuations must be inert.
    pause = vi.fn(() => { this.paused = true; });
    load = vi.fn(() => { this.error = null; });
    setAttribute = vi.fn();
    removeAttribute = vi.fn((name: string) => { if (name === 'src') this.src = ''; });
    finish() { this.attempts.at(-1)!.resolve(); }
    fail() { this.error = {code: 4}; this.onerror?.(); }
    end() { if (this.loop) { this.currentTime = 0; return; } this.ended = true; this.paused = true; this.onended?.(); }
  }
  vi.stubGlobal('Audio', Media);
  const engine = new AudioEngine(), inside = engine as any;
  const context = {state: 'running', currentTime: 1, createGain: gain,
    createMediaElementSource: vi.fn(() => ({connect: vi.fn()})),
    resume: vi.fn(async () => { context.state = 'running'; }),
    suspend: vi.fn(async () => { context.state = 'suspended'; })};
  inside.context = context; inside.gains = {master: gain(), music: gain(), sfx: gain(), ui: gain()};
  inside.loadScoreSamples = vi.fn(async () => {});
  const begin = async () => { await engine.unlock(); return media.at(-1); };
  const finish = async (element = inside.musicElement) => { element.finish(); await flush(); };
  return {engine, inside, context, media, begin, finish};
};
beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal('window', {});
  vi.stubGlobal('document', {hidden: false, baseURI: 'https://game.test/nested/'});
});
afterEach(() => { bgmManifest.tracks.splice(0,bgmManifest.tracks.length,...savedTracks);vi.useRealTimers(); vi.unstubAllGlobals(); });

it('creates no music before a gesture and shares one pending play per requested track', async () => {
  const {engine, inside, media, begin, finish} = fixture();
  for (let i = 0; i < 20; i++) engine.preloadSceneMusic('table');
  engine.setScene('shop'); expect(media).toHaveLength(0);
  await begin(); const element = inside.musicElement;
  for (let i = 0; i < 10; i++) await engine.unlock();
  expect(element.play).toHaveBeenCalledTimes(1); await finish();
  for (let i = 0; i < 10; i++) await engine.unlock();
  expect(element.play).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
});

it('music unmute retries a prior denial and same recording scene changes preserve playback position', async () => {
  const {engine, inside, begin, finish} = fixture();
  engine.setScene('shop'); const element = await begin();
  element.attempts[0].reject(new DOMException('gesture required', 'NotAllowedError')); await flush();
  engine.musicMuted = true; engine.musicMuted = false; await flush(); await finish();
  const playing = inside.musicElement; playing.currentTime = 19;
  const calls = playing.play.mock.calls.length;
  engine.setScene('failure');
  expect(inside.musicElement).toBe(playing); expect(playing.currentTime).toBe(19);
  expect(playing.play).toHaveBeenCalledTimes(calls); expect(playing.loop).toBe(true);
});

it('a new scene starts while the previous play is pending, and late success cannot replace it', async () => {
  const {engine, inside, media, begin, finish} = fixture();
  const old = await begin(), obsolete = old.attempts[0];
  engine.setScene('table'); engine.setScene('boss'); engine.setScene('shop');
  const latest = inside.musicElement;
  expect(latest.src).toContain('serenade-schubert');
  expect(media.length).toBeLessThanOrEqual(2);
  await finish(latest); obsolete.resolve(); await flush();
  expect(inside.musicElement).toBe(latest); expect(latest.paused).toBe(false);
  expect(media.filter(e => e !== latest).every(e => e.paused)).toBe(true);
  expect(media.reduce((n, e) => n + e.play.mock.calls.length, 0)).toBe(4);
});

it('an obsolete play rejection cannot poison or retry the latest recording', async () => {
  const {engine, inside, begin, finish} = fixture();
  const old = await begin(), obsolete = old.attempts[0];
  engine.setScene('shop'); const latest = inside.musicElement;
  await finish(latest); const plays = latest.play.mock.calls.length;
  obsolete.reject(new DOMException('src replaced', 'AbortError')); await flush();
  expect(latest.paused).toBe(false); expect(latest.play).toHaveBeenCalledTimes(plays);
  expect(engine.needsGestureUnlock).toBe(false); expect(vi.getTimerCount()).toBe(0);
});

it('old active media callbacks cannot fail or advance a later request that reuses the same slot', async () => {
  const {engine, inside, begin, finish} = fixture();
  const first = await begin(); await finish();
  const staleError = first.onerror, staleEnded = first.onended;
  engine.setScene('shop'); await finish(); engine.setScene('table'); await finish();
  expect(inside.musicElement).toBe(first);
  const plays = first.play.mock.calls.length;
  staleError(); staleEnded();
  expect(inside.musicElement).toBe(first); expect(first.src).toContain('table-tangsong-cyber-groove');
  expect(first.paused).toBe(false); expect(first.play).toHaveBeenCalledTimes(plays);
});

it('mute during pending play cancels the old generation; unmute starts a fresh attempt immediately', async () => {
  const {engine, inside, begin, finish} = fixture();
  const old = await begin(), obsolete = old.attempts[0];
  engine.muted = true; expect(vi.getTimerCount()).toBe(0);
  engine.setScene('shop'); engine.muted = false; await flush();
  const latest = inside.musicElement; expect(latest.src).toContain('serenade-schubert');
  await finish(latest); obsolete.resolve(); await flush();
  expect(latest.paused).toBe(false); expect(engine.muted).toBe(false);
});

it('music zero pauses both slots while independent exact sfx settings survive a later resume', async () => {
  const {engine, inside, media, begin, finish} = fixture();
  await begin(); await finish(); engine.setScene('shop'); await finish();
  engine.setVolume('music', 0); engine.setVolume('sfx', 1);
  expect(media.every(e => e.paused)).toBe(true); expect(vi.getTimerCount()).toBe(0);
  engine.setVolume('music', .07); await flush(); await finish();
  expect(engine.getVolume('music')).toBe(.07); expect(engine.getVolume('sfx')).toBe(1);
  expect(inside.musicElement.paused).toBe(false);
});

it('background clears both fades and pending deadlines, then resumes the current scene on foreground', async () => {
  const {engine, inside, media, begin, finish} = fixture();
  await begin(); await finish(); engine.setScene('table'); await finish();
  const table = inside.musicElement;
  engine.setSuspended(true); await flush();
  expect(media.every(e => e.paused)).toBe(true); expect(vi.getTimerCount()).toBe(0);
  engine.setSuspended(false); await flush(); await finish();
  expect(inside.musicElement).toBe(table); expect(table.paused).toBe(false);
  expect(media).toHaveLength(2); expect(vi.getTimerCount()).toBe(0);
});

it('play denial waits for a new gesture and can recover without recreating the app context', async () => {
  const {engine, inside, context, media, begin, finish} = fixture();
  const element = await begin();
  element.attempts[0].reject(new DOMException('gesture required', 'NotAllowedError')); await flush();
  expect(element.play).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  expect(engine.needsGestureUnlock).toBe(true);
  await engine.unlock(); await finish();
  expect(inside.context).toBe(context); expect(media).toHaveLength(1);
  expect(inside.musicElement.paused).toBe(false); expect(engine.needsGestureUnlock).toBe(false);
});

it('a failed recording cannot permanently silence another scene or a later same-scene gesture', async () => {
  const {engine, inside, begin, finish} = fixture();
  const first = await begin(), staleError = first.onerror; first.fail();
  expect(engine.needsGestureUnlock).toBe(true); expect(vi.getTimerCount()).toBe(0);
  engine.setScene('shop'); const shop = inside.musicElement; await finish();
  staleError(); expect(shop.paused).toBe(false); expect(inside.musicElement).toBe(shop);
  shop.fail(); expect(engine.needsGestureUnlock).toBe(true);
  await engine.unlock(); await finish(); expect(inside.musicElement.paused).toBe(false);
});

it('a stalled first table track has a finite deadline and falls through once to the second track', async () => {
  tablePlaylist();
  const {engine, inside, media, finish} = fixture();
  engine.setScene('table'); await engine.unlock();
  const first = inside.musicElement, obsolete = first.attempts[0];
  await vi.advanceTimersByTimeAsync(8001);
  const second = inside.musicElement; expect(second.src).toContain('table-chinese-zuiyu');
  await finish(second); obsolete.resolve(); await flush();
  expect(inside.musicElement).toBe(second); expect(second.paused).toBe(false);
  expect(media.length).toBeLessThanOrEqual(2); expect(vi.getTimerCount()).toBe(0);
});

it('an unavailable playlist exhausts each track once without an automatic retry loop', async () => {
  tablePlaylist();
  const {engine, inside, media} = fixture();
  engine.setScene('table'); await engine.unlock();
  await vi.advanceTimersByTimeAsync(100000);
  expect(media.reduce((n, e) => n + e.play.mock.calls.length, 0)).toBe(2);
  expect(vi.getTimerCount()).toBe(0); expect(engine.needsGestureUnlock).toBe(true);
  expect(inside.pendingMusic).toBeUndefined();
});

it('natural playlist completion advances both directions; one-track scenes use native looping', async () => {
  tablePlaylist();
  const {engine, inside, finish} = fixture();
  engine.setScene('table'); await engine.unlock(); await finish();
  const first = inside.musicElement; expect(first.loop).toBe(false); first.end();
  expect(inside.musicElement.src).toContain('table-chinese-zuiyu'); await finish();
  inside.musicElement.end(); expect(inside.musicElement.src).toContain('table-tangsong-cyber-groove'); await finish();
  engine.setScene('success');await finish();const single=inside.musicElement;expect(single.loop).toBe(true);
  const plays = single.play.mock.calls.length; single.end(); expect(single.play).toHaveBeenCalledTimes(plays);
});

it('keeps the old song during slow loading and uses complementary 250ms ramps with two reusable slots', async () => {
  const {engine, inside, media, begin, finish} = fixture();
  const first = await begin(); await finish();
  engine.setScene('shop'); const next = inside.musicElement;
  expect(first.paused).toBe(false); await finish(next);
  expect(first.paused).toBe(false);
  const slots = inside.musicSlots;
  expect(slots.find((s: any) => s.element === first).gain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 1.25);
  expect(slots.find((s: any) => s.element === next).gain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(1, 1.25);
  await vi.advanceTimersByTimeAsync(251); expect(first.paused).toBe(true);
  for (let i = 0; i < 40; i++) { engine.setScene(i % 2 ? 'table' : 'boss'); await finish(); }
  expect(media).toHaveLength(2); engine.setSuspended(true); expect(vi.getTimerCount()).toBe(0);
});

it('legacy material pitch stays in a narrow register for invalid and arbitrarily long chains', () => {
  expect([chainRate(-1), chainRate(NaN), chainRate(Infinity)]).toEqual([.94, .94, .94]);
  expect(chainRate(1)).toBe(1);expect(chainRate(3.9)).toBe(1.06); expect(chainRate(7)).toBe(1.06); expect(chainRate(100000)).toBe(1.06);
});
