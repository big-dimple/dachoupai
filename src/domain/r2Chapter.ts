import type {PlayingCard,Suit} from '../cards/types';
import {SUITS,SUIT_SYMBOL} from '../cards/types';
import {r2DifficultyTargetMultiplier} from '../content/r2Modes';
import type {SeededRng} from '../core/SeededRng';
import {MAX_INTEGER_DIGITS} from './rational';

export const R2_TARGETS = [400,1000,2400,5600,13000,30000,70000,160000] as const;
export type R2TourMode='normal'|'endless';
export const R2_ENDLESS_MAX_CHAPTER=10766;
export const R2_ENDLESS_CONTRACT=Object.freeze({
  normalChapters:R2_TARGETS.length,firstChapter:R2_TARGETS.length+1,maximumChapter:R2_ENDLESS_MAX_CHAPTER,
  baseHeat:String(R2_TARGETS[R2_TARGETS.length-1]),multiplier:Object.freeze({n:'12',d:'5'}),
  stageMultipliers:Object.freeze([Object.freeze({n:'1',d:'1'}),Object.freeze({n:'3',d:'2'}),Object.freeze({n:'2',d:'1'})] as const),
  rounding:'ceil-final-target',integerDigits:MAX_INTEGER_DIGITS,bossPool:'B01-B16',
} as const);
const chapterMaximum=(tourMode:R2TourMode):number|undefined=>tourMode==='normal'?R2_TARGETS.length:tourMode==='endless'?R2_ENDLESS_MAX_CHAPTER:undefined;
export interface R2StageSpec {index:number;name:string;intro:string;targetHeat:string}

/** Difficulty and explicit endless lookup share one final ceiling; current runs still default to D0. */
export function r2StageSpec(index:number,tourMode:R2TourMode='normal',difficulty:number=0):R2StageSpec|undefined {
  const maximum=chapterMaximum(tourMode),difficultyMultiplier=r2DifficultyTargetMultiplier(difficulty);
  if(maximum===undefined||!difficultyMultiplier||!Number.isSafeInteger(index)||index<0||index>=maximum*3)return undefined;
  const chapter=Math.floor(index/3)+1,multiplier=R2_ENDLESS_CONTRACT.stageMultipliers[index%3];
  let numerator:bigint,denominator:bigint;
  if(chapter<=R2_TARGETS.length){numerator=BigInt(R2_TARGETS[chapter-1]);denominator=1n;}
  else {
    const exponent=BigInt(chapter-R2_TARGETS.length);
    // Intermediate integers exceed Rational's input limit even when their quotient fits the score service.
    numerator=BigInt(R2_ENDLESS_CONTRACT.baseHeat)*(BigInt(R2_ENDLESS_CONTRACT.multiplier.n)**exponent);
    denominator=BigInt(R2_ENDLESS_CONTRACT.multiplier.d)**exponent;
  }
  numerator*=BigInt(multiplier.n)*BigInt(difficultyMultiplier.n);
  denominator*=BigInt(multiplier.d)*BigInt(difficultyMultiplier.d);
  const targetHeat=((numerator+denominator-1n)/denominator).toString();
  if(targetHeat.length>R2_ENDLESS_CONTRACT.integerDigits)return undefined;
  return {index,name:`第 ${chapter} 章 · ${['暖场','正场','压轴'][index%3]}`,intro:'打到目标热度即可过场，出牌和弃牌次数每场补满。',targetHeat};
}

const NOMINAL_R2_BOSS_IDS=['B01','B02','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12','B13','B14','B15','B16'] as const;
export type R2NominalBossId=typeof NOMINAL_R2_BOSS_IDS[number];

/** The ordered chapter pool; the run's mode and completion eligibility are validated separately. */
export function r2ChapterBossIds(chapter:number,tourMode:R2TourMode='normal'):readonly R2NominalBossId[]|undefined {
  const maximum=chapterMaximum(tourMode);
  if(maximum===undefined||!Number.isSafeInteger(chapter)||chapter<1||chapter>maximum)return undefined;
  return NOMINAL_R2_BOSS_IDS.slice(0,chapter<=2?4:chapter<=6?12:16);
}

export const R2_AVAILABLE_CHAPTERS=8;
export const R2_BOSSES=[
  {id:'B01',name:'贵宾场',rule:'第一手前每次弃牌消耗2次额度；第一手后恢复1次。',response:'先判断手牌能否开场，保留足够额度再弃牌。'},
  {id:'B02',name:'低调点',rule:'所出第4/5张不给普通点数；仍成型且明确的大丑牌效果正常。',response:'可调手牌顺序，让高点数或关键普通点数排前面。'},
  {id:'B03',name:'单色灯',rule:'公开花色本场失效；仍参与牌型，但不加点数或计分牌效果。',response:'用其他花色计分，或保留失效牌来凑牌型。'},
  {id:'B04',name:'素颜场',rule:'J/Q/K本场失效；A不受影响。',response:'数字牌和A能计分，失效人头仍能组成牌型。'},
  {id:'B05',name:'回音墙',rule:'连续两手同牌型时，本手等级计算后的牌型基础热度减半；普通点数和大丑牌热度不减，首手不减。',response:'交替使用两种可成型牌型，或用点数、增强和大丑牌补足热度。'},
  {id:'B06',name:'半边灯',rule:'当前第2/4槽大丑牌计分和版次停用；静态资源和经济效果保留，出牌前可调序。',response:'把关键计分牌放在第1/3/5槽，资源或经济牌可放在受限槽。'},
  {id:'B07',name:'验票员',rule:'每次弃牌先消耗1金；无钱仍可正常出牌，但弃牌拒绝且整笔操作不变。',response:'留出弃牌费用；弃牌后的返金不能抵本次入场费用。'},
  {id:'B08',name:'静场',rule:'角色计分能力本场停用；初始等级和非计分过关奖励保留，骰爷不能押注。',response:'用牌型、增强和大丑牌完成计分，谢幕人的成功额外金币仍保留。'},
  {id:'B09',name:'快板',rule:'进场出牌次数-1，最低2；与加演许可和永久代价合并后计算。',response:'进场前安排加演许可；珍惜每次出牌，提高单手完成度。'},
  {id:'B10',name:'小舞台',rule:'进场手牌上限-2，最低5；入场预算固定，旋转或续局不重抽。',response:'用宽桌面和增加手牌上限的大丑牌准备本场，减少必须同时攒齐的牌。'},
  {id:'B11',name:'谢客',rule:'每次合法出牌后手牌上限再-1，最低5；只影响后续补牌，不额外删除持牌。',response:'越晚补得越少，优先兑现攒好的组合，并保留下一手所需的牌。'},
  {id:'B12',name:'挑剔',rule:'全场等级计算后的牌型基础热度减半；普通点数、增强和大丑牌热度正常。',response:'提升牌型仍有收益，也可用高点数、热度纸和大丑牌补足基础热度。'},
  {id:'B13',name:'逆着来',rule:'整手大丑牌计分按槽位右到左，本体和版次一起反序；其他时点保持原序。',response:'把加倍率牌放右侧，乘倍率牌放左侧，并核对本槽版次的执行顺序。'},
  {id:'B14',name:'催场',rule:'每次成功弃牌使目标增加本场初始目标的5%，增量向上取整且不复利；返还弃牌额度仍计一次。',response:'尽量用排序和现有手牌凑型，每次弃牌前衡量新增目标。'},
  {id:'B15',name:'逐个谢幕',rule:'每手后封禁当前最左且尚未封禁的大丑牌计分，按实例跟随调序，持续到本场结束。',response:'出牌前把可暂缓计分的牌放左边；已封禁实例不会因调序恢复。'},
  {id:'B16',name:'不吃名气',rule:'稀有大丑牌的计分和版次停用；常见、罕见正常，静态资源和经济效果保留。',response:'用常见和罕见牌构筑，稀有牌的静态或经济能力仍能支持本场。'},
] as const;
export type R2BossId=typeof R2_BOSSES[number]['id'];
export interface R2BossPlan {definitionId:R2BossId;disabledSuit:Suit|null}
export function r2BossPlanValid(plan:unknown):plan is R2BossPlan {
  if(plan===null||typeof plan!=='object'||Array.isArray(plan))return false;
  const prototype=Object.getPrototypeOf(plan),keys=Reflect.ownKeys(plan);
  if(prototype!==Object.prototype&&prototype!==null||keys.length!==2||!Object.hasOwn(plan,'definitionId')||!Object.hasOwn(plan,'disabledSuit'))return false;
  const value=plan as Record<string,unknown>;
  if(!R2_BOSSES.some(boss=>boss.id===value.definitionId))return false;
  return value.definitionId==='B03'?SUITS.some(suit=>suit===value.disabledSuit):value.disabledSuit===null;
}
export const R2_SKIP_CONSUMABLES=['T01','T03','T04','T05','T06','T17'] as const;
export type R2SkipConsumable=typeof R2_SKIP_CONSUMABLES[number];
export type R2SkipResult={kind:'coupon';amount:2}|{kind:'consumable';definitionId:R2SkipConsumable}|{kind:'gold';amount:1};

/** A selection set is not a complete chapter history; validation consumes no randomness. */
export function drawR2Boss(rng:SeededRng,seen:readonly string[],chapter=1,tourMode:R2TourMode='normal'):R2BossPlan {
  const chapterPool=r2ChapterBossIds(chapter,tourMode);
  if(!chapterPool)throw Error('invalid-boss-chapter');
  if(!Array.isArray(seen)||[...seen].some(id=>!R2_BOSSES.some(boss=>boss.id===id)))throw Error('invalid-boss-seen');
  const unseen=chapterPool.filter(id=>!seen.includes(id)),pool=unseen.length?unseen:chapterPool;
  const chosen=pool[rng.integer(0,pool.length-1)];
  return {definitionId:chosen,disabledSuit:chosen==='B03'?SUITS[rng.integer(0,3)]:null};
}
export function r2BossHistoryValid(seen:readonly string[],chapter:number,tourMode:R2TourMode='normal'):boolean {
  if(!r2ChapterBossIds(chapter,tourMode)||!Array.isArray(seen)||seen.length!==chapter)return false;
  const previous=new Set<string>();
  for(let index=0;index<seen.length;index++){
    const pool=r2ChapterBossIds(index+1,tourMode)!,id=seen[index];
    if(!pool.some(candidate=>candidate===id)||previous.has(id)&&pool.some(candidate=>!previous.has(candidate)))return false;
    previous.add(id);
  }
  return true;
}
export function r2DisabledCards(boss:R2BossPlan,index:number,hand:readonly PlayingCard[]):string[] {
  if(index%3!==2)return [];
  return hand.filter(c=>boss.definitionId==='B03'?c.suit===boss.disabledSuit:boss.definitionId==='B04'?[11,12,13].includes(c.rank):false).map(c=>c.id);
}
export function r2OrdinarySuppression(boss:R2BossPlan,index:number,hand:readonly PlayingCard[],selectedIds:readonly string[]):string[] {
  return index%3===2&&boss.definitionId==='B02'?hand.filter(c=>selectedIds.includes(c.id)).slice(3).map(c=>c.id):[];
}
export const r2BossText=(boss:R2BossPlan)=>{const d=R2_BOSSES.find(b=>b.id===boss.definitionId)!;return `${d.name}${boss.disabledSuit?' · '+SUIT_SYMBOL[boss.disabledSuit]:''}：${d.rule}\n应对：${d.response}`;};
