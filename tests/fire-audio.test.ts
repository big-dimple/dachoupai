import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {AudioEngine} from '../src/audio/AudioEngine';

function fixture(){
  const sources:any[]=[],param=()=>({value:0,setValueAtTime:vi.fn(),setTargetAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn(),cancelScheduledValues:vi.fn()}),gain=()=>({gain:param(),connect:vi.fn(),disconnect:vi.fn()});
  const source=(type:string)=>{const s:any={kind:type,loop:false,frequency:param(),start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn(),onended:null};sources.push(s);return s;};
  const context={currentTime:1,state:'running',sampleRate:8000,createGain:gain,
    createOscillator:()=>source('note'),createBufferSource:()=>source('paper'),
    createBiquadFilter:()=>({type:'',Q:{value:0},frequency:param(),connect:vi.fn(),disconnect:vi.fn()})};
  const engine=new AudioEngine(),internal=engine as unknown as {context:unknown;gains:unknown;unlocked:boolean;noise:unknown;voices:Set<any>};
  Object.assign(internal,{context,gains:{master:gain(),music:gain(),sfx:gain(),ui:gain()},unlocked:true,noise:{}});
  return{engine,internal,sources};
}
beforeEach(()=>vi.stubGlobal('document',{hidden:false}));
afterEach(()=>vi.unstubAllGlobals());
describe('owned short drum and paper accents',()=>{
  it.each([0,1,2,3] as const)('schedules only a falling 100–160ms drum and 30–50ms paper for tier %i',tier=>{
    const f=fixture();f.engine.scoreBrush({},'award',tier);expect(f.sources.map(s=>s.kind)).toEqual(['note','paper']);
    const [note,paper]=f.sources;expect(note.frequency.setValueAtTime.mock.calls[0][0]).toBeCloseTo(110);
    expect(note.frequency.exponentialRampToValueAtTime.mock.calls[0][0]).toBeCloseTo(55);
    expect(note.frequency.exponentialRampToValueAtTime.mock.calls[0][1]-1).toBeCloseTo(.1+tier*.02);
    expect(paper.stop.mock.calls[0][0]-1).toBeCloseTo(.03+tier/150);expect(f.sources.every(s=>!s.loop)).toBe(true);
    f.engine.stopScoreFire();expect(f.internal.voices.size).toBe(0);
  });
  it('deduplicates by presentation/event, including after cancellation, and allows a new actual attempt',()=>{
    const f=fixture(),cue={};f.engine.scoreBrush(cue,'multiply',2);for(let i=0;i<30;i++)f.engine.scoreBrush(cue,'multiply',3);
    expect(f.sources).toHaveLength(2);f.engine.cancelPresentation();f.engine.scoreBrush(cue,'multiply',2);expect(f.sources).toHaveLength(2);
    f.engine.scoreBrush({},'multiply',2);expect(f.sources).toHaveLength(4);f.engine.cancelPresentation();
  });
  it.each(['volume','mute','hidden','background'] as const)('consumes %s hits without queueing a later accent',kind=>{
    const f=fixture(),cue={};if(kind==='volume')f.engine.setVolume('sfx',0);if(kind==='mute')f.engine.muted=true;
    if(kind==='hidden')vi.stubGlobal('document',{hidden:true});if(kind==='background')f.engine.setSuspended(true);
    f.engine.scoreBrush(cue,'award',3);expect(f.sources).toHaveLength(0);
    f.engine.setVolume('sfx',.8);f.engine.muted=false;vi.stubGlobal('document',{hidden:false});f.engine.setSuspended(false);
    f.engine.scoreBrush(cue,'award',3);expect(f.sources).toHaveLength(0);
  });
  it.each(['volume','mute','background','scene','cancel','stop'] as const)('%s releases both tails immediately and idempotently',kind=>{
    const f=fixture();f.engine.scoreBrush({},'award',3);expect(f.internal.voices.size).toBe(2);
    if(kind==='volume')f.engine.setVolume('sfx',0);else if(kind==='mute')f.engine.muted=true;else if(kind==='background')f.engine.setSuspended(true);
    else if(kind==='scene')f.engine.setScene('table');else if(kind==='cancel')f.engine.cancelPresentation();else f.engine.stopScoreFire();
    expect(f.internal.voices.size).toBe(0);expect(f.sources.every(s=>s.stop.mock.calls.length>=2&&s.disconnect.mock.calls.length===1)).toBe(true);
    f.engine.stopScoreFire();f.engine.cancelPresentation();expect(f.sources.every(s=>s.disconnect.mock.calls.length===1)).toBe(true);
  });
});
