import {r2TransactionConditionMatches} from './r2Conditions';
import { createDeck } from '../cards/deck';
import { R2_JOKERS,R2_IMPLEMENTED_FEATURES,readR2Modifiers,r2GrowthCaps,r2GrowthInitials,r2GrowthMinimums,validR2JokerCounters,supportsR2Joker,type Condition,type R2JokerInstance,type TransactionHookPhase } from '../content/r2Schema';
import { SeededRng } from '../core/SeededRng';
import {R2_MODE_CATALOG,resolveR2ModeConfig,r2RunModeConfig,r2ModeSeedAllowed,type R2ModeId,type R2Difficulty,type R2ChallengeId} from '../content/r2Modes';
import {lockR2ProgramChapter,chooseR2Program,abandonR2Program,sealR2ProgramChoice,r2ProgramQualified,r2ProgramUpgradeCandidates,r2ProgramStateValid,type R2ProgramState} from './r2Programs';
import { CHARACTER_IDS, type CharacterId } from './characters';
import { R2_HAND_TYPES,validateCardInstances, type R2HandType } from './evaluateR2';
import { stableHash } from './hash';
import { MAX_INTEGER_DIGITS,Rational } from './rational';
import type {PlayingCard} from '../cards/types';
import {EDITIONS,type Edition} from '../cards/types';
import {R2_LIMITS,R2_RESOURCE_CONTRACT,r2HandLimit,r2HandsBudget,r2DiscardBudget,r2ConsumableCapacity,r2InterestCap,r2JokerCapacity,r2ItemAmount as itemAmount} from './r2Resources';
export {R2_LIMITS,R2_RESOURCE_CONTRACT,r2HandLimit,r2HandsBudget,r2DiscardBudget,r2ConsumableCapacity,r2InterestCap} from './r2Resources';
import {R2_ENHANCEMENTS,R2_LONG_TERM_ITEMS,R2_TOOLS,R2_TOOL_CATALOG} from '../content/r2Tools';
import {R2_IMPLEMENTED_TOOL_FEATURES,R2_IMPLEMENTED_ITEM_IDS,r2CardSpecialsSupported,r2CardSpecialsAllowed,r2ToolAllowed,r2EditionSupported,r2ItemSupported,r2ToolSupported} from './r2ToolRuntime';
import {applyR2Tool} from './r2ToolCommands';
import {R2_TARGETS,R2_AVAILABLE_CHAPTERS,R2_ENDLESS_MAX_CHAPTER,R2_ENDLESS_CONTRACT,R2_BOSSES,R2_SKIP_CONSUMABLES,r2StageSpec,drawR2Boss,r2BossHistoryValid,r2BossPlanValid,r2DisabledCards,r2OrdinarySuppression,type R2TourMode,type R2BossPlan,type R2SkipConsumable,type R2SkipResult} from './r2Chapter';
export {R2_TARGETS} from './r2Chapter';
import { scoreR2Hand, ScoreFault, SCORE_LIMITS, R2_BASE_SCORES, type ScoreTrace, type ScoreEvent } from './scoreR2';
import type { Command, DomainEvent, RunState, StageState } from './run';
import {drawR2Shelf,drawR2Edition,drawR2Tool,drawR2Items,R2_ECONOMY,r2Price,r2ToolPrice,r2ItemPrice,r2ToolAcquisitionPool,r2Pool,r2PaidRerollPrice,salePrice,r2PurchasePrice,type R2ShopState} from './r2Shop';

export const R2_STARTING_HAND_LEVELS:Partial<Record<CharacterId,Partial<Record<R2HandType,number>>>> = {amo:{'high-card':3}};
export const R2_MODE_RUNTIME_CONTRACT=Object.freeze({version:'explicit-v10',programStream:'seed/r2/program/0',challengeStream:'seed/r2/challenge/0',
  programChoice:'once-before-first-stage',programPayout:'once-on-chapter-boss-success',programCoupon:'next-shop-only',challengeBan:'published72-definition-scoring-and-edition',
  legacy:'preserve-original-no-migration',partition:'mode-challenge-difficulty-program-flag'});
export const R2_CONTENT_VERSION = 'quality-r2-content-v10';
export const R2_CONTENT_HASH = stableHash({jokers:R2_JOKERS,features:R2_IMPLEMENTED_FEATURES,tools:R2_TOOL_CATALOG,toolFeatures:R2_IMPLEMENTED_TOOL_FEATURES,itemIds:R2_IMPLEMENTED_ITEM_IDS,resources:R2_RESOURCE_CONTRACT,limits:R2_LIMITS,economy:R2_ECONOMY,targets:R2_TARGETS,hands:R2_BASE_SCORES,startingHandLevels:R2_STARTING_HAND_LEVELS,score:SCORE_LIMITS,bosses:R2_BOSSES,chapters:R2_AVAILABLE_CHAPTERS,endless:R2_ENDLESS_CONTRACT,skip:R2_SKIP_CONSUMABLES,modes:R2_MODE_CATALOG,modeRuntime:R2_MODE_RUNTIME_CONTRACT});
export interface R2StageState extends Omit<StageState,'targetHeat'|'heat'|'previousHandType'> {
  targetHeat:string; heat:string; previousHandType:R2HandType|null; disabledIds:string[]; wagerSelected:boolean; wagerUsed:boolean;
  discardsUsed:number;skipResult:R2SkipResult|null;handLimit:number;previousHandScore:string|null;rescueUsed:boolean;
  initialHands:number;initialDiscards:number;discardSpent:number;discardGained:number;doubleDiscardBeforeFirstPlay:boolean;
  maxPlayedCount:number;ordinaryStraightSeen:boolean;ordinaryFlushSeen:boolean;quadRefundUsed:boolean;jokerSold:boolean;
  boss:R2BossPlan|null;initialTargetHeat:string;initialHandLimit:number;initialJokerIds:string[];sealedJokerIds:string[];
  challengeDisabledJokerId:string|null;
}
export interface R2RunState extends Omit<RunState,'schemaVersion'|'rulesVersion'|'stage'|'totalHeat'|'jokers'|'lastScore'|'shop'|'boss'|'outcome'|'difficulty'|'program'|'rng'> {
  schemaVersion:2; rulesVersion:'r2'; stage:R2StageState|null; totalHeat:string; jokers:R2JokerInstance[];
  lastTrace:ScoreTrace|null; handLevels:Partial<Record<R2HandType,number>>;shop:R2ShopState|null;
  boss:R2BossPlan;seenBossIds:string[];chapterSkipConsumable:R2SkipConsumable;purchaseCoupons:number;safetyNetUsed:boolean;
  spectralModifiers:{handsPenalty:number;handPenalty:number;cleanSlateBonus:number};supplyRewardClaimed:boolean;
  chapterHandUsage:Partial<Record<R2HandType,number>>;normalClearClaimed:boolean;
  tourMode:R2TourMode;normalCompletion:{clearId:string;totalHeat:string}|null;
  mode:R2ModeId;difficulty:R2Difficulty;challengeId:R2ChallengeId|null;programsEnabled:boolean;
  program:R2ProgramState|null;programRerollCoupon:boolean;chapterDisabledJokerId:string|null;
  rng:RunState['rng']&{program:RunState['rng']['rule'];challenge:RunState['rng']['rule']};
  outcome:{reason:NonNullable<RunState['outcome']>['reason']|'graybox-complete';stageIndex:number}|null;
}
type Transaction = {ok:true;state:R2RunState;events:DomainEvent[]} | {ok:false;code:string;diagnostic?:{code:string;events:readonly unknown[]}};
const integer = (n:number) => Number.isSafeInteger(n) && n >= 0;
const scoreString = (n:string) => typeof n==='string' && /^(0|[1-9]\d*)$/.test(n) && n.length<=MAX_INTEGER_DIGITS;
const permutation = (a:readonly string[],b:readonly string[]) => a.length===b.length && new Set(a).size===a.length && a.every(id=>b.includes(id));

/** Initial values belong to creation, never restoration of an incomplete instance. */
export function r2CreateJoker(definitionId:string,instanceId:string,paidPrice:number,edition?:Edition):R2JokerInstance {
  const definition=R2_JOKERS.find(definition=>definition.id===definitionId);
  if(!definition||!supportsR2Joker(definition))throw Error('unavailable-joker-definition');
  return {instanceId,definitionId,paidPrice,growth:structuredClone(r2GrowthInitials(definition)),
    ...(definitionId==='e10'?{counters:{stageClears:0 as const}}:{}),...(edition===undefined?{}:{edition})};
}

export function assertR2Invariants(state:R2RunState):void {
  const check=(condition:boolean,label:string)=>{if(!condition)throw new Error(`Run invariant: ${label}`);};
  check(state.schemaVersion===2 && state.rulesVersion==='r2' && state.contentVersion===R2_CONTENT_VERSION && state.contentHash===R2_CONTENT_HASH,'r2 versions');
  const config=r2RunModeConfig(state);
  check(r2ModeSeedAllowed(config,state.seed)&&(config.mode!=='tutorial'||state.characterId==='erxiang'),'mode seed/identity');
  check(state.mode==='standard'||state.tourMode==='normal','mode tour');
  check(r2ProgramStateValid(state.program,config,state.chapter),'program snapshot');
  check(typeof state.programRerollCoupon==='boolean'&&(!state.programRerollCoupon||config.reroll.allowed),'program coupon');
  check(config.chapterJokerBanCount===1?R2_JOKERS.some(definition=>definition.id===state.chapterDisabledJokerId):state.chapterDisabledJokerId===null,'chapter challenge ban');
  const ids=state.deckInstances.map(c=>c.id), zones=[...state.drawPile,...state.handOrder,...state.playedPile,...state.discardPile];
  validateCardInstances(state.deckInstances);
  check(state.deckInstances.length-state.destroyedIds.length<=R2_RESOURCE_CONTRACT.deckMaximum&&state.deckInstances.every(card=>r2CardSpecialsSupported(card)&&r2CardSpecialsAllowed(state,card)),'executable card specials/deck maximum');
  check(new Set(ids).size===ids.length && new Set(zones).size===zones.length && zones.every(id=>ids.includes(id)) && ids.every(id=>zones.includes(id)||state.destroyedIds.includes(id)),'card conservation');
  check(new Set(state.destroyedIds).size===state.destroyedIds.length && state.destroyedIds.every(id=>ids.includes(id)&&!zones.includes(id)),'destroyed IDs');
  check(state.handOrder.length<=(state.stage?.handLimit??config.baseHandSize) && integer(state.gold)&&integer(state.commandSeq)&&scoreString(state.totalHeat),'r2 resources');
  check(state.jokers.length<=r2JokerCapacity(state) && new Set(state.jokers.map(j=>j.instanceId)).size===state.jokers.length && new Set(state.jokers.map(j=>j.definitionId)).size===state.jokers.length,'joker slots/IDs');
  check(state.jokers.every(j=>R2_JOKERS.some(d=>d.id===j.definitionId)&&integer(j.paidPrice)&&(j.edition===undefined||EDITIONS.includes(j.edition))&&r2EditionSupported(j.edition)),'joker references/edition');
  for(const j of state.jokers){const caps=r2GrowthCaps(R2_JOKERS.find(d=>d.id===j.definitionId)!);
    for(const [key,fraction] of Object.entries(j.growth)){const value=Rational.fromJSON(fraction);check(Object.hasOwn(caps,key)&&value.n>=0n&&value.compare(Rational.fromJSON(caps[key]))<=0,'joker growth/cap');}
    check(validR2JokerCounters(j.definitionId,j.counters),'joker counters/cap');
    const definition=R2_JOKERS.find(d=>d.id===j.definitionId)!,initials=r2GrowthInitials(definition);
    for(const [key,minimum] of Object.entries(r2GrowthMinimums(definition))){
      check(!Object.hasOwn(initials,key)||Object.hasOwn(j.growth,key),'joker required growth');
      if(Object.hasOwn(j.growth,key))check(Rational.fromJSON(j.growth[key]).compare(Rational.fromJSON(minimum))>=0,'joker growth/minimum');
    }
  }
  check(typeof state.safetyNetUsed==='boolean'&&(!state.safetyNetUsed||state.jokers.every(j=>j.definitionId!=='f07')),'safety-net lifetime');
  check(state.consumables.length<=r2ConsumableCapacity(state)&&new Set(state.consumables.map(c=>c.instanceId)).size===state.consumables.length&&state.consumables.every(c=>!!c.instanceId&&r2ToolSupported(c.definitionId)&&r2ToolAllowed(state,c.definitionId)),'consumable schema/slots/capability');
  check(state.tourMode==='normal'||state.tourMode==='endless','tour mode');
  const chapterMaximum=state.tourMode==='endless'?R2_ENDLESS_MAX_CHAPTER:R2_AVAILABLE_CHAPTERS;
  check(integer(state.purchaseCoupons)&&state.purchaseCoupons<=chapterMaximum&&R2_SKIP_CONSUMABLES.includes(state.chapterSkipConsumable),'chapter reward/coupon');
  check(state.chapter<=chapterMaximum&&r2BossHistoryValid(state.seenBossIds,state.chapter,state.tourMode)&&state.seenBossIds.at(-1)===state.boss.definitionId,'chapter boss history');
  check(r2BossPlanValid(state.boss),'boss parameter');
  check(state.longTermItems.length<=R2_LIMITS.longTermSlots&&new Set(state.longTermItems).size===state.longTermItems.length&&state.longTermItems.every(r2ItemSupported),'long-term schema/slots/capability');
  const m=state.spectralModifiers;
  check(!!m&&integer(m.handsPenalty)&&m.handsPenalty<=2&&integer(m.handPenalty)&&m.handPenalty<=2&&integer(m.cleanSlateBonus)&&m.cleanSlateBonus<=1,'spectral modifier bounds');
  check(R2_IMPLEMENTED_TOOL_FEATURES.includes('permanent-resources')||Object.values(m).every(value=>value===0),'executable spectral modifiers');
  check(typeof state.supplyRewardClaimed==='boolean'&&typeof state.normalClearClaimed==='boolean','saved reward qualifications');
  check(R2_IMPLEMENTED_TOOL_FEATURES.includes('first-boss-supply')||!state.supplyRewardClaimed,'executable first-boss reward');
  check(Object.entries(state.chapterHandUsage).every(([type,count])=>R2_HAND_TYPES.includes(type as R2HandType)&&integer(count)&&Object.hasOwn(state.handLevels,type)),'chapter hand usage');
  check(Object.values(state.chapterHandUsage).reduce((sum,count)=>sum+BigInt(count!),0n)<=BigInt(state.commandSeq),'chapter use count budget');
  check(integer(state.stageIndex)&&state.stageIndex<=chapterMaximum*3&&(!['shop','stage-ready','await-input'].includes(state.phase)||state.stageIndex<chapterMaximum*3),'available stage/phase');
  if(state.phase==='stage-cleared')check(state.stageIndex<chapterMaximum*3||state.tourMode==='endless','available cleared stage');
  const completion=state.normalCompletion;
  if(completion!==null)check(!!completion&&Object.keys(completion).length===2&&completion.clearId===`${state.runId}/clear/23`&&scoreString(completion.totalHeat)&&BigInt(completion.totalHeat)>0n&&BigInt(completion.totalHeat)<=BigInt(state.totalHeat),'normal clear qualification');
  if(state.tourMode==='endless')check(completion!==null&&state.chapter>=9&&state.stageIndex>=24&&state.phase!=='run-won','qualified endless tour');
  else check(state.phase==='run-won'&&state.mode==='standard'?completion!==null&&completion.totalHeat===state.totalHeat:completion===null,'normal completion lifetime');
  if(state.phase==='await-input'||state.phase==='run-lost'&&state.outcome?.reason!=='abandoned')check(state.stage?.index===state.stageIndex,'active stage pointer');
  if(['stage-cleared','run-won'].includes(state.phase))check(state.stage!==null&&state.stage.index+1===state.stageIndex,'completed stage pointer');
  if(state.phase==='run-won')check(state.tourMode==='normal'&&state.stageIndex===R2_AVAILABLE_CHAPTERS*3&&state.outcome?.reason==='all-stages-cleared'&&!!state.stage?.clearId&&(state.mode!=='standard'||state.stage.clearId===completion?.clearId),'normal completion');
  if(state.stage) {
    check(scoreString(state.stage.heat)&&scoreString(state.stage.targetHeat)&&[state.stage.handsLeft,state.stage.discardsLeft,state.stage.playIndex,state.stage.goldEarned,state.stage.discardsUsed].every(integer),'stage resources');
    check(integer(state.stage.initialHandLimit)&&state.stage.initialHandLimit>=R2_RESOURCE_CONTRACT.handMinimum&&state.stage.initialHandLimit<=R2_RESOURCE_CONTRACT.handMaximum,'initial hand limit');
    check(state.stage.handLimit===(state.stage.boss?.definitionId==='B11'?Math.max(R2_RESOURCE_CONTRACT.handMinimum,state.stage.initialHandLimit-state.stage.playIndex):state.stage.initialHandLimit),'stage hand limit');
    check(integer(state.stage.initialHands)&&state.stage.initialHands>=2&&state.stage.initialHands<=5&&integer(state.stage.initialDiscards)&&state.stage.initialDiscards>=config.baseDiscards&&state.stage.initialDiscards<=4,'entry budgets');
    check(config.chapterJokerBanCount===1?R2_JOKERS.some(definition=>definition.id===state.stage!.challengeDisabledJokerId):state.stage.challengeDisabledJokerId===null,'stage challenge ban');
    if(state.phase==='await-input')check(state.stage.challengeDisabledJokerId===state.chapterDisabledJokerId,'active challenge snapshot');
    check(typeof state.stage.doubleDiscardBeforeFirstPlay==='boolean','discard rule snapshot');
    check(state.stage.index%3===2?r2BossPlanValid(state.stage.boss)&&state.stage.boss.definitionId===state.seenBossIds[Math.floor(state.stage.index/3)]:state.stage.boss===null,'entry boss snapshot');
    if(state.stage.index===state.stageIndex&&state.phase==='await-input'&&state.stage.boss)check(stableHash(state.stage.boss)===stableHash(state.boss),'active boss snapshot');
    check(state.stage.doubleDiscardBeforeFirstPlay===(state.stage.boss?.definitionId==='B01'),'active discard rule');
    const validIds=(values:readonly string[],maximum:number)=>Array.isArray(values)&&values.length<=maximum&&new Set(values).size===values.length&&values.every(id=>typeof id==='string'&&id.length>0&&id.length<=512);
    check(validIds(state.stage.initialJokerIds,r2JokerCapacity(state)),'entry joker identities');
    check(validIds(state.stage.sealedJokerIds,state.stage.playIndex)&&state.stage.sealedJokerIds.every(id=>state.stage!.initialJokerIds.includes(id))&&(state.stage.boss?.definitionId==='B15'||state.stage.sealedJokerIds.length===0),'sealed joker ledger');
    if(state.phase==='await-input')check(state.jokers.every(joker=>state.stage!.initialJokerIds.includes(joker.instanceId)),'live stage joker identities');
    check(state.stage.boss?.definitionId!=='B08'||!state.stage.wagerSelected&&!state.stage.wagerUsed,'disabled character wager');
    check(typeof state.stage.rescueUsed==='boolean'&&(!state.stage.rescueUsed||state.safetyNetUsed),'stage rescue');
    check(state.stage.previousHandScore===null||scoreString(state.stage.previousHandScore),'previous hand score');
    check(integer(state.stage.maxPlayedCount)&&state.stage.maxPlayedCount<=R2_LIMITS.maxSelected&&(state.stage.playIndex===0?state.stage.maxPlayedCount===0:state.stage.maxPlayedCount>=1),'stage played qualification');
    check([state.stage.ordinaryStraightSeen,state.stage.ordinaryFlushSeen,state.stage.quadRefundUsed,state.stage.jokerSold].every(value=>typeof value==='boolean'),'stage saved qualifications');
    check(state.stage.playIndex>0||!state.stage.ordinaryStraightSeen&&!state.stage.ordinaryFlushSeen&&!state.stage.quadRefundUsed,'unused stage qualifications');
    check(state.stage.initialTargetHeat===getR2Stage(state.stage.index,state.tourMode,state.difficulty)?.targetHeat&&scoreString(state.stage.initialTargetHeat),'initial target');
    const target=BigInt(state.stage.initialTargetHeat),targetIncrease=state.stage.boss?.definitionId==='B14'?((target+19n)/20n)*BigInt(state.stage.discardsUsed):0n;
    check(state.stage.targetHeat===(target+targetIncrease).toString()&&state.stage.handsLeft<=state.stage.initialHands&&state.stage.handsLeft+state.stage.playIndex===state.stage.initialHands+(state.stage.rescueUsed?1:0)+(state.stage.quadRefundUsed?1:0),'stage target/play budget');
    const s=state.stage;
    check(integer(s.discardSpent)&&integer(s.discardGained)&&s.discardGained<=5&&s.discardsLeft<=s.initialDiscards&&s.discardsLeft+s.discardSpent===s.initialDiscards+s.discardGained,'discard budget with exact refund ledger');
    check(s.discardSpent>=s.discardsUsed&&s.discardSpent<=(s.doubleDiscardBeforeFirstPlay?2:1)*s.discardsUsed&&(!s.doubleDiscardBeforeFirstPlay||s.playIndex>0||s.discardSpent===2*s.discardsUsed),'discard action/spending ledger');
    if(state.stage.skipResult){const s=state.stage,r=s.skipResult!;
      check(s.index%3===0?r.kind==='coupon':s.index%3===1&&r.kind!=='coupon','skip reward stage');
      check(s.heat==='0'&&s.goldEarned===0&&s.clearId===null&&s.playIndex===0&&s.discardsUsed===0&&s.discardSpent===0&&s.discardGained===0&&s.discardsLeft===s.initialDiscards&&state.stageIndex===s.index+1&&(['stage-cleared','shop','stage-ready'].includes(state.phase)||state.phase==='run-lost'&&state.outcome?.reason==='abandoned'),'skip has no success effects');
    }
    check(state.stage.disabledIds.every(id=>ids.includes(id)),'disabled IDs');
  }
  for(const [type,level] of Object.entries(state.handLevels))check(R2_HAND_TYPES.includes(type as R2HandType)&&Number.isInteger(level)&&level!>=1&&level!<=30,'hand levels');
  check(state.phase!=='await-input'||state.stage!==null,'play stage');
  check(state.phase!=='shop'||state.shop!==null,'shop shelf');
  if(state.shop){
    const s=state.shop,offers=[...s.offers,...s.toolOffers,...s.itemOffers];
    check(typeof s.soldJoker==='boolean','shop sales qualification');
    check(integer(s.rerollCount)&&integer(s.purchases)&&integer(s.visitIndex)&&s.visitIndex===state.stageIndex&&s.offers.length<=4&&s.toolOffers.length<=1&&s.itemOffers.length<=2&&new Set(offers.map(o=>o.offerId)).size===offers.length&&offers.every(o=>!!o.offerId&&typeof o.consumed==='boolean'),'shelf references/capacity');
    check(s.offers.every(o=>R2_JOKERS.some(d=>d.id===o.definitionId&&supportsR2Joker(d))&&(o.edition===undefined||EDITIONS.includes(o.edition))&&o.price===r2Price(o.definitionId,o.edition)),'joker shelf prices/edition');
    check(s.toolOffers.every(o=>r2ToolSupported(o.definitionId)&&r2ToolAllowed(state,o.definitionId)&&R2_TOOLS.some(t=>t.id===o.definitionId&&t.shopWeight>0)&&o.edition===undefined&&o.price===r2ToolPrice(o.definitionId)),'tool shelf prices');
    check([0,1].includes(s.freeRerolls)&&(!s.freeRerolls||config.reroll.allowed),'shop program coupon');
    check(s.itemOffers.every(o=>r2ItemSupported(o.definitionId)&&o.edition===undefined&&o.price===r2ItemPrice(o.definitionId)),'item shelf prices');
  }
  check(!['run-won','run-lost'].includes(state.phase)||state.outcome!==null,'terminal reason');
  for(const cursor of Object.values(state.rng))SeededRng.restore(cursor);
}
function refill(state:R2RunState):void {while(state.handOrder.length<(state.stage?.handLimit??r2RunModeConfig(state).baseHandSize)&&state.drawPile.length)state.handOrder.push(state.drawPile.pop()!);}
export function getR2Stage(index:number,tourMode:R2TourMode='normal',difficulty:number=0):{index:number;name:string;intro:string;targetHeat:string}|undefined {
  return r2StageSpec(index,tourMode,difficulty);
}
function makeChapter(state:R2RunState):void {
  const rule=SeededRng.restore(state.rng.rule),reward=SeededRng.restore(state.rng.reward);
  state.chapter=Math.floor(state.stageIndex/3)+1;state.chapterHandUsage={};state.normalClearClaimed=false;state.boss=drawR2Boss(rule,state.seenBossIds,state.chapter,state.tourMode);state.seenBossIds.push(state.boss.definitionId);
  state.chapterSkipConsumable=R2_SKIP_CONSUMABLES[reward.integer(0,R2_SKIP_CONSUMABLES.length-1)];state.rng.rule=rule.snapshot();state.rng.reward=reward.snapshot();
  const config=r2RunModeConfig(state),locked=lockR2ProgramChapter(config,state.chapter,state.rng.program);
  state.program=locked.program;state.rng.program=locked.cursor;
  if(config.chapterJokerBanCount){const challenge=SeededRng.restore(state.rng.challenge);state.chapterDisabledJokerId=R2_JOKERS[challenge.integer(0,R2_JOKERS.length-1)].id;state.rng.challenge=challenge.snapshot();}
  else state.chapterDisabledJokerId=null;
}
function refreshDisabled(state:R2RunState):void {if(state.stage)state.stage.disabledIds=state.stage.boss?r2DisabledCards(state.stage.boss,state.stage.index,state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!)):[];}
export function r2ScoreContext(state:Pick<R2RunState,'gold'|'stage'|'boss'|'stageIndex'|'jokers'|'characterId'|'mode'|'difficulty'|'challengeId'|'programsEnabled'>,hand:readonly PlayingCard[],ids:readonly string[]) {
  const modifiers=readR2Modifiers(state.jokers,R2_JOKERS);
  const config=r2RunModeConfig(state);
  return {characterId:config.characterAbilityEnabled?state.characterId:'neutral' as const,jokerSlots:config.jokerSlots,gold:state.gold,discardsUsed:state.stage?.discardsUsed??0,previousHandScore:state.stage?.previousHandScore??null,boss:state.stage?.boss??null,sealedJokerIds:state.stage?.sealedJokerIds??[],challengeDisabledJokerId:state.stage?.challengeDisabledJokerId??null,
    ...(state.stage?{stageHeatBefore:state.stage.heat,stageTargetHeat:state.stage.targetHeat}:{}),
    handRules:{fourStraight:modifiers.fourStraight,fourFlush:modifiers.fourFlush},ordinaryPointsSuppressedIds:r2OrdinarySuppression(state.boss,state.stage?.index??state.stageIndex,hand,ids)};
}
function entryStage(state:R2RunState,targetHeat:string,skipResult:R2SkipResult|null=null):R2StageState {
  const handLimit=r2HandLimit(state),hands=r2HandsBudget(state),discards=r2DiscardBudget(state),initialJokerIds=state.jokers.map(joker=>joker.instanceId);
  const boss=state.stageIndex%3===2?structuredClone(state.boss):null;
  return {index:state.stageIndex,targetHeat,initialTargetHeat:targetHeat,heat:'0',handsLeft:hands,initialHands:hands,discardsLeft:discards,initialDiscards:discards,
    discardSpent:0,discardGained:0,doubleDiscardBeforeFirstPlay:boss?.definitionId==='B01',discardsUsed:0,skipResult,playIndex:0,previousHandType:null,previousHandScore:null,
    handLimit,initialHandLimit:handLimit,boss,initialJokerIds,sealedJokerIds:[],challengeDisabledJokerId:state.chapterDisabledJokerId,rescueUsed:false,clearId:null,goldEarned:0,disabledIds:[],wagerSelected:false,wagerUsed:false,
    maxPlayedCount:0,ordinaryStraightSeen:false,ordinaryFlushSeen:false,quadRefundUsed:false,jokerSold:state.shop?.soldJoker??false};
}
/** Records the actual post-hand survivor; the trace keeps the distinct start-of-hand seal list. */
function sealBossJoker(state:R2RunState):void {
  if(state.stage?.boss?.definitionId!=='B15')return;
  const target=state.jokers.find(joker=>!state.stage!.sealedJokerIds.includes(joker.instanceId));if(!target)return;
  const trace=state.lastTrace!;if(trace.events.length+1>SCORE_LIMITS.eventCount)throw new ScoreFault('event-limit',trace.events);
  const resourceBefore=state.stage.sealedJokerIds.length;state.stage.sealedJokerIds.push(target.instanceId);
  const eventId=`${trace.rootId}/event/${trace.events.length}`;
  const event:ScoreEvent=Object.freeze({eventId,rootId:trace.rootId,rootEventId:eventId,phase:'afterHand',sourceType:'rule',sourceDefinitionId:'B15',sourceInstanceId:state.runId,
    operation:'seal-joker',value:Object.freeze({n:'1',d:'1'}),before:trace.accumulator,after:trace.accumulator,reasonKey:'B15.seal-joker',visibleCondition:Object.freeze({kind:'always'}),retriggerDepth:0,
    targetJokerInstanceId:target.instanceId,resourceBefore,resourceAfter:state.stage.sealedJokerIds.length});
  const scoreEvents=[...trace.events,event];Object.freeze(scoreEvents);
  state.lastTrace=Object.freeze({...trace,events:scoreEvents});
}
export const r2DiscardCost=(state:Pick<R2RunState,'stage'|'boss'>):number=>state.stage?.doubleDiscardBeforeFirstPlay&&state.stage.playIndex===0?2:1;
function transactionMatches(state:R2RunState,condition:Condition,discarded:readonly PlayingCard[]):boolean {
 const stage=state.stage;
 return r2TransactionConditionMatches(condition,{gold:state.gold,handsAfter:stage?.handsLeft,playIndex:stage?.playIndex,discardsUsed:stage?.discardsUsed,handType:stage?.previousHandType??null,heldCount:state.lastTrace?.sets.heldIds.length,discarded,hasStage:!!stage,maxPlayedCount:stage?.maxPlayedCount??0,ordinaryStraightSeen:stage?.ordinaryStraightSeen??false,ordinaryFlushSeen:stage?.ordinaryFlushSeen??false,jokerSold:stage?.jokerSold??false,traceType:state.lastTrace?.handType??null,heat:stage?.heat??'0',target:stage?.targetHeat??'0'});
}

function economicHooks(state:R2RunState,phase:TransactionHookPhase,events:DomainEvent[],sources=state.jokers,discarded:readonly PlayingCard[]=[]):void {
  for(const j of sources)for(const hook of R2_JOKERS.find(d=>d.id===j.definitionId)!.hooks){
    if(hook.phase!==phase||!transactionMatches(state,hook.condition,discarded))continue;
    type Source=Extract<DomainEvent,{type:'joker-transaction'}>;
    const emit=(operation:string,amount:string,details:Partial<Pick<Source,'resourceBefore'|'resourceAfter'|'growthBefore'|'growthAfter'|'rewardDefinitionId'>>={})=>events.push({type:'joker-transaction',phase,definitionId:j.definitionId,instanceId:j.instanceId,operation,amount,visibleCondition:structuredClone(hook.condition),...details});
    const grantGold=(amount:number,rewardDefinitionId?:string):void=>{
      const resourceBefore=state.gold;state.gold+=amount;if(phase==='onStageClear')state.stage!.goldEarned+=amount;
      emit('add-gold',String(amount),{resourceBefore,resourceAfter:state.gold,...(rewardDefinitionId?{rewardDefinitionId}:{})});
    };
    const grantTool=(definitionId:string,fallbackGold:number):void=>{
      if(!r2ToolSupported(definitionId))throw Error('unavailable-reward-tool');
      if(state.consumables.length>=r2ConsumableCapacity(state)){grantGold(fallbackGold,definitionId);return;}
      const resourceBefore=state.consumables.length;
      state.consumables.push({instanceId:`${state.stage!.clearId}/joker-reward/${j.instanceId}/${definitionId}`,definitionId});
      emit('reward-consumable','1',{resourceBefore,resourceAfter:state.consumables.length,rewardDefinitionId:definitionId});
    };
    for(const op of hook.operations){let amount='0',resourceBefore:number|undefined,resourceAfter:number|undefined;
      if(op.kind==='add-gold'){grantGold(op.amount);continue;}
      else if(op.kind==='add-gold-limited'){
        const count=j.counters?.singleDiscards??0;if(count>=op.limit)continue;
        j.counters={...j.counters,singleDiscards:count+1};resourceBefore=state.gold;state.gold+=op.amount;resourceAfter=state.gold;amount=String(op.amount);
      }
      else if(op.kind==='refund-discard'){resourceBefore=state.stage!.discardsLeft;state.stage!.discardsLeft=Math.min(state.stage!.initialDiscards,resourceBefore+op.amount);resourceAfter=state.stage!.discardsLeft;state.stage!.discardGained+=resourceAfter-resourceBefore;amount=String(resourceAfter-resourceBefore);}
      else if(op.kind==='add-growth'){const before=Rational.fromJSON(j.growth[op.key]??{n:'0',d:'1'}),raw=before.add(Rational.fromJSON(op.value)),cap=Rational.fromJSON(op.cap),next=raw.compare(cap)>0?cap:raw;j.growth[op.key]=next.toJSON();const delta=next.add(before.multiply(new Rational(-1n))).toJSON();if(phase==='onReroll'&&delta.n==='0')continue;amount=`${delta.n}/${delta.d}`;}
      else if(op.kind==='reward-consumable-pool'){
        const rng=SeededRng.restore(state.rng.reward),definitionId=op.definitionIds[rng.integer(0,op.definitionIds.length-1)];
        state.rng.reward=rng.snapshot();grantTool(definitionId,op.fallbackGold);continue;
      }
      else if(op.kind==='reward-consumable-every-clears'){
        const resourceBefore=j.counters?.stageClears;if(resourceBefore!==0&&resourceBefore!==1)throw Error('missing-clear-cycle');
        const resourceAfter=resourceBefore===0?1:0;j.counters={...j.counters,stageClears:resourceAfter};
        emit('increment-clear-cycle','1',{resourceBefore,resourceAfter});
        if(resourceAfter===0)grantTool(op.definitionId,op.fallbackGold);continue;
      }
      else if(op.kind==='add-coefficient'||op.kind==='reset-coefficient'){
        if(!Object.hasOwn(j.growth,op.key))throw Error('missing-joker-coefficient');
        const before=Rational.fromJSON(j.growth[op.key]);let next: Rational;
        if(op.kind==='reset-coefficient')next=Rational.fromJSON(op.initial);
        else {const raw=before.add(Rational.fromJSON(op.value)),cap=Rational.fromJSON(op.cap);next=raw.compare(cap)>0?cap:raw;}
        const delta=next.add(before.multiply(new Rational(-1n))).toJSON();if(delta.n==='0')continue;
        const growthBefore=before.toJSON(),growthAfter=next.toJSON();j.growth[op.key]=growthAfter;
        emit(op.kind,`${delta.n}/${delta.d}`,{growthBefore,growthAfter});continue;
      }
      else throw Error('invalid-economic-operation');
      emit(op.kind,amount,resourceBefore===undefined?{}:{resourceBefore,resourceAfter:resourceAfter!});
    }
  }
}
function clearStageEffects(state:R2RunState):void {
  for(const joker of state.jokers)if(joker.definitionId==='c05')joker.growth.pendingHeat={n:'0',d:'1'};
}
export function makeR2Shop(state:R2RunState,reset:boolean):void {
  const rng=reset?new SeededRng(`${state.seed}/r2/shop/${state.stageIndex}`):SeededRng.restore(state.rng.shop);
  const count=reset?0:state.shop!.rerollCount+1;
  const initial=reset&&state.stageIndex===0;
  const ids=drawR2Shelf(rng,r2Pool(state.jokers.map(j=>j.definitionId),state.safetyNetUsed?['f07']:[]),initial?state.gold:undefined,R2_ECONOMY.shelfSlots+itemAmount(state,'joker-offer-count'));
  const prefix=`${state.runId}/shop/${state.stageIndex}/${count}`;
  const offers=ids.map((id,slot)=>{const edition=drawR2Edition(rng);return {offerId:`${prefix}/joker/${slot}`,definitionId:id,price:r2Price(id,edition),edition,consumed:false};});
  if(initial&&offers.length&&!offers.some(offer=>offer.price<=state.gold&&offer.edition==='none')){
    const ordinary=offers.find(offer=>r2Price(offer.definitionId)<=state.gold);if(ordinary){ordinary.edition='none';ordinary.price=r2Price(ordinary.definitionId);}
  }
  const toolId=drawR2Tool(rng,r2ToolAcquisitionPool(state));
  const toolOffers=toolId?[{offerId:`${prefix}/tool/0`,definitionId:toolId,price:r2ToolPrice(toolId),consumed:false}]:[];
  const itemOffers=reset?drawR2Items(rng,state.longTermItems,1+itemAmount(state,'item-offer-count')).map((id,slot)=>({offerId:`${prefix}/item/${slot}`,definitionId:id,price:r2ItemPrice(id),consumed:false})):state.shop!.itemOffers;
  const freeRerolls=reset?(state.programRerollCoupon?1:0):state.shop!.freeRerolls;
  if(reset)state.programRerollCoupon=false;
  state.shop={visitIndex:state.stageIndex,rerollCount:count,purchases:reset?0:state.shop!.purchases,soldJoker:reset?false:state.shop!.soldJoker,freeRerolls,offers,toolOffers,itemOffers};
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
  // Disabled cards can still be legally played for their hand's base score.
  if(!state.handOrder.length)return false;
  const trace=state.lastTrace!;
  if(trace.events.length+2>SCORE_LIMITS.eventCount)throw new ScoreFault('event-limit',trace.events);
  state.stage!.handsLeft=1;state.stage!.rescueUsed=true;state.safetyNetUsed=true;state.jokers=state.jokers.filter(j=>j.instanceId!==joker.instanceId);
  const condition=Object.freeze({kind:'exhausted-hands' as const}),source={sourceType:'joker' as const,sourceDefinitionId:joker.definitionId,sourceInstanceId:joker.instanceId},eventId=`${trace.rootId}/event/${trace.events.length}`;
  const rescue=Object.freeze({eventId,rootId:trace.rootId,rootEventId:eventId,phase:'beforeFailure' as const,...source,operation:'rescue-hand',value:Object.freeze({n:'1',d:'1'}),before:trace.accumulator,after:trace.accumulator,reasonKey:`${joker.definitionId}.rescue-hand`,visibleCondition:condition,retriggerDepth:0,resourceBefore:0,resourceAfter:1});
  const destroy=Object.freeze({...rescue,eventId:`${trace.rootId}/event/${trace.events.length+1}`,operation:'destroy-joker',value:Object.freeze({n:'0',d:'1'}),reasonKey:`${joker.definitionId}.destroy-joker`,resourceBefore:1,resourceAfter:1});
  const rescuedTrace={...trace,events:[...trace.events,rescue,destroy],jokers:trace.jokers.filter(j=>j.instanceId!==joker.instanceId),destroyedJokerIds:[...trace.destroyedJokerIds,joker.instanceId]};
  Object.freeze(rescuedTrace.events);Object.freeze(rescuedTrace.jokers);Object.freeze(rescuedTrace.destroyedJokerIds);state.lastTrace=Object.freeze(rescuedTrace);
  events.push({type:'joker-transaction',phase:'beforeFailure',definitionId:joker.definitionId,instanceId:joker.instanceId,operation:'rescue-hand',amount:'1',resourceBefore:0,resourceAfter:1},{type:'joker-transaction',phase:'beforeFailure',definitionId:joker.definitionId,instanceId:joker.instanceId,operation:'destroy-joker',amount:'0'});
  return true;
}
function refundHand(state:R2RunState,events:DomainEvent[]):void {
  if(state.stage!.quadRefundUsed)return;
  for(const joker of state.jokers)for(const hook of R2_JOKERS.find(definition=>definition.id===joker.definitionId)!.hooks){
    if(hook.phase!=='afterHand')continue;
    const op=hook.operations.find(operation=>operation.kind==='refund-hand-limited');
    if(!op||op.kind!=='refund-hand-limited'||!transactionMatches(state,hook.condition,[]))continue;
    const resourceBefore=state.stage!.handsLeft;state.stage!.handsLeft+=op.amount;state.stage!.quadRefundUsed=true;
    events.push({type:'joker-transaction',phase:'afterHand',definitionId:joker.definitionId,instanceId:joker.instanceId,operation:'refund-hand',amount:String(op.amount),resourceBefore,resourceAfter:state.stage!.handsLeft,visibleCondition:structuredClone(hook.condition)});
    persistJokerSources(state,events,'afterHand');return;
  }
}
function persistJokerSources(state:R2RunState,events:readonly DomainEvent[],phase:'afterHand'|'onStageClear'):void {
  const sources=events.filter((event):event is Extract<DomainEvent,{type:'joker-transaction'}>=>event.type==='joker-transaction'&&event.phase===phase);
  if(!sources.length)return;
  const trace=state.lastTrace!;
  if(trace.events.length+sources.length>SCORE_LIMITS.eventCount)throw new ScoreFault('event-limit',trace.events);
  const rewards=sources.map((source,index)=>{
    if(!source.visibleCondition)throw Error('missing-transaction-source');
    const visibleCondition=structuredClone(source.visibleCondition);if(visibleCondition.kind==='hand-type-in'||visibleCondition.kind==='hand-type-unfinished'||visibleCondition.kind==='stage-hand-types-all')Object.freeze(visibleCondition.values);Object.freeze(visibleCondition);
    const eventId=`${trace.rootId}/event/${trace.events.length+index}`;
    let value:import('./rational').Fraction;
    if(source.operation==='add-coefficient'){
      if(!source.growthBefore||!source.growthAfter)throw Error('missing-coefficient-source');
      value=Rational.fromJSON(source.growthAfter).add(Rational.fromJSON(source.growthBefore).multiply(new Rational(-1n))).toJSON();
    }else {const [n,d='1']=source.amount.split('/');value=Rational.fromJSON({n,d}).toJSON();}
    const growth=source.growthBefore&&source.growthAfter?{growthBefore:Object.freeze({...source.growthBefore}),growthAfter:Object.freeze({...source.growthAfter})}:{};
    return Object.freeze({eventId,rootId:trace.rootId,rootEventId:eventId,phase,sourceType:'joker' as const,sourceDefinitionId:source.definitionId,sourceInstanceId:source.instanceId,operation:source.operation,value:Object.freeze(value),before:trace.accumulator,after:trace.accumulator,reasonKey:`${source.definitionId}.${source.operation}`,visibleCondition,retriggerDepth:0,
      ...(source.resourceBefore===undefined?{}:{resourceBefore:source.resourceBefore,resourceAfter:source.resourceAfter!}),...growth,...(source.rewardDefinitionId?{rewardDefinitionId:source.rewardDefinitionId}:{})});
  });
  const jokers=structuredClone(state.jokers);
  for(const joker of jokers){for(const value of Object.values(joker.growth))Object.freeze(value);Object.freeze(joker.growth);if(joker.counters)Object.freeze(joker.counters);Object.freeze(joker);}Object.freeze(jokers);
  const rewardedTrace={...trace,events:[...trace.events,...rewards],jokers};Object.freeze(rewardedTrace.events);state.lastTrace=Object.freeze(rewardedTrace);
}
function grantHeldGoldPaper(state:R2RunState):void {
  const trace=state.lastTrace!,stage=state.stage!;
  const effect=R2_ENHANCEMENTS.find(entry=>entry.id==='gold-paper')!.effects.find(effect=>effect.kind==='add-gold');
  if(!effect||effect.kind!=='add-gold')throw Error('invalid-gold-paper-contract');
  const sources=trace.cards.filter(card=>trace.sets.heldIds.includes(card.id)&&!stage.disabledIds.includes(card.id)&&card.enhancement==='gold-paper').slice(0,Math.floor(effect.capPerStage/effect.amount));
  if(trace.events.length+sources.length>SCORE_LIMITS.eventCount)throw new ScoreFault('event-limit',trace.events);
  const grants:ScoreEvent[]=sources.map((card,index)=>{
    const resourceBefore=state.gold;state.gold+=effect.amount;stage.goldEarned+=effect.amount;
    const eventId=`${trace.rootId}/event/${trace.events.length+index}`;
    return Object.freeze({eventId,rootId:trace.rootId,rootEventId:eventId,phase:'onStageClear' as const,sourceType:'card' as const,
      sourceDefinitionId:card.id,sourceInstanceId:card.id,targetCardId:card.id,operation:'add-gold',value:Object.freeze({n:String(effect.amount),d:'1'}),
      before:trace.accumulator,after:trace.accumulator,reasonKey:'enhancement.gold-paper.add-gold',visibleCondition:Object.freeze({kind:'always' as const}),
      retriggerDepth:0,resourceBefore,resourceAfter:state.gold});
  });
  if(grants.length){const rewardedTrace={...trace,events:[...trace.events,...grants]};Object.freeze(rewardedTrace.events);state.lastTrace=Object.freeze(rewardedTrace);}
}

function clearResourceSource(state:R2RunState,definitionId:string,operation:'add-gold'|'upgrade-hand'|'reward-consumable'|'reward-free-reroll'|'program-reward-skipped',amount:number,before:number,after:number,jokerId?:string,targetHandType?:R2HandType,rewardDefinitionId?:string,programGoldBeforeReward?:number):void {
  const trace=state.lastTrace!;
  if(trace.events.length>=SCORE_LIMITS.eventCount)throw new ScoreFault('event-limit',trace.events);
  const eventId=`${trace.rootId}/event/${trace.events.length}`;
  const event:ScoreEvent=Object.freeze({eventId,rootId:trace.rootId,rootEventId:eventId,phase:'onStageClear',sourceType:jokerId?'joker':'rule',sourceDefinitionId:definitionId,sourceInstanceId:jokerId??state.runId,operation,value:Object.freeze({n:String(amount),d:'1'}),before:trace.accumulator,after:trace.accumulator,reasonKey:`${definitionId}.${operation}`,visibleCondition:Object.freeze({kind:'always'}),retriggerDepth:0,resourceBefore:before,resourceAfter:after,...(targetHandType?{targetHandType}:{}),...(rewardDefinitionId?{rewardDefinitionId}:{}),...(programGoldBeforeReward===undefined?{}:{programGoldBeforeReward})});
  const events=[...trace.events,event];Object.freeze(events);state.lastTrace=Object.freeze({...trace,events});
}
function clearGoldSource(state:R2RunState,definitionId:string,amount:number,jokerId?:string,rewardDefinitionId?:string):void {
  if(!amount)return;
  const before=state.gold;state.gold+=amount;state.stage!.goldEarned+=amount;
  clearResourceSource(state,definitionId,'add-gold',amount,before,state.gold,jokerId,undefined,rewardDefinitionId);
}
function grantClearItems(state:R2RunState):void {
  if(state.stageIndex%3!==2){
    const opener=R2_LONG_TERM_ITEMS.find(item=>item.id==='U12')!.operation;
    if(!state.normalClearClaimed&&state.longTermItems.includes('U12')&&opener.kind==='first-normal-clear-per-chapter')clearGoldSource(state,'U12',opener.gold);
    state.normalClearClaimed=true;return;
  }
  if(state.longTermItems.includes('U09')){
    const max=Math.max(0,...Object.values(state.chapterHandUsage).map(count=>count!));
    const type=R2_HAND_TYPES.find(type=>max>0&&state.chapterHandUsage[type]===max);
    if(type&&state.handLevels[type]!<R2_TOOL_CATALOG.limits.handLevelMaximum){
      const before=state.handLevels[type]!;state.handLevels[type]=before+1;clearResourceSource(state,'U09','upgrade-hand',1,before,before+1,undefined,type);
    }
  }
  if(!state.supplyRewardClaimed){
    const source=R2_TOOLS.find(tool=>tool.id==='T16')!.rewardSources.find(source=>source.source==='first-boss-clear')!;
    state.supplyRewardClaimed=true;
    if(state.consumables.length<r2ConsumableCapacity(state)){
      const before=state.consumables.length;state.consumables.push({instanceId:`${state.runId}/first-boss/supply`,definitionId:'T16'});
      clearResourceSource(state,'T16','reward-consumable',1,before,state.consumables.length,undefined,undefined,'T16');
    }else clearGoldSource(state,'T16',source.overflowGold,undefined,'T16');
  }
}

function grantProgramReward(state:R2RunState,goldBeforeRewards:number):void {
  const program=state.program;
  if(state.stageIndex%3!==2||!program||!r2ProgramQualified(program,state.chapterHandUsage,goldBeforeRewards))return;
  const definition=R2_MODE_CATALOG.programs.find(row=>row.id===program.selectedId)!;
  program.claimed=true;
  switch(definition.reward.kind){
    case 'gold':{
      const before=state.gold;state.gold+=definition.reward.amount;state.stage!.goldEarned+=definition.reward.amount;
      clearResourceSource(state,definition.id,'add-gold',definition.reward.amount,before,state.gold,undefined,undefined,undefined,goldBeforeRewards);break;
    }
    case 'used-hand-upgrade':{
      const candidates=r2ProgramUpgradeCandidates(state.chapterHandUsage,state.handLevels);
      if(!candidates.length){clearResourceSource(state,definition.id,'program-reward-skipped',0,0,0,undefined,undefined,undefined,goldBeforeRewards);break;}
      const rng=SeededRng.restore(state.rng.program),type=candidates[rng.integer(0,candidates.length-1)],before=state.handLevels[type]??1;
      state.rng.program=rng.snapshot();state.handLevels[type]=before+definition.reward.levels;
      clearResourceSource(state,definition.id,'upgrade-hand',1,before,state.handLevels[type]!,undefined,type,undefined,goldBeforeRewards);break;
    }
    case 'next-shop-free-reroll':
      state.programRerollCoupon=true;clearResourceSource(state,definition.id,'reward-free-reroll',1,0,1,undefined,undefined,undefined,goldBeforeRewards);break;
  }
}

/** r2 transactions; the caller appends the receipt and publishes only complete states. */
export function transactR2(input:R2RunState|null,command:Command):Transaction {
  const fail=(code:string):Transaction=>({ok:false,code});
  const action=command.action, events:DomainEvent[]=[];
  let state:R2RunState;
  if(action.type==='StartRun') {
    if(input)return fail('wrong-phase');
    if(action.rulesVersion!=='r2'||typeof action.seed!=='string'||!action.seed||!CHARACTER_IDS.includes(action.characterId))return fail('invalid-start');
    const selection=resolveR2ModeConfig(action.modeConfig===undefined?{mode:'standard'}:action.modeConfig);
    if(!selection.ok)return fail(selection.code);
    const config=selection.config;
    if(!r2ModeSeedAllowed(config,action.seed)||config.mode==='tutorial'&&action.characterId!=='erxiang')return fail('invalid-mode-seed-or-character');
    const cards=createDeck().filter(card=>config.startingRanks.includes(card.rank));
    state={schemaVersion:2,rulesVersion:'r2',contentVersion:R2_CONTENT_VERSION,contentHash:R2_CONTENT_HASH,runId:command.runId,seed:action.seed,commandSeq:0,difficulty:config.difficulty,characterId:action.characterId,
      mode:config.mode,challengeId:config.challengeId,programsEnabled:config.programsEnabled,programRerollCoupon:false,chapterDisabledJokerId:null,
      chapter:config.startingChapter,stageIndex:config.startingStageIndex,phase:'shop',deckInstances:cards,drawPile:cards.map(c=>c.id),handOrder:[],playedPile:[],discardPile:[],destroyedIds:[],stage:null,totalHeat:'0',gold:config.initialGold,jokers:config.startingJokers.map((joker,index)=>r2CreateJoker(joker.definitionId,`${command.runId}/initial/${index}`,joker.paidPrice,joker.edition)),consumables:[],longTermItems:[],program:null,boss:{definitionId:'B01',disabledSuit:null},seenBossIds:[],chapterSkipConsumable:'T01',purchaseCoupons:0,safetyNetUsed:false,shop:null,
      spectralModifiers:{handsPenalty:0,handPenalty:0,cleanSlateBonus:0},supplyRewardClaimed:false,chapterHandUsage:{},normalClearClaimed:false,tourMode:'normal',normalCompletion:null,
      rng:{deck:new SeededRng(`${action.seed}/r2/deck/0`).snapshot(),rule:new SeededRng(`${action.seed}/r2/rule/0`).snapshot(),shop:new SeededRng(`${action.seed}/r2/shop/0`).snapshot(),reward:new SeededRng(`${action.seed}/r2/reward/0`).snapshot(),program:new SeededRng(`${action.seed}/r2/program/0`).snapshot(),challenge:new SeededRng(`${action.seed}/r2/challenge/0`).snapshot()},
      receipts:[],lastTrace:null,handLevels:config.characterAbilityEnabled?structuredClone(R2_STARTING_HAND_LEVELS[action.characterId]??{}):{},outcome:null};
    if(config.startingChapter>1){const rule=SeededRng.restore(state.rng.rule);for(let chapter=1;chapter<config.startingChapter;chapter++)state.seenBossIds.push(drawR2Boss(rule,state.seenBossIds,chapter).definitionId);state.rng.rule=rule.snapshot();}
    makeChapter(state);makeR2Shop(state,true);
  } else {
    if(!input)return fail('run-not-started');
    state=structuredClone(input);
    if(state.longTermItems.some(id=>!r2ItemSupported(id))&&action.type!=='AbandonRun')return fail('long-term-not-enabled');
    switch(action.type) {
      case 'LeaveShop':
        if(state.phase!=='shop')return fail('wrong-phase');if(state.shop)state.shop.freeRerolls=0;state.phase='stage-ready';break;
      case 'OpenShop':
        if(state.phase!=='stage-cleared')return fail('wrong-phase');
        if(!getR2Stage(state.stageIndex,state.tourMode,state.difficulty))return fail('numeric-length-limit');
        state.phase='shop';if(state.stageIndex%3===0)makeChapter(state);makeR2Shop(state,true);break;
      case 'ContinueEndless': {
        const completion=state.normalCompletion;
        if(state.mode!=='standard'||state.tourMode!=='normal'||state.phase!=='run-won'||state.stageIndex!==24||state.chapter!==8||state.stage?.index!==23||state.stage.clearId!==`${state.runId}/clear/23`||state.outcome?.reason!=='all-stages-cleared'||!completion||completion.clearId!==state.stage.clearId||completion.totalHeat!==state.totalHeat)return fail('not-normal-win');
        state.tourMode='endless';state.outcome=null;makeChapter(state);makeR2Shop(state,true);state.phase='shop';break;
      }
      case 'BuyOffer': {
        if(state.phase!=='shop'||!state.shop)return fail('wrong-phase');
        const shelves=['offers','toolOffers','itemOffers'] as const;
        const matches=shelves.flatMap(shelf=>state.shop![shelf].filter(o=>o.offerId===action.offerId).map(offer=>({shelf,offer})));
        if(matches.length!==1)return fail(matches.length?'duplicate-offer':'unknown-offer');
        const {shelf,offer}=matches[0];
        if(offer.consumed)return fail('consumed-offer');
        if(shelf==='offers'){
          if(!R2_JOKERS.some(d=>d.id===offer.definitionId&&supportsR2Joker(d))||state.safetyNetUsed&&offer.definitionId==='f07')return fail('joker-unavailable');
          if(state.jokers.length>=r2JokerCapacity(state))return fail('slots-full');
          if(state.jokers.some(j=>j.definitionId===offer.definitionId))return fail('already-owned');
          if(offer.edition!==undefined&&!EDITIONS.includes(offer.edition)||offer.price!==r2Price(offer.definitionId,offer.edition))return fail('invalid-offer');
        }else if(shelf==='toolOffers'){
          if(!r2ToolAllowed(state,offer.definitionId))return fail('tool-disabled-in-mode');
          if(offer.edition!==undefined||!r2ToolAcquisitionPool(state).some(t=>t.id===offer.definitionId)||offer.price!==r2ToolPrice(offer.definitionId))return fail('invalid-offer');
          if(state.consumables.length>=r2ConsumableCapacity(state))return fail('consumable-slots-full');
        }else{
          if(offer.edition!==undefined||!r2ItemSupported(offer.definitionId)||offer.price!==r2ItemPrice(offer.definitionId))return fail('invalid-offer');
          if(state.longTermItems.length>=R2_LIMITS.longTermSlots)return fail('long-term-slots-full');
          if(state.longTermItems.includes(offer.definitionId))return fail('already-owned');
        }
        const price=r2PurchasePrice(state,offer);if(state.gold<price)return fail('not-enough-gold');
        state.gold-=price;offer.consumed=true;state.shop.purchases++;if(state.purchaseCoupons>0)state.purchaseCoupons--;
        if(shelf==='offers'){
          economicHooks(state,'onBuyOffer',events,[...state.jokers]);
          state.jokers.push(r2CreateJoker(offer.definitionId,`${state.runId}/joker/${command.commandId}`,price,offer.edition));
        }else if(shelf==='toolOffers')state.consumables.push({instanceId:`${state.runId}/tool/${command.commandId}`,definitionId:offer.definitionId});
        else state.longTermItems.push(offer.definitionId);
        break;
      }
      case 'SellJoker': {
        if(state.phase!=='shop')return fail('wrong-phase');
        const index=state.jokers.findIndex(j=>j.instanceId===action.instanceId);if(index<0)return fail('unknown-joker-instance');
        const remaining=state.jokers.filter((_,slot)=>slot!==index);
        if(state.consumables.length>r2ConsumableCapacity({...state,jokers:remaining}))return fail('over-capacity-after-sale');
        state.gold+=salePrice(state.jokers[index].paidPrice);state.jokers=remaining;state.shop!.soldJoker=true;economicHooks(state,'onSellJoker',events);break;
      }
      case 'RerollShop': {
        if(state.phase!=='shop'||!state.shop)return fail('wrong-phase');
        if(!r2RunModeConfig(state).reroll.allowed)return fail('reroll-disabled');
        if(!r2Pool(state.jokers.map(j=>j.definitionId),state.safetyNetUsed?['f07']:[]).length)return fail('no-reroll-candidates');
        const cost=state.shop.freeRerolls?0:r2PaidRerollPrice(state);if(state.gold<cost)return fail('not-enough-gold');
        if(state.shop.freeRerolls)state.shop.freeRerolls--;
        state.gold-=cost;makeR2Shop(state,false);if(cost>0)economicHooks(state,'onReroll',events);break;
      }
      case 'ChooseProgram':{
        if(!state.program)return fail('programs-disabled');
        if(!['shop','stage-ready'].includes(state.phase))return fail('program-choice-closed');
        const result=chooseR2Program(state.program,action.programId);if(!result.ok)return fail(result.code);
        state.program=result.program;break;
      }
      case 'AbandonProgram':{
        if(!state.program||['run-won','run-lost'].includes(state.phase))return fail('no-active-program');
        const result=abandonR2Program(state.program);if(!result.ok)return fail(result.code);
        state.program=result.program;break;
      }
      case 'EnterStage': {
        if(state.phase!=='stage-ready')return fail('wrong-phase');
        const chapter=Math.floor(state.stageIndex/3),definition=getR2Stage(state.stageIndex,state.tourMode,state.difficulty);
        if(!definition)return fail('unknown-stage');
        if(state.program)state.program=sealR2ProgramChoice(state.program);
        const rng=new SeededRng(`${state.seed}/r2/deck/${state.stageIndex}`);
        state.drawPile=rng.shuffle(state.deckInstances.filter(c=>!state.destroyedIds.includes(c.id))).map(c=>c.id);
        state.handOrder=[];state.playedPile=[];state.discardPile=[];
        state.rng.deck=rng.snapshot();
        state.stage=entryStage(state,definition.targetHeat);
        clearStageEffects(state);for(const joker of state.jokers)if(joker.definitionId==='a07')joker.counters={singleDiscards:0};refill(state);
        refreshDisabled(state);
        state.chapter=chapter+1;state.phase='await-input';state.shop=null;state.lastTrace=null;break;
      }
      case 'SetWager':
        if(state.phase!=='await-input'||!state.stage)return fail('wrong-phase');
        if(state.characterId!=='touye'||typeof action.enabled!=='boolean')return fail('invalid-wager');
        if(state.stage.boss?.definitionId==='B08')return fail('wager-disabled-by-boss');
        if(!r2RunModeConfig(state).characterAbilityEnabled)return fail('character-ability-disabled');
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
        if(state.stage.boss?.definitionId==='B07'){
          if(state.gold<1)return fail('not-enough-gold');
          const before=state.gold;state.gold--;
          events.push({type:'boss-transaction',definitionId:'B07',operation:'charge-discard',amount:'1',resourceBefore:String(before),resourceAfter:String(state.gold)});
        }
        const ordered=state.handOrder.filter(id=>ids.includes(id));state.handOrder=state.handOrder.filter(id=>!ids.includes(id));
        state.discardPile.push(...ordered);state.stage.discardsLeft-=discardCost;state.stage.discardSpent+=discardCost;state.stage.discardsUsed++;economicHooks(state,'onDiscard',events,state.jokers,ordered.map(id=>state.deckInstances.find(c=>c.id===id)!));refill(state);refreshDisabled(state);
        if(state.stage.boss?.definitionId==='B14'){
          const before=state.stage.targetHeat,amount=(BigInt(state.stage.initialTargetHeat)+19n)/20n;
          state.stage.targetHeat=(BigInt(before)+amount).toString();
          events.push({type:'boss-transaction',definitionId:'B14',operation:'increase-target',amount:amount.toString(),resourceBefore:before,resourceAfter:state.stage.targetHeat});
        }
        events.push({type:'cards-discarded',cardIds:ordered,discardsLeft:state.stage.discardsLeft});noCards(state,events);break;
      }
      case 'UseConsumable': {
        const code=applyR2Tool(state,command,events);if(code)return fail(code);break;
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
        try {trace=scoreR2Hand({rulesVersion:'r2',runId:state.runId,rootId:`${state.runId}/hand/${command.commandId}`,
          hand:state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!),selectedIds:ids,disabledIds:state.stage.disabledIds,jokers:state.jokers,definitions:R2_JOKERS,
          handLevels:state.handLevels,playIndex:state.stage.playIndex+1,handsBeforePlay:state.stage.handsLeft,previousHandType:state.stage.previousHandType,wager:state.stage.wagerSelected,rng:state.rng.rule,...r2ScoreContext(state,state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!),ids)});}
        catch(error) {return {ok:false,code:'score-diagnostic',diagnostic:{code:error instanceof ScoreFault?error.code:error instanceof Error?error.message:'score-error',events:error instanceof ScoreFault?error.events:[]}};}
        state.rng.rule={...trace.rng};state.lastTrace=trace;state.jokers=structuredClone(trace.jokers);state.gold+=trace.goldDelta;
        state.destroyedIds.push(...trace.destroyedCardIds);state.handLevels[trace.handType]??=1;
        state.chapterHandUsage[trace.handType]=(state.chapterHandUsage[trace.handType]??0)+1;
        const heat=(BigInt(state.stage.heat)+BigInt(trace.finalScore)).toString();
        if(!scoreString(heat))return {ok:false,code:'score-diagnostic',diagnostic:{code:'numeric-length-limit',events:trace.events}};
        state.stage.heat=heat;
        state.stage.handsLeft--;state.stage.playIndex++;state.stage.previousHandType=trace.handType;state.stage.previousHandScore=trace.finalScore;
        state.stage.maxPlayedCount=Math.max(state.stage.maxPlayedCount,trace.sets.playedIds.length);
        state.stage.ordinaryStraightSeen ||= trace.handType==='straight';state.stage.ordinaryFlushSeen ||= trace.handType==='flush';
        if(state.stage.wagerSelected)state.stage.wagerUsed=true;
        state.stage.wagerSelected=false;
        state.handOrder=[...trace.sets.heldIds];state.playedPile.push(...trace.sets.playedIds.filter(id=>!trace.destroyedCardIds.includes(id)));
        if(state.stage.boss?.definitionId==='B11')state.stage.handLimit=Math.max(R2_RESOURCE_CONTRACT.handMinimum,state.stage.initialHandLimit-state.stage.playIndex);
        const scoredEvent:Extract<DomainEvent,{type:'hand-scored-r2'}>={type:'hand-scored-r2',score:trace,playedIds:trace.sets.playedIds,playIndex:state.stage.playIndex};events.push(scoredEvent);
        if(BigInt(state.stage.heat)>=BigInt(state.stage.targetHeat)) {
          const goldBeforeRewards=state.gold;
          if(state.program)state.program.lastOpportunityClear ||= state.stage.handsLeft===0;
          const total=(BigInt(state.totalHeat)+BigInt(state.stage.heat)).toString();
          if(!scoreString(total))return {ok:false,code:'score-diagnostic',diagnostic:{code:'numeric-length-limit',events:trace.events}};
          try {sealBossJoker(state);scoredEvent.score=state.lastTrace!;}
          catch(error){return {ok:false,code:'score-diagnostic',diagnostic:{code:error instanceof ScoreFault?error.code:error instanceof Error?error.message:'score-error',events:error instanceof ScoreFault?error.events:[]}};}
          const config=r2RunModeConfig(state),interest=Math.floor(state.gold/5),baseInterest=Math.min(config.baseInterestCap,interest),jokerBonus=readR2Modifiers(state.jokers,R2_JOKERS).interestCapBonus;
          const jokerInterest=Math.min(config.baseInterestCap+jokerBonus,interest)-baseInterest,itemInterest=Math.min(r2InterestCap(state),interest)-baseInterest-jokerInterest;
          const reward=[4,5,7][state.stageIndex%3]+state.stage.handsLeft+baseInterest+(config.characterAbilityEnabled&&state.characterId==='xiemu'&&state.stage.handsLeft===0?2:0);
          state.stage.goldEarned=reward;state.stage.clearId=`${state.runId}/clear/${state.stageIndex}`;
          state.gold+=reward;
          try{
            const interestJoker=state.jokers.find(j=>j.definitionId==='e04');
            if(interestJoker)clearGoldSource(state,'e04',jokerInterest,interestJoker.instanceId);
            clearGoldSource(state,'U04',itemInterest);grantHeldGoldPaper(state);grantClearItems(state);
            economicHooks(state,'onStageClear',events);persistJokerSources(state,events,'onStageClear');scoredEvent.score=state.lastTrace!;
            grantProgramReward(state,goldBeforeRewards);scoredEvent.score=state.lastTrace!;
          }
          catch(error){return {ok:false,code:'score-diagnostic',diagnostic:{code:error instanceof ScoreFault?error.code:error instanceof Error?error.message:'score-error',events:error instanceof ScoreFault?error.events:[]}};}
          clearStageEffects(state);state.totalHeat=total;state.stageIndex++;
          state.phase=state.tourMode==='normal'&&state.stageIndex===R2_AVAILABLE_CHAPTERS*3?'run-won':'stage-cleared';
          if(state.phase==='run-won'){
            state.outcome={reason:'all-stages-cleared',stageIndex:state.stage.index};
            if(state.mode==='standard')state.normalCompletion={clearId:state.stage.clearId,totalHeat:state.totalHeat};
          }
          events.push({type:'stage-ended',cleared:true,stage:structuredClone(state.stage)});
        } else {
          try {
            refundHand(state,events);if(state.stage.handsLeft===0)rescueHand(state,events);
            sealBossJoker(state);scoredEvent.score=state.lastTrace!;
            if(state.stage.handsLeft===0){clearStageEffects(state);state.phase='run-lost';state.outcome={reason:'hands-exhausted',stageIndex:state.stage.index};events.push({type:'stage-ended',cleared:false,stage:structuredClone(state.stage)});}
            else{refill(state);refreshDisabled(state);noCards(state,events);}
          }
          catch(error){return {ok:false,code:'score-diagnostic',diagnostic:{code:error instanceof ScoreFault?error.code:error instanceof Error?error.message:'score-error',events:error instanceof ScoreFault?error.events:[]}};}
        }
        break;
      }
      case 'SkipStage': {
        if(!['shop','stage-ready'].includes(state.phase))return fail('wrong-phase');
        if(state.stageIndex%3===2)return fail('boss-cannot-skip');
        const definition=getR2Stage(state.stageIndex,state.tourMode,state.difficulty);if(!definition)return fail('unknown-stage');
        let skipResult:R2SkipResult;
        if(state.stageIndex%3===0){state.purchaseCoupons++;skipResult={kind:'coupon',amount:2};}
        else if(state.consumables.length<r2ConsumableCapacity(state)){state.consumables.push({instanceId:`${state.runId}/skip/${state.stageIndex}`,definitionId:state.chapterSkipConsumable});skipResult={kind:'consumable',definitionId:state.chapterSkipConsumable};}
        else{state.gold++;skipResult={kind:'gold',amount:1};}
        state.discardPile.push(...state.handOrder);state.handOrder=[];clearStageEffects(state);
        state.stage=entryStage(state,definition.targetHeat,skipResult);
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
