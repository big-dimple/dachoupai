import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {makeReport,route,passive,score,budget,interval,lockChallenge,cashOpportunity,frac,target,warmFraction,trialTarget} from '../analysis/endless-shadow/model.mjs';
import {Rational} from '../src/domain/rational';
import {r2RouteFactor,r2RouteFamilies} from '../src/domain/r2RouteGrowth';
import {r2StageSpec} from '../src/domain/r2Chapter';
import {scoreR2Hand} from '../src/domain/scoreR2';
import {r2CreateJoker} from '../src/domain/r2Run';
import {R2_ROUTE_GROWTH_JOKERS} from '../src/content/r2RouteGrowthJokers';
import {R2_ACTIVE_MULT_VERSION,R2_ACTIVE_MULT_HASH} from '../src/domain/r2GroupUpgrade';
import {SeededRng} from '../src/core/SeededRng';

const inputs=JSON.parse(readFileSync(new URL('../analysis/endless-shadow/inputs.json',import.meta.url),'utf8'));
const report=JSON.parse(readFileSync(new URL('../analysis/endless-shadow/report.json',import.meta.url),'utf8'));
const identity={contentVersion:R2_ACTIVE_MULT_VERSION,contentHash:R2_ACTIVE_MULT_HASH};
function recipeInput(state,count,extra={}){
 const hand=state.ranks.map((rank,i)=>({id:'ready/'+i,rank,suit:state.sameSuit?'hearts':['hearts','spades','clubs','diamonds'][i%4],...(i<state.papers?{enhancement:'multiplier-paper'}:{})}));
 const jokers=state.jokers.map(d=>{const j=r2CreateJoker(d.id,'j/'+d.id,8,d.edition,identity);return {...j,growth:{...j.growth,...d.growth}};});
 return {rulesVersion:'r2',runId:'shadow',rootId:'shadow/hand',characterId:'neutral',hand,selectedIds:hand.map(c=>c.id),disabledIds:[],
  jokers,definitions:R2_ROUTE_GROWTH_JOKERS,handLevels:{[state.type]:state.level},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,
  rng:new SeededRng('shadow-fixed').snapshot(),amoScoreTiming:'assist-v1',gold:60,
  routeGrowth:{clears:count,G:state.families.includes('G')?count:0,S:state.families.includes('S')?count:0,F:state.families.includes('F')?count:0},...extra};
}
describe('endless shadow fixed states — no gameplay acceptance',()=>{
 it('pins the actual current identity and exactly reproduces every report byte through standalone CLI',()=>{
  expect(identity).toEqual(inputs.identity);
  expect(makeReport(inputs)).toEqual(report);
  const output=execFileSync(process.execPath,['analysis/endless-shadow/run.mjs','--check'],{encoding:'utf8'});
  expect(output).toContain('EXACT_SHADOW_REPORT_PASS '+inputs.baseSha);
 },30000);
 it('cross-checks independent route rational and G pair qualification at grace/caps',()=>{
  expect(r2RouteFamilies('pair')).toEqual(['G']);
  for(const f of ['G','S','F'])for(const n of [0,3,4,8,21,36,86,96,109,150]){
   expect(Rational.fromJSON(route(f,n)).compare(r2RouteFactor(f,n))).toBe(0);
  }
 });
 it.each(inputs.states)('current scorer matches raw components, family set and all frozen stages: $id',state=>{
  for(const chapter of inputs.chapters)for(const stage of inputs.stages){
   const count=(chapter-1)*3+stage,t=scoreR2Hand(recipeInput(state,count));
   expect(t.finalScore).toBe(String(score(state,count)));
   const without=scoreR2Hand(recipeInput(state,0));
   expect(without.accumulator.H).toEqual(frac(state.H));
   expect(without.accumulator.M).toEqual(state.M);
   expect(r2RouteFamilies(t.handType)).toEqual(state.families);
  }
 });
 it('current D0 target and fixed grade lock keep single final ceiling for all used phases',()=>{
  for(const c of inputs.chapters)for(const s of inputs.stages){
   const row=report.curveChecks.find(r=>r.chapter===c&&r.stage===s&&r.growth.n==='12'&&r.growth.d==='5');
   expect(row.target).toBe(r2StageSpec((c-1)*3+s,'endless',0).targetHeat);
  }
  expect(lockChallenge({chapter:13,stage:2,baseWarm:warmFraction(13),grade:1}).target).toBe('25480397');
  expect(target(8,0,frac(61,10),160000n,4096n)).toBe(655360000n);
  const lock=lockChallenge({chapter:13,stage:2,baseWarm:'2034',grade:48});
  expect(lock.target).toBe('195264');expect(Object.isFrozen(lock)).toBe(true);
  expect(JSON.parse(JSON.stringify(lock))).toEqual(lock);
  for(const forbidden of ['score','inventory','samples','peak'])expect(()=>lockChallenge({chapter:13,stage:0,baseWarm:'2034',grade:4,[forbidden]:0})).toThrow();
  expect(()=>lockChallenge({chapter:13,stage:0,baseWarm:'1',grade:4097})).toThrow();
  expect(()=>lockChallenge({chapter:13,stage:0,baseWarm:'1',grade:0})).toThrow();
 });
 it('proves only the stated shared separation interval, including the no-passive counterexample',()=>{
  const find=p=>report.windows.find(w=>w.chapter===13&&w.stage===0&&w.policy===p);
  expect(find('legacy').ordinary.strict).toEqual({lower:'7912726393963',upper:'108675740',feasible:false});
  expect(find('none').ordinary.strict).toEqual({lower:'33983',upper:'18200',feasible:false});
  expect(find('cap-max-4').ordinary.strict.feasible).toBe(false);
  expect(find('legacy').ordinary.basic.feasible).toBe(true);
  expect(find('cap-max-4').ordinary.basic.feasible).toBe(false);
  expect(report.jointWitness.feasible).toBe(true);
  expect(report.chapterGrades.find(r=>r.chapter===13&&r.policy==='legacy').feasibleGradesOnExistingD0Floor).toEqual([]);
 });
 it('shared exogenous challenge allows mature first-hand overshoot and keeps current scores',()=>{
  const row=report.challengeCandidates.find(r=>r.chapter===13&&r.growth.n==='61');
  expect(row.integerGradeInterval.feasible).toBe(false);
  const witness=row.presets.find(r=>r.grade===4096);
  expect(witness.matureBudgetAll).toBe(true);expect(witness.matureBossPressure).toBe(false);
  expect(witness.firstHandClear).toContainEqual({state:'mature-SF',stage:0});
  expect(report.rows.find(r=>r.chapter===13&&r.stage===0&&r.id==='mature-SF'&&r.policy==='legacy').stableFirst).toBe('7912726393962');
 });
 it('a capped max is bounded once per hand; acquired multiplier and raw card engine stay external',()=>{
  expect(passive(['G','F'],150,'cap-max',4)).toEqual(frac(4));
  expect(passive(['G','F'],150,'cap-product',4)).toEqual(frac(16));
  const s=inputs.states[4];
  expect(score(s,36,'cap-max',4,s.M,frac(4))).toBe(score(s,36,'cap-max',4)*4n);
  expect(passive(['G','F'],36,'linear-max')).toEqual(frac(251,20)); // G=12.55,F=10.9
 });
 it('declared supply uses disjoint cards, burns at most once, rescue costs one real allowance',()=>{
  const state=inputs.states[4];
  const b=budget(state,36,{policy:'cap-max',burn:true,gold:30,targetHeat:'195264'});
  expect(b.capacity).toBe('951496');
  expect(b.witness.filter(x=>x.action.startsWith('burn-'))).toHaveLength(1);
  expect(new Set(b.witness.flatMap(x=>x.cards)).size).toBe(b.witness.flatMap(x=>x.cards).length);
  expect(b.frontier.map(x=>[x.hands,x.goldSpent])).toEqual([[1,10],[2,0]]);
  expect(budget(state,36,{policy:'cap-max',rescue:true,discards:0}).capacity).toBe('543712');
  expect(budget(state,36,{policy:'cap-max',rescue:true,discards:1}).frontier).toEqual([]);
 });
 it('f06 fourth hand remains doubled, destroys after it, then next hand reads no x2',()=>{
  const state=inputs.states[4];let i=recipeInput(state,36);
  let owned=[...i.jokers,r2CreateJoker('f06','f06',8,undefined,identity)];
  const scores=[];
  for(let turn=0;turn<5;turn++){const t=scoreR2Hand({...i,jokers:owned});scores.push(t.finalScore);owned=t.jokers;}
  expect(scores.slice(0,4)).toEqual(Array(4).fill(scores[0]));
  expect(scores[4]).toBe(String(score(state,36)));
  expect(budget(state,36,{policy:'cap-max',finiteRemaining:1}).capacity).toBe('679640');
  expect(budget(state,36,{policy:'cap-max',finiteRemaining:4}).capacity).toBe('1087424');
 });
 it('glass/poly is a single original card, after-score loss, with an explicit safe next supply',()=>{
  const state=inputs.states[4],i=recipeInput(state,36);
  i.hand.at(-1).enhancement='glass-paper';i.hand.at(-1).edition='polychrome';
  const t=scoreR2Hand(i);
  expect(t.finalScore).toBe(String(score(state,36,'legacy',4,frac(51))));
  expect(t.events.filter(e=>e.operation==='glass-check')).toHaveLength(1);
  expect(t.events.findIndex(e=>e.operation==='glass-check')).toBeGreaterThan(t.events.findIndex(e=>e.operation==='final-score'));
  expect(report.glassLossStress.nextStageSafeCapacity).toBe('543712');
  expect(report.glassLossStress.nextStagePossibleGlassCapacity).toBe('674412');
 });
 it('public user pair chain is exact and gives no hero or package event',()=>{
  const base=recipeInput(inputs.states[0],35);
  const hand=[{id:'6h',rank:6,suit:'hearts',enhancement:'multiplier-paper'},{id:'6s',rank:6,suit:'spades',enhancement:'multiplier-paper'}];
  const j=(id,growth={})=>{const v=r2CreateJoker(id,id,8,undefined,identity);return {...v,growth:{...v.growth,...growth}};};
  const owned=[j('b06'),j('jiedongfeng'),j('e11',{coefficient:frac(2)}),j('a06'),j('f09')];
  const packet={...base,characterId:'amo',hand,selectedIds:hand.map(c=>c.id),gold:206,handLevels:{pair:1},jokers:owned};
  const t=scoreR2Hand(packet);
  expect(t.finalScore).toBe('26221278');
  expect(t.accumulator.H).toEqual(frac(59));
  expect(t.events.filter(e=>e.operation==='retrigger-card')).toHaveLength(2);
  expect(t.events.filter(e=>e.operation==='add-multiplier'&&e.sourceType==='card')).toHaveLength(4);
  expect(t.events.filter(e=>e.sourceType==='character'&&e.operation==='multiply-multiplier')).toHaveLength(0);
  expect(t.events.filter(e=>e.sourceDefinitionId==='e08')).toHaveLength(0);
  expect(route('G',35)).toEqual(inputs.userReports[1].exactTrace.factor);
  const noRoute=scoreR2Hand({...packet,routeGrowth:{clears:35,G:0,S:0,F:0}});
  expect(noRoute.finalScore).toBe('1770');
  expect(report.reports[1].verifiedArithmeticChain).toBe(true);
 });
 it('bounded main trial is a concrete table and preserves explicit hand-making/hero gains',()=>{
  expect(inputs.recommendedTrial.passive.cap).toBe(4);
  expect(trialTarget(inputs,13,2)).toBe(65951n);
  expect(trialTarget(inputs,13,2,3)).toBe(197852n);
  const base=recipeInput(inputs.states[0],35);
  const hand=[{id:'6h',rank:6,suit:'hearts',enhancement:'multiplier-paper'},{id:'6s',rank:6,suit:'spades',enhancement:'multiplier-paper'},
   {id:'6c',rank:6,suit:'clubs'},{id:'4h',rank:4,suit:'hearts'},{id:'4s',rank:4,suit:'spades'},{id:'4c',rank:4,suit:'clubs'}];
  const j=(id,growth={})=>{const v=r2CreateJoker(id,id,8,undefined,identity);return {...v,growth:{...v.growth,...growth}};};
  const packet={...base,characterId:'amo',hand,selectedIds:hand.slice(0,3).map(c=>c.id),gold:206,handLevels:{'three-kind':1},
   routeGrowth:{clears:35,G:0,S:0,F:0},
   jokers:[j('b06'),j('jiedongfeng'),j('e11',{coefficient:frac(2)}),j('a06'),j('f09')]};
  const plain=scoreR2Hand(packet),assist=scoreR2Hand({...packet,assistIds:hand.slice(3).map(c=>c.id)});
  expect(plain.accumulator.H).toEqual(frac(126));expect(plain.accumulator.M).toEqual(frac(99,2));
  expect(plain.finalScore).toBe('6237');expect(assist.finalScore).toBe('24948');
  expect(report.recommendedTrial.sourceContrast).toMatchObject({pairCompressed:'7080',tripleNoAssist:'24948',tripleAndOneAssist:'99792',oneAssistThenPlain:'124740'});
  expect(BigInt(report.recommendedTrial.sourceContrast.oneAssistThenPlain)).toBeGreaterThan(trialTarget(inputs,13,2));
  expect(report.recommendedTrial.trainingRepair.every(r=>r.feasible)).toBe(true);
 });
 it('root trace transcription is exact without pretending to import its save',()=>{
  const hand=[{id:'2h',rank:2,suit:'hearts'},{id:'2s',rank:2,suit:'spades'}];
  const j=(id,growth={},edition)=>{const v=r2CreateJoker(id,id,8,edition,identity);return {...v,growth:{...v.growth,...growth}};};
  const t=scoreR2Hand({...recipeInput(inputs.states[0],8),characterId:'amo',hand,selectedIds:hand.map(c=>c.id),gold:32,handLevels:{pair:1},
   jokers:[j('mantangcai'),j('b07',{},'holographic'),j('f09',{},'foil'),j('e11',{coefficient:frac(7,5)}),j('e08')]});
  expect(t.accumulator.H).toEqual(frac(184));
  expect(t.accumulator.M).toEqual(frac(2711943423n,40000000n));
  expect(t.finalScore).toBe('12474');
  expect(report.rootTrace.withoutRoute).toBe('2782');
  expect(report.rootTrace.nextHandSameInputs).toBe('16841');
 });
 it('two purchased upgrades are not automatically paid back after crossing package threshold',()=>{
  for(const state of inputs.states.filter(r=>r.class==='ordinary')){
    const before=recipeInput(state,36),pack=r2CreateJoker('e08','pack',8,undefined,identity);
    const a=scoreR2Hand({...before,gold:27,jokers:[...before.jokers,pack]});
    const b=scoreR2Hand({...before,gold:19,jokers:[...before.jokers,pack],handLevels:{[state.type]:state.level+2}});
    expect(BigInt(b.finalScore)).toBeLessThan(BigInt(a.finalScore));
  }
 });
 it('cash boundary accounts for interest, actual refund and capped capital',()=>{
  expect(cashOpportunity(27,8).nextClearCashGap).toBe(10);
  expect(cashOpportunity(28,8).nextClearCashGap).toBe(9);
  expect(cashOpportunity(206,8).nextClearCashGap).toBe(8);
  expect(cashOpportunity(27,8).otherSourceGainNeeded).toEqual(frac(693,345));
  expect(cashOpportunity(27,8,{refund:4}).after).toBe(23);
  expect(cashOpportunity(49,30,{xiemu:true}).nextClearCashGap).toBe(32);
  expect(cashOpportunity(50,30,{xiemu:true}).nextClearCashGap).toBe(31);
  expect(cashOpportunity(60,30,{xiemu:true}).nextClearCashGap).toBe(30);
 });
});
