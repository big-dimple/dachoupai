import {heroText} from './HeroIdentity';
import type {PlayingCard} from '../cards/types';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import type {R2SelectionFacts} from '../domain/r2SelectionFacts';
import type {AssistRecommendation,AssistOption} from './AssistRecommendation';
import {renderCandidateCards,renderAssistCards} from './CandidateCardPreview';
import type {DetailDialog} from './DetailDialog';

/** A local poker workspace; the generic dialog retains its original sizing and lifecycle. */
export function showAssistChoices(dialog:DetailDialog,hand:readonly PlayingCard[],main:R2SelectionFacts,recommendation:AssistRecommendation,selected:readonly string[],current:()=>boolean,choose:(ids:readonly string[])=>void):void {
 const d=dialog.open(heroText('阿默 · 换一组'),'助攻会一同用掉，不计主手或留手效果。最终出牌才消费本场机会。',[],{closeLabel:'返回选牌'});d.classList.add('amo-assist-dialog');
 const workspace=document.createElement('section');workspace.className='amo-assist-workspace';workspace.setAttribute('aria-label','主手与助攻候选');
 const group=document.createElement('section'),heading=document.createElement('h3'),faces=document.createElement('div');group.className='amo-assist-main';heading.textContent='主手保持 · '+main.playedIds.length+'张';renderCandidateCards(faces,hand,main);group.append(heading,faces);workspace.append(group);
 const list=document.createElement('section');list.className='amo-assist-options';list.setAttribute('aria-label','可选助攻');
 const label=(o:AssistOption)=>o.ids.map(id=>{const c=hand.find(c=>c.id===id)!;return rankLabel(c.rank)+SUIT_SYMBOL[c.suit];}).join(' ');
 for(const [index,option]of recommendation.options.entries()){
  const card=document.createElement('article'),title=document.createElement('h3'),cards=document.createElement('div'),cost=document.createElement('p'),button=document.createElement('button');
  const chosen=option.ids.length===selected.length&&option.ids.every(id=>selected.includes(id));
  card.className='amo-assist-option'+(!index?' is-recommended':'');card.dataset.ids=option.ids.join('|');card.dataset.chosen=String(chosen);
  title.textContent=option.ids.length?(index===0?'推荐助攻':'可选助攻')+' · ×'+option.multiplier:(index===0?'推荐保留 · 不助攻':'保留副组 · 不助攻');
  if(option.ids.length)renderAssistCards(cards,hand,option.ids);else {cards.className='amo-assist-retain';cards.textContent='保留余牌与本场助攻机会';}
  cost.textContent=option.ids.length?'用掉'+option.ids.length+'张 · 不计留手效果':'本手不消耗助攻';
  const details=document.createElement('details'),summary=document.createElement('summary'),score=document.createElement('p');summary.textContent='本手得分与损失';
  const exact=(value:string)=>value.replace(/\B(?=(\d{3})+(?!\d))/g,',');
  score.textContent='预计本手 '+(option.range.minimum===option.range.maximum?exact(option.range.minimum):exact(option.range.minimum)+'–'+exact(option.range.maximum))+(recommendation.random?' · 随机按保底比较，实际可能不同':'')+'。'+(option.ids.length?'消耗：'+label(option)+'。':'主手独立计分。');details.append(summary,score);
  button.type='button';button.className=index===0?'dialog-primary':'';button.textContent=option.ids.length?(chosen?'取消这组':'选这组')+' ×'+option.multiplier:(chosen?'保持不助攻':'本手不助攻');button.setAttribute('aria-label',option.ids.length?(chosen?'取消':'选择')+'助攻 '+label(option):'本手不助攻');button.disabled=!current();
  button.onclick=()=>{if(!current()||!dialog.active(d)){dialog.close(d);return;}button.disabled=true;dialog.close(d);choose(option.ids);};
  card.append(title,cards,cost,button,details);list.append(card);
 }workspace.append(list);d.querySelector('.dialog-scroll')!.prepend(workspace);
}
