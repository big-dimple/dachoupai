import {rankLabel,SUIT_SYMBOL,type PlayingCard} from '../cards/types';
import type {HandRouteReference} from './HandRouteGuidance';
import {renderRetentionCards} from './CandidateCardPreview';

/** On-demand content inside the existing candidate dialog; never modifies a draft or run. */
export function mountHandRouteReferences(host:HTMLElement,hand:readonly PlayingCard[],references:readonly HandRouteReference[],disabledIds:readonly string[],discardCopy:string,back:()=>void,deck:()=>void):void {
 const names=(ids:readonly string[])=>ids.map(id=>hand.find(c=>c.id===id)!).map(c=>rankLabel(c.rank)+SUIT_SYMBOL[c.suit]).join(' ');
 const note=document.createElement('p');note.className='candidate-caption';note.textContent='未成型留换参考，也可试其他组合。';host.append(note);
 for(const [i,reference] of references.entries()){
  const section=document.createElement('details'),heading=document.createElement('summary'),gap=document.createElement('p'),keep=document.createElement('p'),cards=document.createElement('div'),other=document.createElement('p'),composition=document.createElement('p'),actions=document.createElement('div');
  section.className='candidate-group';section.dataset.routeReference='true';section.open=i===0;heading.textContent=reference.title;gap.textContent=reference.gap;keep.textContent='可尝试保留：'+names(reference.keepIds);other.textContent='其余可按需求尝试换：'+names(reference.otherIds)+'\n'+discardCopy;composition.textContent=reference.deckNote+'；不是下次抽牌保证。';
  for(const p of [gap,keep,other,composition])p.className='candidate-caption';
  renderRetentionCards(cards,hand,reference.keepIds,disabledIds);
  if(reference.keepIds.some(id=>disabledIds.includes(id))){const warning=document.createElement('p');warning.className='candidate-caption';warning.textContent='参考中有停用牌：仍参与判型，计分效果按当前规则。';cards.append(warning);}
  actions.className='candidate-variants';
  for(const [label,run] of [['回牌桌自己选牌',back],['查公开牌组',deck]] as const){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=run;actions.append(button);}
  section.append(heading,gap,keep,cards,other,composition,actions);host.append(section);
 }
}
