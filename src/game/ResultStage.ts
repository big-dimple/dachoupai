import type {R2RunState} from '../domain/r2Run';
import type {Box} from './layout';
import {stageOutcome} from './stageOutcome';
import {victorySourceFact} from './JokerKeyHighlight';
import {hasActualBenefit,savedBenefit} from './JokerExperience';
import {buildGrowthProgress} from './BuildGrowthProgress';

/** Accent identities come only from a verified, saved result. No outcome or score is recomputed. */
export function resultStageFacts(run:R2RunState,cleared:boolean,skipped=false){
 const outcome=stageOutcome(run.stage!,run.lastTrace),trace=cleared&&!skipped&&['stage-cleared','run-won'].includes(run.phase)?outcome.last:null;
 const character=trace?.events.some(e=>e.sourceType==='character'&&e.sourceDefinitionId===run.characterId&&hasActualBenefit(e))?run.characterId:undefined;
 const preferred=trace&&victorySourceFact(run,trace);
 let source=trace?(preferred?.definitionId&&trace.sourceJokers.some(j=>j.instanceId===preferred.sourceInstanceId&&j.definitionId===preferred.definitionId)?preferred:trace.events.filter(e=>e.sourceType==='joker').map(e=>savedBenefit(run,trace,e)).find(f=>!!f?.definitionId)):undefined;
 const growth=trace?buildGrowthProgress(run).find(g=>g.before!==undefined&&g.after!==undefined&&g.before!==g.after&&trace.sourceJokers.some(j=>j.instanceId===g.instanceId&&j.definitionId===g.definitionId)&&trace.events.some(e=>e.sourceType==='joker'&&e.sourceInstanceId===g.instanceId&&e.sourceDefinitionId===g.definitionId&&['read-growth','read-coefficient'].includes(e.operation))):undefined;
 if(trace&&growth){const event=trace.events.find(e=>e.sourceType==='joker'&&e.sourceInstanceId===growth.instanceId&&e.sourceDefinitionId===growth.definitionId&&hasActualBenefit(e));if(event)source=savedBenefit(run,trace,event);}
 return {trace,character,source:source||undefined,growth,intensity:trace?outcome.intensity:1};
}
export function resultStagePlan(b:Box,short:boolean,forceSplit=false){
 const compact=b.height<336,split=forceSplit||b.width>=600||short||compact,pad=short?12:18,gap=short?12:20,inner={x:b.x+pad,y:b.y+pad,width:b.width-pad*2,height:b.height-pad*2};
 const sourceWidth=short?Math.min(170,inner.width*.42):b.width<600?Math.min(140,Math.max(120,inner.width*.4)):Math.min(300,inner.width*.32);
 const source:Box=split?{...inner,width:sourceWidth}:{...inner,y:inner.y+200,height:Math.max(0,inner.height-200)};
 const score:Box=split?{...inner,x:inner.x+sourceWidth+gap,width:inner.width-sourceWidth-gap}:{...inner,height:184};
 return {split,score,source,pad};
}
