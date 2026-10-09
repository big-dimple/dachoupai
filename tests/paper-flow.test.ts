import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('../src/game/session',()=>({gameSession:()=>({reducedMotion:false})}));
import {PaperFlow,paperSceneStart} from '../src/game/PaperFlow';
let raf:Map<number,FrameRequestCallback>,next:number,removed:number,host:EventTarget;
let canvas:HTMLCanvasElement;
beforeEach(()=>{
 vi.useFakeTimers();raf=new Map();next=0;removed=0;host=new EventTarget();
 const ctx={scale(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){}};
 vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{raf.set(++next,fn);return next;});
 vi.stubGlobal('cancelAnimationFrame',(id:number)=>raf.delete(id));
 vi.stubGlobal('window',Object.assign(new EventTarget(),{devicePixelRatio:1,matchMedia:()=>({matches:false})}));
 vi.stubGlobal('document',Object.assign(host,{hidden:false,body:{append:vi.fn()},createElement:()=>({style:{},setAttribute(){},getContext:()=>ctx,remove(){removed++;}})}));
 canvas={getBoundingClientRect:()=>({left:0,top:0,width:390,height:740})} as HTMLCanvasElement;
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('replacing a visual invalidates a stale rAF without removing the current layer',()=>{
 const flow=new PaperFlow(()=>false);flow.run(canvas);const stale=[...raf.values()][0];flow.run(canvas);expect(removed).toBe(1);const count=raf.size;
 stale(performance.now()+80);expect(removed).toBe(1);expect(raf.size).toBe(count);flow.cancel();expect(removed).toBe(2);expect(raf.size).toBe(0);
});
it('starved frames finish once and remove every listener without any business callback',()=>{
 const flow=new PaperFlow(()=>false);flow.run(canvas);vi.advanceTimersByTime(600);expect(removed).toBe(1);expect(raf.size).toBe(0);
 host.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('resize'));flow.cancel();expect(removed).toBe(1);
});
it('reduced motion skips a layer and changing preference cancels the active layer',()=>{
 let reduced=true;const flow=new PaperFlow(()=>reduced);flow.run(canvas);expect(raf.size).toBe(0);reduced=false;flow.run(canvas);reduced=true;
 [...raf.values()][0](performance.now()+10);expect(removed).toBe(1);expect(raf.size).toBe(0);
});
it.each(['blur','resize','visibilitychange'])('%s retires visual immediately',event=>{
 const flow=new PaperFlow(()=>false);flow.run(canvas);(event==='visibilitychange'?host:window).dispatchEvent(new Event(event));expect(removed).toBe(1);expect(raf.size).toBe(0);
});
it('route is immediate once; visual cancellation never repeats it',()=>{
 const start=vi.fn(),events={once:vi.fn()};paperSceneStart({scene:{start},game:{canvas,events}} as never,'shop',{seed:'x'});
 expect(start).toHaveBeenCalledExactlyOnceWith('shop',{seed:'x'});window.dispatchEvent(new Event('blur'));vi.advanceTimersByTime(1000);expect(start).toHaveBeenCalledTimes(1);
});
