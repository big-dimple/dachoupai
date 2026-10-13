import {createRun,applyCommand,assertRunInvariants,type R2RunState,type Action} from '../../src/domain/run';
import {r2CreateJoker} from '../../src/domain/r2Run';
import {r2Price} from '../../src/domain/r2Shop';
import {newRunIdentity} from '../../src/game/RunLaunch';
import type {BuildFocus} from '../../src/game/BuildDirectionPreferences';

/** Controlled legal public cards and resources, with an actual saved PlayHand trace.
 * This is neither a natural acquisition nor a natural clear sample. */
export function recommendationEvidenceFixture(route:BuildFocus){
 let s=createRun({seed:'recommendation-evidence',runId:'recommendation-evidence',characterId:'laohuan',rulesVersion:'r2',r2Identity:newRunIdentity('laohuan',route),openingRoute:route,modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 s.gold=40;
 s.jokers=['d11',route==='group'?'b02':'jiedongfeng','e11','e01','e04'].map(id=>r2CreateJoker(id,'held/'+id,8,'none',s));
 s.jokers[2].growth.coefficient={n:'3',d:'2'};
 const ids=route==='group'?['spades-7','hearts-7','clubs-7','spades-8','hearts-8']:route==='straight'?['spades-7','hearts-8','clubs-9','spades-10','hearts-11']:['hearts-2','hearts-4','hearts-6','hearts-8','hearts-10'];
 for(const id of ids){const c=s.deckInstances.find(c=>c.id===id)!;c.enhancement='multiplier-paper';c.edition='polychrome';}
 const send=(action:Action)=>{const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/fixture/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);s=r.state;};
 send({type:'LeaveShop'});send({type:'EnterStage'});
 s.handOrder=[...ids,...s.deckInstances.filter(c=>!ids.includes(c.id)).slice(0,s.stage!.handLimit-ids.length).map(c=>c.id)];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id));assertRunInvariants(s);
 send({type:'PlayHand',selectedIds:ids});if(s.phase!=='stage-cleared')throw Error('controlled-clear-required');send({type:'OpenShop'});
 s.shop!.offers=['d09','a06','f06'].map(definitionId=>({offerId:'public/'+definitionId,definitionId,price:r2Price(definitionId,'none',s),edition:'none',consumed:false}));
 assertRunInvariants(s);return s;
}
