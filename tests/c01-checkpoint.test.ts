import {describe,expect,it} from 'vitest';
import {makeCheckpoint,readCheckpoint,restoreSlots,type Checkpoint} from '../src/application/checkpoint';
import {applyCommand,createRun,type Action,type Command,type R2RunState} from '../src/domain/run';
import {stableHash} from '../src/domain/hash';
import {R2_IMPLEMENTED_TOOL_FEATURES,r2CardSpecialsSupported,r2EditionSupported,r2ItemSupported,r2ToolSupported} from '../src/domain/r2ToolRuntime';
import type {Edition,Enhancement} from '../src/cards/types';
import type {ScoreEvent,ScoreTrace} from '../src/domain/scoreR2';
import rawV5 from './fixtures/c01-v5-checkpoint.json';

interface Fixture {state:R2RunState;journal:Command[]}
const start=(seed='c01-checkpoint'):Fixture=>({state:createRun({seed,runId:seed,characterId:'amo',rulesVersion:'r2'}),journal:[]});
function send(fixture:Fixture,action:Action):Fixture {
  const state=fixture.state,command:Command={runId:state.runId,commandId:`checkpoint/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action};
  const result=applyCommand(state,command);if(!result.ok)throw Error(result.code);
  return {state:result.state,journal:[...fixture.journal,command]};
}
const enter=(fixture=start())=>send(send(fixture,{type:'LeaveShop'}),{type:'EnterStage'});
// Directly wrap production state for parser tests; the constructor itself is under test.
function seal(fixture:Fixture):Checkpoint {
  const payload={format:'dachoupai-checkpoint' as const,formatVersion:1 as const,state:structuredClone(fixture.state),journalBaseSeq:fixture.state.commandSeq-fixture.journal.length,journal:structuredClone(fixture.journal)};
  return {...payload,checksum:stableHash(payload)};
}
function resign(value:Checkpoint):Checkpoint {const {checksum,...payload}=value;return {...payload,checksum:stableHash(payload)};}
function damage(fixture:Fixture,mutate:(state:R2RunState)=>void):Checkpoint {const raw=seal(fixture);mutate(raw.state);return resign(raw);}
const object=(value:unknown)=>value as Record<string,unknown>;
function bossRefund():Fixture {
  let fixture:Fixture|undefined;
  for(let index=0;index<500;index++){
    const candidate=start(`c01-checkpoint-b01/${index}`);
    if(candidate.state.boss.definitionId==='B01'&&candidate.state.chapterSkipConsumable==='T17'){fixture=candidate;break;}
  }
  if(!fixture)throw Error('missing-deterministic-b01-refund-fixture');
  fixture=send(fixture,{type:'SkipStage'});fixture=send(fixture,{type:'OpenShop'});fixture=send(fixture,{type:'SkipStage'});
  fixture=enter(send(fixture,{type:'OpenShop'}));
  fixture=send(fixture,{type:'DiscardHand',selectedIds:[fixture.state.handOrder[0]]});
  fixture=send(fixture,{type:'UseConsumable',instanceId:fixture.state.consumables.find(c=>c.definitionId==='T17')!.instanceId,targetIds:[]});
  return send(fixture,{type:'DiscardHand',selectedIds:[fixture.state.handOrder[0]]});
}
function scored(kind:'ordinary'|'lucky'|'glass'|'edition'|'expired'='ordinary'):Fixture {
  const prepared=start();
  prepared.state.jokers=kind==='expired'
    ?[{instanceId:'checkpoint/expired',definitionId:'f06',paidPrice:8,growth:{},counters:{handsScored:3}}]
    :[{instanceId:'checkpoint/pengci',definitionId:'pengci',paidPrice:4,growth:{}}];
  const fixture=enter(prepared),card=fixture.state.deckInstances.find(card=>card.id===fixture.state.handOrder[0])!;card.rank=2;
  if(kind==='lucky'){card.enhancement='lucky-paper';fixture.state.rng.rule={algorithm:'fnv1a-mulberry32-v1',state:2068216773};}
  if(kind==='glass'){card.enhancement='glass-paper';fixture.state.rng.rule={algorithm:'fnv1a-mulberry32-v1',state:1413661181};}
  if(kind==='edition'){card.edition='foil';fixture.state.jokers[0].edition='polychrome';}
  return send(fixture,{type:'PlayHand',selectedIds:[card.id]});
}

interface ParserOffer {offerId:string;definitionId:string;price:number;consumed:boolean;edition?:Edition}
type ParserShop=NonNullable<R2RunState['shop']>&{toolOffers:ParserOffer[];itemOffers:ParserOffer[]};
const parserShop=(state:R2RunState)=>state.shop as ParserShop;
function threeShelfParserFixture():Fixture {
  const fixture=start('c01-three-shelf-parser');
  // Explicit legal shelf data isolates parser rules; this is not a natural-acquisition test.
  Object.assign(fixture.state.shop!,{
    offers:[
      {offerId:'parser/joker/1',definitionId:'pengci',price:4,consumed:false},
      {offerId:'parser/joker/2',definitionId:'mantangcai',price:4,consumed:false},
      {offerId:'parser/joker/3',definitionId:'jiedongfeng',price:6,consumed:false},
    ],
    toolOffers:[{offerId:'parser/tool/1',definitionId:'T03',price:4,consumed:false}],
    itemOffers:[{offerId:'parser/item/1',definitionId:'U08',price:12,consumed:false}],
  });
  return fixture;
}
type ClearSourceKind='U04'|'U09'|'U12'|'T16-grant'|'T16-overflow'|'e04';
function clearSourceParserFixture(kind:ClearSourceKind):Fixture {
  const boss=kind==='U09'||kind.startsWith('T16');let fixture=start(`c01-clear-source-parser/${kind}`);
  if(boss){
    for(let seed=0;fixture.state.boss.definitionId!=='B01'&&seed<64;seed++)fixture=start(`c01-clear-source-parser/${kind}/${seed}`);
    if(fixture.state.boss.definitionId!=='B01')throw Error('missing-b01-clear-parser-fixture');
    for(const action of [{type:'SkipStage'},{type:'OpenShop'},{type:'SkipStage'},{type:'OpenShop'}] as const)fixture=send(fixture,action);
  }
  fixture.state.jokers=kind==='e04'?[{instanceId:'parser/interest',definitionId:'e04',paidPrice:6,growth:{}}]:[];
  fixture=enter(fixture);
  for(const item of [...fixture.state.consumables])fixture=send(fixture,{type:'DestroyConsumable',instanceId:item.instanceId});
  // Explicit known hand, funding and owned items isolate actual clear trace serialization.
  // They are parser fixtures, not evidence that these cards or items were naturally acquired.
  fixture.state.gold=100;
  fixture.state.longTermItems=kind.startsWith('U')?[kind]:[];
  if(kind==='T16-overflow')fixture.state.consumables=[{instanceId:'parser/held/1',definitionId:'T03'},{instanceId:'parser/held/2',definitionId:'T04'}];
  const selectedIds=fixture.state.handOrder.slice(0,5);
  for(const id of selectedIds)Object.assign(fixture.state.deckInstances.find(card=>card.id===id)!,{rank:14,suit:'hearts'});
  const rng=structuredClone(fixture.state.rng),result=send(fixture,{type:'PlayHand',selectedIds});
  expect(result.state.phase).toBe('stage-cleared');expect(result.state.rng).toEqual(rng);return result;
}
function clearSourceEvent(state:R2RunState,kind:ClearSourceKind):ScoreEvent {
  const definitionId=kind.startsWith('T16')?'T16':kind,event=state.lastTrace!.events.find(event=>event.phase==='onStageClear'&&event.sourceDefinitionId===definitionId);
  if(!event)throw Error(`missing-clear-source-${kind}`);return event;
}

describe('C01 strict current checkpoint and retained historical raw',()=>{
  it.each(['new','entered','skipped'] as const)('round trips the actual %s v6 state and its command receipts',kind=>{
    const fixture=kind==='entered'?enter():kind==='skipped'?send(start(),{type:'SkipStage'}):start();
    const checkpoint=makeCheckpoint(fixture.state,fixture.journal),read=readCheckpoint(JSON.parse(JSON.stringify(checkpoint)));
    expect(read.ok&&read.checkpoint.state).toEqual(fixture.state);
    expect(read.ok&&read.checkpoint.journal).toEqual(fixture.journal);
  });
  it('restores two actual B01 double-cost discards with a T17 refund before the first play',()=>{
    const fixture=bossRefund();
    expect(fixture.state.stage).toMatchObject({doubleDiscardBeforeFirstPlay:true,playIndex:0,initialDiscards:3,discardsLeft:0,discardsUsed:2,discardSpent:4,discardGained:1});
    const read=readCheckpoint(makeCheckpoint(fixture.state,fixture.journal));expect(read.ok&&read.checkpoint.state).toEqual(fixture.state);
  });
  it('accepts explicit ordinary editions as the same supported default on cards and Jokers',()=>{
    const fixture=start();fixture.state.deckInstances[0].edition='none';
    fixture.state.jokers=[{instanceId:'ordinary/pengci',definitionId:'pengci',paidPrice:4,growth:{},edition:'none'}];
    expect(readCheckpoint(makeCheckpoint(fixture.state,[])).ok).toBe(true);
  });
  it('keeps the genuine pre-upgrade v5 raw unchanged and diagnoses its exact version boundary',()=>{
    expect(rawV5.state.contentVersion).toBe('quality-r2-content-v5');expect(rawV5.state.contentHash).toBe('json-fnv-v1:b413ab428651dade');
    expect(rawV5.state.commandSeq).toBe(4);expect(rawV5.state.phase).toBe('await-input');expect(rawV5.state.stage.wagerSelected).toBe(true);
    expect(rawV5.state.receipts.map(receipt=>receipt.commandId)).toEqual(['c01-v5-raw/start','raw/2','raw/3','raw/4']);
    const before=JSON.stringify(rawV5);expect(readCheckpoint(rawV5)).toEqual({ok:false,code:'incompatible-version'});
    const restored=restoreSlots({revision:7,current:rawV5,previous:null});
    expect(restored.status).toBe('invalid');expect(restored.raw).toBe(rawV5);expect(JSON.stringify(rawV5)).toBe(before);
  });
  it('can restore a current-version backup while preserving the genuine v5 current raw for export',()=>{
    const restored=restoreSlots({revision:8,current:rawV5,previous:seal(start())});
    expect(restored.status).toBe('backup');expect(restored.code).toBe('incompatible-version');expect(restored.raw).toBe(rawV5);
    expect(restored.checkpoint?.state.contentVersion).toBe('quality-r2-content-v9');
  });
  it.each(['spectralModifiers','supplyRewardClaimed','chapterHandUsage','normalClearClaimed'])('requires new state field %s',field=>{
    expect(readCheckpoint(damage(start(),state=>{delete object(state)[field];})).ok).toBe(false);
  });
  it.each([
    ['negative hands penalty',{handsPenalty:-1,handPenalty:0,cleanSlateBonus:0}],
    ['hands penalty overflow',{handsPenalty:3,handPenalty:0,cleanSlateBonus:0}],
    ['hand penalty overflow',{handsPenalty:0,handPenalty:3,cleanSlateBonus:0}],
    ['bonus overflow',{handsPenalty:0,handPenalty:0,cleanSlateBonus:2}],
    ['fractional penalty',{handsPenalty:0.5,handPenalty:0,cleanSlateBonus:0}],
    ['missing modifier',{handsPenalty:0,handPenalty:0}],
    ['unknown modifier',{handsPenalty:0,handPenalty:0,cleanSlateBonus:0,extra:1}],
  ])('rejects %s after checksum re-signing',(_label,modifiers)=>{
    expect(readCheckpoint(damage(start(),state=>{object(state).spectralModifiers=modifiers;})).ok).toBe(false);
  });
  it.each(['supplyRewardClaimed','normalClearClaimed'])('requires boolean qualification %s',field=>{
    expect(readCheckpoint(damage(start(),state=>{object(state)[field]=1;})).ok).toBe(false);
  });
  it.each([
    ['unknown hand',{'invented-hand':1}],['undiscovered hand',{pair:1}],['negative count',{'high-card':-1}],
    ['fractional count',{'high-card':0.5}],['more plays than commands',{'high-card':2}],
  ])('rejects chapter usage with %s',(_label,usage)=>{
    expect(readCheckpoint(damage(start(),state=>{object(state).chapterHandUsage=usage;})).ok).toBe(false);
  });
  it.each(['initialHands','initialDiscards','discardSpent','discardGained','doubleDiscardBeforeFirstPlay'])('requires stage field %s',field=>{
    expect(readCheckpoint(damage(enter(),state=>{delete object(state.stage)[field];})).ok).toBe(false);
  });
  it.each([
    ['too few initial hands',{initialHands:1}],['too many initial hands',{initialHands:6}],
    ['too few initial discards',{initialDiscards:2}],['too many initial discards',{initialDiscards:5}],
    ['hand below floor',{handLimit:4}],['hand above ceiling',{handLimit:15}],
    ['negative spent',{discardSpent:-1}],['excess refund',{discardGained:6}],['fractional spent',{discardSpent:0.5}],
    ['unbacked refund',{discardGained:1}],['invented action count',{discardsUsed:4}],
    ['false boss double cost',{doubleDiscardBeforeFirstPlay:true}],['nonboolean cost flag',{doubleDiscardBeforeFirstPlay:1}],
  ])('rejects stage %s',(_label,patch)=>{
    expect(readCheckpoint(damage(enter(),state=>Object.assign(state.stage!,patch))).ok).toBe(false);
  });
  it('rejects the old single-extra-discard assumption for a real repeated B01 double cost',()=>{
    const fixture=bossRefund();expect(readCheckpoint(damage(fixture,state=>{state.stage!.discardSpent=3;state.stage!.discardsLeft=1;})).ok).toBe(false);
  });
  it.each(['heat-paper','lucky-paper'] as const)('restores %s only when its actual runtime capability is enabled',enhancement=>{
    const fixture=start(),card={...fixture.state.deckInstances[0],enhancement:enhancement as Enhancement};fixture.state.deckInstances[0]=card;
    expect(readCheckpoint(seal(fixture)).ok).toBe(r2CardSpecialsSupported(card));
  });
  it.each(['foil','holographic','polychrome'] as const)('restores card and Joker %s only with executable edition support',edition=>{
    const fixture=start();fixture.state.deckInstances[0].edition=edition;
    expect(readCheckpoint(seal(fixture)).ok).toBe(r2EditionSupported(edition));
    const jokerFixture=start();jokerFixture.state.jokers=[{instanceId:'edition/pengci',definitionId:'pengci',paidPrice:4,growth:{},edition:edition as Edition}];
    expect(readCheckpoint(seal(jokerFixture)).ok).toBe(r2EditionSupported(edition));
  });
  it.each(['glitter-hack','None',0])('rejects unknown card or Joker edition %s',edition=>{
    const fixture=start();object(fixture.state.deckInstances[0]).edition=edition;expect(readCheckpoint(seal(fixture)).ok).toBe(false);
    const jokerFixture=start();jokerFixture.state.jokers=[{instanceId:'bad/pengci',definitionId:'pengci',paidPrice:4,growth:{}}];object(jokerFixture.state.jokers[0]).edition=edition;
    expect(readCheckpoint(seal(jokerFixture)).ok).toBe(false);
  });
  it.each(['T01','T02','T16','T19','P01','S01','T99'])('restores %s inventory only when the actual tool is enabled',definitionId=>{
    const fixture=start();fixture.state.consumables=[{instanceId:'capability/tool',definitionId}];expect(readCheckpoint(seal(fixture)).ok).toBe(r2ToolSupported(definitionId));
  });
  it.each(['U01','U07','U12','U99'])('restores %s only when the actual long-term item is enabled',id=>{
    const fixture=start();fixture.state.longTermItems=[id];expect(readCheckpoint(seal(fixture)).ok).toBe(r2ItemSupported(id));
  });
  it('refuses a claimed first-Boss supply before that acquisition capability is enabled',()=>{
    expect(readCheckpoint(damage(start(),state=>{state.supplyRewardClaimed=true;})).ok).toBe(R2_IMPLEMENTED_TOOL_FEATURES.includes('first-boss-supply'));
  });
  it('keeps current traces restorable with complete hand-start source snapshots',()=>{
    const before=enter(),fixture=send(before,{type:'PlayHand',selectedIds:[before.state.handOrder[0]]});
    expect(readCheckpoint(makeCheckpoint(fixture.state,fixture.journal)).ok).toBe(true);
    const raw=seal(fixture),trace=object(raw.state.lastTrace);
    Object.assign(trace,{goldDelta:0,destroyedCardIds:[],cards:before.state.handOrder.map(id=>structuredClone(before.state.deckInstances.find(card=>card.id===id)!)),sourceJokers:structuredClone(before.state.jokers)});
    expect(readCheckpoint(resign(raw)).ok).toBe(true);
  });
  it.each([
    ['negative hand gold',{goldDelta:-1}],['hand gold cap overflow',{goldDelta:21}],['fractional hand gold',{goldDelta:0.5}],
    ['false destruction',{destroyedCardIds:['not-a-scoring-card']}],['source card unknown rank',{cards:[{id:'false-source',rank:99,suit:'hearts'}]}],
    ['source Joker unknown edition',{sourceJokers:[{instanceId:'false/pengci',definitionId:'pengci',paidPrice:4,growth:{},edition:'glitter-hack'}]}],
  ])('rejects optional score %s',(_label,patch)=>{
    const before=enter(),fixture=send(before,{type:'PlayHand',selectedIds:[before.state.handOrder[0]]});
    expect(readCheckpoint(damage(fixture,state=>Object.assign(object(state.lastTrace),patch))).ok).toBe(false);
  });
  it.each([
    ['duplicate source Jokers',[{instanceId:'source/same',definitionId:'pengci',paidPrice:4,growth:{}},{instanceId:'source/same',definitionId:'pengci',paidPrice:4,growth:{}}]],
    ['source growth above its cap',[{instanceId:'source/a05',definitionId:'a05',paidPrice:6,growth:{heat:{n:'91',d:'1'}}}]],
  ])('rejects %s',(_label,sourceJokers)=>{
    const before=enter(),fixture=send(before,{type:'PlayHand',selectedIds:[before.state.handOrder[0]]});
    expect(readCheckpoint(damage(fixture,state=>{object(state.lastTrace).sourceJokers=sourceJokers;})).ok).toBe(false);
  });
  it('rejects six played trace cards even when they form a complete source snapshot partition',()=>{
    const before=enter(),fixture=send(before,{type:'PlayHand',selectedIds:[before.state.handOrder[0]]}),raw=seal(fixture);
    const source=before.state.handOrder.map(id=>structuredClone(before.state.deckInstances.find(card=>card.id===id)!));
    object(raw.state.lastTrace).cards=source;raw.state.lastTrace!.sets.playedIds=before.state.handOrder.slice(0,6);raw.state.lastTrace!.sets.heldIds=before.state.handOrder.slice(6);
    expect(readCheckpoint(resign(raw)).ok).toBe(false);
  });
  it.each([
    ['secondaryHandType','invented-hand'],['suit','moon'],['sacrificeId',''],['targetKind','deck'],
  ])('rejects malformed consumable command %s after receipt and checksum re-signing',(field,value)=>{
    const raw=seal(bossRefund()),command=raw.journal.find(command=>command.action.type==='UseConsumable')!;
    object(command.action)[field]=value;raw.state.receipts.find(receipt=>receipt.commandId===command.commandId)!.fingerprint=stableHash(command);
    expect(readCheckpoint(resign(raw)).ok).toBe(false);
  });
  it.each(['goldDelta','destroyedCardIds','cards','sourceJokers'])('requires trace result/source field %s',field=>{
    expect(readCheckpoint(damage(scored(),state=>{delete object(state.lastTrace)[field];})).ok).toBe(false);
  });
  it.each(['lucky','glass','edition'] as const)('restores an actual committed %s hand with its legal finite operations and start sources',kind=>{
    const fixture=scored(kind),trace=fixture.state.lastTrace!;
    if(kind==='lucky')expect(trace.events.some(event=>event.operation==='lucky-gold-check')).toBe(true);
    if(kind==='glass')expect(trace.destroyedCardIds).toHaveLength(1);
    if(kind==='edition')expect(trace.events.some(event=>event.reasonKey.startsWith('edition.'))).toBe(true);
    const read=readCheckpoint(makeCheckpoint(fixture.state,fixture.journal));expect(read.ok&&read.checkpoint.state).toEqual(fixture.state);
  });
  it.each(['card-instance','card-target','joker-instance','joker-definition'] as const)('rejects %s metadata that contradicts its hand-start source snapshot',kind=>{
    expect(readCheckpoint(damage(scored(),state=>{
      const trace=state.lastTrace!,event=trace.events.find(event=>event.sourceType===(kind.startsWith('card')?'card':'joker'))!;
      if(kind==='card-instance'||kind==='joker-instance')event.sourceInstanceId='not-a-start-source';
      if(kind==='card-target')event.targetCardId='not-a-start-source';
      if(kind==='joker-definition')event.sourceDefinitionId='mantangcai';
    })).ok).toBe(false);
  });
  it('rejects hand gold that has no lucky resource event rather than treating stage rewards as lucky income',()=>{
    expect(readCheckpoint(damage(scored(),state=>{state.lastTrace!.goldDelta=10;})).ok).toBe(false);
  });
  it('rejects an omitted destroyed Joker result even when all source instances and events are legal',()=>{
    const fixture=scored('expired');expect(fixture.state.lastTrace!.destroyedJokerIds).toEqual(['checkpoint/expired']);
    expect(readCheckpoint(damage(fixture,state=>{state.lastTrace!.destroyedJokerIds=[];})).ok).toBe(false);
  });
  it('rejects a destroyed card result whose legal destroy event was omitted',()=>{
    expect(readCheckpoint(damage(scored('glass'),state=>{
      state.lastTrace!.events=state.lastTrace!.events.filter(event=>event.operation!=='destroy-card');
    })).ok).toBe(false);
  });
  it('rejects an omitted destroyed glass result and a destroy source with another enhancement',()=>{
    const fixture=scored('glass');
    expect(readCheckpoint(damage(fixture,state=>{state.lastTrace!.destroyedCardIds=[];})).ok).toBe(false);
    expect(readCheckpoint(damage(fixture,state=>{state.lastTrace!.cards.find(card=>state.lastTrace!.destroyedCardIds.includes(card.id))!.enhancement='heat-paper';})).ok).toBe(false);
  });
  it.each([
    ['lucky-multiplier-check',{n:'2',d:'1'}],['lucky-gold-check',{n:'1',d:'2'}],
    ['glass-check',{n:'2',d:'1'}],['lucky-gold-cap',{n:'21',d:'1'}],
  ] as const)('rejects out-of-range finite %s metadata',(operation,value)=>{
    const fixture=scored(operation==='glass-check'?'glass':'lucky');
    expect(readCheckpoint(damage(fixture,state=>{
      const event=state.lastTrace!.events.find(event=>event.operation===(operation==='lucky-gold-cap'?'lucky-gold-check':operation))!;
      event.operation=operation;event.value=value;
    })).ok).toBe(false);
  });
  it('rejects unlisted score operations after a correct checksum re-signing',()=>{
    expect(readCheckpoint(damage(scored(),state=>{state.lastTrace!.events[0].operation='execute-arbitrary-script';})).ok).toBe(false);
  });
  it('retains the original rescued Joker as a start source while removing it from result Jokers',()=>{
    const prepared=start();prepared.state.jokers=[{instanceId:'checkpoint/rescue',definitionId:'f07',paidPrice:8,growth:{}}];
    let fixture=enter(prepared);
    // Known two-card high hands stay below the target and establish the real last-hand ledger/context.
    for(let index=0;index<3;index++){
      const selectedIds=fixture.state.handOrder.slice(0,2);
      selectedIds.forEach((id,position)=>{fixture.state.deckInstances.find(card=>card.id===id)!.rank=position===0?2:3;});
      fixture=send(fixture,{type:'PlayHand',selectedIds});
    }
    const card=fixture.state.deckInstances.find(card=>card.id===fixture.state.handOrder[0])!;card.rank=2;
    const rescued=send(fixture,{type:'PlayHand',selectedIds:[card.id]}),trace=rescued.state.lastTrace as ScoreTrace;
    expect(rescued.state.safetyNetUsed).toBe(true);expect(trace.sourceJokers.map(joker=>joker.instanceId)).toEqual(['checkpoint/rescue']);
    expect(trace.destroyedJokerIds).toEqual(['checkpoint/rescue']);expect(trace.jokers).toEqual([]);
    expect(readCheckpoint(makeCheckpoint(rescued.state,rescued.journal)).ok).toBe(true);
  });
});

describe('C01 strict three-shelf parser fixtures',()=>{
  it('preserves three distinct offer arrays and consumed entries without drawing or refilling',()=>{
    const fixture=threeShelfParserFixture();parserShop(fixture.state).toolOffers[0].consumed=true;
    const before=structuredClone(fixture.state),read=readCheckpoint(seal(fixture));
    expect(read.ok&&read.checkpoint.state).toEqual(before);expect(fixture.state).toEqual(before);
  });
  it.each(['toolOffers','itemOffers'])('requires shop array %s',field=>{
    const fixture=threeShelfParserFixture();expect(readCheckpoint(seal(fixture)).ok).toBe(true);
    expect(readCheckpoint(damage(fixture,state=>{delete object(state.shop)[field];})).ok).toBe(false);
  });
  it.each([['none',4],['foil',6],['holographic',7],['polychrome',9]] as const)('restores a %s Joker shelf at its handwritten price %s',(edition,price)=>{
    const fixture=threeShelfParserFixture();Object.assign(parserShop(fixture.state).offers[0],{edition,price});
    const read=readCheckpoint(seal(fixture));expect(read.ok&&read.checkpoint.state).toEqual(fixture.state);
  });
  it('accepts the finite maximum of four Joker and two item offers as explicit parser data',()=>{
    const fixture=threeShelfParserFixture(),shop=parserShop(fixture.state);
    shop.offers.push({offerId:'parser/joker/4',definitionId:'huimaqiang',price:8,consumed:false});
    shop.itemOffers.push({offerId:'parser/item/2',definitionId:'U01',price:10,consumed:false});
    expect(readCheckpoint(seal(fixture)).ok).toBe(true);
  });
  const corruptions:readonly [string,(shop:ParserShop)=>void][]=[
    ['five Joker offers',shop=>{shop.offers.push({offerId:'parser/joker/4',definitionId:'huimaqiang',price:8,consumed:false},{offerId:'parser/joker/5',definitionId:'a01',price:4,consumed:false});}],
    ['two tool offers',shop=>{shop.toolOffers.push({offerId:'parser/tool/2',definitionId:'T04',price:4,consumed:false});}],
    ['three item offers',shop=>{shop.itemOffers.push({offerId:'parser/item/2',definitionId:'U01',price:10,consumed:false},{offerId:'parser/item/3',definitionId:'U02',price:12,consumed:false});}],
    ['Joker/tool ID collision',shop=>{shop.toolOffers[0].offerId=shop.offers[0].offerId;}],
    ['Joker/item ID collision',shop=>{shop.itemOffers[0].offerId=shop.offers[0].offerId;}],
    ['tool/item ID collision',shop=>{shop.itemOffers[0].offerId=shop.toolOffers[0].offerId;}],
    ['duplicate Joker offer ID',shop=>{shop.offers[1].offerId=shop.offers[0].offerId;}],
    ['Joker definition on tool shelf',shop=>{shop.toolOffers[0].definitionId='pengci';}],
    ['tool definition on item shelf',shop=>{shop.itemOffers[0].definitionId='T03';}],
    ['item definition on Joker shelf',shop=>{shop.offers[0].definitionId='U08';}],
    ['unknown tool definition',shop=>{shop.toolOffers[0].definitionId='T99';}],
    ['unknown item definition',shop=>{shop.itemOffers[0].definitionId='U99';}],
    ['unknown Joker definition',shop=>{shop.offers[0].definitionId='unknown-joker';}],
    ['wrong tool price',shop=>{shop.toolOffers[0].price=3;}],
    ['wrong item price',shop=>{shop.itemOffers[0].price=11;}],
    ['missing foil surcharge',shop=>{Object.assign(shop.offers[0],{edition:'foil',price:4});}],
    ['unknown Joker edition',shop=>{object(shop.offers[0]).edition='glitter-hack';}],
    ['ordinary edition on tool shelf',shop=>{shop.toolOffers[0].edition='none';}],
    ['special edition on tool shelf',shop=>{shop.toolOffers[0].edition='foil';}],
    ['ordinary edition on item shelf',shop=>{shop.itemOffers[0].edition='none';}],
    ['special edition on item shelf',shop=>{shop.itemOffers[0].edition='polychrome';}],
    ['invented offer kind',shop=>{object(shop.toolOffers[0]).kind='joker';}],
    ['fractional offer price',shop=>{shop.toolOffers[0].price=4.5;}],
    ['nonboolean consumed flag',shop=>{object(shop.itemOffers[0]).consumed=1;}],
    ['reward-only T16 for sale',shop=>{Object.assign(shop.toolOffers[0],{definitionId:'T16',price:4});}],
  ];
  it.each(corruptions)('rejects %s with a valid checksum',(_label,mutate)=>{
    const fixture=threeShelfParserFixture();expect(readCheckpoint(seal(fixture)).ok).toBe(true);
    expect(readCheckpoint(damage(fixture,state=>mutate(parserShop(state)))).ok).toBe(false);
  });
  it.each([['T01',4],['T18',4],['S01',8]] as const)('admits shelf tool %s only with executable capability',(definitionId,price)=>{
    const fixture=threeShelfParserFixture();expect(readCheckpoint(seal(fixture)).ok).toBe(true);
    Object.assign(parserShop(fixture.state).toolOffers[0],{definitionId,price});
    expect(readCheckpoint(seal(fixture)).ok).toBe(r2ToolSupported(definitionId));
  });
  it.each([['U01',10],['U11',10]] as const)('admits shelf item %s only with executable capability',(definitionId,price)=>{
    const fixture=threeShelfParserFixture();expect(readCheckpoint(seal(fixture)).ok).toBe(true);
    Object.assign(parserShop(fixture.state).itemOffers[0],{definitionId,price});
    expect(readCheckpoint(seal(fixture)).ok).toBe(r2ItemSupported(definitionId));
  });
});

describe('C01 finite clear-reward trace serialization',()=>{
  it.each(['U04','U09','U12','T16-grant','T16-overflow','e04'] as const)('restores actual %s clear events from explicit parser fixtures',kind=>{
    const fixture=clearSourceParserFixture(kind),event=clearSourceEvent(fixture.state,kind);
    if(kind==='U04'||kind==='T16-overflow'||kind==='e04')expect(event.value).toEqual({n:'2',d:'1'});
    if(kind==='U12')expect(event.value).toEqual({n:'3',d:'1'});
    if(kind==='T16-grant')expect(event).toMatchObject({operation:'reward-consumable',value:{n:'1',d:'1'},resourceBefore:0,resourceAfter:1});
    if(kind==='U09')expect(event).toMatchObject({operation:'upgrade-hand',targetHandType:'flush-five',value:{n:'1',d:'1'},resourceBefore:1,resourceAfter:2});
    expect(fixture.state.lastTrace!.goldDelta).toBe(0);
    const read=readCheckpoint(makeCheckpoint(fixture.state,fixture.journal));expect(read.ok&&read.checkpoint.state).toEqual(fixture.state);
  });
  const corruptions:readonly [string,ClearSourceKind,(event:ScoreEvent)=>void][]=[
    ['zero U04 interest','U04',event=>{event.value={n:'0',d:'1'};event.resourceAfter=event.resourceBefore;}],
    ['U04 above its two-gold cap','U04',event=>{event.value={n:'3',d:'1'};event.resourceAfter=event.resourceBefore!+3;}],
    ['wrong U12 three-gold grant','U12',event=>{event.value={n:'2',d:'1'};event.resourceAfter=event.resourceBefore!+2;}],
    ['wrong T16 two-gold overflow','T16-overflow',event=>{event.value={n:'3',d:'1'};event.resourceAfter=event.resourceBefore!+3;}],
    ['two T16 reward instances','T16-grant',event=>{event.value={n:'2',d:'1'};event.resourceAfter=event.resourceBefore!+2;}],
    ['T16 reward above four slots','T16-grant',event=>{event.resourceBefore=4;event.resourceAfter=5;}],
    ['missing T16 inventory delta','T16-grant',event=>{event.resourceAfter=event.resourceBefore;}],
    ['missing U09 target type','U09',event=>{delete event.targetHandType;}],
    ['unknown U09 target type','U09',event=>{object(event).targetHandType='invented-hand';}],
    ['undiscovered U09 target type','U09',event=>{event.targetHandType='pair';}],
    ['U09 level below one','U09',event=>{event.resourceBefore=0;event.resourceAfter=1;}],
    ['U09 level above thirty','U09',event=>{event.resourceBefore=30;event.resourceAfter=31;}],
    ['U09 two-level gain','U09',event=>{event.resourceAfter=event.resourceBefore!+2;}],
    ['U09 nonunit value','U09',event=>{event.value={n:'2',d:'1'};}],
    ['fractional U09 level','U09',event=>{event.resourceBefore=1.5;event.resourceAfter=2.5;}],
    ['target type on another operation','U04',event=>{event.targetHandType='high-card';}],
    ['unknown rule reward definition','U04',event=>{event.sourceDefinitionId='U99';}],
    ['wrong rule reward instance','U04',event=>{event.sourceInstanceId='another-run';}],
    ['reward before stage clear','U04',event=>{event.phase='afterHand';}],
    ['reward that changes score','U12',event=>{event.after={...event.after,H:{n:'0',d:'1'}};}],
    ['e04 above its two-gold contribution','e04',event=>{event.value={n:'3',d:'1'};event.resourceAfter=event.resourceBefore!+3;}],
  ];
  it.each(corruptions)('rejects %s after checksum re-signing',(_label,kind,mutate)=>{
    const fixture=clearSourceParserFixture(kind);expect(readCheckpoint(seal(fixture)).ok).toBe(true);
    expect(readCheckpoint(damage(fixture,state=>mutate(clearSourceEvent(state,kind)))).ok).toBe(false);
  });
});
