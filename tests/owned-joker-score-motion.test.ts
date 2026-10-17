import {describe,it,expect} from 'vitest';
import {scoreSourceProcessFixture} from '../harness/fixtures/score-source-process';
import {energySend} from '../harness/fixtures/score-energy';
import {ownedJokerMotionCue,ownedJokerScorePose,fitOwnedJokerPose,ownedJokerMotionDuration} from '../src/game/OwnedJokerScoreMotion';
import {hasActualBenefit} from '../src/game/JokerExperience';
import {OWNED_SCORE_SPRING} from '../src/game/inkwaveSpring';

const fixture=scoreSourceProcessFixture('chain'),trace=energySend(fixture.state,{type:'PlayAssistedHand',selectedIds:fixture.selectedIds,assistIds:fixture.assistIds}).lastTrace!;
describe('owned source motion uses the committed result',()=>{
 it('accepts every actual beneficial joker and rejects forged, missing, card and zero events',()=>{
  const events=trace.events.filter(e=>e.sourceType==='joker'&&hasActualBenefit(e));expect(events.length).toBeGreaterThan(2);
  for(const event of trace.events)expect(!!ownedJokerMotionCue(trace,event)).toBe(event.sourceType==='joker'&&hasActualBenefit(event));
  const e=events[0];expect(ownedJokerMotionCue(trace,{...e,value:{n:'999999',d:'1'}})).toBeUndefined();expect(ownedJokerMotionCue(trace,{sourceInstanceId:e.sourceInstanceId,operation:'seal-joker'})).toBeUndefined();
  expect(ownedJokerMotionCue(trace,{...e,eventId:'not-saved'})).toBeUndefined();
 });
 it('chooses actual ordinary/add-M/multiply tiers, preserves saved label and changes no trace bytes',()=>{
  const saved=JSON.stringify(trace),cues=trace.events.map(e=>ownedJokerMotionCue(trace,e)).filter(Boolean);
  expect(new Set(cues.map(c=>c!.tier))).toEqual(new Set(['ordinary','multiplier','multiply']));
  expect(cues.some(c=>c!.label.startsWith('×'))).toBe(true);expect(JSON.stringify(trace)).toBe(saved);
 });
 it('swings to both sides, rebounds and ends at identity; tiers increase amplitude and duration',()=>{
  for(const tier of ['ordinary','multiplier','multiply'] as const){const poses=Array.from({length:101},(_,i)=>ownedJokerScorePose(i/100,tier));expect(Math.max(...poses.map(p=>p.angle))).toBeGreaterThan(3);expect(Math.min(...poses.map(p=>p.angle))).toBeLessThan(-2);expect(poses[100]).toEqual({x:0,y:0,angle:0,scale:1});expect(ownedJokerScorePose(0,tier,1).angle).toBe(-poses[0].angle);}
  expect(ownedJokerMotionDuration('multiply')).toBeGreaterThan(ownedJokerMotionDuration('multiplier'));expect(ownedJokerMotionDuration('multiplier')).toBeGreaterThan(ownedJokerMotionDuration('ordinary'));
  for(const speed of [1,2,4])for(const tier of ['ordinary','multiplier','multiply'] as const)expect(ownedJokerMotionDuration(tier,undefined,speed)/speed*OWNED_SCORE_SPRING.reboundAt).toBeGreaterThanOrEqual(50);
 });
 it.each([[64,89.6,true],[52,72.8,true],[80,112,false]] as const)('keeps every rotated corner in its own lane %s×%s portrait=%s',(width,height,portrait)=>{
  for(const tier of ['ordinary','multiplier','multiply'] as const)for(let i=0;i<=100;i++){const p=fitOwnedJokerPose(ownedJokerScorePose(i/100,tier),width,height,portrait),a=p.angle*Math.PI/180,w=(Math.abs(Math.cos(a))*width+Math.abs(Math.sin(a))*height)*p.scale/2,h=(Math.abs(Math.cos(a))*height+Math.abs(Math.sin(a))*width)*p.scale/2;expect(Math.abs(p.x)+w).toBeLessThanOrEqual(width/2+(portrait?3:9)+1e-6);expect(Math.abs(p.y)+h).toBeLessThanOrEqual(height/2+(portrait?1:12)+1e-6);}
 });
});
