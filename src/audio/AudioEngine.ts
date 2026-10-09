import {DEFAULT_AUDIO} from './preferences';

export type AudioBus = 'master' | 'music' | 'sfx' | 'ui';
export type AudioScene = 'menu' | 'shop' | 'table' | 'boss' | 'success' | 'failure';
export type FailureCue = { runId: string; commandSeq: number };
type VoiceBus = Exclude<AudioBus, 'master'>;
type Voice = { source: AudioScheduledSourceNode; gain: GainNode; filter?: BiquadFilterNode; bus: VoiceBus; scoreAccent?: boolean; roll?: ScoreRollKind };
export type ScoreSourceCue = 'card' | 'held' | 'character' | 'joker' | 'boss' | 'retrigger';
export type ScoreRollKind = 'heat' | 'mult' | 'total';

// Only a verified recording may populate this manifest. No synthesized BGM fallback.
const RECORDING_PATH = 'assets/audio/transition-bgm/dark-things-loop.mp3';
export const TRANSITION_MUSIC = 'Dark Things Loop · iamoneabe · CC0（过渡曲）';
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
  private rollBuffer?: AudioBuffer;
  private scoreSamples=new Map<string,AudioBuffer>();
  private scoreSampleTask?:Promise<void>;
  private readonly scoreCues=new WeakMap<object,Set<string>>();
  private voices = new Set<Voice>();
  private volumes: Record<AudioBus, number> = { master: 1, music: DEFAULT_AUDIO.music, sfx: DEFAULT_AUDIO.sfx, ui: DEFAULT_AUDIO.sfx };
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
  private readonly failureCues = new WeakSet<FailureCue>();

  get muted(): boolean { return this.masterMuted; }
  set muted(value: boolean) {
    this.masterMuted = value;
    this.applyVolume('master');
    if (value) { this.stopScoreFire(); this.stopMusic(); this.stopVoices(); this.duckUntil = 0; this.applyVolume('music'); }
    else if (this.unlocked) void this.unlock();
  }
  get musicAvailable(): boolean { return true; }
  get musicTitle(): string { return TRANSITION_MUSIC; }
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
        void this.loadScoreSamples();
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
    try { voice.source.disconnect(); voice.gain.disconnect(); voice.filter?.disconnect(); } catch { /* Device teardown. */ }
  }
  private stopVoices(bus?: VoiceBus): void {
    for (const voice of this.voices) if (!bus || voice.bus === bus) this.release(voice);
  }
  /** Cancel a skipped scene's score tails while its table music keeps playing. */
  cancelPresentation(): void { this.stopScoreFire(); this.stopVoices('sfx'); this.duckUntil = 0; this.applyVolume('music'); }

  private note(note: number, duration: number, volume: number, bus: VoiceBus = 'sfx', offset = 0, wave: OscillatorType = 'triangle', absoluteTime?: number, endNote?: number, color: 'clean' | 'pluck' | 'warm' | 'lead' | 'piano' | 'string' = 'clean'): Voice | undefined {
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
      const voice={source:oscillator,gain,filter,bus};this.retain(voice);
      oscillator.start(time);
      oscillator.stop(time + duration + .015);return voice;
    } catch { /* Every individual sound is optional; no command awaits audio. */ }
  }
  private paper(duration = .09, volume = .025, offset = 0, bus: VoiceBus = 'sfx', absoluteTime?: number, frequency = 1400): Voice | undefined {
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
      const voice={source,gain,filter,bus};this.retain(voice);
      source.start(time);
      source.stop(time + duration);return voice;
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

  /** Owned landing accent for positive score items and the final award; never replayed. */
  scoreBrush(presentation:object,eventId:string,intensity:0|1|2|3=1):void {
    let seen=this.scoreCues.get(presentation);
    if(!seen){seen=new Set();this.scoreCues.set(presentation,seen);}
    if(seen.has(eventId)||seen.size>=512)return;
    // Silent/background events are consumed too, and never queued for a later foreground.
    seen.add(eventId);if(!this.canPlay('sfx'))return;
    const level=bounded(intensity,3),duration=.10+level*.02;
    for(const voice of [this.note(45,duration,.055+level*.009,'sfx',0,'sine',undefined,33,'warm'),
      this.paper(.03+level/150,.020+level*.003,0,'sfx',undefined,900)])if(voice)voice.scoreAccent=true;
    this.duckMusic(.18);
  }

  private loadScoreSamples():Promise<void> {
    if(this.scoreSampleTask)return this.scoreSampleTask;
    const context=this.context;if(!context)return Promise.resolve();
    return this.scoreSampleTask=Promise.all(['impactMetal_light_002','impactMetal_medium_002','impactMetal_heavy_000','cloth2','chop'].map(async name=>{
      try{const response=await fetch(new URL(`assets/audio/score-impact/${name}.ogg`,document.baseURI));if(!response.ok)return;const buffer=await context.decodeAudioData(await response.arrayBuffer());this.scoreSamples.set(name,buffer);}catch{/* A missing clip is silent; saved source information remains. */}
    })).then(()=>undefined);
  }
  /** Recorded foley, one bounded hit per number arrival; no retroactive playback or synth fallback. */
  scoreImpact(presentation:object,eventId:string,kind:'add'|'key'|'multiply'|'award'|'flight',tier=0,chain=0):void {
    let seen=this.scoreCues.get(presentation);if(!seen){seen=new Set();this.scoreCues.set(presentation,seen);}const id='recorded/'+eventId+'/'+kind;
    if(seen.has(id)||seen.size>=1024)return;seen.add(id);if(!this.canPlay('sfx'))return;
    for(const voice of this.voices)if(voice.scoreAccent)this.release(voice);
    const name=kind==='flight'?'cloth2':kind==='add'?'chop':tier>=2?'impactMetal_heavy_000':tier>=1?'impactMetal_medium_002':'impactMetal_light_002',buffer=this.scoreSamples.get(name);if(!buffer)return;
    try{const context=this.context!,source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.playbackRate.value=kind==='multiply'?1+Math.min(4,Math.max(0,chain))*.035:1;
      const sampleOffset=name==='cloth2'?.08:0;
      const length=Math.min(kind==='flight'?.12:kind==='award'?.34:.23,(buffer.duration-sampleOffset)/source.playbackRate.value),time=context.currentTime;
      gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime((kind==='flight'?.025:kind==='add'?.055:.085+Math.min(3,tier)*.018)*SOURCE_GAIN.sfx,time+.005);gain.gain.setValueAtTime((kind==='flight'?.025:kind==='add'?.055:.085+Math.min(3,tier)*.018)*SOURCE_GAIN.sfx,time+length*.55);gain.gain.linearRampToValueAtTime(0,time+length);
      source.connect(gain);gain.connect(this.gains!.sfx);this.retain({source,gain,bus:'sfx',scoreAccent:true});source.start(time,sampleOffset);source.stop(time+length);this.duckMusic(length+.05);
    }catch{/* Device teardown never changes the committed hand. */}
  }

  /** Compatibility cleanup name; no continuous burning sources remain. */
  stopScoreFire(): void {
    for(const voice of this.voices)if(voice.scoreAccent)this.release(voice);
  }

  private startMusic(): void {
    if (!RECORDING_PATH || this.musicFailed || !this.canPlay('music') || this.context!.state !== 'running') return;
    try {
      if (!this.musicElement) {
        // Streaming keeps the music decode buffer out of application memory on phones.
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

  /** One short recorded texture per committed roll; no synthetic bed or tone. */
  scoreRoll(durationMs:number,kind:ScoreRollKind,strength=1):void {
    if(!['heat','mult','total'].includes(kind))return;
    for(const voice of this.voices)if(voice.roll===kind)this.release(voice);
    if(!Number.isFinite(durationMs)||durationMs<=0||bounded(strength,3)===0)return;
    const voice=this.recordedCue(kind==='heat'?'chop':kind==='mult'?'impactMetal_light_002':'impactMetal_medium_002',Math.min(durationMs/1000,.18),.035,'sfx',kind==='mult'?1.08:1);
    if(voice){voice.roll=kind;this.duckMusic(.2);}
  }
  /** A missing sample is silent; callbacks never schedule it retroactively. */
  private recordedCue(name:string,duration:number,volume:number,bus:VoiceBus='sfx',rate=1,offset=0):Voice|undefined {
    if(!this.canPlay(bus))return;
    const buffer=this.scoreSamples.get(name);if(!buffer)return;
    try {
      const context=this.context!,source=context.createBufferSource(),gain=context.createGain(),time=context.currentTime+offset;
      // cloth2 has an 80ms quiet lead; start at its recorded cloth body, not silence.
      const sampleOffset=name==='cloth2'?.08:0;
      const speed=Math.max(.65,Math.min(1.4,rate)),length=Math.min(Math.max(.035,duration),(buffer.duration-sampleOffset)/speed);
      source.buffer=buffer;source.playbackRate.value=speed;
      const peak=bounded(volume,.14)*SOURCE_GAIN[bus];
      gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(peak,time+.005);gain.gain.setValueAtTime(peak,time+length*.55);gain.gain.linearRampToValueAtTime(0,time+length);
      source.connect(gain);gain.connect(this.gains![bus]);const voice={source,gain,bus};this.retain(voice);source.start(time,sampleOffset);source.stop(time+length);return voice;
    }catch{return;}
  }
  deal(index=0):void {this.recordedCue('cloth2',.11,.025,'sfx',1,Math.floor(bounded(index,8))*.055);}
  cardLand():void {this.recordedCue('chop',.1,.035);}
  private lastHoverTick=0;
  hoverTick():void {const now=typeof performance==='undefined'?0:performance.now();if(now-this.lastHoverTick<55)return;this.lastHoverTick=now;this.recordedCue('cloth2',.045,.008,'ui',1.15);}
  coin():void {this.recordedCue('impactMetal_light_002',.12,.03,'ui',1.2);}
  titleBell():void {this.recordedCue('impactMetal_light_002',.23,.035,'sfx',.9);}
  curtainOpen():void {this.duckMusic(.4);this.recordedCue('cloth2',.28,.045,'sfx',.85);}
  select():void {this.recordedCue('cloth2',.09,.04,'ui',1.08);}
  cancel():void {this.recordedCue('cloth2',.11,.035,'ui',.82);}
  deselect():void {this.cancel();}
  invalid():void {this.recordedCue('chop',.1,.04,'ui',.72);}
  playHand():void {this.duckMusic(.3);this.recordedCue('cloth2',.18,.05);this.recordedCue('chop',.1,.055,'sfx',.9,.07);}
  discard():void {this.recordedCue('cloth2',.24,.05,'sfx',.85);}
  resourceSpend(kind:'play'|'discard',remaining:number,amount=1,cost=amount):void {
    if(!['play','discard'].includes(kind)||!Number.isSafeInteger(remaining)||remaining<0||!Number.isSafeInteger(amount)||amount<1||!Number.isSafeInteger(cost)||cost<1)return;
    const last=remaining<cost*2;this.duckMusic(last?.3:.16);
    for(let i=0;i<Math.min(amount,3);i++)this.recordedCue(last?'impactMetal_medium_002':'chop',last?.16:.08,last?.045:.03,'ui',kind==='play'?1:.85,i*.045);
  }
  sourceCue(kind:ScoreSourceCue,index=0):void {
    if(kind==='card')this.cardScore(index);else if(kind==='character')this.role();else if(kind==='joker')this.joker(index);else if(kind==='retrigger')this.retrigger(index);
    else{this.duckMusic(.2);this.recordedCue(kind==='boss'?'impactMetal_medium_002':'chop',.17,.04,'sfx',kind==='boss'?.78:1);}
  }
  cardScore(index=0):void {this.duckMusic(.14);this.recordedCue('chop',.12,.04,'sfx',1+bounded(index,4)*.025);}
  role():void {this.duckMusic(.4);this.recordedCue('impactMetal_heavy_000',.24,.08);}
  joker(chainIndex:number):void {this.duckMusic(.28);this.recordedCue('impactMetal_medium_002',.2,.065,'sfx',1+bounded(chainIndex,6)*.025);}
  multiplier(kind:'add'|'multiply',chainIndex=0):void {this.duckMusic(kind==='multiply'?.4:.2);this.recordedCue(kind==='multiply'?'impactMetal_heavy_000':'impactMetal_light_002',kind==='multiply'?.26:.16,kind==='multiply'?.085:.05,'sfx',1+bounded(chainIndex,4)*.035);}
  retrigger(chainIndex=0):void {this.duckMusic(.2);this.recordedCue('chop',.09,.04,'sfx',1+bounded(chainIndex,5)*.025);this.recordedCue('chop',.09,.04,'sfx',1.08,.09);}
  chanceRoll(kind:'lucky'|'glass'|'joker',hit:boolean):void {this.duckMusic(.2);this.recordedCue(hit?'impactMetal_light_002':'cloth2',.15,.035,'sfx',kind==='glass'?1.3:hit?1.08:.8);}
  glassBreak():void {this.duckMusic(.3);this.recordedCue('impactMetal_heavy_000',.26,.075,'sfx',1.25);}
  toolUse(family:'tarot'|'planet'|'spectral'|'utility'):void {this.duckMusic(.3);this.recordedCue(family==='spectral'?'impactMetal_heavy_000':'impactMetal_medium_002',.22,.06,'sfx',family==='planet'?1.12:family==='spectral'?.85:1);}
  score(intensity=0):void {this.duckMusic(.4);this.recordedCue(bounded(intensity,2)>0?'impactMetal_heavy_000':'impactMetal_medium_002',.28,.08);}
  overkill(tier:1|2|3):void {if(![1,2,3].includes(tier))return;this.duckMusic(.5);this.recordedCue('impactMetal_heavy_000',.32,.085,'sfx',1+(tier-1)*.04);if(tier>1)this.recordedCue('impactMetal_light_002',.18,.035,'sfx',1.12,.18);}
  purchase():void {this.recordedCue('impactMetal_light_002',.2,.045,'ui',1.12);}
  sale():void {this.recordedCue('cloth2',.18,.04,'ui',.85);}
  reroll():void {this.recordedCue('cloth2',.16,.04,'ui');this.recordedCue('cloth2',.12,.03,'ui',1.1,.09);}
  rareReveal():void {this.duckMusic(.4);this.recordedCue('impactMetal_medium_002',.25,.06,'sfx',1.15);}
  success():void {this.duckMusic(.6);this.recordedCue('impactMetal_heavy_000',.28,.08);this.recordedCue('impactMetal_light_002',.2,.04,'sfx',1.15,.16);}
  /** A transient committed ending, never a saved result being reopened. */
  failure(cue:FailureCue):void {
    if(!cue||this.failureCues.has(cue))return;this.failureCues.add(cue);if(!this.canPlay('sfx'))return;
    this.duckMusic(.6);this.recordedCue('impactMetal_medium_002',.28,.07,'sfx',.72);this.recordedCue('cloth2',.22,.035,'sfx',.75,.14);
  }
}
