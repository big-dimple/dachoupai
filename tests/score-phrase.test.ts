import {it,expect} from 'vitest';
import {scorePhrase} from '../src/game/ScorePhrase';
import {OWNED_SCORE_SPRING} from '../src/game/inkwaveSpring';
import {ownedJokerMotionDuration} from '../src/game/OwnedJokerScoreMotion';
import {remainingScoreEvents} from '../src/game/OpponentFacts';
import {isNeutralScoreReceipt} from '../src/game/ScoreTableMotion';
import {scoreSourceProcessFixture} from '../harness/fixtures/score-source-process';
import {energySend} from '../harness/fixtures/score-energy';
import {actualMultiplier} from '../src/domain/openingShow';
const fixture=scoreSourceProcessFixture('chain'),trace=energySend(fixture.state,{type:'PlayHand',selectedIds:fixture.selectedIds}).lastTrace!;
const events=remainingScoreEvents(trace).filter(e=>!isNeutralScoreReceipt(e));
it('composes the committed order without mutating it; key accent must be a real largest multiplier',()=>{
 const saved=JSON.stringify(trace),plan=scorePhrase(events,'400');expect([...plan.keys()]).toEqual(events.map(e=>e.eventId));
 const accents=[...plan].filter(([,b])=>b.phrase!.role==='accent');expect(accents).toHaveLength(1);
 const event=events.find(e=>e.eventId===accents[0][0])!,factor=actualMultiplier(event)!;expect(factor).toBeDefined();
 for(const e of events){const f=actualMultiplier(e);if(f)expect(factor.compare(f)).toBeGreaterThanOrEqual(0);}
 expect(JSON.stringify(trace)).toBe(saved);
});
it('preserves increasing density and alternating weights instead of overwriting with numeric constants',()=>{
 const plan=scorePhrase(events,'400'),runs=[...plan.values()].filter(b=>b.phrase!.role==='run');
 expect(runs.length).toBeGreaterThan(5);expect(runs.at(-1)!.windup+runs.at(-1)!.flight).toBeLessThan(runs[0].windup+runs[0].flight);
 expect(new Set(runs.map(b=>b.phrase!.accentWeight)).size).toBeGreaterThan(3);expect(runs.some(b=>!b.phrase!.paired)).toBe(true);
 for(const beat of runs)expect(ownedJokerMotionDuration('multiply',beat,4)).toBe(beat.impact);
 const accent=[...plan.values()].find(b=>b.phrase!.role==='accent')!;expect(accent.windup).toBeGreaterThan(runs[0].windup);expect(accent.phrase!.accentWeight).toBe(1);
});
it('4x compresses single strikes while keeping selected spring second landings distinct',()=>{
 const plan=scorePhrase(events,'400',4);for(const b of plan.values())if(b.phrase!.paired)expect(b.impact/4*OWNED_SCORE_SPRING.reboundAt).toBeGreaterThanOrEqual(50);
 for(const e of events.filter(e=>e.sourceType==='joker')){const b=plan.get(e.eventId)!;if(b.phrase!.role==='run'&&!b.phrase!.paired)expect(b.impact/4).toBeGreaterThanOrEqual(96);}
 expect([...plan.values()].filter(b=>b.phrase!.paired).length).toBeLessThan([...plan.values()].filter(b=>['opening','run','accent'].includes(b.phrase!.role)).length);
 const normal=scorePhrase(events,'400');expect([...plan.values()].at(-1)!.phrase!.end/4).toBeLessThan([...normal.values()].at(-1)!.phrase!.end*.55);
 const final=[...plan.values()].find(b=>b.phrase!.role==='settle')!;expect(final.windup).toBe(120);expect(final.impact).toBe(430);
 for(const b of [...plan.values()].filter(b=>b.phrase!.role==='receipt')){expect(b.phrase!.paired).toBe(false);expect(b.phrase!.accentWeight).toBeLessThan(.3);}
});
