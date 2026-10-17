import {cardDefinitionName} from './tangsongCardNames';
import type {R2RunState} from '../domain/run';
import type {R2Offer} from '../domain/r2Shop';
import {r2PurchasePrice} from '../domain/r2Shop';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {r2JokerCapacity} from '../domain/r2Resources';
import {r2JokerStateText} from './r2Help';
import {shopOfferGuidance} from './ShopOfferGuidance';
import {shopReplacementCompactFacts,shopReplacementFacts,shopReplacementTransactionFacts} from './ShopRouteRelations';
import {currentBuildFocus} from './BuildJourney';
import {editionLabel,jokerExtraBonusCopy} from './r2ToolInfo';
import type {Edition} from '../cards/types';
import {createJokerRarityElement,type JokerRarity} from './JokerRarity';
import {SHOP_STAR_POINTS} from './ShopCardValueVisual';
import {jokerArtPreviewUrl} from './jokerArt';
import './ShopPresentation.css';

/** Projects existing public advice and transactions; never invents a score or new rating. */
export function shopComparisonPresentation(run:R2RunState,offer:R2Offer){
  const definition=r2JokerDefinitionFor(run,offer.definitionId),focus=currentBuildFocus(run,run.openingRoute),guidance=shopOfferGuidance(run,offer);
  const remaining=(id:string,used=0)=>{const operation=r2JokerDefinitionFor(run,id).hooks.flatMap(h=>h.operations).find(o=>o.kind==='expire-after-hands');return operation?.kind==='expire-after-hands'?'余 '+Math.max(0,operation.limit-used)+' 次':undefined;};
  return {candidate:{name:cardDefinitionName(definition),rarity:definition.rarity,edition:editionLabel(offer.edition),editionId:offer.edition,url:jokerArtPreviewUrl(definition.id),price:r2PurchasePrice(run,offer),uses:remaining(definition.id),guidance},
    gold:run.gold,capacity:r2JokerCapacity(run),rows:run.jokers.map((held,index)=>{
      const d=r2JokerDefinitionFor(run,held.definitionId),facts=shopReplacementFacts(run,offer,held,focus),transaction=shopReplacementTransactionFacts(run,offer,held),g=shopOfferGuidance(run,offer,held);
      return {id:held.instanceId,slot:index+1,name:cardDefinitionName(d),rarity:d.rarity,edition:editionLabel(held.edition),editionId:held.edition,uses:remaining(d.id,held.counters?.handsScored??0),url:jokerArtPreviewUrl(d.id),state:r2JokerStateText(held,d),guidance:g,
        costs:shopReplacementCompactFacts(run,held,transaction),details:[g.detail,transaction.summary,...transaction.growthEffects,facts.loss,facts.connections,facts.money,facts.held.body].join('\n')};
    })};
}
/** Definition rarity and instance edition remain independent of recommendation strength. */
export function createShopIdentityTags(rarity:JokerRarity,edition?:Edition):HTMLElement {
 const row=document.createElement('div'),label=document.createElement('span');row.className='shop-card-tags';
 const badge=createJokerRarityElement(rarity);badge.dataset.axis='rarity';
 label.className='shop-edition-tag';label.dataset.axis='edition';label.dataset.edition=edition??'none';const bonus=jokerExtraBonusCopy(edition);label.textContent=bonus.shelf;label.title=bonus.detail;
 row.append(badge,label);return row;
}
/** The same value block appears in the candidate, per-slot comparison and purchase detail. */
export function createShopOfferValue(guidance:ReturnType<typeof shopOfferGuidance>,label='选购依据'):HTMLElement {
  const block=document.createElement('section'),head=document.createElement('div'),name=document.createElement('span'),reason=document.createElement('p');
  block.className='shop-offer-value';block.dataset.axis='purchase-facts';head.className='shop-value-heading';name.textContent=label;head.append(name);reason.textContent=guidance.decision.now+'\n条件：'+guidance.decision.later;block.append(head,reason);
  if(!/尚未确认与已持牌配合|尚无持牌|尚无已持配合/.test(guidance.decision.connection)){const combination=document.createElement('p');combination.className='shop-value-combination';combination.dataset.axis='combination';combination.textContent=guidance.decision.connection;block.append(combination);}
  return block;
}
