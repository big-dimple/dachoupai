import {createRun} from '../../src/domain/run';
import {Rational} from '../../src/domain/rational';
import {newRunIdentity} from '../../src/game/RunLaunch';
import {r2CreateJoker} from '../../src/domain/r2Run';
import {energySend} from './score-energy';
/** Controlled public deck, level and saved growth. NOT the reported natural runs. */
export function readableMultiplierFixture(kind:'group'|'straight'){
 const route=kind==='group'?'group':'straight';
 let state=createRun({seed:'readable-multiplier/'+kind,runId:'controlled/readable-multiplier/'+kind,characterId:'erxiang',rulesVersion:'r2',r2Identity:newRunIdentity('erxiang',route),openingRoute:route,modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 state=energySend(energySend(state,{type:'LeaveShop'}),{type:'EnterStage'});
 const selectedIds=state.handOrder.slice(0,kind==='group'?4:5);
 selectedIds.forEach((id,i)=>Object.assign(state.deckInstances.find(c=>c.id===id)!,{rank:kind==='group'?i<2?7:9:3+i,suit:i%2?'hearts':'spades'}));
 state.jokers=[r2CreateJoker('a06','controlled/a06',9,'none',state),...(kind==='group'?[r2CreateJoker('b10','controlled/b10',4,'none',state),r2CreateJoker('e03','controlled/e03',6,'none',state)]:[])];
 state.stage!.initialJokerIds=state.jokers.map(j=>j.instanceId);
 if(kind==='group'){
  state.gold=20;state.handLevels['two-pair']=30;state.jokers[1].growth.heat={n:'64',d:'1'};
  const trial=energySend(state,{type:'PlayHand',selectedIds});
  const base=Rational.fromJSON(trial.lastTrace!.accumulator.M).multiply(new Rational(2n,3n));
  state.jokers[0].growth.coefficient=new Rational(36639n,64n).multiply(new Rational(base.d,base.n)).toJSON();
 }else state.jokers[0].growth.coefficient={n:'839523',d:'320000'};
 return {state,selectedIds};
}
