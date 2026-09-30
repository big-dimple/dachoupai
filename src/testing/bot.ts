import { evaluateHand } from '../cards/handEvaluator';
import type { PlayingCard } from '../cards/types';
import { RunController } from '../application/RunController';
import { createRun, jokerIds, R1_LIMITS, type Action, type RunState, type ShopOffer } from '../domain/run';
import type { CharacterId } from '../domain/characters';
import type { JokerId } from '../jokers/types';
import { scoreHand } from '../scoring/scoreHand';

export interface PublicRunView {
  phase: RunState['phase'];
  characterId: CharacterId;
  gold: number;
  hand: PlayingCard[];
  stage: RunState['stage'];
  jokerIds: JokerId[];
  offers: ShopOffer[];
}

export function publicView(state: RunState): PublicRunView {
  return {
    phase: state.phase, characterId: state.characterId, gold: state.gold,
    hand: state.handOrder.map(id => ({ ...state.deckInstances.find(card => card.id === id)! })),
    stage: state.stage ? { ...state.stage } : null, jokerIds: jokerIds(state),
    offers: state.shop?.offers.filter(offer => !offer.consumed).map(offer => ({ ...offer })) ?? [],
  };
}

const BUY_PRIORITY: JokerId[] = ['huimaqiang', 'tiesuanpan', 'jiedongfeng', 'mantangcai', 'pengci'];

/** Public-information one-step policy. It proposes commands; it never settles a hand. */
export function chooseAction(view: PublicRunView): Action | null {
  if (view.phase === 'stage-ready') return { type: 'EnterStage' };
  if (view.phase === 'stage-cleared') return { type: 'OpenShop' };
  if (view.phase === 'shop') {
    const offer = BUY_PRIORITY.map(id => view.offers.find(offer => offer.definitionId === id && offer.price <= view.gold && !view.jokerIds.includes(id)))
      .find(offer => offer && view.jokerIds.length < R1_LIMITS.jokerSlots);
    return offer ? { type: 'BuyOffer', offerId: offer.offerId } : { type: 'LeaveShop' };
  }
  if (view.phase !== 'await-input' || !view.stage) return null;
  let best: { ids: string[]; estimate: number } | null = null;
  for (let mask = 1; mask < 1 << view.hand.length; mask++) {
    const picked = view.hand.filter((_, index) => mask & (1 << index));
    if (picked.length > R1_LIMITS.maxSelected) continue;
    const hand = evaluateHand(picked);
    const context = { previousHandType: view.stage.previousHandType ?? undefined, handsBeforePlay: view.stage.handsLeft, playIndex: view.stage.playIndex + 1, jokerIds: view.jokerIds };
    // r1 touye's published probability, not the hidden next RNG value.
    const estimate = view.characterId === 'touye'
      ? (scoreHand(hand, view.characterId, { ...context, luckRoll: 0 }).finalHeat + scoreHand(hand, view.characterId, { ...context, luckRoll: 1 }).finalHeat) / 2
      : scoreHand(hand, view.characterId, { ...context, luckRoll: 0.5 }).finalHeat;
    if (!best || estimate > best.estimate) best = { ids: picked.map(card => card.id), estimate };
  }
  return best ? { type: 'PlayHand', selectedIds: best.ids } : { type: 'AbandonRun' };
}

export function simulateRun(seed: string, characterId: CharacterId): { state: RunState; journal: RunController['journal'] } {
  const controller = new RunController(createRun({ seed, characterId, runId: `bot/${seed}/${characterId}` }));
  for (let i = 0; i < 100; i++) {
    const action = chooseAction(publicView(controller.state));
    if (!action) return { state: controller.state, journal: controller.journal };
    const result = controller.dispatch(action);
    if (!result.ok) throw new Error(`Bot command rejected: ${result.code}`);
  }
  throw new Error('Bot exceeded bounded r1 run length');
}
