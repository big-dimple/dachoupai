import {SUITS,type Suit} from '../cards/types';
import type {R2RunState} from './r2Run';
import {isR2S04Finish,R2_S04_FINISH_CONTRACT} from './r2GroupUpgrade';

type S04Context=Pick<R2RunState,'contentVersion'|'contentHash'|'chapter'|'deckInstances'|'destroyedIds'>;
/** Public persistent counts only; destroyed cards never count in either side of the ratio. */
export function r2S04Facts(state:S04Context){
 const cards=state.deckInstances.filter(card=>!state.destroyedIds.includes(card.id));
 const {minimumChapter,numerator,denominator}=R2_S04_FINISH_CONTRACT;
 const restricted=isR2S04Finish(state),required=Math.ceil(cards.length*numerator/denominator);
 return {restricted,living:cards.length,required,minimumChapter,chapter:state.chapter,
  suits:SUITS.map(suit=>{
   const count=cards.filter(card=>card.suit===suit).length;
   return {suit,count,missing:Math.max(0,required-count),eligible:cards.length>0&&count<cards.length&&(!restricted||state.chapter>=minimumChapter&&count*denominator>=cards.length*numerator)};
  })};
}
/** The new identity alone restricts supply, purchase and use. Original resource guards remain separate. */
export function r2S04Issue(state:S04Context,suit?:Suit):'s04-chapter-gated'|'s04-suit-density'|'no-effect'|undefined {
 if(!isR2S04Finish(state))return;
 const facts=r2S04Facts(state);
 if(state.chapter<facts.minimumChapter)return 's04-chapter-gated';
 if(suit){const row=facts.suits.find(row=>row.suit===suit)!;if(row.count===facts.living)return 'no-effect';if(!row.eligible)return 's04-suit-density';}
 else if(!facts.suits.some(row=>row.eligible))return facts.suits.some(row=>row.count===facts.living)?'no-effect':'s04-suit-density';
}
