import type { PlayingCard } from '../cards/types';
import { SeededRng, type RngSnapshot } from '../core/SeededRng';
import { validateR2Content, type Condition, type ScoreHookPhase, type Operation, type R2JokerDefinition, type R2JokerInstance, type ScorePhase } from '../content/r2Schema';
import { CHARACTER_IDS, type CharacterId } from './characters';
import { evaluateR2Hand, R2_HAND_TYPES, validateCardInstances, type HandRules, type R2HandType } from './evaluateR2';
import { Rational, type Fraction } from './rational';

export const SCORE_LIMITS = { eventCount: 512, extraRetriggers: 4, retriggerDepth: 1, handLevel: 30 } as const;
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
}
export interface Accumulator { H: Fraction; M: Fraction }
export interface ScoreEvent {
  eventId: string; rootId: string; rootEventId: string; phase: ScorePhase;
  sourceType: 'rule' | 'card' | 'character' | 'joker'; sourceDefinitionId: string; sourceInstanceId: string;
  targetCardId?: string; operation: string; value: Fraction; before: Accumulator; after: Accumulator;
  reasonKey: string; visibleCondition: Condition; retriggerDepth: number;
}
export interface ScoreTrace {
  rulesVersion: 'r2'; rootId: string; handType: R2HandType; level: number;
  sets: { playedIds: string[]; scoringIds: string[]; activeScoringIds: string[]; heldIds: string[] };
  finalScore: string; accumulator: Accumulator; events: ScoreEvent[]; jokers: R2JokerInstance[]; rng: RngSnapshot;
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

/** Pure resolver: preview callers receive a clone's cursor, never consume a live stream. */
export function scoreR2Hand(input: ScoreInput): ScoreTrace {
  if (input.rulesVersion !== 'r2' || !input.runId || !input.rootId || ![...CHARACTER_IDS, 'neutral'].includes(input.characterId)) throw new Error('invalid-score-version-or-character');
  validateCardInstances(input.hand);
  if(input.hand.some(c=>c.enhancement!==undefined))throw new Error('enhancement-not-enabled');
  if (!Array.isArray(input.jokers) || !Array.isArray(input.selectedIds) || input.selectedIds.length < 1 || input.selectedIds.length > 5 || new Set(input.selectedIds).size !== input.selectedIds.length || input.selectedIds.some(id => !input.hand.some(c => c.id === id))) throw new Error('invalid-selection');
  if (input.disabledIds.some(id => !input.hand.some(c => c.id === id)) || new Set(input.disabledIds).size !== input.disabledIds.length) throw new Error('invalid-disabled-cards');
  if(![input.gold??0,input.discardsUsed??0].every(n=>Number.isSafeInteger(n)&&n>=0))throw new Error('invalid-score-resources');
  const ordinarySuppressed=input.ordinaryPointsSuppressedIds??[];
  if(new Set(ordinarySuppressed).size!==ordinarySuppressed.length||ordinarySuppressed.some(id=>!input.selectedIds.includes(id)))throw new Error('invalid-ordinary-point-suppression');
  if (!Number.isSafeInteger(input.playIndex) || input.playIndex < 1 || !Number.isSafeInteger(input.handsBeforePlay) || input.handsBeforePlay < 1 || (input.previousHandType !== null && !R2_HAND_TYPES.includes(input.previousHandType)) || typeof input.wager !== 'boolean' || (input.wager && input.characterId !== 'touye')) throw new Error('invalid-score-context');
  for (const [type, level] of Object.entries(input.handLevels)) if (!R2_HAND_TYPES.includes(type as R2HandType) || !Number.isInteger(level) || level! < 1 || level! > SCORE_LIMITS.handLevel) throw new Error('invalid-hand-level');
  const errors = validateR2Content(input.definitions);
  if (errors.length) throw new Error(`invalid-content: ${errors.join('; ')}`);
  if (input.jokers.length > 5 || new Set(input.jokers.map(j => j.instanceId)).size !== input.jokers.length) throw new Error('invalid-joker-instances');
  const jokers = structuredClone(input.jokers) as R2JokerInstance[];
  for (const joker of jokers) {
    if (!joker.instanceId || !Number.isSafeInteger(joker.paidPrice) || joker.paidPrice < 0 || !input.definitions.some(d => d.id === joker.definitionId)) throw new Error('invalid-joker-instance');
    const writers = input.definitions.find(d => d.id === joker.definitionId)!.hooks.flatMap(h => h.operations.filter((o): o is Extract<Operation, {kind:'add-growth'}> => o.kind === 'add-growth'));
    for (const [key, value] of Object.entries(joker.growth)) {
      const writer = writers.find(o => o.key === key), growth = Rational.fromJSON(value);
      if (!writer || growth.n < 0n || growth.compare(Rational.fromJSON(writer.cap)) > 0) throw new Error('invalid-growth-state');
    }
  }
  const played = input.hand.filter(c => input.selectedIds.includes(c.id));
  const held = input.hand.filter(c => !input.selectedIds.includes(c.id));
  const evaluated = evaluateR2Hand(played, input.handRules ?? {});
  const active = played.filter(c => evaluated.scoringIds.includes(c.id) && !input.disabledIds.includes(c.id));
  const level = input.handLevels[evaluated.type] ?? 1;
  let H = new Rational(0n), M = new Rational(0n);
  const events: ScoreEvent[] = [];
  const rng = SeededRng.restore(input.rng);
  const snapshot = (): Accumulator => ({ H: H.toJSON(), M: M.toJSON() });
  type Source = Pick<ScoreEvent, 'sourceType'|'sourceDefinitionId'|'sourceInstanceId'>;
  const emit = (phase: ScorePhase, source: Source, operation: string, value: Rational, mutate: () => void, condition: Condition = {kind:'always'}, card?: PlayingCard, depth = 0, rootEventId?: string) => {
    if (events.length >= SCORE_LIMITS.eventCount) throw new ScoreFault('event-limit', immutable(structuredClone(events)));
    const before = snapshot(); mutate();
    const eventId = `${input.rootId}/event/${events.length}`;
    events.push({ eventId, rootId: input.rootId, rootEventId: rootEventId ?? eventId, phase, ...source, ...(card ? {targetCardId:card.id} : {}), operation, value: value.toJSON(), before, after: snapshot(), reasonKey: `${source.sourceDefinitionId}.${operation}`, visibleCondition: structuredClone(condition), retriggerDepth: depth });
  };
  const [heat, mult, heatStep, multStep] = R2_BASE_SCORES[evaluated.type];
  const baseH = new Rational(BigInt(heat + heatStep * (level - 1)));
  const baseM = Rational.fromJSON(mult).add(Rational.fromJSON(multStep).multiply(new Rational(BigInt(level - 1))));
  const rule: Source = {sourceType:'rule',sourceDefinitionId:evaluated.type,sourceInstanceId:input.runId};
  emit('base', rule, 'base', baseH, () => { H = baseH; M = baseM; });
  const matches = (c: Condition, card?: PlayingCard): boolean => {
    switch (c.kind) {
      case 'always': return true;
      case 'hand-type-in': return c.values.includes(evaluated.type);
      case 'rank-in': return !!card && c.values.includes(card.rank);
      case 'played-count': return played.length === c.equals;
      case 'held-count': return held.length >= c.minimum;
      case 'play-modulo': return input.playIndex % c.divisor === c.remainder;
      case 'suit-in': return !!card&&c.values.includes(card.suit);
      case 'paired-rank': return !!card&&played.filter(p=>p.rank===card.rank).length>=c.minimum;
      case 'rank-groups': return [...new Set(played.map(p=>p.rank))].filter(rank=>played.filter(p=>p.rank===rank).length>=c.groupSize).length>=c.minimum;
      case 'held-rank-first': return !!card&&held.filter(p=>c.values.includes(p.rank)).slice(0,c.limit).some(p=>p.id===card.id);
      case 'resource': return ({gold:input.gold??0,'hands-after':input.handsBeforePlay-1,'play-index':input.playIndex,'discards-used':input.discardsUsed??0})[c.resource]===c.equals;
      case 'resource-minimum': return (input.gold??0)>=c.minimum;
    }
  };
  const hook = (phase: ScoreHookPhase, card?: PlayingCard, depth = 0, rootEventId?: string): number => {
    let retriggers = 0;
    for (const joker of jokers) {
      const definition = input.definitions.find(d => d.id === joker.definitionId)!;
      const source: Source = {sourceType:'joker',sourceDefinitionId:definition.id,sourceInstanceId:joker.instanceId};
      for (const h of definition.hooks) if (h.phase === phase && matches(h.condition, card)) for (const op of h.operations) {
        if (op.kind === 'retrigger-card' && depth > 0) continue;
        if (op.kind === 'read-growth') {
          const value = Rational.fromJSON(joker.growth[op.key] ?? {n:'0',d:'1'});
          emit(phase, source, op.kind, value, () => { if (op.target === 'heat') H = H.add(value); else M = M.add(value); }, h.condition, card, depth, rootEventId);
        } else if (op.kind === 'add-growth') {
          const previous = Rational.fromJSON(joker.growth[op.key] ?? {n:'0',d:'1'});
          const grown = previous.add(Rational.fromJSON(op.value)), cap = Rational.fromJSON(op.cap);
          const next = grown.compare(cap) > 0 ? cap : grown;
          emit(phase, source, op.kind, next.add(previous.multiply(new Rational(-1n))), () => { joker.growth[op.key] = next.toJSON(); }, h.condition, card, depth, rootEventId);
        } else if (op.kind === 'retrigger-card') {
          const available = Math.min(op.count, SCORE_LIMITS.extraRetriggers - retriggers);
          emit(phase, source, 'retrigger-card', new Rational(BigInt(available)), () => { retriggers += available; }, h.condition, card, depth, rootEventId);
          if (available < op.count) emit(phase, source, 'retrigger-cap', new Rational(BigInt(SCORE_LIMITS.extraRetriggers)), () => {}, h.condition, card, depth, rootEventId);
        } else if(op.kind==='add-heat-per-gold'||op.kind==='add-heat-per-empty-slot') {
          const amount=op.kind==='add-heat-per-gold'?(input.gold??0):Math.max(0,5-jokers.length);
          const raw=Rational.fromJSON(op.value).multiply(new Rational(BigInt(amount))),cap=Rational.fromJSON(op.cap),value=raw.compare(cap)>0?cap:raw;
          emit(phase,source,op.kind,value,()=>{H=H.add(value);},h.condition,card,depth,rootEventId);
        } else if('value' in op) {
          const value = Rational.fromJSON(op.value);
          emit(phase, source, op.kind, value, () => {
            if (op.kind === 'add-heat') H = H.add(value);
            else if (op.kind === 'add-multiplier') M = M.add(value);
            else M = M.multiply(value);
          }, h.condition, card, depth, rootEventId);
        }
      }
    }
    return retriggers;
  };
  for (const card of active) {
    const source: Source = {sourceType:'card',sourceDefinitionId:`rank-${card.rank}`,sourceInstanceId:card.id};
    if(ordinarySuppressed.includes(card.id))emit('onCardScore',{sourceType:'rule',sourceDefinitionId:'B02',sourceInstanceId:input.runId},'ordinary-points-suppressed',new Rational(0n),()=>{},{kind:'always'},card);
    const points = new Rational(BigInt(ordinarySuppressed.includes(card.id)?0:card.rank === 14 ? 11 : Math.min(card.rank, 10)));
    const root = `${input.rootId}/event/${events.length}`;
    emit('onCardScore', source, 'add-heat', points, () => { H = H.add(points); }, {kind:'always'}, card);
    const extra = hook('onCardScore', card, 0, root);
    for (let i = 0; i < extra; i++) {
      emit('onCardScore', source, 'add-heat', points, () => { H = H.add(points); }, {kind:'always'}, card, 1, root);
      hook('onCardScore', card, 1, root);
    }
  }
  for (const card of held) hook('onHeldCard', card);
  const character: Source = {sourceType:'character',sourceDefinitionId:input.characterId,sourceInstanceId:`${input.runId}/character`};
  const char = (kind: 'add-heat'|'add-multiplier'|'multiply-multiplier', value: Rational, condition: Condition = {kind:'always'}) => emit('characterScore', character, kind, value, () => {
    if (kind === 'add-heat') H = H.add(value);
    else if (kind === 'add-multiplier') M = M.add(value);
    else M = M.multiply(value);
  }, condition);
  switch (input.characterId) {
    case 'amo': if (played.length === 1) char('multiply-multiplier', new Rational(3n), {kind:'played-count',equals:1}); break;
    case 'erxiang': if (['pair','two-pair','three-kind'].includes(evaluated.type)) char('add-multiplier', new Rational(3n,2n), {kind:'hand-type-in',values:['pair','two-pair','three-kind']}); break;
    case 'laohuan': if (['straight','flush','straight-flush'].includes(evaluated.type)) char('add-heat', new Rational(120n), {kind:'hand-type-in',values:['straight','flush','straight-flush']}); break;
    case 'azao': if (input.previousHandType !== null && input.previousHandType !== evaluated.type) char('add-multiplier', new Rational(1n)); break;
    case 'touye': char('multiply-multiplier', input.wager ? (rng.next() < 0.5 ? new Rational(2n) : new Rational(3n,4n)) : new Rational(23n,20n)); break;
    case 'xiemu': if (input.handsBeforePlay === 1) char('multiply-multiplier', new Rational(2n)); break;
  }
  hook('jokerScore');
  const final = H.multiply(M).floor();
  if (final < 0n) throw new ScoreFault('negative-score', events);
  emit('finalScore', rule, 'final-score', new Rational(final), () => {});
  hook('afterHand');
  return immutable({ rulesVersion:'r2', rootId:input.rootId, handType:evaluated.type, level,
    sets:{playedIds:played.map(c=>c.id),scoringIds:evaluated.scoringIds,activeScoringIds:active.map(c=>c.id),heldIds:held.map(c=>c.id)},
    finalScore:final.toString(),accumulator:snapshot(),events,jokers,rng:rng.snapshot() });
}

/** Public preview never accepts the real RNG or reveals which wager outcome is next. */
export function previewR2Hand(input: Omit<ScoreInput, 'rng'>): {handType:R2HandType; level:number; base:Accumulator; sets:ScoreTrace['sets']; possibleScores:string[]} {
  const snapshot = new SeededRng('public-preview').snapshot();
  const outcomes = input.wager ? [0, 1] : [0];
  const traces = outcomes.map(state => scoreR2Hand({...input, rng:{...snapshot,state}}));
  return {handType:traces[0].handType,level:traces[0].level,base:traces[0].events[0].after,sets:traces[0].sets,possibleScores:traces.map(t=>t.finalScore)};
}
