import {describe, expect, it} from 'vitest';
import type {PlayingCard, Rank, Suit} from '../src/cards/types';
import {R2_JOKERS, type R2JokerDefinition, type R2JokerInstance} from '../src/content/r2Schema';
import {SeededRng, type RngSnapshot} from '../src/core/SeededRng';
import {previewR2Hand, scoreR2Hand, type ScoreEvent, type ScoreInput, type ScoreTrace} from '../src/domain/scoreR2';

// D24 contract fixtures precede the implementation/types. These local assertions
// let the unmodified engine reach runtime RED without changing any older golden.
type Edition = 'none' | 'foil' | 'holographic' | 'polychrome';
type Enhancement = NonNullable<PlayingCard['enhancement']> | 'lucky-paper';
type ContractTrace = ScoreTrace & {
  goldDelta:number; destroyedCardIds:string[];
  cards:PlayingCard[]; sourceJokers:R2JokerInstance[];
};
type ContractPreview = ReturnType<typeof previewR2Hand> & {
  scoreRange:{minimum:string; maximum:string}; randomEffects:unknown;
};
const fraction = (n:string, d='1') => ({n, d});
const cursor = (state:number):RngSnapshot => ({algorithm:'fnv1a-mulberry32-v1', state});
const card = (id:string, rank:Rank, suit:Suit='spades', extra:{enhancement?:Enhancement; edition?:Edition}={}):PlayingCard =>
  ({id, rank, suit, ...extra} as PlayingCard);
const owned = (definitionId:string, edition?:Edition):R2JokerInstance => ({
  instanceId:`owned/${definitionId}`, definitionId, paidPrice:4, growth:{},
  ...(edition===undefined ? {} : {edition}),
});
function input(hand:readonly PlayingCard[], extra:Partial<ScoreInput>={}):ScoreInput {
  return {rulesVersion:'r2', runId:'c01', rootId:'c01/hand', characterId:'neutral', hand,
    selectedIds:hand.map(c=>c.id), disabledIds:[], jokers:[], definitions:R2_JOKERS, handLevels:{},
    playIndex:1, handsBeforePlay:4, previousHandType:null, wager:false, gold:0,
    rng:cursor(1212329753), ...extra};
}
const resolve = (request:ScoreInput):ContractTrace => scoreR2Hand(request) as ContractTrace;
const score = (hand:readonly PlayingCard[], extra:Partial<ScoreInput>={}):ContractTrace => resolve(input(hand, extra));
const changesMath = (event:ScoreEvent) =>
  event.before.H.n!==event.after.H.n || event.before.H.d!==event.after.H.d ||
  event.before.M.n!==event.after.M.n || event.before.M.d!==event.after.M.d;
const mathAfter = (trace:ScoreTrace) => trace.events.filter(e=>e.phase!=='base' && changesMath(e))
  .map(e=>[e.phase, e.after.H, e.after.M]);
const publicRequest = ({rng: _rng, ...request}:ScoreInput):Omit<ScoreInput, 'rng'> => request;
function bounds(preview:ReturnType<typeof previewR2Hand>):bigint[] {
  expect(preview.possibleScores.length).toBeGreaterThan(0);
  expect(preview.possibleScores.every(s=>/^(0|[1-9]\d*)$/.test(s))).toBe(true);
  const values=preview.possibleScores.map(s=>BigInt(s));
  return [values.reduce((a,b)=>a<b?a:b), values.reduce((a,b)=>a>b?a:b)];
}

describe('C01 independent enhancement and edition arithmetic', () => {
  it('preserves the ordinary L1 contract and publishes explicit empty resource/destruction results', () => {
    const plain=score([card('two',2)]), explicit=score([card('two',2,'spades',{edition:'none'})], {
      jokers:[owned('e02','none')],
    });
    for(const trace of [plain, explicit]) {
      expect(trace.finalScore).toBe('22');
      expect(trace.goldDelta).toBe(0);
      expect(trace.destroyedCardIds).toEqual([]);
      expect(trace.events.map(e=>e.operation)).toEqual(['base','add-heat','final-score']);
    }
  });

  it.each([
    ['heat-paper','42'], ['multiplier-paper','66'], ['glass-paper','33'],
    ['voice-paper','22'], ['gold-paper','22'], ['encore-paper','24'],
  ] as const)('keeps the original %s amount and activation set', (enhancement, expected) => {
    // H starts at20; rank2 adds2. Heat adds20; multiplier adds2;
    // glass multiplies by3/2; held-only papers add nothing; encore adds rank2 once.
    const trace=score([card('two',2,'spades',{enhancement})]);
    expect(trace.finalScore).toBe(expected);
    expect(trace.sets).toEqual({playedIds:['two'],scoringIds:['two'],activeScoringIds:['two'],heldIds:[]});
    expect(trace.goldDelta).toBe(0);
    expect(trace.destroyedCardIds).toEqual([]);
    expect(trace.rng).toEqual(enhancement==='glass-paper' ? cursor(3043895566) : cursor(1212329753));
  });

  it.each([['foil','47'], ['holographic','66'], ['polychrome','33']] as const)
    ('gives an active ordinary poker its own %s source', (edition, expected) => {
      // (20+2+25)*1; (20+2)*(1+2); (20+2)*3/2.
      const trace=score([card('two',2,'spades',{edition})]);
      expect(trace.finalScore).toBe(expected);
      const effects=trace.events.filter(e=>e.sourceType==='card');
      expect(effects).toHaveLength(2);
      expect(effects.every(e=>e.phase==='onCardScore' && e.sourceInstanceId==='two' && e.targetCardId==='two')).toBe(true);
      expect(trace.rng).toEqual(cursor(1212329753));
    });

  it.each([
    ['heat-paper','foil','67'], ['multiplier-paper','holographic','110'], ['glass-paper','polychrome','49'],
  ] as const)('layers %s before %s with one final floor', (enhancement, edition, expected) => {
    // 20+2+20+25; 22*(1+2+2); floor(22*3/2*3/2).
    expect(score([card('two',2,'spades',{enhancement,edition})]).finalScore).toBe(expected);
  });

  it('applies poker edition before onCardScore, rather than after B02', () => {
    const trace=score([card('8s',8,'spades',{enhancement:'multiplier-paper',edition:'polychrome'}),card('8h',8,'hearts')], {
      jokers:[owned('b02')],
    });
    // M2 ->+2=4 ->*3/2=6 ->+1/4=25/4 ->+1/4=13/2.
    // H35+8+8=51; floor(51*13/2)=331. Edition after B02 would yield337.
    expect(trace.finalScore).toBe('331');
    expect(mathAfter(trace)).toEqual([
      ['onCardScore',fraction('43'),fraction('2')],
      ['onCardScore',fraction('43'),fraction('4')],
      ['onCardScore',fraction('43'),fraction('6')],
      ['onCardScore',fraction('43'),fraction('25','4')],
      ['onCardScore',fraction('51'),fraction('25','4')],
      ['onCardScore',fraction('51'),fraction('13','2')],
    ]);
  });

  it('keeps enhancement, poker edition, character, then each Joker and its edition in order', () => {
    const hand=[card('two',2,'spades',{enhancement:'glass-paper',edition:'holographic'})];
    const jokers=[owned('f04','polychrome'),owned('pengci','holographic')];
    const request=input(hand,{characterId:'amo',jokers}), before=JSON.stringify(request), trace=resolve(request);
    // M1 ->3/2 ->7/2 ->21/2 ->27/2 ->81/4 ->89/4 ->97/4.
    // H22 gives floor(1067/2)=533. Reverse slots: M105/4 gives floor(1155/2)=577.
    expect(trace.finalScore).toBe('533');
    expect(mathAfter(trace)).toEqual([
      ['onCardScore',fraction('22'),fraction('1')],
      ['onCardScore',fraction('22'),fraction('3','2')],
      ['onCardScore',fraction('22'),fraction('7','2')],
      ['characterScore',fraction('22'),fraction('21','2')],
      ['jokerScore',fraction('22'),fraction('27','2')],
      ['jokerScore',fraction('22'),fraction('81','4')],
      ['jokerScore',fraction('22'),fraction('89','4')],
      ['jokerScore',fraction('22'),fraction('97','4')],
    ]);
    expect(score(hand,{characterId:'amo',jokers:[...jokers].reverse()}).finalScore).toBe('577');
    expect(resolve(JSON.parse(before))).toEqual(trace);
    expect(JSON.stringify(request)).toBe(before);
    expect(Object.isFrozen(trace.destroyedCardIds)).toBe(true);
  });

  it('runs a Joker edition after all of that Joker operations and before the next slot', () => {
    const definitions:R2JokerDefinition[]=[
      {id:'test-bundle',name:'bundle',rarity:'common',description:'Contract fixture',hooks:[
        {phase:'jokerScore',condition:{kind:'always'},operations:[
          {kind:'add-multiplier',value:fraction('1')},{kind:'multiply-multiplier',value:fraction('2')},
        ]},
      ]},
      {id:'test-next',name:'next',rarity:'common',description:'Contract fixture',hooks:[
        {phase:'jokerScore',condition:{kind:'always'},operations:[{kind:'add-multiplier',value:fraction('3')}]},
      ]},
    ];
    const trace=score([card('two',2)],{definitions,jokers:[owned('test-bundle','polychrome'),owned('test-next','holographic')]});
    // ((1+1)*2*3/2+3+2)=11; H22*11=242.
    expect(trace.finalScore).toBe('242');
    expect(trace.events.filter(e=>e.phase==='jokerScore').map(e=>[e.sourceInstanceId,e.after.M])).toEqual([
      ['owned/test-bundle',fraction('2')],['owned/test-bundle',fraction('4')],['owned/test-bundle',fraction('6')],
      ['owned/test-next',fraction('9')],['owned/test-next',fraction('11')],
    ]);
  });

  it('gives pure economy or condition-missing Jokers editions once per hand', () => {
    expect(score([card('two',2)],{jokers:[owned('e02','polychrome')]}).finalScore).toBe('33');
    const pair=[card('8s',8),card('8h',8,'hearts')];
    expect(score(pair,{jokers:[owned('a06','polychrome')]}).finalScore).toBe('153'); // A06 high-card condition misses; 51*2*3/2.
    const trace=score(pair,{jokers:[owned('b02','polychrome')]});
    expect(trace.finalScore).toBe('191'); // floor(51*(2+1/4+1/4)*3/2).
    expect(trace.events.filter(e=>e.phase==='jokerScore').map(e=>e.sourceInstanceId)).toEqual(['owned/b02']);
    expect(trace.events.filter(e=>e.phase==='onCardScore' && e.sourceType==='joker')).toHaveLength(2);
  });
});

describe('C01 immutable hand-start source snapshots', () => {
  it('deeply preserves cards and Joker edition/growth after the caller changes those inputs', () => {
    const hand=[card('two',2),card('held',13,'clubs',{edition:'foil'})];
    const joker=owned('a05','polychrome');
    joker.growth.heat=fraction('6');
    const jokers=[joker], trace=score(hand,{selectedIds:['two'],jokers});

    // A later rank/suit/edition tool and Joker growth must not repaint the saved hand.
    hand[0].rank=14; hand[0].suit='hearts';
    (hand[0] as PlayingCard & {edition?:Edition}).edition='holographic';
    hand[1].rank=2; hand[1].enhancement='voice-paper';
    (hand[1] as PlayingCard & {edition?:Edition}).edition='polychrome';
    hand.reverse();
    joker.growth.heat.n='90';
    (joker as R2JokerInstance & {edition?:Edition}).edition='foil';
    jokers.push(owned('f03','holographic'));

    expect(trace.cards).toEqual([
      {id:'two',rank:2,suit:'spades'},
      {id:'held',rank:13,suit:'clubs',edition:'foil'},
    ]);
    expect(trace.sourceJokers).toEqual([{
      instanceId:'owned/a05',definitionId:'a05',paidPrice:4,growth:{heat:fraction('6')},edition:'polychrome',
    }]);
    expect(trace.finalScore).toBe('42'); // (20+2+6)*3/2; afterHand grows only the result to12.
    expect(trace.jokers[0].growth.heat).toEqual(fraction('12'));
    expect(Object.isFrozen(trace.cards)).toBe(true);
    expect(Object.isFrozen(trace.sourceJokers[0].growth.heat)).toBe(true);
  });

  it('retains the fourth-hand F06 source edition although the result Joker was destroyed', () => {
    const joker={...owned('f06','polychrome'),counters:{handsScored:3}};
    const trace=score([card('two',2)],{playIndex:4,handsBeforePlay:1,jokers:[joker]});
    expect(trace.jokers).toEqual([]);
    expect(trace.destroyedJokerIds).toEqual(['owned/f06']);
    joker.counters.handsScored=0;
    (joker as R2JokerInstance & {edition?:Edition}).edition='none';

    expect(trace.sourceJokers).toEqual([{
      instanceId:'owned/f06',definitionId:'f06',paidPrice:4,growth:{},edition:'polychrome',counters:{handsScored:3},
    }]);
    expect(trace.cards).toEqual([{id:'two',rank:2,suit:'spades'}]);
    expect(trace.finalScore).toBe('66'); // 22*2*3/2 before lifetime destruction.
    const destroyed=trace.events.find(e=>e.operation==='destroy-joker')!;
    expect(destroyed.sourceInstanceId).toBe('owned/f06');
    expect(destroyed.before).toEqual(destroyed.after);
  });
});

describe('C01 active, held and ordinary-point suppression boundaries', () => {
  it('ignores enhanced/edition kickers and held scoring enhancements without consuming RNG', () => {
    const hand=[card('8s',8),card('8h',8,'hearts'),
      card('kicker',13,'diamonds',{enhancement:'lucky-paper',edition:'polychrome'}),
      card('low',2,'clubs',{enhancement:'glass-paper',edition:'foil'}),
      card('held',14,'hearts',{enhancement:'heat-paper',edition:'holographic'})];
    const trace=score(hand,{selectedIds:['8s','8h','kicker','low']});
    expect(trace.finalScore).toBe('102');
    expect(trace.sets).toEqual({playedIds:['8s','8h','kicker','low'],scoringIds:['8s','8h'],activeScoringIds:['8s','8h'],heldIds:['held']});
    expect(trace.events.filter(e=>e.targetCardId).map(e=>e.targetCardId)).toEqual(['8s','8h']);
    expect(trace.goldDelta).toBe(0);
    expect(trace.destroyedCardIds).toEqual([]);
    expect(trace.rng).toEqual(cursor(1212329753));
  });

  it('runs only voice enhancement while held, before character, with no held edition/points/lucky/glass', () => {
    const hand=[card('two',2,'spades',{enhancement:'glass-paper',edition:'holographic'}),
      card('voice',13,'hearts',{enhancement:'voice-paper',edition:'polychrome'}),
      card('gold',12,'clubs',{enhancement:'gold-paper',edition:'foil'}),
      card('heat',14,'diamonds',{enhancement:'heat-paper',edition:'holographic'}),
      card('lucky',3,'clubs',{enhancement:'lucky-paper',edition:'polychrome'}),
      card('glass',4,'hearts',{enhancement:'glass-paper',edition:'foil'})];
    const trace=score(hand,{selectedIds:['two'],characterId:'amo'});
    expect(trace.finalScore).toBe('297'); // H22; M(1*3/2+2+1)*3=27/2.
    expect(trace.events.filter(e=>e.phase==='onHeldCard').map(e=>[e.sourceInstanceId,e.targetCardId,e.after.M])).toEqual([
      ['voice','voice',fraction('9','2')],
    ]);
    expect(trace.events.some(e=>['gold','heat','lucky','glass'].includes(e.sourceInstanceId))).toBe(false);
    expect(trace.goldDelta).toBe(0);
    expect(trace.destroyedCardIds).toEqual([]);
    expect(trace.rng).toEqual(cursor(3043895566)); // Only the active glass draws.
  });

  it('leaves disabled cards in the hand identity but disables their enhancement and edition', () => {
    const hand=[card('8s',8,'spades',{enhancement:'lucky-paper',edition:'polychrome'}),
      card('8h',8,'hearts',{enhancement:'multiplier-paper',edition:'foil'})];
    const trace=score(hand,{disabledIds:['8s']});
    expect(trace.handType).toBe('pair');
    expect(trace.sets.scoringIds).toEqual(['8s','8h']);
    expect(trace.sets.activeScoringIds).toEqual(['8h']);
    expect(trace.finalScore).toBe('272'); // (35+8+25)*(2+2).
    expect(trace.events.some(e=>e.targetCardId==='8s')).toBe(false);
    expect(trace.goldDelta).toBe(0);
    expect(trace.rng).toEqual(cursor(1212329753));
    expect(score([card('two',2),card('held',13,'hearts',{enhancement:'voice-paper',edition:'polychrome'})],{
      selectedIds:['two'],disabledIds:['held'],
    }).finalScore).toBe('22');
  });

  it('suppresses only ordinary points while keeping enhancement, edition and active membership', () => {
    const hand=[card('2',2),card('3',3,'hearts'),card('4',4),
      card('5',5,'hearts',{enhancement:'heat-paper',edition:'foil'}),
      card('6',6,'clubs',{enhancement:'multiplier-paper',edition:'polychrome'})];
    const trace=score(hand,{ordinaryPointsSuppressedIds:['5','6']});
    expect(trace.handType).toBe('straight');
    expect(trace.sets.activeScoringIds).toEqual(hand.map(c=>c.id));
    expect(trace.finalScore).toBe('1611'); // H125+2+3+4+20+25=179; M(4+2)*3/2=9.
    expect(trace.events.filter(e=>e.operation==='ordinary-points-suppressed').map(e=>e.targetCardId)).toEqual(['5','6']);
    expect(trace.accumulator).toEqual({H:fraction('179'),M:fraction('9')});
  });
});

describe('C01 retrigger and post-score glass boundaries', () => {
  it('repeats poker edition with encore but never regenerates encore at depth1', () => {
    const trace=score([card('two',2,'spades',{enhancement:'encore-paper',edition:'polychrome'})]);
    expect(trace.finalScore).toBe('54'); // (20+2+2)*(3/2)^2.
    expect(trace.events.filter(e=>e.operation==='retrigger-card')).toHaveLength(1);
    expect(trace.events.filter(e=>e.operation==='multiply-multiplier').map(e=>e.retriggerDepth)).toEqual([0,1]);
    const root=trace.events.find(e=>e.sourceType==='card' && e.operation==='add-heat' && e.retriggerDepth===0)!;
    expect(trace.events.filter(e=>e.retriggerDepth===1).every(e=>e.rootEventId===root.eventId)).toBe(true);
  });

  it('counts the enhancement and all Joker repeat sources against the same four-extra cap', () => {
    const definitions:R2JokerDefinition[]=['test-many','test-later'].map((id):R2JokerDefinition=>({
      id,name:id,rarity:'rare',description:'Contract cap fixture',hooks:[
        {phase:'onCardScore',condition:{kind:'always'},operations:[{kind:'retrigger-card',count:4}]},
      ],
    }));
    const trace=score([card('two',2,'spades',{enhancement:'encore-paper',edition:'polychrome'})],{
      definitions,jokers:definitions.map(d=>owned(d.id)),
    });
    expect(trace.finalScore).toBe('227'); // floor((20+5*2)*(3/2)^5)=floor(7290/32).
    expect(trace.accumulator).toEqual({H:fraction('30'),M:fraction('243','32')});
    expect(trace.events.filter(e=>e.operation==='add-heat' && e.sourceType==='card')).toHaveLength(5);
    const cues=trace.events.filter(e=>e.operation==='retrigger-card');
    expect(cues.reduce((sum,e)=>sum+Number(e.value.n)/Number(e.value.d),0)).toBe(4);
    expect(cues.every(e=>e.retriggerDepth===0)).toBe(true);
    expect(trace.events.some(e=>e.operation==='retrigger-cap')).toBe(true);
    expect(trace.events.every(e=>e.retriggerDepth<=1)).toBe(true);
    expect(trace.events.length).toBeLessThanOrEqual(512);
  });

  it.each([
    ['c01-glass-4',1413661181,50419920,3245226994,['two']],
    ['c01-glass-8',1212329753,3127946321,3043895566,[]],
  ] as const)('uses one post-score glass draw per active instance under retriggers: %s',
    (seed, initial, firstWord, after, destroyed) => {
      // These RNG vectors were fixed without running scoreR2Hand. For glass-8
      // the next word370096316 would break: taking a second repeat draw is wrong.
      const vector=new SeededRng(seed);
      expect(vector.snapshot()).toEqual(cursor(initial));
      expect(vector.next()*4294967296).toBe(firstWord);
      const request=input([card('two',2,'spades',{enhancement:'glass-paper',edition:'polychrome'})],{
        playIndex:2,jokers:[owned('d04')],rng:cursor(initial),
      });
      const before=JSON.stringify(request), trace=resolve(request);
      expect(trace.finalScore).toBe('121'); // H24; M(3/2*3/2)^2=81/16, one final floor.
      expect(trace.accumulator).toEqual({H:fraction('24'),M:fraction('81','16')});
      expect(trace.destroyedCardIds).toEqual(destroyed);
      expect(trace.rng).toEqual(cursor(after));
      const finalIndex=trace.events.findIndex(e=>e.phase==='finalScore');
      expect(trace.events.filter(e=>e.phase==='afterHand').every(e=>!changesMath(e))).toBe(true);
      if(destroyed.length)expect(trace.events.slice(finalIndex+1).some(e=>e.targetCardId==='two')).toBe(true);
      expect(resolve(JSON.parse(before))).toEqual(trace);
      expect(JSON.stringify(request)).toBe(before);
    });

  it('draws glasses after a character wager, in original active-card order', () => {
    const hand=[card('8s',8,'spades',{enhancement:'glass-paper'}),card('8h',8,'hearts',{enhancement:'glass-paper'})];
    const vector=new SeededRng('c01-glass-9');
    expect(vector.snapshot()).toEqual(cursor(1195552134));
    expect([vector.next(),vector.next(),vector.next()].map(v=>v*4294967296)).toEqual([3576129063,304537204,3425605599]);
    const trace=score(hand,{characterId:'touye',wager:true,rng:cursor(1195552134)});
    // glass-9 words: wager3576129063 (>1/2), firstglass304537204 (<1/4), second3425605599 (>1/4).
    // H51; M2*(3/2)^2*3/4=27/8. Finalfloor(1377/8)=172.
    expect(trace.finalScore).toBe('172');
    expect(trace.destroyedCardIds).toEqual(['8s']);
    expect(trace.rng).toEqual(cursor(2395282277));
    const finalIndex=trace.events.findIndex(e=>e.phase==='finalScore');
    expect(trace.events.slice(finalIndex+1).some(e=>e.phase==='afterHand' && e.targetCardId==='8s')).toBe(true);
    expect(trace.events.filter(e=>e.phase==='afterHand').every(e=>!changesMath(e))).toBe(true);
  });
});

describe('C01 independently fixed lucky RNG vectors and resource trace', () => {
  it.each([
    ['c01-lucky-0',2982539781,3705074777,983851511,2350704111,'22',0],
    ['c01-lucky-2',2948984543,136151705,1613166201,2317148873,'110',0],
    ['c01-lucky-11',2325297529,1844197455,216234279,1693461859,'22',10],
    ['c01-lucky-189',2068216773,438618059,168776031,1436381103,'110',10],
  ] as const)('takes independent multiplier then gold draws for %s', (seed, initial, multiplierWord, goldWord, after, expected, goldDelta) => {
    const vector=new SeededRng(seed);
    expect(vector.snapshot()).toEqual(cursor(initial));
    expect([vector.next(),vector.next()].map(v=>v*4294967296)).toEqual([multiplierWord,goldWord]);
    const request=input([card('two',2,'spades',{enhancement:'lucky-paper'})],{gold:7,rng:cursor(initial)});
    const before=JSON.stringify(request), trace=resolve(request);
    expect(trace.finalScore).toBe(expected); // H22; M1 or1+4=5. Gold never enters H/M.
    expect(trace.goldDelta).toBe(goldDelta);
    expect(trace.destroyedCardIds).toEqual([]);
    expect(trace.rng).toEqual(cursor(after));
    const payouts=trace.events.filter(e=>e.operation==='add-gold' && Number(e.value.n)>0);
    expect(payouts.map(e=>[e.sourceInstanceId,e.targetCardId,e.resourceBefore,e.resourceAfter])).toEqual(
      goldDelta ? [['two','two',7,17]] : [],
    );
    expect(payouts.every(e=>!changesMath(e))).toBe(true);
    expect(resolve(JSON.parse(before))).toEqual(trace);
    expect(JSON.stringify(request)).toBe(before);
  });

  it('makes a fresh pair of lucky draws for a repeat rather than reusing the first result', () => {
    const trace=score([card('two',2,'spades',{enhancement:'lucky-paper'})],{
      playIndex:2,jokers:[owned('d04')],rng:cursor(2982539781),
    });
    // lucky-0 first trial misses both; repeat words321020913/3956751457 hit only M.
    expect(trace.finalScore).toBe('120'); // (20+2+2)*(1+4).
    expect(trace.goldDelta).toBe(0);
    expect(trace.rng).toEqual(cursor(1718868441));
    expect(trace.events.filter(e=>e.operation==='add-multiplier').map(e=>[e.targetCardId,e.retriggerDepth,e.value])).toEqual([
      ['two',1,fraction('4')],
    ]);
  });

  it('caps hand gold at20 but still consumes both draws on the capped third lucky execution', () => {
    const trace=score([card('8s',8,'spades',{enhancement:'lucky-paper'}),card('8h',8,'hearts')],{
      playIndex:2,jokers:[owned('d04'),owned('b06')],gold:7,rng:cursor(3194435765),
    });
    // lucky-5768 has three gold hits, but only the first M hit. First8 executes
    // three times, second8 twice: H35+5*8=75; M2+4=6 gives450.
    expect(trace.finalScore).toBe('450');
    expect(trace.goldDelta).toBe(20);
    expect(trace.rng).toEqual(cursor(1298928755));
    const payouts=trace.events.filter(e=>e.operation==='add-gold' && Number(e.value.n)>0);
    expect(payouts.map(e=>[e.resourceBefore,e.resourceAfter])).toEqual([[7,17],[17,27]]);
    expect(payouts.every(e=>!changesMath(e))).toBe(true);
  });

  it('uses the hand-start gold snapshot for E03/E08/F04 even when lucky gold pays during the hand', () => {
    const hand=[card('two',2,'spades',{enhancement:'lucky-paper'})], rng=cursor(2325297529);
    expect(score(hand,{rng,gold:19,jokers:[owned('e03'),owned('e08')]}).finalScore).toBe('60'); // (22+2*19)*1; E08 misses.
    const trace=score(hand,{rng,gold:3,jokers:[owned('f04')]});
    expect(trace.finalScore).toBe('88'); // 22*(1+3); lucky gold does not erase F04.
    expect(trace.goldDelta).toBe(10);
    expect(trace.events.find(e=>e.operation==='add-gold')?.resourceAfter).toBe(13);
  });

  it('rejects duplicate card selections without changing lucky input or its cursor', () => {
    const request=input([card('two',2,'spades',{enhancement:'lucky-paper'})],{
      selectedIds:['two','two'],rng:cursor(2068216773),
    }), before=JSON.stringify(request);
    expect(()=>resolve(request)).toThrow('invalid-selection');
    expect(JSON.stringify(request)).toBe(before);
  });
});

describe('C01 public previews expose possible bounds without future outcomes', () => {
  it('keeps one deterministic score or two wager outcomes and exposes the same exact range', () => {
    const ordinary=previewR2Hand(publicRequest(input([card('two',2)]))) as ContractPreview;
    expect(ordinary.possibleScores).toEqual(['22']);
    expect(ordinary.scoreRange).toEqual({minimum:'22',maximum:'22'});
    const wager=previewR2Hand(publicRequest(input([card('king',13)],{characterId:'touye',wager:true}))) as ContractPreview;
    expect(wager.possibleScores.map(s=>BigInt(s)).sort((a,b)=>a<b?-1:a>b?1:0)).toEqual([22n,60n]);
    expect(wager.scoreRange).toEqual({minimum:'22',maximum:'60'});
  });

  it('exposes lucky score bounds rather than one synthetic roll and never consumes a real cursor', () => {
    const hand=[card('two',2,'spades',{enhancement:'lucky-paper'})];
    const request=input(hand,{rng:cursor(2068216773)}), before=JSON.stringify(request), expected=resolve(request);
    const preview=previewR2Hand(publicRequest(request)) as ContractPreview;
    expect(bounds(preview)).toEqual([22n,110n]);
    expect(preview.possibleScores).toEqual(['22','110']);
    expect(preview.scoreRange).toEqual({minimum:'22',maximum:'110'});
    expect(preview.randomEffects).toBeDefined();
    expect(JSON.stringify(preview.randomEffects)).not.toMatch(/"(?:rng|state|destroyedCardIds)"\s*:/);
    expect(Object.hasOwn(preview,'rng')).toBe(false);
    expect(Object.hasOwn(preview,'destroyedCardIds')).toBe(false);
    for(let i=0;i<100;i++)expect(previewR2Hand(publicRequest(request))).toEqual(preview);
    expect(JSON.stringify(request)).toBe(before);
    expect(resolve(request)).toEqual(expected);
    expect(previewR2Hand(publicRequest({...request,rng:cursor(2982539781)}))).toEqual(preview);
  });

  it('bounds all repeated lucky triggers together with the two public wager outcomes', () => {
    const request=input([card('two',2,'spades',{enhancement:'lucky-paper'})],{
      playIndex:2,jokers:[owned('d04')],characterId:'touye',wager:true,
    });
    // Two lucky executions: H24, M1..9; wager3/4 or2 gives18..432.
    const preview=previewR2Hand(publicRequest(request)) as ContractPreview;
    expect(bounds(preview)).toEqual([18n,432n]);
    expect(preview.possibleScores).toEqual(['18','432']);
    expect(preview.scoreRange).toEqual({minimum:'18',maximum:'432'});
  });

  it('never discloses which glass instance will break and keeps its current score deterministic', () => {
    const hand=[card('two',2,'spades',{enhancement:'glass-paper',edition:'polychrome'})];
    const a=previewR2Hand(publicRequest(input(hand,{rng:cursor(1413661181)}))) as ContractPreview;
    const b=previewR2Hand(publicRequest(input(hand,{rng:cursor(1212329753)})));
    expect(a).toEqual(b);
    expect(bounds(a)).toEqual([49n,49n]);
    expect(a.possibleScores).toEqual(['49']);
    expect(a.scoreRange).toEqual({minimum:'49',maximum:'49'});
    expect(a.randomEffects).toBeDefined();
    expect(JSON.stringify(a.randomEffects)).not.toMatch(/"(?:rng|state|destroyedCardIds)"\s*:/);
    expect(Object.hasOwn(a,'rng')).toBe(false);
    expect(Object.hasOwn(a,'destroyedCardIds')).toBe(false);
  });
});
