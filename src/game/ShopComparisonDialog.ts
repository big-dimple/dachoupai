import type {R2RunState} from '../domain/run';
import type {R2Offer} from '../domain/r2Shop';
import {DetailDialog} from './DetailDialog';
import {createShopOfferValue,createShopIdentityTags,shopComparisonPresentation} from './ShopJokerPresentation';

export interface ShopComparisonView {offerId?:string;scrollTop:number;selectedId?:string}
/** A visual comparison over the same five real instances; management keeps the old commands. */
export function showShopComparison(dialog:DetailDialog,run:R2RunState,offer:R2Offer,view:ShopComparisonView,
  inspect:(id:string)=>void,details:()=>void,direction:()=>void):void {
  if(view.offerId!==offer.offerId){view.offerId=offer.offerId;view.scrollTop=0;view.selectedId=undefined;}
  const data=shopComparisonPresentation(run,offer),candidate=data.candidate;
  let stopResize=()=>{};
  const d=dialog.open('比较替换 · 金币 '+data.gold,'',[{label:'返回购买详情',run:details},{label:'更换培养方向',run:direction}],{shopContext:'compare',closeLabel:'返回现货',onClose:()=>stopResize()});
  d.classList.add('shop-comparison-dialog');
  const content=d.querySelector('.dialog-content')!,scroll=d.querySelector<HTMLElement>('.dialog-scroll')!;scroll.replaceChildren();
  const image=(url:string|undefined,alt:string)=>{if(!url){const text=document.createElement('span');text.textContent=alt;return text;}const img=document.createElement('img');img.src=url;img.alt=alt+'卡面';img.decoding='async';return img;};
  const next=document.createElement('section'),art=document.createElement('figure'),copy=document.createElement('div'),name=document.createElement('h3'),price=document.createElement('strong'),step=document.createElement('p');
  next.className='shop-compare-candidate';art.append(image(candidate.url,candidate.name));name.textContent='待买 · '+candidate.name;price.className='shop-candidate-price';price.textContent='实付 '+candidate.price+' 金';step.className='shop-compare-step';step.textContent=`已持 ${data.rows.length}/${data.capacity} · 选一槽查看出售损失`;
  copy.append(name,createShopIdentityTags(candidate.rarity,candidate.editionId),price,createShopOfferValue(candidate.guidance),step);next.append(art,copy);content.prepend(next);
  if(candidate.uses){const usage=document.createElement('p');usage.className='shop-card-uses';usage.textContent=candidate.uses;price.after(usage);}
  const grid=document.createElement('section');grid.className='experience-cards shop-compare-slots';grid.setAttribute('aria-label','现持槽位比较');
  for(const row of data.rows){
    const card=document.createElement('article'),art=document.createElement('figure'),copy=document.createElement('div'),name=document.createElement('h3'),costs=document.createElement('div'),more=document.createElement('details'),summary=document.createElement('summary'),full=document.createElement('p'),button=document.createElement('button');
    card.className='experience-card shop-compare-slot';card.dataset.instanceId=row.id;card.classList.toggle('is-selected',view.selectedId===row.id);art.append(image(row.url,row.name));name.textContent='第 '+row.slot+' 槽 · '+row.name;
    costs.className='shop-compare-costs';for(const line of row.costs){const p=document.createElement('p');p.textContent=line;costs.append(p);}
    button.type='button';button.textContent='管理这张';button.onclick=()=>{view.scrollTop=scroll.scrollTop;view.selectedId=row.id;inspect(row.id);};
    more.className='card-rules';summary.textContent='条件、配合与完整损失';full.textContent=row.details;more.append(summary,full);
    copy.append(name,createShopIdentityTags(row.rarity,row.editionId),costs,createShopOfferValue(row.guidance,'换此槽后的推荐'),button,more);card.append(art,copy);grid.append(card);
    if(row.uses){const usage=document.createElement('p');usage.className='shop-card-uses';usage.textContent=row.uses;costs.before(usage);}
  }
  // Reflow the open dialog as browser chrome / viewport height changes. Keep the
  // current slot at the same visible offset when the candidate enters/leaves its scroll.
  scroll.append(grid);
  const compact=window.matchMedia('(max-height:650px) and (max-width:760px)');
  const reflow=()=>{
    if(d.classList.contains('shop-comparison-compact')===compact.matches)return;
    const focused=document.activeElement;
    const top=scroll.getBoundingClientRect().top,anchor=scroll.scrollTop>0?[...grid.children].find(card=>card.getBoundingClientRect().bottom>top):undefined;
    const anchorTop=anchor?.getBoundingClientRect().top;
    d.classList.toggle('shop-comparison-compact',compact.matches);
    if(compact.matches)scroll.prepend(next);else content.prepend(next);
    if(anchor&&anchorTop!==undefined)scroll.scrollTop+=anchor.getBoundingClientRect().top-anchorTop;
    if(focused instanceof HTMLElement&&scroll.contains(focused))focused.scrollIntoView({block:'nearest'});
  };
  reflow();compact.addEventListener('change',reflow);stopResize=()=>compact.removeEventListener('change',reflow);
  scroll.addEventListener('scroll',()=>{if(dialog.active(d))view.scrollTop=scroll.scrollTop;});
  scroll.scrollTop=view.scrollTop;
  const selected=[...grid.querySelectorAll<HTMLElement>('.shop-compare-slot')].find(card=>card.dataset.instanceId===view.selectedId);
  selected?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});
}
