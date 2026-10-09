import {R2_ENHANCEMENTS} from '../content/r2Tools';
import type {R2JokerDefinition} from '../content/r2Schema';
import {r2ScoreConditionMatches,type R2ScoreConditionContext} from '../domain/r2Conditions';
import {r2DisabledCards,r2OrdinarySuppression} from '../domain/r2Chapter';
import {SCORE_LIMITS,r2ScoringDisabledJokerIds,type ScoreEvent,type ScoreTrace} from '../domain/scoreR2';
import {Rational} from '../domain/rational';
import {stableHash} from '../domain/hash';
import type {R2RunState} from '../domain/run';

/** New group identity only. Reconstruct the deterministic request/execution skeleton,
 * without replaying RNG or trusting trace claims as a source of extra executions. */
export function assertGroupTraceExecutions(trace:ScoreTrace,definitions:readonly R2JokerDefinition[],stage:NonNullable<R2RunState['stage']>):void {
 const fail=():never=>{throw Error('invalid-save-group-card-execution');};
 const {cards,sets,sourceJokers,bossContext}=trace,boss=bossContext.boss;
 const active=cards.filter(c=>sets.activeScoringIds.includes(c.id)),played=cards.filter(c=>sets.playedIds.includes(c.id)),held=cards.filter(c=>sets.heldIds.includes(c.id));
 const disabled=boss?r2DisabledCards(boss,stage.index,cards):[],suppressed=boss?r2OrdinarySuppression(boss,stage.index,cards,sets.playedIds):[];
 const bans=new Set(r2ScoringDisabledJokerIds(boss,sourceJokers,definitions,bossContext.sealedJokerIds,bossContext.challengeDisabledJokerId));
 const ctx:R2ScoreConditionContext={played,held,active,validHeld:held.filter(c=>!disabled.includes(c.id)),scoringIds:sets.scoringIds,handType:trace.handType,previousHandType:bossContext.previousHandType,playIndex:stage.playIndex,handsAfter:stage.handsLeft,gold:0,discardsUsed:stage.discardsUsed,extraExecutions:0,resolvedFinal:null};
 const onCard=trace.events.filter(e=>e.phase==='onCardScore'),first=trace.events.indexOf(onCard[0]),last=trace.events.indexOf(onCard.at(-1)!);
 if(onCard.length&&(trace.events.slice(0,first).some(e=>e.phase!=='base')||trace.events.slice(first,last+1).some(e=>e.phase!=='onCardScore')))fail();
 const isRank=(e:ScoreEvent)=>e.sourceType==='card'&&e.sourceDefinitionId.startsWith('rank-');
 const roots=new Map<string,string>();
 for(const e of onCard)if(isRank(e)&&e.retriggerDepth===0){if(!e.targetCardId||roots.has(e.targetCardId)||e.rootEventId!==e.eventId)fail();roots.set(e.targetCardId!,e.eventId);}
 const shape=(e:ScoreEvent)=>({sourceType:e.sourceType,sourceDefinitionId:e.sourceDefinitionId,sourceInstanceId:e.sourceInstanceId,targetCardId:e.targetCardId,operation:e.operation,value:e.value,reasonKey:e.reasonKey,visibleCondition:e.visibleCondition,retriggerDepth:e.retriggerDepth,rootEventId:e.rootEventId});
 const actual=onCard.filter(e=>isRank(e)||['retrigger-card','retrigger-cap','ordinary-points-suppressed'].includes(e.operation)).map(shape),expected:ReturnType<typeof shape>[]=[];
 for(const card of active){
  const root=roots.get(card.id);if(!root)fail();
  const source={sourceType:'card' as const,sourceDefinitionId:`rank-${card.rank}`,sourceInstanceId:card.id,targetCardId:card.id},points=suppressed.includes(card.id)?0:card.rank===14?11:Math.min(card.rank,10);
  const rank=(depth:number)=>expected.push({...source,operation:'add-heat',value:{n:String(depth===0&&trace.erxiangHandoff?.targetId===card.id?0:points),d:'1'},reasonKey:`rank-${card.rank}.add-heat`,visibleCondition:{kind:'always'},retriggerDepth:depth,rootEventId:root!});
  if(suppressed.includes(card.id)){const event=onCard.find(e=>e.targetCardId===card.id&&e.operation==='ordinary-points-suppressed');if(!event||event.rootEventId!==event.eventId)fail();expected.push({sourceType:'rule',sourceDefinitionId:'B02',sourceInstanceId:trace.events[0].sourceInstanceId,targetCardId:card.id,operation:'ordinary-points-suppressed',value:{n:'0',d:'1'},reasonKey:'B02.ordinary-points-suppressed',visibleCondition:{kind:'always'},retriggerDepth:0,rootEventId:event!.eventId});}
  rank(0);let budget=0;
  for(const effect of R2_ENHANCEMENTS.find(d=>d.id===card.enhancement)?.effects??[])if(effect.phase==='onCardScore'&&effect.kind==='retrigger-card'){
   budget+=effect.count;expected.push({...source,sourceDefinitionId:card.id,operation:'retrigger-card',value:{n:String(effect.count),d:'1'},reasonKey:`enhancement.${card.enhancement}.retrigger-card`,visibleCondition:{kind:'always'},retriggerDepth:0,rootEventId:root!});
  }
  for(const joker of sourceJokers){if(bans.has(joker.instanceId))continue;for(const hook of definitions.find(d=>d.id===joker.definitionId)!.hooks){
   if(hook.phase!=='onCardScore'||!r2ScoreConditionMatches(hook.condition,ctx,card))continue;
   for(const operation of hook.operations)if(operation.kind==='retrigger-card'){
    const granted=Math.min(operation.count,SCORE_LIMITS.extraRetriggers-budget);budget+=granted;
    const event={sourceType:'joker' as const,sourceDefinitionId:joker.definitionId,sourceInstanceId:joker.instanceId,targetCardId:card.id,operation:'retrigger-card',value:{n:String(granted),d:'1'},reasonKey:`${joker.definitionId}.retrigger-card`,visibleCondition:hook.condition,retriggerDepth:0,rootEventId:root!};expected.push(event);
    if(granted<operation.count)expected.push({...event,operation:'retrigger-cap',value:{n:String(SCORE_LIMITS.extraRetriggers),d:'1'},reasonKey:`${joker.definitionId}.retrigger-cap`});
   }
  }}
  for(let i=0;i<budget;i++)rank(1);
 }
 if(stableHash(actual)!==stableHash(expected))fail();
 let execution:ScoreEvent|undefined;
 for(const event of onCard){
  if(event.operation==='ordinary-points-suppressed'){execution=undefined;continue;}
  if(isRank(event)){execution=event;continue;}
  if(event.sourceType==='character'&&event.reasonKey==='erxiang.handoff'&&trace.erxiangHandoff?.targetId===event.targetCardId)continue;
  if(!execution||event.targetCardId!==execution.targetCardId||event.retriggerDepth!==execution.retriggerDepth||event.rootEventId!==roots.get(event.targetCardId!)||!['card','joker'].includes(event.sourceType))fail();
  if(event.operation==='retrigger-card'||event.operation==='retrigger-cap'){
   if(event.retriggerDepth!==0||Rational.fromJSON(event.before.H).compare(Rational.fromJSON(event.after.H))||Rational.fromJSON(event.before.M).compare(Rational.fromJSON(event.after.M)))fail();
  }
 }
 // Neither requests nor card executions can hide in another phase.
 if(trace.events.some(e=>e.phase!=='onCardScore'&&(isRank(e)||e.retriggerDepth!==0||e.operation==='retrigger-card'||e.operation==='retrigger-cap')))fail();
}
