import type {PlayingCard} from '../../src/cards/types';
import {r2Price} from '../../src/domain/r2Shop';
import {SeededRng} from '../../src/core/SeededRng';
import {r2CreateJoker} from '../../src/domain/r2Run';
import {R2_ROUTE_GROWTH_JOKERS} from '../../src/content/r2RouteGrowthJokers';
import {R2_ACTIVE_MULT_VERSION,R2_ACTIVE_MULT_HASH,R2_ROUTE_GROWTH_VERSION,R2_ROUTE_GROWTH_HASH} from '../../src/domain/r2GroupUpgrade';
import {touyeSnapshotToken,type TouyeCommit,type TouyeTarget} from '../../src/domain/r2TouyeWager';
import type {ScoreInput} from '../../src/domain/scoreR2';
import {createRun,type R2RunState,type Action} from '../../src/domain/run';
import {completeControlledRouteHistory} from './route-growth-history';
import {touyeSend} from './touye-new-core';
export const activeIdentity={contentVersion:R2_ACTIVE_MULT_VERSION,contentHash:R2_ACTIVE_MULT_HASH};
export const routeIdentity={contentVersion:R2_ROUTE_GROWTH_VERSION,contentHash:R2_ROUTE_GROWTH_HASH};
const suits=['hearts','spades','clubs','diamonds'] as const;
export function activeCards(ranks:number[],paper=0,sameSuit=false):PlayingCard[]{return ranks.map((rank,i)=>({id:`${sameSuit?'hearts':suits[i%4]}-${rank}-${i}`,rank:rank as PlayingCard['rank'],suit:sameSuit?'hearts':suits[i%4],...(i<paper?{enhancement:'multiplier-paper' as const}:{})}));}
export function activeJoker(id:string,growth={},edition?:PlayingCard['edition']){const j=r2CreateJoker(id,id,r2Price(id,edition,activeIdentity),edition,activeIdentity);return {...j,growth:{...j.growth,...growth}};}
export function activeScoreInput(hand:PlayingCard[],jokers:ScoreInput['jokers']=[],extra:Partial<ScoreInput>={}):ScoreInput{return {rulesVersion:'r2',runId:'p1a/scorer',rootId:'p1a/scorer/hand',characterId:'neutral',hand,selectedIds:hand.map(c=>c.id),disabledIds:[],jokers,definitions:R2_ROUTE_GROWTH_JOKERS,handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:new SeededRng('p1a-public').snapshot(),amoScoreTiming:'assist-v1',jokerSlots:5,routeGrowth:{clears:0,G:0,S:0,F:0},gold:0,...extra};}
export function g14Input():ScoreInput{
 const hand=activeCards([8,9,10,11,12],5),cold=activeJoker('f10',{},'foil');cold.counters={rescueArmed:true};
 return activeScoreInput(hand,[activeJoker('c04',{heat:{n:'100',d:'1'}}),cold,activeJoker('e08'),activeJoker('a06'),activeJoker('e10')],{characterId:'xiemu',handLevels:{straight:19},routeGrowth:{clears:23,G:0,S:21,F:0},gold:159,xiemuBurn:{cost:30,goldBefore:189,beforeUsed:false},discardsUsed:1});
}
export function g15Input():ScoreInput{
 const hand=activeCards([10,11,10,12,14],2,true),cold=activeJoker('f10');cold.counters={rescueArmed:true};
 return activeScoreInput(hand,[cold,activeJoker('c06',{multiplier:{n:'6',d:'1'}}),activeJoker('e03'),activeJoker('jiedongfeng'),activeJoker('tiesuanpan',{},'foil')],{characterId:'xiemu',boss:{definitionId:'B13',disabledSuit:null},handLevels:{flush:11},routeGrowth:{clears:23,G:0,S:0,F:23},gold:154,xiemuBurn:{cost:30,goldBefore:184,beforeUsed:false},discardsUsed:1});
}
/** Reconstructed from the supplied H457/M17.5 counters, not an archived natural hand. */
export function g18Input(target:TouyeTarget='flush',newCore=false):ScoreInput{
 const main=activeCards([6,11,12,13,14],4,true),held:PlayingCard[]=[{id:'held-j',rank:11,suit:'spades'},{id:'held-q',rank:12,suit:'diamonds'}],hand=[...main,...held];
 const replaced:PlayingCard={id:'discard-old',rank:5,suit:'diamonds'},handBefore=[...main.slice(0,4),replaced,...held],selectedIds=[replaced.id],rules={fourStraight:false,fourFlush:false};
 const commit:TouyeCommit={target,stageIndex:18,duePlayIndex:1,discardCommandId:'p1a/discard',expectedSeq:7,handBefore,rules,selectedIds,snapshotToken:touyeSnapshotToken(handBefore,rules,18,1,7),...(newCore?{refill:{handLimit:8,handAfter:[...main.slice(0,4),...held,main[4]].map(c=>c.id),refilledIds:[main[4].id]}}:{})};
 return activeScoreInput(hand,[activeJoker('c06',{multiplier:{n:'6',d:'1'}}),activeJoker('a06'),activeJoker('d01')],{selectedIds:main.map(c=>c.id),characterId:'touye',handLevels:{flush:10},routeGrowth:{clears:18,G:0,S:0,F:18},touyeWager:{commit,...(newCore?{newCore:true as const}:{})},discardsUsed:1});
}
/** Bounded legal first-stage import; no resource/rule edits happen after import. */
export function activeRunFixture(hero:'xiemu'|'azao',gold=60,stageIndex=0,identity=activeIdentity){
 let s=createRun({rulesVersion:'r2',characterId:hero,seed:'p1a-bounded',runId:'p1a/'+hero,r2Identity:identity,openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 s.gold=gold;s.jokers=[r2CreateJoker('e03','e03',6,'foil',s),r2CreateJoker('c06','c06',6,'polychrome',s),r2CreateJoker('e08','e08',8,undefined,s)];s.jokers[1].growth.multiplier={n:'6',d:'1'};
 s=touyeSend(s,{type:'LeaveShop'});
 if(stageIndex){s.stageIndex=stageIndex;s.chapter=Math.floor(stageIndex/3)+1;s.shop!.visitIndex=stageIndex;const ids=['B01','B02','B05','B06','B07','B08','B13','B14'] as const;s.seenBossIds=ids.slice(0,s.chapter);s.boss={definitionId:ids[s.chapter-1],disabledSuit:null};completeControlledRouteHistory(s);}
 s=touyeSend(s,{type:'EnterStage'});
 if(hero==='azao'){
  // A real legal first two-pair creates charge. It stays below the first target.
  s.jokers=[s.jokers[1]];s.jokers[0].growth.multiplier={n:'1',d:'2'};s.jokers[0].edition='holographic';s.stage!.initialJokerIds=s.jokers.map(j=>j.instanceId);s=arrangeActiveRun(s,['hearts-2','spades-2','clubs-3','diamonds-3']);s=touyeSend(s,{type:'PlayHand',selectedIds:s.handOrder});
 }
 s=arrangeActiveRun(s,['hearts-4','hearts-6','hearts-8','hearts-10','hearts-12']);
 const action:Action={type:'PlayHand',selectedIds:[...s.handOrder],...(hero==='xiemu'?{xiemuBurn:30 as const}:{azaoRelease:true})};
 return {state:s,action};
}
export function arrangeActiveRun(input:R2RunState,ids:string[]):R2RunState {
 const s=structuredClone(input);s.handOrder=ids;s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id)&&!s.playedPile.includes(id)&&!s.discardPile.includes(id));return s;
}
export function g17Input():ScoreInput{
 const hand=activeCards([10,11,12,13,14],1);
 return activeScoreInput(hand,[activeJoker('c04',{heat:{n:'100',d:'1'}}),activeJoker('d11'),activeJoker('d09',{multiplier:{n:'3',d:'1'}})],{characterId:'touye',touyeWager:{commit:null,newCore:true},handLevels:{straight:16},routeGrowth:{clears:23,G:0,S:23,F:0},boss:{definitionId:'B16',disabledSuit:null},gold:100});
}
/** Planted legal public shelf for the exact original SellJoker→BuyOffer price path. */
export function activeSwapFixture(id:'d11'|'e10',replacement:'f03'|'d07'){
 let s=createRun({rulesVersion:'r2',characterId:'touye',seed:'p1a-price-branch',runId:'p1a/price/'+id,r2Identity:activeIdentity,openingRoute:'straight',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 s=touyeSend(s,{type:'ReorderJokers',ids:[]});
 s.jokers=[r2CreateJoker(id,id,id==='d11'?8:6,undefined,s)];s.gold=id==='d11'?0:1;
 let offer=s.shop!.offers.find(o=>o.definitionId===replacement);if(!offer){offer={offerId:'p1a/public/'+replacement,definitionId:replacement,price:4,consumed:false,edition:'none'};s.shop!.offers[0]=offer;}
 return {state:s,sell:{type:'SellJoker' as const,instanceId:id},buy:{type:'BuyOffer' as const,offerId:offer.offerId}};
}

export function activeRefundFixture(identity=activeIdentity){
 let s=activeRunFixture('xiemu',30,12,identity).state;
 s.jokers=[r2CreateJoker('c06','c06',6,undefined,s),r2CreateJoker('b12','b12',8,undefined,s)];s.jokers[0].growth.multiplier={n:'6',d:'1'};s.stage!.initialJokerIds=s.jokers.map(j=>j.instanceId);
 s=arrangeActiveRun(s,['hearts-2','spades-2','clubs-2','diamonds-2']);
 return {state:s,action:{type:'PlayHand' as const,selectedIds:s.handOrder,xiemuBurn:30 as const}};
}
