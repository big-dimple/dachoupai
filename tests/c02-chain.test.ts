import {describe, expect, it} from 'vitest';
import type {PlayingCard, Rank, Suit} from '../src/cards/types';
import {R2_JOKERS} from '../src/content/r2Schema';
import {createRun} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {r2HandLimit} from '../src/domain/r2Resources';
import {r2DisabledCards} from '../src/domain/r2Chapter';
import {scoreR2Hand, type ScoreInput} from '../src/domain/scoreR2';

function poker(id:string,rank:Rank,suit:Suit='hearts',enhancement:PlayingCard['enhancement']='voice-paper',edition:PlayingCard['edition']='none'):PlayingCard {
  return {id,rank,suit,enhancement,edition};
}
function request(hand:PlayingCard[],ids:string[],held:number,extra:Partial<ScoreInput>={}):ScoreInput {
  return {rulesVersion:'r2',runId:'c02-chain',rootId:'chain',characterId:'neutral',hand,
    selectedIds:hand.slice(0,hand.length-held).map(card=>card.id),disabledIds:[],
    jokers:ids.map(id=>r2CreateJoker(id,'chain/'+id,8,'polychrome')),definitions:R2_JOKERS,
    handLevels:{},playIndex:2,handsBeforePlay:3,previousHandType:'high-card',wager:false,
    rng:{algorithm:'fnv1a-mulberry32-v1',state:0},...extra};
}

describe('C02 distinct-source legal resource/depth stress witnesses',()=>{
  it('reaches the current maximum 13-card resource budget and four extra passes with five distinct Jokers',()=>{
    const ranks:Rank[]=[11,12,2,12,13],selected=ranks.map((rank,index)=>poker('played/'+index,rank,'hearts','encore-paper','polychrome'));
    const held=Array.from({length:8},(_,index)=>poker('held/'+index,3));
    const input=request([...selected,...held],['d04','c07','d11','a04','d06'],8);
    input.disabledIds=r2DisabledCards({definitionId:'B04',disabledSuit:null},2,input.hand);
    const resources=createRun({rulesVersion:'r2',seed:'resource-proof',runId:'resource-proof',characterId:'amo'});
    resources.jokers=structuredClone([...input.jokers]);resources.longTermItems=['U01'];resources.spectralModifiers.cleanSlateBonus=1;
    resources.destroyedIds=resources.deckInstances.slice(0,12).map(card=>card.id);
    expect(r2HandLimit(resources)).toBe(13); // 8 + 2 + 1 + U01's1 + S08's1; hard14 is not yet reachable.
    const before=structuredClone(input),trace=scoreR2Hand(input);
    expect(trace.sets.activeScoringIds).toEqual(['played/2']);
    expect(trace.events.filter(event=>event.sourceType==='card'&&event.operation==='add-heat')).toHaveLength(5);
    expect(trace.events.filter(event=>event.operation==='retrigger-card').map(event=>event.sourceDefinitionId))
      .toEqual(['played/2','d04','c07','d11']);
    expect(trace.events.every(event=>event.retriggerDepth<=1)).toBe(true);
    expect(trace.events).toHaveLength(29);
    // H140+five rank2 passes=150; M=(4*1.5^5+8)*1.5^5=74601/256.
    expect(trace.accumulator).toEqual({H:{n:'150',d:'1'},M:{n:'74601',d:'256'}});
    expect(trace.finalScore).toBe('43711');
    expect(trace.rng).toEqual(input.rng);
    expect(input).toEqual(before);
  });

  it('expands eleven scoring passes and 74 deterministic sources without event truncation',()=>{
    const ranks:Rank[]=[11,12,12,12,13],selected=ranks.map((rank,index)=>poker('played/'+index,rank,'hearts','encore-paper','holographic'));
    const held=Array.from({length:5},(_,index)=>poker('held/'+index,3));
    const input=request([...selected,...held],['d04','b02','b05','tiesuanpan','c02'],5),trace=scoreR2Hand(input);
    expect(trace.handType).toBe('flush');
    expect(trace.sets.activeScoringIds).toHaveLength(5);
    expect(new Set(trace.sourceJokers.map(joker=>joker.definitionId)).size).toBe(5);
    expect(trace.events.filter(event=>event.sourceType==='card'&&event.operation==='add-heat')).toHaveLength(11);
    expect(trace.events).toHaveLength(74);
    // H140+110ordinary+275face+90triples+88red=703.
    // M4+22holo+1.5paired+5held=65/2, then all five editions:15795/64.
    expect(trace.accumulator).toEqual({H:{n:'703',d:'1'},M:{n:'15795',d:'64'}});
    expect(trace.finalScore).toBe('173498');
    expect(trace.rng).toEqual(input.rng);
  });

  it('executes eight lucky passes then one F08 check in a 55-source mixed chain',()=>{
    const ranks:Rank[]=[11,12,2,12,13],selected=ranks.map((rank,index)=>poker('played/'+index,rank,'spades','lucky-paper','holographic'));
    const held=Array.from({length:5},(_,index)=>poker('held/'+index,3));
    const trace=scoreR2Hand(request([...selected,...held],['d04','d11','c07','tiesuanpan','f08'],5));
    // Fixed independent Mulberry vector: lucky multiplier misses8, gold hits once; F08 draw17 misses.
    expect(trace.events.filter(event=>event.operation==='lucky-multiplier-check')).toHaveLength(8);
    expect(trace.events.filter(event=>event.operation==='lucky-gold-check')).toHaveLength(8);
    expect(trace.events.filter(event=>event.operation==='chance-heat-check')).toHaveLength(1);
    expect(trace.events).toHaveLength(55);
    expect(trace.goldDelta).toBe(10);
    expect(trace.accumulator).toEqual({H:{n:'354',d:'1'},M:{n:'6075',d:'32'}});
    expect(trace.finalScore).toBe('67204');
    expect(trace.rng).toEqual({algorithm:'fnv1a-mulberry32-v1',state:1071847749});
  });
});
