import {afterEach,expect,it,vi} from 'vitest';
import {EventEmitter} from 'node:events';
import {armResourcePulse,stopResourcePulse,waitResourcePulse} from '../harness/resource-pulse.mjs';
afterEach(()=>vi.unstubAllGlobals());
function fixture(){
  const state={commandSeq:7},count={text:'4 次',scaleX:1},events=new EventEmitter(),game={events,registry:{get:()=>({state})},scene:{getScene:()=>({resourceCounts:{play:count}})}};
  vi.stubGlobal('window',{__harness:{game}});return {state,count,events};
}
it('retains a real same-frame pulse after it ends before a late input observer returns',()=>{
  const {state,count,events}=fixture();armResourcePulse({kind:'play',seq:8,remaining:3});state.commandSeq=8;count.text='3 次';count.scaleX=1.6;events.emit('poststep');count.scaleX=1;events.emit('poststep');
  expect(stopResourcePulse('play')).toEqual({commandSeq:8,text:'3 次',scaleX:1.6});expect(events.listenerCount('poststep')).toBe(0);
});
it('cannot pass on a correct settled count without the original scale threshold',()=>{
  const {state,count,events}=fixture();armResourcePulse({kind:'play',seq:8,remaining:3});state.commandSeq=8;count.text='3 次';count.scaleX=1;events.emit('poststep');expect(stopResourcePulse('play')).toBeNull();expect(events.listenerCount('poststep')).toBe(0);
});
it('requires expected command and count together with an actual pulse, never a previous command',()=>{
  const {state,count,events}=fixture();armResourcePulse({kind:'play',seq:8,remaining:3});count.text='3 次';count.scaleX=1.6;events.emit('poststep');expect(window.__smokeResourcePulses.play.sample).toBeNull();state.commandSeq=8;count.text='4 次';events.emit('poststep');expect(window.__smokeResourcePulses.play.sample).toBeNull();count.text='3 次';events.emit('poststep');expect(stopResourcePulse('play').commandSeq).toBe(8);
});
it('cleanup prevents cancelled observations leaking into later actions',()=>{
  const {state,count,events}=fixture();armResourcePulse({kind:'play',seq:8,remaining:3});expect(stopResourcePulse('play')).toBeNull();state.commandSeq=8;count.text='3 次';count.scaleX=1.6;events.emit('poststep');expect(window.__smokeResourcePulses.play).toBeUndefined();expect(stopResourcePulse('play')).toBeNull();
});
it('wait keeps the same five-second assertion and distinguishes an ended live pulse from its captured sample',async()=>{
  const {state,count,events}=fixture();armResourcePulse({kind:'play',seq:8,remaining:3});state.commandSeq=8;count.text='3 次';count.scaleX=1.6;events.emit('poststep');count.scaleX=1;
  const page={evaluate:async(fn,arg)=>fn(arg),waitForFunction:async(fn,arg,options)=>{expect(options.timeout).toBe(5000);expect(fn(arg)).toBe(true);}};
  expect(await waitResourcePulse(page,'play')).toEqual({commandSeq:8,text:'3 次',scaleX:1.6,pollingStarted:{commandSeq:8,text:'3 次',scaleX:1,capturedBeforeWait:true}});expect(events.listenerCount('poststep')).toBe(0);
});
