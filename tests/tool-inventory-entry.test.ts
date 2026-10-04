import {describe,it,expect} from 'vitest';
import {createRun} from '../src/domain/run';
import {layout,playedFootprint,intersects} from '../src/game/layout';
import {shopLayout} from '../src/game/ShopLayout';
import {gameToolInventoryBox,toolInventoryPlayedArea,toolInventoryProgressY,shopToolInventoryRow,toolInventoryLabel} from '../src/game/ToolInventoryEntry';
const profiles=[[320,568,0,0],[390,740,0,0],[844,300,12,12],[844,300,12,34],[1280,720,0,0]];
describe('visible tool inventory entry reuses space around existing actions',()=>{
 it.each(profiles)('%s×%s safe%s/%s protects every hand seat, main action, status and current workplane', (width,height,top,bottom)=>{
  for(const count of [8,9,14]){const l=layout({width,height},{top,bottom,left:0,right:0},undefined,{count}),entry=gameToolInventoryBox(l),area=toolInventoryPlayedArea(l),plane=playedFootprint(area,l.mode==='portrait');
   expect(entry.width).toBeGreaterThanOrEqual(44);expect(entry.height).toBe(44);expect(entry.x).toBeGreaterThanOrEqual(0);expect(entry.y).toBeGreaterThanOrEqual(top);expect(entry.x+entry.width).toBeLessThanOrEqual(width);expect(entry.y+entry.height).toBeLessThanOrEqual(height-bottom);
   for(const protectedBox of [l.hand,l.actions,l.scoreBoard,l.status,plane,...l.cards.filter(c=>c.visible).map(c=>c.hit)])expect(intersects(entry,protectedBox)).toBe(false);
   if(l.mode==='landscape'){const y=toolInventoryProgressY(l,l.hud.y+(l.shortLandscape?152:168));expect(y+5+4).toBeLessThanOrEqual(entry.y);}
  }
 });
 it.each(profiles.slice(0,4))('%s×%s retains the published nine-card played mat without resizing the hand layout', (width,height,top,bottom)=>{
  const l=layout({width,height},{top,bottom,left:0,right:0},undefined,{count:9});expect(toolInventoryPlayedArea(l)).toEqual(l.playedArea);
 });
 it('an expanded portrait preview can reserve its tool button without moving any hand seat or main control',()=>{
  const l=layout({width:390,height:740},{top:0,bottom:0,left:0,right:0},undefined,{count:14}),before=JSON.stringify(l),area=toolInventoryPlayedArea(l);
  expect(area.height).toBeGreaterThanOrEqual(72);expect(area.height).toBeLessThan(l.playedArea.height);expect(JSON.stringify(l)).toBe(before);
 });
 it.each(profiles)('%s×%s splits the existing shop tabs without touching goods or purchase/control rows', (width,height,top,bottom)=>{
  const p=shopLayout(width,height,top+12,bottom,3),before=JSON.stringify(p),row=shopToolInventoryRow(p.tabs);expect(intersects(row.inventory,row.shelves)).toBe(false);expect(row.inventory.width).toBe(88);expect(row.inventory.height).toBe(44);expect(row.inventory.x+row.inventory.width).toBe(p.tabs.x+p.tabs.width);
  for(const pager of [0,44]){const width=(row.shelves.width-pager-6*(pager?3:2))/3;expect(width).toBeGreaterThanOrEqual(44);}
  for(const b of [...p.shelf,p.reroll,p.play,p.build])expect(intersects(row.inventory,b)).toBe(false);expect(JSON.stringify(p)).toBe(before);
 });
 it('count and capacity derive from current inventory/modifiers, including zero and saved long-term expansion',()=>{
  const s=createRun({seed:'tool-entry',runId:'fixture/tool-entry',characterId:'amo',rulesVersion:'r2'});expect(toolInventoryLabel(s)).toBe('工具 0/2');s.consumables=[{instanceId:'owned/a',definitionId:'T07'}];expect(toolInventoryLabel(s)).toBe('工具 1/2');s.longTermItems=['U07'];expect(toolInventoryLabel(s)).toBe('工具 1/3');s.consumables=[];expect(toolInventoryLabel(s)).toBe('工具 0/3');
 });
});
