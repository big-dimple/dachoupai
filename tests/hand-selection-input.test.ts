import type Phaser from 'phaser';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {HandSelectionInput} from '../src/game/HandSelectionInput';
import type {HandSelectionUpdate} from '../src/game/HandSelectionGesture';

const modal=vi.hoisted(()=>({open:false}));
vi.mock('../src/game/DetailDialog',()=>({modalBlocksCanvas:()=>modal.open}));
class Pointer extends Event {
  pointerId=1;pointerType='mouse';isPrimary=true;button=0;buttons=1;clientX=60;clientY=160;relatedTarget:EventTarget|null=null;stopped=false;
  constructor(type:string,values:Partial<Pointer>={}){super(type,{cancelable:true});Object.assign(this,values);}
  override stopPropagation():void {this.stopped=true;super.stopPropagation();}
}
class Surface extends EventTarget {
  className='';hidden=false;style={};readonly captures=new Set<number>();
  setAttribute():void {}
  focus():void {}
  remove=vi.fn();
  setPointerCapture(id:number):void {this.captures.add(id);}
  hasPointerCapture(id:number):boolean {return this.captures.has(id);}
  releasePointerCapture(id:number):void {this.captures.delete(id);this.dispatchEvent(new Pointer('lostpointercapture',{pointerId:id}));}
  getBoundingClientRect(){return {left:0,top:0,width:400,height:300};}
}
let win:EventTarget&{innerWidth:number;innerHeight:number},doc:EventTarget&{hidden:boolean;body:{append:()=>void};createElement:()=>Surface;querySelector:()=>object|null};
const inputs:HandSelectionInput[]=[];
beforeEach(()=>{
  vi.useFakeTimers();modal.open=false;
  win=Object.assign(new EventTarget(),{innerWidth:400,innerHeight:300});
  doc=Object.assign(new EventTarget(),{hidden:false,body:{append:()=>{}},createElement:()=>new Surface(),querySelector:()=>modal.open?{}:null});
  vi.stubGlobal('window',win);vi.stubGlobal('document',doc);
});
afterEach(()=>{inputs.splice(0).forEach(input=>input.destroy());vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();});

function setup(initial=['h'],twoRows=false){
  const scene={game:{canvas:new Surface()},scale:{width:400,height:300,zoom:1},input:{enabled:true}},updates:HandSelectionUpdate[]=[];
  let selected=new Set(initial),canvasPressed=false;
  const detail=vi.fn(),pointerCard=vi.fn(),cancelCanvas=vi.fn(()=>{canvasPressed=false;});
  const input=new HandSelectionInput(scene as unknown as Phaser.Scene,{ready:()=>true,cards:()=>Array.from('abcdefgh',(id,i)=>({id,x:(twoRows?i%4:i)*40,y:100+(twoRows?Math.floor(i/4)*60:0),width:40,height:twoRows?60:120})),selected:()=>selected,
    update:update=>{updates.push(update);selected=new Set(update.selectedIds);},hover:vi.fn(),detail,cancelCanvas,pointerCard});
  inputs.push(input);input.setBounds({x:0,y:100,width:twoRows?160:320,height:120},twoRows);
  const surface=input.surface as unknown as Surface;
  // Native capture phase runs on window before the surface receives an event.
  const send=(type:string,values:Partial<Pointer>={},onSurface=true)=>{
    const event=new Pointer(type,values);win.dispatchEvent(event);if(onSurface&&!event.stopped)surface.dispatchEvent(event);return event;
  };
  const sweep=(pointerType='mouse')=>{send('pointerdown',{pointerType});send('pointermove',{pointerType,clientX:140});};
  return {scene,input,surface,updates,detail,pointerCard,send,sweep,selection:()=>[...selected],pressCanvas:()=>{canvasPressed=true;},canvasPressed:()=>canvasPressed};
}

describe('hand native contact lifecycle',()=>{
  it.each(['mouse','touch'])('anchors future keyboard navigation to the actual accepted %s card without selecting on down',pointerType=>{
    const f=setup();f.send('pointerdown',{pointerType,clientX:140});expect(f.pointerCard).toHaveBeenCalledExactlyOnceWith('d');expect(f.selection()).toEqual(['h']);
    f.send('pointerup',{pointerType,clientX:140});expect(f.selection()).toEqual(['d','h']);
  });
  it.each(['outside','viewport','pointerleave'])('%s freezes applied selection, consumes release, and cannot resume on reentry',kind=>{
    const f=setup();f.sweep();expect(f.selection()).toEqual(['b','c','d','h']);
    if(kind==='pointerleave')f.send('pointerleave');
    else f.send('pointermove',{clientX:kind==='viewport'?401:350});
    expect(f.updates.at(-1)).toMatchObject({phase:'interrupted',reason:kind==='pointerleave'?'outside':kind});
    f.send('pointermove',{clientX:260});expect(f.selection()).toEqual(['b','c','d','h']);expect(f.scene.input.enabled).toBe(false);
    f.pressCanvas();const release=f.send('pointerup',{clientX:350},false);
    expect(release.stopped).toBe(true);expect(f.canvasPressed()).toBe(false);expect(f.input.active).toBe(false);expect(f.scene.input.enabled).toBe(true);
    f.send('pointerdown',{clientX:220});f.send('pointerup',{clientX:220});expect(f.selection()).toEqual(['b','c','d','f','h']);
  });

  it('pending departure and vertical pan never become taps or long-press details',()=>{
    const f=setup();f.send('pointerdown');f.send('pointerout',{},false);vi.advanceTimersByTime(400);f.send('pointerup');
    expect(f.selection()).toEqual(['h']);expect(f.detail).not.toHaveBeenCalled();
    f.send('pointerdown',{pointerType:'touch'});f.send('pointermove',{pointerType:'touch',clientY:180});
    expect(f.updates.at(-1)).toMatchObject({phase:'interrupted',reason:'vertical',visitedIds:[]});
    f.send('pointercancel',{pointerType:'touch'});expect(f.selection()).toEqual(['h']);expect(f.scene.input.enabled).toBe(true);
  });

  it('capture loss preserves selection and suppression until physical release',()=>{
    const f=setup();f.sweep();f.surface.releasePointerCapture(1);
    expect(f.updates.at(-1)?.reason).toBe('capture');expect(f.scene.input.enabled).toBe(false);expect(f.input.active).toBe(true);
    f.send('pointermove',{clientX:220});f.send('pointerup',{clientX:220});expect(f.selection()).toEqual(['b','c','d','h']);expect(f.input.active).toBe(false);
  });

  it('system cancellation preserves selection, ends that physical contact, and accepts another tap',()=>{
    const f=setup();f.sweep();f.send('pointercancel');expect(f.selection()).toEqual(['b','c','d','h']);expect(f.input.active).toBe(false);
    f.send('pointerdown',{clientX:140});f.send('pointerup',{clientX:140});expect(f.selection()).toEqual(['b','c','h']);
  });

  it.each([false,true])('multitouch retains both physical locks until termination (owner first: %s)',ownerFirst=>{
    const f=setup();f.sweep('touch');const second=f.send('pointerdown',{pointerId:2,pointerType:'touch',isPrimary:false,clientX:220});
    expect(second.stopped).toBe(true);expect(f.updates.at(-1)?.reason).toBe('multitouch');expect(f.selection()).toEqual(['b','c','d','h']);
    f.send('pointerup',{pointerId:ownerFirst?1:2,pointerType:'touch'},false);expect(f.scene.input.enabled).toBe(false);
    f.send('pointercancel',{pointerId:ownerFirst?2:1,pointerType:'touch'},false);expect(f.scene.input.enabled).toBe(true);expect(f.input.active).toBe(false);
  });

  it('a primary pointer of another type is a second contact, not evidence of a stale release',()=>{
    const f=setup();f.sweep('mouse');f.send('pointerdown',{pointerId:2,pointerType:'touch',isPrimary:true});
    f.send('pointerup',{pointerId:2,pointerType:'touch'},false);expect(f.input.active).toBe(true);expect(f.scene.input.enabled).toBe(false);
    f.send('pointerup',{},false);expect(f.selection()).toEqual(['b','c','d','h']);expect(f.input.active).toBe(false);
  });

  it.each(['mouse','touch'])('a fresh primary %s press recovers a release missed outside the viewport',pointerType=>{
    const f=setup();f.sweep(pointerType);f.send('pointermove',{pointerType,clientX:401});
    f.send('pointerdown',{pointerType,pointerId:2,clientX:140});f.send('pointerup',{pointerType,pointerId:2,clientX:140});
    expect(f.selection()).toEqual(['b','c','h']);expect(f.input.active).toBe(false);expect(f.scene.input.enabled).toBe(true);
  });

  it('zero-button return clears its stale contact without allowing another pen to unlock it',()=>{
    const f=setup();f.sweep('pen');f.surface.releasePointerCapture(1);
    f.send('pointermove',{pointerType:'pen',pointerId:2,isPrimary:false,buttons:0});expect(f.input.active).toBe(true);
    f.send('pointermove',{pointerType:'pen',buttons:0});expect(f.input.active).toBe(false);expect(f.scene.input.enabled).toBe(true);
    expect(f.selection()).toEqual(['b','c','d','h']);
  });

  it.each(['blur','hidden'])('%s releases capture but retains the contact lock until fresh input proves release',kind=>{
    const f=setup();f.sweep();
    if(kind==='blur')win.dispatchEvent(new Event('blur'));else {doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));}
    expect(f.surface.hasPointerCapture(1)).toBe(false);expect(f.input.active).toBe(true);expect(f.scene.input.enabled).toBe(false);
    f.send('pointerdown',{clientX:140});f.send('pointerup',{clientX:140});expect(f.selection()).toEqual(['b','c','h']);expect(f.input.active).toBe(false);
  });

  it('reset/resize/modal preserve applied selection while explicit Escape alone restores the snapshot',()=>{
    const f=setup();f.sweep();f.input.cancel();f.send('pointerup');expect(f.selection()).toEqual(['b','c','d','h']);
    f.send('pointerdown',{clientX:140});f.send('pointermove',{clientX:100});f.input.setBounds({x:0,y:100,width:320,height:120});f.send('pointerup');expect(f.selection()).toEqual(['b','h']);
    f.sweep();f.input.cancel('escape');f.send('pointerup');expect(f.selection()).toEqual(['b','h']);expect(f.updates.at(-1)?.reason).toBe('escape');
    f.sweep();modal.open=true;doc.dispatchEvent(new Event('focusin'));f.send('pointerup');expect(f.selection()).toEqual(['h']);
  });

  it('holding opens detail without toggling, and destruction removes timers/capture/listeners',()=>{
    const f=setup();f.send('pointerdown');vi.advanceTimersByTime(355);expect(f.detail).toHaveBeenCalledExactlyOnceWith('b');
    f.send('pointerup');expect(f.selection()).toEqual(['h']);
    f.send('pointerdown');f.input.destroy();const count=f.updates.length;vi.advanceTimersByTime(400);f.send('pointerup');
    expect(f.updates).toHaveLength(count);expect(f.detail).toHaveBeenCalledTimes(1);expect(f.surface.captures.size).toBe(0);expect(f.scene.input.enabled).toBe(true);
  });

  it('an outside first contact followed by a nonprimary hand contact clears the earlier Canvas press',()=>{
    const f=setup();f.send('pointerdown',{pointerType:'touch',clientX:350},false);f.pressCanvas();
    f.send('pointerdown',{pointerId:2,pointerType:'touch',isPrimary:false});expect(f.canvasPressed()).toBe(false);expect(f.selection()).toEqual(['h']);
    f.send('pointerup',{pointerId:2,pointerType:'touch'});f.send('pointerup',{pointerType:'touch'},false);expect(f.input.active).toBe(false);
  });
  it('owns two-row vertical touch, clears the hold timer and restores one-row panning',()=>{
    const f=setup([],true);expect(f.surface.style).toMatchObject({touchAction:'none'});
    f.send('pointerdown',{pointerType:'touch',clientX:20,clientY:130});
    const move=f.send('pointermove',{pointerType:'touch',clientX:20,clientY:190});
    expect(move.defaultPrevented).toBe(true);expect(f.selection()).toEqual(['a','e']);
    vi.advanceTimersByTime(400);expect(f.detail).not.toHaveBeenCalled();
    f.input.setBounds({x:0,y:100,width:320,height:120});
    expect(f.surface.style).toMatchObject({touchAction:'pan-y'});
    f.send('pointerup',{pointerType:'touch',clientX:20,clientY:190});
    expect(f.selection()).toEqual(['a','e']);expect(f.input.active).toBe(false);expect(f.scene.input.enabled).toBe(true);
    f.send('pointerdown',{pointerType:'touch',clientX:20,clientY:130});f.send('pointerup',{pointerType:'touch',clientX:20,clientY:130});
    expect(f.selection()).toEqual(['e']);
  });

});
