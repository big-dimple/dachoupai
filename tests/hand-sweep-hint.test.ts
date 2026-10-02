import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {HandSweepHint,HAND_SWEEP_HINT_KEY} from '../src/game/HandSweepHint';
import type {HandSelectionUpdate} from '../src/game/HandSelectionGesture';

let values:Map<string,string>;
beforeEach(()=>{values=new Map();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});});
afterEach(()=>vi.unstubAllGlobals());
const gesture=(phase:HandSelectionUpdate['phase'],visitedIds:string[]):HandSelectionUpdate=>({phase,visitedIds,pointerId:1,mode:'select',selectedIds:['a','b'],limitReached:false});
describe('first-sort teaching preference',()=>{
  it('claims once and restores shown state independently of game saves',()=>{
    const hint=new HandSweepHint();expect(hint.claim()).toBe(true);expect(hint.claim()).toBe(false);expect(new HandSweepHint().claim()).toBe(false);expect([...values.keys()]).toEqual([HAND_SWEEP_HINT_KEY]);
  });
  it.each(['pending','sweeping','interrupted','cancelled'] as const)('%s never declares a completed learned sweep',phase=>{
    const hint=new HandSweepHint();hint.observe(gesture(phase,['a','b']));expect(hint.snapshot().learned).toBe(false);
  });
  it('single taps and duplicate visits do not learn, but an actual committed sweep does',()=>{
    const hint=new HandSweepHint();hint.observe(gesture('committed',['a']));hint.observe(gesture('committed',['a','a']));expect(hint.snapshot().learned).toBe(false);
    hint.observe(gesture('committed',['b','a']));expect(hint.snapshot()).toEqual({shown:false,learned:true});expect(hint.claim()).toBe(false);expect(new HandSweepHint().claim()).toBe(false);
  });
  it('unavailable or corrupt preferences never block input or repeat in the same scene',()=>{
    values.set(HAND_SWEEP_HINT_KEY,'invalid');const hint=new HandSweepHint();expect(hint.claim()).toBe(true);
    vi.stubGlobal('localStorage',{getItem:()=>{throw Error('disabled');},setItem:()=>{throw Error('full');}});const volatile=new HandSweepHint();expect(volatile.claim()).toBe(true);expect(volatile.claim()).toBe(false);expect(()=>volatile.observe(gesture('committed',['a','b']))).not.toThrow();expect(volatile.snapshot().learned).toBe(true);
  });
});
