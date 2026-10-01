import { createDeck } from '../cards/deck';
import { R2_JOKERS,R2_IMPLEMENTED_FEATURES,readR2Modifiers,r2GrowthCaps,validR2JokerCounters,supportsR2Joker,type Condition,type R2JokerInstance,type TransactionHookPhase } from '../content/r2Schema';
import { SeededRng } from '../core/SeededRng';
import { CHARACTER_IDS, type CharacterId } from './characters';
import { R2_HAND_TYPES,validateCardInstances, type R2HandType } from './evaluateR2';
import { stableHash } from './hash';
import { MAX_INTEGER_DIGITS,Rational } from './rational';
import type {PlayingCard} from '../cards/types';
import {SUITS} from '../cards/types';
import {R2_AVAILABLE_CHAPTERS,R2_BOSSES,R2_SKIP_CONSUMABLES,drawR2Boss,r2DisabledCards,r2OrdinarySuppression,type R2BossPlan,type R2SkipConsumable,type R2SkipResult} from './r2Chapter';
import { scoreR2Hand, ScoreFault, SCORE_LIMITS, R2_BASE_SCORES, type ScoreTrace } from './scoreR2';
import type { Command, DomainEvent, RunState, StageState } from './run';
import {drawR2Shelf,R2_ECONOMY,r2Price,r2Pool,rerollPrice,salePrice,r2PurchasePrice,type R2ShopState} from './r2Shop';

export const R2_LIMITS = {handSize:8,maxSelected:5,hands:4,discards:3,jokerSlots:5,consumableSlots:2,longTermSlots:4} as const;
export const R2_TARGETS = [400,1000,2400,5600,13000,30000,70000,160000] as const;
export const R2_STARTING_HAND_LEVELS:Partial<Record<CharacterId,Partial<Record<R2HandType,number>>>> = {amo:{'high-card':3}};
export const R2_CONTENT_VERSION = 'quality-r2-content-v5';
export const R2_CONTENT_HASH = stableHash({jokers:R2_JOKERS,features:R2_IMPLEMENTED_FEATURES,limits:R2_LIMITS,economy:R2_ECONOMY,targets:R2_TARGETS,hands:R2_BASE_SCORES,startingHandLevels:R2_STARTING_HAND_LEVELS,score:SCORE_LIMITS,bosses:R2_BOSSES,chapters:R2_AVAILABLE_CHAPTERS,skip:R2_SKIP_CONSUMABLES});
export interface R2StageState extends Omit<StageState,'targetHeat'|'heat'|'previousHandType'> {
  targetHeat:string; heat:string; previousHandType:R2HandType|null; disabledIds:string[]; wagerSelected:boolean; wagerUsed:boolean;
  discardsUsed:number;skipResult:R2SkipResult|null;handLimit:number;previousHandScore:string|null;rescueUsed:boolean;
}
export interface R2RunState extends Omit<RunState,'schemaVersion'|'rulesVersion'|'stage'|'totalHeat'|'jokers'|'lastScore'|'shop'|'boss'|'outcome'> {
  schemaVersion:2; rulesVersion:'r2'; stage:R2StageState|null; totalHeat:string; jokers:R2JokerInstance[];
  lastTrace:ScoreTrace|null; handLevels:Partial<Record<R2HandType,number>>;shop:R2ShopState|null;
  boss:R2BossPlan;seenBossIds:string[];chapterSkipConsumable:R2SkipConsumable;purchaseCoupons:number;safetyNetUsed:boolean;
  outcome:{reason:NonNullable<RunState['outcome']>['reason']|'graybox-complete';stageIndex:number}|null;
}
type Transaction = {ok:true;state:R2RunState;events:DomainEvent[]} | {ok:false;code:string;diagnostic?:{code:string;events:readonly unknown[]}};
const integer = (n:number) => Number.isSafeInteger(n) && n >= 0;
const scoreString = (n:string) => typeof n==='string' && /^(0|[1-9]\d*)$/.test(n) && n.length<=MAX_INTEGER_DIGITS;
const permutation = (a:readonly string[],b:readonly string[]) => a.length===b.length && new Set(a).size===a.length && a.every(id=>b.includes(id));

export function assertR2Invariants(state:R2RunState):void {
  const check=(condition:boolean,label:string)=>{if(!condition)throw new Error(`Run invariant: ${label}`);};
  check(state.schemaVersion===2 && state.rulesVersion==='r2' && state.contentVersion===R2_CONTENT_VERSION && state.contentHash===R2_CONTENT_HASH,'r2 versions');
  const ids=state.deckInstances.map(c=>c.id), zones=[...state.drawPile,...state.handOrder,...state.playedPile,...state.discardPile];
  validateCardInstances(state.deckInstances);
  check(new Set(ids).size===ids.length && new Set(zones).size===zones.length && zones.every(id=>ids.includes(id)) && ids.every(id=>zones.includes(id)||state.destroyedIds.includes(id)),'card conservation');
  check(new Set(state.destroyedIds).size===state.destroyedIds.length && state.destroyedIds.every(id=>ids.includes(id)&&!zones.includes(id)),'destroyed IDs');
  check(state.handOrder.length<=(state.stage?.handLimit??R2_LIMITS.handSize) && integer(state.gold)&&integer(state.commandSeq)&&scoreString(state.totalHeat),'r2 resources');
  check(state.jokers.length<=R2_LIMITS.jokerSlots && new Set(state.jokers.map(j=>j.instanceId)).size===state.jokers.length && new Set(state.jokers.map(j=>j.definitionId)).size===state.jokers.length,'joker slots/IDs');
  check(state.jokers.every(j=>R2_JOKERS.some(d=>d.id===j.definitionId)&&integer(j.paidPrice)),'joker references');
  for(const j of state.jokers){const caps=r2GrowthCaps(R2_JOKERS.find(d=>d.id===j.definitionId)!);
    for(const [key,fraction] of Object.entries(j.growth)){const value=Rational.fromJSON(fraction);check(Object.hasOwn(caps,key)&&value.n>=0n&&value.compare(Rational.fromJSON(caps[key]))<=0,'joker growth/cap');}
    check(validR2JokerCounters(j.definitionId,j.counters),'joker counters/cap');
  }
  check(typeof state.safetyNetUsed==='boolean'&&(!state.safetyNetUsed||state.jokers.every(j=>j.definitionId!=='f07')),'safety-net lifetime');
  check(state.consumables.length<=R2_LIMITS.consumableSlots&&new Set(state.consumables.map(c=>c.instanceId)).size===state.consumables.length&&state.consumables.every(c=>!!c.instanceId&&/^T(0[1-9]|1[0-8])$/.test(c.definitionId)),'consumable schema/slots');
  check(integer(state.purchaseCoupons)&&state.purchaseCoupons<=R2_AVAILABLE_CHAPTERS&&R2_SKIP_CONSUMABLES.includes(state.chapterSkipConsumable),'chapter reward/coupon');
  check(state.chapter>=1&&state.chapter<=R2_AVAILABLE_CHAPTERS&&new Set(state.seenBossIds).size===state.seenBossIds.length&&state.seenBossIds.length===state.chapter&&state.seenBossIds.every(id=>R2_BOSSES.some(b=>b.id===id))&&state.seenBossIds.at(-1)===state.boss.definitionId,'chapter boss history');
  check(state.boss.definitionId==='B03'?SUITS.includes(state.boss.disabledSuit!):state.boss.disabledSuit===null,'boss parameter');
  check(state.longTermItems.length<=R2_LIMITS.longTermSlots&&new Set(state.longTermItems).size===state.longTermItems.length&&state.longTermItems.every(id=>/^U(0[1-9]|1[0-2])$/.test(id)),'long-term schema/slots');
  check(integer(state.stageIndex)&&state.stageIndex<=R2_AVAILABLE_CHAPTERS*3&&(!['shop','stage-ready','await-input','stage-cleared'].includes(state.phase)||state.stageIndex<R2_AVAILABLE_CHAPTERS*3),'available stage/phase');
  if(state.phase==='await-input'||state.phase==='run-lost'&&state.outcome?.reason!=='abandoned')check(state.stage?.index===state.stageIndex,'active stage pointer');
  if(['stage-cleared','run-won'].includes(state.phase))check(state.stage!==null&&state.stage.index+1===state.stageIndex,'completed stage pointer');
  if(state.phase==='run-won')check(state.stageIndex===R2_AVAILABLE_CHAPTERS*3&&state.outcome?.reason==='graybox-complete','graybox completion');
  if(state.stage) {
    check(scoreString(state.stage.heat)&&scoreString(state.stage.targetHeat)&&[state.stage.handsLeft,state.stage.discardsLeft,state.stage.playIndex,state.stage.goldEarned,state.stage.discardsUsed].every(integer),'stage resources');
    check(integer(state.stage.handLimit)&&state.stage.handLimit>=R2_LIMITS.handSize&&state.stage.handLimit<=14,'stage hand limit');
    check(typeof state.stage.rescueUsed==='boolean'&&(!state.stage.rescueUsed||state.safetyNetUsed),'stage rescue');
    check(state.stage.previousHandScore===null||scoreString(state.stage.previousHandScore),'previous hand score');
    check(state.stage.targetHeat===getR2Stage(state.stage.index)?.targetHeat&&state.stage.handsLeft<=R2_LIMITS.hands&&state.stage.handsLeft+state.stage.playIndex===R2_LIMITS.hands+(state.stage.rescueUsed?1:0),'stage target/play budget');
    check(state.stage.discardsLeft<=R2_LIMITS.discards&&state.stage.discardsUsed+state.stage.discardsLeft<=R2_LIMITS.discards+1+R2_LIMITS.consumableSlots,'discard budget with refund/items');
    if(state.stage.skipResult){const s=state.stage,r=s.skipResult!;
      check(s.index%3===0?r.kind==='coupon':s.index%3===1&&r.kind!=='coupon','skip reward stage');
      check(s.heat==='0'&&s.goldEarned===0&&s.clearId===null&&s.playIndex===0&&s.discardsUsed===0&&s.discardsLeft===R2_LIMITS.discards&&state.stageIndex===s.index+1&&(['stage-cleared','shop','stage-ready'].includes(state.phase)||state.phase==='run-lost'&&state.outcome?.reason==='abandoned'),'skip has no success effects');
    }
    check(state.stage.disabledIds.every(id=>ids.includes(id)),'disabled IDs');
  }
  for(const [type,level] of Object.entries(state.handLevels))check(R2_HAND_TYPES.includes(type as R2HandType)&&Number.isInteger(level)&&level!>=1&&level!<=30,'hand levels');
  check(state.phase!=='await-input'||state.stage!==null,'play stage');
  check(state.phase!=='shop'||state.shop!==null,'shop shelf');
  if(state.shop)check(integer(state.shop.rerollCount)&&integer(state.shop.purchases)&&new Set(state.shop.offers.map(o=>o.offerId)).size===state.shop.offers.length&&state.shop.offers.every(o=>R2_JOKERS.some(d=>d.id===o.definitionId)&&o.price===r2Price(o.definitionId)&&typeof o.consumed==='boolean'),'shelf references/prices');
  check(!['run-won','run-lost'].includes(state.phase)||state.outcome!==null,'terminal reason');
  for(const cursor of Object.values(state.rng))SeededRng.restore(cursor);
}
export const r2HandLimit=(state:Pick<R2RunState,'jokers'|'deckInstances'|'destroyedIds'>):number=>Math.min(14,R2_LIMITS.handSize+readR2Modifiers(state.jokers,R2_JOKERS,{deckSize:state.deckInstances.length-state.destroyedIds.length}).handLimitBonus);
export const r2InterestCap=(state:Pick<R2RunState,'jokers'>):number=>5+readR2Modifiers(state.jokers,R2_JOKERS).interestCapBonus;
function refill(state:R2RunState):void {while(state.handOrder.length<(state.stage?.handLimit??R2_LIMITS.handSize)&&state.drawPile.length)state.handOrder.push(state.drawPile.pop()!);}
export function getR2Stage(index:number):{index:number;name:string;intro:string;targetHeat:string}|undefined {
  const base=R2_TARGETS[Math.floor(index/3)];if(!Number.isInteger(index)||index<0||index>=R2_AVAILABLE_CHAPTERS*3||!base)return undefined;
  return {index,name:`第 ${Math.floor(index/3)+1} 章 · ${['暖场','正场','压轴'][index%3]}`,intro:'打到目标热度即可过场，出牌和弃牌次数每场补满。',targetHeat:String(Math.ceil(base*[1,1.5,2][index%3]))};
}
function makeChapter(state:R2RunState):void {
  const rule=SeededRng.restore(state.rng.rule),reward=SeededRng.restore(state.rng.reward);
  state.chapter=Math.floor(state.stageIndex/3)+1;state.boss=drawR2Boss(rule,state.seenBossIds);state.seenBossIds.push(state.boss.definitionId);
  state.chapterSkipConsumable=R2_SKIP_CONSUMABLES[reward.integer(0,R2_SKIP_CONSUMABLES.length-1)];state.rng.rule=rule.snapshot();state.rng.reward=reward.snapshot();
}
function refreshDisabled(state:R2RunState):void {if(state.stage)state.stage.disabledIds=r2DisabledCards(state.boss,state.stage.index,state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!));}
export function r2ScoreContext(state:Pick<R2RunState,'gold'|'stage'|'boss'|'stageIndex'|'jokers'>,hand:readonly PlayingCard[],ids:readonly string[]) {
  return {gold:state.gold,discardsUsed:state.stage?.discardsUsed??0,previousHandScore:state.stage?.previousHandScore??null,handRules:{fourStraight:readR2Modifiers(state.jokers,R2_JOKERS).fourStraight},ordinaryPointsSuppressedIds:r2OrdinarySuppression(state.boss,state.stage?.index??state.stageIndex,hand,ids)};
}
export const r2DiscardCost=(state:Pick<R2RunState,'stage'|'boss'>):number=>state.stage&&state.stage.index%3===2&&state.boss.definitionId==='B01'&&state.stage.playIndex===0?2:1;
function transactionMatches(state:R2RunState,condition:Condition,discarded:readonly PlayingCard[]):boolean {
  switch(condition.kind){
    case 'always':return true;
    case 'resource':return ({gold:state.gold,'hands-after':state.stage?.handsLeft,'play-index':state.stage?.playIndex,'discards-used':state.stage?.discardsUsed})[condition.resource]===condition.equals;
    case 'hand-type-in':return !!state.stage?.previousHandType&&condition.values.includes(state.stage.previousHandType);
    case 'discard-count':return discarded.length===condition.equals;
    case 'discard-same-suit':return discarded.length>=condition.minimum&&discarded.every(c=>c.suit===discarded[0].suit);
    default:throw Error('invalid-economic-condition');
  }
}
function economicHooks(state:R2RunState,phase:TransactionHookPhase,events:DomainEvent[],sources=state.jokers,discarded:readonly PlayingCard[]=[]):void {
  for(const j of sources)for(const hook of R2_JOKERS.find(d=>d.id===j.definitionId)!.hooks){
    if(hook.phase!==phase||!transactionMatches(state,hook.condition,discarded))continue;
    for(const op of hook.operations){let amount='0',resourceBefore:number|undefined,resourceAfter:number|undefined;
      if(op.kind==='add-gold'){resourceBefore=state.gold;state.gold+=op.amount;if(phase==='onStageClear')state.stage!.goldEarned+=op.amount;resourceAfter=state.gold;amount=String(op.amount);}
      else if(op.kind==='add-gold-limited'){
        const count=j.counters?.singleDiscards??0;if(count>=op.limit)continue;
        j.counters={singleDiscards:count+1};resourceBefore=state.gold;state.gold+=op.amount;resourceAfter=state.gold;amount=String(op.amount);
      }
      else if(op.kind==='refund-discard'){resourceBefore=state.stage!.discardsLeft;state.stage!.discardsLeft=Math.min(R2_LIMITS.discards,resourceBefore+op.amount);resourceAfter=state.stage!.discardsLeft;amount=String(resourceAfter-resourceBefore);}
      else if(op.kind==='add-growth'){const before=Rational.fromJSON(j.growth[op.key]??{n:'0',d:'1'}),raw=before.add(Rational.fromJSON(op.value)),cap=Rational.fromJSON(op.cap),next=raw.compare(cap)>0?cap:raw;j.growth[op.key]=next.toJSON();const delta=next.add(before.multiply(new Rational(-1n))).toJSON();amount=`${delta.n}/${delta.d}`;}
      else throw Error('invalid-economic-operation');
      events.push({type:'joker-transaction',phase,definitionId:j.definitionId,instanceId:j.instanceId,operation:op.kind,amount,visibleCondition:structuredClone(hook.condition),...(resourceBefore===undefined?{}:{resourceBefore,resourceAfter:resourceAfter!})});
    }
  }
}
function clearStageEffects(state:R2RunState):void {
  for(const joker of state.jokers)if(joker.definitionId==='c05')joker.growth.pendingHeat={n:'0',d:'1'};
}
function makeShop(state:R2RunState,reset:boolean):void {
  const rng=reset?new SeededRng(`${state.seed}/r2/shop/${state.stageIndex}`):SeededRng.restore(state.rng.shop);
  const count=reset?0:state.shop!.rerollCount+1;
  const ids=drawR2Shelf(rng,r2Pool(state.jokers.map(j=>j.definitionId),state.safetyNetUsed?['f07']:[]),reset&&state.stageIndex===0?state.gold:undefined);
  state.shop={visitIndex:state.stageIndex,rerollCount:count,purchases:reset?0:state.shop!.purchases,offers:ids.map((id,slot)=>({offerId:`${state.runId}/shop/${state.stageIndex}/${count}/${slot}`,definitionId:id,price:r2Price(id),consumed:false}))};
  state.rng.shop=rng.snapshot();
}
function noCards(state:R2RunState,events:DomainEvent[]):void {
  if(!state.handOrder.length&&!state.drawPile.length){clearStageEffects(state);state.phase='run-lost';state.outcome={reason:'no-legal-cards',stageIndex:state.stageIndex};events.push({type:'stage-ended',cleared:false,stage:structuredClone(state.stage!)});}
}
function rescueHand(state:R2RunState,events:DomainEvent[]):boolean {
  if(state.stage!.handsLeft!==0||state.safetyNetUsed)return false;
  const joker=state.jokers.find(j=>R2_JOKERS.find(d=>d.id===j.definitionId)!.hooks.some(h=>h.phase==='beforeFailure'&&h.condition.kind==='exhausted-hands'&&h.operations.some(o=>o.kind==='rescue-hand')));
  if(!joker)return false;
  refill(state);refreshDisabled(state);
  if(!state.handOrder.some(id=>!state.stage!.disabledIds.includes(id)))return false;
  const trace=state.lastTrace!;
  if(trace.events.length+2>SCORE_LIMITS.eventCount)throw new ScoreFault('event-limit',trace.events);
  state.stage!.handsLeft=1;state.stage!.rescueUsed=true;state.safetyNetUsed=true;state.jokers=state.jokers.filter(j=>j.instanceId!==joker.instanceId);
  const condition=Object.freeze({kind:'exhausted-hands' as const}),source={sourceType:'joker' as const,sourceDefinitionId:joker.definitionId,sourceInstanceId:joker.instanceId},eventId=`${trace.rootId}/event/${trace.events.length}`;
  const rescue=Object.freeze({eventId,rootId:trace.rootId,rootEventId:eventId,phase:'beforeFailure' as const,...source,operation:'rescue-hand',value:Object.freeze({n:'1',d:'1'}),before:trace.accumulator,after:trace.accumulator,reasonKey:`${joker.definitionId}.rescue-hand`,visibleCondition:condition,retriggerDepth:0,resourceBefore:0,resourceAfter:1});
  const destroy=Object.freeze({...rescue,eventId:`${trace.rootId}/event/${trace.events.length+1}`,operation:'destroy-joker',value:Object.freeze({n:'0',d:'1'}),reasonKey:`${joker.definitionId}.destroy-joker`,resourceBefore:1,resourceAfter:1});
  const rescuedTrace={...trace,events:[...trace.events,rescue,destroy],destroyedJokerIds:[...trace.destroyedJokerIds,joker.instanceId]};
  Object.freeze(rescuedTrace.events);Object.freeze(rescuedTrace.destroyedJokerIds);state.lastTrace=Object.freeze(rescuedTrace);
  events.push({type:'joker-transaction',phase:'beforeFailure',definitionId:joker.definitionId,instanceId:joker.instanceId,operation:'rescue-hand',amount:'1',resourceBefore:0,resourceAfter:1},{type:'joker-transaction',phase:'beforeFailure',definitionId:joker.definitionId,instanceId:joker.instanceId,operation:'destroy-joker',amount:'0'});
  return true;
}
function persistStageClearSources(state:R2RunState,events:readonly DomainEvent[]):void {
  const sources=events.filter((event):event is Extract<DomainEvent,{type:'joker-transaction'}>=>event.type==='joker-transaction'&&event.phase==='onStageClear'&&event.operation==='add-gold');
  if(!sources.length)return;
  const trace=state.lastTrace!;
  if(trace.events.length+sources.length>SCORE_LIMITS.eventCount)throw new ScoreFault('event-limit',trace.events);
  const rewards=sources.map((source,index)=>{
    if(source.resourceBefore===undefined||source.resourceAfter===undefined||!source.visibleCondition)throw Error('missing-transaction-source');
    const visibleCondition=structuredClone(source.visibleCondition);if(visibleCondition.kind==='hand-type-in')Object.freeze(visibleCondition.values);Object.freeze(visibleCondition);
    const eventId=`${trace.rootId}/event/${trace.events.length+index}`;
    return Object.freeze({eventId,rootId:trace.rootId,rootEventId:eventId,phase:'onStageClear' as const,sourceType:'joker' as const,sourceDefinitionId:source.definitionId,sourceInstanceId:source.instanceId,operation:'add-gold',value:Object.freeze({n:source.amount,d:'1'}),before:trace.accumulator,after:trace.accumulator,reasonKey:`${source.definitionId}.add-gold`,visibleCondition,retriggerDepth:0,resourceBefore:source.resourceBefore,resourceAfter:source.resourceAfter});
  });
  const rewardedTrace={...trace,events:[...trace.events,...rewards]};Object.freeze(rewardedTrace.events);state.lastTrace=Object.freeze(rewardedTrace);
}

/** r2 transactions; the caller appends the receipt and publishes only complete states. */
export function transactR2(input:R2RunState|null,command:Command):Transaction {
  const fail=(code:string):Transaction=>({ok:false,code});
  const action=command.action, events:DomainEvent[]=[];
  let state:R2RunState;
  if(action.type==='StartRun') {
    if(input)return fail('wrong-phase');
    if(action.rulesVersion!=='r2'||typeof action.seed!=='string'||!action.seed||!CHARACTER_IDS.includes(action.characterId))return fail('invalid-start');
    const cards=createDeck();
    state={schemaVersion:2,rulesVersion:'r2',contentVersion:R2_CONTENT_VERSION,contentHash:R2_CONTENT_HASH,runId:command.runId,seed:action.seed,commandSeq:0,difficulty:0,characterId:action.characterId,
      chapter:1,stageIndex:0,phase:'shop',deckInstances:cards,drawPile:cards.map(c=>c.id),handOrder:[],playedPile:[],discardPile:[],destroyedIds:[],stage:null,totalHeat:'0',gold:R2_ECONOMY.initialGold,jokers:[],consumables:[],longTermItems:[],program:null,boss:{definitionId:'B01',disabledSuit:null},seenBossIds:[],chapterSkipConsumable:'T01',purchaseCoupons:0,safetyNetUsed:false,shop:null,
      rng:{deck:new SeededRng(`${action.seed}/r2/deck/0`).snapshot(),rule:new SeededRng(`${action.seed}/r2/rule/0`).snapshot(),shop:new SeededRng(`${action.seed}/r2/shop/0`).snapshot(),reward:new SeededRng(`${action.seed}/r2/reward/0`).snapshot()},
      receipts:[],lastTrace:null,handLevels:structuredClone(R2_STARTING_HAND_LEVELS[action.characterId]??{}),outcome:null};
    makeChapter(state);makeShop(state,true);
  } else {
    if(!input)return fail('run-not-started');
    state=structuredClone(input);
    if(state.longTermItems.length&&action.type!=='AbandonRun')return fail('long-term-not-enabled');
    switch(action.type) {
      case 'LeaveShop':
        if(state.phase!=='shop')return fail('wrong-phase');state.phase='stage-ready';break;
      case 'OpenShop':
        if(state.phase!=='stage-cleared')return fail('wrong-phase');state.phase='shop';if(state.stageIndex%3===0)makeChapter(state);makeShop(state,true);break;
      case 'BuyOffer': {
        if(state.phase!=='shop'||!state.shop)return fail('wrong-phase');
        const offer=state.shop.offers.find(o=>o.offerId===action.offerId);if(!offer)return fail('unknown-offer');
        if(offer.consumed)return fail('consumed-offer');
        if(!R2_JOKERS.some(d=>d.id===offer.definitionId&&supportsR2Joker(d))||state.safetyNetUsed&&offer.definitionId==='f07')return fail('joker-unavailable');
        if(state.jokers.length>=R2_LIMITS.jokerSlots)return fail('slots-full');
        if(state.jokers.some(j=>j.definitionId===offer.definitionId))return fail('already-owned');
        if(offer.price!==r2Price(offer.definitionId))return fail('invalid-offer');
        const price=r2PurchasePrice(state,offer);if(state.gold<price)return fail('not-enough-gold');
        state.gold-=price;offer.consumed=true;state.shop.purchases++;if(state.purchaseCoupons>0)state.purchaseCoupons--;
        economicHooks(state,'onBuyOffer',events,[...state.jokers]);
        state.jokers.push({instanceId:`${state.runId}/joker/${command.commandId}`,definitionId:offer.definitionId,paidPrice:price,growth:{}});break;
      }
      case 'SellJoker': {
        if(state.phase!=='shop')return fail('wrong-phase');
        const index=state.jokers.findIndex(j=>j.instanceId===action.instanceId);if(index<0)return fail('unknown-joker-instance');
        state.gold+=salePrice(state.jokers[index].paidPrice);state.jokers.splice(index,1);economicHooks(state,'onSellJoker',events);break;
      }
      case 'RerollShop': {
        if(state.phase!=='shop'||!state.shop)return fail('wrong-phase');
        if(!r2Pool(state.jokers.map(j=>j.definitionId),state.safetyNetUsed?['f07']:[]).length)return fail('no-reroll-candidates');
        const cost=rerollPrice(state.shop.rerollCount);if(state.gold<cost)return fail('not-enough-gold');
        state.gold-=cost;makeShop(state,false);break;
      }
      case 'EnterStage': {
        if(state.phase!=='stage-ready')return fail('wrong-phase');
        const chapter=Math.floor(state.stageIndex/3),definition=getR2Stage(state.stageIndex);
        if(!definition)return fail('unknown-stage');
        const rng=new SeededRng(`${state.seed}/r2/deck/${state.stageIndex}`);
        state.drawPile=rng.shuffle(state.deckInstances.filter(c=>!state.destroyedIds.includes(c.id))).map(c=>c.id);
        state.handOrder=[];state.playedPile=[];state.discardPile=[];
        state.rng.deck=rng.snapshot();
        state.stage={index:state.stageIndex,targetHeat:definition.targetHeat,heat:'0',handsLeft:R2_LIMITS.hands,discardsLeft:R2_LIMITS.discards,discardsUsed:0,skipResult:null,playIndex:0,previousHandType:null,previousHandScore:null,handLimit:r2HandLimit(state),rescueUsed:false,clearId:null,goldEarned:0,disabledIds:[],wagerSelected:false,wagerUsed:false};
        clearStageEffects(state);for(const joker of state.jokers)if(joker.definitionId==='a07')joker.counters={singleDiscards:0};refill(state);
        refreshDisabled(state);
        state.chapter=chapter+1;state.phase='await-input';state.shop=null;state.lastTrace=null;break;
      }
      case 'SetWager':
        if(state.phase!=='await-input'||!state.stage)return fail('wrong-phase');
        if(state.characterId!=='touye'||typeof action.enabled!=='boolean')return fail('invalid-wager');
        if(state.stage.wagerUsed)return fail('wager-used');
        state.stage.wagerSelected=action.enabled;break;
      case 'ReorderHand':
        if(state.phase!=='await-input')return fail('wrong-phase');
        if(!Array.isArray(action.ids)||!permutation(action.ids,state.handOrder))return fail('invalid-order');
        state.handOrder=[...action.ids];break;
      case 'ReorderJokers':
        if(!['shop','await-input'].includes(state.phase))return fail('wrong-phase');
        if(!Array.isArray(action.ids)||!permutation(action.ids,state.jokers.map(j=>j.instanceId)))return fail('invalid-order');
        state.jokers=action.ids.map(id=>state.jokers.find(j=>j.instanceId===id)!);break;
      case 'DiscardHand': {
        if(state.phase!=='await-input'||!state.stage)return fail('wrong-phase');
        const ids=action.selectedIds;
        if(!Array.isArray(ids)||!ids.length)return fail('empty-selection');
        if(ids.length>R2_LIMITS.maxSelected)return fail('too-many-cards');
        if(new Set(ids).size!==ids.length)return fail('duplicate-card');
        if(ids.some(id=>!state.handOrder.includes(id)))return fail('unknown-card');
        if(state.stage.discardsLeft<=0)return fail('no-discards-left');
        const discardCost=r2DiscardCost(state);
        if(state.stage.discardsLeft<discardCost)return fail('not-enough-discards');
        const ordered=state.handOrder.filter(id=>ids.includes(id));state.handOrder=state.handOrder.filter(id=>!ids.includes(id));
        state.discardPile.push(...ordered);state.stage.discardsLeft-=discardCost;state.stage.discardsUsed++;economicHooks(state,'onDiscard',events,state.jokers,ordered.map(id=>state.deckInstances.find(c=>c.id===id)!));refill(state);refreshDisabled(state);
        events.push({type:'cards-discarded',cardIds:ordered,discardsLeft:state.stage.discardsLeft});noCards(state,events);break;
      }
      case 'UseConsumable': {
        if(!['shop','await-input'].includes(state.phase))return fail('wrong-phase');
        const index=state.consumables.findIndex(c=>c.instanceId===action.instanceId);if(index<0)return fail('unknown-consumable');
        const item=state.consumables[index];if(!R2_SKIP_CONSUMABLES.includes(item.definitionId as R2SkipConsumable))return fail('consumable-not-enabled');
        const ids=action.targetIds;if(!Array.isArray(ids)||new Set(ids).size!==ids.length)return fail('invalid-targets');
        if(item.definitionId==='T01'){
          if(ids.length||!action.handType||!Object.hasOwn(state.handLevels,action.handType))return fail('undiscovered-hand-type');
          const level=state.handLevels[action.handType]!;if(level>=30)return fail('hand-level-cap');state.handLevels[action.handType]=level+1;
        }else if(item.definitionId==='T17'){
          if(ids.length||action.handType||state.phase!=='await-input'||!state.stage)return fail('wrong-consumable-target');
          if(state.stage.discardsLeft>=R2_LIMITS.discards)return fail('no-effect');state.stage.discardsLeft++;
        }else{
          if(action.handType||ids.length<1||ids.length>3)return fail('invalid-targets');
          const eligible=state.phase==='shop'?state.deckInstances.map(c=>c.id).filter(id=>!state.destroyedIds.includes(id)):state.handOrder;
          if(ids.some(id=>!eligible.includes(id)))return fail('unavailable-target');
          const suit=({T03:'hearts',T04:'diamonds',T05:'clubs',T06:'spades'} as const)[item.definitionId as 'T03'|'T04'|'T05'|'T06'];
          const targets=state.deckInstances.filter(c=>ids.includes(c.id));if(targets.every(c=>c.suit===suit))return fail('no-effect');
          for(const c of targets)c.suit=suit;refreshDisabled(state);
        }
        state.consumables.splice(index,1);break;
      }
      case 'DestroyConsumable': {
        if(!['shop','await-input'].includes(state.phase))return fail('wrong-phase');
        const index=state.consumables.findIndex(c=>c.instanceId===action.instanceId);if(index<0)return fail('unknown-consumable');
        state.consumables.splice(index,1);break;
      }
      case 'PlayHand': {
        if(state.phase!=='await-input'||!state.stage)return fail('wrong-phase');
        const ids=action.selectedIds;
        if(!Array.isArray(ids)||!ids.length)return fail('empty-selection');
        if(ids.length>R2_LIMITS.maxSelected)return fail('too-many-cards');
        if(new Set(ids).size!==ids.length)return fail('duplicate-card');
        if(ids.some(id=>!state.handOrder.includes(id)))return fail('unknown-card');
        if(state.stage.handsLeft<=0)return fail('no-hands-left');
        let trace:ScoreTrace;
        try {trace=scoreR2Hand({rulesVersion:'r2',runId:state.runId,rootId:`${state.runId}/hand/${command.commandId}`,characterId:state.characterId,
          hand:state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!),selectedIds:ids,disabledIds:state.stage.disabledIds,jokers:state.jokers,definitions:R2_JOKERS,
          handLevels:state.handLevels,playIndex:state.stage.playIndex+1,handsBeforePlay:state.stage.handsLeft,previousHandType:state.stage.previousHandType,wager:state.stage.wagerSelected,rng:state.rng.rule,...r2ScoreContext(state,state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!),ids)});}
        catch(error) {return {ok:false,code:'score-diagnostic',diagnostic:{code:error instanceof ScoreFault?error.code:error instanceof Error?error.message:'score-error',events:error instanceof ScoreFault?error.events:[]}};}
        state.rng.rule={...trace.rng};state.lastTrace=trace;state.jokers=structuredClone(trace.jokers);state.handLevels[trace.handType]??=1;
        const heat=(BigInt(state.stage.heat)+BigInt(trace.finalScore)).toString();
        if(!scoreString(heat))return {ok:false,code:'score-diagnostic',diagnostic:{code:'numeric-length-limit',events:trace.events}};
        state.stage.heat=heat;
        state.stage.handsLeft--;state.stage.playIndex++;state.stage.previousHandType=trace.handType;state.stage.previousHandScore=trace.finalScore;
        if(state.stage.wagerSelected)state.stage.wagerUsed=true;
        state.stage.wagerSelected=false;
        state.handOrder=[...trace.sets.heldIds];state.playedPile.push(...trace.sets.playedIds);
        const scoredEvent:Extract<DomainEvent,{type:'hand-scored-r2'}>={type:'hand-scored-r2',score:trace,playedIds:trace.sets.playedIds,playIndex:state.stage.playIndex};events.push(scoredEvent);
        if(BigInt(state.stage.heat)>=BigInt(state.stage.targetHeat)) {
          const total=(BigInt(state.totalHeat)+BigInt(state.stage.heat)).toString();
          if(!scoreString(total))return {ok:false,code:'score-diagnostic',diagnostic:{code:'numeric-length-limit',events:trace.events}};
          const reward=[4,5,7][state.stageIndex%3]+state.stage.handsLeft+Math.min(r2InterestCap(state),Math.floor(state.gold/5))+(state.characterId==='xiemu'&&state.stage.handsLeft===0?2:0);
          state.stage.goldEarned=reward;state.stage.clearId=`${state.runId}/clear/${state.stageIndex}`;
          state.gold+=reward;economicHooks(state,'onStageClear',events);
          try{persistStageClearSources(state,events);scoredEvent.score=state.lastTrace!;}
          catch(error){return {ok:false,code:'score-diagnostic',diagnostic:{code:error instanceof ScoreFault?error.code:error instanceof Error?error.message:'score-error',events:error instanceof ScoreFault?error.events:[]}};}
          clearStageEffects(state);state.totalHeat=total;state.stageIndex++;
          state.phase=state.stageIndex===R2_AVAILABLE_CHAPTERS*3?'run-won':'stage-cleared';
          if(state.phase==='run-won')state.outcome={reason:'graybox-complete',stageIndex:state.stage.index};
          events.push({type:'stage-ended',cleared:true,stage:structuredClone(state.stage)});
        } else if(state.stage.handsLeft===0) {
          try {
            if(rescueHand(state,events))scoredEvent.score=state.lastTrace!;
            else{clearStageEffects(state);state.phase='run-lost';state.outcome={reason:'hands-exhausted',stageIndex:state.stage.index};events.push({type:'stage-ended',cleared:false,stage:structuredClone(state.stage)});}
          } catch(error){return {ok:false,code:'score-diagnostic',diagnostic:{code:error instanceof ScoreFault?error.code:error instanceof Error?error.message:'score-error',events:error instanceof ScoreFault?error.events:[]}};}
        } else {
          refill(state);refreshDisabled(state);
          noCards(state,events);
        }
        break;
      }
      case 'SkipStage': {
        if(!['shop','stage-ready'].includes(state.phase))return fail('wrong-phase');
        if(state.stageIndex%3===2)return fail('boss-cannot-skip');
        const definition=getR2Stage(state.stageIndex);if(!definition)return fail('unknown-stage');
        let skipResult:R2SkipResult;
        if(state.stageIndex%3===0){state.purchaseCoupons++;skipResult={kind:'coupon',amount:2};}
        else if(state.consumables.length<R2_LIMITS.consumableSlots){state.consumables.push({instanceId:`${state.runId}/skip/${state.stageIndex}`,definitionId:state.chapterSkipConsumable});skipResult={kind:'consumable',definitionId:state.chapterSkipConsumable};}
        else{state.gold++;skipResult={kind:'gold',amount:1};}
        state.discardPile.push(...state.handOrder);state.handOrder=[];clearStageEffects(state);
        state.stage={index:state.stageIndex,targetHeat:definition.targetHeat,heat:'0',handsLeft:R2_LIMITS.hands,discardsLeft:R2_LIMITS.discards,discardsUsed:0,skipResult,playIndex:0,previousHandType:null,previousHandScore:null,handLimit:r2HandLimit(state),rescueUsed:false,clearId:null,goldEarned:0,disabledIds:[],wagerSelected:false,wagerUsed:false};
        state.stageIndex++;state.phase='stage-cleared';state.shop=null;state.lastTrace=null;events.push({type:'stage-skipped',stage:structuredClone(state.stage)});break;
      }
      case 'AbandonRun':
        if(['run-won','run-lost'].includes(state.phase))return fail('wrong-phase');
        clearStageEffects(state);state.phase='run-lost';state.outcome={reason:'abandoned',stageIndex:state.stageIndex};events.push({type:'run-abandoned'});break;
      default:return fail('r2-interaction-not-enabled');
    }
  }
  if(!integer(state.gold))return fail('resource-overflow');
  return {ok:true,state,events};
}
