import {expect,it} from 'vitest';
import {createRun,applyCommand,type Action,type R2RunState} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {canCarryTool,carriedToolAtEntry,carriedToolAtHand} from '../src/game/ToolCarryIntent';
function fixture(){const r=createRun({rulesVersion:'r2',seed:'carry',runId:'carry-test',characterId:'laohuan',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group'});r.consumables=[{instanceId:'old',definitionId:'T08'},{instanceId:'bought',definitionId:'T08'}];return r;}
function send(s:R2RunState,action:Action){const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;}
it('binds only the purchased instance and the exact leave/enter pair; no checkpoint or mutation',()=>{
 const s=fixture(),before=structuredClone(s),intent={runId:s.runId,stageIndex:s.stageIndex,shopSeq:s.commandSeq,instanceId:'bought'};
 expect(carriedToolAtEntry(s,intent)).toBe(false);const entry=send(s,{type:'LeaveShop'});expect(carriedToolAtEntry(entry,intent)).toBe(true);
 const hand=send(entry,{type:'EnterStage'});expect(carriedToolAtHand(hand,intent)).toBe(true);expect(carriedToolAtHand(hand,undefined)).toBe(false);
 for(const changed of [{runId:'other'},{stageIndex:s.stageIndex+1},{shopSeq:s.commandSeq+1},{instanceId:'missing'}])expect(carriedToolAtHand(hand,{...intent,...changed})).toBe(false);
 expect(carriedToolAtHand({...hand,consumables:hand.consumables.filter(c=>c.instanceId!=='bought')},intent)).toBe(false);
 const pending=send(hand,{type:'DiscardHand',selectedIds:[hand.handOrder[0]],laohuanTrick:true});expect(pending.phase).toBe('pending-refill');expect(carriedToolAtHand(pending,intent)).toBe(false);
 expect(s).toEqual(before);expect(hand.consumables).toEqual(before.consumables);
});
it('only supported card-target tools with both phases qualify, honoring mode restrictions',()=>{
 const s=fixture();expect(canCarryTool(s,'bought')).toBe(true);expect(canCarryTool(s,'missing')).toBe(false);
 for(const id of ['T17','T18','P01','S04','missing']){s.consumables=[{instanceId:'candidate',definitionId:id}];expect(canCarryTool(s,'candidate')).toBe(false);}
 const challenge=createRun({rulesVersion:'r2',seed:'challenge/q10/0',runId:'challenge',characterId:'amo',modeConfig:{mode:'challenge',difficulty:0,challengeId:'Q10',programsEnabled:false}});challenge.consumables=[{instanceId:'candidate',definitionId:'T11'}];expect(canCarryTool(challenge,'candidate')).toBe(false);
});
