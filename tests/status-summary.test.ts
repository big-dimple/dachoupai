import {it,expect} from 'vitest';
import type Phaser from 'phaser';
import {fitStatusSummary} from '../src/game/StatusSummary';
// Fixed 14px glyph measurement, with wrapping at the allocated 112px width.
const measured=(copy:string)=>({text:copy,fontSize:14,x:510,y:353,data:{} as Record<string,string>,get width(){return Math.min(Array.from(this.text).length*14,112);},get height(){return this.text?Math.ceil(Array.from(this.text).length/8)*17:0;},setText(s:string){this.text=s;return this;},setData(k:string,v:string){this.data[k]=v;return this;}});
const area={x:510,y:353,width:112,height:37};
it('a wrapped summary fitting width still falls back when its last line exceeds height',()=>{
 const full='满足0 · 待检查1 · 未满足0 · 点所选条件',text=measured(full);expect(text.width).toBe(area.width);expect(text.height).toBeGreaterThan(area.height);
 fitStatusSummary(text as unknown as Phaser.GameObjects.Text,area,'点所选条件');expect(text.text).toBe('点所选条件');expect(text.data.fullStatus).toBe(full);expect([text.x,text.y,text.fontSize]).toEqual([510,353,14]);
});
it('critical status retains its leading message and fits without changing its type or position',()=>{
 const text=measured('保存失败 · 请先重试，再继续本局操作');fitStatusSummary(text as unknown as Phaser.GameObjects.Text,area);expect(text.text).toMatch(/^保存失败.*…$/);expect(text.height).toBeLessThanOrEqual(area.height);expect(text.width).toBeLessThanOrEqual(area.width);
});
it('already readable text stays complete and a zero-height area draws no clipped glyphs',()=>{
 const text=measured('已选2 / 5');fitStatusSummary(text as unknown as Phaser.GameObjects.Text,area);expect(text.text).toBe('已选2 / 5');fitStatusSummary(text as unknown as Phaser.GameObjects.Text,{...area,height:0});expect(text.text).toBe('');
});
