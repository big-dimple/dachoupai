import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

const fixture=vi.hoisted(()=>({run:{runId:'',commandSeq:4,phase:'run-lost',stage:{skipResult:null},outcome:{reason:'hands-exhausted'}}}));
vi.mock('phaser',()=>({default:{Scene:class {
  events={once:()=>{}};cameras={main:{setBackgroundColor:()=>{}}};
  registry={get:()=>({state:fixture.run})};scene={start:()=>{}};
}}}));
vi.mock('../src/game/SceneView',()=>({SceneView:class {}}));
vi.mock('../src/game/session',()=>({gameSession:()=>({reducedMotion:true})}));

import {AudioEngine,type FailureCue} from '../src/audio/AudioEngine';
import {IntermissionScene} from '../src/game/IntermissionScene';

const audio=AudioEngine.shared as unknown as {note:()=>void;duckMusic:()=>void;canPlay:()=>boolean};
const enter=(cue?:FailureCue):IntermissionScene=>{
  const scene=new IntermissionScene();
  scene.init({cleared:false,stageIndex:0,stageHeat:'10',handsLeft:0,goldEarned:0,...(cue?{failureCue:cue}:{})});
  scene.create();return scene;
};

describe('committed failure cue identity',()=>{
  beforeEach(()=>{
    fixture.run.outcome.reason='hands-exhausted';
    vi.spyOn(audio,'note').mockImplementation(()=>{});vi.spyOn(audio,'duckMusic').mockImplementation(()=>{});
    vi.spyOn(audio,'canPlay').mockReturnValue(true);
    vi.spyOn(AudioEngine.shared,'setScene').mockImplementation(()=>{});
    vi.spyOn(IntermissionScene.prototype as unknown as {render:()=>void},'render').mockImplementation(()=>{});
  });
  afterEach(()=>vi.restoreAllMocks());

  it('plays both failed attempts when deterministic run ID and command sequence are identical',()=>{
    fixture.run.runId='run/same-seed/amo';
    const first={runId:fixture.run.runId,commandSeq:4},second={...first};
    expect(second).not.toBe(first);enter(first);enter(second);
    expect(audio.duckMusic).toHaveBeenCalledTimes(2);
  });

  it('keeps scene recreation on the same cue and restored results without a cue silent',()=>{
    fixture.run.runId='run/scene-reentry/amo';
    const cue={runId:fixture.run.runId,commandSeq:4},scene=enter(cue);
    scene.create();enter(cue);enter();
    expect(audio.duckMusic).toHaveBeenCalledTimes(1);
  });

  it('consumes a silent ending once and allows a new attempt with the same deterministic fields',()=>{
    fixture.run.runId='run/muted-retry/amo';
    const cue={runId:fixture.run.runId,commandSeq:4};
    vi.mocked(audio.canPlay).mockReturnValue(false);enter(cue);
    vi.mocked(audio.canPlay).mockReturnValue(true);enter(cue);
    expect(audio.note).not.toHaveBeenCalled();enter({...cue});
    expect(audio.duckMusic).toHaveBeenCalledTimes(1);
  });

  it('does not play a cue for a different run, stale ending or deliberate abandonment',()=>{
    fixture.run.runId='run/guarded-ending/amo';
    enter({runId:'other-run',commandSeq:4});enter({runId:fixture.run.runId,commandSeq:3});
    fixture.run.outcome.reason='abandoned';enter({runId:fixture.run.runId,commandSeq:4});
    expect(audio.note).not.toHaveBeenCalled();
  });
});
