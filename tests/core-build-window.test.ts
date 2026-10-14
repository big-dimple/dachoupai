import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {naturalWindow,naturalFile,send} from '../analysis/core-build-window';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {getR2Stage} from '../src/domain/r2Run';
import {stableHash} from '../src/domain/hash';
import {scoreR2Hand} from '../src/domain/scoreR2';
import {activeCards,activeJoker,activeScoreInput} from './fixtures/p1a-active-mult';

describe('real bounded-clear C9 and the existing paid construction window',()=>{
 it('replays all 196 actual commands into the exact saved state and authoritative Boss score',()=>{
  expect(createHash('sha256').update(readFileSync(naturalFile)).digest('hex')).toBe('085d29b9fd4bcabf638f87c2eeb63f55c17ca553c65ade87e10544337d28f1b9');
  const w=naturalWindow();expect(w.report.replayedCommands).toBe(196);
  expect(w.trace.finalScore).toBe('60047');expect(w.trace.accumulator).toEqual({H:{n:'487',d:'1'},M:{n:'1233',d:'10'}});
  expect(w.trace.events.filter(e=>e.operation==='route-factor')).toHaveLength(1);
  expect(w.trace.events.find(e=>e.operation==='halve-base-heat')).toMatchObject({before:{H:{n:'580',d:'1'}},after:{H:{n:'290',d:'1'}}});
  expect(w.report.ablations).toEqual({noRoute:'15011',noJokers:'14154',noGrowth:'47717',level1:'16815'});
 });
 it('uses the actual C10 shelf and cash; replacing a useful source can lose score',()=>{
  const w=naturalWindow(),before=stableHash(w.shop);
  expect(w.shop.gold).toBe(264);expect(w.shop.boss.definitionId).toBe('B13');
  expect(w.report.shop.targets).toEqual(['24775','37163','49550']);
  expect(w.report.swaps).toHaveLength(20);
  expect(w.report.swaps.find(r=>r.sold==='e08'&&r.bought==='b04')).toMatchObject({refund:3,price:3,gold:264,scoreDelta:'-28656'});
  expect(w.report.swaps.filter(r=>r.sold==='c08').every(r=>r.scoreDelta==='0')).toBe(true);
  // Equal score on this five-card hand does not replace c08's four-card access.
  expect(stableHash(w.shop)).toBe(before);
 });
 it('the real 3-gold voice paper improves the frozen held-card hand with a paid, saved edit',()=>{
  const w=naturalWindow();expect(w.report.voicePaper).toMatchObject({price:3,gold:261,score:'72648',scoreDelta:'8173'});
  expect(w.report.voicePaper.targets).toEqual(['spades-12','diamonds-12']);
  expect(w.voiceUsed.consumables).toHaveLength(0);
  expect(readCheckpoint(makeCheckpoint(w.voiceUsed,[])).ok).toBe(true);
  expect(w.voiceUsed.routeGrowth).toEqual(w.shop.routeGrowth);
 });
 it('C10 preview, entry and restoration lock the same target after the paid edit',()=>{
  const w=naturalWindow(),target=getR2Stage(27,'endless',0,w.voiceUsed)!.targetHeat;
  const entered=send(send(w.voiceUsed,{type:'LeaveShop'}),{type:'EnterStage'});
  expect(entered.stage!.initialTargetHeat).toBe(target);expect(entered.stage!.targetHeat).toBe(target);
  const cp=makeCheckpoint(entered,[]);expect(readCheckpoint(JSON.parse(JSON.stringify(cp)))).toEqual({ok:true,checkpoint:cp});
 });
 it.each([
  ['group',[9,9,9,10,10],'full-house','mantangcai'],
  ['straight',[8,9,10,11,12],'straight','c04'],
  ['flush',[3,5,7,9,11],'flush','c06'],
 ] as const)('%s controlled weak/grown/paid-level slices leave the route factor capped',(_route,ranks,type,id)=>{
  const hand=activeCards([...ranks],0,type==='flush'),counts={clears:27,G:27,S:27,F:27};
  const weak=activeScoreInput(hand,[],{boundedClear:true,routeGrowth:counts,handLevels:{[type]:1}});
  const growth=id==='c04'?{heat:{n:'100',d:'1'}}:id==='c06'?{multiplier:{n:'6',d:'1'}}:{};
  const built={...weak,jokers:[activeJoker(id,growth)],handLevels:{[type]:15}};
  const upgraded={...built,handLevels:{[type]:16}};
  const [a,b,c]=[weak,built,upgraded].map(scoreR2Hand);
  expect(a.handType).toBe(type);expect(BigInt(b.finalScore)).toBeGreaterThan(BigInt(a.finalScore));expect(BigInt(c.finalScore)).toBeGreaterThan(BigInt(b.finalScore));
  for(const t of [a,b,c])expect(t.events.filter(e=>e.operation==='route-factor').map(e=>e.value)).toEqual([{n:'4',d:'1'}]);
 });
});
