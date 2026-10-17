import {createRun,applyCommand,type R2RunState} from '../../src/domain/run';
import {r2ScoreContext} from '../../src/domain/r2Run';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {evaluateR2Hand,type R2HandType} from '../../src/domain/evaluateR2';
import {r2RouteFamilies} from '../../src/domain/r2RouteGrowth';
import {R2_ASSIST_CONTRACT,r2AssistFacts} from '../../src/domain/r2Assist';
import {R2_BASE_SCORES,scoreR2Hand} from '../../src/domain/scoreR2';
import {ordinaryCardPoints} from '../../src/domain/r2ErxiangHandoff';
import {r2JokerDefinitionsFor} from '../../src/domain/r2ContentProfiles';
import {SeededRng} from '../../src/core/SeededRng';
import type {PlayingCard} from '../../src/cards/types';

export const MODELS=['current','pair-main','echo-single-1.25','charged-ceiling'] as const;
export const ROUTES=['F','S','P','G','ANY'] as const;
type Model=typeof MODELS[number];type Route=typeof ROUTES[number];
const bits=(mask:number)=>Array.from({length:8},(_,i)=>i).filter(i=>mask&(1<<i));
const MASKS=Array.from({length:255},(_,i)=>i+1).map(mask=>({mask,indices:bits(mask)})).filter(m=>m.indices.length<=5);
const emptyBest=()=>({score:0,raw:0,main:[] as string[],side:[] as string[],multiplier:1});
type Best=ReturnType<typeof emptyBest>;
export interface Analysis {plain:Record<Route,Best>;skill:Record<Model,Record<Route,Best>>}
export function freshSushi(seed:string){
 let s=createRun({seed,runId:'model/'+seed,characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 for(const action of [{type:'LeaveShop'},{type:'EnterStage'}] as const)s=send(s,action);return s;
}
export function send(state:R2RunState,action:Parameters<typeof applyCommand>[1]['action']):R2RunState {
 const result=applyCommand(state,{runId:state.runId,commandId:state.runId+'/command/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action});if(!result.ok)throw Error(result.code);return result.state as R2RunState;
}
export const visibleHand=(state:R2RunState)=>state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!);
const initRecord=<T>(make:()=>T)=>Object.fromEntries(ROUTES.map(r=>[r,make()])) as Record<Route,T>;
function improve(old:Best,next:Best){return next.score>old.score||next.score===old.score&&next.main.length+next.side.length<old.main.length+old.side.length;}
/** Exact bare-card arithmetic read from published tuples; canonical score audits below verify this restricted model. */
export function analyze(hand:readonly PlayingCard[],familyLevel=1,trainedRoute:Route='ANY',disabledIds:readonly string[]=[]):Analysis {
 if(hand.length!==8)throw Error('model-requires-eight');
 const plain=initRecord(emptyBest),skill=Object.fromEntries(MODELS.map(m=>[m,initRecord(emptyBest)])) as Analysis['skill'];
 for(const {mask,indices}of MASKS){
  const selected=indices.map(i=>hand[i]),evaluated=evaluateR2Hand(selected,{}),type=evaluated.type,families=r2RouteFamilies(type),routes:Route[]=['ANY',...families,...(type==='pair'?['P' as const]:[])];
  const trained=trainedRoute==='ANY'||trainedRoute==='P'&&type==='pair'||families.includes(trainedRoute as 'G'|'S'|'F'),level=trained?familyLevel:1;
  const [heat,mult,heatStep,multStep]=R2_BASE_SCORES[type],points=selected.filter(c=>evaluated.scoringIds.includes(c.id)&&!disabledIds.includes(c.id)).reduce((sum,c)=>sum+ordinaryCardPoints(c),0);
  const raw=(heat+heatStep*(level-1)+points)*(Number(mult.n)/Number(mult.d)+(Number(multStep.n)/Number(multStep.d))*(level-1));
  const base={score:Math.floor(raw),raw,main:selected.map(c=>c.id),side:[],multiplier:1};for(const route of routes)if(improve(plain[route],base))plain[route]=base;
  const remainder=hand.filter((c,i)=>!(mask&(1<<i))&&!disabledIds.includes(c.id)),groups=new Map<number,PlayingCard[]>();for(const card of remainder)groups.set(card.rank,[...(groups.get(card.rank)??[]),card]);
  const group=[...groups.values()].filter(g=>g.length>=2).sort((a,b)=>Math.min(3,b.length)-Math.min(3,a.length))[0];
  const side=group?.slice(0,3).map(c=>c.id)??[],normalMultiplier=side.length===3?R2_ASSIST_CONTRACT.three:side.length===2?R2_ASSIST_CONTRACT.pair:1;
  const currentQualified=R2_ASSIST_CONTRACT.qualifiedTypes.includes(type),echo=remainder.find(c=>selected.some(main=>evaluated.scoringIds.includes(main.id)&&main.rank===c.rank));
  for(const model of MODELS){
   const allowed=currentQualified||model==='pair-main'&&type==='pair';let multiplier=allowed?normalMultiplier:1,assist=allowed?side:[];
   if(model==='echo-single-1.25'&&currentQualified&&multiplier===1&&echo){multiplier=1.25;assist=[echo.id];}
   if(model==='charged-ceiling'&&multiplier>1)multiplier*=1.5; // Hypothetical two-layer ceiling (1 + .25 per layer); availability unchanged.
   if(multiplier<=1)continue;const candidate={score:Math.floor(raw*multiplier),raw,main:base.main,side:assist,multiplier};
   for(const route of routes)if(improve(skill[model][route],candidate))skill[model][route]=candidate;
  }
 }
 return {plain,skill};
}

export function audit(hand:readonly PlayingCard[],analysis:Analysis,reference:R2RunState,level=1,trainedRoute:Route='ANY',disabledIds:readonly string[]=[]){
 let checks=0;const levels=Object.fromEntries(Object.keys(R2_BASE_SCORES).map(t=>[t,trainedRoute==='ANY'||trainedRoute==='P'&&t==='pair'||r2RouteFamilies(t as R2HandType).includes(trainedRoute as 'G'|'S'|'F')?level:1]));
 for(const route of ROUTES){for(const assisted of [false,true]){
  const best=assisted?analysis.skill.current[route]:analysis.plain[route];if(!best.main.length)continue;
  const input={rulesVersion:'r2' as const,runId:reference.runId,rootId:'model-audit/'+route+'/'+assisted,hand,selectedIds:best.main,disabledIds,jokers:[],definitions:r2JokerDefinitionsFor(reference),handLevels:levels,playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:reference.rng.rule,...r2ScoreContext(reference,hand,best.main),...(assisted?{assistIds:best.side}:{})};
  if(assisted)r2AssistFacts({...input,assistIds:best.side});const trace=scoreR2Hand(input);if(Number(trace.finalScore)!==best.score)throw Error('canonical-model-mismatch/'+route+'/'+best.score+'/'+trace.finalScore);checks++;
 }}return checks;
}

export function routeDiscardIds(hand:readonly PlayingCard[],route:Route):string[]{
 const keep=new Set<string>(),points=(c:PlayingCard)=>ordinaryCardPoints(c);
 if(route==='F'){
  const suits=new Map<string,PlayingCard[]>();for(const c of hand)suits.set(c.suit,[...(suits.get(c.suit)??[]),c]);const target=[...suits.values()].sort((a,b)=>b.length-a.length||b.reduce((s,c)=>s+points(c),0)-a.reduce((s,c)=>s+points(c),0))[0];
  target.sort((a,b)=>points(b)-points(a)).slice(0,5).forEach(c=>keep.add(c.id));
 }else if(route==='S'){
  const windows=[ [14,2,3,4,5],...Array.from({length:9},(_,i)=>Array.from({length:5},(_,j)=>i+2+j)) ];
  const ranked=windows.map(ranks=>({ranks,cards:ranks.flatMap(rank=>hand.filter(c=>c.rank===rank).slice(0,1))})).sort((a,b)=>b.cards.length-a.cards.length||b.ranks.at(-1)!-a.ranks.at(-1)!);
  ranked[0].cards.forEach(c=>keep.add(c.id));
 }else{
  const ranks=new Map<number,PlayingCard[]>();for(const c of hand)ranks.set(c.rank,[...(ranks.get(c.rank)??[]),c]);
  [...ranks.values()].filter(g=>g.length>=2).sort((a,b)=>b.length-a.length||points(b[0])-points(a[0])).flat().slice(0,7).forEach(c=>keep.add(c.id));
 }
 const spare=hand.filter(c=>!keep.has(c.id)),groups=new Map<number,PlayingCard[]>();for(const c of spare)groups.set(c.rank,[...(groups.get(c.rank)??[]),c]);
 const pair=[...groups.values()].filter(g=>g.length>=2).sort((a,b)=>b.length-a.length||points(b[0])-points(a[0]))[0];pair?.slice(0,3).forEach(c=>keep.add(c.id));
 for(const c of [...hand].sort((a,b)=>points(b)-points(a)))if(keep.size<3)keep.add(c.id);
 if(keep.size===8)keep.delete([...keep].at(-1)!);return hand.filter(c=>!keep.has(c.id)).map(c=>c.id);
}

export const preparedDeck=(deck:readonly PlayingCard[],kind:'flush26'|'straight20'|'group12')=>kind==='flush26'?deck.map(c=>({...c,suit:c.suit==='clubs'?'hearts' as const:c.suit})):deck.filter(c=>kind==='straight20'?c.rank>=6&&c.rank<=10:[6,8,10].includes(c.rank));
export function sampledHand(deck:readonly PlayingCard[],seed:string){const rng=new SeededRng(seed);return rng.shuffle(deck).slice(0,8);}
