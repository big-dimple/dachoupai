import {rankLabel,SUIT_SYMBOL,type PlayingCard} from '../cards/types';
import type {R2SelectionFacts} from '../domain/r2SelectionFacts';
import {handdrawnPath} from './HanddrawnArt';
import {assetUrl} from './theme';
/** The current public hand only. Court art is reused; marks come from actual selection facts. */
export function renderCandidateCards(button:HTMLButtonElement,hand:readonly PlayingCard[],facts:R2SelectionFacts):void {
 button.replaceChildren();const row=document.createElement('span');row.className='candidate-card-row';row.setAttribute('aria-hidden','true');
 for(const id of facts.playedIds){const card=hand.find(c=>c.id===id);if(!card)continue;
  const face=document.createElement('span'),index=document.createElement('strong'),mark=document.createElement('small');face.className='candidate-card-face';face.dataset.cardId=id;face.dataset.red=String(card.suit==='hearts'||card.suit==='diamonds');face.dataset.disabled=String(facts.disabledIds.includes(id));
  index.textContent=rankLabel(card.rank)+SUIT_SYMBOL[card.suit];face.append(index);
  const path=handdrawnPath(card.rank===11?'j':card.rank===12?'q':card.rank===13?'k':'','court');
  if(path){const art=document.createElement('img');art.src=assetUrl(path);art.alt='';art.decoding='async';art.onerror=()=>{art.replaceWith(document.createTextNode(SUIT_SYMBOL[card.suit]));};face.append(art);}else{const pip=document.createElement('span');pip.className='candidate-card-pip';pip.textContent=SUIT_SYMBOL[card.suit];face.append(pip);}
  mark.textContent=face.dataset.disabled==='true'?'停':(facts.activeScoringIds.includes(id)?'★':'附')+(facts.ordinaryPointsSuppressedIds.includes(id)?'0':'');face.append(mark);row.append(face);
 }
 button.append(row);
}
