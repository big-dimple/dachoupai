import type {R2RunState} from '../domain/r2Run';
import type {R2JokerInstance} from '../content/r2Schema';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {r2ScoreConditionMatches,type R2ScoreConditionContext} from '../domain/r2Conditions';
import {Rational} from '../domain/rational';
import {HAND_LABELS} from '../content/handLabels';
import type {JokerMemoryContext} from './JokerMemory';
import {fractionText} from './scoreText';
/** Existing after-hand growth only. Public conditions, no scoring preview or future deal. */
export function growthOpportunity(state:R2RunState,joker:R2JokerInstance,ctx:JokerMemoryContext){
 const d=r2JokerDefinitionFor(state,joker.definitionId),hook=d.hooks.find(h=>h.phase==='afterHand'&&h.operations.some(o=>o.kind==='add-growth'));
 const op=hook?.operations.find(o=>o.kind==='add-growth');if(!hook||op?.kind!=='add-growth')return;
 const stored=Rational.fromJSON(joker.growth[op.key]??{n:'0',d:'1'}),remaining=Rational.fromJSON(op.cap).add(stored.multiply(new Rational(-1n))),delta=remaining.compare(Rational.fromJSON(op.value))<0?remaining:Rational.fromJSON(op.value);
 let status:'ready'|'prepare'|'unmet'|'capped'|'waiting'='waiting',reason='选牌后查看本手成长条件。';
 if(remaining.compare(new Rational(0n))<=0){status='capped';reason='已达成长上限，不再新增；已存值按读取条件使用。';}
 else if(ctx.inStage&&ctx.facts){
  const facts=ctx.facts,played=ctx.hand.filter(c=>facts.playedIds.includes(c.id)),held=ctx.hand.filter(c=>facts.heldIds.includes(c.id));
  const score:R2ScoreConditionContext={played,held,validHeld:held.filter(c=>!ctx.disabledIds.includes(c.id)),active:played.filter(c=>facts.activeScoringIds.includes(c.id)),scoringIds:facts.scoringIds,handType:facts.type,previousHandType:ctx.previousHandType,playIndex:ctx.playIndex+1,handsAfter:ctx.handsLeft-1,gold:ctx.gold,discardsUsed:ctx.discardsUsed,extraExecutions:0,resolvedFinal:null};
  const known=['always','hand-type-in','hand-type-relation','hand-type-transition','held-count','played-count','played-count-maximum'].includes(hook.condition.kind);
  if(known){const match=r2ScoreConditionMatches(hook.condition,score);status=match?'ready':'unmet';reason=match?'公开成长条件可用，成功出牌并保存后才新增。':'这组不满足新增成长条件，仍可自由出牌。';}
  if(hook.condition.kind==='held-count')reason='本组实际保留'+facts.heldIds.length+'张，成长要求至少'+hook.condition.minimum+'张。'+(status==='ready'?'成功结算后新增。':'可换较少张数的合法组合，或直接出牌。');
  if(status==='unmet'&&hook.condition.kind==='hand-type-relation'&&hook.condition.relation==='same'&&hook.condition.values.includes(facts.type)){status=ctx.handsLeft>1?'prepare':'unmet';reason=ctx.handsLeft>1?'本组先建立'+HAND_LABELS[facts.type]+'接续；同场下一手仍为该型才检查成长，可能本手已过关。':'本场只剩一次出牌，不能再建立下一手接续；下场首手重新建立，已存成长保留。';}
 }
 const label={ready:'成长条件可用',prepare:'建立接续',unmet:'不新增成长',capped:'成长已封顶',waiting:'待选牌核成长'}[status];
 const compactLabel={ready:'可成长',prepare:'先接续',unmet:'不成长',capped:'成长满',waiting:'待选牌'}[status];
 return {status,label,compactLabel,name:d.name,body:label+' · 已存'+fractionText(stored)+(status==='ready'?' · 结算后最多+'+fractionText(delta):'')+'\n'+reason+'\n新增下手生效；不预演总分、不保证再出一手。'+(ctx.scoringLimited?'本手计分停用；结算后成长仍按独立阶段条件检查。':'')};
}
