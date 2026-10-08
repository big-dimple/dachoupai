import * as scoring from '../src/domain/scoreR2';
import {afterEach,expect,it,vi} from 'vitest';
import type {PlayingCard,Rank,Suit} from '../src/cards/types';
import {R2_JOKERS} from '../src/content/r2Schema';
import {r2CreateJoker} from '../src/domain/r2Run';
import {SeededRng} from '../src/core/SeededRng';
import {aiHandKey,rankAiHandCandidates,nextAiHand,AiHandCandidateCache,type AiHandInput} from '../src/game/AiHandCandidates';
const card=(id:string,rank:Rank,suit:Suit='spades'):PlayingCard=>({id,rank,suit});
const input=(hand:PlayingCard[]):AiHandInput=>({hand,jokers:[],definitions:R2_JOKERS,disabledIds:[],ordinaryPointsSuppressedIds:[],boss:null,stageIndex:0,sealedJokerIds:[],challengeDisabledJokerId:null,resources:{gold:3,handsLeft:4,playIndex:0,discardsUsed:0,stageHeat:'0',target:'600'},contentVersion:'test',score:{characterId:'neutral',amoScoreTiming:'after-joker',handLevels:{},previousHandType:null,wager:false,jokerSlots:5,previousHandScore:null}});
const hand=()=>[card('a',14),card('b',14,'hearts'),card('q',12,'hearts'),card('j',11,'hearts'),card('10',10,'hearts'),card('9',9),card('8',8),card('3',3,'hearts')];
afterEach(()=>vi.restoreAllMocks());
it('non-high-card hands start strongest, changed levels reorder flush/straight/pair, high-card stays last',()=>{
 const s=input(hand());expect(rankAiHandCandidates(s).ordered.map(f=>f.type)).toEqual(['flush','straight','pair','high-card']);
 s.score.handLevels={pair:30};expect(rankAiHandCandidates(s).ordered.map(f=>f.type)).toEqual(['pair','flush','straight','high-card']);
});
it('a visible straight bonus can outrank flush, rather than reverse the hand-type catalog',()=>{
 const s=input(hand());s.jokers=[r2CreateJoker('c04','bonus',0)];expect(rankAiHandCandidates(s).ordered[0].type).toBe('straight');
});
it.each(['before-joker','after-joker'] as const)('old/new Amo %s never promotes a richer high-card over a legal pair',timing=>{
 const s=input([card('a',14),card('b',2),card('c',2,'hearts')]);s.score.characterId='amo';s.score.amoScoreTiming=timing;s.jokers=[r2CreateJoker('a03','single',0),r2CreateJoker('a06','single-mult',0)];expect(rankAiHandCandidates(s).ordered.map(f=>f.type)).toEqual(['pair','high-card']);
});
it('examines every combo and picks the enhanced member of same-rank clone alternatives',()=>{
 const s=input([card('plain',8),{...card('glass',8),enhancement:'glass-paper'},card('heart',8,'hearts')]);
 expect(rankAiHandCandidates(s).ordered.find(f=>f.type==='pair')?.playedIds).toEqual(['plain','glass']);
});
it('random enhancements use public low branches, never read/restore/advance private RNG or future piles',()=>{
 const s=input([card('a',14),{...card('lucky',14,'hearts'),enhancement:'lucky-paper'},card('b',2)]),before=structuredClone(s);
 Object.defineProperties(s,{rng:{enumerable:true,get(){throw Error('PRIVATE RNG');}},drawPile:{enumerable:true,get(){throw Error('FUTURE PILE');}}});vi.spyOn(SeededRng,'restore').mockImplementation(()=>{throw Error('RNG restore');});vi.spyOn(SeededRng.prototype,'next').mockImplementation(()=>{throw Error('RNG next');});
 const result=rankAiHandCandidates(s);expect(result.status).toBe('ready');expect(result.ordered[0].playedIds).toEqual(['a','lucky']);expect(s.hand).toEqual(before.hand);expect(s.jokers).toEqual(before.jokers);for(const f of result.ordered)for(const key of ['score','scoreRange','events','rng','finalScore'])expect(f).not.toHaveProperty(key);
});
it('no non-high-card is a true fallback; score ties choose fewer played cards then seat order',()=>{
 const s=input([card('first',8),card('second',8,'hearts'),card('third',8,'clubs'),card('spare',2)]);expect(rankAiHandCandidates(s).ordered.find(f=>f.type==='pair')?.playedIds).toEqual(['first','second']);
 const lone=rankAiHandCandidates(input([card('2',2),card('a',14,'hearts')]));expect(lone.ordered).toHaveLength(1);expect(lone.ordered[0].playedIds).toEqual(['a']);
});
it('ranking identity includes saved character timing, levels, wager, previous score and public resources',()=>{
 const s=input(hand()),key=aiHandKey(s);for(const change of [(x:AiHandInput)=>x.score.handLevels.pair=30,(x:AiHandInput)=>x.score.amoScoreTiming='before-joker',(x:AiHandInput)=>x.score.previousHandScore='123',(x:AiHandInput)=>x.resources.gold=99]){const changed=structuredClone(s);change(changed);expect(aiHandKey(changed)).not.toBe(key);}
});
it('first AI tap ignores manual type, follows descending picks, wraps and rejects stale results',()=>{
 const s=input(hand()),result=rankAiHandCandidates(s),first=nextAiHand(result,result.key,['a','b'])!;
 expect(first.facts.type).toBe('flush');const second=nextAiHand(result,result.key,first.facts.playedIds,first.cursor)!;expect(second.facts.type).toBe('straight');
 const third=nextAiHand(result,result.key,second.facts.playedIds,second.cursor)!,last=nextAiHand(result,result.key,third.facts.playedIds,third.cursor)!;expect(last.facts.type).toBe('high-card');expect(nextAiHand(result,result.key,last.facts.playedIds,last.cursor)?.facts.type).toBe('flush');expect(nextAiHand(result,'stale',[],first.cursor)).toBeUndefined();
});
it('new key cancels old idle work and disposal cannot publish a stale selection',async()=>{
 vi.useFakeTimers();try{const cache=new AiHandCandidateCache(),called=vi.fn(),s=input(hand());cache.update(s,called);s.score.handLevels.pair=30;cache.update(s,called);await vi.runAllTimersAsync();expect(called).toHaveBeenCalledTimes(1);expect(cache.result?.ordered[0].type).toBe('pair');cache.update({...s,resources:{...s.resources,gold:9}},called);cache.dispose();await vi.runAllTimersAsync();expect(called).toHaveBeenCalledTimes(1);}finally{vi.useRealTimers();}
});

it('current xiemu AI compares holding money without restoring the old free last-hand x2',()=>{
 const s=input(hand());s.resources.handsLeft=1;s.score.characterId='xiemu';s.score.xiemuBurn={cost:0,goldBefore:s.resources.gold,beforeUsed:false};const before=structuredClone(s),real=scoring.previewR2Hand;
 const spy=vi.spyOn(scoring,'previewR2Hand').mockImplementation(request=>{const t=scoring.scoreR2Hand({...request,rng:new SeededRng('xiemu-ai-check').snapshot()});expect(t.events.some(e=>e.sourceType==='character')).toBe(false);return real(request);});
 expect(rankAiHandCandidates(s).status).toBe('ready');expect(spy).toHaveBeenCalled();expect(s).toEqual(before);const key=aiHandKey(s);s.score.xiemuBurn.beforeUsed=true;expect(aiHandKey(s)).not.toBe(key);
});
it('new laohuan ranking removes old guaranteed120 and keeps the old identity comparison separate',()=>{
 const s=input([card('a1',14,'clubs'),card('a2',14,'hearts'),card('a3',14,'spades'),card('k1',13,'diamonds'),card('k2',13,'spades'),card('q',12,'clubs'),card('j',11,'diamonds'),card('10',10,'hearts')]);s.score.characterId='laohuan';
 expect(rankAiHandCandidates(s).ordered[0].type).toBe('straight');const oldKey=aiHandKey(s);s.score.laohuanTrick=true;expect(aiHandKey(s)).not.toBe(oldKey);expect(rankAiHandCandidates(s).ordered[0].type).toBe('full-house');
});
