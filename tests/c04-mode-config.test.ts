import {describe,expect,it} from 'vitest';
import {R2_MODE_CATALOG,resolveR2ModeConfig,validateR2ModeCatalog,r2DifficultyTargetMultiplier,r2ModeSeedAllowed} from '../src/content/r2Modes';

// Literal D31 goldens. No expected resource, seed, condition or reward is read from the module under test.
const D0 = {
  mode:'standard',difficulty:0,challengeId:null,targetMultiplier:{n:'1',d:'1'},
  baseHandSize:8,baseHands:4,baseDiscards:3,initialGold:6,jokerSlots:5,baseInterestCap:5,
  reroll:{allowed:true,start:2,cap:10},characterAbilityEnabled:true,
  startingRanks:[2,3,4,5,6,7,8,9,10,11,12,13,14],startingJokers:[],
  startingChapter:1,startingStageIndex:0,programsEnabled:true,eligibleProgramIds:['PG01','PG02','PG03','PG04'],
  seedPolicy:{kind:'free',values:[]},progressionEligible:true,enhancementsAllowed:true,chapterJokerBanCount:0,
};
const challengeGoldens = [
  {id:'Q01',seeds:['challenge/q01/0','challenge/q01/1','challenge/q01/2'],patch:{characterAbilityEnabled:false},cards:52},
  {id:'Q02',seeds:['challenge/q02/0','challenge/q02/1','challenge/q02/2'],patch:{jokerSlots:3},cards:52},
  {id:'Q03',seeds:['challenge/q03/0','challenge/q03/1','challenge/q03/2'],patch:{baseInterestCap:0},cards:52},
  {id:'Q04',seeds:['challenge/q04/0','challenge/q04/1','challenge/q04/2'],patch:{startingRanks:[2,3,4,5,6,7,8,9,10,14]},cards:40},
  {id:'Q05',seeds:['challenge/q05/0','challenge/q05/1','challenge/q05/2'],patch:{startingRanks:[7,8,9,10,11,12,13,14]},cards:32},
  {id:'Q06',seeds:['challenge/q06/0','challenge/q06/1','challenge/q06/2'],patch:{reroll:{allowed:false,start:2,cap:10},eligibleProgramIds:['PG01','PG02','PG03']},cards:52},
  {id:'Q07',seeds:['challenge/q07/0','challenge/q07/1','challenge/q07/2'],patch:{baseHandSize:6},cards:52},
  {id:'Q08',seeds:['challenge/q08/0','challenge/q08/1','challenge/q08/2'],patch:{baseDiscards:1},cards:52},
  {id:'Q09',seeds:['challenge/q09/0','challenge/q09/1','challenge/q09/2'],patch:{initialGold:0,startingJokers:[
    {definitionId:'huimaqiang',paidPrice:0,edition:'none'},{definitionId:'e08',paidPrice:0,edition:'none'},
  ]},cards:52},
  {id:'Q10',seeds:['challenge/q10/0','challenge/q10/1','challenge/q10/2'],patch:{enhancementsAllowed:false},cards:52},
  {id:'Q11',seeds:['challenge/q11/0','challenge/q11/1','challenge/q11/2'],patch:{chapterJokerBanCount:1},cards:52},
  {id:'Q12',seeds:['challenge/q12/0','challenge/q12/1','challenge/q12/2'],patch:{startingChapter:3,startingStageIndex:6,initialGold:20},cards:52},
];
const tutorial = {
  ...D0,mode:'tutorial',programsEnabled:false,eligibleProgramIds:[],
  seedPolicy:{kind:'fixed-set',values:['r2/tutorial/core-v1']},progressionEligible:false,
};
function resolved(input:unknown) {
  const result=resolveR2ModeConfig(input);
  expect(result.ok).toBe(true);
  if(!result.ok)throw Error(result.code);
  return result.config;
}
// Deliberately mutable and untyped JSON drafts are adversarial schema input, never expected-output oracles.
const draft=():any=>JSON.parse(JSON.stringify(R2_MODE_CATALOG));
function rejectsCatalog(change:(catalog:any)=>void) {
  const value=draft();change(value);
  expect(validateR2ModeCatalog(value).length).toBeGreaterThan(0);
}

describe('C04.1 finite mode configuration / independent D31 goldens',()=>{
  it('resolves explicit standard mode with the complete literal D0 defaults',()=>{
    expect(resolved({mode:'standard'})).toEqual(D0);
    expect(resolved({mode:'standard',difficulty:0,challengeId:null,programsEnabled:true})).toEqual(D0);
  });
  it('describes final cumulative difficulty values without multiplying D1 again',()=>{
    const rows=[
      {difficulty:0,targetMultiplier:{n:'1',d:'1'},baseDiscards:3,initialGold:6,reroll:{allowed:true,start:2,cap:10}},
      {difficulty:1,targetMultiplier:{n:'6',d:'5'},baseDiscards:3,initialGold:6,reroll:{allowed:true,start:2,cap:10}},
      {difficulty:2,targetMultiplier:{n:'6',d:'5'},baseDiscards:2,initialGold:6,reroll:{allowed:true,start:2,cap:10}},
      {difficulty:3,targetMultiplier:{n:'6',d:'5'},baseDiscards:2,initialGold:4,reroll:{allowed:true,start:3,cap:11}},
    ];
    for(const row of rows)expect(resolved({mode:'standard',difficulty:row.difficulty})).toEqual({...D0,...row});
    expect(R2_MODE_CATALOG.difficulties.map((row:any)=>[row.id,row.label,row.unlockAfterDifficulty]))
      .toEqual([[0,'D0',null],[1,'D1',0],[2,'D2',1],[3,'D3',2]]);
  });
  it('exports exact numeric difficulty multipliers and rejects every invalid numeric/string value',()=>{
    for(const [difficulty,multiplier] of [[0,{n:'1',d:'1'}],[1,{n:'6',d:'5'}],[2,{n:'6',d:'5'}],[3,{n:'6',d:'5'}]] as const)
      expect(r2DifficultyTargetMultiplier(difficulty)).toEqual(multiplier);
    for(const value of [-1,4,1.5,NaN,Infinity,-Infinity,Number.MAX_SAFE_INTEGER,'0','D1',null,undefined,true,{},[]])
      expect(r2DifficultyTargetMultiplier(value)).toBeUndefined();
  });
  it.each(challengeGoldens)('$id has one independent limitation, the exact seed set and $cards cards',({id,seeds,patch,cards})=>{
    const config=resolved({mode:'challenge',challengeId:id});
    expect(config).toEqual({...D0,mode:'challenge',challengeId:id,progressionEligible:false,
      seedPolicy:{kind:'fixed-set',values:seeds},...patch});
    expect(config.startingRanks.length*4).toBe(cards);
    const row=R2_MODE_CATALOG.challenges.find((row:any)=>row.id===id);
    expect(row?.config).toEqual(config);
    expect(row?.setup).toEqual({initialShopVisits:1,priorChapters:id==='Q12'?'boss-locks-only':'none'});
  });
  it('keeps disabled programs empty and excludes unusable PG04 from no-reroll Q06',()=>{
    expect(resolved({mode:'standard',programsEnabled:false})).toEqual({...D0,programsEnabled:false,eligibleProgramIds:[]});
    expect(resolved({mode:'challenge',challengeId:'Q06',programsEnabled:false}).eligibleProgramIds).toEqual([]);
    expect(resolved({mode:'challenge',challengeId:'Q06',programsEnabled:true}).eligibleProgramIds).toEqual(['PG01','PG02','PG03']);
  });
  it('fixes tutorial to Erxiang, D0, one seed and three successful real actions with skipping',()=>{
    expect(resolved({mode:'tutorial'})).toEqual(tutorial);
    expect(resolved({mode:'tutorial',difficulty:0,challengeId:null,programsEnabled:false})).toEqual(tutorial);
    expect(R2_MODE_CATALOG.tutorial).toEqual({characterId:'erxiang',skippable:true,advance:'successful-real-command',
      steps:[{id:'select-and-score',action:'PlayHand'},{id:'discard-and-keep',action:'DiscardHand'},{id:'buy-and-compare',action:'BuyOffer'}],config:tutorial});
  });
  it('publishes all four finite program conditions and rewards, paid only once after actual Boss success',()=>{
    expect(R2_MODE_CATALOG.programs.map((row:any)=>({id:row.id,name:row.name,requiresReroll:row.requiresReroll,condition:row.condition,reward:row.reward})))
      .toEqual([
        {id:'PG01',name:'换场大师',requiresReroll:false,condition:{kind:'distinct-hand-types',minimum:3},reward:{kind:'gold',amount:4}},
        {id:'PG02',name:'一招鲜',requiresReroll:false,condition:{kind:'same-hand-type-plays',minimum:3},reward:{kind:'gold',amount:4}},
        {id:'PG03',name:'不打烊',requiresReroll:false,condition:{kind:'gold-before-reward',minimum:15},
          reward:{kind:'used-hand-upgrade',levels:1,maximumLevel:30,selection:'uniform',emptyCandidates:'skip-without-draw'}},
        {id:'PG04',name:'谢幕留客',requiresReroll:true,condition:{kind:'last-opportunity-clear'},
          reward:{kind:'next-shop-free-reroll',count:1,advanceRerollCount:true,expires:'next-shop-exit'}},
      ]);
    for(const row of R2_MODE_CATALOG.programs)expect({offerCount:row.offerCount,distinctOffers:row.distinctOffers,
      optional:row.optional,abandonAllowed:row.abandonAllowed,abandonPenalty:row.abandonPenalty,scope:row.scope,
      countSource:row.countSource,skippedStagesCount:row.skippedStagesCount,rewardAt:row.rewardAt,maxClaimsPerChapter:row.maxClaimsPerChapter})
      .toEqual({offerCount:2,distinctOffers:true,optional:true,abandonAllowed:true,abandonPenalty:0,scope:'chapter',
        countSource:'successful-submitted-plays',skippedStagesCount:false,rewardAt:'chapter-boss-clear',maxClaimsPerChapter:1});
  });
  it('keeps the JSON catalog deeply frozen and limits modes to the separate three-ID axis',()=>{
    expect(R2_MODE_CATALOG.modes.map((row:any)=>row.id)).toEqual(['standard','challenge','tutorial']);
    expect(R2_MODE_CATALOG.challenges.map((row:any)=>row.id)).toEqual(['Q01','Q02','Q03','Q04','Q05','Q06','Q07','Q08','Q09','Q10','Q11','Q12']);
    expect(validateR2ModeCatalog(R2_MODE_CATALOG)).toEqual([]);
    expect(draft()).toEqual(R2_MODE_CATALOG);
    function frozen(value:unknown):void {
      if(value!==null&&typeof value==='object'){
        expect(Object.isFrozen(value)).toBe(true);
        for(const child of Object.values(value))frozen(child);
      }else expect(['function','bigint','undefined'].includes(typeof value)).toBe(false);
    }
    frozen(R2_MODE_CATALOG);frozen(resolved({mode:'standard'}));
  });
  it('rejects missing/unknown mode, unknown keys and non-JSON input instead of silently selecting D0',()=>{
    for(const value of [null,undefined,[],{},'standard',{mode:'normal'},{mode:'endless'},{mode:'daily'},
      {mode:'standard',seed:'free'},{mode:'standard',characterId:'amo'},{mode:'standard',targetMultiplier:{n:'6',d:'5'}},
      {mode:'standard',difficulty:undefined},{mode:'standard',programsEnabled:1},{mode:'standard',programsEnabled:undefined},new Date()]){
      const result=resolveR2ModeConfig(value);expect(result.ok).toBe(false);if(!result.ok)expect(result.code).not.toBe('');
    }
    const withGetter=Object.defineProperty({mode:'standard'},'difficulty',{get:()=>{throw Error('getter must not run');},enumerable:true});
    expect(resolveR2ModeConfig(withGetter).ok).toBe(false);
  });
  it('rejects illegal difficulties, layered challenges and incompatible tutorial switches',()=>{
    for(const difficulty of [-1,4,0.5,NaN,Infinity,'0','D0',null,false])expect(resolveR2ModeConfig({mode:'standard',difficulty}).ok).toBe(false);
    for(const value of [{mode:'standard',challengeId:'Q01'},{mode:'challenge'},{mode:'challenge',challengeId:null},
      {mode:'challenge',challengeId:'Q13'},{mode:'challenge',challengeId:'q01'},{mode:'challenge',challengeId:['Q01','Q02']},
      {mode:'challenge',challengeId:'Q01',difficulty:1},{mode:'tutorial',difficulty:1},
      {mode:'tutorial',challengeId:'Q01'},{mode:'tutorial',programsEnabled:true}])expect(resolveR2ModeConfig(value).ok).toBe(false);
  });
  it('allows only free seeds within 1..4096 characters or the exact fixed mode seed set',()=>{
    const standard=resolved({mode:'standard'}),challenge=resolved({mode:'challenge',challengeId:'Q01'}),teaching=resolved({mode:'tutorial'});
    for(const seed of ['a','custom/seed','x'.repeat(4096)])expect(r2ModeSeedAllowed(standard,seed)).toBe(true);
    for(const seed of ['',null,undefined,1,[],{},'x'.repeat(4097)])expect(r2ModeSeedAllowed(standard,seed)).toBe(false);
    for(const seed of ['challenge/q01/0','challenge/q01/1','challenge/q01/2'])expect(r2ModeSeedAllowed(challenge,seed)).toBe(true);
    for(const seed of ['challenge/q02/0','challenge/q01/3','challenge/Q01/0','r2/tutorial/core-v1','custom'])expect(r2ModeSeedAllowed(challenge,seed)).toBe(false);
    expect(r2ModeSeedAllowed(teaching,'r2/tutorial/core-v1')).toBe(true);
    expect(r2ModeSeedAllowed(teaching,'challenge/q01/0')).toBe(false);
  });
  it('does not mutate input, catalog or caller-held multiplier snapshots',()=>{
    const input={mode:'challenge',challengeId:'Q09',programsEnabled:false},before=JSON.stringify(input),catalog=JSON.stringify(R2_MODE_CATALOG);
    resolved(input);validateR2ModeCatalog(draft());
    const multiplier=r2DifficultyTargetMultiplier(1);if(multiplier)multiplier.n='999';
    expect(r2DifficultyTargetMultiplier(1)).toEqual({n:'6',d:'5'});
    expect(JSON.stringify(input)).toBe(before);expect(JSON.stringify(R2_MODE_CATALOG)).toBe(catalog);
  });
  it('rejects malformed catalogs, unknown fields and missing/invalid/duplicate identities',()=>{
    for(const value of [null,[],{},'catalog'])expect(validateR2ModeCatalog(value).length).toBeGreaterThan(0);
    for(const key of ['modes','difficulties','challenges','programs']){
      rejectsCatalog(value=>value[key].push(value[key][0]));
      rejectsCatalog(value=>value[key][1].id=value[key][0].id);
      rejectsCatalog(value=>value[key][0].id='unknown');
      rejectsCatalog(value=>value[key].pop());
    }
    rejectsCatalog(value=>value.script='run()');
    rejectsCatalog(value=>value.challenges[0].config.challenges=['Q01','Q02']);
  });
  it('rejects fractional, negative, unsafe and non-finite resources at every config level',()=>{
    for(const bad of [-1,0.5,NaN,Infinity,-Infinity,Number.MAX_SAFE_INTEGER+1]){
      for(const key of ['baseHandSize','baseHands','baseDiscards','initialGold','jokerSlots','baseInterestCap'])
        rejectsCatalog(value=>value.difficulties[0][key]=bad);
      rejectsCatalog(value=>value.challenges[8].config.initialGold=bad);
      rejectsCatalog(value=>value.tutorial.config.reroll.cap=bad);
    }
    rejectsCatalog(value=>value.difficulties[0].reroll.start=11);
    rejectsCatalog(value=>value.challenges[0].config.chapterJokerBanCount=2);
  });
  it('rejects illegal rank/deck shapes, unknown or duplicate starting Jokers and improper payment/edition',()=>{
    for(const ranks of [[2,2,3],[1,2,3],[2,15],[7,8,9],[],[2,3,4,5,6,7,8,9,10,11,12,13,14]])
      rejectsCatalog(value=>value.challenges[3].config.startingRanks=ranks);
    rejectsCatalog(value=>value.challenges[8].config.startingJokers[0].definitionId='missing');
    rejectsCatalog(value=>value.challenges[8].config.startingJokers[1].definitionId='huimaqiang');
    rejectsCatalog(value=>value.challenges[8].config.startingJokers[0].paidPrice=8);
    rejectsCatalog(value=>value.challenges[8].config.startingJokers[0].paidPrice=NaN);
    rejectsCatalog(value=>value.challenges[8].config.startingJokers[0].edition='foil');
    rejectsCatalog(value=>value.challenges[8].config.startingJokers[0].edition='unknown');
  });
  it('rejects seed drift, cumulative difficulty inflation, challenge layering and Q12 resource invention',()=>{
    for(const seeds of [[],['custom'],['challenge/q01/0','challenge/q01/0','challenge/q01/2'],['challenge/q02/0','challenge/q02/1','challenge/q02/2']])
      rejectsCatalog(value=>value.challenges[0].config.seedPolicy.values=seeds);
    rejectsCatalog(value=>value.difficulties[2].targetMultiplier={n:'36',d:'25'});
    rejectsCatalog(value=>value.challenges[0].config.difficulty=1);
    rejectsCatalog(value=>value.challenges[0].config.jokerSlots=3);
    rejectsCatalog(value=>value.challenges[11].setup.priorChapters='reward-and-lock');
    rejectsCatalog(value=>value.challenges[11].setup.initialShopVisits=2);
  });
  it('rejects unknown/wrong program conditions, rewards, timing and reroll eligibility',()=>{
    for(const key of ['condition','reward']){
      rejectsCatalog(value=>value.programs[0][key]={kind:'execute-script',source:'grantGold()'});
      rejectsCatalog(value=>value.programs[0][key]=value.programs[2][key]);
    }
    rejectsCatalog(value=>value.programs[0].reward.amount=5);
    rejectsCatalog(value=>value.programs[2].reward.emptyCandidates='reroll');
    rejectsCatalog(value=>value.programs[3].requiresReroll=false);
    rejectsCatalog(value=>value.programs[0].rewardAt='normal-clear');
    rejectsCatalog(value=>value.programs[0].maxClaimsPerChapter=2);
    rejectsCatalog(value=>value.programs[0].skippedStagesCount=true);
    rejectsCatalog(value=>value.programs[3].reward.advanceRerollCount=false);
    rejectsCatalog(value=>value.challenges[5].config.eligibleProgramIds.push('PG04'));
  });
  it('rejects tutorial preview/script advancement, extra steps and non-fixed seeds',()=>{
    rejectsCatalog(value=>value.tutorial.characterId='amo');
    rejectsCatalog(value=>value.tutorial.skippable=false);
    rejectsCatalog(value=>value.tutorial.advance='preview');
    rejectsCatalog(value=>value.tutorial.steps[0].action='SelectCards');
    rejectsCatalog(value=>value.tutorial.steps.push({id:'extra',action:'Wait'}));
    rejectsCatalog(value=>value.tutorial.config.seedPolicy={kind:'free',values:[]});
    rejectsCatalog(value=>value.tutorial.config.programsEnabled=true);
  });
});
