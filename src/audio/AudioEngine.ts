export type AudioBus = 'master' | 'music' | 'sfx' | 'ui';
export type AudioScene = 'menu' | 'shop' | 'table' | 'success' | 'failure';
type VoiceBus = Exclude<AudioBus, 'master'>;
type Voice = { source: AudioScheduledSourceNode; gain: GainNode; filter?: BiquadFilterNode; bus: VoiceBus };

// Original P00 theme, "Paper Procession": three fixed eight-bar sections, swung eighths.
// 24 bars / 96 quarter notes: table 55.38s, shop 61.28s, menu 62.61s per full loop.
// Fixed notes and local synthesis consume no rule RNG, network or audio assets.
const MUSIC_SECTIONS = [
  {
    name: 'theme', level: .88,
    roots: [38, 35, 43, 45, 40, 45, 38, 45],
    chords: [[57, 62, 66, 69], [57, 59, 62, 66], [59, 62, 66, 67], [57, 61, 64, 69],
      [55, 59, 62, 64], [55, 61, 64, 69], [57, 62, 66, 71], [55, 61, 64, 69]],
    melody: [
      62, 0, 66, 64, 62, 0, 57, 0,
      59, 0, 62, 66, 64, 0, 62, 0,
      59, 0, 62, 67, 66, 0, 62, 59,
      61, 0, 64, 66, 64, 0, 61, 0,
      59, 0, 64, 62, 59, 0, 55, 0,
      57, 0, 61, 64, 67, 0, 64, 61,
      62, 0, 66, 64, 62, 0, 59, 57,
      61, 0, 59, 57, 55, 0, 57, 0,
    ],
  },
  {
    name: 'variation', level: 1,
    roots: [43, 42, 40, 45, 35, 43, 40, 45],
    chords: [[59, 62, 66, 67], [57, 62, 66, 69], [55, 59, 62, 64], [55, 61, 64, 69],
      [57, 59, 62, 66], [59, 62, 64, 67], [55, 59, 62, 64], [55, 61, 64, 69]],
    melody: [
      67, 0, 69, 71, 74, 0, 71, 69,
      66, 0, 69, 0, 74, 73, 69, 0,
      64, 0, 67, 69, 71, 0, 67, 64,
      61, 0, 64, 0, 69, 67, 64, 61,
      62, 0, 66, 69, 71, 0, 69, 66,
      67, 0, 71, 0, 69, 67, 64, 0,
      64, 0, 67, 0, 66, 64, 62, 0,
      61, 0, 64, 0, 67, 66, 64, 0,
    ],
  },
  {
    name: 'space', level: .57,
    roots: [38, 43, 35, 40, 43, 42, 40, 45],
    chords: [[57, 62, 66, 71], [59, 62, 66, 67], [57, 59, 62, 66], [55, 59, 62, 64],
      [59, 62, 64, 67], [57, 62, 66, 69], [55, 59, 62, 64], [55, 61, 64, 69]],
    melody: [
      62, 0, 0, 0, 66, 0, 0, 0,
      59, 0, 0, 0, 62, 0, 0, 0,
      59, 0, 0, 0, 0, 0, 0, 0,
      64, 0, 0, 0, 62, 0, 0, 0,
      59, 0, 0, 0, 64, 0, 0, 0,
      66, 0, 0, 0, 62, 0, 0, 0,
      64, 0, 0, 0, 59, 0, 0, 0,
      61, 0, 0, 0, 57, 0, 0, 0,
    ],
  },
] as const;
const SECTION_STEPS = 64;
const LOOP_STEPS = SECTION_STEPS * MUSIC_SECTIONS.length;
const PROFILES: Record<AudioScene, { bpm: number; level: number; melody: boolean }> = {
  menu: { bpm: 92, level: .66, melody: true },
  shop: { bpm: 94, level: .76, melody: true },
  table: { bpm: 104, level: 1, melody: true },
  success: { bpm: 94, level: .5, melody: false },
  failure: { bpm: 82, level: .32, melody: false },
};
const bounded = (value: number, max: number): number => Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
const midiHz = (note: number): number => 440 * 2 ** ((note - 69) / 12);

/** One application context. The app owns gesture/visibility listeners and persistence. */
export class AudioEngine {
  static readonly shared = new AudioEngine();
  private context?: AudioContext;
  private gains?: Record<AudioBus, GainNode>;
  private noise?: AudioBuffer;
  private pluckedWave?: PeriodicWave;
  private voices = new Set<Voice>();
  private volumes: Record<AudioBus, number> = { master: .75, music: .32, sfx: .58, ui: .48 };
  private masterMuted = false;
  private musicIsMuted = false;
  private suspended = false;
  private unlocked = false;
  private unlockTask?: Promise<void>;
  private scene: AudioScene = 'menu';
  private musicTimer?: ReturnType<typeof setInterval>;
  private musicStep = 0;
  private nextStepTime = 0;

  get muted(): boolean { return this.masterMuted; }
  set muted(value: boolean) {
    this.masterMuted = value;
    this.applyVolume('master');
    if (value) { this.stopMusic(); this.stopVoices(); }
    else if (this.unlocked) void this.unlock();
  }
  get musicMuted(): boolean { return this.musicIsMuted; }
  set musicMuted(value: boolean) {
    this.musicIsMuted = value;
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
    if (this.unlockTask) return this.unlockTask;
    const pending = this.enableAudio();
    this.unlockTask = pending;
    void pending.then(() => { if (this.unlockTask === pending) this.unlockTask = undefined; });
    return pending;
  }

  setScene(scene: AudioScene): void {
    if (scene === this.scene) return;
    this.scene = scene;
    this.stopMusic();
    // Keep the phrase position through shop/table transitions so short stages also
    // reach the variation and breathing section, rather than restarting the hook.
    this.startMusic();
  }

  /** Called by one app-level visibility listener, never by individual scene listeners. */
  setSuspended(value: boolean): void {
    this.suspended = value;
    if (!value) { if (this.unlocked) void this.unlock(); return; }
    this.stopMusic();
    this.stopVoices();
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
        compressor.threshold.value = -21;
        compressor.knee.value = 24;
        compressor.ratio.value = 3.5;
        compressor.attack.value = .005;
        compressor.release.value = .16;
        gains.music.connect(gains.master);
        gains.sfx.connect(gains.master);
        gains.ui.connect(gains.master);
        gains.master.connect(compressor);
        compressor.connect(context.destination);
        this.gains = gains;
        for (const bus of Object.keys(gains) as AudioBus[]) this.applyVolume(bus);
        try {
          this.pluckedWave = context.createPeriodicWave(
            new Float32Array(6), new Float32Array([0, 1, .32, .13, .045, .015]),
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
      }
      const context = this.context;
      if (!context) return;
      this.unlocked = true;
      // Resume even when running: it also follows a pending background suspend safely.
      if (context.state !== 'closed') await context.resume();
      if (!this.suspended && !this.hidden() && !this.masterMuted) this.startMusic();
    } catch {
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
      gain.gain.setTargetAtTime(value, context.currentTime, .015);
    } catch { /* Settings remain usable when an audio device is unavailable. */ }
  }

  private canPlay(bus: VoiceBus): boolean {
    return !!this.context && !!this.gains && this.unlocked && !this.masterMuted && !this.suspended
      && !this.hidden() && !(bus === 'music' && this.musicIsMuted) && this.context.state !== 'closed';
  }
  private retain(voice: Voice): void {
    // Fast-forwarded/long traces cannot create an unbounded wall of simultaneous sound.
    if (this.voices.size >= 32) {
      const oldest = this.voices.values().next().value as Voice | undefined;
      if (oldest) this.release(oldest);
    }
    this.voices.add(voice);
    voice.source.onended = () => this.release(voice);
  }
  private release(voice: Voice): void {
    this.voices.delete(voice);
    voice.source.onended = null;
    try { voice.source.stop(); } catch { /* The source may already have ended. */ }
    try { voice.source.disconnect(); voice.gain.disconnect(); voice.filter?.disconnect(); } catch { /* Device teardown. */ }
  }
  private stopVoices(bus?: VoiceBus): void {
    for (const voice of this.voices) if (!bus || voice.bus === bus) this.release(voice);
  }

  private note(note: number, duration: number, volume: number, bus: VoiceBus = 'sfx', offset = 0, wave: OscillatorType = 'triangle', absoluteTime?: number, endNote?: number, color: 'clean' | 'pluck' | 'warm' = 'clean'): void {
    if (!this.canPlay(bus)) return;
    try {
      const context = this.context!, oscillator = context.createOscillator(), gain = context.createGain();
      const time = Math.max(context.currentTime, absoluteTime ?? context.currentTime + offset);
      oscillator.type = wave;
      if (color === 'pluck' && this.pluckedWave) oscillator.setPeriodicWave(this.pluckedWave);
      oscillator.frequency.setValueAtTime(midiHz(Math.max(30, Math.min(81, note))), time);
      if (endNote !== undefined) oscillator.frequency.exponentialRampToValueAtTime(midiHz(endNote), time + duration);
      gain.gain.setValueAtTime(.0001, time);
      gain.gain.linearRampToValueAtTime(volume, time + (color === 'warm' ? .014 : .006));
      gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
      let filter: BiquadFilterNode | undefined;
      if (color !== 'clean') {
        filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = .35;
        filter.frequency.setValueAtTime(color === 'warm' ? 900 : 2200, time);
        filter.frequency.exponentialRampToValueAtTime(color === 'warm' ? 500 : 950, time + duration);
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
      gain.gain.linearRampToValueAtTime(volume, time + .006);
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
      const context = this.context!, gain = this.gains!.music.gain, value = this.volumes.music;
      gain.cancelScheduledValues(context.currentTime);
      gain.setValueAtTime(gain.value, context.currentTime);
      gain.linearRampToValueAtTime(value * .52, context.currentTime + .015);
      gain.linearRampToValueAtTime(value, context.currentTime + duration);
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
    // A throttled tab never tries to catch up and burst through minutes of old notes.
    if (this.nextStepTime < context.currentTime - .15) this.nextStepTime = context.currentTime + .025;
    while (this.nextStepTime < context.currentTime + .14) {
      const step = this.musicStep % LOOP_STEPS, sectionIndex = Math.floor(step / SECTION_STEPS);
      const localStep = step % SECTION_STEPS, bar = Math.floor(localStep / 8), beat = localStep % 8, time = this.nextStepTime;
      const section = MUSIC_SECTIONS[sectionIndex], previous = MUSIC_SECTIONS[(sectionIndex + MUSIC_SECTIONS.length - 1) % MUSIC_SECTIONS.length];
      const sectionLevel = previous.level + (section.level - previous.level) * Math.min(1, localStep / 8);
      const level = sectionLevel * profile.level, spacious = section.name === 'space';
      if (beat === 0 || beat === 4 || (!spacious && this.scene === 'table' && beat === 6)) {
        const bass = section.roots[bar] + (beat === 6 ? 7 : 0);
        this.note(bass, quarter * .85, .035 * level, 'music', 0, 'sine', time, undefined, 'warm');
        this.note(bass + 12, quarter * .62, .014 * level, 'music', 0, 'triangle', time, undefined, 'warm');
      }
      if (beat === 1 || (!spacious && beat === 5)) section.chords[bar].forEach((n, i, chord) => {
        const string = beat === 5 ? chord.length - 1 - i : i;
        this.note(chord[string], quarter * (spacious ? 1.25 : .72), .009 * level, 'music', 0, 'triangle', time + i * .018, undefined, 'pluck');
      });
      if (section.melody[localStep] && profile.melody) {
        this.note(section.melody[localStep], quarter * (spacious ? 1.5 : .8), .024 * level, 'music', 0, 'triangle', time, undefined, 'pluck');
      }
      if (this.scene === 'shop' && beat === 4 && !spacious) this.woodTap(time, .017 * level);
      if (this.scene === 'table' && (beat === 2 || beat === 6) && !spacious) this.softClap(time, .012 * level);
      if (this.scene === 'table' && beat === 0 && bar % 2 === 0) this.woodTap(time, .012 * level);
      this.nextStepTime += quarter * (beat % 2 === 0 ? .56 : .44);
      this.musicStep = (this.musicStep + 1) % LOOP_STEPS;
    }
  }

  select(): void { this.note(74, .07, .045, 'ui'); this.note(78, .055, .017, 'ui', .024, 'sine'); }
  cancel(): void { this.note(71, .08, .035, 'ui', 0, 'triangle', undefined, 67); }
  deselect(): void { this.cancel(); }
  invalid(): void { this.note(55, .11, .035, 'ui'); this.note(54, .08, .025, 'ui', .095); }
  playHand(): void { this.duckMusic(); this.paper(.12, .052); this.note(50, .13, .065, 'sfx', .02, 'sine', undefined, 43); }
  discard(): void { this.paper(.08, .046); this.paper(.09, .03, .055); this.note(62, .095, .027, 'sfx', .015, 'triangle', undefined, 55); }
  cardScore(index = 0): void { this.note([67, 69, 71, 74, 76][Math.floor(bounded(index, 4))], .095, .044); }
  role(): void { this.duckMusic(.4); [69, 74, 78].forEach((n, i) => this.note(n, .18, .04, 'sfx', i * .055)); }
  joker(chainIndex: number): void {
    const index = Math.floor(bounded(chainIndex, 6));
    this.duckMusic(.32);
    this.note([67, 69, 71, 74, 76, 78, 79][index], .16, .048 - index * .002);
    if (index >= 3) this.note(62 + index, .15, .02, 'sfx', .035, 'sine');
  }
  multiplier(kind: 'add' | 'multiply', chainIndex = 0): void {
    const step = Math.floor(bounded(chainIndex, 4));
    this.duckMusic(kind === 'multiply' ? .4 : .2);
    if (kind === 'add') { this.note(69 + step, .12, .04); this.note(74 + step, .14, .035, 'sfx', .055); }
    else {
      this.note(45, .23, .065, 'sfx', 0, 'sine', undefined, 33, 'warm');
      this.paper(.055, .018, 0, 'sfx', undefined, 700);
      this.note(74 + Math.min(step, 3), .13, .03, 'sfx', .05, 'triangle', undefined, undefined, 'pluck');
      this.note(81, .17, .017, 'sfx', .105, 'sine');
    }
  }
  retrigger(chainIndex = 0): void { const n = 72 + Math.floor(bounded(chainIndex, 5)); this.note(n, .06, .034); this.note(n, .09, .042, 'sfx', .075); }
  score(intensity = 0): void {
    const tier = Math.floor(bounded(intensity, 2));
    this.duckMusic(.5);
    [62, 69, 74].forEach((n, i) => this.note(n, .23 + tier * .06, .04, 'sfx', i * .035, 'sine'));
    if (tier > 0) this.note(78, .23, .038, 'sfx', .12);
    if (tier > 1) {
      this.note(43, .25, .068, 'sfx', 0, 'sine', undefined, 31, 'warm');
      this.paper(.06, .016, 0, 'sfx', undefined, 1000);
      this.note(81, .16, .028, 'sfx', .20, 'sine');
    }
  }
  purchase(): void { [78, 81, 74].forEach((n, i) => this.note(n, .13, .038, 'ui', i * .05, 'sine')); }
  sale(): void { [76, 71, 67].forEach((n, i) => this.note(n, .12, .037, 'ui', i * .05)); }
  reroll(): void { this.paper(.08, .036); this.paper(.08, .03, .075); [67, 74].forEach((n, i) => this.note(n, .11, .027, 'ui', .05 + i * .075)); }
  rareReveal(): void { this.duckMusic(.65); [62, 69, 78, 81].forEach((n, i) => this.note(n, .36, .038, 'sfx', i * .075, 'sine')); }
  success(): void { this.duckMusic(.9); [62, 66, 69, 74, 78, 81].forEach((n, i) => this.note(n, .38, .045, 'sfx', i * .07)); }
  failure(): void { this.duckMusic(1); [69, 65, 62].forEach((n, i) => this.note(n, .4, .033, 'sfx', i * .16, 'sine')); }
}
