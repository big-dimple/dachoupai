import './TouyeDiscardChoice.css';
import type {R2RunState} from '../domain/r2Run';
import {r2DiscardCost} from '../domain/r2Run';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import {renderToolCard} from './CandidateCardPreview';
import {touyeConfirmationCopy} from './TouyeWagerCopy';
import type {DetailDialog} from './DetailDialog';
import {mountHeroDecisionEyes} from './HeroDecisionEyes';
/** A fresh UI-only discard draft. The table's proposed play is never reused or changed. */
export function showTouyeDiscardChoice(dialog:DetailDialog,run:R2RunState,valid:()=>boolean,next:(ids:string[])=>void):void {
 const selected=new Set<string>(),hand=run.handOrder.map(id=>run.deckInstances.find(c=>c.id===id)!),copy=touyeConfirmationCopy(run,[]);
 const modal=dialog.open('秦琼 · 先重新选弃牌',copy.risk+'。'+copy.success+'，不押仍按原规则。',[],{summaryBody:'先弃牌换牌，再出牌。原拟出牌选择保留；下面重新选1–5张要弃的牌。',effectBody:'确认换牌才花'+r2DiscardCost(run)+'次弃牌'+(run.stage?.boss?.definitionId==='B07'?'＋1金币':'，不另收金币')+'；确认后不能取消重抽。',closeLabel:'返回 · 保留原出牌选择'});
 mountHeroDecisionEyes(modal,'discard-choice');
 modal.classList.add('touye-discard-choice');const area=modal.querySelector('.dialog-scroll')!,count=document.createElement('p'),grid=document.createElement('div'),proceed=document.createElement('button');grid.className='touye-discard-grid';count.className='touye-discard-count';proceed.className='touye-discard-next';proceed.type='button';proceed.textContent='下一步 · 选押注牌型';
 const buttons:HTMLButtonElement[]=[];const refresh=()=>{count.textContent='要弃的牌：'+selected.size+'/5'+(selected.size?' · '+hand.filter(c=>selected.has(c.id)).map(c=>rankLabel(c.rank)+SUIT_SYMBOL[c.suit]).join(' '):' · 尚未选择');proceed.disabled=!valid()||!selected.size;buttons.forEach((button,i)=>{button.setAttribute('aria-pressed',String(selected.has(hand[i].id)));button.disabled=!valid()||selected.size>=5&&!selected.has(hand[i].id);});};
 for(const card of hand){const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','弃牌候选 '+rankLabel(card.rank)+SUIT_SYMBOL[card.suit]);button.dataset.cardId=card.id;renderToolCard(button,card);button.onclick=()=>{if(!dialog.active(modal)||!valid())return;if(selected.has(card.id))selected.delete(card.id);else if(selected.size<5)selected.add(card.id);refresh();};buttons.push(button);grid.append(button);}
 proceed.onclick=()=>{if(!dialog.active(modal)||!valid()||!selected.size)return;const ids=hand.filter(c=>selected.has(c.id)).map(c=>c.id);dialog.close(modal);next(ids);};area.append(count,grid,proceed);refresh();
}
