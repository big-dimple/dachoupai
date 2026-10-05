import {describe,it,expect} from 'vitest';
import {createRun,applyCommand,type R2RunState,type Action,type Command} from '../src/domain/run';
import {r2DisabledCards,type R2BossPlan} from '../src/domain/r2Chapter';
import {r2CreateJoker,assertR2Invariants,R2_CONTENT_HASH} from '../src/domain/r2Run';
import {r2AssistAvailability,r2AssistFacts,R2_ASSIST_HASH,R2_ASSIST_VERSION} from '../src/domain/r2Assist';
import {R2_PUBLISHED_JOKERS,R2_PUBLISHED_CONTENT} from '../src/domain/r2PublishedContent';
import {makeCheckpoint,readCheckpoint,restoreSlots,type Checkpoint} from '../src/application/checkpoint';
import {SavedRun,type SaveStore,type SaveSlots} from '../src/application/SavedRun';
import publishedV11 from './fixtures/r2-v11-amo-checkpoints.json';
import {stableHash} from '../src/domain/hash';
const main=['spades-9','hearts-9','clubs-13','diamonds-13'],assist=['spades-12','hearts-12'];
const visible=[...main,...assist,'clubs-6','diamonds-7'];
export function cmd(s:R2RunState,action:Action):Command{return {runId:s.runId,commandId:`${s.runId}/${s.commandSeq+1}`,expectedSeq:s.commandSeq,action};}
export function send(s:R2RunState,action:Action):R2RunState{const r=applyCommand(s,cmd(s,action));if(!r.ok)throw Error(r.code);return r.state;}
export function fixture(ids=visible,jokers:string[]=[],prototype=true):R2RunState{
 let s=createRun({seed:'assist-test',runId:'assist-test',characterId:'amo',rulesVersion:'r2',...(prototype?{r2Profile:'amo-assist-v1' as const}:{}),modeConfig:{mode:'standard',difficulty:3,challengeId:null,programsEnabled:false}});
 s.jokers=jokers.map((id,i)=>r2CreateJoker(id,`j/${i}`,4));
 s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});
 s.handOrder=[...ids];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id));assertR2Invariants(s);return s;
}
function bossFixture(definitionId:R2BossPlan['definitionId'],ids=visible,jokers:string[]=[]):R2RunState{
 let s=fixture(visible,jokers);Object.assign(s,{phase:'stage-ready',stage:null,lastTrace:null,stageIndex:8,chapter:3,shop:null,boss:{definitionId,disabledSuit:definitionId==='B03'?'spades':null},seenBossIds:['B01','B02',definitionId]});
 s=send(s,{type:'EnterStage'});s.handOrder=[...ids];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id));s.stage!.disabledIds=r2DisabledCards(s.stage!.boss!,s.stageIndex,s.deckInstances.filter(c=>ids.includes(c.id)));assertR2Invariants(s);return s;
}
const action:Action={type:'PlayAssistedHand',selectedIds:main,assistIds:assist};
function round(s:R2RunState,journal:Command[]=[]){const cp=makeCheckpoint(s,journal);expect(readCheckpoint(JSON.parse(JSON.stringify(cp)))).toEqual({ok:true,checkpoint:cp});return cp;}
function reject(s:R2RunState,a:Action){const before=JSON.stringify(s),r=applyCommand(s,cmd(s,a));expect(r.ok).toBe(false);expect(r.state).toBe(s);expect(JSON.stringify(s)).toBe(before);}
function corrupt(cp:Checkpoint,change:(s:any)=>void){const c=JSON.parse(JSON.stringify(cp));change(c.state);const {checksum,...payload}=c;c.checksum=stableHash(payload);return readCheckpoint(c);}
class MemoryStore implements SaveStore{
 slots:SaveSlots;fail=false;candidates:Checkpoint[]=[];
 constructor(cp:Checkpoint){this.slots={revision:1,current:cp,previous:null};}
 async read(){return structuredClone(this.slots);}
 async commit(rev:number,current:Checkpoint,previous:Checkpoint|null){this.candidates.push(structuredClone(current));if(this.fail)throw new DOMException('quota','QuotaExceededError');if(rev!==this.slots.revision)throw Error('write-conflict');this.slots={revision:rev+1,current:structuredClone(current),previous:structuredClone(previous)};return rev+1;}
}
describe('explicit Amo assist prototype',()=>{
 it('replays the real published v11 fixture with identical full state, trace, RNG, receipts and checkpoint',()=>{
  const before=readCheckpoint(publishedV11.before),after=readCheckpoint(publishedV11.after);expect(before.ok&&after.ok).toBe(true);if(!before.ok||!after.ok)throw Error('published fixture');
  const result=applyCommand(before.checkpoint.state,publishedV11.command as Command);expect(result.ok).toBe(true);if(!result.ok)throw Error(result.code);expect(result.state).toEqual(after.checkpoint.state);expect(makeCheckpoint(result.state,[publishedV11.command as Command])).toEqual(after.checkpoint);
 });
 it('freezes real published identities and starts only explicit Amo prototype at ordinary levels',()=>{
  expect(stableHash(R2_PUBLISHED_CONTENT.snapshot)).toBe(R2_PUBLISHED_CONTENT.v10.hash);
  expect(stableHash({legacyContentHash:R2_PUBLISHED_CONTENT.v10.hash,characterScoring:{amoSingleMultiplier:'after-joker'}})).toBe(R2_CONTENT_HASH);
  expect(Object.isFrozen(R2_PUBLISHED_JOKERS[0].hooks)).toBe(true);
  const s=fixture();expect(s.contentVersion).toBe(R2_ASSIST_VERSION);expect(s.contentHash).toBe(R2_ASSIST_HASH);expect(s.handLevels).toEqual({});expect(s.stage?.assistUsed).toBe(false);round(s);
  expect(fixture(visible,[],false).handLevels).toEqual({'high-card':3});
  for(const characterId of ['erxiang','laohuan','azao','touye','xiemu'] as const)expect(()=>createRun({seed:'x',runId:'x',characterId,rulesVersion:'r2',r2Profile:'amo-assist-v1'})).toThrow('invalid-r2-profile');
 });
 it('99KK main + QQ consumes exactly six in hand order, draws six once and keeps history main-only',()=>{
  const s=fixture(),before=JSON.stringify(s),command=cmd(s,action),next=send(s,action),t=next.lastTrace!;
  expect(t.handType).toBe('two-pair');expect(t.finalScore).toBe('412');expect(t.sets).toEqual({playedIds:main,scoringIds:main,activeScoringIds:main,assistConsumedIds:assist,heldIds:visible.slice(6)});
  expect(t.assist).toEqual({ids:assist,kind:'pair',multiplier:2});expect(next.playedPile).toEqual(visible.slice(0,6));expect(next.handOrder).toEqual([...visible.slice(6),...s.drawPile.slice(-6).reverse()]);expect(next.drawPile).toEqual(s.drawPile.slice(0,-6));expect(next.rng).toEqual(s.rng);
  expect(next.stage).toMatchObject({handsLeft:s.stage!.handsLeft-1,playIndex:1,assistUsed:true,maxPlayedCount:4,discardsUsed:0});expect(next.chapterHandUsage).toEqual({'two-pair':1});expect(next.discardPile).toEqual([]);expect(JSON.stringify(s)).toBe(before);
  round(next,[command]);const repeated=applyCommand(next,command);expect(repeated.ok&&repeated.duplicate).toBe(true);expect(repeated.state).toEqual(next);
 });
 it('separates held benefits, Joker ordering, lifetime and afterHand from the consumed pair',()=>{
  const s=fixture(visible,['d01','d03','f06','b04','a03']);
  const ordinary=send(s,{type:'PlayHand',selectedIds:main}),next=send(s,action),t=next.lastTrace!;
  expect(ordinary.lastTrace!.events.filter(e=>e.sourceDefinitionId==='d01')).toHaveLength(2);expect(t.events.filter(e=>e.sourceDefinitionId==='d01')).toHaveLength(0);
  expect(t.events.some(e=>assist.includes(e.targetCardId??''))).toBe(false);expect(t.events.some(e=>e.sourceDefinitionId==='a03')).toBe(false);
  expect(t.jokers.find(j=>j.definitionId==='f06')?.counters?.handsScored).toBe(1);expect(t.jokers.find(j=>j.definitionId==='d03')?.growth.heat).toBeUndefined();
  const role=t.events.findIndex(e=>e.sourceType==='character');expect(role).toBe(t.events.findIndex(e=>e.phase==='finalScore')-1);expect(t.events.filter(e=>e.phase==='jokerScore').every(e=>t.events.indexOf(e)<role)).toBe(true);round(next);
 });
 it('consumed lucky/glass/encore/editions produce no card hook or random draw',()=>{
  for(const enhancement of ['lucky-paper','glass-paper','encore-paper','gold-paper'] as const){const s=fixture();for(const card of s.deckInstances.filter(c=>assist.includes(c.id))){card.enhancement=enhancement;card.edition='polychrome';}const next=send(s,action);expect(next.rng).toEqual(s.rng);expect(next.lastTrace!.destroyedCardIds).toEqual([]);expect(next.lastTrace!.events.some(e=>assist.includes(e.targetCardId??''))).toBe(false);round(next);}
 });
 it('rejects illegal groups and straight/99 overlap atomically',()=>{
  const s=fixture();for(const ids of [[],[assist[0]],[...assist,assist[0]],[assist[0],main[0]],['unknown',assist[0]],[assist[0],'clubs-6']])reject(s,{...action,assistIds:ids});
  reject(s,{type:'PlayAssistedHand',selectedIds:[main[0]],assistIds:assist});reject(s,{type:'PlayAssistedHand',selectedIds:main.slice(0,2),assistIds:assist});reject(fixture(visible,[],false),action);
  const straight=['hearts-5','hearts-6','hearts-7','hearts-8','clubs-9'],pair=['clubs-9','diamonds-9'];reject(fixture([...straight,'diamonds-9','spades-13','clubs-2']),{type:'PlayAssistedHand',selectedIds:straight,assistIds:pair});
 });
 it('offers a rational unassisted complete full house instead of dismantling it',()=>{
  const house=['spades-9','hearts-9','clubs-9','spades-13','hearts-13'],s=fixture([...house,'spades-2','clubs-3','diamonds-6']);
  const complete=send(s,{type:'PlayHand',selectedIds:house}),split=send(s,{type:'PlayAssistedHand',selectedIds:house.slice(0,3),assistIds:house.slice(3)});
  expect(BigInt(complete.lastTrace!.finalScore)).toBeGreaterThan(BigInt(split.lastTrace!.finalScore));expect(complete.stage?.assistUsed).toBe(false);expect(split.stage?.assistUsed).toBe(true);round(complete);round(split);
 });
 it('accepts a three-card assist at x4 while one hand consumes seven, and never counts assist ranks as played groups',()=>{
  const triple=[...assist,'clubs-12'],s=fixture([...main,...triple,'clubs-6'],['b04','a05']);const next=send(s,{type:'PlayAssistedHand',selectedIds:main,assistIds:triple});
  expect(next.lastTrace!.assist).toEqual({ids:triple,kind:'three-kind',multiplier:4});expect(next.lastTrace!.finalScore).toBe('1648');expect(next.playedPile).toEqual([...main,...triple]);expect(next.stage).toMatchObject({playIndex:1,maxPlayedCount:4});expect(next.lastTrace!.events.some(e=>e.sourceDefinitionId==='a05'&&e.phase==='afterHand')).toBe(false);round(next);
  const threes=['spades-9','hearts-9','clubs-9'],withPair=send(fixture([...threes,...assist,'clubs-6','diamonds-7']),{type:'PlayAssistedHand',selectedIds:threes,assistIds:assist});expect(withPair.lastTrace!.handType).toBe('three-kind');expect(withPair.chapterHandUsage).toEqual({'three-kind':1});
 });
 it('allows disabled B03/B04 main cards to form the main hand but rejects every disabled assist',()=>{
  for(const boss of ['B03','B04'] as const){
   const support=['hearts-6','clubs-6'],s=bossFixture(boss,[...main,...support,'clubs-2','diamonds-7'],['b03','b04']);
   const next=send(s,{type:'PlayAssistedHand',selectedIds:main,assistIds:support});expect(next.lastTrace!.handType).toBe('two-pair');expect(next.lastTrace!.sets.activeScoringIds.length).toBeLessThan(4);expect(next.lastTrace!.events.some(e=>e.sourceDefinitionId==='b04')).toBe(true);round(next);
   reject(bossFixture(boss),action);
  }
 });
 it('B08 and Q01 reject assistance without state, sequence, resources or RNG movement',()=>{
  const s=bossFixture('B08');reject(s,action);round(send(s,{type:'PlayHand',selectedIds:main}));
  let q=createRun({seed:'challenge/q01/0',runId:'q01-assist',characterId:'amo',rulesVersion:'r2',r2Profile:'amo-assist-v1',modeConfig:{mode:'challenge',difficulty:0,challengeId:'Q01',programsEnabled:false}});q=send(send(q,{type:'LeaveShop'}),{type:'EnterStage'});q.handOrder=[...visible];q.drawPile=q.deckInstances.map(c=>c.id).filter(id=>!visible.includes(id));reject(q,action);expect(q.handLevels).toEqual({});round(q);
 });
 it('keeps the consumed quota through ordinary plays, ordering, discard, reload and rescue',()=>{
  let s=send(bossFixture('B05',visible,['f07','f06']),action);expect(s.stage!.assistUsed).toBe(true);
  s=send(s,{type:'ReorderHand',ids:[...s.handOrder].reverse()});s=send(s,{type:'DiscardHand',selectedIds:[s.handOrder[0]]});
  for(let i=0;i<3;i++)s=send(s,{type:'PlayHand',selectedIds:[s.handOrder[0]]});
  expect(s.stage).toMatchObject({playIndex:4,handsLeft:1,rescueUsed:true,assistUsed:true});expect(s.lastTrace!.events.filter(e=>e.operation==='rescue-hand')).toHaveLength(1);expect(s.jokers.some(j=>j.definitionId==='f06')).toBe(false);expect(s.lastTrace!.events.filter(e=>e.sourceDefinitionId==='f06'&&e.operation==='destroy-joker')).toHaveLength(1);
  const cp=round(s),restored=readCheckpoint(cp);if(!restored.ok)throw Error(restored.code);reject(restored.checkpoint.state,{type:'PlayAssistedHand',selectedIds:[s.handOrder[0]],assistIds:s.handOrder.slice(1,3)});
 });
 it('a four-kind refund does not restore assistance, and only actual next-stage entry restores it',()=>{
  const quad=['spades-9','hearts-9','clubs-9','diamonds-9'],s=bossFixture('B05',[...quad,...assist,'clubs-6','diamonds-7'],['b12']);
  const refunded=send(s,{type:'PlayAssistedHand',selectedIds:quad,assistIds:assist});expect(refunded.stage).toMatchObject({playIndex:1,handsLeft:4,quadRefundUsed:true,assistUsed:true});expect(refunded.lastTrace!.events.filter(e=>e.operation==='refund-hand')).toHaveLength(1);round(refunded);
  let cleared=fixture();cleared.handLevels={'two-pair':10};cleared=send(cleared,action);expect(cleared.phase).toBe('stage-cleared');round(cleared);
  for(const a of [{type:'OpenShop'},{type:'LeaveShop'}] as const){cleared=send(cleared,a);expect(cleared.stage!.assistUsed).toBe(true);round(cleared);}
  cleared=send(cleared,{type:'EnterStage'});expect(cleared.stage!.assistUsed).toBe(false);expect(cleared.lastTrace).toBeNull();round(cleared);
 });
 it('depleted draw pile refills only what exists without shuffling or reusing assistance',()=>{
  const s=fixture();s.playedPile=[...s.drawPile.slice(0,-1)];s.drawPile=s.drawPile.slice(-1);const next=send(s,action);expect(next.handOrder).toEqual([...visible.slice(6),...s.drawPile]);expect(next.drawPile).toEqual([]);expect(next.rng).toEqual(s.rng);expect(next.stage!.assistUsed).toBe(true);round(next);
 });
 it('requires strict profile-specific stage/trace fields and rejects mixed identities',()=>{
  const s=send(fixture(),action),cp=round(s);
  for(const change of [(s:any)=>delete s.stage.assistUsed,(s:any)=>s.stage.assistUsed=false,(s:any)=>delete s.lastTrace.assist,(s:any)=>delete s.lastTrace.sets.assistConsumedIds,(s:any)=>s.lastTrace.assist.multiplier=4,(s:any)=>s.lastTrace.sets.heldIds.push(assist[0]),(s:any)=>s.contentHash=R2_CONTENT_HASH,(s:any)=>s.characterId='erxiang'])expect(corrupt(cp,change).ok).toBe(false);
  const old=round(fixture(visible,[],false));expect(corrupt(old,(s:any)=>s.stage.assistUsed=false).ok).toBe(false);
  round(send(fixture(),{type:'PlayHand',selectedIds:[main[0]]}));
 });
 it('binds assistance to the journal and consumed zone even after a later ordinary hand',()=>{
  const before=bossFixture('B05'),assisted=cmd(before,action),after=send(before,action),ordinary=cmd(after,{type:'PlayHand',selectedIds:[after.handOrder[0]]}),last=send(after,ordinary.action),cp=round(last,[assisted,ordinary]);
  expect(corrupt(cp,(s:any)=>s.stage.assistUsed=false).ok).toBe(false);
  const assistedCp=round(after,[assisted]);expect(corrupt(assistedCp,(s:any)=>{s.playedPile=s.playedPile.filter((id:string)=>id!==assist[0]);s.discardPile.push(assist[0]);}).ok).toBe(false);
  const forged=structuredClone(assistedCp);forged.journal[0].action={type:'PlayHand',selectedIds:main};forged.state.receipts.at(-1)!.fingerprint=stableHash(forged.journal[0]);const {checksum,...payload}=forged;forged.checksum=stableHash(payload);expect(readCheckpoint(forged)).toMatchObject({ok:false,code:'invalid-save-assist-journal-trace'});
 });
 it('keeps one pending candidate through quota failure/retry, export/import/reload and duplicate receipts',async()=>{
  const cp=round(fixture()),store=new MemoryStore(cp),run=SavedRun.restore(store,await store.read());store.fail=true;
  expect(await run.dispatch(action)).toMatchObject({ok:false,code:'save-failed'});expect(run.state).toEqual(cp.state);const pending=JSON.parse(run.exportJSON());expect(readCheckpoint(pending).ok).toBe(true);expect(pending.state.stage.assistUsed).toBe(true);
  expect(await run.dispatch(action)).toMatchObject({ok:false,code:'save-paused'});store.fail=false;expect((await run.retry()).ok).toBe(true);expect(store.candidates[1]).toEqual(store.candidates[0]);
  const restored=SavedRun.restore(store,await store.read());expect(restored.state).toEqual(pending.state);const importedStore=new MemoryStore(cp),imported=await SavedRun.import(importedStore,pending,await importedStore.read());expect(imported.state).toEqual(restored.state);expect(await imported.submit(pending.journal.at(-1))).toMatchObject({ok:true,duplicate:true});
  const damaged={...pending,checksum:'bad'};expect(restoreSlots({revision:2,current:damaged,previous:cp}).status).toBe('backup');expect(restoreSlots({revision:2,current:damaged,previous:{...cp,checksum:'bad'}}).status).toBe('invalid');expect(restoreSlots({revision:2,current:damaged,previous:round(fixture(visible,[],false))}).status).toBe('invalid');
 });
 it.each([
  ['two-pair',[9,9,13,13]],['three-kind',[9,9,9]],['straight',[5,6,7,8,9]],['flush',[2,4,6,8,14]],
  ['full-house',[9,9,9,13,13]],['four-kind',[9,9,9,9]],['straight-flush',[5,6,7,8,9]],['five-kind',[9,9,9,9,9]],['flush-house',[9,9,9,13,13]],['flush-five',[9,9,9,9,9]],
 ] as const)('uses the unique evaluator for qualified %s without a new active-main requirement',(type,ranks)=>{
  const suits=['spades','hearts','clubs','diamonds'] as const,hand=ranks.map((rank,i)=>({id:`main/${i}`,rank,suit:type.includes('flush')?'hearts' as const:suits[i%4]}));
  const selectedIds=hand.map(c=>c.id),support=[{id:'support/0',rank:12 as const,suit:'spades' as const},{id:'support/1',rank:12 as const,suit:'clubs' as const}];
  const facts=r2AssistFacts({hand:[...hand,...support],selectedIds,assistIds:support.map(c=>c.id),disabledIds:selectedIds,jokers:[],definitions:R2_PUBLISHED_JOKERS});expect(facts.type).toBe(type);expect(facts.activeScoringIds).toEqual([]);expect(facts.assistMultiplier).toBe(2);
 });
 it('exposes eligibility without a score side channel, and retains real A-series single-card constraints',()=>{
  const s=fixture();expect(r2AssistAvailability(s)).toEqual({available:true,remaining:1});expect(r2AssistAvailability(send(s,action))).toMatchObject({available:false,remaining:0,reason:'used'});expect(r2AssistAvailability(fixture(visible,[],false))).toMatchObject({available:false,reason:'profile'});expect(r2AssistAvailability(bossFixture('B08'))).toMatchObject({available:false,reason:'disabled'});
  const ordinary=send(fixture(visible,['a03','a05','a09','pengci']),{type:'PlayHand',selectedIds:[main[0]]});expect(ordinary.lastTrace!.level).toBe(1);expect(ordinary.lastTrace!.assist).toBeNull();expect(ordinary.lastTrace!.sets.assistConsumedIds).toEqual([]);expect(ordinary.lastTrace!.events.some(e=>e.sourceType==='character')).toBe(false);expect(ordinary.lastTrace!.events.some(e=>e.sourceDefinitionId==='a03')).toBe(true);round(ordinary);
 });
 it('returns only public selection facts, without score/RNG/draw/commands',()=>{
  const s=fixture(),facts=r2AssistFacts({hand:s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!),selectedIds:main,assistIds:assist,disabledIds:[],jokers:[],definitions:R2_PUBLISHED_JOKERS});expect(facts.assistConsumedIds).toEqual(assist);expect(facts.consumedIds).toEqual([...main,...assist]);expect(Object.keys(facts).some(k=>/score|rng|draw|command|journal/i.test(k)&&!['scoringIds','activeScoringIds'].includes(k))).toBe(false);
 });
});
