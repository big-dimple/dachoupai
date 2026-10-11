import {describe,expect,it} from 'vitest';
import {createRun,applyCommand,type R2RunState,type Action} from '../src/domain/run';
import {assertR2Invariants,r2CreateJoker,R2_RULESETS,r2ScoreContext} from '../src/domain/r2Run';
import {isR2RouteGrowth,isR2RouteStarter} from '../src/domain/r2GroupUpgrade';
import {r2RouteFamilies,r2RouteSnapshot} from '../src/domain/r2RouteGrowth';
import {scoreR2Hand,previewR2Hand,type ScoreInput} from '../src/domain/scoreR2';
import {newRunIdentity} from '../src/game/RunLaunch';
import {assistPublicInput,rankAssistOptions,AssistRecommendationCache} from '../src/game/AssistRecommendation';
import {r2AssistAvailability} from '../src/domain/r2Assist';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
const main=['spades-9','hearts-9','clubs-13','diamonds-13'],side=['spades-12','hearts-12','clubs-12'];
function send(s:R2RunState,action:Action){const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;}
// Controlled legal clear ledger and visible hand: this is an integration fixture,
// not evidence of natural acquisition, six-hero playthroughs or route balance.
function fixture(n=4,profile=newRunIdentity('amo','group')){
 let s=createRun({rulesVersion:'r2',characterId:'amo',runId:'assist-c2',seed:'assist-c2',r2Identity:{contentVersion:profile.contentVersion,contentHash:profile.contentHash},...(isR2RouteStarter(profile)?{openingRoute:'group' as const}:{}),modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 s=send(s,{type:'LeaveShop'});s.shop=null;
 if(isR2RouteGrowth(s))s.routeGrowth={clears:n,G:n,S:n,F:n,settlements:Array.from({length:n},(_,stageIndex)=>({stageIndex,families:['G','S','F']}))};
 s.stageIndex=n;s.chapter=Math.floor(n/3)+1;s.seenBossIds=['B01','B02'].slice(0,s.chapter);s.boss={definitionId:s.seenBossIds.at(-1)! as 'B01'|'B02',disabledSuit:null};
 s=send(s,{type:'EnterStage'});return arrange(s,main);
}
function arrange(s:R2RunState,ids:string[]){s.handOrder=[...ids,...side,...s.deckInstances.filter(c=>!ids.includes(c.id)&&!side.includes(c.id)).map(c=>c.id)].slice(0,s.stage!.handLimit);s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id));assertR2Invariants(s);return s;}
function held(s:R2RunState){s.jokers=['d01','d08'].map((id,i)=>r2CreateJoker(id,'held/'+i,8,'none',s));s.stage!.initialJokerIds=s.jokers.map(j=>j.instanceId);s.deckInstances.find(c=>c.id===side[2])!.enhancement='voice-paper';return s;}
function check(s:R2RunState,ids=main){
 expect(readCheckpoint(makeCheckpoint(s,[])).ok).toBe(true);
 const before=structuredClone(s),input=assistPublicInput(s,ids),ranked=rankAssistOptions(input,r2AssistAvailability(s).available);
 const hand=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!);
 expect(input.routeGrowth).toEqual(r2ScoreContext(s,hand,ids).routeGrowth);
 for(const option of ranked.options){
  const actual=send(s,option.ids.length?{type:'PlayAssistedHand',selectedIds:ids,assistIds:option.ids}:{type:'PlayHand',selectedIds:ids});
  const trace=actual.lastTrace!,score=BigInt(trace.finalScore);
  expect(score>=BigInt(option.range.minimum)&&score<=BigInt(option.range.maximum)).toBe(true);
  if(!ranked.random)expect(trace.finalScore).toBe(option.range.minimum);
  if(isR2RouteGrowth(s)){
   expect(trace.routeGrowth!.before).toEqual(input.routeGrowth);
   expect(Object.keys(trace.routeGrowth!.factors)).toEqual(r2RouteFamilies(trace.handType));
   expect(actual.stage!.routeGrowth!.eligible).toEqual(r2RouteFamilies(trace.handType));
   const factors=trace.events.flatMap((e,i)=>e.operation==='route-factor'?[i]:[]),amo=trace.events.findIndex(e=>e.sourceDefinitionId==='amo');
   if(amo>=0)expect(factors.every(i=>i<amo)).toBe(true);
  }else expect(trace.routeGrowth).toBeUndefined();
 }
 expect(s).toEqual(before);return ranked;
}
describe('PR123 public assist preview integrated with C2 before-hand history',()=>{
 it('copies the exact snapshot, invalidates the cache on history changes and fails closed if missing',()=>{
  const s=fixture(),input=assistPublicInput(s,main),cache=new AssistRecommendationCache(),first=cache.get(s,main)!;
  expect(input.routeGrowth).toEqual({clears:4,G:4,S:4,F:4});expect(input.routeGrowth).not.toBe(s.routeGrowth);
  s.routeGrowth!.settlements[0].families=['S','F'];s.routeGrowth!.G=3;
  const next=cache.get(s,main)!;expect(next).not.toBe(first);expect(next.key).not.toBe(first.key);expect(BigInt(next.best.range.minimum)).toBeLessThan(BigInt(first.best.range.minimum));
  expect(input.routeGrowth!.G).toBe(4);expect(cache.get(s,main)).toBe(next);
  delete s.routeGrowth;expect(()=>assistPublicInput(s,main)).toThrow('missing-route-growth-history');
 });
 it.each([
  ['pair',['spades-9','hearts-9']],['two-pair',main],['three-kind',['spades-9','hearts-9','clubs-9']],
  ['straight',['spades-3','hearts-4','clubs-5','diamonds-6','spades-7']],
  ['flush',['hearts-2','hearts-5','hearts-8','hearts-10','hearts-13']],
  ['full-house',['spades-9','hearts-9','clubs-9','clubs-13','diamonds-13']],
  ['four-kind',['spades-9','hearts-9','clubs-9','diamonds-9']],
  ['straight-flush',['hearts-3','hearts-4','hearts-5','hearts-6','hearts-7']],
  ['high-card',['spades-2']],
 ] as const)('%s compares every public no-assist/side option with a real command', (type,ids)=>{
  const s=arrange(fixture(),[...ids]),ranked=check(s,[...ids]);
  expect(scoreR2Hand({...assistPublicInput(s,ids),rng:s.rng.rule}).handType).toBe(type);
  expect(ranked.options.some(o=>!o.ids.length)).toBe(true);
  if(type==='pair'||type==='high-card')expect(ranked.options).toHaveLength(1);else expect(ranked.options.some(o=>o.ids.length===3)).toBe(true);
 });
 it.each(['five-kind','flush-house','flush-five'] as const)('%s uses only the main high-order families',type=>{
  const ids=['spades-3','hearts-4','clubs-5','diamonds-6','spades-7'],s=arrange(fixture(),ids);
  ids.forEach((id,i)=>{const c=s.deckInstances.find(c=>c.id===id)!;c.rank=type==='flush-house'&&i>=3?7:5;if(type!=='five-kind')c.suit='hearts';});
  check(s,ids);expect(scoreR2Hand({...assistPublicInput(s,ids),rng:s.rng.rule}).handType).toBe(type);
 });
 it('accounts for held benefits, including when not assisting wins',()=>{
  const normal=check(fixture()),h=check(held(fixture()));
  expect(normal.best).toMatchObject({ids:side,range:{minimum:'1112',maximum:'1112'}});
  expect(h.best.ids).toEqual(side.slice(0,2));expect(BigInt(h.best.range.minimum)).toBeGreaterThan(BigInt(h.options.find(o=>o.ids.length===3)!.range.minimum));
  const retained=held(fixture());retained.handOrder=retained.handOrder.map(id=>id===side[2]?'diamonds-7':id);retained.drawPile=retained.deckInstances.map(c=>c.id).filter(id=>!retained.handOrder.includes(id));
  side.slice(0,2).forEach(id=>{retained.deckInstances.find(c=>c.id===id)!.enhancement='voice-paper';});
  expect(check(retained).best.ids).toEqual([]);
 });
 it('uses public random ranges without hidden RNG/deck and keeps fewer-card tie ranking',()=>{
  const s=fixture();s.deckInstances.find(c=>c.id===main[0])!.enhancement='lucky-paper';s.jokers=[r2CreateJoker('f08','random/f08',8,'none',s)];s.stage!.initialJokerIds=s.jokers.map(j=>j.instanceId);
  expect(check(s).random).toBe(true);const cache=new AssistRecommendationCache(),first=cache.get(s,main);
  s.rng.rule.state^=111;s.drawPile.reverse();expect(cache.get(s,main)).toBe(first);check(s);
  expect(JSON.stringify(assistPublicInput(s,main))).not.toMatch(/rng|drawPile|seed|settlements/);
  const tie=fixture();tie.handOrder=tie.handOrder.map(id=>id===side[2]?'diamonds-7':id);tie.drawPile=tie.deckInstances.map(c=>c.id).filter(id=>!tie.handOrder.includes(id));
  side.slice(0,2).forEach(id=>{tie.deckInstances.find(c=>c.id===id)!.enhancement='voice-paper';});tie.deckInstances.find(c=>c.id===main[0])!.enhancement='lucky-paper';
  const r=check(tie);expect(r.random).toBe(true);expect(r.best.ids).toEqual([]);expect(new Set(r.options.map(o=>o.range.minimum)).size).toBe(1);expect(new Set(r.options.map(o=>o.range.maximum)).size).toBe(2);
 });
 it('the fourth clear never changes its winning public snapshot; next stage reads the new count',()=>{
  let s=fixture(3),r=check(s);expect(assistPublicInput(s,main).routeGrowth!.G).toBe(3);
  s.deckInstances.find(c=>c.id===main[0])!.enhancement='multiplier-paper';s.deckInstances.find(c=>c.id===main[1])!.enhancement='multiplier-paper';s=send(s,{type:'PlayAssistedHand',selectedIds:main,assistIds:r.best.ids});
  expect(s.phase).toBe('stage-cleared');expect(s.lastTrace!.routeGrowth!.before.G).toBe(3);expect(s.lastTrace!.routeGrowth!.factors.G).toEqual({n:'1',d:'1'});expect(s.routeGrowth!.G).toBe(4);
  expect(readCheckpoint(makeCheckpoint(s,[])).ok).toBe(true);
  s=arrange(send(send(send(s,{type:'OpenShop'}),{type:'LeaveShop'}),{type:'EnterStage'}),main);
  expect(assistPublicInput(s,main).routeGrowth).toEqual(r2RouteSnapshot(s.routeGrowth));expect(assistPublicInput(s,main).routeGrowth!.G).toBe(4);check(s);
 });
 it.each(R2_RULESETS.filter(p=>!isR2RouteGrowth(p)))('legacy $contentVersion omits C2 and preserves its scorer',profile=>{
  const s=fixture(0,profile),input=assistPublicInput(s,main);expect(Object.hasOwn(input,'routeGrowth')).toBe(false);
  check(s);
  const i:ScoreInput={...input,rng:s.rng.rule};expect(scoreR2Hand(i).routeGrowth).toBeUndefined();expect(previewR2Hand(i).routeGrowth).toBeUndefined();
 });
});
