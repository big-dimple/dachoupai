import {describe,it,expect} from 'vitest';
import {createRun,applyCommand,type Action,type R2RunState,type Command} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {scoreR2Hand,type ScoreInput} from '../src/domain/scoreR2';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {R2_GROUP_UPGRADE_JOKERS} from '../src/content/r2GroupUpgradeJokers';
import {R2_GROUP_UPGRADE_HASH,R2_GROUP_UPGRADE_VERSION} from '../src/domain/r2GroupUpgrade';
import {R2_COMBO_GROWTH_HASH,R2_COMBO_GROWTH_VERSION} from '../src/domain/r2ComboGrowth';
import {R2_ASSIST_HASH} from '../src/domain/r2Assist';
import {R2_GROUP_HAND_TYPES} from '../src/domain/r2GroupHands';
import {validateR2Content,type R2JokerInstance} from '../src/content/r2Schema';
import {R2_ECONOMY,r2Price,r2Pool} from '../src/domain/r2Shop';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {stableHash} from '../src/domain/hash';
import {CHARACTER_IDS} from '../src/domain/characters';
import type {PlayingCard} from '../src/cards/types';
import v10 from './fixtures/r2-v10-amo-checkpoints.json';
import v11 from './fixtures/r2-v11-amo-checkpoints.json';
import frozen843f from './fixtures/r2-843f-amo-checkpoints.json';
import frozenE7d from './fixtures/r2-e7d-group-checkpoints.json';
const identity={contentVersion:R2_GROUP_UPGRADE_VERSION,contentHash:R2_GROUP_UPGRADE_HASH};
const cards=(ranks:number[]):PlayingCard[]=>ranks.map((rank,i)=>({id:`p/${i}`,rank:rank as PlayingCard['rank'],suit:(['spades','hearts','clubs','diamonds'] as const)[i%4]}));
const joker=(id:string)=>r2CreateJoker(id,id,0,undefined,identity);
function score(ranks:number[],jokers:R2JokerInstance[]=[joker('b06')],extra:Partial<ScoreInput>={}){const hand=cards(ranks);return scoreR2Hand({rulesVersion:'r2',runId:'group',rootId:'group/score',hand,selectedIds:hand.map(c=>c.id),disabledIds:[],jokers,definitions:R2_GROUP_UPGRADE_JOKERS,characterId:'neutral',handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:{algorithm:'fnv1a-mulberry32-v1',state:41},...extra});}
const main=['spades-9','hearts-9','clubs-13','diamonds-13'];
function send(s:R2RunState,action:Action){const command={runId:s.runId,commandId:`${s.commandSeq+1}`,expectedSeq:s.commandSeq,action};const r=applyCommand(s,command);if(!r.ok)throw Error(r.code);makeCheckpoint(r.state,[command]);return r.state;}
function fixture(ids=['b03','b06','b08','b10']){let s=createRun({seed:'group-stage',runId:'group-stage',characterId:'amo',rulesVersion:'r2',r2Profile:'group-upgrade-v1'});s.jokers=ids.map(joker);s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});s.handOrder=[...main,'clubs-9','spades-12','hearts-12','diamonds-7'];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id));return s;}
function mutated(s:R2RunState,change:(s:any)=>void){const cp=makeCheckpoint(s,[]),bad=structuredClone(cp);change(bad.state);const {checksum,...rest}=bad;return readCheckpoint({...rest,checksum:stableHash(rest)});}
describe('group upgrade first source checkpoint',()=>{
 it('validates only four overrides, preserves e7d/843f identities and full old replay',()=>{
  expect(validateR2Content(R2_GROUP_UPGRADE_JOKERS)).toEqual([]);expect(R2_COMBO_GROWTH_HASH).toBe('json-fnv-v1:e7d21fce68b80072');expect(R2_ASSIST_HASH).toBe('json-fnv-v1:843f02356211cb91');
  const prior=r2JokerDefinitionsFor({contentVersion:R2_COMBO_GROWTH_VERSION,contentHash:R2_COMBO_GROWTH_HASH});for(const d of prior)if(!['b03','b06','b08','b10'].includes(d.id))expect(R2_GROUP_UPGRADE_JOKERS.find(v=>v.id===d.id)).toBe(d);
  for(const old of [v10,v11,frozen843f,frozenE7d]){const before=readCheckpoint(old.before),after=readCheckpoint(old.after);expect(before.ok&&after.ok).toBe(true);if(!before.ok||!after.ok)throw Error('old fixture');const r=applyCommand(before.checkpoint.state,old.command as Command);expect(r.ok).toBe(true);expect(r.state).toEqual(after.checkpoint.state);expect(makeCheckpoint(r.state,[old.command as Command])).toEqual(after.checkpoint);}
 });
 it.each(CHARACTER_IDS)('creates explicit shared %s identity with strict inherited save fields',characterId=>{const s=createRun({seed:'group',runId:'group/'+characterId,characterId,rulesVersion:'r2',r2Profile:'group-upgrade-v1'});expect(s.contentHash).toBe(R2_GROUP_UPGRADE_HASH);expect(readCheckpoint(makeCheckpoint(send(send(s,{type:'LeaveShop'}),{type:'EnterStage'}),[])).ok).toBe(true);});
 it.each([[ [9,9],'142'],[[9,9,13,13],'242'],[[9,9,9],'432'],[[9,9,9,13,13],'1420'],[[9,9,9,9],'2744']] as const)('independently verifies bare Lv1 b06 golden %j → %s',(ranks,expected)=>{expect(score([...ranks]).finalScore).toBe(expected);});
 it('growth follows grouped upgrades, reads old value, carries across straight/high-card and obeys cap',()=>{
  let owned=[joker('b03'),joker('b10')];const paths=[[9,9],[9,9,13,13],[9,9,9],[9,9,9,13,13],[9,9,9,9]];
  for(const [i,ranks] of paths.entries()){const t=score(ranks,owned);expect(t.events.find(e=>e.sourceDefinitionId==='b03'&&e.operation==='read-growth')?.value).toEqual(owned[0].growth.multiplier??{n:'0',d:'1'});expect(t.jokers[0].growth.multiplier).toEqual([{n:'1',d:'4'},{n:'1',d:'2'},{n:'3',d:'4'},{n:'1',d:'1'},{n:'5',d:'4'}][i]);expect(t.jokers[1].growth.heat).toEqual({n:String((i+1)*10),d:'1'});owned=t.jokers;
   for(const ungrouped of [[2,3,4,5,6],[2,4,6]]){const p=score(ungrouped,owned);expect(p.jokers).toEqual(owned);expect(p.events.filter(e=>e.operation==='add-growth')).toEqual([]);}
  }
  owned=structuredClone(owned);owned[0].growth.multiplier={n:'3',d:'1'};owned[1].growth.heat={n:'100',d:'1'};const capped=score([9,9],owned);expect(capped.jokers).toEqual(owned);expect(capped.events.filter(e=>e.operation==='add-growth').every(e=>e.value.n==='0')).toBe(true);
 });
 it('selects ties by original left order, includes disabled in selection, ignores accompanying and held/assist',()=>{
  expect(score([9,9,13,13]).events.filter(e=>e.sourceDefinitionId==='b06').map(e=>e.targetCardId)).toEqual(['p/0','p/1']);
  expect(score([9,13,13,9]).events.filter(e=>e.sourceDefinitionId==='b06').map(e=>e.targetCardId)).toEqual(['p/0','p/3']);
  expect(score([9,9,13,13],undefined,{disabledIds:['p/0','p/1']}).events.some(e=>e.sourceDefinitionId==='b06')).toBe(false);
  expect(score([9,9,13,13],undefined,{disabledIds:['p/0']}).events.filter(e=>e.sourceDefinitionId==='b06').map(e=>e.targetCardId)).toEqual(['p/1']);
  expect(score([9,9,13]).events.filter(e=>e.sourceDefinitionId==='b06').map(e=>e.targetCardId)).toEqual(['p/0','p/1']);
  const h=cards([9,9,13,13,12,12,12]);expect(score([],[joker('b06')],{hand:h,selectedIds:h.slice(0,4).map(c=>c.id),assistIds:h.slice(4).map(c=>c.id),characterId:'amo',amoScoreTiming:'assist-v1'}).events.filter(e=>e.sourceDefinitionId==='b06').map(e=>e.targetCardId)).toEqual(['p/0','p/1']);
 });
 it('does not qualify a plain flush even with repeated points',()=>{const hand=cards([9,9,2,4,6]).map(c=>({...c,suit:'spades' as const}));const t=score([], [joker('b03'),joker('b06'),joker('b10')],{hand,selectedIds:hand.map(c=>c.id)});expect(t.handType).toBe('flush');expect(t.events.some(e=>e.operation==='add-growth'||e.sourceDefinitionId==='b06')).toBe(false);expect(R2_GROUP_HAND_TYPES).not.toContain(t.handType);});
 it('a11 full-house five and b06 largest three stack without repeating growth, respect scoring ban',()=>{
  const t=score([9,9,9,13,13],[joker('a11'),joker('b06'),joker('b03'),joker('b10')]);expect(t.events.filter(e=>e.sourceDefinitionId==='a11'&&e.operation==='retrigger-card')).toHaveLength(5);expect(t.events.filter(e=>e.sourceDefinitionId==='b06'&&e.operation==='retrigger-card')).toHaveLength(3);expect(t.events.filter(e=>e.operation==='add-growth')).toHaveLength(2);
  const banned=score([9,9,9,13,13],[joker('b03'),joker('b06'),joker('b10')],{boss:{definitionId:'B15',disabledSuit:null},sealedJokerIds:['b03','b06','b10'],playIndex:4});expect(banned.events.some(e=>e.phase==='jokerScore'||e.sourceDefinitionId==='b06')).toBe(false);expect(banned.events.filter(e=>e.operation==='add-growth')).toHaveLength(2);
 });
 it('b10 has profile-specific common price/weight and published price remains 6',()=>{expect(r2Price('b10',undefined,identity)).toBe(4);for(const id of [{contentVersion:R2_COMBO_GROWTH_VERSION,contentHash:R2_COMBO_GROWTH_HASH},v10.before.state,v11.before.state,frozen843f.before.state])expect(r2Price('b10',undefined,id)).toBe(6);const d=r2Pool([],[],identity).find(d=>d.id==='b10')!;expect(d.rarity).toBe('common');expect(R2_ECONOMY.weights[d.rarity]).toBe(5);expect(r2Pool([],[],identity).filter(d=>d.rarity==='rare').some(d=>d.id==='b10')).toBe(false);});
 it('saves actual group clear income/growth/targets and rejects missing reward or growth and wrong target',()=>{
  const before=fixture(),after=send(before,{type:'PlayHand',selectedIds:[...main,'clubs-9']});expect(after.phase).toBe('stage-cleared');expect(after.lastTrace!.events.find(e=>e.sourceDefinitionId==='b08')?.value).toEqual({n:'3',d:'1'});expect(readCheckpoint(makeCheckpoint(after,[])).ok).toBe(true);
  for(const id of ['b03','b06','b08','b10'])expect(mutated(after,s=>{s.lastTrace.events=s.lastTrace.events.filter((e:any)=>!(e.sourceDefinitionId===id&&['add-growth','add-gold','retrigger-card'].includes(e.operation)));}).ok).toBe(false);
  expect(mutated(after,s=>{s.lastTrace.events.find((e:any)=>e.sourceDefinitionId==='b06').targetCardId=main[2];}).ok).toBe(false);
  expect(mutated(after,s=>{s.jokers.find((j:any)=>j.definitionId==='b03').growth.multiplier={n:'3',d:'1'};}).ok).toBe(false);
  expect(mutated(after,s=>{s.contentVersion=R2_COMBO_GROWTH_VERSION;s.contentHash=R2_COMBO_GROWTH_HASH;}).ok).toBe(false);
 });
});
