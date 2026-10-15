import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRun,applyCommand,type R2RunState,type Action,type Command} from '../src/domain/run';
import {CHARACTER_IDS} from '../src/domain/characters';
import {newRunIdentity} from '../src/game/RunLaunch';
import {isR2CoreBuild,R2_S04_FINISH_HASH,R2_S04_FINISH_VERSION} from '../src/domain/r2GroupUpgrade';
import {getR2Stage,r2ChapterTargetPreview,r2ScoreContext,assertR2Invariants,r2CreateJoker} from '../src/domain/r2Run';
import {lockR2ChapterTargets} from '../src/domain/r2Chapter';
import {r2TargetPolicyFor} from '../src/domain/r2TargetPolicy';
import {r2AssistAvailability} from '../src/domain/r2Assist';
import {scoreR2Hand} from '../src/domain/scoreR2';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {boundedArrange} from './fixtures/bounded-clear';
import {activeCards,activeScoreInput,activeJoker} from './fixtures/p1a-active-mult';
import {touyeFixture,touyeBet,touyeSend} from './fixtures/touye-new-core';
import {f06RecommendationFixture} from '../harness/fixtures/f06-recommendation';
import {r2PracticeQuotes,r2PracticeBasePrice} from '../src/domain/r2Practice';
import {r2PurchasePrice,r2BasicChoicePool} from '../src/domain/r2Shop';
import {r2StageSpec} from '../src/domain/r2Chapter';
import {R2_HAND_TYPES} from '../src/domain/evaluateR2';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {SavedRun,type SaveStore,type SaveSlots} from '../src/application/SavedRun';
import {routeStarterStartCommand} from '../src/domain/r2RouteStarter';
import {stableHash} from '../src/domain/hash';
import {naturalFile} from '../analysis/core-build-window';

const command=(s:R2RunState,action:Action):Command=>({runId:s.runId,commandId:s.runId+'/core/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});
function send(s:R2RunState,action:Action){const r=applyCommand(s,command(s,action));if(!r.ok)throw Error(r.code);return r.state;}
function round(s:R2RunState){const cp=makeCheckpoint(s,[]);expect(readCheckpoint(JSON.parse(JSON.stringify(cp)))).toEqual({ok:true,checkpoint:cp});return cp;}
const start=(hero:R2RunState['characterId']='amo')=>createRun({rulesVersion:'r2',seed:'core-build-fixed',runId:'core-build/'+hero,characterId:hero,openingRoute:'group',r2Identity:newRunIdentity(hero,'group'),modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
// Replay a fixed actual command policy under the new identity. This is a
// counterfactual, not another natural sample, seed selection or save migration.
function coreC10(){const old=JSON.parse(readFileSync(naturalFile,'utf8')),state=old.state as R2RunState;const r=applyCommand(null,routeStarterStartCommand({...state,...newRunIdentity(state.characterId,state.openingRoute)}));if(!r.ok)throw Error(r.code);let s=r.state as R2RunState;for(const c of old.journal){const n=applyCommand(s,c);if(!n.ok)throw Error(n.code);s=n.state;}expect(s.stage!.targetHeat).toBe('55283');expect(s.stage!.heat).toBe('60047');return send(s,{type:'OpenShop'});}
const practice=(s:R2RunState,type=Object.keys(s.handLevels)[0] as typeof R2_HAND_TYPES[number]):Action=>({type:'PracticeHand',handType:type,expectedLevel:s.handLevels[type]!,shopSeq:s.shop!.basicChoice!.shopSeq});

describe('core build paid growth and public chapter lock',()=>{
 it.each(CHARACTER_IDS)('%s launches the shared identity with all existing skill capabilities',hero=>{
  const s=start(hero);expect(s).toMatchObject({contentVersion:R2_S04_FINISH_VERSION,contentHash:R2_S04_FINISH_HASH});expect(isR2CoreBuild(s)).toBe(true);round(s);
  expect(r2ChapterTargetPreview(s)).toEqual({policyVersion:'core-build-target-v1',chapter:1,targets:['400','600','800'],boss:s.boss});
  const ctx=r2ScoreContext(s,[],[]);expect(ctx.boundedClear).toBe(true);expect(ctx.activeMultTiming).toBe(['touye','xiemu','azao'].includes(hero)?'after-route-growth':undefined);
 });
 it('uses exact fixed 27/20 growth, original difficulty and a single final ceiling',()=>{
  for(const chapter of [1,8,9,10,13,30])for(const d of [0,1,2,3])for(const i of [0,1,2]){
   const spec=r2StageSpec((chapter-1)*3+i,chapter<=8?'normal':'endless',d,true,true)!;
   const warm=chapter<=8?BigInt([400,900,1800,3600,6000,9000,14000,20475][chapter-1]):20475n*27n**BigInt(chapter-8),den=chapter<=8?1n:20n**BigInt(chapter-8);
   const multiplier=[1n,3n,2n][i],stageDen=i===1?2n:1n,difficulty=d===0?{n:1n,d:1n}:{n:6n,d:5n};
   const n=warm*multiplier*difficulty.n,q=den*stageDen*difficulty.d;expect(spec.targetHeat).toBe(((n+q-1n)/q).toString());
  }
  expect([27,28,29].map(i=>getR2Stage(i,'endless',0,newRunIdentity('amo'))!.targetHeat)).toEqual(['37316','55974','74632']);
 });
 it('quotes the locked paid service and executes it immediately without inventory or RNG',()=>{
  const s=coreC10(),before=stableHash(s),q=r2PracticeQuotes(s).find(q=>q.handType==='straight')!;
  expect(q).toMatchObject({levelBefore:15,levelAfter:16,basePrice:12,price:11,goldAfter:253,available:true});expect(stableHash(s)).toBe(before);
  const c=command(s,practice(s,'straight')),r=applyCommand(s,c);expect(r.ok).toBe(true);if(!r.ok)throw Error(r.code);const n=r.state;
  expect(n.gold).toBe(253);expect(n.handLevels.straight).toBe(16);expect(n.rng).toEqual(s.rng);expect(n.consumables).toEqual(s.consumables);expect(n.routeGrowth).toEqual(s.routeGrowth);expect(n.chapterTargetPlan).toEqual(s.chapterTargetPlan);
  expect(r.events).toEqual([{type:'hand-practiced',handType:'straight',levelBefore:15,levelAfter:16,paidPrice:11,goldBefore:264,goldAfter:253}]);
  expect(r2PracticeQuotes(n)).toEqual([]);expect(r2BasicChoicePool(n)).toEqual([]);expect(applyCommand(n,c)).toMatchObject({ok:true,duplicate:true,state:n});round(n);
  const refreshed=send(n,{type:'RerollShop'});expect(refreshed.shop!.basicChoice).toEqual(n.shop!.basicChoice);expect(r2PracticeQuotes(refreshed)).toEqual([]);round(refreshed);
  const next=send(send(refreshed,{type:'SkipStage'}),{type:'OpenShop'});expect(next.shop!.basicChoice!.purchase).toBeNull();expect(r2PracticeQuotes(next).some(q=>q.handType==='straight')).toBe(true);round(next);
 });
 it('uses one quota in both directions; random and held T01 retain their original price and use',()=>{
  const s=coreC10(),tool=r2BasicChoicePool(s).find(t=>t.id==='T08')!;
  const basic=send(s,{type:'BuyBasicTool',definitionId:tool.id,shopSeq:s.shop!.basicChoice!.shopSeq});
  expect(applyCommand(basic,command(basic,practice(basic,'straight')))).toMatchObject({ok:false,code:'basic-choice-consumed',state:basic});
  const inventory=structuredClone(s);inventory.consumables.push({instanceId:'controlled-original-T01',definitionId:'T01'});const used=send(inventory,{type:'UseConsumable',instanceId:'controlled-original-T01',handType:'straight',targetIds:[]});
  expect(used.handLevels.straight).toBe(16);expect(used.gold).toBe(s.gold);expect(used.shop!.basicChoice!.purchase).toBeNull();expect(r2PurchasePrice(s,{offerId:'stock',definitionId:'T01',price:4,consumed:false})).toBe(3);round(used);
 });
 it('rejects undiscovered/capped/unaffordable/stale choices atomically; the coupon has the usual floor',()=>{
  const base=coreC10();
  for(const [edit,a,code] of [
   [(s:R2RunState)=>delete s.handLevels.flush,{type:'PracticeHand',handType:'flush',expectedLevel:1,shopSeq:base.shop!.basicChoice!.shopSeq},'undiscovered-hand-type'],
   [(s:R2RunState)=>s.handLevels.straight=30,{...practice(base,'straight'),expectedLevel:30},'hand-level-cap'],
   [(s:R2RunState)=>s.gold=0,practice(base,'straight'),'not-enough-gold'],
   [()=>{}, {...practice(base,'straight'),expectedLevel:14},'stale-practice-level'],
   [()=>{}, {...practice(base,'straight'),shopSeq:1},'stale-shop'],
  ] as const){const s=structuredClone(base);edit(s);const before=stableHash(s);expect(applyCommand(s,command(s,a as Action))).toMatchObject({ok:false,code,state:s});expect(stableHash(s)).toBe(before);}
  const coupon=structuredClone(base);coupon.handLevels.pair=1;coupon.purchaseCoupons=1;
  expect(r2PracticeQuotes(coupon).find(q=>q.handType==='pair')!.price).toBe(1);const n=send(coupon,practice(coupon,'pair'));expect(n.purchaseCoupons).toBe(0);expect(n.gold).toBe(263);round(n);
  expect([1,3,4,6,7,15,16,29].map(r2PracticeBasePrice)).toEqual([4,4,6,6,8,12,14,22]);expect(()=>r2PracticeBasePrice(30)).toThrow();
 });
 it('keeps chapter preview unchanged by purchases, discounts, reordering, viewing and entry',()=>{
  const s=coreC10(),plan=r2ChapterTargetPreview(s)!,view=r2ChapterTargetPreview(s)!;view.targets[0]='1';expect(r2ChapterTargetPreview(s)).toEqual(plan);
  let n=send(s,practice(s,'straight'));n=send(n,{type:'ReorderJokers',ids:[...n.jokers.map(j=>j.instanceId)].reverse()});expect(r2ChapterTargetPreview(n)).toEqual(plan);
  n=send(send(n,{type:'LeaveShop'}),{type:'EnterStage'});expect(n.stage!.initialTargetHeat).toBe(plan.targets[0]);expect(n.stage!.targetHeat).toBe(plan.targets[0]);round(n);
  const scored=send(n,{type:'PlayHand',selectedIds:n.handOrder.slice(0,5)});expect(scored.chapterTargetPlan).toEqual(plan);round(scored);
  const forged=structuredClone(makeCheckpoint(n,[]));forged.state.chapterTargetPlan!.targets[0]='1';const {checksum:_,...payload}=forged;expect(readCheckpoint({...payload,checksum:stableHash(payload)}).ok).toBe(false);
 });
 it('B14 uses the published initial target for every real discard, including repeated confirmation',()=>{
  let s=send(coreC10(),{type:'LeaveShop'});s.shop=null;s.stage=null;s.lastTrace=null;s.stageIndex=29;
  s.boss={definitionId:'B14',disabledSuit:null};s.seenBossIds=['B01','B02','B03','B04','B05','B06','B07','B08','B09','B14'];s.chapterTargetPlan=lockR2ChapterTargets(10,'endless',0,s.boss);
  s=send(s,{type:'EnterStage'});expect(s.stage!.initialTargetHeat).toBe('74632');
  for(let i=1;i<=2;i++){const c=command(s,{type:'DiscardHand',selectedIds:[s.handOrder[0]]}),r=applyCommand(s,c);expect(r.ok).toBe(true);if(!r.ok)throw Error(r.code);s=r.state;expect(s.stage!.targetHeat).toBe(String(74632+3732*i));expect(s.chapterTargetPlan!.targets[2]).toBe('74632');expect(applyCommand(s,c)).toMatchObject({ok:true,duplicate:true,state:s});round(s);}
  expect(r2TargetPolicyFor(s).multiplier).toEqual({n:'27',d:'20'});
 });
 it('chapter3 B09 has a paid buy/keep outcome difference without adding a multiplier',()=>{
  const play=(buy:boolean)=>{
   let s=f06RecommendationFixture(2);s.chapter=3;s.stageIndex=8;s.shop!.visitIndex=8;s.gold=4;s.boss={definitionId:'B09',disabledSuit:null};s.seenBossIds=['B01','B02','B09'];s.chapterTargetPlan=lockR2ChapterTargets(3,'normal',0,s.boss);
   s.jokers=[r2CreateJoker('mantangcai','controlled-mantangcai',4,undefined,s)];s.handLevels={pair:1};s.routeGrowth={clears:8,G:8,S:0,F:0,settlements:Array.from({length:8},(_,stageIndex)=>({stageIndex,families:['G']}))};round(s);
   if(buy)s=send(s,practice(s,'pair'));const enteredGold=s.gold;s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});expect(s.stage!.initialHands).toBe(3);expect(s.stage!.targetHeat).toBe('3600');
   const scores=[];for(const rank of [6,7,8]){s=send(boundedArrange(s,['spades-'+rank,'hearts-'+rank]),{type:'PlayHand',selectedIds:['spades-'+rank,'hearts-'+rank]});scores.push(s.lastTrace!.finalScore);round(s);}return {s,scores,enteredGold};
  };
  const keep=play(false),buy=play(true);expect(keep).toMatchObject({scores:['1096','1112','1128'],enteredGold:4,s:{phase:'run-lost',stage:{heat:'3336'}}});expect(buy).toMatchObject({scores:['1520','1540','1560'],enteredGold:0,s:{phase:'stage-cleared',stage:{heat:'4620'}}});
 });
 it.each([
  ['group','pair',[9,9],'mantangcai'],['straight','straight',[8,9,10,11,12],'c04'],['flush','flush',[3,5,7,9,11],'c06'],
 ] as const)('%s has a real paid level choice and a distinct weak/grown construction slice',(_route,type,ranks,id)=>{
  const s=start();s.handLevels[type]=1;const grown:Record<string,{n:string;d:string}>=id==='c04'?{heat:{n:'100',d:'1'}}:id==='c06'?{multiplier:{n:'6',d:'1'}}:{};
  s.jokers=[{...r2CreateJoker(id,id,4,undefined,s),growth:{...r2CreateJoker(id,id,4,undefined,s).growth,...grown}}];
  const hand=activeCards([...ranks],2,type==='flush'),score=(state:R2RunState,jokers=state.jokers)=>scoreR2Hand({...activeScoreInput(hand,jokers),definitions:r2JokerDefinitionsFor(state),handLevels:state.handLevels,...r2ScoreContext(state,hand,hand.map(c=>c.id))});
  const weak=score(s,[]),before=score(s),n=send(s,practice(s,type)),after=score(n);
  expect(n.gold).toBe(2);expect(n.handLevels[type]).toBe(2);expect(BigInt(before.finalScore)).toBeGreaterThan(BigInt(weak.finalScore));expect(BigInt(after.finalScore)).toBeGreaterThan(BigInt(before.finalScore));expect(n.routeGrowth).toEqual(s.routeGrowth);round(n);
 });
 it('Amo assist and Erxiang handoff use their actual current-identity qualifications',()=>{
  const main=['spades-9','hearts-9','clubs-13','diamonds-13'],side=['spades-12','hearts-12'];
  let amo=boundedArrange(send(send(start('amo'),{type:'LeaveShop'}),{type:'EnterStage'}),[...main,...side]);expect(r2AssistAvailability(amo)).toEqual({available:true,remaining:1});
  expect(applyCommand(amo,command(amo,{type:'PlayAssistedHand',selectedIds:main.slice(0,2),assistIds:side}))).toMatchObject({ok:false,code:'assist-unqualified-main',state:amo});
  const assisted=send(amo,{type:'PlayAssistedHand',selectedIds:main,assistIds:side});expect(assisted.stage!.assistUsed).toBe(true);expect(assisted.lastTrace!.assist!.multiplier).toBe(2);round(assisted);
  const pair=['spades-8','hearts-8'],er=boundedArrange(send(send(start('erxiang'),{type:'LeaveShop'}),{type:'EnterStage'}),pair),played=send(er,{type:'PlayHand',selectedIds:pair,erxiangTargetId:pair[0]});expect(played.stage!.erxiangHandoffUsed).toBe(true);expect(played.lastTrace!.erxiangHandoff!.points).toBe(8);round(played);
 });
 it('Laohuan keeps actual choices and Touye still requires new effective core',()=>{
  const s=send(send(start('laohuan'),{type:'LeaveShop'}),{type:'EnterStage'}),pending=send(s,{type:'DiscardHand',selectedIds:s.handOrder.slice(0,2),laohuanTrick:true});expect(pending.phase).toBe('pending-refill');round(pending);
  const chosen=send(pending,{type:'ChooseRefill',selectedIds:pending.pendingRefill!.candidateIds.slice(0,pending.pendingRefill!.required)});expect(chosen.stage!.laohuanTrickUsed).toBe(true);expect(chosen.phase).toBe('await-input');round(chosen);
  for(const kind of ['mature-win','mature-accompanying'] as const){const f=touyeFixture(kind,{identity:newRunIdentity('touye','group')}),bet=touyeSend(f.state,touyeBet(f.state,f.discard,f.target)),n=touyeSend(bet,{type:'PlayHand',selectedIds:f.play});expect(n.lastTrace!.touyeWager!.outcome).toBe(kind==='mature-win'?'won':'lost');round(n);}
 });
 it('Xiemu pays before balance hooks, while Azao charges only on qualified real hands',()=>{
  let x=start('xiemu');x.gold=30;x.jokers=[r2CreateJoker('e08','cash-source',8,undefined,x)];x=boundedArrange(send(send(x,{type:'LeaveShop'}),{type:'EnterStage'}),['hearts-8','spades-8','clubs-8','hearts-9','spades-9']);
  const burnt=send(x,{type:'PlayHand',selectedIds:x.handOrder.slice(0,5),xiemuBurn:30});expect(burnt.lastTrace!.xiemuBurn!.cost).toBe(30);expect(burnt.lastTrace!.events.some(e=>e.sourceDefinitionId==='e08')).toBe(false);expect(burnt.stage!.xiemuBurnUsed).toBe(true);round(burnt);
  let a=boundedArrange(send(send(start('azao'),{type:'LeaveShop'}),{type:'EnterStage'}),['hearts-2','spades-2','clubs-3','diamonds-3']);a=send(a,{type:'PlayHand',selectedIds:['hearts-2','spades-2','clubs-3','diamonds-3']});expect(a.stage!.azaoCharge!.charge).toBe(1);round(a);
  a=boundedArrange(a,['hearts-4','spades-4']);const low=send(a,{type:'PlayHand',selectedIds:['hearts-4','spades-4']});expect(low.stage!.azaoCharge!.charge).toBe(0);round(low);
 });
 it('binds the service receipt to the exact choice and protects the quota from deletion',()=>{
  const n=send(coreC10(),practice(coreC10(),'straight'));round(n);
  for(const edit of [(s:R2RunState)=>s.shop!.basicChoice!.purchase=null,(s:R2RunState)=>s.shop!.basicChoice!.purchase!.paidPrice=23,(s:R2RunState)=>s.shop!.basicChoice!.purchase!.levelBefore=14,(s:R2RunState)=>s.shop!.basicChoice!.purchase!.handType='pair']){
   const cp=structuredClone(makeCheckpoint(n,[]));edit(cp.state);const {checksum:_,...payload}=cp;expect(readCheckpoint({...payload,checksum:stableHash(payload)}).ok).toBe(false);
  }
 });
 it('retries a fixed saved practice candidate once and cold-restores the locked plan',async()=>{
  const s=coreC10();let fail=false;const attempts:string[]=[],store:SaveStore&{slots:SaveSlots}={slots:{revision:0,current:null,previous:null},async read(){return structuredClone(this.slots);},async commit(revision,current,previous){attempts.push(JSON.stringify(current));if(fail)throw Error('controlled quota');this.slots={revision:revision+1,current,previous};return this.slots.revision;}};
  const saved=await SavedRun.start(store,s,store.slots),before=structuredClone(saved.state),slots=structuredClone(store.slots),c=command(s,practice(s,'straight'));fail=true;
  expect((await saved.submit(c)).ok).toBe(false);expect(saved.state).toEqual(before);expect(store.slots).toEqual(slots);
  fail=false;expect((await saved.retry()).ok).toBe(true);expect(attempts.at(-1)).toBe(attempts.at(-2));expect(await saved.submit(c)).toMatchObject({ok:true,duplicate:true});expect(SavedRun.restore(store,store.slots).state).toEqual(saved.state);round(saved.state);
 });
});
