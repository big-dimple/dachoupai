import {jokerPlainCopy} from './JokerPlainCopy';
import {R2_GROUP_HAND_TYPES,r2LargestScoringRankGroup} from '../domain/r2GroupHands';
import {R2_GROUP_UPGRADE_IDS,R2_GROUP_UPGRADE_JOKERS} from '../content/r2GroupUpgradeJokers';
import {JOKER_GROUP_UPGRADE_TEMPLATES} from './JokerGroupUpgradeTemplates';
import {R2_COMBO_GROWTH_JOKERS,R2_COMBO_GROWTH_IDS} from '../content/r2ComboGrowthJokers';
import {JOKER_COMBO_GROWTH_TEMPLATES} from './JokerComboGrowthTemplates';
import {JOKER_ASSIST_TEMPLATES} from './JokerAssistTemplates';
import {R2_ASSIST_JOKERS,R2_ASSIST_ADAPTED_IDS} from '../content/r2AssistJokers';
import templates from './JokerPlayerTemplates.json';
import type {CardAbilityCopy} from './CardCopy';
import type {JokerMemoryContext,jokerMemory} from './JokerMemory';
import {r2GrowthMinimums,type R2JokerDefinition,type R2JokerInstance} from '../content/r2Schema';
import {getR2Tool,R2_ENHANCEMENTS,R2_TOOL_CATALOG} from '../content/r2Tools';
import {R2_RESOURCE_CONTRACT} from '../domain/r2Resources';
import {SCORE_LIMITS,type ScoreEvent} from '../domain/scoreR2';
import {Rational} from '../domain/rational';
import {HAND_LABELS} from '../content/handLabels';
import {rankLabel,SUIT_SYMBOL,type PlayingCard} from '../cards/types';
import {fractionText} from './scoreText';
import {r2JokerValue} from './r2Help';

export type JokerPlayerTemplate={main:string;limits:string[];rules:string[];state:string[];bindings:Record<string,{source:string;format:string}>};
type Memory=ReturnType<typeof jokerMemory>;
const copyTemplates:Record<string,JokerPlayerTemplate>=templates;
const zero={n:'0',d:'1'};
/** Only reads explicit public definition paths. No conditions, score or random actions execute here. */
function definitionValue(source:string,definition:R2JokerDefinition):unknown {
 const path=source.replace(/ × 100$/,'');
 if(!/^definition(?:\.[A-Za-z][A-Za-z0-9]*|\[\d+\])+$/.test(path))return undefined;
 let value:unknown=definition;
 for(const key of path.slice('definition'.length).match(/[A-Za-z][A-Za-z0-9]*|\d+/g)??[]){if(!value||typeof value!=='object')return undefined;value=(value as Record<string,unknown>)[key];}
 return value;
}
function bindingValue(source:string,definition:R2JokerDefinition):unknown {
 if(source.startsWith('definition.'))return definitionValue(source,definition);
 const ops=definition.hooks.flatMap(h=>h.operations);
 switch(source){
  case'R2_RESOURCE_CONTRACT.handMaximum':return R2_RESOURCE_CONTRACT.handMaximum;
  case'SCORE_LIMITS.extraRetriggers':return SCORE_LIMITS.extraRetriggers;
  case'R2_TOOL_CATALOG.limits.consumableSlotsMaximum':return R2_TOOL_CATALOG.limits.consumableSlotsMaximum;
  // These cardinalities/positions/divisor are the existing public evaluator/run rules,
  // not effect values copied from a rendered draft or a second evaluator.
  case'five-card rule cardinality (existing evaluator literal)':return 5;
  case'four-card rule cardinality (existing evaluator literal)':return 4;
  case'interest divisor (existing run literal)':return 5;
  case'scoring-position third-original (existing authoritative condition)':return 3;
  case'R2_ENHANCEMENTS voice-paper onHeldCard add-multiplier value':{const effect=R2_ENHANCEMENTS.find(e=>e.id==='voice-paper')?.effects.find(e=>e.kind==='add-multiplier'&&e.phase==='onHeldCard');return effect&&'value'in effect?effect.value:undefined;}
  case'getR2Tool(operation.definitionId).name':{const op=ops.find(o=>o.kind==='reward-consumable-every-clears');return op?.kind==='reward-consumable-every-clears'?getR2Tool(op.definitionId).name:undefined;}
  case'getR2Tool(operation.definitionIds[*]).name':case'1 / operation.definitionIds.length':case'operation.definitionIds.length':{const op=ops.find(o=>o.kind==='reward-consumable-pool');if(op?.kind!=='reward-consumable-pool')return undefined;return source==='operation.definitionIds.length'?op.definitionIds.length:source==='1 / operation.definitionIds.length'?'1/'+op.definitionIds.length:op.definitionIds.map(id=>getR2Tool(id).name).join('、');}
 }
}
function formatted(value:unknown,format:string):string {
 if(value===undefined)return'见完整规则';
 if(format==='authoritative label list'&&Array.isArray(value))return value.map(v=>typeof v==='number'?rankLabel(v as PlayingCard['rank']):HAND_LABELS[v as keyof typeof HAND_LABELS]??SUIT_SYMBOL[v as PlayingCard['suit']]??String(v)).join('、');
 if(value&&typeof value==='object'&&'n'in value&&'d'in value){const fraction=value as {n:string;d:string};return format==='probability n/d'?fraction.n+'/'+fraction.d:format==='Rational percent'?fractionText(Rational.fromJSON(fraction).multiply(new Rational(100n)).toJSON()):fractionText(fraction);}
 return String(value);
}
const eventTiming:Record<string,string>={afterHand:'出牌结算后才更新',onDiscard:'成功弃牌后判断',onStageClear:'过关时判断',onBuyOffer:'购买成功后判断',onSellJoker:'出售成功后判断',onReroll:'付费换牌后判断',beforeFailure:'出牌机会用完时判断'};
/** Player copy consumes the existing public status, never recomputes eligibility. */
export function jokerPlayerCopy(definition:R2JokerDefinition,instance:R2JokerInstance|undefined,ctx:JokerMemoryContext,memory:Memory,events?:readonly ScoreEvent[]):CardAbilityCopy {
 const combo=R2_COMBO_GROWTH_IDS.includes(definition.id)&&R2_COMBO_GROWTH_JOKERS.includes(definition);
 const grouped=R2_GROUP_UPGRADE_IDS.includes(definition.id)&&R2_GROUP_UPGRADE_JOKERS.includes(definition);
 const template=grouped?JOKER_GROUP_UPGRADE_TEMPLATES[definition.id]:combo?JOKER_COMBO_GROWTH_TEMPLATES[definition.id]:R2_ASSIST_ADAPTED_IDS.includes(definition.id)&&R2_ASSIST_JOKERS.includes(definition)?JOKER_ASSIST_TEMPLATES[definition.id]:copyTemplates[definition.id];
 if(!template)return{condition:'查看这张牌的条件与效果。',value:'完整规则见下方。',state:instance?'按实际出牌与交易判断':'尚未购买，买入后才会生效',flavor:'',rules:definition.description,summary:'条件与效果 · 查看',compact:memory.short,narrow:memory.short,benefit:'条件与效果',playerCopy:true};
 const values:Record<string,string>={};for(const[key,binding]of Object.entries(template.bindings))values[key]=formatted(bindingValue(binding.source,definition),binding.format);
 const growth=instance?{...r2GrowthMinimums(definition),...instance.growth}:{};
 for(const key of ['heat','multiplier','pendingHeat','coefficient'])values['saved_'+key]=fractionText(growth[key]??zero);
 Object.assign(values,{remaining:String(memory.remaining??''),remainingUses:String(memory.remainingUses??''),usage_scope:ctx.inStage?'本场':'下场',entry_hand_limit_state:ctx.inStage&&ctx.entryHandLimit!==undefined?'本场入场时手牌上限：'+ctx.entryHandLimit:'下次进场时判断',previous_hand_type:ctx.previousHandTypeKnown===false?'未知（旧记录未保存）':ctx.previousHandType?HAND_LABELS[ctx.previousHandType]:'没有上一手',reward_progress:memory.savedShort,current_context_value:instance?r2JokerValue(instance,ctx,definition):''});
 const render=(text:string)=>text.replace(/\{([\w]+)\}/g,(_,key)=>values[key]??'见完整规则');
 const main=render(template.main).replaceAll('整手倍率','本次出牌的倍率'),limits=template.limits.map(render),rules=template.rules.map(render),state:string[]=[];
 const random=definition.hooks.some(h=>h.operations.some(o=>o.kind==='chance-add-heat'));
 if(!instance)state.push('尚未购买，买入后才会生效');
 else{
  if(memory.scoreLimited){state.push('当前计分加成暂停');limits.push('只暂停计分与版次效果，其他效果仍按各自规则。');}
  else if(random)state.push('出牌时揭晓，每手抽一次');
  else if(definition.hooks.some(h=>h.operations.some(o=>o.kind==='read-growth'||o.kind==='read-coefficient'))){const later=[...new Set(definition.hooks.filter(h=>!['onCardScore','onHeldCard','jokerScore'].includes(h.phase)).map(h=>eventTiming[h.phase]??'出牌结算后才更新'))];state.push('当前加成按保存值结算'+(later.length?'；'+later.join('；'):''));}
  else switch(memory.status){
   case'条件满足':state.push('这手符合条件，出牌后才会生效');break;
   case'部分条件满足':state.push('这手符合其中一路，出牌后才会生效');for(const [i,hook]of memory.hooks.entries()){const condition=definition.hooks[i].condition;if(hook.status==='条件满足'&&condition.kind==='hand-type-transition')state.push('上手'+HAND_LABELS[condition.previous]+' → 本手'+HAND_LABELS[condition.current]+'符合条件');}break;
   case'当前未满足':state.push(ctx.facts?'这手还不符合条件':'当前已知条件还不满足');break;
   case'待选牌':state.push('选好牌后判断');break;
   case'静态仍有效':state.push('持有期间规则有效');break;
   case'入场已锁定':state.push(values.entry_hand_limit_state);break;
   default:{const timings=[...new Set(definition.hooks.map(h=>eventTiming[h.phase]??'出牌结算时判断'))];state.push(timings.join('；'));}
  }
  for(const text of template.state){if(random)continue;const sentence=render(text);if(sentence&&!state.includes(sentence))state.push(sentence);}
  if(grouped&&definition.hooks.some(h=>h.condition.kind==='largest-scoring-rank-group')){
   if(ctx.facts&&R2_GROUP_HAND_TYPES.includes(ctx.facts.type)){
    const played=ctx.hand.filter(c=>ctx.facts!.playedIds.includes(c.id)),ids=r2LargestScoringRankGroup(played,ctx.facts.scoringIds),label=(targets:readonly string[])=>targets.map(id=>{const c=ctx.hand.find(c=>c.id===id)!;return rankLabel(c.rank)+SUIT_SYMBOL[c.suit];}).join('、')||'无';
    state.push('本次最大同点组：'+label(ids)+'；其中有效牌：'+label(ids.filter(id=>ctx.facts!.activeScoringIds.includes(id)))+'。正式出牌后才会再次计分。');
   }else state.push(ctx.facts?'本次牌型不属于上述同点数组合':'选好上述同点数组合后，显示本次最大组');
  }
  if(memory.usageResetsOnEntry)state.push('进场重置使用次数；'+memory.saved);
  if(combo)state.push(memory.saved);
  if(memory.savedShort==='已弃牌')state.push('本场已成功弃牌，返还次数也不能恢复加成');
 }
 const own=instance&&events?events.filter(e=>e.sourceType==='joker'&&e.sourceInstanceId===instance.instanceId&&e.sourceDefinitionId===definition.id):undefined;
 let bodyActive:boolean|undefined,editionActive:boolean|undefined;
 if(own){
  const body=own.filter(e=>!e.reasonKey.startsWith('edition.'));
  // Keep animation activity separate from the player-facing account of the recorded result.
  bodyActive=body.some(e=>!['chance-heat-check','seal-joker'].includes(e.operation));
  editionActive=own.some(e=>e.reasonKey.startsWith('edition.'));
  const chance=body.find(e=>e.operation==='chance-heat-check');
  const scoreGain=body.some(e=>Rational.fromJSON(e.after.H).compare(Rational.fromJSON(e.before.H))>0||Rational.fromJSON(e.after.M).compare(Rational.fromJSON(e.before.M))>0);
  state.length=0;
  const income=definition.hooks.some(h=>h.operations.some(o=>o.kind==='add-gold-per-held'||o.kind==='add-gold-per-capital'||o.kind==='add-gold'));
  state.push(chance?'本手'+(chance.value.n==='1'?'抽中':'没抽中'):scoreGain?'本手本体已有计分增益':bodyActive?'本手有本体结算记录':income?'本次没有本体收入记录':'本手没有本体计分加成记录');
  for(const e of body){
   if((e.operation==='read-growth'||e.operation==='consume-growth')&&BigInt(e.value.n)===0n)state.push('本次按+0结算，结算时尚无成长加成');
   if(e.operation==='read-coefficient'&&Rational.fromJSON(e.value).compare(new Rational(1n))===0)state.push('本次按×1结算，结算时尚无成长加成');
   if(e.operation==='multiply-coefficient'&&e.growthBefore&&e.growthAfter){const changed=Rational.fromJSON(e.growthAfter).compare(Rational.fromJSON(e.growthBefore))>0;state.push('出牌结算后系数×'+fractionText(e.value)+'：'+fractionText(e.growthBefore)+' → '+fractionText(e.growthAfter)+(changed?'，下次出牌生效':'，已达上限，本次未增加'));}
   if(e.operation==='consume-rescue')state.push('救火已消耗；不会因返次或重载恢复');
   if(grouped&&e.operation==='add-gold')state.push('实际同点组合过关收入 +'+fractionText(e.value)+'金');
   if(e.operation==='add-gold-per-held')state.push('实际留牌过关收入 +'+fractionText(e.value)+'金');
   if(e.operation==='add-gold-per-capital')state.push('奖励前本金 '+e.goldBeforeRewards+'金；实际额外收入 +'+fractionText(e.value)+'金');
   if(e.operation==='add-growth'||e.operation==='add-coefficient'){
    const amount=fractionText(e.value),timing=e.phase==='afterHand'?'出牌结算后':e.phase==='onStageClear'?'过关后':'本次';
    state.push(timing+'成长 +'+amount+(BigInt(e.value.n)===0n?'，本次未增加':'，新增从下一次出牌生效'));
    if(grouped){const op=definition.hooks.flatMap(h=>h.operations).find(o=>o.kind==='add-growth');if(op?.kind==='add-growth')state.push('结算后保存'+(op.key==='heat'?'热度':'倍率')+'成长：+'+fractionText(Rational.fromJSON(instance!.growth[op.key]??zero).add(Rational.fromJSON(e.value)).toJSON()));}
   }
   if(e.operation==='retrigger-card'&&BigInt(e.value.n)===0n)state.push('再次计分次数已达上限，本牌本次未增加次数');
  }
  if(grouped&&definition.hooks.some(h=>h.condition.kind==='largest-scoring-rank-group')){
   const requests=body.filter(e=>e.operation==='retrigger-card');
   if(requests.length)state.push('本次再次计分来源：'+definition.name+' → '+requests.map(e=>{const c=ctx.hand.find(c=>c.id===e.targetCardId);return(c?rankLabel(c.rank)+SUIT_SYMBOL[c.suit]:'已记录牌')+' ×'+fractionText(e.value);}).join('、'));
  }
  if(editionActive)state.push('本手版次效果单独结算，不计入本体增益');
  const growthRead=body.find(e=>e.operation==='read-growth'||e.operation==='consume-growth'),coefficientRead=body.find(e=>e.operation==='read-coefficient');
  for(const text of template.state){
   if(random)continue;
   const sentence=render(text);
   if(text.startsWith('当前保存：')){
    state.push(growthRead?'本次读取成长：+'+fractionText(growthRead.value):sentence.replace('当前保存：','结算前保存成长：'));
    if(!growthRead)state.push('本次未读取成长加成');
   }else if(text.startsWith('当前系数：')){
    state.push(coefficientRead?'本次读取系数：×'+fractionText(coefficientRead.value):sentence.replace('当前系数：','结算前保存系数：'));
    if(!coefficientRead)state.push('本次未读取系数加成');
   }else state.push(sentence);
  }
  if(memory.scoreLimited)state.push('当前计分加成暂停');
 }
 if(definition.hooks.some(h=>h.operations.some(o=>o.kind==='add-heat'||o.kind==='add-multiplier'||o.kind==='multiply-multiplier'||o.kind==='read-growth'||o.kind==='read-coefficient'))){rules.push('热度是计分的底数；倍率 + 表示增加，倍率 × 表示相乘。各效果按实际顺序结算，最后才算总分。');}
 return{plain:jokerPlainCopy(definition,instance,ctx,memory,main,limits,rules.join('\n'),state.join('\n'),events),condition:main,value:limits.join('\n'),state:state.join('\n'),rules:rules.join('\n'),flavor:'',summary:main,compact:memory.short,narrow:memory.short,benefit:'条件与效果',bodyActive,editionActive,playerCopy:true};
}
