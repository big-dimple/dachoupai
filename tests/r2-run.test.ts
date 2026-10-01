import {describe,expect,it} from 'vitest';
import {applyCommand,assertRunInvariants,createRun,stateHash,type Action,type R2RunState} from '../src/domain/run';
import {R2_JOKERS} from '../src/content/r2Schema';
import type {Rank} from '../src/cards/types';
const start=(seed='economy',characterId:'amo'|'touye'='amo')=>createRun({seed,characterId,runId:`test/${seed}`,rulesVersion:'r2'});
const command=(state:R2RunState,action:Action)=>({runId:state.runId,commandId:`cmd-${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
const send=(state:R2RunState,action:Action)=>{
  const result=applyCommand(state,command(state,action));expect(result.ok).toBe(true);if(!result.ok)throw new Error(result.code);
  assertRunInvariants(result.state);return result.state;
};
const table=(seed='economy')=>send(send(start(seed),{type:'LeaveShop'}),{type:'EnterStage'});
describe('r2 run economy and resources',()=>{
  it('keeps unavailable consumable operations explicit and never consumes failed uses',()=>{
    const run=start();run.consumables=[{instanceId:'item-1',definitionId:'T99'}];
    const before=JSON.stringify(run),use=applyCommand(run,command(run,{type:'UseConsumable',instanceId:'item-1',targetIds:[]}));
    expect(use.ok).toBe(false);if(!use.ok)expect(use.code).toBe('consumable-not-enabled');expect(JSON.stringify(run)).toBe(before);
    const destroyed=send(run,{type:'DestroyConsumable',instanceId:'item-1'});expect(destroyed.consumables).toEqual([]);
    const bad=structuredClone(run);bad.consumables[0].definitionId='unknown';expect(()=>assertRunInvariants(bad)).toThrow();
    const future=start();future.longTermItems=['U99'];expect(()=>assertRunInvariants(future)).toThrow();
    const blocked=applyCommand(future,command(future,{type:'RerollShop'}));expect(blocked.ok).toBe(false);if(!blocked.ok)expect(blocked.code).toBe('long-term-not-enabled');expect(blocked.state).toBe(future);
  });
  it('starts at a deterministic saved shop with an affordable offer in 100 fixed seeds',()=>{
    for(let i=0;i<100;i++){
      const run=start(`initial-${i}`),same=start(`initial-${i}`);
      expect(run.phase).toBe('shop');expect(run.gold).toBe(6);
      expect(run.shop?.offers).toHaveLength(3);expect(run.shop?.offers.some(o=>o.price<=6)).toBe(true);
      expect(run.shop).toEqual(same.shop);expect(run.rng).toEqual(same.rng);
      expect(new Set(run.shop!.offers.map(o=>o.definitionId)).size).toBe(3);
    }
  });
  it('buys a concrete shelf ID once, retains paid price and does not refill other positions',()=>{
    const run=start(),offer=run.shop!.offers.find(o=>o.price<=run.gold)!;
    const cmd=command(run,{type:'BuyOffer',offerId:offer.offerId}),first=applyCommand(run,cmd);if(!first.ok)throw new Error(first.code);
    const bought=first.state;
    expect(bought.gold).toBe(6-offer.price);expect(bought.jokers[0].paidPrice).toBe(offer.price);
    expect(bought.shop?.offers).toHaveLength(3);expect(bought.shop?.offers.find(o=>o.offerId===offer.offerId)?.consumed).toBe(true);
    expect(bought.rng).toEqual(run.rng);
    const retry=applyCommand(bought,cmd);expect(retry.ok&&retry.duplicate).toBe(true);expect(retry.state).toBe(bought);
    const again=applyCommand(bought,command(bought,cmd.action));expect(again.ok).toBe(false);expect(again.state).toBe(bought);
  });
  it('does not let a cached receipt bypass the active content-version boundary',()=>{
    const run=start(),offer=run.shop!.offers.find(o=>o.price<=run.gold)!,cmd=command(run,{type:'BuyOffer',offerId:offer.offerId});
    const result=applyCommand(run,cmd);if(!result.ok)throw new Error(result.code);
    const incompatible={...result.state,contentHash:'incompatible-content'},retry=applyCommand(incompatible,cmd);
    expect(retry.ok).toBe(false);expect(retry.state).toBe(incompatible);if(!retry.ok)expect(retry.code).toBe('incompatible-version');
  });
  it('rejects insufficient funds and full slots without spending or touching RNG',()=>{
    for(const boundary of ['money','slots'] as const){
      const run=start();if(boundary==='money')run.gold=0;
      else run.jokers=R2_JOKERS.slice(0,5).map(d=>({instanceId:`owned/${d.id}`,definitionId:d.id,paidPrice:4,growth:{}}));
      const before=JSON.stringify(run),offer=run.shop!.offers[0];
      const result=applyCommand(run,command(run,{type:'BuyOffer',offerId:offer.offerId}));
      expect(result.ok).toBe(false);expect(result.state).toBe(run);expect(JSON.stringify(run)).toBe(before);
      if(!result.ok)expect(result.code).toBe(boundary==='money'?'not-enough-gold':'slots-full');
    }
  });
  it('sells only the named instance using actual paid price, with no instant shelf refresh',()=>{
    const run=start(),offer=run.shop!.offers.find(o=>o.price<=run.gold)!;
    const bought=send(run,{type:'BuyOffer',offerId:offer.offerId}),instance=bought.jokers[0];
    const sold=send(bought,{type:'SellJoker',instanceId:instance.instanceId});
    expect(sold.gold).toBe(bought.gold+Math.max(1,Math.floor(instance.paidPrice/2)));
    expect(sold.jokers).toEqual([]);expect(sold.shop).toEqual(bought.shop);expect(sold.rng).toEqual(bought.rng);
    const repeat=applyCommand(sold,command(sold,{type:'SellJoker',instanceId:instance.instanceId}));expect(repeat.ok).toBe(false);expect(repeat.state).toBe(sold);
    const free=structuredClone(bought);free.jokers[0].paidPrice=0;
    expect(send(free,{type:'SellJoker',instanceId:instance.instanceId}).gold).toBe(free.gold+1);
  });
  it('reroll fees increase per shop, cap at 10 and restore the exact shelf cursor',()=>{
    let run=start();run.gold=100; // Economy boundary fixture, not a UI win.
    for(let n=0;n<10;n++){
      const before=run,restored=JSON.parse(JSON.stringify(run)) as R2RunState;
      run=send(run,{type:'RerollShop'});
      expect(run.gold).toBe(before.gold-Math.min(10,2+n));expect(run.shop?.rerollCount).toBe(n+1);
      expect(run).toEqual(send(restored,{type:'RerollShop'}));
      expect(run.rng.deck).toEqual(before.rng.deck);expect(run.rng.rule).toEqual(before.rng.rule);
    }
  });
  it('a legal full five-slot build still has new24-card reroll candidates, excluding owned identities',()=>{
    const run=start();run.gold=20;run.jokers=R2_JOKERS.slice(0,5).map(d=>({instanceId:`owned/${d.id}`,definitionId:d.id,paidPrice:4,growth:{}}));
    assertRunInvariants(run);const result=send(run,{type:'RerollShop'});expect(result.gold).toBe(18);expect(result.shop!.offers).toHaveLength(3);
    expect(result.shop!.offers.every(o=>!run.jokers.some(j=>j.definitionId===o.definitionId))).toBe(true);
  });
  it('spends a discard instead of a hand and retains previous type/play index',()=>{
    let run=table();run=send(run,{type:'PlayHand',selectedIds:[run.handOrder[0]]});
    const before=run,ids=run.handOrder.slice(0,3);run=send(run,{type:'DiscardHand',selectedIds:[...ids].reverse()});
    expect(run.stage?.discardsLeft).toBe(2);expect(run.stage?.handsLeft).toBe(before.stage?.handsLeft);
    expect(run.stage?.previousHandType).toBe(before.stage?.previousHandType);expect(run.stage?.playIndex).toBe(before.stage?.playIndex);
    expect(run.discardPile).toEqual(ids);expect(run.handOrder).toHaveLength(8);
    expect(run.lastTrace).toEqual(before.lastTrace);expect(run.rng.rule).toEqual(before.rng.rule);
  });
  it('rejects duplicate/unknown/empty/over-limit/no-resource discards atomically',()=>{
    const run=table();
    for(const selectedIds of [[],['missing'],[run.handOrder[0],run.handOrder[0]],run.handOrder.slice(0,6)]){
      const result=applyCommand(run,command(run,{type:'DiscardHand',selectedIds}));expect(result.ok).toBe(false);expect(result.state).toBe(run);
    }
    run.stage!.discardsLeft=0;const before=stateHash(run);
    expect(applyCommand(run,command(run,{type:'DiscardHand',selectedIds:[run.handOrder[0]]})).ok).toBe(false);expect(stateHash(run)).toBe(before);
  });
  it('keeps modified persistent instances through a natural clear and next-stage shuffle',()=>{
    let run=start('persistent');
    // A valid 20-instance modified-deck checkpoint; only real commands progress it.
    run.deckInstances=Array.from({length:20},(_,i)=>({id:`copy-${i}`,rank:((i%9)+2) as Rank,suit:'spades' as const}));
    run.drawPile=run.deckInstances.map(c=>c.id);const persistent=structuredClone(run.deckInstances);
    run=send(send(run,{type:'LeaveShop'}),{type:'EnterStage'});
    run=send(run,{type:'PlayHand',selectedIds:run.handOrder.slice(0,5)});expect(run.phase).toBe('stage-cleared');
    run=send(send(send(run,{type:'OpenShop'}),{type:'LeaveShop'}),{type:'EnterStage'});
    expect(run.deckInstances).toEqual(persistent);expect(run.deckInstances).toHaveLength(20);
    expect(run.playedPile).toEqual([]);expect(run.discardPile).toEqual([]);expect(run.drawPile).toHaveLength(12);
    expect(run.stage?.handsLeft).toBe(4);expect(run.stage?.discardsLeft).toBe(3);
  });
  it('when the deck is empty, permits the remaining card then ends without invisible refills',()=>{
    const run=table();const kept=run.handOrder[0];
    run.discardPile=[...run.drawPile,...run.handOrder.filter(id=>id!==kept)];run.drawPile=[];run.handOrder=[kept];
    const result=send(run,{type:'PlayHand',selectedIds:[kept]});
    expect(result.phase).toBe('run-lost');expect(result.outcome?.reason).toBe('no-legal-cards');expect(result.gold).toBe(6);
    expect(result.handOrder).toEqual([]);expect(result.stage?.handsLeft).toBe(3);
  });
  it('reorder permutations preserve instances and terminal phases reject every resource action',()=>{
    const run=start();run.gold=100;let bought=run;
    for(const offer of run.shop!.offers.slice(0,2))bought=send(bought,{type:'BuyOffer',offerId:offer.offerId});
    const reversed=bought.jokers.map(j=>j.instanceId).reverse(),ordered=send(bought,{type:'ReorderJokers',ids:reversed});
    expect(ordered.jokers.map(j=>j.instanceId)).toEqual(reversed);expect(ordered.gold).toBe(bought.gold);
    const lost=send(ordered,{type:'AbandonRun'});
    for(const action of [{type:'BuyOffer',offerId:run.shop!.offers[0].offerId},{type:'SellJoker',instanceId:reversed[0]},{type:'RerollShop'},{type:'PlayHand',selectedIds:['x']},{type:'DiscardHand',selectedIds:['x']}] as Action[]){
      const result=applyCommand(lost,command(lost,action));expect(result.ok).toBe(false);expect(result.state).toBe(lost);
    }
  });
});
