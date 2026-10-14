import {describe,expect,it} from 'vitest';
import {createRun,applyCommand,type R2RunState} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {r2PracticeQuotes} from '../src/domain/r2Practice';
import {shopPracticeServices,shopPracticeConfirmation,shopPracticeQuota,shopPracticeAction,shopPracticeSavedReceipt} from '../src/game/ShopPracticeService';

function fixture():R2RunState {
  const s=createRun({rulesVersion:'r2',runId:'practice-ui',seed:'practice-ui',characterId:'laohuan',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group'});
  s.gold=30;s.handLevels={'high-card':1,pair:4,'three-kind':30};return s;
}
describe('shop service adapter consumes authoritative quotes and saved receipts',()=>{
  it('exposes discovered uncapped types and passes each original quote to confirmation and command',()=>{
    const s=fixture(),before=structuredClone(s),chosen:unknown[]=[],quotes=r2PracticeQuotes(s),rows=shopPracticeServices(s,q=>chosen.push(q));
    expect(rows.map(r=>r.id)).toEqual(quotes.map(q=>'practice/'+q.handType));
    expect(rows.some(r=>r.id==='practice/flush')).toBe(false);expect(rows.some(r=>r.id==='practice/three-kind')).toBe(false);
    for(const [i,q]of quotes.entries()){expect(rows[i].price).toBe(q.price);rows[i].choose();expect(chosen[i]).toEqual(q);expect(shopPracticeConfirmation(s,q)).toMatchObject({price:q.price,goldBefore:s.gold,goldAfter:q.goldAfter});expect(shopPracticeAction(q)).toEqual({type:'PracticeHand',handType:q.handType,expectedLevel:q.levelBefore,shopSeq:q.shopSeq});}
    expect(s).toEqual(before);
  });
  it('keeps unaffordable discovered rows visible and disabled with the quoted shortfall',()=>{
    const s=fixture();s.gold=1;const rows=shopPracticeServices(s,()=>{}),quotes=r2PracticeQuotes(s);
    expect(rows).toHaveLength(quotes.length);for(const [i,row]of rows.entries())expect(row.unavailable).toBe('金币不足 · 还差 '+(-quotes[i].goldAfter)+' 金');
  });
  it('publishes only a validated saved practice receipt and marks the shared quota used',()=>{
    const s=fixture(),q=r2PracticeQuotes(s)[0],action=shopPracticeAction(q),result=applyCommand(s,{runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:q.expectedSeq,action});expect(result.ok).toBe(true);if(!result.ok)return;
    const receipt=shopPracticeSavedReceipt(s,result.state),event=result.events.find(e=>e.type==='hand-practiced')!;
    expect(receipt).toEqual({handType:q.handType,levelBefore:q.levelBefore,levelAfter:q.levelAfter,paidPrice:event.type==='hand-practiced'?event.paidPrice:0,goldBefore:s.gold,goldAfter:result.state.gold});
    expect(shopPracticeServices(result.state,()=>{})).toEqual([]);expect(shopPracticeQuota(result.state)).toContain('本店自选已用');expect(result.state.consumables).toEqual(s.consumables);
    expect(shopPracticeSavedReceipt(s,s)).toBeUndefined();expect(shopPracticeSavedReceipt(s,{...result.state,gold:result.state.gold+1})).toBeUndefined();
  });
  it('accepts the current discounted quote while preserving inventory T01 and the exact command sequences',()=>{
    const s=fixture();s.purchaseCoupons=1;s.handLevels.pair=1;s.consumables=[{instanceId:'kept-T01',definitionId:'T01'}];
    const q=r2PracticeQuotes(s).find(q=>q.handType==='pair')!,view=shopPracticeConfirmation(s,q);expect(view.price).toBe(q.price);expect(view.quota).toContain('原价 '+q.basePrice+' 金');expect(view.effect).toBe('对子 Lv.1 → Lv.2');
    expect(q.expectedSeq).toBe(s.commandSeq);expect(q.shopSeq).toBe(s.shop!.basicChoice!.shopSeq);
  });
});
