import type {R2RunState} from '../domain/run';
import type {R2Offer} from '../domain/r2Shop';
import {RANKS,SUITS,rankLabel,SUIT_SYMBOL,type Rank,type Suit} from '../cards/types';
import type {ShopServiceEntry} from './ShopServiceDialog';
import {WORKSHOP_GOALS,workshopChoices,workshopIntent,type WorkshopIntent} from './WorkshopModel';
import type {MakeCardsView} from './MakeCardsDialog';
import {cardArtSource} from './CardArtSource';
import {openCardArtZoom} from './CardArtZoomModal';
import {isR2CoreBuild} from '../domain/r2GroupUpgrade';
import './WorkshopGoals.css';

interface WorkshopActions {ready:()=>boolean;purchaseReason:(offer:R2Offer)=>string|undefined;basic:(id:string,intent?:WorkshopIntent)=>void;offer:(id:string,intent?:WorkshopIntent)=>void;services:readonly ShopServiceEntry[];active:()=>boolean}
/** Goal selection and optional directory filters only. Existing adapters own every quote and command. */
export function mountWorkshopGoals(host:HTMLElement,run:R2RunState,view:MakeCardsView,actions:WorkshopActions):()=>void {
  const choices=workshopChoices(run),nav=document.createElement('nav'),workspace=document.createElement('section');nav.className='workshop-goal-nav';nav.setAttribute('aria-label','自选做牌目标');workspace.className='workshop-goal-workspace';
  const root=document.createElement('div');root.className='workshop-route-root';root.textContent=run.shop?.basicChoice?.purchase?'本店机会已用':'本店共享 1 次';host.append(root);
  let opened:HTMLDialogElement|undefined;
  const live=()=>actions.active()&&actions.ready();
  const art=(row:typeof choices[number])=>{
    const image=document.createElement('img');image.src=row.info.artUrl;image.alt=row.info.name;image.width=72;image.height=90;image.decoding='async';image.loading='lazy';
    if(!cardArtSource(row.id))return image;
    const b=document.createElement('button');b.type='button';b.className='workshop-art';b.setAttribute('aria-label','放大鉴赏'+row.info.name);b.setAttribute('aria-haspopup','dialog');b.append(image);b.onclick=()=>{b.focus({preventScroll:true});opened=openCardArtZoom(row.id,row.info.name);};return b;
  };
  const render=()=>{
    opened?.close();workspace.replaceChildren();
    const used=!!run.shop?.basicChoice?.purchase,goal=WORKSHOP_GOALS.find(g=>g.id===view.workshopTab);
    nav.dataset.selected=goal?.id??'';nav.dataset.used=String(used);
    for(const b of nav.querySelectorAll<HTMLButtonElement>('button')){const selected=b.dataset.workshopGoal===goal?.id,unsupported=b.dataset.workshopGoal==='upgrade'?!isR2CoreBuild(run):b.dataset.workshopGoal==='dyes'?!choices.some(c=>c.group==='dyes'):false,blocked=used||unsupported||!!goal&&!selected;b.setAttribute('aria-pressed',String(selected));b.disabled=blocked;b.dataset.crossed=String(blocked);b.querySelector('.workshop-route-state')!.textContent=used?'已用 ×':unsupported?'此局未开放':blocked?'×':selected?'已选':'选择';}
    if(!goal){const hint=document.createElement('p');hint.className='workshop-route-hint';hint.textContent=used?'下一店恢复共享机会。':'选一路，查看目标与实付费用。';workspace.append(hint);return;}
    if(!used){const back=document.createElement('button');back.type='button';back.className='workshop-route-back';back.textContent='‹ 返回选择路线';back.onclick=()=>{view.workshopTab=undefined;view.intent=undefined;render();};workspace.append(back);}
    const title=document.createElement('h3'),description=document.createElement('p');title.textContent=goal.title;description.textContent=goal.description;description.className='workshop-goal-description';workspace.append(title,description);
    const list=document.createElement('div');list.className='workshop-operations';workspace.append(list);
    const choose=(id:string,intent:WorkshopIntent|undefined,next:()=>void)=>{if(!live())return;view.focusId=id;view.intent=intent;next();};
    if(goal.id==='upgrade'){
      for(const service of actions.services){
        const row=document.createElement('article'),copy=document.createElement('div'),name=document.createElement('strong'),summary=document.createElement('p'),b=document.createElement('button');row.className='workshop-service';row.dataset.serviceId=service.id;name.textContent=service.title;summary.textContent=service.summary;copy.append(name,summary);b.type='button';b.textContent=service.unavailable??`查看 · 实付 ${service.price} 金`;b.disabled=!!service.unavailable||!live();b.onclick=()=>choose(service.id,undefined,service.choose);row.append(copy,b);list.append(row);
      }
      if(!actions.services.length){const empty=document.createElement('p');empty.className='workshop-empty';empty.textContent=run.shop?.basicChoice?.purchase?'本店共享机会已用，下一店恢复。':'目前没有可升级的已发现牌型；未发现或已达上限的牌型不能升级。';list.append(empty);}
    }else{
      const control=document.createElement('label'),select=document.createElement('select'),all=document.createElement('option');control.className='workshop-goal-filter';control.textContent=goal.id==='modify'?'想调整哪个点数？':'从哪种花色里挑？';all.value='';all.textContent=goal.id==='modify'?'不限点数 · 直接选牌':'不限原花色 · 直接选牌';select.append(all);
      if(goal.id==='modify')for(const rank of RANKS){const count=run.deckInstances.filter(c=>!run.destroyedIds.includes(c.id)&&c.rank===rank).length;if(!count)continue;const option=document.createElement('option');option.value=String(rank);option.textContent=rankLabel(rank)+' · '+count+'张';select.append(option);}
      else for(const suit of SUITS){const option=document.createElement('option');option.value=suit;option.textContent=SUIT_SYMBOL[suit];select.append(option);}
      select.setAttribute('aria-label',goal.id==='modify'?'自选原点数':'自选原花色');select.value=goal.id==='modify'?view.rankGoal??'':view.suitGoal??'';select.onchange=()=>{if(goal.id==='modify')view.rankGoal=select.value;else view.suitGoal=select.value;render();workspace.querySelector<HTMLSelectElement>('select')?.focus({preventScroll:true});};control.append(select);workspace.insertBefore(control,list);
      for(const row of choices.filter(row=>row.group===goal.id)){
        const filter=goal.id==='modify'&&view.rankGoal?{rank:Number(view.rankGoal) as Rank}:goal.id==='dyes'&&view.suitGoal?{suit:view.suitGoal as Suit}:{};
        const projected=workshopIntent(run,row.id,filter),reason=projected.reason??(row.duplicate?(row.duplicate.consumed?'同名随机现货已售。':actions.purchaseReason(row.duplicate)):row.reason);
        const article=document.createElement('article'),copy=document.createElement('div'),name=document.createElement('strong'),summary=document.createElement('p'),source=document.createElement('small'),b=document.createElement('button');article.className='workshop-operation';article.dataset.makeId=row.id;name.textContent=projected.intent.label;summary.textContent=(row.tool.target.kind==='cards'?`自己选 ${row.tool.target.minimum}–${row.tool.target.maximum} 张 · `:'')+(row.group==='modify'?'花色不变':'点数不变');source.textContent=reason??`可改变 ${projected.count} 张`+(row.duplicate?' · 同名随机现货，按现货价购买':' · 自选共享次数');copy.append(name,summary,source);b.type='button';b.textContent=reason?'暂不可选':`选目标 · 实付 ${row.price} 金`;b.disabled=!!reason||!live();b.onclick=()=>choose(row.id,projected.intent,()=>row.duplicate?actions.offer(row.duplicate!.offerId,projected.intent):actions.basic(row.id,projected.intent));article.append(art(row),copy,b);list.append(article);
      }
    }
    const other=choices.filter(row=>row.group==='other');
    if(other.length){const more=document.createElement('details'),label=document.createElement('summary');more.className='workshop-other';label.textContent='其他改牌工具';more.append(label);
      for(const row of other){const line=document.createElement('div'),text=document.createElement('p'),b=document.createElement('button');line.className='workshop-other-row';text.textContent=row.info.name+' · '+row.purpose;const reason=row.duplicate?(row.duplicate.consumed?'随机现货已售':actions.purchaseReason(row.duplicate)):row.reason;b.type='button';b.textContent=reason??`查看 · ${row.price} 金`;b.disabled=!!reason||!live();b.onclick=()=>choose(row.id,undefined,()=>row.duplicate?actions.offer(row.duplicate!.offerId):actions.basic(row.id));line.append(text,b);more.append(line);}workspace.append(more);
    }
  };
  for(const goal of WORKSHOP_GOALS){const b=document.createElement('button'),title=document.createElement('strong'),purpose=document.createElement('span'),state=document.createElement('span');b.type='button';title.textContent=goal.id==='upgrade'?'升级牌型':goal.id==='modify'?'改牌':'染色';purpose.className='workshop-route-purpose';purpose.textContent=goal.id==='upgrade'?'强化牌型':goal.title;state.className='workshop-route-state';b.append(title,purpose,state);b.dataset.workshopGoal=goal.id;b.onclick=()=>{view.workshopTab=goal.id;render();};nav.append(b);}
  host.append(nav,workspace);render();return()=>{opened?.close();};
}
