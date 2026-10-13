import {BASE_SHA,identity,audit,builds,buildInput,cards,input,joker,fixedTarget,adaptiveStep,lockedChapter,estimateCapacity,routeFactor,capacityHighWater} from './model';
import {scoreR2Hand, type ScoreInput} from '../../src/domain/scoreR2';
import {SeededRng} from '../../src/core/SeededRng';
import type {PlayingCard} from '../../src/cards/types';

export const publicDeck=(kind:'mixed'|'flush'|'dual'|'glass'):PlayingCard[]=>Array.from({length:26},(_,i)=>({
  id:'deck/'+i,rank:(kind==='dual'?(i%2?9:10):2+i%13) as PlayingCard['rank'],
  suit:kind==='mixed'?(['hearts','clubs','spades','diamonds'] as const)[i%4]:'hearts',
  ...(kind==='glass'&&i<5?{enhancement:'glass-paper' as const}:i%3===0?{enhancement:'multiplier-paper' as const}:{}),
}));

export function heroInput(hero:string,base:ScoreInput):ScoreInput {
  return {...base,characterId:hero as ScoreInput['characterId'],
    ...(hero==='erxiang'?{erxiangHandoff:{targetId:null,beforeUsed:false}}:{}),
    ...(hero==='laohuan'?{laohuanTrick:true as const}:{}),
    ...(hero==='touye'?{touyeWager:{commit:null,newCore:true},activeMultTiming:'after-route-growth' as const}:{}),
    ...(hero==='xiemu'?{xiemuBurn:{cost:0,goldBefore:base.gold!,beforeUsed:false},activeMultTiming:'after-route-growth' as const}:{}),
    ...(hero==='azao'?{azaoCharge:{before:{charge:0,previousQualifiedType:null},release:false},activeMultTiming:'after-route-growth' as const}:{}),
  };
}

export function makeReport() {
  const chapters=[1,3,5,8,9,13,20,30,40,60,80];
  const matrix=builds.flatMap(b=>chapters.map(chapter=>{
    const row=audit(buildInput(b.id,chapter));
    return {build:b.id,chapter,level:5,...row,targets:Object.fromEntries(['legacy','single','dualGF','dualSF'].map(l=>[l,fixedTarget(chapter,0,l as 'legacy').toString()]))};
  }));
  const heroes=['amo','erxiang','laohuan','azao','touye','xiemu'].flatMap(hero=>['group','straight','flush'].flatMap(build=>[1,5,8,13].map(chapter=>({hero,build,chapter,...audit(heroInput(hero,buildInput(build as 'group',chapter)))}))));
  const levels=builds.flatMap(b=>[1,5,15,30].map(level=>({build:b.id,chapter:13,level,...audit(buildInput(b.id,13,level))})));
  const skips=[0,3,9,18].map(skipped=>{
    const base=buildInput('flush-house',13),n=36-skipped;
    return {skipped,...audit({...base,routeGrowth:{clears:n,G:n,S:0,F:n}})};
  });
  const cold=joker('f10');cold.counters={rescueArmed:true};
  let finite=[joker('f06')];const finiteHands=[];
  for(let i=0;i<5;i++){const t=scoreR2Hand(input(cards([9,9]),{jokers:finite}));finiteHands.push({hand:i+1,score:t.finalScore,remaining:t.jokers.map(j=>j.definitionId)});finite=[...t.jokers];}
  const burstBase=heroInput('xiemu',buildInput('flush',13));burstBase.jokers=[...burstBase.jokers,joker('e08')];
  const cash=[29,30,39,49,50,60].map(gold=>{
    const normal=audit({...burstBase,gold,xiemuBurn:{cost:0,goldBefore:gold,beforeUsed:false}});
    const burn=gold<30?null:audit({...burstBase,gold:gold-30,xiemuBurn:{cost:30,goldBefore:gold,beforeUsed:false}});
    return {gold,after:gold<30?null:gold-30,normal:normal.score,burn:burn?.score??null};
  });
  const glassHand=cards([9,9,9,10,10],true,2);glassHand[2].enhancement='glass-paper';glassHand[2].edition='polychrome';
  const glassInput={...buildInput('flush-house',13),hand:glassHand,selectedIds:glassHand.map(c=>c.id),jokers:[joker('d11')]};
  const glassSeeds=Array.from({length:32},(_,seed)=>({seed,...audit({...glassInput,rng:new SeededRng('glass-boundary/'+seed).snapshot()})}));
  const base=buildInput('flush',13);
  const estimates=(['mixed','flush','dual','glass'] as const).map(kind=>({kind,...estimateCapacity({deck:publicDeck(kind),score:base,handSize:9,hands:4})}));
  const policy=['flush','flush-house','straight-flush'].map(build=>{
    let bps=10000n;
    return {build,chapters:Array.from({length:13},(_,i)=>{
      const chapter=i+8,locked=lockedChapter(chapter,bps),capacity=BigInt(audit(buildInput(build as 'flush',chapter)).score)*2n;
      // Sensitivity ONLY: two identical eligible hands assumed here; public-deck estimate separately reported.
      const next=adaptiveStep(bps,capacity,fixedTarget(chapter));
      const row={...locked,assumedTwoHandCapacity:capacity.toString(),nextBps:next.toString()};bps=next;return row;
    })};
  });
  const lossHistory:bigint[]=[];let lossBps=40000n;
  const lossStress=[100000000n,100000000n,100000000n,1000000n,1000000n,1000000n,1000000n,1000000n].map((capacity,index)=>{
    lossHistory.push(capacity);const highWater=capacityHighWater(lossHistory),next=adaptiveStep(lossBps,highWater,20000000n);
    const row={checkpoint:index,capacity:String(capacity),highWater:String(highWater),beforeBps:String(lossBps),nextBps:String(next)};lossBps=next;return row;
  });
  return {schema:'offline-scoring-calibration-v1',baseSha:BASE_SHA,identity,
    evidenceClass:'controlled arithmetic, synthetic public-deck probes; NOT natural play or experience acceptance',
    userReport:{score:'3193089021',chapter13Target:fixedTarget(13).toString(),ratio:Number(3193089021n)/Number(fixedTarget(13)),replayed:false,missing:['full saved identity','route settlement history','deck/card enhancements/editions','hand levels','joker instances/order/growth','boss context','hero intent','RNG and trace']},
    chapterGrowth:{G:1.35**3,S:1.4**3,F:1.3**3,GF:(1.35*1.3)**3,SF:(1.4*1.3)**3,target:2.4},
    caps:Object.fromEntries(['G','S','F'].map(f=>[f,[86,96,109].map(n=>({clears:n,factor:routeFactor(f as 'G',n)}))])),
    matrix,heroes,levels,skips,finiteHands,cash,glassSeeds,
    cold:{armed:audit({...base,jokers:[...base.jokers,cold]}),spent:audit({...base,jokers:[...base.jokers,{...cold,counters:{rescueArmed:false}}]})},
    glassAnalytic:{perOriginalBreakProbability:'1/4',fiveOriginalSurviveOneHand:'243/1024',fiveOriginalAtLeastOneBreak:'781/1024',expectedSurvivorsAfterFourUses:'405/256',assumptions:'five active glass originals each used on every hand; retriggers do not add checks; this is not five reusable x2 multipliers'},
    estimates,policy,lossStress,
    routeAblation:([{G:0,F:0},{G:36,F:0},{G:0,F:36},{G:36,F:36}]).map(counts=>({counts,...audit({...buildInput('flush-house',13),routeGrowth:{clears:36,S:0,...counts}})})),
    fixedChapter13:Object.fromEntries(['legacy','single','dualGF','dualSF'].map(l=>[l,[0,1,2].map(s=>fixedTarget(13,s,l as 'legacy').toString())])),
    adaptiveBound:{chapter13MaxFromChapter8Bps:'30516',chapter13MaxTarget:lockedChapter(13,30516n).targets[0],absoluteCeiling:'64x',risePerChapter:'1.25x',fallPerChapter:'0.8x',calibrationFraction:'0.7',lag:'chapter c snapshot sets c+1 after publication; never changes c'},
  };
}
