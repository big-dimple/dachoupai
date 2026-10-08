import {rankLabel,SUIT_SYMBOL,type PlayingCard,type Rank} from '../cards/types';
import type {BuildFocus} from './BuildJourney';
import {evaluateR2Hand} from '../domain/evaluateR2';
import {HAND_LABELS} from '../content/handLabels';

export interface HandRouteReference {title:string;keepIds:string[];otherIds:string[];gap:string;deckNote:string}
export interface HandRoutePublicInput {hand:readonly PlayingCard[];effectiveDeck:readonly PlayingCard[];rules:{fourStraight:boolean;fourFlush:boolean}}
const rankName=(rank:number)=>rankLabel((rank===1?14:rank) as Rank);
/** Structural references, not score rankings. No hidden order, RNG, commands or probabilities. */
export function handRouteReferences(input:HandRoutePublicInput,focus:BuildFocus):HandRouteReference[]{
 const {hand,effectiveDeck,rules}=input,rows:HandRouteReference[]=[];
 if(!hand.length||hand.length>14)return rows;
 const add=(title:string,keep:readonly PlayingCard[],gap:string,deckNote:string)=>{
  if(!keep.length)return;
  const keepIds=keep.map(c=>c.id);
  if(rows.some(r=>r.keepIds.join('|')===keepIds.join('|')))return;
  rows.push({title,keepIds,otherIds:hand.filter(c=>!keepIds.includes(c.id)).map(c=>c.id),gap,deckNote});
 };
 if(focus==='straight'){
  const sequences=(size:number)=>Array.from({length:15-size},(_,i)=>Array.from({length:size},(_,j)=>i+j+1)).map(ranks=>{const keep=ranks.flatMap(r=>{const card=hand.find(c=>c.rank===(r===1?14:r));return card?[card]:[];});return {ranks,keep,missing:ranks.filter(r=>!keep.some(c=>c.rank===(r===1?14:r)))};});
  const size=rules.fourStraight?4:5,choices=sequences(size);
  if([...choices,...(size===4?sequences(5):[])].some(p=>!p.missing.length&&['straight','straight-flush'].includes(evaluateR2Hand(p.keep,rules).type)))return [];choices.sort((a,b)=>b.keep.length-a.keep.length);
  for(const p of choices){
   if(!p.missing.length){const type=evaluateR2Hand(p.keep,rules).type,extensions=[p.ranks[0]-1,p.ranks.at(-1)!+1].filter(r=>r>=1&&r<=14);add(p.ranks.map(rankName).join('—')+' 连续牌参考',p.keep,'这'+size+'张按当前规则判为'+HAND_LABELS[type]+'，不是顺子；同花顺仍需5张。可尝试补第5个连续点数，或改变花色再看实际判型。','全有效牌组：'+extensions.map(r=>rankName(r)+'×'+effectiveDeck.filter(c=>c.rank===(r===1?14:r)).length).join(' · '));continue;}
   add(p.ranks.map(rankName).join('—')+' 顺子参考',p.keep,'还缺 '+p.missing.map(rankName).join('、')+'（不同点数，不跨K—A—2）','全有效牌组：'+p.missing.map(r=>rankName(r)+'×'+effectiveDeck.filter(c=>c.rank===(r===1?14:r)).length).join(' · '));
  }
 }else if(focus==='flush'){
  const size=rules.fourFlush?4:5,suits=[...new Set(hand.map(c=>c.suit))].sort((a,b)=>hand.filter(c=>c.suit===b).length-hand.filter(c=>c.suit===a).length);
  if(suits.some(suit=>hand.filter(c=>c.suit===suit).length>=size))return [];
  for(const suit of suits){const keep=hand.filter(c=>c.suit===suit);if(keep.length>=size)continue;add(SUIT_SYMBOL[suit]+' 同花参考',keep,'还差 '+(size-keep.length)+' 张'+SUIT_SYMBOL[suit]+'，需共'+size+'张同色','全有效牌组：'+SUIT_SYMBOL[suit]+' '+effectiveDeck.filter(c=>c.suit===suit).length+'张');}
 }else{
  const ranks=[...new Set(hand.map(c=>c.rank))];
  if(ranks.some(rank=>hand.filter(c=>c.rank===rank).length>=2))return [];
  for(const rank of ranks){const keep=hand.filter(c=>c.rank===rank);if(keep.length>=2)continue;add(rankName(rank)+' 同点成组参考',keep,'还差 1 张'+rankName(rank)+'才能成为对子','全有效牌组：'+rankName(rank)+'×'+effectiveDeck.filter(c=>c.rank===rank).length);}
 }
 return rows.slice(0,2);
}
