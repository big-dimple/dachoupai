import {afterEach,describe,expect,it,vi} from 'vitest';
import {Haptics} from '../src/haptics/Haptics';
import {HAPTIC_PREFERENCE_KEY,readHapticPreference} from '../src/haptics/preferences';
import {installHapticSetting} from '../src/haptics/HapticSetting';

const engines:Haptics[]=[];
afterEach(()=>{engines.splice(0).forEach(e=>e.dispose());vi.restoreAllMocks();vi.unstubAllGlobals();});
function setup(saved:unknown=null){
  let now=0;
  const data=new Map<string,string>([['unrelated-run','original checkpoint']]);
  if(saved!==null)data.set(HAPTIC_PREFERENCE_KEY,JSON.stringify(saved));
  const doc=Object.assign(new EventTarget(),{visibilityState:'visible'}),win=new EventTarget();
  const vibrate=vi.fn((_pattern:number|number[])=>true),activation={hasBeenActive:true};
  vi.stubGlobal('document',doc);vi.stubGlobal('window',win);vi.stubGlobal('navigator',{vibrate,userActivation:activation});
  vi.stubGlobal('localStorage',{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)});
  vi.spyOn(performance,'now').mockImplementation(()=>now);
  const engine=new Haptics();engines.push(engine);
  return {engine,doc,win,data,vibrate,activation,at:(value:number)=>{now=value;}};
}

describe('browser capability and independent choice',()=>{
  it('preserves an explicit off preference and never rewrites a checkpoint or motion/audio preference',()=>{
    const f=setup({version:1,enabled:false});
    f.engine.createScope().pickup(true);expect(f.vibrate).not.toHaveBeenCalled();
    expect(f.engine.getState().availability).toBe('disabled');
    f.engine.setEnabled(true);expect(f.data.size).toBe(2);expect(f.data.get('unrelated-run')).toBe('original checkpoint');
    const reload=new Haptics();engines.push(reload);expect(reload.getState().enabled).toBe(true);
    expect(readHapticPreference({version:1,enabled:false})).toBe(false);
    for(const value of [null,{enabled:false},{version:2,enabled:false},{version:1,enabled:'false'}])expect(readHapticPreference(value)).toBe(true);
  });
  it.each([undefined,{}, {userActivation:{hasBeenActive:true}}])('reports unavailable vibration without a substitute on %o',nav=>{
    const f=setup();vi.stubGlobal('navigator',nav);
    expect(f.engine.getState()).toMatchObject({apiSupported:false,availability:'unsupported'});
    expect(()=>f.engine.createScope().settlementArrived('final')).not.toThrow();expect(f.vibrate).not.toHaveBeenCalled();
  });
  it('requires actual sticky activation, and never queues the first held touch for later',()=>{
    const f=setup();f.activation.hasBeenActive=false;
    const first=f.engine.createScope();f.doc.dispatchEvent(new Event('pointerdown'));first.pickup(true);
    expect(f.engine.getState().availability).toBe('needs-activation');expect(f.vibrate).not.toHaveBeenCalled();
    f.activation.hasBeenActive=true;f.doc.dispatchEvent(new Event('pointerup'));
    expect(f.vibrate).not.toHaveBeenCalled();first.pickup(true);expect(f.vibrate).not.toHaveBeenCalled();
    f.engine.createScope().pickup(true);expect(f.vibrate).toHaveBeenCalledExactlyOnceWith([12]);
  });
  it('does not infer activation from an API without activation state',()=>{
    const f=setup();vi.stubGlobal('navigator',{vibrate:f.vibrate});
    expect(f.engine.getState().availability).toBe('activation-unavailable');f.engine.createScope().selectionChanged(true);expect(f.vibrate).not.toHaveBeenCalled();
  });
  it.each(['false','throw'])('API %s cannot interrupt gameplay or become hardware confirmation',mode=>{
    const f=setup();f.vibrate.mockImplementation(()=>{if(mode==='throw')throw Error('denied');return false;});
    expect(()=>f.engine.createScope().settlementArrived('final')).not.toThrow();
    expect(f.engine.getState()).toEqual({apiSupported:true,enabled:true,availability:'ready',preferenceSaved:true});
  });
});

describe('bounded event rhythm',()=>{
  it('touch selection is light, mouse is silent, and a burst is represented by its first beat',()=>{
    const f=setup(),scope=f.engine.createScope();scope.selectionChanged(false);expect(f.vibrate).not.toHaveBeenCalled();
    for(let i=0;i<50;i++){f.at(i);scope.selectionChanged(true);}
    expect(f.vibrate.mock.calls).toEqual([[[6]]]);f.at(90);scope.selectionChanged(true);expect(f.vibrate).toHaveBeenCalledTimes(2);
  });
  it('successful placement and purchase have distinct beats, and duplicate receipts stay silent across scopes',()=>{
    const f=setup(),scope=f.engine.createScope();scope.saved('placement','run-1/seq-8');
    f.at(200);scope.saved('purchase','run-1/seq-9');f.at(400);f.engine.createScope().saved('purchase','run-1/seq-9');
    expect(f.vibrate.mock.calls).toEqual([[[16]],[[12,30,18]]]);
  });
  it('512 arrived chain events produce at most three spaced multiplier beats and one final beat, without a backlog',()=>{
    const f=setup(),scope=f.engine.createScope();
    for(let i=0;i<512;i++){f.at(i*20);scope.multiplierArrived('event-'+i);}
    scope.settlementArrived('final');scope.settlementArrived('final-again');f.at(100_000);scope.multiplierArrived('late');scope.selectionChanged(true);
    expect(f.vibrate.mock.calls).toEqual([[[22]],[[22]],[[22]],[[28,45,36]]]);
  });
  it('stronger arrival may replace a light cue while light and repeated events cannot overwrite the critical rhythm',()=>{
    const f=setup(),scope=f.engine.createScope();scope.pickup(true);scope.multiplierArrived('m');scope.settlementArrived('final');
    const other=f.engine.createScope();f.at(50);other.pickup(true);other.saved('purchase','r/2');other.multiplierArrived('m2');other.settlementArrived('final2');
    expect(f.vibrate.mock.calls).toEqual([[[12]],[[22]],[[28,45,36]]]);
  });
});

describe('cancellation and lifecycle',()=>{
  it('cancel stops the current pattern, is idempotent, and permanently rejects late success/arrival callbacks',()=>{
    const f=setup(),scope=f.engine.createScope();scope.pickup(true);scope.cancel();scope.cancel();f.at(2000);
    scope.saved('purchase','r/2');scope.multiplierArrived('m');scope.settlementArrived('f');
    expect(f.vibrate.mock.calls).toEqual([[[12]],[0]]);
  });
  it('a stale owner cancellation cannot stop a newer owner',()=>{
    const f=setup(),old=f.engine.createScope(),current=f.engine.createScope();old.pickup(true);current.settlementArrived('final');old.cancel();
    expect(f.vibrate.mock.calls).toEqual([[[12]],[[28,45,36]]]);current.cancel();expect(f.vibrate).toHaveBeenLastCalledWith(0);
  });
  it.each(['visibility','pagehide','blur','off','stop','dispose','abort'])('%s stops and invalidates the old generation even after reentry',reason=>{
    const f=setup(),abort=new AbortController(),scope=f.engine.createScope(abort.signal);scope.settlementArrived('final');
    if(reason==='visibility'){f.doc.visibilityState='hidden';f.doc.dispatchEvent(new Event('visibilitychange'));}
    else if(reason==='pagehide'||reason==='blur')f.win.dispatchEvent(new Event(reason));
    else if(reason==='off')f.engine.setEnabled(false);
    else if(reason==='stop')f.engine.stop();else if(reason==='dispose')f.engine.dispose();else abort.abort();
    expect(f.vibrate).toHaveBeenLastCalledWith(0);const count=f.vibrate.mock.calls.length;
    f.doc.visibilityState='visible';f.doc.dispatchEvent(new Event('visibilitychange'));f.engine.setEnabled(true);f.at(2000);
    scope.saved('purchase','late');scope.pickup(true);expect(f.vibrate).toHaveBeenCalledTimes(count);
  });
  it('hidden before any request blocks it, and an already aborted generation never starts',()=>{
    const f=setup();f.doc.visibilityState='hidden';f.engine.createScope().saved('purchase','r/1');
    f.doc.visibilityState='visible';const abort=new AbortController();abort.abort();f.engine.createScope(abort.signal).settlementArrived('final');expect(f.vibrate).not.toHaveBeenCalled();
  });
  it('turning off in another tab stops locally, and storage failure still honors the current choice',()=>{
    const f=setup();f.engine.createScope().pickup(true);f.data.set(HAPTIC_PREFERENCE_KEY,JSON.stringify({version:1,enabled:false}));
    const changed=new Event('storage');Object.defineProperty(changed,'key',{value:HAPTIC_PREFERENCE_KEY});f.win.dispatchEvent(changed);
    expect(f.engine.getState().enabled).toBe(false);expect(f.vibrate).toHaveBeenLastCalledWith(0);
    vi.stubGlobal('localStorage',{setItem:()=>{throw Error('blocked');}});f.engine.setEnabled(false);
    expect(f.engine.getState()).toMatchObject({enabled:false,preferenceSaved:false});
  });
});

it('the visible control preserves off on reload and explains lack of API without claiming hardware success',()=>{
  const f=setup({version:1,enabled:false});
  class Element {
    type='';id='';className='';textContent='';checked=false;disabled=false;onchange:(()=>void)|null=null;
    children:Element[]=[];attrs=new Map<string,string>();remove=vi.fn();
    append(...values:Element[]){this.children.push(...values);}setAttribute(key:string,value:string){this.attrs.set(key,value);}
  }
  Object.assign(f.doc,{createElement:()=>new Element(),createTextNode:()=>new Element()});
  const parent=new Element(),remove=installHapticSetting(parent as unknown as HTMLElement,f.engine),input=parent.children[0].children[0],hint=parent.children[1];
  expect(input.checked).toBe(false);expect(input.disabled).toBe(false);expect(hint.textContent).toContain('已关闭');
  input.checked=true;input.onchange!();expect(f.vibrate).not.toHaveBeenCalled();expect(hint.textContent).toContain('取决于设备');
  vi.stubGlobal('navigator',{});f.doc.dispatchEvent(new Event('pointerup'));expect(input.disabled).toBe(true);expect(hint.textContent).toContain('不提供振动能力');
  remove();expect(input.onchange).toBe(null);expect(parent.children.every(e=>e.remove.mock.calls.length===1)).toBe(true);
});
