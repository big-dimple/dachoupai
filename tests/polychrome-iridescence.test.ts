import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {EventEmitter} from 'node:events';
import type Phaser from 'phaser';
const preferences=vi.hoisted(()=>({reducedMotion:false,listeners:new Set<()=>void>()}));
vi.mock('../src/game/session',()=>({gameSession:()=>({...preferences,subscribe:(f:()=>void)=>{preferences.listeners.add(f);return ()=>preferences.listeners.delete(f);}})}));
import {mountPolychromeCardIridescence,iridescencePath,iridescenceColor} from '../src/game/PolychromeCardIridescence';

class Graphic extends EventEmitter {
  data=new Map<string,unknown>();visible=true;draws=0;destroyed=false;
  setName(_s:string){return this;}setData(k:string,v:unknown){this.data.set(k,v);return this;}getData(k:string){return this.data.get(k);}
  setVisible(v:boolean){this.visible=v;return this;}clear(){this.draws++;return this;}
  lineStyle(..._args:unknown[]){return this;}lineBetween(..._args:unknown[]){return this;}
  destroy(){if(this.destroyed)return;this.destroyed=true;this.emit('destroy');this.removeAllListeners();}
}
function fixture(){
  const events=new EventEmitter(),graphics:Graphic[]=[],host={visible:true,active:true,alpha:1,cameraFilter:0,parentContainer:null,x:20,
    getWorldTransformMatrix(){return {a:1,b:0,c:0,d:1,tx:this.x,ty:20};},add:vi.fn()};
  const scene={events,add:{graphics:()=>{const g=new Graphic();graphics.push(g);return g;}},cameras:{main:{visible:true,alpha:1,id:1,x:0,y:0,width:400,height:800,scrollX:0,scrollY:0,matrix:{a:1,b:0,c:0,d:1,tx:0,ty:0}}}};
  const mount=(edition='polychrome')=>mountPolychromeCardIridescence(scene as unknown as Phaser.Scene,host as unknown as Phaser.GameObjects.Container,{x:0,y:0,width:80,height:100},edition as 'polychrome');
  const step=(ms=17)=>events.emit('update',0,ms);
  return {scene,events,host,graphics,mount,step};
}
let documentEvents:EventTarget,mediaEvents:EventTarget,hidden=false,reduce=false;
beforeEach(()=>{
  preferences.reducedMotion=false;preferences.listeners.clear();hidden=false;reduce=false;documentEvents=new EventTarget();mediaEvents=new EventTarget();
  vi.stubGlobal('document',{get hidden(){return hidden;},addEventListener:documentEvents.addEventListener.bind(documentEvents),removeEventListener:documentEvents.removeEventListener.bind(documentEvents)});
  vi.stubGlobal('window',{matchMedia:()=>({get matches(){return reduce;},addEventListener:mediaEvents.addEventListener.bind(mediaEvents),removeEventListener:mediaEvents.removeEventListener.bind(mediaEvents)})});
});
afterEach(()=>vi.unstubAllGlobals());

describe('persistent polychrome edge',()=>{
  it('never creates objects or listeners for ordinary, foil or holographic cards',()=>{
    const f=fixture();for(const edition of ['none','foil','holographic'])expect(f.mount(edition)).toBeUndefined();
    expect(f.graphics).toHaveLength(0);expect(f.events.listenerCount('update')).toBe(0);expect(preferences.listeners.size).toBe(0);
  });
  it('flows without input for over three seconds, with one throttled listener for all five slots',()=>{
    const f=fixture();for(let i=0;i<5;i++)f.mount();const first=f.graphics[0].getData('phase');
    for(let i=0;i<200;i++)f.step();
    expect(f.graphics[0].getData('phase')).not.toBe(first);expect(f.graphics[0].draws).toBeGreaterThan(40);expect(f.graphics[0].draws).toBeLessThan(55);
    expect(f.events.listenerCount('update')).toBe(1);expect(preferences.listeners.size).toBe(1);f.events.emit('shutdown');
  });
  it('does no drawing for offscreen/hidden hosts or hidden documents and resumes when visible',()=>{
    const f=fixture();f.mount();const g=f.graphics[0],initial=g.draws;f.host.x=900;for(let i=0;i<20;i++)f.step();
    expect(g.draws).toBe(initial);expect(g.visible).toBe(false);f.host.x=20;f.step(80);expect(g.draws).toBe(initial+1);
    f.host.visible=false;for(let i=0;i<20;i++)f.step();const stopped=g.draws;expect(g.visible).toBe(false);
    f.host.visible=true;hidden=true;documentEvents.dispatchEvent(new Event('visibilitychange'));for(let i=0;i<20;i++)f.step();expect(g.draws).toBe(stopped);
    hidden=false;documentEvents.dispatchEvent(new Event('visibilitychange'));expect(g.draws).toBeGreaterThan(stopped);f.events.emit('shutdown');
  });
  it('keeps a static rainbow for OS or in-app reduced motion, including live toggles',()=>{
    const f=fixture();reduce=true;f.mount();const g=f.graphics[0],draws=g.draws;for(let i=0;i<220;i++)f.step();
    expect(g.draws).toBe(draws);expect(g.getData('motion')).toBe('static');expect(g.visible).toBe(true);
    reduce=false;mediaEvents.dispatchEvent(new Event('change'));f.step(80);expect(g.draws).toBeGreaterThan(draws);
    preferences.reducedMotion=true;for(const callback of preferences.listeners)callback();const staticDraws=g.draws;for(let i=0;i<220;i++)f.step();expect(g.draws).toBe(staticDraws);f.events.emit('shutdown');
  });
  it('culls using the actual camera transform with a top-left origin and phone DPR zoom',()=>{
    const f=fixture(),camera=f.scene.cameras.main;camera.matrix.a=camera.matrix.d=2;camera.width=780;camera.height=1688;
    f.mount();expect(f.graphics[0].visible).toBe(true);for(let i=0;i<200;i++)f.step();expect(f.graphics[0].draws).toBeGreaterThan(40);
    f.host.x=390;f.step(80);expect(f.graphics[0].visible).toBe(false);f.events.emit('shutdown');
  });
  it('removes every subscription on last graphic destruction and permits remounting in reused scenes',()=>{
    const f=fixture();f.mount();f.mount();f.graphics[0].destroy();expect(f.events.listenerCount('update')).toBe(1);
    f.graphics[1].destroy();expect(f.events.eventNames()).toEqual([]);expect(preferences.listeners.size).toBe(0);
    f.mount();expect(f.events.listenerCount('update')).toBe(1);f.events.emit('shutdown');expect(f.graphics[2].destroyed).toBe(true);expect(preferences.listeners.size).toBe(0);expect(f.events.eventNames()).toEqual([]);
  });
  it('only draws inside the narrow edge, with a closed rounded path and a continuous colour seam',()=>{
    const b={x:-40,y:-50,width:80,height:100},path=iridescencePath(b);expect(path[0]).toEqual(path.at(-1));
    for(const p of path){expect(p.x).toBeGreaterThanOrEqual(-38);expect(p.x).toBeLessThanOrEqual(38);expect(p.y).toBeGreaterThanOrEqual(-48);expect(p.y).toBeLessThanOrEqual(48);expect(Math.min(p.x+40,40-p.x,p.y+50,50-p.y)).toBeLessThan(4);}
    expect(iridescenceColor(0)).toBe(iridescenceColor(1));expect(iridescenceColor(.25)).not.toBe(iridescenceColor(.75));
  });
});
