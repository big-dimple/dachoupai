import {AudioEngine} from '/src/audio/AudioEngine';
import {AudioEngine as BeforeEngine} from './before-engine';
import {FOLEY} from '/src/audio/foley';
import {FOLEY as BEFORE_FOLEY} from './before-foley';
const after:any=new AudioEngine(),before:any=new BeforeEngine();
const status=document.querySelector('#status')!;
const entries=[
 ['选牌', (e:any)=>e.select()],['拖拽落位 / 出牌落位', (e:any)=>e.cardLand()],['买入', (e:any)=>e.purchase()],
 ['改牌 · 献纸', (e:any)=>e.toolUse('tarot')],['改牌 · 整理', (e:any)=>e.toolUse('utility')],['升型', (e:any)=>e.toolUse('planet')],['秘术', (e:any)=>e.toolUse('spectral')],
 ['普通结算', (e:any)=>e.scoreImpact({},'ordinary','award',0)],
 ['连乘', (e:any)=>e.scoreImpact({},'chain','multiply',3,3)],['关键落点', (e:any)=>e.scoreImpact({},'key','key',3)],
 ['百万分', (e:any)=>e.scoreImpact({score:{finalScore:'1000000'}},'award','award',3)],
 ['亿分', (e:any)=>e.scoreImpact({score:{finalScore:'100000000'}},'award','award',3)],
 ['万亿分', (e:any)=>e.scoreImpact({score:{finalScore:'1000000000000'}},'award','award',3)],
 ['成功', (e:any)=>e.success()],['失败', (e:any)=>e.failure({runId:'audition',commandSeq:1})]
] as const;
export const timeline:[number,string,(e:any)=>void][]=[
 [0,'选牌',e=>e.select()],[.09,'多选',e=>e.select()],[.18,'多选',e=>e.select()],
 [.6,'落位',e=>e.cardLand()],[1.1,'买入',e=>e.purchase()],
 [1.85,'献纸改牌',e=>e.toolUse('tarot')],[2.7,'整理改牌',e=>e.toolUse('utility')],[3.6,'升型',e=>e.toolUse('planet')],[4.5,'秘术改牌',e=>e.toolUse('spectral')],
 [5.5,'出牌',e=>e.playHand()],[6,'普通得分',e=>e.cardScore()],[6.13,'普通得分',e=>e.cardScore(1)],[6.26,'普通得分',e=>e.cardScore(2)],
 [6.8,'连乘一',e=>e.scoreImpact({},'multiply-1','multiply',1,1)],[7.07,'连乘二',e=>e.scoreImpact({},'multiply-2','multiply',2,2)],[7.34,'连乘三',e=>e.scoreImpact({},'multiply-3','multiply',3,3)],
 [7.7,'重触',e=>e.retrigger(3)],[8.2,'关键落点',e=>e.scoreImpact({},'key','key',3)],
 [9.2,'普通结算',entries[7][1]],[10.4,'百万分',entries[10][1]],[11.8,'亿分',entries[11][1]],[13.4,'万亿分',entries[12][1]],
 [15,'成功',e=>e.success()],[16.5,'失败',entries[14][1]]
];
let ready=false,timers:ReturnType<typeof setTimeout>[]=[],generation=0;
const stop=()=>{generation++;for(const timer of timers)clearTimeout(timer);timers=[];for(const e of [before,after]){e.stopVoices();e.duckUntil=0;e.applyVolume('music');}status.textContent='已停止。'};
const settings=()=>{for(const e of [before,after]){e.setVolume('sfx',Number((document.querySelector('#sfx') as HTMLInputElement).value)/100);e.setVolume('music',Number((document.querySelector('#music') as HTMLInputElement).value)/100);e.musicMuted=!(document.querySelector('#bgm') as HTMLInputElement).checked;e.muted=(document.querySelector('#mute') as HTMLInputElement).checked;}
 for(const id of ['sfx','music'])document.querySelector('#'+id+'Value')!.textContent=(document.querySelector('#'+id) as HTMLInputElement).value+'%';};
async function prepare(){
 await after.unlock();if(!after.context){status.textContent='音频未解锁：取消静音，再点击启用。';return;}
 status.textContent='正在预载；缺音会静默降级，不补播。';await after.scoreSampleTask;
 // Audition only: A/B share decoded original buffers and the unchanged final
 // compressor/ceiling graph, so no duplicate asset/context/BGM instance is made.
 Object.assign(before,{context:after.context,gains:after.gains,unlocked:true,scoreSamples:after.scoreSamples,sampleBodies:after.sampleBodies});
 before.startMusic=()=>{};before.stopMusic=()=>{};before.unlock=()=>Promise.resolve();
 ready=true;settings();document.querySelectorAll<HTMLButtonElement>('.ready').forEach(button=>button.disabled=false);
 status.textContent=`已准备 ${after.scoreSamples.size}/23 个录音。A/B整段与逐事件试听可用。`;
}
function run(version:'before'|'after',recordedTimeline=timeline){
 if(!ready)return;stop();settings();const e=version==='before'?before:after;e.cueTimes.clear();e.variants.clear();
 if(after.musicElement)after.musicElement.currentTime=0;const token=generation;
 for(const [delay,label,play] of recordedTimeline)timers.push(setTimeout(()=>{if(token!==generation)return;status.textContent=`${version==='before'?'A 原版':'B 新版'} · ${label}`;play(e);},delay*1000));
 timers.push(setTimeout(()=>{if(token===generation)status.textContent='整段完成，可以切换版本比较。';},18000));
}
for(const [label,play] of entries){const button=document.createElement('button');button.className='ready';button.disabled=true;button.textContent=label;button.onclick=()=>{if(!ready)return;stop();const e=(document.querySelector('#version') as HTMLSelectElement).value==='before'?before:after;play(e);status.textContent=label;};document.querySelector('#gallery')!.append(button);}
for(const kind of Object.keys(FOLEY)){const button=document.createElement('button');button.className='ready';button.disabled=true;button.textContent=kind;button.onclick=()=>{if(!ready)return;stop();const e=(document.querySelector('#version') as HTMLSelectElement).value==='before'?before:after;if(e===before&&!(kind in BEFORE_FOLEY)){status.textContent='原版没有这一绝对分档配方；用核心事件按钮比较原版结算。';return;}if(!e.cue(kind).length)status.textContent='该版本无此配方或录音尚未就绪';else status.textContent=kind;};document.querySelector('#recipes')!.append(button);}
document.querySelector('#prepare')!.addEventListener('click',prepare);
document.querySelector('#before')!.addEventListener('click',()=>run('before'));
document.querySelector('#after')!.addEventListener('click',()=>run('after'));
document.querySelector('#stop')!.addEventListener('click',stop);
for(const id of ['sfx','music','bgm','mute'])document.querySelector('#'+id)!.addEventListener('input',settings);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();after.setSuspended(document.hidden);before.suspended=document.hidden;});
(window as any).audioAudition={after,before,prepare,run,stop,timeline,entries,get ready(){return ready;}};
