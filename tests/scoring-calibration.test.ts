import {describe,expect,it} from 'vitest';
import {Rational} from '../src/domain/rational';
import {r2RouteFactor,r2RouteFamilies} from '../src/domain/r2RouteGrowth';
import {r2StageSpec} from '../src/domain/r2Chapter';
import {scoreR2Hand,previewR2Hand} from '../src/domain/scoreR2';
import {SeededRng} from '../src/core/SeededRng';
import {adaptiveStep,audit,buildInput,cards,estimateCapacity,exactScore,fixedTarget,input,joker,lockedChapter,routeFactor,capacityHighWater} from '../analysis/scoring-calibration/model';
import {heroInput,publicDeck} from '../analysis/scoring-calibration/report';

describe('offline exact scoring calibration — arithmetic evidence, not play acceptance',()=>{
  it('independently matches all route factors through grace, growth and caps',()=>{
    for(const f of ['G','S','F'] as const)for(const n of [0,1,3,4,14,23,36,85,86,95,96,108,109,150,Number.MAX_SAFE_INTEGER]){
      expect(Rational.fromJSON(routeFactor(f,n)).compare(r2RouteFactor(f,n))).toBe(0);
    }
    expect(()=>routeFactor('F',-1)).toThrow();
  });
  it('matches every D0 stage target from chapters 1–80, including chapter 13 ceiling',()=>{
    for(let c=1;c<=80;c++)for(let s=0;s<3;s++)expect(fixedTarget(c,s).toString()).toBe(r2StageSpec((c-1)*3+s,'endless')!.targetHeat);
    expect(fixedTarget(13)).toBe(12740199n);
  });
  it('pins a known scorer golden and multiplies both families once',()=>{
    const t=audit(input(cards([5,5,5,7,7],true,3),{routeGrowth:{clears:14,G:14,S:14,F:14}}));
    expect(t.score).toBe('7696791');expect(t.routes.map(r=>r.family)).toEqual(['G','F']);
    expect(r2RouteFamilies('straight-flush')).toEqual(['S','F']);
  });
  it('keeps a single final floor and exact integers beyond JS safe range',()=>{
    expect(exactScore({n:'3',d:'2'},{n:'3',d:'2'})).toBe('2');
    expect(exactScore({n:'9007199254740993',d:'1'},{n:'3',d:'2'})).toBe('13510798882111489');
    const t=audit({...buildInput('straight-flush',80),routeGrowth:{clears:150,G:150,S:150,F:150}});
    expect(t.routes.map(r=>r.factor)).toEqual([{n:'1000000000000',d:'1'},{n:'1000000000000',d:'1'}]);
    expect(BigInt(t.score)).toBeGreaterThan(10n**24n);
  });
  it('route counters freeze within a hand and level 30 is a genuine ceiling',()=>{
    const b=buildInput('flush-house',13,30),before=structuredClone(b);
    audit(b);expect(b).toEqual(before);
    expect(()=>audit({...b,handLevels:{'flush-house':31}})).toThrow('invalid-hand-level');
  });
  it.each(['amo','erxiang','laohuan','azao','touye','xiemu'])('%s three-route/current inactive ability snapshots score without old passive fallback',hero=>{
    for(const build of ['group','straight','flush'] as const)for(const chapter of [1,5,8,13]){
      const i=heroInput(hero,buildInput(build,chapter)),t=scoreR2Hand(i);
      expect(t.finalScore).toBe(audit(i).score);
      if(hero!=='touye')expect(t.events.filter(e=>e.sourceType==='character'&&['add-heat','add-multiplier','multiply-multiplier'].includes(e.operation))).toHaveLength(0);
    }
  });
  it('f06 lasts four scored hands, then is absent; cannot forecast peak times four indefinitely',()=>{
    let j=[joker('f06')];const scores:string[]=[];
    for(let k=0;k<5;k++){const t=scoreR2Hand(input(cards([9,9]),{jokers:j}));scores.push(t.finalScore);j=[...t.jokers];}
    expect(scores.slice(0,4)).toEqual(Array(4).fill(scores[0]));expect(BigInt(scores[0])).toBe(BigInt(scores[4])*2n);expect(j).toEqual([]);
  });
  it('cold rescue is consumed after one hand and repeated use is not sustainable',()=>{
    const j=joker('f10');j.counters={rescueArmed:true};
    const b=buildInput('flush',13),first=scoreR2Hand({...b,jokers:[j]}),second=scoreR2Hand({...b,jokers:first.jokers});
    expect(first.events.some(e=>e.operation==='consume-rescue')).toBe(true);
    expect(BigInt(first.finalScore)).toBeGreaterThan(BigInt(second.finalScore)*2n);
  });
  it('flush-house does not inherit c07 retrigger; Erxiang handoff is once per stage',()=>{
    const b=heroInput('erxiang',buildInput('flush-house',13)),target=b.hand[0].id;
    const t=scoreR2Hand({...b,jokers:[joker('c07')],erxiangHandoff:{targetId:target,beforeUsed:false}});
    expect(t.events.some(e=>e.operation==='retrigger-card')).toBe(false);
    expect(t.erxiangHandoff?.afterUsed).toBe(true);
    expect(()=>scoreR2Hand({...b,erxiangHandoff:{targetId:target,beforeUsed:true}})).toThrow('erxiang-already-used');
  });
  it('burn rejects insufficient cash/reuse and payment can disable the 20-gold multiplier',()=>{
    const b=heroInput('xiemu',buildInput('flush',13));b.jokers=[joker('e08')];
    expect(()=>scoreR2Hand({...b,gold:0,xiemuBurn:{cost:30,goldBefore:29,beforeUsed:false}})).toThrow('insufficient-gold');
    expect(()=>scoreR2Hand({...b,gold:30,xiemuBurn:{cost:30,goldBefore:60,beforeUsed:true}})).toThrow('xiemu-already-used');
    const full=scoreR2Hand({...b,gold:30,xiemuBurn:{cost:30,goldBefore:60,beforeUsed:false}});
    const poor=scoreR2Hand({...b,gold:9,xiemuBurn:{cost:30,goldBefore:39,beforeUsed:false}});
    expect(BigInt(full.finalScore)).toBeGreaterThan(BigInt(poor.finalScore));
  });
  it('glass breaks after scoring, once per original despite retrigger, replay is deterministic',()=>{
    const h=cards([9,9,9,10,10],true);h[2].enhancement='glass-paper';h[2].edition='polychrome';
    const b={...buildInput('flush-house',13),hand:h,selectedIds:h.map(c=>c.id),jokers:[joker('d11')]};
    const destroyed=new Set<number>();const scores=new Set<string>();
    for(let seed=0;seed<32;seed++){
      const i={...b,rng:new SeededRng('glass-boundary/'+seed).snapshot()},t=scoreR2Hand(i);
      expect(scoreR2Hand(i)).toEqual(t);scores.add(t.finalScore);destroyed.add(t.destroyedCardIds.length);
      expect(t.events.filter(e=>e.operation==='glass-check')).toHaveLength(1);
      expect(t.events.findIndex(e=>e.operation==='glass-check')).toBeGreaterThan(t.events.findIndex(e=>e.operation==='final-score'));
      expect(t.events.some(e=>e.operation==='retrigger-card')).toBe(true);
    }
    expect(scores.size).toBe(1);expect([...destroyed].sort()).toEqual([0,1]);
  });
  it('boss suppression does not remove the shared route multiplier',()=>{
    const b=heroInput('erxiang',buildInput('flush-house',13));
    for(const definitionId of ['B06','B08','B12','B13','B16'] as const){
      const t=scoreR2Hand({...b,boss:{definitionId,disabledSuit:null}});
      expect(t.events.filter(e=>e.operation==='route-factor').map(e=>e.routeFamily)).toEqual(['G','F']);
    }
  });
  it('target fixed before chapter cannot respond to a new burst or loss; serializable recovery preserves it',()=>{
    const locked=lockedChapter(13,20000n),before=JSON.stringify(locked);
    adaptiveStep(20000n,10n**30n,fixedTarget(13));adaptiveStep(20000n,0n,fixedTarget(13));
    expect(JSON.stringify(locked)).toBe(before);expect(Object.isFrozen(locked.targets)).toBe(true);
    expect(JSON.parse(before)).toEqual(locked);
  });
  it('bounded adaptation cannot catch a 250x gap in five chapters; decline is also bounded',()=>{
    let bps=10000n;for(let c=8;c<13;c++)bps=adaptiveStep(bps,10n**30n,fixedTarget(c));
    expect(bps).toBe(30516n);
    expect(adaptiveStep(100000n,0n,100n)).toBe(80000n);
    expect(adaptiveStep(640000n,10n**30n,100n)).toBe(640000n);
    expect(adaptiveStep(10000n,0n,100n)).toBe(10000n);
  });
  it('rolling public-capacity high water resists a pre-checkpoint sale but also delays real loss relief',()=>{
    expect(capacityHighWater([100n,100n,1n])).toBe(100n);
    expect(capacityHighWater([100n,1n,1n])).toBe(100n);
    expect(capacityHighWater([100n,1n,1n,1n])).toBe(1n);
    expect(()=>capacityHighWater([])).toThrow();
  });
  it('public estimator is deterministic, ignores hidden RNG/observed low scores/order, and consumes nothing',()=>{
    const score=buildInput('flush',8),deck=publicDeck('flush').slice(0,12),probe={deck,score,handSize:5,hands:2,trials:4};
    const before=structuredClone(probe),a=estimateCapacity(probe);
    const b=estimateCapacity({...probe,deck:[...deck].reverse(),score:{...score,rng:new SeededRng('other-private-cursor').snapshot(),previousHandScore:'0'}});
    expect(a).toEqual(b);expect(probe).toEqual(before);expect(a.discardsUsed).toBe(0);
  });
  it('public estimator excludes burst/temporary sources, strips destroyed glass ranks, respects scarce cards and hand budget',()=>{
    const score=heroInput('xiemu',buildInput('flush',8)),deck=publicDeck('flush').slice(0,12),probe={deck,score,handSize:5,hands:2,trials:4};
    const base=estimateCapacity(probe),burst=estimateCapacity({...probe,score:{...score,jokers:[...score.jokers,joker('f06'),joker('f10')],xiemuBurn:{cost:30,goldBefore:90,beforeUsed:false}}});
    expect(burst.capacity).toBe(base.capacity);expect(burst.omittedJokers).toEqual(['f06','f10']);
    expect(estimateCapacity({...probe,deck:deck.map(c=>({...c,enhancement:'glass-paper' as const}))}).capacity).toBe('0');
    expect(estimateCapacity({...probe,deck:deck.slice(0,5)}).totals).toEqual(estimateCapacity({...probe,deck:deck.slice(0,5),hands:1}).totals);
    expect(estimateCapacity({...probe,hands:4}).handsUsed).toBe(2);
  });
  it('one-shot previews are score bounds only, not sustainable per-stage capacity',()=>{
    const b=buildInput('flush-house',13),h=b.hand.map(c=>({...c,enhancement:'glass-paper' as const}));
    const p=previewR2Hand({...b,hand:h});
    expect(p.randomEffects.some(r=>r.kind==='glass-paper')).toBe(true);
    expect(BigInt(p.scoreRange.minimum)).toBeGreaterThan(0n);
    expect(estimateCapacity({score:b,deck:h,handSize:5,hands:4,trials:4}).capacity).toBe('0');
  });
});
