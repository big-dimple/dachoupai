import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {AudioEngine} from '../src/audio/AudioEngine';
import {FOLEY_SAMPLES} from '../src/audio/foley';

const samples = [...FOLEY_SAMPLES, {name: 'cloth2', runtimePath: 'assets/audio/score-impact/cloth2.ogg'}];
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
};
const buffer = (tag = 'current') => ({tag, duration: .3, numberOfChannels: 1, sampleRate: 100,
  getChannelData: () => new Float32Array([0, .1, -.1])});
const response = () => ({ok: true, arrayBuffer: vi.fn(async () => new ArrayBuffer(8))});
const never = () => new Promise<any>(() => {});
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
const fixture = () => {
  const engine = new AudioEngine();
  const inside = engine as any;
  const sources: any[] = [];
  const param = () => ({value: 1, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(), linearRampToValueAtTime: vi.fn()});
  const gain = () => ({gain: param(), connect: vi.fn(), disconnect: vi.fn()});
  const context = {state: 'running', currentTime: 1, resume: vi.fn(async () => {}), suspend: vi.fn(async () => {}),
    decodeAudioData: vi.fn(async () => buffer()), createGain: gain, createBufferSource: () => {
      const source = {buffer: null, playbackRate: param(), start: vi.fn(), stop: vi.fn(),
        connect: vi.fn(), disconnect: vi.fn(), onended: null};
      sources.push(source); return source;
    }};
  inside.context = context;
  inside.gains = {master: gain(), music: gain(), sfx: gain(), ui: gain()};
  engine.musicMuted = true;
  return {engine, inside, context, sources, load: () => inside.loadScoreSamples() as Promise<void>};
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('document', {hidden: false, baseURI: 'https://game.test/nested/'});
  vi.stubGlobal('window', {});
  vi.stubGlobal('fetch', vi.fn(async () => response()));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('bounds the initial request burst and shares an in-flight load', async () => {
  vi.stubGlobal('fetch', vi.fn(never));
  const {load} = fixture();
  const pending = load();
  expect(load()).toBe(pending);
  await flush();
  expect(fetch).toHaveBeenCalledTimes(3);
  await vi.advanceTimersByTimeAsync(200000);
  await pending;
  expect(fetch).toHaveBeenCalledTimes(samples.length * 3);
  expect(vi.getTimerCount()).toBe(0);
});

it('a timed-out wave releases slots for later samples before retrying it', async () => {
  const blocked = new Set(samples.slice(0, 3).map(s => s.runtimePath));
  const signals: AbortSignal[] = [];
  vi.stubGlobal('fetch', vi.fn((url: URL, options?: RequestInit) => {
    if (blocked.has(url.pathname.replace('/nested/', ''))) {
      if (options?.signal) signals.push(options.signal);
      return never();
    }
    return Promise.resolve(response());
  }));
  const {load, inside} = fixture();
  let settled = false;
  const pending = load().then(() => { settled = true; });
  await vi.advanceTimersByTimeAsync(5001);
  expect(inside.scoreSamples.has(samples[3].name)).toBe(true);
  expect(signals.slice(0, 3).every(signal => signal.aborted)).toBe(true);
  await vi.advanceTimersByTimeAsync(200000);
  expect(settled).toBe(true);
  await pending;
  expect(inside.scoreSamples.size).toBe(samples.length - 3);
});

it.each(['network', 'http', 'body', 'decode'])('recovers a temporary %s failure in the same session', async stage => {
  const {load, inside, context} = fixture();
  if (stage === 'decode') context.decodeAudioData.mockRejectedValueOnce(new Error('decode'));
  else vi.mocked(fetch).mockImplementationOnce(async () => {
    if (stage === 'network') throw new Error('network');
    if (stage === 'http') return {ok: false} as Response;
    return {ok: true, arrayBuffer: async () => { throw new Error('body'); }} as unknown as Response;
  });
  await load();
  expect(inside.scoreSamples.size).toBe(samples.length);
  expect(inside.sampleBodies.size).toBe(samples.length);
  expect(fetch).toHaveBeenCalledTimes(samples.length + 1);
  await load();
  expect(fetch).toHaveBeenCalledTimes(samples.length + 1);
});

it('permanent failures stop after three attempts, including repeated unlocks', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ok: false})));
  const {load, inside, engine} = fixture();
  await load();
  expect(fetch).toHaveBeenCalledTimes(samples.length * 3);
  expect(inside.scoreSamples.size).toBe(0);
  for (let i = 0; i < 5; i++) { await load(); await engine.unlock(); }
  expect(fetch).toHaveBeenCalledTimes(samples.length * 3);
  expect(inside.scoreSampleTask).toBeUndefined();
  expect(vi.getTimerCount()).toBe(0);
});

it.each(['body', 'decode'])('permanently stuck %s settles within the finite attempt budget', async stage => {
  const {load, inside, context} = fixture();
  if (stage === 'decode') context.decodeAudioData.mockImplementation(never);
  else vi.stubGlobal('fetch', vi.fn(async () => ({ok: true, arrayBuffer: never})));
  let settled = false;
  const pending = load().then(() => { settled = true; });
  await vi.advanceTimersByTimeAsync(200000);
  expect(settled).toBe(true);
  await pending;
  expect(fetch).toHaveBeenCalledTimes(samples.length * 3);
  expect(inside.scoreSamples.size).toBe(0);
  expect(inside.sampleBodies.size).toBe(0);
  await load();
  expect(fetch).toHaveBeenCalledTimes(samples.length * 3);
  expect(vi.getTimerCount()).toBe(0);
});

it('holds worker slots through body/decode instead of flooding the decoder', async () => {
  const {load, context} = fixture();
  const firstWave = Array.from({length: 3}, () => deferred<any>());
  for (const late of firstWave) context.decodeAudioData.mockImplementationOnce(() => late.promise);
  const pending = load();
  await flush();
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(context.decodeAudioData).toHaveBeenCalledTimes(3);
  for (const late of firstWave) late.resolve(buffer());
  await pending;
  expect(fetch).toHaveBeenCalledTimes(samples.length);
  expect(context.decodeAudioData).toHaveBeenCalledTimes(samples.length);
});

it('creates no context/request before unlock, remembers a muted gesture and respects foreground gates', async () => {
  const {engine, inside, context} = fixture();
  inside.context = undefined; inside.gains = undefined;
  Object.assign(context, {
    createDynamicsCompressor: () => ({threshold: {value: 0}, knee: {value: 0}, ratio: {value: 0},
      attack: {value: 0}, release: {value: 0}, connect: vi.fn()}),
    createWaveShaper: () => ({curve: null, oversample: '', connect: vi.fn()}),
  });
  const create = vi.fn(function () { return context; });
  vi.stubGlobal('window', {AudioContext: create});
  engine.select();
  expect(create).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  engine.muted = true;
  await engine.unlock();
  expect(create).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  vi.stubGlobal('document', {hidden: true, baseURI: 'https://game.test/nested/'});
  engine.muted = false; await engine.unlock();
  expect(create).not.toHaveBeenCalled();
  vi.stubGlobal('document', {hidden: false, baseURI: 'https://game.test/nested/'});
  engine.setSuspended(true); await engine.unlock();
  expect(create).not.toHaveBeenCalled();
  engine.setSuspended(false); await engine.unlock();
  await inside.scoreSampleTask;
  expect(create).toHaveBeenCalledOnce();
  expect(fetch).toHaveBeenCalledTimes(samples.length);
  expect(inside.scoreSamples.size).toBe(samples.length);
  expect(vi.getTimerCount()).toBe(0);
});

it.each(['fetch', 'body', 'decode'])('ignores late %s success after timeout and a successful retry', async stage => {
  const {load, inside, context} = fixture();
  const late = deferred<any>();
  if (stage === 'decode') context.decodeAudioData.mockImplementationOnce(() => late.promise);
  else vi.mocked(fetch).mockImplementationOnce(() => stage === 'fetch' ? late.promise
    : Promise.resolve({ok: true, arrayBuffer: () => late.promise} as Response));
  const pending = load();
  await vi.advanceTimersByTimeAsync(5001);
  await pending;
  const current = inside.scoreSamples.get(samples[0].name);
  const body = inside.sampleBodies.get(samples[0].name);
  expect(current).toBeDefined();
  const decodes = context.decodeAudioData.mock.calls.length;
  late.resolve(stage === 'decode' ? buffer('obsolete') : stage === 'fetch' ? response() : new ArrayBuffer(8));
  await flush();
  expect(inside.scoreSamples.get(samples[0].name)).toBe(current);
  expect(inside.sampleBodies.get(samples[0].name)).toBe(body);
  expect(context.decodeAudioData).toHaveBeenCalledTimes(decodes);
  expect(vi.getTimerCount()).toBe(0);
});

it('does not publish results for a closed context', async () => {
  const {load, inside, context} = fixture();
  const late = deferred<any>();
  context.decodeAudioData.mockImplementation(() => late.promise);
  const pending = load();
  await flush();
  context.state = 'closed';
  late.resolve(buffer());
  await pending;
  expect(inside.scoreSamples.size).toBe(0);
  expect(inside.sampleBodies.size).toBe(0);
});

it('does not publish results from a replaced context', async () => {
  const {load, inside, context} = fixture();
  const late = deferred<any>();
  context.decodeAudioData.mockImplementation(() => late.promise);
  const pending = load();
  await flush();
  inside.context = {...context};
  late.resolve(buffer());
  await pending;
  expect(inside.scoreSamples.size).toBe(0);
  expect(inside.sampleBodies.size).toBe(0);
});

it('gesture unlock stays responsive during a stuck load and repeated calls never redownload success', async () => {
  const {engine, inside, context} = fixture();
  vi.stubGlobal('fetch', vi.fn(never));
  await engine.unlock();
  expect(context.resume).toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledTimes(3);
  vi.stubGlobal('fetch', vi.fn(async () => response()));
  await vi.advanceTimersByTimeAsync(5001);
  await inside.scoreSampleTask;
  expect(inside.scoreSamples.size).toBe(samples.length);
  const downloads = vi.mocked(fetch).mock.calls.length;
  await engine.unlock(); await engine.unlock();
  expect(fetch).toHaveBeenCalledTimes(downloads);
});

it('mute/background and unavailable clips consume cues, without playback on load or foreground', async () => {
  const {engine, inside, sources} = fixture();
  inside.unlocked = true;
  const presentation = {};
  engine.scoreImpact(presentation, 'missing', 'add');
  engine.muted = true;
  engine.scoreImpact(presentation, 'muted', 'add');
  await inside.loadScoreSamples();
  expect(sources).toHaveLength(0);
  engine.muted = false; await engine.unlock();
  engine.setSuspended(true);
  engine.scoreImpact(presentation, 'background', 'add');
  engine.setSuspended(false); await engine.unlock();
  for (const id of ['missing', 'muted', 'background']) engine.scoreImpact(presentation, id, 'add');
  expect(sources).toHaveLength(0);
  inside.context.currentTime += .1; // Preserve the existing ordinary-cue throttle.
  engine.scoreImpact(presentation, 'fresh', 'add');
  expect(sources).toHaveLength(1);
  engine.setSuspended(true);
  expect(inside.voices.size).toBe(0);
});
