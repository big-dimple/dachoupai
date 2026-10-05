import {r2JokerDefinitionsForContext,type R2ContentIdentity} from './r2ContentProfiles';
import {R2_JOKERS,readR2Modifiers,supportsR2Joker,type R2JokerDefinition,type R2JokerInstance} from '../content/r2Schema';
import {R2_EDITIONS,R2_LONG_TERM_ITEMS,R2_TOOLS,R2_TOOL_CATALOG,type R2Edition,type R2ToolDefinition} from '../content/r2Tools';
import type {SeededRng} from '../core/SeededRng';
import type {R2RunState} from './r2Run';
import {r2RunModeConfig,type R2ModeSelection} from '../content/r2Modes';
import {r2ConsumableCapacity,r2HandLimit,r2HandsBudget,r2JokerCapacity} from './r2Resources';
import {r2ItemSupported,r2ToolAllowed} from './r2ToolRuntime';
import {r2StageSpec} from './r2Chapter';
export const R2_ECONOMY={initialGold:6,shelfSlots:3,prices:{common:4,uncommon:6,rare:8},weights:{common:5,uncommon:3,rare:2},rerollStart:2,rerollCap:10} as const;
export interface R2Offer {offerId:string;definitionId:string;price:number;consumed:boolean;edition?:R2Edition}
export interface R2ShopState {visitIndex:number;rerollCount:number;freeRerolls:number;purchases:number;soldJoker:boolean;offers:R2Offer[];toolOffers:R2Offer[];itemOffers:R2Offer[]}
interface PurchaseContext extends R2ContentIdentity {purchaseCoupons:number;jokers?:readonly R2JokerInstance[];longTermItems?:readonly string[];shop?:Pick<R2ShopState,'purchases'>|null}
export function getR2Joker(id:string,identity:R2ContentIdentity={}):R2JokerDefinition {
  const definition=r2JokerDefinitionsForContext(identity).find(d=>d.id===id);if(!definition)throw new Error(`unknown-joker: ${id}`);return definition;
}
export const r2Price=(id:string,edition:R2Edition='none',identity:R2ContentIdentity={}):number=>R2_ECONOMY.prices[getR2Joker(id,identity).rarity]+R2_EDITIONS.find(row=>row.id===edition)!.priceDelta;
export const r2ToolPrice=(id:string):number=>R2_TOOLS.find(row=>row.id===id)!.price;
export const r2ItemPrice=(id:string):number=>R2_LONG_TERM_ITEMS.find(row=>row.id===id)!.price;
export const r2PurchaseDiscount=(state:PurchaseContext):number=>(state.purchaseCoupons>0?2:0)+(state.shop?.purchases===0?readR2Modifiers(state.jokers??[],r2JokerDefinitionsForContext(state)).firstPurchaseDiscount+R2_LONG_TERM_ITEMS.reduce((sum,item)=>sum+(state.longTermItems?.includes(item.id)&&item.operation.kind==='first-purchase-discount'?item.operation.amount:0),0):0);
export const r2PurchasePrice=(state:PurchaseContext,offer:R2Offer):number=>Math.max(1,offer.price-r2PurchaseDiscount(state));
export const salePrice=(paidPrice:number):number=>Math.max(1,Math.floor(paidPrice/2));
export const rerollPrice=(count:number):number=>Math.min(R2_ECONOMY.rerollCap,R2_ECONOMY.rerollStart+count);
export function r2PaidRerollPrice(state:R2ModeSelection&Pick<R2RunState,'shop'|'longTermItems'>):number {
  const {start,cap}=r2RunModeConfig(state).reroll;
  return Math.max(1,Math.min(cap,start+state.shop!.rerollCount)-R2_LONG_TERM_ITEMS.reduce((sum,item)=>sum+(state.longTermItems.includes(item.id)&&item.operation.kind==='paid-reroll-discount'?item.operation.amount:0),0));
}
export const r2Pool=(owned:readonly string[],excluded:readonly string[]=[],identity:R2ContentIdentity={}):R2JokerDefinition[]=>r2JokerDefinitionsForContext(identity).filter(d=>!owned.includes(d.id)&&!excluded.includes(d.id)&&supportsR2Joker(d));
function pick<T>(rng:SeededRng,pool:readonly T[],weight:(entry:T)=>number):T {
  let ticket=rng.integer(1,pool.reduce((sum,row)=>sum+weight(row),0));
  for(const row of pool){ticket-=weight(row);if(ticket<=0)return row;}
  throw new Error('invalid-weighted-pool');
}
export function drawR2Shelf(rng:SeededRng,pool:readonly R2JokerDefinition[],initialGold?:number,slots:number=R2_ECONOMY.shelfSlots):string[] {
  const available=[...pool],shelf:R2JokerDefinition[]=[];
  while(available.length&&shelf.length<slots){const definition=pick(rng,available,d=>R2_ECONOMY.weights[d.rarity]);shelf.push(definition);available.splice(available.indexOf(definition),1);}
  if(initialGold!==undefined&&shelf.length&&!shelf.some(d=>R2_ECONOMY.prices[d.rarity]<=initialGold)){
    const affordable=pool.filter(d=>R2_ECONOMY.prices[d.rarity]<=initialGold&&!shelf.includes(d));
    if(affordable.length)shelf[shelf.length-1]=pick(rng,affordable,d=>R2_ECONOMY.weights[d.rarity]);
  }
  return shelf.map(d=>d.id);
}
export const drawR2Edition=(rng:SeededRng):R2Edition=>pick(rng,R2_EDITIONS,row=>row.shopWeight).id;
/** Acquisition checks use public persistent targets. Buying a tool never applies its additional use cost. */
export function r2ToolAcquisitionPool(state:R2RunState):R2ToolDefinition[] {
  const live=state.deckInstances.filter(card=>!state.destroyedIds.includes(card.id)),limits=R2_TOOL_CATALOG.limits;
  const floor=state.longTermItems.includes('U08')?limits.minimalDeckFloor:limits.deckDeletionFloor;
  const config=r2RunModeConfig(state),discovered=Object.values(state.handLevels),nextStage=!!r2StageSpec(state.stageIndex,state.tourMode,state.difficulty);
  return R2_TOOLS.filter(tool=>{
    if(!r2ToolAllowed(state,tool.id)||!tool.shopWeight)return false;
    const op=tool.operation;
    switch(op.kind){
      case 'upgrade-hand':return op.handType===undefined?discovered.some(level=>level!<limits.handLevelMaximum):Object.hasOwn(state.handLevels,op.handType)&&state.handLevels[op.handType]!<limits.handLevelMaximum;
      case 'delete-cards':return live.length>floor;
      case 'set-suit':return live.some(card=>card.suit!==op.suit);
      case 'copy-card':return live.some(card=>config.enhancementsAllowed||card.enhancement===undefined)&&live.length+op.copies<=limits.deckMaximum&&(op.copies===1||nextStage&&state.spectralModifiers.handsPenalty<limits.spectralHandsPenaltyMaximum&&r2HandsBudget(state)>limits.handsMinimum);
      case 'shift-rank':return live.some(card=>op.delta>0?card.rank<op.maximum:card.rank>op.minimum);
      case 'set-enhancement':return live.some(card=>card.enhancement!==op.enhancement);
      case 'restore-discard':return true;
      case 'add-gold':return true;
      case 'free-reroll':return r2Pool(state.jokers.map(j=>j.definitionId),state.safetyNetUsed?['f07']:[],state).length>0;
      case 'random-enhancement':return live.length>floor&&live.some(card=>card.enhancement===undefined);
      case 'random-edition':return live.some(card=>(card.edition??'none')==='none')||state.jokers.some(j=>(j.edition??'none')==='none');
      case 'set-deck-suit':return live.length>0&&nextStage&&state.spectralModifiers.handPenalty<limits.spectralHandPenaltyMaximum&&r2HandLimit(state)>limits.handMinimum&&r2HandLimit({...state,spectralModifiers:{...state.spectralModifiers,handPenalty:state.spectralModifiers.handPenalty+1}})===r2HandLimit(state)-1;
      case 'exchange-hand-levels':return Object.entries(state.handLevels).some(([gain,level])=>level!<=op.targetMaximumBefore&&Object.entries(state.handLevels).some(([loss,value])=>loss!==gain&&value!>=op.donorMinimumBefore));
      case 'rare-joker-reward':return state.jokers.length<r2JokerCapacity(state)&&r2Pool(state.jokers.map(j=>j.definitionId),state.safetyNetUsed?['f07']:[],state).some(d=>d.rarity==='rare');
      case 'set-joker-edition':return state.jokers.length>=2&&state.jokers.some(j=>j.edition!==op.edition&&state.consumables.length<=r2ConsumableCapacity(state));
      case 'clear-deck-specials':return !state.spectralModifiers.cleanSlateBonus&&nextStage&&live.filter(card=>card.enhancement!==undefined||(card.edition??'none')!=='none').length>=op.minimumModifiedCards&&r2HandLimit({...state,spectralModifiers:{...state.spectralModifiers,cleanSlateBonus:1}})===r2HandLimit(state)+1;
    }
  });
}
export function drawR2Tool(rng:SeededRng,pool:readonly R2ToolDefinition[]):string|undefined {
  const families=Object.entries(R2_TOOL_CATALOG.acquisition.familyWeights).filter(([family])=>pool.some(tool=>tool.family===family));
  if(!families.length)return undefined;
  const family=pick(rng,families,entry=>entry[1])[0];
  return pick(rng,pool.filter(tool=>tool.family===family),tool=>tool.shopWeight).id;
}
export function drawR2Items(rng:SeededRng,owned:readonly string[],count:number):string[] {
  if(owned.length>=R2_TOOL_CATALOG.limits.longTermSlots)return [];
  const available=R2_LONG_TERM_ITEMS.filter(item=>r2ItemSupported(item.id)&&!owned.includes(item.id)),ids:string[]=[];
  while(available.length&&ids.length<count){const item=pick(rng,available,row=>row.shopWeight);ids.push(item.id);available.splice(available.indexOf(item),1);}
  return ids;
}
