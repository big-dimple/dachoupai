import type {R2RunState} from '../domain/r2Run';
import {r2ConsumableCapacity} from '../domain/r2Run';
import {r2PurchasePrice} from '../domain/r2Shop';
import {r2ToolAllowed} from '../domain/r2ToolRuntime';
import {R2_TOOLS} from '../content/r2Tools';
import {rankLabel,SUIT_SYMBOL,type Rank,type PlayingCard} from '../cards/types';
import {basicChoiceRows,basicChoiceSeat} from './BasicToolChoice';
import {cashDecision,type BuildFocus} from './BuildJourney';
import {shopPurchaseConditionLosses} from './ShopRouteRelations';
import {toolInfo} from './r2ToolInfo';

export interface RepairExample {targetId:string;summary:string;body:string}
export interface BuildFallback {headline?:string;reason:string;choice?:{source:'held'|'offer'|'basic';id:string;definitionId?:string;title:string;url?:string;body:string;label:string;example?:RepairExample}}
const cardName=(c:PlayingCard)=>rankLabel(c.rank)+SUIT_SYMBOL[c.suit];
/** One disclosed local recipe, not a ranking, probability, next-hand or score forecast. */
export function publicRepairExample(s:R2RunState,focus:BuildFocus,toolId:string):RepairExample|undefined {
 const tool=R2_TOOLS.find(t=>t.id===toolId);if(!tool||tool.costs.length||!tool.phases.includes('shop')||!r2ToolAllowed(s,toolId))return;
 const live=s.deckInstances.filter(c=>!s.destroyedIds.includes(c.id)).sort((a,b)=>a.rank-b.rank||a.id.localeCompare(b.id)),counts=new Map<number,number>();
 for(const c of live)counts.set(c.rank,(counts.get(c.rank)??0)+1);
 const op=tool.operation;
 for(const groupSize of focus==='group'?[2,1]:[0])for(const c of live){
  if(op.kind==='shift-rank'&&focus!=='flush'){
   const to=c.rank+op.delta;if(to<op.minimum||to>op.maximum)continue;const fromCount=counts.get(c.rank)!,toCount=counts.get(to)??0;
   const change=`${cardName(c)} → ${rankLabel(to as Rank)}${SUIT_SYMBOL[c.suit]}；公开牌组${rankLabel(c.rank)} ${fromCount}→${fromCount-1}张、${rankLabel(to as Rank)} ${toCount}→${toCount+1}张。`;
   if(focus==='group'&&toCount===groupSize&&(fromCount===1||fromCount>=4))return {targetId:c.id,summary:'可补一个'+(toCount===1?'同点对子':'同点三条'),body:change+'\n花色/增强/版次保留；这张原点数永久减少，不保证下手抽到同点组。'};
   if(focus==='straight'&&fromCount>=2&&toCount===0){
    const norm=(r:number)=>r===1?14:r;
    for(let start=1;start<=10;start++){
     const window=Array.from({length:5},(_,i)=>norm(start+i)),missing=window.filter(r=>!counts.has(r));
     if(missing.length===1&&missing[0]===to)return {targetId:c.id,summary:'可补这一段顺子缺点',body:window.map(r=>rankLabel(r as Rank)).join('、')+'中只缺'+rankLabel(to as Rank)+'。\n'+change+'\n保留原点数至少一张；只改牌组，不保证下手抽到这一段。'};
    }
   }
  }else if(op.kind==='set-suit'&&focus==='flush'&&c.suit!==op.suit){
   const before=live.filter(x=>x.suit===op.suit).length,from=live.filter(x=>x.suit===c.suit).length;
   if(before===4&&(from===1||from>=6))return {targetId:c.id,summary:'可补这一色的第五张',body:`${cardName(c)} → ${rankLabel(c.rank)}${SUIT_SYMBOL[op.suit]}；公开牌组${SUIT_SYMBOL[op.suit]} 4→5张、${SUIT_SYMBOL[c.suit]} ${from}→${from-1}张。\n点数/增强/版次保留；不保证下手抽齐这一色。`};
  }
 }
}
/** Used only when today's existing recommendation has no executable purchase candidate. */
export function buildFallback(s:R2RunState,focus:BuildFocus):BuildFallback|undefined {
 if(s.phase!=='shop'||!s.shop)return;
 const reason='当前大丑牌现货没有明确补强；留'+s.gold+'金入场也是完整选择。';
 const make=(source:'held'|'offer'|'basic',id:string,definitionId:string,price:number,example:RepairExample)=>{const info=toolInfo(definitionId,s),cash=cashDecision(s,price);return {headline:'改牌或留'+s.gold+'金，由你选',reason,choice:{source,id,definitionId,title:source==='held'?'已有'+info.name+' · 可先对照':example.summary+' · '+info.name,url:info.artUrl,example,body:example.body+'\n'+(source==='held'?'已有工具，不新增金币支出；使用会消耗这件工具。':`实付${price}金；余额${s.gold}→${cash.after}金，按当前本金的常规利息档${cash.beforeTier}→${cash.afterTier}。利息未到账，按关末实际余额重算。`),label:source==='held'?'查看已持工具与目标':'对照'+info.name+' · '+price+'金'}} satisfies BuildFallback;};
 for(const held of s.consumables){const example=publicRepairExample(s,focus,held.definitionId);if(example)return make('held',held.instanceId,held.definitionId,0,example);}
 const room=s.consumables.length<r2ConsumableCapacity(s),warnings:string[]=[];
 for(const offer of s.shop.toolOffers.filter(o=>!o.consumed)){
  const example=publicRepairExample(s,focus,offer.definitionId),price=r2PurchasePrice(s,offer);if(!example)continue;
  const losses=shopPurchaseConditionLosses(s,offer);if(losses.length){warnings.push(...losses);continue;}
  if(room&&price<=s.gold)return make('offer',offer.offerId,offer.definitionId,price,example);
 }
 const seat=basicChoiceSeat(s),rows=basicChoiceRows(s).filter(r=>!r.reason),losses=seat?shopPurchaseConditionLosses(s,seat):[];
 if(focus!=='flush'&&seat&&!seat.consumed&&!losses.length){
  for(const row of rows){const example=publicRepairExample(s,focus,row.id);if(example)return make('basic',row.id,row.id,row.price,example);}
  const row=rows.find(r=>r.id==='T08')??rows[0];
  if(row){const cash=cashDecision(s,row.price);return {reason:reason+'尚未核到一张改点可补齐的明确缺口，不默认建议买。',choice:{source:'basic',id:'',title:'基础改牌 · 本店自选1件',url:row.info.artUrl,body:`基础位实付${row.price}金；买后余${cash.after}金，按当前本金的常规利息档${cash.beforeTier}→${cash.afterTier}。\n可查看升点/降点/删牌/热度/倍率再决定；同名随机位以现货价为准。利息未到账，改牌不保证发牌或过关。`,label:'查看基础自选 · '+row.price+'金'}};}
 }
 let detail:string|undefined=losses[0]??warnings[0];
 if(!detail)detail=focus==='flush'?'未核到可补这一色第五张的已持/现货工具；基础自选不含染色。':!room?'道具箱已满，购买前须自己使用或销毁。':seat?.consumed?'本店基础选择已购，刷新不重开。':rows.length?'未核到单张修补缺口。':seat?basicChoiceRows(s).find(r=>r.id==='T08')?.reason:'当前身份没有基础自选位。';
 return {reason:reason+(detail?'\n'+detail:'')};
}
