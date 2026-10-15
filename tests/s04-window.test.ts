import {describe,it,expect,vi} from 'vitest';
// The historical analysis models and their saved hashes remain frozen at the prior core launch.
vi.mock('../src/game/RunLaunch',async()=>{
 const {R2_CORE_BUILD_VERSION,R2_CORE_BUILD_HASH}=await import('../src/domain/r2GroupUpgrade');
 return {newRunIdentity:()=>({contentVersion:R2_CORE_BUILD_VERSION,contentHash:R2_CORE_BUILD_HASH})};
});
import {fixture,acquire,probes} from '../analysis/s04-window';
import {isR2BoundedClear,isR2CoreBuild} from '../src/domain/r2GroupUpgrade';

describe('S04 offline comparison boundaries, not approved gameplay',()=>{
 it('uses the actual core-build entry and inherited bounded scoring',()=>{
  const s=fixture('straight',6,probes[0]);
  expect(isR2CoreBuild(s)).toBe(true);expect(isR2BoundedClear(s)).toBe(true);
 });
 it('reproduces the current early transaction and its permanent hand-size loss',()=>{
  const before=fixture('group',0,probes[0]),snapshot=structuredClone(before);
  const result=acquire(before,'current-full');
  expect(result.record.paid).toBe(6);expect(result.record.changedIds).toHaveLength(39);
  expect(result.record.after).toMatchObject({gold:0,hearts:52,handLimit:7,handPenalty:1});
  expect(before).toEqual(snapshot);
 });
 it('keeps 60% a shadow gate: 31/52 refuses, 32/52 pays and finishes, early still refuses',()=>{
  const prepared=(index:number,changed:number)=>{
   const s=fixture('flush',index,probes[0]);
   s.deckInstances.filter(c=>c.suit!=='hearts').slice(0,changed).forEach(c=>c.suit='hearts');
   return s; // Planted boundary only; no claim of acquiring the prerequisite cards.
  };
  const below=prepared(6,18),snapshot=structuredClone(below);
  expect(acquire(below,'chapter3-sixty').record.status).toBe('density-gated');
  expect(below).toEqual(snapshot);
  const ready=acquire(prepared(6,19),'chapter3-sixty');
  expect(ready.record.changedIds).toHaveLength(20);expect(ready.record.paid).toBe(6);
  expect(ready.record.after).toMatchObject({hearts:52,handLimit:7,handPenalty:1});
  expect(acquire(prepared(0,19),'chapter3-sixty').record.status).toBe('chapter-gated');
 });
});
