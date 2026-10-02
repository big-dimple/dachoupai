import jokers from './r2-jokers.json';
import {EDITIONS,RANKS,type Edition,type Rank} from '../cards/types';
import type {Action} from '../domain/run';

export type R2ModeId='standard'|'challenge'|'tutorial';
export type R2Difficulty=0|1|2|3;
export type R2ChallengeId='Q01'|'Q02'|'Q03'|'Q04'|'Q05'|'Q06'|'Q07'|'Q08'|'Q09'|'Q10'|'Q11'|'Q12';
export type R2ProgramId='PG01'|'PG02'|'PG03'|'PG04';
export interface R2ModeSelection {
  readonly mode:R2ModeId;readonly difficulty:R2Difficulty;readonly challengeId:R2ChallengeId|null;readonly programsEnabled:boolean;
}
export interface R2ModeConfig {
  readonly mode:R2ModeId;readonly difficulty:R2Difficulty;readonly challengeId:R2ChallengeId|null;
  readonly targetMultiplier:{readonly n:string;readonly d:string};
  readonly baseHandSize:number;readonly baseHands:number;readonly baseDiscards:number;readonly initialGold:number;
  readonly jokerSlots:number;readonly baseInterestCap:number;
  readonly reroll:{readonly allowed:boolean;readonly start:number;readonly cap:number};
  /** Q01 disables both the passive and its initial hand-level gift, while preserving character identity. */
  readonly characterAbilityEnabled:boolean;
  readonly startingRanks:readonly Rank[];
  readonly startingJokers:readonly {readonly definitionId:string;readonly paidPrice:number;readonly edition:Edition}[];
  readonly startingChapter:number;readonly startingStageIndex:number;
  readonly programsEnabled:boolean;readonly eligibleProgramIds:readonly R2ProgramId[];
  readonly seedPolicy:{readonly kind:'free'|'fixed-set';readonly values:readonly string[]};
  readonly progressionEligible:boolean;readonly enhancementsAllowed:boolean;readonly chapterJokerBanCount:0|1;
}
type DifficultyValues=Pick<R2ModeConfig,'targetMultiplier'|'baseHandSize'|'baseHands'|'baseDiscards'|'initialGold'|'jokerSlots'|'baseInterestCap'|'reroll'>;
export interface R2DifficultyDefinition extends DifficultyValues {
  readonly id:R2Difficulty;readonly label:string;readonly unlockAfterDifficulty:0|1|2|null;
}
export interface R2ModeDefinition {
  readonly id:R2ModeId;readonly name:string;readonly difficultyIds:readonly R2Difficulty[];
  readonly challengeRequired:boolean;readonly progressionEligible:boolean;
}
export interface R2ChallengeDefinition {
  readonly id:R2ChallengeId;readonly name:string;readonly description:string;readonly config:R2ModeConfig;
  readonly setup:{readonly initialShopVisits:1;readonly priorChapters:'none'|'boss-locks-only'};
}
export type R2ProgramCondition=
  | {readonly kind:'distinct-hand-types'|'same-hand-type-plays';readonly minimum:3}
  | {readonly kind:'gold-before-reward';readonly minimum:15}
  | {readonly kind:'last-opportunity-clear'};
export type R2ProgramReward=
  | {readonly kind:'gold';readonly amount:4}
  | {readonly kind:'used-hand-upgrade';readonly levels:1;readonly maximumLevel:30;readonly selection:'uniform';readonly emptyCandidates:'skip-without-draw'}
  | {readonly kind:'next-shop-free-reroll';readonly count:1;readonly advanceRerollCount:true;readonly expires:'next-shop-exit'};
export interface R2ProgramDefinition {
  readonly id:R2ProgramId;readonly name:string;readonly requiresReroll:boolean;
  readonly condition:R2ProgramCondition;readonly reward:R2ProgramReward;
  readonly offerCount:2;readonly distinctOffers:true;readonly optional:true;readonly abandonAllowed:true;readonly abandonPenalty:0;
  readonly scope:'chapter';readonly countSource:'successful-submitted-plays';readonly skippedStagesCount:false;
  readonly rewardAt:'chapter-boss-clear';readonly maxClaimsPerChapter:1;
}
export interface R2TutorialDefinition {
  readonly characterId:'erxiang';readonly skippable:true;readonly advance:'successful-real-command';
  readonly steps:readonly {readonly id:string;readonly action:Extract<Action['type'],'PlayHand'|'DiscardHand'|'BuyOffer'>}[];
  readonly config:R2ModeConfig;
}
export interface R2ModeCatalog {
  readonly modes:readonly R2ModeDefinition[];readonly difficulties:readonly R2DifficultyDefinition[];
  readonly challenges:readonly R2ChallengeDefinition[];readonly programs:readonly R2ProgramDefinition[];
  readonly tutorial:R2TutorialDefinition;
}

const MODE_IDS:readonly R2ModeId[]=['standard','challenge','tutorial'];
const DIFFICULTY_IDS:readonly R2Difficulty[]=[0,1,2,3];
const CHALLENGE_IDS:readonly R2ChallengeId[]=['Q01','Q02','Q03','Q04','Q05','Q06','Q07','Q08','Q09','Q10','Q11','Q12'];
const PROGRAM_IDS:readonly R2ProgramId[]=['PG01','PG02','PG03','PG04'];
const BASE:DifficultyValues={targetMultiplier:{n:'1',d:'1'},baseHandSize:8,baseHands:4,baseDiscards:3,
  initialGold:6,jokerSlots:5,baseInterestCap:5,reroll:{allowed:true,start:2,cap:10}};
const DIFFICULTIES:readonly R2DifficultyDefinition[]=[
  {...BASE,id:0,label:'D0',unlockAfterDifficulty:null},
  {...BASE,id:1,label:'D1',unlockAfterDifficulty:0,targetMultiplier:{n:'6',d:'5'}},
  {...BASE,id:2,label:'D2',unlockAfterDifficulty:1,targetMultiplier:{n:'6',d:'5'},baseDiscards:2},
  {...BASE,id:3,label:'D3',unlockAfterDifficulty:2,targetMultiplier:{n:'6',d:'5'},baseDiscards:2,initialGold:4,reroll:{allowed:true,start:3,cap:11}},
];
function standardConfig(difficulty:R2Difficulty):R2ModeConfig {
  const {id:_id,label:_label,unlockAfterDifficulty:_unlock,...values}=DIFFICULTIES[difficulty];
  return {...values,mode:'standard',difficulty,challengeId:null,characterAbilityEnabled:true,
    startingRanks:[...RANKS],startingJokers:[],startingChapter:1,startingStageIndex:0,
    programsEnabled:true,eligibleProgramIds:[...PROGRAM_IDS],seedPolicy:{kind:'free',values:[]},
    progressionEligible:true,enhancementsAllowed:true,chapterJokerBanCount:0};
}
function challenge(id:R2ChallengeId,name:string,description:string,patch:Partial<R2ModeConfig>):R2ChallengeDefinition {
  const config:R2ModeConfig={...standardConfig(0),...patch,mode:'challenge',difficulty:0,challengeId:id,
    seedPolicy:{kind:'fixed-set',values:[0,1,2].map(index=>`challenge/${id.toLowerCase()}/${index}`)},progressionEligible:false};
  return {id,name,description,config,setup:{initialShopVisits:1,priorChapters:id==='Q12'?'boss-locks-only':'none'}};
}
const CHALLENGES:readonly R2ChallengeDefinition[]=[
  challenge('Q01','本色演出','关闭角色被动及初始牌型等级赠送；保留所选角色身份。',{characterAbilityEnabled:false}),
  challenge('Q02','三席舞台','基础大丑牌槽位为3。',{jokerSlots:3}),
  challenge('Q03','无息开场','基础利息上限为0，后续利息增益仍可生效。',{baseInterestCap:0}),
  challenge('Q04','数字剧团','移除J、Q、K，保留2–10与A，共40张。',{startingRanks:[2,3,4,5,6,7,8,9,10,14]}),
  challenge('Q05','短牌巡演','每花色只保留7–A，共32张。',{startingRanks:[7,8,9,10,11,12,13,14]}),
  challenge('Q06','不换节目','禁止付费和免费刷新；节目单不提供刷新券。',{reroll:{allowed:false,start:2,cap:10},eligibleProgramIds:['PG01','PG02','PG03']}),
  challenge('Q07','袖珍手牌','基础手牌上限为6。',{baseHandSize:6}),
  challenge('Q08','一次取舍','基础弃牌次数为1。',{baseDiscards:1}),
  challenge('Q09','名角空囊','0金开局，免费持有普通版次的回马枪与包场；实际支付0，出售各1。',{
    initialGold:0,startingJokers:[{definitionId:'huimaqiang',paidPrice:0,edition:'none'},{definitionId:'e08',paidPrice:0,edition:'none'}]}),
  challenge('Q10','原纸舞台','禁止增强牌的获取与赋予，独立版次仍可使用。',{enhancementsAllowed:false}),
  challenge('Q11','每章封角','每章公开封禁一个大丑牌定义的计分与版次；静态、经济及非数学生命周期保留。',{chapterJokerBanCount:1}),
  challenge('Q12','中途登场','从第三章暖场前唯一准备商店开始，20金；前两章只锁合法Boss历史，不赠资源。',{
    startingChapter:3,startingStageIndex:6,initialGold:20}),
];
const PROGRAM_POLICY={offerCount:2,distinctOffers:true,optional:true,abandonAllowed:true,abandonPenalty:0,
  scope:'chapter',countSource:'successful-submitted-plays',skippedStagesCount:false,rewardAt:'chapter-boss-clear',maxClaimsPerChapter:1} as const;
const PROGRAMS:readonly R2ProgramDefinition[]=[
  {...PROGRAM_POLICY,id:'PG01',name:'换场大师',requiresReroll:false,condition:{kind:'distinct-hand-types',minimum:3},reward:{kind:'gold',amount:4}},
  {...PROGRAM_POLICY,id:'PG02',name:'一招鲜',requiresReroll:false,condition:{kind:'same-hand-type-plays',minimum:3},reward:{kind:'gold',amount:4}},
  {...PROGRAM_POLICY,id:'PG03',name:'不打烊',requiresReroll:false,condition:{kind:'gold-before-reward',minimum:15},
    reward:{kind:'used-hand-upgrade',levels:1,maximumLevel:30,selection:'uniform',emptyCandidates:'skip-without-draw'}},
  {...PROGRAM_POLICY,id:'PG04',name:'谢幕留客',requiresReroll:true,condition:{kind:'last-opportunity-clear'},
    reward:{kind:'next-shop-free-reroll',count:1,advanceRerollCount:true,expires:'next-shop-exit'}},
];
const CATALOG:R2ModeCatalog={
  modes:[
    {id:'standard',name:'普通种子局',difficultyIds:[0,1,2,3],challengeRequired:false,progressionEligible:true},
    {id:'challenge',name:'挑战',difficultyIds:[0],challengeRequired:true,progressionEligible:false},
    {id:'tutorial',name:'教程',difficultyIds:[0],challengeRequired:false,progressionEligible:false},
  ],
  difficulties:DIFFICULTIES,challenges:CHALLENGES,programs:PROGRAMS,
  tutorial:{characterId:'erxiang',skippable:true,advance:'successful-real-command',
    steps:[{id:'select-and-score',action:'PlayHand'},{id:'discard-and-keep',action:'DiscardHand'},{id:'buy-and-compare',action:'BuyOffer'}],
    config:{...standardConfig(0),mode:'tutorial',programsEnabled:false,eligibleProgramIds:[],
      seedPolicy:{kind:'fixed-set',values:['r2/tutorial/core-v1']},progressionEligible:false}},
};

/** JSON data only: accessors, symbols, sparse arrays and executable properties are rejected without invoking them. */
function record(value:unknown):value is Record<string,unknown> {
  if(value===null||typeof value!=='object'||Array.isArray(value))return false;
  const prototype=Object.getPrototypeOf(value);
  if(prototype!==Object.prototype&&prototype!==null)return false;
  return Reflect.ownKeys(value).every(key=>typeof key==='string'&&dataProperty(value,key));
}
function dataProperty(value:object,key:string):boolean {
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  return !!descriptor&&Object.hasOwn(descriptor,'value')&&descriptor.enumerable===true;
}
function list(value:unknown):value is unknown[] {
  return Array.isArray(value)&&Reflect.ownKeys(value).length===value.length+1&&
    Array.from({length:value.length},(_,index)=>String(index)).every(key=>dataProperty(value,key));
}
function shape(value:Record<string,unknown>,keys:readonly string[]):boolean {
  const actual=Object.keys(value);return actual.length===keys.length&&actual.every(key=>keys.includes(key));
}
function same(value:unknown,expected:unknown):boolean {
  if(Array.isArray(expected))return list(value)&&value.length===expected.length&&expected.every((item,index)=>same(value[index],item));
  if(expected!==null&&typeof expected==='object')return record(value)&&shape(value,Object.keys(expected))&&
    Object.entries(expected).every(([key,item])=>same(value[key],item));
  return value===expected;
}
const integer=(value:unknown,min=0):value is number=>Number.isSafeInteger(value)&&(value as number)>=min;
const text=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=4096;
const configKeys=['mode','difficulty','challengeId','targetMultiplier','baseHandSize','baseHands','baseDiscards','initialGold',
  'jokerSlots','baseInterestCap','reroll','characterAbilityEnabled','startingRanks','startingJokers','startingChapter','startingStageIndex',
  'programsEnabled','eligibleProgramIds','seedPolicy','progressionEligible','enhancementsAllowed','chapterJokerBanCount'] as const;
function configErrors(value:unknown,path:string):string[] {
  const errors:string[]=[];
  const check=(ok:boolean,key:string)=>{if(!ok)errors.push(`${path}/${key}: invalid value`);};
  if(!record(value)||!shape(value,configKeys))return [`${path}: invalid config fields`];
  check(MODE_IDS.includes(value.mode as R2ModeId),'mode');
  const multiplier=r2DifficultyTargetMultiplier(value.difficulty);
  check(!!multiplier,'difficulty');check(same(value.targetMultiplier,multiplier),'targetMultiplier');
  check(value.challengeId===null||CHALLENGE_IDS.includes(value.challengeId as R2ChallengeId),'challengeId');
  for(const key of ['baseHandSize','baseHands','startingChapter'])check(integer(value[key],1),key);
  for(const key of ['baseDiscards','initialGold','jokerSlots','baseInterestCap','startingStageIndex'])check(integer(value[key]),key);
  const reroll=value.reroll;
  check(record(reroll)&&shape(reroll,['allowed','start','cap'])&&typeof reroll.allowed==='boolean'&&integer(reroll.start)&&integer(reroll.cap)&&reroll.cap>=reroll.start,'reroll');
  for(const key of ['characterAbilityEnabled','programsEnabled','progressionEligible','enhancementsAllowed'])check(typeof value[key]==='boolean',key);
  check(value.chapterJokerBanCount===0||value.chapterJokerBanCount===1,'chapterJokerBanCount');
  const ranks=value.startingRanks;
  check(list(ranks)&&[8,10,13].includes(ranks.length)&&new Set(ranks).size===ranks.length&&ranks.every(rank=>RANKS.includes(rank as Rank)),'startingRanks');
  const startingJokers=value.startingJokers;
  check(list(startingJokers)&&integer(value.jokerSlots)&&startingJokers.length<=value.jokerSlots&&startingJokers.every(joker=>
    record(joker)&&shape(joker,['definitionId','paidPrice','edition'])&&jokers.some(definition=>definition.id===joker.definitionId)&&
    integer(joker.paidPrice)&&EDITIONS.includes(joker.edition as Edition))&&
    new Set(startingJokers.map(joker=>record(joker)?joker.definitionId:null)).size===startingJokers.length,'startingJokers');
  const seed=value.seedPolicy;
  check(record(seed)&&shape(seed,['kind','values'])&&list(seed.values)&&seed.values.every(text)&&new Set(seed.values).size===seed.values.length&&
    (seed.kind==='free'?seed.values.length===0:seed.kind==='fixed-set'&&seed.values.length>0&&seed.values.length<=3),'seedPolicy');
  const programs=value.eligibleProgramIds;
  check(list(programs)&&new Set(programs).size===programs.length&&programs.every(id=>PROGRAM_IDS.includes(id as R2ProgramId))&&
    (value.programsEnabled===true||programs.length===0)&&(!record(reroll)||reroll.allowed!==false||!programs.includes('PG04')),'eligibleProgramIds');
  check(integer(value.startingChapter,1)&&value.startingChapter<=8&&value.startingStageIndex===(value.startingChapter-1)*3,'startingPosition');
  check(value.mode==='challenge'?value.difficulty===0&&value.challengeId!==null:value.challengeId===null,'modeChallenge');
  check(value.mode==='standard'||value.difficulty===0&&value.progressionEligible===false,'modeDifficulty');
  check(value.mode!=='tutorial'||value.programsEnabled===false,'tutorialPrograms');
  return errors;
}

/** This catalog is a finite D31 contract, not a generic challenge or reward scripting language. */
export function validateR2ModeCatalog(value:unknown):string[] {
  if(!record(value)||!shape(value,['modes','difficulties','challenges','programs','tutorial']))return ['catalog: invalid root fields'];
  const catalog=value;
  const errors:string[]=[];
  function rows(key:'modes'|'difficulties'|'challenges'|'programs',expected:readonly {readonly id:string|number}[],validate:(row:Record<string,unknown>,contract:typeof expected[number],path:string)=>void):void {
    const entries=catalog[key];
    if(!list(entries)||entries.length!==expected.length){errors.push(`${key}: invalid row count/data`);return;}
    const seen=new Set<unknown>();
    for(const [index,row] of entries.entries()){
      const path=`${key}[${index}]`;
      if(!record(row)){errors.push(`${path}: invalid row fields`);continue;}
      const contract=expected.find(item=>item.id===row.id);
      if(!contract||seen.has(row.id)){errors.push(`${path}: invalid/duplicate id`);continue;}
      seen.add(row.id);validate(row,contract,path);
    }
  }
  rows('modes',CATALOG.modes,(row,contract,path)=>{
    if(!text(row.name)||!same({...row,name:undefined},{...contract,name:undefined}))errors.push(`${path}: invalid mode contract`);
  });
  rows('difficulties',DIFFICULTIES,(row,contract,path)=>{
    if(!same(row,contract))errors.push(`${path}: invalid cumulative difficulty contract`);
  });
  rows('challenges',CHALLENGES,(row,contract,path)=>{
    errors.push(...configErrors(row.config,`${path}/config`));
    if(!text(row.name)||!text(row.description)||!same({...row,name:undefined,description:undefined},{...contract,name:undefined,description:undefined}))
      errors.push(`${path}: invalid isolated challenge contract`);
  });
  rows('programs',PROGRAMS,(row,contract,path)=>{
    if(!same(row,contract))errors.push(`${path}: invalid program condition/reward/policy`);
  });
  const tutorial=value.tutorial;
  errors.push(...configErrors(record(tutorial)?tutorial.config:undefined,'tutorial/config'));
  if(!same(tutorial,CATALOG.tutorial))errors.push('tutorial: invalid fixed tutorial contract');
  return errors;
}
function freeze<T>(value:T):T {
  if(value!==null&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}
  return value;
}
const errors=validateR2ModeCatalog(CATALOG);
if(errors.length)throw Error(`invalid-r2-modes: ${errors.join('; ')}`);
export const R2_MODE_CATALOG=freeze(CATALOG);

export type R2ModeResolveCode='invalid-mode-config'|'invalid-mode'|'invalid-difficulty'|'invalid-challenge'|'invalid-programs-switch'|'incompatible-mode-config';
export function resolveR2ModeConfig(input:unknown):{ok:true;config:R2ModeConfig}|{ok:false;code:R2ModeResolveCode} {
  if(!record(input)||Object.keys(input).some(key=>!['mode','difficulty','challengeId','programsEnabled'].includes(key)))return {ok:false,code:'invalid-mode-config'};
  if(!MODE_IDS.includes(input.mode as R2ModeId))return {ok:false,code:'invalid-mode'};
  const mode=input.mode as R2ModeId,difficulty=Object.hasOwn(input,'difficulty')?input.difficulty:0;
  if(!DIFFICULTY_IDS.includes(difficulty as R2Difficulty))return {ok:false,code:'invalid-difficulty'};
  const challengeId=Object.hasOwn(input,'challengeId')?input.challengeId:null;
  if(mode==='challenge'?!CHALLENGE_IDS.includes(challengeId as R2ChallengeId):challengeId!==null)return {ok:false,code:'invalid-challenge'};
  const programsEnabled=Object.hasOwn(input,'programsEnabled')?input.programsEnabled:mode!=='tutorial';
  if(typeof programsEnabled!=='boolean')return {ok:false,code:'invalid-programs-switch'};
  if(mode!=='standard'&&difficulty!==0||mode==='tutorial'&&programsEnabled)return {ok:false,code:'incompatible-mode-config'};
  const config=mode==='standard'?standardConfig(difficulty as R2Difficulty):mode==='tutorial'?R2_MODE_CATALOG.tutorial.config:
    R2_MODE_CATALOG.challenges.find(row=>row.id===challengeId)!.config;
  return {ok:true,config:freeze(programsEnabled?config:{...config,programsEnabled:false,eligibleProgramIds:[]})};
}

/** Free seeds preserve exact text; challenge/tutorial seeds must match an approved fixed entry. */
export function r2ModeSeedAllowed(config:R2ModeConfig,seed:unknown):boolean {
  return text(seed)&&(config.seedPolicy.kind==='free'||config.seedPolicy.values.includes(seed));
}

/** A live v10 state must carry its explicit selection; restoration never silently supplies D0. */
export function r2RunModeConfig(selection:R2ModeSelection):R2ModeConfig {
  const result=resolveR2ModeConfig({mode:selection.mode,difficulty:selection.difficulty,
    challengeId:selection.challengeId,programsEnabled:selection.programsEnabled});
  if(!result.ok)throw Error(result.code);
  return result.config;
}

export function r2ModeStorageKey(selection:R2ModeSelection,contentHash:string):string {
  const config=r2RunModeConfig(selection);
  return `r2:${contentHash}:${config.mode}:${config.challengeId??'none'}:d${config.difficulty}:program-${config.programsEnabled?'on':'off'}`;
}

/** Final cumulative ratio only. Callers combine every target factor before their single final ceil. */
export function r2DifficultyTargetMultiplier(difficulty:unknown):{n:string;d:string}|undefined {
  if(difficulty===0)return {n:'1',d:'1'};
  if(difficulty===1||difficulty===2||difficulty===3)return {n:'6',d:'5'};
  return undefined;
}
