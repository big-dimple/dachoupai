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
 it('keeps destructive glass risk and both independent lucky gains visible, with detailed exceptions separate',()=>{
  const glass=toolInfo('T12'),lucky=toolInfo('T19');
  for(const text of ['计分','倍率×1.5','结算后','1/4','永久破碎'])expect(glass.summary).toContain(text);
  expect(glass.summary).not.toMatch(/失败手|下限|原实例/);expect(glass.description).toContain('失败手也判定');expect(glass.description).toContain('低于主动删牌下限');
  for(const text of ['每次计分','1/5','倍率+4','1/15','+10金','每手最多20金'])expect(lucky.summary).toContain(text);
  expect(lucky.summary).not.toMatch(/达到上限仍|不增加热度|两项独立判定/);expect(lucky.description).toContain('两项独立判定');expect(lucky.description).toContain('达到上限仍判定');
 });
 it('distinguishes held gains, stage cash, retrigger and persistent expansion',()=>{
  expect(toolInfo('T13').summary).toMatch(/留在手中.*倍率\+1/);
  expect(toolInfo('T14').summary).toMatch(/留在手中过关\+1金.*每场最多5金/);
  expect(toolInfo('T15').summary).toContain('额外计分1次');
  expect(toolInfo('S06').summary).not.toContain('普通');
  expect(toolInfo('S08').summary).toContain('下一场起，永久手牌上限+1');
 });
 it('keeps each long-term timing and complete contract separate from the purchase price',()=>{
  for(const item of R2_LONG_TERM_ITEMS){const info=itemInfo(item.id);expect(info.summary).not.toMatch(/基准售价|不可出售|不可重复/);expect(info.description).toContain('本局持续生效');expect(info.summary.length).toBeGreaterThan(0);}
 });
});
