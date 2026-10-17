import {afterEach,expect,it,vi} from 'vitest';
import {viewportMetrics,FRAMEBUFFER_PIXELS,installViewport} from '../src/platform/Viewport';
import {crispText,prepareTextScale} from '../src/game/TextRaster';
afterEach(()=>vi.unstubAllGlobals());
it.each([1,1.25])('keeps native canvas pointer coordinates aligned after CSS resize at DPR%s',dpr=>{
 let width=320,height=568,resized!:()=>void;
 const canvas={style:{width:'320px',height:'568px'},getBoundingClientRect(){return {width:parseFloat(this.style.width),height:parseFloat(this.style.height)};}};
 const displayScale={x:dpr,y:dpr,set(x:number,y:number){this.x=x;this.y=y;}};
 const scale={width:Math.ceil(width*dpr),height:Math.ceil(height*dpr),zoom:1/dpr,baseSize:{width:Math.ceil(width*dpr),height:Math.ceil(height*dpr)},canvasBounds:{width:320,height:568},displayScale,
  updateBounds(){this.canvasBounds=canvas.getBoundingClientRect();},
  resize(w:number,h:number){this.width=w;this.height=h;this.baseSize={width:w,height:h};this.updateBounds();displayScale.set(w/this.canvasBounds.width,h/this.canvasBounds.height);}
 };
 vi.stubGlobal('document',{getElementById:()=>({getBoundingClientRect:()=>({width,height})})});
 vi.stubGlobal('window',{devicePixelRatio:dpr,addEventListener:vi.fn(),matchMedia:()=>({addEventListener:vi.fn()})});
 vi.stubGlobal('ResizeObserver',class {constructor(callback:()=>void){resized=callback;}observe(){}disconnect(){}});
 installViewport({canvas,scale,events:{once:vi.fn()}} as any);
 width=390;height=740;resized();
 expect(195*displayScale.x).toBeCloseTo(scale.baseSize.width/2);
 expect(370*displayScale.y).toBeCloseTo(scale.baseSize.height/2);
 resized(); // The already-sized branch must preserve the same native mapping.
 expect(195*displayScale.x).toBeCloseTo(scale.baseSize.width/2);
 expect(370*displayScale.y).toBeCloseTo(scale.baseSize.height/2);
});
it.each([[390,740,3],[320,568,3],[1366,768,1.25],[1366,768,2],[1920,1080,2],[2560,1440,2]])('uses native effective DPR subject to the bounded pixel budget (%s × %s, %s)',(width,height,dpr)=>{
 vi.stubGlobal('document',{getElementById:()=>({getBoundingClientRect:()=>({width,height})})});vi.stubGlobal('window',{devicePixelRatio:dpr});
 const m=viewportMetrics();expect(m.width).toBe(width);expect(m.height).toBe(height);expect(m.density).toBe(Math.min(dpr,Math.sqrt(9000000/(width*height))));
 expect(m.width*m.height*m.density**2).toBeLessThanOrEqual(9000000.001);
});
it.each([[5120,2880,1],[7680,4320,1],[8192,4320,2],[8191,4321,3],[3841,2161,3]])('bounds actual integer allocation at %s×%s DPR%s without imposing a 1x minimum',(width,height,dpr)=>{
 vi.stubGlobal('document',{getElementById:()=>({getBoundingClientRect:()=>({width,height})})});vi.stubGlobal('window',{devicePixelRatio:dpr});
 const m=viewportMetrics(),allocation=Math.ceil(m.width*m.density)*Math.ceil(m.height*m.density);
 expect(allocation).toBeLessThanOrEqual(FRAMEBUFFER_PIXELS);expect(m.width).toBe(width);expect(m.height).toBe(height);
 if(width*height>FRAMEBUFFER_PIXELS)expect(m.density).toBeLessThan(1);
 expect(allocation).toBeGreaterThan(FRAMEBUFFER_PIXELS*.999);
});
it('aligns a centred text bitmap edge, retaining its origin and exact font scale',()=>{
 const text:any={scene:{scale:{zoom:1/3}},style:{resolution:1},x:100.1,y:200.2,displayOriginX:23.5,displayOriginY:0,scaleX:1,scaleY:1,setResolution(n:number){this.style.resolution=n;},setPosition(x:number,y:number){this.x=x;this.y=y;}};
 crispText(text);expect(text.style.resolution).toBe(3);expect((text.x-23.5)*3).toBeCloseTo(Math.round((text.x-23.5)*3));expect(text.y*3).toBeCloseTo(Math.round(text.y*3));expect(text.scaleX).toBe(1);
});
it('prepares peak-scale text pixels once and keeps framebuffer alignment without demoting the bitmap',()=>{
 const data=new Map(),resolution=vi.fn(),text:any={scene:{scale:{zoom:1}},style:{resolution:1},x:100.1,y:200.2,displayOriginX:23.5,displayOriginY:17,scaleX:1,scaleY:1,setData(k:string,v:any){data.set(k,v);return this;},getData:(k:string)=>data.get(k),setResolution(n:number){this.style.resolution=n;resolution(n);},setPosition(x:number,y:number){this.x=x;this.y=y;}};
 prepareTextScale(text,1.54);expect(text.style.resolution).toBe(2);text.scaleX=text.scaleY=1.54;crispText(text);crispText(text);
 expect(resolution).toHaveBeenCalledOnce();expect(text.style.resolution).toBeGreaterThanOrEqual(1.54);expect(text.x-23.5*1.54).toBeCloseTo(Math.round(text.x-23.5*1.54));expect(text.y-17*1.54).toBeCloseTo(Math.round(text.y-17*1.54));
});
