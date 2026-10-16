import type Phaser from 'phaser';
import {afterEach,expect,it,vi} from 'vitest';
import {OwnedJokerInput} from '../src/game/OwnedJokerInput';
vi.mock('../src/game/DetailDialog',()=>({modalBlocksCanvas:()=>false}));
class Surface extends EventTarget {
 style:Record<string,string>={};hidden=false;className='';
 setAttribute(){}remove=vi.fn();hasPointerCapture(){return false;}
}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function setup(){
 let callback!:ResizeObserverCallback,rect={left:0,top:0,width:320,height:568};
 const surface=new Surface(),disconnect=vi.fn(),observe=vi.fn();
 vi.stubGlobal('window',new EventTarget());vi.stubGlobal('innerWidth',320);vi.stubGlobal('innerHeight',568);
 vi.stubGlobal('document',Object.assign(new EventTarget(),{createElement:()=>surface,querySelector:()=>null,body:{append:vi.fn()}}));
 vi.stubGlobal('ResizeObserver',class {constructor(next:ResizeObserverCallback){callback=next;}observe=observe;disconnect=disconnect;});
 const scene={game:{canvas:{getBoundingClientRect:()=>rect}},scale:{width:740,height:320,zoom:1},input:{enabled:true}};
 const options={ready:()=>true,inspectable:()=>true,cards:()=>[] as {id:string;x:number;y:number;width:number;height:number}[],cancelCanvas:vi.fn(),tap:vi.fn(),lift:vi.fn(),move:vi.fn(),drop:vi.fn(),cancel:vi.fn()};
 const input=new OwnedJokerInput(scene as unknown as Phaser.Scene,options);
 return {input,surface,options,observe,disconnect,canvas:scene.game.canvas,settle:()=>{rect={left:0,top:0,width:740,height:320};callback([],{} as ResizeObserver);}};
}
it('moves the native owned rail to the actual canvas after portrait-to-landscape CSS settles without acting on a card',()=>{
 const f=setup();f.input.setBounds({x:190,y:12,width:113.2,height:44});
 expect(parseFloat(f.surface.style.left)).toBeCloseTo(190*320/740);
 expect(parseFloat(f.surface.style.top)).toBeCloseTo(12*568/320);
 const cancels=f.options.cancel.mock.calls.length;f.settle();
 expect(f.surface.style).toMatchObject({left:'190px',top:'12px',width:'113.2px',height:'44px'});
 expect(f.options.cancel).toHaveBeenCalledTimes(cancels);
 for(const action of [f.options.tap,f.options.lift,f.options.move,f.options.drop])expect(action).not.toHaveBeenCalled();
 expect(f.observe).toHaveBeenCalledWith(f.canvas);f.input.destroy();
});
it('cleared or destroyed rails cannot be revived by a queued canvas observation',()=>{
 const f=setup();f.input.setBounds({x:190,y:12,width:113.2,height:44});f.input.setBounds(undefined);const before={...f.surface.style};f.settle();expect(f.surface.hidden).toBe(true);expect(f.surface.style).toEqual(before);
 f.input.destroy();f.input.destroy();f.settle();expect(f.disconnect).toHaveBeenCalledOnce();expect(f.surface.remove).toHaveBeenCalledOnce();expect(f.surface.style).toEqual(before);
});

function nativePointer(type:string,timeStamp:number){const e=new Event(type,{cancelable:true});Object.defineProperties(e,Object.fromEntries(Object.entries({pointerId:1,pointerType:'mouse',isPrimary:true,button:0,buttons:type==='pointerup'?0:1,clientX:50,clientY:50,timeStamp}).map(([k,v])=>[k,{value:v}])));return e;}
function pressOwned(f:ReturnType<typeof setup>,stamp:number){f.options.cards=()=>[{id:'owned/1',x:0,y:0,width:740,height:320}];const e=nativePointer('pointerdown',stamp);window.dispatchEvent(e);f.surface.dispatchEvent(e);}
it('opens a genuinely short owned-card click even when the release callback is delayed by a busy frame',()=>{
 const f=setup(),clock=vi.spyOn(performance,'now').mockReturnValue(1000);try{pressOwned(f,100);clock.mockReturnValue(1800);window.dispatchEvent(nativePointer('pointerup',180));expect(f.options.tap).toHaveBeenCalledExactlyOnceWith('owned/1');expect(f.options.lift).not.toHaveBeenCalled();expect(f.options.drop).not.toHaveBeenCalled();}finally{f.input.destroy();}
});
it('a genuine held owned card cannot become a tap when queued native events run close together',()=>{
 const f=setup(),clock=vi.spyOn(performance,'now').mockReturnValue(1000);try{pressOwned(f,100);clock.mockReturnValue(1010);window.dispatchEvent(nativePointer('pointerup',600));expect(f.options.tap).not.toHaveBeenCalled();expect(f.options.drop).not.toHaveBeenCalled();}finally{f.input.destroy();}
});
