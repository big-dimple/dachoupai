import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

// A finite C03 envelope, separate from the arbitrary-content conservative guard below.
// It overcounts conditions, but keeps one set of five slots across every phase.
const bossTraceBudgets={B01:0,B02:0,B03:0,B04:0,B05:1,B06:0,B07:0,B08:0,B09:0,B10:0,B11:0,B12:1,B13:0,B14:0,B15:1,B16:0};
function legalEventEnvelope(definitions,catalog,limits,scoreLimits,chapter) {
  const sum=values=>values.reduce((total,value)=>total+value,0);
  const maximum=values=>Math.max(0,...values);
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const require=(accepted,detail)=>{if(!accepted)throw Error(`unclassified tight-bound content: ${detail}`);};
  const approvedIds=['pengci','mantangcai','tiesuanpan','huimaqiang','jiedongfeng','a03','a05','b02','b03','b04',
    'c02','c04','c06','d01','d03','d05','d10','e01','e03','e05','e08','f02','f03','f09',
    'a04','a06','a07','a08','b05','b06','b07','b08','c03','c05','c07','c08','d02','d04','d06','d07','e02','e04','e06','e07','f04','f05','f06','f07',
    'a09','a10','a11','a12','b09','b10','b11','b12','c09','c10','c11','c12','d08','d09','d11','d12','e09','e10','e11','e12','f08','f10','f11','f12'];
  require(same(definitions.map(row=>row.id).sort(),approvedIds.sort()),'expected the exact adopted72 identities');
  require(limits.handSize===8&&limits.maxSelected===5&&limits.jokerSlots===5&&limits.longTermSlots===4
    &&scoreLimits.handCount===14&&scoreLimits.extraRetriggers===4&&scoreLimits.retriggerDepth===1,'resource/retrigger limits');
  require(chapter.R2_AVAILABLE_CHAPTERS===8&&same(chapter.R2_BOSSES.map(row=>row.id),Object.keys(bossTraceBudgets)),'C03 normal eight-chapter/16-Boss scope');
  const normalConditions={
    tiesuanpan:{kind:'rank-in',values:[11,12,13,14]},a08:{kind:'rank-in',values:[2,3,4,5]},
    c02:{kind:'suit-in',values:['hearts','diamonds']},c03:{kind:'suit-in',values:['spades','clubs']},
    b02:{kind:'paired-rank',minimum:2},b05:{kind:'paired-rank',minimum:3},
  };
  const retriggerConditions={
    a11:{kind:'played-count',equals:1},b06:{kind:'hand-type-in',values:['pair']},
    c07:{kind:'scoring-position',position:'last',handTypes:['flush','straight-flush']},
    d04:{kind:'scoring-position',position:'first',playModulo:{divisor:2,remainder:0}},
    d11:{kind:'scoring-position',position:'third-original'},
  };
  const onCard=definitions.filter(row=>row.hooks.some(hook=>hook.phase==='onCardScore'));
  require(same(onCard.map(row=>row.id).sort(),[...Object.keys(normalConditions),...Object.keys(retriggerConditions)].sort()),'card-source classes');
  for(const definition of onCard){
    const hook=definition.hooks[0],normal=normalConditions[definition.id];
    require(definition.hooks.length===1&&hook.operations.length===1
      &&same(hook.condition,normal??retriggerConditions[definition.id]),`${definition.id} card condition`);
    require(normal?['add-heat','add-multiplier'].includes(hook.operations[0].kind)
      :same(hook.operations[0],{kind:'retrigger-card',count:1}),`${definition.id} card operation`);
  }
  const handModifiers=definitions.filter(row=>row.modifiers?.some(modifier=>modifier.kind==='hand-limit'));
  require(same(handModifiers.map(row=>row.id).sort(),['a04','d06'])
    &&same(handModifiers.find(row=>row.id==='a04').modifiers,[{kind:'hand-limit',amount:2,deckMaximum:40}])
    &&same(handModifiers.find(row=>row.id==='d06').modifiers,[{kind:'hand-limit',amount:1}]),'entry hand modifiers');
  require(handModifiers.every(row=>row.hooks.length===0),'hand modifiers have no other scoring hooks');
  const handItem=catalog.longTermItems.filter(row=>row.operation.kind==='hand-limit');
  const cleanSlate=catalog.tools.find(row=>row.id==='S08');
  require(handItem.length===1&&same(handItem[0].operation,{kind:'hand-limit',amount:1})
    &&cleanSlate.operation.handBonus===1&&cleanSlate.phases.length===1&&cleanSlate.phases[0]==='shop'
    &&cleanSlate.caps.includes('oncePerRun')&&catalog.limits.oncePerRun===1,'U01/S08 entry-only hand additions');
  const signatures={
    'heat-paper':['onCardScore:add-heat'],'multiplier-paper':['onCardScore:add-multiplier'],
    'glass-paper':['onCardScore:multiply-multiplier','afterHand:chance-destroy'],
    'voice-paper':['onHeldCard:add-multiplier'],'gold-paper':['onStageClear:add-gold'],
    'encore-paper':['onCardScore:retrigger-card'],'lucky-paper':['onCardScore:chance-add-multiplier','onCardScore:chance-add-gold'],
  };
  require(catalog.enhancements.length===7&&catalog.enhancements.every(row=>same(row.effects.map(effect=>`${effect.phase}:${effect.kind}`),signatures[row.id])),'enhancement event classes');
  require(catalog.enhancements.find(row=>row.id==='encore-paper').effects[0].count===1
    &&catalog.enhancements.find(row=>row.id==='glass-paper').effects[1].oncePerOriginalCard===true
    &&catalog.enhancements.find(row=>row.id==='lucky-paper').effects[1].drawWhenCapped===true,'enhancement repeat/cap policy');
  require(catalog.editions.length===4&&catalog.editions.every(row=>!row.effect||['add-heat','add-multiplier','multiply-multiplier'].includes(row.effect.kind)),'one edition event per scoring source');
  const interestItems=catalog.longTermItems.filter(row=>row.operation.kind==='interest-cap');
  const bossItems=catalog.longTermItems.filter(row=>row.operation.kind==='boss-most-used-hand-upgrade');
  const normalItems=catalog.longTermItems.filter(row=>row.operation.kind==='first-normal-clear-per-chapter');
  const bossTools=catalog.tools.filter(row=>row.rewardSources.some(source=>source.source==='first-boss-clear'));
  require(same([...interestItems,...bossItems,...normalItems,...bossTools].map(row=>row.id).sort(),['T16','U04','U09','U12']),'clear rule sources');
  // U12 is normal-only; U09/T16 are boss-only. Base reward/interest/谢幕金 are not extra trace entries.
  const clearRules=interestItems.length+Math.max(bossItems.length+bossTools.length,normalItems.length);
  const retriggers=onCard.filter(row=>Object.hasOwn(retriggerConditions,row.id));
  const residual=definitions.filter(row=>!onCard.includes(row)&&!handModifiers.includes(row));
  const singleEvents=new Set(['add-heat','add-multiplier','multiply-multiplier','read-growth','consume-growth','add-growth',
    'update-score-growth','read-coefficient','add-coefficient','refund-hand-limited','reward-consumable-pool',
    'add-gold','add-heat-per-gold','add-heat-per-empty-slot']);
  const doubleEvents=new Set(['expire-after-hands','chance-add-heat','reward-consumable-every-clears','rescue-hand']);
  const operationCost=operation=>{
    require(singleEvents.has(operation.kind)||doubleEvents.has(operation.kind),operation.kind);
    return doubleEvents.has(operation.kind)?2:1;
  };
  const sourceCost=(definition,played,held,cleared)=>{
    let total=0;
    for(const phase of ['jokerScore','onHeldCard','afterHand',...(cleared?['onStageClear']:['beforeFailure'])]){
      const hooks=definition.hooks.filter(hook=>hook.phase===phase);
      const costs=hooks.map(hook=>{
        let instances=1;
        if(phase==='onHeldCard'){
          require(['held-rank-first','held-scoring-rank-first','held-enhancement-first'].includes(hook.condition.kind),`${definition.id} held condition`);
          instances=Math.min(held,hook.condition.limit);
          if(hook.condition.playedEquals!==undefined&&played!==hook.condition.playedEquals)instances=0;
        }
        return instances*sum(hook.operations.map(operationCost));
      });
      if(phase==='jokerScore'&&hooks.length>1){
        require(definition.id==='c11'&&hooks.length===2
          &&same(hooks.map(hook=>hook.condition),[{kind:'hand-type-transition',current:'straight',previous:'flush'},
            {kind:'hand-type-transition',current:'flush',previous:'straight'}]),'mutually exclusive C11 branches');
        total+=maximum(costs);
      }else total+=sum(costs);
    }
    if(cleared)total+=(definition.modifiers??[]).filter(modifier=>modifier.kind==='interest-cap').length;
    return total;
  };
  let maximumEvents=0,abstractWitness,statesChecked=0;
  const withoutJokerHandModifiers=limits.handSize+handItem[0].operation.amount+cleanSlate.operation.handBonus;
  for(let played=1;played<=limits.maxSelected;played++)for(let active=0;active<=played;active++)for(let normal=0;normal<=4;normal++){
    // At most one rank source, one suit source, paired2 and paired3 can hit a pass.
    // Extra overlapping equipped normals can only lower this idealized slot cost.
    for(let retMask=0;retMask<2**retriggers.length;retMask++){
      const sources=retriggers.filter((_,index)=>retMask&(1<<index)),ids=sources.map(row=>row.id);
      if(normal+sources.length>limits.jokerSlots||sources.length&&active===0)continue;
      if(ids.includes('a11')&&(played!==1||active!==1))continue;
      if(ids.includes('b06')&&(played<2||active>2||ids.some(id=>['a11','c07','d11'].includes(id))))continue;
      if(ids.includes('c07')&&played<4||ids.includes('d11')&&played<3)continue;
      const extra=sum(sources.map(row=>row.id==='b06'?active:1));
      const targets=ids.includes('b06')?active:extra>0?1:0; // Other positions may coincide; allow that upper bound.
      // Per card with q Joker repeats: encore=(q+2)*(2+k)+1, lucky=(q+1)*(6+k),
      // glass=(q+1)*(3+k)+2. Glass cannot exceed lucky; held voice/gold together <= held.
      // With k>=1 encore wins at q=0; lucky wins at q>=1. Concentrating repeats overcounts.
      const cardEvents=normal===0?6*active+7*extra:active*(5+2*normal)+extra*(7+normal)-targets*(normal-1);
      for(let handMask=0;handMask<2**handModifiers.length;handMask++){
        const modifiers=handModifiers.filter((_,index)=>handMask&(1<<index));
        const slots=limits.jokerSlots-normal-sources.length-modifiers.length;if(slots<0)continue;
        const hand=withoutJokerHandModifiers+sum(modifiers.flatMap(row=>row.modifiers.map(modifier=>modifier.amount)));
        const held=hand-played;
        for(const cleared of [false,true]){
          const rest=residual.map(row=>({definitionId:row.id,events:sourceCost(row,played,held,cleared)}))
            .sort((a,b)=>b.events-a.events).slice(0,slots);
          const suppression=Math.min(2,active,Math.max(0,played-3)),boss=suppression>=maximum(Object.values(bossTraceBudgets))?'B02':'B12';
          const breakdown={baseCharacterFinal:3,cardEvents,ordinarySuppression:boss==='B02'?suppression:0,bossTrace:bossTraceBudgets[boss],
            heldEnhancementOrGold:held,jokerEdition:limits.jokerSlots,residualSources:sum(rest.map(row=>row.events)),clearRules:cleared?clearRules:0};
          const bound=sum(Object.values(breakdown));statesChecked++;
          if(bound>maximumEvents){maximumEvents=bound;abstractWitness={boss,played,active,normalCardGroups:normal,
            retriggerSources:ids,handModifierSources:modifiers.map(row=>row.id),held,cleared,residualSources:rest,breakdown};}
        }
      }
    }
  }
  return {maximumEvents,definitionCount:definitions.length,statesChecked,
    maximumEntryHand:withoutJokerHandModifiers+sum(handModifiers.flatMap(row=>row.modifiers.map(modifier=>modifier.amount))),
    retriggerCapNoticesReachable:false,abstractWitness,
    scope:'Current72 command-reachable configurations, normal/endless entry resources and B01–B16; event count, not maximum score or natural acquisition probability.',bossTraceBudgets,
    proof:['Each equipped source spends one of the same five slots across all phases; A04/D06 spend slots to increase held count.',
      'The six normal card definitions provide at most four simultaneous groups; overlapping groups are overcounted with fewer slots.',
      'A11 requires played1; B06 requires pair and cannot coexist effectively with C07/D11. Other positions contribute at most three repeats.',
      'Encore adds at most one intrinsic repeat: at most four extras, so no legal retrigger-cap rejection event is omitted.',
      'Enhancement is one layer: lucky can emit four per pass including a gold-cap notice; glass destruction is counted once per original.',
      'Held voice and winning gold share a layer and contribute at most one event per held card; held editions do not score.',
      'Success and failure tails are alternatives; F06 count/destruction, F08 check/heat, E10 cycle/reward and rescue/destroy count two when applicable.',
      'U12 cannot coexist with boss-only U09/T16 on one clear; base reward, base interest and last-hand character gold add no separate trace.',
      'Only one Boss applies: B02 adds at most two ordinary-suppression notices; B05/B12 halve-base or B15 seal adds at most one, never alongside B02.',
      'Other Bosses add no score-trace entries: suppression and resource reductions cannot increase this overcounted source envelope; B13 reverses order only.',
      'An upper envelope is not an attained witness. Independent88 pure /91 shared goldens and the exported checkpoint provide attainment.']};
}

const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
  const {validateR2Content,R2_JOKERS}=await server.ssrLoadModule('/src/content/r2Schema.ts');
  const {R2_CONTENT_VERSION,R2_CONTENT_HASH,R2_LIMITS}=await server.ssrLoadModule('/src/domain/r2Run.ts');
  const {SCORE_LIMITS}=await server.ssrLoadModule('/src/domain/scoreR2.ts');
  const {R2_TOOL_CATALOG}=await server.ssrLoadModule('/src/content/r2Tools.ts');
  const {R2_MODE_CATALOG,validateR2ModeCatalog}=await server.ssrLoadModule('/src/content/r2Modes.ts');
  const chapter=await server.ssrLoadModule('/src/domain/r2Chapter.ts');
  const input=process.argv[2] ? JSON.parse(await readFile(process.argv[2],'utf8')) : R2_JOKERS;
  const errors=validateR2Content(input);
  errors.push(...validateR2ModeCatalog(R2_MODE_CATALOG).map(error=>`mode catalog: ${error}`));
  for(const challenge of R2_MODE_CATALOG.challenges){
    for(const joker of challenge.config.startingJokers){
      const definition=R2_JOKERS.find(row=>row.id===joker.definitionId);
      if(!definition||definition.rarity!=='rare')errors.push(`challenge ${challenge.id}: unavailable starting rare Joker ${joker.definitionId}`);
    }
  }
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
      bossTrace:maximum(Object.values(bossTraceBudgets)), // One half-base or post-hand seal; discard transactions stay outside the score trace.
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
  const tightProof=errors.length?null:legalEventEnvelope(input,R2_TOOL_CATALOG,R2_LIMITS,SCORE_LIMITS,chapter);
  if(tightProof&&tightProof.maximumEvents>SCORE_LIMITS.eventCount)errors.push(`legal content event envelope ${tightProof.maximumEvents} exceeds ${SCORE_LIMITS.eventCount}`);
  if(errors.length) {console.error(errors.join('\n'));process.exitCode=1;}
  else console.log(JSON.stringify({status:'PASS',definitions:input.length,contentVersion:R2_CONTENT_VERSION,contentHash:R2_CONTENT_HASH,
    modeConfigurations:{scope:'C04.1 finite configuration only; v9 gameplay and saves remain standard D0.',
      modes:R2_MODE_CATALOG.modes.map(row=>row.id),difficulties:R2_MODE_CATALOG.difficulties.map(row=>row.id),
      challenges:R2_MODE_CATALOG.challenges.map(row=>row.id),programs:R2_MODE_CATALOG.programs.map(row=>row.id)},
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
    },legalEventEnvelope:tightProof,readOnly:true},null,2));
} catch(error) {console.error(error.stack);process.exitCode=1;}
finally {await server.close();}
