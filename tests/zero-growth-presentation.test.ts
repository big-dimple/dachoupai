import {expect,it} from 'vitest';
import {createRun,applyCommand,type Action,type R2RunState} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {r2JokerDefinitionFor} from '../src/domain/r2ContentProfiles';
import {newRunIdentity} from '../src/game/RunLaunch';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {r2ScoreOperationText} from '../src/game/r2Help';
import {isNeutralScoreReceipt,scoreArrival} from '../src/game/ScoreTableMotion';
import {scoreSourceProcess} from '../src/game/ScoreSourceProcess';
import {savedBenefit,hasActualBenefit} from '../src/game/JokerExperience';
import {handGrowthChanges} from '../src/game/SavedGrowthChange';
const pair=['clubs-6','hearts-6'];
function send(state:R2RunState,action:Action){const r=applyCommand(state,{runId:state.runId,commandId:state.runId+'/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;}
function arrange(state:R2RunState,ids:readonly string[]){const used=new Set([...state.playedPile,...state.discardPile,...state.destroyedIds]),available=state.deckInstances.map(c=>c.id).filter(id=>!used.has(id));state.handOrder=[...ids,...available.filter(id=>!ids.includes(id))].slice(0,state.stage!.handLimit);state.drawPile=available.filter(id=>!state.handOrder.includes(id));return state;}
function fixture(){
 let s=createRun({seed:'zero-growth-caption',runId:'controlled/zero-growth-caption',rulesVersion:'r2',characterId:'erxiang',r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});arrange(s,['spades-14','hearts-14','clubs-14','diamonds-14']);s=send(s,{type:'PlayHand',selectedIds:s.handOrder.slice(0,4)});expect(s.phase).toBe('stage-cleared');
 s=send(send(send(s,{type:'OpenShop'}),{type:'LeaveShop'}),{type:'EnterStage'});expect(s.stageIndex).toBe(1);
 s.jokers=[r2CreateJoker('mantangcai','controlled/mantangcai',5,'none',s),r2CreateJoker('b10','controlled/new-b10',4,'none',s)];s.stage!.initialJokerIds=s.jokers.map(j=>j.instanceId);s.handLevels.pair=2;arrange(s,pair);expect(readCheckpoint(makeCheckpoint(s,[])).ok).toBe(true);return s;
}
it('keeps the real zero heat receipt and +10 growth save but removes only the empty score beat',()=>{
 const before=fixture(),snapshot=JSON.stringify(before),after=send(before,{type:'PlayHand',selectedIds:pair,erxiangTargetId:pair[1]}),trace=after.lastTrace!,raw=JSON.stringify(trace),definition=r2JokerDefinitionFor(after,'b10');
 expect(trace.accumulator).toEqual({H:{n:'146',d:'1'},M:{n:'17',d:'2'}});expect(trace.finalScore).toBe('1241');
 const zero=trace.events.find(e=>e.sourceDefinitionId==='b10'&&e.operation==='read-growth')!,growth=trace.events.find(e=>e.sourceDefinitionId==='b10'&&e.operation==='add-growth')!;
 expect(zero.value).toEqual({n:'0',d:'1'});expect(zero.after).toEqual(zero.before);expect(r2ScoreOperationText(zero,definition)).toBe('+0 热度');expect(isNeutralScoreReceipt(zero)).toBe(true);expect(scoreArrival(zero)).toBeUndefined();expect(scoreSourceProcess(trace,zero,'炉火纯青')).toBeUndefined();expect(hasActualBenefit(zero)).toBe(false);
 expect(isNeutralScoreReceipt(growth)).toBe(false);expect(growth.value).toEqual({n:'10',d:'1'});expect(after.jokers.find(j=>j.definitionId==='b10')!.growth.heat).toEqual({n:'10',d:'1'});
 expect(savedBenefit(after,trace,growth)!.destination).toContain('结算后新增，下手按条件读取');expect(handGrowthChanges(after).find(g=>g.instanceId===growth.sourceInstanceId)!.line).toContain('+0→+10');
 expect(trace.events.filter(e=>!isNeutralScoreReceipt(e))).toContain(growth);expect(JSON.stringify(trace)).toBe(raw);expect(JSON.stringify(before)).toBe(snapshot);
 let next=send(send(send(after,{type:'OpenShop'}),{type:'LeaveShop'}),{type:'EnterStage'});arrange(next,pair);next=send(next,{type:'PlayHand',selectedIds:pair});const read=next.lastTrace!.events.find(e=>e.sourceDefinitionId==='b10'&&e.operation==='read-growth')!;
 expect(read.value).toEqual({n:'10',d:'1'});expect(isNeutralScoreReceipt(read)).toBe(false);expect(r2ScoreOperationText(read,definition)).toBe('+10 热度');expect(savedBenefit(next,next.lastTrace!,read)!.effect).toBe('读取已有 10 热度');
});
it('a real zero multiplier-growth reader keeps its own declared unit',()=>{
 const s=fixture();s.jokers.push(r2CreateJoker('b03','controlled/zero-mult-growth',6,'none',s));s.stage!.initialJokerIds=s.jokers.map(j=>j.instanceId);const after=send(s,{type:'PlayHand',selectedIds:pair}),event=after.lastTrace!.events.find(e=>e.sourceDefinitionId==='b03'&&e.operation==='read-growth')!;
 expect(event.value).toEqual({n:'0',d:'1'});expect(r2ScoreOperationText(event,r2JokerDefinitionFor(after,'b03'))).toBe('+0 倍率');expect(isNeutralScoreReceipt(event)).toBe(true);
});
