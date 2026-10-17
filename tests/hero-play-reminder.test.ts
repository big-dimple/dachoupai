import {it,expect,vi,afterEach} from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class {}}}));
vi.mock('../src/game/runAdapter',()=>({dispatchRun:vi.fn(),runController:vi.fn()}));
import {GameScene} from '../src/game/GameScene';
import {dispatchRun} from '../src/game/runAdapter';
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();vi.clearAllMocks();});
import {completeControlledRouteHistory} from './fixtures/route-growth-history';
import {createRun,applyCommand,type R2RunState,type Action} from '../src/domain/run';
import {CHARACTER_IDS,type CharacterId} from '../src/domain/characters';
import {newRunIdentity} from '../src/game/RunLaunch';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {r2SelectionFacts} from '../src/domain/r2SelectionFacts';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {r2AssistAvailability} from '../src/domain/r2Assist';
import {assistCandidates} from '../src/game/AssistSelection';
import {touyeChoice} from '../src/game/TouyeWagerCopy';
import {createHeroPlayReminders,decodeHeroPlayReminder,HERO_PLAY_REMINDER_KEY,unusedHeroAbility,heroPlayReminders,type HeroPlayDraft} from '../src/game/HeroPlayReminder';
import {enrollFirstChapterGuide,dismissFirstChapterGuide} from '../src/game/FirstChapterGuide';

const cards=['spades-8','hearts-8','clubs-7','diamonds-7','spades-13','hearts-13','clubs-2','diamonds-4'];
const main=cards.slice(0,4);
function send(s:R2RunState,action:Action){const r=applyCommand(s,{runId:s.runId,commandId:'reminder/'+s.commandSeq,expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);expect(readCheckpoint(makeCheckpoint(r.state,[])).ok).toBe(true);return r.state;}
function arrange(s:R2RunState,ids=cards){s=structuredClone(s);s.handOrder=[...ids];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id)&&!s.playedPile.includes(id)&&!s.discardPile.includes(id));expect(readCheckpoint(makeCheckpoint(s,[])).ok).toBe(true);return s;}
function entered(id:CharacterId){return arrange(send(send(createRun({rulesVersion:'r2',characterId:id,runId:'reminder-'+id,seed:'group-natural-17',r2Identity:newRunIdentity(id,'group'),openingRoute:'group'}),{type:'LeaveShop'}),{type:'EnterStage'}));}
function prepared(id:CharacterId){let s=entered(id);if(id==='azao'){s=arrange(s,['spades-2','hearts-2','clubs-3','diamonds-3',...cards.slice(4)]);s=arrange(send(s,{type:'PlayHand',selectedIds:s.handOrder.slice(0,4)}));}if(id==='xiemu'){s.gold=10;expect(readCheckpoint(makeCheckpoint(s,[])).ok).toBe(true);}return s;}
function input(s:R2RunState,ids:readonly string[]=main){return {hand:s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!),selectedIds:ids,disabledIds:s.stage!.disabledIds,jokers:s.jokers,definitions:r2JokerDefinitionsFor(s)};}
function eligible(s:R2RunState,ids:readonly string[]=main,draft:HeroPlayDraft={}){const i=input(s,ids);return unusedHeroAbility(s,r2SelectionFacts(i),ids,assistCandidates(i,r2AssistAvailability(s).available).length>0,draft);}

it.each(CHARACTER_IDS)('%s reminds only for a current legal unused operation without mutating the run',id=>{
 const s=prepared(id),before=structuredClone(s),ids=id==='erxiang'?cards.slice(0,2):main;
 expect(eligible(s,ids)).toBe(true);expect(unusedHeroAbility(s,undefined,ids,false,{})).toBe(false);expect(s).toEqual(before);
});
it('rejects unavailable main hands, no charge, insufficient money, missing assist group and exhausted discards',()=>{
 expect(eligible(entered('erxiang'),[cards[0]])).toBe(false);
 expect(eligible(entered('azao'))).toBe(false);expect(eligible(prepared('azao'),cards.slice(0,2))).toBe(false);
 expect(eligible(entered('xiemu'))).toBe(false);expect(eligible(prepared('xiemu'),cards.slice(0,2))).toBe(false);
 const amo=arrange(entered('amo'),[...main,'spades-13','hearts-12','clubs-2','diamonds-4']);expect(eligible(amo)).toBe(false);
 for(const id of ['touye','laohuan'] as const){const s=entered(id);s.stage!.discardsLeft=0;expect(eligible(s)).toBe(false);}
 const t=entered('touye');t.drawPile=[];expect(eligible(t)).toBe(false);
});
it('does not warn after selecting any of the four play-time skill drafts',()=>{
 for(const [id,draft] of [['erxiang',{erxiangTargetId:cards[0]}],['azao',{azaoRelease:true}],['xiemu',{xiemuBurn:10}],['amo',{assistCount:2}]] as const){const s=prepared(id);expect(eligible(s,main,draft)).toBe(false);}
});
it('real committed uses and pending discard choices are not unused skills',()=>{
 const e=send(prepared('erxiang'),{type:'PlayHand',selectedIds:cards.slice(0,2),erxiangTargetId:cards[0]});expect(eligible(e, cards.slice(2,4))).toBe(false);
 const x=send(prepared('xiemu'),{type:'PlayHand',selectedIds:main,xiemuBurn:10});expect(eligible(x,cards.slice(4,6))).toBe(false);
 const a=send(prepared('amo'),{type:'PlayAssistedHand',selectedIds:main,assistIds:cards.slice(4,6)});expect(eligible(a,cards.slice(6))).toBe(false);
 const z=send(prepared('azao'),{type:'PlayHand',selectedIds:main,azaoRelease:true});expect(z.stage!.azaoCharge!.charge).toBe(0);expect(eligible(z,cards.slice(4,6))).toBe(false);
 const t=prepared('touye'),ids=cards.slice(6),pending=send(t,{type:'DiscardHand',selectedIds:ids,touyeBet:{target:'three-kind',snapshotToken:touyeChoice(t,ids).snapshotToken}});expect(pending.stage!.touyeWager!.resolution).toBe('pending');expect(eligible(pending)).toBe(false);
 const l=send(prepared('laohuan'),{type:'DiscardHand',selectedIds:cards.slice(6),laohuanTrick:true});expect(l.phase).toBe('pending-refill');expect(eligible(l)).toBe(false);
 const kept=send(l,{type:'ChooseRefill',selectedIds:l.pendingRefill!.candidateIds.slice(0,l.pendingRefill!.required)});expect(eligible(kept)).toBe(false);
});
it('excludes passive profiles, invalid selection and nonplayable lifecycle states',()=>{
 const s=prepared('erxiang'),facts=r2SelectionFacts(input(s));
 for(const ids of [[],[cards[0],cards[0]],['missing'],cards.slice(0,6)])expect(unusedHeroAbility(s,facts,ids,false,{})).toBe(false);
 const old=structuredClone(s);old.contentVersion='legacy';delete old.stage!.erxiangHandoffUsed;expect(unusedHeroAbility(old,facts,main,false,{})).toBe(false);
 const noHands=structuredClone(s);noHands.stage!.handsLeft=0;expect(eligible(noHands)).toBe(false);
 const busy=structuredClone(s);busy.phase='stage-cleared';expect(eligible(busy)).toBe(false);
});
it('B08 preserves the Laohuan non-scoring exception; Q01 disables all six',()=>{
 for(const id of CHARACTER_IDS){
  let s=createRun({rulesVersion:'r2',characterId:id,runId:'reminder-boss-'+id,seed:'group-natural-17',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false},r2Identity:newRunIdentity(id,'group'),openingRoute:'group'});
  s=send(s,{type:'LeaveShop'});s.shop=null;s.chapter=3;s.stageIndex=8;s.seenBossIds=['B02','B03','B08'];s.boss={definitionId:'B08',disabledSuit:null};completeControlledRouteHistory(s);s=arrange(send(s,{type:'EnterStage'}));expect(eligible(s)).toBe(id==='laohuan');
  const q=arrange(send(send(createRun({rulesVersion:'r2',characterId:id,runId:'reminder-q-'+id,seed:'challenge/q01/0',r2Identity:newRunIdentity(id,'group'),openingRoute:'group',modeConfig:{mode:'challenge',difficulty:0,challengeId:'Q01',programsEnabled:false}}),{type:'LeaveShop'}),{type:'EnterStage'}));expect(eligible(q)).toBe(false);
 }
});

function memory(){const data=new Map<string,string>();return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};}
it.each(['step','run','forever'] as const)('tutorial %s dismissal does not silently disable the separate skill decision',scope=>{
 const storage=memory(),s=prepared('erxiang'),before=structuredClone(s);vi.stubGlobal('localStorage',storage);
 enrollFirstChapterGuide(s);dismissFirstChapterGuide(s,scope);
 expect(createHeroPlayReminders(()=>storage).enabled()).toBe(true);expect(s).toEqual(before);
});
it('defaults on for restored, unenrolled and repeated attempts; legacy stage receipts do not suppress prompts',()=>{
 const storage=memory();storage.setItem(HERO_PLAY_REMINDER_KEY,JSON.stringify({disabled:false,entries:[{run:'previous-run',stages:[0,1]}]}));
 const before=storage.getItem(HERO_PLAY_REMINDER_KEY),r=createHeroPlayReminders(()=>storage);
 expect(r.enabled()).toBe(true);expect(r.enabled()).toBe(true);expect(createHeroPlayReminders(()=>storage).enabled()).toBe(true);expect(storage.getItem(HERO_PLAY_REMINDER_KEY)).toBe(before);
});
it('retains the explicit global opt-out across sessions and legacy stage receipts',()=>{
 const storage=memory();storage.setItem(HERO_PLAY_REMINDER_KEY,JSON.stringify({disabled:true,entries:[{run:'previous-run',stages:[0,1]}]}));
 expect(createHeroPlayReminders(()=>storage).enabled()).toBe(false);
 const other=memory(),r=createHeroPlayReminders(()=>other);r.disable();expect(r.enabled()).toBe(false);expect(createHeroPlayReminders(()=>other).enabled()).toBe(false);
});
it('storage failure keeps the explicit session opt-out without blocking default play decisions',()=>{
 const r=createHeroPlayReminders(()=>{throw Error('SecurityError');});expect(r.enabled()).toBe(true);r.disable();expect(r.enabled()).toBe(false);
 const storage=memory(),quota=createHeroPlayReminders(()=>({...storage,setItem:()=>{throw Error('QuotaExceededError');}}));quota.disable();expect(quota.enabled()).toBe(false);expect(quota.enabled()).toBe(false);
});
it('malformed or oversized optional preference data falls back safely',()=>{
 for(const raw of [null,'broken','null','{}',JSON.stringify({disabled:'yes',entries:[]}),JSON.stringify({disabled:false,entries:[{run:'r',stages:[2]}]}),' '.repeat(16385)])expect(decodeHeroPlayReminder(raw)).toEqual({disabled:false,entries:[]});
 expect(decodeHeroPlayReminder(JSON.stringify({disabled:true,entries:[{run:'r',stages:[0,1]}]}))).toEqual({disabled:true,entries:[{run:'r',stages:[0,1]}]});
});
function lateRun(){let s=createRun({rulesVersion:'r2',characterId:'erxiang',runId:'late-reminder',seed:'group-natural-17',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false},r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group'});s=send(s,{type:'LeaveShop'});s.shop=null;s.chapter=3;s.stageIndex=8;s.seenBossIds=['B01','B03','B02'];s.boss={definitionId:'B02',disabledSuit:null};completeControlledRouteHistory(s);return arrange(send(s,{type:'EnterStage'}));}
function oldActiveRun(){let s=createRun({rulesVersion:'r2',characterId:'amo',runId:'old-active-reminder',seed:'group-natural-17',r2Profile:'amo-assist-v1'});return arrange(send(send(s,{type:'LeaveShop'}),{type:'EnterStage'}));}
function reminderScene(run=prepared('erxiang')){
 vi.spyOn(heroPlayReminders,'enabled').mockReturnValue(true);
 vi.stubGlobal('document',{createElement:()=>({className:'',textContent:'',onclick:null})});
 const modal:any={classList:{add:vi.fn()},querySelector:()=>({append:vi.fn()})};let choices:any[]=[];
 const dialog:any={current:undefined,open:vi.fn((_title:string,_body:string,actions:any[])=>{choices=actions;dialog.current=modal;return modal;}),active:(d:any)=>dialog.current===d,close:vi.fn(()=>{dialog.current=undefined;})};
 const s=Object.create(GameScene.prototype) as any;
 Object.assign(s,{run,selectedIds:new Set(run.characterId==='amo'?main:cards.slice(0,2)),assistIds:[],erxiangTargetId:null,xiemuBurn:0,azaoRelease:false,lifecycle:1,intent:0,playing:false,presentation:undefined,dialog,scene:{isActive:()=>true},cardViews:[],selectionPreview:()=>r2SelectionFacts(input(s.run,[...s.selectedIds])),clearHover:vi.fn(),cancelAiCandidates:vi.fn(),updateControls:vi.fn(),refreshSelection:vi.fn(),inspectRole:vi.fn(),presentTrace:vi.fn(async()=>{})});
 Object.defineProperty(s,'ready',{get:()=>!s.playing});
 vi.mocked(dispatchRun).mockImplementation(async(_scene,action)=>applyCommand(s.run,{runId:s.run.runId,commandId:'confirmed/'+s.run.commandSeq,expectedSeq:s.run.commandSeq,action}) as any);
 return {s,dialog,choices:()=>choices};
}
it.each(['opening','late','old-active'] as const)('%s run reminds on every explicit attempt; close and return preserve the draft',async kind=>{
 const run=kind==='late'?lateRun():kind==='old-active'?oldActiveRun():prepared('erxiang'),{s,dialog,choices}=reminderScene(run),before=structuredClone(run),selected=[...s.selectedIds];
 for(let i=0;i<3;i++){await s.playSelected();expect(dialog.open).toHaveBeenCalledTimes(i+1);await s.playSelected();expect(dialog.open).toHaveBeenCalledTimes(i+1);if(i===1)choices()[0].run();else dialog.close();expect(dispatchRun).not.toHaveBeenCalled();expect(s.run).toEqual(before);expect([...s.selectedIds]).toEqual(selected);}
 expect(s.inspectRole).toHaveBeenCalledOnce();
});
it('explicit continue releases only this attempt; duplicate clicks submit one real command',async()=>{
 const {s,choices}=reminderScene(),before=structuredClone(s.run),ids=[...s.selectedIds];await s.playSelected();const continueAction=choices()[1];continueAction.run();continueAction.run();
 await vi.waitFor(()=>expect(s.presentTrace).toHaveBeenCalledOnce());expect(dispatchRun).toHaveBeenCalledOnce();expect(dispatchRun).toHaveBeenCalledWith(s,{type:'PlayHand',selectedIds:ids});
 const expected=applyCommand(before,{runId:before.runId,commandId:'confirmed/'+before.commandSeq,expectedSeq:before.commandSeq,action:{type:'PlayHand',selectedIds:ids}});expect(expected.ok).toBe(true);if(expected.ok)expect(s.run).toEqual(expected.state);expect(s.run.stage.erxiangHandoffUsed).toBe(false);s.selectedIds=new Set(cards.slice(2,4));await s.playSelected();expect(s.dialog.open).toHaveBeenCalledTimes(2);expect(dispatchRun).toHaveBeenCalledOnce();
});
it('stale selection or lifecycle invalidates consent without submitting a command',async()=>{
 const {s,choices}=reminderScene();await s.playSelected();s.selectedIds=new Set([cards[0]]);choices()[1].run();expect(dispatchRun).not.toHaveBeenCalled();s.selectedIds=new Set(cards.slice(0,2));await s.playSelected();s.lifecycle++;choices()[1].run();expect(dispatchRun).not.toHaveBeenCalled();
});

it('unavailable selection and an explicit reminder opt-out do not open a prompt',async()=>{
 for(const optedOut of [false,true]){const {s,dialog}=reminderScene();if(optedOut)vi.mocked(heroPlayReminders.enabled).mockReturnValue(false);else s.selectedIds=new Set([cards[0]]);const before=vi.mocked(dispatchRun).mock.calls.length;await s.playSelected();expect(dialog.open).not.toHaveBeenCalled();expect(vi.mocked(dispatchRun).mock.calls.length).toBe(before+1);}
});
