import { describe, expect, it } from 'vitest';
import type { PlayingCard, Rank, Suit } from '../src/cards/types';
import { SeededRng } from '../src/core/SeededRng';
import { evaluateR2Hand } from '../src/domain/evaluateR2';
import { scoreR2Hand, ScoreFault, type ScoreInput } from '../src/domain/scoreR2';
import { validateR2Content, R2_JOKERS, type R2JokerDefinition } from '../src/content/r2Schema';

const card = (id: string, rank: Rank, suit: Suit = 'spades'): PlayingCard => ({ id, rank, suit });
const pair = [card('8s', 8), card('8h', 8, 'hearts'), card('kd', 13, 'diamonds'), card('2c', 2, 'clubs')];
const fixture = (hand: PlayingCard[], selectedIds = hand.map(c => c.id), extra: Partial<ScoreInput> = {}): ScoreInput => ({
  rulesVersion: 'r2', runId: 'golden', rootId: 'golden/hand/1', characterId: 'neutral',
  hand, selectedIds, jokers: [], definitions: R2_JOKERS, handLevels: {}, disabledIds: [],
  playIndex: 1, handsBeforePlay: 4, previousHandType: null, wager: false,
  rng: new SeededRng('rules').snapshot(), ...extra,
});
const equipped = (id: string, definitionId: string) => ({ instanceId: id, definitionId, paidPrice: 0, growth: {} });
const effect = (id: string, kind: 'add-multiplier' | 'multiply-multiplier', n: string): R2JokerDefinition => ({
  id, name: id, rarity: 'common', description: 'Test fixture only', hooks: [{ phase: 'jokerScore', condition: { kind: 'always' }, operations: [{ kind, value: { n, d: '1' } }] }],
});

describe('r2 G01–G09 scoring goldens', () => {
  it('the reported QQQ99 selection is a full house, independent of other held cards', () => {
    const hand = [card('jc', 11, 'clubs'), card('qd', 12, 'diamonds'), card('9c', 9, 'clubs'),
      card('qs', 12), card('qh', 12, 'hearts'), card('9h', 9, 'hearts'), card('9s', 9), card('7h', 7, 'hearts')];
    const selected = ['qd', 'qs', 'qh', '9h', '9s'];
    const result = scoreR2Hand(fixture(hand, selected));
    expect(result.handType).toBe('full-house');
    expect(result.sets.scoringIds).toEqual(selected);
    expect(result.sets.heldIds).toEqual(['jc', '9c', '7h']);
    expect(result.finalScore).toBe('1290'); // (210 + 10 + 10 + 10 + 9 + 9) × 5.
  });

  it.each([['G01', 2, '22'], ['G02', 10, '30']] as const)('%s gives ordinary ranks their own chips', (_id, rank, expected) => {
    const result = scoreR2Hand(fixture([card('single', rank)]));
    expect(result.finalScore).toBe(expected);
    expect(result.sets.scoringIds).toEqual(['single']);
    expect(result.events.map(e => e.operation)).toEqual(['base', 'add-heat', 'final-score']);
    expect(result.events[1].before).toEqual({ H: { n: '20', d: '1' }, M: { n: '1', d: '1' } });
    expect(result.events[1].after.H).toEqual({ n: String(20 + rank), d: '1' });
  });

  it('G03/G04 form a pair while moving all played cards and excluding the K kicker', () => {
    const plain = scoreR2Hand(fixture(pair));
    expect(plain.handType).toBe('pair');
    expect(plain.finalScore).toBe('102');
    expect(plain.sets).toEqual({ playedIds: ['8s', '8h', 'kd', '2c'], scoringIds: ['8s', '8h'], activeScoringIds: ['8s', '8h'], heldIds: [] });
    const abacus = scoreR2Hand(fixture(pair, undefined, { jokers: [equipped('abacus', 'tiesuanpan')] }));
    expect(abacus.finalScore).toBe('102');
    expect(abacus.events.some(e => e.sourceInstanceId === 'abacus')).toBe(false);
  });

  it('G05 preserves +3 then x2 order, and reversing equipment changes 510 to 357', () => {
    const definitions = [effect('plus', 'add-multiplier', '3'), effect('times', 'multiply-multiplier', '2')];
    const jokers = [equipped('plus-instance', 'plus'), equipped('times-instance', 'times')];
    const result = scoreR2Hand(fixture(pair, undefined, { definitions, jokers }));
    expect(result.finalScore).toBe('510');
    expect(result.events.filter(e => e.phase === 'jokerScore').map(e => e.after.M)).toEqual([{ n: '5', d: '1' }, { n: '10', d: '1' }]);
    expect(scoreR2Hand(fixture(pair, undefined, { definitions, jokers: [...jokers].reverse() })).finalScore).toBe('357');
  });

  it('G06 scores a mixed A2345 as 600 with all five scoring cards', () => {
    const hand = [card('a', 14), card('2', 2, 'hearts'), card('3', 3), card('4', 4), card('5', 5)];
    const result = scoreR2Hand(fixture(hand));
    expect(result.handType).toBe('straight');
    expect(result.finalScore).toBe('600');
    expect(result.sets.scoringIds).toEqual(hand.map(c => c.id));
  });

  it('G07/G08 apply amo x3 before pengci +2 (90 and 150)', () => {
    const hand = [card('k', 13)];
    expect(scoreR2Hand(fixture(hand, undefined, { characterId: 'amo' })).finalScore).toBe('90');
    const result = scoreR2Hand(fixture(hand, undefined, { characterId: 'amo', jokers: [equipped('pengci-instance', 'pengci')] }));
    expect(result.finalScore).toBe('150');
    expect(result.events.filter(e => ['characterScore', 'jokerScore'].includes(e.phase)).map(e => [e.phase, e.after.M])).toEqual([
      ['characterScore', { n: '3', d: '1' }], ['jokerScore', { n: '5', d: '1' }],
    ]);
  });

  it('G09 leaves a disabled 8 in the pair but gives only the other 8 chips', () => {
    const result = scoreR2Hand(fixture(pair, undefined, { disabledIds: ['8s'] }));
    expect(result.handType).toBe('pair');
    expect(result.sets.scoringIds).toEqual(['8s', '8h']);
    expect(result.sets.activeScoringIds).toEqual(['8h']);
    expect(result.finalScore).toBe('86');
  });
});

describe('r2 sets, selection order and all twelve hands', () => {
  it('uses stored hand order, not click order, and does not score held ordinary points', () => {
    const result = scoreR2Hand(fixture([card('q', 12), card('a', 14), card('q2', 12, 'hearts')], ['q2', 'q']));
    expect(result.sets.scoringIds).toEqual(['q', 'q2']);
    expect(result.sets.heldIds).toEqual(['a']);
    expect(result.finalScore).toBe('110');
  });

  it('breaks same-rank high-card ties using stored hand order', () => {
    const result = evaluateR2Hand([card('first-a', 14), card('second-a', 14, 'hearts'), card('third-a', 14, 'clubs'), card('fourth-a', 14, 'diamonds'), card('fifth-a', 14)], {});
    expect(result.type).toBe('five-kind');
    expect(evaluateR2Hand([card('k', 13), card('q', 12)], {}).scoringIds).toEqual(['k']);
  });

  it.each([
    ['high-card', [2, 4]], ['pair', [8, 8, 2]], ['two-pair', [8, 8, 9, 9, 2]],
    ['three-kind', [8, 8, 8, 2]], ['straight', [2, 3, 4, 5, 6]], ['full-house', [8, 8, 8, 9, 9]],
    ['four-kind', [8, 8, 8, 8, 2]], ['five-kind', [8, 8, 8, 8, 8]],
  ] as const)('recognizes %s and accepts copied definitions with unique IDs', (expected, ranks) => {
    const hand = ranks.map((rank, index) => card(`copy-${index}`, rank, index % 2 ? 'hearts' : 'spades'));
    expect(evaluateR2Hand(hand, {}).type).toBe(expected);
  });

  it.each([
    ['flush', [2, 4, 7, 9, 13]], ['straight-flush', [10, 11, 12, 13, 14]],
    ['flush-house', [8, 8, 8, 9, 9]], ['flush-five', [8, 8, 8, 8, 8]],
  ] as const)('recognizes %s with five same-suit instances', (expected, ranks) => {
    expect(evaluateR2Hand(ranks.map((rank, index) => card(`same-suit-${index}`, rank)), {}).type).toBe(expected);
  });

  it('does not invent four-card straights/flushes or wrap QKA23', () => {
    expect(evaluateR2Hand([2, 3, 4, 5].map((rank, i) => card(`four-${i}`, rank as Rank)), {}).type).toBe('high-card');
    expect(evaluateR2Hand([12, 13, 14, 2, 3].map((rank, i) => card(`wrap-${i}`, rank as Rank, i % 2 ? 'hearts' : 'spades')), {}).type).toBe('high-card');
  });

  it('G14 refuses duplicate IDs while accepting separate copied instances', () => {
    expect(() => scoreR2Hand(fixture(pair, ['8s', '8s']))).toThrow();
    expect(() => scoreR2Hand(fixture(pair, ['unknown']))).toThrow();
    expect(() => evaluateR2Hand([card('same', 8), card('same', 8)], {})).toThrow();
  });
});

describe('r2 deterministic characters and finite hooks', () => {
  it('keeps explicit CONTENT amounts and does not extend mantangcai to five-kind', () => {
    expect(scoreR2Hand(fixture(pair, undefined, { jokers: [equipped('cheer', 'mantangcai')] })).finalScore).toBe('282');
    expect(scoreR2Hand(fixture([card('k', 13)], undefined, { jokers: [equipped('abacus', 'tiesuanpan')] })).finalScore).toBe('55');
    const copies = Array.from({ length: 5 }, (_, i) => card(`eight-${i}`, 8, i % 2 ? 'hearts' : 'spades'));
    expect(scoreR2Hand(fixture(copies, undefined, { jokers: [equipped('cheer', 'mantangcai')] })).finalScore).toBe('7400');
  });
  it('G11/G12 clone RNG for previews and reproduce the exact trace', () => {
    const input = fixture([card('k', 13)], undefined, { characterId: 'touye', wager: true });
    const before = JSON.stringify(input);
    const first = scoreR2Hand(input);
    for (let i = 0; i < 100; i++) expect(scoreR2Hand(input)).toEqual(first);
    expect(JSON.stringify(input)).toBe(before);
    const expected = SeededRng.restore(input.rng);
    const roll = expected.next();
    expect(first.finalScore).toBe(roll < 0.5 ? '60' : '22');
    expect(first.rng).toEqual(expected.snapshot());
  });

  it('touye normally multiplies by 1.15 without consuming randomness', () => {
    const input = fixture([card('k', 13)], undefined, { characterId: 'touye' });
    const result = scoreR2Hand(input);
    expect(result.finalScore).toBe('34');
    expect(result.rng).toEqual(input.rng);
  });

  it('runs growth after score and uses it only from the following hand', () => {
    const growth: R2JokerDefinition = {
      id: 'a05', name: '熟面孔', rarity: 'uncommon', description: '单张成长', hooks: [
        { phase: 'jokerScore', condition: { kind: 'always' }, operations: [{ kind: 'read-growth', key: 'heat', target: 'heat' }] },
        { phase: 'afterHand', condition: { kind: 'played-count', equals: 1 }, operations: [{ kind: 'add-growth', key: 'heat', value: { n: '6', d: '1' }, cap: { n: '90', d: '1' } }] },
      ],
    };
    const input = fixture([card('2', 2)], undefined, { definitions: [growth], jokers: [equipped('growing', 'a05')] });
    const first = scoreR2Hand(input);
    expect(first.finalScore).toBe('22');
    expect(first.jokers[0].growth.heat).toEqual({ n: '6', d: '1' });
    expect(scoreR2Hand({ ...input, jokers: first.jokers }).finalScore).toBe('28');
    expect(input.jokers[0].growth).toEqual({});
  });

  it('allows one retrigger depth and never reruns character or whole-hand jokers', () => {
    const encore: R2JokerDefinition = { id: 'a11', name: '返个场', rarity: 'rare', description: '有限返场', hooks: [{ phase: 'onCardScore', condition: { kind: 'played-count', equals: 1 }, operations: [{ kind: 'retrigger-card', count: 1 }] }] };
    const result = scoreR2Hand(fixture([card('2', 2)], undefined, { characterId: 'amo', definitions: [encore], jokers: [equipped('encore', 'a11')] }));
    expect(result.finalScore).toBe('72'); // (20+2+2)*3; not character x3 twice.
    expect(result.events.filter(e => e.operation === 'add-heat' && e.sourceType === 'card')).toHaveLength(2);
    expect(result.events.filter(e => e.phase === 'characterScore')).toHaveLength(1);
    expect(Math.max(...result.events.map(e => e.retriggerDepth))).toBe(1);
  });

  it('validates malformed content before hooks run', () => {
    expect(validateR2Content(R2_JOKERS)).toEqual([]);
    const definitions = structuredClone(R2_JOKERS);
    definitions[0].hooks[0] = { ...definitions[0].hooks[0], operations: [{ kind: 'multiply-multiplier', value: { n: '2', d: '0' } }] };
    expect(validateR2Content(definitions).length).toBeGreaterThan(0);
    expect(validateR2Content([...R2_JOKERS, R2_JOKERS[0]]).length).toBeGreaterThan(0);
    expect(validateR2Content([{ ...R2_JOKERS[0], rarity: 'epic' }]).length).toBeGreaterThan(0);
    expect(validateR2Content([{ ...R2_JOKERS[0], hooks: [{ phase: 'unknown', condition: { kind: 'always' }, operations: [] }] }]).length).toBeGreaterThan(0);
  });

  it('holds exact level increments at 30 and refuses invalid or unknown levels', () => {
    expect(scoreR2Hand(fixture([card('2',2)],undefined,{handLevels:{'high-card':30}})).finalScore).toBe('2574'); // (20+290+2)*(1+29/4)=2574.
    for(const level of [0,31,1.5,NaN])expect(()=>scoreR2Hand(fixture(pair,undefined,{handLevels:{pair:level}}))).toThrow();
  });
  it('keeps all six character predicates and exact timing distinct', () => {
    expect(scoreR2Hand(fixture(pair,undefined,{characterId:'amo'})).finalScore).toBe('102');
    expect(scoreR2Hand(fixture(pair,undefined,{characterId:'erxiang'})).finalScore).toBe('178'); // 51*3.5, one final floor.
    const house=[card('a',8),card('b',8,'hearts'),card('c',8,'clubs'),card('d',9),card('e',9,'hearts')];
    expect(scoreR2Hand(fixture(house,undefined,{characterId:'erxiang'})).finalScore).toBe('1260');
    const straight=[2,3,4,5,6].map((rank,i)=>card(`s-${i}`,rank as Rank,i%2?'hearts':'spades'));
    expect(scoreR2Hand(fixture(straight,undefined,{characterId:'laohuan'})).finalScore).toBe('1060'); // (125+20+120)*4.
    expect(scoreR2Hand(fixture(pair,undefined,{characterId:'laohuan'})).finalScore).toBe('102');
    expect(scoreR2Hand(fixture(pair,undefined,{characterId:'azao',previousHandType:null})).finalScore).toBe('102');
    expect(scoreR2Hand(fixture(pair,undefined,{characterId:'azao',previousHandType:'pair'})).finalScore).toBe('102');
    expect(scoreR2Hand(fixture(pair,undefined,{characterId:'azao',previousHandType:'high-card'})).finalScore).toBe('153');
    expect(scoreR2Hand(fixture(pair,undefined,{characterId:'xiemu',handsBeforePlay:2})).finalScore).toBe('102');
    expect(scoreR2Hand(fixture(pair,undefined,{characterId:'xiemu',handsBeforePlay:1})).finalScore).toBe('204');
  });
  it('runs held-card hooks after card hooks and before character, without ordinary held points', () => {
    const held:R2JokerDefinition={id:'held',name:'held',rarity:'common',description:'test',hooks:[{phase:'onHeldCard',condition:{kind:'rank-in',values:[14]},operations:[{kind:'add-multiplier',value:{n:'1',d:'1'}}]}]};
    const result=scoreR2Hand(fixture([card('2',2),card('a',14)],['2'],{characterId:'amo',definitions:[held],jokers:[equipped('held-instance','held')]}));
    expect(result.finalScore).toBe('132'); // (20+2)*(1+1)*3.
    expect(result.events.map(e=>e.phase)).toEqual(['base','onCardScore','onHeldCard','characterScore','finalScore']);
  });
  it('caps retriggers explicitly at four and rejects depth-2 expansion', () => {
    const definitions=['a','b'].map(id=>({id,name:id,rarity:'rare' as const,description:'test',hooks:[{phase:'onCardScore' as const,condition:{kind:'always' as const},operations:[{kind:'retrigger-card' as const,count:4}]}]}));
    const result=scoreR2Hand(fixture([card('2',2)],undefined,{definitions,jokers:definitions.map(d=>equipped(d.id,d.id))}));
    expect(result.finalScore).toBe('30');
    expect(result.events.filter(e=>e.sourceType==='card')).toHaveLength(5);
    expect(result.events.filter(e=>e.operation==='retrigger-cap')).toHaveLength(1);
    expect(result.events.every(e=>e.retriggerDepth<=1)).toBe(true);
    expect(Object.isFrozen(result.events[0].after.H)).toBe(true);
    expect(()=>{result.events.pop();}).toThrow();
  });
  it('diagnoses 512-event overflow and leaves inputs/RNG untouched', () => {
    const definitions=Array.from({length:5},(_,i):R2JokerDefinition=>({id:`dense-${i}`,name:'dense',rarity:'rare',description:'overflow probe',hooks:Array.from({length:8},()=>({phase:'onCardScore',condition:{kind:'always'},operations:Array.from({length:8},()=>({kind:'add-heat',value:{n:'1',d:'1'}}))}))}));
    const hand=[2,3,4,5,6].map((rank,i)=>card(`dense-card-${i}`,rank as Rank,i%2?'hearts':'spades'));
    const input=fixture(hand,undefined,{definitions,jokers:definitions.map(d=>equipped(d.id,d.id))});
    const checkpoint=JSON.stringify(input);
    try {scoreR2Hand(input);throw new Error('overflow accepted');}catch(error) {
      expect(error).toBeInstanceOf(ScoreFault);
      expect((error as ScoreFault).code).toBe('event-limit');
      expect((error as ScoreFault).events).toHaveLength(512);
    }
    expect(JSON.stringify(input)).toBe(checkpoint);
  });
  it.each([
    ['pengci',fixture([card('k',13)]),'90',fixture(pair),'102'],
    ['mantangcai',fixture(pair),'282',fixture([card('k',13)]),'30'],
    ['tiesuanpan',fixture([card('k',13)]),'55',fixture([card('2',2)]),'22'],
    ['huimaqiang',fixture(pair,undefined,{playIndex:3}),'204',fixture(pair,undefined,{playIndex:2}),'102'],
    ['jiedongfeng',fixture([2,3,4,5,6].map((rank,i)=>card(`wind-${i}`,rank as Rank,i%2?'hearts':'spades'))),'797',fixture(pair),'102'],
  ] as const)('gives %s positive, negative and saved-input replay evidence', (id,yes,positive,no,negative) => {
    const joker=equipped(`instance-${id}`,id);
    const input={...yes,jokers:[joker]},miss={...no,jokers:[joker]};
    const result=scoreR2Hand(input);
    expect(result.finalScore).toBe(positive);
    expect(scoreR2Hand(miss).finalScore).toBe(negative);
    expect(scoreR2Hand(JSON.parse(JSON.stringify(input)))).toEqual(result);
    expect(result.events.filter(e=>e.sourceInstanceId===joker.instanceId).every(e=>e.sourceDefinitionId===id)).toBe(true);
  });
});
