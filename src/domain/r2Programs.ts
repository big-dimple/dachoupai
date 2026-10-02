import {R2_MODE_CATALOG,type R2ModeConfig,type R2ProgramId} from '../content/r2Modes';
import {SeededRng,type RngSnapshot} from '../core/SeededRng';
import {R2_HAND_TYPES,type R2HandType} from './evaluateR2';
import {R2_AVAILABLE_CHAPTERS,R2_ENDLESS_MAX_CHAPTER} from './r2Chapter';

export type R2ProgramState={
  chapter:number;offerIds:R2ProgramId[];selectedId:R2ProgramId|null;choiceMade:boolean;
  abandoned:boolean;lastOpportunityClear:boolean;claimed:boolean;
};
export type R2ProgramResult={ok:true;program:R2ProgramState}|{ok:false;code:string};
const positiveInteger=(value:unknown):value is number=>Number.isSafeInteger(value)&&(value as number)>0;
const definition=(id:unknown)=>R2_MODE_CATALOG.programs.find(program=>program.id===id);
function chapterValid(config:R2ModeConfig,chapter:number):boolean {
  // The run validates normal/endless separately; this boundary accepts only their existing finite range.
  return positiveInteger(chapter)&&chapter>=config.startingChapter&&
    chapter<=(config.mode==='standard'?R2_ENDLESS_MAX_CHAPTER:R2_AVAILABLE_CHAPTERS);
}
function poolValid(config:R2ModeConfig):boolean {
  const pool=config.eligibleProgramIds;
  return pool.length>=2&&pool.length<=4&&new Set(pool).size===pool.length&&pool.every(id=>{
    const contract=definition(id);return !!contract&&(!contract.requiresReroll||config.reroll.allowed);
  });
}

/** Only the dedicated program cursor advances; callers lock this once when the chapter starts. */
export function lockR2ProgramChapter(config:R2ModeConfig,chapter:number,cursor:RngSnapshot):{program:R2ProgramState|null;cursor:RngSnapshot} {
  if(!chapterValid(config,chapter))throw Error('invalid-program-chapter');
  if(!config.programsEnabled)return {program:null,cursor};
  if(!poolValid(config))throw Error('invalid-program-pool');
  const rng=SeededRng.restore(cursor),pool=[...config.eligibleProgramIds];
  const first=pool.splice(rng.integer(0,pool.length-1),1)[0];
  const second=pool[rng.integer(0,pool.length-1)];
  return {program:{chapter,offerIds:[first,second],selectedId:null,choiceMade:false,
    abandoned:false,lastOpportunityClear:false,claimed:false},cursor:rng.snapshot()};
}
export function chooseR2Program(program:R2ProgramState,id:R2ProgramId|null):R2ProgramResult {
  if(program.choiceMade)return {ok:false,code:'program-choice-made'};
  if(id!==null&&(!definition(id)||!program.offerIds.includes(id)))return {ok:false,code:'invalid-program-offer'};
  return {ok:true,program:{...program,selectedId:id,choiceMade:true}};
}
export function abandonR2Program(program:R2ProgramState):R2ProgramResult {
  if(program.claimed)return {ok:false,code:'program-reward-claimed'};
  if(program.abandoned)return {ok:false,code:'program-abandoned'};
  if(!program.choiceMade||program.selectedId===null)return {ok:false,code:'no-selected-program'};
  return {ok:true,program:{...program,abandoned:true}};
}
/** Entering the first real stage makes an unanswered offer an explicit no-choice. */
export function sealR2ProgramChoice(program:R2ProgramState):R2ProgramState {
  return program.choiceMade?program:{...program,selectedId:null,choiceMade:true};
}

/** Qualification is read-only. Actual Boss success, pre-reward gold and unique payout belong to the command. */
export function r2ProgramQualified(program:R2ProgramState,usage:Partial<Record<R2HandType,number>>,goldBeforeRewards:number):boolean {
  if(!program.choiceMade||program.selectedId===null||program.abandoned||program.claimed||
    !program.offerIds.includes(program.selectedId))return false;
  const contract=definition(program.selectedId);
  if(!contract)return false;
  const condition=contract.condition;
  switch(condition.kind){
    case 'distinct-hand-types':return R2_HAND_TYPES.filter(type=>positiveInteger(usage[type])).length>=condition.minimum;
    case 'same-hand-type-plays':return R2_HAND_TYPES.some(type=>positiveInteger(usage[type])&&usage[type]!>=condition.minimum);
    case 'gold-before-reward':return Number.isSafeInteger(goldBeforeRewards)&&goldBeforeRewards>=condition.minimum;
    case 'last-opportunity-clear':return program.lastOpportunityClear===true;
  }
}
export function r2ProgramUpgradeCandidates(usage:Partial<Record<R2HandType,number>>,levels:Partial<Record<R2HandType,number>>):R2HandType[] {
  return R2_HAND_TYPES.filter(type=>{
    const level=levels[type]??1;
    return positiveInteger(usage[type])&&positiveInteger(level)&&level<30;
  });
}

function dataProperty(value:object,key:string):boolean {
  const property=Object.getOwnPropertyDescriptor(value,key);
  return !!property&&Object.hasOwn(property,'value')&&property.enumerable===true;
}
function record(value:unknown):value is Record<string,unknown> {
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const prototype=Object.getPrototypeOf(value);
  return (prototype===Object.prototype||prototype===null)&&
    Reflect.ownKeys(value).every(key=>typeof key==='string'&&dataProperty(value,key));
}
function offers(value:unknown):value is R2ProgramId[] {
  return Array.isArray(value)&&Object.getPrototypeOf(value)===Array.prototype&&value.length===2&&Reflect.ownKeys(value).length===3&&
    dataProperty(value,'0')&&dataProperty(value,'1')&&new Set(value).size===2&&value.every(id=>!!definition(id));
}
const stateKeys=['chapter','offerIds','selectedId','choiceMade','abandoned','lastOpportunityClear','claimed'] as const;

/** Checks only facts in the snapshot; counters, historical gold and actual Boss success remain run/trace facts. */
export function r2ProgramStateValid(value:unknown,config:R2ModeConfig,chapter:number):boolean {
  if(!chapterValid(config,chapter))return false;
  if(!config.programsEnabled)return value===null;
  if(!poolValid(config)||!record(value)||Object.keys(value).length!==stateKeys.length||
    Object.keys(value).some(key=>!stateKeys.includes(key as typeof stateKeys[number])))return false;
  if(value.chapter!==chapter||!offers(value.offerIds)||
    !value.offerIds.every(id=>config.eligibleProgramIds.includes(id)))return false;
  if(['choiceMade','abandoned','lastOpportunityClear','claimed'].some(key=>typeof value[key]!=='boolean'))return false;
  if(value.selectedId!==null&&!value.offerIds.includes(value.selectedId as R2ProgramId))return false;
  if(!value.choiceMade)return value.selectedId===null&&!value.abandoned&&!value.claimed&&!value.lastOpportunityClear;
  if(value.abandoned&&(value.selectedId===null||value.claimed))return false;
  if(value.claimed&&(value.selectedId===null||value.abandoned||value.selectedId==='PG04'&&!value.lastOpportunityClear))return false;
  return true;
}
