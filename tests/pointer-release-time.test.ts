import {describe,expect,it} from 'vitest';
import {PointerIntent} from '../src/game/PointerIntent';
import {pointerReleaseTime,releasePointerIntent} from '../src/game/PointerReleaseTime';

describe('native release duration bridges to the pointer intent clock',()=>{
  it.each([
    {at:12308,down:12302,up:12302,handled:12728},
    {at:8200,down:8148,up:8150,handled:9010},
    {at:500,down:0,up:0,handled:1000},
  ])('accepts a short native press despite late handling: $down → $up',({at,down,up,handled})=>{
    const intent=new PointerIntent();intent.down(1,10,10,at);
    expect(releasePointerIntent(intent,1,10,10,pointerReleaseTime(at,down,up,handled))).toEqual({kind:'tap',newlyHeld:false});
    expect(intent.up(1,10,10,handled)).toBe('none');
  });

  it.each([[349,'tap'],[350,'none'],[420,'none']] as const)('keeps the actual %i ms hold boundary', (duration,result)=>{
    const intent=new PointerIntent();intent.down(1,10,10,100);
    expect(releasePointerIntent(intent,1,10,10,pointerReleaseTime(100,10000,10000+duration,900))).toEqual({kind:result,newlyHeld:duration>=350});
  });

  it('never turns a fired hold into a tap even when native release was brief',()=>{
    const intent=new PointerIntent();intent.down(1,10,10,100);
    expect(intent.hold(455)).toBe(true);
    expect(releasePointerIntent(intent,1,10,10,pointerReleaseTime(100,10000,10002,900))).toEqual({kind:'none',newlyHeld:false});
  });

  it('recognizes the native 414 ms hold on release when its timer has not run',()=>{
    const intent=new PointerIntent();intent.down(1,10,10,9400);
    expect(releasePointerIntent(intent,1,10,10,pointerReleaseTime(9400,9367,9781,9819))).toEqual({kind:'none',newlyHeld:true});
    expect(intent.hold(10000)).toBe(false);
  });

  it('does not deliver a second hold after the timer already recognized it',()=>{
    const intent=new PointerIntent();intent.down(1,10,10,100);
    expect(intent.hold(455)).toBe(true);
    expect(releasePointerIntent(intent,1,10,10,pointerReleaseTime(100,10000,10414,900))).toEqual({kind:'none',newlyHeld:false});
  });

  it('checks final coordinates before recognizing an overdue hold',()=>{
    const intent=new PointerIntent();intent.down(1,10,10,100);
    expect(releasePointerIntent(intent,1,30,10,pointerReleaseTime(100,10000,10414,900))).toEqual({kind:'drag',newlyHeld:false});
  });

  it('plain action buttons still tap on a genuine long release',()=>{
    const intent=new PointerIntent();intent.down(1,10,10,100,false);
    expect(releasePointerIntent(intent,1,10,10,pointerReleaseTime(100,10000,10414,900))).toEqual({kind:'tap',newlyHeld:false});
  });

  it('retains movement and cancellation instead of resurrecting a native tap',()=>{
    const at=pointerReleaseTime(100,10000,10002,900),intent=new PointerIntent();
    intent.down(1,10,10,100);intent.move(1,30,10);
    expect(releasePointerIntent(intent,1,10,10,at)).toEqual({kind:'drag',newlyHeld:false});
    intent.down(1,10,10,100);intent.cancel();
    expect(releasePointerIntent(intent,1,10,10,at)).toEqual({kind:'none',newlyHeld:false});
  });

  it.each([[10,0],[-1,10],[NaN,10],[10,NaN],[Infinity,Infinity],[0,Infinity]])('falls back safely for invalid native timestamps %s → %s',(down,up)=>{
    const intent=new PointerIntent();intent.down(1,10,10,100);
    const at=pointerReleaseTime(100,down,up,900);
    expect(at).toBe(900);expect(releasePointerIntent(intent,1,10,10,at)).toEqual({kind:'none',newlyHeld:true});
  });
});
