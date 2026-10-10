import {describe,it,expect} from 'vitest';
import {R2_TOOLS,R2_LONG_TERM_ITEMS} from '../src/content/r2Tools';
import {toolInfo,itemInfo,goodsArtPortrait} from '../src/game/r2ToolInfo';
import {handLevelChangeText} from '../src/game/ToolChangePreview';
describe('shared first-layer card purpose',()=>{
 it('covers each real consumable operation, retaining complete rules separately',()=>{
  for(const tool of R2_TOOLS){const info=toolInfo(tool.id);expect(info.summary.length).toBeGreaterThan(0);expect(info.summary).not.toMatch(/手绘卡面|机制示意|已确定的计分|回看保持|商店基准售价/);expect(info.description.length).toBeGreaterThan(0);expect(info.cost.length).toBeGreaterThan(0);expect(goodsArtPortrait(info)).not.toHaveProperty('caption');}
 });
 it('uses the requested upgrade purpose and reads actual pair base progression',()=>{
  expect(toolInfo('T01').summary).toBe('给一种牌型升级');expect(handLevelChangeText('pair',1,2)).toContain('基础热度 35 → 50；基础倍率 2 → 2.5');
 });
 it('keeps each long-term timing and complete contract separate from the purchase price',()=>{
  for(const item of R2_LONG_TERM_ITEMS){const info=itemInfo(item.id);expect(info.summary).not.toMatch(/基准售价|不可出售|不可重复/);expect(info.description).toContain('本局持续生效');expect(info.summary.length).toBeGreaterThan(0);}
 });
});
