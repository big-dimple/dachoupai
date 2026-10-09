import {rankLabel,SUIT_SYMBOL,type PlayingCard} from '../cards/types';
import type {HandRouteReference} from './HandRouteGuidance';
import {HAND_LABELS} from '../content/handLabels';
import type {HandRouteTransitionDraft} from './HandRouteTransition';
import {renderCandidateCards,renderRetentionCards} from './CandidateCardPreview';

export interface HandRouteTransitionView {budget:string;examples:(keepIds:readonly string[])=>readonly HandRouteTransitionDraft[];choose:(draft:HandRouteTransitionDraft,button:HTMLButtonElement)=>void;all:()=>void}
/** Viewing a reference never modifies a draft or run; examples use the existing explicit change-group action. */
export function mountHandRouteReferences(host:HTMLElement,hand:readonly PlayingCard[],references:readonly HandRouteReference[],disabledIds:readonly string[],discardCopy:string,back:()=>void,deck:()=>void,transition:HandRouteTransitionView):void {
 const names=(ids:readonly string[])=>ids.map(id=>hand.find(c=>c.id===id)!).map(c=>rankLabel(c.rank)+SUIT_SYMBOL[c.suit]).join(' ');
 const note=document.createElement('p');note.className='candidate-caption';note.textContent='未成型留换参考，也可试其他组合。';host.append(note);
 for(const [i,reference] of references.entries()){
  const section=document.createElement('details'),heading=document.createElement('summary'),gap=document.createElement('p'),keep=document.createElement('p'),cards=document.createElement('div'),other=document.createElement('p'),composition=document.createElement('p'),actions=document.createElement('div');
  section.className='candidate-group';section.dataset.routeReference='true';section.open=i===0;heading.textContent=reference.title;gap.textContent=reference.gap;keep.textContent='可尝试保留：'+names(reference.keepIds);other.textContent='其余可按需求尝试换：'+names(reference.otherIds)+'\n'+discardCopy;composition.textContent=reference.deckNote+'；不是下次抽牌保证。';
  for(const p of [gap,keep,other,composition])p.className='candidate-caption';
  renderRetentionCards(cards,hand,reference.keepIds,disabledIds);
  if(reference.keepIds.some(id=>disabledIds.includes(id))){const warning=document.createElement('p');warning.className='candidate-caption';warning.textContent='参考中有停用牌：仍参与判型，计分效果按当前规则。';cards.append(warning);}
  const budget=document.createElement('p');budget.className='candidate-caption';budget.dataset.playBudget='true';budget.textContent=transition.budget;
  const examples=document.createElement('div');examples.className='candidate-transitions';
  const title=document.createElement('p');title.className='candidate-caption';title.textContent='只用保留组外的牌过渡 · 点示例后再换组，仍需自己出牌';examples.append(title);
  for(const draft of transition.examples(reference.keepIds)){const facts=draft.facts;const button=document.createElement('button');button.type='button';button.className='candidate-choice';button.dataset.transition='true';button.dataset.ids=JSON.stringify(facts.playedIds);button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','过渡示例 · '+HAND_LABELS[facts.type]+' · '+names(facts.playedIds));renderCandidateCards(button,hand,facts);const caption=document.createElement('span');caption.className='candidate-caption';caption.textContent=HAND_LABELS[facts.type]+' · 出'+facts.playedIds.length+'张，保留组不出；常规消耗1次出牌'+(draft.assistIds.length?'\n助演 '+names(draft.assistIds)+' 会一同用掉':'')+(draft.removedAssistIds.length?'\n换组将取消原助演 '+names(draft.removedAssistIds)+'；保留牌不参与助演':'');button.append(caption);button.onclick=()=>transition.choose(draft,button);examples.append(button);}
  if(!examples.querySelector('button')){const empty=document.createElement('p');empty.className='candidate-caption';empty.textContent='保留组外没有可出牌；可放弃留牌，查看全部已成型。';examples.append(empty);}
  actions.className='candidate-variants';
  for(const [label,run] of [['放弃留牌 · 看全部已成型',transition.all],['回牌桌自己选牌',back],['查公开牌组',deck]] as const){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=run;actions.append(button);}
  section.append(heading,gap,keep,cards,other,budget,examples,composition,actions);host.append(section);
 }
}
