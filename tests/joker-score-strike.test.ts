import {it,expect} from 'vitest';
import {jokerScoreStrikeCue,jokerStrikeBeat,strikeFlightPoint,strikeReturnFraction,prepareJokerScoreStrike,STRIKE_RETURN_LANDING} from '../src/game/JokerScoreStrike';
import {scoreSourceProcessFixture} from '../harness/fixtures/score-source-process';
import {energySend} from '../harness/fixtures/score-energy';
import {scoreBeat} from '../src/game/scorePresentation';
const fixture=scoreSourceProcessFixture('chain'),trace=energySend(fixture.state,{type:'PlayHand',selectedIds:fixture.selectedIds}).lastTrace!;
it('an already cancelled generation allocates no visual or texture',()=>{const abort=new AbortController();abort.abort();expect(prepareJokerScoreStrike({} as any,{} as any,{} as any,{} as any,{context:{generation:1,signal:abort.signal}} as any)).toBeUndefined();});
it('only exact saved positive joker contributions attack their actual H/M, never total or resource receipts',()=>{
 const saved=JSON.stringify(trace),cues=trace.events.map(e=>jokerScoreStrikeCue(trace,e)).filter(Boolean);expect(cues.some(c=>c!.contributions.some(x=>x.target==='H'))).toBe(true);expect(cues.some(c=>c!.contributions.some(x=>x.target==='M'&&x.kind==='multiply'))).toBe(true);
 for(const cue of cues)expect(cue!.contributions.every(c=>['H','M'].includes(c.target))).toBe(true);
 const event=trace.events.find(e=>jokerScoreStrikeCue(trace,e))!;expect(jokerScoreStrikeCue(trace,{...event,after:event.before})).toBeUndefined();expect(jokerScoreStrikeCue(trace,{...event,eventId:'forged'})).toBeUndefined();expect(JSON.stringify(trace)).toBe(saved);
});
it('flight projection advances source to destination, not backwards, for all source quadrants',()=>{
 for(const from of [{x:100,y:30},{x:800,y:30},{x:90,y:600}]){const to={x:420,y:300},dx=to.x-from.x,dy=to.y-from.y,length=dx*dx+dy*dy;let last=-1;
  expect(strikeFlightPoint(from,to,0)).toEqual(from);expect(strikeFlightPoint(from,to,1).x).toBeCloseTo(to.x);expect(strikeFlightPoint(from,to,1).y).toBeCloseTo(to.y);
  for(let i=0;i<=100;i++){const p=strikeFlightPoint(from,to,i/100),projection=((p.x-from.x)*dx+(p.y-from.y)*dy)/length;expect(projection).toBeGreaterThanOrEqual(last-1e-9);last=projection;}
 }
});
it('impact holds and spring returns share one beat, including distinguishable double impacts at 4x',()=>{
 const event=trace.events.find(e=>jokerScoreStrikeCue(trace,e))!,base={...scoreBeat(event),phrase:{role:'accent' as const,pulse:3,paired:true,accentWeight:1,start:0,arrival:0,end:0}};
 for(const speed of [1,2,4]){const beat=jokerStrikeBeat(base,true,speed);expect(beat.strike!.hold/speed).toBeGreaterThanOrEqual(35);expect(beat.flight/speed).toBeGreaterThanOrEqual(60);expect((beat.strike!.hold+beat.strike!.recovery*STRIKE_RETURN_LANDING)/speed).toBeGreaterThanOrEqual(50);expect(beat.impact).toBe(beat.strike!.hold+beat.strike!.recovery);}
 const plain=jokerStrikeBeat({...base,phrase:{...base.phrase,role:'run'}},false);expect(jokerStrikeBeat(base,true).windup).toBeGreaterThan(plain.windup);
 for(let i=Math.ceil(STRIKE_RETURN_LANDING*100);i<=100;i++)expect(Math.abs(strikeReturnFraction(i/100,900)*900)).toBeLessThanOrEqual(8);expect(strikeReturnFraction(1,900)).toBe(0);
});
