import {R2_JOKERS,readR2Modifiers,supportsR2Joker,type R2JokerDefinition,type R2JokerInstance} from '../content/r2Schema';
import type {SeededRng} from '../core/SeededRng';
export const R2_ECONOMY={initialGold:6,shelfSlots:3,prices:{common:4,uncommon:6,rare:8},weights:{common:5,uncommon:3,rare:2},rerollStart:2,rerollCap:10} as const;
export interface R2Offer {offerId:string;definitionId:string;price:number;consumed:boolean}
export interface R2ShopState {visitIndex:number;rerollCount:number;purchases:number;offers:R2Offer[]}
interface PurchaseContext {purchaseCoupons:number;jokers?:readonly R2JokerInstance[];shop?:Pick<R2ShopState,'purchases'>|null}
export function getR2Joker(id:string):R2JokerDefinition {
  const definition=R2_JOKERS.find(d=>d.id===id);if(!definition)throw new Error(`unknown-joker: ${id}`);return definition;
}
export const r2Price=(id:string):number=>R2_ECONOMY.prices[getR2Joker(id).rarity];
export const r2PurchaseDiscount=(state:PurchaseContext):number=>(state.purchaseCoupons>0?2:0)+(state.shop?.purchases===0?readR2Modifiers(state.jokers??[],R2_JOKERS).firstPurchaseDiscount:0);
export const r2PurchasePrice=(state:PurchaseContext,offer:R2Offer):number=>Math.max(1,offer.price-r2PurchaseDiscount(state));
export const salePrice=(paidPrice:number):number=>Math.max(1,Math.floor(paidPrice/2));
export const rerollPrice=(count:number):number=>Math.min(R2_ECONOMY.rerollCap,R2_ECONOMY.rerollStart+count);
export const r2Pool=(owned:readonly string[],excluded:readonly string[]=[]):R2JokerDefinition[]=>R2_JOKERS.filter(d=>!owned.includes(d.id)&&!excluded.includes(d.id)&&supportsR2Joker(d));
function pick(rng:SeededRng,pool:readonly R2JokerDefinition[]):R2JokerDefinition {
  const total=pool.reduce((sum,d)=>sum+R2_ECONOMY.weights[d.rarity],0);
  let weight=rng.integer(1,total);
  for(const definition of pool){weight-=R2_ECONOMY.weights[definition.rarity];if(weight<=0)return definition;}
  throw new Error('invalid-weighted-pool');
}
export function drawR2Shelf(rng:SeededRng,pool:readonly R2JokerDefinition[],initialGold?:number):string[] {
  const available=[...pool],shelf:R2JokerDefinition[]=[];
  while(available.length&&shelf.length<R2_ECONOMY.shelfSlots){const definition=pick(rng,available);shelf.push(definition);available.splice(available.indexOf(definition),1);}
  if(initialGold!==undefined&&shelf.length&&!shelf.some(d=>R2_ECONOMY.prices[d.rarity]<=initialGold)){
    const affordable=pool.filter(d=>R2_ECONOMY.prices[d.rarity]<=initialGold&&!shelf.includes(d));
    if(affordable.length)shelf[shelf.length-1]=pick(rng,affordable);
  }
  return shelf.map(d=>d.id);
}
