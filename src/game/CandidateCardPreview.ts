import {ENHANCEMENT_BRIEF} from './CardSpecialLabels';
import {rankLabel,SUIT_SYMBOL,type PlayingCard} from '../cards/types';
import type {R2SelectionFacts} from '../domain/r2SelectionFacts';
import {handdrawnPath} from './HanddrawnArt';
import {assetUrl} from './theme';
/** The current public hand only. Court art is reused; marks come from actual selection facts. */
export function renderCandidateCards(button:HTMLButtonElement,hand:readonly PlayingCard[],facts:R2SelectionFacts):void {
 renderPublicCards(button,hand,facts.playedIds,card=>facts.disabledIds.includes(card.id),card=>(facts.activeScoringIds.includes(card.id)?'★':'附')+(facts.ordinaryPointsSuppressedIds.includes(card.id)?'0':''));
}
/** A reference is not a completed/scoring hand. Its cards carry 留 instead of scoring stars. */
export function renderRetentionCards(host:HTMLElement,hand:readonly PlayingCard[],ids:readonly string[],disabledIds:readonly string[]):void {
 renderPublicCards(host,hand,ids,card=>disabledIds.includes(card.id),()=> '留');
}
/** Tool comparison faces are references, never scoring/retention suggestions. */
export function renderToolCard(host:HTMLElement,card:PlayingCard):void {
 renderPublicCards(host,[card],[card.id],()=>false,()=> '');
}
function renderPublicCards(button:HTMLElement,hand:readonly PlayingCard[],ids:readonly string[],disabled:(card:PlayingCard)=>boolean,markText:(card:PlayingCard)=>string):void {
 button.replaceChildren();const row=document.createElement('span');row.className='candidate-card-row';row.setAttribute('aria-hidden','true');
 for(const id of ids){const card=hand.find(c=>c.id===id);if(!card)continue;
  const face=document.createElement('span'),index=document.createElement('strong'),mark=document.createElement('small');face.className='candidate-card-face';face.dataset.cardId=id;face.dataset.red=String(card.suit==='hearts'||card.suit==='diamonds');
  face.dataset.disabled=String(disabled(card));index.textContent=rankLabel(card.rank)+SUIT_SYMBOL[card.suit];face.append(index);
  const path=handdrawnPath(card.rank===11?'j':card.rank===12?'q':card.rank===13?'k':'','court');
  if(path){const art=document.createElement('img');art.src=assetUrl(path);art.alt='';art.decoding='async';art.onerror=()=>{art.replaceWith(document.createTextNode(SUIT_SYMBOL[card.suit]));};face.append(art);}else{const pip=document.createElement('span');pip.className='candidate-card-pip';pip.textContent=SUIT_SYMBOL[card.suit];face.append(pip);}
  mark.textContent=face.dataset.disabled==='true'?'停':markText(card);face.append(mark);if(card.enhancement){const tag=document.createElement('b');tag.className='card-enhancement-tag';tag.textContent=ENHANCEMENT_BRIEF[card.enhancement];tag.dataset.enhancement=card.enhancement;face.append(tag);}if(card.edition&&card.edition!=='none'){face.dataset.edition=card.edition;const tag=document.createElement('i');tag.className='card-edition-tag';tag.textContent=card.edition==='foil'?'箔':card.edition==='holographic'?'幻':'彩';face.append(tag);}row.append(face);
 }
 button.append(row);
}
