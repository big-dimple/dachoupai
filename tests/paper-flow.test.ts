import {expect,it,vi} from 'vitest';
import {PaperFlow,paperSceneStart} from '../src/game/PaperFlow';

it('normal/full/reduced cuts allocate no overlay, animation frame, timer or listener',()=>{
 const createElement=vi.fn(),raf=vi.fn();vi.stubGlobal('document',{createElement});vi.stubGlobal('requestAnimationFrame',raf);
 for(const reduced of [false,true])for(const full of [false,true]){const flow=new PaperFlow(()=>reduced);flow.run({} as HTMLCanvasElement,full);flow.cancel();flow.cancel();}
 expect(createElement).not.toHaveBeenCalled();expect(raf).not.toHaveBeenCalled();vi.unstubAllGlobals();
});
it.each([false,true])('route commits once immediately, full=%s; cancellation cannot repeat it',full=>{
 const start=vi.fn();paperSceneStart({scene:{start}} as never,'shop',{seed:'x'},full);
 expect(start).toHaveBeenCalledExactlyOnceWith('shop',{seed:'x'});
 const flow=new PaperFlow(()=>false);flow.cancel();flow.run({} as HTMLCanvasElement,full);expect(start).toHaveBeenCalledTimes(1);
});
it('a cut without data preserves Phaser normal route arguments',()=>{const start=vi.fn();paperSceneStart({scene:{start}} as never,'game');expect(start).toHaveBeenCalledExactlyOnceWith('game');});
