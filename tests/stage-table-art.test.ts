import {expect,it} from 'vitest';
import {layout,intersects,type Box} from '../src/game/layout';
import {gameToolInventoryBox} from '../src/game/ToolInventoryEntry';
import {stageTableArtPlan} from '../src/game/StageTableArt';
const profiles=[[1366,768],[390,740],[320,740],[1920,1080],[740,390],[768,1024]] as const;
it.each(profiles)('%s×%s decoration stays within the viewport without changing any seat or target', (width,height)=>{
 for(const count of [8,9,14]){const l=layout({width,height},{top:0,right:0,bottom:0,left:0},undefined,{count}),before=structuredClone(l),p=stageTableArtPlan(l);
  for(const b of Object.values(p) as Box[]){expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.width).toBeGreaterThan(0);expect(b.height).toBeGreaterThan(0);expect(b.x+b.width).toBeLessThanOrEqual(width+.001);expect(b.y+b.height).toBeLessThanOrEqual(height+.001);}
  expect(l).toEqual(before);expect(p.hand.y).toBeLessThanOrEqual(l.hand.y);expect(p.hand.y+p.hand.height).toBeGreaterThanOrEqual(l.hand.y+l.hand.height);
  if(p.portrait)for(const protectedBox of [l.hud,l.scoreBoard,gameToolInventoryBox(l),l.hand,l.actions,l.playedArea,...l.slots])expect(intersects(p.portrait,protectedBox)).toBe(false);
 }
});
it('tight/rotated screens never squeeze a decorative character into playable space',()=>{
 for(const [width,height,top,bottom] of [[320,568,0,0],[740,390,12,12],[1366,560,12,34]]){const l=layout({width,height},{top,right:0,bottom,left:0},undefined,{count:14});expect(stageTableArtPlan(l).portrait).toBeUndefined();}
});
