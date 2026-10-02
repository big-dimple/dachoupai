import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
  const {validateR2Content,R2_JOKERS}=await server.ssrLoadModule('/src/content/r2Schema.ts');
  const {R2_CONTENT_VERSION,R2_CONTENT_HASH,R2_LIMITS}=await server.ssrLoadModule('/src/domain/r2Run.ts');
  const {SCORE_LIMITS}=await server.ssrLoadModule('/src/domain/scoreR2.ts');
  const {R2_TOOL_CATALOG}=await server.ssrLoadModule('/src/content/r2Tools.ts');
  const input=process.argv[2] ? JSON.parse(await readFile(process.argv[2],'utf8')) : R2_JOKERS;
  const errors=validateR2Content(input);
  const sum=values=>values.reduce((total,value)=>total+value,0);
  const maximum=values=>Math.max(0,...values);
  // Counts emitted trace entries, not requested retriggers or RNG draws.
  const operationEvents=(op,extra=false)=>{
    if(op.kind==='retrigger-card')return extra?0:2; // Cue plus possible shared-cap notice; extras cannot recurse.
    if(op.kind==='expire-after-hands')return 2; // Count update plus possible destruction.
    if(op.kind==='chance-add-heat')return 2; // Independent check plus a possible heat addition.
    if(op.kind==='reward-consumable-every-clears')return 2; // Persisted modulo counter plus reward or overflow gold.
    if(op.kind==='reward-consumable-pool'||op.kind==='refund-hand-limited')return 1; // Exactly one determined resource source.
    return 1; // Growth baseline/update/reset branches are alternatives, each one event.
  };
  const phaseEvents=(definition,phase,extra=false)=>sum(definition.hooks.filter(h=>h.phase===phase)
    .flatMap(h=>h.operations.map(op=>operationEvents(op,extra))));
  const enhancementEvents=effect=>{
    switch(effect.kind){
      case 'chance-add-multiplier':return 2; // Check and possible addition.
      case 'chance-add-gold':return 2; // Check and either grant or cap notice, even after the cap.
      case 'chance-destroy':return 2; // One post-final check and possible destruction, not once per pass.
      case 'add-heat':case 'add-multiplier':case 'multiply-multiplier':case 'retrigger-card':case 'add-gold':return 1;
      default:throw Error(`unaccounted enhancement event: ${effect.kind}`);
    }
  };
  const enhancementMaximum=phase=>maximum(R2_TOOL_CATALOG.enhancements.map(row=>
    sum(row.effects.filter(effect=>effect.phase===phase).map(enhancementEvents))));
  const scoringEnhancement=enhancementMaximum('onCardScore'),heldEnhancement=enhancementMaximum('onHeldCard');
  const postFinalCard=enhancementMaximum('afterHand');
  const winningHeldCap=maximum(R2_TOOL_CATALOG.enhancements.flatMap(row=>row.effects
    .filter(effect=>effect.phase==='onStageClear'&&effect.kind==='add-gold')
    .map(effect=>Math.floor(effect.capPerStage/effect.amount))));
  const editionEvents=maximum(R2_TOOL_CATALOG.editions.map(row=>row.effect?1:0));
  const clearRuleItems=R2_TOOL_CATALOG.longTermItems.filter(item=>
    ['interest-cap','boss-most-used-hand-upgrade','first-normal-clear-per-chapter'].includes(item.operation.kind));
  const clearRuleTools=R2_TOOL_CATALOG.tools.filter(tool=>tool.rewardSources.some(source=>source.source==='first-boss-clear'));
  const clearRuleDefinitions=[...clearRuleItems,...clearRuleTools].map(row=>row.id);
  const costs=errors.length?[]:input.map(definition=>({
    id:definition.id,ordinaryCard:phaseEvents(definition,'onCardScore'),extraCard:phaseEvents(definition,'onCardScore',true),
    held:phaseEvents(definition,'onHeldCard'),jokerScore:phaseEvents(definition,'jokerScore'),
    afterHand:phaseEvents(definition,'afterHand'),stageClear:phaseEvents(definition,'onStageClear'),
    interest:sum((definition.modifiers??[]).map(modifier=>modifier.kind==='interest-cap'?1:0)),
  }));
  const rescueEvents=errors.length?0:input.some(definition=>definition.hooks.some(h=>h.phase==='beforeFailure'))?2:0;
  const passes=1+SCORE_LIMITS.extraRetriggers;
  let eventBound=0,eventBoundBreakdown={},maximizingPlayedCount=0,worstJokerSources=[];
  for(let played=1;played<=R2_LIMITS.maxSelected;played++){
    const held=SCORE_LIMITS.handCount-played;
    // Use the same equipped sources across phases; treat every condition as a hit.
    const worst=costs.map(cost=>({...cost,weighted:played*(cost.ordinaryCard+SCORE_LIMITS.extraRetriggers*cost.extraCard)
      +held*cost.held+cost.jokerScore+cost.afterHand+cost.stageClear+cost.interest+editionEvents}))
      .sort((a,b)=>b.weighted-a.weighted).slice(0,SCORE_LIMITS.jokerCount);
    const components={
      baseCharacterFinal:3, // One base, at most one character effect, one final score.
      cardPoints:played*passes,
      scoringEnhancement:played*passes*scoringEnhancement,
      cardEdition:played*passes*editionEvents,
      ordinarySuppression:played, // Notice once per original active card, never on repeats.
      postFinalCard:played*postFinalCard,
      heldEnhancement:held*heldEnhancement,
      winningHeldGold:Math.min(held,winningHeldCap),
      jokerCardHooks:sum(worst.map(cost=>played*(cost.ordinaryCard+SCORE_LIMITS.extraRetriggers*cost.extraCard))),
      jokerHeldHooks:sum(worst.map(cost=>held*cost.held)),
      jokerScoreHooks:sum(worst.map(cost=>cost.jokerScore)),
      jokerAfterHand:sum(worst.map(cost=>cost.afterHand)),
      jokerStageClear:sum(worst.map(cost=>cost.stageClear)),
      jokerInterest:sum(worst.map(cost=>cost.interest)),
      jokerEdition:worst.length*editionEvents,
      clearRules:clearRuleDefinitions.length,
      rescue:rescueEvents,
    };
    const bound=sum(Object.values(components));
    if(bound>eventBound){eventBound=bound;eventBoundBreakdown=components;maximizingPlayedCount=played;
      worstJokerSources=worst.map(cost=>({definitionId:cost.id,events:cost.weighted}));}
  }
  if(eventBound>SCORE_LIMITS.eventCount)errors.push(`content event bound ${eventBound} exceeds ${SCORE_LIMITS.eventCount}`);
  if(errors.length) {console.error(errors.join('\n'));process.exitCode=1;}
  else console.log(JSON.stringify({status:'PASS',definitions:input.length,contentVersion:R2_CONTENT_VERSION,contentHash:R2_CONTENT_HASH,
    conservativeEventBound:eventBound,eventBoundBreakdown,eventBoundModel:{
      handLimit:SCORE_LIMITS.handCount,selectedLimit:R2_LIMITS.maxSelected,jokerLimit:SCORE_LIMITS.jokerCount,
      extraRetriggers:SCORE_LIMITS.extraRetriggers,maxScoringPasses:passes,scoringEnhancementEventsPerPass:scoringEnhancement,
      heldEnhancementEventsPerCard:heldEnhancement,postFinalCardEventsPerOriginal:postFinalCard,
      winningHeldGoldEventCap:winningHeldCap,editionEventsPerSource:editionEvents,clearRuleDefinitions,
      jokerMaximumEvents:Object.fromEntries(['ordinaryCard','extraCard','held','jokerScore','afterHand','stageClear','interest']
        .map(phase=>[phase,maximum(costs.map(cost=>cost[phase]))])),
      maximizingPlayedCount,worstJokerSources,
      assumptions:['All five equipped sources may hit every eligible hook; mutually exclusive conditions are overcounted.',
        'Maximum repeated lucky/edition, once-only glass, held voice/gold and success/failure rewards are overcounted together.',
        'One edition and enhancement per source; held editions do not score; all extras share the fixed per-card cap.',
        'This is a definition-based conservative trace bound, not an observed maximum or a seed search.'],
    },readOnly:true},null,2));
} catch(error) {console.error(error.stack);process.exitCode=1;}
finally {await server.close();}
