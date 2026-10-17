import {expect,it} from 'vitest';
import {resultLayout,resultPlacement} from '../src/game/IntermissionLayout';

it.each([[1366,768],[1440,900],[1920,1080]])('centers the actual complete result inside the usable %sx%s viewport',(width,height)=>{
 const p=resultLayout(width,height,0,301),content={y:0,height:381},placed=resultPlacement(60,height-16,content);
 expect(placed.overflow).toBe(0);expect(placed.y+content.height/2).toBe((60+height-16)/2);
 expect(p.w).toBeGreaterThan(900);expect(p.w).toBeLessThan(width-64);
 expect(p.next.x).toBeGreaterThan(p.score.x+p.score.width);expect(p.next.width).toBeGreaterThanOrEqual(280);
});

it('allows an unusually long receipt to reach both its first line and final action without shrinking text',()=>{
 const content={y:0,height:740},start=resultPlacement(84,496,content),end=resultPlacement(84,496,content,99999);
 expect(start.y).toBe(84);expect(start.overflow).toBe(328);expect(end.y+content.height).toBe(496);
 expect(resultPlacement(84,496,content,-100).scroll).toBe(0);
 const resized=resultPlacement(60,828,content,end.scroll);expect(resized.overflow).toBe(0);expect(resized.scroll).toBe(0);expect(resized.y+370).toBe(444);
});

it.each([[320,568],[390,844],[740,320],[1024,768]])('keeps readable touch controls within the %sx%s content width',(width,height)=>{
 const p=resultLayout(width,height,0,340);
 for(const box of [p.score,p.next,p.primary,p.left,p.right]){expect(box.x).toBeGreaterThanOrEqual(12);expect(box.x+box.width).toBeLessThanOrEqual(width-12);expect(box.width).toBeGreaterThan(0);}
 expect(p.primary.height).toBeGreaterThanOrEqual(48);expect(p.left.height).toBeGreaterThanOrEqual(44);
});
