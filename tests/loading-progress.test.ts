import {expect,it} from 'vitest';
import {LoadingProgress} from '../src/game/LoadingProgress';
it('moves smoothly, never reverses on retries or phase counts, and cannot fabricate completion',()=>{
 const progress=new LoadingProgress(0),samples:number[]=[];
 for(let now=16;now<180000;now+=16)samples.push(progress.sample(now,now<5000?.8:.2,1,false,false));
 expect(samples.at(-1)).toBeLessThan(.97);expect(samples.at(-1)).toBeGreaterThan(.85);
 expect(samples.every((v,i)=>!i||v>=samples[i-1])).toBe(true);
 expect(Math.max(...samples.map((v,i)=>v-(samples[i-1]??0)))).toBeLessThan(.06);
 expect(progress.sample(180001,1,1,true,true)).toBe(1);
});
it('reduced motion uses real decoded changes and stays below 100 until the gate is ready',()=>{
 const progress=new LoadingProgress(0);expect(progress.sample(50000,0,146,false,true)).toBe(0);
 expect(progress.sample(60000,73,146,false,true)).toBe(.48);
 expect(progress.sample(70000,1,146,false,true)).toBe(.48);
 expect(progress.sample(80000,146,146,false,true)).toBe(.96);
 expect(progress.sample(80001,146,146,true,true)).toBe(1);
});
