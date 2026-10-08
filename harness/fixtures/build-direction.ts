import {createRun,type R2RunState} from '../../src/domain/run';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {r2CreateJoker} from '../../src/domain/r2Run';
import {journeySend} from './build-journey';
/** Controlled current-version public hand/owned growth/tool. No natural acquisition claim. */
export function buildDirectionFixture():R2RunState {
 let s=createRun({seed:'direction-continuity',runId:'controlled/build-direction',characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 s=journeySend(journeySend(s,{type:'LeaveShop'}),{type:'EnterStage'});
 const cards=[[2,'diamonds'],[4,'diamonds'],[7,'diamonds'],[9,'diamonds'],[12,'hearts'],[3,'clubs'],[6,'spades'],[11,'clubs']] as const;
 cards.forEach(([rank,suit],i)=>Object.assign(s.deckInstances[i],{rank,suit}));s.handOrder=s.deckInstances.slice(0,8).map(c=>c.id);s.drawPile=s.deckInstances.slice(8).map(c=>c.id);
 const joker=r2CreateJoker('b10','controlled/growth',4,'none',s);joker.growth={heat:{n:'30',d:'1'}};s.jokers=[joker];s.stage!.initialJokerIds=[joker.instanceId];s.consumables=[{instanceId:'controlled/dye',definitionId:'T04'}];s.gold=20;
 return s;
}
