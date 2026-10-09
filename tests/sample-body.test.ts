import {expect,it} from 'vitest';
import {sampleBody} from '../src/audio/sampleBody';
import {inkBurstFrame} from '../src/game/InkBurst';
it('starts at the recorded body rather than truncating a quiet lead and bounds decoded peaks',()=>{
 const c=new Float32Array(1000);c.fill(.00001,0,150);c.fill(.2,150,250);c[170]=1.1;
 const body=sampleBody([c],1000);expect(body.offset).toBeCloseTo(.142);expect(body.gain*1.1).toBeLessThanOrEqual(.800001);
});
it('quiet recordings have a finite gain cap and silence/nonfinite input stays inert',()=>{
 expect(sampleBody([new Float32Array(100).fill(.01)],1000).gain).toBe(3);
 expect(sampleBody([new Float32Array(100).fill(NaN)],1000)).toEqual({offset:0,gain:1});
 expect(sampleBody([],0)).toEqual({offset:0,gain:1});
});
it('bounded ink droplets travel and settle without consuming domain randomness',()=>{
 const start=inkBurstFrame(0,100,100),middle=inkBurstFrame(.5,100,100),end=inkBurstFrame(1,100,100);
 expect(start).toHaveLength(24);expect(start.every(d=>d.x===0&&d.y===0)).toBe(true);expect(middle.some(d=>Math.abs(d.x)>20)).toBe(true);expect(end.every(d=>d.alpha===0&&Number.isFinite(d.y))).toBe(true);expect(inkBurstFrame(.5,100,100)).toEqual(middle);
});
