import type {R2RunState} from '../domain/run';
import {R2_TOOLS} from '../content/r2Tools';
import {r2PurchasePrice,type R2Offer} from '../domain/r2Shop';
import {r2ConsumableCapacity} from '../domain/r2Resources';
import {basicChoiceRows} from './BasicToolChoice';
import {toolInfo,toolFamilyLabel} from './r2ToolInfo';
import {toolPurpose} from './RouteFitCue';
import {DetailDialog} from './DetailDialog';
import type {ShopServiceEntry} from './ShopServiceDialog';
import {isR2CoreBuild} from '../domain/r2GroupUpgrade';

export interface MakeCardsView {pane:'owned'|'purchase';positions:{owned:number;purchase:number};focusId?:string;receipt?:{seq:number;text:string}}

export function basicChoiceEntryLabel(run:R2RunState):string {
 if(run.shop?.basicChoice?.purchase?.handType)return '本店已升级\n查看做牌';
 if(run.shop?.basicChoice?.purchase)return '本店自选已购\n查看道具';
 if(isR2CoreBuild(run))return '升级 / 做牌\n本店共选1件';
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
export function showMakeCards(dialog:DetailDialog,run:R2RunState,ready:()=>boolean,purchaseReason:(offer:R2Offer)=>string|undefined,owned:(id:string)=>void,basic:(id:string)=>void,offer:(id:string)=>void,inventory:()=>void,view:MakeCardsView={pane:'purchase',positions:{owned:0,purchase:0}},services:readonly ShopServiceEntry[]=[],serviceNotice?:string):void {
 const rows=makeCardsRows(run),seq=run.commandSeq;
 const d=dialog.open(serviceNotice?'做牌与道具':'道具','',[],{closeLabel:'回到商店'});d.classList.add('make-cards-dialog');
 const summary=document.createElement('p');summary.className='make-cards-summary';summary.textContent=`金币 ${run.gold} · 库存 ${run.consumables.length}/${r2ConsumableCapacity(run)}`;d.querySelector('.dialog-header')!.append(summary);
 if(view.receipt?.seq===run.commandSeq){const receipt=document.createElement('p');receipt.className='make-cards-receipt';receipt.setAttribute('role','status');receipt.textContent=view.receipt.text;d.querySelector('.dialog-header')!.append(receipt);}
 const scroll=d.querySelector<HTMLElement>('.dialog-scroll')!;scroll.replaceChildren();
 const tabs=document.createElement('nav'),workspace=document.createElement('div');tabs.className='make-cards-tabs';workspace.className='make-cards-workspace';d.dataset.makePane=view.pane;
 const remember=()=>{if(dialog.active(d))view.positions[view.pane]=scroll.scrollTop;};
 // Capture before DetailDialog removes the list, including Escape and footer actions.
 d.addEventListener('click',remember,true);d.addEventListener('cancel',remember,true);scroll.addEventListener('scroll',remember);
 const sections=new Map<string,HTMLElement>();
 for(const [key,title]of [['owned','已有工具'],['purchase','选购工具']] as const){const section=document.createElement('section'),heading=document.createElement('h3');section.className='make-cards-'+key;heading.textContent=title;section.append(heading);workspace.append(section);sections.set(key,section);const b=document.createElement('button');b.type='button';b.textContent=title+(key==='owned'?' '+rows.owned.length:'');b.setAttribute('aria-pressed',String(d.dataset.makePane===key));b.onclick=()=>{remember();view.pane=key;view.focusId=undefined;d.dataset.makePane=key;for(const tab of tabs.querySelectorAll('button'))tab.setAttribute('aria-pressed',String(tab===b));scroll.scrollTop=view.positions[key];};tabs.append(b);}
 const grid=(section:HTMLElement)=>{const e=document.createElement('div');e.className='make-cards-grid';section.append(e);return e;};
 const tile=(host:HTMLElement,id:string,info:ReturnType<typeof toolInfo>,purpose:string,action:string,reason:string|undefined,choose:()=>void,inspect=false)=>{
  const b=document.createElement('button'),image=document.createElement('img'),copy=document.createElement('span'),name=document.createElement('strong'),text=document.createElement('span'),state=document.createElement('span');
  b.type='button';b.className='make-cards-tile';b.dataset.makeId=id;b.setAttribute('aria-label',info.name+' · '+action);image.src=info.artUrl;image.alt='';image.loading='lazy';name.textContent=info.name;text.textContent=purpose;state.textContent=reason==='本店选择已购，刷新不补货'?'本店自选已用':reason||action;state.className='make-cards-action';copy.append(name,text,state);b.append(image,copy);b.disabled=!!reason||!inspect&&!ready();b.onclick=()=>{if(!dialog.active(d)||!inspect&&!ready()||run.commandSeq!==seq)return;remember();view.focusId=id;b.disabled=true;choose();};host.append(b);
 };
 const held=grid(sections.get('owned')!);for(const r of rows.owned)tile(held,r.id,r.info,r.purpose,r.later?'查看 · 留到牌桌':'选目标',undefined,()=>owned(r.id),true);
 if(!rows.owned.length){const p=document.createElement('p');p.className='make-cards-empty';p.textContent='暂无库存，先选购一件工具。';held.append(p);}
 const stock=sections.get('purchase')!;stock.querySelector('h3')!.textContent='本店现货';
 const random=grid(stock);random.classList.add('make-cards-stock');for(const r of rows.offers)tile(random,r.offer.offerId,r.info,toolPurpose(run,r.offer.definitionId),toolFamilyLabel(r.info.family)+' · '+r.price+' 金',r.offer.consumed?'已售':purchaseReason(r.offer),()=>offer(r.offer.offerId));
 if(!rows.offers.length){const empty=document.createElement('p');empty.className='make-cards-empty';empty.textContent='本店暂无随机现货，可查看下方基础自选。';random.append(empty);}
 if(services.length||serviceNotice){const h=document.createElement('h3'),note=document.createElement('p');h.textContent='升级牌型 · 商店服务';note.className='make-cards-quota';note.textContent=serviceNotice??'确认后当场升级 · 与基础改牌 / 染色共用本店1次';stock.append(h,note);const serviceGrid=grid(stock);serviceGrid.classList.add('shop-service-grid');for(const service of services){const b=document.createElement('button'),name=document.createElement('strong'),effect=document.createElement('span'),price=document.createElement('span');b.type='button';b.className='shop-service-card';b.dataset.serviceId=service.id;name.textContent=service.title;effect.textContent=service.summary;price.textContent=service.unavailable??'实付 '+service.price+' 金';b.append(name,effect,price);b.disabled=!!service.unavailable||!ready();b.onclick=()=>{if(!dialog.active(d)||!ready()||run.commandSeq!==seq)return;remember();view.focusId=service.id;service.choose();};serviceGrid.append(b);}}
 if(rows.basic.length){const h=document.createElement('h3'),quota=document.createElement('p');h.textContent='做牌自选 · 本店1件';quota.className='make-cards-quota';quota.textContent=run.shop!.basicChoice?.purchase?'本店自选已用 · 下一店恢复':serviceNotice?'升级 / 改牌 / 染色共用1次 · 工具可买来存着或现在用':'改牌 / 染色共用1次 · 买来存着或现在用';stock.append(h,quota);const choices=grid(stock);choices.classList.add('make-cards-basic');for(const r of rows.basic)tile(choices,r.id,r.info,r.purpose,r.price+' 金',r.reason,()=>basic(r.id));}
 scroll.append(tabs,workspace);const more=document.createElement('button');more.type='button';more.textContent='道具箱与长期物品';more.onclick=inventory;d.querySelector('.dialog-actions')!.prepend(more);
 scroll.scrollTop=view.positions[view.pane];
 const previous=[...d.querySelectorAll<HTMLButtonElement>('.make-cards-tile,.shop-service-card')].find(b=>(b.dataset.makeId??b.dataset.serviceId)===view.focusId&&!b.disabled&&b.getClientRects().length);
 previous?.focus({preventScroll:true});
}
