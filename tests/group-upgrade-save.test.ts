import {r2DisabledCards} from '../src/domain/r2Chapter';
import {describe,it,expect} from 'vitest';
import {createRun,applyCommand,type R2RunState,type Action} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {stableHash} from '../src/domain/hash';
import {CHARACTER_IDS} from '../src/domain/characters';
const main=['spades-9','hearts-9','clubs-9','clubs-13','diamonds-13'];
const send=(s:R2RunState,action:Action)=>{const r=applyCommand(s,{runId:s.runId,commandId:String(s.commandSeq+1),expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;};
function fixture(characterId:typeof CHARACTER_IDS[number]='amo',ids=['b06']){
 let s=createRun({seed:'group-strict',runId:'group-strict',characterId,rulesVersion:'r2',r2Profile:'group-upgrade-v1'});s.jokers=ids.map(id=>r2CreateJoker(id,id,8,undefined,s));s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});
 s.handOrder=[...main,'spades-12','hearts-12','diamonds-7'];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id));return s;
}
function readMutation(s:R2RunState,change:(state:any)=>void){const cp=structuredClone(makeCheckpoint(s,[]));change(cp.state);const {checksum,...body}=cp;return readCheckpoint({...body,checksum:stableHash(body)});}
describe('new group trace execution closure',()=>{
 it.each(CHARACTER_IDS)('%s rejects retagged final type and scoring set with a recomputed checksum',character=>{
  const after=send(fixture(character),{type:'PlayHand',selectedIds:main});expect(readCheckpoint(makeCheckpoint(after,[])).ok).toBe(true);
  expect(readMutation(after,s=>{s.handLevels['three-kind']=1;s.lastTrace.handType='three-kind';for(const e of s.lastTrace.events)if(e.sourceType==='rule'&&e.sourceDefinitionId==='full-house')e.sourceDefinitionId='three-kind';s.stage.previousHandType='three-kind';s.chapterHandUsage['three-kind']=s.chapterHandUsage['full-house'];delete s.chapterHandUsage['full-house'];}).ok).toBe(false);
 });
 it.each(['B04','B02'] as const)('%s accepts real enhancement/Joker retriggers and rejects missing requests or reparented execution',boss=>{
  let s=createRun({seed:'group-cap',runId:'group-cap',characterId:'erxiang',rulesVersion:'r2',r2Profile:'group-upgrade-v1',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  s.jokers=['a11','d04','d11','b06'].map(id=>r2CreateJoker(id,id,8,undefined,s));s.deckInstances.find(c=>c.id==='spades-9')!.enhancement='encore-paper';
  Object.assign(s,{phase:'stage-ready',shop:null,stageIndex:2,boss:{definitionId:boss,disabledSuit:null},seenBossIds:[boss]});s=send(s,{type:'EnterStage'});
  const full=['clubs-13','diamonds-13','spades-9','hearts-9','clubs-9'];
  const arrange=(ids:string[])=>{s.handOrder=ids;s.stage!.disabledIds=r2DisabledCards(s.boss,s.stageIndex,ids.map(id=>s.deckInstances.find(c=>c.id===id)!));s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id)&&!s.playedPile.includes(id));};
  arrange(['spades-2',...full,'spades-12','hearts-12']);s=send(s,{type:'PlayHand',selectedIds:['spades-2']});
  arrange([...full,'spades-12','hearts-12','diamonds-7']);expect(readCheckpoint(makeCheckpoint(s,[])).ok).toBe(true);
  const after=send(s,{type:'PlayHand',selectedIds:full}),events=after.lastTrace!.events;expect(readCheckpoint(makeCheckpoint(after,[])).ok).toBe(true);
  if(boss==='B04'){expect(events.find(e=>e.sourceDefinitionId==='b06'&&e.targetCardId==='spades-9')).toMatchObject({value:{n:'0',d:'1'}});expect(events.filter(e=>e.operation==='retrigger-cap')).toHaveLength(1);}
  expect(readMutation(after,state=>{state.lastTrace.events=state.lastTrace.events.filter((e:any)=>e.reasonKey!=='enhancement.encore-paper.retrigger-card');}).ok).toBe(false);
  expect(readMutation(after,state=>{const es=state.lastTrace.events,execution=es.find((e:any)=>e.retriggerDepth===1&&e.targetCardId==='spades-9');execution.rootEventId=es.find((e:any)=>e.operation==='retrigger-card'&&e.targetCardId==='spades-9').eventId;}).ok).toBe(false);
 });
 it.each(['base-root','after-final','invented-enhancement'] as const)('rejects %s execution forgery after checksum regeneration',kind=>{
  const after=send(fixture(),{type:'PlayHand',selectedIds:main});
  expect(readMutation(after,s=>{const es=s.lastTrace.events,repeat=es.find((e:any)=>e.retriggerDepth===1&&e.sourceDefinitionId==='rank-9');
   if(kind==='base-root')repeat.rootEventId=es[0].eventId;
   else if(kind==='after-final'){es.splice(es.indexOf(repeat),1);es.splice(es.findIndex((e:any)=>e.phase==='finalScore')+1,0,repeat);}
   else {const request=es.find((e:any)=>e.sourceDefinitionId==='b06'),forged={...structuredClone(request),eventId:'forged-request',sourceType:'card',sourceDefinitionId:main[0],sourceInstanceId:main[0],reasonKey:'enhancement.encore-paper.retrigger-card',visibleCondition:{kind:'always'},value:{n:'3',d:'1'}};es.splice(es.indexOf(request)+1,0,forged);es.splice(es.indexOf(repeat)+1,0,...[0,1,2].map(i=>({...structuredClone(repeat),eventId:'forged-repeat/'+i})));}
  }).ok).toBe(false);
 });
});
