import {createRun,applyCommand,type Action,type R2RunState} from '../../src/domain/run';
import type {CharacterId} from '../../src/domain/characters';
import {newRunIdentity} from '../../src/game/RunLaunch';
export function heroSend(s:R2RunState,action:Action){const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;}
/** Controlled public hand and 12 gold, unchanged first-stage target/rules. Not natural acquisition. */
export function heroStageFixture(id:CharacterId){
 let s=createRun({rulesVersion:'r2',openingRoute:'group',characterId:id,seed:'hero-stage-continuity',runId:'hero-stage/'+id,r2Identity:newRunIdentity(id,'group'),modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 s.gold=12;s=heroSend(heroSend(s,{type:'LeaveShop'}),{type:'EnterStage'});
 const ids=['spades-13','hearts-13','clubs-13','spades-12','hearts-12'];
 s.handOrder=[...ids,...s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id)).slice(0,s.handOrder.length-ids.length)];
 s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id));
 const action:Action={type:'PlayHand',selectedIds:ids,...(id==='xiemu'?{xiemuBurn:10 as const}:id==='azao'?{azaoRelease:false}:{})};
 const cleared=heroSend(s,action),shop=heroSend(cleared,{type:'OpenShop'}),entered=heroSend(heroSend(shop,{type:'LeaveShop'}),{type:'EnterStage'});
 return {state:s,ids,action,cleared,shop,entered};
}
