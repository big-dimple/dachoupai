import{layout,intersects}from'../src/game/layout';
import {expect,it} from 'vitest';
import type {PlayingCard,Rank,Suit} from '../src/cards/types';
import {R2_JOKERS} from '../src/content/r2Schema';
import {r2CreateJoker} from '../src/domain/r2Run';
import {r2SelectionFacts,type R2SelectionInput} from '../src/domain/r2SelectionFacts';
import {scoreR2Hand,r2ScoringDisabledJokerIds} from '../src/domain/scoreR2';
import {R2_OFFER_USE} from '../src/game/r2Help';
import {selectionCopy,fitConditionEntry,selectionCandidateEntryBox} from '../src/game/SelectionCopy';
const card=(id:string,rank:Rank,suit:Suit='spades'):PlayingCard=>({id,rank,suit});
const input=(hand:PlayingCard[],extra:Partial<R2SelectionInput>={}):R2SelectionInput=>({hand,selectedIds:hand.map(c=>c.id),disabledIds:[],jokers:[],definitions:R2_JOKERS,...extra});
it('three-kind with 3/4/5 cards excludes accompanying cards; full selection can become house or four-kind',()=>{
 const core=[card('a',7),card('b',7,'hearts'),card('c',7,'clubs')];
 for(const extra of [[],[card('d',2)],[card('d',2),card('e',4)]]){const f=r2SelectionFacts(input([...core,...extra]));expect(f.type).toBe('three-kind');expect(f.scoringIds).toEqual(['a','b','c']);expect(f.accompanyingIds).toEqual(extra.map(c=>c.id));}
 expect(r2SelectionFacts(input([...core,card('d',2),card('e',2,'hearts')])).type).toBe('full-house');
 expect(r2SelectionFacts(input([...core,card('d',7,'diamonds'),card('e',2)])).type).toBe('four-kind');
});
it('complete held rules survive scoring-hook bans; both modifiers never create a four-card straight-flush',()=>{
 const hand=[card('a',8),card('b',9),card('c',10),card('d',11)],jokers=['c08','c09'].map(id=>r2CreateJoker(id,id,0));
 const banned=r2ScoringDisabledJokerIds({definitionId:'B16',disabledSuit:null},jokers,R2_JOKERS);expect(banned).toContain('c09');
 const f=r2SelectionFacts(input(hand,{jokers}));expect(f.type).toBe('flush');expect(f.ruleSources.find(s=>s.definitionId==='c09')?.used).toBe(true);expect(f.ruleSources.find(s=>s.definitionId==='c08')?.used).toBe(false);
 expect(r2SelectionFacts(input(hand,{jokers:[jokers[0]]})).type).toBe('straight');expect(r2SelectionFacts(input(hand)).type).toBe('high-card');
});
it('Boss-disabled still forms the hand; ordinary-zero stays active and is not disability',()=>{
 const hand=[card('a',8),card('b',9),card('c',10),card('d',11),card('e',12)],f=r2SelectionFacts(input(hand,{disabledIds:['a'],ordinaryPointsSuppressedIds:['d','e']}));
 expect(f.type).toBe('straight-flush');expect(f.scoringIds).toEqual(hand.map(c=>c.id));expect(f.activeScoringIds).toEqual(['b','c','d','e']);expect(f.disabledIds).toEqual(['a']);expect(f.ordinaryPointsSuppressedIds).toEqual(['d','e']);
});
it('facts preserve hand order, match real scorer sets, do not mutate inputs or expose forecast data',()=>{
 const hand=[card('a',8),card('b',9),card('c',10),card('d',11),card('e',12),card('held',2,'hearts')],i=input(hand,{selectedIds:['e','c','a','b','d'],ordinaryPointsSuppressedIds:['d','e']}),before=structuredClone(i);
 const f=r2SelectionFacts(i),rng={algorithm:'fnv1a-mulberry32-v1' as const,state:123};
 const trace=scoreR2Hand({...i,rulesVersion:'r2',runId:'facts',rootId:'facts/1',characterId:'neutral',handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng});
 expect(f.type).toBe(trace.handType);for(const k of ['playedIds','scoringIds','activeScoringIds','heldIds'] as const)expect(f[k]).toEqual(trace.sets[k]);expect(i).toEqual(before);expect(rng.state).toBe(123);
 for(const key of ['rng','scoreRange','accumulator','events','finalScore','base','breakdown'])expect(f).not.toHaveProperty(key);
});
it('all72 have an existing short condition entry rather than a five-sample fallback',()=>{expect(R2_JOKERS).toHaveLength(72);for(const d of R2_JOKERS)expect(R2_OFFER_USE[d.id]?.trim().length).toBeGreaterThan(0);});
it('player copy separates disabled scoring from ordinary-zero, without engineering counters',()=>{
 const hand=[card('a',8),card('b',9),card('c',10),card('d',11),card('e',12)];
 const plain=selectionCopy(r2SelectionFacts(input(hand)));expect(plain.membership).toBe('计分牌5张 · 附带0张');expect(plain.restrictions).toEqual([]);
 const limited=selectionCopy(r2SelectionFacts(input(hand,{disabledIds:['a'],ordinaryPointsSuppressedIds:['d','e']})));expect(limited.membership).toBe(plain.membership);expect(limited.restrictions).toEqual(['其中1张计分停用（仍参与判型）','普通点数0：2张，其他效果保留']);
});
it('condition overflow gives a whole entry instead of cutting objects or negations',()=>{
 for(const text of [...Object.values(R2_OFFER_USE),'本场未弃牌才增倍','同花顺仍需5张']){const label=fitConditionEntry(text,t=>t.length<=4);expect(label===text||label==='条件 ›'||label==='条件').toBe(true);expect(label).not.toContain('…');}
 expect(fitConditionEntry('4张顺子',s=>s.length<=4)).toBe('4张顺子');expect(fitConditionEntry('4张同花',s=>s.length<=4)).toBe('4张同花');
});
it('four-card rules merge with public rules and disappear with the held source; ace never wraps',()=>{
 const hand=[card('a',14),card('b',2,'hearts'),card('c',3),card('d',4)],joker=r2CreateJoker('c08','four-source',0);
 expect(r2SelectionFacts(input(hand,{jokers:[joker]})).type).toBe('straight');
 expect(r2SelectionFacts(input(hand)).type).toBe('high-card');
 expect(r2SelectionFacts(input(hand,{handRules:{fourStraight:true},jokers:[r2CreateJoker('c09','flush-source',0)]})).rules).toEqual({fourStraight:true,fourFlush:true});
 expect(r2SelectionFacts(input([card('q',12),card('k',13),card('a',14),card('2',2)],{jokers:[joker]})).type).toBe('high-card');
});
it('selection validation rejects empty, duplicate and foreign instances without mutation',()=>{
 const hand=[card('a',8),card('b',9)],before=structuredClone(hand);
 for(const ids of [[],['a','a'],['foreign']])expect(()=>r2SelectionFacts(input(hand,{selectedIds:ids}))).toThrow('invalid-selection');
 expect(()=>r2SelectionFacts(input([hand[0],hand[0]]))).toThrow();expect(hand).toEqual(before);
});

it('disabled safe accompanying cards remain played/triple while their scoring effects are identified separately',()=>{
 const hand=[card('a',7,'spades'),card('b',7,'clubs'),card('c',7,'diamonds'),card('d',2,'hearts'),card('e',4,'spades')];
 for(const size of[4,5]){const f=r2SelectionFacts(input(hand,{selectedIds:hand.slice(0,size).map(c=>c.id),disabledIds:['d']})),copy=selectionCopy(f);expect(f.type).toBe('three-kind');expect(f.activeScoringIds).toEqual(['a','b','c']);expect(f.playedIds).toContain('d');expect(copy.disabledAccompanyingIds).toEqual(['d']);expect(copy.accompanyingNote).toContain('本场计分效果停用');expect(copy.accompanyingNote).toContain('重复条件');expect(copy.restrictions.join('')).not.toContain('计分停用');}
});

it('short panels provide a visible-entry seat at least44px without entering hands/actions',()=>{for(const bottom of[0,12,34]){const l=layout({width:844,height:300},{top:12,bottom,left:0,right:0},undefined,{count:9}),b=selectionCandidateEntryBox(l.scoreBoard)!;expect(b.height).toBeGreaterThanOrEqual(44);expect(b.width).toBeGreaterThanOrEqual(44);expect(b.y+b.height).toBeLessThanOrEqual(l.scoreBoard.y+l.scoreBoard.height);for(const area of[l.hand,...Object.values(l.tableActions)])expect(intersects(b,area)).toBe(false);}});
