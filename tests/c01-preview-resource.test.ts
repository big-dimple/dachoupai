import {expect,it} from 'vitest';
import {previewR2Hand,scoreR2Hand,type ScoreInput} from '../src/domain/scoreR2';
import {R2_JOKERS} from '../src/content/r2Schema';

it('previews lucky score bounds for a valid no-gold-hit hand even when a hypothetical gold grant would overflow',()=>{
  const input:ScoreInput={rulesVersion:'r2',runId:'preview-boundary',rootId:'preview-boundary/hand',characterId:'neutral',
    hand:[{id:'two',rank:2,suit:'spades',enhancement:'lucky-paper'}],selectedIds:['two'],disabledIds:[],
    jokers:[],definitions:R2_JOKERS,handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,
    gold:Number.MAX_SAFE_INTEGER,rng:{algorithm:'fnv1a-mulberry32-v1',state:2982539781}};
  const before=structuredClone(input),actual=scoreR2Hand(input);
  expect(actual.finalScore).toBe('22');expect(actual.goldDelta).toBe(0);
  const {rng:_rng,...publicInput}=input;
  expect(previewR2Hand(publicInput).scoreRange).toEqual({minimum:'22',maximum:'110'});
  expect(input).toEqual(before);
});
