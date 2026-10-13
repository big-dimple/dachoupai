import {describe,it,expect} from 'vitest';
import {applyCommand,createRun,assertRunInvariants,type R2RunState,type Action} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {getR2Stage,r2ScoreContext} from '../src/domain/r2Run';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {stableHash} from '../src/domain/hash';
import {r2CreateJoker} from '../src/domain/r2Run';
import {aiHandKey,rankAiHandCandidates,type AiHandInput} from '../src/game/AiHandCandidates';

const start=()=>createRun({seed:'bounded-save',runId:'bounded-save',characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
function send(s:R2RunState,action:Action){const c={runId:s.runId,commandId:s.runId+'/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action};const r=applyCommand(s,c);expect(r.ok,r.ok?'':r.code).toBe(true);if(!r.ok)throw Error(r.code);assertRunInvariants(r.state);return {s:r.state,c};}
function round(s:R2RunState){const cp=makeCheckpoint(s,[]),r=readCheckpoint(JSON.parse(JSON.stringify(cp)));expect(r.ok).toBe(true);if(!r.ok)throw Error(r.code);expect(r.checkpoint.state).toEqual(s);return r.checkpoint.state;}
function corrupt(s:R2RunState,change:(s:R2RunState)=>void){const cp=makeCheckpoint(s,[]);change(cp.state);const {checksum,...payload}=cp;return readCheckpoint({...payload,checksum:stableHash(payload)});}
function arrange(s:R2RunState,ids:string[]){const all=[...s.handOrder,...s.drawPile,...s.discardPile];s.handOrder=[...ids,...all.filter(id=>!ids.includes(id)).slice(0,8-ids.length)];s.drawPile=all.filter(id=>!s.handOrder.includes(id));s.discardPile=[];s.stage!.disabledIds=[];assertRunInvariants(s);return s;}

describe('bounded clear current-profile locking and actual receipts',()=>{
 it('published target equals entered target, duplicate entry and refresh preserve the exact lock',()=>{
  const shop=start(),forecast=getR2Stage(0,shop.tourMode,shop.difficulty,shop)!;
  const ready=send(shop,{type:'LeaveShop'}).s,{s,c}=send(ready,{type:'EnterStage'});
  expect(s.stage!.initialTargetHeat).toBe(forecast.targetHeat);expect(s.stage!.targetHeat).toBe('400');
  const duplicate=applyCommand(s,c);expect(duplicate).toMatchObject({ok:true,duplicate:true,events:[]});expect(duplicate.state).toEqual(s);
  s.gold=206;s.handLevels.pair=20;expect(round(s).stage!.targetHeat).toBe('400');
  expect(corrupt(s,v=>{v.stage!.initialTargetHeat='401';v.stage!.targetHeat='401';}).ok).toBe(false);
  const played=send(s,{type:'PlayHand',selectedIds:[s.handOrder[0]]}).s;round(played);
  if(played.phase==='await-input')expect(played.stage!.targetHeat).toBe('400');
 });
 it('B14 applies the same ceil(initial/20) after each successful discard; no compound target',()=>{
  // Legal controlled late-stage state, not a naturally acquired chapter-eight run.
  let s=send(start(),{type:'LeaveShop'}).s;
  Object.assign(s,{chapter:8,stageIndex:23,stage:null,shop:null,boss:{definitionId:'B14',disabledSuit:null},seenBossIds:['B01','B02','B05','B06','B07','B08','B13','B14']});
  s.routeGrowth={clears:7,G:0,S:0,F:0,settlements:Array.from({length:7},(_,i)=>({stageIndex:i*3+2,families:[]}))};
  s=send(s,{type:'EnterStage'}).s;expect(s.stage!.initialTargetHeat).toBe('40950');
  for(const expected of ['42998','45046']){s=send(s,{type:'DiscardHand',selectedIds:[s.handOrder[0]]}).s;expect(s.stage!.targetHeat).toBe(expected);expect(s.stage!.initialTargetHeat).toBe('40950');s=round(s);}
 });
 it('actual clear saves one bounded source, qualification awards once and corruption is refused',()=>{
  let s=send(send(start(),{type:'LeaveShop'}).s,{type:'EnterStage'}).s;
  const ids=['hearts-9','spades-9'];for(const id of ids)s.deckInstances.find(c=>c.id===id)!.enhancement='multiplier-paper';s.handLevels.pair=4;
  s=send(arrange(s,ids),{type:'PlayHand',selectedIds:ids}).s;expect(s.phase).toBe('stage-cleared');
  expect(s.routeGrowth!.G).toBe(1);const read=s.lastTrace!.events.filter(e=>e.operation==='route-factor');
  expect(read).toHaveLength(1);expect(read[0]).toMatchObject({routePolicy:'bounded-max-v1',routeCap:{n:'4',d:'1'},value:{n:'1',d:'1'}});round(s);
  for(const change of [(v:R2RunState)=>{v.lastTrace!.events.find(e=>e.operation==='route-factor')!.routeCap={n:'8',d:'1'};},(v:R2RunState)=>{delete v.lastTrace!.events.find(e=>e.operation==='route-factor')!.routePolicy;},(v:R2RunState)=>{v.lastTrace!.routeGrowth!.applied!.factor={n:'4',d:'1'};}])expect(corrupt(s,change).ok).toBe(false);
 });
 it('a real T01 transaction restores a legal three-hand B09 window without raising its locked goal',()=>{
  const ready=send(start(),{type:'LeaveShop'}).s;
  Object.assign(ready,{chapter:3,stageIndex:8,stage:null,shop:null,boss:{definitionId:'B09',disabledSuit:null},seenBossIds:['B01','B02','B09'],handLevels:{pair:1}});
  ready.routeGrowth={clears:8,G:8,S:0,F:0,settlements:Array.from({length:8},(_,stageIndex)=>({stageIndex,families:['G']}))};
  ready.jokers=[r2CreateJoker('mantangcai','starter',4,'none',ready)];
  const entered=send(ready,{type:'EnterStage'}).s,ids=[6,7,8].flatMap(rank=>['hearts-'+rank,'clubs-'+rank]);
  const fixture=arrange(entered,ids);expect(fixture.stage!.initialHands).toBe(3);expect(fixture.stage!.initialTargetHeat).toBe('3600');
  let low=structuredClone(fixture);for(let i=0;i<3;i++)low=send(low,{type:'PlayHand',selectedIds:ids.slice(i*2,i*2+2)}).s;
  expect(low.stage!.heat).toBe('3336');expect(low.phase).toBe('run-lost');round(low);
  let trained=structuredClone(fixture);trained.consumables=[{instanceId:'training',definitionId:'T01'}];
  trained=send(trained,{type:'UseConsumable',instanceId:'training',targetIds:[],handType:'pair'}).s;
  expect(trained.handLevels.pair).toBe(2);expect(trained.consumables).toEqual([]);expect(round(trained).stage!.targetHeat).toBe('3600');
  for(let i=0;i<3;i++)trained=send(trained,{type:'PlayHand',selectedIds:ids.slice(i*2,i*2+2)}).s;
  expect(trained.stage!.heat).toBe('4620');expect(trained.phase).toBe('stage-cleared');expect(trained.routeGrowth!.G).toBe(9);round(trained);
 });
 it('AI key and preview carry the same bounded policy rather than ranking with a hidden product',()=>{
  let s=send(send(start(),{type:'LeaveShop'}).s,{type:'EnterStage'}).s;
  const ids=['hearts-3','hearts-4','hearts-5','hearts-6','hearts-7'];s=arrange(s,ids);
  const hand=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!);
  const request:AiHandInput={hand,jokers:s.jokers,definitions:[],handRules:{fourStraight:false,fourFlush:false},disabledIds:[],ordinaryPointsSuppressedIds:[],boss:null,stageIndex:0,sealedJokerIds:[],challengeDisabledJokerId:null,resources:{gold:s.gold,handsLeft:4,playIndex:0,discardsUsed:0,stageHeat:'0',target:'400'},contentVersion:s.contentVersion+'/'+s.contentHash,score:{...r2ScoreContext(s,hand,ids),handLevels:s.handLevels,previousHandType:null,wager:false}};
  // Definitions are the actual versioned catalog, imported lazily below by test module scope.
  request.definitions=r2JokerDefinitionsFor(s);request.score.routeGrowth={clears:8,G:0,S:4,F:8};
  const key=aiHandKey(request);expect(rankAiHandCandidates(request).status).toBe('ready');
  const legacy=structuredClone(request);delete legacy.score.routeGrowthPolicy;expect(aiHandKey(legacy)).not.toBe(key);
 });
});
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
