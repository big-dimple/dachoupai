import {describe, expect, it} from 'vitest';
import type {PlayingCard, Rank, Suit} from '../src/cards/types';
import {SeededRng} from '../src/core/SeededRng';
import * as schema from '../src/content/r2Schema';
import {R2_JOKERS, type R2JokerInstance} from '../src/content/r2Schema';
import {evaluateR2Hand} from '../src/domain/evaluateR2';
import {previewR2Hand, scoreR2Hand, type ScoreInput} from '../src/domain/scoreR2';

const card = (id:string, rank:Rank, suit:Suit='spades'):PlayingCard => ({id, rank, suit});
const owned = (definitionId:string, extra:Partial<R2JokerInstance>={}):R2JokerInstance => ({
  instanceId:`owned/${definitionId}`, definitionId, paidPrice:4, growth:{}, ...extra,
});
const single = [card('2s', 2)];
const pair = [card('8s', 8), card('8h', 8, 'hearts')];
const triple = [...pair, card('8d', 8, 'diamonds')];
const flush = [2, 4, 6, 8, 10].map((rank, i) => card(`flush-${i}`, rank as Rank));
const secondBatch = ['a04','a06','a07','a08','b05','b06','b07','b08','c03','c05','c07','c08',
  'd02','d04','d06','d07','e02','e04','e06','e07','f04','f05','f06','f07'];
const originalBatch = ['pengci','tiesuanpan','a03','a05','mantangcai','b02','b03','b04',
  'jiedongfeng','c02','c04','c06','d01','d03','d05','d10','e01','e03','e05','e08','huimaqiang','f02','f03','f09'];
function input(hand:readonly PlayingCard[], jokers:R2JokerInstance[], extra:Partial<ScoreInput>={}):ScoreInput {
  return {rulesVersion:'r2', runId:'c00', rootId:'c00/hand', characterId:'neutral', hand,
    selectedIds:hand.map(c=>c.id), disabledIds:[], jokers, definitions:R2_JOKERS, handLevels:{},
    playIndex:1, handsBeforePlay:4, previousHandType:null, wager:false,
    rng:new SeededRng('c00-goldens').snapshot(), ...extra};
}
const score = (hand:readonly PlayingCard[], ids:string[], extra:Partial<ScoreInput>={}) =>
  scoreR2Hand(input(hand, ids.map(id=>owned(id)), extra));

describe('C00 independently calculated score and set goldens', () => {
  it('publishes only the original 24 and the exact authorized second batch', () => {
    expect(R2_JOKERS.map(d=>d.id).sort()).toEqual([...originalBatch, ...secondBatch].sort());
    expect(schema.validateR2Content(R2_JOKERS)).toEqual([]);
  });

  it.each([
    ['a06', single, {}, '33', pair, {}, '102'], // 22×3/2; a pair is outside its predicate.
    ['a08', [card('5',5)], {}, '45', [card('6',6)], {}, '26'], // 20+5+20; rank 6 misses.
    ['b05', triple, {}, '477', pair, {}, '102'], // (90+24+3×15)×3.
    ['b06', pair, {}, '134', triple, {}, '342'], // (35+2×8+2×8)×2; exact pair only.
    ['b07', pair, {}, '162', [...pair,card('k',13)], {}, '102'], // (35+16+30)×2.
    ['c03', pair, {}, '118', [card('red',8,'hearts'),card('red2',8,'diamonds')], {}, '102'],
    ['c07', flush, {}, '720', pair, {}, '102'], // (140+30+last10)×4.
    ['d04', pair, {playIndex:2}, '118', pair, {playIndex:3}, '102'], // first original 8 only.
    ['d07', pair, {}, '127', [...pair,card('k',13)], {}, '102'], // floor(51×5/2).
    ['f04', single, {gold:3}, '88', single, {gold:4}, '22'], // 22×(1+3).
  ] as const)('%s has positive, negative, deterministic and saved-input evidence',
    (id, yesHand, yesContext, yesScore, noHand, noContext, noScore) => {
      const yes=input(yesHand,[owned(id)],yesContext), before=JSON.stringify(yes);
      const trace=scoreR2Hand(yes);
      expect(trace.finalScore).toBe(yesScore);
      expect(scoreR2Hand(input(noHand,[owned(id)],noContext)).finalScore).toBe(noScore);
      expect(scoreR2Hand(JSON.parse(before))).toEqual(trace);
      expect(JSON.stringify(yes)).toBe(before);
      expect(trace.events.filter(e=>e.sourceDefinitionId===id).every(e=>e.sourceInstanceId===`owned/${id}`)).toBe(true);
      expect(trace.rng).toEqual(yes.rng);
    });

  it('A08/C03 see active scoring cards rather than low or black kickers/held cards', () => {
    const lowPair=[card('2a',2),card('2b',2,'hearts')];
    const active=score(lowPair,['a08'],{disabledIds:['2a']});
    expect(active.finalScore).toBe('114'); // (35+2+20)×2; disabled card still forms the pair.
    expect(active.events.filter(e=>e.sourceDefinitionId==='a08').map(e=>e.targetCardId)).toEqual(['2b']);
    const hand=[card('h8',8,'hearts'),card('d8',8,'diamonds'),card('2c',2,'clubs'),card('held',3)];
    const r=score(hand,['a08','c03'],{selectedIds:['h8','d8','2c']});
    expect(r.finalScore).toBe('102');
    expect(r.sets).toEqual({playedIds:['h8','d8','2c'],scoringIds:['h8','d8'],activeScoringIds:['h8','d8'],heldIds:['held']});
  });

  it('B05 counts a disabled partner in played but only the active cards receive +15H', () => {
    const r=score(triple,['b05'],{disabledIds:['8s']});
    expect(r.finalScore).toBe('408'); // (90+16+30)×3.
    expect(r.events.filter(e=>e.sourceDefinitionId==='b05').map(e=>e.targetCardId)).toEqual(['8h','8d']);
    const house=[...triple,card('9s',9),card('9h',9,'hearts')];
    expect(score(house,['b05']).finalScore).toBe('1485'); // (210+42+45)×5.
  });

  it('B06 repeats ordinary points and B02 card effects, without repeating whole-hand or character effects', () => {
    const r=score(pair,['b06','b02'],{characterId:'erxiang'});
    expect(r.finalScore).toBe('301'); // H=35+32=67; M=2+4×1/4+3/2=9/2; one floor.
    expect(r.events.filter(e=>e.sourceDefinitionId==='b02')).toHaveLength(4);
    expect(r.events.filter(e=>e.sourceType==='character')).toHaveLength(1);
    expect(r.events.filter(e=>e.operation==='retrigger-card').map(e=>[e.targetCardId,e.retriggerDepth])).toEqual([['8s',0],['8h',0]]);
    for(const e of r.events.filter(e=>e.retriggerDepth===1)) {
      expect(e.rootEventId).toBe(r.events.find(root=>root.sourceType==='card'&&root.targetCardId===e.targetCardId&&root.retriggerDepth===0)?.eventId);
    }
  });

  it('B07/D07 require every played card to be active, and B07 additionally requires at least two', () => {
    expect(score(single,['b07']).finalScore).toBe('22');
    expect(score(single,['d07']).finalScore).toBe('33');
    for(const id of ['b07','d07'])expect(score(pair,[id],{disabledIds:['8s']}).finalScore).toBe('86');
    expect(score(pair,['b07','d07']).finalScore).toBe('202'); // floor((35+16+30)×5/2).
  });

  it('C07 chooses the last original active scoring card and repeats its effects only once', () => {
    const r=score(flush,['c07','c03'],{disabledIds:['flush-4']});
    expect(r.finalScore).toBe('832'); // H=140+20+4×8+last8+8=208; M=4.
    expect(r.events.filter(e=>e.operation==='retrigger-card').map(e=>e.targetCardId)).toEqual(['flush-3']);
    expect(r.events.filter(e=>e.sourceDefinitionId==='c03'&&e.targetCardId==='flush-3').map(e=>e.retriggerDepth)).toEqual([0,1]);
    const sf=[10,11,12,13,14].map((rank,i)=>card(`sf-${i}`,rank as Rank));
    expect(score(sf,['c07']).finalScore).toBe('4608'); // (450+51+lastA11)×9.
  });

  it('D02 takes only the first four eligible held 2–5, before characterScore', () => {
    const hand=[card('played',13),card('skip',6),card('a',2),card('b',3),card('c',4),card('d',5),card('extra',2,'hearts'),card('ace',14)];
    const r=score(hand,['d02'],{selectedIds:['played'],characterId:'amo'});
    expect(r.finalScore).toBe('162'); // (20+10+4×6)×3.
    expect(r.events.filter(e=>e.sourceDefinitionId==='d02').map(e=>e.targetCardId)).toEqual(['a','b','c','d']);
    expect(r.events.filter(e=>e.sourceDefinitionId==='d02').every(e=>e.phase==='onHeldCard')).toBe(true);
    expect(score(single,['d02']).finalScore).toBe('22');
  });

  it('D04 uses even legal playIndex and the first active original card, with stacked sources in slot order', () => {
    const r=score(pair,['d04','b06'],{playIndex:2});
    expect(r.finalScore).toBe('150'); // H=35+5×8=75, M=2.
    expect(r.events.filter(e=>e.operation==='retrigger-card').map(e=>[e.sourceDefinitionId,e.targetCardId])).toEqual([
      ['d04','8s'],['b06','8s'],['b06','8h'],
    ]);
    expect(score(pair,['d04'],{playIndex:2,disabledIds:['8s']}).finalScore).toBe('102'); // 35+8+8, at M2.
    expect(score(single,['d04'],{playIndex:6,handsBeforePlay:1}).finalScore).toBe('24');
  });

  it('A06 and F04 remain ordered after the character and each other', () => {
    expect(score(single,['f04','a06'],{characterId:'amo',gold:3}).finalScore).toBe('198'); // 22×(3+3)×3/2.
    const r=score(single,['a06','f04'],{characterId:'amo',gold:3});
    expect(r.finalScore).toBe('165'); // 22×(3×3/2+3).
    expect(r.events.filter(e=>['characterScore','jokerScore'].includes(e.phase)).map(e=>e.after.M)).toEqual([
      {n:'3',d:'1'},{n:'9',d:'2'},{n:'15',d:'2'},
    ]);
  });

  it('C08 enables A234 and four consecutive ranks while five-card and four-card flush priority stay explicit', () => {
    const low=[card('a',14),card('2',2,'hearts'),card('3',3,'clubs'),card('4',4,'diamonds')];
    const r=score(low,['c08']);
    expect(r.handType).toBe('straight');
    expect(r.finalScore).toBe('580'); // (125+11+2+3+4)×4.
    expect(r.sets.scoringIds).toEqual(low.map(c=>c.id));
    expect(score(low,[]).handType).toBe('high-card');
    expect(score([card('q',12),card('k',13),card('a',14),card('2',2,'hearts')],['c08']).handType).toBe('high-card');
    const same=[2,3,4,5].map((rank,i)=>card(`four-${i}`,rank as Rank));
    expect(score(same,['c08']).handType).toBe('straight');
    expect(score(same,['c08'],{handRules:{fourFlush:true}}).handType).toBe('flush');
    expect(evaluateR2Hand(same,{fourStraight:true,fourFlush:true}).type).toBe('flush');
    expect(score(flush,['c08']).handType).toBe('flush');
  });
});

describe('C00 pending heat, score comparison and finite lifetime', () => {
  it('C05 consumes only its pending heat once at its jokerScore slot, with the reset in the same trace', () => {
    const yes=input(single,[owned('c05',{growth:{pendingHeat:{n:'80',d:'1'}}})]);
    const saved=JSON.stringify(yes), r=scoreR2Hand(yes);
    expect(r.finalScore).toBe('102'); // 20+2+80.
    expect(r.jokers[0].growth.pendingHeat).toEqual({n:'0',d:'1'});
    expect(r.events.filter(e=>e.sourceDefinitionId==='c05').map(e=>[e.phase,e.operation,e.value,e.before.H,e.after.H])).toEqual([
      ['jokerScore','consume-growth',{n:'80',d:'1'},{n:'22',d:'1'},{n:'102',d:'1'}],
    ]);
    expect(scoreR2Hand({...yes,jokers:r.jokers}).finalScore).toBe('22');
    expect(scoreR2Hand(JSON.parse(saved))).toEqual(r);
    expect(JSON.stringify(yes)).toBe(saved);
    expect(()=>scoreR2Hand(input(single,[owned('c05',{growth:{pendingHeat:{n:'81',d:'1'}}})]))).toThrow('invalid-growth-state');
  });

  it('F05 grows from actual floored score only after scoring, resets on equal/lower, and preserves growth on a stage first hand', () => {
    const first=score(single,['f05'],{previousHandScore:null});
    expect(first.finalScore).toBe('22');
    expect(first.jokers[0].growth).toEqual({});
    expect(first.events.at(-1)?.operation).toBe('score-growth-baseline');
    const second=score([card('3',3)],['f05'],{previousHandScore:'22'});
    expect(second.finalScore).toBe('23');
    expect(second.jokers[0].growth.multiplier).toEqual({n:'1',d:'4'});
    const third=scoreR2Hand(input([card('4',4)],second.jokers,{previousHandScore:'23'}));
    expect(third.finalScore).toBe('30'); // (20+4)×(1+1/4), growth to 1/2 afterward.
    expect(third.jokers[0].growth.multiplier).toEqual({n:'1',d:'2'});
    const reset=scoreR2Hand(input(single,third.jokers,{previousHandScore:'33'}));
    expect(reset.finalScore).toBe('33');
    expect(reset.jokers[0].growth.multiplier).toEqual({n:'0',d:'1'});
    expect(reset.events.at(-1)?.operation).toBe('reset-growth');
    const stageFirst=scoreR2Hand(input(single,third.jokers,{previousHandScore:null}));
    expect(stageFirst.jokers).toEqual(third.jokers);
    const atCap=scoreR2Hand(input(single,[owned('f05',{growth:{multiplier:{n:'4',d:'1'}}})],{previousHandScore:'100'}));
    expect(atCap.finalScore).toBe('110');
    expect(atCap.jokers[0].growth.multiplier).toEqual({n:'4',d:'1'});
  });

  it('F05 uses exact serialized scores, validates input and stays deterministic under public previews', () => {
    const yes=input(single,[owned('f05',{growth:{multiplier:{n:'1',d:'4'}}})],{previousHandScore:'27'});
    const saved=JSON.stringify(yes), r=scoreR2Hand(yes);
    expect(r.finalScore).toBe('27'); // floor(22×5/4)=27; no fractional comparison to 27.
    expect(r.jokers[0].growth.multiplier).toEqual({n:'0',d:'1'});
    for(let i=0;i<20;i++)previewR2Hand(yes);
    expect(JSON.stringify(yes)).toBe(saved);
    expect(scoreR2Hand(JSON.parse(saved))).toEqual(r);
    expect(scoreR2Hand({...yes,previousHandScore:'9'.repeat(4096)}).jokers[0].growth.multiplier).toEqual({n:'0',d:'1'});
    for(const bad of ['-1','1.5','01','Infinity','9'.repeat(4097)])expect(()=>scoreR2Hand({...yes,previousHandScore:bad})).toThrow('invalid-previous-hand-score');
  });

  it('E06 reads only its own saved sale growth, validates its cap and follows multiplier slot order', () => {
    const growing=owned('e06',{growth:{multiplier:{n:'1',d:'2'}}});
    const yes=input(single,[growing]), saved=JSON.stringify(yes), r=scoreR2Hand(yes);
    expect(r.finalScore).toBe('33'); // 22×(1+1/2).
    expect(r.jokers[0].growth).toEqual(growing.growth); // Scoring is not a successful sale.
    expect(score(single,['e06']).finalScore).toBe('22');
    expect(scoreR2Hand(JSON.parse(saved))).toEqual(r);
    expect(scoreR2Hand(input(single,[owned('e06',{growth:{multiplier:{n:'3',d:'1'}}})])).finalScore).toBe('88');
    expect(()=>scoreR2Hand(input(single,[owned('e06',{growth:{multiplier:{n:'7',d:'2'}}})]))).toThrow('invalid-growth-state');
    expect(scoreR2Hand(input(single,[growing,owned('f06')])).finalScore).toBe('66'); // (1+1/2)×2.
    expect(scoreR2Hand(input(single,[owned('f06'),growing])).finalScore).toBe('55'); // 1×2+1/2.
  });

  it('F06 applies x2 through the fourth actual hand, then emits a deterministic destruction without changing H/M', () => {
    let jokers=[owned('f06')];
    for(let i=1;i<=4;i++) {
      const yes=input(single,jokers,{playIndex:i}), saved=JSON.stringify(yes), r=scoreR2Hand(yes);
      expect(r.finalScore).toBe('44');
      expect(r.events.find(e=>e.operation==='increment-hands-scored')?.value).toEqual({n:String(i),d:'1'});
      expect(r.events.find(e=>e.operation==='increment-hands-scored')?.phase).toBe('afterHand');
      expect(r.destroyedJokerIds).toEqual(i===4?['owned/f06']:[]);
      if(i<4)expect(r.jokers[0].counters?.handsScored).toBe(i);
      else {
        expect(r.jokers).toEqual([]);
        const destroyed=r.events.at(-1)!;
        expect(destroyed.operation).toBe('destroy-joker');
        expect(destroyed.sourceDefinitionId).toBe('f06');
        expect(destroyed.sourceInstanceId).toBe('owned/f06');
        expect(destroyed.before).toEqual(destroyed.after);
      }
      expect(scoreR2Hand(JSON.parse(saved))).toEqual(r);
      expect(JSON.stringify(yes)).toBe(saved);
      expect(r.rng).toEqual(yes.rng);
      jokers=JSON.parse(JSON.stringify(r.jokers));
    }
    expect(scoreR2Hand(input(single,jokers)).finalScore).toBe('22');
  });

  it('F06 counts legal hands even if every scoring card is disabled and other afterHand growth still runs', () => {
    const r=scoreR2Hand(input(single,[owned('f06',{counters:{handsScored:3}}),owned('a05')],{disabledIds:['2s']}));
    expect(r.finalScore).toBe('40'); // high-card base20 at M1×2; no ordinary points.
    expect(r.destroyedJokerIds).toEqual(['owned/f06']);
    expect(r.jokers.map(j=>j.definitionId)).toEqual(['a05']);
    expect(r.jokers[0].growth.heat).toEqual({n:'6',d:'1'});
    expect(r.events.find(e=>e.sourceDefinitionId==='a05'&&e.phase==='afterHand')).toBeDefined();
  });
});

describe('C00 bounded static and state schema', () => {
  it('A04 is conditional on the persistent deck count; D06, E02 and E04 publish exact static modifiers', () => {
    const read=schema.readR2Modifiers;
    const jokers=['a04','d06','e02','e04','c08'].map(id=>owned(id));
    const yes=read(jokers,R2_JOKERS,{deckSize:40});
    expect(yes).toEqual({handLimitBonus:3,fourStraight:true,firstPurchaseDiscount:1,interestCapBonus:2});
    expect(read(jokers,R2_JOKERS,{deckSize:41}).handLimitBonus).toBe(1);
    expect(read([owned('a04')],R2_JOKERS).handLimitBonus).toBe(0);
    expect(read([],R2_JOKERS,{deckSize:40})).toEqual({handLimitBonus:0,fourStraight:false,firstPurchaseDiscount:0,interestCapBonus:0});
    expect(read(JSON.parse(JSON.stringify(jokers)),R2_JOKERS,{deckSize:40})).toEqual(yes);
    expect(()=>read(jokers,R2_JOKERS,{deckSize:NaN})).toThrow('invalid-modifier-context');
  });

  it('validates finite, per-definition lifecycle counters and rejects fabricated state', () => {
    expect(schema.validR2JokerCounters('a07',undefined)).toBe(true);
    expect(schema.validR2JokerCounters('a07',{singleDiscards:2})).toBe(true);
    expect(schema.validR2JokerCounters('f06',{handsScored:3})).toBe(true);
    for(const counters of [null,{singleDiscards:3},{singleDiscards:-1},{singleDiscards:1.5},{handsScored:1},{singleDiscards:0,other:0}])expect(schema.validR2JokerCounters('a07',counters)).toBe(false);
    expect(schema.validR2JokerCounters('f06',{handsScored:4})).toBe(false);
    expect(()=>scoreR2Hand(input(single,[owned('f06',{counters:{handsScored:4}})]))).toThrow('invalid-joker-counter-state');
  });

  it('declares supported features for all new definitions and never enables a missing capability', () => {
    for(const id of secondBatch) {
      const definition=R2_JOKERS.find(d=>d.id===id)!;
      expect(definition.requiredFeatures?.length).toBeGreaterThan(0);
      expect(schema.supportsR2Joker(definition)).toBe(true);
    }
    const lifetime=R2_JOKERS.find(d=>d.id==='f06')!;
    expect(schema.supportsR2Joker(lifetime,schema.R2_IMPLEMENTED_FEATURES.filter(f=>f!=='hand-lifetime'))).toBe(false);
    expect(schema.validateR2Content([{...lifetime,requiredFeatures:['arbitrary-script']}]).length).toBeGreaterThan(0);
  });

  it('keeps every C00 declared source within the 512-event budget, including mixed repeated card hooks', () => {
    const r=score(pair,['b06','d04','b02','a08','b05'],{playIndex:2});
    expect(r.events.length).toBeLessThanOrEqual(512);
    expect(r.events.every(e=>e.retriggerDepth<=1)).toBe(true);
    // Content has at most one onCardScore operation per equipped source. Five cards,
    // five ordinary+four repeat executions, five sources, plus caps and all later hooks: < 512.
    const maxCardOps=Math.max(...R2_JOKERS.map(d=>d.hooks.filter(h=>h.phase==='onCardScore').reduce((n,h)=>n+h.operations.length,0)));
    const maxHeldOps=Math.max(...R2_JOKERS.map(d=>d.hooks.filter(h=>h.phase==='onHeldCard').reduce((n,h)=>n+h.operations.length,0)));
    const maxLaterOps=Math.max(...R2_JOKERS.map(d=>d.hooks.filter(h=>h.phase==='jokerScore'||h.phase==='afterHand').reduce((n,h)=>n+h.operations.length,0)));
    const conservativeBound=5*5*(1+5*maxCardOps)+5*5+14*5*maxHeldOps+5*maxLaterOps*2+5; // base/role/final and two rescue events.
    expect(conservativeBound).toBeLessThanOrEqual(512);
  });
});
