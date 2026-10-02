import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';
import {R2_JOKERS} from '../src/content/r2Schema';
import {r2ScoreContext,r2CreateJoker} from '../src/domain/r2Run';
import {scoreR2Hand,type ScoreInput} from '../src/domain/scoreR2';
import {makeC02MaxChainFixture} from './fixtures/c02-max-chain';

import type {PlayingCard,Rank,Suit} from '../src/cards/types';
import {createRun} from '../src/domain/run';
import {r2HandLimit} from '../src/domain/r2Resources';
import {r2DisabledCards} from '../src/domain/r2Chapter';

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

function maxChainRequest():ScoreInput {
  const {state,selectedIds}=makeC02MaxChainFixture(),stage=state.stage!;
  const hand=state.handOrder.map(id=>state.deckInstances.find(card=>card.id===id)!);
  return {rulesVersion:'r2',runId:state.runId,rootId:'c02-chain/oracle',
    hand,selectedIds,disabledIds:stage.disabledIds,jokers:state.jokers,definitions:R2_JOKERS,
    handLevels:state.handLevels,playIndex:stage.playIndex+1,handsBeforePlay:stage.handsLeft,
    previousHandType:stage.previousHandType,wager:false,rng:state.rng.rule,...r2ScoreContext(state,hand,selectedIds)};
}

describe('C02 independent maximum event-chain goldens',()=>{
  it('uses one legal five-source build and mixed enhancements to attain 88 pure events',()=>{
    const input=maxChainRequest(),before=structuredClone(input),trace=scoreR2Hand(input);
    // Five hearts Q: first lucky+d04 twice, the other four encore twice; ten passes.
    // B02 suppresses the last two originals and their repeats, but adds only two notices.
    // H=1200+6*10+10*(25+15+8)=1740.
    // M=(15+10*(2+1/4)+2*4+5)*2*(3/2)^5=24543/32.
    expect(trace.finalScore).toBe('1334525');
    expect(trace.accumulator).toEqual({H:{n:'1740',d:'1'},M:{n:'24543',d:'32'}});
    expect(trace.events).toHaveLength(88);
    expect(trace.events.reduce<Record<string,number>>((totals,event)=>{
      totals[event.phase]=(totals[event.phase]??0)+1;return totals;
    },{})).toEqual({base:1,onCardScore:75,onHeldCard:5,characterScore:1,jokerScore:5,finalScore:1});
    expect(trace.events.filter(event=>event.sourceDefinitionId==='rank-12')).toHaveLength(10);
    expect(trace.events.filter(event=>event.operation==='retrigger-card')).toHaveLength(5);
    expect(trace.events.some(event=>event.operation==='retrigger-cap')).toBe(false);
    expect(trace.sets.activeScoringIds).toEqual(input.selectedIds);
    expect(trace.sets.heldIds).toEqual(['diamonds-2','diamonds-3','diamonds-4','diamonds-5','diamonds-6']);
    // Independently computed Mulberry uint vector from literal cursor16697:
    // 260915538,34794290,382425058,142180176; M,G,M,G all hit.
    expect(trace.rng).toEqual({algorithm:'fnv1a-mulberry32-v1',state:3031312653});
    expect(trace.goldDelta).toBe(20);
    expect(trace.events.filter(event=>event.operation==='add-gold').map(event=>[event.resourceBefore,event.resourceAfter])).toEqual([[100,110],[110,120]]);
    expect(trace.destroyedCardIds).toEqual([]);
    expect(trace.destroyedJokerIds).toEqual([]);
    expect(input).toEqual(before);
    expect(trace.sourceJokers.map(joker=>joker.definitionId)).toEqual(['d04','b02','b05','tiesuanpan','c02']);
    expect(Object.isFrozen(trace.cards[0])).toBe(true);
  });

  it('all encore on the same build is one event shorter, so a local enhancement maximum is insufficient',()=>{
    const input=maxChainRequest();input.hand=input.hand.map(card=>card.id===input.selectedIds[0]?{...card,enhancement:'encore-paper' as const}:card);
    const trace=scoreR2Hand(input);
    // H1200+7*10+11*48=1798; M=(15+11*9/4+5)*2*243/32=43497/64.
    expect(trace.finalScore).toBe('1221993');
    expect(trace.accumulator).toEqual({H:{n:'1798',d:'1'},M:{n:'43497',d:'64'}});
    expect(trace.events).toHaveLength(87);
    expect(trace.goldDelta).toBe(0);
    expect(trace.rng).toEqual(input.rng);
  });

  it('a glass replacement contributes only one post-final lifecycle check per original, and stays below the maximum',()=>{
    const input=maxChainRequest();input.hand=input.hand.map(card=>card.id===input.selectedIds[0]?{...card,enhancement:'glass-paper' as const}:card);
    // Cursor2 first uint3153583793 misses glass; no lucky draws remain.
    input.rng={algorithm:'fnv1a-mulberry32-v1',state:2};
    const trace=scoreR2Hand(input);
    // First M:15*3/2+9/4 ->99/4; replay:*3/2+9/4 ->315/8.
    // Then eight passes add18, held add5, xiemu*2, five editions*243/32.
    expect(trace.finalScore).toBe('1648337');
    expect(trace.accumulator).toEqual({H:{n:'1740',d:'1'},M:{n:'121257',d:'128'}});
    expect(trace.events).toHaveLength(83);
    expect(trace.events.filter(event=>event.operation==='glass-check')).toHaveLength(1);
    expect(trace.events.at(-1)?.operation).toBe('glass-check');
    expect(trace.destroyedCardIds).toEqual([]);
    expect(trace.rng).toEqual({algorithm:'fnv1a-mulberry32-v1',state:1831565815});
  });
});

const contentCLI=(path?:string)=>spawnSync(process.execPath,['scripts/verify-content.mjs',...(path?[path]:[])],{encoding:'utf8',timeout:20000});
describe('C02 current-content joint event proof',()=>{
  it('adds one bounded program reward to the C03 envelope while retaining the independent conservative512 guard',()=>{
    const result=contentCLI();expect(result.status,result.stderr).toBe(0);
    // Vite may prepend a dependency-optimizer status line before the CLI JSON.
    const report=JSON.parse(result.stdout.match(/\{\s*"status"[\s\S]*\}/)?.[0]??'');
    // One selected program can add one Boss-clear event. The attained 88/91
    // arithmetic goldens above stay fixed; this is an upper envelope, not attainment.
    expect(report.eventBoundModel.programRewardEventMaximum).toBe(1);
    expect(report.conservativeEventBound).toBe(319+1);
    expect(report.legalEventEnvelope.maximumEvents).toBe(91+1);
    expect(report.legalEventEnvelope.abstractWitness.breakdown.clearRules).toBe(4);
    expect(report.legalEventEnvelope.definitionCount).toBe(72);
    expect(report.legalEventEnvelope.retriggerCapNoticesReachable).toBe(false);
    expect(report.legalEventEnvelope.maximumEntryHand).toBe(13);
    expect(report.legalEventEnvelope.abstractWitness.boss).toBe('B02');
    expect(report.legalEventEnvelope.bossTraceBudgets).toEqual({B01:0,B02:0,B03:0,B04:0,B05:1,B06:0,B07:0,B08:0,B09:0,B10:0,B11:0,B12:1,B13:0,B14:0,B15:1,B16:0});
  },20000);

  it.each(['unknown-id','changed-card-condition'] as const)('refuses a tight proof for %s rather than silently carrying the old classification',(kind)=>{
    const altered=structuredClone(R2_JOKERS);
    if(kind==='unknown-id')altered.find(definition=>definition.id==='a08')!.id='c02-unclassified';
    else altered.find(definition=>definition.id==='tiesuanpan')!.hooks[0].condition={kind:'always'};
    expect(altered).toHaveLength(72);
    const directory=mkdtempSync(join(tmpdir(),'dachoupai-c02-'));
    try {
      const path=join(directory,`${kind}.json`);writeFileSync(path,JSON.stringify(altered));
      const result=contentCLI(path);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('unclassified tight-bound content');
    } finally {rmSync(directory,{recursive:true,force:true});}
  },20000);
});
