export type BuildFocus='group'|'straight'|'flush';
export const BUILD_FOCUS:readonly BuildFocus[]=['group','straight','flush'];
export const BUILD_DIRECTION_KEY='dachoupai.build-direction.v1';
const LIMIT=8;
interface Entry {runId:string;focus:BuildFocus}
interface Storage {getItem(key:string):string|null;setItem(key:string,value:string):void}
const valid=(v:unknown):v is Entry=>!!v&&typeof v==='object'&&Object.keys(v).length===2&&typeof (v as Entry).runId==='string'&&(v as Entry).runId.length>0&&(v as Entry).runId.length<=512&&BUILD_FOCUS.includes((v as Entry).focus);
/** Optional local preferences, never checkpoint state or a source of gameplay facts. */
export function decodeBuildDirections(raw:string|null):Entry[]{
 if(!raw||raw.length>8192)return [];
 try{const value=JSON.parse(raw);if(value.version!==1||!Array.isArray(value.entries)||value.entries.length>LIMIT||!value.entries.every(valid)||new Set(value.entries.map((e:Entry)=>e.runId)).size!==value.entries.length)return [];return value.entries;}catch{return [];}
}
export function createBuildDirections(storage:()=>Storage){
 let entries:Entry[]|undefined,local=true;
 const load=()=>{if(!entries){try{entries=decodeBuildDirections(storage().getItem(BUILD_DIRECTION_KEY));}catch{entries=[];local=false;}}return entries;};
 return {
  current(runId:string,fallback?:BuildFocus):BuildFocus|undefined{return load().find(e=>e.runId===runId)?.focus??fallback;},
  choose(runId:string,focus:BuildFocus):boolean {
   if(!valid({runId,focus}))return false;
   entries=[...load().filter(e=>e.runId!==runId),{runId,focus}].slice(-LIMIT);
   try{storage().setItem(BUILD_DIRECTION_KEY,JSON.stringify({version:1,entries}));local=true;}catch{local=false;}
   return local;
  },
  retention(runId:string):'local'|'session'|'opening'{return load().some(e=>e.runId===runId)?local?'local':'session':'opening';},
 };
}
const directions=createBuildDirections(()=>globalThis.localStorage);
export const currentBuildFocus=directions.current;
export const chooseBuildFocus=directions.choose;
export const buildFocusRetention=directions.retention;
