import {Rational}from'../domain/rational';
import type {R2RunState}from'../domain/r2Run';
import type {PlayingCard} from '../cards/types';import{rankLabel,SUIT_SYMBOL}from'../cards/types';
import {r2GrowthMinimums,type Condition,type Operation,type HookPhase,type R2JokerDefinition,type R2JokerInstance,type R2JokerModifier}from'../content/r2Schema';
import {JOKER_COMPACT}from'./JokerCompact';
import type {R2SelectionFacts}from'../domain/r2SelectionFacts';
import{r2ScoreConditionMatches,r2TransactionConditionMatches,type R2ScoreConditionContext,type R2TransactionConditionContext}from'../domain/r2Conditions';
import{HAND_LABELS}from'../content/handLabels';import{fractionText}from'./scoreText';import{R2_OFFER_USE,r2JokerStateText}from'./r2Help';import type{CardAbilityCopy}from'./CardCopy';
const phaseLabels:Record<HookPhase,string>={onCardScore:'计分牌逐张时',onHeldCard:'保留牌逐张时',jokerScore:'整手大丑牌时',afterHand:'实际结算后',onDiscard:'成功弃牌后',onStageClear:'实际过关时',onBuyOffer:'成功购买后',onSellJoker:'成功出售后',onReroll:'成功刷新后',beforeFailure:'失败前检查时'};
export type MemoryStatus='待选牌'|'条件满足'|'当前未满足'|'事件时检查'|'计分受限';
export interface JokerMemoryContext {
 inStage:boolean;hand:readonly PlayingCard[];facts?:R2SelectionFacts;disabledIds:readonly string[];
 scoringLimited:boolean;gold:number;handsLeft:number;playIndex:number;discardsUsed:number;quadRefundUsed:boolean;
 previousHandType:R2ScoreConditionContext['previousHandType'];stageHeat:string;target:string;
 transaction:R2TransactionConditionContext;deckSize:number;entryHandLimit?:number;jokerSlots:number;jokerCount:number;
}
const typeNames=(values:readonly (keyof typeof HAND_LABELS)[])=>values.map(t=>HAND_LABELS[t]).join('／');
const modulo=(divisor:number,remainder:number)=>remainder===0?'本场第'+divisor+'、'+divisor*2+'、'+divisor*3+'…次成功出牌':'本场成功出牌序号除以'+divisor+'余'+remainder;
/** Conditions are described by schema kinds, never a five-card ID eligibility table. */
export function r2ConditionDescription(c:Condition):string {
 switch(c.kind){
  case'always':return'每到这个时点检查；满足条件不等于效果已经发生';
  case'hand-type-in':return'实际牌型是'+typeNames(c.values)+'（精确牌型，不自动包含其他型）';
  case'rank-in':return'对象点数为'+c.values.map(r=>r>=2&&r<=14?rankLabel(r as PlayingCard['rank']):String(r)).join('／');
  case'played-count':return'打出恰好'+c.equals+'张，包括附带和停用牌';
  case'played-count-maximum':return'合法选择1–'+c.maximum+'张';
  case'held-count':return'打出前保留至少'+c.minimum+'张，包括停用牌；过关时按上手实际记录';
  case'play-modulo':return modulo(c.divisor,c.remainder)+'；弃牌不推进，返次不回退';
  case'suit-in':return'对象花色为'+c.values.map(s=>SUIT_SYMBOL[s]).join('／');
  case'paired-rank':return'同打的同点数牌至少'+c.minimum+'张，附带和停用也参与计数';
  case'rank-groups':return'打出至少'+c.minimum+'组不同点数、各至少'+c.groupSize+'张同点的牌';
  case'held-rank-first':return(c.playedEquals===undefined?'':'打出恰好'+c.playedEquals+'张；')+'保留且可生效的'+c.values.map(r=>r>=2&&r<=14?rankLabel(r as PlayingCard['rank']):String(r)).join('／')+'，过滤后按手牌顺序前'+c.limit+'张';
  case'held-scoring-rank-first':return'保留牌与有效计分牌同点，过滤停用后按手牌顺序前'+c.limit+'张';
  case'held-enhancement-first':return'保留的可生效留声纸，过滤后按手牌顺序前'+c.limit+'张';
  case'hand-type-transition':return'上手普通'+HAND_LABELS[c.previous]+' → 本手普通'+HAND_LABELS[c.current]+'；同花顺不代替';
  case'extra-retrigger':return'实际额外重触发发生后检查；请求不保证执行';
  case'stage-score-below-target':return'已入账累计热度严格低于目标的'+fractionText(Rational.fromJSON(c.ratio).multiply(new Rational(100n)).toJSON())+'%（等于不满足）';
  case'hand-score-below-target':return'实际本手比分低于目标的'+fractionText(Rational.fromJSON(c.ratio).multiply(new Rational(100n)).toJSON())+'%，且累计仍未过关；结算时检查';
  case'resource':return({'gold':'本手开始金币','hands-after':'本手扣一次出牌后机会','play-index':'成功出牌序号','discards-used':'本场成功弃牌次数'})[c.resource]+'为'+c.equals+'；计分与事件时点分别读取';
  case'resource-minimum':return'本手开始金币至少'+c.minimum+'；本手新收入不改变资格';
  case'resource-maximum':return'本手开始金币至多'+c.maximum+'；本手新收入不改变资格';
  case'all-played-active':return'至少'+c.minimum+'张，全部打出牌均是有效计分牌';
  case'scoring-position':return(c.position==='third-original'?'原成型牌的第3张，停用不补位':c.position==='first'?'首张有效计分牌':'末张有效计分牌')+(c.handTypes?'；仅'+typeNames(c.handTypes):'')+(c.playModulo?'；'+modulo(c.playModulo.divisor,c.playModulo.remainder):'');
  case'discard-count':return'一次成功弃'+c.equals+'张；出牌选择不判断此条件';
  case'discard-same-suit':return'一次成功弃至少'+c.minimum+'张且全同花色；出牌选择不判断';
  case'stage-played-maximum':return'本场至少成功出过一手，且所有成功出牌都不超过'+c.maximum+'张';
  case'stage-hand-types-all':return'本场已成功打出'+typeNames(c.values)+'全部普通型；当前未提交与同花顺不算';
  case'no-joker-sale-this-stage':return'本场及进场前准备商店没有售过大丑牌；买回不恢复';
  case'hand-type-unfinished':return'实际结算'+typeNames(c.values)+'且尚未过关，结果时检查';
  case'exhausted-hands':return'实际耗尽出牌且尚有可用手牌时，失败前检查';
 }
}
function operationDescription(op:Operation,ctx:JokerMemoryContext):string {
 switch(op.kind){
  case'add-heat':return'单项热度 +'+fractionText(op.value);
  case'add-multiplier':return'单项倍率 +'+fractionText(op.value);
  case'multiply-multiplier':return'单项倍率 ×'+fractionText(op.value);
  case'read-growth':case'consume-growth':return(op.kind==='consume-growth'?'读取后消耗':'读取')+'已保存成长，作用于'+(op.target==='heat'?'热度':'倍率');
  case'add-growth':return'单次成长 +'+fractionText(op.value)+'，封顶'+fractionText(op.cap);
  case'read-coefficient':return'读取当前保存的倍率系数';
  case'add-coefficient':return'单次系数成长 +'+fractionText(op.value)+'，封顶'+fractionText(op.cap);
  case'reset-coefficient':return'按实际事件重置系数为'+fractionText(op.initial);
  case'update-score-growth':return'按实际本手比分记录成长，封顶'+fractionText(op.cap)+'；选牌时不预测';
  case'expire-after-hands':return'累计'+op.limit+'手后离场，正式结算后更新余手';
  case'chance-add-heat':return'公共概率'+op.probability.n+'/'+op.probability.d+'，命中单项热度 +'+fractionText(op.value)+'；正式执行才检查随机';
  case'retrigger-card':return'请求额外触发'+op.count+'次；实际执行受每牌上限与深度限制';
  case'add-heat-per-gold':return'每1金币热度 +'+fractionText(op.value)+'，封顶'+fractionText(op.cap)+'；当前'+ctx.gold+'金币';
  case'add-heat-per-empty-slot':return'每1空槽热度 +'+fractionText(op.value)+'，封顶'+fractionText(op.cap)+'；当前'+Math.max(0,ctx.jokerSlots-ctx.jokerCount)+'空槽';
  case'add-gold':return'实际事件金币 +'+op.amount;
  case'add-gold-limited':return'每次事件金币 +'+op.amount+'，最多'+op.limit+'次';
  case'refund-discard':return'实际事件返'+op.amount+'次弃牌机会，不抹除弃牌历史';
  case'refund-hand-limited':return'实际事件返'+op.amount+'次出牌，本场最多'+op.limit+'次，不回退序号';
  case'reward-consumable-pool':return'实际过关后按奖励池处理赠品；满槽改为'+op.fallbackGold+'金币';
  case'reward-consumable-every-clears':return'每'+op.every+'次实际过关赠'+op.definitionId+'；满槽改为'+op.fallbackGold+'金币';
  case'rescue-hand':return'合法失败前事件补'+op.amount+'次出牌；本局限一次';
 }
}
function modifierDescription(m:R2JokerModifier,ctx:JokerMemoryContext):string {
 switch(m.kind){
  case'four-straight':return'4张普通顺子；同花顺仍5张';
  case'four-flush':return'4张普通同花；同花顺仍5张';
  case'hand-limit':return'入场手牌上限 +'+m.amount+(m.deckMaximum!==undefined?'，入场牌组≤'+m.deckMaximum+'张才生效；当前牌组'+ctx.deckSize+'张':'')+(ctx.inStage?'；本场入场已锁定上限'+ctx.entryHandLimit:'，入场时锁定');
  case'consumable-capacity':return'持有时物品容量 +'+m.amount;
  case'first-purchase-discount':return'首购优惠'+m.amount+'金币，最低'+m.minimum+'金币';
  case'interest-cap':return'持有时利息上限 +'+m.amount;
 }
}
const resultOnly=new Set<Condition['kind']>(['extra-retrigger','hand-score-below-target','hand-type-unfinished','exhausted-hands']);
function hookStatus(phase:HookPhase,c:Condition,operations:readonly Operation[],ctx:JokerMemoryContext):MemoryStatus {
 if(!['onCardScore','onHeldCard','jokerScore'].includes(phase)||resultOnly.has(c.kind))return'事件时检查';
 if(ctx.scoringLimited)return'计分受限';
 if(operations.some(op=>op.kind==='chance-add-heat'))return'事件时检查';
 const facts=ctx.facts;if(!ctx.inStage)return'待选牌';
 if(!facts){
  if(['resource','resource-minimum','resource-maximum','play-modulo','stage-score-below-target'].includes(c.kind)){const publicOnly:R2ScoreConditionContext={played:[],held:ctx.hand,validHeld:[],active:[],scoringIds:[],handType:'high-card',previousHandType:ctx.previousHandType,gold:ctx.gold,handsAfter:ctx.handsLeft-1,playIndex:ctx.playIndex+1,discardsUsed:ctx.discardsUsed,extraExecutions:0,resolvedFinal:null,stageHeatBefore:ctx.stageHeat,stageTargetHeat:ctx.target};if(!r2ScoreConditionMatches(c,publicOnly))return'当前未满足';}
  return'待选牌';
 }
 const played=ctx.hand.filter(card=>facts.playedIds.includes(card.id)),held=ctx.hand.filter(card=>facts.heldIds.includes(card.id)),active=played.filter(card=>facts.activeScoringIds.includes(card.id)),validHeld=held.filter(card=>!ctx.disabledIds.includes(card.id));
 const score:R2ScoreConditionContext={played,held,active,validHeld,scoringIds:facts.scoringIds,handType:facts.type,previousHandType:ctx.previousHandType,playIndex:ctx.playIndex+1,handsAfter:ctx.handsLeft-1,gold:ctx.gold,discardsUsed:ctx.discardsUsed,extraExecutions:0,resolvedFinal:null,stageHeatBefore:ctx.stageHeat,stageTargetHeat:ctx.target};
 const matches=(card?:PlayingCard)=>r2ScoreConditionMatches(c,score,card);
 return(phase==='onCardScore'?active.some(matches):phase==='onHeldCard'?validHeld.some(matches):matches())?'条件满足':'当前未满足';
}
export function jokerMemory(definition:R2JokerDefinition,instance:R2JokerInstance|undefined,ctx:JokerMemoryContext){
 const hooks=definition.hooks.map(h=>({phase:h.phase,timing:phaseLabels[h.phase],condition:r2ConditionDescription(h.condition),mechanism:h.operations.map(op=>operationDescription(op,ctx)).join('；'),status:hookStatus(h.phase,h.condition,h.operations,ctx),history:ctx.inStage&&['stage-played-maximum','stage-hand-types-all','no-joker-sale-this-stage'].includes(h.condition.kind)?r2TransactionConditionMatches(h.condition,ctx.transaction)?'已提交资格保持；未宣称奖励触发':'已提交资格尚未满足或已破坏':''}));
 const staticRules=(definition.modifiers??[]).map(m=>modifierDescription(m,ctx)),life=definition.hooks.flatMap(h=>h.operations.filter(op=>op.kind==='expire-after-hands'))[0];
 // Missing additive storage is a real zero, never a claim about its history.
 const savedGrowth=instance?{...r2GrowthMinimums(definition),...instance.growth}:{};
 let saved=instance?r2JokerStateText({...instance,growth:savedGrowth}):'尚未购入；不代表已触发';
 const remaining=instance&&life?.kind==='expire-after-hands'?Math.max(0,life.limit-(instance.counters?.handsScored??0)):undefined;
 const scoreHooks=hooks.filter(h=>['onCardScore','onHeldCard','jokerScore'].includes(h.phase)),satisfied=scoreHooks.filter(h=>h.status==='条件满足');
 const currentStatus:MemoryStatus|'部分条件满足'=satisfied.length?satisfied.length===scoreHooks.length?'条件满足':'部分条件满足':scoreHooks.some(h=>h.status==='待选牌')?'待选牌':scoreHooks.some(h=>h.status==='当前未满足')?'当前未满足':'事件时检查';
 const status:MemoryStatus|'部分条件满足'|'静态仍有效'|'入场已锁定'=ctx.scoringLimited?'计分受限':definition.modifiers?.some(m=>m.kind==='hand-limit')?ctx.inStage?'入场已锁定':'事件时检查':staticRules.length?'静态仍有效':currentStatus;
 const statusDetail=satisfied.length?'当前满足'+satisfied.length+'条：'+satisfied.map(h=>h.timing+' · '+h.condition).join('；'):'';
 const limited=definition.hooks.flatMap(h=>h.operations).find(op=>op.kind==='add-gold-limited'||op.kind==='refund-hand-limited');
 const firstDiscard=definition.hooks.some(h=>h.phase==='onDiscard'&&h.condition.kind==='resource'&&h.condition.resource==='discards-used'&&h.condition.equals===1&&h.operations.some(op=>op.kind==='refund-discard'));
 // EnterStage resets the supported per-stage discard-income counter; the shop
 // still holds last stage's saved value and must not call it next stage's budget.
 const usageResetsOnEntry=!ctx.inStage&&limited?.kind==='add-gold-limited';
 if(usageResetsOnEntry)saved=instance?.counters?.singleDiscards===undefined?'尚无保存的使用计数':'已保存使用记录 '+instance.counters.singleDiscards+' / '+limited.limit+' 次';
 const remainingUses=!instance?undefined:limited?.kind==='add-gold-limited'?ctx.inStage?Math.max(0,limited.limit-(instance.counters?.singleDiscards??0)):limited.limit:limited?.kind==='refund-hand-limited'?ctx.inStage&&ctx.quadRefundUsed?0:limited.limit:firstDiscard?ctx.inStage&&ctx.discardsUsed>0?0:1:undefined;
 const stored=Object.entries(savedGrowth).filter(([key,value])=>key==='coefficient'||BigInt(value.n)!==0n);
 // Compact saved numbers remain exact; oversized values lead to the state entry.
 const exact=(value:{n:string;d:string})=>{const r=Rational.fromJSON(value);return r.d===1n?r.n.toString():r.n+'/'+r.d;};
 const valueLabel=stored.map(([key,value])=>(key==='coefficient'?'系数×':key==='pendingHeat'?'蓄热':key==='multiplier'?'倍+':'热+')+exact(value)).join('／');
 const stateCandidates=remaining!==undefined?['余'+remaining+'手']:remainingUses!==undefined?['余'+remainingUses+'次']:
  definition.id==='f09'&&ctx.inStage&&ctx.discardsUsed>0?['已弃牌']:
  instance&&definition.hooks.some(h=>h.operations.some(op=>op.kind==='reward-consumable-every-clears'))?[instance.counters?.stageClears===1?'下关赠票':'再2关赠票']:
  valueLabel?[valueLabel,...(stored.length===1&&stored[0][0]==='coefficient'?['×'+exact(stored[0][1])]:[])]:[];
 const labelCandidates=stateCandidates.length?stateCandidates:JOKER_COMPACT[definition.id]??[R2_OFFER_USE[definition.id]??'条件 ›'];
 const short=labelCandidates[0],savedShort=stateCandidates[0]??'';
 return{instanceId:instance?.instanceId,definitionId:definition.id,name:definition.name,short,labelCandidates,stateLabel:stateCandidates.length>0,status,statusDetail,saved,savedShort,remaining,remainingUses,usageResetsOnEntry,staticRules,hooks,scoreLimited:ctx.scoringLimited};
}
export function jokerMemoryAbility(definition:R2JokerDefinition,instance:R2JokerInstance|undefined,ctx:JokerMemoryContext):CardAbilityCopy {
 const memory=jokerMemory(definition,instance,ctx),condition=[...memory.staticRules,...memory.hooks.map(h=>h.timing+'：'+h.condition)].join('\n')||definition.description;
 return{condition,value:memory.hooks.map(h=>h.mechanism).join('\n')||'持有静态规则；不计算整手收益',state:memory.status+(memory.statusDetail?'；'+memory.statusDetail:'')+'；'+memory.saved+(memory.remaining!==undefined?'；余'+memory.remaining+'手':'')+(memory.remainingUses!==undefined?'；'+(ctx.inStage?'本场':'下场')+'余'+memory.remainingUses+'次'+(ctx.inStage&&memory.remainingUses===0?'，本场已用':''):'')+(memory.usageResetsOnEntry?'；入场重置使用计数':'')+(definition.id==='f09'&&ctx.inStage&&ctx.discardsUsed>0?'；本场已成功弃牌，返次不清除历史':'')+(memory.scoreLimited?'；仅计分与版次停用，静态／资源／经济与结算后效果按条件保留':''),flavor:'',rules:definition.description+'\n'+memory.hooks.map(h=>h.timing+' · '+h.status+(h.history?' · '+h.history:'')).join('\n'),summary:condition,compact:memory.short,narrow:memory.short,benefit:'条件与单项机制',bodyActive:undefined,editionActive:undefined};
}

/** Public snapshot adapter. Never reads future drawPile, RNG, journal or score preview. */
export function publicJokerMemoryContext(state:Pick<R2RunState,'phase'|'gold'|'stage'|'lastTrace'|'shop'>,extras:{hand:readonly PlayingCard[];facts?:R2SelectionFacts;scoringLimited:boolean;deckSize:number;jokerSlots:number;jokerCount:number}):JokerMemoryContext {
 const stage=state.stage,inStage=state.phase==='await-input';
 return{...extras,inStage,gold:state.gold,handsLeft:stage?.handsLeft??0,playIndex:stage?.playIndex??0,discardsUsed:stage?.discardsUsed??0,quadRefundUsed:stage?.quadRefundUsed??false,previousHandType:stage?.previousHandType??null,stageHeat:stage?.heat??'0',target:stage?.targetHeat??'1',disabledIds:stage?.disabledIds??[],entryHandLimit:inStage?stage?.initialHandLimit:undefined,
 transaction:{gold:state.gold,handsAfter:stage?.handsLeft,playIndex:stage?.playIndex,discardsUsed:stage?.discardsUsed,handType:stage?.previousHandType??null,heldCount:state.lastTrace?.sets.heldIds.length,discarded:[],hasStage:inStage,maxPlayedCount:stage?.maxPlayedCount??0,ordinaryStraightSeen:stage?.ordinaryStraightSeen??false,ordinaryFlushSeen:stage?.ordinaryFlushSeen??false,jokerSold:inStage?stage?.jokerSold??false:state.shop?.soldJoker??false,traceType:state.lastTrace?.handType??null,heat:stage?.heat??'0',target:stage?.targetHeat??'1'}};
}
