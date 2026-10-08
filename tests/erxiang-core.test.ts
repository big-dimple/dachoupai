import {SavedRun,type SaveSlots,type SaveStore} from '../src/application/SavedRun';
import {describe,it,expect} from 'vitest';
import {createRun,applyCommand,type R2RunState,type Action,type Command} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {stableHash} from '../src/domain/hash';
import {scoreR2Hand} from '../src/domain/scoreR2';
import {r2ScoreContext,r2CreateJoker} from '../src/domain/r2Run';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {savedErxiangCore} from '../src/game/SavedErxiangCore';
import {R2_ERXIANG_CORE_HASH} from '../src/domain/r2GroupUpgrade';
const main=['clubs-12','hearts-2','spades-2','clubs-14','diamonds-14'];
function start(){return createRun({seed:'group-natural-17',runId:'core-candidate',characterId:'erxiang',rulesVersion:'r2',r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});}
function send(s:R2RunState,action:Action,journal:Command[]=[]){const command={runId:s.runId,commandId:'c/'+s.commandSeq,expectedSeq:s.commandSeq,action},r=applyCommand(s,command);if(!r.ok)throw Error(r.code+JSON.stringify(r.diagnostic));journal.push(command);expect(readCheckpoint(makeCheckpoint(r.state,journal)).ok).toBe(true);return r.state;}
function entered(journal:Command[]=[]){return send(send(start(),{type:'LeaveShop'},journal),{type:'EnterStage'},journal);}
function arranged(s:R2RunState,ids:string[]){s=structuredClone(s);s.handOrder=ids;s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id)&&!s.playedPile.includes(id)&&!s.discardPile.includes(id));return s;}
function mutate(s:R2RunState,fn:(s:R2RunState)=>void){const cp=structuredClone(makeCheckpoint(s,[]));fn(cp.state);const {checksum,...body}=cp;return readCheckpoint({...body,checksum:stableHash(body)});}
describe('bounded same-rank core candidate',()=>{
 it('normal identity, actual core group and saved committed intent survive checkpoint; duplicate never grows again',()=>{
  const journal:Command[]=[],s=entered(journal);expect(s.contentHash).toBe(R2_ERXIANG_CORE_HASH);expect(s.handOrder).toEqual(expect.arrayContaining(main));
  const after=send(s,{type:'PlayHand',selectedIds:main,coreTargetId:'clubs-14',coreTargetRank:14},journal),trace=after.lastTrace!;
  expect(trace.erxiangCore).toEqual({targetId:'clubs-14',targetRank:14,previousRank:null,targetIds:['clubs-14','diamonds-14'],extraPerCard:1});
  expect(trace.events.filter(e=>e.sourceType==='character').map(e=>e.value.n)).toEqual(['1','1']);expect(trace.events.some(e=>e.sourceType==='character'&&e.phase==='characterScore')).toBe(false);expect(after.stage!.erxiangPreviousRank).toBe(14);
  const duplicate=applyCommand(after,journal.at(-1)!);expect(duplicate.ok&&duplicate.duplicate).toBe(true);if(duplicate.ok)expect(duplicate.state).toEqual(after);
  expect(savedErxiangCore(trace)).toContain('实际额外1次');
 });
 it('different physical cards continue the same rank; discard preserves, untargeted hand clears, next stage resets',()=>{
  let s=send(entered(),{type:'PlayHand',selectedIds:main,coreTargetId:'clubs-14',coreTargetRank:14});
  s=arranged(s,['spades-14','hearts-14','clubs-8','hearts-8','spades-3','clubs-3','spades-4','hearts-4']);
  s=send(s,{type:'DiscardHand',selectedIds:['spades-3']});expect(s.stage!.erxiangPreviousRank).toBe(14);
  const next=send(s,{type:'PlayHand',selectedIds:['spades-14','hearts-14','clubs-8','hearts-8'],coreTargetId:'spades-14',coreTargetRank:14});
  expect(next.lastTrace!.erxiangCore!.extraPerCard).toBe(2);expect(next.lastTrace!.erxiangCore!.previousRank).toBe(14);expect(next.phase).toBe('stage-cleared');expect(next.stage!.erxiangPreviousRank).toBeNull();
  const entering=send(send(next,{type:'OpenShop'}),{type:'LeaveShop'});expect(send(entering,{type:'EnterStage'}).stage!.erxiangPreviousRank).toBeNull();
  const unselected=send(s,{type:'PlayHand',selectedIds:['spades-4']});expect(unselected.stage!.erxiangPreviousRank).toBeNull();expect(unselected.lastTrace!.erxiangCore!.targetId).toBeNull();
 });
 it.each(['clubs-12','not-in-hand'])('rejects accompanying/unknown anchor %s without mutation',id=>{
  const s=entered(),before=stableHash(s),r=applyCommand(s,{runId:s.runId,commandId:'bad',expectedSeq:s.commandSeq,action:{type:'PlayHand',selectedIds:main,coreTargetId:id,coreTargetRank:id==='clubs-12'?12:14}});expect(r.ok).toBe(false);expect(stableHash(s)).toBe(before);
 });
 it('rejects forged rank and pair target; untargeted pair has no old fixed multiplier',()=>{
  const s=entered();for(const action of [{type:'PlayHand',selectedIds:main,coreTargetId:'clubs-14',coreTargetRank:2},{type:'PlayHand',selectedIds:['hearts-2','spades-2'],coreTargetId:'hearts-2',coreTargetRank:2}] as Action[])expect(applyCommand(s,{runId:s.runId,commandId:'bad',expectedSeq:s.commandSeq,action}).ok).toBe(false);
  const after=send(s,{type:'PlayHand',selectedIds:['hearts-2','spades-2']});expect(after.lastTrace!.events.some(e=>e.sourceType==='character')).toBe(false);
 });
 it('enforces combined budget4/depth1 while whole Jokers run once, including zero role grant',()=>{
  const s=arranged(entered(),['clubs-8','hearts-8','spades-8','clubs-14','diamonds-14','hearts-3','spades-3','clubs-4']);
  s.deckInstances.find(c=>c.id==='clubs-8')!.enhancement='encore-paper';s.jokers=['a11','d04','b06'].map((id,i)=>r2CreateJoker(id,id+'/'+i,8,undefined,s));s.stage!.initialJokerIds=s.jokers.map(j=>j.instanceId);s.stage!.erxiangPreviousRank=8;s.stage!.playIndex=1;s.stage!.previousHandType='high-card';s.stage!.previousHandScore='1';s.stage!.handsLeft--;
  const hand=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!),ids=['clubs-8','hearts-8','spades-8','clubs-14','diamonds-14'];
  const input={rulesVersion:'r2' as const,runId:s.runId,rootId:s.runId+'/controlled',hand,selectedIds:ids,disabledIds:[],jokers:s.jokers,definitions:r2JokerDefinitionsFor(s),handLevels:{},playIndex:2,handsBeforePlay:s.stage!.handsLeft,previousHandType:s.stage!.previousHandType,wager:false,rng:s.rng.rule,...r2ScoreContext(s,hand,ids)};
  const old=scoreR2Hand(input),trace=scoreR2Hand({...input,erxiangCore:{targetId:'clubs-8',previousRank:8}});
  for(const id of trace.sets.activeScoringIds)expect(trace.events.filter(e=>e.sourceType==='card'&&e.sourceDefinitionId.startsWith('rank-')&&e.targetCardId===id&&e.retriggerDepth===1).length).toBeLessThanOrEqual(4);
  expect(trace.events.filter(e=>e.sourceType==='character'&&e.targetCardId==='clubs-8').map(e=>[e.operation,e.value.n])).toEqual([['retrigger-card','0'],['retrigger-cap','4']]);
  expect(trace.events.every(e=>e.retriggerDepth<=1)).toBe(true);expect(trace.events.length).toBeLessThanOrEqual(512);expect(trace.events.filter(e=>e.phase==='jokerScore')).toHaveLength(old.events.filter(e=>e.phase==='jokerScore').length);
 });
 it('saves a capped zero-grant source with the full exact execution skeleton',()=>{
  let s=start();s.jokers=['a11','d04','b06'].map((id,i)=>r2CreateJoker(id,id+'/'+i,8,undefined,s));s.deckInstances.find(c=>c.id==='clubs-8')!.enhancement='encore-paper';
  s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});
  s=arranged(s,['spades-3','clubs-8','hearts-8','spades-8','clubs-14','diamonds-14','hearts-3','clubs-4']);
  s=send(s,{type:'PlayHand',selectedIds:['spades-3']});
  const after=send(s,{type:'PlayHand',selectedIds:['clubs-8','hearts-8','spades-8','clubs-14','diamonds-14'],coreTargetId:'clubs-8',coreTargetRank:8});
  expect(after.lastTrace!.events.find(e=>e.sourceType==='character'&&e.targetCardId==='clubs-8'&&e.operation==='retrigger-card')!.value.n).toBe('0');
  expect(mutate(after,x=>{x.lastTrace!.events=x.lastTrace!.events.filter(e=>e.sourceType!=='character');}).ok).toBe(false);
 });
 it.each(['B08','Q01'])('%s disables targeting and records no rank or role ability',kind=>{
  let s=kind==='Q01'?createRun({seed:'challenge/q01/0',runId:'disabled-core',characterId:'erxiang',rulesVersion:'r2',r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group',modeConfig:{mode:'challenge',difficulty:0,challengeId:'Q01',programsEnabled:false}}):start();
  if(kind==='B08')Object.assign(s,{phase:'stage-ready',shop:null,stageIndex:8,chapter:3,boss:{definitionId:'B08',disabledSuit:null},seenBossIds:['B01','B02','B08']});else s=send(s,{type:'LeaveShop'});
  s=send(s,{type:'EnterStage'});s=arranged(s,[...main,'spades-7','hearts-7','clubs-4']);
  expect(applyCommand(s,{runId:s.runId,commandId:'disabled',expectedSeq:s.commandSeq,action:{type:'PlayHand',selectedIds:main,coreTargetId:'clubs-14',coreTargetRank:14}}).ok).toBe(false);
  const after=send(s,{type:'PlayHand',selectedIds:main});expect(after.lastTrace!.erxiangCore!.targetRank).toBeNull();expect(after.stage!.erxiangPreviousRank).toBeNull();expect(after.lastTrace!.events.some(e=>e.sourceType==='character')).toBe(false);
 });
 it('save failure preserves committed chain; retry writes the same candidate exactly once',async()=>{
  let slots:SaveSlots={revision:0,current:null,previous:null},reject=false;
  const store:SaveStore={read:async()=>slots,commit:async(revision,current,previous)=>{if(reject)throw Error('candidate-save-failure');expect(revision).toBe(slots.revision);slots={revision:revision+1,current,previous};return slots.revision;}};
  const saved=await SavedRun.start(store,entered(),slots),before=structuredClone(saved.state);reject=true;
  const result=await saved.dispatch({type:'PlayHand',selectedIds:main,coreTargetId:'clubs-14',coreTargetRank:14});expect(result.ok).toBe(false);expect(saved.state).toEqual(before);expect(saved.status).toBe('paused');
  reject=false;expect((await saved.retry()).ok).toBe(true);expect(saved.state.stage!.erxiangPreviousRank).toBe(14);expect(saved.state.lastTrace!.erxiangCore!.extraPerCard).toBe(1);
  const restored=SavedRun.restore(store,slots);expect(restored.state).toEqual(saved.state);expect((await restored.submit(saved.journal.at(-1)!)).ok).toBe(true);expect(restored.state).toEqual(saved.state);
 });
 it('saves cleared chain when abandoning or discarding the last available cards with hands still left',()=>{
  const before=send(entered(),{type:'PlayHand',selectedIds:main,coreTargetId:'clubs-14',coreTargetRank:14});
  const abandoned=send(before,{type:'AbandonRun'});expect(abandoned.outcome!.reason).toBe('abandoned');expect(abandoned.stage!.erxiangPreviousRank).toBeNull();expect(abandoned.lastTrace!.erxiangCore!.targetRank).toBe(14);
  const emptying=structuredClone(before);emptying.handOrder=['hearts-14','spades-14'];emptying.drawPile=[];emptying.discardPile=emptying.deckInstances.map(c=>c.id).filter(id=>!emptying.handOrder.includes(id)&&!emptying.playedPile.includes(id));
  const ended=send(emptying,{type:'DiscardHand',selectedIds:[...emptying.handOrder]});expect(ended.outcome!.reason).toBe('no-legal-cards');expect(ended.stage!.handsLeft).toBeGreaterThan(0);expect(ended.stage!.erxiangPreviousRank).toBeNull();
 });
 it('requires complete truthful current metadata and rejects changed targets/extra requests/rank roots after checksum recomputation',()=>{
  const s=send(entered(),{type:'PlayHand',selectedIds:main,coreTargetId:'clubs-14',coreTargetRank:14});
  for(const fn of [(x:R2RunState)=>{delete x.stage!.erxiangPreviousRank;},(x:R2RunState)=>{delete x.lastTrace!.erxiangCore;},(x:R2RunState)=>{x.lastTrace!.erxiangCore!.targetIds=['clubs-12'];},(x:R2RunState)=>{x.lastTrace!.erxiangCore!.extraPerCard=2;},(x:R2RunState)=>{x.lastTrace!.events.find(e=>e.sourceType==='character')!.rootEventId=x.lastTrace!.events[0].eventId;}])expect(mutate(s,fn).ok).toBe(false);
 });
});
