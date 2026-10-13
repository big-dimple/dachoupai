import {R2_BOUNDED_CLEAR_VERSION,R2_BOUNDED_CLEAR_HASH,isR2BoundedClear} from '../src/domain/r2GroupUpgrade';
import {describe,it,expect,vi} from 'vitest';
import * as scorer from '../src/domain/scoreR2';
import {previewR2Hand,type ScoreInput} from '../src/domain/scoreR2';
import {Rational} from '../src/domain/rational';
import {createRun,applyCommand,type R2RunState,type Action} from '../src/domain/run';
import {completeControlledRouteHistory} from './fixtures/route-growth-history';
import {r2ScoreContext,r2RulesetFor,r2CreateJoker} from '../src/domain/r2Run';
import {R2_TOUYE_CORE_VERSION,R2_TOUYE_CORE_HASH,isR2RouteStarter} from '../src/domain/r2GroupUpgrade';
import {R2_RULESETS} from '../src/domain/r2Run';
import {newRunIdentity,launchIdentity} from '../src/game/RunLaunch';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {SavedRun,type SaveSlots,type SaveStore} from '../src/application/SavedRun';
import {heroSignature} from '../src/game/HeroSignature';
import {heroStageContinuity} from '../src/game/HeroStageContinuity';
import {savedBenefit} from '../src/game/JokerExperience';
import {stableHash} from '../src/domain/hash';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {touyeFixture,touyeSend,touyeBet,touyeCommand} from './fixtures/touye-new-core';
import {activeIdentity,routeIdentity,activeCards,activeJoker,activeScoreInput,g14Input,g15Input,g18Input,g17Input,activeSwapFixture,activeRefundFixture,activeRunFixture,arrangeActiveRun} from './fixtures/p1a-active-mult';
const after=(i:ScoreInput)=>scorer.scoreR2Hand({...i,activeMultTiming:'after-route-growth'});
const score=scorer.scoreR2Hand;
const role=(t:ReturnType<typeof score>)=>t.events.find(e=>e.sourceType==='character'&&e.phase==='characterScore')!;
function round(s:R2RunState){const cp=makeCheckpoint(s,[]);expect(readCheckpoint(JSON.parse(JSON.stringify(cp)))).toEqual({ok:true,checkpoint:cp});return s;}
function input(s:R2RunState):ScoreInput{const hand=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!);return {rulesVersion:'r2',runId:s.runId,rootId:s.runId+'/public',hand,selectedIds:s.handOrder,disabledIds:s.stage!.disabledIds,jokers:s.jokers,definitions:r2JokerDefinitionsFor(s),handLevels:s.handLevels,playIndex:s.stage!.playIndex+1,handsBeforePlay:s.stage!.handsLeft,previousHandType:s.stage!.previousHandType,wager:false,rng:s.rng.rule,...r2ScoreContext(s,hand,s.handOrder)};}
function late(t:ReturnType<typeof score>){const index=t.events.indexOf(role(t));expect(index).toBe(t.events.findIndex(e=>e.phase==='finalScore')-1);for(const [i,e] of t.events.entries())if(e.phase==='jokerScore'||e.phase==='routeGrowth')expect(i).toBeLessThan(index);expect(t.events.filter(e=>e.sourceType==='character'&&e.phase==='characterScore')).toHaveLength(1);}
describe('P1A exact active multiplier timing',()=>{
 it('new route-selected games use bounded identity; exact active-timing fixtures retain their explicit identity',()=>{
  for(const h of ['touye','xiemu','azao'] as const)for(const r of ['group','straight','flush'] as const)expect(newRunIdentity(h,r)).toEqual({contentVersion:R2_BOUNDED_CLEAR_VERSION,contentHash:R2_BOUNDED_CLEAR_HASH});
  for(const h of ['amo','erxiang','laohuan'] as const)expect(newRunIdentity(h,'group')).toEqual({contentVersion:R2_BOUNDED_CLEAR_VERSION,contentHash:R2_BOUNDED_CLEAR_HASH});
  for(const p of R2_RULESETS.filter(p=>p.contentVersion!==activeIdentity.contentVersion&&!isR2BoundedClear(p))){
   const identity={contentVersion:p.contentVersion,contentHash:p.contentHash};
   const old=createRun({rulesVersion:'r2',characterId:p.contentVersion.includes('assist')?'amo':'touye',seed:'old-fixed',runId:'old-fixed',r2Identity:identity,...(isR2RouteStarter(identity)?{openingRoute:'group' as const}:{}),modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
   expect(launchIdentity(old.characterId,{kind:'retry',run:round(old)})).toEqual(identity);expect(r2ScoreContext(old,[],[])).not.toHaveProperty('activeMultTiming');
  }
  expect(r2RulesetFor({...activeIdentity,contentHash:'wrong'})).toBeUndefined();
  for(const h of ['amo','erxiang','laohuan'] as const)expect(()=>createRun({rulesVersion:'r2',characterId:h,seed:'deny',runId:'deny',r2Identity:activeIdentity,openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}})).toThrow('invalid-r2-profile');
 });
 it('the new hash changes no initial deck, RNG streams, shelf supply, prices, levels or capacities for the same seed',()=>{
  for(const hero of ['touye','xiemu','azao'] as const){const old=hero==='touye'?{contentVersion:R2_TOUYE_CORE_VERSION,contentHash:R2_TOUYE_CORE_HASH}:routeIdentity,opts={rulesVersion:'r2' as const,characterId:hero,seed:'p1a-supply-frozen',runId:'p1a/supply/'+hero,openingRoute:'flush' as const,modeConfig:{mode:'standard' as const,difficulty:0 as const,challengeId:null,programsEnabled:false}},a=createRun({...opts,r2Identity:old}),b=createRun({...opts,r2Identity:activeIdentity});
   for(const key of ['deckInstances','drawPile','rng','shop','handLevels','gold','jokers','longTermItems','spectralModifiers','boss'] as const)expect(b[key]).toEqual(a[key]);expect(r2JokerDefinitionsFor(b)).toBe(r2JokerDefinitionsFor(a));
  }
 });
 it('reconstructs G14 actual scorer H977 and exact unchanged 310793589, G15 H651 22084433→30435689 and unused7608922',()=>{
  const a=g14Input(),b=g15Input();expect(score(a).finalScore).toBe('310793589');expect(after(a).finalScore).toBe('310793589');expect(after(a).accumulator.H).toEqual({n:'977',d:'1'});late(after(a));
  expect(score(b).finalScore).toBe('22084433');expect(after(b).finalScore).toBe('30435689');expect(after(b).accumulator.H).toEqual({n:'651',d:'1'});late(after(b));
  const hold={...b,gold:184,xiemuBurn:{cost:0 as const,goldBefore:184,beforeUsed:false}};expect(after(hold).finalScore).toBe('7608922');expect(after(hold).events.some(e=>e.sourceType==='character')).toBe(false);
  // Actual reversed slots: hook then that slot edition, all before the late active.
  expect(after(b).events.filter(e=>e.phase==='jokerScore').map(e=>e.sourceDefinitionId)).toEqual(['tiesuanpan','jiedongfeng','e03','c06','f10']);
  const i={...b,activeMultTiming:'after-route-growth' as const};expect(previewR2Hand(i).possibleScores).toEqual([after(b).finalScore]);
 });
 it('reconstructs supplied G18 H457/M17.5 same-hand won and lost, both before final floor',()=>{
  expect(score(g18Input()).finalScore).toBe('1438605');expect(after(g18Input())).toMatchObject({finalScore:'1649132',accumulator:{H:{n:'457',d:'1'}}});
  expect(score(g18Input('straight')).finalScore).toBe('732460');expect(after(g18Input('straight')).finalScore).toBe('700881');late(after(g18Input()));late(after(g18Input('straight')));
  for(const target of ['flush','straight'] as const){const i=g18Input(target,true);expect(after(i).finalScore).toBe(after(g18Input(target)).finalScore);expect(after(i).touyeWager!.outcome).toBe(target==='flush'?'won':'lost');}
  const i=g18Input('flush',true),hold={...i,touyeWager:{commit:null,newCore:true as const}};const t=after(hold);expect(role(t).value).toEqual({n:'23',d:'20'});expect(t.events.indexOf(role(t))).toBeLessThan(t.events.findIndex(e=>e.phase==='jokerScore'));expect(t).toEqual(score(hold));
 });
 it('four-grid actual scorer separates qualification from timing, with same cards/cost/disabled core and unused ordinary',()=>{
  const f=touyeFixture('unformed-disabled',{identity:activeIdentity,jokers:['c06','jiedongfeng']});f.state.jokers.find(j=>j.definitionId==='c06')!.growth.multiplier={n:'6',d:'1'};round(f.state);const s=touyeSend(f.state,touyeBet(f.state,f.discard,f.target)),i={...input(s),selectedIds:f.play};
  const oldCommit=structuredClone(i.touyeWager!.commit!);delete oldCommit.refill;
  const original={...i,activeMultTiming:undefined,touyeWager:{commit:oldCommit}},qual={...i,activeMultTiming:undefined},time={...original,activeMultTiming:'after-route-growth' as const},both=i;
  const traces=[original,qual,time,both].map(score);expect(traces.map(t=>t.touyeWager!.outcome)).toEqual(['won','lost','won','lost']);expect(traces.map(t=>t.finalScore)).toEqual(['940','723','1504','639']);expect(traces[2].sets).toEqual(traces[0].sets);expect(traces[3].sets).toEqual(traces[1].sets);late(traces[2]);late(traces[3]);
  for(const t of traces)expect(t.cards).toEqual(traces[0].cards);
  const unused=score({...both,touyeWager:{commit:null,newCore:true}});expect(unused.finalScore).toBe('780');const unbet=touyeSend(f.state,{type:'DiscardHand',selectedIds:f.discard}),unusedReal=round(touyeSend(unbet,{type:'PlayHand',selectedIds:f.play}));expect(unusedReal.lastTrace!.finalScore).toBe(unused.finalScore);expect(unused.touyeWager!.multiplier).toBe('1.15');expect(unused.events.indexOf(role(unused))).toBeLessThan(unused.events.findIndex(e=>e.phase==='jokerScore'));
  round(touyeSend(s,{type:'PlayHand',selectedIds:f.play}));
 });
 it('same-input business contrasts preserve stars/prices and real sale costs, no natural replacement claim',()=>{
  const original=g17Input(),replacement={...original,jokers:original.jokers.map(j=>j.definitionId==='d11'?activeJoker('f03'):j)};
  expect(after(original).finalScore).toBe('13190112');expect(after(replacement).finalScore).toBe('14614145');expect(after(original).events.some(e=>e.sourceDefinitionId==='d11')).toBe(false);
  const a=activeSwapFixture('d11','f03'),sold=round(touyeSend(round(a.state),a.sell)),bought=round(touyeSend(sold,a.buy));expect(sold.gold-a.state.gold).toBe(4);expect(sold.gold-bought.gold).toBe(4);expect(bought.gold).toBe(a.state.gold);
  const b=activeSwapFixture('e10','d07'),s=round(touyeSend(round(b.state),b.sell)),r=round(touyeSend(s,b.buy));expect(s.gold-b.state.gold).toBe(3);expect(s.gold-r.gold).toBe(4);expect(b.state.gold-r.gold).toBe(1);
  const before=g14Input(),mirror={...before,jokers:before.jokers.map(j=>j.definitionId==='e10'?activeJoker('d07'):j),gold:before.gold!-1,xiemuBurn:{...before.xiemuBurn!,goldBefore:before.xiemuBurn!.goldBefore-1}};
  expect(BigInt(after(mirror).finalScore)).toBeGreaterThan(BigInt(after(before).finalScore));
  // Counterfactual earlier sale must remove three actually-used future upgrades.
  expect(BigInt(after({...mirror,handLevels:{straight:16}}).finalScore)).toBeLessThan(BigInt(after(before).finalScore));
 });
 it('each active has a bounded original-target use-worthy window as well as unused comparisons',()=>{
  for(const [hero,stageIndex] of [['xiemu',12],['azao',4]] as const){const x=activeRunFixture(hero,60,stageIndex),use=round(touyeSend(round(x.state),x.action)),hold=round(touyeSend(x.state,{type:'PlayHand',selectedIds:x.state.handOrder}));expect(use.phase).toBe('stage-cleared');expect(hold.phase).toBe('await-input');expect(use.lastTrace!.finalScore).not.toBe(hold.lastTrace!.finalScore);}
  const f=touyeFixture('mature-win',{identity:activeIdentity}),p=round(touyeSend(f.state,touyeBet(f.state,f.discard,f.target))),used=round(touyeSend(p,{type:'PlayHand',selectedIds:f.play}));
  const ordinary=round(touyeSend(touyeSend(f.state,{type:'DiscardHand',selectedIds:f.discard}),{type:'PlayHand',selectedIds:f.play}));expect(used.phase).toBe('stage-cleared');expect(ordinary.phase).toBe('await-input');expect(used.gold).toBeGreaterThanOrEqual(p.gold); // no extra bet fee; original discard cost same
 });
 it('unused can be reasonable: both clear, holding saves30 gold or active release; no predicted star changes',()=>{
  const x=activeRunFixture('xiemu'),used=round(touyeSend(x.state,x.action)),held=round(touyeSend(x.state,{type:'PlayHand',selectedIds:x.state.handOrder}));expect(used.phase).toBe('stage-cleared');expect(held.phase).toBe('stage-cleared');expect(held.gold-used.gold).toBe(30);
  const a=activeRunFixture('azao'),release=round(touyeSend(a.state,a.action)),hold=round(touyeSend(a.state,{type:'PlayHand',selectedIds:a.state.handOrder}));expect(release.phase).toBe('stage-cleared');expect(hold.phase).toBe('stage-cleared');expect(hold.lastTrace!.azaoCharge!.release).toBe(false);expect(hold.lastTrace!.azaoCharge!.after.charge).toBe(2);expect(hold.stage!.azaoCharge!.charge).toBe(0); // cleared stage resets; no invented carry-over benefit
 });
 it('paid30 crosses real package20, capital30 cap and interest10 thresholds at49/50,59/60,39/40',()=>{
  for(const gold of [39,40,49,50,59,60]){
   const {state,action}=activeRunFixture('xiemu',gold),s=round(state),a=round(touyeSend(s,action)),t=a.lastTrace!;
   expect(t.xiemuBurn!.goldAfter).toBe(gold-30);expect(t.events.some(e=>e.sourceDefinitionId==='e08')).toBe(gold>=50);
   expect(t.events.find(e=>e.sourceDefinitionId==='e03'&&e.operation==='add-heat-per-gold')!.value).toEqual({n:String(Math.min((gold-30)*2,60)),d:'1'});
   expect(t.combo!.goldBeforeRewards).toBe(gold-30);expect(t.events.find(e=>e.sourceDefinitionId==='xiemu'&&e.phase==='onStageClear')!.value.n).toBe(gold===39?'1':'2');late(t);
   expect(s.gold).toBe(gold);expect(s.stage!.xiemuBurnUsed).toBe(false);
  }
 });
 it('all burn/release tiers, zero active-card ordinary heat and huge route factors floor exactly once',()=>{
  for(const [cost,m] of [[10,2],[20,3],[30,4]] as const){const i={...g15Input(),gold:184-cost,xiemuBurn:{cost,goldBefore:184,beforeUsed:false}};const t=after(i);expect(role(t).value).toEqual({n:String(m),d:'1'});late(t);}
  for(const [charge,n,d] of [[1,'3','2'],[2,'5','2'],[3,'4','1']] as const){const i=activeScoreInput(activeCards([2,2,3,3]),[activeJoker('b04',{},'holographic')],{characterId:'azao',azaoCharge:{before:{charge,previousQualifiedType:'two-pair'},release:true}}),t=after(i);expect(role(t).value).toEqual({n,d});expect(t.azaoCharge!.after.charge).toBe(0);late(t);expect(t.finalScore).toBe(Rational.fromJSON(t.accumulator.H).multiply(Rational.fromJSON(t.accumulator.M)).floor().toString());}
  const i=g18Input('flush',true),zero=after({...i,disabledIds:i.selectedIds});expect(zero.touyeWager!.outcome).toBe('lost');expect(zero.sets.activeScoringIds).toEqual([]);late(zero);
  const multi=after({...g14Input(),hand:g14Input().hand.map(c=>({...c,suit:'hearts' as const})),routeGrowth:{clears:Number.MAX_SAFE_INTEGER,G:0,S:Number.MAX_SAFE_INTEGER,F:Number.MAX_SAFE_INTEGER}});expect(multi.events.filter(e=>e.operation==='route-factor')).toHaveLength(2);late(multi);
  const huge=after({...g14Input(),routeGrowth:{clears:Number.MAX_SAFE_INTEGER,G:0,S:Number.MAX_SAFE_INTEGER,F:0}});expect(huge.events.filter(e=>e.phase==='finalScore')).toHaveLength(1);expect(huge.finalScore).toBe(Rational.fromJSON(huge.accumulator.H).multiply(Rational.fromJSON(huge.accumulator.M)).floor().toString());
 });
 it('legal new-core losses consume, real refunded discards keep use, Q01/B08 no active and used burn locks',()=>{
  const f=touyeFixture('mature-old-core',{identity:activeIdentity,jokers:['f09','d05']}),p=round(touyeSend(f.state,touyeBet(f.state,f.discard,f.target))),s=round(touyeSend(p,{type:'PlayHand',selectedIds:f.play}));
  expect(p.stage!.discardsLeft).toBe(f.state.stage!.discardsLeft);expect(p.stage!.discardsUsed).toBe(1);expect(s.stage!.touyeWager!.resolution).toBe('played');expect(s.lastTrace!.touyeWager!.outcome).toBe('lost');expect(s.lastTrace!.events.some(e=>e.sourceDefinitionId==='f09')).toBe(false);late(s.lastTrace!);
  for(const opts of [{boss:{definitionId:'B08' as const,disabledSuit:null}},{challenge:true}]){const f=touyeFixture('mature-win',{identity:activeIdentity,...opts});expect(applyCommand(f.state,touyeCommand(f.state,touyeBet(f.state,f.discard,f.target)))).toMatchObject({ok:false,code:'touye-disabled',state:f.state});}
  const {state,action}=activeRunFixture('xiemu');const used=touyeSend(state,action);expect(applyCommand(used,touyeCommand(used,action)).ok).toBe(false);
  const base=g15Input();expect(()=>after({...base,characterId:'neutral'})).toThrow('xiemu-disabled');expect(()=>after({...base,boss:{definitionId:'B08',disabledSuit:null}})).toThrow('xiemu-disabled');
  const noBurn={...base,xiemuBurn:{cost:0 as const,goldBefore:154,beforeUsed:false},boss:{definitionId:'B08' as const,disabledSuit:null}};expect(after(noBurn).events.some(e=>e.sourceType==='character')).toBe(false);
 });
 it('new-profile B08 blocks burn but keeps once-only capital interest; Q01 stops both',()=>{
  let ready=createRun({rulesVersion:'r2',characterId:'xiemu',seed:'p1a-b08',runId:'p1a/b08',r2Identity:activeIdentity,openingRoute:'flush',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});ready=touyeSend(ready,{type:'LeaveShop'});ready.shop=null;ready.chapter=3;ready.stageIndex=8;ready.seenBossIds=['B01','B02','B08'];ready.boss={definitionId:'B08',disabledSuit:null};ready.gold=40;ready.handLevels.flush=30;completeControlledRouteHistory(ready);
  const s=round(arrangeActiveRun(touyeSend(ready,{type:'EnterStage'}),['hearts-2','hearts-5','hearts-7','hearts-9','hearts-13'])),before=JSON.stringify(s);expect(applyCommand(s,touyeCommand(s,{type:'PlayHand',selectedIds:s.handOrder,xiemuBurn:30}))).toMatchObject({ok:false,code:'xiemu-disabled',state:s});expect(JSON.stringify(s)).toBe(before);
  const a=round(touyeSend(s,{type:'PlayHand',selectedIds:s.handOrder}));expect(a.phase).toBe('stage-cleared');expect(a.lastTrace!.events.filter(e=>e.sourceDefinitionId==='xiemu'&&e.phase==='onStageClear').map(e=>e.value.n)).toEqual(['2']);expect(a.lastTrace!.events.some(e=>e.sourceType==='character'&&e.phase==='characterScore')).toBe(false);
  let q=createRun({rulesVersion:'r2',characterId:'xiemu',seed:'challenge/q01/0',runId:'p1a/q01',r2Identity:activeIdentity,openingRoute:'flush',modeConfig:{mode:'challenge',difficulty:0,challengeId:'Q01',programsEnabled:false}});q=touyeSend(touyeSend(q,{type:'LeaveShop'}),{type:'EnterStage'});q=arrangeActiveRun(q,s.handOrder);q.gold=40;q.handLevels.flush=30;round(q);expect(applyCommand(q,touyeCommand(q,{type:'PlayHand',selectedIds:q.handOrder,xiemuBurn:30}))).toMatchObject({ok:false,code:'xiemu-disabled',state:q});expect(round(touyeSend(q,{type:'PlayHand',selectedIds:q.handOrder})).lastTrace!.events.some(e=>e.sourceType==='character')).toBe(false);
 });
 it('nonlinear refunds and after-hand growth use the new saved final, while RNG and paid-capital predicates remain unchanged',()=>{
  const hand=activeCards([2,2,2,2]),base=activeScoreInput(hand,[activeJoker('c06',{multiplier:{n:'6',d:'1'}}),activeJoker('b12')],{characterId:'xiemu',gold:0,xiemuBurn:{cost:30,goldBefore:30,beforeUsed:false},stageHeatBefore:'0',stageTargetHeat:'13000'});
  const before=score(base),current=after(base);expect(before.finalScore).toBe('11152');expect(current.finalScore).toBe('17056');expect(before.events.some(e=>e.sourceDefinitionId==='b12'&&e.operation==='refund-hand')).toBe(false); // actual refund is an application transaction after scorer
  const oldFixture=activeRefundFixture(routeIdentity),newFixture=activeRefundFixture(),oldRun=round(touyeSend(round(oldFixture.state),oldFixture.action)),newRun=round(touyeSend(round(newFixture.state),newFixture.action));
  expect(oldRun.lastTrace!.finalScore).toBe(before.finalScore);expect(newRun.lastTrace!.finalScore).toBe(current.finalScore);expect(oldRun.phase).toBe('await-input');expect(newRun.phase).toBe('stage-cleared');expect(oldRun.lastTrace!.events.some(e=>e.sourceDefinitionId==='b12'&&e.operation==='refund-hand')).toBe(true);expect(newRun.lastTrace!.events.some(e=>e.sourceDefinitionId==='b12'&&e.operation==='refund-hand')).toBe(false);expect(oldRun.stage!.handsLeft).toBe(oldFixture.state.stage!.handsLeft);
  const growth={...base,jokers:[activeJoker('c06',{multiplier:{n:'6',d:'1'}}),activeJoker('f05',{multiplier:{n:'3',d:'4'}})],previousHandScore:'12000'};
  expect(score(growth).jokers.find(j=>j.definitionId==='f05')!.growth.multiplier).toEqual({n:'0',d:'1'});expect(after(growth).jokers.find(j=>j.definitionId==='f05')!.growth.multiplier).toEqual({n:'1',d:'1'});
  const low={...base,jokers:[activeJoker('c06',{multiplier:{n:'6',d:'1'}}),activeJoker('f11')],stageTargetHeat:'130000'};expect(score(low).jokers.find(j=>j.definitionId==='f11')!.growth.heat.n).toBe('10');expect(after(low).jokers.find(j=>j.definitionId==='f11')!.growth.heat).toBeUndefined();
  const chance={...g15Input(),gold:19,xiemuBurn:{cost:30 as const,goldBefore:49,beforeUsed:false},hand:g15Input().hand.map((c,i)=>i===0?{...c,enhancement:'lucky-paper' as const}:c)};
  const a=score(chance),b=after(chance);expect(b.rng).toEqual(a.rng);expect(b.goldDelta).toBe(a.goldDelta);expect(b.destroyedCardIds).toEqual(a.destroyedCardIds);expect(b.events.some(e=>e.sourceDefinitionId==='e08')).toBe(false);expect(previewR2Hand({...chance,activeMultTiming:'after-route-growth'}).breakdown.events.some(e=>e.sourceDefinitionId==='e08')).toBe(false);
 });
 it('low gold/low type and scorer failure return original cash/eligibility without a refund command',()=>{
  const {state,action}=activeRunFixture('xiemu',29),before=structuredClone(state);expect(applyCommand(state,touyeCommand(state,action))).toMatchObject({ok:false,code:'insufficient-gold',state});expect(state).toEqual(before);
  const f=activeRunFixture('xiemu');expect(applyCommand(f.state,touyeCommand(f.state,{type:'PlayHand',selectedIds:f.state.handOrder.slice(0,1),xiemuBurn:30}))).toMatchObject({ok:false,code:'score-diagnostic'});
  const spy=vi.spyOn(scorer,'scoreR2Hand').mockImplementation(()=>{throw new scorer.ScoreFault('controlled-fault',[]);});try{expect(applyCommand(f.state,touyeCommand(f.state,f.action))).toMatchObject({ok:false,code:'score-diagnostic',diagnostic:{code:'controlled-fault'}});expect(f.state.gold).toBe(60);expect(f.state.stage!.xiemuBurnUsed).toBe(false);}finally{spy.mockRestore();}
 });
 it.each(['xiemu','azao','touye'] as const)('%s save failure retains old publication; retry same candidate bytes, consumption and cold restore once',async hero=>{
  const f=hero==='touye'?touyeFixture('mature-old-core',{identity:activeIdentity}):activeRunFixture(hero);let before=f.state;
  if(hero==='touye'){const t=f as ReturnType<typeof touyeFixture>;before=touyeSend(before,touyeBet(before,t.discard,t.target));}
  round(before);let slots:SaveSlots={revision:1,current:makeCheckpoint(before,[]),previous:null},fail=true;const writes:string[]=[];
  const store:SaveStore={read:async()=>slots,commit:async(rev,cp,previous)=>{writes.push(JSON.stringify(cp));if(fail)throw Error('quota');slots={revision:rev+1,current:cp,previous};return slots.revision;}};
  const saved=SavedRun.restore(store,slots),action:Action=hero==='touye'?{type:'PlayHand',selectedIds:(f as ReturnType<typeof touyeFixture>).play}:(f as ReturnType<typeof activeRunFixture>).action;
  expect((await saved.dispatch(action)).ok).toBe(false);expect(saved.state).toEqual(before);expect(slots.current).toEqual(makeCheckpoint(before,[]));fail=false;expect((await saved.retry()).ok).toBe(true);expect(writes[0]).toBe(writes[1]);expect(SavedRun.restore(store,slots).state).toEqual(saved.state);expect((await saved.retry()).ok).toBe(false);late(saved.state.lastTrace!);
  const cmd=saved.journal.at(-1)!;expect(applyCommand(saved.state,cmd)).toMatchObject({ok:true,duplicate:true,state:saved.state});
 });
 it('three authorized player-copy surfaces explain new-card participation without technical terms or state writes',()=>{
  expect(heroSignature('touye').beats.map(b=>b.result).join(' ')).toContain('用新摸的牌成型');
  const f=touyeFixture('mature-old-core',{identity:activeIdentity}),p=touyeSend(f.state,touyeBet(f.state,f.discard,f.target)),s=round(touyeSend(p,{type:'PlayHand',selectedIds:f.play})),before=JSON.stringify(s),event=role(s.lastTrace!),benefit=savedBenefit(s,s.lastTrace!,event)!;
  expect(benefit.effect).toContain('新摸牌没参与成型×0.85');expect([benefit.effect,benefit.condition,benefit.next].join(' ')).not.toMatch(/有效.*核心|事务|ID|绑定/);expect(JSON.stringify(s)).toBe(before);
  const g=touyeFixture('mature-win',{identity:activeIdentity}),paid=touyeSend(g.state,touyeBet(g.state,g.discard,g.target)),cleared=touyeSend(paid,{type:'PlayHand',selectedIds:g.play}),shop=round(touyeSend(cleared,{type:'OpenShop'})),snapshot=JSON.stringify(shop),copy=heroStageContinuity(shop)!;
  expect(copy.decision).toContain('至少用一张刚摸的牌');expect(copy.decision).not.toMatch(/有效.*核心|事务|ID/);expect(JSON.stringify(shop)).toBe(snapshot);
 });
 it('strict new save rejects a repaired checksum with a false timing or source, legacy identities cannot absorb late traces',()=>{
  const {state,action}=activeRunFixture('xiemu'),s=touyeSend(state,action),cp=makeCheckpoint(s,[]);
  for(const change of [(s:R2RunState)=>{s.lastTrace!.events.find(e=>e.sourceType==='character'&&e.phase==='characterScore')!.phase='jokerScore';},(s:R2RunState)=>{s.lastTrace!.events.find(e=>e.sourceType==='character'&&e.phase==='characterScore')!.sourceDefinitionId='azao';},(s:R2RunState)=>{s.lastTrace!.xiemuBurn!.goldAfter++;}]){const bad=structuredClone(cp);change(bad.state);const {checksum,...body}=bad;expect(readCheckpoint({...body,checksum:stableHash(body)}).ok).toBe(false);}
 });
});
