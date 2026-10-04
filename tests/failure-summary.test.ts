import {describe,it,expect} from 'vitest';
import type {R2RunState} from '../src/domain/r2Run';
import type {ScoreTrace} from '../src/domain/scoreR2';
import {failureSummary} from '../src/game/FailureSummary';
const trace={finalScore:'23',handType:'high-card',accumulator:{H:{n:'23',d:'1'},M:{n:'1',d:'1'}}} as ScoreTrace;
const state=(reason:'hands-exhausted'|'no-legal-cards'|'abandoned')=>({outcome:{reason,stageIndex:0},stage:{heat:'95',targetHeat:'400',handsLeft:0,discardsLeft:3,playIndex:6,previousHandScore:'23'},lastTrace:trace}) as Pick<R2RunState,'stage'|'outcome'|'lastTrace'>;
describe('failure screen uses already committed facts',()=>{
 it.each([['hands-exhausted','出牌次数已用完'],['no-legal-cards','已无可出牌'],['abandoned','已结束本局']] as const)('%s has its actual public reason', (reason,text)=>{
  const run=state(reason),before=structuredClone(run);expect(failureSummary(run)).toEqual({reason:text,lastHand:'最后一手：高牌 · 23 热度',resources:'剩余出牌 0 次 · 弃牌 3 次'});expect(run).toEqual(before);
 });
 it('keeps real unused resources when no legal cards remain, without claiming hands were exhausted',()=>{
  const run=state('no-legal-cards');run.stage!.handsLeft=2;run.stage!.discardsLeft=1;expect(failureSummary(run).resources).toBe('剩余出牌 2 次 · 弃牌 1 次');expect(failureSummary(run).reason).not.toMatch(/次数已用完/);
 });
 it('does not attribute a stale prior hand to this stage',()=>{
  const run=state('hands-exhausted');run.stage!.previousHandScore='24';expect(failureSummary(run).lastHand).toBe('最后一手记录不可用');run.stage!.playIndex=0;expect(failureSummary(run).lastHand).toBe('最后一手记录不可用');
 });
 it('supports missing history and arbitrary precision committed scores without calculating a new hand',()=>{
  const run=state('hands-exhausted');run.lastTrace=null;expect(failureSummary(run).lastHand).toBe('最后一手记录不可用');run.stage=null;expect(failureSummary(run).resources).toBe('本场资源记录不可用');
  const big=state('hands-exhausted');big.stage!.heat='900719925474099299999';big.stage!.previousHandScore='900719925474099299998';big.lastTrace={...trace,finalScore:big.stage!.previousHandScore};expect(failureSummary(big).lastHand).toBe('最后一手：高牌 · 9.00e20 热度');
 });
});
