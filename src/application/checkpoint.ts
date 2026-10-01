import {assertR2Invariants,R2_CONTENT_HASH,R2_CONTENT_VERSION,R2_LIMITS,R2_TARGETS} from '../domain/r2Run';
import type {R2RunState,Command,Action} from '../domain/run';
import {CHARACTER_IDS} from '../domain/characters';
import {R2_HAND_TYPES} from '../domain/evaluateR2';
import {R2_JOKERS,validR2Condition} from '../content/r2Schema';
import {Rational,MAX_INTEGER_DIGITS} from '../domain/rational';
import {SCORE_LIMITS} from '../domain/scoreR2';
import {SeededRng} from '../core/SeededRng';
import {stableHash} from '../domain/hash';
import {R2_AVAILABLE_CHAPTERS,R2_BOSSES,R2_SKIP_CONSUMABLES} from '../domain/r2Chapter';
import {SUITS} from '../cards/types';

export const MAX_JOURNAL=256;
export const MAX_IMPORT_BYTES=16*1024*1024;
export interface Checkpoint {
  format:'dachoupai-checkpoint';formatVersion:1;state:R2RunState;
  journalBaseSeq:number;journal:Command[];checksum:string;
}
type ReadResult={ok:true;checkpoint:Checkpoint}|{ok:false;code:string};
const fail=(message:string):never=>{throw Error(message);};
function record(value:unknown,required:string[],optional:string[]=[]):Record<string,unknown> {
  if(!value||typeof value!=='object'||Array.isArray(value))return fail('invalid-save-object');
  const object=value as Record<string,unknown>;
  if(required.some(k=>!Object.hasOwn(object,k))||Object.keys(object).some(k=>![...required,...optional].includes(k)))return fail('invalid-save-fields');
  return object;
}
const integer=(value:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>{if(!Number.isSafeInteger(value)||(value as number)<min||(value as number)>max)fail('invalid-save-integer');};
const text=(value:unknown,max=16384)=>{if(typeof value!=='string'||!value.length||value.length>max)fail('invalid-save-text');};
const strings=(value:unknown,max=10000)=>{if(!Array.isArray(value)||value.length>max||value.some(v=>typeof v!=='string'||!v.length||v.length>16384))fail('invalid-save-ids');};
const array=(value:unknown,max:number)=>{if(!Array.isArray(value)||value.length>max)fail('invalid-save-array');return value as unknown[];};
const oneOf=(value:unknown,options:readonly unknown[])=>{if(!options.includes(value))fail('invalid-save-enum');};
const bool=(value:unknown)=>{if(typeof value!=='boolean')fail('invalid-save-boolean');};
function score(value:unknown):void {if(typeof value!=='string'||!/^(0|[1-9]\d*)$/.test(value)||value.length>MAX_INTEGER_DIGITS)fail('invalid-save-score');}
function fraction(value:unknown):void {const v=record(value,['n','d']);const number=Rational.fromJSON(v);if(number.n<0n||number.d<=0n)fail('invalid-save-fraction');}
function accumulator(value:unknown):void {const v=record(value,['H','M']);fraction(v.H);fraction(v.M);}
function cursor(value:unknown):void {const v=record(value,['algorithm','state']);SeededRng.restore(v as unknown as ReturnType<SeededRng['snapshot']>);}
function jokers(value:unknown):void {
  for(const item of array(value,R2_LIMITS.jokerSlots)){
    const j=record(item,['instanceId','definitionId','paidPrice','growth']);text(j.instanceId);integer(j.paidPrice);
    const definition=R2_JOKERS.find(d=>d.id===j.definitionId);if(!definition)fail('unknown-save-joker');
    const keys=definition!.hooks.flatMap(h=>h.operations.flatMap(o=>o.kind==='add-growth'?[o.key]:[]));
    const growth=record(j.growth,[],keys);Object.values(growth).forEach(fraction);
  }
}
function trace(value:unknown):void {
  if(value===null)return;
  const t=record(value,['rulesVersion','rootId','handType','level','sets','finalScore','accumulator','events','jokers','rng']);
  oneOf(t.rulesVersion,['r2']);text(t.rootId);oneOf(t.handType,R2_HAND_TYPES);integer(t.level,1,30);score(t.finalScore);accumulator(t.accumulator);cursor(t.rng);jokers(t.jokers);
  const sets=record(t.sets,['playedIds','scoringIds','activeScoringIds','heldIds']);Object.values(sets).forEach(v=>strings(v,14));
  const events=array(t.events,SCORE_LIMITS.eventCount);if(!events.length)fail('empty-save-trace');
  for(const item of events){
    const e=record(item,['eventId','rootId','rootEventId','phase','sourceType','sourceDefinitionId','sourceInstanceId','operation','value','before','after','reasonKey','visibleCondition','retriggerDepth'],['targetCardId']);
    for(const k of ['eventId','rootId','rootEventId','sourceDefinitionId','sourceInstanceId','reasonKey'])text(e[k]);
    if(e.rootId!==t.rootId)fail('invalid-save-trace-root');
    oneOf(e.phase,['base','onCardScore','onHeldCard','characterScore','jokerScore','finalScore','afterHand']);
    oneOf(e.sourceType,['rule','card','character','joker']);
    if(e.sourceType==='joker')oneOf(e.sourceDefinitionId,R2_JOKERS.map(d=>d.id));
    if(e.sourceType==='character')oneOf(e.sourceDefinitionId,CHARACTER_IDS);
    oneOf(e.operation,['base','add-heat','add-multiplier','multiply-multiplier','read-growth','add-growth','retrigger-card','retrigger-cap','final-score','add-heat-per-gold','add-heat-per-empty-slot','ordinary-points-suppressed']);
    fraction(e.value);accumulator(e.before);accumulator(e.after);integer(e.retriggerDepth,0,1);if(e.targetCardId!==undefined)text(e.targetCardId);
    if(!validR2Condition(e.visibleCondition))fail('invalid-save-visible-condition');
  }
}
function action(value:unknown):void {
  const a=record(value,['type'],['seed','characterId','rulesVersion','selectedIds','instanceId','targetIds','enabled','offerId','ids','handType']);
  const keys:Record<Action['type'],string[]>={StartRun:['seed','characterId','rulesVersion'],LeaveShop:[],EnterStage:[],OpenShop:[],RerollShop:[],AbandonRun:[],SkipStage:[],PlayHand:['selectedIds'],DiscardHand:['selectedIds'],SellJoker:['instanceId'],UseConsumable:['instanceId','targetIds'],DestroyConsumable:['instanceId'],SetWager:['enabled'],BuyOffer:['offerId'],ReorderHand:['ids'],ReorderJokers:['ids']};
  if(typeof a.type!=='string'||!Object.hasOwn(keys,a.type))fail('unknown-save-command');
  record(a,['type',...keys[a.type as Action['type']]],a.type==='UseConsumable'?['handType']:[]);
  if(a.handType!==undefined)oneOf(a.handType,R2_HAND_TYPES);
  if(a.type==='StartRun'){text(a.seed,4096);oneOf(a.characterId,CHARACTER_IDS);oneOf(a.rulesVersion,['r2']);}
  for(const k of ['selectedIds','targetIds','ids'])if(a[k]!==undefined)strings(a[k],14);
  for(const k of ['instanceId','offerId'])if(a[k]!==undefined)text(a[k]);
  if(a.enabled!==undefined)bool(a.enabled);
}
function safeTree(value:unknown):void {
  let nodes=0;
  const visit=(v:unknown,depth:number):void=>{
    if(++nodes>200000||depth>48)fail('save-size-limit');
    if(typeof v==='number'&&!Number.isFinite(v))fail('non-finite-save');
    if(v!==null&&typeof v==='object'){
      if(!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null)fail('non-json-save');
      for(const [k,child] of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))fail('unsafe-save-key');visit(child,depth+1);}
    } else if(!['string','number','boolean'].includes(typeof v)&&v!==null)fail('non-json-save');
  };visit(value,0);
}
function validateState(value:unknown):asserts value is R2RunState {
  // Diagnose old versions before changed fields; retaining/exporting raw saves remains explicit.
  if(value&&typeof value==='object'&&!Array.isArray(value)){const tags=value as Record<string,unknown>;if(tags.schemaVersion!==2||tags.rulesVersion!=='r2'||tags.contentVersion!==R2_CONTENT_VERSION||tags.contentHash!==R2_CONTENT_HASH)fail('incompatible-version');}
  const s=record(value,['schemaVersion','rulesVersion','contentVersion','contentHash','runId','seed','commandSeq','difficulty','characterId','chapter','stageIndex','phase','deckInstances','drawPile','handOrder','playedPile','discardPile','destroyedIds','stage','totalHeat','gold','jokers','consumables','longTermItems','program','boss','shop','rng','receipts','lastTrace','handLevels','outcome','seenBossIds','chapterSkipConsumable','purchaseCoupons']);
  if(s.schemaVersion!==2||s.rulesVersion!=='r2'||s.contentVersion!==R2_CONTENT_VERSION||s.contentHash!==R2_CONTENT_HASH)fail('incompatible-version');
  text(s.runId);text(s.seed,4096);integer(s.commandSeq,1);oneOf(s.difficulty,[0]);oneOf(s.characterId,CHARACTER_IDS);integer(s.chapter,1,R2_AVAILABLE_CHAPTERS);integer(s.stageIndex,0,R2_AVAILABLE_CHAPTERS*3);
  oneOf(s.phase,['shop','stage-ready','await-input','stage-cleared','run-won','run-lost']);
  for(const c of array(s.deckInstances,10000))record(c,['id','rank','suit'],['enhancement']);
  for(const k of ['drawPile','handOrder','playedPile','discardPile','destroyedIds','longTermItems'])strings(s[k]);
  score(s.totalHeat);integer(s.gold);jokers(s.jokers);
  for(const c of array(s.consumables,R2_LIMITS.consumableSlots)){const v=record(c,['instanceId','definitionId']);text(v.instanceId);text(v.definitionId);}
  oneOf(s.program,[null]);const boss=record(s.boss,['definitionId','disabledSuit']);oneOf(boss.definitionId,R2_BOSSES.map(b=>b.id));oneOf(boss.disabledSuit,[null,...SUITS]);strings(s.seenBossIds,R2_AVAILABLE_CHAPTERS);oneOf(s.chapterSkipConsumable,R2_SKIP_CONSUMABLES);integer(s.purchaseCoupons,0,R2_AVAILABLE_CHAPTERS);
  if(s.stage!==null){const t=record(s.stage,['index','targetHeat','heat','handsLeft','discardsLeft','playIndex','previousHandType','clearId','goldEarned','disabledIds','wagerSelected','wagerUsed','discardsUsed','skipResult']);
    integer(t.index,0,R2_AVAILABLE_CHAPTERS*3-1);score(t.targetHeat);score(t.heat);integer(t.handsLeft,0,R2_LIMITS.hands);integer(t.discardsLeft,0,R2_LIMITS.discards);integer(t.playIndex,0,R2_LIMITS.hands);integer(t.discardsUsed,0,R2_LIMITS.discards+1+R2_LIMITS.consumableSlots);integer(t.goldEarned);strings(t.disabledIds);bool(t.wagerSelected);bool(t.wagerUsed);oneOf(t.previousHandType,[null,...R2_HAND_TYPES]);if(t.clearId!==null)text(t.clearId);
    if(t.skipResult!==null){const r=record(t.skipResult,['kind'],['amount','definitionId']);oneOf(r.kind,['coupon','consumable','gold']);if(r.kind==='consumable'){record(r,['kind','definitionId']);oneOf(r.definitionId,R2_SKIP_CONSUMABLES);}else{record(r,['kind','amount']);oneOf(r.amount,r.kind==='coupon'?[2]:[1]);}}
  }
  if(s.shop!==null){const shop=record(s.shop,['visitIndex','rerollCount','offers']);integer(shop.visitIndex,0,R2_TARGETS.length*3-1);integer(shop.rerollCount);for(const o of array(shop.offers,3)){const v=record(o,['offerId','definitionId','price','consumed']);text(v.offerId);text(v.definitionId);integer(v.price);bool(v.consumed);}}
  const rng=record(s.rng,['deck','shop','rule','reward']);Object.values(rng).forEach(cursor);
  const receipts=array(s.receipts,100000);let seq=0;const ids=new Set();
  for(const r of receipts){const v=record(r,['commandId','fingerprint','seq']);text(v.commandId);text(v.fingerprint);integer(v.seq,1);if(v.seq!==++seq||ids.has(v.commandId))fail('invalid-save-receipts');ids.add(v.commandId);}
  if(seq!==s.commandSeq)fail('invalid-save-sequence');
  record(s.handLevels,[],[...R2_HAND_TYPES]);trace(s.lastTrace);
  if(s.outcome!==null){const o=record(s.outcome,['reason','stageIndex']);oneOf(o.reason,['graybox-complete','all-stages-cleared','hands-exhausted','no-legal-cards','abandoned']);integer(o.stageIndex,0,R2_AVAILABLE_CHAPTERS*3);}
  assertR2Invariants(value as unknown as R2RunState);
}
export function makeCheckpoint(state:R2RunState,journal:readonly Command[]):Checkpoint {
  safeTree(state);validateState(state);
  const kept=structuredClone(journal.slice(-MAX_JOURNAL)),payload={format:'dachoupai-checkpoint' as const,formatVersion:1 as const,state:structuredClone(state),journalBaseSeq:state.commandSeq-kept.length,journal:kept};
  const checkpoint={...payload,checksum:stableHash(payload)};
  const read=readCheckpoint(checkpoint);if(!read.ok)fail(read.code);return checkpoint;
}
export function readCheckpoint(value:unknown):ReadResult {
  try {
    safeTree(value);const c=record(value,['format','formatVersion','state','journalBaseSeq','journal','checksum']);
    if(c.format!=='dachoupai-checkpoint'||c.formatVersion!==1)fail('incompatible-save-format');
    validateState(c.state);integer(c.journalBaseSeq,1);text(c.checksum);
    const state=c.state as R2RunState,journal=array(c.journal,MAX_JOURNAL);let seq=c.journalBaseSeq as number;
    for(const item of journal){const command=record(item,['runId','commandId','expectedSeq','action']);text(command.commandId);if(command.runId!==state.runId||command.expectedSeq!==seq++)fail('invalid-save-journal');action(command.action);
      const receipt=state.receipts.find(r=>r.commandId===command.commandId);if(!receipt||receipt.seq!==seq||receipt.fingerprint!==stableHash(command))fail('invalid-save-command-receipt');
    }
    if(seq!==state.commandSeq)fail('invalid-save-journal-sequence');
    const {checksum,...payload}=c;if(checksum!==stableHash(payload))fail('corrupt-checksum');
    return {ok:true,checkpoint:structuredClone(value) as Checkpoint};
  } catch(error){return {ok:false,code:error instanceof Error?error.message:'invalid-save'};}
}
export function restoreSlots(slots:{revision:number;current:unknown|null;previous:unknown|null}):{status:'empty'|'current'|'backup'|'invalid';checkpoint?:Checkpoint;code?:string;raw:unknown|null} {
  if(slots.current===null&&slots.previous===null)return {status:'empty',raw:null};
  const current=readCheckpoint(slots.current);if(current.ok)return {status:'current',checkpoint:current.checkpoint,raw:slots.current};
  const previous=readCheckpoint(slots.previous);if(previous.ok)return {status:'backup',checkpoint:previous.checkpoint,code:current.code,raw:slots.current};
  return {status:'invalid',code:current.code,raw:slots.current};
}
