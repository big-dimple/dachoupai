import {describe,expect,it} from 'vitest';
import type {PlayingCard} from '../src/cards/types';
import {SeededRng} from '../src/core/SeededRng';
import {Rational,type Fraction} from '../src/domain/rational';
import {scoreR2Hand,previewR2Hand,type ScoreInput} from '../src/domain/scoreR2';
import {r2CreateJoker,getR2Stage} from '../src/domain/r2Run';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {R2_BOUNDED_CLEAR_VERSION,R2_BOUNDED_CLEAR_HASH,isR2BoundedClear} from '../src/domain/r2GroupUpgrade';
import {r2RouteGrowthTrace,type R2RouteProgress} from '../src/domain/r2RouteGrowth';
import {r2StageSpec} from '../src/domain/r2Chapter';
import {newRunIdentity} from '../src/game/RunLaunch';

const identity={contentVersion:R2_BOUNDED_CLEAR_VERSION,contentHash:R2_BOUNDED_CLEAR_HASH};
const fraction=(n:number|string,d=1):Fraction=>({n:String(n),d:String(d)});
const progress=(count=35):R2RouteProgress=>({clears:count,G:count,S:count,F:count});
const suits=['hearts','spades','clubs','diamonds'] as const;
function cards(ranks:number[],papers=0,sameSuit=false):PlayingCard[]{
 return ranks.map((rank,i)=>({id:'fixed/'+i,rank:rank as PlayingCard['rank'],suit:sameSuit?'hearts':suits[i%4],...(i<papers?{enhancement:'multiplier-paper' as const}:{})}));
}
function joker(id:string,growth:Record<string,Fraction>={}){
 const instance=r2CreateJoker(id,'joker/'+id,8,undefined,identity);
 return {...instance,growth:{...instance.growth,...growth}};
}
function input(hand:PlayingCard[],jokers:ScoreInput['jokers']=[],extra:Partial<ScoreInput>={}):ScoreInput{
 return {rulesVersion:'r2',runId:'bounded-fixed',rootId:'bounded-fixed/hand',characterId:'neutral',hand,
  selectedIds:hand.map(c=>c.id),disabledIds:[],jokers,definitions:r2JokerDefinitionsFor(identity),
  handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,gold:60,
  rng:new SeededRng('bounded-fixed').snapshot(),amoScoreTiming:'assist-v1',
  routeGrowth:progress(),routeGrowthPolicy:'bounded-max-v1',...extra};
}
const score=(hand:PlayingCard[],jokers:ScoreInput['jokers']=[],extra:Partial<ScoreInput>={})=>scoreR2Hand(input(hand,jokers,extra));
const sum=(values:readonly string[])=>values.reduce((total,value)=>total+BigInt(value),0n);
function standard(rank:number,suit:PlayingCard['suit']):PlayingCard{
 return {id:suit+'-'+rank,rank:rank as PlayingCard['rank'],suit};
}
const pair=(rank:number)=>[standard(rank,'hearts'),standard(rank,'clubs')];
const house=(rank:number)=>[standard(rank,'hearts'),standard(rank,'spades'),standard(rank,'clubs'),standard(rank+1,'hearts'),standard(rank+1,'spades')];
/** Declared disjoint ready-hand supply; no claim of natural deals or shop availability. */
function supplied(hands:PlayingCard[][],type:'pair'|'full-house',level:number,count:number,owned:ScoreInput['jokers'],boss=false){
 expect(new Set(hands.flatMap(h=>h.map(c=>c.id))).size).toBe(hands.flat().length);
 return hands.map((hand,index)=>score(hand,owned,{handLevels:{[type]:level},routeGrowth:progress(count),
  playIndex:index+1,handsBeforePlay:hands.length-index,previousHandType:index?type:null,
  ...(boss?{boss:{definitionId:'B09' as const,disabledSuit:null}}:{})}).finalScore);
}

describe('bounded clear — real scorer and declared early supply, not gameplay acceptance',()=>{
 it('all six heroes and three selected opening routes launch the exact bounded identity',()=>{
  expect(isR2BoundedClear(identity)).toBe(true);
  expect(isR2BoundedClear({...identity,contentHash:'wrong'})).toBe(false);
  for(const hero of ['amo','erxiang','touye','xiemu','azao','laohuan'] as const)
   for(const route of ['group','straight','flush'] as const)expect(newRunIdentity(hero,route)).toEqual(identity);
 });
 it('keeps grace, caps each candidate, and chooses one maximum qualifying family',()=>{
  for(const count of [0,1,2,3])expect(r2RouteGrowthTrace(progress(count),'pair','bounded-max-v1').applied?.factor).toEqual(fraction(1));
  expect(r2RouteGrowthTrace(progress(4),'pair','bounded-max-v1').applied?.factor).toEqual(fraction(27,20));
  const before={clears:8,G:0,S:4,F:8};
  const trace=r2RouteGrowthTrace(before,'straight-flush','bounded-max-v1');
  expect(trace.factors).toEqual({S:fraction(7,5),F:fraction(371293,100000)});
  expect(trace.applied).toEqual({policy:'bounded-max-v1',factor:fraction(371293,100000),family:'F',cap:fraction(4)});
  expect(r2RouteGrowthTrace(progress(Number.MAX_SAFE_INTEGER),'flush-house','bounded-max-v1').applied?.factor).toEqual(fraction(4));
  expect(r2RouteGrowthTrace(progress(35),'flush-house','bounded-max-v1').applied?.family).toBe('G');
 });
 it('SF applies its selected fractional factor once, previews agree, and final score floors only at the end',()=>{
  const packet=input(cards([6,7,8,9,10],0,true),[],{routeGrowth:{clears:8,G:0,S:4,F:8}});
  const trace=scoreR2Hand(packet),base=scoreR2Hand({...packet,routeGrowth:progress(0)});
  const events=trace.events.filter(e=>e.operation==='route-factor');
  expect(events).toHaveLength(1);expect(events[0].routeFamily).toBe('F');
  expect(events[0].value).toEqual(fraction(371293,100000));
  const exact=Rational.fromJSON(base.accumulator.M).multiply(new Rational(371293n,100000n));
  expect(trace.accumulator.M).toEqual(exact.toJSON());
  expect(trace.finalScore).toBe(Rational.fromJSON(base.accumulator.H).multiply(exact).floor().toString());
  expect(previewR2Hand(packet).possibleScores).toEqual([trace.finalScore]);
  expect(trace.events.filter(e=>e.operation==='final-score')).toHaveLength(1);
 });
 it('high card has factor one, no chosen family and no multiplier event even with mature history',()=>{
  const trace=score(cards([9]));
  expect(trace.routeGrowth?.factors).toEqual({});
  expect(trace.routeGrowth?.applied).toMatchObject({factor:fraction(1),family:null});
  expect(trace.events.filter(e=>e.operation==='route-factor')).toEqual([]);
  expect(trace.finalScore).toBe(score(cards([9]),[],{routeGrowth:progress(0)}).finalScore);
 });
 it('six fixed recipes read at most cap four once, including both compound families',()=>{
  const recipes=[
   {type:'pair',ranks:[9,9],papers:0,same:false,owned:[],expected:'1808'},
   {type:'four-kind',ranks:[9,9,9,9],papers:2,same:false,owned:[joker('mantangcai'),joker('b10',{heat:fraction(100)})],expected:'45960'},
   {type:'straight',ranks:[6,7,8,9,10],papers:2,same:false,owned:[joker('c04',{heat:fraction(100)})],expected:'18200'},
   {type:'flush',ranks:[2,5,8,10,13],papers:2,same:true,owned:[joker('c06',{multiplier:fraction(6)})],expected:'18880'},
   {type:'flush-house',ranks:[9,9,9,10,10],papers:2,same:true,owned:[joker('mantangcai'),joker('c06',{multiplier:fraction(6)})],expected:'135928'},
   {type:'straight-flush',ranks:[6,7,8,9,10],papers:2,same:true,owned:[joker('c04',{heat:fraction(100)}),joker('c06',{multiplier:fraction(6)})],expected:'82800'},
  ] as const;
  for(const recipe of recipes){
   const trace=score(cards([...recipe.ranks],recipe.papers,recipe.same),[...recipe.owned],{handLevels:{[recipe.type]:5}});
   expect(trace.finalScore).toBe(recipe.expected);
   expect(trace.routeGrowth?.applied?.factor).toEqual(fraction(4));
   expect(trace.events.filter(e=>e.operation==='route-factor')).toHaveLength(1);
  }
 });
 it('public pair keeps its 1770 raw source chain; new group retriggers reward triple and one Amo assist',()=>{
  const hand=[standard(6,'hearts'),standard(6,'spades'),standard(6,'clubs'),...['hearts','spades','clubs'].map(s=>standard(4,s as PlayingCard['suit']))];
  hand[0].enhancement='multiplier-paper';hand[1].enhancement='multiplier-paper';
  const owned=[joker('b06'),joker('jiedongfeng'),joker('e11',{coefficient:fraction(2)}),joker('a06'),joker('f09')];
  const packet=input(hand,owned,{characterId:'amo',gold:206,selectedIds:hand.slice(0,2).map(c=>c.id)});
  expect(scoreR2Hand({...packet,routeGrowth:progress(0)}).finalScore).toBe('1770');
  const paired=scoreR2Hand(packet);expect(paired.accumulator.H).toEqual(fraction(59));expect(paired.finalScore).toBe('7080');
  const triple=scoreR2Hand({...packet,selectedIds:hand.slice(0,3).map(c=>c.id)});
  expect(triple.finalScore).toBe('24948');
  expect(triple.events.filter(e=>e.operation==='retrigger-card')).toHaveLength(3);
  const assist=scoreR2Hand({...packet,selectedIds:hand.slice(0,3).map(c=>c.id),assistIds:hand.slice(3).map(c=>c.id)});
  expect(assist.finalScore).toBe('99792');
  expect(assist.events.filter(e=>e.operation==='route-factor')).toHaveLength(1);
  expect(assist.events.findIndex(e=>e.sourceDefinitionId==='amo')).toBeGreaterThan(assist.events.findIndex(e=>e.operation==='route-factor'));
 });
 it('new target table and endless fractions round once; stage lookup uses identity',()=>{
  const table=[400,900,1800,3600,6000,9000,14000,20475];
  for(const [index,warm] of table.entries())expect(r2StageSpec(index*3,'normal',0,'bounded-clear-v1')?.targetHeat).toBe(String(warm));
  expect([0,1,2].map(stage=>r2StageSpec(36+stage,'endless',0,'bounded-clear-v1')?.targetHeat)).toEqual(['32976','49463','65951']);
  expect(r2StageSpec(37,'endless',1,'bounded-clear-v1')?.targetHeat).toBe('59356');
  expect(getR2Stage(38,'endless',0,identity)?.targetHeat).toBe('65951');
  expect(r2StageSpec(38,'endless',0)?.targetHeat).toBe('25480397');
 });
 it('first chapter low pairs fail within four declared hands; an acquired ordinary starter changes the boundary',()=>{
  const hands=[2,3,4,5].map(pair),plain=supplied(hands,'pair',1,0,[]),starter=supplied(hands,'pair',1,0,[joker('mantangcai')]);
  expect(sum(plain)).toBe(336n);expect(sum(plain)).toBeLessThan(BigInt(getR2Stage(0,'normal',0,identity)!.targetHeat));
  expect(sum(starter)).toBe(1056n);expect(sum(starter)).toBeGreaterThanOrEqual(BigInt(getR2Stage(2,'normal',0,identity)!.targetHeat));
 });
 it('chapter three fast Boss three-pair budget fails at level one and crosses the locked goal after one training',()=>{
  const hands=[6,7,8].map(pair),owned=[joker('mantangcai')];
  const levelOne=supplied(hands,'pair',1,8,owned,true),levelTwo=supplied(hands,'pair',2,8,owned,true);
  const target=BigInt(getR2Stage(8,'normal',0,identity)!.targetHeat);
  expect(target).toBe(3600n);
  expect(levelOne).toEqual(['1096','1112','1128']);expect(sum(levelOne)).toBe(3336n);expect(sum(levelOne)).toBeLessThan(target);
  expect(levelTwo).toEqual(['1520','1540','1560']);expect(sum(levelTwo)).toBe(4620n);expect(sum(levelTwo)).toBeGreaterThanOrEqual(target);
 });
 it('ordinary chapter five houses have a two-hand path; chapter seven requires a genuine level gain in this supply',()=>{
  const hands=[2,4,6,8].map(house),owned=[joker('mantangcai')];
  const fifth=supplied(hands.slice(0,2),'full-house',1,14,owned);
  expect(sum(fifth)).toBe(12680n);expect(sum(fifth)).toBeGreaterThanOrEqual(BigInt(getR2Stage(14,'normal',0,identity)!.targetHeat));
  const levelOne=supplied(hands,'full-house',1,20,owned),levelTwo=supplied(hands,'full-house',2,20,owned);
  const bossTarget=BigInt(getR2Stage(20,'normal',0,identity)!.targetHeat);
  expect(bossTarget).toBe(28000n);expect(getR2Stage(19,'normal',0,identity)?.targetHeat).toBe('21000');
  expect(levelOne).toEqual(['6240','6440','6640','6840']);expect(sum(levelOne)).toBe(26160n);expect(sum(levelOne)).toBeLessThan(bossTarget);
  expect(levelTwo).toEqual(['8448','8688','8928','9168']);expect(sum(levelTwo)).toBe(35232n);expect(sum(levelTwo)).toBeGreaterThanOrEqual(bossTarget);
 });
 it('chapters two, four and six retain explicit low-level supply paths between the tested checkpoints',()=>{
  for(const stage of [0,1,2]){
   const second=supplied([2,3,4,5].map(pair),'pair',1,3+stage,[joker('mantangcai')]);
   expect(sum(second)).toBeGreaterThanOrEqual(BigInt(getR2Stage(3+stage,'normal',0,identity)!.targetHeat));
   for(const chapter of [4,6]){
    const values=supplied([2,4,6,8].map(house),'full-house',1,(chapter-1)*3+stage,[joker('mantangcai')]);
    expect(sum(values)).toBeGreaterThanOrEqual(BigInt(getR2Stage((chapter-1)*3+stage,'normal',0,identity)!.targetHeat));
   }
  }
 });
 it('bounded over-clear reward does not swallow a one-use paid hero burst or reuse glass',()=>{
  const hand=house(2),owned=[joker('mantangcai')];
  const plain=score(hand,owned,{characterId:'xiemu',gold:30,activeMultTiming:'after-route-growth',xiemuBurn:{cost:0,goldBefore:30,beforeUsed:false}});
  const burst=score(hand,owned,{characterId:'xiemu',gold:20,activeMultTiming:'after-route-growth',xiemuBurn:{cost:10,goldBefore:30,beforeUsed:false}});
  expect(plain.finalScore).toBe('6240');expect(burst.finalScore).toBe('12480');
  expect(burst.xiemuBurn).toMatchObject({goldAfter:20,afterUsed:true});
  expect(()=>score(hand,owned,{characterId:'xiemu',gold:10,activeMultTiming:'after-route-growth',xiemuBurn:{cost:10,goldBefore:20,beforeUsed:true}})).toThrow();
  const glass=house(4);glass[4].enhancement='glass-paper';glass[4].edition='polychrome';
  const trace=score(glass,owned);expect(trace.events.filter(e=>e.operation==='glass-check')).toHaveLength(1);
  expect(trace.events.findIndex(e=>e.operation==='glass-check')).toBeGreaterThan(trace.events.findIndex(e=>e.operation==='final-score'));
 });
});
