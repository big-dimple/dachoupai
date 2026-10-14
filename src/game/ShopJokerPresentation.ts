import type {R2RunState} from '../domain/run';
import type {R2Offer} from '../domain/r2Shop';
import {r2PurchasePrice} from '../domain/r2Shop';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {r2JokerCapacity} from '../domain/r2Resources';
import {r2JokerStateText} from './r2Help';
import {shopOfferGuidance} from './ShopOfferGuidance';
import {shopReplacementCompactFacts,shopReplacementFacts,shopReplacementTransactionFacts} from './ShopRouteRelations';
import {currentBuildFocus} from './BuildJourney';
import {editionLabel} from './r2ToolInfo';
import {jokerArtPreviewUrl} from './jokerArt';

/** Projects existing public advice and transactions; never invents a score or new rating. */
export function shopComparisonPresentation(run:R2RunState,offer:R2Offer){
  const definition=r2JokerDefinitionFor(run,offer.definitionId),focus=currentBuildFocus(run,run.openingRoute),guidance=shopOfferGuidance(run,offer);
  const remaining=(id:string,used=0)=>{const operation=r2JokerDefinitionFor(run,id).hooks.flatMap(h=>h.operations).find(o=>o.kind==='expire-after-hands');return operation?.kind==='expire-after-hands'?'余 '+Math.max(0,operation.limit-used)+' 次':undefined;};
  return {candidate:{name:definition.name,rarity:definition.rarity,edition:editionLabel(offer.edition),url:jokerArtPreviewUrl(definition.id),price:r2PurchasePrice(run,offer),uses:remaining(definition.id),guidance},
    gold:run.gold,capacity:r2JokerCapacity(run),rows:run.jokers.map((held,index)=>{
      const d=r2JokerDefinitionFor(run,held.definitionId),facts=shopReplacementFacts(run,offer,held,focus),transaction=shopReplacementTransactionFacts(run,offer,held),g=shopOfferGuidance(run,offer,held);
      return {id:held.instanceId,slot:index+1,name:d.name,rarity:d.rarity,edition:editionLabel(held.edition),uses:remaining(d.id,held.counters?.handsScored??0),url:jokerArtPreviewUrl(d.id),state:r2JokerStateText(held,d),guidance:g,
        costs:shopReplacementCompactFacts(run,held,transaction),details:[g.detail,transaction.summary,...transaction.growthEffects,facts.loss,facts.connections,facts.money,facts.held.body].join('\n')};
    })};
}
/** Outlines and fills share one fixed shape, so empty stars do not depend on font glyphs. */
export function createShopValueStars(stars:number,label='推荐指数'):HTMLSpanElement {
  const row=document.createElement('span');row.className='shop-value-stars';row.setAttribute('role','img');row.setAttribute('aria-label',label+(stars?` ${stars}星，共5星`:' 待核，共5星'));
  row.dataset.stars=String(stars);
  for(let i=0;i<5;i++){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),shape=document.createElementNS('http://www.w3.org/2000/svg','path');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.dataset.filled=String(i<stars);
    shape.setAttribute('d','M12 2.5 14.9 8.5 21.5 9.4 16.7 14.1 17.8 20.7 12 17.6 6.2 20.7 7.3 14.1 2.5 9.4 9.1 8.5Z');svg.append(shape);row.append(svg);
  }
  return row;
}
/** The same value block appears in the candidate, per-slot comparison and purchase detail. */
export function createShopOfferValue(guidance:ReturnType<typeof shopOfferGuidance>,label='推荐指数'):HTMLElement {
  const block=document.createElement('section'),head=document.createElement('div'),name=document.createElement('span'),reason=document.createElement('p');
  block.className='shop-offer-value';head.className='shop-value-heading';name.textContent=label;head.append(name,createShopValueStars(guidance.stars,label));reason.textContent=guidance.reason+' · '+guidance.condition;block.append(head,reason);
  const visibleCombination=guidance.recommendation.combination.split('\n').filter(line=>line.startsWith('组合潜力：')||line.startsWith('组合记录：')&&!line.includes('尚无')).join('\n');
  if(visibleCombination){const combination=document.createElement('p');combination.className='shop-value-combination';combination.textContent=visibleCombination;block.append(combination);}
  return block;
}
