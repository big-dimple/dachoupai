import {afterEach,expect,it,vi} from 'vitest';
import {AudioEngine} from '../src/audio/AudioEngine';
import {MAX_INTEGER_DIGITS,Rational} from '../src/domain/rational';
import {FOLEY,FOLEY_SAMPLES} from '../src/audio/foley';
import {awardForScore,EFFECT_VOICE_BUDGET} from '../src/audio/mixPolicy';
const fixture=()=>{
 vi.stubGlobal('document',{hidden:false});
 const sources:any[]=[],param=()=>({value:.1,cancelScheduledValues:vi.fn(),cancelAndHoldAtTime:vi.fn(),setValueAtTime:vi.fn(),setTargetAtTime:vi.fn(),linearRampToValueAtTime:vi.fn()});
 const gain=()=>({gain:param(),connect:vi.fn(),disconnect:vi.fn()}),engine=new AudioEngine(),inside=engine as any;
 inside.context={state:'running',currentTime:1,createGain:gain,createBufferSource:()=>{const s={buffer:null,playbackRate:param(),connect:vi.fn(),start:vi.fn(),stop:vi.fn(),disconnect:vi.fn(),onended:null};sources.push(s);return s;}};
 inside.gains={master:gain(),music:gain(),sfx:gain(),ui:gain()};inside.unlocked=true;
 for(const name of [...FOLEY_SAMPLES.map(s=>s.name),'cloth2'])inside.scoreSamples.set(name,{name,duration:1});
 return {engine,inside,sources};
};
afterEach(()=>vi.unstubAllGlobals());
it.each([
 ['999999','award'],['1000000','awardMillion'],['99999999','awardMillion'],['100000000','awardHundredMillion'],['999999999999','awardHundredMillion'],['1000000000000','awardTrillion'],['0001000000','awardMillion'],['1'+'0'.repeat(200),'awardTrillion']
])('absolute committed score %s maps to %s', (finalScore,kind)=>expect(awardForScore({score:{finalScore}})).toBe(kind));
it('rejects absent, signed, non-digit, provisional or unbounded amounts without inferring from relative tier',()=>{
 for(const score of [undefined,NaN,1e9,'-1000000','1e9','1.2','','1000000\n','9'.repeat(MAX_INTEGER_DIGITS+1)])expect(awardForScore({score:{finalScore:score}})).toBe('award');
 expect(awardForScore({tier:3,originHeat:'99999999999999'})).toBe('award');
});
it('only the final award chooses absolute size; ordinary/key sounds cannot reveal a future final score',()=>{
 const {engine,inside,sources}=fixture(),show={score:{finalScore:'1000000000000'}};
 engine.scoreImpact(show,'key','key',3,4);expect(sources).toHaveLength(FOLEY.scoreBurst.layers.length);
 inside.context.currentTime+=1;const count=sources.length;engine.scoreImpact(show,'award','award',3);
 expect(sources.slice(count)).toHaveLength(6);expect(sources.slice(count).map(s=>s.start.mock.calls[0][0])).toEqual([2,2.07,2.17,2.29,2.36,2.45]);
 engine.cancelPresentation();engine.scoreImpact(show,'award','award',3);expect(sources).toHaveLength(count+6);
});
it('cross-semantic pressure admits a whole ending by reclaiming weak tails and denies texture eviction',()=>{
 const {inside}=fixture();
 const expired:string[]=[];
 for(let i=0;i<EFFECT_VOICE_BUDGET;i++)inside.voices.add({source:{stop:vi.fn(()=>expired.push(String(i))),disconnect:vi.fn()},gain:{disconnect:vi.fn()},bus:'sfx',semantic:'flight',priority:0,startsAt:1,endsAt:2});
 const ending=inside.cue('awardTrillion');expect(ending).toHaveLength(6);expect(expired).toHaveLength(6);expect(inside.voices.size).toBe(EFFECT_VOICE_BUDGET);
 inside.voices.clear();for(let i=0;i<EFFECT_VOICE_BUDGET;i++)inside.voices.add({source:{stop:vi.fn(),disconnect:vi.fn()},gain:{disconnect:vi.fn()},bus:'sfx',semantic:'award',priority:4,startsAt:1,endsAt:2});
 const before=[...inside.voices];expect(inside.cue('hover','ui')).toHaveLength(0);expect([...inside.voices]).toEqual(before);
});
it('a strong hit lowers existing quiet tails with a short ramp while user settings remain exact',()=>{
 const {engine,inside}=fixture();engine.setVolume('music',.07);engine.setVolume('sfx',1);engine.select();
 const gesture=[...inside.voices] as any[];inside.context.currentTime+=.03;engine.scoreImpact({},'multiply','multiply',3,3);
 expect(gesture.every(v=>v.gain.gain.cancelAndHoldAtTime.mock.calls.length===1)).toBe(true);
 for(const voice of gesture)expect(voice.gain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0,voice.endsAt);
 expect(engine.getVolume('music')).toBe(.07);expect(engine.getVolume('sfx')).toBe(1);
});
it('late variant loading degrades to a decoded sibling immediately and never emits on load',()=>{
 const {engine,inside,sources}=fixture();inside.scoreSamples.delete('card-slide-1');engine.select();
 expect(sources[0].buffer.name).toBe('card-slide-2');inside.scoreSamples.set('card-slide-1',{name:'card-slide-1',duration:1});expect(sources).toHaveLength(2);
 engine.setSuspended(true);engine.scoreImpact({},'award','award',3);expect(inside.voices.size).toBe(0);
});
it('all recipes remain finite, licensed material families with bounded level and limited layers',()=>{
 const known=new Set([...FOLEY_SAMPLES.map(s=>s.name),'cloth2']);
 for(const recipe of Object.values(FOLEY)){
  expect(recipe.layers.length).toBeLessThanOrEqual(6);expect(recipe.cap).toBeGreaterThanOrEqual(recipe.layers.length);
  for(const layer of recipe.layers){expect(layer.duration).toBeGreaterThan(0);expect(layer.duration+(layer.delay??0)).toBeLessThanOrEqual(1);expect(layer.gain).toBeLessThanOrEqual(.047);expect(layer.samples.every(s=>known.has(s))).toBe(true);}
 }
});
it('a recipe that cannot fit leaves every existing stronger/weak tail untouched',()=>{
 const {inside}=fixture();const stops:any[]=[];
 for(let i=0;i<16;i++){const stop=vi.fn();stops.push(stop);inside.voices.add({source:{stop,disconnect:vi.fn()},gain:{disconnect:vi.fn()},bus:'sfx',semantic:i<13?'success':'flight',priority:i<13?4:0,startsAt:1,endsAt:2});}
 const before=[...inside.voices];expect(inside.cue('awardTrillion')).toHaveLength(0);expect([...inside.voices]).toEqual(before);expect(stops.every(stop=>stop.mock.calls.length===0)).toBe(true);
});

it.each([309,310,MAX_INTEGER_DIGITS])('keeps a legal %i-digit bigint final score in the trillion award',digitCount=>{
 const finalScore=new Rational(BigInt('9'.repeat(digitCount))).floor().toString();
 expect(finalScore).toHaveLength(digitCount);
 expect(awardForScore({score:{finalScore}})).toBe('awardTrillion');
});
it('rejects one digit beyond the existing domain limit without changing its numeric rule',()=>{
 const finalScore='1'+'0'.repeat(MAX_INTEGER_DIGITS);
 expect(()=>new Rational(BigInt(finalScore))).toThrow('numeric-length-limit');
 expect(awardForScore({score:{finalScore}})).toBe('award');
});
it.each([310,MAX_INTEGER_DIGITS])('committed %i-digit bigint award actually schedules the six-layer recipe',digitCount=>{
 const {engine,inside,sources}=fixture(),finalScore=new Rational(BigInt('9'.repeat(digitCount))).floor().toString();
 engine.scoreImpact({score:{finalScore}},'actual-award','award');
 expect(sources).toHaveLength(6);
 expect([...inside.voices].every((voice:any)=>voice.semantic==='awardTrillion')).toBe(true);
});
