import {describe,it,expect} from 'vitest';
import {createRun,applyCommand,type Action,type R2RunState,type Command} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {makeCheckpoint,readCheckpoint,type Checkpoint} from '../src/application/checkpoint';
import {stableHash} from '../src/domain/hash';
import {R2_ASSIST_HASH} from '../src/domain/r2Assist';
import {R2_EDITIONS} from '../src/content/r2Tools';
import type {Edition} from '../src/cards/types';
import type {ScoreEvent} from '../src/domain/scoreR2';
import v10 from './fixtures/r2-v10-amo-checkpoints.json';
import v11 from './fixtures/r2-v11-amo-checkpoints.json';

const main=['spades-9','hearts-9','clubs-13','diamonds-13'],assist=['spades-12','hearts-12'];
function send(s:R2RunState,action:Action){const r=applyCommand(s,{runId:s.runId,commandId:'edition/'+s.commandSeq,expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;}
function fixture(edition?:Edition,ownHook=true,cardEdition=false,id='a03'){
 let s=createRun({seed:'edition-save',runId:'edition-save',characterId:'amo',rulesVersion:'r2',r2Profile:'amo-assist-v1'});
 s.jokers=[r2CreateJoker(id,id,4,edition)];s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});
 s.handOrder=[...main,...assist,'clubs-6','diamonds-7'];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id));
 if(cardEdition)s.deckInstances.find(c=>c.id===main[0])!.edition='foil';
 s=send(s,ownHook?{type:'PlayAssistedHand',selectedIds:main,assistIds:assist}:{type:'PlayHand',selectedIds:[main[0]]});return makeCheckpoint(s,[]);
}
function changed(cp:Checkpoint,mutate:(events:ScoreEvent[])=>void){const copy=structuredClone(cp);mutate(copy.state.lastTrace!.events as ScoreEvent[]);const {checksum,...payload}=copy;copy.checksum=stableHash(payload);return readCheckpoint(copy);}
const body=(events:ScoreEvent[])=>events.find(e=>e.sourceType==='joker'&&e.sourceDefinitionId==='a03'&&!e.reasonKey.startsWith('edition.'))!;
const edition=(events:ScoreEvent[])=>events.find(e=>e.sourceType==='joker'&&e.reasonKey.startsWith('edition.'))!;

describe('prototype edition exception binds to the actual saved source',()=>{
 it.each(['target','value'] as const)('rejects bad body %s both with and without a fake edition reason',field=>{
  const cp=fixture(),corrupt=(e:ScoreEvent)=>{if(field==='target')e.targetCardId=main[1];else e.value={n:'35',d:'1'};};
  expect(changed(cp,events=>corrupt(body(events))).ok).toBe(false);
  expect(changed(cp,events=>{const e=body(events);corrupt(e);e.reasonKey='edition.foil.add-heat';}).ok).toBe(false);
 });
 it.each([undefined,'none'] as const)('rejects prefix-only forgery for actual edition %s',id=>{
  expect(changed(fixture(id),events=>{body(events).reasonKey='edition.foil.add-heat';}).ok).toBe(false);
 });
 it.each([
  ['target',(e:ScoreEvent)=>{e.targetCardId=main[1];}],
  ['value',(e:ScoreEvent)=>{e.value={n:'35',d:'1'};}],
  ['phase',(e:ScoreEvent)=>{e.phase='onCardScore';}],
  ['operation',(e:ScoreEvent)=>{e.operation='add-multiplier';}],
  ['condition',(e:ScoreEvent)=>{e.visibleCondition={kind:'played-count',equals:1};}],
  ['depth',(e:ScoreEvent)=>{e.retriggerDepth=1;}],
  ['wrong edition',(e:ScoreEvent)=>{e.reasonKey='edition.holographic.add-heat';}],
  ['delta',(e:ScoreEvent)=>{e.after.H={n:'999',d:'1'};}],
  ['root',(e:ScoreEvent)=>{e.rootEventId=e.rootId+'/event/0';}],
  ['resource metadata',(e:ScoreEvent)=>{e.resourceBefore=0;e.resourceAfter=1;}],
 ] as const)('rejects a real foil event with illegal %s',(_,mutate)=>{
  expect(changed(fixture('foil'),events=>mutate(edition(events))).ok).toBe(false);
 });
 it('rejects duplicate or missing edition emissions and edition before its own whole-hand hook',()=>{
  const cp=fixture('foil');
  expect(changed(cp,events=>{const copy=structuredClone(edition(events));copy.eventId+='-duplicate';copy.rootEventId=copy.eventId;events.splice(events.indexOf(edition(events))+1,0,copy);}).ok).toBe(false);
  expect(changed(cp,events=>{events.splice(events.indexOf(edition(events)),1);}).ok).toBe(false);
  expect(changed(fixture('foil',true,false,'a05'),events=>{const ed=edition(events),read=events.find(e=>e.operation==='read-growth')!,i=events.indexOf(ed),j=events.indexOf(read);[events[i],events[j]]=[events[j],events[i]];}).ok).toBe(false);
 });
 it.each(['foil','holographic','polychrome'] as const)('accepts actual %s editions whether or not own card hook qualifies',id=>{
  for(const ownHook of [false,true]){const cp=fixture(id,ownHook),read=readCheckpoint(structuredClone(cp));expect(read).toEqual({ok:true,checkpoint:cp});const events=cp.state.lastTrace!.events,ed=edition([...events]),effect=R2_EDITIONS.find(d=>d.id===id)!.effect!;expect(ed).toMatchObject({phase:'jokerScore',operation:effect.kind,value:effect.value,retriggerDepth:0,visibleCondition:{kind:'always'}});expect(ed.targetCardId).toBeUndefined();expect(events.filter(e=>e.sourceType==='joker'&&!e.reasonKey.startsWith('edition.')).length).toBe(ownHook?1:0);}
 });
 it('accepts card foil independently and keeps published fixtures and current prototype hash unchanged',()=>{
  const cp=fixture(undefined,true,true);expect(readCheckpoint(cp)).toEqual({ok:true,checkpoint:cp});
  expect(R2_ASSIST_HASH).toBe('json-fnv-v1:843f02356211cb91');
  for(const frozen of [v10,v11]){const before=readCheckpoint(frozen.before),after=readCheckpoint(frozen.after);expect(before.ok&&after.ok).toBe(true);if(!before.ok||!after.ok)throw Error('published fixture');const result=applyCommand(before.checkpoint.state,frozen.command as Command);expect(result.ok).toBe(true);expect(result.state).toEqual(after.checkpoint.state);expect(makeCheckpoint(result.state,[frozen.command as Command])).toEqual(after.checkpoint);}
 });
});
