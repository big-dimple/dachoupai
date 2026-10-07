import {describe,expect,it} from 'vitest';
import {createRun,applyCommand,type R2RunState,type Action,type Command} from '../src/domain/run';
import {makeCheckpoint,readCheckpoint,type Checkpoint} from '../src/application/checkpoint';
import {r2AssistAvailability} from '../src/domain/r2Assist';
import {savedAssistSummary} from '../src/game/AssistSelection';
import {stableHash} from '../src/domain/hash';
const main=['spades-9','hearts-9','clubs-13','diamonds-13'],assist=['spades-12','hearts-12'];
function fixture(tool?:string){
 let state=createRun({seed:'consumption-review',runId:'consumption-review',characterId:'amo',rulesVersion:'r2',r2Profile:'amo-assist-v1',modeConfig:{mode:'standard',difficulty:3,challengeId:null,programsEnabled:false}});
 const journal:Command[]=[];
 const send=(action:Action)=>{const command={runId:state.runId,commandId:`${state.runId}/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action};const result=applyCommand(state,command);if(!result.ok)throw Error(result.code);state=result.state;journal.push(command);return state;};
 if(tool)state.consumables=[{instanceId:'fixture-tool',definitionId:tool}];
 send({type:'LeaveShop'});send({type:'EnterStage'});
 state.handOrder=[...main,...assist,'clubs-6','diamonds-7'];state.drawPile=state.deckInstances.map(c=>c.id).filter(id=>!state.handOrder.includes(id));
 return {get state(){return state;},journal,send,save:()=>makeCheckpoint(state,journal)};
}
function afterOrdinary(){const run=fixture();run.send({type:'PlayAssistedHand',selectedIds:main,assistIds:assist});run.send({type:'PlayHand',selectedIds:['clubs-6']});return run;}
function moveConsumed(cp:Checkpoint,zone:'drawPile'|'discardPile'|'handOrder'){
 const forged=structuredClone(cp);forged.state.playedPile=forged.state.playedPile.filter(id=>id!==assist[0]);
 // Preserve conservation and hand limit so only the historical consumption contract rejects it.
 if(zone==='handOrder')forged.state.drawPile.push(forged.state.handOrder.pop()!);
 forged.state[zone].push(assist[0]);const {checksum,...payload}=forged;forged.checksum=stableHash(payload);return forged;
}
function assertReadable(cp:Checkpoint){const result=readCheckpoint(JSON.parse(JSON.stringify(cp)));expect(result).toEqual({ok:true,checkpoint:cp});}
function cleared(tool?:string){const run=fixture(tool);run.state.handLevels['two-pair']=2;run.send({type:'PlayAssistedHand',selectedIds:main,assistIds:assist});expect(run.state.phase).toBe('stage-cleared');return run;}
describe('assist consumption remains bound to available same-stage journal evidence',()=>{
 it.each(['drawPile','discardPile','handOrder'] as const)('rejects a consumed instance moved to %s after a later ordinary hand',zone=>{
  const run=afterOrdinary(),cp=run.save(),forged=moveConsumed(cp,zone);expect(cp.state.lastTrace!.assist).toBeNull();assertReadable(cp);
  expect(forged.journal).toEqual(cp.journal);expect(forged.state.receipts).toEqual(cp.state.receipts);
  expect(readCheckpoint(forged)).toEqual({ok:false,code:'invalid-save-assist-used-zone'});
 });
 it('keeps valid later-hand saves byte-exact and never redraws the consumed pair',()=>{
  const run=afterOrdinary();assertReadable(run.save());run.send({type:'PlayHand',selectedIds:['diamonds-7']});expect(run.state.handOrder.some(id=>assist.includes(id))).toBe(false);expect(run.state.playedPile).toEqual(expect.arrayContaining(assist));assertReadable(run.save());
 });
 it.each(['T02','T08','T03','T07'])('allows a legal shop %s operation on an already consumed instance',tool=>{
  const run=cleared(tool);run.send({type:'OpenShop'});run.send({type:'UseConsumable',instanceId:'fixture-tool',targetIds:[assist[0]]});assertReadable(run.save());
  if(tool==='T02'){expect(run.state.destroyedIds).toContain(assist[0]);expect(run.state.playedPile).not.toContain(assist[0]);}
  else expect(run.state.playedPile).toContain(assist[0]);
  if(tool==='T08')expect(run.state.deckInstances.find(c=>c.id===assist[0])!.rank).toBe(13);
  if(tool==='T03')expect(run.state.deckInstances.find(c=>c.id===assist[0])!.suit).toBe('hearts');
  if(tool==='T07'){const copy=run.state.deckInstances.at(-1)!;expect(copy.id).not.toBe(assist[0]);expect(copy.rank).toBe(12);expect(run.state.drawPile).toContain(copy.id);}
 });
 it('clears the physical consumption constraint only on actual next-stage entry',()=>{
  const run=cleared();run.send({type:'OpenShop'});run.send({type:'LeaveShop'});assertReadable(run.save());expect(readCheckpoint(moveConsumed(run.save(),'drawPile')).ok).toBe(false);
  run.send({type:'EnterStage'});expect(run.state.stage!.assistUsed).toBe(false);expect(run.state.lastTrace).toBeNull();expect(run.state.playedPile).toEqual([]);expect([...run.state.handOrder,...run.state.drawPile]).toEqual(expect.arrayContaining(assist));assertReadable(run.save());
 });
 it('allows skipping a stage without treating it as a physical reshuffle',()=>{
  const run=cleared();run.send({type:'OpenShop'});run.send({type:'SkipStage'});expect(run.state.lastTrace).toBeNull();expect(run.state.playedPile).toEqual(expect.arrayContaining(assist));assertReadable(run.save());
  expect(readCheckpoint(moveConsumed(run.save(),'drawPile'))).toEqual({ok:false,code:'invalid-save-assist-used-zone'});
  run.send({type:'OpenShop'});run.send({type:'LeaveShop'});run.send({type:'EnterStage'});assertReadable(run.save());expect(run.state.stage!.assistUsed).toBe(false);
 });
 it('never restores spent eligibility from unknown or truncated journal history',()=>{
  const run=afterOrdinary();
  for(const journal of [[],run.journal.slice(-1),run.journal.slice(-2)]){
   const cp=makeCheckpoint(run.state,journal),read=readCheckpoint(cp);expect(read.ok).toBe(true);if(!read.ok)throw Error(read.code);expect(read.checkpoint.state).toEqual(run.state);expect(read.checkpoint.state.stage!.assistUsed).toBe(true);expect(r2AssistAvailability(read.checkpoint.state)).toEqual({available:false,remaining:0,reason:'used'});
  }
 });
});

it('result assist identity reads a real committed event, never a draft or an unrelated growth event',()=>{
 const run=fixture();run.send({type:'PlayAssistedHand',selectedIds:main,assistIds:assist});
 const trace=run.state.lastTrace!,before=JSON.stringify(run.state);if(!trace.assist)throw Error('fixture must have a committed assist');
 expect(savedAssistSummary(trace)).toBe('阿默助攻 ×2 · 用掉2张');
 expect(savedAssistSummary({...trace,events:trace.events.filter(e=>e.sourceType!=='character')})).toBeUndefined();
 expect(savedAssistSummary({...trace,events:trace.events.map(e=>e.sourceType==='character'?{...e,after:e.before}:e)})).toBeUndefined();
 expect(savedAssistSummary({...trace,assist:null})).toBeUndefined();expect(JSON.stringify(run.state)).toBe(before);
});
