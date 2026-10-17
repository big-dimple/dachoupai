import {it,expect,vi,afterEach} from 'vitest';
import {AudioEngine} from '../src/audio/AudioEngine';
import {FOLEY_SAMPLES} from '../src/audio/foley';
import {scoreStrikeRate,scoreStrikeStep,SCORE_VOICE_BUDGET,SCORE_GAIN_BUDGET} from '../src/audio/mixPolicy';
import {numberImpact} from '../src/game/ScoreEnergy';
import {scoreEnergyFixture,energySend} from '../harness/fixtures/score-energy';
const fixture=()=>{vi.stubGlobal('document',{hidden:false});const sources:any[]=[];const param=()=>({value:1,cancelScheduledValues:vi.fn(),setValueAtTime:vi.fn(),setTargetAtTime:vi.fn(),linearRampToValueAtTime:vi.fn()});const gain=()=>({gain:param(),connect:vi.fn(),disconnect:vi.fn()});const engine=new AudioEngine(),inside=engine as any;inside.context={currentTime:1,state:'running',createGain:gain,createBufferSource:()=>{const node={buffer:null,playbackRate:param(),start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn(),onended:null};sources.push(node);return node;}};inside.gains={master:gain(),sfx:gain(),ui:gain(),music:gain()};inside.unlocked=true;for(const name of [...FOLEY_SAMPLES.map(a=>a.name),'cloth2'])inside.scoreSamples.set(name,{name,duration:.3});return {engine,inside,sources};};
afterEach(()=>vi.unstubAllGlobals());
const savedTrace=()=>{const f=scoreEnergyFixture('multiply');return energySend(f.state,{type:'PlayAssistedHand',selectedIds:f.selectedIds,assistIds:f.assistIds}).lastTrace!;};

it('real saved cards, jokers and hero use a repeating low three-pulse phrase; only actual multiplication fractures',()=>{
 const score=savedTrace(),saved=JSON.stringify(score),show={score},{engine,inside,sources}=fixture();let chain=0,index=0;
 for(const e of score.events){const n=numberImpact(e,'100000000',chain+1);if(!n)continue;if(n.kind==='multiply')chain++;inside.context.currentTime+=.32;const before=sources.length;
  engine.scoreImpact(show,e.eventId,n.kind,n.tier,n.chain);const hit=sources.slice(before);
  expect(hit.length).toBeGreaterThan(0);expect(hit[0].start.mock.calls[0][0]).toBe(inside.context.currentTime);
  expect(hit.some(s=>s.buffer.name.includes('Glass'))).toBe(n.kind==='multiply');
  expect(scoreStrikeStep(show,e.eventId,99)).toBe(index++%3);
  expect(hit.every(s=>s.playbackRate.value>=.65&&s.playbackRate.value<=1.14)).toBe(true);
  expect(hit.every(s=>s.stop.mock.calls[0][0]-inside.context.currentTime<=.141)).toBe(true);
 }
 expect(index).toBe(8);expect(JSON.stringify(score)).toBe(saved);
});

it('fast repeated mixed arrivals keep their new hit under one six-voice budget and deduplicate across visual kinds',()=>{
 const {engine,inside,sources}=fixture(),show={};
 for(let i=0;i<60;i++){inside.context.currentTime=1+i*.025;const before=sources.length;
  engine.scoreImpact(show,'event/'+i,i%4===0?'multiply':'add',3,i);
  expect(sources.length).toBeGreaterThan(before);const count=sources.length;
  for(const kind of ['key','multiply','add'] as const)engine.scoreImpact(show,'event/'+i,kind,3,i);
  expect(sources.length).toBe(count);
  const active=[...inside.voices].filter((v:any)=>v.startsAt<=inside.context.currentTime&&v.endsAt>inside.context.currentTime);
  expect(active.length).toBeLessThanOrEqual(SCORE_VOICE_BUDGET);
  expect(active.reduce((sum:number,v:any)=>sum+v.nominalGain,0)).toBeLessThanOrEqual(SCORE_GAIN_BUDGET);
 }
 engine.cancelPresentation();expect(inside.voices.size).toBe(0);expect(sources.every(s=>s.disconnect.mock.calls.length===1)).toBe(true);
});

it('saved arithmetic corrects visual labels, while flight and committed award remain separately owned',()=>{
 const score=savedTrace(),show={score},events=score.events.filter(e=>numberImpact(e,'100000000',1)),{engine,inside,sources}=fixture();
 const ordinary=events[0],multiply=events.find(e=>numberImpact(e,'100000000',1)?.kind==='multiply')!;
 engine.scoreImpact(show,ordinary.eventId,'multiply',3);expect(sources.some(s=>s.buffer.name.includes('Glass'))).toBe(false);
 inside.context.currentTime+=.3;const count=sources.length;engine.scoreImpact(show,multiply.eventId,'key',3);expect(sources.slice(count).filter(s=>s.buffer.name.includes('Glass'))).toHaveLength(2);
 const landed=sources.length;engine.scoreImpact(show,multiply.eventId,'multiply',3);expect(sources).toHaveLength(landed);
 engine.scoreImpact(show,multiply.eventId,'flight');expect(sources.length).toBeGreaterThan(landed);
 inside.context.currentTime+=.3;const flown=sources.length;engine.scoreImpact(show,multiply.eventId,'award');expect(sources.length).toBeGreaterThan(flown);
});

it('pitch is independent of total and call order, repeats after three, and a late root never replays',()=>{
 const score=savedTrace(),events=score.events.filter(e=>numberImpact(e,'100000000',1)),show={score},saved=JSON.stringify(score);
 const rates=events.map(e=>scoreStrikeRate(show,e.eventId,'add',999));
 expect(rates[0]).toBe(.9);expect(rates[1]).toBeGreaterThan(rates[0]);expect(rates[2]).toBeGreaterThan(rates[1]);expect(rates[3]).toBe(rates[0]);expect(Math.max(...rates)).toBeLessThan(1.14);
 expect(scoreStrikeRate({score:{...score,finalScore:'9'.repeat(50)}},events[7].eventId,'multiply',0)).toBe(rates[7]);expect(scoreStrikeRate(show,'award','award',99)).toBe(1);expect(JSON.stringify(score)).toBe(saved);
 const {engine,inside,sources}=fixture();inside.scoreSamples.clear();engine.scoreImpact(show,events[0].eventId,'add');
 for(const name of FOLEY_SAMPLES.map(a=>a.name))inside.scoreSamples.set(name,{name,duration:.3});engine.scoreImpact(show,events[0].eventId,'key');expect(sources).toHaveLength(0);
 engine.scoreImpact(show,events[1].eventId,'add');expect(sources.length).toBeGreaterThan(0);
});

it('the shared arrival duration compresses the whole recipe and the shared abort cleans every scheduled tail once',()=>{
 const {engine,inside,sources}=fixture(),controller=new AbortController(),remove=vi.spyOn(controller.signal,'removeEventListener');
 engine.scoreImpact({},'peak','multiply',3,2,{durationMs:40,signal:controller.signal});
 expect(sources[0].start.mock.calls[0][0]).toBe(1);expect(sources[1].start.mock.calls[0][0]).toBe(1);
 expect(Math.max(...[...inside.voices].map((v:any)=>v.endsAt))).toBeLessThanOrEqual(1.05);
 controller.abort();expect(inside.voices.size).toBe(0);expect(remove).toHaveBeenCalledOnce();engine.cancelPresentation();expect(sources.every(s=>s.disconnect.mock.calls.length===1)).toBe(true);
 const count=sources.length;engine.scoreImpact({},'aborted','multiply',3,2,{signal:controller.signal});engine.scoreImpact({},'no-duration','key',3,2,{durationMs:0});expect(sources).toHaveLength(count);
});

it('paired owned-source beats follow impact and rebound calls once, with a shorter lighter low second hit',()=>{
 const score=savedTrace(),show={score},event=score.events.find(e=>numberImpact(e,'100000000',1)?.kind==='multiply')!,{engine,inside,sources}=fixture();
 engine.scoreRebound(show,event.eventId);expect(sources).toHaveLength(0);
 engine.scoreImpact(show,event.eventId,'multiply',3,7,{paired:true});
 const first=sources.length;expect(first).toBe(2);expect(sources[0].start.mock.calls[0][0]).toBe(1);expect(sources[1].start.mock.calls[0][0]).toBe(1);
 expect(Math.max(...[...inside.voices].map((v:any)=>v.endsAt))).toBeLessThanOrEqual(1.05);
 inside.context.currentTime=1.075;engine.scoreRebound(show,event.eventId);
 const second=sources.slice(first);expect(second).toHaveLength(1);expect(second[0].buffer.name).toMatch(/^impactWood_light/);expect(second[0].start.mock.calls[0][0]).toBe(1.075);
 expect(second[0].playbackRate.value).toBeLessThan(sources[0].playbackRate.value);expect([...inside.voices].at(-1).nominalGain).toBeLessThan(.025);
 engine.scoreRebound(show,event.eventId);engine.scoreImpact(show,event.eventId,'key',3,0,{paired:true});expect(sources).toHaveLength(first+1);
});

it('ordinary callers that did not opt into paired motion keep their single impact',()=>{
 const {engine,inside,sources}=fixture(),show={};engine.scoreImpact(show,'legacy','add');const count=sources.length;
 inside.context.currentTime+=.075;engine.scoreRebound(show,'legacy');expect(sources).toHaveLength(count);expect(count).toBeGreaterThan(0);
});

it('phrase pulse selects five samples without octave escalation, and weight follows the same event rebound',()=>{
 const {engine,inside,sources}=fixture(),show={},names:string[]=[];
 for(let i=0;i<11;i++){inside.context.currentTime+=.2;const before=sources.length;engine.scoreImpact(show,'phrase/'+i,'add',0,99,{pulse:i,accentWeight:.4,paired:true});names.push(sources[before].buffer.name);expect(sources[before].playbackRate.value).toBe(.75);engine.scoreRebound(show,'phrase/'+i);expect([...inside.voices].at(-1).nominalGain).toBeCloseTo(.019*.4);}
 expect(new Set(names).size).toBe(5);expect(names[5]).toBe(names[0]);expect(names[10]).toBe(names[0]);
 const count=sources.length;engine.scoreImpact(show,'silent-phrase','add',0,0,{pulse:0,accentWeight:0,paired:true});engine.scoreRebound(show,'silent-phrase');expect(sources).toHaveLength(count);
});

it.each(['cancel','mute','suspend','signal','silent'] as const)('a paired %s impact cannot leave a later orphan rebound',boundary=>{
 const {engine,inside,sources}=fixture(),show={},signal=new AbortController();
 if(boundary==='silent')engine.setVolume('sfx',0);
 engine.scoreImpact(show,'owned','key',2,0,{paired:true,signal:signal.signal});
 if(boundary==='cancel')engine.cancelPresentation();if(boundary==='mute')engine.muted=true;if(boundary==='suspend')engine.setSuspended(true);if(boundary==='signal')signal.abort();
 const count=sources.length;inside.context.currentTime+=.075;engine.setVolume('sfx',.8);engine.muted=false;engine.setSuspended(false);engine.scoreRebound(show,'owned');expect(sources).toHaveLength(count);
});

it('60 dense paired events share the original gain/voice ceilings, and the rebound uses the cached event pitch',()=>{
 const {engine,inside,sources}=fixture(),show={};
 for(let i=0;i<60;i++){
  inside.context.currentTime=1+i*.025;engine.scoreImpact(show,'pair/'+i,i%3===0?'multiply':'add',2,i,{paired:true});
  if(i>2)engine.scoreRebound(show,'pair/'+(i-3));
  const overlap=[...inside.voices].filter((v:any)=>v.startsAt<=inside.context.currentTime&&v.endsAt>inside.context.currentTime);
  expect(overlap.length).toBeLessThanOrEqual(SCORE_VOICE_BUDGET);expect(overlap.reduce((sum:number,v:any)=>sum+v.nominalGain,0)).toBeLessThanOrEqual(SCORE_GAIN_BUDGET);
 }
 expect(sources.every(s=>s.playbackRate.value<=1.14)).toBe(true);engine.cancelPresentation();expect(inside.voices.size).toBe(0);
});
