import {expect,it,vi} from 'vitest';
const preparation=vi.hoisted(()=>vi.fn(async()=>true));vi.mock('../src/game/LoadingScreen',()=>({prepareDestination:preparation}));
import {PaperFlow,paperSceneStart} from '../src/game/PaperFlow';
it('procedural cuts add no animation or extra domain callback',()=>{const createElement=vi.fn();vi.stubGlobal('document',{createElement});const flow=new PaperFlow(()=>false);flow.run({} as HTMLCanvasElement,true);flow.cancel();expect(createElement).not.toHaveBeenCalled();vi.unstubAllGlobals();});
it('enters a destination exactly once after decoding, including duplicate requests',async()=>{
 let done!:(v:boolean)=>void;const shared=new Promise<boolean>(resolve=>done=resolve);preparation.mockReturnValueOnce(shared).mockReturnValueOnce(shared);const start=vi.fn(),scene={game:{},scene:{start,isActive:()=>true}} as never;
 paperSceneStart(scene,'shop',{seed:'old'});paperSceneStart(scene,'shop',{seed:'x'});expect(start).not.toHaveBeenCalled();done(true);await Promise.resolve();await Promise.resolve();expect(start).toHaveBeenCalledExactlyOnceWith('shop',{seed:'x'});
});
it('never starts a retired scene after late completion',async()=>{preparation.mockResolvedValueOnce(true);const start=vi.fn();paperSceneStart({game:{},scene:{start,isActive:()=>false}} as never,'game');await Promise.resolve();expect(start).not.toHaveBeenCalled();});
it('a canceled preparation cannot navigate',async()=>{preparation.mockResolvedValueOnce(false);const start=vi.fn();paperSceneStart({game:{},scene:{start,isActive:()=>true}} as never,'game');await Promise.resolve();expect(start).not.toHaveBeenCalled();});
