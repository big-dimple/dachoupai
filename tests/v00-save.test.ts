import {describe,expect,it} from 'vitest';
import {makeCheckpoint,readCheckpoint,restoreSlots} from '../src/application/checkpoint';
import {createRun,applyCommand,type Action,type R2RunState} from '../src/domain/run';
import {stableHash} from '../src/domain/hash';
import type {Condition} from '../src/content/r2Schema';

const start=()=>createRun({seed:'v00-save',characterId:'amo',runId:'v00-save',rulesVersion:'r2'});
const send=(s:R2RunState,action:Action)=>{const r=applyCommand(s,{runId:s.runId,commandId:`c-${s.commandSeq+1}`,expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;};
const resign=(s:unknown)=>{const c=structuredClone(s) as Record<string,unknown>;const {checksum,...payload}=c;c.checksum=stableHash(payload);return c;};
describe('V00 strict save boundary before broader browser coverage',()=>{
  it('persists chapter Boss/reward/coupon and economic growth with the new content version',()=>{
    let s=start();s=send(s,{type:'SkipStage'});const c=makeCheckpoint(s,[]),r=readCheckpoint(JSON.parse(JSON.stringify(c)));expect(r.ok&&r.checkpoint.state).toEqual(s);
    s=send(s,{type:'OpenShop'});s.jokers=[{instanceId:'owned/e05',definitionId:'e05',paidPrice:6,growth:{heat:{n:'8',d:'1'}}}];expect(readCheckpoint(makeCheckpoint(s,[])).ok).toBe(true);
  });
  it('preserves an incompatible v2 raw slot and explains the version boundary, without converting it',()=>{
    const old=structuredClone(makeCheckpoint(start(),[]));old.state.contentVersion='quality-r2-run-v2';old.state.contentHash='json-fnv-v1:004135ca2b38f6ee';
    for(const k of ['seenBossIds','chapterSkipConsumable','purchaseCoupons'])delete (old.state as unknown as Record<string,unknown>)[k];(old.state as unknown as Record<string,unknown>).boss=null;
    const raw=resign(old),before=JSON.stringify(raw),r=readCheckpoint(raw);expect(r).toEqual({ok:false,code:'incompatible-version'});
    const result=restoreSlots({revision:7,current:raw,previous:null});expect(result.status).toBe('invalid');expect(result.raw).toBe(raw);expect(JSON.stringify(raw)).toBe(before);
  });
  it('rejects forged Boss parameters, reused Boss, excessive growth and invalid coupon/skip state even with a new checksum',()=>{
    const valid=makeCheckpoint(start(),[]);
    const changes=[(s:R2RunState)=>{s.boss.disabledSuit='hearts';},(s:R2RunState)=>{s.seenBossIds=[s.boss.definitionId,s.boss.definitionId];},(s:R2RunState)=>{s.purchaseCoupons=-1;},(s:R2RunState)=>{s.jokers=[{instanceId:'bad',definitionId:'a05',paidPrice:6,growth:{heat:{n:'91',d:'1'}}}];},(s:R2RunState)=>{s.chapterSkipConsumable='T16' as typeof s.chapterSkipConsumable;}];
    for(const mutate of changes){const broken=structuredClone(valid);mutate(broken.state);expect(readCheckpoint(resign(broken)).ok).toBe(false);}
  });
  it('rejects a forged target, impossible skip success and counters after checksum re-signing',()=>{
    let s=send(send(start(),{type:'LeaveShop'}),{type:'EnterStage'});const valid=makeCheckpoint(s,[]);
    const changes=[(s:R2RunState)=>{s.stage!.targetHeat='1';},(s:R2RunState)=>{s.stage!.skipResult={kind:'coupon',amount:2};},(s:R2RunState)=>{s.stage!.handsLeft=3;},(s:R2RunState)=>{s.stage!.discardsUsed=4;},(s:R2RunState)=>{s.stageIndex=6;}];
    for(const mutate of changes){const broken=structuredClone(valid);mutate(broken.state);expect(readCheckpoint(resign(broken)).ok).toBe(false);}
    s=send(start(),{type:'SkipStage'});const skipped=makeCheckpoint(s,[]),broken=structuredClone(skipped);broken.state.stage!.goldEarned=7;expect(readCheckpoint(resign(broken)).ok).toBe(false);
  });
  it('rejects malformed visible trace predicates rather than displaying a fabricated reason',()=>{
    let s=send(send(start(),{type:'LeaveShop'}),{type:'EnterStage'});s=send(s,{type:'PlayHand',selectedIds:[s.handOrder[0]]});const valid=makeCheckpoint(s,[]);
    for(const condition of [{kind:'rank-groups'},{kind:'always',resource:'gold'},{kind:'play-modulo',divisor:0,remainder:0},{kind:'played-count',equals:6},{kind:'rank-in',values:[]}]){const bad=structuredClone(valid);bad.state.lastTrace!.events[0].visibleCondition=condition as Condition;expect(readCheckpoint(resign(bad)).ok).toBe(false);}
  });
});
