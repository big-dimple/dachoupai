import {describe,expect,it} from 'vitest';
import {createDeck} from '../src/cards/deck';
import type {R2BossPlan} from '../src/domain/r2Chapter';
import {stageNotice,type StageNoticeInput} from '../src/game/stageNotice';

const ids=['hearts-11','hearts-14','clubs-12','diamonds-13','spades-2'];
function fixture(index:number,boss:R2BossPlan={definitionId:'B04',disabledSuit:null}):StageNoticeInput {
  return {phase:'await-input',stageIndex:index,boss,deckInstances:createDeck(),handOrder:[...ids],stage:{
    index,targetHeat:'400',heat:'0',handsLeft:4,discardsLeft:3,playIndex:0,previousHandType:null,clearId:null,goldEarned:0,disabledIds:[],
    wagerSelected:false,wagerUsed:false,discardsUsed:0,skipResult:null,handLimit:8,previousHandScore:null,rescueUsed:false,
  }};
}

describe('P05 entered-stage notice',()=>{
  it.each([0,1,3,4])('does not apply the chapter face/suit forecast in ordinary stage %i',index=>{
    for(const boss of [{definitionId:'B03',disabledSuit:'hearts'},{definitionId:'B04',disabledSuit:null}] as const){
      const notice=stageNotice(fixture(index,boss),ids)!;
      expect(notice.warning).toBe(false);expect(notice.disabledCardIds).toEqual([]);expect(notice.ordinarySuppressedIds).toEqual([]);expect(notice.discardCost).toBe(1);
    }
  });
  it('uses the actual stage index instead of the next-stage pointer',()=>{
    const run=fixture(1);run.stageIndex=2;
    expect(stageNotice(run)!.stageIndex).toBe(1);expect(stageNotice(run)!.warning).toBe(false);
  });
  it('marks J/Q/K in the entered face boss and leaves A active',()=>{
    const notice=stageNotice(fixture(2))!;
    expect(notice.warning).toBe(true);expect(notice.symbol).toBe('JQK');expect(notice.disabledCardIds).toEqual(['hearts-11','clubs-12','diamonds-13']);
    expect(notice.description).toContain('A正常');expect(notice.ordinarySuppressedIds).toEqual([]);
  });
  it('marks only the locked suit and keeps the still-forming hand explanation',()=>{
    const notice=stageNotice(fixture(5,{definitionId:'B03',disabledSuit:'hearts'}))!;
    expect(notice.symbol).toBe('♥');expect(notice.disabledCardIds).toEqual(['hearts-11','hearts-14']);expect(notice.description).toContain('仍参与牌型');
  });
  it('distinguishes ordinary-point suppression from disabled cards and uses hand order',()=>{
    const notice=stageNotice(fixture(2,{definitionId:'B02',disabledSuit:null}),[...ids].reverse())!;
    expect(notice.symbol).toBe('4/5');expect(notice.disabledCardIds).toEqual([]);expect(notice.ordinarySuppressedIds).toEqual(['diamonds-13','spades-2']);
  });
  it('stops the double-discard warning after the first actual play',()=>{
    const run=fixture(2,{definitionId:'B01',disabledSuit:null});
    expect(stageNotice(run)!.discardCost).toBe(2);expect(stageNotice(run)!.warning).toBe(true);
    run.stage!.playIndex=1;run.stage!.handsLeft=3;
    expect(stageNotice(run)!.discardCost).toBe(1);expect(stageNotice(run)!.warning).toBe(false);expect(stageNotice(run)!.title).toContain('耗1次');
  });
  it('does not reuse the previous stage as a live restriction in shop or intermission',()=>{
    const run=fixture(2);
    for(const phase of ['shop','stage-ready','stage-cleared','run-lost','run-won'] as const)expect(stageNotice({...run,phase})).toBeUndefined();
    expect(stageNotice({...run,stage:null})).toBeUndefined();
  });
  it('does not change state, card order or selected IDs while producing the notice',()=>{
    const run=fixture(2,{definitionId:'B02',disabledSuit:null}),selected=[...ids].reverse(),before=JSON.stringify({run,selected});
    stageNotice(run,selected);expect(JSON.stringify({run,selected})).toBe(before);
  });
});
