/** Offline experiment only. No product imports this module. All score integers stay exact. */
import {Rational, type Fraction} from '../../src/domain/rational';
import {r2StageSpec} from '../../src/domain/r2Chapter';
import {previewR2Hand, scoreR2Hand, type ScoreInput} from '../../src/domain/scoreR2';
import {R2_ROUTE_GROWTH_JOKERS} from '../../src/content/r2RouteGrowthJokers';
import {r2CreateJoker} from '../../src/domain/r2Run';
import {R2_ACTIVE_MULT_VERSION, R2_ACTIVE_MULT_HASH} from '../../src/domain/r2GroupUpgrade';
import {SeededRng} from '../../src/core/SeededRng';
import {type PlayingCard} from '../../src/cards/types';
import {type R2HandType} from '../../src/domain/evaluateR2';

export const BASE_SHA='f23c1fc2389242bacbb8f5d35733f1c344610727';
export const identity={contentVersion:R2_ACTIVE_MULT_VERSION,contentHash:R2_ACTIVE_MULT_HASH};
export const ceil=(n:bigint,d=1n)=>(n+d-1n)/d;
export const min=(a:bigint,b:bigint)=>a<b?a:b;
export const max=(a:bigint,b:bigint)=>a>b?a:b;
export function exactScore(heat:Fraction,multiplier:Fraction):string {
  return ((BigInt(heat.n)*BigInt(multiplier.n))/(BigInt(heat.d)*BigInt(multiplier.d))).toString();
}
/** Independent specification oracle: no call to r2RouteFactor. */
export function routeFactor(family:'G'|'S'|'F',clears:number):Fraction {
  if(!Number.isSafeInteger(clears)||clears<0)throw Error('invalid-clear-count');
  const [n,d]=({G:[27n,20n],S:[7n,5n],F:[13n,10n]} as const)[family];
  let a=1n,b=1n;
  for(let i=3;i<clears;i++){a*=n;b*=d;if(a>=10n**12n*b)return {n:'1000000000000',d:'1'};}
  return {n:a.toString(),d:b.toString()};
}
export const cards=(ranks:number[],sameSuit=false,paper=0):PlayingCard[]=>ranks.map((rank,i)=>({
  id:'card/'+i,rank:rank as PlayingCard['rank'],suit:sameSuit?'hearts':(['hearts','spades','clubs','diamonds'] as const)[i%4],
  ...(i<paper?{enhancement:'multiplier-paper' as const}:{}),
}));
export function joker(id:string,growth:Record<string,Fraction>={}) {
  const j=r2CreateJoker(id,'joker/'+id,8,undefined,identity);
  return {...j,growth:{...j.growth,...growth}};
}
export function input(hand:PlayingCard[],extra:Partial<ScoreInput>={}):ScoreInput {
  return {rulesVersion:'r2',runId:'offline-calibration',rootId:'offline-hand',characterId:'neutral',hand,
    selectedIds:hand.map(c=>c.id),disabledIds:[],jokers:[],definitions:R2_ROUTE_GROWTH_JOKERS,
    handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,
    rng:new SeededRng('offline-calibration').snapshot(),amoScoreTiming:'assist-v1',gold:60,
    routeGrowth:{clears:0,G:0,S:0,F:0},...extra};
}
export const builds=[
  {id:'thin-pair',type:'pair',ranks:[9,9],families:['G'],same:false,jokers:()=>[],paper:0},
  {id:'group',type:'four-kind',ranks:[9,9,9,9],families:['G'],same:false,jokers:()=>[joker('mantangcai'),joker('b10',{heat:{n:'100',d:'1'}})],paper:2},
  {id:'straight',type:'straight',ranks:[6,7,8,9,10],families:['S'],same:false,jokers:()=>[joker('c04',{heat:{n:'100',d:'1'}})],paper:2},
  {id:'flush',type:'flush',ranks:[2,5,8,10,13],families:['F'],same:true,jokers:()=>[joker('c06',{multiplier:{n:'6',d:'1'}})],paper:2},
  {id:'flush-house',type:'flush-house',ranks:[9,9,9,10,10],families:['G','F'],same:true,jokers:()=>[joker('mantangcai'),joker('c06',{multiplier:{n:'6',d:'1'}})],paper:2},
  {id:'straight-flush',type:'straight-flush',ranks:[6,7,8,9,10],families:['S','F'],same:true,jokers:()=>[joker('c04',{heat:{n:'100',d:'1'}}),joker('c06',{multiplier:{n:'6',d:'1'}})],paper:2},
] as const;
/** Controlled capability snapshots, NOT a purchasing or leveling trajectory. */
export function buildInput(id:typeof builds[number]['id'],chapter:number,level=5):ScoreInput {
  const b=builds.find(b=>b.id===id)!;const clears=(chapter-1)*3;
  return input(cards([...b.ranks],b.same,b.paper),{jokers:b.jokers(),handLevels:{[b.type]:level},
    routeGrowth:{clears,G:b.families.some(f=>f==='G')?clears:0,S:b.families.some(f=>f==='S')?clears:0,F:b.families.some(f=>f==='F')?clears:0}});
}

export const fixedLadders={legacy:[12n,5n],single:[3n,1n],dualGF:[11n,2n],dualSF:[61n,10n]} as const;
/** Proposed opt-in ladders; anchor chapter 8 at 160000. Never used by product. */
export function fixedTarget(chapter:number,stage=0,ladder:keyof typeof fixedLadders='legacy',tier=1n):bigint {
  if(!Number.isSafeInteger(chapter)||chapter<1||chapter>100||![0,1,2].includes(stage)||tier<1n)throw Error('invalid-target');
  if(chapter<=8)return BigInt(r2StageSpec((chapter-1)*3+stage)!.targetHeat)*tier;
  const [n,d]=fixedLadders[ladder],e=BigInt(chapter-8);
  return ceil(160000n*tier*n**e*BigInt([2,3,4][stage]),2n*d**e);
}

/** Candidate adaptive policy: multiplier basis points, one-chapter lag; never reads scores. */
export function adaptiveStep(previousBps:bigint,capacity:bigint,referenceTarget:bigint):bigint {
  if(previousBps<10000n||previousBps>640000n||capacity<0n||referenceTarget<=0n)throw Error('invalid-adaptation');
  const desired=max(10000n,min(640000n,capacity*7000n/referenceTarget));
  return max(10000n,min(640000n,max(ceil(previousBps*4n,5n),min(previousBps*5n/4n,desired))));
}
/** Optional anti-sale experiment: last three public capacities, not score records. */
export function capacityHighWater(history:readonly bigint[]):bigint {
  if(!history.length||history.some(c=>c<0n))throw Error('invalid-capacity-history');
  return history.slice(-3).reduce(max,0n);
}
export function lockedChapter(chapter:number,bps:bigint):Readonly<{chapter:number;bps:string;targets:readonly string[]}> {
  if(bps<10000n||bps>640000n)throw Error('invalid-adaptation');
  return Object.freeze({chapter,bps:bps.toString(),targets:Object.freeze([0,1,2].map(s=>ceil(fixedTarget(chapter,s)*bps,10000n).toString()))});
}

export interface PublicProbe {deck:PlayingCard[];score:ScoreInput;handSize:number;hands:number;trials?:number}
/** Pure public-inventory experiment: fixed independent shuffles, no run seed/draw pile/history/observed score. */
export function estimateCapacity(probe:PublicProbe) {
  const trials=probe.trials??12;
  if(!Number.isInteger(trials)||trials<4||trials>64||!Number.isInteger(probe.handSize)||probe.handSize<5||probe.handSize>9||!Number.isInteger(probe.hands)||probe.hands<1||probe.hands>4)throw Error('invalid-probe-budget');
  if(new Set(probe.deck.map(c=>c.id)).size!==probe.deck.length)throw Error('duplicate-deck-id');
  // All glass instances removed, including their rank/suit. This is a deliberately pessimistic loss stress.
  const deck=probe.deck.filter(c=>c.enhancement!=='glass-paper').map(c=>({...c})).sort((a,b)=>JSON.stringify([a.suit,a.rank,a.enhancement,a.edition]).localeCompare(JSON.stringify([b.suit,b.rank,b.enhancement,b.edition])));
  const omitted=probe.score.jokers.filter(j=>probe.score.definitions.find(d=>d.id===j.definitionId)!.hooks.some(h=>h.operations.some(o=>['expire-after-hands','consume-rescue','consume-growth'].includes(o.kind))));
  const owned=probe.score.jokers.filter(j=>!omitted.includes(j));
  const base:ScoreInput={...probe.score,characterId:'neutral',wager:false,assistIds:undefined,erxiangHandoff:undefined,touyeWager:undefined,xiemuBurn:undefined,azaoCharge:undefined,laohuanTrick:undefined,activeMultTiming:undefined,jokers:owned,previousHandScore:null,stageHeatBefore:'0',stageTargetHeat:'1',disabledIds:[],ordinaryPointsSuppressedIds:[],boss:null,sealedJokerIds:[],challengeDisabledJokerId:null};
  const totals:bigint[]=[];
  for(let trial=0;trial<trials;trial++){
    const rng=new SeededRng('public-probe-v1/'+trial),shoe=[...deck];
    for(let i=shoe.length-1;i>0;i--){const j=rng.integer(0,i);[shoe[i],shoe[j]]=[shoe[j],shoe[i]];}
    let hand=shoe.splice(0,probe.handSize),total=0n,previous:R2HandType|null=null;
    for(let turn=0;turn<Math.min(probe.hands,2)&&hand.length>=5;turn++){
      let best=-1n,selected:string[]=[],type:R2HandType='high-card';
      // Five-card selections only: a lower policy bound, not an optimal human player.
      for(let a=0;a<hand.length-4;a++)for(let b=a+1;b<hand.length-3;b++)for(let c=b+1;c<hand.length-2;c++)for(let d=c+1;d<hand.length-1;d++)for(let e=d+1;e<hand.length;e++){
        const ids=[a,b,c,d,e].map(i=>hand[i].id);
        const p=previewR2Hand({...base,hand,selectedIds:ids,previousHandType:previous,playIndex:turn+1,handsBeforePlay:probe.hands-turn});
        const score=BigInt(p.scoreRange.minimum);if(score>best){best=score;selected=ids;type=p.handType;}
      }
      total+=best;previous=type;hand=hand.filter(c=>!selected.includes(c.id));hand.push(...shoe.splice(0,probe.handSize-hand.length));
    }
    totals.push(total);
  }
  totals.sort((a,b)=>a<b?-1:a>b?1:0);
  return {capacity:totals[Math.floor((trials-1)/4)].toString(),minimum:totals[0].toString(),maximum:totals.at(-1)!.toString(),totals:totals.map(String),trials,
    removedGlass:probe.deck.length-deck.length,omittedJokers:omitted.map(j=>j.definitionId),handsUsed:Math.min(probe.hands,2),discardsUsed:0,
    limitation:'synthetic public-deck probes, no acquisition probability, no boss simulation, no optimality or guaranteed lower bound across deals'};
}

export function audit(input:ScoreInput) {
  const trace=scoreR2Hand(input);
  const expected=exactScore(trace.accumulator.H,trace.accumulator.M);
  if(expected!==trace.finalScore)throw Error('final-floor-mismatch');
  for(const e of trace.events.filter(e=>e.operation==='route-factor')) {
    const independent=routeFactor(e.routeFamily!,input.routeGrowth![e.routeFamily!]);
    if(BigInt(e.value.n)*BigInt(independent.d)!==BigInt(independent.n)*BigInt(e.value.d))throw Error('route-factor-mismatch');
    const next=new Rational(BigInt(e.before.M.n),BigInt(e.before.M.d)).multiply(Rational.fromJSON(independent));
    if(next.compare(Rational.fromJSON(e.after.M))!==0)throw Error('route-application-mismatch');
  }
  return {type:trace.handType,score:trace.finalScore,H:trace.accumulator.H,M:trace.accumulator.M,
    routes:trace.events.filter(e=>e.operation==='route-factor').map(e=>({family:e.routeFamily,count:e.resourceBefore,factor:e.value})),
    glassChecks:trace.events.filter(e=>e.operation==='glass-check').length,destroyed:trace.destroyedCardIds};
}
