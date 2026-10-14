import {describe,it,expect} from 'vitest';
import {CHARACTER_IDS} from '../src/domain/characters';
import {getR2Stage,r2ScoreContext} from '../src/domain/r2Run';
import {R2_BOUNDED_CLEAR_VERSION,R2_BOUNDED_CLEAR_HASH} from '../src/domain/r2GroupUpgrade';
import {R2_TARGETS,r2StageSpec} from '../src/domain/r2Chapter';
import {r2DifficultyTargetMultiplier} from '../src/content/r2Modes';
import {r2RouteFactor,r2RouteGrowthTrace} from '../src/domain/r2RouteGrowth';
import {scoreR2Hand,previewR2Hand} from '../src/domain/scoreR2';
import {Rational} from '../src/domain/rational';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {stableHash} from '../src/domain/hash';
import {applyCommand} from '../src/domain/run';
import {SavedRun,type SaveStore,type SaveSlots} from '../src/application/SavedRun';
import {activeScoreInput,activeCards} from './fixtures/p1a-active-mult';
import {boundedStart,boundedSend,boundedCommand,boundedBossFixture,boundedArrange} from './fixtures/bounded-clear';
const identity={contentVersion:R2_BOUNDED_CLEAR_VERSION,contentHash:R2_BOUNDED_CLEAR_HASH};
const round=(s:ReturnType<typeof boundedStart>)=>{const cp=makeCheckpoint(s,[]);expect(readCheckpoint(JSON.parse(JSON.stringify(cp)))).toEqual({ok:true,checkpoint:cp});return cp;};
describe('bounded clear candidate',()=>{
 it.each(CHARACTER_IDS)('normal %s new run locks the same identity and public preview',h=>{
  let s=boundedStart(h);expect(s).toMatchObject(identity);round(s);const preview=getR2Stage(0,'normal',0,s)!;
  s=boundedSend(boundedSend(s,{type:'LeaveShop'}),{type:'EnterStage'});expect(s.stage!.targetHeat).toBe(preview.targetHeat);expect(s.stage!.initialTargetHeat).toBe(preview.targetHeat);round(s);
  const context=r2ScoreContext(s,[],[]);expect(context.boundedClear).toBe(true);expect(context.activeMultTiming).toBe(['touye','xiemu','azao'].includes(h)?'after-route-growth':undefined);
 });
 it('keeps frozen global targets and ceilings once after chapter, stage and original difficulty',()=>{
  expect(R2_TARGETS).toEqual([400,1000,2400,5600,13000,30000,70000,160000]);expect(r2StageSpec(6)!.targetHeat).toBe('2400');
  expect(Array.from({length:8},(_,i)=>getR2Stage(i*3,'normal',0,identity)!.targetHeat)).toEqual(['400','900','1800','3600','6000','9000','14000','20475']);
  expect([36,37,38].map(i=>getR2Stage(i,'endless',0,identity)!.targetHeat)).toEqual(['32976','49463','65951']);
  for(const d of [0,1,2,3])for(const i of [0,6,23,36,37,38]){const stage=i%3,chapter=Math.floor(i/3)+1,diff=r2DifficultyTargetMultiplier(d)!,warm=chapter<=8?BigInt([400,900,1800,3600,6000,9000,14000,20475][chapter-1]):20475n*11n**BigInt(chapter-8),den=chapter<=8?1n:10n**BigInt(chapter-8),n=warm*BigInt(diff.n)*[1n,3n,2n][stage],q=den*BigInt(diff.d)*[1n,2n,1n][stage];expect(getR2Stage(i,i<24?'normal':'endless',d,identity)!.targetHeat).toBe(((n+q-1n)/q).toString());}
 });
 it.each(['flush-house','straight-flush'] as const)('%s chooses related max once, in both asymmetric directions',type=>{
  const a=type==='flush-house'?'G':'S';for(const [left,right] of [[4,7],[8,4]]){
   const counts={clears:10,G:10,S:10,F:right,[a]:left},snapshot=r2RouteGrowthTrace(counts,type,true),wanted=r2RouteFactor(a,left,true).compare(r2RouteFactor('F',right,true))>=0?a:'F';expect(Object.keys(snapshot.factors)).toEqual([wanted]);
   const hand=activeCards(type==='flush-house'?[6,6,6,8,8]:[3,4,5,6,7],0,true),input={...activeScoreInput(hand,[],{routeGrowth:counts}),boundedClear:true as const},t=scoreR2Hand(input),event=t.events.find(e=>e.operation==='route-factor')!;
   expect(t.routeGrowth).toEqual(snapshot);expect(t.events.filter(e=>e.operation==='route-factor')).toHaveLength(1);expect(event.routeFamily).toBe(wanted);expect(event.resourceBefore).toBe(counts[wanted]);expect(event.resourceAfter).toBe(counts[wanted]);expect(Rational.fromJSON(event.after.M).compare(Rational.fromJSON(event.before.M).multiply(Rational.fromJSON(event.value)))).toBe(0);expect(previewR2Hand(input).possibleScores).toEqual([t.finalScore]);
  }
 });
 it('preserves grace, caps each family, ignores unrelated history, and credits no high-card family',()=>{
  for(const f of ['G','S','F'] as const){for(const n of [0,1,2,3])expect(r2RouteFactor(f,n,true).toJSON()).toEqual({n:'1',d:'1'});for(const n of [f==='F'?9:8,Number.MAX_SAFE_INTEGER])expect(r2RouteFactor(f,n,true).toJSON()).toEqual({n:'4',d:'1'});}
  const counts={clears:9,G:9,S:0,F:0};expect(r2RouteGrowthTrace(counts,'straight-flush',true).factors).toEqual({S:{n:'1',d:'1'}});const t=scoreR2Hand({...activeScoreInput(activeCards([2]),[],{routeGrowth:counts}),boundedClear:true});expect(t.routeGrowth!.factors).toEqual({});expect(t.events.filter(e=>e.operation==='route-factor')).toEqual([]);
 });
 it('chapter3 B09 ordinary pairs lose 3336/3600; actual T01 raises them to 4620',()=>{
  const play=(up:boolean)=>{let s=boundedSend(boundedBossFixture('B09',up),{type:'EnterStage'});expect(s.stage!.initialHands).toBe(3);expect(s.stage!.targetHeat).toBe('3600');round(s);const scores=[];
   for(const rank of [6,7,8]){s=boundedSend(boundedArrange(s,['spades-'+rank,'hearts-'+rank]),{type:'PlayHand',selectedIds:['spades-'+rank,'hearts-'+rank]});scores.push(s.lastTrace!.finalScore);round(s);}return {s,scores};};
  const plain=play(false),up=play(true);expect(plain.scores).toEqual(['1096','1112','1128']);expect(plain.s.stage!.heat).toBe('3336');expect(plain.s.phase).toBe('run-lost');expect(up.scores).toEqual(['1520','1540','1560']);expect(up.s.stage!.heat).toBe('4620');expect(up.s.phase).toBe('stage-cleared');
 });
 it('B14 adds ceil(initial/20) per discard, and duplicate confirmation/cold restore do not compound',()=>{
  let s=boundedSend(boundedBossFixture('B14'),{type:'EnterStage'}),initial=BigInt(s.stage!.targetHeat),delta=(initial+19n)/20n;
  for(let n=1;n<=2;n++){const c=boundedCommand(s,{type:'DiscardHand',selectedIds:[s.handOrder[0]]}),r=applyCommand(s,c);expect(r.ok).toBe(true);if(!r.ok)throw Error(r.code);s=r.state;expect(s.stage!.targetHeat).toBe((initial+BigInt(n)*delta).toString());expect(applyCommand(s,c)).toMatchObject({ok:true,duplicate:true,state:s});round(s);}
  const bad=structuredClone(round(s));bad.state.stage!.initialTargetHeat='1';const {checksum,...payload}=bad;expect(readCheckpoint({...payload,checksum:stableHash(payload)}).ok).toBe(false);
 });
 it('failed save retries one fixed candidate and publishes a clear only once',async()=>{
  let s=boundedBossFixture();s.handLevels.pair=2;s=boundedSend(s,{type:'EnterStage'});for(const rank of [6,7])s=boundedSend(boundedArrange(s,['spades-'+rank,'hearts-'+rank]),{type:'PlayHand',selectedIds:['spades-'+rank,'hearts-'+rank]});s=boundedArrange(s,['spades-8','hearts-8']);
  let fail=false;const attempts:string[]=[],store:SaveStore&{slots:SaveSlots}={slots:{revision:0,current:null,previous:null},async read(){return structuredClone(this.slots);},async commit(revision,current,previous){attempts.push(JSON.stringify(current));if(fail)throw Error('controlled quota');this.slots={revision:revision+1,current,previous};return this.slots.revision;}};
  const saved=await SavedRun.start(store,s,store.slots),before=structuredClone(saved.state),slots=structuredClone(store.slots),cmd=boundedCommand(s,{type:'PlayHand',selectedIds:['spades-8','hearts-8']});fail=true;expect((await saved.submit(cmd)).ok).toBe(false);expect(saved.state).toEqual(before);expect(store.slots).toEqual(slots);const pending=JSON.parse(saved.exportJSON());expect(pending.state.routeGrowth.G).toBe(9);expect(pending.state.lastTrace.routeGrowth.before.G).toBe(8);expect(readCheckpoint(pending).ok).toBe(true);
  fail=false;expect((await saved.retry()).ok).toBe(true);expect(attempts.at(-1)).toBe(attempts.at(-2));expect(await saved.submit(cmd)).toMatchObject({ok:true,duplicate:true});expect(SavedRun.restore(store,store.slots).state).toEqual(saved.state);
 });
});

it('AI comparison carries the new policy through public snapshot and cache, using max rather than product',async()=>{
 const {aiHandKey,rankAiHandCandidates}=await import('../src/game/AiHandCandidates');
 const hand=activeCards([3,4,5,6,7],0,true),score=activeScoreInput(hand,[],{routeGrowth:{clears:4,G:0,S:4,F:4}}),input={hand,jokers:score.jokers,definitions:score.definitions,disabledIds:[],ordinaryPointsSuppressedIds:[],boss:null,stageIndex:0,sealedJokerIds:[],challengeDisabledJokerId:null,resources:{gold:0,handsLeft:4,playIndex:0,discardsUsed:0,stageHeat:'0',target:'400'},contentVersion:identity.contentVersion,score:{...score,boundedClear:true as const}};
 expect(aiHandKey(input)).not.toBe(aiHandKey({...input,score:{...score}}));
 const scoring=await import('../src/domain/scoreR2'),{vi}=await import('vitest'),actual=scoring.previewR2Hand,seen:ReturnType<typeof actual>[]=[];
 const spy=vi.spyOn(scoring,'previewR2Hand').mockImplementation(i=>{const result=actual(i);if(result.handType==='straight-flush')seen.push(result);return result;});
 try{expect(rankAiHandCandidates(input).status).toBe('ready');expect(seen).toHaveLength(1);expect(seen[0].routeGrowth!.factors).toEqual({S:{n:'7',d:'5'}});expect(seen[0].possibleScores).toEqual([scoreR2Hand({...score,boundedClear:true}).finalScore]);}finally{spy.mockRestore();}
});
