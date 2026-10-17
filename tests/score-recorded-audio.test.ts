import {it,expect,vi,afterEach} from 'vitest';
import {AudioEngine} from '../src/audio/AudioEngine';
import {FOLEY_SAMPLES} from '../src/audio/foley';
const noteRate=(step:number)=>.9*2**([0,2,4][step%3]/12);
import {scoreR2Hand} from '../src/domain/scoreR2';
import {numberImpact} from '../src/game/ScoreEnergy';
import type {PlayingCard, Rank} from '../src/cards/types';
const fixture=()=>{vi.stubGlobal('document',{hidden:false});const sources:any[]=[];const param=()=>({value:1,cancelScheduledValues:vi.fn(),setValueAtTime:vi.fn(),setTargetAtTime:vi.fn(),linearRampToValueAtTime:vi.fn()});const gain=()=>({gain:param(),connect:vi.fn(),disconnect:vi.fn()});const engine=new AudioEngine(),inside=engine as any;inside.context={currentTime:1,state:'running',createGain:gain,createBufferSource:()=>{const node={buffer:null,playbackRate:param(),start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn(),onended:null};sources.push(node);return node;}};inside.gains={master:gain(),sfx:gain(),ui:gain(),music:gain()};inside.unlocked=true;for(const name of [...FOLEY_SAMPLES.map(a=>a.name),'cloth2'])inside.scoreSamples.set(name,{name,duration:.3});return {engine,inside,sources};};
afterEach(()=>vi.unstubAllGlobals());
it('phrase weak multiplication keeps one lighter strike and cached rebound, while zero weight consumes silently',()=>{
 const {engine,inside,sources}=fixture(),show={},signal=new AbortController();
 engine.scoreImpact(show,'weak','multiply',3,9,{pulse:7,accentWeight:.4,paired:true,signal:signal.signal});
 expect(sources.length).toBeGreaterThan(0);expect(sources.every(s=>!s.buffer.name.includes('Glass'))).toBe(true);
 const first=[...inside.voices].map((v:any)=>v.nominalGain);inside.context.currentTime+=.08;engine.scoreRebound(show,'weak');expect([...inside.voices].some((v:any)=>v.semantic==='scoreRebound')).toBe(true);
 expect(first.every((n:number)=>Number.isFinite(n)&&n>0)).toBe(true);const count=sources.length;engine.scoreRebound(show,'weak');expect(sources).toHaveLength(count);
 signal.abort();expect(inside.voices.size).toBe(0);engine.scoreImpact(show,'silent','multiply',3,0,{pulse:8,accentWeight:0});engine.scoreImpact(show,'silent','multiply',3,0,{pulse:8,accentWeight:1});expect(sources).toHaveLength(count);
});
it('ordinary wood and multiplication glass/low-body layers remain separately cancellable',()=>{const {engine,inside,sources}=fixture(),show={};engine.scoreImpact(show,'one','add',0,0);expect(sources.map(s=>s.buffer.name)).toEqual(['impactWood_light_000','impactBell_heavy_003']);engine.scoreImpact(show,'two','multiply',3,3);expect(sources.slice(2).map(s=>s.buffer.name)).toEqual(['impactGlass_heavy_002','impactSoft_heavy_000','impactGlass_heavy_002']);expect(sources[2].playbackRate.value).toBeCloseTo(.94*noteRate(3));expect(sources[3].playbackRate.value).toBeCloseTo(.78*noteRate(3));expect(inside.voices.size).toBe(5);engine.cancelPresentation();expect(inside.voices.size).toBe(0);expect(sources.every(s=>s.disconnect.mock.calls.length===1)).toBe(true);});

it.each([0,1,2,99])('multiplication pulse %i stays in the low register through every actual layer', step=>{
 const {engine,sources}=fixture();engine.scoreImpact({},'chain/'+step,'multiply',3,step);const rate=noteRate(step);
 expect(sources.map(s=>s.playbackRate.value)).toEqual([.94*rate,.78*rate,.84*rate]);
});

it.each(['10000','16'])('real scoring-card arrivals repeat three short pulses without fracturing additions (target %s)', target=>{
 const {engine,inside,sources}=fixture();
 const hand:PlayingCard[]=[2,4,6,8,10].map((rank,i)=>({id:'flush/'+i,rank:rank as Rank,suit:'spades'}));
 const score=scoreR2Hand({rulesVersion:'r2',runId:'audio',rootId:'audio/real-hand',characterId:'neutral',hand,selectedIds:hand.map(c=>c.id),disabledIds:[],jokers:[],definitions:[],handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:{algorithm:'fnv1a-mulberry32-v1',state:99}});
 const presentation={score},saved=JSON.stringify(score); const recorded:number[][]=[];
 for(const event of score.events){
  // This is the actual scene's numeric-event route: its visual chain is 1
  // for every card before a multiplier. cardScore(index) is never called.
  const number=numberImpact(event,target,1); if(!number)continue;
  inside.context.currentTime+=1; const before=sources.length;
  engine.scoreImpact(presentation,event.eventId,number.kind,number.tier,number.chain);
  recorded.push(sources.slice(before).map(s=>s.playbackRate.value));
 }
 expect(score.sets.activeScoringIds).toEqual(hand.map(c=>c.id));
 expect(recorded).toHaveLength(5);
 const rates=[0,1,2,3,4].map(noteRate);
 expect(recorded.map(row=>row[0])).toEqual(rates);expect(sources.some(s=>s.buffer.name.includes('Glass'))).toBe(false);
 expect(JSON.stringify(score)).toBe(saved);
});

it.each([0,2,7])('numeric key step %i uses the same saved low pulse without glass', index=>{
 const {engine,sources}=fixture(),ids=Array.from({length:8},(_,i)=>'card/'+i),rate=noteRate(index);
 const presentation={score:{sets:{activeScoringIds:ids},events:[{eventId:'key',targetCardId:ids[index]}]}};engine.scoreImpact(presentation,'key','key',3,1);
 expect(sources.map(s=>s.playbackRate.value)).toEqual([rate,.8*rate,rate]);
});
it('mute and missing clip consume cue without late playback; duplicate saved event cannot sound again',()=>{const {engine,inside,sources}=fixture(),show={};engine.muted=true;engine.scoreImpact(show,'one','multiply',3,2);engine.muted=false;engine.scoreImpact(show,'one','multiply',3,2);expect(sources).toHaveLength(0);inside.scoreSamples.delete('impactBell_heavy_003');inside.scoreSamples.delete('impactWood_light_000');inside.scoreSamples.delete('impactWood_light_001');engine.scoreImpact(show,'two','add');inside.scoreSamples.set('impactBell_heavy_003',{name:'impactBell_heavy_003',duration:.3});inside.scoreSamples.set('impactWood_light_000',{name:'impactWood_light_000',duration:.3});inside.scoreSamples.set('impactWood_light_001',{name:'impactWood_light_001',duration:.3});inside.context.currentTime+=.1;engine.scoreImpact(show,'two','add');expect(sources).toHaveLength(0);engine.scoreImpact(show,'three','add');engine.scoreImpact(show,'three','add');expect(sources).toHaveLength(2);});
it('hidden/scene exit cancel all recorded tails without rewards or replay',()=>{const {engine,inside,sources}=fixture();engine.scoreImpact({},'award','award',3);engine.setScene('shop');expect(inside.voices.size).toBe(0);expect(sources[0].disconnect).toHaveBeenCalledOnce();vi.stubGlobal('document',{hidden:true});engine.scoreImpact({},'hidden','award',3);expect(sources).toHaveLength(3);});

it('selection, confirmation, source multiplication and endings use actual samples without oscillator layers',()=>{
 const {engine,inside,sources}=fixture();inside.context.createOscillator=vi.fn(()=>{throw Error('synthetic tone');});
 engine.select();engine.cancel();engine.purchase();engine.multiplier('multiply',2);engine.success();const failed={runId:'same',commandSeq:3};engine.failure(failed);engine.failure(failed);
 expect(sources.map(s=>s.buffer.name)).toEqual(['card-slide-1','chip-lay-1','card-slide-1','card-place-1','chips-collide-1','chip-lay-2','card-slide-1','impactGlass_heavy_002','impactSoft_heavy_000','impactGlass_heavy_002','impactWood_heavy_000','chips-collide-1','impactBell_heavy_003','impactBell_heavy_003','impactSoft_heavy_000','card-shove-1','card-place-1']);
 expect(sources[0].start.mock.calls[0][1]).toBe(0);expect(sources[2].start.mock.calls[0][1]).toBe(0);expect(inside.context.createOscillator).not.toHaveBeenCalled();expect(engine.getVolume('music')).toBe(.3);expect(engine.getVolume('sfx')).toBe(.8);
 engine.cancelPresentation();expect([...inside.voices].every((v:any)=>v.bus==='ui')).toBe(true);
});
it('number rolls replace their recorded texture, remain finite and cannot restart after mute',()=>{
 const {engine,inside,sources}=fixture();engine.scoreRoll(600,'mult',2);engine.scoreRoll(900,'mult',2);
 expect(sources.map(s=>s.buffer.name)).toEqual(['chips-stack-1','chips-stack-1']);expect(sources[0].disconnect).toHaveBeenCalledOnce();expect(sources.every(s=>!s.loop)).toBe(true);expect(sources[1].stop.mock.calls[0][0]).toBeCloseTo(1.13);
 engine.setVolume('sfx',0);expect(inside.voices.size).toBe(0);engine.scoreRoll(900,'total',1);expect(sources).toHaveLength(2);
});

it('rapid ordinary input is throttled and longer sequences rotate variants under a per-semantic cap',()=>{
 const {engine,inside,sources}=fixture();engine.select();for(let i=0;i<100;i++)engine.select();expect(sources).toHaveLength(2);
 for(let i=0;i<7;i++){inside.context.currentTime+=.06;engine.select();}
 expect(new Set(sources.filter(s=>s.buffer.name.startsWith('card-slide')).map(s=>s.buffer.name)).size).toBe(3);expect([...inside.voices].filter((v:any)=>v.startsAt<=inside.context.currentTime&&v.endsAt>inside.context.currentTime).length).toBeLessThanOrEqual(4);
 engine.purchase();const confirmed=sources.slice(-3);expect(confirmed[1].start.mock.calls[0][0]-confirmed[0].start.mock.calls[0][0]).toBeCloseTo(.075);
 engine.setSuspended(true);expect(inside.voices.size).toBe(0);expect(sources.every(s=>s.disconnect.mock.calls.length===1)).toBe(true);
});
it('every public semantic feedback uses available distinct recorded families without synthesis',()=>{
 const {engine,inside,sources}=fixture();inside.context.createOscillator=vi.fn(()=>{throw Error('synth');});
 for(const action of [()=>engine.deal(0),()=>engine.cardLand(),()=>engine.hoverTick(),()=>engine.coin(),()=>engine.titleBell(),()=>engine.curtainOpen(),()=>engine.select(),()=>engine.cancel(),()=>engine.invalid(),()=>engine.playHand(),()=>engine.discard(),()=>engine.resourceSpend('play',0),()=>engine.cardScore(),()=>engine.role(),()=>engine.joker(1),()=>engine.multiplier('add'),()=>engine.multiplier('multiply'),()=>engine.retrigger(),()=>engine.chanceRoll('lucky',true),()=>engine.chanceRoll('glass',false),()=>engine.glassBreak(),...(['tarot','planet','spectral','utility'] as const).map(f=>()=>engine.toolUse(f)),()=>engine.score(1),()=>engine.overkill(2),()=>engine.purchase(),()=>engine.sale(),()=>engine.reroll(),()=>engine.rareReveal(),()=>engine.success(),()=>engine.failure({runId:'x',commandSeq:2})]){inside.context.currentTime+=1;const before=sources.length;action();expect(sources.length).toBeGreaterThan(before);}
 for(const material of ['card-slide-1','card-place-1','chips-collide-1','impactSoft_heavy_000','impactWood_light_000','impactBell_heavy_003','impactGlass_heavy_002'])expect(sources.some(s=>s.buffer.name===material)).toBe(true);expect(inside.context.createOscillator).not.toHaveBeenCalled();expect(sources.every(s=>!s.loop)).toBe(true);
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

it('user 7/100 remains exact while internal music headroom, trimmed body and duck restoration apply',()=>{
 const {engine,inside,sources}=fixture();engine.setVolume('music',.07);engine.setVolume('sfx',1);expect(engine.getVolume('music')).toBe(.07);expect(engine.getVolume('sfx')).toBe(1);expect(inside.gains.music.gain.setTargetAtTime).toHaveBeenLastCalledWith(.0126,1,.015);
 inside.scoreSamples.set('card-slide-1',{name:'card-slide-1',duration:.6});inside.sampleBodies.set('card-slide-1',{offset:.142,gain:.72});engine.select();expect(sources[0].start.mock.calls[0][1]).toBe(.142);expect(inside.gains.music.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(.0126,1.12);
 engine.setVolume('music',0);expect(inside.gains.music.gain.setValueAtTime).toHaveBeenLastCalledWith(0,1);
});

it('numeric key landing starts its wood at arrival with a low body and short bounded tails',()=>{
 const {engine,inside,sources}=fixture(),filters:any[]=[];inside.context.createBiquadFilter=()=>{const f={type:'',Q:{value:0},frequency:{setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()};filters.push(f);return f;};
 const show={};engine.scoreImpact(show,'actual-key','key',3);expect(sources.map(s=>s.buffer.name)).toEqual(['impactWood_heavy_000','impactSoft_heavy_000','card-slide-1']);expect(filters.map(f=>f.type)).toEqual(['lowpass','lowpass','bandpass']);expect(filters[1].frequency.setValueAtTime).toHaveBeenCalledWith(720,1.02);expect(sources[0].start.mock.calls[0][0]).toBe(1);expect(sources.every(s=>s.stop.mock.calls[0][0]-s.start.mock.calls[0][0]<=.14)).toBe(true);
 engine.cancelPresentation();engine.scoreImpact(show,'actual-key','key',3);expect(sources).toHaveLength(3);expect(filters.every(f=>f.disconnect.mock.calls.length===1)).toBe(true);
});

it('ordinary callers retain short wood attacks and variant rotation without accumulating long bell tails',()=>{
 const {engine,inside,sources}=fixture(),show={};engine.scoreImpact(show,'wood/one','add');const first=[...inside.voices][0] as any;expect(first.gain.gain.linearRampToValueAtTime.mock.calls[0][1]).toBeCloseTo(1.0015);expect(sources[0].stop.mock.calls[0][0]).toBeCloseTo(1.088);
 inside.context.currentTime=1.06;engine.scoreImpact(show,'wood/two','add');inside.context.currentTime=1.12;engine.scoreImpact(show,'wood/three','add');expect(sources.filter(s=>s.buffer.name==='impactBell_heavy_003')).toHaveLength(3);expect(sources.filter(s=>s.buffer.name.startsWith('impactWood')).map(s=>s.buffer.name)).toEqual(['impactWood_light_000','impactWood_light_001','impactWood_light_000']);expect([...inside.voices].filter((v:any)=>v.startsAt<=1.12&&v.endsAt>1.12).length).toBeLessThanOrEqual(8);
 engine.setVolume('sfx',0);engine.scoreImpact(show,'wood/muted','add');expect(inside.voices.size).toBe(0);expect(sources).toHaveLength(6);
});
