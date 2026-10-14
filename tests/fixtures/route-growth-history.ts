import {isR2CoreBuild} from '../../src/domain/r2GroupUpgrade';
import {lockR2ChapterTargets} from '../../src/domain/r2Chapter';
import type {R2RunState} from '../../src/domain/run';

/** Only for controlled test fixtures that jump straight to a later Boss.
 * Prior mandatory Boss clears have no claimed family; this is not gameplay evidence.
 * Production commands and corrupted-import checks never call this helper.
 */
export function completeControlledRouteHistory(state:R2RunState):void {
  if(isR2CoreBuild(state))state.chapterTargetPlan=lockR2ChapterTargets(state.chapter,state.tourMode,state.difficulty,state.boss);
  const history=state.routeGrowth;if(!history)return;
  if(state.phase!=='stage-ready'||state.stage!==null)throw Error('controlled-history-requires-unentered-stage');
  for(let index=2;index<state.stageIndex;index+=3){
    if(history.settlements.some(s=>s.stageIndex===index))continue;
    history.settlements.push({stageIndex:index,families:[]});history.clears++;
  }
  history.settlements.sort((a,b)=>a.stageIndex-b.stageIndex);
}
