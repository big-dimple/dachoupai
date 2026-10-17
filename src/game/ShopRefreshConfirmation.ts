import type {R2RunState} from '../domain/run';
import {r2PaidRerollPrice} from '../domain/r2Shop';
import {DetailDialog} from './DetailDialog';
export function shopRefreshQuote(run:R2RunState){
 const cost=run.shop?.freeRerolls?0:r2PaidRerollPrice(run);
 return {seq:run.commandSeq,visit:run.shop!.visitIndex,count:run.shop!.rerollCount,cost,gold:run.gold,free:run.shop!.freeRerolls};
}
export function sameShopRefreshQuote(run:R2RunState,q:ReturnType<typeof shopRefreshQuote>):boolean {
 return run.phase==='shop'&&!!run.shop&&run.commandSeq===q.seq&&run.shop.visitIndex===q.visit&&run.shop.rerollCount===q.count&&run.shop.freeRerolls===q.free&&run.gold===q.gold&&(run.shop.freeRerolls?0:r2PaidRerollPrice(run))===q.cost;
}
/** The local quote owns a one-shot submit latch; cancellation never reaches the command adapter. */
export function showShopRefreshConfirmation(dialog:DetailDialog,run:R2RunState,current:()=>R2RunState,ready:()=>boolean,submit:(seq:number)=>Promise<boolean>):HTMLDialogElement {
 const q=shopRefreshQuote(run);let submitted=false,saving=false;
 const d=dialog.open('刷新现货',`只更新唐宋牌与消耗工具；长期物品不变，自选做牌次数不恢复。`,[{label:q.cost?`确认刷新 · ${q.cost}金币`:'确认免费刷新',primary:true,run:async()=>{
  if(submitted||!dialog.active(d)||!ready())return;
  if(!sameShopRefreshQuote(current(),q)){const status=d.querySelector<HTMLElement>('.dialog-status')!;status.textContent='现货或费用已变化，请取消后重新查看。';status.hidden=false;return;}
  submitted=true;saving=true;const close=d.querySelector<HTMLButtonElement>('.dialog-close')!;close.disabled=true;
  try{if(await submit(q.seq))dialog.close(d);}finally{saving=false;if(dialog.active(d))close.disabled=false;}
 }}],{closeLabel:'取消',effectBody:q.cost?`刷新费用 ${q.cost}金币`:'本次免费刷新',summaryBody:`金币 ${q.gold} → ${q.gold-q.cost}\n确认后才更新现货；取消不扣款。`});
 d.classList.add('shop-refresh-confirmation');
 d.addEventListener('cancel',e=>{if(saving){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});return d;
}
