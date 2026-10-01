import type {PlayingCard,Suit} from '../cards/types';
import {SUITS,SUIT_SYMBOL} from '../cards/types';
import type {SeededRng} from '../core/SeededRng';

export const R2_AVAILABLE_CHAPTERS=2;
export const R2_BOSSES=[
  {id:'B01',name:'贵宾场',rule:'第一手前每次弃牌消耗2次额度；第一手后恢复1次。',response:'先判断手牌能否开场，保留足够额度再弃牌。'},
  {id:'B02',name:'低调点',rule:'所出第4/5张不给普通点数；仍成型且明确的大丑牌效果正常。',response:'可调手牌顺序，让高点数或关键普通点数排前面。'},
  {id:'B03',name:'单色灯',rule:'公开花色本场失效；仍参与牌型，但不加点数或计分牌效果。',response:'用其他花色计分，或保留失效牌来凑牌型。'},
  {id:'B04',name:'素颜场',rule:'J/Q/K本场失效；A不受影响。',response:'数字牌和A能计分，失效人头仍能组成牌型。'},
] as const;
export type R2BossId=typeof R2_BOSSES[number]['id'];
export interface R2BossPlan {definitionId:R2BossId;disabledSuit:Suit|null}
export const R2_SKIP_CONSUMABLES=['T01','T03','T04','T05','T06','T17'] as const;
export type R2SkipConsumable=typeof R2_SKIP_CONSUMABLES[number];
export type R2SkipResult={kind:'coupon';amount:2}|{kind:'consumable';definitionId:R2SkipConsumable}|{kind:'gold';amount:1};

export function drawR2Boss(rng:SeededRng,seen:readonly string[]):R2BossPlan {
  const pool=R2_BOSSES.filter(b=>!seen.includes(b.id));if(!pool.length)throw Error('boss-pool-exhausted');
  const chosen=pool[rng.integer(0,pool.length-1)];return {definitionId:chosen.id,disabledSuit:chosen.id==='B03'?SUITS[rng.integer(0,3)]:null};
}
export function r2DisabledCards(boss:R2BossPlan,index:number,hand:readonly PlayingCard[]):string[] {
  if(index%3!==2)return [];
  return hand.filter(c=>boss.definitionId==='B03'?c.suit===boss.disabledSuit:boss.definitionId==='B04'?[11,12,13].includes(c.rank):false).map(c=>c.id);
}
export function r2OrdinarySuppression(boss:R2BossPlan,index:number,hand:readonly PlayingCard[],selectedIds:readonly string[]):string[] {
  return index%3===2&&boss.definitionId==='B02'?hand.filter(c=>selectedIds.includes(c.id)).slice(3).map(c=>c.id):[];
}
export const r2BossText=(boss:R2BossPlan)=>{const d=R2_BOSSES.find(b=>b.id===boss.definitionId)!;return `${d.name}${boss.disabledSuit?' · '+SUIT_SYMBOL[boss.disabledSuit]:''}：${d.rule}\n应对：${d.response}`;};
