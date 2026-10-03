import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {AudioEngine} from '../src/audio/AudioEngine';

function fixture(){
  const sources:{loop:boolean;start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;[key:string]:unknown}[]=[];
  const param=()=>({value:0,setValueAtTime:vi.fn(),setTargetAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn(),cancelScheduledValues:vi.fn()});
  const gain=()=>({gain:param(),connect:vi.fn(),disconnect:vi.fn()});
  const context={currentTime:0,state:'running',sampleRate:8000,createGain:gain,
    createBiquadFilter:()=>({type:'',Q:{value:0},frequency:param(),connect:vi.fn(),disconnect:vi.fn()}),
    createBuffer:(_channels:number,size:number)=>({getChannelData:()=>new Float32Array(size)}),
    createBufferSource:()=>{const source={loop:false,playbackRate:param(),start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn(),onended:null};sources.push(source);return source;},
  };
  const engine=new AudioEngine(),internal=engine as unknown as {context:unknown;gains:unknown;unlocked:boolean;createFireBuffers:(c:unknown)=>void;voices:Set<unknown>;fireVoices:Set<unknown>};
  Object.assign(internal,{context,gains:{master:gain(),music:gain(),sfx:gain(),ui:gain()},unlocked:true});internal.createFireBuffers(context);
  return{engine,internal,sources,loops:()=>sources.filter(s=>s.loop),ignitions:()=>sources.filter(s=>!s.loop)};
}
beforeEach(()=>vi.stubGlobal('document',{hidden:false}));
afterEach(()=>vi.unstubAllGlobals());
describe('owned burning voices and one ignition per committed presentation',()=>{
  it('reuses two loops through repeated accumulator ticks and three tiers; starts ignition once',()=>{
    const f=fixture(),cue={};f.engine.setScoreFire(1,cue);
    for(let i=0;i<30;i++)f.engine.setScoreFire(1,cue);
    f.engine.setScoreFire(2,cue);f.engine.setScoreFire(3,cue);
    expect(f.loops()).toHaveLength(2);expect(f.ignitions()).toHaveLength(1);expect(f.internal.fireVoices.size).toBe(2);
    f.engine.cancelPresentation();expect(f.internal.voices.size).toBe(0);expect(f.sources.every(s=>s.stop.mock.calls.length>0)).toBe(true);
    f.engine.setScoreFire(1,cue);expect(f.ignitions(),'same cue cannot replay after cancellation').toHaveLength(1);f.engine.stopScoreFire();
  });
  it('consumes a muted ignition without later queueing it, while a new real attempt still ignites',()=>{
    const f=fixture(),cue={runId:'same',seq:1};f.engine.setVolume('sfx',0);f.engine.setScoreFire(1,cue);expect(f.sources).toHaveLength(0);
    f.engine.setVolume('sfx',.8);f.engine.setScoreFire(1,cue);expect(f.ignitions()).toHaveLength(0);f.engine.stopScoreFire();
    f.engine.setScoreFire(1,{...cue});expect(f.ignitions()).toHaveLength(1);f.engine.stopScoreFire();
  });
  it.each(['volume','mute','background','scene'] as const)('%s cleans every owned burning and ignition source without stale revival',kind=>{
    const f=fixture(),cue={};f.engine.setScoreFire(1,cue);
    if(kind==='volume')f.engine.setVolume('sfx',0);
    else if(kind==='mute')f.engine.muted=true;
    else if(kind==='background')f.engine.setSuspended(true);
    else f.engine.setScene('table');
    expect(f.internal.voices.size).toBe(0);expect(f.internal.fireVoices.size).toBe(0);expect(f.sources.every(s=>s.stop.mock.calls.length>0)).toBe(true);
  });
  it('does not create ignition or burning for below-target/replay0; default buses are30%/80%',()=>{
    const f=fixture();f.engine.setScoreFire(0,{});expect(f.sources).toHaveLength(0);
    expect(f.engine.getVolume('music')).toBe(.30);expect(f.engine.getVolume('sfx')).toBe(.80);expect(f.engine.getVolume('ui')).toBe(.80);
  });
});
