import {describe,expect,it} from 'vitest';
import {applyCommand,assertRunInvariants,createRun,stateHash,type Action,type Command,type R2RunState} from '../src/domain/run';
import type {Edition} from '../src/cards/types';
import {evaluateR2Hand} from '../src/domain/evaluateR2';
import {r2ConsumableCapacity,r2InterestCap} from '../src/domain/r2Run';
import {r2ToolSupported} from '../src/domain/r2ToolRuntime';
import type {R2Offer,R2ShopState} from '../src/domain/r2Shop';
import {SavedRun,type SaveSlots,type SaveStore} from '../src/application/SavedRun';
import {makeCheckpoint} from '../src/application/checkpoint';

// Handwritten D24 price goldens; neither prices nor expected behavior are read from the catalog.
const ITEMS=[['U01',10],['U02',12],['U03',16],['U04',10],['U05',12],['U06',12],
  ['U07',10],['U08',12],['U09',14],['U10',10],['U11',10],['U12',10]] as const;
type FutureOffer=R2Offer&{edition?:Edition};
type FutureShop=Omit<R2ShopState,'offers'>&{offers:FutureOffer[];toolOffers:FutureOffer[];itemOffers:FutureOffer[]};
type Shelf='offers'|'toolOffers'|'itemOffers';
const shop=(state:R2RunState)=>state.shop as FutureShop;
const command=(state:R2RunState,action:Action):Command=>({runId:state.runId,commandId:`economy/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
const send=(state:R2RunState,action:Action):R2RunState=>{
  const result=applyCommand(state,command(state,action));if(!result.ok)throw Error(result.code);assertRunInvariants(result.state);return result.state;
};
function fixture(seed='c01-economy'):R2RunState {
  const state=createRun({seed,runId:`economy/${seed}`,characterId:'erxiang',rulesVersion:'r2'});state.gold=100;
  // Specified shelves and funding are explicit fixtures, not evidence of natural acquisition.
  state.shop=Object.assign(state.shop!,{toolOffers:[],itemOffers:[]});return state;
}
function offer(state:R2RunState,shelf:Shelf,definitionId:string,price:number,edition?:Edition):string {
  const offerId=`fixture/${shelf}/${definitionId}/${state.commandSeq}`;
  shop(state)[shelf]=[{offerId,definitionId,price,consumed:false,...(edition===undefined?{}:{edition})}];return offerId;
}
const buy=(state:R2RunState,shelf:Shelf,id:string,price:number,edition?:Edition)=>send(state,{type:'BuyOffer',offerId:offer(state,shelf,id,price,edition)});
const items=(state:R2RunState,...entries:readonly (readonly [string,number])[])=>entries.reduce((next,[id,price])=>buy(next,'itemOffers',id,price),state);
function rejected(state:R2RunState,action:Action):void {
  const before=structuredClone(state),hash=stateHash(state),result=applyCommand(state,command(state,action));expect(result.ok).toBe(false);if(result.ok)return;
  expect(result.code).not.toBe('long-term-not-enabled');expect(result.code).not.toBe('consumable-not-enabled');
  expect(result.state).toBe(state);expect(state).toEqual(before);expect(stateHash(state)).toBe(hash);expect(state.rng).toEqual(before.rng);
}
function hand(state:R2RunState,types:readonly string[],cardCount?:number):string[]|undefined {
  const known=state.handOrder.map(id=>state.deckInstances.find(card=>card.id===id)!);
  for(let mask=1;mask<(1<<known.length);mask++){
    const cards=known.filter((_,index)=>!!(mask&(1<<index)));if(cards.length>5||cardCount!==undefined&&cards.length!==cardCount)continue;
    if(types.includes(evaluateR2Hand(cards,{}).type))return cards.map(card=>card.id);
  }
}
type StagePlan={state:R2RunState;finalIds:string[]};
function winningHand(state:R2RunState):StagePlan|undefined {
  let finalIds=hand(state,['straight','flush','straight-flush']);
  while(!finalIds&&state.stage!.discardsLeft>0){
    const cost=state.stage!.doubleDiscardBeforeFirstPlay&&state.stage!.playIndex===0?2:1;if(state.stage!.discardsLeft<cost)break;
    state=send(state,{type:'DiscardHand',selectedIds:state.handOrder.slice(0,5)});finalIds=hand(state,['straight','flush','straight-flush']);
  }
  if(finalIds)return {state,finalIds};
}
function stagePlan(boss:boolean,owned:readonly (readonly [string,number])[],lowTypes:readonly ('high-card'|'pair')[]=[],seedStart=0):StagePlan {
  // Each attempt uses actual purchases, skip/entry, discard and Play commands. Only visible hand IDs are selected.
  // Conditional existing Jokers keep the low plays low, then make a straight/flush a real winning hand.
  for(let seed=seedStart;seed<256;seed++){
    let state=items(fixture(`c01-economy-stage-${seed}`),...owned);
    state=buy(state,'offers','c04',4);state=buy(state,'offers','jiedongfeng',6);
    if(boss)for(const action of [{type:'SkipStage'},{type:'OpenShop'},{type:'SkipStage'},{type:'OpenShop'}] as const)state=send(state,action);
    state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
    for(const item of [...state.consumables])state=send(state,{type:'DestroyConsumable',instanceId:item.instanceId});
    let usable=true;
    for(const type of lowTypes){
      const count=type==='high-card'?1:2;let ids=hand(state,[type],count);
      while(!ids&&state.stage!.discardsLeft>0){
        const cost=state.stage!.doubleDiscardBeforeFirstPlay&&state.stage!.playIndex===0?2:1;if(state.stage!.discardsLeft<cost)break;
        state=send(state,{type:'DiscardHand',selectedIds:state.handOrder.slice(0,5)});ids=hand(state,[type],count);
      }
      if(!ids){usable=false;break;}
      state=send(state,{type:'PlayHand',selectedIds:ids});if(state.phase!=='await-input'){usable=false;break;}
    }
    if(!usable)continue;
    const final=winningHand(state);if(final)return final;
  }
  throw Error('missing reachable economy stage fixture');
}

describe('C01 three distinct shop shelves and atomic purchases',()=>{
  it('creates three Joker slots, one tool and one item with globally unique IDs and an affordable ordinary initial Joker',()=>{
    const state=createRun({seed:'c01-initial-shelves',runId:'c01-initial-shelves',characterId:'amo',rulesVersion:'r2'}),s=shop(state);
    expect(s.offers).toHaveLength(3);expect(s.toolOffers).toHaveLength(1);expect(s.itemOffers).toHaveLength(1);
    const all=[...s.offers,...s.toolOffers,...s.itemOffers];expect(new Set(all.map(o=>o.offerId)).size).toBe(all.length);
    expect(s.offers.some(o=>o.price<=6&&(o.edition===undefined||o.edition==='none'))).toBe(true);
    expect(s.toolOffers.every(o=>!o.definitionId.startsWith('U')&&o.definitionId!=='T16')).toBe(true);
    expect(s.itemOffers.every(o=>o.definitionId.startsWith('U'))).toBe(true);
  });
  it.each(ITEMS)('buys %s for exactly %s gold through the item shelf without refill or RNG consumption',(id,price)=>{
    const state=fixture(),offerId=offer(state,'itemOffers',id,price),before=structuredClone(state),next=send(state,{type:'BuyOffer',offerId});
    expect(next.gold).toBe(100-price);expect(next.longTermItems).toEqual([id]);expect(next.consumables).toEqual([]);expect(next.jokers).toEqual([]);
    expect(shop(next).purchases).toBe(1);expect(shop(next).itemOffers).toEqual([{...shop(before).itemOffers[0],consumed:true}]);
    expect(shop(next).offers).toEqual(shop(before).offers);expect(shop(next).toolOffers).toEqual(shop(before).toolOffers);
    expect(next.rng).toEqual(before.rng);expect(state).toEqual(before);
  });
  it('buys independent duplicate tool instances and a foil Joker through the shared BuyOffer entry',()=>{
    let state=buy(fixture(),'toolOffers','T03',4);const first=state.consumables[0];state=buy(state,'toolOffers','T03',4);
    expect(state.consumables.map(c=>c.definitionId)).toEqual(['T03','T03']);expect(state.consumables[1].instanceId).not.toBe(first.instanceId);
    state=buy(state,'offers','pengci',6,'foil');expect(state.jokers[0]).toMatchObject({definitionId:'pengci',edition:'foil',paidPrice:6});expect(state.gold).toBe(86);
    const sold=send(state,{type:'SellJoker',instanceId:state.jokers[0].instanceId});expect(sold.gold).toBe(89);
  });
  it.each([['offers','T03'],['toolOffers','U08'],['itemOffers','T03']] as const)('rejects the wrong %s product kind %s without a charge',(shelf,id)=>{
    const state=buy(fixture(),'itemOffers','U08',12),offerId=offer(state,shelf,id,4);rejected(state,{type:'BuyOffer',offerId});
  });
  it('rejects duplicate offer IDs across the three shelves before publishing a purchase',()=>{
    const state=fixture(),id=offer(state,'offers','pengci',4);shop(state).toolOffers=[{offerId:id,definitionId:'T03',price:4,consumed:false}];
    rejected(state,{type:'BuyOffer',offerId:id});
  });
  it('rejects unaffordable or incorrect-price items without spending the first-purchase coupon',()=>{
    let state=buy(fixture(),'itemOffers','U08',12);state.purchaseCoupons=1;state.gold=1;
    let offerId=offer(state,'itemOffers','U01',10);rejected(state,{type:'BuyOffer',offerId});
    state.gold=100;offerId=offer(state,'itemOffers','U01',9);rejected(state,{type:'BuyOffer',offerId});
  });
  it('rejects full consumable inventory without replacing or using either held tool',()=>{
    let state=buy(fixture(),'toolOffers','T03',4);state=buy(state,'toolOffers','T04',4);
    const id=offer(state,'toolOffers','T05',4);rejected(state,{type:'BuyOffer',offerId:id});
  });
  it('rejects duplicate long-term items and a fifth distinct item without an implicit sale',()=>{
    let state=items(fixture(),['U01',10],['U02',12],['U03',16],['U08',12]);
    let id=offer(state,'itemOffers','U01',10);rejected(state,{type:'BuyOffer',offerId:id});
    id=offer(state,'itemOffers','U04',10);rejected(state,{type:'BuyOffer',offerId:id});
  });
  it('only an actual Joker purchase triggers e05, and a consumed offer or repeated command does not trigger it again',()=>{
    const state=fixture();state.jokers=[{instanceId:'growth-source',definitionId:'e05',paidPrice:6,growth:{}}];
    let next=buy(state,'toolOffers','T03',4);next=buy(next,'itemOffers','U08',12);expect(next.jokers[0].growth).toEqual({});
    const cmd=command(next,{type:'BuyOffer',offerId:offer(next,'offers','pengci',4)}),result=applyCommand(next,cmd);expect(result.ok).toBe(true);if(!result.ok)return;
    expect(result.state.jokers[0].growth.heat).toEqual({n:'8',d:'1'});
    const duplicate=applyCommand(result.state,cmd);expect(duplicate.ok&&duplicate.duplicate).toBe(true);expect(duplicate.state).toBe(result.state);
    rejected(result.state,{type:'BuyOffer',offerId:cmd.action.type==='BuyOffer'?cmd.action.offerId:''});
  });
});

describe('C01 long-term resource and shop goldens',()=>{
  it.each([['U01',10,9,3,4],['U02',12,8,4,4],['U03',16,8,3,5]] as const)('%s at %s gold freezes next-stage hand=%s / discard=%s / play=%s budgets',(id,price,handLimit,discards,hands)=>{
    let state=buy(fixture(),'itemOffers',id,price);state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
    expect(state.handOrder).toHaveLength(handLimit);expect(state.stage).toMatchObject({handLimit,initialDiscards:discards,discardsLeft:discards,initialHands:hands,handsLeft:hands});
    state=send(state,{type:'DiscardHand',selectedIds:[state.handOrder[0]]});state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
    expect(state.stage).toMatchObject({handLimit,initialDiscards:discards,discardsLeft:discards-1,initialHands:hands,handsLeft:hands-1,playIndex:1});
  });
  it('U04 gives interest cap seven, stacks with e04 to nine, and applies that exact cap at a real clear',()=>{
    let state=buy(fixture(),'itemOffers','U04',10);expect(r2InterestCap(state)).toBe(7);
    state.jokers=[{instanceId:'interest-source',definitionId:'e04',paidPrice:6,growth:{}}];expect(r2InterestCap(state)).toBe(9);
    const plan=stagePlan(false,[['U04',10]]);plan.state.jokers.push({instanceId:'interest-source',definitionId:'e04',paidPrice:6,growth:{}});
    const next=send(plan.state,{type:'PlayHand',selectedIds:plan.finalIds});expect(next.phase).toBe('stage-cleared');expect(next.gold-plan.state.gold).toBe(16); // 4 base + 3 unused hands + 9 interest.
  });
  it('U05 does not refill the current Joker shelf, then generates four on the next paid reroll',()=>{
    const state=fixture(),old=[...shop(state).offers],id=offer(state,'itemOffers','U05',12),bought=send(state,{type:'BuyOffer',offerId:id});
    expect(shop(bought).offers).toEqual(old);const next=send(bought,{type:'RerollShop'});expect(shop(next).offers).toHaveLength(4);
    expect(new Set(shop(next).offers.map(o=>o.definitionId)).size).toBe(4);expect(shop(next).itemOffers).toEqual(shop(bought).itemOffers);
  });
  it('U06 subtracts one from each capped paid reroll price with a one-gold floor',()=>{
    let state=buy(fixture(),'itemOffers','U06',12);const before=state.gold;
    for(let count=0;count<10;count++){const old=state,expected=[1,2,3,4,5,6,7,8,9,9][count];state=send(state,{type:'RerollShop'});expect(old.gold-state.gold).toBe(expected);}
    expect(before-state.gold).toBe(54);expect(shop(state).rerollCount).toBe(10);
  });
  it('U07 permits a third held tool and rejects a fourth without automatic use or replacement',()=>{
    let state=buy(fixture(),'itemOffers','U07',10);expect(r2ConsumableCapacity(state)).toBe(3);
    for(const id of ['T03','T04','T05'])state=buy(state,'toolOffers',id,4);expect(state.consumables).toHaveLength(3);
    const id=offer(state,'toolOffers','T06',4);rejected(state,{type:'BuyOffer',offerId:id});
  });
  it.each([['pair-majority',['pair','pair','pair'],'pair'],['low-to-high-tie',['high-card','pair','high-card','pair'],'high-card'],['cap-skip',['high-card','pair','high-card'],'high-card']] as const)('U09 uses real chapter Play counts for %s, never redraws a capped choice',(name,types,expected)=>{
    const plan=stagePlan(true,[['U03',16],['U09',14]],types);if(name==='cap-skip')plan.state.handLevels['high-card']=30;
    const levels=structuredClone(plan.state.handLevels),rng=structuredClone(plan.state.rng),next=send(plan.state,{type:'PlayHand',selectedIds:plan.finalIds});
    expect(next.phase).toBe('stage-cleared');expect(next.stage?.index).toBe(2);expect(next.handLevels[expected]).toBe(name==='cap-skip'?30:levels[expected]!+1);
    for(const type of Object.keys(levels) as (keyof typeof levels)[])if(type!==expected)expect(next.handLevels[type]).toBe(levels[type]);
    expect(next.rng).toEqual(rng);if(name==='cap-skip')expect(next.handLevels.pair).toBe(levels.pair);
  });
  it('U10 does not discount its own purchase and cannot retroactively restore the current first-purchase opportunity',()=>{
    let state=buy(fixture(),'itemOffers','U10',10);expect(state.gold).toBe(90);expect(shop(state).purchases).toBe(1);
    state=buy(state,'toolOffers','T03',4);expect(state.gold).toBe(86);
  });
  it('an already owned U10 stacks its first-purchase discount with coupon two and e02 one, down to one',()=>{
    let state=buy(fixture(),'itemOffers','U10',10);state=send(state,{type:'SkipStage'});state=send(state,{type:'OpenShop'});
    state.jokers=[{instanceId:'first-purchase-source',definitionId:'e02',paidPrice:4,growth:{}}];expect(state.purchaseCoupons).toBe(1);expect(shop(state).purchases).toBe(0);
    const before=state.gold;state=buy(state,'toolOffers','T03',4);expect(before-state.gold).toBe(1);expect(state.purchaseCoupons).toBe(0);
    const paid=state.gold;state=buy(state,'offers','pengci',4);expect(paid-state.gold).toBe(4);
  });
  it('U11 leaves its current item shelf intact and shows two distinct unowned items only at the next new shop',()=>{
    const state=buy(fixture(),'itemOffers','U11',10);expect(shop(state).itemOffers).toHaveLength(1);expect(shop(state).itemOffers[0].consumed).toBe(true);
    const next=send(send(state,{type:'SkipStage'}),{type:'OpenShop'});expect(shop(next).itemOffers).toHaveLength(2);
    expect(new Set(shop(next).itemOffers.map(o=>o.definitionId)).size).toBe(2);expect(shop(next).itemOffers.some(o=>o.definitionId==='U11')).toBe(false);
  });
  it('U12 awards three only on the first real normal clear, with exact duplicate command immunity',()=>{
    const plan=stagePlan(false,[['U12',10]]),cmd=command(plan.state,{type:'PlayHand',selectedIds:plan.finalIds}),result=applyCommand(plan.state,cmd);
    expect(result.ok).toBe(true);if(!result.ok)return;
    expect(result.state.gold-plan.state.gold).toBe(15); // 4 base + 3 unused hands + 5 interest + 3 U12.
    expect(result.state.normalClearClaimed).toBe(true);const duplicate=applyCommand(result.state,cmd);expect(duplicate.ok&&duplicate.duplicate).toBe(true);expect(duplicate.state).toBe(result.state);
  });
  it('a normal clear before owning U12 prevents a retroactive bonus on the next real clear, while a skipped normal does not',()=>{
    let second:StagePlan|undefined;
    for(let seed=0;seed<256&&!second;seed++){
      const first=stagePlan(false,[],[],seed);let cleared=send(first.state,{type:'PlayHand',selectedIds:first.finalIds});expect(cleared.normalClearClaimed).toBe(true);
      cleared=send(cleared,{type:'OpenShop'});cleared=buy(cleared,'itemOffers','U12',10);expect(cleared.normalClearClaimed).toBe(true);
      second=winningHand(send(send(cleared,{type:'LeaveShop'}),{type:'EnterStage'}));
    }
    expect(second).toBeDefined();if(!second)return;
    const cleared=send(second.state,{type:'PlayHand',selectedIds:second.finalIds});expect(cleared.phase).toBe('stage-cleared');
    expect(cleared.gold-second.state.gold).toBe(13); // 5 base + 3 unused hands + 5 interest; no U12 bonus.
    const skipped=buy(fixture(),'itemOffers','U12',10),next=send(skipped,{type:'SkipStage'});expect(next.normalClearClaimed).toBe(false);
    expect(next.gold).toBe(skipped.gold);expect(next.totalHeat).toBe('0');
  });
});

describe('C01 finite supply rewards and free refresh',()=>{
  it.each(['shop','await-input'] as const)('T16 gives exactly five once in %s without a rule or reward draw',phase=>{
    expect(r2ToolSupported('T16')).toBe(true);let state=fixture();if(phase==='await-input')state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
    state.consumables=[{instanceId:'supply/one',definitionId:'T16'}];const before=structuredClone(state),cmd=command(state,{type:'UseConsumable',instanceId:'supply/one',targetIds:[]}),result=applyCommand(state,cmd);
    expect(result.ok).toBe(true);if(!result.ok)return;
    expect(result.state.gold).toBe(before.gold+5);expect(result.state.consumables).toEqual([]);expect(result.state.rng).toEqual(before.rng);expect(result.state.lastTrace).toEqual(before.lastTrace);
    const duplicate=applyCommand(result.state,cmd);expect(duplicate.ok&&duplicate.duplicate).toBe(true);expect(duplicate.state).toBe(result.state);
  });
  it.each([false,true])('the first successful Boss grants one T16, or exact two gold at full inventory=%s',full=>{
    expect(r2ToolSupported('T16')).toBe(true);const plan=stagePlan(true,[['U03',16]],['high-card']);
    if(full)plan.state.consumables=[{instanceId:'held/one',definitionId:'T01'},{instanceId:'held/two',definitionId:'T03'}];
    const before=structuredClone(plan.state),cmd=command(plan.state,{type:'PlayHand',selectedIds:plan.finalIds}),result=applyCommand(plan.state,cmd);expect(result.ok).toBe(true);if(!result.ok)return;
    const next=result.state;expect(next.supplyRewardClaimed).toBe(true);expect(next.gold-before.gold).toBe(full?17:15); // 7 Boss + 3 hands + 5 interest, then optional 2 overflow.
    expect(next.consumables.filter(c=>c.definitionId==='T16')).toHaveLength(full?0:1);if(full)expect(next.consumables).toEqual(before.consumables);
    expect(next.rng).toEqual(before.rng);const duplicate=applyCommand(next,cmd);expect(duplicate.ok&&duplicate.duplicate).toBe(true);expect(duplicate.state).toBe(next);
  });
  it('T16 is never a paid shop tool even if a forged shelf lists its nominal price four',()=>{
    expect(r2ToolSupported('T16')).toBe(true);const state=fixture(),id=offer(state,'toolOffers','T16',4);rejected(state,{type:'BuyOffer',offerId:id});
  });
  it('a skipped normal or a failed Boss never grants or claims the first-Boss supply',()=>{
    expect(r2ToolSupported('T16')).toBe(true);const skipped=send(fixture(),{type:'SkipStage'});expect(skipped.supplyRewardClaimed).toBe(false);expect(skipped.consumables.some(c=>c.definitionId==='T16')).toBe(false);
    let failed=fixture();for(const action of [{type:'SkipStage'},{type:'OpenShop'},{type:'SkipStage'},{type:'OpenShop'},{type:'LeaveShop'},{type:'EnterStage'}] as const)failed=send(failed,action);
    for(let play=0;play<4;play++)failed=send(failed,{type:'PlayHand',selectedIds:[failed.handOrder[0]]});
    expect(failed.phase).toBe('run-lost');expect(failed.supplyRewardClaimed).toBe(false);expect(failed.consumables.some(c=>c.definitionId==='T16')).toBe(false);
  });
  it('a previously claimed Boss supply cannot be granted by another winning Boss command',()=>{
    expect(r2ToolSupported('T16')).toBe(true);const plan=stagePlan(true,[['U03',16]],['high-card']);plan.state.supplyRewardClaimed=true;
    const next=send(plan.state,{type:'PlayHand',selectedIds:plan.finalIds});expect(next.supplyRewardClaimed).toBe(true);expect(next.consumables.some(c=>c.definitionId==='T16')).toBe(false);
    expect(next.gold-plan.state.gold).toBe(15);
  });
  it('T17 refunds only one actual discard to the frozen four-discard U02 entry budget',()=>{
    let state=buy(fixture(),'itemOffers','U02',12);state=buy(state,'toolOffers','T17',4);state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
    const id=state.consumables[0].instanceId;rejected(state,{type:'UseConsumable',instanceId:id,targetIds:[]});state=send(state,{type:'DiscardHand',selectedIds:[state.handOrder[0]]});
    const before=structuredClone(state),cmd=command(state,{type:'UseConsumable',instanceId:id,targetIds:[]}),result=applyCommand(state,cmd);expect(result.ok).toBe(true);if(!result.ok)return;
    expect(result.state.stage).toMatchObject({initialDiscards:4,discardsLeft:4,discardsUsed:1,discardSpent:1,discardGained:1});
    expect(result.state.rng).toEqual(before.rng);expect(result.state.handOrder).toEqual(before.handOrder);expect(result.state.stage!.handsLeft).toBe(4);expect(result.state.gold).toBe(before.gold);
    const duplicate=applyCommand(result.state,cmd);expect(duplicate.ok&&duplicate.duplicate).toBe(true);expect(duplicate.state).toBe(result.state);
  });
  it('T18 refreshes Joker/tools free, advances count and preserves items; the next U06 paid reroll costs two',()=>{
    let state=buy(fixture(),'itemOffers','U06',12);state=buy(state,'toolOffers','T18',4);offer(state,'itemOffers','U08',12);
    const before=structuredClone(state),id=state.consumables[0].instanceId,cmd=command(state,{type:'UseConsumable',instanceId:id,targetIds:[]}),used=applyCommand(state,cmd);
    expect(used.ok).toBe(true);if(!used.ok)return;state=used.state;assertRunInvariants(state);
    expect(state.gold).toBe(before.gold);expect(shop(state).rerollCount).toBe(1);expect(shop(state).itemOffers).toEqual(shop(before).itemOffers);
    expect(shop(state).offers.map(o=>o.offerId)).not.toEqual(shop(before).offers.map(o=>o.offerId));expect(shop(state).toolOffers).toHaveLength(1);
    expect(state.consumables).toEqual([]);expect(state.jokers).toEqual(before.jokers);expect(shop(state).purchases).toBe(shop(before).purchases);expect(state.rng.shop).not.toEqual(before.rng.shop);
    for(const key of ['deck','rule','reward'] as const)expect(state.rng[key]).toEqual(before.rng[key]);
    const duplicate=applyCommand(state,cmd);expect(duplicate.ok&&duplicate.duplicate).toBe(true);expect(duplicate.state).toBe(state);
    rejected(state,{type:'UseConsumable',instanceId:id,targetIds:[]});
    const free=state;state=send(state,{type:'RerollShop'});expect(free.gold-state.gold).toBe(2);expect(shop(state).rerollCount).toBe(2);expect(shop(state).itemOffers).toEqual(shop(before).itemOffers);
    // E12 is outside the adopted 48-card pool; its +3/cap60 paid-growth scenario is C02 NOT_RUN.
  });
});

class FailingStore implements SaveStore {
  slots:SaveSlots={revision:0,current:null,previous:null};fail=false;writes=0;
  async read(){return structuredClone(this.slots);}
  async commit(revision:number,current:ReturnType<typeof makeCheckpoint>,previous:ReturnType<typeof makeCheckpoint>|null){
    this.writes++;if(this.fail)throw Error('test-save-failure');if(revision!==this.slots.revision)throw Error('write-conflict');
    this.slots={revision:revision+1,current:structuredClone(current),previous:structuredClone(previous)};return revision+1;
  }
}
it('a failed first-Boss reward saves the determined T16 candidate on retry without a second grant or draw',async()=>{
  expect(r2ToolSupported('T16')).toBe(true);const plan=stagePlan(true,[['U03',16]],['high-card']),store=new FailingStore();
  const run=await SavedRun.start(store,plan.state,await store.read()),before=run.state,oldSlots=await store.read();store.fail=true;
  const cmd=command(before,{type:'PlayHand',selectedIds:plan.finalIds});expect((await run.submit(cmd)).ok).toBe(false);expect(run.state).toBe(before);expect(await store.read()).toEqual(oldSlots);
  const candidate=run.exportJSON(),pending=JSON.parse(candidate).state as R2RunState;
  expect(pending.phase).toBe('stage-cleared');expect(pending.gold-before.gold).toBe(15);expect(pending.supplyRewardClaimed).toBe(true);
  expect(pending.consumables.map(item=>item.definitionId)).toEqual(['T16']);expect(pending.rng).toEqual(before.rng);
  store.fail=false;expect((await run.retry()).ok).toBe(true);expect(run.exportJSON()).toBe(candidate);
  const writes=store.writes,duplicate=await run.submit(cmd);expect(duplicate.ok&&duplicate.duplicate).toBe(true);expect(store.writes).toBe(writes);
});
it('a failed discounted tool purchase publishes no charge; retry saves that candidate exactly once',async()=>{
  let state=buy(fixture(),'itemOffers','U10',10);state=send(send(state,{type:'SkipStage'}),{type:'OpenShop'});
  state.jokers=[{instanceId:'discount-source',definitionId:'e02',paidPrice:4,growth:{}}];const id=offer(state,'toolOffers','T03',4),store=new FailingStore();
  const run=await SavedRun.start(store,state,await store.read()),before=run.state,oldSlots=await store.read();store.fail=true;
  const cmd=command(run.state,{type:'BuyOffer',offerId:id});expect((await run.submit(cmd)).ok).toBe(false);expect(run.state).toBe(before);expect(await store.read()).toEqual(oldSlots);
  const candidate=run.exportJSON();expect(JSON.parse(candidate).state.gold).toBe(89);expect(JSON.parse(candidate).state.purchaseCoupons).toBe(0);
  store.fail=false;expect((await run.retry()).ok).toBe(true);expect(run.exportJSON()).toBe(candidate);expect(run.state.gold).toBe(89);
  const writes=store.writes;const duplicate=await run.submit(cmd);expect(duplicate.ok&&duplicate.duplicate).toBe(true);expect(store.writes).toBe(writes);
});
