import {R2_S04_FINISH_HASH,R2_S04_FINISH_VERSION} from '../src/domain/r2GroupUpgrade';
import {describe,it,expect} from 'vitest';
import {applyCommand,createRun,type R2RunState} from '../src/domain/run';
import {r2ScoreContext,r2CreateJoker} from '../src/domain/r2Run';
import {R2_ROUTE_GROWTH_VERSION,R2_ROUTE_GROWTH_HASH,isR2TouyeNewCore} from '../src/domain/r2GroupUpgrade';
import {newRunIdentity,launchIdentity} from '../src/game/RunLaunch';
import {touyeChoice,touyeConfirmationCopy} from '../src/game/TouyeWagerCopy';
import {makeCheckpoint,readCheckpoint,type Checkpoint} from '../src/application/checkpoint';
import {stableHash} from '../src/domain/hash';
import {scoreR2Hand,previewR2Hand} from '../src/domain/scoreR2';
import {SavedRun,type SaveStore,type SaveSlots} from '../src/application/SavedRun';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {touyeFixture,touyeBet,touyeSend,touyeCommand,matureMain,type TouyeScenario} from './fixtures/touye-new-core';
const old={contentVersion:R2_ROUTE_GROWTH_VERSION,contentHash:R2_ROUTE_GROWTH_HASH};
function round(s:R2RunState){const cp=makeCheckpoint(s,[]),r=readCheckpoint(JSON.parse(JSON.stringify(cp)));expect(r).toEqual({ok:true,checkpoint:cp});return s;}
function mutate(cp:Checkpoint,change:(s:R2RunState)=>void){const bad=structuredClone(cp);change(bad.state);const {checksum,...payload}=bad;return {...payload,checksum:stableHash(payload)};}
function pending(kind:TouyeScenario='mature-win'){const f=touyeFixture(kind);return {...f,state:round(touyeSend(f.state,touyeBet(f.state,f.discard,f.target)))};}
describe('Touye actual refill ID responsibility, separate new identity',()=>{
 it('keeps new-core capability in bounded launches and exact old retries',()=>{
  expect(isR2TouyeNewCore(newRunIdentity('touye','group'))).toBe(true);
  for(const hero of ['amo','erxiang','laohuan'] as const)expect(newRunIdentity(hero,'group')).toEqual({contentVersion:R2_S04_FINISH_VERSION,contentHash:R2_S04_FINISH_HASH});
  const f=touyeFixture('mature-win',{identity:old});expect(launchIdentity('touye',{kind:'retry',run:f.state})).toEqual(old);expect(touyeChoice(f.state,f.discard).choices.find(c=>c.target===f.target)!.available).toBe(false);
  expect(applyCommand(f.state,touyeCommand(f.state,touyeBet(f.state,f.discard,f.target)))).toMatchObject({ok:false,code:'touye-target-already-reachable'});
 });
 it.each(['mature-win','unformed-win','duplicate-face','short','four-straight','four-flush','B02-zero','full-house-core','four-kind-core'] as const)('%s wins only with actual new ID in authoritative active core',kind=>{
  const f=pending(kind),before=structuredClone(f.state),after=round(touyeSend(f.state,{type:'PlayHand',selectedIds:f.play})),trace=after.lastTrace!;
  expect(trace.touyeWager).toMatchObject({outcome:'won',multiplier:'2',core:{contract:'new-core-v1',lossReason:null}});
  expect(trace.touyeWager!.core!.activeNewIds).toEqual(f.incoming);expect(trace.sets.activeScoringIds).toEqual(expect.arrayContaining(f.incoming));expect(f.state).toEqual(before);
  expect(after.stage!.touyeWager!.resolution).toBe('played');expect(after.stage!.playIndex).toBe(1);expect(trace.events.filter(e=>e.sourceDefinitionId==='touye')).toHaveLength(1);
  if(kind==='B02-zero')expect(trace.events.some(e=>e.operation==='ordinary-points-suppressed'&&e.targetCardId===f.incoming[0])).toBe(true);
  if(kind==='short'){expect(f.state.stage!.touyeWager!.commit!.refill!.refilledIds).toHaveLength(1);expect(touyeConfirmationCopy(touyeFixture(kind).state,f.discard).refillCount).toBe(1);}
 });
 it.each(['mature-old-core','mature-accompanying','target-miss','disabled-core','four-kind-flush','unformed-disabled','all-disabled-flush'] as const)('%s is a legal loss and consumes, rather than rejecting to retry for free',kind=>{
  const f=pending(kind),after=round(touyeSend(f.state,{type:'PlayHand',selectedIds:f.play})),t=after.lastTrace!;
  expect(t.touyeWager).toMatchObject({outcome:'lost',multiplier:'0.85'});expect(after.stage!.touyeWager!.resolution).toBe('played');expect(after.stage!.playIndex).toBe(1);expect(after.stage!.handsLeft).toBe(f.state.stage!.handsLeft-1);
  expect(touyeChoice(after).used).toBe(true);if(kind==='mature-old-core'||kind==='mature-accompanying'||kind==='disabled-core'||kind==='unformed-disabled'||kind==='all-disabled-flush')expect(t.touyeWager!.core!.lossReason).toBe('new-core');
  if(kind==='all-disabled-flush')expect(t.sets.activeScoringIds).toEqual([]);
  if(kind==='four-kind-flush')expect(t.handType).toBe('four-kind');
 });
 it('locks re-discard, tools and Joker edits, permits hand reorder, and repeated commands never reroll or rescore',()=>{
  const f=touyeFixture(),c=touyeCommand(f.state,touyeBet(f.state,f.discard,f.target)),first=applyCommand(f.state,c);expect(first.ok).toBe(true);if(!first.ok)throw Error(first.code);const s=round(first.state);
  expect(applyCommand(s,c)).toMatchObject({ok:true,duplicate:true,state:s});
  for(const action of [{type:'DiscardHand',selectedIds:[s.handOrder[0]]},{type:'UseConsumable',instanceId:'none',targetIds:[s.handOrder[0]]},{type:'ReorderJokers',ids:[]},{type:'SellJoker',instanceId:'none'}] as const)expect(applyCommand(s,touyeCommand(s,action))).toMatchObject({ok:false,code:'touye-next-hand-locked',state:s});
  const reordered=round(touyeSend(s,{type:'ReorderHand',ids:[...s.handOrder].reverse()}));expect(reordered.stage!.touyeWager!.commit).toEqual(s.stage!.touyeWager!.commit);
  const play=touyeCommand(reordered,{type:'PlayHand',selectedIds:f.play}),a=applyCommand(reordered,play);expect(a.ok).toBe(true);if(!a.ok)throw Error(a.code);expect(applyCommand(round(a.state),play)).toMatchObject({ok:true,duplicate:true,state:a.state});
 });
 it('B08/Q01 and empty stack forbid commitment atomically; B07 still pays the real discard cost',()=>{
  for(const options of [{boss:{definitionId:'B08' as const,disabledSuit:null}},{challenge:true}]){const f=touyeFixture('mature-win',options),before=structuredClone(f.state);expect(applyCommand(f.state,touyeCommand(f.state,touyeBet(f.state,f.discard,f.target)))).toMatchObject({ok:false,code:'touye-disabled',state:f.state});expect(f.state).toEqual(before);}
  const empty=touyeFixture('empty');expect(applyCommand(empty.state,touyeCommand(empty.state,touyeBet(empty.state,empty.discard,empty.target)))).toMatchObject({ok:false,code:'touye-no-next-hand',state:empty.state});
  const paid=touyeFixture('mature-win',{boss:{definitionId:'B07',disabledSuit:null}}),s=touyeSend(paid.state,touyeBet(paid.state,paid.discard,paid.target));expect(s.gold).toBe(paid.state.gold-1);round(s);
 });
 it('qualification-only comparison on the same disabled new core preserves the old win and makes the new wager lose',()=>{
  const legacy=touyeFixture('unformed-disabled',{identity:old}),current=touyeFixture('unformed-disabled');
  const oldPlayed=round(touyeSend(touyeSend(legacy.state,touyeBet(legacy.state,legacy.discard,legacy.target)),{type:'PlayHand',selectedIds:legacy.play}));
  const newPlayed=round(touyeSend(touyeSend(current.state,touyeBet(current.state,current.discard,current.target)),{type:'PlayHand',selectedIds:current.play}));
  expect(oldPlayed.lastTrace!.touyeWager!.outcome).toBe('won');expect(newPlayed.lastTrace!.touyeWager!.outcome).toBe('lost');expect(oldPlayed.lastTrace!.sets).toEqual(newPlayed.lastTrace!.sets);
  expect(oldPlayed.lastTrace!.touyeWager).not.toHaveProperty('core');expect(oldPlayed.stage!.touyeWager).not.toHaveProperty('refillProof');
 });
 it('first-discard refunds never erase the real discard cost or restore f09 qualification',()=>{
  const f=touyeFixture('mature-win',{jokers:['f09','d05']}),s=round(touyeSend(f.state,touyeBet(f.state,f.discard,f.target))),after=round(touyeSend(s,{type:'PlayHand',selectedIds:f.play}));
  expect(s.stage!.discardsUsed).toBe(1);expect(s.stage!.discardsLeft).toBe(f.state.stage!.discardsLeft);expect(after.lastTrace!.events.some(e=>e.sourceDefinitionId==='f09')).toBe(false);
 });
 it('same-face different IDs count by real transaction IDs; old held IDs and refill/card/partition edits cannot pass checksum repair',()=>{
  const f=pending('duplicate-face'),cp=makeCheckpoint(f.state,[]);
  const changes=[(s:R2RunState)=>{s.stage!.touyeWager!.commit!.refill!.refilledIds=['spades-9'];},(s:R2RunState)=>{s.stage!.touyeWager!.refillProof!.drawBefore.reverse();},(s:R2RunState)=>{s.stage!.touyeWager!.commit!.refill!.handAfter.push('spades-9');},(s:R2RunState)=>{s.stage!.touyeWager!.refillProof!.drawAfter.pop();},(s:R2RunState)=>{s.stage!.touyeWager!.refillProof!.discardBefore=['spades-2'];},(s:R2RunState)=>{s.stage!.touyeWager!.commit!.handBefore[0].rank=8;},(s:R2RunState)=>{delete s.stage!.touyeWager!.commit!.refill;},(s:R2RunState)=>{s.stage!.touyeWager!.commit!.expectedSeq--;},(s:R2RunState)=>{s.stage!.touyeWager!.corePlay={command:touyeCommand(s,{type:'PlayHand',selectedIds:f.play}),hand:[],disabledIds:[]};}];
  for(const change of changes){const bad=mutate(cp,change);expect(readCheckpoint(bad).ok).toBe(false);const before=structuredClone(bad.state);expect(applyCommand(bad.state,touyeCommand(bad.state,{type:'PlayHand',selectedIds:f.play}))).toMatchObject({ok:false,code:'touye-invalid-core-facts',state:bad.state});expect(applyCommand(bad.state,{runId:bad.state.runId,commandId:bad.state.stage!.touyeWager!.commit!.discardCommandId,expectedSeq:bad.state.stage!.touyeWager!.commit!.expectedSeq,action:{type:'DiscardHand',selectedIds:bad.state.stage!.touyeWager!.commit!.selectedIds,touyeBet:{target:bad.state.stage!.touyeWager!.commit!.target,snapshotToken:cp.state.stage!.touyeWager!.commit!.snapshotToken}}}).ok).toBe(false);expect(bad.state).toEqual(before);}
 });
 it('settled due source cannot be replaced by a later legitimate play or paired current card/rule edits',()=>{
  const f=pending('mature-old-core');let s=round(touyeSend(f.state,{type:'PlayHand',selectedIds:f.play}));expect(s.phase).toBe('await-input');s=round(touyeSend(s,{type:'PlayHand',selectedIds:[s.handOrder[0]]}));const cp=makeCheckpoint(s,[]);
  for(const change of [(s:R2RunState)=>{s.stage!.touyeWager!.corePlay!.command=structuredClone(s.stage!.routeGrowth!.sources[1].command);},(s:R2RunState)=>{s.stage!.touyeWager!.corePlay!.hand[0].rank=7;s.stage!.routeGrowth!.sources[0].cards[0].rank=7;},(s:R2RunState)=>{s.stage!.touyeWager!.corePlay!.disabledIds=['spades-9'];}])expect(readCheckpoint(mutate(cp,change)).ok).toBe(false);
 });
 it('actual scorer and public preview share before snapshot and core facts, retaining the original multiplier timing',()=>{
  const f=touyeFixture('mature-win',{jokers:['mantangcai']}),s=round(touyeSend(f.state,touyeBet(f.state,f.discard,f.target)));
  const hand=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!),i={rulesVersion:'r2' as const,runId:s.runId,rootId:'finite-core',hand,selectedIds:f.play,disabledIds:s.stage!.disabledIds,jokers:s.jokers,definitions:r2JokerDefinitionsFor(s),handLevels:s.handLevels,playIndex:1,handsBeforePlay:s.stage!.handsLeft,previousHandType:null,wager:false,rng:s.rng.rule,...r2ScoreContext(s,hand,f.play)},actual=scoreR2Hand(i),preview=previewR2Hand(i);
  expect(JSON.stringify(r2ScoreContext(s,hand,f.play))).not.toMatch(/drawBefore|drawAfter|discardBefore|playedBefore|refillProof/);expect(preview.possibleScores).toEqual([actual.finalScore]);expect(preview.breakdown.events.filter(e=>e.sourceDefinitionId==='touye')).toEqual(actual.events.filter(e=>e.sourceDefinitionId==='touye'));expect(actual.routeGrowth!.before).toEqual({clears:0,G:0,S:0,F:0});
  expect(actual.events.findIndex(e=>e.sourceDefinitionId==='touye')).toBeLessThan(actual.events.findIndex(e=>e.sourceDefinitionId==='mantangcai'));
  expect(()=>scoreR2Hand({...i,touyeWager:{commit:i.touyeWager!.commit}})).toThrow('invalid-touye-commit');
 });
 it('failed discard/play saves retry identical fixed candidates and restore without double consumption',async()=>{
  const f=touyeFixture();let slots:SaveSlots={revision:1,current:makeCheckpoint(f.state,[]),previous:null},fail=true;const writes:string[]=[];
  const store:SaveStore={read:async()=>slots,commit:async(rev,cp,previous)=>{writes.push(JSON.stringify(cp));if(fail)throw Error('quota');slots={revision:rev+1,current:cp,previous};return slots.revision;}};
  const run=SavedRun.restore(store,slots);expect((await run.dispatch(touyeBet(f.state,f.discard,f.target))).ok).toBe(false);expect(run.state).toEqual(f.state);fail=false;expect((await run.retry()).ok).toBe(true);expect(writes[0]).toBe(writes[1]);const p=run.state;expect(SavedRun.restore(store,slots).state).toEqual(p);
  fail=true;expect((await run.dispatch({type:'PlayHand',selectedIds:f.play})).ok).toBe(false);expect(run.state).toEqual(p);fail=false;expect((await run.retry()).ok).toBe(true);expect(writes[2]).toBe(writes[3]);expect(SavedRun.restore(store,slots).state).toEqual(run.state);expect(run.state.stage!.playIndex).toBe(1);
 });
});
