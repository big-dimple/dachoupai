import {r2GrowthMinimums,type Condition,type HookPhase,type Operation,type R2JokerDefinition,type R2JokerInstance} from '../content/r2Schema';
import type {JokerMemoryContext,jokerMemory} from './JokerMemory';
import type {ScoreEvent} from '../domain/scoreR2';
import {HAND_LABELS} from '../content/handLabels';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import {fractionText} from './scoreText';
import {r2ScoreOperationText} from './r2Help';
import {R2_GROUP_HAND_TYPES} from '../domain/r2GroupHands';

export interface JokerPlainCopy {line:string;tile:string;status:string;essential:string;details:string;fallback:boolean}
type Memory=ReturnType<typeof jokerMemory>;
const names=(types:readonly (keyof typeof HAND_LABELS)[])=>types.length===R2_GROUP_HAND_TYPES.length&&types.every(t=>R2_GROUP_HAND_TYPES.includes(t))?'对子等同点组合':types.map(t=>HAND_LABELS[t]).join('/');
const allBeyondPair=(types:readonly (keyof typeof HAND_LABELS)[])=>types.length===Object.keys(HAND_LABELS).length-2&&Object.keys(HAND_LABELS).filter(t=>t!=='high-card'&&t!=='pair').every(t=>types.includes(t as keyof typeof HAND_LABELS));
const when=(c:Condition,phase:HookPhase):string|undefined=>{
 switch(c.kind){
  case'always':return phase==='jokerScore'?'每次出牌':phase==='onStageClear'?'成功过关':phase==='onBuyOffer'?'成功买牌':phase==='onSellJoker'?'成功卖牌':phase==='onReroll'?'成功换商店货':'出牌结算后';
  case'hand-type-in':return names(c.values);
  case'played-count':return '只出'+c.equals+'张';
  case'played-count-maximum':return '出1–'+c.maximum+'张';
  case'rank-in':return c.values.map(r=>rankLabel(r as 2)).join('/')+'计分';
  case'suit-in':return c.values.map(s=>SUIT_SYMBOL[s]).join('/')+'计分';
  case'paired-rank':return '同打≥'+c.minimum+'张同点牌';
  case'rank-groups':return '≥'+c.minimum+'组各≥'+c.groupSize+'张同点';
  case'held-count':return '实际留≥'+c.minimum+'张';
  case'held-rank-first':return (c.playedEquals!==undefined?'只出'+c.playedEquals+'张，':'')+'留'+c.values.map(r=>rankLabel(r as 2)).join('/')+'前'+c.limit+'张';
  case'held-scoring-rank-first':return '留牌与计分牌同点，前'+c.limit+'张';
  case'held-enhancement-first':return '留声纸前'+c.limit+'张';
  case'all-played-active':return '≥'+c.minimum+'张都计分';
  case'resource-minimum':return '出牌前≥'+c.minimum+'金';
  case'resource-maximum':return '出牌前≤'+c.maximum+'金';
  case'resource':return c.resource==='gold'?'出牌前'+c.equals+'金':c.resource==='discards-used'?c.equals===0?'本场未弃过牌':c.equals===1&&phase==='onDiscard'?'本场首次成功弃牌':'本场已弃'+c.equals+'次':c.resource==='hands-after'?phase==='onStageClear'?'剩'+c.equals+'次出牌过关':'出牌后剩'+c.equals+'次':'本场第'+c.equals+'次出牌';
  case'play-modulo':return c.remainder===0?'本场第'+c.divisor+'/'+c.divisor*2+'/'+c.divisor*3+'…次出牌':undefined;
  case'scoring-position':return (c.handTypes?(allBeyondPair(c.handTypes)?'除高牌/对子外':names(c.handTypes))+'的':'')+(c.position==='third-original'?'原计分第3张':c.position==='first'?'首张计分牌':'末张计分牌')+(c.playModulo?'，本场每第'+c.playModulo.divisor+'次出牌':'');
  case'discard-count':return '成功弃'+c.equals+'张';
  case'hand-type-unfinished':return names(c.values)+'结算后未过关';
  default:return undefined;
 }
};
const unit=(target:'heat'|'multiplier')=>target==='heat'?'热度':'倍率';
function gain(o:Operation,phase:HookPhase):string|undefined{
 switch(o.kind){
  case'add-heat':case'add-multiplier':case'multiply-multiplier':return (phase==='onCardScore'||phase==='onHeldCard'?'每张有效牌':'')+(o.kind==='add-heat'?'热度+':o.kind==='add-multiplier'?'倍率+':'倍率×')+fractionText(o.value);
  case'retrigger-card':return '对应有效计分牌再计'+o.count+'次';
  case'add-gold':case'add-gold-limited':return '获得'+o.amount+'金';
  case'refund-discard':return '返'+o.amount+'次弃牌';
  case'refund-hand-limited':return '返'+o.amount+'次出牌';
  case'chance-add-heat':return o.probability.n+'/'+o.probability.d+'机会热度+'+fractionText(o.value)+'（出牌时揭晓）';
  case'add-heat-per-gold':return '每1金热度+'+fractionText(o.value)+'（不花金币）';
  case'add-heat-per-empty-slot':return '每空槽热度+'+fractionText(o.value);
  default:return undefined;
 }
}
/** Schema families shorten existing verified player copy; unsupported combinations keep the complete copy. */
export function jokerPlainCopy(d:R2JokerDefinition,j:R2JokerInstance|undefined,ctx:JokerMemoryContext,m:Memory,main:string,limits:readonly string[],rules:string,state:string,events?:readonly ScoreEvent[]):JokerPlainCopy{
 let condition:string|undefined,effect:string|undefined,fallback=false;
 const growth={...r2GrowthMinimums(d),...j?.growth};
 const essential:string[]=limits.filter(s=>!s.includes('同一张牌的额外计分次数有总上限'));
 const hooks=d.hooks;
 if(hooks.length===1&&hooks[0].operations.length===1&&!d.modifiers?.length){
  const h=hooks[0];condition=when(h.condition,h.phase);effect=gain(h.operations[0],h.phase);
  if(h.phase==='onStageClear'&&condition&&condition!=='成功过关')condition+='并过关';
  if(h.phase==='onHeldCard'){essential.push('只算保留的有效牌；按手牌从左到右取。');if(h.condition.kind==='held-enhancement-first')essential.push('每张先加自身倍率，再单独相乘。');}
  const limited=h.operations[0];if(limited.kind==='add-gold-limited'||limited.kind==='refund-hand-limited')essential.push('每场最多'+limited.limit+'次；进场重置。');
  if(h.phase==='onCardScore')essential.push('只加给能计分的牌；附带/停用牌不获加成。');
  if(['onDiscard','afterHand'].includes(h.phase))essential.push(h.phase==='onDiscard'?'成功弃牌后才兑现。':'实际出牌结算后才兑现。');
 }else if(hooks.length===2&&hooks[0].operations.length===1&&hooks[0].operations[0].kind==='read-growth'&&hooks[1].operations.length===1&&hooks[1].operations[0].kind==='add-growth'&&!d.modifiers?.length){
  const read=hooks[0].operations[0],grow=hooks[1].operations[0],h=hooks[1];
  if(read.key===grow.key){condition=when(h.condition,h.phase);effect=unit(read.target)+'成长+'+fractionText(grow.value)+'；新增下次用';if(condition&&h.phase==='afterHand')condition+='出牌后';if(!limits.some(s=>/下次|下一|后续/.test(s)))essential.push('每次出牌用已保存的'+unit(read.target)+'；新增从后续出牌生效。');if(h.condition.kind==='hand-type-in'&&h.condition.values.length===R2_GROUP_HAND_TYPES.length&&h.condition.values.every(t=>R2_GROUP_HAND_TYPES.includes(t)))essential.push('普通顺子、普通同花不增长。');}
 }else if(!hooks.length&&d.modifiers?.length===1){
  const mod=d.modifiers[0];condition='持有这张牌';
  switch(mod.kind){
   case'four-straight':condition='普通顺子';effect='4张即可；同花顺仍5张';break;
   case'four-flush':condition='普通同花';effect='4张即可；同花顺仍5张';break;
   case'hand-limit':condition='进场时'+(mod.deckMaximum!==undefined?'牌组≤'+mod.deckMaximum+'张':'');effect='手牌上限+'+mod.amount;essential.push('进场计算；本场不会立即补牌。');break;
   case'consumable-capacity':effect='工具容量+'+mod.amount;break;
   case'first-purchase-discount':condition='本店第一次购买';effect='少付'+mod.amount+'金，最低'+mod.minimum+'金';break;
   case'interest-cap':effect='利息上限+'+mod.amount;break;
  }
 }
 if(!condition||!effect){fallback=true;condition=main;effect='';}
 const line=effect?condition+' → '+effect:main.replaceAll('整手倍率','出牌倍率').replaceAll('整手热度','出牌热度');
 let status=state;
 const selected=ctx.facts;const firstCondition=hooks[0]?.condition;
 const gap=()=>{
  if(!selected)return '选好牌后查条件';
  if(hooks[0]?.phase==='onCardScore'&&!selected.activeScoringIds.length)return '所选牌没有有效计分目标；停用牌不获加成';
  if(firstCondition?.kind==='held-rank-first'&&(firstCondition.playedEquals===undefined||selected.playedIds.length===firstCondition.playedEquals))return '需留下可生效的'+firstCondition.values.map(r=>rankLabel(r as 2)).join('/')+'；最多取前'+firstCondition.limit+'张';
  if(firstCondition?.kind==='held-scoring-rank-first')return '保留牌需与有效计分牌同点；停用牌不算';
  if(firstCondition?.kind==='held-enhancement-first')return '需留下可生效的留声纸';
  return '所选'+HAND_LABELS[selected.type]+'、'+selected.playedIds.length+'张；需'+condition;
 };

 if(!events){
  const c=hooks[0]?.condition;
  if(ctx.scoringLimited&&j)status='当前计分暂停；其他时点照各自条件。'+(m.remaining!==undefined?'还可用'+m.remaining+'手。':'');
  else if(m.remaining!==undefined)status='还可用'+m.remaining+'手（跨场共用）';
  else if(m.remainingUses!==undefined)status=(ctx.inStage?'本场':'下场')+'还可用'+m.remainingUses+'次；成功事件后兑现';
  else if(!fallback&&hooks[0]?.operations[0].kind==='read-growth'){const o=hooks[0].operations[0];status=j?'本次用已存'+unit(o.target)+'+'+fractionText(growth[o.key])+'；新增到对应时点检查':'未购买；新购保存'+unit(o.target)+'+'+fractionText(growth[o.key]);if(ctx.facts&&hooks[1]?.condition.kind==='hand-type-in')status+='；所选'+HAND_LABELS[ctx.facts.type]+(hooks[1].condition.values.includes(ctx.facts.type)?'可在结算后增长':'不增长');}
  else if(!fallback&&(c?.kind==='resource-minimum'||c?.kind==='resource-maximum'||c?.kind==='resource'&&c.resource==='gold')){
   const met=c.kind==='resource-minimum'?ctx.gold>=c.minimum:c.kind==='resource-maximum'?ctx.gold<=c.maximum:ctx.gold===c.equals;
   status='现在'+ctx.gold+'金 · '+(met?'金币条件目前够':'金币条件未满足')+(c.kind==='resource-minimum'&&!met?'，还差'+(c.minimum-ctx.gold)+'金':'')+(j?'；出牌前重查':'；未购，买后重查');
  }else if(!fallback&&ctx.facts&&(m.hooks[0]?.status==='当前未满足'||c?.kind==='hand-type-in'&&!c.values.includes(ctx.facts.type)))status=gap();
  else if(!fallback&&m.hooks[0]?.status==='条件满足')status='所选符合；成功出牌后才生效';
  else if(!fallback&&!j)status='未购买；'+(hooks.some(h=>['onDiscard','onStageClear','afterHand'].includes(h.phase))?'到对应时点才检查':'买入后才生效');
  else if(!fallback&&m.status==='待选牌')status='选好牌后查条件';
  else if(!fallback&&m.status==='静态仍有效')status='持有时有效';
  else if(!fallback&&hooks.length===1)status='到对应时点检查；尚未兑现';
 }
 if(events&&j){
  const own=events.filter(e=>e.sourceType==='joker'&&e.sourceInstanceId===j.instanceId&&e.sourceDefinitionId===d.id&&!e.reasonKey.startsWith('edition.'));
  if(own.length)status=own.map(e=>{
   const read=d.hooks.flatMap(h=>h.operations).find(o=>o.kind==='read-growth'||o.kind==='consume-growth');
   if(e.operation==='read-growth'&&read&&(read.kind==='read-growth'||read.kind==='consume-growth'))return '本次读取'+unit(read.target)+'+'+fractionText(e.value);
   if(e.operation==='retrigger-card'){const card=ctx.hand.find(c=>c.id===e.targetCardId);return (card?rankLabel(card.rank)+SUIT_SYMBOL[card.suit]:'记录对象')+'实际再计'+fractionText(e.value)+'次';}
   if(e.operation==='add-growth'&&BigInt(e.value.n)===0n)return '本次成长+0；没有新增';
   return r2ScoreOperationText(e,d)+(['add-growth','add-coefficient','multiply-coefficient'].includes(e.operation)?'（结算后新增，后续出牌用）':'');
  }).join('\n');
 }
 let tile=effect?condition+'\n'+effect:line;
 if(!fallback){
  const h=hooks[0],o=h?.operations[0];
  let tileCondition=condition,tileEffect=effect;
  if(h?.condition.kind==='paired-rank')tileCondition='同点≥'+h.condition.minimum+'张';
  if(o?.kind==='add-heat'||o?.kind==='add-multiplier'||o?.kind==='multiply-multiplier')tileEffect=(h.phase==='onCardScore'||h.phase==='onHeldCard'?'每张':'')+(o.kind==='add-heat'?'热度+':o.kind==='add-multiplier'?'倍率+':'倍率×')+fractionText(o.value);
  if(h?.condition.kind==='paired-rank')tileEffect='每张计分'+tileEffect?.replace(/^每张/,'');
  if(h?.condition.kind==='scoring-position')tileCondition=(h.condition.handTypes?names(h.condition.handTypes):'')+(h.condition.position==='third-original'?'原第3牌':h.condition.position==='first'?'首计分牌':'末计分牌')+(h.condition.playModulo?'第'+h.condition.playModulo.divisor+'手':'');
  if(o?.kind==='retrigger-card')tileEffect='再计'+o.count+'次';
  if(o?.kind==='read-growth'){const grow=hooks[1].operations[0];if(grow.kind==='add-growth'){tileCondition=hooks[1].condition.kind==='hand-type-in'&&hooks[1].condition.values.length===R2_GROUP_HAND_TYPES.length&&hooks[1].condition.values.every(t=>R2_GROUP_HAND_TYPES.includes(t))?'成组后成长':when(hooks[1].condition,hooks[1].phase)??condition;tileEffect=unit(o.target)+'+'+fractionText(grow.value)+'\n新增下次用';if(hooks[1].condition.kind==='hand-type-in'&&hooks[1].condition.values.length===3&&hooks[1].condition.values.every(t=>['pair','two-pair','three-kind'].includes(t))){tileCondition='特定牌型成长';fallback=true;}}}
  if(h?.condition.kind==='scoring-position'&&h.condition.position==='first'&&!h.condition.playModulo&&h.condition.handTypes&&allBeyondPair(h.condition.handTypes))tile='非高牌/对子\n首计分牌\n'+tileEffect?.replace(/^每张/,'');
  else if(o?.kind==='chance-add-heat')tile='每次出牌揭晓\n'+o.probability.n+'/'+o.probability.d+'机会\n热度+'+fractionText(o.value);
  else if(d.modifiers?.[0]?.kind==='first-purchase-discount'){const mod=d.modifiers[0];tile='本店首购-'+mod.amount+'金\n最低'+mod.minimum+'金';}
  else if(d.modifiers?.[0]?.kind==='four-straight')tile='顺子4张\n同花顺5张';
  else if(d.modifiers?.[0]?.kind==='four-flush')tile='同花4张\n同花顺5张';
  else tile=tileCondition+'\n'+tileEffect;
 }else{
  const read=hooks[0]?.operations[0],life=hooks.flatMap(h=>h.operations).find(o=>o.kind==='expire-after-hands');
  if(life?.kind==='expire-after-hands'&&read?.kind==='multiply-multiplier')tile='出牌倍率×'+fractionText(read.value)+'\n总共'+life.limit+'手';
  else if(read?.kind==='read-coefficient')tile='多步条件\n倍率×'+(j?fractionText(growth[read.key]):'保存值')+'\n点牌查重置';
  else if(read?.kind==='read-growth')tile='多步成长\n'+unit(read.target)+'+保存值\n点牌查增减';
  else tile='多步条件\n'+(read?.kind==='retrigger-card'?'再计'+read.count+'次':read?gain(read,hooks[0].phase)??'分时点生效':'分时点生效')+'\n点牌查条件';
 }

 return {line,tile,status,essential:[...new Set(essential)].join('\n'),details:[main,...limits,state,rules].filter(Boolean).join('\n'),fallback};
}
