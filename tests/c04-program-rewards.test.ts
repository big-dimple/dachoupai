import {afterEach,describe,expect,it,vi} from 'vitest';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import type {R2ModeSelection,R2ProgramId} from '../src/content/r2Modes';
import {SeededRng} from '../src/core/SeededRng';
import {applyCommand,assertRunInvariants,createRun,stateHash,type Action,type Command,type R2RunState} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import type {R2HandType} from '../src/domain/evaluateR2';

// Controlled command fixtures only: owned repeated-rank cards, levels, gold and explicit RNG cursors.
// They are not evidence of natural acquisition, seed balance, normal traversal or human acceptance.
const selection=(patch:Partial<R2ModeSelection>={}):R2ModeSelection=>({mode:'standard',difficulty:0,challengeId:null,programsEnabled:true,...patch});
const seeds={PG01:'c04-program/PG01/0',PG02:'c04-program/PG02/0',PG03:'c04-program/PG03/0',PG04:'c04-program/PG04/1'} as const;
const zero={algorithm:'fnv1a-mulberry32-v1',state:0} as const;
const once={algorithm:'fnv1a-mulberry32-v1',state:1831565813} as const;
const twice={algorithm:'fnv1a-mulberry32-v1',state:3663131626} as const;
const command=(state:R2RunState,action:Action):Command=>({runId:state.runId,commandId:`program-reward/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
function send(state:R2RunState,action:Action):R2RunState {
  const result=applyCommand(state,command(state,action));
  expect(result.ok,result.ok?'':result.code).toBe(true);if(!result.ok)throw Error(result.code);
  assertRunInvariants(result.state);return result.state;
}
function rejected(state:R2RunState,action:Action,code?:string):void {
  const before=stateHash(state),rng=structuredClone(state.rng),result=applyCommand(state,command(state,action));
  expect(result.ok).toBe(false);if(result.ok)return;
  if(code)expect(result.code).toBe(code);
  expect(result.state).toBe(state);expect(stateHash(state)).toBe(before);expect(state.rng).toEqual(rng);
}
function ownedFixture(seed:string,modeConfig=selection(),levels:Partial<Record<R2HandType,number>>={}):R2RunState {
  // RULES §7: Laohuan adds heat only to ordinary straight/flush/straight-flush; none of our repeated-rank hands.
  const state=createRun({runId:`controlled/${seed}`,seed,characterId:'laohuan',rulesVersion:'r2',modeConfig});
  state.deckInstances=Array.from({length:32},(_,index)=>({id:`owned/two/${index}`,rank:2 as const,suit:'spades' as const}));
  state.drawPile=state.deckInstances.map(card=>card.id);state.handLevels={...levels};
  assertRunInvariants(state);return state;
}
function programFixture(id:R2ProgramId,levels:Partial<Record<R2HandType,number>>={}):R2RunState {
  const state=ownedFixture(seeds[id],selection(),levels);
  expect(state.program!.offerIds).toContain(id);
  return send(state,{type:'ChooseProgram',programId:id});
}
const enter=(state:R2RunState)=>send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
const nextStage=(state:R2RunState)=>enter(send(state,{type:'OpenShop'}));
const play=(state:R2RunState,count:number)=>send(state,{type:'PlayHand',selectedIds:state.handOrder.slice(0,count)});
const sources=(state:R2RunState,id:R2ProgramId)=>state.lastTrace!.events.filter(event=>event.sourceDefinitionId===id);
function restored(state:R2RunState):R2RunState {
  const read=readCheckpoint(JSON.parse(JSON.stringify(makeCheckpoint(state,[]))));
  expect(read.ok,read.ok?'':read.code).toBe(true);if(!read.ok)throw Error(read.code);
  assertRunInvariants(read.checkpoint.state);expect(stateHash(read.checkpoint.state)).toBe(stateHash(state));
  return read.checkpoint.state;
}
function pg03Boss(levels:Partial<Record<R2HandType,number>>={'high-card':20,pair:10,'three-kind':30}):R2RunState {
  let state=enter(programFixture('PG03',levels));
  state=play(state,1);expect(state.phase).toBe('stage-cleared');
  state=play(nextStage(state),2);expect(state.phase).toBe('stage-cleared');
  state=nextStage(state);
  // Explicit valid pre-Boss checkpoint resources/cursor: isolates the fifteen-gold and candidate contracts.
  state.gold=15;state.rng.program={...zero};assertRunInvariants(state);return state;
}
function pg04Clear(jokerIds:readonly string[]=[]):R2RunState {
  let state=programFixture('PG04');state.jokers=jokerIds.map(id=>r2CreateJoker(id,`owned/${id}`,4));
  // The real warm-stage skip creates a purchase coupon independently of PG04's later reroll coupon.
  state=send(state,{type:'SkipStage'});expect(state.purchaseCoupons).toBe(1);
  state=nextStage(state);
  for(let count=0;count<3;count++)state=play(state,1);
  expect(state.program!.lastOpportunityClear).toBe(false);
  state=play(state,5);expect(state.phase).toBe('stage-cleared');
  expect(state.stage!.handsLeft).toBe(0);expect(state.program!.lastOpportunityClear).toBe(true);
  expect(state.program!.claimed).toBe(false);expect(sources(state,'PG04')).toEqual([]);
  state=play(nextStage(state),5);expect(state.phase).toBe('stage-cleared');
  expect(state.program!.claimed).toBe(true);expect(state.programRerollCoupon).toBe(true);return state;
}
afterEach(()=>vi.restoreAllMocks());

describe('C04.2 actual program rewards through shared commands / controlled inventory',()=>{
  it.each(['PG01','PG02'] as const)('%s pays one literal four-gold source only at Boss success even when warm already qualifies',id=>{
    let state=enter(programFixture(id));
    for(const count of id==='PG01'?[1,2,3]:[1,1,1])state=play(state,count);
    expect(state.phase).toBe('await-input');expect(state.stage!.heat).toBe(id==='PG01'?'388':'66');
    state=play(state,5);expect(state.phase).toBe('stage-cleared');
    expect(state.program!.claimed).toBe(false);expect(sources(state,id)).toEqual([]);expect(state.gold).toBe(11);
    state=play(nextStage(state),5);expect(state.phase).toBe('stage-cleared');
    expect(state.program!.claimed).toBe(false);expect(sources(state,id)).toEqual([]);expect(state.gold).toBe(21);
    state=nextStage(state);const cmd=command(state,{type:'PlayHand',selectedIds:state.handOrder.slice(0,5)});
    const result=applyCommand(state,cmd);expect(result.ok,result.ok?'':result.code).toBe(true);if(!result.ok)return;
    state=result.state;assertRunInvariants(state);
    expect(state.gold).toBe(39);expect(state.stage!.goldEarned).toBe(18);expect(state.program!.claimed).toBe(true);
    expect(sources(state,id)).toHaveLength(1);
    expect(sources(state,id)[0]).toMatchObject({phase:'onStageClear',sourceType:'rule',sourceDefinitionId:id,
      sourceInstanceId:state.runId,operation:'add-gold',value:{n:'4',d:'1'},resourceBefore:35,resourceAfter:39,
      programGoldBeforeReward:21,visibleCondition:{kind:'always'},retriggerDepth:0});
    expect(sources(state,id)[0].before).toEqual(state.lastTrace!.accumulator);
    expect(sources(state,id)[0].after).toEqual(state.lastTrace!.accumulator);
    expect(state.chapterHandUsage).toEqual(id==='PG01'?{'high-card':1,pair:1,'three-kind':1,'flush-five':3}:{'high-card':3,'flush-five':3});
    const duplicate=applyCommand(state,cmd);expect(duplicate.ok&&duplicate.duplicate).toBe(true);
    expect(duplicate.state).toBe(state);if(duplicate.ok)expect(duplicate.events).toEqual([]);
    rejected(state,{type:'PlayHand',selectedIds:state.handOrder.slice(0,1)},'wrong-phase');restored(state);
  });

  it('PG03 uses exactly fifteen pre-reward gold and one dedicated uniform draw among actually used uncapped types',()=>{
    const input=pg03Boss(),rng=structuredClone(input.rng),levels=structuredClone(input.handLevels);
    const state=play(input,3);
    expect(state.chapterHandUsage).toEqual({'high-card':1,pair:1,'three-kind':1});
    expect(state.handLevels).toEqual({...levels,'high-card':21});expect(state.gold).toBe(28);
    expect(sources(state,'PG03')).toHaveLength(1);
    expect(sources(state,'PG03')[0]).toMatchObject({phase:'onStageClear',sourceType:'rule',operation:'upgrade-hand',
      value:{n:'1',d:'1'},targetHandType:'high-card',resourceBefore:20,resourceAfter:21,programGoldBeforeReward:15});
    expect(state.rng.program).toEqual(once);
    for(const stream of ['deck','rule','shop','reward','challenge'] as const)expect(state.rng[stream]).toEqual(rng[stream]);
    expect(input.handLevels).toEqual(levels);expect(input.rng).toEqual(rng);restored(state);
  });

  it('PG03 does not use ordinary clear/held-gold rewards to turn fourteen prior gold into qualification',()=>{
    const input=pg03Boss();input.gold=14;
    for(const card of input.deckInstances)card.enhancement='gold-paper';
    const rng=structuredClone(input.rng.program),levels=structuredClone(input.handLevels),state=play(input,3);
    // D24/CONTENT: held gold paper grants one each, cap five; 14 + (7 + 3 + 2) + 5 = 31.
    expect(state.gold).toBe(31);expect(state.program!.claimed).toBe(false);expect(sources(state,'PG03')).toEqual([]);
    expect(state.lastTrace!.events.filter(event=>event.reasonKey==='enhancement.gold-paper.add-gold')).toHaveLength(5);
    expect(state.handLevels).toEqual(levels);expect(state.rng.program).toEqual(rng);restored(state);
  });

  it('PG03 counts winning-hand lucky gold before clear rewards while keeping rule and program cursors separate',()=>{
    const input=pg03Boss();input.gold=14;input.rng.rule={...zero};
    input.deckInstances.find(card=>card.id===input.handOrder[0])!.enhancement='lucky-paper';
    const state=play(input,3);
    expect(state.lastTrace!.goldDelta).toBe(10);expect(state.gold).toBe(38);
    expect(sources(state,'PG03')[0]).toMatchObject({operation:'upgrade-hand',targetHandType:'high-card',
      resourceBefore:20,resourceAfter:21,programGoldBeforeReward:24});
    expect(state.rng.rule).toEqual(twice);expect(state.rng.program).toEqual(once);restored(state);
  });

  it('PG03 with every actually used type at thirty emits a skipped source without drawing or upgrading',()=>{
    const input=pg03Boss({'high-card':30,pair:30,'three-kind':30}),rng=structuredClone(input.rng),levels=structuredClone(input.handLevels);
    const state=play(input,3);expect(state.program!.claimed).toBe(true);expect(state.gold).toBe(28);
    expect(state.handLevels).toEqual(levels);expect(state.rng).toEqual(rng);
    expect(sources(state,'PG03')).toHaveLength(1);
    expect(sources(state,'PG03')[0]).toMatchObject({phase:'onStageClear',sourceType:'rule',operation:'program-reward-skipped',
      value:{n:'0',d:'1'},resourceBefore:0,resourceAfter:0,programGoldBeforeReward:15});
    expect(sources(state,'PG03')[0].targetHandType).toBeUndefined();restored(state);
  });

  it('PG04 produces one separate next-shop coupon; a free refresh advances count but not paid-refresh growth',()=>{
    const cleared=pg04Clear(['e12']);expect(sources(cleared,'PG04')).toHaveLength(1);
    expect(sources(cleared,'PG04')[0]).toMatchObject({phase:'onStageClear',sourceType:'rule',operation:'reward-free-reroll',
      value:{n:'1',d:'1'},resourceBefore:0,resourceAfter:1,programGoldBeforeReward:12});
    let state=send(restored(cleared),{type:'OpenShop'});
    expect(state.programRerollCoupon).toBe(false);expect(state.shop!.freeRerolls).toBe(1);expect(state.purchaseCoupons).toBe(1);
    // Optional growth keys represent their baseline without being materialized; free refresh must preserve the snapshot exactly.
    const growthBefore=structuredClone(state.jokers.find(joker=>joker.definitionId==='e12')!.growth);
    const gold=state.gold,cmd=command(state,{type:'RerollShop'}),result=applyCommand(state,cmd);
    expect(result.ok,result.ok?'':result.code).toBe(true);if(!result.ok)return;state=result.state;assertRunInvariants(state);
    expect(state.gold).toBe(gold);expect(state.shop).toMatchObject({freeRerolls:0,rerollCount:1});expect(state.purchaseCoupons).toBe(1);
    expect(state.jokers.find(joker=>joker.definitionId==='e12')!.growth).toEqual(growthBefore);
    expect(result.events.filter(event=>event.type==='joker-transaction'&&event.definitionId==='e12')).toEqual([]);
    const duplicate=applyCommand(state,cmd);expect(duplicate.ok&&duplicate.duplicate).toBe(true);expect(duplicate.state).toBe(state);
    state=send(state,{type:'RerollShop'});expect(state.gold).toBe(gold-3);expect(state.shop!.rerollCount).toBe(2);
    expect(state.jokers.find(joker=>joker.definitionId==='e12')!.growth.heat).toEqual({n:'3',d:'1'});restored(state);
  });

  it('PG04 expires unused at next-shop exit and never transfers into a later shop or purchase coupon',()=>{
    let state=send(pg04Clear(),{type:'OpenShop'});const oldTrace=structuredClone(state.lastTrace);
    expect(state.shop!.freeRerolls).toBe(1);expect(state.purchaseCoupons).toBe(1);
    state=send(state,{type:'LeaveShop'});expect(state.shop!.freeRerolls).toBe(0);expect(state.programRerollCoupon).toBe(false);
    expect(state.purchaseCoupons).toBe(1);expect(state.lastTrace).toEqual(oldTrace);state=restored(state);
    state=send(state,{type:'EnterStage'});state=play(state,5);state=send(state,{type:'OpenShop'});
    expect(state.shop!.freeRerolls).toBe(0);expect(state.programRerollCoupon).toBe(false);expect(state.purchaseCoupons).toBe(1);
  });

  it('PG04 does not qualify an unsuccessful zero-opportunity hand rescued by F07, then accepts a real fifth-hand clear',()=>{
    let state=programFixture('PG04');state.jokers=[r2CreateJoker('f07','owned/f07',4)];state=enter(state);
    for(let index=0;index<4;index++)state=play(state,1);
    expect(state.phase).toBe('await-input');expect(state.stage).toMatchObject({handsLeft:1,playIndex:4,rescueUsed:true});
    expect(state.program!.lastOpportunityClear).toBe(false);expect(state.program!.claimed).toBe(false);
    expect(state.lastTrace!.events.some(event=>event.operation==='rescue-hand')).toBe(true);state=restored(state);
    state=play(state,5);expect(state.phase).toBe('stage-cleared');expect(state.stage!.handsLeft).toBe(0);
    expect(state.program!.lastOpportunityClear).toBe(true);expect(state.program!.claimed).toBe(false);expect(sources(state,'PG04')).toEqual([]);
  });

  it('PG04 does not qualify an unsuccessful zero-opportunity quad refund, then accepts a real fifth-hand clear',()=>{
    let state=programFixture('PG04');
    // Explicit valid chapter-three warm checkpoint, matching the established C03 controlled-boundary pattern.
    Object.assign(state,{chapter:3,stageIndex:6,boss:{definitionId:'B04',disabledSuit:null},seenBossIds:['B01','B02','B04']});
    state.program!.chapter=3;state.shop!.visitIndex=6;state.jokers=[r2CreateJoker('b12','owned/b12',4)];
    assertRunInvariants(state);state=enter(state);
    for(let index=0;index<3;index++)state=play(state,1);
    state=play(state,4);expect(state.phase).toBe('await-input');
    expect(state.stage).toMatchObject({heat:'2362',handsLeft:1,playIndex:4,quadRefundUsed:true});
    expect(state.program!.lastOpportunityClear).toBe(false);expect(state.lastTrace!.events.some(event=>event.operation==='refund-hand')).toBe(true);
    state=play(restored(state),5);expect(state.phase).toBe('stage-cleared');expect(state.stage!.handsLeft).toBe(0);
    expect(state.program!.lastOpportunityClear).toBe(true);expect(state.program!.claimed).toBe(false);expect(sources(state,'PG04')).toEqual([]);
  });

  it('allows the first choice after a real warm-stage skip because no actual EnterStage has occurred',()=>{
    let state=ownedFixture(seeds.PG01);const id=state.program!.offerIds[0];state=send(state,{type:'SkipStage'});
    expect(state.program!.choiceMade).toBe(false);expect(state.chapterHandUsage).toEqual({});state=send(state,{type:'OpenShop'});
    state=send(state,{type:'ChooseProgram',programId:id});expect(state.program).toMatchObject({selectedId:id,choiceMade:true});
    state=enter(state);expect(state.stage!.index).toBe(1);rejected(state,{type:'ChooseProgram',programId:null});
  });

  it('allows a first choice before the Boss when both optional stages were skipped, then seals entry once',()=>{
    let state=ownedFixture(seeds.PG02);const id=state.program!.offerIds[0];
    for(let index=0;index<2;index++)state=send(send(state,{type:'SkipStage'}),{type:'OpenShop'});
    expect(state.stageIndex).toBe(2);expect(state.program!.choiceMade).toBe(false);expect(state.chapterHandUsage).toEqual({});
    state=send(state,{type:'ChooseProgram',programId:id});state=enter(state);expect(state.program!.selectedId).toBe(id);
    rejected(state,{type:'ChooseProgram',programId:null});
  });

  it('Q06 never offers PG04 and atomically rejects both paid refresh and an adversarial incoming free coupon',()=>{
    const state=ownedFixture('challenge/q06/0',selection({mode:'challenge',challengeId:'Q06'}));
    expect(state.program!.offerIds).toHaveLength(2);expect(state.program!.offerIds).not.toContain('PG04');
    rejected(state,{type:'ChooseProgram',programId:'PG04'},'invalid-program-offer');rejected(state,{type:'RerollShop'},'reroll-disabled');
    // Deliberately invalid incoming data is a rejection probe, not a valid checkpoint or acquisition claim.
    const malformed=structuredClone(state);malformed.shop!.freeRerolls=1;
    rejected(malformed,{type:'RerollShop'},'reroll-disabled');
  });
});

describe('C04.2 Q11 actual entry/trace snapshots / controlled owned Jokers',()=>{
  it('Q11 blocks a scoring hook and foil together while keeping its actual source inventory',()=>{
    let state=ownedFixture('challenge/q11/2',selection({mode:'challenge',challengeId:'Q11'}));
    expect(state.chapterDisabledJokerId).toBe('b05');state.jokers=[r2CreateJoker('b05','owned/b05',4,'foil')];state=enter(state);state=play(state,3);
    expect(state.lastTrace!.finalScore).toBe('288');expect(state.stage!.challengeDisabledJokerId).toBe('b05');
    expect(state.lastTrace!.bossContext.challengeDisabledJokerId).toBe('b05');
    expect(state.lastTrace!.sourceJokers).toMatchObject([{instanceId:'owned/b05',definitionId:'b05',edition:'foil'}]);
    expect(state.lastTrace!.events.filter(event=>event.sourceType==='joker'&&event.sourceInstanceId==='owned/b05')).toEqual([]);restored(state);
    let control=ownedFixture('c04-q11-unbanned-control',selection({programsEnabled:false}));
    control.jokers=[r2CreateJoker('b05','owned/b05',4,'foil')];control=play(enter(control),3);
    // RULES/D24: (90 base + 6 ordinary + 45 from three B05 triggers + 25 foil) × 3 = 498.
    expect(control.lastTrace!.finalScore).toBe('498');
  });

  it('Q11 preserves the banned static hand-cap modifier while suppressing its foil edition',()=>{
    let state=ownedFixture('challenge/q11/0',selection({mode:'challenge',challengeId:'Q11'}));
    expect(state.chapterDisabledJokerId).toBe('d06');state.jokers=[r2CreateJoker('d06','owned/d06',4,'foil')];state=enter(state);
    expect(state.stage!.initialHandLimit).toBe(9);expect(state.handOrder).toHaveLength(9);
    state=play(state,1);expect(state.lastTrace!.finalScore).toBe('22');
    expect(state.lastTrace!.events.filter(event=>event.sourceType==='joker'&&event.sourceInstanceId==='owned/d06')).toEqual([]);restored(state);
  });

  it('Q11 preserves the banned non-math discard refund while suppressing its polychrome edition',()=>{
    let state=ownedFixture('challenge/q11/1',selection({mode:'challenge',challengeId:'Q11'}));
    expect(state.chapterDisabledJokerId).toBe('d05');state.jokers=[r2CreateJoker('d05','owned/d05',4,'polychrome')];state=enter(state);
    const result=applyCommand(state,command(state,{type:'DiscardHand',selectedIds:[state.handOrder[0]]}));
    expect(result.ok,result.ok?'':result.code).toBe(true);if(!result.ok)return;state=result.state;assertRunInvariants(state);
    expect(state.stage).toMatchObject({discardsLeft:3,discardsUsed:1,discardSpent:1,discardGained:1});
    expect(result.events).toContainEqual(expect.objectContaining({type:'joker-transaction',definitionId:'d05',operation:'refund-discard',amount:'1'}));
    state=play(state,1);expect(state.lastTrace!.finalScore).toBe('22');restored(state);
  });

  it('Q11 keeps the old stage/trace ban after chapter advance and restoration without another draw',()=>{
    let state=ownedFixture('challenge/q11/2',selection({mode:'challenge',challengeId:'Q11'}),{'high-card':30});
    state.jokers=[r2CreateJoker('b05','owned/b05',4,'foil')];state=enter(state);
    for(let index=0;index<3;index++){state=play(state,1);if(index<2)state=nextStage(state);}
    const trace=structuredClone(state.lastTrace),stage=structuredClone(state.stage);expect(trace!.bossContext.challengeDisabledJokerId).toBe('b05');
    state=send(state,{type:'OpenShop'});expect(state.chapter).toBe(2);expect(state.chapterDisabledJokerId).toBe('b03');
    expect(state.stage).toEqual(stage);expect(state.lastTrace).toEqual(trace);
    const rng=structuredClone(state.rng),next=vi.spyOn(SeededRng.prototype,'next');state=restored(state);
    expect(next).not.toHaveBeenCalled();expect(state.rng).toEqual(rng);expect(state.lastTrace).toEqual(trace);
    expect(state.stage!.challengeDisabledJokerId).toBe('b05');expect(state.lastTrace!.bossContext.challengeDisabledJokerId).toBe('b05');
    state=enter(state);expect(state.stage!.challengeDisabledJokerId).toBe('b03');
  });
});
