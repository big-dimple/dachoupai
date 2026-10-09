import {handRoutePlayBudget} from '../src/game/HandRouteTransition';
import {describe,expect,it} from 'vitest';
import {applyCommand,assertRunInvariants,createRun,stateHash,type Action,type Command,type R2RunState} from '../src/domain/run';
import {makeCheckpoint,readCheckpoint,restoreSlots} from '../src/application/checkpoint';
import {r2Price,r2PurchasePrice} from '../src/domain/r2Shop';
import {SCORE_LIMITS} from '../src/domain/scoreR2';

const start=(seed='c00-transactions',characterId:'erxiang'|'xiemu'='erxiang')=>createRun({seed,characterId,runId:`fixture/${seed}`,rulesVersion:'r2'});
const command=(state:R2RunState,action:Action):Command=>({runId:state.runId,commandId:`cmd-${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
const execute=(state:R2RunState,action:Action)=>{
  const result=applyCommand(state,command(state,action));
  if(!result.ok)throw Error(result.code);
  assertRunInvariants(result.state);return result;
};
const send=(state:R2RunState,action:Action)=>execute(state,action).state;
const equipped=(ids:readonly string[],seed='c00-transactions',characterId:'erxiang'|'xiemu'='erxiang')=>{
  const state=start(seed,characterId);
  state.jokers=ids.map(id=>({instanceId:`owned/${id}`,definitionId:id,paidPrice:4,growth:{}}));
  return state;
};
const table=(ids:readonly string[]=[],seed='c00-transactions',characterId:'erxiang'|'xiemu'='erxiang')=>send(send(equipped(ids,seed,characterId),{type:'LeaveShop'}),{type:'EnterStage'});
// Explicit final-opportunity boundary, including the required preceding-hand snapshot.
// These fixtures isolate transactions; they do not claim a naturally played history.
const lastOpportunity=(state:R2RunState)=>Object.assign(state.stage!,{handsLeft:1,playIndex:3,maxPlayedCount:1,previousHandType:'high-card',previousHandScore:'22'});
const offer=(state:R2RunState,id:string)=>{
  const next=structuredClone(state);next.shop!.offers=[{offerId:`fixture-offer/${id}/${next.commandSeq}`,definitionId:id,price:r2Price(id),consumed:false}];return next;
};
const buy=(state:R2RunState,id:string)=>{const next=offer(state,id);return send(next,{type:'BuyOffer',offerId:next.shop!.offers[0].offerId});};
const restore=(state:R2RunState)=>{
  const checkpoint=makeCheckpoint(state,[]),read=readCheckpoint(JSON.parse(JSON.stringify(checkpoint)));
  if(!read.ok)throw Error(read.code);expect(read.checkpoint.state).toEqual(state);return read.checkpoint.state;
};
const hand=(state:R2RunState,ids:readonly string[],draw=true)=>{
  const next=structuredClone(state),used=[...next.playedPile,...next.discardPile,...next.destroyedIds,...ids];
  next.handOrder=[...ids];
  next.drawPile=draw?next.deckInstances.map(c=>c.id).filter(id=>!used.includes(id)):[];
  if(!draw)next.discardPile=next.deckInstances.map(c=>c.id).filter(id=>![...next.playedPile,...next.destroyedIds,...ids].includes(id));
  next.stage!.disabledIds=[];assertRunInvariants(next);return next;
};
const growth=(state:R2RunState,id:string,key:string)=>state.jokers.find(j=>j.definitionId===id)!.growth[key]??{n:'0',d:'1'};
const low=(rank:number,suit='clubs')=>`${suit}-${rank}`;

describe('C00 actual command transactions and lifecycle',()=>{
  it('locks A04/D06 hand limits from the surviving persistent deck at entry',()=>{
    for(const count of [40,41]){
      let state=equipped(['a04','d06'],`size-${count}`);
      state.deckInstances=state.deckInstances.slice(0,count);state.drawPile=state.deckInstances.map(c=>c.id);
      state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
      expect(state.handOrder).toHaveLength(count===40?11:9);
      expect(state.stage).toHaveProperty('handLimit',count===40?11:9);
      state=restore(state);expect(send(state,{type:'DiscardHand',selectedIds:state.handOrder.slice(0,3)}).handOrder).toHaveLength(count===40?11:9);
    }
    let state=equipped(['a04']);state.destroyedIds=state.deckInstances.slice(40).map(c=>c.id);state.drawPile=state.drawPile.filter(id=>!state.destroyedIds.includes(id));
    state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});expect(state.handOrder).toHaveLength(10);
  });
  it('preserves an over-base completed-stage hand after selling its modifiers and lowers the next entry only',()=>{
    let state=equipped(['a04','d06']);state.deckInstances=state.deckInstances.slice(0,40);state.drawPile=state.deckInstances.map(c=>c.id);state.handLevels['high-card']=30;
    state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
    state=send(state,{type:'PlayHand',selectedIds:state.handOrder.slice(0,1)});expect(state.phase).toBe('stage-cleared');expect(state.handOrder).toHaveLength(10);
    state=send(state,{type:'OpenShop'});state=send(state,{type:'SellJoker',instanceId:'owned/d06'});state=send(state,{type:'SellJoker',instanceId:'owned/a04'});
    expect(state.stage).toHaveProperty('handLimit',11);state=restore(state);
    state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});expect(state.handOrder).toHaveLength(8);expect(state.stage).toHaveProperty('handLimit',8);
    const illegal=structuredClone(state);(illegal.stage as unknown as {handLimit:number}).handLimit=15;expect(()=>assertRunInvariants(illegal)).toThrow();
  });
  it('A07 pays only two successful single-card discards per stage and never pays twice on retry',()=>{
    let state=table(['a07']);
    for(let i=0;i<3;i++){
      const before=state.gold,cmd=command(state,{type:'DiscardHand',selectedIds:[state.handOrder[0]]}),result=applyCommand(state,cmd);
      if(!result.ok)throw Error(result.code);state=result.state;assertRunInvariants(state);
      expect(state.gold).toBe(before+(i<2?1:0));
      expect(result.events.filter(e=>e.type==='joker-transaction'&&e.definitionId==='a07')).toHaveLength(i<2?1:0);
      const retry=applyCommand(state,cmd);expect(retry.ok&&retry.duplicate).toBe(true);expect(retry.state).toBe(state);
      state=restore(state);
    }
    expect(state.jokers[0]).toHaveProperty('counters.singleDiscards',2);
    const repeat=applyCommand(state,command(state,{type:'DiscardHand',selectedIds:[state.handOrder[0]]}));expect(repeat.ok).toBe(false);expect(repeat.state).toBe(state);
  });
  it('A07 ignores multi-card discards and resets its allowance on a new stage',()=>{
    let state=table(['a07']);state=send(state,{type:'DiscardHand',selectedIds:state.handOrder.slice(0,2)});expect(state.gold).toBe(6);
    state=send(state,{type:'DiscardHand',selectedIds:[state.handOrder[0]]});expect(state.gold).toBe(7);
    state=hand(state,['spades-2','spades-3','spades-4','spades-5','spades-6']);state=send(state,{type:'PlayHand',selectedIds:state.handOrder});
    state=send(send(send(state,{type:'OpenShop'}),{type:'LeaveShop'}),{type:'EnterStage'});
    const before=state.gold;state=send(restore(state),{type:'DiscardHand',selectedIds:[state.handOrder[0]]});expect(state.gold).toBe(before+1);
  });
  it('A07 does not confuse D05 refunds or Boss discard costs with successful discard counts',()=>{
    let state=table(['a07','d05']);
    for(let n=0;n<4;n++)state=send(state,{type:'DiscardHand',selectedIds:[state.handOrder[0]]});
    expect(state.gold).toBe(8);expect(state.stage!.discardsLeft).toBe(0);expect(state.stage!.discardsUsed).toBe(4);restore(state);
    state=table(['a07','d05'],'boss-discard');state.stageIndex=2;state.stage!.index=2;state.stage!.targetHeat='800';state.stage!.initialTargetHeat='800';state.stage!.doubleDiscardBeforeFirstPlay=true;state.boss={definitionId:'B01',disabledSuit:null};state.stage!.boss={...state.boss};state.seenBossIds=['B01'];
    state=send(state,{type:'DiscardHand',selectedIds:[state.handOrder[0]]});expect(state.gold).toBe(7);expect(state.stage!.discardsLeft).toBe(2);expect(state.stage!.discardsUsed).toBe(1);restore(state);
  });
  it('C05 accumulates only same-suit discards, caps at 80 and consumes once at jokerScore',()=>{
    let state=table(['c05']);state=hand(state,['clubs-2','clubs-3','clubs-4','clubs-5','clubs-6','clubs-7','clubs-8','spades-2']);
    for(let i=0;i<3;i++){
      const ids=state.handOrder.filter(id=>id.startsWith('clubs')).slice(0,2);state=send(state,{type:'DiscardHand',selectedIds:ids});
      expect(growth(state,'c05','pendingHeat')).toEqual({n:String(Math.min(80,(i+1)*40)),d:'1'});state=restore(state);
    }
    state=hand(state,['hearts-2']);state=send(state,{type:'PlayHand',selectedIds:['hearts-2']});expect(state.lastTrace!.finalScore).toBe('102');
    expect(state.lastTrace!.events.filter(e=>e.sourceDefinitionId==='c05'&&e.operation==='consume-growth')).toHaveLength(1);
    expect(growth(state,'c05','pendingHeat')).toEqual({n:'0',d:'1'});
    state=hand(restore(state),['hearts-3']);state=send(state,{type:'PlayHand',selectedIds:['hearts-3']});expect(state.lastTrace!.finalScore).toBe('23');
  });
  it('C05 leaves mixed/single discards and rejected commands unchanged',()=>{
    let state=table(['c05']);state=hand(state,['clubs-2','hearts-2','clubs-3']);
    state=send(state,{type:'DiscardHand',selectedIds:['clubs-2','hearts-2']});expect(growth(state,'c05','pendingHeat')).toEqual({n:'0',d:'1'});
    state=send(state,{type:'DiscardHand',selectedIds:['clubs-3']});expect(growth(state,'c05','pendingHeat')).toEqual({n:'0',d:'1'});
    const before=stateHash(state),bad=applyCommand(state,command(state,{type:'DiscardHand',selectedIds:[state.handOrder[0],state.handOrder[0]]}));expect(bad.ok).toBe(false);expect(stateHash(state)).toBe(before);
  });
  it('C05 pending heat is cleared on abandon and no-card failure',()=>{
    for(const end of ['abandon','no-cards'] as const){
      let state=table(['c05']);state=hand(state,['clubs-2','clubs-3','hearts-2'],false);state=send(state,{type:'DiscardHand',selectedIds:['clubs-2','clubs-3']});
      expect(growth(state,'c05','pendingHeat')).toEqual({n:'40',d:'1'});
      state=end==='abandon'?send(state,{type:'AbandonRun'}):send(state,{type:'DiscardHand',selectedIds:['hearts-2']});
      expect(state.phase).toBe('run-lost');expect(growth(state,'c05','pendingHeat')).toEqual({n:'0',d:'1'});restore(state);
    }
  });
  it('E02 applies to the first actual purchase, stacks a coupon and preserves actual paid/sale price',()=>{
    let state=equipped(['e02']);state.gold=20;state.purchaseCoupons=1;state=offer(state,'a03');const id=state.shop!.offers[0].offerId;
    expect(r2PurchasePrice(state,state.shop!.offers[0])).toBe(1);
    const failed=applyCommand(state,command(state,{type:'BuyOffer',offerId:'missing'}));expect(failed.ok).toBe(false);expect(failed.state).toBe(state);
    const bought=execute(restore(state),{type:'BuyOffer',offerId:id});state=bought.state;expect(state.gold).toBe(19);expect(state.purchaseCoupons).toBe(0);expect(state.shop).toHaveProperty('purchases',1);
    const purchased=state.jokers.find(j=>j.definitionId==='a03')!;expect(purchased.paidPrice).toBe(1);
    state=send(state,{type:'SellJoker',instanceId:purchased.instanceId});expect(state.gold).toBe(20);
    state=offer(state,'c02');expect(r2PurchasePrice(state,state.shop!.offers[0])).toBe(4);state=send(state,{type:'RerollShop'});expect(state.shop).toHaveProperty('purchases',1);
  });
  it('buying E02 never discounts itself or the second purchase, and a new shop resets the allowance',()=>{
    let state=start();state.gold=30;state=buy(state,'e02');expect(state.gold).toBe(26);state=buy(state,'a03');expect(state.gold).toBe(22);
    state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});state=hand(state,['spades-2','spades-3','spades-4','spades-5','spades-6']);state=send(state,{type:'PlayHand',selectedIds:state.handOrder});state=send(state,{type:'OpenShop'});
    expect(state.shop).toHaveProperty('purchases',0);state=offer(restore(state),'c02');expect(r2PurchasePrice(state,state.shop!.offers[0])).toBe(3);
  });
  it('E02 first-purchase allowance survives failed affordability and capacity checks',()=>{
    let state=equipped(['e02','a03','c02','b02','d01']);state.gold=0;state=offer(state,'f04');
    for(const full of [true,false]){
      if(!full)state.jokers.pop();const before=stateHash(state),result=applyCommand(state,command(state,{type:'BuyOffer',offerId:state.shop!.offers[0].offerId}));
      expect(result.ok).toBe(false);expect(result.state).toBe(state);expect(stateHash(state)).toBe(before);expect(state.shop).toHaveProperty('purchases',0);expect(r2PurchasePrice(state,state.shop!.offers[0])).toBe(5);
    }
  });
  it('E04 increases only the interest cap and calculates interest before stage rewards',()=>{
    for(const gold of [24,25,35,100]){
      let state=table(['e04']);state.gold=gold;state=hand(state,['spades-2','spades-3','spades-4','spades-5','spades-6']);state=send(state,{type:'PlayHand',selectedIds:state.handOrder});
      expect(state.gold).toBe(gold+4+3+Math.min(7,Math.floor(gold/5)));expect(state.stage!.goldEarned).toBe(7+Math.min(7,Math.floor(gold/5)));restore(state);
    }
  });
  it('E06 grows the remaining original instance only for successful sales of another Joker, capped at 3',()=>{
    let state=equipped(['e06','a03']);state.gold=100;
    const bad=applyCommand(state,command(state,{type:'SellJoker',instanceId:'missing'}));expect(bad.ok).toBe(false);expect(growth(state,'e06','multiplier')).toEqual({n:'0',d:'1'});
    for(let i=0;i<8;i++){
      if(i)state=buy(state,'a03');const other=state.jokers.find(j=>j.definitionId==='a03')!,before=state.rng;
      const result=execute(state,{type:'SellJoker',instanceId:other.instanceId});state=result.state;expect(state.rng).toEqual(before);
      expect(growth(state,'e06','multiplier')).toEqual(i>=5?{n:'3',d:'1'}:i%2===0?{n:String(i+1),d:'2'}:{n:String((i+1)/2),d:'1'});
      expect(result.events.filter(e=>e.type==='joker-transaction'&&e.definitionId==='e06')).toHaveLength(1);state=restore(state);
    }
    state=send(state,{type:'SellJoker',instanceId:'owned/e06'});expect(state.jokers).toEqual([]);state=buy(state,'e06');expect(growth(state,'e06','multiplier')).toEqual({n:'0',d:'1'});
  });
  it('E07 and the last-hand character reward happen only after success and once on duplicate commands',()=>{
    for(const clears of [true,false]){
      let state=table(['e07'],'last-reward','xiemu');state=hand(state,['clubs-5']);lastOpportunity(state);state.stage!.heat=clears?'350':'0';
      const cmd=command(state,{type:'PlayHand',selectedIds:state.handOrder}),result=applyCommand(state,cmd);if(!result.ok)throw Error(result.code);state=result.state;assertRunInvariants(state);
      expect(state.phase).toBe(clears?'stage-cleared':'run-lost');expect(state.gold).toBe(clears?17:6);expect(state.stage!.goldEarned).toBe(clears?11:0);
      expect(result.events.filter(e=>e.type==='joker-transaction'&&e.definitionId==='e07')).toHaveLength(clears?1:0);
      const retry=applyCommand(restore(state),cmd);expect(retry.ok&&retry.duplicate).toBe(true);expect(retry.state.gold).toBe(state.gold);
    }
  });
  it('persists actual B08/E07/E01 clear rewards in source order without changing the score or rewarding retries',()=>{
    let state=table(['b08','e07','e01'],'clear-sources');state=hand(state,['clubs-2','spades-2']);lastOpportunity(state);state.stage!.heat='264';
    const cmd=command(state,{type:'PlayHand',selectedIds:state.handOrder}),result=applyCommand(state,cmd);if(!result.ok)throw Error(result.code);state=result.state;
    expect(state.phase).toBe('stage-cleared');expect(state.gold).toBe(20);expect(state.stage!.goldEarned).toBe(14);expect(state.lastTrace!.finalScore).toBe('136');expect(state.lastTrace!.accumulator).toEqual({H:{n:'39',d:'1'},M:{n:'7',d:'2'}});
    const rewards=state.lastTrace!.events.filter(e=>e.phase==='onStageClear');
    expect(rewards.map(e=>[e.sourceDefinitionId,e.sourceInstanceId,e.operation,e.value,e.resourceBefore,e.resourceAfter])).toEqual([
      ['b08','owned/b08','add-gold',{n:'3',d:'1'},11,14],['e07','owned/e07','add-gold',{n:'4',d:'1'},14,18],['e01','owned/e01','add-gold',{n:'2',d:'1'},18,20],
    ]);
    for(const event of rewards){expect(event.before).toEqual(state.lastTrace!.accumulator);expect(event.after).toEqual(event.before);expect(Object.isFrozen(event)).toBe(true);expect(Object.isFrozen(event.value)).toBe(true);}
    expect(state.lastTrace!.destroyedJokerIds).toEqual([]);expect(result.events.find(e=>e.type==='hand-scored-r2')).toHaveProperty('score',state.lastTrace);
    const restored=restore(state);expect(restored.lastTrace!.events.filter(e=>e.phase==='onStageClear')).toEqual(rewards);
    const retry=applyCommand(restored,cmd);expect(retry.ok&&retry.duplicate).toBe(true);expect(retry.state).toBe(restored);expect(retry.state.gold).toBe(20);if(retry.ok)expect(retry.events).toEqual([]);
  });
  it('rolls back score and gold together if clear reward sources exceed the trace budget',()=>{
    const state=table(['b08','e07','e01'],'clear-source-cap');const rigged=hand(state,['clubs-2','spades-2']);lastOpportunity(rigged);rigged.stage!.heat='264';const before=JSON.stringify(rigged),cap=SCORE_LIMITS.eventCount;
    try{
      // Base, two cards, character and final score have five events; rewards add three.
      Object.assign(SCORE_LIMITS,{eventCount:7});const result=applyCommand(rigged,command(rigged,{type:'PlayHand',selectedIds:rigged.handOrder}));
      expect(result.ok).toBe(false);if(!result.ok){expect(result.code).toBe('score-diagnostic');expect(result.diagnostic!.code).toBe('event-limit');expect(result.diagnostic!.events).toHaveLength(5);}
      expect(result.state).toBe(rigged);expect(JSON.stringify(rigged)).toBe(before);
      Object.assign(SCORE_LIMITS,{eventCount:8});const fits=applyCommand(rigged,command(rigged,{type:'PlayHand',selectedIds:rigged.handOrder}));expect(fits.ok).toBe(true);if(fits.ok){expect(fits.state.lastTrace!.events).toHaveLength(8);expect(fits.state.gold).toBe(20);}
    }finally{Object.assign(SCORE_LIMITS,{eventCount:cap});}
  });
  it('F05 records the first score, grows after an increase and resets on equal/lower score',()=>{
    let state=table(['f05']);
    for(const [rank,score,mult] of [[2,'22',{n:'0',d:'1'}],[10,'30',{n:'1',d:'4'}],[4,'30',{n:'0',d:'1'}],[3,'23',{n:'0',d:'1'}]] as const){
      state=hand(state,[low(rank)]);state=send(restore(state),{type:'PlayHand',selectedIds:state.handOrder});
      expect(state.lastTrace!.finalScore).toBe(score);expect(state.stage).toHaveProperty('previousHandScore',score);expect(growth(state,'f05','multiplier')).toEqual(mult);
    }
  });
  it('F05 keeps instance growth across stages while stage comparison starts with no previous score',()=>{
    let state=table(['f05']);state=hand(state,['clubs-2']);state=send(state,{type:'PlayHand',selectedIds:state.handOrder});state=hand(state,['spades-2','spades-3','spades-4','spades-5','spades-6']);state=send(state,{type:'PlayHand',selectedIds:state.handOrder});
    expect(growth(state,'f05','multiplier')).toEqual({n:'1',d:'4'});state=send(send(send(state,{type:'OpenShop'}),{type:'LeaveShop'}),{type:'EnterStage'});expect(state.stage).toHaveProperty('previousHandScore',null);
    state=hand(restore(state),['clubs-2']);state=send(state,{type:'PlayHand',selectedIds:state.handOrder});expect(state.lastTrace!.finalScore).toBe('27');expect(growth(state,'f05','multiplier')).toEqual({n:'1',d:'4'});
  });
  it('F06 counts actual plays across stage/checkpoint boundaries and remains effective for its fourth play',()=>{
    let state=start();state.gold=20;state=buy(state,'f06');const id=state.jokers[0].instanceId;state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
    for(let n=1;n<=4;n++){
      if(state.phase==='stage-cleared')state=send(send(send(state,{type:'OpenShop'}),{type:'LeaveShop'}),{type:'EnterStage'});
      const rank=n<=2?n+1:n===3?10:11;const suit=n===4?'hearts':'clubs';state=hand(state,[low(rank,suit),low(rank,'spades')]);
      if(n===1){const bad=applyCommand(state,command(state,{type:'PlayHand',selectedIds:[state.handOrder[0],state.handOrder[0]]}));expect(bad.ok).toBe(false);expect(bad.state).toBe(state);}
      const cmd=command(state,{type:'PlayHand',selectedIds:state.handOrder}),result=applyCommand(restore(state),cmd);if(!result.ok)throw Error(result.code);state=result.state;assertRunInvariants(state);
      expect(state.lastTrace!.events.some(e=>e.sourceInstanceId===id&&e.operation==='multiply-multiplier')).toBe(true);
      if(n<4)expect(state.jokers[0]).toHaveProperty('counters.handsScored',n);
      else{expect(state.jokers).toEqual([]);expect(state.lastTrace).toHaveProperty('destroyedJokerIds',[id]);expect(state.lastTrace!.finalScore).toBe('385');}
      const retry=applyCommand(state,cmd);expect(retry.ok&&retry.duplicate).toBe(true);expect(retry.state).toBe(state);restore(state);
    }
  });
  it('F07 rescues resource exhaustion after refill, destroys once, records the source and excludes future sale',()=>{
    let state=table(['f07']);state=hand(state,['clubs-2']);lastOpportunity(state);
    expect(handRoutePlayBudget(state.stage!.handsLeft)).toContain('返手或救场按实际效果结算');expect(handRoutePlayBudget(state.stage!.handsLeft)).toContain('败局风险');const beforeHand=[...state.handOrder];
    const cmd=command(state,{type:'PlayHand',selectedIds:state.handOrder}),result=applyCommand(state,cmd);if(!result.ok)throw Error(result.code);state=result.state;assertRunInvariants(state);
    expect(state.phase).toBe('await-input');expect(state.stage!.handsLeft).toBe(1);expect(state.stage!.playIndex).toBe(4);expect(state.stage).toHaveProperty('rescueUsed',true);expect(state).toHaveProperty('safetyNetUsed',true);expect(state.jokers).toEqual([]);expect(state.gold).toBe(6);
    expect(state.handOrder.some(id=>!beforeHand.includes(id))).toBe(true);
    expect(result.events.some(e=>e.type==='joker-transaction'&&e.definitionId==='f07'&&e.instanceId==='owned/f07'&&e.operation==='rescue-hand')).toBe(true);
    expect(state.lastTrace!.events.some(e=>e.sourceInstanceId==='owned/f07'&&e.operation==='rescue-hand')).toBe(true);
    expect(state.lastTrace!.sourceJokers.map(j=>j.instanceId)).toContain('owned/f07');
    expect(state.lastTrace!.jokers.map(j=>j.instanceId)).not.toContain('owned/f07');
    const resumed=restore(state),retry=applyCommand(resumed,cmd);expect(retry.ok&&retry.duplicate).toBe(true);expect(retry.state).toBe(resumed);
    state=hand(resumed,['hearts-2']);state=send(state,{type:'PlayHand',selectedIds:state.handOrder});expect(state.phase).toBe('run-lost');expect(state.stage!.playIndex).toBe(5);expect(state.gold).toBe(6);
  });
  it('F07 avoids success and empty decks, but legally playable disabled cards remain eligible',()=>{
    for(const boundary of ['clear','empty','disabled'] as const){
      let state=table(['f07']);state=hand(state,boundary==='disabled'?['clubs-2','clubs-11']:['clubs-2'],false);lastOpportunity(state);
      if(boundary==='clear')state.stage!.heat='378';
      if(boundary==='disabled'){state.stageIndex=2;state.stage!.index=2;state.stage!.targetHeat='800';state.stage!.initialTargetHeat='800';state.boss={definitionId:'B04',disabledSuit:null};state.stage!.boss={...state.boss};state.seenBossIds=['B04'];state.stage!.disabledIds=['clubs-11'];}
      state=send(state,{type:'PlayHand',selectedIds:['clubs-2']});expect(state.phase).toBe(boundary==='clear'?'stage-cleared':boundary==='disabled'?'await-input':'run-lost');expect(state).toHaveProperty('safetyNetUsed',boundary==='disabled');
      if(boundary==='disabled')expect(state.jokers).toEqual([]);else expect(state.jokers[0].definitionId).toBe('f07');restore(state);
    }
  });
  it('the rescued fifth actual play may win with the last-resource rewards exactly once',()=>{
    let state=table(['f07','e07'],'rescued-clear','xiemu');state=hand(state,['clubs-2']);lastOpportunity(state);
    state=send(state,{type:'PlayHand',selectedIds:state.handOrder});expect(state.phase).toBe('await-input');expect(state.gold).toBe(6);
    state=hand(restore(state),['spades-2','spades-3','spades-4','spades-5','spades-6']);const cmd=command(state,{type:'PlayHand',selectedIds:state.handOrder}),result=applyCommand(state,cmd);
    if(!result.ok)throw Error(result.code);state=result.state;expect(state.phase).toBe('stage-cleared');expect(state.stage!.playIndex).toBe(5);expect(state.stage!.handsLeft).toBe(0);expect(state.gold).toBe(17);
    const retry=applyCommand(restore(state),cmd);expect(retry.ok&&retry.duplicate).toBe(true);expect(retry.state.gold).toBe(17);
    state=send(send(send(state,{type:'OpenShop'}),{type:'LeaveShop'}),{type:'EnterStage'});expect(state).toHaveProperty('safetyNetUsed',true);expect(state.stage).toHaveProperty('rescueUsed',false);expect(state.stage!.handsLeft).toBe(4);restore(state);
  });
  it('rolls back the full play when rescue sources would exceed the event budget',()=>{
    const state=table(['f07']);lastOpportunity(state);const before=JSON.stringify(state),cap=SCORE_LIMITS.eventCount;
    // Three normal score events fit. The two failure-before-rescue events do not.
    try{
      Object.assign(SCORE_LIMITS,{eventCount:3});const result=applyCommand(state,command(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]}));
      expect(result.ok).toBe(false);if(!result.ok){expect(result.code).toBe('score-diagnostic');expect(result.diagnostic!.code).toBe('event-limit');expect(result.diagnostic!.events).toHaveLength(3);}
      expect(result.state).toBe(state);expect(JSON.stringify(state)).toBe(before);
    }finally{Object.assign(SCORE_LIMITS,{eventCount:cap});}
  });
  it('F07 stays unavailable in later shops and rejects a stale offer without charging resources',()=>{
    let state=table(['f07']);state=hand(state,['clubs-2']);lastOpportunity(state);state=send(state,{type:'PlayHand',selectedIds:state.handOrder});state=hand(state,['spades-2','spades-3','spades-4','spades-5','spades-6']);state=send(state,{type:'PlayHand',selectedIds:state.handOrder});state=send(state,{type:'OpenShop'});state.gold=100;
    for(let n=0;n<20;n++){state=send(state,{type:'RerollShop'});expect(state.shop!.offers.some(o=>o.definitionId==='f07')).toBe(false);state.gold=100;}
    state=offer(state,'f07');const before=stateHash(state),rejected=applyCommand(state,command(state,{type:'BuyOffer',offerId:state.shop!.offers[0].offerId}));expect(rejected.ok).toBe(false);expect(rejected.state).toBe(state);expect(stateHash(state)).toBe(before);
  });
  it('diagnoses v4 saves before new fields and retains their original raw payload',()=>{
    const checkpoint=makeCheckpoint(start(),[]),raw=structuredClone(checkpoint);raw.state.contentVersion='quality-r2-graybox-v4';raw.state.contentHash='v4-original-hash';
    const before=JSON.stringify(raw),blocked=restoreSlots({revision:1,current:raw,previous:null});expect(blocked.status).toBe('invalid');expect(blocked.code).toBe('incompatible-version');expect(blocked.raw).toEqual(raw);expect(JSON.stringify(raw)).toBe(before);
  });
  it('rejects malformed instance counters, unbounded growth and missing v5 lifecycle fields',()=>{
    const state=equipped(['a07','f06','c05','f05']);restore(state);
    const invalidCounters=[{singleDiscards:3},{singleDiscards:-1},{singleDiscards:0.5},{singleDiscards:0,handsScored:1}];
    for(const counters of invalidCounters){const bad=structuredClone(state);Object.assign(bad.jokers[0],{counters});expect(()=>makeCheckpoint(bad,[])).toThrow();}
    for(const counters of [{handsScored:4},{handsScored:Infinity},{singleDiscards:1}]){const bad=structuredClone(state);Object.assign(bad.jokers[1],{counters});expect(()=>makeCheckpoint(bad,[])).toThrow();}
    for(const [index,key,value] of [[2,'pendingHeat',81],[3,'multiplier',5]] as const){const bad=structuredClone(state);bad.jokers[index].growth[key]={n:String(value),d:'1'};expect(()=>makeCheckpoint(bad,[])).toThrow();}
    const checkpoint=makeCheckpoint(state,[]);delete (checkpoint.state as unknown as {safetyNetUsed?:boolean}).safetyNetUsed;expect(readCheckpoint(checkpoint).ok).toBe(false);
  });
});
