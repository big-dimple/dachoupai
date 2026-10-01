import data from './r2-tools.json';
import {SUITS, type Suit} from '../cards/types';
import {R2_HAND_TYPES, type R2HandType} from '../domain/evaluateR2';
import type {Fraction} from '../domain/rational';

export const R2_TOOL_FEATURES = ['hand-upgrade','planet-upgrade','card-targets','suit-change','card-delete',
  'card-copy','rank-change','enhancements','lucky','editions','gold-supply','discard-restore','free-reroll',
  'spectral','permanent-resources','hand-exchange','rare-reward','joker-sacrifice','specials-reset',
  'long-term-items','first-boss-supply'] as const;
export type R2ToolFeature = typeof R2_TOOL_FEATURES[number];
export type R2ToolEnhancement = 'heat-paper'|'multiplier-paper'|'glass-paper'|'voice-paper'|'gold-paper'|'encore-paper'|'lucky-paper';
export type R2Edition = 'none'|'foil'|'holographic'|'polychrome';
export type R2ToolFamily = 'tarot'|'planet'|'spectral'|'utility';
export type R2ToolPhase = 'shop'|'await-input';
export type R2ToolCap = 'singleUse'|'oncePerRun'|'handLevelMaximum'|'deckDeletionFloor'|'minimalDeckFloor'|
  'deckMaximum'|'handMinimum'|'handMaximum'|'handsMinimum'|'jokerMaximum'|'consumableSlots'|
  'consumableSlotsMaximum'|'longTermSlots'|'spectralHandsPenaltyMaximum'|'spectralHandPenaltyMaximum'|
  'luckyGoldPerHand'|'stageDiscardMaximum'|'postConsumptionCapacity'|'actualResourceChange'|'legalActionAfter';
export type R2ToolTarget =
  | {kind:'none'}
  | {kind:'discovered-hand';selection:'chosen'|'fixed'}
  | {kind:'cards';minimum:number;maximum:number;scope:'phase-known'}
  | {kind:'card-sacrifice';donors:1;minimum:number;maximum:number;recipients:'unenhanced';distinct:true}
  | {kind:'card-or-joker';edition:'none'}
  | {kind:'suit';scope:'whole-deck'}
  | {kind:'hand-exchange';distinct:true}
  | {kind:'joker-sacrifice';donors:1;recipients:1;distinct:true;excludedEdition:'polychrome'}
  | {kind:'whole-deck';selection:'all-active'};
export type R2ToolCost =
  | {kind:'gold';amount:number}
  | {kind:'all-gold';minimum:number}
  | {kind:'sacrifice-card'|'sacrifice-joker';count:1}
  | {kind:'permanent-hands-penalty'|'permanent-hand-penalty';amount:1;effective:'next-stage';requireExactChange:true};
export type R2ToolOperation =
  | {kind:'upgrade-hand';levels:1;handType?:R2HandType}
  | {kind:'delete-cards'}
  | {kind:'set-suit';suit:Suit}
  | {kind:'copy-card';copies:1|2;fields:readonly ['rank','suit','enhancement','edition'];retainOriginal:true}
  | {kind:'shift-rank';delta:1|-1;minimum:2;maximum:14;wrap:false}
  | {kind:'set-enhancement';enhancement:R2ToolEnhancement}
  | {kind:'add-gold';amount:number}
  | {kind:'restore-discard';amount:1;cap:'stage-entry'}
  | {kind:'free-reroll';advanceCount:true;growth:false}
  | {kind:'random-enhancement';rng:'rule';independentPerTarget:true;choices:readonly {id:R2ToolEnhancement;weight:number}[]}
  | {kind:'random-edition';rng:'rule';choices:readonly {id:Exclude<R2Edition,'none'>;weight:number}[]}
  | {kind:'set-deck-suit';preserveOrder:true}
  | {kind:'exchange-hand-levels';gain:number;loss:number;targetMaximumBefore:number;donorMinimumBefore:number;preserveDiscovery:true}
  | {kind:'rare-joker-reward';rng:'reward';selection:'uniform-unowned-supported-rare';paidPrice:0;edition:'none';resetGrowth:true}
  | {kind:'set-joker-edition';edition:'polychrome';saleHooks:false;keepPaidPrice:true}
  | {kind:'clear-deck-specials';minimumModifiedCards:number;countEachCardOnce:true;handBonus:1;effective:'next-stage';requireExactChange:true};
export interface R2ToolRewardSource {
  source:'normal-stage-skip'|'e10-stage-clear'|'c12-stage-clear'|'first-boss-clear';overflowGold:number;
  claim?:'once-per-run';rng?:'none';
}
export interface R2ToolDefinition {
  id:string;name:string;family:R2ToolFamily;price:number;shopWeight:number;phases:readonly R2ToolPhase[];
  target:R2ToolTarget;operation:R2ToolOperation;costs:readonly R2ToolCost[];caps:readonly R2ToolCap[];
  reject:readonly string[];requiredFeatures:readonly R2ToolFeature[];lifetime:'consumed-on-success';
  assetId:string;rewardSources:readonly R2ToolRewardSource[];
}
export type R2EnhancementEffect =
  | {phase:'onCardScore'|'onHeldCard';kind:'add-heat'|'add-multiplier'|'multiply-multiplier';value:Fraction}
  | {phase:'afterHand';kind:'chance-destroy';probability:{n:number;d:number};rng:'rule';oncePerOriginalCard:true;belowDeletionFloorAllowed:true}
  | {phase:'onStageClear';kind:'add-gold';amount:number;capPerStage:number}
  | {phase:'onCardScore';kind:'retrigger-card';count:1;maximumDepth:1}
  | {phase:'onCardScore';kind:'chance-add-multiplier';probability:{n:number;d:number};value:Fraction;rng:'rule'}
  | {phase:'onCardScore';kind:'chance-add-gold';probability:{n:number;d:number};amount:number;capPerHand:number;rng:'rule';drawWhenCapped:true};
export interface R2EnhancementDefinition {
  id:R2ToolEnhancement;name:string;assetId:string;replacement:'one-enhancement';activeOnly:true;
  repeat:'each-scoring-pass'|'held-once'|'winning-held-once';effects:readonly R2EnhancementEffect[];
}
export interface R2EditionDefinition {
  id:R2Edition;name:string;assetId:string;shopWeight:number;priceDelta:number;appliesTo:readonly ['card','joker'];
  cardTiming:'after-enhancement-before-joker-hooks';jokerTiming:'after-own-jokerScore';jokerRequiresOwnHookHit:false;
  disabledStopsScore:true;rarityIndependent:true;repeat:'each-scoring-pass';
  effect:null|{kind:'add-heat'|'add-multiplier'|'multiply-multiplier';value:Fraction};
}
export type R2LongTermOperation =
  | {kind:'hand-limit'|'discard-limit'|'hands-limit'|'interest-cap'|'consumable-slots';amount:number}
  | {kind:'joker-offer-count'|'item-offer-count';base:number;amount:number}
  | {kind:'paid-reroll-discount';amount:number;minimum:1}
  | {kind:'deletion-floor';floor:number}
  | {kind:'boss-most-used-hand-upgrade';levels:1;tieBreak:'hand-table-low-to-high';atCap:'skip-without-redraw'}
  | {kind:'first-purchase-discount';amount:number;minimum:1;excludeSelf:true}
  | {kind:'first-normal-clear-per-chapter';gold:number;skipConsumes:false;retroactive:false};
export interface R2LongTermDefinition {
  id:string;name:string;price:number;shopWeight:number;operation:R2LongTermOperation;readAt:readonly string[];
  caps:readonly R2ToolCap[];duplicate:false;sellable:false;lifetime:'run';requiredFeatures:readonly ['long-term-items'];assetId:string;
}
export interface R2ToolLimits {
  singleUse:1;oncePerRun:1;handLevelMaximum:number;deckDeletionFloor:number;minimalDeckFloor:number;deckMaximum:number;
  handMinimum:number;handMaximum:number;handsMinimum:number;jokerMaximum:number;consumableSlots:number;
  consumableSlotsMaximum:number;longTermSlots:number;spectralHandsPenaltyMaximum:number;spectralHandPenaltyMaximum:number;
  luckyGoldPerHand:number;deletionFloorPolicy:'voluntary-only';
}
export interface R2ToolCatalog {
  schemaVersion:1;decisionId:'D24';limits:R2ToolLimits;
  acquisition:{familyWeights:Record<R2ToolFamily,number>;emptyFamily:'remove-and-renormalize';skipRewardIds:readonly string[];
    generatedCards:'draw-pile-bottom-without-shuffle';duplicates:'independent-consumable-instances';eligibility:'legal-effect-and-discovery-before-weighting'};
  initialSupportedToolIds:readonly string[];initialSupportedFeatures:readonly R2ToolFeature[];
  tools:readonly R2ToolDefinition[];enhancements:readonly R2EnhancementDefinition[];
  editions:readonly R2EditionDefinition[];longTermItems:readonly R2LongTermDefinition[];
}

const enhancementIds:readonly R2ToolEnhancement[]=['heat-paper','multiplier-paper','glass-paper','voice-paper','gold-paper','encore-paper','lucky-paper'];
const editionIds:readonly R2Edition[]=['none','foil','holographic','polychrome'];
const originalToolIds=['T01','T03','T04','T05','T06','T17'];
const originalFeatures:readonly R2ToolFeature[]=['hand-upgrade','card-targets','suit-change','discard-restore'];
const capKeys:readonly R2ToolCap[]=['singleUse','oncePerRun','handLevelMaximum','deckDeletionFloor','minimalDeckFloor','deckMaximum',
  'handMinimum','handMaximum','handsMinimum','jokerMaximum','consumableSlots','consumableSlotsMaximum','longTermSlots',
  'spectralHandsPenaltyMaximum','spectralHandPenaltyMaximum','luckyGoldPerHand','stageDiscardMaximum',
  'postConsumptionCapacity','actualResourceChange','legalActionAfter'];
const rejectKeys=['wrong-phase','unknown-target','duplicate-target','no-effect','stale-command','save-failed','undiscovered-hand',
  'hand-level-cap','replacement-unconfirmed','empty-refresh-pool','wrong-hand-type','deck-floor','donor-is-recipient',
  'not-enough-gold','nonordinary-target','deck-maximum','resource-floor','no-next-stage','invalid-hand-exchange',
  'joker-slots-full','empty-reward-pool','target-already-polychrome','over-capacity-after-sacrifice','already-claimed',
  'too-few-special-cards','resource-cap'];
type ObjectValue=Record<string,unknown>;
const object=(v:unknown):v is ObjectValue=>!!v&&typeof v==='object'&&!Array.isArray(v);
const shape=(v:ObjectValue,required:readonly string[],optional:readonly string[]=[])=>required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
const integer=(v:unknown,min:number,max:number)=>Number.isSafeInteger(v)&&(v as number)>=min&&(v as number)<=max;
const list=(v:unknown,allowed:readonly unknown[],allowEmpty=false):v is string[]=>Array.isArray(v)&&(allowEmpty||v.length>0)&&new Set(v).size===v.length&&v.every(k=>allowed.includes(k));
const same=(a:readonly unknown[],b:readonly unknown[])=>a.length===b.length&&a.every((value,index)=>value===b[index]);
const textValue=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=128;
const asset=(v:unknown)=>typeof v==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(v);
const expectedIds=(prefix:string,count:number)=>Array.from({length:count},(_,i)=>`${prefix}${String(i+1).padStart(2,'0')}`);
const fraction=(v:unknown)=>object(v)&&shape(v,['n','d'])&&typeof v.n==='string'&&typeof v.d==='string'&&/^\d{1,8}$/.test(v.n)&&/^[1-9]\d{0,7}$/.test(v.d)&&BigInt(v.n)>0n;
const probability=(v:unknown)=>object(v)&&shape(v,['n','d'])&&integer(v.n,1,10000)&&integer(v.d,v.n as number,10000);
const choices=(v:unknown,allowed:readonly string[])=>Array.isArray(v)&&v.length===allowed.length&&new Set(v.map(o=>object(o)?o.id:null)).size===v.length&&v.every(o=>object(o)&&shape(o,['id','weight'])&&allowed.includes(o.id as string)&&integer(o.weight,1,1000));

function validTarget(v:unknown):v is R2ToolTarget {
  if(!object(v))return false;
  switch(v.kind){
    case 'none':return shape(v,['kind']);
    case 'discovered-hand':return shape(v,['kind','selection'])&&['chosen','fixed'].includes(v.selection as string);
    case 'cards':return shape(v,['kind','minimum','maximum','scope'])&&integer(v.minimum,1,14)&&integer(v.maximum,v.minimum as number,14)&&v.scope==='phase-known';
    case 'card-sacrifice':return shape(v,['kind','donors','minimum','maximum','recipients','distinct'])&&v.donors===1&&integer(v.minimum,1,2)&&integer(v.maximum,v.minimum as number,2)&&v.recipients==='unenhanced'&&v.distinct===true;
    case 'card-or-joker':return shape(v,['kind','edition'])&&v.edition==='none';
    case 'suit':return shape(v,['kind','scope'])&&v.scope==='whole-deck';
    case 'hand-exchange':return shape(v,['kind','distinct'])&&v.distinct===true;
    case 'joker-sacrifice':return shape(v,['kind','donors','recipients','distinct','excludedEdition'])&&v.donors===1&&v.recipients===1&&v.distinct===true&&v.excludedEdition==='polychrome';
    case 'whole-deck':return shape(v,['kind','selection'])&&v.selection==='all-active';
  }
  return false;
}
function validCost(v:unknown):v is R2ToolCost {
  if(!object(v))return false;
  switch(v.kind){
    case 'gold':return shape(v,['kind','amount'])&&integer(v.amount,1,100);
    case 'all-gold':return shape(v,['kind','minimum'])&&integer(v.minimum,1,100);
    case 'sacrifice-card':case 'sacrifice-joker':return shape(v,['kind','count'])&&v.count===1;
    case 'permanent-hands-penalty':case 'permanent-hand-penalty':return shape(v,['kind','amount','effective','requireExactChange'])&&v.amount===1&&v.effective==='next-stage'&&v.requireExactChange===true;
  }
  return false;
}
function validOperation(v:unknown):v is R2ToolOperation {
  if(!object(v))return false;
  switch(v.kind){
    case 'upgrade-hand':return shape(v,['kind','levels'],['handType'])&&v.levels===1&&(v.handType===undefined||R2_HAND_TYPES.includes(v.handType as R2HandType));
    case 'delete-cards':return shape(v,['kind']);
    case 'set-suit':return shape(v,['kind','suit'])&&SUITS.includes(v.suit as Suit);
    case 'copy-card':return shape(v,['kind','copies','fields','retainOriginal'])&&integer(v.copies,1,2)&&Array.isArray(v.fields)&&same(v.fields,['rank','suit','enhancement','edition'])&&v.retainOriginal===true;
    case 'shift-rank':return shape(v,['kind','delta','minimum','maximum','wrap'])&&[1,-1].includes(v.delta as number)&&v.minimum===2&&v.maximum===14&&v.wrap===false;
    case 'set-enhancement':return shape(v,['kind','enhancement'])&&enhancementIds.includes(v.enhancement as R2ToolEnhancement);
    case 'add-gold':return shape(v,['kind','amount'])&&integer(v.amount,1,100);
    case 'restore-discard':return shape(v,['kind','amount','cap'])&&v.amount===1&&v.cap==='stage-entry';
    case 'free-reroll':return shape(v,['kind','advanceCount','growth'])&&v.advanceCount===true&&v.growth===false;
    case 'random-enhancement':return shape(v,['kind','rng','independentPerTarget','choices'])&&v.rng==='rule'&&v.independentPerTarget===true&&choices(v.choices,enhancementIds);
    case 'random-edition':return shape(v,['kind','rng','choices'])&&v.rng==='rule'&&choices(v.choices,editionIds.slice(1));
    case 'set-deck-suit':return shape(v,['kind','preserveOrder'])&&v.preserveOrder===true;
    case 'exchange-hand-levels':return shape(v,['kind','gain','loss','targetMaximumBefore','donorMinimumBefore','preserveDiscovery'])&&integer(v.gain,1,5)&&integer(v.loss,1,5)&&integer(v.targetMaximumBefore,1,29)&&integer(v.donorMinimumBefore,2,30)&&v.preserveDiscovery===true;
    case 'rare-joker-reward':return shape(v,['kind','rng','selection','paidPrice','edition','resetGrowth'])&&v.rng==='reward'&&v.selection==='uniform-unowned-supported-rare'&&v.paidPrice===0&&v.edition==='none'&&v.resetGrowth===true;
    case 'set-joker-edition':return shape(v,['kind','edition','saleHooks','keepPaidPrice'])&&v.edition==='polychrome'&&v.saleHooks===false&&v.keepPaidPrice===true;
    case 'clear-deck-specials':return shape(v,['kind','minimumModifiedCards','countEachCardOnce','handBonus','effective','requireExactChange'])&&integer(v.minimumModifiedCards,1,80)&&v.countEachCardOnce===true&&v.handBonus===1&&v.effective==='next-stage'&&v.requireExactChange===true;
  }
  return false;
}

/** Fixed capability inference prevents a deleted manifest field from enabling an unimplemented operation. */
function actualFeatures(tool:R2ToolDefinition):Set<R2ToolFeature> {
  const features=new Set<R2ToolFeature>();
  if(['cards','card-sacrifice','card-or-joker'].includes(tool.target.kind))features.add('card-targets');
  if(tool.family==='planet')features.add('planet-upgrade');
  if(tool.family==='spectral')features.add('spectral');
  switch(tool.operation.kind){
    case 'upgrade-hand':features.add('hand-upgrade');break;
    case 'delete-cards':features.add('card-delete');break;
    case 'set-suit':case 'set-deck-suit':features.add('suit-change');break;
    case 'copy-card':features.add('card-copy');break;
    case 'shift-rank':features.add('rank-change');break;
    case 'set-enhancement':features.add('enhancements');if(tool.operation.enhancement==='lucky-paper')features.add('lucky');break;
    case 'add-gold':features.add('gold-supply');break;
    case 'restore-discard':features.add('discard-restore');break;
    case 'free-reroll':features.add('free-reroll');break;
    case 'random-enhancement':features.add('enhancements');features.add('lucky');break;
    case 'random-edition':case 'set-joker-edition':features.add('editions');break;
    case 'exchange-hand-levels':features.add('hand-upgrade');features.add('hand-exchange');break;
    case 'rare-joker-reward':features.add('rare-reward');break;
    case 'clear-deck-specials':features.add('specials-reset');features.add('enhancements');features.add('editions');features.add('permanent-resources');break;
  }
  for(const cost of tool.costs){
    if(cost.kind==='sacrifice-card')features.add('card-delete');
    if(cost.kind==='sacrifice-joker')features.add('joker-sacrifice');
    if(cost.kind==='permanent-hand-penalty'||cost.kind==='permanent-hands-penalty')features.add('permanent-resources');
  }
  if(tool.rewardSources.some(source=>source.source==='first-boss-clear'))features.add('first-boss-supply');
  return features;
}

function validEnhancementEffect(v:unknown):v is R2EnhancementEffect {
  if(!object(v))return false;
  switch(v.kind){
    case 'add-heat':case 'add-multiplier':case 'multiply-multiplier':return shape(v,['phase','kind','value'])&&['onCardScore','onHeldCard'].includes(v.phase as string)&&fraction(v.value);
    case 'chance-destroy':return shape(v,['phase','kind','probability','rng','oncePerOriginalCard','belowDeletionFloorAllowed'])&&v.phase==='afterHand'&&probability(v.probability)&&v.rng==='rule'&&v.oncePerOriginalCard===true&&v.belowDeletionFloorAllowed===true;
    case 'add-gold':return shape(v,['phase','kind','amount','capPerStage'])&&v.phase==='onStageClear'&&integer(v.amount,1,100)&&integer(v.capPerStage,v.amount as number,100);
    case 'retrigger-card':return shape(v,['phase','kind','count','maximumDepth'])&&v.phase==='onCardScore'&&v.count===1&&v.maximumDepth===1;
    case 'chance-add-multiplier':return shape(v,['phase','kind','probability','value','rng'])&&v.phase==='onCardScore'&&probability(v.probability)&&fraction(v.value)&&v.rng==='rule';
    case 'chance-add-gold':return shape(v,['phase','kind','probability','amount','capPerHand','rng','drawWhenCapped'])&&v.phase==='onCardScore'&&probability(v.probability)&&integer(v.amount,1,100)&&integer(v.capPerHand,v.amount as number,100)&&v.rng==='rule'&&v.drawWhenCapped===true;
  }
  return false;
}
function validLongTermOperation(v:unknown):v is R2LongTermOperation {
  if(!object(v))return false;
  switch(v.kind){
    case 'hand-limit':case 'discard-limit':case 'hands-limit':case 'interest-cap':case 'consumable-slots':return shape(v,['kind','amount'])&&integer(v.amount,1,6);
    case 'joker-offer-count':case 'item-offer-count':return shape(v,['kind','base','amount'])&&integer(v.base,1,4)&&integer(v.amount,1,2);
    case 'paid-reroll-discount':return shape(v,['kind','amount','minimum'])&&integer(v.amount,1,10)&&v.minimum===1;
    case 'deletion-floor':return shape(v,['kind','floor'])&&integer(v.floor,5,80);
    case 'boss-most-used-hand-upgrade':return shape(v,['kind','levels','tieBreak','atCap'])&&v.levels===1&&v.tieBreak==='hand-table-low-to-high'&&v.atCap==='skip-without-redraw';
    case 'first-purchase-discount':return shape(v,['kind','amount','minimum','excludeSelf'])&&integer(v.amount,1,10)&&v.minimum===1&&v.excludeSelf===true;
    case 'first-normal-clear-per-chapter':return shape(v,['kind','gold','skipConsumes','retroactive'])&&integer(v.gold,1,100)&&v.skipConsumes===false&&v.retroactive===false;
  }
  return false;
}
function targetMatches(tool:R2ToolDefinition):boolean {
  const expected:Record<R2ToolOperation['kind'],R2ToolTarget['kind']>={
    'upgrade-hand':'discovered-hand','delete-cards':'cards','set-suit':'cards','copy-card':'cards','shift-rank':'cards',
    'set-enhancement':'cards','add-gold':'none','restore-discard':'none','free-reroll':'none',
    'random-enhancement':'card-sacrifice','random-edition':'card-or-joker','set-deck-suit':'suit',
    'exchange-hand-levels':'hand-exchange','rare-joker-reward':'none','set-joker-edition':'joker-sacrifice','clear-deck-specials':'whole-deck',
  };
  if(tool.target.kind!==expected[tool.operation.kind])return false;
  if(tool.operation.kind==='upgrade-hand'&&tool.target.kind==='discovered-hand')
    return tool.operation.handType===undefined?tool.target.selection==='chosen':tool.target.selection==='fixed';
  return true;
}

/** Catalog validation only. Domain use, pool selection and save integration belong to C01.2–8. */
export function validateR2Tools(input:unknown):string[] {
  const errors:string[]=[];
  const check=(yes:unknown,path:string,message:string)=>{if(!yes)errors.push(`${path}: ${message}`);};
  if(!object(input)||!shape(input,['schemaVersion','decisionId','limits','acquisition','initialSupportedToolIds','initialSupportedFeatures','tools','enhancements','editions','longTermItems']))return ['catalog: invalid top-level fields'];
  check(input.schemaVersion===1&&input.decisionId==='D24','catalog','unknown contract version');
  const bounds=input.limits;
  const numericLimits=capKeys.filter(k=>!['stageDiscardMaximum','postConsumptionCapacity','actualResourceChange','legalActionAfter'].includes(k));
  if(!object(bounds)||!shape(bounds,[...numericLimits,'deletionFloorPolicy']))return [...errors,'limits: invalid fields'];
  check(bounds.singleUse===1&&bounds.oncePerRun===1&&bounds.deletionFloorPolicy==='voluntary-only','limits','invalid lifetime or deletion policy');
  check(integer(bounds.handLevelMaximum,1,30)&&integer(bounds.deckDeletionFloor,20,80)&&integer(bounds.minimalDeckFloor,16,bounds.deckDeletionFloor as number)&&integer(bounds.deckMaximum,bounds.deckDeletionFloor as number,80),'limits','invalid deck or level bounds');
  check(integer(bounds.handMinimum,5,14)&&integer(bounds.handMaximum,bounds.handMinimum as number,14)&&integer(bounds.handsMinimum,2,6),'limits','invalid minimum resources');
  check(integer(bounds.jokerMaximum,1,5)&&integer(bounds.consumableSlots,1,4)&&integer(bounds.consumableSlotsMaximum,bounds.consumableSlots as number,4)&&integer(bounds.longTermSlots,1,4),'limits','invalid inventory bounds');
  check(integer(bounds.spectralHandsPenaltyMaximum,1,2)&&integer(bounds.spectralHandPenaltyMaximum,1,2)&&integer(bounds.luckyGoldPerHand,1,100),'limits','invalid spectral/lucky cap');
  check(Array.isArray(input.initialSupportedToolIds)&&same(input.initialSupportedToolIds,originalToolIds),'catalog','changed live tool gate');
  check(Array.isArray(input.initialSupportedFeatures)&&same(input.initialSupportedFeatures,originalFeatures),'catalog','changed live capability gate');
  const acquisition=input.acquisition;
  if(!object(acquisition)||!shape(acquisition,['familyWeights','emptyFamily','skipRewardIds','generatedCards','duplicates','eligibility']))return [...errors,'acquisition: invalid fields'];
  check(object(acquisition.familyWeights)&&shape(acquisition.familyWeights,['tarot','planet','spectral','utility'])&&Object.values(acquisition.familyWeights).every(v=>integer(v,1,10000)),'acquisition','invalid family weights');
  check(Array.isArray(acquisition.skipRewardIds)&&same(acquisition.skipRewardIds,originalToolIds),'acquisition','changed published skip reward pool');
  check(acquisition.emptyFamily==='remove-and-renormalize'&&acquisition.generatedCards==='draw-pile-bottom-without-shuffle'&&acquisition.duplicates==='independent-consumable-instances'&&acquisition.eligibility==='legal-effect-and-discovery-before-weighting','acquisition','invalid acquisition policy');
  const expectedToolIds=[...expectedIds('T',19),...expectedIds('P',12),...expectedIds('S',8)];
  const usedAssets=new Set<string>();
  const checkAsset=(id:unknown,path:string)=>{check(asset(id)&&!usedAssets.has(id as string),path,'invalid or duplicate asset ID');if(typeof id==='string')usedAssets.add(id);};
  const checkRows=(rows:unknown,expected:readonly string[],path:string):rows is ObjectValue[]=>{
    if(!Array.isArray(rows)){errors.push(`${path}: expected array`);return false;}
    check(rows.every(object)&&rows.length===expected.length&&new Set(rows.map(row=>object(row)?row.id:null)).size===rows.length&&rows.every(row=>object(row)&&expected.includes(row.id as string)),path,'missing, duplicate or unknown definition ID');
    return rows.every(object)&&rows.every(row=>expected.includes(row.id as string));
  };
  if(checkRows(input.tools,expectedToolIds,'tools'))for(const raw of input.tools){
    const path=`tools/${String(raw.id)}`;
    check(shape(raw,['id','name','family','price','shopWeight','phases','target','operation','costs','caps','reject','requiredFeatures','lifetime','assetId','rewardSources']),path,'invalid definition fields');
    check(textValue(raw.name)&&integer(raw.price,1,100)&&integer(raw.shopWeight,raw.id==='T16'?0:1,1000),path,'invalid name, price or weight');
    const expectedFamily=(raw.id as string).startsWith('P')?'planet':(raw.id as string).startsWith('S')?'spectral':['T01','T16','T17','T18'].includes(raw.id as string)?'utility':'tarot';
    check(raw.family===expectedFamily,path,'wrong family');
    check(list(raw.phases,['shop','await-input']),path,'invalid use phases');
    check(validTarget(raw.target),path,'invalid targets');check(validOperation(raw.operation),path,'invalid operation');
    check(Array.isArray(raw.costs)&&raw.costs.length<=2&&raw.costs.every(validCost),path,'invalid costs');
    check(list(raw.caps,capKeys)&&raw.caps.includes('singleUse'),path,'invalid caps');
    const rejects=raw.reject;
    check(list(rejects,rejectKeys)&&['wrong-phase','unknown-target','duplicate-target','no-effect','stale-command','save-failed'].every(reason=>rejects.includes(reason)),path,'incomplete rejection contract');
    check(list(raw.requiredFeatures,R2_TOOL_FEATURES),path,'invalid features');
    check(raw.lifetime==='consumed-on-success',path,'invalid lifetime');checkAsset(raw.assetId,path);
    let validRewards=Array.isArray(raw.rewardSources);
    check(validRewards,path,'reward sources must be an array');
    if(Array.isArray(raw.rewardSources))for(const reward of raw.rewardSources){
      const valid=object(reward)&&shape(reward,['source','overflowGold'],['claim','rng'])&&integer(reward.overflowGold,1,100);
      check(valid,path,'invalid reward source');if(!valid){validRewards=false;continue;}
      const r=reward as ObjectValue;
      const mapped=r.source==='normal-stage-skip'?originalToolIds.includes(raw.id as string)&&r.overflowGold===1&&r.claim===undefined&&r.rng===undefined:
        r.source==='e10-stage-clear'?raw.id==='T01'&&r.overflowGold===2&&r.claim===undefined&&r.rng===undefined:
        r.source==='c12-stage-clear'?['T03','T04','T05','T06'].includes(raw.id as string)&&r.overflowGold===2&&r.claim===undefined&&r.rng===undefined:
        r.source==='first-boss-clear'?raw.id==='T16'&&r.overflowGold===2&&r.claim==='once-per-run'&&r.rng==='none':false;
      check(mapped,path,'changed reward source/pool');if(!mapped)validRewards=false;
    }
    if(Array.isArray(raw.rewardSources)){
      const sources=raw.rewardSources.filter(object).map(r=>r.source);
      const expectedSources=originalToolIds.includes(raw.id as string)?['normal-stage-skip']:[];
      if(raw.id==='T01')expectedSources.push('e10-stage-clear');
      if(['T03','T04','T05','T06'].includes(raw.id as string))expectedSources.push('c12-stage-clear');
      if(raw.id==='T16')expectedSources.push('first-boss-clear');
      check(same(sources,expectedSources),path,'missing or duplicate reward source');
    }
    if(!validTarget(raw.target)||!validOperation(raw.operation)||!Array.isArray(raw.costs)||!raw.costs.every(validCost)||!list(raw.requiredFeatures,R2_TOOL_FEATURES,true)||!list(raw.caps,capKeys)||!list(raw.phases,['shop','await-input'])||!validRewards)continue;
    const tool=raw as unknown as R2ToolDefinition,op=tool.operation;
    check(targetMatches(tool),path,'target/operation mismatch');
    const originalKinds=['upgrade-hand','delete-cards','set-suit','set-suit','set-suit','set-suit','copy-card','shift-rank','shift-rank',
      'set-enhancement','set-enhancement','set-enhancement','set-enhancement','set-enhancement','set-enhancement','add-gold','restore-discard','free-reroll','set-enhancement'];
    const spectralKinds=['random-enhancement','random-edition','copy-card','set-deck-suit','exchange-hand-levels','rare-joker-reward','set-joker-edition','clear-deck-specials'];
    if(tool.id.startsWith('T'))check(op.kind===originalKinds[Number(tool.id.slice(1))-1],path,'changed stable base-tool identity');
    if(tool.id.startsWith('S'))check(op.kind===spectralKinds[Number(tool.id.slice(1))-1],path,'changed spectral identity');
    if(tool.family!=='spectral')check(tool.costs.length===0,path,'undeclared base-tool use cost');
    if(tool.id==='T01')check(op.kind==='upgrade-hand'&&op.handType===undefined&&tool.target.kind==='discovered-hand'&&tool.target.selection==='chosen',path,'T01 must preserve generic discovered-hand choice');
    const suits:Record<string,Suit>={T03:'hearts',T04:'diamonds',T05:'clubs',T06:'spades'};
    if(Object.hasOwn(suits,tool.id))check(op.kind==='set-suit'&&op.suit===suits[tool.id],path,'changed stable suit tool');
    const assigned:Record<string,R2ToolEnhancement>={T10:'heat-paper',T11:'multiplier-paper',T12:'glass-paper',T13:'voice-paper',T14:'gold-paper',T15:'encore-paper',T19:'lucky-paper'};
    if(Object.hasOwn(assigned,tool.id))check(op.kind==='set-enhancement'&&op.enhancement===assigned[tool.id],path,'changed stable enhancement tool');
    check([...actualFeatures(tool)].every(feature=>tool.requiredFeatures.includes(feature)),path,'incomplete actual feature declaration');
    const costKind=(kind:R2ToolCost['kind'])=>tool.costs.length===1&&tool.costs[0].kind===kind;
    const hasCaps=(...caps:R2ToolCap[])=>caps.every(cap=>tool.caps.includes(cap));
    const shopOnly=()=>same(tool.phases,['shop']);
    if(tool.family==='planet')check(op.kind==='upgrade-hand'&&op.handType===R2_HAND_TYPES[Number(tool.id.slice(1))-1]&&hasCaps('handLevelMaximum')&&tool.reject.includes('undiscovered-hand'),path,'wrong fixed planet/discovery contract');
    if(op.kind==='upgrade-hand')check(hasCaps('handLevelMaximum'),path,'uncapped hand upgrade');
    if(op.kind==='delete-cards')check(hasCaps('deckDeletionFloor')&&tool.costs.length===0,path,'unsafe deletion contract');
    if(op.kind==='copy-card')check(hasCaps('deckMaximum')&&(op.copies===1?tool.costs.length===0:costKind('permanent-hands-penalty')&&hasCaps('spectralHandsPenaltyMaximum','handsMinimum','actualResourceChange')&&shopOnly()),path,'unsafe copy/resource trade');
    if(op.kind==='random-enhancement')check(costKind('sacrifice-card')&&hasCaps('deckDeletionFloor','legalActionAfter'),path,'missing enhancement sacrifice/soft-lock gate');
    if(op.kind==='random-edition')check(costKind('gold'),path,'missing edition gold cost');
    if(op.kind==='set-deck-suit')check(shopOnly()&&costKind('permanent-hand-penalty')&&hasCaps('spectralHandPenaltyMaximum','handMinimum','actualResourceChange'),path,'unsafe whole-deck/resource trade');
    if(op.kind==='exchange-hand-levels')check(costKind('gold')&&op.targetMaximumBefore+op.gain===bounds.handLevelMaximum&&op.donorMinimumBefore-op.loss===1&&hasCaps('handLevelMaximum'),path,'unsafe level exchange');
    if(op.kind==='rare-joker-reward')check(shopOnly()&&costKind('all-gold')&&hasCaps('jokerMaximum')&&tool.reject.includes('joker-slots-full')&&tool.reject.includes('empty-reward-pool'),path,'unsafe rare reward');
    if(op.kind==='set-joker-edition')check(shopOnly()&&costKind('sacrifice-joker')&&hasCaps('postConsumptionCapacity'),path,'unsafe joker sacrifice');
    if(op.kind==='clear-deck-specials')check(shopOnly()&&tool.costs.length===0&&hasCaps('oncePerRun','handMaximum','actualResourceChange'),path,'unsafe purification resource gain');
    if(tool.id==='T16')check(tool.shopWeight===0&&op.kind==='add-gold'&&tool.requiredFeatures.includes('first-boss-supply'),path,'T16 must be gated reward-only');
    if(tool.id==='T17')check(same(tool.phases,['await-input'])&&op.kind==='restore-discard'&&hasCaps('stageDiscardMaximum'),path,'invalid discard restoration phase/cap');
    if(tool.id==='T18')check(shopOnly()&&op.kind==='free-reroll'&&tool.reject.includes('empty-refresh-pool'),path,'invalid free reroll contract');
  }
  if(checkRows(input.enhancements,enhancementIds,'enhancements'))for(const row of input.enhancements){
    const path=`enhancements/${String(row.id)}`;
    check(shape(row,['id','name','assetId','replacement','activeOnly','repeat','effects'])&&textValue(row.name)&&row.replacement==='one-enhancement'&&row.activeOnly===true,path,'invalid enhancement fields');checkAsset(row.assetId,path);
    check(['each-scoring-pass','held-once','winning-held-once'].includes(row.repeat as string),path,'invalid repeat semantics');
    check(Array.isArray(row.effects)&&row.effects.length>0&&row.effects.length<=2&&row.effects.every(validEnhancementEffect),path,'invalid effects/probability');
    if(!Array.isArray(row.effects)||!row.effects.length||!row.effects.every(validEnhancementEffect))continue;
    const effects=row.effects as R2EnhancementEffect[];
    const expectedKinds:Record<R2ToolEnhancement,string[]>={'heat-paper':['add-heat'],'multiplier-paper':['add-multiplier'],'glass-paper':['multiply-multiplier','chance-destroy'],'voice-paper':['add-multiplier'],'gold-paper':['add-gold'],'encore-paper':['retrigger-card'],'lucky-paper':['chance-add-multiplier','chance-add-gold']};
    check(same(effects.map(effect=>effect.kind),expectedKinds[row.id as R2ToolEnhancement]??[]),path,'wrong enhancement behavior');
    if(row.id==='voice-paper')check(row.repeat==='held-once'&&effects[0].phase==='onHeldCard',path,'invalid held enhancement');
    else if(row.id==='gold-paper')check(row.repeat==='winning-held-once'&&effects[0].phase==='onStageClear',path,'invalid gold-paper snapshot');
    else check(row.repeat==='each-scoring-pass'&&effects[0].phase==='onCardScore',path,'invalid scoring enhancement');
    const gold=effects.find(effect=>effect.kind==='chance-add-gold');
    if(gold?.kind==='chance-add-gold')check(gold.capPerHand===bounds.luckyGoldPerHand,path,'lucky cap drift');
  }
  if(checkRows(input.editions,editionIds,'editions'))for(const row of input.editions){
    const path=`editions/${String(row.id)}`;
    check(shape(row,['id','name','assetId','shopWeight','priceDelta','appliesTo','cardTiming','jokerTiming','jokerRequiresOwnHookHit','disabledStopsScore','rarityIndependent','repeat','effect'])&&textValue(row.name)&&integer(row.shopWeight,1,1000)&&integer(row.priceDelta,0,100),path,'invalid edition fields/price');checkAsset(row.assetId,path);
    check(Array.isArray(row.appliesTo)&&same(row.appliesTo,['card','joker'])&&row.cardTiming==='after-enhancement-before-joker-hooks'&&row.jokerTiming==='after-own-jokerScore'&&row.jokerRequiresOwnHookHit===false&&row.disabledStopsScore===true&&row.rarityIndependent===true&&row.repeat==='each-scoring-pass',path,'invalid edition matrix/order');
    if(row.id==='none')check(row.effect===null&&row.priceDelta===0,path,'ordinary edition must have no effect/surcharge');
    else {
      const kind=row.id==='foil'?'add-heat':row.id==='holographic'?'add-multiplier':'multiply-multiplier';
      check(object(row.effect)&&shape(row.effect,['kind','value'])&&row.effect.kind===kind&&fraction(row.effect.value),path,'invalid battle edition effect');
    }
  }
  const itemKinds=['hand-limit','discard-limit','hands-limit','interest-cap','joker-offer-count','paid-reroll-discount','consumable-slots','deletion-floor','boss-most-used-hand-upgrade','first-purchase-discount','item-offer-count','first-normal-clear-per-chapter'];
  const readKeys=['stage-entry','reward-before','shop-open','reroll-before','purchase-before','capacity-change','delete-before','boss-clear','normal-clear'];
  if(checkRows(input.longTermItems,expectedIds('U',12),'longTermItems'))for(const row of input.longTermItems){
    const path=`longTermItems/${String(row.id)}`;
    check(shape(row,['id','name','price','shopWeight','operation','readAt','caps','duplicate','sellable','lifetime','requiredFeatures','assetId'])&&textValue(row.name)&&integer(row.price,1,100)&&integer(row.shopWeight,1,1000),path,'invalid item fields/price');checkAsset(row.assetId,path);
    check(row.duplicate===false&&row.sellable===false&&row.lifetime==='run'&&Array.isArray(row.requiredFeatures)&&same(row.requiredFeatures,['long-term-items']),path,'invalid item lifetime/features');
    check(list(row.readAt,readKeys)&&list(row.caps,capKeys)&&row.caps.includes('longTermSlots'),path,'invalid item read/cap contract');
    check(validLongTermOperation(row.operation),path,'invalid item operation');
    if(validLongTermOperation(row.operation)){
      check(row.operation.kind===itemKinds[Number((row.id as string).slice(1))-1],path,'wrong long-term identity');
      if(row.operation.kind==='deletion-floor')check(row.operation.floor===bounds.minimalDeckFloor,path,'deletion floor drift');
      if(row.operation.kind==='joker-offer-count')check(row.operation.base+row.operation.amount<=4,path,'joker shelf exceeds supported four offers');
      if(row.operation.kind==='item-offer-count')check(row.operation.base+row.operation.amount<=2,path,'long-term shelf exceeds supported two offers');
    }
  }
  return errors;
}

function freeze<T>(value:T):T {
  if(value&&typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))freeze(child);}
  return value;
}
const errors=validateR2Tools(data);
if(errors.length)throw Error(`invalid-r2-tools: ${errors.join('; ')}`);
export const R2_TOOL_CATALOG=freeze(data as unknown as R2ToolCatalog);
export const R2_TOOLS=R2_TOOL_CATALOG.tools;
export const R2_ENHANCEMENTS=R2_TOOL_CATALOG.enhancements;
export const R2_EDITIONS=R2_TOOL_CATALOG.editions;
export const R2_LONG_TERM_ITEMS=R2_TOOL_CATALOG.longTermItems;
export const R2_INITIAL_SUPPORTED_TOOL_IDS=R2_TOOL_CATALOG.initialSupportedToolIds;
export function getR2Tool(id:string):R2ToolDefinition {
  const tool=R2_TOOLS.find(row=>row.id===id);if(!tool)throw Error(`unknown-r2-tool: ${id}`);return tool;
}
export function supportsR2Tool(tool:R2ToolDefinition,features:readonly R2ToolFeature[]=R2_TOOL_CATALOG.initialSupportedFeatures):boolean {
  if(features===R2_TOOL_CATALOG.initialSupportedFeatures&&!R2_INITIAL_SUPPORTED_TOOL_IDS.includes(tool.id))return false;
  return [...actualFeatures(tool),...tool.requiredFeatures].every(feature=>features.includes(feature));
}
