import {it,expect,vi,afterEach} from 'vitest';
import {AudioEngine} from '../src/audio/AudioEngine';
import {FOLEY_SAMPLES} from '../src/audio/foley';
import {scoreStrikeRate,scoreStrikeStep} from '../src/audio/mixPolicy';
import {numberImpact} from '../src/game/ScoreEnergy';
import {scoreEnergyFixture,energySend} from '../harness/fixtures/score-energy';
const fixture=()=>{vi.stubGlobal('document',{hidden:false});const sources:any[]=[];const param=()=>({value:1,cancelScheduledValues:vi.fn(),setValueAtTime:vi.fn(),setTargetAtTime:vi.fn(),linearRampToValueAtTime:vi.fn()});const gain=()=>({gain:param(),connect:vi.fn(),disconnect:vi.fn()});const engine=new AudioEngine(),inside=engine as any;inside.context={currentTime:1,state:'running',createGain:gain,createBufferSource:()=>{const node={buffer:null,playbackRate:param(),start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn(),onended:null};sources.push(node);return node;}};inside.gains={master:gain(),sfx:gain(),ui:gain(),music:gain()};inside.unlocked=true;for(const name of [...FOLEY_SAMPLES.map(a=>a.name),'cloth2'])inside.scoreSamples.set(name,{name,duration:.3});return {engine,inside,sources};};
afterEach(()=>vi.unstubAllGlobals());
const savedTrace=()=>{const f=scoreEnergyFixture('multiply');return energySend(f.state,{type:'PlayAssistedHand',selectedIds:f.selectedIds,assistIds:f.assistIds}).lastTrace!;};
it('real saved cards then jokers then hero form one rising phrase without a multiplication reset',()=>{
 const score=savedTrace(),saved=JSON.stringify(score),show={score},{engine,inside,sources}=fixture(),rates:number[]=[],names:string[]=[];let chain=0;
 for(const e of score.events){const n=numberImpact(e,'100000000',chain+1);if(!n)continue;if(n.kind==='multiply')chain++;inside.context.currentTime+=.32;const before=sources.length;engine.scoreImpact(show,e.eventId,n.kind,n.tier,n.chain);const note=sources.slice(before).find(s=>s.buffer.name==='impactBell_heavy_003');expect(note).toBeDefined();expect(note.start.mock.calls[0][0]).toBe(inside.context.currentTime);rates.push(note.playbackRate.value);names.push(e.sourceDefinitionId);}
 expect(names).toEqual(['rank-7','rank-7','rank-9','rank-9','f09','f06','e08','amo']);const semitones=[0,2,4,5,7,9,11,12];expect(rates).toHaveLength(8);rates.forEach((r,i)=>expect(r).toBeCloseTo(2**(semitones[i]/12)));for(let i=1;i<rates.length;i++)expect(rates[i]).toBeGreaterThan(rates[i-1]);expect(JSON.stringify(score)).toBe(saved);
});
it('distinct 4x-spaced numeric arrivals are admitted while duplicate events stay silent and all tails cancel',()=>{
 const score=savedTrace(),events=score.events.filter(e=>numberImpact(e,'100000000',1)),show={score},{engine,inside,sources}=fixture();
 events.forEach((e,i)=>{inside.context.currentTime=1+i*.075;const count=sources.length;engine.scoreImpact(show,e.eventId,'key',3,1);expect(sources.slice(count).filter(s=>s.buffer.name==='impactBell_heavy_003')).toHaveLength(1);engine.scoreImpact(show,e.eventId,'key',3,1);expect(sources.length-count).toBe(3);});
 expect(sources.filter(s=>s.buffer.name==='impactBell_heavy_003')).toHaveLength(8);const active=[...inside.voices].filter((v:any)=>v.startsAt<=inside.context.currentTime&&v.endsAt>inside.context.currentTime);expect(active.length).toBeLessThanOrEqual(16);engine.cancelPresentation();expect(inside.voices.size).toBe(0);
});
it('a late missing root never substitutes another pitch or replays an old event',()=>{
 const score=savedTrace(),events=score.events.filter(e=>numberImpact(e,'100000000',1)),show={score},{engine,inside,sources}=fixture();inside.scoreSamples.delete('impactBell_heavy_003');engine.scoreImpact(show,events[0].eventId,'add');expect(sources.some(s=>s.buffer.name.startsWith('impactBell'))).toBe(false);inside.scoreSamples.set('impactBell_heavy_003',{name:'impactBell_heavy_003',duration:.3});const count=sources.length;engine.scoreImpact(show,events[0].eventId,'add');expect(sources).toHaveLength(count);inside.context.currentTime+=.1;engine.scoreImpact(show,events[1].eventId,'add');expect(sources.slice(count).some(s=>s.buffer.name==='impactBell_heavy_003')).toBe(true);
});
it('note ownership is deterministic per saved hand, independent of final total and call order, with an octave ceiling',()=>{
 const score=savedTrace(),events=score.events.filter(e=>numberImpact(e,'100000000',1)),show={score};const before=JSON.stringify(score),last=events.at(-1)!;expect(scoreStrikeRate(show,last.eventId,'multiply',1)).toBe(2);expect(scoreStrikeRate(show,events[0].eventId,'add',7)).toBe(1);expect(scoreStrikeRate({score:{...score,finalScore:'9'.repeat(50)}},last.eventId,'multiply',0)).toBe(2);expect(scoreStrikeRate({},'standalone','multiply',999)).toBe(2);expect(scoreStrikeStep(show,events[4].eventId,1)).toBe(4);expect(scoreStrikeRate(show,'award','award',99)).toBe(1);expect(scoreStrikeRate(show,last.eventId,'flight',99)).toBe(1);expect(JSON.stringify(score)).toBe(before);
});
