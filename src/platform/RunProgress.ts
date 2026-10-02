import {r2EmptyProgress,readR2Progress,r2ProgressAfterSavedRun,type R2Progress} from '../domain/r2Progress';
import type {R2RunState} from '../domain/r2Run';

export const RUN_PROGRESS_KEY='dachoupai.r2.progress.v1';
export type ProgressStorage=Pick<Storage,'getItem'|'setItem'>;
export interface RunProgressResult {ok:boolean;changed:boolean;progress:R2Progress;code?:string}

export function readRunProgress(storage?:ProgressStorage):RunProgressResult {
  let raw:string|null;
  try {raw=(storage??globalThis.localStorage).getItem(RUN_PROGRESS_KEY);} catch {return {ok:false,changed:false,progress:r2EmptyProgress(),code:'progress-storage-error'};}
  if(raw===null)return {ok:true,changed:false,progress:r2EmptyProgress()};
  let progress:R2Progress|undefined;
  try {progress=readR2Progress(JSON.parse(raw));} catch { /* Keep the original bytes available for recovery. */ }
  return progress?{ok:true,changed:false,progress}:{ok:false,changed:false,progress:r2EmptyProgress(),code:'invalid-progress'};
}

/** Call only after a writable Session successfully publishes or restores a committed checkpoint. */
export function recordSavedRunProgress(state:R2RunState,storage?:ProgressStorage):RunProgressResult {
  const current=readRunProgress(storage);if(!current.ok)return current;
  const next=r2ProgressAfterSavedRun(current.progress,state);if(!next.changed)return current;
  try {(storage??globalThis.localStorage).setItem(RUN_PROGRESS_KEY,JSON.stringify(next.progress));}
  catch {return {...current,ok:false,code:'progress-storage-error'};}
  return {ok:true,...next};
}
