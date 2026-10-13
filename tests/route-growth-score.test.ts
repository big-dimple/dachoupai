import {describe,expect,it} from 'vitest';
import type {PlayingCard} from '../src/cards/types';
import {scoreR2Hand,previewR2Hand,type ScoreInput} from '../src/domain/scoreR2';
import {SeededRng} from '../src/core/SeededRng';
import {r2CreateJoker} from '../src/domain/r2Run';
import {R2_ROUTE_GROWTH_JOKERS} from '../src/content/r2RouteGrowthJokers';
import {R2_GROUP_UPGRADE_JOKERS} from '../src/content/r2GroupUpgradeJokers';
import {R2_ROUTE_GROWTH_VERSION,R2_ROUTE_GROWTH_HASH} from '../src/domain/r2GroupUpgrade';
import {r2RouteFactor,r2RouteFamilies,type R2RouteProgress} from '../src/domain/r2RouteGrowth';
import {aiHandKey,rankAiHandCandidates,type AiHandInput} from '../src/game/AiHandCandidates';
import {r2ScoreOperationText} from '../src/game/r2Help';
import {scorePacketSymbol} from '../src/game/scorePresentation';
import {validateR2Content} from '../src/content/r2Schema';
const identity={contentVersion:R2_ROUTE_GROWTH_VERSION,contentHash:R2_ROUTE_GROWTH_HASH};
const progress=(N=14):R2RouteProgress=>({clears:N,G:N,S:N,F:N});
const suits=['spades','hearts','clubs','diamonds'] as const;
function cards(ranks:number[],paper=0,sameSuit=false):PlayingCard[]{return ranks.map((rank,i)=>({id:'p/'+i,rank:rank as PlayingCard['rank'],suit:sameSuit?'hearts':suits[i%4],...(i<paper?{enhancement:'multiplier-paper' as const}:{})}));}
function joker(id:string,growth={},edition?:PlayingCard['edition']){const j=r2CreateJoker(id,id,8,edition,identity);return {...j,growth:{...j.growth,...growth}};}
function input(hand:PlayingCard[],jokers:ScoreInput['jokers']=[],extra:Partial<ScoreInput>={}):ScoreInput{return {rulesVersion:'r2',runId:'route-score',rootId:'finite',characterId:'neutral',hand,selectedIds:hand.map(c=>c.id),disabledIds:[],jokers,definitions:R2_ROUTE_GROWTH_JOKERS,handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:new SeededRng('finite').snapshot(),amoScoreTiming:'assist-v1',routeGrowth:progress(),...extra};}
const score=(h:PlayingCard[],j:ScoreInput['jokers']=[],extra:Partial<ScoreInput>={})=>scoreR2Hand(input(h,j,extra));
describe('C2 actual scorer finite comparisons',()=>{
  it('validates only the explicit new profile; old cold rescue contract remains strict',()=>{
    expect(validateR2Content(R2_ROUTE_GROWTH_JOKERS,'route-growth-v1')).toEqual([]);
    expect(validateR2Content(R2_ROUTE_GROWTH_JOKERS).length).toBeGreaterThan(0);
    expect(validateR2Content(R2_GROUP_UPGRADE_JOKERS)).toEqual([]);
    for(const d of R2_GROUP_UPGRADE_JOKERS)if(!['mantangcai','c04','c06','jiedongfeng','e11','f10'].includes(d.id))expect(R2_ROUTE_GROWTH_JOKERS.find(v=>v.id===d.id)).toBe(d);
    expect(['mantangcai','c04','c06'].every(id=>!Object.hasOwn(r2CreateJoker(id,id,4,undefined,identity).growth,'coefficient'))).toBe(true);
  });
  it('requires the same explicit pre-hand snapshot in actual, preview and replay, including high card',()=>{
    for(const ranks of [[12,12],[2]])for(const missing of [undefined,{G:0,S:0,F:0},{clears:3,G:4,S:0,F:0},{clears:3,G:0,S:0,F:0,extra:0}]){
      const i=input(cards(ranks),[],{routeGrowth:missing as R2RouteProgress});expect(()=>scoreR2Hand(i)).toThrow('invalid-route-growth-snapshot');expect(()=>previewR2Hand(i)).toThrow('invalid-route-growth-snapshot');
    }
    const i=input(cards([12,12],2)),t=scoreR2Hand(i),p=previewR2Hand(i);
    expect(p.routeGrowth).toEqual(t.routeGrowth);expect(p.possibleScores).toEqual([t.finalScore]);expect(scoreR2Hand({...i,routeGrowth:t.routeGrowth!.before})).toEqual(t);
    expect(()=>scoreR2Hand({...i,definitions:R2_GROUP_UPGRADE_JOKERS})).toThrow('invalid-route-growth-snapshot');
  });
  it('reads 3 clears at 1, 4 at the rate, and caps each family before multiplication',()=>{
    expect([0,1,2,3].map(n=>r2RouteFactor('G',n).toJSON())).toEqual(Array(4).fill({n:'1',d:'1'}));
    expect(r2RouteFactor('G',4).toJSON()).toEqual({n:'27',d:'20'});
    expect(r2RouteFactor('S',4).toJSON()).toEqual({n:'7',d:'5'});expect(r2RouteFactor('F',4).toJSON()).toEqual({n:'13',d:'10'});
    expect(r2RouteFactor('G',95).compare(r2RouteFactor('G',96))).toBeLessThan(0);
    for(const [f,N] of [['G',96],['S',86],['F',109]] as const)expect(r2RouteFactor(f,N).toJSON()).toEqual({n:'1000000000000',d:'1'});
    const extreme=score(cards([3,4,5,6,7],2,true),[],{routeGrowth:progress(Number.MAX_SAFE_INTEGER)});
    expect(extreme.finalScore).toBe('6175000000000000000000000000');expect(extreme.events.filter(e=>e.operation==='route-factor')).toHaveLength(2);
  });
  it('ordinary pairs grow; naked starter sale retains history and thin inputs can still fail',()=>{
    const old=[joker('b10',{heat:{n:'100',d:'1'}}),joker('mantangcai')],hands=[12,11,10,9].map((r,i)=>cards([r,r],i<2?2:1));
    expect(hands.map(h=>score(h,old).finalScore)).toEqual(['39901','39901','26600','26383']);
    expect(hands.map(h=>score(h,old.slice(0,1)).finalScore)).toEqual(['25243','25243','16829','16612']);
    expect([2,1,0,0].map((p,i)=>score(cards([[12,11,10,9][i],[12,11,10,9][i]],p),[joker('mantangcai')]).finalScore)).toEqual(['23615','15743','7871','7763']);
  });
  it('ordinary straights and flushes read actual new instance growth and global history once',()=>{
    const straight=[3,4,5,6].map((r,i)=>cards([r,r+1,r+2,r+3,r+4],i<2?2:1));
    expect(straight.map(h=>score(h,[joker('c04',{heat:{n:'100',d:'1'}})]).finalScore)).toEqual(['97189','98809','75321','76536']);
    expect(straight.map(h=>score(h).finalScore)).toEqual(['48594','50214','38875','40090']);
    const flush=[[2,5,8,10,13],[14,2,3,10,13],[2,4,6,8,10],[2,3,6,7,10]].map((r,i)=>cards(r,i<2?2:1,true));
    expect(flush.map(h=>score(h,[joker('c06',{multiplier:{n:'6',d:'1'}})]).finalScore)).toEqual(['43907','44158','36560','36129']);
    expect(flush.map(h=>score(h).finalScore)).toEqual(['25090','25233','18280','18064']);
  });
  it('late buys start their own growth at zero and read independently earned route history',()=>{
    const ranks=[[2,5,8,10,13],[14,2,3,10,13],[2,4,6,8,10],[2,3,6,7,10]];let owned=[joker('c06')];const scores:string[]=[];
    for(const [i,r] of ranks.entries()){const t=score(cards(r,[2,1,0,0][i],true),owned,{handLevels:{flush:5}});scores.push(t.finalScore);owned=t.jokers;}
    expect(scores).toEqual(['52868','45090','36380','38710']);
    expect(score(cards([3,4,5,6,7],2),[joker('c04')],{routeGrowth:{clears:14,G:0,S:0,F:14}}).finalScore).toBe('1600');
    expect(score(cards([3,4,5,6,7],2),[joker('c04',{heat:{n:'40',d:'1'}})],{routeGrowth:{clears:18,G:0,S:4,F:14}}).finalScore).toBe('2688');
  });
  it('same-name edition replacement loses own growth, preserves history, and is not automatically stronger',()=>{
    const h=cards([2,5,8,10,13],2,true),level={handLevels:{flush:5}};
    expect(score(h,[joker('c06',{multiplier:{n:'6',d:'1'}})],level).finalScore).toBe('84589');
    expect(score(h,[joker('c06',{},'polychrome')],level).finalScore).toBe('79303');
    expect(score(h,[joker('c06',{multiplier:{n:'6',d:'1'}},'polychrome')],level).finalScore).toBe('126884');
  });
  it('actual retrigger order gives effective replacement goldens and one glass check per original',()=>{
    expect(score(cards([9,9,9,9],2),[joker('mantangcai')]).finalScore).toBe('133167');expect(score(cards([9,9,9,9],2),[joker('b09')]).finalScore).toBe('212590');
    const s=cards([3,4,5,6,7],2);s[2].enhancement='glass-paper';s[2].edition='polychrome';
    expect(score(s,[joker('c04',{heat:{n:'100',d:'1'}})]).finalScore).toBe('218676');expect(score(s,[joker('d11')]).finalScore).toBe('254211');
    const f=cards([2,5,8,10,13],2,true);f[4].enhancement='glass-paper';f[4].edition='polychrome';
    expect(score(f,[joker('c06',{multiplier:{n:'6',d:'1'}})],{handLevels:{flush:5}}).finalScore).toBe('150675');const t=score(f,[joker('c07')],{handLevels:{flush:5}});
    expect(t.finalScore).toBe('276720');expect(t.events.filter(e=>e.operation==='glass-check')).toHaveLength(1);expect(t.events.filter(e=>e.operation==='route-factor')).toHaveLength(1);
  });
  it('only evaluated main families qualify: dual types, high card and same-suit four-kind',()=>{
    expect(score(cards([3,4,5,6,7],2,true)).finalScore).toBe('4481487');expect(score(cards([5,5,5,7,7],3,true)).finalScore).toBe('7696791');
    expect(score(cards([3,4,5,6,7],2,true),[],{routeGrowth:{clears:14,G:0,S:0,F:14}}).finalScore).toBe('110665');
    expect(score(cards([5,5,5,7,7],3,true),[],{routeGrowth:{clears:14,G:0,S:0,F:14}}).finalScore).toBe('283555');
    expect(r2RouteFamilies(score(cards([9,9,9,9],0,true)).handType)).toEqual(['G']);expect(r2RouteFamilies('high-card')).toEqual([]);
  });
  it.each(['B03','B04','B06','B08','B13','B15','B16'] as const)('%s never moves/disables the global rule with Joker bans or slot order',boss=>{
    const h=cards([2,5,8,10,13],2,true),j=[joker('jiedongfeng'),joker('c06',{multiplier:{n:'6',d:'1'}},'polychrome'),joker('e11',{coefficient:{n:'17',d:'10'}})];
    const t=score(h,j,{boss:{definitionId:boss,disabledSuit:boss==='B03'?'spades':null},sealedJokerIds:boss==='B15'?['c06']:[],handLevels:{flush:5}}),e=t.events.find(e=>e.operation==='route-factor')!;
    expect(e.value).toEqual({n:'1792160394037',d:'100000000000'});expect(t.events.indexOf(e)).toBeGreaterThan(t.events.reduce((last,e,i)=>e.phase==='jokerScore'?i:last,-1));expect(t.events.filter(e=>e.operation==='route-factor')).toHaveLength(1);
  });
  it('large finite actual scorer goldens retain the final single floor and two passes, not three',()=>{
    const g=cards([9,9,9,9],3);g[3].enhancement='glass-paper';g[3].edition='polychrome';
    const tg=score(g,[joker('mantangcai'),joker('a06'),joker('b09'),joker('b06')],{routeGrowth:progress(17)});expect(tg.finalScore).toBe('9288801');expect(tg.events.filter(e=>e.operation==='glass-check')).toHaveLength(1);
    const f=cards([2,5,8,10,13],2,true);f[4].enhancement='glass-paper';f[4].edition='polychrome';
    const tf=score(f,[joker('jiedongfeng'),joker('c06',{multiplier:{n:'6',d:'1'}}),joker('e11',{coefficient:{n:'17',d:'10'}}),joker('c07')],{handLevels:{flush:5},routeGrowth:progress(17)});expect(tf.finalScore).toBe('1186639');expect(tf.accumulator.H).toEqual({n:'305',d:'1'});
  });
  it('UI AI preview/cache carries the exact snapshot and route events expose truthful factors',()=>{
    const h=cards([9,9,2]),request:AiHandInput={hand:h,jokers:[],definitions:R2_ROUTE_GROWTH_JOKERS,handRules:{fourStraight:false,fourFlush:false},disabledIds:[],ordinaryPointsSuppressedIds:[],boss:null,stageIndex:0,sealedJokerIds:[],challengeDisabledJokerId:null,resources:{gold:0,handsLeft:4,playIndex:0,discardsUsed:0,stageHeat:'0',target:'400'},contentVersion:identity.contentVersion+'/'+identity.contentHash,score:{routeGrowth:progress(4),characterId:'neutral',amoScoreTiming:'assist-v1',handLevels:{},previousHandType:null,wager:false,jokerSlots:5,previousHandScore:null}};
    const before=structuredClone(request),key=aiHandKey(request),result=rankAiHandCandidates(request);expect(result.status).toBe('ready');expect(request).toEqual(before);expect(result.ordered[0].type).toBe('pair');request.score.routeGrowth=progress(5);expect(aiHandKey(request)).not.toBe(key);
    const t=score(cards([9,9]),[],{routeGrowth:progress(4)}),e=t.events.find(e=>e.operation==='route-factor')!;expect(scorePacketSymbol(e)).toBe('×M');expect(r2ScoreOperationText(e)).toContain('成组过关加成 4 场');expect(r2ScoreOperationText(e)).toContain('×1.35');
  });
  it('six fixes cover their upgrade families and stored additive growth still reads on high card',()=>{
    for(const ranks of [[9,9,9,9,9],[5,5,5,7,7]]){
      const t=score(cards(ranks,0,true),[joker('mantangcai'),joker('c06'),joker('jiedongfeng')],{routeGrowth:progress(0)});expect(t.events.find(e=>e.sourceDefinitionId==='mantangcai'&&e.operation==='add-heat')?.value).toEqual({n:'90',d:'1'});expect(t.events.find(e=>e.sourceDefinitionId==='jiedongfeng'&&e.operation==='add-multiplier')?.value).toEqual({n:'3',d:'2'});expect(t.jokers.find(j=>j.definitionId==='c06')!.growth.multiplier).toEqual({n:'1',d:'2'});
    }
    const t=score(cards([2]),[joker('c04',{heat:{n:'100',d:'1'}}),joker('c06',{multiplier:{n:'6',d:'1'}})]);expect(t.finalScore).toBe('854');expect(t.routeGrowth!.factors).toEqual({});expect(t.events.some(e=>e.operation==='add-growth')).toBe(false);
  });
  it('current frozen ordinary baselines still match 4892 / 5790 / 7592 before the new identity',()=>{
    const old=(h:PlayingCard[],j:ScoreInput['jokers'])=>score(h,j,{definitions:R2_GROUP_UPGRADE_JOKERS,routeGrowth:undefined}).finalScore;
    expect([12,11,10,9].map((r,i)=>Number(old(cards([r,r],i<2?2:1),[joker('b10',{heat:{n:'100',d:'1'}}),joker('mantangcai')]))).reduce((a,b)=>a+b,0)).toBe(4892);
    expect([3,4,5,6].map((r,i)=>Number(old(cards([r,r+1,r+2,r+3,r+4],i<2?2:1),[joker('c04')]))).reduce((a,b)=>a+b,0)).toBe(5790);
    expect([[2,5,8,10,13],[14,2,3,10,13],[2,4,6,8,10],[2,3,6,7,10]].map((r,i)=>Number(old(cards(r,i<2?2:1,true),[joker('c06',{multiplier:{n:'4',d:'1'}})]))).reduce((a,b)=>a+b,0)).toBe(7592);
  });
  it('the actual scorer enforces the 512-event ceiling without mutating its inputs',()=>{
    const definitions=['mantangcai','jiedongfeng'].map(id=>({...R2_GROUP_UPGRADE_JOKERS.find(d=>d.id===id)!,hooks:Array.from({length:8},()=>({phase:'onCardScore' as const,condition:{kind:'always' as const},operations:Array.from({length:8},()=>({kind:'add-heat' as const,value:{n:'1',d:'1'}}))}))}));
    const i=input(cards([9,9,9,9]),[joker('mantangcai'),joker('jiedongfeng')],{definitions,routeGrowth:undefined}),before=structuredClone(i);
    try{scoreR2Hand(i);throw Error('missing fault');}catch(error){expect(error).toMatchObject({code:'event-limit',events:expect.any(Array)});expect((error as {events:unknown[]}).events).toHaveLength(512);}
    expect(i).toEqual(before);
  });
  it('challenge ban disables only the Joker, and Amo assist remains after the global rule',()=>{
    const h=cards([9,9,13,13,12,12,12]);const t=score(h,[joker('mantangcai')],{selectedIds:h.slice(0,4).map(c=>c.id),assistIds:h.slice(4).map(c=>c.id),characterId:'amo',challengeDisabledJokerId:'mantangcai'});
    expect(t.routeGrowth?.factors).toEqual({G:r2RouteFactor('G',14).toJSON()});expect(t.events.filter(e=>e.sourceDefinitionId==='mantangcai')).toHaveLength(0);expect(t.events.reduce((last,e,i)=>e.phase==='routeGrowth'?i:last,-1)).toBeLessThan(t.events.findIndex(e=>e.sourceDefinitionId==='amo'));
  });
});
