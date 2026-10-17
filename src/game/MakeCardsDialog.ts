import type {R2RunState} from '../domain/run';
import {R2_TOOLS} from '../content/r2Tools';
import {r2PurchasePrice,type R2Offer} from '../domain/r2Shop';
import {r2ConsumableCapacity} from '../domain/r2Resources';
import {basicChoiceRows} from './BasicToolChoice';
import {toolInfo} from './r2ToolInfo';
import {DetailDialog} from './DetailDialog';
import type {ShopServiceEntry} from './ShopServiceDialog';
import {isR2CoreBuild} from '../domain/r2GroupUpgrade';

export interface MakeCardsView {pane:'owned'|'purchase';positions:{owned:number;purchase:number};workshopTab?:'upgrade'|'modify'|'dyes';focusId?:string;receipt?:{seq:number;text:string}}

export function basicChoiceEntryLabel(run:R2RunState):string {
 if(run.shop?.basicChoice?.purchase)return '工坊\n本店已用';
 if(isR2CoreBuild(run))return '工坊\n本店共用1次';
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
export function showMakeCards(dialog:DetailDialog,run:R2RunState,ready:()=>boolean,purchaseReason:(offer:R2Offer)=>string|undefined,owned:(id:string)=>void,basic:(id:string)=>void,offer:(id:string)=>void,inventory:()=>void,view:MakeCardsView={pane:'purchase',positions:{owned:0,purchase:0}},services:readonly ShopServiceEntry[]=[],serviceNotice?:string,prepareImages?:(panel:HTMLDialogElement)=>void):void {
 const rows=makeCardsRows(run),seq=run.commandSeq;
 view.pane='purchase';
 const d=dialog.open('工坊 · 每店共用1次','',[],{closeLabel:'返回商店'});d.classList.add('make-cards-dialog','shop-workshop');
 const summary=document.createElement('p');summary.className='make-cards-summary';summary.textContent=`金币 ${run.gold} · 工具包 ${run.consumables.length}/${r2ConsumableCapacity(run)}`;d.querySelector('.dialog-header')!.append(summary);
 const quota=document.createElement('p');quota.className='make-cards-quota';quota.setAttribute('role','status');quota.textContent=serviceNotice??(run.shop!.basicChoice?.purchase?'本店自选已用 · 刷新不恢复，下一店恢复':'改牌 / 染色共用本店1次 · 先购买，再选目标确认');d.querySelector('.dialog-header')!.append(quota);
 const scroll=d.querySelector<HTMLElement>('.dialog-scroll')!;scroll.replaceChildren();
 const tabs=document.createElement('nav'),workspace=document.createElement('div');tabs.className='workshop-nav';tabs.setAttribute('aria-label','工坊项目');workspace.className='workshop-workspace';
 const remember=()=>{if(dialog.active(d))view.positions.purchase=scroll.scrollTop;};scroll.addEventListener('scroll',remember);d.addEventListener('click',remember,true);
 const groups:Array<{id:'upgrade'|'modify'|'dyes';title:string;description:string}>=[];
 if(isR2CoreBuild(run))groups.push({id:'upgrade',title:'升级牌型',description:'选已发现的牌型，确认付款后当场升1级，不收入工具包。'});
 groups.push({id:'modify',title:'改牌工具',description:'先购买，再选择牌组目标并确认。稍后使用会保留工具。'});
 if(rows.basic.some(r=>R2_TOOLS.find(t=>t.id===r.id)?.operation.kind==='set-suit'))groups.push({id:'dyes',title:'染色工具',description:'选工具的花色；购买后自己选目标牌，点数与其它属性保留。'});
 if(!groups.some(g=>g.id===view.workshopTab))view.workshopTab=services.length?'upgrade':'modify';
 const sections=new Map<string,HTMLElement>();
 for(const group of groups){
  const section=document.createElement('section'),heading=document.createElement('h3'),description=document.createElement('p'),grid=document.createElement('div');heading.textContent=group.title;description.textContent=group.description;description.className='workshop-description';grid.className='make-cards-grid';section.dataset.workshopGroup=group.id;section.append(heading,description,grid);workspace.append(section);sections.set(group.id,grid);
  const tab=document.createElement('button');tab.type='button';tab.textContent=group.title;tab.setAttribute('aria-pressed',String(group.id===view.workshopTab));tab.onclick=()=>{view.workshopTab=group.id;for(const child of workspace.children)(child as HTMLElement).hidden=(child as HTMLElement).dataset.workshopGroup!==group.id;for(const b of tabs.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===tab));scroll.scrollTop=0;};tabs.append(tab);section.hidden=group.id!==view.workshopTab;
 }
 const choose=(id:string,action:()=>void)=>{if(!dialog.active(d)||!ready()||run.commandSeq!==seq)return;remember();view.focusId=id;action();};
 const upgrade=sections.get('upgrade');
 if(upgrade){for(const service of services){const b=document.createElement('button'),name=document.createElement('strong'),effect=document.createElement('span'),price=document.createElement('span');b.type='button';b.className='shop-service-card';b.dataset.serviceId=service.id;name.textContent=service.title;effect.textContent=service.summary;price.textContent=service.unavailable??'实付 '+service.price+' 金';b.append(name,effect,price);b.disabled=!!service.unavailable||!ready();b.onclick=()=>choose(service.id,service.choose);upgrade.append(b);}if(!services.length){const empty=document.createElement('p');empty.textContent=run.shop!.basicChoice?.purchase?'本店机会已用，下一店恢复。':'目前没有可升级的已发现牌型。';upgrade.append(empty);}}
 for(const row of rows.basic){
  const group=R2_TOOLS.find(t=>t.id===row.id)?.operation.kind==='set-suit'?'dyes':'modify',host=sections.get(group);if(!host)continue;
  const b=document.createElement('button'),image=document.createElement('img'),copy=document.createElement('span'),name=document.createElement('strong'),purpose=document.createElement('span'),price=document.createElement('span');b.type='button';b.className='make-cards-tile';b.dataset.makeId=row.id;image.src=row.info.artUrl;image.alt='';image.loading='lazy';image.decoding='async';if(row.info.detailArtUrl)b.dataset.toolDetail=row.info.detailArtUrl;name.textContent=row.info.name;purpose.textContent=row.purpose;price.textContent=row.reason??row.price+' 金 · 查看';price.className='make-cards-action';copy.append(name,purpose,price);b.append(image,copy);b.disabled=!!row.reason||!ready();b.onclick=()=>choose(row.id,()=>basic(row.id));host.append(b);
 }
 scroll.append(tabs,workspace);scroll.scrollTop=view.positions.purchase;
 const more=document.createElement('button');more.type='button';more.textContent='工具包 '+run.consumables.length;more.onclick=inventory;d.querySelector('.dialog-actions')!.prepend(more);
 prepareImages?.(d);
}
