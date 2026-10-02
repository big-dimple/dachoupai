import recording from '../../public/assets/audio/p06/recording.json';

export type AudioBus = 'master' | 'music' | 'sfx' | 'ui';
export type AudioScene = 'menu' | 'shop' | 'table' | 'boss' | 'success' | 'failure';
type VoiceBus = Exclude<AudioBus, 'master'>;
type Voice = { source: AudioScheduledSourceNode; gain: GainNode; filter?: BiquadFilterNode; bus: VoiceBus; fire?: boolean; fireLayer?: 'bed'|'rumble'; roll?: ScoreRollKind };
export type ScoreSourceCue = 'card' | 'held' | 'character' | 'joker' | 'boss' | 'retrigger';
export type ScoreRollKind = 'heat' | 'mult' | 'total';

// Only a verified recording may populate this manifest. No synthesized BGM fallback.
const RECORDING_PATH: string | null = recording.runtimePath;
const bounded = (value: number, max: number): number => Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
const midiHz = (note: number): number => 440 * 2 ** ((note - 69) / 12);
const SOURCE_GAIN: Record<VoiceBus, number> = { music: 1, sfx: 5.7, ui: 4.5 };

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
  private fireRumble?: AudioBuffer;
  private rollBuffer?: AudioBuffer;
  private fireVoices = new Set<Voice>();
  private fireIntensity: 0 | 1 | 2 = 0;
  private voices = new Set<Voice>();
  private volumes: Record<AudioBus, number> = { master: 1, music: .22, sfx: 1, ui: 1 };
  private masterMuted = false;
  private musicIsMuted = false;
  private suspended = false;
  private unlocked = false;
  private unlockTask?: Promise<void>;
  private scene: AudioScene = 'menu';
  private musicElement?: HTMLAudioElement;
  private musicNode?: MediaElementAudioSourceNode;
  private musicTask?: Promise<void>;
  private musicGeneration = 0;
  private musicFailed = false;
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
    this.stopVoices('sfx');
    this.duckUntil = 0;
    this.applyVolume('music');
    // The same performance continues across title, shop, table and intermission.
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
        this.createRollBuffer(context);
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
      && !this.hidden() && this.volumes.master > 0 && this.volumes[bus] > 0
      && !(bus === 'music' && this.musicIsMuted) && this.context.state !== 'closed';
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

  private createFireBuffers(context: AudioContext): void {
    const bed = context.createBuffer(1, Math.ceil(context.sampleRate * 2.4), context.sampleRate);
    const rumble = context.createBuffer(1, Math.ceil(context.sampleRate * 3.17), context.sampleRate);
    let seed = 0x46495245, brown = 0, turbulence = 0;
    const sample = (): number => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0xffffffff * 2 - 1;
    };
    const bedData = bed.getChannelData(0), rumbleData = rumble.getChannelData(0);
    for (let i = 0; i < bedData.length; i++) {
      brown = brown * .998 + sample() * .065;
      const edge = Math.min(1, i / (context.sampleRate * .08), (bedData.length - i) / (context.sampleRate * .08));
      bedData[i] = Math.tanh(brown) * .72 * edge;
    }
    for (let i = 0; i < rumbleData.length; i++) {
      turbulence = turbulence * .975 + sample() * .095;
      const time = i / context.sampleRate;
      const swell = .64 + .22 * Math.sin(time * 5.1) + .12 * Math.sin(time * 12.7);
      const edge = Math.min(1, time / .08, (rumbleData.length - i) / (context.sampleRate * .08));
      rumbleData[i] = Math.tanh(turbulence) * swell * edge;
    }
    this.fireBed = bed;
    this.fireRumble = rumble;
  }

  /** Two bounded SFX sources for the actual score-fire state, never a second context. */
  setScoreFire(intensity: 0 | 1 | 2): void {
    if (intensity === 0 || ![1, 2].includes(intensity) || !this.canPlay('sfx')) { this.stopScoreFire(); return; }
    if (this.fireIntensity === intensity && this.fireVoices.size === 2) return;
    try {
      const context = this.context!;
      if (this.fireVoices.size !== 2) {
        this.stopScoreFire();
        for (const [buffer, layer] of [[this.fireBed, 'bed'], [this.fireRumble, 'rumble']] as const) {
          if (!buffer) { this.stopScoreFire(); return; }
          const source = context.createBufferSource(), gain = context.createGain(), filter = context.createBiquadFilter();
          source.buffer = buffer; source.loop = true;
          filter.type = 'lowpass'; filter.Q.value = .35;
          gain.gain.setValueAtTime(0, context.currentTime);
          source.connect(filter); filter.connect(gain); gain.connect(this.gains!.sfx);
          const voice: Voice = {source, gain, filter, bus: 'sfx', fire: true, fireLayer: layer};
          this.fireVoices.add(voice); this.retain(voice); source.start();
        }
      }
      this.fireIntensity = intensity;
      for (const voice of this.fireVoices) {
        const bed = voice.fireLayer === 'bed';
        voice.gain.gain.setTargetAtTime((bed ? [.055, .16] : [.02, .065])[intensity - 1], context.currentTime, .07);
        voice.filter!.frequency.setTargetAtTime((bed ? [170, 210] : [290, 420])[intensity - 1], context.currentTime, .08);
        (voice.source as AudioBufferSourceNode).playbackRate.setTargetAtTime(intensity === 1 ? .8 : .92, context.currentTime, .1);
      }
    } catch { this.stopScoreFire(); }
  }

  /** Stop now on fast-forward, shutdown, new stage or background; no stale auto-resume. */
  stopScoreFire(): void {
    this.fireIntensity = 0;
    for (const voice of this.fireVoices) this.release(voice);
  }

  private startMusic(): void {
    if (!RECORDING_PATH || this.musicFailed || !this.canPlay('music') || this.context!.state !== 'running') return;
    try {
      if (!this.musicElement) {
        // Streaming avoids decoding a whole multi-minute stereo performance on phones.
        // Neither an element nor a request exists before a real gesture and an open bus.
        const element = new Audio();
        element.preload = 'none'; element.loop = true; element.volume = 1;
        element.playbackRate = 1; element.setAttribute('playsinline', '');
        const node = this.context!.createMediaElementSource(element);
        node.connect(this.gains!.music);
        element.onerror = () => { this.musicFailed = true; this.stopMusic(); };
        element.src = `${import.meta.env.BASE_URL}${RECORDING_PATH}`;
        this.musicElement = element; this.musicNode = node;
      }
      const element = this.musicElement;
      if (this.musicTask || !element.paused) return;
      const generation = this.musicGeneration;
      const pending = element.play();
      this.musicTask = pending;
      void pending.then(() => {
        // A mute/background transition can happen while browser playback is pending.
        if (!this.canPlay('music')) element.pause();
      }).catch(() => { /* A blocked/failed recording leaves the game silently usable. */ }).finally(() => {
        if (this.musicTask === pending) this.musicTask = undefined;
        // Recover a fast pause/resume race once; a plain playback denial is not retried.
        if (generation !== this.musicGeneration && this.canPlay('music')) this.startMusic();
      });
    } catch { /* No synthetic melody replaces an unavailable recording. */ }
  }
  private stopMusic(): void {
    this.musicGeneration++;
    try { this.musicElement?.pause(); } catch { /* Device teardown. */ }
  }

  private createRollBuffer(context: AudioContext): void {
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .24), context.sampleRate);
    const samples = buffer.getChannelData(0);
    let seed = 0x524f4c4c, low = 0;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const white = seed / 0xffffffff * 2 - 1;
      low = low * .94 + white * .12;
      // A tactile bead train over a warm continuous bed; no rule random source.
      const phase = i / context.sampleRate;
      const grain = (.5 + .5 * Math.sin(phase * Math.PI * 2 * 50)) ** 7;
      const edge = Math.min(1, i / (context.sampleRate * .004), (samples.length - i) / (context.sampleRate * .004));
      samples[i] = (low * .7 + white * (.10 + grain * .42)) * edge;
    }
    this.rollBuffer = buffer;
  }

  /** One call per committed number roll. Same-kind overlap replaces, never piles up. */
  scoreRoll(durationMs: number, kind: ScoreRollKind, strength = 1): void {
    if (!['heat', 'mult', 'total'].includes(kind)) return;
    for (const voice of this.voices) if (voice.roll === kind) this.release(voice);
    if (!Number.isFinite(durationMs) || durationMs <= 0 || !this.canPlay('sfx') || !this.rollBuffer) return;
    const level = bounded(strength, 3);
    if (level === 0) return;
    try {
      const context = this.context!, duration = Math.max(.04, Math.min(1.6, durationMs / 1000));
      const time = context.currentTime, source = context.createBufferSource(), gain = context.createGain(), filter = context.createBiquadFilter();
      const total = kind === 'total', mult = kind === 'mult';
      source.buffer = this.rollBuffer; source.loop = true;
      source.playbackRate.setValueAtTime(mult ? 1.4 : total ? .82 : 1, time);
      source.playbackRate.linearRampToValueAtTime(mult ? 2.1 : total ? 1.1 : 1.5, time + duration);
      filter.type = total ? 'lowpass' : 'bandpass'; filter.Q.value = .65;
      filter.frequency.setValueAtTime(mult ? 1050 : total ? 1050 : 500, time);
      filter.frequency.exponentialRampToValueAtTime(mult ? 2100 : total ? 1800 : 900, time + duration);
      const peak = Math.min(.36, (total ? .19 : mult ? .16 : .14) * (.7 + level * .3));
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(peak, time + Math.min(.015, duration * .2));
      gain.gain.setValueAtTime(peak, time + duration * .65);
      gain.gain.linearRampToValueAtTime(0, time + duration);
      source.connect(filter); filter.connect(gain); gain.connect(this.gains!.sfx);
      this.retain({source, gain, filter, bus: 'sfx', roll: kind});
      source.start(time); source.stop(time + duration);
      const body = context.createOscillator(), bodyGain = context.createGain();
      body.type = 'sine';
      body.frequency.setValueAtTime(mult ? 170 : total ? 70 : 105, time);
      body.frequency.exponentialRampToValueAtTime(mult ? 370 : total ? 125 : 175, time + duration);
      const bodyPeak = Math.min(.10, .045 + level * .014);
      bodyGain.gain.setValueAtTime(0, time);
      bodyGain.gain.linearRampToValueAtTime(bodyPeak, time + Math.min(.02, duration * .2));
      // Small gain beads give the low layer a rounded gurgle, not another melody.
      for (let i = 1; i < 17; i++) bodyGain.gain.linearRampToValueAtTime(bodyPeak * (i % 2 ? .42 : 1), time + duration * i / 18);
      bodyGain.gain.linearRampToValueAtTime(0, time + duration);
      body.connect(bodyGain); bodyGain.connect(this.gains!.sfx);
      this.retain({source: body, gain: bodyGain, bus: 'sfx', roll: kind});
      body.start(time); body.stop(time + duration);
      this.duckMusic(Math.min(.45, duration));
    } catch { /* Number animation and scoring never depend on sound. */ }
  }

  private whoosh(duration = .15, volume = .07, rising = false, bus: VoiceBus = 'sfx', offset = 0): void {
    if (!this.canPlay(bus) || !this.noise) return;
    try {
      const context = this.context!, source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
      const time = context.currentTime + offset, length = Math.max(.04, Math.min(.35, duration));
      source.buffer = this.noise; source.loop = true;
      filter.type = 'bandpass'; filter.Q.value = .45;
      filter.frequency.setValueAtTime(rising ? 650 : 2400, time);
      filter.frequency.exponentialRampToValueAtTime(rising ? 2000 : 450, time + length);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(bounded(volume, .18), time + length * .24);
      gain.gain.linearRampToValueAtTime(0, time + length);
      source.connect(filter); filter.connect(gain); gain.connect(this.gains![bus]);
      this.retain({source, gain, filter, bus}); source.start(time); source.stop(time + length);
    } catch { /* Card movement remains independent of audio. */ }
  }

  /** Short filtered swish for one dealt card; the caller passes the visual stagger index. */
  deal(index = 0): void {
    const i = Math.floor(bounded(index, 8));
    this.whoosh(.11, .065, true, 'sfx', i * .055);
    this.note(57 + Math.min(i, 6), .05, .011, 'sfx', i * .055, 'sine', undefined, undefined, 'warm');
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
  select(): void { this.whoosh(.085, .065, true, 'ui'); this.note(74, .07, .023, 'ui', 0, 'sine'); }
  cancel(): void { this.whoosh(.10, .060, false, 'ui'); this.note(71, .08, .023, 'ui', 0, 'sine', undefined, 67); }
  deselect(): void { this.cancel(); }
  invalid(): void { this.note(55, .11, .035, 'ui'); this.note(54, .08, .025, 'ui', .095); }
  playHand(): void { this.duckMusic(); this.whoosh(.21, .14, true); this.note(50, .13, .065, 'sfx', .02, 'sine', undefined, 43, 'warm'); }
  discard(): void { this.whoosh(.26, .16); this.paper(.09, .03, .055, 'sfx', undefined, 650); this.note(62, .095, .027, 'sfx', .015, 'sine', undefined, 55, 'warm'); }
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
  chanceRoll(kind:'lucky'|'glass'|'joker',hit:boolean):void {
    this.duckMusic(.22);
    this.whoosh(.12,.032,kind!=='glass');
    if(kind==='joker')this.paper(.08,.022,0,'sfx',undefined,1600);
    const pitches=kind==='glass'?[81,88]:kind==='joker'?(hit?[62,74,81]:[65,62]):hit?[69,76,81]:[64,62];
    pitches.forEach((pitch,i)=>this.note(pitch,.09,.032,'sfx',i*.035,kind==='glass'?'sine':'triangle',undefined,undefined,'pluck'));
  }
  glassBreak():void {
    this.duckMusic(.35);this.paper(.16,.07,0,'sfx',undefined,4200);
    [93,88,81,76].forEach((pitch,i)=>this.note(pitch,.12,.035,'sfx',i*.022,'sine'));
  }
  toolUse(family:'tarot'|'planet'|'spectral'|'utility'):void {
    this.duckMusic(.3);this.whoosh(.18,.09,true);
    const pitches=family==='planet'?[69,76,81]:family==='spectral'?[45,64,78]:family==='tarot'?[62,69,74]:[64,71];
    pitches.forEach((pitch,i)=>this.note(pitch,.17,.042,'sfx',i*.045,'triangle',undefined,undefined,'pluck'));
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
