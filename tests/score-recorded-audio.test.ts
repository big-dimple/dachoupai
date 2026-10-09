import {it,expect,vi,afterEach} from 'vitest';
import {AudioEngine} from '../src/audio/AudioEngine';
import {FOLEY_SAMPLES} from '../src/audio/foley';
const fixture=()=>{vi.stubGlobal('document',{hidden:false});const sources:any[]=[];const param=()=>({value:1,cancelScheduledValues:vi.fn(),setValueAtTime:vi.fn(),setTargetAtTime:vi.fn(),linearRampToValueAtTime:vi.fn()});const gain=()=>({gain:param(),connect:vi.fn(),disconnect:vi.fn()});const engine=new AudioEngine(),inside=engine as any;inside.context={currentTime:1,state:'running',createGain:gain,createBufferSource:()=>{const node={buffer:null,playbackRate:param(),start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn(),onended:null};sources.push(node);return node;}};inside.gains={master:gain(),sfx:gain(),ui:gain(),music:gain()};inside.unlocked=true;for(const name of [...FOLEY_SAMPLES.map(a=>a.name),'cloth2'])inside.scoreSamples.set(name,{name,duration:.3});return {engine,inside,sources};};
afterEach(()=>vi.unstubAllGlobals());
it('ordinary hits stay light and key multiplication has bounded three-layer timbre, all cancellable',()=>{const {engine,inside,sources}=fixture(),show={};engine.scoreImpact(show,'one','add',0,0);expect(sources[0].buffer.name).toBe('impactWood_light_000');engine.scoreImpact(show,'two','multiply',3,3);expect(sources.slice(1).map(s=>s.buffer.name)).toEqual(['impactSoft_heavy_000','impactBell_heavy_000','card-fan-1']);expect(sources[1].playbackRate.value).toBeCloseTo(1.105);expect(inside.voices.size).toBe(4);engine.cancelPresentation();expect(inside.voices.size).toBe(0);expect(sources.every(s=>s.disconnect.mock.calls.length===1)).toBe(true);});
it('mute and missing clip consume cue without late playback; duplicate saved event cannot sound again',()=>{const {engine,inside,sources}=fixture(),show={};engine.muted=true;engine.scoreImpact(show,'one','multiply',3,2);engine.muted=false;engine.scoreImpact(show,'one','multiply',3,2);expect(sources).toHaveLength(0);inside.scoreSamples.delete('impactWood_light_000');inside.scoreSamples.delete('impactWood_light_001');engine.scoreImpact(show,'two','add');inside.scoreSamples.set('impactWood_light_000',{name:'impactWood_light_000',duration:.3});inside.scoreSamples.set('impactWood_light_001',{name:'impactWood_light_001',duration:.3});inside.context.currentTime+=.1;engine.scoreImpact(show,'two','add');expect(sources).toHaveLength(0);engine.scoreImpact(show,'three','add');engine.scoreImpact(show,'three','add');expect(sources).toHaveLength(1);});
it('hidden/scene exit cancel all recorded tails without rewards or replay',()=>{const {engine,inside,sources}=fixture();engine.scoreImpact({},'award','award',3);engine.setScene('shop');expect(inside.voices.size).toBe(0);expect(sources[0].disconnect).toHaveBeenCalledOnce();vi.stubGlobal('document',{hidden:true});engine.scoreImpact({},'hidden','award',3);expect(sources).toHaveLength(3);});

it('selection, confirmation, source multiplication and endings use actual samples without oscillator layers',()=>{
 const {engine,inside,sources}=fixture();inside.context.createOscillator=vi.fn(()=>{throw Error('synthetic tone');});
 engine.select();engine.cancel();engine.purchase();engine.multiplier('multiply',2);engine.success();const failed={runId:'same',commandSeq:3};engine.failure(failed);engine.failure(failed);
 expect(sources.map(s=>s.buffer.name)).toEqual(['card-slide-1','card-shove-1','chips-collide-1','chip-lay-2','impactSoft_heavy_000','impactBell_heavy_000','card-fan-1','impactWood_heavy_000','impactBell_heavy_000','chips-collide-1','impactSoft_heavy_000','card-shove-1']);
 expect(sources[0].start.mock.calls[0][1]).toBe(0);expect(sources[2].start.mock.calls[0][1]).toBe(0);expect(inside.context.createOscillator).not.toHaveBeenCalled();expect(engine.getVolume('music')).toBe(.3);expect(engine.getVolume('sfx')).toBe(.8);
 engine.cancelPresentation();expect([...inside.voices].every((v:any)=>v.bus==='ui')).toBe(true);
});
it('number rolls replace their recorded texture, remain finite and cannot restart after mute',()=>{
 const {engine,inside,sources}=fixture();engine.scoreRoll(600,'mult',2);engine.scoreRoll(900,'mult',2);
 expect(sources.map(s=>s.buffer.name)).toEqual(['chips-stack-1','chips-stack-1']);expect(sources[0].disconnect).toHaveBeenCalledOnce();expect(sources.every(s=>!s.loop)).toBe(true);expect(sources[1].stop.mock.calls[0][0]).toBeCloseTo(1.18);
 engine.setVolume('sfx',0);expect(inside.voices.size).toBe(0);engine.scoreRoll(900,'total',1);expect(sources).toHaveLength(2);
});

it('rapid ordinary input is throttled and longer sequences rotate variants under a per-semantic cap',()=>{
 const {engine,inside,sources}=fixture();engine.select();for(let i=0;i<100;i++)engine.select();expect(sources).toHaveLength(1);
 for(let i=0;i<7;i++){inside.context.currentTime+=.04;engine.select();}
 expect(new Set(sources.map(s=>s.buffer.name)).size).toBe(3);expect(inside.voices.size).toBe(2);
 engine.purchase();const confirmed=sources.slice(-2);expect(confirmed[1].start.mock.calls[0][0]-confirmed[0].start.mock.calls[0][0]).toBeCloseTo(.075);
 engine.setSuspended(true);expect(inside.voices.size).toBe(0);expect(sources.every(s=>s.disconnect.mock.calls.length===1)).toBe(true);
});
it('every public semantic feedback uses available distinct recorded families without synthesis',()=>{
 const {engine,inside,sources}=fixture();inside.context.createOscillator=vi.fn(()=>{throw Error('synth');});
 for(const action of [()=>engine.deal(0),()=>engine.cardLand(),()=>engine.hoverTick(),()=>engine.coin(),()=>engine.titleBell(),()=>engine.curtainOpen(),()=>engine.select(),()=>engine.cancel(),()=>engine.invalid(),()=>engine.playHand(),()=>engine.discard(),()=>engine.resourceSpend('play',0),()=>engine.cardScore(),()=>engine.role(),()=>engine.joker(1),()=>engine.multiplier('add'),()=>engine.multiplier('multiply'),()=>engine.retrigger(),()=>engine.chanceRoll('lucky',true),()=>engine.chanceRoll('glass',false),()=>engine.glassBreak(),...(['tarot','planet','spectral','utility'] as const).map(f=>()=>engine.toolUse(f)),()=>engine.score(1),()=>engine.overkill(2),()=>engine.purchase(),()=>engine.sale(),()=>engine.reroll(),()=>engine.rareReveal(),()=>engine.success(),()=>engine.failure({runId:'x',commandSeq:2})]){inside.context.currentTime+=1;const before=sources.length;action();expect(sources.length).toBeGreaterThan(before);}
 expect(new Set(sources.map(s=>s.buffer.name)).size).toBeGreaterThanOrEqual(19);expect(inside.context.createOscillator).not.toHaveBeenCalled();expect(sources.every(s=>!s.loop)).toBe(true);
});

it('pre-scheduled deal train retains every future card and caps only overlapping voices',()=>{
 const {engine,inside,sources}=fixture();for(let i=0;i<14;i++)engine.deal(i);
 expect(sources).toHaveLength(14);expect(sources.every(s=>s.disconnect.mock.calls.length===0)).toBe(true);
 const voices=[...inside.voices] as any[];for(const voice of voices)expect(voices.filter(v=>v.startsAt<=voice.startsAt&&v.endsAt>voice.startsAt).length).toBeLessThanOrEqual(3);
 engine.cancelPresentation();expect(inside.voices.size).toBe(0);expect(sources.every(s=>s.disconnect.mock.calls.length===1)).toBe(true);
});

it('future multi-resource cap ends earlier beats at the collision time instead of disconnecting now',()=>{
 const {engine,inside,sources}=fixture();engine.resourceSpend('play',0,3,1);
 expect(sources).toHaveLength(6);expect(sources.every(s=>s.disconnect.mock.calls.length===0)).toBe(true);
 expect(sources[0].stop.mock.calls.at(-1)[0]).toBeCloseTo(1.11);
 const voices=[...inside.voices] as any[];for(const voice of voices)expect(voices.filter(v=>v.startsAt<=voice.startsAt&&v.endsAt>voice.startsAt).length).toBeLessThanOrEqual(4);
 engine.setSuspended(true);expect(inside.voices.size).toBe(0);
});
