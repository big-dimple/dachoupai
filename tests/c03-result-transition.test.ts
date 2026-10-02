import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {R2RunState} from '../src/domain/run';

const fixture=vi.hoisted(()=>({
  controller:null as unknown as {state:R2RunState;status:string},
  start:vi.fn(),dispatch:vi.fn(),sceneStart:vi.fn(),
  session:{lease:{writable:true},pendingRun:null,working:false,notice:''},
  confirm:null as null|(()=>Promise<void>),
}));
vi.mock('phaser',()=>({default:{Scene:class {
  // Phaser queues scene.start; the old scene remains active until the next frame.
  scene={isActive:()=>true,start:fixture.sceneStart};
}}}));
vi.mock('../src/game/SceneView',()=>({SceneView:class {}}));
vi.mock('../src/game/session',()=>({gameSession:()=>fixture.session}));
vi.mock('../src/game/runAdapter',()=>({
  runController:()=>fixture.controller,startRun:fixture.start,dispatchRun:fixture.dispatch,
}));
vi.mock('../src/game/DetailDialog',()=>({DetailDialog:class {
  active=()=>true;close=()=>{};
  open(_title:string,_body:string,actions:{run:()=>Promise<void>}[]){fixture.confirm=actions[0].run;return {};}
}}));

import {createRun} from '../src/domain/run';
import {AudioEngine} from '../src/audio/AudioEngine';
import {IntermissionScene} from '../src/game/IntermissionScene';

type ResultActions={retrySeed:()=>Promise<void>;next:()=>Promise<void>;confirmEndless:()=>void;render:()=>void};
function resultScene(phase:'run-lost'|'stage-cleared'|'run-won'){
  const state=createRun({seed:'result-queued-exit',runId:'result-queued-exit',characterId:'erxiang',rulesVersion:'r2'});
  // Deliberately a view fixture, not a purported naturally completed campaign.
  state.phase=phase;state.chapter=phase==='run-won'?8:1;state.stageIndex=phase==='run-won'?24:phase==='stage-cleared'?1:0;
  state.stage={index:phase==='run-won'?23:0,targetHeat:'400'} as NonNullable<R2RunState['stage']>;
  if(phase==='run-won')state.normalCompletion={clearId:state.runId+'/clear/23',totalHeat:'400'};
  fixture.controller={state,status:'idle'};
  const scene=new IntermissionScene();scene.init({cleared:phase!=='run-lost',stageIndex:state.stage.index,stageHeat:'100',handsLeft:0,goldEarned:0});
  const actions=scene as unknown as ResultActions;
  const rendered:string[]=[];
  actions.render=()=>{
    const stage=fixture.controller.state.stage;
    if(!stage)throw Error('obsolete result page read targetHeat after queued scene exit');
    rendered.push(stage.targetHeat);
  };
  return {actions,state,rendered};
}

describe('result page exits while Phaser queues the next scene',()=>{
  beforeEach(()=>{vi.clearAllMocks();fixture.confirm=null;fixture.session.notice='';vi.spyOn(AudioEngine.shared,'select').mockImplementation(()=>{});vi.spyOn(AudioEngine.shared,'invalid').mockImplementation(()=>{});});
  afterEach(()=>vi.restoreAllMocks());

  it('same-seed retry never repaints the old result against a fresh run without a stage',async()=>{
    const {actions,rendered}=resultScene('run-lost');
    fixture.start.mockImplementation(async()=>{fixture.controller={state:createRun({seed:'result-queued-exit',runId:'fresh',characterId:'erxiang',rulesVersion:'r2'}),status:'idle'};return fixture.controller;});
    await expect(actions.retrySeed()).resolves.toBeUndefined();
    expect(fixture.controller.state.stage).toBeNull();expect(fixture.sceneStart).toHaveBeenCalledWith('shop');expect(rendered).toEqual(['400']);
  });

  it('an unsuccessful retry keeps the result and redraws the save notice',async()=>{
    const {actions,state,rendered}=resultScene('run-lost');fixture.session.notice='保存失败';fixture.start.mockResolvedValue(null);
    await actions.retrySeed();expect(fixture.controller.state).toBe(state);expect(fixture.sceneStart).not.toHaveBeenCalled();expect(rendered).toEqual(['400','400']);
  });

  it('opening a shop does not repaint the completed result after the committed state switches',async()=>{
    const {actions,state,rendered}=resultScene('stage-cleared');
    fixture.dispatch.mockImplementation(async()=>{fixture.controller.state={...state,phase:'shop'};return {ok:true,state:fixture.controller.state};});
    await actions.next();expect(fixture.sceneStart).toHaveBeenCalledWith('shop');expect(rendered).toEqual(['400']);
  });

  it('confirmed endless continuation does not redraw the normal victory after switching modes',async()=>{
    const {actions,state,rendered}=resultScene('run-won');
    fixture.dispatch.mockImplementation(async()=>{fixture.controller.state={...state,phase:'shop',tourMode:'endless'};return {ok:true,state:fixture.controller.state};});
    actions.confirmEndless();await fixture.confirm!();expect(fixture.sceneStart).toHaveBeenCalledWith('shop');expect(rendered).toEqual(['400']);
  });
});
