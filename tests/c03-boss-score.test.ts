import {describe,expect,it} from 'vitest';
import type {PlayingCard,Rank,Suit} from '../src/cards/types';
import {R2_JOKERS,type R2JokerInstance} from '../src/content/r2Schema';
import type {RngSnapshot} from '../src/core/SeededRng';
import type {R2NominalBossId} from '../src/domain/r2Chapter';
import type {R2HandType} from '../src/domain/evaluateR2';
import {previewR2Hand,r2ScoringDisabledJokerIds,scoreR2Hand,SCORE_OPERATIONS,type ScoreInput,type ScoreTrace} from '../src/domain/scoreR2';

// D29 independent literals. No production scorer/arithmetic computes expectations.
// The nominal ID union permits runtime RED before the finite registry is expanded.
type Boss={definitionId:R2NominalBossId;disabledSuit:Suit|null};
type BossInput=ScoreInput&{boss?:Boss|null;sealedJokerIds?:readonly string[]};
type BossTrace=ScoreTrace&{bossContext:{boss:Boss|null;previousHandType:R2HandType|null;sealedJokerIds:string[]}};
const f=(n:string,d='1')=>({n,d});
const cursor=(state=0):RngSnapshot=>({algorithm:'fnv1a-mulberry32-v1',state});
const boss=(definitionId:R2NominalBossId):Boss=>({definitionId,disabledSuit:null});
const card=(id:string,rank:Rank,suit:Suit='spades',extra:Partial<PlayingCard>={}):PlayingCard=>({id,rank,suit,...extra});
const owned=(definitionId:string,extra:Partial<R2JokerInstance>={}):R2JokerInstance=>({
  instanceId:`owned/${definitionId}`,definitionId,paidPrice:4,growth:{},...extra,
});
const single=[card('two',2)];
const pair=[card('two-s',2),card('two-h',2,'hearts')];
function input(hand:readonly PlayingCard[]=single,extra:Partial<BossInput>={}):BossInput {
  return {rulesVersion:'r2',runId:'c03',rootId:'c03/hand',characterId:'neutral',hand,selectedIds:hand.map(c=>c.id),disabledIds:[],
    jokers:[],definitions:R2_JOKERS,handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,gold:0,rng:cursor(),...extra};
}
const resolve=(request:BossInput):BossTrace=>scoreR2Hand(request) as BossTrace;
const score=(extra:Partial<BossInput>={},hand:readonly PlayingCard[]=single)=>resolve(input(hand,extra));
const publicInput=({rng:_rng,...request}:BossInput)=>request;

describe('C03 Boss base and role literal goldens',()=>{
  it('keeps omitted Boss and Jokers ordinary and saves an explicit immutable empty context',()=>{
    const trace=score();expect(trace.finalScore).toBe('22');expect(trace.sourceJokers).toEqual([]);
    expect(trace.bossContext).toEqual({boss:null,previousHandType:null,sealedJokerIds:[],challengeDisabledJokerId:null});
    expect(Object.isFrozen(trace.bossContext)).toBe(true);expect(Object.isFrozen(trace.bossContext.sealedJokerIds)).toBe(true);
    expect(SCORE_OPERATIONS).toContain('halve-base-heat');expect(SCORE_OPERATIONS).toContain('seal-joker');
  });
  it.each([[null,'22'],['pair','22'],['high-card','12']] as const)
    ('B05 only halves a repeated hand type (previous %s)',(previousHandType,expected)=>{
      const trace=score({boss:boss('B05'),previousHandType});expect(trace.finalScore).toBe(expected);
      expect(trace.events.filter(event=>event.operation==='halve-base-heat')).toHaveLength(previousHandType==='high-card'?1:0);
      if(previousHandType==='high-card')expect(trace.events.slice(0,2).map(event=>[
        event.phase,event.sourceType,event.sourceDefinitionId,event.operation,event.value,event.after,
      ])).toEqual([
        ['base','rule','high-card','base',f('20'),{H:f('20'),M:f('1')}],
        ['base','rule','B05','halve-base-heat',f('1','2'),{H:f('10'),M:f('1')}],
      ]);
    });
  it.each(['B05','B12'] as const)('%s halves only the level-derived base before independent poker and Joker H',(id)=>{
    const hand=[card('red-two',2,'hearts',{enhancement:'heat-paper',edition:'foil'})];
    const request=input(hand,{boss:boss(id),previousHandType:'high-card',handLevels:{'high-card':3},jokers:[owned('c02')]});
    const trace=resolve(request);
    // L3 H40/2 +rank2 +heat20 +foil25 +red8=75; L3 M3/2; floor112.5=112.
    expect(trace.finalScore).toBe('112');expect(trace.accumulator).toEqual({H:f('75'),M:f('3','2')});
    expect(trace.events.filter(event=>event.phase==='base').map(event=>event.after)).toEqual([
      {H:f('40'),M:f('3','2')},{H:f('20'),M:f('3','2')},
    ]);
    expect(previewR2Hand(publicInput(request)).base).toEqual({H:f('20'),M:f('3','2')});
  });
  it.each([[1,'43','35','2','2'],[3,'109','65','2','3']] as const)
    ('B12 retains the exact fractional pair base at level %s',(level,expected,n,d,m)=>{
      const trace=score({boss:boss('B12'),handLevels:{pair:level}},pair);
      // L1 (35/2+2+2)*2=43; L3 (65/2+4)*3=109.5 ->109.
      expect(trace.finalScore).toBe(expected);expect(trace.events[1].after).toEqual({H:f(n,d),M:f(m)});
    });
  it.each([
    ['amo',single,{'high-card':3},null,4,'63'], // (40+2)*3/2; starting level survives.
    ['erxiang',pair,{},null,4,'78'], // (35+4)*2.
    ['laohuan',[2,4,6,8,10].map(rank=>card(`flush-${rank}`,rank as Rank,'hearts')),{},null,4,'680'], //170*4.
    ['azao',single,{},'pair',4,'22'],['touye',single,{},null,4,'22'],['xiemu',single,{},null,1,'22'],
  ] as const)('B08 suppresses only %s characterScore',(characterId,hand,handLevels,previousHandType,handsBeforePlay,expected)=>{
    const request=input(hand,{boss:boss('B08'),characterId,handLevels,previousHandType,handsBeforePlay});
    const trace=resolve(request);expect(trace.finalScore).toBe(expected);expect(trace.rng).toEqual(cursor());
    expect(trace.events.filter(event=>event.phase==='characterScore')).toEqual([]);
    const preview=previewR2Hand(publicInput(request));expect(preview.possibleScores).toEqual([expected]);expect(preview.randomEffects).toEqual([]);
  });
  it('B08 rejects wager before any rule draw and never advertises it in a public preview',()=>{
    const request=input(single,{boss:boss('B08'),characterId:'touye',wager:true});const before=JSON.stringify(request);
    expect(()=>resolve(request)).toThrow('wager-disabled-by-boss');
    expect(()=>previewR2Hand(publicInput(request))).toThrow('wager-disabled-by-boss');expect(JSON.stringify(request)).toBe(before);
  });
  it.each([
    {sealedJokerIds:null},{sealedJokerIds:['']},{sealedJokerIds:['duplicate','duplicate']},{sealedJokerIds:Array.from({length:6},(_,i)=>`entry/${i}`)},
    {boss:{definitionId:'B17',disabledSuit:null}},{boss:{definitionId:'B03',disabledSuit:null}},
  ])('rejects malformed Boss provenance before committing score or RNG (%j)',(invalid)=>{
    const request=input(single,{boss:boss('B15')});Object.assign(request,invalid);const before=JSON.stringify(request);
    expect(()=>resolve(request)).toThrow('invalid-score-boss-context');expect(JSON.stringify(request)).toBe(before);
  });
  it('retains all five sealed entry identities after their Jokers have been destroyed',()=>{
    const sealedJokerIds=Array.from({length:5},(_,i)=>`entry/${i}`);
    const trace=score({boss:boss('B15'),sealedJokerIds,jokers:[]});
    expect(trace.finalScore).toBe('22');expect(trace.sourceJokers).toEqual([]);expect(trace.bossContext.sealedJokerIds).toEqual(sealedJokerIds);
  });
});

describe('C03 finite Joker scoring bans and unchanged non-math lifecycle',()=>{
  it('B06 disables current slots two and four; moving a common scorer to slot one restores it',()=>{
    const jokers=[owned('a04'),owned('pengci'),owned('d06'),owned('e02'),owned('e04')];
    expect(r2ScoringDisabledJokerIds(boss('B06'),jokers,R2_JOKERS,[])).toEqual(['owned/pengci','owned/e02']);
    const barred=score({boss:boss('B06'),jokers});expect(barred.finalScore).toBe('22');expect(barred.sourceJokers).toEqual(jokers);
    const reordered=[jokers[1],jokers[0],...jokers.slice(2)];
    expect(score({boss:boss('B06'),jokers:reordered}).finalScore).toBe('66'); //22*(1+2).
  });
  it('B06 suppresses on-card Joker math and its edition while poker enhancement and edition still run',()=>{
    const hand=[card('ace',14,'hearts',{enhancement:'heat-paper',edition:'foil'})];
    const trace=score({boss:boss('B06'),jokers:[owned('e02'),owned('tiesuanpan',{edition:'holographic'})]},hand);
    // H20+Ace11+paper20+foil25=76, M1. No tie25 or Joker holo2.
    expect(trace.finalScore).toBe('76');expect(trace.accumulator).toEqual({H:f('76'),M:f('1')});
    expect(trace.events.filter(event=>event.sourceDefinitionId==='tiesuanpan')).toEqual([]);
  });
  it('B06 suppresses held Joker hooks but retains held enhancement, without activating held edition',()=>{
    const hand=[...single,card('held-king',13,'hearts',{enhancement:'voice-paper',edition:'holographic'})];
    const trace=score({boss:boss('B06'),selectedIds:['two'],jokers:[owned('e02'),owned('a10',{edition:'foil'})]},hand);
    expect(trace.finalScore).toBe('44');expect(trace.accumulator).toEqual({H:f('22'),M:f('2')}); //22*(1+1 held voice).
    expect(trace.events.filter(event=>event.sourceDefinitionId==='a10')).toEqual([]);
    expect(trace.events.filter(event=>event.targetCardId==='held-king').map(event=>event.reasonKey)).toEqual(['enhancement.voice-paper.add-multiplier']);
  });
  it('a banned C05 never consumes pendingHeat; the next unbanned hand can consume all forty',()=>{
    const barred=score({boss:boss('B06'),jokers:[owned('e02'),owned('c05',{growth:{pendingHeat:f('40')}})]});
    expect(barred.finalScore).toBe('22');expect(barred.jokers[1].growth.pendingHeat).toEqual(f('40'));
    expect(barred.events.some(event=>event.operation==='consume-growth')).toBe(false);
    const next=score({boss:null,jokers:barred.jokers});expect(next.finalScore).toBe('62');expect(next.jokers[1].growth.pendingHeat).toEqual(f('0'));
  });
  it('a banned B10 still grows after a pair and only its current math is absent',()=>{
    const trace=score({boss:boss('B06'),jokers:[owned('e02'),owned('b10',{growth:{heat:f('10')}})]},pair);
    expect(trace.finalScore).toBe('78');expect(trace.jokers[1].growth.heat).toEqual(f('15'));
    expect(trace.events.filter(event=>event.sourceDefinitionId==='b10').map(event=>[event.phase,event.operation,event.value])).toEqual([['afterHand','add-growth',f('5')]]);
  });
  it('B15 follows sealed instance IDs through reorder, leaving other scoring sources active',()=>{
    const j=[owned('pengci'),owned('f06')],sealed=['owned/pengci'];
    expect(score({boss:boss('B15'),jokers:j,sealedJokerIds:sealed}).finalScore).toBe('44'); //22*2.
    expect(score({boss:boss('B15'),jokers:[...j].reverse(),sealedJokerIds:sealed}).finalScore).toBe('44');
    expect(r2ScoringDisabledJokerIds(boss('B15'),[...j].reverse(),R2_JOKERS,sealed)).toEqual(['owned/pengci']);
    expect(score({boss:boss('B15'),jokers:j,sealedJokerIds:[]}).finalScore).toBe('132'); //22*(1+2)*2.
  });
  it('B15 preserves an already destroyed entry in the start seal context without banning new instances',()=>{
    const trace=score({boss:boss('B15'),jokers:[owned('pengci')],sealedJokerIds:['entry/destroyed']});
    expect(trace.finalScore).toBe('66');expect(trace.bossContext.sealedJokerIds).toEqual(['entry/destroyed']);
    expect(r2ScoringDisabledJokerIds(boss('B15'),trace.sourceJokers,R2_JOKERS,['entry/destroyed'])).toEqual([]);
  });
  it('B16 stops rare F06 math and polychrome but still expires it on its fourth hand',()=>{
    const trace=score({boss:boss('B16'),jokers:[owned('pengci'),owned('f06',{edition:'polychrome',counters:{handsScored:3}})]});
    expect(trace.finalScore).toBe('66');expect(trace.destroyedJokerIds).toEqual(['owned/f06']);expect(trace.jokers.map(joker=>joker.definitionId)).toEqual(['pengci']);
    expect(trace.sourceJokers.map(joker=>[joker.definitionId,joker.edition,joker.counters])).toEqual([
      ['pengci',undefined,undefined],['f06','polychrome',{handsScored:3}],
    ]);
    expect(trace.events.filter(event=>event.sourceDefinitionId==='f06').map(event=>event.operation)).toEqual(['increment-hands-scored','destroy-joker']);
    expect(trace.rng).toEqual(cursor());
  });
  it('B16 retains the static rare C09 four-flush recognition',()=>{
    const hand=[2,4,6,8].map(rank=>card(`heart-${rank}`,rank as Rank,'hearts'));
    const trace=score({boss:boss('B16'),jokers:[owned('c09',{edition:'polychrome'})]},hand);
    expect(trace.handType).toBe('flush');expect(trace.finalScore).toBe('640'); // (140+2+4+6+8)*4.
    expect(trace.sets.activeScoringIds).toEqual(hand.map(c=>c.id));expect(trace.events.some(event=>event.sourceDefinitionId==='c09')).toBe(false);
  });
  it('B16 stops rare retriggers and coefficient reads while retaining a poker encore and foil',()=>{
    const trace=score({boss:boss('B16'),jokers:[owned('a11',{edition:'polychrome'}),owned('e11',{growth:{coefficient:f('2')},edition:'holographic'})]},
      [card('two',2,'spades',{enhancement:'encore-paper',edition:'foil'})]);
    expect(trace.finalScore).toBe('74'); //20+2*(rank2+foil25), M1.
    expect(trace.events.filter(event=>event.sourceType==='joker')).toEqual([]);
    expect(trace.events.filter(event=>event.sourceDefinitionId==='rank-2')).toHaveLength(2);expect(trace.jokers[1].growth.coefficient).toEqual(f('2'));
  });
});

describe('C03 per-slot reversal, random transparency and immutable start provenance',()=>{
  it('B13 reverses each jokerScore body together with that slot edition',()=>{
    const jokers=[owned('pengci'),owned('f06',{edition:'polychrome'})];
    expect(score({jokers}).finalScore).toBe('198'); //22*(1+2)*2*1.5.
    const trace=score({boss:boss('B13'),jokers});expect(trace.finalScore).toBe('110'); //22*(1*2*1.5+2).
    expect(trace.events.filter(event=>event.phase==='jokerScore').map(event=>[event.sourceDefinitionId,event.operation,event.after.M])).toEqual([
      ['f06','multiply-multiplier',f('2')],['f06','multiply-multiplier',f('3')],['pengci','add-multiplier',f('5')],
    ]);
    expect(trace.sourceJokers).toEqual(jokers);expect(trace.jokers.map(j=>j.instanceId)).toEqual(jokers.map(j=>j.instanceId));
  });
  it('B13 leaves on-card and held hook order intact before reversed editions',()=>{
    const hand=[card('ace',14,'hearts'),card('held-king',13,'clubs',{enhancement:'voice-paper'})];
    const trace=score({boss:boss('B13'),selectedIds:['ace'],jokers:[owned('c02',{edition:'polychrome'}),owned('tiesuanpan',{edition:'holographic'}),owned('a10'),owned('d01')]},hand);
    // H20+11+8+25=64; M1+voice1+A10 1+D01 .5=7/2; reversed holo+2 then poly*1.5=33/4.
    expect(trace.finalScore).toBe('528');expect(trace.accumulator).toEqual({H:f('64'),M:f('33','4')});
    expect(trace.events.filter(event=>event.phase==='onCardScore'&&event.sourceType==='joker').map(event=>event.sourceDefinitionId)).toEqual(['c02','tiesuanpan']);
    expect(trace.events.filter(event=>event.phase==='onHeldCard'&&event.sourceType==='joker').map(event=>event.sourceDefinitionId)).toEqual(['a10','d01']);
    expect(trace.events.filter(event=>event.phase==='jokerScore').map(event=>event.sourceDefinitionId)).toEqual(['tiesuanpan','c02']);
  });
  it('a banned F08 uses no draw or preview chance while lucky and glass retain their fixed sequence',()=>{
    const hand=[card('lucky',8,'spades',{enhancement:'lucky-paper'}),card('glass',8,'hearts',{enhancement:'glass-paper'})];
    const request=input(hand,{boss:boss('B15'),jokers:[owned('f08',{edition:'holographic'})],sealedJokerIds:['owned/f08']});
    const trace=resolve(request);
    // Literal mulberry vector: 1144304738 misses lucky M; 1416247 hits gold;
    // third 958946056 now breaks glass. No F08 draw/edition. H51*M3=153.
    expect(trace.finalScore).toBe('153');expect(trace.goldDelta).toBe(10);expect(trace.destroyedCardIds).toEqual(['glass']);
    expect(trace.rng).toEqual(cursor(1199730143));
    expect(trace.events.filter(event=>event.operation.endsWith('-check')).map(event=>event.operation)).toEqual(['lucky-multiplier-check','lucky-gold-check','glass-check']);
    expect(trace.events.some(event=>event.sourceDefinitionId==='f08')).toBe(false);
    const visible=publicInput(request);Object.defineProperty(visible,'rng',{get(){throw Error('preview-read-hidden-rng');}});
    const before=JSON.stringify(request),preview=previewR2Hand(visible);
    expect(preview.scoreRange).toEqual({minimum:'153',maximum:'459'});expect(preview.possibleScores).toEqual(['153','459']);
    expect(preview.randomEffects.map(effect=>effect.kind)).toEqual(['lucky-paper','glass-paper']);expect(JSON.stringify(request)).toBe(before);
    expect(JSON.stringify(preview)).not.toMatch(/rng|sealedJokerIds|destroyedCardIds|f08/);
  });
  it.each(['B06','B15'] as const)('%s makes an exclusively banned F08 deterministic without advancing rule RNG',(id)=>{
    const request=input(single,{boss:boss(id),jokers:id==='B06'?[owned('e02'),owned('f08')]:[owned('f08')],sealedJokerIds:id==='B15'?['owned/f08']:[]});
    expect(resolve(request).finalScore).toBe('22');expect(resolve(request).rng).toEqual(cursor());
    const preview=previewR2Hand(publicInput(request));expect(preview.possibleScores).toEqual(['22']);expect(preview.scoreRange).toEqual({minimum:'22',maximum:'22'});expect(preview.randomEffects).toEqual([]);
  });
  it('deep-freezes exact Boss, previous-type and seal provenance before afterHand destruction or caller mutation',()=>{
    const activeBoss=boss('B15'),sealed=['owned/f06'],jokers=[owned('pengci',{edition:'polychrome'}),owned('f06',{edition:'holographic',counters:{handsScored:3}})];
    const request=input(single,{boss:activeBoss,previousHandType:'pair',sealedJokerIds:sealed,jokers});const trace=resolve(request);
    expect(trace.finalScore).toBe('99');expect(trace.jokers.map(j=>j.definitionId)).toEqual(['pengci']);
    activeBoss.definitionId='B05';sealed[0]='other';request.previousHandType='high-card';jokers[1].edition='none';jokers[1].counters!.handsScored=0;
    expect(trace.bossContext).toEqual({boss:{definitionId:'B15',disabledSuit:null},previousHandType:'pair',sealedJokerIds:['owned/f06'],challengeDisabledJokerId:null});
    expect(trace.sourceJokers[1]).toMatchObject({edition:'holographic',counters:{handsScored:3}});
    expect(trace.bossContext.boss).not.toBe(activeBoss);expect(trace.bossContext.sealedJokerIds).not.toBe(sealed);
    for(const value of [trace.bossContext,trace.bossContext.boss,trace.bossContext.sealedJokerIds,trace.sourceJokers,trace.sourceJokers[1].counters])expect(Object.isFrozen(value)).toBe(true);
  });
});
