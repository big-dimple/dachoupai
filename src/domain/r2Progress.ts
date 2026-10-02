import {r2RunModeConfig,type R2ModeSelection} from '../content/r2Modes';
import {assertR2Invariants,type R2RunState} from './r2Run';

export interface R2Progress {readonly version:1;readonly standardWins:readonly [boolean,boolean,boolean,boolean]}
export const r2EmptyProgress=():R2Progress=>({version:1,standardWins:[false,false,false,false]});

export function readR2Progress(value:unknown):R2Progress|undefined {
  if(value===null||typeof value!=='object'||Array.isArray(value))return;
  const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(fields);
  if(keys.length!==2||!keys.includes('version')||!keys.includes('standardWins')||
    !Object.hasOwn(fields.version,'value')||!Object.hasOwn(fields.standardWins,'value')||fields.version.value!==1)return;
  const wins=fields.standardWins.value;
  if(!Array.isArray(wins)||wins.length!==4||Reflect.ownKeys(wins).length!==5||
    [0,1,2,3].some(i=>!Object.hasOwn(wins,i)||typeof Object.getOwnPropertyDescriptor(wins,i)?.value!=='boolean'))return;
  return {version:1,standardWins:[wins[0],wins[1],wins[2],wins[3]]};
}

export function r2DifficultyUnlocked(progress:R2Progress,difficulty:unknown):boolean {
  if(difficulty===0)return true;
  return (difficulty===1||difficulty===2||difficulty===3)&&progress.standardWins[difficulty-1];
}

export function r2ModeUnlocked(progress:R2Progress,selection:R2ModeSelection):boolean {
  try {
    const config=r2RunModeConfig(selection);
    return config.mode==='tutorial'||(config.mode==='standard'?r2DifficultyUnlocked(progress,config.difficulty):progress.standardWins.some(Boolean));
  } catch {return false;}
}

/** The caller must supply the committed SavedRun state, never an exported pending candidate. */
export function r2ProgressAfterSavedRun(progress:R2Progress,state:R2RunState):{changed:boolean;progress:R2Progress} {
  const {stage,normalCompletion:completion}=state;
  if(state.mode!=='standard'||state.tourMode!=='normal'||state.phase!=='run-won'||state.chapter!==8||state.stageIndex!==24||
    stage?.index!==23||stage.clearId!==`${state.runId}/clear/23`||state.outcome?.reason!=='all-stages-cleared'||state.outcome.stageIndex!==23||
    !completion||completion.clearId!==stage.clearId||completion.totalHeat!==state.totalHeat||
    ![0,1,2,3].includes(state.difficulty)||progress.standardWins[state.difficulty])return {changed:false,progress};
  try {
    assertR2Invariants(state);
    if(BigInt(stage.heat)<BigInt(stage.targetHeat))return {changed:false,progress};
  } catch {return {changed:false,progress};}
  const standardWins:[boolean,boolean,boolean,boolean]=[...progress.standardWins];standardWins[state.difficulty]=true;
  return {changed:true,progress:{version:1,standardWins}};
}
