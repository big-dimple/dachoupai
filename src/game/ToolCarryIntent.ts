import type {R2RunState} from '../domain/run';
import {R2_TOOLS} from '../content/r2Tools';
import {r2ToolAllowed} from '../domain/r2ToolRuntime';

/** Ephemeral scene data, never a command or part of a checkpoint. */
export interface ToolCarryIntent {runId:string;stageIndex:number;shopSeq:number;instanceId:string}

export function canCarryTool(state:R2RunState,instanceId:string):boolean {
  const item=state.consumables.find(c=>c.instanceId===instanceId),tool=item&&R2_TOOLS.find(t=>t.id===item.definitionId);
  return !!tool&&r2ToolAllowed(state,tool.id)&&tool.phases.includes('shop')&&tool.phases.includes('await-input')&&['cards','card-sacrifice','card-or-joker'].includes(tool.target.kind);
}
export function carriedToolAtEntry(state:R2RunState,intent?:ToolCarryIntent):boolean {
  return !!intent&&state.phase==='stage-ready'&&state.runId===intent.runId&&state.stageIndex===intent.stageIndex&&state.commandSeq===intent.shopSeq+1&&canCarryTool(state,intent.instanceId);
}
export function carriedToolAtHand(state:R2RunState,intent?:ToolCarryIntent):boolean {
  return !!intent&&state.phase==='await-input'&&state.runId===intent.runId&&state.stageIndex===intent.stageIndex&&state.commandSeq===intent.shopSeq+2&&canCarryTool(state,intent.instanceId);
}
