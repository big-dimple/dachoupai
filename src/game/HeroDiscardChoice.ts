import './TouyeDiscardChoice.css';
import type {R2RunState} from '../domain/r2Run';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import {renderToolCard} from './CandidateCardPreview';
import type {DetailDialog} from './DetailDialog';

/** A fresh UI-only discard draft, separate from the table's proposed play. */
export function showHeroDiscardChoice(dialog:DetailDialog,run:R2RunState,valid:()=>boolean,next:(ids:string[])=>void,copy:{title:string;body:string;summaryBody:string;effectBody:string;nextLabel:string}):HTMLDialogElement {
 const selected=new Set<string>(),hand=run.handOrder.map(id=>run.deckInstances.find(c=>c.id===id)!);
 const modal=dialog.open(copy.title,copy.body,[],{summaryBody:copy.summaryBody,effectBody:copy.effectBody,closeLabel:'返回 · 保留原出牌选择'});
 modal.classList.add('hero-discard-choice');const area=modal.querySelector('.dialog-scroll')!,count=document.createElement('p'),grid=document.createElement('div'),proceed=document.createElement('button');grid.className='touye-discard-grid';count.className='touye-discard-count';proceed.className='touye-discard-next';proceed.type='button';proceed.textContent=copy.nextLabel;
 const buttons:HTMLButtonElement[]=[];const refresh=()=>{count.textContent='要弃的牌：'+selected.size+'/5'+(selected.size?' · '+hand.filter(c=>selected.has(c.id)).map(c=>rankLabel(c.rank)+SUIT_SYMBOL[c.suit]).join(' '):' · 尚未选择');proceed.disabled=!valid()||!selected.size;buttons.forEach((button,i)=>{button.setAttribute('aria-pressed',String(selected.has(hand[i].id)));button.disabled=!valid()||selected.size>=5&&!selected.has(hand[i].id);});};
 for(const card of hand){const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','弃牌候选 '+rankLabel(card.rank)+SUIT_SYMBOL[card.suit]);button.dataset.cardId=card.id;renderToolCard(button,card);button.onclick=()=>{if(!dialog.active(modal)||!valid())return;if(selected.has(card.id))selected.delete(card.id);else if(selected.size<5)selected.add(card.id);refresh();};buttons.push(button);grid.append(button);}
 proceed.onclick=()=>{if(!dialog.active(modal)||!valid()||!selected.size)return;const ids=hand.filter(c=>selected.has(c.id)).map(c=>c.id);dialog.close(modal);next(ids);};area.append(count,grid,proceed);refresh();return modal;
}
