import type {R2RunState} from '../domain/r2Run';
export const FIRST_GUIDE_KEY='dachoupai-first-chapter-guide-v1';
export type GuideStep='shop'|'hand'|'saved'|'return';
interface GuidePreferences {disabled:boolean;enrolled?:string;skipped:GuideStep[]}
const guideRunKey=(s:R2RunState)=>JSON.stringify([s.runId,s.characterId,s.contentVersion,s.contentHash,s.mode,s.difficulty,s.challengeId,s.tourMode]);
const steps:readonly GuideStep[]=['shop','hand','saved','return'];
const empty=():GuidePreferences=>({disabled:false,skipped:[]});
export function decodeGuidePreferences(raw:string|null):GuidePreferences {
 try{const p=JSON.parse(raw??'null');if(p&&typeof p.disabled==='boolean'&&Array.isArray(p.skipped))return {disabled:p.disabled,enrolled:typeof p.enrolled==='string'?p.enrolled:undefined,skipped:p.skipped.filter((s:unknown):s is GuideStep=>steps.includes(s as GuideStep))};}catch{/* Optional UI preference. */}return empty();
}
let fallback=empty(),unpersisted=false;
function read(){if(unpersisted)return fallback;try{return fallback=decodeGuidePreferences(localStorage.getItem(FIRST_GUIDE_KEY));}catch{return fallback;}}
function write(p:GuidePreferences){fallback=p;try{localStorage.setItem(FIRST_GUIDE_KEY,JSON.stringify(p));unpersisted=false;}catch{unpersisted=true;/* Never block a run on optional preferences. */}}
/** Call only after the ordinary new-run save succeeded; retry/continue/import never enroll. */
export function enrollFirstChapterGuide(state:R2RunState):void {
 const p=read();if(p.disabled||state.mode!=='standard'||state.difficulty!==0||state.stageIndex!==0||state.tourMode!=='normal')return;
 write({...p,enrolled:guideRunKey(state),skipped:[]});
}
export function stopFirstChapterGuide():void {const p=read();if(p.enrolled)write({...p,enrolled:undefined,skipped:[]});}
export function firstChapterGuide(state:R2RunState){
 const p=read();if(p.disabled||p.enrolled!==guideRunKey(state)||state.stageIndex>1)return;
 if(state.phase!=='shop'&&state.phase!=='await-input'&&!(state.phase==='stage-cleared'&&state.lastTrace))return;
 const step:GuideStep=state.phase==='shop'?(state.stageIndex===0?'shop':'return'):state.phase==='await-input'?(state.lastTrace?'saved':'hand'):'saved';
 if(p.skipped.includes(step))return;
 const copy={shop:['首次：点培养看用途','先挑想试的方向，再看这家店的实际条件与金币代价。方向可换；没有对应现货也可以保留金币出场。'],hand:['首次：点怎么凑牌，看留换','只用当前公开手牌找同点、连续或同花；自己选择保留与弃牌。参考不自动选牌，也不保证抽到缺牌；弃牌成本看实际按钮。'],saved:['首次：上手收益看来源','回看已保存的计分与来源，区分读已有成长和本手新增。总分与成长以本次真实事件为准，不是出牌前预估。'],return:['首次：培养→比较持牌','回到商店，先看实际条件和现存成长，再比较保留、换方向或换牌。出售会丢失这张实例的成长；卖和买各自确认，可以都不做。']} as const;
 return {step,cue:copy[step][0],body:copy[step][1]};
}
export function dismissFirstChapterGuide(state:R2RunState,scope:'step'|'run'|'forever'):void {
 const p=read();if(scope==='forever'){write({...p,disabled:true});return;}if(p.enrolled!==guideRunKey(state))return;
 write(scope==='run'?{...p,enrolled:undefined}:{...p,skipped:[...new Set([...p.skipped,firstChapterGuide(state)?.step].filter((s):s is GuideStep=>!!s))]});
}
/** A current shop decision, visible before opening any detail panel. */
export function firstChapterShopPrompt(state:R2RunState){
 const hint=firstChapterGuide(state);if(state.phase!=='shop'||!hint)return;
 return {text:hint.step==='shop'?`首次逛店 · 金币 ${state.gold}：先看用途，再决定买牌或留金。`:'再逛商店 · 先比较成长，再决定保留或换牌。',action:hint.step==='shop'?'看用途':'看持牌'};
}
/** Inline in the real operation panel; no forced modal, game commands or input locks. */
export function attachFirstChapterGuide(state:R2RunState,refresh?:()=>void):void {
 const hint=firstChapterGuide(state),dialog=document.querySelector('dialog[open]');if(!hint||!dialog||dialog.querySelector('.first-chapter-guide'))return;
 const block=document.createElement('details'),title=document.createElement('summary'),body=document.createElement('p'),actions=document.createElement('div');
 block.className='first-chapter-guide';block.open=true;title.textContent='首次提示 · 可略过';body.textContent=hint.body;actions.className='dialog-actions';
 for(const [scope,label] of [['step','略过此提示'],['run','本局不提示'],['forever','不再显示']] as const){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>{dismissFirstChapterGuide(state,scope);block.remove();refresh?.();};actions.append(button);}
 block.append(title,body,actions);dialog.querySelector('.dialog-scroll')?.append(block);
}
