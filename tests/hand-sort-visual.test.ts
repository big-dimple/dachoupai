import {EventEmitter} from 'node:events';
import {afterEach,describe,expect,it,vi} from 'vitest';
import type Phaser from 'phaser';
import {attachHandSortVisual,isHandSortControl} from '../src/game/HandSortButtonVisual';

afterEach(()=>vi.unstubAllGlobals());
function fixture(){
 let reduced=false;
 const windowTarget=Object.assign(new EventTarget(),{matchMedia:()=>({matches:reduced})}),doc=Object.assign(new EventTarget(),{hidden:false});vi.stubGlobal('window',windowTarget);vi.stubGlobal('document',doc);
 const shape=()=>({x:100,y:200,scaleX:1,scaleY:1,visible:true,setScale(n:number){this.scaleX=this.scaleY=n;return this;},setPosition(x:number,y:number){this.x=x;this.y=y;return this;},setVisible(v:boolean){this.visible=v;return this;},clear:vi.fn().mockReturnThis(),fillStyle:vi.fn().mockReturnThis(),fillRoundedRect:vi.fn().mockReturnThis(),lineStyle:vi.fn().mockReturnThis(),strokeRoundedRect:vi.fn().mockReturnThis()});
 const events=new EventEmitter(),scene={events,scale:{zoom:1},tweens:{killTweensOf:vi.fn(),add:vi.fn((config:any)=>{config.targets.y=config.y;config.onComplete?.();})}};
 const label=Object.assign(shape(),{text:'点数',displayOriginX:14,displayOriginY:9,scene,style:{fontSize:'14px',fontStyle:'bold',resolution:1},getTextMetrics:()=>({ascent:14}),context:{measureText:()=>({actualBoundingBoxAscent:11,actualBoundingBoxDescent:2})},setFontStyle(style:string){this.style.fontStyle=style;return this;},setResolution(n:number){this.style.resolution=n;return this;}});
 const button=Object.assign(new EventEmitter(),{x:100,y:200,width:44,height:44,input:{enabled:true},setData:vi.fn().mockReturnThis()});
 const parts={art:shape(),face:shape(),edge:shape(),glow:shape(),label,bounds:{x:100,y:200,width:44,height:44}};
 const visual=attachHandSortVisual(scene as unknown as Phaser.Scene,button as unknown as Phaser.GameObjects.Rectangle,parts as never,()=>reduced);
 const refresh=()=>events.emit('postupdate');refresh();return {button,parts,visual,refresh,events,scene,doc,windowTarget,reduced:(v:boolean)=>{reduced=v;refresh();}};
}
describe('sorting presentation keeps its input contract',()=>{
 it('targets only the three table sorting IDs, leaving other sort skins and actions on their existing path',()=>{
  for(const name of ['action/sort-rank','action/sort-suit','selection/switch-type'])expect(isHandSortControl(name)).toBe(true);
  for(const name of ['action/play','action/discard','action/confirm-character','character/amo','route/group'])expect(isHandSortControl(name)).toBe(false);
 });
 it('lifts only paper and text by2px and returns on leave without moving/scaling its44px hit',()=>{
  const f=fixture(),rest=f.parts.label.y;f.button.emit('pointerover',{wasTouch:false});
  expect(f.parts.art.y).toBe(198);expect(f.parts.label.y).toBe(rest-2);expect(f.button).toMatchObject({x:100,y:200,width:44,height:44});expect(f.parts.art.scaleX).toBe(1);expect(f.parts.glow.visible).toBe(false);
  f.button.emit('pointerout');expect(f.parts.art.y).toBe(200);expect(f.parts.label.y).toBe(rest);
 });
 it('never leaves mouse hover on touch and keeps reduced-motion feedback stationary',()=>{
  const f=fixture();f.button.emit('pointerover',{wasTouch:true});expect(f.parts.art.y).toBe(200);
  f.button.emit('pointerover',{wasTouch:false});expect(f.parts.art.y).toBe(198);f.button.emit('pointerdown',{wasTouch:true});expect(f.parts.art.y).toBe(200);
  f.reduced(true);f.button.emit('pointerover',{wasTouch:false});expect(f.parts.art.y).toBe(200);expect(f.parts.face.fillStyle).toHaveBeenCalled();
 });
 it('clears hover on disable, blur and background and releases all lifecycle listeners',()=>{
  const f=fixture();f.button.emit('pointerover',{wasTouch:false});f.button.input.enabled=false;f.refresh();expect(f.parts.art.y).toBe(200);
  f.button.input.enabled=true;f.button.emit('pointerover',{wasTouch:false});f.windowTarget.dispatchEvent(new Event('blur'));expect(f.parts.art.y).toBe(200);
  f.button.emit('pointerover',{wasTouch:false});f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));expect(f.parts.art.y).toBe(200);
  expect(f.events.listenerCount('postupdate')).toBe(1);f.button.emit('destroy');expect(f.events.listenerCount('postupdate')).toBe(0);expect(f.button.listenerCount('pointerover')).toBe(0);
 });
 it('preserves changing AI feedback and enabled state and never registers an action',()=>{
  const f=fixture();f.parts.label.text='AI\n计算';f.button.input.enabled=false;f.refresh();expect(f.parts.label.text).toBe('AI\n计算');expect(f.button.input.enabled).toBe(false);expect(f.button.listenerCount('pointerup')).toBe(0);
  f.parts.label.text='AI';f.button.input.enabled=true;f.refresh();expect(f.parts.label.text).toBe('AI');expect(f.button.input.enabled).toBe(true);
 });
});
