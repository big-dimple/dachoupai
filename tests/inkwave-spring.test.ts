import {it,expect} from 'vitest';
import {inkSettlingEase} from '../src/game/inkwaveSpring';
it('settling ease is finite, deterministic and exactly returns to neutral',()=>{
 const ease=inkSettlingEase(),other=inkSettlingEase();expect(ease(0)).toBe(0);expect(ease(1)).toBe(1);
 for(let i=0;i<=100;i++){const value=ease(i/100);expect(Number.isFinite(value)).toBe(true);expect(value).toBe(other(i/100));expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThan(1.15);}
});
