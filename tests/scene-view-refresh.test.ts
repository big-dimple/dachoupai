import {afterEach,expect,it,vi} from 'vitest';
import {EventEmitter} from 'node:events';
import type Phaser from 'phaser';
vi.mock('phaser',()=>({default:{}}));
vi.mock('../src/platform/Viewport',()=>({alignViewportCamera:()=>{},cssViewport:()=>({width:100,height:100})}));
vi.mock('../src/game/DetailDialog',()=>({modalBlocksCanvas:()=>false}));
import {SceneView} from '../src/game/SceneView';
afterEach(()=>vi.unstubAllGlobals());
function fixture(sharedGame?:Phaser.Game){
 vi.stubGlobal('window',new EventTarget());
 const input=new EventEmitter(),events=new EventEmitter(),canvas=Object.assign(new EventTarget(),{getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})});
 const scene={input,events,game:sharedGame??{canvas},scale:Object.assign(new EventEmitter(),{width:100,height:100}),scene:{isActive:()=>true},cameras:{main:{}},add:{container:()=>({setName(){return this;}})}} as unknown as Phaser.Scene;
 const object=Object.assign(new EventEmitter(),{name:'',input:{enabled:true},setAlpha(){return this;},getData(){return undefined;},setName(n:string){this.name=n;return this;},setInteractive(){return this;},getBounds:()=>({contains:()=>true})});
 const view=new SceneView(scene,()=>{}),tap=vi.fn();view.target(object as unknown as Phaser.GameObjects.Rectangle,'selection/assist-pair',{tap});
 const p={id:1,x:50,y:50,wasTouch:true,downTime:100,upTime:120,positionToCamera:()=>({x:50,y:50})};
 return {view,tap,input,object,p,game:scene.game,events};
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

it('disabling the pressed target cancels activation before release',()=>{
 const {view,tap,input,object,p}=fixture();input.emit('pointerdown',p,[object]);
 view.setEnabled(object as unknown as Phaser.GameObjects.Rectangle,false);input.emit('pointerup',p);expect(tap).not.toHaveBeenCalled();expect(object.input.enabled).toBe(false);
});

it('a quick repeated tap cannot activate a new scene at the previous action position',()=>{
 const previous=fixture();previous.input.emit('pointerdown',previous.p,[previous.object]);previous.input.emit('pointerup',previous.p);expect(previous.tap).toHaveBeenCalledOnce();previous.events.emit('shutdown');
 const next=fixture(previous.game),repeat={...next.p,downTime:150,upTime:170};
 next.input.emit('pointerdown',repeat,[next.object]);next.input.emit('pointerup',repeat);expect(next.tap).not.toHaveBeenCalled();
 const deliberate={...next.p,x:85,y:85,downTime:180,upTime:200,positionToCamera:()=>({x:85,y:85})};
 next.input.emit('pointerdown',deliberate,[next.object]);next.input.emit('pointerup',deliberate);expect(next.tap).toHaveBeenCalledOnce();
 next.input.emit('pointerdown',{...deliberate,downTime:220,upTime:240},[next.object]);next.input.emit('pointerup',{...deliberate,downTime:220,upTime:240});expect(next.tap).toHaveBeenCalledTimes(2);
});
it('the same position is available for a deliberate later tap in the new scene',()=>{
 const previous=fixture();previous.input.emit('pointerdown',previous.p,[previous.object]);previous.input.emit('pointerup',previous.p);previous.events.emit('shutdown');
 const next=fixture(previous.game),later={...next.p,downTime:500,upTime:520};
 next.input.emit('pointerdown',later,[next.object]);next.input.emit('pointerup',later);expect(next.tap).toHaveBeenCalledOnce();
});
