import {describe,expect,it} from 'vitest';
import {applyCommand,assertRunInvariants,createRun,type Action,type Command,type R2RunState} from '../src/domain/run';
import {r2DisabledCards} from '../src/domain/r2Chapter';
import type {Rank,Suit} from '../src/cards/types';
import {SavedRun,type SaveSlots,type SaveStore} from '../src/application/SavedRun';
import {makeCheckpoint} from '../src/application/checkpoint';
import {R2_JOKERS} from '../src/content/r2Schema';
import {SeededRng} from '../src/core/SeededRng';

type FutureStage=NonNullable<R2RunState['stage']>&{maxPlayedCount:number;ordinaryStraightSeen:boolean;ordinaryFlushSeen:boolean;quadRefundUsed:boolean;jokerSold:boolean};
const stage=(state:R2RunState)=>state.stage as FutureStage;
const command=(state:R2RunState,action:Action):Command=>({runId:state.runId,commandId:`c02-economy/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
const send=(state:R2RunState,action:Action):R2RunState=>{
  const result=applyCommand(state,command(state,action));expect(result.ok,result.ok?'':result.code).toBe(true);
  if(!result.ok)throw Error(result.code);assertRunInvariants(result.state);return result.state;
};
function fixture(ids:readonly string[]=[],tools:readonly string[]=[]):R2RunState {
  const state=createRun({seed:'c02-economy',runId:'c02-economy',characterId:'erxiang',rulesVersion:'r2'});state.gold=20;
  // Specified ownership, card arrangement and levels are explicit valid fixtures, not natural acquisition evidence.
  state.jokers=ids.map(id=>{
    const growth:R2RunState['jokers'][number]['growth']=id==='e11'||id==='f12'?{coefficient:{n:'1',d:'1'}}:{};
    return {instanceId:`owned/${id}`,definitionId:id,paidPrice:8,growth};
  });
  for(const joker of state.jokers)if(joker.definitionId==='e10')joker.counters=Object.assign({}, {stageClears:0});
  state.consumables=tools.map((id,index)=>({instanceId:`tool/${index}`,definitionId:id}));return state;
}
function table(ids:readonly string[]=[],index=0,tools:readonly string[]=[]):R2RunState {
  let state=fixture(ids,tools);
  if(index===0)state=send(state,{type:'LeaveShop'});
  else {state.phase='stage-ready';state.stageIndex=index;state.chapter=2;state.boss={definitionId:'B02',disabledSuit:null};state.seenBossIds=['B01','B02'];state.supplyRewardClaimed=true;state.shop=null;}
  return send(state,{type:'EnterStage'});
}
type CardSpec=readonly [Rank,Suit];
function cards(state:R2RunState,hand:readonly CardSpec[],draw:readonly CardSpec[]=[]):{state:R2RunState;hand:string[];draw:string[]} {
  expect(hand).toHaveLength(8);const ids=state.deckInstances.map(c=>c.id),specs=[...hand,...draw];
  specs.forEach(([rank,suit],index)=>Object.assign(state.deckInstances[index],{rank,suit}));
  state.handOrder=ids.slice(0,8);state.drawPile=[...ids.slice(specs.length),...ids.slice(8,specs.length).reverse()];state.playedPile=[];state.discardPile=[];
  stage(state).disabledIds=r2DisabledCards(state.boss,state.stageIndex,state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!));
  return {state,hand:state.handOrder,draw:ids.slice(8,specs.length)};
}
const SMALL_HAND:readonly CardSpec[]=[[2,'spades'],[3,'hearts'],[4,'clubs'],[5,'hearts'],[5,'clubs'],[7,'diamonds'],[9,'clubs'],[14,'hearts']];
function winner(ids:readonly string[]=[],tools:readonly string[]=[]):R2RunState {
  const state=cards(table(ids,0,tools),SMALL_HAND).state;state.handLevels['high-card']=30;return state;
}
function clear(state:R2RunState):R2RunState {return send(state,{type:'PlayHand',selectedIds:[state.handOrder.at(-1)!]});}
const coefficients=(state:R2RunState,id:string)=>state.jokers.find(j=>j.definitionId===id)!.growth.coefficient;
const clearEvents=(state:R2RunState,id:string)=>state.lastTrace!.events.filter(e=>e.phase==='onStageClear'&&e.sourceDefinitionId===id);
function unchangedRejection(state:R2RunState,cmd:Command,code:string):void {
  const before=structuredClone(state),result=applyCommand(state,cmd);expect(result.ok).toBe(false);if(result.ok)return;
  expect(result.code).toBe(code);expect(result.state).toBe(state);expect(state).toEqual(before);
}
function straightAfterFlush(ids:readonly string[]=[],tools:readonly string[]=[],straightFlush=false):{state:R2RunState;first:string[];second:string[]} {
  const hand:CardSpec[]=[[2,'clubs'],[5,'clubs'],[8,'clubs'],[10,'clubs'],[13,'clubs'],[12,'spades'],[14,'hearts'],[7,'diamonds']];
  const draw:CardSpec[]=straightFlush?[[2,'hearts'],[3,'hearts'],[4,'hearts'],[5,'hearts'],[6,'hearts']]:[[2,'hearts'],[3,'clubs'],[4,'spades'],[5,'diamonds'],[6,'hearts']];
  const plan=cards(table(ids,3,tools),hand,draw);plan.state.rng.reward={algorithm:'fnv1a-mulberry32-v1',state:0};return {state:plan.state,first:plan.hand.slice(0,5),second:plan.draw};
}

describe('C02 stage qualifications and one-use hand return',()=>{
  it.each([1,2])('A12 awards three only after a real clear with all %i-card plays',(count)=>{
    const state=winner(['a12']),next=send(state,{type:'PlayHand',selectedIds:state.handOrder.slice(-count)});
    expect(next.phase).toBe('stage-cleared');expect(next.gold).toBe(34);expect(stage(next).maxPlayedCount).toBe(count);
    expect(clearEvents(next,'a12')).toContainEqual(expect.objectContaining({operation:'add-gold',value:{n:'3',d:'1'},resourceBefore:31,resourceAfter:34}));
  });
  it('A12 sees the earlier three-card play, rather than only the winning hand or its single scoring card',()=>{
    const plan=cards(table(['a12']),SMALL_HAND);plan.state.handLevels.pair=30;
    let state=send(plan.state,{type:'PlayHand',selectedIds:plan.hand.slice(0,3)});expect(state.lastTrace!.finalScore).toBe('24');
    state=send(state,{type:'PlayHand',selectedIds:plan.hand.slice(3,5)});
    expect(state.phase).toBe('stage-cleared');expect(stage(state).maxPlayedCount).toBe(3);expect(state.gold).toBe(30);expect(clearEvents(state,'a12')).toEqual([]);
  });
  it('D12 uses held at submission, not post-play refills: four held awards two',()=>{
    const plan=cards(table(['d12','c08']),[[2,'spades'],[3,'hearts'],[4,'clubs'],[5,'diamonds'],[9,'hearts'],[11,'clubs'],[13,'spades'],[14,'hearts']]);
    const next=send(plan.state,{type:'PlayHand',selectedIds:plan.hand.slice(0,4)});
    // RULES table: ordinary straight125/4 + points(2+3+4+5) = 556.
    expect(next.lastTrace!.finalScore).toBe('556');expect(next.lastTrace!.sets.heldIds).toHaveLength(4);expect(next.gold).toBe(33);
    expect(clearEvents(next,'d12')).toContainEqual(expect.objectContaining({operation:'add-gold',value:{n:'2',d:'1'}}));
  });
  it('D12 does not award for three held, even though a continuing hand would refill to eight',()=>{
    const plan=straightAfterFlush(['d12']),next=send(plan.state,{type:'PlayHand',selectedIds:plan.first});
    expect(next.phase).toBe('await-input');expect(next.handOrder).toHaveLength(8);expect(next.lastTrace!.sets.heldIds).toHaveLength(3);expect(clearEvents(next,'d12')).toEqual([]);
    const done=send(next,{type:'PlayHand',selectedIds:plan.second});expect(done.phase).toBe('stage-cleared');expect(done.lastTrace!.sets.heldIds).toHaveLength(3);
    expect(done.gold).toBe(30);expect(clearEvents(done,'d12')).toEqual([]);
  });
  it('B12 returns a losing-wager unfinished four-kind, keeps its once flag, and never rewinds playIndex',()=>{
    const plan=cards(table(['b12'],5),[[2,'spades'],[2,'hearts'],[2,'clubs'],[2,'diamonds'],[3,'spades'],[3,'hearts'],[3,'clubs'],[3,'diamonds']]);
    plan.state.characterId='touye';plan.state.rng.rule={algorithm:'fnv1a-mulberry32-v1',state:1};
    let state=send(send(plan.state,{type:'SetWager',enabled:true}),{type:'PlayHand',selectedIds:plan.hand.slice(0,4)});
    // B02 suppresses the fourth ordinary point: floor((320+6)*7*3/4)=1711 < target2000.
    expect(state.lastTrace!.finalScore).toBe('1711');expect(stage(state)).toMatchObject({heat:'1711',handsLeft:4,playIndex:1,quadRefundUsed:true});
    const event=state.lastTrace!.events.find(e=>e.sourceDefinitionId==='b12'&&e.operation==='refund-hand');
    expect(event).toMatchObject({phase:'afterHand',sourceInstanceId:'owned/b12',value:{n:'1',d:'1'},resourceBefore:3,resourceAfter:4});expect(event!.before).toEqual(event!.after);
    state=send(state,{type:'PlayHand',selectedIds:plan.hand.slice(4,8)});
    expect(state.lastTrace!.finalScore).toBe('2648');expect(stage(state)).toMatchObject({heat:'4359',handsLeft:3,playIndex:2,quadRefundUsed:true});
    expect(state.lastTrace!.events.some(e=>e.operation==='refund-hand')).toBe(false);
  });
  it('B12 prevents exhausted-hand failure before F07 and preserves the unspent rescue instance',()=>{
    const plan=cards(table(['b12','f07'],5),[[2,'spades'],[3,'hearts'],[4,'clubs'],[5,'diamonds'],[6,'spades'],[6,'hearts'],[6,'clubs'],[6,'diamonds']]);
    plan.state.characterId='touye';plan.state.rng.rule={algorithm:'fnv1a-mulberry32-v1',state:1};
    let state=plan.state;for(const id of plan.hand.slice(0,3))state=send(state,{type:'PlayHand',selectedIds:[id]});
    expect(stage(state).handsLeft).toBe(1);state=send(send(state,{type:'SetWager',enabled:true}),{type:'PlayHand',selectedIds:plan.hand.slice(4,8)});
    expect(state.lastTrace!.finalScore).toBe('1774');expect(stage(state).heat).toBe('1852');
    expect(state.phase).toBe('await-input');expect(stage(state)).toMatchObject({handsLeft:1,playIndex:4,quadRefundUsed:true,rescueUsed:false});
    expect(state.safetyNetUsed).toBe(false);expect(state.jokers.some(j=>j.definitionId==='f07')).toBe(true);expect(state.lastTrace!.destroyedJokerIds).toEqual([]);
  });
  it('a winning four-kind gets no B12 refund or once-only consumption',()=>{
    const plan=cards(table(['b12']),[[2,'spades'],[2,'hearts'],[2,'clubs'],[2,'diamonds'],[3,'spades'],[4,'hearts'],[6,'clubs'],[9,'diamonds']]);
    const next=send(plan.state,{type:'PlayHand',selectedIds:plan.hand.slice(0,4)});
    expect(next.phase).toBe('stage-cleared');expect(stage(next)).toMatchObject({handsLeft:3,quadRefundUsed:false});expect(next.lastTrace!.events.some(e=>e.operation==='refund-hand')).toBe(false);
  });
});

describe('C02 C12 fixed reward draw and E10 held clear cycle',()=>{
  it.each([false,true])('C12 flush700 then straight580 draws T04 exactly once; full=%s',(full)=>{
    const plan=straightAfterFlush(['c12'],full?['T01','T17']:[]);let state=send(plan.state,{type:'PlayHand',selectedIds:plan.first});
    expect(state.lastTrace!.handType).toBe('flush');expect(state.lastTrace!.finalScore).toBe('700');expect(stage(state)).toMatchObject({ordinaryFlushSeen:true,ordinaryStraightSeen:false});
    const before=structuredClone(state);state=send(state,{type:'PlayHand',selectedIds:plan.second});
    // RULES table: flush(140+35)*4=700, straight(125+20)*4=580; canonical chapter2 normal target1000.
    expect(state.lastTrace!.handType).toBe('straight');expect(state.lastTrace!.finalScore).toBe('580');expect(stage(state)).toMatchObject({ordinaryFlushSeen:true,ordinaryStraightSeen:true,heat:'1280'});
    // Published Mulberry32 vector: cursor0 produces index1 in a four-entry pool and advances one step.
    expect(state.rng.reward).toEqual({algorithm:'fnv1a-mulberry32-v1',state:1831565813});
    for(const key of ['deck','shop','rule'] as const)expect(state.rng[key]).toEqual(before.rng[key]);
    expect(state.gold).toBe(full?32:30);expect(state.consumables.map(item=>item.definitionId)).toEqual(full?['T01','T17']:['T04']);
    expect(clearEvents(state,'c12')).toContainEqual(expect.objectContaining({operation:full?'add-gold':'reward-consumable',rewardDefinitionId:'T04',sourceInstanceId:'owned/c12',value:{n:full?'2':'1',d:'1'}}));
  });
  it('ordinary flush plus straight-flush does not substitute for an ordinary straight',()=>{
    const plan=straightAfterFlush(['c12'],[],true);let state=send(plan.state,{type:'PlayHand',selectedIds:plan.first});const before=structuredClone(state);
    state=send(state,{type:'PlayHand',selectedIds:plan.second});expect(state.lastTrace!.handType).toBe('straight-flush');
    expect(stage(state)).toMatchObject({ordinaryFlushSeen:true,ordinaryStraightSeen:false});expect(state.consumables).toEqual([]);expect(clearEvents(state,'c12')).toEqual([]);expect(state.rng).toEqual(before.rng);
  });
  it('E10 0→1 emits the saved cycle without a prize; next clear 1→0 emits fixed T01 with no draw',()=>{
    let state=clear(winner(['e10']));expect(state.jokers[0]).toMatchObject({counters:{stageClears:1}});expect(state.consumables).toEqual([]);
    expect(clearEvents(state,'e10')).toContainEqual(expect.objectContaining({operation:'increment-clear-cycle',resourceBefore:0,resourceAfter:1}));
    state=send(send(send(state,{type:'OpenShop'}),{type:'LeaveShop'}),{type:'EnterStage'});const before=structuredClone(state);state=clear(state);
    expect(state.jokers[0]).toMatchObject({counters:{stageClears:0}});expect(state.consumables.map(item=>item.definitionId)).toEqual(['T01']);expect(state.rng).toEqual(before.rng);
    expect(clearEvents(state,'e10').map(e=>e.operation)).toEqual(['increment-clear-cycle','reward-consumable']);
    expect(clearEvents(state,'e10')[1]).toMatchObject({rewardDefinitionId:'T01',resourceBefore:0,resourceAfter:1});
    expect(state.lastTrace!.sourceJokers[0]).toMatchObject({counters:{stageClears:1}});expect(state.lastTrace!.jokers[0]).toMatchObject({counters:{stageClears:0}});
  });
  it('E10 second clear at capacity converts to two gold without drawing or replacing items',()=>{
    const state=winner(['e10'],['T17','T18']);Object.assign(state.jokers[0].counters!,{stageClears:1});const before=structuredClone(state),next=clear(state);
    expect(next.gold).toBe(33);expect(next.consumables).toEqual(before.consumables);expect(next.rng).toEqual(before.rng);expect(next.jokers[0]).toMatchObject({counters:{stageClears:0}});
    expect(clearEvents(next,'e10').map(e=>e.operation)).toEqual(['increment-clear-cycle','add-gold']);
  });
  it('new E10 purchase initializes its own zero cycle, not earlier unheld successful clears',()=>{
    const state=fixture();state.shop!.offers=[{offerId:'fixture/e10',definitionId:'e10',price:6,consumed:false}];
    const next=send(state,{type:'BuyOffer',offerId:'fixture/e10'});expect(next.jokers[0]).toMatchObject({definitionId:'e10',counters:{stageClears:0}});
  });
});

describe('C02 exact coefficients, sale window and paid reroll growth',()=>{
  it.each(['e11','f12'])('actual S06 rare reward creates %s with coefficient1 and preserves its reward source',(id)=>{
    const state=fixture([],['S06']),pool=R2_JOKERS.filter(definition=>definition.rarity==='rare');
    const index=pool.findIndex(definition=>definition.id===id);expect(index).toBeGreaterThanOrEqual(0);
    // Catalog order is used only to arrange a finite RNG fixture; the required result ×1 is handwritten.
    let cursor=0;while(cursor<1024&&SeededRng.restore({algorithm:'fnv1a-mulberry32-v1',state:cursor}).integer(0,pool.length-1)!==index)cursor++;
    expect(cursor).toBeLessThan(1024);state.rng.reward={algorithm:'fnv1a-mulberry32-v1',state:cursor};
    const cmd=command(state,{type:'UseConsumable',instanceId:'tool/0',targetIds:[]}),result=applyCommand(state,cmd);
    expect(result.ok,result.ok?'':result.code).toBe(true);if(!result.ok)return;
    expect(result.state.gold).toBe(0);expect(result.state.jokers).toHaveLength(1);expect(result.state.jokers[0]).toMatchObject({definitionId:id,paidPrice:0,growth:{coefficient:{n:'1',d:'1'}}});
    expect(result.events).toContainEqual(expect.objectContaining({type:'consumable-used',definitionId:'S06',instanceId:'tool/0',createdJokerIds:[result.state.jokers[0].instanceId]}));
    expect(result.state.rng.reward.state).toBe((cursor+1831565813)>>>0);for(const key of ['deck','shop','rule'] as const)expect(result.state.rng[key]).toEqual(state.rng[key]);
  });
  it.each(['e11','f12'])('buying %s creates the required exact ×1 coefficient',(id)=>{
    const state=fixture();state.shop!.offers=[{offerId:'fixture/'+id,definitionId:id,price:8,consumed:false}];
    const next=send(state,{type:'BuyOffer',offerId:'fixture/'+id});expect(coefficients(next,id)).toEqual({n:'1',d:'1'});
  });
  it('E11 clear grows after scoring and trace keeps both the start source and final exact coefficient',()=>{
    const state=winner(['e11']),next=clear(state);expect(next.lastTrace!.finalScore).toBe('2648');expect(coefficients(next,'e11')).toEqual({n:'11',d:'10'});
    expect(next.lastTrace!.sourceJokers[0].growth.coefficient).toEqual({n:'1',d:'1'});expect(next.lastTrace!.jokers[0].growth.coefficient).toEqual({n:'11',d:'10'});
    const event=clearEvents(next,'e11').find(e=>e.operation==='add-coefficient');expect(event).toMatchObject({value:{n:'1',d:'10'},growthBefore:{n:'1',d:'1'},growthAfter:{n:'11',d:'10'}});
    expect(event!.before).toEqual(event!.after);expect(event!.resourceBefore).toBeUndefined();expect(event!.resourceAfter).toBeUndefined();
  });
  it.each([['19','10'],['2','1']] as const)('E11 clear stops at exact ×2 from %s/%s',(n,d)=>{
    const state=winner(['e11']);state.jokers[0].growth.coefficient={n,d};const next=clear(state);expect(coefficients(next,'e11')).toEqual({n:'2',d:'1'});
  });
  it('successful prep-shop sale resets E11, survives both paid/free refresh and blocks this stage growth',()=>{
    let state=fixture(['e11','pengci'],['T18']);state.jokers[0].growth.coefficient={n:'13',d:'10'};
    const result=applyCommand(state,command(state,{type:'SellJoker',instanceId:'owned/pengci'}));expect(result.ok,result.ok?'':result.code).toBe(true);if(!result.ok)return;state=result.state;
    expect(coefficients(state,'e11')).toEqual({n:'1',d:'1'});expect(result.events).toContainEqual(expect.objectContaining({type:'joker-transaction',phase:'onSellJoker',operation:'reset-coefficient',amount:'-3/10',growthBefore:{n:'13',d:'10'},growthAfter:{n:'1',d:'1'}}));
    state=send(state,{type:'RerollShop'});expect(state.shop).toMatchObject({soldJoker:true});state=send(state,{type:'UseConsumable',instanceId:'tool/0',targetIds:[]});expect(state.shop).toMatchObject({soldJoker:true});
    state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});state.handLevels['high-card']=30;expect(stage(state).jokerSold).toBe(true);state=clear(state);
    expect(coefficients(state,'e11')).toEqual({n:'1',d:'1'});expect(clearEvents(state,'e11')).toEqual([]);
  });
  it('selling before buying E11 still blocks this stage, and the next preparation shop starts clean',()=>{
    let state=send(fixture(['pengci']),{type:'SellJoker',instanceId:'owned/pengci'});state.shop!.offers=[{offerId:'fixture/e11',definitionId:'e11',price:8,consumed:false}];state=send(state,{type:'BuyOffer',offerId:'fixture/e11'});
    state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});state.handLevels['high-card']=30;state=clear(state);expect(coefficients(state,'e11')).toEqual({n:'1',d:'1'});expect(stage(state).jokerSold).toBe(true);
    state=send(state,{type:'OpenShop'});expect(state.shop).toMatchObject({soldJoker:false});state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});expect(stage(state).jokerSold).toBe(false);state=clear(state);expect(coefficients(state,'e11')).toEqual({n:'11',d:'10'});
  });
  it('E12 grows exactly three only on paid rerolls; free T18 changes shelf but no growth',()=>{
    let state=fixture(['e12'],['T18']);const before=structuredClone(state),cmd=command(state,{type:'RerollShop'}),paid=applyCommand(state,cmd);
    expect(paid.ok,paid.ok?'':paid.code).toBe(true);if(!paid.ok)return;state=paid.state;expect(state.gold).toBe(18);expect(state.jokers[0].growth.heat).toEqual({n:'3',d:'1'});
    expect(paid.events).toContainEqual(expect.objectContaining({type:'joker-transaction',phase:'onReroll',definitionId:'e12',operation:'add-growth',amount:'3/1'}));
    for(const key of ['deck','rule','reward'] as const)expect(state.rng[key]).toEqual(before.rng[key]);
    const duplicate=applyCommand(state,cmd);expect(duplicate.ok&&duplicate.duplicate).toBe(true);expect(duplicate.state).toBe(state);expect(duplicate.ok&&duplicate.events).toEqual([]);
    state=send(state,{type:'UseConsumable',instanceId:'tool/0',targetIds:[]});expect(state.gold).toBe(18);expect(state.jokers[0].growth.heat).toEqual({n:'3',d:'1'});expect(state.shop!.rerollCount).toBe(2);
    state=send(state,{type:'RerollShop'});expect(state.gold).toBe(14);expect(state.jokers[0].growth.heat).toEqual({n:'6',d:'1'});
  });
  it('E12 saturates at sixty and insufficient gold/stale intents cannot consume any RNG or growth',()=>{
    let state=fixture(['e12'],['T18']);state.jokers[0].growth.heat={n:'59',d:'1'};state=send(state,{type:'RerollShop'});expect(state.jokers[0].growth.heat).toEqual({n:'60',d:'1'});
    state=send(state,{type:'RerollShop'});expect(state.jokers[0].growth.heat).toEqual({n:'60',d:'1'});
    const stale={...command(state,{type:'RerollShop'}),commandId:'c02-economy/old-preview'};state=send(state,{type:'DestroyConsumable',instanceId:'tool/0'});unchangedRejection(state,stale,'stale-sequence');
    state.gold=0;unchangedRejection(state,command(state,{type:'RerollShop'}),'not-enough-gold');
  });
  it('F12 last available winning hand grows once, after current score, and an early clear does not',()=>{
    const plan=cards(table(['f12']),SMALL_HAND);plan.state.handLevels.pair=30;let state=plan.state;
    for(const id of plan.hand.slice(0,3))state=send(state,{type:'PlayHand',selectedIds:[id]});
    state=send(state,{type:'PlayHand',selectedIds:plan.hand.slice(3,5)});expect(stage(state).handsLeft).toBe(0);expect(state.lastTrace!.finalScore).toBe('8640');
    expect(coefficients(state,'f12')).toEqual({n:'11',d:'10'});expect(state.lastTrace!.sourceJokers[0].growth.coefficient).toEqual({n:'1',d:'1'});expect(state.lastTrace!.jokers[0].growth.coefficient).toEqual({n:'11',d:'10'});
    expect(clearEvents(state,'f12')).toContainEqual(expect.objectContaining({operation:'add-coefficient',value:{n:'1',d:'10'}}));
    const early=clear(winner(['f12']));expect(coefficients(early,'f12')).toEqual({n:'1',d:'1'});expect(clearEvents(early,'f12')).toEqual([]);
  });
  it('F12 last-hand loss and all skipped stages do not grow, draw rewards or advance E10 cycle',()=>{
    const plan=cards(table(['f12']),SMALL_HAND);let state=plan.state;for(const id of plan.hand.slice(0,4))state=send(state,{type:'PlayHand',selectedIds:[id]});
    expect(state.phase).toBe('run-lost');expect(coefficients(state,'f12')).toEqual({n:'1',d:'1'});
    const skip=fixture(['a12','c12','e10','e11','f12']);Object.assign(skip.jokers[2].counters!,{stageClears:1});const before=structuredClone(skip),next=send(skip,{type:'SkipStage'});
    expect(next.gold).toBe(before.gold);expect(next.jokers).toEqual(before.jokers);expect(next.rng).toEqual(before.rng);expect(next.consumables).toEqual(before.consumables);expect(next.lastTrace).toBe(null);
    expect(stage(next)).toMatchObject({maxPlayedCount:0,ordinaryStraightSeen:false,ordinaryFlushSeen:false,quadRefundUsed:false,jokerSold:false,playIndex:0});
  });
  it('F12 exact coefficient cap is 5/2 rather than an accumulating float',()=>{
    const plan=cards(table(['f12']),SMALL_HAND);plan.state.handLevels.pair=30;plan.state.jokers[0].growth.coefficient={n:'12',d:'5'};let state=plan.state;
    for(const id of plan.hand.slice(0,3))state=send(state,{type:'PlayHand',selectedIds:[id]});state=send(state,{type:'PlayHand',selectedIds:plan.hand.slice(3,5)});
    expect(coefficients(state,'f12')).toEqual({n:'5',d:'2'});expect(clearEvents(state,'f12')).toContainEqual(expect.objectContaining({value:{n:'1',d:'10'},growthBefore:{n:'12',d:'5'},growthAfter:{n:'5',d:'2'}}));
  });
});

class FailingStore implements SaveStore {
  slots:SaveSlots={revision:0,current:null,previous:null};fail=false;writes=0;
  async read(){return structuredClone(this.slots);}
  async commit(revision:number,current:ReturnType<typeof makeCheckpoint>,previous:ReturnType<typeof makeCheckpoint>|null){
    this.writes++;if(this.fail)throw Error('quota-fixture');if(revision!==this.slots.revision)throw Error('write-conflict');
    this.slots={revision:revision+1,current:structuredClone(current),previous:structuredClone(previous)};return revision+1;
  }
}
it('C12 quota failure retains the determined one-draw reward candidate; retry and duplicate never redraw or reaward',async()=>{
  const plan=straightAfterFlush(['c12']),first=send(plan.state,{type:'PlayHand',selectedIds:plan.first}),store=new FailingStore();
  const run=await SavedRun.start(store,first,await store.read()),before=run.state,oldSlots=await store.read();store.fail=true;
  const cmd=command(before,{type:'PlayHand',selectedIds:plan.second});expect((await run.submit(cmd)).ok).toBe(false);expect(run.state).toBe(before);expect(await store.read()).toEqual(oldSlots);
  const raw=run.exportJSON(),pending=JSON.parse(raw).state as R2RunState;expect(pending.rng.reward).toEqual({algorithm:'fnv1a-mulberry32-v1',state:1831565813});expect(pending.consumables.map(i=>i.definitionId)).toEqual(['T04']);expect(pending.gold).toBe(30);
  store.fail=false;expect((await run.retry()).ok).toBe(true);expect(run.exportJSON()).toBe(raw);expect(run.state).toEqual(pending);
  const writes=store.writes,result=await run.submit(cmd);expect(result.ok&&result.duplicate).toBe(true);expect(store.writes).toBe(writes);expect(run.state.rng).toEqual(pending.rng);
});
