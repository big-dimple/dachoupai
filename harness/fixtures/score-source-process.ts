import {scoreEnergyFixture} from './score-energy';
import {readableMultiplierFixture} from './readable-multiplier';
import {r2CreateJoker} from '../../src/domain/r2Run';
/** Bounded public controls; these are not natural acquisitions or complete games. */
export function scoreSourceProcessFixture(kind:'ordinary'|'chain'|'billion'){
 if(kind==='ordinary')return scoreEnergyFixture('ordinary');
 if(kind==='billion'){
  const f=readableMultiplierFixture('group');
  f.state.jokers[0].growth.coefficient={n:'1000000',d:'1'};
  return {...f,assistIds:[]};
 }
 const f=scoreEnergyFixture('multiply');
 f.selectedIds=f.state.handOrder.slice(0,5);f.assistIds=f.state.handOrder.slice(5,7);
 const cards=f.state.handOrder.map(id=>f.state.deckInstances.find(c=>c.id===id)!);
 Object.assign(cards[4],{rank:7,suit:'spades'});Object.assign(cards[6],{rank:2,suit:'hearts'});
 Object.assign(cards[0],{enhancement:'multiplier-paper',edition:'polychrome'});
 f.state.jokers=['a11','b06','f09','e03'].map((id,i)=>r2CreateJoker(id,'controlled/source-process/'+i,8,i===0?'holographic':'none',f.state));
 f.state.stage!.initialJokerIds=f.state.jokers.map(j=>j.instanceId);
 return f;
}
