import {afterEach,expect,it,vi} from 'vitest';
import {EventEmitter} from 'node:events';
import type Phaser from 'phaser';
vi.mock('phaser',()=>({default:{}}));
vi.mock('../src/platform/Viewport',()=>({alignViewportCamera:()=>{},cssViewport:()=>({width:100,height:100})}));
vi.mock('../src/game/DetailDialog',()=>({modalBlocksCanvas:()=>false}));
import {SceneView} from '../src/game/SceneView';
afterEach(()=>vi.unstubAllGlobals());
function fixture(){
 vi.stubGlobal('window',new EventTarget());
 const input=new EventEmitter(),events=new EventEmitter(),canvas=Object.assign(new EventTarget(),{getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})});
 const scene={input,events,game:{canvas},scale:Object.assign(new EventEmitter(),{width:100,height:100}),scene:{isActive:()=>true},cameras:{main:{}},add:{container:()=>({setName(){return this;}})}} as unknown as Phaser.Scene;
 const object=Object.assign(new EventEmitter(),{name:'',setName(n:string){this.name=n;return this;},setInteractive(){return this;},getBounds:()=>({contains:()=>true})});
 const view=new SceneView(scene,()=>{}),tap=vi.fn();view.target(object as unknown as Phaser.GameObjects.Rectangle,'selection/assist-pair',{tap});
 const p={id:1,x:50,y:50,wasTouch:true,downTime:100,upTime:120,positionToCamera:()=>({x:50,y:50})};
 return {view,tap,input,object,p};
}
it('candidate completion preserves a pressed target and executes its tap before coalesced redraw',async()=>{
 const {view,tap,input,object,p}=fixture(),order:string[]=[];tap.mockImplementation(()=>order.push('tap'));
 input.emit('pointerdown',p,[object]);
 view.afterInteraction(()=>order.push('old refresh'));
 view.afterInteraction(()=>{order.push('latest refresh');object.emit('destroy');});
 expect(order).toEqual([]);input.emit('pointerup',p);expect(order).toEqual(['tap']);
 await Promise.resolve();expect(order).toEqual(['tap','latest refresh']);expect(tap).toHaveBeenCalledTimes(1);
});
it('cancel releases pending derived information without activating the cancelled action',async()=>{
 const {view,tap,input,object,p}=fixture(),refresh=vi.fn();input.emit('pointerdown',p,[object]);view.afterInteraction(refresh);input.emit('pointerupoutside');
 await Promise.resolve();expect(refresh).toHaveBeenCalledTimes(1);expect(tap).not.toHaveBeenCalled();view.afterInteraction(refresh);expect(refresh).toHaveBeenCalledTimes(2);
});
