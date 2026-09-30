import { createDeck } from '../cards/deck';
import { R2_JOKERS, type R2JokerInstance } from '../content/r2Schema';
import { SeededRng } from '../core/SeededRng';
import { CHARACTER_IDS } from './characters';
import { R2_HAND_TYPES, type R2HandType } from './evaluateR2';
import { stableHash } from './hash';
import { MAX_INTEGER_DIGITS } from './rational';
import { scoreR2Hand, ScoreFault, SCORE_LIMITS, R2_BASE_SCORES, type ScoreTrace } from './scoreR2';
import type { Command, DomainEvent, RunState, StageState } from './run';

export const R2_LIMITS = {handSize:8,maxSelected:5,hands:4,discards:3,jokerSlots:5} as const;
export const R2_TARGETS = [400,1000,2400,5600,13000,30000,70000,160000] as const;
export const R2_CONTENT_VERSION = 'quality-r2-score-v1';
export const R2_CONTENT_HASH = stableHash({jokers:R2_JOKERS,limits:R2_LIMITS,targets:R2_TARGETS,hands:R2_BASE_SCORES,score:SCORE_LIMITS});
export interface R2StageState extends Omit<StageState,'targetHeat'|'heat'|'previousHandType'> {
  targetHeat:string; heat:string; previousHandType:R2HandType|null; disabledIds:string[]; wagerSelected:boolean; wagerUsed:boolean;
}
export interface R2RunState extends Omit<RunState,'schemaVersion'|'rulesVersion'|'stage'|'totalHeat'|'jokers'|'lastScore'> {
  schemaVersion:2; rulesVersion:'r2'; stage:R2StageState|null; totalHeat:string; jokers:R2JokerInstance[];
  lastTrace:ScoreTrace|null; handLevels:Partial<Record<R2HandType,number>>;
}
type Transaction = {ok:true;state:R2RunState;events:DomainEvent[]} | {ok:false;code:string;diagnostic?:{code:string;events:readonly unknown[]}};
const integer = (n:number) => Number.isSafeInteger(n) && n >= 0;
const scoreString = (n:string) => typeof n==='string' && /^(0|[1-9]\d*)$/.test(n) && n.length<=MAX_INTEGER_DIGITS;
const permutation = (a:readonly string[],b:readonly string[]) => a.length===b.length && new Set(a).size===a.length && a.every(id=>b.includes(id));

export function assertR2Invariants(state:R2RunState):void {
  const check=(condition:boolean,label:string)=>{if(!condition)throw new Error(`Run invariant: ${label}`);};
  check(state.schemaVersion===2 && state.rulesVersion==='r2' && state.contentVersion===R2_CONTENT_VERSION && state.contentHash===R2_CONTENT_HASH,'r2 versions');
  const ids=state.deckInstances.map(c=>c.id), zones=[...state.drawPile,...state.handOrder,...state.playedPile,...state.discardPile];
  check(new Set(ids).size===ids.length && new Set(zones).size===zones.length && zones.every(id=>ids.includes(id)) && ids.every(id=>zones.includes(id)||state.destroyedIds.includes(id)),'card conservation');
  check(new Set(state.destroyedIds).size===state.destroyedIds.length && state.destroyedIds.every(id=>ids.includes(id)&&!zones.includes(id)),'destroyed IDs');
  check(state.handOrder.length<=R2_LIMITS.handSize && integer(state.gold)&&integer(state.commandSeq)&&scoreString(state.totalHeat),'r2 resources');
  check(state.jokers.length<=R2_LIMITS.jokerSlots && new Set(state.jokers.map(j=>j.instanceId)).size===state.jokers.length && new Set(state.jokers.map(j=>j.definitionId)).size===state.jokers.length,'joker slots/IDs');
  check(state.jokers.every(j=>R2_JOKERS.some(d=>d.id===j.definitionId)&&integer(j.paidPrice)),'joker references');
  if(state.stage) {
    check(scoreString(state.stage.heat)&&scoreString(state.stage.targetHeat)&&[state.stage.handsLeft,state.stage.discardsLeft,state.stage.playIndex,state.stage.goldEarned].every(integer),'stage resources');
    check(state.stage.disabledIds.every(id=>ids.includes(id)),'disabled IDs');
  }
  for(const [type,level] of Object.entries(state.handLevels))check(R2_HAND_TYPES.includes(type as R2HandType)&&Number.isInteger(level)&&level!>=1&&level!<=30,'hand levels');
  check(state.phase!=='await-input'||state.stage!==null,'play stage');
  check(!['run-won','run-lost'].includes(state.phase)||state.outcome!==null,'terminal reason');
  for(const cursor of Object.values(state.rng))SeededRng.restore(cursor);
}
function refill(state:R2RunState):void {while(state.handOrder.length<R2_LIMITS.handSize&&state.drawPile.length)state.handOrder.push(state.drawPile.pop()!);}

/** r2 math transaction. Shop/discard interactions are added by R03 before enabling the r2 UI. */
export function transactR2(input:R2RunState|null,command:Command):Transaction {
  const fail=(code:string):Transaction=>({ok:false,code});
  const action=command.action, events:DomainEvent[]=[];
  let state:R2RunState;
  if(action.type==='StartRun') {
    if(input)return fail('wrong-phase');
    if(action.rulesVersion!=='r2'||typeof action.seed!=='string'||!action.seed||!CHARACTER_IDS.includes(action.characterId))return fail('invalid-start');
    const cards=createDeck();
    state={schemaVersion:2,rulesVersion:'r2',contentVersion:R2_CONTENT_VERSION,contentHash:R2_CONTENT_HASH,runId:command.runId,seed:action.seed,commandSeq:0,difficulty:0,characterId:action.characterId,
      chapter:1,stageIndex:0,phase:'stage-ready',deckInstances:cards,drawPile:cards.map(c=>c.id),handOrder:[],playedPile:[],discardPile:[],destroyedIds:[],stage:null,totalHeat:'0',gold:6,jokers:[],consumables:[],longTermItems:[],program:null,boss:null,shop:null,
      rng:{deck:new SeededRng(`${action.seed}/r2/deck/0`).snapshot(),rule:new SeededRng(`${action.seed}/r2/rule/0`).snapshot(),shop:new SeededRng(`${action.seed}/r2/shop/0`).snapshot(),reward:new SeededRng(`${action.seed}/r2/reward/0`).snapshot()},
      receipts:[],lastTrace:null,handLevels:{},outcome:null};
  } else {
    if(!input)return fail('run-not-started');
    state=structuredClone(input);
    switch(action.type) {
      case 'EnterStage': {
        if(state.phase!=='stage-ready')return fail('wrong-phase');
        const chapter=Math.floor(state.stageIndex/3), base=R2_TARGETS[chapter];
        if(!base)return fail('unknown-stage');
        const target=base*[1,1.5,2][state.stageIndex%3];
        const rng=new SeededRng(`${state.seed}/r2/deck/${state.stageIndex}`);
        state.drawPile=rng.shuffle(state.deckInstances.filter(c=>!state.destroyedIds.includes(c.id))).map(c=>c.id);
        state.handOrder=[];state.playedPile=[];state.discardPile=[];refill(state);
        state.rng.deck=rng.snapshot();state.rng.rule=new SeededRng(`${state.seed}/r2/rule/${state.stageIndex}`).snapshot();
        state.stage={index:state.stageIndex,targetHeat:String(Math.ceil(target)),heat:'0',handsLeft:R2_LIMITS.hands,discardsLeft:0,playIndex:0,previousHandType:null,clearId:null,goldEarned:0,disabledIds:[],wagerSelected:false,wagerUsed:false};
        state.chapter=chapter+1;state.phase='await-input';state.lastTrace=null;break;
      }
      case 'SetWager':
        if(state.phase!=='await-input'||!state.stage)return fail('wrong-phase');
        if(state.characterId!=='touye'||typeof action.enabled!=='boolean')return fail('invalid-wager');
        if(state.stage.wagerUsed)return fail('wager-used');
        state.stage.wagerSelected=action.enabled;break;
      case 'ReorderHand':
        if(state.phase!=='await-input')return fail('wrong-phase');
        if(!Array.isArray(action.ids)||!permutation(action.ids,state.handOrder))return fail('invalid-order');
        state.handOrder=[...action.ids];break;
      case 'ReorderJokers':
        if(!['shop','await-input'].includes(state.phase))return fail('wrong-phase');
        if(!Array.isArray(action.ids)||!permutation(action.ids,state.jokers.map(j=>j.instanceId)))return fail('invalid-order');
        state.jokers=action.ids.map(id=>state.jokers.find(j=>j.instanceId===id)!);break;
      case 'PlayHand': {
        if(state.phase!=='await-input'||!state.stage)return fail('wrong-phase');
        const ids=action.selectedIds;
        if(!Array.isArray(ids)||!ids.length)return fail('empty-selection');
        if(ids.length>R2_LIMITS.maxSelected)return fail('too-many-cards');
        if(new Set(ids).size!==ids.length)return fail('duplicate-card');
        if(ids.some(id=>!state.handOrder.includes(id)))return fail('unknown-card');
        if(state.stage.handsLeft<=0)return fail('no-hands-left');
        let trace:ScoreTrace;
        try {trace=scoreR2Hand({rulesVersion:'r2',runId:state.runId,rootId:`${state.runId}/hand/${command.commandId}`,characterId:state.characterId,
          hand:state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!),selectedIds:ids,disabledIds:state.stage.disabledIds,jokers:state.jokers,definitions:R2_JOKERS,
          handLevels:state.handLevels,playIndex:state.stage.playIndex+1,handsBeforePlay:state.stage.handsLeft,previousHandType:state.stage.previousHandType,wager:state.stage.wagerSelected,rng:state.rng.rule});}
        catch(error) {return {ok:false,code:'score-diagnostic',diagnostic:{code:error instanceof ScoreFault?error.code:error instanceof Error?error.message:'score-error',events:error instanceof ScoreFault?error.events:[]}};}
        state.rng.rule={...trace.rng};state.lastTrace=trace;state.jokers=structuredClone(trace.jokers);
        const heat=(BigInt(state.stage.heat)+BigInt(trace.finalScore)).toString();
        if(!scoreString(heat))return {ok:false,code:'score-diagnostic',diagnostic:{code:'numeric-length-limit',events:trace.events}};
        state.stage.heat=heat;
        state.stage.handsLeft--;state.stage.playIndex++;state.stage.previousHandType=trace.handType;
        if(state.stage.wagerSelected)state.stage.wagerUsed=true;
        state.stage.wagerSelected=false;
        state.handOrder=[...trace.sets.heldIds];state.playedPile.push(...trace.sets.playedIds);
        events.push({type:'hand-scored-r2',score:trace,playedIds:trace.sets.playedIds,playIndex:state.stage.playIndex});
        if(BigInt(state.stage.heat)>=BigInt(state.stage.targetHeat)) {
          const total=(BigInt(state.totalHeat)+BigInt(state.stage.heat)).toString();
          if(!scoreString(total))return {ok:false,code:'score-diagnostic',diagnostic:{code:'numeric-length-limit',events:trace.events}};
          const reward=[4,5,7][state.stageIndex%3]+state.stage.handsLeft+Math.min(5,Math.floor(state.gold/5))+(state.characterId==='xiemu'&&state.stage.handsLeft===0?2:0);
          state.stage.goldEarned=reward;state.stage.clearId=`${state.runId}/clear/${state.stageIndex}`;
          state.gold+=reward;state.totalHeat=total;state.stageIndex++;
          state.phase=state.stageIndex===R2_TARGETS.length*3?'run-won':'stage-cleared';
          if(state.phase==='run-won')state.outcome={reason:'all-stages-cleared',stageIndex:state.stage.index};
          events.push({type:'stage-ended',cleared:true,stage:structuredClone(state.stage)});
        } else if(state.stage.handsLeft===0) {
          state.phase='run-lost';state.outcome={reason:'hands-exhausted',stageIndex:state.stage.index};
          events.push({type:'stage-ended',cleared:false,stage:structuredClone(state.stage)});
        } else {
          refill(state);
          if(!state.handOrder.length) {state.phase='run-lost';state.outcome={reason:'no-legal-cards',stageIndex:state.stage.index};events.push({type:'stage-ended',cleared:false,stage:structuredClone(state.stage)});}
        }
        break;
      }
      case 'AbandonRun':
        if(['run-won','run-lost'].includes(state.phase))return fail('wrong-phase');
        state.phase='run-lost';state.outcome={reason:'abandoned',stageIndex:state.stageIndex};events.push({type:'run-abandoned'});break;
      default:return fail('r2-interaction-not-enabled');
    }
  }
  return {ok:true,state,events};
}
