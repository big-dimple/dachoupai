import {describe,it,expect} from 'vitest';
import legacy from './fixtures/r2-v10-amo-checkpoints.json';
import {scoreR2Hand,previewR2Hand,type ScoreInput} from '../src/domain/scoreR2';
import {R2_JOKERS} from '../src/content/r2Schema';
import {R2_CONTENT_HASH,R2_LEGACY_CONTENT_HASH,R2_LEGACY_CONTENT_VERSION,R2_CONTENT_VERSION,r2CreateJoker,r2ScoreContext,r2RulesetFor} from '../src/domain/r2Run';
import {createRun,applyCommand,assertRunInvariants,type R2RunState,type Command} from '../src/domain/run';
import {makeCheckpoint,readCheckpoint,restoreSlots,type Checkpoint} from '../src/application/checkpoint';
import {SavedRun,type SaveStore,type SaveSlots} from '../src/application/SavedRun';
import {SeededRng} from '../src/core/SeededRng';
import {stableHash} from '../src/domain/hash';
import {CHARACTER_IDS} from '../src/domain/characters';
import {publicR2View} from '../src/testing/r2Bot';
const hand:ScoreInput['hand']=[{id:'K',rank:13,suit:'spades'},...([11,12,13,11] as const).map((rank,i)=>({id:'held'+i,rank,suit:'hearts' as const}))];
const input=(ids:string[],extra:Partial<ScoreInput>={}):ScoreInput=>({rulesVersion:'r2',runId:'amo-contract',rootId:'amo-contract/hand',characterId:'amo',hand,selectedIds:['K'],disabledIds:[],jokers:ids.map((id,i)=>r2CreateJoker(id,'owned/'+i,4,'none')),definitions:R2_JOKERS,handLevels:{'high-card':3},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:new SeededRng('amo-contract').snapshot(),gold:3,stageHeatBefore:'0',stageTargetHeat:'400',...extra});
const command=(s:R2RunState,action:Command['action']):Command=>({runId:s.runId,commandId:'version-'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});
function loaded(raw:unknown):Checkpoint {const read=readCheckpoint(raw);if(!read.ok)throw Error(read.code);return read.checkpoint;}
class MemoryStore implements SaveStore {slots:SaveSlots;constructor(cp:Checkpoint){this.slots={revision:1,current:structuredClone(cp),previous:null};}async read(){return structuredClone(this.slots);}async commit(rev:number,current:Checkpoint,previous:Checkpoint|null){if(rev!==this.slots.revision)throw Error('write-conflict');this.slots={revision:rev+1,current:structuredClone(current),previous:structuredClone(previous)};return rev+1;}}
describe('Amo ruleset identity and exact balance contract',()=>{
 it('keeps the actual published v10 identity, accepts only paired identities and creates explicit v11',()=>{
  expect(R2_LEGACY_CONTENT_HASH).toBe('json-fnv-v1:24efe7a905216d85');
  expect(r2RulesetFor(legacy.before.state)?.amoScoreTiming).toBe('before-joker');
  const state=createRun({seed:'new-rule',characterId:'amo',runId:'new-rule',rulesVersion:'r2'});
  expect([state.contentVersion,state.contentHash]).toEqual([R2_CONTENT_VERSION,R2_CONTENT_HASH]);expect(state.handLevels).toEqual({'high-card':3});
  expect(R2_CONTENT_HASH).not.toBe(R2_LEGACY_CONTENT_HASH);
  expect(r2RulesetFor({contentVersion:R2_LEGACY_CONTENT_VERSION,contentHash:R2_CONTENT_HASH})).toBeUndefined();
  expect(r2RulesetFor({contentVersion:R2_CONTENT_VERSION,contentHash:R2_LEGACY_CONTENT_HASH})).toBeUndefined();
 });
 it.each([
  [[],225,225],[['pengci'],325,525],[['a09'],275,375],[['d01'],525,525],[['a10'],675,675],
  [['f04'],375,675],[['a06'],337,337],[['f04','a06'],562,1012],[['a06','f04'],487,787],[['d01','pengci'],625,825],
 ] as const)('%j retains legacy %i and gives new %i with one final floor',(ids,oldScore,newScore)=>{
  const base=input([...ids]),before=JSON.stringify(base),old=scoreR2Hand(base),next=scoreR2Hand({...base,amoScoreTiming:'after-joker'});
  expect(old.finalScore).toBe(String(oldScore));expect(next.finalScore).toBe(String(newScore));expect(JSON.stringify(base)).toBe(before);
  expect(next.rng).toEqual(old.rng);expect(next.sets).toEqual(old.sets);
  const role=next.events.findIndex(e=>e.sourceType==='character'),lastJoker=next.events.reduce((last,e,i)=>e.phase==='jokerScore'?i:last,-1);
  expect(role).toBeGreaterThan(lastJoker);expect(next.events.filter(e=>e.sourceType==='character')).toHaveLength(1);
 });
 it.each(CHARACTER_IDS.filter(c=>c!=='amo'))('%s whole trace remains identical',characterId=>{
  const base=input(['pengci','a06'],{characterId});expect(scoreR2Hand({...base,amoScoreTiming:'after-joker'})).toEqual(scoreR2Hand(base));
 });
 it('preserves multi-card, B08, B13, card disabling and actual RNG decisions',()=>{
  for(const extra of [{selectedIds:['K','held0']},{boss:{definitionId:'B08',disabledSuit:null}},{characterId:'neutral'}] as Partial<ScoreInput>[]){
   const base=input(['pengci'],extra);expect(scoreR2Hand({...base,amoScoreTiming:'after-joker'})).toEqual(scoreR2Hand(base));
  }
  expect(scoreR2Hand(input(['f04','a06'],{amoScoreTiming:'after-joker',boss:{definitionId:'B13',disabledSuit:null}})).finalScore).toBe('787');
  expect(scoreR2Hand(input(['pengci'],{amoScoreTiming:'after-joker',disabledIds:['K']})).finalScore).toBe('420');
  for(const extra of [{},{hand:[{id:'K',rank:13,suit:'spades',enhancement:'glass-paper'}]}] as Partial<ScoreInput>[]){
   const base=input(['f08','pengci'],extra),a=scoreR2Hand(base),b=scoreR2Hand({...base,amoScoreTiming:'after-joker'});
   expect(b.rng).toEqual(a.rng);expect(b.destroyedCardIds).toEqual(a.destroyedCardIds);expect(b.goldDelta).toBe(a.goldDelta);
  }
 });
 it('keeps Q01 disabled, Joker editions and capped saved growth at their real phases',()=>{
  const state=createRun({seed:'challenge/q01/0',characterId:'amo',runId:'q01',rulesVersion:'r2',modeConfig:{mode:'challenge',difficulty:0,challengeId:'Q01',programsEnabled:true}});
  const ctx=r2ScoreContext(state,hand,['K']);expect(ctx.characterId).toBe('neutral');expect(state.handLevels).toEqual({});
  const scored=scoreR2Hand(input(['pengci'],{...ctx,handLevels:state.handLevels}));expect(scored.events.filter(e=>e.sourceType==='character')).toEqual([]);
  const instance=r2CreateJoker('pengci','holographic',4,'holographic');
  const old=scoreR2Hand(input([],{jokers:[instance]})),next=scoreR2Hand(input([],{jokers:[instance],amoScoreTiming:'after-joker'}));
  const role=next.events.findIndex(e=>e.sourceType==='character');expect(next.events.filter(e=>e.sourceDefinitionId==='pengci').every(e=>next.events.indexOf(e)<role)).toBe(true);
  expect(BigInt(next.finalScore)).toBeGreaterThan(BigInt(old.finalScore));
  const growing={...r2CreateJoker('e06','growth',4,'none'),growth:{multiplier:{n:'3',d:'1'}}};
  const capped=scoreR2Hand(input([],{jokers:[growing],amoScoreTiming:'after-joker'}));expect(capped.finalScore).toBe('675');expect(capped.jokers[0].growth).toEqual(growing.growth);
 });
 it('passes saved identity through actual score context and public bot without RNG/deck exposure',()=>{
  for(const cp of [loaded(legacy.before),makeCheckpoint(createRun({seed:'new-context',characterId:'amo',runId:'new-context',rulesVersion:'r2'}),[])]){
   const view=publicR2View(cp.state);expect(view.contentHash).toBe(cp.state.contentHash);expect(view).not.toHaveProperty('rng');expect(view).not.toHaveProperty('drawPile');
   expect(r2ScoreContext(view,view.hand,[]) .amoScoreTiming).toBe(cp.state.contentHash===R2_LEGACY_CONTENT_HASH?'before-joker':'after-joker');
  }
 });
});
describe('real v10 checkpoint continues under the new build without reinterpretation',()=>{
 it('keeps trace, receipts, export/import, actual next play and repeated receipt byte-exact',async()=>{
  const before=loaded(legacy.before),after=loaded(legacy.after);expect(after.state.lastTrace?.finalScore).toBe('325');
  const replay=applyCommand(before.state,legacy.command as Command);expect(replay.ok).toBe(true);if(!replay.ok)throw Error(replay.code);expect(replay.state).toEqual(after.state);
  const duplicate=applyCommand(after.state,legacy.command as Command);expect(duplicate.ok&&duplicate.duplicate).toBe(true);expect(duplicate.state).toEqual(after.state);
  const store=new MemoryStore(after),run=SavedRun.restore(store,await store.read());expect(JSON.parse(run.exportJSON())).toEqual(legacy.after);
  const result=await run.dispatch({type:'PlayHand',selectedIds:['hearts-13']});expect(result.ok).toBe(true);expect(run.state.lastTrace?.finalScore).toBe('325');
  expect(run.state.contentHash).toBe(R2_LEGACY_CONTENT_HASH);assertRunInvariants(run.state);
  const imported=loaded(JSON.parse(run.exportJSON())),copyStore=new MemoryStore(before),copy=await SavedRun.import(copyStore,imported,await copyStore.read());
  expect(copy.state).toEqual(run.state);expect(copy.state.receipts).toEqual(run.state.receipts);expect(copy.state.rng).toEqual(run.state.rng);
  const repeated=await copy.submit(imported.journal.at(-1)!);expect(repeated.ok&&repeated.duplicate).toBe(true);expect(copy.state).toEqual(run.state);
  for(const action of [{type:'OpenShop'},{type:'LeaveShop'},{type:'EnterStage'}] as const){const step=await copy.dispatch(action);expect(step.ok).toBe(true);expect(copy.state.contentHash).toBe(R2_LEGACY_CONTENT_HASH);}
 });
 it('new profile uses the same public hand with new trace and checkpoint validation',()=>{
  const state=structuredClone(loaded(legacy.before).state);state.contentVersion=R2_CONTENT_VERSION;state.contentHash=R2_CONTENT_HASH;
  const ids=['spades-13'],hand=state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!);
  const context=r2ScoreContext(state,hand,ids),p=previewR2Hand({...input([]),...context,hand,selectedIds:ids,jokers:state.jokers,handLevels:state.handLevels});expect(p.possibleScores).toEqual(['525']);
  const result=applyCommand(state,command(state,{type:'PlayHand',selectedIds:ids}));expect(result.ok).toBe(true);if(!result.ok)throw Error(result.code);
  expect(result.state.lastTrace?.finalScore).toBe('525');expect(loaded(makeCheckpoint(result.state,[])).state).toEqual(result.state);
  const duplicate=applyCommand(result.state,command(state,{type:'PlayHand',selectedIds:ids}));expect(duplicate.ok&&duplicate.duplicate).toBe(true);expect(duplicate.state).toEqual(result.state);
 });
 it('rejects retagging an already scored legacy trace as the new ruleset',()=>{
  const cp=structuredClone(legacy.after);cp.state.contentVersion=R2_CONTENT_VERSION;cp.state.contentHash=R2_CONTENT_HASH;
  const {checksum:unused,...payload}=cp;cp.checksum=stableHash(payload);
  expect(readCheckpoint(cp)).toMatchObject({ok:false,code:'invalid-save-amo-order'});
 });
 it('damaged legacy current falls back only to its own legacy backup',()=>{
  const backup=loaded(legacy.before),corrupt=structuredClone(legacy.after);corrupt.checksum='damaged';
  expect(restoreSlots({revision:4,current:corrupt,previous:backup})).toMatchObject({status:'backup',checkpoint:backup});
  const newState=createRun({seed:'different-profile',characterId:'amo',runId:'different-profile',rulesVersion:'r2'});
  expect(restoreSlots({revision:4,current:corrupt,previous:makeCheckpoint(newState,[])}).status).toBe('invalid');
 });
});
