import {describe,expect,it} from 'vitest';
import {applyCommand,createRun,assertRunInvariants,type Action,type R2RunState} from '../src/domain/run';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
const start=()=>createRun({seed:'skip-items',characterId:'amo',runId:'skip-items',rulesVersion:'r2'});
const send=(s:R2RunState,action:Action)=>{const r=applyCommand(s,{runId:s.runId,commandId:`c-${s.commandSeq+1}`,expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;};
const item=(s:R2RunState,id:string)=>{s.consumables=[{instanceId:'item',definitionId:id}];return s;};
const use=(s:R2RunState,targetIds:readonly string[]=[],handType?:'high-card')=>send(s,{type:'UseConsumable',instanceId:'item',targetIds,...(handType?{handType}:{})});
const rejects=(s:R2RunState,targets:readonly string[])=>{const before=JSON.stringify(s),r=applyCommand(s,{runId:s.runId,commandId:'invalid',expectedSeq:s.commandSeq,action:{type:'UseConsumable',instanceId:'item',targetIds:targets}});expect(r.ok).toBe(false);expect(JSON.stringify(s)).toBe(before);};
describe('minimum skip rewards are usable, without enabling unfinished items',()=>{
  it.each([['T03','hearts'],['T04','diamonds'],['T05','clubs'],['T06','spades']] as const)('%s changes1–3 known instances in shop, preserves IDs/cursors and survives stage/save',(id,suit)=>{
    let s=item(start(),id);const target=s.deckInstances.filter(c=>c.suit!==suit).slice(0,3).map(c=>c.id),rng=JSON.stringify(s.rng);s=use(s,target);expect(s.consumables).toEqual([]);expect(s.deckInstances.filter(c=>target.includes(c.id)).map(c=>c.suit)).toEqual([suit,suit,suit]);expect(JSON.stringify(s.rng)).toBe(rng);
    s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});assertRunInvariants(s);expect(readCheckpoint(makeCheckpoint(s,[])).ok).toBe(true);
  });
  it('rejects empty/duplicate/too many/all-unchanged/hidden in-stage targets without consuming',()=>{
    let s=item(start(),'T03');for(const ids of [[],['hearts-2'],['clubs-2','clubs-2'],['clubs-2','clubs-3','clubs-4','clubs-5'],['unknown']])rejects(s,ids);
    s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});const hidden=s.drawPile.find(id=>!id.startsWith('hearts'))!;rejects(s,[hidden]);const available=s.handOrder.find(id=>!id.startsWith('hearts'))!;expect(use(s,[available]).consumables).toEqual([]);
  });
  it('T01 upgrades only an actually discovered hand, never a capped/unknown type; persists exact score level',()=>{
    let s=item(start(),'T01');rejects(s,[]);s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});s=send(s,{type:'PlayHand',selectedIds:[s.handOrder[0]]});expect(s.handLevels['high-card']).toBe(1);s=use(s,[],'high-card');expect(s.handLevels['high-card']).toBe(2);expect(s.consumables).toEqual([]);
    s=item(s,'T01');s.handLevels['high-card']=30;const before=JSON.stringify(s),r=applyCommand(s,{runId:s.runId,commandId:'cap',expectedSeq:s.commandSeq,action:{type:'UseConsumable',instanceId:'item',targetIds:[],handType:'high-card'}});expect(r.ok).toBe(false);expect(JSON.stringify(s)).toBe(before);
  });
  it('T17 restores one paid discard up to3 without erasing successful discard count',()=>{
    let s=item(start(),'T17');rejects(s,[]);s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});rejects(s,[]);s=send(s,{type:'DiscardHand',selectedIds:[s.handOrder[0]]});s=use(s);expect(s.stage!.discardsLeft).toBe(3);expect(s.stage!.discardsUsed).toBe(1);expect(s.consumables).toEqual([]);
  });
  it('two legitimately held T17s allow five successful discards and a restorable checkpoint',()=>{
    let s=start();s.consumables=[{instanceId:'one',definitionId:'T17'},{instanceId:'two',definitionId:'T17'}];s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});
    for(let i=0;i<3;i++)s=send(s,{type:'DiscardHand',selectedIds:[s.handOrder[0]]});
    for(const instanceId of ['one','two']){s=send(s,{type:'UseConsumable',instanceId,targetIds:[]});s=send(s,{type:'DiscardHand',selectedIds:[s.handOrder[0]]});}
    expect(s.stage!.discardsUsed).toBe(5);expect(readCheckpoint(makeCheckpoint(s,[])).ok).toBe(true);
  });
  it('unfinished T02/T16/U effects remain explicit and never consume a future item',()=>{
    for(const id of ['T02','T16'])rejects(item(start(),id),['clubs-2']);
  });
});
