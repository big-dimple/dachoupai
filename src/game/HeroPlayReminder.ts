import './HeroPlayReminder.css';
import type {R2RunState} from '../domain/r2Run';
import type {R2SelectionFacts} from '../domain/r2SelectionFacts';
import {heroAbilityCue} from './HeroAbilityCue';
import {firstChapterGuide} from './FirstChapterGuide';
import {buildDirectionRunKey} from './BuildDirectionPreferences';
import {heroSkillGuide} from './HeroSkillGuide';
import type {DetailDialog} from './DetailDialog';

export interface HeroPlayDraft {erxiangTargetId?:string|null;xiemuBurn?:number;azaoRelease?:boolean;assistCount?:number}
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
/** At most once per opening stage, twice per enrolled run. Record before displaying, even on Escape. */
export function createHeroPlayReminders(storage:()=>Storage){
 let fallback=empty(),unpersisted=false;
 const read=()=>{if(!unpersisted)try{fallback=decodeHeroPlayReminder(storage().getItem(HERO_PLAY_REMINDER_KEY));}catch{/* Retain session state. */}return fallback;};
 const write=(p:Preferences)=>{fallback=p;try{storage().setItem(HERO_PLAY_REMINDER_KEY,JSON.stringify(p));unpersisted=false;}catch{unpersisted=true;}};
 return {
  claim(run:R2RunState,enrolled=!!firstChapterGuide(run)):boolean {
   const p=read(),key=buildDirectionRunKey(run),entry=p.entries.find(e=>e.run===key);
   if(!enrolled||p.disabled||run.stageIndex<0||run.stageIndex>1||entry?.stages.includes(run.stageIndex)||(entry?.stages.length??0)>=2)return false;
   write({...p,entries:[...p.entries.filter(e=>e.run!==key),{run:key,stages:[...(entry?.stages??[]),run.stageIndex]}].slice(-8)});return true;
  },
  disable():void {write({...read(),disabled:true});},
 };
}
export const heroPlayReminders=createHeroPlayReminders(()=>globalThis.localStorage);
/** Only UI callbacks: returning never chooses a target or sends a game command. */
export function showHeroPlayReminder(dialog:DetailDialog,run:R2RunState,facts:R2SelectionFacts,ids:readonly string[],assistAvailable:boolean,callbacks:{valid:()=>boolean;back:()=>void;play:()=>void;disable:()=>void}):void {
 const guide=heroSkillGuide(run,facts,ids,assistAvailable);let consumed=false;
 const act=(next:()=>void)=>{if(consumed||!dialog.active(modal))return;consumed=true;const valid=callbacks.valid();dialog.close(modal);if(valid)next();};
 const modal=dialog.open('确定不使用技能吗？',guide.effect+'\n'+guide.risk,[
  {label:'返回用技能',primary:true,run:()=>act(callbacks.back)},
  {label:'继续出牌',run:()=>act(callbacks.play)},
 ],{summaryBody:'这次可以不用技能；返回只查看操作，由你决定是否使用。',closeLabel:'取消 · 返回选牌'});
 modal.classList.add('hero-play-reminder');
 const off=document.createElement('button');off.type='button';off.className='hero-reminder-disable';off.textContent='不再提醒';off.onclick=()=>act(callbacks.disable);modal.querySelector('.dialog-scroll')!.append(off);
}
