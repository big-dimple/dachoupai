import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {EventEmitter} from 'node:events';
import type Phaser from 'phaser';
import {energySend,scoreEnergyFixture} from '../harness/fixtures/score-energy';
import {HeroPortraitScoreMotion,heroPortraitScoreCue,type HeroPortraitMotionPlay} from '../src/game/HeroPortraitScoreMotion';
import {heroPortraitLayout,fitHeroPortraitPose} from '../src/game/HeroPortraitLayout';
import {scoreCardPose} from '../src/game/ScorePosture';
import {intersects} from '../src/game/layout';

const f=scoreEnergyFixture('multiply'),trace=energySend(f.state,{type:'PlayAssistedHand',selectedIds:f.selectedIds,assistIds:f.assistIds}).lastTrace!;
const event=trace.events.find(e=>e.sourceType==='character')!;
let documentEvents:EventTarget,windowEvents:EventTarget,mediaEvents:EventTarget,hidden=false,reduced=false;
beforeEach(()=>{
  hidden=false;reduced=false;documentEvents=new EventTarget();windowEvents=new EventTarget();mediaEvents=new EventTarget();
  vi.stubGlobal('document',{get hidden(){return hidden;},addEventListener:documentEvents.addEventListener.bind(documentEvents),removeEventListener:documentEvents.removeEventListener.bind(documentEvents)});
  vi.stubGlobal('window',{addEventListener:windowEvents.addEventListener.bind(windowEvents),removeEventListener:windowEvents.removeEventListener.bind(windowEvents),matchMedia:()=>({get matches(){return reduced;},addEventListener:mediaEvents.addEventListener.bind(mediaEvents),removeEventListener:mediaEvents.removeEventListener.bind(mediaEvents)})});
});
afterEach(()=>vi.unstubAllGlobals());
class Image extends EventEmitter {
  active=true;visible=true;alpha=1;x=120;y=530;angle=0;scaleX=.8;scaleY=.8;parentContainer=null;
  tintTopLeft=0xffffff;tintTopRight=0xfafafa;tintBottomLeft=0xf8f8f8;tintBottomRight=0xf6f6f6;tintFill=false;
  get displayWidth(){return 200*this.scaleX;}get displayHeight(){return 250*this.scaleY;}
  setPosition(x:number,y:number){this.x=x;this.y=y;return this;}setAngle(v:number){this.angle=v;return this;}setScale(x:number,y:number){this.scaleX=x;this.scaleY=y;return this;}
  setTint(a:number,b=a,c=a,d=a){Object.assign(this,{tintTopLeft:a,tintTopRight:b,tintBottomLeft:c,tintBottomRight:d,tintFill:false});return this;}
  setTintFill(a:number,b=a,c=a,d=a){this.setTint(a,b,c,d);this.tintFill=true;return this;}
}
function fixture(){
  const events=new EventEmitter(),image=new Image(),running:{tick:(t:number)=>void;finish:()=>void;removed:boolean}[]=[],bounds={x:12,y:400,width:216,height:260};
  const scene={events,sys:{settings:{visible:true}},tweens:{add:(config:Phaser.Types.Tweens.TweenBuilderConfig)=>{
    const cursor=config.targets as {t:number},r={tick:(t:number)=>{cursor.t=t;(config.onUpdate as ()=>void)();},finish:()=>{(config.onComplete as ()=>void)();},removed:false};running.push(r);return {remove:()=>r.removed=true};
  }}};
  const motion=new HeroPortraitScoreMotion(scene as unknown as Phaser.Scene,image as unknown as Phaser.GameObjects.Image,{heroId:'amo',bounds,reducedMotion:()=>false});
  const input=(overrides:Partial<HeroPortraitMotionPlay>={}):HeroPortraitMotionPlay=>({trace,event,context:{generation:1,signal:new AbortController().signal},arrival:Promise.resolve(),duration:300,...overrides});
  const snapshot=()=>({x:image.x,y:image.y,angle:image.angle,scaleX:image.scaleX,scaleY:image.scaleY,tints:[image.tintTopLeft,image.tintTopRight,image.tintBottomLeft,image.tintBottomRight],fill:image.tintFill});
  return {scene,events,image,running,motion,input,snapshot,bounds};
}
const flush=async()=>{await Promise.resolve();await Promise.resolve();};

it('accepts only exact committed arithmetic from this portrait hero and leaves the trace unchanged',()=>{
  const before=JSON.stringify(trace);expect(heroPortraitScoreCue(trace,event,'amo')).toMatchObject({positive:true});
  expect(heroPortraitScoreCue(trace,event,'erxiang')).toBeUndefined();expect(heroPortraitScoreCue(trace,{...event,value:{n:'999',d:'1'}},'amo')).toBeUndefined();
  expect(heroPortraitScoreCue(trace,trace.events.find(e=>e.sourceType==='joker')!,'amo')).toBeUndefined();expect(heroPortraitScoreCue({...trace,rootId:'stale'},event,'amo')).toBeUndefined();expect(JSON.stringify(trace)).toBe(before);
});
it('preparation cannot fake success, and an abort before actual arrival settles without a tween',async()=>{
  const f=fixture(),rest=f.snapshot(),abort=new AbortController();const done=f.motion.play(f.input({arrival:new Promise(()=>{}),context:{generation:1,signal:abort.signal}}));
  await flush();expect(f.snapshot()).toEqual(rest);expect(f.running).toHaveLength(0);abort.abort();await done;expect(f.snapshot()).toEqual(rest);f.motion.destroy();
});
it('reuses one bounded pose curve, peaks/rebounds after arrival, restores every corner tint and adds no image',async()=>{
  const f=fixture(),rest=f.snapshot(),phases:string[]=[];const done=f.motion.play(f.input({onPhase:p=>phases.push(p)}));await flush();
  f.running[0].tick(.3);expect(f.image.y).toBeLessThan(rest.y);expect(f.image.scaleX).toBeGreaterThan(rest.scaleX);expect(f.image.tintTopLeft).not.toBe(rest.tints[0]);
  f.running[0].tick(.76);expect(f.image.y).toBeGreaterThan(rest.y);f.running[0].finish();await done;expect(f.snapshot()).toEqual(rest);expect(phases).toEqual(['waiting','impact','rebound','rest']);f.motion.destroy();
});
it('reduced motion, including a live OS toggle, keeps a static emphasis and the original pose',async()=>{
  const f=fixture(),rest=f.snapshot();reduced=true;const first=f.motion.play(f.input());await flush();f.running[0].tick(.3);expect(f.snapshot()).toMatchObject({x:rest.x,y:rest.y,angle:0,scaleX:.8,scaleY:.8});expect(f.image.tintTopLeft).not.toBe(rest.tints[0]);f.running[0].finish();await first;
  reduced=false;const second=f.motion.play(f.input({context:{generation:2,signal:new AbortController().signal}}));await flush();f.running[1].tick(.3);reduced=true;mediaEvents.dispatchEvent(new Event('change'));expect(f.image.y).toBe(rest.y);f.running[1].tick(.7);expect(f.image.angle).toBe(0);f.running[1].finish();await second;expect(f.snapshot()).toEqual(rest);f.motion.destroy();
});
it('hidden/fast-forward/replay/destroy restore and a stale canceled tween cannot overwrite its successor',async()=>{
  const f=fixture(),rest=f.snapshot(),abort=new AbortController();const first=f.motion.play(f.input({context:{generation:1,signal:abort.signal}}));await flush();f.running[0].tick(.3);abort.abort();await first;expect(f.snapshot()).toEqual(rest);
  const second=f.motion.play(f.input({context:{generation:2,signal:new AbortController().signal}}));await flush();f.running[1].tick(.3);const current=f.snapshot();f.running[0].tick(.8);expect(f.snapshot()).toEqual(current);
  hidden=true;documentEvents.dispatchEvent(new Event('visibilitychange'));await second;expect(f.snapshot()).toEqual(rest);hidden=false;
  await f.motion.play(f.input({replay:true}));expect(f.running).toHaveLength(2);
  const third=f.motion.play(f.input({context:{generation:3,signal:new AbortController().signal}}));await flush();f.running[2].tick(.3);f.events.emit('shutdown');await third;expect(f.snapshot()).toEqual(rest);expect(f.events.eventNames()).toEqual([]);expect(f.image.eventNames()).toEqual([]);
});
it('maximizes the existing image ratio in a real free sidebar band without moving any protected box',()=>{
  const area={x:12,y:8,width:224,height:724},protectedBounds=[{x:12,y:8,width:224,height:250},{x:12,y:270,width:224,height:164},{x:24,y:446,width:200,height:44}],before=structuredClone({area,protectedBounds});
  const result=heroPortraitLayout(area,{width:1122,height:1402},protectedBounds)!;expect(result.imageBounds.width).toBeGreaterThan(175);expect(result.imageBounds.height).toBeGreaterThan(220);
  for(const b of protectedBounds)expect(intersects(b,result.imageBounds)).toBe(false);expect(result.imageBounds.width/result.imageBounds.height).toBeCloseTo(1122/1402);expect({area,protectedBounds}).toEqual(before);
  for(let i=0;i<=100;i++){const p=fitHeroPortraitPose(result.safeBounds,{x:result.x,y:result.y,width:result.imageBounds.width,height:result.imageBounds.height},scoreCardPose(i/100,0));
    const a=Math.abs(p.angle)*Math.PI/180,w=(result.imageBounds.width*Math.cos(a)+result.imageBounds.height*Math.sin(a))*p.scale,h=(result.imageBounds.height*Math.cos(a)+result.imageBounds.width*Math.sin(a))*p.scale;
    expect(p.x-w/2).toBeGreaterThanOrEqual(result.safeBounds.x-1e-6);expect(p.y-h/2).toBeGreaterThanOrEqual(result.safeBounds.y-1e-6);expect(p.x+w/2).toBeLessThanOrEqual(result.safeBounds.x+result.safeBounds.width+1e-6);expect(p.y+h/2).toBeLessThanOrEqual(result.safeBounds.y+result.safeBounds.height+1e-6);
  }
});
