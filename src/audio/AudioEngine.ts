import { CHOPIN_BEATS, CHOPIN_PASSES, CHOPIN_SCORE } from './chopinTheme';

export type AudioBus = 'master' | 'music' | 'sfx' | 'ui';
export type AudioScene = 'menu' | 'shop' | 'table' | 'boss' | 'success' | 'failure';
type VoiceBus = Exclude<AudioBus, 'master'>;
type Voice = { source: AudioScheduledSourceNode; gain: GainNode; filter?: BiquadFilterNode; bus: VoiceBus; fire?: boolean };
export type ScoreSourceCue = 'card' | 'held' | 'character' | 'joker' | 'boss' | 'retrigger';

// Public-domain Chopin notation, locally arranged; no recording or rule RNG.
// Three 16-bar passes: piano, velvet strings, then a lighter melodic return.
const LOOP_EVENTS = CHOPIN_SCORE.length * CHOPIN_PASSES;
const MELODY_TOP = new Map<number, number>();
for (const [beat, , notes, hand] of CHOPIN_SCORE) if (hand === 'right')
  MELODY_TOP.set(beat, Math.max(MELODY_TOP.get(beat) ?? 0, ...notes));
const PROFILES: Record<AudioScene, { bpm: number; level: number; melody: boolean }> = {
  menu: { bpm: 78, level: .94, melody: true },
  shop: { bpm: 80, level: .94, melody: true },
  table: { bpm: 86, level: 1, melody: true },
  boss: { bpm: 98, level: 1.05, melody: true },
  success: { bpm: 78, level: .48, melody: false },
  failure: { bpm: 74, level: .60, melody: true },
};
const bounded = (value: number, max: number): number => Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
const midiHz = (note: number): number => 440 * 2 ** ((note - 69) / 12);
const SOURCE_GAIN: Record<VoiceBus, number> = { music: 6.2, sfx: 5.7, ui: 4.5 };

/** One application context. The app owns gesture/visibility listeners and persistence. */
export class AudioEngine {
  static readonly shared = new AudioEngine();
  private context?: AudioContext;
  private gains?: Record<AudioBus, GainNode>;
  private noise?: AudioBuffer;
  private pluckedWave?: PeriodicWave;
  private leadWave?: PeriodicWave;
  private pianoWave?: PeriodicWave;
  private fireBed?: AudioBuffer;
  private fireCrackles?: AudioBuffer;
  private fireVoices = new Set<Voice>();
  private fireIntensity: 0 | 1 | 2 | 3 = 0;
  private voices = new Set<Voice>();
  private volumes: Record<AudioBus, number> = { master: 1, music: .74, sfx: 1, ui: .9 };
  private masterMuted = false;
  private musicIsMuted = false;
  private suspended = false;
  private unlocked = false;
  private unlockTask?: Promise<void>;
  private scene: AudioScene = 'menu';
  private musicTimer?: ReturnType<typeof setInterval>;
  private musicStep = 0;
  private nextStepTime = 0;
  private duckUntil = 0;

  get muted(): boolean { return this.masterMuted; }
  set muted(value: boolean) {
    this.masterMuted = value;
    this.applyVolume('master');
    if (value) { this.stopScoreFire(); this.stopMusic(); this.stopVoices(); this.duckUntil = 0; this.applyVolume('music'); }
    else if (this.unlocked) void this.unlock();
  }
  get musicMuted(): boolean { return this.musicIsMuted; }
  set musicMuted(value: boolean) {
    this.musicIsMuted = value;
    if (value) this.duckUntil = 0;
    this.applyVolume('music');
    if (value) this.stopMusic();
    else this.startMusic();
  }
  setVolume(bus: AudioBus, value: number): void {
    this.volumes[bus] = bounded(value, 1);
    this.applyVolume(bus);
  }
  getVolume(bus: AudioBus): number { return this.volumes[bus]; }

  /** Call only from the application's first pointer/key gesture; repeated calls are safe. */
  unlock(): Promise<void> {
    // Remember a real gesture even when initially muted; unmuting can then create
    // or resume the context after the app's one-shot gesture listeners are gone.
    this.unlocked = true;
    // A muted first click can itself unmute in the same event. Do not retain an
    // already-resolved no-op task that would swallow that synchronous second call.
    if (this.masterMuted || this.suspended || this.hidden()) return Promise.resolve();
    if (this.unlockTask) return this.unlockTask;
    const pending = this.enableAudio();
    this.unlockTask = pending;
    void pending.then(() => { if (this.unlockTask === pending) this.unlockTask = undefined; });
    return pending;
  }

  setScene(scene: AudioScene): void {
    if (scene === this.scene) return;
    this.scene = scene;
    this.stopScoreFire();
    this.stopMusic();
    this.duckUntil = 0;
    this.applyVolume('music');
    if (scene === 'menu') this.musicStep = 0;
    // Keep the phrase position through shop/table transitions so short stages also
    // reach the variation and breathing section, rather than restarting the hook.
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
        gains.music.connect(gains.master);
        gains.sfx.connect(gains.master);
        gains.ui.connect(gains.master);
        gains.master.connect(compressor);
        compressor.connect(ceiling);
        ceiling.connect(context.destination);
        this.gains = gains;
        for (const bus of Object.keys(gains) as AudioBus[]) this.applyVolume(bus);
        try {
          this.pluckedWave = context.createPeriodicWave(
            new Float32Array(6), new Float32Array([0, 1, .32, .13, .045, .015]),
          );
          this.leadWave = context.createPeriodicWave(
            new Float32Array(6), new Float32Array([0, 1, .11, .18, .055, .025]),
          );
          this.pianoWave = context.createPeriodicWave(
            new Float32Array(9), new Float32Array([0, 1, .36, .19, .085, .045, .025, .012, .005]),
          );
        } catch { /* Filtered triangle is the fallback on limited audio devices. */ }
        const noise = context.createBuffer(1, Math.ceil(context.sampleRate * .18), context.sampleRate);
        this.noise = noise;
        const samples = noise.getChannelData(0);
        let seed = 0x50415045;
        for (let i = 0; i < samples.length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          samples[i] = seed / 0xffffffff * 2 - 1;
        }
        this.createFireBuffers(context);
      }
      const context = this.context;
      if (!context) return;
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
      const value = (bus === 'master' && this.masterMuted) || (bus === 'music' && this.musicIsMuted) ? 0 : this.volumes[bus];
      gain.gain.cancelScheduledValues(context.currentTime);
      const now = context.currentTime;
      // Zero is an exact mute, not an exponential tail that stays faintly audible.
      if (value === 0) gain.gain.setValueAtTime(0, now);
      else if (bus === 'music' && this.duckUntil > now) {
        const quiet = value * .35, remaining = this.duckUntil - now;
        gain.gain.setTargetAtTime(quiet, now, .008);
        gain.gain.setValueAtTime(quiet, now + remaining * .65);
        gain.gain.linearRampToValueAtTime(value, this.duckUntil);
      } else gain.gain.setTargetAtTime(value, now, .015);
    } catch { /* Settings remain usable when an audio device is unavailable. */ }
  }

  private canPlay(bus: VoiceBus): boolean {
    return !!this.context && !!this.gains && this.unlocked && !this.masterMuted && !this.suspended
      && !this.hidden() && !(bus === 'music' && this.musicIsMuted) && this.context.state !== 'closed';
  }
  private retain(voice: Voice): void {
    // Fast-forwarded/long traces cannot create an unbounded wall of simultaneous sound.
    if (this.voices.size >= 32) {
      const oldest = [...this.voices].find(voice => !voice.fire) ?? this.voices.values().next().value;
      if (oldest) this.release(oldest);
    }
    this.voices.add(voice);
    voice.source.onended = () => this.release(voice);
  }
  private release(voice: Voice): void {
    this.voices.delete(voice);
    this.fireVoices.delete(voice);
    voice.source.onended = null;
    try { voice.source.stop(); } catch { /* The source may already have ended. */ }
    try { voice.source.disconnect(); voice.gain.disconnect(); voice.filter?.disconnect(); } catch { /* Device teardown. */ }
  }
  private stopVoices(bus?: VoiceBus): void {
    for (const voice of this.voices) if (!bus || voice.bus === bus) this.release(voice);
  }
  /** Cancel a skipped scene's score tails while its table music keeps playing. */
  cancelPresentation(): void { this.stopScoreFire(); this.stopVoices('sfx'); this.duckUntil = 0; this.applyVolume('music'); }

  private note(note: number, duration: number, volume: number, bus: VoiceBus = 'sfx', offset = 0, wave: OscillatorType = 'triangle', absoluteTime?: number, endNote?: number, color: 'clean' | 'pluck' | 'warm' | 'lead' | 'piano' | 'string' = 'clean'): void {
    if (!this.canPlay(bus)) return;
    try {
      const context = this.context!, oscillator = context.createOscillator(), gain = context.createGain();
      const time = Math.max(context.currentTime, absoluteTime ?? context.currentTime + offset);
      oscillator.type = wave;
      if (color === 'pluck' && this.pluckedWave) oscillator.setPeriodicWave(this.pluckedWave);
      if (color === 'lead' && this.leadWave) oscillator.setPeriodicWave(this.leadWave);
      if (color === 'piano' && this.pianoWave) oscillator.setPeriodicWave(this.pianoWave);
      oscillator.frequency.setValueAtTime(midiHz(Math.max(24, Math.min(bus === 'music' ? 90 : 81, note))), time);
      if (endNote !== undefined) oscillator.frequency.exponentialRampToValueAtTime(midiHz(endNote), time + duration);
      gain.gain.setValueAtTime(.0001, time);
      const peak = bounded(volume * SOURCE_GAIN[bus], .5);
      gain.gain.linearRampToValueAtTime(peak, time + (color === 'string' ? .07 : color === 'warm' || color === 'lead' ? .014 : .006));
      if (color === 'lead' || color === 'string') gain.gain.linearRampToValueAtTime(peak * .78, time + duration * .62);
      if (color === 'piano') {
        gain.gain.exponentialRampToValueAtTime(peak * .60, time + Math.min(.07, duration * .22));
        gain.gain.exponentialRampToValueAtTime(peak * .22, time + duration * .72);
      }
      gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
      let filter: BiquadFilterNode | undefined;
      if (color !== 'clean') {
        filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = .35;
        filter.frequency.setValueAtTime(color === 'warm' ? 900 : color === 'string' ? 1500 : color === 'piano' ? 4200 : color === 'lead' ? 2600 : 2200, time);
        filter.frequency.exponentialRampToValueAtTime(color === 'warm' ? 500 : color === 'string' ? 1000 : color === 'piano' ? 1700 : color === 'lead' ? 1500 : 950, time + duration);
        oscillator.connect(filter); filter.connect(gain);
      } else oscillator.connect(gain);
      gain.connect(this.gains![bus]);
      this.retain({ source: oscillator, gain, filter, bus });
      oscillator.start(time);
      oscillator.stop(time + duration + .015);
    } catch { /* Every individual sound is optional; no command awaits audio. */ }
  }
  private paper(duration = .09, volume = .025, offset = 0, bus: VoiceBus = 'sfx', absoluteTime?: number, frequency = 1400): void {
    if (!this.canPlay(bus) || !this.noise) return;
    try {
      const context = this.context!, source = context.createBufferSource(), gain = context.createGain(), filter = context.createBiquadFilter();
      const time = Math.max(context.currentTime, absoluteTime ?? context.currentTime + offset);
      source.buffer = this.noise;
      filter.type = 'bandpass';
      filter.frequency.value = frequency;
      filter.Q.value = .65;
      gain.gain.setValueAtTime(.0001, time);
      gain.gain.linearRampToValueAtTime(bounded(volume * 2, .12), time + .006);
      gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
      source.connect(filter); filter.connect(gain); gain.connect(this.gains![bus]);
      this.retain({ source, gain, filter, bus });
      source.start(time);
      source.stop(time + duration);
    } catch { /* Missing synthesis support only removes the paper layer. */ }
  }
  private duckMusic(duration = .3): void {
    if (!this.canPlay('music')) return;
    try {
      const context = this.context!;
      this.duckUntil = Math.max(this.duckUntil, context.currentTime + bounded(duration, 1.5));
      this.applyVolume('music');
    } catch { /* Ducking failure is inaudible to rule state. */ }
  }

  private woodTap(time: number, volume: number): void {
    this.note(65, .045, volume, 'music', 0, 'sine', time, 54, 'warm');
    this.paper(.027, volume * .4, 0, 'music', time, 1050);
  }
  private softClap(time: number, volume: number): void {
    // Three very short filtered grains make a soft hand-clap rather than a hi-hat.
    this.paper(.055, volume, 0, 'music', time, 1650);
    this.paper(.042, volume * .65, 0, 'music', time + .012, 1250);
    this.paper(.032, volume * .4, 0, 'music', time + .024, 950);
  }

  private createFireBuffers(context: AudioContext): void {
    const bed = context.createBuffer(1, Math.ceil(context.sampleRate * 2.4), context.sampleRate);
    const crackles = context.createBuffer(1, Math.ceil(context.sampleRate * 1.79), context.sampleRate);
    let seed = 0x46495245, pink = 0, grain = 0;
    const sample = (): number => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0xffffffff * 2 - 1;
    };
    const bedData = bed.getChannelData(0), crackleData = crackles.getChannelData(0);
    for (let i = 0; i < bedData.length; i++) {
      const white = sample(); pink = pink * .985 + white * .035;
      const edge = Math.min(1, i / (context.sampleRate * .025), (bedData.length - i) / (context.sampleRate * .025));
      bedData[i] = (pink * .65 + white * .15) * edge;
    }
    const interval = Math.max(1, Math.floor(context.sampleRate * .023));
    for (let i = 0; i < crackleData.length; i++) {
      const white = sample();
      if (i % interval === 0 && white > .38) grain = .4 + white * .6;
      grain *= .988;
      const edge = Math.min(1, i / (context.sampleRate * .015), (crackleData.length - i) / (context.sampleRate * .015));
      crackleData[i] = white * grain * edge;
    }
    this.fireBed = bed;
    this.fireCrackles = crackles;
  }

  /** Two bounded SFX sources for the actual score-fire state, never a second context. */
  setScoreFire(intensity: 0 | 1 | 2 | 3): void {
    if (intensity === 0 || ![1, 2, 3].includes(intensity) || !this.canPlay('sfx')) { this.stopScoreFire(); return; }
    if (this.fireIntensity === intensity && this.fireVoices.size === 2) return;
    try {
      const context = this.context!;
      if (this.fireVoices.size !== 2) {
        this.stopScoreFire();
        for (const [buffer, type] of [[this.fireBed, 'lowpass'], [this.fireCrackles, 'bandpass']] as const) {
          if (!buffer) { this.stopScoreFire(); return; }
          const source = context.createBufferSource(), gain = context.createGain(), filter = context.createBiquadFilter();
          source.buffer = buffer; source.loop = true;
          filter.type = type; filter.Q.value = type === 'lowpass' ? .4 : .65;
          gain.gain.setValueAtTime(0, context.currentTime);
          source.connect(filter); filter.connect(gain); gain.connect(this.gains!.sfx);
          const voice: Voice = {source, gain, filter, bus: 'sfx', fire: true};
          this.fireVoices.add(voice); this.retain(voice); source.start();
        }
      }
      this.fireIntensity = intensity;
      for (const voice of this.fireVoices) {
        const bed = voice.filter!.type === 'lowpass';
        voice.gain.gain.setTargetAtTime((bed ? [.14, .20, .26] : [.12, .19, .28])[intensity - 1], context.currentTime, .025);
        voice.filter!.frequency.setTargetAtTime(bed ? 290 + intensity * 120 : 760 + intensity * 270, context.currentTime, .04);
      }
    } catch { this.stopScoreFire(); }
  }

  /** Stop now on fast-forward, shutdown, new stage or background; no stale auto-resume. */
  stopScoreFire(): void {
    this.fireIntensity = 0;
    for (const voice of this.fireVoices) this.release(voice);
  }

  private startMusic(): void {
    if (this.musicTimer !== undefined || !this.canPlay('music') || this.context!.state !== 'running') return;
    this.nextStepTime = this.context!.currentTime + .04;
    this.scheduleMusic();
    this.musicTimer = setInterval(() => this.scheduleMusic(), 80);
  }
  private stopMusic(): void {
    if (this.musicTimer !== undefined) clearInterval(this.musicTimer);
    this.musicTimer = undefined;
    this.stopVoices('music');
  }
  private scheduleMusic(): void {
    const context = this.context;
    if (!context || !this.canPlay('music') || context.state !== 'running') { this.stopMusic(); return; }
    const profile = PROFILES[this.scene], quarter = 60 / profile.bpm;
    // A throttled tab resumes one lookahead window, never a burst of missed bars.
    if (this.nextStepTime < context.currentTime - .15) this.nextStepTime = context.currentTime + .025;
    while (this.nextStepTime < context.currentTime + .14) {
      const index = this.musicStep % CHOPIN_SCORE.length, pass = Math.floor(this.musicStep / CHOPIN_SCORE.length);
      const [beat, held, notes, hand, velocity] = CHOPIN_SCORE[index], time = this.nextStepTime;
      const breath = beat >= 42 ? .91 : beat >= 30 && beat <= 40 ? 1.06 : 1;
      const level = profile.level * [1, .92, .82][pass] * breath * velocity / 90;
      if (hand === 'left' || profile.melody) notes.forEach(pitch => {
        const melody = hand === 'right' && pitch === MELODY_TOP.get(beat);
        const bass = hand === 'left' && pitch < 48;
        const volume = melody ? .076 : bass ? .081 : hand === 'left' ? .038 : .027;
        const color = pass === 1 && hand === 'left' && !bass ? 'pluck' : 'piano';
        this.note(pitch, quarter * held * .94 + .13, volume * level, 'music', 0, 'triangle', time, undefined, color);
      });
      // A restrained bowed layer opens the middle pass while retaining the score.
      if (pass === 1 && hand === 'left' && held >= 2 && profile.melody) {
        for (const pitch of [notes[0], notes[notes.length - 1]])
          this.note(pitch, quarter * held * 1.15, .018 * profile.level, 'music', 0, 'triangle', time, undefined, 'string');
      }
      if (hand === 'left' && notes[0] < 48) {
        if (this.scene === 'shop') this.woodTap(time, .012);
        if (this.scene === 'boss') { this.woodTap(time, .019); this.softClap(time + quarter, .018); }
        else if (this.scene === 'table' && pass === 1) this.softClap(time + quarter * 2, .012);
      }
      const next = (index + 1) % CHOPIN_SCORE.length;
      const gap = CHOPIN_SCORE[next][0] - beat + (next === 0 ? CHOPIN_BEATS : 0);
      this.nextStepTime += gap * quarter;
      this.musicStep = (this.musicStep + 1) % LOOP_EVENTS;
    }
  }

  /** Short filtered swish for one dealt card; the caller passes the visual stagger index. */
  deal(index = 0): void {
    const i = Math.floor(bounded(index, 8));
    this.paper(.075, .02, i * .055, 'sfx', undefined, 1150 + i * 70);
    this.note(57 + Math.min(i, 6), .05, .015, 'sfx', i * .055, 'triangle');
  }
  /** Soft warm thump when a played card lands in the scoring area. */
  cardLand(): void {
    this.note(54, .07, .034, 'sfx', 0, 'sine', undefined, 45, 'warm');
    this.paper(.04, .02, 0, 'sfx', undefined, 900);
  }
  private lastHoverTick = 0;
  /** Nearly-silent paper tick on card hover; throttled so sweeping the hand cannot buzz. */
  hoverTick(): void {
    const now = typeof performance === 'undefined' ? 0 : performance.now();
    if (now - this.lastHoverTick < 55) return;
    this.lastHoverTick = now;
    this.paper(.032, .011, 0, 'ui', undefined, 2100);
  }
  coin(): void { this.note(78, .07, .024, 'ui', 0, 'sine'); this.note(81, .09, .019, 'ui', .045, 'sine'); }
  /** A gentle bell when the user continues a saved run from the title. */
  titleBell(): void {
    const pitch = 69;
    this.note(pitch, .36, .027, 'sfx', 0, 'sine');
    this.note(Math.min(81, pitch + 12), .21, .008, 'sfx', .009, 'sine');
    this.note(pitch - 12, .16, .009, 'sfx', 0, 'triangle', undefined, undefined, 'warm');
  }
  /** A single soft fabric pull and warm chord when the user opens the curtain. */
  curtainOpen(): void {
    this.duckMusic(.55);
    this.paper(.18, .018, 0, 'sfx', undefined, 850);
    this.paper(.16, .016, .11, 'sfx', undefined, 1150);
    this.paper(.14, .014, .24, 'sfx', undefined, 900);
    this.note(45, .26, .027, 'sfx', 0, 'sine', undefined, 52, 'warm');
    this.note(57, .24, .026, 'sfx', .10, 'triangle', undefined, undefined, 'pluck');
    this.note(64, .25, .020, 'sfx', .16, 'sine', undefined, undefined, 'warm');
  }
  select(): void { this.note(74, .07, .045, 'ui'); this.note(78, .055, .017, 'ui', .024, 'sine'); }
  cancel(): void { this.note(71, .08, .035, 'ui', 0, 'triangle', undefined, 67); }
  deselect(): void { this.cancel(); }
  invalid(): void { this.note(55, .11, .035, 'ui'); this.note(54, .08, .025, 'ui', .095); }
  playHand(): void { this.duckMusic(); this.paper(.12, .052); this.note(50, .13, .065, 'sfx', .02, 'sine', undefined, 43); }
  discard(): void { this.paper(.08, .046); this.paper(.09, .03, .055); this.note(62, .095, .027, 'sfx', .015, 'triangle', undefined, 55); }
  /** One committed counter decrement; the view passes the actual post-command balance. */
  resourceSpend(kind: 'play' | 'discard', remaining: number, amount = 1, cost = amount): void {
    if ((kind !== 'play' && kind !== 'discard') || !Number.isSafeInteger(remaining) || remaining < 0
      || !Number.isSafeInteger(amount) || amount < 1 || !Number.isSafeInteger(cost) || cost < 1) return;
    const pitch = kind === 'play' ? 60 : 55;
    const exhausted = remaining < cost, last = !exhausted && remaining < cost * 2;
    this.duckMusic(exhausted || last ? .4 : .16);
    for (let i = 0; i < Math.min(amount, 3); i++) {
      this.note(pitch, .065, .030, 'ui', i * .035, 'sine', undefined, pitch - 5, 'warm');
      this.paper(.035, .018, i * .035, 'ui', undefined, kind === 'play' ? 1250 : 850);
    }
    if (last) {
      this.note(pitch - 5, .16, .037, 'ui', .08, 'triangle', undefined, undefined, 'warm');
      this.note(pitch + 2, .14, .028, 'ui', .18, 'sine');
    } else if (exhausted) {
      this.note(pitch - 10, .23, .045, 'ui', .07, 'sine', undefined, pitch - 17, 'warm');
      this.paper(.07, .022, .09, 'ui', undefined, 650);
    }
  }
  /** One source impact, called from a committed trace hit rather than a redraw. */
  sourceCue(kind: ScoreSourceCue, index = 0): void {
    if (kind === 'card') this.cardScore(index);
    else if (kind === 'character') this.role();
    else if (kind === 'joker') this.joker(index);
    else if (kind === 'retrigger') this.retrigger(index);
    else if (kind === 'held') {
      this.duckMusic(.16);
      this.note(52, .15, .050, 'sfx', 0, 'triangle', undefined, undefined, 'pluck');
      this.note(64, .17, .027, 'sfx', .025, 'sine', undefined, undefined, 'piano');
    } else if (kind === 'boss') {
      this.duckMusic(.3);
      this.note(40, .25, .078, 'sfx', 0, 'sine', undefined, 31, 'warm');
      this.paper(.1, .042, 0, 'sfx', undefined, 650);
    }
  }
  cardScore(index = 0): void {
    this.duckMusic(.14);
    this.note([64, 66, 69, 71, 73][Math.floor(bounded(index, 4))], .15, .052, 'sfx', 0, 'triangle', undefined, undefined, 'piano');
    this.paper(.035, .014, 0, 'sfx', undefined, 1150);
  }
  role(): void {
    this.duckMusic(.4);
    [57, 64, 73].forEach((n, i) => this.note(n, .24, .045, 'sfx', i * .040, 'triangle', undefined, undefined, 'lead'));
    this.paper(.06, .022, 0, 'sfx', undefined, 1050);
  }
  joker(chainIndex: number): void {
    const index = Math.floor(bounded(chainIndex, 6));
    this.duckMusic(.32);
    const pitch = [64, 66, 68, 69, 71, 73, 76][index];
    this.note(pitch, .20, .066, 'sfx', 0, 'triangle', undefined, undefined, 'pluck');
    this.note(Math.min(81, pitch + 12), .16, .019, 'sfx', .028, 'sine');
    if (index >= 3) this.note(57, .14, .033, 'sfx', 0, 'sine', undefined, undefined, 'warm');
  }
  multiplier(kind: 'add' | 'multiply', chainIndex = 0): void {
    const step = [0, 2, 4, 7, 9][Math.floor(bounded(chainIndex, 4))];
    this.duckMusic(kind === 'multiply' ? .4 : .2);
    if (kind === 'add') {
      this.note(64 + step, .17, .053, 'sfx', 0, 'triangle', undefined, undefined, 'piano');
      this.note(69 + step, .18, .037, 'sfx', .028, 'sine');
    }
    else {
      this.note(45, .29, .081, 'sfx', 0, 'sine', undefined, 31, 'warm');
      this.note(57, .20, .046, 'sfx', .012, 'triangle', undefined, undefined, 'warm');
      this.paper(.07, .029, 0, 'sfx', undefined, 720);
      this.note(73, .21, .049, 'sfx', .042, 'triangle', undefined, undefined, 'lead');
      this.note(81, .18, .026, 'sfx', .09, 'sine');
    }
  }
  retrigger(chainIndex = 0): void {
    this.duckMusic(.2);
    const n = [69, 71, 73, 76, 78, 81][Math.floor(bounded(chainIndex, 5))];
    this.note(n, .07, .059, 'sfx', 0, 'triangle', undefined, undefined, 'pluck');
    this.note(n, .11, .064, 'sfx', .072, 'triangle', undefined, undefined, 'piano');
  }
  score(intensity = 0): void {
    const tier = Math.floor(bounded(intensity, 2));
    this.duckMusic(.5);
    [64, 69, 73].forEach((n, i) => this.note(n, .26 + tier * .06, .053, 'sfx', i * .035, 'sine'));
    if (tier > 0) this.note(76, .26, .054, 'sfx', .12, 'triangle', undefined, undefined, 'piano');
    if (tier > 1) {
      this.note(43, .25, .068, 'sfx', 0, 'sine', undefined, 31, 'warm');
      this.paper(.06, .016, 0, 'sfx', undefined, 1000);
      this.note(81, .16, .028, 'sfx', .20, 'sine');
    }
  }
  /** Actual target crossing only; the view computes the tier from exact score values. */
  overkill(tier: 1 | 2 | 3): void {
    if (tier !== 1 && tier !== 2 && tier !== 3) return;
    this.duckMusic(.4 + tier * .2);
    this.note(tier === 3 ? 33 : 45, .21 + tier * .06, .066 + tier * .01, 'sfx', 0, 'sine', undefined, 30, 'warm');
    this.paper(.06 + tier * .01, .030, 0, 'sfx', undefined, 850);
    [64, 69, 73, ...(tier > 1 ? [76] : [])].forEach((pitch, i) =>
      this.note(pitch, .23 + tier * .04, .051, 'sfx', .025 + i * .04, 'sine'));
    if (tier > 1) this.note(57, .26, .052, 'sfx', .012, 'triangle', undefined, undefined, 'warm');
    if (tier === 3) {
      this.paper(.075, .040, .16, 'sfx', undefined, 1400);
      [73, 76, 81].forEach((pitch, i) => this.note(pitch, .32, .045, 'sfx', .24 + i * .035, 'triangle', undefined, undefined, 'lead'));
    }
  }
  purchase(): void { [78, 81, 74].forEach((n, i) => this.note(n, .13, .038, 'ui', i * .05, 'sine')); }
  sale(): void { [76, 71, 67].forEach((n, i) => this.note(n, .12, .037, 'ui', i * .05)); }
  reroll(): void { this.paper(.08, .036); this.paper(.08, .03, .075); [67, 74].forEach((n, i) => this.note(n, .11, .027, 'ui', .05 + i * .075)); }
  rareReveal(): void { this.duckMusic(.65); [62, 69, 78, 81].forEach((n, i) => this.note(n, .36, .038, 'sfx', i * .075, 'sine')); }
  success(): void { this.duckMusic(.9); [62, 66, 69, 74, 78, 81].forEach((n, i) => this.note(n, .38, .045, 'sfx', i * .07)); }
  failure(): void { this.duckMusic(1); [69, 65, 62].forEach((n, i) => this.note(n, .4, .033, 'sfx', i * .16, 'sine')); }
}
