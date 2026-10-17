import {createRun,applyCommand} from '../../src/domain/run';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {r2CreateJoker,makeR2Shop} from '../../src/domain/r2Run';
import {r2JokerDefinitionsFor} from '../../src/domain/r2ContentProfiles';
import {r2ToolPrice} from '../../src/domain/r2Shop';
import {makeCheckpoint,readCheckpoint} from '../../src/application/checkpoint';
import {R2_HAND_TYPES} from '../../src/domain/evaluateR2';
import type {Action,R2RunState} from '../../src/domain/run';
/** Public engineering sample, after a real domain command; never an untouched or natural opening. */
export function workshopLayoutFixture(n=0,duplicate=false,expanded=false){
 let s=createRun({rulesVersion:'r2',characterId:'laohuan',seed:'workshop-layout',runId:'controlled/workshop-'+n,r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 const next=applyCommand(s,{runId:s.runId,commandId:s.runId+'/sample-reroll',expectedSeq:s.commandSeq,action:{type:'RerollShop'}});if(!next.ok)throw Error(next.code);s=next.state;
 s.gold=40;s.jokers=r2JokerDefinitionsFor(s).slice(0,n).map(d=>r2CreateJoker(d.id,'held/'+d.id,6,'none',s));if(expanded)s.longTermItems=['U05'];const entrySeq=s.shop!.basicChoice!.shopSeq;makeR2Shop(s,true);s.shop!.basicChoice!.shopSeq=entrySeq;
 const id=duplicate?'T08':'T17';s.shop!.toolOffers[0].definitionId=id;s.shop!.toolOffers[0].price=r2ToolPrice(id,s);s.consumables=[];s.handLevels.pair=1;
 const cp=makeCheckpoint(s,[]),valid=readCheckpoint(cp);if(!valid.ok)throw Error(valid.code);return cp;
}
/** Real domain Boss victory with explicitly boosted public hand levels; not a natural acquisition sample. */
export function workshopBossTransition(){
 const send=(s:R2RunState,action:Action)=>{const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/boss-test/'+s.commandSeq,expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;};
 let s=createRun({rulesVersion:'r2',runId:'shop-boss-current-stage',seed:'shop-boss-current-stage',characterId:'laohuan',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 for(const type of ['SkipStage','OpenShop','SkipStage','OpenShop'] as const)s=send(s,{type});for(const type of R2_HAND_TYPES)s.handLevels[type]=30;const before=s;
 s=send(s,{type:'LeaveShop'});s=send(s,{type:'EnterStage'});s=send(s,{type:'PlayHand',selectedIds:s.handOrder.slice(0,5)});if(s.phase!=='stage-cleared')throw Error('controlled Boss sample did not clear');const won=s;
 return {before,won,after:send(s,{type:'OpenShop'})};
}
