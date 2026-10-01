import {describe,expect,it} from 'vitest';
import {applyCommand,createRun,stateHash,type Action,type Command,type R2RunState} from '../src/domain/run';
import {r2ConsumableCapacity} from '../src/domain/r2Run';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {SeededRng} from '../src/core/SeededRng';
import type {Edition,Enhancement,PlayingCard,Suit} from '../src/cards/types';
import type {R2HandType} from '../src/domain/evaluateR2';
import type {R2JokerInstance} from '../src/content/r2Schema';

type SpectralId='S01'|'S02'|'S03'|'S04'|'S05'|'S06'|'S07'|'S08';
type Use=Extract<Action,{type:'UseConsumable'}>;
type Phase='shop'|'await-input';
// Handwritten public probability and reward tables, independent of the tool implementation/catalog.
const SEVEN_ENHANCEMENTS:readonly Enhancement[]=['heat-paper','multiplier-paper','glass-paper','voice-paper','gold-paper','encore-paper','lucky-paper'];
const EDITION_TEN:readonly Edition[]=['foil','foil','foil','foil','foil','holographic','holographic','holographic','polychrome','polychrome'];
const C01_RARE_IDS=['huimaqiang','e08','a06','b06','c07','d04','f06'] as const;
const command=(state:R2RunState,action:Action):Command=>({runId:state.runId,commandId:`spectral/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
function send(state:R2RunState,action:Action):R2RunState {
  const result=applyCommand(state,command(state,action));if(!result.ok)throw Error(result.code);return result.state;
}
function fixture(id:SpectralId,phase:Phase='shop'):R2RunState {
  let state=createRun({seed:'c01-spectral-goldens',runId:`c01-spectral/${id}/${phase}`,characterId:'amo',rulesVersion:'r2'});
  if(phase==='await-input')state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
  // These are explicit domain fixtures, not proof of natural tool acquisition or legacy migration.
  // Attach inventory only after normal phase entry, before adding any not-yet-supported specials.
  state.gold=20;state.consumables=[{instanceId:'fixture/spectral',definitionId:id}];
  state.rng.rule=new SeededRng('c01-spectral-rule').snapshot();state.rng.reward=new SeededRng('c01-spectral-reward').snapshot();
  return state;
}
const use=(patch:Partial<Use>={}):Use=>({type:'UseConsumable',instanceId:'fixture/spectral',targetIds:[],...patch});
const knownCards=(state:R2RunState):PlayingCard[]=>state.phase==='await-input'?state.handOrder.map(id=>state.deckInstances.find(card=>card.id===id)!):state.deckInstances.filter(card=>!state.destroyedIds.includes(card.id));
const watcher=():R2JokerInstance=>({instanceId:'fixture/e06',definitionId:'e06',paidPrice:6,growth:{multiplier:{n:'1',d:'2'}}});
function deckCount(state:R2RunState,count:number):R2RunState {
  state.deckInstances=state.deckInstances.slice(0,count);
  while(state.deckInstances.length<count)state.deckInstances.push({...state.deckInstances[0],id:`fixture/existing-copy/${state.deckInstances.length}`});
  state.drawPile=state.deckInstances.map(card=>card.id);state.handOrder=[];state.playedPile=[];state.discardPile=[];state.destroyedIds=[];
  return state;
}
function noUnexpectedRng(next:R2RunState,before:R2RunState,changed?:'rule'|'reward'):void {
  for(const stream of ['deck','shop','rule','reward'] as const)if(stream!==changed)expect(next.rng[stream]).toEqual(before.rng[stream]);
}
function applied(state:R2RunState,action:Use):R2RunState {
  const before=structuredClone(state),result=applyCommand(state,command(state,action));
  expect(result.ok).toBe(true);if(!result.ok)throw Error(result.code);
  expect(state).toEqual(before);
  expect(result.events.some(event=>event.type==='joker-transaction'&&(event.phase==='onBuyOffer'||event.phase==='onSellJoker'))).toBe(false);
  expect(result.events.some(event=>event.type==='cards-discarded')).toBe(false);
  expect(result.state.lastTrace).toEqual(before.lastTrace);
  const restored=readCheckpoint(JSON.parse(JSON.stringify(makeCheckpoint(result.state,[]))));expect(restored.ok&&restored.checkpoint.state).toEqual(result.state);
  return result.state;
}
function rejected(state:R2RunState,action:Use,expectedSeq=state.commandSeq):void {
  const before=structuredClone(state),hash=stateHash(state),result=applyCommand(state,{...command(state,action),expectedSeq});
  expect(result.ok).toBe(false);if(result.ok)return;
  // An unavailable family does not prove a floor, cap, target or sequence boundary.
  expect(result.code).not.toBe('consumable-not-enabled');expect(result.state).toBe(state);expect(stateHash(state)).toBe(hash);expect(state).toEqual(before);
  expect(state.consumables).toEqual(before.consumables);expect(state.rng).toEqual(before.rng);expect(state.gold).toBe(before.gold);
}
const enterNext=(state:R2RunState)=>send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
function specialFour(state:R2RunState):void {
  const cards=knownCards(state);cards[0].enhancement='heat-paper';cards[0].edition='foil';cards[1].edition='holographic';cards[2].enhancement='glass-paper';cards[3].edition='polychrome';
}
function prepared(id:SpectralId):{state:R2RunState;action:Use} {
  const state=fixture(id),cards=knownCards(state);
  switch(id){
    case 'S01':return {state,action:use({sacrificeId:cards[0].id,targetIds:[cards[1].id]})};
    case 'S02':return {state,action:use({targetKind:'card',targetIds:[cards[0].id]})};
    case 'S03':return {state,action:use({targetIds:[cards[0].id]})};
    case 'S04':return {state,action:use({suit:'hearts'})};
    case 'S05':state.handLevels={...state.handLevels,straight:4,pair:2};return {state,action:use({handType:'straight',secondaryHandType:'pair'})};
    case 'S06':return {state,action:use()};
    case 'S07':state.jokers=[{instanceId:'fixture/donor',definitionId:'pengci',paidPrice:12,growth:{}},{instanceId:'fixture/recipient',definitionId:'b03',paidPrice:11,growth:{multiplier:{n:'3',d:'2'}}}];return {state,action:use({sacrificeId:'fixture/donor',targetIds:['fixture/recipient']})};
    case 'S08':specialFour(state);return {state,action:use()};
  }
}

describe('C01 eight spectral cost/benefit command goldens',()=>{
  it.each(['shop','await-input'] as const)('S01 sacrifices only its donor and draws two independent enhancements in %s without a sale or discard',phase=>{
    const state=fixture('S01',phase),cards=knownCards(state),donor=cards[0],recipients=cards.slice(1,3);recipients[0].edition='foil';state.jokers=[watcher()];
    const before=structuredClone(state),rng=SeededRng.restore(state.rng.rule),expected=recipients.map(()=>SEVEN_ENHANCEMENTS[rng.integer(0,6)]);
    const next=applied(state,use({sacrificeId:donor.id,targetIds:recipients.map(card=>card.id)}));
    expect(next.destroyedIds).toEqual([donor.id]);expect(next.deckInstances.length-next.destroyedIds.length).toBe(51);
    for(let index=0;index<recipients.length;index++)expect(next.deckInstances.find(card=>card.id===recipients[index].id)).toEqual({...recipients[index],enhancement:expected[index]});
    expect(next.deckInstances.find(card=>card.id===donor.id)).toEqual(donor);
    for(const zone of ['drawPile','handOrder','playedPile','discardPile'] as const)expect(next[zone]).toEqual(before[zone].filter(id=>id!==donor.id));
    expect(next.gold).toBe(20);expect(next.jokers).toEqual(before.jokers);expect(next.stage).toEqual(before.stage);expect(next.consumables).toEqual([]);
    expect(next.rng.rule).toEqual(rng.snapshot());noUnexpectedRng(next,before,'rule');
  });
  it.each(['shop','await-input'] as const)('S01 assigns its two draws by the public %s candidate order even with reversed targetIds',phase=>{
    const state=fixture('S01',phase),cards=knownCards(state),recipients=cards.slice(1,3),rng=SeededRng.restore(state.rng.rule);
    const expected=recipients.map(()=>SEVEN_ENHANCEMENTS[rng.integer(0,6)]);
    const next=applied(state,use({sacrificeId:cards[0].id,targetIds:recipients.map(card=>card.id).reverse()}));
    for(let index=0;index<recipients.length;index++)expect(next.deckInstances.find(card=>card.id===recipients[index].id)?.enhancement).toBe(expected[index]);
    expect(next.rng.rule).toEqual(rng.snapshot());
  });
  it.each([[21,false,20],[17,true,16]] as const)('S01 can land exactly on the legal floor from %i cards / U08=%s',(count,minimal,remaining)=>{
    const state=deckCount(fixture('S01'),count);if(minimal)state.longTermItems=['U08'];
    const cards=knownCards(state),rng=SeededRng.restore(state.rng.rule),enhancement=SEVEN_ENHANCEMENTS[rng.integer(0,6)];
    const next=applied(state,use({sacrificeId:cards[0].id,targetIds:[cards[1].id]}));
    expect(next.deckInstances.length-next.destroyedIds.length).toBe(remaining);expect(next.deckInstances.find(card=>card.id===cards[1].id)?.enhancement).toBe(enhancement);expect(next.rng.rule).toEqual(rng.snapshot());
  });
  it.each(['shop','await-input'] as const)('S02 spends exactly five extra gold and one rule draw for a card in %s, preserving enhancement',phase=>{
    const state=fixture('S02',phase),target=knownCards(state)[0];target.enhancement='voice-paper';target.edition='none';
    const before=structuredClone(state),rng=SeededRng.restore(state.rng.rule),edition=EDITION_TEN[rng.integer(0,9)],next=applied(state,use({targetKind:'card',targetIds:[target.id]}));
    expect(next.deckInstances.find(card=>card.id===target.id)).toEqual({...target,edition});expect(next.gold).toBe(15);expect(next.consumables).toEqual([]);
    expect(next.rng.rule).toEqual(rng.snapshot());noUnexpectedRng(next,before,'rule');expect(next.handOrder).toEqual(before.handOrder);expect(next.stage).toEqual(before.stage);
  });
  it.each(['shop','await-input'] as const)('S02 preserves a Joker paid price and growth while randomizing its ordinary edition in %s',phase=>{
    const state=fixture('S02',phase);state.jokers=[{instanceId:'fixture/b03',definitionId:'b03',paidPrice:11,growth:{multiplier:{n:'3',d:'2'}},edition:'none'},watcher()];
    const before=structuredClone(state),rng=SeededRng.restore(state.rng.rule),edition=EDITION_TEN[rng.integer(0,9)],next=applied(state,use({targetKind:'joker',targetIds:['fixture/b03']}));
    expect(next.jokers).toEqual([{...before.jokers[0],edition},before.jokers[1]]);expect(next.gold).toBe(15);expect(next.rng.rule).toEqual(rng.snapshot());noUnexpectedRng(next,before,'rule');
  });
  it('S03 keeps its original, makes two full permanent copies at the bottom and reduces the actual next-stage hands from four to three',()=>{
    const state=fixture('S03'),source=knownCards(state)[0];source.enhancement='glass-paper';source.edition='holographic';
    const before=structuredClone(state),oldIds=new Set(state.deckInstances.map(card=>card.id)),next=applied(state,use({targetIds:[source.id]})),copies=next.deckInstances.filter(card=>!oldIds.has(card.id));
    expect(copies).toHaveLength(2);expect(new Set(copies.map(card=>card.id)).size).toBe(2);
    for(const copy of copies){expect(copy.id).not.toBe(source.id);expect(copy).toEqual({...source,id:copy.id});}
    expect(next.deckInstances.find(card=>card.id===source.id)).toEqual(source);expect(next.deckInstances.length-next.destroyedIds.length).toBe(54);
    expect(new Set(next.drawPile.slice(0,2))).toEqual(new Set(copies.map(card=>card.id)));expect(next.drawPile.slice(2)).toEqual(before.drawPile);expect(next.drawPile.at(-1)).toBe(before.drawPile.at(-1));
    expect(next.spectralModifiers).toEqual({handsPenalty:1,handPenalty:0,cleanSlateBonus:0});expect(next.gold).toBe(20);noUnexpectedRng(next,before);
    const entered=enterNext(next);expect(entered.stage).toMatchObject({initialHands:3,handsLeft:3,handLimit:8});expect(entered.deckInstances.length-entered.destroyedIds.length).toBe(54);
  });
  it('S03 permits exactly eighty living cards and a second permanent penalty down to two actual hands',()=>{
    const state=deckCount(fixture('S03'),78);state.spectralModifiers.handsPenalty=1;
    const next=applied(state,use({targetIds:[knownCards(state)[0].id]}));expect(next.deckInstances.length-next.destroyedIds.length).toBe(80);expect(next.spectralModifiers.handsPenalty).toBe(2);
    const entered=enterNext(next);expect(entered.stage!.initialHands).toBe(2);expect(entered.stage!.handsLeft).toBe(2);
  });
  it('S04 recolors the whole living deck, retains all permanent attributes and freezes a seven-card next-stage hand',()=>{
    const state=fixture('S04'),cards=knownCards(state);cards[1].enhancement='heat-paper';cards[1].edition='foil';
    const dead=cards[0].id;state.destroyedIds=[dead];state.drawPile=state.drawPile.filter(id=>id!==dead);
    const before=structuredClone(state),next=applied(state,use({suit:'hearts'}));
    expect(next.deckInstances).toEqual(before.deckInstances.map(card=>card.id===dead?card:{...card,suit:'hearts'}));expect(next.drawPile).toEqual(before.drawPile);expect(next.destroyedIds).toEqual([dead]);
    expect(next.spectralModifiers).toEqual({handsPenalty:0,handPenalty:1,cleanSlateBonus:0});expect(next.gold).toBe(20);noUnexpectedRng(next,before);
    const entered=enterNext(next);expect(entered.stage).toMatchObject({initialHands:4,handsLeft:4,handLimit:7});expect(entered.handOrder).toHaveLength(7);
  });
  it.each(['shop','await-input'] as const)('S05 exchanges exactly +3/-1 discovered levels at their boundaries and pays three extra gold in %s',phase=>{
    const state=fixture('S05',phase);state.handLevels={...state.handLevels,straight:27,pair:2};state.gold=3;
    const before=structuredClone(state),next=applied(state,use({handType:'straight',secondaryHandType:'pair'}));
    expect(next.handLevels).toEqual({...before.handLevels,straight:30,pair:1});expect(next.gold).toBe(0);expect(Object.hasOwn(next.handLevels,'pair')).toBe(true);
    expect(next.chapterHandUsage).toEqual(before.chapterHandUsage);expect(next.stage).toEqual(before.stage);expect(next.consumables).toEqual([]);noUnexpectedRng(next,before);
  });
  it('S06 consumes all twenty gold for an unowned supported rare using only one reward draw, without purchase growth',()=>{
    const state=fixture('S06');state.jokers=[{instanceId:'fixture/owned-rare',definitionId:'huimaqiang',paidPrice:8,growth:{}},{instanceId:'fixture/e05',definitionId:'e05',paidPrice:6,growth:{heat:{n:'16',d:'1'}}}];
    const before=structuredClone(state),rng=SeededRng.restore(state.rng.reward),unowned=C01_RARE_IDS.filter(id=>id!=='huimaqiang'),definitionId=unowned[rng.integer(0,unowned.length-1)],next=applied(state,use());
    expect(next.gold).toBe(0);expect(next.jokers).toHaveLength(3);expect(next.jokers.slice(0,2)).toEqual(before.jokers);
    const reward=next.jokers[2];expect(reward.definitionId).toBe(definitionId);expect(reward.paidPrice).toBe(0);expect(reward.edition??'none').toBe('none');expect(reward.growth).toEqual({});expect(reward.counters?.handsScored??0).toBe(0);
    expect(before.jokers.some(joker=>joker.definitionId===reward.definitionId)).toBe(false);expect(next.consumables).toEqual([]);expect(next.rng.reward).toEqual(rng.snapshot());noUnexpectedRng(next,before,'reward');
  });
  it('S07 destroys the donor without a sale and preserves the target paid price/growth while applying polychrome',()=>{
    const state=fixture('S07');state.jokers=[{instanceId:'fixture/donor',definitionId:'e05',paidPrice:17,growth:{heat:{n:'16',d:'1'}}},{instanceId:'fixture/recipient',definitionId:'b03',paidPrice:11,growth:{multiplier:{n:'3',d:'2'}},edition:'foil'},watcher()];
    state.consumables.push({instanceId:'fixture/old-tool',definitionId:'T01'});
    const before=structuredClone(state),next=applied(state,use({sacrificeId:'fixture/donor',targetIds:['fixture/recipient']}));
    expect(next.jokers).toEqual([{...before.jokers[1],edition:'polychrome'},before.jokers[2]]);expect(next.gold).toBe(20);expect(next.consumables).toEqual([before.consumables[1]]);
    expect(next.consumables.length).toBeLessThanOrEqual(r2ConsumableCapacity(next));noUnexpectedRng(next,before);
  });
  it('S08 counts four distinct special cards, clears both layers on every living card and grants one actual next-stage hand slot',()=>{
    const state=fixture('S08');specialFour(state);const before=structuredClone(state),next=applied(state,use());
    for(let index=0;index<next.deckInstances.length;index++){
      const card=next.deckInstances[index];expect(card.id).toBe(before.deckInstances[index].id);expect(card.rank).toBe(before.deckInstances[index].rank);expect(card.suit).toBe(before.deckInstances[index].suit);
      expect(card.enhancement).toBeUndefined();expect(card.edition??'none').toBe('none');
    }
    expect(next.drawPile).toEqual(before.drawPile);expect(next.spectralModifiers).toEqual({handsPenalty:0,handPenalty:0,cleanSlateBonus:1});expect(next.gold).toBe(20);noUnexpectedRng(next,before);
    const entered=enterNext(next);expect(entered.stage).toMatchObject({initialHands:4,handsLeft:4,handLimit:9});expect(entered.handOrder).toHaveLength(9);
  });
  it('S01 rejects both deletion floors, enhanced/duplicate/own recipients and a hidden in-stage sacrifice before any draw',()=>{
    for(const [count,minimal] of [[20,false],[16,true]] as const){const state=deckCount(fixture('S01'),count);if(minimal)state.longTermItems=['U08'];const cards=knownCards(state);rejected(state,use({sacrificeId:cards[0].id,targetIds:[cards[1].id]}));}
    let state=fixture('S01'),cards=knownCards(state);cards[1].enhancement='heat-paper';rejected(state,use({sacrificeId:cards[0].id,targetIds:[cards[1].id]}));
    state=fixture('S01');cards=knownCards(state);rejected(state,use({sacrificeId:cards[0].id,targetIds:[cards[1].id,cards[1].id]}));rejected(state,use({sacrificeId:cards[0].id,targetIds:[cards[0].id]}));rejected(state,use({sacrificeId:cards[0].id,targetIds:[]}));
    state=fixture('S01','await-input');cards=knownCards(state);rejected(state,use({sacrificeId:state.drawPile.at(-1)!,targetIds:[cards[0].id]}));
  });
  it('S02 rejects insufficient gold, nonordinary card/Joker, wrong target kind and multiple targets without a draw',()=>{
    let state=fixture('S02'),target=knownCards(state)[0];state.gold=4;rejected(state,use({targetKind:'card',targetIds:[target.id]}));
    state=fixture('S02');target=knownCards(state)[0];target.edition='foil';rejected(state,use({targetKind:'card',targetIds:[target.id]}));
    state=fixture('S02');state.jokers=[{instanceId:'fixture/foil',definitionId:'pengci',paidPrice:9,growth:{},edition:'holographic'}];rejected(state,use({targetKind:'joker',targetIds:['fixture/foil']}));
    state=fixture('S02');const cards=knownCards(state);rejected(state,use({targetKind:'joker',targetIds:[cards[0].id]}));rejected(state,use({targetKind:'card',targetIds:cards.slice(0,2).map(card=>card.id)}));
  });
  it('S03 rejects a copy beyond eighty, the cumulative two-penalty floor and in-stage use atomically',()=>{
    let state=deckCount(fixture('S03'),79);rejected(state,use({targetIds:[knownCards(state)[0].id]}));
    state=fixture('S03');state.spectralModifiers.handsPenalty=2;rejected(state,use({targetIds:[knownCards(state)[0].id]}));
    state=fixture('S03','await-input');rejected(state,use({targetIds:[knownCards(state)[0].id]}));
  });
  it('S04 rejects a whole-deck noop, cumulative hand penalty two and in-stage use without changing order',()=>{
    let state=fixture('S04');for(const card of knownCards(state))card.suit='hearts';rejected(state,use({suit:'hearts'}));
    state=fixture('S04');state.spectralModifiers.handPenalty=2;rejected(state,use({suit:'hearts'}));
    state=fixture('S04','await-input');rejected(state,use({suit:'hearts'}));
  });
  it('S05 rejects incomplete or same/discovered-level exchanges and insufficient extra gold without partial transfer',()=>{
    for(const patch of [{straight:28,pair:2},{straight:4,pair:1}] as const){const state=fixture('S05');state.handLevels={...state.handLevels,...patch};rejected(state,use({handType:'straight',secondaryHandType:'pair'}));}
    let state=fixture('S05');state.handLevels={...state.handLevels,straight:4,pair:2};rejected(state,use({handType:'straight',secondaryHandType:'straight'}));rejected(state,use({handType:'straight'}));
    state=fixture('S05');state.handLevels={...state.handLevels,straight:4};rejected(state,use({handType:'straight',secondaryHandType:'pair'}));
    state=fixture('S05');state.handLevels={...state.handLevels,straight:4,pair:2};state.gold=2;rejected(state,use({handType:'straight',secondaryHandType:'pair'}));
  });
  it('S06 rejects below five gold, five occupied Joker slots and in-stage use before the reward draw',()=>{
    let state=fixture('S06');state.gold=4;rejected(state,use());
    state=fixture('S06');state.jokers=['pengci','mantangcai','tiesuanpan','a03','jiedongfeng'].map((definitionId,index)=>({instanceId:`fixture/full/${index}`,definitionId,paidPrice:6,growth:{}}));rejected(state,use());
    state=fixture('S06','await-input');rejected(state,use());
  });
  it('S07 rejects an already-polychrome target, self sacrifice and in-stage use without refunds or sale growth',()=>{
    let preparedUse=prepared('S07');preparedUse.state.jokers[1].edition='polychrome';rejected(preparedUse.state,preparedUse.action);
    preparedUse=prepared('S07');rejected(preparedUse.state,use({sacrificeId:'fixture/donor',targetIds:['fixture/donor']}));
    const state=fixture('S07','await-input');state.jokers=prepared('S07').state.jokers;rejected(state,use({sacrificeId:'fixture/donor',targetIds:['fixture/recipient']}));
  });
  it('S08 rejects three doubly-special cards, a prior global use and in-stage use without clearing anything',()=>{
    let state=fixture('S08');for(const card of knownCards(state).slice(0,3)){card.enhancement='heat-paper';card.edition='foil';}rejected(state,use());
    state=fixture('S08');specialFour(state);state.spectralModifiers.cleanSlateBonus=1;rejected(state,use());
    state=fixture('S08','await-input');specialFour(state);rejected(state,use());
  });
  it.each(['S01','S02','S03','S04','S05','S06','S07','S08'] as const)('%s rejects unknown target payloads and stale sequences with complete rollback',id=>{
    const valid=prepared(id),bad={...valid.action};
    if(id==='S04')bad.suit='moon' as Suit;
    else if(id==='S05')bad.handType='unknown-hand' as R2HandType;
    else if(id==='S07')bad.sacrificeId='unknown-joker';
    else bad.targetIds=['unknown-card'];
    rejected(valid.state,bad);rejected(valid.state,valid.action,valid.state.commandSeq-1);
  });
});

// NOT_RUN in this C01/current-48 suite: E09 removal capacity, owning every rare with an empty slot,
// and S08 raw hand-14 cap swallowing. No legal current-content fixture reaches these C02 combinations.
