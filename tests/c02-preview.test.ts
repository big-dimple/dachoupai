import {describe, expect, it} from 'vitest';
import {R2_JOKERS, type R2JokerInstance} from '../src/content/r2Schema';
import type {PlayingCard} from '../src/cards/types';
import {previewR2Hand, scoreR2Hand, type ScoreInput} from '../src/domain/scoreR2';

const two:PlayingCard={id:'two',rank:2,suit:'spades'};
const owned=(definitionId:string,edition:R2JokerInstance['edition']='none'):R2JokerInstance=>({
  instanceId:`preview/${definitionId}`,definitionId,paidPrice:4,growth:{},edition,
});
function request(extra:Partial<ScoreInput>={}):ScoreInput {
  return {rulesVersion:'r2',runId:'c02-preview',rootId:'preview',characterId:'neutral',
    hand:[two],selectedIds:['two'],disabledIds:[],jokers:[owned('f08')],definitions:R2_JOKERS,
    handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,
    rng:{algorithm:'fnv1a-mulberry32-v1',state:1},...extra};
}
function preview(input:ScoreInput) {
  const {rng:_rng,...publicInput}=input;
  return previewR2Hand(publicInput);
}

describe('C02 public chance bounds and exact target boundaries',()=>{
  it('publishes one per-hand F08 probability without reading a future draw',()=>{
    const input=request(),original=structuredClone(input),result=preview(input);
    // H22 versus H112, M1. F08 checks once at jokerScore, never once per poker.
    expect(result.scoreRange).toEqual({minimum:'22',maximum:'112'});
    expect(result.possibleScores).toEqual(['22','112']);
    expect(result.randomEffects).toContainEqual({kind:'joker-heat',sourceDefinitionId:'f08',
      sourceInstanceId:'preview/f08',probability:{n:1,d:3},value:{n:'90',d:'1'},timing:'jokerScore'});
    for(let i=0;i<20;i++)expect(preview(input)).toEqual(result);
    expect(input).toEqual(original);
    const trace=scoreR2Hand(input);
    expect(trace.finalScore).toBe('22');
    expect(trace.rng).toEqual({algorithm:'fnv1a-mulberry32-v1',state:1831565814});
  });

  it.each([
    ['foil','47','137'],['holographic','66','336'],['polychrome','33','168'],
  ] as const)('includes the F08 %s edition after its chance outcome', (edition,minimum,maximum)=>{
    expect(preview(request({jokers:[owned('f08',edition)]})).scoreRange).toEqual({minimum,maximum});
  });

  it('keeps addition and multiplication in actual equipped order in both endpoints',()=>{
    // Left F08(poly), right A09: M1→1.5→2.5. Reverse: M1→2→3.
    expect(preview(request({jokers:[owned('f08','polychrome'),owned('a09')]})).scoreRange)
      .toEqual({minimum:'55',maximum:'280'});
    expect(preview(request({jokers:[owned('a09'),owned('f08','polychrome')]})).scoreRange)
      .toEqual({minimum:'66',maximum:'336'});
  });

  it('covers independent lucky and F08 branches while preserving the rule cursor',()=>{
    const input=request({hand:[{...two,enhancement:'lucky-paper'}]});
    // Minimum H22 M1; maximum (H22+90)*(M1+4)=560. Coin chance never changes H/M.
    expect(preview(input).scoreRange).toEqual({minimum:'22',maximum:'560'});
    expect(input.rng).toEqual({algorithm:'fnv1a-mulberry32-v1',state:1});
    expect(preview(input).randomEffects.map(effect=>effect.kind)).toEqual(['lucky-paper','joker-heat']);
  });

  it('combines public wager bounds with the later Joker edition',()=>{
    // Minimum H22*(0.75+2)=60 floor; maximum H112*(2+2)=448.
    expect(preview(request({characterId:'touye',wager:true,jokers:[owned('f08','holographic')]})).scoreRange)
      .toEqual({minimum:'60',maximum:'448'});
  });

  it('compares F10 against a large exact target and excludes its exact quarter',()=>{
    const target='40000000000000000000000000000000000000000';
    const quarter='10000000000000000000000000000000000000000';
    const below='9999999999999999999999999999999999999999';
    const input=request({jokers:[owned('f10')],stageTargetHeat:target,stageHeatBefore:below} as Partial<ScoreInput>);
    expect(preview(input).possibleScores).toEqual(['33']);
    expect(preview({...input,stageHeatBefore:quarter} as ScoreInput).possibleScores).toEqual(['22']);
  });

  it('rejects target-dependent equipment without paired valid stage context',()=>{
    for(const definitionId of ['f10','f11']) {
      expect(()=>preview(request({jokers:[owned(definitionId)]}))).toThrow(/stage.*context/);
    }
    for(const context of [
      {stageHeatBefore:'0'}, {stageTargetHeat:'400'},
      {stageHeatBefore:'0',stageTargetHeat:'0'}, {stageHeatBefore:'00',stageTargetHeat:'400'},
      {stageHeatBefore:'-1',stageTargetHeat:'400'},
    ])expect(()=>preview(request({jokers:[],...context} as Partial<ScoreInput>))).toThrow(/stage.*context/);
  });
});
