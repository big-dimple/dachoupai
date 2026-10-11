import {createRun,applyCommand,assertRunInvariants,type R2RunState,type Action,type Command} from '../../src/domain/run';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {r2CreateJoker,r2ScoreContext} from '../../src/domain/r2Run';
import {r2JokerDefinitionsFor} from '../../src/domain/r2ContentProfiles';
import {scoreR2Hand,type ScoreInput} from '../../src/domain/scoreR2';
import {R2_SUIT_CHOICE_VERSION,R2_SUIT_CHOICE_HASH} from '../../src/domain/r2GroupUpgrade';
import {r2DisabledCards} from '../../src/domain/r2Chapter';

/** Controlled public cards/cash/owned instances; never natural acquisition evidence. */
export function shopC2Fixture(ids:string[]=[],legacy=false){
 const identity=legacy?{contentVersion:R2_SUIT_CHOICE_VERSION,contentHash:R2_SUIT_CHOICE_HASH}:newRunIdentity('laohuan','group');
 const s=createRun({seed:'shop-c2-align',runId:'shop-c2-align',characterId:'laohuan',rulesVersion:'r2',r2Identity:identity,openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 s.gold=40;s.jokers=ids.map(id=>r2CreateJoker(id,'held/'+id,8,'none',s));assertRunInvariants(s);return s;
}
export function shopC2PublicDeck(s:R2RunState,counts:Record<number,number>){
 const original=s.deckInstances;
 s.deckInstances=Object.entries(counts).flatMap(([rank,count])=>Array.from({length:count},(_,i)=>({...original.find(c=>c.rank===Number(rank)&&c.suit==='hearts')!,id:`public/${rank}/${i}`})));
 s.drawPile=s.deckInstances.map(c=>c.id);s.handOrder=[];s.playedPile=[];s.discardPile=[];s.destroyedIds=[];assertRunInvariants(s);return s;
}
export function shopC2Score(s:R2RunState,ids:string[]){
 const hand=ids.map(id=>s.deckInstances.find(c=>c.id===id)!),context=r2ScoreContext(s,hand,ids);
 const input:ScoreInput={...context,rulesVersion:'r2',runId:s.runId,rootId:'shop-c2-public/'+ids.join(','),hand,selectedIds:ids,disabledIds:[],jokers:s.jokers,definitions:r2JokerDefinitionsFor(s),handLevels:s.handLevels,playIndex:s.stage?.playIndex??1,handsBeforePlay:s.stage?.handsLeft??4,previousHandType:s.stage?.previousHandType??null,wager:false,rng:s.rng.rule};
 return {input,trace:scoreR2Hand(input)};
}
export function shopC2Send(s:R2RunState,action:Action){
 const command={runId:s.runId,commandId:s.runId+'/c2-proof/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action},r=applyCommand(s,command);if(!r.ok)throw Error(r.code+JSON.stringify(r.diagnostic));assertRunInvariants(r.state);return {state:r.state,command};
}
/** Four actual domain clears from controlled public power; no invented saved ledger. */
export function shopC2EarnedHistory(){
 let s=shopC2Fixture(['b10']);s.jokers[0].growth.heat={n:'100',d:'1'};
 const ids=['spades-9','hearts-9','clubs-9','spades-10','hearts-10'];for(const id of ids)s.deckInstances.find(c=>c.id===id)!.enhancement='multiplier-paper';
 const commands:Command[]=[],clears:{command:Command;before:R2RunState;after:R2RunState}[]=[];
 const send=(a:Action)=>{const before=a.type==='PlayHand'?structuredClone(s):undefined,r=shopC2Send(s,a);s=r.state;commands.push(r.command);if(before)clears.push({command:r.command,before,after:structuredClone(s)});};
 for(let i=0;i<4;i++){
  send({type:'LeaveShop'});send({type:'EnterStage'});
  const available=s.deckInstances.filter(c=>!s.destroyedIds.includes(c.id));s.handOrder=[...ids,...available.filter(c=>!ids.includes(c.id)).slice(0,s.stage!.handLimit-ids.length).map(c=>c.id)];s.drawPile=available.map(c=>c.id).filter(id=>!s.handOrder.includes(id));s.stage!.disabledIds=s.stage!.boss?r2DisabledCards(s.stage!.boss,s.stageIndex,s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!)):[];assertRunInvariants(s);
  send({type:'PlayHand',selectedIds:ids});if(s.phase!=='stage-cleared')throw Error('controlled-power-did-not-clear');send({type:'OpenShop'});
 }
 return {state:s,commands,clears};
}
