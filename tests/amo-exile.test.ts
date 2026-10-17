import {savedAmoExileFormula} from '../src/game/AmoExileCopy';
import {describe,it,expect} from 'vitest';
import {createRun,applyCommand,type R2RunState,type Action,type Command} from '../src/domain/run';
import {newRunIdentity,launchIdentity} from '../src/game/RunLaunch';
import {R2_S04_FINISH_VERSION,R2_S04_FINISH_HASH} from '../src/domain/r2GroupUpgrade';
import {r2ScoreContext,r2CreateJoker} from '../src/domain/r2Run';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {scoreR2Hand,previewR2Hand} from '../src/domain/scoreR2';
import {usesAmoExile,amoExileChoice} from '../src/domain/r2AmoExile';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {SavedRun,type SaveSlots,type SaveStore} from '../src/application/SavedRun';
import {stableHash} from '../src/domain/hash';
import {characterForNewRun,characterForRun} from '../src/game/CharacterRunCopy';
import {heroAbilityCue} from '../src/game/HeroAbilityCue';
import {heroPayoffs} from '../src/game/HeroPayoff';
import {savedHeroAttachment} from '../src/game/HeroAttachmentFacts';
import {heroClimaxValue} from '../src/game/HeroClimax';
import {retainChosenHeroDraft} from '../src/game/HeroSkillDraftLifecycle';
import {aiScoreContext} from '../src/game/AiHandCandidates';
const flush=['hearts-2','hearts-5','hearts-8','hearts-11','hearts-13'],side=['spades-9','clubs-9','clubs-3'];
function send(s:R2RunState,a:Action,journal:Command[]=[]){const c={runId:s.runId,commandId:s.runId+'/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action:a},r=applyCommand(s,c);if(!r.ok)throw Error(r.code);journal.push(c);return r.state;}
function ready(legacy=false){let s=createRun({seed:'exile-rules',runId:'exile-rules',characterId:'amo',rulesVersion:'r2',openingRoute:'group',r2Identity:legacy?{contentVersion:R2_S04_FINISH_VERSION,contentHash:R2_S04_FINISH_HASH}:newRunIdentity('amo'),modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});s.handOrder=[...flush,...side];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id));return s;}
function score(s:R2RunState,selectedIds=flush,use=true){const hand=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!);return {rulesVersion:'r2' as const,runId:s.runId,rootId:s.runId+'/direct',hand,selectedIds,disabledIds:s.stage!.disabledIds,jokers:s.jokers,definitions:r2JokerDefinitionsFor(s),handLevels:s.handLevels,playIndex:s.stage!.playIndex+1,handsBeforePlay:s.stage!.handsLeft,previousHandType:s.stage!.previousHandType,wager:false,rng:s.rng.rule,...r2ScoreContext(s,hand,selectedIds),amoExile:{use,beforeUsed:s.stage!.amoExileUsed!}};}
const readable=(s:R2RunState,j:Command[]=[])=>expect(readCheckpoint(makeCheckpoint(s,j))).toMatchObject({ok:true});
describe('approved Su Shi exile',()=>{
 it('launches only new Su Shi into the new identity; preserves other five identities and old retry',()=>{
  expect(usesAmoExile(ready())).toBe(true);expect(ready().handLevels).toEqual({});
  for(const id of ['erxiang','azao','xiemu','touye','laohuan'] as const)expect(newRunIdentity(id)).toEqual({contentVersion:R2_S04_FINISH_VERSION,contentHash:R2_S04_FINISH_HASH});
  const old=ready(true);expect(usesAmoExile(old)).toBe(false);expect(launchIdentity('amo',{kind:'retry',run:old})).toEqual({contentVersion:old.contentVersion,contentHash:old.contentHash});readable(old);
  const bad=makeCheckpoint(createRun({seed:'exile-start',runId:'exile-start',characterId:'amo',rulesVersion:'r2',openingRoute:'group',r2Identity:newRunIdentity('amo')}),[]);bad.state.characterId='erxiang';const {checksum,...payload}=bad;bad.checksum=stableHash(payload);expect(readCheckpoint(bad)).toMatchObject({ok:false,code:'invalid-save-exile-character'});
 });
 it('turns700 into2800 through one real late character event and atomically sacrifices exactly three cards',()=>{
  const s=ready(),before=structuredClone(s),j:Command[]=[],next=send(s,{type:'PlayHand',selectedIds:flush,amoExile:true},j),t=next.lastTrace!;
  expect(scoreR2Hand(score(s,flush,false)).finalScore).toBe('700');expect(t.finalScore).toBe('2800');expect(savedAmoExileFormula(t)).toBe('贬谪：700 ×4 = 2,800');
  expect(t.amoExile).toEqual({use:true,beforeUsed:false,afterUsed:true,discardedIds:side,beforeScore:'700',afterScore:'2800'});
  expect(t.sets.heldIds).toEqual([]);expect(t.sets.discardedIds).toEqual(side);expect(next.discardPile).toEqual(side);expect(next.playedPile).toEqual(flush);expect(next.handOrder).toEqual([]);
  expect(t.events.filter(e=>e.sourceType==='character')).toHaveLength(1);expect(t.events.at(t.events.findIndex(e=>e.phase==='finalScore')-1)).toMatchObject({sourceType:'character',sourceDefinitionId:'amo',reasonKey:'amo.exile',operation:'multiply-multiplier',value:{n:'4',d:'1'}});
  expect(next.stage!.amoExileUsed).toBe(true);expect(next.deckInstances).toEqual(s.deckInstances);expect(next.destroyedIds).toEqual([]);expect(s).toEqual(before);readable(next,j);
 });
 it('supports ordinary pair and high card without a same-rank side group',()=>{
  const s=ready();expect(scoreR2Hand(score(s,side.slice(0,2))).finalScore).toBe('424');
  const j:Command[]=[],next=send(s,{type:'PlayHand',selectedIds:[side[2]],amoExile:true},j);
  expect(next.lastTrace!.finalScore).toBe('92');expect(next.lastTrace!.amoExile!.discardedIds).toHaveLength(7);
  expect(next.handOrder).toHaveLength(8);expect(next.drawPile).toHaveLength(s.drawPile.length-8);expect(next.stage!.handLimit).toBe(8);
  expect(next.stage!.handsLeft).toBe(s.stage!.handsLeft-1);expect(next.stage!.discardsLeft).toBe(s.stage!.discardsLeft);expect(next.stage!.discardsUsed).toBe(0);expect(next.gold).toBe(s.gold);readable(next,j);
  const failed=applyCommand(next,{runId:next.runId,commandId:'second-exile',expectedSeq:next.commandSeq,action:{type:'PlayHand',selectedIds:[next.handOrder[0]],amoExile:true}});expect(failed).toMatchObject({ok:false,code:'amo-exile-already-used'});
  const ordinary=send(next,{type:'PlayHand',selectedIds:[next.handOrder[0]]},j);expect(ordinary.lastTrace!.amoExile!.use).toBe(false);expect(ordinary.stage!.amoExileUsed).toBe(true);readable(ordinary,j);
 });
 it('does not count sacrificed cards as held, suppress ordinary-point effects twice, or run discard hooks',()=>{
  const s=ready();s.deckInstances.find(c=>c.id===side[0])!.enhancement='gold-paper';const t=scoreR2Hand(score(s));
  expect(t.events.some(e=>e.phase==='onHeldCard')).toBe(false);expect(t.goldDelta).toBe(0);
  expect(t.sets.activeScoringIds).toEqual(flush);expect(t.events.some(e=>e.targetCardId&&side.includes(e.targetCardId))).toBe(false);
 });
 it('uses exact integer score times4, including a fractional ordinary result and public preview',()=>{
  const s=ready();s.handLevels.flush=2;const input=score(s),ordinary=scoreR2Hand({...input,amoExile:{use:false,beforeUsed:false}}),t=scoreR2Hand(input);
  expect(t.finalScore).toBe((BigInt(ordinary.finalScore)*4n).toString());expect(previewR2Hand(input).scoreRange).toEqual({minimum:t.finalScore,maximum:t.finalScore});
  const next=send(s,{type:'PlayHand',selectedIds:flush,amoExile:true});readable(next);
 });
 it('applies exactly once after whole Joker editions and route factors, with the same rule RNG',()=>{
  const s=ready();s.jokers=['f09','f06','e08'].map((id,i)=>r2CreateJoker(id,'exile/joker/'+i,8,i===0?'polychrome':'none',s));s.stage!.initialJokerIds=s.jokers.map(j=>j.instanceId);
  const base=scoreR2Hand(score(s,flush,false)),next=send(s,{type:'PlayHand',selectedIds:flush,amoExile:true}),t=next.lastTrace!,role=t.events.findIndex(e=>e.reasonKey==='amo.exile');
  expect(t.finalScore).toBe((BigInt(base.finalScore)*4n).toString());expect(t.rng).toEqual(base.rng);expect(t.events.slice(role+1).some(e=>['jokerScore','routeGrowth'].includes(e.phase))).toBe(false);readable(next);
 });
 it('rejects empty sacrifice, reused ability, disabled Boss and legacy commands without mutation',()=>{
  const s=ready(),before=JSON.stringify(s),input=score(s);expect(()=>scoreR2Hand({...input,hand:input.hand.slice(0,5)})).toThrow('amo-exile-empty-cost');
  expect(()=>scoreR2Hand({...input,amoExile:{use:true,beforeUsed:true}})).toThrow('amo-exile-unavailable');
  expect(()=>scoreR2Hand({...input,boss:{definitionId:'B08',disabledSuit:null}})).toThrow('amo-exile-unavailable');
  const old=ready(true);expect(applyCommand(old,{runId:old.runId,commandId:'old-exile',expectedSeq:old.commandSeq,action:{type:'PlayHand',selectedIds:flush,amoExile:true}})).toMatchObject({ok:false,code:'invalid-amo-exile'});expect(JSON.stringify(s)).toBe(before);
  let q=createRun({seed:'challenge/q01/0',runId:'exile/q',characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo'),openingRoute:'group',modeConfig:{mode:'challenge',difficulty:0,challengeId:'Q01',programsEnabled:false}});q=send(send(q,{type:'LeaveShop'}),{type:'EnterStage'});expect(amoExileChoice(q,[q.handOrder[0]]).available).toBe(false);expect(applyCommand(q,{runId:q.runId,commandId:'disabled',expectedSeq:q.commandSeq,action:{type:'PlayHand',selectedIds:[q.handOrder[0]],amoExile:true}})).toMatchObject({ok:false,code:'amo-exile-disabled'});readable(send(q,{type:'PlayHand',selectedIds:[q.handOrder[0]]}));
 });
 it('keeps the normal empty-draw behavior and restores all cards and eligibility at next-stage entry',()=>{
  const s=ready();s.discardPile=[...s.drawPile];s.drawPile=[];const next=send(s,{type:'PlayHand',selectedIds:[side[2]],amoExile:true});
  expect(next.handOrder).toHaveLength(0);expect(next.phase).toBe('run-lost');expect(next.outcome?.reason).toBe('no-legal-cards');expect(next.deckInstances).toHaveLength(52);expect(next.destroyedIds).toEqual([]);readable(next);
  const cleared=send(ready(),{type:'PlayHand',selectedIds:flush,amoExile:true}),entered=send(send(send(cleared,{type:'OpenShop'}),{type:'LeaveShop'}),{type:'EnterStage'});expect(entered.stage!.amoExileUsed).toBe(false);expect(entered.stage!.handLimit).toBe(8);expect(entered.handOrder).toHaveLength(8);readable(entered);
 });
 it('does not persist preview or chosen draft; cancellation and cold restore keep the unused ability',()=>{
  const s=ready(),before=JSON.stringify(s),input=score(s);previewR2Hand(input);expect(amoExileChoice(s,flush).available).toBe(true);
  const draft={erxiangTargetId:null,azaoRelease:false,xiemuBurn:0 as const,amoExile:true};expect(retainChosenHeroDraft(s,undefined,draft).amoExile).toBe(false);
  const context=aiScoreContext({...r2ScoreContext(s,input.hand,flush),handLevels:{},previousHandType:null,wager:false},draft);expect(context.amoExile?.use).toBe(true);
  expect(JSON.stringify(s)).toBe(before);expect(readCheckpoint(makeCheckpoint(s,[]))).toMatchObject({ok:true});expect(s.stage!.amoExileUsed).toBe(false);
 });
 it('persists one candidate on save failure; retry, reload and duplicate never repeat discard or score',async()=>{
  const s=ready();let slots:SaveSlots={revision:1,current:makeCheckpoint(s,[]),previous:null},fail=true;const candidates:string[]=[];
  const store:SaveStore={read:async()=>slots,commit:async(rev,cp,backup)=>{candidates.push(JSON.stringify(cp));if(fail)throw Error('quota');slots={revision:rev+1,current:cp,previous:backup};return slots.revision;}};
  const saved=SavedRun.restore(store,slots);expect(await saved.dispatch({type:'PlayHand',selectedIds:flush,amoExile:true})).toMatchObject({ok:false,code:'save-failed'});expect(saved.state).toEqual(s);
  fail=false;expect((await saved.retry()).ok).toBe(true);expect(candidates[1]).toBe(candidates[0]);const restored=SavedRun.restore(store,slots);expect(restored.state).toEqual(saved.state);const before=structuredClone(restored.state);expect(await restored.submit(restored.journal.at(-1)!)).toMatchObject({ok:true,duplicate:true});expect(restored.state).toEqual(before);expect(slots.revision).toBe(2);
 });
 it('rejects forged sacrifice, score, source reason and usage even with a recomputed checksum',()=>{
  const j:Command[]=[],next=send(ready(),{type:'PlayHand',selectedIds:flush,amoExile:true},j),cp=makeCheckpoint(next,j);
  for(const change of [(x:typeof cp)=>x.state.lastTrace!.amoExile!.discardedIds.pop(),(x:typeof cp)=>x.state.lastTrace!.amoExile!.afterScore='2801',(x:typeof cp)=>x.state.stage!.amoExileUsed=false,(x:typeof cp)=>x.state.lastTrace!.events.find(e=>e.reasonKey==='amo.exile')!.reasonKey='fake']){
   const forged=structuredClone(cp);change(forged);const {checksum,...payload}=forged;forged.checksum=stableHash(payload);expect(readCheckpoint(forged).ok).toBe(false);
  }
 });
 it('projects plain copy and one saved shared payoff/attachment/eyes from actual trace only',()=>{
  const s=ready(),copy=characterForNewRun('amo');expect(copy.passiveName).toBe('贬谪');expect(copy.detailRules).toContain('4倍');expect(characterForRun(ready(true)).passiveName).not.toBe('贬谪');
  expect(heroAbilityCue(s,undefined,flush,false,{amoExile:true})).toMatchObject({label:'贬谪',available:true,state:'selected'});
  const next=send(s,{type:'PlayHand',selectedIds:flush,amoExile:true}),t=next.lastTrace!,keys=heroPayoffs(next,t);expect(keys).toHaveLength(1);expect(heroClimaxValue(next,t,keys[0])).toBeTruthy();expect(savedHeroAttachment(t,'amo')?.targetIds).toEqual(flush);expect(heroPayoffs(next,t,true)).toEqual([]);
 });
});
