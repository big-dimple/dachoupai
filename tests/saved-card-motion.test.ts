import {afterEach,expect,it,vi} from 'vitest';
const audio=vi.hoisted(()=>({cancelPresentation:vi.fn()}));
vi.mock('../src/audio/AudioEngine',()=>({AudioEngine:{shared:audio}}));
vi.mock('../src/game/session',()=>({gameSession:()=>({reducedMotion:false,subscribe:()=>vi.fn()})}));
import {mountSavedCardMotion} from '../src/game/SavedCardMotion';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.clearAllMocks();});
function setup(){
 vi.useFakeTimers();const media=Object.assign(new EventTarget(),{matches:false}),win=Object.assign(new EventTarget(),{matchMedia:()=>media}),doc=Object.assign(new EventTarget(),{hidden:false,createElement:()=>({textContent:''})});vi.stubGlobal('window',win);vi.stubGlobal('document',doc);
 const cancel=vi.fn(),face:any={dataset:{},animate:vi.fn(()=>({cancel})),querySelector:()=>({textContent:'2♠'}),replaceChildren:vi.fn(),append:vi.fn()};
 const grid:any={querySelectorAll:()=>[{children:[{querySelector:()=>face}],querySelector:(s:string)=>s==='.tool-change-removed'?{}:null}]},dialog:any={dataset:{}};
 return {cancel,face,grid,dialog,win,media};
}
it('a real removed face disperses once then settles with its exact identity and no manual skip',()=>{const f=setup(),dispose=mountSavedCardMotion(f.dialog,f.grid,false);expect(f.dialog.dataset.animationState).toBe('playing');expect(f.face.animate).toHaveBeenCalledOnce();vi.advanceTimersByTime(440);expect(f.dialog.dataset.animationState).toBe('settled');expect(f.cancel).toHaveBeenCalledOnce();expect(f.face.append.mock.calls[0][0].textContent).toBe('2♠ · 已移除');dispose();expect(f.cancel).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);});
it('close and background cleanup finish immediately, cancel timers and never run a second settle',()=>{const f=setup(),dispose=mountSavedCardMotion(f.dialog,f.grid,false);f.win.dispatchEvent(new Event('blur'));dispose();vi.advanceTimersByTime(1000);expect(f.cancel).toHaveBeenCalledOnce();expect(f.face.append).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);});
it('low motion has no animation or delayed work, while removal still preserves the actual target',()=>{const f=setup();mountSavedCardMotion(f.dialog,f.grid,true);expect(f.face.animate).not.toHaveBeenCalled();expect(f.dialog.dataset.animationState).toBe('settled');expect(f.face.dataset.removed).toBe('true');expect(vi.getTimerCount()).toBe(0);});
