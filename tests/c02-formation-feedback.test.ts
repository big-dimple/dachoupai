import {describe,expect,it} from 'vitest';
import type {PlayingCard,Rank,Suit} from '../src/cards/types';
import {scoreR2Hand} from '../src/domain/scoreR2';
import {r2CreateJoker} from '../src/domain/r2Run';
import {R2_JOKERS} from '../src/content/r2Schema';
import {fourCardFormation} from '../src/game/scorePresentation';

function trace(ranks:Rank[],suits:Suit[],equipped:string[]) {
  const hand:PlayingCard[]=ranks.map((rank,index)=>({id:'card/'+index,rank,suit:suits[index],edition:'none'}));
  return scoreR2Hand({rulesVersion:'r2',runId:'formation',rootId:'formation/hand',characterId:'neutral',hand,
    selectedIds:hand.map(card=>card.id),disabledIds:[],definitions:R2_JOKERS,
    jokers:equipped.map(id=>r2CreateJoker(id,'formation/'+id,6,'none')),
    handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,
    rng:{algorithm:'fnv1a-mulberry32-v1',state:0}});
}

describe('C02 four-card formation has the actual enabling source',()=>{
  it('highlights C09 for four-card flush and preserves the committed result',()=>{
    const score=trace([2,4,7,10],['hearts','hearts','hearts','hearts'],['c09']),before=structuredClone(score);
    expect(score.handType).toBe('flush');
    expect(fourCardFormation(score)).toEqual({instanceId:'formation/c09',definitionId:'c09',handType:'flush'});
    expect(score).toEqual(before);
  });
  it('C08+C09 uses the chosen ordinary flush source, with no invented four-card straight-flush',()=>{
    const score=trace([2,3,4,5],['hearts','hearts','hearts','hearts'],['c08','c09']);
    expect(score.handType).toBe('flush');
    expect(fourCardFormation(score)).toEqual({instanceId:'formation/c09',definitionId:'c09',handType:'flush'});
    const straight=trace([2,3,4,5],['hearts','clubs','spades','diamonds'],['c08','c09']);
    expect(straight.handType).toBe('straight');
    expect(fourCardFormation(straight)).toEqual({instanceId:'formation/c08',definitionId:'c08',handType:'straight'});
  });
  it('does not celebrate a modifier that did not form the hand',()=>{
    const pair=trace([2,2,7,10],['hearts','clubs','spades','diamonds'],['c08','c09']);
    expect(fourCardFormation(pair)).toBeUndefined();
    const fullFlush=trace([2,4,7,10,14],['hearts','hearts','hearts','hearts','hearts'],['c09']);
    expect(fullFlush.handType).toBe('flush');
    expect(fourCardFormation(fullFlush)).toBeUndefined();
  });
});
