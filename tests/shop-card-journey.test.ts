import {describe,it,expect} from 'vitest';
import {createRun,applyCommand,type R2RunState} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {r2CreateJoker} from '../src/domain/r2Run';
import {r2PurchasePrice} from '../src/domain/r2Shop';
import {shopOfferGuidance} from '../src/game/ShopOfferGuidance';
import {shopReplacementCompactFacts,shopReplacementTransactionFacts} from '../src/game/ShopRouteRelations';
import {shopComparisonPresentation} from '../src/game/ShopJokerPresentation';
import {basicChoiceEntryLabel} from '../src/game/MakeCardsDialog';
import {basicChoiceRows} from '../src/game/BasicToolChoice';

function fixture():R2RunState {
 const s=createRun({runId:'journey-projection',seed:'journey-projection',characterId:'laohuan',rulesVersion:'r2',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group'});
 s.gold=28;s.jokers=['b03','b08','e01','e04','f06'].map((id,i)=>r2CreateJoker(id,'held/'+i,8,i===3?'foil':'none',s));
 s.jokers[4].counters={...s.jokers[4].counters,handsScored:3};return s;
}
describe('shop whole-chain presentation uses the current authoritative facts',()=>{
 it('keeps five real slots in order and exact per-slot advice, money and losses',()=>{
  const s=fixture(),o={offerId:'new/e08',definitionId:'e08',price:8,consumed:false},before=structuredClone(s),view=shopComparisonPresentation(s,o);
  expect(view.rows.map(r=>r.id)).toEqual(s.jokers.map(j=>j.instanceId));expect(view.rows.map(r=>r.slot)).toEqual([1,2,3,4,5]);
  expect(view.candidate.price).toBe(r2PurchasePrice(s,o));expect(view.candidate.guidance).toEqual(shopOfferGuidance(s,o));
  for(const [i,row]of view.rows.entries()){
   expect(row.guidance).toEqual(shopOfferGuidance(s,o,s.jokers[i]));expect(row.costs).toEqual(shopReplacementCompactFacts(s,s.jokers[i],shopReplacementTransactionFacts(s,o,s.jokers[i])));
  }
  expect(view.rows[3].edition).not.toBe(view.rows[2].edition);expect(view.rows[3].costs.some(c=>c.startsWith('失去：'))).toBe(true);expect(s).toEqual(before);
 });
 it('keeps actual remaining lifetime separate from rarity, edition and recommendation',()=>{
  const s=fixture(),o={offerId:'new/f06',definitionId:'f06',price:4,consumed:false},view=shopComparisonPresentation(s,o);
  expect(view.candidate.uses).toBe('余 4 次');expect(view.rows[4].uses).toBe('余 1 次');expect(view.rows[0].uses).toBeUndefined();
  s.jokers[4].counters={...s.jokers[4].counters,handsScored:0};expect(shopComparisonPresentation(s,o).rows[4].uses).toBe('余 4 次');
 });
 it('recomputes the candidate from the saved sale state rather than retaining old full-slot or cash advice',()=>{
  const s=fixture(),o={offerId:'new/b10',definitionId:'b10',price:6,consumed:false},before=shopComparisonPresentation(s,o);
  const action={type:'SellJoker' as const,instanceId:s.jokers[1].instanceId},r=applyCommand(s,{runId:s.runId,commandId:'sale',expectedSeq:s.commandSeq,action});expect(r.ok).toBe(true);if(!r.ok)return;
  const after=shopComparisonPresentation(r.state,o);expect(after.rows).toHaveLength(4);expect(after.gold).toBe(r.state.gold);expect(after.candidate.guidance).toEqual(shopOfferGuidance(r.state,o));expect(before.rows).toHaveLength(5);
 });
 it('keeps real tool prices while the core entry does not mislabel tiered service prices',()=>{
  const s=fixture();s.purchaseCoupons=1;
  const prices=[...new Set(basicChoiceRows(s).filter(r=>!r.duplicate).map(r=>r.price))].sort((a,b)=>a-b);
  expect(prices).toEqual([1,2]);expect(basicChoiceEntryLabel(s)).toBe('升级 / 做牌\n本店共选1件');
  s.shop!.basicChoice!.purchase={definitionId:'T08',commandId:'already-bought',paidPrice:1,seq:s.commandSeq};
  expect(basicChoiceEntryLabel(s)).toBe('本店自选已购\n查看道具');
 });
});
