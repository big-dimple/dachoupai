import {describe,expect,it} from 'vitest';
import {makeCheckpoint,readCheckpoint,restoreSlots,type Checkpoint} from '../src/application/checkpoint';
import {applyCommand,createRun,type Action,type Command,type R2RunState} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import type {R2BossId} from '../src/domain/r2Chapter';
import {stableHash} from '../src/domain/hash';
import type {ScoreEvent} from '../src/domain/scoreR2';
import rawV7 from './fixtures/c03-v7-checkpoint.json';

interface Fixture {state:R2RunState;journal:Command[]}
const object=(value:unknown)=>value as Record<string,unknown>;
function send(fixture:Fixture,action:Action):Fixture {
  const command:Command={runId:fixture.state.runId,commandId:`${fixture.state.runId}/${fixture.state.commandSeq+1}`,expectedSeq:fixture.state.commandSeq,action};
  const result=applyCommand(fixture.state,command);if(!result.ok)throw Error(result.code);
  return {state:result.state,journal:[...fixture.journal,command]};
}
function start():Fixture {return {state:createRun({seed:'c03-save',runId:'c03-save',characterId:'erxiang',rulesVersion:'r2'}),journal:[]};}
function enter(boss?:R2BossId,definitions:string[]=[]):Fixture {
  let fixture=start();fixture.state.jokers=definitions.map(id=>r2CreateJoker(id,`c03/source/${id}`,8,'holographic'));
  if(!boss)return send(send(fixture,{type:'LeaveShop'}),{type:'EnterStage'});
  // Artificial chapter position/acquisition, not a natural eight-chapter run.
  // Entry, cards, counters, traces and all subsequent transactions are real shared commands.
  const late=Number(boss.slice(1))>=13,chapter=late?7:3;
  Object.assign(fixture.state,{stageIndex:chapter*3-1,chapter,phase:'stage-ready',shop:null,
    boss:{definitionId:boss,disabledSuit:boss==='B03'?'hearts':null},seenBossIds:late?['B01','B02','B03','B04','B05','B06',boss]:['B01','B02',boss]});
  return send(fixture,{type:'EnterStage'});
}
function play(fixture:Fixture):Fixture {
  const id=fixture.state.handOrder[0];fixture.state.deckInstances.find(card=>card.id===id)!.rank=2;
  return send(fixture,{type:'PlayHand',selectedIds:[id]});
}
function raw(fixture:Fixture):Checkpoint {
  const payload={format:'dachoupai-checkpoint' as const,formatVersion:1 as const,state:structuredClone(fixture.state),journalBaseSeq:fixture.state.commandSeq-fixture.journal.length,journal:structuredClone(fixture.journal)};
  return {...payload,checksum:stableHash(payload)};
}
function damaged(fixture:Fixture,change:(state:R2RunState)=>void):Checkpoint {
  const checkpoint=raw(fixture);change(checkpoint.state);const {checksum,...payload}=checkpoint;
  return {...payload,checksum:stableHash(payload)};
}
function roundTrip(fixture:Fixture):void {
  const before=JSON.stringify(fixture.state),parsed=readCheckpoint(makeCheckpoint(fixture.state,fixture.journal));
  expect(parsed.ok&&parsed.checkpoint.state).toEqual(fixture.state);expect(JSON.stringify(fixture.state)).toBe(before);
}
const seal=(state:R2RunState)=>state.lastTrace!.events.find(event=>event.operation==='seal-joker')!;
const half=(state:R2RunState)=>state.lastTrace!.events.find(event=>event.operation==='halve-base-heat')!;
function forgedJoker(fixture:Fixture,definitionId:string,operation='read-coefficient'):Checkpoint {
  return damaged(fixture,state=>{
    const trace=state.lastTrace!,source=trace.sourceJokers.find(joker=>joker.definitionId===definitionId)!,eventId=`${trace.rootId}/forged`;
    const event:ScoreEvent={eventId,rootId:trace.rootId,rootEventId:eventId,phase:'jokerScore',sourceType:'joker',sourceDefinitionId:definitionId,sourceInstanceId:source.instanceId,
      operation,value:{n:operation==='chance-heat-check'?'0':'1',d:'1'},before:trace.accumulator,after:trace.accumulator,reasonKey:'forged',visibleCondition:{kind:'always'},retriggerDepth:0};
    const at=trace.events.findIndex(event=>event.phase==='finalScore');trace.events.splice(at,0,event);
  });
}

describe('C03 v8 Boss snapshots and finite saved sources',()=>{
  it('retains the exact published v7 raw and rejects it before missing v8 fields',()=>{
    expect(rawV7.state.contentVersion).toBe('quality-r2-content-v7');expect(rawV7.checksum).toBe('json-fnv-v1:ae0b20ea9d4cbb86');
    const before=JSON.stringify(rawV7);expect(readCheckpoint(rawV7)).toEqual({ok:false,code:'incompatible-version'});
    const slots=restoreSlots({revision:2,current:rawV7,previous:null});expect(slots.status).toBe('invalid');expect(slots.raw).toBe(rawV7);expect(JSON.stringify(rawV7)).toBe(before);
  });
  it('round trips a real ordinary entry with empty Boss and seal snapshots',()=>{
    const fixture=enter();expect(fixture.state.contentVersion).toBe('quality-r2-content-v8');
    expect(fixture.state.stage).toMatchObject({boss:null,initialTargetHeat:'400',initialHandLimit:8,initialJokerIds:[],sealedJokerIds:[]});roundTrip(fixture);
  });
  it.each(['boss','initialTargetHeat','initialHandLimit','initialJokerIds','sealedJokerIds'])('requires the persisted stage.%s field',field=>{
    const fixture=enter();roundTrip(fixture);expect(readCheckpoint(damaged(fixture,state=>{delete object(state.stage)[field];})).ok).toBe(false);
  });
  it('rejects altered initial target and ordinary-stage Boss/seals',()=>{
    const fixture=enter(undefined,['pengci']);roundTrip(fixture);
    for(const change of [(state:R2RunState)=>{state.stage!.initialTargetHeat='401';},(state:R2RunState)=>{state.stage!.boss={definitionId:'B01',disabledSuit:null};},(state:R2RunState)=>{state.stage!.sealedJokerIds=['c03/source/pengci'];}])expect(readCheckpoint(damaged(fixture,change)).ok).toBe(false);
  });
  it('keeps B11 initial hand limit and exact shrinking refill budget',()=>{
    const fixture=play(play(enter('B11')));expect(fixture.state.stage).toMatchObject({initialHandLimit:8,handLimit:6,playIndex:2});roundTrip(fixture);
    expect(readCheckpoint(damaged(fixture,state=>{state.stage!.handLimit=7;})).ok).toBe(false);
  });
  it('keeps B14 two discard increases linear at 7000 each, with all cursors unchanged by reading',()=>{
    let fixture=enter('B14');
    for(let i=0;i<2;i++)fixture=send(fixture,{type:'DiscardHand',selectedIds:[fixture.state.handOrder[0]]});
    expect(fixture.state.stage).toMatchObject({initialTargetHeat:'140000',targetHeat:'154000',discardsUsed:2});roundTrip(fixture);
    expect(readCheckpoint(damaged(fixture,state=>{state.stage!.targetHeat='154350';})).ok).toBe(false);
  });
  it.each(['B05','B12'] as const)('binds %s half-base source to the saved hand-start context and exact 20→10 H / unchanged M',boss=>{
    let fixture=play(enter(boss));
    if(boss==='B05'){expect(half(fixture.state)).toBeUndefined();fixture=play(fixture);}
    const event=half(fixture.state);expect(event).toMatchObject({phase:'base',sourceType:'rule',sourceDefinitionId:boss,value:{n:'1',d:'2'},before:{H:{n:'20',d:'1'},M:{n:'1',d:'1'}},after:{H:{n:'10',d:'1'},M:{n:'1',d:'1'}}});roundTrip(fixture);
    for(const change of [(state:R2RunState)=>{half(state).value={n:'1',d:'3'};},(state:R2RunState)=>{half(state).after.H={n:'20',d:'1'};},(state:R2RunState)=>{half(state).after.M={n:'999',d:'1'};}])expect(readCheckpoint(damaged(fixture,change)).ok).toBe(false);
    if(boss==='B05')expect(readCheckpoint(damaged(fixture,state=>{state.lastTrace!.bossContext.previousHandType=null;})).ok).toBe(false);
  });
  it('does not accept an arbitrary Boss operation merely because that definition is now implemented',()=>{
    const fixture=play(enter('B12'));roundTrip(fixture);
    expect(readCheckpoint(damaged(fixture,state=>{half(state).operation='add-heat';})).ok).toBe(false);
  });
  it('requires the determined half-base source rather than accepting its silent removal',()=>{
    const fixture=play(enter('B12'));
    expect(readCheckpoint(damaged(fixture,state=>{state.lastTrace!.events=state.lastTrace!.events.filter(event=>event.operation!=='halve-base-heat');})).ok).toBe(false);
  });
  it.each(['B06','B16'] as const)('keeps all %s sources while exempting only actually disabled coefficient/chance readers',boss=>{
    const fixture=play(enter(boss,['pengci','e11','f12','f08']));roundTrip(fixture);
    expect(fixture.state.lastTrace!.sourceJokers.map(joker=>joker.definitionId)).toEqual(['pengci','e11','f12','f08']);
    expect(readCheckpoint(forgedJoker(fixture,'e11')).ok).toBe(false);
    expect(readCheckpoint(damaged(fixture,state=>{state.lastTrace!.sourceJokers=state.lastTrace!.sourceJokers.filter(joker=>joker.definitionId!=='e11');state.lastTrace!.jokers=state.lastTrace!.jokers.filter(joker=>joker.definitionId!=='e11');})).ok).toBe(false);
    expect(readCheckpoint(damaged(fixture,state=>{state.lastTrace!.jokers.find(joker=>joker.definitionId==='e11')!.growth.coefficient={n:'2',d:'1'};})).ok).toBe(false);
    if(boss==='B06')expect(readCheckpoint(forgedJoker(fixture,'f08','chance-heat-check')).ok).toBe(false);
  });
  it('allows current Joker reordering without replacing the saved B06 source order or slot-disable context',()=>{
    let fixture=play(enter('B06',['pengci','e11','f12','f08']));const trace=JSON.stringify(fixture.state.lastTrace),rng=JSON.stringify(fixture.state.rng);
    fixture=send(fixture,{type:'ReorderJokers',ids:fixture.state.jokers.map(joker=>joker.instanceId).reverse()});
    expect(JSON.stringify(fixture.state.lastTrace)).toBe(trace);expect(JSON.stringify(fixture.state.rng)).toBe(rng);roundTrip(fixture);
  });
  it('keeps successful clear coefficient growth for B16-disabled instances without inventing their score reads',()=>{
    let fixture=play(play(play(enter('B16',['e11','f12']))));fixture.state.handLevels['flush-five']=30;
    const ids=fixture.state.handOrder.slice(0,5);ids.forEach(id=>Object.assign(fixture.state.deckInstances.find(card=>card.id===id)!,{rank:14,suit:'hearts'}));
    fixture=send(fixture,{type:'PlayHand',selectedIds:ids});expect(fixture.state.phase).toBe('stage-cleared');
    expect(fixture.state.lastTrace!.events.filter(event=>event.operation==='read-coefficient')).toEqual([]);
    expect(fixture.state.lastTrace!.events.filter(event=>event.operation==='add-coefficient').map(event=>event.sourceDefinitionId)).toEqual(['e11','f12']);roundTrip(fixture);
  });
  it('keeps B15 beginning seals distinct from the new seal, and rejects a different leftmost target',()=>{
    const fixture=play(play(enter('B15',['e11','f08','pengci'])));roundTrip(fixture);
    expect(fixture.state.lastTrace!.bossContext.sealedJokerIds).toEqual(['c03/source/e11']);
    expect(fixture.state.stage!.sealedJokerIds).toEqual(['c03/source/e11','c03/source/f08']);
    expect(readCheckpoint(damaged(fixture,state=>{state.lastTrace!.bossContext.sealedJokerIds=[...state.stage!.sealedJokerIds];})).ok).toBe(false);
    expect(readCheckpoint(damaged(fixture,state=>{seal(state).targetJokerInstanceId='c03/source/pengci';state.stage!.sealedJokerIds=['c03/source/e11','c03/source/pengci'];})).ok).toBe(false);
    expect(readCheckpoint(forgedJoker(fixture,'e11')).ok).toBe(false);
  });
  it('requires B15 sealing when an unsealed survivor remains',()=>{
    const fixture=play(enter('B15',['pengci']));
    expect(readCheckpoint(damaged(fixture,state=>{state.lastTrace!.events=state.lastTrace!.events.filter(event=>event.operation!=='seal-joker');state.stage!.sealedJokerIds=[];})).ok).toBe(false);
  });
  it('rejects a fabricated E11 lifetime destruction used to redirect the B15 leftmost seal',()=>{
    const fixture=play(enter('B15',['e11','pengci']));roundTrip(fixture);
    expect(readCheckpoint(damaged(fixture,state=>{
      const trace=state.lastTrace!,id='c03/source/e11',eventId=`${trace.rootId}/forged-expiry`,at=trace.events.findIndex(event=>event.operation==='seal-joker');
      trace.events.splice(at,0,{eventId,rootId:trace.rootId,rootEventId:eventId,phase:'afterHand',sourceType:'joker',sourceDefinitionId:'e11',sourceInstanceId:id,
        operation:'destroy-joker',value:{n:'0',d:'1'},before:trace.accumulator,after:trace.accumulator,reasonKey:'e11.expire',visibleCondition:{kind:'always'},retriggerDepth:0});
      trace.destroyedJokerIds=[id];trace.jokers=trace.jokers.filter(joker=>joker.instanceId!==id);state.jokers=state.jokers.filter(joker=>joker.instanceId!==id);
      seal(state).targetJokerInstanceId='c03/source/pengci';state.stage!.sealedJokerIds=['c03/source/pengci'];
    })).ok).toBe(false);
  });
  it('records no additional B15 seal when every living source was already sealed at hand start',()=>{
    const fixture=play(play(play(play(enter('B15',['e11','f08','pengci'])))));
    expect(fixture.state.phase).toBe('run-lost');expect(seal(fixture.state)).toBeUndefined();expect(fixture.state.stage!.sealedJokerIds).toHaveLength(3);roundTrip(fixture);
  });
  it('seals the surviving next slot after F06 expires, preserving the destroyed initial identity',()=>{
    let fixture=start();fixture.state.jokers=[r2CreateJoker('f06','c03/source/f06',8),r2CreateJoker('pengci','c03/source/pengci',8)];fixture.state.jokers[0].counters={handsScored:3};
    Object.assign(fixture.state,{stageIndex:20,chapter:7,phase:'stage-ready',shop:null,boss:{definitionId:'B15',disabledSuit:null},seenBossIds:['B01','B02','B03','B04','B05','B06','B15']});
    fixture=play(send(fixture,{type:'EnterStage'}));expect(fixture.state.lastTrace!.destroyedJokerIds).toContain('c03/source/f06');
    expect(seal(fixture.state).targetJokerInstanceId).toBe('c03/source/pengci');roundTrip(fixture);
    expect(readCheckpoint(damaged(fixture,state=>{seal(state).targetJokerInstanceId='c03/source/f06';state.stage!.sealedJokerIds=['c03/source/f06'];})).ok).toBe(false);
    expect(readCheckpoint(damaged(fixture,state=>{state.lastTrace!.events=state.lastTrace!.events.filter(event=>event.operation!=='increment-hands-scored');})).ok).toBe(false);
  });
  it('preserves a B15-sealed F07 rescue before selecting the remaining living seal target',()=>{
    const fixture=play(play(play(play(enter('B15',['f07','pengci'])))));
    expect(fixture.state.stage).toMatchObject({rescueUsed:true,handsLeft:1});expect(fixture.state.phase).toBe('await-input');
    expect(fixture.state.lastTrace!.destroyedJokerIds).toEqual(['c03/source/f07']);expect(seal(fixture.state)).toBeUndefined();roundTrip(fixture);
  });
  it('records a real Shop-created S06 instance at entry and subsequently allows B15 to seal it',()=>{
    let fixture=start();fixture.state.consumables=[{instanceId:'c03/tool/S06',definitionId:'S06'}];
    fixture=send(fixture,{type:'UseConsumable',instanceId:'c03/tool/S06',targetIds:[]});
    const created=fixture.state.jokers[0].instanceId;
    fixture=send(fixture,{type:'LeaveShop'});
    // Artificial future chapter position; S06 acquisition/use and entry remain real Shop commands.
    Object.assign(fixture.state,{stageIndex:20,chapter:7,shop:null,boss:{definitionId:'B15',disabledSuit:null},seenBossIds:['B01','B02','B03','B04','B05','B06','B15']});
    fixture=send(fixture,{type:'EnterStage'});
    expect(fixture.state.stage!.initialJokerIds).toEqual([created]);
    fixture=play(fixture);expect(seal(fixture.state).targetJokerInstanceId).toBe(created);roundTrip(fixture);
  });
  it('rejects in-stage S06 before spending its instance, gold or any of the four RNG cursors',()=>{
    const fixture=enter('B15');fixture.state.consumables=[{instanceId:'c03/tool/S06',definitionId:'S06'}];
    const before=JSON.stringify(fixture.state),result=applyCommand(fixture.state,{runId:fixture.state.runId,commandId:'c03/in-stage-S06',expectedSeq:fixture.state.commandSeq,action:{type:'UseConsumable',instanceId:'c03/tool/S06',targetIds:[]}});
    expect(result).toMatchObject({ok:false,code:'wrong-phase'});expect(JSON.stringify(fixture.state)).toBe(before);
  });
  it('rejects duplicate/foreign seals and initial identities exceeding the five real entry slots',()=>{
    const fixture=play(enter('B15',['pengci']));roundTrip(fixture);
    for(const change of [(state:R2RunState)=>{state.stage!.sealedJokerIds.push(state.stage!.sealedJokerIds[0]);},(state:R2RunState)=>{state.stage!.sealedJokerIds=['not-in-initial'];},(state:R2RunState)=>{state.stage!.initialJokerIds=[...state.stage!.initialJokerIds,...Array.from({length:5},(_,i)=>`created/${i}`)];}])expect(readCheckpoint(damaged(fixture,change)).ok).toBe(false);
  });
  it('uses the completed old stage Boss for its last trace after the next chapter selected another Boss',()=>{
    let fixture=start();for(const type of ['SkipStage','OpenShop','SkipStage','OpenShop','LeaveShop','EnterStage'] as const)fixture=send(fixture,{type});
    const ids=fixture.state.handOrder.slice(0,5);ids.forEach(id=>Object.assign(fixture.state.deckInstances.find(card=>card.id===id)!,{rank:14,suit:'hearts'}));fixture=send(fixture,{type:'PlayHand',selectedIds:ids});
    expect(fixture.state.phase).toBe('stage-cleared');fixture=send(fixture,{type:'OpenShop'});
    expect(fixture.state.chapter).toBe(2);expect(fixture.state.stage!.boss!.definitionId).not.toBe(fixture.state.boss.definitionId);
    expect(fixture.state.lastTrace!.bossContext.boss).toEqual(fixture.state.stage!.boss);roundTrip(fixture);
    expect(readCheckpoint(damaged(fixture,state=>{state.lastTrace!.bossContext.boss={...state.boss};})).ok).toBe(false);
    const offer=fixture.state.shop!.offers.find(offer=>!offer.consumed&&offer.price<=fixture.state.gold)!;expect(offer).toBeDefined();
    fixture=send(fixture,{type:'BuyOffer',offerId:offer.offerId});expect(fixture.state.jokers).toHaveLength(1);roundTrip(fixture);
  });
});
