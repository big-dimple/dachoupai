import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {dyeOrder} from '../analysis/s04-gate-compare';
import {fixture,probes} from '../analysis/s04-window';

const report=()=>JSON.parse(gunzipSync(readFileSync('docs/production/evidence/s04-window-2026-10-15/gate-comparison.json.gz')).toString());
describe('S04 gate comparison evidence contracts',()=>{
 it('compares concentrated and rank-spread preparation without modifying the input deck',()=>{
  const deck=fixture('flush',6,probes[0]).deckInstances,snapshot=structuredClone(deck);
  const ranks=(layout:'high-cluster'|'low-cluster'|'rank-spread')=>dyeOrder(deck,layout).slice(0,13).map(id=>deck.find(c=>c.id===id)!.rank);
  expect(new Set(ranks('rank-spread')).size).toBe(13);
  expect(Math.min(...ranks('high-cluster'))).toBe(10);
  expect(Math.max(...ranks('low-cluster'))).toBe(6);
  expect(deck).toEqual(snapshot);
 });
 it('accounts for the pre-generated shelf and the real extra refresh, at the same budget',()=>{
  for(const c of report().cases)for(const row of c.rows){
   const p=row.preparation,last=p.visits.at(-1),control=row.conditional;
   expect(p.budget).toBe(40);
   expect(p.spent).toBe(c.gate===60?28:p.investment==='practice'?30:20);
   expect(last.entryHearts).toBe(c.gate===60?31:28);
   expect(last.entryEligible).toBe(c.gate===50);
   expect(control.requiredRefresh).toBe(c.gate===60?2:0);
   expect(control.paid).toBe(c.gate===60?8:6);
   expect(control.after.gold).toBe(40-p.spent-control.paid);
   for(const e of p.logs.filter((e:any)=>e.kind==='dye')){
    expect(e.shopRngUnchanged).toBe(true);expect(e.shelfUnchangedApartFromConsumed).toBe(true);
   }
  }
 });
 it('keeps injected benefit controls distinct from generated purchases and stops at actual losses',()=>{
  for(const c of report().cases)for(const row of c.rows){
   expect(row.conditional.log[0].kind).toBe('S04-bought-from-injected-control');
   expect(row.conditional.log[0].offerId).toContain('CONDITIONAL');
   for(const a of row.actual){
    expect(JSON.stringify(a)).not.toContain('CONDITIONAL');
    const firstLoss=a.stages.findIndex((s:any)=>s.phase==='run-lost');
    if(firstLoss>=0)expect(firstLoss).toBe(a.stages.length-1);
    for(const e of a.log.filter((e:any)=>e.kind==='S04-bought-from-generated-shelf')){
     expect(e.offerId).toContain('/shop/');expect(e.heartsAfter).toBe(52);
    }
   }
  }
 });
});
