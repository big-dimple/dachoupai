import {describe,expect,it} from 'vitest';
import {makeCheckpoint,readCheckpoint,restoreSlots,type Checkpoint} from '../src/application/checkpoint';
import {applyCommand,createRun,type Action,type Command,type R2RunState} from '../src/domain/run';
import {stableHash} from '../src/domain/hash';
import type {R2JokerInstance} from '../src/content/r2Schema';
import type {ScoreEvent} from '../src/domain/scoreR2';
import rawV6 from './fixtures/c02-v6-checkpoint.json';

interface Fixture {state:R2RunState;journal:Command[]}
const object=(value:unknown)=>value as Record<string,unknown>;
const coefficient=(n='1',d='1')=>({n,d});
function start():Fixture {
  const fixture={state:createRun({seed:'c02-checkpoint',runId:'c02-checkpoint',characterId:'erxiang',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}}),journal:[] as Command[]};
  Object.assign(fixture.state.shop!,{soldJoker:false});return fixture;
}
function send(fixture:Fixture,action:Action):Fixture {
  const command:Command={runId:fixture.state.runId,commandId:`c02-checkpoint/${fixture.state.commandSeq+1}`,expectedSeq:fixture.state.commandSeq,action};
  const result=applyCommand(fixture.state,command);if(!result.ok)throw Error(result.code);
  return {state:result.state,journal:[...fixture.journal,command]};
}
function enter():Fixture {
  const fixture=send(send(start(),{type:'LeaveShop'}),{type:'EnterStage'});
  Object.assign(fixture.state.stage!,{maxPlayedCount:0,ordinaryStraightSeen:false,ordinaryFlushSeen:false,quadRefundUsed:false,jokerSold:false});return fixture;
}
function seal(fixture:Fixture):Checkpoint {
  const payload={format:'dachoupai-checkpoint' as const,formatVersion:1 as const,state:structuredClone(fixture.state),journalBaseSeq:fixture.state.commandSeq-fixture.journal.length,journal:structuredClone(fixture.journal)};
  return {...payload,checksum:stableHash(payload)};
}
function damaged(fixture:Fixture,mutate:(state:R2RunState)=>void):Checkpoint {
  const raw=seal(fixture);mutate(raw.state);const {checksum,...payload}=raw;return {...payload,checksum:stableHash(payload)};
}
function holder(definitionId:string,growth:Record<string,{n:string;d:string}>={},counters?:{stageClears:number}):R2JokerInstance {
  return {instanceId:`c02/source/${definitionId}`,definitionId,paidPrice:8,growth,...(counters?{counters}: {})} as R2JokerInstance;
}
function held(definitionId:string):Fixture {
  const fixture=start();fixture.state.jokers=[holder(definitionId,definitionId==='e11'||definitionId==='f12'?{coefficient:coefficient()}: {},definitionId==='e10'?{stageClears:0}:undefined)];return fixture;
}
function scoredSource(definitionId:string,overflow=false):Fixture {
  let fixture=held(definitionId);
  if(definitionId==='e10')fixture.state.jokers[0].counters={stageClears:1};
  if(overflow)fixture.state.consumables=[{instanceId:'fixture/full/0',definitionId:'T01'},{instanceId:'fixture/full/1',definitionId:'T02'}];
  fixture=send(send(fixture,{type:'LeaveShop'}),{type:'EnterStage'});
  const ids=fixture.state.handOrder.slice(0,5);
  // Known cards isolate parser metadata; actual entry and score commands bind the source.
  for(const id of ids)Object.assign(fixture.state.deckInstances.find(card=>card.id===id)!,{rank:14,suit:'hearts'});
  if(definitionId==='f08')fixture.state.rng.rule={algorithm:'fnv1a-mulberry32-v1',state:2};
  fixture=send(fixture,{type:'PlayHand',selectedIds:ids});
  return fixture;
}
function append(fixture:Fixture,operation:string,value:{n:string;d:string},extra:Record<string,unknown>={}):ScoreEvent {
  fixture.state.lastTrace=structuredClone(fixture.state.lastTrace!);
  const trace=fixture.state.lastTrace!,source=trace.sourceJokers[0],eventId=`${trace.rootId}/event/${trace.events.length}`;
  const event={eventId,rootId:trace.rootId,rootEventId:eventId,phase:'onStageClear',sourceType:'joker',sourceDefinitionId:source.definitionId,sourceInstanceId:source.instanceId,operation,value,before:trace.accumulator,after:trace.accumulator,reasonKey:`${source.definitionId}.${operation}`,visibleCondition:{kind:'always'},retriggerDepth:0,...extra} as ScoreEvent;
  const at=event.phase==='jokerScore'?trace.events.findIndex(event=>event.phase==='finalScore'):-1;
  trace.events=at<0?[...trace.events,event]:[...trace.events.slice(0,at),event,...trace.events.slice(at)];return event;
}
function growthSource():Fixture {
  return scoredSource('e11');
}
function rewardSource(definitionId:'c12'|'e10',overflow=false):Fixture {
  if(definitionId==='c12'){
    let fixture=held('c12');
    fixture=send(send(send(send(fixture,{type:'SkipStage'}),{type:'OpenShop'}),{type:'SkipStage'}),{type:'OpenShop'});
    fixture=send(send(fixture,{type:'LeaveShop'}),{type:'EnterStage'});
    if(overflow)fixture.state.consumables=[{instanceId:'fixture/full/0',definitionId:'T01'},{instanceId:'fixture/full/1',definitionId:'T02'}];
    for(const handType of ['straight','flush']){
      const ids=fixture.state.handOrder.slice(0,5);
      ids.forEach((id,index)=>Object.assign(fixture.state.deckInstances.find(card=>card.id===id)!,{rank:handType==='flush'?[2,3,5,7,9][index]:index+2,suit:handType==='flush'?'hearts':['spades','hearts','clubs','diamonds','spades'][index]}));
      fixture=send(fixture,{type:'PlayHand',selectedIds:ids});
    }
    expect(fixture.state.stage).toMatchObject({ordinaryStraightSeen:true,ordinaryFlushSeen:true});
    return fixture;
  }
  return scoredSource(definitionId,overflow);
}

describe('C02 checkpoint boundary in the current explicit version without rewriting published v6',()=>{
  it('rejects a C12 prize contradicted by the saved stage history',()=>{
    const fixture=rewardSource('c12');expect(readCheckpoint(seal(fixture)).ok).toBe(true);
    for(const key of ['ordinaryStraightSeen','ordinaryFlushSeen'] as const)expect(readCheckpoint(damaged(fixture,state=>{state.stage![key]=false;})).ok).toBe(false);
  });
  it('rejects no-sale growth after a sale, but a subsequent shop sale does not rewrite the old stage',()=>{
    const fixture=growthSource();expect(readCheckpoint(seal(fixture)).ok).toBe(true);
    expect(readCheckpoint(damaged(fixture,state=>{state.stage!.jokerSold=true;})).ok).toBe(false);
    const shop=send(fixture,{type:'OpenShop'});shop.state.shop!.soldJoker=true;
    expect(readCheckpoint(seal(shop)).ok).toBe(true);
  });
  it('requires last-available-hand growth to have actually used the final opportunity',()=>{
    let fixture=send(send(held('f12'),{type:'LeaveShop'}),{type:'EnterStage'});
    for(let i=0;i<3;i++){
      const id=fixture.state.handOrder[0];Object.assign(fixture.state.deckInstances.find(card=>card.id===id)!,{rank:2});
      fixture=send(fixture,{type:'PlayHand',selectedIds:[id]});
    }
    const ids=fixture.state.handOrder.slice(0,5);ids.forEach((id,index)=>Object.assign(fixture.state.deckInstances.find(card=>card.id===id)!,{rank:index+2,suit:'hearts'}));
    fixture=send(fixture,{type:'PlayHand',selectedIds:ids});
    expect(fixture.state.stage!.handsLeft).toBe(0);expect(readCheckpoint(seal(fixture)).ok).toBe(true);
    expect(readCheckpoint(damaged(fixture,state=>{state.stage!.handsLeft++;state.stage!.initialHands++;})).ok).toBe(false);
  });
  it('binds a real B12 refund to its spent once-per-stage flag and exact remaining opportunities',()=>{
    let fixture=held('b12');Object.assign(fixture.state,{characterId:'touye',phase:'stage-ready',stageIndex:5,chapter:2,boss:{definitionId:'B02',disabledSuit:null},seenBossIds:['B01','B02'],supplyRewardClaimed:true,shop:null});
    fixture=send(fixture,{type:'EnterStage'});
    fixture.state.rng.rule={algorithm:'fnv1a-mulberry32-v1',state:1};
    const ids=fixture.state.handOrder.slice(0,4);ids.forEach((id,index)=>Object.assign(fixture.state.deckInstances.find(card=>card.id===id)!,{rank:2,suit:['spades','hearts','clubs','diamonds'][index]}));
    fixture=send(send(fixture,{type:'SetWager',enabled:true}),{type:'PlayHand',selectedIds:ids});
    expect(fixture.state.lastTrace!.events.some(event=>event.operation==='refund-hand')).toBe(true);expect(readCheckpoint(seal(fixture)).ok).toBe(true);
    expect(readCheckpoint(damaged(fixture,state=>{state.stage!.quadRefundUsed=false;state.stage!.handsLeft--;})).ok).toBe(false);
  });
  it('keeps the actual v6 production raw and diagnoses its version before changed fields',()=>{
    expect(rawV6.state.contentVersion).toBe('quality-r2-content-v6');expect(rawV6.state.contentHash).toBe('json-fnv-v1:5938ce1169db0745');expect(rawV6.state.commandSeq).toBe(3);
    const before=JSON.stringify(rawV6);expect(readCheckpoint(rawV6)).toEqual({ok:false,code:'incompatible-version'});
    const restored=restoreSlots({revision:9,current:rawV6,previous:null});expect(restored.status).toBe('invalid');expect(restored.raw).toBe(rawV6);expect(JSON.stringify(rawV6)).toBe(before);
  });
  it.each(['shop','stage'] as const)('round trips required %s fields in an explicit new run',phase=>{
    const fixture=phase==='shop'?start():enter();expect(fixture.state.contentVersion).toBe('quality-r2-content-v11');
    const parsed=readCheckpoint(makeCheckpoint(fixture.state,fixture.journal));expect(parsed.ok&&parsed.checkpoint.state).toEqual(fixture.state);
  });
  it('requires shop.soldJoker and refuses a nonboolean sale snapshot',()=>{
    const fixture=start();expect(readCheckpoint(seal(fixture)).ok).toBe(true);
    for(const value of [undefined,1])expect(readCheckpoint(damaged(fixture,state=>{if(value===undefined)delete object(state.shop).soldJoker;else object(state.shop).soldJoker=value;})).ok).toBe(false);
  });
  it.each(['maxPlayedCount','ordinaryStraightSeen','ordinaryFlushSeen','quadRefundUsed','jokerSold'])('requires stage.%s',field=>{
    const fixture=enter();expect(readCheckpoint(seal(fixture)).ok).toBe(true);
    expect(readCheckpoint(damaged(fixture,state=>{delete object(state.stage)[field];})).ok).toBe(false);
  });
  it.each([
    ['max below floor',{maxPlayedCount:-1}],['max above selected cap',{maxPlayedCount:6}],['fractional max',{maxPlayedCount:1.5}],['max before any hand',{maxPlayedCount:1}],
    ['nonboolean straight',{ordinaryStraightSeen:1}],['nonboolean refund',{quadRefundUsed:1}],['refund without a budget',{quadRefundUsed:true}],
  ])('rejects the independent stage %s',(_name,patch)=>{
    const fixture=enter();expect(readCheckpoint(seal(fixture)).ok).toBe(true);expect(readCheckpoint(damaged(fixture,state=>Object.assign(state.stage!,patch))).ok).toBe(false);
  });
  it.each(['e11','f12'])('requires an explicit initial coefficient for %s and rejects zero/fraction/cap violations',definitionId=>{
    const fixture=held(definitionId);expect(readCheckpoint(seal(fixture)).ok).toBe(true);
    for(const value of [undefined,coefficient('0'),coefficient('9','10'),coefficient('3'),{n:'NaN',d:'1'}])expect(readCheckpoint(damaged(fixture,state=>{if(value===undefined)delete state.jokers[0].growth.coefficient;else state.jokers[0].growth.coefficient=value;})).ok).toBe(false);
  });
  it('requires E10 persistent stageClears to be exactly zero or one and only on its own instance',()=>{
    const fixture=held('e10');expect(readCheckpoint(seal(fixture)).ok).toBe(true);
    for(const value of [undefined,-1,0.5,2])expect(readCheckpoint(damaged(fixture,state=>{if(value===undefined)delete object(state.jokers[0].counters).stageClears;else object(state.jokers[0].counters).stageClears=value;})).ok).toBe(false);
    const other=held('pengci');expect(readCheckpoint(damaged(other,state=>{object(state.jokers[0]).counters={stageClears:1};})).ok).toBe(false);
  });
  it('keeps a coefficient read bound to the hand-start source while storing the grown result',()=>{
    const fixture=growthSource();expect(readCheckpoint(seal(fixture)).ok).toBe(true);
    expect(readCheckpoint(damaged(fixture,state=>{state.lastTrace!.sourceJokers[0].growth.coefficient=coefficient('11','10');})).ok).toBe(false);
  });
  it.each(['missing-before','wrong-delta','float-resource','unknown-field'])('rejects coefficient event %s',kind=>{
    const fixture=growthSource();expect(readCheckpoint(seal(fixture)).ok).toBe(true);
    expect(readCheckpoint(damaged(fixture,state=>{const event=object(state.lastTrace!.events.find(event=>event.operation==='add-coefficient'));
      if(kind==='missing-before')delete event.growthBefore;if(kind==='wrong-delta')event.growthAfter=coefficient('6','5');if(kind==='float-resource'){event.resourceBefore=1;event.resourceAfter=1.1;}if(kind==='unknown-field')event.coef='auto';
    })).ok).toBe(false);
  });
  it.each([['c12',false],['c12',true],['e10',false],['e10',true]] as const)('requires finite %s reward identity for overflow=%s', (definitionId,overflow)=>{
    const fixture=rewardSource(definitionId,overflow);expect(readCheckpoint(seal(fixture)).ok).toBe(true);
    for(const id of [undefined,'T19','S01','T99'])expect(readCheckpoint(damaged(fixture,state=>{const event=object(state.lastTrace!.events.at(-1));if(id===undefined)delete event.rewardDefinitionId;else event.rewardDefinitionId=id;})).ok).toBe(false);
  });
  it('rejects E10 awarding a random dye instead of its fixed T01',()=>{
    const fixture=rewardSource('e10');expect(readCheckpoint(seal(fixture)).ok).toBe(true);expect(readCheckpoint(damaged(fixture,state=>{object(state.lastTrace!.events.at(-1)).rewardDefinitionId='T03';})).ok).toBe(false);
  });
  it('rejects reward identity smuggled onto an ordinary score event',()=>{
    const fixture=growthSource();expect(readCheckpoint(seal(fixture)).ok).toBe(true);expect(readCheckpoint(damaged(fixture,state=>{object(state.lastTrace!.events[0]).rewardDefinitionId='T01';})).ok).toBe(false);
  });
  it('checks F08 once per source and keeps a missed check separate from heat gain',()=>{
    const fixture=scoredSource('f08');expect(fixture.state.lastTrace!.events.find(event=>event.operation==='chance-heat-check')?.value).toEqual(coefficient('0'));expect(readCheckpoint(seal(fixture)).ok).toBe(true);
    expect(readCheckpoint(damaged(fixture,state=>{object(state.lastTrace!.events.find(event=>event.operation==='chance-heat-check')).value=coefficient('2');})).ok).toBe(false);
    expect(readCheckpoint(damaged(fixture,state=>{const trace=state.lastTrace!,event=structuredClone(trace.events.find(event=>event.operation==='chance-heat-check')!);event.eventId+='duplicate';event.rootEventId=event.eventId;trace.events.push(event);})).ok).toBe(false);
    const gained=scoredSource('f08');append(gained,'add-heat',coefficient('90'),{phase:'jokerScore'});expect(readCheckpoint(seal(gained)).ok).toBe(false);
  });
});
