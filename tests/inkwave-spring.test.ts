import {it,expect} from 'vitest';
import {inkSettlingEase,InkSpring,OWNED_SCORE_SPRING} from '../src/game/inkwaveSpring';
it('settling ease is finite, deterministic and exactly returns to neutral',()=>{
 const ease=inkSettlingEase(),other=inkSettlingEase();expect(ease(0)).toBe(0);expect(ease(1)).toBe(1);
 for(let i=0;i<=100;i++){const value=ease(i/100);expect(Number.isFinite(value)).toBe(true);expect(value).toBe(other(i/100));expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThan(1.15);}
});
it('hitches clamp elapsed time, retain stable substeps and cannot poison the spring',()=>{
 const spring=new InkSpring(),normal=new InkSpring();
 expect(spring.step(30)).toBe(normal.step(.1));expect(spring.step(NaN)).toBe(spring.x);expect(spring.step(-1)).toBe(spring.x);
 for(let i=0;i<100;i++)spring.step(2);expect(Math.abs(spring.x)).toBeLessThan(.001);expect(Number.isFinite(spring.v)).toBe(true);
});
it('an actual spring reverses velocity at the declared rebound and settles',()=>{
 const {value,reboundAt}=OWNED_SCORE_SPRING;expect(value(0)).toBe(1);expect(value(1)).toBe(0);expect(value(reboundAt)).toBeLessThan(-.4);
 expect(value(reboundAt)).toBeLessThan(value(reboundAt-.02));expect(value(reboundAt)).toBeLessThan(value(reboundAt+.02));expect(Math.abs(value(.99))).toBeLessThan(.04);
});
