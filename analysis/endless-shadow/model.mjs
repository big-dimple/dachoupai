/** Offline exact shadow model. No runtime imports, no product mutation. */
export const frac=(n,d=1n)=>{
  let a=BigInt(n),b=BigInt(d);if(b<=0n)throw Error('invalid-denominator');
  const gcd=(x,y)=>{x=x<0n?-x:x;while(y){[x,y]=[y,x%y];}return x;};
  const g=gcd(a,b);return {n:String(a/g),d:String(b/g)};
};
export const mul=(a,b)=>frac(BigInt(a.n)*BigInt(b.n),BigInt(a.d)*BigInt(b.d));
export const div=(a,b)=>frac(BigInt(a.n)*BigInt(b.d),BigInt(a.d)*BigInt(b.n));
export const cmp=(a,b)=>{const x=BigInt(a.n)*BigInt(b.d)-BigInt(b.n)*BigInt(a.d);return x<0n?-1:x>0n?1:0;};
export const floor=a=>BigInt(a.n)/BigInt(a.d);
export const ceil=a=>(BigInt(a.n)+BigInt(a.d)-1n)/BigInt(a.d);
export const maximum=xs=>xs.reduce((a,b)=>a>b?a:b);
export const minimum=xs=>xs.reduce((a,b)=>a<b?a:b);
export function route(family,count){
  if(!['G','S','F'].includes(family)||!Number.isSafeInteger(count)||count<0)throw Error('invalid-route');
  const [n,d]={G:[27n,20n],S:[7n,5n],F:[13n,10n]}[family];
  let result=frac(1n);
  for(let i=3;i<count;i++){result=mul(result,frac(n,d));if(cmp(result,frac(10n**12n))>=0)return frac(10n**12n);}
  return result;
}
export function passive(families,count,policy='legacy',cap=4){
  if(!families.length||new Set(families).size!==families.length)throw Error('invalid-families');
  if(!['legacy','none','cap-product','cap-max','linear-max'].includes(policy))throw Error('invalid-policy');
  if(![2,4,8].includes(cap))throw Error('invalid-cap-scan');
  if(policy==='none')return frac(1n);
  const factors=families.map(f=>{
    const r=route(f,count);
    if(policy==='legacy')return r;
    if(policy==='linear-max'){
      const [n,d]={G:[7n,20n],S:[2n,5n],F:[3n,10n]}[f];
      return frac(d+BigInt(Math.max(0,count-3))*n,d);
    }
    return cmp(r,frac(cap))>0?frac(cap):r;
  });
  if(policy.endsWith('max'))return factors.reduce((a,b)=>cmp(a,b)>=0?a:b);
  return factors.reduce(mul,frac(1n));
}
export function score(state,count,policy='legacy',cap=4,m=state.M,post=frac(1n)){
  return floor(mul(mul(mul(frac(state.H),m),passive(state.families,count,policy,cap)),post));
}
export const stageRatio=stage=>{if(![0,1,2].includes(stage))throw Error('invalid-stage');return frac([2,3,4][stage],2n);};
export function warmFraction(chapter,growth=frac(12n,5n),anchor=160000n){
  if(!Number.isSafeInteger(chapter)||chapter<1||chapter>80||BigInt(anchor)<=0n)throw Error('invalid-target');
  const ordinary=[400n,1000n,2400n,5600n,13000n,30000n,70000n,160000n];
  let result=chapter<=8?frac(ordinary[chapter-1]):frac(anchor);
  if(chapter>8)for(let c=8;c<chapter;c++)result=mul(result,growth);
  return result;
}
export function target(chapter,stage=0,growth=frac(12n,5n),anchor=160000n,tier=1n){
  if(BigInt(tier)<=0n)throw Error('invalid-tier');
  return ceil(mul(mul(warmFraction(chapter,growth,anchor),stageRatio(stage)),frac(tier)));
}
/**
 * Exact DP over a DECLARED finite supply of disjoint ready hands, not a hidden-deck forecast.
 * Copies/ready hands are synthetic. All joker growth is at cap, and route count freezes in-stage.
 * Gold cost, one-use burn/rescue, f06 expiry and single glass availability are consumed per transition.
 */
export function budget(state,count,{policy='legacy',cap=4,hands=4,gold=60,discards=3,burn=false,rescue=false,glass=false,finiteRemaining=0,targetHeat=null}={}){
  if(!Number.isInteger(hands)||hands<1||hands>4||!Number.isSafeInteger(gold)||gold<0||!Number.isInteger(discards)||discards<0||discards>3||!Number.isInteger(finiteRemaining)||finiteRemaining<0||finiteRemaining>4)throw Error('invalid-budget');
  if((burn||rescue||glass)&&state.id!=='mature-GF')throw Error('resource-case-requires-GF-recipe');
  const factor=passive(state.families,count,policy,cap);
  const calculate=(m,post)=>floor(mul(mul(mul(frac(state.H),m),factor),post));
  const stable=calculate(state.M,frac(1n));
  let layer=[{sum:0n,cash:gold,burnLeft:burn?1:0,rescueLeft:rescue?1:0,glassLeft:glass?1:0,life:finiteRemaining,discards,path:[]}];
  const prefixes=[];
  let visited=1;
  for(let turn=0;turn<hands;turn++){
    const next=new Map();
    for(const n of layer){
      const actions=[{name:'stable',cost:0,post:frac(1n),m:state.M,burn:0,rescue:0,glass:0,discard:0}];
      if(n.burnLeft)for(const cost of [10,20,30])if(n.cash>=cost)actions.push({name:'burn-'+cost,cost,post:frac(cost/10+1),m:state.M,burn:1,rescue:0,glass:0,discard:0});
      if(n.rescueLeft&&turn===0&&n.discards>0)actions.push({name:'cold-after-one-discard',cost:0,post:frac(3n),m:state.M,burn:0,rescue:1,glass:0,discard:1});
      if(n.glassLeft&&turn===0)actions.push({name:'single-glass-poly',cost:0,post:frac(1n),m:frac(51n),burn:0,rescue:0,glass:1,discard:0});
      for(const a of actions){
        const post=n.life>0?mul(a.post,frac(2n)):a.post;
        const s=calculate(a.m,post);
        const step={turn:turn+1,action:a.name,score:String(s),goldBefore:n.cash,goldAfter:n.cash-a.cost,
          f06Before:n.life,f06After:Math.max(0,n.life-1),discardsSpent:a.discard,cards:state.ranks.map((_,i)=>'ready/'+turn+'/'+i)};
        const child={sum:n.sum+s,cash:n.cash-a.cost,burnLeft:n.burnLeft-a.burn,rescueLeft:n.rescueLeft-a.rescue,glassLeft:n.glassLeft-a.glass,
          life:Math.max(0,n.life-1),discards:n.discards-a.discard,path:[...n.path,step]};
        // Same remaining resources and supply: a smaller accumulated score cannot improve a future prefix.
        const key=[child.cash,child.burnLeft,child.rescueLeft,child.glassLeft,child.life,child.discards].join('/');
        if(!next.has(key)||child.sum>next.get(key).sum)next.set(key,child);
      }
    }
    layer=[...next.values()];visited+=layer.length;prefixes.push(...layer);
  }
  const best=layer.reduce((a,b)=>a.sum>b.sum||a.sum===b.sum&&a.cash>=b.cash?a:b);
  let frontier=[];
  if(targetHeat!==null){
    const T=BigInt(targetHeat);if(T<=0n)throw Error('invalid-budget-target');
    const wins=prefixes.filter(n=>n.sum>=T&&n.sum-BigInt(n.path.at(-1).score)<T);
    const nondominated=wins.filter(n=>!wins.some(m=>m.path.length<=n.path.length&&m.cash>=n.cash&&(m.path.length<n.path.length||m.cash>n.cash)));
    const unique=new Set();
    frontier=nondominated.filter(n=>{const k=[n.path.length,n.cash,n.discards].join('/');if(unique.has(k))return false;unique.add(k);return true;})
      .map(n=>({hands:n.path.length,goldSpent:gold-n.cash,goldAfter:n.cash,discardsSpent:discards-n.discards,score:String(n.sum),path:n.path}));
  }
  return {stableFirst:String(stable),capacity:String(best.sum),goldAfter:best.cash,witness:best.path,frontier,
    guarantee:'maximum only over declared known ready-hand/action supply; not optimality over a real save or random deals',
    statesVisited:visited};
}
export function interval(rows,{includeThin=false,baseFloor=1n}={}){
  const ordinary=rows.filter(r=>r.class==='ordinary'||includeThin&&r.class==='thin');
  const mature=rows.filter(r=>r.class==='mature');
  const U=minimum(ordinary.map(r=>BigInt(r.capacity))),L=maximum(mature.map(r=>BigInt(r.stableFirst)))+1n;
  const strongU=minimum(mature.map(r=>BigInt(r.capacity)));
  return {strict:{lower:String(L),upper:String(U),feasible:L<=U},
    basic:{lower:String(baseFloor),upper:String(U),feasible:BigInt(baseFloor)<=U},
    matureOnly:{lower:String(L),upper:String(strongU),feasible:L<=strongU},
    ordinaryLimiter:ordinary.find(r=>BigInt(r.capacity)===U).id,
    matureLowerLimiter:mature.find(r=>BigInt(r.stableFirst)+1n===L).id};
}
export function lockChallenge(options){
  const allowed=['chapter','stage','baseWarm','grade','source','policyVersion'];
  if(Object.keys(options).some(k=>!allowed.includes(k)))throw Error('challenge-input-must-not-include-score-inventory-or-samples');
  const {chapter,stage,baseWarm,grade,source='player',policyVersion='offline-shadow-v1'}=options;
  if(!Number.isSafeInteger(chapter)||chapter<1||chapter>80||!Number.isInteger(grade)||grade<1||grade>4096||!['player','published-contract'].includes(source))throw Error('invalid-challenge');
  const warm=typeof baseWarm==='object'?frac(baseWarm.n,baseWarm.d):frac(baseWarm);
  if(cmp(warm,frac(0n))<=0)throw Error('invalid-challenge-base');
  const value=ceil(mul(mul(warm,frac(grade)),stageRatio(stage)));
  return Object.freeze({policyVersion,chapter,stage,grade,source,baseWarm:warm,target:String(value),b14Increment:String(ceil(frac(value,20n))),locked:true});
}
export function trialTarget(inputs,chapter,stage=0,grade=1){
  const table=inputs.recommendedTrial.mainTargets;
  if(!Number.isSafeInteger(chapter)||chapter<1||chapter>80||!Number.isInteger(grade)||grade<1||grade>64)throw Error('invalid-trial-target');
  let base=chapter<=8?frac(table[chapter-1]):frac(table[7]);
  if(chapter>8)for(let c=8;c<chapter;c++)base=mul(base,inputs.recommendedTrial.endlessGrowth);
  return ceil(mul(mul(base,stageRatio(stage)),frac(grade)));
}
export const interest=(gold,cap=5)=>Math.min(cap,Math.floor(gold/5));
export const cashHeat=gold=>Math.min(60,2*gold);
export const cashMult=gold=>gold>=20?frac(9n,5n):frac(1n);
export function cashOpportunity(gold,pay,{refund=0,interestCap=5,capital=false,xiemu=false,otherHeat=100}={}){
  if(![gold,pay,refund].every(v=>Number.isSafeInteger(v)&&v>=0)||gold-pay+refund<0)throw Error('invalid-cash-transition');
  const after=gold-pay+refund;
  const reward=g=>interest(g,interestCap)+(capital?Math.min(6,Math.floor(g/10)):0)+(xiemu?Math.min(2,Math.floor(g/5)):0);
  const multiplierNeeded=div(cashMult(gold),cashMult(after));
  const combinedNeeded=mul(multiplierNeeded,frac(otherHeat+cashHeat(gold),otherHeat+cashHeat(after)));
  return {before:gold,after,nextClearCashGap:pay-refund+reward(gold)-reward(after),cashMultBefore:cashMult(gold),cashMultAfter:cashMult(after),cashHeatBefore:cashHeat(gold),cashHeatAfter:cashHeat(after),otherSourceGainNeeded:combinedNeeded,
    assumptions:'same successful clear, same hands remaining; no unlisted economy hooks; actual saved interest cap and actual sale refund must be used'};
}
export function makeReport(inputs){
  const policySpecs=[{name:'legacy',policy:'legacy',cap:4},{name:'none',policy:'none',cap:4},
    ...inputs.caps.flatMap(cap=>['cap-product','cap-max'].map(policy=>({name:policy+'-'+cap,policy,cap}))),
    {name:'linear-max',policy:'linear-max',cap:4}];
  const rows=[],windows=[],curveChecks=[],chapterGrades=[],challengeCandidates=[];
  for(const chapter of inputs.chapters){
    for(const spec of policySpecs){
      const chapterRows=[];
      for(const stage of inputs.stages){
        const count=(chapter-1)*3+stage;
        const hands=stage===2?inputs.supply.fastBossHands:inputs.supply.hands;
        const stageRows=inputs.states.map(state=>({id:state.id,class:state.class,chapter,stage,policy:spec.name,count,hands,
          factor:passive(state.families,count,spec.policy,spec.cap),...((b)=>({stableFirst:b.stableFirst,capacity:b.capacity}))(budget(state,count,{policy:spec.policy,cap:spec.cap,hands}))}));
        rows.push(...stageRows);chapterRows.push(stageRows);
        windows.push({chapter,stage,policy:spec.name,ordinary:interval(stageRows,{baseFloor:target(chapter,stage)}),includingThin:interval(stageRows,{includeThin:true,baseFloor:target(chapter,stage)})});
        if(spec.name==='legacy')for(const growth of [frac(12n,5n),frac(3n),frac(11n,2n),frac(61n,10n)]){
          const T=target(chapter,stage,growth);
          curveChecks.push({chapter,stage,growth,target:String(T),failed:stageRows.filter(r=>BigInt(r.capacity)<T).map(r=>r.id),stableFirstClear:stageRows.filter(r=>BigInt(r.stableFirst)>=T).map(r=>r.id)});
        }
      }
      if(spec.name==='legacy'){
        for(const growth of [frac(12n,5n),frac(3n),frac(11n,2n),frac(61n,10n)]){
          const warm=target(chapter,0,growth),bossMature=chapterRows[2].filter(r=>r.class==='mature');
          let warmExact=chapter<=8?frac(warm):frac(160000n);
          if(chapter>8)for(let c=8;c<chapter;c++)warmExact=mul(warmExact,growth);
          // Warm is an already-rounded public table cell. Lock function uses a single ceiling per stage.
          // Recompute candidate target from exact curve in the loop below to avoid earlier-ceil amplification.
          const low=maximum(bossMature.map(r=>BigInt(r.stableFirst)))/2n+1n;
          const high=minimum(chapterRows[2].filter(r=>r.class==='mature').map(r=>BigInt(r.capacity)))/2n;
          const eligible=[];
          for(const grade of [1,4,16,64,256,1024,4096]){
            const targets=inputs.stages.map(stage=>String(target(chapter,stage,growth,160000n,BigInt(grade))));
            const matureBudgetAll=chapterRows.every((rs,s)=>rs.filter(r=>r.class==='mature').every(r=>BigInt(r.capacity)>=BigInt(targets[s])));
            const matureBossPressure=chapterRows[2].filter(r=>r.class==='mature').every(r=>BigInt(r.stableFirst)<BigInt(targets[2]));
            eligible.push({grade,targets,matureBudgetAll,matureBossPressure,
              failures:chapterRows.flatMap((rs,s)=>rs.filter(r=>BigInt(r.capacity)<BigInt(targets[s])).map(r=>({state:r.id,stage:s}))),
              firstHandClear:chapterRows.flatMap((rs,s)=>rs.filter(r=>BigInt(r.stableFirst)>=BigInt(targets[s])).map(r=>({state:r.id,stage:s})))});
          }
          // Integer grade interval exact across all stages; pressure required only at boss, not every warmup.
          const required= floor(div(frac(maximum(bossMature.map(r=>BigInt(r.stableFirst)))),mul(warmExact,stageRatio(2))))+1n;
          const affordable=minimum(chapterRows.map((rs,s)=>floor(div(frac(minimum(rs.filter(r=>r.class==='mature').map(r=>BigInt(r.capacity)))),mul(warmExact,stageRatio(s))))));
          const clippedUpper=affordable<4096n?affordable:4096n;
          const clippedLower=required>1n?required:1n;
          const gradeLow=clippedLower<=clippedUpper?Number(clippedLower):null;
          const gradeHigh=gradeLow!==null?Number(clippedUpper):null;
          challengeCandidates.push({chapter,growth,baseWarm:String(warm),matureWarmInterval:{lower:String(low),upper:String(high)},
            integerGradeInterval:{lower:gradeLow,upper:gradeHigh,cap:4096,feasible:gradeLow!==null},presets:eligible,
            criterion:'mature warmup overshoot explicitly allowed; finite budget in all phases and a boss pressure window; not user-approved universal acceptance'});
        }
      }
      // New-identity joint-anchor ANALYSIS: same fixed Lv5 reference supply for all chapters.
      // It is not an adaptive player estimate and it is not a recommended product target.
      const warmUpper=minimum(chapterRows.map((rs,s)=>floor(div(frac(minimum(rs.filter(r=>r.class!=='mature').map(r=>BigInt(r.capacity)))),stageRatio(s)))));
      const baseWarm=warmUpper*3n/4n;
      const grades=[];
      for(let grade=1;grade<=64;grade++){
        const targets=inputs.stages.map(stage=>lockChallenge({chapter,stage,baseWarm,grade}).target);
        const matureCanAllClear=chapterRows.every((rs,s)=>rs.filter(r=>r.class==='mature').every(r=>BigInt(r.capacity)>=BigInt(targets[s])));
        // At least the boss offers a resource/second-hand window; no requirement that every warmup is multi-hand.
        const allMatureBossNeedMore=chapterRows[2].filter(r=>r.class==='mature').every(r=>BigInt(r.stableFirst)<BigInt(targets[2]));
        if(matureCanAllClear&&allMatureBossNeedMore)grades.push(grade);
      }
      const existingWarm=target(chapter,0);
      const currentFloorGrades=[];
      for(let grade=1;grade<=64;grade++){
        const targets=inputs.stages.map(stage=>lockChallenge({chapter,stage,baseWarm:existingWarm,grade}).target);
        if(chapterRows.every((rs,s)=>rs.filter(r=>r.class==='mature').every(r=>BigInt(r.capacity)>=BigInt(targets[s])))&&chapterRows[2].filter(r=>r.class==='mature').every(r=>BigInt(r.stableFirst)<BigInt(targets[2])))currentFloorGrades.push(grade);
      }
      chapterGrades.push({chapter,policy:spec.name,modelWarmUpper:String(warmUpper),jointAnchor:String(baseWarm),feasibleGrades:grades,
        feasibleGradesOnExistingD0Floor:currentFloorGrades,
        status:'jointAnchor is a controlled interval witness, not an approved baseline, not a per-player recalculation'});
    }
  }
  const gf=inputs.states.find(r=>r.id==='mature-GF'),count=36;
  const resources=[
    {id:'stable',options:{}},{id:'f06-last-use',options:{finiteRemaining:1}},{id:'f06-four-uses',options:{finiteRemaining:4}},
    {id:'cold-once-one-discard',options:{rescue:true}},{id:'glass-once-safe-backup',options:{glass:true}},
    {id:'burn-once-29',options:{burn:true,gold:29}},{id:'burn-once-30',options:{burn:true,gold:30}},
  ].flatMap(test=>['legacy','cap-max'].map(policy=>({case:test.id,policy,...budget(gf,count,{...test.options,policy,cap:4,targetHeat:policy==='legacy'?String(target(13,2)):'195264'})})));
  const exactPair=inputs.userReports.find(r=>r.exactTrace)?.exactTrace;
  const pairFactor=route('G',35);
  if(!exactPair||cmp(pairFactor,exactPair.factor)!==0)throw Error('public pair factor mismatch');
  const verifiedPair=score({H:'59',M:frac(30n),families:['G']},35);
  if(String(verifiedPair)!=='26221278')throw Error('public pair score mismatch');
  const trialSlices=inputs.chapters.flatMap(chapter=>inputs.stages.map(stage=>{
    const hands=stage===2?3:4;
    const T=trialTarget(inputs,chapter,stage);
    const values=inputs.states.map(state=>({id:state.id,stable:score(state,(chapter-1)*3+stage,'cap-max',4),
      capacity:BigInt(budget(state,(chapter-1)*3+stage,{policy:'cap-max',cap:4,hands}).capacity)}));
    const grades=inputs.recommendedTrial.challengeGrades.map(grade=>{
      const target=trialTarget(inputs,chapter,stage,grade);
      return {grade,target:String(target),failed:values.filter(v=>v.capacity<target).map(v=>v.id),
        stableFirstClear:values.filter(v=>v.stable>=target).map(v=>v.id)};
    });
    return {chapter,stage,hands,target:String(T),failed:values.filter(v=>v.capacity<T).map(v=>v.id),
      stableFirstClear:values.filter(v=>v.stable>=T).map(v=>v.id),grades};
  }));
  const trainingRepair=[{chapter:13,extraLevels:2},{chapter:20,extraLevels:10}].flatMap(({chapter,extraLevels})=>
    inputs.states.filter(r=>r.class==='ordinary').map(state=>{
      const perLevel={G:[55n,1n],S:[35n,frac(1n,2n)],F:[30n,frac(1n,2n)]}[state.families[0]];
      const incrementM=typeof perLevel[1]==='bigint'?frac(perLevel[1]):perLevel[1];
      const m=frac(BigInt(state.M.n)*BigInt(incrementM.d)+BigInt(extraLevels)*BigInt(incrementM.n)*BigInt(state.M.d),BigInt(state.M.d)*BigInt(incrementM.d));
      const improved={...state,H:String(BigInt(state.H)+BigInt(extraLevels)*perLevel[0]),M:m};
      const S=score(improved,(chapter-1)*3,'cap-max',4),T=trialTarget(inputs,chapter,2);
      return {chapter,state:state.id,levelBefore:state.level,levelAfter:state.level+extraLevels,normalPriceBudget:4*extraLevels,perHand:String(S),bossTarget:String(T),threeHandCapacity:String(S*3n),feasible:S*3n>=T,
        availability:'hypothetical accumulated +1 offers; not guaranteed stock in one shop or natural purchase probability'};
    }));
  const pairCompressed=score({H:'59',M:frac(30n),families:['G']},35,'cap-max',4);
  const triplePlain=score({H:'126',M:frac(99n,2n),families:['G']},35,'cap-max',4);
  const tripleAssist=score({H:'126',M:frac(99n,2n),families:['G']},35,'cap-max',4,frac(99n,2n),frac(4n));
  const rootPre=mul(frac(inputs.rootTrace.H),inputs.rootTrace.preRouteM);
  const rootM=mul(inputs.rootTrace.preRouteM,route('G',inputs.rootTrace.G));
  const rootScore=floor(mul(frac(inputs.rootTrace.H),rootM));
  const rootNextScore=floor(mul(rootPre,route('G',inputs.rootTrace.nextG)));
  if(cmp(rootM,inputs.rootTrace.finalM)!==0||String(rootScore)!==inputs.rootTrace.score)throw Error('root-transcription-inconsistent');
  const economy=[20,27,28,32,33,38,206].map(g=>cashOpportunity(g,8));
  const burnEconomy=[49,50,60,206].map(g=>({gold:g,burn30:cashOpportunity(g,30,{xiemu:true}),burn20:cashOpportunity(g,20,{xiemu:true}),
    finalMultiplierRatio30:mul(frac(4n),div(cashMult(g-30),cashMult(g)))}));
  const locked=lockChallenge({chapter:13,stage:2,baseWarm:warmFraction(13),grade:4});
  const q48=chapterGrades.find(r=>r.chapter===13&&r.policy==='cap-max-4');
  return {schema:'endless-shadow-report-v1',baseSha:inputs.baseSha,identity:inputs.identity,kernelBlobs:inputs.kernelBlobs,
    evidence:inputs.evidence,standards:inputs.standards,recommendedTrial:{...inputs.recommendedTrial,slices:trialSlices,trainingRepair,sourceContrast:{pairCompressed:String(pairCompressed),pairThreeHandCapacity:String(pairCompressed*3n),tripleNoAssist:String(triplePlain),tripleAndOneAssist:String(tripleAssist),oneAssistThenPlain:String(tripleAssist+triplePlain),chapter13Boss:String(trialTarget(inputs,13,2)),meaning:'constructed same-card/joker-family comparison, not a claim these extra cards are in the user current hand'}},rows,windows,curveChecks,chapterGrades,challengeCandidates,resources,economy,burnEconomy,
    rootTrace:{...inputs.rootTrace,computedM:rootM,computedScore:String(rootScore),withoutRoute:String(floor(rootPre)),nextHandSameInputs:String(rootNextScore),remark:'transcribed formula verified; no original save/replay obtained'},
    historicalHighScoreGuard:{source:'PR144/G14 published formula reconstruction; not a new natural run',H:'977',rawM:frac(3726n,5n),S:21,
      legacy:String(score({H:'977',M:frac(3726n,5n),families:['S']},21)),
      cap4:String(score({H:'977',M:frac(3726n,5n),families:['S']},21,'cap-max',4)),
      warning:'bounded passive changes drastically reduce this historical same-input absolute score; new rules require a new run; no migration matrix; do not claim the historical absolute-score guard passed'},
    reportedScoreCeilings:inputs.userReports.filter(r=>r.target).map((r,i)=>({name:r.name,handsAssumed:i===1?3:4,reportedScore:r.score,reportedTarget:r.target,
      optimisticRepeatCeiling:String(BigInt(r.score)*BigInt(i===1?3:4)),largestTargetMultipleUnderRepeat:Number(BigInt(r.score)*BigInt(i===1?3:4)/BigInt(r.target)),
      warning:'conditional arithmetic on reported peaks only; not sustainable capacity, not an auto-grade input, and not a bug certification'})),
    upgradeOpportunity:inputs.states.filter(r=>r.class==='ordinary').map(r=>{
      const increments={G:[110n,2n],S:[70n,1n],F:[60n,1n]}[r.families[0]];
      const before=mul(frac(r.H),r.M),after=mul(frac(BigInt(r.H)+increments[0]),frac(BigInt(r.M.n)+increments[1]*BigInt(r.M.d),r.M.d));
      return {state:r.id,cost:8,meaning:'two normal-price four-gold hand upgrades; no coupons/sale/gift; same other sources',
        rawGain:div(after,before),spendAt27FailsPackageBreakEven:cmp(div(after,before),frac(9n,5n))<0,
        remark:'exact pre-floor ratio; actual floor and current scorer checked separately in tests'};
    }),
    reports:inputs.userReports.map(r=>({...r,...(r.target?{excess:frac(BigInt(r.score)-BigInt(r.target),BigInt(r.target))}:{}),verifiedArithmeticChain:!!r.exactTrace,arithmeticStatus:r.exactTrace?'exact public chain verified; no identity clarification needed for this chain':'unverified contributions'})),
    passiveSlope:{legacyPerChapter:{G:frac(19683n,8000n),S:frac(343n,125n),F:frac(2197n,1000n)},targetPerChapter:frac(12n,5n),
      groupRelative:frac(19683n,19200n),caps:'after saturation auto growth is 1; linear-max logarithmic growth decays; acquired joker/card/hero operations remain outside this multiplier'},
    fixedGradeAttacks:{lock:locked,zeroSamples:locked.target,lowSamples:locked.target,peak:locked.target,soldInventory:locked.target,
      reason:'API refuses score/inventory/sample fields; grade source is explicit player choice or published contract. No low-sample estimator or hidden catch-up.',
      capFailure:'current x2.4 with grade<=4096 cannot close the chapter13 compound spread; optional steeper exogenous curves have selected-state windows, not universal fairness'},
    glassLossStress:{probability:frac(1n,4n),checksPerOriginal:1,withinStage:'original glass selected at most once; disjoint next hands contain normal backups',nextStageSafeCapacity:budget(gf,count,{policy:'cap-max',cap:4}).capacity,nextStagePossibleGlassCapacity:budget(gf,count,{policy:'cap-max',cap:4,glass:true}).capacity,remark:'conditional constructed supplies, not expectation or natural survivability'},
    preservedScoreWitness:challengeCandidates.find(r=>r.chapter===13&&r.growth.n==='61')?.presets.find(r=>r.grade===4096)??null,
    jointWitness:q48?{baseWarm:q48.jointAnchor,grade:48,targets:[0,1,2].map(stage=>lockChallenge({chapter:13,stage,baseWarm:q48.jointAnchor,grade:48}).target),
      feasible:q48.feasibleGrades.includes(48),meaning:'one math witness for selected recipes and criteria; not production parameters or whole-game acceptance'}:null,
    blocker:'The public Amo pair chain is verified and has no identity blocker. Full-save supply optimality and the two other incomplete chains are not inferred; these do not block the new-profile shadow trial.',
    execution:'pure BigInt arithmetic; no game UI, new art, gameplay parameter changes or save migration'};
}
