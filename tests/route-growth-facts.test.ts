import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {applyCommand,createRun,type Command,type R2RunState} from '../src/domain/run';
import {r2CreateJoker,assertR2Invariants} from '../src/domain/r2Run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {makeCheckpoint,readCheckpoint,type Checkpoint} from '../src/application/checkpoint';
import {stableHash} from '../src/domain/hash';
import {r2DisabledCards} from '../src/domain/r2Chapter';

const evidence=JSON.parse(readFileSync(new URL('../docs/production/evidence/route-growth-c2-2026-10-11/p2-recovery.json',import.meta.url),'utf8'));
const original=evidence.crossStage.before as Checkpoint;
function command(s:R2RunState,action:Command['action']):Command{return {runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action};}
function send(s:R2RunState,action:Command['action']):R2RunState {const r=applyCommand(s,command(s,action));if(!r.ok)throw Error(r.code);return r.state;}
function restore(cp:Checkpoint):R2RunState {const r=readCheckpoint(cp);expect(r.ok).toBe(true);if(!r.ok)throw Error(r.code);return r.checkpoint.state as R2RunState;}
function round(s:R2RunState){return restore(makeCheckpoint(s,[]));}
function edit(cp:Checkpoint,change:(s:R2RunState)=>void):Checkpoint {const bad=structuredClone(cp);change(bad.state as R2RunState);const {checksum,...payload}=bad;return {...payload,checksum:stableHash(payload)};}
function arrange(s:R2RunState,ids:string[]):R2RunState {
 const available=s.deckInstances.filter(c=>!s.playedPile.includes(c.id)&&!s.discardPile.includes(c.id)&&!s.destroyedIds.includes(c.id));
 s.handOrder=[...ids,...available.filter(c=>!ids.includes(c.id)).slice(0,s.stage!.handLimit-ids.length).map(c=>c.id)];
 s.drawPile=available.map(c=>c.id).filter(id=>!s.handOrder.includes(id));
 s.stage!.disabledIds=s.stage!.boss?r2DisabledCards(s.stage!.boss,s.stageIndex,s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!)):[];
 assertR2Invariants(s);return s;
}
describe('C2 route source facts against independent current stage evidence',()=>{
 it('rejects the exact seq13 source-rank/pair/G edit with commands, deck and latest trace unchanged',()=>{
  const state=restore(original);expect(state.commandSeq).toBe(13);expect(state.stage!.routeGrowth!.handTypes).toEqual(['high-card','high-card','high-card']);
  for(const journal of [original.journal,[],[original.journal.at(-1)!]]){
   const cp=makeCheckpoint(state,journal),bad=edit(cp,s=>{
    s.stage!.routeGrowth!.sources[0].cards.find(c=>c.id==='hearts-3')!.rank=2;
    s.stage!.routeGrowth!.handTypes[0]='pair';s.stage!.routeGrowth!.eligible=['G'];
   });
   expect(bad.state.deckInstances).toEqual(cp.state.deckInstances);expect(bad.state.receipts).toEqual(cp.state.receipts);expect(bad.state.lastTrace).toEqual(cp.state.lastTrace);expect(bad.journal).toEqual(cp.journal);
   expect(readCheckpoint(bad)).toEqual({ok:false,code:'Run invariant: route main card facts'});
  }
  const corrupted=edit(original,s=>{s.stage!.routeGrowth!.sources[0].cards.find(c=>c.id==='hearts-3')!.rank=2;s.stage!.routeGrowth!.handTypes[0]='pair';s.stage!.routeGrowth!.eligible=['G'];}).state as R2RunState;
  const blocked=applyCommand(corrupted,command(corrupted,{type:'PlayHand',selectedIds:['spades-3','spades-4','spades-5','spades-6','spades-7']}));
  expect(blocked).toMatchObject({ok:false,code:'score-diagnostic',diagnostic:{code:'invalid-route-main-facts'},state:corrupted});
  const clear=send(state,{type:'PlayHand',selectedIds:['spades-3','spades-4','spades-5','spades-6','spades-7']});
  expect(clear.phase).toBe('stage-cleared');expect(round(clear).routeGrowth).toMatchObject({clears:2,G:1,S:1,F:1});
 });
 it('rejects earlier suit, enhancement, edition and rules edits even without a type change',()=>{
  const cp=makeCheckpoint(restore(original),[]);
  for(const change of [
   (s:R2RunState)=>{s.stage!.routeGrowth!.sources[0].cards[0].suit='hearts';},
   (s:R2RunState)=>{s.stage!.routeGrowth!.sources[0].cards[0].enhancement='multiplier-paper';},
   (s:R2RunState)=>{s.stage!.routeGrowth!.sources[0].cards[0].edition='polychrome';},
   (s:R2RunState)=>{s.stage!.routeGrowth!.sources[0].rules.fourStraight=true;},
   (s:R2RunState)=>{s.stage!.routeGrowth!.sources[0].rules.fourFlush=true;},
  ])expect(readCheckpoint(edit(cp,change)).ok).toBe(false);
 });
 it('rejects a self-classified four-card S edit against the actual unchanged rule source',()=>{
  let s=createRun({seed:'route-rule-facts',runId:'rule-facts',characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo','group'),openingRoute:'group'});
  s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});
  for(const ids of [['spades-2','hearts-3','clubs-4','diamonds-5'],['clubs-7'],['diamonds-8']])s=send(arrange(s,ids),{type:'PlayHand',selectedIds:ids});
  expect(s.stage!.routeGrowth!.handTypes).toEqual(['high-card','high-card','high-card']);
  const cp=makeCheckpoint(s,[]),bad=edit(cp,v=>{v.stage!.routeGrowth!.sources[0].rules.fourStraight=true;v.stage!.routeGrowth!.handTypes[0]='straight';v.stage!.routeGrowth!.eligible=['S'];v.stage!.ordinaryStraightSeen=true;});
  expect(readCheckpoint(bad)).toEqual({ok:false,code:'Run invariant: route main rule facts'});
  expect(round(s).stage!.routeGrowth!.eligible).toEqual([]);
 });
 it('allows a real stage tool on an unplayed held card, rejects a played target and still clears without extra G',()=>{
  let s=restore(original);s.consumables=[{instanceId:'rank-tool',definitionId:'T08'}];s=round(s);
  const bad=applyCommand(s,command(s,{type:'UseConsumable',instanceId:'rank-tool',targetIds:['hearts-3']}));expect(bad).toMatchObject({ok:false,code:'unavailable-target',state:s});
  const sources=structuredClone(s.stage!.routeGrowth!.sources);
  s=send(s,{type:'UseConsumable',instanceId:'rank-tool',targetIds:['spades-9']});
  expect(s.deckInstances.find(c=>c.id==='spades-9')!.rank).toBe(10);expect(s.stage!.routeGrowth!.sources).toEqual(sources);s=round(s);
  s=send(s,{type:'PlayHand',selectedIds:['spades-3','spades-4','spades-5','spades-6','spades-7']});expect(round(s).routeGrowth).toMatchObject({clears:2,G:1,S:1,F:1});
 });
 it('preserves earlier card snapshots when the next shop legitimately edits a previously played card',()=>{
  let s=send(restore(original),{type:'PlayHand',selectedIds:['spades-3','spades-4','spades-5','spades-6','spades-7']});
  const sources=structuredClone(s.stage!.routeGrowth!.sources);s=send(s,{type:'OpenShop'});s.consumables=[{instanceId:'rank-tool',definitionId:'T08'}];
  s=send(s,{type:'UseConsumable',instanceId:'rank-tool',targetIds:['hearts-3']});
  expect(s.deckInstances.find(c=>c.id==='hearts-3')!.rank).toBe(4);expect(s.stage!.routeGrowth!.sources).toEqual(sources);s=round(s);
  s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});expect(round(s).stage!.routeGrowth!.sources).toEqual([]);
 });
 it('keeps the actual prior rule source after a shop sale and reads the changed rules in the next stage',()=>{
  let s=createRun({seed:'route-rule-shop',runId:'rule-shop',characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo','group'),openingRoute:'group'});
  s.jokers=[r2CreateJoker('c08','four-straight',4,undefined,s)];s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});
  const first=['spades-2','hearts-3','clubs-4','diamonds-5'];s=send(arrange(s,first),{type:'PlayHand',selectedIds:first});expect(s.lastTrace!.handType).toBe('straight');
  expect(s.phase).toBe('stage-cleared');
  const sources=structuredClone(s.stage!.routeGrowth!.sources);s=send(send(s,{type:'OpenShop'}),{type:'SellJoker',instanceId:'four-straight'});expect(s.jokers).toEqual([]);expect(round(s).stage!.routeGrowth!.sources).toEqual(sources);
  s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});s=send(arrange(s,first),{type:'PlayHand',selectedIds:first});expect(s.lastTrace!.handType).toBe('high-card');expect(round(s).stage!.routeGrowth!.sources[0].rules).toEqual({fourStraight:false,fourFlush:false});
 });
});
