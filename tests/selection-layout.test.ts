import {it,expect} from 'vitest';
import {selectionLayout} from '../src/game/SelectionLayout';
import {intersects} from '../src/game/layout';
it('six discoverable seats in3x2, independent summary and reachable actions without shrinking page',()=>{
 for(const width of [360,390,430])for(const height of [640,740])for(const bottom of [0,34]){
  const p=selectionLayout(width,height,12,bottom);expect(p.cards).toHaveLength(6);
  expect(new Set(p.cards.map(c=>c.y)).size).toBe(2);expect(new Set(p.cards.map(c=>c.x)).size).toBe(3);
  for(const c of p.cards){expect(c.width).toBeGreaterThan(90);expect(c.height).toBeGreaterThan(90);expect(intersects(c,p.summary)).toBe(false);for(const b of [p.confirm,p.cancel,p.details])expect(intersects(c,b)).toBe(false);}
  for(const b of [p.confirm,p.cancel,p.details]){expect(b.height).toBeGreaterThanOrEqual(44);expect(b.y+b.height).toBeLessThan(height-bottom);}
  expect(p.confirm.height).toBe(56);
 }
});
