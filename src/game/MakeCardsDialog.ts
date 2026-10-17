import type {R2RunState} from '../domain/run';
import {R2_TOOLS} from '../content/r2Tools';
import {r2PurchasePrice,type R2Offer} from '../domain/r2Shop';
import {r2ConsumableCapacity} from '../domain/r2Resources';
import {basicChoiceRows} from './BasicToolChoice';
import {toolInfo} from './r2ToolInfo';
import {DetailDialog} from './DetailDialog';
import type {ShopServiceEntry} from './ShopServiceDialog';
import {isR2CoreBuild} from '../domain/r2GroupUpgrade';
import {mountWorkshopGoals} from './WorkshopGoals';
import type {WorkshopIntent} from './WorkshopModel';

export interface MakeCardsView {pane:'owned'|'purchase';positions:{owned:number;purchase:number};workshopTab?:'upgrade'|'modify'|'dyes';rankGoal?:string;suitGoal?:string;intent?:WorkshopIntent;focusId?:string;receipt?:{seq:number;text:string}}

export function basicChoiceEntryLabel(run:R2RunState):string {
 if(run.shop?.basicChoice?.purchase)return '自选做牌\n本店已用';
 if(isR2CoreBuild(run))return '自选做牌\n本店共用1次';
 const prices=[...new Set(basicChoiceRows(run).filter(r=>!r.duplicate).map(r=>r.price))].sort((a,b)=>a-b);
 return '做牌自选 · 1件\n'+prices.join(' / ')+' 金';
}

export function makeCardsRows(run:R2RunState){
 const basic=basicChoiceRows(run);
 return {owned:run.consumables.map(c=>({id:c.instanceId,definitionId:c.definitionId,info:toolInfo(c.definitionId,run),purpose:basic.find(r=>r.id===c.definitionId)?.purpose??toolInfo(c.definitionId,run).summary,later:!R2_TOOLS.find(t=>t.id===c.definitionId)!.phases.includes('shop')})),
  basic:basic.filter(r=>!r.duplicate),
  offers:run.shop!.toolOffers.map(o=>({offer:o,info:toolInfo(o.definitionId,run),price:r2PurchasePrice(run,o)}))};
}
/** A local view over actual stock and inventory. Every payment/consumption uses the existing confirmation. */
export function showMakeCards(dialog:DetailDialog,run:R2RunState,ready:()=>boolean,purchaseReason:(offer:R2Offer)=>string|undefined,_owned:(id:string)=>void,basic:(id:string,intent?:WorkshopIntent)=>void,offer:(id:string,intent?:WorkshopIntent)=>void,inventory:()=>void,view:MakeCardsView={pane:'purchase',positions:{owned:0,purchase:0}},services:readonly ShopServiceEntry[]=[],serviceNotice?:string,prepareImages?:(panel:HTMLDialogElement)=>void):void {
 const seq=run.commandSeq;view.pane='purchase';let dispose=()=>{};
 const d=dialog.open('自选做牌 · 每店共用1次','',[],{closeLabel:'返回商店',onClose:()=>dispose()});d.classList.add('make-cards-dialog','shop-workshop');
 const summary=document.createElement('p');summary.className='make-cards-summary';summary.textContent=`金币 ${run.gold} · 工具包 ${run.consumables.length}/${r2ConsumableCapacity(run)}`;d.querySelector('.dialog-header')!.append(summary);
 const quota=document.createElement('p');quota.className='make-cards-quota';quota.setAttribute('role','status');quota.textContent=serviceNotice??(run.shop!.basicChoice?.purchase?'本店自选已用 · 刷新不恢复，下一店恢复':'升级 / 改牌 / 染色共用本店1次 · 查看目标与费用后再确认');d.querySelector('.dialog-header')!.append(quota);
 const scroll=d.querySelector<HTMLElement>('.dialog-scroll')!;scroll.replaceChildren();
 const remember=()=>{if(dialog.active(d))view.positions.purchase=scroll.scrollTop;};scroll.addEventListener('scroll',remember);d.addEventListener('click',remember,true);
 dispose=mountWorkshopGoals(scroll,run,view,{ready,purchaseReason,basic,offer,services,active:()=>dialog.active(d)&&run.commandSeq===seq});scroll.scrollTop=view.positions.purchase;
 const more=document.createElement('button');more.type='button';more.textContent='查看工具包 '+run.consumables.length;more.onclick=inventory;d.querySelector('.dialog-actions')!.prepend(more);prepareImages?.(d);
}
