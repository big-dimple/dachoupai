import {describe,it,expect} from 'vitest';
import {createRun,applyCommand,type Action,type R2RunState} from '../src/domain/run';
import {r2CreateJoker,assertR2Invariants} from '../src/domain/r2Run';
import {R2_PUBLISHED_CONTENT,R2_PUBLISHED_JOKERS} from '../src/domain/r2PublishedContent';
import {R2_ASSIST_JOKERS,R2_ASSIST_ADAPTED_IDS} from '../src/content/r2AssistJokers';
import {r2JokerDefinitionsFor,r2JokerDefinitionFor} from '../src/domain/r2ContentProfiles';
import {validateR2Content,validR2Condition} from '../src/content/r2Schema';
import {scoreR2Hand,SCORE_LIMITS} from '../src/domain/scoreR2';
import {r2SelectionFacts} from '../src/domain/r2SelectionFacts';
import {r2AssistFacts} from '../src/domain/r2Assist';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {SavedRun,type SaveStore,type SaveSlots} from '../src/application/SavedRun';
import {jokerAbilityCopyForRun,jokerMemoryAbility,publicJokerMemoryContext} from '../src/game/JokerMemory';
import {stableHash} from '../src/domain/hash';
import type {PlayingCard} from '../src/cards/types';
import type {R2HandType} from '../src/domain/evaluateR2';

const main=['spades-9','hearts-9','clubs-13','diamonds-13'],support=['spades-12','hearts-12'];
const hand=[...main,...support,'clubs-6','diamonds-7'];
function send(s:R2RunState,action:Action){const command={runId:s.runId,commandId:'c/'+s.commandSeq,expectedSeq:s.commandSeq,action},r=applyCommand(s,command);if(!r.ok)throw Error(r.code);return r.state;}
function fixture(ids=hand,jokers:string[]=[],prototype=true){let s=createRun({seed:'seven',runId:'seven',characterId:'amo',rulesVersion:'r2',...(prototype?{r2Profile:'amo-assist-v1' as const}:{}),modeConfig:{mode:'standard',difficulty:3,challengeId:null,programsEnabled:false}});s.jokers=jokers.map(id=>r2CreateJoker(id,id,4));s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});s.handOrder=[...ids];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id));assertR2Invariants(s);return s;}
const round=(s:R2RunState)=>{const cp=makeCheckpoint(s,[]);expect(readCheckpoint(structuredClone(cp))).toEqual({ok:true,checkpoint:cp});return cp;};
const own=(s:R2RunState,id:string)=>s.lastTrace!.events.filter(e=>e.sourceDefinitionId===id);
const cards=(ranks:readonly number[],flush=false):PlayingCard[]=>ranks.map((rank,i)=>({id:'card/'+i,rank:rank as PlayingCard['rank'],suit:flush?'hearts':i%2?'spades':'clubs'}));
function score(played:PlayingCard[],ids:string[],previousHandType:R2HandType|null=null,extra:Partial<Parameters<typeof scoreR2Hand>[0]>={}){return scoreR2Hand({rulesVersion:'r2',runId:'score',rootId:'score/test',hand:played,selectedIds:played.map(c=>c.id),disabledIds:[],definitions:R2_ASSIST_JOKERS,jokers:ids.map(id=>r2CreateJoker(id,id,4)),characterId:'amo',amoScoreTiming:'assist-v1',handLevels:{},previousHandType,playIndex:previousHandType?2:1,handsBeforePlay:4,wager:false,rng:{algorithm:'fnv1a-mulberry32-v1',state:99},...extra});}

describe('Amo prototype seven-card profile',()=>{
 it('overlays exactly seven, preserving published bytes, identities, initial growth, inventory and other65',()=>{
  expect(validateR2Content(R2_ASSIST_JOKERS)).toEqual([]);expect(R2_ASSIST_JOKERS).toHaveLength(72);
  expect(stableHash(R2_PUBLISHED_CONTENT.snapshot)).toBe('json-fnv-v1:24efe7a905216d85');
  expect(R2_PUBLISHED_CONTENT.v11.hash).toBe('json-fnv-v1:bd4a1230833ab884');
  expect(R2_ASSIST_JOKERS.filter((d,i)=>d!==R2_PUBLISHED_JOKERS[i]).map(d=>d.id).sort()).toEqual([...R2_ASSIST_ADAPTED_IDS].sort());
  for(const p of [R2_PUBLISHED_CONTENT.v10,R2_PUBLISHED_CONTENT.v11])expect(r2JokerDefinitionsFor({contentVersion:p.version,contentHash:p.hash})).toBe(R2_PUBLISHED_JOKERS);
  const s=fixture();expect(r2JokerDefinitionsFor(s)).toBe(R2_ASSIST_JOKERS);expect(Object.isFrozen(r2JokerDefinitionFor(s,'a05').hooks[1].condition)).toBe(true);
  expect(()=>r2JokerDefinitionsFor({...s,contentHash:R2_PUBLISHED_CONTENT.v11.hash})).toThrow('incompatible-version');
  expect(fixture(hand,[],false).contentVersion).toBe(R2_PUBLISHED_CONTENT.v11.version);
 });
 it('qualifies pengci by exact main three-kind, never an assist triple or a full house',()=>{
  for(const [ranks,yes] of [[[9,9,9],true],[[9,9,9,13,13],false],[[13],false]] as const){const t=score(cards(ranks),['pengci']);expect(t.events.some(e=>e.sourceDefinitionId==='pengci')).toBe(yes);}
  const ids=[...main,...support,'clubs-12','diamonds-7'],next=send(fixture(ids,['pengci']),{type:'PlayAssistedHand',selectedIds:main,assistIds:[...support,'clubs-12']});expect(own(next,'pengci')).toEqual([]);round(next);
 });
 it('a03 uses the first active scoring card, repeats on retrigger and ignores pair/high-card',()=>{
  const c=cards([9,9,9,13,13]),t=score(c,['a03','a11'],null,{disabledIds:[c[0].id]});
  const events=t.events.filter(e=>e.sourceDefinitionId==='a03');expect(events).toHaveLength(2);expect(events.map(e=>[e.targetCardId,e.value,e.retriggerDepth])).toEqual([[c[1].id,{n:'15',d:'1'},0],[c[1].id,{n:'15',d:'1'},1]]);
  for(const ranks of [[9,9],[13]])expect(score(cards(ranks),['a03']).events.some(e=>e.sourceDefinitionId==='a03')).toBe(false);
 });
 it.each([null,'pair','high-card','three-kind','two-pair'] as const)('a05 grows once only after consecutive same qualified type, previous=%s',previous=>{
  const j=r2CreateJoker('a05','a05',4);j.growth.heat={n:'12',d:'1'};
  const t=score(cards([9,9,13,13]),['a05'],previous,{jokers:[j]});
  expect(t.events.find(e=>e.operation==='read-growth')?.value).toEqual({n:'12',d:'1'});
  expect(t.events.filter(e=>e.operation==='add-growth')).toHaveLength(previous==='two-pair'?1:0);
  expect(t.jokers[0].growth.heat).toEqual({n:previous==='two-pair'?'18':'12',d:'1'});
  const next=score(cards([13]),[], 'two-pair',{jokers:t.jokers});expect(next.events.find(e=>e.operation==='read-growth')?.value).toEqual(t.jokers[0].growth.heat);expect(next.events.some(e=>e.operation==='add-growth')).toBe(false);
 });
 it('a05 caps at90 after one afterHand even with repeated card scoring',()=>{
  const j=r2CreateJoker('a05','a05',4);j.growth.heat={n:'88',d:'1'};
  const t=score(cards([9,9,9,13,13]),[], 'full-house',{jokers:[j,r2CreateJoker('a11','a11',4)]});expect(t.events.filter(e=>e.operation==='add-growth')).toHaveLength(1);expect(t.events.find(e=>e.operation==='add-growth')?.value).toEqual({n:'2',d:'1'});expect(t.jokers[0].growth.heat).toEqual({n:'90',d:'1'});
 });
 it.each([null,'pair','high-card','two-pair','straight'] as const)('a06 requires both qualified and different; previous=%s',previous=>{
  expect(score(cards([9,9,13,13]),['a06'],previous).events.some(e=>e.sourceDefinitionId==='a06')).toBe(previous==='straight');
 });
 it('ordinary straight/flush C11 still x1.75 alongside a06 x1.5',()=>{
  const t=score(cards([2,4,7,10,13],true),['a06','c11'],'straight');expect(t.events.filter(e=>e.operation==='multiply-multiplier').map(e=>[e.sourceDefinitionId,e.value])).toEqual([['a06',{n:'3',d:'2'}],['c11',{n:'7',d:'4'}]]);
  expect(score(cards([5,6,7,8,9],true),['c11'],'straight').events.some(e=>e.sourceDefinitionId==='c11')).toBe(false);
 });
 it('a10 filters support, small held cards and disabled faces before taking first valid face',()=>{
  const ids=[...main,'clubs-2',...support,'hearts-11'],s=fixture(ids,['a10']);
  const ordinary=send(s,{type:'PlayHand',selectedIds:main}),assisted=send(s,{type:'PlayAssistedHand',selectedIds:main,assistIds:support});
  expect(own(ordinary,'a10').map(e=>e.targetCardId)).toEqual([support[0]]);expect(own(assisted,'a10').map(e=>e.targetCardId)).toEqual(['hearts-11']);expect(own(assisted,'a10')[0]).toMatchObject({phase:'onHeldCard',operation:'multiply-multiplier',value:{n:'5',d:'4'}});round(ordinary);round(assisted);
  const c=s.deckInstances.filter(c=>ids.includes(c.id));const t=score(c,[],null,{hand:ids.map(id=>c.find(c=>c.id===id)!),selectedIds:main,disabledIds:support,jokers:s.jokers});expect(t.events.filter(e=>e.sourceDefinitionId==='a10').map(e=>e.targetCardId)).toEqual(['hearts-11']);
  const noFace=send(fixture(hand,['a10']),{type:'PlayAssistedHand',selectedIds:main,assistIds:support});expect(own(noFace,'a10')).toEqual([]);round(noFace);
 });
 it.each([false,true])('a11 full house flush=%s retriggers all active main once, never support',flush=>{
  const c=cards([9,9,9,13,13],flush),assist=cards([12,12]).map((c,i)=>({...c,id:'assist/'+i,enhancement:'encore-paper' as const}));
  const t=score(c,['a11'],null,{hand:[...c,...assist],assistIds:assist.map(c=>c.id),disabledIds:[c[0].id]});
  expect(t.events.filter(e=>e.sourceDefinitionId==='a11').map(e=>e.targetCardId)).toEqual(c.slice(1).map(c=>c.id));expect(t.events.some(e=>assist.some(c=>c.id===e.targetCardId))).toBe(false);expect(t.events.filter(e=>e.retriggerDepth===1&&e.sourceType==='card'&&e.sourceDefinitionId.startsWith('rank-')&&e.operation==='add-heat')).toHaveLength(4);
  expect(t.events.length).toBeLessThanOrEqual(SCORE_LIMITS.eventCount);expect(Math.max(...t.events.map(e=>e.retriggerDepth))).toBe(1);
 });
 it('a11 respects shared retrigger cap even with multiple legitimate requests',()=>{
  const c=cards([9,9,9,13,13]).map(c=>({...c,enhancement:'encore-paper' as const}));const t=score(c,['a11','d04','d11'],'full-house');
  for(const card of c)expect(t.events.filter(e=>e.sourceType==='card'&&e.sourceDefinitionId.startsWith('rank-')&&e.operation==='add-heat'&&e.retriggerDepth===1&&e.targetCardId===card.id).length).toBeLessThanOrEqual(4);
  expect(t.events.filter(e=>e.sourceDefinitionId==='a11')).toHaveLength(5);expect(t.events.every(e=>e.retriggerDepth<=1)).toBe(true);expect(SCORE_LIMITS).toMatchObject({extraRetriggers:4,retriggerDepth:1,eventCount:512});
 });
 it('a12 clear counts four main + two support as four and disqualifies a five-card main',()=>{
  const s=fixture(hand,['a12']);s.handLevels={'two-pair':30};const next=send(s,{type:'PlayAssistedHand',selectedIds:main,assistIds:support});expect(next.phase).toBe('stage-cleared');expect(next.stage!.maxPlayedCount).toBe(4);expect(own(next,'a12')).toHaveLength(1);expect(own(next,'a12')[0].value).toEqual({n:'3',d:'1'});round(next);
  const c=fixture(hand,['a12']);c.handLevels={'two-pair':30};const denied=send(c,{type:'PlayHand',selectedIds:[...main,'clubs-6']});expect(denied.phase).toBe('stage-cleared');expect(denied.stage!.maxPlayedCount).toBe(5);expect(own(denied,'a12')).toEqual([]);round(denied);
 });
 it('real commands preserve growth through save/retry receipt and retain old A03 behavior',()=>{
  const ids=['spades-9','hearts-9','clubs-9',...main.slice(2),...support,'diamonds-7'],s=fixture(ids,['a03','a05','a11']);s.handLevels={'full-house':30};
  const action:Action={type:'PlayAssistedHand',selectedIds:ids.slice(0,5),assistIds:support};const command={runId:s.runId,commandId:'real',expectedSeq:s.commandSeq,action},r=applyCommand(s,command);expect(r.ok).toBe(true);if(!r.ok)return;round(r.state);expect(applyCommand(r.state,command).state).toEqual(r.state);
  const old=send(fixture(hand,['a03'],false),{type:'PlayHand',selectedIds:[main[0]]});expect(own(old,'a03')[0]).toMatchObject({phase:'jokerScore',value:{n:'35',d:'1'}});round(old);
 });
 it('second same-type main grows exactly once across failed save, same candidate retry, reload and duplicate',async()=>{
  const nextMain=['spades-3','hearts-3','clubs-4','diamonds-4'],s=fixture(hand,['a05']);
  s.drawPile=[...s.drawPile.filter(id=>!nextMain.includes(id)),...nextMain.slice().reverse()];
  const first=send(s,{type:'PlayHand',selectedIds:main});expect(first.phase).toBe('await-input');expect(first.jokers[0].growth.heat).toBeUndefined();round(first);
  let fail=true,slots:SaveSlots={revision:1,current:makeCheckpoint(first,[]),previous:null};const candidates:unknown[]=[];
  const store:SaveStore={read:async()=>structuredClone(slots),commit:async(revision,current,previous)=>{candidates.push(structuredClone(current));if(fail)throw Error('injected-save-failure');expect(revision).toBe(slots.revision);slots={revision:revision+1,current:structuredClone(current),previous:structuredClone(previous)};return slots.revision;}};
  const run=SavedRun.restore(store,await store.read());expect(await run.dispatch({type:'PlayHand',selectedIds:nextMain})).toMatchObject({ok:false,code:'save-failed'});expect(run.state).toEqual(first);
  const pending=JSON.parse(run.exportJSON());expect(pending.state.jokers[0].growth.heat).toEqual({n:'6',d:'1'});expect(readCheckpoint(pending).ok).toBe(true);
  fail=false;expect((await run.retry()).ok).toBe(true);expect(candidates[1]).toEqual(candidates[0]);expect(run.state.jokers[0].growth.heat).toEqual({n:'6',d:'1'});
  const restored=SavedRun.restore(store,await store.read());expect(await restored.submit(pending.journal.at(-1))).toMatchObject({ok:true,duplicate:true});expect(restored.state).toEqual(run.state);
 });
 it('rejects old prototype identity and mixed seven-card trace definitions, values and qualifications',()=>{
  const next=send(fixture(hand,['a03']),{type:'PlayAssistedHand',selectedIds:main,assistIds:support}),cp=round(next);
  for(const change of [(s:any)=>s.contentHash='json-fnv-v1:79ddb0bb71434f9f',(s:any)=>s.lastTrace.events.find((e:any)=>e.sourceDefinitionId==='a03').visibleCondition={kind:'played-count',equals:1},(s:any)=>s.lastTrace.events.find((e:any)=>e.sourceDefinitionId==='a03').value={n:'35',d:'1'},(s:any)=>s.lastTrace.events.find((e:any)=>e.sourceDefinitionId==='a03').targetCardId=main[1]]){
   const corrupted=structuredClone(cp);change(corrupted.state);const {checksum,...payload}=corrupted;corrupted.checksum=stableHash(payload);expect(readCheckpoint(corrupted).ok).toBe(false);
  }
 });
 it('copy and public status resolve by exact profile with seven new templates and old72 unchanged',()=>{
  const s=fixture(hand),legacy=fixture(hand,[],false),handCards=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!);
  const facts=r2AssistFacts({hand:handCards,selectedIds:main,assistIds:support,disabledIds:[],jokers:[],definitions:r2JokerDefinitionsFor(s)}),ctx=publicJokerMemoryContext(s,{hand:handCards,facts,scoringLimited:false,deckSize:52,jokerSlots:5,jokerCount:1});
  for(const d of R2_PUBLISHED_JOKERS){const j=r2CreateJoker(d.id,d.id,4);expect(jokerAbilityCopyForRun(legacy,d.id,j,ctx)).toEqual(jokerMemoryAbility(d,j,ctx));const copy=jokerAbilityCopyForRun(s,d.id,j,ctx);expect(JSON.stringify(copy)).not.toMatch(/\{\w+\}|见完整规则/);if(!R2_ASSIST_ADAPTED_IDS.includes(d.id))expect(copy).toEqual(jokerMemoryAbility(d,j,ctx));}
  expect(jokerAbilityCopyForRun(s,'a03',undefined,ctx).condition).toContain('首张有效计分牌');expect(jokerAbilityCopyForRun(s,'a10',undefined,ctx).condition).toContain('×1.25');expect(jokerAbilityCopyForRun(s,'a12',undefined,ctx).condition).toContain('主手都不超过 4 张');
  expect(()=>jokerAbilityCopyForRun({...s,contentHash:'unknown'},'a03',undefined,ctx)).toThrow('incompatible-version');
  expect(validR2Condition({kind:'hand-type-relation',values:['two-pair'],relation:'same'},'onDiscard')).toBe(false);
 });
});
