import {describe,it,expect} from 'vitest';
import {failureGuidance,failureShopOptions} from '../src/game/FailureSummary';
import {failureRetryFixture} from '../harness/fixtures/failure-retry';
import {R2_BASIC_CHOICE_VERSION,R2_BASIC_CHOICE_HASH,R2_CORE_BUILD_CONTRACT} from '../src/domain/r2GroupUpgrade';
import {r2PracticeBasePrice} from '../src/domain/r2Practice';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';

describe('failure guidance reads real saved terminal facts',()=>{
 it.each([['hands','hands-exhausted'],['cards','no-legal-cards'],['abandoned','abandoned']] as const)('%s is distinct and viewing changes no checkpoint', (kind,reason)=>{
  const {after}=failureRetryFixture(kind),before=makeCheckpoint(after,[]);expect(readCheckpoint(before).ok).toBe(true);expect(after.phase).toBe('run-lost');expect(after.outcome!.reason).toBe(reason);
  const facts=failureGuidance(after)!;expect(facts.advice.length).toBeGreaterThanOrEqual(2);expect(facts.advice.length).toBeLessThanOrEqual(3);
  expect(makeCheckpoint(after,[])).toEqual(before);expect(facts.restart).toContain('金币、构筑、工具与成长不继承');expect(facts.restart).toContain('不保证');
  if(kind==='abandoned'){expect(facts.advice[0].body).toContain('主动结束');expect(facts.canReview).toBe(false);expect(facts.advice.some(a=>a.title.includes('升级'))).toBe(false);}
  if(kind==='cards'){expect(after.stage!.handsLeft).toBeGreaterThan(0);expect(facts.reason).toBe('已无可出牌');expect(facts.advice[0].body).not.toContain('已用完');}
 });
 it('uses the exact saved gap and last hand, never replaying or recommending a guaranteed win',()=>{
  const {after}=failureRetryFixture('hands'),facts=failureGuidance(after)!;
  expect(facts.gap).toContain(String(BigInt(after.stage!.targetHeat)-BigInt(after.stage!.heat)));
  expect(facts.canReview).toBe(true);expect(facts.advice[0].body).toContain('保存热度');expect(facts.advice[0].body).toContain('例如');
  expect(facts.advice.map(a=>a.body).join()).not.toMatch(/一定能|保证过关|继承余额|你浪费了/);
 });
 it('only offers boss responses when this saved last hand records an actual restriction',()=>{
  const {after}=failureRetryFixture('boss'),facts=failureGuidance(after)!;
  expect(facts.advice.some(a=>a.title==='按压轴实际影响换招')).toBe(true);expect(facts.advice.map(a=>a.body).join()).toContain('普通点数归零');
  after.lastTrace=null;const missing=failureGuidance(after)!;expect(missing.canReview).toBe(false);expect(missing.lastHand).toBe('最后一手记录不可用');expect(missing.advice.some(a=>a.title.includes('压轴'))).toBe(false);
  expect(missing.advice[0].body).toContain('不推断');
 });
 it('rejects stale last-hand attribution even when a boss exists',()=>{
  const {after}=failureRetryFixture('boss');after.stage!.previousHandScore='9999';expect(failureGuidance(after)!.canReview).toBe(false);expect(failureGuidance(after)!.advice.some(a=>a.title.includes('压轴'))).toBe(false);
 });
 it('reads current eligibility and base prices, leaving actual payment to the next shop; old identities get no new service',()=>{
  const {after}=failureRetryFixture('hands');const text=failureShopOptions(after);
  expect(text).toContain(`未${R2_CORE_BUILD_CONTRACT.practice.maximumLevel}级`);expect(text).toContain(`Lv.1原价${r2PracticeBasePrice(1)}金`);expect(text).toContain('基础改牌原价2金、染色原价4金');expect(text).toContain('共用每店一次');expect(text).toContain('实付');expect(text).toContain('留钱');
  const old={...after,contentVersion:R2_BASIC_CHOICE_VERSION,contentHash:R2_BASIC_CHOICE_HASH};expect(failureShopOptions(old)).not.toMatch(/升级只选|染色原价/);
 });
 it('never installs failure advice on a live or successful run and tolerates missing stage history',()=>{
  const {before,after}=failureRetryFixture('hands');expect(failureGuidance(before)).toBeUndefined();expect(failureGuidance({...after,phase:'run-won'})).toBeUndefined();
  after.stage=null;after.lastTrace=null;expect(failureGuidance(after)!.gap).toContain('记录不可用');expect(failureGuidance(after)!.canReview).toBe(false);
 });
});
