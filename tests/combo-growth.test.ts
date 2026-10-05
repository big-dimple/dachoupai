import {SeededRng} from '../src/core/SeededRng';
import {r2Pool} from '../src/domain/r2Shop';
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
import {Rational} from '../src/domain/rational';
import {jokerMemoryAbility,publicJokerMemoryContext} from '../src/game/JokerMemory';
import v10 from './fixtures/r2-v10-amo-checkpoints.json';
import v11 from './fixtures/r2-v11-amo-checkpoints.json';
import frozen843f from './fixtures/r2-843f-amo-checkpoints.json';
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
function resealed(cp:unknown,change:(bad:any)=>void){const bad=structuredClone(cp);change(bad);const {checksum,...payload}=bad as any;return readCheckpoint({...payload,checksum:stableHash(payload)});}
function score(s:R2RunState,selectedIds=main,previousHandType:R2HandType|null=null){return scoreR2Hand({rulesVersion:'r2',runId:s.runId,rootId:'score',hand:s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!),selectedIds,disabledIds:[],jokers:s.jokers,definitions:r2JokerDefinitionsFor(s),handLevels:{},playIndex:previousHandType?2:1,handsBeforePlay:4,previousHandType,wager:false,rng:s.rng.rule,...r2ScoreContext(s,[],[])});}
describe('shared combo-growth first prototype',()=>{
 it('validates the overlay and freezes the existing identity',()=>{expect(validateR2Content(R2_COMBO_GROWTH_JOKERS)).toEqual([]);expect(R2_ASSIST_HASH).toBe('json-fnv-v1:843f02356211cb91');expect(R2_COMBO_GROWTH_HASH).not.toBe(R2_ASSIST_HASH);});
 it.each([v10,v11,frozen843f])('replays an actual frozen identity including state, RNG, receipts, journal and checksum',frozen=>{
  const before=readCheckpoint(frozen.before),after=readCheckpoint(frozen.after);expect(before.ok&&after.ok).toBe(true);if(!before.ok||!after.ok)throw Error('frozen save rejected');
  const result=applyCommand(before.checkpoint.state,frozen.command as Command);expect(result.ok).toBe(true);expect(result.state).toEqual(after.checkpoint.state);expect(makeCheckpoint(result.state,[frozen.command as Command])).toEqual(after.checkpoint);
 });
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
 it.each(['a06','f10'])('S06 reward creates current-profile %s, saves and continues',id=>{
  let s=start();s.gold=20;s.consumables=[{instanceId:'tool/S06',definitionId:'S06'}];
  const pool=r2Pool([],[],s).filter(d=>d.rarity==='rare');
  let found=false;for(let cursor=0;cursor<256;cursor++){const rng=SeededRng.restore({algorithm:'fnv1a-mulberry32-v1',state:cursor});if(pool[rng.integer(0,pool.length-1)].id===id){s.rng.reward={algorithm:'fnv1a-mulberry32-v1',state:cursor};found=true;break;}}
  expect(found).toBe(true);const command=cmd(s,{type:'UseConsumable',instanceId:'tool/S06',targetIds:[]}),r=applyCommand(s,command);expect(r.ok).toBe(true);if(!r.ok)throw Error(r.code);s=r.state;
  expect(s.gold).toBe(0);expect(s.jokers[0]).toMatchObject({definitionId:id,paidPrice:0,...(id==='a06'?{growth:{coefficient:{n:'3',d:'2'}},counters:{alternationUsed:false}}:{growth:{},counters:{rescueArmed:false}})});round(s,[command]);
  s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});round(s);round(send(s,{type:'PlayHand',selectedIds:[s.handOrder[0]]}));
 });
 it.each(['d12','e04'])('rejects a missing mandatory %s clear reward even after checksum resealing',id=>{
  const s=fixture(visible,['d12','e04','e01','b04']);s.gold=30;
  const cp=round(send(s,{type:'PlayHand',selectedIds:main})),bad=JSON.parse(JSON.stringify(cp));
  bad.state.lastTrace.events=bad.state.lastTrace.events.filter((e:any)=>!(e.sourceDefinitionId===id&&e.phase==='onStageClear'));
  const {checksum,...payload}=bad;bad.checksum=stableHash(payload);expect(readCheckpoint(bad).ok).toBe(false);
 });
 it('rejects a live coefficient that diverges from the saved actual trace',()=>{
  const cp=round(send(fixture(),{type:'PlayHand',selectedIds:main})),bad=JSON.parse(JSON.stringify(cp));bad.state.jokers[0].growth.coefficient={n:'99',d:'1'};
  const {checksum,...payload}=bad;bad.checksum=stableHash(payload);expect(readCheckpoint(bad).ok).toBe(false);
 });
 it('rejects combo instance fields after retagging as a frozen identity',()=>{const s=fixture();const cp=round(s),bad=structuredClone(cp);bad.state.contentVersion=R2_PUBLISHED_CONTENT.v11.version;bad.state.contentHash=R2_PUBLISHED_CONTENT.v11.hash;const {checksum,...payload}=bad;bad.checksum=stableHash(payload);expect(readCheckpoint(bad).ok).toBe(false);});
 it.each([v10,v11])('rejects a new discard condition in an old real score trace',frozen=>{
  expect(readCheckpoint(frozen.after).ok).toBe(true);
  expect(resealed(frozen.after,bad=>{bad.state.lastTrace.events[0].visibleCondition={kind:'cold-opening-discard'};})).toEqual({ok:false,code:'invalid-save-visible-condition'});
 });
 it('binds armed rescue to the first public discard snapshot, before and after a reload',()=>{
  const warm=round(send(fixture(visible,['f10']),{type:'DiscardHand',selectedIds:[visible[7]]}));
  expect(resealed(warm,bad=>{bad.state.jokers[0].counters.rescueArmed=true;})).toEqual({ok:false,code:'Run invariant: armed rescue stage'});
  expect(resealed(warm,bad=>{delete bad.state.stage.openingDiscard;}).ok).toBe(false);
  const cold=['spades-2','hearts-4','clubs-6','diamonds-8','spades-10','hearts-12','clubs-14','diamonds-3'];
  const armed=round(send(fixture(cold,['f10']),{type:'DiscardHand',selectedIds:[cold[0]]}));
  expect(resealed(armed,bad=>{bad.state.jokers[0].counters.rescueArmed=false;})).toEqual({ok:false,code:'Run invariant: armed rescue stage'});
  const state=readCheckpoint(armed);if(!state.ok)throw Error(state.code);
  const consumed=round(send(state.checkpoint.state,{type:'PlayHand',selectedIds:[state.checkpoint.state.handOrder[0]]}));
  expect(resealed(consumed,bad=>{bad.state.lastTrace.sourceJokers[0].counters.rescueArmed=false;}).ok).toBe(false);
 });
 it.each(['a06','f10','d12','e04'])('rejects fabricated body and unowned edition ×1000 from %s',id=>{
  const cp=round(send(fixture(visible,[id]),{type:'PlayHand',selectedIds:main}));
  for(const claim of ['body','edition']){
   const read=resealed(cp,bad=>{const t=bad.state.lastTrace,index=t.events.findIndex((e:any)=>e.phase==='finalScore'),final=t.events[index],eventId=t.rootId+'/forged';t.events.splice(index,0,{...structuredClone(final),eventId,rootEventId:eventId,phase:'jokerScore',sourceType:'joker',sourceDefinitionId:id,sourceInstanceId:'j/0',operation:'multiply-multiplier',value:{n:'1000',d:'1'},before:final.before,after:{H:final.before.H,M:Rational.fromJSON(final.before.M).multiply(new Rational(1000n)).toJSON()},reasonKey:claim==='edition'?'edition.polychrome.multiply-multiplier':id+'.multiply-multiplier',visibleCondition:{kind:'always'}});});
   expect(read).toEqual({ok:false,code:claim==='edition'?'invalid-save-assist-joker-edition':'invalid-save-combo-body-operation'});
  }
 });
 it.each(['a06','f10','d12','e04'])('accepts all actual %s editions, rejects missing, duplicate and wrong edition claims',id=>{
  for(const edition of ['foil','holographic','polychrome'] as const){const s=fixture(visible,[id]);s.jokers[0].edition=edition;const cp=round(send(s,{type:'PlayHand',selectedIds:main}));
   expect(resealed(cp,bad=>{bad.state.lastTrace.events=bad.state.lastTrace.events.filter((e:any)=>!e.reasonKey.startsWith('edition.'));}).ok).toBe(false);
   expect(resealed(cp,bad=>{const es=bad.state.lastTrace.events,index=es.findIndex((e:any)=>e.reasonKey.startsWith('edition.')),copy=structuredClone(es[index]);copy.eventId+='/dup';copy.rootEventId=copy.eventId;es.splice(index+1,0,copy);}).ok).toBe(false);
   expect(resealed(cp,bad=>{bad.state.lastTrace.events.find((e:any)=>e.reasonKey.startsWith('edition.')).reasonKey='edition.none.multiply-multiplier';}).ok).toBe(false);
  }
 });
 it('rejects raised e04 event capital even if its own amount and resource delta agree',()=>{
  const s=fixture(visible,['b04','e04']);s.gold=30;const cp=round(send(s,{type:'PlayHand',selectedIds:main}));
  expect(resealed(cp,bad=>{const e=bad.state.lastTrace.events.find((e:any)=>e.operation==='add-gold-per-capital');e.goldBeforeRewards=60;e.value={n:'6',d:'1'};e.resourceAfter+=3;})).toEqual({ok:false,code:'invalid-save-combo-income-capital'});
  expect(resealed(cp,bad=>{bad.state.lastTrace.combo.goldBeforeRewards=60;const e=bad.state.lastTrace.events.find((e:any)=>e.operation==='add-gold-per-capital');e.goldBeforeRewards=60;e.value={n:'6',d:'1'};e.resourceAfter+=3;}).ok).toBe(false);
 });
 it('keeps saved growth bound after a clear and in the following shop; sale/rebuy starts a new instance',()=>{
  let s=fixture(visible,['a06','b04']);s=send(s,{type:'PlayHand',selectedIds:main});expect(s.phase).toBe('stage-cleared');
  for(const state of [s,send(s,{type:'OpenShop'})]){const cp=round(state);expect(resealed(cp,bad=>{bad.state.jokers[0].growth.coefficient={n:'1000000',d:'1'};})).toEqual({ok:false,code:'invalid-save-combo-live-state'});}
  s=send(send(s,{type:'OpenShop'}),{type:'SellJoker',instanceId:'j/0'});round(s);
 });
 it.each(['a06','f10'])('requires exact new %s counter keys and rejects the superseded WIP identity',id=>{
  const cp=round(fixture(visible,[id]));for(const counters of [undefined,{}, {alternationUsed:false,rescueArmed:false},{[id==='a06'?'alternationUsed':'rescueArmed']:0}])expect(resealed(cp,bad=>{if(counters===undefined)delete bad.state.jokers[0].counters;else bad.state.jokers[0].counters=counters;}).ok).toBe(false);
  expect(resealed(cp,bad=>{bad.state.contentHash='json-fnv-v1:82a7532298315dde';}).ok).toBe(false);
 });
 it('four-card player copy consumes real definitions and saved trace without mutating them',()=>{
  const s=fixture(visible,['a06','f10','d12','e04']);s.gold=30;const trace=score(s,main,'three-kind'),before=JSON.stringify({s,trace});
  for(const instance of trace.jokers){const definition=r2JokerDefinitionsFor(s).find(d=>d.id===instance.definitionId)!;const ctx=publicJokerMemoryContext(s,{hand:s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!),scoringLimited:false,deckSize:52,jokerSlots:5,jokerCount:4});const copy=jokerMemoryAbility(definition,instance,ctx,trace.events);expect(JSON.stringify(copy)).not.toMatch(/\{(?:factor|initial|cap|minimum|divisor)\}|见完整规则/);if(instance.definitionId==='a06')expect(copy.state).toContain('出牌结算后系数×1.15');}
  expect(JSON.stringify({s,trace})).toBe(before);
 });
});
