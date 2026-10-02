import {describe, expect, it} from 'vitest';
import {applyCommand, assertRunInvariants, createRun, stateHash, type Action, type R2RunState} from '../src/domain/run';
import {R2_JOKERS} from '../src/content/r2Schema';
import {makeCheckpoint, readCheckpoint} from '../src/application/checkpoint';

function send(state:R2RunState, action:Action):R2RunState {
  const result=applyCommand(state,{runId:state.runId,commandId:`natural/${state.commandSeq+1}`,
    expectedSeq:state.commandSeq,action});
  if(!result.ok)throw Error(result.code);
  assertRunInvariants(result.state);
  return result.state;
}
function highest(state:R2RunState):string {
  // Public current hand only. No deck, future RNG or engine-private choice method.
  return [...state.handOrder].sort((a,b)=>state.deckInstances.find(c=>c.id===b)!.rank-state.deckInstances.find(c=>c.id===a)!.rank)[0];
}

describe('C02 ordinary command acquisition and persistence',()=>{
  it('can buy, save, enter and score with every one of the 72 definitions from earned normal shops',()=>{
    const proofs=new Map<string,{seed:string;shelf:'initial'|'earned';price:number;seq:number}>();
    for(let index=0;index<400&&proofs.size<72;index++) {
      const seed=`c02-acquire-${index}`;
      const initial=createRun({rulesVersion:'r2',seed,runId:`natural/${index}`,characterId:'amo'});
      let earned=send(send(initial,{type:'LeaveShop'}),{type:'EnterStage'});
      while(earned.phase==='await-input')earned=send(earned,{type:'PlayHand',selectedIds:[highest(earned)]});
      const shops:{state:R2RunState;shelf:'initial'|'earned'}[]=[{state:initial,shelf:'initial'}];
      if(earned.phase==='stage-cleared')shops.push({state:send(earned,{type:'OpenShop'}),shelf:'earned'});
      for(const {state,shelf} of shops)for(const offer of state.shop!.offers) {
        if(proofs.has(offer.definitionId)||offer.price>state.gold)continue;
        // Each proof is an independent legal command branch of the unchanged earned shop.
        // Never add gold, inject an offer or claim this is one human UI run.
        const before=stateHash(state),bought=send(state,{type:'BuyOffer',offerId:offer.offerId});
        expect(stateHash(state)).toBe(before);
        expect(bought.gold).toBe(state.gold-offer.price);
        expect(bought.rng).toEqual(state.rng);
        expect(bought.jokers.map(joker=>joker.definitionId)).toEqual([offer.definitionId]);
        const saved=makeCheckpoint(bought,[]),restored=readCheckpoint(JSON.parse(JSON.stringify(saved)));
        expect(restored.ok).toBe(true);
        if(!restored.ok)throw Error(restored.code);
        expect(stateHash(restored.checkpoint.state)).toBe(stateHash(bought));
        const table=send(send(bought,{type:'LeaveShop'}),{type:'EnterStage'});
        const played=send(table,{type:'PlayHand',selectedIds:[highest(table)]});
        expect(played.lastTrace!.sourceJokers[0].definitionId).toBe(offer.definitionId);
        expect(readCheckpoint(JSON.parse(JSON.stringify(makeCheckpoint(played,[])))).ok).toBe(true);
        proofs.set(offer.definitionId,{seed,shelf,price:offer.price,seq:bought.commandSeq});
      }
    }
    expect([...proofs.keys()].sort()).toEqual(R2_JOKERS.map(definition=>definition.id).sort());
    expect(proofs.size).toBe(72);
    expect([...proofs.values()].some(proof=>proof.shelf==='earned')).toBe(true);
    console.info('C02 ordinary command branches',JSON.stringify(Object.fromEntries(proofs)));
  });
});
