import {usesTouyeWager} from '../domain/r2TouyeWager';
import type {HeroSkillDraft} from './HeroSkillPresentation';
import {r2DiscardCost} from '../domain/r2Run';
import './HeroPlayReminder.css';
import type {R2RunState} from '../domain/r2Run';
import type {R2SelectionFacts} from '../domain/r2SelectionFacts';
import {heroAbilityCue} from './HeroAbilityCue';
import {heroSkillGuide} from './HeroSkillGuide';
import type {DetailDialog} from './DetailDialog';
import {characterForRun} from './CharacterRunCopy';

export type HeroPlayDraft=HeroSkillDraft;
/** Available, not merely an opportunity: no speculation about another selection or future draw. */
export function unusedHeroAbility(run:R2RunState,facts:R2SelectionFacts|undefined,ids:readonly string[],assistAvailable:boolean,draft:HeroPlayDraft):boolean {
 if(run.phase!=='await-input'||!run.stage||run.stage.handsLeft<=0||run.pendingRefill||run.stage.wagerSelected||run.stage.touyeWager?.resolution==='pending')return false;
 if(!facts||!ids.length||ids.length>5||new Set(ids).size!==ids.length||ids.some(id=>!run.handOrder.includes(id)))return false;
 if(draft.erxiangTargetId||draft.xiemuBurn||draft.azaoRelease||draft.assistCount)return false;
 return heroAbilityCue(run,facts,ids,assistAvailable)?.available===true;
}
export const HERO_PLAY_REMINDER_KEY='dachoupai.hero-play-reminder.v1';
interface Preferences {disabled:boolean;entries:{run:string;stages:number[]}[]}
interface Storage {getItem(key:string):string|null;setItem(key:string,value:string):void}
const empty=():Preferences=>({disabled:false,entries:[]});
export function decodeHeroPlayReminder(raw:string|null):Preferences {
 if(!raw||raw.length>16384)return empty();
 try{const p=JSON.parse(raw);if(typeof p.disabled==='boolean'&&Array.isArray(p.entries)&&p.entries.length<=8&&p.entries.every((e:{run:string;stages:number[]})=>e&&typeof e.run==='string'&&e.run.length<=1024&&Array.isArray(e.stages)&&e.stages.length<=2&&e.stages.every(s=>s===0||s===1)))return p;}catch{/* Optional local UI preference. */}return empty();
}
/** Enabled for every eligible play attempt, independent of tutorial enrollment or prior prompts. */
export function createHeroPlayReminders(storage:()=>Storage){
 let fallback=empty(),unpersisted=false;
 const read=()=>{if(!unpersisted)try{fallback=decodeHeroPlayReminder(storage().getItem(HERO_PLAY_REMINDER_KEY));}catch{/* Retain session state. */}return fallback;};
 const write=(p:Preferences)=>{fallback=p;try{storage().setItem(HERO_PLAY_REMINDER_KEY,JSON.stringify(p));unpersisted=false;}catch{unpersisted=true;}};
 return {
  enabled():boolean {return !read().disabled;},
  disable():void {write({...read(),disabled:true});},
 };
}
export const heroPlayReminders=createHeroPlayReminders(()=>globalThis.localStorage);
/** Only UI callbacks: returning never chooses a target or sends a game command. */
export function showHeroPlayReminder(dialog:DetailDialog,run:R2RunState,facts:R2SelectionFacts,ids:readonly string[],assistAvailable:boolean,callbacks:{valid:()=>boolean;back:()=>void;play:()=>void;disable:()=>void}):void {
 const guide=heroSkillGuide(run,facts,ids,assistAvailable),hero=characterForRun(run),exchange=usesTouyeWager(run);let consumed=false;
 const act=(next:()=>void)=>{if(consumed||!dialog.active(modal))return;consumed=true;const valid=callbacks.valid();dialog.close(modal);if(valid)next();};
 const modal=dialog.open(exchange?'先换牌，再出牌？':'这手要用主动技能吗？','主动操作：'+guide.effect+'\n'+guide.risk,[
  {label:exchange?'重选弃牌':'返回用技能',primary:true,run:()=>act(callbacks.back)},
  {label:exchange?'按原选择出牌':'继续出牌',run:()=>act(callbacks.play)},
 ],{summaryBody:exchange?'重新选择1–5张弃牌并押目标。\n确认换牌耗'+r2DiscardCost(run)+'次弃牌'+(run.stage?.boss?.definitionId==='B07'?'＋1金币':'')+'；下一手成功×2，失败×0.85。':hero.name+' · '+hero.passiveName+'\n当前可用，尚未选择本手主动操作。',...(exchange?{collapseRules:true,rulesLabel:'押注规则'}:{}),closeLabel:'取消 · 返回选牌'});
 modal.classList.add('hero-play-reminder');
 if(!exchange){const automatic=document.createElement('p');automatic.className='hero-reminder-automatic';automatic.textContent='继续出牌：本手不使用这项主动操作。被动／自动效果仍按各自条件结算，不会一起关闭。返回后仍由你决定是否使用，不会自动发动。';modal.querySelector('.dialog-scroll')!.append(automatic);}
 const off=document.createElement('button');off.type='button';off.className='hero-reminder-disable';off.textContent='不再提醒';off.onclick=()=>act(callbacks.disable);modal.querySelector('.dialog-scroll')!.append(off);
}
