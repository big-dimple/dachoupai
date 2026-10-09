import {expect,it} from 'vitest';
import {layout,intersects} from '../src/game/layout';
import {scoreLandingBox} from '../src/game/ScoreLanding';
import {gameToolInventoryBox} from '../src/game/ToolInventoryEntry';
it.each([[1366,768],[1920,1080],[390,740],[320,740],[740,390],[768,1024]])('%s×%s final landing stays in the played workplane, away from readable HUD and live actions',(width,height)=>{
 for(const count of [8,9,14]){
  const l=layout({width,height},{top:0,right:0,bottom:0,left:0},undefined,{count}),b=scoreLandingBox(l);
  expect(b.width).toBeGreaterThan(0);expect(b.height).toBeGreaterThan(0);
  expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(width);expect(b.y+b.height).toBeLessThanOrEqual(height);
  for(const protectedBox of [l.hud,l.scoreBoard,l.hand,l.actions,gameToolInventoryBox(l),...l.slots])expect(intersects(b,protectedBox)).toBe(false);
 }
});
