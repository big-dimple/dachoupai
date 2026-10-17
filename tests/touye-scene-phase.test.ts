import {afterEach,expect,it,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class{}}}));
vi.mock('../src/game/session',()=>({gameSession:()=>({lease:{writable:true}})}));
vi.mock('../src/game/runAdapter',()=>({dispatchRun:vi.fn(),runController:()=>({status:'idle'})}));
import {GameScene} from '../src/game/GameScene';
import {dispatchRun} from '../src/game/runAdapter';
import {applyCommand,type Action,type R2RunState} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {PAPER_CSS} from '../src/game/theme';
import {touyeBet,touyeCommand,touyeFixture,touyeSend} from './fixtures/touye-new-core';

afterEach(()=>vi.clearAllMocks());
const fixture=()=>touyeFixture('four-straight',{identity:newRunIdentity('touye','group')});
function node(){
 const data=new Map(),n:any={active:true,text:'',color:'',scene:{scale:{zoom:1}},style:{resolution:1,color:''},frame:{source:{resolution:1}},input:{enabled:false},setData(k:string,v:unknown){data.set(k,v);return n;},getData(k:string){return data.get(k);},setResolution(value:number){n.style.resolution=value;return n;},setText(text:string){n.text=text;return n;},setColor(color:string){n.color=n.style.color=color;return n;},setStrokeStyle:vi.fn()};return n;
}
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(r=>resolve=r);return{promise,resolve};}
function setup(run:R2RunState,ids:string[]){
 const s=Object.create(GameScene.prototype) as any,button=node();button.setData('label',node()).setData('skillStatus',node());
 Object.assign(s,{run,selectedIds:new Set(ids),assistIds:[],erxiangTargetId:null,xiemuBurn:0,azaoRelease:false,playing:false,lifecycle:1,intent:0,scene:{isActive:()=>true},dialog:{current:undefined},cardViews:[],roleFrame:node(),roleText:node(),heroActionButton:button,view:{layout:{mode:'landscape',hand:{}},setEnabled:(b:any,enabled:boolean)=>b.input.enabled=enabled},selectionPreview:()=>undefined,clearHover:vi.fn(),cancelAiCandidates:vi.fn(),audio:{discard:vi.fn()},effects:{clear:vi.fn(),enqueue:vi.fn(),drain:vi.fn(async()=>{})},updateHud:vi.fn(),renderHand:vi.fn(),revealDrawnCards:vi.fn(),finishStage:vi.fn(),presentTrace:vi.fn(async()=>{})});
 s.updateControls=()=>s.updateHeroControl();s.refreshSelection=vi.fn(()=>s.updateHeroControl());
 vi.mocked(dispatchRun).mockImplementation(async(_,action)=>applyCommand(s.run,touyeCommand(s.run,action)) as never);
 return s;
}
function expectQuiet(s:any,state:string,status:string){
 expect(s.roleFrame.getData('abilityState')).toBe(state);expect(s.roleFrame.getData('abilityOpportunity')).toBe(false);expect(s.roleFrame.getData('abilityAvailable')).toBe(false);
 expect(s.heroActionButton.input.enabled).toBe(false);expect(s.heroActionButton.getData('skillStatus').text).toBe(status);expect(s.heroActionButton.getData('skillStatus').color).toBe(PAPER_CSS.mutedInk);
}

it('keeps the real discard saving/effect interval quiet, then shows its saved target through next-hand selection',async()=>{
 const f=fixture(),before=structuredClone(f.state),action=touyeBet(f.state,f.discard,f.target),expected=touyeSend(f.state,action),s=setup(f.state,f.discard),effect=deferred();s.effects.drain.mockReturnValue(effect.promise);
 const work=s.discardSelected(false,(action as Extract<Action,{type:'DiscardHand'}>).touyeBet);
 expectQuiet(s,'drawing','换牌中');await vi.waitFor(()=>expect(s.effects.drain).toHaveBeenCalledOnce());expectQuiet(s,'drawing','换牌中');expect(s.run).toEqual(expected);expect(before).toEqual(f.state);
 effect.resolve();await work;expect(s.touyeSkillPhase).toBeUndefined();expectQuiet(s,'locked','已押顺子');
 for(const ids of [[],f.play,[f.play[0]]]){s.selectedIds=new Set(ids);s.updateHeroControl();expectQuiet(s,'locked','已押顺子');expect(s.run).toEqual(expected);}
});

it('keeps settling through the saved score presentation, then returns to the actual settled state',async()=>{
 const f=fixture(),pending=touyeSend(f.state,touyeBet(f.state,f.discard,f.target)),s=setup(pending,f.play),effect=deferred();s.presentTrace.mockReturnValue(effect.promise);
 const work=s.playSelected(true);expectQuiet(s,'settling','结算中');await vi.waitFor(()=>expect(s.presentTrace).toHaveBeenCalledOnce());expectQuiet(s,'settling','结算中');
 expect(s.run).toEqual(touyeSend(pending,{type:'PlayHand',selectedIds:f.play}));expect(s.run.phase).toBe('stage-cleared');effect.resolve();await work;expect(s.touyeSkillPhase).toBeUndefined();expect(s.heroActionButton.getData('abilityState')).toBe('used');expect(s.heroActionButton.getData('skillStatus').text).toBe('已用');
});

it.each(['discard','play'] as const)('clears %s phase after failed or duplicate dispatch without changing the saved run',async kind=>{
 for(const duplicate of [false,true]){
  const f=fixture(),run=kind==='play'?touyeSend(f.state,touyeBet(f.state,f.discard,f.target)):f.state,s=setup(run,kind==='play'?f.play:f.discard),before=structuredClone(run);
  vi.mocked(dispatchRun).mockResolvedValue((duplicate?{ok:true,duplicate:true,state:run,events:[]}:{ok:false,code:'save-failed'}) as never);
  await(kind==='play'?s.playSelected(true):s.discardSelected(false,(touyeBet(run,f.discard,f.target) as any).touyeBet));
  expect(s.touyeSkillPhase).toBeUndefined();expect(s.playing).toBe(false);expect(s.run).toEqual(before);expect(s.refreshSelection).toHaveBeenCalledOnce();
 }
});

it.each(['discard','play'] as const)('does not let a stale %s callback clear a newer scene phase or refresh its controls',async kind=>{
 const f=fixture(),run=kind==='play'?touyeSend(f.state,touyeBet(f.state,f.discard,f.target)):f.state,s=setup(run,kind==='play'?f.play:f.discard),wait=deferred(),before=structuredClone(run);
 vi.mocked(dispatchRun).mockImplementation(async()=>{await wait.promise;return{ok:false,code:'save-failed'} as never;});
 const work=kind==='play'?s.playSelected(true):s.discardSelected(false,(touyeBet(run,f.discard,f.target) as any).touyeBet);
 s.lifecycle++;s.touyeSkillPhase='settling';wait.resolve();await work;expect(s.touyeSkillPhase).toBe('settling');expect(s.refreshSelection).not.toHaveBeenCalled();expect(s.run).toEqual(before);
});

it('does not assign Qin Qiong animation state to ordinary discard or play',async()=>{
 const f=fixture(),s=setup(f.state,f.discard),effect=deferred();s.effects.drain.mockReturnValue(effect.promise);
 const work=s.discardSelected();expect(s.touyeSkillPhase).toBeUndefined();await vi.waitFor(()=>expect(s.effects.drain).toHaveBeenCalledOnce());effect.resolve();await work;
 s.selectedIds=new Set([s.run.handOrder[0]]);s.presentTrace.mockImplementation(async()=>{expect(s.touyeSkillPhase).toBeUndefined();});await s.playSelected(true);expect(s.presentTrace).toHaveBeenCalledOnce();
});
