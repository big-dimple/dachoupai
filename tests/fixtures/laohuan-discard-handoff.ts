import {createRun,applyCommand,type Action,type R2RunState} from '../../src/domain/run';
import {newRunIdentity} from '../../src/game/RunLaunch';
export const XIN_STRAIGHT=['hearts-9','hearts-8','clubs-6','clubs-10','spades-7'];
export const XIN_DISCARD=['diamonds-2','clubs-3','diamonds-4'];
export function laohuanSend(s:R2RunState,action:Action):R2RunState {
 const result=applyCommand(s,{runId:s.runId,commandId:'fixture/'+s.commandSeq,expectedSeq:s.commandSeq,action});if(!result.ok)throw Error(result.code);return result.state;
}
/** Curated current-identity hand reproducing the user's five-card straight intent. */
export function laohuanDiscardFixture(gap=0):R2RunState {
 let s=createRun({seed:'group-natural-17',runId:'xinqiji-discard-handoff',rulesVersion:'r2',characterId:'laohuan',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 s=laohuanSend(laohuanSend(s,{type:'LeaveShop'}),{type:'EnterStage'});s=structuredClone(s);s.handOrder=[...XIN_STRAIGHT,...XIN_DISCARD.slice(gap)];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id));return s;
}
