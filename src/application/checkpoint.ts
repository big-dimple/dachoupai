import {usesR2ErxiangCore} from '../domain/r2GroupUpgrade';
import {erxiangCoreFacts,type ErxiangCoreTrace} from '../domain/r2ErxiangCore';
import {assertGroupTraceExecutions} from './groupTraceExecutions';
import {hasR2ComboGrowthContract,isR2GroupUpgrade,hasR2GroupUpgradeContract,isR2RouteStarter,R2_ROUTE_STARTERS} from '../domain/r2GroupUpgrade';
import {R2_GROUP_UPGRADE_IDS} from '../content/r2GroupUpgradeJokers';
import {R2_GROUP_HAND_TYPES,r2LargestScoringRankGroup} from '../domain/r2GroupHands';
import {R2_COMBO_GROWTH_IDS} from '../content/r2ComboGrowthJokers';
import {r2ColdOpening,type R2OpeningDiscard} from '../domain/r2ComboGrowth';
import {R2_ASSIST_VERSION} from '../domain/r2AssistIdentity';
import {R2_ASSIST_ADAPTED_IDS} from '../content/r2AssistJokers';
import {r2ScoreConditionMatches} from '../domain/r2Conditions';
import {r2JokerDefinitionsFor} from '../domain/r2ContentProfiles';
import {r2AssistFacts,AMO_ASSIST_TYPES} from '../domain/r2Assist';
import {r2SelectionFacts} from '../domain/r2SelectionFacts';
import {R2_PUBLISHED_JOKERS as R2_JOKERS} from '../domain/r2PublishedContent';
import {assertR2Invariants,r2RulesetFor,r2UsesAssist,r2ScoreTimingFor,R2_LIMITS,R2_RESOURCE_CONTRACT} from '../domain/r2Run';
import {createRun,type R2RunState,type Command,type Action} from '../domain/run';
import {routeStarterStartCommand,routeStarterScoreEvent} from '../domain/r2RouteStarter';
import {CHARACTER_IDS} from '../domain/characters';
import {R2_HAND_TYPES,type R2HandType} from '../domain/evaluateR2';
import {r2GrowthCaps,r2GrowthInitials,r2GrowthMinimums,supportsR2Joker,validR2JokerCounters,validR2Condition,type R2JokerInstance} from '../content/r2Schema';
import {Rational,MAX_INTEGER_DIGITS} from '../domain/rational';
import {SCORE_LIMITS,SCORE_OPERATIONS,r2ScoringDisabledJokerIds,type ScoreEvent,type ScoreTrace} from '../domain/scoreR2';
import {SeededRng} from '../core/SeededRng';
import {stableHash} from '../domain/hash';
import {r2DisabledCards,R2_AVAILABLE_CHAPTERS,R2_ENDLESS_MAX_CHAPTER,R2_SKIP_CONSUMABLES,r2StageSpec,r2BossHistoryValid,r2BossPlanValid,type R2TourMode,type R2BossPlan} from '../domain/r2Chapter';
import {EDITIONS,ENHANCEMENTS,RANKS,SUITS,type PlayingCard} from '../cards/types';
import {R2_TOOL_CATALOG,type R2LongTermOperation} from '../content/r2Tools';
import {R2_IMPLEMENTED_TOOL_FEATURES,r2CardSpecialsSupported,r2EditionSupported,r2ItemSupported,r2ToolSupported} from '../domain/r2ToolRuntime';
import {r2Price,r2ToolPrice,r2ItemPrice} from '../domain/r2Shop';
import {resolveR2ModeConfig,r2ModeSeedAllowed,r2ModeStorageKey,type R2ModeConfig} from '../content/r2Modes';
import {r2ProgramStateValid,r2ProgramQualified,type R2ProgramState} from '../domain/r2Programs';
import {r2HandsBudget,r2DiscardBudget} from '../domain/r2Resources';

export const MAX_JOURNAL=256;
export const MAX_IMPORT_BYTES=16*1024*1024;
const luckyGoldEffect=R2_TOOL_CATALOG.enhancements.find(definition=>definition.id==='lucky-paper')!.effects.find(effect=>effect.kind==='chance-add-gold')!;
const heldGoldEffect=R2_TOOL_CATALOG.enhancements.find(definition=>definition.id==='gold-paper')!.effects.find(effect=>effect.kind==='add-gold')!;
type ShelfEffect=Extract<R2LongTermOperation,{base:number}>;
const jokerShelfEffect=R2_TOOL_CATALOG.longTermItems.map(item=>item.operation).find((operation):operation is ShelfEffect=>operation.kind==='joker-offer-count')!;
const itemShelfEffect=R2_TOOL_CATALOG.longTermItems.map(item=>item.operation).find((operation):operation is ShelfEffect=>operation.kind==='item-offer-count')!;
const itemInterestEffect=R2_TOOL_CATALOG.longTermItems.map(item=>item.operation).find((operation):operation is Extract<R2LongTermOperation,{amount:number}>=>operation.kind==='interest-cap')!;
const jokerInterestEffect=R2_JOKERS.find(joker=>joker.id==='e04')!.modifiers!.find(modifier=>modifier.kind==='interest-cap')!;
const normalClearEffect=R2_TOOL_CATALOG.longTermItems.map(item=>item.operation).find(operation=>operation.kind==='first-normal-clear-per-chapter')!;
const bossUpgradeEffect=R2_TOOL_CATALOG.longTermItems.map(item=>item.operation).find(operation=>operation.kind==='boss-most-used-hand-upgrade')!;
const firstBossSupply=R2_TOOL_CATALOG.tools.find(tool=>tool.id==='T16')!.rewardSources.find(source=>source.source==='first-boss-clear')!;
const handLifetimeEffect=R2_JOKERS.find(joker=>joker.id==='f06')!.hooks.flatMap(hook=>hook.operations).find(operation=>operation.kind==='expire-after-hands')!;
const clearRuleDefinitions=['U04','U09','U12','T16'] as const;
const programRuleDefinitions=['PG01','PG02','PG03','PG04'] as const;
export interface Checkpoint {
  format:'dachoupai-checkpoint';formatVersion:1;state:R2RunState;
  journalBaseSeq:number;journal:Command[];checksum:string;
}
type ReadResult={ok:true;checkpoint:Checkpoint}|{ok:false;code:string};
const fail=(message:string):never=>{throw Error(message);};
function record(value:unknown,required:string[],optional:string[]=[]):Record<string,unknown> {
  if(!value||typeof value!=='object'||Array.isArray(value))return fail('invalid-save-object');
  const object=value as Record<string,unknown>;
  if(required.some(k=>!Object.hasOwn(object,k))||Object.keys(object).some(k=>![...required,...optional].includes(k)))return fail('invalid-save-fields');
  return object;
}
const integer=(value:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>{if(!Number.isSafeInteger(value)||(value as number)<min||(value as number)>max)fail('invalid-save-integer');};
const text=(value:unknown,max=16384)=>{if(typeof value!=='string'||!value.length||value.length>max)fail('invalid-save-text');};
const strings=(value:unknown,max=10000)=>{if(!Array.isArray(value)||value.length>max||value.some(v=>typeof v!=='string'||!v.length||v.length>16384))fail('invalid-save-ids');};
function uniqueIds(value:unknown,max:number):void {strings(value,max);if(new Set(value as string[]).size!==(value as string[]).length)fail('duplicate-save-ids');}
function bossPlan(value:unknown):asserts value is R2BossPlan {if(!r2BossPlanValid(value))fail('invalid-save-boss-plan');}
const array=(value:unknown,max:number)=>{if(!Array.isArray(value)||value.length>max)fail('invalid-save-array');return value as unknown[];};
const oneOf=(value:unknown,options:readonly unknown[])=>{if(!options.includes(value))fail('invalid-save-enum');};
const bool=(value:unknown)=>{if(typeof value!=='boolean')fail('invalid-save-boolean');};
function score(value:unknown):void {if(typeof value!=='string'||!/^(0|[1-9]\d*)$/.test(value)||value.length>MAX_INTEGER_DIGITS)fail('invalid-save-score');}
function fraction(value:unknown):void {const v=record(value,['n','d']);const number=Rational.fromJSON(v);if(number.n<0n||number.d<=0n)fail('invalid-save-fraction');}
function accumulator(value:unknown):void {const v=record(value,['H','M']);fraction(v.H);fraction(v.M);}
function cursor(value:unknown):void {const v=record(value,['algorithm','state']);SeededRng.restore(v as unknown as ReturnType<SeededRng['snapshot']>);}
function cards(value:unknown,max:number,enhancementsAllowed=true):void {
  const ids=new Set<unknown>();
  for(const item of array(value,max)){
    const card=record(item,['id','rank','suit'],['enhancement','edition']);text(card.id);oneOf(card.rank,RANKS);oneOf(card.suit,SUITS);
    if(card.enhancement!==undefined)oneOf(card.enhancement,ENHANCEMENTS);
    if(!enhancementsAllowed&&card.enhancement!==undefined)fail('save-enhancement-forbidden');
    if(card.edition!==undefined)oneOf(card.edition,EDITIONS);
    if(ids.has(card.id))fail('duplicate-save-card');ids.add(card.id);
    if(!r2CardSpecialsSupported(card as unknown as PlayingCard))fail('save-card-special-not-enabled');
  }
}
function jokers(value:unknown,maximum:number=R2_LIMITS.jokerSlots,catalog=R2_JOKERS):void {
  const R2_JOKERS=catalog;
  const ids=new Set<unknown>(),definitions=new Set<unknown>();
  for(const item of array(value,maximum)){
    const j=record(item,['instanceId','definitionId','paidPrice','growth'],['counters','edition']);text(j.instanceId);integer(j.paidPrice);
    if(j.edition!==undefined){oneOf(j.edition,EDITIONS);if(!r2EditionSupported(j.edition as typeof EDITIONS[number]))fail('save-joker-edition-not-enabled');}
    const definition=R2_JOKERS.find(d=>d.id===j.definitionId);if(!definition)fail('unknown-save-joker');
    if(ids.has(j.instanceId)||definitions.has(j.definitionId))fail('duplicate-save-joker');ids.add(j.instanceId);definitions.add(j.definitionId);
    const caps=r2GrowthCaps(definition!),minimums=r2GrowthMinimums(definition!),keys=Object.keys(caps);
    const growth=record(j.growth,Object.keys(r2GrowthInitials(definition!)),keys);Object.values(growth).forEach(fraction);
    for(const [key,value] of Object.entries(growth)){
      const number=Rational.fromJSON(value);
      if(number.compare(Rational.fromJSON(minimums[key]))<0||number.compare(Rational.fromJSON(caps[key]))>0)fail('save-joker-growth-cap');
    }
    if(!validR2JokerCounters(j.definitionId as string,j.counters,definition))fail('invalid-save-joker-counters');
  }
}
function shop(value:unknown,commandSeq:number,stageMaximum:number,config:R2ModeConfig,identity:{contentVersion?:unknown;contentHash?:unknown}):void {
  const s=record(value,['visitIndex','rerollCount','purchases','offers','toolOffers','itemOffers','soldJoker','freeRerolls']);
  integer(s.visitIndex,0,stageMaximum-1);integer(s.rerollCount);integer(s.purchases,0,commandSeq);bool(s.soldJoker);
  oneOf(s.freeRerolls,[0,1]);if((!config.programsEnabled||!config.reroll.allowed)&&s.freeRerolls!==0)fail('invalid-save-free-rerolls');
  const ids=new Set<unknown>(),caps={offers:jokerShelfEffect.base+jokerShelfEffect.amount,toolOffers:1,itemOffers:itemShelfEffect.base+itemShelfEffect.amount};
  for(const name of ['offers','toolOffers','itemOffers'] as const)for(const item of array(s[name],caps[name])){
    const offer=record(item,['offerId','definitionId','price','consumed'],name==='offers'?['edition']:[]);
    text(offer.offerId);text(offer.definitionId);integer(offer.price,1);bool(offer.consumed);
    if(ids.has(offer.offerId))fail('duplicate-save-offer');ids.add(offer.offerId);
    const definitionId=offer.definitionId as string;
    if(name==='offers'){
      const definition=R2_JOKERS.find(joker=>joker.id===definitionId);
      if(!definition||!supportsR2Joker(definition))fail('save-joker-offer-not-enabled');
      if(offer.edition!==undefined){oneOf(offer.edition,EDITIONS);if(!r2EditionSupported(offer.edition as typeof EDITIONS[number]))fail('save-offer-edition-not-enabled');}
      if(offer.price!==r2Price(definitionId,offer.edition as typeof EDITIONS[number]|undefined,identity))fail('invalid-save-offer-price');
    }else if(name==='toolOffers'){
      const definition=R2_TOOL_CATALOG.tools.find(tool=>tool.id===definitionId);
      if(!definition||!r2ToolSupported(definitionId)||!definition.shopWeight)fail('save-tool-offer-not-enabled');
      if(!config.enhancementsAllowed&&['set-enhancement','random-enhancement'].includes(definition!.operation.kind)||
        !config.reroll.allowed&&definition!.operation.kind==='free-reroll')fail('save-tool-offer-mode-forbidden');
      if(offer.price!==r2ToolPrice(definitionId))fail('invalid-save-offer-price');
    }else{
      if(!r2ItemSupported(definitionId))fail('save-item-offer-not-enabled');
      if(offer.price!==r2ItemPrice(definitionId))fail('invalid-save-offer-price');
    }
  }
}
function trace(value:unknown,context:{core:boolean;group:boolean;combo:boolean;definitions:ReturnType<typeof r2JokerDefinitionsFor>;runId:string;characterId:string;amoScoreTiming:'before-joker'|'after-joker'|'assist-v1';discoveredHands:readonly string[];levels:R2RunState['handLevels'];stage:R2RunState['stage'];stageIndex:number;config:R2ModeConfig;program:R2ProgramState|null;usage:R2RunState['chapterHandUsage'];liveJokerIds?:readonly string[];liveJokers?:readonly R2JokerInstance[];settledGold?:number}):void {
  if(value===null)return;
  const R2_JOKERS=context.definitions,combo=context.combo,group=context.group;
  const stage=context.stage;if(!stage)return fail('invalid-save-trace-stage');
  const successfulStage=stage.skipResult===null&&stage.clearId!==null&&stage.index+1===context.stageIndex&&BigInt(stage.heat)>=BigInt(stage.targetHeat);
  const prototype=context.amoScoreTiming==='assist-v1';
  const t=record(value,[...(context.core?['erxiangCore']:[]),...(combo?['combo']:[]),...(prototype?['assist']:[]),'rulesVersion','rootId','handType','level','sets','finalScore','accumulator','events','jokers','rng','destroyedJokerIds','goldDelta','destroyedCardIds','cards','sourceJokers','bossContext']);
  let clearCapital:number|null=null;
  if(combo){const clock=record(t.combo,['goldBeforeRewards']);if(clock.goldBeforeRewards!==null)integer(clock.goldBeforeRewards);clearCapital=clock.goldBeforeRewards as number|null;if(successfulStage!==(clearCapital!==null))fail('invalid-save-combo-clear-clock');}
  oneOf(t.rulesVersion,['r2']);text(t.rootId);oneOf(t.handType,R2_HAND_TYPES);integer(t.level,1,30);score(t.finalScore);accumulator(t.accumulator);cursor(t.rng);jokers(t.jokers,context.config.jokerSlots,R2_JOKERS);
  const bossContext=record(t.bossContext,['boss','previousHandType','sealedJokerIds','challengeDisabledJokerId']);
  if(bossContext.challengeDisabledJokerId!==stage.challengeDisabledJokerId)fail('invalid-save-trace-challenge-ban');
  if(bossContext.boss!==null)bossPlan(bossContext.boss);
  if(stableHash(bossContext.boss)!==stableHash(stage.boss))fail('invalid-save-trace-boss');
  oneOf(bossContext.previousHandType,[null,...R2_HAND_TYPES]);uniqueIds(bossContext.sealedJokerIds,context.config.jokerSlots);
  const startingSeals=bossContext.sealedJokerIds as string[],boss=bossContext.boss as R2BossPlan|null;
  if(startingSeals.length>Math.max(0,stage.playIndex-1)||startingSeals.some(id=>!stage.initialJokerIds.includes(id))||boss?.definitionId!=='B15'&&startingSeals.length)fail('invalid-save-trace-seals');
  if(stage.playIndex<1||(stage.playIndex===1)!==(bossContext.previousHandType===null))fail('invalid-save-trace-previous-hand');
  const sets=record(t.sets,[...(prototype?['assistConsumedIds']:[]),'playedIds','scoringIds','activeScoringIds','heldIds']);
  for(const [key,ids] of Object.entries(sets))strings(ids,key==='heldIds'?R2_RESOURCE_CONTRACT.handMaximum:R2_LIMITS.maxSelected);
  const played=sets.playedIds as string[],held=sets.heldIds as string[],scoring=sets.scoringIds as string[],active=sets.activeScoringIds as string[],consumed=prototype?sets.assistConsumedIds as string[]:[],all=[...played,...held,...consumed];
  if(!played.length||all.length>R2_RESOURCE_CONTRACT.handMaximum||new Set(all).size!==all.length||new Set(scoring).size!==scoring.length||scoring.some(id=>!played.includes(id))||new Set(active).size!==active.length||active.some(id=>!scoring.includes(id)))fail('invalid-save-trace-cards');
  integer(t.goldDelta,0,R2_TOOL_CATALOG.limits.luckyGoldPerHand);cards(t.cards,R2_RESOURCE_CONTRACT.handMaximum,context.config.enhancementsAllowed);jokers(t.sourceJokers,context.config.jokerSlots,R2_JOKERS);
  const cardSources=new Map((t.cards as PlayingCard[]).map(card=>[card.id,card])),jokerSources=new Map((t.sourceJokers as R2JokerInstance[]).map(joker=>[joker.instanceId,joker]));
  if([...jokerSources.keys()].some(id=>!stage.initialJokerIds.includes(id)))fail('invalid-save-trace-initial-jokers');
  const disabledJokers=new Set(r2ScoringDisabledJokerIds(boss,[...jokerSources.values()],R2_JOKERS,startingSeals,stage.challengeDisabledJokerId));
  if(all.length!==cardSources.size||all.some(id=>!cardSources.has(id)))fail('invalid-save-trace-cards');
  for(const ids of [played,held,scoring,active,consumed]){const order=(t.cards as PlayingCard[]).filter(card=>ids.includes(card.id)).map(card=>card.id);if(order.some((id,index)=>id!==ids[index]))fail('invalid-save-trace-order');}
  let assistMultiplier:number|null=null;
  if(prototype||group){
    const selection={hand:t.cards as PlayingCard[],selectedIds:played,disabledIds:boss?r2DisabledCards(boss,stage.index,t.cards as PlayingCard[]):[],jokers:t.sourceJokers as R2JokerInstance[],definitions:R2_JOKERS};
    const facts=!prototype||t.assist===null?r2SelectionFacts(selection):r2AssistFacts({...selection,assistIds:consumed});
    if(t.handType!==facts.type||(['playedIds','scoringIds','activeScoringIds','heldIds'] as const).some(key=>stableHash(sets[key])!==stableHash(facts[key])))fail('invalid-save-assist-sets');
    if(!prototype||t.assist===null){if(consumed.length)fail('invalid-save-assist-consumption');}
    else {
      const a=record(t.assist,['ids','kind','multiplier']);
      if(!stage.assistUsed||context.characterId!=='amo'||!context.config.characterAbilityEnabled||boss?.definitionId==='B08'||
        stableHash(a.ids)!==stableHash(consumed)||a.kind!==(consumed.length===2?'pair':'three-kind')||a.multiplier!==(consumed.length===2?2:4))fail('invalid-save-assist-consumption');
      assistMultiplier=a.multiplier as number;
    }
  }
  const events=array(t.events,SCORE_LIMITS.eventCount);if(!events.length)fail('empty-save-trace');
  const eventIds=new Set<unknown>(),rootEventIds:unknown[]=[],destroyedCards:string[]=[],destroyedJokers:string[]=[],glassHits=new Set<string>(),heldGoldSources=new Set<string>();let luckyGold=0n;
  const coefficients=new Map([...jokerSources.values()].filter(joker=>Object.hasOwn(joker.growth,'coefficient')).map(joker=>[joker.instanceId,Rational.fromJSON(joker.growth.coefficient)]));
  const coefficientReads=new Set<string>(),coefficientChanges=new Set<string>(),chanceChecks=new Map<string,boolean>(),chanceHeat=new Set<string>(),clearCycles=new Map<string,number>(),rewardSources=new Set<string>(),handRefunds=new Set<string>();
  const cardScoreOrder=[...jokerSources.keys()],wholeScoreOrder=boss?.definitionId==='B13'?[...cardScoreOrder].reverse():cardScoreOrder;
  let wholeSlot=-1,cardSlot=-1;
  const comboEvents=new Set<string>();
  let core:ErxiangCoreTrace|undefined;
  if(context.core){
    const saved=record(t.erxiangCore,['targetId','previousRank','targetRank','targetIds','extraPerCard']);
    if(saved.targetId!==null)text(saved.targetId);oneOf(saved.previousRank,[null,...RANKS]);oneOf(saved.targetRank,[null,...RANKS]);uniqueIds(saved.targetIds,5);oneOf(saved.extraPerCard,[0,1,2]);
    core=erxiangCoreFacts(t.cards as PlayingCard[],{type:t.handType as R2HandType,activeScoringIds:active},{targetId:saved.targetId as string|null,previousRank:saved.previousRank as import('../cards/types').Rank|null},context.config.characterAbilityEnabled&&boss?.definitionId!=='B08');
    if(stableHash(core)!==stableHash(saved)||stage.playIndex===1&&core.previousRank!==null||(!context.config.characterAbilityEnabled||boss?.definitionId==='B08')&&core.previousRank!==null)fail('invalid-save-core-trace');
    if(stage.erxiangPreviousRank!==(stage.index===context.stageIndex&&stage.handsLeft>0&&stage.clearId===null?core.targetRank:null))fail('invalid-save-core-chain');
  }
  const coreEvents=new Set<string>(),coreCaps=new Set<string>();
  const groupRetriggers=new Map<string,number>(),groupCaps=new Set<string>(),cardRetriggers=new Map<string,number>(),cardRoots=new Map<string,string>();
  const assistWholeEffects=new Set<string>(),assistEditionSources=new Set<string>();
  const emptySlotRewards=new Set<string>();
  const lifetimeCounts=new Map<string,number>(),rescues=new Set<string>();let previousEvent:Record<string,unknown>|undefined;
  const sealTargets:string[]=[];let halves=0,finalSeen=false,clearSeen=false;
  let programReward:string|null=null;
  const halfRequired=boss?.definitionId==='B12'||boss?.definitionId==='B05'&&bossContext.previousHandType===t.handType;
  const unchanged=(before:unknown,after:unknown)=>{
    const a=before as Record<string,unknown>,b=after as Record<string,unknown>;
    if(['H','M'].some(key=>Rational.fromJSON(a[key]).compare(Rational.fromJSON(b[key]))!==0))fail('invalid-save-resource-score');
  };
  for(const item of events){
    const e=record(item,['eventId','rootId','rootEventId','phase','sourceType','sourceDefinitionId','sourceInstanceId','operation','value','before','after','reasonKey','visibleCondition','retriggerDepth'],['targetCardId','targetJokerInstanceId','resourceBefore','resourceAfter','targetHandType','growthBefore','growthAfter','rewardDefinitionId','programGoldBeforeReward',...(combo?['goldBeforeRewards']:[])]);
    for(const k of ['eventId','rootId','rootEventId','sourceDefinitionId','sourceInstanceId','reasonKey'])text(e[k]);
    if(e.rootId!==t.rootId||eventIds.has(e.eventId))fail('invalid-save-trace-root');eventIds.add(e.eventId);rootEventIds.push(e.rootEventId);
    oneOf(e.phase,['base','onCardScore','onHeldCard','characterScore','jokerScore','finalScore','afterHand','beforeFailure','onStageClear']);
    oneOf(e.sourceType,['rule','card','character','joker']);
    oneOf(e.operation,SCORE_OPERATIONS);
    if(!combo&&['multiply-coefficient','rescue-multiplier','consume-rescue','add-gold-per-held','add-gold-per-capital'].includes(e.operation as string))fail('invalid-save-combo-operation');
    if(sealTargets.length&&['afterHand','beforeFailure'].includes(e.phase as string))fail('invalid-save-boss-seal-order');
    if(e.phase==='onStageClear')clearSeen=true;
    if(e.operation==='seal-joker')text(e.targetJokerInstanceId);
    else if(Object.hasOwn(e,'targetJokerInstanceId'))fail('invalid-save-target-joker-operation');
    if(e.operation==='upgrade-hand'){oneOf(e.targetHandType,R2_HAND_TYPES);if(!context.discoveredHands.includes(e.targetHandType as string))fail('undiscovered-save-upgrade-target');}
    else if(Object.hasOwn(e,'targetHandType'))fail('invalid-save-target-hand-operation');
    fraction(e.value);accumulator(e.before);accumulator(e.after);integer(e.retriggerDepth,0,1);if(e.targetCardId!==undefined)text(e.targetCardId);
    if(!group&&(e.visibleCondition as Record<string,unknown>)?.kind==='largest-scoring-rank-group')fail('invalid-save-group-condition');
    if(!validR2Condition(e.visibleCondition)||e.visibleCondition.kind==='cold-opening-discard'||!prototype&&!combo&&e.visibleCondition.kind==='hand-type-relation')fail('invalid-save-visible-condition');
    if(Object.hasOwn(e,'resourceBefore')||Object.hasOwn(e,'resourceAfter')){integer(e.resourceBefore);integer(e.resourceAfter);}
    const sourceCard=cardSources.get(e.sourceInstanceId as string);
    if(e.targetCardId!==undefined){
      if(consumed.includes(e.targetCardId as string))fail('invalid-save-assist-hook');
      if(!cardSources.has(e.targetCardId as string))fail('unknown-save-trace-target');
      if(e.phase==='onCardScore'&&!active.includes(e.targetCardId as string)||e.phase==='onHeldCard'&&!held.includes(e.targetCardId as string))fail('invalid-save-trace-target-set');
    }
    if(e.sourceType==='card'){
      if(!sourceCard||e.targetCardId!==sourceCard.id||![sourceCard.id,`rank-${sourceCard.rank}`].includes(e.sourceDefinitionId as string))fail('invalid-save-card-source');
      const scope=e.phase==='onCardScore'||e.phase==='afterHand'?active:e.phase==='onHeldCard'||e.phase==='onStageClear'?held:[];
      if(!scope.includes(sourceCard!.id))fail('invalid-save-card-source-set');
    }
    const sourceJoker=jokerSources.get(e.sourceInstanceId as string);
    if(e.sourceType==='joker'&&(!sourceJoker||sourceJoker.definitionId!==e.sourceDefinitionId))fail('invalid-save-joker-source');
    if(e.sourceType==='joker'&&disabledJokers.has(e.sourceInstanceId as string)&&(['onCardScore','onHeldCard','jokerScore'].includes(e.phase as string)||['add-heat','add-multiplier','multiply-multiplier','retrigger-card','retrigger-cap','read-growth','consume-growth','read-coefficient','chance-heat-check'].includes(e.operation as string)))fail('invalid-save-disabled-joker-event');
    if(e.sourceType==='character'&&(e.sourceDefinitionId!==context.characterId||e.sourceInstanceId!==`${context.runId}/character`))fail('invalid-save-character-source');
    if(e.sourceType==='character'&&(boss?.definitionId==='B08'||!context.config.characterAbilityEnabled)&&(e.phase==='characterScore'||context.core))fail('invalid-save-disabled-character-event');
    if(e.sourceType==='rule'&&(e.sourceInstanceId!==context.runId||![t.handType,'B02','B05','B12','B15',...clearRuleDefinitions,...programRuleDefinitions].includes(e.sourceDefinitionId)))fail('invalid-save-rule-source');
    const amount=Rational.fromJSON(e.value);
    const comboSource=combo&&e.sourceType==='joker'&&!!sourceJoker&&R2_COMBO_GROWTH_IDS.includes(sourceJoker.definitionId);
    const groupFamily=e.sourceType==='joker'&&!!sourceJoker&&R2_GROUP_UPGRADE_IDS.includes(sourceJoker.definitionId);
    const adaptedJoker=e.sourceType==='joker'&&sourceJoker&&(((prototype||combo)&&(R2_ASSIST_ADAPTED_IDS.includes(sourceJoker.definitionId)||comboSource))||groupFamily);
    let validatedEdition=false;
    if(adaptedJoker){
      if((e.reasonKey as string).startsWith('edition.')){
        // A display reason is only a claim. Prove the exception against the saved
        // instance and the existing edition matrix before bypassing its body hook.
        const edition=R2_TOOL_CATALOG.editions.find(row=>row.id===(sourceJoker!.edition??'none')),effect=edition?.effect;
        if(!effect||!edition!.appliesTo.includes('joker')||edition!.jokerTiming!=='after-own-jokerScore'||
          e.reasonKey!==`edition.${edition!.id}.${effect.kind}`||e.operation!==effect.kind||e.phase!=='jokerScore'||finalSeen||
          e.retriggerDepth!==0||e.rootEventId!==e.eventId||stableHash(e.visibleCondition)!==stableHash({kind:'always'})||
          ['targetCardId','targetJokerInstanceId','targetHandType','resourceBefore','resourceAfter','growthBefore','growthAfter','rewardDefinitionId','programGoldBeforeReward'].some(key=>Object.hasOwn(e,key))||
          amount.compare(Rational.fromJSON(effect.value))!==0||assistEditionSources.has(sourceJoker!.instanceId))fail('invalid-save-assist-joker-edition');
        const before=e.before as {H:unknown;M:unknown},after=e.after as {H:unknown;M:unknown},heat=Rational.fromJSON(before.H),multiplier=Rational.fromJSON(before.M);
        const expectedHeat=effect!.kind==='add-heat'?heat.add(amount):heat;
        const expectedMultiplier=effect!.kind==='add-multiplier'?multiplier.add(amount):effect!.kind==='multiply-multiplier'?multiplier.multiply(amount):multiplier;
        if(expectedHeat.compare(Rational.fromJSON(after.H))!==0||expectedMultiplier.compare(Rational.fromJSON(after.M))!==0)fail('invalid-save-assist-joker-edition-delta');
        assistEditionSources.add(sourceJoker!.instanceId);validatedEdition=true;
      }else if(e.phase==='jokerScore'&&assistEditionSources.has(sourceJoker!.instanceId))fail('invalid-save-assist-joker-edition-order');
    }
    if(group&&e.phase==='onCardScore'&&e.sourceType==='card'&&sourceCard&&e.sourceDefinitionId===`rank-${sourceCard.rank}`&&e.operation==='add-heat')cardSlot=-1;
    if(group&&e.sourceType==='joker'&&['jokerScore','onCardScore'].includes(e.phase as string)){
      const order=e.phase==='jokerScore'?wholeScoreOrder:cardScoreOrder,index=order.indexOf(e.sourceInstanceId as string);
      if(index<0||e.phase==='jokerScore'&&index<wholeSlot||e.phase==='onCardScore'&&index<cardSlot)fail('invalid-save-group-slot-order');if(e.phase==='jokerScore')wholeSlot=index;else cardSlot=index;
    }
    if(groupFamily&&!validatedEdition){
      if(e.reasonKey!==`${sourceJoker!.definitionId}.${e.operation}`)fail('invalid-save-group-reason');
      if(['targetJokerInstanceId','targetHandType','growthBefore','growthAfter','rewardDefinitionId','programGoldBeforeReward','goldBeforeRewards'].some(key=>Object.hasOwn(e,key))||e.operation!=='add-gold'&&(Object.hasOwn(e,'resourceBefore')||Object.hasOwn(e,'resourceAfter')))fail('invalid-save-group-metadata');
      if(e.phase!=='onCardScore'&&e.rootEventId!==e.eventId||['jokerScore','onCardScore'].includes(e.phase as string)&&finalSeen||e.phase==='onStageClear'&&!finalSeen||e.phase==='afterHand'&&(!finalSeen||clearSeen))fail('invalid-save-group-phase');
    }
    if(group&&e.sourceType==='card'&&sourceCard&&e.sourceDefinitionId===`rank-${sourceCard.rank}`&&e.phase==='onCardScore'&&e.operation==='add-heat'&&e.retriggerDepth===0)cardRoots.set(sourceCard.id,e.eventId as string);
    if(group&&groupFamily&&sourceJoker!.definitionId==='b06'&&!validatedEdition){
      const target=e.targetCardId as string,key=sourceJoker!.instanceId+'/'+target;
      if(e.phase!=='onCardScore'||e.retriggerDepth!==0||finalSeen||!active.includes(target)||e.rootEventId!==cardRoots.get(target))fail('invalid-save-group-retrigger-root');
      unchanged(e.before,e.after);
      if(e.operation==='retrigger-card'){
        const expected=Math.min(1,SCORE_LIMITS.extraRetriggers-(cardRetriggers.get(target)??0));
        if(groupRetriggers.has(key)||amount.compare(new Rational(BigInt(expected))))fail('invalid-save-group-retrigger-value');groupRetriggers.set(key,expected);
      }else if(e.operation==='retrigger-cap'){
        if(groupCaps.has(key)||groupRetriggers.get(key)!==0||previousEvent?.sourceInstanceId!==sourceJoker!.instanceId||previousEvent?.targetCardId!==target||previousEvent?.operation!=='retrigger-card')fail('invalid-save-group-retrigger-cap');groupCaps.add(key);
      }else fail('invalid-save-group-retrigger-operation');
    }
    if(context.core&&e.sourceType==='character'){
      const target=e.targetCardId as string;
      if(!core?.targetIds.includes(target)||e.phase!=='onCardScore'||e.retriggerDepth!==0||e.rootEventId!==cardRoots.get(target)||e.reasonKey!==`erxiang.${e.operation}`||stableHash(e.visibleCondition)!==stableHash({kind:'always'}))fail('invalid-save-core-event');
      unchanged(e.before,e.after);
      if(e.operation==='retrigger-card'){
        const available=Math.min(core!.extraPerCard,SCORE_LIMITS.extraRetriggers-(cardRetriggers.get(target)??0));
        if(coreEvents.has(target)||amount.d!==1n||amount.n!==BigInt(available))fail('invalid-save-core-budget');coreEvents.add(target);
      }else if(e.operation==='retrigger-cap'){
        if(coreCaps.has(target)||previousEvent?.sourceType!=='character'||previousEvent.targetCardId!==target||previousEvent.operation!=='retrigger-card'||Rational.fromJSON(previousEvent.value).compare(new Rational(BigInt(core!.extraPerCard)))>=0||amount.compare(new Rational(4n))!==0)fail('invalid-save-core-cap');coreCaps.add(target);
      }else fail('invalid-save-core-operation');
    }
    if(group&&e.operation==='retrigger-card'&&e.phase==='onCardScore'&&e.retriggerDepth===0){
      const target=e.targetCardId as string,total=(cardRetriggers.get(target)??0)+Number(amount.n/amount.d);
      if(!active.includes(target)||amount.d!==1n||amount.n<0n||total>SCORE_LIMITS.extraRetriggers)fail('invalid-save-group-retrigger-budget');cardRetriggers.set(target,total);
    }
    if(comboSource&&!validatedEdition){
      const allowed:Record<string,readonly string[]>={a06:['read-coefficient','multiply-coefficient'],f10:['rescue-multiplier','consume-rescue'],d12:['add-gold-per-held'],e04:['add-gold-per-capital']};
      if(!allowed[sourceJoker!.definitionId].includes(e.operation as string)||e.rootEventId!==e.eventId||e.phase==='jokerScore'&&finalSeen)fail('invalid-save-combo-body-operation');
    }
    if(adaptedJoker&&!validatedEdition&&!comboSource){
      const definition=R2_JOKERS.find(d=>d.id===sourceJoker.definitionId)!;
      const hook=definition.hooks.find(h=>h.phase===e.phase&&stableHash(h.condition)===stableHash(e.visibleCondition));
      const op=hook?.operations.find(o=>o.kind===e.operation||o.kind==='retrigger-card'&&e.operation==='retrigger-cap');
      if(!hook||!op)fail('invalid-save-assist-joker-definition');
      const cards=t.cards as PlayingCard[],disabled=boss?r2DisabledCards(boss,stage.index,cards):[];
      const selected=cards.filter(c=>played.includes(c.id)),retained=cards.filter(c=>held.includes(c.id)),effective=cards.filter(c=>active.includes(c.id));
      const qualifies=hook!.phase==='onStageClear'?successfulStage&&(hook!.condition.kind==='stage-played-maximum'?stage.maxPlayedCount<=hook!.condition.maximum:groupFamily&&hook!.condition.kind==='hand-type-in'&&hook!.condition.values.includes(t.handType as R2HandType)):
        r2ScoreConditionMatches(hook!.condition,{played:selected,held:retained,validHeld:retained.filter(c=>!disabled.includes(c.id)),active:effective,scoringIds:scoring,handType:t.handType as R2HandType,previousHandType:bossContext.previousHandType as R2HandType|null,playIndex:stage.playIndex,handsAfter:stage.handsLeft,gold:0,discardsUsed:stage.discardsUsed,extraExecutions:0,resolvedFinal:null},cards.find(c=>c.id===e.targetCardId));
      if(!qualifies)fail('invalid-save-assist-joker-condition');
      if(['jokerScore','afterHand','onStageClear'].includes(e.phase as string)){
        const key=sourceJoker.instanceId+'/'+e.phase+'/'+e.operation;
        if(e.targetCardId!==undefined||e.retriggerDepth!==0||assistWholeEffects.has(key))fail('invalid-save-assist-joker-count');
        assistWholeEffects.add(key);
      }
      if(op!.kind==='add-heat'||op!.kind==='add-multiplier'||op!.kind==='multiply-multiplier'){
        if(amount.compare(Rational.fromJSON(op!.value))!==0)fail('invalid-save-assist-joker-value');
      }else if(op!.kind==='read-growth'){
        if(amount.compare(Rational.fromJSON(sourceJoker.growth[op!.key]??{n:'0',d:'1'}))!==0)fail('invalid-save-assist-joker-growth');
        if(groupFamily){const before=e.before as {H:unknown;M:unknown},after=e.after as {H:unknown;M:unknown};const heat=Rational.fromJSON(before.H),mult=Rational.fromJSON(before.M);if((op!.target==='heat'?heat.add(amount):heat).compare(Rational.fromJSON(after.H))||(op!.target==='multiplier'?mult.add(amount):mult).compare(Rational.fromJSON(after.M)))fail('invalid-save-group-growth-read');}
      }else if(op!.kind==='add-growth'){
        if(groupFamily)unchanged(e.before,e.after);
        const before=Rational.fromJSON(sourceJoker.growth[op!.key]??{n:'0',d:'1'}),raw=before.add(Rational.fromJSON(op!.value)),cap=Rational.fromJSON(op!.cap),next=raw.compare(cap)>0?cap:raw;
        if(amount.compare(next.add(before.multiply(new Rational(-1n))))!==0||Rational.fromJSON((t.jokers as R2JokerInstance[]).find(j=>j.instanceId===sourceJoker.instanceId)!.growth[op!.key]).compare(next)!==0)fail('invalid-save-assist-joker-growth');
      }else if(op!.kind==='add-gold'){
        if(amount.compare(new Rational(BigInt(op!.amount)))!==0)fail('invalid-save-assist-joker-value');
      }else if(op!.kind==='retrigger-card'){
        if(e.retriggerDepth!==0||e.targetCardId===undefined||amount.d!==1n||(e.operation==='retrigger-cap'?amount.n!==BigInt(SCORE_LIMITS.extraRetriggers):amount.n<0n||amount.n>BigInt(op!.count)))fail('invalid-save-assist-joker-retrigger');
      }
    }
    if(e.operation==='add-heat-per-empty-slot'){
      const operation=R2_JOKERS.find(definition=>definition.id===sourceJoker?.definitionId)?.hooks.flatMap(hook=>hook.operations).find(operation=>operation.kind==='add-heat-per-empty-slot');
      if(e.sourceType!=='joker'||!sourceJoker||operation?.kind!=='add-heat-per-empty-slot'||e.phase!=='jokerScore'||
        e.targetCardId!==undefined||e.retriggerDepth!==0||emptySlotRewards.has(sourceJoker.instanceId)||
        Object.hasOwn(e,'resourceBefore')||Object.hasOwn(e,'resourceAfter'))return fail('invalid-save-empty-slot-source');
      const raw=Rational.fromJSON(operation.value).multiply(new Rational(BigInt(context.config.jokerSlots-jokerSources.size))),cap=Rational.fromJSON(operation.cap),expected=raw.compare(cap)>0?cap:raw;
      const before=e.before as {H:unknown;M:unknown},after=e.after as {H:unknown;M:unknown};
      if(amount.compare(expected)!==0||Rational.fromJSON(before.H).add(expected).compare(Rational.fromJSON(after.H))!==0||
        Rational.fromJSON(before.M).compare(Rational.fromJSON(after.M))!==0)fail('invalid-save-empty-slot-reward');
      emptySlotRewards.add(sourceJoker.instanceId);
    }
    if(e.operation==='halve-base-heat'){
      const base=events[0] as Record<string,unknown>,before=e.before as {H:unknown;M:unknown},after=e.after as {H:unknown;M:unknown},original=base.after as {H:unknown;M:unknown};
      if(!halfRequired||e.sourceType!=='rule'||e.sourceDefinitionId!==boss?.definitionId||e.phase!=='base'||item!==events[1]||base.operation!=='base'||base.phase!=='base'||base.sourceType!=='rule'||base.sourceDefinitionId!==t.handType||++halves!==1||e.targetCardId!==undefined||e.retriggerDepth!==0||Object.hasOwn(e,'resourceBefore')||Object.hasOwn(e,'resourceAfter')||amount.compare(new Rational(1n,2n))!==0)fail('invalid-save-boss-half-source');
      if(Rational.fromJSON(before.H).compare(Rational.fromJSON(original.H))!==0||Rational.fromJSON(before.M).compare(Rational.fromJSON(original.M))!==0||Rational.fromJSON(after.H).multiply(new Rational(2n)).compare(Rational.fromJSON(before.H))!==0||Rational.fromJSON(after.M).compare(Rational.fromJSON(before.M))!==0)fail('invalid-save-boss-half-delta');
    }else if(e.sourceType==='rule'&&['B05','B12'].includes(e.sourceDefinitionId as string))fail('invalid-save-boss-operation');
    if(e.operation==='seal-joker'){
      const target=[...jokerSources.keys()].find(id=>!startingSeals.includes(id)&&!destroyedJokers.includes(id));
      if(boss?.definitionId!=='B15'||e.sourceType!=='rule'||e.sourceDefinitionId!=='B15'||e.phase!=='afterHand'||!finalSeen||clearSeen||sealTargets.length||!target||e.targetJokerInstanceId!==target||amount.compare(new Rational(1n))!==0||e.targetCardId!==undefined||e.retriggerDepth!==0||e.resourceBefore!==startingSeals.length||e.resourceAfter!==startingSeals.length+1)fail('invalid-save-boss-seal-source');
      unchanged(e.before,e.after);sealTargets.push(target!);
    }else if(e.sourceType==='rule'&&e.sourceDefinitionId==='B15')fail('invalid-save-boss-operation');
    if(e.phase==='finalScore'&&e.operation==='final-score')finalSeen=true;
    if(e.operation==='increment-hands-scored'){
      const count=(sourceJoker?.counters?.handsScored??0)+1;
      if(e.sourceType!=='joker'||sourceJoker?.definitionId!=='f06'||e.phase!=='afterHand'||!finalSeen||lifetimeCounts.has(sourceJoker.instanceId)||amount.d!==1n||amount.n!==BigInt(count)||e.targetCardId!==undefined||e.retriggerDepth!==0||Object.hasOwn(e,'resourceBefore')||Object.hasOwn(e,'resourceAfter'))fail('invalid-save-lifetime-count');
      unchanged(e.before,e.after);lifetimeCounts.set(sourceJoker!.instanceId,count);
    }
    if(e.operation==='rescue-hand'){
      if(e.sourceType!=='joker'||sourceJoker?.definitionId!=='f07'||e.phase!=='beforeFailure'||!finalSeen||rescues.has(sourceJoker.instanceId)||amount.compare(new Rational(1n))!==0||e.targetCardId!==undefined||e.retriggerDepth!==0||e.resourceBefore!==0||e.resourceAfter!==1||!stage.rescueUsed||stage.handsLeft!==1||stage.index!==context.stageIndex||BigInt(stage.heat)>=BigInt(stage.targetHeat))fail('invalid-save-rescue-source');
      unchanged(e.before,e.after);rescues.add(sourceJoker!.instanceId);
    }
    if(e.operation==='upgrade-hand'&&(e.sourceType!=='rule'||!['U09','PG03'].includes(e.sourceDefinitionId as string)))fail('invalid-save-clear-operation-source');
    const fromProgram=programRuleDefinitions.includes(e.sourceDefinitionId as typeof programRuleDefinitions[number]);
    if(fromProgram){
      const programId=e.sourceDefinitionId as typeof programRuleDefinitions[number];
      if(e.sourceType!=='rule'||e.phase!=='onStageClear'||!successfulStage||stage.index%3!==2||
        !context.config.programsEnabled||!context.config.eligibleProgramIds.includes(programId)||programReward!==null||e.targetCardId!==undefined||e.retriggerDepth!==0)
        fail('invalid-save-program-source');
      integer(e.programGoldBeforeReward);unchanged(e.before,e.after);programReward=programId;
      const sameChapter=context.program?.chapter===Math.floor(stage.index/3)+1;
      if(sameChapter&&(!context.program!.claimed||context.program!.selectedId!==programId||
        !r2ProgramQualified({...context.program!,claimed:false},context.usage,e.programGoldBeforeReward as number)))fail('invalid-save-program-qualification');
      if(programId==='PG01'||programId==='PG02'){
        if(e.operation!=='add-gold'||amount.compare(new Rational(4n))!==0)fail('invalid-save-program-gold');
      }else if(programId==='PG03'){
        integer(e.programGoldBeforeReward,15);
        if(e.operation==='upgrade-hand'){
          integer(e.resourceBefore,1,29);integer(e.resourceAfter,2,30);
          if(amount.compare(new Rational(1n))!==0||e.resourceAfter!==(e.resourceBefore as number)+1||
            sameChapter&&!Object.hasOwn(context.usage,e.targetHandType as string))fail('invalid-save-program-upgrade');
        }else if(e.operation==='program-reward-skipped'){
          if(amount.n!==0n||e.targetHandType!==undefined||sameChapter&&Object.entries(context.usage).some(([type,count])=>
            count>0&&(context.levels[type as R2HandType]??1)<30))fail('invalid-save-program-skip');
        }else fail('invalid-save-program-operation');
      }else if(e.operation!=='reward-free-reroll'||amount.compare(new Rational(1n))!==0||e.resourceBefore!==0||e.resourceAfter!==1)
        fail('invalid-save-program-reroll');
    }else if(Object.hasOwn(e,'programGoldBeforeReward')||['reward-free-reroll','program-reward-skipped'].includes(e.operation as string))fail('invalid-save-program-metadata');
    const coefficientOperation=e.operation==='read-coefficient'||e.operation==='add-coefficient';
    if(e.operation==='reset-coefficient')fail('invalid-save-coefficient-phase'); // Sales have their own committed DomainEvent.
    if(coefficientOperation&&!(combo&&sourceJoker?.definitionId==='a06')){
      if(e.sourceType!=='joker'||!sourceJoker||!['e11','f12'].includes(sourceJoker.definitionId)||e.targetCardId!==undefined||e.retriggerDepth!==0||Object.hasOwn(e,'resourceBefore')||Object.hasOwn(e,'resourceAfter'))fail('invalid-save-coefficient-source');
      const definition=R2_JOKERS.find(definition=>definition.id===sourceJoker!.definitionId)!;
      const current=coefficients.get(sourceJoker!.instanceId)!;
      if(e.operation==='read-coefficient'){
        if(e.phase!=='jokerScore'||coefficientReads.has(sourceJoker!.instanceId)||amount.compare(Rational.fromJSON(sourceJoker!.growth.coefficient))!==0)fail('invalid-save-coefficient-read');
        coefficientReads.add(sourceJoker!.instanceId);
      }else{
        const writer=definition.hooks.flatMap(hook=>hook.operations).find(operation=>operation.kind==='add-coefficient')!;
        if(writer.kind!=='add-coefficient'||e.phase!=='onStageClear'||coefficientChanges.has(sourceJoker!.instanceId))fail('invalid-save-coefficient-phase');
        if(!successfulStage||sourceJoker!.definitionId==='e11'&&stage.jokerSold||sourceJoker!.definitionId==='f12'&&stage.handsLeft!==0)fail('invalid-save-coefficient-qualification');
        fraction(e.growthBefore);fraction(e.growthAfter);unchanged(e.before,e.after);
        const before=Rational.fromJSON(e.growthBefore),after=Rational.fromJSON(e.growthAfter),cap=Rational.fromJSON(writer.cap),grown=before.add(Rational.fromJSON(writer.value)),expected=grown.compare(cap)>0?cap:grown;
        if(before.compare(current)!==0||after.compare(expected)!==0||after.add(before.multiply(new Rational(-1n))).compare(amount)!==0)fail('invalid-save-coefficient-delta');
        coefficients.set(sourceJoker!.instanceId,after);coefficientChanges.add(sourceJoker!.instanceId);
      }
    }
    if((Object.hasOwn(e,'growthBefore')||Object.hasOwn(e,'growthAfter'))&&e.operation!=='add-coefficient'&&!(combo&&e.operation==='multiply-coefficient'))fail('invalid-save-growth-operation');
    if(combo&&sourceJoker?.definitionId==='a06'&&['read-coefficient','multiply-coefficient'].includes(e.operation as string)){
      const source=sourceJoker,qualified=AMO_ASSIST_TYPES.includes(t.handType as R2HandType),key=source.instanceId+'/'+e.operation;
      if(e.sourceType!=='joker'||e.targetCardId!==undefined||e.retriggerDepth!==0||comboEvents.has(key))fail('invalid-save-combo-coefficient-source');comboEvents.add(key);
      const current=coefficients.get(source.instanceId)!;
      if(e.operation==='read-coefficient'){
        if(!qualified||e.phase!=='jokerScore'||amount.compare(current)!==0||Object.hasOwn(e,'growthBefore')||Object.hasOwn(e,'resourceBefore'))fail('invalid-save-combo-coefficient-read');
        const before=e.before as {H:unknown;M:unknown},after=e.after as {H:unknown;M:unknown};
        if(Rational.fromJSON(before.H).compare(Rational.fromJSON(after.H))||Rational.fromJSON(before.M).multiply(amount).compare(Rational.fromJSON(after.M)))fail('invalid-save-combo-coefficient-read');
        coefficientReads.add(source.instanceId);
      }else{
        const previous=bossContext.previousHandType as R2HandType|null,cap=new Rational(1000000n),raw=current.multiply(new Rational(23n,20n)),expected=raw.compare(cap)>0?cap:raw;
        if(!qualified||previous===null||!AMO_ASSIST_TYPES.includes(previous)||previous===t.handType||source.counters!.alternationUsed||e.phase!=='afterHand'||!finalSeen||e.resourceBefore!==0||e.resourceAfter!==1||amount.compare(new Rational(23n,20n)))fail('invalid-save-combo-coefficient-growth');
        fraction(e.growthBefore);fraction(e.growthAfter);unchanged(e.before,e.after);
        if(Rational.fromJSON(e.growthBefore).compare(current)||Rational.fromJSON(e.growthAfter).compare(expected))fail('invalid-save-combo-coefficient-growth');
        coefficients.set(source.instanceId,expected);coefficientChanges.add(source.instanceId);
      }
      const hook=R2_JOKERS.find(d=>d.id==='a06')!.hooks.find(h=>h.phase===e.phase)!;
      if(stableHash(e.visibleCondition)!==stableHash(hook.condition)||e.reasonKey!==`a06.${e.operation}`)fail('invalid-save-combo-coefficient-condition');
    }else if(e.operation==='multiply-coefficient')fail('invalid-save-combo-coefficient-source');
    if(e.operation==='rescue-multiplier'||e.operation==='consume-rescue'){
      const key=e.sourceInstanceId+'/'+e.operation;
      if(!combo||e.sourceType!=='joker'||sourceJoker?.definitionId!=='f10'||!sourceJoker.counters?.rescueArmed||comboEvents.has(key)||e.targetCardId!==undefined||e.retriggerDepth!==0)fail('invalid-save-combo-rescue-source');comboEvents.add(key);
      if(e.operation==='rescue-multiplier'){
        if(e.phase!=='jokerScore'||!AMO_ASSIST_TYPES.includes(t.handType as R2HandType)||amount.compare(new Rational(3n))||Object.hasOwn(e,'resourceBefore'))fail('invalid-save-combo-rescue-score');
        const before=e.before as {H:unknown;M:unknown},after=e.after as {H:unknown;M:unknown};
        if(Rational.fromJSON(before.H).compare(Rational.fromJSON(after.H))||Rational.fromJSON(before.M).multiply(amount).compare(Rational.fromJSON(after.M)))fail('invalid-save-combo-rescue-score');
      }else{if(e.phase!=='afterHand'||!finalSeen||amount.compare(new Rational(1n))||e.resourceBefore!==1||e.resourceAfter!==0)fail('invalid-save-combo-rescue-consume');unchanged(e.before,e.after);}
      const hook=R2_JOKERS.find(d=>d.id==='f10')!.hooks.find(h=>h.phase===e.phase)!;
      if(stableHash(e.visibleCondition)!==stableHash(hook.condition)||e.reasonKey!==`f10.${e.operation}`)fail('invalid-save-combo-rescue-condition');
    }
    if(e.operation==='add-gold-per-held'||e.operation==='add-gold-per-capital'){
      const id=e.operation==='add-gold-per-held'?'d12':'e04',key=e.sourceInstanceId+'/'+e.operation;
      if(!combo||e.sourceType!=='joker'||sourceJoker?.definitionId!==id||!successfulStage||e.phase!=='onStageClear'||e.targetCardId!==undefined||e.retriggerDepth!==0||comboEvents.has(key))fail('invalid-save-combo-income-source');comboEvents.add(key);
      let expected=0;
      if(id==='d12'){if(Object.hasOwn(e,'goldBeforeRewards'))fail('invalid-save-combo-income-capital');expected=AMO_ASSIST_TYPES.includes(t.handType as R2HandType)&&held.length>=4?Math.min(held.length,6):0;}
      else{integer(e.goldBeforeRewards);if(e.goldBeforeRewards!==clearCapital)fail('invalid-save-combo-income-capital');expected=Math.min(Math.floor((e.goldBeforeRewards as number)/10),6);}
      integer(e.resourceBefore);integer(e.resourceAfter);unchanged(e.before,e.after);
      if(expected===0||amount.compare(new Rational(BigInt(expected)))||e.resourceAfter!==(e.resourceBefore as number)+expected||e.reasonKey!==`${id}.${e.operation}`||stableHash(e.visibleCondition)!==stableHash(R2_JOKERS.find(d=>d.id===id)!.hooks[0].condition))fail('invalid-save-combo-income-value');
    }else if(Object.hasOwn(e,'goldBeforeRewards'))fail('invalid-save-combo-income-capital');
    if(e.operation==='chance-heat-check'){
      if(e.sourceType!=='joker'||sourceJoker?.definitionId!=='f08'||e.phase!=='jokerScore'||e.targetCardId!==undefined||e.retriggerDepth!==0||chanceChecks.has(sourceJoker.instanceId)||amount.d!==1n||amount.n!==0n&&amount.n!==1n||Object.hasOwn(e,'resourceBefore')||Object.hasOwn(e,'resourceAfter'))fail('invalid-save-chance-source');
      unchanged(e.before,e.after);chanceChecks.set(sourceJoker!.instanceId,amount.n===1n);
    }
    if(e.sourceType==='joker'&&sourceJoker?.definitionId==='f08'&&e.operation==='add-heat'){
      const foil=R2_TOOL_CATALOG.editions.find(edition=>edition.id===sourceJoker.edition)?.effect;
      const fromEdition=foil?.kind==='add-heat'&&e.reasonKey===`edition.${sourceJoker.edition}.add-heat`&&amount.compare(Rational.fromJSON(foil.value))===0;
      if(!fromEdition){
        const operation=R2_JOKERS.find(joker=>joker.id==='f08')!.hooks.flatMap(hook=>hook.operations).find(operation=>operation.kind==='chance-add-heat')!;
        if(operation.kind!=='chance-add-heat'||e.phase!=='jokerScore'||!chanceChecks.get(sourceJoker.instanceId)||chanceHeat.has(sourceJoker.instanceId)||amount.compare(Rational.fromJSON(operation.value))!==0)fail('invalid-save-chance-heat');
        chanceHeat.add(sourceJoker.instanceId);
      }
    }
    if(e.operation==='increment-clear-cycle'){
      if(e.sourceType!=='joker'||sourceJoker?.definitionId!=='e10'||e.phase!=='onStageClear'||e.targetCardId!==undefined||e.retriggerDepth!==0||clearCycles.has(sourceJoker.instanceId)||amount.compare(new Rational(1n))!==0)fail('invalid-save-clear-cycle-source');
      if(!successfulStage)fail('invalid-save-clear-cycle-qualification');
      integer(e.resourceBefore,0,1);integer(e.resourceAfter,0,1);unchanged(e.before,e.after);
      if(e.resourceBefore!==sourceJoker!.counters!.stageClears||e.resourceAfter!==1-(e.resourceBefore as number))fail('invalid-save-clear-cycle');
      clearCycles.set(sourceJoker!.instanceId,e.resourceAfter as number);
    }
    if(e.operation==='refund-hand'){
      if(e.sourceType!=='joker'||sourceJoker?.definitionId!=='b12'||e.phase!=='afterHand'||e.targetCardId!==undefined||e.retriggerDepth!==0||t.handType!=='four-kind'||handRefunds.has(sourceJoker.instanceId)||amount.compare(new Rational(1n))!==0)fail('invalid-save-hand-refund-source');
      integer(e.resourceBefore,0,R2_RESOURCE_CONTRACT.handsMaximum);integer(e.resourceAfter,1,R2_RESOURCE_CONTRACT.handsMaximum+1);unchanged(e.before,e.after);
      if(!stage.quadRefundUsed||stage.skipResult!==null||stage.index!==context.stageIndex||e.resourceAfter!==stage.handsLeft||BigInt(stage.heat)>=BigInt(stage.targetHeat))fail('invalid-save-hand-refund-qualification');
      if(e.resourceAfter!==(e.resourceBefore as number)+1)fail('invalid-save-hand-refund');handRefunds.add(sourceJoker!.instanceId);
    }
    const prizeSource=e.sourceType==='rule'&&e.sourceDefinitionId==='T16'||e.sourceType==='joker'&&['c12','e10'].includes(e.sourceDefinitionId as string);
    if(e.operation==='reward-consumable'||prizeSource&&e.operation==='add-gold'||Object.hasOwn(e,'rewardDefinitionId')){
      if(!prizeSource||e.phase!=='onStageClear'||!['reward-consumable','add-gold'].includes(e.operation as string)||e.targetCardId!==undefined||e.retriggerDepth!==0||rewardSources.has(e.sourceInstanceId as string))fail('invalid-save-reward-source');
      if(e.sourceType==='joker'&&(!successfulStage||e.sourceDefinitionId==='c12'&&(!stage.ordinaryStraightSeen||!stage.ordinaryFlushSeen)))fail('invalid-save-reward-qualification');
      oneOf(e.rewardDefinitionId,e.sourceDefinitionId==='c12'?['T03','T04','T05','T06']:e.sourceDefinitionId==='e10'?['T01']:['T16']);
      if(e.sourceDefinitionId==='e10'&&clearCycles.get(e.sourceInstanceId as string)!==0)fail('invalid-save-clear-cycle-reward');
      unchanged(e.before,e.after);rewardSources.add(e.sourceInstanceId as string);
      if(e.operation==='reward-consumable'){
        if(amount.compare(new Rational(1n))!==0)fail('invalid-save-reward-count');
        integer(e.resourceBefore,0,R2_TOOL_CATALOG.limits.consumableSlotsMaximum);integer(e.resourceAfter,1,R2_TOOL_CATALOG.limits.consumableSlotsMaximum);
        if(e.resourceAfter!==(e.resourceBefore as number)+1)fail('invalid-save-reward-delta');
      }else if(amount.compare(new Rational(BigInt(firstBossSupply.overflowGold)))!==0)fail('invalid-save-reward-overflow');
    }
    if(e.sourceType==='rule'&&clearRuleDefinitions.includes(e.sourceDefinitionId as typeof clearRuleDefinitions[number])){
      if(e.phase!=='onStageClear'||e.targetCardId!==undefined)fail('invalid-save-clear-source-phase');
      if(e.sourceDefinitionId==='T16'?!r2ToolSupported('T16'):!r2ItemSupported(e.sourceDefinitionId as string))fail('save-clear-source-not-enabled');
      unchanged(e.before,e.after);
      switch(e.sourceDefinitionId){
        case 'U04':if(e.operation!=='add-gold'||amount.d!==1n||amount.n<=0n||amount.n>BigInt(itemInterestEffect.amount))fail('invalid-save-item-interest');break;
        case 'U12':if(e.operation!=='add-gold'||amount.compare(new Rational(BigInt(normalClearEffect.gold)))!==0)fail('invalid-save-normal-clear-gold');break;
        case 'U09':
          if(e.operation!=='upgrade-hand'||amount.compare(new Rational(BigInt(bossUpgradeEffect.levels)))!==0)fail('invalid-save-boss-upgrade');
          integer(e.resourceBefore,1,R2_TOOL_CATALOG.limits.handLevelMaximum);integer(e.resourceAfter,1,R2_TOOL_CATALOG.limits.handLevelMaximum);
          if((e.resourceAfter as number)!==(e.resourceBefore as number)+bossUpgradeEffect.levels)fail('invalid-save-boss-upgrade-delta');break;
        case 'T16':
          if(e.operation==='add-gold'){if(amount.compare(new Rational(BigInt(firstBossSupply.overflowGold)))!==0)fail('invalid-save-supply-overflow');}
          else if(e.operation==='reward-consumable'){
            if(amount.compare(new Rational(1n))!==0)fail('invalid-save-supply-count');
            integer(e.resourceBefore,0,R2_TOOL_CATALOG.limits.consumableSlotsMaximum);integer(e.resourceAfter,0,R2_TOOL_CATALOG.limits.consumableSlotsMaximum);
            if((e.resourceAfter as number)!==(e.resourceBefore as number)+1)fail('invalid-save-supply-delta');
          }else fail('invalid-save-supply-operation');break;
      }
    }
    if(['lucky-multiplier-check','lucky-gold-check','glass-check','lucky-gold-cap'].includes(e.operation as string)){
      const glass=e.operation==='glass-check';
      if(e.sourceType!=='card'||!sourceCard||e.sourceDefinitionId!==sourceCard.id||sourceCard.enhancement!==(glass?'glass-paper':'lucky-paper')||e.phase!==(glass?'afterHand':'onCardScore'))fail('invalid-save-random-source');
      if(e.operation==='lucky-gold-cap'){if(amount.compare(new Rational(BigInt(R2_TOOL_CATALOG.limits.luckyGoldPerHand)))!==0)fail('invalid-save-random-check');}
      else if(amount.d!==1n||amount.n!==0n&&amount.n!==1n)fail('invalid-save-random-check');
      unchanged(e.before,e.after);
      if(e.operation==='lucky-gold-check'||e.operation==='lucky-gold-cap'){integer(e.resourceBefore);integer(e.resourceAfter);if(e.resourceBefore!==e.resourceAfter)fail('invalid-save-random-resource');}
      if(glass&&amount.n===1n)glassHits.add(sourceCard!.id);
    }
    if(e.operation==='add-gold'){
      integer(e.resourceBefore);integer(e.resourceAfter);if(amount.d!==1n||amount.n<0n||BigInt(e.resourceAfter as number)-BigInt(e.resourceBefore as number)!==amount.n)fail('invalid-save-gold-event');unchanged(e.before,e.after);
      if(e.sourceType==='joker'&&e.sourceDefinitionId==='e04'&&(e.phase!=='onStageClear'||amount.n<=0n||amount.n>BigInt(jokerInterestEffect.amount)))fail('invalid-save-joker-interest');
      if(e.sourceType==='card'){
        if(e.phase==='onCardScore'&&sourceCard?.enhancement==='lucky-paper'&&amount.n>0n&&amount.n<=BigInt(luckyGoldEffect.amount))luckyGold+=amount.n;
        else if(e.phase==='onStageClear'&&sourceCard?.enhancement==='gold-paper'&&amount.n===BigInt(heldGoldEffect.amount)&&!heldGoldSources.has(sourceCard.id))heldGoldSources.add(sourceCard.id);
        else fail('invalid-save-card-gold');
      }
    }
    if(e.operation==='destroy-card'){
      if(e.sourceType!=='card'||!sourceCard||sourceCard.enhancement!=='glass-paper'||e.phase!=='afterHand'||amount.n!==0n||!glassHits.has(sourceCard.id))fail('invalid-save-card-destruction');
      unchanged(e.before,e.after);destroyedCards.push(sourceCard!.id);
    }
    if(e.operation==='destroy-joker'){
      if(e.sourceType!=='joker'||!['afterHand','beforeFailure'].includes(e.phase as string)||amount.n!==0n||e.targetCardId!==undefined||e.retriggerDepth!==0)fail('invalid-save-joker-destruction');
      if(e.phase==='afterHand'){
        if(sourceJoker?.definitionId!=='f06'||lifetimeCounts.get(sourceJoker.instanceId)!==handLifetimeEffect.limit||previousEvent?.operation!=='increment-hands-scored'||previousEvent.sourceInstanceId!==e.sourceInstanceId||Object.hasOwn(e,'resourceBefore')||Object.hasOwn(e,'resourceAfter'))fail('invalid-save-lifetime-destruction');
      }else if(sourceJoker?.definitionId!=='f07'||!rescues.has(sourceJoker.instanceId)||previousEvent?.operation!=='rescue-hand'||previousEvent.sourceInstanceId!==e.sourceInstanceId||e.resourceBefore!==1||e.resourceAfter!==1)fail('invalid-save-rescue-destruction');
      unchanged(e.before,e.after);destroyedJokers.push(e.sourceInstanceId as string);
    }
    previousEvent=e;
  }
  for(const source of jokerSources.values())if(((prototype||combo)&&R2_ASSIST_ADAPTED_IDS.includes(source.definitionId))||combo&&R2_COMBO_GROWTH_IDS.includes(source.definitionId)||R2_GROUP_UPGRADE_IDS.includes(source.definitionId)){
    const expected=!!R2_TOOL_CATALOG.editions.find(row=>row.id===(source.edition??'none'))?.effect&&!disabledJokers.has(source.instanceId);
    if(assistEditionSources.has(source.instanceId)!==expected)fail('invalid-save-assist-joker-edition-count');
  }
  if(group){
    assertGroupTraceExecutions(t as unknown as ScoreTrace,R2_JOKERS,stage);
    for(const source of jokerSources.values()){
      const qualified=R2_GROUP_HAND_TYPES.includes(t.handType as R2HandType),definition=R2_JOKERS.find(d=>d.id===source.definitionId)!;
      if(source.definitionId==='b08'&&assistWholeEffects.has(source.instanceId+'/onStageClear/add-gold')!==(successfulStage&&qualified))fail('invalid-save-group-income-count');
      if(source.definitionId==='b03'||source.definitionId==='b10'){
        const op=definition.hooks.flatMap(h=>h.operations).find(o=>o.kind==='add-growth')!;if(op.kind!=='add-growth')fail('invalid-save-group-growth-definition');
        const before=Rational.fromJSON(source.growth[op.key]??{n:'0',d:'1'}),cap=Rational.fromJSON(op.cap),raw=qualified?before.add(Rational.fromJSON(op.value)):before,expected=raw.compare(cap)>0?cap:raw;
        const actual=(t.jokers as R2JokerInstance[]).find(j=>j.instanceId===source.instanceId)!;
        if(assistWholeEffects.has(source.instanceId+'/jokerScore/read-growth')!==!disabledJokers.has(source.instanceId)||assistWholeEffects.has(source.instanceId+'/afterHand/add-growth')!==qualified||Rational.fromJSON(actual.growth[op.key]??{n:'0',d:'1'}).compare(expected))fail('invalid-save-group-growth-result');
        const live=context.liveJokers?.find(j=>j.instanceId===source.instanceId);if(live&&stableHash(live.growth)!==stableHash(actual.growth))fail('invalid-save-group-live-growth');
      }
      if(source.definitionId==='b06'){
        const targets=qualified&&!disabledJokers.has(source.instanceId)?r2LargestScoringRankGroup((t.cards as PlayingCard[]).filter(c=>played.includes(c.id)),scoring).filter(id=>active.includes(id)):[];
        for(const id of active){const key=source.instanceId+'/'+id;if(groupRetriggers.has(key)!==targets.includes(id)||groupCaps.has(key)!==(groupRetriggers.get(key)===0))fail('invalid-save-group-retrigger-targets');}
        for(const id of active){const repeats=(events as ScoreEvent[]).filter(e=>e.sourceType==='card'&&e.sourceDefinitionId===`rank-${cardSources.get(id)!.rank}`&&e.targetCardId===id&&e.phase==='onCardScore'&&e.operation==='add-heat'&&e.retriggerDepth===1).length;if(repeats!==(cardRetriggers.get(id)??0))fail('invalid-save-group-retrigger-executions');}
      }
    }
  }
  if(combo){
    for(const source of jokerSources.values()){
      const expected=successfulStage&&(source.definitionId==='d12'?AMO_ASSIST_TYPES.includes(t.handType as R2HandType)&&held.length>=4:source.definitionId==='e04'&&clearCapital!==null&&clearCapital>=10);
      if(['d12','e04'].includes(source.definitionId)&&comboEvents.has(source.instanceId+'/'+(source.definitionId==='d12'?'add-gold-per-held':'add-gold-per-capital'))!==expected)fail('invalid-save-combo-income-count');
    }
    if(successfulStage){
      const base=[4,5,7][stage.index%3]+stage.handsLeft+Math.min(context.config.baseInterestCap,Math.floor(clearCapital!/5))+(context.config.characterAbilityEnabled&&context.characterId==='xiemu'&&stage.handsLeft===0?2:0);
      let balance=BigInt(clearCapital!)+BigInt(base),earned=BigInt(base);
      for(const event of events as Record<string,unknown>[])if(event.phase==='onStageClear'){
        if(event.programGoldBeforeReward!==undefined&&event.programGoldBeforeReward!==clearCapital)fail('invalid-save-combo-clear-clock');
        if(!['add-gold','add-gold-per-held','add-gold-per-capital'].includes(event.operation as string))continue;
        const amount=Rational.fromJSON(event.value);if(amount.d!==1n||BigInt(event.resourceBefore as number)!==balance||BigInt(event.resourceAfter as number)!==balance+amount.n)fail('invalid-save-combo-clear-ledger');
        balance+=amount.n;earned+=amount.n;
      }
      if(earned!==BigInt(stage.goldEarned)||context.settledGold!==undefined&&balance!==BigInt(context.settledGold))fail('invalid-save-combo-clear-ledger');
    }
  }
  if(context.characterId==='amo'){
    const ordered=events as Record<string,unknown>[],roles=ordered.map((e,i)=>e.sourceType==='character'?i:-1).filter(i=>i>=0);
    const eligible=context.config.characterAbilityEnabled&&boss?.definitionId!=='B08'&&(prototype?assistMultiplier!==null:played.length===1);
    if(roles.length!==(eligible?1:0))fail('invalid-save-amo-source');
    if(eligible){
      const role=roles[0],event=ordered[role],whole=ordered.map((e,i)=>e.phase==='jokerScore'?i:-1).filter(i=>i>=0);
      const final=ordered.findIndex(e=>e.phase==='finalScore');
      if(event.phase!=='characterScore'||event.operation!=='multiply-multiplier'||Rational.fromJSON(event.value).compare(new Rational(BigInt(assistMultiplier??3)))!==0||role>=final||
        (context.amoScoreTiming!=='before-joker'?whole.some(i=>i>=role):whole.some(i=>i<=role)))fail('invalid-save-amo-order');
      if(prototype){
        const before=event.before as {H:unknown;M:unknown},after=event.after as {H:unknown;M:unknown};
        if(event.reasonKey!==`amo.assist.${assistMultiplier===2?'pair':'three-kind'}`||role!==final-1||event.targetCardId!==undefined||event.retriggerDepth!==0||
          stableHash(event.visibleCondition)!==stableHash({kind:'hand-type-in',values:[...AMO_ASSIST_TYPES]})||
          Rational.fromJSON(before.H).compare(Rational.fromJSON(after.H))!==0||
          Rational.fromJSON(before.M).multiply(new Rational(BigInt(assistMultiplier!))).compare(Rational.fromJSON(after.M))!==0)fail('invalid-save-assist-event');
      }
    }
  }
  for(const source of jokerSources.values())if(source.definitionId==='f06'){
    const count=(source.counters?.handsScored??0)+1;
    if(lifetimeCounts.get(source.instanceId)!==count||destroyedJokers.includes(source.instanceId)!==(count===handLifetimeEffect.limit))fail('invalid-save-lifetime-result');
  }
  if([...rescues].some(id=>!destroyedJokers.includes(id)))fail('invalid-save-rescue-result');
  if(halves!==(halfRequired?1:0))fail('invalid-save-boss-half-result');
  const expectedSeal=boss?.definitionId==='B15'?[...jokerSources.keys()].find(id=>!startingSeals.includes(id)&&!destroyedJokers.includes(id)):undefined;
  if(sealTargets.length!==(expectedSeal?1:0)||expectedSeal&&sealTargets[0]!==expectedSeal)fail('invalid-save-boss-seal-result');
  const endingSeals=[...startingSeals,...sealTargets];
  if(stage.sealedJokerIds.length!==endingSeals.length||stage.sealedJokerIds.some((id,index)=>id!==endingSeals[index]))fail('invalid-save-boss-seal-result');
  if(core&&core.targetIds.some(id=>!coreEvents.has(id)))fail('invalid-save-core-missing-event');
  if(rootEventIds.some(id=>!eventIds.has(id)))fail('invalid-save-trace-event-root');
  if(luckyGold!==BigInt(t.goldDelta as number)||heldGoldSources.size*heldGoldEffect.amount>heldGoldEffect.capPerStage)fail('invalid-save-trace-gold');
  strings(t.destroyedJokerIds,context.config.jokerSlots);strings(t.destroyedCardIds,R2_RESOURCE_CONTRACT.handMaximum);
  for(const [value,actual] of [[t.destroyedJokerIds,destroyedJokers],[t.destroyedCardIds,destroyedCards]] as const){
    const ids=value as string[];if(new Set(ids).size!==ids.length||new Set(actual).size!==actual.length||ids.length!==actual.length||ids.some(id=>!actual.includes(id)))fail('invalid-save-destruction-result');
  }
  const survivors=(t.jokers as R2JokerInstance[]),expected=[...jokerSources.keys()].filter(id=>!destroyedJokers.includes(id));
  if(survivors.length!==expected.length||survivors.some((joker,index)=>joker.instanceId!==expected[index]))fail('invalid-save-joker-result');
  // Same-stage commands may reorder slots, but cannot create or sell Jokers. Later Shops may do both.
  if(context.liveJokerIds!==undefined&&(context.liveJokerIds.length!==expected.length||context.liveJokerIds.some(id=>!expected.includes(id))))fail('invalid-save-live-joker-snapshot');
  for(const joker of survivors){
    const source=jokerSources.get(joker.instanceId)!;
    if(joker.definitionId!==source.definitionId||joker.paidPrice!==source.paidPrice||(joker.edition??'none')!==(source.edition??'none'))fail('invalid-save-joker-result-identity');
    const coefficient=coefficients.get(joker.instanceId);
    if(coefficient&&!(combo&&source.definitionId==='a06')&&(Rational.fromJSON(joker.growth.coefficient).compare(coefficient)!==0||!disabledJokers.has(joker.instanceId)&&!coefficientReads.has(joker.instanceId)))fail('invalid-save-coefficient-result');
    const live=context.liveJokers?.find(j=>j.instanceId===source.instanceId);
    if(combo&&live&&['a06','f10'].includes(source.definitionId)&&(stableHash(live.growth)!==stableHash(joker.growth)||stableHash(live.counters)!==stableHash(joker.counters)))fail('invalid-save-combo-live-state');
    if(combo&&source.definitionId==='a06'){
      const qualified=AMO_ASSIST_TYPES.includes(t.handType as R2HandType),previous=bossContext.previousHandType as R2HandType|null;
      const grows=!source.counters!.alternationUsed&&qualified&&previous!==null&&AMO_ASSIST_TYPES.includes(previous)&&previous!==t.handType;
      if(coefficientReads.has(source.instanceId)!==(qualified&&!disabledJokers.has(source.instanceId))||coefficientChanges.has(source.instanceId)!==grows||joker.counters!.alternationUsed!==(source.counters!.alternationUsed||grows)||Rational.fromJSON(joker.growth.coefficient).compare(coefficients.get(source.instanceId)!))fail('invalid-save-combo-coefficient-result');
    }
    if(combo&&source.definitionId==='f10'){
      const armed=source.counters!.rescueArmed,expectedArmed=stage.playIndex===1&&r2ColdOpening(stage.openingDiscard),qualifies=AMO_ASSIST_TYPES.includes(t.handType as R2HandType)&&!disabledJokers.has(source.instanceId);
      if(armed!==expectedArmed||joker.counters!.rescueArmed!==false||comboEvents.has(source.instanceId+'/consume-rescue')!==armed||comboEvents.has(source.instanceId+'/rescue-multiplier')!==(armed&&qualifies))fail('invalid-save-combo-rescue-result');
    }
    if(source.definitionId==='e10'&&joker.counters!.stageClears!==(clearCycles.get(joker.instanceId)??source.counters!.stageClears))fail('invalid-save-clear-cycle-result');
    if(source.definitionId==='f06'&&joker.counters?.handsScored!==lifetimeCounts.get(joker.instanceId))fail('invalid-save-lifetime-result');
    if(source.definitionId==='f08'&&!disabledJokers.has(joker.instanceId)&&(!chanceChecks.has(joker.instanceId)||chanceChecks.get(joker.instanceId)!==chanceHeat.has(joker.instanceId)))fail('invalid-save-chance-result');
  }
  for(const [id,cycle] of clearCycles)if((cycle===0)!==rewardSources.has(id))fail('invalid-save-clear-cycle-reward');
}
function action(value:unknown,state:R2RunState):void {
  const prototype=r2UsesAssist(state),combo=hasR2ComboGrowthContract(state),profile=isR2GroupUpgrade(state)?'group-upgrade-v1':combo?'combo-growth-v1':'amo-assist-v1';
  const a=record(value,['type'],['coreTargetId','coreTargetRank','seed','characterId','rulesVersion','openingRoute','modeConfig','r2Profile','r2Identity','assistIds','programId','selectedIds','instanceId','targetIds','enabled','offerId','ids','handType','secondaryHandType','suit','sacrificeId','targetKind']);
  const keys:Record<Action['type'],string[]>={StartRun:['seed','characterId','rulesVersion'],LeaveShop:[],EnterStage:[],OpenShop:[],RerollShop:[],AbandonRun:[],SkipStage:[],ContinueEndless:[],ChooseProgram:['programId'],AbandonProgram:[],PlayHand:['selectedIds'],PlayAssistedHand:['selectedIds','assistIds'],DiscardHand:['selectedIds'],SellJoker:['instanceId'],UseConsumable:['instanceId','targetIds'],DestroyConsumable:['instanceId'],SetWager:['enabled'],BuyOffer:['offerId'],ReorderHand:['ids'],ReorderJokers:['ids']};
  if(typeof a.type!=='string'||!Object.hasOwn(keys,a.type))fail('unknown-save-command');
  record(a,['type',...keys[a.type as Action['type']]],a.type==='PlayHand'&&usesR2ErxiangCore(state)?['coreTargetId','coreTargetRank']:a.type==='UseConsumable'?['handType','secondaryHandType','suit','sacrificeId','targetKind']:a.type==='StartRun'?['modeConfig','r2Identity',...(isR2RouteStarter(state)?['openingRoute']:[]),...(prototype||combo?['r2Profile']:[])]:[]);
  if(a.coreTargetId!==undefined||a.coreTargetRank!==undefined){text(a.coreTargetId);oneOf(a.coreTargetRank,RANKS);if(!(a.selectedIds as string[]).includes(a.coreTargetId as string))fail('invalid-save-core-command');}
  if(a.type==='PlayAssistedHand'&&!prototype)fail('invalid-save-assist-profile');
  if(a.type==='StartRun'&&prototype&&((a.r2Identity===undefined&&a.r2Profile!==profile)||a.characterId!=='amo'))fail('invalid-save-assist-profile');
  if(a.type==='PlayAssistedHand'){uniqueIds(a.selectedIds,5);uniqueIds(a.assistIds,3);const main=a.selectedIds as string[],assist=a.assistIds as string[];if(!main.length||assist.length<2||assist.some(id=>main.includes(id)))fail('invalid-save-assist-command');}
  if(a.handType!==undefined)oneOf(a.handType,R2_HAND_TYPES);
  if(a.secondaryHandType!==undefined)oneOf(a.secondaryHandType,R2_HAND_TYPES);
  if(a.suit!==undefined)oneOf(a.suit,SUITS);
  if(a.sacrificeId!==undefined)text(a.sacrificeId);
  if(a.targetKind!==undefined)oneOf(a.targetKind,['card','joker']);
  if(a.type==='StartRun'){
    if(isR2RouteStarter(state)&&(a.openingRoute!==state.openingRoute||!Object.hasOwn(R2_ROUTE_STARTERS,String(a.openingRoute))))fail('invalid-save-opening-route');
    if(combo&&a.r2Identity===undefined&&a.r2Profile!==profile)fail('invalid-save-start-profile');
    if(a.r2Profile!==undefined&&a.r2Profile!==profile)fail('invalid-save-start-profile');
    text(a.seed,4096);oneOf(a.characterId,CHARACTER_IDS);oneOf(a.rulesVersion,['r2']);
    if(a.r2Identity!==undefined){
      const identity=record(a.r2Identity,['contentVersion','contentHash']);
      if(a.r2Profile!==undefined||!r2RulesetFor(identity)||identity.contentVersion!==state.contentVersion||identity.contentHash!==state.contentHash||a.characterId!==state.characterId||a.seed!==state.seed)fail('invalid-save-start-identity');
    }
    if(a.modeConfig!==undefined){
      const selection=record(a.modeConfig,['mode','difficulty','challengeId','programsEnabled']),config=resolveR2ModeConfig(selection);
      if(!config.ok||!r2ModeSeedAllowed(config.config,a.seed)||config.config.mode==='tutorial'&&a.characterId!=='erxiang')fail('invalid-save-start-mode');
    }
  }
  if(a.type==='ChooseProgram')oneOf(a.programId,[null,...programRuleDefinitions]);
  for(const k of ['selectedIds','targetIds','ids'])if(a[k]!==undefined)strings(a[k],14);
  for(const k of ['instanceId','offerId'])if(a[k]!==undefined)text(a[k]);
  if(a.enabled!==undefined)bool(a.enabled);
}
function safeTree(value:unknown):void {
  let nodes=0;
  const visit=(v:unknown,depth:number):void=>{
    if(++nodes>200000||depth>48)fail('save-size-limit');
    if(typeof v==='number'&&!Number.isFinite(v))fail('non-finite-save');
    if(v!==null&&typeof v==='object'){
      if(!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)fail('non-json-save');
      for(const [k,child] of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))fail('unsafe-save-key');visit(child,depth+1);}
    } else if(!['string','number','boolean'].includes(typeof v)&&v!==null)fail('non-json-save');
  };visit(value,0);
}
function validateState(value:unknown):asserts value is R2RunState {
  // Diagnose old versions before changed fields; retaining/exporting raw saves remains explicit.
  if(value&&typeof value==='object'&&!Array.isArray(value)){const tags=value as Record<string,unknown>;if(tags.schemaVersion!==2||tags.rulesVersion!=='r2'||!r2RulesetFor(tags))fail('incompatible-version');}
  const s=record(value,['schemaVersion','rulesVersion','contentVersion','contentHash','runId','seed','commandSeq','mode','difficulty','challengeId','programsEnabled','characterId','chapter','stageIndex','phase','deckInstances','drawPile','handOrder','playedPile','discardPile','destroyedIds','stage','totalHeat','gold','jokers','consumables','longTermItems','program','boss','shop','rng','receipts','lastTrace','handLevels','outcome','seenBossIds','chapterSkipConsumable','purchaseCoupons','safetyNetUsed','spectralModifiers','supplyRewardClaimed','chapterHandUsage','normalClearClaimed','tourMode','normalCompletion','chapterDisabledJokerId','programRerollCoupon',...(isR2RouteStarter(value as R2RunState)?['openingRoute','routeStarter']:[])],isR2RouteStarter(value as R2RunState)?['openingShow']:[]);
  if(s.schemaVersion!==2||s.rulesVersion!=='r2'||!r2RulesetFor(s))fail('incompatible-version');
  if(isR2RouteStarter(s))oneOf(s.openingRoute,Object.keys(R2_ROUTE_STARTERS));
  const prototype=r2UsesAssist(s),combo=hasR2ComboGrowthContract(s),definitions=r2JokerDefinitionsFor(s);
  if(s.contentVersion===R2_ASSIST_VERSION&&s.characterId!=='amo')fail('invalid-save-assist-profile');
  const selected=resolveR2ModeConfig({mode:s.mode,difficulty:s.difficulty,challengeId:s.challengeId,programsEnabled:s.programsEnabled});
  const config=selected.ok?selected.config:fail('invalid-save-mode');
  if(!r2ModeSeedAllowed(config,s.seed)||config.mode==='tutorial'&&s.characterId!=='erxiang')fail('invalid-save-mode-seed-character');
  oneOf(s.tourMode,['normal','endless']);const tourMode=s.tourMode as R2TourMode,chapterMaximum=tourMode==='endless'?R2_ENDLESS_MAX_CHAPTER:R2_AVAILABLE_CHAPTERS,stageMaximum=chapterMaximum*3;
  if(config.mode!=='standard'&&tourMode==='endless')fail('invalid-save-mode-endless');
  text(s.runId);text(s.seed,4096);integer(s.commandSeq,1);oneOf(s.characterId,CHARACTER_IDS);integer(s.chapter,config.startingChapter,chapterMaximum);integer(s.stageIndex,config.startingStageIndex,stageMaximum);
  oneOf(s.phase,['shop','stage-ready','await-input','stage-cleared','run-won','run-lost']);
  cards(s.deckInstances,R2_RESOURCE_CONTRACT.deckMaximum,config.enhancementsAllowed);
  for(const k of ['drawPile','handOrder','playedPile','discardPile','destroyedIds','longTermItems'])strings(s[k]);
  score(s.totalHeat);integer(s.gold);jokers(s.jokers,config.jokerSlots,definitions);
  bool(s.programRerollCoupon);
  if((!config.programsEnabled||!config.reroll.allowed)&&s.programRerollCoupon)fail('invalid-save-program-coupon');
  if(config.chapterJokerBanCount===0?s.chapterDisabledJokerId!==null:!R2_JOKERS.some(joker=>joker.id===s.chapterDisabledJokerId))fail('invalid-save-chapter-challenge-ban');
  const completion=s.normalCompletion===null?null:record(s.normalCompletion,['clearId','totalHeat']);
  if(completion){
    text(completion.clearId);score(completion.totalHeat);
    if(completion.clearId!==`${s.runId}/clear/23`||BigInt(completion.totalHeat as string)===0n||BigInt(completion.totalHeat as string)>BigInt(s.totalHeat as string))fail('invalid-save-normal-completion');
  }
  if(config.mode!=='standard'){
    if(completion!==null)fail('invalid-save-mode-completion');
  }else if(tourMode==='normal'){
    if(s.phase==='run-won'?!completion||completion.totalHeat!==s.totalHeat:completion!==null)fail('invalid-save-normal-completion');
  }else if(!completion||(s.chapter as number)<R2_AVAILABLE_CHAPTERS+1||(s.stageIndex as number)<R2_AVAILABLE_CHAPTERS*3||s.phase==='run-won')fail('invalid-save-endless-qualification');
  for(const c of array(s.consumables,R2_TOOL_CATALOG.limits.consumableSlotsMaximum)){
    const v=record(c,['instanceId','definitionId']);text(v.instanceId);text(v.definitionId);if(!r2ToolSupported(v.definitionId as string))fail('save-tool-not-enabled');
    const definition=R2_TOOL_CATALOG.tools.find(tool=>tool.id===v.definitionId)!;
    if(!config.enhancementsAllowed&&['set-enhancement','random-enhancement'].includes(definition.operation.kind)||
      !config.reroll.allowed&&definition.operation.kind==='free-reroll')fail('save-tool-mode-forbidden');
  }
  for(const id of s.longTermItems as string[])if(!r2ItemSupported(id))fail('save-item-not-enabled');
  const modifiers=record(s.spectralModifiers,['handsPenalty','handPenalty','cleanSlateBonus']);
  integer(modifiers.handsPenalty,0,R2_TOOL_CATALOG.limits.spectralHandsPenaltyMaximum);integer(modifiers.handPenalty,0,R2_TOOL_CATALOG.limits.spectralHandPenaltyMaximum);integer(modifiers.cleanSlateBonus,0,R2_TOOL_CATALOG.limits.oncePerRun);
  if(!R2_IMPLEMENTED_TOOL_FEATURES.includes('permanent-resources')&&Object.values(modifiers).some(value=>value!==0))fail('save-spectral-modifiers-not-enabled');
  bool(s.supplyRewardClaimed);bool(s.normalClearClaimed);
  if(s.supplyRewardClaimed&&!R2_IMPLEMENTED_TOOL_FEATURES.includes('first-boss-supply'))fail('save-first-boss-supply-not-enabled');
  const levels=record(s.handLevels,[],[...R2_HAND_TYPES]);Object.values(levels).forEach(level=>integer(level,1,SCORE_LIMITS.handLevel));
  const usage=record(s.chapterHandUsage,[],[...R2_HAND_TYPES]);let plays=0n;
  for(const [type,count] of Object.entries(usage)){integer(count);if(!Object.hasOwn(levels,type))fail('undiscovered-save-hand-usage');plays+=BigInt(count as number);}
  if(plays>BigInt(s.commandSeq as number))fail('invalid-save-hand-usage');
  if(!r2ProgramStateValid(s.program,config,s.chapter as number))fail('invalid-save-program');
  bossPlan(s.boss);strings(s.seenBossIds,chapterMaximum);
  if(!r2BossHistoryValid(s.seenBossIds as string[],s.chapter as number,tourMode)||(s.seenBossIds as string[]).at(-1)!==s.boss.definitionId)fail('invalid-save-boss-history');
  oneOf(s.chapterSkipConsumable,R2_SKIP_CONSUMABLES);integer(s.purchaseCoupons,0,chapterMaximum);bool(s.safetyNetUsed);
  if(s.stage!==null){const t=record(s.stage,[...(usesR2ErxiangCore(s)?['erxiangPreviousRank']:[]),...(combo?['openingDiscard']:[]),...(prototype?['assistUsed']:[]),'index','targetHeat','heat','handsLeft','discardsLeft','playIndex','previousHandType','previousHandScore','handLimit','rescueUsed','clearId','goldEarned','disabledIds','wagerSelected','wagerUsed','discardsUsed','skipResult','initialHands','initialDiscards','discardSpent','discardGained','doubleDiscardBeforeFirstPlay','maxPlayedCount','ordinaryStraightSeen','ordinaryFlushSeen','quadRefundUsed','jokerSold','boss','initialTargetHeat','initialHandLimit','initialJokerIds','sealedJokerIds','challengeDisabledJokerId']);
    if(usesR2ErxiangCore(s)){oneOf(t.erxiangPreviousRank,[null,...RANKS]);if((!config.characterAbilityEnabled||(t.boss as R2BossPlan|null)?.definitionId==='B08'||t.playIndex===0)&&t.erxiangPreviousRank!==null)fail('invalid-save-core-state');}
    if(combo&&t.openingDiscard!==null){
      const opening=record(t.openingDiscard,['hand','discardedIds','jokers']);cards(opening.hand,R2_RESOURCE_CONTRACT.handMaximum,config.enhancementsAllowed);jokers(opening.jokers,config.jokerSlots,definitions);uniqueIds(opening.discardedIds,5);
      const hand=opening.hand as PlayingCard[],ids=opening.discardedIds as string[],sources=opening.jokers as R2JokerInstance[];
      if(!hand.length||hand.length>(t.initialHandLimit as number)||!ids.length||ids.some(id=>!hand.some(c=>c.id===id))||sources.some(j=>!(t.initialJokerIds as string[]).includes(j.instanceId))||!sources.some(j=>j.definitionId==='f10'&&j.counters?.rescueArmed===false)||(t.discardsUsed as number)<1)fail('invalid-save-opening-discard');
      if(hand.some(c=>!(s.deckInstances as PlayingCard[]).some(d=>d.id===c.id))||ids.some(id=>!(s.discardPile as string[]).includes(id)&&!(s.destroyedIds as string[]).includes(id)))fail('invalid-save-opening-discard-zone');
      if(stableHash(ids)!==stableHash(hand.filter(c=>ids.includes(c.id)).map(c=>c.id)))fail('invalid-save-opening-discard-order');
    }
    if(combo&&t.playIndex===0&&(t.discardsUsed as number)>0&&(s.jokers as R2JokerInstance[]).some(j=>j.definitionId==='f10')&&t.openingDiscard===null)fail('invalid-save-opening-discard-missing');
    if(prototype){bool(t.assistUsed);if(t.assistUsed&&(!config.characterAbilityEnabled||t.playIndex===0||(t.boss as R2BossPlan|null)?.definitionId==='B08'))fail('invalid-save-assist-usage');}
    integer(t.index,0,stageMaximum-1);score(t.targetHeat);score(t.heat);integer(t.handLimit,R2_RESOURCE_CONTRACT.handMinimum,R2_RESOURCE_CONTRACT.handMaximum);bool(t.rescueUsed);if(t.previousHandScore!==null)score(t.previousHandScore);
    score(t.initialTargetHeat);integer(t.initialHandLimit,R2_RESOURCE_CONTRACT.handMinimum,R2_RESOURCE_CONTRACT.handMaximum);uniqueIds(t.initialJokerIds,config.jokerSlots);uniqueIds(t.sealedJokerIds,config.jokerSlots);
    if(config.chapterJokerBanCount===0?t.challengeDisabledJokerId!==null:!R2_JOKERS.some(joker=>joker.id===t.challengeDisabledJokerId))fail('invalid-save-stage-challenge-ban');
    if(Math.floor((t.index as number)/3)+1===s.chapter&&t.challengeDisabledJokerId!==s.chapterDisabledJokerId)fail('invalid-save-stage-challenge-ban');
    if((t.index as number)%3===2){bossPlan(t.boss);if(t.boss.definitionId!==(s.seenBossIds as string[])[Math.floor((t.index as number)/3)])fail('invalid-save-stage-boss');}
    else if(t.boss!==null)fail('invalid-save-stage-boss');
    if(t.initialTargetHeat!==r2StageSpec(t.index as number,tourMode,config.difficulty)?.targetHeat)fail('invalid-save-initial-target');
    integer(t.initialHands,R2_RESOURCE_CONTRACT.handsMinimum,config.baseHands+R2_RESOURCE_CONTRACT.handsMaximum-R2_LIMITS.hands);
    integer(t.initialDiscards,config.baseDiscards,config.baseDiscards+R2_RESOURCE_CONTRACT.discardsMaximum-R2_LIMITS.discards);bool(t.doubleDiscardBeforeFirstPlay);
    if(t.index===s.stageIndex&&['await-input','run-lost'].includes(s.phase as string)){
      const live=value as R2RunState;
      if(t.initialHands!==r2HandsBudget(live)||t.initialDiscards!==r2DiscardBudget(live))fail('invalid-save-mode-resource-budget');
    }
    for(const field of ['ordinaryStraightSeen','ordinaryFlushSeen','quadRefundUsed','jokerSold'])bool(t[field]);integer(t.maxPlayedCount,0,R2_LIMITS.maxSelected);
    const handsBudget=(t.initialHands as number)+(t.rescueUsed?1:0)+(t.quadRefundUsed?1:0);
    integer(t.handsLeft,0,handsBudget);integer(t.discardsLeft,0,t.initialDiscards as number);integer(t.playIndex,0,handsBudget);integer(t.discardGained,0,R2_RESOURCE_CONTRACT.discardGainMaximum);integer(t.discardSpent,0,(t.initialDiscards as number)+(t.discardGained as number));integer(t.discardsUsed,0,t.discardSpent as number);
    const stageBoss=t.boss as R2BossPlan|null,initialTarget=BigInt(t.initialTargetHeat as string);
    if((t.sealedJokerIds as string[]).length>(t.playIndex as number)||(t.sealedJokerIds as string[]).some(id=>!(t.initialJokerIds as string[]).includes(id))||stageBoss?.definitionId!=='B15'&&(t.sealedJokerIds as string[]).length)fail('invalid-save-stage-seals');
    if(t.handLimit!==(stageBoss?.definitionId==='B11'?Math.max(R2_RESOURCE_CONTRACT.handMinimum,(t.initialHandLimit as number)-(t.playIndex as number)):t.initialHandLimit))fail('invalid-save-stage-hand-limit');
    if(t.targetHeat!==(initialTarget+(stageBoss?.definitionId==='B14'?((initialTarget+19n)/20n)*BigInt(t.discardsUsed as number):0n)).toString())fail('invalid-save-stage-target');
    if((t.playIndex===0)!==(t.maxPlayedCount===0)||t.playIndex===0&&(t.ordinaryStraightSeen||t.ordinaryFlushSeen||t.quadRefundUsed)||t.skipResult===null&&(t.handsLeft as number)+(t.playIndex as number)!==handsBudget)fail('invalid-save-stage-history');
    integer(t.goldEarned);strings(t.disabledIds);bool(t.wagerSelected);bool(t.wagerUsed);oneOf(t.previousHandType,[null,...R2_HAND_TYPES]);if(t.clearId!==null)text(t.clearId);
    if(t.skipResult!==null){const r=record(t.skipResult,['kind'],['amount','definitionId']);oneOf(r.kind,['coupon','consumable','gold']);if(r.kind==='consumable'){record(r,['kind','definitionId']);oneOf(r.definitionId,R2_SKIP_CONSUMABLES);}else{record(r,['kind','amount']);oneOf(r.amount,r.kind==='coupon'?[2]:[1]);}}
  }
  if(tourMode==='normal'&&s.phase==='run-won'){
    const completed=s.stage as R2RunState['stage'];
    if(s.chapter!==R2_AVAILABLE_CHAPTERS||s.stageIndex!==stageMaximum||!completed||completed.index!==stageMaximum-1||completed.clearId!==`${s.runId}/clear/23`||
      config.mode==='standard'&&completed.clearId!==completion!.clearId||completed.skipResult!==null||BigInt(completed.heat)<BigInt(completed.targetHeat))fail('invalid-save-normal-completion');
  }
  if(s.shop!==null){
    shop(s.shop,s.commandSeq as number,stageMaximum,config,s);
    if(s.phase!=='shop'&&(s.shop as Record<string,unknown>).freeRerolls!==0)fail('invalid-save-expired-free-rerolls');
  }
  const rng=record(s.rng,['deck','shop','rule','reward','program','challenge']);Object.values(rng).forEach(cursor);
  const receipts=array(s.receipts,100000);let seq=0;const ids=new Set();
  for(const r of receipts){const v=record(r,['commandId','fingerprint','seq']);text(v.commandId);text(v.fingerprint);integer(v.seq,1);if(v.seq!==++seq||ids.has(v.commandId))fail('invalid-save-receipts');ids.add(v.commandId);}
  if(seq!==s.commandSeq)fail('invalid-save-sequence');
  if(isR2RouteStarter(s)){
    const state=s as unknown as R2RunState,start=routeStarterStartCommand(state),initial=createRun({...start.action as Extract<Action,{type:'StartRun'}>,runId:state.runId,rulesVersion:'r2'});
    if(state.receipts[0]?.fingerprint!==stableHash(start))fail('invalid-save-opening-receipt');
    if(state.openingShow===undefined)delete initial.openingShow;
    if(state.openingShow!==undefined){const show=record(state.openingShow,['handsScored','rootId','eventId','reason']);integer(show.handsScored,0);oneOf(show.reason,[null,'starter','multiply','score']);if((show.rootId===null)!==(show.eventId===null)||(show.rootId===null)!==(show.reason===null))fail('invalid-save-opening-show');if(show.rootId!==null){text(show.rootId);text(show.eventId);if(!(show.rootId as string).startsWith(state.runId+'/hand/')||!(show.eventId as string).startsWith(show.rootId+'/event/'))fail('invalid-save-opening-show-source');}if(show.handsScored===0&&show.rootId!==null||(show.handsScored as number)>=5&&show.rootId===null)fail('invalid-save-opening-show-count');}
    if(state.commandSeq===1&&stableHash(state)!==stableHash(initial))fail('invalid-save-opening-state');
    const stamp=record(s.routeStarter,['instanceId','rootId','eventId']);
    for(const key of ['instanceId','rootId','eventId'])if(stamp[key]!==null)text(stamp[key]);
    if((stamp.rootId===null)!==(stamp.eventId===null)||stamp.instanceId===null&&stamp.rootId!==null)fail('invalid-save-starter-record');
    if(stamp.instanceId!==null){
      const prefix=state.runId+'/joker/';if(!(stamp.instanceId as string).startsWith(prefix))fail('invalid-save-starter-source');
      const commandId=(stamp.instanceId as string).slice(prefix.length),receipt=state.receipts.find(r=>r.commandId===commandId),offers=initial.shop!.offers.filter(o=>o.definitionId===R2_ROUTE_STARTERS[state.openingRoute!]);
      if(!receipt||!offers.some(o=>receipt.fingerprint===stableHash({runId:state.runId,commandId,expectedSeq:receipt.seq-1,action:{type:'BuyOffer',offerId:o.offerId}})))fail('invalid-save-starter-purchase');
      if(stamp.rootId!==null){
        const rootPrefix=state.runId+'/hand/';if(!(stamp.rootId as string).startsWith(rootPrefix)||!(stamp.eventId as string).startsWith((stamp.rootId as string)+'/'))fail('invalid-save-starter-event');
        const trigger=state.receipts.find(r=>rootPrefix+r.commandId===stamp.rootId);if(!trigger||trigger.seq<=receipt!.seq)fail('invalid-save-starter-trigger-receipt');
        if(state.lastTrace?.rootId===stamp.rootId&&routeStarterScoreEvent(state,state.lastTrace!)?.eventId!==stamp.eventId)fail('invalid-save-starter-event-benefit');
      }else if(state.lastTrace&&routeStarterScoreEvent(state,state.lastTrace))fail('invalid-save-missing-starter-trigger');
    }
  }
  const stage=s.stage as R2RunState['stage'],sameStage=stage?.index===s.stageIndex&&['await-input','run-lost'].includes(s.phase as string);
  trace(s.lastTrace,{core:usesR2ErxiangCore(s),group:hasR2GroupUpgradeContract(s),combo,definitions:r2JokerDefinitionsFor(s),runId:s.runId as string,characterId:s.characterId as string,amoScoreTiming:r2ScoreTimingFor(s),discoveredHands:Object.keys(levels),levels:levels as R2RunState['handLevels'],stage,stageIndex:s.stageIndex as number,
    config,program:s.program as R2ProgramState|null,usage:usage as R2RunState['chapterHandUsage'],
    liveJokerIds:sameStage?(s.jokers as R2JokerInstance[]).map(joker=>joker.instanceId):undefined,liveJokers:combo||sameStage?s.jokers as R2JokerInstance[]:undefined,settledGold:['stage-cleared','run-won'].includes(s.phase as string)?s.gold as number:undefined});
  const program=s.program as R2ProgramState|null;
  if(program?.claimed){
    const last=value as R2RunState;
    if(!stage||stage.index%3!==2||Math.floor(stage.index/3)+1!==program.chapter||stage.clearId!==`${s.runId}/clear/${stage.index}`||
      stage.skipResult!==null||BigInt(stage.heat)<BigInt(stage.targetHeat)||!last.lastTrace?.events.some(event=>
        event.sourceType==='rule'&&event.sourceDefinitionId===program.selectedId&&event.phase==='onStageClear'&&
        ['add-gold','upgrade-hand','reward-free-reroll','program-reward-skipped'].includes(event.operation)))fail('invalid-save-program-claim');
  }
  if(s.outcome!==null){const o=record(s.outcome,['reason','stageIndex']);oneOf(o.reason,['graybox-complete','all-stages-cleared','hands-exhausted','no-legal-cards','abandoned']);integer(o.stageIndex,0,stageMaximum);}
  assertR2Invariants(value as unknown as R2RunState);
}
export function makeCheckpoint(state:R2RunState,journal:readonly Command[]):Checkpoint {
  safeTree(state);validateState(state);
  const kept=structuredClone(journal.slice(-MAX_JOURNAL)),payload={format:'dachoupai-checkpoint' as const,formatVersion:1 as const,state:structuredClone(state),journalBaseSeq:state.commandSeq-kept.length,journal:kept};
  const checkpoint={...payload,checksum:stableHash(payload)};
  const read=readCheckpoint(checkpoint);if(!read.ok)fail(read.code);return checkpoint;
}
export function readCheckpoint(value:unknown):ReadResult {
  try {
    safeTree(value);const c=record(value,['format','formatVersion','state','journalBaseSeq','journal','checksum']);
    if(c.format!=='dachoupai-checkpoint'||c.formatVersion!==1)fail('incompatible-save-format');
    validateState(c.state);integer(c.journalBaseSeq,1);text(c.checksum);
    const state=c.state as R2RunState,journal=array(c.journal,MAX_JOURNAL);let seq=c.journalBaseSeq as number;
    for(const item of journal){const command=record(item,['runId','commandId','expectedSeq','action']);text(command.commandId);if(command.runId!==state.runId||command.expectedSeq!==seq++)fail('invalid-save-journal');action(command.action,state);
      const receipt=state.receipts.find(r=>r.commandId===command.commandId);if(!receipt||receipt.seq!==seq||receipt.fingerprint!==stableHash(command))fail('invalid-save-command-receipt');
    }
    if(seq!==state.commandSeq)fail('invalid-save-journal-sequence');
    if(usesR2ErxiangCore(state)){
      let previous:import('../cards/types').Rank|null|undefined;
      for(const entry of journal as Command[]){
        if(entry.action.type==='EnterStage'||entry.action.type==='SkipStage')previous=null;
        if(entry.action.type==='PlayHand'){
          if(state.lastTrace?.rootId===`${state.runId}/hand/${entry.commandId}`){
            const core=state.lastTrace.erxiangCore!;
            if(core.targetId!==(entry.action.coreTargetId??null)||core.targetRank!==(entry.action.coreTargetRank??null)||previous!==undefined&&core.previousRank!==previous)fail('invalid-save-core-journal-trace');
          }
          previous=entry.action.coreTargetRank??null;
        }
      }
    }
    if(r2UsesAssist(state)){
      let used:boolean|undefined;
      const journalConsumed=new Set<string>();
      for(const entry of journal as Command[]){
        if(entry.action.type==='EnterStage'||entry.action.type==='SkipStage')used=false;
        // Only EnterStage rebuilds the physical deck zones; a shop/skip keeps used cards used.
        if(entry.action.type==='EnterStage')journalConsumed.clear();
        if(entry.action.type==='PlayAssistedHand'){if(used===true)fail('invalid-save-assist-journal-usage');used=true;for(const id of entry.action.assistIds)journalConsumed.add(id);}
        if(state.lastTrace?.rootId===`${state.runId}/hand/${entry.commandId}`){
          if(entry.action.type!=='PlayHand'&&entry.action.type!=='PlayAssistedHand')fail('invalid-save-assist-journal-trace');
          const play=entry.action as Extract<Action,{type:'PlayHand'|'PlayAssistedHand'}>,ordered=(ids:readonly string[])=>state.lastTrace!.cards.filter(card=>ids.includes(card.id)).map(card=>card.id);
          if(ordered(play.selectedIds).length!==play.selectedIds.length||stableHash(ordered(play.selectedIds))!==stableHash(state.lastTrace.sets.playedIds)||
            (play.type==='PlayAssistedHand'?ordered(play.assistIds).length!==play.assistIds.length||stableHash(ordered(play.assistIds))!==stableHash(state.lastTrace.sets.assistConsumedIds):state.lastTrace.assist!==null))fail('invalid-save-assist-journal-trace');
        }
      }
      if(state.stage&&used!==undefined&&state.stage.assistUsed!==used)fail('invalid-save-assist-journal-usage');
      const consumed=[...journalConsumed,...(state.lastTrace?.sets.assistConsumedIds??[])];
      if(consumed.some(id=>!state.playedPile.includes(id)&&!state.destroyedIds.includes(id)))fail('invalid-save-assist-used-zone');
    }

    const {checksum,...payload}=c;if(checksum!==stableHash(payload))fail('corrupt-checksum');
    return {ok:true,checkpoint:structuredClone(value) as Checkpoint};
  } catch(error){return {ok:false,code:error instanceof Error?error.message:'invalid-save'};}
}
function rawPartition(value:unknown):string|undefined {
  if(!value||typeof value!=='object'||Array.isArray(value))return;
  const state=(value as Record<string,unknown>).state;
  if(!state||typeof state!=='object'||Array.isArray(state))return;
  const tags=state as Record<string,unknown>;
  if(tags.schemaVersion!==2||tags.rulesVersion!=='r2'||!r2RulesetFor(tags)||
    ['mode','difficulty','challengeId','programsEnabled'].some(field=>!Object.hasOwn(tags,field)))return;
  const selected=resolveR2ModeConfig({mode:tags.mode,difficulty:tags.difficulty,challengeId:tags.challengeId,programsEnabled:tags.programsEnabled});
  return selected.ok?r2ModeStorageKey(selected.config,tags.contentHash as string):undefined;
}
export function restoreSlots(slots:{revision:number;current:unknown|null;previous:unknown|null}):{status:'empty'|'current'|'backup'|'invalid';checkpoint?:Checkpoint;code?:string;raw:unknown|null} {
  if(slots.current===null&&slots.previous===null)return {status:'empty',raw:null};
  const current=readCheckpoint(slots.current);if(current.ok)return {status:'current',checkpoint:current.checkpoint,raw:slots.current};
  const previous=readCheckpoint(slots.previous);
  if(previous.ok&&(slots.current===null||rawPartition(slots.current)===r2ModeStorageKey(previous.checkpoint.state,previous.checkpoint.state.contentHash)))
    return {status:'backup',checkpoint:previous.checkpoint,code:current.code,raw:slots.current};
  return {status:'invalid',code:current.code,raw:slots.current};
}
