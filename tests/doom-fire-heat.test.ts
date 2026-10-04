import {describe,it,expect,vi} from 'vitest';
import {createDoomFireSource,propagateDoomFire} from '../src/game/DoomFireHeat';

describe('MIT cosmetic Doom heat adaptation',()=>{
  it('writes exactly the bottom row, including one-column and one-row fields',()=>{
    for(const [w,h] of [[1,1],[1,4],[4,1],[3,2]]){
      const storage=new Float32Array(w*h+2).fill(19),view=storage.subarray(1,-1),fuel=new Float32Array(w).fill(.75);
      createDoomFireSource(view,w,h,fuel);
      expect(storage[0]).toBe(19);expect(storage.at(-1)).toBe(19);
      expect([...view.slice(0,(h-1)*w)]).toEqual(Array((h-1)*w).fill(19));
      expect([...view.slice((h-1)*w)]).toEqual(Array(w).fill(.75));
    }
  });
  it('clamps left drift inside the sampled lower row and writes every destination cell',()=>{
    const source=new Float32Array([0,0,0,.1,.4,.9]),next=new Float32Array(6).fill(NaN);
    propagateDoomFire(source,next,3,2,new Float32Array([.99]),0,.1,new Float32Array([.6,.7,.8]));
    for(const value of next.slice(0,3))expect(value).toBeCloseTo(.8);
    expect([...source]).toEqual([...new Float32Array([0,0,0,.1,.4,.9])]);
    expect([...next.slice(3)]).toEqual([...new Float32Array([.6,.7,.8])]);
  });
  it('is reproducible and cannot consult Math.random',()=>{
    const random=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('Rule/random access forbidden');});
    try{
      const run=()=>{let a=new Float32Array(35),b=new Float32Array(35);for(let step=0;step<30;step++){propagateDoomFire(a,b,7,5,new Float32Array([.03,.8,.2,.99,.4]),step,1.2,new Float32Array(7).fill(.9));[a,b]=[b,a];}return a;};
      expect(run()).toEqual(run());expect(random).not.toHaveBeenCalled();
    }finally{random.mockRestore();}
  });
  it('normalizes invalid thermal inputs without NaN or out-of-range heat',()=>{
    const a=new Float32Array([NaN,Infinity,-2,2]),b=new Float32Array(4).fill(NaN);
    propagateDoomFire(a,b,2,2,new Float32Array([NaN,Infinity]),NaN,NaN,new Float32Array([-1,Infinity]));
    expect([...b].every(v=>Number.isFinite(v)&&v>=0&&v<=1)).toBe(true);
  });
  it('rejects malformed grids and aliased buffers instead of silently corrupting heat',()=>{
    const a=new Float32Array(4),fuel=new Float32Array(2),noise=new Float32Array([0]);
    expect(()=>propagateDoomFire(a,a,2,2,noise,0,1,fuel)).toThrow(RangeError);
    expect(()=>propagateDoomFire(a,new Float32Array(4),3,2,noise,0,1,fuel)).toThrow(RangeError);
    expect(()=>propagateDoomFire(a,new Float32Array(4),2,2,new Float32Array(),0,1,fuel)).toThrow(RangeError);
  });
});
