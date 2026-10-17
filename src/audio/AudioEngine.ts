import recording from '../../public/assets/audio/p06/recording.json';
import bgmManifest from '../../public/assets/audio/bgm/manifest.json';
import {DEFAULT_AUDIO} from './preferences';
import {FOLEY,FOLEY_SAMPLES,type FoleyKind,type Layer} from './foley';
import {sampleBody,type SampleBody} from './sampleBody';
import {awardForScore,chainRate,scoreStrikeRate,MAX_RECORDED_RATE,EFFECT_VOICE_BUDGET,ACCENT_TAIL_FLOOR} from './mixPolicy';

export type AudioBus = 'master' | 'music' | 'sfx' | 'ui';
export type AudioScene = 'menu' | 'shop' | 'table' | 'boss' | 'success' | 'failure';
export type FailureCue = { runId: string; commandSeq: number };
type VoiceBus = Exclude<AudioBus, 'master'>;
type MusicTrack = { title: string; runtimePath: string };
type MusicSlot = { element: HTMLAudioElement; node: MediaElementAudioSourceNode; gain: GainNode;
  track?: MusicTrack; cancelAttempt?: () => void };
type Voice = {
  source: AudioScheduledSourceNode;
  secondarySources?: AudioScheduledSourceNode[];
  gain: GainNode;
  filter?: BiquadFilterNode;
  bus: VoiceBus;
  scoreAccent?: boolean;
  roll?: ScoreRollKind;
  semantic?: FoleyKind;
  startsAt?: number;
  endsAt?: number;
  priority?: number;
  peak?: number;
};
export type ScoreSourceCue = 'card' | 'held' | 'character' | 'joker' | 'boss' | 'retrigger';
export type ScoreRollKind = 'heat' | 'mult' | 'total';

export interface BGMTrackMeta {
  id: string;
  file: string;
  title: string;
  composer: string;
  style: string;
  scenes: string[];
  license: string;
  durationSeconds: number;
  runtimePath: string;
  bytes: number;
  sha256: string;
}

// Only a verified recording may populate this manifest. No synthesized BGM fallback.
const RECORDING_PATH = recording.runtimePath;
export const TRANSITION_MUSIC = 'Serenade - Schubert · Jérôme Chauvel / Abydos Music（临时恢复）';
const bounded = (value: number, max: number): number => Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
const SOURCE_GAIN: Record<VoiceBus, number> = { music: 1, sfx: 8, ui: 7.2 };
const MUSIC_HEADROOM=.18; // Internal mix, not a preference/slider migration.
const SAMPLE_CONCURRENCY = 3;
const SAMPLE_TIMEOUT_MS = 5000; // Fetch, response body and decode share one deadline.
const SAMPLE_MAX_ATTEMPTS = 3; // Session budget; repeated gestures cannot restart it.
const MUSIC_START_TIMEOUT_MS = 8000;
const MUSIC_CROSSFADE_SECONDS = .25;

/** One application context. The app owns gesture/visibility listeners and persistence. */
export class AudioEngine {
  static readonly shared = new AudioEngine();
  private context?: AudioContext;
  private gains?: Record<AudioBus, GainNode>;
  private scoreSamples=new Map<string,AudioBuffer>();
  private sampleBodies=new Map<string,SampleBody>();
  private scoreSampleTask?:Promise<void>;
  private readonly sampleAttempts = new Map<string, number>();
  private readonly scoreCues=new WeakMap<object,Set<string>>();
  private voices = new Set<Voice>();
  private readonly cueTimes = new Map<FoleyKind,number>();
  private readonly variants = new Map<FoleyKind,number>();
  private volumes: Record<AudioBus, number> = { master: 1, music: DEFAULT_AUDIO.music, sfx: DEFAULT_AUDIO.sfx, ui: DEFAULT_AUDIO.sfx };
  private masterMuted = false;
  private musicIsMuted = false;
  private suspended = false;
  private unlocked = false;
  private unlockTask?: Promise<void>;
  private scene: AudioScene = 'menu';
  private currentTrack?: MusicTrack;
  private sceneTrackIndices = new Map<AudioScene, number>();
  // Two streaming slots at most: keep the old performance until the new one can play.
  private readonly musicSlots: MusicSlot[] = [];
  private activeMusic?: MusicSlot;
  private pendingMusic?: MusicSlot;
  private musicFadeTimer?: ReturnType<typeof setTimeout>;
  private musicGeneration = 0;
  private readonly musicFailures = new Set<string>();
  private musicRetryNeeded = false;
  private get musicElement(): HTMLAudioElement | undefined { return (this.pendingMusic ?? this.activeMusic)?.element; }
  private duckUntil = 0;
  private duckFloor=.35;
  private readonly failureCues = new WeakSet<FailureCue>();
  private musicFilterNode?: BiquadFilterNode;

  /** Retry a failed/interrupted unlock on a later gesture without resuming every ordinary click. */
  get needsGestureUnlock(): boolean {
    return !this.context || this.context.state !== 'running' || this.musicRetryNeeded && this.canPlay('music');
  }

  get muted(): boolean { return this.masterMuted; }
  set muted(value: boolean) {
    this.masterMuted = value;
    this.applyVolume('master');
    if (value) { this.stopScoreFire(); this.stopMusic(); this.stopVoices(); this.duckUntil = 0; this.applyVolume('music'); }
    else if (this.unlocked) void this.unlock();
  }
  get musicAvailable(): boolean { return true; }
  get musicTitle(): string { return this.currentTrack?.title ?? TRANSITION_MUSIC; }
  get musicMuted(): boolean { return this.musicIsMuted; }
  set musicMuted(value: boolean) {
    this.musicIsMuted = value;
    if (value) this.duckUntil = 0;
    this.applyVolume('music');
    if (value) this.stopMusic();
    else if (this.unlocked) void this.unlock();
  }
  setVolume(bus: AudioBus, value: number): void {
    // The removed UI slider remains a compatible alias of the effects route.
    if (bus === 'ui') bus = 'sfx';
    this.volumes[bus] = bounded(value, 1);
    if (bus === 'sfx') { this.volumes.ui = this.volumes.sfx; this.applyVolume('ui'); }
    this.applyVolume(bus);
    if (this.volumes[bus] === 0) {
      if (bus === 'music' || bus === 'master') this.stopMusic();
      if (bus === 'sfx' || bus === 'master') {
        this.stopScoreFire(); this.stopVoices('sfx'); this.stopVoices('ui');
      }
    } else if (bus === 'music' || bus === 'master') {
      if (this.unlocked) void this.unlock();
    }
  }
  getVolume(bus: AudioBus): number { return this.volumes[bus]; }

  /** Gesture/foreground resume attempts share one task; repeated calls are safe. */
  unlock(): Promise<void> {
    // Remember a real gesture even when initially muted; unmuting can then create
    // or resume the context when the player later unmutes.
    this.unlocked = true;
    // A muted first click can itself unmute in the same event. Do not retain an
    // already-resolved no-op task that would swallow that synchronous second call.
    if (this.masterMuted || this.suspended || this.hidden()) return Promise.resolve();
    if (this.unlockTask) return this.unlockTask;
    // A denial/network fault is scoped to this request, never to the application.
    // One later gesture/foreground retry gets a fresh finite playlist budget.
    if (this.musicRetryNeeded) { this.musicFailures.clear(); this.musicRetryNeeded = false; }
    const pending = this.enableAudio();
    this.unlockTask = pending;
    void pending.then(() => { if (this.unlockTask === pending) this.unlockTask = undefined; });
    return pending;
  }

  setScene(scene: AudioScene): void {
    if (scene === this.scene) return;
    this.scene = scene;
    this.musicFailures.clear(); this.musicRetryNeeded = false;
    this.stopScoreFire();
    this.stopVoices('sfx');
    this.duckUntil = 0;
    this.applyVolume('music');
    // Matching scene tracks continue; different tracks use the bounded music handoff.
    this.startMusic();
  }

  /** Called by one app-level visibility listener, never by individual scene listeners. */
  setSuspended(value: boolean): void {
    this.suspended = value;
    if (!value) { if (this.unlocked) void this.unlock(); return; }
    this.stopScoreFire();
    this.stopMusic();
    this.stopVoices();
    this.duckUntil = 0;
    this.applyVolume('music');
    try {
      void this.context?.suspend().then(() => {
        // A quick foreground transition can arrive while suspend() is still pending.
        if (!this.suspended && !this.hidden() && this.unlocked) void this.unlock();
      }).catch(() => {});
    } catch { /* Audio lifecycle must never interfere with gameplay. */ }
  }

  private hidden(): boolean { return typeof document !== 'undefined' && document.hidden; }
  private async enableAudio(): Promise<void> {
    if (typeof window === 'undefined' || this.suspended || this.hidden() || this.masterMuted) return;
    try {
      if (!this.context || !this.gains) {
        const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
        const Context = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
        if (!Context) return;
        const context = this.context ?? new Context();
        this.context = context;
        const gains = {
          master: context.createGain(), music: context.createGain(),
          sfx: context.createGain(), ui: context.createGain(),
        };
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -11;
        compressor.knee.value = 12;
        compressor.ratio.value = 5;
        compressor.attack.value = .002;
        compressor.release.value = .12;
        // A tiny final soft ceiling bounds fast-forwarded stacks below full scale.
        const ceiling = context.createWaveShaper(), curve = new Float32Array(1025);
        for (let i = 0; i < curve.length; i++) {
          const x = i * 2 / (curve.length - 1) - 1;
          curve[i] = .9 * Math.tanh(x * 1.35) / Math.tanh(1.35);
        }
        ceiling.curve = curve;
        ceiling.oversample = '2x';
        if (this.musicFilterNode) {
          try {
            gains.music.connect(this.musicFilterNode);
            this.musicFilterNode.connect(gains.master);
          } catch {
            gains.music.connect(gains.master);
          }
        } else {
          gains.music.connect(gains.master);
        }
        gains.sfx.connect(gains.master);
        gains.ui.connect(gains.master);
        gains.master.connect(compressor);
        compressor.connect(ceiling);
        ceiling.connect(context.destination);
        this.gains = gains;
        for (const bus of Object.keys(gains) as AudioBus[]) this.applyVolume(bus);

      }
      const context = this.context;
      if (!context) return;
      if (context.state !== 'closed') void this.loadScoreSamples();
      // Resume even when running: it also follows a pending background suspend safely.
      if (context.state !== 'closed') await context.resume();
      if (!this.suspended && !this.hidden() && !this.masterMuted) this.startMusic();
    } catch {
      this.stopScoreFire();
      this.stopMusic();
      this.stopVoices();
    }
  }

  private applyVolume(bus: AudioBus): void {
    try {
      const context = this.context, gain = this.gains?.[bus];
      if (!context || !gain) return;
      const value = (bus === 'master' && this.masterMuted) || (bus === 'music' && this.musicIsMuted) ? 0 : this.volumes[bus]*(bus==='music'?MUSIC_HEADROOM:1);
      gain.gain.cancelScheduledValues(context.currentTime);
      const now = context.currentTime;
      // Zero is an exact mute, not an exponential tail that stays faintly audible.
      if (value === 0) gain.gain.setValueAtTime(0, now);
      else if (bus === 'music' && this.duckUntil > now) {
        const quiet = value * this.duckFloor, remaining = this.duckUntil - now;
        gain.gain.setTargetAtTime(quiet, now, .008);
        gain.gain.setValueAtTime(quiet, now + remaining * .65);
        gain.gain.linearRampToValueAtTime(value, this.duckUntil);
      } else gain.gain.setTargetAtTime(value, now, .015);
    } catch { /* Settings remain usable when an audio device is unavailable. */ }
  }

  private canPlay(bus: VoiceBus): boolean {
    return !!this.context && !!this.gains && this.unlocked && !this.masterMuted && !this.suspended
      && !this.hidden() && this.volumes.master > 0 && this.volumes[bus] > 0
      && !(bus === 'music' && this.musicIsMuted) && this.context.state !== 'closed';
  }
  private retain(voice: Voice): void {
    // Fast-forwarded/long traces cannot create an unbounded wall of simultaneous sound.
    if (this.voices.size >= 32) {
      const oldest = this.voices.values().next().value;
      if (oldest) this.release(oldest);
    }
    this.voices.add(voice);
    voice.source.onended = () => this.release(voice);
  }
  private release(voice: Voice): void {
    this.voices.delete(voice);
    voice.source.onended = null;
    try { voice.source.stop(); } catch { /* The source may already have ended. */ }
    try { voice.source.disconnect(); } catch { /* Device teardown. */ }
    if (voice.secondarySources) {
      for (const sec of voice.secondarySources) {
        sec.onended = null;
        try { sec.stop(); } catch {}
        try { sec.disconnect(); } catch {}
      }
    }
    try { voice.gain.disconnect(); voice.filter?.disconnect(); } catch { /* Device teardown. */ }
  }
  private stopVoices(bus?: VoiceBus): void {
    for (const voice of this.voices) if (!bus || voice.bus === bus) this.release(voice);
  }
  /** Cancel a skipped scene's score tails while its table music keeps playing. */
  cancelPresentation(): void { this.stopScoreFire(); this.stopVoices('sfx'); this.duckUntil = 0; this.applyVolume('music'); }

  /** Returns active voices count for diagnostic assertion. */
  getActiveVoiceCount(): number {
    return this.voices.size;
  }

  /** Returns whether audio is unlocked and audio context is running. */
  isAudioContextRunning(): boolean {
    return this.unlocked && !!this.context && this.context.state === 'running';
  }

  private duckMusic(duration = .3,floor=.35): void {
    if (!this.canPlay('music')) return;
    try {
      const context = this.context!;
      this.duckFloor=this.duckUntil>context.currentTime?Math.min(this.duckFloor,floor):floor;
      this.duckUntil = Math.max(this.duckUntil, context.currentTime + bounded(duration, 1.5));
      this.applyVolume('music');
    } catch { /* Ducking failure is inaudible to rule state. */ }
  }

  /** Owned landing accent for positive score items and the final award; never replayed. */
  scoreBrush(presentation:object,eventId:string,intensity:0|1|2|3=1):void {
    this.scoreImpact(presentation,eventId,'key',intensity);
  }

  private loadScoreSamples():Promise<void> {
    if(this.scoreSampleTask)return this.scoreSampleTask;
    const context=this.context;if(!context || context.state === 'closed')return Promise.resolve();
    const queue = [...FOLEY_SAMPLES,{name:'cloth2',runtimePath:'assets/audio/score-impact/cloth2.ogg'}]
      .filter(({name}) => !this.scoreSamples.has(name) && (this.sampleAttempts.get(name) ?? 0) < SAMPLE_MAX_ATTEMPTS);
    if (!queue.length) return Promise.resolve();
    const worker = async () => {
      while (this.context === context && context.state !== 'closed') {
        const sample = queue.shift();
        if (!sample) return;
        const attempts = (this.sampleAttempts.get(sample.name) ?? 0) + 1;
        this.sampleAttempts.set(sample.name, attempts);
        const loaded = await this.loadScoreSample(context, sample.name, sample.runtimePath);
        // Failed clips go behind untried clips, so a stuck wave cannot monopolise slots.
        if (!loaded && attempts < SAMPLE_MAX_ATTEMPTS) queue.push(sample);
      }
    };
    const pending = Promise.all(Array.from({length: Math.min(SAMPLE_CONCURRENCY, queue.length)}, worker)).then(() => undefined);
    this.scoreSampleTask = pending;
    void pending.then(() => { if (this.scoreSampleTask === pending) this.scoreSampleTask = undefined; });
    return pending;
  }

  private async loadScoreSample(context: AudioContext, name: string, runtimePath: string): Promise<boolean> {
    const controller = new AbortController();
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const current = () => active && this.context === context && context.state !== 'closed';
    const expired = new Promise<undefined>(resolve => {
      timer = setTimeout(() => { active = false; controller.abort(); resolve(undefined); }, SAMPLE_TIMEOUT_MS);
    });
    const work = async () => {
      const response = await fetch(new URL(runtimePath, document.baseURI), {signal: controller.signal});
      if (!response.ok || !current()) return;
      const bytes = await response.arrayBuffer();
      if (!current()) return;
      const buffer = await context.decodeAudioData(bytes);
      if (!current()) return;
      const body = sampleBody(Array.from({length: buffer.numberOfChannels}, (_, i) => buffer.getChannelData(i)), buffer.sampleRate);
      return {buffer, body};
    };
    try {
      // Abort alone cannot bound decodeAudioData or a request that ignores the signal.
      const result = await Promise.race([work().catch(() => undefined), expired]);
      if (!result || !current()) return false;
      this.scoreSamples.set(name, result.buffer);
      this.sampleBodies.set(name, result.body);
      return true;
    } finally {
      active = false; // Timed-out/obsolete continuations can neither decode nor publish.
      clearTimeout(timer);
      controller.abort();
    }
  }
  /** Fixed-root recorded notes at numeric arrival; physical accents remain bounded. */
  scoreImpact(presentation:object,eventId:string,kind:'add'|'key'|'multiply'|'award'|'flight',tier=0,chain=0):void {
    let seen=this.scoreCues.get(presentation);if(!seen){seen=new Set();this.scoreCues.set(presentation,seen);}const id='recorded/'+eventId+'/'+kind;
    if(seen.has(id)||seen.size>=1024)return;seen.add(id);if(!this.canPlay('sfx'))return;
    const rate=scoreStrikeRate(presentation,eventId,kind,chain);
    const sound=kind==='award'?awardForScore(presentation):kind==='flight'?'flight':kind==='multiply'?'scoreMultiply':kind==='key'?(tier>=2?'scoreBurst':'scoreKey'):'scoreAdd';
    const voices=this.cue(sound,'sfx',rate,0,kind==='add'||kind==='flight'?1:1+bounded(tier,3)*.035);
    for(const voice of voices)voice.scoreAccent=true;
    if(voices.length)this.duckMusic(kind==='add'?.14:kind==='award'?Math.max(.4,...FOLEY[sound].layers.map(l=>(l.delay??0)+l.duration)):kind==='key'?.65:.4,kind==='key'||kind==='award'?.22:.35);
  }

  /** Compatibility cleanup name; no continuous burning sources remain. */
  stopScoreFire(): void {
    for(const voice of this.voices)if(voice.scoreAccent)this.release(voice);
  }

  getTrackForScene(scene: AudioScene): MusicTrack {
    const list = (bgmManifest.tracks as BGMTrackMeta[]).filter(t => t.scenes.includes(scene));
    if (!list.length) return { title: TRANSITION_MUSIC, runtimePath: RECORDING_PATH };
    const index = this.sceneTrackIndices.get(scene) ?? 0;
    const track = list[index % list.length];
    return { title: `${track.title} · ${track.composer}`, runtimePath: track.runtimePath };
  }

  preloadSceneMusic(scene: AudioScene): void {
    // Scene hints may reuse metadata, never allocate an unowned media/request fan-out.
    // New recordings stream through the gesture-gated, bounded startMusic handoff.
    const path = this.getTrackForScene(scene).runtimePath;
    const slot = this.musicSlots.find(s => s.track?.runtimePath === path);
    if (slot) slot.element.preload = 'metadata';
  }

  private startMusic(): void {
    if (!this.canPlay('music') || this.context!.state !== 'running') return;
    const track = this.getTrackForScene(this.scene);
    if (this.musicFailures.has(track.runtimePath)) return;
    if (this.pendingMusic?.track?.runtimePath === track.runtimePath) return;
    const active = this.activeMusic;
    if (active?.track?.runtimePath === track.runtimePath && !active.element.paused && !active.element.ended) {
      this.cancelMusicTransition();
      this.configureMusicLoop(active);
      return;
    }
    this.cancelMusicTransition();
    const generation = this.musicGeneration;
    let slot: MusicSlot | undefined;
    try {
      slot = this.musicSlots.find(s => s.track?.runtimePath === track.runtimePath && s !== active)
        ?? (active?.track?.runtimePath === track.runtimePath ? active : this.musicSlots.find(s => s !== active));
      if (!slot) {
        // No music element/request before a gesture and an open bus. Reuse both slots.
        const element = new Audio();
        element.preload = 'none'; element.volume = 1;
        element.playbackRate = 1; element.setAttribute('playsinline', '');
        const node = this.context!.createMediaElementSource(element), gain = this.context!.createGain();
        gain.gain.setValueAtTime(0, this.context!.currentTime);
        node.connect(gain); gain.connect(this.gains!.music);
        slot = {element, node, gain}; this.musicSlots.push(slot);
      }
      const target = slot, element = target.element;
      if (target.track?.runtimePath !== track.runtimePath || element.error) {
        element.src = `${import.meta.env.BASE_URL}${track.runtimePath}`;
      } else if (element.ended) element.currentTime = 0;
      target.track = track; this.pendingMusic = target; this.configureMusicLoop(target);
      let waiting = true;
      const current = () => waiting && generation === this.musicGeneration && this.pendingMusic === target;
      const finish = () => { waiting = false; clearTimeout(timer); target.cancelAttempt = undefined; };
      const fail = (allowNext = true) => {
        if (!current()) return;
        finish(); this.failMusic(target, track, allowNext);
      };
      const timer = setTimeout(() => fail(), MUSIC_START_TIMEOUT_MS);
      target.cancelAttempt = finish;
      element.onerror = () => fail();
      void Promise.resolve(element.play()).then(() => {
        if (!current()) return; // Obsolete promises cannot pause or promote a reused slot.
        finish();
        if (!this.canPlay('music')) { this.stopMusic(); return; }
        const previous = this.activeMusic;
        this.pendingMusic = undefined; this.activeMusic = target; this.currentTrack = track;
        this.musicRetryNeeded = false;
        // Slot identity alone is insufficient: later requests can reuse the same element.
        const ownsPlayback = () => this.activeMusic === target && target.track === track;
        element.onerror = () => {
          if (ownsPlayback() && !this.pendingMusic) this.failMusic(target, track);
        };
        element.onended = () => {
          if (!ownsPlayback() || this.pendingMusic || !this.canPlay('music')) return;
          const list = (bgmManifest.tracks as BGMTrackMeta[]).filter(t => t.scenes.includes(this.scene));
          if (list.length > 1) this.sceneTrackIndices.set(this.scene, ((this.sceneTrackIndices.get(this.scene) ?? 0) + 1) % list.length);
          this.startMusic();
        };
        this.musicLevel(target, 1, MUSIC_CROSSFADE_SECONDS);
        if (previous && previous !== target) {
          this.musicLevel(previous, 0, MUSIC_CROSSFADE_SECONDS);
          this.musicFadeTimer = setTimeout(() => {
            if (generation === this.musicGeneration) this.retireMusic(previous);
            this.musicFadeTimer = undefined;
          }, MUSIC_CROSSFADE_SECONDS * 1000);
        }
      }).catch(error => fail(error?.name !== 'NotAllowedError' && error?.name !== 'AbortError'));
    } catch {
      if (slot) this.failMusic(slot, track, false);
      else this.musicRetryNeeded = true;
    }
  }
  private configureMusicLoop(slot: MusicSlot): void {
    // Native looping suppresses ended: only one-track scenes may use it.
    slot.element.loop = (bgmManifest.tracks as BGMTrackMeta[]).filter(t => t.scenes.includes(this.scene)).length <= 1;
  }
  private musicLevel(slot: MusicSlot, level: number, duration = 0): void {
    const now = this.context!.currentTime, param = slot.gain.gain;
    if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
    else { param.cancelScheduledValues(now); param.setValueAtTime(param.value, now); }
    if (duration) param.linearRampToValueAtTime(level, now + duration);
    else param.setValueAtTime(level, now);
  }
  private retireMusic(slot: MusicSlot): void {
    slot.cancelAttempt?.(); slot.element.onerror = null; slot.element.onended = null;
    this.musicLevel(slot, 0); slot.element.pause();
  }
  private cancelMusicTransition(): void {
    this.musicGeneration++;
    clearTimeout(this.musicFadeTimer); this.musicFadeTimer = undefined;
    for (const slot of this.musicSlots) {
      if (slot !== this.activeMusic) this.retireMusic(slot);
      else {
        if (slot.cancelAttempt) { slot.cancelAttempt(); slot.element.pause(); }
        if (!slot.element.paused) this.musicLevel(slot, 1, .02);
      }
    }
    this.pendingMusic = undefined;
  }
  private failMusic(slot: MusicSlot, track: MusicTrack, allowNext = true): void {
    this.retireMusic(slot);
    // Abort the failed/stalled request as well as its play promise.
    slot.element.removeAttribute('src'); slot.element.load(); slot.track = undefined;
    if (this.pendingMusic === slot) this.pendingMusic = undefined;
    if (this.activeMusic === slot) this.activeMusic = undefined;
    this.musicFailures.add(track.runtimePath);
    const list = (bgmManifest.tracks as BGMTrackMeta[]).filter(t => t.scenes.includes(this.scene));
    const index = this.sceneTrackIndices.get(this.scene) ?? 0;
    if (allowNext) for (let offset = 1; offset <= list.length; offset++) {
      const next = (index + offset) % list.length;
      if (!this.musicFailures.has(list[next].runtimePath)) {
        this.sceneTrackIndices.set(this.scene, next); this.startMusic(); return;
      }
    }
    this.musicRetryNeeded = true; // Retry on a later gesture/scene, never spin forever.
  }
  private stopMusic(): void {
    try {
      this.cancelMusicTransition();
      for (const slot of this.musicSlots) this.retireMusic(slot);
    } catch { /* Device teardown. */ }
  }

  /** One short recorded texture per committed roll; no synthetic bed or tone. */
  scoreRoll(durationMs:number,kind:ScoreRollKind,strength=1):void {
    if(!['heat','mult','total'].includes(kind))return;
    for(const voice of this.voices)if(voice.roll===kind)this.release(voice);
    if(!Number.isFinite(durationMs)||durationMs<=0||bounded(strength,3)===0)return;
    const voices=this.cue(kind==='heat'?'rollHeat':kind==='mult'?'rollMult':'rollTotal','sfx',1,0,Math.min(1,bounded(strength,3)),Math.min(durationMs/1000,.18));
    for(const voice of voices)voice.roll=kind;
    if(voices.length)this.duckMusic(.2);
  }
  /** A missing sample is silent; callbacks never schedule it retroactively. */
  private recordedCue(name:string,duration:number,volume:number,bus:VoiceBus='sfx',rate=1,offset=0,shape?:Layer):Voice|undefined {
    if(!this.canPlay(bus))return;
    const buffer=this.scoreSamples.get(name);if(!buffer)return;
    try {
      const context=this.context!,source=context.createBufferSource(),gain=context.createGain(),time=context.currentTime+offset;
      // cloth2 has an 80ms quiet lead; start at its recorded cloth body, not silence.
      const body=this.sampleBodies.get(name),sampleOffset=body?.offset??(name==='cloth2'?.08:0);
      const speed=Number.isFinite(rate)?Math.max(.65,Math.min(MAX_RECORDED_RATE,rate)):1,length=Math.min(Math.max(.035,duration),(buffer.duration-sampleOffset)/speed);
      if(!Number.isFinite(length)||length<=0)return;
      source.buffer=buffer;source.playbackRate.value=speed;
      const peak=bounded(volume,.14)*SOURCE_GAIN[bus]*(body?.gain??1),attack=Math.min(length*.2,shape?.attack??.005),hold=Math.max(attack,length*(shape?.hold??.55));
      gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(peak,time+attack);gain.gain.setValueAtTime(peak,time+hold);gain.gain.linearRampToValueAtTime(0,time+length);
      let filter:BiquadFilterNode|undefined;const f=shape?.filter;
      if(f&&typeof context.createBiquadFilter==='function'){filter=context.createBiquadFilter();filter.type=f.type;filter.Q.value=f.Q;filter.frequency.setValueAtTime(f.frequency,time);filter.frequency.linearRampToValueAtTime(f.end,time+Math.min(length,f.sweep));source.connect(filter);filter.connect(gain);}else source.connect(gain);
      gain.connect(this.gains![bus]);const voice={source,gain,filter,bus,startsAt:time,endsAt:time+length,peak};this.retain(voice);source.start(time,sampleOffset);source.stop(time+length);return voice;
    }catch{return;}
  }
  /** minGap/per-semantic oldest-voice cap adapted from Inkwave audio.js 258–280 (MIT).
   * Gate complete recipes, so delayed layers survive without setTimeout callbacks.
   * Variants rotate locally; never read the domain RNG or queue a missing recording. */
  private cue(kind:FoleyKind,bus:VoiceBus='sfx',rate=1,offset=0,strength=1,duration?:number):Voice[] {
    if(!this.canPlay(bus))return [];
    const recipe=FOLEY[kind],now=this.context!.currentTime,time=now+offset,last=this.cueTimes.get(kind);
    if(last!==undefined&&time>=last&&time-last+1e-6<recipe.gap)return [];
    this.cueTimes.set(kind,time);
    const variant=this.variants.get(kind)??0;this.variants.set(kind,variant+1);
    // A late/unavailable preferred variant may use an already decoded sibling.
    // Missing families stay silent; this never queues or retries a past cue.
    const layers=recipe.layers.flatMap(layer=>{
      const rotated=layer.samples.map((_,i)=>layer.samples[(variant+i)%layer.samples.length]);
      const name=rotated.find(sample=>this.scoreSamples.has(sample));
      return name?[{layer,name}]:[];
    });
    if(!layers.length)return [];
    const end=time+Math.max(...layers.map(({layer})=>(layer.delay??0)+(duration===undefined?layer.duration:Math.min(duration,layer.duration))));
    const overlaps=(voice:Voice)=>voice.bus!=='music'&&(voice.startsAt??0)<end&&(voice.endsAt??Infinity)>time;
    const same=[...this.voices].filter(v=>v.semantic===kind&&overlaps(v));
    const reclaimed:Voice[]=[];
    while(same.length+layers.length>recipe.cap&&same.length){
      reclaimed.push(same.shift()!);
    }
    // Admission is atomic per available recipe. Texture cannot evict a stronger
    // beat; key/ending recipes may reclaim the lowest-priority/oldest tail.
    let active=[...this.voices].filter(v=>overlaps(v)&&!reclaimed.includes(v));
    const victims=active.filter(v=>(v.priority??1)<recipe.priority)
      .sort((a,b)=>(a.priority??1)-(b.priority??1)||(a.startsAt??0)-(b.startsAt??0));
    while(active.length+layers.length>EFFECT_VOICE_BUDGET&&victims.length){
      const victim=victims.shift()!;
      reclaimed.push(victim);
      active=active.filter(v=>v!==victim);
    }
    if(active.length+layers.length>EFFECT_VOICE_BUDGET)return [];
    // Commit reclamation only when the whole recipe fits. A rejected cue must
    // not remove existing beats merely because some weaker tails were found.
    for(const voice of reclaimed){
      if(time>now){try{voice.source.stop(time);voice.endsAt=time;}catch{this.release(voice);}}
      else this.release(voice);
    }
    if(recipe.priority>=3){
      for(const voice of active)if((voice.priority??1)<recipe.priority)this.softenTail(voice,time);
    }
    return layers.flatMap(({layer,name})=>{
      const voice=this.recordedCue(name,duration===undefined?layer.duration:Math.min(duration,layer.duration),layer.gain*bounded(strength,1.2),bus,rate*(layer.rate??1),offset+(layer.delay??0),layer);
      if(!voice)return [];voice.semantic=kind;voice.priority=recipe.priority;return [voice];
    });
  }
  /** Give a foreground strike room without changing preferences or its bus.
   * Short lower-priority tails fade down; they never recover into a second hit. */
  private softenTail(voice:Voice,time:number):void {
    if((voice.startsAt??0)>time)return; // Preserve a future beat's attack.
    try {
      const param=voice.gain.gain,end=voice.endsAt??time+.1;
      if(end<=time)return;
      if(typeof param.cancelAndHoldAtTime==='function')param.cancelAndHoldAtTime(time);
      else {param.cancelScheduledValues(time);param.setValueAtTime(Math.min(param.value,voice.peak??.1),time);}
      const quiet=Math.min(voice.peak??.1,param.value)*ACCENT_TAIL_FLOOR;
      param.linearRampToValueAtTime(quiet,Math.min(end,time+.015));
      param.linearRampToValueAtTime(0,end);
    } catch { /* The admission budget still bounds a device lacking automation. */ }
  }
  deal(index=0):void {this.cue('deal','sfx',1,Math.floor(bounded(index,14))*.055);}
  cardLand():void {this.cue('land');}
  hoverTick():void {this.cue('hover','ui');}
  coin():void {this.cue('coin','ui');}
  titleBell():void {this.cue('title');}
  titleConfirm():void {if(this.cue('confirm','ui').length)this.duckMusic(.32,.3);}
  curtainOpen():void {this.duckMusic(.4);this.cue('curtain');}
  select():void {if(this.cue('select','ui').length)this.duckMusic(.12,.7);}
  cancel():void {this.cue('cancel','ui');}
  deselect():void {this.cancel();}
  invalid():void {this.cue('invalid','ui');}
  playHand():void {this.duckMusic(.3);this.cue('play');}
  discard():void {this.cue('discard');}
  resourceSpend(kind:'play'|'discard',remaining:number,amount=1,cost=amount):void {
    if(!['play','discard'].includes(kind)||!Number.isSafeInteger(remaining)||remaining<0||!Number.isSafeInteger(amount)||amount<1||!Number.isSafeInteger(cost)||cost<1)return;
    const last=remaining<cost*2;this.duckMusic(last?.3:.16);
    for(let i=0;i<Math.min(amount,3);i++)this.cue(last?'spendLast':'spend','ui',kind==='play'?1:.85,i*.055);
  }
  sourceCue(kind:ScoreSourceCue,index=0):void {
    if(kind==='card')this.cardScore(index);else if(kind==='character')this.role();else if(kind==='joker')this.joker(index);else if(kind==='retrigger')this.retrigger(index);
    else{this.duckMusic(.2);this.cue(kind==='boss'?'boss':'held');}
  }
  cardScore(index=0):void {this.duckMusic(.14);this.cue('add','sfx',chainRate(index));}
  role():void {this.duckMusic(.4);this.cue('role');}
  joker(chainIndex:number):void {this.duckMusic(.28);this.cue('joker','sfx',1+bounded(chainIndex,6)*.025);}
  multiplier(kind:'add'|'multiply',chainIndex=0):void {this.duckMusic(kind==='multiply'?.4:.2);this.cue(kind==='multiply'?'multiply':'coin','sfx',chainRate(chainIndex));}
  retrigger(chainIndex=0):void {this.duckMusic(.2);this.cue('retrigger','sfx',1+bounded(chainIndex,5)*.025);}
  chanceRoll(kind:'lucky'|'glass'|'joker',hit:boolean):void {this.duckMusic(.2);this.cue(hit?'chanceHit':'chanceMiss','sfx',kind==='glass'?1.15:1);}
  glassBreak():void {this.duckMusic(.3);this.cue('glass');}
  toolUse(family:'tarot'|'planet'|'spectral'|'utility'):void {this.duckMusic(.3);this.cue(family);}
  score(intensity=0):void {this.duckMusic(.4);this.cue(bounded(intensity,2)>0?'key':'award');}
  overkill(tier:1|2|3):void {if(![1,2,3].includes(tier))return;this.duckMusic(.5);this.cue('award','sfx',1+(tier-1)*.025);}
  purchase():void {this.cue('purchase','ui');}
  sale():void {this.cue('sale','ui');}
  reroll():void {this.cue('reroll','ui');}
  rareReveal():void {this.duckMusic(.4);this.cue('reveal');}
  success():void {this.duckMusic(.6);this.cue('success');}
  /** A transient committed ending, never a saved result being reopened. */
  failure(cue:FailureCue):void {
    if(!cue||this.failureCues.has(cue))return;this.failureCues.add(cue);if(!this.canPlay('sfx'))return;
    this.duckMusic(.6);this.cue('failure');
  }

  /**
   * Returns the underlying AudioContext if initialized and available.
   */
  getAudioContext(): AudioContext | undefined {
    return this.context;
  }

  /**
   * Attaches a lowpass filter node specifically into the music bus branch.
   * [Music Sources / Slots] -> gains.music -> [filterNode] -> gains.master.
   * SFX and UI buses completely bypass this filter, keeping clicks and scoring chimes crisp.
   * Returns an unregister cleanup function that restores the direct music route.
   */
  attachMusicFilter(filterNode: BiquadFilterNode): () => void {
    this.musicFilterNode = filterNode;
    if (this.context && this.gains) {
      try {
        this.gains.music.disconnect();
        this.gains.music.connect(filterNode);
        filterNode.disconnect();
        filterNode.connect(this.gains.master);
      } catch {
        // Safe fallback: restore direct route if connection fails
        try {
          this.gains.music.disconnect();
          this.gains.music.connect(this.gains.master);
        } catch {}
      }
    }
    return () => {
      if (this.musicFilterNode === filterNode) {
        this.musicFilterNode = undefined;
        if (this.context && this.gains) {
          try {
            this.gains.music.disconnect();
            this.gains.music.connect(this.gains.master);
          } catch {}
        }
      }
    };
  }

  /**
   * Plays a synthesized pentatonic chime (宫商角徵羽) routed directly through the SFX bus.
   * Clamped between C4 (261Hz) and E6 (1318Hz), with harmonic shimmer and ducking.
   * Governed by master volume, sfx slider, mute, voice budget, and presentation cancellation.
   */
  playPentatonicNote(stepIndex: number, options: { isMultiplier?: boolean; speedRatio?: number } = {}): void {
    if (!this.canPlay('sfx')) return;
    try {
      const context = this.context!;
      const speed = Math.max(0.5, Math.min(5.0, options.speedRatio ?? 1.0));
      const now = context.currentTime;

      // Pentatonic scale base frequencies C4..A4
      const scale = [261.63, 293.66, 329.63, 392.00, 440.00];
      const noteIdx = Math.abs(stepIndex) % scale.length;
      const octave = Math.min(2, Math.floor(Math.abs(stepIndex) / scale.length));
      let freq = scale[noteIdx] * Math.pow(2, octave);
      if (freq > 1318.51) freq = 1318.51; // Hard clamp E6
      if (freq < 130.0) freq = 130.0;

      const duration = (options.isMultiplier ? 0.35 : 0.22) / speed;
      const osc = context.createOscillator();
      const oscHarmonic = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      oscHarmonic.type = 'triangle';
      oscHarmonic.frequency.setValueAtTime(freq * 2.008, now);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 1.5, now);
      filter.Q.setValueAtTime(2.5, now);

      const peakGain = (options.isMultiplier ? 0.28 : 0.20) * SOURCE_GAIN.sfx;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.008 / speed);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      oscHarmonic.connect(filter);
      filter.connect(gain);
      gain.connect(this.gains!.sfx);

      const voice: Voice = {
        source: osc,
        secondarySources: [oscHarmonic],
        gain,
        filter,
        bus: 'sfx',
        scoreAccent: true,
        startsAt: now,
        endsAt: now + duration,
        priority: options.isMultiplier ? 3 : 2
      };
      this.retain(voice);

      osc.start(now);
      oscHarmonic.start(now);
      osc.stop(now + duration);
      oscHarmonic.stop(now + duration);

      this.duckMusic(options.isMultiplier ? 0.35 : 0.16, 0.3);
    } catch {
      // Audio errors must never disrupt gameplay
    }
  }

  /**
   * Plays a heavy Tang Dynasty war drum sub-bass hit for multiplier / climax events.
   * Pitch bends downward from 135Hz to 36Hz with a resonant low-pass filter.
   * Routed through SFX bus, obeying mute, volume, and presentation cancellation.
   */
  playWarDrum(options: { speedRatio?: number } = {}): void {
    if (!this.canPlay('sfx')) return;
    try {
      const context = this.context!;
      const speed = Math.max(0.5, Math.min(5.0, options.speedRatio ?? 1.0));
      const now = context.currentTime;
      const duration = 0.55 / speed;

      const osc = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(135, now);
      osc.frequency.exponentialRampToValueAtTime(36, now + duration);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, now);
      filter.frequency.exponentialRampToValueAtTime(55, now + duration);
      filter.Q.setValueAtTime(4.0, now);

      const peakGain = 0.38 * SOURCE_GAIN.sfx;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.006 / speed);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.gains!.sfx);

      const voice: Voice = {
        source: osc,
        gain,
        filter,
        bus: 'sfx',
        scoreAccent: true,
        startsAt: now,
        endsAt: now + duration,
        priority: 4
      };
      this.retain(voice);

      osc.start(now);
      osc.stop(now + duration);

      this.duckMusic(0.45, 0.2);
    } catch {
      // Audio errors must never disrupt gameplay
    }
  }

  /**
   * Plays a resonant Bronze Temple Bell for resolution / victory.
   * 432Hz bronze chime with long decay.
   */
  playTempleBell(options: { speedRatio?: number } = {}): void {
    if (!this.canPlay('sfx')) return;
    try {
      const context = this.context!;
      const speed = Math.max(0.5, Math.min(5.0, options.speedRatio ?? 1.0));
      const now = context.currentTime;
      const duration = 1.2 / speed;

      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(432, now);

      const peakGain = 0.32 * SOURCE_GAIN.sfx;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.01 / speed);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.gains!.sfx);

      const voice: Voice = {
        source: osc,
        gain,
        bus: 'sfx',
        scoreAccent: true,
        startsAt: now,
        endsAt: now + duration,
        priority: 4
      };
      this.retain(voice);

      osc.start(now);
      osc.stop(now + duration);

      this.duckMusic(0.6, 0.25);
    } catch {}
  }
}
