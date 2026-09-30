import { describe, expect, it } from 'vitest';
import { SeededRng } from '../src/core/SeededRng';
import { applyCommand, assertRunInvariants, createRun, stateHash, type Command, type RunState } from '../src/domain/run';
import { RunController } from '../src/application/RunController';
import { chooseAction, publicView, simulateRun } from '../src/testing/bot';

const next = (state: RunState, action: Command['action'], commandId = `cmd-${state.commandSeq + 1}`): Command => ({
  runId: state.runId, commandId, expectedSeq: state.commandSeq, action,
});

function send(state: RunState, action: Command['action']): RunState {
  const result = applyCommand(state, next(state, action));
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.code);
  assertRunInvariants(result.state);
  return result.state;
}

function started(seed = 'r00-baseline', characterId: RunState['characterId'] = 'amo'): RunState {
  return createRun({ seed, characterId, runId: 'domain-fixture' });
}

function table(seed?: string, characterId?: RunState['characterId']): RunState {
  return send(send(started(seed, characterId), { type: 'LeaveShop' }), { type: 'EnterStage' });
}

describe('versioned RNG continuation', () => {
  it('keeps the baseline uint32 and shuffle golden vectors', () => {
    const rng = new SeededRng('r01-vector');
    expect(Array.from({ length: 6 }, () => rng.next() * 4294967296)).toEqual([
      1171121472, 711762313, 361259361, 1667192404, 1023409646, 3021464197,
    ]);
    expect(new SeededRng('r01-vector').shuffle([1, 2, 3, 4, 5, 6, 7, 8])).toEqual([4, 5, 8, 6, 7, 1, 2, 3]);
  });

  it('restores the exact next values across a JSON checkpoint', () => {
    const rng = new SeededRng('checkpoint');
    rng.next(); rng.next();
    const restored = SeededRng.restore(JSON.parse(JSON.stringify(rng.snapshot())));
    expect(Array.from({ length: 20 }, () => restored.next())).toEqual(Array.from({ length: 20 }, () => rng.next()));
    expect(() => SeededRng.restore({ algorithm: 'wrong', state: 1 })).toThrow();
    expect(() => SeededRng.restore({ algorithm: 'fnv1a-mulberry32-v1', state: -1 })).toThrow();
  });
});

describe('complete r1 command state', () => {
  it('pins r1 and rejects selecting an unimplemented rules version', () => {
    const run = started();
    expect(run.rulesVersion).toBe('r1');
    expect(run.phase).toBe('shop');
    expect(run.gold).toBe(6);
    expect(run.deckInstances).toHaveLength(52);
    expect(run.shop?.offers).toHaveLength(3);
    expect(() => createRun({ seed: 'x', characterId: 'amo', runId: 'x', rulesVersion: 'r2' })).toThrow();
    assertRunInvariants(run);
  });

  it('draws from the same end as the baseline UI, not the old bot splice/shift', () => {
    const run = table();
    expect(run.handOrder).toEqual(['diamonds-7', 'spades-2', 'diamonds-10', 'diamonds-6', 'diamonds-2', 'spades-12', 'hearts-5', 'spades-7']);
    const played = send(run, { type: 'PlayHand', selectedIds: [run.handOrder[0]] });
    expect(played.stage?.heat).toBe(60); // r1: no ordinary rank points, amo single-card x3.
    expect(played.stage?.handsLeft).toBe(3);
    expect(played.handOrder.at(-1)).toBe('diamonds-3');
    expect(played.playedPile).toEqual(['diamonds-7']);
    expect(played.drawPile).toHaveLength(43);
  });

  it.each([
    ['unknown-card', { type: 'PlayHand', selectedIds: ['missing'] }],
    ['duplicate-card', { type: 'PlayHand', selectedIds: ['diamonds-7', 'diamonds-7'] }],
    ['empty-selection', { type: 'PlayHand', selectedIds: [] }],
    ['too-many-cards', { type: 'PlayHand', selectedIds: ['diamonds-7', 'spades-2', 'diamonds-10', 'diamonds-6', 'diamonds-2', 'spades-12'] }],
  ] as const)('rejects %s without consuming resources or RNG', (code, action) => {
    const run = table();
    const before = JSON.stringify(run);
    const result = applyCommand(run, next(run, action));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('invalid action accepted');
    expect(result.code).toBe(code);
    expect(result.state).toBe(run);
    expect(JSON.stringify(run)).toBe(before);
  });

  it('rejects wrong phase, wrong run and stale sequence before mutation', () => {
    const shop = started();
    const play = next(shop, { type: 'PlayHand', selectedIds: ['spades-2'] });
    const cases = [play, { ...play, runId: 'other' }, { ...play, expectedSeq: -1 }];
    for (const command of cases) {
      const result = applyCommand(shop, command);
      expect(result.ok).toBe(false);
      expect(result.state).toBe(shop);
    }
  });

  it('makes retries idempotent and refuses reuse of an ID for a different action', () => {
    const run = table();
    const command = next(run, { type: 'PlayHand', selectedIds: [run.handOrder[0]] });
    const first = applyCommand(run, command);
    if (!first.ok) throw new Error(first.code);
    const duplicate = applyCommand(first.state, command);
    expect(duplicate.ok).toBe(true);
    if (!duplicate.ok) throw new Error(duplicate.code);
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.state).toBe(first.state);
    expect(duplicate.events).toEqual([]);
    const conflict = applyCommand(first.state, { ...command, action: { type: 'AbandonRun' } });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.code).toBe('command-id-conflict');
  });

  it('rejects arbitrary and consumed shelf IDs, but keeps the actual shelf through JSON restoration', () => {
    const shop = started();
    const before = JSON.stringify(shop);
    const bad = applyCommand(shop, next(shop, { type: 'BuyOffer', offerId: 'off-shelf' }));
    expect(bad.ok).toBe(false);
    expect(bad.state).toBe(shop);
    expect(JSON.stringify(shop)).toBe(before);
    const offer = shop.shop!.offers[0];
    const bought = send(shop, { type: 'BuyOffer', offerId: offer.offerId });
    expect(bought.gold).toBe(6 - offer.price);
    expect(bought.jokers.map(j => j.definitionId)).toEqual([offer.definitionId]);
    const again = applyCommand(bought, next(bought, { type: 'BuyOffer', offerId: offer.offerId }));
    expect(again.ok).toBe(false);
    expect(again.state).toBe(bought);
    expect(JSON.parse(JSON.stringify(bought)).shop).toEqual(bought.shop);
  });

  it('restores paid reroll cursor and protects rule/deck streams', () => {
    const shop = started();
    const nextShop = send(shop, { type: 'RerollShop' });
    expect(nextShop.gold).toBe(4);
    expect(nextShop.shop?.rerollCount).toBe(1);
    expect(nextShop.rng.deck).toEqual(shop.rng.deck);
    expect(nextShop.rng.rule).toEqual(shop.rng.rule);
    const restored = JSON.parse(JSON.stringify(nextShop)) as RunState;
    expect(send(restored, { type: 'RerollShop' })).toEqual(send(nextShop, { type: 'RerollShop' }));
    expect(table().handOrder).toEqual(send(send(nextShop, { type: 'LeaveShop' }), { type: 'EnterStage' }).handOrder);
  });

  it('uses the actual r1 luck roll instead of applying the bot preview score', () => {
    let tested = 0;
    for (let i = 0; i < 30; i++) {
      const run = table(`touye-${i}`, 'touye');
      const rng = SeededRng.restore(run.rng.rule);
      const luck = rng.next();
      const result = send(run, { type: 'PlayHand', selectedIds: [run.handOrder[0]] });
      expect(result.stage?.heat).toBe(luck < 0.5 ? 40 : 15);
      expect(result.rng.rule).toEqual(rng.snapshot());
      if (luck < 0.5) tested++;
    }
    expect(tested).toBeGreaterThan(0);
    expect(tested).toBeLessThan(30);
  });

  it('cannot spend, play or award rewards again after defeat', () => {
    let run = table();
    for (let i = 0; i < 4; i++) run = send(run, { type: 'PlayHand', selectedIds: [run.handOrder[0]] });
    expect(run.phase).toBe('run-lost');
    expect(run.gold).toBe(6);
    for (const action of [{ type: 'PlayHand', selectedIds: [run.handOrder[0]] }, { type: 'RerollShop' }, { type: 'EnterStage' }] as const) {
      const result = applyCommand(run, next(run, action));
      expect(result.ok).toBe(false);
      expect(result.state).toBe(run);
    }
  });

  it('validates reorder permutations and applies stored hand order, not click order', () => {
    const run = table();
    const reversed = [...run.handOrder].reverse();
    const ordered = send(run, { type: 'ReorderHand', ids: reversed });
    const played = send(ordered, { type: 'PlayHand', selectedIds: [run.handOrder[0], run.handOrder[1]] });
    expect(played.lastScore?.hand.cards.map(c => c.id)).toEqual([run.handOrder[1], run.handOrder[0]]);
    const bad = applyCommand(run, next(run, { type: 'ReorderHand', ids: Array(8).fill(run.handOrder[0]) }));
    expect(bad.ok).toBe(false);
    expect(bad.state).toBe(run);
  });

  it('keeps all active card instances in exactly one zone in 1000 fixed generated cases', () => {
    for (let seed = 0; seed < 1000; seed++) {
      let run = started(`generated-${seed}`, seed % 2 === 0 ? 'erxiang' : 'touye');
      const actions = new SeededRng(`generated-actions-${seed}`);
      for (let i = 0; i < 10; i++) {
        // Invariant generation needs diverse legal inputs, not exhaustive bot planning.
        const action = run.phase === 'await-input'
          ? { type: 'PlayHand' as const, selectedIds: actions.shuffle(run.handOrder).slice(0, actions.integer(1, Math.min(5, run.handOrder.length))) }
          : chooseAction(publicView(run));
        if (!action) break;
        const restored = JSON.parse(JSON.stringify(run)) as RunState;
        const continuation = applyCommand(restored, next(restored, action));
        expect(continuation.ok).toBe(true);
        run = send(run, action);
        assertRunInvariants(run);
        expect(continuation.state).toEqual(run);
      }
    }
  }, 15000); // Budget for 1000 checkpoints, not a device-performance acceptance.

  it('commits a last-hand clear before judging exhaustion and cannot reward it twice', () => {
    const run = table();
    run.stage!.handsLeft = 1;
    run.stage!.targetHeat = 60;
    const command = next(run, { type: 'PlayHand', selectedIds: [run.handOrder[0]] });
    const first = applyCommand(run, command);
    if (!first.ok) throw new Error(first.code);
    expect(first.state.phase).toBe('stage-cleared');
    expect(first.state.stage?.handsLeft).toBe(0);
    expect(first.state.gold).toBe(12); // r1 stage 1 base reward 6, no remaining-hand bonus.
    expect(first.state.stage?.goldEarned).toBe(6);
    const retry = applyCommand(first.state, command);
    expect(retry.ok).toBe(true);
    expect(retry.state).toBe(first.state);
    const later = applyCommand(first.state, next(first.state, command.action));
    expect(later.ok).toBe(false);
    expect(later.state).toBe(first.state);
  });

  it('never mutates a frozen input state when committing a legal play', () => {
    const freeze = (value: object): void => {
      Object.freeze(value);
      for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
    };
    const run = table();
    const before = JSON.stringify(run);
    freeze(run);
    const played = send(run, { type: 'PlayHand', selectedIds: [run.handOrder[0]] });
    expect(JSON.stringify(run)).toBe(before);
    expect(played.stage?.heat).toBe(60);
  });
});

describe('shared UI/headless command path', () => {
  it('prevents scenes from mutating the exposed checkpoint or command journal', () => {
    const controller = new RunController(started());
    expect(() => { controller.state.gold = 999; }).toThrow();
    expect(() => { controller.state.shop!.offers.pop(); }).toThrow();
    controller.dispatch({ type: 'LeaveShop' });
    expect(Object.isFrozen(controller.state)).toBe(true);
    expect(Object.isFrozen(controller.journal)).toBe(true);
  });
  it('replays a controller journal to exactly the same state and RNG', () => {
    const controller = new RunController(started('journal', 'erxiang'));
    for (let i = 0; i < 10; i++) {
      const action = chooseAction(publicView(controller.state));
      if (!action) break;
      expect(controller.dispatch(action).ok).toBe(true);
    }
    let replay = started('journal', 'erxiang');
    for (const command of controller.journal) {
      const result = applyCommand(replay, command);
      if (!result.ok) throw new Error(result.code);
      replay = result.state;
    }
    expect(replay).toEqual(controller.state);
    expect(stateHash(replay)).toBe(stateHash(controller.state));
    const shuffledKeys = Object.fromEntries(Object.entries(replay).reverse()) as unknown as RunState;
    expect(stateHash(shuffledKeys)).toBe(stateHash(replay));
  });

  it('exposes no draw pile, rule RNG cursor or future shop to bot policy', () => {
    const view = publicView(table());
    expect(view).not.toHaveProperty('drawPile');
    expect(view).not.toHaveProperty('rng');
    expect(view).not.toHaveProperty('deckInstances');
    const controller = new RunController(table());
    const before = JSON.stringify(controller.state);
    for (let i = 0; i < 100; i++) chooseAction(publicView(controller.state));
    expect(JSON.stringify(controller.state)).toBe(before);
  });

  it('records real three-stage runs and never has a second scoring loop', () => {
    const outcomes = Array.from({ length: 10 }, (_, i) => simulateRun(`balance-${i + 1}`, 'erxiang'));
    const winner = outcomes.find(run => run.state.phase === 'run-won');
    expect(winner).toBeDefined();
    if (!winner) throw new Error('no fixture win');
    expect(winner.state.stageIndex).toBe(3);
    expect(winner.journal.filter(c => c.action.type === 'EnterStage')).toHaveLength(3);
    assertRunInvariants(winner.state);
  });
});
