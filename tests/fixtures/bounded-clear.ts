import {createRun,applyCommand,type R2RunState,type Action,type Command} from '../../src/domain/run';
import {assertR2Invariants,r2CreateJoker} from '../../src/domain/r2Run';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {r2DisabledCards} from '../../src/domain/r2Chapter';
export function boundedCommand(s:R2RunState,action:Action):Command{return {runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action};}
export function boundedSend(s:R2RunState,action:Action){const r=applyCommand(s,boundedCommand(s,action));if(!r.ok)throw Error(r.code);return r.state;}
export function boundedStart(hero:R2RunState['characterId']='amo'){return createRun({rulesVersion:'r2',characterId:hero,seed:'bounded-fixed',runId:'bounded/'+hero,r2Identity:newRunIdentity(hero,'group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});}
/** Explicit planted chapter3 budget, not natural supply evidence. */
export function boundedBossFixture(boss:'B09'|'B14'='B09',upgraded=false){
 let s=boundedStart();s.handLevels.pair=1;s.jokers=[r2CreateJoker('mantangcai','bounded-mantangcai',6,undefined,s)];s.consumables=[{instanceId:'bounded-t01',definitionId:'T01'}];
 if(upgraded)s=boundedSend(s,{type:'UseConsumable',instanceId:'bounded-t01',handType:'pair',targetIds:[]});
 s=boundedSend(s,{type:'LeaveShop'});s.shop=null;s.stageIndex=boss==='B09'?8:20;s.chapter=Math.floor(s.stageIndex/3)+1;
 s.seenBossIds=['B01','B02','B03','B04','B05','B06'].slice(0,s.chapter-1).concat(boss);s.boss={definitionId:boss,disabledSuit:null};
 for(let i=0;i<s.stageIndex;i++){s.routeGrowth!.settlements.push({stageIndex:i,families:['G']});s.routeGrowth!.clears++;s.routeGrowth!.G++;}
 assertR2Invariants(s);return s;
}
export function boundedArrange(input:R2RunState,ids:string[]):R2RunState {
 const s=structuredClone(input),available=s.deckInstances.filter(c=>!s.playedPile.includes(c.id)&&!s.discardPile.includes(c.id)&&!s.destroyedIds.includes(c.id));
 s.handOrder=[...ids,...available.filter(c=>!ids.includes(c.id)).slice(0,s.stage!.handLimit-ids.length).map(c=>c.id)];s.drawPile=available.filter(c=>!s.handOrder.includes(c.id)).map(c=>c.id);
 s.stage!.disabledIds=s.stage!.boss?r2DisabledCards(s.stage!.boss,s.stage!.index,s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!)):[];assertR2Invariants(s);return s;
}
