import recording from '../../public/assets/audio/p06/recording.json';
import {DEFAULT_AUDIO} from './preferences';
import {FOLEY,FOLEY_SAMPLES,type FoleyKind} from './foley';

export type AudioBus = 'master' | 'music' | 'sfx' | 'ui';
export type AudioScene = 'menu' | 'shop' | 'table' | 'boss' | 'success' | 'failure';
export type FailureCue = { runId: string; commandSeq: number };
type VoiceBus = Exclude<AudioBus, 'master'>;
type Voice = { source: AudioScheduledSourceNode; gain: GainNode; filter?: BiquadFilterNode; bus: VoiceBus; scoreAccent?: boolean; roll?: ScoreRollKind; semantic?: FoleyKind };
export type ScoreSourceCue = 'card' | 'held' | 'character' | 'joker' | 'boss' | 'retrigger';
export type ScoreRollKind = 'heat' | 'mult' | 'total';

// Only a verified recording may populate this manifest. No synthesized BGM fallback.
const RECORDING_PATH = recording.runtimePath;
export const TRANSITION_MUSIC = 'Serenade - Schubert · Jérôme Chauvel / Abydos Music（临时恢复）';
const bounded = (value: number, max: number): number => Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
const SOURCE_GAIN: Record<VoiceBus, number> = { music: 1, sfx: 5.7, ui: 4.5 };

/** One application context. The app owns gesture/visibility listeners and persistence. */
export class AudioEngine {
  static readonly shared = new AudioEngine();
  private context?: AudioContext;
  private gains?: Record<AudioBus, GainNode>;
  private scoreSamples=new Map<string,AudioBuffer>();
  private scoreSampleTask?:Promise<void>;
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
    this.scoreImpact(presentation,eventId,'key',intensity);
  }

  private loadScoreSamples():Promise<void> {
    if(this.scoreSampleTask)return this.scoreSampleTask;
    const context=this.context;if(!context)return Promise.resolve();
    return this.scoreSampleTask=Promise.all([...FOLEY_SAMPLES,{name:'cloth2',runtimePath:'assets/audio/score-impact/cloth2.ogg'}].map(async ({name,runtimePath})=>{
      try{const response=await fetch(new URL(runtimePath,document.baseURI));if(!response.ok)return;const buffer=await context.decodeAudioData(await response.arrayBuffer());this.scoreSamples.set(name,buffer);}catch{/* A missing clip is silent; saved source information remains. */}
    })).then(()=>undefined);
  }
  /** Recorded foley, one bounded hit per number arrival; no retroactive playback or synth fallback. */
  scoreImpact(presentation:object,eventId:string,kind:'add'|'key'|'multiply'|'award'|'flight',tier=0,chain=0):void {
    let seen=this.scoreCues.get(presentation);if(!seen){seen=new Set();this.scoreCues.set(presentation,seen);}const id='recorded/'+eventId+'/'+kind;
    if(seen.has(id)||seen.size>=1024)return;seen.add(id);if(!this.canPlay('sfx'))return;
    const rate=kind==='multiply'?1+bounded(chain,4)*.035:1;
    const voices=this.cue(kind,'sfx',rate,0,kind==='add'||kind==='flight'?1:1+bounded(tier,3)*.06);
    for(const voice of voices)voice.scoreAccent=true;
    if(voices.length)this.duckMusic(kind==='add'?.14:.4);
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
  /** minGap/per-semantic oldest-voice cap adapted from Inkwave audio.js 258–280 (MIT).
   * Gate complete recipes, so delayed layers survive without setTimeout callbacks.
   * Variants rotate locally; never read the domain RNG or queue a missing recording. */
  private cue(kind:FoleyKind,bus:VoiceBus='sfx',rate=1,offset=0,strength=1,duration?:number):Voice[] {
    if(!this.canPlay(bus))return [];
    const recipe=FOLEY[kind],time=this.context!.currentTime+offset,last=this.cueTimes.get(kind);
    if(last!==undefined&&time>=last&&time-last<recipe.gap)return [];
    this.cueTimes.set(kind,time);
    const active=[...this.voices].filter(v=>v.semantic===kind);
    while(active.length+recipe.layers.length>recipe.cap&&active.length)this.release(active.shift()!);
    const variant=this.variants.get(kind)??0;this.variants.set(kind,variant+1);
    return recipe.layers.flatMap(layer=>{
      const voice=this.recordedCue(layer.samples[variant%layer.samples.length],duration===undefined?layer.duration:Math.min(duration,layer.duration),layer.gain*strength,bus,rate*(layer.rate??1),offset+(layer.delay??0));
      if(!voice)return [];voice.semantic=kind;return [voice];
    });
  }
  deal(index=0):void {this.cue('deal','sfx',1,Math.floor(bounded(index,14))*.055);}
  cardLand():void {this.cue('land');}
  hoverTick():void {this.cue('hover','ui');}
  coin():void {this.cue('coin','ui');}
  titleBell():void {this.cue('title');}
  curtainOpen():void {this.duckMusic(.4);this.cue('curtain');}
  select():void {this.cue('select','ui');}
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
  cardScore(index=0):void {this.duckMusic(.14);this.cue('add','sfx',1+bounded(index,4)*.025);}
  role():void {this.duckMusic(.4);this.cue('role');}
  joker(chainIndex:number):void {this.duckMusic(.28);this.cue('joker','sfx',1+bounded(chainIndex,6)*.025);}
  multiplier(kind:'add'|'multiply',chainIndex=0):void {this.duckMusic(kind==='multiply'?.4:.2);this.cue(kind==='multiply'?'multiply':'coin','sfx',1+bounded(chainIndex,4)*.035);}
  retrigger(chainIndex=0):void {this.duckMusic(.2);this.cue('retrigger','sfx',1+bounded(chainIndex,5)*.025);}
  chanceRoll(kind:'lucky'|'glass'|'joker',hit:boolean):void {this.duckMusic(.2);this.cue(hit?'chanceHit':'chanceMiss','sfx',kind==='glass'?1.15:1);}
  glassBreak():void {this.duckMusic(.3);this.cue('glass');}
  toolUse(family:'tarot'|'planet'|'spectral'|'utility'):void {this.duckMusic(.3);this.cue(family);}
  score(intensity=0):void {this.duckMusic(.4);this.cue(bounded(intensity,2)>0?'key':'award');}
  overkill(tier:1|2|3):void {if(![1,2,3].includes(tier))return;this.duckMusic(.5);this.cue('award','sfx',1+(tier-1)*.04);}
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
}
