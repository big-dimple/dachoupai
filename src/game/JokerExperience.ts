import {growthOpportunity} from './GrowthOpportunity';
import type {R2RunState} from '../domain/r2Run';
import type {ScoreEvent,ScoreTrace} from '../domain/scoreR2';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {Rational} from '../domain/rational';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import {jokerMemory,jokerMemoryAbility,r2ConditionDescription,type JokerMemoryContext} from './JokerMemory';
import {r2ScoreOperationText} from './r2Help';
import {fractionText} from './scoreText';
import {jokerArtPreviewUrl} from './jokerArt';
import {R2_LONG_TERM_ITEMS,R2_TOOLS} from '../content/r2Tools';
import {R2_MODE_CATALOG} from '../content/r2Modes';
import {HAND_LABELS} from '../content/handLabels';
import type {ScoreBeat} from './scorePresentation';
import {toolInfo} from './r2ToolInfo';
export interface ExperienceCard {title:string;body:string;stat?:string;url?:string;action?:{label:string;run:()=>void}}
export type SelectionReadiness='ready'|'pending'|'unmet'|'limited';
/** Public condition facts only: no score projection, future hand, RNG or command. */
export function selectionExperience(state:R2RunState,joker:R2RunState['jokers'][number],ctx:JokerMemoryContext){
 const definition=r2JokerDefinitionFor(state,joker.definitionId),memory=jokerMemory(definition,joker,ctx),copy=jokerMemoryAbility(definition,joker,ctx);
 const growth=growthOpportunity(state,joker,ctx);
 const ready=memory.hooks.filter(h=>h.status==='条件满足'),pending=memory.hooks.filter(h=>h.status==='事件时检查');
 const preparations=r2JokerDefinitionFor(state,joker.definitionId).hooks.flatMap(h=>h.condition.kind==='hand-type-transition'&&ctx.facts?.type===h.condition.previous?[HAND_LABELS[h.condition.current]]:h.condition.kind==='hand-type-relation'&&ctx.facts&&h.condition.values.includes(ctx.facts.type)&&!ready.length?['接续牌型']:[]);
 const readiness:SelectionReadiness=ctx.scoringLimited?'limited':ready.length?'ready':preparations.length?'pending':memory.hooks.some(h=>h.status==='当前未满足')?'unmet':pending.length||memory.staticRules.length?'pending':'unmet';
 const label=ctx.scoringLimited?'计分停用':growth&&ctx.facts?growth.compactLabel:readiness==='limited'?'计分停用':readiness==='ready'?'所选满足':readiness==='pending'?(preparations.length?'准备下手':memory.staticRules.length?memory.status:'事件时检查'):ctx.facts?'所选未满足':'待选牌';
 return {readiness,label,title:memory.name+' · '+label,url:jokerArtPreviewUrl(joker.definitionId),body:(growth?growth.body+'\n\n':'')+(preparations.length&&!ready.length?'成功出牌后可为下一手'+preparations.join('／')+'准备，不保证下一手能组成。\n\n':'')+copy.condition+'\n'+copy.value+'\n\n当前：'+label+'\n已保存：'+memory.saved+'\n\n下一步：选择1–5张；满足公开条件仍须成功出牌与保存，随机和结算结果在事件时确认。'};
}
const greater=(a:ScoreEvent['value'],b:ScoreEvent['value'])=>Rational.fromJSON(a).compare(Rational.fromJSON(b))>0;
/** Used for accents only. Failed random checks, zero growth/caps and maintenance aren't benefit cues. */
export function hasActualBenefit(e:ScoreEvent):boolean {
 if(['retrigger-card','reward-consumable','reward-free-reroll','upgrade-hand','add-growth'].includes(e.operation))return BigInt(e.value.n)>0n;
 if(['add-coefficient','multiply-coefficient'].includes(e.operation))return !!e.growthBefore&&!!e.growthAfter&&greater(e.growthAfter,e.growthBefore);
 if(['add-gold','add-gold-per-held','add-gold-per-capital','refund-hand','rescue-hand'].includes(e.operation))return e.resourceBefore!==undefined&&e.resourceAfter!==undefined&&e.resourceAfter>e.resourceBefore;
 return greater(e.after.H,e.before.H)||greater(e.after.M,e.before.M);
}
export interface SavedBenefit {eventId:string;sourceInstanceId:string;definitionId:string;title:string;effect:string;condition:string;destination:string;next:string;toolId?:string;url?:string}
/** Ordered saved events; current balances never pretend to be the historic transaction. */
export function savedBenefit(state:R2RunState,trace:ScoreTrace,e:ScoreEvent):SavedBenefit|undefined {
 if(!hasActualBenefit(e)||e.phase==='base'||e.phase==='finalScore')return;
 const joker=e.sourceType==='joker'?r2JokerDefinitionFor(state,e.sourceDefinitionId):undefined;
 // Poker effects remain in the normal ledger. This surface teaches acquired sources.
 if(!joker&&e.sourceType!=='rule')return;
 let effect=r2ScoreOperationText(e,joker),destination='本次计分 · 已计入本手保存结果',next='下一步：按来源条件选牌；查看完整计分明细。',toolId:string|undefined;
 if(e.operation==='read-growth'||e.operation==='consume-growth'){effect='读取已有 '+fractionText(e.value)+(greater(e.after.H,e.before.H)?' 热度':' 倍率')+(e.operation==='consume-growth'?' · 蓄热已消耗':'');}
 if(['read-coefficient','rescue-multiplier'].includes(e.operation))effect='读取已有 ×'+fractionText(e.value)+' 倍率';
 if(['add-growth','add-coefficient','multiply-coefficient'].includes(e.operation)){
  const saved=trace.jokers.find(j=>j.instanceId===e.sourceInstanceId);
  const growthKey=joker?.hooks.flatMap(h=>h.operations).find(o=>o.kind==='add-growth');
  const cumulative=growthKey?.kind==='add-growth'?saved?.growth[growthKey.key]:undefined;
  destination='该来源成长记录'+(cumulative?' · 该手后已存 '+fractionText(cumulative):'')+' · 结算后新增，下手按条件读取';next='下一步：查看来源的已保存成长，再选满足条件的牌。';
  if(e.growthBefore&&e.growthAfter)effect='保存成长 '+fractionText(e.growthBefore)+' → '+fractionText(e.growthAfter);
 }
 if(e.operation==='retrigger-card'){
  const card=trace.cards.find(c=>c.id===e.targetCardId);effect=(card?rankLabel(card.rank)+SUIT_SYMBOL[card.suit]:'记录对象')+' 再计分 '+fractionText(e.value)+' 次';next='下一步：保留适配该来源的目标牌，查看逐项再次计分结果。';
 }
 if(['add-gold','add-gold-per-held','add-gold-per-capital'].includes(e.operation)){
  destination='金币余额 · 该笔 '+e.resourceBefore+' → '+e.resourceAfter;next='下一步：过关后前往商店，按余额继续构筑。';
 }
 if(['refund-hand','rescue-hand'].includes(e.operation)){
  destination='本场出牌机会 · '+e.resourceBefore+' → '+e.resourceAfter+'；出牌序号不回退';next='下一步：继续选牌出牌；本次机会已返还，无需领取。';
 }
 if(e.operation==='reward-consumable'){
  toolId=e.rewardDefinitionId;if(!toolId)return;
  effect=toolInfo(toolId).name+' ×'+(e.resourceAfter!-e.resourceBefore!);destination='工具包 · 该次库存 '+e.resourceBefore+' → '+e.resourceAfter;next='下一步：打开工具包，选择工具→目标牌→确认使用。';
 }else if(e.operation==='add-gold'&&e.rewardDefinitionId){effect=toolInfo(e.rewardDefinitionId).name+'未入包 · 包满改收+'+fractionText(e.value)+'金';}
 if(e.operation==='reward-free-reroll'){destination='下一商店免费刷新次数';next='下一步：前往商店查看货架，再决定是否免费刷新。';}
 const name=joker?.name??R2_LONG_TERM_ITEMS.find(i=>i.id===e.sourceDefinitionId)?.name??R2_TOOLS.find(i=>i.id===e.sourceDefinitionId)?.name??R2_MODE_CATALOG.programs.find(i=>i.id===e.sourceDefinitionId)?.name;
 if(!name)return;
 const cycle=joker?.hooks.flatMap(h=>h.operations).find(o=>o.kind==='reward-consumable-every-clears');
 const timing=e.phase==='afterHand'?'结算后':e.phase==='onStageClear'?'成功过关时':e.phase==='beforeFailure'?'失败前检查':'本手计分时';
 const condition=timing+' · '+(cycle?.kind==='reward-consumable-every-clears'&&e.rewardDefinitionId?'持有期间每'+cycle.every+'次实际过关的赠品事件':r2ConditionDescription(e.visibleCondition));
 return {eventId:e.eventId,sourceInstanceId:e.sourceInstanceId,definitionId:e.sourceDefinitionId,title:name,effect,condition,destination,next,toolId,url:joker?jokerArtPreviewUrl(joker.id):undefined};
}
/** Adjacent same-source rows merge for reading, preserving event order/identity and every real operation. */
export function savedExperienceCards(state:R2RunState,trace:ScoreTrace):ExperienceCard[]{
 const groups:SavedBenefit[][]=[];
 for(const event of trace.events){const fact=savedBenefit(state,trace,event);if(!fact)continue;
  const last=groups[groups.length-1],head=last?.[0];
  if(head&&head.sourceInstanceId===fact.sourceInstanceId&&head.condition===fact.condition&&head.destination===fact.destination&&head.next===fact.next)last.push(fact);else groups.push([fact]);
 }
 return groups.map(group=>{const first=group[0];return {title:first.title,url:first.url,body:group.map(f=>f.effect).join('\n')+'\n原因：'+first.condition+'\n去向：'+first.destination+'\n'+first.next};});
}

/** P1 fits a source accent into a short existing beat; repeated sources do not repeat a full pause. */
export function experienceBeat(event:ScoreEvent,previousSource:string|undefined,fallback:ScoreBeat):ScoreBeat {
 if(event.sourceType!=='joker'||!hasActualBenefit(event))return fallback;
 const repeat=previousSource===event.sourceInstanceId;
 return {...fallback,windup:repeat?30:80,flight:fallback.flight?repeat?80:140:0,impact:repeat?120:180,rest:repeat?60:120};
}
