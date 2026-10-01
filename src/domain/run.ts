import { createDeck } from '../cards/deck';
import { evaluateHand, type HandType } from '../cards/handEvaluator';
import type { PlayingCard } from '../cards/types';
import { SeededRng, type RngSnapshot } from '../core/SeededRng';
import { JOKERS } from '../jokers/JokerEngine';
import type { JokerId } from '../jokers/types';
import { advanceStage, createRunState, stageRng } from '../run/runState';
import { buyJoker, canBuyJoker, drawShelf, jokerPrice, MAX_JOKER_SLOTS, payReroll, REROLL_COST, shopPool, shopRng } from '../run/shop';
import { getStage, STAGES } from '../run/stages';
import { scoreHand, type ScoreResult } from '../scoring/scoreHand';
import { CHARACTER_IDS, type CharacterId } from './characters';
import { stableHash } from './hash';
import { assertR2Invariants, R2_CONTENT_HASH, R2_CONTENT_VERSION, transactR2, type R2RunState, type R2StageState } from './r2Run';
import type { ScoreTrace } from './scoreR2';
import type { Condition } from '../content/r2Schema';
export type { R2RunState } from './r2Run';

export const R1_LIMITS = { handSize: 8, maxSelected: 5, jokerSlots: MAX_JOKER_SLOTS } as const;
export const CONTENT_VERSION = 'phase2b-r1';
export const CONTENT_HASH = stableHash({ jokers: JOKERS, stages: STAGES, limits: R1_LIMITS });
export type Phase = 'shop' | 'stage-ready' | 'await-input' | 'stage-cleared' | 'run-won' | 'run-lost';

export interface JokerInstance {
  instanceId: string;
  definitionId: JokerId;
  paidPrice: number;
  growth: Record<string, number>;
}

export interface ShopOffer {
  offerId: string;
  definitionId: JokerId;
  price: number;
  consumed: boolean;
}

export interface ShopState {
  visitIndex: number;
  rerollCount: number;
  offers: ShopOffer[];
}

export interface StageState {
  index: number;
  targetHeat: number;
  heat: number;
  handsLeft: number;
  discardsLeft: number; // r1 has no discard command; R03 will enable r2 resources.
  playIndex: number;
  previousHandType: HandType | null;
  clearId: string | null;
  goldEarned: number;
}

export interface Receipt {
  commandId: string;
  fingerprint: string;
  seq: number;
}

export interface RunState {
  schemaVersion: 1;
  rulesVersion: 'r1';
  contentVersion: string;
  contentHash: string;
  runId: string;
  seed: string;
  commandSeq: number;
  difficulty: 0;
  characterId: CharacterId;
  chapter: number;
  stageIndex: number;
  phase: Phase;
  deckInstances: PlayingCard[];
  drawPile: string[];
  handOrder: string[];
  playedPile: string[];
  discardPile: string[];
  destroyedIds: string[];
  stage: StageState | null;
  totalHeat: number;
  gold: number;
  jokers: JokerInstance[];
  consumables: { instanceId: string; definitionId: string }[];
  longTermItems: string[];
  program: null;
  boss: null;
  shop: ShopState | null;
  rng: Record<'deck' | 'shop' | 'rule' | 'reward', RngSnapshot>;
  receipts: Receipt[];
  lastScore: ScoreResult | null;
  outcome: { reason: 'all-stages-cleared' | 'hands-exhausted' | 'no-legal-cards' | 'abandoned'; stageIndex: number } | null;
}

export type Action =
  | { type: 'StartRun'; seed: string; characterId: CharacterId; rulesVersion?: 'r1' | 'r2' }
  | { type: 'LeaveShop' | 'EnterStage' | 'OpenShop' | 'RerollShop' | 'AbandonRun' | 'SkipStage' }
  | { type: 'PlayHand'; selectedIds: readonly string[] }
  | { type: 'DiscardHand'; selectedIds: readonly string[] }
  | { type: 'SellJoker'; instanceId:string }
  | { type: 'UseConsumable'; instanceId:string; targetIds:readonly string[]; handType?:import('./evaluateR2').R2HandType; secondaryHandType?:import('./evaluateR2').R2HandType; suit?:import('../cards/types').Suit; sacrificeId?:string; targetKind?:'card'|'joker' }
  | { type: 'DestroyConsumable'; instanceId:string }
  | { type: 'SetWager'; enabled: boolean }
  | { type: 'BuyOffer'; offerId: string }
  | { type: 'ReorderHand' | 'ReorderJokers'; ids: readonly string[] };

export interface Command {
  runId: string;
  commandId: string;
  expectedSeq: number;
  action: Action;
}

export type DomainEvent =
  | { type: 'hand-scored'; score: ScoreResult; playedIds: string[]; playIndex: number }
  | { type: 'hand-scored-r2'; score: ScoreTrace; playedIds: string[]; playIndex: number }
  | { type: 'stage-ended'; cleared: boolean; stage: StageState | R2StageState }
  | { type: 'cards-discarded';cardIds:string[];discardsLeft:number }
  | { type: 'run-abandoned' }
  | { type: 'stage-skipped';stage: R2StageState }
  | { type: 'consumable-used';definitionId:string;instanceId:string;targetIds:string[];createdCardIds:string[];destroyedCardIds:string[];createdJokerIds?:string[];destroyedJokerIds?:string[] }
  | { type: 'joker-transaction';phase:'onDiscard'|'onStageClear'|'onBuyOffer'|'onSellJoker'|'beforeFailure';definitionId:string;instanceId:string;operation:string;amount:string;resourceBefore?:number;resourceAfter?:number;visibleCondition?:Condition };

export type CommandResult<S = RunState> =
  | { ok: true; state: Exclude<S, null>; events: DomainEvent[]; receipt: Receipt; duplicate: boolean }
  | { ok: false; code: string; state: S; diagnostic?: {code:string;events:readonly unknown[]} };

export type AnyRunState = RunState | R2RunState;
export const stateHash = (state: AnyRunState): string => stableHash(state);
export const jokerIds = (state: RunState): JokerId[] => state.jokers.map(joker => joker.definitionId);
const summary = (state: RunState) => ({ seed: state.seed, characterId: state.characterId, stageIndex: state.stageIndex, totalHeat: state.totalHeat, gold: state.gold, jokerIds: jokerIds(state) });

function makeShop(state: RunState, reset: boolean): void {
  const rng = reset ? shopRng(state.seed, state.stageIndex) : SeededRng.restore(state.rng.shop);
  const rerollCount = reset ? 0 : state.shop!.rerollCount + 1;
  const offers = drawShelf(rng, shopPool(summary(state))).map((id, slot) => ({
    offerId: `${state.runId}/shop/${state.stageIndex}/${rerollCount}/${slot}`,
    definitionId: id, price: jokerPrice(id), consumed: false,
  }));
  state.shop = { visitIndex: state.stageIndex, rerollCount, offers };
  state.rng.shop = rng.snapshot();
}

/** The only draw direction: pop from the end, matching the baseline player. */
function refill(state: RunState): void {
  while (state.handOrder.length < R1_LIMITS.handSize && state.drawPile.length) state.handOrder.push(state.drawPile.pop()!);
}

function initial(command: Command, action: Extract<Action, { type: 'StartRun' }>): RunState {
  const legacy = createRunState(action.seed, action.characterId);
  const cards = createDeck();
  const stage = stageRng(action.seed, 0).snapshot();
  const state: RunState = {
    schemaVersion: 1, rulesVersion: 'r1', contentVersion: CONTENT_VERSION, contentHash: CONTENT_HASH,
    runId: command.runId, seed: action.seed, commandSeq: 0, difficulty: 0, characterId: action.characterId,
    chapter: 1, stageIndex: 0, phase: 'shop', deckInstances: cards,
    drawPile: cards.map(card => card.id), handOrder: [], playedPile: [], discardPile: [], destroyedIds: [],
    stage: null, totalHeat: legacy.totalHeat, gold: legacy.gold, jokers: [], consumables: [], longTermItems: [],
    program: null, boss: null, shop: null,
    rng: { deck: stage, rule: { ...stage }, shop: shopRng(action.seed, 0).snapshot(), reward: new SeededRng(`${action.seed}/reward/0`).snapshot() },
    receipts: [], lastScore: null, outcome: null,
  };
  makeShop(state, true);
  return state;
}

function permutation(ids: readonly string[], expected: readonly string[]): boolean {
  return ids.length === expected.length && new Set(ids).size === ids.length && ids.every(id => expected.includes(id));
}

export function applyCommand(input: RunState, command: Command): CommandResult;
export function applyCommand(input: R2RunState, command: Command): CommandResult<R2RunState>;
export function applyCommand(input: AnyRunState | null, command: Command): CommandResult<AnyRunState | null>;
export function applyCommand(input: AnyRunState | null, command: Command): CommandResult<AnyRunState | null> {
  const fail = (code: string): CommandResult<AnyRunState|null> => ({ ok: false, code, state: input });
  if (!command || !command.action || typeof command.runId !== 'string' || !command.runId.trim() || typeof command.commandId !== 'string' || !command.commandId.trim() || !Number.isSafeInteger(command.expectedSeq) || command.expectedSeq < 0) return fail('invalid-command');
  if (input && command.runId !== input.runId) return fail('wrong-run');
  if(input && !((input.rulesVersion==='r1'&&input.schemaVersion===1&&input.contentHash===CONTENT_HASH&&input.contentVersion===CONTENT_VERSION)||(input.rulesVersion==='r2'&&input.schemaVersion===2&&input.contentHash===R2_CONTENT_HASH&&input.contentVersion===R2_CONTENT_VERSION)))return fail('incompatible-version');
  const fingerprint = stableHash(command);
  const previous = input?.receipts.find(receipt => receipt.commandId === command.commandId);
  if (previous) {
    if (previous.fingerprint !== fingerprint) return fail('command-id-conflict');
    return { ok: true, state: input!, events: [], receipt: previous, duplicate: true };
  }
  if (command.expectedSeq !== (input?.commandSeq ?? 0)) return fail('stale-sequence');
  if (input?.rulesVersion === 'r2' || (!input && command.action.type === 'StartRun' && command.action.rulesVersion === 'r2')) {
    const result = transactR2(input as R2RunState|null, command);
    if (!result.ok) return {...fail(result.code), ...(result.diagnostic ? {diagnostic:result.diagnostic} : {})};
    const receipt = {commandId:command.commandId,fingerprint,seq:result.state.commandSeq+1};
    result.state.commandSeq++; result.state.receipts.push(receipt);
    assertR2Invariants(result.state);
    return {...result,receipt,duplicate:false};
  }

  const action = command.action;
  const events: DomainEvent[] = [];
  let state: RunState;
  if (action.type === 'StartRun') {
    if (input) return fail('wrong-phase');
    if (typeof action.seed !== 'string' || !action.seed.length || !CHARACTER_IDS.includes(action.characterId)) return fail('invalid-start');
    if (action.rulesVersion && action.rulesVersion !== 'r1') return fail('unsupported-rules-version');
    state = initial(command, action);
  } else {
    if (!input) return fail('run-not-started');
    // Work on a transaction copy; rejected actions never publish consumed RNG/resources.
    state = structuredClone(input);
    switch (action.type) {
      case 'LeaveShop':
        if (state.phase !== 'shop') return fail('wrong-phase');
        state.phase = 'stage-ready';
        break;
      case 'EnterStage': {
        if (state.phase !== 'stage-ready') return fail('wrong-phase');
        const definition = getStage(state.stageIndex);
        if (!definition) return fail('unknown-stage');
        const rng = stageRng(state.seed, state.stageIndex);
        state.drawPile = rng.shuffle(state.deckInstances).map(card => card.id);
        state.handOrder = []; state.playedPile = []; state.discardPile = [];
        refill(state);
        state.rng.deck = rng.snapshot();
        // r1 used one stage stream for shuffle and luck. Clone its post-shuffle cursor
        // to the rule domain to preserve legacy results while isolating future deck work.
        state.rng.rule = rng.snapshot();
        state.rng.reward = new SeededRng(`${state.seed}/reward/${state.stageIndex}`).snapshot();
        state.stage = { index: state.stageIndex, targetHeat: definition.targetHeat, heat: 0, handsLeft: definition.hands, discardsLeft: 0, playIndex: 0, previousHandType: null, clearId: null, goldEarned: 0 };
        state.phase = 'await-input'; state.shop = null; state.lastScore = null;
        break;
      }
      case 'OpenShop':
        if (state.phase !== 'stage-cleared') return fail('wrong-phase');
        state.phase = 'shop';
        makeShop(state, true);
        break;
      case 'BuyOffer': {
        if (state.phase !== 'shop' || !state.shop) return fail('wrong-phase');
        const offer = state.shop.offers.find(offer => offer.offerId === action.offerId);
        if (!offer) return fail('unknown-offer');
        if (offer.consumed) return fail('consumed-offer');
        const error = canBuyJoker(summary(state), offer.definitionId);
        if (error) return fail(error);
        state.gold = buyJoker(summary(state), offer.definitionId).gold;
        state.jokers.push({ instanceId: `${state.runId}/joker/${command.commandId}`, definitionId: offer.definitionId, paidPrice: offer.price, growth: {} });
        offer.consumed = true;
        break;
      }
      case 'RerollShop':
        if (state.phase !== 'shop' || !state.shop) return fail('wrong-phase');
        if (state.gold < REROLL_COST) return fail('not-enough-gold');
        if (!shopPool(summary(state)).length) return fail('no-reroll-candidates');
        state.gold = payReroll(summary(state)).gold;
        makeShop(state, false);
        break;
      case 'ReorderHand':
        if (state.phase !== 'await-input') return fail('wrong-phase');
        if (!Array.isArray(action.ids) || !permutation(action.ids, state.handOrder)) return fail('invalid-order');
        state.handOrder = [...action.ids];
        break;
      case 'ReorderJokers': {
        if (!['shop', 'await-input'].includes(state.phase)) return fail('wrong-phase');
        const ids = state.jokers.map(joker => joker.instanceId);
        if (!Array.isArray(action.ids) || !permutation(action.ids, ids)) return fail('invalid-order');
        state.jokers = action.ids.map(id => state.jokers.find(joker => joker.instanceId === id)!);
        break;
      }
      case 'PlayHand': {
        if (state.phase !== 'await-input' || !state.stage) return fail('wrong-phase');
        const ids = action.selectedIds;
        if (!Array.isArray(ids) || ids.length === 0) return fail('empty-selection');
        if (ids.length > R1_LIMITS.maxSelected) return fail('too-many-cards');
        if (new Set(ids).size !== ids.length) return fail('duplicate-card');
        if (ids.some(id => !state.handOrder.includes(id))) return fail('unknown-card');
        if (state.stage.handsLeft <= 0) return fail('no-hands-left');
        const playedIds = state.handOrder.filter(id => ids.includes(id));
        const cards = playedIds.map(id => state.deckInstances.find(card => card.id === id)!);
        const hand = evaluateHand(cards);
        const rng = SeededRng.restore(state.rng.rule);
        const score = scoreHand(hand, state.characterId, { previousHandType: state.stage.previousHandType ?? undefined, handsBeforePlay: state.stage.handsLeft, luckRoll: rng.next(), playIndex: state.stage.playIndex + 1, jokerIds: jokerIds(state) });
        if (!Number.isSafeInteger(score.finalHeat) || score.finalHeat < 0 || !Number.isSafeInteger(state.stage.heat + score.finalHeat)) return fail('invalid-score');
        state.rng.rule = rng.snapshot();
        state.stage.heat += score.finalHeat; state.stage.handsLeft--; state.stage.playIndex++;
        state.stage.previousHandType = hand.type;
        state.lastScore = score;
        state.handOrder = state.handOrder.filter(id => !ids.includes(id));
        state.playedPile.push(...playedIds);
        refill(state); // Preserve r1's refill-before-win/lose behavior. r2 changes in R03.
        events.push({ type: 'hand-scored', score, playedIds, playIndex: state.stage.playIndex });
        if (state.stage.heat >= state.stage.targetHeat) {
          const advanced = advanceStage(summary(state), state.stage.heat, state.stage.handsLeft);
          state.stage.goldEarned = advanced.gold - state.gold;
          state.stage.clearId = `${state.runId}/clear/${state.stageIndex}`;
          state.gold = advanced.gold; state.totalHeat = advanced.totalHeat; state.stageIndex = advanced.stageIndex;
          state.phase = state.stageIndex >= STAGES.length ? 'run-won' : 'stage-cleared';
          if (state.phase === 'run-won') state.outcome = { reason: 'all-stages-cleared', stageIndex: state.stage.index };
          events.push({ type: 'stage-ended', cleared: true, stage: structuredClone(state.stage) });
        } else if (state.stage.handsLeft === 0 || state.handOrder.length === 0) {
          state.phase = 'run-lost';
          state.outcome = { reason: state.stage.handsLeft === 0 ? 'hands-exhausted' : 'no-legal-cards', stageIndex: state.stage.index };
          events.push({ type: 'stage-ended', cleared: false, stage: structuredClone(state.stage) });
        }
        break;
      }
      case 'AbandonRun':
        if (['run-won', 'run-lost'].includes(state.phase)) return fail('wrong-phase');
        state.phase = 'run-lost';
        state.outcome = { reason: 'abandoned', stageIndex: state.stageIndex };
        events.push({ type: 'run-abandoned' });
        break;
      default:
        return fail('unknown-command');
    }
  }
  state.commandSeq++;
  const receipt = { commandId: command.commandId, fingerprint, seq: state.commandSeq };
  state.receipts.push(receipt);
  assertRunInvariants(state);
  return { ok: true, state, events, receipt, duplicate: false };
}

type StartOptions = { seed: string; characterId: CharacterId; runId: string };
export function createRun(options: StartOptions & {rulesVersion:'r2'}): R2RunState;
export function createRun(options: StartOptions & {rulesVersion?:'r1'}): RunState;
export function createRun(options: StartOptions & {rulesVersion?:'r1'|'r2'}): AnyRunState;
export function createRun(options: StartOptions & {rulesVersion?:'r1'|'r2'}): AnyRunState {
  const result = applyCommand(null, {
    runId: options.runId, commandId: `${options.runId}/start`, expectedSeq: 0,
    action: { type: 'StartRun', seed: options.seed, characterId: options.characterId, ...(options.rulesVersion ? { rulesVersion: options.rulesVersion } : {}) },
  });
  if (!result.ok) throw new Error(result.code);
  return result.state;
}

export function assertRunInvariants(state: AnyRunState): void {
  if (state.rulesVersion === 'r2') return assertR2Invariants(state);
  const check = (condition: boolean, message: string) => { if (!condition) throw new Error(`Run invariant: ${message}`); };
  const integer = (value: number) => Number.isSafeInteger(value) && value >= 0;
  const ids = state.deckInstances.map(card => card.id);
  check(new Set(ids).size === ids.length, 'unique deck instances');
  const zones = [...state.drawPile, ...state.handOrder, ...state.playedPile, ...state.discardPile];
  check(new Set(zones).size === zones.length, 'one card per zone');
  check(zones.every(id => ids.includes(id)) && ids.every(id => zones.includes(id) || state.destroyedIds.includes(id)), 'card conservation');
  check(state.destroyedIds.every(id => !zones.includes(id)), 'destroyed cards absent from active zones');
  check(state.handOrder.length <= R1_LIMITS.handSize, 'hand limit');
  check(integer(state.gold) && integer(state.totalHeat) && integer(state.commandSeq), 'nonnegative integer resources');
  check(state.jokers.length <= R1_LIMITS.jokerSlots && new Set(state.jokers.map(j => j.instanceId)).size === state.jokers.length, 'joker slots/instance IDs');
  check(new Set(state.jokers.map(j => j.definitionId)).size === state.jokers.length, 'r1 no duplicate joker definitions');
  if (state.shop) check(new Set(state.shop.offers.map(o => o.offerId)).size === state.shop.offers.length, 'unique offer IDs');
  if (state.stage) check([state.stage.heat, state.stage.targetHeat, state.stage.handsLeft, state.stage.discardsLeft, state.stage.playIndex, state.stage.goldEarned].every(integer), 'stage resources');
  check(state.phase !== 'await-input' || state.stage !== null, 'stage required for play');
  check(state.phase !== 'shop' || state.shop !== null, 'shelf required in shop');
  check(!['run-won', 'run-lost'].includes(state.phase) || state.outcome !== null, 'terminal outcome');
  for (const cursor of Object.values(state.rng)) SeededRng.restore(cursor);
}
