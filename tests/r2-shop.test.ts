import {describe,expect,it} from 'vitest';
import {SeededRng} from '../src/core/SeededRng';
import {drawR2Shelf,rerollPrice} from '../src/domain/r2Shop';
import {R2_JOKERS} from '../src/content/r2Schema';
import {publicR2View,chooseR2Action} from '../src/testing/r2Bot';
import {applyCommand,createRun,assertRunInvariants,type R2RunState} from '../src/domain/run';
describe('r2 shelves and public policy',()=>{
  it('draws weighted slots without replacement, handles short/empty pools and ensures affordability',()=>{
    expect(drawR2Shelf(new SeededRng('empty'),[])).toEqual([]);
    expect(drawR2Shelf(new SeededRng('one'),R2_JOKERS.slice(0,1))).toEqual(['pengci']);
    const fixtures=Array.from({length:6},(_,i)=>({...R2_JOKERS[0],id:`fixture-${i}`,rarity:i===0?'common' as const:'rare' as const}));
    for(let seed=0;seed<100;seed++){
      const shelf=drawR2Shelf(new SeededRng(`shop-${seed}`),fixtures,6);
      expect(shelf).toContain('fixture-0');expect(new Set(shelf).size).toBe(3);
    }
    expect([0,1,2,8,9,100].map(rerollPrice)).toEqual([2,3,4,10,10,10]);
  });
  it('exposes only public information; policy previews never change the checkpoint',()=>{
    let run=createRun({seed:'policy',characterId:'erxiang',runId:'policy',rulesVersion:'r2'});
    for(let i=0;i<15;i++){
      const view=publicR2View(run),before=JSON.stringify(run);
      for(const key of ['rng','drawPile','deckInstances'])expect(view).not.toHaveProperty(key);
      const action=chooseR2Action(view);expect(JSON.stringify(run)).toBe(before);if(!action)break;
      const cmd={runId:run.runId,commandId:`p-${i}`,expectedSeq:run.commandSeq,action};
      const response=applyCommand(run,cmd),restored=applyCommand(JSON.parse(before) as R2RunState,cmd);
      expect(response.ok).toBe(true);expect(restored).toEqual(response);if(!response.ok)throw new Error(response.code);
      run=response.state;assertRunInvariants(run);
    }
  });
});
