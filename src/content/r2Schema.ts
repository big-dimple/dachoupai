import data from './r2-jokers.json';
import { R2_HAND_TYPES, type R2HandType } from '../domain/evaluateR2';
import { Rational, type Fraction } from '../domain/rational';
import {SUITS,type Suit} from '../cards/types';

export type ScorePhase = 'base' | 'onCardScore' | 'onHeldCard' | 'characterScore' | 'jokerScore' | 'finalScore' | 'afterHand' | 'beforeFailure' | 'onStageClear';
export type ScoreHookPhase = 'onCardScore' | 'onHeldCard' | 'jokerScore' | 'afterHand';
export type TransactionHookPhase = 'onDiscard' | 'onStageClear' | 'onBuyOffer' | 'onSellJoker' | 'beforeFailure';
export type HookPhase = ScoreHookPhase | TransactionHookPhase;
export type Condition =
  | { kind: 'always' }
  | { kind: 'hand-type-in'; values: readonly R2HandType[] }
  | { kind: 'rank-in'; values: readonly number[] }
  | { kind: 'played-count'; equals: number }
  | { kind: 'held-count'; minimum: number }
  | { kind: 'play-modulo'; divisor: number; remainder: number }
  | { kind: 'suit-in'; values: readonly Suit[] }
  | { kind: 'paired-rank'; minimum: number }
  | { kind: 'rank-groups'; minimum: number; groupSize: number }
  | { kind: 'held-rank-first'; values: readonly number[]; limit: number }
  | { kind: 'resource'; resource:'gold'|'hands-after'|'play-index'|'discards-used'; equals:number }
  | { kind: 'resource-minimum'; resource:'gold'; minimum:number }
  | { kind: 'resource-maximum'; resource:'gold'; maximum:number }
  | { kind: 'all-played-active'; minimum:number }
  | { kind: 'scoring-position'; position:'first'|'last'; handTypes?:readonly R2HandType[]; playModulo?:{divisor:number;remainder:number} }
  | { kind: 'discard-count'; equals:number }
  | { kind: 'discard-same-suit'; minimum:number }
  | { kind: 'exhausted-hands' };
export type Operation =
  | { kind: 'add-heat' | 'add-multiplier' | 'multiply-multiplier'; value: Fraction }
  | { kind: 'read-growth' | 'consume-growth'; key: string; target: 'heat' | 'multiplier' }
  | { kind: 'add-growth'; key: string; value: Fraction; cap: Fraction }
  | { kind: 'update-score-growth'; key:string; value:Fraction; cap:Fraction }
  | { kind: 'expire-after-hands'; limit:number }
  | { kind: 'retrigger-card'; count: number }
  | { kind: 'add-heat-per-gold' | 'add-heat-per-empty-slot'; value:Fraction; cap:Fraction }
  | { kind: 'add-gold' | 'refund-discard'; amount:number }
  | { kind: 'add-gold-limited'; amount:number; limit:number }
  | { kind: 'rescue-hand'; amount:1 };
export type R2JokerModifier =
  | { kind:'hand-limit'; amount:number; deckMaximum?:number }
  | { kind:'four-straight' }
  | { kind:'first-purchase-discount'; amount:number; minimum:number }
  | { kind:'interest-cap'; amount:number };
export const R2_IMPLEMENTED_FEATURES = Object.freeze(['score-hooks','static-modifiers','retrigger','discard-hooks',
  'trade-hooks','stage-clear-hooks','score-growth','hand-lifetime','before-failure'] as const);
export type R2Feature = typeof R2_IMPLEMENTED_FEATURES[number];
export interface R2JokerDefinition {
  id: string; name: string; rarity: 'common' | 'uncommon' | 'rare'; description: string;
  hooks: { phase: HookPhase; condition: Condition; operations: readonly Operation[] }[];
  modifiers?:readonly R2JokerModifier[];
  requiredFeatures?:readonly R2Feature[];
}
export interface R2JokerCounters { singleDiscards?:number; handsScored?:number }
export interface R2JokerInstance {
  instanceId: string; definitionId: string; paidPrice: number; growth: Record<string, Fraction>;
  counters?:R2JokerCounters;
}

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every(k => keys.includes(k));
const integer = (value: unknown, min: number, max: number) => Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max;
const fraction = (value: unknown, positive = false): boolean => {
  try {
    if (!object(value) || !exact(value, ['n', 'd'])) return false;
    const parsed = Rational.fromJSON(value);
    return positive ? parsed.n > 0n : parsed.n >= 0n;
  } catch { return false; }
};
const key = (value: unknown) => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);
const growthKey = (value: unknown) => typeof value === 'string' && /^[a-z][a-zA-Z0-9-]{0,63}$/.test(value);
const handTypes = (value:unknown):value is R2HandType[] => Array.isArray(value)&&value.length>0&&value.length<=R2_HAND_TYPES.length&&value.every(v=>R2_HAND_TYPES.includes(v));
const modulo = (value:unknown):boolean => object(value)&&exact(value,['divisor','remainder'])&&integer(value.divisor,1,100)&&integer(value.remainder,0,(value.divisor as number)-1);

/** Fixed C00 lifecycle fields, shared by resolver, run invariants and persistence. */
export function validR2JokerCounters(definitionId:string,counters:unknown):counters is R2JokerCounters|undefined {
  if(counters===undefined)return true;
  if(!object(counters))return false;
  if(definitionId==='a07')return exact(counters,['singleDiscards'])&&(counters.singleDiscards===undefined||integer(counters.singleDiscards,0,2));
  if(definitionId==='f06')return exact(counters,['handsScored'])&&(counters.handsScored===undefined||integer(counters.handsScored,0,3));
  return Object.keys(counters).length===0;
}

export function r2GrowthCaps(definition:R2JokerDefinition):Record<string,Fraction> {
  const caps:Record<string,Fraction>={};
  for(const hook of definition.hooks)for(const op of hook.operations)
    if(op.kind==='add-growth'||op.kind==='update-score-growth')caps[op.key]=op.cap;
  return caps;
}

function actualFeatures(definition:R2JokerDefinition):Set<R2Feature> {
  const features=new Set<R2Feature>();
  if(definition.modifiers?.length)features.add('static-modifiers');
  for(const hook of definition.hooks) {
    if(hook.phase==='onDiscard')features.add('discard-hooks');
    else if(hook.phase==='onStageClear')features.add('stage-clear-hooks');
    else if(hook.phase==='onBuyOffer'||hook.phase==='onSellJoker')features.add('trade-hooks');
    else if(hook.phase==='beforeFailure')features.add('before-failure');
    else features.add('score-hooks');
    for(const op of hook.operations) {
      if(op.kind==='retrigger-card')features.add('retrigger');
      if(op.kind==='update-score-growth')features.add('score-growth');
      if(op.kind==='expire-after-hands')features.add('hand-lifetime');
    }
  }
  return features;
}

/** Capabilities are checked against executable operations as well as the declared manifest. */
export function supportsR2Joker(definition:R2JokerDefinition,supported:readonly R2Feature[]=R2_IMPLEMENTED_FEATURES):boolean {
  return [...actualFeatures(definition),...(definition.requiredFeatures??[])].every(feature=>supported.includes(feature));
}

export interface R2Modifiers {handLimitBonus:number;fourStraight:boolean;firstPurchaseDiscount:number;interestCapBonus:number}
export function readR2Modifiers(jokers:readonly R2JokerInstance[],definitions:readonly R2JokerDefinition[],context:{deckSize?:number}={}):R2Modifiers {
  if(context.deckSize!==undefined&&(!Number.isSafeInteger(context.deckSize)||context.deckSize<0))throw Error('invalid-modifier-context');
  const result:R2Modifiers={handLimitBonus:0,fourStraight:false,firstPurchaseDiscount:0,interestCapBonus:0};
  for(const joker of jokers) {
    const definition=definitions.find(d=>d.id===joker.definitionId);
    if(!definition)throw Error('invalid-modifier-joker');
    for(const modifier of definition.modifiers??[])switch(modifier.kind) {
      case 'hand-limit':if(modifier.deckMaximum===undefined||context.deckSize!==undefined&&context.deckSize<=modifier.deckMaximum)result.handLimitBonus+=modifier.amount;break;
      case 'four-straight':result.fourStraight=true;break;
      case 'first-purchase-discount':result.firstPurchaseDiscount+=modifier.amount;break;
      case 'interest-cap':result.interestCapBonus+=modifier.amount;break;
    }
  }
  return result;
}

function validModifier(modifier:unknown):modifier is R2JokerModifier {
  if(!object(modifier))return false;
  switch(modifier.kind) {
    case 'hand-limit':return exact(modifier,['kind','amount','deckMaximum'])&&integer(modifier.amount,1,6)&&(modifier.deckMaximum===undefined||integer(modifier.deckMaximum,1,200));
    case 'four-straight':return exact(modifier,['kind']);
    case 'first-purchase-discount':return exact(modifier,['kind','amount','minimum'])&&integer(modifier.amount,1,10)&&modifier.minimum===1;
    case 'interest-cap':return exact(modifier,['kind','amount'])&&integer(modifier.amount,1,10);
  }
  return false;
}

/** One predicate contract for executable content and saved, player-visible score explanations. */
export function validR2Condition(c:unknown,phase?:HookPhase):c is Condition {
  if(!object(c))return false;let valid=false;const at=(...phases:HookPhase[])=>!phase||phases.includes(phase);
  switch(c.kind){
    case 'always':valid=exact(c,['kind']);break;
    case 'hand-type-in':valid=exact(c,['kind','values'])&&handTypes(c.values);break;
    case 'rank-in':valid=exact(c,['kind','values'])&&at('onCardScore','onHeldCard')&&Array.isArray(c.values)&&c.values.length>0&&c.values.length<=13&&c.values.every(v=>integer(v,2,14));break;
    case 'played-count':valid=exact(c,['kind','equals'])&&integer(c.equals,1,5);break;
    case 'held-count':valid=exact(c,['kind','minimum'])&&integer(c.minimum,0,14);break;
    case 'play-modulo':valid=exact(c,['kind','divisor','remainder'])&&integer(c.divisor,1,100)&&integer(c.remainder,0,(c.divisor as number)-1);break;
    case 'suit-in':valid=at('onCardScore')&&exact(c,['kind','values'])&&Array.isArray(c.values)&&c.values.length>0&&c.values.length<=SUITS.length&&c.values.every(v=>SUITS.includes(v));break;
    case 'paired-rank':valid=at('onCardScore')&&exact(c,['kind','minimum'])&&integer(c.minimum,2,5);break;
    case 'rank-groups':valid=at('jokerScore')&&exact(c,['kind','minimum','groupSize'])&&integer(c.minimum,1,2)&&integer(c.groupSize,2,5);break;
    case 'held-rank-first':valid=at('onHeldCard')&&exact(c,['kind','values','limit'])&&Array.isArray(c.values)&&c.values.length>0&&c.values.length<=13&&c.values.every(v=>integer(v,2,14))&&integer(c.limit,1,14);break;
    case 'resource':valid=exact(c,['kind','resource','equals'])&&['gold','hands-after','play-index','discards-used'].includes(c.resource as string)&&integer(c.equals,0,100);break;
    case 'resource-minimum':valid=exact(c,['kind','resource','minimum'])&&c.resource==='gold'&&integer(c.minimum,0,100);break;
    case 'resource-maximum':valid=at('jokerScore')&&exact(c,['kind','resource','maximum'])&&c.resource==='gold'&&integer(c.maximum,0,100);break;
    case 'all-played-active':valid=at('jokerScore')&&exact(c,['kind','minimum'])&&integer(c.minimum,1,5);break;
    case 'scoring-position':valid=at('onCardScore')&&exact(c,['kind','position','handTypes','playModulo'])&&['first','last'].includes(c.position as string)&&(c.handTypes===undefined||handTypes(c.handTypes))&&(c.playModulo===undefined||modulo(c.playModulo));break;
    case 'discard-count':valid=at('onDiscard')&&exact(c,['kind','equals'])&&integer(c.equals,1,5);break;
    case 'discard-same-suit':valid=at('onDiscard')&&exact(c,['kind','minimum'])&&integer(c.minimum,2,5);break;
    case 'exhausted-hands':valid=at('beforeFailure')&&exact(c,['kind']);break;
  }
  if(phase==='onDiscard'&&!(c.kind==='always'||c.kind==='discard-count'||c.kind==='discard-same-suit'||c.kind==='resource'&&c.resource==='discards-used'&&integer(c.equals,1,6)))return false;
  if(phase==='onStageClear'&&!(c.kind==='always'||c.kind==='hand-type-in'||c.kind==='resource'&&c.resource==='hands-after'))return false;
  if((phase==='onBuyOffer'||phase==='onSellJoker')&&c.kind!=='always')return false;
  if(phase==='beforeFailure'&&c.kind!=='exhausted-hands')return false;
  return valid;
}

export function validateR2Content(input: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(input) || input.length > 72) return ['content: expected up to 72 definitions'];
  const ids = new Set<string>();
  for (const [index, definition] of input.entries()) {
    const path = `content[${index}]`;
    const errorsBeforeDefinition=errors.length;
    if (!object(definition) || !exact(definition, ['id', 'name', 'rarity', 'description', 'hooks','modifiers','requiredFeatures']) || !key(definition.id) || ids.has(definition.id as string) || typeof definition.name !== 'string' || !definition.name || typeof definition.description !== 'string' || !definition.description || !['common', 'uncommon', 'rare'].includes(definition.rarity as string)) { errors.push(`${path}: invalid identity/rarity/fields`); continue; }
    ids.add(definition.id as string);
    if(definition.modifiers!==undefined&&(!Array.isArray(definition.modifiers)||!definition.modifiers.length||definition.modifiers.length>4||!definition.modifiers.every(validModifier)))errors.push(`${path}: invalid modifiers`);
    if(definition.requiredFeatures!==undefined&&(!Array.isArray(definition.requiredFeatures)||!definition.requiredFeatures.length||definition.requiredFeatures.length>R2_IMPLEMENTED_FEATURES.length||new Set(definition.requiredFeatures).size!==definition.requiredFeatures.length||!definition.requiredFeatures.every(f=>R2_IMPLEMENTED_FEATURES.includes(f))))errors.push(`${path}: invalid required features`);
    if (!Array.isArray(definition.hooks) || definition.hooks.length > 8 || !definition.hooks.length&&!(Array.isArray(definition.modifiers)&&definition.modifiers.length)) { errors.push(`${path}: invalid hooks`); continue; }
    for (const [h, hook] of definition.hooks.entries()) {
      const at = `${path}.hooks[${h}]`;
      if (!object(hook) || !exact(hook, ['phase', 'condition', 'operations']) || !['onCardScore', 'onHeldCard', 'jokerScore', 'afterHand','onDiscard','onStageClear','onBuyOffer','onSellJoker','beforeFailure'].includes(hook.phase as string)) { errors.push(`${at}: unknown phase/fields`); continue; }
      if (!validR2Condition(hook.condition,hook.phase as HookPhase)) errors.push(`${at}: unknown/invalid condition`);
      if (!Array.isArray(hook.operations) || !hook.operations.length || hook.operations.length > 8) { errors.push(`${at}: invalid operations`); continue; }
      for (const [o, op] of hook.operations.entries()) {
        let accepted = false;
        if (object(op)) switch (op.kind) {
          case 'add-heat': case 'add-multiplier': case 'multiply-multiplier': accepted = ['onCardScore','onHeldCard','jokerScore'].includes(hook.phase as string) && exact(op, ['kind', 'value']) && fraction(op.value, op.kind === 'multiply-multiplier'); break;
          case 'read-growth': case 'consume-growth': accepted = hook.phase === 'jokerScore' && exact(op, ['kind', 'key', 'target']) && growthKey(op.key) && ['heat', 'multiplier'].includes(op.target as string); break;
          case 'add-growth': accepted = ['afterHand','onBuyOffer','onSellJoker','onDiscard'].includes(hook.phase as string) && exact(op, ['kind', 'key', 'value', 'cap']) && growthKey(op.key) && fraction(op.value, true) && fraction(op.cap, true); break;
          case 'update-score-growth': accepted=hook.phase==='afterHand'&&exact(op,['kind','key','value','cap'])&&growthKey(op.key)&&fraction(op.value,true)&&fraction(op.cap,true);break;
          case 'expire-after-hands':accepted=definition.id==='f06'&&hook.phase==='afterHand'&&exact(op,['kind','limit'])&&op.limit===4;break;
          case 'retrigger-card': accepted = hook.phase === 'onCardScore' && exact(op, ['kind', 'count']) && integer(op.count, 1, 4); break;
          case 'add-heat-per-gold': case 'add-heat-per-empty-slot': accepted=hook.phase==='jokerScore'&&exact(op,['kind','value','cap'])&&fraction(op.value,true)&&fraction(op.cap,true);break;
          case 'add-gold': accepted=hook.phase==='onStageClear'&&exact(op,['kind','amount'])&&integer(op.amount,1,10);break;
          case 'add-gold-limited':accepted=definition.id==='a07'&&hook.phase==='onDiscard'&&exact(op,['kind','amount','limit'])&&op.amount===1&&op.limit===2;break;
          case 'refund-discard': accepted=hook.phase==='onDiscard'&&exact(op,['kind','amount'])&&integer(op.amount,1,1);break;
          case 'rescue-hand':accepted=definition.id==='f07'&&hook.phase==='beforeFailure'&&exact(op,['kind','amount'])&&op.amount===1;break;
        }
        if (!accepted) errors.push(`${at}.operations[${o}]: unknown/invalid operation or timing`);
      }
    }
    // A reference to growth must have a finite, declared writer on the same definition.
    const hooks = definition.hooks as R2JokerDefinition['hooks'];
    const writers = hooks.flatMap(h => Array.isArray(h?.operations) ? h.operations.filter((o):o is Extract<Operation,{kind:'add-growth'|'update-score-growth'}>=>o?.kind==='add-growth'||o?.kind==='update-score-growth') : []);
    if (hooks.some(h => Array.isArray(h?.operations) && h.operations.some(o => (o?.kind === 'read-growth'||o?.kind==='consume-growth') && !writers.some(w=>w.key===o.key)))) errors.push(`${path}: missing growth writer`);
    for(const writer of writers)if(fraction(writer.cap,true)&&writers.some(other=>other.key===writer.key&&fraction(other.cap,true)&&Rational.fromJSON(other.cap).compare(Rational.fromJSON(writer.cap))!==0))errors.push(`${path}: conflicting growth caps`);
    if(Array.isArray(definition.requiredFeatures)&&errors.length===errorsBeforeDefinition) {
      const features=actualFeatures(definition as unknown as R2JokerDefinition);
      const declared=definition.requiredFeatures;
      if([...features].some(f=>!declared.includes(f)))errors.push(`${path}: incomplete feature declaration`);
    }
  }
  return errors;
}

const errors = validateR2Content(data);
if (errors.length) throw new Error(errors.join('\n'));
export const R2_JOKERS = data as R2JokerDefinition[];
