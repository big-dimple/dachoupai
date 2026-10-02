import { EDITIONS, type Edition, type PlayingCard } from '../cards/types';
import { SeededRng, type RngSnapshot } from '../core/SeededRng';
import { readR2Modifiers, r2GrowthCaps, r2GrowthInitials, r2GrowthMinimums, validR2JokerCounters, validateR2Content, type Condition, type ScoreHookPhase, type R2JokerDefinition, type R2JokerInstance, type ScorePhase } from '../content/r2Schema';
import { R2_EDITIONS, R2_ENHANCEMENTS, R2_TOOL_CATALOG } from '../content/r2Tools';
import { CHARACTER_IDS, type CharacterId } from './characters';
import { evaluateR2Hand, R2_HAND_TYPES, validateCardInstances, type HandRules, type R2HandType } from './evaluateR2';
import { MAX_INTEGER_DIGITS, Rational, type Fraction } from './rational';
import {r2BossPlanValid,type R2BossPlan} from './r2Chapter';

export const SCORE_LIMITS = { eventCount: 512, extraRetriggers: 4, retriggerDepth: 1, handLevel: 30,
  handCount: R2_TOOL_CATALOG.limits.handMaximum, jokerCount: R2_TOOL_CATALOG.limits.jokerMaximum } as const;
export const SCORE_OPERATIONS = Object.freeze([
  'base', 'add-heat', 'add-multiplier', 'multiply-multiplier', 'read-growth', 'consume-growth',
  'add-growth', 'reset-growth', 'score-growth-baseline', 'increment-hands-scored', 'destroy-joker',
  'rescue-hand', 'add-gold', 'retrigger-card', 'retrigger-cap', 'final-score', 'add-heat-per-gold',
  'add-heat-per-empty-slot', 'ordinary-points-suppressed', 'lucky-multiplier-check', 'lucky-gold-check',
  'lucky-gold-cap', 'glass-check', 'destroy-card', 'upgrade-hand', 'reward-consumable',
  'chance-heat-check', 'read-coefficient', 'add-coefficient', 'reset-coefficient', 'refund-hand', 'increment-clear-cycle',
  'halve-base-heat', 'seal-joker',
] as const);
export type ScoreOperation = typeof SCORE_OPERATIONS[number];
export const R2_BASE_SCORES: Record<R2HandType, readonly [number, Fraction, number, Fraction]> = {
  'high-card': [20, {n:'1',d:'1'}, 10, {n:'1',d:'4'}], pair: [35, {n:'2',d:'1'}, 15, {n:'1',d:'2'}],
  'two-pair': [65, {n:'2',d:'1'}, 20, {n:'1',d:'2'}], 'three-kind': [90, {n:'3',d:'1'}, 25, {n:'1',d:'2'}],
  straight: [125, {n:'4',d:'1'}, 35, {n:'1',d:'2'}], flush: [140, {n:'4',d:'1'}, 30, {n:'1',d:'2'}],
  'full-house': [210, {n:'5',d:'1'}, 40, {n:'1',d:'1'}], 'four-kind': [320, {n:'7',d:'1'}, 55, {n:'1',d:'1'}],
  'straight-flush': [450, {n:'9',d:'1'}, 65, {n:'1',d:'1'}], 'five-kind': [700, {n:'10',d:'1'}, 70, {n:'1',d:'1'}],
  'flush-house': [850, {n:'12',d:'1'}, 80, {n:'1',d:'1'}], 'flush-five': [1200, {n:'15',d:'1'}, 100, {n:'1',d:'1'}],
};
export interface ScoreInput {
  rulesVersion: 'r2'; runId: string; rootId: string; characterId: CharacterId | 'neutral';
  hand: readonly PlayingCard[]; selectedIds: readonly string[]; disabledIds: readonly string[];
  jokers: readonly R2JokerInstance[]; definitions: readonly R2JokerDefinition[];
  handLevels: Partial<Record<R2HandType, number>>; handRules?: HandRules;
  playIndex: number; handsBeforePlay: number; previousHandType: R2HandType | null; wager: boolean; rng: RngSnapshot;
  gold?:number; discardsUsed?:number; ordinaryPointsSuppressedIds?:readonly string[];
  previousHandScore?:string|null;
  stageHeatBefore?:string; stageTargetHeat?:string;
  boss?:R2BossPlan|null; sealedJokerIds?:readonly string[];
}
export interface Accumulator { H: Fraction; M: Fraction }
export interface ScoreEvent {
  eventId: string; rootId: string; rootEventId: string; phase: ScorePhase;
  sourceType: 'rule' | 'card' | 'character' | 'joker'; sourceDefinitionId: string; sourceInstanceId: string;
  targetCardId?: string; targetJokerInstanceId?:string; operation: string; value: Fraction; before: Accumulator; after: Accumulator;
  reasonKey: string; visibleCondition: Condition; retriggerDepth: number;
  resourceBefore?:number; resourceAfter?:number;
  targetHandType?:R2HandType;
  growthBefore?:Fraction; growthAfter?:Fraction; rewardDefinitionId?:string;
}
export interface ScoreTrace {
  rulesVersion: 'r2'; rootId: string; handType: R2HandType; level: number;
  sets: { playedIds: string[]; scoringIds: string[]; activeScoringIds: string[]; heldIds: string[] };
  finalScore: string; accumulator: Accumulator; events: ScoreEvent[]; jokers: R2JokerInstance[]; rng: RngSnapshot;
  goldDelta:number; destroyedCardIds:string[]; destroyedJokerIds:string[];
  cards:PlayingCard[]; sourceJokers:R2JokerInstance[];
  bossContext:{boss:R2BossPlan|null;previousHandType:R2HandType|null;sealedJokerIds:string[]};
}
export class ScoreFault extends Error {
  constructor(readonly code: string, readonly events: readonly ScoreEvent[]) { super(code); }
}
function immutable<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) immutable(child);
  }
  return value;
}

/** Only scoring hooks are stopped; the complete inventory remains authoritative. */
export function r2ScoringDisabledJokerIds(boss:R2BossPlan|null|undefined,jokers:readonly R2JokerInstance[],definitions:readonly R2JokerDefinition[],sealedIds:readonly string[]=[]):string[] {
  return jokers.filter((joker,index)=>{
    if(boss?.definitionId==='B06')return index===1||index===3;
    if(boss?.definitionId==='B15')return sealedIds.includes(joker.instanceId);
    if(boss?.definitionId==='B16')return definitions.find(definition=>definition.id===joker.definitionId)?.rarity==='rare';
    return false;
  }).map(joker=>joker.instanceId);
}

type PublicScoreInput = Omit<ScoreInput, 'rng'>;
type ResolvePolicy = {kind:'rule'; snapshot:RngSnapshot} | {kind:'preview'; bound:'minimum'|'maximum'};
type PreviewTrace = Omit<ScoreTrace, 'rng'>;

/** The rule cursor is cloned; preview branches have no RNG to inspect or consume. */
export function scoreR2Hand(input: ScoreInput): ScoreTrace {
  return resolveScore(input, {kind:'rule', snapshot:input.rng});
}

function resolveScore(input: PublicScoreInput, policy: Extract<ResolvePolicy, {kind:'rule'}>): ScoreTrace;
function resolveScore(input: PublicScoreInput, policy: Extract<ResolvePolicy, {kind:'preview'}>): PreviewTrace;
function resolveScore(input: PublicScoreInput, policy: ResolvePolicy): ScoreTrace | PreviewTrace {
  if (input.rulesVersion !== 'r2' || !input.runId || !input.rootId || ![...CHARACTER_IDS, 'neutral'].includes(input.characterId)) throw new Error('invalid-score-version-or-character');
  if (!Array.isArray(input.hand)) throw new Error('invalid-hand');
  if (input.hand.length > SCORE_LIMITS.handCount) throw new ScoreFault('hand-limit', Object.freeze([]));
  validateCardInstances(input.hand);
  if (!Array.isArray(input.jokers) || !Array.isArray(input.selectedIds) || input.selectedIds.length < 1 || input.selectedIds.length > 5 || new Set(input.selectedIds).size !== input.selectedIds.length || input.selectedIds.some(id => !input.hand.some(c => c.id === id))) throw new Error('invalid-selection');
  if (input.disabledIds.some(id => !input.hand.some(c => c.id === id)) || new Set(input.disabledIds).size !== input.disabledIds.length) throw new Error('invalid-disabled-cards');
  if(![input.gold??0,input.discardsUsed??0].every(n=>Number.isSafeInteger(n)&&n>=0))throw new Error('invalid-score-resources');
  if(input.previousHandScore!==undefined&&input.previousHandScore!==null&&(typeof input.previousHandScore!=='string'||!/^(0|[1-9]\d*)$/.test(input.previousHandScore)||input.previousHandScore.length>MAX_INTEGER_DIGITS))throw new Error('invalid-previous-hand-score');
  const ordinarySuppressed=input.ordinaryPointsSuppressedIds??[];
  if(new Set(ordinarySuppressed).size!==ordinarySuppressed.length||ordinarySuppressed.some(id=>!input.selectedIds.includes(id)))throw new Error('invalid-ordinary-point-suppression');
  if (!Number.isSafeInteger(input.playIndex) || input.playIndex < 1 || !Number.isSafeInteger(input.handsBeforePlay) || input.handsBeforePlay < 1 || (input.previousHandType !== null && !R2_HAND_TYPES.includes(input.previousHandType)) || typeof input.wager !== 'boolean' || (input.wager && input.characterId !== 'touye')) throw new Error('invalid-score-context');
  const sealedIds=input.sealedJokerIds===undefined?[]:input.sealedJokerIds;
  // Only Shop creates Jokers; destroyed entry identities remain recorded for this stage.
  const rosterMaximum=SCORE_LIMITS.jokerCount;
  if((input.boss!==undefined&&input.boss!==null&&!r2BossPlanValid(input.boss))||!Array.isArray(sealedIds)||sealedIds.length>rosterMaximum
    ||sealedIds.some(id=>typeof id!=='string'||!id)||new Set(sealedIds).size!==sealedIds.length)throw new Error('invalid-score-boss-context');
  if(input.boss?.definitionId==='B08'&&input.wager)throw new Error('wager-disabled-by-boss');
  for (const [type, level] of Object.entries(input.handLevels)) if (!R2_HAND_TYPES.includes(type as R2HandType) || !Number.isInteger(level) || level! < 1 || level! > SCORE_LIMITS.handLevel) throw new Error('invalid-hand-level');
  const errors = validateR2Content(input.definitions);
  if (errors.length) throw new Error(`invalid-content: ${errors.join('; ')}`);
  const needsStageContext=input.jokers.some(joker=>input.definitions.find(definition=>definition.id===joker.definitionId)?.hooks
    .some(hook=>hook.condition.kind==='stage-score-below-target'||hook.condition.kind==='hand-score-below-target'));
  const hasStageContext=input.stageHeatBefore!==undefined||input.stageTargetHeat!==undefined;
  const stageInteger=(value:unknown):value is string=>typeof value==='string'&&/^(0|[1-9]\d*)$/.test(value)&&value.length<=MAX_INTEGER_DIGITS;
  if((hasStageContext||needsStageContext)&&(!stageInteger(input.stageHeatBefore)||!stageInteger(input.stageTargetHeat)||BigInt(input.stageTargetHeat)<=0n))
    throw new Error('invalid-stage-score-context');
  if (input.jokers.length > SCORE_LIMITS.jokerCount || new Set(input.jokers.map(j => j.instanceId)).size !== input.jokers.length) throw new Error('invalid-joker-instances');
  const jokers = structuredClone(input.jokers) as R2JokerInstance[];
  for (const joker of jokers) {
    if (!joker.instanceId || !Number.isSafeInteger(joker.paidPrice) || joker.paidPrice < 0 || !input.definitions.some(d => d.id === joker.definitionId)) throw new Error('invalid-joker-instance');
    if (joker.edition !== undefined && !EDITIONS.includes(joker.edition)) throw new Error('invalid-joker-edition');
    if(!validR2JokerCounters(joker.definitionId,joker.counters))throw new Error('invalid-joker-counter-state');
    const caps = r2GrowthCaps(input.definitions.find(d => d.id === joker.definitionId)!);
    const minimums = r2GrowthMinimums(input.definitions.find(d => d.id === joker.definitionId)!);
    const initials = r2GrowthInitials(input.definitions.find(d => d.id === joker.definitionId)!);
    if(Object.keys(initials).some(key=>!Object.hasOwn(joker.growth,key)))throw new Error('invalid-growth-state');
    for (const [key, value] of Object.entries(joker.growth)) {
      const growth = Rational.fromJSON(value);
      if (!caps[key] || growth.compare(Rational.fromJSON(minimums[key]??{n:'0',d:'1'}))<0 || growth.compare(Rational.fromJSON(caps[key])) > 0) throw new Error('invalid-growth-state');
    }
  }
  const cards = structuredClone(input.hand) as PlayingCard[];
  const sourceJokers = structuredClone(jokers);
  const bossContext=structuredClone({boss:input.boss??null,previousHandType:input.previousHandType,sealedJokerIds:[...sealedIds]});
  const scoringDisabledJokers=new Set(r2ScoringDisabledJokerIds(bossContext.boss,sourceJokers,input.definitions,bossContext.sealedJokerIds));
  const played = cards.filter(c => input.selectedIds.includes(c.id));
  const held = cards.filter(c => !input.selectedIds.includes(c.id));
  const validHeld = held.filter(c => !input.disabledIds.includes(c.id));
  const modifiers=readR2Modifiers(jokers,input.definitions);
  const evaluated = evaluateR2Hand(played, {...input.handRules,fourStraight:!!input.handRules?.fourStraight||modifiers.fourStraight,
    fourFlush:!!input.handRules?.fourFlush||modifiers.fourFlush});
  const active = played.filter(c => evaluated.scoringIds.includes(c.id) && !input.disabledIds.includes(c.id));
  const level = input.handLevels[evaluated.type] ?? 1;
  let H = new Rational(0n), M = new Rational(0n);
  const events: ScoreEvent[] = [];
  const destroyedJokerIds:string[]=[];
  const destroyedCardIds:string[]=[];
  let goldDelta = 0;
  let resolvedFinal:bigint|null=null;
  let extraExecutions=0;
  const rng = policy.kind === 'rule' ? SeededRng.restore(policy.snapshot) : undefined;
  const chance = (probability:{n:number;d:number}):boolean => rng
    ? rng.next() < probability.n / probability.d
    : policy.kind === 'preview' && policy.bound === 'maximum';
  const snapshot = (): Accumulator => ({ H: H.toJSON(), M: M.toJSON() });
  type Source = Pick<ScoreEvent, 'sourceType'|'sourceDefinitionId'|'sourceInstanceId'>;
  type EventDetails = {reasonKey?:string; resourceBefore?:number; resourceAfter?:number};
  const emit = (phase: ScorePhase, source: Source, operation: ScoreOperation, value: Rational, mutate: () => void, condition: Condition = {kind:'always'}, card?: PlayingCard, depth = 0, rootEventId?: string, details:EventDetails = {}) => {
    if (events.length >= SCORE_LIMITS.eventCount) throw new ScoreFault('event-limit', immutable(structuredClone(events)));
    const before = snapshot(); mutate();
    const eventId = `${input.rootId}/event/${events.length}`;
    events.push({ eventId, rootId: input.rootId, rootEventId: rootEventId ?? eventId, phase, ...source, ...(card ? {targetCardId:card.id} : {}), operation, value: value.toJSON(), before, after: snapshot(), reasonKey: details.reasonKey ?? `${source.sourceDefinitionId}.${operation}`, visibleCondition: structuredClone(condition), retriggerDepth: depth,
      ...(details.resourceBefore === undefined ? {} : {resourceBefore:details.resourceBefore,resourceAfter:details.resourceAfter}) });
  };
  const cardSource = (card:PlayingCard):Source => ({sourceType:'card',sourceDefinitionId:card.id,sourceInstanceId:card.id});
  type MathOperation = 'add-heat'|'add-multiplier'|'multiply-multiplier';
  const math = (kind:MathOperation, value:Rational) => {
    if (kind === 'add-heat') H = H.add(value);
    else if (kind === 'add-multiplier') M = M.add(value);
    else M = M.multiply(value);
  };
  const edition = (phase:'onCardScore'|'jokerScore', id:Edition|undefined, source:Source, card?:PlayingCard, depth=0, rootEventId?:string) => {
    const effect = R2_EDITIONS.find(entry => entry.id === (id ?? 'none'))!.effect;
    if (!effect) return;
    const value = Rational.fromJSON(effect.value);
    emit(phase, source, effect.kind, value, () => math(effect.kind, value), {kind:'always'}, card, depth, rootEventId,
      {reasonKey:`edition.${id}.${effect.kind}`});
  };
  const enhancement = (phase:'onCardScore'|'onHeldCard', card:PlayingCard, depth=0, rootEventId?:string):number => {
    const definition = R2_ENHANCEMENTS.find(entry => entry.id === card.enhancement);
    if (!definition) return 0;
    const source = cardSource(card);
    const reason = (operation:ScoreOperation) => ({reasonKey:`enhancement.${definition.id}.${operation}`});
    let retriggers = 0;
    for (const effect of definition.effects) {
      if (effect.phase !== phase) continue;
      if (effect.kind === 'add-heat' || effect.kind === 'add-multiplier' || effect.kind === 'multiply-multiplier') {
        const value = Rational.fromJSON(effect.value);
        emit(phase, source, effect.kind, value, () => math(effect.kind, value), {kind:'always'}, card, depth, rootEventId, reason(effect.kind));
      } else if (effect.kind === 'retrigger-card' && depth === 0) {
        emit(phase, source, 'retrigger-card', new Rational(BigInt(effect.count)), () => {retriggers += effect.count;}, {kind:'always'}, card, depth, rootEventId, reason('retrigger-card'));
      } else if (effect.kind === 'chance-add-multiplier') {
        const hit = chance(effect.probability);
        emit(phase, source, 'lucky-multiplier-check', new Rational(hit ? 1n : 0n), () => {}, {kind:'always'}, card, depth, rootEventId, reason('lucky-multiplier-check'));
        if (hit) {
          const value = Rational.fromJSON(effect.value);
          emit(phase, source, 'add-multiplier', value, () => {M = M.add(value);}, {kind:'always'}, card, depth, rootEventId, reason('add-multiplier'));
        }
      } else if (effect.kind === 'chance-add-gold') {
        // Coins cannot affect this hand's math. Public bounds do not simulate payouts.
        if (policy.kind === 'preview') continue;
        // This draw is mandatory even at cap. Jokers still read input.gold.
        const hit = chance(effect.probability), before = (input.gold ?? 0) + goldDelta;
        emit(phase, source, 'lucky-gold-check', new Rational(hit ? 1n : 0n), () => {}, {kind:'always'}, card, depth, rootEventId,
          {...reason('lucky-gold-check'),resourceBefore:before,resourceAfter:before});
        if (hit) {
          const amount = Math.min(effect.amount, effect.capPerHand - goldDelta);
          if (amount > 0) {
            if (!Number.isSafeInteger(before + amount)) throw new ScoreFault('resource-overflow', immutable(structuredClone(events)));
            emit(phase, source, 'add-gold', new Rational(BigInt(amount)), () => {goldDelta += amount;}, {kind:'always'}, card, depth, rootEventId,
              {...reason('add-gold'),resourceBefore:before,resourceAfter:before + amount});
          } else {
            emit(phase, source, 'lucky-gold-cap', new Rational(BigInt(effect.capPerHand)), () => {}, {kind:'always'}, card, depth, rootEventId,
              {...reason('lucky-gold-cap'),resourceBefore:before,resourceAfter:before});
          }
        }
      }
    }
    return retriggers;
  };
  const [heat, mult, heatStep, multStep] = R2_BASE_SCORES[evaluated.type];
  const baseH = new Rational(BigInt(heat + heatStep * (level - 1)));
  const baseM = Rational.fromJSON(mult).add(Rational.fromJSON(multStep).multiply(new Rational(BigInt(level - 1))));
  const rule: Source = {sourceType:'rule',sourceDefinitionId:evaluated.type,sourceInstanceId:input.runId};
  emit('base', rule, 'base', baseH, () => { H = baseH; M = baseM; });
  const boss=bossContext.boss;
  if(boss?.definitionId==='B12'||boss?.definitionId==='B05'&&input.previousHandType===evaluated.type){
    const half=new Rational(1n,2n);
    emit('base',{sourceType:'rule',sourceDefinitionId:boss.definitionId,sourceInstanceId:input.runId},'halve-base-heat',half,()=>{H=H.multiply(half);});
  }
  const matches = (c: Condition, card?: PlayingCard): boolean => {
    switch (c.kind) {
      case 'always': return true;
      case 'hand-type-in': return c.values.includes(evaluated.type);
      case 'rank-in': return !!card && c.values.includes(card.rank);
      case 'played-count': return played.length === c.equals;
      case 'played-count-maximum': return played.length <= c.maximum;
      case 'held-count': return held.length >= c.minimum;
      case 'play-modulo': return input.playIndex % c.divisor === c.remainder;
      case 'suit-in': return !!card&&c.values.includes(card.suit);
      case 'paired-rank': return !!card&&played.filter(p=>p.rank===card.rank).length>=c.minimum;
      case 'rank-groups': return [...new Set(played.map(p=>p.rank))].filter(rank=>played.filter(p=>p.rank===rank).length>=c.groupSize).length>=c.minimum;
      case 'held-rank-first': return (c.playedEquals===undefined||played.length===c.playedEquals)&&!!card&&validHeld.filter(p=>c.values.includes(p.rank)).slice(0,c.limit).some(p=>p.id===card.id);
      case 'held-scoring-rank-first': return !!card&&validHeld.filter(p=>active.some(scored=>scored.rank===p.rank)).slice(0,c.limit).some(p=>p.id===card.id);
      case 'held-enhancement-first': return !!card&&validHeld.filter(p=>p.enhancement===c.enhancement).slice(0,c.limit).some(p=>p.id===card.id);
      case 'hand-type-transition': return evaluated.type===c.current&&input.previousHandType===c.previous;
      case 'extra-retrigger': return extraExecutions>0;
      case 'stage-score-below-target': return new Rational(BigInt(input.stageHeatBefore!)).compare(new Rational(BigInt(input.stageTargetHeat!)).multiply(Rational.fromJSON(c.ratio)))<0;
      case 'hand-score-below-target': return resolvedFinal!==null&&BigInt(input.stageHeatBefore!)+resolvedFinal<BigInt(input.stageTargetHeat!)
        &&new Rational(resolvedFinal).compare(new Rational(BigInt(input.stageTargetHeat!)).multiply(Rational.fromJSON(c.ratio)))<0;
      case 'resource': return ({gold:input.gold??0,'hands-after':input.handsBeforePlay-1,'play-index':input.playIndex,'discards-used':input.discardsUsed??0})[c.resource]===c.equals;
      case 'resource-minimum': return (input.gold??0)>=c.minimum;
      case 'resource-maximum': return (input.gold??0)<=c.maximum;
      case 'all-played-active':return played.length>=c.minimum&&played.length===active.length;
      case 'scoring-position':return !!card&&card.id===(c.position==='third-original'?evaluated.scoringIds[2]:(c.position==='first'?active[0]:active.at(-1))?.id)&&(!c.handTypes||c.handTypes.includes(evaluated.type))&&(!c.playModulo||input.playIndex%c.playModulo.divisor===c.playModulo.remainder);
      case 'discard-count':case 'discard-same-suit':case 'exhausted-hands':return false;
      case 'stage-played-maximum':case 'stage-hand-types-all':case 'no-joker-sale-this-stage':case 'hand-type-unfinished':return false;
    }
  };
  const hook = (phase: ScoreHookPhase, card?: PlayingCard, depth = 0, rootEventId?: string, initialRetriggers = 0): number => {
    let retriggers = initialRetriggers;
    const ordered=phase==='jokerScore'&&boss?.definitionId==='B13'?[...jokers].reverse():jokers;
    for (const joker of ordered) {
      if((phase==='onCardScore'||phase==='onHeldCard'||phase==='jokerScore')&&scoringDisabledJokers.has(joker.instanceId))continue;
      const definition = input.definitions.find(d => d.id === joker.definitionId)!;
      const source: Source = {sourceType:'joker',sourceDefinitionId:definition.id,sourceInstanceId:joker.instanceId};
      for (const h of definition.hooks) if (h.phase === phase && matches(h.condition, card)) for (const op of h.operations) {
        if (op.kind === 'retrigger-card' && depth > 0) continue;
        if(op.kind==='chance-add-heat'){
          const hit=chance(op.probability);
          emit(phase,source,'chance-heat-check',new Rational(hit?1n:0n),()=>{},h.condition);
          if(hit){const value=Rational.fromJSON(op.value);emit(phase,source,'add-heat',value,()=>{H=H.add(value);},h.condition);}
        }else if(op.kind==='read-coefficient'){
          const value=Rational.fromJSON(joker.growth[op.key]);
          emit(phase,source,'read-coefficient',value,()=>{M=M.multiply(value);},h.condition);
        }else if (op.kind === 'read-growth'||op.kind==='consume-growth') {
          const value = Rational.fromJSON(joker.growth[op.key] ?? {n:'0',d:'1'});
          emit(phase, source, op.kind, value, () => {
            if (op.target === 'heat') H = H.add(value); else M = M.add(value);
            if(op.kind==='consume-growth')joker.growth[op.key]={n:'0',d:'1'};
          }, h.condition, card, depth, rootEventId);
        } else if (op.kind === 'add-growth') {
          const previous = Rational.fromJSON(joker.growth[op.key] ?? {n:'0',d:'1'});
          const grown = previous.add(Rational.fromJSON(op.value)), cap = Rational.fromJSON(op.cap);
          const next = grown.compare(cap) > 0 ? cap : grown;
          emit(phase, source, op.kind, next.add(previous.multiply(new Rational(-1n))), () => { joker.growth[op.key] = next.toJSON(); }, h.condition, card, depth, rootEventId);
        } else if(op.kind==='update-score-growth') {
          if(resolvedFinal===null)throw new Error('score-growth-before-final');
          const previous=Rational.fromJSON(joker.growth[op.key]??{n:'0',d:'1'});
          if(input.previousHandScore===undefined||input.previousHandScore===null) {
            emit(phase,source,'score-growth-baseline',new Rational(0n),()=>{},h.condition);
          } else if(resolvedFinal>BigInt(input.previousHandScore)) {
            const grown=previous.add(Rational.fromJSON(op.value)),cap=Rational.fromJSON(op.cap),next=grown.compare(cap)>0?cap:grown;
            emit(phase,source,'add-growth',next.add(previous.multiply(new Rational(-1n))),()=>{joker.growth[op.key]=next.toJSON();},h.condition);
          } else {
            emit(phase,source,'reset-growth',previous,()=>{joker.growth[op.key]={n:'0',d:'1'};},h.condition);
          }
        } else if(op.kind==='expire-after-hands') {
          const count=(joker.counters?.handsScored??0)+1;
          emit(phase,source,'increment-hands-scored',new Rational(BigInt(count)),()=>{joker.counters={...joker.counters,handsScored:count};},h.condition);
          if(count>=op.limit)emit(phase,source,'destroy-joker',new Rational(0n),()=>{destroyedJokerIds.push(joker.instanceId);},h.condition);
        } else if (op.kind === 'retrigger-card') {
          const available = Math.min(op.count, SCORE_LIMITS.extraRetriggers - retriggers);
          emit(phase, source, 'retrigger-card', new Rational(BigInt(available)), () => { retriggers += available; }, h.condition, card, depth, rootEventId);
          if (available < op.count) emit(phase, source, 'retrigger-cap', new Rational(BigInt(SCORE_LIMITS.extraRetriggers)), () => {}, h.condition, card, depth, rootEventId);
        } else if(op.kind==='add-heat-per-gold'||op.kind==='add-heat-per-empty-slot') {
          const amount=op.kind==='add-heat-per-gold'?(input.gold??0):Math.max(0,5-jokers.length);
          const raw=Rational.fromJSON(op.value).multiply(new Rational(BigInt(amount))),cap=Rational.fromJSON(op.cap),value=raw.compare(cap)>0?cap:raw;
          emit(phase,source,op.kind,value,()=>{H=H.add(value);},h.condition,card,depth,rootEventId);
        } else if(op.kind==='add-heat'||op.kind==='add-multiplier'||op.kind==='multiply-multiplier') {
          const value = Rational.fromJSON(op.value);
          emit(phase, source, op.kind, value, () => {
            if (op.kind === 'add-heat') H = H.add(value);
            else if (op.kind === 'add-multiplier') M = M.add(value);
            else M = M.multiply(value);
          }, h.condition, card, depth, rootEventId);
        }
      }
      if (phase === 'jokerScore') edition(phase, joker.edition, source);
    }
    return retriggers;
  };
  for (const card of active) {
    const source: Source = {sourceType:'card',sourceDefinitionId:`rank-${card.rank}`,sourceInstanceId:card.id};
    if(ordinarySuppressed.includes(card.id))emit('onCardScore',{sourceType:'rule',sourceDefinitionId:'B02',sourceInstanceId:input.runId},'ordinary-points-suppressed',new Rational(0n),()=>{},{kind:'always'},card);
    const points = new Rational(BigInt(ordinarySuppressed.includes(card.id)?0:card.rank === 14 ? 11 : Math.min(card.rank, 10)));
    const root = `${input.rootId}/event/${events.length}`;
    emit('onCardScore', source, 'add-heat', points, () => { H = H.add(points); }, {kind:'always'}, card);
    const intrinsic = enhancement('onCardScore', card, 0, root);
    edition('onCardScore', card.edition, cardSource(card), card, 0, root);
    const extra = hook('onCardScore', card, 0, root, intrinsic);
    for (let i = 0; i < extra; i++) {
      extraExecutions++;
      emit('onCardScore', source, 'add-heat', points, () => { H = H.add(points); }, {kind:'always'}, card, 1, root);
      enhancement('onCardScore', card, 1, root);
      edition('onCardScore', card.edition, cardSource(card), card, 1, root);
      hook('onCardScore', card, 1, root);
    }
  }
  for (const card of validHeld) {
    enhancement('onHeldCard', card);
    hook('onHeldCard', card);
  }
  const character: Source = {sourceType:'character',sourceDefinitionId:input.characterId,sourceInstanceId:`${input.runId}/character`};
  const char = (kind: 'add-heat'|'add-multiplier'|'multiply-multiplier', value: Rational, condition: Condition = {kind:'always'}) => emit('characterScore', character, kind, value, () => {
    if (kind === 'add-heat') H = H.add(value);
    else if (kind === 'add-multiplier') M = M.add(value);
    else M = M.multiply(value);
  }, condition);
  if(boss?.definitionId!=='B08')switch (input.characterId) {
    case 'amo': if (played.length === 1) char('multiply-multiplier', new Rational(3n), {kind:'played-count',equals:1}); break;
    case 'erxiang': if (['pair','two-pair','three-kind'].includes(evaluated.type)) char('add-multiplier', new Rational(3n,2n), {kind:'hand-type-in',values:['pair','two-pair','three-kind']}); break;
    case 'laohuan': if (['straight','flush','straight-flush'].includes(evaluated.type)) char('add-heat', new Rational(120n), {kind:'hand-type-in',values:['straight','flush','straight-flush']}); break;
    case 'azao': if (input.previousHandType !== null && input.previousHandType !== evaluated.type) char('add-multiplier', new Rational(1n)); break;
    case 'touye': char('multiply-multiplier', input.wager ? (chance({n:1,d:2}) ? new Rational(2n) : new Rational(3n,4n)) : new Rational(23n,20n)); break;
    case 'xiemu': if (input.handsBeforePlay === 1) char('multiply-multiplier', new Rational(2n)); break;
  }
  hook('jokerScore');
  const final = H.multiply(M).floor();
  if (final < 0n) throw new ScoreFault('negative-score', events);
  emit('finalScore', rule, 'final-score', new Rational(final), () => {});
  resolvedFinal=final;
  if (policy.kind === 'rule') for (const card of active) {
    const effect = R2_ENHANCEMENTS.find(entry => entry.id === card.enhancement)?.effects.find(effect => effect.kind === 'chance-destroy');
    if (!effect || effect.kind !== 'chance-destroy') continue;
    const hit = chance(effect.probability), source = cardSource(card);
    emit('afterHand', source, 'glass-check', new Rational(hit ? 1n : 0n), () => {}, {kind:'always'}, card, 0, undefined,
      {reasonKey:`enhancement.${card.enhancement}.glass-check`});
    if (hit) emit('afterHand', source, 'destroy-card', new Rational(0n), () => {destroyedCardIds.push(card.id);}, {kind:'always'}, card, 0, undefined,
      {reasonKey:`enhancement.${card.enhancement}.destroy-card`});
  }
  hook('afterHand');
  return immutable({ rulesVersion:'r2', rootId:input.rootId, handType:evaluated.type, level,
    sets:{playedIds:played.map(c=>c.id),scoringIds:evaluated.scoringIds,activeScoringIds:active.map(c=>c.id),heldIds:held.map(c=>c.id)},
    finalScore:final.toString(),accumulator:snapshot(),events,jokers:jokers.filter(j=>!destroyedJokerIds.includes(j.instanceId)),
    ...(rng ? {rng:rng.snapshot()} : {}),goldDelta,destroyedCardIds,destroyedJokerIds,cards,sourceJokers,bossContext });
}

export type PublicRandomEffect =
  | {kind:'lucky-paper';perExecution:{multiplier:{probability:{n:number;d:number};value:Fraction};gold:{probability:{n:number;d:number};amount:number}};goldCapPerHand:number}
  | {kind:'glass-paper';probability:{n:number;d:number};timing:'after-final-score';checksPerActiveInstance:1}
  | {kind:'joker-heat';sourceDefinitionId:string;sourceInstanceId:string;probability:{n:number;d:number};value:Fraction;timing:'jokerScore'}
  | {kind:'wager';outcomes:{probability:{n:number;d:number};multiplier:Fraction}[]};
export interface ScorePreview {
  handType:R2HandType; level:number; base:Accumulator; sets:ScoreTrace['sets'];
  /** With lucky, these are range endpoints, not an exhaustive outcome list. */
  possibleScores:string[]; scoreRange:{minimum:string;maximum:string}; randomEffects:PublicRandomEffect[];
}

/** Positive score operations make forced low/high branches exact public bounds. */
export function previewR2Hand(input: PublicScoreInput): ScorePreview {
  const minimum = resolveScore(input, {kind:'preview',bound:'minimum'});
  const active = minimum.cards.filter(card => minimum.sets.activeScoringIds.includes(card.id));
  const lucky = active.some(card => card.enhancement === 'lucky-paper');
  const disabledJokers=new Set(r2ScoringDisabledJokerIds(minimum.bossContext.boss,minimum.sourceJokers,input.definitions,minimum.bossContext.sealedJokerIds));
  const chanceJokers=input.jokers.filter(joker=>!disabledJokers.has(joker.instanceId)).flatMap(joker=>input.definitions.find(definition=>definition.id===joker.definitionId)!.hooks
    .filter(hook=>hook.phase==='jokerScore').flatMap(hook=>hook.operations.filter(operation=>operation.kind==='chance-add-heat')
      .map(operation=>({joker,operation}))));
  const randomScore=lucky||input.wager||chanceJokers.length>0;
  const maximum = randomScore ? resolveScore(input, {kind:'preview',bound:'maximum'}) : minimum;
  const randomEffects:PublicRandomEffect[] = [];
  if (lucky) {
    const effects = R2_ENHANCEMENTS.find(entry => entry.id === 'lucky-paper')!.effects;
    const multiplier = effects.find(effect => effect.kind === 'chance-add-multiplier')!;
    const gold = effects.find(effect => effect.kind === 'chance-add-gold')!;
    if (multiplier.kind !== 'chance-add-multiplier' || gold.kind !== 'chance-add-gold') throw new Error('invalid-lucky-contract');
    randomEffects.push({kind:'lucky-paper',perExecution:{multiplier:{probability:multiplier.probability,value:multiplier.value},
      gold:{probability:gold.probability,amount:gold.amount}},goldCapPerHand:gold.capPerHand});
  }
  if (active.some(card => card.enhancement === 'glass-paper')) {
    const glass = R2_ENHANCEMENTS.find(entry => entry.id === 'glass-paper')!.effects.find(effect => effect.kind === 'chance-destroy')!;
    if (glass.kind !== 'chance-destroy') throw new Error('invalid-glass-contract');
    randomEffects.push({kind:'glass-paper',probability:glass.probability,timing:'after-final-score',checksPerActiveInstance:1});
  }
  if (input.wager) randomEffects.push({kind:'wager',outcomes:[
    {probability:{n:1,d:2},multiplier:{n:'3',d:'4'}},{probability:{n:1,d:2},multiplier:{n:'2',d:'1'}},
  ]});
  for(const {joker,operation} of chanceJokers)if(operation.kind==='chance-add-heat')randomEffects.push({kind:'joker-heat',
    sourceDefinitionId:joker.definitionId,sourceInstanceId:joker.instanceId,probability:operation.probability,value:operation.value,timing:'jokerScore'});
  return immutable({handType:minimum.handType,level:minimum.level,base:minimum.events.filter(event=>event.phase==='base').at(-1)!.after,sets:minimum.sets,
    possibleScores:randomScore ? [minimum.finalScore,maximum.finalScore] : [minimum.finalScore],
    scoreRange:{minimum:minimum.finalScore,maximum:maximum.finalScore},randomEffects});
}
