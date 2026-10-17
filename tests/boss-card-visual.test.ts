import {describe,it,expect} from 'vitest';
import {R2_JOKERS,type R2JokerInstance} from '../src/content/r2Schema';
import {bossCardPressure,bossJokerPressure,type BossPressureContext} from '../src/game/BossPressure';
import {r2DisabledCards,r2OrdinarySuppression} from '../src/domain/r2Chapter';
import {scoreR2Hand} from '../src/domain/scoreR2';
import type {PlayingCard} from '../src/cards/types';

const hand:PlayingCard[]=[{id:'j1',rank:11,suit:'hearts',enhancement:'heat-paper'},{id:'j2',rank:11,suit:'clubs'},{id:'j3',rank:11,suit:'spades'},{id:'j4',rank:11,suit:'diamonds'},{id:'ace',rank:14,suit:'hearts'}];
const owned=(definitionId:string):R2JokerInstance=>({instanceId:'owned/'+definitionId,definitionId,paidPrice:4,growth:{}});
const input=(definitionId:NonNullable<BossPressureContext['boss']>['definitionId']):BossPressureContext=>({boss:{definitionId,disabledSuit:definitionId==='B03'?'hearts':null},stageIndex:2,hand,selectedIds:hand.map(c=>c.id),jokers:[owned('e02'),owned('b10')],definitions:R2_JOKERS,sealedJokerIds:[]});
const score=(c:BossPressureContext)=>scoreR2Hand({rulesVersion:'r2',runId:'pressure',rootId:'pressure/hand',characterId:'neutral',hand:c.hand,selectedIds:c.selectedIds,disabledIds:r2DisabledCards(c.boss!,c.stageIndex,c.hand),ordinaryPointsSuppressedIds:r2OrdinarySuppression(c.boss!,c.stageIndex,c.hand,c.selectedIds),boss:c.boss,jokers:c.jokers,definitions:c.definitions,sealedJokerIds:c.sealedJokerIds,handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:{algorithm:'fnv1a-mulberry32-v1',state:0}});

describe('Boss presentation agrees with the real scorer',()=>{
  it('B04 J/Q/K still make four-kind; A is clear and disabled enhancement never scores',()=>{
    const c=input('B04'),trace=score(c);expect(trace.handType).toBe('four-kind');expect(trace.sets.scoringIds).toEqual(['j1','j2','j3','j4']);expect(trace.sets.activeScoringIds).toEqual([]);
    expect(trace.events.some(e=>e.reasonKey.startsWith('enhancement.'))).toBe(false);expect(bossCardPressure(c,'j1')).toMatchObject({kind:'scoring',label:'计分失效'});expect(bossCardPressure(c,'j1')!.detail).toContain('仍可选中、打出和组成牌型');expect(bossCardPressure(c,'ace')).toBeUndefined();
    const faces={...c,hand:[{id:'q',rank:12,suit:'spades'},{id:'k',rank:13,suit:'clubs'}] as PlayingCard[]};expect(bossCardPressure(faces,'q')).toBeDefined();expect(bossCardPressure(faces,'k')).toBeDefined();
  });
  it('B03 only affects its published suit and no chapter rule leaks into normal stages',()=>{
    const c=input('B03');expect(bossCardPressure(c,'j1')).toBeDefined();expect(bossCardPressure(c,'j2')).toBeUndefined();expect(score(c).sets.activeScoringIds).toEqual(['j2','j3','j4']);
    expect(bossCardPressure({...c,stageIndex:1},'j1')).toBeUndefined();expect(bossJokerPressure({...input('B06'),stageIndex:1},'owned/b10')).toBeUndefined();
  });
  it('B02 fourth card loses ordinary points only, keeping its enhancement and active membership',()=>{
    const c=input('B02');c.hand=c.hand.map(card=>card.id==='j4'?{...card,enhancement:'heat-paper'}:card);const trace=score(c);
    expect(trace.sets.activeScoringIds).toContain('j4');expect(trace.events.some(e=>e.targetCardId==='j4'&&e.reasonKey==='enhancement.heat-paper.add-heat')).toBe(true);
    expect(bossCardPressure(c,'j4')).toMatchObject({kind:'ordinary-points',label:'点数归零'});expect(bossCardPressure(c,'j4')!.detail).toContain('增强、版次');expect(bossCardPressure(c,'j1')).toBeUndefined();
  });
  it('B06 follows current slots, B15 follows instances, and scoring bans retain real afterHand growth',()=>{
    const c=input('B06');c.selectedIds=['j1','j2'];const trace=score(c);expect(bossJokerPressure(c,'owned/b10')).toBeDefined();expect(trace.events.filter(e=>e.sourceDefinitionId==='b10').map(e=>e.phase)).toEqual(['afterHand']);
    const reordered={...c,jokers:[...c.jokers].reverse()};expect(bossJokerPressure(reordered,'owned/b10')).toBeUndefined();
    const sealed={...reordered,boss:{definitionId:'B15' as const,disabledSuit:null},sealedJokerIds:['owned/b10']};expect(bossJokerPressure(sealed,'owned/b10')!.detail).toContain('调序不恢复');
  });
  it('B16 consumes catalog rarity, leaving common and uncommon clear',()=>{
    const c=input('B16');c.jokers=R2_JOKERS.filter(d=>['common','uncommon','rare'].includes(d.rarity)).filter((d,i,all)=>all.findIndex(x=>x.rarity===d.rarity)===i).map(d=>owned(d.id));
    for(const j of c.jokers)expect(!!bossJokerPressure(c,j.instanceId)).toBe(R2_JOKERS.find(d=>d.id===j.definitionId)!.rarity==='rare');
  });
});
