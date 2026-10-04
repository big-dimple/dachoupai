import {RANKS,SUITS,SUIT_SYMBOL,rankLabel} from '../cards/types';
import {R2_ENHANCEMENTS} from '../content/r2Tools';
import type {R2RunState} from '../domain/run';
import type {DetailDialog} from './DetailDialog';
import {editionLabel} from './r2ToolInfo';

type Scope='remaining'|'all';
type EnhancementFilter='all'|'none'|'enhanced';
export type DeckInspectionState=Pick<R2RunState,'phase'|'deckInstances'|'destroyedIds'|'drawPile'|'handOrder'|'playedPile'|'discardPile'>;
const enhancementNames=Object.fromEntries(R2_ENHANCEMENTS.map(row=>[row.id,row.name]));

/** A public, sorted view of instances; never expose draw order or mutate the saved deck. */
export function deckInspectionText(state:DeckInspectionState,scope:Scope,enhancement:EnhancementFilter):string {
  const shop=state.phase==='shop',all=shop||scope==='all';
  const cards=state.deckInstances.filter(card=>!state.destroyedIds.includes(card.id)&&(all||state.drawPile.includes(card.id))&&
    (enhancement==='all'||(enhancement==='none'?card.enhancement===undefined:card.enhancement!==undefined)))
    .sort((a,b)=>SUITS.indexOf(a.suit)-SUITS.indexOf(b.suit)||a.rank-b.rank);
  const scopeName=shop?'全部有效持久牌组':all?'全部有效牌组':'本场剩余牌堆';
  const filterName={all:'所有增强',none:'无增强',enhanced:'有增强'}[enhancement];
  const note='按花色与点数统计，不展示抽牌顺序。'+(shop?'\n商店不显示下一场剩余牌堆；入场后可查。上一场牌区不代表下一场发牌。':'');
  const suits='花色：'+SUITS.map(suit=>SUIT_SYMBOL[suit]+' '+cards.filter(card=>card.suit===suit).length).join(' · ');
  const ranks='点数：'+[...RANKS].reverse().map(rank=>rankLabel(rank)+' '+cards.filter(card=>card.rank===rank).length).join(' · ');
  const list=cards.map(card=>rankLabel(card.rank)+SUIT_SYMBOL[card.suit]+
    (state.playedPile.includes(card.id)?shop?' 上场已打出':' 已打出':state.discardPile.includes(card.id)?shop?' 上场已弃':' 已弃':state.handOrder.includes(card.id)?shop?' 上场手牌':' 手牌':'')+
    (card.enhancement?' '+enhancementNames[card.enhancement]:'')+((card.edition??'none')!=='none'?' '+editionLabel(card.edition):'')).join('、');
  return [note,`${scopeName} · ${filterName} · ${cards.length} 张`,suits,ranks,list||'当前筛选没有牌。'].join('\n\n');
}

/** Both scenes keep the existing native modal/menu route and its owned close lifecycle. */
export function showDeckInspection(owner:DetailDialog,state:DeckInspectionState):void {
  const dialog=owner.open('牌组查看',''),content=dialog.querySelector<HTMLParagraphElement>('.dialog-body')!,controls=document.createElement('div');
  controls.className='deck-inspection-controls';content.setAttribute('aria-live','polite');
  const scope=document.createElement('select'),enhancement=document.createElement('select'),shop=state.phase==='shop';
  for(const [value,label] of [['remaining',shop?'剩余牌堆（入场后可查）':'剩余牌堆'],['all','全部牌组']]){
    const option=document.createElement('option');option.value=value;option.textContent=label;option.disabled=shop&&value==='remaining';scope.append(option);
  }
  scope.value=shop?'all':'remaining';
  for(const [value,label] of [['all','所有增强'],['none','无增强'],['enhanced','有增强']]){const option=document.createElement('option');option.value=value;option.textContent=label;enhancement.append(option);}
  for(const [name,select] of [['牌组范围',scope],['增强筛选',enhancement]] as const){
    const label=document.createElement('label'),title=document.createElement('span');title.textContent=name;select.setAttribute('aria-label',name);label.append(title,select);controls.append(label);
  }
  content.before(controls);
  const render=()=>{content.textContent=deckInspectionText(state,scope.value as Scope,enhancement.value as EnhancementFilter);};
  scope.onchange=render;enhancement.onchange=render;render();
}
