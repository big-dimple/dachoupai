import {expect,it} from 'vitest';
import {shopRefreshQuote,sameShopRefreshQuote,showShopRefreshConfirmation} from '../src/game/ShopRefreshConfirmation';
import {workshopLayoutFixture} from '../harness/fixtures/workshop-layout';
import {applyCommand} from '../src/domain/run';
import {r2PaidRerollPrice} from '../src/domain/r2Shop';
import type {DetailDialog} from '../src/game/DetailDialog';
function view(){
 let live=true,actions:any[]=[],status={hidden:true,textContent:''};const close={disabled:false},d={classList:{add(){}},querySelector:(s:string)=>s==='.dialog-status'?status:close,addEventListener(){}};
 const dialog={open:(_t:string,_b:string,a:any[])=>{actions=a;return d;},active:()=>live,close:()=>{live=false;}};
 return {dialog:dialog as unknown as DetailDialog,confirm:()=>actions[0].run(),cancel:()=>{live=false;},status};
}
it('quotes the real current price and invalidates it after a real reroll or a free-reroll change',()=>{
 const s=workshopLayoutFixture().state,q=shopRefreshQuote(s);expect(q.cost).toBe(r2PaidRerollPrice(s));expect(sameShopRefreshQuote(s,q)).toBe(true);
 const result=applyCommand(s,{runId:s.runId,commandId:'refresh-quote/next',expectedSeq:s.commandSeq,action:{type:'RerollShop'}});expect(result.ok).toBe(true);expect(sameShopRefreshQuote(result.state,q)).toBe(false);
 s.shop!.freeRerolls=1;expect(sameShopRefreshQuote(s,q)).toBe(false);expect(shopRefreshQuote(s).cost).toBe(0);
});
it('viewing and cancelling never submit; a stale quote gives a recovery message without submitting',async()=>{
 const s=workshopLayoutFixture().state,original=structuredClone(s);let submits=0;const cancelled=view();showShopRefreshConfirmation(cancelled.dialog,s,()=>s,()=>true,async()=>{submits++;return true;});expect(submits).toBe(0);cancelled.cancel();await cancelled.confirm();expect(submits).toBe(0);expect(s).toEqual(original);
 const stale=view();showShopRefreshConfirmation(stale.dialog,s,()=>({...s,commandSeq:s.commandSeq+1}),()=>true,async()=>{submits++;return true;});await stale.confirm();expect(submits).toBe(0);expect(stale.status.hidden).toBe(false);expect(stale.status.textContent).toContain('重新查看');
});
it('double confirmation remains one submit both while saving and after resolution',async()=>{
 const s=workshopLayoutFixture().state,v=view();let submits=0,finish!:(ok:boolean)=>void;const saved=new Promise<boolean>(r=>{finish=r;});showShopRefreshConfirmation(v.dialog,s,()=>s,()=>true,async()=>{submits++;return saved;});const first=v.confirm();await v.confirm();expect(submits).toBe(1);finish(true);await first;await v.confirm();expect(submits).toBe(1);
});
