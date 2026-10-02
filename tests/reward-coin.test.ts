import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {EventEmitter} from 'node:events';
import {readFileSync} from 'node:fs';
import {applyCommand,createRun,type Action,type R2RunState} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {RewardCoinCue,REWARD_COIN,animateRewardCoin,loadRewardCoin,rewardCoinFrame} from '../src/game/RewardCoin';

function receipt(){
  const run=createRun({rulesVersion:'r2',seed:'coin',runId:'coin',characterId:'amo'});
  run.phase='stage-cleared';run.stage={index:0,clearId:'coin/clear/0',goldEarned:12} as NonNullable<typeof run.stage>;
  return {run,result:{cleared:true,stageIndex:0,goldEarned:12,rewardClearId:'coin/clear/0'}};
}
const atlas=JSON.parse(readFileSync('public/assets/effects/coin-reward/atlas.json','utf8'));
function scene(){return {events:new EventEmitter(),sys:{settings:{active:true}},textures:{exists:vi.fn(()=>false),addAtlas:vi.fn()}} as any;}
function sprite(){return {active:true,frame:'',data:{} as Record<string,unknown>,setFrame(name:string){this.frame=name;return this;},setData(key:string,value:unknown){this.data[key]=value;return this;},destroy(){this.active=false;}} as any;}

describe('committed reward presentation identity',()=>{
  it('uses one actual clear receipt including e07 without a second award',()=>{
    const send=(run:R2RunState,action:Action)=>{
      const result=applyCommand(run,{runId:run.runId,commandId:'coin-'+run.commandSeq,expectedSeq:run.commandSeq,action});
      if(!result.ok)throw Error(result.code);return result.state;
    };
    let run=createRun({rulesVersion:'r2',seed:'coin-source',runId:'coin-source',characterId:'amo'});
    run.jokers=[r2CreateJoker('e07','coin/e07',0)];run=send(send(run,{type:'LeaveShop'}),{type:'EnterStage'});
    // Explicit legal last-hand boundary input; presentation does not create this fixture.
    run.stage!.handsLeft=1;run.stage!.playIndex=3;run.stage!.previousHandType='high-card';run.stage!.heat='399';const before=run.gold;
    run=send(run,{type:'PlayHand',selectedIds:[run.handOrder[0]]});
    expect(run.phase).toBe('stage-cleared');expect(run.lastTrace!.events.filter(e=>e.sourceDefinitionId==='e07'&&e.operation==='add-gold')).toHaveLength(1);
    expect(run.gold-before).toBe(run.stage!.goldEarned);expect(run.stage!.goldEarned).toBeGreaterThan(4);
    const saved=structuredClone(run),cue=new RewardCoinCue(),result={cleared:true,stageIndex:run.stage!.index,goldEarned:run.stage!.goldEarned,rewardClearId:run.stage!.clearId!};
    expect(cue.claim(run,result)).toBe(true);expect(cue.claim(run,result)).toBe(false);expect(run).toEqual(saved);
  });
  it('claims the total base plus source reward once without changing state',()=>{
    const {run,result}=receipt(),before=structuredClone(run),cue=new RewardCoinCue();
    expect(cue.claim(run,result)).toBe(true);expect(cue.claim(run,result)).toBe(false);expect(run).toEqual(before);
    run.stage!.clearId='coin/clear/1';run.stage!.index=1;expect(cue.claim(run,{...result,stageIndex:1,rewardClearId:'coin/clear/1'})).toBe(true);
  });
  it.each(['restore','skip','lost','zero','wrong-id','wrong-stage','wrong-total'])('does not animate %s',kind=>{
    const {run,result}=receipt();
    if(kind==='restore')delete (result as Partial<typeof result>).rewardClearId;
    if(kind==='skip')run.stage!.skipResult={} as any;
    if(kind==='lost')run.phase='run-lost';
    if(kind==='zero')run.stage!.goldEarned=result.goldEarned=0;
    if(kind==='wrong-id')result.rewardClearId='other';
    if(kind==='wrong-stage')result.stageIndex=1;
    if(kind==='wrong-total')result.goldEarned=6;
    expect(new RewardCoinCue().claim(run,result)).toBe(false);
  });
});

describe('bounded coin playback',()=>{
  beforeEach(()=>vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']}));
  afterEach(()=>vi.useRealTimers());
  it('finishes at 800ms even with no renderer updates, and skips obsolete frames',async()=>{
    const s=scene(),coin=sprite(),promise=animateRewardCoin(s,coin,new AbortController().signal,false);
    expect(coin.frame).toBe('coin-000');await vi.advanceTimersByTimeAsync(650);s.events.emit('update');expect(coin.frame).toBe('coin-013');
    await vi.advanceTimersByTimeAsync(150);await promise;expect(coin.frame).toBe('coin-015');expect(coin.data.rewardState).toBe('settled');expect(s.events.listenerCount('update')).toBe(0);expect(vi.getTimerCount()).toBe(0);
  });
  it('abort removes animation work and destroys only its cosmetic sprite',async()=>{
    const s=scene(),coin=sprite(),controller=new AbortController(),promise=animateRewardCoin(s,coin,controller.signal,false);
    controller.abort();await promise;expect(coin.active).toBe(false);expect(s.events.listenerCount('update')).toBe(0);expect(vi.getTimerCount()).toBe(0);
  });
  it('reduced motion is the settled frame without timers or update listeners',async()=>{
    const s=scene(),coin=sprite();await animateRewardCoin(s,coin,new AbortController().signal,true);
    expect(coin.frame).toBe('coin-015');expect(coin.data.rewardStartedAt).toBeUndefined();expect(s.events.listenerCount('update')).toBe(0);expect(vi.getTimerCount()).toBe(0);
    expect([0,49,50,750,999].map(rewardCoinFrame)).toEqual(['coin-000','coin-000','coin-001','coin-015','coin-015']);
  });
});

describe('optional on-demand atlas',()=>{
  let decode:()=>Promise<void>,pictures:any[];
  beforeEach(()=>{
    pictures=[];decode=()=>Promise.resolve();
    vi.stubGlobal('Image',class {naturalWidth=1024;naturalHeight=1024;src='';decoding='';constructor(){pictures.push(this);}decode(){return decode();}removeAttribute(){this.src='';}});
    vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:coin');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
    vi.stubGlobal('fetch',vi.fn(async(input:string)=>new Response(input.endsWith('.json')?JSON.stringify(atlas):new Uint8Array(100),{status:200})));
  });
  afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers();});
  it('loads the validated full frames, revokes decode URL, and reuses texture',async()=>{
    const s=scene(),controller=new AbortController();expect(await loadRewardCoin(s,controller.signal)).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);expect(s.textures.addAtlas).toHaveBeenCalledWith(REWARD_COIN.key,pictures[0],atlas);expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:coin');
    s.textures.exists.mockReturnValue(true);expect(await loadRewardCoin(s,controller.signal)).toBe(true);expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each(['http','budget','atlas','inactive'])('fails safely for %s',async kind=>{
    const s=scene();if(kind==='inactive')s.sys.settings.active=false;
    if(kind==='http')vi.mocked(fetch).mockResolvedValue(new Response('',{status:404}));
    if(kind==='budget')vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array(201*1024)));
    if(kind==='atlas')vi.mocked(fetch).mockResolvedValue(new Response('{}'));
    expect(await loadRewardCoin(s,new AbortController().signal)).toBe(false);expect(s.textures.addAtlas).not.toHaveBeenCalled();expect(pictures[0].src).toBe('');
  });
  it('cancel during decode cannot install a late texture',async()=>{
    let resolve!:()=>void;decode=()=>new Promise(r=>resolve=r);const s=scene(),controller=new AbortController(),promise=loadRewardCoin(s,controller.signal);
    await vi.waitFor(()=>expect(resolve).toBeTypeOf('function'));controller.abort();expect(await promise).toBe(false);resolve();await Promise.resolve();expect(s.textures.addAtlas).not.toHaveBeenCalled();expect(pictures[0].src).toBe('');expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:coin');
  });
  it('deadline settles even if a transfer ignores AbortSignal; late data cannot cache',async()=>{
    vi.useFakeTimers();const pending:((r:Response)=>void)[]=[];vi.mocked(fetch).mockImplementation(()=>new Promise(r=>pending.push(r)));
    const s=scene(),promise=loadRewardCoin(s,new AbortController().signal);await vi.advanceTimersByTimeAsync(5000);expect(await promise).toBe(false);pending[0](new Response(new Uint8Array(100)));pending[1](new Response(JSON.stringify(atlas)));await vi.advanceTimersByTimeAsync(0);expect(s.textures.addAtlas).not.toHaveBeenCalled();expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
