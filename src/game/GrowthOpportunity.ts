import type {R2RunState} from '../domain/r2Run';
import {r2GrowthMinimums,type R2JokerInstance,type R2JokerDefinition,type Operation} from '../content/r2Schema';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {r2ScoreConditionMatches,r2TransactionConditionMatches,type R2ScoreConditionContext} from '../domain/r2Conditions';
import {Rational} from '../domain/rational';
import {HAND_LABELS} from '../content/handLabels';
import {r2ConditionDescription,type JokerMemoryContext} from './JokerMemory';
import {fractionText} from './scoreText';
/** Shared saved growth and cap headroom; no conditions, scores or random actions. */
export function growthBounds(definition:R2JokerDefinition,joker:R2JokerInstance|undefined,op:Extract<Operation,{kind:'add-growth'}>){
 const stored=Rational.fromJSON(joker?.growth[op.key]??r2GrowthMinimums(definition)[op.key]??{n:'0',d:'1'}),cap=Rational.fromJSON(op.cap),remaining=cap.add(stored.multiply(new Rational(-1n))),value=Rational.fromJSON(op.value),zero=new Rational(0n);
 const delta=remaining.compare(zero)<=0?zero:remaining.compare(value)<0?remaining:value;
 return {stored:stored.toJSON(),cap:cap.toJSON(),delta:delta.toJSON(),capped:remaining.compare(zero)<=0};
}
/** Growth across action phases. Public conditions, no scoring preview or future deal. */
export function growthOpportunity(state:R2RunState,joker:R2JokerInstance,ctx:JokerMemoryContext){
 return growthOpportunityForDefinition(r2JokerDefinitionFor(state,joker.definitionId),joker,ctx);
}
export function growthOpportunityForDefinition(d:R2JokerDefinition,joker:R2JokerInstance,ctx:JokerMemoryContext){
 const hook=d.hooks.find(h=>h.operations.some(isGrowthWrite));
 const op=hook?.operations.find(isGrowthWrite);if(!hook||!op)return;
 const stored=Rational.fromJSON(joker.growth[op.key]??r2GrowthMinimums(d)[op.key]??{n:'0',d:'1'}),cap=Rational.fromJSON(op.cap),zero=new Rational(0n);
 const raw=op.kind==='multiply-coefficient-once'?stored.multiply(Rational.fromJSON(op.value)):stored.add(Rational.fromJSON(op.value));
 const next=raw.compare(cap)>0?cap:raw,delta=next.add(stored.multiply(new Rational(-1n)));
 const capped=stored.compare(cap)>=0,coefficient=op.kind==='add-coefficient'||op.kind==='multiply-coefficient-once';
 const unit=coefficient?'系数':op.key==='pendingHeat'?'蓄热':op.key==='multiplier'?'倍率':'热度',prefix=coefficient?'×':'+';
 const action=hook.phase==='afterHand'||['jokerScore','onCardScore','onHeldCard'].includes(hook.phase)?'play':hook.phase==='onDiscard'?'discard':hook.phase==='onStageClear'?'clear':'shop';
 let status:'ready'|'prepare'|'unmet'|'capped'|'waiting'|'used'='waiting',reason='到对应动作成功并保存时检查。';
 const resultOnly=['extra-retrigger','hand-score-below-target','hand-type-unfinished','exhausted-hands'].includes(hook.condition.kind)||op.kind==='update-score-growth';
 if(op.kind==='update-score-growth')reason=ctx.previousHandScore===null?'先成功出一手建立比分基线；本次不新增。':'实际本手比分高于上手才长；未超过则归零，不预估总分。';
 else if(capped){status='capped';reason='已封顶，不再新增；已存值按读取条件使用。';}
 else if(op.kind==='multiply-coefficient-once'&&joker.counters?.alternationUsed){status='used';reason='本场已成长一次；进下一场重置次数，已存系数保留。';}
 else if(action==='play'&&ctx.inStage&&ctx.facts&&!resultOnly){
  const facts=ctx.facts,played=ctx.hand.filter(c=>facts.playedIds.includes(c.id)),held=ctx.hand.filter(c=>facts.heldIds.includes(c.id));
  const score:R2ScoreConditionContext={played,held,validHeld:held.filter(c=>!ctx.disabledIds.includes(c.id)),active:played.filter(c=>facts.activeScoringIds.includes(c.id)),scoringIds:facts.scoringIds,handType:facts.type,previousHandType:ctx.previousHandType,playIndex:ctx.playIndex+1,handsAfter:ctx.handsLeft-1,gold:ctx.gold,discardsUsed:ctx.discardsUsed,extraExecutions:0,resolvedFinal:null,stageHeatBefore:ctx.stageHeat,stageTargetHeat:ctx.target};
  const known=['always','hand-type-in','hand-type-relation','hand-type-transition','held-count','played-count','played-count-maximum'].includes(hook.condition.kind);
  if(known){status=r2ScoreConditionMatches(hook.condition,score)?'ready':'unmet';reason=status==='ready'?'公开成长条件可用，成功出牌并保存后才新增。':'这组不满足新增成长条件，仍可自由出牌。';}
  if(hook.condition.kind==='held-count')reason='本组实际保留'+facts.heldIds.length+'张，成长要求至少'+hook.condition.minimum+'张。'+(status==='ready'?'成功结算后新增。':'可换较少张数的合法组合，或直接出牌。');
  if(hook.condition.kind==='hand-type-relation'&&status==='ready')reason='上手'+HAND_LABELS[ctx.previousHandType!]+' → 本手'+HAND_LABELS[facts.type]+'；连续合格牌型'+(hook.condition.relation==='same'?'相同':'换型')+'，成功保存后才新增。';
  if(status==='unmet'&&hook.condition.kind==='hand-type-relation'&&hook.condition.values.includes(facts.type)){
   const canPrepare=hook.condition.relation==='same'||ctx.previousHandType===null||!hook.condition.values.includes(ctx.previousHandType);
   if(canPrepare){status=ctx.handsLeft>1?'prepare':'unmet';reason=ctx.handsLeft>1?'本组先建立'+HAND_LABELS[facts.type]+'接续；同场下一手'+(hook.condition.relation==='same'?'仍为该型':'换另一合格型')+'才检查成长，可能本手已过关。':'本场只剩一次出牌，不能再建立下一手接续；下场首手重新建立，已存成长保留。';}
  }
  if(ctx.scoringLimited&&hook.phase!=='afterHand'){status='unmet';reason='本手计分阶段停用，不读取或新增该阶段成长。';}
 }else if(action==='discard'&&ctx.inStage&&ctx.facts){
  const discarded=ctx.hand.filter(c=>ctx.facts!.playedIds.includes(c.id)),matches=r2TransactionConditionMatches(hook.condition,{...ctx.transaction,discarded});
  status=matches&&ctx.canDiscard?'ready':'unmet';reason=matches?(ctx.canDiscard?'所选可作为同花弃牌；须成功弃牌并保存才蓄热。':'弃牌机会或金币不足，本次不能提交弃牌。'):'所选不满足这次弃牌条件；出牌不会蓄热。';
 }else if(action==='clear'){
  if(hook.condition.kind==='no-joker-sale-this-stage'&&ctx.transaction.jokerSold){status='unmet';reason='本场或进场商店已出售，买回不恢复本场成长资格。';}
  else reason='须实际成功过关，并在关末检查'+r2ConditionDescription(hook.condition)+'。未提交牌不算过关。';
 }else if(action==='shop')reason=hook.phase==='onBuyOffer'?'成功购买其他商品后，原持有来源才长。':hook.phase==='onSellJoker'?'成功出售其他大丑牌后，仍持有的来源才长。':'成功付费刷新后才长；免费刷新不触发，资格和价格沿原入口。';
 if(resultOnly&&op.kind!=='update-score-growth')reason='实际结算时检查'+r2ConditionDescription(hook.condition)+'；选牌不预报结果。';
 const amount=op.kind==='multiply-coefficient-once'?'系数×'+fractionText(op.value)+'，最多到×'+fractionText(next.toJSON()):unit+'最多新增+'+fractionText(delta.compare(zero)>0?delta.toJSON():zero.toJSON());
 const label={ready:action==='discard'?'弃牌可蓄热':'成长条件可用',prepare:'建立接续',unmet:'不新增成长',capped:'成长已封顶',waiting:'动作时检查',used:'本场成长已用'}[status];
 const compactLabel={ready:action==='discard'?'弃牌可蓄':'可成长',prepare:'先接续',unmet:'不成长',capped:'成长满',waiting:action==='clear'?'关末检查':action==='shop'?'交易后长':op.kind==='update-score-growth'?'比分后查':'结果后查',used:'本场已长'}[status];
 const resets=d.hooks.some(h=>h.operations.some(o=>o.kind==='reset-coefficient'))?'出售会重置系数；买回不恢复本场资格。':op.key==='pendingHeat'?'下一次实际读取后消耗；场末清空。':op.kind==='update-score-growth'?'未超过上手归零；封顶仍可能归零。':'';
 const summary='现存'+prefix+fractionText(stored.toJSON())+' '+unit+'；'+compactLabel+(status==='ready'?'，'+amount:'');
 return {stored:stored.toJSON(),cap:cap.toJSON(),delta:delta.compare(zero)>0?delta.toJSON():zero.toJSON(),capped,status,label,compactLabel,reason,name:d.name,operation:op.kind,key:op.key,unit,prefix,action,summary,
 body:'现存'+prefix+fractionText(stored.toJSON())+' '+unit+' · 上限'+(coefficient?'×':'')+fractionText(cap.toJSON())+'\n'+label+'：'+reason+(status==='ready'?'\n'+amount:'')+'\n'+(resets?resets+'\n':'')+(ctx.scoringLimited?'本手计分停用；成长仍按独立阶段条件检查。\n':'')+'只有成功保存才兑现；新成长从后续读取生效。'};
}
type GrowthWrite=Extract<Operation,{kind:'add-growth'|'add-coefficient'|'multiply-coefficient-once'|'update-score-growth'}>;
export function isGrowthWrite(o:Operation):o is GrowthWrite{return ['add-growth','add-coefficient','multiply-coefficient-once','update-score-growth'].includes(o.kind);}
