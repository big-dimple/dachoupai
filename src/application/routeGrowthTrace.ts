import {R2_ROUTE_FAMILIES,r2RouteFamilies,r2RouteGrowthTrace,r2RouteSnapshot,type R2RouteHistory} from '../domain/r2RouteGrowth';
import {R2_ROUTE_HAND_TYPES} from '../domain/r2RouteGrowth';
import type {R2RunState} from '../domain/r2Run';
import type {ScoreTrace} from '../domain/scoreR2';
import {Rational} from '../domain/rational';
import {stableHash} from '../domain/hash';
import {R2_BASE_SCORES,r2ScoringDisabledJokerIds} from '../domain/scoreR2';
import type {R2JokerDefinition} from '../content/r2Schema';

/** C2-only closure. A clear changes the run ledger, never the hand's source snapshot. */
export function assertRouteGrowthTrace(t:ScoreTrace,history:R2RouteHistory,stage:NonNullable<R2RunState['stage']>,runId:string,successful:boolean,definitions:readonly R2JokerDefinition[],activeMultTiming=false):void {
  const fail=():never=>{throw Error('invalid-save-route-growth-trace');};
  const expected=r2RouteSnapshot(history),eligible=stage.routeGrowth!.eligible;
  if(successful){expected.clears--;for(const f of eligible)expected[f]--;}
  if(stableHash(t.routeGrowth)!==stableHash(r2RouteGrowthTrace(expected,t.handType)))fail();
  const families=r2RouteFamilies(t.handType),route=t.events.filter(e=>e.sourceDefinitionId==='route-growth');
  const reads=route.filter(e=>e.operation==='route-factor'),clears=route.filter(e=>e.operation==='route-clear'),awards=route.filter(e=>e.operation==='route-clear-family');
  if(reads.length!==families.length||clears.length!==(successful?1:0)||awards.length!==(successful?eligible.length:0)||route.length!==reads.length+clears.length+awards.length)fail();
  const final=t.events.findIndex(e=>e.phase==='finalScore'),lastJoker=t.events.reduce((last,e,i)=>e.phase==='jokerScore'?i:last,-1);
  for(const [i,e] of reads.entries()){
    const family=families[i],index=t.events.indexOf(e);
    if(e.routeFamily!==family||e.phase!=='routeGrowth'||index<=lastJoker||index>=final||i>0&&index!==t.events.indexOf(reads[i-1])+1||e.reasonKey!==`route-growth.${family}.factor`||stableHash(e.value)!==stableHash(t.routeGrowth!.factors[family])||e.resourceBefore!==expected[family]||e.resourceAfter!==expected[family]||stableHash(e.visibleCondition)!==stableHash({kind:'hand-type-in',values:R2_ROUTE_HAND_TYPES[family]}))fail();
    if(t.events.slice(index+1,final).some(next=>next.phase!=='routeGrowth'&&!(next.sourceType==='character'&&(next.sourceDefinitionId==='amo'||activeMultTiming&&(['xiemu','azao'].includes(next.sourceDefinitionId)||next.sourceDefinitionId==='touye'&&!!t.touyeWager?.commit)))))fail();
  }
  for(const e of [...clears,...awards]){
    const family=e.routeFamily;
    if(e.phase!=='onStageClear'||t.events.indexOf(e)<=final||stableHash(e.value)!==stableHash({n:'1',d:'1'})||stableHash(e.visibleCondition)!==stableHash({kind:'always'}))fail();
    if(e.operation==='route-clear'){
      if(family!==undefined||e.reasonKey!=='route-growth.clear'||e.resourceBefore!==expected.clears||e.resourceAfter!==history.clears)fail();
    }else if(!family||!eligible.includes(family)||awards[eligible.indexOf(family)]!==e||e.reasonKey!==`route-growth.${family}.clear`||e.resourceBefore!==expected[family]||e.resourceAfter!==history[family]||t.events.indexOf(e)!==t.events.indexOf(clears[0])+eligible.indexOf(family)+1)fail();
  }
  for(const e of route)if(e.sourceType!=='rule'||e.sourceInstanceId!==runId||e.rootEventId!==e.eventId||e.retriggerDepth!==0||['targetCardId','targetJokerInstanceId','targetHandType','growthBefore','growthAfter','rewardDefinitionId','programGoldBeforeReward','goldBeforeRewards'].some(k=>Object.hasOwn(e,k)))fail();
  for(const e of t.events)if((e.phase==='routeGrowth'||e.operation.startsWith('route-')||e.routeFamily!==undefined)&&!route.includes(e))fail();

  // Prove the whole accumulator chain and the one final floor, including the
  // late global factors. Existing validators still prove sources and predicates.
  let H=new Rational(0n),M=new Rational(0n),finals=0;
  for(const [i,e] of t.events.entries()){
    const amount=Rational.fromJSON(e.value);
    if(H.compare(Rational.fromJSON(e.before.H))||M.compare(Rational.fromJSON(e.before.M)))fail();
    if(e.operation==='base'){
      const [h,m,dh,dm]=R2_BASE_SCORES[t.handType];
      const level=new Rational(BigInt(t.level-1));
      H=new Rational(BigInt(h)).add(new Rational(BigInt(dh)).multiply(level));
      M=Rational.fromJSON(typeof m==='number'?{n:String(m),d:'1'}:m).add(Rational.fromJSON(typeof dm==='number'?{n:String(dm),d:'1'}:dm).multiply(level));
      if(i!==0||H.compare(amount))fail();
    }else if(e.operation==='add-heat'||e.operation==='add-heat-per-gold'||e.operation==='add-heat-per-empty-slot')H=H.add(amount);
    else if(e.operation==='add-multiplier')M=M.add(amount);
    else if(['multiply-multiplier','read-coefficient','rescue-multiplier','route-factor'].includes(e.operation))M=M.multiply(amount);
    else if(e.operation==='halve-base-heat')H=H.multiply(amount);
    else if(e.operation==='read-growth'||e.operation==='consume-growth'){
      const operation=definitions.find(d=>d.id===e.sourceDefinitionId)?.hooks.find(h=>h.phase===e.phase&&stableHash(h.condition)===stableHash(e.visibleCondition))?.operations.find(o=>o.kind===e.operation);
      if(!operation||operation.kind!=='read-growth'&&operation.kind!=='consume-growth')fail();
      if(operation!.kind==='read-growth'||operation!.kind==='consume-growth'){if(operation.target==='heat')H=H.add(amount);else M=M.add(amount);}
    }else if(e.operation==='final-score'){finals++;if(e.phase!=='finalScore'||H.multiply(M).floor().toString()!==t.finalScore||amount.compare(new Rational(BigInt(t.finalScore))))fail();}
    if(H.compare(Rational.fromJSON(e.after.H))||M.compare(Rational.fromJSON(e.after.M)))fail();
  }
  if(finals!==1||H.compare(Rational.fromJSON(t.accumulator.H))||M.compare(Rational.fromJSON(t.accumulator.M)))fail();
  const banned=new Set(r2ScoringDisabledJokerIds(t.bossContext.boss,t.sourceJokers,definitions,t.bossContext.sealedJokerIds,t.bossContext.challengeDisabledJokerId));
  for(const joker of t.sourceJokers.filter(j=>['mantangcai','c04','c06','jiedongfeng'].includes(j.definitionId)))for(const h of definitions.find(d=>d.id===joker.definitionId)!.hooks.filter(h=>h.phase==='jokerScore')){
    const qualifies=!banned.has(joker.instanceId)&&(h.condition.kind==='always'||h.condition.kind==='hand-type-in'&&h.condition.values.includes(t.handType));
    for(const op of h.operations)if(t.events.filter(e=>e.sourceInstanceId===joker.instanceId&&e.phase===h.phase&&e.operation===op.kind&&e.reasonKey===`${joker.definitionId}.${op.kind}`).length!==(qualifies?1:0))fail();
  }
}
