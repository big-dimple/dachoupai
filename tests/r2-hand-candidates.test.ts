import{expect,it,vi}from'vitest';
import type{PlayingCard,Rank,Suit}from'../src/cards/types';
import{R2_JOKERS}from'../src/content/r2Schema';import{r2CreateJoker}from'../src/domain/r2Run';
import{r2ScoringDisabledJokerIds}from'../src/domain/scoreR2';import{R2_HAND_TYPES,evaluateR2Hand}from'../src/domain/evaluateR2';
import{enumerateR2HandCandidates,r2CandidateKey,r2HandRevision,R2HandCandidateCache,type R2CandidateInput}from'../src/domain/r2HandCandidates';
const card=(id:string,rank:Rank,suit:Suit='spades'):PlayingCard=>({id,rank,suit});
const input=(hand:PlayingCard[],extra:Partial<R2CandidateInput>={}):R2CandidateInput=>({hand,jokers:[],definitions:R2_JOKERS,disabledIds:[],ordinaryPointsSuppressedIds:[],boss:null,stageIndex:0,sealedJokerIds:[],challengeDisabledJokerId:null,resources:{gold:3,handsLeft:4,playIndex:0,discardsUsed:0,stageHeat:'0',target:'600'},contentVersion:'test',...extra});
it('visible QJ1098 straight coexists with actual pair/flush; fixed catalog order and unique-type examples',()=>{
 const hand=[card('as',14),card('ah',14,'hearts'),card('q',12,'hearts'),card('j',11,'hearts'),card('10',10,'hearts'),card('9',9),card('8',8),card('3',3,'hearts')],result=enumerateR2HandCandidates(input(hand));
 expect(result.status).toBe('ready');for(const type of['pair','flush','straight'])expect(result.groups.some(g=>g.type===type)).toBe(true);
 expect(result.groups.map(g=>g.type)).toEqual(R2_HAND_TYPES.filter(t=>result.groups.some(g=>g.type===t)));
 for(const group of result.groups){expect(group.examples.length).toBeLessThanOrEqual(5);expect(group.examples.map(e=>e.playedIds.length)).toEqual(group.playedCounts);for(const example of group.examples)expect(evaluateR2Hand(hand.filter(c=>example.playedIds.includes(c.id)),example.rules).type).toBe(group.type);}
 expect(result.groups[0].examples[0].playedIds).toEqual(['as']); // seat order, not predicted points
});
it.each([2,7,13] as Rank[])('actual triple %s supports real3/4/5 variants, house/four-kind not assigned to triple',rank=>{
 const hand=[card('a',rank),card('b',rank,'hearts'),card('c',rank,'clubs'),card('d',rank===2?3:2),card('e',rank===2?4:4,'hearts')];
 expect(enumerateR2HandCandidates(input(hand)).groups.find(g=>g.type==='three-kind')?.playedCounts).toEqual([3,4,5]);
 const house=[...hand.slice(0,3),card('d',rank===2?3:2),card('e',rank===2?3:2,'hearts')];expect(evaluateR2Hand(house,{}).type).toBe('full-house');
 expect(evaluateR2Hand([...hand.slice(0,3),card('d',rank,'diamonds'),hand[4]],{}).type).toBe('four-kind');
});
it.each(R2_HAND_TYPES)('directory includes clone-safe actual %s without52-deck assumptions',type=>{
 const ranks:Record<string,Rank[]>={'high-card':[14],pair:[8,8],'two-pair':[8,8,4,4],'three-kind':[7,7,7],straight:[2,3,4,5,6],flush:[2,4,6,8,10],'full-house':[7,7,7,4,4],'four-kind':[7,7,7,7],'straight-flush':[9,10,11,12,13],'five-kind':[8,8,8,8,8],'flush-house':[8,8,8,2,2],'flush-five':[8,8,8,8,8]};
 const same=['flush','straight-flush','flush-house','flush-five'].includes(type),suits=['spades','hearts','clubs','diamonds'] as Suit[],hand=ranks[type].map((r,i)=>card('clone'+i,r,same?'hearts':suits[i%4]));
 expect(evaluateR2Hand(hand,{}).type).toBe(type);expect(enumerateR2HandCandidates(input(hand)).groups.find(g=>g.type===type)).toBeDefined();
});
it('four-rules use complete held inventory; A234 true QKA2 false and bothfour mean ordinary flush',()=>{
 const jokers=['c08','c09'].map(id=>r2CreateJoker(id,id,0)),hand=[card('a',14,'hearts'),card('2',2,'hearts'),card('3',3,'hearts'),card('4',4,'hearts')];
 const both=enumerateR2HandCandidates(input(hand,{jokers,boss:{definitionId:'B16',disabledSuit:null}}));expect(both.groups.find(g=>g.type==='flush')?.examples[0].ruleSources.some(s=>s.definitionId==='c09'&&s.used)).toBe(true);expect(both.groups.some(g=>g.type==='straight-flush')).toBe(false);
 expect(enumerateR2HandCandidates(input(hand,{jokers:[jokers[0]]})).groups.some(g=>g.type==='straight')).toBe(true);expect(enumerateR2HandCandidates(input(hand)).groups.some(g=>g.type==='flush')).toBe(false);
 expect(enumerateR2HandCandidates(input([card('q',12),card('k',13),card('a',14),card('2',2)],{jokers:[jokers[0]]})).groups.some(g=>g.type==='straight')).toBe(false);
});
it('Boss disabled versus B02 ordinary-zero remain independent for each subset and order',()=>{
 const hand=[card('a',2),card('b',3,'hearts'),card('c',4),card('d',5,'hearts'),card('e',6)],context=input(hand,{stageIndex:2,boss:{definitionId:'B02',disabledSuit:null},disabledIds:['a']});
 const f=enumerateR2HandCandidates(context).groups.find(g=>g.type==='straight')!.examples[0];expect(f.scoringIds).toHaveLength(5);expect(f.activeScoringIds).not.toContain('a');expect(f.ordinaryPointsSuppressedIds).toEqual(['d','e']);
});
it('14 visible instances examine3472 legal subsets without mutating input, RNG/save hooks or storing traces',()=>{
 const hand=Array.from({length:14},(_,i)=>card('c'+i,(2+i%13)as Rank,(['spades','hearts','clubs','diamonds']as Suit[])[i%4])),context=input(hand),before=structuredClone(context);Object.freeze(context.resources);
 const result=enumerateR2HandCandidates(context);expect(result.examined).toBe(3472);expect(context).toEqual(before);expect(result.groups.length).toBeLessThanOrEqual(12);for(const g of result.groups)for(const e of g.examples)for(const field of['events','accumulator','rng','finalScore','scoreRange','possibleScores'])expect(e).not.toHaveProperty(field);
});
it('invalid/unknown/over14 fallback contains no fake directory',()=>{for(const hand of[[],[card('x',2),card('x',3)],Array.from({length:15},(_,i)=>card('c'+i,2)),[{id:'bad',rank:99,suit:'hearts'}]as unknown as PlayingCard[]]){const r=enumerateR2HandCandidates(input(hand));expect(r.status).toBe('unsupported');expect(r.groups).toEqual([]);}});
it('cache revision covers public card/edition/enhancement/order/rules/bans/resources/content; undo survives order only',()=>{
 const base=input([card('a',2),card('b',3)]),key=r2CandidateKey(base);for(const variant of[{...base,hand:[...base.hand].reverse()},{...base,hand:[{...base.hand[0],edition:'foil' as const},base.hand[1]]},{...base,hand:[{...base.hand[0],enhancement:'glass-paper' as const},base.hand[1]]},{...base,jokers:[r2CreateJoker('c08','c08',0)]},{...base,disabledIds:['a']},{...base,sealedJokerIds:['x']},{...base,resources:{...base.resources,gold:4}},{...base,contentVersion:'new'}])expect(r2CandidateKey(variant)).not.toBe(key);
 expect(r2HandRevision({...base,hand:[...base.hand].reverse()})).toBe(r2HandRevision(base));
});
it('idle cache cancels old generations/disposal, same hand toggles reuse result without blocking synchronous facts',async()=>{
 vi.useFakeTimers();try{const cache=new R2HandCandidateCache(),old=vi.fn(),current=vi.fn(),a=input(Array.from({length:14},(_,i)=>card('c'+i,(2+i%13)as Rank))),b=input([card('a',2)]);expect(cache.update(a,old).status).toBe('working');cache.update(b,current);await vi.runAllTimersAsync();expect(old).not.toHaveBeenCalled();expect(current).toHaveBeenCalledTimes(1);const done=cache.result;expect(cache.update(b,current)).toBe(done);await vi.runAllTimersAsync();expect(current).toHaveBeenCalledTimes(1);cache.update(a,old);cache.dispose();await vi.runAllTimersAsync();expect(old).not.toHaveBeenCalled();expect(cache.result).toBeUndefined();}finally{vi.useRealTimers();}
});

it.each(['B06','B15','B16','challenge'])('full heldfour-rule source survives %s scoring adapter; sale actually removes rule',kind=>{const jokers=['pengci','c08','a03','c09'].map(id=>r2CreateJoker(id,id,0)),boss=kind==='challenge'?null:{definitionId:kind as 'B06'|'B15'|'B16',disabledSuit:null},sealed=kind==='B15'?['c09']:[],challenge=kind==='challenge'?'c09':null;expect(r2ScoringDisabledJokerIds(boss,jokers,R2_JOKERS,sealed,challenge)).toContain('c09');const hand=[card('a',3,'hearts'),card('b',6,'hearts'),card('c',9,'hearts'),card('d',12,'hearts')],result=enumerateR2HandCandidates(input(hand,{jokers,boss,stageIndex:2,sealedJokerIds:sealed,challengeDisabledJokerId:challenge}));expect(result.groups.find(g=>g.type==='flush')?.examples[0].ruleSources.some(s=>s.instanceId==='c09'&&s.used)).toBe(true);expect(enumerateR2HandCandidates(input(hand,{jokers:jokers.filter(j=>j.definitionId!=='c09')})).groups.some(g=>g.type==='flush')).toBe(false);});
