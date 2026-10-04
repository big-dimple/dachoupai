import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class {}}}));
const session=vi.hoisted(()=>({speed:1}));
vi.mock('../src/game/session',()=>({gameSession:()=>session}));
import {GameScene} from '../src/game/GameScene';
import {HAND_SWEEP_HINT_KEY} from '../src/game/HandSweepHint';
type HintScene={
 view:{layout:{cards:{visible:boolean}[]};add:ReturnType<typeof vi.fn>};
 ready:boolean;reducedMotion:boolean;handHint:boolean;handHintTimer?:{remove():void};
 controlsLive:boolean;statusText:{active:boolean};scene:{isActive():boolean};statusMessage:string;
 time:{delayedCall(delay:number,callback:()=>void):{remove():void}};
 updateControls:ReturnType<typeof vi.fn>;showHandHint(claim?:boolean):void;stopHandHint():void;
};
let values:Map<string,string>;
beforeEach(()=>{vi.useFakeTimers();session.speed=1;values=new Map();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
function setup(reduced=false){
 const s=new GameScene() as unknown as HintScene;
 Object.defineProperties(s,{ready:{value:true,configurable:true},reducedMotion:{value:reduced,configurable:true}});
 const remove=vi.fn();s.view={layout:{cards:[{visible:true},{visible:true}]},add:vi.fn()};s.controlsLive=true;s.statusText={active:true};s.scene={isActive:()=>true};s.statusMessage='点数已排序';s.updateControls=vi.fn();
 const scheduled: {delay:number;remove:ReturnType<typeof vi.fn>}[]=[];
 s.time={delayedCall:(delay,callback)=>{const id=setTimeout(callback,delay),timer={remove:vi.fn(()=>{remove();clearTimeout(id);})};scheduled.push({delay,remove:timer.remove});return timer;}};
 return {s,scheduled};
}
describe('first-sort guidance uses the existing status and a finite presentation timer',()=>{
 it.each([false,true])('expires and restores ordinary status without replacing the saved message (reduced=%s)',reduced=>{
  const {s,scheduled}=setup(reduced),duration=reduced?3000:1860;s.showHandHint();expect(s.handHint).toBe(true);expect(s.updateControls).toHaveBeenCalledOnce();expect(s.view.add).not.toHaveBeenCalled();expect(scheduled[0].delay).toBe(duration);
  vi.advanceTimersByTime(duration-1);expect(s.handHint).toBe(true);vi.advanceTimersByTime(1);expect(s.handHint).toBe(false);expect(s.handHintTimer).toBeUndefined();expect(s.statusMessage).toBe('点数已排序');expect(s.updateControls).toHaveBeenCalledTimes(2);expect(vi.getTimerCount()).toBe(0);
 });
 it('cancel removes its timer once and a subsequent input cannot repeat the claimed hint',()=>{
  const {s,scheduled}=setup();s.showHandHint();s.stopHandHint();s.stopHandHint();s.showHandHint();expect(s.handHint).toBe(false);expect(scheduled).toHaveLength(1);expect(scheduled[0].remove).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);expect(JSON.parse(values.get(HAND_SWEEP_HINT_KEY)!)).toMatchObject({shown:true});
 });
 it.each(['dead-controls','destroyed-status','inactive-scene'] as const)('cleans %s without refreshing destroyed controls',reason=>{
  const {s}=setup();s.showHandHint();if(reason==='dead-controls')s.controlsLive=false;if(reason==='destroyed-status')s.statusText.active=false;if(reason==='inactive-scene')s.scene.isActive=()=>false;
  s.stopHandHint();expect(s.handHint).toBe(false);expect(s.handHintTimer).toBeUndefined();expect(s.updateControls).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
 });
 it('reduced-motion setting can re-present the same claimed hint, with one live timer',()=>{
  const {s,scheduled}=setup();s.showHandHint();s.stopHandHint();Object.defineProperty(s,'reducedMotion',{value:true});s.showHandHint(false);expect(s.handHint).toBe(true);expect(scheduled.map(t=>t.delay)).toEqual([1860,3000]);expect(vi.getTimerCount()).toBe(1);vi.advanceTimersByTime(3000);expect(s.handHint).toBe(false);
 });
 it('follows the existing presentation-speed clock contract and persists separately from run state',()=>{
  session.speed=4;const {s,scheduled}=setup(true);s.showHandHint();expect(scheduled[0].delay).toBe(12000);expect([...values.keys()]).toEqual([HAND_SWEEP_HINT_KEY]);const next=setup().s;next.showHandHint();expect(next.handHint).toBe(false);
 });
 it('does not claim guidance with a busy or one-visible-card hand',()=>{
  const {s}=setup();Object.defineProperty(s,'ready',{value:false});s.showHandHint();Object.defineProperty(s,'ready',{value:true});s.view.layout.cards[1].visible=false;s.showHandHint();expect(s.handHint).toBe(false);expect(values.size).toBe(0);expect(vi.getTimerCount()).toBe(0);
 });
});
