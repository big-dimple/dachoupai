import {it,expect} from 'vitest';
import {shopLayout} from '../src/game/ShopLayout';
import {intersects} from '../src/game/layout';
it('three visible modest 5:7 goods, separate readable copy, inventory below, one main action row',()=>{
 for(const width of [360,390,430,1024,1280])for(const height of [640,740])for(const bottom of [0,34]){
  const l=shopLayout(width,height,8,bottom,3);expect(l.shelf).toHaveLength(3);
  for(const b of l.shelf){expect(b.width).toBeGreaterThanOrEqual(88);expect(b.width).toBeLessThanOrEqual(108);expect(b.height/b.width).toBeCloseTo(1.4);expect(b.y+b.height+76).toBeLessThan(l.slots[0].y-18);expect(intersects({...b,height:b.height+76},l.reroll)).toBe(false);}
  expect(l.slots.every(b=>Math.abs(b.height/b.width-1.4)<1e-6)).toBe(true);
  expect(l.play.y).toBeGreaterThan(l.reroll.y+l.reroll.height);expect(l.play.y+l.play.height).toBeLessThan(height-bottom);expect(l.play.height).toBeGreaterThanOrEqual(48);
  expect(l.slots[0].y+l.slots[0].height).toBeLessThan(l.reroll.y);
 }
});

it('short landscape has three discoverable goods/copy clear of every action through safe34',()=>{
 for(const bottom of [0,12,34]){const l=shopLayout(844,300,12,bottom,3);
  const toolbar={x:684,y:l.top,width:148,height:44};
  expect(l.tabs.y-toolbar.y-toolbar.height).toBeGreaterThanOrEqual(4);
  expect(intersects(l.tabs,toolbar)).toBe(false);
  expect(l.shelf).toHaveLength(3);for(const b of l.shelf){const seat=(l.tabs.width-16)/3,tile={...b,width:seat-2};
   expect(b.y-l.tabs.y-l.tabs.height).toBeGreaterThanOrEqual(2);
   expect(intersects(tile,toolbar)).toBe(false);expect(intersects(tile,l.tabs)).toBe(false);
   for(const action of [l.play,l.reroll,l.build])expect(intersects(tile,action)).toBe(false);expect(b.y+b.height).toBeLessThan(300-bottom);
  }
  for(const b of l.slots)for(const a of [l.play,l.reroll,l.build])expect(intersects(b,a)).toBe(false);expect(l.play.height).toBe(56);
 }
});
