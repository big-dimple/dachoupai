import {afterEach,expect,it,vi} from 'vitest';
vi.mock('../src/game/portraits',()=>({heroEyesURL:()=>'/assets/touye.eyes.webp'}));
vi.mock('../src/game/session',()=>({gameSession:()=>({reducedMotion:false})}));
import {mountHeroDecisionEyes} from '../src/game/HeroDecisionEyes';
afterEach(()=>vi.unstubAllGlobals());
function setup(){
 let decoded!:()=>void;const animation={cancel:vi.fn()},image:any={dataset:{},style:{},isConnected:true,setAttribute:vi.fn(),remove:vi.fn(),decode:()=>new Promise<void>(r=>decoded=r),animate:vi.fn(()=>animation)},header={classList:{add:vi.fn(),remove:vi.fn()},append:vi.fn()},dialog=Object.assign(new EventTarget(),{open:true,querySelector:()=>header});
 vi.stubGlobal('document',{createElement:()=>image});vi.stubGlobal('window',{matchMedia:()=>({matches:false})});return{dialog:dialog as unknown as HTMLDialogElement,image,header,animation,decode:async()=>{decoded();await Promise.resolve();}};
}
it.each(['discard-choice','target-choice','confirm-target'] as const)('%s is a short decoded eye response, never a scored value or a target overlay',async phase=>{
 const f=setup();mountHeroDecisionEyes(f.dialog,phase);expect(f.image.src).toBe('/assets/touye.eyes.webp');expect(f.image.dataset.decisionPhase).toBe(phase);expect(f.image.animate).not.toHaveBeenCalled();await f.decode();expect(f.image.animate).toHaveBeenCalledOnce();expect(f.header.append).toHaveBeenCalledExactlyOnceWith(f.image);f.dialog.dispatchEvent(new Event('close'));expect(f.animation.cancel).toHaveBeenCalledOnce();
});
it('closing before decode prevents a stale eye animation and reduced motion stays static',async()=>{
 const old=setup();mountHeroDecisionEyes(old.dialog,'discard-choice');old.dialog.dispatchEvent(new Event('close'));await old.decode();expect(old.image.animate).not.toHaveBeenCalled();
 const reduced=setup();mountHeroDecisionEyes(reduced.dialog,'target-choice',true);await reduced.decode();expect(reduced.image.animate).not.toHaveBeenCalled();expect(reduced.image.style.opacity).toBe('.8');
});
