import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {EventEmitter} from 'node:events';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {applyCommand,createRun,type Action,type R2RunState} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {RewardCoinCue,REWARD_COIN,animateRewardCoin,loadRewardCoin,addRewardCoin,rewardCoinPose} from '../src/game/RewardCoin';

function receipt(){
  const run=createRun({rulesVersion:'r2',seed:'coin',runId:'coin',characterId:'amo'});
  run.phase='stage-cleared';run.stage={index:0,clearId:'coin/clear/0',goldEarned:12} as NonNullable<typeof run.stage>;
  return {run,result:{cleared:true,stageIndex:0,goldEarned:12,rewardClearId:'coin/clear/0'}};
}
// Transport tests mock Image.decode; actual bytes come from the approved source bundle.
const receiptAsset=JSON.parse(readFileSync('art/sources/handdrawn-runtime-coin-20261004/manifest.json','utf8'));
const pictureBytes=readFileSync('art/sources/handdrawn-runtime-coin-20261004/'+receiptAsset.runtime.path);
const asset={image:'assets/effects/coin-reward/coin-reward-handdrawn.webp',width:256,height:256,bytes:pictureBytes.length,sha256:receiptAsset.runtime.sha256};
function scene(){return {events:new EventEmitter(),sys:{settings:{active:true}},textures:{exists:vi.fn(()=>false),addImage:vi.fn()}} as any;}
function sprite(size=72){return {active:true,x:77,y:124,rotation:.03,scaleX:size/256,scaleY:size/256,displayHeight:size,data:{} as Record<string,unknown>,setPosition(x:number,y:number){this.x=x;this.y=y;return this;},setScale(x:number,y=x){this.scaleX=x;this.scaleY=y;return this;},setRotation(value:number){this.rotation=value;return this;},setDisplaySize(w:number,h:number){this.scaleX=w/256;this.scaleY=h/256;this.displayHeight=h;return this;},setName(name:string){this.name=name;return this;},setData(key:string,value:unknown){this.data[key]=value;return this;},destroy(){this.active=false;}} as any;}

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

describe('bounded single-image playback',()=>{
  beforeEach(()=>vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']}));
  afterEach(()=>vi.useRealTimers());
  it.each([56,72,96])('settles at800ms, preserving the original%s-pixel display scale',async size=>{
    const s=scene(),coin=sprite(size),base={x:coin.x,y:coin.y,rotation:coin.rotation,scale:coin.scaleX},promise=animateRewardCoin(s,coin,new AbortController().signal,false);
    expect(coin.scaleX).toBeCloseTo(base.scale*.94,12);expect(coin.scaleY).toBeCloseTo(base.scale*.9,12);
    await vi.advanceTimersByTimeAsync(650);s.events.emit('update');const pose=rewardCoinPose(650);
    expect(coin.scaleX).toBeCloseTo(base.scale*pose.scaleX,12);expect(coin.y).toBeCloseTo(base.y+pose.offsetY*size,12);
    await vi.advanceTimersByTimeAsync(150);await promise;
    expect(coin).toMatchObject({x:base.x,y:base.y,rotation:base.rotation,scaleX:base.scale,scaleY:base.scale});
    expect(coin.data).toMatchObject({rewardState:'settled',rewardStartedAt:0,rewardEndedAt:800});expect(s.events.listenerCount('update')).toBe(0);expect(vi.getTimerCount()).toBe(0);
  });
  it('settles on wall time without updates, with no repeat or enlarged scale',async()=>{
    const s=scene(),coin=sprite(56),promise=animateRewardCoin(s,coin,new AbortController().signal,false);
    await vi.advanceTimersByTimeAsync(1200);await promise;expect(coin.scaleX).toBe(56/256);expect(coin.data.rewardEndedAt).toBe(800);expect(s.events.listenerCount('update')).toBe(0);expect(vi.getTimerCount()).toBe(0);
  });
  it('abort destroys only its cosmetic sprite and removes all work',async()=>{
    const s=scene(),coin=sprite(),controller=new AbortController(),promise=animateRewardCoin(s,coin,controller.signal,false);
    controller.abort();await promise;expect(coin.active).toBe(false);expect(s.events.listenerCount('update')).toBe(0);expect(vi.getTimerCount()).toBe(0);
  });
  it('reduced motion is static, without position/scale changes, timers or listeners',async()=>{
    const s=scene(),coin=sprite(),before={x:coin.x,y:coin.y,rotation:coin.rotation,scaleX:coin.scaleX,scaleY:coin.scaleY};
    await animateRewardCoin(s,coin,new AbortController().signal,true);expect(coin).toMatchObject(before);expect(coin.data.rewardState).toBe('settled');expect(coin.data.rewardStartedAt).toBeUndefined();expect(s.events.listenerCount('update')).toBe(0);expect(vi.getTimerCount()).toBe(0);
    expect(rewardCoinPose(800)).toEqual({scaleX:1,scaleY:1,rotation:0,offsetY:0});expect(rewardCoinPose(999)).toEqual(rewardCoinPose(800));
  });
  it('uses the same named, noninteractive image and clear receipt at56/72/96',()=>{
    for(const size of [56,72,96]){const coin=sprite(),s={add:{image:vi.fn(()=>coin)}} as any,parent={add:vi.fn()} as any;
      expect(addRewardCoin(s,parent,77,124,size,'clear/1')).toBe(coin);expect(s.add.image).toHaveBeenCalledWith(77,124,REWARD_COIN.key);expect(coin.scaleX).toBe(size/256);expect(coin.name).toBe('result/reward-coin');expect(coin.data).toEqual({clearId:'clear/1',rewardState:'settled'});expect(parent.add).toHaveBeenCalledWith(coin);
    }
  });
});

describe('optional on-demand approved single image',()=>{
  it('registers the approved public derivative without consuming the old atlas',()=>{
    const data=readFileSync('public/'+REWARD_COIN.image);expect(REWARD_COIN).toMatchObject(asset);expect(data.equals(pictureBytes)).toBe(true);expect(createHash('sha256').update(data).digest('hex')).toBe(REWARD_COIN.sha256);expect(REWARD_COIN.key).not.toBe('reward-coin');expect(REWARD_COIN.image).not.toContain('atlas');
  });
  let decode:()=>Promise<void>,pictures:any[];
  beforeEach(()=>{
    pictures=[];decode=()=>Promise.resolve();
    vi.stubGlobal('Image',class {naturalWidth=256;naturalHeight=256;src='';decoding='';constructor(){pictures.push(this);}decode(){return decode();}removeAttribute(){this.src='';}});
    vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:coin');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(pictureBytes,{status:200,headers:{'content-type':'image/webp'}})));
  });
  afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers();});
  it('checks actual source bytes/hash, requests one file, releases URL and reuses texture',async()=>{
    expect(pictureBytes.length).toBe(15958);expect(createHash('sha256').update(pictureBytes).digest('hex')).toBe(asset.sha256);
    const s=scene(),controller=new AbortController();expect(await loadRewardCoin(s,controller.signal,asset)).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);expect(s.textures.addImage).toHaveBeenCalledWith(REWARD_COIN.key,pictures[0]);expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:coin');
    s.textures.exists.mockReturnValue(true);expect(await loadRewardCoin(s,controller.signal,asset)).toBe(true);expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('missing/unapproved metadata and pre-abort do not request even a cached image',async()=>{
    const s=scene();s.textures.exists.mockReturnValue(true);const controller=new AbortController();controller.abort();
    expect(await loadRewardCoin(s,controller.signal,asset)).toBe(false);
    for(const bad of [{...asset,image:null},{...asset,bytes:null},{...asset,sha256:null},{...asset,sha256:'bad'},{...asset,width:1024},{...asset,bytes:201*1024}])expect(await loadRewardCoin(s,new AbortController().signal,bad)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['http','budget','bytes','hash','dimensions','inactive','decode'])('fails safely for%s without installing a texture',async kind=>{
    const s=scene();if(kind==='inactive')s.sys.settings.active=false;
    if(kind==='http')vi.mocked(fetch).mockResolvedValue(new Response('',{status:404}));
    if(kind==='budget')vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array(201*1024)));
    if(kind==='bytes')vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array(100)));
    if(kind==='hash')vi.mocked(fetch).mockResolvedValue(new Response(new Uint8Array(asset.bytes)));
    if(kind==='dimensions')decode=async()=>{pictures[0].naturalWidth=1024;};
    if(kind==='decode')decode=()=>Promise.reject(new Error('decode'));
    expect(await loadRewardCoin(s,new AbortController().signal,asset)).toBe(false);expect(s.textures.addImage).not.toHaveBeenCalled();expect(pictures[0].src).toBe('');
  });
  it('cancel during decode cannot install late data',async()=>{
    let resolve!:()=>void;decode=()=>new Promise(r=>resolve=r);const s=scene(),controller=new AbortController(),promise=loadRewardCoin(s,controller.signal,asset);
    await vi.waitFor(()=>expect(resolve).toBeTypeOf('function'));controller.abort();expect(await promise).toBe(false);resolve();await Promise.resolve();expect(s.textures.addImage).not.toHaveBeenCalled();expect(pictures[0].src).toBe('');expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:coin');
  });
  it('five-second deadline settles even when transport ignores abort; late bytes cannot cache',async()=>{
    vi.useFakeTimers();let pending!:(r:Response)=>void;vi.mocked(fetch).mockImplementation(()=>new Promise(r=>pending=r));
    const s=scene(),promise=loadRewardCoin(s,new AbortController().signal,asset);await vi.advanceTimersByTimeAsync(5000);expect(await promise).toBe(false);pending(new Response(pictureBytes));await vi.advanceTimersByTimeAsync(0);expect(s.textures.addImage).not.toHaveBeenCalled();expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
