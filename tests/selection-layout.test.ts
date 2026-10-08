import {it,expect} from 'vitest';
import {selectionLayout} from '../src/game/SelectionLayout';
import {intersects} from '../src/game/layout';
it('six discoverable seats in3x2, a distinct hero and reachable actions',()=>{
 for(const width of [320,360,390,430])for(const height of [640,740])for(const bottom of [0,34]){
  const p=selectionLayout(width,height,12,bottom);expect(p.cards).toHaveLength(6);
  expect(new Set(p.cards.map(c=>c.y)).size).toBe(2);expect(new Set(p.cards.map(c=>c.x)).size).toBe(3);
  for(const c of p.cards){expect(c.width).toBeGreaterThan(90);expect(c.height).toBeGreaterThanOrEqual(44);expect(intersects(c,p.hero)).toBe(false);for(const b of [p.confirm,p.cancel,p.details])expect(intersects(c,b)).toBe(false);}
  for(const b of [p.confirm,p.cancel,p.details]){expect(b.height).toBeGreaterThanOrEqual(44);expect(b.y+b.height).toBeLessThan(height-bottom);}
  expect(p.confirm.height).toBe(56);
 }
});
it('each hero/route stage reserves controls and keeps choices distinct across PC, narrow and short screens',()=>{
 for(const [width,height] of [[1280,720],[1366,768],[1613,954],[1920,1080],[390,740],[320,740],[740,390],[360,640]])for(const step of ['hero','route'] as const)for(const bottom of [0,34]){
  const p=selectionLayout(width,height,12,bottom,step),choices=step==='hero'?p.cards:p.routes;
  expect(p.hero.height).toBeGreaterThan(80);
  for(const b of [...choices,p.cancel,p.details,p.confirm]){
   expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);
   expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(width);
   expect(b.y+b.height).toBeLessThanOrEqual(height-bottom);expect(intersects(p.hero,b)).toBe(false);
  }
  for(let i=0;i<choices.length;i++)for(let j=i+1;j<choices.length;j++)expect(intersects(choices[i],choices[j])).toBe(false);
 }
});
