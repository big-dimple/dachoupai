import {applyCommand,type R2RunState,type Action} from '../domain/run';
import type {R2Offer} from '../domain/r2Shop';
import {r2PurchasePrice} from '../domain/r2Shop';
import {readR2Modifiers,type R2JokerInstance} from '../content/r2Schema';
import {r2JokerDefinitionsFor,r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {r2ScoreContext,r2CreateJoker} from '../domain/r2Run';
import {Rational} from '../domain/rational';
import {r2HandLimit,r2HandsBudget,r2JokerCapacity,r2InterestCap} from '../domain/r2Resources';
import {r2DisabledCards} from '../domain/r2Chapter';
import {previewR2Hand} from '../domain/scoreR2';
import {isR2CoreBuild} from '../domain/r2GroupUpgrade';
import {rankLabel,SUIT_SYMBOL,type PlayingCard} from '../cards/types';
import type {BuildFocus} from './BuildDirectionPreferences';
import {r2JokerStateText} from './r2Help';
import {editionLabel} from './r2ToolInfo';
import {shopPurchaseConditionLosses,shopSaleConsequences} from './ShopRouteRelations';

export const PURCHASE_VALUE_POLICY='public-one-play-v1';
const calibrated=new Set(['f06','b03','c04','c06','e08','b10']);
const transact=(s:R2RunState,action:Action)=>applyCommand(s,{runId:s.runId,commandId:s.runId+'/value/'+action.type+'/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});
/** Bounded witnesses, not a search for the best hand. Public deck order is
 * canonicalized, so rearranging a hidden pile cannot change the advice. */
export function purchaseValueHands(s:R2RunState,focus:BuildFocus='group'){
 const cards=s.deckInstances.filter(c=>!s.destroyedIds.includes(c.id)).sort((a,b)=>a.rank-b.rank||a.suit.localeCompare(b.suit)||a.id.localeCompare(b.id));
 const rows:{label:string;ids:string[]}[]=cards.length?[{label:'普通单张',ids:[cards[0].id]}]:[];
 const modifiers=readR2Modifiers(s.jokers,r2JokerDefinitionsFor(s));
 let selected:PlayingCard[]=[];
 if(focus==='group'){
  const groups=[...new Set(cards.map(c=>c.rank))].map(rank=>cards.filter(c=>c.rank===rank)).sort((a,b)=>b.length-a.length||a[0].rank-b[0].rank);
  const pair=groups.find(g=>g[0].rank===7&&g.length>=2)??groups.find(g=>g.length>=2);
  if(pair)selected=pair.slice(0,2);
 }else if(focus==='straight'){
  for(const length of (modifiers.fourStraight?[5,4]:[5])){
  for(const start of [6,1,2,3,4,5,7,8,9,10,11].filter(start=>start+length-1<=14)){
   const hand=Array.from({length},(_,i)=>{const pool=cards.filter(c=>c.rank===(start+i===1?14:start+i));return pool.find(c=>c.suit===['spades','hearts','clubs','diamonds','spades'][i])??pool[0];});
   if(hand.every((c):c is PlayingCard=>!!c)){selected=hand;break;}
  }if(selected.length)break;}
 }else{
  const suits=[...new Set(cards.map(c=>c.suit))].map(suit=>cards.filter(c=>c.suit===suit)).sort((a,b)=>b.length-a.length||a[0].suit.localeCompare(b[0].suit));
  const count=modifiers.fourFlush&&suits[0]?.length===4?4:5;
  if(suits[0]?.length>=count){const preferred=[2,5,8,10,13].map(rank=>suits[0].find(c=>c.rank===rank));selected=preferred.every((c):c is PlayingCard=>!!c)?preferred:suits[0].slice(0,count);}
 }
 if(selected.length&&selected.length<=r2HandLimit(s))rows.push({label:'路线条件手',ids:selected.map(c=>c.id)});
 return rows;
}
/** Exactly one conditional play per row. No hidden cards, rule RNG, future
 * growth, income or automatic skill actions are inspected or credited. */
export function purchaseValueWindow(before:R2RunState,after:R2RunState,focus?:BuildFocus){
 return purchaseValueHands(before,focus).flatMap(row=>{
  const sample=(s:R2RunState)=>{
   const hand=row.ids.map(id=>s.deckInstances.find(c=>c.id===id&&!s.destroyedIds.includes(id)));
   if(!hand.every((c):c is PlayingCard=>!!c)||hand.length>r2HandLimit(s))return;
   const projected={...s,stage:null},boss=s.stageIndex%3===2?s.boss:null;
   return previewR2Hand({rulesVersion:'r2',runId:s.runId,rootId:'purchase-value/conditional',hand,selectedIds:row.ids,
    disabledIds:boss?r2DisabledCards(boss,s.stageIndex,hand):[],jokers:s.jokers,definitions:r2JokerDefinitionsFor(s),handLevels:s.handLevels,
    playIndex:1,handsBeforePlay:r2HandsBudget(s),previousHandType:null,wager:false,...r2ScoreContext(projected,hand,row.ids),
    boss,sealedJokerIds:[],challengeDisabledJokerId:s.chapterDisabledJokerId}).scoreRange;
  };
  const keep=sample(before),change=sample(after);if(!keep||!change)return [];
  const minimum=(BigInt(change.minimum)-BigInt(keep.maximum)).toString(),maximum=(BigInt(change.maximum)-BigInt(keep.minimum)).toString();
  return [{...row,cards:row.ids.map(id=>{const c=before.deckInstances.find(c=>c.id===id)!;return rankLabel(c.rank)+SUIT_SYMBOL[c.suit];}).join(' '),keep,change,delta:{minimum,maximum}}];
 });
}
export function purchaseValueWindowText(rows:ReturnType<typeof purchaseValueWindow>){
 const range=(r:{minimum:string;maximum:string})=>r.minimum===r.maximum?r.minimum:r.minimum+'～'+r.maximum;
 return '一次条件对照（公开牌组样例，非下一手预测；假定下场首手、未弃牌、只打所列牌且不留牌；主动技能未用）：\n'+rows.map(r=>r.label+' '+r.cards+'：保留 '+range(r.keep)+' → 变更 '+range(r.change)+'；分差 '+range(r.delta)).join('\n')+'\n只计本手已有值；手后成长、未来抽牌、收入和存活次数未知。';
}
export function shopPurchaseValue(state:R2RunState,offer:R2Offer,focus?:BuildFocus,sold?:R2JokerInstance){
 if(!isR2CoreBuild(state)||!state.shop?.offers.some(o=>o.offerId===offer.offerId&&o.definitionId===offer.definitionId))return;
 const base={policy:PURCHASE_VALUE_POLICY,calibrated:calibrated.has(offer.definitionId)};
 if(!sold&&state.jokers.length>=r2JokerCapacity(state))return {...base,status:'needs-selection' as const,detail:'满槽有条件参考：先指定替换对象，再以保留不买重算；买后余额与净补强待核。'};
 let sale=state;
 if(sold){const result=transact(state,{type:'SellJoker',instanceId:sold.instanceId});if(!result.ok)return {...base,status:'blocked' as const,detail:'指定出售不可执行：'+result.code};sale=result.state;}
 const paid=r2PurchasePrice(sale,offer),result=transact(sale,{type:'BuyOffer',offerId:offer.offerId});
 if(!result.ok)return {...base,status:'blocked' as const,detail:`实付${paid}金；购买不可执行：${result.code}。保留不买。`};
 const after=result.state,fresh=after.jokers.find(j=>!sale.jokers.some(k=>k.instanceId===j.instanceId));
 const refund=sale.gold-state.gold,net=state.gold-after.gold;
 const interest=(s:R2RunState)=>Math.min(r2InterestCap(s),Math.floor(s.gold/5));
 const losses=[...shopPurchaseConditionLosses(state,offer,sold),...(sold?['失去来源：'+r2JokerDefinitionFor(state,sold.definitionId).name+'；'+r2JokerStateText(sold,r2JokerDefinitionFor(state,sold.definitionId))+'；版次 '+editionLabel(sold.edition),...shopSaleConsequences(state,sold)]:[])];
 const interestLoss=interest(after)<interest(state);
 const rows=base.calibrated?purchaseValueWindow(state,after,focus):[];
 const negative=rows.some(r=>BigInt(r.delta.maximum)<0n),positive=rows.some(r=>BigInt(r.delta.minimum)>0n),allPositive=rows.length>=2&&rows.every(r=>BigInt(r.delta.minimum)>0n);
 const initial=sold?r2CreateJoker(sold.definitionId,'value/initial',sold.paidPrice,sold.edition,state):undefined;
 const lostInvestment=!!sold&&(sold.edition!==undefined&&sold.edition!=='none'||Object.entries(sold.growth).some(([key,v])=>Rational.fromJSON(v).compare(Rational.fromJSON(initial!.growth[key]??{n:'0',d:'1'}))>0)||r2JokerDefinitionFor(state,sold.definitionId).hooks.some(h=>['onStageClear','onSellJoker','onBuyJoker'].includes(h.phase)))||!!sold&&shopSaleConsequences(state,sold).some(t=>t.includes('不满足'));
 const unmeasuredLoss=!!sold&&(r2JokerDefinitionFor(state,sold.definitionId).hooks.some(h=>h.phase==='onHeldCard')||!!r2JokerDefinitionFor(state,sold.definitionId).modifiers?.length);
 const cashLoss=shopPurchaseConditionLosses(state,offer,sold).length>0;
 const ceiling=negative?(positive?2:1):!positive||lostInvestment||unmeasuredLoss||cashLoss?2:interestLoss?3:allPositive&&offer.definitionId!=='f06'?4:3;
 const remaining=fresh?.definitionId==='f06'?Math.max(0,4-(fresh.counters?.handsScored??0)):undefined;
 const detail=`以保留不买为基线；实付${paid}金，已发生返金${refund}金，净支出${net}金；余额${state.gold}→${after.gold}金。\n当前利息档${interest(state)}→${interest(after)}，仅按过关时余额结算，不计未来收入。`+
  (fresh?'\n新实例：'+r2JokerStateText(fresh,r2JokerDefinitionFor(after,fresh.definitionId)):'')+
  (remaining!==undefined?`\n新牌余${remaining}次出牌；封禁也消耗，第4次后销毁；不预支全部次数的收益。`:'')+
  (losses.length?'\n'+losses.join('\n'):'')+(unmeasuredLoss?'\n所售牌的持牌／资源收益未纳入此无持牌分数样例，不能据此认定净补强。':'')+(rows.length?'\n'+purchaseValueWindowText(rows)+'\n推荐还需兼顾实付、已有来源和永久代价；条件增分不保证回本或通关。':'\n仅供当前条件适配参考；后续收益和整体回本未知。');
 return {...base,status:'assessed' as const,paid,refund,net,goldAfter:after.gold,rows,ceiling,negative,positive,allPositive,lostInvestment,unmeasuredLoss,cashLoss,interestLoss,remaining,detail};
}
