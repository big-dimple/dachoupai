import {expect,it} from 'vitest';
import {finaleKeepsake} from '../src/game/FinaleKeepsake';
import {finaleReady} from '../harness/fixtures/finale';
import {heroClimaxFixture,energySend} from '../harness/fixtures/hero-climax';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {heatText} from '../src/game/scoreText';

it('a saved true final command exposes current holdings without inventing spend or replaying rewards',()=>{
 const ready=finaleReady();expect(finaleKeepsake(ready)).toBeUndefined();
 const won=energySend(ready,{type:'PlayHand',selectedIds:ready.handOrder.slice(0,5)});expect(won.phase).toBe('run-won');
 const read=readCheckpoint(makeCheckpoint(won,[]));expect(read.ok).toBe(true);if(!read.ok)throw Error(read.code);
 const state=read.checkpoint.state,before=JSON.stringify(state),facts=finaleKeepsake(state)!;
 expect(facts.summary).toContain(heatText(state.totalHeat));expect(facts.summary).toContain(`余额 ${state.gold} 金`);expect(facts.summary).toContain('牌组 20 张 · 增强 20 张');
 expect(facts.continuation).toContain('继续无尽会保留');expect(facts.summary).not.toContain('消费');
 expect(JSON.stringify(state)).toBe(before);
 const endless=energySend(state,{type:'ContinueEndless'});expect(finaleKeepsake(endless)).toBeUndefined();expect(endless.gold).toBe(state.gold);
});
it('a committed failure keeps its exact ledger and makes the reset contract explicit',()=>{
 const f=heroClimaxFixture('failure'),state=energySend(f.state,{type:'PlayHand',selectedIds:f.selectedIds});expect(state.phase).toBe('run-lost');
 const before=JSON.stringify(state),facts=finaleKeepsake(state)!;expect(facts.continuation).toContain('不继承这份构筑');expect(facts.continuation).not.toContain('继续无尽');
 expect(facts.cards.map(c=>c.title)).toHaveLength(state.jokers.length);expect(JSON.stringify(state)).toBe(before);
});
