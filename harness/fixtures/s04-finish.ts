import {createRun,applyCommand,type R2RunState,type Action,type Command} from '../../src/domain/run';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {R2_CORE_BUILD_VERSION,R2_CORE_BUILD_HASH} from '../../src/domain/r2GroupUpgrade';
import {r2ChapterBossIds,lockR2ChapterTargets,type R2BossId} from '../../src/domain/r2Chapter';
import {makeR2Shop,assertR2Invariants} from '../../src/domain/r2Run';
import {stableHash} from '../../src/domain/hash';

export const s04Command=(s:R2RunState,action:Action):Command=>({runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});
export function s04Send(s:R2RunState,action:Action):R2RunState {const r=applyCommand(s,s04Command(s,action));if(!r.ok)throw Error(action.type+':'+r.code);return r.state;}
/** Validator-approved controlled public boundary, never evidence of natural attainment or supply. */
export function s04Fixture({index=6,hearts=26,old=false,boss='B03',stock=true}:{index?:number;hearts?:number;old?:boolean;boss?:R2BossId;stock?:boolean}={}):R2RunState {
 const identity=old?{contentVersion:R2_CORE_BUILD_VERSION,contentHash:R2_CORE_BUILD_HASH}:newRunIdentity('laohuan','flush');
 const s=createRun({rulesVersion:'r2',characterId:'laohuan',runId:'s04-finish/'+index+'/'+hearts+'/'+old,seed:'s04-finish-fixed',r2Identity:identity,openingRoute:'flush',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 s.stageIndex=index;s.chapter=Math.floor(index/3)+1;s.gold=20;
 const others=s.deckInstances.filter(c=>c.suit!=='hearts');
 if(hearts>=13)others.slice(0,hearts-13).forEach(c=>c.suit='hearts');
 else s.deckInstances.filter(c=>c.suit==='hearts').slice(hearts).forEach(c=>c.suit='clubs');
 const previous:string[]=[];
 for(let chapter=1;chapter<s.chapter;chapter++)previous.push(r2ChapterBossIds(chapter)!.find(id=>id!==boss&&!previous.includes(id))!);
 s.seenBossIds=[...previous,boss];s.boss={definitionId:boss,disabledSuit:boss==='B03'?'hearts':null};
 s.chapterTargetPlan=lockR2ChapterTargets(s.chapter,s.tourMode,s.difficulty,s.boss);
 s.routeGrowth={clears:index,G:index,S:0,F:0,settlements:Array.from({length:index},(_,stageIndex)=>({stageIndex,families:['G']}))};
 const entry:Command={runId:s.runId,commandId:s.runId+'/planted-shop',expectedSeq:s.commandSeq,action:{type:'OpenShop'}};
 makeR2Shop(s,true);s.commandSeq++;s.receipts.push({commandId:entry.commandId,seq:s.commandSeq,fingerprint:stableHash(entry)});
 if(stock)s.shop!.toolOffers=[{offerId:'s04/controlled/tool/0',definitionId:'S04',price:6,consumed:false}];
 assertR2Invariants(s);return s;
}
