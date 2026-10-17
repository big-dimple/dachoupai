import {createRun,applyCommand,assertRunInvariants,type R2RunState,type Action} from '../../src/domain/run';
import {newRunIdentity} from '../../src/game/RunLaunch';
/** Parent reproduced this public hand naturally online. Local replay plants that hand only. */
export function touyeDoubleJReminder(){
 let s=createRun({runId:'touye-double-j-reminder',seed:'controlled-double-j-reminder',rulesVersion:'r2',characterId:'touye',openingRoute:'flush',r2Identity:newRunIdentity('touye','flush'),modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 const send=(action:Action)=>{const r=applyCommand(s,{runId:s.runId,commandId:'setup/'+s.commandSeq,expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);s=r.state;};
 const blue=s.shop!.offers.find(o=>o.definitionId==='c06')!;send({type:'BuyOffer',offerId:blue.offerId});send({type:'LeaveShop'});send({type:'EnterStage'});
 s.handOrder=['diamonds-9','hearts-3','hearts-5','diamonds-12','diamonds-14','spades-8','spades-11','clubs-11'];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id)&&!s.playedPile.includes(id)&&!s.discardPile.includes(id));assertRunInvariants(s);
 return {state:s as R2RunState,main:['spades-11','clubs-11']};
}
