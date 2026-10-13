import {applyCommand,type R2RunState} from '../domain/run';
import type {R2Offer} from '../domain/r2Shop';
import {r2JokerCapacity} from '../domain/r2Resources';
import {r2JokerDefinitionFor,r2JokerDefinitionsFor} from '../domain/r2ContentProfiles';
import {r2ScoringDisabledJokerIds} from '../domain/scoreR2';
import {Rational} from '../domain/rational';
import {R2_EDITIONS} from '../content/r2Tools';

/** Purchase-only opportunity cost, measured from the authoritative current/
 * post-sale state. Sale proceeds, growth and unsealed sources are already owned.
 * No whole-trade net value, history inference, hidden draws, save or dispatch. */
export function shopDeferredGrowthCashRisk(before:R2RunState,offer:R2Offer){
 if(before.jokers.length!==r2JokerCapacity(before)-1||before.gold<20)return;
 const definitions=r2JokerDefinitionsFor(before),boss=before.stageIndex%3===2?before.boss:null,sealed=before.stage?.index===before.stageIndex?before.stage.sealedJokerIds:[];
 const disabled=new Set(r2ScoringDisabledJokerIds(boss,before.jokers,definitions,sealed,before.chapterDisabledJokerId));
 const retained=before.jokers,bao=retained.find(j=>j.definitionId==='e08'&&!disabled.has(j.instanceId));
 const candidate=definitions.find(d=>d.id===offer.definitionId),scorePhases=['onCardScore','onHeldCard','jokerScore'];
 if(!bao||!candidate||candidate.modifiers?.length||candidate.hooks.some(h=>h.operations.some(o=>!['read-growth','add-growth','update-score-growth'].includes(o.kind))))return;
 const candidateScoreOps=candidate.hooks.filter(h=>scorePhases.includes(h.phase)).flatMap(h=>h.operations);
 // Other bodies are unassessed by this zero-initial-growth rule, not certified
 // as compensation merely because they contain another operation type.
 if(!candidateScoreOps.length||candidateScoreOps.some(o=>o.kind!=='read-growth'))return;
 const result=applyCommand(before,{runId:before.runId,commandId:before.runId+'/recommendation-buy/'+(before.commandSeq+1),expectedSeq:before.commandSeq,action:{type:'BuyOffer',offerId:offer.offerId}});
 if(!result.ok||result.state.gold>=20)return;
 const after=result.state,fresh=after.jokers.find(j=>!before.jokers.some(old=>old.instanceId===j.instanceId));
 if(!fresh||fresh.definitionId!==offer.definitionId)return;
 const afterDisabled=new Set(r2ScoringDisabledJokerIds(boss,after.jokers,r2JokerDefinitionsFor(after),sealed,after.chapterDisabledJokerId));
 // Only gains caused by BuyOffer count here. Sale-induced source activation
 // (notably B06 slot shifts) is already included in the purchase baseline.
 if(retained.some(j=>{
  const d=definitions.find(d=>d.id===j.definitionId)!,effect=R2_EDITIONS.find(e=>e.id===(j.edition??'none'))?.effect;
  const source=d.hooks.some(h=>scorePhases.includes(h.phase)&&h.operations.length>0)||!!effect&&Rational.fromJSON(effect.value).compare(new Rational(effect.kind==='multiply-multiplier'?1n:0n))>0;
  return source&&disabled.has(j.instanceId)&&!afterDisabled.has(j.instanceId);
 }))return;
 const edition=R2_EDITIONS.find(e=>e.id===(fresh.edition??'none'))?.effect;
 // An actual enabled numeric edition is a nonzero current source, not proof
 // that it offsets the lost multiplier. A disabled badge grants no exception.
 if(!afterDisabled.has(fresh.instanceId)&&edition&&Rational.fromJSON(edition.value).compare(new Rational(edition.kind==='multiply-multiplier'?1n:0n))>0)return;
 const d=r2JokerDefinitionFor(after,fresh.definitionId);
 const scoreOps=d.hooks.filter(h=>scorePhases.includes(h.phase)).flatMap(h=>h.operations);
 if(d.modifiers?.length||!scoreOps.length||scoreOps.some(o=>o.kind!=='read-growth'||Rational.fromJSON(fresh.growth[o.key]??{n:'0',d:'1'}).compare(new Rational(0n))!==0))return;
 if(d.hooks.some(h=>h.operations.some(o=>!['read-growth','add-growth','update-score-growth'].includes(o.kind))))return;
 // A BuyOffer hook must have a live scoring receiver to be a current gain.
 // Growth stored on a still-disabled receiver is future value, not compensation.
 if(retained.some(j=>!afterDisabled.has(j.instanceId)&&JSON.stringify(j)!==JSON.stringify(after.jokers.find(next=>next.instanceId===j.instanceId))))return;
 // A cash reduction can activate a separate low-gold benefit. Do not assume it
 // cannot compensate the lost multiplier; that trade remains outside this rule.
 if(retained.some(j=>!disabled.has(j.instanceId)&&r2JokerDefinitionFor(before,j.definitionId).hooks.some(h=>scorePhases.includes(h.phase)&&h.condition.kind==='resource-maximum'&&h.condition.resource==='gold'&&before.gold>h.condition.maximum&&after.gold<=h.condition.maximum)))return;
 return {basis:'current-purchase' as const,sourceInstanceId:bao.instanceId,goldBeforePurchase:before.gold,goldAfterPurchase:after.gold};
}
