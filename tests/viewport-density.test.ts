import {afterEach,expect,it,vi} from 'vitest';
import {viewportMetrics} from '../src/platform/Viewport';
import {crispText} from '../src/game/TextRaster';
afterEach(()=>vi.unstubAllGlobals());
it.each([[390,740,3],[320,568,3],[1366,768,1.25],[1366,768,2],[1920,1080,2],[2560,1440,2]])('uses native effective DPR subject to the bounded pixel budget (%s × %s, %s)',(width,height,dpr)=>{
 vi.stubGlobal('document',{getElementById:()=>({getBoundingClientRect:()=>({width,height})})});vi.stubGlobal('window',{devicePixelRatio:dpr});
 const m=viewportMetrics();expect(m.width).toBe(width);expect(m.height).toBe(height);expect(m.density).toBe(Math.min(dpr,Math.sqrt(9000000/(width*height))));
 expect(m.width*m.height*m.density**2).toBeLessThanOrEqual(9000000.001);
});
it('aligns a centred text bitmap edge, retaining its origin and exact font scale',()=>{
 const text:any={scene:{scale:{zoom:1/3}},style:{resolution:1},x:100.1,y:200.2,displayOriginX:23.5,displayOriginY:0,scaleX:1,scaleY:1,setResolution(n:number){this.style.resolution=n;},setPosition(x:number,y:number){this.x=x;this.y=y;}};
 crispText(text);expect(text.style.resolution).toBe(3);expect((text.x-23.5)*3).toBeCloseTo(Math.round((text.x-23.5)*3));expect(text.y*3).toBeCloseTo(Math.round(text.y*3));expect(text.scaleX).toBe(1);
});
