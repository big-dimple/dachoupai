import {describe, expect, it} from 'vitest';
import type {Edition, PlayingCard, Rank, Suit} from '../src/cards/types';
import {R2_JOKERS, type R2JokerInstance} from '../src/content/r2Schema';
import type {RngSnapshot} from '../src/core/SeededRng';
import {evaluateR2Hand} from '../src/domain/evaluateR2';
import {previewR2Hand, scoreR2Hand, type ScoreInput} from '../src/domain/scoreR2';

// D26 literal arithmetic goldens precede the production catalog/resolver.
// No scorer output or production arithmetic computes an expected score.
type C02Input = ScoreInput & {stageHeatBefore?:string; stageTargetHeat?:string};
const f = (n:string, d='1') => ({n,d});
const cursor = (state:number):RngSnapshot => ({algorithm:'fnv1a-mulberry32-v1',state});
const card = (id:string,rank:Rank,suit:Suit='spades',extra:Partial<PlayingCard>={}):PlayingCard => ({id,rank,suit,...extra});
const owned = (definitionId:string,extra:Partial<R2JokerInstance>={}):R2JokerInstance => ({
  instanceId:`owned/${definitionId}`,definitionId,paidPrice:4,
  growth:['e11','f12'].includes(definitionId)?{coefficient:f('1')}:{},...extra,
});
function input(hand:readonly PlayingCard[],ids:string[]=[],extra:Partial<C02Input>={}):C02Input {
  return {rulesVersion:'r2',runId:'c02',rootId:'c02/hand',characterId:'neutral',hand,
    selectedIds:hand.map(c=>c.id),disabledIds:[],jokers:ids.map(id=>owned(id)),definitions:R2_JOKERS,
    handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,gold:0,
    rng:cursor(0),...extra};
}
const score = (hand:readonly PlayingCard[],ids:string[]=[],extra:Partial<C02Input>={}) => scoreR2Hand(input(hand,ids,extra));
const single = [card('two',2)];
const pair = [card('8s',8),card('8h',8,'hearts')];
const straight = [card('2s',2),card('3h',3,'hearts'),card('4c',4,'clubs'),card('5d',5,'diamonds'),card('6s',6)];
const flush = [2,4,6,8,10].map(rank=>card(`flush-${rank}`,rank as Rank));
const publicInput = ({rng:_rng,...request}:C02Input) => request;

describe('C02 literal score, set and ordering goldens',()=>{
  it.each([
    [single,'44'],
    [[card('two',2),card('nine',9,'hearts')],'58'],
    [[card('two',2),card('five',5,'clubs'),card('nine',9,'hearts')],'29'],
  ] as const)('A09 reads the number played even when only one card scores (%s)',(hand,expected)=>{
    // (20+2)*2; (20+9)*2; (20+9)*1.
    expect(score(hand,['a09']).finalScore).toBe(expected);
  });

  it('A10 uses the first three valid held faces in public hand order, excludes aces and requires one played',()=>{
    const hand=[...single,card('ace',14),card('j0',11),card('q0',12),card('k0',13),card('j1',11)];
    const result=score(hand,['a10'],{selectedIds:['two'],disabledIds:['j0']});
    expect(result.finalScore).toBe('88'); // 22*(1+1+1+1).
    expect(result.events.filter(e=>e.sourceDefinitionId==='a10').map(e=>e.targetCardId)).toEqual(['q0','k0','j1']);
    expect(score(hand,['a10'],{selectedIds:['two','ace']}).finalScore).toBe('31');
  });

  it('A11 repeats the full poker enhancement and edition once, without recursively requesting more',()=>{
    const result=score([card('two',2,'spades',{enhancement:'multiplier-paper',edition:'holographic'})],['a11']);
    // H20+2+2=24; M1+2+2+2+2=9.
    expect(result.finalScore).toBe('216');
    expect(result.accumulator).toEqual({H:f('24'),M:f('9')});
    expect(result.events.filter(e=>e.sourceDefinitionId==='a11'&&e.operation==='retrigger-card')).toHaveLength(1);
    expect(result.events.filter(e=>e.sourceDefinitionId==='rank-2').map(e=>e.retriggerDepth)).toEqual([0,1]);
  });

  it('the finite retrigger interface caps an explicit count-four content boundary probe plus encore',()=>{
    // A schema-valid injected boundary definition, not a naturally obtainable build.
    const probe={...R2_JOKERS.find(d=>d.id==='a11')!,hooks:[{phase:'onCardScore' as const,condition:{kind:'played-count' as const,equals:1},operations:[{kind:'retrigger-card' as const,count:4}]}]};
    const result=score([card('two',2,'spades',{enhancement:'encore-paper'})],['a11'],{definitions:R2_JOKERS.map(d=>d.id==='a11'?probe:d)});
    expect(result.finalScore).toBe('30'); // H20+5*2, M1.
    expect(result.events.filter(e=>e.sourceDefinitionId==='rank-2')).toHaveLength(5);
    expect(result.events.some(e=>e.operation==='retrigger-cap')).toBe(true);
  });

  it('A11 cannot retrigger a disabled card or a sole scoring card from two played cards',()=>{
    expect(score(single,['a11'],{disabledIds:['two']}).finalScore).toBe('20');
    expect(score([card('two',2),card('three',3,'hearts')],['a11']).finalScore).toBe('23');
  });

  it.each([
    [[card('8s',8),card('8h',8,'hearts'),card('8c',8,'clubs'),card('8d',8,'diamonds'),card('kicker',2)],'four-kind','4928'],
    [[card('8s',8),card('8h',8,'hearts'),card('8c',8,'clubs'),card('8d',8,'diamonds'),card('8s-copy',8)],'five-kind','14800'],
    [Array.from({length:5},(_,i)=>card(`same-${i}`,8)),'flush-five','37200'],
  ] as const)('B09 explicitly covers %s rather than inheriting all group types',(hand,type,expected)=>{
    // 352*14; 740*20; 1240*30. The four-kind kicker has no points.
    const result=score(hand,['b09']);
    expect(result.handType).toBe(type);
    expect(result.finalScore).toBe(expected);
  });

  it('B10 grows only after a pair and reads the capped heat on every later hand type',()=>{
    const first=score(pair,['b10']);
    expect(first.finalScore).toBe('102'); // (35+8+8)*2; +5 only afterward.
    expect(first.jokers[0].growth.heat).toEqual(f('5'));
    expect(score(single,[],{jokers:first.jokers}).finalScore).toBe('27');
    const cap=score(pair,[],{jokers:[owned('b10',{growth:{heat:f('49')}})]});
    expect(cap.finalScore).toBe('200'); // (51+49)*2.
    expect(cap.jokers[0].growth.heat).toEqual(f('50'));
  });

  it('B11 sees active scoring ranks, ignores a played kicker, and grants the first three matching held cards',()=>{
    const hand=[...pair,card('kicker',9,'clubs'),card('held9',9),...Array.from({length:4},(_,i)=>card(`held8-${i}`,8))];
    const result=score(hand,['b11'],{selectedIds:['8s','8h','kicker']});
    expect(result.finalScore).toBe('178'); // floor(51*(2+3/2)).
    expect(result.events.filter(e=>e.sourceDefinitionId==='b11').map(e=>e.targetCardId)).toEqual(['held8-0','held8-1','held8-2']);
    expect(result.sets).toEqual({playedIds:['8s','8h','kicker'],scoringIds:['8s','8h'],activeScoringIds:['8s','8h'],heldIds:['held9','held8-0','held8-1','held8-2','held8-3']});
  });

  it('B11 loses the matching source when both scoring cards are disabled, while point suppression keeps that source',()=>{
    const hand=[...pair,card('held8',8)];
    expect(score(hand,['b11'],{selectedIds:['8s','8h'],disabledIds:['8s','8h']}).finalScore).toBe('70');
    expect(score(hand,['b11'],{selectedIds:['8s','8h'],ordinaryPointsSuppressedIds:['8s','8h']}).finalScore).toBe('87'); // floor(35*5/2).
  });

  it.each([
    [['c09'],[2,4,6,8],'flush','640'],
    [['c08'],[2,3,4,5],'straight','556'],
    [['c08','c09'],[2,3,4,5],'flush','616'],
    [['c08','c09'],[14,2,3,4],'flush','640'],
  ] as const)('C08/C09 resolve the four-card ordinary priority explicitly (%s)',(ids,ranks,type,expected)=>{
    // 160*4; 139*4; 154*4; 160*4. Never a four-card straight flush.
    const hand=ranks.map((rank,i)=>card(`four-${i}`,rank));
    const result=score(hand,[...ids]);
    expect(result.handType).toBe(type);
    expect(result.finalScore).toBe(expected);
    expect(result.sets.scoringIds).toEqual(hand.map(c=>c.id));
  });

  it('C09 preserves five-card straight flushes and higher four-kind priority',()=>{
    const five=[2,3,4,5,6].map((rank,i)=>card(`five-${i}`,rank as Rank));
    expect(score(five,['c08','c09']).finalScore).toBe('4230'); // (450+20)*9.
    expect(evaluateR2Hand(five,{fourStraight:true,fourFlush:true}).type).toBe('straight-flush');
    expect(score(Array.from({length:4},(_,i)=>card(`eight-${i}`,8)),['c09']).finalScore).toBe('2464');
  });

  it('C10 reads only the first two valid held aces and never their editions',()=>{
    const hand=[...single,card('a0',14,'spades',{edition:'polychrome'}),card('a1',14),card('a2',14),card('king',13)];
    const result=score(hand,['c10'],{selectedIds:['two'],disabledIds:['a0']});
    expect(result.finalScore).toBe('55'); // 22*(1+3/4+3/4).
    expect(result.events.filter(e=>e.sourceDefinitionId==='c10').map(e=>e.targetCardId)).toEqual(['a1','a2']);
  });

  it.each([
    [straight,'flush','1015'],
    [flush,'straight','1190'],
    [straight,null,'580'],
    [flush,'flush','680'],
  ] as const)('C11 requires the exact ordinary alternating types (%s)',(hand,previousHandType,expected)=>{
    // 145*7; 170*7; 145*4; 170*4.
    expect(score(hand,['c11'],{previousHandType}).finalScore).toBe(expected);
  });

  it('C11 cannot treat a straight flush as an ordinary straight or flush',()=>{
    const same=[2,3,4,5,6].map((rank,i)=>card(`sf-${i}`,rank as Rank));
    expect(score(same,['c11'],{previousHandType:'flush'}).finalScore).toBe('4230');
  });

  it('D08 follows each held voice enhancement before multiplying the first two, with the third voice still adding normally',()=>{
    const hand=[...single,...Array.from({length:3},(_,i)=>card(`voice-${i}`,11,'spades',{enhancement:'voice-paper'}))];
    const result=score(hand,['d08'],{selectedIds:['two']});
    // M1 ->2 ->12/5 ->17/5 ->102/25 ->127/25; floor(22*127/25)=111.
    expect(result.finalScore).toBe('111');
    expect(result.accumulator.M).toEqual(f('127','25'));
    expect(result.events.filter(e=>e.phase==='onHeldCard').map(e=>[e.sourceDefinitionId,e.after.M])).toEqual([
      ['voice-0',f('2')],['d08',f('12','5')],['voice-1',f('17','5')],['d08',f('102','25')],['voice-2',f('127','25')],
    ]);
  });

  it('D08 and D01 honor held Joker order for each face rather than grouping additions first',()=>{
    const hand=[...single,card('j',11,'spades',{enhancement:'voice-paper'}),card('q',12,'spades',{enhancement:'voice-paper'})];
    expect(score(hand,['d01','d08'],{selectedIds:['two']}).finalScore).toBe('118'); // 22*27/5 floored.
    expect(score(hand,['d08','d01'],{selectedIds:['two']}).finalScore).toBe('113'); // 22*259/50 floored.
  });

  it('D08 skips disabled voices and leaves held poker editions dormant',()=>{
    const hand=[...single,...Array.from({length:3},(_,i)=>card(`voice-${i}`,11,'spades',{enhancement:'voice-paper',edition:'holographic'}))];
    const result=score(hand,['d08'],{selectedIds:['two'],disabledIds:['voice-0']});
    expect(result.finalScore).toBe('89'); // floor(22*102/25).
    expect(result.events.filter(e=>e.sourceDefinitionId==='d08').map(e=>e.targetCardId)).toEqual(['voice-1','voice-2']);
  });

  it('D09 grows after an actual extra pass, and its new fifth is first read on the next hand',()=>{
    const first=score(single,['a11','d09']);
    expect(first.finalScore).toBe('24');
    expect(first.jokers[1].growth.multiplier).toEqual(f('1','5'));
    expect(score(single,[],{jokers:first.jokers}).finalScore).toBe('28'); // floor(24*6/5).
    const atCap=score([card('two',2,'spades',{enhancement:'encore-paper'})],[],{jokers:[owned('d09',{growth:{multiplier:f('29','10')}})]});
    expect(atCap.finalScore).toBe('93'); // floor(24*39/10).
    expect(atCap.jokers[0].growth.multiplier).toEqual(f('3'));
  });

  it('D09 cannot grow from an inactive encore card or an ordinary hand with no extra execution',()=>{
    expect(score(single,['d09']).jokers[0].growth).toEqual({});
    const request=input([card('two',2,'spades',{enhancement:'encore-paper'})],['d09'],{disabledIds:['two']});
    expect(scoreR2Hand(request).jokers[0].growth).toEqual({});
  });

  it('D11 retriggers the original third scoring card in hand order, independent of selected ID order',()=>{
    const hand=[card('8s',8),card('kicker',2),card('8h',8,'hearts'),card('8c',8,'clubs')];
    const result=score(hand,['d11'],{selectedIds:['8c','8h','kicker','8s']});
    expect(result.finalScore).toBe('366'); // (90+8+8+8+8)*3.
    expect(result.events.filter(e=>e.sourceDefinitionId==='d11').map(e=>e.targetCardId)).toEqual(['8c']);
    expect(result.sets.scoringIds).toEqual(['8s','8h','8c']);
    expect(score(pair,['d11']).finalScore).toBe('102');
  });

  it('D11 never moves the original third target to the fourth after that third card becomes disabled',()=>{
    const hand=[card('8s',8),card('8h',8,'hearts'),card('8c',8,'clubs'),card('8d',8,'diamonds')];
    const result=score(hand,['d11'],{disabledIds:['8c']});
    expect(result.finalScore).toBe('2408'); // (320+8+8+8)*7, no fourth-card replay.
    expect(result.events.some(e=>e.sourceDefinitionId==='d11')).toBe(false);
    expect(result.sets.scoringIds).toEqual(['8s','8h','8c','8d']);
    expect(result.sets.activeScoringIds).toEqual(['8s','8h','8d']);
  });
});

describe('C02 mandatory coefficients, strict targets and rule chance',()=>{
  it('E11 reads its instance coefficient and edition immediately before the next Joker slot',()=>{
    const coefficient=owned('e11',{growth:{coefficient:f('3','2')},edition:'holographic'});
    const result=score(single,[],{jokers:[coefficient,owned('pengci')]});
    expect(result.finalScore).toBe('121'); // 22*(1*3/2+2+2).
    expect(score(single,[],{jokers:[owned('pengci'),coefficient]}).finalScore).toBe('143'); // 22*(3*3/2+2).
    expect(result.events.filter(e=>e.phase==='jokerScore').map(e=>[e.sourceDefinitionId,e.operation,e.after.M])).toEqual([
      ['e11','read-coefficient',f('3','2')],['e11','add-multiplier',f('7','2')],['pengci','add-multiplier',f('11','2')],
    ]);
  });

  it('F12 has a mandatory initial coefficient of one and a distinct five-halves cap',()=>{
    expect(score(single,['f12']).finalScore).toBe('22');
    expect(score(single,[],{jokers:[owned('f12',{growth:{coefficient:f('5','2')}})]}).finalScore).toBe('55');
    expect(score(single,[],{jokers:[owned('e11',{growth:{coefficient:f('2')}})]}).finalScore).toBe('44');
  });

  it.each([
    ['e11',{}],['f12',{}],['e11',{coefficient:f('9','10')}],['e11',{coefficient:f('21','10')}],['f12',{coefficient:f('13','5')}],
  ])('rejects missing or out-of-range required coefficient state for %s',(id,growth)=>{
    expect(()=>score(single,[],{jokers:[owned(id as string,{growth:growth as R2JokerInstance['growth']})]})).toThrow('invalid-growth-state');
  });

  it.each([[0,'112',1831565813],[1,'22',1831565814]] as const)('F08 takes exactly one rule draw per instance per hand from cursor %s',(state,expected,next)=>{
    // Independent Mulberry vector: state0 uint1144304738 hits 1/3;
    // state1 uint2693262067 misses. A hit adds H90 once, not per poker.
    const result=score(single,['f08'],{rng:cursor(state)});
    expect(result.finalScore).toBe(expected);
    expect(result.rng).toEqual(cursor(next));
    const checks=result.events.filter(e=>e.operation==='chance-heat-check');
    expect(checks).toHaveLength(1);
    expect(checks[0].sourceDefinitionId).toBe('f08');
    expect(checks[0].sourceInstanceId).toBe('owned/f08');
    expect(checks[0].before).toEqual(checks[0].after);
    expect(result.events.filter(e=>e.sourceDefinitionId==='f08'&&e.operation==='add-heat')).toHaveLength(state===0?1:0);
  });

  it('F08 consumes its one draw after poker lucky draws and before the final glass check',()=>{
    const hand=[card('lucky',8,'spades',{enhancement:'lucky-paper'}),card('glass',8,'hearts',{enhancement:'glass-paper'})];
    const result=score(hand,['f08'],{rng:cursor(0)});
    // draw1 1144304738/2^32 misses lucky M; draw2 1416247 hits gold;
    // draw3 958946056 hits F08; draw4 627933444 breaks glass.
    // H35+8+8+90=141; M2*3/2=3; final423 before destruction.
    expect(result.finalScore).toBe('423');
    expect(result.goldDelta).toBe(10);
    expect(result.destroyedCardIds).toEqual(['glass']);
    expect(result.rng).toEqual(cursor(3031295956));
    expect(result.events.filter(e=>e.operation.endsWith('-check')).map(e=>e.operation)).toEqual([
      'lucky-multiplier-check','lucky-gold-check','chance-heat-check','glass-check',
    ]);
    expect(result.events.findIndex(e=>e.operation==='final-score')).toBeLessThan(result.events.findIndex(e=>e.operation==='glass-check'));
  });

  it('F08 preview exposes exact forced bounds and probability without reading an actual rule cursor',()=>{
    const request=publicInput(input([card('two',2,'spades',{enhancement:'lucky-paper'})],['f08']));
    Object.defineProperty(request,'rng',{get(){throw new Error('preview-read-hidden-rng');}});
    const preview=previewR2Hand(request);
    expect(preview.scoreRange).toEqual({minimum:'22',maximum:'560'}); // max (22+90)*(1+4).
    expect(preview.possibleScores).toEqual(['22','560']);
    const visible=JSON.stringify(preview.randomEffects);
    expect(visible).toContain('f08');
    expect(visible).toContain('"n":1,"d":3');
    expect(JSON.stringify(preview)).not.toMatch(/rng|destroyedCardIds|future|seed/);
  });

  it('F10 compares the exact pre-hand stage total strictly below one quarter, before adding this hand',()=>{
    expect(score(single,['f10'],{stageHeatBefore:'99',stageTargetHeat:'400'}).finalScore).toBe('33');
    expect(score(single,['f10'],{stageHeatBefore:'100',stageTargetHeat:'400'}).finalScore).toBe('22');
    expect(score(single,['f10'],{stageHeatBefore:'101',stageTargetHeat:'400'}).finalScore).toBe('22');
    expect(score(single,['f10'],{stageHeatBefore:'2500000000000000000000000000000000000000',stageTargetHeat:'10000000000000000000000000000000000000001'}).finalScore).toBe('33');
  });

  it('F11 grows only after an unfinished hand strictly below one tenth of target',()=>{
    const first=score(single,['f11'],{stageHeatBefore:'0',stageTargetHeat:'221'});
    expect(first.finalScore).toBe('22');
    expect(first.jokers[0].growth.heat).toEqual(f('10'));
    expect(score(single,['f11'],{stageHeatBefore:'0',stageTargetHeat:'220'}).jokers[0].growth).toEqual({});
    expect(score(single,['f11'],{stageHeatBefore:'200',stageTargetHeat:'221'}).jokers[0].growth).toEqual({});
    const cap=score(single,[],{jokers:[owned('f11',{growth:{heat:f('95')}})],stageHeatBefore:'0',stageTargetHeat:'2000'});
    expect(cap.finalScore).toBe('117');
    expect(cap.jokers[0].growth.heat).toEqual(f('100'));
  });

  it('target-dependent content refuses an absent, malformed, unpaired or nonpositive context',()=>{
    for(const id of ['f10','f11']) {
      for(const context of [{},{stageHeatBefore:'0'},{stageHeatBefore:'01',stageTargetHeat:'400'},
        {stageHeatBefore:'0',stageTargetHeat:'0'},{stageHeatBefore:'-1',stageTargetHeat:'400'},
        {stageHeatBefore:'0',stageTargetHeat:'9'.repeat(4097)}]) {
        expect(()=>score(single,[id],context)).toThrow();
      }
    }
  });
});
