import {createRun,applyCommand,type R2RunState,type Command,type Action} from '../../src/domain/run';
import {assertR2Invariants,r2CreateJoker} from '../../src/domain/r2Run';
import {isR2RouteStarter} from '../../src/domain/r2GroupUpgrade';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {touyeChoice} from '../../src/game/TouyeWagerCopy';
import type {TouyeTarget} from '../../src/domain/r2TouyeWager';
import {r2DisabledCards,type R2BossPlan} from '../../src/domain/r2Chapter';
import {completeControlledRouteHistory} from './route-growth-history';
import {resolveR2ModeConfig} from '../../src/content/r2Modes';
import {makeCheckpoint,readCheckpoint} from '../../src/application/checkpoint';
export const matureMain=['spades-9','hearts-9','clubs-13','diamonds-13'];
export const baselineHand=[...matureMain,'spades-3','hearts-5','clubs-7','diamonds-2'];
export type TouyeScenario='mature-win'|'mature-old-core'|'mature-accompanying'|'unformed-win'|'target-miss'|'duplicate-face'|'short'|'empty'|'four-straight'|'four-flush'|'four-kind-flush'|'disabled-core'|'B02-zero'|'unformed-disabled'|'full-house-core'|'four-kind-core'|'all-disabled-flush';
export function touyeCommand(s:R2RunState,action:Action):Command{return {runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action};}
export function touyeSend(s:R2RunState,action:Action):R2RunState {const r=applyCommand(s,touyeCommand(s,action));if(!r.ok)throw Error(r.code+JSON.stringify(r.diagnostic));return r.state;}
/** Explicit planted visible hands/deck partitions; subsequent commands are real.
 * This bounded fixture proves responsibility, not natural supply or a playthrough.
 */
export function touyeFixture(kind:TouyeScenario='mature-win',options:{identity?:{contentVersion:string;contentHash:string};boss?:R2BossPlan;challenge?:boolean;jokers?:string[]}={}){
 const modeConfig=options.challenge?{mode:'challenge' as const,difficulty:0 as const,challengeId:'Q01' as const,programsEnabled:false}:{mode:'standard' as const,difficulty:0 as const,challengeId:null,programsEnabled:false};
 const resolved=resolveR2ModeConfig(modeConfig);if(!resolved.ok)throw Error(resolved.code);
 const seed=resolved.config.seedPolicy.kind==='free'?'touye-core-bounded':resolved.config.seedPolicy.values[0];
 let s=createRun({rulesVersion:'r2',characterId:'touye',runId:'core/'+kind,seed,r2Identity:options.identity??newRunIdentity('touye','group'),...(isR2RouteStarter(options.identity??newRunIdentity('touye','group'))?{openingRoute:'group' as const}:{}),modeConfig});
 s=touyeSend(s,{type:'LeaveShop'});s.shop=null;
 const boss=options.boss??(kind==='disabled-core'||kind==='unformed-disabled'||kind==='all-disabled-flush'?{definitionId:'B03',disabledSuit:'hearts'}:kind==='B02-zero'?{definitionId:'B02',disabledSuit:null}:undefined);
 if(boss){const n=Number(boss.definitionId.slice(1));s.chapter=n<=4?1:n<=12?3:7;s.stageIndex=s.chapter*3-1;s.seenBossIds=[...['B01','B02','B03','B04','B05','B06'].slice(0,s.chapter-1),boss.definitionId];s.boss=boss;completeControlledRouteHistory(s);}
 if(kind==='four-straight'||kind==='four-flush'){const id=kind==='four-straight'?'c08':'c09';s.jokers=[r2CreateJoker(id,id,4,undefined,s)];}
 if(options.jokers)s.jokers=options.jokers.map(id=>r2CreateJoker(id,id,4,undefined,s));
 s=touyeSend(s,{type:'EnterStage'});
 let hand=[...baselineHand],incoming=['clubs-9'],discard=['hearts-9'],play=['spades-9','clubs-9','clubs-13','diamonds-13'],target:TouyeTarget='two-pair';
 if(kind==='mature-old-core'||kind==='mature-accompanying'||kind==='target-miss'){incoming=['hearts-4'];discard=['diamonds-2'];play=kind==='target-miss'?['hearts-4']:kind==='mature-accompanying'?[...matureMain,'hearts-4']:[...matureMain];}
 if(kind==='unformed-win'||kind==='unformed-disabled'){hand=hand.map(id=>id==='hearts-9'?'diamonds-11':id);discard=['diamonds-11'];}
 if(kind==='unformed-disabled'){incoming=['hearts-9'];play=['spades-9','hearts-9','clubs-13','diamonds-13'];}
 if(kind==='full-house-core'){incoming=['spades-13'];discard=['diamonds-2'];play=[...matureMain,'spades-13'];target='full-house';}
 if(kind==='four-kind-core'){hand=['spades-9','hearts-9','clubs-9','clubs-13','diamonds-13','spades-3','hearts-5','diamonds-2'];incoming=['diamonds-9'];discard=['diamonds-2'];play=['spades-9','hearts-9','clubs-9','diamonds-9'];target='three-kind';}
 if(kind==='duplicate-face'){s.deckInstances.push({...s.deckInstances.find(c=>c.id==='spades-9')!,id:'actual-new-copy'});incoming=['actual-new-copy'];play=play.map(id=>id==='clubs-9'?'actual-new-copy':id);}
 if(kind==='disabled-core'){hand=hand.map(id=>id==='hearts-9'?'clubs-9':id);incoming=['hearts-9'];discard=['clubs-9'];play=['spades-9','hearts-9','clubs-13','diamonds-13'];}
 if(kind==='short'){discard=['spades-3','hearts-5','clubs-7'];play=['spades-9','hearts-9','clubs-9'];target='three-kind';}
 if(kind==='empty'){incoming=[];}
 if(kind==='all-disabled-flush'){hand=['hearts-2','hearts-5','hearts-7','hearts-9','hearts-13','spades-3','clubs-8','diamonds-2'];incoming=['hearts-3'];discard=['hearts-2'];play=['hearts-3','hearts-5','hearts-7','hearts-9','hearts-13'];target='flush';}
 if(kind==='four-straight'){hand=['spades-3','hearts-4','clubs-5','diamonds-6','spades-9','hearts-11','clubs-13','diamonds-2'];incoming=['diamonds-4'];discard=['hearts-4'];play=['spades-3','diamonds-4','clubs-5','diamonds-6'];target='straight';}
 if(kind==='four-flush'){hand=['hearts-2','hearts-5','hearts-7','hearts-9','spades-3','clubs-8','diamonds-13','diamonds-2'];incoming=['hearts-11'];discard=['hearts-9'];play=['hearts-2','hearts-5','hearts-7','hearts-11'];target='flush';}
 if(kind==='four-kind-flush'){hand=['spades-9','hearts-9','clubs-9','diamonds-9','spades-3','hearts-5','clubs-7','diamonds-2'];hand.slice(0,4).forEach(id=>{s.deckInstances.find(c=>c.id===id)!.suit='hearts';});incoming=['hearts-4'];discard=['diamonds-2'];play=[...hand.slice(0,4),'hearts-4'];target='flush';}
 if(kind==='short'||kind==='empty')s.deckInstances=s.deckInstances.filter(c=>hand.includes(c.id)||incoming.includes(c.id));
 s.handOrder=hand;s.playedPile=[];s.discardPile=[];s.drawPile=[...s.deckInstances.map(c=>c.id).filter(id=>!hand.includes(id)&&!incoming.includes(id)),...[...incoming].reverse()];
 s.stage!.disabledIds=s.stage!.boss?r2DisabledCards(s.stage!.boss,s.stageIndex,s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!)):[];
 assertR2Invariants(s);const cp=readCheckpoint(makeCheckpoint(s,[]));if(!cp.ok)throw Error(cp.code);
 return {state:s,discard,play,target,incoming};
}
export function touyeBet(s:R2RunState,ids:readonly string[],target:TouyeTarget):Action{return {type:'DiscardHand',selectedIds:[...ids],touyeBet:{target,snapshotToken:touyeChoice(s,ids).snapshotToken}};}
