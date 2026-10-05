import {describe,it,expect} from 'vitest';
import {createRun,applyCommand,type R2RunState,type Action,type Command} from '../src/domain/run';
import {r2CreateJoker,assertR2Invariants,r2ScoreContext} from '../src/domain/r2Run';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {R2_COMBO_GROWTH_JOKERS} from '../src/content/r2ComboGrowthJokers';
import {R2_ASSIST_HASH} from '../src/domain/r2Assist';
import {R2_COMBO_GROWTH_HASH,R2_COMBO_GROWTH_VERSION} from '../src/domain/r2ComboGrowth';
import {validateR2Content} from '../src/content/r2Schema';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {CHARACTER_IDS} from '../src/domain/characters';
import {scoreR2Hand} from '../src/domain/scoreR2';
import {r2HasQualifiedHand} from '../src/domain/r2SelectionFacts';
import {R2_PUBLISHED_CONTENT} from '../src/domain/r2PublishedContent';
import type {R2HandType} from '../src/domain/evaluateR2';
import {stableHash} from '../src/domain/hash';
const main=['spades-9','hearts-9','clubs-13','diamonds-13'];
const visible=[...main,'spades-12','hearts-12','clubs-6','diamonds-7'];
function cmd(s:R2RunState,action:Action):Command{return{runId:s.runId,commandId:`${s.runId}/${s.commandSeq+1}`,expectedSeq:s.commandSeq,action};}
function send(s:R2RunState,action:Action){const r=applyCommand(s,cmd(s,action));if(!r.ok)throw Error(JSON.stringify(r));return r.state;}
function start(characterId:typeof CHARACTER_IDS[number]='amo') {return createRun({seed:'combo-test',runId:`combo-${characterId}`,characterId,rulesVersion:'r2',r2Profile:'combo-growth-v1'});}
function fixture(ids=visible,jokers:string[]=['a06'],characterId:typeof CHARACTER_IDS[number]='amo'){
 let s=start(characterId);s.jokers=jokers.map((id,i)=>r2CreateJoker(id,`j/${i}`,8,undefined,s));
 s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});s.handOrder=[...ids];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id));
 if(ids.length>8){s.stage!.initialHandLimit=ids.length;s.stage!.handLimit=ids.length;}
 assertR2Invariants(s);return s;
}
function round(s:R2RunState,journal:Command[]=[]){const cp=makeCheckpoint(s,journal);expect(readCheckpoint(JSON.parse(JSON.stringify(cp)))).toEqual({ok:true,checkpoint:cp});return cp;}
function score(s:R2RunState,selectedIds=main,previousHandType:R2HandType|null=null){return scoreR2Hand({rulesVersion:'r2',runId:s.runId,rootId:'score',hand:s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!),selectedIds,disabledIds:[],jokers:s.jokers,definitions:r2JokerDefinitionsFor(s),handLevels:{},playIndex:previousHandType?2:1,handsBeforePlay:4,previousHandType,wager:false,rng:s.rng.rule,...r2ScoreContext(s,[],[])});}
describe('shared combo-growth first prototype',()=>{
 it('validates the overlay and freezes the existing identity',()=>{expect(validateR2Content(R2_COMBO_GROWTH_JOKERS)).toEqual([]);expect(R2_ASSIST_HASH).toBe('json-fnv-v1:843f02356211cb91');expect(R2_COMBO_GROWTH_HASH).not.toBe(R2_ASSIST_HASH);});
 it.each(CHARACTER_IDS)('creates and saves the same shared content for %s without foreign assist state',character=>{
  const s=fixture(visible,['a06','f10'],character);expect(s.contentVersion).toBe(R2_COMBO_GROWTH_VERSION);expect(r2JokerDefinitionsFor(s)).toBe(R2_COMBO_GROWTH_JOKERS);expect(Object.hasOwn(s.stage!,'assistUsed')).toBe(character==='amo');round(s);
  const next=send(s,{type:'PlayHand',selectedIds:main});round(next);expect(Object.hasOwn(next.lastTrace!,'assist')).toBe(character==='amo');
 });
 it('a06 reads initial coefficient, grows multiplicatively after different qualified adjacent hands, and does not grow again',()=>{
  const s=fixture();const t=score(s,main,'three-kind');expect(t.jokers[0].growth.coefficient).toEqual({n:'69',d:'40'});expect(t.jokers[0].counters).toEqual({alternationUsed:true});expect(t.events.find(e=>e.operation==='read-coefficient')?.value).toEqual({n:'3',d:'2'});
  s.jokers=structuredClone(t.jokers);expect(score(s,main,'three-kind').jokers).toEqual(s.jokers);expect(score(fixture(),main,'two-pair').jokers[0].growth.coefficient).toEqual({n:'3',d:'2'});expect(score(fixture(),main,'pair').jokers[0].counters).toEqual({alternationUsed:false});
 });
 it('persists adjacent-hand growth once, duplicate command, and next-stage reset without losing coefficient',()=>{
  let s=send(fixture(),{type:'PlayHand',selectedIds:main});
  const nextHand=['spades-2','hearts-2','clubs-2','diamonds-3','spades-4','hearts-6','clubs-8','diamonds-10'];
  s.handOrder=nextHand;s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!nextHand.includes(id)&&!s.playedPile.includes(id));
  const command=cmd(s,{type:'PlayHand',selectedIds:nextHand.slice(0,3)}),result=applyCommand(s,command);expect(result.ok).toBe(true);if(!result.ok)throw Error(result.code);s=result.state;
  expect(s.phase).toBe('stage-cleared');expect(s.jokers[0].growth.coefficient).toEqual({n:'69',d:'40'});round(s,[command]);expect(applyCommand(s,command).state).toEqual(s);
  s=send(send(send(s,{type:'OpenShop'}),{type:'LeaveShop'}),{type:'EnterStage'});expect(s.jokers[0].growth.coefficient).toEqual({n:'69',d:'40'});expect(s.jokers[0].counters).toEqual({alternationUsed:false});expect(s.stage!.previousHandType).toBeNull();round(s);
 });
 it('a06 growth survives scoring bans',()=>{const s=fixture();s.stage!.boss={definitionId:'B16',disabledSuit:null};const t=score(s,main,'three-kind');expect(t.events.some(e=>e.operation==='read-coefficient')).toBe(false);expect(t.jokers[0].growth.coefficient).toEqual({n:'69',d:'40'});});
 it('f10 only arms on a truly cold first discard and consumes next play even without a combo',()=>{
  const cold=['spades-2','hearts-4','clubs-6','diamonds-8','spades-10','hearts-12','clubs-14','diamonds-3'];let s=fixture(cold,['f10']);
  expect(r2HasQualifiedHand({hand:s.deckInstances.filter(c=>cold.includes(c.id)),jokers:s.jokers,definitions:r2JokerDefinitionsFor(s)})).toBe(false);
  const before=JSON.stringify(s);const bad=applyCommand(s,cmd(s,{type:'DiscardHand',selectedIds:['missing']}));expect(bad.ok).toBe(false);expect(JSON.stringify(s)).toBe(before);
  s=send(s,{type:'DiscardHand',selectedIds:[cold[0]]});expect(s.jokers[0].counters).toEqual({rescueArmed:true});round(s);
  s=send(s,{type:'PlayHand',selectedIds:[s.handOrder[0]]});expect(s.jokers[0].counters).toEqual({rescueArmed:false});expect(s.lastTrace!.events.filter(e=>e.operation==='consume-rescue')).toHaveLength(1);round(s);
  expect(send(fixture(visible,['f10']),{type:'DiscardHand',selectedIds:[visible[7]]}).jokers[0].counters).toEqual({rescueArmed:false});
 });
 it('d12 pays actual pre-refill held cards and e04 uses common reward-before capital',()=>{
  const s=fixture(visible,['d12','e04','e01','b04']);s.gold=30;
  const next=send(s,{type:'PlayHand',selectedIds:main});expect(next.phase).toBe('stage-cleared');
  expect(next.lastTrace!.events.find(e=>e.operation==='add-gold-per-held')?.value).toEqual({n:'4',d:'1'});expect(next.lastTrace!.events.find(e=>e.operation==='add-gold-per-capital')).toMatchObject({value:{n:'3',d:'1'},goldBeforeRewards:30});round(next);
  const assisted=send(s,{type:'PlayAssistedHand',selectedIds:main,assistIds:visible.slice(4,6)});expect(assisted.lastTrace!.events.some(e=>e.operation==='add-gold-per-held')).toBe(false);round(assisted);
 });
 it('rejects combo instance fields after retagging as a frozen identity',()=>{const s=fixture();const cp=round(s),bad=structuredClone(cp);bad.state.contentVersion=R2_PUBLISHED_CONTENT.v11.version;bad.state.contentHash=R2_PUBLISHED_CONTENT.v11.hash;const {checksum,...payload}=bad;bad.checksum=stableHash(payload);expect(readCheckpoint(bad).ok).toBe(false);});
});
